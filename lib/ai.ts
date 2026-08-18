// TETTO AI COSTI AI (K6) — il punto unico da cui passa ogni chiamata a Claude.
//
// Perché esiste: le chiamate all'API Anthropic si pagano. Un solo utente che
// carica 200 foto può costare decine di euro. Qui c'è il contatore e il freno.
//
// Come funziona, in due mosse:
//   1. `spendAi(op, ctx)` — UNA volta per operazione, PRIMA di chiamare Claude.
//      Se l'utente ha finito le operazioni di oggi, lancia AiCapReached e il
//      modello non viene mai chiamato. Altrimenti addebita il peso.
//   2. `claudeFetch(body, ctx)` — sostituisce il `fetch` verso Anthropic e
//      registra i token consumati. Va chiamata a ogni giro HTTP (le ricerche
//      web fanno più giri per UNA sola operazione: il peso si paga una volta,
//      i token si sommano tutti).
//
// Il peso: le operazioni non costano uguale, quindi non valgono uno.
//   cattura  (screenshot/testo, domanda, to-do)       = 1
//   catalogo (riempimento di sfondo della lista film)  = 1
//   piano    (dieta o scheda da PDF, scheda generata) = 5
//   consiglio ("cosa guardo": due chiamate piccole)   = 2
//   viaggio  (pianificatore con ricerca web)          = 10
// La soglia resta spiegabile ("hai finito le operazioni di oggi") ma riflette
// la spesa vera.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { currentUserId } from "./user";

const TZ = "Europe/Rome";

/** Il tipo di operazione. Cambiare i pesi qui sotto, non nei punti di chiamata. */
export type AiOperazione =
  | "cattura"
  | "catalogo"
  | "consiglio"
  | "piano"
  | "viaggio"
  | "interprete"
  | "estrazione"
  | "ripesca";

const PESI: Record<AiOperazione, number> = {
  cattura: 1,
  // CUCINA. Due operazioni piccole, tutte e due da una chiamata sola:
  //   interprete → "serata tra amici" diventa parole di ricerca. Haiku, 80
  //     token in uscita: la chiamata più economica dell'app dopo la traduzione
  //     dei piatti. Scatta SOLO sulle frasi situazionali — "pollo e patate"
  //     passa dall'euristica e non costa niente.
  //   estrazione → la ricetta dalla caption del creator. Una volta per ricetta
  //     nella vita: il risultato si salva, quindi riaprirla non ripaga.
  interprete: 1,
  estrazione: 1,
  //   ripesca → il filtro della ricerca ha buttato dei video guardando solo il
  //     testo; questa chiamata li rilegge tutti insieme e dice quali rimettere
  //     dentro. Haiku, una sola volta per ricerca, poche centinaia di token in
  //     uscita. Peso 1 come le altre due: costa meno di un'estrazione, e come
  //     quelle scatta al massimo una volta per gesto dell'utente.
  ripesca: 1,
  // Stesso peso della cattura, nome diverso: costa uguale ma è un'altra cosa, e
  // mescolata agli screenshot nel registro non si capirebbe più chi spende cosa.
  catalogo: 1,
  // Era 10 quando il consiglio cercava sul web e costava ~25 centesimi. Da C3 i
  // candidati li da' TMDB (gratis) e a Claude restano due chiamate piccole:
  // capire la richiesta e scegliere fra i candidati. Misurato: ~2 centesimi,
  // come due catture. Se un giorno la ricerca web tornasse, torna anche il 10.
  consiglio: 2,
  piano: 5,
  viaggio: 10,
};

// Chi ha originato la chiamata:
//   utente  → conta nel tetto giornaliero e può essere fermata
//   cron    → registrata sempre, MAI fermata (ha una sua rete di sicurezza)
//   sistema → registrata sempre, mai fermata (chiamate senza sessione, es. la
//             traduzione dei nomi dei piatti che sta dentro una cache di Next)
export type AiOrigine = "utente" | "cron" | "sistema";

