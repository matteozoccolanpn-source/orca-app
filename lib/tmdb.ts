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


// ── Categorie: genere primario di un titolo (TMDB), etichetta italiana.
// Usa i genre_ids del risultato di ricerca (1 sola chiamata). null se ignoto.
const GENRE_IT: Record<number, string> = {
  28: "Azione", 12: "Avventura", 16: "Animazione", 35: "Commedia", 80: "Crime",
  99: "Documentario", 18: "Drammatico", 10751: "Famiglia", 14: "Fantasy", 36: "Storico",
  27: "Horror", 10402: "Musica", 9648: "Mystery", 10749: "Romantico", 878: "Fantascienza",
  10770: "Film TV", 53: "Thriller", 10752: "Guerra", 37: "Western",
  10759: "Azione e Avventura", 10762: "Ragazzi", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "Guerra e Politica",
};

// ============================================================================
// RISOLUZIONE UNA VOLTA SOLA
//
// Prima ogni funzione qui sopra faceva la sua `search/multi` per stringa, ogni
// volta. Due conseguenze: la pagina Guarda chiamava TMDB due volte per titolo a
// ogni apertura, e funzioni diverse potevano finire su film diversi — la trama
// di uno e le piattaforme di un altro.
//
// Adesso il titolo si risolve UNA volta, quando lo aggiungi, e si salva l'id.
// Da lì in poi si va dritti all'id: niente ricerca, e tutti guardano lo stesso
// film. Le funzioni per stringa restano come sono: le usano altre pagine.
// ============================================================================

export type TmdbType = "movie" | "tv";

export type ResolvedTitle = {
  tmdbId: number;
  tmdbType: TmdbType;
  /** Il titolo come lo scrive TMDB (può correggere un refuso). */
  title: string;
  poster: string | null;
  genre: string | null;
  year: string | null;
};

/** Chiave, intestazioni e cache: le stesse regole delle funzioni qui sopra.
 *  Sta a parte solo per non riscriverle in ogni funzione nuova. */
function tmdbSetup() {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  const isV4 = key.includes(".");   // i token v4 sono JWT con dei punti
  return {
    withKey: (u: string) => (isV4 ? u : `${u}${u.includes("?") ? "&" : "?"}api_key=${key}`),
    init: {
      next: { revalidate: 604800 },  // 7 giorni
      headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
    } as RequestInit & { next?: { revalidate: number } },
  };
}

/** Trova il titolo su TMDB con UNA sola ricerca e restituisce tutto insieme:
 *  id, tipo, titolo, locandina, genere, anno. null se non trova niente.
 *  Preferisce i risultati CON locandina, e tra quelli il tipo richiesto. */
