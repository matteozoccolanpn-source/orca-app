import { auth, OWNER_EMAIL } from "@/auth";
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/user";
import { userDb } from "@/lib/supabase-user";

export const dynamic = "force-dynamic";

// Diagnostica multi-utente: prova il percorso "come utente" (token firmato + RLS)
// su OGNI tabella usata dall'app, in ISOLAMENTO (indipendente dall'interruttore
// MULTIUSER_RLS). Visibile SOLO al proprietario (K67). Da rimuovere dopo la diagnosi.
const TABLES = [
  "tickets", "todos", "watchlist", "diet_plan", "workout_plan",
  "workout_log", "trip_plans", "trips", "push_subscriptions",
  "films_catalog", "search_log", "notification_runs",
];

export async function GET() {
  const session = await auth();
  // Solo il proprietario. Per chiunque altro la rotta finge di non esistere (404),
  // così non si scopre nemmeno che esiste una diagnostica.
  const email = (session?.user?.email ?? "").trim().toLowerCase();
  if (email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const uid = await currentUserId();
  const secret = process.env.SUPABASE_JWT_SECRET ?? "";
  const head: Record<string, unknown> = {
    uid,
    email,
    secretLen: secret.length,
  };

  let u;
  try {
    u = await userDb();
  } catch (e) {
    return NextResponse.json({ ...head, userDbThrew: String(e instanceof Error ? e.message : e) });
  }
  if (!u) return NextResponse.json({ ...head, userDb: "null" });

  const perTable: Record<string, unknown> = {};
  for (const t of TABLES) {
    try {
      const { data, error } = await u.db.from(t).select("*").limit(1);
      perTable[t] = error
        ? { ok: false, code: (error as { code?: string }).code ?? null, msg: error.message }
        : { ok: true, rows: data?.length ?? 0 };
    } catch (e) {
      perTable[t] = { ok: false, threw: String(e instanceof Error ? e.message : e) };
    }
  }
  return NextResponse.json({ ...head, perTable });
}
