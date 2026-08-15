# Il cruscotto dei costi
### prompt per Claude Code · da eseguire in `orca-app`

> `/numeri` esiste ma dice il triplo del vero, vede solo Claude, ed è una
> tabella invece di una risposta. Qui diventa il posto dove si guarda quanto
> costa Keiko — e da cosa.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate; niente rifattorizzazioni di
file scollegati; `npx tsc --noEmit` e `npm run build` verdi prima di ogni
commit; **mai committare senza l'ok esplicito di Matteo**.

**Autorizzazione**: `lib/ai.ts`, `lib/supabase.ts`, `app/numeri/`, e i punti di
`lib/` dove partono le chiamate a Tavily e a Google Places — solo per
registrarle. Niente altro.

Hai il login di sviluppo. ⚠️ Verifica quale utente stai guardando **dai dati**,
non dalla variabile.

---

## 1 · Il contatore che sbaglia — prima di tutto il resto

`stimaDollari` cerca il modello con una chiave esatta: la tabella ha
`claude-haiku-4-5`, il registro scrive `claude-haiku-4-5-20251001`. Non
combaciano, scatta il ripiego «trattalo come Sonnet», e ogni operazione con
Haiku è contata **tre volte tanto**.

Sistemalo con il confronto per prefisso, e **fallo in modo che non si
ripresenti**: il giorno che cambia versione a un modello, il ripiego non deve
tornare a mentire in silenzio. Se un modello non si riconosce, deve **dirlo**
— una riga visibile nel cruscotto, non un numero plausibile e sbagliato.

Poi **ricalcola lo storico**: le righe già scritte hanno i token giusti, quindi
il costo si ricalcola. Dimmi di quanto cambia il totale.

## 2 · Contare anche quello che non è Claude

Oggi il registro vede solo Anthropic. Mancano:

- **Tavily** — la ricerca web. Mille gratis al mese, poi si paga. Va contata
  ogni ricerca, con la sua soglia;
- **Google Places** — le foto dei luoghi, a pagamento per ricerca. È già
  memorizzata (anche il risultato negativo), quindi il conteggio dirà quante
  ne parte davvero, che è il numero interessante;
- **TMDB e Unsplash** — gratis, ma con limiti di frequenza. Contale lo stesso:
  il giorno che si sfora, si vuole sapere da dove.

Stessa forma del registro di Claude — chi, quando, quale operazione — così una
riga di costo è una riga di costo, da qualunque fornitore venga.

⚠️ **I prezzi vanno in un posto solo**, accanto a quelli dei modelli. Un prezzo
scritto in due punti diverge il giorno che cambia.

## 3 · `/numeri` diventa una risposta

In cima, **tre numeri e basta**:

- **oggi**
- **questo mese**
- **a questo ritmo, a fine mese** — la proiezione, con scritto su quanti giorni
  è calcolata (una proiezione su due giorni non è una proiezione, e va detto)

Sotto, nell'ordine:

**Da cosa viene** — il costo per **operazione**, ordinato dal più caro. Non
«quante volte», ma **quanto**: è la differenza fra sapere che il viaggio si usa
poco e sapere che costa venti volte un consiglio. Con accanto il costo medio di
**una** volta, che è il numero su cui si decide se una funzione va ripensata.

**Chi lo consuma** — per utente: **mediana e p95**, non la media. In ogni
prodotto con un modello dentro, pochi utenti costano dieci volte gli altri, e
la media lo nasconde. Oggi gli utenti sono due, quindi il numero non dirà molto
— ma la colonna deve esistere da subito, perché il giorno che serve è troppo
tardi per aggiungerla.

**La tabella di adesso**, in fondo, per chi vuole guardare le righe.

## 4 · L'avviso

Una soglia giornaliera che Matteo decide. Se la spesa di oggi la supera, lo
deve **sapere** — non scoprirlo aprendo la pagina.

Le notifiche esistono già (`public/sw.js`). Deve poter essere spenta.

🚫 Nessun allarme rosso, nessun «attenzione!». Una riga che dice il numero e
da quale operazione viene. È la stessa regola del resto dell'app: si dice il
fatto, non si spaventa.

## 5 · La riconciliazione — il controllo che nessuno fa

Nel cruscotto, una riga che dice: **«questo è il mio conto, la fattura vera è
sull'altro pannello»**, con il collegamento alla Console Anthropic.

E una nota scritta, in `docs/`, che spieghi il controllo da fare una volta al
mese: confrontare il totale del registro con la fattura. **Se non tornano entro
qualche punto percentuale, è il registro a essere sbagliato** — è esattamente
quello che è successo con il moltiplicatore per tre, ed è passato inosservato
perché nessuno ha mai confrontato.

## 6 · Cosa NON mettere

- **Vercel e Supabase**: sono canoni fissi e non si leggono da dentro. Al
  massimo una riga che dice quanto sono, scritta a mano, per avere il totale
  vero. Non inventare una lettura che non esiste.
- Nessun grafico finché non c'è storia: con due settimane di dati una curva
  mente. Prima i numeri, i grafici quando ci sarà da guardarli.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. **Il punto 1 si verifica ricalcolando**: prendi tre righe del registro con
   Haiku, calcola a mano il costo dai token e dai prezzi, e confrontalo con
   quello che mostra la pagina. Devono coincidere.
3. Fai **una operazione vera** di ogni tipo che tocchi un fornitore diverso —
   una ricerca, un'estrazione, una foto di luogo — e verifica che compaiano
   tutte nel cruscotto.
4. La proiezione: verifica che dica su quanti giorni è calcolata.
5. A **430 × 932 dpr 2**: è una pagina che si guarda dal telefono, non da
   desktop.

## Cosa consegnare

Voce per voce con **fatto / non fatto / rotto**, **di quanto cambia il totale
storico** dopo la correzione del punto 1, e tre righe: cosa hai portato, cosa
hai lasciato aperto, e ogni punto in cui hai dovuto decidere qualcosa che
questo documento non copriva.

Non committare finché Matteo non dice di sì.
