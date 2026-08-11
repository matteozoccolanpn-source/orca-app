# Ondata 3 — Allenamento sul sistema V2
### prompt per Claude Code · da eseguire in `orca-app` **dopo** l'ondata 2

> L'ondata 1 ha creato `app/keiko-v2.css`, i componenti in `app/components/v2/`
> e la rotta di parità `/v2/keiko`. L'ondata 2 ha portato la Guarda vera
> (`a2d65e3`). Qui tocca all'Allenamento, con lo stesso metodo.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; **non toccare `lib/` né `app/api/`**;
`npx tsc --noEmit` e `npm run build` verdi prima di ogni commit;
**mai committare senza l'ok esplicito di Matteo**.

## Il compito, in una riga

`app/allenamento/AllenamentoView.tsx` (1190 righe) e `SessioneLive.tsx` (445)
cambiano **solo il livello visivo**: markup e classi del mock, componenti da
`app/components/v2/`, tutto avvolto in `<div className="k2">`. **Stato, effetti,
chiamate di rete e gestori restano dov'erano.**

Riferimenti, in quest'ordine di autorità:

1. `docs/UI-ALLENAMENTO-LOCKED.md` — la specifica congelata. È la fonte di
   verità per l'ordine delle sezioni, gli stati e le sotto-viste.
2. `docs/mockups/keiko-v2-mock.html`, scheda Allenamento — la fonte di verità
   **visiva**.
3. `docs/UI-DECISIONI-V2.md` — il manifesto, per capire perché una regola è
   una regola.

`app/allenamento/page.tsx` **non si tocca**: calcola sul server la data di
oggi, la seduta, `ultimaVolta` per tutti gli esercizi in un colpo solo e lo
storico. È il motivo per cui la pagina non ha attese all'apertura.

## 0 · Il vincolo che non si negozia

**Keiko trascrive la scheda, non la scrive.** La scheda è del personal
trainer: `/api/workout/upload` e `/api/workout/generate` servono a leggere
la foto o il PDF che il PT ha dato a Matteo e a metterlo in forma tabellare.

Quindi nella UI nuova non deve comparire **niente** che suggerisca che Keiko
inventa esercizi, propone carichi, corregge il programma o dà consigli di
allenamento come se fossero suoi. Nessun «ti consiglio di…», nessuna
progressione proposta, nessun peso suggerito. Se una card del mock sembra
dire quello, cambiala tu e segnalamelo.

Il `consiglio` che arriva da `lib/coach` è un'altra cosa e resta com'è: si
mostra con le parole che arrivano dal server, senza riformularle.

## 1 · Prima di toccare una riga: l'inventario

Fai l'inventario di questi comportamenti, e alla fine verificali uno per uno
con **fatto / non fatto / rotto**. Se un pezzo del mock ne contraddice uno,
**vince il codice** e me lo segnali invece di inventare il collegamento —
come hai fatto per il consiglio nell'ondata 2, che era la cosa giusta.

- **Caricamento della scheda**: immagini e PDF, `imgRef`/`pdfRef`,
  `/api/workout/upload` poi `/api/workout/generate`, gli stati
  `idle → parsing → success → error` e `errorMsg`.
- **Modifica della settimana**: `editMode`, `selDay`, `draft`, `savingWeek`,
  `/api/workout/edit`. È l'unico punto in cui la scheda si corregge a mano.
- **Eliminazione**: `deleting`, `/api/workout/delete`, con conferma.
- **Giorno fatto**: `trained`, `/api/workout/log`.
- **Sessione live**: `SessioneLive` con `sessionId`, `sets`, `apertoIdx`,
  `reps`, `kg`, `salvo`, `chiudo`, `errore`, le quattro chiamate a
  `/api/workout/session`, e il fatto che è un **portale a schermo intero** che
  si chiude senza perdere niente (la seduta resta aperta su Supabase).
- **«L'ultima volta»**: arriva già pronta dal server per tutti gli esercizi di
  oggi. Non ri-chiederla per esercizio: era una regressione già risolta.
- **I numeri della settimana**: `weekDone`, `weekPlanned`, `streak`,
  `trainedDays`, `storicoSedute`, `ultimaVolta`.
