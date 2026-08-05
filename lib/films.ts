// Sezione "Da guardare" — il cervello.
//
// COM'È FATTO OGGI (C3). Tre passi, e la ricerca web non c'entra più:
//   A. CAPIRE  — una chiamata piccola a Claude che traduce la frase dell'utente
//      in filtri ("commedia italiana degli ultimi anni" → generi, anni, tipo).
//   B. TROVARE — i candidati li dà TMDB con /discover, gratis: filtra per
//      genere, anno, voto, durata e piattaforma italiana. Se l'utente ha
//      nominato un titolo ("stile Quo Vado") si aggiungono le raccomandazioni
//      TMDB di quel titolo.
//   C. SCEGLIERE — una seconda chiamata piccola: Claude riceve i candidati in
//      righe compatte e ne sceglie 3-4 spiegando perché. NON sceglie la
//      piattaforma: quella la mettiamo noi, presa da TMDB.
//
// PERCHÉ. Prima Claude cercava sul web e riportava quello che aveva letto in un
// articolo. Costava ~75.000 token a consiglio (i risultati di ricerca rientrano
// come token in ingresso) e diceva "su Netflix" mentre "Dove vederlo", due
// tocchi più in là, chiedeva a TMDB e poteva rispondere un'altra cosa. Stessa
// app, due risposte diverse: quello era il difetto vero, il costo era il resto.
//
// IL TITOLO SECCO ("aggiungi Breaking Bad") non passa da qui: è una ricerca
// TMDB e basta, ZERO chiamate a Claude. Prima costava come un consiglio.
//
// IL RIPIEGO. Senza chiave TMDB, o se discover non trova niente, si ricade sul
// giro vecchio con la ricerca web (`consiglioConRicercaWeb`, più in basso): è
// lento e costoso, ma è meglio di una lista vuota.

import { getFreshCatalog, saveCatalogFilms, type CatalogFilm } from "./supabase";
import {
  discoverTitles,
  seriesProgressInfo,
  runtimeById,
  PIATTAFORME_IT,
  recommendationsById,
  resolveTitle,
  resolveExactTitle,
  watchProvidersById,
  normalizzaPiattaforma,
  type CandidatoScoperto,
  type FiltriScoperta,
} from "./tmdb";
import { spendAi, claudeFetch, type AiOperazione } from "./ai";

const MODEL = "claude-sonnet-4-5";

type Blocco = Record<string, unknown>;
type Msg = { role: string; content: Blocco[] };

/* CACHE DEI PROMPT — perché c'è.
   Quando Claude si ferma per cercare sul web (`pause_turn`), il ciclo qui sotto
   rimette la sua risposta nella conversazione e richiama. Ma a ogni giro si
   rispedisce TUTTA la conversazione, risultati di ricerca compresi: con tre
   ricerche gli stessi 20.000 token di risultati si pagavano tre o quattro volte.

   Con la cache si paga una volta e i giri dopo la rileggono a un decimo del
   prezzo. Il punto di cache è UNO SOLO e si sposta sempre in fondo: così ogni
   giro mette in cache tutto quello che c'è prima, e il giro successivo lo
   rilegge. (Il massimo consentito è 4 punti contemporanei: tenendone uno solo
   non ci si avvicina nemmeno.) */
function segnaPuntoDiCache(messages: Msg[]): void {
  for (const m of messages) {
    for (const b of m.content) delete b.cache_control;
  }
  const ultimo = messages[messages.length - 1];
  const blocco = ultimo?.content?.[ultimo.content.length - 1];
  if (blocco) blocco.cache_control = { type: "ephemeral" };
}

async function callClaude(userContent: string, maxSearches: number, operazione: AiOperazione): Promise<string> {
  // Il messaggio iniziale va scritto a blocchi (non come stringa): il
  // `cache_control` sta sul blocco, non sul messaggio.
  const messages: Msg[] = [{ role: "user", content: [{ type: "text", text: userContent }] }];
  segnaPuntoDiCache(messages);

  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: maxSearches,
      user_location: { type: "approximate", country: "IT", timezone: "Europe/Rome" },
    },
  ];

  for (let guard = 0; guard < 5; guard++) {
    const res = await claudeFetch({ model: MODEL, max_tokens: 2048, messages, tools }, undefined, { operazione, modello: MODEL });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const data = await res.json();

    if (data.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: (data.content ?? []) as Blocco[] });
      segnaPuntoDiCache(messages);   // il giro dopo rilegge tutto il resto dalla cache
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

