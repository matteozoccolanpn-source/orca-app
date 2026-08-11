"use client";

/* ============================================================================
 * SESSIONE LIVE (S4) — la schermata che usi MENTRE ti alleni.
 *
 * Il resto della pagina allenamento dice cosa dovresti fare. Questa dice cosa
 * hai fatto davvero: esercizio per esercizio, serie per serie, con accanto
 * quanto avevi caricato l'ultima volta — che e' il motivo per cui esiste.
 *
 * E' un pannello a schermo intero, non una pagina nuova: si apre sopra la
 * scheda e si chiude senza perdere niente (la seduta resta aperta su Supabase,
 * quindi se blocchi il telefono fra una serie e l'altra ritrovi tutto).
 *
 * Tabelle: workout_session / workout_set. Rotta: /api/workout/session.
 *
 * ONDATA 3 — cambia solo il vestito: `.full` + `.topbar` + `.fullpad` +
 * `.actions` del sistema V2 al posto degli stili in linea, `Step` al posto
 * dello stepper locale, le icone del set V2 al posto di lucide. Stato,
 * effetti, chiamate di rete e handler sono quelli di prima, riga per riga.
 *
 * Keiko qui TRASCRIVE: registra le serie che gli detti. Non propone carichi,
 * non corregge la scheda, non commenta l'allenamento.
 * ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WorkoutSession, WorkoutSetRow } from "@/lib/supabase";
import { I } from "@/app/components/v2/icons";
import { Step } from "@/app/components/v2/Step";
import { Check as CheckV2 } from "@/app/components/v2/Check";

type Esercizio = { nome: string; dettaglio?: string };

/* Il pannello va in portale sul <body>, fuori da qualsiasi `.k2`: senza questo
   guscio le classi del sistema V2 non lo raggiungerebbero. Fondo trasparente e
   altezza libera perche' `.k2` e' pensato per essere UNA pagina, e qui invece
   e' solo il contenitore di uno schermo pieno che sta sopra a un'altra pagina.
   (Stessa scelta di SuggestProvider.) */
const K2: React.CSSProperties = { background: "transparent", maxWidth: "none", height: "auto" };

