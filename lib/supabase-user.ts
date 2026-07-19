import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { currentUserId } from "./user";
import { mintSupabaseJwt } from "./supabase-jwt";

// Client Supabase che interroga il DB COME L'UTENTE loggato: la chiave `anon`
// identifica il progetto, il token firmato porta l'identità → le policy RLS
// (`user_id = auth.uid()`) sono applicate dal database. Se non loggato → null.
// NON ancora usato dalle funzioni dati: aggancio fase per fase.
export async function userDb(): Promise<{ db: SupabaseClient; uid: string } | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase: manca NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const token = mintSupabaseJwt(uid);
  const db = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return { db, uid };
}
