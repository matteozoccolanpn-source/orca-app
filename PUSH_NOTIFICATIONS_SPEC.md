# 🔔 Web Push nativo (PWA) — spec di implementazione

> Blocco 1.1 della roadmap. Notifiche push native, **senza Pushover** (così funzionano
> anche per altri utenti senza installare app esterne). Da implementare in Claude Code:
> il codice qui sotto è pronto, va solo cablato, testato (`npm run build`) e deployato.

## ✅ Già fatto (in Cowork)
- **Chiavi VAPID** generate e salvate in `.env.local`:
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- **Tabella Supabase `push_subscriptions`** creata (con RLS):
  `id, user_id (nullable), endpoint (unique), p256dh, auth, user_agent, created_at`.

## ⚠️ Due avvertenze da sapere prima
1. **iOS**: il Web Push su iPhone funziona **solo se OrCa è installata sulla Home Screen**
   (iOS 16.4+) e l'utente concede il permesso. Su Mac/Android/desktop funziona anche dal browser.
2. **Frequenza cron**: su Vercel piano **Hobby** il cron gira **1 volta al giorno**. Quindi
   parti con un **digest mattutino** ("oggi/domani hai: …"). Per il reminder "X ore prima"
   serve un cron più frequente → piano Pro, oppure un pinger esterno gratis (cron-job.org)
   che colpisce la route ogni 15 min.

---

## 1. Variabili d'ambiente
Aggiungi su **Vercel** (Production) le 4 variabili — i valori VAPID sono in `.env.local`:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (es. `mailto:matteo.zoccolan.pn@gmail.com`)
- `CRON_SECRET` = una stringa casuale (`openssl rand -hex 32`) — protegge la route del cron.

## 2. Dipendenza
```bash
npm install web-push
npm install -D @types/web-push
```

## 3. File da creare

### `public/sw.js` (service worker)
```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "OrCa", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
```

### `lib/push.ts` (invio lato server)
```ts
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type PushPayload = { title: string; body: string; url?: string };

export async function sendPush(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload
) {
  return webpush.sendNotification(sub as never, JSON.stringify(payload));
}
```

### `app/api/push/subscribe/route.ts` (salva la subscription)
```ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await req.json(); // { endpoint, keys: { p256dh, auth } }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: null, // TODO: legare al vero user_id quando arriva Supabase Auth (Blocco 3)
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: req.headers.get("user-agent") ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

### `app/api/cron/reminders/route.ts` (lo scheduler invia il digest)
```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";

export async function GET(req: Request) {
  // Protezione: solo il cron con il segreto può chiamarla
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Eventi nelle prossime 24h, escludendo i test [PABLO]
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
    } catch (err) {
      // 410/404 = subscription scaduta → elimina
      await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return NextResponse.json({ sent });
}
```

### `vercel.json` (scheduler giornaliero)
```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 7 * * *" }
  ]
}
```
> `0 7 * * *` = 07:00 UTC → 09:00 ora italiana (estate). Regola l'orario come preferisci.
> Nota: Vercel passa da sé l'header `Authorization: Bearer <CRON_SECRET>` se `CRON_SECRET`
> è impostata nelle env (comportamento standard dei cron Vercel).

## 4. Lato client — attivare le notifiche
Aggiungi un **pulsante "Attiva notifiche"** (es. nella pagina profilo, Blocco 1.2) che chiama:
```ts
function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function enableNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("Notifiche non supportate su questo dispositivo/browser.");
    return;
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  });
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  alert("Notifiche attivate ✅");
}
```

## 5. Test
1. `npm run build` (verifica che compili) → deploy.
2. Apri l'app, premi "Attiva notifiche", concedi il permesso. (Su iPhone: prima "Aggiungi a Home", poi apri da lì.)
3. Verifica che in Supabase `push_subscriptions` compaia 1 riga.
4. Test manuale della route: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<tuo-dominio>/api/cron/reminders` → dovresti ricevere la notifica.
5. Lascia che il cron giri da solo l'indomani mattina.

## 6. Dopo (collegato ad altri blocchi)
- **Blocco 3 (Auth)**: sostituisci `user_id: null` con il vero `user_id` e filtra le
  subscription per utente, così ognuno riceve solo i propri reminder.
- **Per-event timing**: quando vorrai il "2 ore prima" invece del digest, passa a cron
  ogni 15 min (Pro o cron-job.org) e invia solo gli eventi in una finestra stretta,
  tracciando quali hai già notificato (campo `reminded_at` su `tickets`).
