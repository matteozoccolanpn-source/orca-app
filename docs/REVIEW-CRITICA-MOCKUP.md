# Keiko — Review critica del mockup (keiko-final.html rev.6.2)
> Panel simulato: Principal PM (Series A/B) · Senior UX Reviewer · Software Architect · CTO.
> Mandato: trovare problemi, non confermare idee. Basata su mockup, BUSSOLA-E-ROADMAP,
> AI-GAP-ANALYSIS, codebase reale e screenshot dell'implementazione in corso. 2026-07-04.

---

## 1 · PRODUCT

**Cosa funziona davvero** (detto una volta sola, poi solo problemi): il concetto "input
qualsiasi → evento curato" è forte e raro; il biglietto-di-carta come oggetto è un'identità
visiva vera; la pipeline screenshot→evento è il moat potenziale.

**Problemi:**

1. **La home risponde 4 volte alla stessa domanda.** "Cosa mi aspetta?" ha 4 risposte
   simultanee: week strip, bottone "Esci alle", hero, ctxbar (+ peek, + agenda). Sono 4
   pattern di navigazione per lo stesso dato. Un utente nuovo non sa quale sia "quello vero".
   → Consolidare: il bottone .now e la ctxbar si sovrappongono; la week strip e l'agenda pure.
2. **Sette sezioni impilate in una schermata.** Apple Music ne mostra 3 per volta e cura
   l'ordine editorialmente. Noi impiliamo tutto sempre: hero, in arrivo, oggi per te, da
   guardare, viaggi. Con dati veri e giornate piene la home diventa un feed da 6 schermate.
   → Sezioni condizionali: "Da guardare" appare solo la sera; "Viaggi" solo se c'è un viaggio
   entro N giorni. La home deve respirare col contesto, non elencare l'inventario.
3. **La barra "Chiedi a Keiko" promette ciò che non esiste.** È l'elemento più prominente
   della UI e oggi dietro non c'è nulla (il vero /api/ask è post-MVP). Prima regola dei
   prodotti AI: mai far toccare una promessa vuota — brucia fiducia al primo tap.
   → MVP: la barra fa SOLO ricerca locale (già simulata, onesta e utile). La chat arriva
   quando c'è. Cambiare placeholder di conseguenza ("Cerca o chiedi" → solo "Cerca").
4. **Aggiunta a 2 tap dove basterebbe 1.** Il ＋ apre un foglio con 3 scelte. L'azione core
   del prodotto (aggiungere) ha friction inutile. → Il ＋ apre direttamente il campo testo
   con tastiera attiva; foto e voce sono due icone dentro quel campo. Un tap risparmiato
   sull'azione più frequente vale più di qualsiasi animazione.
5. **Gesti non scopribili come unico accesso a funzioni chiave.** Long-press (sposta/
   condividi/elimina) e swipe sui to-do non hanno alcun indizio visivo. Su mobile web il
   long-press combatte col sistema (selezione testo, context menu iOS) e lo swipe orizzontale
   combatte con lo scroll e col back-gesture. → Ogni azione da gesto DEVE avere un
   equivalente visibile (un "⋯" sulla card). Gesti = scorciatoia, mai unica via.
6. **Personalità colore casuale a ogni apertura = brand che non si fissa.** Delizioso in
   demo, disorientante nell'uso ("perché oggi è arancione?"). E il brief chiedeva un "colore
   firma": oggi Keiko ne ha 3+2 e quindi nessuno. → Una firma di default; la personalità
   diventa una SCELTA in profilo (v1.1), non una lotteria. La rotazione random si elimina.
7. **Mancanze totali** (non c'è nulla nel mockup): onboarding primo utilizzo (lo splash non
   lo è); stati vuoti di TUTTE le sezioni per un utente nuovo (home deserta = prima
   impressione mortale, decisiva anche per il test con la fidanzata); modifica evento
   (esiste solo sposta/elimina, senza UI per data/ora); undo dopo eliminazione via swipe
   (distruttivo senza rimedio); eventi multi-giorno e ricorrenti; fusi orari (volo per
   Londra = primo caso reale che rompe); **import calendario esistente** (Google/Apple):
   per chiunque abbia già una vita digitale è LA barriera d'adozione — nessuno ritrascrive
   la propria vita a mano; gestione notifiche (la campanella fa un toast).
