import { NextResponse } from "next/server";

// Restituisce l'identificativo del deploy attuale (lo SHA del commit su Vercel).
// Serve al "controllo versione" lato client per capire se è uscito un aggiornamento.
// Sempre fresco (no cache), così il confronto è affidabile.
export const dynamic = "force-dynamic";

export async function GET() {
  const v = process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";
  return new NextResponse(JSON.stringify({ v }), {
    headers: { "content-type": "application/json", "cache-control": "no-store, max-age=0" },
  });
}
