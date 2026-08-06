// I BATTITI — vedi docs/SPEC-BATTITI.md.
//
// Ogni evento torna a farsi sentire nei momenti giusti: PRIMA per caricarti,
// DOPO per fartelo rivivere. Zero AI, zero API a pagamento: solo link di
// ricerca (Google, YouTube, Spotify).
//
// ────────────────────────────────────────────────────────────────────────────
// LA REGOLA CHE NON SI NEGOZIA
//
// Il motore (`battitiCandidati`, in fondo) non nomina MAI un tipo di evento.
// Non sa cosa sia una partita o un concerto: sa solo leggere la tabella qui
// sotto. Aggiungere un tipo domani = aggiungere una riga, e basta.
//
// Corollario: un tipo che non è in tabella NON batte. È voluto — è la regola
// "niente azione, niente battito" della spec: un battito che dice solo
// "ricordi?" senza niente da fare non esiste. Nessuna riga default.
//
// Quando una regola dipende dal SINGOLO evento (esempio: "Le formazioni" ha
// senso per Milan–Inter ma non per gli Europei di nuoto), quella decisione sta
// DENTRO la riga della tabella, mai nel motore.
// ────────────────────────────────────────────────────────────────────────────

export type StatoBattito = "mostrato" | "chiuso" | "notificato";

/** Le fonti foto che una riga può chiedere, in ordine. */
export type ImmagineDa = "artista" | "luogo";

/** Quel che la riga sa dell'evento quando compone frase e azione. */
export interface Contesto {
  titolo: string;
  /** La parte del titolo prima di "—", "-" o " a ". Fallback: il titolo intero. */
  artista: string;
}

export interface Azione {
  etichetta: string;
  url: string;
}

export interface RigaBattito {
  /** "prima" o "dopo": è anche la chiave con cui lo stato finisce in enrichment. */
  chiave: "prima" | "dopo";
  /** Finestra in ore RELATIVE all'evento: negativa = prima, positiva = dopo. */
  daOre: number;
  aOre: number;
  /** Più frasi per varietà: se ne pesca una in modo stabile (hash dell'id). */
  frasi: ((c: Contesto) => string)[];
  azione: (c: Contesto) => Azione;
  /** Facoltativo: la riga può dire "su QUESTO evento non ho senso" (esempio: il
   *  trailer di un film di cui non sappiamo il titolo). Il motore lo chiede e
   *  basta — non sa perché la risposta sia no. */
  vale?: (c: Contesto) => boolean;
  /** A che ora andrà mandata la notifica (la userà E2; qui non si notifica). */
  oraNotifica: string;
  /** Da dove prendere la FOTO della card, in ordine di preferenza. Il motore
   *  non risolve niente: passa la catena a chi sa fare le chiamate. Il gradiente
   *  di categoria è sempre l'ultimo gradino e non si scrive qui. */
  immagini: ImmagineDa[];
}

const ORA = 3_600_000;
const GIORNO = 24 * ORA;

