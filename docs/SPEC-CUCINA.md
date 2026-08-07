# SPEC — Cucina (il ricettario che cerca)

> 7 agosto 2026. La sezione dieta che diventa divertente: «stasera ho pollo e
> patate» → ricette vere da TikTok/YouTube, anteprima figa, pick, e Keiko ti
> guida passo passo. Pensata al massimo, poi fasata in V1/V2/V3.

---

## Il giro di realtà, prima di tutto (leggilo, evita delusioni)

- **TikTok e Instagram NON hanno una ricerca aperta.** Lo scraping è vietato
  dalle loro condizioni (stessa nota già scritta sull'idea 152 per Facebook).
  La strada lecita è la **ricerca web di Claude** («ricetta pollo patate
  tiktok») che pesca i video indicizzati da Google — funziona bene per TikTok
  e YouTube, poco per Instagram, che è quasi fuori dai giochi. Onestà: i
  risultati saranno soprattutto TikTok + YouTube + siti di ricette.
- **Le anteprime però sono gratis e legali**: TikTok e YouTube hanno oEmbed
  pubblico senza chiave (`tiktok.com/oembed?url=…`) che dà miniatura, titolo
  e autore. La «foto figa» c'è.
- **La ricetta dentro il video**: TikTok via oEmbed restituisce la **caption**
  (che nei video di cucina contiene quasi sempre ingredienti e passi);
  YouTube ha la descrizione via Data API (chiave gratuita, quota larga).
  Quando la caption non basta, non si inventa: si apre il video e basta.
- **Costo**: la ricerca usa il web search (~3-5 cent, peso 2 come il
  consiglio film); l'estrazione della ricetta ~1-2 cent (peso 1). Tutto il
  resto — anteprime, ricettario, cook mode — è gratis.

## Il paletto legale, scolpito

Questa sezione **non parla mai con il piano alimentare**. Mai.
- «fit» / «light» sono parole di ricerca SCELTE DALL'UTENTE, non giudizi di
  Keiko. Keiko cerca quello che le chiedi, come un motore di ricerca.
- Niente calorie calcolate, niente «adatta alla tua dieta», niente «così
  resti nel piano». Il piano del professionista resta intoccato (art. 348).
- Il collegamento più stretto ammesso: la ricetta si può PIANIFICARE su una
  cena in calendario. Pianificare ≠ prescrivere.

---

## La sezione, pezzo per pezzo

### 1 · La domanda
Campo libero in cima alla sezione: «stasera ho pollo e patate». Sotto, chip
di stile che si sommano: **Virale · Fit · Easy · Veloce · Veg**. Le chip
diventano parole della ricerca, niente di più.

### 2 · La ricerca — SENZA AI, costo zero *(rivisto il 7 agosto)*
Cercare ricette è una query, non un giudizio: Claude non serve. Si usa
un'API di ricerca diretta — **Tavily** (1.000 crediti/mese gratis, una
ricerca = 1) e in ripiego **Brave Search** — con la domanda dell'utente + le
chip + il filtro piattaforma (`include_domains: tiktok.com, youtube.com`).
I link tornano, oEmbed mette le anteprime. Cache per query (7 giorni): la
stessa domanda non ricerca due volte. **Costo: 0. Il tetto AI non viene
nemmeno toccato.**
Chiave: TAVILY_API_KEY → `.env.example` e `CHIAVI-API.md`.

> **Google Custom Search è morto (7 agosto 2026).** Google l'ha chiuso ai
> nuovi clienti ("not available for new customers"): una mattina di 403 e via.
> `GOOGLE_CSE_KEY` / `GOOGLE_CSE_CX` non esistono più. La catena fornitori sta
> in un posto solo (`app/api/cucina/search/route.ts`) apposta: il prossimo
> cambio deve costare dieci righe.

