"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WatchItem } from "@/lib/supabase";
import KeikoNav from "@/app/components/keiko/KeikoNav";

/* Sezione "Da guardare" — design v4. Logica preservata: visto (PATCH), elimina
   con Annulla (DELETE differito), aggiunta libera (POST), consiglio AI. Toast
   integrato (niente più KeikoShell/vecchio design). */

type Pick = { title: string; kind: "film" | "serie"; platform: string | null; info: string | null; link: string | null };
type ToastState = { msg: string; action?: string; onAction?: () => void } | null;

const kindLabel = (k: string) => (k === "serie" ? "Serie" : "Film");
function insertAt<T>(arr: T[], item: T, index: number): T[] {
  const i = Math.max(0, Math.min(index, arr.length));
  return [...arr.slice(0, i), item, ...arr.slice(i)];
}

// fetch con timeout: se l'AI ci mette troppo, non blocca — annulla e segnala.
function fetchWithTimeout(url: string, opts: RequestInit, ms = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

export default function GuardaView({ items }: { items: WatchItem[] }) {
  const router = useRouter();
  const [list, setList] = useState<WatchItem[]>(items);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const busy = useRef(false);

  const [toast, setToast] = useState<ToastState>(null);
  const [ask, setAsk] = useState<null | "add" | "suggest">(null); // foglio input (niente prompt nativi)
  const [askText, setAskText] = useState("");
  const [thinking, setThinking] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function showToast(msg: string, action?: string, onAction?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, action, onAction });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }

  async function toggleSeen(item: WatchItem) {
    const next = !item.seen;
    setList((l) => l.map((i) => (i.id === item.id ? { ...i, seen: next } : i)));
    showToast(next ? "Visto ✓ Com'era?" : "Ok, resta in lista");
    try {
      const res = await fetch("/api/watch", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: item.id, seen: next }) });
      if (!res.ok) throw new Error();
    } catch {
      setList((l) => l.map((i) => (i.id === item.id ? { ...i, seen: item.seen } : i)));
      showToast("Qualcosa non torna, riprovo");
    }
  }

  function elimina(item: WatchItem, index: number) {
    setList((l) => l.filter((i) => i.id !== item.id));
    const commit = () => {
      delete timers.current[item.id];
      fetch("/api/watch", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: item.id }) })
        .then((r) => { if (!r.ok) throw new Error(); })
        .catch(() => setList((l) => insertAt(l, item, index)));
    };
    timers.current[item.id] = setTimeout(commit, 3800);
    showToast("Eliminato 🗑️", "Annulla", () => {
      clearTimeout(timers.current[item.id]);
      delete timers.current[item.id];
      setList((l) => insertAt(l, item, index));
    });
  }

  function dove(item: WatchItem) {
    // esito sempre reale: link salvato, oppure JustWatch (dove vederlo in Italia).
    const url = item.link || `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(item.title)}`;
    window.open(url, "_blank", "noopener");
  }

  async function doAdd(title: string) {
    const t = title.trim();
    if (!t) return;
    const kind = /\b(serie|stagione|s\d)/i.test(t) ? "serie" : "film";
    try {
      const res = await fetch("/api/watch", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: t, kind, info: null, link: null }) });
      const data = (await res.json()) as { item?: WatchItem };
      if (!res.ok || !data.item) throw new Error();
      setList((l) => [data.item!, ...l]);
      showToast("Preso in carico ✓");
    } catch { showToast("Qualcosa non torna, riprovo"); }
  }

  async function doSuggest(query: string) {
    if (busy.current) return;
    const q = query.trim() || "consigliami qualcosa da vedere stasera";
    busy.current = true;
    setThinking(true);
    try {
      const res = await fetchWithTimeout("/api/watch/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ query: q }) }, 20000);
      const data = (await res.json()) as { films?: Pick[] };
      if (!res.ok) throw new Error();
      const p = (data.films ?? [])[0];
      setAsk(null);
      if (!p) { showToast("Non ho trovato niente di convincente, riformula"); return; }
      showToast(`Stasera ti direi ${p.title} ✨`, "Aggiungi", () => salvaPick(p));
    } catch (e) {
      setAsk(null);
      showToast(e instanceof Error && e.name === "AbortError" ? "Ci ho messo troppo, riprova 🙏" : "Qualcosa non torna, riprovo");
    } finally { busy.current = false; setThinking(false); }
  }

  // apre il foglio input al posto delle finestre prompt() native
  function openAsk(mode: "add" | "suggest") { setAskText(""); setAsk(mode); }
  async function submitAsk() {
    if (ask === "add") { await doAdd(askText); setAsk(null); }
    else if (ask === "suggest") { await doSuggest(askText); }
  }

  async function salvaPick(p: Pick) {
    const info = [p.info, p.platform ? `su ${p.platform}` : null].filter(Boolean).join(" · ");
    try {
      const res = await fetch("/api/watch", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: p.title, kind: p.kind, info: info || null, link: p.link }) });
      const data = (await res.json()) as { item?: WatchItem };
      if (!res.ok || !data.item) throw new Error();
      setList((l) => [data.item!, ...l]);
      showToast("Preso in carico ✓");
    } catch { showToast("Qualcosa non torna, riprovo"); }
  }

  const hero = list.find((i) => !i.seen) ?? null;
  const grid = hero ? list.filter((i) => i.id !== hero.id) : list;
  const count = list.length;

  return (
    <div className="ds" style={{ minHeight: "100dvh", background: "var(--k-bg)", padding: "0 20px calc(116px + env(safe-area-inset-bottom))", maxWidth: 440, margin: "0 auto" }}>
      {/* header */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 12, margin: "0 -20px", padding: "calc(env(safe-area-inset-top) + 12px) 20px 12px", background: "rgba(11,13,18,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <button onClick={() => router.push("/")} aria-label="Indietro" style={{ background: "none", border: 0, color: "var(--k-text)", fontSize: 26, lineHeight: 1, cursor: "pointer", padding: 0, width: 28 }}>‹</button>
        <h1 className="ds-display" style={{ flex: 1, fontSize: 22, color: "var(--k-text)", margin: 0 }}>Da guardare</h1>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--k-text-3)" }}>{count} {count === 1 ? "titolo" : "titoli"}</span>
      </div>

      {/* hero — Stasera per te */}
      {hero && (
        <div onClick={() => dove(hero)} style={{ display: "flex", gap: 14, marginTop: 18, padding: 12, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 18, cursor: "pointer" }}>
          <div style={{ width: 92, flex: "none", aspectRatio: "2 / 3", borderRadius: 12, overflow: "hidden", background: "var(--k-cat-film, #2a2140)" }}>
            {hero.poster && <img src={hero.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-accent)" }}>Stasera per te</span>
            <b style={{ fontSize: 17, fontWeight: 600, color: "var(--k-text)", margin: "4px 0 2px", lineHeight: 1.15 }}>{hero.title}</b>
            <small style={{ fontSize: 12.5, color: "var(--k-text-3)" }}>{hero.info ?? kindLabel(hero.kind)}</small>
            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10 }}>
              <button onClick={(e) => { e.stopPropagation(); toggleSeen(hero); }} className="ds-btn" style={{ height: 36, padding: "0 12px", fontSize: 13 }}>✓ Visto</button>
              <button onClick={(e) => { e.stopPropagation(); dove(hero); }} className="ds-btn primary" style={{ height: 36, padding: "0 12px", fontSize: 13 }}>▶ Dove vederlo</button>
            </div>
          </div>
        </div>
      )}

      {/* La lista */}
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", margin: "28px 2px 14px", color: "var(--k-text-3)" }}>La lista</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {grid.map((item) => (
          <div key={item.id} onClick={() => toggleSeen(item)} style={{ position: "relative", cursor: "pointer", opacity: item.seen ? 0.5 : 1 }}>
            <div style={{ position: "relative", aspectRatio: "2 / 3", borderRadius: 12, overflow: "hidden", background: "linear-gradient(150deg,#3a2f52,#1a1526)", border: "1px solid rgba(255,255,255,.08)" }}>
              {item.poster
                ? <img src={item.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ position: "absolute", inset: 0, padding: 8, display: "flex", alignItems: "flex-end", fontSize: 12, fontWeight: 600, color: "var(--k-text-2)" }}>{item.title}</span>}
              {item.seen && <div style={{ position: "absolute", top: 6, left: 6, fontSize: 15 }}>✅</div>}
              <button onClick={(e) => { e.stopPropagation(); elimina(item, list.indexOf(item)); }} aria-label="Elimina" style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(6,8,12,.6)", color: "#fff", fontSize: 11, fontWeight: 800, border: 0, display: "grid", placeItems: "center", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--k-text-2)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
          </div>
        ))}
      </div>

      {/* Aggiungi / Consiglio */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <button onClick={() => openAsk("add")} style={{ textAlign: "left", background: "transparent", border: "1px dashed var(--k-line)", borderRadius: 14, padding: "14px 16px", color: "var(--k-text-2)", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--k-text)" }}>＋ Aggiungi un titolo</span><br />
          <span style={{ fontSize: 12.5, color: "var(--k-text-3)" }}>anche solo «quel film di Nolan»</span>
        </button>
        <button onClick={() => openAsk("suggest")} style={{ textAlign: "left", background: "transparent", border: "1px dashed var(--k-line)", borderRadius: 14, padding: "14px 16px", color: "var(--k-text-2)", cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--k-text)" }}>✨ Consiglio di Keiko</span><br />
          <span style={{ fontSize: 12.5, color: "var(--k-text-3)" }}>in base alla tua serata</span>
        </button>
      </div>

      {/* foglio input (Aggiungi / Consiglio) — niente prompt() nativi */}
      {ask && (
        <div onClick={() => { if (!thinking) setAsk(null); }} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px calc(env(safe-area-inset-bottom) + 22px)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--k-text)", margin: "0 0 6px" }}>{ask === "add" ? "Aggiungi un titolo" : "✨ Consiglio di Keiko"}</h3>
            <p style={{ fontSize: 13, color: "var(--k-text-3)", margin: "0 0 14px" }}>{ask === "add" ? "Scrivi un titolo — anche solo «quel film di Nolan»" : "Che serata è? es. «commedia leggera», «thriller» (vuoto = a sorpresa)"}</p>
            {thinking ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 4px", color: "var(--k-text-2)", fontSize: 14 }}>
                <span className="ds-spin" style={{ width: 18, height: 18, border: "2px solid var(--k-line)", borderTopColor: "var(--k-accent)", borderRadius: "50%", display: "inline-block" }} />
                Keiko sta pensando…
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input autoFocus value={askText} onChange={(e) => setAskText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitAsk(); }} placeholder={ask === "add" ? "Titolo…" : "Tipo di serata…"} style={{ flex: 1, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 14, fontFamily: "inherit", outline: 0 }} />
                <button onClick={submitAsk} disabled={ask === "add" && !askText.trim()} className="ds-btn primary" style={{ height: 44, padding: "0 18px", opacity: ask === "add" && !askText.trim() ? 0.4 : 1 }}>{ask === "add" ? "Aggiungi" : "Chiedi"}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: "calc(96px + env(safe-area-inset-bottom))", maxWidth: 408, margin: "0 auto", zIndex: 40, display: "flex", alignItems: "center", gap: 12, background: "var(--k-surface-2)", border: "1px solid var(--k-line)", borderRadius: 14, padding: "12px 14px", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
          <span style={{ flex: 1, fontSize: 14, color: "var(--k-text)" }}>{toast.msg}</span>
          {toast.action && <button onClick={() => { toast.onAction?.(); setToast(null); }} style={{ background: "none", border: 0, color: "var(--k-accent)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{toast.action}</button>}
        </div>
      )}

      <KeikoNav active="guarda" />
    </div>
  );
}
