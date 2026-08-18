# Il ricettario — due strade, due regole
### prompt per Claude Code · da eseguire in `orca-app`
### versione 2, scritta **dopo** le misure della PARTE 0

> Il documento di riferimento è `docs/SPEC-RICETTARIO.md`. **Leggilo prima**:
> qui c'è il come, lì c'è il perché.
>
> Le misure che hai fatto hanno cambiato il piano. In particolare: il gradino
> ② è quasi ovunque chiuso, il ⑤ è **parcheggiato**, e la cosa più redditizia
> del documento è una riga sola.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate; niente rifattorizzazioni di
file scollegati; `npx tsc --noEmit` e `npm run build` verdi prima di ogni
commit; **mai committare senza l'ok esplicito di Matteo**.

**Autorizzazione**: `lib/cucina.ts`, `lib/ai.ts`, `app/api/cucina/`,
`app/cucina/`. Niente altro in `lib/` o `app/api/`.

Hai il login di sviluppo. ⚠️ Verifica quale utente stai guardando **dai dati**,
non dalla variabile.

**Fermati alla fine di una parte, mai a metà**, e dimmi dove sei arrivato.

---

## Il concetto, in tre righe

Due strade per far entrare una ricetta, con regole **opposte**:

- **cerco io** — Keiko sceglie cosa mostrare, quindi **può scartare**;
- **porto io** (link o screenshot) — ha scelto Matteo, quindi **non scarta**:
  va fino in fondo con quello che ha.

Se ti trovi ad applicare la regola di una strada all'altra, ti sei perso:
torna qui.

## Cosa è cambiato da ieri — leggilo, ti risparmia lavoro

- la **YouTube Data API v3 è ora abilitata**. Progetto `engaged-oarlock-504809-b6`,
  chiave «Chiave API 1», limitata a **Custom Search API + YouTube Data API v3**,
  nessuna restrizione per applicazione. ⚠️ La chiave di **Google Places sta
  altrove** — altro progetto o altro account: non dare per scontato che «la
  chiave Google» sia una sola;
- il gradino **② vale solo su YouTube**. Su TikTok e Instagram la pagina non è
  servita a un server e la strada è chiusa: non riprovarci;
- il gradino **⑤ (audio del video) è parcheggiato**. Non costruirlo. Il perché
  è in fondo;
- **le sei ricette salvate si possono rilanciare**: Matteo ha detto sì.

## Aggiornamenti dopo la PARTE 1 — fatta e consegnata

- il taglio a 200 è **chiuso**: `titoloCorto()` in `lib/cucina.ts`,
  `app/api/cucina/didascalia.ts` per il testo intero alla fonte. I video con i
  passi passano da **0 su 8 a 4 su 8**;
- ✅ **sì ai titoli già salvati**: passali a `titoloCorto`. Il backup c'è;
- il gradino **①bis** (il link alla ricetta scritta dentro la didascalia) è
  nuovo e nasce da quello che hai trovato tu. Vedi 3.1;
- **la lezione da tenere**: la stessa chiamata rifatta tre volte dava 9, 0, 9, e
  quell'instabilità era il difetto che si dichiarava. Una misura su un modello
  che gira una volta sola non è una misura. **Rifai tre volte** ogni numero su
  cui si decide qualcosa.

---

# PARTE 1 · Il taglio a 200 — la riga che vale più di tutto il resto

`app/api/cucina/search/route.ts:331` fa `.slice(0, 200)` sul titolo, che per un
video **è la didascalia intera**. Quel testo tagliato è anche quello che
mandiamo al modello. Risultato: i passi c'erano e non li abbiamo mai visti.

⚠️ **Non limitarti a togliere lo `.slice`.** Il taglio serviva a qualcosa: una
didascalia di 717 caratteri come titolo di una card è illeggibile. Il difetto
non è il taglio, è **dove** è fatto — una decisione di impaginazione scritta nel
dato.

Quindi: **due campi distinti**, il testo intero per l'estrazione e un titolo
corto per la card. Come li chiami e dove li tieni decidilo tu, ma la regola è
**si tronca dove si disegna, mai dove si scrive**.

Verifica che il titolo corto sia sensato: la prima riga di una didascalia non è
sempre il nome del piatto. Se serve, il nome del piatto lo dà l'estrazione, che
già gira.

## 1.1 · Le sei ricette già salvate — autorizzato

Hanno il titolo tranciato a 199 caratteri, quindi hanno perso i passi che
c'erano. **Rilanciale** con la didascalia intera (che va ripresa dalla fonte:
quella salvata è già tagliata) e riscrivi ingredienti e passi.

⚠️ Prima **mostrami cosa cambierebbe** su una sola ricetta, poi lancia le altre
cinque. Sono righe vere di Matteo, non dati di prova.

🚫 Se per una ricetta la fonte non risponde più, **lasciala com'è**. Meglio
vecchia che vuota.

**Fermati qui e dimmi quante ne hanno riguadagnati i passi.** È il numero che
dice se tutto il resto serve ancora.

