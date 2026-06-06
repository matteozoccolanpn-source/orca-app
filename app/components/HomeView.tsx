"use client";

import { useState } from "react";
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
  Users,
  X,
  Hotel,
  Landmark,
  MapPin,
  Ticket as TicketIcon,
  Phone,
  Bookmark,
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Ticket } from "@/lib/airtable";
import { formatEventDate } from "@/lib/format";
import { actionsForType, type ActionButton } from "./actions";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const sans = "var(--font-dm-sans), 'DM Sans', sans-serif";
const splashEase = [0.22, 1, 0.36, 1] as const;

const C = {
  bg: "#0a0908",
  topDark: "#060508",
  petrolio: "#0a1628",
  oceanBlue: "#0d2847",
  oceanBlueSoft: "rgba(74, 158, 255, 0.14)",
  lightMist: "rgba(232, 224, 208, 0.045)",
  lightLine: "rgba(255, 255, 255, 0.06)",
  sand: "#1a1208",
  surface: "#141810",
  card: "#111810",
  text: "#e8e0d0",
  textSec: "#8a9080",
  textMuted: "#5c6358",
  border: "#2a3024",
  glass: "rgba(6, 5, 8, 0.92)",
  pill: "rgba(200, 168, 75, 0.08)",
  primary: "#c8a84b",
  sage: "#6b8f71",
  blue: "#4a9eff",
} as const;

const TYPE_ICON: Record<string, LucideIcon> = {
  train: Train,
  flight: Plane,
  concert: Music,
  hotel: Hotel,
  museum: Landmark,
  restaurant: UtensilsCrossed,
  sport: Dumbbell,
  work: Briefcase,
  lavoro: Briefcase,
  family: Users,
  famiglia: Users,
};

const TYPE_CATEGORY: Record<string, string> = {
  train: "Viaggi",
  flight: "Viaggi",
  hotel: "Viaggi",
  concert: "Serate",
  museum: "Serate",
  restaurant: "Cibo",
  sport: "Sport",
  work: "Lavoro",
  lavoro: "Lavoro",
  family: "Famiglia",
  famiglia: "Famiglia",
};

const ACTION_ICON: Record<string, LucideIcon> = {
  Mappa: MapPin,
  Biglietto: TicketIcon,
  Chiama: Phone,
  Prenotazione: Bookmark,
};

type BentoCategory = {
  id: string;
  name: string;
  icon: LucideIcon;
  accent: string;
  layout: string;
  match: (type: string) => boolean;
};

const BENTO_CATEGORIES: BentoCategory[] = [
  {
    id: "tutti",
    name: "Tutti",
    icon: LayoutGrid,
    accent: C.primary,
    layout: "col-span-2 row-span-2 min-h-[120px]",
    match: () => true,
  },
  {
    id: "viaggi",
    name: "Viaggi",
    icon: Plane,
    accent: C.primary,
    layout: "col-span-1 row-span-1 min-h-[60px]",
    match: (t) => ["train", "flight", "hotel"].includes(t),
  },
  {
    id: "serate",
    name: "Serate",
    icon: Music,
    accent: C.primary,
    layout: "col-span-1 row-span-1 min-h-[60px]",
    match: (t) => ["concert", "museum"].includes(t),
  },
  {
    id: "cibo",
    name: "Cibo",
    icon: UtensilsCrossed,
    accent: C.sage,
    layout: "col-span-1 row-span-1 min-h-[60px]",
    match: (t) => t === "restaurant",
  },
  {
    id: "sport",
    name: "Sport",
    icon: Dumbbell,
    accent: C.sage,
    layout: "col-span-1 row-span-1 min-h-[56px]",
    match: (t) => t === "sport",
  },
  {
    id: "lavoro",
    name: "Lavoro",
    icon: Briefcase,
    accent: C.textSec,
    layout: "col-span-1 row-span-1 min-h-[56px]",
    match: (t) => ["work", "lavoro"].includes(t),
  },
  {
    id: "famiglia",
    name: "Famiglia",
    icon: Users,
    accent: C.primary,
    layout: "col-span-2 row-span-1 min-h-[56px]",
    match: (t) => ["family", "famiglia"].includes(t),
  },
];

