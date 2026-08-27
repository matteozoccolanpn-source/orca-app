import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { detachTripDocument } from "@/lib/trip-docs";

/* "Stacca" un documento: l'unione a un viaggio è dedotta da destinazione+date
 * (§1.4 rivisto), ma non deve mai restare silenziosa se è sbagliata — questa
 * è la via d'uscita, sempre disponibile, mai dentro un ramo "va tutto bene". */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { documentId?: string };
  const documentId = (body.documentId ?? "").trim();
  if (!documentId) return NextResponse.json({ error: "Serve documentId" }, { status: 400 });

  try {
    const { tripKey } = await detachTripDocument(documentId);
    return NextResponse.json({ ok: true, tripKey });
  } catch (e) {
    console.error("[trip-docs] stacco fallito:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "errore sconosciuto" }, { status: 500 });
  }
}
