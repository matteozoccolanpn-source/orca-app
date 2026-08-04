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
//   cattura (screenshot/testo, domanda, to-do, film) = 1
//   piano   (dieta o scheda da PDF, scheda generata) = 5
//   viaggio (pianificatore con ricerca web)          = 10
// La soglia resta spiegabile ("hai finito le operazioni di oggi") ma riflette
// la spesa vera.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { currentUserId } from "./user";

const TZ = "Europe/Rome";

/** Il tipo di operazione. Cambiare i pesi qui sotto, non nei punti di chiamata. */
export type AiOperazione = "cattura" | "piano" | "viaggio";

const PESI: Record<AiOperazione, number> = {
  cattura: 1,
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
}

/** Un blocco della risposta di Claude (testo, uso di uno strumento, …). */
export interface ClaudeBlock {
  type?: string;
  text?: string;
  [k: string]: unknown;
}

/** Il corpo JSON della risposta di Claude. */
export interface ClaudeJson {
  stop_reason?: string;
  content?: ClaudeBlock[];
  usage?: Record<string, number>;
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
export async function claudeFetch(body: unknown, ctx?: AiCtx): Promise<ClaudeResponse> {
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
      if (tokenIn || tokenOut) {
        const { userId, origine } = await risolviCtx(ctx);
        // chiamate = 0: il peso dell'operazione l'ha già addebitato spendAi.
        await registra(userId, origine, 0, tokenIn, tokenOut);
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
