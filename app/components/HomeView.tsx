"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
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
  Landmark,
  MapPin,
  Ticket as TicketIcon,
  Phone,
  Bookmark,
  LayoutGrid,
  Trash2,
  MoreHorizontal,
  Share2,
  Pencil,
  BookOpen,
  IdCard,
  Stethoscope,
  Building2,
  Route,
  Home as HomeIcon,
  Search,
  Plus,
  Calendar,
  User,
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
const SWIPE_THRESHOLD = -72;
const SWIPE_SNAP_AT = SWIPE_THRESHOLD / 2;
const SWIPE_SPRING = { type: "spring" as const, stiffness: 400, damping: 40 };

const scrollStyle = {
  scrollBehavior: "smooth" as const,
  WebkitOverflowScrolling: "touch" as const,
};

/**
 * Dark chrome (top/bottom bars) + light body palette.
 * GOLD is the only action color: light surfaces use #D2A93E, dark surfaces #D8BC62.
 * Teal/sky tones live only in the dark bars, background veils and the time badge.
 */
const C = {
  // Dark chrome
  chromeTopFrom: "#1B212A",
  chromeTopTo: "#181E25",
  chromeBotFrom: "#181E25",
  chromeBotTo: "#1B212A",
  chromeText: "#ECEFF2",
  chromeTextSec: "#969DA6",
  chromeBorder: "rgba(160, 190, 210, 0.10)",
  chip: "rgba(255, 255, 255, 0.06)",
  chipBorder: "rgba(160, 190, 210, 0.14)",
  chipText: "#B8BEC6",
  askBorder: "rgba(216, 188, 98, 0.40)",
  askBg: "#E1E3E1",
  askText: "#232527",
  askPlaceholder: "#6E737A",
  goldOnDark: "#D8BC62",
  goldOnDarkText: "#1C1408",
  goldMuted: "#BFA75A",
  navInactive: "#6A727B",

  // Light body
  bodyBg: "#ECECE7",
  heroCard: "#FAFAF7",
  heroBorder: "#E1E4E2",
  secCard: "#F7F7F4",
  secBorder: "#E4E5E1",
  iconChipBg: "#ECEEEC",
  iconChip: "#6E737A",
  dayCount: "#9CA1A8",
  dashed: "#CFD2CC",
  text: "#232527",
  textSec: "#6E737A",
  textTer: "#9CA1A8",
  tagBg: "#F2E8CE",
  tagText: "#84641C",
  badgeBg: "rgba(96, 150, 178, 0.16)",
  badgeText: "#3C5A6B",
  goldOnLight: "#D2A93E",
  goldOnLightText: "#2A2206",
  goldSmallLight: "#A8802E",
  ghostBorder: "#DCDED9",
  ghostText: "#3A3E44",

  // Splash (stays dark)
  splashBg: "#181E25",
  splashText: "#ECEFF2",
  splashMuted: "#969DA6",

  // Destructive (kept)
  danger: "#8b4040",
  dangerSoft: "#c47676",
} as const;

const SUGGESTIONS = ["Cosa ho questa settimana?", "Scadenze in arrivo?"];

const TYPE_ICON: Record<string, LucideIcon> = {
  train: Train,
  flight: Plane,
  travel: Plane,
  viaggio: Route,
  trip: Route,
  lesson: BookOpen,
  lezione: BookOpen,
  english: BookOpen,
  inglese: BookOpen,
  corso: BookOpen,
  patente: IdCard,
  id: IdCard,
  documento: IdCard,
  document: IdCard,
  medico: Stethoscope,
  doctor: Stethoscope,
  salute: Stethoscope,
  hotel: Building2,
  concert: Music,
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
  layout: string;
  match: (type: string) => boolean;
};

