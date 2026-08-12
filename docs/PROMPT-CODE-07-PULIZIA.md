# Ondata di pulizia — le incoerenze del sistema
### prompt per Claude Code · da eseguire in `orca-app`

> Non è una sezione nuova. Sono dieci difetti piccoli, tutti della stessa
> natura: punti in cui il codice non rispetta il sistema che si è dato.
> Insieme costano molto meno che a pezzi.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
niente rifattorizzazioni di file scollegati; **non toccare `lib/` né `app/api/`**
salvo dove indicato esplicitamente qui sotto; `npx tsc --noEmit` e `npm run
build` verdi prima di ogni commit; **mai committare senza l'ok esplicito di
Matteo**.

Questi difetti vengono da una revisione visiva dell'app in produzione, fatta
navigandola davvero. Sono già stati filtrati: quello che era un falso allarme
è stato tolto, quello che resta è reale e verificato nel codice.

## 1 · Il fondo dell'app, e il lampo bianco

Sono lo stesso problema visto da due lati, e vanno risolti insieme.

**Cosa succede.** `app/globals.css` definisce `--background: #08111d` — un
blu-navy, il fondo della UI v1 — e lo mette sul `body`, con un
`background-image` e `background-attachment: fixed`. `.k2` invece è corretto
(`background: var(--bg)`, cioè `#0D0D10`) ma è largo al massimo 430px: quindi il
navy si vede ai lati su schermi più larghi, e in generale c'è un fondo che non
è quello del sistema. E all'apertura, prima che qualsiasi foglio arrivi, si vede
un lampo bianco.

**Cosa deve diventare.**

1. Il **primissimo pixel dipinto** dev'essere già scuro: colore di fondo su
   `html`/`body` nel primo CSS che arriva, e `theme-color` allineata. Il lampo
   bianco è del browser, arriva prima del nostro codice: metterci un logo non
   serve, serve che il bianco non ci sia mai.
2. Il fondo dell'app diventa quello del sistema, `#0D0D10`. Il navy `#08111d`
   sopravvive solo dove serve ancora alla UI v1: **verifica quali schermate lo
   usano davvero** prima di cambiarlo globalmente, e se qualcuna ne dipende
   dimmelo invece di romperla.
3. Poi la schermata d'avvio. Nel foglio V2 esiste già `.k2 .boot`: fondo scuro,
   l'orca in teal con un respiro lento. **Si usa quella.** Non uno spinner —
   finge una percentuale che non conosciamo — e non un logo fermo, che sembra un
   blocco. Sparisce in dissolvenza quando arriva il primo dato, non dopo un
   tempo fisso.

## 2 · Un solo terracotta

**Cosa succede.** La Home usa `#C96A45` per i bottoni primari («Inizia»,
«Apri»); Guarda e Allenamento usano `#AB5A3B`. Due valori per la stessa cosa.

**Cosa deve diventare.** Un valore solo, definito **una volta** nel foglio e
letto da tutti. Scegli tu quale dei due regge meglio il contrasto del testo che
ci sta sopra, misuralo, e dimmi quale hai scelto e perché. Poi non deve esistere
nessun altro punto del codice che scrive un terracotta a mano.

## 3 · Due primarie sullo stesso schermo

**Cosa succede.** Nella sessione di allenamento, «Registra serie 1» e «Esci»
sono **entrambi** terracotta.

**Cosa deve diventare.** Il terracotta è dell'azione primaria, e ce n'è una
sola per schermata. «Esci» è un'uscita: va in secondario. Controlla che non
succeda altrove.

## 4 · I metadati della Home

**Cosa succede.** Nella Home i metadati hanno colori sbagliati: il meta della
card grande è azzurro (`rgb(159,180,204)`), quello delle card volo è quasi
bianco (`#F1F4FA`). Il sistema dice `#9BA0A8`.

**Cosa deve diventare.** Tutti i metadati a `#9BA0A8`, mai in grassetto, mai
maiuscoli. Attenzione: i numeri della striscia dei giorni **restano in
grassetto**, perché vengono dal mock congelato della Home ed è una scelta.

## 5 · «UN MESE FA» diventa minuscolo ⚠️

**Cosa succede.** L'etichetta del battito è maiuscola (`etichettaBattito` in
`KeikoHomeV4.tsx` restituisce «UN MESE FA», «IERI», «DOMANI»). Il sistema dice
che i metadati non sono mai maiuscoli.

**Cosa deve diventare.** Minuscolo: «un mese fa», «ieri», «domani».

⚠️ Questo **cambia il mock congelato della Home**: aggiorna anche
`docs/mockups/home-v2-final-mock.html` e annota la decisione in
`docs/UI-DECISIONI-V2.md`, altrimenti la specifica e il codice divergono.

## 6 · L'emoji nel saluto di ripiego

**Cosa succede.** `app/components/keiko/keikoLive.ts:245` contiene
`greeting: "Ciao Matteo 👋"` — la stringa usata quando il nome non c'è.

**Cosa deve diventare.** Via l'emoji: è decorazione, e la regola è zero emoji
tranne quando l'emoji **è** il dato (come per il tipo del battito, che resta).

Questo è l'unico punto in cui autorizzo a toccare `lib/`, ed è una stringa.

## 7 · Un metadato in grassetto

**Cosa succede.** Nella sessione di allenamento, «Nessuna serie ancora» è in
Inter 600.

**Cosa deve diventare.** Peso normale. È un metadato.

## 8 · Guarda: i meta dei poster sono incoerenti

**Cosa succede.** Sotto le locandine, nella stessa griglia, convivono metadati
lunghi («Vincitore di 4 Oscar…») e metadati di una parola («Film», «Serie»).

**Cosa deve diventare.** Un formato solo per tutta la lista. Guarda cosa
arriva davvero dal dato e scegli il formato che è sempre disponibile: meglio
una riga povera ma uguale per tutti che una ricca a intermittenza.

## 9 · Guarda: il titolo dello stato vuoto

**Cosa succede.** «Nessun titolo con questi filtri» è in Inter 600.

**Cosa deve diventare.** Fraunces. Gli stati vuoti sono frasi scritte da
qualcuno, non etichette: sono voce, non fatto.

## 10 · Il titolo del poster al 18% — da verificare, non da correggere al buio

**Cosa succede.** Nella Guarda, il colore calcolato del titolo del poster
risulta `rgba(255,255,255,0.18)` pur apparendo bianco pieno a schermo. Il
sospetto è che ci sia un secondo strato sopra, o che sia testo vero al 18% che
in qualche stato diventa illeggibile.

**Cosa devi fare.** **Prima capire, poi decidere.** Trova cosa dipinge davvero
quel testo. Se è un duplicato, togli quello di sotto. Se è testo reale al 18%
con qualcosa sopra, dimmi in quali stati resta scoperto. Non mettere una pezza
prima di aver capito: è la stessa regola che hai applicato bene sui chip.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. A **430 × 932 dpr 2 con le safe-area simulate**, e anche a **440px** — il
   difetto del fondo si vede solo sopra i 430. Screenshot prima/dopo di Home,
   Guarda e Allenamento.
3. Per ogni punto da 2 a 9, la prova che il valore è cambiato: lo stile
   calcolato, non l'occhio.
4. Il punto 1 provalo aprendo l'app da fredda, non ricaricando una pagina già
   aperta.
5. Il punto 10 non è «fatto» finché non mi hai detto **cosa** era.

## Cosa consegnare

Alla fine, **tre righe**: cosa hai sistemato, cosa hai lasciato aperto, e ogni
punto in cui hai dovuto decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
