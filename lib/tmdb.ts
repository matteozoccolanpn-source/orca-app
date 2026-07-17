// TMDB — trova la locandina (poster) di un film/serie dal titolo.
// Server-side: usa la chiave segreta process.env.TMDB_API_KEY (mai nel client).
// Supporta ENTRAMBE le chiavi TMDB:
//   - v3 "API Key" (stringa corta) → passata come ?api_key=...
//   - v4 "Read Access Token" (token lungo con punti) → header Authorization: Bearer ...
// Se la chiave manca o non si trova nulla → restituisce null (resta il gradiente).
// Le chiamate sono in cache 7 giorni: TMDB viene interrogato di rado.

const IMG_BASE = "https://image.tmdb.org/t/p/w500";

export async function posterFor(title: string, kind?: string): Promise<string | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return null;
  const type = kind === "serie" ? "tv" : "movie";
  const isV4 = key.includes("."); // i token v4 sono JWT con dei punti
  const base = `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(title)}&language=it-IT&page=1`;
  const url = isV4 ? base : `${base}&api_key=${key}`;
  const init: RequestInit & { next?: { revalidate: number } } = {
    next: { revalidate: 604800 }, // 7 giorni
    headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
  };
  try {
    const res = await fetch(url, init);
    if (!res.ok) { console.error("TMDB: risposta", res.status, "per", title); return null; }
    const data = await res.json();
    const path = data?.results?.[0]?.poster_path as string | undefined;
    return path ? `${IMG_BASE}${path}` : null;
  } catch (e) {
    console.error("TMDB: errore per", title, e);
    return null;
  }
}

// Riempie il campo `poster` su una lista di elementi (film/serie), in parallelo.
// Senza chiave restituisce la lista invariata (nessuna chiamata).
export async function withPosters<T extends { title: string; kind?: string; poster: string | null }>(items: T[]): Promise<T[]> {
  if (!process.env.TMDB_API_KEY) return items;
  return Promise.all(items.map(async (it) => (it.poster ? it : { ...it, poster: await posterFor(it.title, it.kind) })));
}