const BENTO_CATEGORIES: BentoCategory[] = [
  {
    id: "tutti",
    name: "Tutti",
    icon: LayoutGrid,
    layout: "col-span-2 row-span-2 max-h-[100px]",
    match: () => true,
  },
  {
    id: "viaggi",
    name: "Viaggi",
    icon: Plane,
    layout: "col-span-1 row-span-1 max-h-[100px]",
    match: (t) => ["train", "flight", "hotel"].includes(t),
  },
  {
    id: "serate",
    name: "Serate",
    icon: Music,
    layout: "col-span-1 row-span-1 max-h-[100px]",
    match: (t) => ["concert", "museum"].includes(t),
  },
  {
    id: "cibo",
    name: "Cibo",
    icon: UtensilsCrossed,
    layout: "col-span-1 row-span-1 max-h-[100px]",
    match: (t) => t === "restaurant",
  },
  {
    id: "sport",
    name: "Sport",
    icon: Dumbbell,
    layout: "col-span-1 row-span-1 max-h-[100px]",
    match: (t) => t === "sport",
  },
  {
    id: "lavoro",
    name: "Lavoro",
    icon: Briefcase,
    layout: "col-span-1 row-span-1 max-h-[100px]",
    match: (t) => ["work", "lavoro"].includes(t),
  },
  {
    id: "famiglia",
    name: "Famiglia",
    icon: Users,
    layout: "col-span-2 row-span-1 max-h-[100px]",
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
  return TYPE_ICON[type?.toLowerCase()] ?? Calendar;
}

function categoryLabel(type: string): string {
  return TYPE_CATEGORY[type?.toLowerCase()] ?? "Evento";
}

function countdownLabel(days: number): string {
  if (days <= 0) return "OGGI";
  return `TRA ${days} ${days === 1 ? "GIORNO" : "GIORNI"}`;
}

/** Compact ticker date: weekday + 12h time, e.g. "MER · 8.30pm". */
function tickerDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const weekday = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    timeZone: "Europe/Rome",
  })
    .format(d)
    .replace(".", "")
    .toUpperCase();
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Europe/Rome",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const ampm = get("dayPeriod").toLowerCase().replace(/[^a-z]/g, "");
  const time = `${get("hour")}.${get("minute")}${ampm}`;
  return `${weekday} · ${time}`;
}

/** First word of the title, uppercased and clipped, e.g. "Inglese con…" -> "INGLESE". */
function shortTitle(title: string, max = 10): string {
  const first = title.trim().split(/\s+/)[0] ?? "";
  const up = first.toUpperCase();
  return up.length > max ? up.slice(0, max) : up;
}

function eventsForBento(cat: BentoCategory, events: Ticket[]): Ticket[] {
  if (cat.id === "tutti") return events;
  return events.filter((e) => cat.match(e.type?.toLowerCase()));
}

function EventTypeIcon({ event }: { event: Ticket }) {
  const Icon = iconForType(event.type);
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
      style={{ background: C.iconChipBg }}
      aria-hidden
    >
      <Icon size={18} strokeWidth={1.75} style={{ color: C.iconChip }} />
    </div>
  );
}

/** Two thin arcs fading at the edges, behind the dark top bar. */
function OceanLines() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 56"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="oceanStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2A7B83" />
          <stop offset="50%" stopColor="#4E9FB8" />
          <stop offset="100%" stopColor="#92C8E4" />
        </linearGradient>
        <linearGradient id="oceanMaskGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="black" />
          <stop offset="22%" stopColor="white" />
          <stop offset="78%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
        <mask id="oceanMask">
          <rect x="0" y="0" width="400" height="56" fill="url(#oceanMaskGrad)" />
        </mask>
      </defs>
      <g
        mask="url(#oceanMask)"
        fill="none"
        stroke="url(#oceanStroke)"
        strokeWidth="1"
        opacity="0.45"
      >
        <path d="M-20 30 Q 200 6 420 26" vectorEffect="non-scaling-stroke" />
        <path d="M-20 46 Q 200 22 420 42" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

function OrCaMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="46" stroke="#c8a84b" strokeWidth="3" fill="#2b333d" />
      <ellipse cx="48" cy="55" rx="28" ry="18" fill="#1a1a1a" />
      <ellipse cx="44" cy="60" rx="16" ry="10" fill="#e8e8e8" />
      <path d="M50 37 L58 22 L65 37 Z" fill="#1a1a1a" />
      <path d="M18 50 L8 42 L12 55 L8 62 L20 56 Z" fill="#1a1a1a" />
      <path d="M42 65 L32 74 L45 70 Z" fill="#1a1a1a" />
      <ellipse cx="68" cy="48" rx="8" ry="7" fill="#e8e8e8" />
      <circle cx="69" cy="48" r="3.5" fill="#1a1a1a" />
      <circle cx="70" cy="47" r="1" fill="white" />
      <path d="M60 56 Q67 66 76 58" stroke="#1a1a1a" strokeWidth="1.5" fill="#c41e1e" strokeLinecap="round" />
      <path d="M62 57 L63 62 L65 57" fill="white" stroke="#1a1a1a" strokeWidth="0.5" />
      <path d="M65 58 L66 63 L68 58" fill="white" stroke="#1a1a1a" strokeWidth="0.5" />
      <path d="M68 58 L69 63 L71 58" fill="white" stroke="#1a1a1a" strokeWidth="0.5" />
      <path d="M71 57 L72 62 L74 57" fill="white" stroke="#1a1a1a" strokeWidth="0.5" />
      <path d="M63 62 L64 58 L66 62" fill="white" stroke="#1a1a1a" strokeWidth="0.5" />
      <path d="M67 63 L68 59 L70 63" fill="white" stroke="#1a1a1a" strokeWidth="0.5" />
      <path d="M71 62 L72 58 L74 62" fill="white" stroke="#1a1a1a" strokeWidth="0.5" />
    </svg>
  );
}

function SplashScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${C.chromeTopFrom} 0%, ${C.chromeTopTo} 100%)`,
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.5, ease: splashEase }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2"
        aria-hidden
      >
        <OceanLines />
      </div>
      <motion.div
        className="relative flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: splashEase }}
      >
        <OrCaMark size={132} />
        <div className="mt-5 text-[34px] font-bold tracking-tight" style={{ color: C.splashText }}>
          OrCa
        </div>
        <div
          className="mt-1.5 text-[11px] uppercase tracking-[0.22em]"
          style={{ color: C.splashMuted }}
        >
          Organize your Calendar
        </div>
      </motion.div>
    </motion.div>
  );
}

function FixedTopBar() {
  return (
    <header
      className="relative z-50 flex shrink-0 items-center justify-between overflow-hidden px-4 py-1.5"
      style={{
        background: `linear-gradient(180deg, ${C.chromeTopFrom} 0%, ${C.chromeTopTo} 100%)`,
        paddingTop: "max(6px, env(safe-area-inset-top))",
      }}
    >
      <OceanLines />
      <div className="relative flex items-center gap-2.5">
        <OrCaMark size={30} />
        <span className="text-[17px] font-bold tracking-tight" style={{ color: C.chromeText }}>
          OrCa
        </span>
      </div>
      {/* Right side intentionally left empty: Aggiorna + Logout live in app/page.tsx overlay */}
      <div className="relative h-7 w-32" aria-hidden />
    </header>
  );
}

function ActionButtons({ type, location }: { type: string; location: string }) {
  const actions = actionsForType(type, location);
  return (
    <div className="flex items-center gap-2">
      {actions.map((btn, i) => (
        <ActionLink key={btn.label} btn={btn} primary={i === 0} />
      ))}
    </div>
  );
}

function ActionLink({ btn, primary }: { btn: ActionButton; primary: boolean }) {
  const Icon = ACTION_ICON[btn.label] ?? MapPin;
  return (
    <a
      href={btn.href}
      target={btn.href.startsWith("http") ? "_blank" : undefined}
      rel={btn.href.startsWith("http") ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2.5 text-[14px] font-semibold"
      style={
        primary
          ? { background: C.goldOnLight, color: C.goldOnLightText }
          : { background: "transparent", color: C.ghostText, border: `1px solid ${C.ghostBorder}` }
      }
    >
      <Icon size={15} strokeWidth={2} />
      {btn.label}
    </a>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-x-0 z-[110] mx-auto flex max-w-lg justify-center px-4"
      style={{ bottom: "calc(11rem + env(safe-area-inset-bottom))" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.24, ease: splashEase }}
    >
      <div
        className="rounded-full px-4 py-2 text-[13px] font-medium shadow-lg"
        style={{
          background: C.chromeTopTo,
          color: C.chromeText,
          border: `1px solid ${C.chromeBorder}`,
        }}
      >
        {message}
      </div>
    </motion.div>
  );
}

function HeroMenuSheet({
  onClose,
  onDelete,
  onShare,
  onEdit,
}: {
  onClose: () => void;
  onDelete: () => void;
  onShare: () => void;
  onEdit: () => void;
}) {
  const items = [
    { id: "share", label: "Condividi", icon: Share2, color: C.text, onClick: onShare },
    { id: "edit", label: "Modifica", icon: Pencil, color: C.text, onClick: onEdit },
    { id: "delete", label: "Elimina", icon: Trash2, color: C.danger, onClick: onDelete },
  ];

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[90] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-[95] mx-auto max-w-lg overflow-hidden rounded-t-2xl"
        style={{ background: C.heroCard, border: `1px solid ${C.heroBorder}` }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.32, ease: splashEase }}
      >
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full" style={{ background: C.heroBorder }} />
        </div>
        <div
          className="flex flex-col p-2"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-left text-[15px] font-medium transition-colors active:bg-black/5"
                style={{ color: item.color }}
              >
                <Icon size={18} strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}

function HeroEventCard({
  event,
  onRemoved,
  onRestored,
}: {
  event: Ticket;
  onRemoved: (id: string) => void;
  onRestored: (id: string) => void;
}) {
  const router = useRouter();
  const days = daysUntil(event.datetime);
  const formatted = formatEventDate(event.datetime);
  const dateLine = [formatted, event.location].filter(Boolean).join(" · ");

  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  async function handleDelete() {
    setLoading(true);
    setShowConfirm(false);
    setRemoved(true);
    onRemoved(event.id);

    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Eliminazione fallita");
      router.refresh();
    } catch {
      setRemoved(false);
      onRestored(event.id);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    setShowMenu(false);
    const shareData = {
      title: event.title,
      text: [event.title, formatted, event.location].filter(Boolean).join(" · "),
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard?.writeText(shareData.text);
        setToast("Copiato negli appunti");
      }
    } catch {
      /* user cancelled share — no-op */
    }
  }

  function handleEdit() {
    setShowMenu(false);
    setToast("Modifica — coming soon");
  }

  if (removed) return null;

  const TypeIcon = iconForType(event.type);

  return (
    <div className="px-4 pt-4">
      <div
        className="relative overflow-hidden rounded-[18px] p-5"
        style={{ background: C.heroCard, border: `1px solid ${C.heroBorder}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
            style={{ background: C.tagBg, color: C.tagText }}
          >
            <TypeIcon size={13} strokeWidth={2} />
            {categoryLabel(event.type)}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ background: C.badgeBg, color: C.badgeText }}
            >
              {countdownLabel(days)}
            </span>
            <button
              type="button"
              onClick={() => setShowMenu(true)}
              aria-label="Altre opzioni"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors active:bg-black/5"
              style={{ color: C.textSec }}
            >
              <MoreHorizontal size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        <h2 className="mt-3 text-[26px] font-bold leading-tight" style={{ color: C.text }}>
          {event.title}
        </h2>

        {dateLine && (
          <p className="mt-2 flex items-center gap-1.5 text-[13px]" style={{ color: C.textSec }}>
            <Calendar size={13} strokeWidth={1.75} style={{ color: C.textTer }} />
            {dateLine}
          </p>
        )}

        <div className="mt-4">
          <ActionButtons type={event.type} location={event.location} />
        </div>
      </div>

      <AnimatePresence>
        {showMenu && (
          <HeroMenuSheet
            onClose={() => setShowMenu(false)}
            onDelete={() => {
              setShowMenu(false);
              setShowConfirm(true);
            }}
            onShare={handleShare}
            onEdit={handleEdit}
          />
        )}
      </AnimatePresence>

      {showConfirm && (
        <DeleteConfirmDialog
          title={event.title}
          loading={loading}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleDelete}
        />
      )}

      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}

function EventRowContent({ event }: { event: Ticket }) {
  const days = daysUntil(event.datetime);
  const formatted = formatEventDate(event.datetime);

  return (
    <div className="flex items-center gap-3 p-4">
      <EventTypeIcon event={event} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold" style={{ color: C.text }}>
          {event.title}
        </p>
        {formatted && (
          <p className="mt-0.5 truncate text-[13px]" style={{ color: C.textSec }}>
            {formatted}
          </p>
        )}
      </div>
      <span className="shrink-0 text-[13px] tabular-nums" style={{ color: C.dayCount }}>
        {days}g
      </span>
    </div>
  );
}

