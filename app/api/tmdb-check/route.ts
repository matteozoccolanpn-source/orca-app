import { NextResponse } from "next/server";
import { posterFor } from "@/lib/tmdb";

// Diagnosi temporanea TMDB. Apri /api/tmdb-check nel browser (loggato).
// Non espone la chiave: dice solo se c'è e se una ricerca di prova funziona.
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.TMDB_API_KEY;
  const sample = await posterFor("Inception", "film");
  return NextResponse.json({
    hasKey: !!key,
    keyLen: key ? key.length : 0,
    keyType: key ? (key.includes(".") ? "v4 (token)" : "v3 (api_key)") : "assente",
    sample, // URL locandina di prova, oppure null
  });
}
