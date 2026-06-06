# UV Design Test — Documentazione completa

> **Route:** `/design-test`  
> **File sorgente:** `app/design-test/page.tsx`  
> **Tipo:** prototipo UI statico (mock data, nessuna integrazione backend)  
> **Ultimo aggiornamento:** giugno 2026

---

## 1. Cos’è la UV

La **UV** (User Validation / design test) è un prototipo mobile-first di OrCa incapsulato in un **frame telefono** (390px) centrato nella pagina. Serve a validare layout, gerarchia visiva, motion e identità prima di portare le scelte nell’app reale (`/`).

Non usa dati Airtable né auth: tutti gli eventi, categorie e stati sono hardcoded nel file.

---

## 2. Architettura del layout

```
┌─────────────────────────────────────────────┐
│  OceanBg (sfondo full-viewport, fuori frame)│
│  ┌─────────────────────────────────────┐    │
│  │ AppShell — max 390px, rounded 28px  │    │
│  │ ┌─────────────────────────────────┐ │    │
│  │ │ FixedTopBar (sticky)            │ │    │
│  │ ├─────────────────────────────────┤ │    │
│  │ │ Area scroll (flex-1, overflow-y)│ │    │
│  │ │  · OrcaHeroZone                 │ │    │
│  │ │  · DepartureTicker              │ │    │
│  │ │  · Hero evento                  │ │    │
│  │ │  · Prossimi eventi              │ │    │
│  │ │  · Categorie (bento)            │ │    │
│  │ │  · Eventi passati               │ │    │
│  │ ├─────────────────────────────────┤ │    │
│  │ │ FixedBottomDock (sticky bottom) │ │    │
│  │ │  · AskOrCaBar                   │ │    │
│  │ │  · DesignBottomNav              │ │    │
│  │ └─────────────────────────────────┘ │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘

SplashScreen: overlay full-screen z-100, sopra tutto, 2.4s
CategorySheet: bottom sheet modale, fuori dal frame scroll
```

### 2.1 AppShell

| Proprietà | Valore |
|-----------|--------|
| Larghezza max | `390px` (`APP_W`) |
| Altezza max | `min(900px, 92vh)` |
| Border radius | `28px` |
| Layout interno | `flex flex-col overflow-hidden` |
| Posizione pagina | centrata con `justify-center` + padding |

### 2.2 Layer scroll vs layer fisso

| Zona | Comportamento |
|------|---------------|
| `FixedTopBar` | `sticky top-0` — resta in alto mentre si scorre il contenuto |
| Contenuto centrale | `flex-1 overflow-y-auto` — scroll indipendente |
| `FixedBottomDock` | `sticky bottom-0` — Ask OrCa + nav sempre visibili in fondo al frame |

---

## 3. Flusso utente

### 3.1 Splash (apertura app)

1. All’apertura compare `SplashScreen` a schermo intero.
2. Al centro: `OrCaMark` grande (168px) con glow blu.
3. Sotto: titolo **OrCa** + tagline **Organize your Calendar**.
4. Dopo **2.4 secondi** lo splash svanisce (`AnimatePresence` + fade/scale).
5. Il frame appare con fade-in (`opacity-0 → opacity-100`).

### 3.2 Home scrollabile

Ordine verticale:

1. Barra alta fissa (logo sinistra, testo destra)
2. Zona orca grande (`OrcaHeroZone`)
3. Ticker eventi scorrevole
4. Hero prossimo evento (card rettangolare)
5. Lista prossimi eventi (4 visibili + espandi)
6. Griglia categorie bento
7. Eventi passati (muted)

### 3.3 Interazioni

| Azione | Risultata |
|--------|-----------|
| Tap categoria | Apre `CategorySheet` (bottom sheet) |
| Tap “Altri N” | Espande/collassa eventi extra con animazione altezza |
| Tap ✕ su sheet | Chiude categoria |
| Input Ask OrCa | `readOnly` — solo visual, non funzionale |
| Tab bottom nav | Solo visual, nessuna navigazione reale |
| FAB “+” | Solo visual |

---

## 4. Componenti — dettaglio

### 4.1 `OceanBg`

