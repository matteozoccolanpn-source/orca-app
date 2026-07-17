# Keiko — Piano step-by-step fino alla demo

> Un solo piano, in ordine di esecuzione. Ogni step: **cosa** cambio (con i file veri), **perché**, e **fatto quando** (come verifichiamo). Dopo ogni fase: build + push su `redesign` + prova in incognito.
>
> **Dove siamo:** branch `redesign` (deploy automatico su Vercel). Già fatto: movimenti velocizzati v1 (commit `99fc4ce`) · toolbar Vercel disattivata. Modalità di lavoro: leggo → ti spiego → modifica piccola → testi.

---

## FASE 1 — Stabilità (niente si rompe davanti a lei)

### Step 1 — Tema scuro fisso
- **Cosa:** in `app/components/keiko/KeikoPreview.tsx` rimuovo il bottone `toggleMood` (icona sole/luna); in `app/layout.tsx` tolgo il ramo "light" dello script anti-flash e forzo `class="dark"`; azzero l'eventuale `keiko-mood`/`keiko-theme` salvato. La classe `.alt` di `keiko.css` non verrà mai applicata.
- **Perché:** oggi un tap involontario ribalta tutta l'app in chiaro (con lampo scuro). Il chiaro non ti piace e non è finito: lo togliamo.
- **Fatto quando:** apri, navighi tra le schede, chiudi e riapri → sempre scuro, nessun lampo. (S)

### Step 2 — Cache PWA  ✅ VERIFICATO: non serve
- **Esito:** letto `public/sw.js` — gestisce SOLO le notifiche push (`push`/`notificationclick`), **nessun handler `fetch` né Cache API**. Quindi il service worker NON serve build vecchie.
- **Vera causa della "versione vecchia" vista da Matteo:** URL sbagliato (`orca-app-zeta` = branch di produzione, non la redesign) — già risolto usando l'URL di anteprima corretto.
- **Decisione:** nessuna modifica (evitiamo codice inutile). Se in futuro la PWA installata mostrasse contenuti stantii, si sistema con gli header di cache, non col SW.

### Step 3 — Logout nella v2 (+ mini profilo)
- **Cosa:** aggiungo un'icona utente nella topbar di `KeikoPreview` che apre un piccolo pannello con **Logout** (collegato alla server action `signOut` già esistente) e il campo **nome** (usato poi per i saluti).
- **Perché:** oggi nella v2 non c'è modo di uscire; un'app completa ce l'ha, e il nome serve allo step 14.
- **Fatto quando:** da qualsiasi schermata puoi uscire; il nome inserito si salva. (S)

