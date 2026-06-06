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
    <div className="min-h-screen text-foreground">
      {/* Top controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
        <RefreshButton />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            Logout
          </button>
        </form>
      </div>

      <main className="mx-auto max-w-lg px-4 py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col">
            <h1 className="font-display text-xl font-bold tracking-tight">OrCa 🐳</h1>
            <p className="-mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground/40">
              organize your calendar
            </p>
          </div>
        </header>

        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <span className="text-4xl">✈️</span>
            <p className="text-sm font-medium text-foreground">Nessun evento</p>
            <p className="text-xs text-muted-foreground">Il calendario è vuoto per ora</p>
          </div>
        ) : (
          <>
            <section className="mb-6">
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
