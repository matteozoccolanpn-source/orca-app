// Foto di luoghi da Wikipedia (gratis, nessuna chiave).
// Dato un nome (es. "Stadio San Siro", "Roma", "Colosseo") cerca la pagina
// e restituisce la miniatura. Null se non trova nulla → resta il gradiente.
// Cache 30 giorni: Wikipedia viene interrogata di rado.

export async function placeImage(query: string): Promise<string | null> {
  const q = (query ?? "").trim();
  if (!q) return null;
  const url =
    "https://it.wikipedia.org/w/api.php?action=query&format=json" +
    "&generator=search&gsrlimit=1&gsrsearch=" + encodeURIComponent(q) +
    "&prop=pageimages&piprop=thumbnail&pithumbsize=800";
  try {
    const res = await fetch(url, { next: { revalidate: 2592000 } }); // 30 giorni
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages as Record<string, { thumbnail?: { source?: string } }> | undefined;
    if (!pages) return null;
    for (const key of Object.keys(pages)) {
      const src = pages[key]?.thumbnail?.source;
      if (src) return src;
    }
    return null;
  } catch {
    return null;
  }
}

// Tipi di evento per cui ha senso cercare una foto del luogo (posti riconoscibili).
// Escludiamo ristoranti/generici: eviterebbero match sbagliati → meglio il gradiente.
const PLACE_TYPES = new Set(["concert", "museum", "hotel", "sport", "train", "flight", "train_station"]);

// Ricava la query di ricerca da un evento: usa il luogo (prima parte, senza indirizzo).
export function placeQueryForEvent(type: string, location: string | null): string | null {
  if (!PLACE_TYPES.has((type ?? "").toLowerCase())) return null;
  const loc = (location ?? "").trim();
  if (!loc) return null;
  return loc.split(",")[0].trim(); // "Stadio San Siro, Via ..." → "Stadio San Siro"
}
