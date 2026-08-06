# KEIKO — documento unico di progetto

> Questo è il documento da tenere agganciato al progetto Claude.
> Aggiornato il 6 agosto 2026. Se leggi questo file all'inizio di una chat,
> **hai già tutto il contesto: non chiedere a Matteo di rispiegarti il progetto.**
> Apri parlando di cosa si fa oggi, partendo da §5.

---

## 1 · Cos'è Keiko e cosa NON è

Keiko è l'app personale di Matteo: mette in **un posto solo** le cose della giornata —
eventi e biglietti, dieta, allenamento, cose da guardare, viaggi. Non è un altro
calendario e non è una chat generica.

**Decisione presa il 3 agosto 2026, e vale finché Matteo non la cambia:**
è un **progetto personale**, per lui e per quattro o cinque amici. Niente
monetizzazione, niente lancio, niente abbonamenti. Se fra tre mesi la usano ~70
persone, ci si risiede e si riparla. Tutto il lavoro commerciale è parcheggiato
(sta in `NON-ORA.md`, con i sei motivi per riaprirlo).

**Conseguenza pratica:** quando proponi qualcosa, chiediti se rende l'app più
divertente da usare fra amici — non se è vendibile.

## 2 · La bussola (come si decide)

1. **Non ricreiamo quello che Google e Claude fanno già bene.** Lo colleghiamo.
2. **Niente prezzi finti da vetrina.** Link diretto, non un numero che invecchia.
3. **Il valore è togliere fatica, non aggiungere informazioni.** «Non dover aprire
   otto app» vale più di «sapere il prezzo esatto».
4. **Forzare = affezionare, non chiudere le porte.**
5. **Il filtro della convergenza:** *se togliessi questa cosa da Keiko e la vendessi
   da sola, varrebbe meno?* Se sì, è roba nostra. Se no, si collega e basta.

## 3 · Le regole che non si discutono

**Tecniche** (da `AGENTS.md`):
- Modifiche piccole e mirate, spiegate in italiano semplice. La soluzione semplice
  batte quella furba.
- Non si rifattorizzano file scollegati dal compito.
- Non si tocca `lib/` e `app/api/` se non richiesto esplicitamente.
- `npx tsc --noEmit` e `npm run build` verdi **prima** di ogni commit.
- **MAI committare senza l'ok esplicito di Matteo.** Mai pushare senza dirlo.
- Accento = `var(--accent)`. Il viola non esiste.
- Next.js 16: leggere la guida in `node_modules/next/dist/docs/` prima di scrivere
  codice su routing o rendering. Non è il Next che credi di conoscere.

**Legali** (queste hanno conseguenze penali, non stilistiche):
- **Keiko non scrive e non modifica MAI un piano alimentare.** In Italia è atto
  riservato a medici, dietisti e biologi nutrizionisti (art. 348 c.p.). Keiko
  *esegue* il piano del professionista: mostra, sposta, registra. Non ricalcola
  quantità, non fissa fabbisogni, non propone alternative che il professionista
  non abbia già previsto.
- **Keiko non interpreta dati sanitari.** Peso e pressione si registrano e si
  mostrano. Nel momento in cui li commenta («pressione alta, fai così») diventa un
  dispositivo medico e cambia l'intero quadro normativo (MDR).
- **La scheda di allenamento resta del PT.** Keiko la esegue e la sposta. Generare
  allenamenti va bene per adulti sani; mai per chi ha dichiarato un infortunio.
- **Dati di altre persone = consenso esplicito dentro l'app**, reciproco, revocabile
  in un tocco. I dati di salute (allenamenti, dieta, peso) sono categoria
  particolare, art. 9 GDPR: la soglia è più alta, non più bassa.
- **Screenshot di chat e storie**: contengono roba di terzi. Estrarre e cancellare,
  non conservare.
- **Il backup CSV della dieta non si committa mai nel repo.** Sono dati sanitari.

## 4 · Dove siamo (stato al 6 agosto 2026)

**Stack:** Next.js 16 (Turbopack) · React 19 · TypeScript · Tailwind · shadcn ·
Framer Motion · PWA · NextAuth v5 con Google · Supabase (regione UE) · Vercel.
Modello: Claude Sonnet (Haiku provato sul consiglio e scartato: perdeva qualità).
Repo: `orca-app`. Si lavora con Claude Code.

