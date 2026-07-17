import SwipeShell from "./components/SwipeShell";
import KeikoPreview from "./components/keiko/KeikoPreview";
import KeikoHomeV4 from "./components/keiko/KeikoHomeV4";
import { mapLive } from "./components/keiko/keikoLive";
import { getUpcomingTickets, getDietPlan, getWorkoutPlan, getTrainedDays, getAllTripPlans, getTodos, getWatchlist } from "@/lib/supabase";
import { signOut } from "@/auth";

// La home deve SEMPRE leggere i dati freschi da Supabase: senza questo, Next.js
// può servire una versione in cache e gli eventi appena aggiunti non compaiono
// finché non si forza un ricaricamento. (Causa del "sembra non salvato".)
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Interruttore redesign (invertito): la home NUOVA (KeikoPreview) è il default su /.
  // La vecchia resta su /?classic. /?v2 resta come alias del default per i link esistenti.
  const sp = await searchParams;
  const classic = "classic" in sp;
  const v4 = "v4" in sp;   // nuova Home redesign (Fase 2), additiva
  const [events, diet, workout, trainedDays, trips, todos, watchlist] = await Promise.all([
    getUpcomingTickets(),
    getDietPlan(),
    getWorkoutPlan(),
    getTrainedDays(),
    getAllTripPlans(),
    getTodos(),
    getWatchlist(),
  ]);

  // Server action passata all'appbar della Home per il logout discreto.
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  // Home vecchia: solo dietro /?classic (non cancellata, resta raggiungibile).
  if (classic) {
    return (
      <SwipeShell
        events={events}
        trips={trips}
        todos={todos}
        watchCount={watchlist.filter((w) => !w.seen).length}
        diet={diet?.week ?? null}
        dietUpdatedAt={diet?.updatedAt ?? null}
        workout={workout?.week ?? null}
        workoutUpdatedAt={workout?.updatedAt ?? null}
        trainedDays={trainedDays}
        logoutAction={logout}
      />
    );
  }

  // Default (e alias /?v2): home nuova con dati veri. Mapping in keikoLive.
  const live = mapLive({
    events,
    todos,
    diet: diet?.week ?? null,
    workout: workout?.week ?? null,
    trainedDays,
    trips,
    watch: watchlist,
  });
  if (v4) return <KeikoHomeV4 live={live} logoutAction={logout} />;
  return <KeikoPreview live={live} logoutAction={logout} />;
}