export async function resolveTitle(title: string, kind?: string): Promise<ResolvedTitle | null> {
  const s = tmdbSetup();
  if (!s || !title.trim()) return null;
  try {
    const res = await fetch(
      s.withKey(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=it-IT&page=1`),
      s.init
    );
    if (!res.ok) { console.error("TMDB resolve: risposta", res.status, "per", title); return null; }
    const data = await res.json();
    const results = (data?.results ?? []) as {
      id: number; media_type?: string; poster_path?: string | null; genre_ids?: number[];
      title?: string; name?: string; release_date?: string; first_air_date?: string;
    }[];
    const validi = results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
    // stessa preferenza di posterFor/primaryGenre: prima chi ha la locandina,
    // così non si pesca l'omonimo senza immagine
    const conPoster = validi.filter((r) => r.poster_path);
    const pool = conPoster.length ? conPoster : validi;
    const vuoleSerie = kind === "serie";
    const hit = pool.find((r) => r.media_type === (vuoleSerie ? "tv" : "movie")) ?? pool[0];
    if (!hit) return null;

    const tmdbType: TmdbType = hit.media_type === "tv" ? "tv" : "movie";
    const data_uscita = hit.release_date || hit.first_air_date || "";
    const gid = hit.genre_ids?.[0];
    return {
      tmdbId: hit.id,
      tmdbType,
      title: (hit.title || hit.name || title).trim(),
      poster: hit.poster_path ? `${IMG_BASE}${hit.poster_path}` : null,
      genre: gid != null ? (GENRE_IT[gid] ?? null) : null,
      year: data_uscita ? data_uscita.slice(0, 4) : null,
    };
  } catch (e) {
    console.error("TMDB resolve: errore per", title, e);
    return null;
  }
}

/** Come resolveTitle, ma pretende che il titolo trovato sia QUELLO scritto,
 *  non un parente. Serve a riconoscere "aggiungi Breaking Bad": `resolveTitle`
 *  lì risponde "El Camino: Il film di Breaking Bad", perché a parità di
 *  punteggio preferisce i film, e il titolo secco non veniva riconosciuto.
 *  null se nessun risultato corrisponde davvero. */
export async function resolveExactTitle(query: string): Promise<ResolvedTitle | null> {
  const s = tmdbSetup();
  if (!s || !query.trim()) return null;
  const pulisci = (t: string) =>
    t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const cercato = pulisci(query);
  if (!cercato) return null;
  try {
    const res = await fetch(
      s.withKey(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&language=it-IT&page=1`),
      s.init
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data?.results ?? []) as {
      id: number; media_type?: string; poster_path?: string | null; genre_ids?: number[];
      title?: string; name?: string; release_date?: string; first_air_date?: string; popularity?: number;
    }[];
    const validi = results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
    // Uguale prima di "comincia per": senza questo "Breaking Bad" pescherebbe
    // "Breaking Bad Wolf" se capitasse più in alto.
    const uguali = validi.filter((r) => pulisci(r.title || r.name || "") === cercato);
    const pool = uguali.length ? uguali : validi.filter((r) => pulisci(r.title || r.name || "").startsWith(cercato));
    const hit = pool.filter((r) => r.poster_path)[0] ?? pool[0];
    if (!hit) return null;

    const tmdbType: TmdbType = hit.media_type === "tv" ? "tv" : "movie";
    const uscita = hit.release_date || hit.first_air_date || "";
    const gid = hit.genre_ids?.[0];
    return {
      tmdbId: hit.id,
      tmdbType,
      title: (hit.title || hit.name || query).trim(),
      poster: hit.poster_path ? `${IMG_BASE}${hit.poster_path}` : null,
      genre: gid != null ? (GENRE_IT[gid] ?? null) : null,
      year: uscita ? uscita.slice(0, 4) : null,
    };
  } catch (e) {
    console.error("TMDB titolo esatto: errore per", query, e);
    return null;
  }
}

/** Come resolveTitle, ma partendo dall'id: nessuna ricerca. Serve a chi l'id
 *  ce l'ha già (la ricerca trasversale), per non cercare due volte lo stesso
 *  titolo e rischiare di finire su un omonimo. */
export async function resolveById(tmdbId: number, tmdbType: TmdbType): Promise<ResolvedTitle | null> {
  const s = tmdbSetup();
  if (!s) return null;
  try {
    const r = await fetch(s.withKey(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=it-IT`), s.init);
    if (!r.ok) return null;
    const d = await r.json();
    const uscita: string = d?.release_date || d?.first_air_date || "";
    const g = Array.isArray(d?.genres) ? (d.genres as { id: number; name: string }[])[0] : null;
    return {
      tmdbId,
      tmdbType,
      title: ((d?.title || d?.name) ?? "").trim(),
      poster: d?.poster_path ? `${IMG_BASE}${d.poster_path}` : null,
      genre: g ? (GENRE_IT[g.id] ?? g.name ?? null) : null,
      year: uscita ? uscita.slice(0, 4) : null,
    };
  } catch (e) {
    console.error("TMDB resolve (id): errore per", tmdbId, e);
    return null;
  }
}

/** film/serie dal tipo TMDB. Non chiama niente: è solo una traduzione. */
export function kindFromTmdbType(tmdbType: string): "film" | "serie" {
  return tmdbType === "tv" ? "serie" : "film";
}

/** Come posterFor, ma per id: nessuna ricerca. */
export async function posterById(tmdbId: number, tmdbType: TmdbType): Promise<string | null> {
  const s = tmdbSetup();
  if (!s) return null;
  try {
    const r = await fetch(s.withKey(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=it-IT`), s.init);
    if (!r.ok) return null;
    const d = await r.json();
    return d?.poster_path ? `${IMG_BASE}${d.poster_path}` : null;
  } catch {
    return null;
  }
}

