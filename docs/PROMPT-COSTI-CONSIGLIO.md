# Keiko — Abbassare il costo del «✨ Consiglio»

> 5 agosto 2026. Tre prompt in sequenza per Claude Code. In ordine, non a caso:
> il primo taglia i tre quarti della spesa in mezz'ora, il secondo accende lo
> strumento di misura, il terzo fa il lavoro vero — e lo fa sapendo se funziona.
>
> Punto di partenza misurato: **~75.000 token in ingresso e ~25 centesimi per
> consiglio**. Obiettivo dopo C3: **~4.000 token e ~2 centesimi**, con la
> risposta che arriva in pochi secondi invece che in decine.

---

## Perché in quest'ordine

**C1 prima** perché è quasi tutto guadagno e quasi zero rischio: nessun
cambiamento visibile, mezz'ora, e il costo scende sotto i 6 centesimi. Se domani
ti stufi e non fai altro, hai già risolto l'80%.

**C2 secondo** perché C3 è il cambio grosso, e valutarlo «a occhio» sui totali
non funziona. Oggi la tabella `usage` non registra *quale* operazione hai fatto:
per capire quanto costava un consiglio si è dovuto dedurlo dai numeri. Venti
minuti di lavoro adesso, e la prova che C3 ha funzionato ce l'hai scritta invece
che stimata.

**C3 ultimo** perché è mezza giornata, ed è l'unico che cambia come funziona la
cosa. Con C1 e C2 già in casa, lo affronti sapendo esattamente da dove parti.

---

# C1 — I tre tagli che non si vedono

