"use client";

// K9 — segna che l'app è stata aperta. UNA volta per sessione: il flag sta in
// sessionStorage, quindi si azzera quando si chiude l'app e non a mezzanotte.
// Sul database si scrive comunque al massimo una volta al giorno per persona.
// Sta nel layout, così vale da qualunque pagina si entri (non solo dalla home).

import { useEffect } from "react";

const FLAG = "keiko-seen";

export default function SeenPing() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(FLAG)) return;
      sessionStorage.setItem(FLAG, "1");   // prima del fetch: niente doppioni se il render si ripete
    } catch {
      return;   // niente sessionStorage (navigazione privata vecchia): meglio non contare che contare male
    }
    // Se non c'è sessione risponde 401 e finisce lì: nessun rumore a schermo.
    fetch("/api/seen", { method: "POST", credentials: "include" }).catch(() => {});
  }, []);
  return null;
}
