import { requireLogin } from "@/lib/require-login";
import { getRecipes } from "@/lib/supabase";
import CucinaView from "./CucinaView";

/* CUCINA V1 — il ricettario che cerca (docs/SPEC-CUCINA.md).
 *
 * Sezione a sé, come da decisione del 7 agosto: rotta sua, pagina sua. La
 * vista dieta non viene toccata — l'unico ponte è un bottone nell'intestazione
 * di /salute.
 *
 * Il ricettario si legge sempre: anche senza chiave di ricerca la pagina è
 * intera e le ricette salvate ci sono. */
export const dynamic = "force-dynamic";

export default async function CucinaPage() {
  await requireLogin();
  const ricette = await getRecipes();
  // Stessa regola della rotta di ricerca: Tavily, oppure Brave. Se cambia lì,
  // cambia anche qui — guardare una chiave sola faceva dire "la ricerca arriva
  // presto" anche quando era configurata.
  const ricercaAttiva = !!(process.env.TAVILY_API_KEY || process.env.BRAVE_SEARCH_KEY);
  return <CucinaView ricette={ricette} ricercaAttiva={ricercaAttiva} />;
}
