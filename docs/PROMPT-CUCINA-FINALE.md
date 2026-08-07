# Keiko — Cucina: il prompt finale (redesign + V2 completa)

> 7 agosto 2026. UN prompt solo, in tre fasi con checkpoint: Claude Code si
> ferma a fine fase, Matteo guarda gli screenshot e dice «vai».
> Riferimenti obbligatori: `docs/SPEC-CUCINA.md` + `docs/mockups/cucina-redesign-mock.html`.

---

```
CUCINA — REDESIGN COMPLETO + V2. Lavoro in TRE FASI: alla fine di ogni fase
ti FERMI, mostri screenshot e diff, e aspetti il mio «vai» per la successiva.

Leggi prima, nell'ordine:
1. docs/mockups/cucina-redesign-mock.html — aprilo e navigalo: è la BASE
   visiva. Ma non è il soffitto: hai licenza di migliorarlo — spaziature,
   micro-interazioni, transizioni, dettagli che il mock non cura. I vincoli
   dentro cui puoi spingerti: variabili colore esistenti (niente colori
   nuovi), test scala di grigi di docs/UI-REGOLE-BASE.md, bersagli 44px,
   input 16px, prefers-reduced-motion rispettato. Dentro questi, stupiscimi.
2. docs/SPEC-CUCINA.md — paletti legali e architettura.
3. docs/UI-VOICE.md — ogni testo visibile viene da lì o me lo chiedi.

Autorizzati: app/cucina/*, app/api/cucina/*, lib/cucina*.ts (nuovo se serve),
lib/supabase.ts, docs/sql/, lib/ai.ts (solo per aggiungere pesi). La vista
dieta attuale (DietView) NON si tocca: la zona ① LEGGE il piano con le
funzioni di lettura già esistenti, in sola lettura. CaptureSheet non si apre.

PALETTO LEGALE, VALE PER TUTTE LE FASI: questa sezione non parla mai col
piano alimentare nel CONTENUTO. Niente calorie, niente «adatto alla dieta»,
mai una ricetta suggerita come sostituto di un pasto del piano. Il piano si
MOSTRA e si ESEGUE (hero, striscia, cook mode); le ricette vivono sotto,
separate. Nel foglio ricetta il disclaimer del mock: «Ricetta estratta dalla
descrizione del creator, non modificata · Keiko non dà consigli nutrizionali».

════════ FASE 1 — LA PAGINA NUOVA ════════

1. /cucina diventa il mock: zona ① piano (hero prossimo pasto + striscia
   pallini della giornata — SOLO per chi ha un piano; senza piano la pagina
   parte dalla domanda), zona ② domanda + chip, zona ③ ricettario a
   scaffale + «Da rifare» (il battito ricetta, riga in BEATS se non c'è già).
2. Loghi piattaforma: SVG inline di TikTok/YouTube (come nel mock) sul
   badge delle card, con nome autore sempre visibile.
3. FIX del salvataggio: via la barra lunga orizzontale — il bottone diventa
   spunta sul posto («✓ Salvata») + toast piccolo che sparisce da solo,
   come nel mock.
4. L'INTERPRETE della domanda:
   - euristica prima: se la query contiene solo cibi/ingredienti
     riconoscibili («pollo e patate») va DIRETTA a Tavily, zero AI;
   - se è situazionale («serata tra amici per la partita»), UNA chiamata a
     Claude Haiku, max_tokens 80, senza strumenti: frase → 3-5 parole di
     ricerca. spendAi con peso nuovo `interprete: 1` in lib/ai.ts.
   - la traduzione si MOSTRA sopra i risultati come nel mock («Hai chiesto
     … → cerco: …»): l'utente deve vedere cosa ha capito Keiko.
   - cache 7 giorni anche sull'interprete (stessa frase → stessa
     traduzione, zero costi ripetuti). Se Haiku produce parole assurde o
     fallisce → si cerca la frase originale, mai un errore.
5. La 🛒 pastiglia compare già ma apre un foglio «in arrivo» (la spesa vera
   è in Fase 2) — oppure nascondila fino alla Fase 2, scegli tu e dimmelo.

CHECKPOINT 1: screenshot a 390px di: pagina con piano, pagina senza piano
(utente nuovo), risultati con interprete visibile, salva→spunta. Scala di
grigi sulla pagina intera. tsc e build verdi. FERMATI.

════════ FASE 2 — V2A: LA RICETTA IN MANO ════════

6. SQL (blocco pulito, la eseguo io): su recipes una colonna `extracted`
   jsonb nullable; una tabella `shopping_items` (id, user_id, nome,
   quantita, fonte 'piano'|'ricetta', ref, spuntato bool, created_at) con
   RLS per-utente come le altre.
7. ESTRAZIONE al pick: quando l'utente apre una ricetta non ancora
   estratta, UNA chiamata Claude (Sonnet, peso `estrazione: 1`): dalla
   caption TikTok (oEmbed title) + dal `content` che Tavily già restituisce
   → JSON {ingredienti:[{nome, quantita}], passi:[], tempo, porzioni}
   oppure {insufficiente: true}. REGOLA FERREA: si estrae SOLO ciò che è
   scritto — quantità mancante = campo vuoto, MAI inventata. Insufficiente
   → il foglio mostra «la ricetta completa è nel video» + link, fine.
   Risultato salvato in recipes.extracted: si estrae una volta nella vita.
8. IL FOGLIO RICETTA (schermo 3 del mock): hero, meta (tempo/porzioni),
   ingredienti spuntabili «tocca quello che hai già», passi numerati,
   link al video originale sempre visibile, disclaimer.
9. LA SPESA: «In lista spesa (N)» aggiunge i NON spuntati a shopping_items.
   Il foglio spesa (dalla pastiglia): voci raggruppate, etichetta di
   provenienza `piano`/`ricetta` come nel mock, spunta al supermercato,
   svuota fatti. Le voci `piano` arrivano dalla lettura del piano della
   settimana (sola lettura, aggregazione semplice).
   AMAZON FRESH: link per voce → https://www.amazon.it/s?k={nome}&i=amazonfresh
   (encodeURIComponent). Niente prezzi scritti, mai. Glovo NON si mette:
   non ha URL di ricerca — non fingere che ce l'abbia.

CHECKPOINT 2: prova vera — cerca, apri una ricetta, estrazione con
ingredienti reali dalla caption, 3 voci in spesa, foglio spesa con fonti
miste. Una ricetta con caption povera → «è nel video», senza errori.
Token e costo dell'estrazione letti da usage_log. FERMATI.

════════ FASE 3 — V2B: CUCINA CON ME ════════

10. COOK MODE, schermo pieno (foglio full-height): un passo alla volta,
    grande, avanti/indietro col pollice, spunte ingredienti in apertura.
    Se un passo contiene un tempo («20 minuti», «mezz'ora») → timer
    integrato con un tocco. Schermo sempre acceso: navigator.wakeLock,
    con fallback silenzioso dove non c'è. A fine ricetta: festeggia
    sobrio + «fatta N volte» si incrementa.
11. Vale per DUE fonti: ricette estratte (passi veri) E pasti del piano —
    che non hanno passi: per loro modalità semplificata, schermo acceso +
    ingredienti del pasto + timer libero + «fatto». Eseguire il piano,
    non modificarlo.

CHECKPOINT 3: cook mode su una ricetta vera con timer, e su un pasto del
piano. Wake lock verificato (o fallback dichiarato). tsc e build verdi.
FERMATI: il commit lo decidiamo insieme a fine collaudo dal telefono.

COSTI A REGIME (da verificare su usage_log a fine lavoro):
ricerca 0 · interprete ~0,1-0,2 cent solo su frasi situazionali (poi cache)
· estrazione ~1-2 cent una volta per ricetta · resto 0.
```

---

## Nota a margine — la UI generale (il PPS di Matteo)

Matteo: «la UI dell'app in generale non mi convince». Registrato, e la
risposta strategica è già in moto senza bisogno di un big-bang: **la lingua
visiva nata qui (hero immersivi, fogli, scaffali, pastiglie) diventa lo
standard, e si propaga una sezione alla volta** — Cucina ora, poi la vista
«Oggi» del piano, poi Guarda/home dove serve. Un redesign generale in un
colpo solo è il progetto che ammazza i progetti; la propagazione è la stessa
cosa, fatta senza fermare l'app. Dopo il collaudo di Cucina: giro di
screenshot di tutte le pagine, confronto con la lingua nuova, e lista di
priorità. (E resta in piedi l'opzione C — l'app a momenti — come stella
polare per la home, da riprendere coi dati d'uso degli amici.)