**Fatto e verificato (base, fino al 4 agosto):**
- Multi-utente con RLS attiva su tutte le tabelle, provata su dati veri.
  `MULTIUSER_RLS` fallisce **chiuso**: se manca, l'app rifiuta di leggere i dati.
- Tetto ai costi AI per utente e per giorno (tabella `usage`, funzione `usage_add`).
- Cancellazione account su 13 tabelle, testata cercando di aggirarla.
- Consensi salvati (tabella `consents`). Limite noto e accettato: tiene lo stato
  di adesso, non la storia. Se si riapre il commerciale serve `consents_log`.
- Onboarding una volta sola (K14b): in Safari propone di installare, dall'icona fa
  l'onboarding. Il flag `profile.onboarded_at` sta sul **server**, perché su iPhone
  Safari e l'app dell'icona hanno memorie separate.
- Icone, favicon e og:image a posto; notifica di prova verificata sull'iPhone.
- `.env.example` completo, SQL tracciate in `docs/sql/`.

**Fatto il 5-6 agosto (la settimana grossa — tutto committato e in produzione):**
- **Zoom e rotazione**: viewport bloccato, input a 16px (era la causa dello zoom
  involontario di iOS), `viewport-fit=cover` accende le safe-area. Su iPhone la
  rotazione non si può bloccare da web: c'è il pannello «Keiko si usa in
  verticale». Su Android il blocco è nel manifest.
- **Fondamenta TMDB**: `tmdb_id` in tabella watchlist. Ogni titolo si risolve UNA
  volta all'aggiunta; poster e genere stanno nel database. Prima: 2 chiamate TMDB
  per titolo a ogni apertura di Guarda; ora zero.
- **Guarda rifatta**: tap sulla locandina = scheda (prima segnava «visto»!), tocco
  lungo = menu azioni, filtri e segmented control, una griglia sola (prima lo
  stesso titolo appariva fino a 3 volte), schermata vuota, scheletri, voto dal
  toast. Serie con stagione/episodio («Continua a guardare», +1 episodio).
- **Ricerca su tutti gli abbonamenti**: nel profilo si spunta quali piattaforme
  paghi; la ricerca in Guarda mostra «✅ Ce l'hai su Now» e ordina prima quello
  che è già incluso. Dati TMDB, gratis.
- **Costi AI, capitolo chiuso** (`docs/PROMPT-COSTI-CONSIGLIO.md` per la storia):
  - Consiglio film: da ~25-34 cent a **~0,9 cent** e da decine di secondi a ~7s.
    Non cerca più sul web: Claude traduce la frase in filtri, TMDB discover trova
    i candidati con le piattaforme vere, Claude sceglie e spiega. Il titolo secco
    («aggiungi Breaking Bad») non chiama Claude affatto: zero.
  - Cache dei prompt dove ci sono più giri (consiglio-ripiego, viaggio); tolta
    dove il giro è unico (costerebbe il 25% in più).
  - `usage_log` + tabella per-operazione in `/numeri`: si MISURA, non si deduce.
    Registra anche modello e ricerche web.
  - Pesi onesti nel tetto: cattura 1, consiglio 2, piano 5, viaggio 10.
    `AI_CAP_PER_DAY=200` (in `.env.local` E su Vercel): ora è un salvavita contro
    i loop, non una razione.
  - Foto dei luoghi (Google Places): il nome si salva in `tickets.enrichment`.
    Da 4 ricerche a pagamento per OGNI apertura della home a 4 nella vita
    dell'evento. Effetto collaterale: home da 3s a 0,25s.
- Fix: il messaggio del tetto («Per oggi mi fermo qui 🌙») ora arriva all'utente;
  prima il client lo appiattiva su «Qualcosa non torna, riprova».

**Aperto:**
- **Mandare il link ai primi due amici.** La parte tecnica è finita. Restano:
  chiedere che iPhone hanno (serve iOS 16.4+) e mandare il messaggio già scritto
  in `docs/PRIMA-DEGLI-AMICI.md`.
- Dev e produzione **condividono lo stesso database**: le prove di Claude Code
  consumano il tetto e possono sporcare dati veri (successo due volte questa
  settimana). Prima o poi: progetto Supabase separato per lo sviluppo.
- `films_catalog` e `deepenFilmCatalog` non servono più (il consiglio usa TMDB):
  da dismettere con calma, come `search_log`. `logSearch()` è ancora chiamata ma
  la tabella non c'è più: rumore nei log, da togliere quando capita.
