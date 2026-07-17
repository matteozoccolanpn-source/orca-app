// TMDB — trova la locandina (poster) di un film/serie dal titolo.
// Server-side: usa la chiave segreta process.env.TMDB_API_KEY (mai nel client).
// Se la chiave manca o non si trova nulla → restituisce null (resta il gradiente).
// Le chiamate sono in cache 7 giorni: TMDB viene interrogato di rado.

const IMG_BASE = "https://image.tmdb.org/t/p/w500";

export async function posterFor(title: string, kind?: string): Promise<string | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return null;
  const type = kind === "serie" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${key}&query=${encodeURIComponent(title)}&language=it-IT&page=1`;
  try {
    const res = await fetch(url, { next: { revalidate: 604800 } }); // 7 giorni
    if (!res.ok) return null;
    const data = await res.json();
    const path = data?.results?.[0]?.poster_path as string | undefined;
    return path ? `${IMG_BASE}${path}` : null;
  } catch {
    return null;
  }
}

// Riempie il campo `poster` su una lista di elementi (film/serie), in parallelo.
// Senza chiave restituisce la lista invariata (nessuna chiamata).
export async function withPosters<T extends { title: string; kind?: string; poster: string | null }>(items: T[]): Promise<T[]> {
  if (!process.env.TMDB_API_KEY) return items;
  return Promise.all(items.map(async (it) => (it.poster ? it : { ...it, poster: await posterFor(it.title, it.kind) })));
}
