# KEIKO UI V2 — LE DECISIONI (manifesto operativo)

> Dettate da Matteo il 9 agosto 2026. Questo file è LEGGE per il redesign:
> quando Matteo dice «riprendiamo la UI», si riparte da qui. Ogni mock, ogni
> prompt di ondata, ogni componente si giudica contro questa lista.
>
> **🔒 MOCK CONGELATI (9 agosto)**:
> - Home v2.6 → `docs/mockups/home-v2-final-mock.html`
> - Cucina v2.5 → `docs/mockups/cucina-v2-mock.html`, con la specifica
>   di comportamento in **`docs/UI-CUCINA-LOCKED.md`** (fonte di verità
>   quando si passa al codice: naming, gerarchia, accordion a due livelli)
> - Allenamento v2.5 → `docs/mockups/allenamento-v2-final-mock.html`, con la
>   specifica in **`docs/UI-ALLENAMENTO-LOCKED.md`** e i prompt che l'hanno
>   generata in `docs/PROMPT-ALLENAMENTO-FINALE.md` (fonte unica degli
>   esercizi, zero dati nutrizionali, «A che punto sei» sulle prestazioni)
>
> ⚠️ **Terracotta, eccezione chiusa (punto 26)**: i bottoni con testo usano
> `#AB5A3B` (4,53:1 con `#FFF3EC`); `#C96A45` resta per FAB e decorazioni.
>
> Entrambi APPROVATI e definitivi — i riferimenti visivi ufficiali della V2.
> Read-only: non si modificano più senza richiesta esplicita di Matteo.
> I valori qui sotto sono ESTRATTI dal mock, non ideali: i due documenti
> dicono gli stessi numeri.

## Colore e superfici — VALORI FINALI (congelamento v2.6)
1. Sfondo app: carbone `#0F0F12`, MA mai piatto: **luci d'ambiente coraggiose**
   (vedi punto 5-bis). Grana finissima (noise SVG, opacità 5%).
