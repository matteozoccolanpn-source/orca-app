"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coffee,
  Apple,
  UtensilsCrossed,
  Cookie,
  Moon,
  Utensils,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DietMeal } from "@/lib/supabase";

/* ------------------------------------------------------------------ *
 * UI dieta — tutto via token v15, nessun colore hardcoded.
 * MealRow è l'unico modo in cui un pasto viene mostrato (home + /salute),
 * così lo stile "opzione + cambia" resta identico ovunque.
 * ------------------------------------------------------------------ */

/* Ordine e nomi estesi dei giorni. Le chiavi sono quelle del backend. */
export const DAY_ORDER = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;
export const DAY_FULL: Record<string, string> = {
  lun: "Lunedì",
  mar: "Martedì",
  mer: "Mercoledì",
  gio: "Giovedì",
  ven: "Venerdì",
  sab: "Sabato",
  dom: "Domenica",
};

/** La chiave giorno di oggi (getDay(): 0=domenica). */
export function todayDietKey(): string {
  return ["dom", "lun", "mar", "mer", "gio", "ven", "sab"][new Date().getDay()];
}

/* Icona coerente col nome del pasto (match "morbido" sul testo). */
function iconForMeal(pasto: string): LucideIcon {
  const p = pasto.toLowerCase();
  if (p.includes("colazione")) return Coffee;
  if (p.includes("spuntino")) return Apple;
  if (p.includes("pranzo")) return UtensilsCrossed;
  if (p.includes("merenda")) return Cookie;
  if (p.includes("cena")) return Moon;
  return Utensils;
}

/**
 * Una riga-pasto: nome del pasto + UNA opzione visibile; se ci sono più
 * alternative, un bottone "cambia" le scorre con una transizione morbida.
 * Lo stato dell'opzione scelta è locale (non si salva: è solo per guardare).
 */
export function MealRow({ meal }: { meal: DietMeal }) {
  const [idx, setIdx] = useState(0);
  const opzioni = meal.opzioni.length > 0 ? meal.opzioni : ["—"];
  const many = opzioni.length > 1;
  const Icon = iconForMeal(meal.pasto);

  const next = () => setIdx((i) => (i + 1) % opzioni.length);

  return (
    <div
      className="flex items-center gap-[var(--s3)]"
      style={{
        background: "var(--inset)",
        border: "1px solid var(--inset-line)",
        borderRadius: "var(--r-md)",
        padding: "var(--s3)",
      }}
    >
      <span
        className="grid flex-none place-items-center"
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--r-sm)",
          background: "color-mix(in srgb, var(--primary) 14%, transparent)",
          color: "var(--accent-strong)",
        }}
      >
        <Icon className="size-[19px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div
          className="flex items-center gap-2 uppercase"
          style={{
            fontSize: "10.5px",
            fontWeight: "var(--fw-semi)",
            letterSpacing: ".04em",
            color: "var(--on-surface-2)",
          }}
        >
          {meal.pasto}
          {many && (
            <span className="tabular-nums" style={{ color: "var(--on-surface-3)", letterSpacing: 0 }}>
              {idx + 1}/{opzioni.length}
            </span>
          )}
        </div>
        {/* L'opzione cambia con un piccolo crossfade quando premi "cambia". */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: "var(--fs-sm)",
              fontWeight: "var(--fw-med)",
              color: "var(--on-surface)",
              lineHeight: 1.35,
              marginTop: 2,
            }}
          >
            {opzioni[idx]}
          </motion.div>
        </AnimatePresence>
      </div>

      {many && (
        <button
          type="button"
          onClick={next}
          aria-label="Cambia opzione"
          className="flex flex-none items-center gap-1 transition-transform duration-200 active:scale-90"
          style={{
            minWidth: "var(--tap)",
            minHeight: "var(--tap)",
            justifyContent: "center",
            margin: "calc(var(--s3) * -1)",
            marginLeft: 0,
            color: "var(--accent-strong)",
            fontSize: "11px",
            fontWeight: "var(--fw-semi)",
          }}
        >
          <RefreshCw className="size-[15px]" />
        </button>
      )}
    </div>
  );
}
