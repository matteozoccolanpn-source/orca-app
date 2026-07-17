# Keiko / OrCa — Review critica

> Analisi fatta leggendo il codice reale di ogni scheda (Home v2 `KeikoPreview`, Dieta `/salute`, Allenamento `/allenamento`, Viaggio `/viaggio`, Guarda `/guarda`, Aggiungi `/add`, Login), più il sistema di temi (`globals.css` + `keiko.css`) e la navigazione (`KeikoShell`). Non sono impressioni a memoria: ogni punto è ancorato a qualcosa di concreto nel codice.
>
> **La diagnosi di fondo.** L'app soffre di *doppia personalità*: convivono due sistemi di design non sincronizzati — quello "shadcn" in `globals.css` (temi `:root`/`.dark`) e quello "mockup" in `keiko.css` (temi `.keiko`/`.keiko.alt`). Da qui nascono il bug del tema che si ribalta, i font incoerenti e la sensazione di roba non finita. Prima di aggiungere feature, va scelta **una sola fonte di verità** per colori/font/spazi. È il lavoro che sblocca tutto il resto.

---

## Sezione 1 — 10 BUG di sistema da risolvere (priorità)

1. **Tema che si ribalta in chiaro.** L'HTML server-side è sempre `class="dark"`, poi uno script legge `localStorage` e può toglierla → lampo scuro e poi tutto chiaro. Causa: preferenza salvata + due sistemi di tema. Fix pulito: tema deciso lato server via cookie, **oppure scuro fisso** (togliere il chiaro).
2. **Logout assente in tutta la v2.** Esiste solo nella Home "classic". In `KeikoPreview` e in tutte le pagine `KeikoShell` non c'è modo di uscire. Va aggiunto (menu profilo o icona in topbar).
3. **Le spunte degli esercizi non si salvano.** In Allenamento la spunta del singolo esercizio è solo stato locale: chiudi/riapri e sparisce. Solo "Fatto oggi" a livello di giornata persiste. Va salvato per esercizio.
4. **"Riprogramma / Sposta" evento buggato.** Il flusso `EventForm → /api/update` ha la conversione fuso Roma↔UTC come sospettato n.1: orari che ballano. Da riprodurre e blindare con test.
5. **Ricerca AI da TODO non arricchisce.** Esempio reale ("semifinale mondiali Francia-Spagna martedì") resta grezzo, senza orario/dove vederla/link. `shouldEnrichTodo` (euristica keyword) o il prompt in `lib/todo-place.ts` non scattano. Deve arricchire *sempre*.
6. **Card Home → cambio pagina invece di popover.** Toccando "Dieta oggi", "Allenamento oggi", ecc. si naviga a una rotta piena con tasto "indietro". Va sostituito con una **finestrina contestuale** che si apre vicino al punto toccato (sotto/sopra a seconda della posizione) con l'attività rilevante della categoria per oggi + link.
7. **Ricerca globale finta.** Il bottone "Cerca in Keiko" è disabilitato (placeholder). O si implementa o si nasconde: un bottone morto in topbar comunica "app non finita".
8. **Link e chip morti.** Chip "Biglietto"/"Prenotazione" con `href="#"`, più vari `notifica · presto` / `report · presto` sparsi (Dieta, Allenamento, Viaggio, Guarda). Vanno collegati o rimossi.
9. **Copertine film finte.** Le cover in Guarda sono 3 gradienti hardcoded (`.dune/.opp/.bear`) non legati al titolo reale → un film mostra la copertina di un altro. Servono locandine vere (es. TMDB).
10. **Cache PWA che serve la versione vecchia.** In produzione il service worker continua a mostrare la build vecchia finché non forzi (te ne sei accorto oggi). Serve versioning della cache + prompt "nuova versione disponibile, ricarica".

---

## Sezione 2 — 10 migliorie estetiche per ogni scheda

### 2.1 — Home (`KeikoPreview`)
1. Le 5 "art" gradient per tipo evento sono tutte scure e simili → poca identità a colpo d'occhio; alza contrasto e caratterizza ogni categoria.
2. Font: `keiko.css` prevede un rounded (SF Pro Rounded / `ui-rounded`) ma l'app carica **Inter** → resa diversa dal mockup e più anonima. Allinea il font.
3. Il glyph emoji 22px in alto a destra della hero è piccolo e generico: ingrandisci o passa a icone coerenti.
4. Week strip: il "oggi" evidenziato a fondo pieno stacca poco; aggiungi pallino-evento sotto il numero e più respiro.
5. Kicker "Ciao Matteo 👋 · Roma 24°": tutto stesso peso, piatto → crea gerarchia (saluto grande, meteo come chip).
6. `.mini` card con info clampata a 1 riga: spesso taglia il dato utile; rivedi formato/altezza.
7. `dotsRow`: indicatori minuscoli, quasi invisibili sulle art scure; ingrandisci e aumenta contrasto.
8. Ombre `sh-card` (blur 50px) troppo marcate su fondo scuro → effetto "tutto galleggia"; alleggerisci.
9. Spaziatura tra sezioni (hero → "In arrivo" → "Dieta oggi") incoerente; definisci un ritmo verticale unico.
10. La topbar (logo 🐋 + cerca + calendario + tema + campanella) è affollata: raggruppa le azioni secondarie in un menu.