2. **Doppio accento a temperatura**:
   - **Primario/di sistema = teal `#3DA5C4`** (giorno attivo, link, focus,
     spunte, progressi, bordo barra assistente, l'orca). Variante chiara
     `--teal-soft #86CCE0` per testi teal su fondo scuro (contatori, tab
     attiva, «Aggiungi»). Testo su teal pieno: `#08191E`.
   - **Azione = terracotta `#C96A45`, RARO**: solo FAB, bottoni «Inizia/Apri»,
     stato urgente («aperto ora»). Testo su terracotta: `#FFF3EC`.
     Comparendo poco, torna a significare.
   - Storia: ambra `#FFB84D` → `#FF7A2E` → teal `#4A90A4` + terracotta
     `#D9622F` → **FINALE: teal `#3DA5C4` + terracotta `#C96A45`**.
     NON riaprire.
2-bis. **Colori-categoria con parsimonia** (pallini — mai fondi pieni):
   Viaggi `#5B9BDB` · Sport `#3AB8A8` · Dieta `#57B96E` · Guarda `#8F7AC0` ·
   Eventi `#C4796B`.
   ⚠️ **Chiusa il 12 agosto 2026**: le versioni tenui sul TESTO sono ritirate.
   Fino a quel giorno il metadato accanto al pallino prendeva la tinta chiara
   della sua famiglia (sport `#7CC9BD`, dieta `#8FCB9E`, azione `#F0A377`,
   viaggi `#AECBEE`, e il viola già ritirato dal 2-ter). Nella Home vera il
   risultato era che sulla stessa schermata i metadati avevano quattro colori
   diversi, e l'occhio ci leggeva una gerarchia che non c'era. **Il colore di
   famiglia sta nel `.dot` e basta**; il testo accanto è `--meta` come tutti
   gli altri metadati (regola 3). Le tinte restano scritte qui solo perché si
   sappia cosa è stato tolto e perché.

2-ter. ⚠️ **Il viola, eccezione chiusa (11 agosto 2026)**. La regola di sempre
   dice che «il viola non esiste». Quella regola riguarda **l'accento della
   UI** — ambra prima, terracotta adesso — e resta valida: nessun bottone,
   nessun testo, nessuna superficie viola.
   Ma le sezioni sono cinque e vogliono cinque pallini distinguibili, e il
   viola è l'unico spazio libero fra il blu dei Viaggi e la terracotta degli
   Eventi. Quindi:
   - il viola esiste **solo** come `--c-guarda`, e **solo** su `.dot`;
   - **mai** su testo, bottoni o superfici — nemmeno nella versione tenue, che
     per la Guarda non esiste (la vecchia `#BFA3E8` è ritirata);
   - il valore è **`#8F7AC0`**, non il `#A47BE0` del mock: quello stava una
     tacca di saturazione sopra le altre quattro famiglie e si faceva notare
     più di quanto un pallino di sezione debba.
   Il mock non si tocca: la differenza vive come sostituzione dichiarata nel
   generatore del foglio (`scratchpad/port-v2-css.mjs`), che la riscrive a ogni
   rigenerazione. La versione corta di questa regola sta in `AGENTS.md`.
   **Nota teal vs Sport**: il teal di sistema `#3DA5C4` va tenuto più
   blu/desaturato del teal-Sport `#3AB8A8`; se in una schermata compaiono
   vicini, lo Sport usa SOLO il pallino di categoria (niente testo tinto).
3. Metadati in grigio `#9BA0A8`, Inter medium — mai bold. Testo primario
   `#F1F4FA`.

3-bis. **E mai in maiuscolo** (12 agosto 2026). `etichettaBattito` scriveva
   «UN MESE FA», «IERI», «DOMANI»: diventano «un mese fa», «ieri», «domani».
   Il maiuscolo faceva due danni. Il primo è di volume — un metadato in
   maiuscolo si legge prima del titolo dell'evento, che è la frase che deve
   arrivare per prima. Il secondo è di voce: Keiko parla piano, e il maiuscolo
   in italiano è un tono, non una convenzione tipografica neutra.
   ⚠️ Cambia il **mock congelato** `docs/mockups/home-v2-final-mock.html`,
   che diceva «Un mese fa · San Siro»: aggiornato lì, con la nota accanto.
   Stessa regola, stesso giorno: `keikoLive.ts` non manda più in maiuscolo la
   data del viaggio («12–14 OTT» → «12–14 ott»).

3-ter. **Un metadato che sembra un obbligo** (12 agosto 2026). Un campo
   mostrato come `—` senza altro segno si legge come una cosa che manca, non
   come una cosa che puoi non dire: nell'Allenamento «Fatica» sembrava
   richiesta e non lo è mai stata. Quando un campo è facoltativo **lo dice
   l'etichetta** («Fatica *facoltativa*», in `--meta`), non il segnaposto.

3-quater. **Gli stati vuoti sono voce, non fatto** (12 agosto 2026). Il titolo
   di `Empty` passa a **Fraunces 500** (`.k2 .empty .t`): «Nessun titolo con
   questi filtri» è una frase che qualcuno ha scritto per il momento in cui non
   c'è niente da mostrare, e nel sistema la voce è Fraunces. Il peso è 500
   perché è quello che Fraunces ha in tutto il foglio; 600 è un peso da Inter.
   La riga sotto resta Inter grigia: quella spiega, e spiegare è un fatto.

3-quinquies. **Una primaria per CONTESTO, anche quando dà fastidio**
   (12 agosto 2026). Il contesto è la schermata **oppure la card**, non lo
   schermo. Due card diverse sono due contesti diversi: nella Home «Inizia»
   sull'allenamento e «Apri» sul battito restano tutt'e due terracotta, ed è
   giusto — nessuno le confronta, perché stanno dentro due riquadri separati
   con due titoli separati. Quello che non si fa è **due primarie dentro lo
   stesso riquadro**, o due sulla stessa schermata quando non c'è un riquadro
   a separarle: lì l'occhio le mette in gara e non sa quale sia l'azione.
   I casi decisi:
   - **Guarda** — la pastiglia del consiglio in fondo alla barra di ricerca era
     terracotta come «Dove vederlo». Passa a superficie neutra `--lv2` con
     l'orca in teal. La correzione vive in `GuardaView`, **non** nel foglio:
     la stessa classe `.go` nella Cucina *è* l'azione (cerca) e lì il
     terracotta è suo di diritto. La regola è della schermata, non della classe.
   - **Sessione di allenamento** — «Esci» era terracotta accanto a «Registra
     serie». Un'uscita non è un'azione: va in `.btn2`. Quando invece il tasto
     dice «Finisci allenamento» resta primario, perché lì conclude davvero.
   - **Scheda di una serie** — «+1 episodio» e «Dove vederlo» sono nello
     **stesso** contesto (un foglio solo, niente riquadri a separarli), e lì
     una deve vincere. Vince quella che riguarda il punto in cui sei: se la
     serie l'hai già cominciata la primaria è **«+1 episodio»**, perché la
     domanda è «a che punto sono»; se non l'hai ancora cominciata è **«Dove
     vederlo»**, perché la domanda è «come lo guardo». L'altra resta e diventa
     `.btn2`: non sparisce mai, cambia solo peso.
   - **Il terracotta è uno solo sotto il testo**: `--acc-btn` `#AB5A3B`, che
     con `#FFF3EC` fa **4,53:1** e passa AA; `--acc` `#C96A45` fa **3,42:1** e
     resta dov'è giusto — dove sopra non c'è scritto niente (il «+», gli aloni,
     i pallini del logo). La `.cta` della Home era l'unico bottone con del
     testo rimasto su `--acc`, e ci scriveva pure il bianco a mano: corretta.
     Nessun terracotta si scrive più in cifre nel codice.
3-sexies. **L'attrito si dosa sul danno** (12 agosto 2026). Le conferme non
   sono tutte uguali, e la differenza non è quanto è «grave» una cosa: è se si
   torna indietro.
   - **Distruttivo reversibile** (togli un titolo dalla lista, elimina una
     ricetta, cancella una serie, butta un promemoria) → **due tocchi**: il
     primo arma e dice cosa succede, il secondo fa. E dev'esserci «Annulla»
     nel toast. Sbagliare costa un secondo.
   - **Irreversibile** — oggi è **una sola cosa**, «cancella tutto» dell'account
     → **si scrive la parola** `CANCELLA`. Due tocchi si danno anche in tasca,
     e questa è l'unica azione dell'app che non si disfa: qui l'attrito è la
     cosa che serve, non un fastidio da limare. La parola è richiesta anche dal
     server (`/api/account/delete` vuole `conferma: "CANCELLA"`), quindi la
     rete di sicurezza è doppia.
   In nessuno dei due casi si usa `window.confirm`: è una finestra del browser,
   non sa niente di noi e non si può vestire. La conferma vive dentro il foglio.

3-septies. **Dalla Home si fa, non si salta** (13 agosto 2026). Toccare una
   card della Home **apre un pannello** con le azioni; la pagina intera è una
   scelta esplicita, in fondo al pannello.
   Il perché: prima ogni card era un salto in un'altra sezione. Per segnare
   l'allenamento fatto — un tocco — se ne facevano quattro, e alla fine eri
   da un'altra parte e avevi perso il posto. La Home è il posto da cui si
   guarda la giornata: se per fare una cosa devi uscirne, non è più quello.
   - **Solo le azioni che il codice sa già fare.** Dove il dato non c'è,
     l'azione non si mette: un tasto che non sa cosa fare è peggio di un tasto
     che non c'è. Oggi ce ne sono due — «segna fatto» dell'allenamento
     (`/api/workout/log`) e «dove vederlo» del titolo (`/api/watch/providers`).
     «Apri la ricetta» manca perché fra il piano della dieta e il ricettario
     non esiste nessun riferimento: nascerà nel blocco 7 di `docs/TODO-KEIKO.md`.
   - **La riga per la pagina intera resta sempre**, ultima e staccata. Il
     pannello non è una prigione.

3-septies-bis. **Il pannello è la cosa singola, la pagina è il contesto**
   (13 agosto 2026, dopo aver provato C1 dal telefono). Il pannello non è un
   menu di azioni con un titolo sopra: è **la scheda della cosa**.
   Il film con la sua trama e i titoli simili sta nel pannello; la tua lista
   intera sta nella pagina. Il pasto con tutte le opzioni della nutrizionista
   sta nel pannello; il piano della settimana sta nella pagina.
   Serve a far smettere «vai alla pagina intera» di essere un ripiego — «qui
   non c'è abbastanza, vattene» — e a farla diventare una scelta con un senso:
   ci vai quando vuoi il **contesto**, non quando vuoi la cosa.
   Due vincoli che vengono con la regola:
   - **solo dati che il codice sa già prendere.** Dove il dato non c'è, la riga
     non c'è, e si segnala: non si inventano campi e non si indovinano
     collegamenti. «Come si cucina» manca perché fra il piano della dieta e il
     ricettario non esiste nessun riferimento, e cercare la ricetta dal testo
     del pasto sarebbe indovinare un legame che nessuno ha stabilito — la
     prima volta che sbaglia, il pannello mente;
   - **il pannello non si svuota mai.** Le chiamate partono insieme e si
     mostrano appena arrivano, ognuna per conto suo: se la trama non risponde
     restano i titoli simili, e viceversa. Durante l'attesa scheletri, mai lo
     spinner.

3-octies. **Le azioni rapide sono il TOCCO LUNGO, non lo swipe**
   (13 agosto 2026). E il motivo è tecnico, non di gusto: **lo scorrimento
   laterale è già del cambio pagina** (`app/template.tsx` lo usa per passare da
   una sezione all'altra). Sulla stessa schermata il telefono dovrebbe
   indovinare, nei primi dieci pixel, se stai scorrendo la card o cambiando
   sezione. Qualunque soglia si scelga, una delle due parte per sbaglio — e
   quella che parte per sbaglio, prima o poi, è «elimina».
   Lo schema è quello che `Poster` ha già nella Guarda, e si copia invece di
   reinventarlo: **450ms**, il movimento oltre **10px annulla** (stai
   scorrendo, non tenendo premuto), il tap normale continua ad aprire quello
   che apriva prima, e il click che il browser manda dopo un tocco lungo si
   soffoca — altrimenti si aprono menu e pannello insieme.
   Nel menu ci vanno solo le azioni **rapide davvero**: «rimanda» non c'è
   perché spostare un evento vuol dire scegliere un'altra data, cioè aprire
   una schermata, e un menu rapido che apre una schermata non è più rapido.

3-nonies. **Una sola entrata per tutti i pannelli** (13 agosto 2026):
   **`.28s cubic-bezier(.22,.9,.3,1)`**, salendo di 26px e sfumando da `.4`.
   È `@keyframes up` del foglio V2, e ce l'hanno tutti i pannelli nuovi perché
   passano tutti dallo stesso componente `Sheet` — non serve `framer-motion`
   per questo, e non si aggiunge una libreria per rifare una riga di CSS.
   I due pannelli rimasti sul guscio v1 (la guida all'installazione e il foglio
   della cattura) erano a `.30s` con un'altra curva, e risalivano da tutta
   l'altezza dello schermo: allineati. Due animazioni **quasi** uguali si
   notano proprio perché sono quasi uguali — sembra che l'app esiti.

3-decies. **Registrare non è prescrivere** (14 agosto 2026, con il registro
   dei pasti). È la distinzione che tiene in piedi tutta la Cucina che annota,
   e va riletta ogni volta che qualcosa lì dentro sembra voler dire se hai
   fatto bene o male.
   - **`diet_plan` è il piano della nutrizionista**, e Keiko non lo scrive e
     non lo modifica (art. 348 c.p.). Nessuna colonna lì dentro può legare una
     ricetta a un pasto: sarebbe Keiko che tocca una prescrizione.
   - **`diet_log` è un fatto su Matteo**, non una prescrizione. Il suo
     `ricetta_id` non dice «questa sostituisce quel pasto», dice «quel giorno
     ho cucinato questa». Registrare quello che è successo non è prescrivere
     quello che deve succedere.

   Due condizioni la rendono sicura, e vanno tenute **tutt'e due**:
   1. **il legame lo crea il dito di Matteo**, mai una deduzione dal testo —
      «Melone 150g» → cerca melone nel ricettario è la scorciatoia ovvia, ed è
      indovinare un legame che nessuno ha stabilito: la prima volta che sbaglia,
      l'app mente;
   2. **niente, in nessun punto dell'app, confronta il registro col piano** —
      nessuna aderenza, nessuna percentuale, nessun ✓ verde contro ✗ rosso,
      nessun «hai seguito il piano al 70%».

   Se una delle due cade, cade anche la distinzione, e si torna dalla parte
   sbagliata del paletto. La versione lunga sta in `docs/sql/cucina-v2.sql` e
   `docs/sql/cucina-registro.sql`, accanto alle tabelle che protegge.

4. Contrasto sugli accenti: testo scuro su teal (`#08191E`); su terracotta
   testo chiaro caldo `#FFF3EC`.
5. **Elevazione a 3 QUOTE**: fondo `#0F0F12` → card `#1A1B20` →
   focus/attivo `#212228`. Ogni superficie ha il **top-highlight**
   `inset 0 1px 0 rgba(255,255,255,.08)` (`.11` sulla quota alta) — la luce
   cade dall'alto, alla Linear. Bordi: `rgba(255,255,255,.05)` quota 1,
   `.07` quota 2, `.09` bottone secondario. NIENTE ombre nere pesanti.
   Raggi a quote: 16 hero → 12 card → 9 foto incassata → 8 chip.
5-bis. **Luci d'ambiente percepibili, non timide** — valori congelati:
   - luce header: radial `rgba(120,130,150,.20)` → trasparente 70%,
     58%×100% at 50% 0%, alta 340px, da −140px
   - alone Oggi: radial teal `rgba(61,165,196,.17)` → trasparente 72%,
     55%×60%, alta 380px, da 150px
   - bagliore hero: radial terracotta `rgba(201,106,69,.15)` → trasparente
     72%, 56%×58%, alta 460px, da 470px
   Zone di luce diverse — mai un unico muro nero. Nessun pattern: solo luce.
5-ter. Foto: incassate nella superficie, `saturate(1.14) contrast(1.03)`,
   gradiente diagonale `rgba(0,0,0,.22)` + vignettatura `rgba(0,0,0,.26)`.
   Il testo su foto sta sempre sopra lo scrim
   (`linear 180°, trasparente 36% → rgba(10,10,13,.92)`).
5-quater. Il pannello «Oggi» è il pannello di comando: quota alta +
   alone colorato morbido sotto (`0 16px 44px rgba(61,165,196,.10)`).
   Le card content stanno DENTRO una superficie: mai foto nude sul fondo.

## Immagini
6. **Foto sempre, gradienti pieni mai**: ogni card-contenuto usa una foto
   reale. Eliminati i gradienti saturi (rosso Allenamento, verde Dieta,
   arancione ricettario).
7. Overlay uniforme: sfumatura scura graduata sotto il testo su OGNI
   immagine, indipendente dalla foto.
8. Badge categoria standardizzati: testo ≥12px, fondo con blur costante
   (`rgba(16,16,19,.6)` + blur 10px), contrasto garantito, UN solo stile.

## Tipografia
9. **A ruoli**: Fraunces = voce (titoli, saluti, domande); Inter = fatti
   (dati, etichette, quantità). Pesi caricati: Fraunces 500/600,
   Inter 500/600 (400 e 700 non si usano).
10. Fraunces più grande e arioso sui titoli-momento (hero); peso ridotto se
    serve eleganza. Scala congelata: 22px/500 (saluto, titolo hero) ·
    18px/600 (logo) · 16.5px/500 (titolo card wide).
11. Label di servizio depotenziate: in grigio, peso medium, possibilmente
    non-maiuscolo. Mai in colore-accento (né teal né terracotta): le label
    restano grigie.
12. Scala e allineamenti: spaziatura a multipli di 4/8 ovunque; ≥24px sopra
    ogni titolo di sezione. ⚠ Il mock congelato usa anche valori intermedi
    (7/9/10/11/13/18px): in fase token si normalizza alla griglia 4/8 SENZA
    stravolgere le proporzioni percepite del mock.

## Forme
13. **Sistema unico**: card squadrate-morbide con radius a sistema —
    16 hero, 12 content card, 9 foto incassata, 8 chip/badge.
14. Pill SOLO per chip/badge/toggle (giorni-settimana, badge contesto).
    Cerchio SOLO per avatar e FAB. Basta mix casuale.

## Card
15. **Due tipi soli**: Feature (immersiva, foto piena 16:9, testo dentro
    con overlay) e Content (thumbnail/poster, testo FUORI). Varianti
    Content ammesse: verticale (griglia 2 col, foto 16:10), orizzontale
    «wide» (foto 100px a sinistra), «riprendi» (240px, foto 74px +
    progresso + bottone secondario).
15-bis. **Variante «poster»** — ammessa il 9 agosto per Guarda, con motivo
    scritto: la locandina è il linguaggio della sezione e due colonne
    dimezzerebbero la densità. Rapporto **2:3**, griglia a **tre colonne**,
    radius 12, **un solo badge** in alto a sinistra, titolo Inter 12,5px
    FUORI dalla foto troncato a una riga, metadato grigio opzionale sotto.
    Vale anche per la mensola «Riprendi» della Home. Audit e regole in
    `docs/UI-GUARDA-AUDIT.md`. **È l'unica eccezione ammessa**: nessun altro
    formato nuovo senza un motivo scritto qui.
16. Card piccole alleggerite: max immagine + titolo + 1 dato. Badge,
    progressi ed extra vivono nel dettaglio.
17. Trattamento unico per i nudge/consigli: UN componente-suggerimento
    ripetibile (icona + testo, superficie a sistema), via i banner una tantum.

## Layout
18. **Un solo carosello: la mensola «Riprendi»** (scroll orizzontale con
    snap, subito sotto il pannello Oggi — riprende film a metà, workout,
    ricette in corso). Tutto il resto griglia 2 colonne o lista.
19. Bento a taglie fisse: Large / Wide / Small agganciate a griglia; la
    taglia riflette l'importanza del contenuto.
20. Sezioni flat con ritmo tipografico: niente contenitori-cartella; blocchi
    separati da spazio e gerarchia.

## Componenti
21. **Un solo set di icone-linea monocromatiche** (stroke 1.8, coerenti con
    la tab bar). Le emoji SPARISCONO dall'UI strutturale (categorie, pasti).
22. Gerarchia bottoni: primario (terracotta `#C96A45`, testo chiaro caldo
    `#FFF3EC`) · secondario (superficie quota 2 + outline
    `rgba(255,255,255,.09)`) · terziario (solo testo, teal-soft se è
    un'azione). ⚠ Contrasto primario: vedi punto 26.
23. Indicatori di progresso forti: riempimento vero teal per «fatto vs da
    fare» (barra 4px, fondo `rgba(255,255,255,.07)`), non solo outline.
24. Header leggero: logotipo «keiko» MONOCROMATICO crema `#F2EDE4`; l'orca
    teal `#3DA5C4` con micro-dettaglio terracotta sullo spruzzo (unico punto
    caldo del brand). Mai la parola bicolore. Search «Chiedi a Keiko» come
    elemento primario (bordo teal `rgba(61,165,196,.45)` + anello
    `rgba(61,165,196,.07)`); avatar allineato.
24-bis. Tab bar: fissa in basso, `rgba(15,15,18,.92)` + blur 20px,
    border-top highlight, padding 9px sopra + safe-area sotto; icone 20px,
    label 9.5px; attiva in teal-soft; FAB terracotta 50px al centro.
    Il contenuto riserva `calc(86px + safe-area)` di padding-bottom.

## Contenuti
25. Contenuti reali o empty state progettati: via i placeholder ripetuti
    (i 6 giorni identici in Dieta) e i troncamenti brutali.

## Qualità (aggiunti al congelamento)
26. **Contrasto**: ogni testo ≥4.5:1 sul proprio fondo (WCAG AA). Verificati
    al congelamento: metadati `#9BA0A8` su quota alta `#212228` = 6.0 ✓;
    su card `#1A1B20` = 6.5 ✓; testo su teal = 6.3 ✓; tinte-categoria ≥7.9 ✓.
    ⚠ ECCEZIONE APERTA: `#FFF3EC` su terracotta `#C96A45` = 3.4:1 — sotto
    soglia a 12px. Da decidere con Matteo (opzioni: testo più grande/scuro,
    o terracotta leggermente più scura per i bottoni). Non toccare il mock
    fino alla decisione.
27. **Stati**: ogni componente interattivo definisce riposo /
    hover-pressed / disabled; ogni lista definisce lo stato vuoto (nel mock:
    «Tutto fatto per oggi» del pannello Oggi è il modello). Gli stati
    mancanti si definiscono in fase token/componenti, dentro il sistema
    (quota +1 al pressed, opacità .45 al disabled — da confermare lì).
