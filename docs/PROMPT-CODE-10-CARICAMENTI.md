# Blocco 5 — caricamenti e movimento
### prompt per Claude Code · da eseguire in `orca-app` dopo il prompt 09

> Blocco piccolo e di natura diversa dai precedenti: tocca le **rotte** e i
> **gesti**, non i componenti. Mezza giornata.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; **non toccare `lib/` né `app/api/`**;
`npx tsc --noEmit` e `npm run build` verdi prima di ogni commit; **mai
committare senza l'ok esplicito di Matteo**.

Hai il login di sviluppo: le prove si fanno **sull'app vera**, e i gesti **col
dito** su un telefono simulato, non con click sintetici. `.env.local` resta su
`prova@keiko.local` quando premi.

---

## 1 · Una schermata di attesa per ogni sezione

**Oggi**: esiste un solo `app/loading.tsx` per tutta l'app. Passando da una
sezione all'altra si vede quello, uguale ovunque, e non dice dove stai andando.

**Deve diventare**: un `loading.tsx` per ogni rotta, che mostra **lo scheletro
della schermata che sta arrivando** — la testata, le forme delle card, la
griglia — non un logo e non uno spinner.

Le rotte che ne hanno bisogno: `/`, `/cucina`, `/allenamento`, `/guarda`,
`/salute`, `/viaggio`.

Regole:

- si usa `Skeleton` di `app/components/v2/`, dentro `.k2`, con le stesse
  spaziature della schermata vera. L'attesa deve avere **la forma** di quello
  che arriva, altrimenti al caricamento la pagina «salta»;
- niente testo tipo «Caricamento…»: uno scheletro non ha bisogno di dirsi;
- `/salute` e `/viaggio` sono ancora nel vestito vecchio, ma lo scheletro può
  essere già del sistema: è una schermata di transizione, non la sezione;
- `app/loading.tsx` resta come ripiego per le rotte che non ne hanno uno.

**Verifica**: con la rete rallentata (throttling), passa da ogni sezione a ogni
altra e guarda che lo scheletro assomigli davvero alla pagina che compare, e
che non ci sia nessun salto di layout quando i dati arrivano.

## 2 · Un difetto vero in `app/template.tsx`

L'hai trovato tu e non l'hai toccato perché non era la tua ondata. Adesso lo è.

`let lastPath` sta a livello di modulo e viene modificato **durante il render**.
Sul server quella variabile è condivisa fra le richieste, sul client parte da
`null`: la classe dell'animazione d'ingresso non combacia, e appare l'avviso di
idratazione.

Oltre all'avviso c'è il difetto vero: **sul server la direzione
dell'animazione la decide l'ultima navigazione di chiunque.**

Sistemalo nel modo che ritieni corretto per React — la direzione va calcolata
dove è lecito farlo, non durante il render — e verifica che l'avviso sparisca e
che la direzione resti giusta: verso destra andando a una sezione più a destra,
verso sinistra al contrario.

## 3 · Lo scorrimento laterale, verificato contro il tocco lungo

**Non c'è da costruirlo**: esiste già in `app/template.tsx` ed è fatto bene —
soglia 70px, rapporto 1.6 fra orizzontale e verticale, e `inHScroller` che lo
ignora quando parte da un carosello.

Quello che serve è **verificare che convivano**, adesso che C2 ha introdotto il
tocco lungo a 450ms con annullamento oltre i 10px. Sono due gesti orizzontali
sullo stesso schermo, ed è esattamente il conflitto che avevamo previsto.

Prova, col dito, su un telefono simulato:

| gesto | cosa deve succedere |
|---|---|
| tocco lungo fermo su una card | menu azioni, **nessun** cambio pagina |
| tocco lungo e poi trascino | menu annullato — e se supera 70px, cambia sezione |
| trascinamento rapido su una card | cambia sezione, **nessun** menu |
| trascinamento dentro un carosello | scorre il carosello, la pagina non cambia |
| tap normale | apre il pannello, come prima |

Se una di queste non si comporta così, **dimmelo prima di aggiustare le
soglie**: cambiare 450 o 70 a occhio è il modo di rompere il gesto che
funziona per far funzionare quello che non va.

