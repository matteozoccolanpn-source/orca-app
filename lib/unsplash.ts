// Unsplash — belle foto orizzontali per le città (Viaggio).
// Server-side: usa UNSPLASH_ACCESS_KEY. Senza chiave → null (resta il gradiente).
// Cache 30 giorni.

import { hashStr } from "./smart-image";

export async function cityImage(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const q = (query ?? "").trim();
  if (!key || !q) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Client-ID ${key}` }, next: { revalidate: 2592000 } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const first = d?.results?.[0]?.urls;
    const url = first?.regular ?? first?.small;
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}


// Foto Unsplash generica, variata da un "seed" (es. titolo evento): eventi diversi
// della stessa categoria prendono foto diverse dallo stesso set (che resta in cache).
export async function unsplashPhoto(query: string, seed?: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  const q = (query ?? "").trim();
  if (!key || !q) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?per_page=10&orientation=landscape&query=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Client-ID ${key}` }, next: { revalidate: 2592000 } }
    );
    if (!res.ok) return null;
    const d = await res.json();
    const results = (d?.results ?? []) as { urls?: { regular?: string; small?: string } }[];
    if (!results.length) return null;
    const idx = seed ? hashStr(seed) % results.length : 0;
    const urls = results[idx]?.urls;
    const url = urls?.regular ?? urls?.small;
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}
