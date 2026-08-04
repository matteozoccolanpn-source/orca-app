# Keiko — Blocco zoom/rotazione + rifacimento «Guarda»

> Scritto il 4 agosto 2026. Contiene la diagnosi e **cinque prompt pronti** da
> incollare in Claude Code, in ordine. Non darli tutti insieme: uno per volta,
> build verde, si guarda, si passa al successivo.

---

## Parte 1 — Perché «si sminchia»

Ho guardato `app/layout.tsx`, `app/globals.css`, `app/manifest.ts` e
`app/guarda/GuardaView.tsx`. Le cause sono tre, e sono tutte vere insieme.

**1. Non esiste nessun viewport dichiarato.** In `app/layout.tsx` non c'è
`export const viewport`. Next mette il suo default (`width=device-width,
initial-scale=1`) e finisce lì: nessun limite allo zoom.

**2. Gli input sono sotto i 16px.** In Guarda il campo di ricerca è a 14px e la
nota nella scheda pure. Sotto i 16px **iOS ingrandisce la pagina da solo** appena
tocchi il campo, e quando esci non torna come prima. Questa è la causa più
frequente del problema, e non si risolve con il viewport: si risolve alzando il
font.

**3. Nessun `touch-action`.** Il doppio tap ingrandisce ovunque.

Poi c'è un effetto collaterale utile da sistemare nello stesso giro: il layout usa
`env(safe-area-inset-top)` in mezza app, ma senza `viewport-fit=cover` quel valore
vale **zero**. Insieme a `black-translucent` nello status bar, vuol dire che
dall'icona l'header ti finisce sotto l'orologio. Si aggiusta nella stessa riga.

### Sulla rotazione, la verità

- **Android**: `orientation: "portrait"` nel manifesto funziona. Chiuso.
- **iPhone**: iOS **non** legge `orientation` dal manifesto, e
  `screen.orientation.lock()` su Safari non esiste. Non c'è modo di impedire la
  rotazione da web.

L'unica via onesta su iPhone è accorgersi di essere in orizzontale e coprire lo
schermo con «gira il telefono». Non è elegante, ma è meglio di un layout sfondato,
e le app serie fatte in web fanno esattamente questo. Se un giorno vuoi il blocco
vero, serve il wrapper nativo — è la stessa condizione dell'idea 15 e della 236.

---

## Parte 2 — Guarda: cosa non regge il confronto

Dodici cose, in ordine di quanto si vedono.

**I gesti sono al contrario.**

1. **Il tap sulla locandina segna «visto».** In Letterboxd, TV Time, Trakt e
   JustWatch il tap apre la scheda. Qui basta un tocco storto mentre scorri e ti
   sei segnato un film che non hai visto. È l'azione più difficile da annullare
   (il voto e la data di visione se ne vanno) messa sul gesto più facile da
   sbagliare.
2. **I bersagli sono da 22px.** La ✕, la ⓘ. Il minimo che Apple indica è 44.
   Metà. Il «primo tap ingoiato» che hai già in lista fix nasce anche da qui.
3. **La ✕ elimina, e sta a 6px dal bordo della locandina.** Il pollice ci finisce
   sopra scorrendo.

**La pagina si ripete.**

4. **Lo stesso titolo compare due o tre volte scorrendo**: una in «Da vedere», una
   in «Visti di recente», una nella sua categoria di genere. Con trenta titoli
   scorri novanta locandine. A chi guarda l'app per la prima volta sembra un bug.
5. **«Visti di recente» mostra tutti i visti**, per sempre, senza limite.
6. **Le categorie sono liste verticali intere.** I top player usano caroselli
   orizzontali con «vedi tutti», proprio per non allungare la pagina.

**Manca il mestiere.**

7. **Nessun filtro**: né film/serie, né piattaforma, né durata. È l'idea 64, e
   oggi non c'è niente.
8. **La ricerca cerca solo dentro la tua lista.**
9. **Per aggiungere scrivi il titolo a mano** e TMDB tira a indovinare. Se sbagli
   una lettera entra un titolo sbagliato, con la locandina sbagliata.
10. **Il toast dice «Visto ✓ Com'era?» ma non si può rispondere.** Il voto a orche
    è sepolto in fondo alla scheda. La domanda c'è, la risposta no.
11. **Nessuna schermata vuota e nessuno scheletro sulla griglia.** Va contro
    l'idea 114 che hai già scelto.
12. **Niente tira-per-aggiornare** (idea 113).

### E poi c'è la cosa sotto il cofano

