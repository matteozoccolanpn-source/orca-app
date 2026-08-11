import { Img } from "./Img";

/* ═════════ la testata a foto del foglio ═════════
   `cold` ribalta l'alone dal caldo (ambra) al teal: è la stessa testata,
   non un secondo componente. La maniglia sta qui, sopra la foto. */

export function SheetHero({
  img,
  k,
  h2,
  cold,
}: {
  img: string;
  k: string;
  h2: string;
  cold?: boolean;
}) {
  return (
    <div className={"sheet-hero" + (cold ? " cold" : "")}>
      <span className="grab" />
      <Img src={img} />
      <div className="in">
        <div className="k">
          <i />
          {k}
        </div>
        <h2>{h2}</h2>
      </div>
    </div>
  );
}

export default SheetHero;
