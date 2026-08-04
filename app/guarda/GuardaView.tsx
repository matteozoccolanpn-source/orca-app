"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { WatchItem } from "@/lib/supabase";
import type { WatchProviders, WatchProvider, TitleDetails, SimilarTitle } from "@/lib/tmdb";
import KeikoNav, { PAGE_PB } from "@/app/components/keiko/KeikoNav";
import SheetShell from "@/app/components/keiko/SheetShell";
import { useSuggest } from "@/app/components/keiko/SuggestProvider";

/* Sezione "Da guardare" — solo presentazione: la logica è quella di prima
   (visto via PATCH, elimina differito con Annulla, aggiunta via POST, consiglio
   AI, fogli scheda e "dove vederlo").

   Cosa cambia, e perché:

   · IL TAP APRE LA SCHEDA. Prima segnava "visto": l'azione più difficile da
     annullare stava sul gesto più facile da sbagliare.
   · Il tocco lungo (450ms + vibrazione) apre il menu azioni. Da lì passano
     "visto", "dove vederlo" ed "elimina".
   · Via i due bottoncini ✕ e ⓘ dalla locandina: erano 22px, e la ✕ eliminava
     a 6px dal bordo. Ogni bersaglio ora è almeno 44×44.
   · UNA griglia sola con filtri, al posto di tre sezioni sovrapposte. Prima lo
     stesso titolo compariva due o tre volte scorrendo (in "Da vedere", in
     "Visti di recente" e di nuovo nella sua categoria di genere): il genere
     adesso è un filtro, non una sezione che ripete le stesse locandine. */

type ToastState = { msg: string; action?: string; onAction?: () => void } | null;
/* Una riga della ricerca trasversale. La calcola il server (/api/watch/search),
   che sa già quali abbonamenti ha l'utente. */