Sfondo **fuori** dal frame telefono, fixed full viewport.

**Strati:**
- Gradienti radiali blu / verde / viola su base `#121212`
- Due blob animati (Framer Motion, loop 11–14s)
- Griglia puntini (`22px`, opacità ~5.5%)
- Sweep diagonale sottile

**Intento:** dark ma “catchy”, ispirato al gradient del body in `globals.css` con più movimento.

---

### 4.2 `OrCaMark` — logo

SVG custom, viewBox `80×80`.

**Struttura attuale:**
- Cerchio bianco = lettera **O** (stroke blu `#4a9eff`)
- **Orca mascot frontale** dentro la O:
  - Corpo nero, pancia chiara
  - Pinna dorsale, pinne laterali
  - Occhi arrabbiati, macchie oculari
  - Bocca aperta rossa con **due file di denti** (stile disegni early UV)

**Dove compare:**

| Contesto | Size |
|----------|------|
| Splash | 168px |
| Hero zone | 152px |
| Top bar | 38px |
| Ask OrCa bar | 28px |

---

### 4.3 `FixedTopBar`

- Logo `OrCaMark` a **sinistra**
- A **destra**: “OrCa” + “Organize your Calendar” (uppercase, tracking largo)
- Glass: `rgba(0,0,0,0.72)` + blur 20px
- Safe area top rispettata

---

### 4.4 `OrcaHeroZone`

- Spazio dedicato in cima al contenuto scrollabile
- `OrCaMark` 152px centrato
- Glow radiale blu dietro

**Nota:** non c’è orca “di lato” fuori dal frame; l’orca è centrata nella zona hero.

---

### 4.5 `DepartureTicker`

- Marquee orizzontale infinito (Framer Motion, 40s linear)
- 5 eventi mock duplicati per loop seamless
- Ogni riga: codice · rotta · data + mood colorato
- Gap compatto tra voci (`gap-4`, testo 10px)
- Separatore `·` blu tra item

**Dati mock:** treni, concerti, voli, cene, maratona con mood (“figata 🔥”, “che palle 😵”, ecc.)

---

### 4.6 Hero evento

Card **rettangolare** (`rounded-md`, non pill):

| Sinistra | Destra |
|----------|--------|
| Badge categoria + icona | Colonna countdown |
| Titolo evento | Numero giorni grande (36px) |
| Data/ora | Label “giorni” |
| Dettagli biglietto (FR 9542…) | Bordo sinistro |
| CTA: Apri biglietto / Dettagli / ⋯ | Background surface |

Evento hero: **Frecciarossa Milano → Roma**, tra 2 giorni.

---

### 4.7 `EventCard`

- Layout compatto: icona in box 32px, titolo, data, badge “Ng”
- Gap lista: `gap-1` (spacing ridotto come richiesto)
- Variante `muted` per eventi passati (opacity 0.6)

---

### 4.8 Categorie — griglia bento

Griglia `grid-cols-2`, tile **squadrate** (`rounded-sm`), dimensioni **irregolari**:

| Categoria | Layout grid |
|-----------|-------------|
| Viaggi | `col-span-2 row-span-2` — tile grande |
| Serate | 1×1 |
| Cibo | 1×1 |
| Sport | `col-span-2` — wide |
| Lavoro | 1×1 |
| Famiglia | 1×1 |

Tap → `CategorySheet` con lista eventi della categoria.

---

### 4.9 `AskOrCaBar`

Barra stile **Copilot-like** (approssimazione):

- Container `#1c1c1c`, border sottile, shadow profonda
- `OrCaMark` 28px + input placeholder “Chiedi a OrCa”
- Pulsante invio circolare blu con freccia su
- Input **non editabile** (`readOnly`)

Posizione: dentro `FixedBottomDock`, **sempre visibile** in fondo al frame (sopra la bottom nav).

---

### 4.10 `DesignBottomNav`

Replica visiva della nav produzione:

- 5 slot: Home, Cerca, **FAB +**, Calendario, Profilo
- FAB blu elevato (`-top-3`)
- Tab attiva: Home (colore primary)
- Glass + safe area bottom

**Non collegata** a route reali.

---

