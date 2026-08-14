# Blocco 7 — la Cucina che annota
### prompt per Claude Code · da eseguire in `orca-app` dopo il blocco 6

> È il blocco più grosso e il più importante di tutta la lista. Oggi la Cucina
> è l'unica sezione dell'app che **non sa niente di te**: il piano si legge e
> non si annota. Da qui in poi sa cosa hai mangiato davvero.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano
semplice; niente rifattorizzazioni di file scollegati; `npx tsc --noEmit` e
`npm run build` verdi prima di ogni commit; **mai committare senza l'ok
esplicito di Matteo**.

**Autorizzazione limitata**: puoi toccare `lib/supabase.ts`, `lib/cucina.ts` e
`app/api/cucina/` per quello che serve a questo blocco. Niente altro in `lib/`.

Hai il login di sviluppo: le prove si fanno **sull'app vera**, premendo, con
`.env.local` su `prova@keiko.local`.

---

## 0 · IL PALETTO — leggilo prima di tutto, e rileggilo se ti viene un dubbio

**Keiko non scrive e non modifica un piano alimentare** (art. 348 c.p.), e non
interpreta dati sanitari. Il piano è della nutrizionista.

Quello che si costruisce qui è un **registro**: Matteo dice cosa ha mangiato,
Keiko lo scrive. Punto.

🚫 In questo blocco **non esiste**:
- nessun confronto fra quello che hai mangiato e il piano;
- nessun giudizio, nemmeno implicito — niente ✓ verde e ✗ rosso, niente
  «aderenza», niente percentuali, niente «hai seguito il piano al 70%»;
- nessuna caloria, nessun macro, nessuna quantità che Keiko calcoli da sé;
- nessun suggerimento di cosa mangiare al posto di.

✅ Quello che esiste: **cosa hai mangiato, e quando.** Senza commento.

Se una schermata che stai costruendo ti sembra voler dire se hai fatto bene o
male, **è fuori dal blocco**: fermati e segnalamelo.

---

## 1 · Prima cosa: la ricognizione, e l'SQL lo scrivi tu

**Non inventare nomi di tabelle e colonne, e non dare per scontato che
esistano.** Oggi è già successo: un `alter table` mai lanciato ha fatto
sparire l'apertura di tutte le sedute, e né `tsc` né il build se ne sono
accorti.

Quindi, prima di scrivere una riga di codice:

1. leggi come sono fatti **il piano** (`DietWeek`, i pasti, le loro chiavi:
   quali sono esattamente, e come si identifica un pasto di un giorno) e **il
   ricettario** (la tabella delle ricette, il nome vero e la chiave primaria);
2. scrivi **l'SQL della migrazione**, completo, che Matteo lancerà su Supabase.
   Con `if not exists`, con i vincoli, e con l'ultima riga
   `notify pgrst, 'reload schema';` — quella che oggi ci ha salvati;
3. **fermati e mandamelo.** Non scrivere codice che dipende da colonne che non
   esistono ancora.

Quello che il registro deve poter dire, per ogni pasto di ogni giorno:

- **l'ho seguito** — ho mangiato quello che c'era scritto;
- **ho mangiato altro** — e cosa, in parole mie;
- **l'ho saltato**;
- e se quello che ho mangiato viene dal **ricettario**, quale ricetta.

Più: quando l'ho annotato, ed eventualmente una **foto** del piatto.

Un pasto di un giorno si annota **una volta sola**: annotarlo di nuovo
corregge, non aggiunge. Pensa a come garantirlo in tabella e non solo nel
codice.

---

## 2 · Il caso che conta più di tutti

È quello che Matteo ha descritto, ed è il cuore del blocco:

> Il piano dice **pollo e zucchine**. Cerco «pollo» nel ricettario, trovo una
> ricetta di pollo, la scelgo. Keiko registra che quel pasto l'ho fatto **con
> quella ricetta**.

Quindi il legame ricetta ↔ pasto **nasce qui**, e nasce da una **scelta
esplicita di Matteo** — mai da una somiglianza di testo.

⚠️ **Non cercare la ricetta dal testo del pasto.** «Melone 150g» → cerca melone
nel ricettario è la scorciatoia ovvia, ed è indovinare un legame che nessuno ha
stabilito: la prima volta che sbaglia, l'app mente. Il collegamento lo fa il
dito di Matteo, sempre.

