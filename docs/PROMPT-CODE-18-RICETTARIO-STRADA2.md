# Il ricettario · la strada 2 — chiudere il lavoro
### prompt per Claude Code · da eseguire in `orca-app`

> Riprende `docs/PROMPT-CODE-16-RICETTARIO.md` dalla PARTE 3. **Leggi prima**
> `docs/SPEC-RICETTARIO.md`: qui c'è il come, lì il perché.
>
> Se non hai la memoria delle sessioni precedenti, il punto della situazione è
> qui sotto ed è sufficiente.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate; niente rifattorizzazioni di
file scollegati; `npx tsc --noEmit` e `npm run build` verdi prima di ogni
commit; **mai committare senza l'ok esplicito di Matteo**.

**Autorizzazione**: `lib/cucina.ts`, `lib/ai.ts`, `app/api/cucina/`,
`app/cucina/`. Fuori da qui **chiedi prima**.

Hai il login di sviluppo. ⚠️ Verifica quale utente stai guardando **dai dati**,
non dalla variabile: una sessione vera nel browser vince su `KEIKO_DEV_LOGIN`.

**Fermati alla fine di una parte, mai a metà**, e dimmi dove sei arrivato.

---

## Il punto della situazione

**Il concetto**: due strade per far entrare una ricetta, con regole **opposte**.

- **cerco io** — Keiko sceglie cosa mostrare, quindi **può scartare**;
- **porto io** (link o screenshot) — ha scelto Matteo, quindi **non scarta**.

Se ti trovi ad applicare la regola di una strada all'altra, ti sei perso.

**Fatto e pushato:**

- il taglio a 200 caratteri sulla didascalia è chiuso (`titoloCorto()` in
  `lib/cucina.ts`, `app/api/cucina/didascalia.ts` per il testo intero alla
  fonte). I video con i passi sono passati da **0 su 8 a 4 su 8**;
- la ricerca **filtra**: consegna solo ciò da cui si ricavano i passi (~32% dei
  risultati, 8–14 per ricerca, 5–7,5 s). La **ripesca** con Haiku gira solo
  sugli scarti, solo sotto i 10 sopravvissuti, e **può solo promuovere**;
- i cinque `catch` gravi sono chiusi (`docs/PROMPT-CODE-17-GUASTI-SILENZIOSI.md`).

**Da fare: tutto quello che segue.**

**Fatti utili già misurati** — non rimisurarli:

- dei quattro video del ricettario ancora senza passi, **due sono su YouTube**
  (Pollo al curry, Crostata pan di zenzero) e due su TikTok (Gnocchi alla
  sorrentina, Chicken wrap);
- **la YouTube Data API v3 è abilitata**. Progetto `engaged-oarlock-504809-b6`,
  «Chiave API 1», permessi Custom Search + YouTube Data. Quota 10.000 unità al
  giorno, un elenco di commenti ne costa 1;
- su **TikTok e Instagram** la pagina non è servita a un server: niente
  commenti, niente biografia. Misurato, chiuso, **non riprovarci**;
- il gradino ⑤ (audio del video) è **parcheggiato**. Non costruirlo, non
  prepararlo, non lasciare impalcature.

---

# PARTE A · ①bis — il link alla ricetta scritta dentro la didascalia

**È il gradino più redditizio che resta**, e l'hai trovato tu: nella descrizione
della crostata al pan di zenzero c'è scritto

    ★ INGREDIENTI, DOSI e PROCEDIMENTO: https://ricette.giallozafferano.it/...

Quel link sta in un testo che adesso leggiamo **per intero e gratis**. Cercarlo
costa zero e la pagina di arrivo quasi sempre ha il marcatore standard: la
ricetta si risolve **senza chiamare nessun modello**.

**Cosa fare**: estrai gli URL dalla didascalia, e prova quelli che sembrano
pagine di ricetta.

🚫 Non seguire link a sponsor, negozi, Amazon, codici sconto, altri social.
⚠️ Vale il controllo della PARTE C: un creator può mettere in descrizione il
link a **un'altra** sua ricetta.

**Verifica sul caso vero**: la crostata al pan di zenzero deve risolversi qui,
prima ancora di arrivare al ③.

---

# PARTE B · ② — il commento su YouTube · **CHIUSA, non si scrive**

Misurato il 20 agosto 2026 e chiuso lo stesso giorno, senza scrivere codice di
prodotto. `commentThreads.list` funziona (HTTP 200, 1 unità a elenco), ma su
**18 video senza passi in didascalia** i commenti con la ricetta sono **0** —
compresi i 4 video dove il creator un commento ce l'aveva.

**Non è un numero che migliora con più dati.** Il commento fissato esiste perché
su TikTok e Instagram la didascalia è corta; su YouTube la descrizione è
illimitata, quindi la ricetta o il link stanno lì — e quel link lo prende ①bis.
Il ② si può chiamare solo dove serve meno.

La scala è **① → ①bis → ③ → ④**. Il perché per esteso sta in `docs/NON-ORA.md`.

