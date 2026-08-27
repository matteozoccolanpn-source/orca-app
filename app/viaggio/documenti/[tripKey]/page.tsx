import { notFound } from "next/navigation";
import { requireLogin } from "@/lib/require-login";
import { listTripGroups, getTripDocuments, assembleTimeline, arricchisciFoto } from "@/lib/trip-docs";
import DocumentiView from "../DocumentiView";

/* VIAGGI — il dettaglio di UN viaggio (nav, punto 1 del 27 agosto 2026).
 * Indirizzo suo (era `?trip=` sulla stessa pagina dell'elenco): il tasto
 * indietro del telefono torna all'elenco da solo, senza che nessuno debba
 * gestirlo a mano. */
export const dynamic = "force-dynamic";

export default async function ViaggioDettaglioPage({ params }: { params: Promise<{ tripKey: string }> }) {
  await requireLogin();
  const { tripKey } = await params;

  const gruppi = await listTripGroups();
  const gruppo = gruppi.find((g) => g.tripKey === tripKey);
  // Un indirizzo indovinato o un viaggio staccato nel frattempo: non un
  // dettaglio vuoto che sembra un guasto, la pagina-non-c'è di sempre.
  if (!gruppo) notFound();

  const [documenti, timelineGrezza] = await Promise.all([getTripDocuments(tripKey), assembleTimeline(tripKey)]);
  // PARTE 3: le foto si risolvono qui, non dentro assembleTimeline — quella
  // resta una funzione di sola lettura del database, senza chiamate esterne.
  const timeline = await arricchisciFoto(timelineGrezza, gruppo.destination);

  return <DocumentiView gruppo={gruppo} documenti={documenti} timeline={timeline} />;
}
