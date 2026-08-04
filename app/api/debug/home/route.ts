import { auth, OWNER_EMAIL } from "@/auth";
import { NextResponse } from "next/server";
import {
  getUpcomingTickets, getDietPlan, getWorkoutPlan, getTrainedDays,
  getAllTripPlans, getTodos, getWatchlist,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Diagnostica: chiama le VERE funzioni della home attraverso db() (quindi
// rispetta l'interruttore MULTIUSER_RLS). Con flag acceso riproduce esattamente
// il percorso della home e cattura QUALE funzione lancia l'errore, senza far
// crashare tutto. Visibile SOLO al proprietario (K67). Da rimuovere dopo la diagnosi.
export async function GET() {
  const session = await auth();
  // Solo il proprietario. Per chiunque altro la rotta finge di non esistere (404).
  const email = (session?.user?.email ?? "").trim().toLowerCase();
  if (email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const head = {
    hasSession: !!session,
    email: session?.user?.email ?? null,
    flag: process.env.MULTIUSER_RLS ?? "(non impostato)",
  };

  const getters: [string, () => Promise<unknown>][] = [
    ["getUpcomingTickets", getUpcomingTickets],
    ["getDietPlan", getDietPlan],
    ["getWorkoutPlan", getWorkoutPlan],
    ["getTrainedDays", getTrainedDays],
    ["getAllTripPlans", getAllTripPlans],
    ["getTodos", getTodos],
    ["getWatchlist", getWatchlist],
  ];

  const results: Record<string, unknown> = {};
  for (const [name, fn] of getters) {
    try {
      const r = await fn();
      results[name] = { ok: true, n: Array.isArray(r) ? r.length : r ? 1 : 0 };
    } catch (e) {
      results[name] = { ok: false, error: String(e instanceof Error ? e.message : e) };
    }
  }
  return NextResponse.json({ ...head, results });
}
