"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plane,
  Train,
  Music,
  Building2,
  Landmark,
  UtensilsCrossed,
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  Ticket as TicketIcon,
  Footprints,
  QrCode,
  CheckSquare,
  Star,
  Check,
  LogOut,
  Compass,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Salad, Dumbbell, Moon } from "lucide-react";
import type { Ticket, DietWeek, WorkoutWeek, TripPlanRow } from "@/lib/supabase";
import { MealRow, todayDietKey, DAY_FULL } from "./DietMeal";
import { ExerciseRow, todayISO } from "./WorkoutDay";
import NotificationButton from "@/components/NotificationButton";
import ThemeToggle from "@/components/ThemeToggle";

/* ------------------------------------------------------------------ *
 * v15 — tutto via token CSS (globals.css). Nessun colore hardcoded.
 * ------------------------------------------------------------------ */

const TYPE_ICON: Record<string, LucideIcon> = {
  train: Train,
  flight: Plane,
  hotel: Building2,
  concert: Music,
  museum: Landmark,
  restaurant: UtensilsCrossed,
};

const TYPE_LABEL: Record<string, string> = {
  train: "Treno",
  flight: "Volo",
  hotel: "Hotel",
  concert: "Concerto",
  museum: "Museo",
  restaurant: "Ristorante",
};

/* Tinta categoria (sfondo hero/chip per tipo) — token --cat-*. */
const CAT_TINT: Record<string, string> = {
  train: "var(--cat-treno)",
  flight: "var(--cat-volo)",
  hotel: "var(--cat-hotel)",
  concert: "var(--cat-concerto)",
  museum: "var(--cat-concerto)",
  restaurant: "var(--cat-cena)",
};

/* Azioni hero pertinenti per tipo (inerti: nessun backend collegato). */
type HeroAction = { label: string; Icon: LucideIcon };
function heroActions(type: string): { primary: HeroAction; ghost?: HeroAction } {
  switch (type?.toLowerCase()) {
    case "train":
    case "flight":
      return { primary: { label: "Biglietto", Icon: TicketIcon }, ghost: { label: "Quando uscire", Icon: Footprints } };
    case "hotel":
    case "restaurant":
      return { primary: { label: "Prenotazione", Icon: TicketIcon } };
    case "concert":
    case "museum":
      return { primary: { label: "Biglietto", Icon: TicketIcon } };
    default:
      return { primary: { label: "Dettagli", Icon: TicketIcon } };
  }
}

/* To-do d'esempio per l'overlay: SOLO UI, da togliere col backend to-do. */
const MOCK_TODOS = [
  { id: 1, text: "Ritirare i vestiti", done: true, star: false },
  { id: 2, text: "Chiamare il dentista", done: false, star: true },
  { id: 3, text: "Stampare la carta d'imbarco", done: false, star: false },
];

function iconForType(type: string): LucideIcon {
  return TYPE_ICON[type?.toLowerCase()] ?? Calendar;
}
function labelForType(type: string): string {
  return TYPE_LABEL[type?.toLowerCase()] ?? "Evento";
}
function catTint(type: string): string {
  return CAT_TINT[type?.toLowerCase()] ?? "var(--cat-default)";
}

function daysUntil(datetime: string): number {
  if (!datetime) return 0;
  const d = new Date(datetime);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}
/* Un solo formato "quanto manca" ovunque. */
function relativeDays(days: number): string {
  if (days <= 0) return "Oggi";
  if (days === 1) return "Domani";
  return `Tra ${days} giorni`;
}

function dateTimeParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Rome",
  }).format(d);
  const time = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Rome",
  }).format(d);
  const cap = date.charAt(0).toUpperCase() + date.slice(1);
  return { date: cap, time };
}
/* Riga compatta "Sab 4 lug · 08:48 · Luogo". */
function eventLine(event: Ticket): string {
  const { date, time } = dateTimeParts(event.datetime);
  return [date, time, event.location].filter(Boolean).join(" · ");
}
/* Deep-link Google Maps per il luogo (stazione/aeroporto/venue). */
function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const dow = (date.getDay() + 6) % 7; // 0 = lunedì
  date.setDate(date.getDate() - dow);
  date.setHours(0, 0, 0, 0);
  return date;
}
type WeekDay = { date: Date; dn: string; dd: number; key: string };
function buildWeek(from: Date): WeekDay[] {
  const monday = startOfWeek(from);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dn = new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(date).slice(0, 3).toUpperCase();
    return { date, dn, dd: date.getDate(), key: dayKey(date) };
  });
}

/* ================================================================== */

export default function HomeView({
  events,
  trips = [],
  diet,
  workout,
  trainedDays = [],
  logoutAction,
}: {
  events: Ticket[];
  trips?: TripPlanRow[];
  diet?: DietWeek | null;
  workout?: WorkoutWeek | null;
  trainedDays?: string[];
  logoutAction?: () => Promise<void>;
}) {
  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => buildWeek(today), [today]);
  const todayKey = dayKey(today);

  const countByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const d = new Date(e.datetime);
      if (isNaN(d.getTime())) continue;
      const k = dayKey(d);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [events]);

  // Giorno aperto nell'overlay to-do. Determina anche il giorno "selezionato"
  // (grad), mentre OGGI resta evidenziato col numero accentato.
  const [openDay, setOpenDay] = useState<WeekDay | null>(null);
  const selectedKey = openDay ? openDay.key : todayKey;
  const todayWD = week.find((w) => w.key === todayKey);

  const [hero, ...rest] = events;
  const upcoming = rest.slice(0, 4);

  return (
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-lg">
      <Bubbles />

      <div className="relative z-10 pb-[160px]">
        {/* ---------- App bar ---------- */}
        <header
          className="flex items-center justify-between pb-[var(--s2)] pt-[var(--s3)]"
          style={{ paddingInline: "var(--gutter)" }}
        >
          <span
            className="text-[length:var(--fs-xl)] -tracking-[0.03em]"
            style={{ fontWeight: "var(--fw-black)", color: "var(--app-text)" }}
          >
            🐋 Keiko
          </span>
          <div className="flex items-center gap-[var(--s4)]" style={{ color: "var(--app-2)" }}>
            {/* Cerca — nessun backend: VUOTO */}
            {/* TODO: backend — placeholder v15 */}
            <button
              type="button"
              disabled
              aria-label="Cerca"
              className="grid place-items-center disabled:opacity-100"
              style={{ width: "var(--tap)", height: "var(--tap)", margin: -12 }}
            >
              <Search className="size-[21px]" />
            </button>
            <ThemeToggle />
            <NotificationButton compact />
            {logoutAction && (
              <form action={logoutAction}>
                <button
                  type="submit"
                  aria-label="Esci"
                  className="grid place-items-center transition-colors active:scale-95"
                  style={{ width: "var(--tap)", height: "var(--tap)", margin: -12 }}
                >
                  <LogOut className="size-[21px]" />
                </button>
              </form>
            )}
          </div>
        </header>

        {/* ---------- Calendario settimana ---------- */}
        <WeekStrip
          week={week}
          todayKey={todayKey}
          selectedKey={selectedKey}
          countByDay={countByDay}
          onPick={(d) => setOpenDay(d)}
        />

        {/* ---------- Scroll content ---------- */}
        {/* padding-bottom = zona sicura + spazio per la barra "Chiedi a Keiko" e la nav. */}
        <div style={{ padding: "var(--s5) var(--gutter) calc(env(safe-area-inset-bottom) + 150px)" }}>
          <Lead>Prossimo</Lead>
          {hero ? <HeroCard event={hero} /> : <EmptyHero />}

          {upcoming.length > 0 && (
            <>
              <Lead className="mt-[var(--sec)]">Prossimi eventi</Lead>
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </>
          )}

          {trips.length > 0 && (
            <>
              <Lead className="mt-[var(--sec)]">Plot</Lead>
              {trips.map((t) => (
                <PlotCard key={t.id} trip={t} />
              ))}
            </>
          )}

          <Lead className="mt-[var(--sec)]">Dieta oggi</Lead>
          <DietToday diet={diet} />

          <Lead className="mt-[var(--sec)]">Allenamento oggi</Lead>
          <WorkoutToday workout={workout} trainedDays={trainedDays} />

          <Lead className="mt-[var(--sec)]">Oggi</Lead>
          <TodoRow onOpen={() => todayWD && setOpenDay(todayWD)} />
        </div>
      </div>

      {openDay && <TodoOverlay day={openDay} onClose={() => setOpenDay(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Lead({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`mx-0.5 mb-[var(--s3)] uppercase ${className}`}
      style={{
        fontSize: "var(--fs-cap)",
        fontWeight: "var(--fw-bold)",
        letterSpacing: ".07em",
        color: "var(--app-faint)",
      }}
    >
      {children}
    </p>
  );
}

function Bubbles() {
  const bubbles = [
    { left: "14%", size: 7, dur: "16s", delay: "0s" },
    { left: "24%", size: 9, dur: "18s", delay: "2s" },
    { left: "48%", size: 6, dur: "15s", delay: "5s" },
    { left: "66%", size: 11, dur: "20s", delay: "3s" },
    { left: "82%", size: 8, dur: "17s", delay: "6s" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="keiko-bubble"
          style={{ left: b.left, width: b.size, height: b.size, animationDuration: b.dur, animationDelay: b.delay }}
        />
      ))}
    </div>
  );
}

/* ---------- Calendario settimana ---------- */
function WeekStrip({
  week,
  todayKey,
  selectedKey,
  countByDay,
  onPick,
}: {
  week: WeekDay[];
  todayKey: string;
  selectedKey: string;
  countByDay: Map<string, number>;
  onPick: (d: WeekDay) => void;
}) {
  return (
    <div className="flex gap-1.5" style={{ padding: "var(--s2) var(--gutter) 0" }}>
      {week.map((d) => {
        const isSel = d.key === selectedKey;
        const isTodayAccent = d.key === todayKey && !isSel;
        const count = countByDay.get(d.key) ?? 0;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onPick(d)}
            className="relative flex-1 text-center transition-transform duration-200 ease-out active:scale-95"
            style={{
              padding: "9px 0",
              borderRadius: "var(--r-sm)",
              background: isSel ? "var(--keiko-grad)" : "transparent",
              boxShadow: isSel ? "var(--sh-btn)" : "none",
            }}
          >
            <span
              className="block uppercase"
              style={{
                fontSize: "11px",
                fontWeight: "var(--fw-semi)",
                letterSpacing: ".02em",
                color: isSel ? "#fff" : "var(--app-faint)",
              }}
            >
              {d.dn}
            </span>
            <span
              className="mt-[3px] block tabular-nums"
              style={{
                fontSize: "16px",
                fontWeight: "var(--fw-bold)",
                color: isSel ? "#fff" : isTodayAccent ? "var(--accent-strong)" : "var(--app-text)",
              }}
            >
              {d.dd}
            </span>
            {count > 0 && (
              <span
                className="absolute right-1/2 grid translate-x-[15px] place-items-center text-white"
                style={{
                  top: 3,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: "var(--r-pill)",
                  background: "var(--warm)",
                  fontSize: "9.5px",
                  fontWeight: "var(--fw-black)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Hero per-tipo (una sola CTA primaria) ---------- */
function HeroCard({ event }: { event: Ticket }) {
  const Icon = iconForType(event.type);
  const { date, time } = dateTimeParts(event.datetime);
  const { primary, ghost } = heroActions(event.type);

  return (
    <div className="overflow-hidden" style={{ borderRadius: "var(--r-xl)", background: "var(--surface)", boxShadow: "var(--sh-card)", border: "1px solid var(--tile-line)" }}>
      {/* zona alta colorata per tipo */}
      <div className="flex gap-[var(--s3)] text-white" style={{ minHeight: 80, padding: "var(--s3)", background: catTint(event.type) }}>
        <div className="flex min-w-0 flex-1 flex-col gap-[var(--s2)]">
          <span
            className="inline-flex w-fit items-center gap-1.5"
            style={{ fontSize: "var(--fs-cap)", fontWeight: "var(--fw-semi)", background: "rgba(255,255,255,.22)", padding: "6px 12px", borderRadius: "var(--r-pill)" }}
          >
            <Icon className="size-3.5" />
            {labelForType(event.type)}
          </span>
          <span style={{ fontWeight: "var(--fw-black)", fontSize: "var(--fs-lg)", letterSpacing: "-.02em", lineHeight: 1.05 }}>
            {relativeDays(daysUntil(event.datetime))}
          </span>
          {/* riga "highlight" — manca il campo dal parsing: per ora omessa */}
          {/* TODO: backend — campo highlight dal parsing */}
        </div>
        <div
          className="grid flex-none place-items-center self-center"
          style={{
            width: 70,
            height: 70,
            borderRadius: "var(--r-md)",
            background: "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,.15), rgba(255,255,255,.02))",
            border: "1px solid rgba(255,255,255,.15)",
          }}
        >
          <Icon className="size-9" style={{ filter: "drop-shadow(0 6px 11px rgba(0,0,0,.28))" }} />
        </div>
      </div>

      {/* info */}
      <div className="flex flex-col gap-[var(--s1)]" style={{ padding: "var(--s3)" }}>
        <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-lg)", color: "var(--on-surface)", lineHeight: 1.25, letterSpacing: "-.01em" }}>
          {event.title}
        </span>
        {event.location && (
          <a
            href={mapsUrl(event.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1"
            style={{ color: "var(--on-surface-2)", fontSize: "var(--fs-sm)" }}
          >
            <MapPin className="size-3.5 flex-none" style={{ color: "var(--accent-strong)" }} />
            {event.location}
          </a>
        )}
        <span className="tabular-nums" style={{ color: "var(--accent-strong)", fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)" }}>
          {date} · {time}
        </span>
        <div className="flex gap-[var(--s2)]" style={{ marginTop: "var(--s3)" }}>
          {/* TODO: backend — placeholder v15 */}
          <HeroBtn variant="pri" Icon={primary.Icon} label={primary.label} />
          {ghost && <HeroBtn variant="gho" Icon={ghost.Icon} label={ghost.label} />}
        </div>
      </div>
    </div>
  );
}

function HeroBtn({ variant, Icon, label }: { variant: "pri" | "gho"; Icon: LucideIcon; label: string }) {
  const pri = variant === "pri";
  return (
    <button
      type="button"
      disabled
      className="inline-flex items-center justify-center gap-[7px] disabled:opacity-100"
      style={{
        fontSize: "var(--fs-sm)",
        fontWeight: "var(--fw-semi)",
        minHeight: "var(--tap)",
        padding: "0 16px",
        borderRadius: "var(--r-sm)",
        ...(pri
          ? { background: "var(--keiko-grad)", color: "#fff", boxShadow: "var(--sh-btn)" }
          : { background: "var(--inset)", color: "var(--on-surface)", border: "1px solid var(--inset-line)" }),
      }}
    >
      <Icon className="size-[17px]" />
      {label}
    </button>
  );
}

function EmptyHero() {
  return (
    <div
      className="text-center"
      style={{ borderRadius: "var(--r-xl)", background: "var(--surface)", boxShadow: "var(--sh-card)", border: "1px solid var(--tile-line)", padding: "var(--s8) var(--s5)" }}
    >
      <p style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-base)", color: "var(--on-surface)" }}>Nessun evento in arrivo</p>
      <p className="mt-1" style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)" }}>
        Tocca ＋ e dimmi tutto: ci penso io.
      </p>
    </div>
  );
}

/* ---------- Card "Plot" (porta d'ingresso all'itinerario /viaggio) ---------- */
function fmtTripRange(a: string | null, b: string | null): string {
  if (!a) return "";
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const da = new Date(a + "T00:00:00");
  const db = b ? new Date(b + "T00:00:00") : da;
  const s = new Intl.DateTimeFormat("it-IT", opt).format(da);
  const e = new Intl.DateTimeFormat("it-IT", opt).format(db);
  return s === e ? s : `${s} – ${e}`;
}

function PlotCard({ trip }: { trip: TripPlanRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const ready = trip.status === "ready";
  const generating = trip.status === "generating" || busy;

  // Lancia la generazione del piano (ricerca web) e poi ricarica per mostrarlo.
  async function creaPlot() {
    setBusy(true);
    try {
      const res = await fetch("/api/trip/generate", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      window.alert("Non sono riuscito a creare il plot, riprova tra poco");
    } finally {
      setBusy(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--tile-line)",
    boxShadow: "var(--sh-card)",
    borderRadius: "var(--r-lg)",
    padding: "var(--s3)",
    marginBottom: "var(--s3)",
  };

  const head = (
    <div className="flex items-center gap-[var(--s3)]">
      <span
        className="grid flex-none place-items-center text-white"
        style={{ width: 48, height: 48, borderRadius: "var(--r-sm)", background: "var(--cat-treno)" }}
      >
        <Compass className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--app-text)" }}>
          Viaggio a {trip.city}
        </div>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--app-2)", marginTop: 2 }}>
          {fmtTripRange(trip.start_date, trip.end_date)}
          {ready ? " · vedi il piano" : ""}
        </div>
      </div>
      {ready && <ChevronRight className="size-5 flex-none" style={{ color: "var(--app-faint)" }} />}
    </div>
  );

  // Piano pronto → la card apre l'itinerario.
  if (ready) {
    return (
      <Link href="/viaggio" className="block transition-transform duration-200 active:scale-[0.99]" style={cardStyle}>
        {head}
      </Link>
    );
  }

  // Non ancora pronto → card con bottone "Crea plot".
  return (
    <div style={cardStyle}>
      {head}
      <button
        type="button"
        onClick={creaPlot}
        disabled={generating}
        className="mt-[var(--s3)] flex w-full items-center justify-center gap-2 text-white transition-transform duration-200 active:scale-[0.98] disabled:opacity-60"
        style={{
          minHeight: "var(--tap)",
          borderRadius: "var(--r-sm)",
          fontSize: "var(--fs-sm)",
          fontWeight: "var(--fw-semi)",
          background: "var(--keiko-grad)",
          boxShadow: "var(--sh-btn)",
        }}
      >
        {generating ? "Sto preparando il plot…" : "Crea plot"}
      </button>
    </div>
  );
}

/* ---------- Card piccola espandibile (stat-chips) ---------- */
function EventCard({ event }: { event: Ticket }) {
  const [open, setOpen] = useState(false);
  const Icon = iconForType(event.type);
  const { date, time } = dateTimeParts(event.datetime);
  const days = daysUntil(event.datetime);

  return (
    <div
      className="overflow-hidden"
      style={{ borderRadius: "var(--r-lg)", background: "var(--tile)", border: "1px solid var(--tile-line)", marginBottom: "var(--s3)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-[var(--s3)] text-left"
        style={{ padding: "var(--s3)" }}
      >
        <span className="grid flex-none place-items-center text-white" style={{ width: 48, height: 48, borderRadius: "var(--r-sm)", background: catTint(event.type) }}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--app-text)" }}>
            {event.title}
          </div>
          <div className="tabular-nums" style={{ fontSize: "var(--fs-xs)", color: "var(--app-2)", marginTop: 2 }}>
            {eventLine(event)}
          </div>
        </div>
        <span
          className="flex-none tabular-nums"
          style={{ fontSize: "var(--fs-cap)", fontWeight: "var(--fw-bold)", color: "var(--app-text)", background: "color-mix(in srgb, var(--app-2) 22%, transparent)", padding: "5px 10px", borderRadius: "var(--r-pill)" }}
        >
          {days} g
        </span>
        <ChevronDown
          className="size-[18px] flex-none transition-transform duration-200"
          style={{ color: "var(--app-faint)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div style={{ margin: "0 var(--s3) var(--s3)", background: "var(--surface)", borderRadius: "var(--r-md)", padding: "var(--s3)" }}>
          <div className="flex gap-[var(--s2)]">
            <Stat k="Data" v={date} />
            <Stat k="Ora" v={time} />
            <Stat k="Luogo" v={event.location || "—"} />
          </div>
          {event.location && (
            <a
              href={mapsUrl(event.location)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-[var(--s3)] inline-flex items-center gap-1.5"
              style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)" }}
            >
              <MapPin className="size-[15px]" /> Apri in Mappe
            </a>
          )}
          {/* TODO: backend — placeholder v15 (no QR/biglietto reale) */}
          <button
            type="button"
            disabled
            className="mt-[var(--s3)] inline-flex w-full items-center justify-center gap-[7px] text-white disabled:opacity-100"
            style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", minHeight: "var(--tap)", borderRadius: "var(--r-sm)", background: "var(--keiko-grad)", boxShadow: "var(--sh-btn)" }}
          >
            <QrCode className="size-[17px]" /> Mostra biglietto
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex-1 text-center" style={{ background: "var(--inset)", borderRadius: "var(--r-sm)", padding: "10px 8px" }}>
      <div className="uppercase" style={{ fontSize: "10.5px", fontWeight: "var(--fw-med)", color: "var(--on-surface-2)", letterSpacing: ".02em" }}>
        {k}
      </div>
      <div className="truncate tabular-nums" style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-bold)", color: "var(--on-surface)", marginTop: 3 }}>
        {v}
      </div>
    </div>
  );
}

/* ---------- Dieta di oggi (pasti del giorno, o accenno a /salute) ---------- */
function DietToday({ diet }: { diet?: DietWeek | null }) {
  const meals = diet?.[todayDietKey()] ?? [];
  const [open, setOpen] = useState(false);

  // Nessun piano, o piano senza pasti per oggi: accenno discreto verso /salute.
  if (!diet || meals.length === 0) {
    return (
      <Link
        href="/salute"
        className="flex w-full items-center gap-[var(--s3)] text-left transition-transform duration-200 active:scale-[0.99]"
        style={{ background: "var(--tile)", border: "1px solid var(--tile-line)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
      >
        <span
          className="grid flex-none place-items-center"
          style={{ width: 48, height: 48, borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--accent-strong)" }}
        >
          <Salad className="size-5" />
        </span>
        <div className="flex-1">
          <div style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--app-text)" }}>
            {diet ? "Nessun pasto per oggi" : "Aggiungi la tua dieta"}
          </div>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--app-2)", marginTop: 2 }}>
            {diet ? "Apri per vedere la settimana" : "Carica il piano una volta sola"}
          </div>
        </div>
        <ChevronRight className="size-5 flex-none" style={{ color: "var(--app-faint)" }} />
      </Link>
    );
  }

  return (
    <div
      className="overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--tile-line)", boxShadow: "var(--sh-card)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
    >
      {/* Intestazione = tasto apri/chiudi (finestra estraibile) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 transition-transform duration-200 active:scale-[0.99]"
      >
        <span
          className="grid flex-none place-items-center"
          style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--primary) 16%, transparent)", color: "var(--accent-strong)" }}
        >
          <Salad className="size-[17px]" />
        </span>
        <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-sm)", color: "var(--on-surface)", letterSpacing: "-.01em" }}>
          {DAY_FULL[todayDietKey()]}
        </span>
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--app-2)" }}>
          {meals.length} pasti
        </span>
        <ChevronDown
          className="ml-auto size-[18px] flex-none transition-transform duration-200"
          style={{ color: "var(--app-faint)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div className="mt-[var(--s3)] flex flex-col gap-[var(--s2)]">
          {meals.map((meal, i) => (
            <MealRow key={i} meal={meal} />
          ))}
          <Link
            href="/salute"
            className="mt-[var(--s1)] flex items-center justify-center gap-1"
            style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)" }}
          >
            Vedi tutta la settimana
            <ChevronRight className="size-[15px]" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------- Allenamento di oggi (estraibile, con "fatto oggi") ---------- */
function WorkoutToday({ workout, trainedDays }: { workout?: WorkoutWeek | null; trainedDays: string[] }) {
  const router = useRouter();
  const today = workout?.[todayDietKey()];
  const iso = todayISO();
  const hasPlan =
    !!workout && Object.values(workout).some((d) => (d?.esercizi?.length ?? 0) > 0);

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(trainedDays.includes(iso));
  const [saving, setSaving] = useState(false);

  // Nessuna scheda: accenno discreto verso /allenamento.
  if (!hasPlan) {
    return (
      <Link
        href="/allenamento"
        className="flex w-full items-center gap-[var(--s3)] text-left transition-transform duration-200 active:scale-[0.99]"
        style={{ background: "var(--tile)", border: "1px solid var(--tile-line)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
      >
        <span
          className="grid flex-none place-items-center"
          style={{ width: 48, height: 48, borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--accent-strong)" }}
        >
          <Dumbbell className="size-5" />
        </span>
        <div className="flex-1">
          <div style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--app-text)" }}>
            Aggiungi il tuo allenamento
          </div>
          <div style={{ fontSize: "var(--fs-xs)", color: "var(--app-2)", marginTop: 2 }}>
            Carica la scheda una volta sola
          </div>
        </div>
        <ChevronRight className="size-5 flex-none" style={{ color: "var(--app-faint)" }} />
      </Link>
    );
  }

  const esercizi = today?.esercizi ?? [];
  const rest = esercizi.length === 0;

  async function toggleDone() {
    const willBe = !done;
    setDone(willBe);
    setSaving(true);
    try {
      const res = await fetch("/api/workout/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ day: iso, done: willBe }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setDone(!willBe);
      window.alert("Non sono riuscito a salvare, riprova");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--tile-line)", boxShadow: "var(--sh-card)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 transition-transform duration-200 active:scale-[0.99]"
      >
        <span
          className="grid flex-none place-items-center"
          style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--primary) 16%, transparent)", color: "var(--accent-strong)" }}
        >
          <Dumbbell className="size-[17px]" />
        </span>
        <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-sm)", color: "var(--on-surface)", letterSpacing: "-.01em" }}>
          {rest ? "Riposo" : today?.titolo || "Allenamento"}
        </span>
        {done && (
          <span
            className="inline-flex items-center gap-1"
            style={{ fontSize: "10.5px", fontWeight: "var(--fw-bold)", color: "var(--green)" }}
          >
            <Check className="size-3.5" /> fatto
          </span>
        )}
        <ChevronDown
          className="ml-auto size-[18px] flex-none transition-transform duration-200"
          style={{ color: "var(--app-faint)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div className="mt-[var(--s3)] flex flex-col gap-[var(--s2)]">
          {rest ? (
            <div className="flex items-center gap-2" style={{ color: "var(--on-surface-3)" }}>
              <Moon className="size-4" />
              <span style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)" }}>Oggi è giorno di riposo</span>
            </div>
          ) : (
            esercizi.map((ex, i) => <ExerciseRow key={i} nome={ex.nome} dettaglio={ex.dettaglio} />)
          )}

          <button
            type="button"
            onClick={toggleDone}
            disabled={saving}
            className="mt-[var(--s1)] flex w-full items-center justify-center gap-2 transition-transform duration-200 active:scale-[0.98] disabled:opacity-60"
            style={{
              minHeight: "var(--tap)",
              borderRadius: "var(--r-sm)",
              fontSize: "var(--fs-sm)",
              fontWeight: "var(--fw-semi)",
              ...(done
                ? { background: "var(--inset)", border: "1px solid var(--inset-line)", color: "var(--on-surface-2)" }
                : { background: "var(--keiko-grad)", color: "#fff", boxShadow: "var(--sh-btn)" }),
            }}
          >
            <Check className="size-[17px]" />
            {done ? "Allenamento fatto ✓" : "Segna come fatto"}
          </button>

          <Link
            href="/allenamento"
            className="mt-[var(--s1)] flex items-center justify-center gap-1"
            style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)" }}
          >
            Vedi tutta la scheda
            <ChevronRight className="size-[15px]" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ---------- Riga "To-do di oggi" (apre l'overlay di oggi) ---------- */
function TodoRow({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-[var(--s3)] text-left"
      style={{ background: "var(--tile)", border: "1px solid var(--tile-line)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
    >
      <span
        className="grid flex-none place-items-center"
        style={{ width: 48, height: 48, borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--accent-strong)" }}
      >
        <CheckSquare className="size-5" />
      </span>
      <div className="flex-1">
        <div style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--app-text)" }}>To-do di oggi</div>
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--app-2)", marginTop: 2 }}>Tocca un giorno per vederle</div>
      </div>
      <ChevronRight className="size-5 flex-none" style={{ color: "var(--app-faint)" }} />
    </button>
  );
}

/* ---------- Overlay to-do del giorno (UI inerte) ---------- */
function TodoOverlay({ day, onClose }: { day: WeekDay; onClose: () => void }) {
  const titleDate = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric" }).format(day.date);
  const cap = titleDate.charAt(0).toUpperCase() + titleDate.slice(1);
  const pending = MOCK_TODOS.filter((t) => !t.done).length;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div
        className="fixed z-50"
        style={{ left: "var(--gutter)", right: "var(--gutter)", top: 118, background: "var(--surface)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-pop)", padding: "var(--s4)" }}
        role="dialog"
        aria-label={`To-do ${cap}`}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--s2)" }}>
          <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-base)", color: "var(--on-surface)", letterSpacing: "-.02em" }}>
            {cap} · to-do
          </span>
          <span
            style={{ fontSize: "11px", fontWeight: "var(--fw-bold)", color: "var(--accent-strong)", background: "color-mix(in srgb, var(--primary) 16%, transparent)", padding: "4px 10px", borderRadius: "var(--r-pill)" }}
          >
            {pending} da fare
          </span>
        </div>

        {/* Righe d'esempio — SOLO UI, nessuna spunta/salvataggio reale */}
        {MOCK_TODOS.map((t) => (
          <div key={t.id} className="flex items-center gap-[var(--s3)]" style={{ padding: "11px 0", borderTop: "1px solid var(--inset-line)" }}>
            <span
              className="grid flex-none place-items-center"
              style={{ width: 23, height: 23, borderRadius: "var(--r-pill)", border: "2px solid var(--accent-strong)", background: t.done ? "var(--primary)" : "transparent", color: "#fff" }}
            >
              {t.done && <Check className="size-3" />}
            </span>
            <span
              style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)", color: t.done ? "var(--on-surface-2)" : "var(--on-surface)", textDecoration: t.done ? "line-through" : "none" }}
            >
              {t.text}
            </span>
            {t.star && <Star className="ml-auto size-[17px]" style={{ color: "var(--warm)" }} />}
          </div>
        ))}

        {/* Aggiungi to-do — VUOTO (nessun backend) */}
        {/* TODO: backend — placeholder v15 */}
        <button
          type="button"
          disabled
          className="flex items-center gap-[var(--s3)] disabled:opacity-100"
          style={{ padding: "12px 0 2px", borderTop: "1px solid var(--inset-line)", color: "var(--accent-strong)", fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)" }}
        >
          <span className="grid place-items-center text-white" style={{ width: 23, height: 23, borderRadius: "var(--r-pill)", background: "var(--keiko-grad)" }}>
            <Plus className="size-3.5" />
          </span>
          Ricordami di…
        </button>
      </div>
    </>
  );
}
