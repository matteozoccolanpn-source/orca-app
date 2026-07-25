/* ============================================================================
 * IL CONSIGLIO DI KEIKO (S6) — la parte che nessuna app di palestra ha.
 *
 * Una app di allenamento sa quanto hai sollevato. Keiko sa anche che domani
 * alle 6:40 hai un volo, che stasera alle 21 c'e' un concerto e che ti alleni
 * da tre giorni di fila. Qui dentro quelle due cose si incontrano e diventano
 * una riga sola: "Domani parti presto: seduta corta, i primi tre esercizi."
 *
 * Regole scritte a mano, nessun modello, nessuna chiamata esterna: e' una
 * funzione pura. Le entra dentro quello che sappiamo, ne esce (al massimo) un
 * consiglio. Se non c'e' niente di utile da dire, tace: una riga ovvia ripetuta
 * ogni giorno diventa rumore e si smette di leggerla.
 *
 * Le regole sono in ordine di priorita': vince la prima che si accende.
 * ========================================================================== */

import type { WorkoutSetRow } from "@/lib/supabase";

export type Consiglio = {
  icona: string;
  titolo: string;
  testo: string;
  /* "calma" = oggi alleggerisci · "spingi" = c'e' margine · "info" = solo un fatto */
  tono: "calma" | "spingi" | "info";
};

export type EventoCoach = {
  titolo: string;
  tipo: string;        // flight | train | concert | hotel | ...
  quando: string;      // ISO datetime
  luogo: string;
};

export type IngressoCoach = {
  adesso: Date;
  oggiIso: string;
  giornoDiAllenamento: boolean;      // la scheda prevede esercizi oggi
  eserciziOggi: string[];            // in ordine di scheda
  serieFatteOggi: number;            // 0 = non hai ancora iniziato
  trainedDays: string[];             // YYYY-MM-DD gia' allenati
  eventi: EventoCoach[];             // prossimi eventi (gia' filtrati: futuri)
  ultimaVolta: Record<string, WorkoutSetRow[]>;
  stile: string | null;              // 'duro' | 'chill' dal profilo
};

/* --- attrezzi ------------------------------------------------------------ */