### 2.2 — Dieta (`/salute`)
1. La hero marrone/oro è cupa e "pesante" rispetto al contenuto leggero (pasti): schiarisci o rendi più fresca.
2. Le righe pasto `.pRow` sono uniformi: differenzia colazione/pranzo/cena con colore/icona più marcati.
3. Stato "Giornata libera 🌿" merita un'illustrazione, non solo testo.
4. Il bottone "🔄 Scambia un pasto" oggi fa solo un toast → o lo rendi reale o lo togli dalla hero.
5. Il carosello "Prossimi giorni" con testo pasti clampato a 5 righe è illeggibile: passa a card più sintetiche.
6. Chip "report settimanale · presto": rimuovi finché non c'è.
7. Manca un indicatore di completamento giornata (es. 2/4 pasti spuntati) come in Allenamento.
8. Pulsante "🗑️ Elimina dieta" rosso troppo evidente in fondo: spostalo in un menu secondario.
9. Upload panel (Foto/PDF) visivamente diverso dal resto: uniforma allo stile card.
10. Tipografia dei pasti tutta uguale: dai peso al nome-pasto e tono attenuato alle opzioni.

### 2.3 — Allenamento (`/allenamento`)
1. Il ring conico di completamento è l'elemento migliore: valorizzalo (più grande, animato al cambio).
2. Badge "🔥 N DI FILA" poco visibile: rendilo un elemento di orgoglio (colore caldo, posizione fissa).
3. Righe esercizio `.pRow` piatte: aggiungi gruppo muscolare / serie×reps come metadato visivo.
4. Stato "Oggi riposo" spoglio: illustrazione + suggerimento (stretching, camminata).
5. Carosello settimana: "Riposo 🌙 / fatto ✓ / N esercizi" con stili troppo simili; codifica a colori.
6. Due chip "scambio allenamenti · presto" e "report mensile · presto": rimuovi.
7. Il pulsante "✓ Fatto oggi" cambia stile quando attivo ma il feedback è debole: aggiungi micro-animazione + haptics.
8. "📆 Riprogramma" fa solo toast → collega al vero riprogramma o togli.
9. Hero blu-gym coerente con Dieta come struttura ma i due colori stridono se visti in sequenza: armonizza la palette tra schede.
10. Spunta esercizio: la strikethrough è l'unico feedback; aggiungi check colorato pieno.

### 2.4 — Viaggio (`/viaggio`)
1. Empty state "Nessun itinerario pronto" spoglio: aggiungi illustrazione + CTA ("Aggiungi un volo/hotel e Keiko costruisce il viaggio").
2. Hero marrone molto simile a quella della Dieta → rischi di confondere le schede; differenzia.
3. Gli slot itinerario `.slot` con orario + nome + chevron sono ordinati ma anonimi: aggiungi icona per tipo tappa (volo/hotel/cibo/museo).
4. Il riassunto viaggio clampato a 2 righe taglia troppo: dagli spazio o rendilo espandibile.
5. Chip "🔄 Cambia (2/3)" poco leggibile: chiarisci che sono alternative.
6. "💬 Messaggio pronto" (copia negli appunti) non dà conferma visiva forte: aggiungi stato "copiato ✓".
7. Manca una **mappa** delle tappe (è ciò che rende Stippl bello): anche statica sarebbe un salto estetico.
8. Sezione "Da sapere & link" indistinta dal resto: incapsula in una card dedicata.
9. `notifica tappa · presto`: rimuovi.
10. Nessuna vista giorno-per-giorno: l'itinerario è un elenco unico → introduci separatori per data.

