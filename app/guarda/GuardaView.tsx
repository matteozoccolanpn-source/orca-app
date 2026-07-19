"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { WatchItem } from "@/lib/supabase";
import type { WatchProviders, WatchProvider, TitleDetails, SimilarTitle } from "@/lib/tmdb";
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

// "Dove vederlo" diretto nel servizio: costruisce un URL di ricerca per titolo
// sulla piattaforma giusta. Su mobile con l'app installata i link universali
// aprono spesso l'app nativa; dove non è possibile resta la pagina web. null →
// nessun link noto (il chiamante ripiega su TMDB/JustWatch).
function platformUrl(name: string, title: string): string | null {
  const q = encodeURIComponent(title);
  const n = name.toLowerCase();
  if (n.includes("netflix")) return `https://www.netflix.com/search?q=${q}`;
  if (n.includes("prime") || n.includes("amazon")) return `https://www.primevideo.com/search?phrase=${q}`;
  if (n.includes("disney")) return `https://www.disneyplus.com/search?q=${q}`;
  if (n.includes("apple")) return `https://tv.apple.com/search?term=${q}`;
  if (n.includes("now") || n.includes("sky")) return `https://www.nowtv.it/`;
  if (n.includes("rai")) return `https://www.raiplay.it/ricerca.html?q=${q}`;
  if (n.includes("mediaset") || n.includes("infinity")) return `https://mediasetinfinity.mediaset.it/ricerca?q=${q}`;
  if (n.includes("paramount")) return `https://www.paramountplus.com/`;
  if (n.includes("timvision")) return `https://www.timvision.it/`;
  if (n.includes("google")) return `https://play.google.com/store/search?q=${q}&c=movies`;
  return null;
}

