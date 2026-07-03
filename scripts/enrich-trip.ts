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
    // Puoi passare un cluster_key per RI-generare un viaggio già pronto:
    //   npx tsx --env-file=.env.local scripts/enrich-trip.ts 'roma:2026-07-04:2026-07-05'
    // Senza argomenti, prende il primo viaggio 'pending'.
    let key = process.argv[2];
    if (!key) {
      const keys = await getPendingTripPlanKeys();
      if (keys.length === 0) {
        console.log("Nessun viaggio 'pending'. Per ri-generarne uno già pronto passa il cluster_key:");
        console.log("  npx tsx --env-file=.env.local scripts/enrich-trip.ts 'roma:2026-07-04:2026-07-05'");
        return;
      }
      key = keys[0];
    }
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