Quando questo legame esiste, si sblocca da solo anche **«come si cucina» nel
pannello della Home**, che è appeso da giorni ad aspettarlo. Non costruirlo qui:
verifica solo che il dato ci sia, e dimmelo.

---

## 3 · La Cucina si apre sul prossimo pasto

**Oggi** la Cucina mostra il piano del giorno tutto uguale. **Deve diventare**:
il **prossimo pasto in evidenza**, i passati sopra (raccolti, non spariti), i
successivi sotto.

`PastoDelGiorno` ha già il concetto di «passato», deciso dall'orologio: è
impaginazione, non logica nuova.

Su ogni pasto, le azioni del punto 1 — seguito / altro / saltato — raggiungibili
senza aprire niente. E su quello in corso, la strada verso il ricettario per il
caso del punto 2.

---

## 4 · Lo storico

Cosa hai mangiato, giorno per giorno, consultabile a colpo d'occhio.

Stessa forma dello storico degli allenamenti che hai appena fatto: schermata
piena e non foglio (si scorre indietro nel tempo, e un foglio si chiude
trascinando in giù — sono due gesti opposti), lettura **paginata** con il
cursore sulla data e non sul numero di pagina, e lo stato vuoto scritto.

Riusa quello che hai imparato lì: le due scelte di `getSessionPage` valgono
uguali qui.

🚫 Nello storico **nessun totale, nessuna percentuale, nessuna riga di
riepilogo che valuti**. Un elenco di giorni e cosa c'era dentro.

---

## 5 · La foto del piatto

Una foto per dire cosa hai mangiato, invece di scriverlo.

La macchina esiste già ed è la stessa della scheda del PT: si carica
un'immagine, il modello la legge, ne esce del testo. Qui il testo è «cosa c'è
nel piatto», e finisce nel campo del punto 1.

🚫 **Solo cosa**, non quanto. Nessuna stima di porzioni, nessun macro: quella è
interpretazione nutrizionale e non la facciamo. Se il modello la produce
spontaneamente, buttala via prima di salvarla.

Se questo pezzo allunga troppo il blocco, **fallo per ultimo e dimmelo**: gli
altri quattro punti valgono anche senza.

---

## 6 · La notifica all'ora dei pasti

Le notifiche esistono già (`public/sw.js`). Alle ore dei pasti, una domanda:
**«Cosa hai mangiato?»**

⚠️ Non «hai mangiato come da dieta?» — quella è una domanda che giudica, e
cambia la natura di tutto il blocco. La differenza non è formale.

Deve poter essere spenta, e deve rispettare l'ora vera dei pasti del piano, non
un orario fisso inventato.

Anche questo, se allunga troppo: per ultimo, e dimmelo.

---

## 7 · Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. **Premendo, sull'app vera**, sull'utente di prova: annota un pasto come
   seguito, uno come «altro» scrivendo cosa, uno saltato, e uno collegandolo a
   una ricetta del ricettario. Verifica che arrivi in tabella con i campi
   giusti, e che ri-annotarlo **corregga** invece di aggiungere una riga.
3. **Gli stati vuoti**: nessun piano caricato, nessuna annotazione, storico
   vuoto. Sono i tre che si vedono di più all'inizio.
4. Verifica che chi **non ha un piano** veda comunque una Cucina sensata.
   ⚠️ Oggi hai messo due volte una porta dentro il ramo «c'è la scheda» in
   Allenamento, e tutte e due le volte era invisibile proprio a chi serviva.
   Qui il ramo equivalente è «c'è il piano»: guardalo per primo.
5. A **430 × 932 dpr 2 con le safe-area**, e con la rete rallentata: scheletri,
   non spinner.
6. Verifica che il piano **non cambi**: le annotazioni vivono accanto, non
   dentro. Se una riga del piano si modifica, è un difetto grave e va fermato
   tutto.

## 8 · Cosa consegnare

Prima l'**SQL** e poi ti fermi, come dice il punto 1.

Poi, a lavoro finito: voce per voce con **fatto / non fatto / rotto**, e tre
righe — cosa hai portato, cosa hai lasciato aperto, e ogni punto in cui hai
dovuto decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
