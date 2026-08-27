# Il viaggio caricato da fuori — versione «parto fra poco»
### prompt per Claude Code · da eseguire in `orca-app`

> ⚠️ **Questo prompt ha una scadenza vera**: Matteo parte fra pochi giorni e
> vuole usarlo in viaggio. Quindi la regola è **noioso e funzionante** invece che
> elegante e a metà. Tutto quello che non serve a partire è tagliato, ed è
> elencato in fondo.
>
> Il mock è `docs/mockups/viaggi-mock.html` — **guardalo**: è il riferimento
> visivo per le PARTI 1 e 2. Le PARTI 3 e 4 (le foto e la scheda dell'attività)
> nel mock **non ci sono**: sono descritte qui, e dove i due divergono **vale
> questo documento**.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate; niente rifattorizzazioni di
file scollegati; `npx tsc --noEmit` e `npm run build` verdi prima di ogni
commit; **mai committare senza l'ok esplicito di Matteo**.

Hai il login di sviluppo. ⚠️ Verifica quale utente stai guardando **dai dati**,
non dalla variabile.

---

## Il principio, in tre righe

**Keiko non pianifica il viaggio: lo assembla da quello che è vero.**

Carichi i documenti — il PDF del volo, il voucher dell'hotel, il programma
dell'agenzia — e Keiko ne cava fuori **date, orari, codici, indirizzi**, li mette
in una linea del tempo, e risponde a domande **solo su quello che c'è dentro**.

🚫 **Non inventa niente.** Se la risposta non è nei documenti, dice che non lo sa.
È la stessa regola dei passi di una ricetta, e vale identica qui: un orario
sbagliato in aeroporto è peggio di nessun orario.

⚠️ **Non toccare i bottoni che già esistono** in `app/viaggio/ViaggioView.tsx`.
Tre azioni su quattro oggi mentono (`SPEC-VIAGGI-DIREZIONE.md §1`), e ripararle
non è questo lavoro. **Questa è roba nuova, che non passa da lì.**

---

## LA REGOLA CHE TIENE INSIEME TUTTO IL DOCUMENTO

Da qui in poi Keiko dirà anche cose che **non** stanno nei documenti — gli orari
di un museo, una foto, un video. Quindi serve una linea, e va rispettata ovunque:

> **Due provenienze, mai mescolate nella stessa frase.**
>
> **① Dai tuoi documenti** — il volo, l'hotel, il programma. Sono **fatti**:
> hanno un orario, un codice, e il nome del file da cui vengono. Non si
> riscrivono.
>
> **② Trovato adesso sul web** — orari, indirizzi, prezzi, video. Sono
> **informazioni**: hanno una fonte, un collegamento, e **il momento in cui sono
> state prese**.

Si vedono diverse a colpo d'occhio e non finiscono mai nello stesso paragrafo. Il
motivo è pratico: davanti al gate, «il tuo volo parte alle 07:25» e «di solito i
voli per Lisbona partono la mattina» devono essere distinguibili in mezzo
secondo.

🚫 E resta valido sopra tutto: **quello che non si sa, si dice.** Né dai documenti
né dal web vuol dire **non lo so**, non una frase ragionevole.

---

# PARTE 0 · Ricognizione e SQL — ~20 minuti, poi ti fermi

**Non inventare nomi di tabelle e colonne.** È già successo due volte in questo
progetto e la seconda ha rotto l'apertura di tutte le sedute.

Dimmi:

1. **I PDF si leggono già?** Il caricamento della dieta e la scheda del PT
   digeriscono immagini — ma un PDF? Se serve una libreria, dimmi quale e quanto
   pesa. **È la domanda che decide i tempi di tutto**;
2. come sono fatti oggi **`tickets`** e le tabelle dei viaggi
   (`app/api/trip/*`, `lib/trip-enrich.ts`): c'è già un posto dove un documento
   caricato e i fatti che ne escono possono stare, o serve una tabella nuova?
3. **la macchina dell'estrazione**: `/api/cucina/estrai` prende un testo e ne cava
   una struttura. Quanto è riusabile così com'è, cambiando solo cosa si chiede?

Poi scrivi **l'SQL della migrazione**, completo, con `if not exists`, i vincoli, e
l'ultima riga `notify pgrst, 'reload schema';`. **Fermati e mandamelo.**

Quello che il dato deve poter dire, per ogni documento:

- **il file**, conservato e riapribile — l'originale è la prova;
- **i fatti che ne sono usciti**: giorno, ora (di inizio e, dove c'è, di fine),
  cosa, dove, il codice di prenotazione;
- **da quale documento viene ogni fatto**, sempre. Un fatto senza fonte non è un
  fatto;
- a quale **viaggio** appartiene.

⚠️ **Un viaggio, più documenti.** Caricarne uno nuovo **aggiunge** e non ricalcola
niente. Oggi `syncTripPlans` rimette il viaggio su `pending` e ripaga tutto: qui
non deve succedere.

---

# PARTE 1 · Carichi, e vedi la linea del tempo

**Dove vive**: una pagina nuova. Non innestarla dentro `ViaggioView.tsx`, che è
il file dei bottoni che mentono — ci si arriva da lì con un collegamento, ma il
codice è separato. Se hai un'idea migliore dimmela, ma **spiega perché** prima di
farla.

## 1.1 · Il caricamento

- **uno o più file insieme**, PDF e immagini;
- mentre lavora **si vede che lavora**, con tre righe che si sostituiscono:
  «leggo il documento» → «cerco date, orari e codici» → «lo incastro con quello
  che c'è già». Non uno spinner muto: l'estrazione dura decine di secondi;
- se un file **non si legge**, lo dice per quel file e **gli altri proseguono**.
  Un PDF scansionato male non può far fallire il caricamento del volo.

## 1.2 · Cosa si cava fuori

Per ogni documento, una lista di **fatti**: giorno, ora, cosa, dove, codice.

🚫 **Niente parafrasi.** «Volo TP 837, MXP 07:25 → LIS 09:20, prenotazione
JHQ4TZ» si scrive così com'è. Non «partirai la mattina presto da Milano».

⚠️ **L'anno.** I documenti di viaggio spessissimo scrivono «12 SET» senza anno.
Dimmi come lo risolvi — dedurlo dal contesto è ragionevole, indovinarlo no.

⚠️ **I fusi orari.** Un volo che parte alle 20:40 da Lisbona e arriva alle 00:15
a Milano non dura 3h35. Se non sai gestirli, **scrivi gli orari come sono scritti
sul documento e non fare aritmetica** — è la scelta giusta per adesso.

## 1.3 · Cosa si vede

- la **testata**: destinazione, date, quanti documenti;
- **il documento**, con dentro i fatti che ne sono usciti, e un modo per **aprire
  l'originale**;
- la **linea del tempo giorno per giorno**: i fatti in ordine di ora, ognuno con
  **il codice di prenotazione e il nome del documento da cui viene**;
- **funziona senza rete** per quello che è già stato caricato. È il punto in cui
  serve davvero: in aeroporto, in roaming, con la batteria a metà. Se non ce la
  fai in tempo dimmelo, ma provaci — vale più della metà del resto.

## 1.4 · I biglietti che Matteo ha già caricato — non è un extra, è correttezza

⚠️ **Questo va dentro la PARTE 1, non dopo.** Keiko ha già i biglietti di Matteo:
sono arrivati dal «+» e stanno in `tickets`. Se la schermata nuova gli chiede di
ricaricare il volo che ha già dato all'app **due mesi fa**, il prodotto è
sbagliato — e sarebbe la contraddizione fra sezioni che è già costata cara
(`B-04` dell'audit Cucina: lo stesso pasto annotato in due posti che non si
parlano).

**Cosa deve succedere:** apri il viaggio e **i biglietti che c'entrano con quelle
date ci sono già**, nella stessa linea del tempo dei fatti estratti dai
documenti. Stessa forma, provenienza diversa: «dal biglietto che avevi già»
invece di «da volo-TP837.pdf».

### La cosa che può rompersi, ed è la sola che mi preoccupa

**Il doppione.** Se lo stesso volo sta sia in `tickets` sia nel PDF che carichi,
deve comparire **una volta sola**.

- si riconoscono per **il codice di prenotazione**, e in mancanza di quello per
  data + ora + numero del volo;
- il fatto unito **porta tutte e due le provenienze**, non una scelta silenziosa;
- ⚠️ **se i due non concordano** — un orario cambiato, un gate diverso — si
  mostrano **tutti e due**, dicendo da dove vengono. Scegliere in silenzio quale
  è vero è la cosa peggiore che questa schermata possa fare.

⚠️ **Dimmi come li riconosci prima di scriverlo**, con un esempio vero preso dai
biglietti che ci sono in tabella.

🚫 **Non toccare `syncTripPlans`** e non far ripartire niente: qui si **legge** da
`tickets`, non si riscrive.

**Fermati qui e dimmi com'è andata.** La PARTE 1 da sola è già utile in viaggio.

---

# PARTE 2 · Chiedi al viaggio

Un campo, e la risposta **presa dai documenti caricati**.

- la risposta **cita i documenti da cui viene** — come la fonte dei passi nel
  ricettario;
- 🚫 **se non è nei documenti, si dice.** «Non lo so: non è scritto in nessuno dei
  documenti che mi hai dato.» Mai una risposta plausibile costruita dal buon
  senso: «di solito per il Portogallo basta la carta d'identità» è esattamente il
  tipo di frase che manda qualcuno in aeroporto senza il documento giusto;
- tre o quattro esempi toccabili che precompilano il campo.

⚠️ **Il costo**: mandare al modello tutti i documenti interi a ogni domanda è caro
e lento. Dimmi quanto costa una domanda **misurata**, non stimata. Se è troppo,
la prima leva è mandargli **i fatti già estratti** invece dei testi originali —
sono cento volte più corti e sono quello che serve per rispondere.

🚫 **Il peso AI non è 10.** `spendAi("viaggio")` pesa 10 perché doveva generare un
itinerario con verifica web. Leggere un documento e rispondere su quello che c'è
scritto **non è quel mestiere**: usa il peso della cattura, e se non ti torna
dimmelo con i numeri.

---

# PARTE 3 · Le foto

Oggi la sezione è testo grigio. Una schermata di viaggio senza immagini non
sembra un viaggio — è la stessa diagnosi che l'audit ha fatto sulla Cucina
(«un'app di cucina senza una sola fotografia»).

## 3.1 · Cosa ha una foto, e cosa no

- **un luogo** — l'hotel, il museo, il punto di ritrovo, il ristorante: **la sua
  foto vera**, da Google Places, che l'app usa già;
- **la destinazione** — una foto della città, in cima al viaggio;
- **un volo, un treno, un check-out**: **nessuna foto**. Non sono luoghi, e
  metterci un'immagine decorativa di un aeroporto è riempimento. Restano come
  sono, con l'orario grande.

## 3.2 · Il costo, che qui è la cosa seria

Google Places **si paga a ricerca**, e un viaggio di cinque giorni può avere
quindici luoghi.

- **una foto per luogo, memorizzata per sempre** — e **anche il risultato
  negativo**, così un posto senza foto non si richiede ogni volta. La memoria
  c'è già nel codice: verificane il funzionamento prima di aggiungere chiamate;
- ⚠️ **dimmi quante chiamate parte davvero un viaggio vero**, misurate. È il
  numero che dice se questa parte è sostenibile o va limitata ai luoghi che si
  aprono;
- se un viaggio ne genera troppe, la leva è **chiedere la foto solo quando il
  luogo si apre**, non quando compare in lista. Proponimelo con i numeri.

## 3.3 · Quando la foto non c'è

**Un ripiego disegnato, non un errore.** Sfumatura per tipo di luogo + l'iniziale
del nome in Fraunces a bassa opacità, come nel ricettario. Deve sembrare una
scelta.

🚫 Nessuna icona di immagine rotta, mai. È il difetto più visibile che l'audit ha
trovato nella Cucina, e non si ripete qui.

## 3.4 · Come si vedono

Usa `.ph` e `.hero` di `app/keiko-v2.css` **così come sono** — stesso filtro
`saturate(1.12) contrast(1.02)`, stesso doppio scrim, stessi toni d'attesa. Non
scrivere un componente foto nuovo: ce n'è già uno e funziona.

---

# PARTE 4 · La scheda dell'attività

**Toccando un fatto della linea del tempo** si apre la sua scheda. È qui che
vivono le due cose nuove.

## 4.1 · Le domande di seguito

Tre o quattro domande **su quella cosa lì**, toccabili, che precompilano il campo.

⚠️ **Non farle generare al modello.** Dipendono dal *tipo* di fatto, e una tabella
le risolve a costo zero — è la stessa scelta della regola gratis nel filtro delle
ricette:

- **volo** → «quando apre il check-in?» · «quanto bagaglio ho?» · «da che
  terminal parto?»
- **hotel** → «da che ora posso entrare?» · «come ci arrivo dall'aeroporto?» ·
  «la colazione è inclusa?»
- **luogo o visita** → «a che ora chiude?» · «quanto ci metto ad arrivarci?» ·
  «serve prenotare?»
- **treno** → «da che binario parte?» · «il biglietto è aperto?»

**La risposta segue la regola delle due provenienze**: prima guarda nei
documenti; se lì c'è, risponde citando il file e **si ferma**. Se lì non c'è, non
inventa: **offre di cercarlo**, e solo se tocchi parte la ricerca — e allora la
risposta arriva marcata «trovato adesso» con la fonte e l'ora.

🚫 Nessuna ricerca automatica all'apertura della scheda. Aprire una cosa non deve
costare niente, mai — è la stessa regola del ritentativo nel ricettario.

## 4.2 · I video, a richiesta

Un bottone per luogo: **«Guardalo su TikTok»**, **«Guardalo su YouTube»**.

- 🚫 **il video non si incorpora e non si scarica.** Il tocco porta sulla
  piattaforma: la visualizzazione è di chi l'ha girato. È una decisione già presa
  e scritta nel ricettario, e vale identica qui;
- ⚠️ **il collegamento porta a una ricerca, non a un video specifico.** «Cerca
  *Museo do Fado Lisbona* su TikTok» è sempre vero; un link a un video preciso è
  la stessa bugia dei bottoni che oggi non fanno niente — quel video può sparire,
  o non essere di quel posto;
- **solo se lo chiedi.** Nessuna anteprima caricata da sola: costa banda in
  roaming, che è esattamente dove sarai.

## 4.3 · E cosa c'è già dentro la scheda

L'orario, il codice di prenotazione, l'indirizzo, la foto, e **il documento da cui
viene**, riapribile. Quelli sono i fatti e stanno in cima. Tutto il resto — le
domande, i video — sta sotto e si vede che è un'altra cosa.

---

# PARTE 5 · La cucitura con il resto di Keiko

> È il §③ di `VIAGGI-FUNZIONI.md`, e il revisore esterno ha detto che è **la cosa
> che non ha visto in nessuna delle altre dieci app**: non l'agenda, non la
> watchlist — la cucitura fra i domini. Nessuno la fa perché nessuno ha
> contemporaneamente i tuoi biglietti, la tua scheda, il tuo piano e la tua lista.

Costano poco perché **i dati sono già tutti in casa**. Fai questi tre, in
quest'ordine, e fermati dopo ognuno.

## 5.1 · Il volo e la tua lista — costo zero

Il volo di ritorno dura 2h35. Nella lista di «Guarda» ci sono dei film che ci
stanno dentro. Keiko lo dice **il giorno prima**.

Sono **due numeri già in casa**: la durata del film ce l'hai in `lib/films.ts`,
la durata del volo esce dal biglietto. Nessuna chiamata a nessun modello.

⚠️ Se gli orari del volo non li hai in un fuso solo, **non calcolare la durata**:
saltala e dimmelo. Meglio non dirlo che dirlo sbagliato.

## 5.2 · Il check-in, e solo i fatti con un'ora

Il check-in del volo apre 24 ore prima: è **verificabile**, quindi Keiko lo può
dire. Le notifiche esistono già (`public/sw.js`).

> **Gli avvisi dei viaggi sono solo quelli che hanno un'ora certa.**

✅ «Domani parti alle 6:00» · «Il check-in apre fra un'ora» · «Il treno per
Cascais è alle 09:12»
🚫 «Dovresti dormire presto» · «Ricordati il caricabatterie» · qualunque cosa che
non abbia un orario dietro.

Deve poter essere spenta.

## 5.3 · I giorni fuori non sono buchi

Sei via cinque giorni e la scheda del PT ne prevede quattro sedute. **Keiko non
ti dice cosa fare** — la scheda è del preparatore — ma **segna che quei giorni
eri fuori**, così «A che punto sei» non li conta come assenze.

Stessa cosa per la Cucina: in viaggio il piano non si applica, quindi Keiko
**smette di chiederti del piano** e continua solo a registrare cosa hai mangiato,
senza riferimento.

⚠️ Questo tocca due sezioni che non sono tue in questo prompt. Quindi:
**guarda cosa serve e dimmelo**, con l'elenco preciso dei file. **Non scrivere
niente in Allenamento e in Cucina senza il mio ok.**

🚫 Nessun giudizio, in nessuna delle due: «eri via» è un fatto, «hai saltato» no.

## 5.4 · Quello che resta fuori anche da qui

🚫 La valigia (§12 di `VIAGGI-FUNZIONI.md`) — buona idea, vuole il meteo, non
serve a partire. 🚫 La memoria dei viaggi passati (§6-8). 🚫 Il viaggio condiviso
(§14).

---

## Cosa NON si fa adesso — è tagliato apposta

- 🚫 **i buchi e le proposte**: non servono a partire. Il mock ce li ha, restano
  nel mock;
- 🚫 **i link affiliati** e tutto il §5 di `VIAGGI-FUNZIONI.md`. ⚠️ Vale anche per
  i collegamenti a TikTok e YouTube della PARTE 4: sono ricerche normali, senza
  nessun codice di affiliazione. Il giorno che ce ne fosse uno, va **dichiarato**;
- 🚫 **riparare i bottoni** di `ViaggioView.tsx`;
- 🚫 **`matchTicket` così com'è**: il ponte vecchio andava dalle tappe inventate
  dall'AI ai biglietti. Qui il verso è opposto e più semplice — i biglietti
  **sono** fatti, e stanno in lista come gli altri (PARTE 1.4). Non resuscitare
  il vecchio giro;
- 🚫 **restyling** del resto della sezione.

Se ti avanza tempo **non prendere di iniziativa uno di questi**: dimmelo e basta.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. **Con i documenti veri di Matteo**, non con file inventati. Chiediglieli: sono
   la prova che conta, perché è quel viaggio che deve funzionare.
3. **Il caso che decide tutto**: una domanda la cui risposta **non è** nei
   documenti. Deve dire che non lo sa. Se inventa una risposta ragionevole, è
   rotto — anche se la risposta è giusta.
4. **Due documenti che si contraddicono** (un orario cambiato): deve mostrarli
   tutti e due dicendo da dove vengono, non sceglierne uno in silenzio.
5. Un **PDF illeggibile** insieme a due buoni: gli altri due passano.
6. **Senza rete**: la linea del tempo di un viaggio già caricato si vede lo
   stesso.
7. A **430 × 932 dpr 2 con le safe-area**.

8. **Le due provenienze**: apri una scheda, fai una domanda che sta nei documenti
   e una che non ci sta. Devono **vedersi diverse a colpo d'occhio**, e la seconda
   deve portare la fonte e l'ora.
9. **Un luogo senza foto**: ripiego disegnato, mai icona rotta.
10. **Il doppione**: carica il PDF di un volo che è **già** in `tickets`. Deve
    comparire **una volta sola**, con tutte e due le provenienze. È la prova che
    decide se la PARTE 1.4 funziona.

## Le fermate

1. **PARTE 0** — le tre risposte e l'SQL. Fermati.
2. **PARTE 1** — carichi e vedi. Fermati.
3. **PARTE 2** — le domande, col costo misurato. Fermati.
4. **PARTE 3** — le foto, con **quante chiamate a Places genera un viaggio vero**.
   Fermati su quel numero prima di lasciarle accese.
5. **PARTE 4** — la scheda dell'attività. Fermati.
6. **PARTE 5** — la cucitura, una alla volta, fermandoti dopo ognuna.
   ⚠️ Sulla 5.3 **non toccare Allenamento e Cucina** senza il mio ok: prima
   l'elenco dei file.

⚠️ Se il tempo stringe, **l'ordine è questo e non si salta**: la PARTE 1 da sola
serve a partire, le 3 e 4 no. Meglio consegnare 1 e 2 finite che quattro parti a
metà.

A ogni fermata: voce per voce con **fatto / non fatto / rotto**, e tre righe —
cosa hai portato, cosa hai lasciato aperto, e ogni punto in cui hai dovuto
decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
