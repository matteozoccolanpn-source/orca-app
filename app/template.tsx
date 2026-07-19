"use client";

// Navigazione fluida COERENTE su tutta l'app:
//  - transizione d'ingresso direzionale (su per aprire, sinistra/destra tra le sezioni)
//  - SWIPE orizzontale per passare tra le sezioni della tab-bar (Home/Dieta/Sport/Guarda)
// template.tsx si ri-monta a ogni cambio rotta -> l'animazione riparte da sola.
// Nessun transform che resta a fine animazione -> gli elementi position:fixed restano ok.

import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

const TABS = ["/", "/salute", "/allenamento", "/guarda"];
let lastPath: string | null = null;

// Ignora lo swipe se parte da un contenitore che scorre in orizzontale (caroselli).
function inHScroller(el: HTMLElement | null): boolean {
  let n: HTMLElement | null = el;
  while (n && n !== document.body) {
    const s = getComputedStyle(n);
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 4) return true;
    n = n.parentElement;
  }
  return false;
}

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const start = useRef<{ x: number; y: number; skip: boolean } | null>(null);

  const to = TABS.indexOf(pathname);
  const from = lastPath ? TABS.indexOf(lastPath) : -1;
  let cls = "page-up";
  if (from >= 0 && to >= 0 && from !== to) cls = to > from ? "page-left" : "page-right";
  lastPath = pathname;

  const onTouchStart = (e: React.TouchEvent) => {
    if (to < 0) { start.current = null; return; }
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, skip: inHScroller(e.target as HTMLElement) };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || s.skip || to < 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (dx < 0 && to < TABS.length - 1) router.push(TABS[to + 1]);
      else if (dx > 0 && to > 0) router.push(TABS[to - 1]);
    }
  };

  return (
    <div className={cls} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  );
}
