import { requireLogin } from "@/lib/require-login";
import { getRecipes, getDietPlan, getShoppingItems } from "@/lib/supabase";
import { giornataDiOggi, prossimoPasto, daRifare } from "@/lib/cucina";
import CucinaView from "./CucinaView";

/* CUCINA — il ricettario che cerca (docs/SPEC-CUCINA.md).
 *
 * Sezione a sé, come da decisione del 7 agosto: rotta sua, pagina sua. La
 * vista dieta non viene toccata — l'unico ponte è la card nel corpo di /salute.
 *
 * IL PIANO SI LEGGE, E BASTA. `getDietPlan` è una lettura: da qui non si
 * scrive, non si scambia un pasto, non si confronta niente con le ricette.
 * La zona ① mostra cosa viene adesso e permette di ESEGUIRLO; le ricette
 * vivono sotto, separate. È il paletto della spec, e passa da qui.
 *
 * Il ricettario si legge sempre: anche senza chiave di ricerca e senza piano
 * la pagina è intera. */
export const dynamic = "force-dynamic";

export default async function CucinaPage() {
  await requireLogin();

  // Le tre letture in parallelo: sono indipendenti e nessuna deve far
  // aspettare le altre.
  const [ricetteLette, piano, spesaLetta] = await Promise.all([getRecipes(), getDietPlan(), getShoppingItems()]);
  /* ⚠️ GUASTO NON GESTITO (giro finale): `null` vuol dire «non ho potuto
     leggere», e qui diventa una lista vuota: la pagina scrive «il ricettario è
     vuoto» e «la spesa è vuota» anche quando non lo sono. Sono due delle tre
     schermate che il giro finale deve riscrivere — il dato per farlo adesso
     c'è. */
  const ricette = ricetteLette ?? [];
  const spesa = spesaLetta ?? [];

  const giornata = giornataDiOggi(piano?.week ?? null);
  const prossimo = prossimoPasto(giornata);

  // Stessa regola della rotta di ricerca: Tavily, oppure Brave. Se cambia lì,
  // cambia anche qui — guardare una chiave sola faceva dire "la ricerca arriva
  // presto" anche quando era configurata.
  const ricercaAttiva = !!(process.env.TAVILY_API_KEY || process.env.BRAVE_SEARCH_KEY);

  return (
    <CucinaView
      ricette={ricette}
      ricercaAttiva={ricercaAttiva}
      giornata={giornata}
      prossimo={prossimo}
      rifare={daRifare(ricette)}
      spesaIniziale={spesa}
    />
  );
}
