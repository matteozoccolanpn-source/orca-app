"use client";

import { useState } from "react";
import { I } from "./icons";

/* ═════════ D7 · ogni consiglio è spiegabile ═════════
   Due pollici e una «i». La «i» apre il perché: una riga sola, in prosa, che
   dice da dove viene il consiglio. Gli eventi si fermano qui (stopPropagation):
   il blocco sta quasi sempre dentro una card che si apre al tocco. */

export function Feedback({ perche, onNo }: { perche: string; onNo?: () => void }) {
  const [v, setV] = useState<"up" | "dn" | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <span className="fb">
        <span
          className={v === "up" ? "on" : ""}
          onClick={(e) => {
            e.stopPropagation();
            setV(v === "up" ? null : "up");
          }}
        >
          {I.thumbUp({ s: 14 })}
        </span>
        <span
          className={v === "dn" ? "on" : ""}
          onClick={(e) => {
            e.stopPropagation();
            setV(v === "dn" ? null : "dn");
            if (onNo) onNo();
          }}
        >
          {I.thumbDn({ s: 14 })}
        </span>
        <span
          className={open ? "on" : ""}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          {I.info({ s: 14 })}
        </span>
      </span>
      {open && (
        <div className="perche" onClick={(e) => e.stopPropagation()}>
          {perche} · <span style={{ color: "var(--teal-soft)" }}>non dirmelo più</span>
        </div>
      )}
    </>
  );
}

export default Feedback;
