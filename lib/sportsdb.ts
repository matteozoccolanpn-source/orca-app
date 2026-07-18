// TheSportsDB — immagine per gli eventi sport (partita, gara).
// Usa THESPORTSDB_KEY se presente, altrimenti la chiave di test pubblica "3".
// Cerca prima l'evento; se non c'è, prova lo stemma della prima squadra.
// Senza risultati → null (resta il gradiente).

const KEY = () => process.env.THESPORTSDB_KEY || "3";

export async function sportEventImage(title: string): Promise<string | null> {
  const q = (title ?? "").trim();
  if (!q) return null;
  const base = `https://www.thesportsdb.com/api/v1/json/${KEY()}`;
  try {
    // 1) evento per nome (es. "Inter vs Milan", "GP di Monza")
    const ev = await fetch(`${base}/searchevents.php?e=${encodeURIComponent(q)}`, { next: { revalidate: 604800 } });
    if (ev.ok) {
      const d = await ev.json();
      const e = d?.event?.[0];
      const img = e?.strThumb || e?.strPoster || e?.strBanner;
      if (img) return img as string;
    }
    // 2) fallback: stemma della prima squadra nel titolo
    const team = q.split(/\s+(?:vs|v|-|–|—|contro)\s+/i)[0].trim();
    if (team) {
      const tm = await fetch(`${base}/searchteams.php?t=${encodeURIComponent(team)}`, { next: { revalidate: 604800 } });
      if (tm.ok) {
        const d = await tm.json();
        const badge = d?.teams?.[0]?.strTeamBadge || d?.teams?.[0]?.strTeamFanart1;
        if (badge) return badge as string;
      }
    }
    return null;
  } catch {
    return null;
  }
}
