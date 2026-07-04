import SwipeShell from "./components/SwipeShell";
import KeikoHome from "./components/keiko/KeikoHome";
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
  // Interruttore redesign: `?v2` mostra la nuova home Keiko, altrimenti quella attuale.
  const v2 = "v2" in (await searchParams);
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

  if (v2) {
    return (
      <KeikoHome
        events={events}
        trips={trips}
        todos={todos}
        watchCount={watchlist.filter((w) => !w.seen).length}
        diet={diet?.week ?? null}
        workout={workout?.week ?? null}
        trainedDays={trainedDays}
        logoutAction={logout}
      />
    );
  }

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
