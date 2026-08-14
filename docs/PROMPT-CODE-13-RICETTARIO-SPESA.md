# Blocchi 8 + 9 — il ricettario e la spesa
### prompt per Claude Code · da eseguire in `orca-app` dopo il blocco 7

> Due blocchi in un prompt perché toccano lo stesso file — `CucinaView.tsx`,
> 1222 righe. Farli separati vuol dire rileggerlo due volte.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate; niente rifattorizzazioni di
file scollegati; **non toccare `lib/` né `app/api/`** salvo dove indicato;
`npx tsc --noEmit` e `npm run build` verdi prima di ogni commit; **mai
committare senza l'ok esplicito di Matteo**.

Hai il login di sviluppo. Sull'utente di prova c'è già il banco che serve: un
piano `PROVA-`, le annotazioni, e una ricetta `PROVA- pollo alle zucchine`.

**Fermati alla fine di un punto**, mai a metà, e dimmi dove sei arrivato.

---

# BLOCCO 8 · Il ricettario

## 8.1 · Dentro la Cucina: un assaggio, non tutto

**Oggi** il ricettario nella Cucina è uno scaffale che mostra 8 ricette e un
«vedi tutte» che espande in griglia dentro la stessa pagina.

**Deve diventare**: un **carosello** delle salvate (con lo scroll-snap che hai
già messo ai chip e a «In arrivo»), una **ricerca piccola** sotto, e il tocco
su «Ricettario» che apre la **pagina intera** — dove si cerca davvero.

La logica è quella del pannello: **la Cucina mostra l'assaggio, la pagina è il
contesto.** Espandere una griglia dentro una pagina che ha già il piano e la
domanda la rende lunga il doppio senza renderla più utile.

## 8.2 · La pagina intera del ricettario

Schermata piena, non foglio — si scorre a lungo, e un foglio si chiude
trascinando in giù. Stessa scelta di `Storico.tsx` e `StoricoPasti.tsx`, per lo
stesso motivo.

Dentro:

