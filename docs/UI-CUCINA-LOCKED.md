# KEIKO UI V2 — CUCINA, LOCKED

> 🔒 Stato **FINALE e APPROVATO** della sezione Cucina (9 agosto 2026, giro 5).
> Mock di riferimento: `docs/mockups/cucina-v2-mock.html` — read-only.
> Manifesto di sistema: `docs/UI-DECISIONI-V2.md` (la Home è congelata in
> `docs/mockups/home-v2-final-mock.html`).
>
> **REGOLA DI PERSISTENZA.** Quando Matteo dice «implementa la Cucina in codice»
> (o chiede una schermata collegata), questa specifica è la FONTE DI VERITÀ:
> si mantengono naming, gerarchia, colori e i due livelli di accordion così
> come sono scritti qui. Non si reinterpreta, non si «migliora», non si
> rinomina. Se qualcosa non è specificato → **si chiede a Matteo**, non si
> inventa.

---

## 0 · Design system (invariabile)

| Regola | Valore |
|---|---|
| Colore di sistema | teal `#3DA5C4` (unico) · variante chiara `#86CCE0` · testo su teal `#08191E` |
| Colore azione | terracotta `#C96A45`, RARO: solo FAB, «Cucina con me», «Modifica dieta», bottone di invio → dell'assistente. Testo `#FFF3EC` |
| Color-coding per sezione | **vietato** — niente verde/blu/arancio per differenziare le aree. Pallini di categoria in grigio `#9BA0A8` |
| Elevazione | 3 quote: `#0F0F12` → `#1A1B20` → `#212228`, con top-highlight `inset 0 1px 0 rgba(255,255,255,.08)` (`.11` sulla quota alta) |
| Radius | 16 hero · 12 card · 9 foto incassata · 8 chip/bottone |
| Spaziatura | multipli di 4/8 · ≥32px sopra ogni titolo di sezione |
| Tipografia | Fraunces = voce (titoli di sezione, nomi, saluti) · Inter = fatti (dati, metadati, etichette) |
| Metadati | grigio `#9BA0A8`, Inter medium — **mai bold, mai maiuscolo** |
| Emoji | zero |
| Tab bar | fissa in basso, FAB terracotta al centro, tab «Cucina» |
| Contrasto | ≥4.5:1 su tutti i grigi |
| Caroselli | massimo uno per schermata |
| Componenti | riuso reale e condiviso: riga-pasto, card ricetta media, barra assistente, card-giorno, card ristorante |

---

## 1 · MENU DI OGGI — accordion a DUE livelli (comportamento bloccato)

**Header del blocco — sempre visibile, aperto o chiuso:**

- anello di progresso teal con «2/5» al centro (l'anello misura le **kcal**
  consumate sul totale del giorno, il numero misura i pasti)
- titolo **«Menu di oggi»** (Inter 13.5 semibold, dentro il pannello)
- sottotitolo: «910 di 1.480 kcal · 120g proteine · **dal piano**»
- badge motivante a destra: «sei a metà» (cambia col progresso:
  si parte → buon inizio → sei a metà → manca poco → ultimo pasto)
- **freccetta di SEZIONE** all'estrema destra

**Stato COMPATTO (default):** sotto l'header si vede **solo il pasto prossimo**
— es. «Merenda · adesso · Melone 150g», con la sua freccetta di riga.

**Freccetta di SEZIONE** (accanto a «sei a metà») → espande/chiude l'**INTERA
giornata**:

1. pasti già mangiati in alto — check teal pieno + testo barrato
   (opacità .6 + `line-through` 1px, contrasto ≥4.5:1)
2. pasto prossimo evidenziato (quota alta `#212228` + bordo teal, kicker
   «· adesso» in teal)
3. pasti successivi, righe compatte con kcal a destra
4. in fondo: **«+ Aggiungi un pasto fuori piano»** (teal, testuale)

**Freccetta di RIGA** (accanto alle kcal del singolo pasto) → espande/chiude
**solo quel pasto**, mostrando la scheda: ricetta in breve, foto piccola sul
pasto prossimo, **«Cucina con me»** (terracotta, primaria) e **«Scambia questo
pasto»** (teal, terziaria).

**Regole ferree:**

- i due controlli sono **indipendenti** e visivamente distinti:
  freccetta sul titolo = tutta la giornata · freccetta sulla riga = quel pasto
- **accordion esclusivo tra i pasti**: uno solo aperto alla volta
- nessun pasto è bloccato aperto: anche il prossimo si richiude
- al caricamento della pagina il pasto prossimo è aperto di default
- spuntando un pasto: la spunta si **disegna** (animazione), le kcal si
  sommano all'anello, e si apre da sé il pasto successivo
- tutti e 5 spuntati → stato «Giornata completa · domani si riparte dalla
  colazione»

**Paletto legale:** kcal e proteine sono **trascritte dal piano**, mai
calcolate né giudicate da Keiko. Se il piano non le dichiara, la riga non
compare.

---

## 2 · SEZIONI DELLA PAGINA CUCINA (ordine bloccato)

Tutti i titoli di sezione sono **Fraunces 16.5px in chiaro `#F1F4FA`**, con
eventuale coda grigia Inter 12px e link **«vedi tutti»** teal a destra.

1. **Header pagina** — «Cucina» (Fraunces 22) + «Domenica · 5 pasti · il
   prossimo è la merenda»