/** Come primaryGenre, ma per id: nessuna ricerca. */
export async function primaryGenreById(tmdbId: number, tmdbType: TmdbType): Promise<string | null> {
  const s = tmdbSetup();
  if (!s) return null;
  try {
    const r = await fetch(s.withKey(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=it-IT`), s.init);
    if (!r.ok) return null;
    const d = await r.json();
    const g = Array.isArray(d?.genres) ? (d.genres as { id: number; name: string }[])[0] : null;
    if (!g) return null;
    // l'elenco italiano vince, così le etichette restano quelle già in uso
    return GENRE_IT[g.id] ?? g.name ?? null;
  } catch {
    return null;
  }
}

/** Come titleDetails, ma per id: salta la ricerca (una chiamata invece di due). */
export async function titleDetailsById(tmdbId: number, tmdbType: TmdbType): Promise<TitleDetails | null> {
  const s = tmdbSetup();
  if (!s) return null;
  try {
    const dRes = await fetch(
      s.withKey(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=it-IT&append_to_response=credits`),
      s.init
    );
    if (!dRes.ok) return null;
    const d = await dRes.json();
    const date: string = d?.release_date || d?.first_air_date || "";
    const genres = Array.isArray(d?.genres) ? (d.genres as { name: string }[]).map((g) => g.name).filter(Boolean).slice(0, 3) : [];
    const cast = Array.isArray(d?.credits?.cast) ? (d.credits.cast as { name: string }[]).map((c) => c.name).filter(Boolean).slice(0, 6) : [];
    const overview: string | null = typeof d?.overview === "string" && d.overview.trim() ? d.overview.trim() : null;
    return { kind: kindFromTmdbType(tmdbType), year: date ? date.slice(0, 4) : null, genres, overview, cast };
  } catch (e) {
    console.error("TMDB details (id): errore per", tmdbId, e);
    return null;
  }
}

/** Come watchProvidersIT, ma per id: salta la ricerca. */
export async function watchProvidersById(tmdbId: number, tmdbType: TmdbType): Promise<WatchProviders | null> {
  const s = tmdbSetup();
  if (!s) return null;
  try {
    const pRes = await fetch(s.withKey(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/watch/providers`), s.init);
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
    console.error("TMDB providers (id): errore per", tmdbId, e);
    return null;
  }
}

/** Come similarTitles, ma per id: salta la ricerca. */
export async function similarTitlesById(tmdbId: number, tmdbType: TmdbType): Promise<SimilarTitle[]> {
  const s = tmdbSetup();
  if (!s) return [];
  try {
    const fetchList = async (endpoint: string) => {
      const r = await fetch(s.withKey(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/${endpoint}?language=it-IT&page=1`), s.init);
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
      .map((r) => ({ title: (r.title || r.name) as string, kind: kindFromTmdbType(tmdbType), poster: `${IMG}${r.poster_path}` }));
  } catch (e) {
    console.error("TMDB similar (id): errore per", tmdbId, e);
    return [];
  }
}

// ============================================================================
// RICERCA TRASVERSALE — "ce l'hai già su X"
//
// Netflix cerca dentro Netflix, Prime dentro Prime. Chi ha quattro abbonamenti
// apre quattro app per sapere dove sta un titolo, e ogni tanto noleggia una
// cosa che aveva già inclusa altrove. Qui si cerca UNA volta e si risponde con
// dove sta, mettendo davanti quello che si può vedere subito senza pagare.
// ============================================================================

/** Le piattaforme italiane fra cui l'utente sceglie i suoi abbonamenti. */
export const PIATTAFORME_IT = [
  "Netflix", "Prime Video", "Disney+", "Now", "Apple TV+",
  "RaiPlay", "Mediaset Infinity", "Paramount+", "TIMVision", "Crunchyroll",
] as const;

/** TMDB scrive i nomi a modo suo ("Amazon Prime Video", "Disney Plus", "NOW"…).
 *  Qui si riportano a quelli della nostra lista, così il confronto con gli
 *  abbonamenti dell'utente non fallisce per una parola di differenza.
 *  null = piattaforma che non è nella lista (resta col nome di TMDB). */
