"use client";

import { Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import HeyKeikoBar from "./HeyKeikoBar";
import AddButton from "./AddButton";

/* Chrome globale della vecchia app (barra "Chiedi a Keiko" flottante + FAB ＋).
 * Dopo l'inversione dell'interruttore la home NUOVA è il default: la chrome
 * vecchia va montata SOLO sulla home vecchia, cioè `/?classic`. Ovunque altro
 * (home nuova, /v2/*, pagine interne v2.3) NON va montata: superficie = tab bar
 * nuova / KeikoShell. Conditional render: i componenti restano per la vecchia home. */
function Inner() {
  const params = useSearchParams();
  const pathname = usePathname();
  if (!(pathname === "/" && params.has("classic"))) return null;
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
