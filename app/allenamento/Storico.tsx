"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { WorkoutSession, WorkoutWeek } from "@/lib/supabase";
import { I } from "@/app/components/v2/icons";
import { Empty } from "@/app/components/v2/Empty";
import { riassuntoSerie } from "@/lib/discipline";

/* ═════════ «A CHE PUNTO SEI» — la schermata ═════════
 *
 * Era una riga dentro l'Allenamento. Adesso e' una schermata sua, che si apre
 * da li' e si chiude tornando indietro.
 *
 * SCHERMATA PIENA, non foglio, e la ragione e' il gesto: un foglio si chiude
 * trascinandolo in giu', e qui si scorre in giu' per andare indietro nel
 * tempo. Sarebbero due gesti opposti sullo stesso dito — arrivi in fondo alla
 * settimana scorsa, tiri ancora per vedere quella prima, e il foglio si
 * chiude. Con la schermata piena lo scorrimento e' solo scorrimento, e per
 * uscire c'e' la freccia. (Stessa scelta di SessioneLive, stesso motivo.)
 *
 * COSA C'E' DENTRO: la costanza, non i numeri. Quante volte e quando, non
 * quanto hai corso: un grafico con tre punti mente, e le discipline sono in
 * produzione da due giorni. Il giudizio lo fa Matteo — qui non si commenta.
 */

const K2: React.CSSProperties = { background: "transparent", maxWidth: "none", height: "auto" };
const WD = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

