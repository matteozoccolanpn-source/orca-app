# PIANO KEIKO — documento unico

> Questo documento **sostituisce** i 13 documenti di pianificazione. Da qui in avanti si
> aggiorna solo questo. Gli altri restano in `docs/archivio/` come storia, non come piano.
> Ogni affermazione qui dentro è stata **verificata sul codice**, non copiata dai vecchi doc:
> è il motivo per cui alcune cose che i doc davano per aperte risultano chiuse, e viceversa.
>
> Aggiornato: 21 luglio 2026.

---

## Il piano, in tre passi

1. **Multiutente vero**, come se fosse un'app pubblica.
2. **Privacy e legale**: sotto c'è tutto ciò che serve, cosa decide Matteo, e le fonti.
3. **Dieta ripensata** (non sistemata: ripensata).

Poi: test con Matteo, Federica e persone vicine.

L'allenamento va rifatto da zero, ma **dopo**. Resta in coda, non è dimenticato.

---

## Dove siamo davvero (verificato sul codice, 21 luglio 2026)

**Il multiutente è molto più avanti di quanto dicano i documenti.** `MULTIUTENTE.md` parla di
"fasi 2-7 aperte": è carta straccia. Nella realtà:

- `lib/user.ts` deriva un uuid stabile dall'email (uuid v5, namespace fisso). Funziona.
- `lib/supabase-user.ts` e `lib/supabase-jwt.ts` esistono: c'è il client per-utente.
- `lib/supabase.ts` ha l'interruttore `MULTIUSER_RLS`. Il commento a riga 57 dice "SPENTO in
  produzione": **è vecchio e va corretto**, perché in produzione è acceso (Federica vede i
  suoi dati, non quelli di Matteo).
- I due cron (`app/api/cron/reminders`, `app/api/cron/tick`) sono scritti bene: raggruppano le
  push per `user_id` e filtrano ogni query esplicitamente. Nessuna notifica va alla persona
  sbagliata.
- L'onboarding primo avvio esiste (`Onboarding.tsx`, 3 passi).

**E una buona notizia grossa, che nessun documento aveva registrato:** gli screenshot che
carichi **non vengono mai salvati**. `app/api/upload/route.ts` converte l'immagine in base64,
la manda all'API di Anthropic, e la butta. Non esiste nessun bucket di storage nel progetto
(`grep .storage.` → zero risultati). Questo è un vantaggio privacy enorme e va scritto
nell'informativa a caratteri cubitali: *"le foto che carichi non le conserviamo"*. Poche app
possono dirlo.

---

## PASSO 1 — Multiutente vero

Non è "fare il multiutente": è **togliere le tre cose che tradiscono che è un'app privata**.

### 1.1 La lista invitati deve uscire dal codice 🔴 *(blocca i tester)*

In `auth.ts`, callback `signIn`, c'è un array con due email scritte a mano. Per far entrare
una terza persona oggi devi **modificare il codice e rideployare**. Finché è così, "lo testo
con persone vicine" non è possibile.

Serve: una tabella `invitati` (email, invitato_da, creato_il, stato) + una schermata nel
Profilo per aggiungere un'email. Il callback `signIn` legge dalla tabella invece che
dall'array. Piccolo lavoro, sblocca tutto lo step di test.

### 1.2 Via le rotte di diagnostica 🔴

`app/api/debug/rls/route.ts` espone lo stato dell'isolamento dati. Il suo stesso commento
dice "da rimuovere dopo la diagnosi". Stessa cosa per `app/api/debug/home/route.ts`, che
stampa il valore della variabile `MULTIUSER_RLS`. Prima che entri un estraneo devono sparire
entrambe (o restare dietro un controllo "solo Matteo").

### 1.3 Cancellazione account e export dati 🔴 *(è anche un obbligo di legge, vedi Passo 2)*

Non esiste. Non c'è nessuna rotta che cancelli i dati di un utente. Serve:

- `DELETE /api/account` — cancella **tutte** le righe con quel `user_id` su tutte le tabelle
  (`tickets`, `todos`, `workout_*`, `diet_plan`, `profile`, `trip_plans`, `watchlist`,
  `push_subscriptions`, `search_log`), poi disconnette. Va scritto con la lista esplicita
  delle tabelle, non con una scorciatoia: se domani aggiungi una tabella e ti dimentichi di
  metterla qui, resta un residuo — e quello è un problema legale, non solo tecnico.
- `GET /api/account/export` — restituisce un JSON con tutto quello che l'app sa di te.
  Più semplice di quanto sembri: sono le stesse query di lettura che già esistono.

### 1.4 Verifiche da fare (non codice, controlli)

- Confermare che **ogni** tabella abbia una policy RLS attiva su Supabase, non solo quelle
  testate. Basta una tabella scoperta per bucare tutto.
- Correggere il commento a `lib/supabase.ts` riga 57, che oggi dice il falso.
- `MULTIUTENTE.md` va archiviato: descrive uno stato che non esiste più.

### 1.5 Costi per utente 🟡

