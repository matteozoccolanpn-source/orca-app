import AllenamentoView from "./AllenamentoView";
import KeikoShell from "@/app/components/keiko/KeikoShell";
import { getWorkoutPlan, getTrainedDays } from "@/lib/supabase";

// Come /salute: dati sempre freschi da Supabase.
export const dynamic = "force-dynamic";

// Streak "N di fila": giorni di calendario consecutivi con un allenamento,
// contando all'indietro da oggi (o da ieri se oggi non è ancora spuntato).
function computeStreak(days: string[]): number {
  const set = new Set(days);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cur = new Date();
  if (!set.has(iso(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  while (set.has(iso(cur))) {
    n++;
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

export default async function AllenamentoPage() {
  const [plan, trainedDays] = await Promise.all([getWorkoutPlan(), getTrainedDays()]);
  const streak = computeStreak(trainedDays);
  return (
    <KeikoShell
      title="Allenamento"
      badge={streak > 0 ? `🔥 ${streak} DI FILA` : undefined}
      backHref="/?v2"
    >
      <AllenamentoView
        week={plan?.week ?? null}
        updatedAt={plan?.updatedAt ?? null}
        trainedDays={trainedDays}
      />
    </KeikoShell>
  );
}