// ── i link (una funzione per fonte, così l'encoding si scrive una volta) ─────
const cerca = {
  google: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  googleNews: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=nws`,
  youtube: (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  spotify: (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
};

/** Due contendenti nel titolo? "Milan–Inter" sì, "Europei di nuoto" no.
 *  Serve SOLO alla riga sport: le formazioni hanno senso a chi ha un avversario.
 *  Sta qui e non nel motore, che di partite non sa niente.
 *
 *  Non basta trovare un trattino: "Coppa Italia - Europei di nuoto" ne ha uno e
 *  contendenti no. La prova vera è che ai due lati ci siano NOMI CORTI (una o
 *  due parole: "Milan"/"Inter", "Real Madrid"/"Bayern", "Sinner"/"Alcaraz").
 *  Si provano tutti i separatori del titolo, non solo il primo. */
const SEPARATORI = /–|—|-|\bvs\.?\b|\bcontro\b/gi;
function haDueContendenti(titolo: string): boolean {
  const t = (titolo ?? "").trim();
  const parole = (x: string) => x.trim().split(/\s+/).filter(Boolean);
  SEPARATORI.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SEPARATORI.exec(t)) !== null) {
    const sx = parole(t.slice(0, m.index));
    const dx = parole(t.slice(m.index + m[0].length));
    const corto = (p: string[]) => p.length >= 1 && p.length <= 2 && p.join("").length >= 2;
    if (corto(sx) && corto(dx)) return true;
  }
  return false;
}

/** Le parole di contorno con cui si scrive un evento al cinema. Si tolgono da
 *  davanti al titolo: "cinema giovedì: Dune parte due" → "Dune parte due".
 *  Split semplice, niente NLP. */
const CONTORNO_CINEMA =
  /^(?:al\s+)?(?:cinema|film|serata\s+cinema|proiezione|prima\s+visione)\b[\s:,\u2013\u2014-]*/i;

/** Il film dentro il titolo, o null se non ce n'è uno riconoscibile.
 *  "cinema con Sara" → resta "con Sara", che non è un film: null.
 *  Sta accanto alle righe cinema perché è roba loro, non del motore. */
export function filmDa(titolo: string): string | null {
  let t = (titolo ?? "").trim();
  // Le tre pulizie si applicano finché tolgono qualcosa: "cinema stasera con
  // Sara" ha bisogno di tre giri, e farne uno solo lasciava "con Sara", che
  // sembrava un film e non lo è.
  for (let giro = 0; giro < 3; giro++) {
    const prima = t;
    t = t.replace(CONTORNO_CINEMA, "").trim();
    // Attenzione al confine di parola: dopo una lettera accentata ("giovedì")
    // \b non scatta, perché per la regex ì non è una lettera. Si guarda invece
    // che dopo ci sia uno spazio, una punteggiatura o la fine.
    t = t
      .replace(/^(?:stasera|stanotte|domani|oggi|sabato|domenica|luned[ìi]|marted[ìi]|mercoled[ìi]|gioved[ìi]|venerd[ìi])(?=[\s:,\u2013\u2014-]|$)[\s:,\u2013\u2014-]*/i, "")
      .trim();
    // "con Sara" non è un film: da qui in poi è compagnia, non titolo.
    t = t.replace(/^(?:con|insieme a|assieme a)(?=\s|$).*$/i, "").trim();
    if (t === prima) break;
  }
  return t.length >= 2 ? t : null;
}

/**
 * LA TABELLA. Tutto il "condimento" sta qui: quali tipi battono, quando, con
 * che parole, verso dove. Il motore non ha nient'altro da sapere.
 */
export const BEATS: Record<string, RigaBattito[]> = {
  sport: [
    {
      chiave: "prima",
      daOre: -30,
      aOre: -18,
      frasi: [(c) => `Domani sera: ${c.titolo}`, (c) => `Ci siamo: ${c.titolo}`],
      azione: (c) =>
        haDueContendenti(c.titolo)
          ? { etichetta: "Le formazioni", url: cerca.google(`${c.titolo} probabili formazioni`) }
          : { etichetta: "Le ultime", url: cerca.googleNews(c.titolo) },
      oraNotifica: "13:00",
      immagini: ["luogo"],
    },
    {
      chiave: "dopo",
      daOre: 12,
      aOre: 48,
      frasi: [(c) => `Ieri: ${c.titolo}`, () => "Com'è finita lo sai. Rivedila"],
      azione: (c) =>
        haDueContendenti(c.titolo)
          ? { etichetta: "Gli highlights", url: cerca.youtube(`${c.titolo} highlights`) }
          : { etichetta: "I momenti migliori", url: cerca.youtube(`${c.titolo} highlights`) },
      oraNotifica: "13:00",
      immagini: ["luogo"],
    },
  ],
  /* CINEMA — la riga ⭐ della spec: il battito "dopo" non porta fuori, porta
     DENTRO Keiko, in Guarda, col film pronto da votare. È il ponte fra due
     domìni dell'app.

     Il titolo dell'evento può essere il film ("Dune parte due") o solo una
     descrizione ("cinema con Sara"): `filmDa` toglie le parole di contorno e
     dice se quello che resta è un titolo o niente. Se non c'è un film:
     - "prima" non scatta (un trailer di niente non esiste);
     - "dopo" scatta lo stesso, ma generico: apre Guarda con la ricerca vuota,
       e a scegliere è l'utente. */
  cinema: [
    {
      chiave: "prima",
      daOre: -30,
      aOre: -18,
      vale: (c) => filmDa(c.titolo) !== null,
      frasi: [(c) => `Domani: ${filmDa(c.titolo)}`, (c) => `Stasera al cinema: ${filmDa(c.titolo)}`],
      azione: (c) => ({ etichetta: "Il trailer", url: cerca.youtube(`${filmDa(c.titolo)} trailer`) }),
      oraNotifica: "19:00",
      immagini: ["luogo"],
    },
    {
      chiave: "dopo",
      daOre: 12,
      aOre: 48,
      frasi: [
        (c) => (filmDa(c.titolo) ? `Com'era ${filmDa(c.titolo)}?` : "Com'era il film?"),
        () => "Com'era? Segnalo in Guarda",
      ],
      // Link INTERNO: non porta via dall'app, porta nell'altra stanza.
      azione: (c) => ({
        etichetta: "Segnalo in Guarda",
        url: `/guarda?vota=${encodeURIComponent(filmDa(c.titolo) ?? "")}`,
      }),
      oraNotifica: "13:00",
      immagini: ["luogo"],
    },
  ],
  concert: [
    {
      chiave: "prima",
      daOre: -30,
      aOre: -18,
      frasi: [(c) => `Domani: ${c.artista}`, (c) => `-1 a ${c.artista}`],
      azione: (c) => ({ etichetta: "Scaldati con la playlist", url: cerca.spotify(c.artista) }),
      oraNotifica: "19:00",
      // La faccia dell'artista prima del luogo: di un concerto ci si ricorda chi
      // suonava, non com'era fatto il palazzetto.
      immagini: ["artista", "luogo"],
    },
    {
      chiave: "dopo",
      daOre: 30 * 24,
      aOre: 37 * 24,
      frasi: [(c) => `Rivivi ${c.artista}`, (c) => `È passato un mese da ${c.artista}`],
      azione: (c) => ({ etichetta: "Riascoltalo", url: cerca.spotify(c.artista) }),
      oraNotifica: "19:00",
      immagini: ["artista", "luogo"],
    },
  ],
};

