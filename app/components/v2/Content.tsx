import type { ReactNode } from "react";
import { Img, type Tone } from "./Img";

/** A3 · il colore-categoria vive solo sul pallino */
export type Dot = "viaggi" | "sport" | "dieta" | "guarda" | "eventi" | "teal";

/* ═════════ card contenuto ═════════
   Foto 16:10, titolo su due righe, una riga di meta col pallino di categoria.
   Va dentro una griglia (.g2 / .g3): la larghezza la decide la griglia. */

export function Content({
  img,
  tone,
  t,
  m,
  dot,
  onClick,
}: {
  img: string;
  tone?: Tone;
  t: ReactNode;
  m: ReactNode;
  dot?: Dot;
  onClick?: () => void;
}) {
  return (
    <div className="srf content tap" onClick={onClick}>
      <div className="ph" data-tone={tone}>
        {/* Senza foto NON si monta l'<img>: `src=""` non è «niente foto», è un
            indirizzo relativo che punta alla pagina stessa, e il browser si
            riscarica tutta la pagina per provare a disegnarla. Il fondo di
            `.ph` resta e la card sta in piedi lo stesso.
            È la guardia che `Poster` ha da sempre; qui mancava, e si vedeva
            solo con le ricette senza miniatura — cioè quelle salvate dal web,
            e quelle a cui il link firmato di TikTok è scaduto. */}
        {img && <Img src={img} />}
      </div>
      <span className="t">{t}</span>
      <span className="m">
        {dot && <span className={"dot " + dot} />}
        {m}
      </span>
    </div>
  );
}

export default Content;