- **`embedded`**: la vista dentro lo swipe non riceve `oggiIso` e se lo ricava
  dal calendario. Questo comportamento resta.
- **Il consiglio** da `lib/coach`, mostrato con le parole del server.

## 2 · Cosa cambia, e come

**L'ordine delle sezioni** è quello di `UI-ALLENAMENTO-LOCKED.md`:

1. hero
2. gli esercizi di oggi
3. **A che punto sei** (performance)
4. la settimana
5. il cibo
6. i programmi
7. la scheda

Il punto 3 sta **prima** della settimana: sapere a che punto sei viene prima
dell'elenco dei giorni. È una correzione esplicita di Matteo, non un dettaglio.

**Gli esercizi di oggi** diventano l'accordion `.item`: riga chiusa con nome e
metadato, aperta con i dettagli e «l'ultima volta». Niente numeri in grassetto
sparsi: il metadato è `#9BA0A8`, mai maiuscolo.

**«A che punto sei»** non ha i numeroni: una riga narrativa e i chip di
tendenza, come nel mock. Se il dato per un chip non c'è, il chip non c'è —
non inventare una tendenza da due sedute.

**La settimana** usa le `DayCard`, con il giorno di oggi evidenziato e la
spunta `Check` sui giorni fatti.

**La sessione live** resta un portale a schermo intero e diventa `.full` +
`.topbar` + `.giant` del mock. Gli stepper di serie, ripetizioni e chili sono
`Step`. Il numero grande al centro è la classe `.giant`.

**Il caricamento della scheda** passa da `Sheet` + righe-azione: primaria in
alto, «Elimina la scheda» in fondo, terziaria, con conferma.

**Testata**: «Allenamento» in Fraunces 22 e **una riga sola** di stato. Zero
emoji: si usa il set di icone di `app/components/v2/icons.tsx` — via tutte le
`lucide-react` dentro l'area riscritta. Colore: teal per stato e selezione;
terracotta **solo** sulla primaria di riga e sul FAB.

**Stati**: scheletri durante ogni attesa di rete, non lo spinner; stato vuoto
progettato quando non c'è nessuna scheda caricata; e la card «Per oggi mi
fermo qui» se il tetto AI è stato raggiunto — come card, non come errore rosso.
La `Loader2` che gira sparisce dall'area riscritta.

## 3 · Cosa NON fare in questa ondata

- **Il blocco «cibo» e il blocco «programmi»**: nel mock ci sono, ma vanno
  portati **solo se il dato esiste già** nel codice. Se non esiste, non
  inventare dati finti e non lasciare una sezione vuota: saltala e dimmelo,
  come hai fatto con i podcast nella Guarda.
- **Zero numeri nutrizionali** nel blocco del cibo, se lo porti. È un vincolo
  legale, non un gusto: nessuna caloria, nessun macro, nessuna quantità
  prescritta.
- Non toccare `page.tsx`, `lib/`, `app/api/`.
- Non cambiare le rotte né i nomi delle proprietà dei dati.
- Non introdurre componenti nuovi oltre a quelli di `app/components/v2/`: se
  te ne serve uno, estendi quelli esistenti come hai fatto con `Poster` e
  `Feature`, oppure scrivi perché e chiedi.
- `KeikoNav` resta fuori da `.k2`, come in Guarda, e il fondo pagina usa
  `PAGE_PB`.

## 4 · Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. Con Playwright a **430 × 932, dpr 2**: screenshot dell'Allenamento vero
   affiancati alla stessa schermata del mock, e l'elenco delle differenze
   rimaste.
3. La lista del punto 1, comportamento per comportamento, con **fatto / non
   fatto / rotto**. Questa è la parte che conta più degli screenshot.
4. Prova anche: nessuna scheda caricata, caricamento che fallisce, sessione
   live aperta e chiusa a metà, giorno senza esercizi, e la vista `embedded`
   dentro lo swipe.
5. Se qualcosa non lo puoi provare perché serve il login, dillo esplicitamente
   invece di darlo per buono.

## 5 · Cosa consegnare

Alla fine, **tre righe**: cosa hai portato, cosa hai lasciato aperto, e dove
il mock e il codice si contraddicevano — con quale dei due ha vinto e perché.

Non committare finché Matteo non dice di sì.