export function normalizzaPiattaforma(nome: string): string | null {
  const n = nome.toLowerCase();
  if (n.includes("netflix")) return "Netflix";
  if (n.includes("prime") || n.includes("amazon")) return "Prime Video";
  if (n.includes("disney")) return "Disney+";
  if (n.includes("crunchyroll")) return "Crunchyroll";   // prima di "now": nessun conflitto, ma teniamo l'ordine esplicito
  if (n.includes("timvision")) return "TIMVision";
  if (n.includes("paramount")) return "Paramount+";
  if (n.includes("mediaset") || n.includes("infinity")) return "Mediaset Infinity";
  if (n.includes("rai")) return "RaiPlay";
  if (n.includes("apple")) return "Apple TV+";
  if (n.includes("now") || n.includes("sky")) return "Now";
  return null;
}

export type RisultatoRicerca = {
  tmdbId: number;
  tmdbType: TmdbType;
  title: string;
  year: string | null;
  poster: string | null;
  /** In abbonamento (incluso): i nomi normalizzati dove si può. */
  flatrate: string[];
  rent: string[];
  buy: string[];
  /** Le piattaforme DELL'UTENTE che ce l'hanno in abbonamento. */
  tue: string[];
};

/** Cerca un titolo e, per i primi 8 con locandina, dice dove si vede in Italia.
 *  Una sola search/multi, poi le piattaforme in parallelo PER ID (mai per
 *  nome: cercare di nuovo rischierebbe di pescare un omonimo).
 *  `abbonamenti` = quelli dell'utente; serve a riempire `tue` e a ordinare. */
export async function searchWithProviders(q: string, abbonamenti: string[] = []): Promise<RisultatoRicerca[]> {
  const s = tmdbSetup();
  if (!s || !q.trim()) return [];
  try {
    const res = await fetch(
      s.withKey(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(q)}&language=it-IT&page=1`),
      s.init
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data?.results ?? []) as {
      id: number; media_type?: string; poster_path?: string | null;
      title?: string; name?: string; release_date?: string; first_air_date?: string;
    }[];
    const scelti = results
      .filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path)
      .slice(0, 8);

    const miei = new Set(abbonamenti);
    const righe = await Promise.all(
      scelti.map(async (r) => {
        const tmdbType: TmdbType = r.media_type === "tv" ? "tv" : "movie";
        const p = await watchProvidersById(r.id, tmdbType);
        const nomi = (arr: WatchProvider[] | undefined) =>
          [...new Set((arr ?? []).map((x) => normalizzaPiattaforma(x.name) ?? x.name))];
        const flatrate = nomi(p?.flatrate);
        const uscita = r.release_date || r.first_air_date || "";
        return {
          tmdbId: r.id,
          tmdbType,
          title: (r.title || r.name || "").trim(),
          year: uscita ? uscita.slice(0, 4) : null,
          poster: r.poster_path ? `${IMG_BASE}${r.poster_path}` : null,
          flatrate,
          rent: nomi(p?.rent),
          buy: nomi(p?.buy),
          tue: flatrate.filter((n) => miei.has(n)),
        } as RisultatoRicerca;
      })
    );

    // Prima quello che si può vedere SUBITO senza pagare altro, poi quello che
    // è in abbonamento da qualche parte, poi il resto.
    const punteggio = (r: RisultatoRicerca) => (r.tue.length ? 0 : r.flatrate.length ? 1 : (r.rent.length || r.buy.length) ? 2 : 3);
    return righe.sort((a, b) => punteggio(a) - punteggio(b));
  } catch (e) {
    console.error("TMDB ricerca: errore per", q, e);
    return [];
  }
}

// ============================================================================
// SERIE: A CHE PUNTO SEI
// Una serie non è un film con la spunta: ha stagioni ed episodi. Qui si legge
// da TMDB quanto è lunga e quando esce il prossimo.
//
// Cache UN giorno, non sette come il resto: gli episodi escono, e una serie in
// onda con dati vecchi di una settimana direbbe la cosa sbagliata.
// ============================================================================

export type SeriesInfo = {
  /** Quante stagioni "vere" (gli speciali, stagione 0, non contano). */
  totalSeasons: number;
  totalEpisodes: number;
  /** Quanti episodi per stagione: { 1: 8, 2: 10 }. */
  episodiPerStagione: Record<number, number>;
  /** Quando esce il prossimo episodio (YYYY-MM-DD), se TMDB lo sa. */
  nextAirDate: string | null;
};

export async function seriesProgressInfo(tmdbId: number): Promise<SeriesInfo | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !tmdbId) return null;
  const isV4 = key.includes(".");
  const withKey = (u: string) => (isV4 ? u : `${u}${u.includes("?") ? "&" : "?"}api_key=${key}`);
  try {
    const r = await fetch(withKey(`https://api.themoviedb.org/3/tv/${tmdbId}?language=it-IT`), {
      next: { revalidate: 86400 },   // 1 giorno
      headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
    });
    if (!r.ok) return null;
    const d = await r.json();
    const stagioni = (Array.isArray(d?.seasons) ? d.seasons : []) as { season_number: number; episode_count: number }[];
    const episodiPerStagione: Record<number, number> = {};
    for (const s of stagioni) {
      // stagione 0 = speciali: non fa parte del percorso normale
      if (s.season_number > 0 && s.episode_count > 0) episodiPerStagione[s.season_number] = s.episode_count;
    }
    const numeri = Object.keys(episodiPerStagione).map(Number);
    return {
      totalSeasons: typeof d?.number_of_seasons === "number" && d.number_of_seasons > 0
        ? Math.max(d.number_of_seasons, numeri.length ? Math.max(...numeri) : 0)
        : (numeri.length ? Math.max(...numeri) : 0),
      totalEpisodes: typeof d?.number_of_episodes === "number" ? d.number_of_episodes : Object.values(episodiPerStagione).reduce((a, b) => a + b, 0),
      episodiPerStagione,
      nextAirDate: typeof d?.next_episode_to_air?.air_date === "string" ? d.next_episode_to_air.air_date : null,
    };
  } catch (e) {
    console.error("TMDB serie: errore per", tmdbId, e);
    return null;   // niente dati: la serie continua a funzionare come un titolo unico
  }
}

