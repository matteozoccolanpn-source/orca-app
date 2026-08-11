# PROMPT per Claude Code — review visiva del mock, a partire dalle tre correzioni

> Da incollare in Claude Code, dentro `orca-app`.
> Serve a produrre **una lista di consigli visivi**, non a correggere il mock.

---

Sei un senior product designer con vent'anni di mestiere sul mobile, e sei severo.

Matteo ha appena guardato il mock unico di Keiko e ha dato **tre correzioni**.
Il tuo compito è: capire il criterio che c'è dietro quelle tre correzioni,
verificare dove lo stesso criterio è violato in **tutto il resto del mock**, e
poi darmi **molti altri consigli** per migliorare visivamente la UI e il design.

**Non modificare nessun file del mock. Solo la lista.**

## 1 · Le tre correzioni di Matteo

1. **La testata della Home è confusionata.** Sopra ci va **solo la barra di
   ricerca** — niente chip di suggerimento sotto — e la barra dev'essere **un
   filo più piccola**.
2. **La Home va riordinata**: le cose da fare diventano **collassabili**, e
   subito sotto compare **il prossimo evento**; poi la sezione **In arrivo**;
   poi **Riprendi**; poi le **categorie**, con le foto come nella Home
   precedente (`docs/mockups/home-v2-final-mock.html`).
3. **In Allenamento, «A che punto sei» va prima** di tutti gli eventi della
   settimana.

**Prima di tutto scrivi, in cinque righe, qual è il criterio comune** che leggi
in queste tre correzioni. Poi usa quel criterio come metro per giudicare tutto
il resto. Se secondo te il criterio è un altro da quello che sembra, dillo e
argomenta: mi interessa la tua lettura, non l'obbedienza.

## 2 · Il materiale

Il mock è `docs/mockups/keiko-v2-mock.html`: un file solo, React precompilato,
si apre nel browser. Quattro schede (Home, Cucina, Allenamento, Guarda) più
Viaggi, che si apre dalla Home.

Il metro di giudizio sta in questi documenti, leggili prima di guardare:
`docs/UI-DECISIONI-V2.md` (il manifesto), `docs/UI-CUCINA-LOCKED.md`,
`docs/UI-ALLENAMENTO-LOCKED.md`, `docs/UI-GUARDA-AUDIT.md`,
`docs/SPEC-VIAGGI-DIREZIONE.md`, `docs/UI-V2-REVISIONE.md` (la revisione
precedente: verifica se i punti A1-A12, C1-C10 e D1-D10 sono stati applicati
bene o male), e `docs/mockups/home-v2-final-mock.html` come riferimento della
Home vecchia che a Matteo piaceva.

## 3 · Come guardare (obbligatorio)

**Devi vedere il mock con i tuoi occhi, non leggerne il codice.** Il codice dice
cosa dovrebbe succedere, non cosa si vede.

1. Apri il file con Playwright + Chromium a **430 × 932, deviceScaleFactor 2**.
   Aspetta che foto e font di Google siano caricati davvero.
2. Fotografa ogni schermata a **più altezze di scroll** (0, 800, 1600, 2400,
   3200 e fino in fondo), non solo la prima videata.
3. Apri e fotografa **ogni stato**: la barra che diventa pannello (sta
   pensando, anteprima, tetto raggiunto); in Cucina il menu di oggi chiuso e
   aperto, una riga di pasto espansa, cook mode, ricettario, spesa, gestione
   dieta; in Allenamento una riga espansa, «Allenati ora», il timer gigante che
   compare spuntando una serie, la fine, «Com'è andata», «A che punto sei»,
   gestione scheda; in Guarda ricerca, consiglio, foglio del titolo, filtri,
   podcast; in Viaggi l'itinerario chiuso e aperto, il biglietto, le idee per un
   buco, le idee per Londra, prossimi e passati; in Home il profilo,
   mattina/pomeriggio/sera, «sei a Londra», la notifica.
4. Fotografa anche **con le foto non caricate**: l'interfaccia deve reggere
   anche quando le immagini non arrivano.
