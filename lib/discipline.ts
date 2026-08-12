/* ============================================================================
 * LE DISCIPLINE — cosa si registra, e come si legge.
 *
 * La sessione registrava solo serie, ripetizioni e chili: quando Matteo correva
 * l'app gli chiedeva quanti chili aveva sollevato. Qui la registrazione diventa
 * dipendente dalla disciplina.
 *
 * Il vincolo di sempre vale anche qui: Keiko registra quello che Matteo ha
 * fatto, non prescrive quello che dovrebbe fare. In questo file non esiste un
 * obiettivo, un'andatura consigliata o un «dovresti».
 *
 * Nessun modello, nessuna chiamata all'AI: e' un dizionario, e deve essere
 * prevedibile e leggibile a occhio.
 * ========================================================================== */

export const DISCIPLINE = ["pesi", "corsa", "nuoto", "bici", "camminata", "remo", "altro"] as const;
export type Disciplina = (typeof DISCIPLINE)[number];

/** Come si chiama in italiano, per i chip e le etichette. */
export const NOME_DISCIPLINA: Record<Disciplina, string> = {
  pesi: "Pesi",
  corsa: "Corsa",
  nuoto: "Nuoto",
  bici: "Bici",
  camminata: "Camminata",
  remo: "Remo",
  altro: "Altro",
};

/* Le parole che fanno indovinare. Ordine = priorità: la prima che combacia
   vince. Si legge a occhio, e si allunga aggiungendo una parola. */
const PAROLE: [Disciplina, string[]][] = [
  ["corsa", ["corsa", "corri", "correre", "run", "running", "tapis", "treadmill", "jogging", "sprint", "z2"]],
  ["nuoto", ["nuoto", "nuotare", "vasca", "vasche", "stile libero", "stile", "rana", "dorso", "delfino", "crawl", "piscina"]],
  ["bici", ["bici", "bicicletta", "cyclette", "spinning", "ciclismo", "bike", "rulli"]],
  ["camminata", ["camminata", "cammino", "camminare", "passeggiata", "walk", "walking"]],
  ["remo", ["remo", "remoergometro", "vogatore", "rower", "rowing", "canottaggio"]],
];

/** Indovina la disciplina dal nome dell'esercizio, che arriva dalla scheda del
 *  preparatore. Tutto quello che non combacia e' `pesi`, che e' il caso
 *  normale: e' una palestra, non un triathlon. Sbaglierà, e per questo la
 *  schermata lascia cambiarla a mano — e la scelta a mano vince sempre. */
export function indovinaDisciplina(nomeEsercizio: string): Disciplina {
  const n = (nomeEsercizio ?? "").toLowerCase();
  for (const [disciplina, parole] of PAROLE) {
    for (const p of parole) {
      /* confine di parola: "rana" non deve accendersi dentro "granata",
         ne' "remo" dentro "tremore". */
      const re = new RegExp(`(^|[^a-zà-ù])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zà-ù]|$)`);
      if (re.test(n)) return disciplina;
    }
  }
  return "pesi";
}

/* ── quali campi chiede ogni disciplina ──────────────────────────────────── */

export type Campo = "ripetizioni" | "peso" | "distanza" | "durata" | "bpm" | "dislivello" | "fatica";

const PROPRI: Record<Disciplina, Campo[]> = {
  pesi: ["ripetizioni", "peso"],
  corsa: ["distanza", "durata", "bpm"],
  camminata: ["distanza", "durata", "bpm"],
  nuoto: ["distanza", "durata", "bpm"],
  bici: ["distanza", "durata", "dislivello", "bpm"],
  remo: ["distanza", "durata"],
  altro: ["durata"],
};

/* La fatica non e' di «altro»: e' di tutte, e resta facoltativa. Sta fuori
   dalla tabella qui sopra proprio per non sembrare il campo di una disciplina
   sola — quanto ti e' costata vale per una panca come per una corsa. */
export const CAMPI: Record<Disciplina, Campo[]> =
  Object.fromEntries(DISCIPLINE.map((d) => [d, [...PROPRI[d], "fatica" as Campo]])) as Record<Disciplina, Campo[]>;

export const chiede = (d: Disciplina, c: Campo) => CAMPI[d].includes(c);

