// Risolve il LUOGO di un to-do con Claude + ricerca web.
// Es. "Ritirare patente all'agenzia vicino Linklaters Milano"
//   → { location: "Agenzia ..., Via ..., Milano", phone: "+39 ..." }
//
// Stesso schema e modello di lib/trip-enrich.ts (nessun modello nuovo).
// Il tool web-search costa $10 ogni 1000 ricerche: la chiamata parte SOLO
// per i to-do che sembrano contenere un luogo (vedi looksLikePlace).

const MODEL = "claude-sonnet-4-5";

type Msg = { role: string; content: unknown };

/** Il testo sembra contenere un luogo da raggiungere? (stessa euristica della UI) */
export function looksLikePlace(text: string): boolean {
  if (/\bvicino\b/i.test(text)) return true;
  return /(?:\bda\b|\bdal\b|\bdalla\b|\bal\b|\ballo\b|\balla\b|\ball'|\bin\b|\bpresso\b|@)\s*[A-ZÀ-Ý]/.test(text);
}

export interface ResolvedPlace {
  title: string | null;    // titolo breve e pulito del promemoria
  location: string | null;
  phone: string | null;
}

/** Chiama Claude col tool web-search (loop pause_turn come trip-enrich). */
async function callClaude(userContent: string): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userContent }];
  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 3, // un to-do è una ricerca piccola: tetto basso
      user_location: { type: "approximate", country: "IT", timezone: "Europe/Rome" },
    },
  ];

  for (let guard = 0; guard < 4; guard++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages, tools }),
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
  throw new Error("web-search: troppe pause_turn, interrotto");
}

/** Trova il posto vero citato nel to-do. Non lancia mai: se qualcosa va storto
 *  ritorna { null, null } e il to-do si salva comunque senza luogo. */
export async function resolveTodoPlace(text: string): Promise<ResolvedPlace> {
  const empty: ResolvedPlace = { title: null, location: null, phone: null };
  if (!process.env.ANTHROPIC_API_KEY) return empty;

  const prompt = `Testo di un promemoria personale (italiano): "${text}"

Due compiti:

1. TITOLO: riscrivi il promemoria come titolo breve e chiaro in italiano corretto
   (verbo + oggetto, max 6 parole). SENZA orario, SENZA luogo, SENZA "vicino a…":
   quelle informazioni sono mostrate a parte. Es: "ritira patente prima di pranzo
   nell'ufficio rinnovo patenti vicino linklaters milano" → "Ritirare la patente".

2. LUOGO: se il testo indica un LUOGO FISICO PUBBLICO da raggiungere (negozio,
   ufficio, agenzia, ristorante, studio…), cercalo sul web e individua il posto
   specifico più plausibile.

Rispondi SOLO con un JSON, nessun altro testo:
{"title": "…", "location": "Nome attività, Via e numero civico, Città" oppure null, "phone": "+39 …" oppure null}

Regole:
- "location" deve essere un POSTO trovabile su Google Maps: nome dell'attività +
  indirizzo reale verificato con la ricerca. MAI un sito web o un dominio
  (niente "rinnovopatenti.it"), MAI inventato.
- Se il luogo è la casa di una persona (es. "cena da Marco") o è troppo ambiguo: location null.
- "phone" solo se lo trovi per QUEL posto, altrimenti null.`;

  try {
    const raw = await callClaude(prompt);
    // A volte il JSON arriva dentro ```json ... ```: prendiamo la prima graffa.
    const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr) as { title?: unknown; location?: unknown; phone?: unknown };
    const location = typeof parsed.location === "string" && parsed.location.trim() ? parsed.location.trim() : null;
    return {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : null,
      // Paracadute: se location sembra un dominio web, buttala via.
      location: location && /\.(it|com|net|org)\b/i.test(location.split(",")[0]) ? null : location,
      phone: typeof parsed.phone === "string" && parsed.phone.trim() ? parsed.phone.trim() : null,
    };
  } catch (e) {
    console.error("resolveTodoPlace fallita (il to-do si salva senza luogo):", e);
    return empty;
  }
}
