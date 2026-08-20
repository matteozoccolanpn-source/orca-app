"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Recipe, RicettaEstratta, ShoppingItem, PastoAnnotato, StatoPasto } from "@/lib/supabase";
import { quandoDetto, daQuanto, amazonFresh, type PastoDelGiorno, type Rifare } from "@/lib/cucina";
import KeikoNav, { PAGE_PB } from "@/app/components/keiko/KeikoNav";
import { I } from "@/app/components/v2/icons";
import { Sec } from "@/app/components/v2/Sec";
import { Chip } from "@/app/components/v2/Chip";
import { Check as CheckV2 } from "@/app/components/v2/Check";
import { Content } from "@/app/components/v2/Content";
import { Feature } from "@/app/components/v2/Feature";
import { DayCard } from "@/app/components/v2/DayCard";
import { Sheet } from "@/app/components/v2/Sheet";
import { Skeleton } from "@/app/components/v2/Skeleton";
import { Empty } from "@/app/components/v2/Empty";
import StoricoPasti from "./StoricoPasti";
import Ricettario from "./Ricettario";
import CucinaConKeiko from "./CucinaConKeiko";
/* A6 · l'import di ds.css se n'e' andato da qui il 12 agosto 2026: i fogli che
   questa pagina apre sono passati al sistema nuovo, e in tutto il file non c'e'
   piu' nessuna classe `ds-*` ne' nessuna variabile `--k-*` (contate: zero).
   Nella Home invece resta, e c'e' scritto perche'. */

/* CUCINA — la sezione, ripensata (docs/mockups/cucina-redesign-mock.html).
 *
 * Tre zone, in quest'ordine, che è anche l'ordine di lettura:
 *   ① IL PIANO — cosa viene adesso, e la giornata a pallini. Solo per chi ha
 *      un piano: senza, la pagina parte dalla domanda e non manca niente.
 *   ② LA DOMANDA — campo libero + chip. Sopra i risultati si vede sempre cosa
 *      ha capito Keiko: se traduce una situazione, lo dice.
 *   ③ IL RICETTARIO — scaffale orizzontale, e "Da rifare" quando c'è.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * IL PALETTO LEGALE
 * Il piano si MOSTRA e si ESEGUE. Le ricette vivono sotto, separate. In questo
 * file non esiste una riga che confronti le due cose: niente calorie, niente
 * «adatta al tuo piano», mai una ricetta proposta al posto di un pasto.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Il video non si incorpora e non si copia: si apre su TikTok/YouTube, così la
 * visualizzazione va a chi l'ha girato.
 */

type Risultato = {
  titolo: string;
  url: string;
  miniatura: string | null;
  autore: string | null;
  piattaforma: "tiktok" | "youtube" | "web";
  dominio: string;
  /** L'estratto che Tavily ha già dato: non si mostra, serve all'estrazione. */
  contenuto?: string | null;
  /** Il marcatore della pagina dice che ingredienti e passi sono già lì.
   *  Verificato dalla rotta leggendo la pagina, non promesso. */
  completa?: boolean;
};

/** Quel che serve al foglio ricetta, da una card dei risultati o da una del
 *  ricettario: le due cose hanno campi diversi e qui diventano una sola. */
type Aperta = {
  id: string | null;
  titolo: string;
  url: string;
  miniatura: string | null;
  autore: string | null;
  piattaforma: string;
  contenuto: string | null;
  estratta: RicettaEstratta | null;
  /** Il sito, per le pagine: senza, il foglio scriveva «web» al posto del nome
   *  di chi ha pubblicato la ricetta. Sui video non serve: c'è l'autore. */
  dominio?: string | null;
};

/** «ricette.giallozafferano.it» da un indirizzo intero. */
function dominioDi(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** DA DOVE VENGONO I PASSI, in una riga sola.
 *
 *  Si legge da `estratta.fonte`, che è salvato insieme alla ricetta: così la
 *  riga dice la stessa cosa oggi e fra un mese. Tre casi, e il confronto fra la
 *  fonte e l'indirizzo aperto basta a distinguerli — quando i passi arrivano da
 *  un altro posto, quel posto si vede e si può aprire.
 *
 *  Le ricette salvate prima che questo campo esistesse non hanno fonte: lì si
 *  dice quello che si sa per certo dalla piattaforma, e non si tira a indovinare. */
function Fonte({ aperta }: { aperta: Aperta }) {
  const fonte = aperta.estratta?.fonte ?? null;
  const altrove = fonte && fonte !== aperta.url;
  return (
    <p className="rx" style={{ marginTop: -4, marginBottom: 12 }}>
      {altrove ? (
        <>
          I passi vengono da{" "}
          <a href={fonte!} target="_blank" rel="noreferrer">
            {dominioDi(fonte!)}
          </a>
          , linkata dal creator in descrizione.
        </>
      ) : fonte || aperta.piattaforma === "web" ? (
        <>I passi vengono da {dominioDi(fonte ?? aperta.url)}.</>
      ) : (
        <>I passi vengono dalla descrizione del video.</>
      )}
    </p>
  );
}

type Interpretazione = { originale: string; cercato: string; viaAi: boolean };

const CHIP = ["Virale", "Fit", "Easy", "Veloce", "Veg"] as const;

/* I loghi veri delle piattaforme, inline (mock §badge). Un SVG di 13px pesa
   meno di qualunque emoji e soprattutto è LA piattaforma, non un'approssimazione:
   il badge deve dirti dove stai per andare prima che tu tocchi. */
function LogoPiattaforma({ p, size = 13 }: { p: string; size?: number }) {
  if (p === "youtube") {
    return (
      <svg width={size + 1} height={size + 1} viewBox="0 0 24 24" aria-hidden focusable="false">
        <rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="#FF0033" strokeWidth="2.4" />
        <path fill="#fff" d="M9.5 8.5v7l6-3.5z" />
      </svg>
    );
  }
  if (p === "tiktok") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
        <path fill="#fff" d="M16.6 5.8c-1-.7-1.7-1.9-1.8-3.3h-3v13.1a2.7 2.7 0 1 1-2.7-2.7c.3 0 .6 0 .8.1V9.9a5.9 5.9 0 1 0 5 5.8V9.4c1.1.8 2.5 1.3 4 1.3v-3c-.9 0-1.7-.3-2.3-.9z" />
      </svg>
    );
  }
  return <span style={{ fontSize: size, lineHeight: 1 }} aria-hidden>🌐</span>;
}

/* La miniatura, con due accorgimenti che sembrano dettagli e non lo sono.
 *
 * 1. `referrerPolicy="no-referrer"`. I CDN di TikTok rifiutano le immagini
 *    quando arriva un Referer che non è loro: il file esiste, risponde 200 a
 *    una richiesta nuda, e nel browser resta un rettangolo vuoto. Senza
 *    Referer passano.
 * 2. Sotto c'è SEMPRE lo sfondo con l'emoji. Gli URL delle miniature TikTok
 *    sono firmati e scadono nel giro di giorni: una ricetta salvata un mese fa
 *    perderà la sua foto, ed è normale. Quando succede si vede una card con
 *    l'icona del piatto, non un buco — e `onError` toglie di mezzo l'immagine
 *    rotta invece di lasciare l'icona del file spezzato. */
function Miniatura({ src, emoji = "🍳", dimensione, subito = false }: { src: string | null; emoji?: string; dimensione: number; subito?: boolean }) {
  if (!src) return <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: dimensione }} aria-hidden>{emoji}</span>;
  return (
    <>
      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: dimensione }} aria-hidden>{emoji}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        /* Nei risultati la foto È il contenuto: caricarla solo quando entra
           nel viewport fa comparire sei card con l'icona di ripiego e poi le
           foto, che sembra un errore. Nello scaffale del ricettario, invece,
           lazy va benissimo: sta in fondo e scorre. */
        loading={subito ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
    </>
  );
}

/** Il nome che si legge sotto il video: l'autore se c'è, sennò il posto. */
function nomeFonte(r: { autore?: string | null; piattaforma?: string; platform?: string; dominio?: string | null; author?: string | null }) {
  const p = r.piattaforma ?? r.platform ?? "web";
  const chi = r.autore ?? r.author ?? null;
  const dove = p === "tiktok" ? "TikTok" : p === "youtube" ? "YouTube" : r.dominio || "web";
  return chi ? `${chi} · ${dove}` : dove;
}

