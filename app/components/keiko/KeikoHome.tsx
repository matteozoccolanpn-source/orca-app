"use client";

import { useMemo, useRef, useState } from "react";
import type { Ticket, DietWeek, WorkoutWeek, TripPlanRow, Todo } from "@/lib/supabase";

/* ------------------------------------------------------------------ *
 * KEIKO — Nuova home (redesign, Fase 3).
 * Vive dietro l'interruttore `?v2`: la home attuale resta intatta.
 * Tutti i token vengono dallo scope `.keiko` in globals.css (mockup approvato).
 * Questo step 1 porta: guscio + ambient + barra alta (mood funzionante) +
 * settimana (puntini dai dati veri) + saluto + card "prossimo".
 * Nessuna logica/API nuova: solo presentazione sui dati già caricati.
 * ------------------------------------------------------------------ */

const WD_SHORT = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const WD_LONG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

// Chiave giorno locale YYYY-MM-DD (senza scivolare di fuso).
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Pers = "oceano" | "tramonto" | "laguna";
const PERS_ORDER: Pers[] = ["oceano", "tramonto", "laguna"];
const PERS_NAME: Record<Pers, string> = { oceano: "Oceano 🌊", tramonto: "Tramonto 🌅", laguna: "Laguna 🪸" };

export default function KeikoHome({
  events,
  todos,
}: {
  events: Ticket[];
  trips: TripPlanRow[];
  todos: Todo[];
  watchCount: number;
  diet: DietWeek | null;
  workout: WorkoutWeek | null;
  trainedDays: string[];
  logoutAction?: () => Promise<void>;
}) {
  const [day, setDay] = useState(false); // false = mood notte, true = mood giorno
  const [pers, setPers] = useState<Pers>("oceano");
  const [sel, setSel] = useState<string | null>(null); // giorno aperto nel peek
  const screenRef = useRef<HTMLDivElement | null>(null);

  const now = new Date();
  const todayKey = dayKey(now);

  // Finestra di 7 giorni a partire da oggi.
  const week = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

  // Eventi e to-do raggruppati per giorno (dai dati veri).
  const eventsByDay = useMemo(() => {
    const m = new Map<string, Ticket[]>();
    for (const e of events) {
      const k = dayKey(new Date(e.datetime));
      (m.get(k) ?? m.set(k, []).get(k)!).push(e);
    }
    return m;
  }, [events]);

  const todosByDay = useMemo(() => {
    const m = new Map<string, Todo[]>();
    for (const t of todos) {
      (m.get(t.day) ?? m.set(t.day, []).get(t.day)!).push(t);
    }
    return m;
  }, [todos]);

  // Prossimo evento (per la card "Esci / Prossimo").
  const next = useMemo(() => {
    const future = events
      .map((e) => ({ e, t: new Date(e.datetime).getTime() }))
      .filter((x) => x.t >= now.getTime())
      .sort((a, b) => a.t - b.t);
    return future[0]?.e ?? null;
  }, [events, now]);

  function cyclePers() {
    const i = PERS_ORDER.indexOf(pers);
    setPers(PERS_ORDER[(i + 1) % PERS_ORDER.length]);
  }

  const selDate = sel ? week.find((d) => dayKey(d) === sel) ?? null : null;

  return (
    <div
      className={`keiko${day ? " day" : ""}`}
      data-pers={pers}
      style={{
        position: "relative",
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--f)",
        transition: "background-color .5s ease, color .5s ease",
      }}
    >
      {/* Aura colorata in alto (bloom della personalità) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--ambient)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        ref={screenRef}
        style={{ position: "relative", zIndex: 1, paddingBottom: "120px" }}
      >
        {/* ===== BARRA ALTA ===== */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "calc(env(safe-area-inset-top) + 16px) 14px 8px",
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 96%, transparent) 60%, transparent)",
            backdropFilter: "blur(14px)",
          }}
        >
          <button
            type="button"
            onClick={() => screenRef.current?.scrollIntoView({ behavior: "smooth" })}
            aria-label="Keiko"
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              flex: "none",
              display: "grid",
              placeItems: "center",
              fontSize: 19,
              background: "rgba(var(--pA), .16)",
              border: "1px solid var(--card-line)",
              cursor: "pointer",
            }}
          >
            🐋
          </button>

          {/* Pill "Chiedi a Keiko" — l'Ask arriva in uno step successivo */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--card)",
              border: "1px solid var(--card-line)",
              borderRadius: "var(--r-pill)",
              padding: "11px 14px",
              color: "var(--text-3)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.6} stroke="var(--accent)" style={{ width: 15, height: 15, flex: "none" }}>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <b style={{ color: "var(--text-2)", fontWeight: 700 }}>Chiedi a Keiko</b>
          </div>

          {/* Mood chiaro/scuro — funzionante */}
          <button
            type="button"
            onClick={() => setDay((v) => !v)}
            aria-label="Cambia mood"
            style={icoBtn}
          >
            {day ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 17, height: 17 }}>
                <path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 17, height: 17 }}>
                <circle cx="12" cy="12" r="4.2" />
                <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" />
              </svg>
            )}
          </button>

          {/* Campanella — placeholder (personalità in cambio al tap, per provarle) */}
          <button type="button" onClick={cyclePers} aria-label={`Personalità: ${PERS_NAME[pers]}`} style={icoBtn}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 17, height: 17 }}>
              <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            <span style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", border: "2px solid var(--bg)" }} />
          </button>
        </div>

        {/* ===== SETTIMANA ===== */}
        <div style={{ display: "flex", gap: 6, padding: "4px 16px 0", position: "relative" }}>
          {week.map((d) => {
            const k = dayKey(d);
            const isToday = k === todayKey;
            const hasEvent = (eventsByDay.get(k)?.length ?? 0) > 0;
            const hasTodo = (todosByDay.get(k)?.length ?? 0) > 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSel((s) => (s === k ? null : k))}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  padding: "9px 0 7px",
                  borderRadius: "var(--r-md)",
                  border: 0,
                  cursor: "pointer",
                  color: isToday ? "#fff" : "var(--text-3)",
                  background: isToday ? "var(--accent)" : "transparent",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".05em",
                  textTransform: "uppercase",
                }}
              >
                <span>{WD_SHORT[d.getDay()]}</span>
                <b style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: isToday ? "#fff" : "var(--text-2)" }}>{d.getDate()}</b>
                <span style={{ display: "flex", gap: 3, height: 4 }}>
                  {hasEvent && <i style={{ width: 4, height: 4, borderRadius: "50%", background: isToday ? "#fff" : "rgb(var(--pA))" }} />}
                  {hasTodo && <i style={{ width: 4, height: 4, borderRadius: "50%", background: isToday ? "#fff" : "rgb(var(--pB))" }} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Peek del giorno selezionato (sola lettura dai dati; l'overlay pieno arriva dopo) */}
        {selDate && (
          <div style={{ margin: "6px 16px 0", background: "var(--bg-2)", border: "1px solid var(--card-line)", borderRadius: "var(--r-lg)", padding: 14, boxShadow: "var(--shadow)" }}>
            <h5 style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
              {WD_LONG[selDate.getDay()]} {selDate.getDate()}
            </h5>
            <PeekRows
              events={eventsByDay.get(dayKey(selDate)) ?? []}
              todos={todosByDay.get(dayKey(selDate)) ?? []}
            />
          </div>
        )}

        {/* ===== SALUTO ===== */}
        <div style={{ padding: "14px 16px 0" }}>
          <div style={{ fontSize: "var(--fs-xs)", fontWeight: 800, letterSpacing: ".14em", color: "var(--text-3)", textTransform: "uppercase" }}>
            {WD_LONG[now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()]}
          </div>
          <h1 style={{ fontSize: "var(--fs-xl)", fontWeight: 800, letterSpacing: "-.02em", color: "var(--text)", marginTop: 4 }}>
            Ciao Matteo 👋
          </h1>
        </div>

        {/* ===== PROSSIMO (card scura come "Adesso" del mockup) ===== */}
        {next && (
          <div
            style={{
              margin: "var(--gap) 16px 0",
              display: "flex",
              alignItems: "center",
              gap: 13,
              background: "var(--text)",
              borderRadius: "var(--r-lg)",
              padding: "13px 16px",
              boxShadow: "var(--shadow)",
            }}
          >
            <span style={{ flex: "none", fontSize: 24 }}>{next.emoji}</span>
            <div>
              <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--bg)" }}>{next.title}</div>
              <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "color-mix(in srgb, var(--bg) 60%, var(--text))", marginTop: 1 }}>
                {formatWhen(next.datetime)}
                {next.location ? ` · ${next.location}` : ""}
              </div>
            </div>
            <span style={{ marginLeft: "auto", color: "color-mix(in srgb, var(--bg) 55%, var(--text))", fontSize: 18 }}>›</span>
          </div>
        )}

        {/* Nota cantiere — sparirà man mano che portiamo le sezioni */}
        <div style={{ margin: "28px 16px 0", padding: 14, borderRadius: "var(--r-lg)", border: "1px dashed var(--card-line)", color: "var(--text-3)", fontSize: "var(--fs-sm)", fontWeight: 600, lineHeight: 1.5 }}>
          🚧 Nuova home in costruzione. Prossime sezioni: hero viaggi/eventi, “In arrivo”, “Oggi per te”, “Da guardare”, tab bar.
          <br />
          Tocca 🌓 per il mood, la 🔔 per cambiare personalità colore ({PERS_NAME[pers]}).
        </div>
      </div>
    </div>
  );
}

