/**
 * Test manuale del rilevamento incastri — NON tocca il database.
 * Uso:  npx tsx scripts/test-incastri.ts
 *
 * Simula biglietti finti e stampa i cluster "viaggio" rilevati.
 */
import { detectClusters, type TicketInput } from "../lib/incastri";

const fintiBiglietti: TicketInput[] = [
  // --- Viaggio a Roma: A/R + concerto (il caso principe di Matteo) ---
  { id: "t1", type: "train",   datetime: "2026-07-04T08:48:00", city: "Roma" },   // andata (dest. Roma)
  { id: "t2", type: "train",   datetime: "2026-07-05T17:50:00", city: "Milano" }, // ritorno (dest. Milano!)
  { id: "t3", type: "concert", datetime: "2026-07-04T20:30:00", city: "Roma" },   // concerto (venue Tor Vergata)

  // --- Rumore 1: una cena a Napoli il mese dopo, senza viaggio → NON deve fare piano ---
  { id: "n1", type: "restaurant", datetime: "2026-08-10T20:30:00", city: "Napoli" },

  // --- Rumore 2: un meeting di lavoro (type other) → deve essere ignorato ---
  { id: "n2", type: "other", datetime: "2026-07-04T10:00:00", city: "Roma" },
];

const clusters = detectClusters(fintiBiglietti);

console.log(`\nCluster trovati: ${clusters.length}\n`);
for (const c of clusters) {
  console.log(`• ${c.city}  [${c.startDate} → ${c.endDate}]`);
  console.log(`    pattern:    ${c.pattern}`);
  console.log(`    parte web-search?  ${c.fires ? "SÌ" : "no"}`);
  console.log(`    biglietti:  ${c.ticketIds.join(", ")}`);
  console.log(`    clusterKey: ${c.clusterKey}\n`);
}
