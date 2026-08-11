# KEIKO UI V2 — revisione generale dei cinque mock

> Fatta il 9 agosto 2026 rileggendo i cinque mock (Home, Cucina, Allenamento,
> Guarda, Viaggi) contro `UI-DECISIONI-V2.md`, `UI-CUCINA-LOCKED.md`,
> `UI-ALLENAMENTO-LOCKED.md`, `UI-GUARDA-AUDIT.md`, `SPEC-VIAGGI-DIREZIONE.md`,
> e contro i documenti di prodotto: `KEIKO-PROGETTO.md`, `VISION.md`,
> `ROADMAP.md`, `keiko-VISIONE-nord.md`, `keiko-BACKLOG-FEATURES_2026-07-21.md`,
> `keiko-SPEC-barra.md`, `SPEC-BATTITI.md`, `SPEC-CUCINA.md`.
>
> Ogni punto è numerato per poter dire «fai 4, 7 e 12».

---

## A · LE ROTTURE DI UNIFORMITÀ
*Oggi le cinque schermate sembrano cinque app cugine, non la stessa app.
Questi sono i punti che lo causano, in ordine di gravità.*

**A1 — I titoli di sezione hanno due lingue diverse.** In Home `.sec` è Inter
12,5px grigio («Riprendi», «In arrivo», «Oggi per te»): sono etichette. In
Cucina, Allenamento, Guarda e Viaggi `.sec` è Fraunces 16,5px chiaro con coda
grigia: sono voci. Vanno unificati sul secondo — è quello scritto nel manifesto
(punto 9) e usato in tre sezioni su cinque.

**A2 — La tab bar si chiama in due modi.** In Home la seconda voce è «Dieta»,
negli altri quattro è «Cucina». Una delle due è sbagliata in tutte le schermate.

**A3 — Il colore-categoria è vivo solo in Home.** In Home i metadati sono
colorati per area (viola Interstellar, arancione Upper A, verde Europei di
nuoto, teal Sport); nelle altre quattro tutti i pallini sono grigi. Il manifesto
(punto 2-bis) ammette le tinte tenui, ma o si usano ovunque o in nessun posto.

**A4 — Due terracotta in circolazione.** Home e Cucina usano `#C96A45` sui
bottoni con testo (3,4:1, sotto soglia); Allenamento, Guarda e Viaggi usano già
`#AB5A3B` (4,5:1) dopo la decisione del 9 agosto. Il corpo di
`UI-DECISIONI-V2.md` punto 26 dichiara ancora l'eccezione «aperta» mentre
l'intestazione dice che è chiusa: il documento contraddice sé stesso.

**A5 — La testata di pagina non è la stessa.** Cucina e Guarda hanno «Cucina» /
«Guarda» in Fraunces 22 + riga di stato; Allenamento e Viaggi non hanno titolo
(solo hero); Home ha il saluto. Tre pattern diversi per la stessa cosa. Serve
una regola: *sezione con hero → niente titolo; sezione a lista → titolo + stato*.

**A6 — I link di sezione hanno cinque etichette.** «vedi tutti», «gestisci»,
«apri la Cucina», «tocca per l'andamento», «tutti i biglietti». Vanno ridotti a
due forme: «vedi tutti» quando porta a una lista, «gestisci» quando porta a
un'impostazione.

**A7 — Le foto non sono trattate uguale.** Le card-giorno di Cucina e
Allenamento hanno mezza foto a destra con gradiente; in Viaggi la stessa card ha
la foto ma con un altro gradiente; in Guarda i poster hanno il proprio
trattamento; in Home le card-contenuto hanno la foto piena senza scrim
uniforme. Serve un solo filtro e un solo scrim, dichiarati una volta.

**A8 — Gli stati vuoti hanno tre forme.** In Cucina sono card con icona +
titolo + due righe; in Allenamento uguale ma con chip «in arrivo» tratteggiato;
in Home mancano del tutto (la sezione sparisce). Va scelta una forma sola e
detto quando la sezione sparisce invece di mostrare il vuoto.

**A9 — I numeri non hanno una regola.** «2/5» nell'anello, «0 di 4» nel badge,
«2 di 4 esercizi», «19 titoli», «settimana 3 di 16», «1 di 3». Servono due
forme sole: **`n/m` dentro un elemento grafico** (anello, badge), **`n di m` in
prosa**. E i numeri grandi sempre in Fraunces, i numeri-dato sempre in Inter.

