# Keiko — Gap analysis per l'integrazione AI al 100%
> Cosa manca, lato programmazione, per rendere reale tutto ciò che la demo mostra.
> Base attuale: Next.js App Router + Supabase, pipeline input→Claude→evento, todos con
> resolver luogo/orario, trip planner con web-search, push, cron reminders 7:00.
> Scritto il 2026-07-04. Le voci con (✅ parz.) esistono in forma parziale.

## 1 · Assistente "Chiedi a Keiko" (il cervello conversazionale)
1. Endpoint `/api/ask` con streaming (SSE) — oggi la barra non esiste nel codice.
2. **Tool use / function calling**: definire gli strumenti che Claude può usare — `crea_evento`, `sposta_evento`, `elimina_evento`, `crea_todo`, `leggi_agenda(range)`, `sposta_pasto`, `sposta_allenamento`, `cerca_watchlist`.
3. Router di intenti: distinguere domanda ("cosa guardo stasera?") da comando ("sposta la cena") da ricerca ("cena" → filtro eventi, già simulata in demo).
4. Iniezione contesto: eventi prossimi 7 giorni + todos + dieta/allenamento di oggi nel prompt, con budget token misurato.
5. Tabella `chat_messages` (id, user_id, role, content, tool_calls, created_at) per lo storico "Di recente".
6. Conferma obbligatoria lato UI per azioni distruttive richieste in chat (elimina/sposta) — mai auto-eseguite.
7. Suggerimenti contestuali generati (i placeholder rotanti): job che li ricalcola da agenda reale, non hardcoded.
8. Prompt di sistema con la voice di Keiko (due registri: amichevole di default, serio per disruzioni) — file versionato in `lib/prompts/`.
9. Quota e contatore costi per utente (tabella `usage`: tokens in/out per giorno) con hard-limit.
10. Gestione errori/fallback: modello non risponde → risposta canned + retry con backoff.
11. Tracing: log di ogni run (prompt, tools chiamati, latenza) per debug — anche solo tabella `ai_logs`.
12. Ricerca ibrida nella barra: prima match locale sugli eventi (istantaneo), poi Claude se non trova — come in demo.

## 2 · Pipeline di ingestione (testo · foto · voce)
1. (✅ parz.) Unificare i prompt di parsing testo/immagine in un modulo unico `lib/parse-event.ts` (oggi logica in `/api/upload` + CaptureSheet).
2. **Voce**: registrazione in-app (MediaRecorder) + endpoint STT (Whisper API) → stesso parser del testo.
3. Coda asincrona vera (Inngest/QStash/Supabase queues) per superare i 60s di Vercel — TODO aperto del planner, vale per tutto.
4. Multi-evento da un solo input ("volo venerdì e hotel sabato") → il parser deve restituire un array.
5. Validazione schema con zod su TUTTO ciò che torna da Claude prima di scrivere su DB.
6. Idempotenza/dedup: hash dell'input per non creare doppioni se l'utente riprova.
7. Colonna `source` (screenshot/testo/voce/make) + `raw_input` su `tickets`: serve anche alla UI ("da screenshot").
8. Ingestione PDF (biglietti aerei) — oggi solo immagini.
9. Canale email-in (inoltra la conferma a keiko@…) via webhook (Resend/Mailgun inbound).
10. Correzione conversazionale post-parse: "non è alle 6, è alle 16" → update mirato via tool use (riusa cap. 1).
11. Stato di elaborazione visibile (pending/parsing/done/failed) con retry manuale — la demo mostra lo shimmer, serve il vero stato.

## 3 · Resolver e dati esterni (le card "vive")
1. **TMDB** per la watchlist: titolo fuzzy → poster, anno, runtime; gratuito, chiave server-side. (`lib/films.ts` da estendere)
2. **Dove vederlo**: TMDB watch/providers (dati JustWatch) per "su Netflix/Sky".
3. **Classifiche sport**: Ergast/Jolpica per F1, API-Football per Serie A → sostituisce i link statici di `standingsUrl`.
4. **Meteo a destinazione**: Open-Meteo (senza chiave) per "a Roma 24°" su treni/voli/viaggi.
5. **"Esci alle X"**: Google Routes/Directions con orario di arrivo target → calcolo reale di quando uscire (oggi è statico).
6. Stato treno/volo realtime (ViaggiaTreno non ufficiale / aviationstack) per "binario aggiornato 2 min fa" e ritardi.
7. Check-in volo: niente API pubblica Ryanair → promemoria smart con deep-link alla app compagnia + carta d'imbarco da screenshot (pipeline cap. 2).
8. (✅ parz.) `todo-place`: mettere cache dei luoghi risolti (tabella `places_cache` con TTL) — oggi ogni risoluzione paga una chiamata.
9. Tabella `resolver_cache` generica (key, payload, expires_at) condivisa da tutti i resolver.
10. Colonna `enriched_at` su ogni dato arricchito → alimenta i timestamp "aggiornato X min fa" della UI.
11. Fallback grafico quando il resolver fallisce (gradiente categoria, come in demo) — mai card rotte.

