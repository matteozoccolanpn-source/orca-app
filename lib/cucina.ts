// CUCINA — la testa della sezione (docs/SPEC-CUCINA.md).
//
// Qui sta quello che NON è presentazione e non è una chiamata di rete: come si
// legge il piano per mostrarlo, come si capisce una domanda, quale ricetta
// merita un "da rifare". La vista disegna, la rotta chiama: qui si decide.
//
// ────────────────────────────────────────────────────────────────────────────
// IL PALETTO LEGALE, che vale su ogni riga di questo file
//
// Questa sezione non parla mai col piano alimentare NEL CONTENUTO. Il piano si
// MOSTRA (che pasto viene, a che ora) e si ESEGUE. Le ricette vivono sotto,
// separate. Non esiste — e non deve nascere — una funzione che confronta una
// ricetta con un pasto del piano, che calcola calorie, o che suggerisce una
// ricetta "al posto di" qualcosa. Il piano è di un professionista (art. 348).
// ────────────────────────────────────────────────────────────────────────────

import type { DietMeal, DietWeek, RicettaEstratta } from "./supabase";

/* ══════════════ ① IL PIANO: che ora è, cosa viene adesso ══════════════ */

/* Gli orari NON stanno nel piano: il piano ha solo il nome del pasto e le
   opzioni (DietMeal = { pasto, opzioni }). Questa è la convenzione con cui si
   dispongono sulla giornata — serve alla striscia e al "tra quanto".
   È una CONVENZIONE DI VISUALIZZAZIONE, non un dato dell'utente e non un
   consiglio: nessuno gli sta dicendo a che ora deve mangiare. */
const ORARI: { chiavi: string[]; ora: string }[] = [
  { chiavi: ["colazione"], ora: "08:00" },
  { chiavi: ["spuntino"], ora: "10:30" },
  { chiavi: ["pranzo"], ora: "13:00" },
  { chiavi: ["merenda"], ora: "16:30" },
  { chiavi: ["cena"], ora: "20:00" },
  { chiavi: ["dopo cena", "dopocena"], ora: "22:00" },
];

/** L'ora convenzionale di un pasto dal suo nome. null se il nome non dice
 *  niente di riconoscibile: in quel caso il pasto resta nella lista ma senza
 *  posto nella giornata, e non si inventa un orario per farcelo stare. */
export function oraDelPasto(nome: string): string | null {
  const n = (nome ?? "").toLowerCase().trim();
  // "dopo cena" prima di "cena", altrimenti vince la sottostringa sbagliata.
  const ordinati = [...ORARI].sort(
    (a, b) => Math.max(...b.chiavi.map((c) => c.length)) - Math.max(...a.chiavi.map((c) => c.length))
  );
  for (const r of ordinati) if (r.chiavi.some((c) => n.includes(c))) return r.ora;
  return null;
}

/** La chiave del giorno di oggi come la usa il piano ("lun".."dom"). */
export function chiaveOggi(d = new Date()): string {
  return ["dom", "lun", "mar", "mer", "gio", "ven", "sab"][d.getDay()];
}

export type PastoDelGiorno = {
  pasto: string;
  /** La prima opzione: quello che si vede. Le altre restano nel piano. */
  testo: string;
  opzioni: string[];
  ora: string | null;
  /** minuti da adesso: negativo = è passato. null se il pasto non ha un'ora. */
  fraMinuti: number | null;
  passato: boolean;
  indice: number;
};

function minutiDa(ora: string, adesso: Date): number {
  const [h, m] = ora.split(":").map(Number);
  return (h * 60 + m) - (adesso.getHours() * 60 + adesso.getMinutes());
}

/** La giornata di oggi secondo il piano, in ordine di orario. [] se non c'è
 *  piano o se oggi è libero: chi non ha un piano non vede la zona ①. */
export function giornataDiOggi(week: DietWeek | null, adesso = new Date()): PastoDelGiorno[] {
  const meals: DietMeal[] = week?.[chiaveOggi(adesso)] ?? [];
  return meals
    .map((m, indice) => {
      const ora = oraDelPasto(m.pasto);
      const fraMinuti = ora ? minutiDa(ora, adesso) : null;
      return {
        pasto: m.pasto,
        testo: m.opzioni?.[0] ?? "",
        opzioni: m.opzioni ?? [],
        ora,
        fraMinuti,
        passato: fraMinuti !== null && fraMinuti < -30,
        indice,
      };
    })
    .sort((a, b) => (a.ora ?? "99:99").localeCompare(b.ora ?? "99:99"));
}

/** Il pasto da mettere nell'hero: il prossimo che deve ancora arrivare, o —
 *  se la giornata è finita — l'ultimo, che è ancora quello "di adesso" per
 *  chi cena tardi. null se oggi non c'è niente. */
export function prossimoPasto(giornata: PastoDelGiorno[]): PastoDelGiorno | null {
  if (giornata.length === 0) return null;
  return giornata.find((p) => !p.passato) ?? giornata[giornata.length - 1];
}

/** "tra 20 minuti", "tra 2 ore", "adesso", "stasera". Numeri precisi come
 *  chiede docs/UI-VOICE.md §3: mai "tra poco". */
export function quandoDetto(p: PastoDelGiorno): string {
  if (p.fraMinuti === null) return "dal tuo piano";
  const m = p.fraMinuti;
  if (m <= -30) return "era prima";
  if (m < 10 && m > -30) return "adesso";
  if (m < 60) return `tra ${m} minuti`;
  const ore = Math.round(m / 60);
  return ore === 1 ? "tra un'ora" : `tra ${ore} ore`;
}

/* ══════════════ ③ DA RIFARE: il battito della ricetta ══════════════ */

/* Perché non è una riga in BEATS. Il motore dei battiti (lib/battiti.ts) gira
   sugli EVENTI: le sue finestre sono ore relative a un evento datato, e la
   tabella è indicizzata per tipo di evento. Una ricetta non è un evento e non
   ha una data verso cui contare: ha un giorno in cui l'hai salvata. Farla
   passare di lì vorrebbe dire piegare il motore, e lib/battiti.ts non è fra i
   file che questo lavoro può toccare. Sta qui, con la stessa regola d'ingresso
   della spec: NIENTE AZIONE, NIENTE BATTITO — se non c'è una ricetta da
   riaprire, non si dice niente. */

export type Rifare = { id: string; titolo: string; giorni: number; volte: number };

/** La ricetta da riproporre: la più vecchia fra quelle salvate da almeno tre
 *  settimane. null se non ce n'è una — e allora la sezione non compare. */
export function daRifare(
  ricette: { id: string; title: string; createdAt: string; timesCooked?: number }[],
  adesso = new Date()
): Rifare | null {
  const GIORNI_MINIMI = 21;
  const candidate = ricette
    .map((r) => {
      const t = Date.parse(r.createdAt);
      if (isNaN(t)) return null;
      const giorni = Math.floor((adesso.getTime() - t) / 86_400_000);
      return { id: r.id, titolo: r.title, giorni, volte: r.timesCooked ?? 0 };
    })
    .filter((r): r is Rifare => r !== null && r.giorni >= GIORNI_MINIMI)
    .sort((a, b) => b.giorni - a.giorni);
  return candidate[0] ?? null;
}

/** "un mese", "tre settimane": il tempo detto come lo direbbe una persona. */
export function daQuanto(giorni: number): string {
  if (giorni >= 60) return `${Math.floor(giorni / 30)} mesi`;
  if (giorni >= 28) return "un mese";
  return `${Math.floor(giorni / 7)} settimane`;
}