function DeleteConfirmDialog({
  title,
  loading,
  onCancel,
  onConfirm,
}: {
  title: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ background: C.heroCard, border: `1px solid ${C.heroBorder}` }}
      >
        <h4 id="delete-dialog-title" className="text-base font-bold" style={{ color: C.text }}>
          Eliminare questo evento?
        </h4>
        <p className="mt-2 text-[14px]" style={{ color: C.textSec }}>
          {title}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ border: `1px solid ${C.ghostBorder}`, color: C.ghostText }}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: C.danger }}
          >
            {loading ? "Eliminazione…" : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SwipeEventRow({
  event,
  onRemoved,
  onRestored,
}: {
  event: Ticket;
  onRemoved: (id: string) => void;
  onRestored: (id: string) => void;
}) {
  const router = useRouter();
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const deleteScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.7, 1]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removed, setRemoved] = useState(false);

  function handleDragEnd() {
    if (x.get() < SWIPE_SNAP_AT) {
      animate(x, SWIPE_THRESHOLD, SWIPE_SPRING);
    } else {
      animate(x, 0, SWIPE_SPRING);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setShowConfirm(false);
    setRemoved(true);
    onRemoved(event.id);

    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Eliminazione fallita");
      router.refresh();
    } catch {
      setRemoved(false);
      onRestored(event.id);
      animate(x, 0, SWIPE_SPRING);
    } finally {
      setLoading(false);
    }
  }

  if (removed) return null;

  return (
    <>
      <div
        className="relative overflow-hidden rounded-[14px]"
        style={{ border: `1px solid ${C.secBorder}` }}
      >
        <motion.div
          className="absolute inset-y-0 right-0 flex w-20 items-center justify-center"
          style={{ background: C.danger, opacity: deleteOpacity }}
        >
          <motion.button
            type="button"
            style={{ scale: deleteScale }}
            onClick={() => setShowConfirm(true)}
            className="flex flex-col items-center gap-1"
            aria-label="Elimina evento"
          >
            <Trash2 className="size-4 text-white" />
            <span className="text-[10px] font-medium text-white">Elimina</span>
          </motion.button>
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: SWIPE_THRESHOLD, right: 0 }}
          dragElastic={{ left: 0.1, right: 0.05 }}
          onDragEnd={handleDragEnd}
          style={{ x, background: C.secCard }}
          className={`relative z-10 ${loading ? "pointer-events-none opacity-50" : ""}`}
        >
          <EventRowContent event={event} />
        </motion.div>
      </div>

      {showConfirm && (
        <DeleteConfirmDialog
          title={event.title}
          loading={loading}
          onCancel={() => {
            setShowConfirm(false);
            animate(x, 0, SWIPE_SPRING);
          }}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function TripsPlaceholder() {
  return (
    <div className="px-4 pt-2">
      <div
        className="flex items-center gap-3 rounded-[14px] px-4 py-4"
        style={{ border: `1px dashed ${C.dashed}` }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: C.iconChipBg }}
          aria-hidden
        >
          <Route size={18} strokeWidth={1.75} style={{ color: C.textTer }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold" style={{ color: C.textSec }}>
            I tuoi viaggi
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: C.textTer }}>
            Presto: biglietti collegati raggruppati
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{ background: C.iconChipBg, color: C.textTer }}
        >
          presto
        </span>
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
      style={{ background: C.secCard, border: `1px solid ${C.secBorder}` }}
    >
      <Icon
        size={40}
        strokeWidth={1.5}
        className="pointer-events-none absolute right-1 top-1"
        style={{ color: C.iconChip, opacity: 0.18 }}
        aria-hidden
      />
      <div className="relative flex h-full min-h-0 flex-col justify-end">
        <div className="flex items-end justify-between gap-2">
          <p className="text-[13px] font-bold leading-tight" style={{ color: C.text }}>
            {cat.name}
          </p>
          <span
            className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums"
            style={{ background: C.iconChipBg, color: C.textSec }}
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
  onRemoved,
  onRestored,
}: {
  cat: BentoCategory;
  events: Ticket[];
  onClose: () => void;
  onRemoved: (id: string) => void;
  onRestored: (id: string) => void;
}) {
  const Icon = cat.icon;
  const filtered = eventsForBento(cat, events);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[60] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[70vh] max-w-lg overflow-hidden rounded-t-2xl"
        style={{ background: C.bodyBg, border: `1px solid ${C.heroBorder}` }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.32, ease: splashEase }}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Icon size={18} style={{ color: C.iconChip }} />
            <h3 className="text-[16px] font-semibold" style={{ color: C.text }}>
              {cat.name}
            </h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi">
            <X size={18} style={{ color: C.textSec }} />
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-8" style={scrollStyle}>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[13px]" style={{ color: C.textSec }}>
              Nessun evento in questa categoria
            </p>
          ) : (
            filtered.map((ev) => (
              <SwipeEventRow
                key={ev.id}
                event={ev}
                onRemoved={onRemoved}
                onRestored={onRestored}
              />
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}

function TickerGroup({ events, groupKey }: { events: Ticket[]; groupKey: string }) {
  return (
    <>
      <span className="flex shrink-0 items-center px-1" aria-hidden>
        <OrCaMark size={18} />
      </span>
      <span style={{ color: C.dashed }}>|</span>
      {events.map((ev) => {
        const date = tickerDate(ev.datetime);
        return (
          <span key={`${groupKey}-${ev.id}`} className="flex items-center gap-3">
            <span className="uppercase tracking-wide" style={{ color: C.textSec }}>
              {shortTitle(ev.title)}
              {date && <span style={{ color: C.textTer }}> · {date}</span>}
            </span>
            <span style={{ color: C.dashed }}>|</span>
          </span>
        );
      })}
    </>
  );
}

function DepartureTicker({ events }: { events: Ticket[] }) {
  if (events.length === 0) return null;

  return (
    <div
      className="relative mt-3 overflow-hidden py-2"
      style={{
        background: C.secCard,
        borderTop: `1px solid ${C.secBorder}`,
        borderBottom: `1px solid ${C.secBorder}`,
      }}
    >
      <motion.div
        className="relative flex w-max items-center gap-5 whitespace-nowrap px-4 text-[11px] font-normal tracking-normal"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 31.5, repeat: Infinity, ease: "linear" }}
      >
        <TickerGroup events={events} groupKey="a" />
        <TickerGroup events={events} groupKey="b" />
      </motion.div>
    </div>
  );
}

