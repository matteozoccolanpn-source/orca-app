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
  compatta,
}: {
  /** vuoto = niente foto: resta il fondo del contenitore, non un'immagine rotta */
  img?: string | null;
  tone?: Tone;
  k: ReactNode;
  dot?: Dot;
  t: ReactNode;
  m?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  /* La variante compatta. Serve dove la copertina e' una locandina ORIZZONTALE
     di TMDB, che ha gia' il titolo stampato dentro: messa grande a tutta card
     litigano due tipografie nella stessa immagine. Qui la foto diventa una
     locandina verticale piccola a sinistra, come in «Continua a guardare»,
     e il titolo lo scrive Keiko. Stessi valori del mock: il corpo e' `.wide`,
     il titolo e' quello di `.feature .t`. */
  compatta?: boolean;
}) {
  if (compatta) {
    return (
      <div className="srf wide tap" onClick={onClick} style={{ display: "block", padding: 8 }}>
        <div style={{ display: "flex" }}>
          {/* 13 agosto 2026 · girato il peso. La locandina scende da 92 a 72
              e il titolo sale: qui la cosa da leggere e' il titolo, non
              l'immagine — che per giunta e' una copertina orizzontale col
              titolo gia' stampato dentro, quindi lo ripeteva. */}
          <div className="pw" style={{ width: 72 }}>
            {img && <Img src={img} />}
          </div>
          <div className="in">
            <div className="k">
              {dot && <span className={"dot " + dot} />}
              {k}
            </div>
            {/* Fraunces come `.feature .t` del mock, ma piu' grande: vedi sotto. */}
            <div
              className="t"
              style={{
                fontFamily: "var(--font-fraunces-v2),Fraunces,Georgia,serif",
                /* 24 non e' un numero nuovo: e' la misura di `.hero .t` nel
                   foglio, il gradino sopra i 20 di `.feature .t`. */
                fontSize: 24, fontWeight: 500, letterSpacing: "-.01em",
                lineHeight: 1.15, marginTop: 6,
              }}
            >
              {t}
            </div>
            {m && <div style={{ fontSize: 12, color: "var(--meta)", fontWeight: 500, marginTop: 4, lineHeight: 1.45 }}>{m}</div>}
          </div>
        </div>
        <div style={{ padding: "0 4px 4px" }}>{children}</div>
      </div>
    );
  }

  return (
    <div className="feature tap" onClick={onClick}>
      <div className="ph" data-tone={tone}>
        {img && <Img src={img} />}
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