const isoLocale = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const oraCorta = (d: Date) =>
  `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Giorni interi di distanza fra due date, ignorando l'orario. */
function distanzaGiorni(aIso: string, bIso: string): number {
  const [ay, am, ad] = aIso.split("-").map(Number);
  const [by, bm, bd] = bIso.split("-").map(Number);
  if (!ay || !by) return 0;
  const a = new Date(ay, am - 1, ad).getTime();
  const b = new Date(by, bm - 1, bd).getTime();
  return Math.round((a - b) / 86_400_000);
}

/** Un evento da cui devi PARTIRE: se lo perdi, lo perdi. */
const isPartenza = (tipo: string) => tipo === "flight" || tipo === "train";

/** Un numero italiano leggibile: 42.5 -> "42,5", 40 -> "40". */
const numIt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/** Il peso piu' alto di un gruppo di serie (0 se il peso non c'entra). */
function maxKg(rows: WorkoutSetRow[]): number {
  const kg = rows.map((r) => r.pesoKg ?? 0).filter((n) => n > 0);
  return kg.length > 0 ? Math.max(...kg) : 0;
}

/* --- la funzione ---------------------------------------------------------- */

export function consiglioAllenamento(x: IngressoCoach): Consiglio | null {
  const domaniIso = (() => {
    const d = new Date(x.adesso);
    d.setDate(d.getDate() + 1);
    return isoLocale(d);
  })();

  // Gli eventi che ci interessano, con la data gia' sciolta.
  const eventi = x.eventi
    .map((e) => ({ ...e, data: new Date(e.quando) }))
    .filter((e) => !isNaN(e.data.getTime()))
    .sort((a, b) => a.data.getTime() - b.data.getTime());

  const oggiEventi = eventi.filter((e) => isoLocale(e.data) === x.oggiIso);
  const domaniEventi = eventi.filter((e) => isoLocale(e.data) === domaniIso);

  /* --- 1. Giorno di riposo, ma domani ti alleni e domani parti presto -----
   * L'unico consiglio che vale la pena dare in un giorno di riposo: sposta. */
  if (!x.giornoDiAllenamento) {
    const partenzaDomani = domaniEventi.find((e) => isPartenza(e.tipo) && e.data.getHours() < 10);
    if (partenzaDomani) {
      return {
        icona: partenzaDomani.tipo === "flight" ? "✈️" : "🚆",
        titolo: `Domani parti alle ${oraCorta(partenzaDomani.data)}`,
        testo: "Oggi è riposo, ma domani ti alzi all'alba: se ti va di muoverti, oggi è la giornata giusta per anticipare.",
        tono: "info",
      };
    }
    return null;
  }

  /* --- 2. Domani si parte presto → oggi seduta corta ---------------------- */
  const partenzaDomani = domaniEventi.find((e) => isPartenza(e.tipo) && e.data.getHours() < 10);
  if (partenzaDomani && x.serieFatteOggi === 0) {
    const primi = x.eserciziOggi.slice(0, 3);
    return {
      icona: partenzaDomani.tipo === "flight" ? "✈️" : "🚆",
      titolo: `Domani ${partenzaDomani.tipo === "flight" ? "voli" : "parti"} alle ${oraCorta(partenzaDomani.data)}`,
      testo:
        primi.length > 0
          ? `Seduta corta e a letto presto: ${primi.join(", ")} e chiudi lì.`
          : "Seduta corta e a letto presto.",
      tono: "calma",
    };
  }

  /* --- 3. Oggi hai un impegno: quanta finestra ti resta ------------------- */
  const prossimoOggi = oggiEventi.find((e) => e.data.getTime() > x.adesso.getTime());
  if (prossimoOggi && x.serieFatteOggi === 0) {
    const ore = (prossimoOggi.data.getTime() - x.adesso.getTime()) / 3_600_000;
    if (ore < 3) {
      const primi = x.eserciziOggi.slice(0, 2);
      return {
        icona: "⏳",
        titolo: `Alle ${oraCorta(prossimoOggi.data)} hai ${prossimoOggi.titolo}`,
        testo:
          primi.length > 0
            ? `Meno di tre ore: fai ${primi.join(" e ")}, il resto lo recuperi.`
            : "Meno di tre ore: meglio una seduta corta che nessuna seduta.",
        tono: "calma",
      };
    }
  }

  /* --- 4. Sei fuori casa: la palestra non ce l'hai ------------------------ */
  const fuori = oggiEventi.find((e) => e.tipo === "hotel" || isPartenza(e.tipo));
  if (fuori && x.serieFatteOggi === 0) {
    return {
      icona: "🧳",
      titolo: fuori.luogo ? `Oggi sei a ${fuori.luogo}` : "Oggi sei in giro",
      testo: "Niente panca: venti minuti a corpo libero valgono più di un giorno saltato.",
      tono: "info",
    };
  }

  /* --- 5. Tre giorni di fila: il recupero è allenamento ------------------- */
  const set = new Set(x.trainedDays);
  const ieri = (n: number) => {
    const d = new Date(x.adesso);
    d.setDate(d.getDate() - n);
    return isoLocale(d);
  };
  if (set.has(ieri(1)) && set.has(ieri(2)) && set.has(ieri(3))) {
    return {
      icona: "🌙",
      titolo: "Tre giorni di fila",
      testo: "Se oggi il corpo ti dice di no, ascoltalo: il muscolo cresce quando ti fermi, non mentre spingi.",
      tono: "calma",
    };
  }

  /* --- 6. Sei fermo da un po': si riparte piano -------------------------- */
  const ultimoAllenamento = [...x.trainedDays].sort().reverse()[0];
  const fermoDa = ultimoAllenamento ? distanzaGiorni(x.oggiIso, ultimoAllenamento) : 999;
  if (fermoDa >= 7 && x.serieFatteOggi === 0) {
    return {
      icona: "🌱",
      titolo: fermoDa > 300 ? "Si comincia" : `Sono ${fermoDa} giorni`,
      testo:
        fermoDa > 300
          ? "Prima seduta segnata: parti con carichi onesti, ci sarà tempo per spingere."
          : "Togli un 10% dai carichi dell'ultima volta: rientrare bene vale più di rientrare forte.",
      tono: "info",
    };
  }

  /* --- 7. Progressione sull'esercizio principale di oggi ------------------
   * La regola più semplice che funziona: se l'ultima volta hai chiuso almeno
   * tre serie da 8 ripetizioni o più, quel peso lo hai in mano. Sali. */
  const principale = x.eserciziOggi[0];
  const prec = principale ? x.ultimaVolta[principale] ?? [] : [];
  const kg = maxKg(prec);
  if (x.serieFatteOggi === 0 && principale && kg > 0) {
    const buone = prec.filter((r) => (r.ripetizioni ?? 0) >= 8).length;
    if (buone >= 3) {
      const passo = kg >= 40 ? 2.5 : 1.25;
      return {
        icona: "📈",
        titolo: `${principale}: prova ${numIt(kg + passo)} kg`,
        testo: `L'ultima volta hai chiuso ${buone} serie piene a ${numIt(kg)} kg. Quel peso ce l'hai.`,
        tono: "spingi",
      };
    }
    return {
      icona: "🎯",
      titolo: `${principale}: resta a ${numIt(kg)} kg`,
      testo: "L'ultima volta le ripetizioni si sono accorciate: stesso peso, ma tutte pulite.",
      tono: "info",
    };
  }

  /* --- 8. Hai già segnato qualcosa oggi ---------------------------------- */
  if (x.serieFatteOggi > 0) {
    const restano = x.eserciziOggi.length;
    return {
      icona: "💪",
      titolo: `${x.serieFatteOggi} serie segnate`,
      testo:
        x.stile === "chill"
          ? "Quando basta, basta: quello che hai fatto è già scritto."
          : restano > 0
            ? "Sei dentro. Chiudi la scheda e la settimana si sistema da sola."
            : "Sei dentro.",
      tono: "spingi",
    };
  }

  return null;
}