/** Una proposta per la watchlist (fase 1). */
export interface FilmPick {
  title: string;
  kind: "film" | "serie";
  platform: string | null; // dove si vede in Italia oggi
  info: string | null;     // una riga: genere/anno/di cosa parla; serie: stagioni, in corso?
  link: string | null;
}

/** Il JSON di un OGGETTO: dalla prima graffa all'ultima.
 *  Serve una funzione a parte da `extractJson`, che cerca prima le quadre: i
 *  nostri oggetti contengono liste ("generi":[]), e quella lì tagliava a partire
 *  dalla prima lista interna producendo un pezzo di JSON invalido. È il bug che
 *  ha mandato tutte e cinque le prove nel ripiego con la ricerca web. */
function estraiOggetto(raw: string): string {
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  return a >= 0 && b > a ? raw.slice(a, b + 1) : raw;
}

function extractJson(raw: string): string {
  const a = raw.indexOf("["), b = raw.lastIndexOf("]");
  if (a >= 0 && b > a) return raw.slice(a, b + 1);
  const c = raw.indexOf("{"), d = raw.lastIndexOf("}");
  return raw.slice(c, d + 1);
}

function catalogLines(cat: CatalogFilm[]): string {
  if (cat.length === 0) return "(vuoto)";
  return cat
    .map((f) => `- ${f.title} | ${f.kind} | ${f.genres ?? "-"} | ${f.platform ?? "?"} | ${f.info ?? ""}`)
    .join("\n");
}

function parsePicks(raw: string): FilmPick[] {
  const parsed = JSON.parse(extractJson(raw)) as unknown;
  const arr = Array.isArray(parsed) ? parsed : (parsed as { films?: unknown[] })?.films;
  if (!Array.isArray(arr)) return [];
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  return arr
    .map((f) => {
      const o = f as Record<string, unknown>;
      const title = str(o.title);
      if (!title) return null;
      return {
        title,
        kind: o.kind === "serie" ? ("serie" as const) : ("film" as const),
        platform: str(o.platform),
        info: str(o.info),
        link: str(o.link)?.startsWith("http") ? str(o.link) : null,
      };
    })
    .filter((f): f is FilmPick => f !== null)
    .slice(0, 6);
}

/** IL RIPIEGO: il giro vecchio, con la ricerca web e il catalogo locale.
 *  Si usa solo quando TMDB non è disponibile o non trova niente. Costoso e
 *  lento, ma è l'unica strada che non ha bisogno di TMDB.
 *  Il tetto costi lo ha già pagato chi chiama: qui non si ri-addebita. */
