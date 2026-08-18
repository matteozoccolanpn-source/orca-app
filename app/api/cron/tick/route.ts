import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";
import { battitoDaNotificare, GIORNI_INDIETRO, GIORNI_AVANTI } from "@/lib/battiti";

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


/* ══════════ QUANDO UNA SOTTOSCRIZIONE VA CANCELLATA DAVVERO ══════════
 *
 * SOLO 404 e 410. Sono i due stati con cui un servizio di push dice «questo
 * indirizzo non esiste più»; `web-push` li porta in `WebPushError.statusCode`,
 * quindi l'informazione l'abbiamo già e bastava guardarla.
 *
 * Fino al 18 agosto 2026 qui c'era un `catch` nudo che cancellava a ogni
 * eccezione: una rete storta, un timeout, un 500 del servizio, una chiave VAPID
 * sbagliata. Il commento accanto diceva «410/404 = scaduta → elimina» — il
 * codice non l'ha mai controllato. Questa rotta gira in produzione ogni ora
 * senza che nessuno la guardi: bastava una giornata storta delle variabili VAPID
 * per disiscrivere tutti i dispositivi di tutti in una passata, e senza lasciare
 * traccia.
 *
 * 🚫 Nessuna cancellazione «per sicurezza»: una notifica persa si recupera al
 * giro dopo, una sottoscrizione cancellata no — l'utente deve riabilitare le
 * notifiche a mano, e non lo fa nessuno.
 *
 * (La funzione è scritta uguale nei due cron invece che in `lib/push.ts`
 * perché quel file non è fra quelli che questo giro può toccare.) */
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
  const { data: subs, error: erroreSubs } = await sb
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  /* ⚠️ L'ERRORE SI GUARDA. Prima era buttato via nella destrutturazione: se la
     lettura falliva, `subs` era `undefined`, il ciclo non girava e la rotta
     rispondeva 200 `{ ok: true }`. Un guasto totale — nessuna notifica a
     nessuno — che nell'elenco delle esecuzioni sembrava una giornata
     tranquilla. E l'elenco delle esecuzioni è l'unica cosa che qualcuno
     guarderà mai, di una rotta che gira da sola. */
  if (erroreSubs) {
    console.error("[cron/tick] lettura delle sottoscrizioni fallita:", erroreSubs.message);
    return NextResponse.json(
      { ok: false, guasto: "lettura delle sottoscrizioni fallita", dettaglio: erroreSubs.message },
      { status: 500 }
    );
  }
  /* «Zero sottoscrizioni» e «non sono riuscito a leggerle» sono due fatti
     opposti e non devono somigliarsi: il primo è un 200 che lo dice. */
  if ((subs ?? []).length === 0) {
    return NextResponse.json({ ok: true, hour: romeHour(now), sottoscrizioni: 0, nota: "nessun dispositivo iscritto" });
  }

  const byUser = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) {
    if (!s.user_id) continue;
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  let inviate = 0, scadute = 0, fallite = 0;

  for (const [userId, userSubs] of byUser) {
    // invia solo ai dispositivi di QUESTO utente
    const blast = async (title: string, body: string, url = "/") => {
      for (const s of userSubs) {
        try {
          await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url });
          inviate++;
        } catch (e) {
          if (sottoscrizioneMorta(e)) {
            await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            scadute++;
          } else {
            // La sottoscrizione RESTA. Si scrive cosa è successo e a chi.
            fallite++;
            console.error("[cron/tick] invio fallito, la sottoscrizione resta:", {
              endpoint: s.endpoint.slice(-24), stato: statoDi(e), errore: String(e).slice(0, 200),
            });
          }
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
        await blast(`Oggi hai ${oggi.length} cose`, body, `/?day=${today}`);
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
        await blast(`Tra ${Math.round(minsTo)} min: ${e.title}`, "Preparati 🙂", `/?ev=${e.id}`);
        await sb.from("tickets").update({ reminded_lead_at: now.toISOString() }).eq("id", e.id);
      }

      if (lead != null && lead >= 120 && !e.reminded_imminent_at && minsTo <= 30 && minsTo > 15) {
        await blast(`Tra 30 min: ${e.title}`, "Sta per iniziare", `/?ev=${e.id}`);
        await sb.from("tickets").update({ reminded_imminent_at: now.toISOString() }).eq("id", e.id);
      }
    }

    /* (v) I BATTITI — docs/SPEC-BATTITI.md.
       Sta QUI dentro e non in un cron nuovo: questo giro passa già ogni pochi
       minuti, sa già quali sono i dispositivi di ogni utente e ha già il
       "una volta al giorno" (notification_runs). Un secondo scheduler sarebbe
       una cosa in più da far funzionare, per niente.

       Le regole dure della spec, tutte qui:
       - silenzio 23-7 (e l'ora è quella di Roma);
       - solo agli orari che chiede la tabella (13:00 e 19:00): il cron NON sa
         quali tipi battono a che ora, guarda solo `oraNotifica` del battito;
       - MASSIMO UNA notifica-battito al giorno per utente;
       - niente notifica per un battito già visto in home. */
    if (hour >= 7 && hour < 23) {
      /* Di norma l'ora è quella vera di Roma. Con `?ora=19:00` si può forzare —
         ma la rotta è già protetta dal CRON_SECRET, quindi lo può fare solo chi
         quel segreto ce l'ha: serve a provare i battiti senza aspettare le 13.
         Il tetto di una notifica al giorno vale lo stesso, anche forzando. */
      const forzata = new URL(req.url).searchParams.get("ora");
      const oraDiRoma = forzata ?? `${String(hour).padStart(2, "0")}:00`;

      // L'interruttore del profilo spegne SOLO le notifiche: le card in home
      // restano. Se la colonna non c'è ancora, si considera acceso (default).
      const { data: prof } = await sb.from("profile").select("beats_push").eq("user_id", userId).maybeSingle();
      const battitiAccesi = prof?.beats_push !== false;

      if (battitiAccesi) {
        const giorno = 24 * 60 * 60 * 1000;
        const { data: perBattiti } = await sb.from("tickets")
          .select("id, title, type, datetime, enrichment")
          .eq("user_id", userId)
          .gte("datetime", new Date(now.getTime() - GIORNI_INDIETRO * giorno).toISOString())
          .lte("datetime", new Date(now.getTime() + GIORNI_AVANTI * giorno).toISOString())
          .not("title", "ilike", "%[PABLO]%");

        const eventi = (perBattiti ?? []).map((e) => ({
          id: e.id as string,
          title: (e.title as string) ?? "",
          type: ((e.type as string) ?? "").toLowerCase(),
          datetime: (e.datetime as string) ?? null,
          beats: ((e.enrichment as { beats?: Record<string, string> } | null)?.beats) ?? null,
        }));

        const battito = battitoDaNotificare(eventi, oraDiRoma, now);
        // `onceToday` si chiama SOLO se c'è davvero qualcosa da mandare:
        // altrimenti un giro a vuoto alle 13 brucerebbe anche quello delle 19.
        if (battito && (await onceToday("battiti"))) {
          await blast(battito.frase, `${battito.azione.etichetta} →`, "/");
          // "notificato" nel registro dell'evento, a fusione: enrichment tiene
          // anche il testo dell'AI e la foto del luogo, che non si toccano.
          const riga = (perBattiti ?? []).find((e) => e.id === battito.eventoId);
          const attuale = (riga?.enrichment as Record<string, unknown> | null) ?? {};
          const beats = { ...((attuale.beats as Record<string, string>) ?? {}), [battito.chiave]: "notificato" };
          await sb.from("tickets").update({ enrichment: { ...attuale, beats } }).eq("id", battito.eventoId);
        }
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
        await blast(`Tra ${Math.round(minsTo)} min: ${t.text}`, "Promemoria to-do ✅", `/?day=${today}`);
        await sb.from("todos").update({ reminded_at: now.toISOString() }).eq("id", t.id);
      }

      // Seconda notifica (se attiva e ha senso: anticipo > 15): a ridosso.
      if (t.double_reminder === true && lead > 15 && !t.reminded_imminent_at && minsTo <= 15 && minsTo > 0) {
        await blast(`Tra poco: ${t.text}`, "Ci siamo quasi", `/?day=${today}`);
        await sb.from("todos").update({ reminded_imminent_at: now.toISOString() }).eq("id", t.id);
      }
    }
  }

  return NextResponse.json({ ok: true, hour, sottoscrizioni: (subs ?? []).length, inviate, scadute, fallite });
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