function dataLunga(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(new Date(iso + "T00:00:00"));
  } catch { return iso; }
}
/** Il lunedì della settimana di una data. Serve a raggruppare le sedute. */
function lunediDi(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
function etichettaSettimana(lun: string, lunCorrente: string): string {
  if (lun === lunCorrente) return "questa settimana";
  const a = new Date(lun + "T00:00:00"), b = new Date(lunCorrente + "T00:00:00");
  const q = Math.round((b.getTime() - a.getTime()) / (7 * 86400000));
  return q === 1 ? "la settimana scorsa" : `${q} settimane fa`;
}

export default function Storico({
  week, trainedDays, streakDiFila, pagina, chiediPagina, onClose,
}: {
  /** La scheda: serve a sapere quali giorni erano PREVISTI. */
  week: WorkoutWeek | null;
  /** I giorni in cui ti sei allenato (ISO). */
  trainedDays: string[];
  /** Da quante settimane di fila ti alleni almeno una volta. */
  streakDiFila: number;
  /** La prima pagina, gia' pronta dal server: la schermata si apre piena. */
  pagina: { sedute: WorkoutSession[]; altre: boolean };
  /** Le pagine successive, otto alla volta. */
  chiediPagina: (prima: string) => Promise<{ sedute: WorkoutSession[]; altre: boolean }>;
  onClose: () => void;
}) {
  const [sedute, setSedute] = useState<WorkoutSession[]>(pagina.sedute);
  const [altre, setAltre] = useState(pagina.altre);
  const [carico, setCarico] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function ancora() {
    const ultima = sedute[sedute.length - 1];
    if (!ultima || carico) return;
    setCarico(true);
    try {
      const p = await chiediPagina(ultima.day);
      setSedute((s) => [...s, ...p.sedute]);
      setAltre(p.altre);
    } catch { /* resta com'e': il tasto si puo' ripremere */ }
    finally { setCarico(false); }
  }

  /* ── IL CALENDARIO DELLA SETTIMANA · tre stati ──
     fatto · previsto e non fatto · niente in programma.
     Il terzo NON e' un fallimento e non deve sembrarlo: e' un giorno in cui
     non c'era niente da fare, e si disegna spento, non rosso.
     ⚠️ I giorni in viaggio non sono assenze, ma il dato dei viaggi da qui non
     e' raggiungibile: restano indistinguibili finche' i Viaggi non avranno la
     loro ondata (docs/VIAGGI-FUNZIONI.md, punto 10). Non si inventa. */
  const oggi = new Date();
  const lunCorrente = lunediDi(oggi.toISOString().slice(0, 10));
  const fatti = new Set(trainedDays);

  const giorniSettimana = (lunedi: string) =>
    WD.map((k, i) => {
      const d = new Date(lunedi + "T00:00:00");
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const previsto = (week?.[k]?.esercizi?.length ?? 0) > 0;
      return { k, iso, fatto: fatti.has(iso), previsto, futuro: iso > oggi.toISOString().slice(0, 10) };
    });

  // Le sedute raggruppate per settimana, nell'ordine in cui sono arrivate.
  const perSettimana: { lun: string; sedute: WorkoutSession[] }[] = [];
  for (const s of sedute) {
    const lun = lunediDi(s.day);
    const ultimo = perSettimana[perSettimana.length - 1];
    if (ultimo && ultimo.lun === lun) ultimo.sedute.push(s);
    else perSettimana.push({ lun, sedute: [s] });
  }

  const pannello = (
    <div className="k2" style={K2}>
      <div className="full" role="dialog" aria-modal="true" aria-label="A che punto sei">
        <div className="topbar">
          <button className="x tap" onClick={onClose} aria-label="Indietro" style={{ color: "inherit" }}>
            {I.back({ s: 15 })}
          </button>
          <div className="col">
            <h1>A che punto sei</h1>
            <div className="status">
              {/* Un FATTO, non un premio: niente coppe, niente «non spezzare
                  la catena». Se e' zero non si scrive niente. */}
              {streakDiFila > 0
                ? `${streakDiFila} settiman${streakDiFila === 1 ? "a" : "e"} di fila`
                : "quello che hai fatto, e quando"}
            </div>
          </div>
        </div>

        <div className="fullpad">
          {/* ── questa settimana ── */}
          <div className="status" style={{ marginTop: 4, marginBottom: 8 }}>Questa settimana</div>
          <div className="srf" style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {giorniSettimana(lunCorrente).map((g) => (
                <div key={g.k} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: "var(--meta)" }}>{g.k}</div>
                  <div
                    aria-label={`${g.k}: ${g.fatto ? "fatto" : g.previsto ? "previsto" : "niente in programma"}`}
                    style={{
                      marginTop: 5, height: 34, borderRadius: "var(--r-in)",
                      display: "grid", placeItems: "center",
                      background: g.fatto ? "var(--teal)" : g.previsto ? "var(--lv2)" : "transparent",
                      border: g.fatto ? "none" : g.previsto ? "1px solid rgba(61,165,196,.35)" : "1px solid var(--line)",
                      color: g.fatto ? "var(--on-teal)" : "var(--meta)",
                      opacity: g.futuro && !g.fatto ? 0.55 : 1,
                    }}
                  >
                    {g.fatto ? I.tick({ s: 14 }) : g.previsto ? <span style={{ fontSize: 11, fontWeight: 600 }}>·</span> : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="status" style={{ marginTop: 10 }}>
              Pieno se ti sei allenato, contornato se era previsto, spento se non c&apos;era niente in programma.
            </p>
          </div>

          {/* ── le sedute, indietro nel tempo ── */}
          {sedute.length === 0 ? (
            <div style={{ marginTop: 18 }}>
              <Empty
                icon={I.hist({ s: 20 })}
                t="Qui ci finisce quello che fai"
                m="Non hai ancora chiuso nessun allenamento.<br/>Appena ne registri uno, lo ritrovi qui — e la settimana dopo avrai qualcosa da guardare."
              />
            </div>
          ) : (
            perSettimana.map(({ lun, sedute: gruppo }) => (
              <div key={lun}>
                <div className="status" style={{ marginTop: 18, marginBottom: 8 }}>
                  {etichettaSettimana(lun, lunCorrente)}
                </div>
                <div className="srf">
                  {gruppo.map((sd) => {
                    const nEx = new Set(sd.sets.map((x) => x.esercizio)).size;
                    return (
                      <div className="row-act" key={sd.id} style={{ cursor: "default" }}>
                        <span className="ic2">{sd.origine === "libera" ? I.walk({ s: 16 }) : I.dumb({ s: 16 })}</span>
                        <span className="in">
                          <span className="t">{sd.titolo?.trim() || "Allenamento"}</span>
                          <span className="m">
                            {dataLunga(sd.day)}
                            {nEx > 0 ? ` · ${nEx} esercizi${nEx === 1 ? "o" : ""}` : " · nessuna serie segnata"}
                            {/* «com'e' andata», accanto alla seduta. Registrata
                                e basta: Keiko non la commenta. */}
                            {sd.sensazione ? ` · ${sd.sensazione}` : ""}
                          </span>
                          {/* Le sedute libere si distinguono da quelle della
                              scheda: sono fatti tuoi, non del piano. */}
                          {sd.origine === "libera" && (
                            <span className="m" style={{ color: "var(--teal-soft)" }}>fuori scheda</span>
                          )}
                          {sd.sets.length > 0 && (
                            <span className="m">{riassuntoSerie(sd.sets)}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {altre && (
            <button className="btn2 wide tap" style={{ marginTop: 14 }} onClick={ancora} disabled={carico}>
              {carico ? "Carico…" : "Vedi più indietro"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(pannello, document.body);
}
