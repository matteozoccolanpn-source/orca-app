# Keiko — Stato attuale e TODO aperti

> Snapshot per ripartire (anche in una nuova chat). I ragionamenti di dettaglio sono in
> `BUSSOLA-E-ROADMAP.md`, `SPEC-PIANIFICATORE.md`, `ROADMAP-AL-LANCIO.md`.
> Aggiornato il 2026-07-03 (sera: barra to-do fatta, nuovo backlog in fondo).

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
- **#21 Barra TODO per-giorno — FATTA** (2026-07-03): tabella `todos` + API + overlay collegato
  (spunta/stella/elimina/aggiungi), orario dal testo (`lib/todo-time.ts`) con chip modificabile,
  notifica push 30 min prima via `/api/cron/tick`, luogo vero risolto da Claude web-search
  (`lib/todo-place.ts`, chip Maps/Chiama), titolo riscritto pulito, eventi del giorno
  nell'overlay, calendario mensile in app-bar, swipe-elimina sulle card evento.

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

## Backlog 2026-07-03 (analisi dei 7 punti di Matteo)

**A — Viaggi: "il plot vive"** (punti 3+4+7 — priorità 1, "potenziamo molto")
- A0 *(bug, piccolo)*: il plot si è fumato l'HOTEL → verificare che trip-enrich riceva
  e usi i ticket hotel come ancora del piano.
- A1 *(medio)*: evento nuovo dentro le date di un viaggio → il plot si aggiorna da solo
  (o propone "aggiorna plot" sulla card).
- A2 *(medio)*: modifica TESTUALE di un singolo item dell'itinerario ("sposta il museo
  al pomeriggio") → Claude riscrive solo quello slot, non tutto il piano.

**B — Notifiche to-do regolabili** (punto 1 — piccolo, chiude il tema appena fatto)
- Anticipo per-todo (15/30/60/120 min) e scelta notifica singola o doppia (come gli eventi).

**C — Eventi smart tipo F1** (punto 2 — medio-piccolo)
- Riconoscere l'evento sportivo (es. GP Gran Bretagna), info minime + link classifica
  mondiale. Poi versione "in stile Keiko" più avanti.

**D — Categorie per uso** (punto 5 — medio)
- Sezioni home (Dieta, Allenamento, To-do, e future) ordinate per uso settimanale
  + reminder se una categoria dorme 1-2 settimane. Serve un minimo di tracking uso.

**E — UI/UX** (punto 6) → già coperto da #20 (redesign completo), si fa in altra sede.

**F — Watchlist "Da guardare"** (idea 2026-07-03, ispirata a TV Time)
- Sezione film/serie da vedere: aggiunta rozza ("quel film di Nolan") → Claude risolve
  titolo esatto + dove vederlo in streaming/TV + link. Spunta "visto".
- v2: uscite nuove stagioni/film in sala → notifica. Riusa il pattern resolver dei to-do.

FATTI (2026-07-03 sera): A0 ✅ A1 ✅ A2 ✅ B ✅ C ✅ (+ fix fuso orario +2h,
to-do eventi smart con info TV e classifica, ordine orario, add in background).
Restano: **D** (serve mini-piano tracking uso) e **F** (watchlist).

⚠️ Aperto: chi schedula /api/cron/tick ogni ~15 min? vercel.json ha solo reminders 7:00.

**F FATTA** (2026-07-03 sera): sezione "Da guardare" (card home + /guarda, consigli AI
con catalogo cache 2 fasi, visto/elimina). v2 segnata: notifiche uscite (stile TV Time).

## ROADMAP AL TEST (fidanzata e amici) — decisa con Matteo 2026-07-03

Quattro macro-momenti, in quest'ordine:

**1A. UI da rifare completamente** (IL blocco n.1 — merita una chat dedicata)
Metodo scelto: niente Figma, si lavora in Claude con processo a 3 passi:
  1. Moodboard: Matteo porta screenshot di 3-4 app che ama + parole chiave spirito Keiko
     + cosa odia dell'attuale.
  2. 2-3 concept alternativi come mockup HTML usa-e-getta → si sceglie il mood.
  3. Design system (token, tipografia, componenti) → migrazione UNA PAGINA PER VOLTA
     su branch separato (Keiko attuale resta usabile).
**1B. Le "99 migliorie"**: lista di piccoli fix su tutte le sezioni — si apre DOPO
     il concept vincente, si lavora verso la fine del redesign.

**2. Privacy** (lezione ad hoc: GDPR, informativa, dati→Claude/Anthropic, cancellazione).
   Gemella del login: la protezione vera è la RLS per-utente.
   Qui dentro anche il consolidamento tecnico: cron tick, coda plot >60s.

**3A. Login multi-utente**: user_id su tutte le tabelle + RLS per utente + policy.
**3B. Profilo/personalizzazione**: tabella profile (gusti/preferenze) iniettata nei
     prompt dei resolver → consigli tarati sulla persona.
**3C. Onboarding primo accesso**: spiegazione/utilizzo per chi si iscrive.
