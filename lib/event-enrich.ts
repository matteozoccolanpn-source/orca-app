// Arricchimento AI di un evento: quando l'utente crea un biglietto/evento,
// Claude fa UNA ricerca online e trova info + link utili (sito ufficiale,
// biglietti, come arrivare, un video/approfondimento). Salva su Supabase.
// Riusa modello, chiave e pattern web-search già presenti nell'app.

import { getTicketForEnrich, saveTicketEnrichment, type EventEnrichment } from "./supabase";

const MODEL = "claude-sonnet-4-5";
type Msg = { role: string; content: unknown };

async function callClaudeWebSearch(userContent: string): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userContent }];
  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 4,
      user_location: { type: "approximate", country: "IT", timezone: "Europe/Rome" },
    },
  ];

  for (let guard = 0; guard < 5; guard++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, messages, tools }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: data.content });
      continue;
    }
    const blocks = Array.isArray(data.content) ? data.content : [];
    return blocks
      .filter((b: { type?: string }) => b?.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("\n")
      .trim();
  }
  throw new Error("event-enrich: troppe pause_turn");
}

// Estrae il primo oggetto JSON dal testo (Claude a volte lo avvolge in ```json).
function extractJson(text: string): { summary?: string; links?: { label?: string; url?: string }[] } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** Arricchisce un evento (per id) e salva il risultato. Silenzioso in caso di errore. */
export async function enrichEvent(id: string): Promise<EventEnrichment | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const ev = await getTicketForEnrich(id);
  if (!ev) return null;

  const prompt = `Evento dell'utente: "${ev.title}" (tipo: ${ev.type}${ev.location ? `, luogo: ${ev.location}` : ""}${ev.datetime ? `, quando: ${ev.datetime}` : ""}).

Cerca sul web informazioni UTILI e ATTUALI su questo specifico evento/luogo. Restituisci SOLO un JSON valido, senza altro testo, in questa forma:
{"summary": "1-2 frasi utili in italiano su cosa è e cosa sapere", "links": [{"label": "etichetta breve", "url": "https://..."}]}

Regole per i link (2-5, i più utili possibili): sito ufficiale, pagina biglietti, come arrivare, e un contenuto pertinente (es. video/trailer/programma). URL reali e funzionanti. Se non trovi nulla di affidabile, restituisci links vuoto.`;

  try {
    const text = await callClaudeWebSearch(prompt);
    const parsed = extractJson(text);
    if (!parsed) return null;
    const links = Array.isArray(parsed.links)
      ? parsed.links
          .filter((l) => l && typeof l.url === "string" && /^https?:\/\//.test(l.url))
          .map((l) => ({ label: (l.label ?? "Apri").toString().slice(0, 40), url: l.url as string }))
          .slice(0, 5)
      : [];
    const enrichment: EventEnrichment = {
      summary: (parsed.summary ?? "").toString().slice(0, 400),
      links,
      updatedAt: new Date().toISOString(),
    };
    await saveTicketEnrichment(id, enrichment);
    return enrichment;
  } catch (e) {
    console.error("enrichEvent fallita:", e);
    return null;
  }
}