8. **Nice-to-have travestiti da core:** bloom che cambia con l'ora (nessuno lo noterà),
   rotazione palette col pull-to-refresh (gimmick nascosto), parallax, ctxbar allo scroll.
   Nessuno di questi sposta retention; tutti costano manutenzione e QA.

## 2 · UX/UI (per schermata)

**Trasversale — il problema più serio: tipografia inaccessibile.**
Etichette a 9–10px in maiuscolo con letterspacing, testi terziari 11px con contrasto
~4:1 su fondo scuro: sotto WCAG AA (serve 4.5:1) e ostile agli over-40 — in rotta di
collisione frontale col target dichiarato "famiglie, range largo di età". La scala 11-24
è elegante ma il fondo scala (9-11px) è troppo usato. → Alzare i minimi: nulla sotto 11px,
terziari a contrasto 4.5:1 (#93A5C2 invece di #8496B3 sul navy). Non negoziabile.

**Trasversale — emoji come icone di sistema.** 🚄🍝💪🥂 nelle card e nei bottoni: rese
diverse su Android, tono amatoriale che contraddice l'obiettivo "istituzionale" (e in una
pitch deck si vede). → Set di icone custom (anche solo 8 lucide personalizzate) per le
categorie in v1.1; le emoji restano SOLO nei toast e nel saluto, come da UI-VOICE.

- **Splash**: pulita ✓ ma auto-dismiss 2s + nessun onboarding = un utente nuovo atterra su
  una home vuota senza spiegazioni. Serve un first-run: 3 card che dicono cosa fare
  ("manda uno screenshot, al resto pensa Keiko") + richiesta permesso notifiche CONTESTUALE
  (mai al primo avvio a freddo: tasso di rifiuto ~60%).
- **Topbar**: 4 elementi ok. La campanella-toast è un vicolo cieco (già segnata TODO). Il
  suggerimento rotante ogni 3,2s è movimento perpetuo in testa alla pagina: distrae; e non
  esiste gestione `prefers-reduced-motion` in tutto il mockup (rise, pulse, parallax, float).
- **Week strip**: i pallini evento/to-do sono sotto i 44px di tap e senza legenda. Il peek è
  buono ma è un terzo modo di vedere il giorno.