### 2.5 — Guarda (`/guarda`)
1. Copertine finte (3 gradienti riciclati): è il difetto estetico più grave della scheda → locandine reali.
2. Griglia `.film` con clamp a 3 righe sui titoli: con cover vere serve meno testo, più poster.
3. Card "＋ Aggiungi" e "✨ Consiglio di Keiko" mescolate ai film: separale in una barra azioni.
4. `.seenMark ✅` overlay poco elegante: usa dissolvenza/grigio sul poster visto.
5. Hero "Stasera per te" ha potenziale: rendilo cinematografico (poster grande + sfondo sfocato del poster).
6. Distinzione Film/Serie solo testuale (`.plat`): aggiungi badge.
7. Il flusso "consiglio" usa un `prompt()` del browser: bruttissimo → sostituisci con un campo in-app.
8. "notifiche uscite · presto": rimuovi.
9. Manca rating/anno/durata sotto il titolo: micro-metadati alzano la qualità percepita.
10. Bottone "▶ Dove vederlo" generico: mostra il logo della piattaforma (Netflix/Prime/…).

### 2.6 — Aggiungi (`/add`)
1. Tab "📷 Foto / ✏️ Testo" ok ma piccoli: rendili più grandi e chiari.
2. Drop-zone tratteggiata anonima: aggiungi icona/illustrazione e microcopy più caldo.
3. La textarea testo libero è nuda: aggiungi esempi cliccabili ("volo domani 6am", "cena giovedì 20:30").
4. Stati (parsing/success/error) usano spinner generici: passa a skeleton/animazioni coerenti col brand.
5. `EventForm` di conferma è funzionale ma grigio: dagli lo stesso stile card delle altre schede.
6. Success con auto-redirect a 2,5s: aggiungi possibilità di annullare/aggiungere un altro.
7. Nessuna anteprima "che evento sto per creare" durante la digitazione: mostra un preview live.
8. Manca il pulsante Aggiungi (FAB) nella Home v2 (esiste solo in classic) → punto sia estetico che di UX.
9. Colori dei bottoni non allineati alla palette principale.
10. Nessun feedback tattile su "Analizza"/"Salva".

### 2.7 — Login
1. Molto spoglio: wordmark + bottone Google. Aggiungi un'illustrazione/animazione della balena 🐋.
2. Il claim "Il tuo calendario, organizzato" è generico: raccontane il valore (screenshot → evento).
3. Bottone Google standard: rendilo coerente col design system.
4. Sfondo a gradiente radiale statico: aggiungi le "bollicine" già presenti in Home per continuità.
5. Nessuna anteprima di cosa fa l'app: 2-3 screenshot animati aiuterebbero.
6. Manca dark/light coerente con la scelta poi in app.
7. Tipografia del wordmark non usa il font brand.
8. Nessun microcopy sulla privacy/single-user.
9. Spaziatura verticale sbilanciata verso l'alto.
10. Nessuno stato di caricamento dopo il tap su "Accedi".

---

## Sezione 3 — 30 migliorie complessive (trasversali)

