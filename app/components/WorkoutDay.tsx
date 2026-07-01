"use client";

import { motion } from "framer-motion";
import { Dumbbell, Moon } from "lucide-react";
import type { WorkoutDay } from "@/lib/supabase";
import { DAY_FULL } from "./DietMeal";

/* ------------------------------------------------------------------ *
 * UI allenamento — token v15, nessun colore hardcoded. Rende una sessione
 * (titolo + esercizi) o lo stato "Riposo". Riusa DAY_FULL dalla dieta.
 * ------------------------------------------------------------------ */

/** Data locale di oggi in formato YYYY-MM-DD (senza slittamenti di fuso). */
export function todayISO(): string {
  return toISO(new Date());
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type WeekDate = { key: string; iso: string; dn: string; dd: number; isToday: boolean };

/** I 7 giorni della settimana corrente (lun→dom) con data ISO e chiave giorno. */
export function currentWeekDates(): WeekDate[] {
  const KEYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
  const today = new Date();
  const todayIso = toISO(today);
  const dow = (today.getDay() + 6) % 7; // 0 = lunedì
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  return KEYS.map((key, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = toISO(d);
    return {
      key,
      iso,
      dn: KEYS[i].toUpperCase(),
      dd: d.getDate(),
      isToday: iso === todayIso,
    };
  });
}

function isRest(day: WorkoutDay | undefined): boolean {
  return !day || !Array.isArray(day.esercizi) || day.esercizi.length === 0;
}

/* Una riga esercizio: nome + dettaglio (serie/carico). */
export function ExerciseRow({ nome, dettaglio }: { nome: string; dettaglio: string }) {
  return (
    <div
      className="flex items-center gap-[var(--s3)]"
      style={{
        background: "var(--inset)",
        border: "1px solid var(--inset-line)",
        borderRadius: "var(--r-md)",
        padding: "10px var(--s3)",
      }}
    >
      <span
        className="grid flex-none place-items-center"
        style={{
          width: 34,
          height: 34,
          borderRadius: "var(--r-sm)",
          background: "color-mix(in srgb, var(--primary) 14%, transparent)",
          color: "var(--accent-strong)",
        }}
      >
        <Dumbbell className="size-[17px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className="truncate"
          style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", color: "var(--on-surface)" }}
        >
          {nome}
        </div>
      </div>
      {dettaglio && (
        <span
          className="flex-none tabular-nums"
          style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-med)", color: "var(--on-surface-2)" }}
        >
          {dettaglio}
        </span>
      )}
    </div>
  );
}

/* La card di un giorno: intestazione (giorno + titolo) + esercizi o "Riposo". */
export function WorkoutDayCard({
  dayKey,
  day,
  isToday,
  index,
}: {
  dayKey: string;
  day: WorkoutDay;
  isToday: boolean;
  index: number;
}) {
  const rest = isRest(day);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.24), ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
      style={{
        background: "var(--surface)",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--tile-line)",
        boxShadow: "var(--sh-card)",
        padding: "var(--s3)",
        marginBottom: "var(--s3)",
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: rest ? 0 : "var(--s3)" }}>
        <span
          style={{
            fontWeight: "var(--fw-bold)",
            fontSize: "var(--fs-base)",
            color: "var(--on-surface)",
            letterSpacing: "-.01em",
          }}
        >
          {DAY_FULL[dayKey]}
        </span>
        {day.titolo && !rest && (
          <span style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)", fontWeight: "var(--fw-med)" }}>
            · {day.titolo}
          </span>
        )}
        {isToday && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "10.5px",
              fontWeight: "var(--fw-bold)",
              color: "#fff",
              background: "var(--keiko-grad)",
              padding: "3px 9px",
              borderRadius: "var(--r-pill)",
            }}
          >
            Oggi
          </span>
        )}
      </div>

      {rest ? (
        <div className="flex items-center gap-2" style={{ color: "var(--on-surface-3)", marginTop: 2 }}>
          <Moon className="size-4" />
          <span style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)" }}>Riposo</span>
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--s2)]">
          {day.esercizi.map((ex, i) => (
            <ExerciseRow key={i} nome={ex.nome} dettaglio={ex.dettaglio} />
          ))}
        </div>
      )}
    </motion.section>
  );
}