/** L'unità in cui si scrive la distanza, e di quanto la spostano le due
 *  scorciatoie. In vasca si ragiona in metri e a scatti di 25; su strada in
 *  metri ma a scatti di 100. */
export const SCATTO_DISTANZA: Partial<Record<Disciplina, number>> = {
  corsa: 100, camminata: 100, bici: 100, remo: 100, nuoto: 25,
};

/* ── i conti ─────────────────────────────────────────────────────────────── */

/** `1830` → `30'30"`, `3661` → `1:01:01`. Zero e null diventano stringa vuota:
 *  un dato che non c'e' non si scrive. */
export function durataDetta(secondi: number | null | undefined): string {
  if (!secondi || secondi <= 0) return "";
  const h = Math.floor(secondi / 3600);
  const m = Math.floor((secondi % 3600) / 60);
  const s = Math.round(secondi % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}'${String(s).padStart(2, "0")}"`;
}

/** `5000` → `5,0 km` · `1500` in vasca → `1500 m`. In acqua e al vogatore i
 *  metri restano metri: nessuno dice «ho fatto 1,5 km di vasca», e nessuno
 *  chiama «2 km» un 2000 all'ergometro. E' la stessa convenzione per cui il
 *  remo conta il passo sui 500. */
export function distanzaDetta(metri: number | null | undefined, d: Disciplina): string {
  if (!metri || metri <= 0) return "";
  if (d === "nuoto" || d === "remo") return `${metri} m`;
  if (metri < 1000) return `${metri} m`;
  const km = metri / 1000;
  return `${km.toFixed(km >= 10 ? 0 : 1).replace(".", ",")} km`;
}

/** L'ANDATURA NON SI SALVA: si calcola da durata e distanza. Se la salvassimo,
 *  prima o poi i due numeri si contraddirebbero e non sapremmo a chi credere.
 *  Corsa e camminata al chilometro, nuoto ogni 100 m, bici in km/h. */
export function andatura(metri: number | null | undefined, secondi: number | null | undefined, d: Disciplina): string {
  if (!metri || !secondi || metri <= 0 || secondi <= 0) return "";
  if (d === "bici") {
    const kmh = (metri / 1000) / (secondi / 3600);
    return `${kmh.toFixed(1).replace(".", ",")} km/h`;
  }
  if (d === "nuoto") {
    const per100 = secondi / (metri / 100);
    return `${Math.floor(per100 / 60)}:${String(Math.round(per100 % 60)).padStart(2, "0")}/100m`;
  }
  if (d === "remo") {
    /* Il canottaggio conta il passo sui 500 m, non al chilometro: e' la
       convenzione vera dello sport, e chi rema legge quella. */
    const per500 = secondi / (metri / 500);
    return `${Math.floor(per500 / 60)}:${String(Math.round(per500 % 60)).padStart(2, "0")}/500m`;
  }
  if (d === "corsa" || d === "camminata") {
    const perKm = secondi / (metri / 1000);
    return `${Math.floor(perKm / 60)}:${String(Math.round(perKm % 60)).padStart(2, "0")}/km`;
  }
  return "";
}

/* ── come si racconta una prestazione ────────────────────────────────────── */

/** La forma minima di una serie che serve per raccontarla. Sta qui e non in
 *  `lib/supabase` perche' questi conti valgono anche prima di salvare, mentre
 *  stai ancora scrivendo i numeri nel foglio. */
export type SerieDetta = {
  disciplina?: string | null;
  serie?: number | null;
  ripetizioni?: number | null;
  pesoKg?: number | null;
  secondi?: number | null;
  distanzaM?: number | null;
  bpmMedio?: number | null;
  dislivelloM?: number | null;
};

/** La disciplina di una riga, con il ripiego su `pesi`: tutte le serie
 *  registrate prima di questo lavoro hanno la colonna a `pesi`, e quelle
 *  che per qualunque motivo non ce l'hanno si leggono uguale. */
export const disciplinaDi = (r: { disciplina?: string | null }): Disciplina =>
  (DISCIPLINE as readonly string[]).includes(r.disciplina ?? "") ? (r.disciplina as Disciplina) : "pesi";