**A10 — I metadati mescolano registri.** «per sabato · cena con Sara» (motivo),
«vicino a te · 600 m» (distanza), «35 min · ≈480 kcal» (dati), «lun 11 · 3
sessioni» (data + quantità). Va fissata la sequenza: **quando · cosa · quanto**,
e mai due registri nella stessa riga.

**A11 — Il chip ha tre altezze.** Chip filtro Cucina, chip-tendenza
Allenamento, chip «prima/dopo» del blocco cibo, chip `kv` degli esercizi: quattro
componenti simili con padding diversi. Vanno a due: **chip-filtro** (pill,
tappabile) e **chip-dato** (rettangolare, non tappabile).

**A12 — Le ombre e gli aloni non sono uguali.** L'alone teal sotto il pannello
di comando c'è in Cucina e Allenamento, non in Guarda e Viaggi. O è la firma
del «pannello di comando» in tutte le sezioni, o si toglie.

---

## B · LE INCOERENZE DI PRODOTTO DA SCIOGLIERE PRIMA
*Non sono questioni di stile: sono contraddizioni fra documenti che si vedono
nei mock. Vanno decise, altrimenti le porto in codice sbagliate.*

**B1 — Le calorie.** `SPEC-CUCINA.md` §9 dice «calorie, macro, giudizi
nutrizionali: mai». Il mock Cucina bloccato mostra «910 di 1.480 kcal», «≈480
kcal» sulle ricette e un filtro «Sotto 500 kcal». L'Allenamento è a zero dati
nutrizionali per decisione tua. Le kcal del piano sono difendibili (trascritte
dal nutrizionista); **le ≈kcal stimate su una ricetta TikTok no**: lì non c'è un
piano da cui trascriverle, e stimare è esattamente ciò che l'art. 348 vieta.
→ *Proposta: kcal solo dove il piano le dichiara; sulle ricette il tempo e
nient'altro; via il filtro «Sotto 500 kcal».*

**B2 — Le emoji.** `SPEC-BATTITI.md` descrive la card battito con «emoji tipo,
frase, azione»; il manifesto impone zero emoji nell'UI strutturale. La card
battito non è mai stata riconciliata con la regola.
→ *Proposta: la card battito usa l'icona-linea della categoria, non l'emoji.*

**B3 — Cucina o Dieta.** `SPEC-CUCINA.md` (7 agosto) decideva Cucina come
sezione a sé, con la dieta che «resta com'è»; `UI-CUCINA-LOCKED.md` (9 agosto)
congela una Cucina che contiene menu del giorno, prossimi giorni, gestione
dieta e ristoranti. Le due cose sono state fuse senza aggiornare la spec, e la
tab bar ne porta il segno (A2).

**B4 — Viaggi ha un tab o no.** Oggi è una sotto-pagina della Home raggiunta da
una tessera quadrata. `SPEC-VIAGGI-DIREZIONE.md` §4 chiede di deciderlo
esplicitamente. Con le sezioni «prossimi viaggi» e «viaggi passati» che vuoi
aggiungere, la tessera quadrata non basta più.

**B5 — Home vs Allenamento.** La Home dice «Corsa Z2, 40 minuti · 18:00»,
l'Allenamento dice «Corsa Recovery + Nuoto». Restano da allineare, come già
scritto in `UI-ALLENAMENTO-LOCKED.md` §7.

---

## C · INTERATTIVITÀ E DINAMICITÀ
*Cosa manca perché le schermate sembrino vive invece che disegnate.*

**C1 — Niente si muove quando entra.** Le sezioni compaiono tutte insieme.
Servono entrate scaglionate: ogni blocco entra con 40ms di ritardo sul
precedente, 6px di traslazione. Costa poco e cambia tutto.

**C2 — Le foto non hanno un momento.** Oggi appaiono. Servono: sfocatura che si
risolve al caricamento, e un colore dominante come sfondo mentre arrivano —
che è anche la risposta al «lampo bianco» segnato nel backlog.

**C3 — Nessuna schermata reagisce allo scroll.** Le foto delle card hero
possono avere una parallasse minima (8-12px), l'hero può perdere saturazione
scendendo. È il modo più economico per dare profondità.

