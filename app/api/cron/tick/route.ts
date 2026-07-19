import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";

const TZ = "Europe/Rome";

type Sub = { user_id: string; endpoint: string; p256dh: string; auth: string };

function leadMinutes(type: string, hourLocal: number): number | null {
  switch ((type || "").toLowerCase()) {
    case "flight":     return 240;
    case "train":      return 60;
    case "hotel":      return null;
    case "concert":    return 180;
    case "restaurant": return hourLocal < 16 ? 60 : 90;
    case "museum":     return 60;
    case "sport":      return 120; // gara/partita: preavviso lungo
    default:           return 60;
  }
}

function romeHour(d: Date): number {
  return Number(new Intl.DateTimeFormat("it-IT", { hour: "2-digit", hour12: false, timeZone: TZ }).format(d));
}

function romeParts(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const now = new Date();
  const hour = romeHour(now);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now); // YYYY-MM-DD

  // MULTI-UTENTE: sottoscrizioni raggruppate per utente. Ogni utente riceve solo
  // i propri promemoria, sui propri dispositivi. Con la service-role la RLS è
  // scavalcata, quindi ogni query filtra ESPLICITAMENTE per user_id.
  const { data: subs } = await sb.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");
  const byUser = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) {
    if (!s.user_id) continue;
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  for (const [userId, userSubs] of byUser) {
    // invia solo ai dispositivi di QUESTO utente
    const blast = async (title: string, body: string, url = "/") => {
      for (const s of userSubs) {
        try {
          await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url });
        } catch {
          await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
      }
    };

    // dedup giornaliero PER UTENTE: l'utente è dentro `kind` (unique(kind,run_date)).
    const onceToday = async (kind: string): Promise<boolean> => {
      const { error } = await sb.from("notification_runs").insert({ kind: `${kind}:${userId}`, run_date: today });
      return !error;
    };

    // (i) Morning digest — 09:00–09:14
    if (hour === 9 && (await onceToday("morning"))) {
      const start = new Date(`${today}T00:00:00`);
      const end = new Date(`${today}T23:59:59`);
      const { data: oggi } = await sb.from("tickets")
        .select("title, datetime")
        .eq("user_id", userId)
        .gte("datetime", start.toISOString())
        .lte("datetime", end.toISOString())
        .not("title", "ilike", "%[PABLO]%")
        .order("datetime");
      if (oggi && oggi.length) {
        const body = oggi.map(e => `${romeParts(new Date(e.datetime))} · ${e.title}`).join("\n");
        await blast(`Oggi hai ${oggi.length} cose`, body);
      }
    }

    // (iii) Evening nudge — 21:00, solo se non ha aggiunto nulla oggi
    if (hour === 21 && (await onceToday("evening"))) {
      const { count } = await sb.from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00`);
      if (!count) {
        await blast("Hai aggiunto tutto?", "Prenotato o comprato qualcosa oggi? Aggiungilo a OrCa.", "/add");
      }
    }

    // (ii) Pre-event lead reminder + (ii-bis) 30-min imminent reminder
    const horizon = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const { data: prossimi } = await sb.from("tickets")
      .select("id, title, type, datetime, reminded_lead_at, reminded_imminent_at")
      .eq("user_id", userId)
      .gt("datetime", now.toISOString())
      .lt("datetime", horizon.toISOString())
      .not("title", "ilike", "%[PABLO]%");

    for (const e of prossimi ?? []) {
      const start = new Date(e.datetime);
      const minsTo = (start.getTime() - now.getTime()) / 60000;
      const lead = leadMinutes(e.type, romeHour(start));

      if (lead != null && !e.reminded_lead_at && minsTo <= lead && minsTo > lead - 15) {
        await blast(`Tra ${Math.round(minsTo)} min: ${e.title}`, "Preparati 🙂", "/");
        await sb.from("tickets").update({ reminded_lead_at: now.toISOString() }).eq("id", e.id);
      }

      if (lead != null && lead >= 120 && !e.reminded_imminent_at && minsTo <= 30 && minsTo > 15) {
        await blast(`Tra 30 min: ${e.title}`, "Sta per iniziare", "/");
        await sb.from("tickets").update({ reminded_imminent_at: now.toISOString() }).eq("id", e.id);
      }
    }

    // (iv) To-do con orario — notifica con anticipo scelto dall'utente
    // (lead_minutes, default 30) + eventuale seconda notifica a ridosso (~15 min).
    const { data: todosOggi } = await sb.from("todos")
      .select("id, text, time, lead_minutes, double_reminder, reminded_at, reminded_imminent_at")
      .eq("user_id", userId)
      .eq("day", today)
      .eq("done", false)
      .not("time", "is", null);

    for (const t of todosOggi ?? []) {
      const start = romeLocalToUtc(today, String(t.time).slice(0, 5));
      const minsTo = (start.getTime() - now.getTime()) / 60000;
      const lead = typeof t.lead_minutes === "number" ? t.lead_minutes : 30;

      // Prima notifica: nella finestra [lead-15, lead] (il cron passa ogni ~15 min).
      if (!t.reminded_at && minsTo <= lead && minsTo > lead - 15) {
        await blast(`Tra ${Math.round(minsTo)} min: ${t.text}`, "Promemoria to-do ✅", "/");
        await sb.from("todos").update({ reminded_at: now.toISOString() }).eq("id", t.id);
      }

      // Seconda notifica (se attiva e ha senso: anticipo > 15): a ridosso.
      if (t.double_reminder === true && lead > 15 && !t.reminded_imminent_at && minsTo <= 15 && minsTo > 0) {
        await blast(`Tra poco: ${t.text}`, "Ci siamo quasi", "/");
        await sb.from("todos").update({ reminded_imminent_at: now.toISOString() }).eq("id", t.id);
      }
    }
  }

  return NextResponse.json({ ok: true, hour });
}

/* Converte "giorno + orario" letti come ORA ITALIANA in un istante UTC.
 * Serve perché i to-do salvano solo `day` e `time` locali (niente fuso),
 * mentre il server (Vercel) ragiona in UTC. */
function romeLocalToUtc(day: string, hhmm: string): Date {
  const guess = new Date(`${day}T${hhmm}:00Z`);               // finta UTC
  // Confronto UTC-vs-Roma della stessa data: robusto qualunque sia il fuso del server.
  const utcView = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  const romeView = new Date(guess.toLocaleString("en-US", { timeZone: TZ }));
  const offset = romeView.getTime() - utcView.getTime();      // es. +2h d'estate
  return new Date(guess.getTime() - offset);
}
