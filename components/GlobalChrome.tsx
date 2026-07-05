"use client";

import { Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import HeyKeikoBar from "./HeyKeikoBar";
import AddButton from "./AddButton";

/* Chrome globale della vecchia app (barra "Chiedi a Keiko" flottante + FAB ＋).
 * Sulla home v2 (redesign) NON va montata: lì la superficie è la tab bar nuova.
 * Vale sia per la home dietro `?v2` sia per le rotte /v2/* (es. /v2/preview).
 * Conditional render (non cancelliamo i componenti: restano per le altre pagine). */
function Inner() {
  const params = useSearchParams();
  const pathname = usePathname();
  if (params.has("v2") || pathname.startsWith("/v2")) return null;
  return (
    <>
      <HeyKeikoBar />
      <AddButton />
    </>
  );
}

export default function GlobalChrome() {
  // useSearchParams richiede un confine Suspense.
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