async function consiglioConRicercaWeb(query: string): Promise<FilmPick[]> {
  const catalogo = await getFreshCatalog(60);

  const prompt = `Richiesta dell'utente per la sua lista "da guardare" (Italia): "${query}"

CATALOGO LOCALE già verificato di recente — USA PRIMA QUESTO, cerca sul web solo se non basta:
${catalogLines(catalogo)}

Due casi:
- La richiesta è un TITOLO SPECIFICO ("quo vado", "aggiungi Breaking Bad") → 1 solo risultato:
  quel titolo esatto, con dove si vede OGGI in Italia.
- La richiesta è un CONSIGLIO ("commedia stile quo vado", "una serie crime corta") → 3-4
  proposte azzeccate, possibilmente su piattaforme DIVERSE così l'utente sceglie.

Rispondi SOLO con un JSON, nessun altro testo:
{"films":[{"title":"…","kind":"film" o "serie","platform":"Netflix / Prime Video / RaiPlay / cinema / …" oppure null,"info":"una riga: genere, anno, perché c'entra; per le serie anche stagioni e se in corso","link":"https://…" oppure null}]}

Regole:
- "platform": SOLO se verificata (dal catalogo o dalla ricerca), per l'ITALIA. Mai inventata.
- "info": massimo una riga, in italiano.
- Niente prezzi. Se un dato non è certo: null.`;

  const raw = await callClaude(prompt, 3, "consiglio");
  try {
    return parsePicks(raw);
  } catch {
    console.error("consiglioConRicercaWeb: JSON non valido:", raw.slice(0, 300));
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════════════
// IL GIRO NUOVO (C3)
// ════════════════════════════════════════════════════════════════════════════

/** Una chiamata a Claude a GIRO UNICO: niente strumenti, niente ricerca web e
 *  soprattutto NIENTE cache dei prompt.
 *
 *  Perché niente cache: `callClaude` (il ripiego) la usa e ci guadagna, perché
 *  con la ricerca web fa più giri e dal secondo in poi rilegge a un decimo. Qui
 *  di giri ce n'è uno solo: non esiste un secondo giro che rilegga, e scrivere
 *  in cache costa il 25% IN PIÙ dell'input normale. Metterla qui sarebbe pagare
 *  un quarto in più per niente. */
async function chiamataSemplice(prompt: string, maxTokens: number): Promise<string> {
  const res = await claudeFetch(
    { model: MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] },
    undefined,
    { operazione: "consiglio", modello: MODEL }
  );
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  return blocks
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b.text ?? "")
    .join("\n")
    .trim();
}

// ── PASSO 0: è un titolo secco? ─────────────────────────────────────────────
// "aggiungi Breaking Bad" non è una richiesta di consiglio: è un titolo. Prima
// costava 25 centesimi come tutto il resto. Adesso non costa NIENTE: nessuna
// chiamata a Claude, solo una ricerca TMDB.

/** Le parole che dicono "sto chiedendo un consiglio, non un titolo". */
const PAROLE_DA_CONSIGLIO = [
  "stile", "tipo", "simile", "simili", "come ", "consiglio", "consigli", "consigliami",
  "qualcosa", "qualche", "genere", "stasera", "stanotte", "weekend", "corta", "corte",
  "breve", "brevi", "massimo", "meno di", "sotto le", "voglio qualcosa", "cosa guardo",
  "che film", "che serie", "idee", "suggerisci", "proponi", "leggero", "leggera",
];

/** I verbi con cui si comincia una frase quando si vuole aggiungere un titolo. */
const APERTURE = /^(aggiungi|aggiungimi|metti|mettimi|salva|segna|segnami|voglio vedere|vorrei vedere|guardare)\s+/i;

const senzaFronzoli = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

/** Se la frase è un titolo e basta, restituisce quel titolo risolto su TMDB.
 *  null in tutti gli altri casi — e nel dubbio è null: sbagliare qui vuol dire
 *  rispondere con un film solo a chi voleva dei consigli. */
async function titoloSecco(query: string): Promise<FilmPick | null> {
  const q = query.trim();
  const basso = q.toLowerCase();
  if (PAROLE_DA_CONSIGLIO.some((p) => basso.includes(p))) return null;
  const pulita = q.replace(APERTURE, "").trim();
  if (!pulita || pulita.length > 60) return null;

  // `resolveExactTitle` pretende che il titolo trovato sia quello scritto: è
  // lui a fare la prova del nove, così "commedia italiana" non pesca il primo
  // risultato a caso e non lo spaccia per una richiesta di aggiunta.
  const trovato = await resolveExactTitle(pulita);
  if (!trovato) return null;

  const dove = await watchProvidersById(trovato.tmdbId, trovato.tmdbType);
  const piattaforme = [...new Set((dove?.flatrate ?? []).map((x) => normalizzaPiattaforma(x.name) ?? x.name))];
  return {
    title: trovato.title,
    kind: trovato.tmdbType === "tv" ? "serie" : "film",
    platform: piattaforme[0] ?? null,
    info: [trovato.genre, trovato.year].filter(Boolean).join(", ") || null,
    link: dove?.link ?? null,
  };
}

// ── PASSO A: capire cosa vuole ──────────────────────────────────────────────