## 5. Design system UV

### 5.1 Colori

Allineati **parzialmente** a `app/globals.css`:

| Token UV | Valore | Equivalente sito |
|----------|--------|------------------|
| `bg` | `#121212` | `oklch(0.07 0 0)` |
| `primary` | `#4a9eff` | `--primary` blu elettrico |
| `sage` | `#6ecf8a` | mood positivi (extra UV) |
| `text` | `#f7f7f7` | `--foreground` |
| `textSec` | `#8a8a8a` | `--muted-foreground` |
| `glass` | `rgba(0,0,0,0.72)` | simile bottom nav prod |
| `mouth` | `#c41e1e` | rosso bocca orca |

### 5.2 Tipografia

- **DM Sans** (Google Font) — *non* Inter/Syne dell’app reale
- Nessun uso di `font-display` (Syne) del layout principale

### 5.3 Motion

- Easing custom: `[0.22, 1, 0.36, 1]`
- Libreria: **Framer Motion** (`motion`, `AnimatePresence`)
- Animazioni: splash, ticker, expand eventi, category sheet, blob sfondo

---

## 6. Dati mock

### Eventi prossimi (7)

Frecciarossa, Concerto Max Pezzali, Volo Ryanair, Cena team, Mezza maratona, Call Q2, Compleanno mamma.

### Eventi passati (3)

Aperitivo Navigli, Inter–Milan, Volo BCN→MXP.

### Ticker (5 voci)

Formato stile tabellone partenze: codice · tratta · data + mood.

---

## 7. Dipendenze tecniche

| Pacchetto | Uso |
|-----------|-----|
| `framer-motion` | Animazioni |
| `lucide-react` | Icone |
| `next/font` | DM Sans |
| React hooks | `useState`, `useEffect` |

**Nessuna** dipendenza da componenti condivisi dell’app (`@/components/*`), auth, Airtable.

---

## 8. Bug risolti in sessione

- **Errore JSX** (build fallita): mancava un `</div>` di chiusura nell’area scrollabile — corretto; build OK, pagina risponde `200` su `/design-test`.

---

## 9. Requisiti richiesti vs implementazione

Legenda: ✅ implementato · ⚠️ parziale · ❌ non implementato

| # | Requisito (dalle iterazioni UV) | Stato | Note |
|---|----------------------------------|-------|------|
| 1 | App centrata nel viewport | ✅ | Frame 390px centrato |
| 2 | Spazio ampio tra layer alto e contenuto scroll | ⚠️ | C’è separazione hero+ticker, ma non il doppio layer fixed viewport originale |
| 3 | Stile Copilot / Vinted / Airbnb, palette scura | ⚠️ | Ispirazione applicata; non è pixel-perfect vs reference |
| 4 | Splash: OrCa al centro + scritta sotto | ✅ | 2.4s auto-dismiss |
| 5 | Scroll: barra fissa logo sx, testo dx | ✅ | `FixedTopBar` sempre sticky (non solo dopo scroll) |
| 6 | Sotto: logo grande + ticker compatto | ✅ | `OrcaHeroZone` + `DepartureTicker` |
| 7 | Meno spazio tra voci ticker | ✅ | `gap-4`, py ridotto |
| 8 | Hero rettangolare | ✅ | Card orizzontale bassa |
| 9 | Categorie geometriche, squadrate, dimensioni irregolari | ✅ | Bento grid |
| 10 | Ask OrCa fisso in basso | ✅ | `FixedBottomDock` sticky |
| 11 | Sfondo catchy ma scuro | ✅ | Blob animati + gradienti |
| 12 | Colori allineati al sito | ⚠️ | Blu/bg sì; font e alcuni accenti differiscono |
| 13 | Orca di lato (fuori app / peek) | ❌ | Rimosso nelle ultime iterazioni |
| 14 | Barra marmo / trust strip aeroporto | ❌ | Presenti in v1, rimosse |
| 15 | Input Ask funzionante / chat reale | ❌ | Solo UI mock |
| 16 | Nav collegata a route | ❌ | Bottoni non linkano |
| 17 | Dati reali da Airtable | ❌ | Tutto mock |

---

