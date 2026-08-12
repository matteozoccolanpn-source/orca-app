import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* GLI ALIAS DELLE SEZIONI.
     `/dieta` e `/sport` sono i vecchi nomi dei tab: qualcuno li ha nei
     preferiti, e finivano su «Questa pagina non esiste».

     Perche' qui e non in una pagina con `redirect()`. E' quello che c'era
     prima per `/sport`, e non funzionava: il middleware avvolge tutto in
     `auth()`, che scrive i cookie di sessione e chiude la risposta, cosi' il
     `redirect()` della pagina arriva tardi e viene fuori un 200 con dentro il
     404. E' lo stesso motivo gia' scritto in `middleware.ts` per `/numeri`.
     I redirect di configurazione girano PRIMA del middleware, quindi arrivano.
     Provati con `curl -I`, non dedotti. */
  async redirects() {
    return [
      { source: "/dieta", destination: "/salute", permanent: false },
      { source: "/sport", destination: "/allenamento", permanent: false },
    ];
  },
};

export default nextConfig;
