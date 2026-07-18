"use client";

import { useEffect, useRef } from "react";

/* Controllo versione con auto-ricarica.
   `buildId` è lo SHA del deploy che ha servito questa pagina (dal server).
   All'avvio e ogni volta che l'app torna in primo piano, chiede al server la
   versione attuale (/api/version). Se è diversa → è uscito un aggiornamento →
   ricarica UNA volta (protezione anti-loop via sessionStorage).
   Così sul telefono non serve più chiudere/riaprire per vedere le novità. */

export default function VersionGuard({ buildId }: { buildId: string }) {
  const busy = useRef(false);

  useEffect(() => {
    if (buildId === "dev") return; // in locale non serve

    async function check() {
      if (busy.current) return;
      busy.current = true;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const data = (await res.json()) as { v?: string };
        const current = data?.v;
        if (current && current !== buildId) {
          const key = "keiko-reloaded-for";
          if (sessionStorage.getItem(key) !== current) {
            sessionStorage.setItem(key, current); // evita ricariche a ripetizione
            location.reload();
            return;
          }
        }
      } catch {
        /* offline: si riproverà al prossimo rientro */
      } finally {
        busy.current = false;
      }
    }

    check();
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [buildId]);

  return null;
}
