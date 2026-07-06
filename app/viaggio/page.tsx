import { getReadyTripPlans, getTicketsByIds } from "@/lib/supabase";
import ViaggioView from "./ViaggioView";

// Sempre dati freschi (come la home): i piani cambiano quando arricchisci.
export const dynamic = "force-dynamic";

export default async function ViaggioPage() {
  const trips = await getReadyTripPlans();
  // biglietti dei viaggi: per l'euristica slot→ticket ("Vedi biglietto").
  const ids = [...new Set(trips.flatMap((t) => t.ticket_ids ?? []))];
  const tickets = ids.length ? await getTicketsByIds(ids) : [];
  return <ViaggioView trips={trips} tickets={tickets} />;
}