/** I generi che TMDB sa filtrare, scritti come li scriviamo noi. */
const GENERI_AMMESSI = [
  "Azione", "Avventura", "Animazione", "Commedia", "Crime", "Documentario", "Drammatico",
  "Famiglia", "Fantasy", "Storico", "Horror", "Musica", "Mystery", "Romantico",
  "Fantascienza", "Thriller", "Guerra", "Western",
];

type Intenzione = FiltriScoperta & {
  /** Titoli che l'utente ha nominato come riferimento ("stile Quo Vado"). */
  riferimenti?: string[];
  /** "una serie corta, massimo 3 stagioni": TMDB non lo sa filtrare, lo
   *  filtriamo noi sul numero di stagioni vero. */
  stagioniMax?: number;
  /** Quello che i filtri non sanno dire ("massimo 3 stagioni"): va al passo C. */
  nota?: string | null;
};

async function capisciRichiesta(query: string): Promise<Intenzione> {
  const anno = new Date().getFullYear();
  const prompt = `Un utente italiano cerca qualcosa da guardare. Traduci la sua richiesta in filtri.

Richiesta: "${query}"

Rispondi SOLO con questo JSON, senza altro testo:
{"tipo":"film"|"serie"|"entrambi","generi":[],"lingua":null,"parolaChiave":null,"annoDa":null,"annoA":null,"durataMax":null,"stagioniMax":null,"votoMin":null,"piattaforme":[],"riferimenti":[],"nota":null}

Regole:
- Generi ammessi (usa ESATTAMENTE queste parole, al massimo 2): ${GENERI_AMMESSI.join(", ")}.
- Piattaforme ammesse: ${PIATTAFORME_IT.join(", ")}. Mettile SOLO se l'utente le ha nominate.
- "riferimenti": i titoli che l'utente cita come esempio ("stile Quo Vado" → ["Quo Vado"]).
- "lingua": codice ISO della lingua ORIGINALE, solo se l'utente la nomina.
  "commedia italiana" → "it" (è una lingua, non un genere); "film coreano" → "ko".
- "durataMax": in MINUTI, SEMPRE quando l'utente parla del tempo che ha:
  "ho un'ora" → 70, "un'oretta" → 75, "non ho tempo" → 100. Se parla di tempo e
  tu lasci null, gli proponiamo un film di due ore: è l'errore peggiore.
- "parolaChiave": l'ARGOMENTO in INGLESE, una o due parole ("documentario sulla
  natura" → "nature"; "film sulla boxe" → "boxing"). Solo se l'utente parla di un
  argomento preciso: per "qualcosa di leggero" lascia null. I generi da soli non
  bastano, "documentario" senza argomento restituisce di tutto.
- "stagioniMax": numero di stagioni massimo, quando l'utente chiede una serie
  "corta" o "massimo N stagioni". "corta" senza numero → 3.
- "nota": in una riga, il vincolo che i filtri non sanno esprimere ("massimo 3 stagioni",
  "niente roba triste"). null se non ce n'è.
- L'anno corrente è ${anno}. "recente"/"ultimi anni" → annoDa ${anno - 5}.
- Quello che l'utente non ha detto resta null o lista vuota. Non inventare filtri:
  meno filtri = più scelta, filtri inventati = risposta sbagliata.`;

  const raw = await chiamataSemplice(prompt, 400);
  const o = JSON.parse(estraiOggetto(raw)) as Record<string, unknown>;
  const testo = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const lista = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : undefined;
  return {
    tipo: o.tipo === "film" || o.tipo === "serie" ? o.tipo : "entrambi",
    generi: lista(o.generi),
    annoDa: num(o.annoDa),
    annoA: num(o.annoA),
    durataMax: num(o.durataMax),
    stagioniMax: num(o.stagioniMax),
    votoMin: num(o.votoMin),
    piattaforme: lista(o.piattaforme),
    lingua: testo(o.lingua),
    parolaChiave: testo(o.parolaChiave),
    riferimenti: lista(o.riferimenti),
    nota: typeof o.nota === "string" && o.nota.trim() ? o.nota.trim() : null,
  };
}

