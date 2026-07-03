// FASE PESANTE del pianificatore.
// Prende un viaggio (trip_plans) con status 'pending', cerca sul web SOLO la logistica
// operativa (il "secchio 3": navette, chiusure, ingressi, mezzi notturni, orari musei di
// quel giorno) e genera un piano strutturato, poi lo salva e segna il viaggio 'ready'.
//
// Usa il tool web-search di Claude: $10 ogni 1000 ricerche. Girala con parsimonia.

import {
  getTripPlanByKey,
  getTicketsByIds,
  saveTripPlanResult,
  type TripPlanRow,
  type TicketDetail,
} from "./supabase";

const MODEL = "claude-sonnet-4-5"; // stesso modello dell'app, nessun modello nuovo

type Msg = { role: string; content: unknown };

/** Chiama Claude col tool web-search, gestendo il loop 'pause_turn'. Ritorna il testo finale. */
async function callClaudeWebSearch(userContent: string): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userContent }];
  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 6, // tetto alle ricerche per tenere basso il costo
      user_location: { type: "approximate", country: "IT", timezone: "Europe/Rome" },
    },
  ];

  for (let guard = 0; guard < 6; guard++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 4096, messages, tools }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const data = await res.json();

    // Ricerca lunga: la API mette in pausa → rimando indietro il messaggio e continuo.
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

function buildPrompt(trip: TripPlanRow, tickets: TicketDetail[]): string {
  const oggi = new Date().toISOString().slice(0, 10);
  const bigliettiTxt = tickets
    .map(
      (t) =>
        `- ${t.type} | ${t.datetime} | ${t.title} | luogo: ${t.location || "-"} | città: ${t.city || "-"}`
    )
    .join("\n");

  return `Sei l'assistente di pianificazione viaggi di Keiko. Oggi è ${oggi}.

VIAGGIO a ${trip.city} (${trip.start_date} → ${trip.end_date}). Biglietti già in mano all'utente:
${bigliettiTxt}

COMPITO: costruisci un piano operativo pratico. Regole (IMPORTANTISSIME):
1. Cerca sul web SOLO la "logistica operativa": come raggiungere le venue, navette e tempi,
   distanze a piedi, chiusure/scioperi/deviazioni DI QUEI GIORNI PRECISI, mezzi notturni per
   il rientro, orari di apertura dei musei in quella data. Usa FONTI UFFICIALI e cita l'URL.
2. NON cercare né inventare prezzi o disponibilità (hotel/voli/biglietti): per quelli dai solo
   un LINK utile (Booking, Skyscanner, sito ufficiale...). Nessun prezzo scritto.
3. Calcola gli orari A RITROSO dalle ancore fisse (orari di treni/voli e dell'evento), con
   margini realistici per code e attriti.
4. Non inventare dati: se non trovi qualcosa, scrivilo nel campo nota.

Rispondi SOLO con un oggetto JSON valido (nessun testo fuori dal JSON), in italiano, così:
{
  "riassunto": "una frase sul viaggio",
  "slot": [
    { "quando": "es. Sab 4 lug ~15:00", "cosa": "cosa fare", "nota": "consiglio/margine, opzionale" }
  ],
  "logistica": [
    { "info": "fatto operativo verificato", "fonte": "https://url-ufficiale" }
  ],
  "link": [
    { "label": "es. Hotel a Roma (Booking)", "url": "https://..." }
  ],
  "messaggio": "un messaggio breve e pronto da condividere (es. con la fidanzata)"
}`;
}

/** Arricchisce un viaggio: ricerca operativa web + genera e salva il piano. */
export async function enrichTripPlan(clusterKey: string): Promise<{ ok: boolean; plan: unknown }> {
  const trip = await getTripPlanByKey(clusterKey);
  if (!trip) throw new Error(`trip_plan non trovato: ${clusterKey}`);

  const tickets = await getTicketsByIds(trip.ticket_ids);
  const prompt = buildPrompt(trip, tickets);
  const text = await callClaudeWebSearch(prompt);

  let plan: unknown;
  try {
    plan = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error(`Il piano non è JSON valido. Risposta di Claude:\n${text.slice(0, 800)}`);
  }

  await saveTripPlanResult(clusterKey, plan);
  return { ok: true, plan };
}
