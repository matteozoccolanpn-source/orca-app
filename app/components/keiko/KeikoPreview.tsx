"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CaptureSheet from "@/components/CaptureSheet";
import AgendaView from "./AgendaView";
import DayPanel from "./DayPanel";
import { type LiveEvent, type LiveHome, mapsUrl } from "./keikoLive";
import { EventForm, toDatetime, splitDatetime, type EventFormValue } from "@/app/components/EventForm";
import "../../keiko.css";

// Marcatore di build: cambiare a ogni fix da verificare sul telefono. Con `?debug`
// compare in alto (build + tap + mood): se il telefono NON mostra questo valore,
// sta ricevendo un bundle vecchio (service worker/cache), non il fix appena fatto.
const BUILD = "v2.4-search";

/* ==================================================================== *
 * KEIKO — TAPPA 1: home nuova con DATI FINTI del mockup keiko-final.html
 * Portata 1:1 (stesse classi, stessa struttura DOM). I dati stanno negli
 * oggetti qui sotto: in TAPPA 2 si sostituisce la sorgente, non la UI/CSS.
 * ==================================================================== */

/* ---- icone categoria (i .ci del mockup) ---- */
function CatIcon({ k }: { k: string }) {
  const p: Record<string, React.ReactNode> = {
    treno: (<><rect x="6" y="3" width="12" height="12" rx="3" /><path d="M6 9h12M9 15l-2 5M15 15l2 5M9.5 12h.01M14.5 12h.01" /></>),
    cena: (<path d="M7 3v6a2 2 0 0 0 2 2v10M11 3v6a2 2 0 0 1-2 2M17 3c-1.8 1.6-2.5 4.2-2.5 6.5 0 1.8.9 2.5 2.5 2.5v9" />),
    gp: (<path d="M5.5 21V4c3.6-1.8 7.4 1.8 11 0v10.5c-3.6 1.8-7.4-1.8-11 0" strokeLinejoin="round" />),
    volo: (<path d="M21 12 3.5 5l2.7 6.3L3.5 19 21 12Z" strokeLinejoin="round" />),
    concerto: (<><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>),
  };
  return (
    <svg className="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {p[k]}
    </svg>
  );
}
const Pin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" width="11" height="11">
    <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" /><circle cx="12" cy="10.5" r="2" />
  </svg>
);
const Whale = () => (
  <svg viewBox="0 0 100 72" fill="currentColor">
    <path fillRule="evenodd" d="M10 54 C16 40 32 32 50 32 C58 32 66 34 72 38 C78 34 85 32 92 33 C90 39 86 44 81 47 C80 54 74 60 64 62 C48 66 20 64 10 54 Z M82.2 40 A6.5 3.4 -18 1 0 69.8 42 A6.5 3.4 -18 1 0 82.2 40 Z" />
    <path d="M44 34 C43 22 47 10 56 2 C57 14 54 26 50 34 Z" />
  </svg>
);

/* ---- DATI FINTI (dal mockup) ---- */
type Ev = {
  art: string; artH: number; glyph?: string; live: string; title: string;
  narr: string; paper: string; src: string; tips: string[]; acts: [string, string][]; mapsQ?: string;
};

// live: costruisce il contenuto del pannello dai campi reali dell'evento.
function liveToPanel(e: LiveEvent): Ev {
  const paper = e.route
    ? `<div class="bigTkt"><div class="row1"><div class="qrbox"></div><div><div class="tt">${e.title}</div><div class="ss">${e.location || "biglietto"}</div></div></div><div class="meta2"><div class="m2"><div class="k2">Ora</div><div class="v2">${e.time}</div></div><div class="m2"><div class="k2">Da</div><div class="v2">${e.route.dep}</div></div><div class="m2"><div class="k2">A</div><div class="v2">${e.route.arr}</div></div></div></div>`
    : `<div class="bigTkt"><div class="row1"><div style="font-size:34px">${e.emoji}</div><div><div class="tt">${e.title}</div><div class="ss">${e.location || ""}</div></div></div><div class="meta2"><div class="m2"><div class="k2">Ora</div><div class="v2">${e.time}</div></div></div></div>`;
  return {
    art: e.art, artH: 205, live: e.panelLive, title: e.panelTitle,
    narr: e.location ? `${e.catLabel} · ${e.location}.` : "",
    paper, src: "", tips: [], acts: [["acc", "📍 Maps"]], mapsQ: e.mapsQ,
  };
}
const EVENTS: Record<string, Ev> = {
  treno: {
    art: "train", artH: 250, glyph: "🚄", live: "OGGI · TRENO", title: "Parti alle 18:05.",
    narr: 'Binario 14, carrozza 7, posto <b>11D</b>. Esci alle <em>17:20</em>: M2 fino a Centrale e 8 minuti a piedi. Alle <b>21:10</b> sei a Termini — ti aspettano <b>24°</b> e Giulia 😄',
    paper: '<div class="bigTkt"><div class="row1"><div class="qrbox"></div><div><div class="tt">Trenitalia · Frecciarossa 9423</div><div class="ss">PNR X4KJ2M · mostra al controllore</div></div></div><div class="meta2"><div class="m2"><div class="k2">Partenza</div><div class="v2">18:05</div></div><div class="m2"><div class="k2">Binario</div><div class="v2">14</div></div><div class="m2"><div class="k2">Posto</div><div class="v2">7 · 11D</div></div></div></div>',
    src: "Binario e orari aggiornati 2 minuti fa",
    tips: ["🚇 Ultima metro per il rientro: 00:12", "🎒 Carrozza 7 è in testa al treno", "🥤 A bordo niente carrello: prendi l'acqua prima"],
    acts: [["acc", "📍 Maps"], ["line", "💬 WhatsApp"], ["line", "🧭 Vedi itinerario"]],
  },
  cena: {
    art: "dinner", artH: 205, glyph: "🍝", live: "STASERA · CENA", title: "Alle 21:45 con Giulia.",
    narr: '<b>Da Enzo al 29</b>, Trastevere — dieci minuti a piedi da Termini, valigia compresa. Tavolo per due, sala interna. Se il treno ritarda, <em>Keiko avvisa il ristorante</em>.',
    paper: '<div class="bigTkt"><div class="row1"><div style="font-size:34px">🍝</div><div><div class="tt">Prenotazione · Da Enzo al 29</div><div class="ss">via dei Vascellari 29, Roma · conferma #R482</div></div></div><div class="meta2"><div class="m2"><div class="k2">Ora</div><div class="v2">21:45</div></div><div class="m2"><div class="k2">Persone</div><div class="v2">2</div></div><div class="m2"><div class="k2">Sala</div><div class="v2">Interna</div></div></div></div>',
    src: "Prenotazione confermata · controllata 1 ora fa",
    tips: ["🍝 Da Enzo vai di carbonara, fidati", "💶 Solo contanti — c'è un ATM a 100 m", "🍨 Dopo: gelato da Otaleg, 200 m a piedi"],
    acts: [["acc", "📍 Maps"], ["line", "💬 Scrivi a Giulia"], ["line", "🕘 Sposta"]],
  },
  volo: {
    art: "flightA", artH: 205, glyph: "✈️", live: "VEN 11 · VOLO", title: "Londra, si parte alle 6:00.",
    narr: 'Ryanair <b>FR1546</b> da Malpensa T2. Sveglia presto: esci alle <em>4:10</em>. Il check-in apre giovedì — <em>ci pensa Keiko</em> e la carta d\'imbarco comparirà qui.',
    paper: '<div class="bigTkt"><div class="row1"><div class="qrbox"></div><div><div class="tt">Carta d\'imbarco · FR1546</div><div class="ss">disponibile da giovedì · Keiko ti avvisa</div></div></div><div class="meta2"><div class="m2"><div class="k2">Da</div><div class="v2">MXP T2</div></div><div class="m2"><div class="k2">A</div><div class="v2">STN</div></div><div class="m2"><div class="k2">Ore</div><div class="v2">6:00</div></div></div></div>',
    src: "Orari volo aggiornati 10 minuti fa",
    tips: ["🎒 Solo bagaglio a mano: 40×20×25", "⏰ Sveglia consigliata: 3:40", "🛂 Gate noto 2 h prima — ti avviso io"],
    acts: [["acc", "✅ Check-in"], ["line", "📍 Maps"]],
  },
  concerto: {
    art: "concertA", artH: 205, glyph: "🎤", live: "SAB 19 · CONCERTO", title: "Cremonini a San Siro.",
    narr: 'Anello verde, ingresso 7 — si entra dalle <b>19:00</b>, con Giulia. I biglietti sono qui sotto, <em>già pronti da mostrare</em>.',
    paper: '<div class="bigTkt"><div class="row1"><div class="qrbox"></div><div><div class="tt">2 × Biglietto · San Siro</div><div class="ss">Anello verde · ingresso 7 · fila 12</div></div></div><div class="meta2"><div class="m2"><div class="k2">Apertura</div><div class="v2">19:00</div></div><div class="m2"><div class="k2">Inizio</div><div class="v2">21:00</div></div><div class="m2"><div class="k2">Posti</div><div class="v2">12A · 12B</div></div></div></div>',
    src: "Biglietti verificati ieri",
    tips: ["🚪 Cancelli aperti dalle 19:00", "🧥 La sera scende a 16°: giacca", "🚇 Ultima metro dopo il concerto: 00:12"],
    acts: [["acc", "📍 Maps"], ["line", "📤 Condividi"]],
  },
  gp: {
    art: "sportA", artH: 165, glyph: "🏎️", live: "DOM · 16:00 · SKY", title: "Silverstone, si corre alle 16.",
    narr: 'Su <b>Sky Sport F1</b>. Norris ci arriva da leader del mondiale — sotto la classifica aggiornata.',
    paper: '<div class="standBox"><div class="standing"><span class="pos">1</span><div><div class="nm">L. Norris</div><div class="tm">McLaren</div></div><span class="pt">212 pt</span></div><div class="standing"><span class="pos">2</span><div><div class="nm">M. Verstappen</div><div class="tm">Red Bull</div></div><span class="pt">198 pt</span></div><div class="standing"><span class="pos">3</span><div><div class="nm">C. Leclerc</div><div class="tm">Ferrari</div></div><span class="pt">184 pt</span></div></div>',
    src: "Classifica aggiornata 5 minuti fa",
    tips: ["📺 Sky Sport F1 · canale 207", "⏱ Qualifiche sabato 15:00", "🥗 Cena leggera pre-gara 😄"],
    acts: [["acc", "🔔 Ricordamelo"], ["line", "🏁 Classifica"]],
  },
};

