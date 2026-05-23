import Ticket from "./components/Ticket";

// Hardcoded upcoming events
const events = [
  {
    emoji: "🎤",
    title: "Concerto Vasco",
    datetime: "25 maggio 2026, 21:00",
    location: "San Siro, Milano",
  },
  {
    emoji: "🚆",
    title: "Milano → Roma",
    datetime: "28 maggio 2026, 08:15",
    location: "Stazione Centrale",
  },
  {
    emoji: "🏨",
    title: "Hotel Hassler",
    datetime: "28 maggio 2026, check-in 14:00",
    location: "Roma",
  },
];

export default function Home() {
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

          {/* Ticket list */}
          <div className="flex flex-col gap-4">
            {events.map((event) => (
              <Ticket key={event.title} {...event} />
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
