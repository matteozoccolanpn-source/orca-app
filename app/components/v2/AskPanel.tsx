"use client";

import type { ReactNode } from "react";
import { I } from "./icons";
import { Feedback } from "./Feedback";

/* ═════════ D1 · il pannello ═════════
   Gli stati sono cinque: fermo → sta pensando → anteprima con diff → fatto →
   tetto raggiunto. Il mock ne disegna tre (`think`, `preview`, `capped`);
   «fermo» è il pannello non montato, e «fatto» nel mock non ha un disegno:
   alla conferma il pannello si chiude e parla il toast. Finché Matteo non
   dice come si vede «fatto», qui non si inventa: `done` non disegna niente.

   Il diff arriva come prop. Qui dentro non si parla con la rete: chi monta il
   pannello decide quando lo stato cambia. */

export type AskState = "idle" | "think" | "preview" | "done" | "capped";

/** una riga del diff: quello che esce (`out`) e quello che entra (`in`) */
export type DiffLine = { kind: "out" | "in"; text: ReactNode };

export function AskPanel({
  q,
  state,
  diff,
  why,
  perche,
  onClose,
  onDone,
}: {
  /** la domanda, ripetuta in testa al pannello */
  q: ReactNode;
  state: AskState;
  diff?: DiffLine[];
  /** la riga che spiega cosa cambia, accanto alla spunta */
  why?: ReactNode;
  /** il testo dietro la «i»: perché te lo propongo */
  perche?: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  if (state === "idle" || state === "done") return null;

  return (
    <div className="srf2 panel glow">
      <div className="ph-head">
        <span style={{ color: "var(--teal)", display: "flex" }}>{I.orca(18)}</span>
        <span className="ph-q">{q}</span>
        <span className="chevhit tap" onClick={onClose}>
          {I.close({ s: 15 })}
        </span>
      </div>

      {state === "think" && (
        <div className="think">
          <span className="orb" />
          <span className="tx">ci sto pensando…</span>
        </div>
      )}

      {state === "capped" && (
        <div className="bd">
          <div className="hint warm" style={{ marginTop: 0 }}>
            {I.info()}
            <p>
              Per oggi mi fermo qui 🌙 — hai usato tutte le richieste di oggi.{" "}
              <b>Domani si riparte.</b>
            </p>
          </div>
          <div className="pactions">
            <button className="btn2 wide tap" onClick={onClose}>
              Va bene
            </button>
          </div>
        </div>
      )}

      {state === "preview" && (
        <div className="bd">
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--meta)",
              fontWeight: 500,
              marginBottom: "10px",
            }}
          >
            Ecco cosa cambierei. Niente è ancora salvato.
          </div>
          <div className="diff">
            {(diff || []).map((d, i) => (
              <div className="dl" key={i}>
                <span className={"mark " + d.kind} />
                <span className={d.kind === "out" ? "was" : "now"}>{d.text}</span>
              </div>
            ))}
          </div>
          {why && (
            <div className="why">
              {I.tick({ s: 13 })}
              <span style={{ flex: 1 }}>{why}</span>
              {perche && <Feedback perche={perche} />}
            </div>
          )}
          <div className="pactions">
            <button className="cta tap" onClick={onDone}>
              Conferma
            </button>
            <button className="btn2 tap" onClick={onClose}>
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AskPanel;
