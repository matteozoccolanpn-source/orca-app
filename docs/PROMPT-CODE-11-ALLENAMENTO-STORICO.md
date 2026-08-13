# Blocco 6 — l'allenamento che si guarda indietro
### prompt per Claude Code · da eseguire in `orca-app` dopo il blocco 5

> Non è restyling. Qui si costruisce una schermata che non esiste, e si
> raccoglie un dato che esiste in tabella e che nessuno scrive.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; `npx tsc --noEmit` e `npm run
build` verdi prima di ogni commit; **mai committare senza l'ok esplicito di
Matteo**.

**Autorizzazione limitata**: puoi toccare `lib/supabase.ts` e `app/api/workout/`
per i punti 3 e 4, e solo per quello che serve a loro. Niente altro in `lib/`.

Hai il login di sviluppo: le prove si fanno **sull'app vera**, premendo, con
`.env.local` su `prova@keiko.local`.

---

## 0 · La decisione già presa, così non la riapri

Guardando indietro si può mostrare **la costanza** (quante volte, quali giorni,
la striscia che non si interrompe) oppure **i numeri** (quanto hai corso,
quanto hai alzato, come sale nel tempo).

**Si fa la costanza.** I numeri arrivano quando ci sarà storia: un grafico con
tre punti mente, e le discipline sono in produzione da due giorni.

Quindi in questa ondata: **nessun grafico, nessuna curva, nessuna tendenza.**
Cosa hai fatto e quando. Il giudizio lo fa Matteo.

---

## 1 · La pagina dietro «A che punto sei»

**Oggi** è un blocco dentro l'Allenamento che dice una riga. **Deve diventare**
una schermata sua, che si apre da lì e si chiude tornando indietro.

Cosa ci sta dentro, in quest'ordine:

- **questa settimana**: i giorni, quali hai fatto e quali erano previsti, e
  cosa hai fatto in ognuno (il titolo della seduta, non i numeri);
- **le settimane passate**, scorrendo indietro. `storicoSedute` arriva già dal
  server: guarda quanto indietro va e dimmelo, invece di allargare la lettura
  di tua iniziativa;
- **la striscia**: da quante settimane di fila ti alleni almeno una volta.
  Un fatto, non un premio: niente coppe, niente fuochi d'artificio, niente
  «non spezzare la catena».

Vestito V2, `Sheet` o schermata piena secondo cosa regge meglio lo scorrimento
lungo — scegli tu e dimmi perché.

**Lo stato vuoto conta più della schermata piena**: chi apre questa pagina la
prima settimana non deve trovare un buco. Scrivi la frase.

## 2 · Il calendario degli allenamenti

Fatti contro programmati, in una vista che si legge in un colpo d'occhio.
`trainedDays` e `weekPlanned` esistono già.

Tre stati per ogni giorno: **fatto** · **previsto e non fatto** · **niente in
programma**. Il terzo non è un fallimento e non deve sembrarlo.

⚠️ **I giorni in cui eri in viaggio non sono assenze.** Se il dato dei viaggi è
raggiungibile da qui, marcali diversamente; se non lo è, **non inventare** —
dimmelo e lo faremo quando i Viaggi avranno la loro ondata (è già scritto in
`docs/VIAGGI-FUNZIONI.md`, punto 10).

## 3 · «Com'è andata»

Il campo `sensazione` **esiste già in `workout_session` e nessuna schermata lo
scrive.** È in `docs/ROADMAP.md` da giorni.

Alla chiusura della seduta, una domanda sola: com'è andata. Tre o quattro
risposte, non una scala da 1 a 10 — dopo un allenamento nessuno calibra un
numero. E si può saltare: una domanda che non si può evitare diventa un pedaggio.

Poi la risposta si vede nello storico, accanto alla seduta.

🚫 **Keiko non commenta la risposta.** Non «bene!», non «riposati domani», non
«stai migliorando». Registra e tace. La scheda è del preparatore.

## 4 · La seduta libera — l'allenamento senza scheda

È il buco strutturale: oggi tutta la sezione presume che esista una scheda del
PT. Se corri per conto tuo, se fai una lezione, se segui un video, **non c'è
dove metterlo** — e «A che punto sei» ti conta come assente proprio i giorni in
cui ti sei allenato.

**La riformulazione**: la scheda è un **piano**, le sedute sono **fatti**, e i
fatti possono esistere senza il piano.

Cosa serve:

- **aprire una seduta senza scheda**: si aggiungono gli esercizi mentre si
  fanno, con la disciplina che si sceglie come già si fa oggi. Le discipline
  sono in produzione, quindi una corsa la sa già registrare;
- **darle un nome** («Corsa al parco», «Lezione di nuoto») invece del titolo
  della scheda;
- queste sedute **contano** in «A che punto sei» e nel calendario, e si
  distinguono da quelle della scheda — sono fatti tuoi, non del piano.

Guarda cosa serve davvero in tabella: `workout_session` ha già `titolo` e
`day`, e le serie stanno in `workout_set`. **Se basta rendere facoltativo il
legame con la scheda, non aggiungere colonne.** Se serve un campo, scrivimi
quale e perché prima di crearlo — la migrazione la lancia Matteo.

🚫 **Il paletto, sottile ma netto.** Si può portare dentro un allenamento da
qualsiasi fonte, e Keiko lo registra. Ma Keiko non ne **propone** uno: né un
video, né una progressione, né «rifai quello di martedì». Mostrare cosa hai
fatto è memoria; dire cosa dovresti fare è la scheda, e la scheda è del
preparatore.

**Fuori da quest'ondata**: il link a un video da cui ricavare gli esercizi, e
lo screenshot dallo smartwatch. Sono in `docs/TODO-KEIKO.md` e si fanno dopo —
questa ondata deve chiudere il buco, non aggiungere porte.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. **Premendo, sull'app vera**: apri la pagina dello storico, scorri indietro,
   chiudi una seduta rispondendo a «com'è andata» e verifica che la risposta
   arrivi in tabella, apri una seduta libera e registrala.
3. Gli **stati vuoti**: nessuna seduta, prima settimana, nessuna scheda
   caricata. Sono tre, e sono quelli che si vedono di più all'inizio.
4. A **430 × 932 dpr 2 con le safe-area**, e con la rete rallentata: scheletri,
   non spinner.
5. Verifica che le sedute vecchie, quelle registrate prima di oggi, appaiano
   nello storico **senza cambiare aspetto**.

## Cosa consegnare

Voce per voce con **fatto / non fatto / rotto**, e tre righe: cosa hai portato,
cosa hai lasciato aperto, e ogni punto in cui hai dovuto decidere qualcosa che
questo documento non copriva.

Non committare finché Matteo non dice di sì.
