# Ondata 5 — La Home sul sistema V2
### prompt per Claude Code · da eseguire in `orca-app`

> Ondata 1: il foglio `.k2` e i componenti in `app/components/v2/`.
> Ondata 2: la Guarda. Ondata 3: l'Allenamento.
> Qui tocca alla Home. È la schermata più delicata dell'app: leggi tutto
> prima di scrivere una riga.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; **non toccare `lib/` né `app/api/`**;
`npx tsc --noEmit` e `npm run build` verdi prima di ogni commit;
**mai committare senza l'ok esplicito di Matteo**.

## 0 · La regola che governa tutta l'ondata

La Home ha un mock **congelato**: `docs/mockups/home-v2-final-mock.html`.

Matteo l'ha già rifiutata due volte quando era stata reinterpretata, e la sua
istruzione finale è stata letterale: la Home dev'essere **quel mock, identica**.

Quindi qui non si progetta niente e non si migliora niente. Non è un'ondata in
cui si applica il gusto: è un porting fedele. Se una scelta di quel mock ti
sembra sbagliata, **la porti lo stesso** e me la segnali a fine lavoro. Non la
correggi da solo.

Lo stesso mock è dentro `docs/mockups/keiko-v2-mock.html` sotto `#oldhome`,
verbatim: usalo per confrontare, è la stessa cosa.

## 1 · Il compito, in una riga

`app/components/keiko/KeikoHomeV4.tsx` (601 righe) cambia **solo il livello
visivo**: markup e classi del mock congelato, componenti da
`app/components/v2/` dove combaciano, tutto avvolto in `<div className="k2">`.
**Stato, effetti, chiamate di rete e gestori restano dov'erano.**

`app/page.tsx` **non si tocca**: prepara i dati sul server ed è il motivo per
cui la Home non ha attese all'apertura.

Il markup si riscrive in **React vero**, componente per componente. Non
`dangerouslySetInnerHTML`: nel mock era una scorciatoia da prototipo, qui no.

## 2 · Il nodo vero di quest'ondata: i nomi delle classi

Nell'ondata 1 le regole del blocco `#oldhome` sono state **lasciate fuori** da
`app/keiko-v2.css` di proposito, rimandando il problema a qui. Il problema è
questo: la Home congelata usa nomi generici che nel foglio condiviso **esistono
già con una definizione diversa** — `.sec`, `.content`, `.srf`, `.wide`,
`.day`, `.ck`, `.ph`, `.dot`, `.shelf`, `.st`, `.t`, `.m`.

Il lavoro è riconciliarli, classe per classe, non duplicarli. Per ognuna:

- se la regola condivisa produce **lo stesso risultato**, butta la copia della
  Home e usa quella condivisa. È il caso che vogliamo, ed è il senso di avere
  un sistema solo;
- se **differisce**, vince l'aspetto del mock congelato (punto 0), ma **non
  cambiare la regola condivisa**: le altre sezioni sono già in produzione e si
  romperebbero. Dai alla Home una classe sua, con un nome che dica cosa fa;
- **elenca ogni singolo caso** in cui hai dovuto separare, con un affianco
  prima/dopo. Quella lista mi serve: dice quanto la Home diverge davvero dal
  sistema, ed è materiale per decidere se un giorno le riavviciniamo.

Aggiungi le regole della Home a `app/keiko-v2.css`, prefissate `.k2` come tutte
le altre. Il foglio resta uno solo.

## 3 · L'ordine della Home, dal mock congelato

1. **`.hdr`** — il marchio keiko con l'orca, la barra di ricerca con il
   segnaposto che ruota, l'avatar
2. **`.greet`** — il saluto che cambia con l'ora, e una riga di stato
3. **`.weekrow`** — la striscia dei sette giorni con oggi acceso, e il tasto
   del calendario
4. **`.todo`** — **collassabile**: la testa mostra la prossima cosa da fare e
   il conteggio («1 di 3»), aperta mostra la lista con le spunte, «Aggiungi»
   e «Tutto fatto per oggi» quando è vuota
