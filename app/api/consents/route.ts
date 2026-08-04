import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getConsents, setConsent, VERSIONE_CONSENSI, type TipoConsenso } from "@/lib/supabase";

// Consensi (K2/K14): li dà l'onboarding, si revocano dal Profilo.
// GET  → { consensi: [{tipo, accettato, versioneTesto, quando}], versione }
// POST → { tipo: 'salute'|'email', accettato: boolean }
// Nessuno dei due è obbligatorio: il POST serve sia a dare sia a togliere.

export const dynamic = "force-dynamic";

const TIPI = new Set<TipoConsenso>(["salute", "email"]);

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const consensi = await getConsents();
  return NextResponse.json({ consensi, versione: VERSIONE_CONSENSI });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { tipo?: string; accettato?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }

  const tipo = body.tipo as TipoConsenso;
  if (!TIPI.has(tipo)) return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
  if (typeof body.accettato !== "boolean") {
    return NextResponse.json({ error: "Serve accettato: true o false" }, { status: 400 });
  }

  try {
    await setConsent(tipo, body.accettato);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Consensi: salvataggio fallito:", e);
    const msg = e instanceof Error ? e.message : "errore sconosciuto";
    return NextResponse.json({ error: "Salvataggio fallito: " + msg }, { status: 502 });
  }
}
