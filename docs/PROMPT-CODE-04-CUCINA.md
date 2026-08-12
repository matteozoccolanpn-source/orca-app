# Ondata 4 — Cucina sul sistema V2
### prompt per Claude Code · da eseguire in `orca-app` **dopo** l'ondata 3

> Ondata 1: il foglio `.k2` e i componenti in `app/components/v2/`.
> Ondata 2: la Guarda vera. Ondata 3: l'Allenamento.
> Qui tocca alla Cucina, con lo stesso metodo.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; **non toccare `lib/` né `app/api/`**;
`npx tsc --noEmit` e `npm run build` verdi prima di ogni commit;
**mai committare senza l'ok esplicito di Matteo**.

## Il compito, in una riga

`app/cucina/CucinaView.tsx` (1050 righe) cambia **solo il livello visivo**:
markup e classi del mock, componenti da `app/components/v2/`, tutto avvolto in
`<div className="k2">`. **Stato, effetti, chiamate di rete e gestori restano
dov'erano.**

Riferimenti, in quest'ordine di autorità:

1. `docs/UI-CUCINA-LOCKED.md` — la specifica congelata.
2. `docs/mockups/keiko-v2-mock.html`, scheda Cucina — la fonte di verità
   **visiva**, incluse le sotto-viste (ricettario, spesa, modo cottura).
3. `docs/UI-DECISIONI-V2.md` — il manifesto.

## 0 · Il paletto che non si negozia

È già scritto in cima a `CucinaView.tsx` e resta vero parola per parola:

> Il piano si **mostra** e si **esegue**. Le ricette vivono sotto, separate.
> In questo file non esiste una riga che confronti le due cose: niente
> calorie, niente «adatta al tuo piano», mai una ricetta proposta al posto di
> un pasto.

Keiko non scrive e non modifica un piano alimentare. Se una card del mock
sembra avvicinare le due cose — una ricetta suggerita accanto a un pasto del
piano, un numero nutrizionale, un «al posto di» — **non portarla** e segnalamela.

Vale anche per i video: non si incorporano e non si copiano, si aprono su
TikTok/YouTube, così la visualizzazione va a chi l'ha girato.

## 1 · Prima di toccare una riga: l'inventario

Fai l'inventario di questi comportamenti e alla fine verificali uno per uno con
**fatto / non fatto / rotto**. Se un pezzo del mock ne contraddice uno, **vince
il codice** e me lo segnali invece di inventare il collegamento.

- **La domanda**: `domanda`, `scelte`, `cerco`, `/api/cucina/search`, e
  soprattutto `interpretazione` — la riga che dice cosa Keiko ha capito. Se
  traduce una situazione, lo dice: quella riga non si toglie.
- **I risultati**: `risultati`, `mostrati`, `ancora`, `altrePronte`,
  `variante`.
- **Il ricettario**: `salvate`, `tutte`, `scaffale`, `aperta`,
  `/api/cucina` in lettura e con `?id=`.
- **L'estrazione da un link**: `estraggo`, `/api/cucina/estrai`.
- **La spesa**: `spesa`, `lista`, `daComprare`, `inDispensa`, `spesaAperta`,
  `spesaOccupata`, le tre chiamate a `/api/cucina/spesa`, e `amazonFresh`.
- **Il piano del giorno**: `PastoDelGiorno`, `Rifare`, `quandoDetto`,
  `daQuanto` da `lib/cucina`.
- **I messaggi**: `msg` e `msgT` (il timer che li fa sparire).

## 2 · Cosa cambia, e come

**L'ordine delle tre zone resta quello del file**, che è anche l'ordine di
lettura: ① il piano — cosa viene adesso, e la giornata a pallini; ② la domanda;
③ il ricettario. Chi non ha un piano parte dalla domanda e non deve sentire che
manca qualcosa: lo stato vuoto è progettato, non è un buco.

**La domanda** diventa la barra `Ask` del sistema, con i chip sotto. La riga
dell'interpretazione resta dov'è, sopra i risultati, e usa il teal: è la cosa
che rende la Cucina diversa da una ricerca.

**Le ricette** diventano `Content` nello scaffale orizzontale e `Poster` nella
griglia, con la variante quadrata dove il mock la usa.

**Il piano del giorno** usa `DayCard` e i pallini della giornata.

**La spesa** diventa un `Sheet` con le righe raggruppate e la `Check` che si
disegna; il totale sta in cima, non in fondo.