`app/guarda/page.tsx` fa **due ricerche TMDB per ogni titolo a ogni apertura**
(`posterFor` + `primaryGenre`). Con quaranta titoli sono ottanta chiamate. La
cache di Next le tiene sette giorni, ma la prima apertura dopo la scadenza si
sente tutta.

Peggio: **ogni funzione in `lib/tmdb.ts` cerca per stringa di testo**. «Dove
vederlo», «la scheda» e «i simili» rifanno la stessa ricerca, in modo
indipendente, e possono pescare **tre titoli diversi**. Se hai un film con un
titolo ambiguo, la trama è di uno e le piattaforme di un altro.

La causa è una sola: **in tabella non c'è `tmdb_id`.** Si risolve una volta e
tutto il resto diventa più semplice, più veloce e più corretto. È anche il
presupposto obbligato per gli episodi delle serie.

---

## Parte 3 — La tua idea: la vista unica su tutti gli abbonamenti

Questa è la cosa giusta, e vale più di tutto il resto di questa pagina.

Netflix ti cerca dentro Netflix. Prime dentro Prime. Chi ha quattro abbonamenti
apre quattro app per scoprire dove sta una cosa, e a volte paga un noleggio per un
film che aveva già incluso altrove.

**Keiko cerca una volta e risponde una volta.** Non «ecco i risultati», ma:

> **Dune — Parte due** (2024)
> ✅ **Ce l'hai su Now** · noleggio da 3,99 altrove

E i titoli che puoi già vedere con quello che paghi **vanno per primi**. È il
filtro della convergenza applicato bene: da sola questa cosa vale meno (la fa
JustWatch), ma dentro Keiko diventa «ho un buco stasera, cosa posso vedere subito
senza pagare niente in più» — e quello nessuno te lo dice.

Serve un pezzo che oggi non c'è: **quali abbonamenti hai**. Va nel profilo, una
lista di spunte con le piattaforme italiane. Due minuti a impostarlo, e poi
funziona per sempre.

---

## Parte 4 — I cinque prompt, in ordine

| | Prompt | Cosa fa | Rischio |
|---|---|---|---|
| 1 | **P0** | Zoom e rotazione | basso |
| 2 | **P1** | `tmdb_id` in tabella — le fondamenta | medio (SQL) |
| 3 | **P2** | Rifacimento della pagina Guarda | medio |
| 4 | **P3** | Ricerca su tutti gli abbonamenti | medio |
| 5 | **P4** | Serie: stagione ed episodio | alto (SQL + TMDB) |

**Oggi fai P0 e P1.** P0 si vede subito e ti toglie il fastidio. P1 non si vede,
ma senza non ha senso partire con gli altri tre.

---

# P0 — Zoom e rotazione

```
Compito: impedire lo zoom e gestire la rotazione. Modifica piccola e mirata,
niente refactor. Non toccare lib/ né app/api/.

1) app/layout.tsx — aggiungi l'export del viewport che oggi manca:

   import type { Viewport } from "next";

   export const viewport: Viewport = {
     width: "device-width",
     initialScale: 1,
     maximumScale: 1,
     userScalable: false,
     viewportFit: "cover",
   };

   Nota: viewportFit "cover" è quello che fa funzionare gli
   env(safe-area-inset-*) già usati in mezza app (oggi valgono zero). Con lo
   status bar "black-translucent" questo sistema anche l'header che finiva sotto
   l'orologio. Verifica che non introduca sovrapposizioni.

2) app/layout.tsx — nel <head>, accanto agli script già presenti, aggiungi uno
   script che blocca i gesti di pinch di WebKit. Serve perché in Safari come
   sito (non dall'icona) iOS ignora user-scalable:

   (function(){
     try{
       ['gesturestart','gesturechange','gestureend'].forEach(function(t){
         document.addEventListener(t,function(e){e.preventDefault()},{passive:false})
       })
     }catch(e){}
   })()

3) app/globals.css — dentro @layer base:
   - su html: -webkit-text-size-adjust: 100%; text-size-adjust: 100%;
     (impedisce a iOS di gonfiare il testo da solo quando ruoti)
   - su body: touch-action: pan-x pan-y;
     (toglie il doppio-tap-per-ingrandire lasciando lo scorrimento normale)

4) IL PUNTO PIÙ IMPORTANTE — il font degli input.
   Sotto i 16px iOS ingrandisce la pagina da solo appena tocchi un campo, e non
   torna indietro. Cerca in tutto app/ e components/ ogni <input>, <textarea> e
   <select> e assicurati che la dimensione del carattere sia ALMENO 16px.
   Attenzione: molti hanno lo stile in linea (per esempio fontSize: 14 in
   app/guarda/GuardaView.tsx, sia nel campo di ricerca sia nella nota della
   scheda). Lo stile in linea vince sul CSS, quindi vanno cambiati lì.
   Aggiungi anche una rete di sicurezza in globals.css:
   input, textarea, select { font-size: 16px; }

5) Rotazione.
   - app/manifest.ts: aggiungi orientation: "portrait". Vale su Android.
   - Su iPhone il manifesto NON viene letto e screen.orientation.lock() non
     esiste: la rotazione da web non si blocca. Quindi fai una scialuppa:
     un componente client piccolo (components/RuotaIlTelefono.tsx) montato in
     components/GlobalChrome.tsx, che disegna un pannello a schermo pieno,
     visibile SOLO con questa regola CSS in globals.css:

     @media (orientation: landscape) and (max-height: 520px) { ... visibile ... }

     Così si accende sui telefoni girati e resta spento su iPad e desktop.
     Dentro: l'icona di Keiko e la frase «Keiko si usa in verticale».
     Testo esatto da concordare con docs/UI-VOICE.md se c'è già qualcosa di
     simile; se non c'è, usa quella frase.

Vincoli: niente colori nuovi, accento = la variabile già in uso.
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.

Verifica che devo poter fare io sull'iPhone:
- pinch sulla home: non ingrandisce
- doppio tap su una card: non ingrandisce
- tocco il campo ricerca in Guarda: la pagina NON salta in avanti
- giro il telefono: compare «Keiko si usa in verticale»
- dall'icona: l'header non è sotto l'orologio
```

