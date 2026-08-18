import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";

type Sub = { user_id: string; endpoint: string; p256dh: string; auth: string };


/* ══════════ QUANDO UNA SOTTOSCRIZIONE VA CANCELLATA DAVVERO ══════════
 *
 * SOLO 404 e 410: i due stati con cui un servizio di push dice «questo
 * indirizzo non esiste più». `web-push` li mette in `WebPushError.statusCode`.
 *
 * Fino al 18 agosto 2026 il `catch` qui sotto cancellava a OGNI eccezione, pur
 * avendo accanto il commento «410/404 = subscription scaduta → elimina»: il
 * codice non ha mai guardato lo stato. Una rete storta bastava a disiscrivere
 * un telefono per sempre, in silenzio.
 *
 * 🚫 Nessuna cancellazione «per sicurezza»: una notifica persa si recupera, una
 * sottoscrizione no — va riabilitata a mano dall'utente.
 *
 * (Scritta uguale nell'altro cron: `lib/push.ts` non è fra i file che questo
 * giro può toccare.) */
function sottoscrizioneMorta(e: unknown): boolean {
  const stato = (e as { statusCode?: number } | null)?.statusCode
  return stato === 404 || stato === 410
}

function statoDi(e: unknown): number | null {
  return (e as { statusCode?: number } | null)?.statusCode ?? null
}

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
  const { data: subs, error: erroreSubs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  /* ⚠️ L'ERRORE SI GUARDA: prima finiva nel nulla della destrutturazione, e una
     lettura caduta diventava «nessun utente» con un tranquillo 200 `{sent:0}`.
     Un guasto totale travestito da giornata senza promemoria. */
  if (erroreSubs) {
    console.error("[cron/reminders] lettura delle sottoscrizioni fallita:", erroreSubs.message);
    return NextResponse.json(
      { ok: false, guasto: "lettura delle sottoscrizioni fallita", dettaglio: erroreSubs.message },
      { status: 500 }
    );
  }
  // Zero iscritti è un fatto, e si dice: non somiglia a un guasto.
  if ((subs ?? []).length === 0) {
    return NextResponse.json({ sent: 0, sottoscrizioni: 0, nota: "nessun dispositivo iscritto" });
  }

  const byUser = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) {
    if (!s.user_id) continue; // sottoscrizioni senza proprietario: ignora
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  let sent = 0, scadute = 0, fallite = 0;
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
      } catch (e) {
        if (sottoscrizioneMorta(e)) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          scadute++;
        } else {
          // La sottoscrizione RESTA, e si registra cosa è successo.
          fallite++;
          console.error("[cron/reminders] invio fallito, la sottoscrizione resta:", {
            endpoint: s.endpoint.slice(-24), stato: statoDi(e), errore: String(e).slice(0, 200),
          });
        }
      }
    }
  }
  return NextResponse.json({ sent, sottoscrizioni: (subs ?? []).length, scadute, fallite });
}
