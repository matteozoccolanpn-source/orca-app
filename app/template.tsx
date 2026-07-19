"use client";

// Transizione d'ingresso COERENTE su tutta l'app: ogni pagina "sale dal basso"
// a ogni navigazione. template.tsx si ri-monta a ogni cambio rotta, quindi
// l'animazione CSS riparte da sola. Solo animazione (nessun transform che resta),
// così a fine transizione gli elementi position:fixed (barre/pannelli) restano ok.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