function daysUntil(datetime: string): number {
  if (!datetime) return 0;
  const event = new Date(datetime);
  if (isNaN(event.getTime())) return 0;
  const diffMs = event.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function iconForType(type: string): LucideIcon {
  return TYPE_ICON[type?.toLowerCase()] ?? LayoutGrid;
}

function categoryLabel(type: string): string {
  return TYPE_CATEGORY[type?.toLowerCase()] ?? "Evento";
}

function eventsForBento(cat: BentoCategory, events: Ticket[]): Ticket[] {
  if (cat.id === "tutti") return events;
  return events.filter((e) => cat.match(e.type?.toLowerCase()));
}

function tickerMood(days: number): { mood: string; color: string } {
  if (days <= 2) return { mood: "figata 🔥", color: C.sage };
  if (days <= 7) return { mood: "ok dai", color: C.textSec };
  if (days <= 14) return { mood: "che fatica", color: C.textSec };
  return { mood: "che palle 😵", color: C.textSec };
}

function buildTickerItems(events: Ticket[]) {
  return events.slice(0, 8).map((ev) => {
    const days = daysUntil(ev.datetime);
    const { mood, color } = tickerMood(days);
    const date = formatEventDate(ev.datetime);
    const line = [ev.title, date].filter(Boolean).join(" · ");
    return { line, mood, moodColor: color };
  });
}

function OceanBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
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
      <div
        className="absolute inset-x-0 top-[36%] h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(74,158,255,0.14) 18%, ${C.lightLine} 50%, rgba(200,168,75,0.10) 82%, transparent 100%)`,
        }}
      />
      <motion.div
        className="absolute -left-16 bottom-[-10%] h-80 w-80 rounded-full blur-[110px]"
        style={{ background: "#c8a84b08" }}
        animate={{ x: [0, 36, 0], y: [0, -24, 0], scale: [1, 1.14, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/3 top-[8%] h-96 w-96 rounded-full blur-[120px]"
        style={{ background: "#4a9eff0c" }}
        animate={{ x: [0, 40, 0], y: [0, 32, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function OrcaInO({ px }: { px: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 80 80" fill="none" aria-hidden>
      <circle cx="40" cy="40" r="32" fill="none" stroke={C.primary} strokeWidth={2.5} />
    </svg>
  );
}

function OrCaMark({
  size = 80,
  showWordmark = false,
  showTagline = false,
}: {
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
}) {
  if (!showWordmark) return <OrcaInO px={size} />;

  const letterSize = size * 0.58;
  const aSize = letterSize * 0.86;

  return (
    <div className="flex flex-col items-center text-center">
      <OrcaInO px={size} />
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

function FixedTopBar() {
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5"
      style={{
        background: `linear-gradient(180deg, ${C.topDark} 0%, rgba(8, 10, 14, 0.96) 100%)`,
        borderBottom: `1px solid ${C.petrolio}`,
        boxShadow: `inset 0 1px 0 ${C.lightLine}`,
        backdropFilter: "blur(16px) saturate(1.2)",
        paddingTop: "max(10px, env(safe-area-inset-top))",
      }}
    >
      <div className="flex items-center gap-2.5">
        <OrcaInO px={36} />
        <span className="text-[17px] font-bold tracking-tight" style={{ color: C.text }}>
          OrCa
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
        Organize your Calendar
      </p>
    </header>
  );
}

function DepartureTicker({ events }: { events: Ticket[] }) {
  const items = buildTickerItems(events);
  if (items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <div
      className="relative overflow-hidden py-1"
      style={{
        background: `linear-gradient(180deg, rgba(22, 38, 56, 0.78) 0%, rgba(16, 48, 82, 0.42) 100%)`,
        borderTop: `1px solid ${C.petrolio}`,
        borderBottom: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <motion.div
        className="relative flex w-max items-center gap-5 whitespace-nowrap px-4 text-[11px] font-medium"
        style={{ color: C.textSec }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((item, i) => (
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

function OrcaHeroZone({ events }: { events: Ticket[] }) {
  return (
    <div
      className="relative overflow-hidden px-4 pb-0 pt-6"
      style={{
        background: `
          linear-gradient(180deg, rgba(8, 10, 14, 0.45) 0%, transparent 40%),
          radial-gradient(ellipse 80% 60% at 50% 70%, ${C.oceanBlueSoft} 0%, transparent 65%)
        `,
      }}
    >
      <div className="relative flex justify-center pb-4">
        <OrCaMark size={88} showWordmark showTagline />
      </div>
      <DepartureTicker events={events} />
    </div>
  );
}

function ActionButtons({
  type,
  location,
  size = "md",
}: {
  type: string;
  location: string;
  size?: "sm" | "md";
}) {
  const actions = actionsForType(type, location);
  const isSm = size === "sm";

  return (
    <div className={`flex items-center ${isSm ? "gap-1" : "gap-1.5"}`}>
      {actions.map((btn, i) => (
        <ActionLink key={btn.label} btn={btn} primary={i === 0} size={size} />
      ))}
    </div>
  );
}

function ActionLink({
  btn,
  primary,
  size,
}: {
  btn: ActionButton;
  primary: boolean;
  size: "sm" | "md";
}) {
  const Icon = ACTION_ICON[btn.label] ?? MapPin;
  const isSm = size === "sm";

  return (
    <a
      href={btn.href}
      target={btn.href.startsWith("http") ? "_blank" : undefined}
      rel={btn.href.startsWith("http") ? "noopener noreferrer" : undefined}
      className={`inline-flex items-center gap-1 font-semibold ${isSm ? "rounded-sm px-2 py-0.5 text-[9px]" : "rounded-sm px-2.5 py-1 text-[10px]"}`}
      style={
        primary
          ? { background: C.primary, color: "#fff" }
          : { background: C.pill, color: C.textSec, border: `1px solid ${C.border}` }
      }
    >
      <Icon size={isSm ? 10 : 11} strokeWidth={2} />
      {btn.label}
    </a>
  );
}

function HeroEventCard({ event }: { event: Ticket }) {
  const Icon = iconForType(event.type);
  const days = daysUntil(event.datetime);
  const formatted = formatEventDate(event.datetime);

  return (
    <div className="px-4 pt-4">
      <div
        className="overflow-hidden rounded-md"
        style={{
          background: `linear-gradient(105deg, rgba(10, 22, 40, 0.35) 0%, transparent 38%), ${C.card}`,
          borderLeft: `3px solid ${C.primary}`,
        }}
      >
        <div className="flex">
          <div className="min-w-0 flex-1 px-3 py-2">
            <span
              className="inline-flex items-center gap-0.5 rounded-sm px-1 py-px text-[8px] font-semibold uppercase tracking-wide"
              style={{ background: C.pill, color: C.primary }}
            >
              <Icon size={9} />
              {categoryLabel(event.type)}
            </span>
            <h2 className="mt-1 text-[16px] font-semibold leading-snug" style={{ color: "#f0ebe0" }}>
              {event.title}
            </h2>
            {formatted && (
              <p className="mt-0.5 text-[11px]" style={{ color: C.blue }}>
                {formatted}
              </p>
            )}
            {event.location && (
              <p className="mt-0.5 truncate text-[10px] leading-tight" style={{ color: C.textSec }}>
                {event.location}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <ActionButtons type={event.type} location={event.location} />
              <button
                type="button"
                className="rounded-sm px-2 py-1 text-[9px] font-medium"
                style={{ background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` }}
              >
                Dettagli
              </button>
            </div>
          </div>
          <div
            className="flex min-w-[52px] shrink-0 flex-col items-center justify-center px-1.5 py-2"
            style={{
              background: `linear-gradient(180deg, rgba(10,22,40,0.45) 0%, rgba(13,40,71,0.2) 100%)`,
              borderLeft: `1px solid ${C.border}`,
            }}
          >
            <span
              className="text-[32px] font-bold leading-none"
              style={{ color: C.primary, letterSpacing: "-0.5px" }}
            >
              {days}
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
  );
}

function EventRow({ event }: { event: Ticket }) {
  const Icon = iconForType(event.type);
  const days = daysUntil(event.datetime);
  const formatted = formatEventDate(event.datetime);

  return (
    <div
      className="rounded-[10px] px-3 py-2"
      style={{
        fontFamily: sans,
        background: `linear-gradient(135deg, rgba(10, 22, 40, 0.28) 0%, transparent 52%), ${C.surface}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm" style={{ background: C.pill }}>
          <Icon size={14} strokeWidth={2} style={{ color: C.primary }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium" style={{ color: C.text }}>
            {event.title}
          </p>
          {formatted && (
            <p className="mt-0.5 text-[12px]" style={{ color: C.blue }}>
              {formatted}
            </p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ border: `1px solid ${C.primary}`, color: C.primary }}
        >
          {days}g
        </span>
      </div>
      <div className="mt-2 pl-10">
        <ActionButtons type={event.type} location={event.location} size="sm" />
      </div>
    </div>
  );
}

function CategoryTile({
  cat,
  count,
  onOpen,
}: {
  cat: BentoCategory;
  count: number;
  onOpen: () => void;
}) {
  const Icon = cat.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`relative overflow-hidden rounded-[12px] p-2.5 text-left transition-transform active:scale-[0.98] ${cat.layout}`}
      style={{
        background: `linear-gradient(135deg, ${cat.accent}22 0%, transparent 62%), ${C.card}`,
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
            {count}
          </span>
        </div>
      </div>
    </button>
  );
}

function CategorySheet({
  cat,
  events,
  onClose,
}: {
  cat: BentoCategory;
  events: Ticket[];
  onClose: () => void;
}) {
  const Icon = cat.icon;
  const filtered = eventsForBento(cat, events);

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
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[70vh] max-w-lg overflow-hidden rounded-t-sm"
        style={{ background: C.card, border: `1px solid ${C.border}` }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.32, ease: splashEase }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Icon size={18} style={{ color: cat.accent }} />
            <h3 className="text-[16px] font-semibold" style={{ color: C.text }}>
              {cat.name}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi">
            <X size={18} style={{ color: C.textSec }} />
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-8">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[13px]" style={{ color: C.textSec }}>
              Nessun evento in questa categoria
            </p>
          ) : (
            filtered.map((ev) => <EventRow key={ev.id} event={ev} />)
          )}
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
        <OrcaInO px={26} />
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
      <OrcaInO px={64} />
      <p className="text-sm font-medium" style={{ color: C.text }}>
        Nessun evento
      </p>
      <p className="text-xs" style={{ color: C.textSec }}>
        Il calendario è vuoto per ora
      </p>
    </div>
  );
}

export default function HomeView({ events }: { events: Ticket[] }) {
  const [expanded, setExpanded] = useState(false);
  const [openCategory, setOpenCategory] = useState<BentoCategory | null>(null);

  const [hero, ...upcoming] = events;
  const visibleCount = 4;
  const collapsed = upcoming.slice(0, visibleCount);
  const extra = upcoming.slice(visibleCount);

  return (
    <div
      className={`${dmSans.variable} relative min-h-screen`}
      style={{ color: C.text, fontFamily: sans, background: C.bg }}
    >
      <OceanBg />

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col">
        <FixedTopBar />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-36">
          <OrcaHeroZone events={events} />

          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {hero && <HeroEventCard event={hero} />}

              {upcoming.length > 0 && (
                <div className="px-4 pt-6">
                  <h3 className="mb-3 text-[16px] font-semibold" style={{ color: C.text }}>
                    Prossimi eventi
                  </h3>
                  <div className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto overscroll-contain">
                    {collapsed.map((ev) => (
                      <EventRow key={ev.id} event={ev} />
                    ))}
                  </div>
                  {extra.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-sm py-2"
                        style={{ background: C.pill, border: `1px solid ${C.border}` }}
                        aria-expanded={expanded}
                      >
                        <span className="text-[11px]" style={{ color: C.textSec }}>
                          {expanded ? "Comprimi" : `Altri ${extra.length}`}
                        </span>
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
                            <div className="flex flex-col gap-1 pt-1">
                              {extra.map((ev) => (
                                <EventRow key={ev.id} event={ev} />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}

              <div className="px-4 pt-6 pb-6">
                <h3 className="mb-3 text-[16px] font-semibold" style={{ color: C.text }}>
                  Le tue categorie
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {BENTO_CATEGORIES.map((cat) => (
                    <CategoryTile
                      key={cat.id}
                      cat={cat}
                      count={eventsForBento(cat, events).length}
                      onOpen={() => setOpenCategory(cat)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="fixed inset-x-0 z-40 mx-auto max-w-lg px-3"
        style={{ bottom: "calc(4.25rem + env(safe-area-inset-bottom))" }}
      >
        <AskOrCaBar />
      </div>

      <AnimatePresence>
        {openCategory && (
          <CategorySheet
            cat={openCategory}
            events={events}
            onClose={() => setOpenCategory(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
