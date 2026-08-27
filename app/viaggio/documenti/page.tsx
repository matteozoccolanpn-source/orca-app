import { requireLogin } from "@/lib/require-login";
import { listTripGroups, getTripDocuments, assembleTimeline } from "@/lib/trip-docs";
import DocumentiView from "./DocumentiView";

/* VIAGGI — il viaggio caricato da fuori (docs/PROMPT-CODE-20-VIAGGI-DOCUMENTI.md).
 * Pagina nuova e separata da app/viaggio/ViaggioView.tsx (i bottoni che
 * mentono, SPEC-VIAGGI-DIREZIONE.md §1): non la tocca, non ne riusa i dati.
 * Ci si arriva da lì con un link. */
export const dynamic = "force-dynamic";

export default async function DocumentiPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string }>;
}) {
  await requireLogin();
  const { trip } = await searchParams;

  const gruppi = await listTripGroups();
  // Senza scelta esplicita: il viaggio col giorno più vicino a oggi (passato o
  // futuro non importa qui, è solo un default sensato per aprire la pagina).
  const oggi = new Date().toISOString().slice(0, 10);
  const tripKey =
    trip ||
    [...gruppi].sort((a, b) => {
      const da = a.minDay ? Math.abs(new Date(a.minDay).getTime() - new Date(oggi).getTime()) : Infinity;
      const db = b.minDay ? Math.abs(new Date(b.minDay).getTime() - new Date(oggi).getTime()) : Infinity;
      return da - db;
    })[0]?.tripKey ||
    null;

  const [documenti, timeline] = tripKey ? await Promise.all([getTripDocuments(tripKey), assembleTimeline(tripKey)]) : [[], []];

  return <DocumentiView gruppi={gruppi} tripKeyAttivo={tripKey} documenti={documenti} timeline={timeline} />;
}
