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
  ChevronLeft,
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
  X,
  Phone,
  Trash2,
  Bell,
  Trophy,
  Clapperboard,
} from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Salad, Dumbbell, Moon } from "lucide-react";
import type { Ticket, DietWeek, WorkoutWeek, TripPlanRow, Todo } from "@/lib/supabase";
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
  sport: Trophy,
};

const TYPE_LABEL: Record<string, string> = {
  train: "Treno",
  flight: "Volo",
  hotel: "Hotel",
  concert: "Concerto",
  museum: "Museo",
  restaurant: "Ristorante",
  sport: "Sport",
};

/* Tinta categoria (sfondo hero/chip per tipo) — token --cat-*. */
const CAT_TINT: Record<string, string> = {
  train: "var(--cat-treno)",
  flight: "var(--cat-volo)",
  hotel: "var(--cat-hotel)",
  concert: "var(--cat-concerto)",
  museum: "var(--cat-concerto)",
  restaurant: "var(--cat-cena)",
  sport: "var(--cat-concerto)",
};

/* Link alla classifica della competizione, dedotto dal titolo dell'evento sport.
 * Casi noti → sito ufficiale; altrimenti ricerca Google "classifica …". */
function standingsUrl(title: string): string {
  const t = title.toLowerCase();
  const anno = new Date().getFullYear();
  if (/\bf1\b|formula\s*1|gran premio/.test(t)) return `https://www.formula1.com/en/results/${anno}/drivers`;
  if (/motogp|moto\s*gp/.test(t)) return "https://www.motogp.com/it/world-standing";
  if (/serie\s*a\b/.test(t)) return "https://www.legaseriea.it/it/serie-a/classifica";
  return `https://www.google.com/search?q=${encodeURIComponent("classifica " + title)}`;
}

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

