# SPEC — Eventi composti («questo we c'è il GP»)

> 9 agosto 2026. Una frase → più eventi veri in agenda, con orari cercati,
> info e link. L'idea 88 portata a compimento.
> ⏸ In coda dopo: cook mode → manifesto UI → editoriale. Non si apre ora.

## L'idea

- «ricordami di vedere gli europei di nuoto in vasca» → Keiko CERCA il
  programma vero → crea gli eventi delle sessioni (batterie/finali, coi
  giorni giusti) → ogni card dice che gare ci sono + link approfondimento
- «questo we c'è il GP di F1» → libere, qualifiche, gara: tre eventi, orari
  italiani, e la card della gara con il link al circuito/news
- Notifiche: quelle che esistono già (i reminder) — nessun sistema nuovo.

## Come si costruisce (riusando quello che c'è)

1. **Riconoscimento**: la cattura capisce che è un evento «composto»
   (GP, europei, mondiali, olimpiadi, tornei…) — un flag dal parser.
2. **La ricerca del programma** — due strade in ordine:
   a. **TheSportsDB** (chiave già in .env): strutturato e gratis, copre
      leghe e gare principali. Da verificare quanto scende nel dettaglio
      (le sessioni F1 separate? le giornate degli europei?).
   b. **AI + ricerca web** (ripiego, stile trip-enrich): Claude cerca il
      programma ufficiale e restituisce le sessioni in JSON. Peso 2
      (~3-5 cent per richiesta composta), cache per evento — «europei
      nuoto 2026» si cerca UNA volta per tutti gli utenti (catalogo
      condiviso, come films_catalog... ma stavolta ha senso: il programma
      degli europei è uguale per tutti).
   REGOLA FERREA: orari solo VERIFICATI. Se la ricerca non trova il
   programma, si crea UN evento generico con la data nota e si dice
   onestamente «programma non ancora disponibile» — mai orari inventati.
3. **La famiglia in agenda**: N tickets con una `series_key` comune —
   stesso identico pattern del cluster_key dei viaggi, già in produzione.
   La card mostra la serie («GP Monza · 3 di 3»), cancelli tutta la serie
   o la singola sessione.
4. **Info e link**: dentro enrichment (pattern esistente): quali gare ci
   sono, link approfondimento (ricerca, come le Scoperte).
5. **Battiti**: gratis — ogni sessione è un evento sport, quindi «le
   formazioni/le ultime» prima e «gli highlights» dopo funzionano già.

## V2 (non ora): «Segui»

«Segui la F1» / «segui il Milan» → i prossimi eventi si aggiungono da soli
a calendario che esce. È un abbonamento, non una cattura: cron settimanale
che controlla TheSportsDB. Potente ma da fare quando la V1 ha dimostrato
che il parsing dei programmi regge.

## Costi

TheSportsDB: 0 · ripiego AI: 3-5 cent per evento composto, UNA volta per
evento nel catalogo condiviso · resto: 0.
