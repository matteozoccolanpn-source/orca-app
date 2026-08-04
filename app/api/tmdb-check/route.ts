import { NextResponse } from "next/server";
import { auth, OWNER_EMAIL } from "@/auth";
import { posterFor } from "@/lib/tmdb";

// Diagnosi temporanea TMDB. Apri /api/tmdb-check nel browser (loggato).
// Non espone la chiave: dice solo se c'è e se una ricerca di prova funziona.
// Visibile SOLO al proprietario (K69, stessa regola di /api/debug/*).
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const email = (session?.user?.email ?? "").trim().toLowerCase();
  if (email !== OWNER_EMAIL) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const key = process.env.TMDB_API_KEY;
  const sample = await posterFor("Inception", "film");
  return NextResponse.json({
    hasKey: !!key,
    keyLen: key ? key.length : 0,
    keyType: key ? (key.includes(".") ? "v4 (token)" : "v3 (api_key)") : "assente",
    sample, // URL locandina di prova, oppure null
  });
}
