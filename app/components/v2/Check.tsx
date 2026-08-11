import { I } from "./icons";

/* ═════════ la spunta che si disegna ═════════
   Il tratto parte tagliato (stroke-dasharray) e si scrive quando `on` diventa
   vero: sta tutto in .ckc nel foglio. */

export function Check({ on, onClick }: { on?: boolean; onClick?: () => void }) {
  return (
    <span className={"ckc tap" + (on ? " on" : "")} onClick={onClick}>
      {I.drawck()}
    </span>
  );
}

export default Check;