export async function primaryGenre(title: string, kind?: string): Promise<string | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key || !title.trim()) return null;
  const isV4 = key.includes(".");
  const base = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(title)}&language=it-IT&page=1`;
  const url = isV4 ? base : `${base}&api_key=${key}`;
  try {
    const res = await fetch(url, { next: { revalidate: 604800 }, headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined });
    if (!res.ok) return null;
    const data = await res.json();
    const results = (data?.results ?? []) as { media_type?: string; poster_path?: string; genre_ids?: number[] }[];
    const wantTv = kind === "serie";
    const withP = results.filter((r) => (r.media_type === "movie" || r.media_type === "tv") && r.poster_path);
    const pool = withP.length ? withP : results.filter((r) => r.media_type === "movie" || r.media_type === "tv");
    const hit = pool.find((r) => r.media_type === (wantTv ? "tv" : "movie")) ?? pool[0];
    const gid = hit?.genre_ids?.[0];
    return gid != null ? (GENRE_IT[gid] ?? null) : null;
  } catch {
    return null;
  }
}

// ============================================================================
// SCOPRIRE TITOLI SENZA CERCARE SUL WEB (C3)
//
// Prima il consiglio funzionava così: Claude cercava sul web "commedie italiane
// su Netflix", leggeva degli articoli e riportava quello che aveva letto. Due
// difetti: i risultati di ricerca rientravano come token in ingresso (il grosso
// dei ~75.000 token per consiglio), e la piattaforma veniva da un articolo —
// mentre "Dove vederlo", due tocchi più in là, la chiede a TMDB. Stessa app,
// due risposte diverse.
//
// TMDB ha già tutto: /discover filtra per genere, anno, voto, durata E
// piattaforma italiana. Gratis, strutturato, aggiornato. Il lavoro di Claude
// smette di essere "cerca" e diventa "capisci cosa vuole" e "scegli e spiega".
// ============================================================================

/** Le piattaforme italiane con il loro id TMDB. Si LEGGONO da TMDB, non si
 *  scrivono a mano: gli id cambiano e non te ne accorgeresti finché il filtro
 *  non smette di funzionare in silenzio. Cache 30 giorni. */
export async function providerIdsIT(): Promise<Record<string, number>> {
  const s = tmdbSetup();
  if (!s) return {};
  const init = { ...s.init, next: { revalidate: 2592000 } };  // 30 giorni

  // Più fornitori TMDB cadono sullo stesso nostro nome, e sceglierne uno a caso
  // sarebbe un errore silenzioso: "Apple TV Store" (noleggio) non è "Apple TV+"
  // (abbonamento), e "Sky Go" non è "NOW". Quindi si raccolgono tutti e si
  // sceglie: prima chi ha il nome che comincia come il nostro, poi chi TMDB
  // mette più in alto per l'Italia (display_priority più basso = più usato).
  const semplice = (s2: string) => s2.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidati: Record<string, { id: number; prefisso: boolean; priorita: number }[]> = {};

  try {
    for (const tipo of ["movie", "tv"] as const) {
      const res = await fetch(
        s.withKey(`https://api.themoviedb.org/3/watch/providers/${tipo}?watch_region=IT&language=it-IT`),
        init
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const p of (data?.results ?? []) as {
        provider_id: number;
        provider_name: string;
        display_priorities?: Record<string, number>;
      }[]) {
        const nome = normalizzaPiattaforma(p.provider_name);
        if (!nome) continue;
        (candidati[nome] ??= []).push({
          id: p.provider_id,
          prefisso: semplice(p.provider_name).startsWith(semplice(nome)),
          priorita: p.display_priorities?.IT ?? 999,
        });
      }
    }
  } catch (e) {
    console.error("TMDB provider IT: errore", e);
  }

  const mappa: Record<string, number> = {};
  for (const [nome, lista] of Object.entries(candidati)) {
    lista.sort((a, b) => Number(b.prefisso) - Number(a.prefisso) || a.priorita - b.priorita);
    mappa[nome] = lista[0].id;
  }
  return mappa;
}

