import { getReadyTripPlans } from "@/lib/supabase";
import ViaggioView from "./ViaggioView";

// Sempre dati freschi (come la home): i piani cambiano quando arricchisci.
export const dynamic = "force-dynamic";

export default async function ViaggioPage() {
  const trips = await getReadyTripPlans();
  return <ViaggioView trips={trips} />;
}
