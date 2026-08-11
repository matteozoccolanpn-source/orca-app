# KEIKO — ALLENAMENTO V2 · i due prompt finali

> Riferimento visivo: `docs/mockups/allenamento-v2-final-mock.html`
> Gemelli già bloccati: `docs/mockups/cucina-v2-mock.html` + `docs/UI-CUCINA-LOCKED.md`,
> Home in `docs/mockups/home-v2-final-mock.html`, manifesto in `docs/UI-DECISIONI-V2.md`.

---

## A · PROMPT FINALE (consolidato) — per rigenerare la sezione da zero

Crea UN UNICO mock statico interattivo della sezione ALLENAMENTO di Keiko (React + Tailwind), in KEIKO UI V2, gemello coerente della Cucina già bloccata. È un Artifact unico navigabile: una pagina principale scrollabile più sotto-viste raggiungibili da azioni. Consegna SOLO l'Artifact visivo e interattivo, senza spiegazioni attorno.

**DESIGN SYSTEM (invariabile).** Teal `#3DA5C4` colore di sistema; terracotta `#C96A45` SOLO per FAB e azioni primarie («Allenati ora», «Aggiorna scheda», «Fatto → prossimo», «Salva com'è andata») e per lo stato selezionato dei chip sensazione; radius 16/12/9/8; spaziatura 4/8; Fraunces per i titoli, Inter per i fatti; metadati grigi `#9BA0A8`, mai bold né maiuscoli; zero emoji; tab bar fissa con FAB terracotta e «Allenamento» attivo; contrasto ≥4,5:1 ovunque, con gradiente scuro sotto ogni testo su foto; ≥32px sopra ogni titolo di sezione; un solo carosello per schermata. Riuso REALE dei componenti Cucina: header hero, riga-elemento accordion, card-giorno a mezza foto, card ricetta media, card «piano/scheda», riga-azione con icona.

**REGOLE TRASVERSALI OBBLIGATORIE.**
- ZERO numeri nutrizionali: niente calorie, niente proteine, niente macro, in nessun punto.
- Italiano ovunque, un solo registro: mai «post-workout», «warm-up» e simili.
- Nessuna barra sticky di titolo o progresso durante lo scroll: l'identità vive solo nell'hero. Le sotto-viste hanno solo il proprio header con «<».
- Tab bar e FAB non coprono mai l'ultima card: padding-bottom adeguato su ogni schermata.
- Tassonomia metadati uniforme: `momento · tipo · stato`, mai registri diversi nella stessa riga.
- Terracotta solo per primarie e FAB.
- Dati mock internamente coerenti fra teaser, settimana, andamenti e timeline.
- Una sola informazione in un solo posto: nessun dato ripetuto in più blocchi.
- **Fonte unica degli esercizi**: gli esercizi del giorno vivono una sola volta, nella lista-accordion sotto l'hero. È l'unica lista interattiva. La card «oggi» della settimana mostra solo il riassunto in sola lettura, senza checkbox né controlli.
- Niente numeroni da cruscotto: le statistiche non si presentano come tre cifre giganti.

**PAGINA PRINCIPALE (scroll, in quest'ordine).**

1. **Hero, unica identità della pagina.** Nessun titolo di pagina sopra, nessuna riga «Domenica · scheda rientro». Dentro l'hero: label teal `oggi · domenica`; titolo Fraunces «Corsa Recovery + Nuoto» su gradiente scuro; una riga di sottotitolo troncata («corsa 5 km · nuoto 800 m · +2»); progresso come badge teal ad alto contrasto («0 di 4») più una barra sottile; «Allenati ora» primaria terracotta con glow sobrio e «Fatto oggi» secondaria neutra. Un solo titolo forte per viewport.
2. **Callout coach**, breve e sommesso: solo il consiglio di rientro, senza il numero di giorni di stop.
3. **Lista esercizi**, accordion identico alla riga-pasto della Cucina. A sinistra solo la checkbox teal circolare; fatto resta visibile e barrato. Tap espande i chip (ritmo, durata, zona) più la nota del coach; chevron; il prossimo è aperto di default sempre al caricamento; foto solo sull'esercizio hero. Azioni dentro la riga in teal testuale («Allenati ora», «sposta a domani»), mai terracotta. In fondo «+ Aggiungi esercizio fuori scheda». Quando tutto è spuntato compare la riga «Scheda completa».
4. **Un solo blocco cibo**, «Intorno all'allenamento · dal tuo piano»: «Stasera hai [attività coerente con l'hero]. Nel tuo piano, intorno alla vasca:» più due voci reali, `prima` e `dopo`, ognuna linkata alla Cucina con chevron e senza alcun dato nutrizionale. Se la dieta ha indicazioni pre/post, callout teal. La card ricetta grande è un fallback interno sotto l'etichetta «se stasera salti il piano», con badge in italiano («dopo l'allenamento»).
5. **La settimana**, stesso componente card-giorno della Cucina: mezza foto a destra ben esposta, giorno «oggi» in hero con overlay che garantisce il contrasto, «N voci · dettaglio», chevron, espansione. Card di altezza uniforme, riposo attivo compreso. La card «oggi» espansa mostra solo il riassunto in sola lettura, coerente con la lista sopra, più «Sposta questo allenamento» che apre lo scambio fra due giorni.
6. **A che punto sei**, teaser di andamento e non di volume: una frase breve che dice come stanno andando le prestazioni, una riga di contesto grigia, tre chip-tendenza compatti (corsa 6:00/km ↓, nuoto 1.000 m ↑, squat 52 kg ↑) e sotto la riga «Ultimo allenamento · data · dettaglio» con chevron. Niente cifre giganti. Tap sull'intero blocco apre la sotto-vista.
7. **Programmi · quelli che segui dalla Home**: card «Maratona di Milano · settimana 3 di 16 · prossimo obiettivo lungo 18 km, domenica 17» con barra teal; stato vuoto progettato; chip «Programmi suggeriti · in arrivo» chiaramente disabilitato, senza falsa affordance.
8. **La tua scheda**: «Scheda rientro · agosto», «Aggiorna scheda» primaria terracotta più «Modifica giorno» secondaria, «gestisci» che apre la Gestione. La card è interamente visibile sopra la tab bar.

