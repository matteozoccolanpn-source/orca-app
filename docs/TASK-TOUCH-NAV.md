# TASK — Fix usabilità touch & navigazione (spec corretta e verificata)

> **Leggi questo, non la spec originale.** La spec che ha originato questo task è stata
> prodotta ispezionando il DOM della **produzione vecchia** (`orca-app-zeta`), non il branch
> corrente. Metà dei bug che descrive **è già risolta** su `main`, e la sua prima istruzione
> ("installa `vaul`, né vaul né Framer Motion sono nel bundle") è **falsa e dannosa**.
> Sotto c'è il delta reale, verificato file per file sul codice attuale.

---

## 0. Vincoli assoluti (non negoziabili)

- **NESSUNA nuova dipendenza.** `vaul@^1.1.2` e `framer-motion@^12.40.0` sono **già** in
  `package.json`. `npm i vaul` è vietato: non serve.
- **Non toccare** `lib/` né `app/api/` (regola di progetto: solo con ok esplicito, eccezione
  sicurezza). Questo task è **solo UI/gesti**.
- **Non perdere nessuna funzione esistente.** Guardia funzionalità: ogni bottone, azione e
  stato che c'è oggi deve esserci dopo.
- `npx tsc --noEmit` e `npx eslint` devono passare. Attenzione: in questo repo
  `react-hooks/set-state-in-effect` è **errore**, non warning.
- **Nessun commit e nessun push** senza ok esplicito di Matteo.
- Target: **PWA su mobile**, tema scuro, larghezza max 440px.

---

## 1. Stato reale dei 7 bug della spec

| # | Bug dichiarato dalla spec | Verità su `main` |
|---|---|---|
| 1 | Sheet non si chiudono con swipe-giù | ✅ **REALE — da fare** |
| 2 | `/add` è un vicolo cieco | ✅ **REALE — da fare** |
| 3 | Tab Foto/Testo: primo tap non risponde | ⚠️ **Causa diversa da quella ipotizzata** |
| 4 | Bottom nav: z-index e padding | ⚠️ **Parziale — solo su alcune pagine** |
| 5 | Splash a ogni cambio tab | ❌ **GIÀ RISOLTO** — non toccare |
| 6 | Caroselli senza scroll-snap | ⚠️ **Parziale — solo i 2 caroselli inline** |
| 7 | Doppio paradigma di navigazione (no swipe) | ❌ **GIÀ RISOLTO** — non toccare |
| + | *(non nella spec)* Bottom nav **duplicata** in due file | 🔴 **REALE — la causa radice di #4** |

---

## 2. I lavori, in ordine di esecuzione

### T1 — Bottom nav: una sola implementazione 🔴 (fare per primo)

**Problema verificato.** La barra esiste **due volte**:

- `app/components/keiko/KeikoNav.tsx` — versione buona: `zIndex: 30`, `active` tipizzato,
  `onAdd` opzionale, `NavItem` con `minWidth/minHeight: 44`.
- `app/components/keiko/KeikoHomeV4.tsx` righe ~328-336 — **copia inline** dello stesso
  markup, **senza `zIndex`**, con `active` cablato a mano e un `+` che apre `CaptureSheet`
  invece di `/add`.

Le due copie sono **già divergenti**. Ogni fix applicato a una non arriva all'altra: è la
ragione per cui la nav si comporta diversamente sulla Home rispetto a `/guarda`.

**Fix.**
1. In `KeikoNav.tsx`: estrarre l'altezza in una costante esportata
   `export const NAV_H = 84;` e aggiungere `zIndex: 30` già presente — confermarlo.
   Aggiungere anche `paddingBottom: "calc(18px + env(safe-area-inset-bottom))"` al posto del
   `padding: "0 20px 18px"` fisso (oggi sugli iPhone con home-indicator le etichette finiscono
   sotto la barra di sistema).
2. In `KeikoHomeV4.tsx`: **cancellare** il `<nav>` inline e il `NavItem` locale, sostituirli con
   `<KeikoNav active="home" onAdd={() => setCapture(true)} />`. Il prop `onAdd` esiste già
   apposta: il comportamento della Home (apre `CaptureSheet`) si conserva **identico**.