// ── il motore ───────────────────────────────────────────────────────────────

/** L'evento come arriva dal database, ridotto all'osso. */
export interface EventoPerBattiti {
  id: string;
  title: string;
  type: string;
  datetime: string | null;
  /** Lo stato dei battiti già mostrati/chiusi/notificati per questo evento.
   *  Tipo largo di proposito: viene da un jsonb, e un valore inatteso non deve
   *  impedire di leggere il resto (il motore confronta solo con "chiuso"). */
  beats?: Record<string, string> | null;
}

export interface Battito {
  eventoId: string;
  chiave: "prima" | "dopo";
  tipo: string;
  frase: string;
  azione: Azione;
  oraNotifica: string;
  /** Lo stato già registrato per questo battito: "mostrato", "notificato" o
   *  niente. Serve alle notifiche, che saltano quello che l'utente ha già
   *  visto in home. La card invece lo mostra lo stesso. */
  stato: string | null;
  /** Da quante ore la finestra è aperta: più è piccolo, più il battito è fresco. */
  freschezza: number;
  /** Da quante ore è passato l'evento (negativo se deve ancora arrivare).
   *  Serve alla card per dire "UN MESE FA" invece di contare dall'apertura
   *  della finestra, che è un'altra cosa. */
  oreDaEvento: number;
  /** La catena delle fonti foto, copiata dalla riga: la risolve chi può fare
   *  chiamate (lib/event-image.ts), non il motore. */
  immagini: ImmagineDa[];
  /** L'artista, già ripulito: serve a chi cerca la foto. */
  artista: string;
  /** Riempita dopo, da chi risolve la catena. null = si usa il gradiente. */
  foto?: string | null;
  /** La categoria per il gradiente di riserva. */
  categoria?: string;
}

