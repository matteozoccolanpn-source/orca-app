"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ *
 * DayPanel — overlay giorno #dayPanel del mockup (docs/mockups/
 * keiko-final.html righe 1355-1394). Componente presentazionale
 * prop-driven. Rende SOLO `.dayPanel` (NON il `.dim` di sfondo: è del
 * coordinatore, condiviso tra i pannelli).
 *
 * Markup 1:1: .dayHead (h3 titolo + span conteggi + evClose ✕) +
 * .dayBody (secLabel "Eventi" + .evtRow; secLabel "To-do · <small>…"
 * + .todo con check/txt/chips/star; .addTodo input + ＋).
 *
 * GUARDIA TO-DO (nessuna funzione si perde, 5/5):
 *  1. spunta        → onToggleTodo (tap riga o check; anche swipe → destra)
 *  2. stella        → onStarTodo (tap ★)
 *  3. orario        → .chip.warm 🕔 {time}; interattivo se onEditTime,
 *                     altrimenti statico (come nel mockup)
 *  4. luogo/tel     → .chip 📍 Maps (link reale Google Maps) /
 *                     .chip 📞 Chiama (tel:) — link veri
 *  5. notifica 30′  → .tbc "notifica · presto" (nessun backend → placeholder,
 *                     classe .tbc reale del mockup)
 *  + eliminazione   → swipe sinistra O tasto ✕ visibile, SEMPRE con "Annulla"
 *                     (toast con azione; commit differito, undo locale)
 *
 * Testi copiati da docs/UI-VOICE.md. Nessun colore aggiunto (mood da .keiko).
 * ------------------------------------------------------------------ */

export type DayEvent = {
  id: string;
  emoji?: string;
  time: string;
  title: string;
};

export type DayTodo = {
  id: string;
  text: string;
  done: boolean;
  star: boolean;
  time?: string;
  location?: string;
  phone?: string;
};

export type DayCounts = { eventi: number; todo: number; fatti: number };

export interface DayPanelProps {
  open: boolean;
  title: string;               // es. "Venerdì 3 luglio"
  counts: DayCounts;
  events: DayEvent[];
  todos: DayTodo[];
  onOpenEvent: (id: string) => void;
  onToggleTodo: (id: string) => void;
  onStarTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void; // committato dopo la finestra "Annulla"
  onAddTodo: (text: string) => void;
  onClose: () => void;
  toast: (msg: string, action?: string, onAction?: () => void) => void;
  onEditTime?: (id: string) => void;  // opzionale: se assente il chip orario è statico (TBC)
}

const UNDO_MS = 4000; // finestra "Annulla" (allineata al toast con azione dello shell)

function mapsUrl(q: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export default function DayPanel({
  open, title, counts, events, todos,
  onOpenEvent, onToggleTodo, onStarTodo, onDeleteTodo, onAddTodo, onClose, toast, onEditTime,
}: DayPanelProps) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set()); // id in attesa di commit-elimina
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // pulizia timer allo smontaggio: NON committa (annulla implicito, il todo resta al genitore)
  useEffect(() => {
    const m = timers.current;
    return () => { m.forEach((t) => clearTimeout(t)); m.clear(); };
  }, []);

  const cancelDelete = (id: string) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setPending((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  const requestDelete = (id: string) => {
    if (timers.current.has(id)) return;
    setPending((p) => new Set(p).add(id)); // nasconde subito la riga (feedback ottimistico)
    const t = setTimeout(() => {
      timers.current.delete(id);
      setPending((p) => { const n = new Set(p); n.delete(id); return n; });
      onDeleteTodo(id); // commit reale
    }, UNDO_MS);
    timers.current.set(id, t);
    toast("Eliminato 🗑️", "Annulla", () => cancelDelete(id));
  };

  const submitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    onAddTodo(text);
    setDraft("");
    toast("Preso in carico ✓");
  };

  const visibleTodos = todos.filter((t) => !pending.has(t.id));

  return (
    <div className={`dayPanel${open ? " open" : ""}`} id="dayPanel">
      <div className="dayHead">
        <div>
          <h3>{title}</h3>
          <span>{counts.eventi} eventi · {counts.todo} to-do · {counts.fatti} fatto</span>
        </div>
        <button className="evClose" onClick={onClose} style={{ position: "relative", top: 0, right: 0 }}>✕</button>
      </div>
      <div className="dayBody">
        {events.length > 0 && <div className="secLabel">Eventi</div>}
        {events.map((e) => (
          <div key={e.id} className="evtRow" onClick={() => { onClose(); onOpenEvent(e.id); }}>
            {e.emoji ? `${e.emoji} ` : ""}<span><b>{e.time}</b> · <span className="et">{e.title}</span></span>
          </div>
        ))}

        <div className="secLabel">To-do · <small>trascina: destra fatto, sinistra elimina</small></div>
        {visibleTodos.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            onToggle={() => onToggleTodo(t.id)}
            onStar={() => onStarTodo(t.id)}
            onDelete={() => requestDelete(t.id)}
            onEditTime={onEditTime ? () => onEditTime(t.id) : undefined}
          />
        ))}

        <div className="addTodo">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitDraft(); }}
            placeholder={"Scrivi e ci pensa Keiko… “palestra alle 19”"}
          />
          <button onClick={submitDraft}>＋</button>
        </div>
      </div>
    </div>
  );
}

