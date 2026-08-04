"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CaptureSheet from "@/components/CaptureSheet";
import KeikoNav, { PAGE_PB } from "./KeikoNav";
import EventSheet from "./EventSheet";
import AskSheet from "./AskSheet";
import DaySheet from "./DaySheet";
import ProfileSheet from "./ProfileSheet";
import InstallSheet from "./InstallSheet";
import Onboarding from "./Onboarding";
import { cosaMostrare, daProporre, type CosaMostrare } from "@/lib/install-client";
import CalendarSheet from "./CalendarSheet";
import SmartMedia from "@/components/SmartMedia";
import { catFor, glyphFor } from "@/lib/smart-image";
import type { LiveHome, LiveEvent } from "./keikoLive";
import "../../ds.css";

/* HOME v4 (Fase 2 — slice 1): nuova Home col design bloccato, dati VERI.
   Dietro ?v4 così è additiva (la Home attuale resta). Card unica + gradienti
   categoria (livello 0). Interazioni pesanti (pannello evento, ricerca) nella
   prossima slice. */

type LiveTodo = LiveHome["days"][string]["todos"][number];

function dayTitle(key: string): string {
  try { return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(new Date(key + "T00:00:00")); }
  catch { return key; }
}

export default function KeikoHomeV4({ live, demo = false, logoutAction, accountName }: { live: LiveHome; demo?: boolean; logoutAction?: () => Promise<void>; accountName?: string }) {
  const router = useRouter();
  const [capture, setCapture] = useState(false);
  const [selEv, setSelEv] = useState<LiveEvent | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [selDay, setSelDay] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [onboard, setOnboard] = useState(false);
  const [invito, setInvito] = useState<CosaMostrare>(null);   // K15
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState<{ tempC: number; emoji: string; text: string } | null>(null);

  // --- Undo elimina (lato interfaccia, differito 5s) ---
  // Quando elimini, l'elemento sparisce subito dalla UI ma sul server NON viene
  // toccato finché non scadono i 5 secondi. Se premi "Annulla" prima, torna
  // com'era (nessuna chiamata al DB). Niente colonne nuove, niente lib/.
  const [hidden, setHidden] = useState<string[]>([]);
  const [undo, setUndo] = useState<{ id: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef<null | (() => void)>(null);
  const notHidden = (x: { id: string }) => !hidden.includes(x.id);

  // --- Spunta immediata (#3) ---
  // Il database resta la verità, ma andata+ritorno durano un istante e in quel
  // istante il contatore "N da fare" mostrava ancora il numero vecchio. Qui
  // tengo la scelta appena fatta, così pallino e contatore cambiano nel momento
  // del tocco; quando arrivano i dati veri (router.refresh → nuovo `live`)
  // butto via l'override e torno alla verità del server.
  const [doneOv, setDoneOv] = useState<Record<string, boolean>>({});
  useEffect(() => { setDoneOv({}); }, [live]);
  const withOv = (t: LiveTodo): LiveTodo => (t.id in doneOv ? { ...t, done: doneOv[t.id] } : t);

  const realDelete = (kind: "todo" | "event", id: string) =>
    kind === "todo"
      ? fetch("/api/todos", { method: "DELETE", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) })
      : fetch("/api/delete", { method: "POST", headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify({ id }) });

  const flushPending = () => {
    if (undoTimer.current) { clearTimeout(undoTimer.current); undoTimer.current = null; }
    if (commitRef.current) { const c = commitRef.current; commitRef.current = null; c(); }
  };

  const requestDelete = (kind: "todo" | "event", id: string) => {
    if (demo) return;
    flushPending(); // se c'era già un'eliminazione in attesa, la confermo subito
    setHidden((h) => [...h, id]);
    setUndo({ id });
    const commit = () => {
      realDelete(kind, id).then(() => router.refresh()).catch(() => {});
      setUndo((u) => (u && u.id === id ? null : u));
      setHidden((h) => h.filter((x) => x !== id));
    };
    commitRef.current = commit;
    undoTimer.current = setTimeout(() => { undoTimer.current = null; commitRef.current = null; commit(); }, 5000);
  };

  const doUndo = () => {
    if (undoTimer.current) { clearTimeout(undoTimer.current); undoTimer.current = null; }
    commitRef.current = null;
    if (undo) setHidden((h) => h.filter((x) => x !== undo.id));
    setUndo(null);
  };

  // --- Deep-link ai pannelli (#1): l'URL descrive cosa è aperto ---
  //   /?ev=<id>          → apre la card di quell'evento
  //   /?day=YYYY-MM-DD   → apre il pannello di quel giorno
  // Così una notifica (sw.js apre già data.url) o un link condiviso portano
  // dritti alla cosa giusta. Lettura una volta al primo mount da
  // window.location (niente useSearchParams → niente Suspense); scrittura con
  // history.replaceState (non ricarica, non sporca la cronologia, non tocca ?v2).

  // cerca l'evento per id tra hero, in arrivo e agenda (l'agenda ha TUTTI i futuri)
  const eventById = (id: string): LiveEvent | null => {
    for (const pool of [live.heroEvents, live.upcoming, ...live.agenda.map((g) => g.events)]) {
      const f = pool.find((e) => e.id === id);
      if (f) return f;
    }
    return null;
  };

  const setUrlParam = (key: "ev" | "day", value: string | null) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("ev");
      url.searchParams.delete("day"); // mai entrambi insieme
      if (value) url.searchParams.set(key, value);
      window.history.replaceState(null, "", url);
    } catch { /* no-op */ }
  };

  const openEvent = (ev: LiveEvent) => { setSelEv(ev); setUrlParam("ev", ev.id); };
  const closeEvent = () => { setSelEv(null); setUrlParam("ev", null); };
  const openDay = (key: string) => { setSelDay(key); setUrlParam("day", key); };
  const closeDay = () => { setSelDay(null); setUrlParam("day", null); };

  // all'avvio: se l'URL contiene già ev/day, apri il pannello corrispondente
  useEffect(() => {
    if (demo) return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const ev = sp.get("ev");
      const day = sp.get("day");
      if (ev) {
        const found = eventById(ev);
        if (found) setSelEv(found);
        else setUrlParam("ev", null); // evento sparito (es. eliminato): pulisci l'URL
      } else if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
        setSelDay(day);
      }
    } catch { /* no-op */ }
    // Solo al primo mount: dopo, l'URL lo aggiornano open/close qui sopra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // nome + città salvati sul dispositivo
  useEffect(() => {
    try {
      const n = localStorage.getItem("keiko-name"); if (n) setName(n);
      const c = localStorage.getItem("keiko-city"); if (c) setCity(c);
      if (!localStorage.getItem("keiko-onboarded")) setOnboard(true);
    } catch { /* no-op */ }
  }, []);
  // K15 — l'invito ad aggiungere Keiko alla schermata Home (e poi gli avvisi).
  // Arriva DOPO l'onboarding e dopo un attimo: la regola è che l'atmosfera viene
  // dopo il momento wow, mai prima. L'attesa serve anche ad Android, che lancia
  // il suo invito a installare qualche istante dopo il caricamento.
  useEffect(() => {
    if (demo || onboard) return;
    try { if (!localStorage.getItem("keiko-onboarded")) return; } catch { return; }
    if (!daProporre()) return;
    const t = setTimeout(() => setInvito(cosaMostrare()), 1500);
    return () => clearTimeout(t);
  }, [demo, onboard]);

  const saveName = (v: string) => { setName(v); try { localStorage.setItem("keiko-name", v); } catch { /* no-op */ } };
  const saveCity = (v: string) => { setCity(v); try { localStorage.setItem("keiko-city", v); } catch { /* no-op */ } };

  // meteo di oggi per la città (Open-Meteo, gratis)
  useEffect(() => {
    if (!city.trim()) { setWeather(null); return; }
    let ok = true;
    fetch(`/api/weather?place=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((w) => { if (ok) setWeather(w && typeof w.tempC === "number" ? w : null); })
      .catch(() => {});
    return () => { ok = false; };
  }, [city]);
  const greeting = name.trim() ? `Ciao ${name.trim()} 👋` : live.greeting;
  const todayN = live.week.find((d) => d.today)?.n ?? null;
  const todayKey = live.week.find((d) => d.today)?.key ?? null;
  const todayTodos = todayKey ? (live.days[todayKey]?.todos ?? []).filter(notHidden).map(withOv) : [];
  const openTodos = todayTodos.filter((t) => !t.done).length;

  // azioni to-do del pannello giorno: riusa /api/todos + ricarica i dati veri
  const todoFetch = async (method: string, body: object) => {
    if (demo) return;
    try { await fetch("/api/todos", { method, headers: { "content-type": "application/json" }, credentials: "include", body: JSON.stringify(body) }); router.refresh(); } catch { /* offline: nessun dato finto */ }
  };

  // spunta: prima cambia sotto il dito, poi va al server
  const toggleTodo = (id: string, done: boolean) => {
    if (demo) return;
    setDoneOv((m) => ({ ...m, [id]: done }));
    todoFetch("PATCH", { id, done });
  };

  const heroEvents = live.heroEvents.filter(notHidden);
  const upcoming = live.upcoming.filter(notHidden);
  const heroEv = heroEvents[0] ?? upcoming[0] ?? null;
  const inArrivo = (heroEv ? upcoming : upcoming.slice(1)).slice(0, 6);

  // riepilogo giornata
  const nEventiOggi = heroEvents.length;
  const gym = live.gym;
  const gymTxt = gym
    ? gym.trainedToday
      ? "💪 allenamento fatto"
      : gym.rest
        ? "🌙 riposo"
        : "💪 allenamento da fare"
    : null;

  // Dati del giorno selezionato, ripuliti degli elementi in attesa di eliminazione.
  const selRaw = selDay ? (live.days[selDay] ?? null) : null;
  const selTodos = selRaw ? selRaw.todos.filter(notHidden).map(withOv) : [];
  const selDayData = selRaw ? {
    ...selRaw,
    events: selRaw.events.filter(notHidden),
    todos: selTodos,
    counts: {
      ...selRaw.counts,
      eventi: selRaw.events.filter(notHidden).length,
      todo: selTodos.filter((t) => !t.done).length,
      fatti: selTodos.filter((t) => t.done).length,
    },
  } : null;

  const go = (href: string) => { if (!demo) router.push(href); };  // in anteprima pubblica i tap sono inerti (niente redirect a login)

  return (
    <div
      className="ds"
      style={{ minHeight: "100dvh", background: "var(--k-bg)", padding: `0 20px ${PAGE_PB}`, maxWidth: 440, margin: "0 auto" }}
    >
      {/* topbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 12, margin: "0 -20px", padding: "calc(env(safe-area-inset-top) + 12px) 20px 12px", background: "rgba(11,13,18,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <span className="ds-display" style={{ fontSize: 22, color: "var(--k-text)" }}>
          kei<span style={{ color: "var(--k-accent)" }}>ko</span>
        </span>
        <div
          onClick={() => { if (!demo) setAskOpen(true); }}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "10px 14px", color: "var(--k-text-3)", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Chiedi a Keiko…
        </div>
        <button onClick={() => setProfileOpen(true)} aria-label="Profilo" style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", background: "linear-gradient(135deg,#3a2f22,#241d15)", border: "1px solid var(--k-line)", display: "grid", placeItems: "center", fontSize: 15, cursor: "pointer" }}>🐋</button>
      </div>

      {/* saluto */}
      <button onClick={() => setCalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, padding: 0, margin: "0 0 4px", color: "var(--k-text-3)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
        {live.kickDate}
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
        {weather && <span style={{ color: "var(--k-text-2)", marginLeft: 2 }}>· {weather.emoji} {weather.tempC}°</span>}
      </button>
      <h1 className="ds-display" style={{ fontSize: 24, lineHeight: 1.06, margin: "0 0 8px", color: "var(--k-text)" }}>{greeting}</h1>
      <div style={{ fontSize: 13, color: "var(--k-text-2)", fontWeight: 500, margin: "0 0 20px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        Oggi
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--k-text-3)" }} />
        {nEventiOggi} event{nEventiOggi === 1 ? "o" : "i"}
        {gymTxt && <><span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--k-text-3)" }} /><span style={{ color: gym?.trainedToday ? "var(--k-ok)" : "var(--k-text-2)" }}>{gymTxt}</span></>}
      </div>

      {/* week strip */}
      <div style={{ display: "flex", gap: 6, margin: "0 0 24px" }}>
        {live.week.slice(0, 7).map((d) => (
          <div key={d.key} onClick={() => openDay(d.key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "9px 0", borderRadius: 16, background: d.today ? "var(--k-accent)" : "transparent", cursor: "pointer" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", color: d.today ? "var(--k-accent-ink)" : "var(--k-text-3)" }}>{d.w.toUpperCase()}</span>
            <b style={{ fontSize: 16, fontWeight: 600, color: d.today ? "var(--k-accent-ink)" : "var(--k-text-2)" }}>{d.n}</b>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: d.d1 ? (d.today ? "var(--k-accent-ink)" : "var(--k-accent)") : "transparent" }} />
          </div>
        ))}
      </div>

      {/* HERO */}
      {heroEv && (
        <EventCard ev={heroEv} variant="hero" onOpen={() => openEvent(heroEv)} />
      )}

      {/* In arrivo */}
      {inArrivo.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", margin: "32px 2px 16px", color: "var(--k-text-3)" }}>In arrivo <span style={{ fontWeight: 600, fontSize: 12.5, color: "var(--k-text-3)" }}>· {inArrivo.length}</span></h2>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", margin: "0 -18px", padding: "0 18px 4px", scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            {inArrivo.map((ev) => (
              <div key={ev.id} style={{ minWidth: 214, flex: "none", scrollSnapAlign: "start" }}>
                <EventCard ev={ev} variant="mini" onOpen={() => openEvent(ev)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Oggi per te */}
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", margin: "32px 2px 16px", color: "var(--k-text-3)" }}>Oggi per te</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {gym && (
          <SmartMedia variant="square" category="sport" chip="💪 Allenamento" glyph="🏋️" style={{ aspectRatio: "4 / 3" }}
            image={gym.image ?? undefined}
            title={gym.title} meta={<>{gym.trainedToday ? "Fatto" : gym.rest ? "Riposo 🌙" : `${gym.done}/${gym.total}`}</>}
            onClick={() => go("/allenamento")} />
        )}
        {live.diet && (
          <SmartMedia variant="square" category="dieta" chip="🥗 Dieta" chipAmber glyph="🥗" style={{ aspectRatio: "4 / 3" }}
            image={live.diet.image ?? undefined}
            title={live.diet.nextPasto ?? "Dieta"} meta={live.diet.nextOpt ?? undefined}
            onClick={() => go("/salute")} />
        )}
        {live.trip && (
          <SmartMedia variant="square" category="viaggio" chip="🧭 Viaggio" glyph="🧭" style={{ aspectRatio: "4 / 3" }}
            image={live.trip.image ?? undefined}
            title={live.trip.title} meta={<><span className="k">{live.trip.range}</span></>}
            onClick={() => go("/viaggio")} />
        )}
        {live.watch && (
          <SmartMedia variant="square" category="film" chip="🍿 Guarda" glyph="🍿" style={{ aspectRatio: "4 / 3" }}
            image={live.watch.poster ?? undefined}
            title={live.watch.title ?? "Da guardare"} meta={live.watch.sub ?? `${live.watch.count} titoli`}
            onClick={() => go("/guarda")} />
        )}
      </div>

      {/* Da fare oggi (to-do del giorno) */}
      {todayTodos.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", margin: "32px 2px 16px", color: "var(--k-text-3)" }}>
            Da fare oggi{openTodos > 0 && <span style={{ fontWeight: 600, fontSize: 12.5 }}> · {openTodos}</span>}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todayTodos.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 14 }}>
                <button onClick={() => toggleTodo(t.id, !t.done)} aria-label="Fatto" disabled={demo} style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", border: t.done ? "0" : "2px solid var(--k-text-3)", background: t.done ? "var(--k-accent)" : "transparent", color: "var(--k-accent-ink)", fontSize: 13, fontWeight: 800, cursor: demo ? "default" : "pointer", display: "grid", placeItems: "center" }}>{t.done ? "✓" : ""}</button>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: t.done ? "var(--k-text-3)" : "var(--k-text)", textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                {t.time && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--k-accent)" }}>{t.time}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* bottom nav — barra condivisa (unica implementazione, vedi KeikoNav) */}
      <KeikoNav active="home" demo={demo} onAdd={() => setCapture(true)} />

      <CaptureSheet open={capture} onClose={() => setCapture(false)} />
      {selEv && <EventSheet ev={selEv} onClose={closeEvent} demo={demo} onDelete={() => requestDelete("event", selEv.id)} />}
      {askOpen && <AskSheet onClose={() => setAskOpen(false)} />}
      {selDay && (
        <DaySheet
          title={live.days[selDay]?.title ?? dayTitle(selDay)}
          day={selDayData}
          demo={demo}
          onClose={closeDay}
          onToggle={toggleTodo}
          onStar={(id, star) => todoFetch("PATCH", { id, star })}
          onDelete={(id) => requestDelete("todo", id)}
          onAdd={(text) => todoFetch("POST", { day: selDay, text })}
          onSetLead={(id, lead) => todoFetch("PATCH", { id, lead })}
          onSetDouble={(id, double) => todoFetch("PATCH", { id, double })}
          /* #1: le righe evento del pannello giorno erano finte — toccarle non
             faceva niente. Qui il pannello passa l'id, la Home trova l'evento
             intero e apre la sua card (con lo stesso deep-link ?ev=). */
          onOpenEvent={(id) => { const f = eventById(id); if (f) { closeDay(); openEvent(f); } }}
          canOpenEvent={(id) => eventById(id) !== null}
        />
      )}
      {profileOpen && (
        <ProfileSheet
          name={name} onName={saveName} city={city} onCity={saveCity}
          onClose={() => setProfileOpen(false)} logoutAction={logoutAction}
          onRivediOnboarding={() => {
            try { localStorage.removeItem("keiko-onboarding-passo"); } catch { /* no-op */ }
            setProfileOpen(false);
            setOnboard(true);
          }}
        />
      )}
      {invito && !profileOpen && <InstallSheet modo={invito} onClose={() => setInvito(null)} />}
      {onboard && !demo && (
        <Onboarding
          accountName={accountName}
          name={name}
          city={city}
          onName={saveName}
          onCity={saveCity}
          onDone={(haSalvatoEvento) => {
            try { localStorage.setItem("keiko-onboarded", "1"); } catch { /* no-op */ }
            setOnboard(false);
            // L'evento della schermata 2 è già nel database: senza questo la home
            // resterebbe quella caricata prima, cioè vuota.
            if (haSalvatoEvento) router.refresh();
          }}
        />
      )}
      {calOpen && (
        <CalendarSheet
          baseY={live.cal.y}
          baseM={live.cal.m}
          dots={live.cal.dots}
          todayN={todayN}
          onPickDay={(key) => { setCalOpen(false); openDay(key); }}
          onClose={() => setCalOpen(false)}
        />
      )}

      {/* Toast "Annulla" per l'eliminazione (resta visibile ~5s, anche sopra i pannelli) */}
      {undo && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: "calc(96px + env(safe-area-inset-bottom))", zIndex: 120, display: "flex", justifyContent: "center", padding: "0 20px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 14, width: "100%", maxWidth: 440, background: "var(--k-surface-2)", border: "1px solid var(--k-line)", borderRadius: 14, padding: "12px 16px", boxShadow: "0 8px 30px rgba(0,0,0,.45)" }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--k-text)" }}>Eliminato</span>
            <button onClick={doUndo} style={{ background: "none", border: 0, color: "var(--k-accent)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ ev, variant, onOpen }: { ev: LiveEvent; variant: "hero" | "mini"; onOpen: () => void }) {
  const category = catFor(ev.type, ev.title);
  const chipLabel = `${ev.emoji || glyphFor(category)} ${ev.catLabel}`;
  return (
    <SmartMedia
      variant={variant}
      category={category}
      image={ev.image ?? undefined}
      chip={chipLabel}
      glyph={ev.emoji || glyphFor(category)}
      display={variant === "hero"}
      title={ev.title}
      meta={<><span className="k">{ev.when}</span>{ev.location ? ` · ${ev.location.split(",")[0]}` : ""}</>}
      onClick={onOpen}
    />
  );
}
