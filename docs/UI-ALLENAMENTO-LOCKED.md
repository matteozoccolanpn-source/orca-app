# KEIKO UI V2 — ALLENAMENTO, LOCKED

> 🔒 Stato **FINALE e APPROVATO** della sezione Allenamento (9 agosto 2026).
> Mock di riferimento: `docs/mockups/allenamento-v2-final-mock.html` — read-only.
> Gemello già bloccato: la Cucina (`docs/UI-CUCINA-LOCKED.md`).
> Manifesto di sistema: `docs/UI-DECISIONI-V2.md`.
> Prompt che l'hanno generata: `docs/PROMPT-ALLENAMENTO-FINALE.md`.
>
> **REGOLA DI PERSISTENZA.** Quando Matteo dice «implementa l'Allenamento in
> codice» (o chiede una schermata collegata), questa specifica è la FONTE DI
> VERITÀ: si mantengono naming, ordine delle sezioni, colori, componenti e
> comportamenti così come sono scritti qui. Non si reinterpreta, non si
> «migliora», non si rinomina. Se qualcosa non è specificato → **si chiede a
> Matteo**, non si inventa.
>
> **AGGIORNATA L'11 AGOSTO 2026, dopo l'ondata 3.** Due decisioni di Matteo
> sono entrate nel corpo qui sotto: «A che punto sei» sale al **punto 3** e la
> pagina ha una **testata propria**. Tutto il resto del mock resta com'era, ma
> il codice non lo copre tutto: quello che è davvero implementato sta nel
> **§9 · Cos'è vivo in codice**, in fondo. Se le due parti si contraddicono,
> è il §9 a dire come si comporta l'app oggi.

---

## 0 · Design system (invariabile, uguale alla Cucina)

| Regola | Valore |
|---|---|
| Colore di sistema | teal `#3DA5C4` · chiaro `#86CCE0` · testo su teal `#08191E` |
| Colore azione | terracotta. **FAB e decorazioni** `#C96A45`; **bottoni con testo** `#AB5A3B` (scurita per stare a 4,53:1 con `#FFF3EC`). Solo primarie e FAB |
| Primarie ammesse | «Allenati ora», «Aggiorna scheda», «Fatto → prossimo», «Salva com'è andata», «Carica la tua scheda», chip sensazione selezionato |
| Elevazione | `#0F0F12` → `#1A1B20` → `#212228`, top-highlight `inset 0 1px 0 rgba(255,255,255,.08)` (`.11` sulla quota alta) |
| Radius | 16 hero · 12 card · 9 foto incassata · 8 chip/bottone |
| Spaziatura | griglia 4/8 · ≥32px sopra ogni titolo di sezione · padding-bottom `116px + safe-area` |
| Tipografia | Fraunces = voce · Inter = fatti. Metadati `#9BA0A8`, mai bold né maiuscoli |
| Emoji | zero |
| Tab bar | fissa in basso, FAB terracotta al centro, tab «Allenamento» attiva |
| Contrasto | ≥4,5:1 ovunque, gradiente scuro sotto ogni testo su foto |
| Caroselli | nessuno in questa sezione |
| Sticky | **vietata**: nessuna barra di titolo o progresso allo scroll |

**Regole trasversali ferree**

1. **Zero numeri nutrizionali** in tutta la sezione: niente calorie, niente
   proteine, niente macro.
2. **Italiano ovunque**, un solo registro. Restano solo i nomi propri della
   scheda («Corsa Recovery + Nuoto», «Z2»).
3. **Fonte unica degli esercizi**: vivono una volta sola, nella lista-accordion
   sotto l'hero. La card «oggi» della settimana è in sola lettura.
4. **Un dato, un posto**: la contabilità dei giorni sta solo in «A che punto sei».
5. **Tassonomia metadati uniforme** `momento · tipo`, mai ripetuta nel titolo
   della riga (kicker «mattino · corsa» → titolo «5 km lenti»).
6. Tab bar e FAB non coprono mai l'ultima card.

---

## 1 · PAGINA PRINCIPALE (ordine bloccato)

0. **Testata — «Allenamento» in Fraunces 22 e UNA riga sola di stato**
   (per esempio «2 di 3 questa settimana»), con il tasto indietro a sinistra.
   Non c'era nel mock perché lì la testata la metteva il guscio: in codice
   `KeikoShell` non avvolge più questa pagina — si portava dietro la testata
   vecchia e il badge con l'emoji — quindi la pagina possiede il suo schermo,
   come la Guarda. Zero emoji, zero badge: la streak vive in «A che punto sei».