La web-search del pianificatore costa ~$0,01 a ricerca e la parte AI costa token. Oggi
nessuno limita nulla perché gli utenti siete due. Con dieci tester serve almeno un tetto
giornaliero per utente, anche grezzo — altrimenti un tester curioso ti svuota il credito in
un pomeriggio.

---

## PASSO 2 — Privacy e legale

### La cosa che cambia tutto

**Keiko tratta dati sanitari.** Dieta, allenamenti, peso, misure corporee rientrano nelle
"categorie particolari" dell'**articolo 9 GDPR**. Non è un'interpretazione forzata: la
definizione copre qualsiasi informazione sullo stato di salute fisica, anche senza un medico
di mezzo.

Questo alza l'asticella rispetto a un'app di calendario normale. In pratica significa tre
cose:

1. **Serve consenso esplicito**, separato. Non basta una casella "accetto termini e privacy".
   Deve essere un'azione distinta, che nomina il trattamento: *"acconsento al trattamento dei
   miei dati relativi a dieta e allenamento"*. Spuntato attivamente, non pre-spuntato,
   revocabile.
2. **Doppia base giuridica**: una dell'art. 6 (contratto/consenso) **più** una condizione
   dell'art. 9(2). Per Keiko è il consenso esplicito, art. 9(2)(a).
3. **La valutazione d'impatto (DPIA)** diventa dovuta quando il trattamento di dati sanitari
   è su larga scala o sistematico. Con cinque tester quasi certamente no; al lancio pubblico
   sì. Consiglio: farne una versione leggera **subito**, perché è soprattutto un esercizio di
   pensiero che ti costringe a scrivere cosa raccogli e perché — e ti serve comunque per
   l'informativa.

### La scadenza che nessuno ti ha detto: 2 agosto 2026

Le regole di trasparenza dell'**AI Act europeo (articolo 50)** diventano applicabili il
**2 agosto 2026**. Sono fra dodici giorni.

Ti riguardano in due punti:

- **"Chiedi a Keiko" è un'interazione diretta con un'AI**: l'utente deve saperlo. Basta una
  riga visibile nell'interfaccia. Oggi non c'è.
- **I testi generati dall'AI** (consigli, itinerari, messaggi pronti da condividere) vanno
  segnalati come generati artificialmente.

È lavoro da mezz'ora, ma è una scadenza vera e cade prima del tuo test con persone esterne.
Metterla nel Passo 1 invece che nel 2 è ragionevole.

### Cosa serve, in concreto

**Documenti da avere online prima che entri chiunque non sia tu o Federica:**

- **Informativa privacy** (art. 13 GDPR). Deve contenere: chi è il titolare e come si
  contatta, quali dati raccogli, per quali finalità, su quale base giuridica, per quanto tempo
  li conservi, a chi li comunichi (i fornitori), se escono dall'UE, quali diritti hai e come
  esercitarli, e il diritto di reclamo al Garante.
- **Termini di servizio**: cosa promette Keiko e cosa no. Importante per te: **Keiko non dà
  consigli medici**. Una dieta suggerita da un'AI a una persona con una patologia è un rischio
  reale, e va escluso per iscritto.
- **Registro dei trattamenti** (art. 30). Sotto i 250 dipendenti si è esenti *tranne* quando
  si trattano categorie particolari — cioè il tuo caso. **Non sei esente.** È un foglio, non
  un progetto: elenco dei trattamenti, finalità, categorie di dati, destinatari, tempi.

