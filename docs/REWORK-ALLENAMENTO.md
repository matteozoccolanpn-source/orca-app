# Rework Allenamento — piano e stato

> Non un rattoppo: la pagina allenamento viene rifatta per passi.
> Regola: ogni passo è additivo e la build deve restare verde.
> Aggiornato: 2026-07-25 (fine S5).

## Perché

Prima del rework la pagina sapeva due cose sole: **cosa dovresti fare** (`workout_plan`)
e **se ti sei allenato quel giorno** sì/no (`workout_log`). Le spunte per singolo
esercizio vivevano in `localStorage`: sparivano cambiando telefono e non finivano
da nessuna parte. Quindi Keiko non poteva dirti nulla di utile — né quanto avevi
caricato l'ultima volta, né se stai crescendo.

Il vantaggio che nessun'altra app di palestra ha: Keiko sa già che domani hai un
volo alle 6:40 e che ieri hai dormito poco. Ma per usarlo servono i dati veri.

## I passi

| | Cosa | Stato |
|---|---|---|
| **S1** | Onboarding profilo a scomparsa (`ProfiloSetup`) | ✅ |
| **S2** | Scheda base generata quando non ce n'è una (`GeneraScheda`) | ✅ |
| **S3** | **Modello dati delle sedute vere**: `workout_session` + `workout_set` | ✅ |
| **S4** | **Schermata della sessione live**: apri, segna le serie, chiudi | ✅ |
| **S5** | **Keiko che *legge* questi dati**: niente più spunte finte, storico sedute | ✅ |
| **S6** | Consigli incrociati col resto del calendario (volo presto → oggi leggero) | ⬜ |

## S3 — i dati (commit `24fa4ff`)

- SQL: `docs/sql/allenamento_sessioni.sql` — **già eseguito su Supabase**.
  Due tabelle nuove, RLS `keiko_own_*` come le altre, niente di esistente toccato.
  - `workout_session` — la seduta (giorno, titolo, inizio, fine, sensazione, note).
  - `workout_set` — la serie (esercizio, serie, ripetizioni, peso, secondi, fatica).
- Funzioni in `lib/supabase.ts` (**209 righe inserite, 0 modificate**):
  `startSession` · `logSet` · `deleteSet` · `endSession` · `getOpenSession` ·
  `getSessionHistory` · `getLastPerformance`.
- `startSession` riusa una seduta già aperta dello stesso giorno: chiudere l'app
  a metà allenamento non crea due sedute.
- `getLastPerformance` è la funzione che vale il rework: "l'altra volta 3×8 con 40 kg".

## S4 — la schermata

- `app/api/workout/session/route.ts` — **una sola rotta**, campo `action`:
  `start` · `set` · `deleteSet` · `end` · `last`, più `GET` per la seduta aperta.
  Auth-guarded come tutte le `/api/workout/*`.
- `app/allenamento/SessioneLive.tsx` — pannello a schermo intero (portale sul
  `<body>`, quindi fuori da qualsiasi card con `overflow`).
  - Elenco degli esercizi di oggi; tocchi quello che stai facendo e si apre.
  - Sopra le caselle: **"l'ultima volta: 8 · 8 · 6 rip · 40 kg"**.
  - Due stepper grossi (ripetizioni ±1, peso ±2,5 kg) precompilati con l'ultima
    serie fatta: nella maggior parte dei casi basta premere "Registra serie".
  - Le serie fatte restano lì come pillole; il cestino cancella quella sbagliata
    (400 invece di 40) in modo ottimistico, con ripristino se il server dice no.
  - "Finisci allenamento" chiude la seduta e segna il giorno come allenato.
  - Se chiudi il pannello la seduta resta **aperta**: al rientro il bottone
    dell'hero diventa "▶︎ Riprendi allenamento" e ritrovi tutto.
- `app/allenamento/page.tsx` — `getOpenSession()` nel `Promise.all`, ripresa solo
  se la seduta è **di oggi** (una rimasta aperta tre giorni fa è una dimenticanza).
- `app/allenamento/AllenamentoView.tsx` — modifiche additive: nuova prop
  `openSession`, bottone "🏋️ Allenati ora" nell'hero, montaggio del pannello.

## S5 — la pagina legge i dati veri

**Il `localStorage` è sparito.** Le spunte per esercizio non esistono più: un
esercizio è "fatto" se ci sono serie registrate oggi in `workout_set`, punto.
Il bug per cui spuntavi un esercizio e ne restava spuntato un altro muore qui,
insieme alla riga di codice che lo causava.

- `lib/supabase.ts` — aggiunta `getSessionByDay(day)`: la seduta di **un giorno
  preciso** (aperta o già chiusa) con dentro le sue serie. `getOpenSession` non
  bastava: appena finisci l'allenamento la seduta si chiude e la pagina tornava
  a non sapere più niente di quello che avevi appena fatto.
- `app/allenamento/page.tsx` — nel `Promise.all` ora ci sono anche
  `getSessionByDay(oggi)` e `getSessionHistory(8)`. E soprattutto **"l'ultima
  volta" si legge sul server**, per tutti gli esercizi di oggi in un colpo solo,
  scartando le serie di oggi stesso (se no "l'ultima volta" ti raccontava la
  serie che avevi appena finito).
- `app/allenamento/AllenamentoView.tsx` —
  - sotto ogni esercizio ora c'è la verità: **"3 serie · 10·10·8 rip · 40 kg"**
    se l'hai già fatto oggi, altrimenti **"ultima volta: …"**, altrimenti la scheda;
  - toccare un esercizio apre il pannello **già su quello** (`iniziale`);
  - l'anello dei progressi conta gli esercizi con almeno una serie vera;
  - nuovo blocco **"Ultime sedute"**: data, titolo, quante serie, quanti esercizi
    e i kg complessivi sollevati (`peso × ripetizioni`).
- `app/allenamento/SessioneLive.tsx` — via la `fetch` di `action:"last"`: adesso
  `ultimaVolta` arriva come prop dal server. Niente più "cerco l'ultima volta…"
  ad ogni card aperta, e un effetto client in meno.

## S6 — cosa manca

- Progressi per esercizio nel tempo ("panca +5 kg in 3 settimane").
- Incrocio col resto: volo presto domani / poco sonno → Keiko propone di alleggerire.
- Timer/cronometro della sessione (A1 nel backlog).