/* Giorno in formato ISO "YYYY-MM-DD" (stesso formato della colonna `day` dei to-do). */
function isoDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${g}`;
}

/* ----- Mini-azioni ricavate dal TESTO del to-do (nessuna colonna nuova) ----- */

/* Numero di telefono nel testo (almeno 6 cifre) → link tel: */
function todoPhone(text: string): string | null {
  const m = text.match(/\+?\d[\d\s./-]{5,}\d/);
  if (!m) return null;
  const digits = m[0].replace(/[^\d+]/g, "");
  if ((digits.match(/\d/g)?.length ?? 0) < 6) return null;
  return `tel:${digits}`;
}

/* Luogo dopo "da/al/alla/in/presso/@" con iniziale maiuscola → query per Maps.
 * Es. "cena da Marco" → "Marco", "ritiro in Via Roma 12" → "Via Roma 12".
 * Con "vicino (a) X" passiamo a Maps TUTTA la frase: Google capisce query
 * tipo "patente vicino Linklaters Milano" e mostra i posti giusti in zona. */
function todoPlace(text: string): string | null {
  if (/\bvicino\b/i.test(text)) return text;
  const m = text.match(
    /(?:\bda\b|\bdal\b|\bdalla\b|\bal\b|\ballo\b|\balla\b|\ball'|\bin\b|\bpresso\b|@)\s*([A-ZÀ-Ý][^\s,.;!?]*(?:\s+(?:[A-ZÀ-Ý][^\s,.;!?]*|\d+))*)/
  );
  return m ? m[1] : null;
}

/* Costanti dello swipe-per-eliminare (stessi valori del vecchio Ticket.tsx). */
const SWIPE_THRESHOLD = -72;
const SWIPE_SNAP = SWIPE_THRESHOLD / 2;
const SWIPE_SPRING = { type: "spring" as const, stiffness: 400, damping: 40 };

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
/* Crea un WeekDay da una data qualsiasi (per il calendario mensile). */
function makeWeekDay(date: Date): WeekDay {
  const dn = new Intl.DateTimeFormat("it-IT", { weekday: "short" }).format(date).slice(0, 3).toUpperCase();
  return { date, dn, dd: date.getDate(), key: dayKey(date) };
}
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
  todos = [],
  watchCount = 0,
  diet,
  workout,
  trainedDays = [],
  logoutAction,
}: {
  events: Ticket[];
  trips?: TripPlanRow[];
  todos?: Todo[];
  watchCount?: number;
  diet?: DietWeek | null;
  workout?: WorkoutWeek | null;
  trainedDays?: string[];
  logoutAction?: () => Promise<void>;
}) {
  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => buildWeek(today), [today]);
  const todayKey = dayKey(today);

  // Lista to-do "viva" sul client: parte dai dati del server e viene
  // aggiornata subito a ogni azione (spunta/aggiungi/elimina), senza ricaricare.
  const [todoList, setTodoList] = useState<Todo[]>(todos);

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

  /* ----- azioni to-do: aggiornamento ottimista + chiamata API ----- */

  async function addTodo(day: string, text: string): Promise<boolean> {
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ day, text }),
      });
      if (!res.ok) return false;
      const { todo } = (await res.json()) as { todo: Todo };
      setTodoList((l) => [...l, todo]);
      return true;
    } catch {
      return false;
    }
  }

  async function patchTodo(id: string, fields: { done?: boolean; star?: boolean; time?: string | null; lead?: number; double?: boolean }) {
    const prev = todoList;
    setTodoList((l) => l.map((t) => (t.id === id ? { ...t, ...fields } : t)));
    try {
      const res = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, ...fields }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTodoList(prev);
      window.alert("Non sono riuscito a salvare, riprova");
    }
  }

  async function removeTodo(id: string) {
    const prev = todoList;
    setTodoList((l) => l.filter((t) => t.id !== id));
    try {
      const res = await fetch("/api/todos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTodoList(prev);
      window.alert("Non sono riuscito a eliminare, riprova");
    }
  }

  // Giorno aperto nell'overlay to-do. Determina anche il giorno "selezionato"
  // (grad), mentre OGGI resta evidenziato col numero accentato.
  const [openDay, setOpenDay] = useState<WeekDay | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const selectedKey = openDay ? openDay.key : todayKey;
  const todayWD = week.find((w) => w.key === todayKey);

  // Giorni "segnati" nel calendario mensile: c'è almeno un evento o un to-do.
  const markedDays = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) {
      const d = new Date(e.datetime);
      if (!isNaN(d.getTime())) s.add(isoDay(d));
    }
    for (const t of todoList) s.add(t.day);
    return s;
  }, [events, todoList]);

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
            {/* Calendario mensile: scegli un giorno qualsiasi e aggiungi to-do */}
            <button
              type="button"
              onClick={() => setCalOpen(true)}
              aria-label="Calendario"
              className="grid place-items-center transition-colors active:scale-95"
              style={{ width: "var(--tap)", height: "var(--tap)", margin: -12 }}
            >
              <Calendar className="size-[21px]" />
            </button>
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

          <Lead className="mt-[var(--sec)]">Da guardare</Lead>
          <Link
            href="/guarda"
            className="flex w-full items-center gap-[var(--s3)] text-left transition-transform duration-200 active:scale-[0.99]"
            style={{ background: "var(--tile)", border: "1px solid var(--tile-line)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
          >
            <span
              className="grid flex-none place-items-center"
              style={{ width: 48, height: 48, borderRadius: "var(--r-sm)", background: "color-mix(in srgb, var(--primary) 18%, transparent)", color: "var(--accent-strong)" }}
            >
              <Clapperboard className="size-5" />
            </span>
            <div className="flex-1">
              <div style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--app-text)" }}>Film & serie</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--app-2)", marginTop: 2 }}>
                {watchCount > 0 ? `${watchCount} in lista` : "Chiedi un consiglio a Keiko"}
              </div>
            </div>
            <ChevronRight className="size-5 flex-none" style={{ color: "var(--app-faint)" }} />
          </Link>

          <Lead className="mt-[var(--sec)]">Oggi</Lead>
          <TodoRow
            pending={todoList.filter((t) => t.day === isoDay(today) && !t.done).length}
            onOpen={() => todayWD && setOpenDay(todayWD)}
          />
        </div>
      </div>

      {openDay && (
        <TodoOverlay
          day={openDay}
          todos={[...todoList.filter((t) => t.day === isoDay(openDay.date))].sort(
            // Ordine orario: prima i to-do con orario (crescente), poi quelli senza.
            (a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99")
          )}
          dayEvents={events.filter((e) => {
            const d = new Date(e.datetime);
            return !isNaN(d.getTime()) && isoDay(d) === isoDay(openDay.date);
          })}
          onAdd={(text) => addTodo(isoDay(openDay.date), text)}
          onPatch={patchTodo}
          onDelete={removeTodo}
          onClose={() => setOpenDay(null)}
        />
      )}

      {calOpen && (
        <MonthPicker
          initial={openDay?.date ?? today}
          marked={markedDays}
          onPick={(d) => {
            setCalOpen(false);
            setOpenDay(makeWeekDay(d));
          }}
          onClose={() => setCalOpen(false)}
        />
      )}
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
        {event.type?.toLowerCase() === "sport" && (
          <a
            href={standingsUrl(event.title)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1"
            style={{ color: "var(--on-surface-2)", fontSize: "var(--fs-sm)" }}
          >
            <Trophy className="size-3.5 flex-none" style={{ color: "var(--accent-strong)" }} />
            Classifica mondiale
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

/* ---------- Card piccola espandibile (stat-chips) ----------
 * Swipe verso sinistra → cestino → conferma → /api/delete.
 * Stesso comportamento del vecchio Ticket.tsx, sui token v15. */
function EventCard({ event }: { event: Ticket }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);
  const Icon = iconForType(event.type);
  const { date, time } = dateTimeParts(event.datetime);
  const days = daysUntil(event.datetime);

  const x = useMotionValue(0);
  const delOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const delScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.7, 1]);

  function onDragEnd() {
    animate(x, x.get() < SWIPE_SNAP ? SWIPE_THRESHOLD : 0, SWIPE_SPRING);
  }

  function onCardTap() {
    // Se la card è aperta a metà swipe, il tap la richiude e basta.
    if (x.get() < -10) {
      animate(x, 0, SWIPE_SPRING);
      return;
    }
    setOpen((o) => !o);
  }

  async function doDelete() {
    setBusy(true);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: event.id }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (!res.ok || !data.ok) throw new Error();
      setRemoved(true);
      router.refresh();
    } catch {
      setConfirm(false);
      window.alert("Non sono riuscito a eliminare, riprova");
    } finally {
      setBusy(false);
    }
  }

  if (removed) return null;

  return (
    <div className="relative" style={{ marginBottom: "var(--s3)" }}>
      {/* Zona rossa dietro, rivelata dallo swipe */}
      <motion.div
        className="absolute inset-y-0 right-0 flex w-20 items-center justify-center"
        style={{ opacity: delOpacity, background: "var(--destructive)", borderRadius: "var(--r-lg)" }}
      >
        <motion.button
          type="button"
          style={{ scale: delScale }}
          onClick={(e) => {
            e.stopPropagation();
            setConfirm(true);
          }}
          className="flex flex-col items-center gap-1 text-white"
        >
          <Trash2 className="size-4" />
          <span style={{ fontSize: 10, fontWeight: "var(--fw-semi)" }}>Elimina</span>
        </motion.button>
      </motion.div>

      {/* Superficie trascinabile */}
      <motion.div
        drag="x"
        dragConstraints={{ left: SWIPE_THRESHOLD, right: 0 }}
        dragElastic={{ left: 0.1, right: 0.05 }}
        onDragEnd={onDragEnd}
        style={{ x }}
        className={busy ? "pointer-events-none opacity-50" : ""}
      >
        <div
          className="overflow-hidden"
          style={{ borderRadius: "var(--r-lg)", background: "var(--tile)", border: "1px solid var(--tile-line)" }}
        >
      <button
        type="button"
        onClick={onCardTap}
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
          <div className="flex flex-wrap gap-[var(--s3)]">
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
            {event.type?.toLowerCase() === "sport" && (
              <a
                href={standingsUrl(event.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-[var(--s3)] inline-flex items-center gap-1.5"
                style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)" }}
              >
                <Trophy className="size-[15px]" /> Classifica
              </a>
            )}
          </div>
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
      </motion.div>

      {/* Conferma eliminazione */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: "var(--scrim)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm" style={{ background: "var(--surface)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-pop)", padding: "var(--s4)" }}>
            <h4 style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-base)", color: "var(--on-surface)" }}>
              Eliminare questo evento?
            </h4>
            <p className="mt-2" style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)" }}>{event.title}</p>
            <div className="mt-5 flex gap-[var(--s2)]">
              <button
                type="button"
                onClick={() => {
                  setConfirm(false);
                  animate(x, 0, SWIPE_SPRING);
                }}
                disabled={busy}
                className="flex-1 disabled:opacity-50"
                style={{ minHeight: "var(--tap)", borderRadius: "var(--r-sm)", fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", background: "var(--inset)", border: "1px solid var(--inset-line)", color: "var(--on-surface)" }}
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={busy}
                className="flex-1 text-white disabled:opacity-50"
                style={{ minHeight: "var(--tap)", borderRadius: "var(--r-sm)", fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", background: "var(--destructive)" }}
              >
                {busy ? "Elimino…" : "Elimina"}
              </button>
            </div>
          </div>
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
function TodoRow({ pending, onOpen }: { pending: number; onOpen: () => void }) {
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
        <div style={{ fontSize: "var(--fs-xs)", color: "var(--app-2)", marginTop: 2 }}>
          {pending > 0 ? `${pending} da fare` : "Tutto fatto · tocca un giorno per aggiungere"}
        </div>
      </div>
      <ChevronRight className="size-5 flex-none" style={{ color: "var(--app-faint)" }} />
    </button>
  );
}

/* Riga sotto il testo del to-do: orario (se c'è) + mini bottoni Mappa/Chiama
 * ricavati dal testo. Stessa idea delle azioni per-tipo degli eventi. */
/* Anticipi disponibili per la notifica: tap sulla campanella per ciclare. */
const LEAD_STEPS = [15, 30, 60, 120];

function TodoMeta({ todo, onPatch }: { todo: Todo; onPatch: (id: string, fields: { time?: string | null; lead?: number; double?: boolean }) => void }) {
  // Prima scelta: luogo/telefono veri risolti da Claude. Fallback: euristica sul testo.
  const phone = todo.phone ? `tel:${todo.phone.replace(/[^\d+]/g, "")}` : todoPhone(todo.text);
  const place = todo.location ?? todoPlace(todo.text);

  const chip: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: "var(--fw-semi)",
    color: "var(--accent-strong)",
    background: "color-mix(in srgb, var(--primary) 14%, transparent)",
    padding: "3px 8px",
    borderRadius: "var(--r-pill)",
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {/* Chip orario: toccalo per impostare/cambiare l'ora (selettore nativo).
          L'input vero è invisibile sopra il chip. */}
      <label className="relative inline-flex items-center active:scale-95" style={todo.time ? chip : { ...chip, color: "var(--app-faint)", background: "var(--inset)" }}>
        <span className="tabular-nums">{todo.time ?? "+ orario"}</span>
        <input
          type="time"
          value={todo.time ?? ""}
          onChange={(e) => onPatch(todo.id, { time: e.target.value || null })}
          aria-label="Orario del to-do"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      {/* Notifica: campanella cicla l'anticipo (15→30→60→120 min) */}
      {todo.time && (
        <button
          type="button"
          onClick={() => {
            const i = LEAD_STEPS.indexOf(todo.lead);
            onPatch(todo.id, { lead: LEAD_STEPS[(i + 1) % LEAD_STEPS.length] });
          }}
          aria-label="Anticipo notifica"
          className="inline-flex items-center gap-1 active:scale-95"
          style={chip}
        >
          <Bell className="size-3" /> {todo.lead}′
        </button>
      )}
      {/* ×2 = seconda notifica a ridosso (~15 min prima) */}
      {todo.time && todo.lead > 15 && (
        <button
          type="button"
          onClick={() => onPatch(todo.id, { double: !todo.double })}
          aria-label="Doppia notifica"
          className="inline-flex items-center active:scale-95"
          style={todo.double ? chip : { ...chip, color: "var(--app-faint)", background: "var(--inset)" }}
        >
          ×2
        </button>
      )}
      {place && (
        <a
          href={mapsUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-[60%] items-center gap-1 active:scale-95"
          style={chip}
        >
          <MapPin className="size-3 flex-none" />
          <span className="truncate">Maps</span>
        </a>
      )}
      {phone && (
        <a href={phone} className="inline-flex items-center gap-1 active:scale-95" style={chip}>
          <Phone className="size-3" /> Chiama
        </a>
      )}
      {/* Link extra trovato da Claude (es. classifica F1) */}
      {todo.link && (
        <a
          href={todo.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 active:scale-95"
          style={chip}
        >
          <Trophy className="size-3" /> {todo.linkLabel ?? "Info"}
        </a>
      )}
      {/* Riga informativa (es. dove vederlo in TV) */}
      {todo.info && (
        <span className="w-full" style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)", lineHeight: 1.35 }}>
          {todo.info}
        </span>
      )}
    </div>
  );
}

/* ---------- Calendario mensile: scegli un giorno → apre l'overlay to-do ---------- */
function MonthPicker({
  initial,
  marked,
  onPick,
  onClose,
}: {
  initial: Date;
  marked: Set<string>;
  onPick: (d: Date) => void;
  onClose: () => void;
}) {
  const [ym, setYm] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const todayIso = isoDay(new Date());

  const label = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(ym);
  const cap = label.charAt(0).toUpperCase() + label.slice(1);

  // Celle del mese: vuote fino al primo giorno (settimana che parte da lunedì).
  const offset = (ym.getDay() + 6) % 7;
  const nDays = new Date(ym.getFullYear(), ym.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: nDays }, (_, i) => new Date(ym.getFullYear(), ym.getMonth(), i + 1)),
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "var(--scrim)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div
        className="fixed z-50"
        style={{ left: "var(--gutter)", right: "var(--gutter)", top: 118, background: "var(--surface)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-pop)", padding: "var(--s4)" }}
        role="dialog"
        aria-label="Calendario"
      >
        {/* Mese + frecce */}
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--s3)" }}>
          <button
            type="button"
            onClick={() => setYm(new Date(ym.getFullYear(), ym.getMonth() - 1, 1))}
            aria-label="Mese precedente"
            className="grid place-items-center active:scale-95"
            style={{ width: "var(--tap)", height: "var(--tap)", margin: -10, color: "var(--app-2)" }}
          >
            <ChevronLeft className="size-5" />
          </button>
          <span style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-base)", color: "var(--on-surface)" }}>{cap}</span>
          <button
            type="button"
            onClick={() => setYm(new Date(ym.getFullYear(), ym.getMonth() + 1, 1))}
            aria-label="Mese successivo"
            className="grid place-items-center active:scale-95"
            style={{ width: "var(--tap)", height: "var(--tap)", margin: -10, color: "var(--app-2)" }}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Intestazione giorni */}
        <div className="grid grid-cols-7 text-center" style={{ marginBottom: "var(--s1)" }}>
          {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
            <span key={i} style={{ fontSize: "11px", fontWeight: "var(--fw-semi)", color: "var(--app-faint)" }}>
              {d}
            </span>
          ))}
        </div>

        {/* Griglia dei giorni */}
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const iso = isoDay(d);
            const isToday = iso === todayIso;
            const hasStuff = marked.has(iso);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onPick(d)}
                className="relative mx-auto grid place-items-center active:scale-95"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--r-pill)",
                  fontSize: "var(--fs-sm)",
                  fontWeight: isToday ? "var(--fw-black)" : "var(--fw-med)",
                  color: isToday ? "#fff" : "var(--on-surface)",
                  background: isToday ? "var(--keiko-grad)" : "transparent",
                }}
              >
                <span className="tabular-nums">{d.getDate()}</span>
                {hasStuff && (
                  <span
                    className="absolute"
                    style={{ bottom: 4, width: 4, height: 4, borderRadius: "var(--r-pill)", background: isToday ? "#fff" : "var(--warm)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ---------- Overlay to-do del giorno (dati veri via /api/todos) ---------- */
function TodoOverlay({
  day,
  todos,
  dayEvents = [],
  onAdd,
  onPatch,
  onDelete,
  onClose,
}: {
  day: WeekDay;
  todos: Todo[];
  dayEvents?: Ticket[];
  onAdd: (text: string) => Promise<boolean>;
  onPatch: (id: string, fields: { done?: boolean; star?: boolean; time?: string | null; lead?: number; double?: boolean }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const titleDate = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric" }).format(day.date);
  const cap = titleDate.charAt(0).toUpperCase() + titleDate.slice(1);
  const pending = todos.filter((t) => !t.done).length;

  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t) return;
    // Chiudi subito: Keiko lavora in background (le ricerche web richiedono
    // secondi) e il to-do compare nella lista appena è pronto.
    onAdd(t).then((ok) => {
      if (!ok) window.alert("Non sono riuscito a salvare: " + t);
    });
    setText("");
    onClose();
  }

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

        {/* Impegni del giorno (biglietti & co.) — sola lettura, in breve */}
        {dayEvents.map((e) => {
          const EvIcon = iconForType(e.type);
          const { time: evTime } = dateTimeParts(e.datetime);
          return (
            <div key={e.id} className="flex items-center gap-[var(--s3)]" style={{ padding: "9px 0", borderTop: "1px solid var(--inset-line)" }}>
              <span
                className="grid flex-none place-items-center text-white"
                style={{ width: 23, height: 23, borderRadius: "var(--r-sm)", background: catTint(e.type) }}
              >
                <EvIcon className="size-3" />
              </span>
              <span className="min-w-0 flex-1 truncate" style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)", color: "var(--on-surface)" }}>
                {e.title}
              </span>
              <span className="flex-none tabular-nums" style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)" }}>
                {evTime}
              </span>
            </div>
          );
        })}

        {todos.length === 0 && dayEvents.length === 0 && (
          <p style={{ padding: "11px 0", borderTop: "1px solid var(--inset-line)", fontSize: "var(--fs-sm)", color: "var(--on-surface-2)" }}>
            Niente per questo giorno.
          </p>
        )}

        {todos.map((t) => (
          <div key={t.id} className="flex items-center gap-[var(--s3)]" style={{ padding: "11px 0", borderTop: "1px solid var(--inset-line)" }}>
            {/* Spunta fatto/da fare */}
            <button
              type="button"
              onClick={() => onPatch(t.id, { done: !t.done })}
              aria-label={t.done ? "Segna da fare" : "Segna fatto"}
              className="grid flex-none place-items-center active:scale-95"
              style={{ width: 23, height: 23, borderRadius: "var(--r-pill)", border: "2px solid var(--accent-strong)", background: t.done ? "var(--primary)" : "transparent", color: "#fff" }}
            >
              {t.done && <Check className="size-3" />}
            </button>
            <div className="min-w-0 flex-1">
              <span
                style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)", color: t.done ? "var(--on-surface-2)" : "var(--on-surface)", textDecoration: t.done ? "line-through" : "none" }}
              >
                {t.text}
              </span>
              <TodoMeta todo={t} onPatch={onPatch} />
            </div>
            {/* Stella importante */}
            <button
              type="button"
              onClick={() => onPatch(t.id, { star: !t.star })}
              aria-label={t.star ? "Togli stella" : "Metti stella"}
              className="grid flex-none place-items-center active:scale-95"
              style={{ width: "var(--tap)", height: "var(--tap)", margin: "-10px -8px" }}
            >
              <Star className="size-[17px]" style={{ color: t.star ? "var(--warm)" : "var(--app-faint)", fill: t.star ? "var(--warm)" : "none" }} />
            </button>
            {/* Elimina */}
            <button
              type="button"
              onClick={() => onDelete(t.id)}
              aria-label="Elimina to-do"
              className="grid flex-none place-items-center active:scale-95"
              style={{ width: "var(--tap)", height: "var(--tap)", margin: "-10px -10px -10px -8px", color: "var(--app-faint)" }}
            >
              <X className="size-[17px]" />
            </button>
          </div>
        ))}

        {/* Aggiungi to-do */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-[var(--s3)]"
          style={{ padding: "12px 0 2px", borderTop: "1px solid var(--inset-line)" }}
        >
          <button
            type="submit"
            disabled={!text.trim()}
            aria-label="Aggiungi to-do"
            className="grid flex-none place-items-center text-white active:scale-95 disabled:opacity-60"
            style={{ width: 23, height: 23, borderRadius: "var(--r-pill)", background: "var(--keiko-grad)" }}
          >
            <Plus className="size-3.5" />
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ricordami di…"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent outline-none"
            style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", color: "var(--on-surface)" }}
          />
        </form>
      </div>
    </>
  );
}
