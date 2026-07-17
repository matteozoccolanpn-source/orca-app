"use client";

import { useState } from "react";

/* Calendario mensile (design v4). ‹ › navigano i mesi. I pallini (eventi/to-do)
   li conosciamo solo per il mese corrente (li calcola il server). Tocca un giorno
   → apre il pannello del giorno. */

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const WD = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

export default function CalendarSheet({
  baseY, baseM, dots, todayN, onPickDay, onClose,
}: {
  baseY: number;
  baseM: number;
  dots: number[];
  todayN: number | null;
  onPickDay: (key: string) => void;
  onClose: () => void;
}) {
  const [ym, setYM] = useState({ y: baseY, m: baseM });
  const isBase = ym.y === baseY && ym.m === baseM;
  const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7; // lunedì = 0
  const daysN = new Date(ym.y, ym.m + 1, 0).getDate();
  const monthDots = isBase ? dots : [];

  const shift = (d: number) => setYM(({ y, m }) => { const nm = m + d; return { y: y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }; });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 91, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
      <div
        className="ds"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <button onClick={() => shift(-1)} aria-label="Mese precedente" style={{ background: "none", border: 0, color: "var(--k-text-2)", fontSize: 22, cursor: "pointer", padding: "0 8px" }}>‹</button>
          <h2 style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 600, color: "var(--k-text)", margin: 0, textTransform: "capitalize" }}>{MONTHS[ym.m]} {ym.y}</h2>
          <button onClick={() => shift(1)} aria-label="Mese successivo" style={{ background: "none", border: 0, color: "var(--k-text-2)", fontSize: 22, cursor: "pointer", padding: "0 8px" }}>›</button>
          <button onClick={onClose} aria-label="Chiudi" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--k-surface)", border: "1px solid var(--k-line)", color: "var(--k-text-2)", fontSize: 14, cursor: "pointer", marginLeft: 6 }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {WD.map((d) => <span key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--k-text-3)", padding: "4px 0" }}>{d}</span>)}
          {Array.from({ length: lead }).map((_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: daysN }).map((_, i) => {
            const d = i + 1;
            const isToday = isBase && todayN === d;
            const hasDot = monthDots.includes(d);
            const key = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            return (
              <button key={d} onClick={() => onPickDay(key)} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, border: 0, background: isToday ? "var(--k-accent)" : "transparent", color: isToday ? "var(--k-accent-ink)" : "var(--k-text)", fontSize: 14, fontWeight: isToday ? 700 : 500, cursor: "pointer" }}>
                {d}
                {hasDot && <span style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: isToday ? "var(--k-accent-ink)" : "var(--k-accent)" }} />}
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--k-text-3)", textAlign: "center", margin: "14px 0 0" }}>Tocca un giorno per vederlo e aggiungere promemoria.</p>
      </div>
    </div>
  );
}