- Le istruzioni del progetto Claude parlano ancora di «OrCa» e «Airtable»: sono
  vecchie, le deve correggere Matteo a mano.
- Regola imparata sul campo: i pesi del tetto sono legati ai COSTI, non alle
  funzioni. Quando un costo cambia, il peso va rivisto (c'è il commento in
  `lib/ai.ts`).

**Storia da non ripetere:** il 31 luglio il piano alimentare di Matteo è sparito
perché `MULTIUSER_RLS` era spento in locale e `saveDietPlan()` cancella tutte le
righe prima di inserire. Da lì viene la regola del fallimento chiuso.

## 5 · Come si comincia una chat nuova

1. Leggi questo file. Non chiedere a Matteo di rispiegare il progetto.
2. Guarda §4 «Aperto» e la lista §6.
3. Proponi **una cosa sola** da fare oggi, con il motivo. Non una lista di dieci.
4. Se serve una modifica al codice, scrivi il prompt per Claude Code seguendo §3.
5. Se una SQL va eseguita a mano, dallo in un blocco pulito: si incolla
   nell'editor SQL di Supabase dopo aver premuto Cmd+A e cancellato.

**Come parlare con Matteo:** italiano semplice, frasi corte, niente sigle non
spiegate. Se una cosa è sbagliata si dice, con il motivo. Se una decisione è sua,
si esegue anche quando non la condividi — dopo aver detto una volta perché.

## 6 · Le 179 idee scelte (su 256)

La versione navigabile con tutte e 256, i filtri e le avvertenze è l'artifact
**«Tutte le idee di Keiko»** (`idee-keiko.html`). Qui sotto solo le scelte.

Legenda: `·NEW` = proposta nata il 4 agosto · ⛔ = c'è un problema legale da
risolvere prima di farla · ⚠️ = si fa, ma con quel paletto preciso ·
🔧 = limite tecnico, non legale.

**Il prossimo passo consigliato**: mandare il link (vedi §4 «Aperto»). Poi,
quando gli amici saranno dentro: il blocco intrattenimento (184 → 186 → 187),
perché è l'unico che senza amici non esiste. Il 184 (voto a orche) c'è già,
col gancio nel toast «Visto ✓ Com'era?».
Nota che 186 dipende dal 184 e dalle amicizie, e che alcune idee scelte dipendono
da idee **non** scelte (per esempio 145 «hai 40 minuti liberi» ha bisogno del 101,
la sincronia con Google Calendar).

### 1 · Il cervello che incrocia i domini

La cosa che nessun'altra app fa: la dieta sa del volo, l'allenamento sa della cena.

- **1** — Il consiglio del giorno anche in home, una riga sotto il saluto
- **3** — Dieta × calendario: cena fuori stasera → pranzo leggero
- **4** — Guarda × calendario: sveglia alle 5 → stasera un episodio, non un film
- **5** — Viaggio × allenamento: in trasferta → seduta a corpo libero da 20'
- **6** — Dopo un concerto a mezzanotte → niente sveglia-palestra, riprogramma
- **8** — Il «perché»: ogni consiglio mostra su tap la regola che l'ha generato
- **9** — 👍/👎 su ogni consiglio, e le regole si tarano
- **10** — Tono duro o rilassato, scelto da te per ogni area
- **12** — Settimana difficile: se il calendario è pieno, Keiko abbassa le pretese e lo dice
- **13** — Il profilo che Keiko si costruisce su di te, leggibile e correggibile
- **141** ·NEW — Il consiglio del mattino in UNA frase sola, per chi l'app non la apre
- **144** ·NEW — Il coach parla al plurale con chi vive con te: «stasera cena fuori per entrambi»
- **145** ·NEW — «Hai 40 minuti liberi»: quando si apre un buco, propone cosa infilarci
- **147** ·NEW — «Non dirmelo più»: ogni consiglio si può zittire per sempre su quel tema
- **148** ·NEW — Pioggia domani e avevi corsa all'aperto → propone il cambio la sera prima
- **149** ·NEW — Ricorda i tuoi no: tre rifiuti del lunedì e smette di proporlo il lunedì
- **151** ·NEW — «Cosa sai di me»: le 5 cose che Keiko ha dedotto, cancellabili una per una