```
Contesto: il "✨ Consiglio" costa circa 25 centesimi a richiesta, con ~75.000
token in ingresso. Ho individuato tre cause. Nessuno dei tre interventi cambia
il comportamento visibile della funzione. File toccati: lib/films.ts, lib/ai.ts,
app/api/watch/suggest/route.ts. Fuori da questi tre non toccare niente.

Matteo autorizza esplicitamente la modifica di lib/ e app/api/ per questo
compito.

────────────────────────────────────────────────────────────
(a) LA FASE 2 CHE PARTE SEMPRE — è la voce di spesa più grossa
────────────────────────────────────────────────────────────
Oggi app/api/watch/suggest/route.ts lancia deepenFilmCatalog() in after() a OGNI
consiglio, senza condizioni. Quella fase ha max_uses: 6 — il doppio delle
ricerche della fase 1, che è quella che l'utente aspetta davvero. Nessuno la
guarda: riempie solo una cache.

Fai due cose:
1. In lib/films.ts, deepenFilmCatalog: max_uses da 6 a 2.
2. In app/api/watch/suggest/route.ts, non lanciarla più a ogni richiesta.
   Regola: falla partire SOLO se il catalogo fresco è povero. Concretamente,
   in suggestWatch il catalogo lo leggi già con getFreshCatalog(60): se ha
   almeno 40 titoli, la fase 2 si salta. Serve un modo per far arrivare quel
   numero alla route — restituiscilo da suggestWatch (cambia la firma in
   { films, catalogoFresco: number }) oppure rileggi getFreshCatalog nella
   route. Scegli tu, ma niente doppia chiamata al database se puoi evitarla.

   Lascia un commento che dice perché: la fase 2 esiste per riempire una cache,
   quindi ha senso solo quando la cache è vuota.

────────────────────────────────────────────────────────────
(b) LE RICERCHE WEB PAGATE PIÙ VOLTE — la cache dei prompt
────────────────────────────────────────────────────────────
In lib/films.ts, callClaude ha un ciclo su stop_reason === "pause_turn": ogni
volta che Claude si ferma per cercare, il codice rimette data.content dentro
messages e richiama. È giusto, ma vuol dire che a ogni giro rispedisci l'INTERA
conversazione — risultati di ricerca compresi. Con tre ricerche gli stessi
20.000 token di risultati li paghi tre o quattro volte.

Attiva la cache dei prompt (prompt caching):
- il messaggio iniziale va scritto in forma a blocchi, non come stringa:
  [{ type: "text", text: userContent, cache_control: { type: "ephemeral" } }]
- a ogni giro del ciclo, prima di richiamare, sposta il punto di cache
  sull'ultimo blocco dell'ultimo messaggio, così il giro successivo rilegge
  tutto il resto dalla cache
- attenzione: i punti di cache contemporanei sono al massimo 4, quindi va
  spostato, non aggiunto ogni volta

PRIMA di scrivere il codice leggi la documentazione attuale del prompt caching
(minimo di token perché la cache si accenda, durata, se serve un header): non
fidarti della memoria, questa parte dell'API è cambiata più volte.

Verifica che funzioni: in lib/ai.ts, claudeFetch già somma
cache_creation_input_tokens e cache_read_input_tokens dentro tokenIn. Per
capire se la cache morde servono separati. Aggiungi due console.log temporanei
(o, meglio, tienili nei log strutturati) che stampino i due numeri a ogni
chiamata. Al secondo giro cache_read deve essere alto: se resta zero, la cache
non si è accesa e va capito perché prima di dichiarare finito.

────────────────────────────────────────────────────────────
(c) IL PESO SBAGLIATO NEL TETTO
────────────────────────────────────────────────────────────
In lib/ai.ts il consiglio passa da spendAi("cattura"), peso 1. Ma una cattura
normale costa ~2 centesimi e un consiglio ~25: il tetto dice all'utente che può
fare 30 catture o 15 consigli al giorno, cioè fino a 4 dollari in una giornata,
da solo.

- Aggiungi al tipo AiOperazione e alla mappa PESI una voce nuova:
  consiglio: 10.
  NON riusare "cattura": una voce sua serve anche al prompt C2 che viene dopo.
- lib/films.ts, suggestWatch: spendAi("consiglio") al posto di spendAi("cattura").
- deepenFilmCatalog resta a "cattura" (peso 1): ora è rara e corta.
- Aggiorna il commento in testa a lib/ai.ts che elenca i pesi.
- Sopra la riga del 10, scrivi questo commento, testuale:

  // 10 perché oggi un consiglio costa ~25 centesimi contro i ~2 di una cattura.
  // Questo numero è legato al costo, non alla funzione: quando il consiglio
  // smetterà di usare la ricerca web costerà ~2 centesimi e il peso va
  // riportato a 1-2. Non lasciarlo a 10 per inerzia.

Nota per Matteo, dimmela alla fine se è il caso: con peso 10 e tetto a 30 ti
restano 3 consigli al giorno, che mentre provi l'app può starti stretto. Se ti
sta stretto, alza AI_CAP_PER_DAY (per esempio a 50) invece di abbassare il
peso: il tetto deve continuare a dire la verità sulla spesa.

────────────────────────────────────────────────────────────
Vincoli: nessun cambiamento visibile nell'interfaccia. Il consiglio deve
rispondere esattamente come adesso, con la stessa qualità e lo stesso formato.
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff, e
dimmi quanto stimi di aver tagliato e su cosa basi la stima.
```

---

# C2 — Sapere invece di dedurre

