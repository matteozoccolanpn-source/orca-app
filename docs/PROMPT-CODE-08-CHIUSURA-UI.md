# Ondata di chiusura UI — pulizia e difetti dalla revisione esterna
### prompt per Claude Code · da eseguire in `orca-app`

> Unisce l'ondata di pulizia (`PROMPT-CODE-07`) con i difetti trovati da una
> revisione esterna dell'app in produzione, fatta navigandola davvero.
> `PROMPT-CODE-07` è assorbito qui dentro: non eseguirlo separatamente.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; **non toccare `lib/` né `app/api/`**
salvo dove indicato esplicitamente; `npx tsc --noEmit` e `npm run build` verdi
prima di ogni commit; **mai committare senza l'ok esplicito di Matteo**.

L'ordine è **per fatica crescente**, non per gravità: prima le cose da mezz'ora,
poi quelle da ore. Se il tempo finisce, si taglia dal fondo e quello che è
entrato è tutto chiuso. **Fermati e dimmi dove sei arrivato** invece di lasciare
qualcosa a metà.

---

## 0 · PRIMA DI TUTTO — la verifica che decide metà del lavoro

Quattro difetti della revisione esterna **contraddicono lavoro che hai già
fatto e misurato** nell'ondata delle discipline (commit `b4bd82e`, spinto):

- «ogni esercizio in sessione parte con disciplina Pesi, anche Corsa Z2 e Nuoto»
- «l'ultima volta mostra `1 × 10` per una corsa da 6 km»
- «l'app conosce 6 km / 900 m dalla scheda ma impone reps+kg»
- «la disciplina di default è Pesi, forse solo il primo valore dell'elenco»

Tu avevi verificato l'opposto, con i payload intercettati: `Corsa Z2` →
`corsa`, `distanzaM:5000`, e `5,0 km in 27'10" · 5:26/km`.

**Prima di scrivere una riga**, stabilisci quale delle due è vera:

1. controlla che `b4bd82e` sia davvero nel ramo distribuito;
2. rilancia le tue prove sul codice attuale — l'indovinello, la precedenza
   (mano → serie di oggi → ultima volta → nome), il riassunto per disciplina;
3. se **funziona**, la revisione ha guardato una versione vecchia: dimmelo e
   passa al punto 1. **Non c'e' niente da saltare**: le quattro accuse
   fantasma stanno solo qui nel punto 0 e nessuna voce numerata dipende da
   loro. (Una versione precedente di questo documento diceva di saltare i
   punti 12, 15 e 16: era un errore di conteggio, quei tre sono validi e
   vanno fatti.)
4. se **non funziona**, qualcosa è tornato indietro: trova cosa, dimmelo, e
   quello diventa la prima cosa da riparare.

Non correggere al buio una cosa che potrebbe essere già giusta.

---

## BLOCCO S · meno di mezz'ora l'uno

### 1 · `/dieta` risponde 404
La voce «Dieta» della barra punta a `/salute`, ma `/dieta` esiste come URL e
dà «Questa pagina non esiste». Aggiungi il reindirizzamento `/dieta` → `/salute`
e verifica che la voce della barra ci arrivi sempre.

### 2 · I valori si azzerano ritoccando la stessa card
Nella sessione, toccare di nuovo la card di un esercizio **già attivo** azzera
quello che hai inserito, senza avviso.

**So da dove viene**: è l'effetto collaterale della correzione che hai fatto tu
per il battito della bici che finiva nella camminata — «i campi si svuotano
sempre cambiando esercizio». Giusto svuotare quando l'esercizio **cambia**,
sbagliato quando si richiude e riapre **lo stesso**. Distingui i due casi.

### 3 · «Fatica» è obbligatoria ma sembra facoltativa
Mostrata come `—`, senza nessun segno che serva. Vedi anche il punto 14, che è
la stessa storia: qui basta rendere evidente che è richiesta, o darle un valore
di partenza.

### 4 · Due primarie nella Guarda
«Dove vederlo» e la pillola del consiglio nella barra di ricerca sono entrambe
terracotta. La regola è una primaria per schermata.

