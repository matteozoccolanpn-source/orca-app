import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";

type Sub = { user_id: string; endpoint: string; p256dh: string; auth: string };

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // MULTI-UTENTE: le sottoscrizioni sono raggruppate per utente. Ogni utente
  // riceve SOLO i propri eventi, inviati SOLO ai propri dispositivi. Usiamo la
  // service-role (scavalca la RLS), quindi il filtro per utente è ESPLICITO
  // (.eq("user_id", ...)) in ogni query: senza, i dati si mischierebbero.
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");

  const byUser = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) {
    if (!s.user_id) continue; // sottoscrizioni senza proprietario: ignora
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  let sent = 0;
  for (const [userId, userSubs] of byUser) {
    const { data: events } = await supabase
      .from("tickets")
      .select("title, type, datetime, location")
      .eq("user_id", userId)
      .gt("datetime", now.toISOString())
      .lt("datetime", in24h.toISOString())
      .not("title", "ilike", "%[PABLO]%")
      .order("datetime", { ascending: true });

    if (!events || events.length === 0) continue;

    const body = events
      .map((e) => {
        const t = new Date(e.datetime as string).toLocaleTimeString("it-IT", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome",
        });
        return `${t} · ${e.title}`;
      })
      .join("\n");

    for (const s of userSubs) {
      try {
        await sendPush(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          { title: `OrCa — prossime 24h (${events.length})`, body, url: "/" }
        );
        sent++;
      } catch {
        // 410/404 = subscription scaduta → elimina
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }
  return NextResponse.json({ sent });
}
