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
  const start = useRef<{ x: number; y: number; skip: boolean; t: number } | null>(null);

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

  /* ── LO SCORRIMENTO CONTINUO ──
     Prima non succedeva niente mentre trascinavi: la pagina stava ferma e il
     cambio partiva quando staccavi il dito. Non stavi spostando una cosa,
     stavi dando un comando — ed e' per questo che sembrava meccanico.
     Adesso la pagina segue il dito, e quando stacchi decidono DUE cose. */

  // Quanto e' spostata adesso, e se il dito e' ancora giu'.
  const [dx, setDx] = useState(0);
  const [trascino, setTrascino] = useState(false);
  const [esco, setEsco] = useState(false);
  /* Su quale asse hai deciso di muoverti. Si sceglie una volta sola, dopo i
     primi 8px: senza, un dito che scende storto farebbe sobbalzare la pagina
     di lato a ogni scroll. */
  const asse = useRef<null | "x" | "y">(null);

  /* Le due rotte accanto, chieste in anticipo: quando il gesto arriva in fondo
     la pagina nuova e' gia' pronta e non si vede l'attesa in mezzo. Il costo e'
     una richiesta che Next tiene in cache, non un montaggio. */
  useEffect(() => {
    if (to < 0) return;
    for (const i of [to - 1, to + 1]) if (i >= 0 && i < TABS.length) router.prefetch(TABS[i]);
  }, [to, router]);

  const puoiAndare = (d: number) => (d < 0 ? to < TABS.length - 1 : to > 0);

  const onTouchStart = (e: React.TouchEvent) => {
    if (to < 0 || esco) { start.current = null; return; }
    const t = e.touches[0];
    asse.current = null;
    start.current = { x: t.clientX, y: t.clientY, skip: inHScroller(e.target as HTMLElement), t: Date.now() };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s || s.skip || to < 0) return;
    const t = e.touches[0];
    const ox = t.clientX - s.x, oy = t.clientY - s.y;

    if (asse.current === null) {
      if (Math.abs(ox) < 8 && Math.abs(oy) < 8) return;      // troppo presto per dire
      asse.current = Math.abs(ox) > Math.abs(oy) * 1.6 ? "x" : "y";
      // 1.6 e' lo stesso rapporto della soglia di prima: il gesto che veniva
      // accettato allora e' lo stesso che adesso muove la pagina.
    }
    if (asse.current !== "x") return;

    /* L'ATTRITO AI BORDI. Se di la' non c'e' niente la pagina resiste invece
       di scorrere a vuoto: si muove di un quarto, e il dito lo sente. E' la
       differenza fra «non si puo'» e «non ha funzionato». */
    setDx(puoiAndare(ox) ? ox : ox * 0.25);
    setTrascino(true);
  };

  const finisci = () => { setTrascino(false); setDx(0); asse.current = null; start.current = null; };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s || s.skip || to < 0 || asse.current !== "x") { finisci(); return; }
    const t = e.changedTouches[0];
    const ox = t.clientX - s.x;
    const durata = Math.max(1, Date.now() - s.t);
    const velocita = Math.abs(ox) / durata;          // px al millisecondo

    /* DUE COSE, NON UNA. La distanza come prima — 70px — oppure la VELOCITA':
       un colpetto rapido e corto basta, perche' e' cosi' che si scorre col
       pollice. 0.45 px/ms sono ~27px in un fotogramma da 60Hz: un movimento
       netto, non un tremolio. I 24px minimi servono a non far partire il
       cambio su uno sfioramento. */
    const abbastanza = Math.abs(ox) > 70 || (velocita > 0.45 && Math.abs(ox) > 24);

    if (abbastanza && puoiAndare(ox)) {
      /* Esce dalla parte in cui stavi tirando, poi si naviga. La pagina nuova
         si monta con la sua entrata (page-left / page-right), quindi il
         movimento non si interrompe: continua di la'. */
      setTrascino(false);
      setEsco(true);
      setDx(ox < 0 ? -window.innerWidth : window.innerWidth);
      const dove = TABS[ox < 0 ? to + 1 : to - 1];
      setTimeout(() => router.push(dove), 150);
      start.current = null; asse.current = null;
      return;
    }
    // Non ce l'ha fatta: torna con una molla, non con un salto.
    finisci();
  };

  return (
    <div
      className={cls}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={finisci}
      style={{
        transform: dx ? `translateX(${dx}px)` : undefined,
        /* LA BARRA NON SI TRASCINA CON LA PAGINA.
           Un `transform` rende relativi a se' tutti i `position:fixed` che ha
           dentro, e la barra in fondo vive dentro le pagine: senza questa
           variabile scivolava via col contenuto (misurato: `left` da 0 a
           -100 durante il trascinamento). La barra la rilegge e si sposta
           all'incontrario, cosi' resta dov'e' mentre la pagina scorre sotto.
           E' la differenza fra «sto spostando una pagina» e «sto spostando
           l'app». */
        ["--scorrimento" as string]: `${dx}px`,
        /* Sotto il dito nessuna transizione: la pagina sta dove sta il dito.
           Al rientro una curva che sfora e rientra — la molla. All'uscita una
           curva che accelera, perche' sta andando via. */
        transition: trascino ? "none" : esco ? "transform .15s cubic-bezier(.4,0,1,1)" : "transform .34s cubic-bezier(.22,1.25,.36,1)",
        /* Il verticale resta del browser: noi prendiamo solo l'orizzontale. */
        touchAction: "pan-y",
      }}
    >
      {children}
    </div>
  );
}
