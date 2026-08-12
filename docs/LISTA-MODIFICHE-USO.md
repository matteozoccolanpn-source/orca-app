# Keiko — modifiche dall'uso vero
### raccolte da Matteo l'11 agosto 2026, dopo l'arrivo di Home, Guarda e Allenamento in V2

Questa lista non nasce da una revisione a tavolino: nasce dall'app usata dal
telefono. Vale più di un'ondata fatta al buio.

**Come leggerla.** Ogni voce dice: cosa succede **oggi**, cosa deve
**diventare**, e la **nota** che serve a non sbagliare. Le voci sono raggruppate
per natura del lavoro, non per schermata, perché il lavoro è di tipo diverso e
non va mescolato:

- **A · I fogli e le schermate secondarie** — vestito, nessuna logica nuova.
- **B · Caricamenti e transizioni** — vestito, ma tocca la struttura delle rotte.
- **C · Comportamenti nuovi** — prodotto: dati, rotte, decisioni.
- **D · Difetti** — cose che non funzionano.

⚠️ segnala le voci che **modificano il mock congelato della Home**: vanno
recepite anche in `docs/mockups/home-v2-final-mock.html` e in
`docs/UI-DECISIONI-V2.md`, altrimenti la specifica e il codice divergono.

---

## A · I fogli e le schermate secondarie

Il tratto comune: la Home è in V2, ma **tutto quello che si apre sopra di lei è
ancora nel vestito vecchio**. Sono 1571 righe fra sette fogli, e all'uso si
sente come uno strappo — apri una card bella e ci trovi dentro l'app di prima.

### A1 · Il profilo
**Oggi**: `ProfileSheet.tsx`, 518 righe nel vestito vecchio. Le opzioni non
sono allineate al resto e la struttura è cresciuta per accumulo.
**Deve diventare**: `Sheet` + `SheetHero` + righe-azione del sistema (icona
quadrata, titolo, metadato, chevron), **e un menu ripensato**, non solo
rivestito. Raggruppato per aree, con le azioni distruttive in fondo e
terziarie.
**Nota**: è il foglio più grosso e l'unico dove chiedo esplicitamente di
rivedere anche la struttura, non solo l'aspetto. Prima di riscriverlo, elencare
le voci attuali e proporre il raggruppamento.

### A2 · Le card della Home aperte
**Oggi**: `EventSheet.tsx` (150) e le altre si aprono nel vestito vecchio.
**Deve diventare**: `Sheet` + `SheetHero`, metadato → titolo Fraunces → corpo →
righe-azione, primaria in alto.

### A3 · Il calendario e i to-do
**Oggi**: `CalendarSheet.tsx` (61) e `DaySheet.tsx` (136) non sono allineati al
resto; il calendario in particolare è la schermata peggiore dell'app.
**Deve diventare**: sistema V2, con la griglia del mese sulla stessa griglia
4/8 e i giorni come pillole, coerenti con la striscia della settimana in Home.

### A4 · «Chiedi a Keiko»
**Oggi**: `AskSheet.tsx` (112) nel vestito vecchio.
**Deve diventare**: la barra `Ask` e il pannello `AskPanel` del sistema — fermo
→ sta pensando (scheletri, non lo spinner) → risultato con il perché in teal →
pollici e «spiegami perché».

### A5 · «In arrivo» diventa un carosello ⚠️
**Oggi**: le card di «In arrivo» stanno una sotto l'altra.
**Deve diventare**: uno scaffale orizzontale, come «Riprendi» — stessa classe
`.shelf`, stesso snap che abbiamo messo ai chip, così non si ferma a metà card.
**Nota**: ⚠️ questo **cambia il mock congelato della Home**, dove sono
impilate. È una decisione presa sull'uso e va scritta nella specifica, non
applicata in silenzio.

---

## B · Caricamenti e transizioni

### B1 · La schermata bianca all'apertura
**Oggi**: aprendo l'app si vede un lampo bianco prima che compaia qualcosa.
**Deve diventare**: due interventi, in quest'ordine, perché risolvono due cause
diverse e il primo è quello che conta di più.

1. **Il lampo bianco è del browser, non dell'app.** `background_color` nel
   manifesto è `#0C0E13`, il fondo del sistema V2 è `#0D0D10`: vicini ma non
   uguali, e comunque il lampo arriva prima che il manifesto conti qualcosa.
   Serve che il primissimo pixel dipinto sia già scuro: colore di fondo su
   `html`/`body` nel CSS che arriva per primo, `theme-color` allineata, e
   nessuna attesa prima del primo colore.
2. **Poi la schermata di avvio.** Nel foglio V2 esiste già `.k2 .boot`: fondo
   scuro, l'orca in teal con un respiro lento (`animation: breathe`). Si usa
   quella. **Non** uno spinner, **non** un logo statico piazzato al centro:
   l'orca che respira dice «sto arrivando» senza fingere una percentuale che
   non conosciamo. Sparisce in dissolvenza quando arriva il primo dato, non
   dopo un tempo fisso.

