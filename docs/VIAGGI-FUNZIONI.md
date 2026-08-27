# Viaggi — le funzioni, come dovrebbero essere
### brainstorming del 13 agosto 2026 · da leggere insieme a `SPEC-VIAGGI-DIREZIONE.md`

Questo documento non è un piano di lavoro: è l'elenco di cosa può diventare la
sezione. La direzione tecnica resta quella già decisa — **in cima quello che è
vero, sotto solo i buchi.**

---

## Il principio, in una riga

**Keiko non pianifica il viaggio: lo assembla da quello che è vero, e mostra i
buchi come buchi.**

Tutte le funzioni qui sotto sono la stessa macchina vista da angoli diversi:

> qualcosa di non strutturato arriva → Keiko lo struttura → il viaggio è una
> linea del tempo di cose certe → i buchi si vedono → quello che scegli e
> compri torna dentro come biglietto → il buco si chiude da solo

È lo stesso meccanismo del «+», della scheda del PT e del piano della
nutrizionista: **Keiko trascrive e organizza, non inventa.**

---

# ① IL CUORE

## 1 · Il viaggio si assembla da solo
Giri a Keiko il PDF del volo, lo screenshot dell'hotel, il biglietto del treno.
Non c'è nessun «crea viaggio»: il viaggio **esiste appena esiste un biglietto**,
e cresce ogni volta che gliene mandi un altro.

Il punto d'ingresso è il «+», che già digerisce testo e immagini. Nessuna app
concorrente ha questo, perché nessuna ha i tuoi biglietti.

**Quello che si vede**: orari veri, numeri di prenotazione, binari, gate,
carrozze. Come sono, senza parafrasi. Il ponte `matchTicket` va finito: la
tappa delle 15:40 deve aprire il biglietto vero.

## 2 · Il viaggio si carica da fuori
Un programma scritto da un tour operator, una lista che ti hanno fatto degli
amici, un itinerario che ti sei fatto scrivere altrove. Lo incolli, e Keiko lo
**struttura**: giorni, orari, luoghi, e i link dove ci sono.

È la funzione più forte di tutte e la più economica. E soprattutto è **dentro
la dottrina**: il viaggio te lo fa qualcun altro, Keiko lo rende usabile. Zero
promesse che non può mantenere.

**Da fare per prima.**

> **Correzione del 27 agosto 2026** — non è `/api/cucina/estrai` applicato ai
> viaggi: quella rotta è cucita apposta sulle didascalie dei video di ricette
> (marcatori `schema.org/Recipe`, ricerca Tavily sul video preciso, verifica
> del creator) e non prende file. La macchina davvero riusabile è il pattern
> di `app/api/diet/upload` e `app/api/workout/upload`: multipart (immagini +
> PDF + testo) → blocchi `document`/`image` per Claude → un prompt che chiede
> solo JSON. Vedi `docs/PROMPT-CODE-20-VIAGGI-DOCUMENTI.md`, PARTE 0.

## 3 · I buchi
Le ore vuote si vedono come vuote: «giovedì dalle 14 alle 19 non hai niente».

Solo se tocchi un buco Keiko propone: **due o tre cose concrete** per quelle
ore, vicine a dove sei in quel momento. Non un itinerario, non un
riempimento automatico. Il buco è l'unità di misura, non il giorno.

**È anche quello che sistema il costo.** «Cosa faccio in cinque ore vicino a
Termini» è una domanda piccola: torna a costare 1 invece di 10 per
costruzione, non per sconto.

## 4 · Il cerchio si chiude
Scegli una proposta → Keiko ti manda **a cercarla** sulla piattaforma → compri
→ carichi il biglietto col «+» → il buco si riempie di una cosa vera.

Da lì in poi quella non è più una proposta: è un fatto, con l'orario e il codice.

⚠️ **Link a una ricerca, non a un prodotto.** Un link a un tour che non esiste
è la stessa bugia di prima. «Cercalo su GetYourGuide» è meno bello e sempre
vero.

## 5 · Oggi
Quando sei **dentro** il viaggio, la schermata giusta non è il viaggio: è oggi.

La prossima cosa vera con l'orario e il binario, e sotto il buco che hai
davanti. Il viaggio intero lo guardi prima di partire, non con la valigia in
mano.

Nessuno la fa bene perché nessuno ha i tuoi biglietti.

---

# ② LA MEMORIA

## 6 · Dove sei stato
Non «cosa fare a dicembre» — quello lo trovi ovunque. Ma **«l'anno scorso a
dicembre sei andato a Vienna e ci sei rimasto tre giorni»**.

La memoria è il patrimonio, il suggerimento è il contorno. E il suggerimento
arriva **solo se lo chiedi**.

## 7 · Il ponte è un fatto, non un consiglio
Keiko sa che dall'8 all'11 dicembre non hai niente in calendario. Dirti «hai
quattro giorni liberi» è una **constatazione**. Dirti «vai a Vienna» è un
consiglio.

La prima la fa da sola. La seconda solo se gliela chiedi.

## 8 · Il conto del viaggio
Quanto è costato, sommando i biglietti che hai caricato. Non un budget
planner, non un obiettivo di spesa, nessun «hai speso troppo»: una **somma di
cose vere**, che diventa memoria.