/** Una serie sola, detta come si direbbe a voce: `8 × 60 kg`, `5,0 km in
 *  27'10" · 5:26/km`. Niente giudizi: e' un fatto, non una pagella. */
export function serieDetta(r: SerieDetta): string {
  const d = disciplinaDi(r);
  if (d === "pesi") {
    const rip = r.ripetizioni ? `${r.ripetizioni}` : "";
    const kg = r.pesoKg ? `${String(r.pesoKg).replace(".", ",")} kg` : "";
    return [rip, kg].filter(Boolean).join(" × ") || durataDetta(r.secondi) || "—";
  }
  const pezzi = [
    distanzaDetta(r.distanzaM, d),
    durataDetta(r.secondi) ? `in ${durataDetta(r.secondi)}` : "",
  ].filter(Boolean);
  const testa = pezzi.join(" ");
  const coda = [
    andatura(r.distanzaM, r.secondi, d),
    d === "bici" && r.dislivelloM ? `${r.dislivelloM} m D+` : "",
    r.bpmMedio ? `${r.bpmMedio} bpm` : "",
  ].filter(Boolean);
  return [testa, ...coda].filter(Boolean).join(" · ") || "—";
}

/** Un gruppo di serie dello stesso esercizio, per «l'ultima volta».
 *  Sui pesi si compatta (`4 × 10 a 60 kg`); sulle discipline di durata si
 *  sommano distanza e tempo, perche' due tratti di corsa nella stessa seduta
 *  sono una corsa sola. Non dice mai chi ha vinto: mette il dato di prima
 *  accanto a quello di adesso, e il giudizio lo fa Matteo. */
export function riassuntoSerie(righe: SerieDetta[]): string {
  if (!righe.length) return "";
  const d = disciplinaDi(righe[0]);

  if (d === "pesi") {
    const rip = righe.map((r) => r.ripetizioni ?? 0);
    const uguali = rip.every((x) => x === rip[0]) && rip[0] > 0;
    const pesi = righe.map((r) => r.pesoKg).filter((x): x is number => typeof x === "number" && x > 0);
    const maxKg = pesi.length ? Math.max(...pesi) : null;
    const testa = uguali ? `${righe.length} × ${rip[0]}` : righe.map((r) => r.ripetizioni ?? "–").join(" · ");
    return maxKg ? `${testa} a ${String(maxKg).replace(".", ",")} kg` : testa;
  }

  const metri = righe.reduce((s, r) => s + (r.distanzaM ?? 0), 0);
  const secondi = righe.reduce((s, r) => s + (r.secondi ?? 0), 0);
  const bpm = righe.map((r) => r.bpmMedio).filter((x): x is number => typeof x === "number" && x > 0);
  const disl = righe.reduce((s, r) => s + (r.dislivelloM ?? 0), 0);
  return serieDetta({
    disciplina: d,
    distanzaM: metri || null,
    secondi: secondi || null,
    bpmMedio: bpm.length ? Math.round(bpm.reduce((a, b) => a + b, 0) / bpm.length) : null,
    dislivelloM: disl || null,
  });
}

/* ── il campo durata ─────────────────────────────────────────────────────── */

/** `27:10` → 1630 · `1:05:00` → 3900 · `27` → 27 minuti? No: 27 secondi.
 *  Chi scrive `27:10` intende 27 minuti e 10 secondi, ed e' la forma che il
 *  campo mostra. Le cifre sciolte si leggono come secondi. */
export function durataInSecondi(testo: string): number | null {
  const t = (testo ?? "").trim();
  if (!t) return null;
  const parti = t.split(":").map((x) => x.trim());
  if (parti.some((x) => x !== "" && !/^\d+$/.test(x))) return null;
  const n = parti.map((x) => (x === "" ? 0 : Number(x)));
  if (n.length === 1) return n[0];
  if (n.length === 2) return n[0] * 60 + n[1];
  if (n.length === 3) return n[0] * 3600 + n[1] * 60 + n[2];
  return null;
}

/** L'inverso, per riempire il campo con quello che c'e' gia' in tabella. */
export function secondiInTesto(secondi: number | null | undefined): string {
  if (!secondi || secondi <= 0) return "";
  const h = Math.floor(secondi / 3600);
  const m = Math.floor((secondi % 3600) / 60);
  const s = Math.round(secondi % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