```
Contesto: la tabella usage conta le operazioni e i token, ma non registra QUALE
operazione. Per capire quanto costa un consiglio si è dovuto dedurlo dai totali
di una giornata. Prima di fare il cambio grosso (C3) voglio poterlo misurare.

Matteo autorizza la modifica di lib/ai.ts e una SQL nuova.

REGOLA IMPORTANTE SUL RISCHIO: non toccare la tabella usage, la funzione
usage_add, né la logica del tetto in spendAi. Quella catena funziona, protegge
dai costi, e ha già un ripiego pensato per quando il contatore non è leggibile.
Non ci mettiamo le mani per una funzione di contabilità.

1) SQL in un blocco pulito (la eseguo io su Supabase): una tabella NUOVA,
   public.usage_log, in sola aggiunta:
     id, user_id (uuid), ts (timestamptz default now()), operazione (text),
     origine (text), token_in (integer), token_out (integer),
     modello (text null)
   RLS attiva. Ci scrive solo il server con la service-role, come già fa usage.
   Nessun contenuto: solo il nome dell'operazione e i numeri. Niente titoli,
   niente query dell'utente — è contabilità, non un registro di cosa fa la gente.
   Un indice su (user_id, ts).

2) lib/ai.ts:
   - spendAi resta identica nel comportamento; in più scrive una riga in
     usage_log con l'operazione.
   - claudeFetch accetta un parametro opzionale con l'operazione in corso e il
     modello, e scrive i token in usage_log. Se non gliela passi, scrive
     "sconosciuta" — non deve mai rompersi per un parametro mancante.
   - Come registra() oggi: se la scrittura fallisce si stampa nei log e si
     tira dritto. Contare non deve mai fermare l'app.

3) Passa l'operazione da lib/films.ts (le due fasi), e dagli altri punti di
   chiamata se è banale farlo. Dove non lo è, lascia stare: meglio metà dato
   subito che tutto fra due settimane.

4) app/numeri/page.tsx: aggiungi una tabellina "ultimi 7 giorni per operazione"
   — operazione, quante volte, token in, token out, costo stimato in dollari.
   I prezzi per milione di token mettili in una costante sola in cima al file,
   con un commento che dice che vanno controllati sul listino di Anthropic e la
   data in cui li hai scritti. Un prezzo scritto a mano che invecchia in
   silenzio è esattamente quello che la bussola vieta: qui è accettabile solo
   perché è una pagina interna che vedi solo tu, e solo se la data c'è.

Vincoli: /numeri resta 404 per chiunque non sia Matteo, com'è adesso.
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.
```

---

# C3 — Smettere di pagare per una cosa che TMDB fa gratis