## 10. Gap critici — logo OrCa (da rifinire)

Questi punti sono stati **esplicitamente richiesti** ma **non implementati correttamente**:

### 10.1 ❌ Orca **laterale** dentro la O

**Richiesto:** logo ispirato agli allegati reference — orca in **vista di profilo**, denti visibili di lato (stile mascot/shark logo).

**Implementato:** orca **frontale** (faccia verso l’utente, simmetrica) dentro cerchio-O. Componente `OrCaMark` usa il disegno “Baby Shark / ghigno frontale” delle prime UV, **non** il profilo laterale degli allegati.

**Per chiudere il gap:** creare `OrCaMarkLateral` o refactor di `OrCaMark` con SVG profilo (testa verso destra, denti in bocca aperta laterale) composited dentro l’anello O.

---

### 10.2 ❌ Wordmark: **O** con orca + **scritto sotto la O** (rCa / tagline)

**Richiesto:** la O è il contenitore dell’orca; il testo del brand (**“rCa”** o tagline) sta **sotto la lettera O**, non accanto come wordmark separato.

**Implementato:**
- Splash: mark grande + sotto il wordmark completo “OrCa” (testo piano, non integrato nella O)
- Top bar: mark a sinistra, testo “OrCa” a **destra** (layout speculare, non sotto-O)
- Nessuna composizione tipografica `O` + `rCa` con baseline sotto il cerchio

**Per chiudere il gap:** componente `OrCaWordmark` con layout verticale:

```
   ┌─────┐
   │ O+🐳│  ← cerchio con orca
   └─────┘
     rCa
 organize your calendar
```

---

### 10.3 ⚠️ Due stili orca in conflitto nelle richieste

Nel corso delle iterazioni sono stati chiesti **entrambi**:

1. Orca **frontale** dentro la O (identità “OrCa = O + orca”)
2. Orca **laterale** con denti (reference allegati)

L’implementazione attuale privilegia solo (1). Non esiste una variante laterale né un sistema a due mark (hero laterale + logo O frontale).

---

### 10.4 ⚠️ Copilot bar “identica”

**Richiesto:** barra Ask identica a Microsoft Copilot.

**Implementato:** approssimazione visiva (pill scura, placeholder, send). Mancano: icone accessory (mic, allegati), stati focus/editing, suggerimenti prompt, animazione typing, comportamento keyboard mobile.

---

### 10.5 ⚠️ Barra alta solo allo scroll

**Richiesto** (iterazione 2): “scorri in basso e sopra esce barra fissa”.

**Implementato:** barra **sempre visibile** (`sticky top-0` from start), non compare solo dopo soglia scroll.

---

### 10.6 ❌ Integrazione con app produzione

La UV è isolata. Non condivide:

- `BottomNav` reale (`components/BottomNav.tsx`)
- `EventsSection` / `Ticket`
- Font Syne + Inter del layout
- Token CSS shadcn (`bg-background`, `text-primary`, ecc.)

---

## 11. Come avviare

```bash
npm run dev
# → http://localhost:3000/design-test
```

Build di verifica:

```bash
npm run build
```

---

## 12. Prossimi passi consigliati

1. **Logo:** definire una sola direzione (frontale vs laterale) o due varianti documentate (`OrCaMarkFront`, `OrCaMarkSide`).
2. **Wordmark:** componente unico con O+orca e “rCa” sotto.
3. **Estrarre token** da `globals.css` (CSS variables) invece di hex duplicati in `C`.
4. **Scroll threshold** per top bar se si vuole il comportamento “compare scrollando”.
5. **Collegare mock → componenti reali** quando la UV è approvata.
6. **Ask OrCa:** portare input funzionante quando esiste API chat.

---

## 13. Riferimenti file correlati

| File | Ruolo |
|------|-------|
| `app/design-test/page.tsx` | Implementazione UV completa |
| `app/globals.css` | Design system produzione (dark + blue) |
| `app/page.tsx` | Home reale OrCa |
| `components/BottomNav.tsx` | Nav produzione (non usata in UV) |
| `app/layout.tsx` | Font e metadata app |

---

*Documento generato per allineamento team / handoff design → produzione.*