function AskOrCaBar() {
  return (
    <div
      className="flex items-center gap-2 rounded-[16px] px-3 py-2"
      style={{ background: C.askBg, border: `1px solid ${C.askBorder}` }}
    >
      <span className="flex shrink-0 items-center" aria-hidden>
        <OrCaMark size={23} />
      </span>
      <input
        type="text"
        readOnly
        placeholder="Chiedi a OrCa…"
        className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#6E737A]"
        style={{ color: C.askText }}
      />
      <button
        type="button"
        aria-label="Invia"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: C.goldOnDark }}
      >
        <ArrowUp size={16} strokeWidth={2.5} color={C.goldOnDarkText} />
      </button>
    </div>
  );
}

function BottomNav() {
  const items: { id: string; icon: LucideIcon; active?: boolean; center?: boolean }[] = [
    { id: "home", icon: HomeIcon, active: true },
    { id: "search", icon: Search },
    { id: "add", icon: Plus, center: true },
    { id: "calendar", icon: Calendar },
    { id: "profile", icon: User },
  ];

  return (
    <nav className="flex items-center justify-around px-2 pb-0.5 pt-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        if (item.center) {
          return (
            <button
              key={item.id}
              type="button"
              aria-label="Aggiungi"
              className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
              style={{ background: "#2b333d" }}
            >
              <Icon size={24} strokeWidth={2.5} color={C.goldOnDark} />
            </button>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            className="flex h-11 w-11 items-center justify-center"
            aria-label={item.id}
          >
            <Icon
              size={23}
              strokeWidth={2}
              style={{ color: item.active ? C.goldOnDark : C.navInactive }}
            />
          </button>
        );
      })}
    </nav>
  );
}

