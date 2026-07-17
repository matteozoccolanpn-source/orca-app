# Keiko — Design System (mini-spec v1)

> Le "regole invisibili" che reggono la direzione con contenuti reali. Valori esatti, pronti da implementare. Nasce dalla critica al mock: la direzione (nero-caldo + ambra + Fraunces) è buona; questo la rende sistema.

## 1. Colori (dark, unico tema)
| Token | Valore | Uso |
|---|---|---|
| `--bg` | `#0C0E13` | sfondo app (nero caldo) |
| `--surface` | `#171922` | card senza foto, barre |
| `--surface-2` | `#1E2029` | input, righe |
| `--line` | `rgba(255,255,255,.08)` | bordi |
| `--text` | `#F3EFE8` | titoli, testo forte |
| `--text-2` | `#CBCFD6` | **metadati** (mai più scuro di così su nero) |
| `--text-3` | `#ADB2BA` | terziario, label sezione, nav inattiva |
| `--accent` | `#FFB84D` | **firma Keiko** — solo CTA, stato attivo, valori-chiave |
| `--accent-ink` | `#20170A` | testo su ambra |
| `--ok` | `#7BD88F` | stato completato |

**Regola ambra:** l'accento appare al massimo **1 volta per blocco visivo** (una CTA, o un orario-chiave, o lo stato attivo). Se è ovunque, non è più una firma.

## 2. Contrasto (soglie)
- Testo forte su nero: `--text` (≈ 14:1). Sempre ok.
- **Metadati: mai sotto `--text-2` `#C4C8CF`** (≈ 9:1 su `--bg`). Vietato usare grigi < `#9BA0A8`.
- Testo su foto: **sempre** con scrim (§4) + `text-shadow: 0 1px 10px rgba(0,0,0,.55)`. Target minimo AA (4.5:1) *dopo* lo scrim, testato sulle foto peggiori (cielo/piatto chiaro).

## 3. Tipografia (gerarchia governata)
**Scala modulare (~1.25, applicabile a tutte le schede):** `26 / 22 / 18 / 16 / 14 / 13 / 11`.
- 26 = saluto (Fraunces 600) · 22 = titolo hero (Fraunces 600) · 18 = H2 grande · 16 = titolo card (Inter 600) · 14 = corpo/numeri settimana · 13 = meta/data/riepilogo (Inter 500, muted) · 11 = label uppercase (VEN, badge, nav).
- **Ritmo verticale** a multipli di 4/8: 4 (data→saluto), 8 (saluto→riepilogo), 20 (riepilogo→settimana), 24 (settimana→hero), 28 (hero→sezione), 12 (heading→griglia).

Due font, ruoli **fissi**:
- **Fraunces** (serif display, 600) → SOLO: `h1` saluto (26px) e **titolo hero** (22px, max 2 righe). Niente altro.
- **Inter** → tutto il resto.
  - Titolo card (non-hero): Inter **700**, 16px (mini) / 15px (mod) / 13px (poster) — **1 riga + ellissi**.
  - Metadati: Inter **600**, 12.5px, `--text-2`.
  - Label sezione (`.lead`): Inter **700**, 15.5px, `--text`.
  - Corpo: Inter 400/500, 14–16px.
- **Vietato UPPERCASE come default.** Micro-label solo sentence-case 12–13px medium.
- Regola d'oro: *se ogni titolo è serif, non c'è gerarchia.* Serif = "momento editoriale" (saluto, evento in primo piano), non decorazione diffusa.