export default function KeikoPreview({ live, logoutAction }: { live?: LiveHome; logoutAction?: () => Promise<void> }) {
  const isLive = !!live;
  const [capture, setCapture] = useState(false);
  const [name, setName] = useState("");
  const [editVal, setEditVal] = useState<EventFormValue | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [askQ, setAskQ] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askRes, setAskRes] = useState<{
    events: { id: string; title: string; type: string; datetime: string; location: string | null }[];
    todos: { id: string; text: string; day: string; time: string | null; location: string | null }[];
  } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [evKey, setEvKey] = useState<string | null>(null);
  const [evFull, setEvFull] = useState(false);
  const [views, setViews] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState(0);
  const [peekKey, setPeekKey] = useState<string | null>(null);
  const [selDay, setSelDay] = useState<string | null>(null);
  const [debug, setDebug] = useState(false);
  const [exOpen, setExOpen] = useState(false);
  const [exDone, setExDone] = useState<boolean[]>(Array(6).fill(false));
  const [cd, setCd] = useState("—");
  const [cdD, setCdD] = useState("stasera");
  const [calYM, setCalYM] = useState(live ? { y: live.cal.y, m: live.cal.m } : { y: 2026, m: 6 }); // mese base (mockup: luglio 2026)
  const toastT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const screenRef = useRef<HTMLDivElement>(null);

  // iOS Safari non fa scattare il "click" su <div> con handler React (delegato):
  // un listener touchstart vuoto sul document abilita i click su ogni elemento.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    try {
      if (new URLSearchParams(window.location.search).has("debug")) setDebug(true);
      const nm = localStorage.getItem("keiko-name"); if (nm) setName(nm);
      // apertura pannello evento da altra pagina: /?v2#ev=<ticketId> (es. "Vedi biglietto" da /viaggio)
      const m = window.location.hash.match(/^#ev=(.+)$/);
      if (m) { setEvKey(decodeURIComponent(m[1])); history.replaceState(null, "", window.location.pathname + window.location.search); }
    } catch { /* noop */ }
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  const toast = (msg: string) => {
    setToastMsg(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(null), 1900);
  };
  // Tema scuro unico: il vecchio toggle "mood chiaro/scuro" è stato rimosso.
  // Ricerca base "Cerca in Keiko": interroga /api/search sui tuoi eventi + to-do.
  function fmtWhen(dt: string) {
    try { return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(new Date(dt)); }
    catch { return dt; }
  }
  function fmtDay(d: string, t: string | null) {
    try {
      const s = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" }).format(new Date(`${d}T12:00:00`));
      return t ? `${s} · ${t}` : s;
    } catch { return d; }
  }
  async function runSearch(qArg?: string) {
    const q = (qArg ?? askQ).trim();
    if (!q) return;
    setAskBusy(true);
    try {
      const r = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) });
      const data = await r.json();
      setAskRes(r.ok ? data : { events: [], todos: [] });
    } catch { setAskRes({ events: [], todos: [] }); }
    finally { setAskBusy(false); }
  }

  const openCal = () => openV("calPanel");
  const closeCal = () => closeV("calPanel");
  const openEvent = (k: string) => { setEvKey(k); setEvFull(false); };
  const closeEvent = () => setEvKey(null);

  // Sposta / Modifica evento reale: pre-riempie il form dai dati veri e salva su /api/update.
  function openEdit(e: LiveEvent) {
    const { date, time } = splitDatetime(e.datetime);
    setEditId(e.id);
    setEditVal({ title: e.title, type: e.type, date, time, location: e.location, reference: "" });
  }
  function closeEdit() { setEditVal(null); setEditId(null); }
  async function saveEdit() {
    if (!editVal || !editId) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editId, title: editVal.title, type: editVal.type,
          datetime: toDatetime(editVal), location: editVal.location, reference: editVal.reference,
        }),
      });
      if (!res.ok) throw new Error();
      closeEdit(); closeEvent(); toast("Aggiornato ✓"); router.refresh();
    } catch {
      window.alert("Non sono riuscito a salvare, riprova");
    } finally {
      setSavingEdit(false);
    }
  }
  const openV = (id: string) => setViews((v) => ({ ...v, [id]: true }));
  const closeV = (id: string) => setViews((v) => ({ ...v, [id]: false }));
  const homeTab = () => { setViews({}); setEvKey(null); setTab(0); };

  // azioni to-do reali del day panel (guardia): /api/todos + refresh dei dati server.
  const router = useRouter();
  const dayTodos = live && selDay ? (live.days[selDay]?.todos ?? []) : [];
  const todoFetch = async (method: string, body: object) => {
    try { await fetch("/api/todos", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); router.refresh(); } catch { /* offline: il refresh non parte, nessun dato finto */ }
  };
  const onToggleTodo = (id: string) => todoFetch("PATCH", { id, done: !dayTodos.find((t) => t.id === id)?.done });
  const onStarTodo = (id: string) => todoFetch("PATCH", { id, star: !dayTodos.find((t) => t.id === id)?.star });
  const onDeleteTodo = (id: string) => todoFetch("DELETE", { id });
  const onAddTodo = (text: string) => { if (selDay) todoFetch("POST", { day: selDay, text }); };
  const onEditTime = (id: string) => {
    const cur = dayTodos.find((t) => t.id === id)?.time ?? "";
    const nv = window.prompt("Orario del promemoria (HH:MM)", cur);
    if (nv != null) todoFetch("PATCH", { id, time: nv.trim() || null });
  };

  // countdown identico al mockup
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const dep = new Date(); dep.setHours(18, 5, 0, 0);
      const m = Math.floor((dep.getTime() - now.getTime()) / 60000);
      setCd("M2 verso Centrale · " + (m > 0 ? `treno tra ${Math.floor(m / 60)} h ${m % 60} m` : "buon viaggio! 🚄"));
      const din = new Date(); din.setHours(21, 45, 0, 0);
      const md = Math.floor((din.getTime() - now.getTime()) / 60000);
      setCdD(md > 0 ? `tra ${Math.floor(md / 60)} h ${md % 60} m` : "in corso 🍝");
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, []);

  const exToggle = (i: number) => {
    setExDone((d) => {
      const n = [...d]; n[i] = !n[i];
      const done = n.filter(Boolean).length;
      if (done === 6) toast("Push day chiuso. Grande 💪🔥");
      return n;
    });
  };
  const doneCount = exDone.filter(Boolean).length;

  const peekData: Record<string, { t: string; r: string[] }> = {
    "ven 3": { t: "Venerdì 3", r: ["<b>18:05</b> 🚄 Frecciarossa per Roma", "<b>21:45</b> 🍝 Cena con Giulia", "<b>17:30</b> ✓ Ritira il pacco"] },
    "dom 5": { t: "Domenica 5", r: ["<b>16:00</b> 🏎️ GP Gran Bretagna · Sky"] },
    "mar 7": { t: "Martedì 7", r: ["<b>15:00</b> ✓ Richiama il dentista"] },
  };

  const dim = evKey !== null || ["dayPanel", "addSheet", "actSheet", "shareSheet", "confirmSheet", "calPanel"].some((id) => views[id]);
  const liveEv = live && evKey ? ([...live.heroEvents, ...live.upcoming].find((e) => e.id === evKey) ?? null) : null;
  const ev = live ? (liveEv ? liveToPanel(liveEv) : null) : (evKey ? EVENTS[evKey] : null);
  const panelIcon = live ? (liveEv?.iconKey ?? "treno") : (evKey ?? "treno");

  // settimana: finta (2 settimane dal mockup) o vera (14 giorni da oggi).
  const fakeDays: [string, number, string?][] = [
    ["gio", 2], ["ven", 3, "d12"], ["sab", 4], ["dom", 5, "d1"], ["lun", 6], ["mar", 7, "d2"], ["mer", 8],
    ["gio", 9], ["ven", 10], ["sab", 11, "d1"], ["dom", 12], ["lun", 13], ["mar", 14], ["mer", 15],
  ];
  const weekDays = live
    ? live.week.map((x) => ({ w: x.w, n: x.n, key: x.key, today: x.today, d1: x.d1, d2: x.d2 }))
    : fakeDays.map(([w, n, dc]) => ({ w, n, key: `${w} ${n}`, today: n === 3, d1: dc === "d1" || dc === "d12", d2: dc === "d2" || dc === "d12" }));

  // calendario mensile
  const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  const calBaseY = live ? live.cal.y : 2026;
  const calBaseM = live ? live.cal.m : 6;
  const isBaseMonth = calYM.y === calBaseY && calYM.m === calBaseM;
  const calDots = isBaseMonth ? (live ? live.cal.dots : [3, 5, 11, 19]) : [];
  const calTodayN = live ? new Date().getDate() : 3; // giorno evidenziato nel mese base
  const calLead = (new Date(calYM.y, calYM.m, 1).getDay() + 6) % 7; // celle vuote iniziali (lun=0)
  const calDaysN = new Date(calYM.y, calYM.m + 1, 0).getDate();
  const shiftMonth = (d: number) => setCalYM(({ y, m }) => { const t = m + d; return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 }; });

  return (
    <div className="keiko" id="phone">
      <div className="screen" id="screen" ref={screenRef}>

        {/* barra alta */}
        <div className="topbar">
          <span className="logo" onClick={() => screenRef.current?.scrollTo({ top: 0, behavior: "smooth" })}><Whale /></span>
          <div className="ask" onClick={() => openV("askFull")}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <b>Cerca in Keiko</b>
          </div>
          <button type="button" className="icoBtn" onClick={openCal} title="Calendario">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
          </button>
          <button type="button" className="icoBtn" onClick={() => openV("profile")} title="Profilo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-3.6 3.6-6 8-6s8 2.4 8 6" /></svg>
          </button>
        </div>

        {/* settimana — scorrevole su più settimane (v2.1), peek fuori dallo scroll */}
        <div className="weekWrap">
          <div className="week" id="week">
            {weekDays.map((d) => (
              <div key={d.key} className={`day${d.today ? " today" : ""}`} onClick={() => setPeekKey(peekKey === d.key ? null : d.key)}>
                <span>{d.w}</span><b>{d.n}</b><span className="dots">{d.d1 && <i className="d1" />}{d.d2 && <i className="d2" />}</span>
              </div>
            ))}
          </div>
          <div className={`peek${peekKey ? " open" : ""}`} id="peekBox">
            <h5 id="peekTitle">{peekKey ? ((live ? live.byDay[peekKey]?.title : peekData[peekKey]?.t) ?? peekKey) : "Venerdì 3"}</h5>
            <div id="peekRows">
              {(() => {
                if (!peekKey) return null;
                const rows = live ? (live.byDay[peekKey]?.rows ?? []) : (peekData[peekKey]?.r ?? []);
                return rows.length ? rows.map((x, i) => <div key={i} className="row" dangerouslySetInnerHTML={{ __html: x }} />) : <div className="row">Giornata libera 🌿</div>;
              })()}
            </div>
            <button className="openBtn" onClick={() => { setSelDay(peekKey); openV("dayPanel"); setPeekKey(null); }}>Apri il giorno →</button>
          </div>
        </div>

        {/* kicker — la data apre il calendario mensile (v2.1) */}
        <div className="kick">
          <div className="over kickCal" onClick={openCal}>{live ? live.kickDate : "Venerdì 3 luglio · Roma 24° ☀️"} <span className="calGo">›</span></div>
          <h1>{name ? `Ciao ${name} 👋` : (live ? live.greeting : "Ciao Matteo 👋")}</h1>
          <div className="lede">{live ? live.lede : "Stasera Roma con Giulia: treno alle 18:05, poi cena da Enzo."}</div>
        </div>

        {/* hero — solo eventi di oggi (regola). Live: dai dati veri, compatta il resto. */}
        {isLive && live.heroEvents.length > 0 && (
          <>
            <div className="heroRow" id="heroRow">
              {live.heroEvents.map((e) => (
                <HeroLive key={e.id} e={e} onOpen={() => openEvent(e.id)} onActs={() => openV("actSheet")} />
              ))}
            </div>
            {live.heroEvents.length > 1 && <div className="dotsRow">{live.heroEvents.map((e, i) => <i key={e.id} className={i === 0 ? "on" : ""} />)}</div>}
          </>
        )}
        {!isLive && (<>
        <div className="heroRow" id="heroRow">
          <div className="hero rise" onClick={() => openEvent("treno")}>
            <div className="art train" />
            <div className="shade" />
            <button className="more" onClick={(e) => { e.stopPropagation(); openV("actSheet"); }}>⋯</button>
            <div className="head">
              <span className="catL"><span className="pulse" /><CatIcon k="treno" />Treno · oggi</span>
              <h2>Frecciarossa per Roma</h2>
              <div className="meta">2 h 55 min · arrivo 21:10 a Termini</div>
              <div className="nowLine" onClick={(e) => { e.stopPropagation(); toast("Apro Maps: da casa a Milano Centrale 🗺️"); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"><path d="M12 3 19.5 20.5 12 16.5 4.5 20.5 12 3Z" strokeLinejoin="round" /></svg>
                <span id="cd">{cd}</span>
              </div>
            </div>
            <div className="tkt">
              <div className="route">
                <div className="times">18:05<i />21:10</div>
                <div className="stn"><span>MI Centrale</span><span>RM Termini</span></div>
              </div>
              <div className="side">
                <span className="maps" onClick={(e) => { e.stopPropagation(); toast("Apro Maps: percorso per Centrale 🗺️"); }}><Pin /> Maps</span>
                <span className="p">Carr. 7 · 11D</span>
                <span className="p" style={{ opacity: .7 }}>agg. 2′ fa</span>
              </div>
            </div>
          </div>
          <div className="hero rise" onClick={() => openEvent("cena")}>
            <div className="art dinner" />
            <div className="shade" />
            <button className="more" onClick={(e) => { e.stopPropagation(); openV("actSheet"); }}>⋯</button>
            <div className="head">
              <span className="catL"><span className="pulse" /><CatIcon k="cena" />Cena · <span id="cdD">{cdD}</span></span>
              <h2>Cena con Giulia</h2>
              <div className="meta">Da Enzo al 29 · Trastevere · tavolo confermato</div>
            </div>
            <div className="resv">
              <span className="h">21:45</span>
              <div className="w">
                <div className="t">Tavolo per 2</div>
                <div className="s">via dei Vascellari 29 · Roma</div>
              </div>
              <span className="go" onClick={(e) => { e.stopPropagation(); toast("Apro Maps 🗺️"); }}><Pin /> Maps</span>
            </div>
          </div>
        </div>
        <div className="dotsRow" id="heroDots"><i className="on" /><i /></div>
        </>)}

        {/* in arrivo */}
        {isLive && live.upcoming.length > 0 && (
          <>
            <div className="sec rise" onClick={() => openV("agendaView")}>
              <h3>In arrivo <span className="cnt">· {live.upcoming.length}</span> <span className="ch">›</span></h3>
              {live.upcoming[0] && <div className="sub">{live.upcoming[0].rel} c&apos;è <em>{live.upcoming[0].title}</em></div>}
            </div>
            <div className="miniRow" id="miniRow">
              {live.upcoming.map((e) => <MiniLive key={e.id} e={e} onOpen={() => openEvent(e.id)} onActs={() => openV("actSheet")} />)}
            </div>
            {live.upcoming.length > 1 && <div className="dotsRow">{live.upcoming.map((e, i) => <i key={e.id} className={i === 0 ? "on" : ""} />)}</div>}
          </>
        )}
        {!isLive && (<>
        <div className="sec rise" onClick={() => openV("agendaView")}>
          <h3>In arrivo <span className="cnt">· 3</span> <span className="ch">›</span></h3>
          <div className="sub">domenica c&apos;è il <em>GP di Silverstone</em></div>
        </div>
        <div className="miniRow" id="miniRow">
          <div className="mini rise" onClick={() => openEvent("gp")}>
            <div className="art sportA" style={{ position: "absolute", inset: 0 }} />
            <div className="pshade" />
            <span className="when">tra 2 giorni · 16:00</span>
            <button className="more" onClick={(e) => { e.stopPropagation(); openV("actSheet"); }}>⋯</button>
            <span className="cat2"><CatIcon k="gp" />Formula 1 · Sky</span>
            <span className="t">GP Gran Bretagna 🇬🇧</span>
            <span className="info">Silverstone · <em>Norris in testa</em></span>
          </div>
          <div className="mini rise" onClick={() => openEvent("volo")}>
            <div className="art flightA" style={{ position: "absolute", inset: 0 }} />
            <div className="pshade" />
            <span className="when">ven 11 · 6:00</span>
            <button className="more" onClick={(e) => { e.stopPropagation(); openV("actSheet"); }}>⋯</button>
            <span className="cat2"><CatIcon k="volo" />Volo · FR1546</span>
            <span className="t">Milano → Londra</span>
            <span className="info">MXP T2 · <em>check-in da giovedì</em></span>
          </div>
          <div className="mini rise" onClick={() => openEvent("concerto")}>
            <div className="art concertA" style={{ position: "absolute", inset: 0 }} />
            <div className="pshade" />
            <span className="when">sab 19 · 21:00</span>
            <button className="more" onClick={(e) => { e.stopPropagation(); openV("actSheet"); }}>⋯</button>
            <span className="cat2"><CatIcon k="concerto" />Concerto · San Siro</span>
            <span className="t">Cremonini, con Giulia</span>
            <span className="info">Anello verde · <em>2 biglietti pronti</em></span>
          </div>
        </div>
        <div className="dotsRow" id="miniDots"><i className="on" /><i /><i /></div>
        </>)}

        {/* oggi per te */}
        {isLive && (live.gym || live.diet) && (
          <>
            <div className="sec minor rise">
              <h3>Oggi per te <span className="ch">›</span></h3>
            </div>
            <div className="grid2">
              {live.gym && <GymTileLive g={live.gym} />}
              {live.diet && <DietTileLive d={live.diet} />}
            </div>
          </>
        )}
        {!isLive && (<>
        <div className="sec minor rise" onClick={() => { setTab(2); openV("gymView"); }}>
          <h3>Oggi per te <span className="ch">›</span></h3>
          <div className="sub">push day · stasera <em>cena fuori con Giulia</em></div>
        </div>
        <div className="grid2">
          <div className="tile glowable rise">
            <button className="more soft" onClick={(e) => { e.stopPropagation(); openV("actSheet"); }}>⋯</button>
            <div className="gymTop">
              <div className="ring" id="ring" style={{ "--p": doneCount / 6 * 100 } as React.CSSProperties}><i id="ringTxt">{doneCount}/6</i></div>
              <div>
                <div className="k">Palestra</div>
                <div className="v">Push day</div>
              </div>
            </div>
            <div className="wk">
              <i className="on">L</i><i>M</i><i className="on">M</i><i>G</i><i className="today">V</i><i>S</i><i>D</i>
            </div>
            {!exOpen && <div className="exPrev" id="exPrev">Si parte con <b>panca 4×8</b>,<br />poi lento avanti — 45 min</div>}
            <div className={`exList${exOpen ? " open" : ""}`} id="exList">
              {["Panca piana 4×8", "Panca inclinata 3×10", "Lento avanti 4×8", "Alzate laterali 3×12", "French press 3×10", "Pushdown 3×12"].map((x, i) => (
                <div key={i} className={`ex${exDone[i] ? " done" : ""}`} onClick={() => exToggle(i)}><span className="c">✓</span>{x}</div>
              ))}
            </div>
            <span className="go" id="gymGo" onClick={(e) => { e.stopPropagation(); setExOpen((o) => !o); }}>{exOpen ? "Chiudi ↑" : "Vai 💪"}</span>
          </div>
          <div className="tile glowable gB rise">
            <button className="more soft" onClick={(e) => { e.stopPropagation(); openV("actSheet"); }}>⋯</button>
            <div className="k">Dieta</div>
            <div className="v">Stasera si esce</div>
            <div className="mealNext" onClick={() => toast("Buona serata, salutami Giulia 🥂")}>
              <span className="emo">🍝</span>
              <div>
                <div className="t">Cena fuori</div>
                <div className="s">Da Enzo al 29 · scelta libera 😉</div>
              </div>
            </div>
            <div className="mealsDone">Fatti: <b>colazione ✓ pranzo ✓</b><br />1.130 kcal finora</div>
            <span className="go" onClick={(e) => { e.stopPropagation(); setTab(1); openV("dietView"); }}>La settimana ›</span>
          </div>
        </div>
        </>)}

        {/* il consiglio: pull-quote — editoriale, nessuna sorgente reale → solo preview */}
        {!isLive && (
        <div className="quote rise">
          <span className="k">Keiko consiglia</span>
          <p>Occhio: stasera si scende a 16° — <em>portati una giacca</em>, il rientro è dopo mezzanotte.</p>
          <button onClick={() => toast("Promemoria alle 17:10, prima di uscire ✓")}>Ricordamelo quando esco</button>
        </div>
        )}

        {/* moduli contestuali — live: Da guardare + Viaggio dai dati veri (link alle pagine) */}
        {isLive ? (
          <>
            {live.watch && (
              <a className="ctxCard rise" href="/guarda">
                <div className="th film"><span>DA GUARDARE</span></div>
                <div className="w">
                  <div className="k">Stasera guardi</div>
                  <div className="t">{live.watch.title ?? "La tua lista"}</div>
                  <div className="s">{live.watch.sub}</div>
                </div>
                <span className="ch">›</span>
              </a>
            )}
            {live.trip && (
              <a className="ctxCard rise" href="/viaggio">
                <div className="th roma"><span>{live.trip.range || "VIAGGIO"}</span></div>
                <div className="w">
                  <div className="k">Prossimo viaggio</div>
                  <div className="t">{live.trip.title}</div>
                  <div className="s">{live.trip.sub}</div>
                </div>
                <span className="ch">›</span>
              </a>
            )}
          </>
        ) : (<>
        <div className="ctxCard rise" onClick={() => { setTab(3); openV("watchView"); }}>
          <div className="th film"><span>SKY 21:15</span></div>
          <div className="w">
            <div className="k">Stasera guardi</div>
            <div className="t">Dune: Parte Due</div>
            <div className="s">ti aspetta da <em>12 giorni</em> · 4 in lista</div>
          </div>
          <span className="ch">›</span>
        </div>
        <div className="ctxCard rise" onClick={() => openV("tripView")}>
          <div className="th roma"><span>12–14 SET</span></div>
          <div className="w">
            <div className="k">Prossimo viaggio</div>
            <div className="t">Weekend a Roma</div>
            <div className="s">tra <em>70 giorni</em> · itinerario pronto ✓</div>
          </div>
          <span className="ch">›</span>
        </div>
        </>)}

        {/* il ricordo — editoriale, nessuna sorgente reale → solo preview */}
        {!isLive && (
        <div className="memory rise" onClick={() => toast("12 foto di quel weekend 📸")}>
          <div className="ph" />
          <div>
            <div className="k">Un anno fa</div>
            <div className="t">Il weekend a Portogruaro con Giulia — il primo treno preso insieme.</div>
          </div>
        </div>
        )}

        <div className="spacer" />
      </div>

      {/* tab bar */}
      <div className="tabbar">
        <div className={`tab${tab === 0 ? " on" : ""}`} onClick={homeTab}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>
          Home
        </div>
        <div className={`tab${tab === 1 ? " on" : ""}`} onClick={isLive ? () => { window.location.href = "/salute"; } : () => { setTab(1); openV("dietView"); }}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2"><path d="M12 3a7 7 0 0 1 7 7c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 7-7Z" /><circle cx="12" cy="10" r="2.5" /></svg>
          Dieta
        </div>
        <div className="fab" onClick={isLive ? () => setCapture(true) : () => openV("addSheet")}>＋</div>
        <div className={`tab${tab === 2 ? " on" : ""}`} onClick={isLive ? () => { window.location.href = "/allenamento"; } : () => { setTab(2); openV("gymView"); }}>
          <span className="tdot" />
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2"><path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12" /></svg>
          Sport
        </div>
        <div className={`tab${tab === 3 ? " on" : ""}`} onClick={isLive ? () => { window.location.href = "/guarda"; } : () => { setTab(3); openV("watchView"); }}>
          <span className="tdot" />
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9 5 3-5 3z" /></svg>
          Guarda
        </div>
      </div>

      {/* dim + pannello evento */}
      <div className={`dim${dim ? " open" : ""}`} id="dim" onClick={() => { setEvKey(null); setViews((v) => ({ ...v, dayPanel: false, addSheet: false, actSheet: false, shareSheet: false, confirmSheet: false, calPanel: false })); }} />
      <div className={`evPanel${evKey ? " open" : ""}${evFull ? " full" : ""}`} id="evPanel">
        <span className="evGrab" onClick={() => setEvFull((f) => !f)} />
        <button className="evClose" onClick={closeEvent}>✕</button>
        <div className="evScroll" id="evScroll">
          <div className="evArt" id="evArt" style={{ height: ev ? Math.round((ev.artH || 230) * .9) : 207 }}>
            <div className={`art ${ev?.art ?? ""}`} id="evArtBg" />
            <div className="shade" />
            <span className="glyph" id="evGlyph">{ev && <CatIcon k={panelIcon} />}</span>
            <span className="live" id="evLive">{ev?.live}</span>
            <h2 id="evTitle">{ev?.title}</h2>
          </div>
          <div className="evBody">
            <div className="evNarr" id="evNarr" dangerouslySetInnerHTML={{ __html: ev?.narr ?? "" }} />
            <div className="evPaper" id="evPaper" dangerouslySetInnerHTML={{ __html: ev?.paper ?? "" }} />
            <div className="srcNote" id="evSrc">{ev?.src ? <><i />{ev.src}</> : null}</div>
            <div className="tips" id="evTips">
              {ev?.tips.map((t, i) => <span key={i} className="tip" onClick={() => toast("Segnato ✓")}>{t}</span>)}
            </div>
            <div className="evActs" id="evActs">
              {ev?.acts.map(([variant, label], i) => (
                <button key={i} className={`btn ${variant}`} onClick={() => {
                  if (label.includes("Maps") && ev.mapsQ) { window.open(mapsUrl(ev.mapsQ), "_blank"); return; }
                  if (label.includes("itinerario")) { closeEvent(); if (isLive) window.location.href = "/viaggio"; else openV("tripView"); return; }
                  if (label.includes("Condividi")) { openV("shareSheet"); return; }
                  toast(label);
                }}>{label}</button>
              ))}
              {live && liveEv && (
                <button className="btn line" onClick={() => openEdit(liveEv)}>🕘 Sposta / Modifica</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* vista itinerario */}
      <div className={`view${views.tripView ? " open" : ""}`} id="tripView">
        <div className="viewHead">
          <button className="back" onClick={() => closeV("tripView")}>‹</button>
          <h2>Weekend a Roma</h2>
          <span className="vs">AGGIORNATO ORA ✓</span>
        </div>
        <div className="viewBody">
          <div className="itDay">
            <div className="dd">Venerdì 12</div>
            <div className="itStop"><span className="h">21:10</span><div><div className="t">Arrivo a Termini 🚄</div><div className="s">Metro B fino a Circo Massimo, poi 10 min</div></div></div>
            <div className="itStop"><span className="h">21:45</span><div><div className="t">Check-in Hotel Santa Cecilia</div><div className="s">Trastevere · conferma #H2291</div></div></div>
          </div>
          <div className="itDay">
            <div className="dd">Sabato 13</div>
            <div className="itStop"><span className="h">9:30</span><div><div className="t">Colosseo 🏛️</div><div className="s">Biglietti saltafila già presi</div></div></div>
            <div className="itStop"><span className="h">13:00</span><div><div className="t">Pranzo a Monti</div><div className="s">Alternative pronte se pieno</div></div></div>
            <div className="itStop"><span className="h">19:30</span><div><div className="t">Sera a Trastevere 🌆</div><div className="s">Passeggiata + cena libera</div></div></div>
          </div>
          <div className="itDay">
            <div className="dd">Domenica 14</div>
            <div className="itStop"><span className="h">9:00</span><div><div className="t">Musei Vaticani</div><div className="s">Ingresso prenotato · 2 h 30</div></div></div>
            <div className="itStop"><span className="h">18:40</span><div><div className="t">Treno del ritorno 🚄</div><div className="s">Termini → Centrale · posti 11C-11D</div></div></div>
          </div>
          <button className="btn line" style={{ width: "100%" }} onClick={() => toast("Scambio tappa: dimmi cosa cambiamo 🔁")}>Scambia una tappa</button>
        </div>
      </div>

      {/* vista agenda — live: componente A5 (AgendaView, dati veri); preview: inline finto */}
      {live ? (
        <AgendaView
          open={!!views.agendaView}
          groups={live.agenda.map((g) => ({ label: g.label, events: g.events.map((e) => ({ id: e.id, iconKey: e.iconKey, art: e.art, when: e.when, catLabel: e.catLabel, title: e.title, info: e.location || undefined })) }))}
          onOpenEvent={openEvent}
          onBack={() => closeV("agendaView")}
        />
      ) : (
      <div className={`view${views.agendaView ? " open" : ""}`} id="agendaView">
        <div className="viewHead">
          <button className="back" onClick={() => closeV("agendaView")}>‹</button>
          <h2>In arrivo</h2>
          <span className="vs">5 EVENTI</span>
        </div>
        <div className="viewBody">
          <div className="agLbl">Oggi</div>
          <div className="agRow" onClick={() => openEvent("treno")}><div className="art train" style={{ position: "absolute", inset: 0 }} /><div className="pshade" /><span className="when">18:05</span><span className="cat2"><CatIcon k="treno" />Treno</span><span className="t">Frecciarossa per Roma</span><span className="info">Binario 14 · carrozza 7</span></div>
          <div className="agRow" onClick={() => openEvent("cena")}><div className="art dinner" style={{ position: "absolute", inset: 0 }} /><div className="pshade" /><span className="when">21:45</span><span className="cat2"><CatIcon k="cena" />Cena</span><span className="t">Con Giulia, da Enzo al 29</span><span className="info">Trastevere · tavolo per 2</span></div>
          <div className="agLbl">Questo weekend</div>
          <div className="agRow" onClick={() => openEvent("gp")}><div className="art sportA" style={{ position: "absolute", inset: 0 }} /><div className="pshade" /><span className="when">dom · 16:00</span><span className="cat2"><CatIcon k="gp" />Formula 1 · Sky</span><span className="t">GP Gran Bretagna 🇬🇧</span><span className="info">Norris in testa al mondiale</span></div>
          <div className="agLbl">Prossima settimana</div>
          <div className="agRow" onClick={() => openEvent("volo")}><div className="art flightA" style={{ position: "absolute", inset: 0 }} /><div className="pshade" /><span className="when">ven 11 · 6:00</span><span className="cat2"><CatIcon k="volo" />Volo · Ryanair</span><span className="t">Milano → Londra</span><span className="info">Check-in da giovedì · ci pensa Keiko</span></div>
          <div className="agLbl">Più avanti</div>
          <div className="agRow" onClick={() => openEvent("concerto")}><div className="art concertA" style={{ position: "absolute", inset: 0 }} /><div className="pshade" /><span className="when">sab 19 · 21:00</span><span className="cat2"><CatIcon k="concerto" />Concerto · San Siro</span><span className="t">Cremonini, con Giulia</span><span className="info">2 biglietti pronti · anello verde</span></div>
        </div>
      </div>
      )}

      {/* vista dieta */}
      <div className={`view${views.dietView ? " open" : ""}`} id="dietView">
        <div className="viewHead">
          <button className="back" onClick={() => { closeV("dietView"); setTab(0); }}>‹</button>
          <h2>Dieta · la settimana</h2>
          <span className="vs">1.130 KCAL OGGI</span>
        </div>
        <div className="viewBody">
          <div className="itDay">
            <div className="dd">Oggi · venerdì</div>
            <div className="itStop"><span className="h">🥣</span><div><div className="t">Colazione — yogurt e avena</div><div className="s">320 kcal</div></div><span className="doneTag">FATTA ✓</span></div>
            <div className="itStop"><span className="h">🍗</span><div><div className="t">Pranzo — riso, pollo e zucchine</div><div className="s">810 kcal</div></div><span className="doneTag">FATTO ✓</span></div>
            <div className="itStop"><span className="h">🍝</span><div><div className="t">Cena — fuori, da Enzo al 29</div><div className="s">scelta libera 😉 · con Giulia</div></div></div>
          </div>
          <div className="itDay">
            <div className="dd">Sabato</div>
            <div className="itStop"><span className="h">🥚</span><div><div className="t">Colazione — uova e pane integrale</div><div className="s">390 kcal</div></div></div>
            <div className="itStop"><span className="h">🥩</span><div><div className="t">Pranzo — manzo, patate e insalata</div><div className="s">720 kcal</div></div></div>
            <div className="itStop"><span className="h">🍕</span><div><div className="t">Cena — libera</div><div className="s">sgarro pianificato</div></div></div>
          </div>
          <div className="itDay">
            <div className="dd">Domenica</div>
            <div className="itStop"><span className="h">🥞</span><div><div className="t">Colazione — pancake proteici</div><div className="s">450 kcal</div></div></div>
            <div className="itStop"><span className="h">🐟</span><div><div className="t">Pranzo — orata e verdure</div><div className="s">640 kcal</div></div></div>
            <div className="itStop"><span className="h">🥗</span><div><div className="t">Cena — insalatona</div><div className="s">480 kcal · leggera, poi GP 😄</div></div></div>
          </div>
          <button className="btn line" style={{ width: "100%" }} onClick={() => toast("Quale pasto scambiamo? 🔁")}>Scambia un pasto</button>
        </div>
      </div>

      {/* vista allenamento */}
      <div className={`view${views.gymView ? " open" : ""}`} id="gymView">
        <div className="viewHead">
          <button className="back" onClick={() => { closeV("gymView"); setTab(0); }}>‹</button>
          <h2>Allenamento</h2>
          <span className="vs">🔥 3 DI FILA</span>
        </div>
        <div className="viewBody">
          <div className="itDay">
            <div className="dd">Oggi · venerdì — Push day · tocca per spuntare</div>
            {[["4×8", "Panca piana"], ["3×10", "Panca inclinata"], ["4×8", "Lento avanti"], ["3×12", "Alzate laterali"], ["3×10", "French press"], ["3×12", "Pushdown"]].map(([h, t], i) => (
              <ItStopTap key={i} h={h} t={t} />
            ))}
          </div>
          <div className="itDay">
            <div className="dd">La settimana</div>
            <div className="itStop"><span className="h">lun</span><div><div className="t">Push day</div></div><span className="doneTag">FATTO ✓</span></div>
            <div className="itStop"><span className="h">mer</span><div><div className="t">Pull day</div></div><span className="doneTag">FATTO ✓</span></div>
            <div className="itStop"><span className="h">sab</span><div><div className="t">Riposo</div></div><span className="restTag">—</span></div>
            <div className="itStop"><span className="h">dom</span><div><div className="t">Cardio leggero</div><div className="s">30 min · prima del GP</div></div></div>
          </div>
          <button className="btn line" style={{ width: "100%" }} onClick={() => toast("Ti alleni un altro giorno? Lo riprogrammo 📆")}>Sposta l&apos;allenamento</button>
        </div>
      </div>

      {/* vista da guardare */}
      <div className={`view${views.watchView ? " open" : ""}`} id="watchView">
        <div className="viewHead">
          <button className="back" onClick={() => { closeV("watchView"); setTab(0); }}>‹</button>
          <h2>Da guardare</h2>
          <span className="vs">4 TITOLI</span>
        </div>
        <div className="viewBody">
          <div className="pGrid">
            <FilmCard cover="dune" age="da 12 giorni" title={<>Dune<br />Parte Due</>} plat={<>Stasera · <b>Sky 21:15</b></>} toast={toast} />
            <FilmCard cover="opp" title={<>Oppenheimer</>} plat={<><b>Netflix</b> · 3 h</>} toast={toast} />
            <FilmCard cover="bear" age="nuova stagione" title={<>The Bear<br />S4</>} plat={<><b>Disney+</b> · 10 ep.</>} toast={toast} />
            <div className="addFilm" onClick={() => toast("Scrivi il titolo come ti viene e ci penso io ✨")}>
              <b>＋</b>
              Aggiungi un titolo<br />anche solo «quel film di Nolan»
            </div>
          </div>
        </div>
      </div>

      {/* Ask Keiko */}
      <div className={`askFull${views.askFull ? " open" : ""}`} id="askFull">
        <button className="evClose" onClick={() => { closeV("askFull"); setAskQ(""); setAskRes(null); }}>✕</button>
        <div className="bar">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={askQ} onChange={(e) => setAskQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }} placeholder="Chiedimi… «quando ho la cena con Giulia?»" />
        </div>

        {askBusy && <p style={{ color: "var(--text-3)", fontSize: "var(--fs-xs)", margin: "12px 4px 0" }}>Cerco…</p>}

        {!askBusy && askRes && (askRes.events.length > 0 || askRes.todos.length > 0) ? (
          <div style={{ marginTop: 8 }}>
            {askRes.events.map((e) => (
              <div key={e.id} className="recent" onClick={() => { closeV("askFull"); openEvent(e.id); }}>
                <span className="e">📅</span><span className="t">{e.title}</span><span className="r">{fmtWhen(e.datetime)}</span>
              </div>
            ))}
            {askRes.todos.map((t) => (
              <div key={t.id} className="recent">
                <span className="e">✅</span><span className="t">{t.text}</span><span className="r">{fmtDay(t.day, t.time)}</span>
              </div>
            ))}
          </div>
        ) : !askBusy && (
          <>
            {askRes && (
              <div style={{ margin: "14px 2px 4px" }}>
                <p style={{ color: "var(--text-2)", fontSize: "var(--fs-sm)", fontWeight: 700, margin: 0 }}>Per ora non ci arrivo 😊</p>
                <p style={{ color: "var(--text-3)", fontSize: "var(--fs-xs)", margin: "4px 0 0" }}>A breve Keiko saprà rispondere a tutto — intanto la tua domanda me la segno.</p>
              </div>
            )}
            <h6>Prova a chiedere</h6>
            {["quando ho la cena con Giulia?", "quando parte il treno?", "quando gioca la Roma?"].map((s) => (
              <div key={s} className="recent" onClick={() => { setAskQ(s); runSearch(s); }}>
                <span className="e">💬</span><span className="t">{s}</span><span className="r">›</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Profilo: nome (per i saluti) + logout. Tema scuro unico, nessun toggle. */}
      <div className={`askFull${views.profile ? " open" : ""}`} id="profileView">
        <button className="evClose" onClick={() => closeV("profile")}>✕</button>
        <h6 style={{ marginTop: 44 }}>Profilo</h6>
        <div className="bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-3.6 3.6-6 8-6s8 2.4 8 6" /></svg>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); try { localStorage.setItem("keiko-name", e.target.value); } catch { /* no-op */ } }}
            placeholder="Il tuo nome"
          />
        </div>
        <p style={{ color: "var(--text-3)", fontSize: "var(--fs-xs)", margin: "8px 4px 0" }}>Keiko lo usa per salutarti in home.</p>
        {logoutAction && (
          <form action={logoutAction} style={{ marginTop: 28 }}>
            <button type="submit" className="btn line" style={{ width: "100%" }}>Esci</button>
          </form>
        )}
      </div>

      {/* overlay giorno — live: componente A5 (DayPanel, to-do reali via /api/todos); preview: finto */}
      {live ? (
        <DayPanel
          open={!!views.dayPanel}
          title={(selDay && live.days[selDay]?.title) || "Giornata"}
          counts={(selDay && live.days[selDay]?.counts) || { eventi: 0, todo: 0, fatti: 0 }}
          events={(selDay && live.days[selDay]?.events) || []}
          todos={(selDay && live.days[selDay]?.todos) || []}
          onOpenEvent={openEvent}
          onToggleTodo={onToggleTodo}
          onStarTodo={onStarTodo}
          onDeleteTodo={onDeleteTodo}
          onAddTodo={onAddTodo}
          onClose={() => closeV("dayPanel")}
          toast={toast}
          onEditTime={onEditTime}
        />
      ) : (
      <div className={`dayPanel${views.dayPanel ? " open" : ""}`} id="dayPanel">
        <div className="dayHead">
          <div>
            <h3>Venerdì 3 luglio</h3>
            <span>2 eventi · 3 to-do · 1 fatto</span>
          </div>
          <button className="evClose" onClick={() => closeV("dayPanel")} style={{ position: "relative", top: 0, right: 0 }}>✕</button>
        </div>
        <div className="dayBody">
          <div className="secLabel">Eventi</div>
          <div className="evtRow" onClick={() => { closeV("dayPanel"); openEvent("treno"); }}>🚄 <span><b>18:05</b> · <span className="et">Frecciarossa per Roma</span></span></div>
          <div className="evtRow" onClick={() => { closeV("dayPanel"); openEvent("cena"); }}>🍝 <span><b>21:45</b> · <span className="et">Cena con Giulia</span></span></div>
          <div className="secLabel">To-do · <small>trascina: destra fatto, sinistra elimina</small></div>
          <Todo txt="Ritira il pacco in posta" chips={<><span className="chip warm">🕔 17:30</span><span className="chip">📍 Maps</span></>} />
          <Todo txt="Chiama il dentista" starred chips={<><span className="chip warm">🕒 15:00</span><span className="chip">📞 Chiama</span></>} />
          <Todo txt="Compra il regalo per Giulia" done />
          <div className="addTodo">
            <input placeholder="Scrivi e ci pensa Keiko… “palestra alle 19”" />
            <button onClick={() => toast("Preso in carico ✓")}>＋</button>
          </div>
        </div>
      </div>
      )}

      {/* calendario mensile — apre dal saluto; ‹ › navigano i mesi (enhancement in-app) */}
      <div className={`calPanel${views.calPanel ? " open" : ""}`} id="calPanel">
        <div className="calHead">
          <h3>
            <span className="calGo" style={{ padding: "0 10px", cursor: "pointer" }} onClick={() => shiftMonth(-1)}>‹</span>
            {MONTHS[calYM.m][0].toUpperCase() + MONTHS[calYM.m].slice(1)} {calYM.y}
            <span className="calGo" style={{ padding: "0 10px", cursor: "pointer" }} onClick={() => shiftMonth(1)}>›</span>
          </h3>
          <button className="evClose" style={{ position: "relative", top: 0, right: 0 }} onClick={closeCal}>✕</button>
        </div>
        <div className="cg" id="calGrid">
          {["lu", "ma", "me", "gi", "ve", "sa", "do"].map((d) => <span key={d} className="h">{d}</span>)}
          {Array.from({ length: calLead }).map((_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: calDaysN }).map((_, i) => {
            const d = i + 1;
            return (
              <button key={d} className={isBaseMonth && d === calTodayN ? "tod" : ""} onClick={() => { setSelDay(`${calYM.y}-${String(calYM.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`); closeCal(); openV("dayPanel"); }}>
                {d}{calDots.includes(d) ? <i /> : null}
              </button>
            );
          })}
        </div>
        <div className="calHint">Tocca un giorno per vederlo e aggiungere to-do — anche tra tre settimane.</div>
      </div>

      {/* foglio aggiunta */}
      <div className={`sheet${views.addSheet ? " open" : ""}`} id="addSheet">
        <h6>Aggiungi</h6>
        <div className="addBar">
          <input id="addIn" placeholder="Scrivi… «cena giovedì 20:30 da Marco»" />
          <button className="iconB" onClick={() => toast("Passami lo screenshot 📷")} title="Foto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" /></svg></button>
          <button className="iconB" onClick={() => toast("Dimmi tutto 🎤")} title="Voce"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg></button>
        </div>
        <div className="addHint">Scrivi e invio — oppure foto del biglietto o voce, qui accanto.</div>
        <button className="btn acc" style={{ width: "100%" }} onClick={() => { toast("Preso in carico ✓"); closeV("addSheet"); }}>Invia a Keiko</button>
      </div>

      {/* action sheet */}
      <div className={`sheet${views.actSheet ? " open" : ""}`} id="actSheet">
        {/* "Sposta" reale ora nel pannello evento (bottone Modifica) */}
        <button className="srow" onClick={() => { closeV("actSheet"); openV("shareSheet"); }}>📤 Condividi</button>
        <button className="srow danger" onClick={() => { closeV("actSheet"); openV("confirmSheet"); }}>🗑️ Elimina</button>
      </div>

      {/* condivisione */}
      <div className={`sheet${views.shareSheet ? " open" : ""}`} id="shareSheet">
        <h6>Condividi con</h6>
        <div className="shareRow">
          <div className="shareP" onClick={() => { toast("Inviato a Giulia 💌"); closeV("shareSheet"); }}><span className="av">👩🏻</span><span>Giulia</span></div>
          <div className="shareP" onClick={() => { toast("Inviato a Marco ✓"); closeV("shareSheet"); }}><span className="av">👨🏻</span><span>Marco</span></div>
          <div className="shareP" onClick={() => { toast("Inviato a mamma ✓"); closeV("shareSheet"); }}><span className="av">👩🏻‍🦳</span><span>Mamma</span></div>
          <div className="shareP" onClick={() => { toast("Link copiato 🔗"); closeV("shareSheet"); }}><span className="av">🔗</span><span>Copia link</span></div>
        </div>
      </div>

      {/* conferma eliminazione */}
      <div className={`sheet${views.confirmSheet ? " open" : ""}`} id="confirmSheet">
        <h6>Lo eliminiamo?</h6>
        <div className="confirmTxt">Sparisce dal calendario e dai promemoria. Puoi sempre ripescarlo chiedendolo a Keiko.</div>
        <div className="confirmBtns">
          <button className="btn line" onClick={() => closeV("confirmSheet")}>Annulla</button>
          <button className="btn red" onClick={() => { toast("Eliminato 🗑️"); closeV("confirmSheet"); }}>Elimina</button>
        </div>
      </div>

      {/* debug on-device (?debug): build ricevuto + tap registrati + stato mood */}
      {debug && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "#000", color: "#3f6", font: "12px ui-monospace,monospace", padding: "5px 8px", textAlign: "center", letterSpacing: ".02em" }}>
          build {BUILD}
        </div>
      )}

      {/* Sheet Sposta / Modifica evento (reale: salva su /api/update) */}
      {editVal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end" }} onClick={closeEdit}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", fontFamily: "var(--f)", background: "var(--bg-2)", border: "1px solid var(--card-line)", borderBottom: "none", borderTopLeftRadius: "var(--r-xl)", borderTopRightRadius: "var(--r-xl)", padding: "10px 18px calc(env(safe-area-inset-bottom) + 24px)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -30px 70px rgba(0,0,0,.5)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--card-line)", margin: "0 auto 14px" }} />
            <h3 style={{ fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--text)", margin: "0 2px 2px" }}>Sposta / Modifica</h3>
            <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-3)", margin: "0 2px 16px" }}>Cambia data, ora e dettagli dell&apos;evento.</p>
            <EventForm value={editVal} onChange={setEditVal} onCancel={closeEdit} onSave={saveEdit} saving={savingEdit} saveLabel="Salva" intro="" />
          </div>
        </div>
      )}

      {/* toast */}
      <div className={`toast${toastMsg ? " show" : ""}`} id="toast"><span id="toastMsg">{toastMsg}</span><button className="tact" id="toastAct" style={{ display: "none" }} /></div>

      {/* live: cattura reale (＋) */}
      {isLive && <CaptureSheet open={capture} onClose={() => setCapture(false)} />}
    </div>
  );
}