3. Verificare che non resti nessun `NavItem` orfano non usato (eslint lo segnala).

**Definition of done:** `grep -rn "<nav style" app/` restituisce **una sola** occorrenza.

---

### T2 — Spazio in fondo alle pagine (il contenuto finisce sotto la nav)

**Problema verificato.** `KeikoShell.tsx` riga 51 riserva già lo spazio corretto:
`paddingBottom: "calc(116px + env(safe-area-inset-bottom))"`. Ma le pagine che montano
`KeikoNav` **fuori** da `KeikoShell` non lo fanno:

- `app/guarda/GuardaView.tsx` (monta `<KeikoNav active="guarda" />` a riga 424)
- `app/components/keiko/KeikoHomeV4.tsx` (dopo T1)

**Fix.** Sul contenitore radice di ciascuna di queste due view aggiungere
`paddingBottom: "calc(116px + env(safe-area-inset-bottom))"` (stesso identico valore di
`KeikoShell`, così esiste un solo numero in tutta l'app — se preferisci, esportalo come
costante accanto a `NAV_H`).

**Definition of done:** su ogni pagina, con lo scroll a fondo pagina, l'ultimo elemento
interattivo è tappabile e non è coperto dalla barra.

---

### T3 — Swipe-giù per chiudere i bottom sheet ✅ (il fix più sentito)

**Problema verificato.** Ci sono **6** sheet, tutti costruiti a mano come overlay
`position: fixed` con un "grabber" (barretta 36×4) **puramente decorativo**: nessun handler
touch, si chiudono solo col tap sull'overlay o sulla ✕.

- `app/components/keiko/EventSheet.tsx` (2 grabber, righe 91 e 102)
- `app/components/keiko/DaySheet.tsx` (riga 67)
- `app/components/keiko/CalendarSheet.tsx` (riga 37)
- `app/components/keiko/ProfileSheet.tsx` (riga 91)
- `app/components/keiko/SuggestProvider.tsx` (costante `GRAB`, riga 27)
- `app/components/keiko/AskSheet.tsx`

`components/ui/drawer.tsx` **esiste già** ed è un wrapper `vaul` completo — ma nessuno di
questi sheet lo usa.

**Fix — approccio prescritto: NON riscrivere i 6 sheet su `vaul`.** Sarebbero 6 refactor con
alto rischio di perdere azioni esistenti (guardia funzionalità). Invece:

Creare **un solo componente nuovo** `app/components/keiko/SheetShell.tsx` che incapsula il
guscio comune (overlay + pannello + grabber + gesto), e far passare i 6 sheet da lì
cambiando **solo il wrapper esterno**, lasciando intatto tutto il contenuto.

```tsx
// app/components/keiko/SheetShell.tsx
"use client";
import { useRef, useState } from "react";

/* Guscio condiviso dei bottom sheet: overlay, pannello, grabber VERO (trascinabile),
   chiusura per swipe-giù. Il contenuto lo passa il chiamante: nessuno sheet cambia
   comportamento, cambia solo il guscio. */
export default function SheetShell({
  onClose, children, maxHeight = "92vh", zIndex = 91,
}: {
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
  zIndex?: number;
}) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const panel = useRef<HTMLDivElement | null>(null);

  // Il gesto parte SOLO se il pannello è già in cima al suo scroll:
  // altrimenti lo swipe-giù dentro un contenuto lungo chiuderebbe lo sheet
  // invece di scrollarlo.
  const onTouchStart = (e: React.TouchEvent) => {
    if ((panel.current?.scrollTop ?? 0) > 0) return;
    startY.current = e.touches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const d = e.touches[0].clientY - startY.current;
    setDy(d > 0 ? d : 0);            // solo verso il basso, niente elastico in su
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (dy > 110) onClose();         // soglia: ~110px = gesto intenzionale
    setDy(0);
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        ref={panel}
        className="ds k-sheet-in"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight, overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 22px)",
          transform: dy ? `translateY(${dy}px)` : undefined,
          transition: dragging ? "none" : "transform .22s cubic-bezier(.22,.61,.36,1)",
          touchAction: "pan-y",
        }}
      >
        {/* grabber VERO: area di presa 44px, barretta 36×4 come oggi */}
        <div style={{ height: 22, display: "grid", placeItems: "center", cursor: "grab" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)" }} />
        </div>
        {children}
      </div>
    </div>
  );
}
```