function BottomBar() {
  return (
    <div
      className="relative z-40 shrink-0"
      style={{
        background: `linear-gradient(180deg, ${C.chromeBotFrom} 0%, ${C.chromeBotTo} 100%)`,
        borderTop: `1px solid ${C.chromeBorder}`,
        paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom))",
      }}
    >
      <div
        className="flex gap-2 overflow-x-auto px-4 pt-2"
        style={{ scrollbarWidth: "none" }}
      >
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="shrink-0 whitespace-nowrap rounded-[20px] px-3.5 py-2 text-[13px] font-medium"
            style={{ background: C.chip, border: `1px solid ${C.chipBorder}`, color: C.chipText }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="px-4 pt-2">
        <AskOrCaBar />
      </div>

      <BottomNav />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-20 text-center">
      <OrCaMark size={64} />
      <p className="text-sm font-semibold" style={{ color: C.text }}>
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
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(t);
  }, []);

  const visibleEvents = events.filter((e) => !removedIds.has(e.id));
  const [hero, ...upcoming] = visibleEvents;
  const visibleCount = 4;
  const collapsed = upcoming.slice(0, visibleCount);
  const extra = upcoming.slice(visibleCount);

  function markRemoved(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
  }

  function markRestored(id: string) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className={dmSans.variable} style={{ fontFamily: sans }}>
      <div
        className="mx-auto flex h-[100dvh] max-w-lg flex-col"
        style={{ background: C.bodyBg, color: C.text }}
      >
        <FixedTopBar />

        <main
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8"
          style={{
            ...scrollStyle,
            background: `
              radial-gradient(115% 60% at 0% 0%, rgba(24,72,80,0.06), transparent 55%),
              radial-gradient(120% 70% at 100% 100%, rgba(120,168,200,0.08), transparent 58%),
              ${C.bodyBg}
            `,
          }}
        >
          {visibleEvents.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {hero && (
                <HeroEventCard event={hero} onRemoved={markRemoved} onRestored={markRestored} />
              )}

              {upcoming.length > 0 && <DepartureTicker events={upcoming.slice(0, 4)} />}

              {upcoming.length > 0 && (
                <div className="px-4 pt-6">
                  <h3 className="mb-3 text-[16px] font-semibold" style={{ color: C.text }}>
                    Prossimi eventi
                  </h3>
                  <div className="flex flex-col gap-2">
                    {collapsed.map((ev) => (
                      <SwipeEventRow
                        key={ev.id}
                        event={ev}
                        onRemoved={markRemoved}
                        onRestored={markRestored}
                      />
                    ))}
                  </div>
                  {extra.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-[12px] py-2.5"
                        style={{ background: C.secCard, border: `1px solid ${C.secBorder}` }}
                        aria-expanded={expanded}
                      >
                        <span className="text-[12px] font-medium" style={{ color: C.textSec }}>
                          {expanded ? "Comprimi" : `Altri ${extra.length}`}
                        </span>
                        <motion.span
                          animate={{ rotate: expanded ? 180 : 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <ChevronDown size={14} style={{ color: C.textSec }} />
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
                            <div className="flex flex-col gap-2 pt-1">
                              {extra.map((ev) => (
                                <SwipeEventRow
                                  key={ev.id}
                                  event={ev}
                                  onRemoved={markRemoved}
                                  onRestored={markRestored}
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}

              <TripsPlaceholder />

              <div className="px-4 pt-6 pb-2">
                <h3 className="mb-3 text-[16px] font-semibold" style={{ color: C.text }}>
                  Le tue categorie
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {BENTO_CATEGORIES.filter(
                    (cat) => eventsForBento(cat, visibleEvents).length > 0,
                  ).map((cat) => (
                    <CategoryTile
                      key={cat.id}
                      cat={cat}
                      count={eventsForBento(cat, visibleEvents).length}
                      onOpen={() => setOpenCategory(cat)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </main>

        <BottomBar />
      </div>

      <AnimatePresence>
        {openCategory && (
          <CategorySheet
            cat={openCategory}
            events={visibleEvents}
            onClose={() => setOpenCategory(null)}
            onRemoved={markRemoved}
            onRestored={markRestored}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
    </div>
  );
}