export interface AiCtx {
  /** uuid dell'utente. Se assente lo ricava dalla sessione. */
  userId?: string | null;
  /** default: "utente" */
  origine?: AiOrigine;
}

// Riga condivisa per le chiamate senza un utente identificabile.
const UTENTE_SISTEMA = "00000000-0000-0000-0000-000000000000";

/** Soglia giornaliera per utente. Bassa di proposito: si alza quando si sa quanto si spende. */
function capUtente(): number {
  const n = Number(process.env.AI_CAP_PER_DAY);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/** Rete di sicurezza del cron: generosa, serve solo a fermare un ciclo impazzito. */
function capCron(): number {
  const n = Number(process.env.AI_CAP_CRON_PER_DAY);
  return Number.isFinite(n) && n > 0 ? n : 300;
}

/** Il messaggio che vede l'utente. Voce di Keiko (docs/UI-VOICE.md): mai un errore tecnico. */
export const AI_CAP_MESSAGE =
  "Per oggi mi fermo qui 🌙 Hai finito le operazioni di oggi: riprendiamo domani.";

/** Lanciata quando la soglia è superata. Chi la intercetta mostra AI_CAP_MESSAGE. */
export class AiCapReached extends Error {
  constructor() {
    super(AI_CAP_MESSAGE);
    this.name = "AiCapReached";
  }
}

/** true se l'errore è "quota finita" e non un guasto vero. */
export function isAiCapReached(e: unknown): boolean {
  return e instanceof AiCapReached || (e instanceof Error && e.name === "AiCapReached");
}

/** Il giorno secondo l'ora italiana: il contatore si azzera a mezzanotte, non alle 2. */
function giornoRoma(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

// Il contatore vive fuori dalla RLS: ci scrive solo il server (come
// notification_runs). Serve la service-role perché deve funzionare anche per il
// cron, che gira senza sessione.
function contatoreDb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function risolviCtx(ctx?: AiCtx): Promise<{ userId: string; origine: AiOrigine }> {
  const origine = ctx?.origine ?? "utente";
  if (ctx?.userId) return { userId: ctx.userId, origine };
  if (origine === "sistema") return { userId: UTENTE_SISTEMA, origine };
  const uid = await currentUserId();
  // Nessuna sessione e nessun utente passato: registro sulla riga di sistema
  // invece di perdere il dato. Non capita dalle rotte, che sono tutte protette.
  return uid ? { userId: uid, origine } : { userId: UTENTE_SISTEMA, origine: "sistema" };
}

/** Somma un consumo alla riga del giorno. Non lancia mai: contare non deve rompere l'app. */
async function registra(
  userId: string,
  origine: AiOrigine,
  chiamate: number,
  tokenIn: number,
  tokenOut: number
): Promise<void> {
  const db = contatoreDb();
  if (!db) {
    console.error("[usage] manca SUPABASE_SERVICE_ROLE_KEY: consumo non registrato");
    return;
  }
  const { error } = await db.rpc("usage_add", {
    p_user: userId,
    p_giorno: giornoRoma(),
    p_origine: origine,
    p_chiamate: chiamate,
    p_token_in: tokenIn,
    p_token_out: tokenOut,
  });
  if (error) {
    // Tipico se docs/sql/usage.sql non è ancora stato eseguito.
    console.error("[usage] registrazione fallita (hai eseguito docs/sql/usage.sql?):", error.message);
  }
}

// ── REGISTRO DELLE OPERAZIONI (usage_log) ───────────────────────────────────
// A fianco di `usage`, non al posto suo: `usage` dice quanto si è speso, questo
// dice DI COSA. Sono due cose separate apposta — il tetto continua a leggere
// solo `usage`, e se questo registro non funzionasse il tetto non se ne
// accorgerebbe nemmeno.
// Nessun contenuto: solo il nome dell'operazione e i numeri. Vedi
// docs/sql/usage_log.sql.

/** Una riga del registro. Tutti i numeri sono facoltativi: la riga scritta da
 *  `spendAi` ha solo il nome dell'operazione. */
interface RigaRegistro {
  userId: string;
  origine: AiOrigine;
  operazione: string;
  tokenIn?: number;
  tokenOut?: number;
  modello?: string;
  ricercheWeb?: number;
  /** Token riletti dalla cache: sono dentro `tokenIn`, ma costano un decimo. */
  cacheLetti?: number;
  /** Token messi in cache: dentro `tokenIn`, costano 1,25 volte. */
  cacheScritti?: number;
}

/** Scrive una riga nel registro. Non lancia mai: contare non deve rompere l'app. */
async function annota(r: RigaRegistro): Promise<void> {
  const db = contatoreDb();
  if (!db) return;   // già segnalato da registra(): non si raddoppia il rumore
  try {
    const { error } = await db.from("usage_log").insert({
      user_id: r.userId,
      operazione: r.operazione,
      origine: r.origine,
      token_in: r.tokenIn ?? 0,
      token_out: r.tokenOut ?? 0,
      modello: r.modello ?? null,
      ricerche_web: r.ricercheWeb ?? 0,
      token_in_cache_read: r.cacheLetti ?? 0,
      token_in_cache_write: r.cacheScritti ?? 0,
    });
    if (error) {
      // Tipico se docs/sql/usage_log.sql non è ancora stato eseguito.
      console.error("[usage_log] riga non scritta (hai eseguito docs/sql/usage_log.sql?):", error.message);
    }
  } catch (e) {
    console.error("[usage_log] riga non scritta:", e);
  }
}

/** Quante "operazioni" ha già speso oggi. -1 se il contatore non è leggibile. */
async function speseOggi(userId: string | null, origine: AiOrigine): Promise<number> {
  const db = contatoreDb();
  if (!db) return -1;
  let q = db.from("usage").select("chiamate").eq("giorno", giornoRoma()).eq("origine", origine);
  // Il tetto dell'utente guarda la sua riga; quello del cron guarda tutto il cron
  // della giornata (è una rete di sicurezza contro un ciclo impazzito, non una quota).
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) {
    console.error("[usage] lettura fallita (hai eseguito docs/sql/usage.sql?):", error.message);
    return -1;
  }
  return (data ?? []).reduce((s, r) => s + (Number(r.chiamate) || 0), 0);
}

/**
 * Da chiamare UNA volta per operazione, PRIMA di parlare con Claude.
 * Lancia `AiCapReached` se la soglia è finita: in quel caso il modello non viene
 * chiamato affatto (è il punto di K6: non spendere, non solo avvisare).
 */
export async function spendAi(op: AiOperazione, ctx?: AiCtx): Promise<void> {
  const peso = PESI[op];
  const { userId, origine } = await risolviCtx(ctx);

  if (origine === "utente") {
    const usate = await speseOggi(userId, "utente");
    // usate < 0 = contatore illeggibile. Scelta consapevole: si lascia passare e
    // si urla nei log. Questo è un guardiano dei COSTI, non della privacy: fermare
    // tutta l'app perché manca una tabella di contabilità sarebbe peggio del rischio.
    if (usate >= 0 && usate + peso > capUtente()) {
      console.warn(`[usage] tetto raggiunto: utente=${userId} usate=${usate} peso=${peso} tetto=${capUtente()}`);
      throw new AiCapReached();
    }
  } else if (origine === "cron") {
    const usate = await speseOggi(null, "cron"); // tutto il cron della giornata
    if (usate >= 0 && usate + peso > capCron()) {
      console.error(`[usage] RETE DI SICUREZZA CRON scattata: usate=${usate} tetto=${capCron()}`);
      throw new AiCapReached();
    }
  }
  // "sistema" non viene mai fermata: si registra e basta.

  await registra(userId, origine, peso, 0, 0);
  // In più (e solo dopo che il tetto ha detto sì): il nome dell'operazione nel
  // registro. Se fallisce non cambia niente — il tetto ha già fatto il suo.
  await annota({ userId, origine, operazione: op });
}

/** Un blocco della risposta di Claude (testo, uso di uno strumento, …). */
export interface ClaudeBlock {
  type?: string;
  text?: string;
  [k: string]: unknown;
}

/** Il conto che Claude allega a ogni risposta.
 *  `server_tool_use.web_search_requests` è l'unico dato che dice quante ricerche
 *  web sono partite davvero: si fatturano a parte dai token, e senza questo
 *  numero si può solo tirare a indovinare. */
export interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  server_tool_use?: { web_search_requests?: number };
}

