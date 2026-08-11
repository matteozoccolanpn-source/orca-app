import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { I } from "./icons";
import { Img } from "./Img";

/* ═════════ D10 · poster 2:3 e variante quadrata ═════════
   `sq` è la quadrata (podcast). `seen` scurisce la locandina e ci mette la
   spunta: un titolo già visto si riconosce senza leggere. Sotto la foto
   compare il titolo per esteso (`fb2`) finché la foto non è arrivata. */

/** Il tocco lungo: dove serve (Guarda) la locandina apre un menu tenendola
    premuta, e il movimento del dito annulla. Sono gli stessi eventi del DOM,
    passati da fuori: qui dentro non c'è nessuna decisione. */
export type PressProps = {
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerLeave?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onContextMenu?: (e: ReactMouseEvent<HTMLDivElement>) => void;
};

export function Poster({
  img,
  t,
  m,
  badge,
  sq,
  seen,
  onClick,
  ariaLabel,
  press,
}: {
  /** vuoto = niente foto: resta il titolo grande dietro, che è il ripiego */
  img?: string | null;
  t: string;
  m?: ReactNode;
  badge?: string;
  sq?: boolean;
  seen?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  press?: PressProps;
}) {
  return (
    <div
      className={"poster" + (sq ? " sq" : "") + " tap" + (seen ? " seen" : "")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      {...press}
    >
      <div className="pw">
        <b className="fb2">{t}</b>
        {badge && <span className="bdg">{badge}</span>}
        {img && <Img src={img} />}
        {seen && <span className="mk">{I.drawck(null, 12)}</span>}
      </div>
      <span className="t">{t}</span>
      <span className="m">{m}</span>
    </div>
  );
}

export default Poster;