### 2 · Butta dentro, Keiko capisce

Niente API da chiedere agli altri: screenshot, foto, testo. Questa via non la chiude nessuno.

- **14** — Screenshot di Strava/Garmin/tapis roulant → allenamento registrato
- **15** — «Condividi su Keiko» da qualsiasi app, senza aprirla
  - 🔧 LIMITE TECNICO: Su iPhone «Condividi su Keiko» non esiste: WebKit non implementa lo share target. Si fa con un Comando rapido, oppure serve il wrapper nativo.
- **16** — Foto del piatto → finisce nel diario della dieta
  - ⚠️ PALETTO: Registrare il pasto: sì. Stimare le calorie e dirti di conseguenza cosa mangiare dopo: no.
- **17** — Scontrino della spesa → cosa puoi cucinare con quello che hai
  - ⚠️ PALETTO: Suggerire ricette con quello che hai: sì. Suggerirle «per stare nel piano»: no.
- **18** — PDF del biglietto aereo → evento e tappa di viaggio
- **19** — Un solo messaggio, più eventi: «volo venerdì e hotel sabato»
- **20** — Input a voce, stesso risultato del testo
- **21** — Parser esteso: arrivo, binario, carrozza, posto
- **22** — Correggi parlando: «non è alle 6, è alle 16»
- **24** — Niente doppioni se riprovi due volte
- **26** — Indirizzo email a cui inoltrare le conferme
- **28** — «Trasloco vita»: importi anni di storia al primo avvio
- **152** ·NEW — Incolli un link e basta: evento Facebook, pagina di un locale, biglietteria
  - 🔧 LIMITE TECNICO: Gli eventi Facebook sono chiusi allo scraping e vietati dalle loro condizioni. Gli altri link sì.
- **153** ·NEW — Screenshot di una chat con «ci vediamo giovedì alle 21» → evento
  - ⚠️ PALETTO: Lo screenshot contiene messaggi di altre persone. Tienilo il tempo di estrarre l'evento, poi cancellalo.
- **155** ·NEW — Screenshot di una storia Instagram → to-do «andarci»
  - ⚠️ PALETTO: Come 153: dentro c'è roba di qualcun altro. Non conservare l'immagine.
- **157** ·NEW — «Rifallo come l'altra volta»: ripeti l'ultimo inserimento simile
- **160** ·NEW — Cinque screenshot insieme → cinque eventi
- **161** ·NEW — Correggi toccando la parte sbagliata, senza riscrivere tutto

### 3 · Viaggi

Il pezzo firma. Oggi tutti si fermano al prima di partire.

- **31** — Mai posti chiusi quel giorno, orari verificati, fonti citate
- **32** — All'apertura ricontrolla solo quello che cambia (scioperi, orari)
- **33** — Viaggi lunghi e multi-città, timeline per data
- **34** — Cambia un'attività scegliendo fra alternative già pronte
- **35** — Vista destinazioni e giorno per giorno
- **36** — Mappa con i pin e la rotta
- **37** — Notti pianificate e tempi di spostamento in un colpo d'occhio
- **38** — Budget del viaggio per categoria
- **39** — Cosa mettere in valigia, per meteo e durata
- **40** — Carichi il TUO itinerario scritto a mano e Keiko lo arricchisce
- **41** — Tutti i documenti del viaggio in un posto solo
- **42** — Itinerario condivisibile
- **43** — Meteo a destinazione dentro l'itinerario
- **44** — Bucket list e mappa dei posti già visti
- **45** — Durante il viaggio la home DIVENTA il viaggio
- **46** — A fine viaggio Keiko scrive il diario da solo
- **163** ·NEW — «Chi viene?»: aggiungi le persone e ognuna vede il piano
- **164** ·NEW — Conto diviso: chi ha pagato cosa, saldo finale
- **165** ·NEW — Piano B pioggia: per ogni giorno un'alternativa al chiuso già pronta
- **166** ·NEW — «Quanto camminiamo oggi»: km e tempo a piedi prima di uscire
- **167** ·NEW — Le tappe saltate tornano in fondo come «magari domani», non spariscono
- **168** ·NEW — Orari nell'ora del posto, con l'ora di casa piccola sotto
- **169** ·NEW — Quattro frasi utili nella lingua del posto, offline. Non un corso
- **170** ·NEW — Il viaggio finito diventa una pagina sola da mandare agli amici
- **171** ·NEW — «Rifacciamo quello»: duplica un viaggio passato cambiando le date
- **172** ·NEW — Numeri utili del posto salvati offline
- **173** ·NEW — Spese convertite al cambio del giorno in cui hai pagato
- **174** ·NEW — Countdown alla partenza, e la valigia si accende da sola a due giorni

