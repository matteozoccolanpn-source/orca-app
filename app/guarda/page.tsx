import { getWatchlist } from "@/lib/supabase";
import { requireLogin } from "@/lib/require-login";
import { withPosters, primaryGenre } from "@/lib/tmdb";
import GuardaView from "./GuardaView";

// Sempre dati freschi (come la home): la lista cambia a ogni aggiunta.
export const dynamic = "force-dynamic";

export default async function GuardaPage() {
  await requireLogin();
  // Locandine reali da TMDB (se la chiave è impostata; altrimenti restano i gradienti).
  const withPics = await withPosters(await getWatchlist());
  // categoria per genere (TMDB), riempita a runtime come le locandine
  const items = await Promise.all(withPics.map(async (i) => ({ ...i, genre: await primaryGenre(i.title, i.kind) })));
  return <GuardaView items={items} />;
}
