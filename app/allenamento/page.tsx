import AllenamentoView from "./AllenamentoView";
import ProfiloSetup from "./ProfiloSetup";
import GeneraScheda from "./GeneraScheda";
import { requireLogin } from "@/lib/require-login";
import KeikoShell from "@/app/components/keiko/KeikoShell";
import {
  getWorkoutPlan, getTrainedDays, getProfile,
  getSessionByDay, getSessionHistory, getLastPerformance,
  getUpcomingTickets,
  type WorkoutWeek, type WorkoutSetRow,
} from "@/lib/supabase";
import { consiglioAllenamento } from "@/lib/coach";
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

// Oggi in formato YYYY-MM-DD, ora locale (Europe/Rome), come il resto dell'app.
function oggiISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AllenamentoPage() {
  await requireLogin();
  const oggiIso = oggiISO();
  const [plan, trainedDays, profile, sessioneOggi, storicoSedute, eventi] = await Promise.all([
    getWorkoutPlan(),
    getTrainedDays(),
    getProfile(),
    getSessionByDay(oggiIso),   // S5: cosa ho fatto DAVVERO oggi (serie vere)
    getSessionHistory(8),       // S5: le ultime sedute, per lo storico in fondo
    getUpcomingTickets(),       // S6: voli, treni, concerti — il resto della vita
  ]);
  // C'è una scheda vera? (almeno un giorno con esercizi) — decide se offrire la generazione (S2)
  const hasPlan = !!plan?.week && Object.values(plan.week).some((d) => (d?.esercizi?.length ?? 0) > 0);
  const streak = computeStreak(trainedDays, plan?.week ?? null);
  const wk = weekStats(trainedDays, plan?.week ?? null);

  // "L'ultima volta che hai fatto questo esercizio": lo chiediamo QUI, sul
  // server, per tutti gli esercizi di oggi in una volta sola. Cosi' quando apri
  // il pannello il dato c'e' gia', senza attese e senza chiamate dal telefono.
  const eserciziOggi = plan?.week?.[WD[new Date().getDay()]]?.esercizi ?? [];
  const nomiOggi = [...new Set(eserciziOggi.map((e) => e.nome).filter(Boolean))];
  const ultimaVolta: Record<string, WorkoutSetRow[]> = {};
  (await Promise.all(nomiOggi.map((n) => getLastPerformance(n)))).forEach((righe, i) => {
    // Se le uniche serie trovate sono quelle di oggi non e' "l'altra volta":
    // in quel caso meglio non dire niente che dire una cosa falsa.
    const passate = righe.filter((r) => !(sessioneOggi?.sets ?? []).some((s) => s.id === r.id));
    if (passate.length > 0) ultimaVolta[nomiOggi[i]] = passate;
  });
  // S6: il consiglio di Keiko. Qui l'allenamento incontra il calendario: e' una
  // funzione pura in lib/coach.ts, quindi le regole si leggono tutte in un file.
  const consiglio = consiglioAllenamento({
    adesso: new Date(),
    oggiIso,
    giornoDiAllenamento: eserciziOggi.length > 0,
    eserciziOggi: eserciziOggi.map((e) => e.nome).filter(Boolean),
    serieFatteOggi: sessioneOggi?.sets.length ?? 0,
    trainedDays,
    eventi: eventi.map((e) => ({ titolo: e.title, tipo: e.type, quando: e.datetime, luogo: e.location })),
    ultimaVolta,
    stile: profile?.stile ?? null,
  });

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
      {/* Onboarding "a scomparsa" (S1): compare solo finché il profilo non esiste. */}
      {!profile && <ProfiloSetup />}
      {/* L0 (S2): profilo sì ma nessuna scheda → offri la scheda base generata. */}
      {profile && !hasPlan && <GeneraScheda />}
      <AllenamentoView
        streak={streak}
        week={plan?.week ?? null}
        updatedAt={plan?.updatedAt ?? null}
        trainedDays={trainedDays}
        heroImage={heroImage}
        weekDone={wk.done}
        weekPlanned={wk.planned}
        oggiIso={oggiIso}
        sessioneOggi={sessioneOggi}
        ultimaVolta={ultimaVolta}
        storicoSedute={storicoSedute}
        consiglio={consiglio}
      />
    </KeikoShell>
  );
}
