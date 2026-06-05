// HeroCard — dominant card for the single nearest upcoming event.
// Displays temporal status, event details, and contextual action buttons.

import { formatDatetime } from "@/lib/format";
import { ActionBar } from "./actions";

interface HeroCardProps {
  emoji: string;
  title: string;
  datetime: string;   // ISO 8601 string from Airtable
  location: string;
  type: string;       // raw type: train | flight | restaurant | hotel | …
  temporalStatus: string; // pre-computed label: "Tra 2 giorni", "Domani", "Ora", …
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
