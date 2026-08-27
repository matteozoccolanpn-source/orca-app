import { requireLogin } from "@/lib/require-login";
import { listTripGroups } from "@/lib/trip-docs";
import TripListView from "./TripListView";

/* VIAGGI — l'elenco dei viaggi (nav, punto 1 del 27 agosto 2026).
 * Prima sceglieva da sola il viaggio più vicino a oggi e ci entrava dritto:
 * bastava con un viaggio solo, ma la scelta non era mai visibile. Ora questa
 * pagina è SOLO l'elenco; il dettaglio di un viaggio vive in
 * `[tripKey]/page.tsx`, con un indirizzo suo — si può tornare indietro. */
export const dynamic = "force-dynamic";

export default async function ViaggiPage() {
  await requireLogin();
  const gruppi = await listTripGroups();
  return <TripListView gruppi={gruppi} />;
}
