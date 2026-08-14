"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { PastoAnnotato } from "@/lib/supabase";
import { I } from "@/app/components/v2/icons";
import { Empty } from "@/app/components/v2/Empty";

/* ═════════ COSA HAI MANGIATO — lo storico ═════════
 *
 * Schermata piena e non foglio, per la stessa ragione dello storico degli
 * allenamenti: qui si scorre in giù per andare indietro nel tempo, e un
 * foglio si chiude trascinandolo in giù. Sarebbero due gesti opposti sullo
 * stesso dito.
 *
 * 🚫 NESSUN TOTALE, NESSUNA PERCENTUALE, NESSUNA RIGA CHE VALUTI. Un giorno e
 * cosa c'era dentro. Niente «hai seguito il piano al 70%», niente ✓ verde
 * contro ✗ rosso: «seguito» e «saltato» si scrivono nello stesso modo, perché
 * qui non si dice se hai fatto bene. Vedi la regola 3-decies.
 */

const K2: React.CSSProperties = { background: "transparent", maxWidth: "none", height: "auto" };

type Giorno = { giorno: string; pasti: PastoAnnotato[] };

function dataLunga(iso: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(new Date(iso + "T00:00:00"));
  } catch { return iso; }
}

/** Cosa hai detto di quel pasto. Le tre risposte hanno lo stesso peso. */
function detto(a: PastoAnnotato): string {
  if (a.stato === "seguito") return "l'ho seguito";
  if (a.stato === "saltato") return "l'ho saltato";
  return a.testo || "ho mangiato altro";
}

export default function StoricoPasti({ onClose }: { onClose: () => void }) {
  const [giorni, setGiorni] = useState<Giorno[]>([]);
  const [altri, setAltri] = useState(false);
  const [stato, setStato] = useState<"chiedo" | "pronto">("chiedo");
  const [carico, setCarico] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/cucina/registro?storico=1", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (vivo) { setGiorni(d?.giorni ?? []); setAltri(!!d?.altri); setStato("pronto"); } })
      .catch(() => { if (vivo) setStato("pronto"); });
    return () => { vivo = false; };
  }, []);

  async function ancora() {
    const ultimo = giorni[giorni.length - 1];
    if (!ultimo || carico) return;
    setCarico(true);
    try {
      const r = await fetch(`/api/cucina/registro?storico=1&prima=${ultimo.giorno}`, { credentials: "include" });
      const d = await r.json();
      setGiorni((g) => [...g, ...(d?.giorni ?? [])]);
      setAltri(!!d?.altri);
    } catch { /* resta com'e': il tasto si puo' ripremere */ }
    finally { setCarico(false); }
  }

  const pannello = (
    <div className="k2" style={K2}>
      <div className="full" role="dialog" aria-modal="true" aria-label="Cosa hai mangiato">
        <div className="topbar">
          <button className="x tap" onClick={onClose} aria-label="Indietro" style={{ color: "inherit" }}>
            {I.back({ s: 15 })}
          </button>
          <div className="col">
            <h1>Cosa hai mangiato</h1>
            <div className="status">giorno per giorno, come l&apos;hai scritto tu</div>
          </div>
        </div>

        <div className="fullpad">
          {/* Scheletri mentre arriva, non uno spinner. */}
          {stato === "chiedo" && (
            <div style={{ marginTop: 8 }}>
              {[0, 1, 2].map((i) => (
                <div className="srf" key={i} style={{ marginTop: 12, padding: 12 }}>
                  <span className="sk sk-line" style={{ display: "block", width: "44%" }} />
                  <span className="sk sk-line" style={{ display: "block", width: "80%", height: 10, marginTop: 8 }} />
                  <span className="sk sk-line" style={{ display: "block", width: "62%", height: 10, marginTop: 6 }} />
                </div>
              ))}
            </div>
          )}

          {stato === "pronto" && giorni.length === 0 && (
            <div style={{ marginTop: 16 }}>
              <Empty
                icon={I.pot({ s: 20 })}
                t="Qui ci finisce quello che mangi"
                m="Non hai ancora annotato nessun pasto.<br/>Appena ne segni uno, lo ritrovi qui — e fra una settimana avrai qualcosa da guardare."
              />
            </div>
          )}

          {giorni.map((g) => (
            <div key={g.giorno}>
              <div className="status" style={{ marginTop: 18, marginBottom: 8, textTransform: "capitalize" }}>
                {dataLunga(g.giorno)}
              </div>
              <div className="srf">
                {g.pasti.map((a) => (
                  <div className="row-act" key={a.id} style={{ cursor: "default" }}>
                    {/* L'icona dice se c'era una ricetta dietro, non se hai
                        fatto bene: `pot` quando l'hai cucinata, `cal` sempre
                        altrimenti — anche sui saltati. Nessun segno di merito. */}
                    <span className="ic2">{a.ricettaId ? I.pot({ s: 16 }) : I.cal({ s: 16 })}</span>
                    <span className="in">
                      <span className="t">{a.pasto}</span>
                      <span className="m">{detto(a)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {altri && (
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