**Accordi con i fornitori.** Tu sei il titolare, loro sono responsabili del trattamento.
Servono i DPA di: **Anthropic** (l'AI che legge gli screenshot), **Supabase** (il database),
**Vercel** (l'hosting), **Google** (il login). Tutti e quattro ne hanno uno standard da
accettare o firmare. Poi vanno elencati nell'informativa come sub-responsabili, con i paesi.

**Diritti degli utenti da implementare** — sono il punto 1.3 del Passo 1: accesso, rettifica,
**cancellazione**, portabilità. Non è cortesia, è obbligo, e ha tempi di risposta (un mese).

**Cosa NON ti serve, così non ci perdi tempo:**

- **Rappresentante UE**: no, sei stabilito in Italia.
- **DPO**: no, non alla tua scala. Da riconsiderare se il monitoraggio di dati sanitari
  diventa un'attività principale su larga scala.
- **Banner cookie**: no, oggi. Il cookie di sessione di NextAuth è tecnico/necessario. Ti
  servirà **il giorno che aggiungi analytics**: in quel momento diventa obbligatorio.

### Le tre decisioni che devi prendere tu (io non posso)

**A. Chi è il titolare del trattamento?** L'informativa deve indicare il titolare **con
recapito**. Se sei tu come persona fisica, pubblichi il tuo nome e un indirizzo. È la sorpresa
che coglie impreparati quasi tutti gli sviluppatori singoli. Le alternative: aprire una
società/ditta individuale, o usare un domicilio eletto. Va deciso **prima** di scrivere
l'informativa, perché ne è la prima riga.

**B. Per quanto tempo conservi i dati?** Non esiste una risposta giusta, esiste l'obbligo di
sceglierne una e rispettarla. Le domande: un evento passato resta per sempre? Un allenamento
di due anni fa? Se un utente non apre l'app per un anno, i suoi dati restano? Attenzione: la
"Memoria & statistiche" che vuoi come feature-firma **vive di storico lungo** — le due cose
vanno bilanciate consapevolmente, non per inerzia.

**C. Gratis, freemium o a pagamento?** Non è solo business: cambia la base giuridica. Con un
servizio a pagamento gran parte del trattamento si regge sul **contratto**, che è più solido
del consenso (revocabile in qualsiasi momento).

### Fonti da cui studiare (in ordine: le prime tre bastano per capire)

1. **[Guida all'applicazione del GDPR — Garante Privacy](https://www.garanteprivacy.it/regolamentoue/guida-all-applicazione-del-regolamento-europeo-in-materia-di-protezione-dei-dati-personali)**
   — è l'autorità italiana, in italiano, ed è la fonte che conta se qualcosa va storto.
   Parti da qui.
2. **[Cosa deve contenere l'informativa (art. 13) — iubenda](https://www.iubenda.com/it/help/132463-informativa-privacy/)**
   — pratico, in italiano, scritto per chi deve produrre il documento e non studiare il
   diritto. (iubenda è anche un servizio a pagamento che genera informative: per partire può
   avere senso, ma leggi prima di comprare.)
3. **[Le regole di trasparenza dell'AI Act — articolo 50](https://artificialintelligenceact.eu/transparency-rules-article-50/)**
   — la scadenza del 2 agosto 2026, spiegata bene e gratis.

Per approfondire:

4. **[Articolo 9 e categorie particolari — guida 2026](https://secureprivacy.ai/blog/gdpr-article-9-special-categories-lawful-processing-and-compliance-guide-2026)**
   — cosa conta come dato sanitario e cosa serve per trattarlo.
5. **[Informativa art. 13 e 14 alla luce delle Linee Guida sulla trasparenza](https://www.iusprivacy.eu/normativa/linformativa-privacy-ai-sensi-degli-articoli-13-e-14-del-gdpr-analisi-completa-alla-luce-delle-linee-guida-sulla-trasparenza)**
   — più giuridico, utile quando scrivi davvero il testo.
6. **[Linee guida della Commissione UE sugli obblighi di trasparenza AI](https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems)**
   — la fonte ufficiale sull'AI Act, se vuoi andare all'originale.
7. **[Quando serve una DPIA (art. 35)](https://gdprlocal.com/data-protection-impact-assessment/)**
   — per capire se e quando ti tocca.

**Un avvertimento onesto:** io non sono un avvocato. Tutto quello che c'è qui sopra è
ricerca verificata su fonti pubbliche, ed è più che sufficiente per il test con persone
vicine. Per il **lancio pubblico** con dati sanitari di estranei, una revisione legale vera
è denaro speso bene — poche ore, non un progetto.

---

## PASSO 3 — Dieta ripensata

Non "sistemata": **ripensata**. Il criterio è quello di sempre — la dieta di Keiko deve fare
qualcosa che nessuna app di dieta può fare, e la cosa che nessun'altra ha è che **Keiko vede
il calendario**.

L'esempio che regge tutto è già nella lista dei 140, punto 86, lo "sgarro intelligente":
Keiko sa dal calendario che stasera hai una cena fuori. Non ti segna rosso il giorno: ricalibra
il resto della giornata prima che succeda. Nessuna app di dieta può farlo, perché nessuna sa
che stasera esci.

Il ripensamento vero e proprio va progettato quando ci arriviamo — dopo i passi 1 e 2, e con
in mano cosa ti sarà servito davvero usandola nel frattempo. Qui si annota solo la stella
polare, per non ricominciare da capo la discussione.

---

## Cosa si archivia

In `docs/archivio/` (storia, non piano): `TODO-ROADMAP.md`, `MIGLIORAMENTI.md`,
`POST-UI-BACKLOG.md`, `AI-GAP-ANALYSIS.md`, `REVIEW-CRITICA-KEIKO.md`, `PIANO-LANCIO.md`,
`ROADMAP-AL-LANCIO.md`, `STATO-E-TODO.md`, `PUNTO-DELLA-SITUAZIONE.md`,
`PIANO-IMPLEMENTAZIONE.md`, `POTENZIAMENTO-FEATURE.md`, `MULTIUTENTE.md`, `99-MIGLIORIE.md`.

Restano vivi e fuori dall'archivio:

- **questo documento** — il piano;
- `100-PUNTI-LANCIO.md` — l'inventario delle idee, da cui si pesca, non da cui si esegue;
- `SPEC-PIANIFICATORE.md` — è il cervello di una feature, non un piano;
- `BUSSOLA-E-ROADMAP.md` — il posizionamento;
- `TASK-TOUCH-NAV.md` — in esecuzione ora;
- `HANDOFF.md` — lo stato per ripartire in una nuova sessione.

`DECISIONI.md` merita un discorso a parte: 164 decisioni con le frecce tutte vuote. Non è un
documento, è un elenco di domande mai risposte. O si sfoltisce a quelle che contano davvero
(saranno dieci) e si risponde, o si archivia. Tenerlo così com'è non serve a nulla.
