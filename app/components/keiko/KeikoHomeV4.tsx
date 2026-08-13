"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import CaptureSheet from "@/components/CaptureSheet";
import KeikoNav from "./KeikoNav";
import EventSheet from "./EventSheet";
import AskSheet from "./AskSheet";
import DaySheet from "./DaySheet";
import ProfileSheet from "./ProfileSheet";
import InstallSheet from "./InstallSheet";
import Onboarding from "./Onboarding";
import { cosaMostrare, daProporre, daIcona, daTelefono, type CosaMostrare } from "@/lib/install-client";
import CalendarSheet from "./CalendarSheet";
import { catFor, type ImageCategory } from "@/lib/smart-image";
import type { LiveHome, LiveEvent } from "./keikoLive";
import type { Battito } from "@/lib/battiti";
import { I } from "@/app/components/v2/icons";
import { Empty } from "@/app/components/v2/Empty";
import { Sheet, K2_FOGLIO } from "@/app/components/v2/Sheet";
import { SheetHero } from "@/app/components/v2/SheetHero";
/* A6 · qui ds.css RESTA, e non per dimenticanza: `Ph` dipinge il fondo delle
   card senza foto con `var(--k-cat-<categoria>)`, e quei 17 gradienti sono
   definiti li' dentro. Toglierlo lascerebbe grigie tutte le card a cui manca
   l'immagine. Se ne va quando i gradienti di categoria passano al foglio V2 —
   che e' un lavoro suo, non una riga da cancellare. */
import "../../ds.css";

/* HOME — ONDATA 5.

   Cambia solo il livello visivo: markup e classi del mock CONGELATO
   (docs/mockups/home-v2-final-mock.html), che Matteo ha gia' rifiutato due
   volte quando era stato reinterpretato. Qui non si progetta niente.

   Stato, effetti, chiamate di rete e gestori sono quelli di prima, riga per
   riga: to-do, eliminazione con annulla, meteo, battiti, cattura, i sette
   fogli, l'invito a installare, il deep-link ?ev= / ?day=.

   Le classi della Home vivono sotto `.k2 .home` perche' il mock usa nomi
   generici (.sec, .day, .task, .content, .wide, .ck, .ph, .dot, .shelf) che
   nel foglio condiviso esistono gia' con un'altra definizione, e le altre
   sezioni sono in produzione. Il guscio le separa senza toccare il condiviso
   e senza cambiare una classe del mock. L'elenco dei 34 casi sta in cima al
   blocco LA HOME di app/keiko-v2.css. */

type LiveTodo = LiveHome["days"][string]["todos"][number];

/* L'emoji del battito segue il TIPO dell'evento. Sta qui e non nel motore:
   è vestizione, e un tipo nuovo senza emoji ricade su ✨ senza rompere nulla. */
const EMOJI_BATTITO: Record<string, string> = { sport: "🏟️", concert: "🎵", cinema: "🎬" };

/* L'etichetta piccola in cima al testo ("domani" / "un mese fa"): si ricava da
   quanto dista l'evento, non dal tipo — così vale anche per i tipi di domani.
   In minuscolo: è un metadato, e i metadati non urlano (UI-DECISIONI-V2,
   regola 3). Il maiuscolo qui faceva anche un'altra cosa, peggiore: metteva
   «UN MESE FA» allo stesso volume del titolo dell'evento, che è la frase che
   deve leggersi per prima. */
function etichettaBattito(chiave: "prima" | "dopo", oreDaEvento: number): string {
  if (chiave === "prima") return "domani";
  const giorni = Math.round(oreDaEvento / 24);
  if (giorni <= 1) return "ieri";
  if (giorni < 25) return `${giorni} giorni fa`;
  if (giorni < 45) return "un mese fa";
  return `${Math.round(giorni / 30)} mesi fa`;
}

function dayTitle(key: string): string {
  try { return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(new Date(key + "T00:00:00")); }
  catch { return key; }
}

/* ── le cinque famiglie di colore del sistema ──
   `catFor` dà una quindicina di categorie (serve alle foto); i pallini del
   sistema V2 sono cinque. Qui si riduce, e la riduzione sta in un posto solo.

   IL COLORE STA NEL PALLINO, NON NELLE PAROLE (12 agosto 2026). Prima il
   metadato accanto al pallino prendeva la tinta chiara della sua famiglia:
   il risultato era che sulla stessa schermata i metadati avevano quattro
   colori diversi — la card grande azzurra, quella del volo quasi bianca — e
   l'occhio leggeva una gerarchia che non c'era. Il pallino fa già quel
   mestiere, e lo fa senza toccare la leggibilità del testo.
   Adesso tutti i metadati sono `--meta` (#9BA0A8) e il colore di famiglia
   resta solo sul `.dot`. La versione tenue del viola era già ritirata
   (UI-DECISIONI-V2, 2-ter) e con lei se ne va anche l'ultimo uso. */
