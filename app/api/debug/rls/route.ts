import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/user";
import { userDb } from "@/lib/supabase-user";

export const dynamic = "force-dynamic";

// Diagnostica multi-utente: prova il percorso "come utente" (token firmato + RLS)
// in ISOLAMENTO, senza dipendere dall'interruttore MULTIUSER_RLS. Auth-guarded.
// Da rimuovere dopo la diagnosi.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uid = await currentUserId();
  const secret = process.env.SUPABASE_JWT_SECRET ?? "";
  const info: Record<string, unknown> = {
    uid,
    email: session.user?.email ?? null,
    secretPresent: secret.length > 0,
    secretLen: secret.length,               // se ha spazi/newline extra si vede qui
    anonPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  };

  try {
    const u = await userDb();
    if (!u) return NextResponse.json({ ...info, userDb: "null (nessun utente)" });
    const { data, error } = await u.db.from("tickets").select("id").limit(1);
    return NextResponse.json({
      ...info,
      tokenAcceptedByDb: !error,
      rowsVisible: data?.length ?? 0,
      error: error
        ? { message: error.message, code: (error as { code?: string }).code ?? null,
            details: (error as { details?: string }).details ?? null,
            hint: (error as { hint?: string }).hint ?? null }
        : null,
    });
  } catch (e) {
    return NextResponse.json({ ...info, threw: String(e instanceof Error ? e.message : e) });
  }
}
