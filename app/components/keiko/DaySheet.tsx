"use client";

import { useRef, useState } from "react";
import type { LiveHome } from "./keikoLive";
import { Sheet, K2_FOGLIO } from "@/app/components/v2/Sheet";
import { Check } from "@/app/components/v2/Check";
import { Empty } from "@/app/components/v2/Empty";
import { I } from "@/app/components/v2/icons";

/* Pannello del giorno, sul sistema V2. Mostra eventi + promemoria (to-do) del
   giorno. Le azioni sui to-do (spunta / stella / elimina / aggiungi) le passa
   la Home (che possiede il router per ricaricare i dati veri). In anteprima
   pubblica (demo) sono inerti/nascoste: niente tasti morti. */

type DayData = LiveHome["days"][string] | null;

const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const LEADS = [15, 30, 60, 120]; // minuti selezionabili per l'anticipo
function fmtLead(m: number) { return m < 60 ? `${m}m` : `${m / 60}h`; }
function nextLead(m: number) { const i = LEADS.indexOf(m); return i < 0 ? 30 : LEADS[(i + 1) % LEADS.length]; }

/* Il tasto piccolo di una riga: 44 di presa anche quando si vede meno.
   Prima erano ~20px e si sbagliava bersaglio. */
const PRESA: React.CSSProperties = {
  width: 44, height: 44, flex: "none", display: "grid", placeItems: "center",
  background: "none", border: 0, cursor: "pointer",
};

