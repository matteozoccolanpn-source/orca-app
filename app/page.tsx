import HomeView from "./components/HomeView";
import RefreshButton from "./components/RefreshButton";
import { getUpcomingTickets } from "@/lib/airtable";
import { signOut } from "@/auth";

export default async function Home() {
  const events = await getUpcomingTickets();

  return (
    <>
      <div className="fixed top-3 right-3 z-[60] flex items-center gap-3">
        <RefreshButton />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-[10px] uppercase tracking-wider text-[#8a9080]/60 transition-colors hover:text-[#8a9080]"
          >
            Logout
          </button>
        </form>
      </div>

      <HomeView events={events} />
    </>
  );
}
