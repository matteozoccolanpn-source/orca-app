# Blocchi 2 + 3 + 4 — la Home e tutto quello che si apre da lei
### prompt per Claude Code · da eseguire in `orca-app` dopo il prompt 08

> Tre blocchi di `docs/TODO-KEIKO.md` compattati in uno, perché toccano gli
> stessi file: `KeikoHomeV4.tsx` e i sette fogli. Fatti separati, rileggeresti
> 1571 righe tre volte.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; **non toccare `lib/` né `app/api/`**
salvo dove indicato; `npx tsc --noEmit` e `npm run build` verdi prima di ogni
commit; **mai committare senza l'ok esplicito di Matteo**.

**Il documento è diviso in tre parti, in ordine.** Se il margine finisce,
**fermati alla fine di una parte**, mai a metà, e dimmi dove sei arrivato. Ogni
parte lascia l'app in uno stato finito.

---

## PARTE 0 · Mezz'ora che ti fa risparmiare giornate

Fino a oggi **non sei mai riuscito ad aprire l'app vera in locale**:
`lib/require-login.ts` rimanda a `/login` e non ha nessuna scorciatoia. Ogni
ondata ha avuto la stessa frase — «non provato, serve la sessione» — e hai
costruito e smontato banchi finti a ogni giro. È il motivo per cui i difetti
arrivano sul telefono di Matteo invece che sul tuo schermo.

**Matteo autorizza**, solo per questo: aggiungi a `lib/require-login.ts` una
scorciatoia di sviluppo, con queste condizioni non negoziabili:

- si attiva **solo** con una variabile d'ambiente locale, mai presente in
  produzione;
- è guardata **anche** da `process.env.NODE_ENV !== "production"`, così anche se
  la variabile finisse per sbaglio su Vercel non farebbe niente;
- non tocca l'autenticazione vera: quando la variabile non c'è, il
  comportamento è identico a oggi, riga per riga;
- documentala in `AGENTS.md` in tre righe: come si accende, perché esiste, e
  che non deve mai stare in produzione.

Poi **verificala**: con la variabile accesa apri `/`, `/cucina`, `/allenamento`
e `/guarda` in locale coi dati veri; con la variabile spenta devi finire su
`/login` come adesso.

Da qui in avanti, **le prove di questo documento le fai sull'app vera**, non su
banchi finti. Se un comportamento non lo puoi provare, dillo — ma la scusa della
sessione non vale più.

---

# PARTE A · I fogli che si aprono

Sono 1571 righe ancora nel vestito vecchio. È l'ultima parte dell'app dove si
incontra la grafica di prima: apri una card bella e ci trovi dentro l'app
vecchia. Tutti passano al sistema V2 — `Sheet`, `SheetHero`, righe-azione
(icona quadrata, titolo, metadato, chevron), le icone di
`app/components/v2/icons.tsx`, zero `lucide-react`, zero emoji decorative.

### A1 · Il profilo — l'unico che si ripensa, non solo si riveste
`ProfileSheet.tsx`, 518 righe cresciute per accumulo. Oggi le voci sono, in
ordine sparso: nome, città, notifiche (mostrami i passaggi, invia prova),
battiti, allenamento & dieta, abbonamenti, consensi, come funziona Keiko,
esci, i tuoi dati, cancella tutto.

**Raggruppale così**, con un titolo di gruppo per ognuno:

- **Tu** — il tuo nome · la tua città
- **Le tue cose** — allenamento e dieta (obiettivo, livello, sessioni,
  vincoli) · i tuoi abbonamenti
- **Notifiche** — i passaggi · i battiti · invia una prova
- **Keiko** — come funziona, rivedi la presentazione
- **Privacy e dati** — i consensi · i tuoi dati

E in fondo, staccate e **terziarie**: «Esci», e per ultima «Cancella tutto»,
con conferma a due tocchi dentro il foglio — mai `window.confirm`.

Le chiamate restano quelle di oggi: `/api/profile`, `/api/consents`,
`/api/push/test`, `/api/account/delete`. Non toccarle.

### A2 · Il calendario e il giorno
`CalendarSheet.tsx` (61) e `DaySheet.tsx` (136). I chip data devono
somigliare alle pillole della striscia settimanale della Home: oggi i due
calendari dell'app sembrano di due app diverse. Griglia sulla spaziatura 4/8.

### A3 · «Chiedi a Keiko»
`AskSheet.tsx` (112) → la barra `Ask` e il pannello `AskPanel` del sistema:
fermo → sta pensando (scheletri, non lo spinner) → risultato con il perché in
teal → pollici e «spiegami perché». La chiamata `/api/ask` non cambia.

### A4 · La card evento e la sua modifica
`EventSheet.tsx` (150) → `Sheet` + `SheetHero`: metadato, titolo Fraunces,
corpo, righe-azione con la primaria in alto. La schermata di **modifica** segue
lo stesso schema: campi a **16px minimo**, altrimenti iOS ingrandisce la pagina
al primo tocco e non torna indietro.

### A5 · Il tasto «+»
`CaptureSheet`. Rivestilo con il sistema, e **cambia il wording**: oggi è un
elenco di opzioni, deve essere un invito.

⚠️ **Non frammentarlo.** Il «+» è l'imbuto unico che digerisce testo e
screenshot in qualsiasi dominio: è la cosa più preziosa e più fragile dell'app.
Non trasformarlo in tanti moduli specifici per renderlo più chiaro — **insegna
cosa fa**, non cambiarlo. Un esempio o un segnaposto che ruota, non un menu.

