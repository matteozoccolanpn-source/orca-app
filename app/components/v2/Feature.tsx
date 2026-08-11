import type { ReactNode } from "react";
import { Img, type Tone } from "./Img";
import type { Dot } from "./Content";

/* ═════════ la card grande, quella con la foto sopra ═════════
   Foto 16:9, poi corpo: riga di categoria, titolo, una riga di trama.
   Quello che viene dopo (il «perché», i due tasti) cambia da sezione a
   sezione, e arriva come children. */

export function Feature({
  img,
  tone,
  k,
  dot,
  t,
  m,
  children,
  onClick,
}: {
  img: string;
  tone?: Tone;
  k: ReactNode;
  dot?: Dot;
  t: ReactNode;
  m?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="feature tap" onClick={onClick}>
      <div className="ph" data-tone={tone}>
        <Img src={img} />
      </div>
      <div className="fbody">
        <div className="k">
          {dot && <span className={"dot " + dot} />}
          {k}
        </div>
        <div className="t">{t}</div>
        {m && <div className="m">{m}</div>}
        {children}
      </div>
    </div>
  );
}

export default Feature;
