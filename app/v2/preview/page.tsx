import KeikoPreview from "@/app/components/keiko/KeikoPreview";

// TAPPA 1 — parità col mockup, DATI FINTI (hardcoded dal mockup keiko-final.html).
// Obiettivo unico: screenshot indistinguibile dal mockup a 390px, scuro e chiaro.
// Nessun dato reale qui. In TAPPA 2 la stessa UI riceve i dati veri.
export const dynamic = "force-static";

export default function V2PreviewPage() {
  return <KeikoPreview />;
}