**SOTTO-VISTA «Allenati ora».** Schermo pieno, un esercizio alla volta. Header con «×», nome dell'esercizio, «esercizio 1 di 4 · scheda rientro» e barra teal. Esercizio corrente grande con foto evocativa (più alta quando non ci sono serie da spuntare), chip distanza/ritmo/zona, «l'ultima volta: …», nota del coach, anteprima «poi: Nuoto 800 m». In fondo, barra fissa: «Fatto → prossimo» primaria terracotta, «salta» terziaria, freccia indietro. Per forza, nuoto e mobilità: registrazione serie per serie con checkbox teal e timer di recupero che parte da solo e si può saltare. Alla fine schermata «Allenamento finito» con riepilogo semplice (voci completate, durata, nessun dato nutrizionale), l'elenco di cosa hai fatto e il link al pasto dal blocco cibo.

**SOTTO-VISTA «Fatto oggi / Com'è andata?».** Pannello che sale dal basso, immersivo e caldo: testata con foto del giorno e alone terracotta, kicker arancio, titolo Fraunces «Com'è andata?». Copy sommesso: «Quello che scrivi qui Keiko se lo ricorda: la prossima volta te lo rimette davanti. Se non hai voglia, salta e basta». Campi contestuali al tipo di allenamento — corsa: distanza e passo; nuoto: metri e tempo; forza: carichi e serie; core: giri fatti davvero con checkbox teal. Stepper «− valore +» con tap target da 40px, buon contrasto e unità leggibili. In fondo i chip «sensazione» (facile / giusto / duro) con lo stato selezionato in terracotta, e la primaria terracotta «Salva com'è andata» a tutta larghezza più «per ora no». Salvando si aggiornano la lista esercizi, «Ultimo allenamento» e i chip-tendenza di «A che punto sei».

**SOTTO-VISTA «A che punto sei».** Header proprio con «<», nessuna barra di progresso sovrapposta. In cima: ultimo allenamento e prossimo obiettivo preso dal programma. Poi una frase sommessa che inquadra il momento. Quindi una sezione per disciplina — Corsa (andamento del passo, «da 6:20 a 6:00 /km», distanza tipica), Nuoto («da 600 a 1.000 m», ritmo per cento metri), Forza (carichi dei lift principali, «squat da 40 a 52 kg») — ognuna con la spiegazione a parole, una micro-linea di tendenza semplice accanto e la riga «prima → ora» con il delta in pill. Teal quando c'è progresso, grigio quando è stabile, mai un giudizio negativo. Niente istogrammi di volume, niente heatmap di costanza, niente frequenza media. Le discipline con pochi dati hanno il proprio stato «in arrivo» progettato.

