import { getReadyTripPlans, getTicketsByIds } from "@/lib/supabase";
import { cityImage } from "@/lib/unsplash";
import ViaggioView from "./ViaggioView";

// Sempre dati freschi (come la home): i piani cambiano quando arricchisci.
export const dynamic = "force-dynamic";

export default async function ViaggioPage() {
  const trips = await getReadyTripPlans();
  // biglietti dei viaggi: per l'euristica slot→ticket ("Vedi biglietto").
  const ids = [...new Set(trips.flatMap((t) => t.ticket_ids ?? []))];
  const tickets = ids.length ? await getTicketsByIds(ids) : [];
  // foto vera della città dietro l'hero (Unsplash); null → resta il gradiente
  const heroImages = await Promise.all(trips.map((t) => cityImage(t.city)));
  return <ViaggioView trips={trips} tickets={tickets} heroImages={heroImages} />;
}
