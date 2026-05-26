// HeroCard — dominant card for the single nearest upcoming event.
// Displays temporal status, event details, and contextual action buttons.

interface HeroCardProps {
  emoji: string;
  title: string;
  datetime: string;   // ISO 8601 string from Airtable
  location: string;
  type: string;       // raw type: train | flight | restaurant | hotel | …
  temporalStatus: string; // pre-computed label: "Tra 2 giorni", "Domani", "Ora", …
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Builds a Google Maps search URL for a given location string. */
function mapsUrl(location: string): string {
  if (!location) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

/** Formats an ISO datetime string into separate Italian date and time strings. */
function formatDatetime(iso: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: iso, time: "" };

  const date = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);

  const time = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  return { date, time };
}

// ─── Contextual action bar ────────────────────────────────────────────────────

interface ActionButton {
  label: string;
  href: string;
  icon: string;
}

/** Returns the set of action buttons appropriate for this event type. */
function actionsForType(type: string, location: string): ActionButton[] {
  const maps:      ActionButton = { label: "Mappa",       icon: "🗺",  href: mapsUrl(location) };
  const ticket:    ActionButton = { label: "Biglietto",   icon: "🎫",  href: "#" };
  const call:      ActionButton = { label: "Chiama",      icon: "📞",  href: "tel:" };
  const booking:   ActionButton = { label: "Prenotazione", icon: "🔖", href: "#" };

  switch (type) {
    case "train":
    case "flight":
      return [maps, ticket];
    case "restaurant":
      return [call, maps];
    case "hotel":
      return [maps, booking];
    default:
      return [maps];
  }
}

function ActionBar({ type, location }: { type: string; location: string }) {
  const buttons = actionsForType(type, location);
  return (
    <div className="flex gap-3">
      {buttons.map((btn) => (
        <a
          key={btn.label}
          href={btn.href}
          /* Primary button (first) gets the amber accent; others are ghost glass */
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all
            ${buttons.indexOf(btn) === 0
              ? "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30 border border-amber-400/20"
              : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
        >
          <span>{btn.icon}</span>
          <span>{btn.label}</span>
        </a>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HeroCard({
  emoji,
  title,
  datetime,
  location,
  type,
  temporalStatus,
}: HeroCardProps) {
  const { date, time } = formatDatetime(datetime);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.03] p-7 shadow-2xl backdrop-blur-md">

      {/* Glossy top-edge shimmer — gives the card a glass-panel feel */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {/* Subtle bottom glow */}
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

      {/* Temporal status badge — the key signal: how soon is this? */}
      {temporalStatus && (
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {temporalStatus}
          </span>
        </div>
      )}

      {/* Emoji + title */}
      <div className="mb-6">
        <span className="mb-3 block text-5xl leading-none">{emoji}</span>
        <h2 className="text-[1.6rem] font-bold leading-tight tracking-tight text-white">
          {title}
        </h2>
      </div>

      {/* Date / time / location */}
      <div className="mb-6 flex flex-col gap-2.5 text-sm text-white/55">
        {date && (
          <span className="flex items-center gap-2.5">
            <span className="w-4 text-center text-white/25">📅</span>
            <span>
              {date}
              {time && <span className="ml-2 font-medium text-white/70">· {time}</span>}
            </span>
          </span>
        )}
        {location && (
          <span className="flex items-center gap-2.5">
            <span className="w-4 text-center text-white/25">📍</span>
            <span>{location}</span>
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="mb-4 h-px bg-white/[0.07]" />

      {/* Contextual action bar — buttons change based on event type */}
      <ActionBar type={type} location={location} />
    </div>
  );
}
