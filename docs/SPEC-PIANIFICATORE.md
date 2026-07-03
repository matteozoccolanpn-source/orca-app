# Keiko — Spec del Pianificatore (itinerari dagli incastri)

> Adattamento a Keiko/Supabase del PDF "Assistente di pianificazione da input frammentari".
> Questo documento è il **cervello della feature**. Prima si legge e si corregge questo,
> poi si scrive codice. Aggiornato il 2026-07-02.

---

## 1. Cosa fa, in una riga

L'utente inserisce biglietti in momenti diversi (volo andata, ritorno, un concerto).
Keiko riconosce che **si incastrano in un viaggio**, prepara in background un **piano
operativo** (dove prendere la metro, a che ora uscire, cosa fare la domenica) e lo mostra
su richiesta, con un **messaggio pronto da condividere**.

Keiko NON rifà Google: per prezzi e prenotazioni dà **link diretti**. Tiene per sé solo la
roba operativa che un link non ti dà comoda (orari mezzi, scioperi, chiusure).

---

## 2. Le due fasi (il cuore dell'architettura)

Divisione decisa insieme, serve a non far aspettare l'utente 3 ore:

### Fase PESANTE (in background, automatica, invisibile)
- Parte **da sola** quando un incastro viene riconosciuto come **completo**
  (non a ogni biglietto: vedi §6, trigger).
- Usa **Claude con web-search** per raccogliere le info **operative** (vedi §4).
- Salva tutto nella **memoria nascosta** (tabella Supabase `trip_plans`), pre-calcolata.
- L'utente non aspetta e non vede niente in questa fase.

### Fase LEGGERA (a richiesta, veloce)
- Parte quando l'utente preme un bottone ("che fare?" / "crea itinerario").
- **Non rifà la ricerca.** Verifica solo il **volatile operativo** (orari/scioperi possono
  essere cambiati da quando è girata la fase pesante) e impagina il piano già salvato.
- Output editabile, riusando il pattern **swap-ingredienti della dieta** già in Keiko.

---

## 3. Il listario degli incastri (pattern → cosa fare)

Un "incastro" è una combinazione di eventi che forma un viaggio. Solo questi fanno
partire il pianificatore: un meeting di lavoro o un evento singolo personale **no**.

| # | Pattern (eventi che si incastrano) | È un viaggio? | Info operative da preparare |
|---|---|---|---|
| 1 | Solo A/R (volo o treno andata + ritorno), senza evento né hotel | Minimo | **Nessuna ricerca**: solo link Google Maps alla stazione/aeroporto. Niente piano a orari. |
| 2 | A/R + **evento** (concerto/museo/partita) stessa città e date | Sì (caso principe) | Come raggiungere la venue, ingresso/settore giusto, navette, chiusure/rientro notturno, code |
| 3 | A/R + **hotel** stessa città | Sì | Zona hotel vs mezzi per la venue/centro; check-in/out vs orari treni; deposito bagagli |
| 4 | Solo evento in **altra** città (senza viaggio inserito) | Parziale | Suggerire A/R (link Skyscanner/treni) + hotel (link Booking) + **tips ristoranti/bar vicini alla venue**; niente piano orari finché manca il viaggio |
| 5 | Più eventi stessa città nello stesso weekend | Sì | Ordinare le attività per orari/vicinanza; riempire i buchi (musei climatizzati, pause) |
| 6 | Evento monogiornata pendolare (vai e torni in giornata) | Sì (leggero) | Solo tratta andata/ritorno + margine; niente hotel |
| — | Meeting lavoro / evento personale isolato | **No** | Nessuna azione: non è un viaggio |

> Nota: la lista è **estendibile**. Si parte dai pattern 1-2-3 (i più comuni) e si aggiunge
> il resto quando serve.

---

## 4. I tre secchi (regola d'oro) — definito con Matteo

Ogni informazione finisce in UNO di tre secchi. Questo decide se si cerca, se si salva, se
è solo un link. È la regola che tiene **basso il costo** e **onesto il prodotto**.

1. **FISSO — dai biglietti.** Orari treni/voli, carrozza, posto, nome passeggero.
   → estratto dai biglietti, **mai cercato**. Sono le ancore del piano.