// ── PASSO B: i candidati, da TMDB, gratis ───────────────────────────────────

/** Quanti candidati si portano avanti. Non trenta: per ognuno si chiedono a
 *  TMDB anche le piattaforme (e le stagioni, se è una serie), e sono chiamate
 *  vere. Quattordici bastano per scegliere bene e restano una riga corta. */
const MAX_CANDIDATI = 14;

type CandidatoRicco = CandidatoScoperto & {
  piattaforme: string[];
  link: string | null;
  stagioni: number | null;
};

async function candidati(f: Intenzione): Promise<CandidatoRicco[]> {
  // Se c'è un vincolo di lunghezza si pescano due pagine invece di una: il
  // taglio sulla durata/stagioni vere ne butta via parecchi, e con una pagina
  // sola si finiva col rispondere un titolo solo a "una serie crime corta".
  const pagine = f.durataMax != null || f.stagioniMax != null ? 2 : 1;
  const daFiltri = await discoverTitles(f, pagine);

  // I titoli nominati dall'utente: le raccomandazioni di TMDB per quelli sono
  // spesso più azzeccate di qualsiasi filtro per genere.
  const daRiferimenti: CandidatoScoperto[] = [];
  for (const rif of (f.riferimenti ?? []).slice(0, 2)) {
    const t = await resolveTitle(rif);
    if (t) daRiferimenti.push(...(await recommendationsById(t.tmdbId, t.tmdbType)));
  }

  // Prima i suggeriti dai riferimenti, poi quelli dei filtri; senza doppioni.
  const visti = new Set<string>();
  const uniti: CandidatoScoperto[] = [];
  for (const c of [...daRiferimenti, ...daFiltri]) {
    const k = `${c.tmdbType}:${c.tmdbId}`;
    if (visti.has(k)) continue;
    visti.add(k);
    uniti.push(c);
  }

  // PRIMO GIRO: quanto è lungo davvero. Discover non lo dice, e il suo filtro
  // sulla durata non è affidabile — "sotto i 70 minuti" gli fa passare un film
  // da 115. Quindi il taglio si fa qui, sul dato vero di ogni titolo.
  // Quanti se ne controllano: con un vincolo di lunghezza si guarda molto più
  // in profondità, perché il taglio è feroce — sulle serie crime popolari,
  // "massimo 3 stagioni" lasciava UN candidato su ventiquattro.
  const daControllare = f.durataMax != null || f.stagioniMax != null ? 40 : 20;
  const conLunghezza = await Promise.all(
    uniti.slice(0, daControllare).map(async (c) => {
      if (c.tmdbType === "tv") {
        const s = await seriesProgressInfo(c.tmdbId);
        return { ...c, stagioni: s?.totalSeasons ?? null };
      }
      return { ...c, durata: await runtimeById(c.tmdbId), stagioni: null as number | null };
    })
  );

  const abbastanzaCorti = conLunghezza.filter((c) => {
    // Chi non ha il dato non viene buttato: TMDB a volte non lo sa, e scartarlo
    // vorrebbe dire perdere titoli buoni per un campo vuoto.
    if (f.durataMax != null && c.durata != null && c.durata > f.durataMax) return false;
    if (f.stagioniMax != null && c.stagioni != null && c.stagioni > f.stagioniMax) return false;
    return true;
  });

  // SECONDO GIRO, solo sui superstiti: dove si vede. È questo che rende la
  // risposta verificata invece che ricordata.
  return Promise.all(
    abbastanzaCorti.slice(0, MAX_CANDIDATI).map(async (c) => {
      const dove = await watchProvidersById(c.tmdbId, c.tmdbType);
      return {
        ...c,
        piattaforme: [...new Set((dove?.flatrate ?? []).map((x) => normalizzaPiattaforma(x.name) ?? x.name))],
        link: dove?.link ?? null,
      };
    })
  );
}

// ── PASSO C: scegliere e spiegare ───────────────────────────────────────────

/** Una riga per candidato. Compatta di proposito: è questo che tiene la
 *  chiamata sotto il migliaio di token invece dei 75.000 di prima. */
