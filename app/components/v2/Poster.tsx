import type { ReactNode } from "react";
import { I } from "./icons";
import { Img } from "./Img";

/* ═════════ D10 · poster 2:3 e variante quadrata ═════════
   `sq` è la quadrata (podcast). `seen` scurisce la locandina e ci mette la
   spunta: un titolo già visto si riconosce senza leggere. Sotto la foto
   compare il titolo per esteso (`fb2`) finché la foto non è arrivata. */

export function Poster({
  img,
  t,
  m,
  badge,
  sq,
  seen,
  onClick,
}: {
  img: string;
  t: string;
  m?: ReactNode;
  badge?: string;
  sq?: boolean;
  seen?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={"poster" + (sq ? " sq" : "") + " tap" + (seen ? " seen" : "")}
      onClick={onClick}
    >
      <div className="pw">
        <b className="fb2">{t}</b>
        {badge && <span className="bdg">{badge}</span>}
        <Img src={img} />
        {seen && <span className="mk">{I.drawck(null, 12)}</span>}
      </div>
      <span className="t">{t}</span>
      <span className="m">{m}</span>
    </div>
  );
}

export default Poster;
