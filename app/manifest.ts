import type { MetadataRoute } from "next";

// PWA: "Aggiungi a Home" apre la home NUOVA a schermo pieno (start_url "/" =
// default dopo l'inversione dell'interruttore). Icona brand Keiko (maskable) +
// colori allineati al fondo scuro della home nuova.
// Lo standard del manifesto permette due scopi sulla stessa icona
// ("any maskable"), il tipo di Next ne accetta uno solo. Il cast serve a
// scrivere quello che dice lo standard senza raddoppiare le righe: nel JSON
// prodotto esce esattamente `"purpose": "any maskable"`.
const SCOPO = "any maskable" as "any";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keiko",
    short_name: "Keiko",
    description: "Il calendario della tua vita",
    start_url: "/",
    display: "standalone",
    // Keiko si usa in verticale. Vale su Android: iPhone il manifesto non lo
    // legge, e da web non c'è modo di bloccargli la rotazione — per quello c'è
    // il pannello di components/RuotaIlTelefono.tsx.
    orientation: "portrait",
    background_color: "#0C0E13",
    theme_color: "#0C0E13",
    // "any maskable": la stessa icona vale sia com'è sia ritagliata dal sistema
    // (Android arrotonda gli angoli). Prima la 512 era ripetuta due volte per
    // dire la stessa cosa.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: SCOPO },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: SCOPO },
      { src: "/keiko-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
