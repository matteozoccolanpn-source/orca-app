import { getWatchlist } from "@/lib/supabase";
import GuardaView from "./GuardaView";

// Sempre dati freschi (come la home): la lista cambia a ogni aggiunta.
export const dynamic = "force-dynamic";

export default async function GuardaPage() {
  const items = await getWatchlist();
  return <GuardaView items={items} />;
}
