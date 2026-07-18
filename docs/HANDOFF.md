# Keiko — Handoff completo (per la chat nuova)

> Leggi questo file all'inizio della nuova chat: contiene STATO attuale + TUTTO ciò
> che manca, niente escluso. Aggiornato dopo: notifiche accese, design pass sottopagine,
> Fasi A e B chiuse.

## 0. Come lavorare (contesto tecnico)
- Stack: Next.js App Router + TS + Tailwind + Framer Motion; NextAuth v5 (Google, single-user);
  Supabase; deploy su **Vercel da `main`** (produzione = `orca-app-zeta.vercel.app`).
- **Push:** `git add -A && git commit -m "..." && git push origin main` → Vercel fa il deploy.
- **Verifica build:** `npx tsc --noEmit` (il `npm run build` completo si blocca in sandbox per la rete).
- **PWA:** dopo un deploy, sul telefono aggiornare (chiudi/riapri o reinstalla). C'è già
  l'auto-aggiornamento (`components/VersionGuard.tsx` + `/api/version`).
- **Chiavi:** su Vercel → Settings → Environment Variables. Vedi `docs/CHIAVI-API.md`.
  Impostate: TMDB, SPOTIFY_CLIENT_ID/SECRET, GOOGLE_PLACES_API_KEY, SPOONACULAR_KEY,
  UNSPLASH_ACCESS_KEY, VAPID (SUBJECT/PUBLIC/PRIVATE), CRON_SECRET, Supabase.
- **Notifiche:** ✅ ACCESE. `vercel.json` cron giornaliero (07:00) + **cron-job.org** che chiama
  `/api/cron/tick` ogni 15 min (200 OK verificato). CRON_SECRET = `2ae62d1034b35b91d39f4d111b8ec47f42511afa305d565e`.
- Modo di lavoro dell'utente (Matteo, principiante): modifiche piccole e mirate, spiegate in
  italiano semplice, soluzione più semplice, non rifattorizzare file scollegati, tsc deve passare.
- Docs utili: `PIANO-LANCIO.md`, `MIGLIORAMENTI.md`, `CHIAVI-API.md`, `DESIGN-SYSTEM.md`,
  `DESIGN-DA-SISTEMARE.md`.

## 1. GIÀ FATTO ✅
- Redesign Home v4 (default), pannello evento (calendario/maps/condividi/modifica/elimina),
  pannello giorno + to-do (anticipo/doppio), ricerca "Chiedi a Keiko", calendario, profilo (nome+città).
- To-do di oggi in home. Dieta che ruota col momento della giornata.
- **Foto per dominio:** film+serie TMDB (search/multi), artisti Spotify, luoghi Google Places (New API, con proxy),
  città Unsplash, piatti Spoonacular (con traduzione IT→EN via Claude, in cache). Meteo sugli eventi + nell'header (per città).
- **Login PWA** persistente (no ri-login) + auto-aggiornamento PWA.
- **Notifiche** giornaliere + fini (pre-evento, to-do con orario, digest mattino, spinta sera) — accese via cron-job.org.
- **Fase A** (bug blocca-fiducia): freeze AI risolto (spinner+timeout, niente prompt() nativi),
  404/error in-brand, vicoli ciechi chiusi ("Dove vederlo"→JustWatch, "Vedi biglietto" rimosso), home resiliente.
- **Fase B** (coerenza): plurali, "oggi"→data reale, CTA viola→ambra, contrasto chip dieta,
  `/sport`→redirect, anti-doppioni to-do, allenamento stato unico, no slot fantasma, film/serie da TMDB.
- **Design pass sottopagine:** tema nero caldo+ambra ovunque (keiko.css), **barra nav sempre visibile** (`KeikoNav`),
  Guarda = griglia poster 3 col, Dieta = card pasto scure a 2 righe, Allenamento = hero caldo (non blu), Viaggio = timeline.

## 2. DA FARE — NUOVE RICHIESTE (priorità utente)
- **N1. Eventi a >3 mesi NON in home.** In `app/components/keiko/keikoLive.ts`, filtrare hero/upcoming
  entro ~90 giorni da oggi (restano nel calendario/altrove, ma non nella home).
- **N2. Immersività Sport / Dieta / Guarda al livello della Home.** Non liste "vuote": riempire con card
  ricche, foto, "cose" (come la Home). Valutare **BENCHMARK** utili:
  - Dieta: calorie/macro del giorno vs obiettivo; "sei a X% delle proteine".
  - Allenamento: volume/serie vs settimana scorsa; streak; giorni fatti/target.
  - Guarda: quanti visti questo mese; a che punto della lista.
  (Il benchmark dà senso di progresso — sì, utile. Serve una fonte dati per macro: Spoonacular/Edamam.)

