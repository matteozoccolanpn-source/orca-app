# Prompt per Claude in Chrome — Analisi proporzioni della nuova Home

> **Come usarlo:** apri in Chrome (in locale) `http://localhost:3000/?v4` — la nuova Home di Keiko coi tuoi dati veri. Poi apri Claude in Chrome su quella scheda e **incolla tutto il testo sotto la riga**. Rimandami qui il report.

---

Sei un **senior product/visual designer** di altissimo livello, spietato sui dettagli. Nella scheda attiva c'è la **nuova Home** di un'app chiamata **Keiko** (un "calendario della vita"): è un redesign in corso, mostrato coi dati reali dell'utente. Devo capire perché le **proporzioni non convincono** e sistemarle con precisione.

## ⚠️ PREMESSA FONDAMENTALE — leggila bene
Le card ora mostrano **gradienti di colore con una grande emoji sfumata** (microfono, manubrio, piatto, bussola, popcorn). **Questi sono SOLO placeholder.** Nella versione finale **ogni card avrà una FOTO REALE**: poster del film, foto del piatto, foto della città/luogo dell'evento, foto della palestra. Quindi:
- **NON giudicare i gradienti né le emoji** come design finale. Immagina una **foto reale** dietro ogni card.
- Giudica invece **proporzioni, gerarchia tipografica, spaziature, dimensioni e ritmo** — cioè lo scheletro che regge anche con le foto.

## Cosa devi analizzare (il focus è QUESTO)
1. **Scala tipografica / gerarchia.** Guarda le dimensioni del testo: saluto "Ciao Matteo", data, riga riepilogo, giorni della settimana, titolo dell'evento hero, intestazioni sezione ("Oggi per te"), titoli delle card, metadati. La scala scende in modo **armonico e intenzionale**, o ci sono salti bruschi / cose "una grande e una piccola a caso"? Indica quali dimensioni cambieresti e a quanti px.
2. **Proporzioni delle card.**
   - L'**hero** (evento in alto): l'altezza è giusta rispetto alla larghezza e al contenuto? Troppo alto/basso? Che rapporto (es. 16:9, 16:10, 3:2) consiglieresti?
   - Le card **"Oggi per te"** (griglia 2 colonne): dimensione, rapporto, gap tra loro. Troppo piccole/grandi? Il gap è giusto?
   - La **striscia settimana**: i giorni sono ben proporzionati? Il "17" attivo (ambra) è ben bilanciato?
3. **Spaziature e ritmo verticale.** I margini tra le sezioni (saluto → settimana → hero → "Oggi per te") sono coerenti? C'è troppo vuoto o troppo affollamento? Il padding interno delle card è giusto?
4. **Allineamenti e griglia.** Tutto è allineato allo stesso margine? La topbar, il saluto, le card, la nav sono su una griglia coerente?
5. **Bilanciamento generale.** A colpo d'occhio l'occhio si muove bene? C'è un elemento che "pesa" troppo (es. il saluto, o l'hero)? La pagina sembra equilibrata o sbilanciata in alto/in basso?
6. **Bottom nav e FAB.** Proporzioni degli elementi, dimensione del "+", spaziatura.

## Cosa NON valutare adesso
- I colori dei gradienti e le emoji (sono placeholder → foto reali in produzione).
- Le interazioni (tap evento e ricerca non sono ancora agganciati).
- La qualità delle singole foto (non ci sono ancora).

## Output
1. **Verdetto in 5 righe** sulle proporzioni: cosa non funziona e perché, e un voto **proporzioni /10**.
2. **Elenco preciso di correzioni**, con **valori esatti** dove possibile: "saluto da X a Ypx", "hero da rapporto A a B", "gap card da X a Y", "margine sezione da X a Y", "titoli card da X a Ypx". Ordinati per impatto.
3. **La regola di scala tipografica** che proporresti (una scala pulita: es. 28 / 20 / 16 / 14 / 12), così la applichiamo a tutte le schede.
4. Un riferimento/benchmark (es. la scala e le spaziature di Linear, Airbnb, Things) se utile.

Sii concreto e numerico: mi servono valori da applicare, non impressioni generiche. Ricorda: **le foto ci saranno** — giudica lo scheletro.
