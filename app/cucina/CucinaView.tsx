"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Recipe, RicettaEstratta, ShoppingItem } from "@/lib/supabase";
import { quandoDetto, daQuanto, amazonFresh, type PastoDelGiorno, type Rifare } from "@/lib/cucina";
import "../ds.css";

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
};

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
function nomeFonte(r: { autore?: string | null; piattaforma?: string; platform?: string; dominio?: string; author?: string | null }) {
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
  const [domanda, setDomanda] = useState("");
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
  const [msg, setMsg] = useState<string | null>(null);
  const msgT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [lista, setLista] = useState<Recipe[]>(ricette);
  const [salvate, setSalvate] = useState<Set<string>>(new Set(ricette.map((r) => r.url)));
  const [tutte, setTutte] = useState(false);
  const [spesaAperta, setSpesaAperta] = useState(false);

  // ── V2: il foglio ricetta e la spesa ──────────────────────────────────
  const [aperta, setAperta] = useState<Aperta | null>(null);
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

    if (modo === "nuova") { setCerco(true); setRisultati(null); setInterpretazione(null); setVariante(false); }
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
      if (modo === "nuova") setRisultati([]);
      toast("Qualcosa non torna, riprova");
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

  const scaffale = useMemo(() => (tutte ? lista : lista.slice(0, 8)), [lista, tutte]);

  return (
    <div
      className="ds k-cuc"
      style={{
        minHeight: "100dvh",
        background: "var(--k-bg)",
        color: "var(--k-text)",
        padding: "calc(env(safe-area-inset-top) + 20px) 18px calc(env(safe-area-inset-bottom) + 120px)",
        maxWidth: 560,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* I due livelli intermedi che il mock chiama --inset e --accent2 non
          esistono in ds.css. NON sono colori nuovi: si ricavano da quelli che
          ci sono già — l'inset è surface schiarito verso il fondo, l'accent2
          è l'accento scurito verso il suo stesso inchiostro. Così la palette
          resta quella e il gradiente caldo del mock c'è lo stesso. */}
      <style>{`
        .k-cuc { --inset: color-mix(in srgb, var(--k-surface) 58%, var(--k-bg));
                 --accent2: color-mix(in srgb, var(--k-accent) 88%, var(--k-accent-ink)); }
        .k-cuc .k-shelf::-webkit-scrollbar, .k-cuc .k-chips::-webkit-scrollbar { display: none; }
        .k-cuc .k-shelf, .k-cuc .k-chips { scrollbar-width: none; }
        .k-cuc .k-press { transition: transform .16s ease, opacity .16s ease; }
        .k-cuc .k-press:active { transform: scale(.975); }
        .k-cuc .k-sheet { transition: transform .45s cubic-bezier(.32,.72,.25,1); }
        .k-cuc .k-toast { transition: opacity .35s ease, transform .35s cubic-bezier(.22,.61,.36,1); }
        .k-cuc .k-fade { animation: kcucIn .34s cubic-bezier(.22,.61,.36,1) both; }
        @keyframes kcucIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .k-cuc .k-press, .k-cuc .k-sheet, .k-cuc .k-toast { transition: none; }
          .k-cuc .k-press:active { transform: none; }
          .k-cuc .k-fade { animation: none; }
        }
      `}</style>

      {/* ════════ SCHERMO RISULTATI ════════ */}
      {inRisultati ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <button
              onClick={() => { setRisultati(null); setInterpretazione(null); }}
              aria-label="Torna a Cucina"
              className="k-press"
              style={{ width: 44, height: 44, marginLeft: -10, flex: "none", background: "none", border: 0, color: "var(--k-text-2)", fontSize: 26, cursor: "pointer", lineHeight: 1 }}
            >
              ‹
            </button>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--k-text-3)" }}>
              {cerco ? "Cerco" : `Trovate · ${risultati?.length ?? 0}`}
            </div>
          </div>

          {/* Cosa ha capito Keiko. Quando traduce una situazione lo DICE: chi
              cerca deve poter vedere se ha capito male, non indovinarlo dai
              risultati. */}
          {interpretazione && (
            <div className="k-fade" style={{ background: "var(--inset)", border: "1px solid var(--k-line)", borderRadius: 14, padding: "11px 14px", fontSize: 13, color: "var(--k-text-2)", lineHeight: 1.45, marginTop: 10 }}>
              {interpretazione.viaAi ? (
                <>
                  Hai chiesto <b style={{ color: "var(--k-accent)", fontWeight: 650 }}>«{interpretazione.originale}»</b>
                  {" → cerco: "}
                  <b style={{ color: "var(--k-accent)", fontWeight: 650 }}>{interpretazione.cercato}</b>
                </>
              ) : (
                <>Cerco: <b style={{ color: "var(--k-accent)", fontWeight: 650 }}>{interpretazione.cercato}</b></>
              )}
            </div>
          )}

          {cerco && (
            <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="k-skel" style={{ height: 190, borderRadius: 22, background: "var(--k-surface)" }} />
              ))}
            </div>
          )}

          {!cerco && risultati?.map((r) => {
            const salvato = salvate.has(r.url);
            return (
              <div key={r.url} className="k-fade" style={{ marginTop: 14, borderRadius: 22, overflow: "hidden", position: "relative", boxShadow: "var(--k-shadow)", border: "1px solid var(--k-line)" }}>
                <button
                  onClick={() => apri({ id: lista.find((x) => x.url === r.url)?.id ?? null, titolo: r.titolo, url: r.url, miniatura: r.miniatura, autore: r.autore, piattaforma: r.piattaforma, contenuto: r.contenuto ?? null, estratta: lista.find((x) => x.url === r.url)?.extracted ?? null })}
                  className="k-press"
                  style={{ display: "block", width: "100%", height: 190, position: "relative", border: 0, padding: 0, textAlign: "left", color: "inherit", background: "var(--k-cat-cena)", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <Miniatura src={r.miniatura} dimensione={56} subito />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 30%,rgba(6,7,11,.9))" }} />
                  <div style={{ position: "absolute", left: 14, right: 14, bottom: 12 }}>
                    <div style={{ fontSize: 16.5, fontWeight: 750, lineHeight: 1.22, letterSpacing: "-.01em", textShadow: "var(--k-tshadow)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {r.titolo}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6, fontSize: 12, color: "var(--k-text-2)", textShadow: "var(--k-tshadow)" }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", background: "rgba(255,255,255,.12)", flex: "none" }}>
                        <LogoPiattaforma p={r.piattaforma} size={12} />
                      </span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeFonte(r)}</span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => salva(r)}
                  disabled={salvato}
                  className="k-press"
                  style={{
                    position: "absolute", top: 12, right: 12, minHeight: 44, padding: "0 15px", borderRadius: 999, border: 0,
                    background: salvato ? "var(--k-ok)" : "rgba(6,7,11,.65)",
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                    color: salvato ? "#0A2413" : "#fff", font: "650 12.5px inherit", fontFamily: "inherit", fontWeight: 650, fontSize: 12.5,
                    cursor: salvato ? "default" : "pointer",
                  }}
                >
                  {salvato ? "✓ Salvata" : "＋ Salva"}
                </button>
              </div>
            );
          })}

          {/* Mostrane altre → dalle già pagate, immediato.
              Cerca ancora → una ricerca nuova, e si vede che ci sta lavorando. */}
          {!cerco && (risultati?.length ?? 0) > 0 && (
            <button
              onClick={() => cerca(altrePronte ? "altre" : "ancora")}
              disabled={ancora}
              className="k-press"
              style={{
                width: "100%", minHeight: 50, marginTop: 16, borderRadius: 16, cursor: ancora ? "default" : "pointer",
                background: altrePronte ? "var(--inset)" : "transparent",
                border: `1px solid ${altrePronte ? "var(--k-line)" : "color-mix(in srgb, var(--k-accent) 40%, transparent)"}`,
                color: altrePronte ? "var(--k-text)" : "var(--k-accent)",
                fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, opacity: ancora ? 0.6 : 1,
              }}
            >
              {ancora ? "Cerco ancora…" : altrePronte ? "Mostrane altre" : "Cerca ancora"}
            </button>
          )}

          {!cerco && risultati?.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--k-text-3)", margin: "20px 2px", lineHeight: 1.5 }}>
              {ricercaAttiva ? "Non ho trovato niente, prova con altre parole." : "La ricerca arriva presto. Il ricettario funziona già."}
            </p>
          )}
        </>
      ) : (
        /* ════════ SCHERMO CUCINA ════════ */
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", color: "var(--k-text-3)", textTransform: "uppercase" }}>Cucina</div>

          {/* ① IL PIANO — solo per chi ce l'ha */}
          {prossimo && (
            <>
              <div className="k-press" style={{ marginTop: 16, borderRadius: 22, overflow: "hidden", position: "relative", boxShadow: "var(--k-shadow)", border: "1px solid var(--k-line)" }}>
                <div style={{ height: 170, position: "relative", background: "var(--k-cat-dieta)" }}>
                  {/* L'emoji sta in alto a DESTRA, non al centro. Al centro
                      finiva dietro il nome del pasto e si vedeva la macchia
                      grigia attraverso le lettere; anche solo nella metà alta
                      toccava l'occhiello. Qui decora l'angolo vuoto e sparisce
                      dal percorso di lettura. */}
                  <div style={{ position: "absolute", top: 14, right: 16, fontSize: 40, opacity: 0.55, lineHeight: 1 }} aria-hidden>🍚</div>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 25%,rgba(6,7,11,.92))" }} />
                  <div style={{ position: "absolute", left: 16, right: 16, bottom: 13 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "1px", color: "var(--k-accent)", textTransform: "uppercase", textShadow: "var(--k-tshadow)" }}>
                      {quandoDetto(prossimo)} · {prossimo.pasto} · dal tuo piano
                    </div>
                    <div style={{ fontSize: 17.5, fontWeight: 750, letterSpacing: "-.01em", marginTop: 3, textShadow: "var(--k-tshadow)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {prossimo.testo || prossimo.pasto}
                    </div>
                    <button
                      onClick={() => toast("Cucina con me arriva presto")}
                      className="k-press"
                      style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,.12)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: 0, borderRadius: 999, minHeight: 44, padding: "0 16px", color: "var(--k-text)", fontFamily: "inherit", fontSize: 12.5, fontWeight: 650, cursor: "pointer" }}
                    >
                      ▶ Cucina con me
                    </button>
                  </div>
                </div>
              </div>

              {/* la striscia: la giornata a pallini, senza numeri inventati */}
              {giornata.filter((p) => p.ora).length > 1 && (
                <div style={{ display: "flex", alignItems: "center", margin: "14px 2px 0" }}>
                  {giornata.filter((p) => p.ora).map((p, i, arr) => (
                    <span key={`${p.pasto}-${p.indice}`} style={{ display: "contents" }}>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1, minWidth: 0 }} title={p.pasto}>
                        <span
                          style={{
                            width: 13, height: 13, borderRadius: "50%",
                            background: p.passato ? "var(--k-ok)" : "transparent",
                            border: `2px solid ${p.passato ? "var(--k-ok)" : p === prossimo ? "var(--k-accent)" : "rgba(255,255,255,.25)"}`,
                            boxShadow: p === prossimo ? "0 0 0 4px color-mix(in srgb, var(--k-accent) 16%, transparent)" : "none",
                          }}
                        />
                        <small style={{ fontSize: 10, fontWeight: 600, color: p === prossimo ? "var(--k-accent)" : "var(--k-text-3)" }}>{p.ora}</small>
                      </span>
                      {i < arr.length - 1 && <span style={{ flex: 1, height: 1.5, background: "rgba(255,255,255,.12)", marginBottom: 17, minWidth: 10 }} />}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ② LA DOMANDA */}
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.02em", marginTop: prossimo ? 26 : 10 }}>Cosa mangiamo?</div>

          <div style={{ marginTop: 14, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 20, padding: "6px 6px 6px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--k-shadow)" }}>
            <input
              value={domanda}
              onChange={(e) => setDomanda(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") cerca("nuova"); }}
              placeholder="Cosa c'è in frigo? Che voglia hai?"
              aria-label="Cosa cerchi"
              style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: 0, color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", minHeight: 46 }}
            />
            <button
              onClick={() => cerca("nuova")}
              disabled={!domanda.trim()}
              aria-label="Cerca"
              className="k-press"
              style={{
                width: 46, height: 46, borderRadius: 16, border: 0, flex: "none", cursor: domanda.trim() ? "pointer" : "default",
                background: "linear-gradient(135deg, var(--k-accent), var(--accent2))",
                color: "var(--k-accent-ink)", fontSize: 18, fontWeight: 800, opacity: domanda.trim() ? 1 : 0.45,
              }}
            >
              →
            </button>
          </div>

          <div className="k-chips" style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
            {CHIP.map((c) => {
              const on = scelte.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => setScelte((s) => (on ? s.filter((x) => x !== c) : [...s, c]))}
                  aria-pressed={on}
                  className="k-press"
                  style={{
                    flex: "none", minHeight: 44, padding: "0 16px", borderRadius: 999, cursor: "pointer",
                    fontSize: 12.5, fontWeight: 600, fontFamily: "inherit",
                    background: on ? "color-mix(in srgb, var(--k-accent) 14%, transparent)" : "var(--inset)",
                    color: on ? "var(--k-accent)" : "var(--k-text-2)",
                    border: `1px solid ${on ? "color-mix(in srgb, var(--k-accent) 40%, transparent)" : "var(--k-line)"}`,
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "var(--k-text-3)", lineHeight: 1.5 }}>
            💡 Dimmi la situazione, non solo gli ingredienti: <b style={{ color: "var(--k-text-2)", fontWeight: 600 }}>«serata tra amici per la partita»</b> la capisco.
          </div>

          {!ricercaAttiva && (
            <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "14px 2px 0" }}>
              La ricerca arriva presto. Il ricettario funziona già.
            </p>
          )}

          {/* ③ IL RICETTARIO */}
          {lista.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em", margin: 0 }}>Il tuo ricettario</h2>
                {lista.length > 8 && (
                  <button onClick={() => setTutte((t) => !t)} style={{ background: "none", border: 0, color: "var(--k-accent)", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", minHeight: 44 }}>
                    {lista.length} · {tutte ? "mostra meno" : "vedi tutte"}
                  </button>
                )}
              </div>

              <div className="k-shelf" style={{ display: "flex", gap: 12, overflowX: "auto", margin: "0 -18px", padding: "0 18px 6px", ...(tutte ? { flexWrap: "wrap", overflowX: "visible" } : {}) }}>
                {scaffale.map((r) => (
                  <div key={r.id} style={{ flex: "none", width: 150, position: "relative" }}>
                    <button
                      onClick={() => apri({ id: r.id, titolo: r.title, url: r.url, miniatura: r.thumbnail, autore: r.author, piattaforma: r.platform, contenuto: null, estratta: r.extracted })}
                      className="k-press"
                      style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", textAlign: "left", color: "inherit", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <div style={{ height: 110, borderRadius: 16, position: "relative", overflow: "hidden", background: "var(--k-cat-cena)", border: "1px solid var(--k-line)", boxShadow: "var(--k-shadow)" }}>
                        <Miniatura src={r.thumbnail} dimensione={34} />
                        <span style={{ position: "absolute", bottom: 8, right: 8, width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(0,0,0,.65)" }}>
                          <LogoPiattaforma p={r.platform} />
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 7, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--k-text-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.author || nomeFonte(r)}
                      </div>
                    </button>
                    <button
                      onClick={() => elimina(r)}
                      aria-label={`Togli ${r.title}`}
                      style={{ position: "absolute", top: 4, right: 4, width: 32, height: 32, display: "grid", placeItems: "center", background: "rgba(6,7,11,.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", border: 0, borderRadius: 10, color: "#fff", fontSize: 13, cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Da rifare — il battito della ricetta. Niente azione, niente
              battito: se non c'è una ricetta abbastanza vecchia, non compare. */}
          {rifare && (
            <>
              <div style={{ margin: "26px 0 12px" }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em", margin: 0 }}>Da rifare</h2>
              </div>
              <button
                onClick={() => { const r = lista.find((x) => x.id === rifare.id); if (r) apri({ id: r.id, titolo: r.title, url: r.url, miniatura: r.thumbnail, autore: r.author, piattaforma: r.platform, contenuto: null, estratta: r.extracted }); }}
                className="k-press"
                style={{ width: "100%", textAlign: "left", background: "var(--inset)", border: "1px solid var(--k-line)", borderRadius: 14, padding: "12px 14px", fontSize: 13, color: "var(--k-text-2)", lineHeight: 1.45, fontFamily: "inherit", cursor: "pointer" }}
              >
                🍳 È {daQuanto(rifare.giorni)} che non apri <b style={{ color: "var(--k-accent)", fontWeight: 650 }}>{rifare.titolo}</b>
                {rifare.volte > 0 ? ` — e l'hai fatta ${rifare.volte} volte.` : "."} Stasera?
              </button>
            </>
          )}

          {/* il vuoto ben fatto: l'orca e un invito, non una pagina spenta */}
          {lista.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 12px 30px" }}>
              <div style={{ fontSize: 44 }} aria-hidden>🐋</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>Il ricettario è vuoto</div>
              <p style={{ fontSize: 13, color: "var(--k-text-3)", marginTop: 6, lineHeight: 1.5 }}>
                Cerco la ricetta, tu cucini.
              </p>
            </div>
          )}
        </>
      )}

      {/* ════════ LA PASTIGLIA SPESA ════════
          Compare solo sulla home, come nel mock. In Fase 1 apre un foglio che
          dice la verità: la spesa arriva. Nessun numero finto accanto al
          carrello — un contatore inventato è una bugia piccola che si nota. */}
      {!inRisultati && (
        <button
          onClick={() => setSpesaAperta(true)}
          className="k-press"
          style={{
            position: "fixed", left: "50%", transform: "translateX(-50%)",
            bottom: "calc(env(safe-area-inset-bottom) + 22px)", zIndex: 40,
            background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 999,
            minHeight: 46, padding: "0 20px", display: "flex", alignItems: "center", gap: 9,
            fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, color: "var(--k-text)", cursor: "pointer",
            boxShadow: "0 14px 36px rgba(0,0,0,.55)",
          }}
        >
          🛒 Spesa{daPrendere > 0 && <> · <b style={{ color: "var(--k-accent)" }}>{daPrendere}</b></>}
        </button>
      )}

      {/* ════════ IL FOGLIO RICETTA (schermo 3 del mock) ════════ */}
      {aperta && (
        <>
          <div onClick={() => setAperta(null)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(6,7,11,.72)" }} />
          <div
            className="k-sheet k-fade"
            role="dialog"
            aria-label={aperta.titolo}
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, top: 0, zIndex: 71, maxWidth: 560, margin: "0 auto",
              background: "var(--k-bg)", overflowY: "auto", overscrollBehavior: "contain",
            }}
          >
            {/* hero */}
            <div style={{ height: 260, position: "relative", background: "var(--k-cat-cena)" }}>
              <Miniatura src={aperta.miniatura} dimensione={72} subito />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(6,7,11,.5),transparent 30%,var(--k-bg))" }} />
              <button
                onClick={() => setAperta(null)}
                aria-label="Chiudi"
                className="k-press"
                style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 12px)", left: 14, width: 44, height: 44, borderRadius: 14, border: 0, background: "rgba(6,7,11,.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#fff", fontSize: 20, cursor: "pointer" }}
              >
                ‹
              </button>
              {/* Il link al video originale è SEMPRE visibile: la ricetta è di
                  chi l'ha girata, e da qui si va a dargli la visualizzazione. */}
              <a
                href={aperta.url}
                target="_blank"
                rel="noreferrer"
                style={{ position: "absolute", left: 18, right: 18, bottom: 14, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--k-text-2)", textDecoration: "none", textShadow: "var(--k-tshadow)", minHeight: 44 }}
              >
                <span style={{ width: 22, height: 22, borderRadius: 7, display: "grid", placeItems: "center", background: "rgba(255,255,255,.12)", flex: "none" }}>
                  <LogoPiattaforma p={aperta.piattaforma} size={12} />
                </span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {aperta.autore ? `${aperta.autore} · ` : ""}guarda il video originale →
                </span>
              </a>
            </div>

            <div style={{ padding: "0 18px calc(env(safe-area-inset-bottom) + 30px)" }}>
              <h2 style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1.15, margin: "10px 0 0" }}>
                {aperta.titolo}
              </h2>

              {estraggo && (
                <p style={{ fontSize: 13, color: "var(--k-text-2)", marginTop: 14 }}>Sto leggendo la ricetta…</p>
              )}

              {/* meta: solo quello che il creator ha scritto */}
              {!estraggo && (aperta.estratta?.tempo || aperta.estratta?.porzioni) && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {aperta.estratta?.tempo && <span style={{ background: "var(--inset)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "7px 13px", fontSize: 12, fontWeight: 600, color: "var(--k-text-2)" }}>⏱ {aperta.estratta.tempo}</span>}
                  {aperta.estratta?.porzioni && <span style={{ background: "var(--inset)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "7px 13px", fontSize: 12, fontWeight: 600, color: "var(--k-text-2)" }}>🍽 {aperta.estratta.porzioni}</span>}
                </div>
              )}

              {/* ingredienti spuntabili */}
              {!estraggo && (aperta.estratta?.ingredienti?.length ?? 0) > 0 && (
                <div style={{ marginTop: 20, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 20, boxShadow: "var(--k-shadow)", padding: 16 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 0 10px" }}>
                    Ingredienti · tocca quello che hai già
                  </h3>
                  {aperta.estratta!.ingredienti!.map((ing, i) => {
                    const ce = inDispensa.has(i);
                    return (
                      <button
                        key={`${ing.nome}-${i}`}
                        onClick={() => setInDispensa((d) => { const n = new Set(d); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                        aria-pressed={ce}
                        style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", minHeight: 44, padding: "8px 0", background: "none", border: 0, fontFamily: "inherit", fontSize: 14.5, textAlign: "left", cursor: "pointer", color: ce ? "var(--k-text-3)" : "var(--k-text)", textDecoration: ce ? "line-through" : "none" }}
                      >
                        <span style={{ width: 22, height: 22, borderRadius: 8, flex: "none", border: `1.5px solid ${ce ? "var(--k-ok)" : "rgba(255,255,255,.25)"}`, background: ce ? "var(--k-ok)" : "transparent", display: "grid", placeItems: "center", color: "#0A2413", fontSize: 13, fontWeight: 800 }}>
                          {ce ? "✓" : ""}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>{ing.nome}</span>
                        {ing.quantita && <b style={{ color: "var(--k-text-2)", fontWeight: 600, fontSize: 13 }}>{ing.quantita}</b>}
                      </button>
                    );
                  })}

                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button
                      onClick={mandaInSpesa}
                      disabled={daComprare.length === 0 || spesaOccupata}
                      className="k-press"
                      style={{ flex: 1, minHeight: 46, borderRadius: 14, border: 0, cursor: daComprare.length === 0 ? "default" : "pointer", background: "linear-gradient(135deg, var(--k-accent), var(--accent2))", color: "var(--k-accent-ink)", fontFamily: "inherit", fontSize: 13, fontWeight: 650, opacity: daComprare.length === 0 || spesaOccupata ? 0.5 : 1 }}
                    >
                      🛒 In lista spesa ({daComprare.length})
                    </button>
                    {daComprare.length > 0 && (
                      <a
                        href={amazonFresh(daComprare.map((i) => i.nome).join(" "))}
                        target="_blank"
                        rel="noreferrer"
                        className="k-press"
                        style={{ flex: 1, minHeight: 46, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--inset)", border: "1px solid var(--k-line)", color: "var(--k-text)", fontSize: 13, fontWeight: 650, textDecoration: "none" }}
                      >
                        Amazon Fresh ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* passi */}
              {!estraggo && (aperta.estratta?.passi?.length ?? 0) > 0 && (
                <div style={{ marginTop: 18, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 20, boxShadow: "var(--k-shadow)", padding: 16 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "0 0 10px" }}>
                    Come si fa · dalla descrizione del video
                  </h3>
                  {aperta.estratta!.passi!.map((passo, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", fontSize: 14, lineHeight: 1.5, color: "var(--k-text-2)" }}>
                      <span style={{ width: 26, height: 26, borderRadius: "50%", flex: "none", background: "color-mix(in srgb, var(--k-accent) 14%, transparent)", color: "var(--k-accent)", fontSize: 12.5, fontWeight: 800, display: "grid", placeItems: "center" }}>{i + 1}</span>
                      <span>{passo}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* caption povera: si dice, e non si inventa niente */}
              {!estraggo && aperta.estratta?.insufficiente && (
                <div style={{ marginTop: 20, background: "var(--inset)", border: "1px solid var(--k-line)", borderRadius: 16, padding: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>La ricetta completa è nel video</div>
                  <p style={{ fontSize: 13, color: "var(--k-text-2)", marginTop: 6, lineHeight: 1.5 }}>
                    Chi l&apos;ha girato non ha scritto ingredienti e passaggi sotto al video, e io non me li invento.
                  </p>
                  <a
                    href={aperta.url}
                    target="_blank"
                    rel="noreferrer"
                    className="k-press"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 46, marginTop: 12, borderRadius: 14, background: "linear-gradient(135deg, var(--k-accent), var(--accent2))", color: "var(--k-accent-ink)", fontSize: 13.5, fontWeight: 700, textDecoration: "none" }}
                  >
                    Apri il video ↗
                  </a>
                </div>
              )}

              {/* Se non è ancora nel ricettario, si può metterla da qui: la
                  prossima apertura non ripasserà dal modello. */}
              {!aperta.id && !salvate.has(aperta.url) && !estraggo && (
                <button
                  onClick={() => salva({ titolo: aperta.titolo, url: aperta.url, miniatura: aperta.miniatura, autore: aperta.autore, piattaforma: (aperta.piattaforma as Risultato["piattaforma"]) ?? "web", dominio: "" })}
                  className="ds-btn k-press"
                  style={{ width: "100%", minHeight: 46, marginTop: 14, fontFamily: "inherit", fontWeight: 700 }}
                >
                  ＋ Salva nel ricettario
                </button>
              )}

              <p style={{ fontSize: 10.5, color: "var(--k-text-3)", textAlign: "center", marginTop: 18, lineHeight: 1.5 }}>
                Ricetta estratta dalla descrizione del creator, non modificata.
                <br />
                Keiko non dà consigli nutrizionali.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ════════ IL FOGLIO SPESA ════════ */}
      {spesaAperta && (
        <>
          <div onClick={() => setSpesaAperta(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(6,7,11,.6)" }} />
          <div
            className="k-sheet"
            role="dialog"
            aria-label="La spesa"
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 51, maxWidth: 560, margin: "0 auto",
              background: "var(--k-surface)", borderRadius: "28px 28px 0 0",
              padding: "14px 20px calc(env(safe-area-inset-bottom) + 24px)",
              boxShadow: "0 -20px 60px rgba(0,0,0,.6)", maxHeight: "84vh", overflowY: "auto",
            }}
          >
            <div onClick={() => setSpesaAperta(false)} style={{ width: 38, height: 5, borderRadius: 3, background: "rgba(255,255,255,.2)", margin: "0 auto 14px", cursor: "pointer" }} />
            <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em", margin: 0 }}>La spesa</h3>
            <div style={{ fontSize: 11, color: "var(--k-text-3)", marginTop: 2 }}>
              Dal piano della settimana e dalle tue ricette
            </div>

            {spesa.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--k-text-2)", marginTop: 14, lineHeight: 1.5 }}>
                Ancora vuota. Aprine una ricetta e manda in lista quello che ti manca, oppure prendi quello che serve per la settimana.
              </p>
            ) : (
              <div style={{ marginTop: 12 }}>
                {spesa.map((v) => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 44 }}>
                    <button
                      onClick={() => spunta(v)}
                      aria-pressed={v.spuntato}
                      style={{ display: "flex", alignItems: "center", gap: 11, flex: 1, minWidth: 0, minHeight: 44, padding: "9px 0", background: "none", border: 0, fontFamily: "inherit", fontSize: 14.5, textAlign: "left", cursor: "pointer", color: v.spuntato ? "var(--k-text-3)" : "var(--k-text)", textDecoration: v.spuntato ? "line-through" : "none" }}
                    >
                      <span style={{ width: 22, height: 22, borderRadius: 8, flex: "none", border: `1.5px solid ${v.spuntato ? "var(--k-ok)" : "rgba(255,255,255,.25)"}`, background: v.spuntato ? "var(--k-ok)" : "transparent", display: "grid", placeItems: "center", color: "#0A2413", fontSize: 13, fontWeight: 800 }}>
                        {v.spuntato ? "✓" : ""}
                      </span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.nome}</span>
                      {v.quantita && <b style={{ color: "var(--k-text-2)", fontWeight: 600, fontSize: 13, flex: "none" }}>{v.quantita}</b>}
                    </button>
                    <span
                      style={{
                        flex: "none", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "2px 8px",
                        background: v.fonte === "piano" ? "color-mix(in srgb, var(--k-ok) 13%, transparent)" : "color-mix(in srgb, var(--k-accent) 13%, transparent)",
                        color: v.fonte === "piano" ? "var(--k-ok)" : "var(--k-accent)",
                      }}
                    >
                      {v.fonte}
                    </span>
                    <a
                      href={amazonFresh(v.nome)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Cerca ${v.nome} su Amazon Fresh`}
                      style={{ flex: "none", width: 34, height: 44, display: "grid", placeItems: "center", color: "var(--k-text-3)", textDecoration: "none", fontSize: 13 }}
                    >
                      ↗
                    </a>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => azioneSpesa({ azione: "dalPiano" }, "Presa dal piano")}
                disabled={spesaOccupata}
                className="ds-btn k-press"
                style={{ flex: 1, minHeight: 46, fontFamily: "inherit", fontWeight: 700, opacity: spesaOccupata ? 0.6 : 1 }}
              >
                Prendi dal piano
              </button>
              {spesa.some((v) => v.spuntato) && (
                <button
                  onClick={() => azioneSpesa({ azione: "svuotaFatti" }, "Via i fatti")}
                  disabled={spesaOccupata}
                  className="ds-btn k-press"
                  style={{ flex: 1, minHeight: 46, fontFamily: "inherit", fontWeight: 700, opacity: spesaOccupata ? 0.6 : 1 }}
                >
                  Via i fatti
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* toast piccolo, sparisce da solo (con Annulla per l'eliminazione) */}
      {msg && (
        <div
          role="status"
          className="k-toast"
          style={{
            position: "fixed", left: 16, right: 16, bottom: "calc(env(safe-area-inset-bottom) + 86px)",
            maxWidth: 360, margin: "0 auto", zIndex: 60,
            background: "var(--k-surface)",
            border: "1px solid var(--k-line)", borderRadius: 14, padding: "12px 15px",
            display: "flex", alignItems: "center", gap: 10, fontSize: 13,
            boxShadow: "0 14px 40px rgba(0,0,0,.55)",
          }}
        >
          {msg.startsWith("__ANNULLA__") ? (
            <>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Tolta: {msg.replace("__ANNULLA__", "")}
              </span>
              <button
                onClick={() => (window as unknown as { __annullaCucina?: () => void }).__annullaCucina?.()}
                style={{ background: "none", border: 0, color: "var(--k-accent)", fontWeight: 700, fontSize: 13.5, minHeight: 44, cursor: "pointer", fontFamily: "inherit" }}
              >
                Annulla
              </button>
            </>
          ) : (
            <>
              <span style={{ color: "var(--k-ok)" }} aria-hidden>✓</span>
              <span>{msg}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
