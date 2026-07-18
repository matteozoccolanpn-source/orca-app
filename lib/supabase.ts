// Server-side only — SUPABASE_SERVICE_ROLE_KEY must never reach the client bundle.

import { createClient } from "@supabase/supabase-js";
import { detectClusters, type TicketInput } from "./incastri";

export interface EventEnrichment {
  summary: string;
  links: { label: string; url: string }[];
  updatedAt: string;
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

function admin() {
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
    const first = await admin()
      .from("tickets")
      .select("id, title, type, datetime, location, enrichment")
      .gt("datetime", now)
      .not("title", "ilike", "%[PABLO]%")
      .order("datetime", { ascending: true })
      .limit(20);
    if (first.error) {
      const retry = await admin()
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
  const { error } = await admin().from("tickets").delete().eq("id", id);
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

  const { error } = await admin().from("tickets").update(patch).eq("id", id);
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

export async function createTicket(fields: TicketCreate): Promise<{ id: string }> {
  const { data, error } = await admin()
    .from("tickets")
    .insert({
      user_id:   null,
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
  const { data, error } = await admin()
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
  const client = admin();
  // Cancella tutte le righe esistenti (Supabase richiede un filtro: id != uuid-impossibile).
  await client.from("diet_plan").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await client.from("diet_plan").insert({ user_id: null, week });
  if (error) throw new Error(error.message);
}

/** Elimina il piano dieta salvato (svuota la tabella). */
export async function deleteDietPlan(): Promise<void> {
  const { error } = await admin()
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
  const { data, error } = await admin()
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
  const client = admin();
  // Delete richiede un filtro: prendo tutte le righe con updated_at non nullo.
  await client.from("workout_plan").delete().not("updated_at", "is", null);
  const { error } = await client.from("workout_plan").insert({ week });
  if (error) throw new Error(error.message);
}

/** Elimina la scheda salvata (svuota la tabella). */
export async function deleteWorkoutPlan(): Promise<void> {
  const { error } = await admin()
    .from("workout_plan")
    .delete()
    .not("updated_at", "is", null);
  if (error) throw new Error(error.message);
}

/** Date (YYYY-MM-DD) dei giorni in cui l'utente si è allenato. */
export async function getTrainedDays(): Promise<string[]> {
  const { data, error } = await admin().from("workout_log").select("day");
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
  const client = admin();
  if (done) {
    const { error } = await client.from("workout_log").upsert({ day }, { onConflict: "day" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client.from("workout_log").delete().eq("day", day);
    if (error) throw new Error(error.message);
  }
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
  const client = admin();

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
        cluster_key: c.clusterKey,
        city:        c.city,
        start_date:  c.startDate,
        end_date:    c.endDate,
        ticket_ids:  c.ticketIds,
      },
      { onConflict: "cluster_key" }
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
  const { data, error } = await admin()
    .from("trip_plans")
    .select("*")
    .eq("cluster_key", clusterKey)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TripPlanRow) ?? null;
}

/** Chiavi dei viaggi ancora da arricchire (status = 'pending'). */
export async function getPendingTripPlanKeys(): Promise<string[]> {
  const { data, error } = await admin()
    .from("trip_plans")
    .select("cluster_key")
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.cluster_key as string);
}

/** Dettagli dei biglietti che compongono un viaggio. */
export async function getTicketsByIds(ids: string[]): Promise<TicketDetail[]> {
  if (ids.length === 0) return [];
  const { data, error } = await admin()
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
  const { error } = await admin()
    .from("trip_plans")
    .update({ plan, status: "ready", searched_at: now, updated_at: now })
    .eq("cluster_key", clusterKey);
  if (error) throw new Error(error.message);
}

/** Viaggi con un piano pronto (status = 'ready'), per mostrarli nell'app. */
export async function getReadyTripPlans(): Promise<TripPlanRow[]> {
  const { data, error } = await admin()
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
  const { data, error } = await admin()
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
  const { error } = await admin()
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
  poster: string | null; // URL copertina (TMDB) — additivo; null se non ancora popolato
}

/** Tutta la watchlist: prima i "da vedere" (più recenti in alto), poi i visti. */
export async function getWatchlist(): Promise<WatchItem[]> {
  // NB: `poster` non è colonna del DB (popolata a runtime). `rating`/`note` sono
  // additivi: si provano, e se le colonne non ci sono ancora si ripiega senza —
  // così un deploy prima della migrazione SQL non rompe la pagina.
  const base: string = "id, title, kind, info, link, seen";
  let res = await admin().from("watchlist").select(base + ", rating, note").order("seen", { ascending: true }).order("created_at", { ascending: false });
  if (res.error) res = await admin().from("watchlist").select(base).order("seen", { ascending: true }).order("created_at", { ascending: false });
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
    poster: null,
  }));
}

export async function addWatchItem(f: { title: string; kind?: string; info?: string | null; link?: string | null }): Promise<WatchItem> {
  const { data, error } = await admin()
    .from("watchlist")
    .insert({ user_id: null, title: f.title, kind: f.kind ?? "film", info: f.info ?? null, link: f.link ?? null })
    .select("id, title, kind, info, link, seen")
    .single();
  if (error) throw new Error(error.message);
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    title: r.title as string,
    kind: (r.kind as string) ?? "film",
    info: (r.info as string | null) ?? null,
    link: (r.link as string | null) ?? null,
    seen: r.seen === true,
    rating: null,
    note: null,
    poster: (r.poster as string | null) ?? null,
  };
}

