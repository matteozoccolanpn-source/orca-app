import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { touchLastSeen } from "@/lib/supabase";

// K9 — "ho aperto Keiko". La chiama il client UNA volta per sessione.
// Sul database scrive comunque al massimo una volta al giorno per persona
// (ci pensa `touch_last_seen`, docs/sql/last_seen.sql).
// Non risponde mai con un errore: è contabilità, non deve poter rompere niente.

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  await touchLastSeen();
  return NextResponse.json({ ok: true });
}