### Step 4 — Allenamento: salva il "fatto" + gestione dei giorni  ⟵ *ampliato (tua nota)*
- **Cosa:** in `AllenamentoView.tsx` (1) rendo persistenti le spunte dei **singoli esercizi** e faccio riflettere in Home il giorno come "allenato" (`trainedDays`); (2) permetto di **vedere gli allenamenti degli altri giorni** (non solo oggi); (3) permetto di **spostare una sessione a un altro giorno**, aggiornando la memoria/gli incastri degli altri giorni di conseguenza (niente doppioni, il piano resta coerente).
- **Perché:** oggi le spunte non si salvano (alleni, torni in Home, non risulta fatto, lo rifai) e non puoi riorganizzare la settimana. Serve flessibilità reale.
- **Fatto quando:** spunti gli esercizi → in Home risulta "fatto" → riapri e ritrovi tutto; apri un altro giorno e lo vedi; sposto una sessione a un altro giorno e il piano si aggiorna senza sovrapposizioni. (L)
- **DECISO (con Matteo):** il CORE è FATTO ora — spunte esercizi persistono in `localStorage` per data + quando le completi tutte il giorno si segna `trained` (che è già su Supabase, quindi visibile ad AI/automazione). Le parti "vedere esercizi di altri giorni" e "spostare sessioni con incastri" si costruiscono **su Supabase** (non localStorage: dev'essere leggibile da AI/automazione) **subito dopo la demo** — richiedono una piccola aggiunta al modello dati.

### Step 5 — "Sposta"/riprogramma evento  ✅ FATTO
- **Scoperta:** non era un bug di fuso — il "Sposta" era un **bottone finto** (solo toast), `/api/update` non era chiamato da nessuno, e `updateTicketById` non convertiva nemmeno il fuso. La funzione **non esisteva**.
- **Fatto:** (1) plumbing del `datetime` grezzo negli eventi Home (`keikoLive.ts`); (2) fix fuso in `updateTicketById` (ora usa `romeNaiveToUtcIso` come `createTicket`); (3) nuovo bottone **"Sposta / Modifica"** nel pannello evento → apre un form pre-riempito che salva su `/api/update` e ricarica; (4) rimosso il "📆 Sposta" finto dall'action sheet.
- **Fatto quando:** apri un evento → Sposta/Modifica → cambi data/ora → salvi → l'orario resta corretto ovunque. (M)
- **Nota:** il form modifica riusa `EventForm` (stile tailwind): funziona ed è scuro/leggibile; un restyle "keiko" del form è cosmesi da fare dopo, se vorrai.

## FASE 2 — Zero tasti morti (nessun bottone che non fa niente)

### Step 6 — Via i dati evento finti
- **Cosa:** in `KeikoPreview.tsx` elimino il fallback `EVENTS` (treno/cena/volo/concerto/GP mock); mostro solo eventi reali.
- **Perché:** non deve mai vedere eventi inventati ("Cremonini a San Siro") al posto dei tuoi.
- **Fatto quando:** con account reale la Home mostra solo i tuoi dati; a vuoto un empty state pulito. (S)

### Step 7 — Ricerca: farla funzionare o nasconderla
- **Cosa:** verifico il pannello `askFull` (input "Cerca…"). Se cerca davvero tra eventi/todo/film lo tengo; se è solo grafica, nascondo il bottone "Cerca" per la demo.
- **Perché:** una lente che apre un campo che non cerca nulla urla "non finito".
- **Fatto quando:** o cerchi e trovi, o la lente non c'è. (S)

### Step 8 — Via i "· presto" nella UI attuale (v2)  ⟵ *corretto (tua nota)*
- **Cosa:** rimuovo i chip `.tbc` placeholder che ho verificato ancora presenti nella v2: `AllenamentoView.tsx:279-280` (scambio allenamenti / report mensile), `DietView.tsx:211` (report settimanale), `ViaggioView.tsx:313` (notifica tappa), `GuardaView.tsx:275` (notifiche uscite).
- **Perché:** sono promesse a vuoto; per la demo tutto ciò che non fa nulla sparisce.
- **Nota:** i chip morti `href="#"` (Biglietto/Prenotazione) **non** sono nella v2 — vivono nel vecchio `Ticket.tsx` (home classic), quindi li ignoro (li tocco solo se un domani riusiamo quel componente). Avevi ragione tu.
- **Fatto quando:** aprendo Dieta/Allenamento/Viaggio/Guarda non resta nessun chip "· presto". (S)

### Step 9 — "Scambia pasto" reale, "Riprogramma allenamento" nascosto
- **Cosa:** collego "Scambia un pasto" al flusso già esistente (`DietSwap` + `/api/diet/save`) così funziona davvero; il "📆 Riprogramma" dell'allenamento (oggi solo toast) lo nascondo per la demo (il vero riprogramma arriva con lo Step 4).
- **Perché:** lo scambio è a portata (c'è già l'API); il riprogramma vero è più grosso e va con lo Step 4.
- **Fatto quando:** scambi un pasto e resta salvato; nessun bottone toast-only in giro. (S/M)
- **Nota (tua idea — NON in demo, va allo Stage 2 con l'AI proattiva):** la logica "il giorno prima ti chiede *confermi allenamento domani alle 8?* → se sì ti imposta l'alimentazione / promemoria spuntino pre-allenamento" è oro, ma è AI proattiva cross-feature: la registro nel backlog e la faremo insieme all'AI nativa, non ora.

### Step 10 — Via TUTTI i `prompt()` del browser  ⟵ *ampliato (audit)*
- **Cosa:** sostituisco con campi/sheet in-app i `window.prompt()` che ho trovato: `GuardaView.tsx:85` (aggiungi titolo) e `:108` (consiglio serata), **più** `KeikoPreview.tsx:179` (orario del promemoria todo).
- **Perché:** il popup grigio di sistema fa sembrare l'app un prototipo, ovunque compaia.
- **Fatto quando:** aggiungi titolo, chiedi un consiglio e imposti l'orario di un todo senza mai vedere un popup del browser. (S)

### Step 11 — Bottone "+" visibile in Home v2
- **Cosa:** aggiungo un FAB "+" nella Home v2 che apre il `CaptureSheet` già presente (foto/testo → evento).
- **Perché:** oggi in v2 il "+" non è visibile (esisteva solo nella home classic); deve poter aggiungere un evento al volo.
- **Fatto quando:** dalla Home tocchi "+", aggiungi un evento e lo vedi comparire. (S)

## FASE 3 — Il tocco di "wow"

### Step 12 — La ricerca AI arricchisce SEMPRE
- **Cosa:** in `lib/todo-place.ts` estendo l'euristica `shouldEnrichTodo` (di fatto sempre attiva) e miglioro il prompt perché restituisca **orario, luogo/link, dove vederlo**; applico la stessa logica agli eventi da testo.
- **Perché:** è il momento magia. "semifinale mondiali martedì" deve tornare con ora, canale/link, non restare grezzo.
- **Fatto quando:** provo 3 input reali (un evento sportivo, una cena, un volo) e Keiko riempie i dettagli utili. (M)

### Step 13 — Copertine film reali
- **Cosa:** in `lib/films.ts` aggiungo il recupero del poster da TMDB e un campo immagine nell'elemento watchlist; `GuardaView` mostra la locandina vera al posto dei 3 gradienti finti.
- **Perché:** oggi un film mostra la copertina di un altro: pessima impressione in una scheda tutta visiva.
- **Fatto quando:** ogni titolo mostra la sua locandina reale. (M)

### Step 14 — Foto sulle card + saluto col nome
- **Cosa:** uso il campo immagine per mettere foto reali dove esistono (film, e categoria evento) con **un template unico**: foto a sfondo + scrim scuro + testo sempre nella stessa fascia; e in Home il saluto "Ciao {nome} 👋" con una frase legata a cosa c'è oggi.
- **Perché:** le card oggi sono piatte; le foto danno immersività, il template le tiene ordinate; il saluto personale scalda la prima impressione.
- **Fatto quando:** Home e Guarda hanno card con foto coerenti; il saluto usa il tuo nome. (M)

## FASE 4 — Collaudo e consegna

### Step 15 — Giro "tocca ogni bottone" + deploy
- **Cosa:** apro ogni schermata (Home, Dieta, Allenamento, Viaggio, Guarda, Add, Login, Profilo) e clicco **tutto**, lista alla mano: se qualcosa non fa nulla → o lo collego o lo nascondo. Poi `npm run build`, push su `redesign`, prova finale in incognito su telefono.
- **Perché:** è il controllo che garantisce "nessun tasto morto" davvero, non a memoria.
- **Fatto quando:** ho spuntato ogni schermata, la build passa, e la prova in incognito è pulita. (S)

---

## Approfittiamone (raggruppo per file)
Quando apro un file per uno step, colgo l'occasione per le migliorie adiacenti già discusse — meno passaggi, più coerenza:
- **`KeikoPreview.tsx`** (Home v2): tema fisso (1) + logout/nome (3) + via mock (6) + FAB "+" (11) + prompt orario (10) + saluto col nome (14) → un giro solo sulla Home.
- **`AllenamentoView.tsx`**: persistenza + altri giorni + sposta sessione (4) + via i "· presto" (8) + nascondi "Riprogramma" (9) + foto/immagine sessione se pronta (14).
- **`DietView.tsx`**: scambio pasto reale (9) + via "report · presto" (8) + foto pasti se pronta (14).
- **`GuardaView.tsx`**: prompt → campo (10) + via "notifiche uscite · presto" (8) + locandine reali (13).
- **`ViaggioView.tsx`**: via "notifica tappa · presto" (8) + conferma "copiato ✓" (miglioria #105, gratis mentre ci sono).

## Stage 2 — dopo la demo (registrato, non ora)
- **AI proattiva cross-feature** (tua idea): giorno prima "confermi allenamento domani alle 8?" → imposta alimentazione + promemoria spuntino pre-allenamento. Va con l'AI nativa e il motore di personalizzazione (#156/#162).
- Redesign immersivi pieni (CREME/Kitchen Stories, Equinox/Tonal, Stippl), cronometro/timer/registro pesi allenamento (#158-160), design system unico (#11).

## Riepilogo tempi
- **Fase 1 (stabilità):** ~4-5 serate (lo Step 4 ampliato — altri giorni + sposta sessione — pesa di più).
- **Fase 2 (tasti morti):** ~3 serate → app onesta, tutto ciò che si vede funziona.
- **Fase 3 (wow):** ~3-4 serate → app che impressiona.
- **Fase 4 (collaudo):** ~1 serata.

**Totale realistico: ~2 settimane di serate.** Minimo per non fare brutta figura: Fasi 1+2+Step 15. La Fase 3 è ciò che la fa dire "wow".
Se lo Step 4 pieno (sposta sessioni + incastri) allunga troppo, per la demo si può fare la parte 1 (persistenza spunte) e rimandare sposta-sessioni di pochi giorni — dimmi tu.

Parto dallo **Step 1 (tema scuro fisso)** appena dici "vai".