/* ---------- componenti "live" (dati veri) ---------- */
function HeroLive({ e, onOpen, onActs }: { e: LiveEvent; onOpen: () => void; onActs: () => void }) {
  return (
    <div className="hero rise" onClick={onOpen}>
      <div className={`art ${e.art}`} />
      <div className="shade" />
      <button className="more" onClick={(ev) => { ev.stopPropagation(); onActs(); }}>⋯</button>
      <div className="head">
        <span className="catL"><span className="pulse" /><CatIcon k={e.iconKey} />{e.catLabel} · {e.rel}</span>
        <h2>{e.heroTitle}</h2>
        {e.meta && <div className="meta">{e.meta}</div>}
      </div>
      {e.route ? (
        <div className={`tkt${e.isFlight ? " isFlight" : ""}`}>
          <div className="route">
            <div className="times">{e.time}<i /></div>
            <div className="stn"><span>{e.route.dep}</span><span>{e.route.arr}</span></div>
          </div>
          <div className="side">
            <a className="maps" href={mapsUrl(e.mapsQ)} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}><Pin /> Maps</a>
          </div>
        </div>
      ) : (
        <div className="resv">
          <span className="h">{e.time}</span>
          <div className="w"><div className="t">{e.location || e.catLabel}</div></div>
          <a className="go" href={mapsUrl(e.mapsQ)} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}><Pin /> Maps</a>
        </div>
      )}
    </div>
  );
}
function MiniLive({ e, onOpen, onActs }: { e: LiveEvent; onOpen: () => void; onActs: () => void }) {
  return (
    <div className="mini rise" onClick={onOpen}>
      <div className={`art ${e.art}`} style={{ position: "absolute", inset: 0 }} />
      <div className="pshade" />
      <span className="when">{e.when}</span>
      <button className="more" onClick={(ev) => { ev.stopPropagation(); onActs(); }}>⋯</button>
      <span className="cat2"><CatIcon k={e.iconKey} />{e.catLabel}</span>
      <span className="t">{e.title}</span>
      {e.location && <span className="info">{e.location}</span>}
    </div>
  );
}
function GymTileLive({ g }: { g: NonNullable<LiveHome["gym"]> }) {
  return (
    <a className="tile glowable rise" href="/allenamento" style={{ color: "inherit", textDecoration: "none" }}>
      <div className="gymTop">
        <div className="ring" style={{ "--p": g.trainedToday ? 100 : 0 } as React.CSSProperties}><i>{g.trainedToday ? "✓" : String(g.total)}</i></div>
        <div>
          <div className="k">Palestra</div>
          <div className="v">{g.title}</div>
        </div>
      </div>
      <div className="wk">{g.week.map((d, i) => <i key={i} className={d.on ? "on" : d.today ? "today" : ""}>{d.letter}</i>)}</div>
      <div className="exPrev">{g.rest ? "Giornata di riposo 🌙" : g.first ? <>Si parte con <b>{g.first}</b></> : "Allenamento pronto"}</div>
      <span className="go">Vai 💪</span>
    </a>
  );
}
function DietTileLive({ d }: { d: NonNullable<LiveHome["diet"]> }) {
  return (
    <a className="tile glowable gB rise" href="/salute" style={{ color: "inherit", textDecoration: "none" }}>
      <div className="k">Dieta</div>
      <div className="v">Oggi</div>
      {d.nextPasto ? (
        <div className="mealNext">
          <span className="emo">🍽️</span>
          <div>
            <div className="t">{d.nextPasto}</div>
            <div className="s">{d.nextOpt ?? "—"}</div>
          </div>
        </div>
      ) : <div className="mealsDone">Nessun piano per oggi</div>}
      {d.done.length > 0 && <div className="mealsDone">Altri: <b>{d.done.join(" · ")}</b></div>}
      <span className="go">La settimana ›</span>
    </a>
  );
}