---

# P1 — Le fondamenta: `tmdb_id` in tabella

```
Contesto: oggi ogni funzione di lib/tmdb.ts (posterFor, tmdbKind, primaryGenre,
titleDetails, watchProvidersIT, similarTitles) fa una search/multi per STRINGA
di testo, ogni volta. Conseguenze: app/guarda/page.tsx fa 2 chiamate TMDB per
ogni titolo a ogni apertura, e funzioni diverse possono risolvere lo stesso
titolo su film diversi (trama di uno, piattaforme di un altro).

Obiettivo: risolvere il titolo UNA volta, quando lo aggiungi, e salvare l'id.

Matteo autorizza esplicitamente la modifica di lib/tmdb.ts, lib/supabase.ts e
app/api/watch/. Fuori da questi file non toccare niente.

1) SQL — dammela in un blocco pulito, la eseguo io su Supabase. Colonne nuove su
   public.watchlist: tmdb_id (integer), tmdb_type (text: 'movie'|'tv'),
   poster (text), genre (text), year (text). Tutte nullable, tutte
   "add column if not exists". Non toccare le policy RLS esistenti.

2) lib/tmdb.ts — una funzione sola nuova:
   resolveTitle(title, kind?) → { tmdbId, tmdbType, title, poster, genre, year } | null
   Fa UNA search/multi, sceglie il risultato con locandina preferendo il tipo
   richiesto, e restituisce tutto insieme. Riusa GENRE_IT che c'è già.
   Le funzioni esistenti restano, ma aggiungi a ognuna una variante che accetta
   direttamente tmdbId+tmdbType e salta la ricerca. Le vecchie firme non si
   rompono (le usano altre pagine).

3) app/api/watch/route.ts — nella POST, al posto di tmdbKind(title) chiama
   resolveTitle e salva anche tmdb_id, tmdb_type, poster, genre, year.

4) lib/supabase.ts — WatchItem guadagna tmdbId, tmdbType, year. getWatchlist
   legge le colonne nuove. Mantieni il ripiego già presente: se le colonne non
   ci sono ancora (deploy prima della SQL), la query deve cadere sulla versione
   corta e NON rompere la pagina. È già il pattern usato per rating/note.

5) app/guarda/page.tsx — usa poster e genre dalla tabella. Chiama TMDB SOLO per
   le righe che non li hanno ancora (i titoli vecchi), e quando li ottieni
   scrivili in tabella così la volta dopo non serve. Niente più 2N chiamate.

6) Le altre route di /api/watch (details, providers, similar) accettano
   opzionalmente tmdbId e tmdbType e, se ci sono, saltano la ricerca.

Vincoli: nessun cambiamento visivo in questo prompt. La pagina deve essere
identica a prima, solo più veloce e coerente.
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.
```

---

# P2 — Rifacimento della pagina Guarda

