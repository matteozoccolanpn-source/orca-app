import HeroCard from "./components/HeroCard";
import RefreshButton from "./components/RefreshButton";
import EventsSection from "@/components/EventsSection";
import { getUpcomingTickets } from "@/lib/airtable";
import { signOut } from "@/auth";

function getTemporalStatus(datetimeStr: string): string {
  if (!datetimeStr) return "";
  const now   = new Date();
  const event = new Date(datetimeStr);
  if (isNaN(event.getTime())) return "";

  const diffMs    = event.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays  = diffMs / (1000 * 60 * 60 * 24);

  if (diffMs <= 0 && diffMs > -(2 * 60 * 60 * 1000)) return "Ora";
  if (diffHours < 1)  return "Tra pochi minuti";
  if (diffHours < 24) return `Tra ${Math.floor(diffHours)} ${Math.floor(diffHours) === 1 ? "ora" : "ore"}`;
  if (diffDays  < 2)  return "Domani";

  const days = Math.round(diffDays);
  return `Tra ${days} giorni`;
}

export default async function Home() {
  const events = await getUpcomingTickets();
  const [hero, ...upcoming] = events;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
        <RefreshButton />
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}
        >
          <button
            type="submit"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Logout
          </button>
        </form>
      </div>

      <main className="mx-auto max-w-lg px-5 py-14">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">OrCa 🐳</h1>
          <div className="mt-3 mb-4 h-[1px] w-12 bg-foreground/30" />
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Organize your Calendar
          </p>
        </header>

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun evento in programma ✈️</p>
        ) : (
          <>
            <section className="mb-10">
              <HeroCard
                {...hero}
                temporalStatus={getTemporalStatus(hero.datetime)}
              />
            </section>

            {upcoming.length > 0 && (
              <EventsSection events={upcoming} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
