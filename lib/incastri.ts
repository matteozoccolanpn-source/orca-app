// Rilevamento "incastri": raggruppa i biglietti in viaggi.
//
// Regola (v1, decisa con Matteo — vedi docs/SPEC-PIANIFICATORE.md):
//  - La CITTÀ del viaggio è dove passi il tempo: dove ci sono eventi/pernottamenti.
//    Ora ce l'abbiamo pulita nel campo `city` (il parser la estrae, es. Tor Vergata -> Roma).
//  - I trasporti (treno/volo) sono le "parentesi": si agganciano al viaggio in base
//    alle DATE, NON alla loro città (un A/R tocca due città: andata Roma, ritorno Milano).
//  - Un cluster "merita un piano" (fa scattare la fase pesante) se la destinazione ha
//    almeno 1 evento o 1 pernottamento PIÙ almeno 1 trasporto.

export interface TicketInput {
  id: string;
  type: string;        // train, flight, concert, hotel, museum, restaurant, other
  datetime: string;    // ISO senza timezone, es. 2026-07-04T20:30:00
  city: string;        // città (destinazione), può essere vuota
}

export type Pattern = "viaggio_con_evento" | "viaggio_con_hotel" | "parziale";

export interface Cluster {
  clusterKey: string;   // "citta:startDate:endDate" — deterministico, anti-doppione (idempotenza)
  city: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  ticketIds: string[];
  pattern: Pattern;
  fires: boolean;       // true = merita la fase pesante (web-search)
}

const TRASPORTI = new Set(["train", "flight"]);
const EVENTI = new Set(["concert", "museum", "restaurant"]);
// "hotel" = pernottamento: è contenuto, ma non un "evento".

const FINESTRA_GIORNI = 4;    // durata massima di un viaggio breve (accorpa contenuti vicini)
const MARGINE_TRASPORTO = 2;  // quanti giorni prima/dopo può stare andata/ritorno

function dayString(iso: string): string {
  return (iso ?? "").slice(0, 10); // YYYY-MM-DD
}
function dayNumber(iso: string): number {
  return new Date(dayString(iso) + "T00:00:00").getTime() / 86_400_000; // giorni interi
}

/**
 * Trova i cluster "viaggio" nei biglietti.
 * Ancorato ai CONTENUTI (eventi/hotel) con città; i trasporti si agganciano per data.
 * Nota: il caso "solo A/R senza contenuti" (solo link Maps) non produce cluster qui:
 * è a basso valore e i dati città dei trasporti sono ambigui. Lo gestiremo a parte.
 */
export function detectClusters(tickets: TicketInput[]): Cluster[] {
  const contenuti = tickets.filter(
    (t) => (EVENTI.has(t.type) || t.type === "hotel") && t.city?.trim() && t.datetime
  );
  const trasporti = tickets.filter((t) => TRASPORTI.has(t.type) && t.datetime);

  // Raggruppa i contenuti per città
  const perCitta = new Map<string, TicketInput[]>();
  for (const t of contenuti) {
    const key = t.city.trim().toLowerCase();
    if (!perCitta.has(key)) perCitta.set(key, []);
    perCitta.get(key)!.push(t);
  }

  const clusters: Cluster[] = [];

  for (const lista of perCitta.values()) {
    lista.sort((a, b) => dayNumber(a.datetime) - dayNumber(b.datetime));

    // Accorpa i contenuti vicini nel tempo (entro FINESTRA_GIORNI) in gruppi
    let gruppo: TicketInput[] = [];
    const chiudiGruppo = () => {
      if (gruppo.length === 0) return;

      const cityLabel = gruppo[0].city.trim();
      const inizioContenuti = dayNumber(gruppo[0].datetime);
      const fineContenuti = dayNumber(gruppo[gruppo.length - 1].datetime);

      // Aggancia i trasporti che fanno da parentesi (per DATA, non per città)
      const brackets = trasporti.filter((tr) => {
        const d = dayNumber(tr.datetime);
        return d >= inizioContenuti - MARGINE_TRASPORTO && d <= fineContenuti + MARGINE_TRASPORTO;
      });

      const tutti = [...gruppo, ...brackets];
      const dates = tutti.map((t) => dayString(t.datetime)).sort();
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];

      const hasEvento = gruppo.some((t) => EVENTI.has(t.type));
      const hasHotel = gruppo.some((t) => t.type === "hotel");
      const hasTrasporto = brackets.length > 0;

      const pattern: Pattern =
        hasEvento && hasTrasporto ? "viaggio_con_evento" :
        hasHotel && hasTrasporto ? "viaggio_con_hotel" :
        "parziale";

      clusters.push({
        clusterKey: `${cityLabel.toLowerCase()}:${startDate}:${endDate}`,
        city: cityLabel,
        startDate,
        endDate,
        ticketIds: tutti.map((t) => t.id).sort(),
        pattern,
        fires: (hasEvento || hasHotel) && hasTrasporto,
      });

      gruppo = [];
    };

    for (const t of lista) {
      if (gruppo.length === 0) {
        gruppo.push(t);
        continue;
      }
      const spanStart = dayNumber(gruppo[0].datetime);
      if (dayNumber(t.datetime) - spanStart <= FINESTRA_GIORNI) gruppo.push(t);
      else {
        chiudiGruppo();
        gruppo.push(t);
      }
    }
    chiudiGruppo();
  }

  return clusters;
}
