# Keiko — I 100+ punti verso un lancio UNICO

> Scritto il 2026-07-25 dopo rilettura completa di tutti i docs (HANDOFF, MIGLIORAMENTI,
> POST-UI-BACKLOG, AI-GAP-ANALYSIS, DECISIONI, PIANO-LANCIO, ROADMAP-AL-LANCIO,
> SPEC-PIANIFICATORE, BUSSOLA, TODO-ROADMAP, MULTIUTENTE, REVIEW-CRITICA) + ricerca di
> mercato sulle app AI-planner 2026.
>
> **La tesi commerciale.** Nel 2026 i planner AI (Motion, Reclaim, Morgen, Dola, Sunsama…)
> sono TUTTI centrati sul lavoro: task, meeting, time-blocking. NESSUNO copre la vita
> intera — biglietti, viaggi, dieta, palestra, film, con un coach che incrocia i domini.
> Keiko vince se spinge dove loro non sono: **"l'app che conosce la tua vita, non la tua
> agenda"**. I punti ⭐ nuovi vanno tutti in questa direzione.
>
> Legenda: 📌 = già nel backlog (conservato, niente perso) · 🟡 = già nel backlog, a metà ·
> ⭐ = NUOVO (da questa analisi) · 💰 = punto che vende (differenziatore commerciale).
>
> Questo file NON sostituisce MIGLIORAMENTI.md / POST-UI-BACKLOG.md / HANDOFF.md: li
> ingloba e li estende. I codici (A1, X5, #18…) rimandano ai file originali.

---

## 1 · IL CERVELLO CROSS-DOMINIO — il moat vero 💰

*`lib/coach.ts` è nato in S6: una funzione pura che incrocia calendario × allenamento.
È il seme del prodotto. Nessun concorrente ha questo.*

1. ⭐💰 **Coach ovunque, non solo in /allenamento**: il consiglio del giorno anche in home (una riga sotto il saluto).
2. 📌💰 **Consiglio "ad app chiusa"**: coach.ts gira nel cron del mattino → notifica push ("Volo alle 6:40 domani: allenati oggi, leggero"). *(⭐ richiesta già in HANDOFF)*
3. ⭐💰 **Coach dieta × calendario**: cena fuori stasera → "pranzo leggero, la sera sei al ristorante"; volo presto → "colazione da portare".
4. ⭐💰 **Coach guarda × calendario**: "domani sveglia alle 5: stasera un episodio da 40 min, non un film da 3 ore".
5. ⭐💰 **Coach viaggio × allenamento**: in trasferta → seduta a corpo libero da 20', proposta la sera prima.
6. ⭐ **Coach post-evento**: dopo un concerto finito a mezzanotte → domattina niente sveglia-palestra, riprogramma.
7. 📌 **"Keiko consiglia" a regole senza LLM** (POST-UI #19) — 🟡 fatto per l'allenamento (S6), estenderlo agli altri domini = punti 3-6.
8. ⭐💰 **Il "Perché"**: ogni consiglio mostra su tap la regola che l'ha generato ("volo domani alle 6:40 + 3 giorni di fila di palestra"). Trasparenza = fiducia = differenziatore vs AI scatola-nera.
9. ⭐ **Feedback sul consiglio**: 👍/👎 su ogni consiglio, salvato → le regole si tarano (il 👎 su "vai leggero" tre volte = alza la soglia).
10. 📌 **Profilo personalità duro↔chill per area** (#155) — il tono del coach cambia col profilo (già previsto, coach.ts legge già `stile`).
11. ⭐💰 **Riepilogo domenicale generato**: "questa settimana: 3 allenamenti, 2 cene fuori, 1 film. Sabato parti per Londra." Push + card. (era #114, esteso cross-dominio)
12. ⭐ **Modalità "settimana difficile"**: se il calendario è pieno (esami, trasferte), Keiko abbassa da solo le aspettative di dieta/palestra e lo dice.
13. 📌 **Motore di personalizzazione unica** (#156, stella polare): tutti i segnali finiscono in un profilo leggibile e correggibile ("Keiko pensa che: ti alleni al mattino, eviti il caldo…"). *(BUSSOLA §3: dopo la privacy)*

## 2 · INGESTIONE UNIVERSALE — "butta dentro, Keiko capisce" 💰

*La regola nuova decisa in chat: Keiko non chiede permesso alle API degli altri —
RICEVE screenshot, foto, testo, e capisce. Ogni API che chiude, questa via resta.*

14. ⭐💰 **Screenshot allenamento → dati** (Strava, Garmin, Nike Run, tapis roulant): distanza, tempo, passo, dislivello → `workout_session`. Riusa la pipeline immagine esistente.
15. ⭐💰 **"Condividi su Keiko"** (Android: share_target nel manifest PWA; iPhone: Comando rapido) — da qualsiasi app, senza aprire Keiko.
16. ⭐ **Foto del piatto → diario dieta**: pasto riconosciuto e loggato, con stima porzioni.
17. 📌 **Scontrino spesa → dieta** (#149): cosa hai comprato → suggerimenti pasti con quello che hai in casa.
18. 📌 **PDF biglietto → evento + tappa viaggio** (#113, AI-GAP 2.8) — oggi solo immagini.
19. 📌 **Multi-evento da un solo input** (AI-GAP 2.4): "volo venerdì e hotel sabato" → 2 elementi.
20. 📌 **Input vocale** (#110, AI-GAP 2.2): MediaRecorder + STT → stesso parser del testo.
21. 📌 **Parser esteso biglietti** (POST-UI #11): arrivo, binario, carrozza, posto, prezzo. Se un dato non c'è, la banda si compatta — mai placeholder.
22. 📌 **Correzione conversazionale post-parse** (AI-GAP 2.10): "non è alle 6, è alle 16" → update mirato.
23. 📌 **Validazione zod su tutto ciò che torna da Claude** (AI-GAP 2.5) prima di scrivere su DB.
24. 📌 **Idempotenza/dedup input** (AI-GAP 2.6): hash dell'input, niente doppioni se riprovi.
25. 📌 **Stato di elaborazione visibile** (AI-GAP 2.11): pending/parsing/done/failed + retry manuale.
26. 📌 **Email-in** (POST-UI #10, parcheggiata — si riapre se l'uso la reclama).
27. ⭐ **Screenshot bilancia/salute** (peso, pressione): stessa via del punto 14, tabella `misure`.
28. ⭐💰 **Import "trasloco vita"**: al primo avvio incolli l'export Google Takeout / Letterboxd / un .ics → Keiko popola settimane di storia. Abbatte il costo d'ingresso per un utente nuovo (era POST-UI #9 + #144, unificati).

## 3 · PIANIFICATORE VIAGGI — il pezzo firma 💰

29. 📌 **Coda/job in background >60s** (ROADMAP F1.1, AI-GAP 2.3) — IL limite tecnico principale: i viaggi complessi non devono impuntarsi.
30. 📌 **Stati e recupero errori del job** (F1.2): "in preparazione", timeout, retry, messaggi chiari.
31. 📌 **Qualità del piano** (F1.3): mai posti chiusi quel giorno, orari verificati, fonti.
32. 📌 **Ri-verifica leggera all'apertura** (F1.4): solo il volatile (scioperi/orari), non tutto.
33. 📌 **Multi-città / viaggi lunghi** (F1.5, SPEC §10): timeline città-per-data, tratte interne come ancore, piano per segmento.
34. 📌 **Swap attività rifinito** (F1.6): alternative già salvate + "trovami altro".
35. 📌 **Tab Destinazioni / Giorno per giorno** (#47, stile Stippl).
36. 📌 **Mappa con pin e rotta** (#48/#121).
37. 📌 **Anello notti pianificate + tempi trasporto** (#49).
38. 📌 **Budget viaggio per categoria** (#50/#124).
39. 📌 **Packing list intelligente** (#51/#123): per destinazione, durata, meteo.
40. 📌 **Carica il TUO itinerario** (F2.3): testo → stesso schema piano, arricchibile da Keiko.
41. 📌 **Documenti di viaggio raccolti** (#127): biglietti e prenotazioni del viaggio in un posto.
42. 📌 **Itinerario condivisibile** (#125) — post multi-utente diventa growth loop (punto 111).
43. 📌 **Meteo destinazione nell'itinerario** (#126, POST-UI #15, Open-Meteo).
44. 📌 **Bucket list / posti visitati** (#122): mappa personale dei viaggi fatti.
45. ⭐💰 **"Il viaggio vive"**: durante il viaggio la home DIVENTA il viaggio (giorno corrente, prossima tappa, "esci alle", meteo lì) — nessun planner lo fa, tutti si fermano al pre-viaggio.
46. ⭐ **Diario automatico post-viaggio**: a fine viaggio Keiko compone il riassunto (tappe fatte, foto se le dai, spesa) → va nella Memoria (sez. 4).

## 4 · MEMORIA & STATISTICHE — l'app che ti conosce 💰

47. 📌💰 **Memoria & statistiche personali** (POST-UI #18, [M+]): storico per tipologia (hotel, voli, ristoranti, musei) con PREZZI PAGATI e orari → "i tuoi hotel a Roma: media 110€/notte". Prezzi TUOI, mai di vetrina (bussola).
48. ⭐💰 **"Un anno fa oggi"**: card in home col ricordo (il concerto, il viaggio) — retention emotiva pura, costo quasi zero: i dati ci sono già.
49. ⭐ **Contatori di vita**: concerti visti, città visitate, km viaggiati, film visti nell'anno.
50. ⭐💰 **Recap annuale "La tua vita con Keiko"** (stile Spotify Wrapped): condivisibile come immagine → acquisizione organica gratis.
51. ⭐ **Statistiche per persona**: "con Giulia: 12 cene, 3 concerti, 1 viaggio" (i contatti condivisione esistono già).
52. ⭐ **Ricerca nella memoria via Ask**: "quand'è che sono stato a Napoli?" → risposta dai TUOI dati (tool `leggi_agenda` esteso al passato).
53. 📌 **Grafico progressi allenamento** (resta da S6/A2): kg nel tempo per esercizio.
54. 📌 **"Quanti visti questo mese"** in Guarda (HANDOFF: `seen_at` c'è già, fattibile subito).

## 5 · HUB INTRATTENIMENTO — da watchlist a "cosa mi va stasera" 💰

55. 📌 **G4 memoria gusti**: da visti/cercati → profilo gusti → consigli nelle categorie (la parte mancante di G4).
56. ⭐💰 **Pagina Intrattenimento unica**: film + serie + **podcast** + musica in un hub solo (visione discussa in chat; podcast era #116/#117).
57. 📌 **Podcast seguiti**: sezione show, ultime puntate, notifica nuova puntata (#116-117).
58. 📌 **Collegamento Spotify**: top artist/brani, ascoltati di recente, podcast salvati → segnali gusti (API verificata: la parte "dati tuoi" è viva).
59. ⭐ **Collegamento YouTube light**: iscrizioni e liked via scope Google già in login (la cronologia è chiusa, le iscrizioni no).
60. 📌 **"Cosa vedo stasera?" per tempo disponibile** (#142) — incrociato col calendario di domani (punto 4): è qui che diventa unico.
61. 📌 **Consiglio podcast per durata tragitto** (#118): "Milano-Roma: 3h = queste 2 puntate".
62. 📌 **Playlist "per il viaggio"** (#119): musica + podcast legati alla tappa.
63. 📌 **Watchlist viva** (POST-UI #20): notifica quando un titolo esce / arriva su una tua piattaforma (#143).
64. 📌 **Filtri watchlist** (#141): genere, piattaforma, durata.
65. 📌 **Trailer nel dettaglio film** (#145) + "simile a…" ✅ già fatto in parte (recommendations).
66. 📌 **Import Letterboxd/IMDb** (#144) → confluisce nel "trasloco vita" (punto 28).
67. 📌 **TMDB completo** (POST-UI #16): poster ovunque, runtime, logo piattaforma sul bottone (#64).
68. ⭐ **Serata a due**: incrocio della watchlist con quella del partner (post multi-utente) → "stasera in due: questi 3".

## 6 · SALUTE & ALLENAMENTO — chiudere il cerchio

69. 📌 **A1 timer/cronometro sessione** (#158) + **timer recupero personalizzabile** (#159).
70. 📌 **A3 immagini esercizi affidabili** (ExerciseDB via RapidAPI).
71. 📌 **Auto-riprogramma** se salti il giorno e ti alleni in un altro (TODO #17, F2.1).
72. 📌 **Scambio allenamenti come la dieta** (F2.1 / #16 vecchio).
73. 📌 **Report mensile allenamento** (#18 vecchio, opzionale).
74. 📌 **Modifica/flessibilità per giornata** (#161): sposta esercizi/giorni senza rifare la scheda.
75. 📌 **Obiettivi settimanali** (#137): X allenamenti, X pasti in target — con l'anello che li mostra.
76. ⭐ **Pagina Salute unificata**: peso (da screenshot, punto 27), corse (punto 14), palestra (c'è), sonno se arriva — un colpo d'occhio, alimenta il coach.
77. 📌 **Foto prima/dopo** (#140, motivazione, opzionale e privata).
78. 📌 **Promemoria idratazione/pasti** (#139) — solo se profilo "duro", altrimenti spam.
79. ⭐ **Celebrazione fine seduta** (Lotto B grafico, mai fatto): animazione + haptic al "Chiudi seduta".
80. 📌 **PT adattivo** (#162, visione): la scheda evolve coi tuoi dati dentro il motore 156. Backlog dichiarato, resta.

## 7 · DIETA — da piano a compagno

81. 📌 **D2 macro e calorie** per pasto + totale giorno (⏸️ decidere fonte: Spoonacular vs Edamam — DECISIONE TUA, sblocca 3 punti).
82. 📌 **D3 vista giornata completa + lista spesa** aggregata dai prossimi giorni (POST-UI #6).
83. 📌 **Cook mode** passo-passo con timer inline (#29, stile CREME).
84. 📌 **Dettaglio pasto con foto reale + azioni** (#28): Cuoci / Pianifica / Scambia / Chiedi.
85. 📌 **Profilo dieta chill/duro** (#155 area dieta): tono e rigidità dei suggerimenti.
86. ⭐ **"Sgarro intelligente"**: hai una cena fuori (Keiko LO SA dal calendario) → non ti segna il rosso, ricalibra la settimana. Nessuna app dieta lo fa perché nessuna vede il calendario. 💰
87. 📌 **Mini-card "prossimi giorni" leggibili** (Design/HANDOFF: padding 12, 2 righe, "…").

## 8 · EVENTI, CALENDARIO & NOTIFICHE — il quotidiano perfetto

88. 📌 **E2 to-do "vedi gara/partita" arricchiti** come i film + **E3 sport** (risultato, orario, dove vederla).
89. 📌 **E4 / POST-UI #12 "Esci alle" reale**: Google Routes + buffer dal profilo prudenza (POST-UI #4).
90. 📌 **Sentinella ritardi** (POST-UI #1): cron T-15' treni, T-6h/T-2h voli → push SOLO se ritardo verificato. Voice registro serio.
91. 📌 **Notifica "in viaggio"** (POST-UI #14): binario/gate il giorno stesso.
92. 📌 **Biglietto vero** (POST-UI #5): conserva l'originale (PDF/img), "Mostra biglietto" = QR fullscreen luminosità alta.
93. 📌 **Anticipi notifica per-evento** (POST-UI #13): 15/30/60/120 + doppia.
94. 📌 **Eventi smart per categoria** (POST-UI #2): concerto → playlist "This is {artista}", film → trailer.
95. 📌 **Vista mese / agenda** (Fase D).
96. 📌 **Ricorrenze / abitudini** (Fase D, #131): palestra, pasti, lezione d'inglese.
97. 📌 **X5 anteprima evento prima di salvare** + conferma.
98. 📌 **X8 meteo da venue/indirizzo** ("Stadio San Siro" → Milano).
99. 📌 **Conto alla rovescia eventi importanti** (#134).
100. 📌 **Deep-link dalle notifiche alla card giusta** (AI-GAP 4.6) + **quiet hours** 23-7 (AI-GAP 4.9).
101. 📌 **Sync Google Calendar** (#128) — read-only prima, bidirezionale poi. Per un utente nuovo è quasi obbligatorio al lancio.
102. 📌 **Widget iOS/Android prossimo evento** (#129) — richiede wrapper nativo: valutare in fase lancio (punto 124).
103. 📌 **Foto evento scelte dall'utente** (⭐ richiesta HANDOFF): override manuale per evento.
104. 📌 **Viaggi proposti, non auto-creati** (POST-UI #3, bug prodotto): il plot si crea solo su conferma.

## 9 · CHIEDI A KEIKO — da ricerca a mani

105. 📌 **Tool-use fase 1** (AI-GAP 1.2, POST-UI #8): sposta/crea/elimina/interroga in linguaggio naturale, con conferma UI obbligatoria per le azioni distruttive.
106. 📌 **Storico chat** (`chat_messages`, AI-GAP 1.5) + streaming SSE (1.1).
107. 📌 **Suggerimenti contestuali veri** (AI-GAP 1.7): i placeholder rotanti calcolati dall'agenda reale.
108. 📌 **Link tappabili nella risposta + chip domande suggerite** (Fase 5.8 PIANO-IMPL).
109. 📌 **Quota e contatore costi per utente** (AI-GAP 1.9): tabella usage, hard-limit morbido ("Keiko riposa fino a domani").
110. ⭐💰 **Pianificazione viaggi lunghi in chat** (SPEC §10, era "fase avanzata"): il viaggio USA si costruisce conversando — al lancio è LA demo che nessun competitor regge.

## 10 · UX & NAVIGAZIONE — feel nativo

111. 📌 **Navigazione bottom-sheet + swipe tra sezioni** (⭐ richiesta HANDOFF, priorità utente): pagine dal basso, si tira giù per chiudere, swipe sx/dx. Framer Motion c'è già.
112. 📌 **Haptics** su spunte/salvataggi (#80) + **"✓ Salvato"** (Lotto B).
113. 📌 **Pull-to-refresh** (#82/#27) + **undo universale** (#81).
114. 📌 **Empty state con la papera/orca Keiko** (Fase 6.3) + **skeleton ovunque** (X4 🟡, completare).
115. 📌 **X3 profilo ampliato**: unità, anticipo default, tema.
116. 📌 **X6 onboarding primo avvio** (città, dieta, allenamento) → usabile senza setup.
117. 📌 **Accessibilità** (UI-RICERCA 1-12,14 verificare applicate; Dynamic Type #13 backlog dichiarato).
118. 📌 **Design: sistema card unico + spaziature 4/8/12/16/24/32 + header pixel-identical** (HANDOFF Design).
119. 📌 **Offline leggibile** (#98): l'ultimo stato si legge senza rete.
120. 📌 **Fix noti in coda**: primo tap dopo overlay ingoiato · token perso dal titolo parsato · /guarda search (#6) · animazione add-reminder (#8) · affordance carosello In arrivo (#10) · X7 pulizia dato demo (azione TUA).

## 11 · FONDAMENTA PRODOTTO — senza queste non si lancia

121. 📌 **Multi-utente completo** (MULTIUTENTE.md fasi 2-7): scritture+letture per user_id, backfill, guardie owner, cron per-utente, sblocco secondo account. MULTIUSER_RLS esiste già.
122. 📌 **Privacy/GDPR** (ROADMAP F3.3, PRIMA del test amici — deciso in BUSSOLA): informativa, consenso, cancella account, export dati (AI-GAP 5.9), retention screenshot=PII.
123. 📌 **RLS vera su tutte le tabelle** (upgrade dichiarato da app-scoped).
124. 📌 **Decisione PWA vs wrapper store** (ROADMAP "decisioni chiave"): il wrapper (Capacitor) sbloccherebbe widget, share-target iOS, Salute — decisione da prendere a viso aperto, non subita.
125. 📌 **Sentry + retry/backoff** (Fase D) + **indagine 503 RSC** (mitigata, non risolta).
126. 📌 **Test minimi sui punti fragili** (#101, AI-GAP 8.1-8.2): parsing date, update evento, incastri.
127. 📌 **Migrazioni versionate + indici + backup** (AI-GAP 5.7-5.8, F3.5).
128. 📌 **Rate limiting + security headers** (AI-GAP 7.6, 7.10).
129. 📌 **Monitoraggio cron** (AI-GAP 8.8: dead man's switch) + pulizia subscription push morte (4.8).
130. 📌 **Pulizia schema morto** (trips/trip_id, residui Airtable — TODO #12).
131. 📌 **Telemetria minima d'uso** (#102): serve a decidere cosa potenziare dopo il lancio.

## 12 · COMMERCIABILITÀ — le cose che si vendono 💰

132. ⭐💰 **La frase di vendita**: "Non un altro calendario. Keiko conosce la tua vita." → landing con 3 demo: screenshot→evento, biglietti→viaggio pianificato, il consiglio cross-dominio.
133. ⭐💰 **Demo video 30 secondi**: condividi un biglietto → Keiko crea l'evento, rileva il viaggio, propone il piano, e la mattina ti dice di allenarti leggero. È il funnel intero in mezzo minuto.
134. 📌💰 **Growth loop condivisione** (POST-UI #7): l'evento/viaggio condiviso si vede registrandosi → ogni condivisione è un invito.
135. ⭐💰 **Freemium chiaro** (da ROADMAP F6.2, da decidere): gratis diario+eventi+dieta+palestra; a pagamento pianificatore viaggi + coach push + memoria/statistiche (le cose con costo API vivo e valore unico).
136. ⭐ **Unit economics misurati SUBITO** (F6.3): contatore costi per utente già nel punto 109 → dashboard settimanale (AI-GAP 8.9).
137. ⭐ **Lista d'attesa dal giorno 0**: la landing raccoglie email anche se l'app è in beta chiusa.
138. ⭐💰 **Il recap Wrapped (punto 50) come motore social**: ogni condivisione = pubblicità che non paghi.
139. 📌 **Beta chiusa → aperta → lancio** (ROADMAP F7) con metriche di attivazione/retention (F6.5) e canale feedback (F6.6).
140. ⭐ **Nome e identità**: l'orca 🐋, la voice italiana, i due registri (amichevole/serio) sono GIÀ un brand — usarli identici in landing, store, push. Coerenza = riconoscibilità.

---

## I 10 CHE COMPRANO IL LANCIO (se dovessi scegliere)

1. **#2 Coach via push** — il "wow" quotidiano, quasi gratis (coach.ts c'è).
2. **#14+15 Screenshot/condividi allenamento** — l'ingestione universale che nessuno ha.
3. **#111 Navigazione bottom-sheet+swipe** — il feel nativo (tua priorità dichiarata).
4. **#29 Coda >60s** — sblocca il pezzo firma (viaggi) per davvero.
5. **#86 Sgarro intelligente** — la demo perfetta del cross-dominio in dieta.
6. **#47+48 Memoria & "un anno fa"** — retention emotiva, dati già in casa.
7. **#90+92 Sentinella ritardi + biglietto QR** — l'utilità che si racconta agli amici.
8. **#101 Sync Google Calendar** — abbatte la barriera d'ingresso di chiunque.
9. **#121+122 Multi-utente + privacy** — il confine tra progetto e prodotto.
10. **#50 Recap Wrapped condivisibile** — il motore di crescita a costo zero.

> Conteggio: 140 punti (94 📌 conservati dai backlog esistenti · 46 ⭐ nuovi).
> Nessun punto aperto di MIGLIORAMENTI.md, POST-UI-BACKLOG.md, HANDOFF.md ⬜/⭐,
> Fase D/E, AI-GAP (voci chiave) e ROADMAP-AL-LANCIO è stato perso.