## 3. DA FARE — FASE C (i 20 miglioramenti, con stato)
### Guarda
- G1 serie TV ✅ · B6 tipo film/serie da TMDB ✅
- **G2** scheda film/serie: trama a scomparsa, cast, anno, genere (arricchimento come eventi).
- **G3** "Dove vederlo" con le PIATTAFORME italiane (TMDB watch providers IT) — ora è solo un ripiego su JustWatch.
- **G4** memoria visti/cercati → categorie → "titoli simili".
### Allenamento
- **A1** cronometro/timer di sessione + monitoraggio.
- **A2** target e risultati per esercizio (kg, passo) + storico progressi.
- **A3** immagini esercizi affidabili (ExerciseDB via RapidAPI) — wger è debole.
- **A4** riepilogo settimana (volume, giorni, streak). (lega a N2 benchmark)
### Dieta
- D1 ruota col momento del giorno ✅
- **D2** macro e calorie per pasto + totale giornaliero. (lega a N2 benchmark)
- **D3** vista giornata completa dei pasti + lista spesa.
### Eventi & To-do
- **E1** foto/illustrazione per OGNI tipo evento (anche "lezione inglese", "visita nutrizionista"): quando non
  c'è foto reale, illustrazione di categoria dedicata — mai vuoto.
- **E2** to-do "vedi gara/partita" arricchiti come i film.
- **E3** sport: arricchimento squadra/partita (risultato, orario, dove vederla).
- **E4** "quando uscire": tempo di viaggio (Google Directions) + meteo → notifica.
### Trasversali
- X2 meteo header ✅ · X3 profilo+città ✅ (X3 da ampliare: unità, anticipo default, tema).
- **X4** stati di caricamento (skeleton) su dati e foto.
- **X5** flusso "+" (aggiungi): anteprima dell'evento prima di salvare + conferma.
- **X6** onboarding primo avvio (città, dieta, allenamento) → usabile senza setup.
- **X7** date demo: prompt AI sistemato ✅; RESTA da pulire il dato dell'evento demo (cancella e ri-aggiungi "Ultimo"
  così si ri-arricchisce senza la data sbagliata) — azione utente.
- **X8** meteo più robusto (ricavare la città anche da un indirizzo/venue tipo "Stadio San Siro").

## 4. DA FARE — FASE D (completezza)
- **Vista mese / agenda.**
- **Ricorrenze / abitudini** (palestra, pasti ricorrenti).
- **Monitoraggio errori** (Sentry) + retry/backoff. Indagare i **503 su prefetch RSC** (`/?_rsc=`);
  mitigato (home resiliente) ma non risolto — probabile home lenta per troppe fetch esterne: valutare
  cache/streaming/deferire l'arricchimento immagini.

## 5. DA FARE — DESIGN (sistema, dalla review "4 layout diversi")
- **Sistema card UNICO + scala spaziature** `4/8/12/16/24/32`, **radius** 16 (card) / 12 (controlli) / 999 (chip).
  Formalizzarlo in `DESIGN-SYSTEM.md` e applicarlo ovunque (oggi i padding sono a occhio).
- **Header di pagina identico** ovunque (freccia 40×40, titolo sx, 1 metadato dx) — quasi c'è, renderlo pixel-identical.
- **Dieta "prossimi giorni"**: mini-card con testo ammassato → padding 12, altezza fissa, 2 righe con "…" pulito.
- Immersività (= N2).

## 6. FASE E — LANCIO
Collaudo completo su device · dati demo puliti (X7) · onboarding (X6) attivo · deploy finale ·
poi mostrare a fidanzata.

## 7. NON TOCCARE (funzionano, sono il valore vero — dalla review)
"Chiedi a Keiko" (ricerca AI contestuale) · il "+" con parsing in linguaggio naturale ·
l'AI di Viaggio (avviso doppia prenotazione, messaggio pronto) e Dieta (scambio alimento equivalente).

## 8. PROSSIMO PASSO CONSIGLIATO (per la chat nuova)
1. Veloce: **N1** (eventi >3 mesi fuori dalla home) — filtro di 1 riga in keikoLive.
2. Poi **N2 + benchmark**: rendere immersive Sport/Dieta/Guarda con card ricche e un dato di progresso
   (parte da D2 macro per la dieta e A4 riepilogo per l'allenamento).
3. In parallelo, dai i "wow" mancanti: **G3** (dove vederlo piattaforme) e **G2** (scheda film).
