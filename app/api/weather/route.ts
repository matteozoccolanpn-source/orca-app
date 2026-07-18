import { NextRequest, NextResponse } from "next/server";
import { weatherFor } from "@/lib/weather";

// Meteo per città (per l'header della home). Open-Meteo, gratis, nessuna chiave.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const place = req.nextUrl.searchParams.get("place") ?? "";
  const w = await weatherFor(place);
  return NextResponse.json(w, { headers: { "Cache-Control": "public, max-age=1800" } });
}