**SOTTO-VISTA «Gestione scheda».** Card documento «Scheda_rientro.pdf · dal preparatore · Keiko la trascrive e la ricorda, non la scrive» con «Apri». Lista: Carica una nuova scheda, Modifica giorno, Sposta allenamento. «Elimina scheda» in fondo, terziaria grigia, con conferma a doppio tocco.

Tutte le sotto-viste riusano lo stile Cucina e tornano alla pagina principale. La schermata dev'essere immersiva e viva come la Cucina, mai una checklist su fondo grigio piatto.

---

## B · PROMPT DI PERFEZIONAMENTO — l'ultimo giro prima di bloccare

Parti da `docs/mockups/allenamento-v2-final-mock.html` senza rimettere in discussione struttura, gerarchia o contenuti: qui si lavora solo di rifinitura. Non aggiungere sezioni, non rinominare nulla, non reintrodurre grafici o numeroni. Applica questi punti e restituisci lo stesso Artifact aggiornato.

**Movimento e feedback**
1. La spunta dell'esercizio si *disegna* come nella Cucina (stroke-dashoffset animato), non appare di colpo; contemporaneamente la barra dell'hero si riempie con transizione.
2. Spuntando un esercizio si apre da solo il successivo, con l'espansione animata; l'ultimo spuntato porta alla riga «Scheda completa» che entra in dissolvenza.
3. Ogni azione che oggi mostra un toast ha un testo che dice cosa è successo, mai cosa farà Keiko: «Spostato a lunedì 11», non «Ok, lo sposto».
4. Il timer di recupero, quando arriva a zero, non sparisce e basta: lascia mezzo secondo di stato «vai» prima di chiudersi.

**Stati mancanti**
5. Definisci per ogni componente interattivo riposo, premuto e disabilitato: al premuto la superficie sale di una quota, al disabilitato opacità .45. Vale per righe, chip, card-giorno, bottoni.
6. Aggiungi lo stato vuoto progettato «Nessuna scheda caricata» per la sezione «La tua scheda» (con «Carica la tua scheda» primaria) e lo stato «Oggi non c'è allenamento» per l'hero, coerente con il riposo attivo del mercoledì.
7. Stato di caricamento con l'orca monocromatica nuova, mai il vecchio logo ambra.

**Griglia, contrasto, tocco**
8. Normalizza le spaziature intermedie alla griglia 4/8 senza cambiare le proporzioni percepite; verifica che sopra ogni titolo di sezione restino almeno 32px anche dopo la normalizzazione.
9. Verifica il contrasto di ogni testo su foto (hero, card «oggi», fallback cibo, testata del pannello «Com'è andata?») e alza il gradiente dove serve per stare sopra 4,5:1.
10. Risolvi l'eccezione aperta nel manifesto: `#FFF3EC` su terracotta `#C96A45` sta a 3,4:1. Proponi due varianti a confronto nello stesso Artifact — terracotta leggermente più scura per i bottoni, oppure testo del bottone a 14px semibold — e lascia attiva quella che regge meglio.
11. Ogni bersaglio tattile arriva ad almeno 44×44px: chevron di riga, checkbox, «×» dell'esecuzione, stepper del pannello.

**Copy**
12. Passata finale sui testi: nessun anglicismo residuo, nessun imperativo secco, nessun giudizio sulle prestazioni. Le note del coach restano consigli, mai valutazioni.
13. I metadati non ripetono mai l'informazione già presente nel titolo della riga.

**Coerenza con il resto dell'app**
14. La card «Allenamento» della Home apre questa sezione sullo stesso giorno: verifica che titolo, sottotitolo e progresso combacino con l'hero.
15. Le voci del blocco cibo puntano ai pasti reali del «Menu di oggi» della Cucina: stessi nomi, stesso ordine.
16. Il programma «Maratona di Milano» mostra lo stesso obiettivo che appare nella Home e in «A che punto sei».

**Navigazione**
17. Tornando da una sotto-vista si rientra nella posizione di scroll da cui si era usciti, non in cima.
18. Le sotto-viste si chiudono anche con lo swipe da sinistra; il pannello «Com'è andata?» si chiude trascinandolo giù.

Alla fine dichiara, in fondo alla risposta e in tre righe, quali punti hai applicato e quali hai lasciato aperti con il perché.