/* ---- piccoli componenti locali ---- */
function ItStopTap({ h, t }: { h: string; t: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={`itStop tap${done ? " done" : ""}`} onClick={() => setDone((d) => !d)}>
      <span className="h">{h}</span><div><div className="t">{t}</div></div>
    </div>
  );
}
function FilmCard({ cover, age, title, plat, toast }: { cover: string; age?: string; title: React.ReactNode; plat: React.ReactNode; toast: (m: string) => void }) {
  const [seen, setSeen] = useState(false);
  return (
    <div className={`film${seen ? " seen" : ""}`} onClick={() => { setSeen((s) => !s); toast(!seen ? "Visto ✓" : "Ok, resta in lista"); }}>
      <div className={`cover ${cover}`}>{age && <span className="age">{age}</span>}<span className="ttl">{title}</span></div>
      <div className="seenMark">✅</div>
      <div className="plat">{plat}</div>
    </div>
  );
}
function Todo({ txt, chips, starred, done }: { txt: string; chips?: React.ReactNode; starred?: boolean; done?: boolean }) {
  const [d, setD] = useState(!!done);
  const [st, setSt] = useState(!!starred);
  return (
    <div className={`todo${st ? " starred" : ""}${d ? " done" : ""}`} onClick={() => setD((x) => !x)}>
      <span className="check">✓</span>
      <div>
        <div className="txt">{txt}</div>
        {chips && <div className="chips">{chips}</div>}
      </div>
      <span className="star" onClick={(e) => { e.stopPropagation(); setSt((x) => !x); }}>★</span>
    </div>
  );
}