export default function DaySheet({
  title, day, demo = false, onClose, onToggle, onStar, onDelete, onAdd, onSetLead, onSetDouble,
  onOpenEvent, canOpenEvent,
}: {
  title: string;
  day: DayData;
  demo?: boolean;
  onClose: () => void;
  onToggle: (id: string, done: boolean) => void;
  onStar: (id: string, star: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
  onSetLead: (id: string, lead: number) => void;
  onSetDouble: (id: string, double: boolean) => void;
  /* Apre la card dell'evento (la Home ha l'oggetto completo, qui c'è solo l'id). */
  onOpenEvent?: (id: string) => void;
  /* Vero se quell'evento è apribile (la Home sa se ce l'ha fra i suoi dati).
     Se è falso la riga resta muta invece di fingere un tap che non fa niente. */
  canOpenEvent?: (id: string) => boolean;
}) {
  const [newText, setNewText] = useState("");
  const events = day?.events ?? [];
  const todos = day?.todos ?? [];
  const empty = events.length === 0 && todos.length === 0;

  // Contatori calcolati da ciò che sto DAVVERO mostrando, non da `counts` del
  // server: così quando spunti un promemoria il "N da fare" cala subito.
  const nEventi = events.length;
  const nDaFare = todos.filter((t) => !t.done).length;
  const nFatti = todos.filter((t) => t.done).length;

  const addingRef = useRef(false);
  const add = () => {
    const t = newText.trim();
    if (!t || addingRef.current) return; // anti doppio-tap → niente promemoria doppioni
    addingRef.current = true;
    onAdd(t);
    setNewText("");
    setTimeout(() => { addingRef.current = false; }, 1500);
  };

  return (
    <div className="k2" style={K2_FOGLIO}>
      <Sheet onClose={onClose}>
        <div className="plain-head">
          <h2 style={{ textTransform: "capitalize" }}>{title}</h2>
          {day && (
            <div className="status">
              {pl(nEventi, "evento", "eventi")} · {nDaFare} da fare{nFatti ? ` · ${pl(nFatti, "fatto", "fatti")}` : ""}
            </div>
          )}
        </div>

        <div className="pad">
          {/* Uno stato vuoto è una frase, non un'icona con tre parole sotto.
              Prima diceva «Niente in programma 🌿»: l'emoji se ne va con tutte
              le altre decorative del sistema V2. */}
          {empty && (
            <div style={{ marginTop: 16 }}>
              <Empty
                icon={I.cal({ s: 20 })}
                t="Questo giorno è libero"
                m="Nessun evento e nessun promemoria.<br/>Se ti viene in mente qualcosa, scrivilo qui sotto."
              />
            </div>
          )}

          {/* ── gli eventi: righe-azione del sistema ── */}
          {events.length > 0 && (
            <>
              <div className="status" style={{ marginTop: 16, marginBottom: 8 }}>Eventi</div>
              <div className="srf">
                {events.map((e) => {
                  const apribile = !demo && !!onOpenEvent && (canOpenEvent ? canOpenEvent(e.id) : true);
                  return (
                    <div
                      key={e.id}
                      className={"row-act" + (apribile ? " tap" : "")}
                      onClick={apribile ? () => onOpenEvent?.(e.id) : undefined}
                      role={apribile ? "button" : undefined}
                      style={apribile ? undefined : { cursor: "default" }}
                    >
                      <span className="ic2">{I.cal({ s: 16 })}</span>
                      <span className="in">
                        <span className="t">{e.title}</span>
                        <span className="m">{e.time}</span>
                      </span>
                      {/* La chevron compare solo se la riga si apre davvero:
                          una freccia su una riga muta è una promessa falsa. */}
                      {apribile && I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── i promemoria ── */}
          {!empty && <div className="status" style={{ marginTop: 18, marginBottom: 8 }}>Promemoria</div>}

          {todos.length > 0 && (
            <div className="srf list" style={{ marginTop: 0 }}>
              {todos.map((t) => (
                <div key={t.id} className={"item" + (t.done ? " done" : "")}>
                  <div className="item-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                    <Check on={t.done} onClick={() => !demo && onToggle(t.id, !t.done)} />
                    <span className="in">
                      <span className="tx" style={{ marginTop: 0 }}>{t.text}</span>
                      {t.time && <span className="k" style={{ marginTop: 3 }}>{t.time}</span>}
                    </span>
                    {!demo && (
                      <>
                        <button
                          onClick={() => onStar(t.id, !t.star)}
                          aria-label={t.star ? "Togli la stella" : "Metti la stella"}
                          aria-pressed={t.star}
                          className="tap"
                          style={{ ...PRESA, color: t.star ? "var(--teal)" : "var(--meta)" }}
                        >
                          {/* Stella piena quando è messa: lo stile in linea
                              vince sull'attributo `fill="none"` dell'<svg>.
                              Il colore da solo non basterebbe — a riposo la
                              stella è grigia, e grigio contro teal si legge
                              come «spenta/accesa» solo se sai già che è un
                              interruttore. */}
                          {I.star({ s: 16, st: t.star ? { fill: "currentColor" } : undefined })}
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          aria-label={`Elimina ${t.text}`}
                          className="tap"
                          style={{ ...PRESA, color: "var(--meta)" }}
                        >
                          {I.close({ s: 15 })}
                        </button>
                      </>
                    )}
                  </div>

                  {/* L'anticipo dell'avviso: solo dove c'è un'ora a cui puntare. */}
                  {!demo && t.time && (
                    <div style={{ display: "flex", gap: 8, padding: "0 12px 10px 46px" }}>
                      <button
                        className="chip tap"
                        onClick={() => onSetLead(t.id, nextLead(typeof t.lead === "number" ? t.lead : 30))}
                        title="Quanto prima avvisarti"
                      >
                        {fmtLead(typeof t.lead === "number" ? t.lead : 30)} prima
                      </button>
                      {/* «×2» non diceva niente: c'è scritto cosa fa. */}
                      <button
                        className={"chip tap" + (t.double ? " on" : "")}
                        onClick={() => onSetDouble(t.id, !t.double)}
                        title="Avvisami due volte"
                      >
                        2 avvisi
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {todos.length === 0 && !empty && (
            <p className="status" style={{ marginTop: 0 }}>Nessun promemoria per questo giorno.</p>
          )}

          {/* ── aggiungine uno ── */}
          {!demo && (
            <div className="ask" style={{ marginTop: 12, cursor: "auto" }}>
              <input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                placeholder="Cosa non devi dimenticare"
                aria-label="Nuovo promemoria"
                /* 16px: sotto i 16 iOS ingrandisce la pagina al primo tocco e
                   non torna più indietro. */
                style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", padding: 0 }}
              />
              <button
                className="go tap"
                onClick={add}
                disabled={!newText.trim()}
                aria-label="Aggiungi il promemoria"
                style={{ border: 0, cursor: "pointer", opacity: newText.trim() ? 1 : 0.45 }}
              >
                {I.plus({ s: 14 })}
              </button>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
}