Aggiungi anche `/salute` e `/viaggio`? **No.** L'ordine di `TABS` deve restare
quello della barra: lo scorrimento e i tasti in fondo devono portare negli
stessi posti, altrimenti l'app sembra averne due. È già scritto nel commento
del file.

## 4 · Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. A **430 × 932 dpr 2 con le safe-area simulate**. Screenshot di ogni
   scheletro accanto alla schermata vera che sostituisce.
3. La tabella del punto 3, gesto per gesto, **col dito**.
4. L'avviso di idratazione: prima e dopo.
5. Con la rete rallentata: nessun salto di layout quando i dati arrivano.

## 5 · Cosa consegnare

La lista voce per voce con **fatto / non fatto / rotto**, e tre righe: cosa hai
portato, cosa hai lasciato aperto, e ogni punto in cui hai dovuto decidere
qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.

---

# CODA · il pannello diventa la scheda della cosa
### aggiunta del 13 agosto, dopo aver provato C1 dal telefono

Da fare **dopo** i punti 1–3, quando quelli sono chiusi e committati.

## Il principio, e va scritto nel manifesto

Oggi il pannello che si apre dalla Home è un **menu di azioni**: titolo,
metadato, due righe. Deve diventare **la scheda della cosa**.

La divisione che ne esce è pulita e va messa in `docs/UI-DECISIONI-V2.md`
accanto alla regola 3-septies:

> **Il pannello è la cosa singola, la pagina è il contesto.**
> Il film con la sua trama e i titoli simili sta nel pannello; la tua lista
> intera sta nella pagina. Così «vai alla pagina intera» smette di essere un
> ripiego e diventa una scelta con un senso.

## Cosa mettere dentro, per tipo di card

Solo dati che il codice sa già prendere. **Non inventare campi e non indovinare
collegamenti**: dove il dato non c'è, la riga non c'è, e me lo segnali.

### Il titolo (film o serie)
Le rotte sono quelle che usa già la Guarda, quindi si chiama e si mostra —
nessuna logica duplicata:

- `/api/watch/details` → trama, durata, genere, anno
- `/api/watch/similar` → **titoli simili**
- «Dove vederlo», che c'è già e funziona
- se è una serie già iniziata, «+1 episodio» come primaria (regola decisa il 12)

Scheletri durante l'attesa, non lo spinner. Se `details` o `similar` non
rispondono, il pannello resta utile con quello che ha invece di svuotarsi.

### L'allenamento
- gli **esercizi di oggi**, con «l'ultima volta» per ognuno — arriva già
  pronto dal server, non ri-chiederlo per esercizio
- «Segna fatto», che c'è già
- «Allenati ora» resta **una riga che porta alla pagina**: la sessione la monta
  `AllenamentoView` con la scheda del giorno, e aprirla dal pannello vorrebbe
  dire rifare quella logica altrove

### Il cibo
Qui il dato manca, ed è noto: fra il piano della dieta e il ricettario non c'è
nessun riferimento. Quindi per ora:

- il pasto e le sue opzioni, come sono scritte dalla nutrizionista
- «Apri la Dieta»
- **niente «come si cucina»**: si aggancerà da solo quando nascerà il
  `ricetta_id`, nel blocco 7 di `docs/TODO-KEIKO.md`

Non cercare la ricetta dal testo del pasto: sarebbe indovinare un legame che
nessuno ha stabilito, e la prima volta che sbaglia il pannello mente.

## Come verificare

- apri il pannello di ogni tipo di card **dall'app vera**, con la rete
  rallentata: durante l'attesa scheletri, mai spinner, mai pannello vuoto;
- verifica che le chiamate siano **le stesse** che fa la Guarda, non copie;
- prova il caso in cui una rotta non risponde: il pannello deve restare utile;
- prova un titolo senza trama e uno senza simili.

## Cosa consegnare

Voce per voce con **fatto / non fatto / rotto**, e l'elenco delle righe che hai
lasciato fuori perché il dato non c'era.