Poi, in ciascuno dei 6 file: sostituire l'overlay+pannello a mano con `<SheetShell onClose={onClose}>…</SheetShell>`
e **rimuovere il grabber decorativo** ora duplicato. Nient'altro.

Casi particolari:
- `EventSheet.tsx` ha **due** grabber (riga 91 e 102, uno sopra l'immagine hero): tenere solo
  quello di `SheetShell`, togliere entrambi gli attuali.
- `CalendarSheet.tsx` non scrolla: passargli `maxHeight="none"` non serve, lascia il default.
- `SuggestProvider.tsx` esporta `GRAB` come costante: se dopo la migrazione non è più usata,
  cancellarla (eslint).

**Vincolo:** la chiusura via tap-overlay e via ✕ deve continuare a funzionare **identica**.
Il gesto è **additivo**.

**Definition of done:** su ogni sheet, swipe-giù di ~120px dal grabber → si chiude con
transizione; swipe-giù partendo da metà di un contenuto scrollato → **scrolla**, non chiude.

---

### T4 — `/add` non è più un vicolo cieco

**Problema verificato.** `app/add/page.tsx` è una pagina intera senza **nessuna** nav e
**nessun** tasto chiudi. Le uniche uscite sono: salvare un evento (`router.push('/')` dopo
2,5 s) oppure il back del browser — che in PWA standalone su iOS **non esiste**. Il
`pb-32` c'è già, quindi non è un problema di spazio: è proprio che non c'è via d'uscita.

**Fix (minimo e sicuro).** Aggiungere in cima alla pagina, nell'header esistente, un tasto
chiudi che riporta indietro:

```tsx
// nell'header, accanto all'<h1>
<button
  onClick={() => router.back()}
  aria-label="Chiudi"
  className="size-11 grid place-items-center rounded-full ..."
>
  <X className="size-5" />
</button>
```

`X` da `lucide-react` **è già importato** in questo file. Area tap ≥ 44px.

Se lo stato è `confirming`/`preview` il tasto deve chiedere conferma o fare `reset()` prima di
uscire, per non perdere un parsing appena fatto in silenzio — scegli `reset()` se lo stato è
`preview`, `router.back()` altrimenti.

**Nota architetturale (non farla ora, annotarla):** la Home usa già `CaptureSheet` per lo
stesso flusso. A tendere `/add` va assorbita in `CaptureSheet` e la pagina resta solo come
deep-link. Fuori scope di questo task.

**Definition of done:** da `/add`, in PWA standalone, si torna indietro senza gesti di
sistema.

---

### T5 — Tab Foto/Testo: il "primo tap non risponde"

**Attenzione: la causa ipotizzata dalla spec è sbagliata.** Il codice è corretto:
`switchTab(tab)` è cablato su `onClick`, esce subito se il tab è già attivo, e chiama
`reset()`.

La causa reale è quasi certamente **l'hover di Tailwind su touch**: i bottoni hanno
`hover:text-foreground/70`. Su iOS Safari il primo tap su un elemento con regole `:hover`
viene consumato per applicare lo stato hover; il secondo tap attiva il click. È il classico
"double-tap bug" di WebKit.

**Fix.**
1. Sostituire `hover:` con `hover:` condizionato al puntatore fine, nel bottone dei tab:
   `[@media(hover:hover)]:hover:text-foreground/70` (Tailwind v4 supporta la variante
   arbitraria; in alternativa usa la variante `pointer-fine:`).
2. Aggiungere `touch-action: manipulation` sui due bottoni (toglie anche il ritardo di 300ms).
3. Alzare l'area tap: `py-2` → `py-3` (arriva a ~44px).
4. Fare la stessa cosa sull'altro elemento con hover di questa pagina: la dropzone
   (`hover:border-primary/40 hover:bg-primary/5`), che soffre dello stesso problema — è il
   motivo per cui "Tocca per scegliere" a volte va al secondo tocco.

**Definition of done:** su iPhone reale, il primo tocco su Foto/Testo e sulla dropzone
risponde sempre.

---

### T6 — Scroll-snap sui due caroselli inline

**Problema verificato.** In `app/keiko.css` lo snap **c'è già** (`.heroRow`, `.miniRow`,
`.week`: `scroll-snap-type: x mandatory/proximity`). Mancano **solo** i due caroselli scritti
con stile inline:

