import Ticket from "./components/Ticket";
import HeroCard from "./components/HeroCard";
import RefreshButton from "./components/RefreshButton";
import { getUpcomingTickets } from "@/lib/airtable";
import { signOut } from "@/auth";

// ─── Temporal status ──────────────────────────────────────────────────────────

/**
 * Returns a human-readable Italian string describing how soon an event is.
 * Computed server-side at ISR time (page revalidates every 60 s).
 */
function getTemporalStatus(datetimeStr: string): string {
  if (!datetimeStr) return "";
  const now   = new Date();
  const event = new Date(datetimeStr);
  if (isNaN(event.getTime())) return "";

  const diffMs    = event.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays  = diffMs / (1000 * 60 * 60 * 24);

  // Ongoing: event started less than 2 h ago
  if (diffMs <= 0 && diffMs > -(2 * 60 * 60 * 1000)) return "Ora";

  // Future events
  if (diffHours < 1)  return "Tra pochi minuti";
  if (diffHours < 24) return `Tra ${Math.floor(diffHours)} ${Math.floor(diffHours) === 1 ? "ora" : "ore"}`;
  if (diffDays  < 2)  return "Domani";

  const days = Math.round(diffDays);
  return `Tra ${days} giorni`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

// Async Server Component — data fetched at request time (ISR, 60 s revalidation).
export default async function Home() {
  const events = await getUpcomingTickets();

  // Split into hero (nearest) and the rest
  const [hero, ...upcoming] = events;

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-white">
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
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Logout
          </button>
        </form>
      </div>
      <main className="mx-auto max-w-lg px-5 py-14">

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">OrCa 🐳</h1>
          <div className="mt-3 mb-4 h-[1px] w-12 bg-white/30" />
          <p className="text-sm font-medium uppercase tracking-widest text-white/40">
            Organize your Calendar
          </p>
        </header>

        {events.length === 0 ? (
          // Empty state — nothing coming up
          <p className="text-sm text-white/30">Nessun evento in programma ✈️</p>
        ) : (
          <>
            {/* ── Hero card — the single nearest event ── */}
            <section className="mb-10">
              <HeroCard
                {...hero}
                temporalStatus={getTemporalStatus(hero.datetime)}
              />
            </section>

            {/* ── Remaining upcoming events ── */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">
                  Prossimi eventi
                </h2>
                <div className="flex flex-col gap-3">
                  {upcoming.map((event) => (
                    <Ticket key={`${event.title}-${event.datetime}`} {...event} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

      </main>
    </div>
  );
}
