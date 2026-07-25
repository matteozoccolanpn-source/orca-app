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
 * ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Minus, Check, Trash2, Loader2, History } from "lucide-react";
import type { WorkoutSession, WorkoutSetRow } from "@/lib/supabase";

type Esercizio = { nome: string; dettaglio?: string };

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
    <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Allenamento in corso">
      {/* ---------- testata ---------- */}
      <div style={S.head}>
        <div style={{ minWidth: 0 }}>
          <div style={S.kicker}>Allenamento in corso</div>
          <div style={S.titolo}>{titolo || "Sessione di oggi"}</div>
        </div>
        <button onClick={onClose} aria-label="Chiudi" style={S.iconBtn}>
          <X style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* ---------- corpo ---------- */}
      <div ref={scrollRef} style={S.body}>
        {esercizi.length > 0 && (
          <div style={S.guida}>Tocca l&apos;esercizio che stai facendo.</div>
        )}

        {esercizi.length === 0 && (
          <p style={S.vuoto}>Oggi la scheda non prevede esercizi. Puoi comunque chiudere e allenarti a modo tuo.</p>
        )}

        {esercizi.map((ex, i) => {
          const mie = sets.filter((s) => s.esercizio === ex.nome);
          const aperto = apertoIdx === i;
          const prec = ultimaVolta[ex.nome] ?? [];
          return (
            <div key={`${ex.nome}-${i}`} style={{ ...S.card, ...(aperto ? S.cardAperta : null) }}>
              <button
                onClick={() => apri(i)}
                style={S.cardHead}
                aria-expanded={aperto}
              >
                <div style={{ minWidth: 0, textAlign: "left" }}>
                  <div style={S.exNome}>{ex.nome}</div>
                  {ex.dettaglio && <div style={S.exDett}>{ex.dettaglio}</div>}
                </div>
                <span style={{ ...S.badge, ...(mie.length > 0 ? S.badgeOn : null) }}>
                  {mie.length > 0 ? `${mie.length} ✓` : "—"}
                </span>
              </button>

              {aperto && (
                <div style={{ padding: "0 14px 14px" }}>
                  {/* l'ultima volta */}
                  <div style={S.ultima}>
                    <History style={{ width: 14, height: 14, flex: "none" }} />
                    {prec.length === 0 && <span>prima volta che lo segni</span>}
                    {prec.length > 0 && (
                      <span>
                        l&apos;ultima volta: {prec.map((s) => s.ripetizioni ?? "–").join(" · ")} rip
                        {prec.some((s) => s.pesoKg !== null) ? ` · ${maxKg(prec)} kg` : ""}
                      </span>
                    )}
                  </div>

                  {/* serie gia' fatte oggi */}
                  {mie.length > 0 && (
                    <div style={S.serieWrap}>
                      {mie.map((s) => (
                        <span key={s.id} style={S.serie}>
                          {s.ripetizioni ?? "–"}
                          {s.pesoKg !== null ? ` × ${s.pesoKg}kg` : ""}
                          <button onClick={() => cancella(s.id)} aria-label="Cancella serie" style={S.serieX}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* i due numeri */}
                  <div style={S.numeri}>
                    <Stepper etichetta="Ripetizioni" valore={reps} passo={1} min={1} onCambia={setReps} />
                    <Stepper etichetta="Peso (kg)" valore={kg} passo={2.5} min={0} onCambia={setKg} suffisso="kg" />
                  </div>

                  <button onClick={registra} disabled={salvo} style={S.registra}>
                    {salvo ? <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> : <Check style={{ width: 18, height: 18 }} />}
                    {salvo ? "Salvo…" : `Registra serie ${mie.length + 1}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {errore && <div style={S.errore}>{errore}</div>}
      </div>

      {/* ---------- fondo ---------- */}
      <div style={S.foot}>
        <div style={S.riepilogo}>
          {totSerie === 0
            ? "Nessuna serie ancora"
            : `${totSerie} serie · ${eserciziToccati} esercizi`}
        </div>
        <button onClick={finisci} disabled={chiudo} style={S.finisci}>
          {chiudo ? "Chiudo…" : totSerie === 0 ? "Esci" : "Finisci allenamento"}
        </button>
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

/** Due bottoni grossi e un numero grosso: con le mani sudate non si sbaglia. */
function Stepper({
  etichetta, valore, passo, min, onCambia, suffisso,
}: {
  etichetta: string;
  valore: number;
  passo: number;
  min: number;
  onCambia: (n: number) => void;
  suffisso?: string;
}) {
  const arrotonda = (n: number) => Math.round(n * 100) / 100;
  return (
    <div style={S.stepWrap}>
      <div style={S.stepLbl}>{etichetta}</div>
      <div style={S.stepRow}>
        <button
          aria-label={`Meno ${etichetta}`}
          onClick={() => onCambia(arrotonda(Math.max(min, valore - passo)))}
          style={S.stepBtn}
        >
          <Minus style={{ width: 18, height: 18 }} />
        </button>
        <div style={S.stepVal}>
          {valore}
          {suffisso && valore > 0 ? <small style={S.stepSuf}>{suffisso}</small> : null}
        </div>
        <button
          aria-label={`Piu ${etichetta}`}
          onClick={() => onCambia(arrotonda(valore + passo))}
          style={S.stepBtn}
        >
          <Plus style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </div>
  );
}

/* --- stili -----------------------------------------------------------------
 * Inline e non in CSS: il pannello va in portale sul <body>, fuori dallo scope
 * .keiko, quindi non puo' contare sulle classi della shell. Usa i token globali
 * cosi' resta identico al resto (niente viola, ambra e basta).
 * -------------------------------------------------------------------------- */
const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 200,
    display: "flex", flexDirection: "column",
    background: "var(--k-bg, #14100C)",
    fontFamily: "var(--f, system-ui, -apple-system, sans-serif)",
    color: "var(--k-text, #F4EFE7)",
  },
  head: {
    flex: "none", display: "flex", alignItems: "center", gap: 12,
    padding: "calc(env(safe-area-inset-top, 0px) + 14px) 16px 14px",
    borderBottom: "1px solid var(--k-line, rgba(255,255,255,.09))",
  },
  kicker: { fontSize: 11.5, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 800, color: "var(--k-accent, #FFB84D)" },
  titolo: { fontSize: 19, fontWeight: 800, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  iconBtn: {
    marginLeft: "auto", flex: "none", width: 44, height: 44, display: "grid", placeItems: "center",
    borderRadius: 999, border: "1px solid var(--k-line, rgba(255,255,255,.09))",
    background: "var(--k-surface, rgba(255,255,255,.05))", color: "inherit", cursor: "pointer",
  },
  body: { flex: 1, overflowY: "auto", padding: "14px 16px 20px", WebkitOverflowScrolling: "touch" },
  guida: { fontSize: 13, color: "var(--k-text-3, #9A9086)", fontWeight: 600, margin: "0 2px 12px" },
  vuoto: { fontSize: 14, color: "var(--k-text-3, #9A9086)", lineHeight: 1.5, margin: "8px 2px" },
  card: {
    background: "var(--k-surface, rgba(255,255,255,.05))",
    border: "1px solid var(--k-line, rgba(255,255,255,.09))",
    borderRadius: 16, marginBottom: 10, overflow: "hidden",
  },
  cardAperta: { borderColor: "var(--k-accent, #FFB84D)" },
  cardHead: {
    display: "flex", alignItems: "center", gap: 12, width: "100%",
    padding: "14px", minHeight: 60, background: "none", border: 0,
    color: "inherit", font: "inherit", cursor: "pointer",
  },
  exNome: { fontSize: 15.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  exDett: { fontSize: 13, color: "var(--k-text-3, #9A9086)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  badge: {
    marginLeft: "auto", flex: "none", fontSize: 12.5, fontWeight: 800, borderRadius: 999,
    padding: "6px 11px", background: "rgba(255,255,255,.06)", color: "var(--k-text-3, #9A9086)",
  },
  badgeOn: { background: "var(--k-accent, #FFB84D)", color: "var(--k-accent-ink, #241A0E)" },
  ultima: {
    display: "flex", alignItems: "center", gap: 7, minHeight: 20,
    fontSize: 13, color: "var(--k-text-2, #C9BFB2)", marginBottom: 12,
  },
  serieWrap: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 },
  serie: {
    display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700,
    padding: "7px 7px 7px 12px", borderRadius: 999,
    background: "rgba(255,184,77,.14)", color: "var(--k-accent, #FFB84D)",
  },
  serieX: {
    width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: 999,
    border: 0, background: "rgba(0,0,0,.25)", color: "inherit", cursor: "pointer",
  },
  numeri: { display: "flex", gap: 10, marginBottom: 12 },
  stepWrap: { flex: 1, minWidth: 0 },
  stepLbl: { fontSize: 12, fontWeight: 700, color: "var(--k-text-3, #9A9086)", marginBottom: 6 },
  stepRow: {
    display: "flex", alignItems: "center", gap: 4,
    background: "rgba(0,0,0,.22)", border: "1px solid var(--k-line, rgba(255,255,255,.09))",
    borderRadius: 14, padding: 4,
  },
  stepBtn: {
    flex: "none", width: 44, height: 44, display: "grid", placeItems: "center",
    borderRadius: 11, border: 0, background: "rgba(255,255,255,.07)",
    color: "inherit", cursor: "pointer",
  },
  stepVal: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums" },
  stepSuf: { fontSize: 12, fontWeight: 700, marginLeft: 2, color: "var(--k-text-3, #9A9086)" },
  registra: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    width: "100%", minHeight: 52, borderRadius: 14, border: 0,
    background: "var(--k-accent, #FFB84D)", color: "var(--k-accent-ink, #241A0E)",
    fontSize: 16, fontWeight: 800, fontFamily: "inherit", cursor: "pointer",
  },
  errore: {
    marginTop: 12, padding: "10px 12px", borderRadius: 12, fontSize: 13.5,
    background: "rgba(220,80,60,.14)", color: "#FFB3A6",
  },
  foot: {
    flex: "none", display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)",
    borderTop: "1px solid var(--k-line, rgba(255,255,255,.09))",
    background: "var(--k-surface-2, rgba(255,255,255,.03))",
  },
  riepilogo: { fontSize: 13, fontWeight: 700, color: "var(--k-text-2, #C9BFB2)", minWidth: 0 },
  finisci: {
    marginLeft: "auto", flex: "none", minHeight: 48, padding: "0 18px", borderRadius: 999,
    border: "1px solid var(--k-line, rgba(255,255,255,.14))", background: "rgba(255,255,255,.07)",
    color: "inherit", fontSize: 15, fontWeight: 800, fontFamily: "inherit", cursor: "pointer",
  },
};
