/**
 * Arricchisce a mano il primo viaggio 'pending' con la FASE PESANTE (web-search).
 * Uso:  npx tsx --env-file=.env.local scripts/enrich-trip.ts
 *
 * ⚠️ Questo USA il web-search a pagamento di Claude (~$0,01 a ricerca, max 6 per viaggio).
 *    Girala solo quando vuoi davvero generare un piano.
 */
import { getPendingTripPlanKeys } from "../lib/supabase";
import { enrichTripPlan } from "../lib/trip-enrich";

(async () => {
  try {
    const keys = await getPendingTripPlanKeys();
    if (keys.length === 0) {
      console.log("Nessun viaggio 'pending' da arricchire. (Aggiungi biglietti che formano un viaggio.)");
      return;
    }
    const key = keys[0];
    console.log(`Arricchisco il viaggio: ${key}\n(ricerca web in corso, può metterci qualche secondo...)\n`);
    const { plan } = await enrichTripPlan(key);
    console.log("=== PIANO GENERATO ===\n");
    console.log(JSON.stringify(plan, null, 2));
    console.log("\nFatto. Su Supabase → trip_plans: status = ready, colonna plan piena.");
  } catch (e) {
    console.error("Errore:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
})();
