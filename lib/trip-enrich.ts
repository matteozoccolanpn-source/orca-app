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
  getPendingTripPlanKeys,
  setTripPlanStatus,
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

// Giorni del viaggio con il nome ESATTO (calcolato in codice: gli LLM sbagliano
// il giorno della settimana da una data). Es: "2026-07-04 = sabato 4 luglio".
function giorniDelViaggio(start: string | null, end: string | null): string {
  if (!start) return "";
  const days: string[] = [];
  const d = new Date(start + "T12:00:00");
  const last = new Date((end ?? start) + "T12:00:00");
  let guard = 0;
  while (d <= last && guard++ < 40) {
    const label = new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Rome",
    }).format(d);
    days.push(`- ${d.toISOString().slice(0, 10)} = ${label}`);
    d.setDate(d.getDate() + 1);
  }
  return days.join("\n");
}

function buildPrompt(trip: TripPlanRow, tickets: TicketDetail[]): string {
  const oggi = new Date().toISOString().slice(0, 10);
  const bigliettiTxt = tickets
    .map(
      (t) =>
        `- ${t.type} | ${t.datetime} | ${t.title} | luogo: ${t.location || "-"} | città: ${t.city || "-"}`
    )
    .join("\n");
  const giorni = giorniDelViaggio(trip.start_date, trip.end_date);

  return `Sei l'assistente di pianificazione viaggi di Keiko. Oggi è ${oggi}.

VIAGGIO a ${trip.city} (${trip.start_date} → ${trip.end_date}). Biglietti già in mano all'utente:
${bigliettiTxt}

GIORNI DEL VIAGGIO (usa ESATTAMENTE questi nomi dei giorni; NON ricalcolare tu il giorno
della settimana da una data, perché sbagli):
${giorni}

COMPITO: costruisci un piano operativo pratico E PIENO DI COSE DA FARE (non solo logistica).
Regole (IMPORTANTISSIME):
1. Cerca sul web SOLO la "logistica operativa": come raggiungere le venue, navette e tempi,
   distanze a piedi, chiusure/scioperi/deviazioni DI QUEI GIORNI PRECISI, mezzi notturni per
   il rientro, orari di apertura dei musei in quella data. Usa FONTI UFFICIALI e cita l'URL.
2. NON cercare né inventare prezzi o disponibilità (hotel/voli/biglietti): per quelli dai solo
   un LINK utile (Booking, Skyscanner, sito ufficiale...). Nessun prezzo scritto.
3. Calcola gli orari A RITROSO dalle ancore fisse (orari di treni/voli e dell'evento), con
   margini realistici per code e attriti.
4. Non inventare dati: se non trovi qualcosa, scrivilo nel campo nota.
5. Per i giorni usa SEMPRE i nomi esatti dell'elenco "GIORNI DEL VIAGGIO" (es. "Sab 4 lug").
6. RIEMPI il tempo libero (mattine, buchi tra gli impegni, l'ultimo giorno prima di ripartire)
   con COSE DA FARE concrete nella città giusta: musei/attrazioni (CERCA e verifica che siano
   aperti QUEL giorno preciso della settimana), quartieri da girare, punti panoramici, mercati,
   dove mangiare (solo nome + link). Proponi 2-3 opzioni per ogni blocco libero. NON lasciare
   slot vaghi tipo "giornata libera" o "relax mattina" senza proposte concrete. Ricorda anche
   le cose pratiche (es. deposito bagagli l'ultimo giorno se il check-out è prima del rientro).
   PRIMA di proporre un museo/attrazione VERIFICA (ricerca) che sia APERTO quel giorno esatto
   della settimana. Se è chiuso quel giorno NON proporlo (es. molti musei chiudono il LUNEDÌ;
   i Musei Vaticani chiudono la DOMENICA, salvo l'ultima del mese). Mai proporre posti chiusi.
7. STRUTTURA slot: le tappe FISSE (treno, volo, concerto, navetta, deposito bagagli) hanno
   "fisso": true e UNA sola opzione. Le ATTIVITÀ del tempo libero hanno "fisso": false e
   2-3 opzioni ALTERNATIVE concrete, così l'utente può scambiarle senza altre ricerche.
8. HOTEL: se tra i biglietti c'è un hotel, è la BASE del viaggio. Inserisci check-in e
   check-out come slot fissi (orari standard se non indicati), fai convergere le serate
   verso l'hotel (rientro), usa la sua posizione per scegliere attività comode e NON
   proporre altri hotel o link per dormire.

Rispondi SOLO con un oggetto JSON valido (nessun testo fuori dal JSON), in italiano, così:
{
  "riassunto": "una frase sul viaggio",
  "slot": [
    {
      "quando": "es. Sab 4 lug ~15:00",
      "fisso": true,
      "opzioni": [ { "cosa": "cosa fare", "nota": "dettaglio/margine", "link": "https://... (opzionale)" } ]
    },
    {
      "quando": "es. Dom 5 lug mattina",
      "fisso": false,
      "opzioni": [
        { "cosa": "Galleria Borghese", "nota": "climatizzata, prenota online", "link": "https://..." },
        { "cosa": "Palazzo Barberini", "nota": "Caravaggio, centrale", "link": "https://..." },
        { "cosa": "Passeggiata a Trastevere", "nota": "quartiere caratteristico" }
      ]
    }
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

/* ===== A2: modifica TESTUALE di un singolo slot dell'itinerario =====
 * L'utente scrive cosa vuole ("spostalo al pomeriggio", "trova qualcosa al
 * chiuso") e Claude riscrive SOLO quello slot, non tutto il piano.
 * Costo contenuto: web-search limitata, un solo slot in output. */

type EditSlot = { quando?: string; fisso?: boolean; opzioni?: { cosa?: string; nota?: string; link?: string }[] };

export async function editTripSlot(
  clusterKey: string,
  slotIndex: number,
  richiesta: string
): Promise<{ ok: boolean; slot: EditSlot }> {
  const trip = await getTripPlanByKey(clusterKey);
  if (!trip) throw new Error(`trip_plan non trovato: ${clusterKey}`);

  const plan = (trip.plan ?? {}) as { slot?: EditSlot[] };
  const slots = Array.isArray(plan.slot) ? plan.slot : [];
  if (slotIndex < 0 || slotIndex >= slots.length) throw new Error("slot inesistente");

  const attuale = slots[slotIndex];
  // Contesto compatto: tutta la sequenza (solo quando + prima opzione),
  // così la modifica resta coerente con orari e tappe vicine.
  const sequenza = slots
    .map((s, i) => `${i === slotIndex ? "→" : " "} ${s.quando ?? "?"} | ${s.opzioni?.[0]?.cosa ?? "-"}${s.fisso ? " [FISSO]" : ""}`)
    .join("\n");

  const prompt = `Sei l'assistente viaggi di Keiko. Viaggio a ${trip.city} (${trip.start_date} → ${trip.end_date}).

SEQUENZA ATTUALE (la freccia → indica la tappa da modificare):
${sequenza}

TAPPA DA MODIFICARE (JSON attuale):
${JSON.stringify(attuale)}

RICHIESTA DELL'UTENTE: "${richiesta}"

Riscrivi SOLO questa tappa secondo la richiesta. Regole:
1. Stessa forma JSON: {"quando": "...", "fisso": true/false, "opzioni": [{"cosa": "...", "nota": "...", "link": "https://... (opzionale)"}]}.
2. Se la tappa è [FISSO] (treno/volo/evento con biglietto): NON cambiare orario né mezzo,
   puoi solo arricchire la nota (es. consigli, a che ora uscire).
3. Se proponi posti nuovi (musei, ristoranti...), VERIFICA con la ricerca web che esistano
   e siano aperti in quel giorno della settimana. Niente prezzi, solo link.
4. Mantieni la coerenza con le tappe vicine (orari che si incastrano).
5. Attività non fissa → 2-3 opzioni alternative concrete.
6. Non inventare: se non trovi qualcosa, dillo nel campo nota.

Rispondi SOLO col JSON della tappa, nessun testo fuori.`;

  const text = await callClaudeWebSearch(prompt);
  let nuovo: EditSlot;
  try {
    nuovo = JSON.parse(text.replace(/```json|```/g, "").trim()) as EditSlot;
  } catch {
    throw new Error(`La tappa modificata non è JSON valido:\n${text.slice(0, 400)}`);
  }
  if (!nuovo || !Array.isArray(nuovo.opzioni) || nuovo.opzioni.length === 0) {
    throw new Error("Tappa modificata senza opzioni: annullo per sicurezza");
  }

  slots[slotIndex] = nuovo;
  plan.slot = slots;
  await saveTripPlanResult(clusterKey, plan);
  return { ok: true, slot: nuovo };
}

// Durata del viaggio in giorni (per il guardrail viaggi lunghi).
function tripDurationDays(start: string | null, end: string | null): number {
  if (!start) return 0;
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date((end ?? start) + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * AUTO-GENERAZIONE: genera i piani per i viaggi 'pending' brevi.
 * Da chiamare in BACKGROUND (dopo la risposta) al salvataggio di un biglietto.
 * - Salta i viaggi lunghi (>= 7 giorni) — guardrail deciso con Matteo.
 * - Usa lo stato 'generating' per non generare due volte lo stesso viaggio.
 * - Se fallisce, rimette 'pending' così può riprovare al prossimo salvataggio.
 */
export async function autoEnrichNewTrips(): Promise<void> {
  const keys = await getPendingTripPlanKeys();
  for (const key of keys) {
    const trip = await getTripPlanByKey(key);
    if (!trip) continue;
    if (tripDurationDays(trip.start_date, trip.end_date) >= 7) continue; // viaggio lungo: no auto
    try {
      await setTripPlanStatus(key, "generating");
      await enrichTripPlan(key); // alla fine diventa 'ready'
    } catch (e) {
      console.error("autoEnrich fallita per", key, e);
      try {
        await setTripPlanStatus(key, "pending");
      } catch {
        /* ignora */
      }
    }
  }
}
