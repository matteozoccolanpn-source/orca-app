// Controllo all'avvio: gira UNA volta quando il server Next parte, prima di
// servire qualunque richiesta (file convention `instrumentation.ts`).
// Serve a far vedere SUBITO nei log che manca l'isolamento dati, invece di
// scoprirlo solo quando la prima pagina esplode. Il rifiuto vero sta in
// lib/supabase.ts -> db(): qui si stampa e basta.

export function register() {
  // Solo runtime Node (il controllo non ha senso nel runtime edge).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const v = process.env.MULTIUSER_RLS;
  if (v === "1") return;

  const motivo =
    v === undefined || v === ""
      ? "MULTIUSER_RLS NON E' IMPOSTATA"
      : `MULTIUSER_RLS = "${v}" (l'unico valore accettato e' "1")`;

  console.error(
    [
      "",
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
      "!!  KEIKO: ISOLAMENTO DATI DISATTIVO — L'APP NON FUNZIONERA'     !!",
      `!!  ${motivo}`,
      "!!  Ogni lettura/scrittura dati fallira' finche' non la imposti.  !!",
      '!!  Fix: MULTIUSER_RLS="1" in .env.local (e su Vercel).           !!',
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
      "",
    ].join("\n")
  );
}