type Ricerca = {
  tmdbId: number; tmdbType: "movie" | "tv"; title: string; year: string | null; poster: string | null;
  flatrate: string[]; rent: string[]; buy: string[]; tue: string[];
};
type Scheda = "da-vedere" | "visti" | "tutti";
type Tipo = "tutti" | "film" | "serie";
type Ordine = "recenti" | "alfabetico" | "voto";

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
  const suggest = useSuggest();
  const [list, setList] = useState<WatchItem[]>(items);
  useEffect(() => setList(items), [items]); // ri-sincronizza dopo router.refresh (es. titolo aggiunto dai consigli)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [toast, setToast] = useState<ToastState>(null);
  const [search, setSearch] = useState("");
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

  // vista: scheda in alto + filtri del foglietto
  const [scheda, setScheda] = useState<Scheda>("da-vedere");
  const [filtriOpen, setFiltriOpen] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("tutti");
  const [genere, setGenere] = useState<string | null>(null);
  const [ordine, setOrdine] = useState<Ordine>("recenti");

  // menu del tocco lungo
  const [menuItem, setMenuItem] = useState<WatchItem | null>(null);

  // ricerca trasversale: cerca una volta e dice dove si vede
  const [ric, setRic] = useState<Ricerca[]>([]);
  const [ricLoading, setRicLoading] = useState(false);
  const [haScelto, setHaScelto] = useState(true);   // true finché non si sa: niente inviti a vuoto
  const [invitoChiuso, setInvitoChiuso] = useState(false);
  const [aggiunti, setAggiunti] = useState<number[]>([]);

  // tira-per-aggiornare
  const [tiro, setTiro] = useState(0);          // quanto è stato tirato, in px
  const [aggiorno, setAggiorno] = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function showToast(msg: string, action?: string, onAction?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, action, onAction });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }

  async function toggleSeen(item: WatchItem) {
    const next = !item.seen;
    setList((l) => l.map((i) => (i.id === item.id ? { ...i, seen: next } : i)));
    // "Com'era?" era una domanda senza risposta possibile: ora il toast porta
    // il voto, che è la risposta.
    if (next) showToast("Visto ✓ Com'era?", "Vota", () => openDetail({ ...item, seen: true }));
    else showToast("Ok, resta in lista");
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
    setMenuItem(null);
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

  // ── Ricerca trasversale ───────────────────────────────────────────────────
  // Si aspettano 350ms dall'ultimo tasto: chi scrive "interstellar" non fa
  // dodici ricerche. La richiesta precedente viene annullata.
  const ricAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setRic([]); setRicLoading(false); ricAbort.current?.abort(); return; }
    const t = setTimeout(async () => {
      ricAbort.current?.abort();
      const ctrl = new AbortController();
      ricAbort.current = ctrl;
      setRicLoading(true);
      try {
        const res = await fetch(`/api/watch/search?q=${encodeURIComponent(q)}`, { credentials: "include", signal: ctrl.signal });
        const d = await res.json();
        setRic((d?.risultati ?? []) as Ricerca[]);
        setHaScelto(d?.haScelto !== false);
      } catch {
        /* annullata o fallita: si tiene quello che c'è */
      } finally {
        if (!ctrl.signal.aborted) setRicLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  /* La riga della disponibilità. Nessun prezzo scritto a mano: TMDB non manda
     i prezzi, quindi si dice "a noleggio" e basta, mai una cifra. */
  function disponibilita(r: Ricerca): { segno: string; testo: string; forte: boolean } {
    if (r.tue.length) return { segno: "✅", testo: `Ce l'hai su ${r.tue.join(", ")}`, forte: true };
    if (r.flatrate.length) return { segno: "🟡", testo: `C'è su ${r.flatrate.slice(0, 3).join(", ")}`, forte: false };
    if (r.rent.length || r.buy.length) return { segno: "💶", testo: "Solo a noleggio", forte: false };
    return { segno: "✗", testo: "Non in streaming in Italia", forte: false };
  }

  async function aggiungiDaRicerca(r: Ricerca) {
    setAggiunti((a) => [...a, r.tmdbId]);
    try {
      const res = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // l'id viaggia col titolo: il server non lo cerca una seconda volta
        body: JSON.stringify({ title: r.title, kind: r.tmdbType === "tv" ? "serie" : "film", tmdbId: r.tmdbId, tmdbType: r.tmdbType }),
      });
      const data = (await res.json()) as { item?: WatchItem };
      if (!res.ok || !data.item) throw new Error();
      setList((l) => [data.item!, ...l]);
      showToast("Preso in carico ✓");
    } catch {
      setAggiunti((a) => a.filter((x) => x !== r.tmdbId));
      showToast("Qualcosa non torna, riprovo");
    }
  }

  // ── Tocco lungo ───────────────────────────────────────────────────────────
  // 450ms fermi sulla locandina aprono il menu. Il dito che si sposta annulla
  // (stava scorrendo), e il click che arriva dopo va soffocato, altrimenti si
  // aprirebbe anche la scheda.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressPos = useRef<{ x: number; y: number } | null>(null);
  const pressFired = useRef(false);

  function pressStart(e: React.PointerEvent, item: WatchItem) {
    pressFired.current = false;
    pressPos.current = { x: e.clientX, y: e.clientY };
    pressTimer.current = setTimeout(() => {
      pressFired.current = true;
      try { navigator.vibrate?.(12); } catch { /* niente vibrazione: pazienza */ }
      setMenuItem(item);
    }, 450);
  }
  function pressMove(e: React.PointerEvent) {
    if (!pressTimer.current || !pressPos.current) return;
    const d = Math.hypot(e.clientX - pressPos.current.x, e.clientY - pressPos.current.y);
    if (d > 10) pressCancel();          // sta scorrendo, non tenendo premuto
  }
  function pressCancel() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  // ── Tira per aggiornare ───────────────────────────────────────────────────
  const tiroDa = useRef<number | null>(null);
  function tiroStart(e: React.TouchEvent) {
    if (window.scrollY > 0 || aggiorno) return;
    tiroDa.current = e.touches[0].clientY;
  }
  function tiroMove(e: React.TouchEvent) {
    if (tiroDa.current === null) return;
    const d = e.touches[0].clientY - tiroDa.current;
    setTiro(d > 0 ? Math.min(d * 0.5, 90) : 0);   // resistenza: non segue il dito 1:1
  }
  function tiroEnd() {
    if (tiroDa.current === null) return;
    const basta = tiro > 56;
    tiroDa.current = null;
    setTiro(0);
    if (basta) {
      setAggiorno(true);
      router.refresh();
      showToast("🐋 Tutto fresco di giornata");
      setTimeout(() => setAggiorno(false), 1200);
    }
  }

  // ── Che cosa mostrare ─────────────────────────────────────────────────────
  const generi = useMemo(
    () => [...new Set(list.map((i) => i.genre).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "it")),
    [list]
  );

  const q = search.trim().toLowerCase();
  const filtrati = useMemo(() => {
    let out = list.filter((i) => (!q || i.title.toLowerCase().includes(q)));
    if (scheda === "da-vedere") out = out.filter((i) => !i.seen);
    else if (scheda === "visti") out = out.filter((i) => i.seen);
    if (tipo !== "tutti") out = out.filter((i) => (i.kind === "serie" ? "serie" : "film") === tipo);
    if (genere) out = out.filter((i) => i.genre === genere);
    if (ordine === "alfabetico") out = [...out].sort((a, b) => a.title.localeCompare(b.title, "it"));
    else if (ordine === "voto") out = [...out].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    return out;
  }, [list, q, scheda, tipo, genere, ordine]);

  // Suggerimento "Stasera per te" a rotazione: un titolo (non visto) diverso a
  // ogni apertura. Default 0 lato server (niente mismatch), poi randomizza al mount.
  const [suggN, setSuggN] = useState(0);
  useEffect(() => {
    const u = list.filter((i) => !i.seen);
    if (u.length > 1) setSuggN(Math.floor(Math.random() * u.length));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const unseen = list.filter((i) => !i.seen);
  const heroAttivo = scheda === "da-vedere" && !q;
  const hero = heroAttivo && unseen.length ? unseen[suggN % unseen.length] : null;
  const griglia = hero ? filtrati.filter((i) => i.id !== hero.id) : filtrati;
  const count = list.length;
  const filtriAttivi = (tipo !== "tutti" ? 1 : 0) + (genere ? 1 : 0) + (ordine !== "recenti" ? 1 : 0);

  // ── stili condivisi ───────────────────────────────────────────────────────
  // minmax(0,1fr) e non 1fr: il titolo sotto la locandina è su una riga sola
  // (nowrap), e con 1fr la sua larghezza minima allargherebbe la colonna
  // facendo straripare la griglia fuori dallo schermo.
  const GRID: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 16 };
  const POSTER: CSSProperties = { position: "relative", aspectRatio: "2 / 3", borderRadius: 12, overflow: "hidden", background: "linear-gradient(150deg,#3a2f52,#1a1526)", border: "1px solid rgba(255,255,255,.08)" };
  const SOTTO: CSSProperties = { fontSize: 11.5, color: "var(--k-text-2)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const ETICHETTA: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 0 8px" };

  const card = (item: WatchItem) => (
    <div
      key={item.id}
      onClick={() => { if (pressFired.current) { pressFired.current = false; return; } openDetail(item); }}
      onPointerDown={(e) => pressStart(e, item)}
      onPointerMove={pressMove}
      onPointerUp={pressCancel}
      onPointerLeave={pressCancel}
      onPointerCancel={pressCancel}
      onContextMenu={(e) => e.preventDefault()}   // niente menu di sistema sul tocco lungo
      role="button"
      aria-label={item.title}
      style={{ position: "relative", cursor: "pointer", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
    >
      <div style={POSTER}>
        {item.poster
          ? <><span className="ds-skel" aria-hidden /><img src={item.poster} alt="" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /></>
          : <span style={{ position: "absolute", inset: 0, padding: 8, display: "flex", alignItems: "flex-end", fontSize: 12, fontWeight: 600, color: "var(--k-text-2)" }}>{item.title}</span>}

        {/* visto: velo + spunta grande al centro, non l'emoji in un angolo */}
        {item.seen && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(6,8,12,.62)", display: "grid", placeItems: "center", color: "var(--k-text)", fontSize: 34, fontWeight: 300 }}>✓</div>
        )}

        {/* pastiglia solo per le serie: i film sono la maggioranza, non serve dirlo */}
        {item.kind === "serie" && (
          <span style={{ position: "absolute", top: 6, left: 6, fontSize: 9.5, fontWeight: 700, letterSpacing: ".3px", color: "var(--k-text)", background: "rgba(6,8,12,.66)", borderRadius: 999, padding: "2px 7px" }}>Serie</span>
        )}

        {item.rating ? (
          <div style={{ position: "absolute", bottom: 6, right: 6, fontSize: 10, fontWeight: 700, color: "#fff", background: "rgba(6,8,12,.62)", borderRadius: 999, padding: "2px 6px" }}>🐋 {item.rating}</div>
        ) : null}
      </div>
      <div style={SOTTO}>{item.title}</div>
    </div>
  );

  const scheletro = (k: number) => (
    <div key={`sk-${k}`}>
      <div style={{ ...POSTER, background: "var(--k-surface)" }}><span className="ds-skel" aria-hidden /></div>
      <div style={{ height: 11, marginTop: 7, borderRadius: 4, background: "var(--k-surface)" }} />
    </div>
  );

  return (
    <div
      className="ds"
      onTouchStart={tiroStart}
      onTouchMove={tiroMove}
      onTouchEnd={tiroEnd}
      style={{ minHeight: "100dvh", background: "var(--k-bg)", padding: `0 20px ${PAGE_PB}`, maxWidth: 440, margin: "0 auto" }}
    >
      {/* segno del tira-per-aggiornare */}
      {(tiro > 0 || aggiorno) && (
        <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top) + 58px)", left: 0, right: 0, display: "grid", placeItems: "center", zIndex: 25, pointerEvents: "none" }}>
          <span style={{ fontSize: 22, opacity: aggiorno ? 1 : Math.min(tiro / 56, 1), transform: `rotate(${aggiorno ? 0 : tiro * 4}deg)` }}>🐋</span>
        </div>
      )}

      {/* header */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 12, margin: "0 -20px", padding: "calc(env(safe-area-inset-top) + 12px) 20px 12px", background: "rgba(11,13,18,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <button onClick={() => router.push("/")} aria-label="Indietro" style={{ background: "none", border: 0, color: "var(--k-text)", fontSize: 26, lineHeight: 1, cursor: "pointer", padding: 0, width: 44, height: 44, display: "grid", placeItems: "center", marginLeft: -10 }}>‹</button>
        <h1 className="ds-display" style={{ flex: 1, fontSize: 22, color: "var(--k-text)", margin: 0 }}>Da guardare</h1>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--k-text-3)" }}>{count} {count === 1 ? "titolo" : "titoli"}</span>
      </div>

      {/* barra ricerca / aggiungi */}
      <div style={{ display: "flex", gap: 8, margin: "16px 0 0" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) { doAdd(search.trim()); setSearch(""); } }} placeholder="Cerca o aggiungi un titolo…" style={{ flex: 1, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0, minHeight: 44 }} />
        <button onClick={() => suggest.startInput()} className="ds-btn primary" style={{ height: 44, padding: "0 14px", fontSize: 13, flex: "none" }}>✨ Consiglio</button>
      </div>
      {/* risultati della ricerca trasversale: una ricerca sola, e per ognuno
          dove si vede. Prima quelli che l'utente può guardare subito. */}
      {search.trim().length >= 2 && (
        <div style={{ marginTop: 10 }}>
          {ricLoading && ric.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 4px", color: "var(--k-text-2)", fontSize: 13.5 }}>
              <span className="ds-spin" style={{ width: 16, height: 16, border: "2px solid var(--k-line)", borderTopColor: "var(--k-accent)", borderRadius: "50%", display: "inline-block" }} />
              Guardo dove si trova…
            </div>
          )}

          {ric.map((r) => {
            const d = disponibilita(r);
            const giaInLista = list.some((i) => i.tmdbId === r.tmdbId) || aggiunti.includes(r.tmdbId);
            return (
              <div key={`${r.tmdbType}-${r.tmdbId}`} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--k-line)" }}>
                <div style={{ width: 42, flex: "none", aspectRatio: "2 / 3", borderRadius: 7, overflow: "hidden", background: "var(--k-surface)" }}>
                  {r.poster && <img src={r.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--k-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                  <div style={{ fontSize: 11.5, color: "var(--k-text-3)", marginTop: 1 }}>
                    {[r.year, r.tmdbType === "tv" ? "Serie" : "Film"].filter(Boolean).join(" · ")}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 3, color: d.forte ? "var(--k-ok)" : "var(--k-text-2)", fontWeight: d.forte ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {d.segno} {d.testo}
                  </div>
                </div>
                <button
                  onClick={() => aggiungiDaRicerca(r)}
                  disabled={giaInLista}
                  aria-label={giaInLista ? "Già in lista" : `Aggiungi ${r.title}`}
                  style={{ width: 44, height: 44, flex: "none", borderRadius: 12, cursor: giaInLista ? "default" : "pointer", fontSize: 20, fontWeight: 700, display: "grid", placeItems: "center", background: giaInLista ? "transparent" : "var(--k-accent)", border: giaInLista ? "1px solid var(--k-line)" : 0, color: giaInLista ? "var(--k-text-3)" : "var(--k-accent-ink)" }}
                >
                  {giaInLista ? "✓" : "+"}
                </button>
              </div>
            );
          })}

          {/* Se non ha ancora detto a cosa è abbonato, la riga sopra dice solo
              "c'è su X". Qui gli si chiede, una volta sola. */}
          {!haScelto && ric.length > 0 && !invitoChiuso && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "10px 12px", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12 }}>
              <span style={{ flex: 1, fontSize: 12.5, color: "var(--k-text-2)", lineHeight: 1.45 }}>
                Dimmi a cosa sei abbonato e ti dico dove ce l&apos;hai già.
              </span>
              <button onClick={() => router.push("/?profilo=1")} className="ds-btn" style={{ height: 44, padding: "0 14px", fontSize: 13, flex: "none" }}>Scegli</button>
              <button onClick={() => setInvitoChiuso(true)} aria-label="Non ora" style={{ width: 44, height: 44, flex: "none", background: "none", border: 0, color: "var(--k-text-3)", fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>
          )}

          {!ricLoading && ric.length === 0 && (
            <button onClick={() => { doAdd(search.trim()); setSearch(""); }} className="ds-btn" style={{ width: "100%", height: 44, marginTop: 4, fontSize: 13 }}>＋ Aggiungi «{search.trim()}»</button>
          )}
        </div>
      )}

      {/* schede + filtri */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
        <div style={{ flex: 1, display: "flex", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 13, padding: 3 }}>
          {([["da-vedere", "Da vedere"], ["visti", "Visti"], ["tutti", "Tutti"]] as [Scheda, string][]).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setScheda(v)}
              aria-pressed={scheda === v}
              style={{ flex: 1, height: 44, minHeight: 44, borderRadius: 10, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: scheda === v ? 700 : 500, background: scheda === v ? "var(--k-accent)" : "transparent", color: scheda === v ? "var(--k-accent-ink)" : "var(--k-text-2)" }}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFiltriOpen(true)}
          aria-label="Filtra"
          style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: filtriAttivi ? "var(--k-accent)" : "var(--k-surface)", border: `1px solid ${filtriAttivi ? "var(--k-accent)" : "var(--k-line)"}`, color: filtriAttivi ? "var(--k-accent-ink)" : "var(--k-text-2)", cursor: "pointer", display: "grid", placeItems: "center" }}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
        </button>
      </div>

      {/* hero — Stasera per te (solo su "Da vedere") */}
      {hero && (
        <div onClick={() => openDetail(hero)} style={{ display: "flex", gap: 14, marginTop: 16, padding: 12, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 18, cursor: "pointer" }}>
          <div style={{ width: 92, flex: "none", aspectRatio: "2 / 3", borderRadius: 12, overflow: "hidden", background: "var(--k-cat-film, #2a2140)" }}>
            {hero.poster && <img src={hero.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-accent)" }}>Stasera per te</span>
            <b style={{ fontSize: 17, fontWeight: 600, color: "var(--k-text)", margin: "4px 0 2px", lineHeight: 1.15 }}>{hero.title}</b>
            <small style={{ fontSize: 12.5, color: "var(--k-text-3)" }}>{hero.info ?? kindLabel(hero.kind)}</small>
            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10 }}>
              <button onClick={(e) => { e.stopPropagation(); toggleSeen(hero); }} className="ds-btn" style={{ height: 44, padding: "0 12px", fontSize: 13 }}>✓ Visto</button>
              <button onClick={(e) => { e.stopPropagation(); openDove(hero); }} className="ds-btn primary" style={{ height: 44, padding: "0 12px", fontSize: 13 }}>▶ Dove vederlo</button>
            </div>
          </div>
        </div>
      )}

      {/* la griglia, una sola */}
      {aggiorno ? (
        <div style={GRID}>{[0, 1, 2, 3, 4, 5].map(scheletro)}</div>
      ) : griglia.length > 0 ? (
        <div style={GRID}>{griglia.map(card)}</div>
      ) : list.length === 0 ? (
        /* lista mai riempita */
        <div style={{ textAlign: "center", padding: "54px 20px 30px" }}>
          <div style={{ fontSize: 46, marginBottom: 12 }}>🐋</div>
          <p style={{ fontSize: 15, color: "var(--k-text-2)", lineHeight: 1.5, margin: "0 auto 20px", maxWidth: 260 }}>
            Qui finiscono i film e le serie che vuoi vedere
          </p>
          <button onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Cerca o aggiungi un titolo…"]')?.focus()} className="ds-btn primary" style={{ height: 48, padding: "0 22px", fontSize: 15, fontWeight: 700 }}>
            Aggiungi un titolo
          </button>
        </div>
      ) : (
        /* c'è roba, ma i filtri non pescano niente */
        <div style={{ textAlign: "center", padding: "44px 20px 30px" }}>
          <p style={{ fontSize: 14.5, color: "var(--k-text-2)", lineHeight: 1.5, margin: "0 auto 16px", maxWidth: 280 }}>
            Nessun titolo con questi filtri. Allarghiamo?
          </p>
          <button onClick={() => { setScheda("tutti"); setTipo("tutti"); setGenere(null); setOrdine("recenti"); }} className="ds-btn" style={{ height: 44, padding: "0 18px", fontSize: 14 }}>
            Togli i filtri
          </button>
        </div>
      )}

      {/* menu del tocco lungo */}
      {menuItem && (
        <SheetShell onClose={() => setMenuItem(null)} zIndex={58}>
          <div style={{ padding: "0 20px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
              <div style={{ width: 46, flex: "none", aspectRatio: "2 / 3", borderRadius: 8, overflow: "hidden", background: "var(--k-cat-film, #2a2140)" }}>
                {menuItem.poster && <img src={menuItem.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <b style={{ fontSize: 16, fontWeight: 600, color: "var(--k-text)", lineHeight: 1.2 }}>{menuItem.title}</b>
            </div>
            {([
              [menuItem.seen ? "↩︎ In lista" : "✓ Visto", () => { toggleSeen(menuItem); setMenuItem(null); }],
              ["▶ Dove vederlo", () => { const it = menuItem; setMenuItem(null); openDove(it); }],
              ["🗑 Elimina", () => { const it = menuItem; setMenuItem(null); elimina(it, list.indexOf(it)); }],
            ] as [string, () => void][]).map(([l, fn]) => (
              <button key={l} onClick={fn} className="ds-btn" style={{ width: "100%", height: 50, marginBottom: 8, fontSize: 15, justifyContent: "flex-start", paddingLeft: 18, textAlign: "left" }}>{l}</button>
            ))}
          </div>
        </SheetShell>
      )}

      {/* foglietto filtri */}
      {filtriOpen && (
        <SheetShell onClose={() => setFiltriOpen(false)} zIndex={58}>
          <div style={{ padding: "0 20px" }}>
            <h3 className="ds-display" style={{ fontSize: 19, color: "var(--k-text)", margin: "0 0 18px" }}>Cosa guardiamo? Mood?</h3>

            <div style={ETICHETTA}>Tipo</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {([["tutti", "Tutti"], ["film", "Film"], ["serie", "Serie"]] as [Tipo, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setTipo(v)} aria-pressed={tipo === v} style={{ flex: 1, height: 44, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: tipo === v ? 700 : 500, background: tipo === v ? "var(--k-accent)" : "var(--k-surface)", border: `1px solid ${tipo === v ? "var(--k-accent)" : "var(--k-line)"}`, color: tipo === v ? "var(--k-accent-ink)" : "var(--k-text-2)" }}>{l}</button>
              ))}
            </div>

            {generi.length > 0 && (
              <>
                <div style={ETICHETTA}>Genere</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  <button onClick={() => setGenere(null)} aria-pressed={genere === null} style={{ height: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: genere === null ? 700 : 500, background: genere === null ? "var(--k-accent)" : "var(--k-surface)", border: `1px solid ${genere === null ? "var(--k-accent)" : "var(--k-line)"}`, color: genere === null ? "var(--k-accent-ink)" : "var(--k-text-2)" }}>Tutti</button>
                  {generi.map((g) => (
                    <button key={g} onClick={() => setGenere(g)} aria-pressed={genere === g} style={{ height: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: genere === g ? 700 : 500, background: genere === g ? "var(--k-accent)" : "var(--k-surface)", border: `1px solid ${genere === g ? "var(--k-accent)" : "var(--k-line)"}`, color: genere === g ? "var(--k-accent-ink)" : "var(--k-text-2)" }}>{g}</button>
                  ))}
                </div>
              </>
            )}

            <div style={ETICHETTA}>Ordine</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([["recenti", "Aggiunti di recente"], ["alfabetico", "Alfabetico"], ["voto", "Voto"]] as [Ordine, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setOrdine(v)} aria-pressed={ordine === v} style={{ height: 46, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontSize: 14, textAlign: "left", paddingLeft: 16, fontWeight: ordine === v ? 700 : 500, background: ordine === v ? "var(--k-accent)" : "var(--k-surface)", border: `1px solid ${ordine === v ? "var(--k-accent)" : "var(--k-line)"}`, color: ordine === v ? "var(--k-accent-ink)" : "var(--k-text-2)" }}>{l}</button>
              ))}
            </div>

            <button onClick={() => setFiltriOpen(false)} className="ds-btn primary" style={{ width: "100%", height: 48, marginTop: 20, fontSize: 15, fontWeight: 700 }}>Fatto ✓</button>
          </div>
        </SheetShell>
      )}

      {/* foglio scheda film/serie — trama, anno, generi, cast (TMDB) */}
      {detItem && (
        <SheetShell onClose={() => setDetItem(null)} zIndex={55} maxHeight="86vh">
          <div style={{ padding: "0 20px" }}>
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

            {/* Il voto viene PRIMA della trama se il titolo è già visto: la trama
               non serve più a chi l'ha visto, il voto sì. */}
            {(() => {
              const voto = (
                <div style={{ marginTop: 20 }} key="voto">
                  <div style={ETICHETTA}>Il tuo voto</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((nn) => (
                      <button key={nn} onClick={() => { setDetRating(nn); saveReview(detItem, nn, detNote); }} aria-label={`${nn} su 5`} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 24, lineHeight: 1, width: 44, height: 44, display: "grid", placeItems: "center", filter: nn <= detRating ? "none" : "grayscale(1)", opacity: nn <= detRating ? 1 : 0.3 }}>🐋</button>
                    ))}
                    {detRating > 0 && <button onClick={() => { setDetRating(0); saveReview(detItem, 0, detNote); }} style={{ background: "none", border: 0, color: "var(--k-text-3)", fontSize: 12.5, cursor: "pointer", height: 44, padding: "0 8px" }}>azzera</button>}
                  </div>
                  <textarea value={detNote} onChange={(e) => setDetNote(e.target.value)} placeholder="Una nota sui tuoi gusti… (facoltativa)" rows={2} style={{ width: "100%", marginTop: 10, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "10px 12px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0, resize: "vertical", boxSizing: "border-box" }} />
                  <button onClick={() => saveReview(detItem, detRating, detNote)} className="ds-btn" style={{ height: 44, padding: "0 16px", marginTop: 8, fontSize: 13.5 }}>Salva nota</button>
                </div>
              );

              const corpo = detLoading ? (
                <div key="load" style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 4px", color: "var(--k-text-2)", fontSize: 14 }}>
                  <span className="ds-spin" style={{ width: 18, height: 18, border: "2px solid var(--k-line)", borderTopColor: "var(--k-accent)", borderRadius: "50%", display: "inline-block" }} />
                  Carico la scheda…
                </div>
              ) : (
                <div key="corpo">
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
                      <div style={ETICHETTA}>Cast</div>
                      <div style={{ fontSize: 13.5, color: "var(--k-text-2)", lineHeight: 1.4 }}>{detData.cast.join(", ")}</div>
                    </div>
                  )}

                  {detSimilar.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <div style={ETICHETTA}>Simili · tocca per aggiungere</div>
                      <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -20px", padding: "0 20px 4px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
                        {detSimilar.map((s) => (
                          <button key={s.title} onClick={() => doAdd(s.title)} style={{ flex: "none", width: 84, scrollSnapAlign: "start", background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
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
                </div>
              );

              return detItem.seen ? <>{voto}{corpo}</> : <>{corpo}{voto}</>;
            })()}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => { toggleSeen(detItem); setDetItem(null); }} className="ds-btn" style={{ flex: 1, height: 48 }}>{detItem.seen ? "↩︎ In lista" : "✓ Visto"}</button>
              <button onClick={() => { const it = detItem; setDetItem(null); openDove(it); }} className="ds-btn primary" style={{ flex: 1, height: 48 }}>▶ Dove vederlo</button>
            </div>
          </div>
        </SheetShell>
      )}

      {/* foglio "Dove vederlo" — piattaforme italiane reali (TMDB) */}
      {dovItem && (
        <SheetShell onClose={() => setDovItem(null)} zIndex={55}>
          <div style={{ padding: "0 20px" }}>
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
                    <button onClick={() => { justwatch(dovItem); setDovItem(null); }} className="ds-btn primary" style={{ width: "100%", height: 48 }}>Cerca su JustWatch ▸</button>
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
                      <div style={ETICHETTA}>{g.label}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {g.ps.map((p) => (
                          <button key={p.name} onClick={() => { const u = platformUrl(p.name, dovItem.title) || dovData?.link || `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(dovItem.title)}`; window.open(u, "_blank", "noopener"); }} style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 44, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "6px 14px 6px 8px", cursor: "pointer", fontFamily: "inherit" }}>
                            {p.logo ? <img src={p.logo} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} /> : <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--k-line)", display: "inline-block" }} />}
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--k-text)" }}>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { const u = dovData?.link; window.open(u || `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(dovItem.title)}`, "_blank", "noopener"); setDovItem(null); }} className="ds-btn primary" style={{ width: "100%", height: 48, marginTop: 4 }}>Altre opzioni ▸</button>
                  <p style={{ fontSize: 11, color: "var(--k-text-3)", textAlign: "center", margin: "10px 0 0" }}>Dati TMDB · disponibilità Italia</p>
                </>
              );
            })()}
          </div>
        </SheetShell>
      )}

      {/* toast */}
      {toast && (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: "calc(96px + env(safe-area-inset-bottom))", maxWidth: 408, margin: "0 auto", zIndex: 40, display: "flex", alignItems: "center", gap: 12, background: "var(--k-surface-2)", border: "1px solid var(--k-line)", borderRadius: 14, padding: "8px 8px 8px 14px", boxShadow: "0 10px 30px rgba(0,0,0,.5)" }}>
          <span style={{ flex: 1, fontSize: 14, color: "var(--k-text)" }}>{toast.msg}</span>
          {toast.action && <button onClick={() => { toast.onAction?.(); setToast(null); }} style={{ background: "none", border: 0, color: "var(--k-accent)", fontWeight: 700, fontSize: 14, cursor: "pointer", minWidth: 44, height: 44, padding: "0 10px" }}>{toast.action}</button>}
        </div>
      )}

      <KeikoNav active="guarda" />
    </div>
  );
}
