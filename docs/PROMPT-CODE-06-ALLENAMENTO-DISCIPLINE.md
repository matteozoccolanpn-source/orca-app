# Allenamento — oltre i chili
### prompt per Claude Code · da eseguire in `orca-app`

> Non è un'ondata di restyling. Qui si tocca il **dato**: la sessione registra
> solo serie, ripetizioni e chili, quindi quando Matteo corre l'app gli chiede
> i chili. Va reso dipendente dalla disciplina.

---

## 0 · L'autorizzazione, e i suoi limiti

Matteo **autorizza esplicitamente**, solo per questo lavoro, a toccare `lib/` e
`app/api/`. La tabella su Supabase è **già stata modificata da lui**: le colonne
esistono, non serve nessuna migrazione e non si scrive SQL.

`workout_set` ha ora, oltre a quelle di prima:

| colonna | tipo | cosa contiene |
|---|---|---|
| `disciplina` | text | `pesi` `corsa` `nuoto` `bici` `camminata` `remo` `altro` |
| `distanza_m` | integer | metri — 5000 = 5 km, 1500 = 1500 m in vasca |
| `bpm_medio` | smallint | battito medio della serie, se c'è |
| `dislivello_m` | integer | metri di dislivello, per la bici |

Quelle di prima restano e non cambiano: `serie`, `ripetizioni`, `peso_kg`,
`secondi`, `fatica`. **`secondi` è la durata** e si riusa: non aggiungerne
un'altra.

Tutte le serie già registrate sono state marcate `pesi`.

Restano validi tutti gli altri vincoli di `AGENTS.md`, incluso: **mai
committare senza l'ok esplicito di Matteo**, `npx tsc --noEmit` e `npm run
build` verdi, niente rifattorizzazioni di file scollegati.

E resta il vincolo di sempre: **Keiko registra quello che Matteo ha fatto, non
prescrive quello che dovrebbe fare.** Nessun obiettivo suggerito, nessuna
andatura consigliata, nessun «dovresti».

## 1 · Cosa si tocca

- `lib/supabase.ts` — `WorkoutSetRow`, `WorkoutSetInput`, `logSet`, i `select`
  su `workout_set` (oggi elencano le colonne una per una: vanno aggiunte le
  quattro nuove), il mapper `toSet`, e `getLastPerformance`.
- `app/api/workout/session/route.ts` — far passare i campi nuovi.
- `app/allenamento/SessioneLive.tsx` — i campi che cambiano con la disciplina.
- `app/allenamento/AllenamentoView.tsx` — dove la serie viene riassunta.

**Non si tocca** `app/allenamento/page.tsx` se non per far arrivare i dati
nuovi, e non si tocca nient'altro.

## 2 · Come si sa che disciplina è

Due strade, e servono **entrambe**.

**La prima, automatica**: si indovina dal nome dell'esercizio, che arriva dalla
scheda del PT. Una tabella piccola in `lib/`, esplicita e leggibile — «corsa»,
«corri», «run», «tapis», «treadmill» → `corsa`; «nuoto», «vasca», «stile»,
«rana» → `nuoto`; «bici», «cyclette», «spinning» → `bici`; «camminata»,
«cammino» → `camminata`; «remo», «rower» → `remo`. Tutto il resto → `pesi`.

**La seconda, a mano**: nella schermata della sessione dev'esserci il modo di
**cambiare la disciplina** per quell'esercizio, perché il nome indovinato
sbaglierà. Un chip, o una riga con le opzioni. La scelta a mano vince sempre
sull'indovinata.

Non inventare un modello, non chiamare l'AI: è un dizionario, deve essere
prevedibile e leggibile a occhio.

## 3 · Quali campi, per disciplina

| disciplina | cosa si registra |
|---|---|
| **pesi** | serie · ripetizioni · peso_kg — esattamente come oggi |
| **corsa**, **camminata** | distanza · durata · battito medio |
| **nuoto** | distanza · durata · battito medio |
| **bici** | distanza · durata · dislivello · battito medio |
| **remo** | distanza · durata |
| **altro** | durata · fatica |

`fatica` resta disponibile ovunque, facoltativa come adesso.

**L'andatura non si registra: si calcola.** Da durata e distanza, e si mostra —
`5,0 km · 27'10" · 5:26/km`. Se la salvassimo, prima o poi i due numeri si
contraddirebbero. Per il nuoto l'andatura si esprime per 100 m, per la bici in
km/h.

## 4 · Come si inseriscono, che è la parte che conta

Gli stepper `Step` del sistema vanno bene per ripetizioni e chili, che sono
numeri piccoli. **Non vanno bene per il resto**, e usarli lì sarebbe il modo
peggiore di fare questo lavoro:

- **la durata** è un campo `mm:ss` (o `h:mm:ss` se serve), non uno stepper:
  nessuno arriva a 27 minuti premendo `+`. Tastierino numerico, formato chiaro.
- **la distanza** è un campo numerico con l'unità accanto, più due scorciatoie
  per gli scatti tipici — 100 m per corsa e bici, 25 m per il nuoto.
- **il battito** è un campo numerico, facoltativo, e resta vuoto se non ce l'hai.
- **il dislivello** idem.

Tutti i campi sono a **16px minimo**, altrimenti iOS ingrandisce la pagina al
primo tocco e non torna indietro. È già successo, non rifacciamolo.

Il vestito è quello V2: il foglio, gli stepper `Step` dove servono, le icone di
`app/components/v2/icons.tsx`, niente `lucide-react`.

## 5 · «L'ultima volta» deve confrontare la cosa giusta

Oggi `getLastPerformance` restituisce l'ultima prestazione e la schermata la
mostra accanto all'esercizio. Con le discipline, deve confrontare **come con
come**:

- pesi → `4 × 10 a 60 kg`
- corsa → `5,0 km in 27'10" · 5:26/km`
- nuoto → `1500 m in 32'00" · 2:08/100m`
- bici → `24 km in 48' · 320 m D+`

E non deve dire chi ha vinto. Mostra il dato di prima accanto a quello di
adesso: il giudizio lo fa Matteo, non Keiko.

## 6 · Le serie vecchie non si rompono

Tutte le serie già in tabella sono `pesi` e hanno le colonne nuove vuote. La
schermata deve continuare a mostrarle esattamente come prima. Verificalo:
apri lo storico e controlla che nessuna seduta passata cambi aspetto.

## 7 · Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. Registra una serie per **ogni** disciplina e verifica che arrivi in tabella
   con i campi giusti e gli altri a `null`. Intercetta le chiamate con
   Playwright come hai già fatto: si vede il payload vero senza toccare il
   database.
3. Verifica che la disciplina indovinata dal nome sia corretta su almeno dieci
   nomi presi dalla scheda vera, e che il cambio a mano vinca sull'indovinata.
4. Verifica che l'andatura calcolata sia giusta su tre casi a mano.
5. Verifica il punto 6: nessuna seduta passata cambia aspetto.
6. Su un telefono simulato a 430 × 932 dpr 2, con le safe-area: che i campi
   nuovi ci stiano senza andare a capo e che nessuno sia sotto i 16px.
7. Se qualcosa non lo puoi provare perché serve il login, dillo. «Convinto» non
   è «verificato».

## 8 · Cosa consegnare

Alla fine, **tre righe**: cosa hai portato, cosa hai lasciato aperto, e ogni
punto in cui hai dovuto decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
