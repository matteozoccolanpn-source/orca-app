import HomeView from "./components/HomeView";
import { getUpcomingTickets } from "@/lib/supabase";
import { signOut } from "@/auth";

export default async function Home() {
  const events = await getUpcomingTickets();

  // Server action passata all'appbar della Home per il logout discreto.
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return <HomeView events={events} logoutAction={logout} />;
}
