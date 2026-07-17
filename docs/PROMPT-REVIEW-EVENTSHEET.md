# Prompt per Claude in Chrome — Review del pannello dettaglio evento (il "tap")

> **Come usarlo:** apri `…/ds-preview` in Chrome (nessun login). **Tocca la card evento in alto ("Ultimo — Stadio San Siro")**: si apre dal basso un pannello di dettaglio. Poi apri Claude in Chrome su quella scheda e **incolla tutto il testo sotto la riga**. Rimandami qui il report.

---

Sei un **principal product & visual designer** di livello assoluto (Apple, Linear, Airbnb, Things), spietato e concreto. Nella pagina c'è la Home di **Keiko** (app "calendario della vita"): toccando una card evento si apre dal basso un **pannello di dettaglio (bottom-sheet)**. Devo capire perché **non convince** e come renderlo eccellente. Valuta **solo quel pannello di dettaglio**, non la home dietro.

## ⚠️ PREMESSA
La foto in alto nel pannello ora è un **gradiente con una grande emoji** (placeholder). In produzione sarà una **FOTO REALE** del luogo/evento. Quindi **non giudicare il gradiente/emoji**: immagina una foto vera e valuta struttura, contenuto, gerarchia, proporzioni, rifinitura. I dati sono d'esempio (non c'è arricchimento AI, quindi la sezione link mostra un placeholder testuale).

## Cosa analizzare
### A. Contenuto — cosa mostra e cosa MANCA (il punto più importante)
Un pannello dettaglio evento di un'app seria cosa dovrebbe avere? Elenca **tutto ciò che manca** qui:
- biglietto / QR / codice prenotazione, "aggiungi al calendario" (.ics), promemoria/notifica, **condividi**, **modifica**, **elimina**, note personali, anteprima mappa, meteo, "come arrivare / a che ora uscire", persone coinvolte, allegati.
Oggi il pannello ha: foto+titolo+orario+luogo, un bottone "Apri in Maps", una sezione "Trovato da Keiko" (link). Cosa aggiungeresti e in che ordine di priorità?

### B. Struttura e gerarchia
- L'ordine delle informazioni è giusto? Cosa dovrebbe stare più in alto / più in evidenza?
- Il titolo, l'orario (ambra), il luogo: gerarchia chiara?
- La sezione link "Trovato da Keiko" è ben posizionata e comprensibile?

### C. Layout e proporzioni
- Altezza della foto/hero del pannello: giusta? Il pannello parte dal basso e copre quanto? Dovrebbe essere più corto/alto?
- Il bottone "Apri in Maps" (ambra pieno, largo): proporzione e posizione giuste? È l'azione più importante o no?
- Padding, spaziature, margini interni: coerenti?
- Il tasto **✕** di chiusura (in alto a destra sulla foto): visibile? ben posizionato? Serve anche una "maniglia" (grab handle) in cima?

### D. Rifinitura e dettagli
- Angoli superiori arrotondati del sheet, ombra/elevazione, hairline, scrim sul testo sopra la foto.
- Micro-interazioni implicite (drag-to-dismiss, backdrop).
- Coerenza col design della home (stesso linguaggio card, ambra, tipografia).

### E. Prima impressione
- A colpo d'occhio sembra un pannello **utile e finito** o **spoglio/prototipo**? Cosa lo fa sembrare l'uno o l'altro?

## Output
1. **Verdetto in 5 righe** + voti: **contenuto/utilità /10**, **design/rifinitura /10**.
2. **Cosa MANCA (contenuto/azioni)** — lista prioritaria di ciò che aggiungeresti (biglietto, calendario, promemoria, condividi, modifica, ecc.).
3. **Migliorie di layout/design** con **valori esatti** (altezza foto, padding, dimensione bottoni, radius, gerarchia testo).
4. **Top 6 interventi** per farlo passare da "spoglio" a "pannello di un'app seria".

Sii concreto e numerico. Ricorda: la **foto ci sarà** — giudica contenuto, struttura e rifinitura.
