// Server-side only — SUPABASE_SERVICE_ROLE_KEY must never reach the client bundle.

import { createClient } from "@supabase/supabase-js";

export interface Ticket {
  id: string;
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type: string;
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
    const { data, error } = await admin()
      .from("tickets")
      .select("id, title, type, datetime, location")
      .gt("datetime", new Date().toISOString())
      .not("title", "ilike", "%[PABLO]%")
      .order("datetime", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Supabase: failed to fetch upcoming tickets:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id:       row.id as string,
      emoji:    emojiForType(row.type as string | undefined),
      title:    (row.title as string) ?? "Untitled",
      datetime: (row.datetime as string) ?? "",
      location: (row.location as string) ?? "",
      type:     ((row.type as string) ?? "").toLowerCase(),
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
  if (fields.datetime !== undefined) patch.datetime = fields.datetime;
  if (fields.location !== undefined) patch.location = fields.location;
  if (fields.reference !== undefined && fields.reference.length > 0)
    patch.reference = fields.reference;

  if (Object.keys(patch).length === 0) throw new Error("No fields to update");

  const { error } = await admin().from("tickets").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createTicket(fields: TicketCreate): Promise<{ id: string }> {
  const { data, error } = await admin()
    .from("tickets")
    .insert({
      user_id:   null,
      title:     fields.title,
      type:      fields.type,
      datetime:  fields.datetime || null,
      location:  fields.location  ?? null,
      reference: fields.reference ?? null,
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
