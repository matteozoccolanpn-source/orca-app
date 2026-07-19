// TMDB — trova la locandina (poster) di un film/serie dal titolo.
// Server-side: usa la chiave segreta process.env.TMDB_API_KEY (mai nel client).
// Supporta ENTRAMBE le chiavi TMDB:
//   - v3 "API Key" (stringa corta) → passata come ?api_key=...
//   - v4 "Read Access Token" (token lungo con punti) → header Authorization: Bearer ...
// Se la chiave manca o non si trova nulla → restituisce null (resta il gradiente).
// Le chiamate sono in cache 7 giorni: TMDB viene interrogato di rado.

const IMG_BASE = "https://image.tmdb.org/t/p/w500";

// Cerca sia FILM che SERIE TV insieme (search/multi) e prende la prima
// con una locandina. Così trova anche le serie, non solo i film.
export async function posterFor(title: string, _kind?: string): Promise<string | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return null;
  const isV4 = key.includes("."); // i token v4 sono JWT con dei punti
  const base = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=it-IT&page=1`;
  const url = isV4 ? base : `${base}&api_key=${key}`;
  const init: RequestInit & { next?: { revalidate: number } } = {
    next: { revalidate: 604800 }, // 7 giorni
    headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
  };
  try {
    const res = await fetch(url, init);
    if (!res.ok) { console.error("TMDB: risposta", res.status, "per", title); return null; }
    const data = await res.json();
    const results = (data?.results ?? []) as { media_type?: string; poster_path?: string }[];
    const hit = results.find((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path);
    return hit?.poster_path ? `${IMG_BASE}${hit.poster_path}` : null;
  } catch (e) {
    console.error("TMDB: errore per", title, e);
    return null;
  }
}

// Rileva se un titolo è un film o una serie TV (per etichettarlo giusto).
export async function tmdbKind(title: string): Promise<"film" | "serie" | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return null;
  const isV4 = key.includes(".");
  const base = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=it-IT&page=1`;
  const url = isV4 ? base : `${base}&api_key=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 604800 }, headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined });
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data?.results ?? []) as { media_type?: string }[];
    const hit = results.find((r) => r.media_type === "movie" || r.media_type === "tv");
    return hit ? (hit.media_type === "tv" ? "serie" : "film") : null;
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


// ── G3 "Dove vederlo": piattaforme (watch providers) in ITALIA da TMDB ──────
// Trova l'id del titolo (film/serie) e legge le piattaforme IT: abbonamento
// (flatrate), noleggio (rent), acquisto (buy) + un link ufficiale. Cache 7 giorni.
// Senza chiave o senza risultati → null (il client ripiega su JustWatch).
export type WatchProvider = { name: string; logo: string | null };
export type WatchProviders = { link: string | null; flatrate: WatchProvider[]; rent: WatchProvider[]; buy: WatchProvider[] };

const PROVIDER_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

export async function watchProvidersIT(title: string, kind?: string): Promise<WatchProviders | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return null;
  const isV4 = key.includes(".");
  const headers = isV4 ? { Authorization: `Bearer ${key}` } : undefined;
  const withKey = (u: string) => (isV4 ? u : `${u}${u.includes("?") ? "&" : "?"}api_key=${key}`);
  const init: RequestInit & { next?: { revalidate: number } } = { next: { revalidate: 604800 }, headers };
  try {
    const sRes = await fetch(withKey(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=it-IT&page=1`), init);
    if (!sRes.ok) return null;
    const sData = await sRes.json();
    const results = (sData?.results ?? []) as { id: number; media_type?: string }[];
    const wantTv = kind === "serie";
    const hit = results.find((r) => r.media_type === (wantTv ? "tv" : "movie")) ?? results.find((r) => r.media_type === "movie" || r.media_type === "tv");
    if (!hit) return null;
    const type = hit.media_type === "tv" ? "tv" : "movie";
    const pRes = await fetch(withKey(`https://api.themoviedb.org/3/${type}/${hit.id}/watch/providers`), init);
    if (!pRes.ok) return null;
    const pData = await pRes.json();
    const it = pData?.results?.IT;
    if (!it) return null;
    const map = (arr: unknown): WatchProvider[] =>
      Array.isArray(arr)
        ? (arr as { provider_name: string; logo_path: string | null }[]).map((p) => ({ name: p.provider_name, logo: p.logo_path ? `${PROVIDER_LOGO_BASE}${p.logo_path}` : null }))
        : [];
    const providers: WatchProviders = { link: typeof it.link === "string" ? it.link : null, flatrate: map(it.flatrate), rent: map(it.rent), buy: map(it.buy) };
    if (!providers.flatrate.length && !providers.rent.length && !providers.buy.length) return null;
    return providers;
  } catch (e) {
    console.error("TMDB providers: errore per", title, e);
    return null;
  }
}