5. **«Riprendi»** — scaffale orizzontale di `.rcard` con la barra di progresso
6. **`.hero-wrap`** — il prossimo evento, grande
7. **«In arrivo»** — le card `.content`
8. **«Oggi per te»** — una `.wide` e le `.content`
9. **«Stasera»** — una `.wide`

Quest'ordine non si discute e non si ottimizza: è quello del mock congelato.

## 4 · Cosa deve continuare a funzionare, identico

Fai l'inventario di questi comportamenti e alla fine verificali uno per uno con
**fatto / non fatto / rotto**. Se un pezzo del mock ne contraddice uno, **vince
il codice** e me lo segnali.

- **I to-do**: `/api/todos` in lettura e scrittura, la spunta, `hidden`,
  `doneOv`, `fattoQui`, e l'annullamento con `undo` e `undoTimer`.
- **L'eliminazione**: `/api/delete`, annullabile entro il timer.
- **Il meteo**: `/api/weather?place=`, con `city` che può non esserci.
- **I battiti**: `Battito`, `battitoChiuso`, `/api/beats/close`,
  `etichettaBattito` e le emoji per tipo. Attenzione: la spec dice zero emoji,
  ma qui l'emoji è **dato**, non decorazione — non toglierla senza chiedermi.
- **La cattura**: `capture` e `CaptureSheet`.
- **I sette fogli**: `EventSheet`, `AskSheet`, `DaySheet`, `ProfileSheet`,
  `InstallSheet`, `CalendarSheet`, `Onboarding` — con `selEv`, `askOpen`,
  `selDay`, `profileOpen`, `calOpen`, `onboard`.
- **L'invito a installare**: `cosaMostrare`, `daProporre`, `daIcona`,
  `daTelefono`, `invito`, `invitoPrima`.
- **Le immagini intelligenti**: `SmartMedia`, `catFor`, `glyphFor`.
- **Il saluto** che cambia con l'ora e il **segnaposto che ruota** nella barra.

## 5 · Cosa NON fare in questa ondata

- Non reinterpretare il disegno. Vedi il punto 0.
- Non toccare `app/page.tsx`, `lib/`, `app/api/`.
- Non cambiare le regole condivise di `app/keiko-v2.css` per far tornare la
  Home: le altre sezioni sono in produzione.
- Non toccare le sezioni che linka: la Home rimanda a Cucina, Dieta e Viaggi
  che sono ancora nel vestito vecchio, ed è normale.
- Non introdurre componenti nuovi oltre a quelli di `app/components/v2/`: se te
  ne serve uno, estendi gli esistenti o scrivi perché e chiedi.
- `KeikoNav` resta fuori da `.k2` e il fondo pagina usa `PAGE_PB`.

## 6 · Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. Con Playwright a **430 × 932, dpr 2**, **con le safe-area simulate e non a
   zero**: la Home vera affiancata al mock congelato, schermata per schermata,
   con la percentuale di pixel diversi come hai fatto nell'ondata 1. Qui la
   soglia conta: questa è l'unica sezione in cui l'obiettivo dichiarato è
   l'identità, non la somiglianza.
3. La lista del punto 4, comportamento per comportamento, con **fatto / non
   fatto / rotto**.
4. La lista del punto 2: ogni classe che hai dovuto separare, e perché.
5. Prova anche: nessun to-do, tutti i to-do fatti, nessun evento in arrivo,
   niente meteo, nessuna città impostata, e il primo avvio con l'onboarding.
6. Se qualcosa non lo puoi provare perché serve il login, dillo esplicitamente.
   «Convinto» non è «verificato».

## 7 · Cosa consegnare

Alla fine, **tre righe**: cosa hai portato, cosa hai lasciato aperto, e dove il
mock e il codice si contraddicevano — con quale dei due ha vinto e perché.

Non committare finché Matteo non dice di sì.