---

# ③ LA CUCITURA — è qui che Keiko è unica

Il revisore esterno ha detto che la cosa che non ha visto in altre dieci app
non è l'agenda, né la watchlist, né il diario: è **la cucitura fra i domini**.
I Viaggi sono il posto dove si vede meglio.

## 9 · Il volo e la tua lista
Il volo dura 2h10. Nella tua lista ci sono tre film che ci stanno dentro.
Keiko te lo dice il giorno prima, perché il tempo lo sa già — la durata del
film ce l'ha, la durata del volo pure.

Costo zero: sono due numeri già in casa.

## 10 · I giorni fuori non sono buchi
Sei via quattro giorni e la scheda del PT ne prevede quattro sedute. Keiko
**non ti dice cosa fare** — la scheda è del preparatore — ma segna che quei
giorni eri fuori, così «A che punto sei» non li conta come assenze.

Stessa cosa per la Cucina: in viaggio il piano non si applica, e Keiko smette
di chiederti del piano. Continua a registrare cosa hai mangiato, senza
riferimento.

## 11 · Il check-in è un fatto con un'ora
Il check-in del volo apre 24 ore prima. È verificabile, quindi Keiko lo può
dire. «Domani parti alle 6:00» è un fatto. «Dovresti dormire presto» non lo è.

Gli avvisi dei viaggi sono solo quelli che hanno **un'ora certa**.

## 12 · La valigia
Keiko sa la destinazione, le date, cosa hai in programma e — dal meteo, che ha
già — che tempo farà. «Giovedì sera hai il concerto» e «a Roma 31°» sono due
fatti; metterli insieme è una lista, non un consiglio.

Non una lista generica di cose da mettere in valigia: **quelle tre righe che
riguardano questo viaggio**.

---

# ④ IL CONTORNO

## 13 · I documenti in un posto solo
Passaporto, carta d'identità, assicurazione, tessera sanitaria: le cose che
servono in aeroporto, raggiungibili **anche senza rete**.

⚠️ Sono documenti d'identità: vanno trattati con la stessa cautela dei dati
sanitari. È una funzione che va progettata sulla privacy prima che sulla
comodità.

## 14 · Il viaggio si manda a qualcuno
Chi viene con te deve poter vedere la stessa linea del tempo. La versione
completa (più utenti sullo stesso viaggio) è un progetto grosso; la versione
economica è **esportarlo** come testo o PDF da mandare su WhatsApp.

## 15 · Il ritorno
Quando torni, il viaggio si chiude: cosa hai fatto davvero, cosa era in
programma e non hai fatto. Senza giudizio — diventa memoria, che alimenta il
punto 6.

Keiko **non fa il diario fotografico**: quello esiste già e lo fa meglio
qualcun altro.

---

# ⑤ SE UN GIORNO DIVENTA PUBBLICA — la monetizzazione

I link affiliati (GetYourGuide, Booking, le compagnie) sono la strada ovvia, e
non sono in contrasto con il carattere dell'app — **a due condizioni**, e sono
quelle che decidono se Keiko resta Keiko.

**1 · Si dichiara.** Un link affiliato che non si dichiara è una cosa che
l'app sa e non ti dice, ed è esattamente il tipo di silenzio che tutto il
resto del progetto rifiuta.

**2 · Il denaro non tocca l'ordine.** Il momento in cui una proposta sale di
posizione perché rende di più, Keiko ha smesso di essere dalla tua parte. Le
proposte si ordinano per quanto ti servono; il link è **come** ci arrivi, non
**perché** te lo propone.

C'è una terza cosa, più sottile: **non aggiungere proposte perché sono
monetizzabili.** Se in quel buco la cosa giusta è «non fare niente, sei
stanco», deve poterlo dire.

Detto questo: un'app che ti organizza il viaggio e prende una percentuale su
quello che compri **volontariamente**, dichiarandolo, è un modello pulito. È
molto più onesto della pubblicità e molto più sostenibile di un abbonamento
per un'app che usi sei volte l'anno.

---

# In che ordine le farei

**Prima — la sostanza, e sono i sette punti del §2 di `SPEC-VIAGGI-DIREZIONE.md`.**
Niente di questo elenco ha senso finché tre azioni su quattro mentono.

**Poi, in quest'ordine:**

1. **il viaggio caricato da fuori** (2) — la più economica, la più onesta, la
   macchina esiste già
2. **il viaggio che si assembla dai biglietti** (1) + **il ponte `matchTicket`**
3. **i buchi** (3) e **il cerchio che si chiude** (4)
4. **oggi** (5) — la schermata che nessun altro può fare
5. **la cucitura** (9, 10, 11) — costano poco e sono quello che rende Keiko
   diversa
6. la memoria (6, 7, 8), la valigia (12)
7. il contorno (13, 14, 15), quando serve

**Una domanda aperta che decide il punto 1**: quando carichi il PDF di un volo,
oggi Keiko ne cava fuori orari e codici, o solo il testo? Se li cava già, «il
viaggio si assembla da solo» è vicino. Se no, quello è il primo pezzo, e viene
prima di tutto il resto.