1. **Hero — l'identità della giornata.** Dentro: label teal `oggi · domenica`; titolo Fraunces
   24px «Corsa Recovery + Nuoto» su gradiente scuro; sottotitolo troncato
   «corsa 5 km · nuoto 800 m · +2»; badge teal ad alto contrasto «0 di 4» in
   alto a destra; barra di progresso sottile; «Allenati ora» primaria +
   «Fatto oggi» secondaria neutra.
2. **Callout coach**, sommesso, senza numeri di giorni:
   «Si rientra piano: oggi puoi togliere un dieci per cento dai carichi
   dell'ultima volta.»
3. **Lista esercizi** — accordion identico alla riga-pasto della Cucina.
   Checkbox teal circolare a sinistra, la spunta **si disegna**; fatto resta
   visibile e barrato. Tap = espande chip + nota; chevron; **il prossimo è
   aperto di default sempre**; foto solo sull'esercizio hero. Azioni nella riga
   in teal testuale («Allenati ora», «sposta a domani»), mai terracotta.
   In fondo «+ Aggiungi esercizio fuori scheda». A quattro su quattro compare
   «Scheda completa» in dissolvenza.
4. **A che punto sei** — teaser di andamento, **mai numeroni**: frase breve,
   riga di contesto grigia, tre chip-tendenza (`corsa 6:00/km ↓`,
   `nuoto 1.000 m ↑`, `squat 52 kg ↑`), riga «Ultimo allenamento · data ·
   dettaglio» con chevron. Tap sull'intero blocco → sotto-vista.
   **Sta qui, subito dopo la lista esercizi e PRIMA della settimana**: sapere
   a che punto sei viene prima dell'elenco dei giorni. Prima della revisione
   dell'11 agosto 2026 era all'ottavo posto della pagina, dopo la settimana e
   il cibo; è una correzione esplicita di Matteo, non un dettaglio.
   (Nell'elenco a sette voci di `docs/PROMPT-CODE-03-ALLENAMENTO.md`, che non
   conta il callout, è il **punto 3**: è lo stesso posto.)
5. **La settimana** — card-giorno a mezza foto della Cucina, altezza uniforme,
   riposo attivo con foto come gli altri. Giorno «oggi» in hero con overlay.
   Espansione in sola lettura + «Sposta questo allenamento» (sugli altri:
   «Scambia con un altro giorno»).
6. **Un solo blocco cibo** «Intorno all'allenamento · dal tuo piano»:
   lead coerente con l'hero, voci `prima` e `dopo` linkate alla Cucina con
   chevron, callout teal con l'indicazione del piano, e la card ricetta grande
   come **fallback interno** sotto «se stasera salti il piano».
7. **Programmi · quelli che segui dalla Home** — card «Maratona di Milano ·
   settimana 3 di 16 · lungo da 18 km, domenica 17» con barra teal; stato vuoto
   progettato; chip «Programmi suggeriti · in arrivo» **disabilitato**.
8. **La tua scheda** — «Scheda rientro · agosto», «Aggiorna scheda» primaria +
   «Modifica giorno» secondaria, «gestisci» → Gestione.

---

## 2 · SOTTO-VISTA «Allenati ora»

Schermo pieno, un esercizio alla volta. Header con «×», nome dell'esercizio,
«esercizio 1 di 4 · scheda rientro», barra teal. Esercizio grande con foto
(quadrata quando non ci sono serie), chip, «l'ultima volta: …», nota del coach,
anteprima «poi: …». Barra fissa in fondo: «Fatto → prossimo» primaria,
«salta», freccia indietro. Serie per serie con checkbox teal e timer di
recupero automatico che chiude con mezzo secondo di stato **«Vai»**.
Finale: «Allenamento finito» con voci completate, durata, elenco di cosa hai
fatto e link al pasto dal blocco cibo. Nessun dato nutrizionale.

## 3 · SOTTO-VISTA «Fatto oggi / Com'è andata?»

Pannello dal basso, testata immersiva con foto del giorno e alone terracotta,
kicker arancio, titolo Fraunces. Copy: «Quello che scrivi qui Keiko se lo
ricorda: la prossima volta te lo rimette davanti. Se non hai voglia, salta e
basta.» Campi contestuali — corsa: distanza e passo; nuoto: metri e tempo;
addominali: giri fatti con checkbox teal. Stepper «− valore +» da 44px.
Chip sensazione facile/giusto/duro, selezionato in terracotta. Primaria
«Salva com'è andata» a tutta larghezza + «per ora no». Il pannello si chiude
anche trascinandolo giù. Salvando si aggiornano lista, «Ultimo allenamento» e
i chip-tendenza.