export async function setWatchItemSeen(id: string, seen: boolean): Promise<void> {
  const { error } = await admin().from("watchlist").update({ seen }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setWatchItemReview(id: string, rating: number | null, note: string | null): Promise<void> {
  const { error } = await admin().from("watchlist").update({ rating, note }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteWatchItem(id: string): Promise<void> {
  const { error } = await admin().from("watchlist").delete().eq("id", id);
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
  const { data, error } = await admin()
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
  const { error } = await admin().from("films_catalog").insert(rows);
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
    admin().from("tickets").select("id, title, type, datetime, location").or(evOr).order("datetime", { ascending: true }).limit(8),
    admin().from("todos").select("id, text, day, time, location").or(tdOr).order("day", { ascending: true }).limit(8),
  ]);
  return {
    events: (ev.data ?? []).map((r) => ({ id: r.id as string, title: (r.title as string) ?? "", type: (r.type as string) ?? "", datetime: (r.datetime as string) ?? "", location: (r.location as string) ?? null })),
    todos: (td.data ?? []).map((r) => ({ id: r.id as string, text: (r.text as string) ?? "", day: (r.day as string) ?? "", time: (r.time as string) ?? null, location: (r.location as string) ?? null })),
  };
}

/** Backup ricerche: registra cosa cerca l'utente (e se abbiamo trovato). Tabella `search_log`. */
export async function logSearch(q: string, found: boolean): Promise<void> {
  const { error } = await admin().from("search_log").insert({ q, found });
  if (error) console.warn("[search_log] insert fallito (creare la tabella?):", error.message);
}

/** Campi minimi di un evento per l'arricchimento AI. */
export async function getTicketForEnrich(id: string): Promise<{ title: string; type: string; datetime: string | null; location: string | null } | null> {
  const { data, error } = await admin().from("tickets").select("title, type, datetime, location").eq("id", id).single();
  if (error || !data) return null;
  return { title: data.title as string, type: (data.type as string) ?? "", datetime: (data.datetime as string) ?? null, location: (data.location as string) ?? null };
}

/** Salva l'arricchimento AI (summary + link) sull'evento. Colonna `enrichment` jsonb. */
export async function saveTicketEnrichment(id: string, enrichment: EventEnrichment): Promise<void> {
  const { error } = await admin().from("tickets").update({ enrichment }).eq("id", id);
  if (error) console.warn("[enrichment] save fallito (colonna `enrichment` creata?):", error.message);
}

/** Tutti i to-do, ordinati per giorno e poi per creazione. */
export async function getTodos(): Promise<Todo[]> {
  const { data, error } = await admin()
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
  const { data, error } = await admin()
    .from("todos")
    .insert({
      user_id: null,
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

  const { error } = await admin().from("todos").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Elimina un to-do. */
export async function deleteTodoById(id: string): Promise<void> {
  const { error } = await admin().from("todos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
