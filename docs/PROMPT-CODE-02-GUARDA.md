# Ondata 2 — Guarda con i dati veri
### prompt per Claude Code · da eseguire in `orca-app` **dopo** l'ondata 1

> L'ondata 1 ha creato `app/keiko-v2.css`, i componenti in `app/components/v2/`
> e la rotta di parità `/v2/keiko` con Guarda a dati finti.
> Qui si porta la sezione **vera** sul sistema nuovo, senza perdere niente.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; **non toccare `lib/` né `app/api/`**;
`npx tsc --noEmit` e `npm run build` verdi prima di ogni commit;
**mai committare senza l'ok esplicito di Matteo**.

## Il compito, in una riga

`app/guarda/GuardaView.tsx` (964 righe) cambia **solo il livello visivo**:
markup e classi del mock, componenti da `app/components/v2/`, tutto avvolto in
`<div className="k2">`. **Stato, effetti, chiamate di rete e gestori restano
dov'erano.** Non si riscrive la logica: è fatta di casi limite che sono costati
mesi, e il mock non li conosce.

Riferimenti: `docs/mockups/keiko-v2-mock.html` (scheda Guarda, foglio del
titolo, ricerca, filtri) e `docs/UI-GUARDA-AUDIT.md`.
`app/guarda/page.tsx` **non si tocca**: risolve i poster su TMDB una volta sola
e li riscrive in tabella, ed è la ragione per cui la pagina non chiama più
niente all'apertura.

## 1 · Cosa deve continuare a funzionare, identico

Prima di cambiare una riga, fai l'inventario di questi comportamenti e alla fine
verificali uno per uno. Se un pezzo del mock ne contraddice uno, **vince il
codice** e me lo segnali.

- **Il ponte dal cinema**: `?vota=` apre la scheda se il titolo è già in lista,
  altrimenti lo mette nella ricerca (`ponteFatto`).
- **Lista ottimistica**: `list` si ri-sincronizza su `items` dopo
  `router.refresh()`.
- **Tocco lungo** con `pointerdown/move/cancel` e `pressFired`: apre il menu
  azioni; il movimento lo annulla. Il tap normale apre la **scheda**, mai
  «visto».
- **Tira per aggiornare** (`tiro`, `tiroDa`, `aggiorno`).
- **Toast con azione**: l'eliminazione è annullabile entro il timer (`timers`).
- **Foglio «Dove vederlo»**: `/api/watch/providers` con timeout 12s, più i
  link di ripiego di `platformUrl` / `justwatch`.
- **Foglio scheda**: `/api/watch/details`, `/api/watch/similar`, voto e nota in
  `PATCH /api/watch`, con il voto **prima** della trama se il titolo è già visto.
- **Serie**: `/api/watch/progress`, «+1 episodio», la correzione a mano di
  stagione ed episodio, `serieInfo` con stagioni totali e prossima messa in onda.
- **Ricerca trasversale**: `/api/watch/search` con `AbortController`,
  `disponibilita()` che decide segno e testo, l'ordinamento che mette prima
  quello incluso negli abbonamenti, e `aggiunti` per i titoli appena aggiunti.
- **L'invito agli abbonamenti** quando `haScelto` è falso, chiudibile
  (`invitoChiuso`) e mai mostrato a vuoto.
- **Filtri**: scheda (da vedere / visti / tutti), tipo, genere, ordine, e il
  foglietto dei filtri.
- **Una griglia sola**: nessun titolo può comparire due volte.

## 2 · Cosa cambia, e come

**La griglia** diventa il componente `Poster` (2:3, tre colonne, `minmax(0,1fr)`),
badge unico in alto a sinistra, titolo **fuori** dalla foto su due righe, e il
titolo come ripiego quando la locandina non arriva. Il «visto» è **velo scuro +
spunta piccola in basso a destra**: non la spunta grande al centro che c'è oggi.

**Le schede e i filtri** passano dal segmented control ai `Chip` pill
(attivo = fill teal, inattivo = bordo marcato). Il foglietto filtri resta, con
righe-azione al posto dei bottoni pieni.

**Il menu del tocco lungo** diventa `Sheet` + `SheetHero` + righe-azione con
icona (icona quadrata quota 2, titolo, metadato, chevron); la primaria in alto,
«Togli dalla lista» in fondo, terziaria, con conferma.

**La barra** è una sola e fa due cose diverse, e questo va rispettato:
- se quello che scrivi sembra un titolo → **ricerca vera**, istantanea, gratis,
  come oggi: nessun pannello a cinque stati, nessun costo AI;
- se è una domanda → il **pannello** `AskPanel` con «sta pensando», gli
  scheletri durante l'attesa e il risultato come **una card motivata** (non una
  lista), con il perché in teal, i pollici e «spiegami perché».
Se oggi il consiglio non passa da questa barra ma da un'altra strada, dimmelo
invece di inventare il collegamento.

**«Stasera per te»** diventa la card `Feature` con il motivo teal e il
`Feedback`. **«Continua a guardare»** va **prima** di «Stasera per te»: quello
che ho lasciato a metà viene prima di un consiglio nuovo.

**Testata**: «Guarda» in Fraunces 22 e una riga sola di stato («19 titoli»); il
resto è filtro, non sottotitolo. Zero emoji: si usa il set di icone.
Colore: teal per stato, selezione e il «c'è su…»; terracotta **solo** sulla
primaria di riga e sul FAB.

**Stati**: scheletri durante ogni attesa di rete (non lo spinner), stato vuoto
progettato quando un filtro non trova niente, e la card «Per oggi mi fermo qui»
se il tetto AI è stato raggiunto — come card, non come errore rosso.

## 3 · Cosa NON fare in questa ondata

- Non portare i **podcast**: nel mock ci sono come variante quadrata, ma in
  codice la sezione non esiste. Si farà quando esisterà il dato.
- Non toccare `page.tsx`, `lib/`, `app/api/`.
- Non cambiare le rotte né i nomi delle proprietà dei dati.
- Non introdurre componenti nuovi oltre a quelli di `app/components/v2/`: se te
  ne serve uno, scrivi perché e chiedi.

## 4 · Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. Con Playwright a **430 × 932, dpr 2**: screenshot della Guarda vera
   affiancati alla stessa schermata del mock, e l'elenco delle differenze
   rimaste.
3. La lista del punto 1, comportamento per comportamento, con **fatto / non
   fatto / rotto**. Questa è la parte che conta più degli screenshot.
4. Prova anche: nessun titolo in lista, filtro che non trova niente, rete lenta
   (throttling), locandina che non arriva, `?vota=` con un titolo che c'è e con
   uno che non c'è.

## 5 · Cosa consegnare

Alla fine, **tre righe**: cosa hai portato, cosa hai lasciato aperto, e dove il
mock e il codice si contraddicevano — con quale dei due ha vinto e perché.

Non committare finché Matteo non dice di sì.