### 4 · La memoria

I dati ce li hai già. Questa sezione costa poco e affeziona molto.

- **47** — Storico per tipo con i prezzi che hai pagato davvero
- **48** — «Un anno fa oggi»: il ricordo in home
- **49** — Contatori di vita: concerti, città, km, film
- **50** — Recap annuale condivisibile, stile Wrapped
- **51** — Statistiche per persona: «con lei: 12 cene, 3 concerti, 1 viaggio»
- **52** — Cerchi nel passato parlando: «quand'è che sono stato a Napoli?»
- **53** — Grafico dei progressi in palestra
- **54** — «Quanti ne ho visti questo mese» nella sezione Guarda
- **175** ·NEW — Mappa dei posti dove hai messo piede, che si riempie da sola
- **176** ·NEW — La striscia dell'anno: 365 quadratini, uno per giorno, colorati per cosa hai fatto
- **177** ·NEW — «La prima volta che»: prima volta in una città, primo concerto di un artista
- **178** ·NEW — Classifica dei posti dove sei tornato più volte
- **179** ·NEW — Quest'anno contro l'anno scorso, su tre numeri che scegli tu
- **180** ·NEW — Tagghi una serata con una faccina e ritrovi «le serate belle»
- **181** ·NEW — Il tuo anno in una immagine sola da mandare in giro a dicembre
- **182** ·NEW — «Non ci torno»: lista nera personale, col motivo
- **183** ·NEW — Anniversari automatici: un anno da quel viaggio, dieci concerti visti

### 5 · Intrattenimento e amici

Il buco lasciato da TV Time. È l'unica area che ha bisogno degli amici per esistere.

- **55** — Da quello che guardi nasce il profilo dei tuoi gusti
- **56** — Una pagina sola: film, serie, podcast, musica
- **57** — Podcast seguiti, ultime puntate, notifica nuova puntata
- **58** — Collegamento Spotify: i tuoi ascolti diventano segnali
  - 🔧 LIMITE TECNICO: Spotify in modalità sviluppo accetta massimo 25 utenti. Oltre serve la loro approvazione.
- **59** — Collegamento YouTube leggero: iscrizioni e piaciuti
  - 🔧 LIMITE TECNICO: Gli scope Google sensibili richiedono la verifica di Google. Non è difficile, ma sono settimane.
- **60** — «Cosa vedo stasera?» in base al tempo che hai davvero
- **61** — Podcast scelto sulla durata del viaggio
- **62** — Playlist legata alla tappa del viaggio
- **63** — Notifica quando un titolo esce o arriva su una piattaforma che hai
- **64** — Filtri per genere, piattaforma, durata
- **65** — Trailer e «simile a…» nel dettaglio
- **67** — Poster, durata e logo piattaforma ovunque
- **68** — Serata a due: incrocio della tua lista con quella di chi hai accanto
- **184** ·NEW — Voto e due righe su quello che hai finito
- **186** ·NEW — Feed: cosa hanno visto i tuoi amici questa settimana
  - ⚠️ PALETTO: Il feed espone cosa guardano i tuoi amici. Deve valere solo fra amicizie reciproche e accettate, mai automatiche.
- **187** ·NEW — «Chi me lo consiglia»: chi fra i tuoi lo ha amato, prima di iniziarlo
- **188** ·NEW — Lista condivisa «da vedere insieme» con una persona
- **189** ·NEW — Il duello: stesso film, due voti, si scopre chi è più severo
- **190** ·NEW — «Stasera in due»: incrocia la tua lista con quella di chi hai davanti
- **191** ·NEW — Il consiglio dell'amico che ti somiglia di più, calcolato sui voti
- **192** ·NEW — Recensioni con spoiler che si aprono solo se hai segnato «visto»
- **193** ·NEW — Classifica dell'anno del gruppo: i cinque più votati fra gli amici
- **194** ·NEW — «Sto guardando adesso»: stato leggero che sparisce dopo 24 ore
  - ⚠️ PALETTO: Uno stato «sto guardando adesso» dice dove sei e cosa fai. Facoltativo e spegnibile, non attivo di default.