/** Il corpo JSON della risposta di Claude. */
export interface ClaudeJson {
  stop_reason?: string;
  content?: ClaudeBlock[];
  usage?: ClaudeUsage;
  [k: string]: unknown;
}

/** La risposta, nella stessa forma che i punti di chiamata già si aspettano da `fetch`. */
export interface ClaudeResponse {
  ok: boolean;
  status: number;
  json: () => Promise<ClaudeJson>;
  text: () => Promise<string>;
}

/**
 * Sostituisce `fetch("https://api.anthropic.com/v1/messages", …)`.
 * Stessa forma di risposta (`ok`, `status`, `json()`, `text()`), in più registra
 * i token consumati. NON controlla la soglia: quello lo fa `spendAi`.
 */
/** Il modello sta già nel corpo della richiesta: se chi chiama non lo passa,
 *  lo si legge da lì invece di scrivere null. */
function modelloDi(body: unknown): string | undefined {
  const m = (body as { model?: unknown })?.model;
  return typeof m === "string" ? m : undefined;
}

/** Contesto per il registro: quale operazione sta girando e con quale modello.
 *  È tutto facoltativo — chi non lo passa finisce come "sconosciuta". */
export interface AiTraccia {
  operazione?: AiOperazione | "sconosciuta";
  modello?: string;
}

