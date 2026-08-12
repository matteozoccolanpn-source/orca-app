"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/app/components/v2/icons";
import {
  EventForm,
  toDatetime,
  splitDatetime,
  type EventFormValue,
} from "@/app/components/EventForm";

/* CATTURA — la vestizione segue docs/mockups/cattura-attesa-mock.html.
 *
 * Cosa cambia rispetto a prima, e perché:
 *  - I pallini "Scrivi · Keiko legge · Controlli · Fatto" erano un'etichetta di
 *    stato: al loro posto un FILO che avanza (45% mentre legge, 80% alla
 *    conferma, 100% al salvataggio). Dice la stessa cosa senza parlare.
 *  - Quello che dai a Keiko RESTA A SCHERMO: la frase diventa una citazione, lo
 *    screenshot una miniatura. Mai più uno spinner nel vuoto.
 *  - Mentre aspetti, la card si costruisce da sola (scheletro → valori uno alla
 *    volta), l'orca nuota e le bolle salgono SOLO in quella fase.
 *  - Alla fine sei subito fuori: il foglio si chiude e la conferma è un toast
 *    sulla home (vedi components/GlobalChrome.tsx).
 *
 * La LOGICA non è cambiata: /api/upload risponde con una lista di eventi, la
 * conferma ne manda uno per volta a /api/upload/confirm, e i doppioni tornano
 * indietro con `duplicate: true`. Qui si tocca solo come appare.
 */

type Fase = "idle" | "legge" | "scelta" | "salva" | "errore";

interface Parsed {
  title: string;
  type: string;
  datetime: string;
  location: string;
  reference: string;
  city: string;
}

/* Il tipo dell'evento si dice con l'ICONA del set, non con un'emoji: le
   emoji sono decorazione, cambiano disegno da telefono a telefono e non
   prendono il colore del sistema. Chi non è nell'elenco ricade sul
   calendario, che è vero per tutti. */
const ICONA_TIPO: Record<string, (p?: { s?: number }) => React.ReactElement> = {
  train: I.train, flight: I.plane, hotel: I.bed, concert: I.mic,
  museum: I.map, restaurant: I.pot, sport: I.dumb, cinema: I.film,
};
const iconaDi = (tipo: string) => (ICONA_TIPO[(tipo ?? "").toLowerCase()] ?? I.cal)({ s: 18 });

/* Gli esempi del segnaposto: uno alla volta, a turno. Insegnano cosa
   l'imbuto sa digerire — una riga scritta di fretta, un messaggio incollato
   così com'è, tante righe insieme — senza trasformarsi in un elenco di
   opzioni da scegliere. Sono tre e restano tre: aggiungerne dieci
   rifarebbe il menu, in un altro modo. */
const ESEMPI = [
  "volo domani 6:00 Ryanair",
  "cena giovedì 20:30 da Marco",
  "incolla le 4 lezioni: te le creo tutte",
];

// Le frasi dell'attesa (dal mock). Ruotano ogni 2,3s con dissolvenza.
const FRASI_TESTO = ["Leggo il messaggio…", "Cerco date e orari…", "Sistemo i dettagli…"];
const FRASI_IMMAGINE = ["Guardo lo screenshot…", "Cerco date e orari…", "Sistemo i dettagli…"];

// Bolle: poche e discrete, e SEMPRE le stesse (niente Math.random, che al primo
// render del server darebbe numeri diversi dal client).
const BOLLE = [
  { sx: "12%", d: 9, ritardo: 0.0, s: 7 },
  { sx: "27%", d: 7.5, ritardo: 1.4, s: 11 },
  { sx: "44%", d: 10, ritardo: 0.6, s: 6 },
  { sx: "61%", d: 8, ritardo: 2.2, s: 9 },
  { sx: "78%", d: 9.5, ritardo: 1.0, s: 8 },
  { sx: "90%", d: 7, ritardo: 2.8, s: 6 },
];

const pausa = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** "ven 8 agosto · 08:00" — e senza ora, solo il giorno. */
function quando(datetime: string): string {
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return datetime;
  const giorno = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long" }).format(d);
  const ora = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(d);
  return ora === "00:00" ? giorno : `${giorno} · ${ora}`;
}