**C4 — Gli stati di attesa non esistono.** Il consiglio impiega ~7 secondi
(misurato, `KEIKO-PROGETTO.md`). Serve lo **scheletro** in ogni lista, non uno
spinner. Nei mock non c'è mai.

**C5 — Manca lo stato «Per oggi mi fermo qui».** Il tetto AI è una funzione
visibile, non un errore: va disegnata come card, non come toast rosso.

**C6 — Il tocco non ha peso.** Serve il feedback pressato ovunque (l'ho fatto
solo in Allenamento), e le transizioni di apertura dei fogli devono partire dal
punto toccato, non sempre dal basso.

**C7 — Le liste lunghe non hanno ritmo.** Nelle liste oltre 6 righe serve una
separazione ogni giorno/gruppo, e intestazioni che restano attaccate in alto
mentre scorri.

**C8 — Non c'è niente che cambi da solo.** Il placeholder rotante della barra
c'è solo in Cucina. La Home «cambia da sola mattina/pomeriggio/sera» (idea 232)
non è mai mostrata. Un mock che non mostra il passare del tempo sembra morto.

**C9 — Nessun numero si anima.** Anelli, barre e contatori dovrebbero salire
dal valore precedente, non apparire al valore finale.

**C10 — Manca il gesto.** Swipe fra le sezioni della tab bar (c'è già
`SwipeShell.tsx` in codice), swipe-per-chiudere sui fogli, trascinamento per
riordinare. Nei mock ce n'è uno solo, in Allenamento.

---

## D · COSA IL FUTURO IMPONE E I MOCK NON PREVEDONO
*Dai documenti di prodotto. Se i mock non lasciano posto a queste cose, il
codice le incastrerà male.*

**D1 — La barra non è una barra: è un pannello.** `keiko-SPEC-barra.md`: la
barra si espande con un **preview della modifica** e Conferma/Annulla, con
cinque stati (fermo → sto pensando → anteprima → fatto → errore). In V2 propone
**più azioni insieme, ognuna da confermare**. Nei mock è un rettangolo che apre
una schermata. È il cuore della visione ed è la cosa più sottodimensionata.

**D2 — La card battito.** Una sola alla volta, sotto il saluto, con la ✕ da
44px che la chiude per sempre, e **mai uno stato vuoto**: se non c'è battito, la
riga non esiste. La Home deve reggere identica con e senza.

**D3 — Le schermate a tutto schermo.** Cook mode passo-passo con timer, e
modalità palestra con **timer gigante leggibile col telefono a terra**. Escono
dal sistema di card: vanno disegnate come eccezione dichiarata, come ho fatto
per «Allenati ora».

**D4 — L'inserimento dati.** Serie/ripetizioni/carichi per esercizio, storico e
record personali: la lista di lettura diventa un modulo compilabile.

**D5 — Le liste lunghe operative.** La spesa **ordinata per corsia e spuntabile
al supermercato**, il ricettario cercabile con tag e «fatta 3 volte». Formati
che oggi non esistono nel sistema.

**D6 — Il livello sociale.** Amici, consenso reciproco, «chi viene», liste
condivise, viaggio condiviso, conto diviso. Oggi ogni schermata è mono-utente:
non c'è un avatar da nessuna parte se non il tuo.

**D7 — «Cosa sai di me».** Profilo leggibile e correggibile, 👍/👎 sui consigli,
«non dirmelo più», «spiegami perché». Vincolo esplicito in
`BUSSOLA-E-ROADMAP.md`: non dev'essere una scatola nera. Ogni consiglio nei
mock è oggi un testo senza affordance.

**D8 — Le modalità alternative.** La Home cambia per fascia oraria; **durante il
viaggio la Home diventa il viaggio**; tema chiaro. Sono tre configurazioni della
stessa schermata, non una.

**D9 — Le schermate di atterraggio delle notifiche.** Safari iOS ignora le
azioni nelle notifiche: la scelta si fa in app dopo il tap (i chip
«Ora / Pomeriggio / Sera»). Ogni push ha bisogno di una vista che la accolga.

**D10 — Podcast e musica in Guarda.** La sezione diventerà «una pagina sola con
film, serie, podcast e musica». Il formato poster 2:3 non regge per un podcast:
serve prevedere la variante quadrata.

---

## E · MOCK PER MOCK