- una **griglia verticale immersiva di copertine**, grandi, che si scorre;
- **ricerca e filtri**: sono **LOCALI**, sull'array che `getRecipes()` porta
  già (fino a 200 ricette). ⚠️ Corretto il 14 agosto 2026: qui prima c'era
  scritto di usare `/api/cucina/search`, ed era sbagliato — quella rotta cerca
  sul **web** (Tavily/Brave), passa da `interpreta()` e **costa un credito a
  ricerca**. Usarla per cercare fra le TUE ricette vorrebbe dire pagare, e per
  giunta cercare nel posto sbagliato.
  I filtri sono **tre, e solo tre**, perché sono i soli con un dato dietro:
  **testo del titolo**, **piattaforma** (TikTok/YouTube/web), **già fatte**
  (`timesCooked > 0`).
  🚫 Niente tempo e niente difficoltà: `extracted.tempo` è la stringa che ha
  scritto il creator («20 min», «un'oretta»), c'è solo a volte e non è
  confrontabile — «sotto i 30 minuti» dovrebbe interpretarla, cioè indovinare.
  La difficoltà non esiste proprio;
- lo **stato vuoto** scritto, per chi non ha ancora salvato niente.

🚫 **Il video non si incorpora.** Toccando una copertina si apre la ricetta;
dalla ricetta si va **sulla piattaforma del creator**, mai dentro Keiko. È una
decisione scritta nel codice da mesi: la visualizzazione va a chi l'ha girata,
e incorporare è contro le condizioni delle piattaforme.

## 8.3 · «Cucina con Keiko» — un passo per volta

**Buona notizia, verificata**: i passi **esistono già come dato** —
`RicettaEstratta.passi` è un `string[]`. Oggi sono resi come elenco dentro il
foglio; qui diventano una **sequenza**.

Schermata piena: `.full` + `.topbar` + `.step`, con il **numero del passo in
`.giant`**. Un passo alla volta, avanti e indietro, e la posizione visibile
(«3 di 7»).

- gli **ingredienti** restano raggiungibili senza uscire dalla sequenza: chi
  cucina li ricontrolla a metà;
- se la ricetta **non ha passi estratti**, la voce non c'è. Non fabbricare
  passi dal titolo o dalla descrizione;
- alla fine, una via d'uscita che porta al pasto: se questa ricetta è
  collegabile a un pasto di oggi, «L'ho cucinata per…» — riusa il giro del
  blocco 7, non farne un altro.

## 8.4 · Lo schermo che resta acceso

Durante «Cucina con Keiko», lo schermo non si spegne: `Screen Wake Lock`.

Due cose obbligatorie: si **rilascia** uscendo dalla sequenza (uno schermo che
resta acceso dopo che hai chiuso è un difetto che si nota solo a batteria
scarica), e dove l'API non c'è **non si rompe niente** — si cucina lo stesso.

---

# BLOCCO 9 · La spesa

## 9.1 · Il difetto di Amazon — l'ho trovato, è una riga

`CucinaView.tsx:1027`:

```
href={amazonFresh(daComprare.map((i) => i.nome).join(" "))}
```

Tutta la lista viene unita in **una stringa sola** e mandata alla ricerca di
Amazon, che cerca una frase che non esiste e non trova niente. La versione per
riga (1156) invece è corretta: `amazonFresh(v.nome)`.

**Cosa deve diventare**: quel bottone sparisce come «cerca tutto su Amazon» e
diventa **«copia la lista»** — la spesa negli appunti, come testo, che funziona
ovunque e non dipende da nessuno. La ricerca per singola voce resta dov'è.

Se preferisci tenere anche un'uscita verso Amazon, che apra **una voce alla
volta** e non la lista intera. Ma il valore vero è la copia: davanti allo
scaffale si guarda una lista, non si fa una ricerca.

## 9.2 · La lista della settimana

**Oggi** la spesa si riempie da una ricetta alla volta, e c'è già `dalPiano`.

**Deve diventare**: si può generare la lista **della settimana**, aggregando
gli ingredienti dei pasti pianificati. Aggregare vuol dire: le voci uguali si
sommano invece di ripetersi, e resta scritto **da dove viene** ogni voce —
`fonte` e `ref` esistono già in `ShoppingItem`.

⚠️ **Non sovrascrivere quello che c'è**: se una voce è già in lista e già
spuntata, generare la settimana non deve resuscitarla. Dimmi come lo risolvi
prima di scriverlo.

🚫 Nessuna quantità che Keiko calcoli da sé oltre quella scritta nella ricetta.
«200g di pollo × 3 volte = 600g» è aritmetica, e va bene; «per te servono 150g»
è un'altra cosa e non si fa.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. **Premendo, sull'app vera**, sull'utente di prova: apri il ricettario
   intero, cerca, apri una ricetta, entra in «Cucina con Keiko» e arriva alla
   fine, esci e verifica che lo schermo torni normale.
3. **La copia della lista**: copiala e incollala da qualche parte — deve essere
   leggibile da un essere umano, non un JSON.
4. **Gli stati vuoti**: nessuna ricetta salvata, ricerca senza risultati, spesa
   vuota, ricetta senza passi estratti.
5. A **430 × 932 dpr 2 con le safe-area**, e con la rete rallentata: scheletri,
   non spinner.
6. Verifica che **la Cucina non si allunghi**: l'assaggio deve stare in poco,
   altrimenti il punto 8.1 non ha risolto niente.

## Cosa consegnare

Voce per voce con **fatto / non fatto / rotto**, e tre righe: cosa hai portato,
cosa hai lasciato aperto, e ogni punto in cui hai dovuto decidere qualcosa che
questo documento non copriva.

Non committare finché Matteo non dice di sì.
