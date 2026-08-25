"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pastoSomigliante, type PastoDelGiorno } from "@/lib/cucina";
import { I } from "@/app/components/v2/icons";

/* ═════════ «CUCINA CON KEIKO» — un passo per volta (blocco 8.3) ═════════
 *
 * Gli stessi passi che il foglio ricetta mostra come elenco, uno alla volta e
 * grandi. Serve quando hai le mani sporche e il telefono appoggiato: da mezzo
 * metro, un elenco di sette righe non si legge.
 *
 * 🚫 I PASSI NON SI FABBRICANO. `RicettaEstratta.passi` viene dalla descrizione
 * scritta dal creator: se non c'e', questa schermata non si apre e la voce non
 * compare nel foglio. Dedurre i passaggi dal titolo — «pasta alla carbonara» →
 * «metti l'acqua a bollire» — sarebbe inventarsi una ricetta e firmarla col
 * nome di qualcun altro.
 *
 * GLI INGREDIENTI RESTANO RAGGIUNGIBILI: chi cucina li ricontrolla a meta', e
 * uscire dalla sequenza per rileggerli vorrebbe dire perdere il segno.
 *
 * LA FINE PORTA AL PASTO, e riusa il giro del blocco 7 — la stessa `annota()`
 * della Cucina, la stessa riga in `diet_log`. Non e' un secondo modo di
 * registrare la stessa cosa: e' quello, chiamato da qui.
 *
 * ⚠️ Regola 3-decies: registrare non e' prescrivere. «L'ho cucinata per pranzo»
 * e' un fatto su Matteo, non «questa ricetta sostituisce quel pasto».
 */

const K2: React.CSSProperties = { background: "transparent", maxWidth: "none", height: "auto" };

/* Il numero del passo, con le misure di `.giant .n` del mock — 120px Fraunces,
   teal-soft, cifre tabellari. Le misure sono copiate, non scelte.
   Perche' in linea e non con la classe: `.giant` del foglio e' il timer della
   palestra, `position:fixed;inset:0`, e prendersela addosso vorrebbe dire
   coprire la topbar e gli ingredienti. Qui serve il NUMERONE dentro una
   schermata che scorre, non un secondo strato sopra. */
const NUMERO: React.CSSProperties = {
  fontFamily: "var(--font-fraunces-v2), Fraunces, Georgia, serif",
  fontSize: 120,
  fontWeight: 500,
  color: "var(--teal-soft)",
  letterSpacing: "-.04em",
  lineHeight: 1,
  fontVariantNumeric: "tabular-nums",
};

/* ── LO SCHERMO CHE RESTA ACCESO (8.4) ──
 * Due obblighi, e vengono tutt'e due da difetti che si notano tardi:
 *   1. si RILASCIA uscendo. Uno schermo che resta acceso dopo che hai chiuso
 *      si scopre a batteria scarica, quando e' troppo tardi per capire perche';
 *   2. dove l'API non c'e' non si rompe niente. Su iOS sotto la 16.4 e dentro
 *      qualunque browser che non l'abbia, `navigator.wakeLock` e' `undefined`:
 *      si cucina lo stesso, semplicemente lo schermo si spegne come sempre.
 * Il permesso si perde da solo quando il telefono si blocca o cambi app: al
 * ritorno si richiede, o dalla seconda volta in poi non varrebbe piu' niente. */
type Sentinella = { released: boolean; release: () => Promise<void> };
type ConWakeLock = Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinella> } };

function useSchermoAcceso() {
  const tenuta = useRef<Sentinella | null>(null);

  useEffect(() => {
    let vivo = true;

    async function chiedi() {
      const wl = (navigator as ConWakeLock).wakeLock;
      if (!wl || tenuta.current) return;
      try {
        const s = await wl.request("screen");
        if (!vivo) { s.release().catch(() => {}); return; }
        tenuta.current = s;
      } catch {
        /* Il browser puo' rifiutare (batteria bassa, pagina non visibile).
           Non e' un errore da mostrare: e' lo schermo che si spegne. */
      }
    }

    function alRitorno() {
      if (document.visibilityState !== "visible") return;
      /* `released` dice se il browser l'ha gia' lasciata cadere (succede ogni
         volta che il telefono si blocca o cambi app). Se e' ancora buona non
         si tocca: azzerare il riferimento e richiederne un'altra lascerebbe la
         prima appesa, tenuta da nessuno e rilasciata mai — cioe' proprio lo
         schermo acceso per sempre che questo pezzo deve evitare. */
      if (tenuta.current && !tenuta.current.released) return;
      tenuta.current = null;
      chiedi();
    }

    chiedi();
    document.addEventListener("visibilitychange", alRitorno);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", alRitorno);
      tenuta.current?.release().catch(() => {});
      tenuta.current = null;
    };
  }, []);
}