const icoBtn: React.CSSProperties = {
  position: "relative",
  width: 40,
  height: 40,
  borderRadius: "50%",
  flex: "none",
  display: "grid",
  placeItems: "center",
  color: "var(--text-2)",
  background: "var(--card)",
  border: "1px solid var(--card-line)",
  cursor: "pointer",
};

function PeekRows({ events, todos }: { events: Ticket[]; todos: Todo[] }) {
  if (events.length === 0 && todos.length === 0) {
    return <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-3)", fontWeight: 600 }}>Niente in programma. 💡</div>;
  }
  return (
    <div>
      {events.map((e) => (
        <div key={e.id} style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)", padding: "3px 0", fontWeight: 600 }}>
          <b style={{ color: "var(--accent)", fontWeight: 800 }}>{formatTime(e.datetime)}</b> {e.emoji} {e.title}
        </div>
      ))}
      {todos.map((t) => (
        <div key={t.id} style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)", padding: "3px 0", fontWeight: 600 }}>
          ◦ {t.time ? <b style={{ color: "var(--accent)", fontWeight: 800 }}>{t.time} </b> : null}
          {t.text}
        </div>
      ))}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = dayKey(d) === dayKey(today);
  const t = formatTime(iso);
  if (isToday) return `Oggi · ${t}`;
  return `${WD_SHORT[d.getDay()]} ${d.getDate()} · ${t}`;
}
