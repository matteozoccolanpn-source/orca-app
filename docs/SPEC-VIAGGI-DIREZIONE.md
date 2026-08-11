# KEIKO — VIAGGI, la direzione (decisa il 9 agosto 2026)

> Questa è una decisione **di prodotto**, presa prima di disegnare qualsiasi
> schermata, dopo un inventario del codice reale (`app/viaggio/ViaggioView.tsx`,
> `app/api/trip/*`, `lib/trip-enrich.ts`, `lib/incastri.ts`) confrontato con
> `docs/SPEC-PIANIFICATORE.md`, che è fermo al 2 luglio.
>
> **La decisione**: le cose ferme in cima, il piano solo nei buchi.
> Viaggi non è più «l'itinerario che Keiko scrive». È il posto dove stanno le
> tue cose quando parti — e dove, **solo per le ore vuote**, Keiko propone
> qualcosa. Tutto il resto discende da qui.

---

## 1 · Cosa c'era che non andava

**Tre azioni su quattro non facevano quello che dicevano.**
«Scambia una tappa» è un `toast()` e basta. «Cambia (1/3)» cicla le alternative
in memoria e si perde al refresh: la scelta non viene salvata, quindi non esiste
per il messaggio, per le notifiche, per nient'altro. **«Aggiorna» su un viaggio
già pronto non aggiorna niente** — chiama `autoEnrichNewTrips()`, che lavora
solo sui `pending` — ma risponde comunque «Itinerario fresco: tutto confermato ✅».
L'unica azione vera è «Modifica», che è anche la più cara.

**Il costo non aveva rapporto col valore.** `spendAi("viaggio")` pesa **10**, il
massimo dell'app (cattura 1, catalogo 1, consiglio 2, piano 5). Generare un
viaggio costa 10 — e **spostare una singola visita al pomeriggio costa
anch'esso 10**. Il commento nel codice lo ammette e lascia la questione aperta.

**La verifica che giustificava il prezzo non è mai partita.** Dai commenti di
`lib/trip-enrich.ts`: *«misurato su tre viaggi veri: il modello non ha mai usato
la ricerca web e ha risposto in un giro»*. Quindi «mai posti chiusi», «fonti
citate», «scioperi di quel giorno» erano promesse del prompt, non garanzie del
codice — pagate a prezzo pieno.

**I biglietti sparivano dentro il viaggio.** Il piano nasce dai biglietti e poi
li dimentica: in `/viaggio` non vedi un orario reale, un numero di carrozza, un
codice di prenotazione — vedi la parafrasi che ne ha fatto il modello. Il ponte
esiste a metà (`matchTicket`, righe 54-59): la pagina interroga il database per
biglietti che poi non mostra mai.

**Home e Viaggi si contraddicevano.** La home prende `getAllTripPlans()` (anche
`pending`) e ne mostra il primo per data crescente, con la stringa fissa
«itinerario pronto ✓»; `/viaggio` mostra solo i `ready`. Risultato: la tessera
può promettere un itinerario pronto e portare a «Nessun itinerario pronto». E
nessuno dei due filtra le date passate: un viaggio finito resta per sempre e,
essendo il più vecchio, è proprio quello che la home sceglie.

---

## 2 · Cosa vuol dire la direzione scelta

**In cima, quello che è vero.** Voli, treni, hotel, biglietti: orari reali,
codici di prenotazione, posti, gate. Vengono dai `tickets`, non dall'AI, e si
mostrano come sono. Il ponte `matchTicket` va finito, non buttato: la tappa
delle 15:40 deve poter aprire il biglietto vero.

**Sotto, solo i buchi.** L'AI smette di riscrivere il viaggio e si limita a
riempire le ore vuote con due o tre proposte concrete. Non produce più un
«itinerario»: produce **suggerimenti per le fasce libere**, che è una promessa
molto più piccola e che il codice può mantenere davvero.

**Conseguenze dirette, da portare in codice quando si tocca la sezione:**

1. Il peso AI dell'edit di uno slot scende da **10 a 1** (`spendAi("cattura")`):
   è già previsto nel commento del codice.
2. La generazione, se resta senza ricerca web verificata, non può costare 10.
   O la ricerca parte davvero (e allora il prezzo si giustifica), o il peso
   scende. Va misurato prima di decidere il numero.
3. Un biglietto nuovo **non fa ripartire tutto il piano**: oggi `syncTripPlans`
   rimette il viaggio su `pending` e ripaga tutto. Deve toccare solo la fascia
   interessata (era già il §6 della spec, mai implementato).
4. La scelta fra le alternative **si salva**. Se non si salva, non è una scelta.
5. I viaggi passati escono dalla vista, e la home smette di mostrare il primo
   per data crescente senza filtro.
6. «Aggiorna» o fa qualcosa o sparisce. Non può mentire.
7. Lo stato vuoto «Nessun itinerario pronto» oggi è un vicolo cieco senza
   bottoni: nella direzione nuova non ha nemmeno senso, perché il viaggio esiste
   appena esiste un biglietto.

---

## 3 · Cosa resta valido di SPEC-PIANIFICATORE.md

- Il guardrail dei viaggi lunghi (≥7 giorni non si generano): c'è ed è esatto.
- I tre secchi (fisso / commerciale / logistica): utili, ma vanno **verificati
  nel codice**, non solo chiesti nel prompt (nessun controllo che `fonte` sia un
  URL, nessun controllo anti-prezzo).
- Il pattern-swap delle alternative, preso dallo scambio-pasto della dieta.
- Multi-città e viaggi a segmenti restano «non ora»: `detectClusters` gestisce
  una destinazione sola.

Quello che la spec prometteva e non esiste: la **fase leggera** (verifica del
volatile a richiesta — `searched_at` viene scritto e mai letto), e gli **stati
degli slot** APERTO / RIEMPITO / BLOCCATO. Il primo torna utile nella direzione
nuova; il secondo diventa quasi inutile, perché la parte fissa non si tocca per
definizione.

---

## 4 · Nota di navigazione

Viaggi oggi non è un tab: `KeikoNav.tsx` ha cinque voci e il commento dice che
«viaggio non ha un'icona sua in barra: è una sotto-pagina della Home». Ci si
arriva da una tessera quadrata dentro «Oggi per te», grande come Dieta e
Allenamento. Nella direzione scelta la cosa regge — Viaggi è una schermata che
si accende quando c'è un viaggio, non una sezione sempre presente — ma va
deciso esplicitamente prima del mock, non lasciato com'è per inerzia.

---

## 5 · Decisione dell'11 agosto 2026 — la sezione è in pausa

Nel giro di ondate che porta la UI V2 in codice, **i Viaggi si saltano**.

Il motivo è quello del §1: tre azioni su quattro non fanno quello che dicono.
Rivestire questa sezione con il sistema V2 vorrebbe dire rendere coerenti e
belli dei bottoni che mentono — e consolidare in un design system una cosa che
va prima riparata.

Quindi: **nessuna ondata di restyling sui Viaggi finché il §2 non è stato
portato in codice.** Chi riprende questo lavoro parte dai sette punti del §2,
non dal mock.

L'ordine delle ondate diventa: Cucina (`/cucina`), poi Dieta (`/salute`),
poi Home. I Viaggi restano dove sono, con il vestito vecchio, finché Matteo
non decide di affrontare la sostanza.