### A6 · `ds.css` esce di scena
È rimasto importato in `KeikoHomeV4.tsx` e in `CucinaView.tsx` **proprio perché
questi fogli erano ancora vecchi**. Quando A1–A5 sono finiti, verifica che
nessuna classe `ds-*` sia più usata da quello che hai toccato, e togli l'import
dove è diventato inutile. Se qualcosa ne dipende ancora, **dimmelo invece di
toglierlo e sperare**.

**Dopo la parte A**: non si incontra più il vestito vecchio da nessuna parte.

---

# PARTE B · Le rifiniture della Home

Tutte piccole, tutte insieme. Sono nella Home e nel foglio V2.

1. **Meno spazio** fra la barra di ricerca e il saluto: il margine di `.greet` è
   eccessivo. ⚠️ cambia il mock congelato → aggiorna
   `docs/mockups/home-v2-final-mock.html`.
2. **«In arrivo» diventa un carosello** orizzontale: `.shelf` con lo
   scroll-snap che hai già messo ai chip, così non si ferma a metà card.
   ⚠️ cambia il mock congelato → aggiornalo.
3. **Le card di «Oggi per te» hanno la foto**: `Content` accetta già l'immagine,
   e `catFor`/`glyphFor` danno il gradiente di categoria quando la foto manca.
   Va collegato.
4. **Il saluto dice anche il prossimo impegno**: l'ora c'è già, il dato del
   prossimo evento è nella riga di stato. Una riga.
5. **Il riepilogo della giornata si tocca** e apre il `DaySheet`, che esiste
   già. È collegare, non costruire.
6. **Gli stati vuoti hanno una frase**: usa `Empty`, ma scrivi le frasi — uno
   stato vuoto è una frase, non un'icona. Almeno: nessun evento nel giorno
   scelto, nessun to-do, niente in «In arrivo».
7. **L'indicatore «oggi»** più chiaro nella striscia dei giorni.
8. **Il tasto «Fatto»** dell'allenamento è troppo grande: ridimensionalo
   coerentemente con gli altri.
9. **«Aggiungi promemoria» diventa «Cosa non devi dimenticare».**

**Dopo la parte B**: la Home è finita.

---

# PARTE C · Il pannello al posto del salto — **solo Home**

È il cambio più importante della lista, e va fatto **solo sulla Home**. Se
funziona, si estenderà altrove: non anticipare.

### C1 · La card apre un pannello, non una pagina
Oggi toccare una card della Home porta a un'altra sezione. Deve invece aprire
un **pannello sopra la Home** (`Sheet` + `SheetHero`) con:

- **le azioni vere**, che le rotte hanno già: per l'allenamento «avvia» e
  «segna fatto» (`/api/workout/log`, la sessione); per il cibo «apri la
  ricetta»; per un titolo «dove vederlo»;
- in fondo, una riga per **andare alla pagina intera** se la vuoi davvero.

Le rotte non cambiano e i nomi dei dati nemmeno.

⚠️ **Dove il dato per un'azione non esiste, non inventarla**: metti solo le
azioni che il codice sa già fare, e dimmi quali hai dovuto lasciare fuori.

### C2 · Le azioni rapide si fanno col tocco lungo, **non con lo swipe**
Matteo aveva chiesto lo scorrimento laterale sulle card per fatto / rimanda /
elimina. **Non si fa così**, e il motivo è tecnico: lo scorrimento laterale è
già destinato a cambiare sezione, e sulla stessa schermata il telefono dovrebbe
indovinare nei primi dieci pixel quale dei due vuoi. Qualunque soglia si scelga,
una delle due parte per sbaglio.

Quindi: **tocco lungo**, con lo stesso schema che hai già in `Poster` nella
Guarda — `pointerdown/move/cancel`, il movimento annulla, il tap normale apre il
pannello. Coerente con quello che l'app fa già.

### C3 · Le animazioni uguali ovunque
`framer-motion` è già nel progetto e i fogli V2 hanno già l'entrata. Rendila la
stessa per tutti i pannelli, con la stessa durata e la stessa curva.

### C4 · La regola va scritta, non solo implementata
Aggiungi a `docs/UI-DECISIONI-V2.md` la regola nuova: **«dalla Home, toccare una
card apre un pannello con le azioni; la pagina intera è una scelta esplicita in
fondo al pannello»**, e che **le azioni rapide sono il tocco lungo, non lo
swipe, perché lo swipe è del cambio pagina**. Con il perché, non solo la regola.

**Dopo la parte C**: dalla Home fai le cose senza uscire dalla Home.

---

## Come verificare

Adesso che hai il login in locale (parte 0), le prove si fanno **sull'app vera**.

1. `npx tsc --noEmit` e `npm run build` verdi.
2. A **430 × 932 dpr 2 con le safe-area simulate**, e anche a **440px**.
   Screenshot prima/dopo di ogni foglio toccato.
3. Apri **ogni** foglio dall'app vera e chiudilo. Nessuno deve mostrare
   `lucide-react` (`svg.lucide` = 0) né emoji decorative.
4. Per la parte C: da ogni tipo di card della Home, apri il pannello, prova
   ogni azione, e verifica che la chiamata di rete che parte sia la stessa di
   prima. Il tocco lungo va provato col movimento che lo annulla.
5. Prova gli stati scomodi: nessun to-do, nessun evento, niente in «In arrivo»,
   nessuna città impostata, primo avvio con l'onboarding.
6. Per i campi di testo: nessuno sotto i **16px**.

## Cosa consegnare

Per ogni parte: la lista voce per voce con **fatto / non fatto / rotto**, e in
fondo tre righe — cosa hai portato, cosa hai lasciato aperto, e ogni punto in
cui hai dovuto decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
