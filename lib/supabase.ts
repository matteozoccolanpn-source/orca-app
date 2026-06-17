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