## 4 · Notifiche e lavori in background
1. **Chi schedula `/api/cron/tick`**: Vercel Cron ogni 15 min (o QStash) — ⚠️ aperto dichiarato in STATO-E-TODO.
2. Anticipo notifica configurabile per EVENTI (per i todo c'è): 15/30/60/120 + doppia notifica.
3. Digest del mattino (7:00, esiste `cron/reminders`) arricchito: la frase del kicker ("Oggi si va a Roma…") generata da Claude.
4. Notifiche watchlist: nuova stagione/uscita in sala (TMDB changes) — v2 già segnata nel backlog F.
5. Auto-riprogramma allenamento se salti il giorno (TODO #17) — job serale.
6. Deep link dalla notifica alla card giusta (query param → apre il pannello evento).
7. "Il plot vive": evento nuovo dentro le date di un viaggio → job che propone l'aggiornamento (A1, fatto lato logica — manca la notifica).
8. Retry e log invii push falliti (tabella `push_log`); pulizia subscription morte.
9. Quiet hours (niente push 23–7 tranne critici).
10. Notifica "in viaggio": il giorno dell'evento, aggiornamenti binario/ritardo (dipende da 3.6).

## 5 · Dati e Supabase
1. **`user_id` su tutte le tabelle + RLS per utente** — il prerequisito del multi-utente (roadmap 3A).
2. Tabella `profiles`: nome, saluto, personalità colore scelta, anticipo notifiche, tema.
3. Tabelle chat (cap. 1.5) e usage (cap. 1.9).
4. Colonne `source`, `updated_at`/`enriched_at` su `tickets` (per UI credibile).
5. `deleted_at` (soft delete) → "puoi sempre ripescarlo chiedendolo a Keiko" deve essere vero.
6. Cleanup schema morto: `trips`, `tickets.trip_id`, residui Airtable (`lib/airtable.ts`) — TODO #12.
7. Migrazioni versionate (supabase/migrations) — oggi cambi schema a mano.
8. Indici: `tickets(datetime)`, `todos(day)`, `trip_plans(start_date)`.
9. Export dati utente (JSON) — richiesto da GDPR e utile alla demo di fiducia.
10. Seed script con i dati demo (la giornata "Roma con Giulia") per ambienti di test.

## 6 · Frontend: portare la demo nell'app
1. Design tokens da `keiko-final.html` → `globals.css` (colori 2 mood, scala 11-24, radius, --gap).
2. Sistema personalità: 3 palette in `profiles`, CSS vars su `<body>`, swatch nella futura user page.
3. Componenti nuovi: `EventPanel` (adattivo+full), `AgendaView`, `DayPanel`, `AskSheet`, `AddSheet`, `ShareSheet`, `ConfirmSheet`, `SectionView`.
4. Morph/parallax/reveal con Framer Motion (già in dipendenze) — IntersectionObserver per l'accensione progressiva.
5. Tab bar nuova con FAB centrale → route: `/` `/salute` `/allenamento` `/guarda` + panel overlay.
6. Swipe reali su touch: to-do (destra/sinistra), ritorno dal bordo, pull-to-refresh (#27) — nella demo sono pointer events, in app servono con inerzia (framer/use-gesture).
7. Ask UI con streaming token-by-token e stati (pensando → strumento → risposta).
8. Skeleton a dimensioni fisse per ogni card (regola 13 approvata).
9. Persistenza mood/personalità (localStorage + profilo).
10. Accessibilità: focus visibile ovunque, aria-label su icone, tap ≥44px, contrasto AA sui testi secondari.
11. Migrazione UNA pagina per volta su branch `redesign` (Keiko attuale resta usabile) — metodo già deciso.
12. Badge tab dinamici (novità watchlist, giorno di gara) da dati veri.

## 7 · Auth, privacy, costi
1. Login multi-utente Google (togliere il vincolo single-user in NextAuth).
2. RLS per-utente attiva su ogni tabella (gemella del login).
3. Informativa privacy + pagina consenso (dati → Anthropic/Claude, resolver esterni).
4. Cancellazione account: wipe dati + revoca push + conferma.
5. Quota costi API per utente con blocco morbido ("Keiko riposa fino a domani").
6. Rate limiting sugli endpoint pubblici (upload, ask) — middleware.
7. Secrets audit: nessuna chiave nel client (già regola), rotazione documentata.
8. Log accessi/azioni sensibili (eliminazioni, export).
9. Termini d'uso + pagina "come funziona Keiko" per l'onboarding (roadmap 3C).
10. Header di sicurezza (CSP, HSTS) su Vercel.

## 8 · Qualità e DevOps
1. Unit test su `lib/` (todo-time, parse-event, incastri) — oggi zero test.
2. E2E Playwright sui 3 flussi chiave: aggiungi da testo, apri evento, spunta to-do.
3. CI: build + lint + test su ogni PR (GitHub Actions).
4. Error tracking (Sentry) client+server.
5. Analytics d'uso per categoria (serve al punto D del backlog: sezioni ordinate per uso).
6. Feature flag semplici (env/tabella) per rilasciare il redesign a pezzi.
7. Ambiente staging su Vercel con Supabase branch.
8. Monitoraggio cron (dead man's switch: se tick non gira da 1h, avvisa).
9. Budget dashboard: costi Claude/resolver per settimana.
10. Documentazione viva: STATO-E-TODO aggiornato a ogni merge (già abitudine, formalizzarla).

---
**Ordine consigliato** (dipendenze): 5.1 RLS+user_id → 1 (Ask con tool use) → 2.2-2.3 (voce+coda)
→ 3 (resolver con cache) → 4.1 (cron tick) → 6 (redesign pagina per pagina) → 7 → 8 in parallelo.
