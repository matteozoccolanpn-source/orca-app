"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DM_Sans } from "next/font/google";
import {
  Train,
  Music,
  Plane,
  ChevronDown,
  ArrowUp,
  Dumbbell,
  Briefcase,
  UtensilsCrossed,
  Cake,
  PartyPopper,
  Users,
  MoreHorizontal,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const sans = "var(--font-dm-sans), 'DM Sans', sans-serif";

/* UX_BRIEF palette + stratificazione mare */
const C = {
  bg: "#0a0908",
  topDark: "#060508",
  petrolio: "#0a1628",
  petrolioMid: "#122030",
  oceanBlue: "#0d2847",
  oceanBlueSoft: "rgba(74, 158, 255, 0.14)",
  lightMist: "rgba(232, 224, 208, 0.045)",
  lightLine: "rgba(255, 255, 255, 0.06)",
  sand: "#1a1208",
  sandWarm: "#241a0c",
  surface: "#141810",
  card: "#111810",
  text: "#e8e0d0",
  textSec: "#8a9080",
  textMuted: "#5c6358",
  border: "#2a3024",
  glass: "rgba(6, 5, 8, 0.92)",
  pill: "rgba(200, 168, 75, 0.08)",
  primary: "#c8a84b",
  primaryGlow: "rgba(200, 168, 75, 0.18)",
  sage: "#6b8f71",
  blue: "#4a9eff",
  ink: "#0a0908",
  mouth: "#c41e1e",
} as const;

const APP_W = 390;
const splashEase = [0.22, 1, 0.36, 1] as const;

function OceanBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* stratificazione verticale: scuro → petrolio → blu → sabbia */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg, ${C.topDark} 0%, ${C.topDark} 6%, transparent 16%),
            radial-gradient(ellipse 65% 40% at 12% 12%, ${C.petrolio} 0%, transparent 52%),
            radial-gradient(ellipse 90% 55% at 55% 38%, ${C.oceanBlue} 0%, transparent 58%),
            radial-gradient(ellipse 55% 45% at 80% 50%, ${C.oceanBlueSoft} 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 62% 28%, ${C.lightMist} 0%, transparent 52%),
            radial-gradient(ellipse 70% 50% at 88% 92%, ${C.sand} 0%, transparent 54%),
            radial-gradient(ellipse 45% 35% at 8% 88%, rgba(200, 168, 75, 0.06) 0%, transparent 48%),
            ${C.bg}
          `,
        }}
      />
      {/* linea orizzonte — luce sottile */}
      <div
        className="absolute inset-x-0 top-[36%] h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(74,158,255,0.14) 18%, ${C.lightLine} 50%, rgba(200,168,75,0.10) 82%, transparent 100%)`,
        }}
      />
      {/* blob ambra — basso, loop 14s */}
      <motion.div
        className="absolute -left-16 bottom-[-10%] h-80 w-80 rounded-full blur-[110px]"
        style={{ background: "#c8a84b08" }}
        animate={{ x: [0, 36, 0], y: [0, -24, 0], scale: [1, 1.14, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* blob blu — centro-alto, loop 14s */}
      <motion.div
        className="absolute left-1/3 top-[8%] h-96 w-96 rounded-full blur-[120px]"
        style={{ background: "#4a9eff0c" }}
        animate={{ x: [0, 40, 0], y: [0, 32, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* blob chiaro — luce diffusa, loop 18s */}
      <motion.div
        className="absolute right-[18%] top-[22%] h-56 w-56 rounded-full blur-[90px]"
        style={{ background: "rgba(232,224,208,0.04)" }}
        animate={{ x: [0, -20, 0], y: [0, 18, 0], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* griglia puntini fine — 1px, 24px, 3% */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.03,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* punti grandi sparsi — ogni 48px, blu tenue */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.028,
          backgroundImage: "radial-gradient(circle, rgba(74,158,255,0.9) 0.75px, transparent 0.75px)",
          backgroundSize: "48px 48px",
          backgroundPosition: "12px 8px",
        }}
      />
      {/* hairline orizzontali */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.022,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,255,255,0.35) 15px, rgba(255,255,255,0.35) 16px)",
        }}
      />
      {/* diagonali sottili */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.018,
          backgroundImage: "repeating-linear-gradient(118deg, transparent, transparent 39px, rgba(255,255,255,0.25) 39px, rgba(255,255,255,0.25) 40px)",
        }}
      />
    </div>
  );
}