- `app/components/keiko/KeikoHomeV4.tsx` riga 271 — "IN ARRIVO"
- `app/guarda/GuardaView.tsx` riga 330 — "Da vedere / Visti di recente"

**Fix.** Sul contenitore aggiungere `scrollSnapType: "x mandatory"` e
`WebkitOverflowScrolling: "touch"`; su ogni figlio (`minWidth: 214, flex: "none"` nel primo
caso) aggiungere `scrollSnapAlign: "start"`.

Se esiste anche il carosello "PROSSIMI GIORNI" della Dieta citato dalla spec, applicare la
stessa cosa; **verificare prima** che non usi già `.miniRow`.

**Non toccare** le classi in `keiko.css`: sono già corrette.

**Definition of done:** i caroselli si fermano allineati alla card, non a metà.

---

### T7 — Non toccare (già risolti, verificati)

- **Splash a ogni cambio tab:** `app/loading.tsx` ha già la guardia
  `splashShownThisSession`: lo splash Keiko compare solo all'apertura a freddo, tra le pagine
  c'è solo il fondo scuro `#0C0E13`. **Confermare che funziona, non riscrivere.**
- **Swipe orizzontale tra le sezioni:** `app/template.tsx` lo implementa già
  (`TABS = ["/", "/salute", "/allenamento", "/guarda"]`, soglia 70px, rapporto 1.6) e ha già
  la guardia `inHScroller()` che **ignora lo swipe se parte da un carosello**. La spec dice
  che manca perché ha guardato la produzione vecchia. **Non riscrivere.**
  - ⚠️ Unica cosa da verificare dopo T6: la guardia `inHScroller` risale il DOM cercando
    `overflowX: auto|scroll` con `scrollWidth > clientWidth`. Continua a funzionare con lo
    snap attivo — ma va **ritestata** su Home e Guarda dopo T6.
- Esiste anche `app/components/SwipeShell.tsx` (guscio Dieta ← Home → Allenamento con
  scroll-snap nativo). Verificare se è ancora montato da qualche parte o è codice morto —
  **se è morto, segnalarlo, non cancellarlo** senza ok.

---

## 3. QA — da fare su iPhone reale, PWA installata (non in Safari)

1. Ogni sheet (evento, giorno, calendario, profilo, chiedi, suggerimento) si chiude con
   swipe-giù dal grabber.
2. Dentro uno sheet lungo (EventSheet con contenuto), lo swipe-giù a metà **scrolla**.
3. Chiusura via tap-overlay e via ✕ ancora funzionanti su tutti e 6.
4. Da `/add` si esce col tasto chiudi; se c'era una foto in preview, il primo tocco la scarta.
5. Primo tocco su Foto/Testo e sulla dropzone: risponde sempre, mai al secondo.
6. In fondo a Home, Guarda, Dieta, Allenamento: l'ultimo elemento non è coperto dalla barra.
7. La barra è identica su tutte e 4 le sezioni (stessa altezza, stesse etichette, stesso
   accento) e sta sopra il contenuto ma **sotto** gli sheet.
8. Caroselli "In arrivo" e "Da vedere": si fermano allineati.
9. Swipe orizzontale Home ↔ Dieta ↔ Allenamento ↔ Guarda ancora funzionante, e **non** parte
   quando il gesto inizia dentro un carosello.
10. Splash Keiko: appare all'apertura a freddo, **non** cambiando tab.
11. `npx tsc --noEmit` e `npx eslint` puliti.

## 4. Consegna richiesta

- Riepilogo file-per-file di cosa è cambiato e perché.
- Elenco dei gesti finali dell'app (quale gesto fa cosa, dove).
- **Nessun commit.** Matteo verifica sulla PWA e poi decide.