function rigaCandidato(c: CandidatoRicco, n: number): string {
  const pezzi = [
    `#${n} ${c.titolo}`,
    `(${[c.anno, c.tmdbType === "tv" ? "serie" : "film"].filter(Boolean).join(", ")})`,
    c.generi.slice(0, 2).join("/") || null,
    c.voto ? `voto ${c.voto}` : null,
    c.stagioni ? `${c.stagioni} stagioni` : null,
    c.durata ? `${c.durata} min` : null,
    c.piattaforme.length ? c.piattaforme.slice(0, 2).join(", ") : "non in abbonamento",
  ].filter(Boolean);
  return pezzi.join(" · ");
}

async function scegliESpiega(query: string, lista: CandidatoRicco[], nota: string | null): Promise<FilmPick[]> {
  const righe = lista.map((c, i) => rigaCandidato(c, i + 1)).join("\n");
  const prompt = `Un utente italiano ha chiesto: "${query}"
${nota ? `Vincolo in più, da rispettare: ${nota}\n` : ""}
Questi sono i titoli disponibili in Italia adesso (dati verificati, non da inventare):
${righe}

Scegline 3-4, i più azzeccati per la richiesta. Se puoi, su piattaforme diverse.

Rispondi SOLO con questo JSON:
{"scelte":[{"n":numero della riga,"info":"una riga in italiano: perché proprio questo"}]}

Regole:
- "n" deve essere uno dei numeri della lista. Non aggiungere titoli che non ci sono.
- "info": UNA riga, in italiano, che dice perché c'entra con la richiesta.
- NON scrivere la piattaforma dentro "info": la mette l'app, presa da TMDB.
- Durata e stagioni scrivile SOLO se sono nella riga del titolo: sono dati
  verificati oggi, quello che ricordi tu può essere vecchio.
- Niente prezzi, niente trame lunghe.`;

  const raw = await chiamataSemplice(prompt, 700);
  const o = JSON.parse(estraiOggetto(raw)) as { scelte?: { n?: unknown; info?: unknown }[] };
  const scelte = Array.isArray(o?.scelte) ? o.scelte : [];

  const scelti = scelte
    .map((s): FilmPick | null => {
      const i = typeof s.n === "number" ? s.n - 1 : -1;
      const c = lista[i];
      if (!c) return null;
      return {
        title: c.titolo,
        kind: c.tmdbType === "tv" ? ("serie" as const) : ("film" as const),
        // LA PIATTAFORMA NON LA SCEGLIE IL MODELLO: arriva da TMDB, la stessa
        // fonte di "Dove vederlo". È tutto il punto di questo lavoro.
        platform: c.piattaforme[0] ?? null,
        info: typeof s.info === "string" && s.info.trim() ? s.info.trim() : null,
        link: c.link,
      };
    })
    .filter((f): f is FilmPick => f !== null)
    .slice(0, 4);

  if (scelti.length) return scelti;

  // Il modello non ha scelto niente di valido (numeri inventati, o ha deciso che
  // nessuno andava bene). Restituire una lista vuota sarebbe la risposta
  // peggiore: i candidati verificati ce li abbiamo, si mostrano i primi tre con
  // quello che sappiamo di loro. Meglio una risposta onesta e un po' generica
  // che "non ho trovato niente" quando invece c'era.
  console.warn("[consiglio] il modello non ha scelto nulla di valido: mostro i primi candidati");
  return lista.slice(0, 3).map((c) => ({
    title: c.titolo,
    kind: c.tmdbType === "tv" ? ("serie" as const) : ("film" as const),
    platform: c.piattaforme[0] ?? null,
    info: [c.generi.slice(0, 2).join(", "), c.anno, c.stagioni ? `${c.stagioni} stagioni` : null]
      .filter(Boolean)
      .join(" · ") || null,
    link: c.link,
  }));
}

// ── L'insieme ───────────────────────────────────────────────────────────────