```
Contesto e obiettivo. Oggi il "✨ Consiglio" usa la ricerca web per scoprire su
quale piattaforma si vede un titolo in Italia. Due problemi:

1. COSTO: i risultati di ricerca rientrano come token in ingresso, ed è lì che
   va il grosso dei ~75.000 token per consiglio.
2. CORRETTEZZA: è la stessa app che, in due punti diversi, dà due risposte
   diverse. Il consiglio dice "su Netflix" perché l'ha letto in un articolo;
   "Dove vederlo", due tocchi più in là, chiede a TMDB e può dire un'altra cosa.

TMDB ha /discover/movie e /discover/tv, che filtrano per genere, anno, voto,
durata E piattaforma italiana. Gratis, strutturato, aggiornato, e già la fonte
di "Dove vederlo". Il lavoro di Claude smette di essere "cerca" e diventa
"capisci cosa vuole" e "scegli e spiega" — che è quello che sa fare meglio.

Non è un risparmio che peggiora la funzione: la migliora. E la risposta passa
da decine di secondi a pochi.

Matteo autorizza la modifica di lib/tmdb.ts, lib/films.ts e app/api/watch/.
Richiede P1 già fatto (tmdb_id in tabella).

────────────────────────────────────────────────────────────
1) lib/tmdb.ts — due funzioni nuove
────────────────────────────────────────────────────────────
a) providerIdsIT(): la mappa nome → id delle piattaforme italiane, letta da
   /watch/providers/movie?watch_region=IT e /watch/providers/tv, in cache 30
   giorni. NON scrivere gli id a mano: cambiano e non te ne accorgi.

b) discoverTitles(f): chiama /discover/movie e/o /discover/tv con
   watch_region=IT e i filtri che ricevi:
     tipo: "film" | "serie" | "entrambi"
     generi: string[]      → convertiti in id riusando la mappa GENRE_IT che
                             c'è già, letta al contrario
     annoDa, annoA
     durataMax
     votoMin, votiMin      (vote_average.gte, vote_count.gte — senza il secondo
                            peschi film con tre voti e media 9)
     piattaforme: string[] → with_watch_providers +
                             with_watch_monetization_types=flatrate
     ordine                 (default popularity.desc)
   Restituisce al massimo 30 candidati: tmdbId, tmdbType, titolo, anno, generi,
   voto, durata, locandina. Cache 1 giorno.

────────────────────────────────────────────────────────────
2) lib/films.ts — suggestWatch in due passi, senza ricerca web
────────────────────────────────────────────────────────────
PASSO A — capire la richiesta. Una chiamata a Claude PICCOLA, senza strumenti,
max_tokens basso. Riceve la frase dell'utente e restituisce solo il JSON dei
filtri di discoverTitles, più eventuali "titoli di riferimento" se l'utente ne
ha nominati ("stile Quo Vado"). Poche centinaia di token.

PASSO B — trovare i candidati, gratis:
  - discoverTitles con quei filtri
  - se ci sono titoli di riferimento, aggiungi anche le raccomandazioni TMDB di
    quei titoli (similarTitles esiste già; usa la variante per tmdbId di P1)
  - togli i doppioni e quello che l'utente ha già in lista
  - tieni i primi ~30

PASSO C — scegliere e spiegare. Seconda chiamata a Claude, sempre senza
strumenti, con i 30 candidati in righe compatte (una riga per titolo, non il
JSON intero). Restituisce le solite 3-4 proposte nel FORMATO ATTUALE di
FilmPick, senza cambiare una virgola: title, kind, platform, info, link.
Il campo "platform" adesso non lo inventa più il modello: glielo passi tu, preso
da TMDB. Ribadiscilo nel prompt: la piattaforma NON si sceglie, si copia da
quella indicata nel candidato.

Il caso "titolo secco" ("aggiungi Breaking Bad") non passa da tutto questo giro:
è una search TMDB e basta, zero chiamate a Claude. Riconoscilo nel passo A e
esci subito. Oggi anche questo costa 25 centesimi, e non dovrebbe costare niente.

────────────────────────────────────────────────────────────
3) Le conseguenze, da fare nello stesso giro
────────────────────────────────────────────────────────────
- La FASE 2 (deepenFilmCatalog) si può spegnere del tutto: esisteva per
  costruire una cache di titoli con le piattaforme, e adesso quella cache è
  TMDB, gratis e sempre fresca. Smetti di chiamarla dalla route. NON cancellare
  la funzione e non toccare la tabella catalog: si dismettono dopo, quando è
  chiaro che non serve più niente (come stiamo facendo con search_log).
- Il peso torna giù: in lib/ai.ts, consiglio da 10 a 2, e aggiorna il commento
  spiegando perché è cambiato.
- app/api/watch/suggest/route.ts: maxDuration da 120 si può abbassare molto.
  Dimmi tu a quanto, in base a quanto ci mette davvero.
- RIPIEGO: se TMDB_API_KEY manca o discover non torna niente, ricadi sul giro
  vecchio con la ricerca web invece di restituire una lista vuota. Tieni il
  codice vecchio raggiungibile, non cancellarlo.

- ⚠️ TOGLI LA CACHE DEI PROMPT DALLE CHIAMATE NUOVE. In C1 abbiamo attivato il
  prompt caching dentro callClaude, e lì guadagna perché la ricerca web fa più
  giri: scrivi la cache una volta e la rileggi al secondo e terzo giro. Le due
  chiamate di C3 (passo A e passo C) sono a giro UNICO: non c'è nessun secondo
  giro che rilegga. E scrivere in cache costa il 25% IN PIÙ dell'input normale.
  Quindi lasciare cache_control lì dentro non fa risparmiare: fa spendere un
  quarto in più per niente. Le chiamate a giro unico vanno senza cache.
  Se il ripiego con la ricerca web resta raggiungibile, quello la cache la
  tiene: è il percorso a più giri.

────────────────────────────────────────────────────────────
Come verifico che non sia peggiorato
────────────────────────────────────────────────────────────
Prima di dire che hai finito, prova queste cinque richieste e mostrami cosa
esce, in tabella, insieme ai token consumati che ora leggi da usage_log:
  1. "commedia italiana stile Quo Vado"
  2. "una serie crime corta, massimo 3 stagioni"
  3. "aggiungi Breaking Bad"            (deve costare zero chiamate a Claude)
  4. "qualcosa di leggero per stasera, ho un'ora"
  5. "un documentario sulla montagna"
Per ognuna: le proposte hanno senso? la piattaforma è quella vera? quanti token?
Se una delle cinque è peggio di prima, dimmelo invece di nasconderlo nel diff.

npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.
```

