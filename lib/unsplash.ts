// Unsplash — belle foto orizzontali per le città (Viaggio).
// Server-side: usa UNSPLASH_ACCESS_KEY. Senza chiave → null (resta il gradiente).
// Cache 30 giorni.

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
