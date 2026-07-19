"use client";

import { useRef, useState } from "react";
import type { LiveHome } from "./keikoLive";

/* Pannello del giorno (design v4). Mostra eventi + promemoria (to-do) del giorno.
   Le azioni sui to-do (spunta / stella / elimina / aggiungi) le passa la Home
   (che possiede il router per ricaricare i dati veri). In anteprima pubblica
   (demo) sono inerti/nascoste: niente tasti morti. */

type DayData = LiveHome["days"][string] | null;

const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const LEADS = [15, 30, 60, 120]; // minuti selezionabili per l'anticipo
function fmtLead(m: number) { return m < 60 ? `${m}m` : `${m / 60}h`; }
function nextLead(m: number) { const i = LEADS.indexOf(m); return i < 0 ? 30 : LEADS[(i + 1) % LEADS.length]; }

export default function DaySheet({
  title, day, demo = false, onClose, onToggle, onStar, onDelete, onAdd, onSetLead, onSetDouble,
}: {
  title: string;
  day: DayData;
  demo?: boolean;
  onClose: () => void;
  onToggle: (id: string, done: boolean) => void;
  onStar: (id: string, star: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
  onSetLead: (id: string, lead: number) => void;
  onSetDouble: (id: string, double: boolean) => void;
}) {
  const [newText, setNewText] = useState("");
  const events = day?.events ?? [];
  const todos = day?.todos ?? [];
  const empty = events.length === 0 && todos.length === 0;

  const addingRef = useRef(false);
  const add = () => {
    const t = newText.trim();
    if (!t || addingRef.current) return; // anti doppio-tap → niente promemoria doppioni
    addingRef.current = true;
    onAdd(t);
    setNewText("");
    setTimeout(() => { addingRef.current = false; }, 1500);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
      <div
        className="ds k-sheet-in"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "0 20px calc(env(safe-area-inset-bottom) + 22px)" }}
      >
        <div style={{ position: "sticky", top: 0, background: "var(--k-bg)", paddingTop: 10, zIndex: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--k-text)", margin: 0, textTransform: "capitalize" }}>{title}</h2>
              {day && <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 3 }}>{pl(day.counts.eventi, "evento", "eventi")} · {day.counts.todo} da fare{day.counts.fatti ? ` · ${pl(day.counts.fatti, "fatto", "fatti")}` : ""}</div>}
            </div>
            <button onClick={onClose} aria-label="Chiudi" style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--k-surface)", border: "1px solid var(--k-line)", color: "var(--k-text-2)", fontSize: 14, cursor: "pointer" }}>✕</button>
          </div>
        </div>

        {empty && <p style={{ fontSize: 14, color: "var(--k-text-3)", textAlign: "center", padding: "24px 0" }}>Niente in programma 🌿</p>}

        {events.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "6px 2px 10px" }}>Eventi</div>
            {events.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 14, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{e.emoji ?? "📌"}</span>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>{e.title}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--k-accent)" }}>{e.time}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "6px 2px 10px" }}>Promemoria</div>
        {todos.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 14, marginBottom: 8 }}>
            <button onClick={() => !demo && onToggle(t.id, !t.done)} aria-label="Fatto" disabled={demo} style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", border: t.done ? "0" : "2px solid var(--k-text-3)", background: t.done ? "var(--k-accent)" : "transparent", color: "var(--k-accent-ink)", fontSize: 13, fontWeight: 800, cursor: demo ? "default" : "pointer", display: "grid", placeItems: "center" }}>{t.done ? "✓" : ""}</button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.done ? "var(--k-text-3)" : "var(--k-text)", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</div>
              {t.time && <div style={{ fontSize: 12, color: "var(--k-accent)", fontWeight: 700, marginTop: 2 }}>{t.time}</div>}
              {!demo && t.time && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button onClick={() => onSetLead(t.id, nextLead(typeof t.lead === "number" ? t.lead : 30))} title="Quanto prima avvisarti" style={{ background: "var(--k-surface-2)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "3px 9px", fontSize: 11.5, fontWeight: 600, color: "var(--k-text-2)", cursor: "pointer" }}>🔔 {fmtLead(typeof t.lead === "number" ? t.lead : 30)} prima</button>
                  <button onClick={() => onSetDouble(t.id, !t.double)} title="Doppio promemoria" style={{ background: t.double ? "var(--k-accent)" : "var(--k-surface-2)", border: `1px solid ${t.double ? "transparent" : "var(--k-line)"}`, borderRadius: 999, padding: "3px 9px", fontSize: 11.5, fontWeight: 700, color: t.double ? "var(--k-accent-ink)" : "var(--k-text-3)", cursor: "pointer" }}>×2</button>
                </div>
              )}
            </div>
            {!demo && (
              <>
                <button onClick={() => onStar(t.id, !t.star)} aria-label="Stella" style={{ background: "none", border: 0, fontSize: 16, cursor: "pointer", color: t.star ? "var(--k-accent)" : "var(--k-text-3)" }}>{t.star ? "★" : "☆"}</button>
                <button onClick={() => onDelete(t.id)} aria-label="Elimina" style={{ background: "none", border: 0, fontSize: 15, cursor: "pointer", color: "var(--k-text-3)" }}>🗑</button>
              </>
            )}
          </div>
        ))}
        {todos.length === 0 && !empty && <p style={{ fontSize: 13, color: "var(--k-text-3)", margin: "2px 2px 8px" }}>Nessun promemoria per questo giorno.</p>}

        {!demo && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Aggiungi un promemoria…" style={{ flex: 1, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "11px 14px", color: "var(--k-text)", fontSize: 14, fontFamily: "inherit", outline: 0 }} />
            <button onClick={add} disabled={!newText.trim()} className="ds-btn primary" style={{ height: 44, padding: "0 16px", opacity: newText.trim() ? 1 : 0.4 }}>Aggiungi</button>
          </div>
        )}
      </div>
    </div>
  );
}
