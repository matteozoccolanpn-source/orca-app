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

import type { DietMeal, DietWeek } from "./supabase";

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

/** Tutta la settimana del piano → una lista senza doppioni.
 *  Due giorni con la cipolla fanno UNA voce (idea 209). La quantità si tiene
 *  solo se è la stessa: sommare 90g e 100g darebbe un numero che nessuno ha
 *  scritto, e questo file non inventa numeri. */
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
          else if (gia.quantita !== v.quantita) gia.quantita = null;
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
