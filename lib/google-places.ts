// Google Places — foto reale di un luogo (ristorante, hotel, museo, città…).
// Server-side: usa GOOGLE_PLACES_API_KEY. Restituisce il "photo_reference";
// l'immagine vera passa dal nostro proxy /api/place-photo (così la chiave
// non finisce mai nel client). Senza chiave → null (resta il gradiente).

export async function placePhotoRef(query: string): Promise<string | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const q = (query ?? "").trim();
  if (!key || !q) return null;
  try {
    const res = await fetch(
      "https://maps.googleapis.com/maps/api/place/findplacefromtext/json" +
        "?inputtype=textquery&fields=photos&input=" + encodeURIComponent(q) + "&key=" + key,
      { next: { revalidate: 2592000 } } // 30 giorni
    );
    if (!res.ok) return null;
    const d = await res.json();
    const ref = d?.candidates?.[0]?.photos?.[0]?.photo_reference;
    return typeof ref === "string" ? ref : null;
  } catch {
    return null;
  }
}

// URL (interno) da mettere in <img src>: passa dal proxy, niente chiave nel client.
export function placePhotoUrl(ref: string | null): string | null {
  return ref ? `/api/place-photo?ref=${encodeURIComponent(ref)}` : null;
}

// Comodo: dalla query direttamente all'URL proxy (o null).
export async function placeImage(query: string): Promise<string | null> {
  return placePhotoUrl(await placePhotoRef(query));
}