```
Compito: rifare app/guarda/GuardaView.tsx. Solo presentazione: la logica
esistente (PATCH visto, DELETE con annulla, POST aggiunta, consiglio AI, fogli
scheda e "dove vederlo") si conserva tutta. Non toccare lib/ né app/api/.

I GESTI — questa è la parte che conta di più.
- Tap sulla locandina → APRE LA SCHEDA. Oggi segna "visto": è il difetto più
  grave della sezione, perché mette l'azione più difficile da annullare sul
  gesto più facile da sbagliare.
- Tocco lungo sulla locandina (circa 450ms, con una vibrazione breve) → menu
  azioni: "✓ Visto" / "▶ Dove vederlo" / "🗑 Elimina". È l'idea 231, già scelta.
- Togli dalla locandina i due bottoncini ✕ e ⓘ: sono da 22px, metà del minimo
  che serve, e la ✕ elimina a 6px dal bordo. Le loro azioni vivono nel menu del
  tocco lungo e dentro la scheda.
- Ogni bersaglio toccabile: minimo 44x44.

LA STRUTTURA — dall'alto:
1. Header sticky compatto: ‹ indietro, "Da guardare", conteggio. Come ora.
2. Barra di ricerca (font 16px) + bottone "✨ Consiglio". Come ora.
3. Un segmented control a tre voci: "Da vedere" · "Visti" · "Tutti".
   Parte su "Da vedere". A destra un'icona filtro (44x44) che apre un foglietto
   con: tipo (film/serie/tutti), genere, ordinamento (aggiunti di recente /
   alfabetico / voto). È l'idea 64.
4. Hero "Stasera per te" — resta com'è, ma solo su "Da vedere".
5. UNA griglia sola a 3 colonne, che mostra il risultato dei filtri.

   Questo elimina il problema peggiore della pagina di adesso: oggi lo stesso
   titolo compare due o tre volte scorrendo (in "Da vedere", in "Visti di
   recente", e di nuovo nella sua categoria di genere). Il genere diventa un
   filtro, non una sezione che ripete le stesse locandine.

LA CARD della griglia:
- locandina 2:3, angoli 12
- se visto: velo scuro sopra + un ✓ grande al centro (come TV Time), non
  l'emoji piccola in un angolo
- badge del voto in basso a destra se c'è (🐋 4) — resta come ora
- una pastiglia piccola "Serie" in alto a sinistra solo per le serie, così si
  distinguono a colpo d'occhio
- titolo sotto, una riga

QUELLO CHE MANCA E VA AGGIUNTO:
- Schermata vuota vera (idea 114): l'orca, "Qui finiscono i film e le serie che
  vuoi vedere", e un bottone che apre la ricerca. Serve anche la versione
  "nessun risultato" quando i filtri non pescano niente.
- Scheletri di caricamento sulla griglia, non solo dietro l'immagine.
- Tira-per-aggiornare (idea 113).
- Il toast "Visto ✓ Com'era?" oggi fa una domanda a cui non si può rispondere.
  Aggiungi l'azione "Vota" nel toast, che apre direttamente il voto a orche.
  Questo è il gancio che fa esistere l'idea 184 nella vita vera.
- Nella scheda, sposta "Il tuo voto" PRIMA della trama quando il titolo è già
  segnato visto: se l'hai visto la trama non ti serve, il voto sì.

Vincoli: nessun colore nuovo, si usano le variabili --k-* già in uso. I testi
visibili si prendono da docs/UI-VOICE.md; se una frase non c'è, chiedimela
invece di inventarla. Un file solo: app/guarda/GuardaView.tsx.
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.
```

---

# P3 — La ricerca su tutti gli abbonamenti

