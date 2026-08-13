// Server-side only — SUPABASE_SERVICE_ROLE_KEY must never reach the client bundle.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { userDb } from "./supabase-user";
import { detectClusters, type TicketInput } from "./incastri";
import { currentUserId } from "./user";

export interface EventEnrichment {
  summary: string;
  links: { label: string; url: string }[];
  updatedAt: string;
  /** Stato dei battiti dell'evento: { prima: "mostrato", dopo: "chiuso" }.
   *  Vedi docs/SPEC-BATTITI.md — ogni battito compare una volta sola. */
  beats?: Record<string, string> | null;
  /** Foto dell'artista (Deezer), cercata UNA volta nella vita dell'evento.
   *  `url: null` NON è un buco: è la memoria del "non trovato", ed è ciò che
   *  impedisce di richiamare Deezer all'infinito per un artista che non esiste.
   *  È la lezione imparata con placePhoto.
   *
   *  `name` e `fans` sono la RICEVUTA: dicono CHI abbiamo preso. Senza, una foto
   *  sbagliata non è verificabile — è successo davvero, con un omonimo da 25
   *  fan al posto del cantante da 119.000. */
  artistPhoto?: { url: string | null; name?: string | null; fans?: number | null; checked_at: string } | null;
  /** Foto del luogo (Google Places), risolta UNA volta e poi riusata.
   *  `name` null = cercata e non trovata: si ricorda anche quello, altrimenti
   *  gli eventi senza foto ripagherebbero la ricerca a ogni apertura. */
  placePhoto?: { name: string | null; at: string };
}

export interface Ticket {
  id: string;
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type: string;
  enrichment?: EventEnrichment | null;
}

export interface TicketUpdate {
  title?: string;
  type?: string;
  datetime?: string;
  location?: string;
  reference?: string;
}

export interface TicketCreate {
  title: string;
  type: string;
  datetime: string;
  location?: string;
  reference?: string;
  city?: string;        // città (destinazione) — serve al rilevamento incastri
}

function emojiForType(type: string | undefined): string {
  switch (type?.toLowerCase()) {
    case "train":      return "🚆";
    case "flight":     return "✈️";
    case "concert":    return "🎤";
    case "hotel":      return "🏨";
    case "museum":     return "🏛️";
    case "restaurant": return "🍽️";
    default:           return "📌";
  }
}

// Interruttore multi-utente (Blocco C). DEVE valere "1": il livello dati
// interroga il DB "come utente" (client per-utente) e le policy RLS del database
// garantiscono la privacy.
// NIENTE PIU' RIPIEGO SILENZIOSO: se la variabile manca (o vale altro), db()
// LANCIA invece di tornare al client service-role. Un ripiego silenzioso
// significherebbe girare con "tutti vedono tutto" senza che nessuno se ne accorga:
// meglio un'app rotta e rumorosa che un'app che perde i dati fra utenti.
const MULTIUSER_RLS_RAW = process.env.MULTIUSER_RLS;
const MULTIUSER_RLS = MULTIUSER_RLS_RAW === "1";

async function db() {
  if (!MULTIUSER_RLS) {
    throw new Error(
      MULTIUSER_RLS_RAW === undefined || MULTIUSER_RLS_RAW === ""
        ? 'MULTIUSER_RLS mancante: rifiuto di girare senza isolamento dati (imposta MULTIUSER_RLS="1")'
        : `MULTIUSER_RLS="${MULTIUSER_RLS_RAW}" non valido: rifiuto di girare senza isolamento dati (l'unico valore accettato e' "1")`
    );
  }
  const u = await userDb();
  if (!u) throw new Error("Supabase: utente non autenticato");
  return u.db;
}

