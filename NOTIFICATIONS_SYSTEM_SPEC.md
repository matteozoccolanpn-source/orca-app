# 🔔 Sistema notifiche OrCa/Keiko — spec di implementazione

> Estende il Web Push già funzionante (Blocco 1.1). Tre tipi di notifica + uno scheduler
> che gira ogni 15 minuti. Da implementare in Claude Code: codice e SQL pronti qui sotto.

## 0. Cosa esiste già
- Web Push funzionante: tabella `push_subscriptions`, chiavi VAPID, `lib/push.ts` (`sendPush`),
  pulsante on/off. Route invio cron base `/api/cron/reminders` (verrà sostituita da `/tick`).
- Tabella `tickets` con `datetime`, `type`, `title`, `location`.

## 1. Le tre notifiche

### (i) Mattutina — 09:00 — "la tua giornata"
Digest degli eventi di **oggi**. Es: *"Oggi: 20:30 Inglese con Valentina. Buona giornata."*
Se non c'è nulla oggi → non inviare (niente notifiche vuote).

### (ii) Pre-evento — anticipo per tipo
Un reminder "preparati" con anticipo diverso per categoria:

| Tipo (`type`) | Anticipo |
|---|---|
| `flight` | **240 min** (4 h) |
| `train` | **60 min** (1 h) |
| `hotel` | **nessun pre-evento** (solo nel recap mattutino) |
| `concert` | **180 min** (3 h) |
| `restaurant` | **pranzo 60 / cena 90 min** — *pranzo se ora < 16:00, cena se ≥ 16:00* |
| `museum` | **60 min** |
| altro / default | **60 min** |

### (ii-bis) "Sta per iniziare" — 30 min prima (per TUTTI gli eventi)
La sostituzione PWA della card-Wallet (quella vera = app nativa, in roadmap). Push a **30 min**
dall'inizio: *"Tra 30 min: Inglese con Valentina."* Resta nel centro notifiche finché non la scarti.
- Per non raddoppiare sugli eventi con anticipo ≤ 60 min (treno/museo/altro/pranzo): invia la
  "sta per iniziare" **solo se l'anticipo del tipo è ≥ 120 min** (volo, concerto, cena). Per gli
  altri basta il reminder per tipo. *(Soglia regolabile.)*

### (iii) Serale — 21:00 — "hai aggiunto tutto?"
Nudge per catturare nuovi eventi: *"Hai prenotato o comprato qualcosa oggi? Aggiungilo a OrCa."*
→ tap apre `/add`. **Solo se quel giorno non è stato aggiunto nessun evento** (controlla
`tickets.created_at` di oggi) → niente assillo.

> **Fuso orario:** tutti gli orari in **Europe/Rome**.

## 2. Schema (SQL — lancia in Supabase)
```sql
-- guardie anti-doppio-invio sul pre-evento
alter table tickets add column if not exists reminded_lead_at     timestamptz;
alter table tickets add column if not exists reminded_imminent_at timestamptz;

-- dedup degli invii giornalieri (mattina/sera): una riga per tipo e giorno
create table if not exists notification_runs (
  id        uuid primary key default gen_random_uuid(),
  kind      text not null,         -- 'morning' | 'evening'
  run_date  date not null,
  created_at timestamptz default now(),
  unique (kind, run_date)
);
alter table notification_runs enable row level security;
grant all privileges on table notification_runs to service_role, anon, authenticated;
```
> Nota: in questo progetto `service_role` non eredita i grant in automatico — ricordarsi il
> `grant` (è già incluso sopra) anche su eventuali tabelle nuove.

## 3. Route unica `/api/cron/tick` (GET, protetta da CRON_SECRET)
Sostituisce `/api/cron/reminders`. Gira ogni 15 min e fa tutto:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPush } from "@/lib/push";

const TZ = "Europe/Rome";

// anticipo (minuti) per tipo
function leadMinutes(type: string, hourLocal: number): number | null {
  switch ((type || "").toLowerCase()) {
    case "flight":     return 240;
    case "train":      return 60;
    case "hotel":      return null;            // niente pre-evento
    case "concert":    return 180;
    case "restaurant": return hourLocal < 16 ? 60 : 90; // pranzo/cena
    case "museum":     return 60;
    default:           return 60;
  }
}

