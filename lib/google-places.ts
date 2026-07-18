// Google Places API (New) — foto reale di un luogo (ristorante, hotel, museo, città…).
// Server-side: usa GOOGLE_PLACES_API_KEY. Restituisce il "photo name" (risorsa);
// l'immagine vera passa dal nostro proxy /api/place-photo (chiave mai nel client).
// Senza chiave o senza risultato → null (resta il gradiente).

export async function placePhotoName(query: string): Promise<string | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const q = (query ?? "").trim();
  if (!key || !q) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.photos",
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 1 }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    const name = d?.places?.[0]?.photos?.[0]?.name; // es. "places/XXX/photos/YYY"
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

// URL (interno) da mettere in <img src>: passa dal proxy, niente chiave nel client.
export function placePhotoUrl(name: string | null): string | null {
  return name ? `/api/place-photo?name=${encodeURIComponent(name)}` : null;
}

// Comodo: dalla query direttamente all'URL proxy (o null).
export async function placeImage(query: string): Promise<string | null> {
  return placePhotoUrl(await placePhotoName(query));
}