/** "Ultimo — Stadio San Siro" → "Ultimo". Split semplice, niente NLP: se non
 *  si riconosce niente resta il titolo intero, che per una ricerca va bene. */
export function artistaDa(titolo: string): string {
  const t = (titolo ?? "").trim();
  const tagliato = t.split(/\s+[—–-]\s+|\s+\ba\b\s+/i)[0]?.trim();
  return tagliato && tagliato.length >= 2 ? tagliato : t;
}

/** Sempre la stessa frase per lo stesso evento: cambiarla a ogni refresh farebbe
 *  sembrare l'app nervosa. Hash stabile dell'id, non un random. */
function fraseStabile(id: string, quante: number): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  return n % Math.max(1, quante);
}

/**
 * IL MOTORE. Per ogni evento, per ogni riga configurata per il suo tipo: se
 * adesso siamo dentro la finestra e quel battito non è stato chiuso, è
 * candidato. Nessun `if` sul tipo: solo una lettura della tabella.
 */
export function battitiCandidati(eventi: EventoPerBattiti[], adesso = new Date()): Battito[] {
  const fuori: Battito[] = [];

  for (const e of eventi) {
    if (!e.datetime) continue;
    const quando = new Date(e.datetime).getTime();
    if (Number.isNaN(quando)) continue;

    // Qui sta tutta la conoscenza dei tipi che il motore ha: una lettura.
    const righe = BEATS[(e.type ?? "").toLowerCase()] ?? [];

    for (const riga of righe) {
      const ore = (adesso.getTime() - quando) / ORA;   // positivo = l'evento è passato
      if (ore < riga.daOre || ore > riga.aOre) continue;
      if (e.beats?.[riga.chiave] === "chiuso") continue;

      const ctx: Contesto = { titolo: e.title, artista: artistaDa(e.title) };
      if (riga.vale && !riga.vale(ctx)) continue;
      const frasi = riga.frasi;
      fuori.push({
        eventoId: e.id,
        chiave: riga.chiave,
        tipo: e.type,
        frase: frasi[fraseStabile(e.id, frasi.length)](ctx),
        azione: riga.azione(ctx),
        oraNotifica: riga.oraNotifica,
        stato: e.beats?.[riga.chiave] ?? null,
        freschezza: ore - riga.daOre,
        oreDaEvento: ore,
        immagini: riga.immagini,
        artista: ctx.artista,
      });
    }
  }

  // Il più fresco davanti: vince il battito la cui finestra si è aperta da meno.
  return fuori.sort((a, b) => a.freschezza - b.freschezza);
}

/** Uno solo, mai due: è la regola anti-spam della spec. null se non batte niente. */
export function battitoDiOggi(eventi: EventoPerBattiti[], adesso = new Date()): Battito | null {
  return battitiCandidati(eventi, adesso)[0] ?? null;
}

/**
 * Il battito da NOTIFICARE adesso, se c'è. Tre filtri sopra ai candidati:
 *  1. l'ora: ogni riga della tabella dice a che ora vuole essere notificata,
 *     e il motore non sa (né deve sapere) perché sia quella;
 *  2. mai visto: se il battito è già stato mostrato in home o chiuso, la
 *     notifica non parte — serve a chi l'app non l'ha aperta;
 *  3. mai notificato due volte.
 * Uno solo, il più fresco: il resto resta in home e basta.
 */
export function battitoDaNotificare(
  eventi: EventoPerBattiti[],
  oraDiRoma: string,
  adesso = new Date()
): Battito | null {
  return (
    battitiCandidati(eventi, adesso).find((b) => b.oraNotifica === oraDiRoma && b.stato === null) ?? null
  );
}

/** Quanto indietro e quanto avanti guardare: la finestra più larga della
 *  tabella (concerto, 37 giorni dopo) con un po' di margine. */
export const GIORNI_INDIETRO = 40;
export const GIORNI_AVANTI = 3;
export const FINESTRA_MS = { indietro: GIORNI_INDIETRO * GIORNO, avanti: GIORNI_AVANTI * GIORNO };