/* ══════════════ ⑦ LA SPESA: cosa serve dal piano ══════════════ */

/* Il piano non ha un elenco di ingredienti: ha frasi scritte da un
   professionista per una persona ("Pasta 90g con sugo di peperoni e feta 100g
   + 2 cucchiaini olio EVO"). Qui si spezzano in cose da comprare.
   È un'AGGREGAZIONE SEMPLICE, e va detto quanto vale: separa sui connettori,
   stacca la quantità dal nome, butta le parole di servizio. Non capisce la
   cucina e non ci prova — niente modello, zero costi. Su una frase contorta
   può produrre una voce goffa: si può cancellare, ed è meglio di una voce
   inventata.

   PALETTO: da qui esce SOLO la spesa. Nessun conteggio, nessun giudizio, e il
   piano non viene mai riscritto — questa funzione legge e basta. */

/** Le unità che, attaccate a un numero, sono una quantità e non un cibo.
 *
 *  ⚠️ L'ORDINE CONTA, e non è estetica. In un'alternanza la regex prende la
 *  PRIMA che combacia, non la più lunga: con "cucchiai" davanti a "cucchiaini",
 *  «2 cucchiaini olio EVO» diventava la voce «olio EVO ni». Le più lunghe
 *  vanno prima, sempre — e "gr" prima di "g" per lo stesso motivo. */
const UNITA =
  "cucchiaini|cucchiaino|cucchiaio|cucchiai|confezione|porzioni|porzione|barattolo|vasetti|vasetto|scatola|pezzi|fette|fetta|q\\.?b\\.?|kg|gr|ml|cl|pz|g|l";

/** Parole che nel piano fanno da collante e non si comprano. */
const NON_SI_COMPRA = new Set([
  "e","o","con","senza","di","del","della","dei","delle","da","a","al","allo","alla","ai","agli","alle",
  "il","lo","la","i","gli","le","un","uno","una","in","su","per","circa","oppure","più","piu","scelta",
  "libera","facoltativo","facoltativa","opzionale","tipo","es","esempio","gusto","misto","mista","fresco",
  "fresca","integrale","magro","magra","light","condito","condita","cotto","cotta","crudo","cruda",
  // "secco"/"secca" NON stanno qui: "frutta secca" e "pomodori secchi" sono
  // cose che si comprano, e toglierli lasciava a scaffale una "frutta".
]);

export type VoceSpesa = { nome: string; quantita: string | null };

