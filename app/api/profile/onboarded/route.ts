import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markOnboarded } from "@/lib/supabase";

// K14b — "l'onboarding l'ho finito". Nessun body: l'utente si prende dalla
// sessione, MAI dal client, altrimenti chiunque potrebbe segnarlo per un altro.
// Da qui in poi l'onboarding non riparte più, né in Safari né dall'icona.

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await markOnboarded();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("K14b: mark_onboarded fallita:", e);
    const msg = e instanceof Error ? e.message : "errore sconosciuto";
    return NextResponse.json({ error: "Salvataggio fallito: " + msg }, { status: 502 });
  }
}
