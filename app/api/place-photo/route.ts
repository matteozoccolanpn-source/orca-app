import { NextRequest, NextResponse } from "next/server";

// Proxy foto Google Places: riceve un photo_reference, scarica l'immagine da
// Google usando la chiave SERVER (mai esposta al client) e la restituisce.
// Cache lunga: la stessa foto non cambia.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!ref || !key) return new NextResponse(null, { status: 404 });
  try {
    const g = await fetch(
      "https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=" +
        encodeURIComponent(ref) + "&key=" + key
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