### B2 · Il passaggio da una sezione all'altra
**Oggi**: toccando una card (Dieta, Allenamento…) la pagina di caricamento è
ancora quella vecchia, col logo di prima. Nel repo esiste un solo
`app/loading.tsx` e nessun `loading.tsx` per sezione.
**Deve diventare**: `loading.tsx` per ogni rotta, che mostra **lo scheletro
della schermata che sta arrivando** — la testata, le forme delle card — non un
logo e non uno spinner. È il modo in cui l'attesa smette di sembrare un vuoto.

### B3 · Scorrimento laterale fra le pagine ⚠️
**Oggi**: si cambia sezione solo dalla barra in fondo.
**Deve diventare**: si passa da una sezione all'altra scorrendo con il dito a
destra e a sinistra.
**Nota**: ⚠️ da progettare con attenzione, non da aggiungere e basta. Dentro le
pagine ci sono già scaffali orizzontali (Riprendi, In arrivo, i chip): il gesto
deve capire quando sta scorrendo uno scaffale e quando sta cambiando pagina,
altrimenti si rompono tutti e due. Serve una soglia e una direzione dominante,
e va provato sul telefono, non sul desktop.

---

## C · Comportamenti nuovi

Questi **non** sono restyling: toccano dati e rotte. Vanno affrontati come
lavoro di prodotto, con l'autorizzazione esplicita a toccare `lib/` e
`app/api/`.

### C1 · La card del cibo, in Home, diventa utile
**Oggi**: si apre e mostra il pasto. Fine.
**Deve diventare**: quattro azioni, come righe del foglio:
- **come si cucina** — porta alla ricetta e al modo cottura;
- **vai alla Dieta** — apre la sezione;
- **cambia il pasto** — sostituisce quello in corso;
- **segna mangiato** — con la possibilità di indicare che hai mangiato
  **altro**, e cosa.
**Nota legale, non negoziabile**: «cambia il pasto» e «ho mangiato altro»
**registrano una scelta di Matteo**, non producono una prescrizione. Keiko non
scrive né modifica un piano alimentare, e non confronta ciò che hai mangiato col
piano per dirti se va bene. Registra, e basta.

### C2 · Le stesse azioni nella Guarda
**Oggi**: la card apre la scheda.
**Deve diventare**: la stessa logica di C1 — le azioni frequenti raggiungibili
dalla card senza passare per la scheda.

### C3 · L'allenamento non è solo chili
**Oggi**: la sessione registra serie, ripetizioni e chili. Va bene per la sala
pesi, non per il resto.
**Deve diventare**: la registrazione **dipende dalla disciplina**. Se corri:
chilometri, andatura, tempo. Se nuoti: vasche. Se vai in bici: distanza e
dislivello. Il tipo si ricava dall'esercizio, e gli stepper cambiano di
conseguenza.
**Nota**: è la modifica più grossa della lista, perché tocca la forma del dato
in tabella (`workout_set`), non solo la UI. Va progettata prima di essere
scritta.

### C4 · Caricare lo screenshot di un allenamento
**Deve diventare**: si carica la schermata di un'app di corsa (o di un
attrezzo), Keiko la legge e salva la sessione.
**Nota**: è esattamente il meccanismo che già esiste per la scheda del PT
(`/api/workout/upload` → `generate`). Qui Keiko **trascrive quello che hai
fatto**, non propone quello che dovresti fare: resta dentro il vincolo.

---

## D · Difetti

### D1 · L'Allenamento non funziona — i dati non tornano
**Oggi**: segnalato da Matteo, senza dettaglio.
**Serve prima di tutto**: cosa esattamente non torna. Quale schermata, quale
numero, cosa mostra e cosa dovrebbe mostrare. Senza quello si indovina.
**Ipotesi da verificare per prime**, in ordine di probabilità:
- i numeri della settimana (`weekDone`, `weekPlanned`, `streak`) calcolati sul
  server in `page.tsx`;
- `ultimaVolta`, che arriva pronta dal server per tutti gli esercizi del giorno;
- `storicoSedute` e ciò che «A che punto sei» ne ricava;
- il menu delle stagioni che parte vuoto perché aspetta la rotta invece di
  leggere `totalSeasons` già in tabella (già in `docs/ROADMAP.md`, fase B).

---

## L'ordine in cui le farei

1. **B1** — il lampo bianco. È la prima cosa che vedi ogni volta che apri
   l'app, ed è la correzione col rapporto migliore fra fatica e resa.
2. **D1** — capire cosa non funziona nell'Allenamento. Un difetto vero viene
   prima di qualsiasi bellezza.
3. **A1–A5** — i fogli, tutti in un'ondata sola. Sono la stessa natura di
   lavoro e condividono i componenti: farli insieme costa meno che a pezzi.
4. **B2** — gli scheletri di caricamento per sezione.
5. **C1, C2** — le azioni sulle card, che è la prima cosa di questa lista che
   rende l'app più **utile** e non solo più bella.
6. **B3** — lo scorrimento laterale, da solo, perché va provato sul telefono.
7. **C3, C4** — l'allenamento oltre i chili, che è un progetto a sé.

Le sezioni ancora nel vestito vecchio — Cucina, Dieta, Viaggi — restano in
coda: la Cucina è già pronta come ondata, la Dieta viene dopo, i Viaggi sono
in pausa per la ragione scritta in `docs/SPEC-VIAGGI-DIREZIONE.md`.
