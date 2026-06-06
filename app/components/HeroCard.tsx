"use client";

import { motion } from "framer-motion";
import { formatEventDate } from "@/lib/format";
import { ActionBar } from "./actions";

interface HeroCardProps {
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type: string;
  temporalStatus: string;
}

const CARD_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function HeroCard({
  emoji,
  title,
  datetime,
  location,
  type,
  temporalStatus,
}: HeroCardProps) {
  const formattedDate = formatEventDate(datetime);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: CARD_EASE }}
    >
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.03] p-6 shadow-2xl backdrop-blur-md">

        {/* Top-edge glass shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* Bottom glow */}
        <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

        {/* Temporal status badge — slides in slightly after card */}
        {temporalStatus && (
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              {temporalStatus}
            </span>
          </motion.div>
        )}

        {/* Emoji + title */}
        <div className="mb-5">
          <span className="mb-3 block text-4xl leading-none">{emoji}</span>
          <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
            {title}
          </h2>
        </div>

        {/* Date / location */}
        <div className="mb-5 flex flex-col gap-2">
          {formattedDate && (
            <span className="flex items-center gap-2">
              <span className="w-3.5 text-center text-[11px] text-foreground/20">📅</span>
              <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-primary/60">
                {formattedDate}
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
    </motion.div>
  );
}
