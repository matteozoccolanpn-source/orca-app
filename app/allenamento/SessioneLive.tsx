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
import { Chip } from "@/app/components/v2/Chip";
import {
  DISCIPLINE, NOME_DISCIPLINA, indovinaDisciplina, chiede, disciplinaDi,
  SCATTO_DISTANZA, serieDetta, riassuntoSerie, durataInSecondi,
  andatura, type Disciplina,
} from "@/lib/discipline";

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
  /* Di CHI sono le caselle in questo momento. Parte dall'esercizio gia' aperto,
     perche' `reps` e `kg` qui sopra sono gia' i suoi. Vedi `apri()`. */
  const campiDi = useRef<string | null>(nomeIniziale);

  /* ── LA DISCIPLINA ──
     Si indovina dal nome che arriva dalla scheda del preparatore, e si può
     cambiare a mano perché il nome sbaglierà. La scelta a mano vince sempre:
     `sceltaMano` è per esercizio e, quando c'è, ha la precedenza.
     Non si salva da nessuna parte: vale per la seduta che stai facendo. */
  const [sceltaMano, setSceltaMano] = useState<Record<string, Disciplina>>({});
  /* L'ordine con cui si decide, dal piu' attendibile al meno:
     1. quello che hai scelto a mano adesso — vince sempre;
     2. una serie che hai gia' segnato OGGI per questo esercizio;
     3. l'ULTIMA VOLTA che l'hai fatto, anche mesi fa: se allora era una corsa,
        oggi e' una corsa. Il dato e' gia' in tabella e arriva gia' pronto dal
        server (`ultimaVolta`), quindi ricordarsela non costa ne' una colonna
        nuova ne' una chiamata in piu';
     4. e solo se non c'e' niente, il nome scritto dal preparatore. */
  const disciplinaDe = (nome: string): Disciplina => {
    if (sceltaMano[nome]) return sceltaMano[nome];
    const oggi = ultima(sets.filter((x) => x.esercizio === nome));
    if (oggi) return disciplinaDi(oggi);
    const passata = ultima(ultimaVolta[nome] ?? []);
    if (passata?.disciplina) return disciplinaDi(passata);
    return indovinaDisciplina(nome);
  };

  /* I campi delle discipline di durata. Restano vuoti quando non li hai:
     una casella vuota dice «non lo so», uno zero direbbe una bugia. */
  const [distanza, setDistanza] = useState("");
  const [durata, setDurata] = useState("");
  const [bpm, setBpm] = useState("");
  const [dislivello, setDislivello] = useState("");
  /* Quanto ti e' costata: da 1 a 10, e vale per una panca come per una corsa.
     0 = non l'hai detto, e allora non si registra. */
  const [fatica, setFatica] = useState(0);

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
    /* Si riempie da capo SOLO quando l'esercizio cambia davvero.
       Le caselle sono uno stato solo per tutta la schermata, e senza svuotarle
       il battito della bici finiva nella camminata che apri subito dopo (visto
       in prova, 132 bpm su una camminata in cui non avevo misurato niente).
       Ma svuotare a ogni tocco era troppo: chiudere e riaprire lo STESSO
       esercizio buttava via quello che avevi appena scritto, senza avviso.
       Questo `ref` ricorda di chi sono le caselle adesso, cosi' i due casi si
       distinguono: cambio esercizio -> si azzerano, riapro lo stesso -> restano. */
    if (campiDi.current === nome) return;
    campiDi.current = nome;
    /* La distanza e la durata non si ricopiano dall'ultima volta: due chili
       sono gli stessi due chili, ma cinque chilometri di ieri non sono quelli
       di oggi, e trovarli gia' scritti li farebbe registrare per sbaglio. */
    setDistanza(""); setDurata(""); setBpm(""); setDislivello(""); setFatica(0);
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
      const d = disciplinaDe(nome);

      /* Si manda SOLO quello che quella disciplina registra: chiedere i chili
         a chi ha corso era il difetto da togliere, e riempire di zeri le
         colonne che non c'entrano lo rimetterebbe dentro dal retro.
         Quello che non si manda resta `null` in tabella. */
      const secondi = durataInSecondi(durata) ?? undefined;
      const metri = Number(distanza.replace(",", ".")) || undefined;
      const corpo: Record<string, unknown> = { esercizio: nome, serie: nSerie, disciplina: d };
      if (chiede(d, "ripetizioni")) corpo.ripetizioni = reps;
      if (chiede(d, "peso") && kg > 0) corpo.pesoKg = kg;
      if (chiede(d, "distanza") && metri) corpo.distanzaM = Math.round(metri);
      if (chiede(d, "durata") && secondi) corpo.secondi = secondi;
      if (chiede(d, "bpm") && Number(bpm) > 0) corpo.bpmMedio = Math.round(Number(bpm));
      if (chiede(d, "dislivello") && Number(dislivello) > 0) corpo.dislivelloM = Math.round(Number(dislivello));
      if (fatica > 0) corpo.fatica = fatica;

      const r2 = await fetch("/api/workout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", sessionId: sid, set: corpo }),
      });
      const j2 = await r2.json();
      if (!r2.ok || !j2.setId) throw new Error(j2.error || "Non riesco a salvare la serie");
      setSets((s) => [
        ...s,
        {
          id: j2.setId as string,
          esercizio: nome,
          serie: nSerie,
          ripetizioni: (corpo.ripetizioni as number) ?? null,
          pesoKg: (corpo.pesoKg as number) ?? null,
          secondi: (corpo.secondi as number) ?? null,
          fatica: fatica > 0 ? fatica : null,
          disciplina: d,
          distanzaM: (corpo.distanzaM as number) ?? null,
          bpmMedio: (corpo.bpmMedio as number) ?? null,
          dislivelloM: (corpo.dislivelloM as number) ?? null,
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
                          {/* L'ULTIMA VOLTA — e quando non dire niente.
                              La fonte di verita' dello stato «ha registrazioni»
                              sono le SERIE DI OGGI, `mie`: la riga in cima dice
                              «1 serie segnata» leggendo quella, e questa riga
                              non puo' dire il contrario.
                              Percio' «prima volta che lo segni» vale solo
                              finche' oggi non hai segnato niente. Appena c'e'
                              una serie, se dal passato non arriva nulla questa
                              riga sparisce del tutto: non c'e' un'ultima volta
                              da mostrare, e le due frasi non convivono mai.
                              (Difetto visto dal vivo su «Corsa Z2»: «1 serie ·
                              1 × 10» e «nessuna traccia di questo esercizio»
                              nella stessa card.) */}
                          {(prec.length > 0 || mie.length === 0) && (
                            <span className="rx" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ color: "var(--teal-soft)", display: "flex", flex: "none" }}>
                                {I.hist({ s: 13 })}
                              </span>
                              {prec.length === 0 ? (
                                <span>prima volta che lo segni</span>
                              ) : (
                                /* Confronta come con come: i pesi coi pesi, la
                                   corsa con la corsa. E non dice chi ha vinto:
                                   mette il dato di prima accanto a quello di
                                   adesso, il giudizio lo fa Matteo. */
                                <span>l&apos;ultima volta: {riassuntoSerie(prec)}</span>
                              )}
                            </span>
                          )}

                          {/* serie gia' fatte oggi */}
                          {mie.length > 0 && (
                            <span className="dchips" style={{ marginTop: 10 }}>
                              {mie.map((s) => (
                                <span className="dchip" key={s.id}>
                                  {serieDetta(s)}
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

                          {/* ── che cosa stai facendo ──
                              Indovinata dal nome, cambiabile a mano perche' il
                              nome sbagliera'. La scelta a mano vince. */}
                          {(() => { const d = disciplinaDe(ex.nome); return (
                          <>
                          <span className="chips" style={{ margin: "10px -12px 0", padding: "4px 12px" }}>
                            {DISCIPLINE.map((x) => (
                              <Chip key={x} on={x === d} onClick={() => setSceltaMano((m) => ({ ...m, [ex.nome]: x }))}>
                                {NOME_DISCIPLINA[x]}
                              </Chip>
                            ))}
                          </span>

                          {chiede(d, "ripetizioni") && (
                            <div className="fld">
                              <span className="fl">Ripetizioni</span>
                              <Step
                                val={reps}
                                dec={() => setReps(arrotonda(Math.max(1, reps - 1)))}
                                inc={() => setReps(arrotonda(reps + 1))}
                              />
                            </div>
                          )}
                          {chiede(d, "peso") && (
                            <div className="fld">
                              <span className="fl">Peso</span>
                              <Step
                                val={kg}
                                unit="kg"
                                dec={() => setKg(arrotonda(Math.max(0, kg - 2.5)))}
                                inc={() => setKg(arrotonda(kg + 2.5))}
                              />
                            </div>
                          )}
                          {chiede(d, "distanza") && (
                            <div className="fld">
                              <span className="fl">Distanza</span>
                              <Casella
                                val={distanza} onVal={setDistanza} unita="m" largo
                                scatto={SCATTO_DISTANZA[d]} etichetta="Distanza in metri"
                              />
                            </div>
                          )}
                          {chiede(d, "durata") && (
                            <div className="fld">
                              <span className="fl">Durata</span>
                              {/* mm:ss, non uno stepper: a 27 minuti non ci
                                  arriva nessuno premendo «+» */}
                              <Casella val={durata} onVal={setDurata} segnaposto="mm:ss" etichetta="Durata" testo />
                            </div>
                          )}
                          {chiede(d, "dislivello") && (
                            <div className="fld">
                              <span className="fl">Dislivello</span>
                              <Casella val={dislivello} onVal={setDislivello} unita="m D+" etichetta="Dislivello in metri" />
                            </div>
                          )}
                          {chiede(d, "bpm") && (
                            <div className="fld">
                              <span className="fl">Battito medio</span>
                              <Casella val={bpm} onVal={setBpm} unita="bpm" segnaposto="—" etichetta="Battito medio" />
                            </div>
                          )}

                          {/* La fatica: c'e' su tutte le discipline, e resta
                              facoltativa. «—» vuol dire che non l'hai detta.
                              Lo dice l'etichetta, perche' un campo mostrato
                              come «—» sembra una cosa che manca: da fuori si
                              legge come un obbligo non ancora soddisfatto. */}
                          <div className="fld">
                            <span className="fl">
                              Fatica <span style={{ color: "var(--meta)", fontWeight: 400 }}>facoltativa</span>
                            </span>
                            <Step
                              val={fatica > 0 ? fatica : "—"}
                              dec={() => setFatica(Math.max(0, fatica - 1))}
                              inc={() => setFatica(Math.min(10, fatica + 1))}
                            />
                          </div>

                          {/* L'andatura non si registra: si calcola, e si vede
                              mentre scrivi. */}
                          {andatura(Number(distanza.replace(",", ".")) || null, durataInSecondi(durata), d) && (
                            <span className="rx" style={{ color: "var(--teal-soft)" }}>
                              fa {andatura(Number(distanza.replace(",", ".")) || null, durataInSecondi(durata), d)}
                            </span>
                          )}
                          </>
                          ); })()}

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
          {/* `.skip` nel foglio e' un tasto («salta»), e il 600 e' suo di
              diritto. Qui la stessa classe porta un metadato — «Nessuna serie
              ancora» — che di quel peso non ha titolo: in grassetto sembrava
              un avviso invece del conto di quello che hai fatto.
              Peso medio, come tutti i metadati (UI-DECISIONI-V2, regola 3). */}
          <span className="skip" style={{ cursor: "default", fontWeight: 500 }}>
            {totSerie === 0
              ? "Nessuna serie ancora"
              : `${totSerie} serie · ${eserciziToccati} ${eserciziToccati === 1 ? "esercizio" : "esercizi"}`}
          </span>
          {/* UNA PRIMARIA PER SCHERMATA. Questo tasto e' due cose diverse:
              con delle serie segnate e' «Finisci allenamento», la conclusione
              di quello che stai facendo, e il terracotta e' suo.
              Senza nemmeno una serie e' «Esci» — un'uscita, non un'azione — e
              accanto alla card aperta c'era «Registra serie», anche lui
              terracotta: due primarie sulla stessa schermata, con quella meno
              importante piu' in vista. Da qui in poi «Esci» e' secondario.
              `flex:1` arriva da `.actions .cta` e va rimesso a mano: `.btn2`
              non ce l'ha. */}
          <button
            className={(totSerie === 0 ? "btn2" : "cta") + " tap"}
            onClick={finisci}
            disabled={chiudo}
            style={totSerie === 0 ? { flex: 1 } : undefined}
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

/** 2.5 + 2.5 in virgola mobile fa 5.000000000000001: qui si taglia. */
function arrotonda(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ═════════ la casella ═════════
   Lo stepper `Step` va bene per ripetizioni e chili, che sono numeri piccoli.
   Non va bene per 5000 metri o per 27 minuti: si scrivono, non si premono.
   Sta qui e non in `components/v2/` perche' per ora la usa solo questa
   schermata; se servisse altrove, si sposta.

   16px di corpo, non uno di meno: sotto i 16 iOS ingrandisce la pagina al
   primo tocco e non torna piu' indietro. E' gia' successo.

   `testo` serve alla durata, che ha i due punti dentro e quindi non e' un
   `number`; `inputMode` tiene il tastierino numerico anche li'. */
function Casella({
  val, onVal, unita, segnaposto, scatto, etichetta, testo, largo,
}: {
  val: string;
  onVal: (v: string) => void;
  unita?: string;
  segnaposto?: string;
  /** i due scatti tipici: 100 m su strada, 25 in vasca */
  scatto?: number;
  etichetta: string;
  testo?: boolean;
  largo?: boolean;
}) {
  const salta = (di: number) => onVal(String(Math.max(0, (Number(val) || 0) + di)));
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
      {scatto && (
        <button
          className="tap" aria-label={`Meno ${scatto}`} onClick={() => salta(-scatto)}
          style={{ width: 34, height: 44, flex: "none", background: "none", border: 0, color: "var(--meta)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          −{scatto}
        </button>
      )}
      <span
        className="step"
        style={{ minWidth: largo ? 118 : 104, padding: "0 12px", height: 44, display: "flex", alignItems: "center", gap: 6 }}
      >
        <input
          inputMode={testo ? "numeric" : "decimal"}
          type="text"
          value={val}
          onChange={(e) => onVal(e.target.value)}
          placeholder={segnaposto ?? "0"}
          aria-label={etichetta}
          style={{
            width: "100%", minWidth: 0, background: "none", border: 0, outline: 0,
            color: "var(--txt)", fontSize: 16, fontWeight: 600, fontFamily: "inherit",
            textAlign: "right", padding: 0,
          }}
        />
        {unita && <em style={{ fontStyle: "normal", color: "var(--meta)", fontWeight: 500, fontSize: 11.5, flex: "none" }}>{unita}</em>}
      </span>
      {scatto && (
        <button
          className="tap" aria-label={`Piu ${scatto}`} onClick={() => salta(scatto)}
          style={{ width: 34, height: 44, flex: "none", background: "none", border: 0, color: "var(--meta)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          +{scatto}
        </button>
      )}
    </span>
  );
}