- **Hero**: forte ✓. Ma con dati veri i titoli lunghi ("Treno Roma Termini - Milano
  Centrale") vanno su 2 righe e schiacciano il biglietto: mancano regole di troncamento
  (max 1 riga + ellissi) e un campo "titolo breve" dal parser. Il carosello con card 326 su
  390 lascia 20px di spia della card dopo: appena sufficiente, i puntini aiutano.
- **Biglietto**: l'oggetto migliore della UI. Con un solo orario (dati reali) la variante
  compatta va disegnata, non improvvisata (ora è delegata a "compatta ciò che manca").
- **In arrivo**: info-line con ellissi frequente sui dati veri; a 128px con 4 righe di testo
  dentro, il respiro è al limite.
- **Oggi per te**: anello progresso senza unità ("1" di cosa?); "Altri pasti: Pranzo ·
  Merenda · Cena · Dopo cena" è un elenco inerte — o tappabile o via.
- **Pannello evento**: adattivo ✓ ma la maniglia che si TOCCA per espandere è
  un'affordance sbagliata (una maniglia si trascina); il drag-to-dismiss atteso non esiste.
- **Overlay giorno**: pannello flottante elegante ma su iPhone SE/13 mini il contenuto va
  in doppio scroll annidato. I to-do di carta su fondo scuro ✓ (miglior contrasto della UI).
- **Mood chiaro — difetto reale scoperto in review**: la carta (#FBF8F0) e le card (#F8F4E9)
  sono QUASI IDENTICHE → nel chiaro biglietti e to-do perdono l'identità "oggetto", si
  reggono solo sull'ombra. Violazione della nostra stessa regola 1. → Nel mood chiaro la
  carta serve più scura/calda (es. #F3EDDF) o con bordo dedicato.
- **Error/loading/offline**: inesistenti nel mockup. Zero stati d'errore disegnati, zero
  offline (e un calendario si consulta IN TRENO, senza rete: è il caso d'uso principe).
  Lo shimmer c'è solo su "Aggiorna". → Da disegnare prima della Tappa 2: skeleton per ogni
  card (regola 13), banner offline, card errore con retry.

## 3 · ARCHITETTURA

1. **Overlay senza URL = vicolo cieco strutturale.** Pannelli evento/giorno/agenda vivono
   solo in stato JS: niente deep-link (le notifiche push DEVONO aprire la card giusta —
   gap 4.6), il back di Android/PWA chiude l'app invece del pannello, niente condivisione.
   → Route-based modals (Next intercepting/parallel routes) PRIMA di costruire i pannelli
   in Tappa 2. Rifarlo dopo costa il triplo.
2. **Home = 6 fonti dati.** tickets, todos, diet, workout, watch, trips: senza un fetch
   aggregato server-side (RSC unico o /api/home) sono waterfall e jank. Da decidere ora.
3. **backdrop-filter e blur estesi**: già bloccato il renderer nei test di Code; su Android
   medio-basso sarà jank costante. → Budget effetti: bloom = gradiente statico pre-calcolato
   (no blur runtime), blur solo su topbar/tabbar, `prefers-reduced-motion` ovunque.
4. **"Aggiornato 2 min fa" senza backend è un'arma puntata contro di noi.** Il mockup mostra
   freshness che richiede resolver + colonne enriched_at (gap 3.10). Se shippiamo l'etichetta
   statica, è un falso — peggio di niente. → L'etichetta appare SOLO quando il dato è
   davvero arricchito. Mai hardcoded.
5. **Gesti con Pointer Events puri non sopravvivono a iOS Safari** (scroll che cancella i
   pointer, rubber-banding). → use-gesture/framer drag per swipe to-do e dismiss pannelli.
6. **Countdown client-side**: ok, ma serve una sola sorgente di verità dell'"evento
   prossimo" condivisa tra .now, hero, ctxbar (oggi 3 calcoli separati = 3 bug futuri).
7. **PWA ceiling — decisione strategica da mettere a roadmap:** niente Live Activities,
   push iOS limitate, niente widget. Flighty e Structured vincono sulla lock screen. Un
   wrapper nativo (Capacitor) in v2 va pianificato ORA nel modo in cui si scrive il codice
   (niente API browser-only nei punti caldi).

## 4 · SCALABILITÀ (100 → 5M utenti)

- **DB/calendari**: dati per-utente piccoli, con indici e RLS scala senza drammi. Non è qui
  il collo di bottiglia.
- **Colli veri, in ordine di costo:** (a) **LLM per ingestione**: ogni screenshot è una
  chiamata vision; a 5M utenti è il primo costo variabile — servono quota per utente, cache
  per input identici, modello piccolo per i casi facili con escalation; (b) **resolver
  luoghi via Claude web-search** (todo-place oggi): lento e costoso — sostituire con Places
  API + resolver_cache (già in gap doc, va anticipato); (c) **cron tick che scansiona tutti
  gli utenti ogni 15 min**: O(N) — va ribaltato in scheduling indicizzato per due_at;
  (d) **trip generate >60s**: la coda (Inngest/QStash) non è opzionale oltre i 100 utenti;
  (e) **storage screenshot**: crescono per sempre e contengono PII → policy di retention
  (parse → estrai → elimina l'immagine dopo N giorni) decisa ORA.
- TMDB/meteo/classifiche: banali con cache TTL. Realtime multi-device: non serve fino a v2.

## 5 · SICUREZZA

1. **Gli screenshot sono PII concentrata** (PNR, indirizzi, nomi, telefoni). Oggi: nessuna
   retention, nessuna cifratura dichiarata, e vengono inviati a un LLM esterno. GDPR-critico
   prima di QUALSIASI utente esterno (fidanzata inclusa, formalmente). → retention policy +
   informativa (già roadmap 2, confermata la priorità).
2. **Prompt injection via input**: uno screenshot/testo può contenere istruzioni ostili che
   il parser potrebbe eseguire ("ignora le regole e…"). → il parser tratta l'input SOLO come
   dati (zod su output, mai tool-use nell'ingestione), l'Ask con tool-use richiede conferma
   UI per ogni azione (già previsto — mantenerlo non negoziabile).
3. **"Esci alle" implica la posizione di casa** salvata: dato ultra-sensibile, mai in URL
   (regola già rispettata dai link maps/dir? da verificare), cifrato a riposo.
4. **"Copia link" di condivisione** implica endpoint pubblici con token: expiry + revoca o
   si rimanda (consiglio: rimandare a v2 con auth vera).
5. Single-user con account condiviso per il test: accettabile per la demo, ma la fidanzata
   vede TUTTO e scrive sui TUOI dati. Da dire esplicitamente, non da scoprire.

## 6 · ROADMAP (per funzionalità)

| Funzionalità | Destino | Perché |
|---|---|---|
| Home nuova (hero+in arrivo+oggi) | **MVP** | è il prodotto |
| Aggiunta testo+foto (1 tap) | **MVP** | azione core, friction minima |
| Pannello evento + giorno (con route) | **MVP** | consumo dei dati core |
| Notifiche base + deep link | **MVP** | il "pensa lui" si sente qui |
| Stati vuoti/errore/offline + onboarding 3 card | **MVP** | prima impressione e treno senza rete |
| Mood scuro | **MVP** — chiaro in **1.1** | dimezza QA al lancio; il chiaro ha il bug carta/card da risolvere |
| Ask = ricerca locale | **MVP** | onesta e utile |
| Ask conversazionale (tool-use) | **V2** | infrastruttura pesante, va fatta bene |
| Voce (STT) | **1.1** | terza via d'ingresso, non blocca il valore |
| Import Google/Apple Calendar (read-only) | **1.1, alta priorità** | barriera d'adozione n.1 |
| Agenda view | **1.1** | la home basta all'inizio |
| Watchlist | **1.1** | differenziante ma non core |
| Personalità colore (scelta in profilo) | **1.1** | brand prima, delight poi |
| Rotazione random palette + bloom orario | **Eliminare** | gimmick, anti-brand |
| Long-press/swipe come unica via | **Eliminare** (tenere come scorciatoia di "⋯" visibile) | scopribilità |
| Condivisione con link pubblici | **V2** | sicurezza prima |
| Multi-utente + RLS + privacy | **V2** (già roadmap) | prerequisito di qualsiasi estraneo |
| Cerchie/famiglie, profilo gusti | **V3** | visione, non ora |
| Wrapper nativo (widget/Live Activities) | **V2-V3, decidere ora l'architettura** | ceiling PWA reale |

## 7 · PRIORITÀ DELLE CRITICITÀ

**Critiche** (bloccano lancio/test): stati vuoti+onboarding inesistenti · overlay senza
route/deep-link · distruttivo senza undo · tipografia sotto AA · PII screenshot senza
retention · offline inesistente per un calendario.
**Alte**: Ask che promette chat inesistente · friction del ＋ · titoli reali che rompono i
layout · carta≈card nel mood chiaro · gesti senza equivalente visibile · freshness label
senza backend · performance blur su Android.
**Medie**: 7 sezioni sempre visibili · 4 risposte a "cosa mi aspetta" · emoji come icone ·
anello senza unità · campanella vicolo cieco · brand senza colore firma.
**Basse**: bloom orario · rotazione palette · parallax · ctxbar · suggerimenti rotanti.

## 8 · BENCHMARK

- **Fantastical** — il natural language input è il gold standard: il nostro "Scrivilo" è
  alla pari come idea, dietro come feedback (loro mostrano il parsing LIVE mentre scrivi:
  da copiare in v1.1, è fiducia istantanea).
- **Structured / Amie** — il concorrente visivo più vicino (calendario+todo, giocoso-pro).
  Loro hanno UNA timeline verticale del giorno chiarissima; noi frammentiamo il giorno in 4
  viste. Da copiare: la timeline come vista giorno. Da evitare: il loro social layer.
- **TripIt** — ingestione via email-forward: la loro killer feature di acquisizione. Il
  nostro screenshot è più moderno, ma l'email-in (gap 2.9) va anticipata: è distribuzione.
- **Flighty** — il dettaglio volo è il riferimento per il nostro pannello volo; la loro Live
  Activity è irraggiungibile in PWA: argomento chiave per il wrapper nativo.
- **Apple Music/Store** — l'immersività che copiamo funziona lì perché c'è artwork VERO.
  I nostri gradienti reggono, le emoji no. Copiare la disciplina editoriale (poche sezioni,
  curate), evitare di copiare solo la pelle.

## 9 · LENTE INVESTITORE

Il mockup trasmette qualità sopra la media degli MVP (il biglietto di carta, la coerenza dei
token, la voice) — questo convince. Cosa NON convince: (a) l'ampiezza — calendario + dieta +
palestra + film + viaggi + chat AI letta da un investitore è "super-app di una persona sola",
cioè mancanza di focus; serve la narrativa "un calendario che pensa; i domini sono moduli
dello stesso motore d'ingestione"; (b) le emoji e le etichette finte di freshness — dettagli
che un occhio allenato nota e che comunicano "demo"; (c) il moat: il parsing LLM è commodity
entro 12 mesi — il moat vero è l'abitudine quotidiana + i dati longitudinali della vita
dell'utente + l'ingestione multicanale (screenshot+email+voce). La pitch deve dirlo.
Dove spreca budget oggi: gimmick di delight (rotazioni, bloom orario) prima di onboarding,
stati vuoti e import calendario. Dove sottovaluta la complessità: Ask conversazionale,
offline, e il salto multi-utente.

## 10 · PIANO D'AZIONE

| Problema | Impatto | Priorità | Soluzione | Motivazione |
|---|---|---|---|---|
| Stati vuoti + onboarding assenti | Primo utilizzo fallisce | Critica | First-run 3 card + empty state per sezione | la prima sessione decide la retention |
| Overlay senza URL | Notifiche/back rotti | Critica | Route-based modals prima della Tappa 2 | rifarlo dopo costa 3× |
| Swipe-delete senza undo | Perdita dati | Critica | Toast con "Annulla" 5s + soft delete | fiducia |
| Tipografia sotto AA | Esclude il target dichiarato | Critica | Min 11px, contrasto 4.5:1 | accessibilità = mercato, non etica |
| PII screenshot | GDPR | Critica | Retention: parse→estrai→cancella | prerequisito di utenti esterni |
| Offline assente | Caso d'uso principe (treno) | Critica | SW cache-first per dati letti | un calendario offline-incapace non è un calendario |
| Ask finta | Fiducia bruciata | Alta | MVP = solo ricerca locale | mai promesse vuote in AI |
| ＋ a 2 tap | Friction sull'azione core | Alta | Tap → campo testo diretto, foto/voce come icone | volume d'uso massimo |
| Titoli veri rompono layout | Qualità percepita | Alta | max 1 riga + titolo breve dal parser | i dati reali sono il design |
| Carta≈card nel chiaro | Regola 1 violata | Alta | Carta #F3EDDF nel mood chiaro | l'oggetto deve restare oggetto |
| Gesti invisibili | Funzioni non trovate | Alta | "⋯" visibile su ogni card | gesti = scorciatoia |
| Random palette | Brand debole | Media | Firma di default, scelta in profilo | riconoscibilità |
| Emoji-icone | Percezione amatoriale | Media | Icon set custom categorie | istituzionalità dichiarata |
| 7 sezioni fisse | Carico cognitivo | Media | Sezioni condizionali al contesto | curation > inventario |

**Roadmap operativa:**
- **Subito (dentro il blocco UI in corso):** route-based modals; undo su elimina; minimi
  tipografici e contrasti; troncamento titoli + titolo breve; "⋯" sulle card; fix carta nel
  chiaro; ＋ a 1 tap; empty/error/skeleton states disegnati e portati; via bloom orario e
  rotazione random (firma unica di default).
- **Prima del lancio (anche del test allargato):** onboarding first-run; offline read-only;
  retention screenshot + informativa; notifiche con deep-link; parsing live nel campo testo.
- **Post-lancio:** import Google Calendar; email-in; voce; agenda; watchlist; personalità in
  profilo; mood chiaro rifinito.
- **Backlog da custodire:** Ask conversazionale con tool-use; wrapper nativo (widget/Live
  Activities); timeline del giorno alla Structured; cerchie/famiglia; profilo gusti.

---
*Nota di metodo: metà di queste criticità non si vede nel mockup e si vede subito coi dati
veri (titoli lunghi, giornate vuote, offline). È il motivo per cui la Tappa 2 con dati reali
è il vero collaudo del design, non la parità di pixel della Tappa 1.*
