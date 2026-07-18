"use client";

import { useState } from "react";

/* "Chiedi a Keiko" nel design v4: risposta AI (/api/ask) + collegamenti
   rapidi ai tuoi eventi/to-do (/api/search). Riusa le route esistenti. */

type SearchRes = {
  events: { id: string; title: string; datetime: string; location: string | null }[];
  todos: { id: string; text: string; day: string; time: string | null }[];
};

function fmtWhen(dt: string) {
  try { return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(new Date(dt)); }
  catch { return dt; }
}

// to-do: "2026-07-03" + "20:00:00" → "gio 3 lug · 20:00"
function fmtDay(day: string, time?: string | null) {
  try {
    const base = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" }).format(new Date(day + "T00:00:00"));
    return base + (time ? ` · ${time.slice(0, 5)}` : "");
  } catch { return day + (time ? ` · ${time.slice(0, 5)}` : ""); }
}

// rende il **grassetto** del markdown come testo forte reale
function renderRich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ fontWeight: 700, color: "var(--k-text)" }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

export default function AskSheet({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [res, setRes] = useState<SearchRes | null>(null);

  async function run() {
    const query = q.trim();
    if (!query) return;
    setBusy(true); setAnswer(null); setRes(null);
    try {
      const [ai, s] = await Promise.all([
        fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query }) }).then((r) => r.json()).catch(() => ({ answer: "" })),
        fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query }) }).then((r) => r.json()).catch(() => ({ events: [], todos: [] })),
      ]);
      setAnswer(typeof ai?.answer === "string" && ai.answer ? ai.answer : "Su questa non ho ancora una risposta 😊 — me la segno, così miglioriamo.");
      setRes({ events: s?.events ?? [], todos: s?.todos ?? [] });
    } catch {
      setAnswer("Ho avuto un intoppo, riprova.");
    } finally {
      setBusy(false);
    }
  }

  const hasLinks = res && (res.events.length > 0 || res.todos.length > 0);

  return (
    <div className="ds" style={{ position: "fixed", inset: 0, zIndex: 95, background: "var(--k-bg)", overflowY: "auto", padding: "calc(env(safe-area-inset-top) + 14px) 20px calc(env(safe-area-inset-bottom) + 24px)", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "11px 14px" }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--k-text-3)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") run(); }} placeholder="Chiedi a Keiko… «che allenamento ho oggi?»" style={{ flex: 1, background: "none", border: 0, outline: 0, color: "var(--k-text)", fontSize: 14, fontFamily: "inherit" }} />
          <button onClick={run} aria-label="Chiedi" disabled={busy || !q.trim()} style={{ width: 30, height: 30, borderRadius: "50%", border: 0, background: "var(--k-accent)", color: "var(--k-accent-ink)", fontSize: 16, fontWeight: 800, cursor: "pointer", opacity: busy || !q.trim() ? 0.4 : 1 }}>↑</button>
        </div>
        <button onClick={onClose} aria-label="Chiudi" style={{ background: "none", border: 0, color: "var(--k-text-3)", fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>

      {busy && <p style={{ color: "var(--k-text-3)", fontSize: 12.5, margin: "16px 4px 0" }}>Keiko sta pensando…</p>}

      {!busy && answer && (
        <div style={{ marginTop: 16, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 16, padding: "14px 16px", fontSize: 14, lineHeight: 1.5, color: "var(--k-text)", whiteSpace: "pre-wrap" }}>{renderRich(answer)}</div>
      )}

      {!busy && hasLinks && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 4px 8px" }}>Collegamenti</div>
          {res!.events.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, marginBottom: 8 }}>
              <span>📅</span><span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{e.title}</span><span style={{ fontSize: 12, color: "var(--k-text-3)" }}>{fmtWhen(e.datetime)}</span>
            </div>
          ))}
          {res!.todos.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, marginBottom: 8 }}>
              <span>✅</span><span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{t.text}</span><span style={{ fontSize: 12, color: "var(--k-text-3)" }}>{fmtDay(t.day, t.time)}</span>
            </div>
          ))}
        </div>
      )}

      {!busy && !answer && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 4px 10px" }}>Prova a chiedere</div>
          {["che allenamento ho oggi?", "cosa mangio a cena?", "quando è il prossimo volo?"].map((s) => (
            <div key={s} onClick={() => { setQ(s); run(); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, marginBottom: 8, cursor: "pointer" }}>
              <span>💬</span><span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{s}</span><span style={{ color: "var(--k-text-3)" }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
