# Keiko — Proposte di polish (v2.3) — NON applicate

> Passata trasversale dell'Art Director sulle pagine interne v2.3. **Nessuna di
> queste è stata applicata al codice**: ognuna introduce un valore o una scelta
> non presente nel capitolato (`docs/mockups/keiko-final.html`), quindi va
> approvata da Matteo una per una. Dopo l'ok si aggiorna il capitolato e solo
> allora si porta nel codice. Ordinate per impatto.

---

## 1. Contrasto delle chip `.chipA` sugli hero scuri `.vHero` — ALTO (bloccante per "contrasto AA")

**Dove:** hero di /salute, /allenamento, /viaggio (le chip "Carica settimana",
"Scambia un pasto", "Fatto oggi", "Riprogramma", "Aggiorna", "Messaggio pronto").

**Problema:** le `.chipA` usano `background:rgba(21,32,47,.09); color:var(--ink)`
(scuro tenue + testo scuro). Sull'`.vHero` il fondo è un'art scura → **testo
scuro su fondo scuro, praticamente illeggibile** (verificato negli screenshot
`salute-scuro.png`, `viaggio-scuro.png`, `allenamento-scuro.png`). È **fedele 1:1
al mockup** (`keiko.css:729` == mockup): è un gap del sorgente, non un errore
degli agenti. Colpisce azioni primarie (es. "Carica settimana").

**Prima → dopo (proposta):**
```css
/* solo le chip appoggiate su un'art scura (hero) diventano "frosted" chiare */
.keiko .vHero .chipA {
  background: rgba(255,255,255,.16);   /* prima: rgba(21,32,47,.09) */
  color: #fff;                          /* prima: var(--ink) */
  border: 1px solid rgba(255,255,255,.16);
}
```
**Perché:** porta il testo delle chip sopra ~4.5:1 su tutte le art (rimane
leggibile in entrambi i mood, perché l'art dell'hero è scura in scuro E in
chiaro). Le `.wHero` di /guarda NON sono interessate (fondo `--card`, già
leggibili). Fonte: WCAG 2.2 SC 1.4.3 (contrasto minimo AA 4.5:1).
**Nota:** introduce `#fff` (valore nuovo) → serve la tua approvazione.

## 2. Copertina reale su "Da guardare" e card "Stasera guardi" — ALTO

**Problema:** `WatchItem` non ha un campo poster; le cover sono gradienti. Tu hai
già approvato l'aggiunta del campo `poster` alla watchlist, ma non è ancora nel
data layer (`lib/`), che gli agenti non toccano.
**Prima → dopo:** aggiungere `poster: string | null` a `WatchItem` +
`getWatchlist`/`addWatchItem` (modifica additiva a `lib/supabase.ts`, già
approvata da te in linea di principio); poi in `GuardaView` e nella ctxCard
"Stasera guardi": `<img>` con `object-fit:cover`, badge (`.age`/`.plat`) solo se
non copre il titolo. **Perché:** il mockup prevede "poster TMDB in-app"; oggi è
compattato a gradiente. Va fatto da chi possiede `lib/` (coordinatore) col tuo ok.

## 3. Chip "Biglietti / Vedi biglietto" sull'itinerario — MEDIO

**Problema:** il mockup ha su alcuni slot "🎟 Biglietti" → apre il biglietto. Il
piano reale (`plan.slot`) non ha un mapping tappa→biglietto né una destinazione
per vederlo da /viaggio, quindi A4 non l'ha reso (niente azioni finte).
**Prima → dopo:** (a) esporre nel piano l'id biglietto per-slot; (b) destinazione
(pannello evento/biglietto). **Perché:** completa la guardia viaggio. Richiede
dato + rotta (fuori presentazione) → tua decisione.

## 4. Dati mancanti che oggi vengono "compattati" (voce Keiko) — MEDIO

Il capitolato mostra stringhe che non esistono nello schema dati; gli agenti le
hanno compattate a dati reali (mai finti). Da confermare se vanno bene così o se
vuoi aggiungere i campi:
- **Dieta:** kcal per pasto e totale ("320 kcal", "1.130 KCAL OGGI") → assenti in
  `DietMeal{pasto,opzioni[]}` → badge kcal rimosso, `vs2` = "{n} pasti · aggiornata {data}".
- **Allenamento:** durata ("45 min"), gruppi muscolari ("Panca, spalle, tricipiti"),
  headline giocosa ("Oggi si spinge") → assenti → derivati ("Oggi · {giorno}", primi
  esercizi, titolo scheda). Copy neutra introdotta: "Allenamento di oggi", "Oggi
  riposo", "Giornata di recupero".
- **Guarda:** età ("da 12 giorni") e durata/orario ("Sky · 21:15 · 2h46") → assenti
  → omessi, si usa il solo `info` reale.

**Proposta:** o approvi la compattazione attuale, o si aggiungono i campi al data
layer (con tuo ok, additivo).

## 5. Micro-conferme sul day panel (A5) — BASSO

- **Tasto ✕ elimina visibile sulla riga to-do:** il mockup non ce l'ha (solo
  swipe + hint), ma la tua regola "ogni gesto ha l'equivalente visibile" lo
  impone. Tenuto (ora colore `var(--text-3)`, nessun hex nuovo). Confermi?
- **Chip "notifica · presto":** classe `.tbc` reale, ma stringa/posizione
  (accanto all'orario) sono una scelta. Ok?
- **Conteggi header:** "{n} eventi · {n} to-do · {n} fatto" senza plurale smart
  (come il mockup). Vuoi il plurale corretto ("1 fatto" / "2 fatti")?

## 6. Streak "N DI FILA" (allenamento) — BASSO

Definito come giorni di calendario consecutivi allenati all'indietro da oggi/ieri.
Confermare la semantica (o: settimane? sessioni programmate rispettate?).
