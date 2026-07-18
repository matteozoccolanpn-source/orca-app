# Keiko — Piano di lancio (master roadmap)

> Unisce: bug della review Chrome (voto 6.2/10), i 20 miglioramenti (MIGLIORAMENTI.md),
> e ciò che è già fatto. Ordine: prima chiudere i bug che fanno perdere fiducia, poi
> coerenza/stato, poi completare le funzioni, infine completezza e lancio.
> Legenda: ⚡ veloce · 🔨 medio · 🏗️ grosso.

## ✅ GIÀ FATTO
Redesign home v4 · pannello evento (modifica/elimina/calendario/maps/condividi) ·
pannello giorno + to-do (anticipo/doppio) · ricerca "Chiedi a Keiko" · calendario + profilo ·
foto reali (Spotify/TMDB/Places/Unsplash/Spoonacular) + meteo · login PWA (no più "accedi" ad
ogni apertura) · to-do di oggi in home · dieta che ruota (D1) · serie TV in ricerca poster (G1) ·
prompt AI che non inventa date (X7) · **redesign sottopagine v4** (nero caldo + ambra + nav sempre visibile).

---

## 🔴 FASE A — BUG BLOCCANTI (fiducia) — DA FARE SUBITO
Sono i punti dove un utente decide se fidarsi. Review li lega alla prima tranche d'investimento.
- **A1.** Freeze totale della UI sulle chiamate AI ("Consiglio di Keiko" bloccava >60s). Tutte le chiamate AI async non bloccanti, spinner locale, **timeout ~15s**, stato d'errore. 🔨
- **A2.** 503 ricorrenti su prefetch RSC (`/?_rsc=...`) ad ogni navigazione. Verificare config Vercel/prefetch, retry, monitorare. 🔨
- **A3.** 404 di default Next.js (fuori brand). Creare `not-found.tsx` + `error.tsx` in-brand (nero caldo + ambra + "Torna alla home"). ⚡
- **A4.** Vicoli ciechi: "Vedi biglietto" (Viaggio, va a `/?v2#ev=`) e "Dove vederlo" (Guarda, toast e poi nulla) → esito reale o **stato vuoto onesto**. 🔨

## 🟠 FASE B — STATO & COERENZA (rotture visibili)
- **B1.** "Fatto oggi" vs spunta esercizio: doppio meccanismo per lo stesso stato + toast "Riaperto" + streak che scende. Unificare in **un solo toggle** coerente (badge + streak). 🔨
- **B2.** Idempotenza + undo: doppioni sui to-do (doppio submit) → **debounce**; conferma d'aggiunta; "Annulla" (toast undo) su aggiungi/elimina/completa. 🔨
- **B3.** Plurali ("1 evento" non "1 eventi", "1 fatto") + "oggi" hard-coded → **data reale del giorno aperto** ("Nessun promemoria per mer 22"). ⚡
- **B4.** Dato fantasma "Slot eliminato" (Viaggio) resta in lista → rimuovere davvero. 🔨
- **B5.** Classificazione temporale: evento passato mostrato in "In arrivo" → **escludere le date passate** (lega a X7/dati demo). ⚡
- **B6.** Metadati: "The Bear" = **serie** non film → rilevare tipo film/serie da TMDB al salvataggio (completa G1). 🔨
- **B7.** CTA viola nei modali/chip attivi → **un solo accento ambra** ovunque (il viola non è in palette). ⚡
- **B8.** Contrasto chip "Scambia alimento" (Dieta): i non selezionati sono illeggibili → alzare il contrasto. ⚡
- **B9.** Routing: `/sport` dà 404 (la sezione è `/allenamento`) → redirect o naming coerente. ⚡

## 🟡 FASE C — COMPLETARE LE FUNZIONI (i 20 miglioramenti)
### 🍿 Guarda
- **G2.** Scheda film/serie: trama a scomparsa, cast, anno, genere. 🔨
- **G3.** "Dove vederlo" in Italia (piattaforme via TMDB) — *= fix A4/Guarda*. 🔨
- **G4.** Memoria visti/cercati → categorie → "titoli simili". 🏗️
### 💪 Allenamento
- **A-1.** Cronometro/timer di sessione + monitoraggio. 🔨
- **A-2.** Target e risultati per esercizio (kg, passo) + storico progressi. 🏗️
- **A-3.** Immagini esercizi affidabili (ExerciseDB) al posto di wger. 🔨
- **A-4.** Riepilogo settimana (volume, giorni, streak). 🔨
### 🥗 Dieta
- **D2.** Macro e calorie per pasto + totale giornaliero. 🔨
- **D3.** Vista giornata completa dei pasti + lista spesa. 🔨
### 📅 Eventi & To-do
- **E1.** Foto/illustrazione per OGNI tipo (anche "lezione inglese", "visita nutrizionista"). 🔨
- **E2.** To-do "vedi gara/partita" arricchiti come i film. 🔨
- **E3.** Sport: arricchimento squadra/partita (risultato, orario, dove vederla). 🔨
- **E4.** "Quando uscire": tempo di viaggio (Google Directions) + meteo. 🏗️
### 🎛️ Trasversali
- **X2.** Meteo nell'header home per la tua città (dipende da X3). ⚡
- **X3.** Profilo/impostazioni: nome, **città** (per meteo), unità, anticipo default, tema. 🔨
- **X4.** Stati di caricamento (skeleton) su dati e foto. ⚡
- **X5.** Flusso "+": anteprima evento prima di salvare + conferma. 🔨
- **X6.** Onboarding primo avvio (città, dieta, allenamento) → usabile senza setup. 🏗️
- **X8.** Meteo più robusto (ricavare la città anche da un indirizzo/venue). 🔨

## 🟢 FASE D — COMPLETEZZA (cosa manca, dalla review)
- **D-a.** Vista **mese / agenda**. 🏗️
- **D-b.** **Notifiche reali** attive (motore già pronto; manca lo scheduler — cron esterno). 🔨
- **D-c.** **Ricorrenze / abitudini** (palestra, pasti ricorrenti). 🔨
- **D-d.** **Monitoraggio errori** (Sentry) + retry/backoff sulle chiamate. 🔨

## 🚀 FASE E — LANCIO
- Collaudo completo su device · dati demo puliti · onboarding (X6) attivo · deploy finale.

---

## 🎯 ORDINE CONSIGLIATO
1. **FASE A** (blocca-fiducia): A1 freeze AI → A3 404 → A4 vicoli ciechi → A2 503.
2. **FASE B** (coerenza): B7 ambra + B3 plurali/date + B5 passati + B1 allenamento + B2 undo/doppioni, poi B4/B6/B8/B9.
3. **FASE C** a blocchi, partendo da: G3 (dove vederlo) · X3+X2 (profilo+meteo) · X4 (skeleton) · A-1 (timer) · D2 (macro).
4. **FASE D** completezza · **FASE E** lancio.

> Tre cose che la review dice di NON toccare (funzionano e sono il valore vero):
> "Chiedi a Keiko", il "+" con parsing AI, e l'AI di Viaggio/Dieta (avviso doppia prenotazione, scambio alimento).
