import type { MetadataRoute } from "next";

// PWA: "Aggiungi a Home" apre la home NUOVA a schermo pieno (start_url "/" =
// default dopo l'inversione dell'interruttore). Icona brand Keiko (maskable) +
// colori allineati al fondo scuro della home nuova.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keiko",
    short_name: "Keiko",
    description: "Il calendario della tua vita",
    start_url: "/",
    display: "standalone",
    background_color: "#12203A",
    theme_color: "#12203A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/keiko-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