2. **COMMERCIALE — solo nome + link.** Hotel, voli, biglietti museo/evento.
   → NON si salva prezzo né disponibilità. Si dà il **deep-link** (Booking, Skyscanner,
   GetYourGuide, sito treni): "c'è Villa Borghese" + link. Il prezzo lo mostra il sito,
   live, quando l'utente clicca. Zero dato che invecchia, zero costo, zero responsabilità.

3. **LOGISTICA OPERATIVA — QUI serve la web search.** Ingresso/settore giusto per il tuo
   posto, navette e tempi, distanze a piedi, **chiusure/scioperi di quel giorno preciso**,
   metro notturna, se il museo è aperto QUELLA domenica.
   → non è nei biglietti e non è un prezzo. È il "dove prendo la metro e occhio che quel
   giorno c'è casino": **il vero valore di Keiko**. Si salva in `trip_plans` con timestamp
   e si ri-verifica nella fase leggera. Ed è **poca roba** → costo basso.

> Esempio-prova (dal caso reale di Matteo): *"il 4 luglio le fermate Metro C Torrenova e
> Torre Angela sono chiuse"* → secchio 3. Non è sul biglietto, non è un bottone "prenota":
> la sa solo la ricerca sul sito ufficiale.

> Nota: la **conoscenza stabile** (geografia di Roma, quali linee metro esistono) non è un
> secchio a parte: è come Claude ragiona, non si cerca e non si salva.

### Quando gira la ricerca del secchio 3? (chiarimento)

La ricerca web approfondita gira **UNA volta sola, nella fase pesante** (§2), in background
quando l'incastro è completo. La **fase leggera** NON ri-cerca da capo: ri-verifica solo se
il volatile (scioperi/chiusure/orari) è cambiato, e impagina. Quindi: *ricerca profonda =
una volta in background; check veloce = a ogni apertura.* Non esiste un "primo check leggero
e poi ricerca dopo": la ricerca approfondita **è** la fase pesante.

---

## 5. Stati degli slot (protezione anti-loop)

Il piano è fatto di **slot** (mattina sab, pomeriggio sab, sera sab, domenica...). Ogni slot
ha uno stato:

- **APERTO** — vuoto o riempito da un'inferenza; i refresh possono aggiornarlo.
- **RIEMPITO** — c'è dentro qualcosa proposto da Keiko.
- **BLOCCATO** — l'utente ha inserito un **biglietto reale** che occupa quello slot
  (es. compra il biglietto del museo).

Regola: **quando entra un biglietto che riempie uno slot → il piano si aggiorna UNA volta →
lo slot si blocca → i refresh futuri lo saltano.** Così i refresh lavorano solo sugli slot
aperti: niente ricerche a vuoto, niente loop che inceppano tutto e fanno esplodere i costi.

---

## 6. Trigger della fase pesante (quando parte)

- Parte **solo a cluster completo**, non a ogni biglietto inserito (se no si paga ricerca a
  vuoto su un viaggio ancora incompleto).
- **Idempotente**: se il piano per quel cluster è già stato calcolato, non si rifà da zero.
- Un biglietto nuovo che tocca il cluster → aggiorna solo lo slot interessato (vedi §5),
  non fa ripartire tutta la ricerca.

---

## 7. Output (cosa vede l'utente)

Nella fase leggera Keiko produce, nel suo formato:

1. **Piano a orari a ritroso** dalle ancore fisse (es. treno 12:35 e concerto 20:30 →
   "esci hotel ~15:00", "Anagnina ~16:00", con margine per le code).
2. **Deep-link** per il commerciale (hotel/voli/biglietti) e per **Google Maps**
   (stazione/aeroporto → vedi task a parte, era già presente e va ripristinato).
3. **Tips di contorno (cibo, chill)** — ristoranti/bar vicini alle ancore (hotel, venue,
   Termini) e posti per rilassarsi nei buchi liberi.
   - **v1 (decisa):** Keiko NON sceglie il locale. Dà un **link Google Maps già filtrato**
     (es. "ristoranti vicino all'hotel"). Zero ricerca, zero costo, zero rischio di
     consigliare un posto chiuso o inventato.
   - **Dopo (da valutare):** versione "ricca" con 2-3 nomi precisi dalla web search.
   Valgono soprattutto quando c'è tempo libero (es. la domenica "chillare") o un evento
   senza altro programma.