**Decisione presa**: la pillola del consiglio passa a **superficie neutra
`#212228` con l'icona teal**. Resta terracotta solo «Dove vederlo». Sì, quella
pillola l'avevo voluta terracotta io: la regola vale anche contro di me.

### 5 · La riga dei risultati di ricerca non si apre
Nei risultati, toccare il titolo non fa niente: reagisce solo il `+`. Rendi
tappabile tutta la riga per aprire la scheda, e lascia il `+` separato per
aggiungere (`stopPropagation`).

### 6 · Due stati che si contraddicono
Dopo aver segnato una serie, `Corsa Z2` mostra insieme «1 serie · 1 × 10» e
«nessuna traccia di questo esercizio». Unifica la fonte dello stato «ha
registrazioni». Se le due stringhe leggono cose diverse, **fermati e chiedimi**
quale è la fonte di verità.

### 7 · Un solo terracotta in tutta l'app
La Home usa `#C96A45` per i bottoni primari, Guarda e Allenamento `#AB5A3B`.
Un valore solo, definito una volta nel foglio e letto da tutti. Scegli quale
regge meglio il contrasto del testo che ci sta sopra, **misuralo**, e dimmi
quale hai scelto. Dopo non deve esistere nessun altro punto che scriva un
terracotta a mano.

### 8 · Due primarie nella sessione
«Registra serie» ed «Esci» sono entrambi terracotta. «Esci» è un'uscita: va in
secondario. Controlla che non succeda altrove.

### 9 · I metadati della Home
Il meta della card grande è azzurro (`rgb(159,180,204)`), quello delle card volo
quasi bianco (`#F1F4FA`). Tutti a `#9BA0A8`, mai in grassetto, mai maiuscoli.

**Eccezione**: i numeri della striscia dei giorni **restano in grassetto** —
vengono dal mock congelato ed è una scelta.

### 10 · «Nessuna serie ancora» in grassetto
È un metadato: peso normale.

### 11 · Lo stato vuoto della Guarda in Inter
«Nessun titolo con questi filtri» va in **Fraunces**. Gli stati vuoti sono frasi
scritte da qualcuno: sono voce, non fatto.

### 12 · «UN MESE FA» diventa minuscolo ⚠️
`etichettaBattito` restituisce maiuscole. Diventa «un mese fa», «ieri»,
«domani».

⚠️ **cambia il mock congelato della Home**: aggiorna anche
`docs/mockups/home-v2-final-mock.html` e annota la decisione in
`docs/UI-DECISIONI-V2.md`.

### 13 · L'emoji nel saluto di ripiego
`app/components/keiko/keikoLive.ts:245` contiene `greeting: "Ciao Matteo 👋"`.
Via l'emoji. È l'unico punto in cui autorizzo a toccare `lib/`, ed è una stringa.

### 14 · Le emoji sulle card della Home
Sulle card compaiono 🏋️ 🎵 🥗. Sono **decorazione**, e convivono col pallino
colorato che fa già lo stesso mestiere: due sistemi di categoria sovrapposti.
Via le emoji, resta il pallino.

**Non toccare** l'emoji del battito, che è dato e non decorazione.

### 15 · Le faccine del voto quasi invisibili
Nella scheda del titolo, le faccine non selezionate sono grigie al limite della
visibilità. Portale a un contrasto leggibile a riposo: uno stato che non si
vede non è uno stato, è un indovinello.

### 16 · `Esc` non chiude i fogli
Da tastiera, i fogli si chiudono solo toccando fuori o trascinando. Aggiungi
`Esc`. Costa poco e vale su desktop.

---

## BLOCCO M · qualche ora l'uno

### 17 · «Registra serie» è un bottone che mente — **il più grave di tutti**
Non fa niente finché la card non è «attiva» e «Fatica» non è diversa da `—`, ma
resta pieno, non disabilitato, e non dice perché.

