import GuardaProva from "./GuardaProva";

// ONDATA 1 — parità col mock keiko-v2-mock.html, DATI FINTI.
// Monta il foglio (app/keiko-v2.css) e i componenti (app/components/v2) su una
// sola schermata di prova: Guarda. Nessun dato vero, nessuna chiamata di rete.
// La rotta vecchia /v2/preview resta dov'è: è la parità col mockup precedente.
export const dynamic = "force-static";

export default function V2KeikoPage() {
  return <GuardaProva />;
}