## 4. Card (UN solo linguaggio)
Struttura fissa: `foto (o gradiente) → scrim → chip categoria (alto-sx) → contenuto (basso)`.
- Radius: **22px** (card), 15px (poster), 999px (chip/pill).
- **Scrim costante a DUE lati** (non opzionale, tarato sul caso peggiore = foto CHIARA): `linear-gradient(180deg, rgba(6,6,8,.5) 0%, rgba(6,6,8,.14) 20%, rgba(6,6,8,.5) 56%, rgba(6,6,8,.9) 82%, rgba(6,6,8,.99) 100%)`. Scurisce **sopra** (per i chip in alto) e **sotto** (per il testo). Sempre con `text-shadow: 0 1px 3px rgba(0,0,0,.6), 0 1px 12px rgba(0,0,0,.5)` su titoli e metadati.
- **Chip / badge SEMPRE opachi**, mai translucidi (spariscono su foto chiare): sfondo `rgba(12,12,15,.82)` + bordo `rgba(255,255,255,.12)`. Variante `amber` piena.
- **Indicatori tondi (anello/ring)**: track esterno + **centro PIENO opaco** (`#141017`), mai centro semitrasparente — altrimenti sembra un buco sulla foto.
- Padding contenuto: 15px.
- **Altezze/ratio** (niente 1:1 pieno):
  - Hero: **16:9** (non più 16:10 — riduce il vuoto), padding contenuto **20px**.
  - Mini (carosello): **16:11**, min-width **214px** (regge il titolo).
  - Modulo (griglia 2col): **4:3** (non 1:1 — comprime meglio le foto orizzontali).
  - Poster (film): **2:3**, width 116px.
- **Chip categoria**: `rgba(10,10,12,.5)` + blur 8 + bordo `rgba(255,255,255,.16)`. Variante `amber` per lo stato "adesso/oggi".
- **Fallback senza foto** (obbligatorio): usare i gradienti categoria `--cat-*` (cena/volo/concerto/sport/default) al posto della foto. Mai una card "vuota/buco".
- **Troncamento**: titolo `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` (hero fa eccezione: `-webkit-line-clamp:2`). I metadati stessa regola.

### Gradienti fallback categoria
```
--cat-cena:      linear-gradient(150deg,#d8693d,#5e2414);
--cat-volo:      linear-gradient(150deg,#1f93b6,#0f4257);
--cat-concerto:  linear-gradient(150deg,#b63f93,#3e1340);
--cat-sport:     linear-gradient(150deg,#c9603f,#3a160c);
--cat-default:   linear-gradient(150deg,#5a5f8a,#232743);
```

## 5. Bottoni (gerarchia costante)
- **Primario**: fondo `--accent`, testo `--accent-ink`. Uno per schermata.
- **Secondario**: outline `--line`, testo `--text`.
- **Distruttivo**: testo/righe rosse, **de-enfatizzato** (mai stesso peso del primario). Sempre con conferma + undo.
- Touch target: **≥ 44px**.

## 6. Immagini (fonti reali per dominio)
- Film/serie → **TMDB** (`image.tmdb.org/t/p/w500/...`).
- Luoghi/eventi/città → **Google Places photo** o **Unsplash**.
- Dieta → foto piatto (upload utente o food API).
- Allenamento → libreria esercizi.
- Ogni `<img>` ha **fallback**: se non carica → gradiente categoria + scrim (mai un vuoto). `object-fit:cover`.

## 7. Movimento
- Una sola metafora pannelli: **bottom-sheet che sale**. Alla chiusura: reset completo (niente stati "incastrati").
- Ogni azione async: **skeleton → risultato ancorato al tap → toast di conferma**. Mai loader senza esito. Controlli disabilitati durante il load (no click accodati).

## 8. Stati da progettare SEMPRE (non solo lo "happy path")
Per ogni lista/schermata: **vuoto** (con CTA), **caricamento** (skeleton), **errore** (retry), **contenuto lungo** (troncamento), **numeri grandi** ("12 eventi", "1.240 kcal").

---

### Come si usa
Questi valori diventano i token unici (sostituiscono il doppio sistema `globals.css` + `keiko.css`). Poi ogni schermata si ricostruisce con: 1 card, scrim sempre, Fraunces solo dove detto, grigi ≥ `--text-2`, foto reali con fallback. Il mock `keiko-redesign-home-v2.html` è la referenza viva di queste regole.