4. **Messaggio pronto da condividere** (es. per la fidanzata), editabile nel tono.

Tutto correggibile dall'utente come lo swap-ingredienti della dieta.

---

## 8. Vincoli tecnici (per non rompere niente)

- Route della fase pesante **isolata**: non tocca `/api/upload` (immagine + testo) che
  funziona.
- `trip_plans` è **additiva**: non tocca lo schema `Ticket`.
- Web-search è **codice nuovo** rispetto a tutto l'esistente: si tiene confinato.
- Segreti server-side: nessuna API key nel client.
- Modello: si riusa `claude-sonnet-4-5`, nessun nuovo modello, nessuna nuova dipendenza
  se evitabile.

---

## 9. Ordine di costruzione (a fette)

Per non impantanarsi sul pezzo "wow". Le fette sono i task #2–#11 della lista:

1. Questo listario (design). ✅ = questo documento.
2. Tabella `trip_plans` (memoria nascosta).
3. Rilevamento incastri dai pattern 1-2-3.
4. Fase pesante con web-search (solo operativo).
5. Trigger idempotente + stati slot.
6. Fase leggera (verifica volatile + impaginazione editabile).
7. UI (bottone + rendering + messaggio).
8. Ripristino Google Maps (indipendente).
9. Verifica: build + test con i 3 biglietti Milano-Roma + concerto.

> Costo web-search verificato: **$10 / 1000 ricerche** (~$0,01 a ricerca), + token dei
> risultati. Con max_uses=6 un viaggio costa pochi centesimi. Non è un ostacolo.

---

## 10. Guardrail viaggi lunghi (deciso con Matteo)

L'auto-ricerca (fase pesante automatica) NON parte per i viaggi lunghi. Se la durata è
~1 settimana o più, è un viaggio complesso da pianificare a tavolino con una ricerca
one-shot → si sprecherebbero ricerche e verrebbe male. Regola: se
(end_date − start_date) ≥ ~7 giorni, il viaggio viene rilevato e salvato ma l'**auto-enrich
lo salta**.

I viaggi lunghi, in futuro (fase avanzata), si pianificheranno **chattando con Keiko** — non
con la fase pesante secca. Feature avanzata, non ora.

La funzione **enrichTripPlan** resta comunque sempre disponibile come azione manuale/su
richiesta, anche per i viaggi lunghi (l'utente la lancia se vuole).

### Viaggi multi-città: le tratte interne sono ANCORE che vincolano tutto (deciso con Matteo)

Per un viaggio lungo multi-città (es. USA):
1. si carica il volo oceanico A/R;
2. si caricano le **tratte interne** (voli/treni dentro il paese di destinazione);
3. queste tratte creano una **timeline "città-per-data"**: si sa dove sei ogni giorno.

Regola d'oro: qualsiasi tips/ricerca/itinerario generato deve **sposarsi e bloccarsi** con
questi biglietti. Se mercoledì il volo è per Los Angeles, mercoledì l'utente è a LA →
Keiko NON deve proporre New York quel giorno. I biglietti sono **ancore** che fissano
luogo + data; il piano si costruisce **PER SEGMENTO** (città + intervallo di date), mai
mischiando le città.

Nota: il rilevamento attuale (`detectClusters`) è pensato per UN viaggio a UNA destinazione
(weekend). Il modello multi-città a segmenti è parte della fase avanzata/chat, non ora.

**UX multi-città (riusa l'architettura esistente):** carichi il programma → Keiko lo impagina
pulito → la fase pesante gira in background **per segmento (per città)** → entri nel viaggio,
**schiacci una città** e vedi le cose da fare lì (piano già pronto, fase leggera). Vale la
stessa regola degli slot: le cose **già caricate/fissate non si ri-cercano** (risparmio).
Cioè: stesse due fasi + slot-lock + tre secchi di sempre, applicati per-città.

Entry point dell'itinerario: **NON** "Quando uscire" (a Matteo non piace) → da ridisegnare
insieme quando facciamo la UI.
