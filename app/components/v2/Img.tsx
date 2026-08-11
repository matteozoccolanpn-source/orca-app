"use client";

import { useEffect, useRef, useState } from "react";

/* ═════════ C2 · foto: arrivano, non appaiono ═════════
   L'<img> nasce a opacità 0 e sfuma quando è caricata. Il colore dominante
   che si vede nell'attesa NON sta qui: sta sul contenitore, come
   `<span className="ph" data-tone="warm">`. Vedi .ph[data-tone] nel foglio. */

/** i quattro fondi d'attesa del mock */
export type Tone = "warm" | "cold" | "green" | "dark";

export function Img({ src, alt }: { src: string; alt?: string }) {
  const [ok, setOk] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  /* Nel mock la pagina è tutta lato browser: quando React attacca `onLoad` la
     foto non è ancora partita, e la dissolvenza si vede sempre. Qui la pagina
     arriva già scritta dal server, e la foto fa in tempo ad arrivare PRIMA che
     React si attacchi: `onLoad` non scatta più e l'immagine resta a opacità 0.
     Quindi al montaggio si guarda se è già arrivata. */
  useEffect(() => {
    if (ref.current?.complete) setOk(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt || ""}
      className={ok ? "ok" : ""}
      onLoad={() => setOk(true)}
      onError={() => setOk(true)}
    />
  );
}

export default Img;
