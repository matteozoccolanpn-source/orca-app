import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteAllMyData } from "@/lib/supabase";

// K4 — "cancella tutti i miei dati".
// Cancella SOLO i dati di chi chiama: l'uid viene dalla sessione, mai dal body
// (se arrivasse dal body, chiunque potrebbe cancellare i dati di un altro).
// Serve una conferma esplicita: senza la parola giusta il server non tocca
// niente, così una richiesta partita per sbaglio non fa danni.

export const dynamic = "force-dynamic";

const PAROLA = "CANCELLA";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { conferma?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body non valido" }, { status: 400 });
  }
  if (body?.conferma !== PAROLA) {
    return NextResponse.json({ error: "Serve la conferma esplicita." }, { status: 400 });
  }

  try {
    const esito = await deleteAllMyData();
    if (!esito.ok) {
      console.error("K4: cancellazione incompleta:", esito.esiti.filter((e) => e.errore));
      return NextResponse.json(
        { error: "Cancellazione incompleta", dettaglio: esito.esiti },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, totale: esito.totale, dettaglio: esito.esiti });
  } catch (e) {
    console.error("K4: cancellazione fallita:", e);
    const msg = e instanceof Error ? e.message : "errore sconosciuto";
    return NextResponse.json({ error: "Cancellazione fallita: " + msg }, { status: 502 });
  }
}