// Client service-role (scavalca RLS): SOLO compiti amministrativi senza sessione
// (i cron). NON e' piu' il ripiego di db(): sul percorso dati non va usato mai.
export function serviceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase: missing env vars (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Fetches upcoming events from Supabase, filtered by datetime > NOW()
 * and sorted by datetime ascending. Returns at most 20 records.
 * Excludes [PABLO]-tagged records to match the original Airtable behaviour.
 *
 * Safe to call only from Server Components or Route Handlers.
 */
export async function getUpcomingTickets(): Promise<Ticket[]> {
  try {
    const now = new Date().toISOString();
    // Prova col campo enrichment; se la colonna non esiste ancora, riprova senza,
    // così la home NON si rompe finché non crei la colonna `enrichment` su Supabase.
    let rows: Record<string, unknown>[];
    const first = await (await db())
      .from("tickets")
      .select("id, title, type, datetime, location, enrichment")
      .gt("datetime", now)
      .not("title", "ilike", "%[PABLO]%")
      .order("datetime", { ascending: true })
      .limit(20);
    if (first.error) {
      const retry = await (await db())
        .from("tickets")
        .select("id, title, type, datetime, location")
        .gt("datetime", now)
        .not("title", "ilike", "%[PABLO]%")
        .order("datetime", { ascending: true })
        .limit(20);
      if (retry.error) {
        console.error("Supabase: failed to fetch upcoming tickets:", retry.error.message);
        return [];
      }
      rows = (retry.data ?? []) as unknown as Record<string, unknown>[];
    } else {
      rows = (first.data ?? []) as unknown as Record<string, unknown>[];
    }

    return rows.map((row) => ({
      id:       row.id as string,
      emoji:    emojiForType(row.type as string | undefined),
      title:    (row.title as string) ?? "Untitled",
      datetime: (row.datetime as string) ?? "",
      location: (row.location as string) ?? "",
      type:     ((row.type as string) ?? "").toLowerCase(),
      enrichment: (row.enrichment as EventEnrichment | null) ?? null,
    }));
  } catch (err) {
    console.error("Supabase: failed to fetch upcoming tickets:", err);
    return [];
  }
}

export async function deleteTicketById(id: string): Promise<void> {
  const { error } = await (await db()).from("tickets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateTicketById(id: string, fields: TicketUpdate): Promise<void> {
  const patch: Record<string, string> = {};
  if (fields.title    !== undefined) patch.title    = fields.title;
  if (fields.type     !== undefined) patch.type     = fields.type;
  if (fields.datetime !== undefined) patch.datetime = romeNaiveToUtcIso(fields.datetime);
  if (fields.location !== undefined) patch.location = fields.location;
  if (fields.reference !== undefined && fields.reference.length > 0)
    patch.reference = fields.reference;

  if (Object.keys(patch).length === 0) throw new Error("No fields to update");

  const { error } = await (await db()).from("tickets").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/* FIX FUSO ORARIO (bug "due ore avanti").
 * Il parser produce l'ora SENZA fuso (es. "2026-07-04T08:48:00") intendendo
 * l'ora ITALIANA, ma la colonna è timestamptz: senza fuso, Postgres la legge
 * come UTC e l'app (che converte UTC→Roma per mostrarla) aggiunge +2h.
 * Qui, se manca il fuso, interpretiamo l'ora come Europe/Rome e salviamo
 * l'istante UTC corretto. Se il fuso c'è già (Z o +hh:mm), non tocchiamo nulla. */
function romeNaiveToUtcIso(datetime: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(datetime)) return datetime; // formato ignoto: com'è
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(datetime)) return datetime;          // fuso già presente
  const guess = new Date(datetime + (datetime.length === 16 ? ":00" : "") + "Z"); // finta UTC
  // Offset di Roma calcolato confrontando due letture della STESSA data
  // (una in UTC, una in Europe/Rome): robusto qualunque sia il fuso del server.
  const utcView = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  const romeView = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Rome" }));
  const offset = romeView.getTime() - utcView.getTime(); // es. +2h d'estate
  return new Date(guess.getTime() - offset).toISOString();
}

/** C'e' gia' questo evento in agenda? Restituisce l'id del biglietto esistente.
 *
 *  Due eventi sono lo stesso quando: stessa data e ora ESATTA e stesso titolo
 *  (maiuscole/minuscole non contano), oppure stesso codice di prenotazione.
 *  Il confronto e' sul DATO, non sul tempo trascorso: la stessa frase rimandata
 *  domani trova lo stesso doppione di oggi.
 *
 *  Solo SELECT, e passa dal client con la RLS come tutto il resto: vede quindi
 *  soltanto i biglietti di chi sta chiedendo. */
export async function findDuplicateTicket(fields: {
  title: string;
  datetime: string | null;
  reference?: string | null;
}): Promise<{ id: string } | null> {
  const client = await db();
  const riferimento = (fields.reference ?? "").trim();

  // 1) Il codice di prenotazione, quando c'e', e' la prova piu' forte: due
  //    biglietti con lo stesso PNR sono lo stesso biglietto.
  if (riferimento) {
    const { data } = await client.from("tickets").select("id").eq("reference", riferimento).limit(1);
    const trovato = (data ?? [])[0] as { id: string } | undefined;
    if (trovato) return { id: trovato.id };
  }

  // 2) Altrimenti stessa ora esatta + stesso titolo. Si filtra per data in SQL
  //    (poche righe: gli eventi alla stessa ora esatta si contano sulle dita) e
  //    si confronta il titolo qui, senza distinzione fra maiuscole e minuscole.
  const titolo = (fields.title ?? "").trim();
  if (!fields.datetime || !titolo) return null;
  const quando = romeNaiveToUtcIso(fields.datetime);
  const { data } = await client
    .from("tickets")
    .select("id, title")
    .eq("datetime", quando)
    .limit(20);
  const uguale = ((data ?? []) as { id: string; title: string }[]).find(
    (t) => (t.title ?? "").trim().toLowerCase() === titolo.toLowerCase()
  );
  return uguale ? { id: uguale.id } : null;
}

export async function createTicket(fields: TicketCreate): Promise<{ id: string }> {
  const { data, error } = await (await db())
    .from("tickets")
    .insert({
      user_id:   await currentUserId(),
      title:     fields.title,
      type:      fields.type,
      datetime:  fields.datetime ? romeNaiveToUtcIso(fields.datetime) : null,
      location:  fields.location  ?? null,
      reference: fields.reference ?? null,
      city:      fields.city      ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id };
}

/* ===================== DIETA ===================== */
// Il piano dieta è un'unica riga (app single-user) con la settimana in JSON.
// week = { "lun": [{ pasto, contenuto }], "mar": [...], ... , "dom": [...] }

// Un pasto ha un nome e una o più alternative ("opzioni"): l'utente ne vede una
// e può scambiarla con le altre. Es. { pasto: "Colazione", opzioni: ["Yogurt+cereali", "Pane+marmellata"] }
export type DietMeal = { pasto: string; opzioni: string[] };
export type DietWeek = Record<string, DietMeal[]>;
export interface DietPlan {
  week: DietWeek;
  updatedAt: string | null;
}

/** Legge il piano dieta salvato (la riga più recente). null se non c'è ancora. */
export async function getDietPlan(): Promise<DietPlan | null> {
  const { data, error } = await (await db())
    .from("diet_plan")
    .select("week, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Supabase: failed to fetch diet plan:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    week: (data.week as DietWeek) ?? {},
    updatedAt: (data.updated_at as string) ?? null,
  };
}

/** Sostituisce il piano dieta: cancella la vecchia riga e ne scrive una nuova. */
export async function saveDietPlan(week: DietWeek): Promise<void> {
  const client = (await db());
  // Cancella tutte le righe esistenti (Supabase richiede un filtro: id != uuid-impossibile).
  await client.from("diet_plan").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await client.from("diet_plan").insert({ week, user_id: await currentUserId() });
  if (error) throw new Error(error.message);
}

/** Elimina il piano dieta salvato (svuota la tabella). */
export async function deleteDietPlan(): Promise<void> {
  const { error } = await (await db())
    .from("diet_plan")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
}

/* ===================== ALLENAMENTO ===================== */
// Stesso schema della dieta: il piano è un'unica riga (app single-user) con la
// settimana in JSON. Il monitoraggio ("mi sono allenato oggi") sta in una
// seconda tabella, una riga per giorno allenato.
//
// week = { "lun": { titolo, esercizi: [{ nome, dettaglio }] }, ... , "dom": {...} }
// Giorno di riposo = esercizi: [].

export type WorkoutExercise = { nome: string; dettaglio: string };
export type WorkoutDay = { titolo?: string; esercizi: WorkoutExercise[] };
export type WorkoutWeek = Record<string, WorkoutDay>;
export interface WorkoutPlan {
  week: WorkoutWeek;
  updatedAt: string | null;
}

/** Legge la scheda salvata (la riga più recente). null se non c'è ancora. */
export async function getWorkoutPlan(): Promise<WorkoutPlan | null> {
  const { data, error } = await (await db())
    .from("workout_plan")
    .select("week, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Supabase: failed to fetch workout plan:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    week: (data.week as WorkoutWeek) ?? {},
    updatedAt: (data.updated_at as string) ?? null,
  };
}

/** Sostituisce la scheda: cancella la vecchia riga e ne scrive una nuova. */
export async function saveWorkoutPlan(week: WorkoutWeek): Promise<void> {
  const client = (await db());
  // Delete richiede un filtro: prendo tutte le righe con updated_at non nullo.
  await client.from("workout_plan").delete().not("updated_at", "is", null);
  const { error } = await client.from("workout_plan").insert({ week, user_id: await currentUserId() });
  if (error) throw new Error(error.message);
}

/** Elimina la scheda salvata (svuota la tabella). */
export async function deleteWorkoutPlan(): Promise<void> {
  const { error } = await (await db())
    .from("workout_plan")
    .delete()
    .not("updated_at", "is", null);
  if (error) throw new Error(error.message);
}

/** Date (YYYY-MM-DD) dei giorni in cui l'utente si è allenato. */
export async function getTrainedDays(): Promise<string[]> {
  const { data, error } = await (await db()).from("workout_log").select("day");
  if (error) {
    console.error("Supabase: failed to fetch trained days:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => (row.day as string) ?? "")
    .filter(Boolean);
}

/** Segna/desegna un giorno come allenato. done=true → upsert; false → delete. */
export async function setTrainedDay(day: string, done: boolean): Promise<void> {
  const client = (await db());
  if (done) {
    const { error } = await client.from("workout_log").upsert({ day, user_id: await currentUserId() }, { onConflict: MULTIUSER_RLS ? "user_id,day" : "day" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client.from("workout_log").delete().eq("day", day);
    if (error) throw new Error(error.message);
  }
}

/* ---------------------- SEDUTE VERE (S3) ----------------------------------
 * `workout_plan` dice cosa DOVREI fare, `workout_log` dice SE mi sono allenato.
 * Qui sotto c'e' cosa ho fatto DAVVERO: seduta per seduta, serie per serie.
 * Tutto aggiuntivo — le funzioni qui sopra non cambiano di una virgola.
 * Tabelle: docs/sql/allenamento_sessioni.sql (da eseguire su Supabase).
 * -------------------------------------------------------------------------- */

export interface WorkoutSetRow {
  id: string;
  esercizio: string;
  serie: number | null;
  ripetizioni: number | null;
  pesoKg: number | null;
  /** LA DURATA. Si riusa: non se ne aggiunge un'altra. */
  secondi: number | null;
  fatica: number | null;
  /* Oltre i chili: una serie di corsa non ha ripetizioni e una di nuoto non ha
     peso. Le serie registrate prima di questo lavoro sono tutte `pesi` e hanno
     i tre campi nuovi vuoti, quindi si continuano a leggere come prima. */
  disciplina: string | null;
  distanzaM: number | null;
  bpmMedio: number | null;
  dislivelloM: number | null;
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  day: string;                 // YYYY-MM-DD
  titolo: string | null;
  startedAt: string;
  endedAt: string | null;      // null = seduta ancora aperta
  sensazione: string | null;
  note: string | null;
  /* Da dove nasce la seduta: 'scheda' se segue il piano del preparatore,
     'libera' se te la sei aperta tu (una corsa, una lezione, un video).
     La scheda e' un PIANO, le sedute sono FATTI, e i fatti possono esistere
     senza il piano: era il buco per cui chi corre per conto suo risultava
     assente proprio i giorni in cui si e' allenato.
     Le sedute registrate prima del 13 agosto 2026 sono tutte 'scheda'. */
  origine: string;
  sets: WorkoutSetRow[];
}

/** Input di una serie. Tutto facoltativo tranne il nome dell'esercizio:
 *  la corsa non ha ripetizioni, il plank non ha peso, il corpo libero neanche. */
export interface WorkoutSetInput {
  esercizio: string;
  serie?: number;
  ripetizioni?: number;
  pesoKg?: number;
  secondi?: number;            // la durata
  fatica?: number;             // 1-10
  disciplina?: string;         // pesi | corsa | nuoto | bici | camminata | remo | altro
  distanzaM?: number;
  bpmMedio?: number;
  dislivelloM?: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toSet(r: any): WorkoutSetRow {
  return {
    id: r.id as string,
    esercizio: (r.esercizio as string) ?? "",
    serie: r.serie ?? null,
    ripetizioni: r.ripetizioni ?? null,
    pesoKg: r.peso_kg === null || r.peso_kg === undefined ? null : Number(r.peso_kg),
    secondi: r.secondi ?? null,
    fatica: r.fatica ?? null,
    // Le righe vecchie hanno la colonna a `pesi` (l'ha marcata Matteo); se per
    // qualunque motivo fosse vuota, chi legge ripiega su `pesi` lo stesso.
    disciplina: (r.disciplina as string) ?? null,
    distanzaM: r.distanza_m ?? null,
    bpmMedio: r.bpm_medio ?? null,
    dislivelloM: r.dislivello_m ?? null,
    createdAt: (r.created_at as string) ?? "",
  };
}

function toSession(r: any, sets: WorkoutSetRow[]): WorkoutSession {
  return {
    id: r.id as string,
    day: (r.day as string) ?? "",
    titolo: (r.titolo as string) ?? null,
    startedAt: (r.started_at as string) ?? "",
    endedAt: (r.ended_at as string) ?? null,
    /* Le sedute registrate prima che la colonna esistesse tornano `null`:
       valgono 'scheda', che e' quello che erano. */
    origine: (r.origine as string) ?? "scheda",
    sensazione: (r.sensazione as string) ?? null,
    note: (r.note as string) ?? null,
    sets,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Apre una seduta e restituisce il suo id (serve per attaccarci le serie).
 *  Se ce n'e' gia' una aperta oggi la riusa, cosi' chiudere l'app e riaprirla
 *  non crea due sedute per lo stesso allenamento. */
export async function startSession(day: string, titolo?: string, origine: "scheda" | "libera" = "scheda"): Promise<string> {
  const client = await db();
  const aperta = await getOpenSession();
  if (aperta && aperta.day === day) return aperta.id;

  const { data, error } = await client
    .from("workout_session")
    .insert({ day, titolo: titolo ?? null, origine, user_id: await currentUserId() })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Registra una serie dentro una seduta. Restituisce l'id della serie
 *  (serve se poi la vuoi correggere o cancellare). */
export async function logSet(sessionId: string, set: WorkoutSetInput): Promise<string> {
  const { data, error } = await (await db())
    .from("workout_set")
    .insert({
      session_id: sessionId,
      user_id: await currentUserId(),
      esercizio: set.esercizio,
      serie: set.serie ?? null,
      ripetizioni: set.ripetizioni ?? null,
      peso_kg: set.pesoKg ?? null,
      secondi: set.secondi ?? null,
      fatica: set.fatica ?? null,
      disciplina: set.disciplina ?? "pesi",
      distanza_m: set.distanzaM ?? null,
      bpm_medio: set.bpmMedio ?? null,
      dislivello_m: set.dislivelloM ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Cancella una serie sbagliata (capita di battere 400 invece di 40). */
export async function deleteSet(setId: string): Promise<void> {
  const { error } = await (await db()).from("workout_set").delete().eq("id", setId);
  if (error) throw new Error(error.message);
}

/** Chiude la seduta. `sensazione` e `note` sono facoltative. */
export async function endSession(
  sessionId: string,
  extra?: { sensazione?: string; note?: string },
): Promise<void> {
  const { error } = await (await db())
    .from("workout_session")
    .update({
      ended_at: new Date().toISOString(),
      ...(extra?.sensazione !== undefined ? { sensazione: extra.sensazione } : {}),
      ...(extra?.note !== undefined ? { note: extra.note } : {}),
    })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}

/** La seduta ancora aperta (ended_at vuoto), se c'e'. Con le sue serie dentro,
 *  cosi' riaprendo l'app ritrovi l'allenamento dove l'avevi lasciato. */
export async function getOpenSession(): Promise<WorkoutSession | null> {
  const client = await db();
  const { data, error } = await client
    .from("workout_session")
    .select("id, day, titolo, started_at, ended_at, sensazione, note, origine")
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Supabase: failed to fetch open session:", error.message);
    return null;
  }
  if (!data) return null;

  const { data: sets } = await client
    .from("workout_set")
    .select("id, esercizio, serie, ripetizioni, peso_kg, secondi, fatica, disciplina, distanza_m, bpm_medio, dislivello_m, created_at")
    .eq("session_id", data.id)
    .order("created_at", { ascending: true });
  return toSession(data, (sets ?? []).map(toSet));
}

/** La seduta di UN giorno preciso (aperta o gia' chiusa), con le sue serie.
 *  Serve alla pagina allenamento per mostrare cosa hai fatto DAVVERO oggi,
 *  invece delle vecchie spunte che vivevano solo dentro un telefono. */
export async function getSessionByDay(day: string): Promise<WorkoutSession | null> {
  const client = await db();
  const { data, error } = await client
    .from("workout_session")
    .select("id, day, titolo, started_at, ended_at, sensazione, note, origine")
    .eq("day", day)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("Supabase: failed to fetch session by day:", error.message);
    return null;
  }
  if (!data) return null;

  const { data: sets } = await client
    .from("workout_set")
    .select("id, esercizio, serie, ripetizioni, peso_kg, secondi, fatica, disciplina, distanza_m, bpm_medio, dislivello_m, created_at")
    .eq("session_id", data.id)
    .order("created_at", { ascending: true });
  return toSession(data, (sets ?? []).map(toSet));
}

/** Le ultime sedute, dalla piu' recente, con le serie dentro. */
export async function getSessionHistory(limit = 10): Promise<WorkoutSession[]> {
  const client = await db();
  const { data, error } = await client
    .from("workout_session")
    .select("id, day, titolo, started_at, ended_at, sensazione, note, origine")
    .order("day", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Supabase: failed to fetch session history:", error.message);
    return [];
  }
  const sessions = data ?? [];
  if (sessions.length === 0) return [];

  // Una sola query per tutte le serie delle sedute trovate, poi le smisto:
  // meglio di N query, una per seduta.
  const { data: sets } = await client
    .from("workout_set")
    .select("id, session_id, esercizio, serie, ripetizioni, peso_kg, secondi, fatica, disciplina, distanza_m, bpm_medio, dislivello_m, created_at")
    .in("session_id", sessions.map((s) => s.id))
    .order("created_at", { ascending: true });

  const perSessione = new Map<string, WorkoutSetRow[]>();
  for (const r of sets ?? []) {
    const lista = perSessione.get(r.session_id as string) ?? [];
    lista.push(toSet(r));
    perSessione.set(r.session_id as string, lista);
  }
  return sessions.map((s) => toSession(s, perSessione.get(s.id as string) ?? []));
}

/* ═════════ LO STORICO, A PAGINE ═════════
 * `getSessionHistory` ha un tetto e basta: alla pagina Allenamento otto sedute
 * bastano, e caricarne quaranta con dentro tutte le serie appesantirebbe la
 * pagina per un dato che si guarda di rado.
 * La schermata dello storico invece scorre indietro nel tempo, e allora si
 * carica i SUOI dati: otto alla volta, altri otto quando arrivi in fondo. Chi
 * non apre quella schermata non paga niente.
 *
 * `prima` e' la data da cui continuare: si chiedono le sedute precedenti a
 * quella, non «la pagina numero 3». Un indice salterebbe o ripeterebbe una
 * seduta se nel frattempo ne nascesse una nuova — e una ne nasce ogni volta
 * che ti alleni. */
export async function getSessionPage(
  prima?: string | null,
  limit = 8,
): Promise<{ sedute: WorkoutSession[]; altre: boolean }> {
  const client = await db();
  let q = client
    .from("workout_session")
    .select("id, day, titolo, started_at, ended_at, sensazione, note, origine")
    .order("day", { ascending: false })
    .order("started_at", { ascending: false })
    // uno in piu' del necessario: se torna, vuol dire che ce ne sono altre.
    // Cosi' «altre» e' un fatto e non una stima sul numero di righe.
    .limit(limit + 1);
  if (prima) q = q.lt("day", prima);

  const { data, error } = await q;
  if (error) {
    console.error("Supabase: failed to fetch session page:", error.message);
    return { sedute: [], altre: false };
  }
  const righe = data ?? [];
  const altre = righe.length > limit;
  const sessions = altre ? righe.slice(0, limit) : righe;
  if (sessions.length === 0) return { sedute: [], altre: false };

  // Una sola query per tutte le serie della pagina, come nello storico corto.
  const { data: sets } = await client
    .from("workout_set")
    .select("id, session_id, esercizio, serie, ripetizioni, peso_kg, secondi, fatica, disciplina, distanza_m, bpm_medio, dislivello_m, created_at")
    .in("session_id", sessions.map((s) => s.id))
    .order("created_at", { ascending: true });

  const perSessione = new Map<string, WorkoutSetRow[]>();
  for (const r of sets ?? []) {
    const lista = perSessione.get(r.session_id as string) ?? [];
    lista.push(toSet(r));
    perSessione.set(r.session_id as string, lista);
  }
  return { sedute: sessions.map((s) => toSession(s, perSessione.get(s.id as string) ?? [])), altre };
}

/** L'ultima volta che hai fatto QUESTO esercizio: le serie di quella volta.
 *  E' la funzione che permette a Keiko di dirti "l'altra volta 3x8 con 40 kg"
 *  mentre stai per iniziare, invece di lasciarti tirare a indovinare. */
export async function getLastPerformance(esercizio: string): Promise<WorkoutSetRow[]> {
  const client = await db();
  const { data, error } = await client
    .from("workout_set")
    .select("session_id, created_at")
    .eq("esercizio", esercizio)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return [];

  const { data: sets } = await client
    .from("workout_set")
    .select("id, esercizio, serie, ripetizioni, peso_kg, secondi, fatica, disciplina, distanza_m, bpm_medio, dislivello_m, created_at")
    .eq("session_id", data.session_id)
    .eq("esercizio", esercizio)
    .order("created_at", { ascending: true });
  return (sets ?? []).map(toSet);
}

/* ===================== INCASTRI (viaggi) ===================== */
// Ponte tra la logica pura (lib/incastri.ts) e il database:
// legge i biglietti futuri, rileva i cluster "viaggio", e salva quelli che
// meritano un piano (fires=true) nella tabella trip_plans.
//
// Idempotenza: upsert su cluster_key. Se il viaggio esiste già, aggiorna solo
// città/date/biglietti e NON tocca status/plan (così una ricerca già fatta non
// viene persa). Un viaggio nuovo entra con status di default 'pending'.

export async function syncTripPlans(): Promise<{ clusters: number; upserted: number }> {
  const client = (await db());

  // Solo biglietti futuri, esclusi i [PABLO] come nel resto dell'app.
  const { data, error } = await client
    .from("tickets")
    .select("id, type, datetime, city")
    .gt("datetime", new Date().toISOString())
    .not("title", "ilike", "%[PABLO]%")
    .limit(200);

  if (error) throw new Error(error.message);

  const tickets: TicketInput[] = (data ?? []).map((r) => ({
    id:       r.id as string,
    type:     ((r.type as string) ?? "").toLowerCase(),
    datetime: (r.datetime as string) ?? "",
    city:     (r.city as string) ?? "",
  }));

  const clusters = detectClusters(tickets);
  const daPianificare = clusters.filter((c) => c.fires);

  // Stato attuale dei viaggi salvati: serve per capire se i biglietti di un
  // viaggio sono CAMBIATI rispetto a quando il piano è stato generato.
  const { data: esistenti } = await client
    .from("trip_plans")
    .select("cluster_key, status, ticket_ids, start_date");
  const perKey = new Map(
    (esistenti ?? []).map((r) => [r.cluster_key as string, r as { status: string; ticket_ids: string[]; start_date: string | null }])
  );

  let upserted = 0;
  for (const c of daPianificare) {
    const { error: upErr } = await client.from("trip_plans").upsert(
      {
        user_id:     await currentUserId(),
        cluster_key: c.clusterKey,
        city:        c.city,
        start_date:  c.startDate,
        end_date:    c.endDate,
        ticket_ids:  c.ticketIds,
      },
      { onConflict: MULTIUSER_RLS ? "user_id,cluster_key" : "cluster_key" }
    );
    if (upErr) throw new Error(upErr.message);
    upserted++;

    // Biglietti cambiati su un piano già pronto (es. hotel aggiunto dopo)?
    // → il piano è vecchio: torna 'pending' così viene rigenerato.
    const prima = perKey.get(c.clusterKey);
    const idsPrima = [...(prima?.ticket_ids ?? [])].sort().join(",");
    const idsOra = [...c.ticketIds].sort().join(",");
    if (prima && prima.status === "ready" && idsPrima !== idsOra) {
      await client.from("trip_plans").update({ status: "pending" }).eq("cluster_key", c.clusterKey);
    }
  }

  // Viaggi FUTURI il cui cluster non esiste più (es. treno eliminato, o date
  // cambiate → nuova cluster_key): via il fantasma, altrimenti resta in home.
  const keysAttuali = new Set(daPianificare.map((c) => c.clusterKey));
  const oggi = new Date().toISOString().slice(0, 10);
  for (const r of esistenti ?? []) {
    const row = r as { cluster_key: string; start_date: string | null };
    if (!keysAttuali.has(row.cluster_key) && row.start_date && row.start_date >= oggi) {
      await client.from("trip_plans").delete().eq("cluster_key", row.cluster_key);
    }
  }

  return { clusters: clusters.length, upserted };
}

// ---- Helper per la FASE PESANTE (arricchimento del piano) ----

export interface TripPlanRow {
  id: string;
  cluster_key: string;
  city: string;
  start_date: string | null;
  end_date: string | null;
  ticket_ids: string[];
  status: string;
  plan: unknown;
  searched_at: string | null;
}

export interface TicketDetail {
  id: string;
  title: string;
  type: string;
  datetime: string;
  location: string;
  city: string;
}

/** Legge un viaggio dato il suo cluster_key. */
export async function getTripPlanByKey(clusterKey: string): Promise<TripPlanRow | null> {
  const { data, error } = await (await db())
    .from("trip_plans")
    .select("*")
    .eq("cluster_key", clusterKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TripPlanRow) ?? null;
}

/** Chiavi dei viaggi ancora da arricchire (status = 'pending'). */
export async function getPendingTripPlanKeys(): Promise<string[]> {
  const { data, error } = await (await db())
    .from("trip_plans")
    .select("cluster_key")
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.cluster_key as string);
}

/** Dettagli dei biglietti che compongono un viaggio. */
export async function getTicketsByIds(ids: string[]): Promise<TicketDetail[]> {
  if (ids.length === 0) return [];
  const { data, error } = await (await db())
    .from("tickets")
    .select("id, title, type, datetime, location, city")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id:       r.id as string,
    title:    (r.title as string) ?? "",
    type:     ((r.type as string) ?? "").toLowerCase(),
    datetime: (r.datetime as string) ?? "",
    location: (r.location as string) ?? "",
    city:     (r.city as string) ?? "",
  }));
}

/** Salva il piano generato e segna il viaggio come 'ready'. */
export async function saveTripPlanResult(clusterKey: string, plan: unknown): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await (await db())
    .from("trip_plans")
    .update({ plan, status: "ready", searched_at: now, updated_at: now })
    .eq("cluster_key", clusterKey);
  if (error) throw new Error(error.message);
}

/** Viaggi con un piano pronto (status = 'ready'), per mostrarli nell'app. */
export async function getReadyTripPlans(): Promise<TripPlanRow[]> {
  const { data, error } = await (await db())
    .from("trip_plans")
    .select("*")
    .eq("status", "ready")
    .order("start_date", { ascending: true });
  if (error) {
    console.error("Supabase: getReadyTripPlans:", error.message);
    return [];
  }
  return (data ?? []) as TripPlanRow[];
}

/** Tutti i viaggi rilevati (pending/generating/ready), per mostrarli in home. */
export async function getAllTripPlans(): Promise<TripPlanRow[]> {
  const { data, error } = await (await db())
    .from("trip_plans")
    .select("*")
    .in("status", ["pending", "generating", "ready"])
    .order("start_date", { ascending: true });
  if (error) {
    console.error("Supabase: getAllTripPlans:", error.message);
    return [];
  }
  return (data ?? []) as TripPlanRow[];
}

/** Cambia lo stato di un viaggio (pending → generating → ready). */
export async function setTripPlanStatus(clusterKey: string, status: string): Promise<void> {
  const { error } = await (await db())
    .from("trip_plans")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("cluster_key", clusterKey);
  if (error) throw new Error(error.message);
}

/* ===================== DA GUARDARE (watchlist + catalogo) ===================== */
// Logica TV Time: la watchlist è la TUA lista (con "visto"), il catalogo è la
// cache delle ricerche approfondite fatte in background (vedi lib/films.ts).

export interface WatchItem {
  id: string;
  title: string;
  kind: string;          // 'film' | 'serie'
  info: string | null;   // es. "Commedia 2016 · su Netflix"
  link: string | null;
  seen: boolean;
  rating: number | null;  // voto personale (orche 1-5); null = non votato
  note: string | null;    // nota/recensione personale
  seen_at: string | null; // quando è stato segnato "visto" (per "guardati di recente")
  poster: string | null; // URL copertina (TMDB) — ora salvata in tabella
  genre: string | null;  // genere primario (TMDB) — ora salvato in tabella
  // Il titolo risolto UNA volta su TMDB, quando lo aggiungi. Con questi due
  // campi tutte le schede (trama, piattaforme, simili) guardano lo STESSO film,
  // e non serve più cercarlo per nome a ogni apertura.
  tmdbId: number | null;
  tmdbType: string | null;  // 'movie' | 'tv'
  year: string | null;
  // Serie: a che punto sei. Sui film restano tutti null e non cambia niente.
  season: number | null;         // stagione in corso
  episode: number | null;        // ultimo episodio visto di quella stagione
  totalSeasons: number | null;   // quanto e' lunga (da TMDB, tenuta in tabella)
  totalEpisodes: number | null;
  nextAirDate: string | null;    // quando esce il prossimo (YYYY-MM-DD)
}

/** Tutta la watchlist: prima i "da vedere" (più recenti in alto), poi i visti. */
export async function getWatchlist(): Promise<WatchItem[]> {
  // Colonne additive, a scalini: si prova la versione più ricca e si scende se
  // il database non ha ancora quelle colonne. Così un deploy PRIMA della SQL non
  // rompe la pagina — è lo stesso schema già usato per rating/note.
  //   1° tentativo: tutto, comprese le colonne TMDB
  //   2° tentativo: senza le TMDB (deploy fatto, SQL non ancora eseguita)
  //   3° tentativo: solo le colonne di sempre
  const base: string = "id, title, kind, info, link, seen";
  const conVoto = base + ", rating, note, seen_at";
  const conTmdb = conVoto + ", tmdb_id, tmdb_type, poster, genre, year";
  const conSerie = conTmdb + ", season, episode, total_seasons, total_episodes, next_air_date";
  const leggi = async (campi: string) =>
    (await db()).from("watchlist").select(campi).order("seen", { ascending: true }).order("created_at", { ascending: false });
  let res = await leggi(conSerie);
  if (res.error) res = await leggi(conTmdb);
  if (res.error) res = await leggi(conVoto);
  if (res.error) res = await leggi(base);
  if (res.error) {
    console.error("Supabase: getWatchlist:", res.error.message);
    return [];
  }
  const rows = (res.data ?? []) as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    title: (r.title as string) ?? "",
    kind: (r.kind as string) ?? "film",
    info: (r.info as string | null) ?? null,
    link: (r.link as string | null) ?? null,
    seen: r.seen === true,
    rating: (r.rating as number | null) ?? null,
    note: (r.note as string | null) ?? null,
    seen_at: (r.seen_at as string | null) ?? null,
    poster: (r.poster as string | null) ?? null,
    genre: (r.genre as string | null) ?? null,
    tmdbId: (r.tmdb_id as number | null) ?? null,
    tmdbType: (r.tmdb_type as string | null) ?? null,
    year: (r.year as string | null) ?? null,
    season: (r.season as number | null) ?? null,
    episode: (r.episode as number | null) ?? null,
    totalSeasons: (r.total_seasons as number | null) ?? null,
    totalEpisodes: (r.total_episodes as number | null) ?? null,
    nextAirDate: (r.next_air_date as string | null) ?? null,
  }));
}

/** Una riga sola della watchlist. Serve alla rotta del "+1 episodio", che deve
 *  sapere dov'era arrivato l'utente PRIMA di far avanzare il conto: il punto di
 *  partenza si legge dal database, mai dal client. */
export async function getWatchItem(id: string): Promise<WatchItem | null> {
  const tutti = await getWatchlist();
  return tutti.find((i) => i.id === id) ?? null;
}

/** Salva a che punto è una serie. Non lancia: se le colonne non ci sono ancora,
 *  l'errore finisce nei log e la serie continua a funzionare come oggi. */
export async function setWatchProgress(
  id: string,
  d: { season?: number | null; episode?: number | null; totalSeasons?: number | null; totalEpisodes?: number | null; nextAirDate?: string | null }
): Promise<boolean> {
  const patch: Record<string, unknown> = {};
  if (d.season !== undefined) patch.season = d.season;
  if (d.episode !== undefined) patch.episode = d.episode;
  if (d.totalSeasons !== undefined) patch.total_seasons = d.totalSeasons;
  if (d.totalEpisodes !== undefined) patch.total_episodes = d.totalEpisodes;
  if (d.nextAirDate !== undefined) patch.next_air_date = d.nextAirDate;
  if (!Object.keys(patch).length) return true;
  try {
    const { error } = await (await db()).from("watchlist").update(patch).eq("id", id);
    if (error) { console.error("Supabase: setWatchProgress:", error.message); return false; }
    return true;
  } catch (e) {
    console.error("Supabase: setWatchProgress:", e);
    return false;
  }
}

/** Scrive i dati TMDB su una riga già esistente (recupero dei titoli vecchi).
 *  Non lancia: è un miglioramento, non deve poter rompere la pagina. Se le
 *  colonne non ci sono ancora, l'errore finisce nei log e basta. */
export async function setWatchItemTmdb(
  id: string,
  d: { tmdbId?: number | null; tmdbType?: string | null; poster?: string | null; genre?: string | null; year?: string | null }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (d.tmdbId !== undefined) patch.tmdb_id = d.tmdbId;
  if (d.tmdbType !== undefined) patch.tmdb_type = d.tmdbType;
  if (d.poster !== undefined) patch.poster = d.poster;
  if (d.genre !== undefined) patch.genre = d.genre;
  if (d.year !== undefined) patch.year = d.year;
  if (!Object.keys(patch).length) return;
  try {
    const { error } = await (await db()).from("watchlist").update(patch).eq("id", id);
    if (error) console.error("Supabase: setWatchItemTmdb:", error.message);
  } catch (e) {
    console.error("Supabase: setWatchItemTmdb:", e);
  }
}

export async function addWatchItem(f: {
  title: string; kind?: string; info?: string | null; link?: string | null;
  // dati TMDB risolti una volta sola al momento dell'aggiunta
  tmdbId?: number | null; tmdbType?: string | null; poster?: string | null; genre?: string | null; year?: string | null;
}): Promise<WatchItem> {
  const comuni = { user_id: await currentUserId(), title: f.title, kind: f.kind ?? "film", info: f.info ?? null, link: f.link ?? null };
  const tmdb = { tmdb_id: f.tmdbId ?? null, tmdb_type: f.tmdbType ?? null, poster: f.poster ?? null, genre: f.genre ?? null, year: f.year ?? null };

  // Come in getWatchlist: si prova con le colonne nuove, e se il database non
  // le ha ancora si reinserisce senza. Un deploy prima della SQL continua a
  // salvare il titolo, solo senza i dati TMDB.
  const inserisci = async (riga: Record<string, unknown>, campi: string) =>
    (await db()).from("watchlist").insert(riga).select(campi).single();

  const campiRicchi = "id, title, kind, info, link, seen, tmdb_id, tmdb_type, poster, genre, year";
  let res = await inserisci({ ...comuni, ...tmdb }, campiRicchi);
  if (res.error) res = await inserisci(comuni, "id, title, kind, info, link, seen");
  if (res.error) throw new Error(res.error.message);

  // il `select` è una stringa scelta a runtime, quindi il tipo qui è generico
  const r = res.data as unknown as Record<string, unknown>;
  return {
    id: r.id as string,
    title: r.title as string,
    kind: (r.kind as string) ?? "film",
    info: (r.info as string | null) ?? null,
    link: (r.link as string | null) ?? null,
    seen: r.seen === true,
    rating: null,
    note: null,
    seen_at: null,
    poster: (r.poster as string | null) ?? null,
    genre: (r.genre as string | null) ?? null,
    tmdbId: (r.tmdb_id as number | null) ?? null,
    tmdbType: (r.tmdb_type as string | null) ?? null,
    year: (r.year as string | null) ?? null,
    season: null,
    episode: null,
    totalSeasons: null,
    totalEpisodes: null,
    nextAirDate: null,
  };
}

export async function setWatchItemSeen(id: string, seen: boolean): Promise<void> {
  const seenAt = seen ? new Date().toISOString() : null;
  // prova a salvare anche seen_at; se la colonna non esiste ancora, ripiega su solo `seen`
  let res = await (await db()).from("watchlist").update({ seen, seen_at: seenAt }).eq("id", id);
  if (res.error) res = await (await db()).from("watchlist").update({ seen }).eq("id", id);
  if (res.error) throw new Error(res.error.message);
}

export async function setWatchItemReview(id: string, rating: number | null, note: string | null): Promise<void> {
  const { error } = await (await db()).from("watchlist").update({ rating, note }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteWatchItem(id: string): Promise<void> {
  const { error } = await (await db()).from("watchlist").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Un titolo del catalogo cache (fase 2 di lib/films.ts). */
export interface CatalogFilm {
  title: string;
  kind: string;
  genres: string | null;
  platform: string | null;
  info: string | null;
  link: string | null;
}

/** Voci di catalogo fresche (ultimi 30 giorni): le info streaming invecchiano. */
export async function getFreshCatalog(limit = 60): Promise<CatalogFilm[]> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data, error } = await (await db())
    .from("films_catalog")
    .select("title, kind, genres, platform, info, link")
    .gte("cached_at", cutoff)
    .order("cached_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Supabase: getFreshCatalog:", error.message);
    return [];
  }
  return (data ?? []) as CatalogFilm[];
}

export async function saveCatalogFilms(films: CatalogFilm[]): Promise<void> {
  if (films.length === 0) return;
  const rows = films.map((f) => ({
    title: f.title,
    kind: f.kind,
    genres: f.genres,
    platform: f.platform,
    info: f.info,
    link: f.link,
  }));
  const { error } = await (await db()).from("films_catalog").insert(rows);
  if (error) throw new Error(error.message);
}

/* ===================== TO-DO (barra per-giorno) ===================== */
// Un to-do appartiene a un giorno (colonna `day`, formato YYYY-MM-DD).
// App single-user: si leggono tutti i to-do (sono pochi) e il client
// li raggruppa per giorno. Stesso accesso server-side delle altre tabelle.

export interface Todo {
  id: string;
  day: string;   // YYYY-MM-DD
  text: string;
  done: boolean;
  star: boolean;
  time: string | null;     // "HH:MM" — orario opzionale (abilita la notifica)
  location: string | null; // luogo vero risolto da Claude (nome + indirizzo)
  phone: string | null;    // telefono del posto, se trovato
  lead: number;            // minuti di anticipo della notifica (default 30)
  double: boolean;         // seconda notifica a ridosso (~15 min prima)?
  info: string | null;     // riga informativa (es. "Diretta Sky · differita TV8 18:30")
  link: string | null;     // link utile (es. classifica F1)
  linkLabel: string | null; // etichetta del bottone link
}

/** Ricerca base per la barra "Cerca in Keiko": eventi + to-do che contengono i termini.
 * Query semplice ilike su Supabase (title/location per gli eventi, text/location per i to-do). */
export async function searchEventsTodos(terms: string[]): Promise<{
  events: { id: string; title: string; type: string; datetime: string; location: string | null }[];
  todos: { id: string; text: string; day: string; time: string | null; location: string | null }[];
}> {
  const safe = terms.map((t) => t.replace(/[%,()]/g, "").trim()).filter((t) => t.length > 1);
  if (safe.length === 0) return { events: [], todos: [] };
  const evOr = safe.flatMap((t) => [`title.ilike.%${t}%`, `location.ilike.%${t}%`]).join(",");
  const tdOr = safe.flatMap((t) => [`text.ilike.%${t}%`, `location.ilike.%${t}%`]).join(",");
  const [ev, td] = await Promise.all([
    (await db()).from("tickets").select("id, title, type, datetime, location").or(evOr).order("datetime", { ascending: true }).limit(8),
    (await db()).from("todos").select("id, text, day, time, location").or(tdOr).order("day", { ascending: true }).limit(8),
  ]);
  return {
    events: (ev.data ?? []).map((r) => ({ id: r.id as string, title: (r.title as string) ?? "", type: (r.type as string) ?? "", datetime: (r.datetime as string) ?? "", location: (r.location as string) ?? null })),
    todos: (td.data ?? []).map((r) => ({ id: r.id as string, text: (r.text as string) ?? "", day: (r.day as string) ?? "", time: (r.time as string) ?? null, location: (r.location as string) ?? null })),
  };
}

/** Backup ricerche: registra cosa cerca l'utente (e se abbiamo trovato). Tabella `search_log`. */
export async function logSearch(q: string, found: boolean): Promise<void> {
  const { error } = await (await db()).from("search_log").insert({ q, found });
  if (error) console.warn("[search_log] insert fallito (creare la tabella?):", error.message);
}

/** Campi minimi di un evento per l'arricchimento AI. */
export async function getTicketForEnrich(id: string): Promise<{ title: string; type: string; datetime: string | null; location: string | null } | null> {
  const { data, error } = await (await db()).from("tickets").select("title, type, datetime, location").eq("id", id).single();
  if (error || !data) return null;
  return { title: data.title as string, type: (data.type as string) ?? "", datetime: (data.datetime as string) ?? null, location: (data.location as string) ?? null };
}

/** Salva l'arricchimento AI (summary + link) sull'evento. Colonna `enrichment` jsonb. */
export async function saveTicketEnrichment(id: string, enrichment: EventEnrichment): Promise<void> {
  const { error } = await (await db()).from("tickets").update({ enrichment }).eq("id", id);
  if (error) console.warn("[enrichment] save fallito (colonna `enrichment` creata?):", error.message);
}

// ── I BATTITI (docs/SPEC-BATTITI.md) ────────────────────────────────────────

/** Gli eventi che possono battere: quelli intorno a oggi, passati compresi.
 *  Il motore (lib/battiti.ts) decide chi batte davvero — qui si legge e basta,
 *  senza sapere niente di tipi e finestre. */
export async function getTicketsForBeats(
  giorniIndietro: number,
  giorniAvanti: number
): Promise<
  {
    id: string;
    title: string;
    type: string;
    datetime: string | null;
    location: string | null;
    beats: Record<string, string> | null;
    enrichment: EventEnrichment | null;
  }[]
> {
  const giorno = 24 * 60 * 60 * 1000;
  const da = new Date(Date.now() - giorniIndietro * giorno).toISOString();
  const a = new Date(Date.now() + giorniAvanti * giorno).toISOString();
  try {
    const { data, error } = await (await db())
      .from("tickets")
      .select("id, title, type, datetime, location, enrichment")
      .gte("datetime", da)
      .lte("datetime", a)
      .order("datetime", { ascending: false })
      .limit(60);
    if (error) {
      console.warn("[battiti] lettura eventi fallita:", error.message);
      return [];
    }
    return (data ?? []).map((r) => ({
      id: r.id as string,
      title: (r.title as string) ?? "",
      type: ((r.type as string) ?? "").toLowerCase(),
      datetime: (r.datetime as string) ?? null,
      location: (r.location as string) ?? null,
      beats: ((r.enrichment as EventEnrichment | null)?.beats as Record<string, string> | null) ?? null,
      enrichment: (r.enrichment as EventEnrichment | null) ?? null,
    }));
  } catch (e) {
    console.warn("[battiti] lettura eventi fallita:", e);
    return [];
  }
}

/** L'interruttore delle notifiche dei battiti. Acceso di default: se la
 *  colonna non c'è ancora (SQL non eseguita) la lettura fallisce e si risponde
 *  comunque `true`, così la funzione non si spegne per una migrazione mancante. */
export async function getBeatsPush(): Promise<boolean> {
  try {
    const { data, error } = await (await db()).from("profile").select("beats_push").maybeSingle();
    if (error) return true;
    return (data as { beats_push?: boolean } | null)?.beats_push !== false;
  } catch {
    return true;
  }
}

/** Accende o spegne le notifiche dei battiti. Le card in home non cambiano. */
export async function saveBeatsPush(acceso: boolean): Promise<void> {
  const userId = await currentUserId();
  const { error } = await (await db())
    .from("profile")
    .upsert({ user_id: userId, beats_push: acceso }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

/** Salva l'esito della ricerca della foto artista — anche quando è "niente".
 *  Stessa fusione di savePlacePhotoName: il resto di enrichment non si tocca. */
export async function saveArtistPhoto(
  id: string,
  url: string | null,
  chi?: { name?: string | null; fans?: number | null }
): Promise<void> {
  try {
    const client = await db();
    const { data } = await client.from("tickets").select("enrichment").eq("id", id).maybeSingle();
    const attuale = (data?.enrichment as EventEnrichment | null) ?? null;
    const nuovo = {
      ...(attuale ?? {}),
      artistPhoto: { url, name: chi?.name ?? null, fans: chi?.fans ?? null, checked_at: new Date().toISOString() },
    };
    const { error } = await client.from("tickets").update({ enrichment: nuovo }).eq("id", id);
    if (error) console.warn("[deezer] foto artista non salvata:", error.message);
  } catch (e) {
    console.warn("[deezer] foto artista non salvata:", e);
  }
}

/** Segna lo stato di UN battito dentro `enrichment.beats`, senza toccare il
 *  resto (summary, links, placePhoto). Legge, unisce, riscrive — come
 *  savePlacePhotoName. Non lancia mai: se fallisce, si è perso un segno, non
 *  un dato dell'utente. */
export async function saveBeatState(
  ticketId: string,
  battito: string,
  stato: "mostrato" | "chiuso" | "notificato"
): Promise<void> {
  try {
    const client = await db();
    const { data } = await client.from("tickets").select("enrichment").eq("id", ticketId).maybeSingle();
    const attuale = (data?.enrichment as EventEnrichment | null) ?? null;
    const beats = { ...(attuale?.beats ?? {}), [battito]: stato };
    const { error } = await client.from("tickets").update({ enrichment: { ...(attuale ?? {}), beats } }).eq("id", ticketId);
    if (error) console.warn("[battiti] stato non salvato:", error.message);
  } catch (e) {
    console.warn("[battiti] stato non salvato:", e);
  }
}

/** Salva SOLO il nome della foto del luogo dentro `enrichment`, senza toccare
 *  il resto (summary e link li scrive l'AI, e sovrascriverli sarebbe una
 *  perdita di dati). Legge, unisce, riscrive: succede una volta per evento.
 *  Non lancia mai: se fallisce, si è solo perso il risparmio, non la foto. */
export async function savePlacePhotoName(id: string, name: string | null): Promise<void> {
  try {
    const client = await db();
    const { data } = await client.from("tickets").select("enrichment").eq("id", id).maybeSingle();
    const attuale = (data?.enrichment as EventEnrichment | null) ?? null;
    const nuovo = { ...(attuale ?? {}), placePhoto: { name, at: new Date().toISOString() } };
    const { error } = await client.from("tickets").update({ enrichment: nuovo }).eq("id", id);
    if (error) console.warn("[places] nome foto non salvato:", error.message);
  } catch (e) {
    console.warn("[places] nome foto non salvato:", e);
  }
}

// ── CUCINA (docs/SPEC-CUCINA.md) ───────────────────────────────────────────
// Il ricettario: solo LINK a video che stanno su TikTok/YouTube, col titolo e
// la miniatura che l'oEmbed pubblico restituisce. Niente contenuto copiato.

/** La ricetta come l'ha scritta il creator, strutturata e basta.
 *  REGOLA FERREA (docs/SPEC-CUCINA.md §4): qui dentro ci sta SOLO quello che
 *  era scritto nella descrizione. Quantità assente = campo vuoto, mai dedotta.
 *  `insufficiente` è una risposta legittima e frequente: vuol dire che la
 *  ricetta sta nel video e il video si apre, punto. */
export interface RicettaEstratta {
  ingredienti?: { nome: string; quantita?: string }[];
  passi?: string[];
  tempo?: string | null;
  porzioni?: string | null;
  insufficiente?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
  author: string | null;
  platform: string;
  createdAt: string;
  /** null = mai estratta. Una volta estratta non si ripaga più. */
  extracted: RicettaEstratta | null;
  timesCooked: number;
}

const CAMPI_RECIPE = "id, title, url, thumbnail, author, platform, created_at";
const CAMPI_RECIPE_V2 = `${CAMPI_RECIPE}, extracted, times_cooked`;

function mappaRicetta(r: Record<string, unknown>): Recipe {
  return {
    id: r.id as string,
    title: (r.title as string) ?? "",
    url: (r.url as string) ?? "",
    thumbnail: (r.thumbnail as string) ?? null,
    author: (r.author as string) ?? null,
    platform: (r.platform as string) ?? "web",
    createdAt: (r.created_at as string) ?? "",
    extracted: (r.extracted as RicettaEstratta | null) ?? null,
    timesCooked: (r.times_cooked as number) ?? 0,
  };
}

/** Le ricette salvate, le più recenti in alto. [] se la tabella non c'è ancora:
 *  la pagina deve funzionare anche prima che la SQL sia stata eseguita.
 *
 *  Le colonne di V2 (`extracted`, `times_cooked`) si chiedono per prime e, se
 *  non ci sono ancora, si rilegge senza. Chiedere una colonna che non esiste
 *  fa fallire TUTTA la select: senza questo secondo giro, il ricettario
 *  sparirebbe dalla pagina fino all'esecuzione di docs/sql/cucina-v2.sql. */
export async function getRecipes(): Promise<Recipe[]> {
  try {
    const client = await db();
    const leggi = (campi: string) =>
      client.from("recipes").select(campi).order("created_at", { ascending: false }).limit(200);

    let { data, error } = await leggi(CAMPI_RECIPE_V2);
    if (error) {
      console.warn("[cucina] niente colonne V2, rileggo senza (hai eseguito docs/sql/cucina-v2.sql?):", error.message);
      ({ data, error } = await leggi(CAMPI_RECIPE));
    }
    if (error) {
      console.warn("[cucina] lettura ricettario fallita (hai eseguito docs/sql/cucina.sql?):", error.message);
      return [];
    }
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mappaRicetta);
  } catch (e) {
    console.warn("[cucina] lettura ricettario fallita:", e);
    return [];
  }
}

/** Mette via la ricetta estratta. Da qui in poi aprirla non costa più niente.
 *  Se la colonna non c'è ancora si perde il salvataggio, non la ricetta: chi
 *  chiama ha già il risultato in mano e lo mostra lo stesso. */
export async function saveExtracted(id: string, estratta: RicettaEstratta): Promise<void> {
  const { error } = await (await db()).from("recipes").update({ extracted: estratta }).eq("id", id);
  if (error) console.warn("[cucina] estrazione non salvata (docs/sql/cucina-v2.sql eseguito?):", error.message);
}

/** Salva una ricetta. Se c'è già (stesso link) non la duplica: la restituisce. */
export async function saveRecipe(r: {
  title: string;
  url: string;
  thumbnail?: string | null;
  author?: string | null;
  platform?: string | null;
}): Promise<Recipe> {
  const riga = {
    user_id: await currentUserId(),
    title: r.title.trim().slice(0, 300),
    url: r.url.trim(),
    thumbnail: r.thumbnail ?? null,
    author: r.author ?? null,
    platform: r.platform ?? "web",
  };
  const client = await db();
  const salva = (campi: string) =>
    client.from("recipes").upsert(riga, { onConflict: "user_id,url" }).select(campi).single();

  // Stesso doppio giro di getRecipes: prima con le colonne V2, poi senza.
  let { data, error } = await salva(CAMPI_RECIPE_V2);
  if (error) ({ data, error } = await salva(CAMPI_RECIPE));
  if (error) throw new Error(error.message);
  return mappaRicetta(data as unknown as Record<string, unknown>);
}

/** Toglie una ricetta dal ricettario. La RLS fa sì che si possa togliere solo
 *  la propria — ma se la riga non è tua la DELETE non fallisce: semplicemente
 *  non tocca niente. Senza guardare quante righe ha cancellato, l'app direbbe
 *  "fatto" a chi non ha cancellato nulla. Quindi si guarda. */
export async function deleteRecipe(id: string): Promise<boolean> {
  const { data, error } = await (await db()).from("recipes").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

/* ── LA SPESA (docs/SPEC-CUCINA.md §7) ─────────────────────────────────────
 *
 * Una lista sola, due provenienze che restano distinte: `piano` e `ricetta`.
 * Si comprano insieme perché si va al supermercato una volta, ma l'etichetta
 * dice sempre da dove viene una voce — e il piano resta in sola lettura.
 * Nessuna quantità viene calcolata: si copia quella scritta, o si lascia
 * vuota. */

export type FonteSpesa = "piano" | "ricetta";

export interface ShoppingItem {
  id: string;
  nome: string;
  quantita: string | null;
  fonte: FonteSpesa;
  ref: string | null;
  spuntato: boolean;
  createdAt: string;
}

function mappaSpesa(r: Record<string, unknown>): ShoppingItem {
  return {
    id: r.id as string,
    nome: (r.nome as string) ?? "",
    quantita: (r.quantita as string) ?? null,
    fonte: ((r.fonte as string) === "piano" ? "piano" : "ricetta") as FonteSpesa,
    ref: (r.ref as string) ?? null,
    spuntato: !!r.spuntato,
    createdAt: (r.created_at as string) ?? "",
  };
}

const CAMPI_SPESA = "id, nome, quantita, fonte, ref, spuntato, created_at";

/** La lista: da comprare in alto, spuntati in fondo. [] se la tabella non c'è
 *  ancora — la pagina non si rompe per una SQL non ancora eseguita. */
export async function getShoppingItems(): Promise<ShoppingItem[]> {
  try {
    const { data, error } = await (await db())
      .from("shopping_items")
      .select(CAMPI_SPESA)
      .order("spuntato", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      console.warn("[cucina] lettura spesa fallita (hai eseguito docs/sql/cucina-v2.sql?):", error.message);
      return [];
    }
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mappaSpesa);
  } catch (e) {
    console.warn("[cucina] lettura spesa fallita:", e);
    return [];
  }
}

/** Aggiunge voci. Quella che c'è già (stesso nome, stessa fonte) non si
 *  duplica: due ricette con la cipolla fanno una voce sola (idea 209).
 *  Torna la lista aggiornata, così chi chiama non deve rileggere. */
export async function addShoppingItems(
  voci: { nome: string; quantita?: string | null; fonte?: FonteSpesa; ref?: string | null }[]
): Promise<ShoppingItem[]> {
  const userId = await currentUserId();
  const righe = voci
    .map((v) => ({
      user_id: userId,
      nome: (v.nome ?? "").trim().slice(0, 120),
      quantita: (v.quantita ?? "").trim().slice(0, 60) || null,
      fonte: v.fonte ?? "ricetta",
      ref: v.ref ?? null,
    }))
    .filter((r) => r.nome.length > 0);
  if (righe.length === 0) return getShoppingItems();

  // ignoreDuplicates: chi c'è già resta com'è (magari l'hai già spuntato, e
  // riaggiungerlo non deve farlo tornare da comprare).
  const { error } = await (await db())
    .from("shopping_items")
    .upsert(righe, { onConflict: "user_id,nome,fonte", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return getShoppingItems();
}

/** Spunta / de-spunta una voce al supermercato. */
export async function toggleShoppingItem(id: string, spuntato: boolean): Promise<boolean> {
  const { data, error } = await (await db())
    .from("shopping_items")
    .update({ spuntato })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

/** Via i fatti. Cancella SOLO le righe già spuntate, e solo le proprie (RLS):
 *  non è una pulizia a pattern, è "togli quello che ho messo nel carrello". */
export async function clearDoneShoppingItems(): Promise<number> {
  const { data, error } = await (await db())
    .from("shopping_items")
    .delete()
    .eq("spuntato", true)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

/** Tutti i to-do, ordinati per giorno e poi per creazione. */
export async function getTodos(): Promise<Todo[]> {
  const { data, error } = await (await db())
    .from("todos")
    .select("id, day, text, done, star, time, location, phone, lead_minutes, double_reminder, info, link, link_label")
    .order("day", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase: failed to fetch todos:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id:   row.id as string,
    day:  (row.day as string) ?? "",
    text: (row.text as string) ?? "",
    done: row.done === true,
    star: row.star === true,
    // Postgres restituisce "HH:MM:SS" → teniamo solo "HH:MM"
    time: typeof row.time === "string" ? row.time.slice(0, 5) : null,
    location: (row.location as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    lead: typeof row.lead_minutes === "number" ? row.lead_minutes : 30,
    double: row.double_reminder === true,
    info: (row.info as string | null) ?? null,
    link: (row.link as string | null) ?? null,
    linkLabel: (row.link_label as string | null) ?? null,
  }));
}

/** Crea un to-do e lo restituisce (il client lo aggiunge subito alla lista).
 *  `time` è opzionale: se c'è, il cron manda la notifica 30 min prima.
 *  `location`/`phone`: luogo vero risolto da Claude (vedi lib/todo-place.ts). */
export async function createTodo(
  day: string,
  text: string,
  time?: string | null,
  location?: string | null,
  phone?: string | null,
  extra?: { info?: string | null; link?: string | null; linkLabel?: string | null }
): Promise<Todo> {
  const { data, error } = await (await db())
    .from("todos")
    .insert({
      user_id: await currentUserId(),
      day,
      text,
      time: time ?? null,
      location: location ?? null,
      phone: phone ?? null,
      info: extra?.info ?? null,
      link: extra?.link ?? null,
      link_label: extra?.linkLabel ?? null,
    })
    .select("id, day, text, done, star, time, location, phone, lead_minutes, double_reminder, info, link, link_label")
    .single();

  if (error) throw new Error(error.message);
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    day: row.day as string,
    text: row.text as string,
    done: row.done === true,
    star: row.star === true,
    time: typeof row.time === "string" ? row.time.slice(0, 5) : null,
    location: (row.location as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    lead: typeof row.lead_minutes === "number" ? row.lead_minutes : 30,
    double: row.double_reminder === true,
    info: (row.info as string | null) ?? null,
    link: (row.link as string | null) ?? null,
    linkLabel: (row.link_label as string | null) ?? null,
  };
}

/** Aggiorna done, star, time e/o impostazioni notifica di un to-do. */
export async function updateTodoById(
  id: string,
  fields: { done?: boolean; star?: boolean; time?: string | null; lead?: number; double?: boolean }
): Promise<void> {
  const patch: Record<string, boolean | string | number | null> = {};
  if (fields.done !== undefined) patch.done = fields.done;
  if (fields.star !== undefined) patch.star = fields.star;
  if (fields.lead !== undefined) patch.lead_minutes = fields.lead;
  if (fields.double !== undefined) patch.double_reminder = fields.double;
  if (fields.time !== undefined) patch.time = fields.time;
  // Orario o anticipo cambiati → azzera i "già notificato", così le
  // notifiche ripartono sui nuovi valori.
  if (fields.time !== undefined || fields.lead !== undefined) {
    patch.reminded_at = null;
    patch.reminded_imminent_at = null;
  }
  if (Object.keys(patch).length === 0) throw new Error("No fields to update");

  const { error } = await (await db()).from("todos").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Elimina un to-do. */
export async function deleteTodoById(id: string): Promise<void> {
  const { error } = await (await db()).from("todos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ============================================================================
// PROFILO (S1 rework allenamento) — il "seme" della personalizzazione,
// CONDIVISO tra allenamento e dieta. Tabella `profile` (una riga per utente).
// ============================================================================

export interface ProfileData {
  obiettivo: string | null;                             // 'dimagrire'|'massa'|'tonificare'|'forma'
  livello: string | null;                               // 'principiante'|'intermedio'|'avanzato'
  sessioni: { palestra?: number; corsa?: number } | null;
  vincoli: string | null;                               // testo libero (es. "ginocchio delicato")
  stile: string | null;                                 // 'duro'|'chill'
  updatedAt: string | null;
}

/** Profilo dell'utente loggato. null se non ancora compilato (o non loggato). */
export async function getProfile(): Promise<ProfileData | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await (await db())
    .from("profile")
    .select("obiettivo, livello, sessioni, vincoli, stile, updated_at")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("Supabase: failed to fetch profile:", error.message);
    return null;
  }
  if (!data) return null;
  // Riga vuota = profilo NON compilato. La riga può esistere senza che nessuno
  // abbia compilato niente, perché la crea `touchLastSeen()` (K9) per poter
  // contare chi apre l'app. Senza questo controllo l'onboarding di /allenamento
  // sparirebbe a chi non ha mai toccato la scheda.
  //
  // ATTENZIONE per chi passa di qui: "vuoto" si giudica SOLO sui campi della
  // scheda allenamento, quelli qui sotto. Le colonne di servizio della stessa
  // riga — `last_seen_at` (K9) e `onboarded_at` (K14b) — NON vanno contate:
  // si riempiono da sole senza che l'utente abbia compilato niente, e includerle
  // farebbe sparire l'onboarding di /allenamento a chi non ha mai fatto la scheda.
  // Per lo stesso motivo la select qui sopra non le chiede nemmeno.
  const campiScheda = [data.obiettivo, data.livello, data.sessioni, data.vincoli, data.stile];
  if (campiScheda.every((c) => !c)) return null;
  return {
    obiettivo: (data.obiettivo as string) ?? null,
    livello: (data.livello as string) ?? null,
    sessioni: (data.sessioni as ProfileData["sessioni"]) ?? null,
    vincoli: (data.vincoli as string) ?? null,
    stile: (data.stile as string) ?? null,
    updatedAt: (data.updated_at as string) ?? null,
  };
}

/** Salva/aggiorna il profilo: i campi non passati restano quelli già salvati. */
export async function saveProfile(patch: Partial<Omit<ProfileData, "updatedAt">>): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Supabase: utente non autenticato");
  const cur = await getProfile();
  const row = {
    user_id: uid,
    obiettivo: patch.obiettivo ?? cur?.obiettivo ?? null,
    livello: patch.livello ?? cur?.livello ?? null,
    sessioni: patch.sessioni ?? cur?.sessioni ?? null,
    vincoli: patch.vincoli ?? cur?.vincoli ?? null,
    stile: patch.stile ?? cur?.stile ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await (await db()).from("profile").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

// ============================================================================
// K9 — LA RIGA DEI NUMERI
// `touch_last_seen` (docs/sql/last_seen.sql) scrive al massimo una volta al
// giorno per persona: si protegge da sola dalle scritture ripetute.
// ============================================================================

/** Segna che l'utente loggato ha aperto Keiko. Non lancia mai: è contabilità,
 *  non deve poter rompere l'apertura dell'app. */
export async function touchLastSeen(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  try {
    const sb = serviceDb();
    // La funzione aggiorna una riga di `profile`. Chi non ha mai compilato il
    // profilo quella riga non ce l'ha, e non verrebbe contato mai: qui la si
    // crea vuota. `getProfile()` continua a leggerla come "non compilato",
    // quindi l'onboarding di /allenamento non cambia.
    // ignoreDuplicates = INSERT ... ON CONFLICT DO NOTHING: non tocca chi c'è già.
    const { error: creata } = await sb
      .from("profile")
      .upsert({ user_id: uid }, { onConflict: "user_id", ignoreDuplicates: true });
    if (creata) console.error("K9: riga profilo non creata:", creata.message);

    const { error } = await sb.rpc("touch_last_seen", { p_user: uid });
    if (error) console.error("K9: touch_last_seen fallita:", error.message);
  } catch (e) {
    console.error("K9: touch_last_seen fallita:", e);
  }
}

// ── Gli abbonamenti dell'utente (ricerca trasversale) ───────────────────────
// Stanno sulla stessa riga di `profile`, in una colonna `platforms` (text[]).
// Come per onboarded_at, si leggono e si scrivono a parte da getProfile(): una
// riga con la sola lista degli abbonamenti conta comunque come "scheda
// allenamento non compilata", e getProfile risponderebbe null.

/** Le piattaforme a cui l'utente dice di essere abbonato. [] se non l'ha detto. */
export async function getPlatforms(): Promise<string[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  try {
    const { data, error } = await (await db())
      .from("profile")
      .select("platforms")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      console.error("Abbonamenti: lettura fallita:", error.message);
      return [];   // colonna non ancora creata: si fa finta che non ne abbia
    }
    const p = data?.platforms;
    return Array.isArray(p) ? (p as string[]) : [];
  } catch (e) {
    console.error("Abbonamenti: lettura fallita:", e);
    return [];
  }
}

/** Salva la lista. La riga di profilo viene creata se non c'è. */
export async function savePlatforms(platforms: string[]): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Supabase: utente non autenticato");
  const { error } = await (await db())
    .from("profile")
    .upsert({ user_id: uid, platforms }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

// ── K14b — "l'onboarding l'ho già fatto" ────────────────────────────────────
// Va ricordato sul SERVER, non sul telefono: su iPhone l'app aperta dall'icona
// ha uno storage tutto suo, separato da Safari. Chi fa l'onboarding nel browser,
// installa e apre dall'icona, senza questo se lo ritroverebbe da capo.

/** Quando l'utente ha finito l'onboarding, o null se non l'ha mai finito.
 *  Legge SOLO quella colonna: `getProfile()` non va bene, perché una riga con
 *  la scheda allenamento vuota la considera (giustamente) "profilo non
 *  compilato" e tornerebbe null anche a chi l'onboarding l'ha finito. */
export async function getOnboardedAt(): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  try {
    const { data, error } = await (await db())
      .from("profile")
      .select("onboarded_at")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      console.error("K14b: lettura onboarded_at fallita:", error.message);
      return null;   // nel dubbio si rifà l'onboarding: meglio di una home muta
    }
    return (data?.onboarded_at as string) ?? null;
  } catch (e) {
    console.error("K14b: lettura onboarded_at fallita:", e);
    return null;
  }
}

/** Segna che l'onboarding è finito. `mark_onboarded` crea da sé la riga di
 *  profilo se manca (verificato), quindi vale anche per chi non ha mai
 *  compilato la scheda allenamento. */
export async function markOnboarded(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Supabase: utente non autenticato");
  const { error } = await serviceDb().rpc("mark_onboarded", { p_user: uid });
  if (error) throw new Error(error.message);
}

export interface Numeri {
  iscritti: number;
  attivi7: number;
  attivi30: number;
  conContenuti: number;
}

/** I quattro numeri. Legge con la service-role: deve vedere TUTTI gli utenti,
 *  non solo chi guarda. La schermata che la usa è visibile al solo proprietario. */
export async function getNumeri(): Promise<Numeri> {
  const sb = serviceDb();
  const da = (giorni: number) => new Date(Date.now() - giorni * 24 * 60 * 60 * 1000).toISOString();

  const [tutti, a7, a30, tickets, diete, schede] = await Promise.all([
    sb.from("profile").select("*", { count: "exact", head: true }),
    sb.from("profile").select("*", { count: "exact", head: true }).gt("last_seen_at", da(7)),
    sb.from("profile").select("*", { count: "exact", head: true }).gt("last_seen_at", da(30)),
    sb.from("tickets").select("user_id"),
    sb.from("diet_plan").select("user_id"),
    sb.from("workout_plan").select("user_id"),
  ]);

  // "quanti hanno caricato qualcosa": l'unione delle tre tabelle, contata una
  // volta per persona (chi ha eventi E dieta conta uno).
  const con = new Set<string>();
  for (const r of [tickets, diete, schede]) {
    for (const riga of (r.data ?? []) as { user_id: string | null }[]) {
      if (riga.user_id) con.add(riga.user_id);
    }
  }

  return {
    iscritti: tutti.count ?? 0,
    attivi7: a7.count ?? 0,
    attivi30: a30.count ?? 0,
    conContenuti: con.size,
  };
}

// ============================================================================
// CONSENSI (K2/K14) — tabella `consents`. Nessuno dei due è obbligatorio:
// senza 'salute' Keiko funziona, solo senza Dieta e Allenamento.
// La revoca non cancella la riga: la mette a `accettato = false`, così resta
// scritto da quando. Vedi docs/sql/consents.sql.
// ============================================================================

/** La versione del testo mostrato all'utente. Si cambia SOLO se cambia il testo. */
export const VERSIONE_CONSENSI = "2026-08-04";

export type TipoConsenso = "salute" | "email";

export interface Consenso {
  tipo: TipoConsenso;
  accettato: boolean;
  versioneTesto: string;
  quando: string;
}

/** I consensi dell'utente loggato. Chi non ha mai risposto non ha righe. */
export async function getConsents(): Promise<Consenso[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await (await db())
    .from("consents")
    .select("tipo, accettato, versione_testo, timestamp")
    .eq("user_id", uid);
  if (error) {
    console.error("Supabase: failed to fetch consents:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    tipo: r.tipo as TipoConsenso,
    accettato: r.accettato === true,
    versioneTesto: (r.versione_testo as string) ?? "",
    quando: (r.timestamp as string) ?? "",
  }));
}

/** Segna un consenso come dato o revocato. La riga resta: cambia lo stato. */
export async function setConsent(tipo: TipoConsenso, accettato: boolean): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Supabase: utente non autenticato");
  const { error } = await (await db()).from("consents").upsert(
    {
      user_id: uid,
      tipo,
      accettato,
      versione_testo: VERSIONE_CONSENSI,
      timestamp: new Date().toISOString(),
    },
    { onConflict: "user_id,tipo" }
  );
  if (error) throw new Error(error.message);
}

// ============================================================================
// K4 — "CANCELLA TUTTI I MIEI DATI"
//
// Cancella davvero tutto quello che l'app sa di UNA persona, e solo di quella.
// Due reti indipendenti, perché qui sbagliare vuol dire cancellare i dati di
// qualcun altro:
//   1) il client è quello "come utente" (token firmato): le policy RLS del
//      database lasciano toccare solo le righe con user_id = auth.uid();
//   2) ogni DELETE porta comunque `.eq("user_id", uid)` scritto a mano.
// Se una delle due si rompesse, l'altra regge da sola. Verificato con un terzo
// utente finto: con il token di A e l'uid di B non sparisce nessuna riga di B.
//
// `usage` (il contatore del tetto AI, K6) è fuori da questo giro: è invisibile
// agli utenti (nessuna policy), quindi la svuota il client di servizio con il
// filtro sull'utente scritto a mano.
//
// Restano fuori di proposito:
//   `films_catalog`   — cache dei film, condivisa, nessun dato personale
//   `notification_runs` — registro del cron, nessun dato personale
//   `search_log`      — non ha `user_id`: non è cancellabile per persona (K70)
// ============================================================================

/** Le tabelle con dati personali, nell'ordine in cui si svuotano
 *  (i figli prima dei genitori: `workout_set` prima di `workout_session`). */
export const TABELLE_PERSONALI = [
  "tickets",            // eventi
  "todos",              // to-do
  "watchlist",          // da guardare
  "diet_plan",          // dieta
  "workout_plan",       // scheda
  "workout_log",        // giorni allenati
  "workout_set",        // le serie vere
  "workout_session",    // le sedute
  "trip_plans",         // itinerari
  "trips",              // viaggi (tabella storica, può non esserci più)
  "push_subscriptions", // notifiche
  "profile",            // obiettivo, livello, vincoli
  "consents",           // consensi dati e revoche
] as const;

export interface EsitoCancellazione {
  tabella: string;
  righe: number;
  saltata?: string;  // la tabella non esiste su questo database: niente da fare
  errore?: string;
}

/** true se l'errore è "questa tabella non esiste", non un guasto vero. */
function tabellaAssente(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return code === "42P01" || code === "PGRST205" || msg.includes("does not exist") || msg.includes("schema cache");
}

/** Il motore vero. Sta a parte da `deleteAllMyData()` così si può provare fuori
 *  da una richiesta HTTP (script di verifica) senza toccare i dati di nessuno. */
export async function deleteDataForUser(client: SupabaseClient, uid: string): Promise<EsitoCancellazione[]> {
  if (!uid) throw new Error("Cancellazione: manca l'utente");
  const esiti: EsitoCancellazione[] = [];
  for (const tabella of TABELLE_PERSONALI) {
    const { count, error } = await client.from(tabella).delete({ count: "exact" }).eq("user_id", uid);
    if (error) {
      esiti.push(tabellaAssente(error)
        ? { tabella, righe: 0, saltata: "tabella assente" }
        : { tabella, righe: 0, errore: error.message });
    } else {
      esiti.push({ tabella, righe: count ?? 0 });
    }
  }
  return esiti;
}

/** La riga del contatore AI (K6). Invisibile agli utenti → serve il servizio. */
export async function deleteUsageForUser(uid: string): Promise<EsitoCancellazione> {
  if (!uid) throw new Error("Cancellazione: manca l'utente");
  try {
    const { count, error } = await serviceDb().from("usage").delete({ count: "exact" }).eq("user_id", uid);
    if (error) {
      return tabellaAssente(error)
        ? { tabella: "usage", righe: 0, saltata: "tabella assente" }
        : { tabella: "usage", righe: 0, errore: error.message };
    }
    return { tabella: "usage", righe: count ?? 0 };
  } catch (e) {
    return { tabella: "usage", righe: 0, errore: e instanceof Error ? e.message : String(e) };
  }
}

/** Cancella tutto quello che l'app sa dell'utente LOGGATO. */
export async function deleteAllMyData(): Promise<{ ok: boolean; totale: number; esiti: EsitoCancellazione[] }> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Supabase: utente non autenticato");
  const esiti = await deleteDataForUser(await db(), uid);
  esiti.push(await deleteUsageForUser(uid));
  return {
    ok: esiti.every((e) => !e.errore),
    totale: esiti.reduce((n, e) => n + e.righe, 0),
    esiti,
  };
}