type Famiglia = "viaggi" | "sport" | "dieta" | "guarda" | "eventi";
const FAMIGLIA: Partial<Record<ImageCategory, Famiglia>> = {
  volo: "viaggi", treno: "viaggi", viaggio: "viaggi", hotel: "viaggi",
  sport: "sport", film: "guarda", dieta: "dieta",
};
const famigliaDi = (c: ImageCategory): Famiglia => FAMIGLIA[c] ?? "eventi";
const COLORE: Record<Famiglia, string> = {
  viaggi: "var(--c-viaggi)", sport: "var(--c-sport)", dieta: "var(--c-dieta)",
  guarda: "var(--c-guarda)", eventi: "var(--c-eventi)",
};

/* Le tre frasi che ruotano nella barra: sono del mock congelato, verbatim. */
const SEGNAPOSTI = ["Cosa mangio stasera?", "Sposta la corsa a domani", "Che volo ho?"];

/* La foto di una card. Quando manca, resta il fondo di `.ph` come nel mock,
   più il gradiente di categoria e il glifo: è la sola cosa che `SmartMedia`
   faceva e che qui non si può perdere — «mostra ciò che esiste, mai un vuoto».
   `catFor` e `glyphFor` restano quelli. */
function Ph({ src, cat, className, style, children }: {
  src?: string | null; cat?: ImageCategory; className?: string;
  style?: React.CSSProperties; children?: ReactNode;
}) {
  /* IL RIPIEGO VALE ANCHE QUANDO LA FOTO C'È MA NON ARRIVA.
     Prima il gradiente di categoria scattava solo se l'indirizzo mancava del
     tutto: se c'era e falliva — `/api/place-photo` senza chiave, un dominio
     che non risponde, la rete che cade — restava l'icona di immagine spezzata
     del browser. Visto sull'app vera: tre card «In arrivo» con il foglietto
     strappato dentro. Adesso una foto che non arriva è come una foto che non
     c'è, che è quello che è. */
  const [rotta, setRotta] = useState(false);
  useEffect(() => { setRotta(false); }, [src]);
  const mostraFoto = !!src && !rotta;

  return (
    <div className={"ph" + (className ? " " + className : "")} style={style}>
      {mostraFoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt="" loading="lazy" decoding="async" onError={() => setRotta(true)} />
      ) : cat ? (
        /* Il gradiente di categoria e basta. Qui sopra c'era anche il glifo —
           🏋️ 🎵 🥗 al 50% — e sulla card lo stesso mestiere lo faceva già il
           pallino colorato accanto al metadato: due sistemi di categoria uno
           sopra l'altro, e il secondo era un'emoji, cioè decorazione.
           Via l'emoji, resta il pallino (12 agosto 2026). L'emoji del battito
           NON si tocca: quella è un dato, dice che tipo di serata era. */
        /* IL RIPIEGO DEL RIPIEGO, e sta tutto in una virgola.
           `var(--k-cat-volo)` scritta da sola, se quella variabile non è
           raggiungibile, non dipinge niente: il riquadro resta vuoto. E
           succedeva sempre — misurato: `background-image: none` su ogni card
           senza foto. I 17 gradienti di categoria sono dichiarati su `.ds`
           (vedi `app/ds.css`), e la Home V2 quella classe non ce l'ha addosso:
           da quando la Home è passata al sistema nuovo, nessuno di quei
           gradienti è mai arrivato.
           Il secondo valore dentro `var()` è quello che si usa quando il primo
           non c'è: un grigio del sistema, fatto con le sue quote. Regge
           qualunque cosa — categoria sconosciuta, variabile fuori portata, e
           anche la categoria che inventeremo il mese prossimo. Allineare le
           liste a mano si romperebbe al primo nome nuovo.
           Quando i gradienti passeranno al foglio V2 (è la prima voce del
           debito in ROADMAP.md) questa riga tornerà a dipingerli senza
           bisogno di cambiarla. */
        <span style={{ position: "absolute", inset: 0, background: `var(--k-cat-${cat}, linear-gradient(150deg, var(--lv3), var(--lv1)))` }} />
      ) : null}
      {children}
    </div>
  );
}

