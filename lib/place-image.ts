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

// Ricava la query foto da un evento, in base al tipo:
// - concerto → l'ARTISTA (dal titolo, es. "Ultimo - San Siro" → "Ultimo")
// - sport    → la PARTITA/evento (il titolo, es. "Inter - Milan", "GP di Monza")
// - museo/hotel/treno/volo → il LUOGO (prima parte, senza indirizzo)
// - altro (cena, generico) → niente foto (resta il gradiente, evita match sbagliati)
const PLACE_TYPES = new Set(["museum", "hotel", "train", "flight", "train_station"]);

export function placeQueryForEvent(type: string, location: string | null, title: string): string | null {
  const t = (type ?? "").toLowerCase();
  const ttl = (title ?? "").trim();
  if (t === "concert") {
    // artista = parte prima di un separatore ( - – — @ | )
    const artist = ttl.split(/\s*[-–—@|]\s*/)[0].trim();
    return artist || null;
  }
  if (t === "sport") {
    return ttl || null;
  }
  if (PLACE_TYPES.has(t)) {
    const loc = (location ?? "").trim();
    return loc ? loc.split(",")[0].trim() : null;
  }
  return null;
}
