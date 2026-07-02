/**
 * Sync manuale degli incastri: legge i biglietti veri da Supabase, rileva i
 * viaggi e salva i cluster in trip_plans. Serve a provare il ponte a mano.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/sync-incastri.ts
 *
 * Poi controlla su Supabase → tabella trip_plans.
 */
import { syncTripPlans } from "../lib/supabase";

(async () => {
  try {
    const r = await syncTripPlans();
    console.log(
      `\nCluster rilevati: ${r.clusters} · salvati/aggiornati in trip_plans: ${r.upserted}\n`
    );
  } catch (e) {
    console.error("Errore:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
})();