## 4 · SOTTO-VISTA «A che punto sei»

Header proprio con «<», niente barra di progresso. In cima ultimo allenamento
e prossimo obiettivo dal programma. Poi una frase sommessa. Poi **una sezione
per disciplina** — Corsa (passo, da 6:20 a 6:00 /km), Nuoto (da 600 a 1.000 m),
Forza (squat da 40 a 52 kg) — ognuna con spiegazione a parole, micro-linea di
tendenza e riga «prima → ora» col delta in pill. Teal = progresso, grigio =
stabile, **mai un giudizio negativo**. Vietati istogrammi di volume, heatmap di
costanza, frequenza media. Addominali e mobilità hanno lo stato «in arrivo».

## 5 · SOTTO-VISTA «Gestione scheda»

Card documento «Scheda_rientro.pdf · dal preparatore · Keiko la trascrive e la
ricorda, non la scrive» con «Apri». Lista: Carica una nuova scheda · Modifica
giorno · Sposta allenamento. In fondo «Elimina scheda», terziaria grigia con
conferma a doppio tocco. Contiene anche la **nota di sistema sul contrasto**
(le tre varianti di terracotta a confronto): è materiale di revisione, in
codice non va portata.

---

## 6 · Stati progettati

- **Nessuna scheda caricata** — si raggiunge eliminando la scheda: hero
  «Nessuna scheda caricata» + card vuota con «Carica la tua scheda» primaria.
- **Oggi non c'è allenamento** — si raggiunge scambiando oggi col riposo
  attivo: hero «Oggi non c'è allenamento · riposo attivo», «Ho camminato» e
  «rimetti l'allenamento»; **la settimana si scambia davvero** (domenica prende
  il riposo, mercoledì prende «Corsa Recovery + Nuoto · spostato da domenica»).
- **Caricamento** — orca monocromatica teal che respira, mai il vecchio logo ambra.
- Ogni componente interattivo: riposo / premuto (una quota in più) / disabilitato (.45).
- Bersagli tattili ≥44px su spunte, chevron, «×», stepper, «<».
- Tornando da una sotto-vista si rientra nella posizione di scroll di prima;
  swipe da sinistra per chiudere.

---

## 7 · Nodi lasciati aperti (servono a Matteo, non si risolvono da soli)

1. **Home vs Allenamento.** La Home congelata dice «Corsa Z2, 40 minuti ·
   18:00»; l'Allenamento dice «Corsa Recovery + Nuoto». Il progresso combacia
   (0 di 4), il titolo no. Va deciso quale dei due cambia.
2. **Maratona di Milano** non compare nella Home: se il programma è reale,
   va aggiunto lì.
3. **«Recovery»** resta nel titolo del giorno perché lo fissa il prompt finale,
   pur essendo l'unico anglicismo rimasto.

---

## 8 · Storia dei giri (chiusa)

v2.0 primo mock → v2.1 accordion + ponte cibo → v2.2 gemellaggio con la Cucina
e sotto-viste → v2.3 fonte unica degli esercizi, zero dati nutrizionali,
«A che punto sei» sulle prestazioni → v2.4 via i numeroni, chip-tendenza →
**v2.5 rifinitura (movimento, stati, contrasto, tocco) = LOCKED**.

Il ciclo mock è **chiuso**. Le osservazioni successive si raccolgono per la
fase di implementazione, non riaprono il mock.

---

## 9 · Cos'è vivo in codice (ondata 3 · 11 agosto 2026)

Questo paragrafo esiste perché la spec deve dire il vero. Sopra c'è il disegno
approvato; qui c'è cosa fa l'app oggi, e dove le due cose non coincidono.

**File**: `app/allenamento/AllenamentoView.tsx` (ramo a pagina intera) e
`app/allenamento/SessioneLive.tsx`. `app/allenamento/page.tsx` calcola tutto
sul server e non si tocca.

### Portato, e funziona

