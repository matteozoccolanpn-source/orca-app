import SwipeShell from "./components/SwipeShell";
import { getUpcomingTickets, getDietPlan, getWorkoutPlan, getTrainedDays, getAllTripPlans, getTodos } from "@/lib/supabase";
import { signOut } from "@/auth";

// La home deve SEMPRE leggere i dati freschi da Supabase: senza questo, Next.js
// può servire una versione in cache e gli eventi appena aggiunti non compaiono
// finché non si forza un ricaricamento. (Causa del "sembra non salvato".)
export const dynamic = "force-dynamic";

export default async function Home() {
  const [events, diet, workout, trainedDays, trips, todos] = await Promise.all([
    getUpcomingTickets(),
    getDietPlan(),
    getWorkoutPlan(),
    getTrainedDays(),
    getAllTripPlans(),
    getTodos(),
  ]);

  // Server action passata all'appbar della Home per il logout discreto.
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <SwipeShell
      events={events}
      trips={trips}
      todos={todos}
      diet={diet?.week ?? null}
      dietUpdatedAt={diet?.updatedAt ?? null}
      workout={workout?.week ?? null}
      workoutUpdatedAt={workout?.updatedAt ?? null}
      trainedDays={trainedDays}
      logoutAction={logout}
    />
  );
}