/* --- una riga to-do: check + testo + chips + stella, con swipe e ✕ visibile --- */
function TodoRow({
  todo, onToggle, onStar, onDelete, onEditTime,
}: {
  todo: DayTodo;
  onToggle: () => void;
  onStar: () => void;
  onDelete: () => void;
  onEditTime?: () => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const dx = useRef(0);
  const moved = useRef(false);
  const dragging = useRef(false);

  const reduce = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const setTx = (x: number) => {
    if (!el.current) return;
    el.current.style.transform = x ? `translateX(${x}px)` : "";
  };
  const snap = () => {
    if (el.current && reduce) el.current.style.transition = "none";
    setTx(0);
    if (el.current && reduce) requestAnimationFrame(() => { if (el.current) el.current.style.transition = ""; });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // ignora se parte da un controllo interattivo (chip/stella/✕)
    if ((e.target as HTMLElement).closest("a,button,.star")) return;
    dragging.current = true;
    moved.current = false;
    startX.current = e.clientX;
    dx.current = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dx.current = e.clientX - startX.current;
    if (Math.abs(dx.current) > 6) moved.current = true;
    if (!reduce) setTx(Math.max(-96, Math.min(96, dx.current)));
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const d = dx.current;
    if (d > 70) { snap(); onToggle(); }
    else if (d < -70) { snap(); onDelete(); }
    else snap();
  };

  const onRowClick = () => {
    if (moved.current) { moved.current = false; return; } // era uno swipe, non un tap
    onToggle();
  };

  return (
    <div
      ref={el}
      className={`todo${todo.star ? " starred" : ""}${todo.done ? " done" : ""}`}
      onClick={onRowClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <span className="check">✓</span>
      <div>
        <div className="txt">{todo.text}</div>
        {(todo.time || todo.location || todo.phone) && (
          <div className="chips">
            {todo.time && (
              onEditTime
                ? <button className="chip warm" onClick={(e) => { e.stopPropagation(); onEditTime(); }} style={{ border: 0, cursor: "pointer", font: "inherit" }}>🕔 {todo.time}</button>
                : <span className="chip warm">🕔 {todo.time}</span>
            )}
            {todo.location && (
              <a className="chip" href={mapsUrl(todo.location)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>📍 Maps</a>
            )}
            {todo.phone && (
              <a className="chip" href={`tel:${todo.phone}`} onClick={(e) => e.stopPropagation()}>📞 Chiama</a>
            )}
          </div>
        )}
      </div>
      <span className="star" onClick={(e) => { e.stopPropagation(); onStar(); }}>★</span>
      <button
        type="button"
        aria-label="Elimina"
        title="Elimina"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        style={{ border: 0, background: "none", color: "var(--text-3)", fontSize: "14px", minWidth: "22px", cursor: "pointer", lineHeight: 1 }}
      >✕</button>
    </div>
  );
}