**Il modo cottura** è la sotto-vista a schermo intero: `.full` + `.topbar` +
`.step`, un passo per volta, con il numero grande in `.giant`.

**Testata**: «Cucina» in Fraunces 22 e **una riga sola** di stato. Zero emoji:
si usa il set di `app/components/v2/icons.tsx` — via le `lucide-react` dentro
l'area riscritta. Colore: teal per stato e selezione; terracotta **solo** sulla
primaria di riga e sul FAB.

**Stati**: scheletri durante ogni attesa di rete, non lo spinner; stato vuoto
progettato quando un filtro non trova niente; e la card «Per oggi mi fermo qui»
se il tetto AI è stato raggiunto — come card, non come errore rosso.

**La pastiglia della spesa** che oggi vive in fondo alla pagina: tienila, ma
falla convivere con `PAGE_PB` come già fa adesso.

## 3 · Cosa NON fare in questa ondata

- **Non toccare `/salute`** — il piano della dieta, `SaluteView`, `DietView`,
  `DietSwap`, `HealthTabs`. Nel mock Cucina e Dieta sono una tab sola, ma
  unirle è una decisione di prodotto che Matteo prenderà a parte. Qui si
  riveste solo `/cucina`.
- Non toccare `page.tsx`, `lib/`, `app/api/`.
- Non cambiare le rotte né i nomi delle proprietà dei dati.
- Non introdurre componenti nuovi oltre a quelli di `app/components/v2/`:
  estendi quelli esistenti come hai fatto con `Poster`, `Feature` e `DayCard`,
  oppure scrivi perché e chiedi.
- `KeikoNav` resta fuori da `.k2` e il fondo pagina usa `PAGE_PB`.

## 4 · Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. Con Playwright a **430 × 932, dpr 2**, **con le safe-area simulate e non a
   zero**: screenshot della Cucina vera affiancati alla stessa schermata del
   mock, e l'elenco delle differenze rimaste.
3. La lista del punto 1, comportamento per comportamento, con **fatto / non
   fatto / rotto**. Questa è la parte che conta più degli screenshot.
4. Prova anche: nessun piano, nessuna ricetta salvata, spesa vuota, una
   domanda che non trova niente, l'estrazione da un link che fallisce, e il
   modo cottura aperto e chiuso a metà.
5. Se qualcosa non lo puoi provare perché serve il login, dillo esplicitamente
   invece di darlo per buono. «Convinto» non è «verificato».

## 5 · Cosa consegnare

Alla fine, **tre righe**: cosa hai portato, cosa hai lasciato aperto, e dove il
mock e il codice si contraddicevano — con quale dei due ha vinto e perché.

Non committare finché Matteo non dice di sì.

---

## Aggiunte dell'11 agosto, dopo il primo tentativo

Il primo giro si è fermato prima di cominciare la riscrittura — scelta giusta,
un file da 1050 righe convertito a metà è lo stato peggiore. Quello che aveva
già capito vale e non va rifatto; queste tre note tolgono di mezzo i dubbi che
lo avevano bloccato.

**La forma della pagina è decisa: vince il codice.** La Cucina tiene il suo
ordine — piano → domanda → ricettario — e del mock prende il **linguaggio
visivo**, non l'impaginazione. Metà della scheda Cucina del mock è gestione
della dieta (`/salute`), che il §3 vieta di toccare: quella parte non si porta
e non si cerca un equivalente.

**Il modo cottura: se non ha i dati, non si inventa.** Nel codice i passi della
ricetta sono un elenco dentro il foglio, non una sequenza «un passo per volta».
Se è così, `.giant` non ha niente da mostrare: porta l'elenco nel vestito nuovo
e segnalamelo. È la stessa risposta che abbiamo dato al timer di recupero
dell'Allenamento — una funzione nuova non si travestisce da restyling.

**Il blocco `<style>` in linea sparisce, non si traduce.** Quel blocco si
inventa due livelli (`--inset`, `--accent2`) da `ds.css` con `color-mix`. Nel
sistema V2 esistono già: sono `--lv2` e `--acc-btn`. Si usano quelli e il
blocco si cancella.

**Tre blocchi del mock non hanno il dato** — il menu spuntabile, «fuori piano»,
«I prossimi giorni». `PastoDelGiorno` ha «passato», deciso dall'orologio, non
una spunta che l'utente possa mettere. Non portarli, e dimmelo: si valuteranno
come lavoro di prodotto.
