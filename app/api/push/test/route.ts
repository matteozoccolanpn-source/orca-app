import { auth } from "@/auth";
import { currentUserId } from "@/lib/user";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";

// Invia una notifica di PROVA a tutte le iscrizioni salvate (single-user).
// Auth-guarded. Serve a verificare al volo che il push funziona.
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: subs } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", await currentUserId());
  const targets = subs ?? [];
  if (!targets.length) return NextResponse.json({ ok: false, sent: 0, reason: "no-subscriptions" });

  let sent = 0;
  for (const s of targets) {
    try {
      await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title: "Keiko — prova ✅", body: "Le notifiche funzionano!", url: "/" });
      sent++;
    } catch {
      await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return NextResponse.json({ ok: sent > 0, sent });
}