// ── G2 scheda film/serie: trama, anno, generi, cast (TMDB, IT). Cache 7 giorni.
// Senza chiave o senza risultati → null (la scheda mostra "non disponibile").
export type TitleDetails = { kind: "film" | "serie"; year: string | null; genres: string[]; overview: string | null; cast: string[] };

export async function titleDetails(title: string, kind?: string): Promise<TitleDetails | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return null;
  const isV4 = key.includes(".");
  const headers = isV4 ? { Authorization: `Bearer ${key}` } : undefined;
  const withKey = (u: string) => (isV4 ? u : `${u}${u.includes("?") ? "&" : "?"}api_key=${key}`);
  const init: RequestInit & { next?: { revalidate: number } } = { next: { revalidate: 604800 }, headers };
  try {
    const sRes = await fetch(withKey(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=it-IT&page=1`), init);
    if (!sRes.ok) return null;
    const sData = await sRes.json();
    const results = (sData?.results ?? []) as { id: number; media_type?: string }[];
    const wantTv = kind === "serie";
    const hit = results.find((r) => r.media_type === (wantTv ? "tv" : "movie")) ?? results.find((r) => r.media_type === "movie" || r.media_type === "tv");
    if (!hit) return null;
    const type = hit.media_type === "tv" ? "tv" : "movie";
    const dRes = await fetch(withKey(`https://api.themoviedb.org/3/${type}/${hit.id}?language=it-IT&append_to_response=credits`), init);
    if (!dRes.ok) return null;
    const d = await dRes.json();
    const date: string = d?.release_date || d?.first_air_date || "";
    const year = date ? date.slice(0, 4) : null;
    const genres = Array.isArray(d?.genres) ? (d.genres as { name: string }[]).map((g) => g.name).filter(Boolean).slice(0, 3) : [];
    const cast = Array.isArray(d?.credits?.cast) ? (d.credits.cast as { name: string }[]).map((c) => c.name).filter(Boolean).slice(0, 6) : [];
    const overview: string | null = typeof d?.overview === "string" && d.overview.trim() ? d.overview.trim() : null;
    return { kind: type === "tv" ? "serie" : "film", year, genres, overview, cast };
  } catch (e) {
    console.error("TMDB details: errore per", title, e);
    return null;
  }
}


// ── G4 "Titoli simili": raccomandazioni TMDB per un titolo (film/serie). IT, cache 7gg.
export type SimilarTitle = { title: string; kind: "film" | "serie"; poster: string | null };

export async function similarTitles(title: string, kind?: string): Promise<SimilarTitle[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return [];
  const isV4 = key.includes(".");
  const headers = isV4 ? { Authorization: `Bearer ${key}` } : undefined;
  const withKey = (u: string) => (isV4 ? u : `${u}${u.includes("?") ? "&" : "?"}api_key=${key}`);
  const init: RequestInit & { next?: { revalidate: number } } = { next: { revalidate: 604800 }, headers };
  try {
    const sRes = await fetch(withKey(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=it-IT&page=1`), init);
    if (!sRes.ok) return [];
    const sData = await sRes.json();
    const results = (sData?.results ?? []) as { id: number; media_type?: string; poster_path?: string }[];
    const wantTv = kind === "serie";
    // preferisci i risultati CON copertina (come posterFor) per non pescare il titolo sbagliato
    const withP = results.filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path);
    const pool = withP.length ? withP : results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
    const hit = pool.find((r) => r.media_type === (wantTv ? "tv" : "movie")) ?? pool[0];
    if (!hit) return [];
    const type = hit.media_type === "tv" ? "tv" : "movie";
    const fetchList = async (endpoint: string) => {
      const r = await fetch(withKey(`https://api.themoviedb.org/3/${type}/${hit.id}/${endpoint}?language=it-IT&page=1`), init);
      if (!r.ok) return [];
      const d = await r.json();
      return (d?.results ?? []) as { title?: string; name?: string; poster_path?: string | null }[];
    };
    let list = await fetchList("recommendations");
    if (!list.length) list = await fetchList("similar");
    const IMG = "https://image.tmdb.org/t/p/w342";
    return list
      .filter((r) => (r.title || r.name) && r.poster_path)
      .slice(0, 12)
      .map((r) => ({ title: (r.title || r.name) as string, kind: (type === "tv" ? "serie" : "film") as "film" | "serie", poster: `${IMG}${r.poster_path}` }));
  } catch (e) {
    console.error("TMDB similar: errore per", title, e);
    return [];
  }
}