/** Texture decorative minime per superfici interne */
function SurfaceTexture({ variant }: { variant: "shell" | "hero" | "ticker" }) {
  if (variant === "shell") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]" aria-hidden>
        {/* luce bordo sinistro */}
        <div
          className="absolute inset-y-[8%] left-0 w-px"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.10) 35%, rgba(74,158,255,0.08) 65%, transparent)",
          }}
        />
        {/* luce bordo destro tenue */}
        <div
          className="absolute inset-y-[20%] right-0 w-px opacity-60"
          style={{
            background: "linear-gradient(180deg, transparent, rgba(200,168,75,0.08) 50%, transparent)",
          }}
        />
        {/* arco decorativo alto */}
        <div
          className="absolute -right-8 -top-8 h-32 w-32 rounded-full"
          style={{ border: "1px solid rgba(74,158,255,0.06)" }}
        />
        <div
          className="absolute -right-4 -top-4 h-20 w-20 rounded-full"
          style={{ border: "1px solid rgba(255,255,255,0.04)" }}
        />
        {/* puntini interni offset */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.022,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "6px 10px",
          }}
        />
        {/* tick verticali sparsi */}
        <div
          className="absolute inset-y-0 right-3 w-px opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(180deg, transparent, transparent 28px, rgba(255,255,255,0.5) 28px, rgba(255,255,255,0.5) 32px, transparent 32px, transparent 56px)",
          }}
        />
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* alone logo */}
        <div
          className="absolute left-1/2 top-[58%] h-28 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{ background: "rgba(74,158,255,0.07)" }}
        />
        {/* stelle/punti luce angoli */}
        {[
          { top: "18%", left: "14%", size: 2 },
          { top: "24%", right: "18%", size: 1.5 },
          { top: "62%", left: "22%", size: 1 },
          { top: "70%", right: "12%", size: 2 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              top: dot.top,
              left: "left" in dot ? dot.left : undefined,
              right: "right" in dot ? dot.right : undefined,
              width: dot.size,
              height: dot.size,
              background: i % 2 === 0 ? "rgba(255,255,255,0.18)" : "rgba(74,158,255,0.22)",
            }}
          />
        ))}
        {/* arco sottile sotto logo */}
        <div
          className="absolute left-1/2 top-[72%] h-16 w-40 -translate-x-1/2 rounded-[50%]"
          style={{ border: "1px solid rgba(255,255,255,0.05)", borderTop: "none" }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* dash centrale */}
      <div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2"
        style={{
          backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(255,255,255,0.07) 6px, rgba(255,255,255,0.07) 14px, transparent 14px, transparent 22px)",
        }}
      />
      {/* puntini ticker */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.035,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 0.5px, transparent 0.5px)",
          backgroundSize: "16px 16px",
        }}
      />
    </div>
  );
}

/** Brand O — empty amber outline (orca placeholder while logo is reworked) */
function OrcaInO({ px, ring = true }: { px: number; ring?: boolean }) {
  const amber = "#c8a84b";

  return (
    <svg width={px} height={px} viewBox="0 0 80 80" fill="none" aria-hidden>
      {ring && (
        <circle cx="40" cy="40" r="32" fill="none" stroke={amber} strokeWidth={2.5} />
      )}
    </svg>
  );
}

function OrCaMark({
  size = 80,
  showWordmark = false,
  showTagline = false,
  ring = true,
}: {
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
  ring?: boolean;
}) {
  if (!showWordmark) {
    return <OrcaInO px={size} ring={ring} />;
  }

  const letterSize = size * 0.58;
  const aSize = letterSize * 0.86;

  return (
    <div className="flex flex-col items-center text-center">
      <OrcaInO px={size} ring={ring} />
      <div className="mt-3.5 flex items-baseline leading-none">
        <span className="font-bold" style={{ color: C.text, fontSize: letterSize }}>
          OrC
        </span>
        <span className="font-bold" style={{ color: C.text, fontSize: aSize }}>
          a
        </span>
      </div>
      {showTagline && (
        <p
          className="mt-3 uppercase leading-snug"
          style={{
            color: C.textSec,
            fontSize: Math.max(10, size * 0.14),
            letterSpacing: "0.2em",
          }}
        >
          Organize your Calendar
        </p>
      )}
    </div>
  );
}

