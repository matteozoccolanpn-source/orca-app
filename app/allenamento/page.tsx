import AllenamentoView from "./AllenamentoView";
import KeikoShell from "@/app/components/keiko/KeikoShell";
import { getWorkoutPlan, getTrainedDays, type WorkoutWeek } from "@/lib/supabase";

// Come /salute: dati sempre freschi da Supabase.
export const dynamic = "force-dynamic";

// Streak "N di fila": allenamenti PIANIFICATI completati consecutivamente
// (non giorni solari). Il riposo non conta né spezza; un pianificato saltato
// azzera. Se oggi è pianificato ma non ancora fatto, si parte da ieri.
const WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
function computeStreak(days: string[], week: WorkoutWeek | null): number {
  if (!week) return 0;
  const set = new Set(days);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const isPlanned = (d: Date) => {
    const day = week[WD[d.getDay()]];
    return !!(day && day.esercizi && day.esercizi.length > 0);
  };
  const cur = new Date(); cur.setHours(0, 0, 0, 0);
  if (isPlanned(cur) && !set.has(iso(cur))) cur.setDate(cur.getDate() - 1);
  let n = 0;
  for (let guard = 0; guard < 400; guard++) {
    if (isPlanned(cur)) {
      if (set.has(iso(cur))) n++;
      else break; // pianificato ma saltato → azzera
    }
    cur.setDate(cur.getDate() - 1);
  }
  return n;
}

export default async function AllenamentoPage() {
  const [plan, trainedDays] = await Promise.all([getWorkoutPlan(), getTrainedDays()]);
  const streak = computeStreak(trainedDays, plan?.week ?? null);
  return (
    <KeikoShell
      title="Allenamento"
      badge={streak > 0 ? `🔥 ${streak} DI FILA` : undefined}
      backHref="/"
    >
      <AllenamentoView
        week={plan?.week ?? null}
        updatedAt={plan?.updatedAt ?? null}
        trainedDays={trainedDays}
      />
    </KeikoShell>
  );
}
