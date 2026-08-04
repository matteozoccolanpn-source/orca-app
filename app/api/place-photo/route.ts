import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

// Proxy foto Google Places (New): riceve il "photo name" (risorsa) e scarica
// l'immagine da Google con la chiave SERVER (mai esposta al client).
// Solo per utenti loggati (K69): ogni foto è una chiamata a pagamento a Google.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse(null, { status: 401 });

  const name = req.nextUrl.searchParams.get("name");
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!name || !key) return new NextResponse(null, { status: 404 });
  try {
    const g = await fetch(
      `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${key}`
    );
    if (!g.ok || !g.body) return new NextResponse(null, { status: 404 });
    return new NextResponse(g.body, {
      status: 200,
      headers: {
        "Content-Type": g.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
