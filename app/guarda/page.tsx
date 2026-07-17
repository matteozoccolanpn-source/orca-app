import { getWatchlist } from "@/lib/supabase";
import { withPosters } from "@/lib/tmdb";
import GuardaView from "./GuardaView";

// Sempre dati freschi (come la home): la lista cambia a ogni aggiunta.
export const dynamic = "force-dynamic";

export default async function GuardaPage() {
  // Locandine reali da TMDB (se la chiave è impostata; altrimenti restano i gradienti).
  const items = await withPosters(await getWatchlist());
  return <GuardaView items={items} />;
}