/** Una riga del piano → le cose da comprare che contiene. */
export function ingredientiDaPasto(testo: string): VoceSpesa[] {
  const pulito = (testo ?? "")
    .replace(/\([^)]*\)/g, " ")            // le parentesi sono note, non spesa
    // "0%", "30%": è una percentuale, non una quantità da mettere in lista.
    .replace(/\d+[.,]?\d*\s*%/g, " ");
  return pulito
    // I separatori veri del piano: + , ; / e le congiunzioni " e " / " con ".
    .split(/\s*[+,;/]\s*|\s+e\s+|\s+con\s+/i)
    .map((pezzo) => {
      // "yogurt greco O SKYR" offre un'alternativa, non una seconda cosa da
      // comprare: si tiene la prima, com'è già la regola per le opzioni del
      // pasto. Il taglio va fatto QUI, dentro il singolo pezzo: applicato a
      // tutta la frase si portava via anche gli ingredienti dopo il "+".
      let p = pezzo.split(/\s+o\s+/i)[0].trim();
      if (!p) return null;
      // La quantità: un numero con eventuale unità, in testa o in coda.
      let quantita: string | null = null;
      const q = p.match(new RegExp(`(\\d+[.,]?\\d*\\s*(?:${UNITA})?)`, "i"));
      if (q) {
        quantita = q[1].trim();
        p = p.replace(q[1], " ");
      }
      // Via le unità rimaste orfane e la punteggiatura.
      p = p
        .replace(new RegExp(`\\b(?:${UNITA})\\b`, "gi"), " ")
        .replace(/[^\p{L}\s'-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Via le parole di collante in testa e in coda.
      const parole = p.split(" ").filter((w) => w.length > 1 && !NON_SI_COMPRA.has(w.toLowerCase()));
      const nome = parole.join(" ").trim();
      if (nome.length < 3) return null;
      return { nome: nome.slice(0, 60), quantita: quantita && /\d/.test(quantita) ? quantita : null };
    })
    .filter((v): v is VoceSpesa => v !== null);
}

/** Due quantità dello stesso ingrediente, sommate — o null.
 *
 *  «Pollo 90g» il lunedì e «Pollo 100g» il giovedì fanno 190 g: è aritmetica su
 *  numeri che ha scritto la nutrizionista, ed è la cosa che serve davanti al
 *  banco. Diverso sarebbe «per te ne servono 150g», che è un consiglio e non si
 *  fa (blocco 9.2).
 *
 *  Si somma SOLO a unità identica. «2 cucchiaini» + «90 g» non fa niente, e
 *  nemmeno «cucchiaino» + «cucchiaini»: in quel caso torna null, cioè la voce
 *  resta senza quantità, esattamente com'era prima. Una somma sbagliata al
 *  supermercato è peggio di nessuna somma. */
export function sommaQuantita(a: string | null, b: string | null): string | null {
  if (!a || !b) return null;
  const pezzi = (s: string) => {
    const m = s.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    return m ? { n: parseFloat(m[1].replace(",", ".")), u: m[2].trim().toLowerCase() } : null;
  };
  const x = pezzi(a), y = pezzi(b);
  if (!x || !y || x.u !== y.u) return null;
  const tot = x.n + y.n;
  // 190 e non 190.0; 0,5 con la virgola, che è come si scrive in italiano.
  const num = Number.isInteger(tot) ? String(tot) : String(Math.round(tot * 100) / 100).replace(".", ",");
  return x.u ? `${num} ${x.u}` : num;
}

/** Tutta la settimana del piano → una lista senza doppioni.
 *  Due giorni con la cipolla fanno UNA voce (idea 209), e le quantità della
 *  stessa cosa si sommano quando l'unità è la stessa (vedi `sommaQuantita`).
 *  Prima qui la quantità si buttava via appena due giorni non combaciavano:
 *  la lista diceva «pollo» e basta, e quanto pollo lo dovevi cercare tu nel
 *  piano, giorno per giorno. */
export function spesaDalPiano(week: DietWeek | null): VoceSpesa[] {
  if (!week) return [];
  const per = new Map<string, VoceSpesa>();
  for (const giorno of Object.values(week)) {
    for (const pasto of giorno ?? []) {
      for (const opzione of (pasto.opzioni ?? []).slice(0, 1)) {   // solo l'opzione che si vede
        for (const v of ingredientiDaPasto(opzione)) {
          /* GUARDIA: una voce senza contenuto non entra in lista, qualunque
             sia la causa. Lo spezzettatore divide il testo del pasto sulla
             « e » — «pollo e zucchine» → pollo, zucchine — e su un testo
             scritto storto puo' produrre un pezzo vuoto o di soli spazi. Una
             riga vuota nella lista della spesa non si puo' comprare e non si
             puo' spuntare: e' solo rumore fra le mani, al supermercato.
             Visto con un piano di collaudo, ma vale per il piano vero il
             giorno che la nutrizionista scrive qualcosa di storto. */
          const nome = v.nome.trim();
          if (!nome) continue;
          const k = nome.toLowerCase();
          const gia = per.get(k);
          if (!gia) per.set(k, { ...v, nome });
          /* Anche quando sono UGUALI si somma, ed è il caso che conta: «pollo
             200g» tre volte nella settimana fa 600 g, che è l'esempio con cui
             il blocco 9.2 spiega cos'è aritmetica lecita. Prima due giorni
             uguali lasciavano scritto «200 g», e uno andava a comprarne un
             terzo di quello che gli serviva. */
          else gia.quantita = sommaQuantita(gia.quantita, v.quantita);
        }
      }
    }
  }
  return [...per.values()].slice(0, 60);
}

/** Il link di ricerca su Amazon Fresh per una voce. Niente prezzi, mai: è una
 *  ricerca, non un consiglio d'acquisto. Glovo non c'è perché non ha un URL di
 *  ricerca pubblico — e fingere che ce l'abbia sarebbe un link rotto. */
export function amazonFresh(nome: string): string {
  return `https://www.amazon.it/s?k=${encodeURIComponent(nome)}&i=amazonfresh`;
}

/* ══════════════ ⑨ IL TITOLO CORTO — si tronca dove si disegna ══════════════
 *
 * LA STORIA, perché non si ripeta. La ricerca faceva `.slice(0, 200)` sul
 * titolo, e per un video il titolo È LA DIDASCALIA INTERA. Quel testo tagliato
 * era anche l'unico che arrivava al modello per estrarre la ricetta: i passi
 * stavano dopo il duecentesimo carattere — «👉Procedimento: taglia il pollo a
 * bocconcini…» comincia al 400° — e non li abbiamo mai visti. Misurato il 16
 * agosto 2026: rimandando la didascalia intera, 5 video su 8 hanno i passi.
 * Tutti i titoli salvati fino a ieri sono lunghi 194-199 caratteri: tranciati
 * sullo stesso millimetro.
 *
 * LA REGOLA che ne esce, e vale oltre la Cucina: **si tronca dove si disegna,
 * mai dove si scrive.** Un taglio a monte è una decisione di impaginazione
 * scritta dentro il dato, e da lì non si torna indietro — il dato tagliato non
 * si ricostruisce.
 *
 * Qui il taglio serve davvero (una didascalia di 717 caratteri come titolo di
 * una card è illeggibile), ma fa una cosa sola: dà un nome corto alla card. La
 * didascalia intera resta dov'è, alla fonte, e chi estrae se la va a prendere.
 */

/** Dove finisce il nome del piatto e comincia il resto della didascalia. */
const FINE_TITOLO = [
  "\n",
  "🛒",
  "Ingredienti:", "INGREDIENTI:", "ingredienti:",
  "Procedimento", "PROCEDIMENTO",
  // I pallini che i creator usano per aprire l'elenco. `●` e `•` senza spazi
  // intorno perché si scrivono attaccati alla parola («●per uno stampo da
  // 24cm»), e con gli spazi non li prendeva.
  "●", "•", " · ", " | ",
];

/** Il nome corto da scrivere sulla card, da una didascalia qualsiasi.
 *
 *  Non «indovina» il piatto: taglia dove la didascalia stessa cambia discorso
 *  (a capo, «🛒Ingredienti:», un elenco puntato) e poi si ferma a 90 caratteri
 *  su una parola intera. Quello che resta è quasi sempre il nome del piatto,
 *  perché è così che i creator scrivono la prima riga. */
export function titoloCorto(testo: string, massimo = 90): string {
  let t = (testo ?? "").replace(/\r/g, "").trim();
  if (!t) return "";
  let taglio = t.length;
  for (const spia of FINE_TITOLO) {
    const i = t.indexOf(spia);
    // Non si taglia a due caratteri dall'inizio: una didascalia che comincia
    // con «🛒» non deve produrre un titolo vuoto.
    if (i > 12 && i < taglio) taglio = i;
  }
  t = t.slice(0, taglio).trim();
  // Via gli hashtag in coda: sono etichette, non nome del piatto.
  t = t.replace(/(?:\s+#[\p{L}\p{N}_]+)+\s*$/gu, "").trim();
  if (t.length <= massimo) return t || testo.trim().slice(0, massimo);
  const corto = t.slice(0, massimo);
  const spazio = corto.lastIndexOf(" ");
  return (spazio > massimo * 0.6 ? corto.slice(0, spazio) : corto).trim() + "…";
}

/* ══════════════ ⑩ C'È UN PROCEDIMENTO QUI DENTRO? ══════════════
 *
 * Serve al filtro della ricerca: si mostrano solo i risultati da cui i passi si
 * riescono a tirare fuori, e per un video quel giudizio va dato **sulla
 * didascalia, gratis**. Chiederlo a un modello per ogni risultato costerebbe
 * mezzo centesimo a card, cioè più della ricetta stessa.
 *
 * TARATA il 16 agosto 2026 sugli otto video veri del ricettario, contro la
 * verità data dal modello: **azzecca 8 su 8**.
 *
 * ⚠️ IL SUO ERRORE È PER DIFETTO, ed è quello che conta sapere: cinque positivi
 * su cinque li ha presi la sola parola «procedimento». Una didascalia che i
 * passi ce li ha ma non la scrive — «metto tutto in padella, poi aggiungo la
 * panna» — qui risulta senza. Per questo il filtro non finisce qui: quello che
 * questa regola scarta passa dalla ripesca (una chiamata sola a Haiku), che può
 * solo RIMETTERE DENTRO. Un falso negativo, senza quella, sarebbe invisibile:
 * chi cerca non sa cosa non gli è stato mostrato.
 */

/** Le RADICI dei verbi con cui comincia un'istruzione di cucina.
 *
 *  Radici e non parole intere, perché una ricetta italiana scrive la stessa
 *  istruzione in tre modi — «monta il burro», «montare il burro», «montate il
 *  burro» — e una lista di sole forme all'imperativo ne perde due su tre. È
 *  successo davvero: la crostata alla Nutella ha nove passi scritti
 *  all'infinito, e la prima versione di questa regola non ne vedeva nemmeno
 *  uno. */
const RADICI_CUCINA = [
  "tagli", "cuoc", "mett", "aggiung", "mescol", "frull", "inforn", "scald", "vers", "sbatt",
  "impast", "unisc", "unir", "cond", "sciogl", "mont", "spennell", "lasc", "cosparg", "serv",
  "scol", "mantec", "farc", "pieg", "frigg", "rosol", "soffrigg", "sbucc", "trit", "grattug",
  "stend", "arrotol", "dispon", "copr", "ammoll", "strizz", "form", "spolver", "decor",
  "ripon", "raffredd", "marin", "amalgam", "emulsion", "guarn", "sform", "riscald", "abbass",
  "bagn", "spegn", "accend", "trasfer", "avvolg", "lavor", "sal",
];
const VERBO_IN_TESTA = new RegExp(
  `^(?:${RADICI_CUCINA.join("|")})(?:a|are|ate|i|ire|ite|isci|ete|ere|iamo)\\b`,
  "i"
);

/** Le frasi di un testo, ripulite di quello che le precede.
 *  Si spezza anche sui DUE PUNTI: «👉Procedimento: taglia il pollo» è una riga
 *  sola, e senza quel taglio l'istruzione non si vede — comincia con l'emoji e
 *  con la parola «procedimento», non con «taglia». */
function frasiDi(testo: string): string[] {
  return testo
    .split(/[.!?\n·•/:;]+/)
    .map((s) => s.replace(/^[^\p{L}]+/gu, "").trim())
    .filter(Boolean);
}

/** La didascalia contiene un procedimento?
 *
 *  TARATA il 16-18 agosto 2026 su NOVE casi veri — gli otto video del
 *  ricettario più i due falsi positivi trovati premendo — e li azzecca tutti.
 *  I due casi che hanno insegnato qualcosa, e sono il motivo della forma
 *  contorta qui sotto:
 *
 *  · «★ INGREDIENTI, DOSI e PROCEDIMENTO: https://…» — la parola c'è, ma è
 *    l'etichetta di un link. Passi zero;
 *  · «La preparazione della parmigiana richiede tempo e pazienza…» — un
 *    articolo in prosa che RACCONTA la preparazione in terza persona. Da
 *    leggere è bello, da cucinare è inservibile.
 *
 *  Da qui la regola: **la parola da sola non basta mai.** Vale un elenco
 *  numerato, valgono due frasi che cominciano con un verbo di cucina, e vale
 *  la parola SE accompagnata da almeno un'istruzione vera. */
export function haPassi(testo: string): { ok: boolean; perche: string } {
  const t = (testo ?? "").toLowerCase();
  if (!t.trim()) return { ok: false, perche: "didascalia vuota" };

  const numerate = (t.match(/(?:^|\n|\s)([1-9])[.)°]\s+\S/g) ?? []).length;
  if (numerate >= 2) return { ok: true, perche: `${numerate} righe numerate` };

  const istruzioni = frasiDi(t).filter((f) => VERBO_IN_TESTA.test(f)).length;
  if (istruzioni >= 2) return { ok: true, perche: `${istruzioni} istruzioni` };

  const parola = /\b(procedimento|preparazione|istruzioni|passaggi)\s*:/.test(t) || /come si (fa|prepara)/.test(t);
  if (parola && istruzioni >= 1) return { ok: true, perche: "lo dice e lo fa vedere" };

  return { ok: false, perche: parola ? "la parola c'è ma nessuna istruzione" : "solo ingredienti, o niente" };
}

/* ══════ ①bis IL LINK ALLA RICETTA SCRITTA, DENTRO LA DIDASCALIA ══════
 *
 * Un creator che ha anche un sito lo mette in descrizione, e spessissimo ci
 * mette proprio la ricetta per esteso:
 *
 *     ★ INGREDIENTI, DOSI e PROCEDIMENTO: https://ricette.giallozafferano.it/…
 *
 * Quel testo lo leggiamo già per intero e gratis (`app/api/cucina/didascalia.ts`).
 * Cercarci dentro un indirizzo costa zero, e la pagina che sta dall'altra parte
 * quasi sempre ha il marcatore standard: i passi arrivano SCRITTI DALL'AUTORE,
 * senza chiamare nessun modello.
 *
 * Il lavoro vero di questa funzione è SCARTARE. Nella descrizione della crostata
 * al pan di zenzero ci sono nove indirizzi: uno è la ricetta, gli altri otto
 * sono l'iscrizione al canale (tre volte, accorciata), la home del sito e cinque
 * social. Andarseli a prendere tutti sarebbe tempo buttato; prendere quello
 * sbagliato sarebbe peggio, perché i passi finirebbero attaccati a una ricetta
 * che non è quella.
 *
 * ⚠️ Questo dice solo QUALI INDIRIZZI PROVARE. Che la ricetta trovata sia
 * davvero la stessa lo decide il controllo sugli ingredienti (PARTE C): finché
 * quello non c'è, questa strada si percorre solo quando la didascalia i passi
 * non ce li ha — vedi `app/api/cucina/estrai/route.ts`.
 */

/** Domini dove non c'è mai una ricetta scritta da andare a leggere. */
const FUORI_STRADA_HOST = [
  // dove la ricetta è parlata, non scritta — e dove il marcatore non c'è mai
  "tiktok.com", "youtube.com", "youtu.be", "instagram.com", "facebook.com", "fb.watch",
  "twitter.com", "x.com", "pinterest.", "threads.", "linkedin.com", "snapchat.com",
  "twitch.tv", "reddit.com", "t.me", "whatsapp.com", "telegram.",
  // negozi, affiliazioni, codici sconto
  "amazon.", "amzn.", "ebay.", "aliexpress.", "paypal.", "gumroad.com", "patreon.com",
  "shopify.com", "etsy.com", "awin1.com", "shrsl.com", "tidd.ly", "sponsor",
  // le pagine-vetrina dei link: dentro c'è tutto tranne una ricetta
  "linktr.ee", "beacons.ai", "bio.link", "linkin.bio", "campsite.bio",
  /* «Scarica la mia app»: un negozio di applicazioni ha il marcatore (di una
     app, non di una ricetta) e ci si perde una richiesta a vuoto. Visto: quattro
     video di Benedetta su sei linkano `apple.co`. */
  "apps.apple.com", "apple.co", "play.google.com", "itunes.apple.com",
  /* Gli accorciatori: dietro c'è quasi sempre un'iscrizione o una promozione, e
     per saperlo bisognerebbe seguirli uno a uno. Non vale il viaggio — e sono
     esattamente i tre link che GialloZafferano mette prima di quello buono. */
  "bit.ly", "tinyurl.com", "goo.gl", "ow.ly", "t.co", "rb.gy", "cutt.ly", "is.gd",
  "buff.ly", "lnk.to", "shorturl.at", "rebrand.ly",
];

/** Pezzi di percorso che dicono «qui si compra o ci si iscrive, non si cucina». */
const FUORI_STRADA_PEZZO = new Set([
  "shop", "store", "negozio", "checkout", "carrello", "cart", "sconto", "sconti",
  "coupon", "promo", "abbonati", "iscriviti", "newsletter", "corso", "corsi",
  "ebook", "login", "signup", "registrati", "privacy", "cookie",
]);

/** Le parole che, nell'indirizzo o nella riga che lo introduce, dicono che di
 *  là c'è una ricetta. */
const SPIA_RICETTA = /ricett|recipe|preparazion|procediment|ingredient|dosi/i;

/** Gli indirizzi da provare, dentro una didascalia — i più promettenti davanti.
 *
 *  Non torna «tutti i link»: torna al massimo tre, già ripuliti e già scartati
 *  quelli che non possono essere una ricetta. Chi chiama li prova in quest'ordine
 *  (o tutti insieme, e tiene il primo che risponde). */
export function linkDaDidascalia(testo: string, massimo = 3): string[] {
  const t = (testo ?? "").replace(/\r/g, "");
  if (!t.trim()) return [];

  const visti = new Set<string>();
  const candidati: { url: string; punti: number }[] = [];

  for (const m of t.matchAll(/https?:\/\/[^\s<>"'`\])}]+/gi)) {
    // La punteggiatura di fine frase resta attaccata all'indirizzo: «…zenzero.html.»
    const grezzo = m[0].replace(/[.,;:!?…»"')\]]+$/, "");
    let u: URL;
    try {
      u = new URL(grezzo);
    } catch {
      continue;
    }
    const chiave = u.href.toLowerCase();
    if (visti.has(chiave)) continue;
    visti.add(chiave);

    const host = u.hostname.toLowerCase();
    if (FUORI_STRADA_HOST.some((h) => host.includes(h))) continue;

    const pezzi = u.pathname.split("/").filter(Boolean);
    // La sola home di un sito non è una ricetta: è il sito.
    if (pezzi.length === 0) continue;
    if (pezzi.some((p) => FUORI_STRADA_PEZZO.has(p.toLowerCase()))) continue;
    // Immagini, PDF, fogli: non hanno marcatore e pesano.
    if (/\.(jpe?g|png|gif|webp|pdf|zip|mp4|mp3)$/i.test(u.pathname)) continue;

    /* I punti servono all'ORDINE, non a decidere chi entra: un blog con un
       indirizzo strano («/2024/12/07/») resta in lista, va solo dopo. */
    const ultimo = pezzi[pezzi.length - 1].replace(/\.\w{2,5}$/, "");
    // Le ottanta battute che precedono il link: è lì che sta l'etichetta
    // («★ INGREDIENTI, DOSI e PROCEDIMENTO:») quando c'è.
    const prima = t.slice(Math.max(0, m.index - 80), m.index);
    const punti =
      (SPIA_RICETTA.test(host) || SPIA_RICETTA.test(u.pathname) ? 3 : 0) +
      // uno slug fatto di parole: «Crostata-pan-di-zenzero», «torta_di_mele»
      (/^[\p{L}\d]+([-_][\p{L}\d]+){1,}$/u.test(ultimo) ? 2 : 0) +
      (SPIA_RICETTA.test(prima) ? 2 : 0);
    candidati.push({ url: u.href, punti });
  }

  return candidati
    .sort((a, b) => b.punti - a.punti)
    .slice(0, massimo)
    .map((c) => c.url);
}

/* ══════════════ ⑧ IL MARCATORE STANDARD — la ricetta già scritta ══════════════
 *
 * Quasi tutti i blog di cucina pubblicano `schema.org/Recipe` in JSON-LD: dentro
 * ci sono ingredienti, passi, tempo e porzioni GIÀ STRUTTURATI, messi lì
 * dall'autore perché Google li mostri. Leggerli non è capire una ricetta: è
 * copiare dei campi. **Quando il marcatore c'è ed è completo, il modello non si
 * chiama proprio** — costo zero, e nessun rischio che qualcuno riscriva un passo.
 *
 * MISURATO il 15 agosto 2026, su tre ricerche vere di Tavily senza domini
 * scelti a mano (40 pagine in tutto):
 *   «pasta zucchine»        → 4 complete su 13 pagine
 *   «polpette al forno»     → 6 complete su 13
 *   «cena veloce proteica»  → 0 complete su 14
 * Cioè: quando si cerca un PIATTO il marcatore c'è su un terzo/metà dei
 * risultati; quando si cerca una CATEGORIA tornano riviste e siti di
 * integratori, e non c'è niente da leggere. Per quelle resta la strada di
 * prima — il video e la sua didascalia.
 *
 * 🚫 NON CI SI FIDA ALLA CIECA. `recipeInstructions` a volte è una riga sola di
 * prosa («Fate cuocere e servite»): non sono passi, e salvarla come tale
 * riempirebbe «Cucina con Keiko» di passi finti. Meglio ricadere sul modello.
 */

/* Il marcatore è HTML: dentro i campi ci finiscono le entità così come stanno.
 * «Cannella in polvere &frac12; cucchiaino» è la riga vera della crostata al pan
 * di zenzero su GialloZafferano, e senza questo passaggio arrivava sullo schermo
 * scritta proprio così — sette caratteri di spazzatura al posto di «½», in una
 * dose, cioè nel punto dove chi cucina guarda. Le entità si sciolgono qui, dove
 * si legge il marcatore: a valle nessuno deve più saperne niente. */
const ENTITA: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…",
  ndash: "–", mdash: "—", middot: "·", bull: "•", deg: "°", euro: "€",
  frac12: "½", frac14: "¼", frac34: "¾", frac13: "⅓", frac23: "⅔",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
  agrave: "à", egrave: "è", eacute: "é", igrave: "ì", ograve: "ò", ugrave: "ù",
};

/** Il testo di un campo del marcatore: senza tag e con le entità sciolte. */
function senzaHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]{1,9});/gi, (intero, nome: string) => {
      if (nome[0] === "#") {
        const n = nome[1]?.toLowerCase() === "x" ? parseInt(nome.slice(2), 16) : parseInt(nome.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : intero;
      }
      // Un'entità che non conosciamo si lascia com'è: meglio «&hearts;» sullo
      // schermo che un buco dentro una dose.
      return ENTITA[nome.toLowerCase()] ?? intero;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Una durata ISO 8601 come la scrive schema.org (`PT1H20M`) → «1 h 20 min».
 *  È una conversione di formato di un valore scritto, non un'invenzione: se non
 *  è una durata riconoscibile torna null e il campo resta vuoto. */
export function durataLeggibile(v: unknown): string | null {
  const s = String(v ?? "").trim();
  const m = s.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  const giorni = Number(m[1] ?? 0), ore = Number(m[2] ?? 0), minuti = Number(m[3] ?? 0);
  const tot = giorni * 1440 + ore * 60 + minuti;
  if (tot <= 0) return null;
  if (tot < 60) return `${tot} min`;
  const h = Math.floor(tot / 60), r = tot % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

/** Una riga di `recipeIngredient` («320 g di pasta») nei due campi che il foglio
 *  mostra. Si stacca SOLO una quantità in testa: quello che resta è il nome, per
 *  intero. Niente si perde e niente si deduce — se non c'è un numero davanti,
 *  la riga è tutta nome e la quantità resta vuota. */
export function separaQuantita(riga: string): { nome: string; quantita?: string } {
  const t = riga.replace(/\s+/g, " ").trim();
  // numero (anche 1/2, 1,5, ½) + eventuale unità + eventuale "di"
  const m = t.match(
    new RegExp(`^((?:\\d+[.,]?\\d*|\\d*\\s*[½¼¾⅓⅔])(?:\\s*[-–/]\\s*\\d+[.,]?\\d*)?\\s*(?:${UNITA})?)\\s+(?:di\\s+|d'\\s*)?(.+)$`, "i")
  );
  if (!m) return { nome: t.slice(0, 120) };
  const quantita = m[1].replace(/\s+/g, " ").trim();
  const nome = m[2].trim();
  // «2 uova» → nome «uova», quantità «2». Ma «500 g» da solo non è un nome:
  // in quel caso si tiene la riga intera, che almeno si legge.
  if (nome.length < 2) return { nome: t.slice(0, 120) };
  return { nome: nome.slice(0, 120), quantita: quantita.slice(0, 60) };
}

/** I passi dentro `recipeInstructions`, in tutte le forme che schema.org
 *  ammette: stringa, elenco di stringhe, `HowToStep`, `HowToSection` con dentro
 *  gli step. Una stringa unica si spezza sui punti fermi e vale solo se ne
 *  escono almeno due frasi vere — sennò è prosa, non procedimento. */
export function passiDalMarcatore(v: unknown): string[] {
  const dentro = (x: unknown): string[] => {
    if (!x) return [];
    if (typeof x === "string") {
      const s = senzaHtml(x);
      if (!s) return [];
      const frasi = s.split(/(?<=[.!?])\s+/).map((p) => p.trim()).filter((p) => p.length > 25);
      return frasi.length >= 2 ? frasi : [s];
    }
    if (Array.isArray(x)) return x.flatMap(dentro);
    const o = x as Record<string, unknown>;
    if (o["@type"] === "HowToSection") return dentro(o.itemListElement ?? o.steps);
    if (typeof o.text === "string") return dentro(o.text);
    if (typeof o.name === "string") return dentro(o.name);
    return [];
  };
  return dentro(v).map((p) => p.slice(0, 400)).filter(Boolean).slice(0, 30);
}

/** Gli oggetti JSON-LD di una pagina, srotolando `@graph`. */
function oggettiJsonLd(html: string): Record<string, unknown>[] {
  const fuori: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const d = JSON.parse(m[1].trim().replace(/^﻿/, ""));
      for (const x of Array.isArray(d) ? d : [d]) {
        const o = x as Record<string, unknown>;
        if (Array.isArray(o?.["@graph"])) fuori.push(...(o["@graph"] as Record<string, unknown>[]));
        else if (o) fuori.push(o);
      }
    } catch {
      /* JSON-LD scritto storto: capita, e vale come «non c'è». */
    }
  }
  return fuori;
}

/** Chi ha scritto la ricetta secondo il marcatore (`author.name`). Serve al
 *  cancello del gradino ④ (`creatorCoincide`): lì la pagina la troviamo noi, e
 *  può essere di chiunque — sapere chi l'ha firmata è quello che permette di
 *  distinguere «la versione scritta di QUESTO video» da «la stessa ricetta
 *  fatta da un altro». */
function autoreDa(r: Record<string, unknown>): string | null {
  const nomeDi = (v: unknown): string | null => {
    if (!v) return null;
    if (typeof v === "string") return v;
    if (Array.isArray(v)) { for (const x of v) { const n = nomeDi(x); if (n) return n; } return null; }
    const o = v as Record<string, unknown>;
    return typeof o.name === "string" ? o.name : null;
  };
  const n = nomeDi(r.author);
  return n ? senzaHtml(n).slice(0, 120) : null;
}

/** La foto che l'autore ha messo NEL marcatore. È la stessa cosa che fa
 *  l'oEmbed per i video: l'immagine che la pagina pubblica per essere mostrata
 *  altrove. Nessuno scraping — è un campo dichiarato. */
function immagineDa(r: Record<string, unknown>): string | null {
  const primo = (v: unknown): string | null => {
    if (!v) return null;
    if (typeof v === "string") return v.startsWith("http") ? v : null;
    if (Array.isArray(v)) { for (const x of v) { const u = primo(x); if (u) return u; } return null; }
    const o = v as Record<string, unknown>;
    return primo(o.url ?? o.contentUrl ?? null);
  };
  return primo(r.image)?.slice(0, 500) ?? null;
}

/** La pagina letta dal suo marcatore: la ricetta strutturata e la foto.
 *
 *  `estratta` ha la STESSA forma dell'estrazione col modello, così a valle
 *  niente si accorge da dove viene: il foglio, la spesa e «Cucina con Keiko»
 *  funzionano identici. Quello che cambia è che questa non è costata niente.
 *
 *  `estratta` è null anche quando il marcatore c'è ma è povero: sotto i tre
 *  ingredienti o i due passi si ricade sul modello, che almeno legge la
 *  didascalia. La foto invece si tiene lo stesso: serve alla card.
 *
 *  `nome` è il titolo che l'autore ha dato ALLA RICETTA (`recipeName`), e
 *  `autore` chi l'ha firmata (`author.name`): servono ai due cancelli della
 *  PARTE C (`nomeCombacia`, `creatorCoincide`), e solo a quello — non entrano
 *  in `RicettaEstratta` e non si salvano da nessuna parte, perché chi chiama
 *  decide PRIMA di salvare se questa è la ricetta giusta. */
export function leggiPaginaRicetta(
  html: string
): { estratta: RicettaEstratta | null; immagine: string | null; nome: string | null; autore: string | null } {
  const eRicetta = (o: Record<string, unknown>) => {
    const t = o?.["@type"];
    return Array.isArray(t) ? t.includes("Recipe") : t === "Recipe";
  };
  const r = oggettiJsonLd(html).find(eRicetta);
  if (!r) return { estratta: null, immagine: null, nome: null, autore: null };
  const immagine = immagineDa(r);
  const nome = typeof r.name === "string" ? senzaHtml(r.name).slice(0, 200) || null : null;
  const autore = autoreDa(r);

  const ingredienti = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : [])
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => separaQuantita(senzaHtml(x)))
    .filter((i) => i.nome.length > 0)
    .slice(0, 40);
  const passi = passiDalMarcatore(r.recipeInstructions);

  // La soglia è quella dell'estrazione: sotto, non è una ricetta.
  if (ingredienti.length < 3 || passi.length < 2) return { estratta: null, immagine, nome, autore };

  const porzioni = (() => {
    const v = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield;
    const s = String(v ?? "").trim().slice(0, 40);
    if (!s) return null;
    // `recipeYield: "4"` vuol dire quattro porzioni: è il significato del campo,
    // non una parola aggiunta da noi. Al singolare si scrive «1 porzione».
    if (!/^\d+$/.test(s)) return s;
    return s === "1" ? "1 porzione" : `${s} porzioni`;
  })();

  return {
    estratta: {
      ingredienti,
      passi,
      tempo: durataLeggibile(r.totalTime) ?? durataLeggibile(r.cookTime) ?? null,
      porzioni,
    },
    immagine,
    nome,
    autore,
  };
}

/** La sola ricetta, per chi non ha bisogno della foto. */
export function leggiMarcatoreRicetta(html: string): RicettaEstratta | null {
  return leggiPaginaRicetta(html).estratta;
}

/* ══════ PARTE C — IL CONTROLLO CHE RENDE ONESTI ①bis E ④ ══════
 *
 * Quando i passi arrivano da una pagina che NON è quella del video — un link
 * in didascalia (①bis) o un risultato di ricerca (④) — prima di attaccarli
 * bisogna sapere che sono la ricetta GIUSTA, non quella di un altro piatto o
 * di un'altra ricetta dello stesso creator.
 *
 * LA PRIMA VERSIONE, SCARTATA il 20 agosto 2026: «gli ingredienti devono
 * combaciare» — una percentuale di quanti ingredienti della pagina sono
 * nominati nella didascalia. Misurata sui casi veri, le due distribuzioni si
 * sovrappongono e non lasciano spazio a una soglia:
 *
 *  · la ricetta GIUSTA della crostata al pan di zenzero, presa dal link che il
 *    creator stesso ha messo, fa 0%: la sua didascalia elenca solo le tappe
 *    del video («00:45 – STESURA FROLLA»), non un ingrediente;
 *  · due dolci DIVERSI dello stesso creator (ciambella e torta di mele di
 *    Benedetta) fanno 81%: condividono uova, farina, zucchero, lievito — ogni
 *    dolce li ha.
 *
 * Quello che separa davvero è il NOME DEL PIATTO. «Crostata pan di zenzero»
 * combacia col titolo del suo video sulle parole «crostata» e «zenzero»;
 * «Torta di mele» non combacia con «Ciambella soffice» su NESSUNA parola,
 * anche se vengono dallo stesso canale.
 *
 * DUE DETTAGLI, ed erano quelli che rompevano il confronto ingenuo:
 *  1. IL NOME DEL CREATOR SI TOGLIE da tutte e due le parti PRIMA di
 *     confrontare. Senza, «Torta di mele di Benedetta» combacia con «…Fatto
 *     in Casa da Benedetta» sulla parola «Benedetta» — cioè il caso più
 *     pericoloso passerebbe sull'unica parola che non prova niente;
 *  2. SI CONFRONTA LA RADICE a cinque lettere, non la parola intera:
 *     «pomodorini» e «pomodori ciliegini» non sono la stessa parola ma sono lo
 *     stesso ingrediente, e la radice `pomod` li fa combaciare.
 *
 * LA SOGLIA, misurata sugli otto casi veri (quattro coppie giuste, quattro
 * sbagliate): le giuste stanno al 100%, le sbagliate a 50/0/0/0. Il 50% è
 * «Chicken wrap» contro «Pollo al curry» — condividono «pollo», che è un
 * ingrediente e non un piatto — e i DUE TERZI lo fermano senza toccare le
 * giuste. */

/** Parole che non caratterizzano nessun piatto: dire che due nomi le hanno in
 *  comune non prova niente. Include i connettivi corti che il taglio a
 *  quattro lettere lascerebbe passare («alla», «come», «alle»…). */
const SERVIZIO_NOME = new Set([
  "ricetta", "ricette", "facile", "facilissima", "veloce", "veloci", "semplice",
  "senza", "fatto", "fatta", "casa", "come", "della", "delle", "degli", "dello",
  "alla", "allo", "alle", "agli", "con", "del", "nel", "nella", "sulla", "sullo",
  "buona", "buono", "originale", "originali", "classica", "classico", "video",
  "light", "kcal", "perfetta", "perfetto", "nuova", "nuovo", "super", "vera",
  "tutorial", "spiegazione", "spiegazioni",
]);

/** Le radici caratterizzanti di un testo — parole di almeno quattro lettere,
 *  ripulite di quelle di servizio e di quelle passate in `escluse` (di solito
 *  il nome del creator, vedi sopra). Confrontiamo il PREFISSO a cinque
 *  lettere: è la stessa idea dello stemming, fatta con una riga invece che
 *  con un dizionario. */
function radiciCaratterizzanti(testo: string, escluse: Set<string> = new Set()): Set<string> {
  return new Set(
    (testo ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !SERVIZIO_NOME.has(w))
      .map((w) => w.slice(0, 5))
      .filter((w) => !escluse.has(w))
  );
}

export type Combaciano = { ok: boolean; comuni: string[]; quota: number };

/** IL CANCELLO: i passi trovati altrove sono di QUESTA ricetta?
 *
 *  `nomeRicetta` è il nome come lo dice la fonte dei passi (di solito
 *  `recipeName` del marcatore); `titoloVideo` è il titolo o la didascalia del
 *  video che si sta guardando; `creator` è chi ha pubblicato — si toglie da
 *  tutte e due le parti prima del confronto, per il motivo spiegato sopra.
 *
 *  Se il nome della ricetta non ha nemmeno una parola caratterizzante (perché
 *  la pagina ha un titolo generico, o vuoto) il cancello NON PASSA A SCATOLA
 *  CHIUSA: senza niente da cui giudicare, l'onesto è dire che non si sa. */
export function nomeCombacia(nomeRicetta: string, titoloVideo: string, creator?: string | null): Combaciano {
  const escluse = creator ? radiciCaratterizzanti(creator) : new Set<string>();
  const a = radiciCaratterizzanti(nomeRicetta, escluse);
  const b = radiciCaratterizzanti(titoloVideo, escluse);
  if (a.size === 0) return { ok: false, comuni: [], quota: 0 };
  const comuni = [...a].filter((w) => b.has(w));
  return { ok: comuni.length / a.size >= 2 / 3, comuni, quota: comuni.length / a.size };
}

/** IL SECONDO CANCELLO, solo per ④: il creator combacia?
 *
 *  Nel ①bis il link ce l'ha messo il creator stesso nella sua didascalia: il
 *  rischio massimo è «un'altra ricetta sua», ed è quello che `nomeCombacia` da
 *  solo governa. Nel ④ la pagina la troviamo NOI cercando sul web, e può
 *  essere di chiunque cucini lo stesso piatto — quindi lì il nome del piatto
 *  non basta: deve combaciare ANCHE chi l'ha scritta, perché ④ cerca *la
 *  versione scritta di questo video*, non una versione qualsiasi.
 *
 *  Si accetta se il creator compare nella firma della pagina (`author.name`
 *  del marcatore) o nel suo dominio: un blog personale porta quasi sempre il
 *  nome nell'indirizzo. Senza un nome di creator con cui confrontare, NON SI
 *  PASSA A SCATOLA CHIUSA — è la stessa scelta di `nomeCombacia`. */
export function creatorCoincide(creatorVideo: string | null | undefined, autorePagina: string | null, urlPagina: string): boolean {
  if (!creatorVideo) return false;
  const a = radiciCaratterizzanti(creatorVideo);
  if (a.size === 0) return false;
  if (autorePagina && [...a].some((w) => radiciCaratterizzanti(autorePagina).has(w))) return true;
  try {
    const host = new URL(urlPagina).hostname.toLowerCase().replace(/^www\./, "");
    if ([...a].some((w) => w.length >= 4 && host.includes(w))) return true;
  } catch {
    /* url storto: non si passa lo stesso */
  }
  return false;
}

/** Le radici che, sole, non distinguono niente: stanno in ogni ricetta e
 *  contarle come le altre gonfierebbe il punteggio di qualunque pagina. */
const INGREDIENTE_GENERICO = new Set([
  "sale", "pepe", "olio", "acqua", "zucch", "farin", "uova", "uovo", "latte",
  "lievi", "burro", "vanig", "semol", "bicar", "amido",
]);

/** Quanto una pagina «suona» come il testo del video, contando gli
 *  ingredienti — SOLO PER ORDINARE quando ①bis o ④ hanno più candidati, MAI
 *  per bocciare: misurato che la pagina GIUSTA può stare al 9%, quando il
 *  creator scrive «ricetta completa qui» senza elencare nulla. Chi boccia è
 *  sempre e solo `nomeCombacia`. */
export function puntiIngredienti(ingredienti: string[], testoDaCercare: string): number {
  const testo = radiciCaratterizzanti(testoDaCercare);
  let peso = 0;
  let trovato = 0;
  for (const ing of ingredienti) {
    const parole = [...radiciCaratterizzanti(ing)];
    if (parole.length === 0) continue;
    const generico = parole.every((w) => INGREDIENTE_GENERICO.has(w));
    const p = generico ? 0.25 : 1;
    peso += p;
    if (parole.some((w) => testo.has(w))) trovato += p;
  }
  return peso > 0 ? trovato / peso : 0;
}

/* ══════════════ ② L'INTERPRETE DELLA DOMANDA ══════════════ */

/* Due strade, e la prima è gratis.
   "pollo e patate" sono già parole di ricerca: mandarle a un modello per farsi
   restituire "pollo e patate" sarebbe pagare per niente. Solo quando la frase
   descrive una SITUAZIONE ("serata tra amici per la partita") serve qualcuno
   che la traduca in cibo.
   L'euristica sbaglia in una direzione sola, per costruzione: nel dubbio manda
   al modello (che costa 1) invece di cercare parole che non sono cibo. */

/** Parole che, da sole, sono già una ricerca di cucina. Non è un database
 *  nutrizionale e non deve diventarlo: è l'elenco delle cose che si scrivono
 *  quando si guarda dentro il frigo. */
const CIBI = new Set([
  "pollo","tacchino","manzo","vitello","maiale","salsiccia","prosciutto","speck","bacon","guanciale",
  "pancetta","wurstel","carne","macinato","polpette","hamburger","bistecca","arrosto","spezzatino",
  "pesce","salmone","tonno","merluzzo","branzino","orata","gamberi","gamberetti","calamari","cozze",
  "vongole","polpo","seppie","acciughe","baccala","stoccafisso",
  "uova","uovo","frittata","omelette","albume",
  "pasta","spaghetti","penne","fusilli","rigatoni","lasagne","gnocchi","risotto","riso","orzo","farro",
  "quinoa","cous","couscous","polenta","pane","pizza","focaccia","piadina","tortilla","wrap","panino",
  "patate","patata","zucchine","zucchina","melanzane","melanzana","peperoni","peperone","pomodori",
  "pomodoro","cipolla","cipolle","aglio","carote","carota","sedano","spinaci","broccoli","cavolfiore",
  "cavolo","verza","funghi","porcini","piselli","fagioli","ceci","lenticchie","fave","asparagi",
  "carciofi","zucca","finocchi","radicchio","rucola","insalata","lattuga","mais","olive","capperi",
  "formaggio","mozzarella","parmigiano","pecorino","ricotta","mascarpone","gorgonzola","provola",
  "scamorza","stracchino","burrata","feta","philadelphia","yogurt","latte","panna","burro","uova",
  "limone","limoni","arancia","arance","mela","mele","pera","pere","banana","banane","fragole",
  "pesche","albicocche","ciliegie","frutta","avocado","cocco","mandorle","noci","nocciole","pistacchi",
  "farina","zucchero","cioccolato","cacao","miele","marmellata","vaniglia","lievito","mandorla",
  "basilico","prezzemolo","rosmarino","salvia","origano","timo","menta","peperoncino","curry","zafferano",
  "olio","aceto","sale","pepe","brodo","besciamella","pesto","ragu","carbonara","amatriciana",
  "cacio","pepe","tiramisu","torta","biscotti","crostata","muffin","pancake","crepes","ciambella",
  "zuppa","vellutata","minestrone","passato","crema","sugo","salsa","hummus","tofu","seitan","tempeh",
  "legumi","verdure","ortaggi","cereali","surgelati","avanzi",
]);

/** Parole di servizio: non sono cibo ma non rendono la frase "situazionale".
 *  "pollo e patate al forno" resta una lista di ingredienti. */
const NEUTRE = new Set([
  "e","con","o","di","del","della","dei","delle","al","allo","alla","ai","agli","alle","il","lo","la",
  "i","gli","le","un","uno","una","in","su","per","da","a","the","and",
  "forno","padella","griglia","vapore","fritto","fritte","fritti","bollito","crudo","cotto","gratinato",
  "ripieno","ripiena","veloce","veloci","facile","facili","semplice","light","fit","veg","vegetariano",
  "vegetariana","vegano","vegana","ricetta","ricette","secondi","primo","primi","secondo","contorno",
  "dolce","dolci","antipasto","antipasti","piatto","piatti","fresco","fresca","estivo","estiva",
]);

export type Interpretazione = {
  /** Quel che ha scritto l'utente, ripulito. */
  originale: string;
  /** Le parole con cui si cerca davvero. */
  cercato: string;
  /** true se ci è voluto il modello. Serve alla vista per dirlo, e a noi per
   *  sapere se questa ricerca è costata qualcosa. */
  viaAi: boolean;
};

/** La frase è già fatta di cibo? Allora si cerca così com'è, gratis.
 *  Vuota o di una parola sola non riconosciuta → si cerca lo stesso com'è:
 *  una parola non è una situazione da interpretare. */
export function bastaCosi(domanda: string): boolean {
  const parole = (domanda ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 1 && !NEUTRE.has(p));

  if (parole.length === 0) return true;   // solo parole di servizio: si cerca com'è
  // Una parola sola e sconosciuta ("cacciucco", "bimbi"): non c'è una
  // situazione da sciogliere, e Tavily se la cava meglio di un'interpretazione.
  if (parole.length === 1) return true;
  // Da due parole in su: bastano se sono TUTTE cibo. Una sola parola estranea
  // ("serata", "partita", "amici") e si chiama l'interprete.
  return parole.every((p) => CIBI.has(p));
}

/* ══════ PARTE E — IL LEGAME CON IL PIANO: PROPONE, NON DECIDE ══════
 *
 * Se una ricetta somiglia a un pasto del piano — «pollo al curry» ≈ «pollo e
 * verdure» di giovedì — Keiko lo propone, non lo decide: il dito conferma
 * sempre (docs/SPEC-RICETTARIO.md §1). Questa funzione fa solo la metà onesta
 * del lavoro, il SUGGERIMENTO: dice QUALE pasto somiglia, non scrive niente
 * nel registro — quello resta il giro del blocco 7 (`annotaPasto`).
 *
 * Riusa il vocabolario di `CIBI`, lo stesso di `bastaCosi`: due testi
 * «somigliano» quando condividono almeno una parola che è cibo vero, non una
 * parola di servizio. «Pollo al curry» e «pollo e verdure» condividono
 * «pollo»; «pollo al curry» e «pasta al pomodoro» non condividono niente, e
 * infatti non sono lo stesso pasto. Non è il cancello severo della PARTE C
 * (lì un errore attacca i passi sbagliati a una ricetta; qui, nel peggiore
 * dei casi, propone un pasto che poi non si tocca — il dito decide). */
function paroleCibo(testo: string): Set<string> {
  return new Set(
    (testo ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((p) => CIBI.has(p))
  );
}

/** Il pasto di oggi che più somiglia a questa ricetta, o null se nessuno
 *  condivide un ingrediente. Fra più pasti a pari merito vince quello con più
 *  parole in comune; a parità ulteriore, il primo della giornata. */
export function pastoSomigliante<T extends { testo: string }>(titoloRicetta: string, giornata: T[]): T | null {
  const a = paroleCibo(titoloRicetta);
  if (a.size === 0) return null;
  let migliore: T | null = null;
  let punteggioMigliore = 0;
  for (const p of giornata) {
    const comuni = [...paroleCibo(p.testo)].filter((w) => a.has(w)).length;
    if (comuni > punteggioMigliore) { migliore = p; punteggioMigliore = comuni; }
  }
  return migliore;
}

/** Il filtro sulla risposta del modello. Torna null se quello che è tornato
 *  non è utilizzabile: in quel caso si cerca la frase originale, mai un errore.
 *  (Regola della spec: la ricerca non fallisce, al massimo è meno furba.) */
export function ripulisciTraduzione(grezzo: string, domanda: string): string | null {
  const t = (grezzo ?? "")
    .replace(/["""''`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.·,;:]+$/, "");
  if (!t) return null;
  const parole = t.split(/\s+/);
  // Il modello ha 80 token e un compito da 3-5 parole: se ne torna venti ha
  // spiegato invece di tradurre, e non ci si fida.
  if (parole.length > 8) return null;
  if (t.length > 90) return null;
  // Ha ripetuto la domanda: nessun guadagno, ma nemmeno un danno.
  if (t.toLowerCase() === domanda.trim().toLowerCase()) return t;
  // Frasi da modello che ha capito male ("Non posso", "Mi dispiace", "Ecco").
  if (/^(mi dispiace|non posso|non sono|come |ecco |certo)/i.test(t)) return null;
  return t;
}