export default function GuardaView({ items }: { items: WatchItem[] }) {
  const router = useRouter();
  const [list, setList] = useState<WatchItem[]>(items);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const busy = useRef(false);

  const [toast, setToast] = useState<ToastState>(null);
  const [ask, setAsk] = useState<null | "add" | "suggest">(null); // foglio input (niente prompt nativi)
  const [askText, setAskText] = useState("");
  const [searching, setSearching] = useState(false);      // "Consiglio" che lavora in background
  const [suggestReady, setSuggestReady] = useState<Pick[] | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [dovItem, setDovItem] = useState<WatchItem | null>(null); // foglio "Dove vederlo"
  const [dovLoading, setDovLoading] = useState(false);
  const [dovData, setDovData] = useState<WatchProviders | null>(null);
  const [detItem, setDetItem] = useState<WatchItem | null>(null); // foglio scheda film/serie
  const [detLoading, setDetLoading] = useState(false);
  const [detData, setDetData] = useState<TitleDetails | null>(null);
  const [detExpanded, setDetExpanded] = useState(false);
  const [detRating, setDetRating] = useState(0);   // voto in modifica (orche)
  const [detNote, setDetNote] = useState("");
  const [detSimilar, setDetSimilar] = useState<SimilarTitle[]>([]);
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

  // "Dove vederlo" (G3): apre un foglietto con le PIATTAFORME italiane vere
  // (TMDB watch providers IT). Se TMDB non trova nulla → ripiego JustWatch.
  function justwatch(item: WatchItem) {
    const url = item.link || `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(item.title)}`;
    window.open(url, "_blank", "noopener");
  }
  async function openDove(item: WatchItem) {
    setDovItem(item);
    setDovData(null);
    setDovLoading(true);
    try {
      const res = await fetchWithTimeout(`/api/watch/providers?title=${encodeURIComponent(item.title)}&kind=${encodeURIComponent(item.kind)}`, { credentials: "include" }, 12000);
      const data = (await res.json()) as { providers: WatchProviders | null };
      setDovData(res.ok ? data.providers ?? null : null);
    } catch {
      setDovData(null);
    } finally {
      setDovLoading(false);
    }
  }

  async function saveReview(item: WatchItem, rating: number, note: string) {
    const r = rating || null;
    const nt = note.trim() || null;
    setList((l) => l.map((i) => (i.id === item.id ? { ...i, rating: r, note: nt } : i)));
    setDetItem((cur) => (cur && cur.id === item.id ? { ...cur, rating: r, note: nt } : cur));
    try {
      const res = await fetch("/api/watch", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ id: item.id, rating: r, note: nt }) });
      if (!res.ok) throw new Error();
    } catch { showToast("Voto non salvato, riprovo"); }
  }

  async function openDetail(item: WatchItem) {
    setDetItem(item);
    setDetData(null);
    setDetExpanded(false);
    setDetRating(item.rating ?? 0);
    setDetNote(item.note ?? "");
    setDetLoading(true);
    setDetSimilar([]);
    fetch(`/api/watch/similar?title=${encodeURIComponent(item.title)}&kind=${encodeURIComponent(item.kind)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setDetSimilar((d?.similar ?? []) as SimilarTitle[]))
      .catch(() => {});
    try {
      const res = await fetchWithTimeout(`/api/watch/details?title=${encodeURIComponent(item.title)}&kind=${encodeURIComponent(item.kind)}`, { credentials: "include" }, 12000);
      const data = (await res.json()) as { details: TitleDetails | null };
      setDetData(res.ok ? data.details ?? null : null);
    } catch {
      setDetData(null);
    } finally {
      setDetLoading(false);
    }
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
    setSearching(true);
    setSuggestReady(null);
    try {
      const res = await fetchWithTimeout("/api/watch/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ query: q }) }, 20000);
      const data = (await res.json()) as { films?: Pick[] };
      if (!res.ok) throw new Error();
      const picks = (data.films ?? []).slice(0, 3);
      if (!picks.length) { showToast("Non ho trovato niente di convincente, riformula"); return; }
      setSuggestReady(picks); // appare il pop-up in basso a destra; nessun blocco
    } catch (e) {
      showToast(e instanceof Error && e.name === "AbortError" ? "Ci ho messo troppo, riprova 🙏" : "Qualcosa non torna, riprovo");
    } finally { busy.current = false; setSearching(false); }
  }

  // apre il foglio input al posto delle finestre prompt() native
  function openAsk(mode: "add" | "suggest") { setAskText(""); setAsk(mode); }
  async function submitAsk() {
    if (ask === "add") { await doAdd(askText); setAsk(null); }
    else if (ask === "suggest") { const q = askText; setAsk(null); doSuggest(q); }
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

  // Suggerimento "Stasera per te" a rotazione: un titolo (non visto) diverso a
  // ogni apertura. Default 0 lato server (niente mismatch), poi randomizza al mount.
  const [suggN, setSuggN] = useState(0);
  useEffect(() => {
    const u = list.filter((i) => !i.seen);
    if (u.length > 1) setSuggN(Math.floor(Math.random() * u.length));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const unseen = list.filter((i) => !i.seen);
  const hero = unseen.length ? unseen[suggN % unseen.length] : null;
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
        <div onClick={() => openDetail(hero)} style={{ display: "flex", gap: 14, marginTop: 18, padding: 12, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 18, cursor: "pointer" }}>
          <div style={{ width: 92, flex: "none", aspectRatio: "2 / 3", borderRadius: 12, overflow: "hidden", background: "var(--k-cat-film, #2a2140)" }}>
            {hero.poster && <img src={hero.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-accent)" }}>Stasera per te</span>
            <b style={{ fontSize: 17, fontWeight: 600, color: "var(--k-text)", margin: "4px 0 2px", lineHeight: 1.15 }}>{hero.title}</b>
            <small style={{ fontSize: 12.5, color: "var(--k-text-3)" }}>{hero.info ?? kindLabel(hero.kind)}</small>
            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10 }}>
              <button onClick={(e) => { e.stopPropagation(); toggleSeen(hero); }} className="ds-btn" style={{ height: 36, padding: "0 12px", fontSize: 13 }}>✓ Visto</button>
              <button onClick={(e) => { e.stopPropagation(); openDove(hero); }} className="ds-btn primary" style={{ height: 36, padding: "0 12px", fontSize: 13 }}>▶ Dove vederlo</button>
            </div>
          </div>
        </div>
      )}

      {/* Da vedere → Visti di recente → Categorie per genere (tutto). Solo sezioni con roba dentro. */}
      {(() => {
        const daVedere = grid.filter((i) => !i.seen); // "grid" esclude gia' l'hero
        const seenList = list.filter((i) => i.seen).slice().sort((a, b) => (b.seen_at ?? "").localeCompare(a.seen_at ?? ""));
        // categorie per genere su TUTTO (visti + non visti); i visti restano riconoscibili dal badge ✅
        const byGenre = new Map<string, WatchItem[]>();
        for (const it of list) {
          const g = it.genre || "Altro";
          const arr = byGenre.get(g) ?? [];
          arr.push(it);
          byGenre.set(g, arr);
        }
        const genres = [...byGenre.entries()].sort((a, b) => b[1].length - a[1].length);
        const H2: CSSProperties = { fontSize: 13, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", margin: "28px 2px 14px", color: "var(--k-text-3)" };
        const CNT: CSSProperties = { fontWeight: 600, fontSize: 12.5, color: "var(--k-text-3)" };
        const GRID: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 };
        const card = (item: WatchItem) => (
          <div key={item.id} onClick={() => toggleSeen(item)} style={{ position: "relative", cursor: "pointer" }}>
            <div style={{ position: "relative", aspectRatio: "2 / 3", borderRadius: 12, overflow: "hidden", background: "linear-gradient(150deg,#3a2f52,#1a1526)", border: "1px solid rgba(255,255,255,.08)" }}>
              {item.poster
                ? <><span className="ds-skel" aria-hidden /><img src={item.poster} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /></>
                : <span style={{ position: "absolute", inset: 0, padding: 8, display: "flex", alignItems: "flex-end", fontSize: 12, fontWeight: 600, color: "var(--k-text-2)" }}>{item.title}</span>}
              {item.seen && <div style={{ position: "absolute", top: 6, left: 6, fontSize: 15 }}>✅</div>}
              <button onClick={(e) => { e.stopPropagation(); elimina(item, list.indexOf(item)); }} aria-label="Elimina" style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(6,8,12,.6)", color: "#fff", fontSize: 11, fontWeight: 800, border: 0, display: "grid", placeItems: "center", cursor: "pointer" }}>✕</button>
              <button onClick={(e) => { e.stopPropagation(); openDetail(item); }} aria-label="Dettagli" style={{ position: "absolute", bottom: 6, left: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(6,8,12,.6)", color: "#fff", fontSize: 12, fontWeight: 800, border: 0, display: "grid", placeItems: "center", cursor: "pointer" }}>ⓘ</button>
              {item.rating ? <div style={{ position: "absolute", bottom: 6, right: 6, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(6,8,12,.62)", borderRadius: 999, padding: "2px 6px" }}>🐋 {item.rating}</div> : null}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--k-text-2)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
          </div>
        );
        return (
          <>
            {daVedere.length > 0 && (
              <div>
                <h2 style={H2}>Da vedere <span style={CNT}>· {daVedere.length}</span></h2>
                <div style={GRID}>{daVedere.map(card)}</div>
              </div>
            )}
            {seenList.length > 0 && (
              <div>
                <h2 style={H2}>Visti di recente <span style={CNT}>· {seenList.length}</span></h2>
                <div style={GRID}>{seenList.map(card)}</div>
              </div>
            )}
            {genres.map(([g, items]) => (
              <div key={g}>
                <h2 style={H2}>{g} <span style={CNT}>· {items.length}</span></h2>
                <div style={GRID}>{items.map(card)}</div>
              </div>
            ))}
          </>
        );
      })()}

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
        <div onClick={() => setAsk(null)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px calc(env(safe-area-inset-bottom) + 22px)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--k-text)", margin: "0 0 6px" }}>{ask === "add" ? "Aggiungi un titolo" : "✨ Consiglio di Keiko"}</h3>
            <p style={{ fontSize: 13, color: "var(--k-text-3)", margin: "0 0 14px" }}>{ask === "add" ? "Scrivi un titolo — anche solo «quel film di Nolan»" : "Che serata è? es. «commedia leggera», «thriller» (vuoto = a sorpresa)"}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus value={askText} onChange={(e) => setAskText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitAsk(); }} placeholder={ask === "add" ? "Titolo…" : "Tipo di serata…"} style={{ flex: 1, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 14, fontFamily: "inherit", outline: 0 }} />
              <button onClick={submitAsk} disabled={ask === "add" && !askText.trim()} className="ds-btn primary" style={{ height: 44, padding: "0 18px", opacity: ask === "add" && !askText.trim() ? 0.4 : 1 }}>{ask === "add" ? "Aggiungi" : "Chiedi"}</button>
            </div>
          </div>
        </div>
      )}

      {/* foglio scheda film/serie — trama, anno, generi, cast (TMDB) */}
      {detItem && (
        <div onClick={() => setDetItem(null)} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, margin: "0 auto", maxHeight: "86vh", overflowY: "auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px calc(env(safe-area-inset-bottom) + 22px)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ width: 84, flex: "none", aspectRatio: "2 / 3", borderRadius: 12, overflow: "hidden", background: "var(--k-cat-film, #2a2140)" }}>
                {detItem.poster && <img src={detItem.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 18, fontWeight: 600, color: "var(--k-text)", lineHeight: 1.15, display: "block" }}>{detItem.title}</b>
                <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 6 }}>
                  {[detData ? (detData.kind === "serie" ? "Serie" : "Film") : kindLabel(detItem.kind), detData?.year].filter(Boolean).join(" · ")}
                </div>
                {detData && detData.genres.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {detData.genres.map((g) => (
                      <span key={g} style={{ fontSize: 11, fontWeight: 600, color: "var(--k-text-2)", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "3px 9px" }}>{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {detLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 4px", color: "var(--k-text-2)", fontSize: 14 }}>
                <span className="ds-spin" style={{ width: 18, height: 18, border: "2px solid var(--k-line)", borderTopColor: "var(--k-accent)", borderRadius: "50%", display: "inline-block" }} />
                Carico la scheda…
              </div>
            ) : (
              <>
                {detData?.overview ? (
                  <div onClick={() => setDetExpanded((v) => !v)} style={{ marginTop: 16, cursor: "pointer" }}>
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--k-text-2)", margin: "0 0 4px", display: "-webkit-box", WebkitLineClamp: detExpanded ? undefined : 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{detData.overview}</p>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--k-accent)" }}>{detExpanded ? "Comprimi" : "Leggi tutto"}</span>
                  </div>
                ) : (
                  <p style={{ marginTop: 16, fontSize: 13.5, color: "var(--k-text-3)" }}>Trama non disponibile.</p>
                )}

                {detData && detData.cast.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 0 6px" }}>Cast</div>
                    <div style={{ fontSize: 13.5, color: "var(--k-text-2)", lineHeight: 1.4 }}>{detData.cast.join(", ")}</div>
                  </div>
                )}

                {detSimilar.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 0 8px" }}>Simili · tocca per aggiungere</div>
                    <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -20px", padding: "0 20px 4px" }}>
                      {detSimilar.map((s) => (
                        <button key={s.title} onClick={() => doAdd(s.title)} style={{ flex: "none", width: 84, background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                          <div style={{ width: 84, aspectRatio: "2 / 3", borderRadius: 10, overflow: "hidden", background: "linear-gradient(150deg,#3a2f52,#1a1526)", position: "relative" }}>
                            {s.poster && <img src={s.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                            <span style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "var(--k-accent)", color: "var(--k-accent-ink)", fontSize: 14, fontWeight: 800, display: "grid", placeItems: "center" }}>+</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--k-text-2)", marginTop: 5, lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{s.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 0 8px" }}>Il tuo voto</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((nn) => (
                      <button key={nn} onClick={() => { setDetRating(nn); saveReview(detItem, nn, detNote); }} aria-label={`${nn} su 5`} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 24, lineHeight: 1, padding: "2px 3px", filter: nn <= detRating ? "none" : "grayscale(1)", opacity: nn <= detRating ? 1 : 0.3 }}>🐋</button>
                    ))}
                    {detRating > 0 && <button onClick={() => { setDetRating(0); saveReview(detItem, 0, detNote); }} style={{ background: "none", border: 0, color: "var(--k-text-3)", fontSize: 12, cursor: "pointer", marginLeft: 8 }}>azzera</button>}
                  </div>
                  <textarea value={detNote} onChange={(e) => setDetNote(e.target.value)} placeholder="Una nota sui tuoi gusti… (facoltativa)" rows={2} style={{ width: "100%", marginTop: 10, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "10px 12px", color: "var(--k-text)", fontSize: 14, fontFamily: "inherit", outline: 0, resize: "vertical", boxSizing: "border-box" }} />
                  <button onClick={() => saveReview(detItem, detRating, detNote)} className="ds-btn" style={{ height: 38, padding: "0 14px", marginTop: 8, fontSize: 13 }}>Salva nota</button>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={() => { toggleSeen(detItem); setDetItem(null); }} className="ds-btn" style={{ flex: 1, height: 46 }}>{detItem.seen ? "↩︎ In lista" : "✓ Visto"}</button>
                  <button onClick={() => { const it = detItem; setDetItem(null); openDove(it); }} className="ds-btn primary" style={{ flex: 1, height: 46 }}>▶ Dove vederlo</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* foglio "Dove vederlo" — piattaforme italiane reali (TMDB) */}
      {dovItem && (
        <div onClick={() => setDovItem(null)} style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px calc(env(safe-area-inset-bottom) + 22px)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--k-text)", margin: "0 0 14px" }}>Dove vedere «{dovItem.title}»</h3>
            {dovLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 4px", color: "var(--k-text-2)", fontSize: 14 }}>
                <span className="ds-spin" style={{ width: 18, height: 18, border: "2px solid var(--k-line)", borderTopColor: "var(--k-accent)", borderRadius: "50%", display: "inline-block" }} />
                Cerco le piattaforme…
              </div>
            ) : (() => {
              const flat = dovData?.flatrate ?? [];
              const paid = [...(dovData?.rent ?? []), ...(dovData?.buy ?? [])].filter((p, i, a) => a.findIndex((x) => x.name === p.name) === i);
              if (flat.length === 0 && paid.length === 0) {
                return (
                  <>
                    <p style={{ fontSize: 13.5, color: "var(--k-text-3)", margin: "0 0 14px" }}>Non risulta in streaming in Italia in questo momento.</p>
                    <button onClick={() => { justwatch(dovItem); setDovItem(null); }} className="ds-btn primary" style={{ width: "100%", height: 46 }}>Cerca su JustWatch ▸</button>
                  </>
                );
              }
              const groups = [
                flat.length ? { label: "In abbonamento", ps: flat } : null,
                paid.length ? { label: "Noleggio / acquisto", ps: paid } : null,
              ].filter(Boolean) as { label: string; ps: WatchProvider[] }[];
              return (
                <>
                  {groups.map((g) => (
                    <div key={g.label} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 0 8px" }}>{g.label}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {g.ps.map((p) => (
                          <button key={p.name} onClick={() => { const u = platformUrl(p.name, dovItem.title) || dovData?.link || `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(dovItem.title)}`; window.open(u, "_blank", "noopener"); }} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "6px 12px 6px 6px", cursor: "pointer", fontFamily: "inherit" }}>
                            {p.logo ? <img src={p.logo} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} /> : <span style={{ width: 24, height: 24, borderRadius: 6, background: "var(--k-line)", display: "inline-block" }} />}
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--k-text)" }}>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { const u = dovData?.link; window.open(u || `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(dovItem.title)}`, "_blank", "noopener"); setDovItem(null); }} className="ds-btn primary" style={{ width: "100%", height: 46, marginTop: 4 }}>Altre opzioni ▸</button>
                  <p style={{ fontSize: 11, color: "var(--k-text-3)", textAlign: "center", margin: "10px 0 0" }}>Dati TMDB · disponibilità Italia</p>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Consiglio Keiko: pillola in basso a destra (cerca in background → pronti) */}
      {(searching || (suggestReady && !suggestOpen)) && (
        <button
          onClick={() => { if (suggestReady) setSuggestOpen(true); }}
          disabled={searching}
          style={{ position: "fixed", right: 16, bottom: "calc(100px + env(safe-area-inset-bottom))", zIndex: 45, display: "flex", alignItems: "center", gap: 8, background: "var(--k-accent)", color: "var(--k-accent-ink)", border: 0, borderRadius: 999, padding: "11px 16px", fontSize: 13.5, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,.45)", cursor: searching ? "default" : "pointer" }}
        >
          {searching
            ? <><span className="ds-spin" style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,.25)", borderTopColor: "var(--k-accent-ink)", borderRadius: "50%", display: "inline-block" }} /> Keiko cerca…</>
            : <>✨ {suggestReady?.length ?? 0} consigli pronti</>}
        </button>
      )}

      {/* Pannello 3 opzioni — chiudendo NON lascia rimasugli (pulisce lo stato) */}
      {suggestOpen && suggestReady && (
        <div onClick={() => { setSuggestOpen(false); setSuggestReady(null); }} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px calc(env(safe-area-inset-bottom) + 22px)" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--k-text)", margin: "0 0 4px" }}>✨ Consigli di Keiko</h3>
            <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "0 0 14px" }}>Scegli cosa aggiungere alla lista.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {suggestReady.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--k-text)" }}>{p.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2 }}>{[p.kind === "serie" ? "Serie" : "Film", p.info, p.platform ? `su ${p.platform}` : null].filter(Boolean).join(" · ")}</div>
                  </div>
                  <button onClick={() => { salvaPick(p); const rest = suggestReady.filter((_, j) => j !== i); if (rest.length) setSuggestReady(rest); else { setSuggestReady(null); setSuggestOpen(false); } }} className="ds-btn primary" style={{ height: 38, padding: "0 14px", fontSize: 13, flex: "none" }}>Aggiungi</button>
                </div>
              ))}
            </div>
            <button onClick={() => { setSuggestOpen(false); setSuggestReady(null); }} className="ds-btn" style={{ width: "100%", height: 44, marginTop: 16 }}>Chiudi</button>
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