const tickerEvents = [
  { line: "FR 9542 · MXP→FCO · 12GIU 18:35", mood: "figata 🔥", moodColor: C.sage },
  { line: "CNC · SAN SIRO · 17GIU 21:00", mood: "figata 🔥", moodColor: C.sage },
  { line: "FR 8156 · MXP→LHR · 26GIU 06:15", mood: "che palle 😵", moodColor: C.textSec },
  { line: "RSV · NAVIGLI · 20GIU 20:00", mood: "ok dai", moodColor: C.textSec },
  { line: "MAR · MILANO · 22GIU 08:00", mood: "che fatica", moodColor: C.textSec },
];

const nextEvent = {
  category: "Viaggi",
  title: "Frecciarossa Milano → Roma",
  days: 2,
  time: "Ven 12 giu · 18:35",
  icon: Train,
};

type EventItem = {
  label: string;
  time: string;
  days?: number;
  ago?: string;
  icon: LucideIcon;
};

const allEvents: EventItem[] = [
  { label: "Frecciarossa Milano → Roma", time: "12 giu · 18:35", days: 2, icon: Train },
  { label: "Concerto Max Pezzali", time: "17 giu · 21:00", days: 7, icon: Music },
  { label: "Volo Ryanair Milano → Londra", time: "26 giu · 06:15", days: 16, icon: Plane },
  { label: "Cena con il team", time: "20 giu · 20:00", days: 10, icon: UtensilsCrossed },
  { label: "Mezza maratona Milano", time: "22 giu · 08:00", days: 12, icon: Dumbbell },
  { label: "Call Q2 review", time: "28 giu · 10:00", days: 18, icon: Briefcase },
  { label: "Compleanno di mamma", time: "5 lug · 19:00", days: 25, icon: Cake },
];

const pastEvents: EventItem[] = [
  { label: "Aperitivo Navigli", time: "28 mag · 19:30", ago: "9 giorni fa", icon: UtensilsCrossed },
  { label: "Inter–Milan", time: "18 mag · 20:45", ago: "19 giorni fa", icon: PartyPopper },
  { label: "Volo BCN→MXP", time: "3 mag · 11:20", ago: "34 giorni fa", icon: Plane },
];

const categorySheets = [
  {
    id: "viaggi",
    name: "Viaggi",
    icon: Plane,
    accent: C.primary,
    layout: "col-span-2 row-span-2 min-h-[120px]",
    events: [
      { label: "Frecciarossa Milano → Roma", time: "12 giu · 18:35", icon: Train },
      { label: "Volo Ryanair Milano → Londra", time: "26 giu · 06:15", icon: Plane },
    ],
  },
  {
    id: "serate",
    name: "Serate",
    icon: PartyPopper,
    accent: C.primary,
    layout: "col-span-1 row-span-1 min-h-[60px]",
    events: [
      { label: "Concerto Max Pezzali", time: "17 giu · 21:00", icon: Music },
      { label: "Cena con il team", time: "20 giu · 20:00", icon: UtensilsCrossed },
    ],
  },
  {
    id: "cibo",
    name: "Cibo",
    icon: UtensilsCrossed,
    accent: C.sage,
    layout: "col-span-1 row-span-1 min-h-[60px]",
    events: [{ label: "Cena con il team", time: "20 giu · 20:00", icon: UtensilsCrossed }],
  },
  {
    id: "sport",
    name: "Sport",
    icon: Dumbbell,
    accent: C.sage,
    layout: "col-span-2 row-span-1 min-h-[56px]",
    events: [{ label: "Mezza maratona Milano", time: "22 giu · 08:00", icon: Dumbbell }],
  },
  {
    id: "lavoro",
    name: "Lavoro",
    icon: Briefcase,
    accent: C.textSec,
    layout: "col-span-1 row-span-1 min-h-[56px]",
    events: [{ label: "Call Q2 review", time: "28 giu · 10:00", icon: Briefcase }],
  },
  {
    id: "famiglia",
    name: "Famiglia",
    icon: Users,
    accent: C.primary,
    layout: "col-span-1 row-span-1 min-h-[56px]",
    events: [{ label: "Compleanno di mamma", time: "5 lug · 19:00", icon: Cake }],
  },
];

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: C.bg }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: splashEase }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: splashEase }}
      >
        <div className="relative">
          <div className="absolute inset-0 scale-125 rounded-full blur-3xl opacity-40" style={{ background: C.primaryGlow }} />
          <OrCaMark size={100} showWordmark showTagline />
        </div>
      </motion.div>
    </motion.div>
  );
}

