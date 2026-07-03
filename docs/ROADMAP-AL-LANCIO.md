# Keiko — Roadmap dall'alpha al lancio pubblico

> Documento per il business plan. Elenco dettagliato dei passi da **dove siamo oggi**
> (alpha single-user funzionante) fino a un **lancio di prodotto vero** (pubblico, non il
> test con amici). Ogni fase ha: cosa fare, perché, e la difficoltà onesta.
> Legenda difficoltà: 🟢 semplice · 🟡 medio · 🔴 grosso/rischioso.
> Aggiornato il 2026-07-03.

---

## Fase 0 — Punto di partenza (oggi)

**Cosa funziona già, live in produzione:**
- Input a voce/testo e da immagine → parsing evento (con città e date corrette).
- Rilevamento automatico dei "viaggi" dai biglietti (incastri).
- Generazione dell'itinerario con **web-search** (logistica reale + fonti), impaginato in-app.
- Card "Plot" con bottone Crea plot → itinerario (sequenza, dettagli, alternative, messaggio).
- Diario vita: eventi, dieta, allenamento, notifiche push, PWA.

**Natura attuale (onesta):** è un **alpha per un solo utente** (te). Un solo login Google,
un solo database, nessuna separazione tra utenti, robustezza da demo. Vale come prova che
il prodotto "ci prende" — non come prodotto lanciabile.

---

## Fase 1 — Solidità del pianificatore (hardening) 🟡

Trasformare l'alpha del pezzo forte in qualcosa che non si rompe.

1. **Generazione robusta oltre i 60s** 🔴 — oggi la ricerca gira dentro una funzione Vercel
   col tetto di ~60s. Spostare la generazione su una **coda/lavoro in background** vero
   (es. Supabase Edge Function + tabella "job", o un worker) così i viaggi complessi non si
   impuntano. È il limite tecnico principale.
2. **Stati e recupero errori** 🟡 — gestire bene "in preparazione", i job bloccati (timeout),
   il retry automatico, i messaggi d'errore chiari. (Collegato: stati slot, task #7.)
3. **Qualità del piano** 🟡 — non proporre posti chiusi quel giorno (verifica reale orari di
   apertura), attività sempre concrete, fonti affidabili. Test su più città reali.
