"use client";

import { useState } from "react";
import { Sheet, K2_FOGLIO } from "@/app/components/v2/Sheet";
import { I } from "@/app/components/v2/icons";

/* Calendario mensile, sul sistema V2. ‹ › navigano i mesi. I pallini
   (eventi/to-do) li conosciamo solo per il mese corrente (li calcola il
   server). Tocca un giorno → apre il pannello del giorno. */

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const WD = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

/* LA CELLA È LA PILLOLA DELLA STRISCIA DELLA HOME.
   Prima i due calendari dell'app sembravano di due app diverse: qui una
   griglia con l'accento ambra della v1, nella Home le pillole teal.
   I valori sono quelli di `.k2 .home .day` nel foglio — bordo 999, numero a
   13px/600, giorno scelto in teal con testo `--on-teal` e il suo alone.
   Si COPIANO invece di riusare la classe perché quella vive sotto
   `.k2 .home`, e questo foglio non sta dentro la Home. */
const CELLA: React.CSSProperties = {
  position: "relative", aspectRatio: "1", border: 0, background: "transparent",
  borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
  fontSize: 13, fontWeight: 600, color: "var(--txt)",
};
const CELLA_OGGI: React.CSSProperties = {
  background: "var(--teal)", color: "var(--on-teal)",
  boxShadow: "0 4px 16px rgba(61,165,196,.35)",
};

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

  // Il tasto del mese: 44 di presa, che è la misura minima per un dito.
  const frecce = (verso: -1 | 1, etichetta: string) => (
    <button
      onClick={() => shift(verso)}
      aria-label={etichetta}
      className="tap"
      style={{ width: 44, height: 44, flex: "none", display: "grid", placeItems: "center", background: "none", border: 0, color: "var(--txt2)", cursor: "pointer" }}
    >
      {verso < 0 ? I.back({ s: 17 }) : I.right({ s: 17 })}
    </button>
  );

  return (
    <div className="k2" style={K2_FOGLIO}>
      <Sheet onClose={onClose}>
        <div className="plain-head" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {frecce(-1, "Mese precedente")}
          <h2 style={{ flex: 1, textAlign: "center", textTransform: "capitalize" }}>
            {MESI[ym.m]} {ym.y}
          </h2>
          {frecce(1, "Mese successivo")}
        </div>

        <div className="pad">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginTop: 16 }}>
            {WD.map((d) => (
              <span key={d} className="status" style={{ textAlign: "center", margin: 0, fontSize: 11, paddingBottom: 4 }}>{d}</span>
            ))}
            {Array.from({ length: lead }).map((_, i) => <span key={`vuoto-${i}`} />)}
            {Array.from({ length: daysN }).map((_, i) => {
              const d = i + 1;
              const oggi = isBase && todayN === d;
              const pallino = monthDots.includes(d);
              const key = `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              return (
                <button
                  key={d}
                  onClick={() => onPickDay(key)}
                  className="tap"
                  aria-label={`${d} ${MESI[ym.m]}`}
                  style={oggi ? { ...CELLA, ...CELLA_OGGI } : CELLA}
                >
                  {d}
                  {/* Il pallino dice «qui c'è qualcosa». Sul giorno scelto passa
                      al colore del testo, se no sparirebbe dentro il teal. */}
                  {pallino && (
                    <span style={{
                      position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)",
                      width: 4, height: 4, borderRadius: "50%",
                      background: oggi ? "var(--on-teal)" : "var(--teal)",
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          <p className="status" style={{ textAlign: "center", marginTop: 16 }}>
            Tocca un giorno per vederlo e aggiungere promemoria.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
