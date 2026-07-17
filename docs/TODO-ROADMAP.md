# Keiko — Roadmap operativa (to-do per macro)

> Ordine di esecuzione in stile "startupper senior": **1) si smette di sanguinare** (bug che rendono l'app inusabile) → **2) fondamenta** che sbloccano tutto il resto (design system unico + pipeline AI unica) → **3) il cuore** (Home e la sua interazione) → **4) redesign immersivo** scheda per scheda con i benchmark scelti → **5) scommesse nuove**. Ogni task è piccolo e mirato. Tag effort: **S** = ore, **M** = 1-2 giorni, **L** = settimana+.
>
> Benchmark visivi scelti (da Mobbin): **Dieta** → CREME + Kitchen Stories · **Allenamento** → Equinox+ + Tonal (metodo e semplicità) · **Viaggio** → Stippl. Regola trasversale: heroes immersivi in stile dark Keiko **ma con foto/immagini reali**, non solo gradienti.

---

## MACRO 0 — Stabilizzazione (settimana 1): l'app deve essere usabile ogni giorno
*Perché prima: se tu non riesci a usarla, nessun redesign conta. Sono fix piccoli e ad alto impatto.*

- [ ] **Cache PWA / deploy visibili** — versioning del service worker + banner "nuova versione, ricarica". (S) *Meta-bug: senza questo non vedi nemmeno gli altri fix.*
- [ ] **Tema scuro fisso** — rimuovere il tema chiaro (o renderlo scelta esplicita via cookie server-side). Stop al ribaltamento. (S)
- [ ] **Logout** — aggiungere in topbar/menu profilo su tutta la v2 (`KeikoPreview` + `KeikoShell`). (S)
- [ ] **Spunte allenamento persistenti** — salvare lo stato del singolo esercizio, non solo "fatto oggi". (M)
- [ ] **"Sposta"/riprogramma evento** — riprodurre il bug fuso Roma↔UTC, blindare con 2-3 test. (M)
- [ ] **Movimenti** — verificare su device che gli ultimi fix (smooth-scroll, spring, .rise) bastino; altrimenti tuning mirato per gesto. (S)

## MACRO 1 — Fondamenta: design system unico + AI unica
*Perché adesso: redisegnare su fondamenta rotte = rifare due volte. Un senior consolida qui prima di toccare le UI.*

- [ ] **Una sola fonte di verità design** — unificare `globals.css` e `keiko.css` in un set unico di token (colori, font, spazi, raggi). (L)
- [ ] **Font brand** — decidere e caricare il font definitivo (il mockup voleva un "rounded", l'app usa Inter): coerenza ovunque. (S)
- [ ] **Component library minima** — Card, Hero (con supporto immagine), Bottom-Sheet, Chip, Button riusabili da tutte le schede. (M)
- [ ] **Pipeline AI unica e affidabile** — un solo servizio "arricchisci con AI" (web search inclusa) usato da: todo, film, eventi. Deve scattare **sempre** e restituire orario/luogo/link/dove-vederlo. Generalizza il bug della ricerca todo. (L)
- [ ] **Contratto dati immagini** — aggiungere il campo immagine agli schemi (pasti, esercizi, film, tappe) per abilitare gli heroes con foto reali. (M)

## MACRO 2 — Il cuore: nuova Home e interazione signature
*Perché qui: la Home è l'hub; è la cosa che tocchi 20 volte al giorno.*

- [ ] **Popover contestuali** — toccando una categoria (Dieta/Allenamento/Guarda…) si apre una finestrina vicino al punto toccato (sopra/sotto secondo posizione) con l'attività rilevante di oggi + link, invece del cambio-pagina. (L)
- [ ] **Bottom tab bar** — navigazione unica (Home / Viaggi / Salute / Guarda) al posto del back-href per pagina. (M)
- [ ] **Saluto e frasi personalizzate** — testo dinamico in base a cosa c'è da attenzionare oggi (es. "Occhio: volo tra 3h", "Nessun allenamento ancora spuntato"). Regia dei messaggi guidata dalle priorità. (M)
- [ ] **Home hero con immagini reali** — sostituire i gradienti-categoria con foto/immagini pertinenti. (M)
- [ ] **Rimuovere dati mock** — togliere gli `EVENTS` finti di fallback in `KeikoPreview`. (S)

## MACRO 3 — Redesign immersivo delle schede (una alla volta, con i benchmark)
*Perché in coda alle fondamenta: qui si spende il grosso del tempo, ma solo dopo che token/componenti/immagini esistono.*

### 3.1 — Dieta → ispirazione CREME + Kitchen Stories (M/L)
- [ ] Riga "categorie/stories" circolari in alto (tipi pasto / ricette) come CREME.
- [ ] Dettaglio pasto/ricetta con **foto reale** grande + azioni (es. Cuoci / Pianifica / Scambia / Chiedi a Keiko).
- [ ] **Cook mode** passo-passo con **timer inline** (come il "10m" di CREME) per ricette.
- [ ] Editorialità Kitchen Stories: card pasto con tempo + tag, tipografia curata.
- [ ] Indicatore completamento giornata (x/n pasti) + swap come "remix".

### 3.2 — Allenamento → ispirazione Equinox+ + Tonal (metodo e semplicità) (M/L)
- [ ] Header motivazionale tipo Equinox ("Cosa realizzi oggi?") + barra check-in/obiettivo settimanale.
- [ ] Sessione di oggi come **card pulita con immagine** + "Inizia" (stile classe Equinox/Tonal).
- [ ] Visual di progresso/benchmark tipo **Tonal Strength Score** (streak → grafico "meglio del X%").
- [ ] Esercizi come checklist semplice, un solo gesto per spuntare, feedback chiaro.
- [ ] Mantenere semplicità: meno chip "· presto", più focus su oggi.

### 3.3 — Viaggio → ispirazione Stippl (M/L)
- [ ] Tab **"Destinazioni" / "Giorno per giorno"** come Stippl.
- [ ] **Mappa** con pin e rotta tra le tappe.
- [ ] Anello "**notti pianificate**" (es. 12/16) + tempi di trasporto tra tappe.
- [ ] **Budget** di viaggio per categoria.
- [ ] **Checklist/packing list** per destinazione e durata.
- [ ] Hero immersivo con **foto reale** della destinazione.

### 3.4 — Guarda (M)
- [ ] **Locandine reali** (es. TMDB) al posto dei gradienti finti.
- [ ] Hero "Stasera per te" cinematografico (poster + sfondo sfocato).
- [ ] Sostituire i `prompt()` del browser con campi in-app.
- [ ] Badge piattaforma (Netflix/Prime/…) su "Dove vederlo".

### 3.5 — Add + Login (S/M)
- [ ] Add: esempi cliccabili nel testo libero + FAB in Home v2 + preview live evento.
- [ ] Login: illustrazione balena + racconto del valore (screenshot → evento) + font brand.

## MACRO 4 — Scommesse nuove (feature)
*Perché ultime: si costruiscono su un prodotto stabile e coerente.*

- [ ] **Podcast preferiti** — sezione con show seguiti, ultime puntate, link, notifica nuova puntata. (M)
- [ ] **Notifiche push reali** — VAPID è già configurato: eventi imminenti e todo con orario. (M)
- [ ] **Input vocale** ("Hey Keiko, volo domani alle 6"). (M)
- [ ] **Sync Google Calendar** bidirezionale. (L)
- [ ] **AI proattiva** — Keiko propone da sola check-in/meteo/come arrivare per ogni evento. (L)
- [ ] **Widget iOS** col prossimo evento. (M)
- [ ] (Backlog) le altre idee della review: tracker viaggi, obiettivi salute, filtri watchlist, backup dati…

## MACRO 5 — Qualità continua (in parallelo, sempre)
- [ ] Test sui punti fragili (parsing date, update evento) per non re-introdurre bug. (M)
- [ ] Accessibilità (focus, contrasti, aria-label). (M)
- [ ] Telemetria minima d'uso, per capire cosa usi davvero e prioritizzare. (S)
- [ ] Empty state + skeleton loading standardizzati. (M)

---

### Prossimo passo consigliato
Partire da **MACRO 0** tutto (è una settimana scarsa e ti restituisce un'app usabile), poi il primo task di **MACRO 1** (design system) perché è il collo di bottiglia di ogni redesign successivo. Dimmi "vai con Macro 0" e attacco dal primo task.