export default function CucinaView({
  ricette,
  ricercaAttiva,
  giornata,
  prossimo,
  rifare,
  spesaIniziale,
}: {
  ricette: Recipe[];
  ricercaAttiva: boolean;
  giornata: PastoDelGiorno[];
  prossimo: PastoDelGiorno | null;
  rifare: Rifare | null;
  spesaIniziale: ShoppingItem[];
}) {
  const router = useRouter();

  /* ── IL REGISTRO ──
     Le annotazioni di oggi, per indice di pasto. Si leggono all'apertura e si
     riscrivono a ogni tocco: il server e' la verita', ma la riga cambia
     subito sotto il dito e poi il server insegue.
     🚫 Qui non si confronta niente col piano: si mostra cosa hai scritto tu. */
  const oggiIso = new Date().toISOString().slice(0, 10);
  const [annotazioni, setAnnotazioni] = useState<Record<number, PastoAnnotato>>({});
  const [salvo, setSalvo] = useState<number | null>(null);
  const [scriviAltro, setScriviAltro] = useState<number | null>(null);
  const [testoAltro, setTestoAltro] = useState("");
  const [passatiAperti, setPassatiAperti] = useState(false);
  /* ── IL LEGAME RICETTA ↔ PASTO ──
     Quando e' valorizzato, stai scegliendo dal ricettario cosa hai cucinato
     per QUEL pasto. Il legame nasce qui, e nasce da un tocco.
     ⚠️ La ricerca NON si precompila col testo del pasto. «pollo e zucchine» →
     cerca «pollo» e' la scorciatoia ovvia, ed e' indovinare un legame che
     nessuno ha stabilito: la prima volta che sbaglia, l'app mente. La ricerca
     la fa Matteo, la scelta la fa Matteo, Keiko registra. */
  const [collegoA, setCollegoA] = useState<PastoDelGiorno | null>(null);
  const [storicoAperto, setStoricoAperto] = useState(false);

  /* `?ricetta=<id>` apre quella ricetta all'arrivo. E' il capolinea di «come
     si cucina» nel pannello della Home: navigare va bene — la ricetta vive
     qui — ma si deve atterrare DENTRO la ricetta, non davanti al ricettario.
     Il parametro si toglie subito dall'indirizzo, o un ricaricamento la
     riaprirebbe per sempre. (Stessa forma di `?vai=sessione`.) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("ricetta");
    if (!id) return;
    window.history.replaceState(null, "", "/cucina");
    const r = ricette.find((x) => x.id === id);
    if (r) apriRicetta(r);
  }, [ricette]);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/cucina/registro?giorno=${oggiIso}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!vivo) return;
        const per: Record<number, PastoAnnotato> = {};
        for (const a of (d?.pasti ?? []) as PastoAnnotato[]) per[a.indice] = a;
        setAnnotazioni(per);
      })
      .catch(() => { /* niente registro: le righe restano da annotare */ });
    return () => { vivo = false; };
  }, [oggiIso]);

  async function annota(p: PastoDelGiorno, stato: StatoPasto, testo?: string, ricettaId?: string | null) {
    setSalvo(p.indice);
    try {
      const r = await fetch("/api/cucina/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ giorno: oggiIso, indice: p.indice, pasto: p.pasto, stato, testo, ricettaId }),
      });
      const d = await r.json();
      if (!r.ok || !d?.pasto) throw new Error();
      setAnnotazioni((a) => ({ ...a, [p.indice]: d.pasto as PastoAnnotato }));
      setScriviAltro(null); setTestoAltro("");
    } catch {
      setMsg("Non sono riuscito a segnarlo. Riprova.");
    } finally { setSalvo(null); }
  }

  const [domanda, setDomanda] = useState("");
  /** Il campo della domanda: serve a portarci il dito quando si cerca una
   *  ricetta per un pasto. Il testo NON si precompila mai. */
  const campoRef = useRef<HTMLInputElement | null>(null);
  const [scelte, setScelte] = useState<string[]>([]);
  const [risultati, setRisultati] = useState<Risultato[] | null>(null);
  const [interpretazione, setInterpretazione] = useState<Interpretazione | null>(null);
  const [cerco, setCerco] = useState(false);
  /** Sta caricando ALTRE (in fondo), non la prima ricerca (a schermo pieno). */
  const [ancora, setAncora] = useState(false);
  /** Quante ne ha già chieste al server: è l'offset della prossima finestra. */
  const [mostrati, setMostrati] = useState(0);
  /** Ce ne sono altre già pagate, o il prossimo tocco costa un credito? */
  const [altrePronte, setAltrePronte] = useState(false);
  /** Dopo «Cerca ancora» si sta scorrendo la domanda GIRATA, non l'originale:
   *  serve saperlo, o «Mostrane altre» chiederebbe la finestra giusta della
   *  query sbagliata e tornerebbe a mani vuote. */
  const [variante, setVariante] = useState(false);
  /* ── LA RICERCA È CADUTA ──
     Non è lo stato vuoto, ed è la differenza che questo giro serve a fare:
     «non ho trovato ricette con i passi» parla del mondo, «non sono riuscito a
     cercare» parla di noi. Prima erano la stessa schermata, e quella sbagliata
     era la prima. */
  const [guasto, setGuasto] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const msgT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [lista, setLista] = useState<Recipe[]>(ricette);
  const [salvate, setSalvate] = useState<Set<string>>(new Set(ricette.map((r) => r.url)));
  /* ── L'ASSAGGIO E IL CONTESTO (8.1) ──
     Nella Cucina il ricettario e' un carosello e un campo piccolo; il posto
     dove si cerca davvero e' la pagina intera. Prima «vedi tutte» apriva una
     griglia QUI DENTRO, e una pagina che ha gia' il piano, la giornata pasto
     per pasto e la domanda diventava lunga il doppio senza diventare piu'
     utile. Vale la regola 3-septies-bis: il pannello (qui: l'assaggio) e' la
     cosa, la pagina e' il contesto. */
  const [filtroRicettario, setFiltroRicettario] = useState("");
  const [ricettarioAperto, setRicettarioAperto] = useState(false);
  const [spesaAperta, setSpesaAperta] = useState(false);
  /* Presentazione e basta: la card del piano si apre e mostra tutta la
     giornata. Nessun dato, nessuna chiamata. */
  const [pianoAperto, setPianoAperto] = useState(false);

  // ── V2: il foglio ricetta e la spesa ──────────────────────────────────
  const [aperta, setAperta] = useState<Aperta | null>(null);
  /* La sequenza «Cucina con Keiko» (8.3). Il foglio ricetta resta montato
     sotto: uscendo dai passi si torna alla ricetta, non alla Cucina. */
  const [cucinoCon, setCucinoCon] = useState<Aperta | null>(null);
  /* ── I PASSI SCRITTI A MANO ──
     Per i video il procedimento non c'è: si dice a voce e resta lì. Invece di
     un buco, la ricetta dice cosa fare — e questo è il campo dove si fa.
     Una riga = un passo, come li detteresti a qualcuno. */
  const [scrivoPassi, setScrivoPassi] = useState(false);
  const [testoPassi, setTestoPassi] = useState("");
  const [salvoPassi, setSalvoPassi] = useState(false);

  async function salvaPassi() {
    if (!aperta?.id) return;
    const passi = testoPassi.split("\n").map((r) => r.trim()).filter(Boolean);
    if (passi.length === 0) return;
    setSalvoPassi(true);
    try {
      const res = await fetch("/api/cucina/passi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: aperta.id, passi }),
      });
      const d = await res.json();
      if (!res.ok || !d?.estratta) throw new Error();
      const estratta = d.estratta as RicettaEstratta;
      setAperta((a) => (a && a.id === aperta.id ? { ...a, estratta } : a));
      setLista((l) => l.map((x) => (x.id === aperta.id ? { ...x, extracted: estratta } : x)));
      setScrivoPassi(false); setTestoPassi("");
      toast(passi.length === 1 ? "Un passo, salvato" : `${passi.length} passi, salvati`);
    } catch {
      toast("Non salvati, riprova");
    } finally { setSalvoPassi(false); }
  }
  const [estraggo, setEstraggo] = useState(false);
  /** Gli ingredienti che l'utente dice di avere già: NON vanno in lista. */
  const [inDispensa, setInDispensa] = useState<Set<number>>(new Set());
  const [spesa, setSpesa] = useState<ShoppingItem[]>(spesaIniziale);
  const [spesaOccupata, setSpesaOccupata] = useState(false);

  const toast = (t: string) => {
    if (msgT.current) clearTimeout(msgT.current);
    setMsg(t);
    msgT.current = setTimeout(() => setMsg(null), 2200);
  };

  const inRisultati = risultati !== null || cerco;

  /* La ricerca, in tre modi che si somigliano ma costano diverso:
   *   nuova    → la prima, dopo aver toccato →. Un credito.
   *   altre    → le sei successive fra le sedici GIÀ pagate. Zero.
   *   ancora   → una ricerca nuova con la domanda girata di poco. Un credito,
   *              e si vede che sta lavorando, perché è giusto saperlo. */
  async function cerca(modo: "nuova" | "altre" | "ancora" = "nuova") {
    const q = domanda.trim();
    if (!q) return;
    const da = modo === "altre" ? mostrati : 0;
    // «altre» scorre la stessa domanda di prima, qualunque fosse; «ancora» la
    // gira; «nuova» riparte pulita.
    const giraLaDomanda = modo === "ancora" || (modo === "altre" && variante);

    if (modo === "nuova") { setCerco(true); setRisultati(null); setInterpretazione(null); setVariante(false); setGuasto(false); }
    else setAncora(true);

    try {
      const p = new URLSearchParams({
        q,
        stile: scelte.map((s) => s.toLowerCase()).join(","),
        da: String(da),
        ...(giraLaDomanda ? { ancora: "1" } : {}),
      });
      const res = await fetch(`/api/cucina/search?${p}`, { credentials: "include" });
      const d = await res.json();
      const nuovi = (d?.risultati ?? []) as Risultato[];
      setInterpretazione((d?.interpretazione ?? null) as Interpretazione | null);
      setAltrePronte(!!d?.altrePronte);

      /* Il guasto si guarda PRIMA di tutto: una lista vuota che arriva da una
         ricerca caduta non è una lista vuota, è una cosa che non sappiamo. */
      if (d?.guasto || !res.ok) {
        setGuasto(true);
        setRisultati([]);
        return;
      }
      if (d?.senzaChiave) {
        setRisultati([]);
        toast("La ricerca arriva presto");
      } else if (modo === "nuova") {
        setRisultati(nuovi);
        setMostrati(nuovi.length);
        if (nuovi.length === 0) toast("Non ho trovato niente, prova con altre parole");
      } else {
        // Si appende, saltando quello che c'è già: «Cerca ancora» gira la
        // domanda, e una ricetta può tornare due volte.
        setRisultati((r) => {
          const viste = new Set((r ?? []).map((x) => x.url));
          const freschi = nuovi.filter((x) => !viste.has(x.url));
          if (freschi.length === 0) toast("Non ne trovo altre");
          return [...(r ?? []), ...freschi];
        });
        // «ancora» apre una lista nuova lato server: la finestra riparte da
        // quello che ha appena mandato, non da quanto c'è a schermo.
        if (modo === "ancora") { setVariante(true); setMostrati(nuovi.length); }
        else setMostrati((n) => n + nuovi.length);
      }
    } catch {
      /* Anche qui: se la richiesta non è nemmeno partita, il fatto è lo stesso —
         non abbiamo cercato. 🚫 Niente «Qualcosa non torna, riprovo»: è la
         frase che ha tenuto nascosta la lista della spesa rotta per mesi,
         perché minimizza e quindi nessuno la segnala. */
      setGuasto(true);
      if (modo === "nuova") setRisultati([]);
    } finally {
      setCerco(false);
      setAncora(false);
    }
  }

  /* ── IL PICK: si apre la ricetta, e solo allora si estrae ────────────────
   *
   * L'estrazione costa una chiamata, quindi parte QUI e non prima: cercare
   * dieci ricette non ne estrae dieci, ne estrae zero. Quella che apri, se è
   * nel ricettario, la si estrae una volta nella vita — `extracted` se la
   * ricorda e la seconda apertura non ripaga niente. */
  async function apri(r: Aperta) {
    setAperta(r);
    setInDispensa(new Set());
    if (r.estratta) return;                       // già letta: niente da fare
    setEstraggo(true);
    try {
      const res = await fetch("/api/cucina/estrai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: r.id, url: r.url, titolo: r.titolo, contenuto: r.contenuto }),
      });
      const d = await res.json();
      if (res.status === 429) { toast(d?.error || "Per oggi mi fermo qui 🌙"); setEstraggo(false); return; }
      const estratta = (d?.estratta ?? { insufficiente: true }) as RicettaEstratta;
      setAperta((a) => (a && a.url === r.url ? { ...a, estratta } : a));
      // Anche nel ricettario, così riaprirla da lì non ripassa dal modello.
      if (r.id && !estratta.insufficiente) {
        setLista((l) => l.map((x) => (x.id === r.id ? { ...x, extracted: estratta } : x)));
      }
    } catch {
      setAperta((a) => (a && a.url === r.url ? { ...a, estratta: { insufficiente: true } } : a));
    } finally {
      setEstraggo(false);
    }
  }

  /** Gli ingredienti che mancano: quelli che non hai spuntato. */
  const daComprare = useMemo(() => {
    const ing = aperta?.estratta?.ingredienti ?? [];
    return ing.filter((_, i) => !inDispensa.has(i));
  }, [aperta, inDispensa]);

  async function mandaInSpesa() {
    if (daComprare.length === 0) return;
    setSpesaOccupata(true);
    try {
      const res = await fetch("/api/cucina/spesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          azione: "aggiungi",
          fonte: "ricetta",
          ref: aperta?.id ?? null,
          voci: daComprare.map((i) => ({ nome: i.nome, quantita: i.quantita || null })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error);
      setSpesa((d.voci ?? []) as ShoppingItem[]);
      toast(`In lista: ${daComprare.length}`);
    } catch {
      toast("Non aggiunte, riprova");
    } finally {
      setSpesaOccupata(false);
    }
  }

  /** Un'azione qualsiasi sulla lista della spesa. */
  async function azioneSpesa(corpo: Record<string, unknown>, messaggio?: string) {
    setSpesaOccupata(true);
    try {
      const res = await fetch("/api/cucina/spesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(corpo),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error);
      if (Array.isArray(d?.voci)) setSpesa(d.voci as ShoppingItem[]);
      if (d?.nessuna) toast("Non c'è un piano da cui prendere");
      else if (messaggio) toast(messaggio);
    } catch {
      toast("Qualcosa non torna, riprova");
    } finally {
      setSpesaOccupata(false);
    }
  }

  /* ── LA SPESA DELLA SETTIMANA (9.2) ──
     Il piano di tutta la settimana → una lista sola, senza doppioni, con le
     quantità della stessa cosa sommate (`spesaDalPiano`). Ogni voce resta
     marcata `fonte: "piano"`, così davanti allo scaffale si sa da dove viene.

     ⚠️ LA DOMANDA PRIMA DI CANCELLARE. Chi c'è già e l'hai già spuntato NON
     torna da comprare: `addShoppingItems` usa `ignoreDuplicates`. Va bene al
     supermercato — quello che hai nel carrello ci resta — ma la settimana dopo
     è un buco: la cipolla comprata sette giorni fa risulta «presa», e la lista
     nuova non te la richiede mai più. Toglierle prima risolve, però è una
     cancellazione, e cancellare senza dirlo è peggio che chiedere una volta di
     troppo. Quindi si chiede, e si dice QUANTE sono e cosa succede in tutt'e
     due i casi. Niente `window.confirm` (regola 3-sexies): la domanda vive
     dentro il foglio. */
  const spuntate = spesa.filter((v) => v.spuntato).length;
  const [chiedoSettimana, setChiedoSettimana] = useState(false);

  async function spesaDellaSettimana(togliSpuntate: boolean) {
    setChiedoSettimana(false);
    setSpesaOccupata(true);
    try {
      let tolte = 0;
      if (togliSpuntate) {
        const r0 = await fetch("/api/cucina/spesa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ azione: "svuotaFatti" }),
        });
        const d0 = await r0.json();
        if (!r0.ok) throw new Error(d0?.error);
        tolte = (d0?.tolte as number) ?? 0;
      }
      const res = await fetch("/api/cucina/spesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ azione: "dalPiano" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error);
      if (Array.isArray(d?.voci)) setSpesa(d.voci as ShoppingItem[]);
      if (d?.nessuna) toast("Non c'è un piano da cui prendere");
      else if (tolte === 1) toast("Settimana pronta · 1 già presa tolta");
      else toast(tolte > 1 ? `Settimana pronta · ${tolte} già prese tolte` : "Settimana pronta");
    } catch {
      toast("Qualcosa non torna, riprova");
    } finally {
      setSpesaOccupata(false);
    }
  }

  /** Spunta al supermercato: subito a schermo, poi il server. */
  async function spunta(v: ShoppingItem) {
    setSpesa((s) => s.map((x) => (x.id === v.id ? { ...x, spuntato: !x.spuntato } : x)));
    try {
      await fetch("/api/cucina/spesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ azione: "spunta", id: v.id, spuntato: !v.spuntato }),
      });
    } catch {
      setSpesa((s) => s.map((x) => (x.id === v.id ? { ...x, spuntato: v.spuntato } : x)));
    }
  }

  const daPrendere = spesa.filter((v) => !v.spuntato).length;

  /** Salva: la spunta è SUL POSTO, sul bottone che hai appena toccato, e il
   *  toast è piccolo e se ne va da solo. Niente barre lunghe (mock §salva). */
  async function salva(r: Risultato) {
    setSalvate((s) => new Set(s).add(r.url));   // subito, senza aspettare il server
    try {
      const res = await fetch("/api/cucina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: r.titolo,
          url: r.url,
          thumbnail: r.miniatura,
          author: r.autore,
          platform: r.piattaforma,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error);
      setLista((l) => [d.ricetta as Recipe, ...l.filter((x) => x.url !== r.url)]);
      toast("Nel ricettario");
    } catch {
      setSalvate((s) => { const n = new Set(s); n.delete(r.url); return n; });
      toast("Non salvata, riprova");
    }
  }

  /** Elimina con Annulla, come in Guarda: sparisce subito, torna se ci ripensi. */
  async function elimina(r: Recipe) {
    const prima = lista;
    setLista((l) => l.filter((x) => x.id !== r.id));
    setSalvate((s) => { const n = new Set(s); n.delete(r.url); return n; });
    let annullato = false;

    if (msgT.current) clearTimeout(msgT.current);
    setMsg(`__ANNULLA__${r.title}`);
    const t = setTimeout(async () => {
      setMsg(null);
      if (annullato) return;
      try {
        const res = await fetch(`/api/cucina?id=${encodeURIComponent(r.id)}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setLista(prima);
        toast("Non eliminata, riprova");
      }
    }, 4000);
    msgT.current = t;

    (window as unknown as { __annullaCucina?: () => void }).__annullaCucina = () => {
      annullato = true;
      clearTimeout(t);
      setMsg(null);
      setLista(prima);
      setSalvate((s) => new Set(s).add(r.url));
    };
  }

  /* ── COPIA LA LISTA ──
     Davanti allo scaffale si guarda una lista, non si fa una ricerca. Il testo
     e' per un essere umano — una voce per riga, la quantita' dove c'e' — e
     funziona ovunque: negli appunti, in un messaggio, su un foglietto.
     Sostituisce il tasto «Amazon Fresh» che univa tutta la lista in UNA
     stringa e la mandava alla ricerca: Amazon cercava una frase che non
     esiste — «pollo zucchine olio pane» — e non trovava niente. La ricerca
     per singola voce, che e' l'unica che funziona, resta sulla riga. */
  async function copia(voci: { nome: string; quantita?: string | null }[], cosa: string) {
    const testo = voci.map((v) => (v.quantita ? `${v.nome} — ${v.quantita}` : v.nome)).join("\n");
    try {
      await navigator.clipboard.writeText(testo);
      setMsg(`${cosa} negli appunti`);
    } catch {
      setMsg("Non sono riuscito a copiare");
    }
  }

  /** Aprire una ricetta del ricettario: la stessa cosa da quattro punti
   *  diversi (il carosello, la pagina intera, «da rifare», `?ricetta=`), e
   *  quattro copie della stessa riga si sfasano alla prima modifica. */
  function apriRicetta(r: Recipe) {
    const dominio = (() => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return null; } })();
    apri({ id: r.id, titolo: r.title, url: r.url, miniatura: r.thumbnail, autore: r.author, piattaforma: r.platform, dominio, contenuto: null, estratta: r.extracted });
  }

  /* Il carosello: le prime dodici, filtrate da quello che stai scrivendo nel
     campo piccolo. Il filtro e' LOCALE — `lista` ce l'ha gia' tutta in mano —
     e non chiama nessuno: `/api/cucina/search` cerca sul web e costa un
     credito, e pagare per cercare fra le proprie ricette sarebbe pagare per
     cercare nel posto sbagliato. */
  const filtrate = useMemo(() => {
    const t = filtroRicettario.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (!t) return lista;
    const piatto = (s: string) => (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return lista.filter((r) => piatto(r.title).includes(t) || piatto(r.author ?? "").includes(t));
  }, [lista, filtroRicettario]);
  const scaffale = useMemo(() => filtrate.slice(0, 12), [filtrate]);

  /* La giornata in tre pezzi: quello che e' passato, quello che viene adesso,
     e quello che viene dopo. `passato` lo decide l'orologio ed e' gia' in
     `PastoDelGiorno`: qui e' impaginazione, non logica nuova. */
  /* Il confronto e' su `indice`, NON sull'identita' dell'oggetto: `giornata` e
     `prossimo` arrivano come due prop separate e attraversano il confine
     server/client indipendentemente, quindi si serializzano in due istanze
     diverse. Con `p !== prossimo` il pasto in corso finiva anche negli altri
     due elenchi, e con `===` non ci sarebbe finito mai. `indice` e' un numero
     e la serializzazione non lo tocca. */
  const passati = giornata.filter((p) => p.indice !== prossimo?.indice && p.passato);
  const successivi = giornata.filter((p) => p.indice !== prossimo?.indice && !p.passato);

  /* ── UNA RIGA DI PASTO ──
     Il pasto, e sotto le tre azioni. Quando e' gia' annotato la riga dice
     cosa hai scritto, e le azioni restano: ri-annotare CORREGGE (il vincolo
     sta in tabella, vedi docs/sql/cucina-registro.sql).
     🚫 Nessun segno di merito: «seguito» e «saltato» hanno lo stesso peso
     visivo, perche' qui non si dice se hai fatto bene. */
  function RigaPasto({ p, evidenza = false }: { p: PastoDelGiorno; evidenza?: boolean }) {
    const a = annotazioni[p.indice];
    const inCorso = salvo === p.indice;
    const detto = a?.stato === "seguito" ? "l'ho seguito"
      : a?.stato === "saltato" ? "l'ho saltato"
      : a?.stato === "altro" ? (a.testo || "ho mangiato altro")
      : null;
    return (
      <div style={{ padding: "12px 12px", borderTop: evidenza ? undefined : "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: evidenza ? 15 : 13.5, fontWeight: 600, letterSpacing: "-.01em", flex: 1, minWidth: 0 }}>
            {p.pasto}
          </span>
          <span className="status" style={{ margin: 0, flex: "none" }}>{p.ora ?? "—"}</span>
        </div>
        <div className="status" style={{ marginTop: 2 }}>{p.testo || "dal tuo piano"}</div>

        {detto && (
          <div className="status" style={{ marginTop: 6, color: "var(--teal-soft)" }}>
            {I.tick({ s: 12 })} {detto}
          </div>
        )}

        {scriviAltro === p.indice ? (
          <div className="ask" style={{ marginTop: 8, cursor: "auto" }}>
            <input
              autoFocus
              value={testoAltro}
              onChange={(e) => setTestoAltro(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") annota(p, "altro", testoAltro); }}
              placeholder="Cosa hai mangiato?"
              aria-label="Cosa hai mangiato"
              style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", padding: 0 }}
            />
            <button className="go tap" onClick={() => annota(p, "altro", testoAltro)} disabled={!testoAltro.trim()} aria-label="Segna" style={{ border: 0, cursor: "pointer", opacity: testoAltro.trim() ? 1 : 0.45 }}>
              {I.tick({ s: 14 })}
            </button>
          </div>
        ) : (
          <div className="chips" style={{ marginTop: 8, flexWrap: "wrap", overflow: "visible" }}>
            <button className={"chip tap" + (a?.stato === "seguito" ? " on" : "")} disabled={inCorso}
              onClick={() => annota(p, "seguito")} style={{ minHeight: 40 }}>l&apos;ho seguito</button>
            <button className={"chip tap" + (a?.stato === "altro" ? " on" : "")} disabled={inCorso}
              onClick={() => { setScriviAltro(p.indice); setTestoAltro(a?.testo ?? ""); }} style={{ minHeight: 40 }}>ho mangiato altro</button>
            <button className={"chip tap" + (a?.stato === "saltato" ? " on" : "")} disabled={inCorso}
              onClick={() => annota(p, "saltato")} style={{ minHeight: 40 }}>saltato</button>
            {/* La strada verso il ricettario. Porta alla ricerca col campo
                VUOTO: quello che cerchi lo scrivi tu. */}
            {evidenza && (
              <button className="chip tap" disabled={inCorso}
                onClick={() => { setCollegoA(p); setDomanda(""); campoRef.current?.focus(); campoRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }}
                style={{ minHeight: 40 }}>{I.pot({ s: 12 })}l&apos;ho cucinata</button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="k2">
        <div className="screen" style={{ paddingBottom: PAGE_PB }}>
          {inRisultati ? (
            /* ════════ SCHERMO RISULTATI ════════ */
            <>
              <div className="head">
                <button
                  className="x tap"
                  onClick={() => { setRisultati(null); setInterpretazione(null); }}
                  aria-label="Torna a Cucina"
                  style={{ color: "inherit" }}
                >
                  {I.back({ s: 15 })}
                </button>
                <div className="col">
                  <h1>Ricette</h1>
                  {/* Anche la riga piccola: con un guasto, «0 trovate» sarebbe
                      la stessa bugia della schermata, scritta piu' piccola. */}
                  <div className="status">
                    {cerco ? "sto cercando" : guasto ? "ricerca non riuscita" : `${risultati?.length ?? 0} trovate`}
                  </div>
                </div>
              </div>

              {/* Cosa ha capito Keiko. Quando traduce una situazione lo DICE: chi
                  cerca deve poter vedere se ha capito male, non indovinarlo dai
                  risultati. È la cosa che rende la Cucina diversa da una ricerca,
                  e per questo sta in teal. */}
              {interpretazione && (
                <div className="hint">
                  {I.orca(14)}
                  <p>
                    {interpretazione.viaAi ? (
                      <>Hai chiesto <b>«{interpretazione.originale}»</b> — cerco <b>{interpretazione.cercato}</b></>
                    ) : (
                      <>Cerco <b>{interpretazione.cercato}</b></>
                    )}
                  </p>
                </div>
              )}

              {/* durante l'attesa: gli scheletri, non lo spinner */}
              {cerco && <div style={{ marginTop: 12 }}><Skeleton rows={3} /></div>}

              {!cerco && risultati?.map((r) => {
                const salvato = salvate.has(r.url);
                const video = r.piattaforma === "tiktok" || r.piattaforma === "youtube";
                return (
                  <div key={r.url} style={{ marginTop: 12 }}>
                    <Feature
                      /* L'icona dice che cosa stai per aprire: un video si
                         guarda, una pagina si legge. */
                      k={<>{video ? I.play({ s: 12 }) : I.doc({ s: 12 })}{nomeFonte(r)}</>}
                      t={r.titolo}
                      /* ⚠️ NIENTE ETICHETTA, dal 17 agosto 2026, ed è il senso
                         del filtro: qui dentro ci sono SOLO ricette da cui i
                         passi si riescono a tirare fuori. Prima c'era scritto
                         «ricetta completa» o «i passi sono nel video» — cioè si
                         marcava anche quello che non si poteva cucinare, e chi
                         cercava doveva leggere e scartare. Quel lavoro adesso
                         lo fa la rotta. Che sia un video o una pagina si vede
                         già dall'icona e dalla fonte, qui sopra. */
                      onClick={() => apri({ id: lista.find((x) => x.url === r.url)?.id ?? null, titolo: r.titolo, url: r.url, miniatura: r.miniatura, autore: r.autore, piattaforma: r.piattaforma, dominio: r.dominio, contenuto: r.contenuto ?? null, estratta: lista.find((x) => x.url === r.url)?.extracted ?? null })}
                      img={r.miniatura}
                    >
                      <div className="pactions">
                        <button
                          className={salvato ? "btn2 tap" : "cta tap"}
                          onClick={(e) => { e.stopPropagation(); if (!salvato) salva(r); }}
                          aria-disabled={salvato || undefined}
                        >
                          {salvato ? <>{I.tick({ s: 13 })}Nel ricettario</> : <>{I.plus({ s: 13 })}Salva</>}
                        </button>
                      </div>
                    </Feature>
                  </div>
                );
              })}

              {/* Mostrane altre → dalle già pagate, immediato.
                  Cerca ancora → una ricerca nuova, e si vede che ci sta lavorando. */}
              {!cerco && (risultati?.length ?? 0) > 0 && (
                <button
                  className="btn2 wide tap"
                  style={{ marginTop: 14 }}
                  onClick={() => cerca(altrePronte ? "altre" : "ancora")}
                  disabled={ancora}
                >
                  {ancora ? "Cerco ancora…" : altrePronte ? "Mostrane altre" : "Cerca ancora"}
                </button>
              )}

              {/* ── LA RICERCA CADUTA ──
                  Dice di chi è la colpa, e offre l'unica cosa che serve:
                  riprovare. Sta prima dello stato vuoto perché quando c'è un
                  guasto lo stato vuoto sarebbe una bugia. */}
              {!cerco && guasto && (
                <div style={{ marginTop: 14 }}>
                  <Empty
                    icon={I.info({ s: 24 })}
                    t="Non sono riuscito a cercare"
                    m="La ricerca non ha risposto. Non vuol dire che non ci siano ricette:<br/>vuol dire che non sono riuscito a guardare."
                    cta="Riprova"
                    onCta={() => cerca("nuova")}
                  />
                </div>
              )}

              {/* ── IL VUOTO DOPO IL FILTRO ──
                  Non è un errore, è una risposta. Da quando la ricerca
                  consegna solo quello che si cucina, «non ho trovato niente»
                  sarebbe pure una bugia: i risultati c'erano, nessuno aveva i
                  passi. Dirlo per intero serve anche a spiegare perché a volte
                  la lista è corta. */}
              {!cerco && !guasto && risultati?.length === 0 && (
                <div style={{ marginTop: 14 }}>
                  <Empty
                    icon={I.pot({ s: 24 })}
                    t={ricercaAttiva ? "Nessuna con i passi" : "La ricerca arriva presto"}
                    m={ricercaAttiva
                      ? "Di questa non ho trovato nessuna versione con il procedimento scritto.<br/>Prova con altre parole, o dimmi la situazione invece degli ingredienti."
                      : "il ricettario funziona già"}
                  />
                </div>
              )}
            </>
          ) : (
            /* ════════ SCHERMO CUCINA ════════ */
            <>
              <div className="head">
                <div className="col">
                  <h1>Cucina</h1>
                  <div className="status">
                    {prossimo ? `${quandoDetto(prossimo)} · ${prossimo.pasto}` : `${lista.length} ricette nel ricettario`}
                  </div>
                </div>
              </div>

              {/* ① IL PIANO — solo per chi ce l'ha.
                  Si MOSTRA e si ESEGUE: qui non c'è una riga che lo confronti
                  con le ricette. */}
              {prossimo && (
                <>
                  <DayCard
                    n={new Date().getDate()}
                    d={quandoDetto(prossimo)}
                    main={prossimo.testo || prossimo.pasto}
                    meta={`${prossimo.pasto} · dal tuo piano`}
                    dot="dieta"
                    today
                    open={pianoAperto}
                    onToggle={() => setPianoAperto((v) => !v)}
                    rows={giornata.map((p) => [p.ora ?? "—", p.testo || p.pasto])}
                  />

                  {/* ── LA GIORNATA, PASTO PER PASTO ──
                      Prima qui c'era una fila di pallini: diceva a che punto
                      sei e nient'altro. Adesso ogni pasto e' una riga su cui
                      si puo' ANNOTARE, senza aprire niente — «l'ho seguito»,
                      «ho mangiato altro», «l'ho saltato».
                      I passati stanno sopra, RACCOLTI e non spariti: la
                      giornata si legge dall'inizio, e un pasto di stamattina
                      si annota anche alle nove di sera.
                      🚫 Nessun confronto col piano: la riga dice cosa hai
                      scritto tu, non se hai fatto bene. Vedi 3-decies. */}
                  {passati.length > 0 && (
                    <div className="srf" style={{ marginTop: 12 }}>
                      <div
                        className="row-act tap"
                        role="button"
                        onClick={() => setPassatiAperti((v) => !v)}
                        aria-expanded={passatiAperti}
                      >
                        <span className="ic2">{I.hist({ s: 16 })}</span>
                        <span className="in">
                          <span className="t">Prima di adesso</span>
                          <span className="m">
                            {passati.length} {passati.length === 1 ? "pasto" : "pasti"}
                            {" · "}
                            {passati.filter((p) => annotazioni[p.indice]).length} annotati
                          </span>
                        </span>
                        {I.chev({ c: "chev", st: passatiAperti ? { transform: "rotate(180deg)" } : undefined })}
                      </div>
                      {passatiAperti && passati.map((p) => <RigaPasto key={p.indice} p={p} />)}
                    </div>
                  )}

                  {/* Il prossimo, in evidenza: e' quello su cui stai per
                      decidere qualcosa. */}
                  {prossimo && (
                    <div className="srf" style={{ marginTop: 12 }}>
                      <RigaPasto p={prossimo} evidenza />
                    </div>
                  )}

                  {successivi.length > 0 && (
                    <div className="srf" style={{ marginTop: 12 }}>
                      {successivi.map((p) => <RigaPasto key={p.indice} p={p} />)}
                    </div>
                  )}

                </>
              )}

              {/* Il ponte verso la Dieta. La barra in fondo porta qui, alla
                  Cucina; il piano della nutrizionista sta in /salute, e senza
                  questa riga non ci si arriverebbe piu' da nessuna parte.
                  Sta nella sezione del piano perche' e' li' che serve: stai
                  guardando cosa mangi oggi e vuoi vedere la settimana intera.
                  E resta una LETTURA: di qui non si scrive niente. */}
              <div className="srf" style={{ marginTop: prossimo ? 12 : 0 }}>
                {/* Lo storico sta FUORI dal ramo del piano: si annota solo con
                    un piano, ma quello che hai gia' annotato resta da guardare
                    anche il giorno che il piano non c'e' piu'. E' l'errore
                    fatto due volte in Allenamento, non rifatto qui. */}
                <div className="row-act tap" onClick={() => setStoricoAperto(true)} role="button">
                  <span className="ic2">{I.hist({ s: 16 })}</span>
                  <span className="in">
                    <span className="t">Cosa hai mangiato</span>
                    <span className="m">giorno per giorno, come l&apos;hai scritto tu</span>
                  </span>
                  {I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
                </div>
                <div className="row-act tap" onClick={() => router.push("/salute")} role="button">
                  <span className="ic2">{I.doc({ s: 16 })}</span>
                  <span className="in">
                    <span className="t">La tua dieta</span>
                    <span className="m">il piano della nutrizionista, settimana intera</span>
                  </span>
                  {I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
                </div>
              </div>

              {/* Stai scegliendo cosa hai cucinato per un pasto. La fascia lo
                  dice e si puo' annullare: senza, toccare una ricetta
                  annoterebbe un pasto senza che tu te lo aspetti. */}
              {collegoA && (
                <div className="hint" style={{ marginTop: 12 }}>
                  {I.pot({ s: 14 })}
                  <p style={{ flex: 1 }}>
                    Cerca la ricetta che hai fatto per <b>{collegoA.pasto}</b>, e aprila.
                  </p>
                  <button className="tert tap" style={{ flex: "none", padding: "0 2px" }} onClick={() => setCollegoA(null)}>Annulla</button>
                </div>
              )}

              {/* ② LA DOMANDA */}
              <Sec sm="dimmi la situazione, non solo gli ingredienti">Cosa mangiamo?</Sec>

              {/* La barra del sistema, con dentro un campo vero: la domanda si
                  scrive e parte con Invio, come prima. 16px, o iOS ingrandisce
                  la pagina al primo tocco e non torna indietro. */}
              <div className="ask" style={{ cursor: "auto" }}>
                <span style={{ color: "var(--teal)", flex: "none", display: "flex" }}>{I.orca(19)}</span>
                <input
                  ref={campoRef}
                  value={domanda}
                  onChange={(e) => setDomanda(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") cerca("nuova"); }}
                  placeholder="Cosa c'è in frigo? Che voglia hai?"
                  aria-label="Cosa cerchi"
                  style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", padding: 0 }}
                />
                <button
                  className="go tap"
                  onClick={() => cerca("nuova")}
                  disabled={!domanda.trim()}
                  aria-label="Cerca"
                  style={{ opacity: domanda.trim() ? 1 : 0.45 }}
                >
                  {I.right({ s: 14 })}
                </button>
              </div>

              <span className="chips">
                {CHIP.map((c) => {
                  const on = scelte.includes(c);
                  return (
                    <Chip key={c} on={on} onClick={() => setScelte((sc) => (on ? sc.filter((x) => x !== c) : [...sc, c]))}>
                      {c}
                    </Chip>
                  );
                })}
              </span>

              <div className="hint">
                {I.info({ s: 14 })}
                <p>Dimmi la situazione, non solo gli ingredienti: <b>«serata tra amici per la partita»</b> la capisco.</p>
              </div>

              {!ricercaAttiva && (
                <span className="rx">La ricerca arriva presto. Il ricettario funziona già.</span>
              )}

              {/* ③ IL RICETTARIO — l'assaggio (8.1)
                  Un carosello che scorre, e sotto un campo piccolo per
                  restringerlo. Chi vuole cercare davvero apre la pagina
                  intera: li' ci stanno le copertine grandi e i filtri. */}
              {lista.length > 0 && (
                <>
                  <Sec
                    sm={filtroRicettario.trim() ? `${filtrate.length} di ${lista.length}` : `${lista.length} salvate`}
                    more="vedi tutte"
                    onMore={() => setRicettarioAperto(true)}
                  >
                    Il tuo ricettario
                  </Sec>

                  {/* Lo scaffale che scorre, con lo scroll-snap che `.shelf`
                      ha gia': una card non resta mai tagliata a meta'. */}
                  {scaffale.length > 0 && (
                    <div className="shelf">
                      {scaffale.map((r) => (
                        <div key={r.id} style={{ width: 150, flex: "none", position: "relative" }}>
                          <Content
                            img={r.thumbnail ?? ""}
                            t={r.title}
                            m={r.author || nomeFonte(r)}
                            dot="dieta"
                            onClick={() => apriRicetta(r)}
                          />
                          <button
                            className="tap"
                            onClick={(e) => { e.stopPropagation(); elimina(r); }}
                            aria-label={`Togli ${r.title}`}
                            style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, display: "grid", placeItems: "center", background: "rgba(6,7,11,.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: 0, borderRadius: 9, color: "#fff", cursor: "pointer" }}
                          >
                            {I.close({ s: 12 })}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* La ricerca piccola. Superficie neutra e una lente: non e'
                      `.ask`, che col bordo teal e l'orca vuol dire «Keiko va a
                      cercare fuori» — cioe' un credito. Questa filtra quello
                      che hai gia' in casa e non chiama nessuno. */}
                  <div
                    className="srf"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginTop: 10 }}
                  >
                    <span style={{ color: "var(--meta)", flex: "none", display: "flex" }}>{I.search({ s: 15 })}</span>
                    <input
                      value={filtroRicettario}
                      onChange={(e) => setFiltroRicettario(e.target.value)}
                      placeholder="Cerca fra le tue ricette"
                      aria-label="Cerca fra le tue ricette"
                      style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", padding: 0 }}
                    />
                    {filtroRicettario && (
                      <button
                        className="tap"
                        onClick={() => setFiltroRicettario("")}
                        aria-label="Cancella la ricerca"
                        style={{ flex: "none", background: "none", border: 0, color: "var(--meta)", cursor: "pointer", display: "flex", padding: 0 }}
                      >
                        {I.close({ s: 13 })}
                      </button>
                    )}
                  </div>

                  {/* Il filtro non trova niente qui, ma la pagina intera cerca
                      anche sull'autore e sulla piattaforma: la strada resta
                      aperta invece di finire in un vuoto. */}
                  {filtroRicettario.trim() && filtrate.length === 0 && (
                    <span className="rx">
                      Nessuna che si chiami così.{" "}
                      <button
                        className="tap"
                        onClick={() => setRicettarioAperto(true)}
                        style={{ background: "none", border: 0, padding: 0, color: "var(--teal-soft)", fontWeight: 600, fontSize: "inherit", fontFamily: "inherit", cursor: "pointer" }}
                      >
                        Cerca nel ricettario intero
                      </button>
                    </span>
                  )}

                  {/* Il carosello si ferma a dodici: e' un assaggio. Le altre
                      stanno nel contesto, che e' la pagina. */}
                  {!filtroRicettario.trim() && lista.length > scaffale.length && (
                    <span className="rx">
                      Ne vedi {scaffale.length} di {lista.length}. Le altre sono nel ricettario.
                    </span>
                  )}
                </>
              )}

              {/* Da rifare — il battito della ricetta. Niente azione, niente
                  battito: se non c'è una ricetta abbastanza vecchia, non compare. */}
              {rifare && (
                <>
                  <Sec>Da rifare</Sec>
                  <div
                    className="hint warm tap"
                    onClick={() => { const r = lista.find((x) => x.id === rifare.id); if (r) apriRicetta(r); }}
                    role="button"
                  >
                    {I.hist({ s: 14 })}
                    <p>
                      È {daQuanto(rifare.giorni)} che non apri <b>{rifare.titolo}</b>
                      {rifare.volte > 0 ? ` — e l'hai fatta ${rifare.volte} volte.` : "."} Stasera?
                    </p>
                  </div>
                </>
              )}

              {/* il vuoto ben fatto: non è una pagina spenta */}
              {lista.length === 0 && (
                <div style={{ marginTop: 16 }}>
                  <Empty
                    icon={I.orca(26)}
                    t="Il ricettario è vuoto"
                    m="Cerco la ricetta, tu cucini."
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ════════ LA PASTIGLIA SPESA ════════
            Vive sopra il fondo pagina, che è quello condiviso di KeikoNav.
            Nessun numero finto accanto al carrello: un contatore inventato è
            una bugia piccola che si nota. */}
        {!inRisultati && (
          <button
            className="btn2 tap"
            onClick={() => setSpesaAperta(true)}
            style={{
              position: "fixed", left: "50%", transform: "translateX(-50%)",
              bottom: "calc(env(safe-area-inset-bottom) + 96px)", zIndex: 40,
              display: "inline-flex", alignItems: "center", gap: 9,
              boxShadow: "0 14px 36px rgba(0,0,0,.55)",
            }}
          >
            {I.cart({ s: 15 })}
            Spesa{daPrendere > 0 && <> · <b style={{ color: "var(--teal-soft)" }}>{daPrendere}</b></>}
          </button>
        )}

        {/* ════════ IL FOGLIO RICETTA ════════ */}
        {aperta && (
          <Sheet onClose={() => setAperta(null)}>
            <div className="sheet-hero">
              <div className="ph" style={{ position: "absolute", inset: 0, borderRadius: 0 }}>
                <Miniatura src={aperta.miniatura} dimensione={64} subito />
              </div>
              <div className="in">
                <div className="k">
                  {aperta.piattaforma === "tiktok" || aperta.piattaforma === "youtube" ? I.play({ s: 12 }) : I.doc({ s: 12 })}
                  {nomeFonte(aperta)}
                </div>
                <h2>{aperta.titolo}</h2>
              </div>
            </div>

            <div className="pad">
              {/* Il link al video originale è SEMPRE visibile: la ricetta è di
                  chi l'ha girata, e da qui si va a dargli la visualizzazione.
                  Il video non si incorpora e non si copia. */}
              {/* «L'HO CUCINATA PER…» — il legame nasce QUI, da questo tocco.
                  Compare solo se stai collegando un pasto: fuori da quel giro
                  una ricetta e' una ricetta e basta.
                  Si registra come «ho mangiato altro» col titolo della ricetta
                  e il suo id: e' un fatto («quel giorno ho cucinato questa»),
                  non un confronto col piano. */}
              {collegoA && aperta.id && (
                <button
                  className="cta wide tap"
                  style={{ marginTop: 14 }}
                  onClick={async () => {
                    const p2 = collegoA;
                    setAperta(null);
                    setCollegoA(null);
                    await annota(p2, "altro", aperta.titolo, aperta.id);
                    setMsg(`Segnata per ${p2.pasto}`);
                  }}
                >
                  {I.tick({ s: 15 })}L&apos;ho cucinata per {collegoA.pasto}
                </button>
              )}

              {/* Un video si guarda, una pagina si apre: dal 15 agosto qui
                  dentro arrivano anche i blog, e «Guarda il video originale»
                  sopra una pagina di GialloZafferano era una bugia piccola.
                  In tutt'e due i casi si esce di qui e si va da chi l'ha
                  scritta: la visita è sua. */}
              <a className="btn2 wide tap" href={aperta.url} target="_blank" rel="noreferrer"
                 style={{ marginTop: 14, textDecoration: "none", display: "flex" }}>
                <LogoPiattaforma p={aperta.piattaforma} size={13} />
                {aperta.piattaforma === "tiktok" || aperta.piattaforma === "youtube"
                  ? "Guarda il video originale"
                  : "Apri la ricetta originale"}
                {I.up({ s: 13 })}
              </a>

              {estraggo && <div style={{ marginTop: 14 }}><Skeleton rows={2} /></div>}

              {/* meta: solo quello che il creator ha scritto */}
              {!estraggo && (aperta.estratta?.tempo || aperta.estratta?.porzioni) && (
                <span className="dchips" style={{ marginTop: 14 }}>
                  {aperta.estratta?.tempo && <span className="dchip">{aperta.estratta.tempo}</span>}
                  {aperta.estratta?.porzioni && <span className="dchip">{aperta.estratta.porzioni}</span>}
                </span>
              )}

              {/* ingredienti spuntabili */}
              {!estraggo && (aperta.estratta?.ingredienti?.length ?? 0) > 0 && (
                <>
                  <Sec sm="tocca quello che hai già">Ingredienti</Sec>
                  <div className="srf list">
                    {aperta.estratta!.ingredienti!.map((ing, i) => {
                      const ce = inDispensa.has(i);
                      return (
                        <div
                          className={"item" + (ce ? " done" : "")}
                          key={`${ing.nome}-${i}`}
                        >
                          <div
                            className="item-row tap"
                            onClick={() => setInDispensa((d) => { const n = new Set(d); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                            role="checkbox"
                            aria-checked={ce}
                          >
                            <CheckV2 on={ce} />
                            <span className="in"><span className="tx">{ing.nome}</span></span>
                            {ing.quantita && <span className="idata">{ing.quantita}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ⚠️ `.btn2` e non `.cta`, dal 14 agosto 2026 (3-quinquies).
                      Il foglio ricetta È UN CONTESTO SOLO: novanta pixel più
                      giù c'è «Cucina con Keiko», e due terracotta dentro lo
                      stesso sguardo l'occhio li mette in gara. Vince quella che
                      riguarda il punto in cui sei — hai aperto una ricetta, stai
                      per cucinarla — e questa resta, cambiando solo peso: la
                      spesa la fai un altro giorno. */}
                  <div className="pactions" style={{ marginTop: 12 }}>
                    <button
                      className="btn2 tap"
                      onClick={mandaInSpesa}
                      disabled={daComprare.length === 0 || spesaOccupata}
                      style={{ opacity: daComprare.length === 0 || spesaOccupata ? 0.5 : 1 }}
                    >
                      {I.cart({ s: 13 })}
                      In lista spesa ({daComprare.length})
                    </button>
                    {daComprare.length > 0 && (
                      <button className="btn2 tap" onClick={() => copia(daComprare, "Ingredienti")}>
                        {I.copy({ s: 13 })}Copia
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* I passi. Dall'ondata 3 al blocco 8 qui c'era scritto che «un
                  passo per volta» sarebbe stata una funzione nuova travestita
                  da restyling, e che quindi l'elenco restava un elenco. Adesso
                  la funzione c'e' davvero, ed e' una schermata sua: l'elenco
                  resta per leggere tutto in un colpo, «Cucina con Keiko» e' per
                  quando hai le mani in pasta.
                  La primaria di QUESTO riquadro e' cucinare (3-quinquies: il
                  contesto e' il blocco, e questo ha il suo titolo). */}
              {!estraggo && (aperta.estratta?.passi?.length ?? 0) > 0 && (
                <>
                  {/* Da dove vengono i passi, detto QUI: è la riga attaccata a
                      quello che poi si cucina. Prima diceva sempre «dalla
                      descrizione del video», che era falso ogni volta che i
                      passi arrivavano da una pagina. */}
                  <Sec>Come si fa</Sec>
                  <Fonte aperta={aperta} />

                  <button
                    className="cta wide tap"
                    onClick={() => setCucinoCon(aperta)}
                    style={{ marginBottom: 12 }}
                  >
                    {I.pot({ s: 15 })}Cucina con Keiko
                  </button>
                  <div className="srf list">
                    {aperta.estratta!.passi!.map((passo, i) => (
                      <div className="item" key={i}>
                        <div className="item-row" style={{ alignItems: "flex-start", cursor: "default" }}>
                          {/* il numero del passo: una sola forma, in linea,
                              perche' il foglio condiviso e' generato dal mock
                              e non si scrive a mano. Teal, non terracotta: il
                              terracotta sta solo sulla primaria e sul FAB. */}
                          <span style={{
                            width: 24, height: 24, borderRadius: "50%", flex: "none", marginTop: 1,
                            background: "rgba(61,165,196,.14)", color: "var(--teal-soft)",
                            fontSize: 12, fontWeight: 600, display: "grid", placeItems: "center",
                          }}>{i + 1}</span>
                          <span className="in"><span className="rx" style={{ marginTop: 0 }}>{passo}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── QUANDO I PASSI NON CI SONO ──
                  È il caso NORMALE dei video, non un'eccezione: misurato il 15
                  agosto, 0 ricette su 4 avevano il procedimento. Chi gira un
                  video lo dice a voce e sotto scrive la lista della spesa.
                  Qui non si lascia un buco e non si constata il buco: si dice
                  cosa fare. E quello che scrivi RESTA — da lì «Cucina con
                  Keiko» funziona come per le ricette complete.
                  🚫 Nessun tasto «ricavali dall'audio»: vedi il resoconto del
                  15 agosto — YouTube dichiara la pista dei sottotitoli ma non
                  la serve a nessuno che non sia il suo player, e i video di
                  TikTok non si scaricano (è la stessa regola per cui non li
                  incorporiamo). Un tasto che non sa cosa fare non si mette. */}
              {!estraggo && aperta.estratta && !aperta.estratta.insufficiente
                && (aperta.estratta.passi?.length ?? 0) === 0 && (
                <>
                  <Sec sm="questo video non li ha scritti">Come si fa</Sec>
                  <div className="hint warm">
                    {I.info({ s: 14 })}
                    <p>
                      <b>I passi sono nel video.</b> Chi l&apos;ha girato li dice a voce, e sotto ha
                      scritto solo gli ingredienti. Scrivili tu mentre guardi — restano qui, e da
                      qui si cucina un passo per volta.
                    </p>
                  </div>

                  {!aperta.id ? (
                    /* Senza un posto dove metterli, scriverli sarebbe buttarli:
                       prima si salva la ricetta, poi si scrive. */
                    <p className="rx">Salvala nel ricettario, così i passi che scrivi restano.</p>
                  ) : scrivoPassi ? (
                    <>
                      <textarea
                        autoFocus
                        value={testoPassi}
                        onChange={(e) => setTestoPassi(e.target.value)}
                        placeholder={"Un passo per riga.\nMetti l'acqua a bollire.\nTaglia le zucchine a rondelle."}
                        aria-label="I passi, uno per riga"
                        rows={6}
                        style={{
                          width: "100%", marginTop: 12, padding: 12, borderRadius: "var(--r-card)",
                          background: "var(--lv1)", border: "1px solid var(--line)", color: "var(--txt)",
                          fontSize: 16, fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", outline: 0,
                        }}
                      />
                      <div className="pactions" style={{ marginTop: 10 }}>
                        <button className="cta tap" onClick={salvaPassi} disabled={salvoPassi || !testoPassi.trim()}
                          style={{ opacity: salvoPassi || !testoPassi.trim() ? 0.5 : 1 }}>
                          {salvoPassi ? "Salvo…" : "Salva i passi"}
                        </button>
                        <button className="tert tap" onClick={() => { setScrivoPassi(false); setTestoPassi(""); }}>
                          Annulla
                        </button>
                      </div>
                      <span className="rx">Una riga, un passo. Li puoi correggere quando vuoi.</span>
                    </>
                  ) : (
                    <button className="cta wide tap" style={{ marginTop: 12 }}
                      onClick={() => { setScrivoPassi(true); setTestoPassi(""); }}>
                      {I.pen({ s: 14 })}Scrivili tu
                    </button>
                  )}
                </>
              )}

              {/* caption povera: si dice, e non si inventa niente */}
              {!estraggo && aperta.estratta?.insufficiente && (
                <>
                  <div className="hint warm" style={{ marginTop: 16 }}>
                    {I.info({ s: 14 })}
                    <p>
                      <b>La ricetta completa è nel video.</b> Chi l&apos;ha girato non ha scritto
                      ingredienti e passaggi sotto al video, e io non me li invento.
                    </p>
                  </div>
                  <a className="cta wide tap" href={aperta.url} target="_blank" rel="noreferrer"
                     style={{ marginTop: 12, textDecoration: "none" }}>
                    Apri il video{I.up({ s: 13 })}
                  </a>
                </>
              )}

              {/* Se non è ancora nel ricettario, si può metterla da qui: la
                  prossima apertura non ripasserà dal modello. */}
              {!aperta.id && !salvate.has(aperta.url) && !estraggo && (
                <button
                  className="cta wide tap"
                  style={{ marginTop: 14 }}
                  onClick={() => salva({ titolo: aperta.titolo, url: aperta.url, miniatura: aperta.miniatura, autore: aperta.autore, piattaforma: (aperta.piattaforma as Risultato["piattaforma"]) ?? "web", dominio: "" })}
                >
                  {I.plus({ s: 14 })}Salva nel ricettario
                </button>
              )}

              {/* La provenienza sta attaccata ai passi (vedi `Fonte`), non qui:
                  ripeterla in fondo, e per giunta con «non modificata» — che
                  vale per ogni ricetta di Keiko — era rumore due volte. */}
              <p className="rx" style={{ textAlign: "center", marginTop: 18 }}>
                Keiko non dà consigli nutrizionali.
              </p>
            </div>
          </Sheet>
        )}

        {/* ════════ IL FOGLIO SPESA ════════ */}
        {spesaAperta && (
          <Sheet onClose={() => setSpesaAperta(false)}>
            <div className="plain-head">
              <h2>La spesa</h2>
            </div>
            <div className="pad">
              <div className="sub">Dal piano della settimana e dalle tue ricette</div>

              {/* Il totale sta in cima: quanto manca si legge prima di scorrere,
                  non dopo. */}
              {spesa.length > 0 && (
                <div className="srf" style={{ marginTop: 12, padding: "14px 12px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.01em" }}>
                    {daPrendere === 0 ? "Preso tutto." : `${daPrendere} ancora da prendere`}
                  </div>
                  <div className="status">{spesa.length} in lista</div>
                </div>
              )}

              {spesa.length === 0 ? (
                <div style={{ marginTop: 12 }}>
                  <Empty
                    icon={I.cart({ s: 24 })}
                    t="Ancora vuota"
                    m="Apri una ricetta e manda in lista quello che ti manca,<br/>oppure prendi quello che serve per la settimana."
                  />
                </div>
              ) : (
                /* raggruppate per provenienza: il piano da una parte, le
                   ricette dall'altra, così si sa da dove viene ogni riga */
                (["piano", "ricetta"] as const).map((fonte) => {
                  const righe = spesa.filter((v) => v.fonte === fonte);
                  if (righe.length === 0) return null;
                  return (
                    <div key={fonte}>
                      <Sec sm={`${righe.filter((v) => !v.spuntato).length} da prendere`}>
                        {fonte === "piano" ? "Dal piano" : "Dalle ricette"}
                      </Sec>
                      <div className="srf list">
                        {righe.map((v) => (
                          <div className={"item" + (v.spuntato ? " done" : "")} key={v.id}>
                            <div className="item-row" style={{ cursor: "default" }}>
                              <span className="tap" onClick={() => spunta(v)} role="checkbox" aria-checked={v.spuntato} aria-label={v.nome} style={{ display: "flex", flex: "none", cursor: "pointer" }}>
                                <CheckV2 on={v.spuntato} />
                              </span>
                              <span className="in"><span className="tx">{v.nome}</span></span>
                              {v.quantita && <span className="idata">{v.quantita}</span>}
                              <a
                                className="chevhit tap"
                                href={amazonFresh(v.nome)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Cerca ${v.nome} su Amazon Fresh`}
                                style={{ color: "var(--meta)" }}
                              >
                                {I.up({ s: 13 })}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}

              {/* La domanda, quando c'è qualcosa di già spuntato. Dice il
                  numero e la conseguenza di TUTT'E DUE le risposte: non è una
                  conferma, è una scelta. */}
              {chiedoSettimana && (
                <div className="srf" style={{ marginTop: 16, padding: "14px 12px" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em" }}>
                    {spuntate} {spuntate === 1 ? "voce già presa" : "voci già prese"}
                  </div>
                  <p className="rx" style={{ marginTop: 6 }}>
                    Se le lascio, quelle stesse cose non tornano nella lista nuova: risultano già
                    prese. Se le tolgo, spariscono dalla lista e la settimana riparte pulita.
                  </p>
                  <div className="pactions" style={{ marginTop: 12 }}>
                    <button className="cta tap" onClick={() => spesaDellaSettimana(true)} disabled={spesaOccupata}>
                      Toglile e rifai
                    </button>
                    <button className="btn2 tap" onClick={() => spesaDellaSettimana(false)} disabled={spesaOccupata}>
                      Lasciale dove sono
                    </button>
                    <button className="tert tap" onClick={() => setChiedoSettimana(false)}>Annulla</button>
                  </div>
                </div>
              )}

              <div className="pactions" style={{ marginTop: 16 }}>
                <button
                  className="cta tap"
                  onClick={() => (spuntate > 0 ? setChiedoSettimana(true) : spesaDellaSettimana(false))}
                  disabled={spesaOccupata || chiedoSettimana}
                  style={{ opacity: spesaOccupata || chiedoSettimana ? 0.6 : 1 }}
                >
                  La spesa della settimana
                </button>
                {spesa.some((v) => !v.spuntato) && (
                  <button className="btn2 tap" onClick={() => copia(spesa.filter((v) => !v.spuntato), "Lista")}>
                    {I.copy({ s: 13 })}Copia
                  </button>
                )}
                {spesa.some((v) => v.spuntato) && (
                  <button className="btn2 tap" onClick={() => azioneSpesa({ azione: "svuotaFatti" }, "Via i fatti")} disabled={spesaOccupata} style={{ opacity: spesaOccupata ? 0.6 : 1 }}>
                    Via i fatti
                  </button>
                )}
              </div>
            </div>
          </Sheet>
        )}

        {storicoAperto && <StoricoPasti onClose={() => setStoricoAperto(false)} />}

        {/* ════════ CUCINA CON KEIKO (8.3) ════════
            La via d'uscita alla fine dei passi e' il giro del blocco 7: la
            stessa `annota()` che usa la riga del pasto, con lo stesso stato
            «altro» e lo stesso `ricettaId`. Non nasce un secondo modo di
            registrare la stessa cosa. */}
        {cucinoCon && (cucinoCon.estratta?.passi?.length ?? 0) > 0 && (
          <CucinaConKeiko
            titolo={cucinoCon.titolo}
            passi={cucinoCon.estratta!.passi!}
            ingredienti={cucinoCon.estratta?.ingredienti ?? []}
            pasti={giornata}
            onCucinataPer={cucinoCon.id ? async (p) => {
              await annota(p, "altro", cucinoCon.titolo, cucinoCon.id);
              setAperta(null);
              setCollegoA(null);
              setMsg(`Segnata per ${p.pasto}`);
            } : undefined}
            onClose={() => setCucinoCon(null)}
          />
        )}

        {/* ════════ IL RICETTARIO INTERO (8.2) ════════
            Si porta dietro quello che stavi scrivendo nel campo piccolo, e la
            ricetta la apre chiamando lo stesso `apri` di qui: il foglio
            ricetta e' uno solo, e l'estrazione gia' pagata resta pagata. */}
        {ricettarioAperto && (
          <Ricettario
            ricette={lista}
            queryIniziale={filtroRicettario}
            onApri={(r) => { setRicettarioAperto(false); apriRicetta(r); }}
            onClose={() => setRicettarioAperto(false)}
          />
        )}

        {/* toast piccolo, sparisce da solo (con Annulla per l'eliminazione) */}
        {msg && (
          /* `.k2 .toast` del sistema ha `pointer-events:none`, perche' un toast
             normale si guarda e basta. Questo pero' porta dentro «Annulla», e
             senza questa riga il tasto non si puo' premere: l'eliminazione
             diventava irreversibile. Visto in prova, non dedotto. */
          <div className="toast on" role="status" style={{ zIndex: 60, display: "flex", alignItems: "center", gap: 12, pointerEvents: msg.startsWith("__ANNULLA__") ? "auto" : "none" }}>
            {msg.startsWith("__ANNULLA__") ? (
              <>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Tolta: {msg.replace("__ANNULLA__", "")}
                </span>
                <button
                  onClick={() => (window as unknown as { __annullaCucina?: () => void }).__annullaCucina?.()}
                  style={{ background: "none", border: 0, color: "var(--teal-soft)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", minHeight: 44, padding: "0 4px", flex: "none" }}
                >
                  Annulla
                </button>
              </>
            ) : (
              <span>{msg}</span>
            )}
          </div>
        )}
      </div>

      {/* La barra sta FUORI da `.k2`, come nella Home: dentro erediterebbe la
          larghezza massima del sistema e il suo fondo. La Cucina e' una voce
          della barra, e una voce che porta in una pagina senza barra e' un
          vicolo cieco: da qui si torna a casa. */}
      <KeikoNav active="cucina" />
    </>
  );
}
