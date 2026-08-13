"use client";

// Navigazione fluida COERENTE su tutta l'app:
//  - transizione d'ingresso direzionale (su per aprire, sinistra/destra tra le sezioni)
//  - SWIPE orizzontale per passare tra le sezioni della tab-bar (Home/Dieta/Sport/Guarda)
// template.tsx si ri-monta a ogni cambio rotta -> l'animazione riparte da sola.
// Nessun transform che resta a fine animazione -> gli elementi position:fixed restano ok.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// L'ORDINE È QUELLO DELLA BARRA, e deve restarlo: lo scorrimento laterale e i
// tasti in fondo devono portare nello stesso posto, o l'app sembra averne due.
// Dall'11 agosto la seconda voce è la Cucina (la Dieta si apre da dentro), e
// qui era rimasta /salute: si scorreva verso una pagina che nella barra non
// c'è più. Visto aprendo l'app vera, non leggendo il codice.
const TABS = ["/", "/cucina", "/allenamento", "/guarda"];

/* Da dove venivi. Vive fuori dal componente perche' `template.tsx` si RIMONTA
   a ogni cambio rotta: un `useRef` qui dentro si azzererebbe ogni volta, e non
   saprebbe mai da dove arrivi.
   Ma si legge e si scrive SOLO dentro un effetto, cioe' solo sul client e solo
   dopo il render. Prima veniva modificata DURANTE il render, e sul server —
   dove il modulo e' condiviso fra tutte le richieste — voleva dire due cose,
   una fastidiosa e una peggiore: l'avviso di idratazione (la classe calcolata
   sul server non combaciava con quella del client, che parte da null) e il
   difetto vero, cioe' che la direzione dell'animazione la decideva l'ultima
   navigazione di CHIUNQUE avesse aperto l'app. */
let ultimoPath: string | null = null;

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

  /* La classe parte vuota e la decide un effetto, cioe' dopo il render: il
     server e il primo render del client dicono la stessa identica cosa —
     niente — e l'avviso di idratazione non ha piu' motivo di esistere.
     L'animazione parte un fotogramma dopo, che non si vede. */
  const [cls, setCls] = useState("");
  useEffect(() => {
    const da = ultimoPath ? TABS.indexOf(ultimoPath) : -1;
    setCls(da >= 0 && to >= 0 && da !== to ? (to > da ? "page-left" : "page-right") : "page-up");
    ultimoPath = pathname;
  }, [pathname, to]);

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
