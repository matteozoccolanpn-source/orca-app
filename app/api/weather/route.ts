import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { weatherFor } from "@/lib/weather";

// Meteo per città (per l'header della home). Open-Meteo, gratis, nessuna chiave.
// Solo per utenti loggati (K69): è comunque un proxy verso un servizio esterno.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const place = req.nextUrl.searchParams.get("place") ?? "";
  const w = await weatherFor(place);
  return NextResponse.json(w, { headers: { "Cache-Control": "public, max-age=1800" } });
}