/** Il punto d'ingresso: resta quello di prima, cambia cosa fa dentro. */
export async function suggestWatch(query: string): Promise<FilmPick[]> {
  // 1. Titolo secco: nessuna AI, nessun costo, nessun tetto da consumare.
  try {
    const secco = await titoloSecco(query);
    if (secco) return [secco];
  } catch (e) {
    console.error("titolo secco: errore, si prosegue col consiglio:", e);
  }

  if (!process.env.ANTHROPIC_API_KEY) return [];
  // Tetto costi (K6): una volta sola, qui. Vale per tutte e due le chiamate
  // piccole e anche per l'eventuale ripiego.
  await spendAi("consiglio");

  // 2. Senza TMDB non c'è il giro nuovo: si ripiega subito su quello vecchio.
  if (!process.env.TMDB_API_KEY) {
    console.warn("[consiglio] manca TMDB_API_KEY: ripiego sulla ricerca web");
    return consiglioConRicercaWeb(query);
  }

  try {
    const intenzione = await capisciRichiesta(query);
    const lista = await candidati(intenzione);
    // Una riga sola, ma è quella che dice se il consiglio ha sbagliato perché
    // ha capito male la richiesta o perché TMDB non aveva candidati.
    console.log(JSON.stringify({ tag: "consiglio.giro", filtri: intenzione, candidati: lista.length }));
    if (lista.length === 0) {
      // Filtri troppo stretti o TMDB muto: meglio il giro lento di una lista vuota.
      console.warn("[consiglio] discover non ha trovato niente: ripiego sulla ricerca web");
      return consiglioConRicercaWeb(query);
    }
    return await scegliESpiega(query, lista, intenzione.nota ?? null);
  } catch (e) {
    console.error("[consiglio] giro TMDB fallito, ripiego sulla ricerca web:", e);
    return consiglioConRicercaWeb(query);
  }
}

/** Sopra questa soglia di titoli freschi la fase 2 non serve: la cache è piena. */
export const CATALOGO_GIA_RICCO = 40;

/** FASE 2 (background): allarga la ricerca e salva ~12-15 titoli affini nel catalogo. */
export async function deepenFilmCatalog(query: string): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return;

  // Tetto costi (K6): questa è la fase 2, gira in background e serve solo a
  // riempire la cache. Se la giornata è finita si salta senza far rumore.
  // Pesa come una cattura ma ha un nome suo: nel registro mescolata agli
  // screenshot non si capirebbe più cosa sta spendendo cosa.
  try {
    await spendAi("catalogo");
  } catch {
    return;
  }

  const prompt = `Un utente italiano ha chiesto per la sua watchlist: "${query}"

Costruisci una lista di 12-15 titoli AFFINI a questa richiesta (film e/o serie), pensando
a cosa potrebbe chiedere di simile in futuro. Per ciascuno verifica con la ricerca web
dove si vede OGGI in Italia (piattaforma streaming o TV).

Rispondi SOLO con un JSON array, nessun altro testo:
[{"title":"…","kind":"film" o "serie","genres":"es. commedia, italiano","platform":"…" oppure null,"info":"una riga","link":"https://…" oppure null}]

Regole: piattaforme solo verificate e per l'Italia, niente prezzi, niente titoli inventati.`;

  try {
    // 2 ricerche, non 6: questa fase gira in background e nessuno la aspetta,
    // quindi non ha senso che cerchi il doppio di quella che l'utente guarda.
    const raw = await callClaude(prompt, 2, "catalogo");
    const parsed = JSON.parse(extractJson(raw)) as unknown[];
    if (!Array.isArray(parsed)) return;
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
    const films: CatalogFilm[] = parsed
      .map((f) => {
        const o = f as Record<string, unknown>;
        const title = str(o.title);
        if (!title) return null;
        return {
          title,
          kind: o.kind === "serie" ? "serie" : "film",
          genres: str(o.genres),
          platform: str(o.platform),
          info: str(o.info),
          link: str(o.link)?.startsWith("http") ? str(o.link) : null,
        };
      })
      .filter((f): f is CatalogFilm => f !== null);
    if (films.length > 0) await saveCatalogFilms(films);
  } catch (e) {
    console.error("deepenFilmCatalog fallita (non blocca nulla):", e);
  }
}