---

## Dove dovresti arrivare

| | Token per consiglio | Costo | Attesa |
|---|---|---|---|
| Oggi | ~75.000 | ~25 cent | decine di secondi |
| Dopo C1 | ~20.000 | ~6 cent | uguale |
| Dopo C3 | ~4.000 | ~2 cent | pochi secondi |
| Titolo secco, dopo C3 | 0 | 0 | immediato |

L'ultima riga è quella che mi piace di più: **oggi paghi 25 centesimi anche solo
per scrivere «aggiungi Breaking Bad»**, che è una cosa che TMDB fa da sola,
gratis, in mezzo secondo.

---

## Addendum del 5 agosto, dopo C1

C1 è andato: da ~34 a ~9,5 centesimi, il 72%. La cache si accende davvero
(giro 2: 33.503 token riletti a un decimo, 24 a prezzo pieno). Tre cose emerse
dalla verifica, da infilare dove tocca.

**Da aggiungere a C2, mentre è ancora aperto (due righe in tutto):**

```
Aggiungi due campi a ogni riga di usage_log:
- ricerche_web: il valore di usage.server_tool_use.web_search_requests della
  risposta di Claude, quando c'è. Oggi il costo delle ricerche web lo stimiamo
  dal max_uses; siccome si fatturano a parte, va misurato e non dedotto.
- Dai alla fase 2 (deepenFilmCatalog) un nome suo nella mappa PESI:
  catalogo: 1. Stesso peso di "cattura", nome diverso. Serve perché C2 esiste
  per separare le operazioni, e con lo stesso nome la fase 2 finisce mescolata
  agli screenshot e i numeri non dicono più niente.
```

**Da ricordare per C3:** vedi il punto sulla cache dei prompt qui sopra —
sulle chiamate a giro unico va tolta, altrimenti costa il 25% in più.

**Due cose verificate e chiuse:**

- `films_catalog` è una tabella **condivisa** fra gli utenti (policy
  `keiko_shared_all` in `multiutente_rls.sql`, con un commento che spiega
  perché). Quindi il salto della fase 2 continuerà a valere anche quando
  entreranno gli amici: trovano il catalogo già pieno e non ripagano il giro
  caro. Buona notizia, ma è anche un motivo in più per fare C3: oggi la
  richiesta di una persona riempie un catalogo che vedono tutti.
- Le righe di `usage` delle prove **restano**. Sono soldi spesi davvero e stanno
  sull'utente finto: non toccano il tetto di nessuno e toglierle farebbe mentire
  il contatore.

## Una cosa da mettere a verbale

Quando C3 è dentro, il «✨ Consiglio» e la ricerca sugli abbonamenti (P3 dell'altro
documento) diventano **la stessa macchina** con due porte: entrambe partono dai
filtri, entrambe chiedono a TMDB, entrambe sanno cosa hai già incluso negli
abbonamenti che paghi. La differenza resta solo che il consiglio ci mette sopra
una frase di Claude. Vale la pena, a quel punto, tenerli in un file solo.
