// wger — immagine di un esercizio dal nome (database open, NESSUNA chiave).
// Molti esercizi non hanno immagine → null (resta il gradiente). Nomi in italiano
// possono non matchare: wger è prevalentemente in inglese.

export async function exerciseImage(name: string): Promise<string | null> {
  const q = (name ?? "").trim();
  if (!q) return null;
  try {
    const s = await fetch(
      `https://wger.de/api/v2/exercise/search/?language=english&format=json&term=${encodeURIComponent(q)}`,
      { next: { revalidate: 2592000 } }
    );
    if (!s.ok) return null;
    const sd = await s.json();
    const data = sd?.suggestions?.[0]?.data;
    if (!data) return null;
    const direct = data.image as string | undefined;
    if (direct) return direct.startsWith("http") ? direct : `https://wger.de${direct}`;
    const baseId = data.base_id;
    if (!baseId) return null;
    const im = await fetch(`https://wger.de/api/v2/exerciseimage/?exercise_base=${baseId}&format=json`, { next: { revalidate: 2592000 } });
    if (!im.ok) return null;
    const imd = await im.json();
    const src = imd?.results?.[0]?.image;
    return typeof src === "string" ? src : null;
  } catch {
    return null;
  }
}