/** Il toast lo mostra la chrome globale: qui si annuncia e basta. */
function annunciaToast(testo: string) {
  window.dispatchEvent(new CustomEvent("keiko-toast", { detail: { testo } }));
}

export default function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fase, setFase] = useState<Fase>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Quello che l'utente ha dato a Keiko, tenuto a schermo per tutta l'attesa.
  const [citazione, setCitazione] = useState("");
  const [miniatura, setMiniatura] = useState<string | null>(null);

  // Gli eventi letti, quelli esclusi con la ✕, e quello aperto per correggerlo.
  const [letti, setLetti] = useState<Parsed[]>([]);
  const [esclusi, setEsclusi] = useState<Set<number>>(new Set());
  const [aperto, setAperto] = useState<number | null>(null);

  // Quante righe della card scheletro hanno già il loro valore (0-3).
  const [campi, setCampi] = useState(0);
  // Quante card della conferma sono già entrate (entrata sfalsata come nel mock).
  const [mostrate, setMostrate] = useState(0);
  const [frase, setFrase] = useState(0);
  const [immagine, setImmagine] = useState(false);
  /* L'esempio nel segnaposto, che gira mentre il foglio è fermo. Si ferma
     appena scrivi: da lì in poi il campo è tuo e non deve cambiarti sotto. */
  const [esempio, setEsempio] = useState(0);
  useEffect(() => {
    if (!open || fase !== "idle" || text.length > 0) return;
    const t = setInterval(() => setEsempio((i) => (i + 1) % ESEMPI.length), 3200);
    return () => clearInterval(t);
  }, [open, fase, text.length]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Chi ha attivato "riduci il movimento" non vuole bolle né pop sfalsati.
  const [ridotto, setRidotto] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRidotto(mq.matches);
    const cambia = () => setRidotto(mq.matches);
    mq.addEventListener("change", cambia);
    return () => mq.removeEventListener("change", cambia);
  }, []);

  /* Le card entrano una dopo l'altra (150ms, poi 180ms l'una dall'altra, come
     nel mock). Lo fa lo STATO e non un `animation-delay`: un ritardo CSS ha
     bisogno di fill-mode `both` per tenere nascosta la card durante l'attesa, e
     se l'animazione non parte quella card resta invisibile per sempre. Così
     invece il caso peggiore è che appaiano tutte insieme. */
  useEffect(() => {
    if (fase !== "scelta") return;
    if (ridotto) { setMostrate(letti.length); return; }
    setMostrate(0);
    const timers = letti.map((_, i) => setTimeout(() => setMostrate((n) => Math.max(n, i + 1)), 150 + i * 180));
    return () => timers.forEach(clearTimeout);
  }, [fase, letti, ridotto]);

  // Le frasi dell'attesa girano solo mentre legge davvero.
  useEffect(() => {
    if (fase !== "legge") return;
    const t = setInterval(() => setFrase((n) => (n + 1) % 3), 2300);
    return () => clearInterval(t);
  }, [fase]);

  // --- Swipe-giù per chiudere (stesso gesto di SheetShell, colori suoi) ---
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  function reset() {
    setText("");
    setFase("idle");
    setErrorMsg("");
    setCitazione("");
    if (miniatura) URL.revokeObjectURL(miniatura);
    setMiniatura(null);
    setLetti([]);
    setEsclusi(new Set());
    setAperto(null);
    setCampi(0);
    setMostrate(0);
    setFrase(0);
    setImmagine(false);
  }
  function close() {
    reset();
    onClose();
  }

  /** I valori arrivano nella card uno alla volta, poi si passa alla conferma. */
  async function svela(lista: Parsed[]) {
    setLetti(lista);
    setEsclusi(new Set());
    for (let i = 1; i <= 3; i++) {
      setCampi(i);
      await pausa(ridotto ? 0 : 240);
    }
    await pausa(ridotto ? 150 : 900);
    setFase("scelta");
  }

  async function chiedi(fd: FormData) {
    setCampi(0);
    setFrase(0);
    setFase("legge");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      // Il tetto giornaliero e gli errori veri restano QUI, nel foglio, con il
      // loro messaggio: non diventano un toast che scappa via.
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      await svela(data.parsed as Parsed[]);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setFase("errore");
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Solo immagini (PNG, JPG, HEIC)");
      setFase("errore");
      return;
    }
    setImmagine(true);
    setMiniatura(URL.createObjectURL(file));
    setCitazione("");
    const fd = new FormData();
    fd.append("image", file);
    await chiedi(fd);
  }

  async function handleText() {
    const t = text.trim();
    if (!t) return;
    setImmagine(false);
    setCitazione(t);
    const fd = new FormData();
    fd.append("text", t);
    await chiedi(fd);
  }

  /** Manda UN evento a /api/upload/confirm. Dice se era già in agenda. */
  async function salvaUno(p: Parsed): Promise<{ duplicato: boolean }> {
    const res = await fetch("/api/upload/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(p),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
    return { duplicato: data.duplicate === true };
  }

  /** Le parole del toast. Il doppione non è un errore: tono neutro, mai rosso. */
  function esito(aggiunti: number, doppioni: number): string {
    if (aggiunti === 0) return "Era già in agenda! Non ho toccato nulla";
    if (doppioni === 0) return `${aggiunti} in agenda`;
    const primo = aggiunti === 1 ? "1 aggiunto" : `${aggiunti} aggiunti`;
    return `${primo} · ${doppioni === 1 ? "1 era già in agenda" : `${doppioni} erano già in agenda`}`;
  }

  /** Conferma: uno per volta, non tutti insieme (ogni conferma fa partire il suo
   *  arricchimento in background, e va bene così). Poi FUORI SUBITO. */
  async function conferma() {
    const scelti = letti.filter((_, i) => !esclusi.has(i));
    if (scelti.length === 0) return;
    setFase("salva");
    let aggiunti = 0, doppioni = 0;
    try {
      for (const p of scelti) {
        const { duplicato } = await salvaUno(p);
        if (duplicato) doppioni++;
        else aggiunti++;
      }
      if (aggiunti > 0) {
        // Fire-and-forget: il piano del viaggio si genera in una richiesta
        // separata. keepalive = sopravvive alla chiusura del foglio.
        fetch("/api/trip/generate", { method: "POST", credentials: "include", keepalive: true }).catch(() => {});
      }
      await pausa(ridotto ? 0 : 350);   // il filo arriva a 100% prima di uscire
      annunciaToast(esito(aggiunti, doppioni));
      close();
      router.refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setFase("errore");
    }
  }

  if (!open) return null;

  const busy = fase === "legge" || fase === "salva";
  const lockClose = busy || fase === "scelta";
  const filo = fase === "idle" ? "0%" : fase === "legge" ? "45%" : fase === "scelta" ? "80%" : "100%";
  const restanti = letti.length - esclusi.size;
  const primo = letti[0];
  const valori = primo
    ? [
        letti.length > 1 ? `${primo.title}  ·  +${letti.length - 1}` : primo.title,
        quando(primo.datetime),
        primo.location || primo.city || "—",
      ]
    : ["", "", ""];

  const onTouchStart = (e: React.TouchEvent) => {
    if (lockClose) return;
    if ((panelRef.current?.scrollTop ?? 0) > 0) return;
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const d = e.touches[0].clientY - startY.current;
    setDy(d > 0 ? d : 0);
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (!lockClose && dy > 120) close();
    setDy(0);
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Le animazioni del mock. Stanno qui e non in globals.css perché questo
          flusso è l'unico che le usa (stesso schema di SuggestProvider). */}
      <style>{`
        @keyframes keiko-pop { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes keiko-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes keiko-swim { 0%,100% { transform: translateX(0) } 50% { transform: translateX(8px) rotate(-7deg) } }
        @keyframes keiko-sh { to { background-position: -200% 0 } }
        .k-shimmer {
          background: linear-gradient(90deg,
            color-mix(in srgb, var(--on-surface) 6%, transparent) 25%,
            color-mix(in srgb, var(--on-surface) 14%, transparent) 50%,
            color-mix(in srgb, var(--on-surface) 6%, transparent) 75%);
          background-size: 200% 100%;
          animation: keiko-sh 1.5s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .k-shimmer { animation: none }
        }
      `}</style>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--scrim)" }} onClick={lockClose ? undefined : close} />

      {/* Le bolle salgono SOLO mentre legge: sono l'identità di Keiko, non un
          fondale fisso. Con "riduci il movimento" non compaiono affatto. */}
      {fase === "legge" && !ridotto && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {BOLLE.map((b, i) => (
            <span
              key={i}
              className="keiko-bubble"
              style={{ left: b.sx, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${b.ritardo}s` }}
            />
          ))}
        </div>
      )}

      <div
        ref={panelRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="k-sheet-in absolute inset-x-0 bottom-0 mx-auto max-h-[90vh] max-w-lg overflow-y-auto"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--r-xl) var(--r-xl) 0 0",
          boxShadow: "0 -22px 54px -12px rgba(0,0,0,.6)",
          padding: "12px var(--s5)",
          paddingBottom: "calc(var(--s6) + env(safe-area-inset-bottom))",
          transform: dy ? `translateY(${dy}px)` : undefined,
          transition: dragging ? "none" : "transform .22s cubic-bezier(.22,.61,.36,1)",
          touchAction: "pan-y",
        }}
      >
        {/* grip + chiudi */}
        <div className="mx-auto" style={{ width: 40, height: 5, borderRadius: 3, background: "color-mix(in srgb, var(--on-surface) 22%, transparent)", margin: "2px auto 0" }} />
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Chiudi"
          className="absolute right-3 top-3 grid place-items-center rounded-xl disabled:opacity-40"
          style={{ width: "var(--tap)", height: "var(--tap)", color: "var(--on-surface-2)" }}
        >
          {I.close({ s: 20 })}
        </button>

        {/* IL FILO — al posto dei pallini. Avanza per fasi, senza etichette. */}
        <div style={{ height: 2, borderRadius: 2, background: "color-mix(in srgb, var(--on-surface) 8%, transparent)", margin: "10px 4px 20px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: filo, borderRadius: 2, background: "var(--keiko-grad)", transition: "width .9s cubic-bezier(.4,0,.2,1)" }} />
        </div>

        {/* ---------- 1 · scrivi ---------- */}
        {fase === "idle" && (
          <>
            {/* UN INVITO, NON UN MENU.
                Prima qui c'era l'elenco delle cose che si possono fare —
                «Scrivi, incolla o allega uno screenshot» — e nel segnaposto
                tre esempi separati da punti, tutti insieme. Un elenco di
                opzioni fa scegliere; un invito fa cominciare.
                Adesso c'è una domanda sola, e SOTTO il dito un esempio alla
                volta che cambia da sé: è così che si impara cosa digerisce
                questo imbuto — vedendoglielo fare, non leggendo un menu.
                L'imbuto non si tocca: è sempre lo stesso campo, che manda
                sempre a /api/upload. Cambia solo cosa gli si legge sopra. */}
            <div style={{ fontWeight: "var(--fw-black)", fontSize: "var(--fs-xl)", color: "var(--on-surface)", letterSpacing: "-.02em" }}>
              Cosa ti hanno mandato?
            </div>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)", marginTop: "var(--s1)", marginBottom: "var(--s4)", lineHeight: 1.45 }}>
              Buttalo qui com&apos;è. Ci penso io a capirlo.
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={ESEMPI[esempio]}
              className="w-full resize-none outline-none placeholder:[color:var(--on-surface-3)]"
              style={{
                background: "var(--inset)",
                border: "1px solid var(--inset-line)",
                borderRadius: "var(--r-md)",
                padding: "var(--s4)",
                minHeight: 96,
                color: "var(--on-surface)",
                fontSize: 16,   // 16px pieni: sotto questa misura iOS zooma (P0)
                lineHeight: 1.5,
              }}
            />

            <button
              type="button"
              onClick={handleText}
              disabled={!text.trim()}
              className="mt-[var(--s4)] flex w-full items-center justify-center gap-2 text-white transition-transform duration-200 active:scale-[0.98] disabled:opacity-40"
              style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", minHeight: 50, borderRadius: "var(--r-sm)", background: "var(--keiko-grad)", boxShadow: "var(--sh-btn)" }}
            >
              Invia
            </button>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-[var(--s3)] flex w-full items-center justify-center gap-2 transition-transform duration-200 active:scale-[0.98]"
              style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", minHeight: "var(--tap)", borderRadius: "var(--r-sm)", border: "1px solid var(--inset-line)", background: "var(--inset)", color: "var(--on-surface)" }}
            >
              <span style={{ flex: "none", display: "flex" }}>{I.plus({ s: 18 })}</span>
              Allega screenshot
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <div className="flex items-center justify-center gap-2" style={{ marginTop: "var(--s4)", fontSize: 11.5, fontWeight: "var(--fw-med)", color: "var(--on-surface-3)" }}>
              <span style={{ color: "var(--green)", display: "flex" }}>{I.tick({ s: 14 })}</span>
              I tuoi dati · zero pubblicità · server in EU
            </div>
          </>
        )}

        {/* ---------- 2 · Keiko legge ---------- */}
        {fase === "legge" && (
          <>
            {/* Quello che hai dato a Keiko resta lì: la frase o la miniatura. */}
            {miniatura ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", background: "var(--inset)", borderRadius: "var(--r-md)", padding: "var(--s3)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={miniatura} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 12, flex: "none" }} />
                <span style={{ fontSize: 13.5, color: "var(--on-surface-2)" }}>Il tuo screenshot</span>
              </div>
            ) : (
              <div style={{ background: "var(--inset)", borderRadius: "var(--r-md)", padding: "13px 16px", fontSize: 13.5, lineHeight: 1.5, color: "var(--on-surface)", fontWeight: 550 }}>
                «{citazione}»
              </div>
            )}

            {/* La card si costruisce da sola: prima lo scheletro, poi i valori. */}
            <div style={{ background: "color-mix(in srgb, var(--on-surface) 6%, var(--surface))", borderRadius: 18, padding: 16, marginTop: 14, boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
              {["Cosa", "Quando", "Dove"].map((k, i) => (
                <div key={k} style={{ display: "flex", alignItems: "center", minHeight: 36, gap: 12 }}>
                  <span style={{ width: 58, flex: "none", fontSize: 10, fontWeight: 700, letterSpacing: ".7px", textTransform: "uppercase", color: "var(--on-surface-3)" }}>{k}</span>
                  {campi > i ? (
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 550,
                        color: "var(--on-surface)",
                        animation: ridotto ? "none" : "keiko-pop .4s cubic-bezier(.22,.61,.36,1)",
                      }}
                    >
                      {valori[i]}
                    </span>
                  ) : (
                    <span className="k-shimmer" style={{ height: 12, borderRadius: 6, flex: 1, maxWidth: 180 }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 16, fontSize: 13, color: "var(--on-surface-2)", minHeight: 22 }}>
              <span style={{ fontSize: 17, animation: ridotto ? "none" : "keiko-swim 2.8s ease-in-out infinite" }}>🐋</span>
              <span key={frase} style={{ animation: ridotto ? "none" : "keiko-fade .35s" }}>
                {(immagine ? FRASI_IMMAGINE : FRASI_TESTO)[frase]}
              </span>
            </div>
          </>
        )}

        {/* ---------- 3 · controlli ---------- */}
        {(fase === "scelta" || fase === "salva") && (
          <>
            <div style={{ fontWeight: "var(--fw-black)", fontSize: 18, color: "var(--on-surface)", letterSpacing: "-.02em" }}>
              Guarda se ho capito bene
            </div>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)", marginTop: "var(--s1)" }}>
              Controlla e conferma con un tocco.
            </p>

            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {letti.map((p, i) => {
                const fuori = esclusi.has(i);
                if (i >= mostrate) return null;
                if (aperto === i) {
                  // Un tocco apre la card nel form di sempre: correggere resta
                  // possibile, non si perde niente rispetto a prima.
                  const { date, time } = splitDatetime(p.datetime);
                  const valore: EventFormValue = { title: p.title, type: p.type, date, time, location: p.location, reference: p.reference };
                  return (
                    <div key={i} style={{ background: "var(--inset)", border: "1px solid var(--inset-line)", borderRadius: 18, padding: "var(--s3)" }}>
                      <EventForm
                        value={valore}
                        onChange={(next) => {
                          const copia = [...letti];
                          copia[i] = { ...p, title: next.title, type: next.type, datetime: toDatetime(next), location: next.location, reference: next.reference };
                          setLetti(copia);
                        }}
                        onCancel={() => setAperto(null)}
                        onSave={() => setAperto(null)}
                        saveLabel="Fatto"
                        intro="Correggi quello che non torna"
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 13,
                      background: "color-mix(in srgb, var(--on-surface) 6%, var(--surface))", borderRadius: 18, padding: "14px 16px",
                      boxShadow: "0 8px 24px rgba(0,0,0,.25)",
                      opacity: fuori ? 0.45 : 1,
                      animation: ridotto ? "none" : "keiko-pop .45s cubic-bezier(.22,.61,.36,1)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setAperto(i)}
                      className="flex flex-1 items-center gap-3 text-left"
                      style={{ minWidth: 0, minHeight: "var(--tap)" }}
                      aria-label={`Correggi ${p.title}`}
                    >
                      <span style={{ width: 42, height: 42, borderRadius: 14, flex: "none", display: "grid", placeItems: "center", color: "var(--teal)", background: "color-mix(in srgb, var(--accent-strong) 12%, transparent)" }}>
                        {iconaDi(p.type)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--on-surface)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: fuori ? "line-through" : undefined }}>
                          {p.title}
                        </span>
                        <span style={{ display: "block", fontSize: 12.5, color: "var(--on-surface-2)", marginTop: 2 }}>
                          {quando(p.datetime)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nuovo = new Set(esclusi);
                        if (fuori) nuovo.delete(i); else nuovo.add(i);
                        setEsclusi(nuovo);
                      }}
                      aria-label={fuori ? `Rimetti ${p.title}` : `Togli ${p.title}`}
                      className="grid place-items-center rounded-xl"
                      style={{ width: "var(--tap)", height: "var(--tap)", flex: "none", color: "var(--on-surface-3)" }}
                    >
                      {fuori ? I.plus({ s: 16 }) : I.close({ s: 16 })}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={conferma}
              disabled={restanti === 0 || fase === "salva"}
              className="mt-[18px] flex w-full items-center justify-center gap-2 text-white transition-transform duration-200 active:scale-[0.96] disabled:opacity-40"
              style={{ fontSize: 15, fontWeight: "var(--fw-semi)", minHeight: 50, borderRadius: "var(--r-sm)", background: "var(--keiko-grad)", boxShadow: "var(--sh-btn)" }}
            >
              {fase === "salva" ? "Aggiungo…" : restanti === 1 ? "Aggiungi" : `Aggiungi ${restanti} eventi`}
            </button>
            <button
              type="button"
              onClick={close}
              disabled={fase === "salva"}
              className="w-full disabled:opacity-40"
              style={{ marginTop: "var(--s3)", minHeight: "var(--tap)", fontSize: "var(--fs-sm)", color: "var(--on-surface-2)" }}
            >
              Annulla
            </button>
          </>
        )}

        {/* ---------- errori e tetto giornaliero: restano QUI, leggibili ---------- */}
        {fase === "errore" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <span style={{ color: "var(--destructive)", display: "flex" }}>{I.info({ s: 48 })}</span>
            <p className="text-center" style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)", lineHeight: 1.5 }}>{errorMsg}</p>
            <button
              type="button"
              onClick={reset}
              className="underline underline-offset-2"
              style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)", color: "var(--accent-strong)", minHeight: "var(--tap)" }}
            >
              Riprova
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
