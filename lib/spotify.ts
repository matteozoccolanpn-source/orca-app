// Spotify — foto ufficiale dell'artista, per i concerti.
// Server-side: usa SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET (mai nel client).
// Flusso "client credentials" (nessun login utente): token in cache in memoria.
// Senza chiavi → null (resta il gradiente).

let cached: { token: string; exp: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cached && cached.exp > Date.now()) return cached.token;
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = await res.json();
    cached = { token: d.access_token, exp: Date.now() + (Number(d.expires_in ?? 3600) - 60) * 1000 };
    return cached.token;
  } catch {
    return null;
  }
}

export async function spotifyArtistImage(name: string): Promise<string | null> {
  const q = (name ?? "").trim();
  if (!q) return null;
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=artist&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 604800 } } // 7 giorni
    );
    if (!res.ok) return null;
    const d = await res.json();
    const imgs = d?.artists?.items?.[0]?.images;
    return Array.isArray(imgs) && imgs[0]?.url ? (imgs[0].url as string) : null;
  } catch {
    return null;
  }
}
