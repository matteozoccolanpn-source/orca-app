import HomeView from "./components/HomeView";
import { getUpcomingTickets, getDietPlan, getWorkoutPlan, getTrainedDays } from "@/lib/supabase";
import { signOut } from "@/auth";

// La home deve SEMPRE leggere i dati freschi da Supabase: senza questo, Next.js
// può servire una versione in cache e gli eventi appena aggiunti non compaiono
// finché non si forza un ricaricamento. (Causa del "sembra non salvato".)
export const dynamic = "force-dynamic";

export default async function Home() {
  const [events, diet, workout, trainedDays] = await Promise.all([
    getUpcomingTickets(),
    getDietPlan(),
    getWorkoutPlan(),
    getTrainedDays(),
  ]);

  // Server action passata all'appbar della Home per il logout discreto.
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <HomeView
      events={events}
      diet={diet?.week ?? null}
      workout={workout?.week ?? null}
      trainedDays={trainedDays}
      logoutAction={logout}
    />
  );
}
