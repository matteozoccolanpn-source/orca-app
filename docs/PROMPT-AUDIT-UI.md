# Prompt per Claude in Chrome — Audit UX/UI totale di Keiko

> **Come usarlo (domani):** apri l'app **loggato** in Chrome (l'URL di anteprima `redesign`, quello con le tue modifiche). Poi apri Claude in Chrome e **incolla TUTTO il testo sotto la riga**. Alla fine, copia il report che produce e rimandamelo qui: lo uso per rifare la UI.

---

Sei un **senior product designer e UX researcher** di altissimo livello (pensa: Apple, Linear, Airbnb). Il tuo compito è fare un **audit UX/UI totale e spietato** di questa web-app (una PWA chiamata **Keiko / OrCa**: un "calendario della vita" che trasforma screenshot e testo in eventi, e gestisce dieta, allenamento, viaggi, cose da guardare). Sono già loggato. L'obiettivo è **ripensare da zero** l'esperienza: mi serve una fotografia esaustiva e brutalmente onesta di tutto ciò che si vede e si usa.

## Regole di lavoro
- **Naviga OGNI schermata e OGNI flusso.** Non fermarti alla home. Entra in ogni sezione, apri ogni pannello, prova ogni bottone.
- **Fai uno screenshot di ogni schermata e di ogni stato** (normale, aperto, espanso, vuoto, caricamento, errore, successo).
- **Clicca e prova davvero le interazioni** (tap, swipe, apertura/chiusura, form, navigazione, tasto indietro). Descrivi cosa succede *realmente*, non cosa dovrebbe succedere.
- **Sii SPIETATO e specifico.** Non essere gentile. Ogni cosa brutta, incoerente, confusa, lenta, ambigua o "da prototipo" va segnalata, con il *perché* e *dove* (nome schermata + elemento). Niente giudizi vaghi tipo "si può migliorare": dì *cosa* e *come*.
- Quando possibile, riporta **valori concreti**: colori (hex/rgb se visibili), font e dimensioni, spaziature, raggi, dimensioni tocco. Usa gli strumenti a disposizione (ispezione pagina) se servono.
- **Non modificare nulla** e **non creare/eliminare dati veri** (non salvare eventi finti, non cancellare roba mia). Puoi aprire pannelli e digitare, ma annulla senza salvare dove possibile.

## Schermate e flussi da coprire (tutti)
1. **Home** — barra in alto (logo, ricerca "Chiedi a Keiko", calendario, profilo), striscia settimana, saluto/kicker, card eventi (hero + "in arrivo"), sezioni (Dieta oggi, Allenamento oggi, Da guardare, Prossimi eventi/Plot), FAB "+".
2. **Chiedi a Keiko** (la lente/barra ricerca) — scrivi una domanda ("che allenamento ho oggi?"), guarda la risposta AI, i "collegamenti", lo stato vuoto ("I tuoi prossimi"), il caricamento.
3. **Pannello evento** (tocca una card evento) — layout, contenuti, azioni (Maps, Sposta/Modifica, Elimina), la sezione "Trovato da Keiko" coi link (aprila/chiudila), il form di modifica.
4. **Aggiungi evento** (il "+") — tab foto/testo, drop-zone, analisi, conferma, stati di caricamento/successo/errore.
5. **Pannello giorno** (tocca un giorno nella settimana) — eventi + to-do, spunta/stella/elimina, swipe, aggiunta to-do.
6. **Dieta / Salute** — hero, pasti di oggi, scambia pasto, prossimi giorni, upload, elimina.
7. **Allenamento** — hero + anello progressi, "Fatto oggi", esercizi (spunta), carosello settimana (ora cliccabile), "Modifica" (sposta giorno / esercizi), gestione scheda.
8. **Viaggio** — itinerario, tappe, azioni, stato vuoto.
9. **Guarda** — hero "stasera", griglia film (copertine), aggiungi/consiglio, visto/elimina.
10. **Profilo** (icona utente) — nome, logout.
11. **Login** (se riesci a raggiungerlo/vederlo) — wordmark, accesso.

## Per OGNI schermata, riporta:
- **Screenshot** (allegato o descritto).
- **Struttura e layout**: cosa c'è, come è disposto, cosa domina, cosa si perde.
- **Gerarchia visiva**: si capisce al volo cosa conta? Cosa attira l'occhio (e cosa dovrebbe)?
- **Design**: colori (hex/rgb), font e pesi, dimensioni testo, spaziature, raggi, ombre, icone. Coerente col resto o no?
- **Ogni elemento**: bottoni, card, input, chip, icone, immagini — descrizione + stato + se funzionano.
- **Microcopy**: trascrivi i testi esatti. Sono chiari? Tono coerente? Errori/refusi?
- **Stati**: come appare vuoto / in caricamento / in errore / dopo un'azione.
- **Interazioni testate**: cosa hai toccato e cosa è successo (con tempi se lento).
- **Problemi** (elenco spietato): rotto / confuso / incoerente / brutto / lento / ambiguo / "da prototipo" / tasti che non fanno nulla.
- **Cosa manca** che un utente si aspetterebbe.
- **Voto 1-10** + i **3 problemi peggiori** di quella schermata.

## Valutazione trasversale (tutta l'app)
- **Coerenza design**: colori/font/spazi/componenti sono uno stile unico o un patchwork?
- **Navigazione**: come ci si muove tra le sezioni? È chiara? Ci si perde? Serve il tasto indietro di continuo?
- **Prima impressione** e **carico cognitivo**: un nuovo utente capisce cosa fa l'app e come si usa?
- **Tono di voce e personalità**: l'app ha un carattere o è anonima?
- **Accessibilità**: contrasti, dimensioni tocco (≥44px), leggibilità.
- **Performance percepita**: cosa risulta lento o scattoso.
- **Tasti morti / promesse a vuoto**: qualsiasi cosa che sembra cliccabile ma non fa nulla.
- **Immagini/estetica**: le card hanno foto vere o sono piatte? L'app è "immersiva" o spenta?

## Output finale (formato)
1. **Sintesi esecutiva** (10 righe): che impressione dà l'app oggi, e i 5 problemi più gravi in assoluto.
2. **Report per schermata** (una sezione per ognuna, con lo schema sopra).
3. **Problemi globali** raggruppati per tema (design system, navigazione, copy, immagini, performance, tasti morti…).
4. **Raccomandazioni per un redesign totale**, prioritizzate: cosa **tenere**, cosa **buttare**, e una **direzione visiva** proposta (mood, colori, font, stile card) con riferimenti/benchmark se te ne vengono.
5. **Top 20 interventi** in ordine di impatto/sforzo per trasformare l'esperienza.

Sii esaustivo: meglio troppo che troppo poco. Voglio ogni dettaglio, anche scomodo.
