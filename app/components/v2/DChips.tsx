import type { ReactNode } from "react";

/** una riga di chip-dato: [etichetta, valore] */
export type DChipRow = [ReactNode, ReactNode];

/* ═════════ chip-dato ═════════
   Non si toccano: mostrano un dato, non filtrano niente. I chip che filtrano
   sono un altro componente (Chip). */

export function DChips({ rows }: { rows: DChipRow[] }) {
  return (
    <span className="dchips">
      {rows.map(([l, v], i) => (
        <span className="dchip" key={i}>
          <b>{l}</b>
          {v}
        </span>
      ))}
    </span>
  );
}

export default DChips;
