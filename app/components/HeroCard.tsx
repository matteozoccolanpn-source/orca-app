import { formatDatetime } from "@/lib/format";
import { ActionBar } from "./actions";

interface HeroCardProps {
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type: string;
  temporalStatus: string;
}

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
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.03] p-6 shadow-2xl backdrop-blur-md">

      {/* Top-edge glass shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {/* Bottom glow */}
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      {/* Temporal status badge */}
      {temporalStatus && (
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {temporalStatus}
          </span>
        </div>
      )}

      {/* Emoji + title */}
      <div className="mb-5">
        <span className="mb-3 block text-4xl leading-none">{emoji}</span>
        <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h2>
      </div>

      {/* Date / location — smaller, mono, less prominent */}
      <div className="mb-5 flex flex-col gap-2">
        {date && (
          <span className="flex items-center gap-2">
            <span className="w-3.5 text-center text-[11px] text-foreground/20">📅</span>
            <span className="font-mono text-xs text-primary/80">
              {date}{time && ` · ${time}`}
            </span>
          </span>
        )}
        {location && (
          <span className="flex items-center gap-2">
            <span className="w-3.5 text-center text-[11px] text-foreground/20">📍</span>
            <span className="text-xs text-muted-foreground">{location}</span>
          </span>
        )}
      </div>

      <div className="mb-4 h-px bg-white/[0.06]" />

      <ActionBar type={type} location={location} />
    </div>
  );
}