Sullo stesso campione, per confronto: **①bis risolve 6 video su 16**, zero
modelli chiamati. È lì che si è spinto, non qui.

---

# PARTE C · Il controllo che rende tutto onesto — ✅ misurato e deciso

⚠️ **Questo capitolo sostituisce quello di ieri.** La regola che avevo scritto —
«gli ingredienti devono combaciare» — è stata misurata sui casi veri e **non
funziona**. Le due distribuzioni si sovrappongono:

- la **ricetta giusta**, col link messo dal creator stesso, fa **0%**: la sua
  didascalia gli ingredienti non li scrive, dice «ricetta completa qui».
  Qualunque soglia sopra lo zero la butterebbe via;
- due **dolci diversi dello stesso creator** fanno **81%**, perché due torte
  condividono uova, zucchero, farina, latte, lievito.

Ricette giuste a 0%, ricette sbagliate a 81%: **lì dentro non esiste una
soglia.** Quello che separa è il **nome del piatto**.

## La regola

> **Combaciano quando almeno i due terzi delle parole caratterizzanti del nome
> della ricetta trovata compaiono nel titolo del video** — tolti il nome del
> creator, le parole di servizio (ricetta, facile, veloce, senza…) e le parole
> sotto le quattro lettere, confrontando le **radici di cinque lettere**.

Due dettagli che fanno la differenza fra il funzionare e il no:

- **il nome del creator si toglie da tutte e due le parti.** Senza, «Torta di
  mele di Benedetta» combacia con «…Fatto in Casa da Benedetta» sulla parola
  «Benedetta» — cioè il caso più pericoloso passa sull'unica cosa che non conta;
- **si confronta la radice, non la parola**: pomodorini → `pomod`, pomodori
  ciliegini → `pomod`+`cilie`, pomodoro → `pomod`.

Sui casi veri il margine è largo: giuste al 100%, sbagliate a 50 / 0 / 0 / 0. Il
50% è «Chicken wrap» contro «Pollo al curry» — condividono *pollo*, che è un
ingrediente e non un piatto, e i due terzi lo fermano.

## Gli ingredienti servono ancora, per un altro mestiere

**Ordinano, non bocciano.** Quando ①bis ha due o tre pagine candidate si sceglie
quella con la coincidenza più alta. Ordinare non butta via niente.

## ④ è più severo di ①bis

Nel **①bis** il link ce l'ha messo il creator nella sua didascalia: **la
provenienza è già una prova**, e il rischio massimo è «un'altra ricetta sua».
Nel **④** la pagina la troviamo noi, e può essere di chiunque.

Quindi al ④, oltre ai due terzi sul nome, **il creator deve coincidere** — nel
dominio, nella firma o nella pagina. Il motivo è la definizione stessa del
gradino: ④ cerca *la versione scritta di questo video*, e la versione scritta di
questo video è di chi l'ha girato. I passi di un altro che cucina la stessa cosa
sono i passi di un altro.

⚠️ **Dimmi quanti casi la stretta uccide** nel campione. Se ne uccide di veri, si
rivede.

## Quando non combacia, Keiko lo dice

Se il nome non combacia e non c'è un gradino dopo si finisce a «scrivi tu i
passi» — ma **la pagina scartata non sparisce in silenzio**. Una riga sola, senza
nessun tasto che prometta una ricetta:

> **«Ho trovato una pagina ma non sono sicuro che sia questa ricetta, quindi non
> l'ho usata»**, con l'indirizzo visibile.

Il perché è la regola delle due strade: nella **ricerca** è Keiko a scegliere,
quindi può scartare in silenzio — tanto non sai cosa hai perso. Qui **il video
l'hai scelto tu**, e Keiko ti deve il conto di cosa ha fatto. Senza quella riga,
«nessuna pagina esisteva» e «una pagina c'era e l'ho scartata» diventano
indistinguibili: è la stessa forma di difetto chiusa nel `PROMPT-CODE-17`.

🚫 Non «forse è questa, guarda tu» con un tasto: quello è lavoro scaricato
addosso.

E quando i passi si trovano, **si dice da dove**: la fonte è sempre visibile.

## Due cose già approvate, da chiudere

- ✅ la **tappata di `apple.co` / `apps.apple.com` / `play.google.com`** in
  `lib/cucina.ts` — quattro video su sei linkavano «scarica la mia app»;
- ✅ **il ② non esiste più**: la scala è **① → ①bis → ③ → ④**. Chiuso in
  `docs/NON-ORA.md` con la misura (0 su 18) e la ragione strutturale, e
  aggiornato `docs/SPEC-RICETTARIO.md`.

🚫 E **①bis si ferma dove si è fermato**: un link a `/8-ricette-veloci-per-la-cena/`
o a `/ricette` è un elenco, non una ricetta. Sceglierne una sarebbe l'invenzione
che tutto questo capitolo esiste per impedire. È giusto così.

---

# PARTE D · I due ingressi

Sono la stessa cosa vista da due lati: servono a dire a Keiko **quale** ricetta
è. Da lì in poi il lavoro è identico — ① → ①bis → ③ → ④ (il ② non esiste, PARTE B).