export default function SessioneLive({
  day,
  titolo,
  esercizi,
  open,
  ultimaVolta,
  iniziale = null,
  onClose,
  onFinita,
}: {
  day: string;                       // YYYY-MM-DD di oggi
  titolo: string | null;             // titolo della sessione di oggi ("Petto e tricipiti")
  esercizi: Esercizio[];             // gli esercizi previsti oggi dalla scheda
  open: WorkoutSession | null;       // seduta di oggi (aperta o gia' chiusa), se c'e'
  /* S5: "l'ultima volta" arriva gia' pronta dal server, per tutti gli esercizi
     di oggi in un colpo solo. Prima la chiedevamo qui, un esercizio alla volta,
     e sotto la scritta "cerco l'ultima volta..." c'era mezzo secondo di attesa
     ogni volta che aprivi una card. */
  ultimaVolta: Record<string, WorkoutSetRow[]>;
  iniziale?: number | null;          // esercizio da aprire subito (hai toccato quello)
  onClose: () => void;
  onFinita: () => void;              // il genitore segna il giorno come allenato
}) {
  // Id della seduta: se ce n'e' una aperta la riprendiamo, altrimenti nasce
  // alla prima serie registrata (cosi' aprire e chiudere per curiosita' non
  // lascia in giro sedute vuote).
  const [sessionId, setSessionId] = useState<string | null>(open?.id ?? null);
  const [sets, setSets] = useState<WorkoutSetRow[]>(open?.sets ?? []);

  // Se hai toccato un esercizio nell'elenco, il pannello si apre gia' su quello.
  const idxIniziale =
    typeof iniziale === "number" && iniziale >= 0 && iniziale < esercizi.length ? iniziale : null;
  const [apertoIdx, setApertoIdx] = useState<number | null>(idxIniziale);
  const [salvo, setSalvo] = useState(false);
  const [chiudo, setChiudo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Caselle precompilate: l'ultima serie che hai segnato oggi su quell'esercizio,
  // se no l'ultima volta che l'hai fatto, se no valori neutri.
  const nomeIniziale = idxIniziale !== null ? esercizi[idxIniziale].nome : null;
  const rifIniziale =
    (nomeIniziale ? ultima((open?.sets ?? []).filter((s) => s.esercizio === nomeIniziale)) : null) ??
    (nomeIniziale ? ultima(ultimaVolta[nomeIniziale] ?? []) : null) ??
    ultima(open?.sets ?? []);
  const [reps, setReps] = useState<number>(rifIniziale?.ripetizioni ?? 10);
  const [kg, setKg] = useState<number>(rifIniziale?.pesoKg ?? 0);

  // Blocca lo scorrimento della pagina sotto, come fanno gli altri pannelli.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const esercizioAperto = apertoIdx !== null ? esercizi[apertoIdx] : null;

  /* --- apri/chiudi un esercizio e precompila le caselle ------------------
   * Il riferimento buono e' l'ultima serie di oggi; se oggi non hai ancora
   * segnato niente, quella dell'ultima volta. Niente attesa: e' gia' qui. */
  function apri(i: number) {
    if (apertoIdx === i) { setApertoIdx(null); return; }
    setApertoIdx(i);
    const nome = esercizi[i].nome;
    const base = ultima(sets.filter((s) => s.esercizio === nome)) ?? ultima(ultimaVolta[nome] ?? []);
    if (base) {
      if (base.ripetizioni) setReps(base.ripetizioni);
      if (base.pesoKg !== null) setKg(base.pesoKg);
    }
  }

  /* --- registra una serie ---------------------------------------------- */
  async function registra() {
    if (!esercizioAperto || salvo) return;
    setSalvo(true);
    setErrore(null);
    try {
      let sid = sessionId;
      if (!sid) {
        const r = await fetch("/api/workout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", day, titolo: titolo ?? undefined }),
        });
        const j = await r.json();
        if (!r.ok || !j.sessionId) throw new Error(j.error || "Non riesco ad aprire la seduta");
        sid = j.sessionId as string;
        setSessionId(sid);
      }
      const nome = esercizioAperto.nome;
      const nSerie = sets.filter((s) => s.esercizio === nome).length + 1;
      const r2 = await fetch("/api/workout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          sessionId: sid,
          set: { esercizio: nome, serie: nSerie, ripetizioni: reps, pesoKg: kg > 0 ? kg : undefined },
        }),
      });
      const j2 = await r2.json();
      if (!r2.ok || !j2.setId) throw new Error(j2.error || "Non riesco a salvare la serie");
      setSets((s) => [
        ...s,
        {
          id: j2.setId as string,
          esercizio: nome,
          serie: nSerie,
          ripetizioni: reps,
          pesoKg: kg > 0 ? kg : null,
          secondi: null,
          fatica: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (navigator.vibrate) navigator.vibrate(18);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Salvataggio fallito");
    } finally {
      setSalvo(false);
    }
  }

  /* --- cancella una serie sbagliata (400 invece di 40) ------------------ */
  async function cancella(id: string) {
    const prima = sets;
    setSets((s) => s.filter((x) => x.id !== id));   // ottimistico: sparisce subito
    try {
      const r = await fetch("/api/workout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteSet", setId: id }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setSets(prima);                                // non ha funzionato: torna com'era
      setErrore("Non sono riuscito a cancellare la serie");
    }
  }

  /* --- chiudi la seduta ------------------------------------------------- */
  async function finisci() {
    if (chiudo) return;
    if (!sessionId) { onClose(); return; }          // nessuna serie: niente da chiudere
    setChiudo(true);
    try {
      await fetch("/api/workout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", sessionId }),
      });
      onFinita();
    } catch {
      setErrore("Non sono riuscito a chiudere la seduta");
      setChiudo(false);
    }
  }

  const totSerie = sets.length;
  const eserciziToccati = new Set(sets.map((s) => s.esercizio)).size;

  // Il pannello vive in fondo al <body> (fuori da ogni card con overflow), quindi
  // esiste solo nel browser: sul server non c'e' un body a cui attaccarlo.
  if (typeof document === "undefined") return null;

  const pannello = (
    <div className="k2" style={K2}>
      <div className="full" role="dialog" aria-modal="true" aria-label="Allenamento in corso" ref={scrollRef}>
        {/* ---------- testata ---------- */}
        <div className="topbar">
          <div className="r1">
            {/* Nel mock `.x` e' uno <span>: qui resta un <button> perche' era un
                bottone vero anche prima. `color:inherit` e' solo il colore che
                lo span avrebbe ereditato, non un valore nuovo. */}
            <button className="x tap" onClick={onClose} aria-label="Chiudi" style={{ color: "inherit" }}>
              {I.close({ s: 15 })}
            </button>
            <span className="col">
              <span className="t">{titolo || "Sessione di oggi"}</span>
              <span className="m">allenamento in corso</span>
            </span>
            {/* Il contatore e la barra dicono la stessa cosa del riepilogo in
                fondo: quanti esercizi hai toccato su quelli previsti. Nessun
                dato nuovo, solo quello che c'e' gia'. */}
            {esercizi.length > 0 && (
              <span className="c">{eserciziToccati}/{esercizi.length}</span>
            )}
          </div>
          {esercizi.length > 0 && (
            <div className="prog">
              <i style={{ width: `${(eserciziToccati / esercizi.length) * 100}%` }} />
            </div>
          )}
        </div>

        {/* ---------- corpo ---------- */}
        <div className="fullpad">
          {esercizi.length > 0 && (
            <div className="rx" style={{ marginTop: 0, marginBottom: 10 }}>
              Tocca l&apos;esercizio che stai facendo.
            </div>
          )}

          {esercizi.length === 0 && (
            <p className="rx" style={{ marginTop: 0 }}>
              Oggi la scheda non prevede esercizi. Puoi comunque chiudere e allenarti a modo tuo.
            </p>
          )}

          {esercizi.length > 0 && (
            <div className="srf list">
              {esercizi.map((ex, i) => {
                const mie = sets.filter((s) => s.esercizio === ex.nome);
                const aperto = apertoIdx === i;
                const prec = ultimaVolta[ex.nome] ?? [];
                return (
                  <div
                    key={`${ex.nome}-${i}`}
                    className={"item" + (mie.length > 0 ? " done" : "") + (aperto ? " openx" : "")}
                  >
                    <div
                      className="item-row tap"
                      onClick={() => apri(i)}
                      role="button"
                      aria-expanded={aperto}
                    >
                      {/* La spunta non si tocca: un esercizio e' fatto quando ci
                          sono serie vere registrate. */}
                      <CheckV2 on={mie.length > 0} />
                      <span className="in">
                        <span className="k">
                          {mie.length > 0
                            ? `${mie.length} serie ${mie.length === 1 ? "segnata" : "segnate"}`
                            : ex.dettaglio || "nessuna serie oggi"}
                        </span>
                        <span className="tx">{ex.nome}</span>
                      </span>
                      <span className="chevhit">
                        {I.chev({ c: "chev", st: aperto ? { transform: "rotate(180deg)" } : undefined })}
                      </span>
                    </div>

                    {/* `.item-x` chiude a max-height 0 e apre al valore della
                        classe (400px). Qui dentro ci stanno due stepper e la
                        lista delle serie, che puo' andare a capo: l'apertura
                        prende un tetto piu' alto perche' il numero non e' una
                        misura di disegno, e' solo "abbastanza". */}
                    <div className="item-x" style={aperto ? { maxHeight: 640 } : undefined}>
                      <div className="inner">
                        <div className="col">
                          {/* l'ultima volta */}
                          <span className="rx" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ color: "var(--teal-soft)", display: "flex", flex: "none" }}>
                              {I.hist({ s: 13 })}
                            </span>
                            {prec.length === 0 ? (
                              <span>prima volta che lo segni</span>
                            ) : (
                              <span>
                                l&apos;ultima volta: {prec.map((s) => s.ripetizioni ?? "–").join(" · ")} rip
                                {prec.some((s) => s.pesoKg !== null) ? ` · ${maxKg(prec)} kg` : ""}
                              </span>
                            )}
                          </span>

                          {/* serie gia' fatte oggi */}
                          {mie.length > 0 && (
                            <span className="dchips" style={{ marginTop: 10 }}>
                              {mie.map((s) => (
                                <span className="dchip" key={s.id}>
                                  {s.ripetizioni ?? "–"}
                                  {s.pesoKg !== null ? <> × <b>{s.pesoKg} kg</b></> : null}
                                  <button
                                    className="tap"
                                    onClick={() => cancella(s.id)}
                                    aria-label="Cancella serie"
                                    style={{
                                      width: 28, height: 28, marginRight: -8, flex: "none",
                                      display: "grid", placeItems: "center",
                                      background: "none", border: 0, color: "var(--meta)", cursor: "pointer",
                                    }}
                                  >
                                    {I.close({ s: 12 })}
                                  </button>
                                </span>
                              ))}
                            </span>
                          )}

                          {/* i due numeri */}
                          <div className="fld">
                            <span className="fl">Ripetizioni</span>
                            <Step
                              val={reps}
                              dec={() => setReps(arrotonda(Math.max(1, reps - 1)))}
                              inc={() => setReps(arrotonda(reps + 1))}
                            />
                          </div>
                          <div className="fld">
                            <span className="fl">Peso</span>
                            <Step
                              val={kg}
                              unit="kg"
                              dec={() => setKg(arrotonda(Math.max(0, kg - 2.5)))}
                              inc={() => setKg(arrotonda(kg + 2.5))}
                            />
                          </div>

                          <button
                            className="cta wide tap"
                            onClick={registra}
                            disabled={salvo}
                            style={{ marginTop: 12 }}
                          >
                            {salvo ? null : I.tick({ s: 15 })}
                            {salvo ? "Salvo…" : `Registra serie ${mie.length + 1}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {errore && (
            <div className="hint warm">
              {I.info({ s: 14 })}
              <p>{errore}</p>
            </div>
          )}
        </div>

        {/* ---------- fondo ---------- */}
        <div className="actions">
          <span className="skip" style={{ cursor: "default" }}>
            {totSerie === 0
              ? "Nessuna serie ancora"
              : `${totSerie} serie · ${eserciziToccati} ${eserciziToccati === 1 ? "esercizio" : "esercizi"}`}
          </span>
          <button
            className="cta tap"
            onClick={finisci}
            disabled={chiudo}
          >
            {chiudo ? "Chiudo…" : totSerie === 0 ? "Esci" : "Finisci allenamento"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(pannello, document.body);
}

/* -------------------------------------------------------------------------- */

/** L'ultima riga di un elenco di serie (null se l'elenco e' vuoto). */
function ultima(rows: WorkoutSetRow[]): WorkoutSetRow | null {
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

/** Il peso piu' alto di una serie di serie (per il riassunto "l'ultima volta"). */
function maxKg(rows: WorkoutSetRow[]): number {
  return rows.reduce((m, r) => (r.pesoKg !== null && r.pesoKg > m ? r.pesoKg : m), 0);
}

/** 2.5 + 2.5 in virgola mobile fa 5.000000000000001: qui si taglia. */
function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}