/** I filtri che Claude estrae dalla frase dell'utente. Tutti facoltativi:
 *  quello che non dice non filtra. */
export type FiltriScoperta = {
  tipo?: "film" | "serie" | "entrambi";
  /** Nomi italiani, gli stessi di GENRE_IT ("Commedia", "Crime", …). */
  generi?: string[];
  annoDa?: number;
  annoA?: number;
  /** Minuti. Solo per i film: su una serie TMDB non filtra la durata. */
  durataMax?: number;
  votoMin?: number;
  /** Quanti voti servono perché la media conti: senza, esce fuori di tutto. */
  votiMin?: number;
  /** Nomi normalizzati ("Netflix", "Now"…). Vuoto = tutte. */
  piattaforme?: string[];
  /** Lingua originale ISO ("it", "en", "ko"…). "commedia ITALIANA" non è un
   *  genere: è questo. Senza, discover risponde con le commedie americane. */
  lingua?: string;
  /** L'argomento, in INGLESE ("nature", "boxing", "time travel"). I generi non
   *  bastano: "un documentario sulla natura" col solo genere Documentario
   *  restituiva "Indagini ad alta quota". Le parole chiave di TMDB sì. */
  parolaChiave?: string;
};

export type CandidatoScoperto = {
  tmdbId: number;
  tmdbType: TmdbType;
  titolo: string;
  anno: string | null;
  generi: string[];
  voto: number | null;
  /** Minuti. Resta null: discover NON restituisce la durata (verificato sulle
   *  risposte vere). Il filtro `durataMax` funziona lo stesso, perché a tagliare
   *  è TMDB con `with_runtime.lte` — arrivano già solo i titoli abbastanza
   *  corti. Il campo resta qui per il giorno in cui servisse leggerla davvero. */
  durata: number | null;
  locandina: string | null;
};

/** GENRE_IT al contrario: dal nome italiano all'id TMDB. Costruita una volta. */
const GENRE_ID_DA_NOME: Record<string, number> = Object.entries(GENRE_IT).reduce(
  (acc, [id, nome]) => {
    // Il primo vince: "Guerra" sta sia sui film (10752) che sulle serie (10768),
    // e discover accetta l'id del tipo che sta interrogando — quello sbagliato
    // semplicemente non filtra niente, non rompe.
    if (acc[nome.toLowerCase()] == null) acc[nome.toLowerCase()] = Number(id);
    return acc;
  },
  {} as Record<string, number>
);

