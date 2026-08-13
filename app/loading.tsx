"use client";

import { I } from "@/app/components/v2/icons";
import { Attesa, AttesaTesta, AttesaWide, AttesaSec, AttesaGriglia } from "@/app/components/v2/Attesa";

/* Schermata mostrata mentre una pagina carica i dati.
 *
 * REGOLA: l'orca compare SOLO alla vera apertura dell'app (avvio a freddo o
 * ricarica). Spostandosi TRA le pagine non si rivede: solo fondo scuro, così
 * non lampeggia niente. Come distingue "apertura" da "navigazione": una
 * variabile di modulo ricorda se è già stata mostrata in questa sessione.
 *  - sul server (primo render, apertura) `window` non esiste → orca
 *  - sul client, dalla seconda volta in poi resta true → solo fondo.
 *
 * IL VESTITO È `.k2 .boot` del sistema V2. Prima qui c'era lo splash della v1:
 * la scritta «keiko» con l'ambra, che è l'accento di due redesign fa, e tre
 * pallini che pulsavano — un finto avanzamento, perché una percentuale non la
 * conosciamo. Adesso è quello che il foglio ha già: fondo `--bg`, l'orca in
 * teal che respira. Non uno spinner, non un logo fermo.
 *
 * SPARISCE QUANDO ARRIVANO I DATI, NON A TEMPO — ed è il motivo per cui
 * `animation:none` spegne il `bootout` che la classe porta con sé: quello è un
 * timer da 0,45s, e se i dati tardano lascia uno schermo vuoto che sembra
 * un'app rotta. Qui a toglierla è Next, che smonta questo componente nel
 * momento esatto in cui la pagina vera è pronta.
 * La dissolvenza è in ENTRATA e non in uscita: da `loading.tsx` non si può
 * sfumare l'uscita senza tenere il velo vivo oltre i dati, cioè senza
 * ritardare l'app per un effetto. In entrata invece serve davvero — un
 * caricamento veloce non fa lampeggiare l'orca per un istante, perché non fa
 * in tempo a diventare visibile. */

let vistaInQuestaSessione = false;

export default function Loading() {
  const aperturaAFreddo = typeof window === "undefined" || !vistaInQuestaSessione;
  if (typeof window !== "undefined") vistaInQuestaSessione = true;

  /* Navigazione verso la Home: lo SCHELETRO della Home, non un velo scuro.
     Questo file fa due mestieri — e' l'attesa di `/` ed e' il ripiego di ogni
     rotta che non ha il suo `loading.tsx` — e i due si distinguono qui: la
     prima apertura dell'app mostra l'orca, tutto il resto mostra la forma di
     quello che sta arrivando.
     Il velo scuro di prima non diceva dove stavi andando, ed era esattamente
     il difetto del punto 1: uguale ovunque. */
  if (!aperturaAFreddo) {
    return (
      <Attesa>
        <AttesaTesta />
        <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="sk" style={{ flex: 1, height: 42, borderRadius: 999 }} />
          ))}
        </div>
        <AttesaWide />
        <AttesaSec />
        <AttesaGriglia n={4} rapporto="16 / 10" />
      </Attesa>
    );
  }

  return (
    <div className="k2">
      <style>{`@keyframes bootin{from{opacity:0}to{opacity:1}}`}</style>
      <div className="boot" style={{ animation: "bootin .22s ease .12s both" }} role="status" aria-label="Sto aprendo Keiko">
        <span className="orca">{I.orca(52)}</span>
      </div>
    </div>
  );
}