4. **Fase leggera / ri-verifica** 🟡 — al momento di aprire il piano, ricontrollare solo il
   volatile (scioperi/orari cambiati) senza rifare tutto. (Task #8.)
5. **Multi-città e viaggi lunghi** 🔴 — il modello a "una destinazione" va esteso a una
   timeline città-per-data (le tratte interne come ancore). (Task #24.)
6. **Swap attività rifinito** 🟢 — le alternative pre-salvate già ci sono; rifinire UX e il
   fallback "trovami altro". (Task #25.)

---

## Fase 2 — Completamento feature esistenti 🟡

Chiudere i buchi delle funzioni che già ci sono (roadmap "sistemazione").

1. **Palestra**: scambio allenamenti come la dieta (#16); spunta settimanale con
   auto-riprogramma se ti alleni in un altro giorno (#17); report mensile (#18, opzionale).
2. **Barra TODO per-giorno** funzionante (ora placeholder) con salvataggio (#21).
3. **Carica itinerario** dell'utente (testo → stesso schema piano), con possibilità di farlo
   arricchire da Keiko (#22).
4. **Pull-to-refresh** e piccoli fix UX (#27).
5. **Pulizia** schema morto (`trips`/`trip_id`) e debiti tecnici (#12).

---

## Fase 3 — Fondamenta multi-utente: privacy, login, scala 🔴

**È il vero salto da "app mia" a "prodotto".** Senza questo non puoi far entrare estranei.

1. **Login e registrazione aperti** 🔴 — oggi c'è un solo utente Google. Serve: iscrizione
   aperta (email/Google), gestione sessioni, recupero account, profilo utente.
2. **Isolamento dati per utente** 🔴 — `user_id` su OGNI riga (eventi, dieta, allenamento,
   trip_plans, todo) + **Row Level Security** attiva su tutte le tabelle, così un utente vede
   SOLO i suoi dati. Oggi è tutto in comune: è il rischio numero uno.
3. **Privacy totale** 🔴 — audit di cosa salviamo; cifratura at-rest; policy di cancellazione
   dati ("cancella il mio account"); consenso; segreti server-side; conformità **GDPR** (sei
   in UE). Serve una **Privacy Policy** vera (vedi Fase 6).
4. **Controllo costi per utente** 🟡 — la web-search costa a ogni piano: servono **quote/limiti
   per utente**, monitoraggio spesa, e billing API reale (non più crediti gratuiti). Se 1.000
   utenti generano piani, i centesimi diventano una voce di costo — va modellata (Fase 6).
5. **Scala del database** 🟡 — indici, piani Supabase adeguati, rate limiting, backup.

---

## Fase 4 — Redesign UI/UX completo 🔴

Il blocco che tu stesso indichi come numero uno ("è brutta").

1. **Design system finale** e redesign schermo per schermo (home, /add, /viaggio, salute,
   allenamento) — coerente, curato. (Task #20.)
2. **Onboarding** per chi arriva nuovo (non ti conosce): primo avvio, cosa fa l'app, primo
   evento guidato.
3. **Stati vuoti / errore / caricamento** curati ovunque.
4. **Accessibilità** e responsive (telefoni diversi).
5. Valuta se ti serve **un designer** per questa fase (è la parte dove un aiuto esterno rende).

---

## Fase 5 — PWA e qualità mobile 🟡

1. Rifiniture **PWA**: installazione, icone, splash, offline di base.
2. **Push notifications** affidabili su iOS/Android (già presenti, da irrobustire).
3. **Performance** (tempi di caricamento, immagini) e test su device reali.

---

## Fase 6 — Business & legale (il cuore del BP) 🔴

Questa parte è quella che rende il documento un *business* plan, non solo tecnico.

1. **Posizionamento e valore** — c'è già la bussola: "tutto in un posto, ti semplifica la vita,
   non un altro motore di ricerca". Trasformala in una frase di vendita e in una landing.
2. **Modello di monetizzazione** (DA DECIDERE):
   - Freemium: gratis il diario/eventi, a pagamento il pianificatore (che ha un costo vivo).
   - Abbonamento mensile.
   - Il pianificatore consuma API a pagamento → il prezzo DEVE coprire quel costo + margine.
3. **Unit economics** — calcolo onesto: costo per utente attivo (web-search per piano + token
   + Supabase + Vercel) vs. prezzo. È il numero che regge o affonda il BP.
4. **Legale** — Termini di Servizio, Privacy Policy, informativa cookie, accordo trattamento
   dati (GDPR). Servono prima di far entrare utenti reali. (Valuta un supporto legale.)
5. **Metriche** — attivazione, retention, uso del pianificatore, in modo rispettoso della
   privacy. Sono i numeri che chiederà chiunque legga il BP.
6. **Supporto e feedback** — canale di aiuto, raccolta feedback, gestione bug.

---

## Fase 7 — Da beta a lancio 🟡

1. **Beta chiusa** — pochi tester fidati (il "test amici" che tu non consideri lancio: qui è
   uno step, non il traguardo). Fix dai loro feedback.
2. **Beta aperta / lista d'attesa** — più utenti, monitoraggio costi e stabilità reali.
3. **Lancio pubblico** — landing definitiva, canali (social, community, Product Hunt…),
   distribuzione (PWA installabile; eventuale wrapper store se serve), comunicazione.

---

## Fase 8 — Post-lancio 🟡

Monitoraggio, iterazione sui dati d'uso, crescita, e le **feature avanzate** come
differenziatori: barra chat "Chiedi a Keiko" (#28) e pianificazione conversazionale
multi-città (#24) — che riusano tutto ciò che hai già costruito.

---

## Decisioni chiave da prendere (per il BP)

- **Monetizzazione**: gratis, freemium o abbonamento? A che prezzo? (Deve coprire l'API.)
- **Mercato/scala**: quanti utenti nell'anno 1? Solo Italia o oltre?
- **Team**: resti solo o cerchi aiuto (designer per la UI, legale per privacy)?
- **Native vs PWA**: resti PWA o servirà un'app negli store?
- **Modello dati**: quanto in profondità va il profilo utente (la personalizzazione = il moat).

---

## Rischi principali (da mettere nel BP, onesti)

1. **Unit economics**: se il costo per piano supera ciò che l'utente è disposto a pagare, non
   regge. Va misurato presto.
2. **Bandwidth**: sei un solo sviluppatore alle prime armi; questa lista è lavoro da mesi/team.
   Va pianificato realisticamente (o con aiuti mirati).
3. **Privacy/legale**: dati personali + AI = area delicata in UE. Sbagliare qui è costoso.
4. **Concorrenza**: calendari e assistenti AI generici. La difesa è il moat "tutto-in-uno +
   profilo che ti conosce".

---

## Ordine consigliato (nota di realtà)

Da solo, io farei così: **Fase 1 (solidità pianificatore) → Fase 3 (privacy+login, il salto) →
Fase 4 (UI) → Fase 6 (business/legale) → Fase 7 (beta→lancio)**, con la Fase 2 (completamento
feature) spalmata dentro. La Fase 3 (privacy+login) è quella che sblocca tutto il resto: senza,
non puoi far entrare nessuno sul serio. È lì il vero confine tra "progetto" e "prodotto".
