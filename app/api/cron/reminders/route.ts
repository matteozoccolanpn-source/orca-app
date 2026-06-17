import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";

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
  const { data: events } = await supabase
    .from("tickets")
    .select("title, type, datetime, location")
    .gt("datetime", now.toISOString())
    .lt("datetime", in24h.toISOString())
    .not("title", "ilike", "%[PABLO]%")
    .order("datetime", { ascending: true });

  if (!events || events.length === 0) return NextResponse.json({ sent: 0 });

  const body = events
    .map((e) => {
      const t = new Date(e.datetime as string).toLocaleTimeString("it-IT", {
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome",
      });
      return `${t} · ${e.title}`;
    })
    .join("\n");

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await sendPush(
        { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
        { title: `OrCa — prossime 24h (${events.length})`, body, url: "/" }
      );
      sent++;
    } catch {
      // 410/404 = subscription scaduta → elimina
      await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return NextResponse.json({ sent });
}
