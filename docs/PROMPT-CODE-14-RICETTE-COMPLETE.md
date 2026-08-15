# Ricette complete, e a un centesimo
### prompt per Claude Code · completa il blocco 8

> «Cucina con Keiko» funziona, ma quasi nessuna ricetta ha i passi: i creator
> mettono in descrizione la lista della spesa e i passi li dicono nel video.
> Qui si risolve il problema **e** si abbassa il costo, che sono la stessa cosa.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate; niente rifattorizzazioni di
file scollegati; `npx tsc --noEmit` e `npm run build` verdi prima di ogni
commit; **mai committare senza l'ok esplicito di Matteo**.

**Autorizzazione**: puoi toccare `lib/cucina.ts`, `lib/ai.ts` e
`app/api/cucina/` per quello che serve a questo documento. Niente altro in
`lib/`.

Hai il login di sviluppo. ⚠️ **Prima di premere, verifica quale utente stai
guardando dai dati e non dalla variabile**: una sessione vera nel browser
vince su `KEIKO_DEV_LOGIN`.

---

## PARTE 0 · Misurare quanto costa oggi — prima di toccare niente

Il codice registra già token, chiamate e ricerche per operazione
(`UsoOperazione` in `lib/ai.ts`). **Non stimare: leggi.**

Dimmi, per una ricerca di ricetta e per un'estrazione:

- quanti token in entrata e in uscita, in media;
- quante ricerche web;
- quanto di quello che entra viene dalla **cache** (costa un decimo) e quanto
  è nuovo;
- **quale modello** viene usato per l'estrazione;
- e il costo in centesimi, con la funzione di calcolo che già c'è.

Poi fai **una ricerca vera e un'estrazione vera**, sull'utente di prova, e
riportami i numeri di quel singolo giro. La media dice com'è andata finora, il
giro singolo dice cosa succede adesso.

**Fermati e mandami questi numeri prima di scrivere una riga.** Sono la base
del confronto, come gli screenshot lo erano per l'estrazione del pannello.

---

## PARTE 1 · Il marcatore standard — la strada che salta il modello

Quasi tutti i blog di cucina pubblicano `schema.org/Recipe` in JSON-LD: dentro
ci sono **ingredienti, passi, tempo e porzioni già strutturati**.

**Cosa fare:**

1. quando si guarda una pagina, si cerca prima quel marcatore;
2. se c'è ed è completo → i campi si leggono e si salvano, **senza chiamare
   nessun modello**;
3. se non c'è o è parziale → si continua come oggi.

E la stessa lettura serve a **ordinare i risultati della ricerca**: chi ha
ingredienti *e* passi in testo sta sopra, chi ha solo il video sta sotto. La
card lo dice — «ricetta completa» oppure «i passi sono nel video» — così si sa
prima di aprire.

⚠️ **Verifica la copertura vera**: su dieci risultati di ricerca, quanti hanno
il marcatore? Se sono due su dieci questa strada vale poco e voglio saperlo.

🚫 Non fidarti del marcatore alla cieca: se `recipeInstructions` c'è ma è una
riga sola di prosa, non sono passi. Meglio ricadere sul modello che salvare un
passo finto.

## PARTE 2 · Le cinque leve, in ordine di peso

**2.1 · Non mandare al modello tutta la pagina.** Una pagina di ricetta è per
il 90% menù, pubblicità e commenti. Isola il blocco della ricetta prima di
mandarlo. È la leva più grossa: da ~8.000 token a ~1.500.

**2.2 · Estrarre con Haiku, non con Sonnet.** Mettere in ordine una ricetta già
scritta è riconoscere una lista e una sequenza, non un lavoro da modello
grosso. Haiku costa un terzo.
⚠️ **Misura la qualità, non solo il prezzo**: fai le stesse cinque estrazioni
con i due modelli e confrontale. Se Haiku sbaglia i passi, il risparmio non
vale — dimmelo e si torna indietro.

**2.3 · Chiedere un'uscita compatta.** L'uscita costa cinque volte l'entrata.
Solo i campi, nessuna frase di accompagnamento, nessun «ecco la ricetta».

**2.4 · La cache sulle istruzioni fisse.** I token letti dalla cache costano un
decimo. Le istruzioni dell'estrazione sono sempre le stesse: vanno nella parte
che si può ricordare, così dalla seconda ricetta in poi quella metà quasi non
si paga.

**2.5 · I sottotitoli prima della trascrizione.** Dove ci sono già, l'audio non
si ascolta.

## PARTE 3 · La trascrizione — solo se serve, solo se la cucini

Per le ricette che restano senza passi:

- la ricetta esiste lo stesso, con gli ingredienti, e dove ci sono i passi c'è
  scritto **«i passi sono nel video»** — non un buco, una frase;
- accanto, due strade: **«scrivili tu»** (un campo, e restano) e **«ricavali
  dall'audio»**;
- la trascrizione parte **solo se tocchi «Cucina con Keiko»** o quel tasto, mai
  al salvataggio. Chi salva trenta ricette e ne cucina cinque paga cinque;
- una volta fatta, **non si ripaga più** — è già la regola dell'estrazione.

⚠️ **Prima di costruirla, misura la fattibilità e dimmela**: su cinque video
del ricettario di prova, quanti hanno i sottotitoli già disponibili, e quanti
richiedono di ascoltare l'audio. Con quel numero decidiamo se vale.

🚫 **Non far inventare i passi al modello dagli ingredienti.** Sarebbe Keiko che
scrive una ricetta che nessuno ha scritto — e una ricetta sbagliata te la mangi.
Se non ci sono passi e non c'è audio, la ricetta resta senza passi e lo dice.

---

## PARTE 4 · Misurare di nuovo

Rifai le stesse misure della PARTE 0, sugli stessi casi, e mettile accanto.

**L'obiettivo dichiarato**: dalla ricerca fino ai passi in mano, **non più di
2–3 centesimi** in totale. Se non ci arrivi, dimmi quale voce resta alta e
perché, invece di dichiarare vittoria su una media.

E dimmi anche quanto costa **una ricetta che passa dal marcatore standard**:
lì il modello non si chiama, e dovrebbe restare solo il centesimo della ricerca.

## Cosa consegnare

I numeri della PARTE 0 **per primi**, poi ti fermi.

Poi, a lavoro finito: voce per voce con **fatto / non fatto / rotto**, il
confronto prima/dopo, e tre righe — cosa hai portato, cosa hai lasciato aperto,
e ogni punto in cui hai dovuto decidere qualcosa che questo documento non
copriva.

Non committare finché Matteo non dice di sì.