2. **Menu di oggi** (§1)
3. **Cosa si mangia?** — «vedi tutti» → Ricettario. Contiene:
   barra assistente (bordo e icona orca teal, **arancione solo sul bottone di
   invio →**, placeholder rotante) + due card ricetta media-first
   (badge sorgente TikTok/Ricetta, overlay play, «tempo · ≈kcal»)
4. **Ristoranti** · coda «sabato è già preso» — «vedi tutti» → Ristoranti.
   Due card contestuali: «per sabato · cena con Sara», «vicino a te · 600 m»
5. **Prossimi giorni** · coda «sei giorni già pronti» — card-giorno a **mezza
   foto a destra + gradiente verso il fondo**, giorno **«domani» in hero**
   (foto piena, titolo Fraunces), righe espandibili con la giornata completa
   (fondo alternato leggerissimo), micro-tag reale per riga
   («pesce a cena», «veloce», «cena fuori»…)
6. **Card «Il piano finisce sabato»** — stato vuoto progettato, con
   «Carica settimana»
7. **La tua dieta** — «gestisci» → schermata gestione. Card «Il piano della
   nutrizionista · caricato il 4 ago» con **«Modifica dieta»** (primaria
   terracotta) + **«Carica nuova dieta»** (secondaria)
8. **Header sticky**: allo scroll (>140px) compare una barra compatta con
   «Cucina» + barra di progresso teal + «2 di 5»

`Elimina dieta` **non sta in questa pagina**: vive dentro la gestione dieta.

---

## 3 · SCHERMATA «COSA SI MANGIA?» (Ricettario)

- **Barra assistente hero**: bordo e icona orca teal, arancione **solo** sul
  bottone di invio →, placeholder rotante («Cosa c'è in frigo?», «Qualcosa di
  veloce», «Voglia di pesce»), sotto 3 **prompt-esempio tappabili**
- **Scorciatoie editoriali** (Fraunces): Cena veloce · Svuota-frigo · Post-workout
- **Chip funzionali** con micro-icona: Dal frigo · Veloce · Fit · Veg ·
  Sotto 500 kcal · Una padella — attiva = fill teal pieno, inattiva = bordo marcato
- **Tre per stasera** · coda «ognuna col suo perché»: card media-first 16:9 con
  badge sorgente (TikTok/YouTube/Ricetta), **nome creator**, overlay play non
  invadente (in basso a sinistra), «guarda · durata», «tempo · ≈kcal», e il
  **motivo teal con spunta** («usi il pollo e le patate che hai») — il motivo è
  la firma del blocco. Match dieta come confronto fattuale
  («come la cena del tuo piano»), **mai un giudizio sui numeri**
- **Stavi cucinando** · coda «ti aspetta»: nome ricetta in **Fraunces**
  (Carbonara), «passo 3 di 6 · lasciata 2 giorni fa» come metadato grigio,
  «Riprendi» teal outline
- **Le tue salvate** · coda «12 salvate» + «vedi tutti»: filtri pill
  Tutte / Video / Ricette (stesso componente dei chip), griglia con gradiente
  sulle thumb, stato vuoto «Nessuna salvata qui — salva dai video o parti da
  Tre per stasera»

---

## 4 · SCHERMATA RISTORANTI

- stessa **barra assistente** del Ricettario («Dove mangiamo?»)
- **Per i tuoi impegni**: card feature full-bleed agganciata all'evento vero
  («sabato 16 · cena con Sara» → Trattoria Alba), gradiente scuro marcato sotto
  la foto per contrasto ≥4.5:1
- **Vicino a te**: griglia 2 col, metadati «cucina · distanza · prezzo» in
  grigio Inter, pallino categoria **neutro**
- **Salvati**: stato vuoto progettato + badge «Prenota da Keiko · in arrivo»

---

## 5 · SCHERMATA GESTIONE DIETA

- «La tua dieta» + «caricata il 4 ago · 7 giorni · 5 pasti al giorno»
- card documento: «Piano_agosto.pdf · dalla nutrizionista · **il piano è tuo:
  Keiko lo trascrive e basta**» + «Apri»
- lista **Gestione**: Carica una nuova dieta (foto o PDF) · Integra dettagli ·
  Scambia un pasto
- **Elimina dieta** in fondo: terziaria grigia, senza bordo, con conferma a
  doppio tocco

---

## 6 · Feedback e stati

- check «mangiato»: spunta che si disegna + kcal che si sommano all'anello
- «Scambia questo pasto» → conferma toast «Ok — ti propongo tre alternative dal piano»
- ogni lista ha uno **stato vuoto progettato**: salvate ricette, salvati
  ristoranti, giorni senza piano
- stato di caricamento con **orca monocromatica nuova** (mai il vecchio logo ambra)

---

## 7 · Storia dei giri (chiusa)

v2.0 primo mock → v2.1 media-first + porte paritarie → v2.2 gerarchia da Home
+ 4° schermo gestione dieta → v2.3 «Menu di oggi» / «Cosa si mangia?», anello,
sticky, giorni con foto → v2.4 pasto prossimo richiudibile, via «Il cuore della
cucina» → **v2.5 accordion a due livelli + titoli Fraunces = LOCKED**.

Il ciclo mock è **chiuso**. Osservazioni successive si raccolgono per la fase
di implementazione, non riaprono il mock.
