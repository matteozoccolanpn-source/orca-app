"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WatchItem } from "@/lib/supabase";
import type { WatchProviders, WatchProvider, TitleDetails, SimilarTitle } from "@/lib/tmdb";
import KeikoNav, { PAGE_PB } from "@/app/components/keiko/KeikoNav";
import { useSuggest } from "@/app/components/keiko/SuggestProvider";

import { I } from "@/app/components/v2/icons";
import { Img } from "@/app/components/v2/Img";
import { Sec } from "@/app/components/v2/Sec";
import { Chip } from "@/app/components/v2/Chip";
import { Poster } from "@/app/components/v2/Poster";
import { Feature } from "@/app/components/v2/Feature";
import { Empty } from "@/app/components/v2/Empty";
import { Skeleton } from "@/app/components/v2/Skeleton";
import { Sheet } from "@/app/components/v2/Sheet";
import { SheetHero } from "@/app/components/v2/SheetHero";
import { Step } from "@/app/components/v2/Step";

/* Sezione "Guarda".

   ONDATA 2 — cambia SOLO il vestito. Stato, effetti, chiamate di rete e
   gestori sono quelli di prima, riga per riga: sono fatti di casi limite che
   il mock non conosce. Quello che cambia è il markup, che ora è quello di
   docs/mockups/keiko-v2-mock.html, con i componenti di app/components/v2 e
   tutto dentro <div className="k2">.

   I comportamenti che NON si toccano (e che restano tutti):
   · IL TAP APRE LA SCHEDA. Il tocco lungo (450ms + vibrazione) apre il menu.
   · UNA griglia sola con filtri: nessun titolo compare due volte.
   · Il ponte dal cinema (?vota=), il tira-per-aggiornare, il toast annullabile,
     la ricerca trasversale con AbortController, le serie con +1 episodio.

   Quello che il mock chiedeva e il codice ha vinto (deciso da Matteo l'11
   agosto): il consiglio NON si sposta dentro la barra. Vive in
   SuggestProvider, che sta nel layout; qui cambia solo DOVE si tocca — il
   tasto terracotta in fondo alla barra, che nel mock è la freccia. La barra
   continua a fare la ricerca vera, istantanea e gratis. */

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

/* L'etichettina grigia sopra un blocco dentro un foglio. Nel manifesto le
   label non sono maiuscole e non sono colorate: `.status` del foglio V2 è
   già esattamente quella riga (12,5px, --meta, peso 500). */
const LAB = { marginTop: 18, marginBottom: 6 } as const;