### E1 · HOME
1. Sfondo più profondo: le tre luci d'ambiente sono corrette ma piatte —
   servono grana più fine, una quarta luce fredda in basso, e un velo che si
   muove impercettibilmente allo scroll.
2. Titoli di sezione da allineare al Fraunces 16,5 (A1).
3. Tab «Dieta» → «Cucina» (A2).
4. Terracotta dei bottoni → `#AB5A3B` (A4).
5. Fare posto alla card battito sotto il saluto, con la regola del «se non c'è,
   non c'è» (D2).
6. La barra «Chiedi a Keiko» va portata a pannello con anteprima (D1).
7. Il carosello «Riprendi» è l'unico ammesso: va reso davvero scorrevole con
   snap, e le card devono usare il poster 2:3 come Guarda.
8. Allineare il titolo dell'allenamento a quello della sezione (B5).

### E2 · CUCINA
9. Togliere il fluo: l'anello luminoso attorno alla barra assistente
   (`0 0 0 4px` + ombra 34px) va ridotto a un bordo teal sottile e un'ombra
   appena percettibile. Vale anche per i tre prompt-esempio sotto.
10. «Prossimi giorni» va riallineato: stessa larghezza, stesso margine e stesso
    trattamento foto delle card-giorno di Allenamento e Viaggi (A7).
11. Decidere le calorie (B1) e, se cadono, ridisegnare l'anello del «Menu di
    oggi» che oggi misura le kcal.
12. Due «vedi tutti» nella stessa schermata: uno dei due va cambiato (A6).
13. Prevedere il cook mode a tutto schermo come sotto-vista (D3).

### E3 · ALLENAMENTO
14. Allineamento generale: è la sezione più avanti, ma va portata alle regole
    unificate di A1-A12 come tutte le altre.
15. Prevedere la modalità palestra col timer gigante (D3) e l'inserimento
    serie/carichi (D4).

### E4 · GUARDA
16. La ricerca unica titoli+consigli funziona ma è piatta: va costruita come
    pannello che si espande dalla barra, con i cinque stati (D1), gli scheletri
    durante i ~7 secondi del consiglio (C4) e i risultati che entrano
    scaglionati (C1).
17. Il risultato del consiglio non è una lista: è **una card motivata**, con il
    perché in teal e i due pollici (D7).
18. Prevedere la variante quadrata per podcast e musica (D10).
19. Le tre sotto-viste ancora non disegnate: scheda del titolo, salvati, visti.

### E5 · VIAGGI — da rifare
20. Prima card «prossimo viaggio» con le info sotto: resta, è la parte giusta.
21. **L'itinerario va a scomparsa**: aperto solo il prossimo passo / prossimo
    evento, tutto il resto chiuso e tutto cliccabile per aprirsi.
22. «Da sapere» resta, ma va reso dinamico: le tre righe diventano card che
    scorrono, o si aprono con la fonte dentro.
23. «Messaggio pronto» è troppo piatto: va trattato come un oggetto — carta con
    bordo, testo in corpo maggiore, e l'azione di copia che dà un ritorno vero.
24. Sezioni nuove in fondo: **prossimi viaggi** e **viaggi passati**.
25. Sezione **idee per il viaggio**, sul modello del Ricettario della Cucina.
26. Sotto-vista **dentro il singolo viaggio in stile ricettario**: barra
    assistente, scorciatoie editoriali, chip funzionali, card media-first con il
    motivo teal.
27. Decidere se Viaggi diventa un tab (B4): con quattro sezioni in più, la
    tessera quadrata in Home non regge.

---

## F · ORDINE DI LAVORO CHE PROPONGO

1. **Sciogliere B1-B5** (cinque decisioni tue, cinque minuti).
2. **Scrivere il file dei componenti condivisi**: un solo foglio di stile con
   A1-A12 risolti, che tutti e cinque i mock importano. Oggi ogni mock ha la sua
   copia del sistema: è per questo che divergono.
3. **Rifare Viaggi** da zero sui punti 20-27 (è il lavoro più grosso).
4. **Ripensare la ricerca di Guarda** come pannello (16-19).
5. **Ripassare Home e Cucina** con le correzioni 1-13.
6. **Ultimo giro di allineamento** su tutti e cinque insieme, con gli stessi
   dati mock condivisi: stesso allenamento, stesso viaggio, stessi pasti.