```
Contesto e obiettivo (leggilo, perché è la ragione d'essere di questo prompt):
Netflix cerca dentro Netflix, Prime dentro Prime. Chi ha quattro abbonamenti
apre quattro app per capire dove sta un titolo, e ogni tanto noleggia qualcosa
che aveva già incluso altrove. Keiko deve cercare UNA volta e rispondere con
"ce l'hai già su X", mettendo per primi i titoli che l'utente può vedere subito
senza pagare niente in più.

Matteo autorizza la modifica di lib/tmdb.ts, lib/supabase.ts e app/api/.

1) SQL in un blocco pulito: una colonna platforms (text[]) su public.profile
   (o la tabella profilo che esiste già — guardala prima, non inventarla).
   Sono le piattaforme a cui l'utente è abbonato.

2) Profilo — in app/components/keiko/ProfileSheet.tsx aggiungi una sezione
   "I tuoi abbonamenti": lista di spunte con le piattaforme italiane
   (Netflix, Prime Video, Disney+, Now, Apple TV+, RaiPlay, Mediaset Infinity,
   Paramount+, TIMVision, Crunchyroll). Salva sul profilo.

3) Nuova route GET app/api/watch/search?q=...
   - una search/multi TMDB, prendi i primi 8 risultati con locandina
   - per ognuno, in parallelo, le piattaforme italiane (riusa watchProvidersIT
     nella variante per tmdbId introdotta in P1 — NON per stringa)
   - risposta per ogni risultato: tmdbId, tmdbType, titolo, anno, locandina,
     flatrate[], rent[], buy[]
   - cache 7 giorni come le altre chiamate TMDB
   - auth-guarded come le altre /api/watch
   - conta la chiamata sul tetto costi già esistente se il tetto copre TMDB;
     se copre solo l'AI, lascia stare e dimmelo.

4) In Guarda, la barra di ricerca diventa vera: mentre scrivi (con un ritardo
   di ~350ms) mostra i risultati sotto, come lista con locandina piccola. Ogni
   riga:
   - titolo, anno, "Film"/"Serie"
   - la riga della disponibilità, calcolata sugli abbonamenti dell'utente:
       ✅ "Ce l'hai su Now"           (è in flatrate su una che hai)
       🟡 "C'è su Netflix"            (in abbonamento, ma non ce l'hai)
       💶 "Solo a noleggio"           (solo rent/buy)
       ✗  "Non in streaming in Italia"
   - un "+" a destra che lo aggiunge alla lista (riusa la POST esistente,
     passando tmdbId e tmdbType così non ricerca di nuovo)
   ORDINE: prima i titoli con ✅, poi 🟡, poi il resto.

5) Se l'utente non ha ancora scelto gli abbonamenti, la riga diventa
   "C'è su Netflix, Now" e sotto, una volta sola, un invito discreto a dire
   quali abbonamenti ha.

Vincoli: nessun prezzo scritto a mano da nessuna parte — è la regola 2 della
bussola. "da 3,99" si può scrivere SOLO se arriva da TMDB in quel momento;
altrimenti si scrive "a noleggio" e basta, senza numero.
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.
```

---

# P4 — Serie: stagione ed episodio

```
Contesto: oggi una serie è trattata come un film — un titolo, spuntato o no.
Chi guarda serie usa TV Time o Trakt proprio per il conto degli episodi.
Richiede P1 fatto (serve tmdb_id).

Matteo autorizza la modifica di lib/, app/api/ e della tabella watchlist.

1) SQL in un blocco pulito, su public.watchlist:
   season (integer), episode (integer), total_seasons (integer),
   total_episodes (integer), next_air_date (date). Tutte nullable,
   "add column if not exists", nessuna modifica alle policy RLS.

2) lib/tmdb.ts — seriesProgressInfo(tmdbId) che legge da TMDB:
   numero di stagioni, episodi per stagione, e next_episode_to_air.
   Cache: 1 giorno (non 7 — gli episodi escono).

3) app/api/watch/ — una route per avanzare: "ho visto un episodio".
   Regola: episodio+1; se supera gli episodi della stagione, stagione+1 ed
   episodio 1; se supera l'ultima stagione, la serie va in "visto".

4) In Guarda, in cima alla griglia quando ci sono serie iniziate:
   una fascia "Continua a guardare", carosello orizzontale, ogni card con
   locandina, "S2 E4" e un bottone "+1" da 44px che avanza di un episodio.
   Il bottone deve essere ottimista (avanza subito, poi salva) come già fa
   toggleSeen.

5) Nella scheda della serie: "Sei a S2E4 di 3 stagioni" e, se TMDB lo sa,
   "Prossimo episodio: giovedì". Selettore per correggere stagione ed episodio
   a mano, perché la gente salta e recupera.

Vincoli: sui film non cambia niente. Se TMDB non risponde, la serie continua a
funzionare come oggi (titolo unico, visto/non visto): niente schermate rotte.
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.
```

---

## Da decidere insieme, quando arrivi lì

- **La ricerca su TMDB costa chiamate.** Otto risultati × una chiamata
  piattaforme = nove chiamate per ricerca. TMDB regge senza problemi, ma se un
  giorno vuoi stringere: piattaforme solo per i primi tre risultati, gli altri a
  richiesta.
- **Il «Consiglio ✨» e la ricerca nuova si sovrappongono.** Oggi sono due porte
  diverse per la stessa cosa. Quando P3 è in piedi, il consiglio AI dovrebbe
  restituire i suoi titoli **dentro le stesse card** della ricerca — così vedi
  subito se quello che ti consiglia ce l'hai già incluso. Vale un giro a parte.
- **Gli episodi e gli amici.** Quando ci saranno gli amici, «S2E4» diventa il
  materiale dell'idea 195 («un amico ha finito una serie che hai in lista») e
  della 196 (gruppo di visione). Il lavoro di P4 non muore lì.