---

# PARTE 2 · La ricerca consegna solo ciò che si cucina

**Oggi** torna tutto e la card marca. **Deve diventare**: torna **solo** i
risultati per cui Keiko ha i passi. Gli altri non compaiono — non marcati,
**assenti**. Una card che dice «questa non si può cucinare» è lavoro che
scarichiamo addosso a chi cerca.

Dalle tue misure passa il **32%**, cioè 8–10 per ricerca: più di una schermata.
Non diventa magra.

## 2.1 · Il controllo, e deve restare economico

- **pagina web** → il marcatore standard, una lettura sola, gratis;
- **video** → solo ① e ②, che stanno nella pagina che scarichi comunque.
  Niente sito del creator, niente ricerca web, niente audio: quelli sono roba
  della strada 2, dove è Matteo ad aver chiesto.

⚠️ **Filtra tutti i risultati, non i primi dodici** come fa la rotta oggi: su 84
ne passano 27, ma su 12 ne passerebbero 4 e la ricerca diventerebbe povera per
davvero.

⚠️ **In parallelo, con un tetto di tempo**, e dimmi quanto dura prima e dopo. Se
raddoppia l'attesa abbiamo scambiato un difetto con un altro.

## 2.2 · La ripesca — e va costruita al contrario

La tua regola testuale azzecca 8 su 8, ma **cinque positivi su cinque li ha
presi la sola parola «procedimento»**. Il suo errore è quindi **per difetto**:
scarta una ricetta buona che i passi ce li ha ma non usa quella parola.

E un falso negativo **è invisibile** — chi cerca non sa cosa ha perso.

Quindi la chiamata a Haiku si fa, ma **non filtra: ripesca**.

- gira **solo sui risultati che la regola ha scartato**;
- può **solo promuovere, mai togliere**. Un risultato approvato dalla regola,
  Haiku non lo vede nemmeno;
- una chiamata sola per ricerca, sulle scartate insieme.

Così un modello non può **nascondere** niente: può solo restituirci roba che
avevamo buttato.

⚠️ **Registra quante ne ripesca.** È il numero che dice quanto spesso la sola
parola «procedimento» sbaglia — oggi non lo sappiamo e non lo sapremo mai
altrimenti.

## 2.3 · Lo stato vuoto

Se dopo il filtro non resta niente, non è un errore: è una risposta. «Di questa
non ho trovato nessuna versione con i passi», e la porta della strada 2: «hai
il link di un video?».

## 2.4 · Salvando

Resta attaccato **il link alla fonte** — video, blog o post. La ricetta è
nostra, la visualizzazione resta di chi l'ha girata.

**Fermati qui.** La PARTE 1 e la PARTE 2 insieme sono già un ricettario che
funziona.

---

# PARTE 3 · La strada 2 — i gradini economici

## 3.0 · Prima una verifica da una riga

Dopo il fix della PARTE 1 restano **quattro video senza passi**. **Quanti di
questi sono su YouTube?**

- se **zero** → il gradino ② non salva nessuno dei casi veri. Costruiscilo
  lo stesso (è poco lavoro e l'API ora c'è), ma **dimmelo**, così sappiamo che
  serve per il futuro e non per adesso;
- se **uno o più** → il ② vale subito.

## 3.1 · I gradini, in ordine, fermandosi al primo che funziona

**① La didascalia** — quello che già fa, adesso intera.

**①bis · Il link alla ricetta scritta, dentro la didascalia** — **è il gradino
che hai trovato tu, e va qui, non al ③.**

Nella descrizione della crostata al pan di zenzero c'era scritto
«★ INGREDIENTI, DOSI e PROCEDIMENTO: https://ricette.giallozafferano.it/…».
Quel link sta in un testo che adesso leggiamo **per intero e gratis**: cercarlo
costa zero e risolve la ricetta senza chiamare nessun modello, perché quasi
sempre porta a una pagina con il marcatore standard.

Cerca ogni URL nella didascalia e prova le pagine di ricetta che trovi.
⚠️ Vale comunque il controllo degli ingredienti del 3.2: un creator può mettere
in descrizione il link a **un'altra** sua ricetta.
🚫 Non seguire link a sponsor, negozi, Amazon, codici sconto.

**② Il commento fissato, solo su YouTube** — `commentThreads.list` ordinato per
rilevanza, con la chiave che ora ha il permesso. Costa 1 unità su 10.000 al
giorno: non la sfiori. Guarda i primi commenti, e in particolare quello del
creator stesso.
🚫 Su TikTok e Instagram non riprovarci: l'hai già misurato.

**③ Il sito del creator dalla biografia** — 0 su 3 nella tua misura, e su TikTok
la biografia è dietro il muro del login. **Declassato**: con ①bis la stessa
informazione arriva da un testo che abbiamo già. Tienilo per ultimo prima del
④, e non spenderci tempo a fare l'ingegnere.

**④ La ricerca sul web** — titolo più creator. È il gradino che ha funzionato
(MoltoFood → moltofood.it, 11 ingredienti e 12 passi).