- **195** ·NEW — Notifica quando un amico finisce una serie che hai in lista
- **196** ·NEW — Gruppo di visione: tre amici, una serie, un episodio a settimana

### 6 · Salute e allenamento

Qui gli amici cambiano tutto: allenarsi da soli è un dovere, in due è un appuntamento.

- **69** — Cronometro della sessione e timer di recupero
- **70** — Immagini degli esercizi affidabili
- **71** — Se salti un giorno, la scheda si riprogramma da sola
  - ⚠️ PALETTO: Spostare un giorno va bene: sposta, non prescrive.
- **72** — Scambia un allenamento come scambi un pasto
- **73** — Report mensile dell'allenamento
- **74** — Sposta esercizi e giorni senza rifare la scheda
- **75** — Obiettivi settimanali con l'anello che li mostra
- **76** — Una pagina Salute sola: peso, corse, palestra, sonno
  - ⚠️ PALETTO: Stesso limite di 27: la pagina Salute raccoglie e mostra, non diagnostica.
- **78** — Promemoria acqua e pasti, solo se hai scelto il profilo duro
  - ⚠️ PALETTO: Promemoria su acqua e pasti: solo se li ha chiesti lui. Altrimenti è assillo, non aiuto.
- **79** — Festeggiamento a fine seduta: animazione e vibrazione
- **80** — La scheda che evolve coi tuoi dati
  - ⚠️ PALETTO: Keiko che riscrive la scheda da sola è il confine con la fisioterapia. Tienila su persone sane e su carichi, non su patologie o infortuni. Il piano resta del PT.
- **197** ·NEW — Allenamento condiviso: stessa scheda con un amico, vedete chi ha fatto cosa
  - ⚠️ PALETTO: Allenamento condiviso = dati sulla salute condivisi. Consenso esplicito di entrambi, e si deve poter staccare in un tocco.
- **198** ·NEW — La striscia dei giorni di fila, senza drammi quando si rompe
  - ⚠️ PALETTO: Le strisce fanno sentire in colpa. Se si rompe non deve succedere niente di drammatico: nessun numero azzerato in faccia.
- **199** ·NEW — Una sfida a settimana fra amici. Una sola, semplice
  - ⚠️ PALETTO: Una sfida espone i dati di allenamento del gruppo. Stesso consenso di 197.
- **200** ·NEW — «Oggi mi sento»: un tocco prima di iniziare, e il coach ne tiene conto
- **201** ·NEW — I record personali si accendono da soli quando li batti
- **202** ·NEW — Allenamento da vacanza senza attrezzi, costruito sulla destinazione
  - ⚠️ PALETTO: Un allenamento a corpo libero per adulti sani va bene, con l'avviso. Mai se la persona ha dichiarato un infortunio.
- **203** ·NEW — «Quanto ho spinto»: confronto con la stessa seduta di un mese fa
- **204** ·NEW — Il compagno silenzioso: vedi SE si è allenato, non i dettagli
  - ⚠️ PALETTO: È la versione giusta di 197: mostra SE si è allenato, non i numeri. Se devi sceglierne una, scegli questa.
- **205** ·NEW — Foto del peso sulla macchina → carico registrato senza scrivere
- **206** ·NEW — Fine mese: le tre cose migliorate. Non un report

### 7 · Dieta

Regola ferma: Keiko esegue il piano di un professionista, non lo scrive mai.

- **82** — Vista della giornata intera e lista della spesa aggregata
- **83** — Cook mode passo-passo con timer
- **84** — Dettaglio del pasto con foto vera e azioni: cuoci, pianifica, scambia
- **209** ·NEW — Lista spesa da spuntare al supermercato, ordinata per corsia
- **210** ·NEW — «Ho mangiato fuori»: un tocco, la settimana si ricalibra senza colpe
  - ⛔ DA RISOLVERE PRIMA: Stesso problema di 86: «la settimana si ricalibra» è una modifica del piano. Versione lecita: registra lo sgarro, niente rosso, e la frase è «domani si riprende», non nuove quantità.
- **211** ·NEW — La foto del piatto entra nel diario senza scrivere nulla
  - ⚠️ PALETTO: Come 16: il diario sì, il giudizio no.

### 8 · Eventi, calendario, notifiche