### 3 · I risultati
Card verticali con **anteprima vera via oEmbed**: miniatura grande, titolo,
autore, logo piattaforma. Come le locandine di Guarda, ma per ricette. Un
risultato senza oEmbed (IG, siti strani) → card col dominio, non si butta.

### 4 · Il pick → la ricetta
Tocchi una card → Keiko legge caption/descrizione e la struttura:
**ingredienti con quantità · passi numerati · tempi**. Regola ferrea: si
estrae SOLO quello che c'è scritto. Caption povera → «la ricetta completa è
nel video» + link, senza inventare quantità. (~1-2 cent, peso 1)

### 5 · Cook mode (idea 83, già scelta)
Passo per passo a schermo pieno: un passo alla volta, timer integrati dove
il passo dice «20 minuti», spunte sugli ingredienti, schermo che non si
spegne (wake lock), avanti/indietro col pollice. La differenza tra un
segnalibro e una cucina.

### 6 · Il ricettario
Tutto quello che salvi: cercabile, con tag automatici (ingrediente
principale, tempo, piattaforma), contatore «fatta 3 volte», preferite.
Si salva sia dai risultati sia incollando un link diretto (condividi da
TikTok → copia link → incolla).

### 7 · La lista della spesa (K33 + 209)
Dalla ricetta estratta: un tocco → gli ingredienti diventano lista della
spesa. Più ricette → lista aggregata (2 ricette con cipolla = una voce).
Ordinata per corsia (209). Spuntabile al supermercato.

### 8 · I collegamenti (il filtro della convergenza)
- **Ricetta ↔ evento**: «cena a casa venerdì» → ci attacchi la ricetta →
  giovedì la spesa, venerdì il cook mode. Il calendario che cucina.
- **Battito ricetta** (una riga in BEATS, il motore c'è già): «Un mese fa:
  la carbonara di pollo · La rifai?» → apre la ricetta.
- **Scontrino → cosa cucino** (idea 17, V3): foto dello scontrino → «con
  quello che hai puoi fare…» pescando DAL TUO ricettario. ⚠️ paletto 17:
  mai «per stare nel piano».

### 9 · Quello che NON ci sarà
- Ricerca «dentro» Instagram: chiusa, non si forza.
- Calorie, macro, giudizi nutrizionali: mai (vedi paletto).
- Video scaricati o incorporati: si apre TikTok/YouTube, non si copia il
  contenuto. Il creator si prende la sua view.

---

## Le fasi

**V1 — cerca, guarda, salva** (un giorno di lavoro)
Domanda + chip → ricerca web → card oEmbed → apri il video → salva nel
ricettario. Tabella nuova `recipes` (link, titolo, autore, thumb,
piattaforma, tag), RLS come le altre.

**V2 — la ricetta in mano** (il salto di qualità)
Estrazione ingredienti/passi dal pick · cook mode con timer e wake lock ·
lista della spesa dalla singola ricetta.

**V3 — la cucina collegata**
Spesa aggregata per corsia · ricetta ↔ evento cena · battito «la rifai?» ·
scontrino → cosa cucino dal ricettario.

## Costi a regime (V2 completa) *(rivisti il 7 agosto)*

| Azione | Costo | Peso |
|---|---|---|
| Una ricerca (Tavily + oEmbed) | **0** | — |
| Un'estrazione ricetta (solo al pick, V2) | ~1-2 cent | 1 |
| Anteprime, ricettario, cook mode, spesa | 0 | — |

Chiavi da procurare: **Tavily** (V1, gratuita) e **YouTube Data API**
(V2, gratuita) → `.env.example` e `CHIAVI-API.md`.

## Decisione di Matteo, 7 agosto — DA RICORDARE

**Cucina nasce come sezione a sé, pulita**: rotta sua (`/cucina`), NON
dentro la vista dieta attuale — che resta com'è, senza ingombri nuovi.
**Dopo il ricettario, la sezione dieta attuale va ripensata da capo.**
Chi legge questo file in una chat futura: ricordaglielo.
