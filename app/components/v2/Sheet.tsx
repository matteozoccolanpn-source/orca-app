"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* ═════════ foglio dal basso ═════════
   Si chiude in tre modi: toccando fuori (lo scrim), trascinando la maniglia
   verso il basso, oppure con `Esc` da tastiera. Il trascinamento parte solo se
   il foglio è già in cima (scrollTop <= 0), altrimenti si scorre il contenuto.
   Oltre 90px il foglio se ne va da solo. */

/* Un foglio montato FUORI da una pagina V2 (i fogli della Home, per esempio,
   stanno accanto a `.k2`, non dentro) ha bisogno del suo `.k2` addosso, o le
   classi del sistema non lo raggiungono. Ma `.k2` porta anche una colonna
   larga 430px col suo fondo, e quella qui non serve: lo scrim e il foglio sono
   `position:fixed` e non stanno dentro nessuna colonna.
   Questo stile spegne solo quelle tre cose. Le variabili e le classi restano,
   che è il motivo per cui il `.k2` c'è.

     <div className="k2" style={K2_FOGLIO}><Sheet …>…</Sheet></div>

   (È la stessa correzione che SessioneLive tiene per il suo pannello: qui è
   scritta una volta invece che ricopiata in ogni foglio.) */
export const K2_FOGLIO = { background: "transparent", maxWidth: "none", height: "auto" } as const;

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  /* `Esc` chiude. Sul telefono non serve a niente e non dà fastidio; sul
     desktop è il gesto che tutti provano per primo, e finora non succedeva
     nulla. L'ascolto sta sul documento perché il foglio non ha il fuoco: si
     apre senza che nessuno ci abbia cliccato dentro.
     Se ci fossero due fogli aperti uno sopra l'altro, `Esc` li chiuderebbe
     entrambi — oggi non succede mai (i fogli si escludono a vicenda), e
     inventare uno stack per un caso che non esiste sarebbe peggio del bug. */
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let y0: number | null = null;
    let dy = 0;
    const ts = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        y0 = e.touches[0].clientY;
        dy = 0;
      } else y0 = null;
    };
    const tm = (e: TouchEvent) => {
      if (y0 === null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) {
        el.style.transform = "translate(-50%," + dy + "px)";
        el.style.transition = "none";
      }
    };
    const te = () => {
      if (y0 === null) return;
      el.style.transition = "transform .22s ease";
      if (dy > 90) {
        el.style.transform = "translate(-50%,100%)";
        setTimeout(onClose, 170);
      } else el.style.transform = "translate(-50%,0)";
      y0 = null;
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: true });
    el.addEventListener("touchend", te, { passive: true });
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
    };
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" ref={ref}>
        {children}
      </div>
    </>
  );
}

export default Sheet;