export async function claudeFetch(
  body: unknown,
  ctx?: AiCtx,
  traccia?: AiTraccia
): Promise<ClaudeResponse> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  // Il corpo si legge UNA volta sola: lo teniamo e lo riserviamo a chi chiama,
  // così i punti di chiamata continuano a fare `res.json()` / `res.text()`.
  const raw = await res.text();

  if (res.ok) {
    try {
      const data = JSON.parse(raw) as ClaudeJson;
      const u = data?.usage ?? {};
      const tokenIn =
        (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
      const tokenOut = u.output_tokens ?? 0;
      // Le ricerche web NON sono token: si pagano a ricerca, a parte. Claude le
      // conta qui, ed è l'unico posto dove il numero vero esiste.
      const ricerche = u.server_tool_use?.web_search_requests ?? 0;

      // Cache dei prompt: i due numeri che dicono se si è accesa davvero.
      // `letti` sono i token riletti dalla cache (costano un decimo), `scritti`
      // quelli messi in cache la prima volta (costano 1,25 volte). In un ciclo
      // con più giri (ricerca web), dal SECONDO giro in poi `letti` deve essere
      // alto: se resta a zero la cache non sta funzionando, e va capito perché
      // prima di dare per buono il risparmio.
      console.log(
        JSON.stringify({
          tag: "ai.cache",
          letti: u.cache_read_input_tokens ?? 0,
          scritti: u.cache_creation_input_tokens ?? 0,
          nuovi: u.input_tokens ?? 0,
          out: tokenOut,
          ricerche,
        })
      );
      if (tokenIn || tokenOut || ricerche) {
        const { userId, origine } = await risolviCtx(ctx);
        // chiamate = 0: il peso dell'operazione l'ha già addebitato spendAi.
        await registra(userId, origine, 0, tokenIn, tokenOut);
        // e la stessa cosa nel registro, stavolta con il nome dell'operazione.
        // Senza `traccia` si scrive "sconosciuta": mezzo dato è meglio di niente.
        await annota({
          userId,
          origine,
          operazione: traccia?.operazione ?? "sconosciuta",
          tokenIn,
          tokenOut,
          modello: traccia?.modello ?? modelloDi(body),
          ricercheWeb: ricerche,
          cacheLetti: u.cache_read_input_tokens ?? 0,
          cacheScritti: u.cache_creation_input_tokens ?? 0,
        });
      }
    } catch (e) {
      console.error("[usage] token non registrati:", e);
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    json: async () => JSON.parse(raw),
    text: async () => raw,
  };
}

// ── Lettura del registro (la usa /numeri) ───────────────────────────────────

// ⚠️ PREZZI SCRITTI A MANO — controllati sul listino di Anthropic il 6 agosto 2026
// (https://platform.claude.com/docs/en/about-claude/pricing).
// Un prezzo a mano che invecchia in silenzio è proprio quello che la bussola
// vieta: qui è accettabile SOLO perché /numeri è una pagina interna che vede
// solo il proprietario, e solo finché questa data resta accanto al numero.
// Quando cambia il listino, o quando si cambia modello, questo va rifatto.
export const PREZZI_PER_MTOK: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-5": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
// Le ricerche web non si pagano a token: si pagano a ricerca ($10 ogni 1.000),
// più i token dei risultati che stanno già nel conto qui sopra.
export const PREZZO_RICERCA_WEB = 10 / 1000;
export const PREZZI_AGGIORNATI_AL = "6 agosto 2026";

/** I moltiplicatori della cache, uguali per tutti i modelli: un token riletto
 *  dalla cache costa un decimo, uno appena messo in cache 1,25 volte. */
const CACHE_LETTURA = 0.1;
const CACHE_SCRITTURA = 1.25;

/** Il listino di un modello, dal nome scritto nel registro.
 *
 *  ⚠️ Il confronto è per PREFISSO, e non è pignoleria. Nel registro i nomi
 *  arrivano come li scrive chi chiama: l'estrazione manda `claude-sonnet-4-5`,
 *  che qui c'è, ma l'interprete manda `claude-haiku-4-5-20251001` — la versione
 *  datata — che con la ricerca per chiave esatta NON combaciava. Scattava il
 *  ripiego «trattalo come Sonnet», e una chiamata a Haiku veniva contata TRE
 *  VOLTE il suo prezzo: 0,082 centesimi invece di 0,027.
 *  Trovato il 15 agosto 2026 misurando la Cucina. Un contatore che sbaglia è
 *  peggio di nessun contatore, perché sopra ci si prendono decisioni — e quella
 *  che stava per prendersi era «l'interprete costa troppo».
 *  Chi non combacia nemmeno per prefisso resta Sonnet: un modello sconosciuto
 *  si conta caro, non a sconto. */
export function prezzoDelModello(modello: string | null | undefined): { in: number; out: number } {
  const m = (modello ?? "").trim();
  if (m) {
    const esatto = PREZZI_PER_MTOK[m];
    if (esatto) return esatto;
    for (const [nome, p] of Object.entries(PREZZI_PER_MTOK)) if (m.startsWith(nome)) return p;
  }
  return PREZZI_PER_MTOK["claude-sonnet-4-5"];
}

/** Quanto è costata una riga del registro, in dollari.
 *
 *  `token_in` è il totale in entrata, ma dentro ci stanno tre cose che NON
 *  costano uguale: i token nuovi (prezzo pieno), quelli riletti dalla cache (un
 *  decimo) e quelli messi in cache (1,25 volte). Tenendoli separati il conto è
 *  quello vero, non un "non più di così". */
function stimaDollari(r: {
  modello: string | null;
  tokenIn: number;
  tokenOut: number;
  ricerche: number;
  cacheLetti: number;
  cacheScritti: number;
}): number {
  const p = prezzoDelModello(r.modello);
  // Quel che resta è "nuovo". Il max(0) protegge dalle righe scritte prima che
  // esistessero le due colonne, dove i pezzi non tornano.
  const nuovi = Math.max(0, r.tokenIn - r.cacheLetti - r.cacheScritti);
  const entrata = nuovi + r.cacheLetti * CACHE_LETTURA + r.cacheScritti * CACHE_SCRITTURA;
  return (entrata / 1e6) * p.in + (r.tokenOut / 1e6) * p.out + r.ricerche * PREZZO_RICERCA_WEB;
}

export interface UsoOperazione {
  operazione: string;
  volte: number;      // quante volte l'utente ha chiesto quella cosa
  chiamate: number;   // quante richieste sono partite verso Claude (la ricerca web ne fa più d'una)
  ricercheWeb: number; // ricerche vere, contate da Claude: si fatturano a parte
  cacheLetti: number;  // quanti dei token in entrata sono arrivati dalla cache
  tokenIn: number;
  tokenOut: number;
  dollari: number;
}

/** Ultimi N giorni, raggruppato per operazione. [] se la tabella non c'è ancora.
 *
 *  Come si contano le "volte": nel registro ci sono due tipi di riga. Quella
 *  scritta da `spendAi` all'inizio dell'operazione ha zero token ed è UNA per
 *  operazione — quelle sono le volte. Le altre le scrive `claudeFetch`, una per
 *  richiesta davvero partita: con la ricerca web una sola operazione ne fa 3-4,
 *  e contarle tutte direbbe "4 consigli" dove l'utente ne ha chiesto uno. */
export async function usoPerOperazione(giorni = 7): Promise<UsoOperazione[]> {
  const db = contatoreDb();
  if (!db) return [];
  const da = new Date(Date.now() - giorni * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("usage_log")
    .select("operazione, token_in, token_out, modello, ricerche_web, token_in_cache_read, token_in_cache_write")
    .gt("ts", da);
  if (error) {
    console.error("[usage_log] lettura fallita (hai eseguito docs/sql/usage_log.sql?):", error.message);
    return [];
  }
  const per = new Map<string, UsoOperazione>();
  type Riga = {
    operazione: string;
    token_in: number;
    token_out: number;
    modello: string | null;
    ricerche_web: number | null;
    token_in_cache_read: number | null;
    token_in_cache_write: number | null;
  };
  for (const r of (data ?? []) as Riga[]) {
    const k = r.operazione || "sconosciuta";
    const v =
      per.get(k) ??
      { operazione: k, volte: 0, chiamate: 0, ricercheWeb: 0, cacheLetti: 0, tokenIn: 0, tokenOut: 0, dollari: 0 };
    const tIn = Number(r.token_in) || 0;
    const tOut = Number(r.token_out) || 0;
    const cerca = Number(r.ricerche_web) || 0;
    const letti = Number(r.token_in_cache_read) || 0;
    const scritti = Number(r.token_in_cache_write) || 0;
    if (tIn === 0 && tOut === 0) {
      v.volte += 1;              // riga di spendAi: una per operazione
    } else {
      v.chiamate += 1;
      v.ricercheWeb += cerca;
      v.tokenIn += tIn;
      v.tokenOut += tOut;
      v.cacheLetti += letti;
      v.dollari += stimaDollari({
        modello: r.modello,
        tokenIn: tIn,
        tokenOut: tOut,
        ricerche: cerca,
        cacheLetti: letti,
        cacheScritti: scritti,
      });
    }
    per.set(k, v);
  }
  return [...per.values()].sort((a, b) => b.dollari - a.dollari);
}