## 3.2 · Il controllo che rende tutto onesto

Quando i passi arrivano da ② ③ ④, prima di attaccarli **gli ingredienti devono
combaciare**. Se non combaciano → **si scende al gradino dopo**, non si salva
lo stesso.

⚠️ **Dimmi come decidi che combaciano, prima di scriverlo.** Uguaglianza esatta
non funziona («pomodorini» ≠ «pomodori ciliegini»); una somiglianza larga fa
passare tutto. È una scelta di soglia e la voglio vedere, con due o tre esempi
veri presi dalle sei ricette.

E quando li trova, **dice da dove**: la fonte è sempre visibile.

## 3.3 · I due ingressi

- **il link** — incollato o condiviso. Keiko legge la scheda pubblica;
- **lo screenshot** — la macchina è quella della scheda del PT: si carica
  un'immagine, il modello legge cosa c'è scritto. Serve a ricavare **titolo e
  creator**; se sullo schermo ci sono anche i passi, tanto meglio.

Da lì in poi il lavoro è identico.

---

# PARTE 4 · Il legame con il piano

Se una ricetta somiglia a un pasto del piano — «pollo al curry» ≈ «pollo e
verdure» di giovedì — Keiko lo **propone**: «la colleghi al pranzo di
giovedì?». Un tocco, e quel pasto ha il suo «Cucina con Keiko».

⚠️ **Propone, non decide.** Il legame finisce nel **registro** di cosa Matteo ha
mangiato: se lo indovina il testo e sbaglia, l'app scrive una cosa falsa su di
lui. Il dito conferma sempre.

Riusa il giro del blocco 7, non farne un altro.

---

# PARTE 5 · Quando i passi non ci sono

Due strade, ed è qui che finisce quello che il ⑤ avrebbe raccolto:

**Scrivi tu i passi** — il campo c'è già. Da quel momento è una ricetta a tutti
gli effetti: entra nel ricettario, ha «Cucina con Keiko», è come le altre.
**Rendilo comodo**: è il percorso normale per una ricetta su quattro, non un
ripiego. Si scrive mentre si guarda il video, quindi il video deve restare
raggiungibile da lì.

**Tienila come idea** — resta salvata con la sua foto e il suo link, in un posto
suo, **senza il tasto per cucinare**. Non finge di averlo.

Nel ricettario ci sono ricette, e una ricetta ha i passi.

---

# Il gradino ⑤ — perché non si fa adesso

Non perché non serva: perché **la misura che dice quanto serve è stata fatta su
un codice difettoso**. Con la didascalia tagliata arrivavano al video 2 video su
8; con la didascalia intera non lo sappiamo ancora.

Rimettiamo a posto la base, guardiamo il numero su venti ricette invece che su
otto, e allora la decisione sull'audio si prende su un dato vero.

🚫 **Non costruirlo, non prepararlo, non lasciare impalcature.** Il ⑤ è un
gradino in fondo a una scala che esiste già: aggiungerlo fra due settimane non
richiederà di rifare niente.

✅ Quello che invece serve **adesso** è la PARTE 5 fatta bene, perché è lei che
regge i casi che il ⑤ avrebbe preso.

---

## Cosa NON si fa, mai

- 🚫 **inventare i passi dagli ingredienti.** È l'unico punto dell'app dove
  un'invenzione ha una conseguenza fisica: una ricetta sbagliata te la mangi;
- 🚫 attaccare i passi di una ricetta simile senza che gli ingredienti
  combacino;
- 🚫 salvare come «ricetta» qualcosa che non ha i passi;
- 🚫 incorporare il video: il tocco porta sulla piattaforma del creator.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. **Premendo, sull'app vera**: una ricerca, e **apri tre risultati a caso** —
   devono essere tutti cucinabili. Se uno non lo è, il filtro non tiene.
3. Un link incollato e uno screenshot caricato, fino in fondo.
4. **Gli stati vuoti**: ricerca che dopo il filtro torna zero, link che non si
   apre, screenshot illeggibile, ricetta senza passi.
5. **Il costo**: quanto è costato un giro intero, letto dal registro e non
   stimato. L'obiettivo resta **2–3 centesimi**.
6. **Il tempo della ricerca**: prima e dopo il filtro.
7. A **430 × 932 dpr 2 con le safe-area**, e con la rete rallentata: scheletri,
   non spinner.

## Cosa consegnare, con le fermate

1. **PARTE 1** — quante delle sei hanno riguadagnato i passi. Fermati.
2. **PARTE 2** — filtro e ripesca, con i tempi e quante ne ripesca Haiku.
   Fermati.
3. **PARTE 3.0** — quanti dei rimasti sono YouTube, **prima** di costruire il ②.
   Fermati.
4. Il resto.

A ogni fermata: voce per voce con **fatto / non fatto / rotto**, e tre righe —
cosa hai portato, cosa hai lasciato aperto, e ogni punto in cui hai dovuto
decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