1. **Unificare i due design system** (`globals.css` vs `keiko.css`) in un'unica fonte di verità per colori/font/spazi/raggi.
2. Scegliere **un solo modello di tema**: scuro fisso (consigliato, visto che non ami il chiaro) o toggle vero sincronizzato server+client.
3. Introdurre una **bottom tab bar** unica (Home / Viaggi / Salute / Guarda) al posto del back-href per pagina.
4. Sostituire i cambi-pagina delle categorie con **popover/bottom-sheet contestuali** (vedi bug #6).
5. **Skeleton loading** al posto degli spinner ovunque (Dieta, Allenamento, Guarda, Add).
6. **Feedback tattile (haptics)** su spunte, swipe, salvataggi.
7. **Undo universale** (già su todo/film): estendere a elimina evento, elimina dieta/scheda.
8. **Versioning cache PWA** + banner "nuova versione disponibile".
9. **Pull-to-refresh** nativo su tutte le liste.
10. Standardizzare tutti gli **empty state** con illustrazione + CTA.
11. **Notifiche push reali** (VAPID è già configurato in `.env`) per eventi imminenti e todo con orario.
12. **Onboarding** alla prima apertura (3 slide: cos'è, come si aggiunge, permessi).
13. Un **componente Card unico** riusato in tutte le schede (oggi ogni scheda ridisegna il suo).
14. Palette categorie **coerente** tra Home, Viaggio, Add (stessi colori per stesso tipo).
15. **Icone custom** al posto delle emoji per tipo evento (più pulite e coerenti).
16. Micro-**animazioni di stato** consistenti (successo, errore, caricamento).
17. **Accessibilità**: focus visibile, contrasti AA, `aria-label` sui bottoni-icona.
18. Rendere **tutte le azioni "· presto"** o funzionanti o invisibili (niente promesse a vuoto).
19. **Ricerca globale** vera (eventi, todo, film, viaggi) dalla topbar.
20. **Gestione errori uniforme** con retry (oggi ogni schermata la gestisce a modo suo).
21. **Persistenza granulare**: salvare ogni micro-stato (esercizi spuntati, pasti, tappe).
22. **Timezone** centralizzata in un'unica utility (oggi la logica Roma↔UTC è sparsa → bug ricorrenti).
23. **Riduzione dati mock**: rimuovere gli `EVENTS` finti di fallback in `KeikoPreview`.
24. **Settings/Profilo**: una schermata con logout, tema, notifiche, gestione dati.
25. **Coerenza microcopy**: definire il tono di voce di Keiko e applicarlo ovunque (c'è già `docs/UI-VOICE.md`).
26. **Gesture uniformi**: swipe con stessa soglia/feedback su card evento, todo, film.
27. **Modalità offline** decente (cache dell'ultimo stato leggibile senza rete).
28. **Performance**: verificare i re-render (ottimistico + refetch) che possono causare scatti.
29. **Deep-link** alle singole schede/eventi (per notifiche e widget futuri).
30. **Test minimi** sui punti fragili (parsing date, update evento) per non re-introdurre bug.

---

## Sezione 4 — 40 idee e funzionalità nuove

**Input & AI**
1. Input testo libero "Dimmi tutto" ovunque (già in `/add`, portalo in Home come barra sempre presente).
2. Input **vocale** ("Hey Keiko, volo domani alle 6").
3. **AI proattiva**: Keiko legge l'evento e propone da sola cosa serve (check-in, meteo, come arrivare).
4. **AI film potenziata**: locandine reali, dove vederlo con logo piattaforma, trailer, "simile a…".
5. AI che estrae eventi da **email inoltrate** (oltre agli screenshot).
6. AI che legge un **PDF biglietto** e crea evento + tappa viaggio insieme.
7. Riepilogo giornaliero generato ("Oggi hai: 2 eventi, palestra, 1 film consigliato").
8. **Chat con Keiko** per chiedere/modificare in linguaggio naturale.

**Podcast & media (tuo)**
9. **Podcast preferiti**: sezione con i tuoi show, ultime puntate, link all'app.
10. Notifica "nuova puntata" dei podcast seguiti.
11. Consiglio podcast in base al viaggio/durata tragitto.
12. Playlist "per il viaggio" (podcast + musica) legata alla tappa.

**Viaggi (stile Stippl, legale)**
13. Itinerario **giorno-per-giorno** con orari.
14. **Mappa** delle tappe con pin.
15. **Tracker** dei posti visitati / bucket list.
16. **Packing list** intelligente per destinazione e durata.
17. **Budget** di viaggio con spese per categoria.
18. Itinerario **condivisibile** con un compagno di viaggio.
19. Meteo della destinazione integrato nell'itinerario.
20. Documenti di viaggio (biglietti/prenotazioni) raccolti in un posto.

**Eventi & calendario**
21. Sync bidirezionale con **Google Calendar**.
22. **Widget iOS** con il prossimo evento.
23. Promemoria smart ("parti tra 20 min per arrivare in orario", con traffico).
24. Eventi ricorrenti.
25. Categoria/tag personalizzati per evento.
26. Vista **settimanale/mensile** vera del calendario.
27. Conto alla rovescia per eventi importanti.
28. Condivisione evento via link/WhatsApp.

**Salute & abitudini**
29. Grafici progressi allenamento (streak, volume).
30. Obiettivi settimanali (X allenamenti, X pasti in target).
31. Integrazione con Apple Health / passi.
32. Promemoria idratazione/pasti.
33. "Foto prima/dopo" opzionale per motivazione.

**Guarda**
34. Watchlist con filtri (genere, piattaforma, durata).
35. "Cosa vedo stasera?" in base al tempo che hai.
36. Notifica quando un titolo in lista arriva su una piattaforma che hai.
37. Import watchlist da Letterboxd/IMDb.

**Sistema & piacere d'uso**
38. **Temi/skin** selezionabili (una volta sistemato il tema).
39. Personalizzazione Home (riordina/nascondi sezioni).
40. Backup/export dei dati (sei single-user su Airtable/Supabase: dai il controllo).

---

## Da dove partirei (proposta d'ordine)

**Ondata 1 — smettere di sanguinare (bug che ti bloccano oggi):** tema scuro fisso (bug 1) · logout (bug 2) · spunte allenamento salvate (bug 3) · "Sposta" evento (bug 4) · ricerca AI todo (bug 5).

**Ondata 2 — la nuova interazione Home:** popover contestuali al posto dei cambi-pagina (bug 6) + bottom tab bar (miglioria 3).

**Ondata 3 — fondamenta design:** unificare i due sistemi di colore/font (miglioria 1-2), poi restyle scheda-per-scheda con le migliorie estetiche.

**Ondata 4 — feature:** viaggi stile Stippl, podcast, AI film. Una alla volta.

Dimmi da quale ondata partiamo e attacco, sempre in modalità piccola-e-mirata.