Il quotidiano. È quello che ti fa aprire l'app tutti i giorni.

- **88** — To-do «vedi la partita» arricchiti: risultato, orario, dove vederla
- **100** — La notifica ti porta sulla card giusta, e silenzio fra le 23 e le 7
- **104** — I viaggi vengono proposti, non creati di nascosto
- **215** ·NEW — «Ci sono anch'io»: un amico segna che va allo stesso evento
- **216** ·NEW — Il gruppo dell'evento: chi viene, a che ora, dove ci si trova
- **217** ·NEW — Un tap per dire «sto arrivando» a chi ti aspetta
- **218** ·NEW — I compleanni e gli appuntamenti fissi dei tuoi amici
- **219** ·NEW — «Quella cosa che dicevamo»: to-do senza data che ogni tanto riemerge
- **220** ·NEW — La sveglia calcolata all'indietro dall'evento, non messa a mano
- **221** ·NEW — Se annulli un evento, ti chiede se liberare anche il resto della giornata
- **222** ·NEW — Il giorno dopo: «com'è andata?», e basta una faccina

### 9 · Chiedi a Keiko

Da barra di ricerca a mani che fanno le cose.

- **105** — Crea, sposta, elimina parlando — con conferma obbligatoria
- **106** — Storico delle conversazioni e risposta che si scrive mentre arriva
- **107** — I suggerimenti nella barra calcolati sulla tua agenda vera
- **108** — Link toccabili nella risposta e domande già pronte
- **109** — Tetto ai costi per utente, con «Keiko riposa fino a domani»
- **223** ·NEW — Comandi corti: «sposta cena a domani» e basta
- **224** ·NEW — «Che ho fatto ieri?» risponde dai tuoi dati, non dal web
- **225** ·NEW — Le domande che fai spesso diventano bottoni
- **226** ·NEW — Rispondi alla notifica per creare qualcosa, senza aprire l'app
- **227** ·NEW — «Spiegami perché» su ogni cosa che Keiko ha deciso
- **228** ·NEW — Dettatura di una frase sola mentre guidi

### 10 · Come si usa

La differenza fra «carina» e «la apro dieci volte al giorno».

- **111** — Pagine che salgono dal basso e swipe fra le sezioni
- **112** — Vibrazione sulle spunte e «✓ Salvato»
- **113** — Tira per aggiornare, e annulla ovunque
- **114** — Schermate vuote con l'orca, e scheletri di caricamento ovunque
- **115** — Profilo ampliato: unità, anticipo, tema
- **116** — Primo avvio guidato: città, dieta, allenamento
- **117** — Accessibilità: contrasto, tocchi grandi, testo che si ingrandisce
- **118** — Un solo sistema di card e spaziature identiche ovunque
- **119** — Senza rete leggi comunque l'ultimo stato
- **120** — I fix noti in coda (primo tap ingoiato, ricerca in Guarda, ecc.)
- **229** ·NEW — Apertura in mezzo secondo: mostra i dati vecchi mentre carica i nuovi
- **230** ·NEW — Tema chiaro, per chi il nero non lo regge
- **231** ·NEW — Tocco lungo su qualsiasi card = azioni, senza menù
- **232** ·NEW — La home cambia da sola: mattina, pomeriggio, sera
- **233** ·NEW — Modalità una mano: le cose importanti in basso
- **234** ·NEW — «Cosa è cambiato»: torni dopo giorni e vedi cos'è successo
- **235** ·NEW — Il suono giusto quando spunti. Uno solo, ma bello
- **236** ·NEW — Scorciatoie dalla schermata di blocco per le tre cose che fai sempre
  - 🔧 LIMITE TECNICO: Le scorciatoie dalla schermata di blocco richiedono l'app nativa o i Comandi rapidi.

### 11 · Le fondamenta

Non si vedono, ma quando mancano si vede eccome. Molte sono già fatte.

- **121** — Multi-utente completo ✅ fatto
- **122** — Privacy, consensi, cancellazione account ✅ fatto
- **123** — RLS vera su tutte le tabelle ✅ fatto
- **130** — Pulizia dello schema morto
- **131** — Telemetria minima d'uso ✅ fatto in parte (/numeri)
- **237** ·NEW — Backup settimanale dei tuoi dati in un file che scarichi
- **238** ·NEW — «Come sta Keiko»: una pagina sola con lo stato di tutto, solo per te