function FixedTopBar() {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5"
      style={{
        background: `
          linear-gradient(180deg, ${C.topDark} 0%, rgba(8, 10, 14, 0.96) 100%)
        `,
        borderBottom: `1px solid ${C.petrolio}`,
        boxShadow: `inset 0 1px 0 ${C.lightLine}`,
        backdropFilter: "blur(16px) saturate(1.2)",
        paddingTop: "max(10px, env(safe-area-inset-top))",
      }}
    >
      <OrCaMark size={36} ring />
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
          Organize your Calendar
        </p>
      </div>
    </header>
  );
}

function OrcaHeroZone() {
  return (
    <div
      className="relative overflow-hidden px-4 pb-3 pt-6"
      style={{
        background: `
          linear-gradient(180deg, rgba(8, 10, 14, 0.45) 0%, transparent 40%),
          radial-gradient(ellipse 80% 60% at 50% 70%, ${C.oceanBlueSoft} 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 50% 45%, ${C.lightMist} 0%, transparent 60%)
        `,
      }}
    >
      <SurfaceTexture variant="hero" />
      <div className="relative flex justify-center">
        <OrCaMark size={88} showWordmark showTagline />
      </div>
    </div>
  );
}

function DepartureTicker() {
  const items = [...tickerEvents, ...tickerEvents];
  return (
    <div
      className="relative overflow-hidden py-1"
      style={{
        background: `linear-gradient(180deg, rgba(22, 38, 56, 0.78) 0%, rgba(16, 48, 82, 0.42) 100%)`,
        borderTop: `1px solid ${C.petrolio}`,
        borderBottom: "1px solid rgba(255,255,255,0.09)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <SurfaceTexture variant="ticker" />
      <motion.div
        className="relative flex w-max items-center gap-5 whitespace-nowrap px-4 text-[11px] font-medium"
        style={{ color: C.textSec }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-4">
            <span>
              {item.line}{" "}
              <span style={{ color: item.moodColor }}>({item.mood})</span>
            </span>
            <span style={{ color: C.primary }}>·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

const ICON_COLORS = new Map<LucideIcon, string>([
  [Train, "#c8a84b"],
  [Plane, "#4a9eff"],
  [Music, "#f472b6"],
  [UtensilsCrossed, "#fb923c"],
  [Dumbbell, "#6b8f71"],
  [Briefcase, "#8a8a8a"],
  [Cake, "#f472b6"],
  [PartyPopper, "#f472b6"],
]);

function EventCard({ event, muted = false }: { event: EventItem; muted?: boolean }) {
  const Icon = event.icon;
  const iconCol = muted ? C.textMuted : (ICON_COLORS.get(Icon) ?? C.primary);
  return (
    <div
      className="flex items-center gap-3 rounded-[10px] px-3 py-2"
      style={{
        fontFamily: sans,
        background: `
          linear-gradient(135deg, rgba(10, 22, 40, 0.28) 0%, transparent 52%),
          ${C.surface}
        `,
        opacity: muted ? 0.6 : 1,
      }}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm" style={{ background: C.pill }}>
        <Icon size={14} strokeWidth={2} style={{ color: iconCol }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium" style={{ color: C.text, fontFamily: sans }}>{event.label}</p>
        <p className="mt-0.5 text-[12px]" style={{ color: C.blue, fontFamily: sans }}>{event.time}</p>
      </div>
      {event.days != null && (
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            border: `1px solid ${C.primary}`,
            background: "transparent",
            color: C.primary,
            fontFamily: sans,
          }}
        >
          {event.days}g
        </span>
      )}
      {event.ago && (
        <span className="shrink-0 text-[10px]" style={{ color: C.textMuted, fontFamily: sans }}>{event.ago}</span>
      )}
    </div>
  );
}

function CategoryTile({
  cat,
  onOpen,
}: {
  cat: (typeof categorySheets)[0];
  onOpen: () => void;
}) {
  const Icon = cat.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative overflow-hidden rounded-[12px] p-2.5 text-left transition-transform active:scale-[0.98] ${cat.layout}`}
      style={{
        background: `
          linear-gradient(135deg, ${cat.accent}22 0%, transparent 62%),
          ${C.card}
        `,
      }}
    >
      <Icon
        size={40}
        strokeWidth={1.5}
        className="pointer-events-none absolute right-1 top-1"
        style={{ color: cat.accent, opacity: 0.15 }}
        aria-hidden
      />
      <div className="relative flex h-full min-h-0 flex-col justify-end">
        <div className="flex items-end justify-between gap-2">
          <p className="text-[13px] font-bold leading-tight" style={{ color: C.text }}>
            {cat.name}
          </p>
          <span
            className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums"
            style={{ background: `${cat.accent}18`, color: cat.accent }}
          >
            {cat.events.length}
          </span>
        </div>
      </div>
    </button>
  );
}

function CategorySheet({
  cat,
  onClose,
}: {
  cat: (typeof categorySheets)[0];
  onClose: () => void;
}) {
  const Icon = cat.icon;
  return (
    <>
      <motion.div
        className="fixed inset-0 z-[60] bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[70vh] max-w-[390px] overflow-hidden rounded-t-sm"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.32, ease: splashEase }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Icon size={18} style={{ color: cat.accent }} />
            <h3 className="text-[16px] font-semibold" style={{ color: C.text }}>{cat.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi">
            <X size={18} style={{ color: C.textSec }} />
          </button>
        </div>
        <div className="flex flex-col gap-1.5 overflow-y-auto px-4 pb-6">
          {cat.events.map((ev) => {
            const EvIcon = ev.icon;
            return (
              <div key={ev.label} className="flex items-center gap-2.5 rounded-sm px-3 py-2.5" style={{ background: C.pill }}>
                <EvIcon size={15} style={{ color: cat.accent }} />
                <div>
                  <p className="text-[13px] font-medium" style={{ color: C.text }}>{ev.label}</p>
                  <p className="text-[11px]" style={{ color: C.textSec }}>{ev.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

function AskOrCaBar() {
  return (
    <div
      className="flex items-center gap-2 rounded-[22px] px-3 py-2"
      style={{
        background: "#1c1c1c",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-0.5">
        <OrCaMark size={26} ring />
        <input
          type="text"
          readOnly
          placeholder="Chiedi a OrCa"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#6b6b6b]"
          style={{ color: C.text }}
        />
      </div>
      <button
        type="button"
        aria-label="Invia"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: C.primary }}
      >
        <ArrowUp size={15} strokeWidth={2.5} color="#fff" />
      </button>
    </div>
  );
}

function FixedBottomDock() {
  return (
    <div
      className="sticky bottom-0 z-50 shrink-0 border-t"
      style={{
        background: C.glass,
        borderColor: C.border,
        backdropFilter: "blur(20px) saturate(1.4)",
      }}
    >
      <div
        className="px-3 pt-2"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        <AskOrCaBar />
      </div>
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full" style={{ maxWidth: APP_W }}>
      <div
        className="relative flex max-h-[min(900px,92vh)] flex-col overflow-hidden rounded-[28px]"
        style={{
          background: `
            linear-gradient(180deg, ${C.topDark} 0%, rgba(10, 14, 18, 0.98) 64px, transparent 110px),
            linear-gradient(180deg, transparent 0%, rgba(13, 40, 71, 0.20) 22%, transparent 48%),
            radial-gradient(ellipse 70% 35% at 50% 18%, ${C.lightMist} 0%, transparent 55%),
            linear-gradient(180deg, transparent 55%, rgba(26, 18, 8, 0.10) 100%),
            ${C.card}
          `,
          border: `1px solid ${C.border}`,
          boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(74,158,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <SurfaceTexture variant="shell" />
        {children}
      </div>
    </div>
  );
}

export default function DesignTestPage() {
  const [splashDone, setSplashDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [openCategory, setOpenCategory] = useState<(typeof categorySheets)[0] | null>(null);
  const visibleCount = 4;
  const collapsed = allEvents.slice(0, visibleCount);
  const extra = allEvents.slice(visibleCount);
  const HeroIcon = nextEvent.icon;

  return (
    <div
      className={`${dmSans.variable} relative min-h-screen overflow-y-auto`}
      style={{ color: C.text, fontFamily: sans, background: "transparent" }}
    >
      <OceanBg />

      <AnimatePresence>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      </AnimatePresence>

      <div className={`flex min-h-screen items-start justify-center px-4 py-8 transition-opacity duration-300 ${splashDone ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <AppShell>
          <FixedTopBar />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <OrcaHeroZone />
            <DepartureTicker />

            <div className="pb-4">
            {/* Hero card — compatta */}
            <div className="px-4 pt-4">
              <div
                className="overflow-hidden rounded-md"
                style={{
                  background: `
                    linear-gradient(105deg, rgba(10, 22, 40, 0.35) 0%, transparent 38%),
                    #111810
                  `,
                  borderLeft: `3px solid ${C.primary}`,
                }}
              >
                <div className="flex">
                  <div className="min-w-0 flex-1 px-3 py-2">
                    <span
                      className="inline-flex items-center gap-0.5 rounded-sm px-1 py-px text-[8px] font-semibold uppercase tracking-wide"
                      style={{ background: C.pill, color: C.primary }}
                    >
                      <HeroIcon size={9} />
                      {nextEvent.category}
                    </span>
                    <h2 className="mt-1 text-[16px] font-semibold leading-snug" style={{ color: "#f0ebe0" }}>
                      {nextEvent.title}
                    </h2>
                    <p className="mt-0.5 text-[11px]" style={{ color: C.blue }}>
                      {nextEvent.time}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight" style={{ color: C.textSec }}>
                      FR 9542 · Carrozza 7 · Posto 42A
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button type="button" className="rounded-sm px-2.5 py-1 text-[10px] font-semibold" style={{ background: C.primary, color: "#fff" }}>
                        Apri biglietto
                      </button>
                      <button type="button" className="rounded-sm px-2 py-1 text-[9px] font-medium" style={{ background: C.pill, color: C.textSec, border: `1px solid ${C.border}` }}>
                        Dettagli
                      </button>
                      <button type="button" aria-label="Altro" className="flex h-6 w-6 items-center justify-center rounded-sm" style={{ background: C.pill }}>
                        <MoreHorizontal size={12} style={{ color: C.textSec }} />
                      </button>
                    </div>
                  </div>
                  <div
                    className="flex shrink-0 min-w-[52px] flex-col items-center justify-center px-1.5 py-2"
                    style={{
                      background: `linear-gradient(180deg, rgba(10,22,40,0.45) 0%, rgba(13,40,71,0.2) 100%)`,
                      borderLeft: `1px solid ${C.border}`,
                    }}
                  >
                    <span
                      className="text-[32px] font-bold leading-none"
                      style={{ color: C.primary, letterSpacing: "-0.5px" }}
                    >
                      {nextEvent.days}
                    </span>
                    <span
                      className="mt-0.5 text-[8px] font-medium uppercase"
                      style={{ color: C.sage, letterSpacing: "0.18em" }}
                    >
                      GIORNI
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 pt-6">
              <h3 className="mb-3 text-[16px] font-semibold" style={{ color: C.text }}>Prossimi eventi</h3>
              <div className="flex flex-col gap-1.5">
                {collapsed.map((ev) => <EventCard key={ev.label} event={ev} />)}
              </div>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-sm py-2"
                style={{ background: C.pill, border: `1px solid ${C.border}` }}
                aria-expanded={expanded}
              >
                <span className="text-[11px]" style={{ color: C.textSec }}>{expanded ? "Comprimi" : `Altri ${extra.length}`}</span>
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown size={12} style={{ color: C.textSec }} />
                </motion.span>
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: splashEase }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1 pt-1">{extra.map((ev) => <EventCard key={ev.label} event={ev} />)}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-4 pt-6">
              <h3 className="mb-3 text-[16px] font-semibold" style={{ color: C.text }}>Le tue categorie</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {categorySheets.map((cat) => (
                  <CategoryTile key={cat.id} cat={cat} onOpen={() => setOpenCategory(cat)} />
                ))}
              </div>
            </div>

            <div className="px-4 pt-6 pb-5">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: C.textMuted }}>Eventi passati</p>
              <div className="flex flex-col gap-1.5">
                {pastEvents.map((ev) => <EventCard key={ev.label} event={ev} muted />)}
              </div>
            </div>
          </div>
          </div>

          <FixedBottomDock />
        </AppShell>
      </div>

      <AnimatePresence>
        {openCategory && <CategorySheet cat={openCategory} onClose={() => setOpenCategory(null)} />}
      </AnimatePresence>
    </div>
  );
}
