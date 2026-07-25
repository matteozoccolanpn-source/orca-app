"use client";
import { useRef, useState } from "react";

/* Guscio condiviso dei bottom sheet: overlay, pannello, grabber VERO (trascinabile),
   chiusura per swipe-giù. Il contenuto lo passa il chiamante: nessuno sheet cambia
   comportamento, cambia solo il guscio.

   - onClose: chiusura (via tap-overlay, ✕ del contenuto, o swipe-giù). Additivo:
     i modi di chiudere che c'erano prima restano tutti.
   - grabber: mostra la barretta di default in cima. Chi ha già un grabber suo
     (EventSheet sopra l'immagine, DaySheet nell'header sticky) passa false e tiene
     il proprio: il gesto funziona lo stesso, parte dal pannello. */
export default function SheetShell({
  onClose,
  children,
  maxHeight = "92vh",
  zIndex = 91,
  grabber = true,
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  zIndex?: number;
  grabber?: boolean;
}) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const panel = useRef<HTMLDivElement | null>(null);

  // Il gesto parte SOLO se il pannello è già in cima al suo scroll:
  // altrimenti lo swipe-giù dentro un contenuto lungo chiuderebbe lo sheet
  // invece di scrollarlo.
  const onTouchStart = (e: React.TouchEvent) => {
    if ((panel.current?.scrollTop ?? 0) > 0) return;
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const d = e.touches[0].clientY - startY.current;
    setDy(d > 0 ? d : 0); // solo verso il basso, niente elastico in su
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (dy > 110) onClose(); // soglia: ~110px = gesto intenzionale
    setDy(0);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        ref={panel}
        className="ds k-sheet-in"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight, overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 22px)",
          transform: dy ? `translateY(${dy}px)` : undefined,
          transition: dragging ? "none" : "transform .22s cubic-bezier(.22,.61,.36,1)",
          touchAction: "pan-y",
        }}
      >
        {grabber && (
          /* grabber VERO: area di presa 44px, barretta 36×4 come oggi */
          <div style={{ height: 22, display: "grid", placeItems: "center", cursor: "grab" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)" }} />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
