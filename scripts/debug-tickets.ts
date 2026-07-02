/**
 * Debug: stampa TUTTI i biglietti con data/tipo/città, senza filtri.
 * Serve a capire perché il rilevamento trova 0 cluster.
 *
 * Uso:  npx tsx --env-file=.env.local scripts/debug-tickets.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local)");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  const { data, error } = await sb
    .from("tickets")
    .select("id, title, type, datetime, city")
    .order("datetime", { ascending: true });

  if (error) {
    console.error("Errore:", error.message);
    process.exit(1);
  }

  console.log("\nOGGI (UTC):", new Date().toISOString(), "\n");
  console.log("datetime               | futuro? | type       | city    | title");
  console.log("-----------------------|---------|------------|---------|------");
  const now = new Date().toISOString();
  for (const t of data ?? []) {
    const dt = (t.datetime as string) ?? "(vuoto)";
    const futuro = dt > now ? "  SÌ   " : "  no   ";
    console.log(
      `${dt.padEnd(22)} | ${futuro} | ${((t.type as string) ?? "").padEnd(10)} | ${((t.city as string) ?? "NULL").padEnd(7)} | ${t.title}`
    );
  }
  console.log(`\nTotale biglietti: ${data?.length ?? 0}\n`);
})();
