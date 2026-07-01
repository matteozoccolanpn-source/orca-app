import AllenamentoView from "./AllenamentoView";
import { getWorkoutPlan, getTrainedDays } from "@/lib/supabase";

// Come /salute: dati sempre freschi da Supabase.
export const dynamic = "force-dynamic";

export default async function AllenamentoPage() {
  const [plan, trainedDays] = await Promise.all([getWorkoutPlan(), getTrainedDays()]);
  return (
    <AllenamentoView
      week={plan?.week ?? null}
      updatedAt={plan?.updatedAt ?? null}
      trainedDays={trainedDays}
    />
  );
}