**Un clic non deve mai restare senza effetto e senza spiegazione.** O il bottone
è disabilitato e dice cosa manca («Tocca l'esercizio», «Imposta la fatica»), o
la registrazione funziona con la fatica facoltativa.

**Sospetto sulla causa**: potrebbe essere nato quando hai reso `fatica`
disponibile su tutte le discipline. Verifica se prima di quella modifica il
blocco c'era.

Questo va fatto **per primo del blocco M**, anche se non è il più economico:
un'azione che non fa quello che dice erode la fiducia più di dieci imperfezioni
di colore.

### 18 · Il fondo dell'app, e il lampo bianco
Sono lo stesso problema visto da due lati.

`app/globals.css` definisce `--background: #08111d` — il navy della UI v1 — e lo
mette sul `body` con un `background-image` e `background-attachment: fixed`.
`.k2` è corretto (`#0D0D10`) ma largo al massimo 430px: il navy si vede ai lati.
E all'apertura c'è un lampo bianco.

1. Il **primissimo pixel dipinto** dev'essere già scuro: colore di fondo su
   `html`/`body` nel primo CSS che arriva, `theme-color` allineata. Il lampo è
   del browser e arriva prima del nostro codice: metterci un logo non serve.
2. Il fondo diventa `#0D0D10`. Il navy sopravvive solo dove serve ancora alla
   UI v1: **verifica quali schermate ne dipendono** prima di cambiarlo
   globalmente, e se qualcuna si romperebbe dimmelo.
3. Poi la schermata d'avvio: nel foglio V2 esiste già `.k2 .boot` — fondo scuro,
   l'orca in teal che respira. **Si usa quella.** Non uno spinner, che finge una
   percentuale che non conosciamo; non un logo fermo, che sembra un blocco.
   Sparisce in dissolvenza quando arriva il primo dato, non a tempo.

### 19 · Il titolo del poster al 18% — capire, non correggere
Nella Guarda il colore calcolato del titolo del poster risulta
`rgba(255,255,255,0.18)` pur apparendo bianco pieno. **Prima capisci cosa
dipinge davvero quel testo**, poi decidi: se è un duplicato, togli quello sotto;
se è testo reale al 18% con qualcosa sopra, dimmi in quali stati resta scoperto.
Non mettere una pezza prima di aver capito.

### 20 · I meta dei poster della Guarda sono incoerenti
Nella stessa griglia convivono metadati lunghi («Vincitore di 4 Oscar…») e di
una parola («Film»). Un formato solo per tutta la lista: guarda cosa arriva
davvero dal dato e scegli quello **sempre disponibile**. Meglio una riga povera
ma uguale per tutti che una ricca a intermittenza.

---

## Fuori da quest'ondata — non farle

Sono nella lista dei lavori di prodotto, non qui, perché richiedono decisioni o
dati nuovi:

- **I testi generati presentati come fatti** nella Guarda («Odissea è l'ultimo
  film di Nolan, appena uscito»). È reale ed è grave — l'app promette di tacere
  su ciò che non sa — ma distinguere il generato dal verificato richiede di
  sapere quale campo viene da dove, e tocca `lib/films.ts`. Va in
  `docs/ROADMAP.md`, dove c'è già la voce gemella sul campo `info`.
- Il carosello di «In arrivo», lo scorrimento laterale fra le pagine, le azioni
  sulle card del cibo, i fogli ancora nella grafica vecchia, gli scheletri di
  caricamento per sezione.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. A **430 × 932 dpr 2 con le safe-area simulate**, e anche a **440px** — il
   difetto del fondo si vede solo sopra i 430. Screenshot prima/dopo di Home,
   Guarda e Allenamento.
3. Per ogni punto di colore o peso, la prova che il valore è cambiato: **lo
   stile calcolato, non l'occhio**.
4. Il punto 18 provalo aprendo l'app **da fredda**, non ricaricando una pagina
   già aperta.
5. Il punto 19 non è «fatto» finché non mi hai detto **cosa** era.
6. Il punto 17 provalo su tutti i percorsi: nessun clic deve restare senza
   effetto e senza spiegazione.

## Cosa consegnare

L'esito del punto 0 per primo, poi la lista voce per voce con **fatto / non
fatto / rotto**, poi tre righe: cosa hai sistemato, cosa hai lasciato aperto, e
ogni punto in cui hai dovuto decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