export default function GuardaView({ items, vota }: { items: WatchItem[]; vota?: string }) {
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
  // "Togli dalla lista" è terziaria e chiede conferma: primo tocco arma, secondo elimina.
  const [armaElimina, setArmaElimina] = useState(false);

  // ricerca trasversale: cerca una volta e dice dove si vede
  const [ric, setRic] = useState<Ricerca[]>([]);
  const [ricLoading, setRicLoading] = useState(false);
  const [haScelto, setHaScelto] = useState(true);   // true finché non si sa: niente inviti a vuoto
  const [invitoChiuso, setInvitoChiuso] = useState(false);
  const [aggiunti, setAggiunti] = useState<number[]>([]);

  // tira-per-aggiornare
  const [tiro, setTiro] = useState(0);          // quanto è stato tirato, in px
  const [aggiorno, setAggiorno] = useState(false);

  /* Il campo della ricerca. Prima lo si ritrovava con un querySelector sul
     testo del placeholder: bastava cambiare una parola al placeholder e il
     ponte dal cinema smetteva di funzionare in silenzio. */
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Dati della serie nella scheda (lunghezza, prossimo episodio). Arrivano
  // dalla rotta, che li ricopia in tabella: la volta dopo non serve chiederli.
  const [serieInfo, setSerieInfo] = useState<{ totalSeasons: number | null; nextAirDate: string | null } | null>(null);

  /** "giovedì" — il giorno in parole. Se la data non si legge, si tace. */
  function giornoDi(data: string): string | null {
    try {
      const d = new Date(data + "T12:00:00");
      if (Number.isNaN(d.getTime())) return null;
      const oggi = new Date();
      const giorni = Math.round((d.getTime() - oggi.getTime()) / 86400000);
      if (giorni <= 0) return "oggi";
      if (giorni === 1) return "domani";
      if (giorni < 7) return new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: "Europe/Rome" }).format(d);
      return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(d);
    } catch {
      return null;
    }
  }

  async function correggiPunto(item: WatchItem, season: number, episode: number) {
    setList((l) => l.map((i) => (i.id === item.id ? { ...i, season, episode } : i)));
    setDetItem((cur) => (cur && cur.id === item.id ? { ...cur, season, episode } : cur));
    try {
      const res = await fetch("/api/watch/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id, season, episode }),
      });
      if (!res.ok) throw new Error();
    } catch { showToast("Qualcosa non torna, riprovo"); }
  }

  /* IL PONTE DAL CINEMA. Arrivando da /guarda?vota=Dune:
       - se il film è già in lista → si apre la sua scheda, dove c'è il voto;
       - se non c'è → il titolo finisce nella ricerca, a fuoco, e con un tocco
         su + entra in lista (la ricerca TMDB fa il resto);
       - ?vota= vuoto → solo la ricerca a fuoco: sceglie l'utente.
     Il parametro si CONSUMA: si pulisce dall'URL subito, altrimenti a ogni
     refresh la scheda si riaprirebbe da sola. */
  const ponteFatto = useRef(false);
  useEffect(() => {
    if (vota === undefined || ponteFatto.current) return;
    ponteFatto.current = true;

    const cercato = vota.trim();
    const semplice = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    const gia = cercato ? items.find((i) => semplice(i.title) === semplice(cercato)) : undefined;

    if (gia) {
      setScheda(gia.seen ? "visti" : "da-vedere");   // la scheda giusta, o la card non si vedrebbe
      openDetail(gia);
    } else {
      if (cercato) setSearch(cercato);
      // un attimo dopo il primo render: il campo esiste solo a quel punto
      setTimeout(() => inputRef.current?.focus(), 60);
    }

    // via il parametro dall'URL, senza ricaricare la pagina
    window.history.replaceState(null, "", "/guarda");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vota]);

  async function openDetail(item: WatchItem) {
    setMenuItem(null);
    setSerieInfo(null);
    // Solo per le serie: sui film non si chiede niente e non cambia nulla.
    if (item.kind === "serie") {
      fetch(`/api/watch/progress?id=${encodeURIComponent(item.id)}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => { if (d?.progresso) setSerieInfo({ totalSeasons: d.progresso.totalSeasons ?? null, nextAirDate: d.progresso.nextAirDate ?? null }); })
        .catch(() => {});   // TMDB muto: la scheda resta quella di sempre
    }
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
     i prezzi, quindi si dice "a noleggio" e basta, mai una cifra.
     `segno` era un'emoji e non si disegna più: nel sistema V2 il caso forte è
     la spunta teal, gli altri sono metadato grigio. La funzione resta identica
     perché è lei a decidere QUALE dei quattro casi è. */
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

  // ── Serie: a che punto sei ────────────────────────────────────────────────
  // Il "+1" è ottimista come la spunta "visto": il conto avanza subito sotto il
  // dito, poi si salva. Se il salvataggio non passa, torna com'era.
  const [avanzando, setAvanzando] = useState<string[]>([]);

  async function avanzaEpisodio(item: WatchItem) {
    if (avanzando.includes(item.id)) return;
    setAvanzando((a) => [...a, item.id]);
    const prima = { season: item.season, episode: item.episode };
    // conto ottimista: senza sapere la lunghezza della stagione si va avanti di
    // uno; il server, che TMDB ce l'ha, corregge il tiro nella risposta.
    const s = item.season ?? 1;
    const e = (item.episode ?? 0) + 1;
    setList((l) => l.map((i) => (i.id === item.id ? { ...i, season: s, episode: e } : i)));
    try {
      const res = await fetch("/api/watch/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id, avanza: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error();
      if (d.finita) {
        setList((l) => l.map((i) => (i.id === item.id ? { ...i, seen: true, season: prima.season, episode: prima.episode } : i)));
        showToast("Serie finita ✓ Com'era?", "Vota", () => openDetail({ ...item, seen: true }));
      } else {
        setList((l) => l.map((i) => (i.id === item.id ? { ...i, season: d.season, episode: d.episode } : i)));
      }
    } catch {
      setList((l) => l.map((i) => (i.id === item.id ? { ...i, season: prima.season, episode: prima.episode } : i)));
      showToast("Qualcosa non torna, riprovo");
    } finally {
      setAvanzando((a) => a.filter((x) => x !== item.id));
    }
  }

  // "Continua a guardare": le serie iniziate e non finite.
  const iniziate = list.filter((i) => i.kind === "serie" && !i.seen && i.episode != null);

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
      setArmaElimina(false);
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
      showToast("Tutto fresco di giornata");
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

  /* Quanto sei avanti in una serie, se si può sapere davvero. Senza il totale
     degli episodi non si disegna una barra a caso: sparisce e basta. */
  function avanzamento(i: WatchItem): number | null {
    if (!i.totalEpisodes || i.totalEpisodes <= 0 || i.episode == null) return null;
    return Math.max(0, Math.min(100, Math.round((i.episode / i.totalEpisodes) * 100)));
  }

  /* La locandina della griglia. Il tocco lungo passa da `press`: il tap normale
     apre la scheda, e se il tocco lungo è già scattato il click va soffocato. */
  const card = (item: WatchItem) => (
    <Poster
      key={item.id}
      img={item.poster}
      t={item.title}
      badge={kindLabel(item.kind).toLowerCase()}
      seen={item.seen}
      m={item.seen ? (item.rating ? `visto · voto ${item.rating}` : "visto") : item.info ?? kindLabel(item.kind)}
      ariaLabel={item.title}
      onClick={() => { if (pressFired.current) { pressFired.current = false; return; } openDetail(item); }}
      press={{
        onPointerDown: (e) => pressStart(e, item),
        onPointerMove: pressMove,
        onPointerUp: pressCancel,
        onPointerLeave: pressCancel,
        onPointerCancel: pressCancel,
        onContextMenu: (e) => e.preventDefault(),   // niente menu di sistema sul tocco lungo
      }}
    />
  );

  /* Lo scheletro della griglia: la stessa forma delle locandine che arrivano. */
  const scheletro = (k: number) => (
    <div key={`sk-${k}`}>
      <span className="sk" style={{ display: "block", aspectRatio: "2 / 3", borderRadius: "var(--r-card)" }} />
      <span className="sk sk-line" style={{ display: "block", width: "80%" }} />
      <span className="sk sk-line" style={{ display: "block", width: "52%", height: "10px" }} />
    </div>
  );

  /* Le righe-azione dei fogli: icona quadrata, titolo, metadato, chevron. */
  const rowAct = (icon: React.ReactNode, t: string, m: string, onClick: () => void) => (
    <div className="row-act tap" key={t} onClick={onClick}>
      <span className="ic2">{icon}</span>
      <span className="in">
        <span className="t">{t}</span>
        <span className="m">{m}</span>
      </span>
      <span className="chevhit">{I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}</span>
    </div>
  );

  return (
    <>
      <div
        className="k2"
        onTouchStart={tiroStart}
        onTouchMove={tiroMove}
        onTouchEnd={tiroEnd}
      >
        {/* le quattro luci d'ambiente del sistema */}
        <div className="lights">
          <i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" />
        </div>

        {/* segno del tira-per-aggiornare */}
        {(tiro > 0 || aggiorno) && (
          <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top) + 58px)", left: 0, right: 0, display: "grid", placeItems: "center", zIndex: 25, pointerEvents: "none", color: "var(--teal)" }}>
            <span style={{ opacity: aggiorno ? 1 : Math.min(tiro / 56, 1), transform: `rotate(${aggiorno ? 0 : tiro * 4}deg)`, display: "block" }}>
              {I.orca(26)}
            </span>
          </div>
        )}

        {/* `.screen` porta i margini del sistema; il fondo lo detta la barra
            VERA dell'app (KeikoNav), non quella del mock: --pad-bottom è
            tarata su un'altra barra e taglierebbe l'ultima riga. */}
        <div className="screen" style={{ paddingBottom: PAGE_PB }}>
          {/* testata */}
          <div className="head">
            <button className="back tap" onClick={() => router.push("/")} aria-label="Indietro">
              {I.back({ s: 17 })}
            </button>
            <div className="col">
              <h1>Guarda</h1>
              <div className="status">{count} {count === 1 ? "titolo" : "titoli"}</div>
            </div>
          </div>

          <div className="stag">
            {/* ── la barra ───────────────────────────────────────────────────
                Fa la ricerca vera, istantanea e gratis. Il tasto terracotta in
                fondo è il consiglio di Keiko: apre il foglio di SuggestProvider,
                che è globale e non cambia meccanica. */}
            <div>
              <div className="ask" style={{ cursor: "auto" }}>
                <span style={{ color: "var(--teal)", flex: "none", display: "flex" }}>{I.search({ s: 17 })}</span>
                <input
                  ref={inputRef}
                  className="ph-txt"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && search.trim()) { doAdd(search.trim()); setSearch(""); } }}
                  placeholder="Cerca o aggiungi un titolo…"
                  /* 16px non è un capriccio: sotto i 16 iOS ingrandisce la
                     pagina da solo appena tocchi il campo, e non torna più
                     indietro. Il mock scrive 13, ma il mock non ha campi. */
                  style={{ background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", padding: 0 }}
                />
                <button
                  className="go tap"
                  onClick={() => suggest.startInput()}
                  aria-label="Chiedi un consiglio a Keiko"
                  style={{ border: 0, cursor: "pointer" }}
                >
                  {I.orca(15)}
                </button>
              </div>

              {/* risultati della ricerca trasversale: una ricerca sola, e per
                  ognuno dove si vede. Prima quelli che si possono guardare subito. */}
              {search.trim().length >= 2 && (
                <div style={{ marginTop: 8 }}>
                  {ricLoading && ric.length === 0 && <Skeleton rows={3} />}

                  {ric.length > 0 && (
                    <div className="srf">
                      {ric.map((r) => {
                        const d = disponibilita(r);
                        const giaInLista = list.some((i) => i.tmdbId === r.tmdbId) || aggiunti.includes(r.tmdbId);
                        return (
                          <div key={`${r.tmdbType}-${r.tmdbId}`} className="res">
                            <span className="pw">
                              <b className="fb2" style={{ fontSize: "13px" }}>{r.title.slice(0, 2)}</b>
                              {r.poster && <Img src={r.poster} />}
                            </span>
                            <span className="in">
                              <span className="t">{r.title}</span>
                              <span className="m">{[r.year, r.tmdbType === "tv" ? "Serie" : "Film"].filter(Boolean).join(" · ")}</span>
                              {d.forte
                                ? <span className="w">{I.tick({ s: 13 })}{d.testo}</span>
                                : <span className="w no">{d.testo}</span>}
                            </span>
                            <span
                              className="add tap"
                              aria-label={giaInLista ? "Già in lista" : `Aggiungi ${r.title}`}
                              aria-disabled={giaInLista || undefined}
                              onClick={(e) => { e.stopPropagation(); if (!giaInLista) aggiungiDaRicerca(r); }}
                            >
                              {giaInLista ? I.tick({ s: 16 }) : I.plus({ s: 16 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Se non ha ancora detto a cosa è abbonato, la riga sopra dice
                      solo "c'è su X". Qui glielo si chiede, una volta sola. */}
                  {!haScelto && ric.length > 0 && !invitoChiuso && (
                    <div className="hint">
                      {I.info({ s: 14 })}
                      <p style={{ flex: 1 }}>Dimmi a cosa sei abbonato e ti dico dove ce l&apos;hai già.</p>
                      <button className="tert tap" style={{ flex: "none", padding: "0 2px" }} onClick={() => router.push("/?profilo=1")}>Scegli</button>
                      <span className="chevhit tap" onClick={() => setInvitoChiuso(true)} aria-label="Non ora">{I.close({ s: 14 })}</span>
                    </div>
                  )}

                  {!ricLoading && ric.length === 0 && (
                    <button className="btn2 wide tap" style={{ marginTop: 8 }} onClick={() => { doAdd(search.trim()); setSearch(""); }}>
                      {I.plus({ s: 14 })}Aggiungi «{search.trim()}»
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── schede e filtri, tutti chip ── */}
            <div>
              <div className="chips">
                {([["da-vedere", "da vedere"], ["visti", "visti"], ["tutti", "tutti"]] as [Scheda, string][]).map(([v, l]) => (
                  <Chip key={v} on={scheda === v} onClick={() => setScheda(v)}>{l}</Chip>
                ))}
                <Chip on={tipo === "film"} onClick={() => setTipo(tipo === "film" ? "tutti" : "film")}>
                  {I.film({ s: 12 })}film
                </Chip>
                <Chip on={tipo === "serie"} onClick={() => setTipo(tipo === "serie" ? "tutti" : "serie")}>
                  {I.tv({ s: 12 })}serie
                </Chip>
                <Chip on={filtriAttivi > 0} onClick={() => setFiltriOpen(true)}>
                  {filtriAttivi > 0 ? `filtri · ${filtriAttivi}` : "filtri"}
                </Chip>
              </div>
            </div>

            {/* ── Continua a guardare ────────────────────────────────────────
                Va PRIMA di "Stasera per te": quello che hai lasciato a metà
                viene prima di un consiglio nuovo. */}
            {!search.trim() && iniziate.length > 0 && (
              <div>
                <Sec sm={iniziate.length === 1 ? "una serie aperta" : `${iniziate.length} serie aperte`}>Continua a guardare</Sec>
                {iniziate.map((i) => {
                  const pct = avanzamento(i);
                  return (
                    <div key={i.id} className="srf wide tap" style={{ marginTop: 8 }} onClick={() => openDetail(i)}>
                      <div className="pw">
                        <b className="fb2">{i.title.slice(0, 1)}</b>
                        {i.poster && <Img src={i.poster} />}
                      </div>
                      <div className="in">
                        <div className="k">
                          <span className="dot guarda" />
                          stagione {i.season ?? 1} · episodio {i.episode ?? 1}
                        </div>
                        <div className="t">{i.title}</div>
                        <div className="staterow">
                          {pct !== null && (
                            <span className="prog"><i style={{ width: `${pct}%` }} /></span>
                          )}
                          <button
                            className="btn-teal tap"
                            aria-label={`Visto un episodio di ${i.title}`}
                            aria-disabled={avanzando.includes(i.id) || undefined}
                            onClick={(e) => { e.stopPropagation(); avanzaEpisodio(i); }}
                            style={{ marginLeft: pct === null ? "auto" : undefined }}
                          >
                            +1 episodio
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Stasera per te ── */}
            {hero && (
              <div>
                <Sec sm="uno dei tuoi, a caso">Stasera per te</Sec>
                <Feature
                  /* compatta: la copertina di TMDB e' orizzontale e ha gia' il
                     titolo stampato dentro. A tutta card litigavano due
                     tipografie nella stessa immagine. */
                  compatta
                  img={hero.poster}
                  tone="dark"
                  dot="guarda"
                  k={[kindLabel(hero.kind).toLowerCase(), hero.genre?.toLowerCase()].filter(Boolean).join(" · ")}
                  t={hero.title}
                  m={hero.info ?? undefined}
                  onClick={() => openDetail(hero)}
                >
                  <div className="row">
                    <button className="cta tap" onClick={(e) => { e.stopPropagation(); openDove(hero); }}>Dove vederlo</button>
                    <button className="btn2 tap" onClick={(e) => { e.stopPropagation(); toggleSeen(hero); }}>L’ho visto</button>
                  </div>
                </Feature>
              </div>
            )}

            {/* ── la griglia, una sola ── */}
            <div>
              <Sec sm={`${griglia.length} ${griglia.length === 1 ? "titolo" : "titoli"}`}>La tua lista</Sec>
              {aggiorno ? (
                <div className="g3">{[0, 1, 2, 3, 4, 5].map(scheletro)}</div>
              ) : griglia.length > 0 ? (
                <div className="g3 stag">{griglia.map(card)}</div>
              ) : list.length === 0 ? (
                /* lista mai riempita */
                <Empty
                  icon={I.tv({ s: 17 })}
                  t="Qui non c’è ancora niente"
                  m="cerca un titolo e aggiungilo:<br/>lo ritrovi in questa griglia"
                  cta="Aggiungi un titolo"
                  onCta={() => inputRef.current?.focus()}
                />
              ) : (
                /* c'è roba, ma i filtri non pescano niente */
                <Empty
                  icon={I.search({ s: 17 })}
                  t="Nessun titolo con questi filtri"
                  m="allarghiamo?"
                  cta="Togli i filtri"
                  onCta={() => { setScheda("tutti"); setTipo("tutti"); setGenere(null); setOrdine("recenti"); }}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── menu del tocco lungo ── */}
        {menuItem && (
          <Sheet onClose={() => setMenuItem(null)}>
            {menuItem.poster ? (
              <SheetHero
                img={menuItem.poster}
                k={[kindLabel(menuItem.kind), menuItem.year].filter(Boolean).join(" · ")}
                h2={menuItem.title}
                cold
              />
            ) : (
              <div className="plain-head"><h2>{menuItem.title}</h2></div>
            )}
            <div className="pad">
              <div className="srf" style={{ marginTop: 16 }}>
                {rowAct(
                  I.tick({ s: 16 }),
                  menuItem.seen ? "Non l’ho visto" : "L’ho visto",
                  menuItem.seen ? "torna fra i da vedere" : "esce dalla lista e ti chiedo il voto",
                  () => { const it = menuItem; setMenuItem(null); toggleSeen(it); },
                )}
                {rowAct(
                  I.play({ s: 16 }),
                  "Dove vederlo",
                  "le piattaforme che ce l’hanno in Italia",
                  () => { const it = menuItem; setMenuItem(null); openDove(it); },
                )}
                {rowAct(
                  I.doc({ s: 16 }),
                  "Apri la scheda",
                  "trama, cast e titoli simili",
                  () => { const it = menuItem; setMenuItem(null); openDetail(it); },
                )}
              </div>

              {/* terziaria, in fondo, e chiede conferma: il primo tocco arma */}
              <div className="danger" style={{ margin: "28px 0 8px" }}>
                <button
                  className={"tap" + (armaElimina ? " arm" : "")}
                  onClick={() => {
                    if (!armaElimina) { setArmaElimina(true); return; }
                    const it = menuItem;
                    setMenuItem(null);
                    setArmaElimina(false);
                    elimina(it, list.indexOf(it));
                  }}
                >
                  {armaElimina ? "Tocca di nuovo per togliere" : "Togli dalla lista"}
                </button>
              </div>
            </div>
          </Sheet>
        )}

        {/* ── foglietto filtri ── */}
        {filtriOpen && (
          <Sheet onClose={() => setFiltriOpen(false)}>
            <div className="plain-head"><h2>Cosa guardiamo?</h2></div>
            <div className="pad">
              <div className="status" style={LAB}>Tipo</div>
              <div className="chips" style={{ margin: "0 -16px" }}>
                {([["tutti", "tutti"], ["film", "film"], ["serie", "serie"]] as [Tipo, string][]).map(([v, l]) => (
                  <Chip key={v} on={tipo === v} onClick={() => setTipo(v)}>{l}</Chip>
                ))}
              </div>

              {generi.length > 0 && (
                <>
                  <div className="status" style={LAB}>Genere</div>
                  <div className="chips" style={{ margin: "0 -16px", flexWrap: "wrap", overflowX: "visible" }}>
                    <Chip on={genere === null} onClick={() => setGenere(null)}>tutti</Chip>
                    {generi.map((g) => (
                      <Chip key={g} on={genere === g} onClick={() => setGenere(g)}>{g}</Chip>
                    ))}
                  </div>
                </>
              )}

              <div className="status" style={LAB}>Ordine</div>
              <div className="srf">
                {([["recenti", "Aggiunti di recente"], ["alfabetico", "Alfabetico"], ["voto", "Voto"]] as [Ordine, string][]).map(([v, l]) => (
                  <div className="row-act tap" key={v} onClick={() => setOrdine(v)}>
                    <span className="ic2">{ordine === v ? I.tick({ s: 16 }) : I.swap({ s: 16 })}</span>
                    <span className="in"><span className="t">{l}</span></span>
                    {ordine === v && <span className="badge">scelto</span>}
                  </div>
                ))}
              </div>

              <button className="cta wide tap" style={{ marginTop: 20 }} onClick={() => setFiltriOpen(false)}>Fatto</button>
            </div>
          </Sheet>
        )}

        {/* ── foglio scheda film/serie ── */}
        {detItem && (
          <Sheet onClose={() => setDetItem(null)}>
            {detItem.poster ? (
              <SheetHero
                img={detItem.poster}
                k={[detData ? kindLabel(detData.kind) : kindLabel(detItem.kind), detData?.year ?? detItem.year].filter(Boolean).join(" · ")}
                h2={detItem.title}
                cold
              />
            ) : (
              <div className="plain-head"><h2>{detItem.title}</h2></div>
            )}
            <div className="pad">
              {detData && detData.genres.length > 0 && (
                <span className="dchips" style={{ marginTop: 12 }}>
                  {detData.genres.map((g) => <span className="dchip" key={g}>{g}</span>)}
                </span>
              )}

              {/* Serie: a che punto sei. Sui film questo blocco non compare. */}
              {detItem.kind === "serie" && (
                <div className="srf2" style={{ marginTop: 16, padding: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.01em" }}>
                    {detItem.episode != null
                      ? `Sei a S${detItem.season ?? 1}E${detItem.episode}${serieInfo?.totalSeasons ? ` di ${serieInfo.totalSeasons} stagion${serieInfo.totalSeasons === 1 ? "e" : "i"}` : ""}`
                      : "Non hai ancora cominciato"}
                  </div>
                  {serieInfo?.nextAirDate && giornoDi(serieInfo.nextAirDate) && (
                    <div className="status">Prossimo episodio: {giornoDi(serieInfo.nextAirDate)}</div>
                  )}

                  {/* correzione a mano: la gente salta episodi e recupera */}
                  {/* La stagione resta un menu a tendina: con lo stepper, per
                      andare dalla 1 alla 5 servivano quattro tocchi. Il salto
                      non si perde. Il vestito è quello del sistema (`.mini`),
                      con l'altezza di presa a 44 e il testo a 16px, che sotto
                      i 16 iOS ingrandisce la pagina da solo. */}
                  <div className="fld">
                    <span className="fl">Stagione</span>
                    <select
                      className="mini tap"
                      value={detItem.season ?? 1}
                      onChange={(e) => correggiPunto(detItem, Number(e.target.value), detItem.episode ?? 1)}
                      style={{ width: "auto", minWidth: 88, minHeight: 44, fontSize: 16 }}
                    >
                      {Array.from({ length: Math.max(serieInfo?.totalSeasons ?? 1, detItem.season ?? 1, 1) }, (_, k) => k + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fld">
                    <span className="fl">Episodio</span>
                    <Step
                      val={detItem.episode ?? 1}
                      dec={() => correggiPunto(detItem, detItem.season ?? 1, Math.max(1, (detItem.episode ?? 1) - 1))}
                      inc={() => correggiPunto(detItem, detItem.season ?? 1, (detItem.episode ?? 1) + 1)}
                    />
                  </div>

                  <button
                    className="cta wide tap"
                    style={{ marginTop: 12 }}
                    aria-disabled={avanzando.includes(detItem.id) || undefined}
                    onClick={() => avanzaEpisodio(detItem)}
                  >
                    +1 episodio
                  </button>
                </div>
              )}

              {/* Il voto viene PRIMA della trama se il titolo è già visto: la
                 trama non serve più a chi l'ha visto, il voto sì. */}
              {(() => {
                const voto = (
                  <div key="voto">
                    <div className="status" style={LAB}>Il tuo voto</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((nn) => (
                        <button
                          key={nn}
                          onClick={() => { setDetRating(nn); saveReview(detItem, nn, detNote); }}
                          aria-label={`${nn} su 5`}
                          className="tap"
                          style={{ background: "none", border: 0, cursor: "pointer", width: 44, height: 44, display: "grid", placeItems: "center", color: nn <= detRating ? "var(--teal)" : "var(--meta)", opacity: nn <= detRating ? 1 : 0.4 }}
                        >
                          {I.orca(22)}
                        </button>
                      ))}
                      {detRating > 0 && (
                        <button className="tert tap" onClick={() => { setDetRating(0); saveReview(detItem, 0, detNote); }}>azzera</button>
                      )}
                    </div>
                    <textarea
                      value={detNote}
                      onChange={(e) => setDetNote(e.target.value)}
                      placeholder="Una nota sui tuoi gusti… (facoltativa)"
                      rows={2}
                      style={{ width: "100%", marginTop: 10, background: "var(--lv1)", border: "1px solid rgba(255,255,255,.09)", borderRadius: "var(--r-in)", boxShadow: "inset 0 1px 0 var(--hl)", padding: "10px 12px", color: "var(--txt)", fontSize: 16, fontFamily: "inherit", outline: 0, resize: "vertical", boxSizing: "border-box" }}
                    />
                    <button className="btn2 tap" style={{ marginTop: 8 }} onClick={() => saveReview(detItem, detRating, detNote)}>Salva nota</button>
                  </div>
                );

                const corpo = detLoading ? (
                  <div key="load" style={{ marginTop: 16 }}><Skeleton rows={2} /></div>
                ) : (
                  <div key="corpo">
                    {detData?.overview ? (
                      <div onClick={() => setDetExpanded((v) => !v)} style={{ marginTop: 16, cursor: "pointer" }}>
                        <p className="sub" style={{ marginTop: 0, display: "-webkit-box", WebkitLineClamp: detExpanded ? undefined : 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{detData.overview}</p>
                        <button className="tert tap">{detExpanded ? "Comprimi" : "Leggi tutto"}</button>
                      </div>
                    ) : (
                      <p className="sub">Trama non disponibile.</p>
                    )}

                    {detData && detData.cast.length > 0 && (
                      <div>
                        <div className="status" style={LAB}>Cast</div>
                        <div className="sub" style={{ marginTop: 0 }}>{detData.cast.join(", ")}</div>
                      </div>
                    )}

                    {detSimilar.length > 0 && (
                      <div>
                        <div className="status" style={LAB}>Simili · tocca per aggiungere</div>
                        <div className="shelf" style={{ margin: "0 -16px" }}>
                          {detSimilar.map((s) => (
                            <div key={s.title} className="rcard tap" onClick={() => doAdd(s.title)}>
                              <div className="pw">
                                <b className="fb2">{s.title.slice(0, 1)}</b>
                                {s.poster && <Img src={s.poster} />}
                                <span className="bdg" style={{ left: "auto", right: 8, padding: "4px 6px" }}>{I.plus({ s: 12 })}</span>
                              </div>
                              <div className="t">{s.title}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );

                return detItem.seen ? <>{voto}{corpo}</> : <>{corpo}{voto}</>;
              })()}

              <div className="pactions" style={{ marginTop: 20 }}>
                <button className="cta tap" onClick={() => { const it = detItem; setDetItem(null); openDove(it); }}>Dove vederlo</button>
                <button className="btn2 tap" onClick={() => { toggleSeen(detItem); setDetItem(null); }}>
                  {detItem.seen ? "Non l’ho visto" : "L’ho visto"}
                </button>
              </div>
            </div>
          </Sheet>
        )}

        {/* ── foglio "Dove vederlo" ── */}
        {dovItem && (
          <Sheet onClose={() => setDovItem(null)}>
            <div className="plain-head"><h2>Dove vedere «{dovItem.title}»</h2></div>
            <div className="pad">
              {dovLoading ? (
                <div style={{ marginTop: 16 }}><Skeleton rows={2} /></div>
              ) : (() => {
                const flat = dovData?.flatrate ?? [];
                const paid = [...(dovData?.rent ?? []), ...(dovData?.buy ?? [])].filter((p, i, a) => a.findIndex((x) => x.name === p.name) === i);
                if (flat.length === 0 && paid.length === 0) {
                  return (
                    <>
                      <div className="sub">Non risulta in streaming in Italia in questo momento.</div>
                      <button className="cta wide tap" style={{ marginTop: 16 }} onClick={() => { justwatch(dovItem); setDovItem(null); }}>Cerca su JustWatch</button>
                    </>
                  );
                }
                const groups = [
                  flat.length ? { label: "In abbonamento", ps: flat } : null,
                  paid.length ? { label: "Noleggio o acquisto", ps: paid } : null,
                ].filter(Boolean) as { label: string; ps: WatchProvider[] }[];
                return (
                  <>
                    {groups.map((g) => (
                      <div key={g.label}>
                        <div className="status" style={LAB}>{g.label}</div>
                        <div className="srf">
                          {g.ps.map((p) => rowAct(
                            p.logo
                              ? <Img src={p.logo} />
                              : I.play({ s: 16 }),
                            p.name,
                            g.label === "In abbonamento" ? "incluso" : "a noleggio o in acquisto",
                            () => {
                              const u = platformUrl(p.name, dovItem.title) || dovData?.link || `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(dovItem.title)}`;
                              window.open(u, "_blank", "noopener");
                            },
                          ))}
                        </div>
                      </div>
                    ))}
                    <button className="btn2 wide tap" style={{ marginTop: 16 }} onClick={() => { const u = dovData?.link; window.open(u || `https://www.justwatch.com/it/cerca?q=${encodeURIComponent(dovItem.title)}`, "_blank", "noopener"); setDovItem(null); }}>Altre opzioni</button>
                    <div className="status" style={{ textAlign: "center", marginTop: 10 }}>Dati TMDB · disponibilità Italia</div>
                  </>
                );
              })()}
            </div>
          </Sheet>
        )}

        {/* ── toast ──────────────────────────────────────────────────────────
            Il `.toast` del mock è solo testo centrato. Qui deve portare anche
            l'azione, perché l'eliminazione si annulla da lì: è la sola aggiunta
            al componente, e senza di lei si perde un comportamento. */}
        <div className={"toast" + (toast ? " on" : "")}>
          {toast?.msg}
          {toast?.action && (
            <button
              className="tert tap"
              style={{ marginLeft: 12, padding: 0 }}
              onClick={() => { toast.onAction?.(); setToast(null); }}
            >
              {toast.action}
            </button>
          )}
        </div>
      </div>

      {/* La barra di navigazione resta FUORI da .k2: è condivisa con le altre
          sezioni e il reset del foglio V2 (`.k2 *`) le toglierebbe i margini. */}
      <KeikoNav active="guarda" />
    </>
  );
}