function generiInId(generi: string[] | undefined): string {
  if (!generi?.length) return "";
  const ids = generi
    .map((g) => GENRE_ID_DA_NOME[g.trim().toLowerCase()])
    .filter((x): x is number => typeof x === "number");
  return ids.length ? ids.join(",") : "";
}

/** L'id TMDB di una parola chiave. Le parole chiave sono in inglese: "natura"
 *  non trova niente, "nature" sì. Cache 30 giorni: non cambiano mai. */
export async function keywordId(parola: string): Promise<number | null> {
  const s = tmdbSetup();
  if (!s || !parola.trim()) return null;
  try {
    const res = await fetch(
      s.withKey(`https://api.themoviedb.org/3/search/keyword?query=${encodeURIComponent(parola)}&page=1`),
      { ...s.init, next: { revalidate: 2592000 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const primo = (data?.results ?? [])[0] as { id?: number } | undefined;
    return typeof primo?.id === "number" ? primo.id : null;
  } catch {
    return null;
  }
}

/** Chiede a TMDB dei candidati che rispettano i filtri. Al massimo 30.
 *  Cache 1 giorno: i cataloghi delle piattaforme si muovono, ma non ogni ora.
 *  [] se manca la chiave o se TMDB non risponde — chi chiama ha un ripiego. */
export async function discoverTitles(f: FiltriScoperta, pagine = 1): Promise<CandidatoScoperto[]> {
  const s = tmdbSetup();
  if (!s) return [];
  const init = { ...s.init, next: { revalidate: 86400 } };   // 1 giorno

  const tipi: TmdbType[] =
    f.tipo === "film" ? ["movie"] : f.tipo === "serie" ? ["tv"] : ["movie", "tv"];

  // Le piattaforme: da nome a id. Se non se ne riconosce nessuna si lascia
  // perdere il filtro invece di restituire zero risultati.
  let providers = "";
  if (f.piattaforme?.length) {
    const mappa = await providerIdsIT();
    const ids = f.piattaforme.map((p) => mappa[p]).filter((x): x is number => typeof x === "number");
    providers = ids.join("|");   // "|" = una qualsiasi di queste
  }

  const generi = generiInId(f.generi);
  const kw = f.parolaChiave ? await keywordId(f.parolaChiave) : null;

  const chiedi = async (conParolaChiave: boolean) => {
   const perTipo = await Promise.all(
    tipi.flatMap((tipo) => Array.from({ length: Math.max(1, pagine) }, (_, i) => [tipo, i + 1] as const)).map(async ([tipo, pagina]) => {
      const q = new URLSearchParams({
        watch_region: "IT",
        language: "it-IT",
        sort_by: "popularity.desc",
        include_adult: "false",
        page: String(pagina),
      });
      if (conParolaChiave && kw != null) q.set("with_keywords", String(kw));
      if (providers) {
        q.set("with_watch_providers", providers);
        // "flatrate" = incluso nell'abbonamento. Senza questo entrano anche i
        // titoli solo a noleggio, e "ce l'hai già" diventerebbe falso.
        q.set("with_watch_monetization_types", "flatrate");
      }
      if (generi) q.set("with_genres", generi);
      if (f.lingua) q.set("with_original_language", f.lingua);
      if (f.votoMin != null) q.set("vote_average.gte", String(f.votoMin));
      // Senza un minimo di voti la classifica la vincono i titoli con 3 voti a 10.
      q.set("vote_count.gte", String(f.votiMin ?? 50));
      if (f.annoDa != null) q.set(tipo === "movie" ? "primary_release_date.gte" : "first_air_date.gte", `${f.annoDa}-01-01`);
      if (f.annoA != null) q.set(tipo === "movie" ? "primary_release_date.lte" : "first_air_date.lte", `${f.annoA}-12-31`);
      // La durata TMDB la filtra solo sui film.
      if (f.durataMax != null && tipo === "movie") q.set("with_runtime.lte", String(f.durataMax));

      try {
        const res = await fetch(s.withKey(`https://api.themoviedb.org/3/discover/${tipo}?${q}`), init);
        if (!res.ok) { console.error("TMDB discover:", res.status, tipo); return []; }
        const data = await res.json();
        return ((data?.results ?? []) as {
          id: number; title?: string; name?: string; poster_path?: string | null;
          release_date?: string; first_air_date?: string; genre_ids?: number[];
          vote_average?: number; runtime?: number;
        }[]).map((r) => {
          const uscita = r.release_date || r.first_air_date || "";
          return {
            tmdbId: r.id,
            tmdbType: tipo,
            titolo: (r.title || r.name || "").trim(),
            anno: uscita ? uscita.slice(0, 4) : null,
            generi: (r.genre_ids ?? []).map((g) => GENRE_IT[g]).filter(Boolean),
            voto: typeof r.vote_average === "number" ? Math.round(r.vote_average * 10) / 10 : null,
            durata: typeof r.runtime === "number" ? r.runtime : null,
            locandina: r.poster_path ? `${IMG_BASE}${r.poster_path}` : null,
          } as CandidatoScoperto;
        });
      } catch (e) {
        console.error("TMDB discover: errore", tipo, e);
        return [];
      }
    })
  );

   // Se si sono chiesti entrambi i tipi si alternano film e serie, così una
   // richiesta generica non torna 30 film e nessuna serie.
   const meta = Math.ceil(perTipo.length / 2) || 1;
   const a = perTipo.slice(0, meta).flat();
   const b = perTipo.slice(meta).flat();
   const misto: CandidatoScoperto[] = [];
   for (let i = 0; i < Math.max(a.length, b.length); i++) {
     if (a[i]) misto.push(a[i]);
     if (b[i]) misto.push(b[i]);
   }
   return misto.filter((c) => c.titolo).slice(0, 30);
  };

  const conKw = await chiedi(true);
  // La parola chiave a volte stringe troppo ("boxing" su una piattaforma sola):
  // meglio dei candidati generici che nessun candidato.
  if (kw != null && conKw.length < 5) {
    console.warn("[discover] parola chiave troppo stretta:", f.parolaChiave, "->", conKw.length);
    return chiedi(false);
  }
  return conKw;
}

/** La durata VERA di un film, in minuti. Serve perché `with_runtime.lte` di
 *  discover non è affidabile: chiedendo "sotto i 70 minuti" TMDB restituisce
 *  anche Free Guy, che ne dura 115 (verificato). Quindi il filtro di discover
 *  serve a stringere il campo, ma il taglio vero si fa qui, sul dato del
 *  singolo titolo. null se TMDB non lo sa. */
export async function runtimeById(tmdbId: number): Promise<number | null> {
  const s = tmdbSetup();
  if (!s) return null;
  try {
    const r = await fetch(s.withKey(`https://api.themoviedb.org/3/movie/${tmdbId}?language=it-IT`), s.init);
    if (!r.ok) return null;
    const d = await r.json();
    return typeof d?.runtime === "number" && d.runtime > 0 ? d.runtime : null;
  } catch {
    return null;
  }
}

/** Le raccomandazioni di TMDB per un titolo che l'utente ha nominato
 *  ("stile Quo Vado"). Stessa forma dei candidati di discover. */
export async function recommendationsById(tmdbId: number, tmdbType: TmdbType): Promise<CandidatoScoperto[]> {
  const s = tmdbSetup();
  if (!s) return [];
  try {
    const res = await fetch(
      s.withKey(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/recommendations?language=it-IT&page=1`),
      { ...s.init, next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data?.results ?? []) as {
      id: number; title?: string; name?: string; poster_path?: string | null;
      release_date?: string; first_air_date?: string; genre_ids?: number[]; vote_average?: number;
    }[])
      .map((r) => {
        const uscita = r.release_date || r.first_air_date || "";
        return {
          tmdbId: r.id,
          tmdbType,
          titolo: (r.title || r.name || "").trim(),
          anno: uscita ? uscita.slice(0, 4) : null,
          generi: (r.genre_ids ?? []).map((g) => GENRE_IT[g]).filter(Boolean),
          voto: typeof r.vote_average === "number" ? Math.round(r.vote_average * 10) / 10 : null,
          durata: null,
          locandina: r.poster_path ? `${IMG_BASE}${r.poster_path}` : null,
        } as CandidatoScoperto;
      })
      .filter((c) => c.titolo)
      .slice(0, 10);
  } catch (e) {
    console.error("TMDB raccomandazioni: errore per", tmdbId, e);
    return [];
  }
}
