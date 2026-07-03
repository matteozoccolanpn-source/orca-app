# Keiko — Stato attuale e TODO aperti

> Snapshot per ripartire (anche in una nuova chat). I ragionamenti di dettaglio sono in
> `BUSSOLA-E-ROADMAP.md`, `SPEC-PIANIFICATORE.md`, `ROADMAP-AL-LANCIO.md`.
> Aggiornato il 2026-07-03.

## Dove siamo
Alpha single-user **funzionante e in produzione**. Il **pianificatore di viaggi** gira
end-to-end: input voce/testo/immagine → parsing (città + date giuste) → rilevamento viaggi
(incastri) → generazione itinerario con web-search (logistica reale + fonti) → card "Plot"
in home con bottone "Crea plot" → pagina `/viaggio` (sequenza, dettagli, alternative
scambiabili, messaggio, link Maps). Metodo di lavoro: "leggi → capisci → modifica piccola",
build verde prima di ogni commit, non committare senza ok di Matteo.

## Fatto ✅
- Pipeline pianificatore completa (rilevamento, fase pesante web-search, auto-generazione via
  endpoint separato `/api/trip/generate`, UI `/viaggio` + card Plot).
- Campo `city` nel parser + colonna; data odierna al parser (fix anni sbagliati).
- Pipeline testo nel drawer `CaptureSheet`; link Google Maps sugli eventi.
- Tabella `trip_plans` (+ permessi/RLS); guardrail viaggi lunghi (≥7 giorni no auto).
- Doc: bussola/roadmap, spec pianificatore, roadmap-al-lancio.

## TODO aperti (dalla task list)

**Pianificatore — solidità/qualità**
- #7 Stati slot (aperto/riempito/bloccato).
- #8 Fase leggera: ri-verifica solo il volatile all'apertura del piano.
- #24 Viaggi multi-città: timeline città-per-data (le tratte interne come ancore).
- #25 Swap attività rifinito (alternative pre-salvate ci sono; UX + fallback "trovami altro").
- (Aperto tecnico: generazione oltre i 60s di Vercel → coda/background vero.)

**Feature nuove**
- #21 **Barra TODO per-giorno** (ora placeholder) — PROSSIMO STEP, vedi sotto.
- #22 Carica itinerario dell'utente (testo → stesso schema `plan`, + arricchimento).
- #28 Barra chat "Chiedi a Keiko" (assistente conversazionale) — feature avanzata, DOPO
  privacy+login. È anche la superficie dei viaggi lunghi/multi-città.

**Palestra**
- #16 Scambio allenamenti (pattern swap come la dieta).
- #17 Spunta settimanale + auto-riprogramma se ti alleni in un altro giorno.
- #18 Report mensile (bassa priorità).

**UI / qualità**
- #20 Redesign completo UI/UX (fase finale; blocco n.1 secondo Matteo).
- #27 Pull-to-refresh sulla home.

**Pulizia / verifica**
- #11 Verifica finale: `npm run build` + test con input di prova.
- #12 Cleanup schema morto: `trips` + `tickets.trip_id` (fase sistemazione).

## Fondamenta mancanti (dal ROADMAP-AL-LANCIO)
Il vero salto verso "prodotto": **privacy totale + login/multi-utente** (user_id su tutte le
righe + RLS per utente + policy dati/GDPR + quote costi API). Senza, non entra nessun estraneo.

## Prossimo step scelto: #21 — Barra TODO in Keiko
Cos'è: la barra to-do per-giorno che si apre dalla striscia dei giorni in alto (ora è solo UI
finta). Serve renderla vera.
- **Dati**: nuova tabella Supabase `todos` (id, user_id, day date, text, done bool, star bool,
  created_at). Additiva.
- **API**: aggiungere / spuntare / eliminare / stellare un todo.
- **UI**: in `app/components/HomeView.tsx` collegare `TodoOverlay` e `TodoRow` ai dati veri
  (oggi usano `MOCK_TODOS`); il badge arancione sui giorni (`WeekStrip`/`countByDay`) può
  contare i todo oltre agli eventi.
- **Auth**: resta auth-guarded come il resto.