export default function KeikoHomeV4({ live, demo = false, logoutAction, accountName, onboardedAt, battito }: { live: LiveHome; demo?: boolean; logoutAction?: () => Promise<void>; accountName?: string; onboardedAt?: string | null; battito?: Battito | null }) {
  const router = useRouter();
  const [capture, setCapture] = useState(false);
  // Il battito chiuso sparisce subito, senza aspettare il giro del server.
  const [battitoChiuso, setBattitoChiuso] = useState(false);
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

  /* Presentazione e basta: il blocco dei to-do del mock è collassabile, e la
     barra di ricerca cambia segnaposto ogni 3,2 secondi. Nessun dato. */
  const [todoOpen, setTodoOpen] = useState(false);
  const [segnaposto, setSegnaposto] = useState(0);
  const [segnaVisibile, setSegnaVisibile] = useState(true);

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

  // Apertura diretta del Profilo da un link: serve all'invito "dimmi a cosa sei
  // abbonato" che sta nella ricerca di Guarda, che altrimenti scaricherebbe qui
  // l'utente senza aprirgli niente. Il parametro si toglie subito dall'URL.
  useEffect(() => {
    if (demo) return;
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("profilo") === "1") {
        setProfileOpen(true);
        const url = new URL(window.location.href);
        url.searchParams.delete("profilo");
        window.history.replaceState(null, "", url);
      }
    } catch { /* no-op */ }
  }, [demo]);

  // nome + città salvati sul dispositivo
  useEffect(() => {
    try {
      const n = localStorage.getItem("keiko-name"); if (n) setName(n);
      const c = localStorage.getItem("keiko-city"); if (c) setCity(c);
    } catch { /* no-op */ }
  }, []);

  /* Il segnaposto che ruota nella barra: è del mock congelato, script incluso
     (tre frasi, 3,2 secondi, mezzo passaggio in dissolvenza). */
  useEffect(() => {
    const t = setInterval(() => {
      setSegnaVisibile(false);
      setTimeout(() => { setSegnaposto((i) => (i + 1) % SEGNAPOSTI.length); setSegnaVisibile(true); }, 300);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  // K14b — che cosa mostrare all'apertura.
  //
  // L'onboarding "già fatto" lo sa il SERVER (`onboardedAt`), non il telefono:
  // su iPhone l'app aperta dall'icona ha uno storage separato da Safari, quindi
  // chi lo faceva nel browser se lo ritrovava da capo dopo aver installato.
  //
  //   dall'icona      · mai fatto  → onboarding
  //   dall'icona      · già fatto  → home (i permessi li chiede K15, se servono)
  //   browser telefono· mai fatto  → prima l'invito a installare; "Non ora" fa
  //                                  partire l'onboarding lì
  //   browser telefono· già fatto  → home
  //   computer        · mai fatto  → onboarding e basta (non c'è niente da installare)
  const [invitoPrima, setInvitoPrima] = useState<CosaMostrare>(null);
  const [fattoQui, setFattoQui] = useState(false);   // finito ora, prima che il server si aggiorni
  const onboardingFatto = !!onboardedAt || fattoQui;

  useEffect(() => {
    if (demo || onboardingFatto) return;
    // Il telefono può saperlo prima del server (onboarding appena finito e
    // pagina non ancora ricaricata): vale come "fatto", non si ripropone.
    try { if (localStorage.getItem("keiko-onboarded")) { setFattoQui(true); return; } } catch { /* no-op */ }

    const modo = cosaMostrare();
    const daInstallare = modo === "guida-ios" || modo === "guida-android";
    if (!daIcona() && daTelefono() && daInstallare) setInvitoPrima(modo);
    else setOnboard(true);
  }, [demo, onboardingFatto]);

  // K15 — l'invito ad aggiungere Keiko alla schermata Home (e poi gli avvisi).
  // Arriva DOPO l'onboarding e dopo un attimo: l'atmosfera viene dopo il momento
  // wow, mai prima. L'attesa serve anche ad Android, che lancia il suo invito a
  // installare qualche istante dopo il caricamento.
  // Nota K14b: la condizione guarda `onboardingFatto`, non più il solo
  // localStorage. Chi ha fatto l'onboarding in Safari e apre dall'icona ha uno
  // storage vuoto lì: senza questo non gli verrebbero mai chiesti gli avvisi,
  // che sono proprio la ragione per cui ha installato.
  useEffect(() => {
    if (demo || onboard || invitoPrima) return;
    if (!onboardingFatto) return;
    if (!daProporre()) return;
    const t = setTimeout(() => setInvito(cosaMostrare()), 1500);
    return () => clearTimeout(t);
  }, [demo, onboard, invitoPrima, onboardingFatto]);

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
  const greeting = name.trim() ? `Ciao ${name.trim()}` : live.greeting;

  /* IL BATTITO (docs/SPEC-BATTITI.md): la card che ti rimette davanti una cosa
     che hai vissuto, con l'azione che porta da qualche parte e la ✕ che la
     chiude per sempre. Nel mock congelato è la «Stasera» in fondo alla pagina:
     stessa forma (.wide), stesso contenuto. Se non c'è battito la sezione non
     esiste: mai uno stato vuoto. */
  const mostraBattito = !!battito && !battitoChiuso;
  async function chiudiBattito() {
    if (!battito) return;
    setBattitoChiuso(true);
    try {
      await fetch("/api/beats/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // keepalive: se chiudi la card e cambi subito pagina, la richiesta parte
        // lo stesso. Senza, la ✕ si perde e il battito torna al refresh — visto
        // succedere davvero durante le prove.
        keepalive: true,
        body: JSON.stringify({ id: battito.eventoId, battito: battito.chiave }),
      });
    } catch {
      /* se non passa, il battito ricompare al prossimo giro: nessun danno */
    }
  }
  const todayN = live.week.find((d) => d.today)?.n ?? null;
  const todayKey = live.week.find((d) => d.today)?.key ?? null;
  const todayTodos = todayKey ? (live.days[todayKey]?.todos ?? []).filter(notHidden).map(withOv) : [];
  const openTodos = todayTodos.filter((t) => !t.done).length;
  const fattiTodos = todayTodos.length - openTodos;
  const prossimoTodo = todayTodos.find((t) => !t.done) ?? null;

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
  /* La riga di stato del mock non ha emoji: 💪 e 🌙 erano decorazione, non
     dato, e qui sparisce la decorazione. L'emoji dei battiti resta perché
     quella è dato (vedi il blocco «Stasera»). */
  const gymTxt = gym
    ? gym.trainedToday ? "allenamento fatto" : gym.rest ? "riposo" : "allenamento da fare"
    : null;

  /* «Riprendi» — le cose lasciate a metà. Nel mock ce ne sono tre (un film a
     1h 12m dalla fine, un allenamento a 2 di 4, una ricetta al passo 3 di 6):
     nel codice l'unico progresso che esiste davvero è quello dell'allenamento.
     Un film "a metà" e una ricetta "al passo 3" non sono un dato che abbiamo.
     Quindi qui ci va solo quello che è vero, e se non c'è niente la sezione
     non compare: meglio una sezione in meno che tre numeri inventati. */
  const daRiprendere = gym && !gym.rest && !gym.trainedToday && gym.done > 0 && gym.done < gym.total
    ? [{
        k: "gym", famiglia: "sport" as Famiglia, cat: "sport" as ImageCategory,
        kicker: gym.title, testo: `${gym.done} di ${gym.total} esercizi`,
        perc: Math.round((gym.done / gym.total) * 100), img: gym.image ?? null,
        vai: () => go("/allenamento"),
      }]
    : [];

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

  /* «Oggi per te»: la riga larga è l'allenamento (ha il progresso e l'azione),
     le due card sotto sono quello che c'è fra dieta, guarda e viaggio. */
  /* ── C1 · DALLA HOME SI FA, NON SI SALTA ──
     Toccare una card apriva un'altra sezione, e per segnare l'allenamento
     fatto — un tocco — se ne facevano quattro e si perdeva il posto.
     Adesso apre un PANNELLO sopra la Home con le azioni vere, e la pagina
     intera resta una scelta esplicita, in fondo.
     `dove` è dove porta la riga in fondo; `azione` c'è solo dove il codice sa
     già fare qualcosa. Dove il dato non c'è, l'azione NON si inventa: le tre
     che ho dovuto lasciare fuori sono elencate nel report d'ondata. */
  type Scheda = {
    k: string; cat: ImageCategory; titolo: string; meta: string; img?: string | null;
    dove: string; doveTesto: string;
    /* Il titolo e il tipo servono a «Dove vederlo»: la rotta li vuole
       tutti e due. Ci sono solo sulla card della Guarda. */
    titoloWatch?: string | null; kindWatch?: string | null;
  };
  const oggiPerTe: Scheda[] = [];
  if (live.diet) oggiPerTe.push({ k: "diet", cat: "dieta", titolo: live.diet.nextPasto ?? "Dieta", meta: live.diet.nextOpt ?? "dal tuo piano", img: live.diet.image, dove: "/salute", doveTesto: "Apri la Dieta" });
  if (live.watch) oggiPerTe.push({ k: "watch", cat: "film", titolo: live.watch.title ?? "Da guardare", meta: live.watch.sub || `${live.watch.count} titoli`, img: live.watch.poster, dove: "/guarda", doveTesto: "Apri la Guarda", titoloWatch: live.watch.title, kindWatch: live.watch.kind });
  if (live.trip) oggiPerTe.push({ k: "trip", cat: "viaggio", titolo: live.trip.title, meta: live.trip.range, img: live.trip.image, dove: "/viaggio", doveTesto: "Apri il viaggio" });

  /* Il pannello aperto: la card che stai guardando, o `null`. */
  const [scheda, setScheda] = useState<Scheda | null>(null);
  const [segnando, setSegnando] = useState(false);
  /* Le piattaforme di «Dove vederlo». Si azzerano a ogni apertura: un elenco
     rimasto dal titolo di prima sarebbe una bugia. */
  const [dove, setDove] = useState<{ stato: "fermo" | "chiedo" | "risposto"; piattaforme: string[] }>({ stato: "fermo", piattaforme: [] });
  useEffect(() => { setDove({ stato: "fermo", piattaforme: [] }); }, [scheda?.k]);

  async function chiediDove(titolo: string, kind: string) {
    setDove({ stato: "chiedo", piattaforme: [] });
    try {
      const r = await fetch(`/api/watch/providers?title=${encodeURIComponent(titolo)}&kind=${encodeURIComponent(kind)}`, { credentials: "include" });
      const d = await r.json();
      const p = d?.providers ?? {};
      // In abbonamento prima: e' l'unica risposta che non costa altri soldi.
      const nomi = [...(p.flatrate ?? []), ...(p.rent ?? []), ...(p.buy ?? [])]
        .map((x: { name?: string }) => x?.name).filter(Boolean) as string[];
      setDove({ stato: "risposto", piattaforme: [...new Set(nomi)].slice(0, 6) });
    } catch {
      setDove({ stato: "risposto", piattaforme: [] });
    }
  }

  /* «Segna fatto» dell'allenamento: la stessa chiamata che fa la pagina
     Allenamento (`/api/workout/log` con il giorno di oggi). Ottimistica come
     là: il pannello si chiude subito e il server insegue. */
  async function segnaAllenamentoFatto() {
    if (segnando || !todayKey) return;
    setSegnando(true);
    try {
      const r = await fetch("/api/workout/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ day: todayKey, done: true }),
      });
      if (!r.ok) throw new Error();
      setScheda(null);
      router.refresh();
    } catch {
      /* Un clic non resta senza spiegazione: se non passa, il pannello
         resta aperto e il tasto torna premibile. */
    } finally {
      setSegnando(false);
    }
  }

  const iniziale = (name.trim() || accountName || "").trim().charAt(0).toUpperCase() || "M";

  return (
    <>
      <div className="k2">
        <div className="home">
          {/* le tre luci d'ambiente */}
          <div className="lights"><div className="l-top" /><div className="l-task" /><div className="l-hero" /></div>

          <div className="page">
            {/* ── testata ── */}
            <div className="hdr">
              <span className="brand">
                {/* l'orca del marchio: ha le due bollicine e l'occhio, che
                    l'orca del set di icone non ha. È markup, non un'icona nuova. */}
                {/* I colori vengono dalle variabili del sistema, non riscritti
                    a mano: due bollicine terracotta e un'orca teal scritte in
                    esadecimale qui dentro sono due posti in piu' da ricordare
                    il giorno che l'accento cambia. `--acc` e' il terracotta
                    acceso, quello che sta bene dove non c'e' testo sopra. */}
                <svg width="23" height="23" viewBox="0 0 32 32" fill="var(--teal)">
                  <circle cx="20.6" cy="4.4" r="1.1" fill="var(--acc)" />
                  <circle cx="23" cy="6" r=".75" fill="var(--acc)" />
                  <path d="M27 15c-1.7-4.3-5.7-6.8-10.8-6.8-4.5 0-8.3 2.1-9.9 5.4-.6 1.2-.8 2.5-.6 3.7-1.6.4-2.6 1.2-3 2.4 1.1.2 2.2.1 3.3-.2 1.5 2.9 5 4.8 9.4 4.8 3.2 0 6-1 8-2.6.9.9 2.1 1.4 3.5 1.5-.3-1.3-.9-2.4-1.8-3.2.9-1.1 1.5-2.4 1.9-3.8.2-.4.2-.8 0-1.2z" />
                  <circle cx="21.8" cy="14" r="1.4" fill="#0F0F12" />
                </svg>
                <span className="logo">keiko</span>
              </span>
              <div className="search" onClick={() => { if (!demo) setAskOpen(true); }} role="button" aria-label="Chiedi a Keiko">
                <span className="orca-mini" style={{ color: "var(--teal)" }}>{I.orca(15)}</span>
                <span className="ph-txt" style={{ opacity: segnaVisibile ? 1 : 0 }}>{SEGNAPOSTI[segnaposto]}</span>
              </div>
              <button className="ava" onClick={() => setProfileOpen(true)} aria-label="Profilo">{iniziale}</button>
            </div>

            {/* ── saluto ── */}
            <div className="greet">
              <h1>{greeting}</h1>
              {/* IL RIEPILOGO SI TOCCA e apre il giorno: era la riga che
                  riassume oggi, e sotto il dito non faceva niente. Il
                  `DaySheet` esiste già — è collegare, non costruire. */}
              <div
                className={"status" + (todayKey ? " tap" : "")}
                onClick={todayKey ? () => openDay(todayKey) : undefined}
                role={todayKey ? "button" : undefined}
                style={todayKey ? { cursor: "pointer" } : undefined}
              >
                {[
                  live.kickDate,
                  `${nEventiOggi} event${nEventiOggi === 1 ? "o" : "i"}`,
                  gymTxt,
                  weather ? `${weather.emoji} ${weather.tempC}°` : null,
                ].filter(Boolean).join(" · ")}
              </div>
              {/* E il prossimo impegno, che è la cosa che si viene a cercare
                  aprendo l'app. Il dato c'è già: `lede` dice «Oggi: X, alle H»
                  oppure «Prossimo: X, giovedì alle H». Una riga. */}
              {live.lede && <div className="status" style={{ color: "var(--teal-soft)" }}>{live.lede}</div>}
            </div>

            {/* ── la settimana ── */}
            <div className="weekrow">
              <div className="week">
                {live.week.slice(0, 7).map((d) => (
                  /* B7 · la pillola accesa scrive «oggi», non l'abbreviazione
                     del giorno. Non era un problema di contrasto — e' gia' la
                     cosa piu' accesa della striscia — ma di significato: col
                     «mer» dovevi dedurre che quello acceso fosse oggi. Adesso
                     c'e' scritto. Le altre sei restano come sono. */
                  <div key={d.key} className={"day" + (d.today ? " on" : "")} onClick={() => openDay(d.key)}>
                    {d.today ? "oggi" : d.w}<b>{d.n}</b>
                  </div>
                ))}
              </div>
              <button className="cal" onClick={() => setCalOpen(true)} aria-label="Calendario">{I.cal({ s: 17 })}</button>
            </div>

            {/* ── da fare oggi ──
                Il blocco si apre e si chiude: chiuso dice solo la prossima cosa
                e a che punto sei. La spunta e il conteggio sono quelli di prima. */}
            {/* Nessun promemoria: una riga che invita, non un buco. È una
                riga-azione e non un `Empty` intero perché qui il blocco che
                manca è alto una riga: uno stato vuoto grande quanto una card
                peserebbe più della cosa che sostituisce. */}
            {todayTodos.length === 0 && todayKey && !demo && (
              <div className="srf" style={{ marginTop: 12 }}>
                <div className="row-act tap" onClick={() => openDay(todayKey)} role="button">
                  <span className="ic2">{I.plus({ s: 16 })}</span>
                  <span className="in">
                    <span className="t">Cosa non devi dimenticare</span>
                    <span className="m">Oggi non hai promemoria. Scrivine uno e te lo ricordo io.</span>
                  </span>
                  {I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
                </div>
              </div>
            )}

            {todayTodos.length > 0 && (
              <div className={"todo srf2" + (todoOpen ? " open" : "") + (openTodos === 0 ? " finished" : "")}>
                <div className="todo-head" onClick={() => setTodoOpen((v) => !v)}>
                  <span className="ck" aria-hidden />
                  <span className="tnext">
                    {prossimoTodo ? prossimoTodo.text : "Tutto fatto per oggi"}
                    {prossimoTodo?.time && <small>{prossimoTodo.time}</small>}
                  </span>
                  <span className="tcount">{fattiTodos} di {todayTodos.length}</span>
                  {I.chev({ c: "chev", s: 16 })}
                </div>
                <div className="tlist">
                  {todayTodos.map((t) => (
                    <div key={t.id} className={"task" + (t.done ? " done" : "")}>
                      <span
                        className="ck"
                        onClick={() => toggleTodo(t.id, !t.done)}
                        role="checkbox"
                        aria-checked={t.done}
                        aria-label={t.text}
                      >
                        {I.drawck(null, 12)}
                      </span>
                      <span className="tx">{t.text}</span>
                      {t.time && <span className="st">{t.time}</span>}
                    </div>
                  ))}
                  {/* «Aggiungi» apre il giorno di oggi, che è dove si scrive:
                      il mock non ha un campo di testo qui. */}
                  {/* «Cosa non devi dimenticare» invece di «Aggiungi»: un
                      promemoria non è una riga da aggiungere a un elenco, è
                      una cosa che hai paura di scordarti. Stesso testo del
                      campo dentro il giorno, così la riga e il posto dove
                      finisci a scrivere dicono la stessa cosa. */}
                  {todayKey && (
                    <div className="addrow" onClick={() => openDay(todayKey)}>
                      {I.plus({ s: 13 })} Cosa non devi dimenticare
                    </div>
                  )}
                </div>
                <div className="alldone">Tutto fatto per oggi.</div>
              </div>
            )}

            {/* ── Riprendi ── */}
            {daRiprendere.length > 0 && (
              <>
                <div className="sec">Riprendi</div>
                <div className="shelf">
                  {daRiprendere.map((r) => (
                    <div className="rcard srf" key={r.k} onClick={r.vai}>
                      <Ph src={r.img} cat={r.cat} />
                      <div className="in">
                        <div className="k">
                          <span className="dot" style={{ background: COLORE[r.famiglia] }} />{r.kicker}
                        </div>
                        <div className="t">{r.testo}</div>
                        <div className="staterow">
                          <div className="prog"><i style={{ width: `${r.perc}%` }} /></div>
                          <span className="btn2">Riprendi</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── il prossimo evento, grande ── */}
            {heroEv && (
              <div className="hero-wrap">
                <div className="feature" onClick={() => openEvent(heroEv)}>
                  <Ph src={heroEv.image} cat={catFor(heroEv.type, heroEv.title)}>
                    <div className="ovl" />
                  </Ph>
                  <div className="in">
                    <span className="ctx">
                      <i style={{ background: COLORE[famigliaDi(catFor(heroEv.type, heroEv.title))] }} />
                      {heroEv.rel}
                    </span>
                    <div className="t">{heroEv.heroTitle}</div>
                    <div className="m">
                      {[heroEv.catLabel, heroEv.when, heroEv.location].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── In arrivo ──
                La sezione c'è anche quando è vuota, e lo DICE. Prima spariva:
                dal di fuori «nessun evento in arrivo» e «questa sezione non
                esiste» si vedono uguali, cioè come un buco. Uno stato vuoto è
                una frase scritta per il momento in cui non c'è niente. */}
            {inArrivo.length === 0 && (
              <>
                <div className="sec">In arrivo</div>
                <Empty
                  icon={I.cal({ s: 20 })}
                  t="Non hai niente in programma"
                  m="Quando aggiungi un biglietto, un volo o una cena<br/>te li ritrovi qui, in ordine di quando arrivano."
                />
              </>
            )}

            {inArrivo.length > 0 && (
              <>
                <div className="sec">In arrivo</div>
                {/* B2 · carosello, non griglia: in griglia si vedevano due
                    eventi e gli altri sparivano sotto. `scorre` porta lo
                    scroll-snap, che ferma sempre a inizio card. */}
                <div className="g2 scorre">
                  {inArrivo.map((ev) => {
                    const cat = catFor(ev.type, ev.title);
                    const fam = famigliaDi(cat);
                    return (
                      <div className="content srf" key={ev.id} onClick={() => openEvent(ev)}>
                        <Ph src={ev.image} cat={cat} />
                        <div className="t">{ev.title}</div>
                        <div className="m">
                          <span className="dot" style={{ background: COLORE[fam] }} />{ev.when}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Oggi per te ── */}
            {(gym || oggiPerTe.length > 0) && <div className="sec">Oggi per te</div>}
            {gym && (
              <div className="wide srf" onClick={() => setScheda({
                k: "gym", cat: "sport", titolo: gym.title,
                meta: gym.rest ? "oggi è riposo" : `${gym.done} di ${gym.total} esercizi`,
                img: gym.image, dove: "/allenamento", doveTesto: "Apri l'allenamento",
              })}>
                <Ph src={gym.image} cat="sport" />
                <div className="in">
                  <div className="k">
                    <span className="dot" style={{ background: COLORE.sport }} />
                    Allenamento{gym.first ? ` · ${gym.first}` : ""}
                  </div>
                  <div className="t">{gym.title}</div>
                  <div className="staterow">
                    <div className="prog"><i style={{ width: `${gym.total > 0 ? Math.round((gym.done / gym.total) * 100) : 0}%` }} /></div>
                    <span className="st">{gym.rest ? "riposo" : `${gym.done} di ${gym.total}`}</span>
                    {!gym.trainedToday && !gym.rest && <span className="cta">Inizia</span>}
                  </div>
                </div>
              </div>
            )}
            {oggiPerTe.length > 0 && (
              <div className="g2" style={{ marginTop: 11 }}>
                {oggiPerTe.map((c) => {
                  const fam = famigliaDi(c.cat);
                  return (
                    <div className="content srf" key={c.k} onClick={() => setScheda(c)}>
                      <Ph src={c.img} cat={c.cat} />
                      <div className="t">{c.titolo}</div>
                      <div className="m">
                        <span className="dot" style={{ background: COLORE[fam] }} />{c.meta}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Stasera · il battito ──
                La ✕ non è nel mock, ma chiudere un battito è un comportamento
                vero (`/api/beats/close`): senza, la card tornerebbe per sempre. */}
            {mostraBattito && battito && (
              <>
                <div className="sec">Stasera</div>
                <div className="wide srf" style={{ position: "relative" }}>
                  <Ph src={battito.foto} cat={catFor(battito.tipo, battito.frase)} />
                  <div className="in">
                    <div className="k">
                      <span className="dot" style={{ background: COLORE[famigliaDi(catFor(battito.tipo, battito.frase))] }} />
                      {EMOJI_BATTITO[battito.tipo] ?? "✨"} {etichettaBattito(battito.chiave, battito.oreDaEvento)}
                    </div>
                    <div className="t">{battito.frase}</div>
                    <div className="staterow">
                      <span className="st">{battito.azione.etichetta}</span>
                      <a
                        className="cta"
                        href={battito.azione.url}
                        target={battito.azione.url.startsWith("/") ? undefined : "_blank"}
                        rel="noreferrer"
                        style={{ textDecoration: "none", marginLeft: "auto" }}
                      >
                        Apri
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={chiudiBattito}
                    aria-label="Chiudi"
                    style={{
                      position: "absolute", top: 0, right: 0, width: 44, height: 44, zIndex: 3,
                      display: "grid", placeItems: "center", background: "none", border: 0,
                      color: "var(--meta)", cursor: "pointer",
                    }}
                  >
                    {I.close({ s: 14 })}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* bottom nav — barra condivisa (unica implementazione, vedi KeikoNav).
          Resta FUORI da .k2, come in Guarda e Allenamento. */}
      <KeikoNav active="home" demo={demo} onAdd={() => setCapture(true)} />

      <CaptureSheet open={capture} onClose={() => setCapture(false)} />
      {selEv && <EventSheet ev={selEv} onClose={closeEvent} demo={demo} onDelete={() => requestDelete("event", selEv.id)} />}
      {askOpen && <AskSheet onClose={() => setAskOpen(false)} />}

      {/* ── C1 · il pannello della card ──
          Sopra la Home, non al posto della Home. Dentro ci sono le azioni che
          il codice sa gia' fare, e in fondo — staccata — la riga per andare
          alla pagina intera, che resta una scelta esplicita.
          `.k2` addosso perche' i fogli stanno fuori dalla pagina V2. */}
      {scheda && (
        <div className="k2" style={K2_FOGLIO}>
          <Sheet onClose={() => setScheda(null)}>
            <SheetHero
              img={scheda.img ?? ""}
              k={scheda.meta}
              h2={scheda.titolo}
              cold={scheda.k === "gym"}
            />
            <div className="pad">
              {/* L'AZIONE VERA, dove esiste. Oggi ce n'e' una sola:
                  l'allenamento segnato fatto, con la stessa chiamata della
                  pagina Allenamento. Le altre card non hanno ancora un dato
                  che permetta di fare qualcosa da qui, e un tasto che non sa
                  cosa fare e' peggio di un tasto che non c'e'. */}
              {scheda.k === "gym" && !gym?.trainedToday && !gym?.rest && (
                <button
                  className="cta wide tap"
                  style={{ marginTop: 14 }}
                  onClick={segnaAllenamentoFatto}
                  disabled={segnando}
                >
                  {segnando ? "Segno…" : <>{I.tick({ s: 15 })}Segna fatto</>}
                </button>
              )}
              {scheda.k === "gym" && gym?.trainedToday && (
                <p className="status" style={{ marginTop: 14 }}>Oggi l&apos;hai gia&apos; fatto.</p>
              )}

              {/* «Dove vederlo»: adesso si puo', perche' il payload della Home
                  porta anche il `kind` che la rotta vuole insieme al titolo.
                  Le piattaforme arrivano da /api/watch/providers, la stessa
                  della Guarda: qui si chiede e si mostra, non si duplica
                  nessuna logica. */}
              {scheda.k === "watch" && scheda.titoloWatch && scheda.kindWatch && (
                <>
                  <button
                    className="cta wide tap"
                    style={{ marginTop: 14 }}
                    onClick={() => chiediDove(scheda.titoloWatch!, scheda.kindWatch!)}
                    disabled={dove.stato === "chiedo"}
                  >
                    {dove.stato === "chiedo" ? "Cerco…" : <>{I.play({ s: 15 })}Dove vederlo</>}
                  </button>
                  {dove.stato === "risposto" && (
                    dove.piattaforme.length > 0 ? (
                      <div className="srf" style={{ marginTop: 10 }}>
                        {dove.piattaforme.map((n) => (
                          <div className="row-act" key={n} style={{ cursor: "default" }}>
                            <span className="ic2">{I.tv({ s: 16 })}</span>
                            <span className="in"><span className="t">{n}</span></span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="status">Non risulta in streaming in Italia in questo momento.</p>
                    )
                  )}
                </>
              )}

              {/* La pagina intera: in fondo, e si sceglie. */}
              <div className="srf" style={{ marginTop: 14 }}>
                <div
                  className="row-act tap"
                  role="button"
                  onClick={() => { const d = scheda.dove; setScheda(null); go(d); }}
                >
                  <span className="ic2">{I.right({ s: 16 })}</span>
                  <span className="in">
                    <span className="t">{scheda.doveTesto}</span>
                    <span className="m">Esci dalla Home e vai alla sezione</span>
                  </span>
                  {I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
                </div>
              </div>
            </div>
          </Sheet>
        </div>
      )}
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

      {/* K14b — l'invito a installare PRIMA dell'onboarding (solo browser da
          telefono, onboarding mai fatto). "Non ora" non chiude e basta: fa
          partire l'onboarding qui, così chi non vuole installare non resta a
          mani vuote. */}
      {invitoPrima && !demo && (
        <InstallSheet
          modo={invitoPrima}
          primaDellOnboarding
          onNonOra={() => { setInvitoPrima(null); setOnboard(true); }}
          onClose={() => { setInvitoPrima(null); setOnboard(true); }}
        />
      )}

      {onboard && !demo && (
        <Onboarding
          accountName={accountName}
          name={name}
          city={city}
          onName={saveName}
          onCity={saveCity}
          onDone={(haSalvatoEvento) => {
            try { localStorage.setItem("keiko-onboarded", "1"); } catch { /* no-op */ }
            setFattoQui(true);
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
        <div className="k2">
          <div className="toast on" style={{ bottom: "calc(150px + env(safe-area-inset-bottom))", zIndex: 120, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ flex: 1 }}>Eliminato</span>
            <button onClick={doUndo} style={{ background: "none", border: 0, color: "var(--teal-soft)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Annulla</button>
          </div>
        </div>
      )}
    </>
  );
}