| Punto | Stato in codice |
|---|---|
| Testata «Allenamento» + una riga di stato | fatto (§1.0) |
| Hero con label, titolo Fraunces, sottotitolo, badge «n di m», barra, due bottoni | fatto |
| Callout coach da `lib/coach`, con le parole del server | fatto |
| Lista esercizi accordion, spunta teal disegnata, fatto barrato, prossimo aperto | fatto |
| A che punto sei, subito dopo gli esercizi | fatto, ma senza chip-tendenza (vedi sotto) |
| La settimana con `DayCard`, oggi in evidenza, sola lettura | fatto |
| La tua scheda + foglio di gestione | fatto |
| Nessuna scheda caricata → stato vuoto con «Carica la tua scheda» | fatto |
| Oggi non c'è allenamento → hero «Oggi non c'è allenamento · giornata di recupero» | fatto |
| Attese di rete → scheletri, mai lo spinner | fatto |
| Emoji nell'area riscritta | zero |

### Non portato, e perché

- **Il blocco cibo (§1.6)** e **i Programmi (§1.7)**: il dato non esiste nel
  codice. Non si inventa e non si lascia una sezione vuota: sono saltati.
- **I chip-tendenza di «A che punto sei» (§1.4)**: servono un dato per
  disciplina che non esiste. Al loro posto c'è una frase e la riga
  «n di m allenamenti · k di fila». Una tendenza da due sedute sarebbe inventata.
- **La sotto-vista «A che punto sei» (§4)**: non esiste, per la stessa ragione.
  Il blocco in pagina non è cliccabile.
- **La sotto-vista «Com'è andata?» (§3)**: non esiste. In codice «Fatto oggi»
  è un interruttore che chiama `/api/workout/log` e basta. Il campo
  `sensazione` esiste nella tabella `workout_session` ma **nessuna UI lo
  scrive**: i chip facile/giusto/duro non ci sono.
- **Card documento con «Apri» (§5)**: il file caricato non viene conservato
  con un indirizzo suo, quindi non c'è niente da aprire.
- **«Sposta allenamento» come riga a sé (§5)**: lo spostamento vive dentro
  «Correggi un giorno», in fondo al foglio («Sposta o scambia con»).
- **«+ Aggiungi esercizio fuori scheda» (§1.3)**: aggiungere un esercizio si fa
  in «Correggi un giorno», che è il posto dove la scheda si corregge. Nella
  lista di oggi non c'è, perché quella lista è la scheda del preparatore.
- **La vista `embedded`** (l'Allenamento dentro lo swipe della Home) è rimasta
  di proposito nel vestito vecchio: non era in questa ondata.

### Dove il mock e il codice si contraddicevano — e chi ha vinto

1. **La sotto-vista «Allenati ora» (§2).** Il mock la disegna come *un
   esercizio alla volta*, con «Fatto → prossimo», la freccia indietro e un
   **timer di recupero a schermo pieno** (la classe `.giant`, con il numerone
   in Fraunces 120 e lo stato «Vai»). Il codice fa un'altra cosa: `SessioneLive`
   è una **fisarmonica di tutti gli esercizi**, dove per ognuno registri serie,
   ripetizioni e chili, con accanto quanto avevi caricato l'ultima volta — che
   è il motivo per cui la schermata esiste. **Ha vinto il codice**: portare il
   passo-passo del mock avrebbe voluto dire buttare via la registrazione delle
   serie, cioè il dato vero, per un modo di navigare.
   Conseguenza: **`.giant` non è usata in nessun punto**. Un timer di recupero
   non esiste nel codice, e inventarlo sarebbe stata una funzione nuova, non un
   vestito. Se lo vuoi, è una richiesta a parte.
   Restano portate `.full`, `.topbar` (con barra di progresso), `.fullpad`,
   `.actions` e lo stepper `Step`.
2. **«Sticky: vietata» (§0).** Vale per la pagina principale, e lì è
   rispettata. La sotto-vista a schermo pieno usa `.topbar` **sticky**, perché
   è la testata del mock per quello schermo: il tasto di chiusura deve restare
   raggiungibile mentre scorri l'elenco degli esercizi.
3. **Padding di fondo «116px + safe-area» (§0).** In codice è `PAGE_PB`,
   cioè `128px + safe-area`: è l'altezza vera della barra di `KeikoNav`, che è
   più alta della tab bar del mock. Ha vinto il codice, perché il vincolo è
   «la barra non copre mai l'ultima card».
4. **«La spunta si disegna» (§1.3).** In codice la spunta dell'esercizio **non
   si tocca**: un esercizio è fatto quando ci sono serie vere registrate, e le
   serie si registrano dentro la sessione. La spunta è un indicatore, non un
   comando: altrimenti avresti due verità sullo stesso fatto.
