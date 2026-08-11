import type { ReactNode } from "react";
import { I } from "./icons";
import { Img } from "./Img";
import type { Dot } from "./Content";

/** una riga dentro il giorno aperto: [orario, cosa] */
export type DayRow = [ReactNode, ReactNode];

/* ═════════ A7 · card-giorno a mezza foto ═════════
   Chiusa mostra il giorno e l'anteprima; aperta cala l'elenco delle righe.
   `today` è la variante piena (foto al 100%, non al 52%) e va abbinata a
   srf2 al posto di srf: nel mock la classe di superficie la sceglie chi la
   usa, perché dipende dal giorno. */

export function DayCard({
  n,
  d,
  main,
  meta,
  dot,
  img,
  rows,
  today,
  open,
  onToggle,
  nxt,
}: {
  /** il numero del giorno */
  n: ReactNode;
  /** le tre lettere del giorno */
  d: ReactNode;
  /** la riga grande: cosa c'è quel giorno */
  main: ReactNode;
  /** la riga piccola sotto */
  meta: ReactNode;
  dot?: Dot;
  img: string;
  rows: DayRow[];
  today?: boolean;
  open?: boolean;
  onToggle?: () => void;
  /** l'etichetta in coda alla riga, es. «domani» */
  nxt?: string;
}) {
  return (
    <div
      className={
        "day tap " + (today ? "today srf2" : "srf") + (open ? " open" : "")
      }
    >
      <div className="day-bg">
        <Img src={img} />
      </div>
      <div className="day-head" onClick={onToggle}>
        <span className="d">
          <b>{n}</b>
          <span>{d}</span>
        </span>
        <span className="pv">
          <span className="t">{main}</span>
          <span className="m">
            {dot && <span className={"dot " + dot} />}
            {meta}
          </span>
        </span>
        {nxt && <span className="nxt">{nxt}</span>}
        <span className="chevhit">
          {I.chev({ c: "chev", st: open ? { transform: "rotate(180deg)" } : undefined })}
        </span>
      </div>
      <div className="day-list">
        {rows.map((r, j) => (
          <div className="dline" key={j}>
            <span className="k">{r[0]}</span>
            <span className="tx">{r[1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DayCard;
