import AllenamentoView from "./AllenamentoView";
import { requireLogin } from "@/lib/require-login";
import KeikoShell from "@/app/components/keiko/KeikoShell";
import { getWorkoutPlan, getTrainedDays, type WorkoutWeek } from "@/lib/supabase";
import { exerciseImage } from "@/lib/wger";
import { unsplashPhoto } from "@/lib/unsplash";

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

// Riepilogo settimana: allenamenti PIANIFICATI completati vs pianificati (lun-dom).
function weekStats(days: string[], week: WorkoutWeek | null): { done: number; planned: number } {
  if (!week) return { done: 0, planned: 0 };
  const set = new Set(days);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  let done = 0, planned = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    if (((week[WD[d.getDay()]]?.esercizi?.length) ?? 0) > 0) { planned++; if (set.has(iso(d))) done++; }
  }
  return { done, planned };
}

export default async function AllenamentoPage() {
  await requireLogin();
  const [plan, trainedDays] = await Promise.all([getWorkoutPlan(), getTrainedDays()]);
  const streak = computeStreak(trainedDays, plan?.week ?? null);
  const wk = weekStats(trainedDays, plan?.week ?? null);
  // foto dell'esercizio di oggi (o palestra generica) dietro l'hero; null → gradiente
  const todayEx = plan?.week?.[WD[new Date().getDay()]]?.esercizi?.[0]?.nome ?? null;
  const heroImage = (todayEx ? await exerciseImage(todayEx) : null) ?? (await unsplashPhoto("gym workout fitness"));
  return (
    <KeikoShell
      title="Allenamento"
      badge={streak > 0 ? `🔥 ${streak} DI FILA` : undefined}
      backHref="/"
      active="sport"
    >
      <AllenamentoView
        week={plan?.week ?? null}
        updatedAt={plan?.updatedAt ?? null}
        trainedDays={trainedDays}
        heroImage={heroImage}
        weekDone={wk.done}
        weekPlanned={wk.planned}
      />
    </KeikoShell>
  );
}