export default function CucinaConKeiko({
  titolo,
  passi,
  ingredienti = [],
  pasti = [],
  onCucinataPer,
  onClose,
}: {
  titolo: string;
  /** Solo quelli veri: chi chiama non apre la sequenza se sono zero. */
  passi: string[];
  ingredienti?: { nome: string; quantita?: string }[];
  /** I pasti di oggi, per la via d'uscita. Vuoto = niente piano, e allora la
   *  fine e' solo «Ho finito». */
  pasti?: PastoDelGiorno[];
  onCucinataPer?: (p: PastoDelGiorno) => Promise<void> | void;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);
  const [fine, setFine] = useState(false);
  const [ingredientiAperti, setIngredientiAperti] = useState(false);
  const [segno, setSegno] = useState(false);
  const corpo = useRef<HTMLDivElement | null>(null);
  // PARTE E: quale pasto di oggi somiglia a questa ricetta — solo un
  // suggerimento, calcolato una volta, mai scritto finché non è un tap.
  const somigliante = useMemo(() => pastoSomigliante(titolo, pasti), [titolo, pasti]);

  useSchermoAcceso();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* `Esc` esce, come dal foglio ricetta che sta sotto. Senza questa riga, da
     tastiera `Esc` chiudeva SOLO il foglio nascosto sotto la sequenza: non si
     vedeva succedere niente, e uscendo ci si ritrovava nella Cucina invece che
     nella ricetta. Ora chiudono insieme, che e' quello che uno si aspetta. */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  const ultimo = i >= passi.length - 1;

  function avanti() {
    if (ultimo) { setFine(true); corpo.current?.scrollTo(0, 0); return; }
    setI((n) => n + 1);
    corpo.current?.scrollTo(0, 0);
  }
  function indietro() {
    if (fine) { setFine(false); return; }
    if (i > 0) setI((n) => n - 1);
    corpo.current?.scrollTo(0, 0);
  }

  async function segnaPer(p: PastoDelGiorno) {
    if (segno) return;
    setSegno(true);
    try { await onCucinataPer?.(p); onClose(); }
    finally { setSegno(false); }
  }

  if (typeof document === "undefined") return null;

  const pannello = (
    <div className="k2" style={K2}>
      <div className="full" role="dialog" aria-modal="true" aria-label={`Cucina con Keiko: ${titolo}`} ref={corpo}>
        <div className="topbar">
          <div className="r1">
            <button className="x tap" onClick={onClose} aria-label="Esci" style={{ color: "inherit" }}>
              {I.close({ s: 15 })}
            </button>
            <span className="col">
              <span className="t">{titolo}</span>
              <span className="m">{fine ? "hai finito" : "un passo per volta"}</span>
            </span>
            {!fine && <span className="c">{i + 1}/{passi.length}</span>}
          </div>
          <div className="prog">
            <i style={{ width: `${((fine ? passi.length : i + 1) / Math.max(1, passi.length)) * 100}%` }} />
          </div>
        </div>

        <div className="fullpad" style={{ paddingBottom: 140 }}>
          {!fine ? (
            <>
              {/* Il numero e il passo. Niente altro nello sguardo: e' l'unica
                  schermata dell'app dove si legge da mezzo metro. */}
              <div style={{ textAlign: "center", marginTop: 18 }}>
                <div style={NUMERO} aria-hidden>{i + 1}</div>
                <div className="status" style={{ marginTop: 2 }}>
                  passo {i + 1} di {passi.length}
                </div>
              </div>

              <p style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 500, marginTop: 22, textAlign: "center", padding: "0 4px" }}>
                {passi[i]}
              </p>

              {/* Gli ingredienti, senza uscire. Chiusi di default: quando stai
                  a un passo, il passo e' la cosa. */}
              {ingredienti.length > 0 && (
                <div className="srf" style={{ marginTop: 26 }}>
                  <div
                    className="row-act tap"
                    role="button"
                    aria-expanded={ingredientiAperti}
                    onClick={() => setIngredientiAperti((v) => !v)}
                  >
                    <span className="ic2">{I.pot({ s: 16 })}</span>
                    <span className="in">
                      <span className="t">Ingredienti</span>
                      <span className="m">{ingredienti.length} in tutto, come li ha scritti il creator</span>
                    </span>
                    {I.chev({ c: "chev", st: ingredientiAperti ? { transform: "rotate(180deg)" } : undefined })}
                  </div>
                  {ingredientiAperti && (
                    <div className="list">
                      {ingredienti.map((ing, k) => (
                        <div className="item" key={`${ing.nome}-${k}`}>
                          <div className="item-row" style={{ cursor: "default" }}>
                            <span className="in"><span className="tx">{ing.nome}</span></span>
                            {ing.quantita && <span className="idata">{ing.quantita}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="rx" style={{ textAlign: "center", marginTop: 22 }}>
                Passi presi dalla descrizione del creator, non modificati.
              </p>
            </>
          ) : (
            /* ── LA FINE ──
               Se oggi c'e' un piano, la via d'uscita porta al pasto: e' il giro
               del blocco 7, chiamato da qui. Senza piano non si inventa niente:
               resta «Chiudi». */
            <>
              <div style={{ textAlign: "center", marginTop: 22 }}>
                <span style={{ color: "var(--teal-soft)", display: "inline-flex" }} aria-hidden>{I.tick({ s: 64 })}</span>
                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", marginTop: 10 }}>
                  Fine dei passi
                </div>
                <div className="status" style={{ marginTop: 4 }}>{titolo}</div>
              </div>

              {pasti.length > 0 && onCucinataPer ? (
                <div className="srf" style={{ marginTop: 24, padding: "14px 12px" }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em" }}>L&apos;ho cucinata per…</div>
                  <div className="status" style={{ marginTop: 2 }}>
                    resta scritto nel registro di oggi, come l&apos;hai detto tu
                  </div>
                  {/* PARTE E: Keiko PROPONE, non decide. Il pasto che somiglia
                      per ingredienti si vede — un bordo, non una spunta — ma
                      resta un tasto uguale agli altri: il dito conferma
                      sempre, anche quando propone lei (docs/SPEC-RICETTARIO.md
                      §1, «propone non decide»). */}
                  <div className="chips" style={{ marginTop: 10, flexWrap: "wrap", overflow: "visible" }}>
                    {pasti.map((p) => {
                      const proposto = p === somigliante;
                      return (
                        <button
                          key={p.indice}
                          className="chip tap"
                          onClick={() => segnaPer(p)}
                          disabled={segno}
                          style={proposto
                            ? { minHeight: 44, borderColor: "var(--accent)", color: "var(--accent)" }
                            : { minHeight: 44 }}
                        >
                          {p.pasto}
                        </button>
                      );
                    })}
                  </div>
                  {somigliante && (
                    <p className="rx" style={{ marginTop: 8 }}>La colleghi al {somigliante.pasto.toLowerCase()}?</p>
                  )}
                </div>
              ) : (
                <p className="rx" style={{ textAlign: "center", marginTop: 20 }}>
                  Buon appetito.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── IL FONDO ──
            Una primaria per schermata (3-quinquies): il terracotta e' di
            «Avanti», che e' la cosa che stai facendo. Indietro e' una freccia
            neutra, e «Chiudi» alla fine e' un'uscita, non un'azione. */}
        <div className="actions">
          {!fine ? (
            <>
              <button
                className="nav tap"
                onClick={indietro}
                disabled={i === 0}
                aria-label="Passo precedente"
                style={{ opacity: i === 0 ? 0.4 : 1, color: "inherit" }}
              >
                {I.back({ s: 15 })}
              </button>
              <button className="cta tap" onClick={avanti}>
                {ultimo ? <>{I.tick({ s: 15 })}Ho finito</> : <>Avanti{I.right({ s: 15 })}</>}
              </button>
            </>
          ) : (
            <>
              <button className="nav tap" onClick={indietro} aria-label="Torna ai passi" style={{ color: "inherit" }}>
                {I.back({ s: 15 })}
              </button>
              <button className="btn2 tap" onClick={onClose} style={{ flex: 1 }}>
                Chiudi
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(pannello, document.body);
}
