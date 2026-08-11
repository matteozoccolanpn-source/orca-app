"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* ═════════ foglio dal basso ═════════
   Si chiude in due modi: toccando fuori (lo scrim) oppure trascinando la
   maniglia verso il basso. Il trascinamento parte solo se il foglio è già in
   cima (scrollTop <= 0), altrimenti si scorre il contenuto. Oltre 90px il
   foglio se ne va da solo. */

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

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
