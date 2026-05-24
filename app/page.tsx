import Ticket from "./components/Ticket";
import { getUpcomingTickets } from "@/lib/airtable";

// Async Server Component — data is fetched at request time (ISR, 60 s revalidation).
export default async function Home() {
  const events = await getUpcomingTickets();

  return (
    // Full-page dark background
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-white">
      <main className="mx-auto max-w-lg px-6 py-16">

        {/* Header */}
        <header className="mb-14">
          <h1 className="text-4xl font-bold tracking-tight">OrCa 🐳</h1>
          {/* Thin accent line under title */}
          <div className="mt-3 mb-4 h-[1px] w-12 bg-white/30" />
          <p className="text-sm font-medium uppercase tracking-widest text-white/40">
            Organize your Calendar
          </p>
        </header>

        {/* Upcoming events section */}
        <section>
          <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-white/30">
            Prossimi eventi
          </h2>

          {/* Ticket list — or a soft empty state when nothing is coming up */}
          {events.length === 0 ? (
            <p className="text-sm text-white/30">Nessun evento in programma.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {events.map((event) => (
                <Ticket key={`${event.title}-${event.datetime}`} {...event} />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
