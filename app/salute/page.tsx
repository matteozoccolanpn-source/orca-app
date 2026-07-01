import SaluteView from "./SaluteView";
import { getDietPlan } from "@/lib/supabase";

// Come la home: leggiamo sempre i dati freschi da Supabase, così la settimana
// appena caricata compare senza dover forzare un ricaricamento.
export const dynamic = "force-dynamic";

export default async function SalutePage() {
  const diet = await getDietPlan();
  return <SaluteView week={diet?.week ?? null} updatedAt={diet?.updatedAt ?? null} />;
}