function romeHour(d: Date): number {
  return Number(new Intl.DateTimeFormat("it-IT", { hour: "2-digit", hour12: false, timeZone: TZ }).format(d));
}
function romeParts(d: Date) {
  const f = new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  return f.format(d); // "HH:MM"
}

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const now = new Date();
  const hour = romeHour(now);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now); // YYYY-MM-DD

  const { data: subs } = await sb.from("push_subscriptions").select("endpoint, p256dh, auth");
  const targets = subs ?? [];
  const blast = async (title: string, body: string, url = "/") => {
    for (const s of targets) {
      try { await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, { title, body, url }); }
      catch { await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint); }
    }
  };

  // helper: invia una volta al giorno (dedup via notification_runs)
  const onceToday = async (kind: string) => {
    const { error } = await sb.from("notification_runs").insert({ kind, run_date: today });
    return !error; // se errore = già inviato oggi (unique)
  };

  // ---- (i) MATTINA 09:00 (finestra 09:00–09:14) ----
  if (hour === 9 && (await onceToday("morning"))) {
    const start = new Date(`${today}T00:00:00`), end = new Date(`${today}T23:59:59`);
    const { data: oggi } = await sb.from("tickets").select("title, datetime")
      .gte("datetime", start.toISOString()).lte("datetime", end.toISOString())
      .not("title", "ilike", "%[PABLO]%").order("datetime");
    if (oggi && oggi.length) {
      const body = oggi.map(e => `${romeParts(new Date(e.datetime))} · ${e.title}`).join("\n");
      await blast(`Oggi hai ${oggi.length} cose`, body);
    }
  }

  // ---- (iii) SERA 21:00 — solo se oggi non hai aggiunto nulla ----
  if (hour === 21 && (await onceToday("evening"))) {
    const { count } = await sb.from("tickets").select("id", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00`);
    if (!count) await blast("Hai aggiunto tutto?", "Prenotato o comprato qualcosa oggi? Aggiungilo a OrCa.", "/add");
  }

  // ---- (ii) PRE-EVENTO + (ii-bis) 30 min prima ----
  // prendi eventi futuri entro le prossime ~5 ore (copre il volo a 4h)
  const horizon = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const { data: prossimi } = await sb.from("tickets")
    .select("id, title, type, datetime, reminded_lead_at, reminded_imminent_at")
    .gt("datetime", now.toISOString()).lt("datetime", horizon.toISOString())
    .not("title", "ilike", "%[PABLO]%");

  for (const e of prossimi ?? []) {
    const start = new Date(e.datetime);
    const minsTo = (start.getTime() - now.getTime()) / 60000;
    const lead = leadMinutes(e.type, romeHour(start));

    // reminder per tipo (entro la finestra del tick di 15 min)
    if (lead != null && !e.reminded_lead_at && minsTo <= lead && minsTo > lead - 15) {
      await blast(`Tra ${Math.round(minsTo)} min: ${e.title}`, "Preparati 🙂", "/");
      await sb.from("tickets").update({ reminded_lead_at: now.toISOString() }).eq("id", e.id);
    }

    // "sta per iniziare" a 30 min, solo per eventi con lead >= 120 (volo/concerto/cena)
    if (lead != null && lead >= 120 && !e.reminded_imminent_at && minsTo <= 30 && minsTo > 15) {
      await blast(`Tra 30 min: ${e.title}`, "Sta per iniziare", "/");
      await sb.from("tickets").update({ reminded_imminent_at: now.toISOString() }).eq("id", e.id);
    }
  }

  return NextResponse.json({ ok: true, hour });
}
```
> Logica delle finestre: il tick gira ogni 15 min, quindi confrontiamo `minsTo` con la soglia
> in una finestra di 15 min e usiamo `reminded_*_at` per non ripetere.

## 4. Scheduler — ogni 15 minuti
Vercel Hobby fa cron solo 1×/giorno, quindi serve un tick frequente. **Consigliato: Supabase
pg_cron** (autonomo, gratis, già in casa — nessun servizio esterno). SQL una tantum:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'orca-tick', '*/15 * * * *',
  $$ select net.http_get(
       url    := 'https://orca-app-zeta.vercel.app/api/cron/tick',
       headers:= jsonb_build_object('Authorization', 'Bearer IL_CRON_SECRET')
     ); $$
);
```
> Sostituire `IL_CRON_SECRET` col valore reale (resta nel DB, lato server). Alternativa più
> semplice ma con dipendenza esterna: un pinger gratuito tipo cron-job.org che colpisce la
> stessa URL ogni 15 min con lo stesso header.

## 5. Roadmap (versione nativa)
- **Card viva stile Wallet / Live Activity / Dynamic Island**: richiede **app nativa iOS**
  (ActivityKit), impossibile da PWA. Da fare in Fase 3. Servirà anche una **durata** evento
  (o default per tipo) per il "fino a 30 min dopo la fine".
- Preferenze notifiche per utente (anticipi personalizzabili) → con Supabase Auth (Blocco 3).

## 6. Test
1. Lancia lo SQL dello schema (sezione 2).
2. Implementa `/api/cron/tick`, build, commit, push.
3. Imposta pg_cron (sezione 4) o il pinger esterno.
4. Verifica: chiamando la route con il Bearer giusto risponde `{ok:true}` e, se sei nella
   finestra giusta, arriva la notifica.