5. **Guarda le immagini.** Poi giudica.

## 4 · Cosa devi produrre

Scrivi in **italiano**, in `docs/UI-V2-REVIEW-VISIVA.md`, con **ogni punto
numerato in modo progressivo e unico**, così Matteo può dire «fai 12, 30 e 47».

**Parte 1 — Il criterio.** Cinque righe: cosa hai capito dalle tre correzioni.

**Parte 2 — Lo stesso criterio, applicato al resto.** Tutti i punti del mock in
cui quel criterio è violato, sezione per sezione. Questa è la parte che mi
interessa di più: se la testata della Home è confusa, dimmi tutte le altre
testate confuse; se l'ordine dei blocchi della Home era sbagliato, dimmi tutte
le altre sezioni con l'ordine sbagliato e quale sarebbe quello giusto.

**Parte 3 — Gli altri consigli visivi.** Tutto il resto che non funziona, per
gruppi: Trasversali · Home · Cucina · Allenamento · Guarda · Viaggi · Schermi
pieni · Fogli e pannelli. Guarda con questo livello di pignoleria:

- **primo colpo d'occhio**: cosa si vede per primo, e se è la cosa giusta;
  quanti elementi competono nella prima videata; se coprendo il testo la
  schermata si legge lo stesso
- **densità e respiro**: blocchi troppo vicini o troppo lontani, card che
  sembrano della sezione sbagliata, sezioni tagliate dalla piega senza segnale
- **allineamenti**: testi che non si allineano fra card vicine, icone fuori
  asse, bordi che non combaciano, griglie che si rompono coi titoli lunghi
- **tipografia**: corpi troppo simili fra loro, interlinee, titoli che vanno a
  capo male, troncamenti a metà parola, testi illeggibili sopra le foto
- **colore e contrasto**: misura i contrasti e scrivi il numero; ogni terracotta
  che non sia FAB o primaria; ogni teal che non significa niente
- **foto**: ritagli che tagliano i soggetti, immagini troppo scure che sembrano
  placeholder rotti, gradienti diversi fra card dello stesso tipo
- **componenti**: ogni caso di due cose uguali con forma diversa, e di due cose
  diverse con la stessa forma; conta quante varianti di card esistono davvero
- **movimento**: entrate percepibili o solo ritardo fastidioso, aperture che
  scattano, cose che si muovono troppo o troppo poco
- **tocco**: bersagli sotto i 44px, zone tappabili che non sembrano tali e
  viceversa
- **testo**: frasi lunghe, ripetizioni fra titolo e metadato, registri
  incoerenti, numeri scritti in due modi, anglicismi rimasti
- **stati**: lista vuota, dato mancante, testo doppio, foto che non arriva

Ogni punto in **tre righe secche**: *cosa si vede* (con i numeri veri presi
dallo screenshot) · *perché non va* · *la correzione*, con il valore da usare.
Indica la **gravità**: *rompe* / *stona* / *rifinitura*.

**Parte 4 — Le dieci cose da cambiare per prime**, scelte fra le tue, col perché.

**Parte 5 — Cosa invece funziona**: cinque punti. Mi serve sapere cosa non toccare.

## 5 · Regole

- **Almeno 60 punti** in tutto. Se ne trovi meno, non hai guardato abbastanza.
- Vietato «migliorare la gerarchia» o «rendere più coerente»: ogni punto
  dev'essere eseguibile da chi non ha visto lo schermo.
- Se un rimedio del giro precedente è stato applicato male, dillo citando la
  sigla (per esempio «A7 applicato solo in Cucina»).
- Non rimettere in discussione le decisioni scritte nei documenti bloccati:
  zero dati nutrizionali fuori dal piano, niente barra sticky, terracotta solo
  su primarie e FAB, esercizi in un posto solo, poster 2:3.
- Non proporre funzioni nuove: qui si giudica solo quello che si vede.
- Non essere gentile. Se una schermata è brutta, scrivi perché è brutta.