**Il link** — incollato o condiviso da TikTok, Instagram, YouTube. Keiko legge
la scheda pubblica: titolo, creator, didascalia. La macchina c'è già
(`didascalia.ts`).

**Lo screenshot** — la macchina è quella della scheda del PT: si carica
un'immagine, il modello legge cosa c'è scritto. Qui serve a ricavare **titolo e
creator**; se sullo schermo ci sono anche i passi, tanto meglio.

**③ Il sito del creator dalla biografia** resta come penultimo gradino prima del
④, ma **declassato**: 0 su 3 nella misura, e su TikTok la biografia è dietro il
login. Non spenderci tempo.

## D.1 · La porta rimasta aperta nella PARTE 2

Lo stato vuoto della ricerca oggi dice «di questa non ho trovato nessuna
versione con il procedimento scritto» e **si ferma lì**, perché la strada 2 non
esisteva. Adesso esiste: aggiungi la porta — «hai il link di un video?».

---

# PARTE E · Il legame con il piano

Se una ricetta somiglia a un pasto del piano — «pollo al curry» ≈ «pollo e
verdure» di giovedì — Keiko lo **propone**: «la colleghi al pranzo di giovedì?».
Un tocco, e quel pasto ha il suo «Cucina con Keiko».

⚠️ **Propone, non decide.** Il legame finisce nel **registro** di cosa Matteo ha
mangiato: se lo indovina il testo e sbaglia, l'app scrive una cosa falsa su di
lui. Il dito conferma sempre.

Riusa il giro del blocco 7, non farne un altro.

---

# PARTE F · Quando i passi non ci sono

È qui che finisce quello che il gradino ⑤ avrebbe raccolto, quindi **non è un
ripiego: è il percorso normale per una ricetta su quattro.**

**Scrivi tu i passi** — il campo c'è già. **Rendilo comodo**: si scrive mentre
si guarda il video, quindi il video dev'essere raggiungibile da lì senza perdere
quello che hai già scritto. Da quel momento è una ricetta a tutti gli effetti —
entra nel ricettario, ha «Cucina con Keiko», è come le altre.

**Tienila come idea** — resta salvata con la sua foto e il suo link, in un posto
suo, **senza il tasto per cucinare**. Non finge di averlo. Serve a ricordarti che
quella cosa ti piaceva.

Un'idea che diventa ricetta è il percorso normale, non un ripiego.

---

## Cosa NON si fa, mai

- 🚫 **inventare i passi dagli ingredienti.** È l'unico punto dell'app dove
  un'invenzione ha una conseguenza fisica: una ricetta sbagliata te la mangi.
  Se non c'è testo, non c'è ricetta;
- 🚫 attaccare i passi di una ricetta simile senza che gli ingredienti
  combacino;
- 🚫 salvare come «ricetta» qualcosa che non ha i passi;
- 🚫 scaricare o incorporare il video: il tocco porta sulla piattaforma del
  creator, la visualizzazione è sua.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. **Premendo, sull'app vera**, sull'utente di prova: incolla il link di un
   video TikTok e uno YouTube. Devono arrivare a una ricetta o a una frase
   onesta sul perché no. ⏸️ Lo screenshot resta fuori: va in coda dopo i
   Viaggi (deciso il 26 agosto 2026), la porta del link basta per oggi.
3. **I quattro casi veri**: le quattro ricette del ricettario ancora senza passi.
   Dimmi quante si risolvono adesso e a quale gradino.
4. **Il caso che conta di più**: una ricetta che non si risolve, portata fino a
   «scrivi tu i passi» e poi cucinata. Deve diventare indistinguibile dalle
   altre.
5. **Gli stati vuoti**: link che non si apre, screenshot illeggibile, ingredienti
   che non combaciano, idea senza passi.
6. **Il costo** di un giro intero della strada 2, letto dal registro e non
   stimato. L'obiettivo resta **2–3 centesimi**.
7. A **430 × 932 dpr 2 con le safe-area**, e con la rete rallentata: scheletri,
   non spinner.

## Le fermate

1. ✅ **PARTE A** — fatta: la crostata si risolve dal link in didascalia,
   senza modello.
2. ✅ **PARTE B** — fatta: chiusa. 0 su 18, per un motivo strutturale che non
   cambia con più dati (dettagli sopra e in `docs/NON-ORA.md`).
3. ✅ **PARTE C** — fatta: la regola è scritta (`nomeCombacia`,
   `creatorCoincide`), collegata a ①bis e al nuovo ④. La stretta sul ④ uccide
   3 candidati su 4 nella misura, e in tutti e tre i casi la pagina uccisa era
   davvero di un altro autore — zero falsi negativi osservati.
4. ✅ **D, E, F** — fatte, screenshot escluso (vedi sopra).

A ogni fermata: voce per voce con **fatto / non fatto / rotto**, e tre righe —
cosa hai portato, cosa hai lasciato aperto, e ogni punto in cui hai dovuto
decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
