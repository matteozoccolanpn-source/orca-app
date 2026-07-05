# Keiko — Ricerca migliorie UI (best practice 2025–2026)

> **Proposte, non modifiche.** Ognuna va approvata da Matteo prima di aggiornare il
> capitolato e portarla nel codice. Nessun valore visivo nuovo entra senza ok esplicito.

Base analizzata: `app/keiko.css` (port 1:1 dal mockup). Dove utile, i rapporti di contrasto
sono calcolati con la formula WCAG 2.x sui valori esatti dei token attuali (verificabili con
un contrast checker). I token effettivi in dark sono: `--bg #12203A`, `--card #1E3153`,
`--text-3 #93A5C2` (override riga 558, non `#8496B3`), `--accent #5A9DFF`, `--amber #F0B24A`;
in light `--card #F8F4E9`, `--accent #0E8F87`. Scala testi reale: `--fs-xs 11px … --fs-xl 24px`.

Le proposte sono ordinate per impatto (più alto in cima). Il viola non compare mai: l'accento
resta `--accent`. La firma colore "Oceano" (`--pA 90,157,255` / `--pB 255,138,92`) è intoccabile.

---

## 1. Testo bianco sul fondo accento (dark): ~2,7:1, sotto AA
**Categoria:** contrasto / accessibilità

Il bianco sui fondi pieni `--accent #5A9DFF` compare su bottoni primari, FAB, giorno "oggi" e
CTA: `.btn.acc`, `.fab`, `.peek .openBtn`, `.addTodo button`, `.day.today` (tutti `color:#fff`).

- **Prima:** `background:var(--accent) #5A9DFF; color:#fff` → **≈ 2,7:1** (fallisce AA 4,5:1 per
  testo < 18,66px bold, cioè quasi tutti: `.btn` è 11px/800, `.day.today b` 15px/800).
- **Dopo (opzione A, nessun valore nuovo):** testo scuro esistente sul pieno accento →
  `color:var(--ink)` (`#15202F`, già definito e scuro in entrambi i mood) → **≈ 5,5:1** in dark.
- **Dopo (opzione B, richiede nuovo valore visivo → da approvare):** introdurre `--accent-strong`
  (blu più profondo, candidato **#2E68C7** da tarare con Matteo) come *solo fondo* dei bottoni,
  tenendo il bianco → ≥ 4,5:1. L'accento resta `#5A9DFF` per testo, bordi e icone.

**Fonte:** [WCAG 2.2 — Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
— testo normale richiede 4,5:1; "large" solo da 18,66px bold / 24px regular in su.
**Perché:** i bottoni e il pill "oggi" sono gli elementi più toccati e più importanti di un
calendario; oggi il loro testo è al limite della leggibilità in pieno sole. È il fix a impatto
più alto perché tocca l'azione principale in ogni schermata.

---

## 2. Le card interattive non sono raggiungibili da tastiera / niente focus ring
**Categoria:** accessibilità

`.hero`, `.mini`, `.tile`, `.trip`, `.film`, `.day`, `.todo`, `.now`, `.agRow`, `.itStop.tap`
sono `<div>` con `cursor:pointer`: cliccabili col dito, invisibili a tastiera e a VoiceOver come
controlli. Il `:focus-visible` (riga 551) copre solo `button`, `.tab`, `.sg`.

- **Prima:** focus ring solo su 3 selettori; le card sono `div` senza `tabindex`/ruolo.
- **Dopo (nessun valore nuovo):** rendere le card interattive focusabili (`tabindex="0"` + `role`
  lato markup) ed estendere la regola esistente:
  `.keiko .hero:focus-visible, .mini:focus-visible, .tile:focus-visible, .trip:focus-visible,
  .film:focus-visible, .day:focus-visible, .todo:focus-visible, .agRow:focus-visible
  {outline:2px solid var(--accent); outline-offset:2px}` (stesso stile già in uso).

**Fonte:** [WCAG 2.2 — Understanding SC 2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
— ogni elemento operabile da tastiera deve avere un indicatore di focus percepibile.
**Perché:** Keiko è una PWA; su iPad con tastiera, con Controllo Interruttori o Full Keyboard
Access oggi la home è di fatto inutilizzabile senza dito. Riusa un valore già presente.

---

## 3. Aree di tocco sotto i 44pt (diverse anche sotto i 24px WCAG)
**Categoria:** accessibilità / spaziatura

Elementi tappabili più piccoli del minimo: `.todo .star` (`min-width:24px`), `.check` (24px),
`.ex .c` (18px), `.more` (30px), `.evClose` (34px), `.sw` (32px), `.icoBtn`/`.logo` (40px),
`.day` (altezza ≈ 40px). `.tab` è già `min-height:44px` (corretto, da usare come riferimento).

- **Prima:** target da 18–40px.
- **Dopo (nessun valore nuovo — l'ingombro visivo resta identico):** portare l'*area di tocco* a
  ≥ 44×44px via padding o pseudo-elemento trasparente, es.
  `.keiko .star::before{content:"";position:absolute;inset:-10px}` (idem per `.check`, `.more`,
  `.evClose`, `.ex .c`). Nessun colore o dimensione visibile cambia.

**Fonte:** [Apple HIG — Accessibility (Buttons and controls ≥ 44×44pt)](https://developer.apple.com/design/human-interface-guidelines/accessibility)
· [WCAG 2.2 — SC 2.5.8 Target Size (Minimum) 24×24 CSS px](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
**Perché:** ricerca Apple: sotto i 44pt il tasso di tap errati sale ≥ 25%. Lo swipe/tap sul
to-do, la stellina e la spunta sono gesti quotidiani in Keiko.

---

## 4. Accento teal chiaro su card crema (light): ~3,6:1, sotto AA
**Categoria:** contrasto

In mood chiaro `--accent #0E8F87` è usato come *testo* su `--card #F8F4E9` (`.tile .go`,
`.peek .row b`, link "La settimana ›", ecc.).

- **Prima:** `#0E8F87` su `#F8F4E9` → **≈ 3,6:1** (fallisce AA 4,5:1 per il testo non-bold; anche
  il bianco su teal nei bottoni light è ≈ 3,96:1, sotto soglia).
- **Dopo (richiede nuovo valore visivo → da approvare):** scurire il teal chiaro di ~1 passo,
  candidato **#0B7C74** (da tarare) → ≈ 4,5:1 su card, e migliora anche il bianco-su-teal dei
  bottoni light. Resta un teal, non cambia la personalità.

**Fonte:** [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html)
· [WCAG 2.2 — SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
— i mid-tone saturi su fondi chiari sono il punto debole tipico; vanno verificati, non stimati.
**Perché:** in mood giorno all'aperto (uso tipico "sto uscendo, controllo il treno") i link e i
bottoni teal oggi si leggono male. Coerente con la regola "ogni card stacca e comunica".

---

## 5. `prefers-reduced-motion` copre solo metà delle animazioni
**Categoria:** animazione / accessibilità

Il blocco `@media (prefers-reduced-motion)` (righe 588–592) disattiva solo `.rise`, lo splash e
il pulse. Restano attive le animazioni grandi: `k_grow` (evPanel/askFull), `k_up` (sheet),
`k_pop` (peek), `k_fromPeek` (dayPanel), lo slide `.view` (`translateX(102%)`), il `k_shimA`
(shimmer) e i glow.

- **Prima:** solo 3 elementi neutralizzati.
- **Dopo (nessun valore nuovo):** estendere lo stesso blocco con
  `.keiko .evPanel, .askFull, .sheet, .peek, .dayPanel, .view {animation:none!important}` e
  `.keiko .view{transition:none!important;transform:none!important}` +
  `.keiko .shim::after{display:none}`. Comparse istantanee, nessun movimento.

**Fonte:** [MDN — prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
· [WCAG 2.2 — SC 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
— chi attiva "riduci movimento" deve poter disattivare le transizioni non essenziali.
**Perché:** i pannelli che scalano/traslano sono i movimenti più forti dell'app; per utenti con
disturbi vestibolari oggi non c'è scampo. Il rispetto della preferenza è già iniziato: va finito.

---

## 6. `user-select:none` globale impedisce di copiare i dati
**Categoria:** usabilità / accessibilità

Riga 58: `.keiko *{…user-select:none}` blocca la selezione ovunque, inclusi codici biglietto,
indirizzi, orari, kcal — dati che l'utente a volte vuole copiare/incollare altrove.

- **Prima:** `user-select:none` su tutto.
- **Dopo (nessun valore nuovo):** tenere `none` solo sulla "chrome" (topbar, week, tabbar,
  bottoni) e riattivare la selezione sui contenuti-dato:
  `.keiko .bigTkt, .keiko .tkt .stn, .keiko .tkt .times, .keiko .evNarr, .keiko .itStop .t
  {user-select:text}`.

**Fonte:** [MDN — user-select](https://developer.mozilla.org/en-US/docs/Web/CSS/user-select)
— `none` va usato su UI di controllo, non sul contenuto testuale utile.
**Perché:** coerente con la voice ("Mostralo al controllore"): il biglietto è un dato reale;
poter copiare un indirizzo o un codice è un gesto banale oggi impedito.

---

## 7. Nessun supporto a `prefers-contrast: more`
**Categoria:** accessibilità / contrasto

Il bordo card `--card-line rgba(165,195,240,.11)` è volutamente tenue (regola del trio
fill+bordo+ombra). Ma chi imposta "Aumenta contrasto" su iOS non riceve nessun rinforzo.

- **Prima:** nessuna media query di contrasto.
- **Dopo (nessun valore nuovo — solo rialzo dell'alpha già esistente):**
  `@media (prefers-contrast: more){ .keiko{--card-line:rgba(165,195,240,.28); --text-3:#B4C4DE} }`
  (stessi colori, solo più opachi/chiari; da verificare col test scala di grigi).

**Fonte:** [MDN — prefers-contrast](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast)
· [Apple HIG — Accessibility (Increase Contrast)](https://developer.apple.com/design/human-interface-guidelines/accessibility)
— rispettare la richiesta di sistema di contrasto maggiore.
**Perché:** aiuta ipovedenti e uso all'aperto senza toccare l'estetica di default; rafforza la
regola "nessuna card affoga nel fondo" proprio per chi ne ha più bisogno.

---

## 8. Chip "Oceano" blu su crema (light): contrasto insufficiente
**Categoria:** contrasto

`.chip` usa `color:rgb(var(--pA))` = `rgb(90,157,255)` su `background:rgba(var(--pA),.14)` sopra
card crema → testo blu chiaro su fondo quasi bianco ≈ **2,3:1** (`.chip.warm` invece scurisce già
via `color-mix(... #7A4A10)` ed è ok).

- **Prima:** chip freddo `color:rgb(90,157,255)` in light.
- **Dopo (richiede nuovo valore visivo → da approvare):** applicare al chip freddo lo stesso
  trattamento del `.warm`, cioè scurire il testo in light: `color:color-mix(in srgb,
  rgb(var(--pA)) 70%, #0A2A5C)` (solo nel mood `.alt`). Il fondo del chip resta la firma Oceano.

**Fonte:** [WCAG 2.2 — SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
— testo (anche bold, sotto 18,66px) richiede 4,5:1.
**Perché:** i chip categorizzano i to-do; in mood giorno oggi spariscono. Non tocca la firma
colore in dark (dove il contrasto regge), interviene solo dove serve.

---

## 9. Movimento: durate ed easing sparsi → scala a token
**Categoria:** animazione

Oggi le durate sono ad-hoc: `.14s` (fab), `.2s` (press card), `.22s` (peek), `.24s` (sheet),
`.25s` (ctxbar), `.34s` (view), `.36s` (evPanel), `.65s` (animMood); easing misti
`cubic-bezier(.2,.8,.2,1)`, `(.34,1.56,.64,1)`, `ease`.

- **Prima:** ~6 durate e 3 easing scollegati.
- **Dopo (richiede nuovi valori visivi → da approvare, ma derivati da standard):** definire una
  scala e riusarla:
  `--dur-fast:150ms; --dur-base:200ms; --dur-emph:300ms; --dur-panel:400ms;`
  `--ease-standard:cubic-bezier(0.2,0,0,1);` (M3 *standard*) mantenendo la molla di personalità
  `--ease-spring:cubic-bezier(.34,1.56,.64,1)` per il press delle card.

**Fonte:** [Material 3 — Easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs)
· [material-components-android — Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)
(standard = `cubic-bezier(0.2,0,0,1)`; short 50–200ms, medium 250–400ms, long 450–600ms).
**Perché:** un sistema di durate coerente rende l'app "di una mano sola"; oggi transizioni
simili durano tempi diversi senza motivo. La molla resta la firma di Keiko.

---

## 10. Peso font troppo alto sul bianco in dark (halation)
**Categoria:** tipografia / contrasto

I titoli bianchi grandi sono a `font-weight:800` (`.hero h2` 22px/800, `.sec h3` 19px/800,
`.evArt h2` 27px/800). Su fondo scuro il testo chiaro "sanguina" e appare più grasso.

- **Prima:** titoli bianchi 800 in dark.
- **Dopo (richiede nuovo valore visivo → da approvare):** in `.keiko` (solo dark) portare i titoli
  bianchi grandi a `font-weight:700` (`.hero h2`, `.evArt h2`, `.sec h3`); il mood `.alt` (testo
  scuro su chiaro) resta 800. Nessun cambio di dimensione.

**Fonte:** [Apple HIG — Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
· [Designing Inclusive Dark Modes — accessibilitychecker.org](https://www.accessibilitychecker.org/blog/dark-mode-accessibility/)
— in dark il testo chiaro appare più spesso e "brilla"; ridurre il peso migliora la lettura,
specie per chi ha astigmatismo (halation).
**Perché:** i titoli grandi sono ovunque nella home; alleggerirli in dark riduce l'affaticamento
senza perdere gerarchia (restano i più grandi in pagina).

---

## 11. Micro-etichette sotto gli 11pt del minimo iOS
**Categoria:** tipografia / accessibilità

Diverse etichette sono a 8,5–9px: `.stBadge` (9px), `.hero .catL`/`.mini .cat2` base 9px (in parte
già rialzate a 10px alle righe 561–568), `.bigTkt .m2 .k2` base 8,5px (override a 9,5px),
`.standing .tm` 10px, ecc. Alcune restano a 9px.

- **Prima:** minimo effettivo 9px su alcune etichette uppercase.
- **Dopo (richiede nuovo valore visivo → da approvare):** fissare un floor a **10px** per tutte le
  etichette (`.stBadge`, `.mini .g` a parte perché è emoji), allineandosi a quanto già fatto per
  `.mini .cat2`/`.tab`/`.secLabel` nelle righe di override.

**Fonte:** [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
— testo minimo 11pt per caption/secondario; sotto, leggibilità a rischio.
**Perché:** su iPhone reale le etichette a 9px in maiuscoletto tracciato sono al limite; un floor
a 10px è già la direzione presa dal file (righe 561–568), qui solo completata.

---

## 12. `transition:all` → proprietà esplicite
**Categoria:** performance / animazione

`.ctxbar{transition:all .25s}` e `.dotsRow i{transition:all .25s}` animano *tutte* le proprietà,
incluse quelle che causano layout (width del dot `.on` passa da 6px a 16px).

- **Prima:** `transition:all .25s`.
- **Dopo (nessun valore nuovo):** `.ctxbar{transition:opacity .25s, transform .25s}` e
  `.dotsRow i{transition:width .25s, background-color .25s}`.

**Fonte:** [MDN — using CSS transitions (evitare `all`)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions)
· [Material 3 — Motion overview](https://m3.material.io/styles/motion/overview/how-it-works).
**Perché:** animare solo ciò che serve evita reflow inutili e micro-scatti su iPhone di fascia
media; nessun effetto visivo cambia.

---

## 13. Scala testi in px fissi: ignora il Dynamic Type di iOS
**Categoria:** accessibilità / tipografia

`--fs-xs 11px … --fs-xl 24px` sono px assoluti: non rispondono all'impostazione "Dimensioni testo"
di iOS. È un limite noto del port a larghezza fissa 390px, ma va messo a piano.

- **Prima:** token in `px` fissi.
- **Dopo (richiede lavoro strutturale → da valutare):** esporre la scala in unità relative
  (`rem`/`em`) o `clamp()` così l'app segue il Dynamic Type dell'utente. Da fare *dopo* aver
  chiuso il redesign visivo, per non rompere il confronto 1:1 col mockup.

**Fonte:** [Apple HIG — Typography (Dynamic Type)](https://developer.apple.com/design/human-interface-guidelines/typography)
— supportare il Dynamic Type è un requisito di accessibilità di prima classe su iOS.
**Perché:** utenti ipovedenti alzano il testo di sistema; oggi Keiko resta fissa. Impatto reale
ma effort alto: proposta di roadmap, non fix immediato.

---

## 14. Fallback per `backdrop-filter` non supportato
**Categoria:** contrasto / robustezza

`.topbar`, `.tabbar`, `.ctxbar`, `.mini .when`, `.evClose` si affidano a `backdrop-filter:blur()`
con fondi semi-trasparenti (`--bar rgba(14,24,44,.9)`). Dove il blur non è supportato/è disattivo,
il fondo trasparente riduce il contrasto del testo.

- **Prima:** solo `background:var(--bar); backdrop-filter:blur(20px)`.
- **Dopo (nessun valore nuovo):**
  `@supports not (backdrop-filter:blur(1px)){ .keiko .topbar,.tabbar,.ctxbar{background:var(--bg-2)} }`
  (usa `--bg-2 #182948`, già opaco e già nel mockup).

**Fonte:** [MDN — backdrop-filter (compatibilità e fallback)](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
· trend "glass" 2026 con tecniche performance-aware — [Envato — UX/UI trends](https://elements.envato.com/learn/ux-ui-design-trends).
**Perché:** il "vetro" (Liquid Glass / glassmorphism) è on-trend ma va reso robusto: senza blur
la barra alta e la tabbar devono restare leggibili. Riusa un colore già del mockup.

---

## Tabella riepilogo

| # | Proposta | Impatto | Nuovo valore visivo? |
|---|----------|:------:|:--------------------:|
| 1 | Bianco su accent (dark) ~2,7:1 → ink scuro o `--accent-strong` | Alto | Sì (opz. B) / No (opz. A) |
| 2 | Card interattive focusabili + focus ring | Alto | No |
| 3 | Aree di tocco ≥ 44pt (star, check, more, evClose…) | Alto | No |
| 4 | Teal chiaro su crema ~3,6:1 → scurire `--accent` light | Alto | Sì |
| 5 | `prefers-reduced-motion` esteso a pannelli/sheet/peek/glow | Alto | No |
| 6 | `user-select` sui dati (biglietti, indirizzi, orari) | Medio | No |
| 7 | Supporto `prefers-contrast: more` | Medio | No |
| 8 | Chip Oceano su crema (light) → scurire testo chip freddo | Medio | Sì |
| 9 | Token di movimento (durate + easing M3 standard) | Medio | Sì |
| 10 | Peso titoli bianchi 800 → 700 solo in dark (halation) | Medio | Sì |
| 11 | Floor etichette a 10px (min iOS) | Medio | Sì |
| 12 | `transition:all` → proprietà esplicite | Basso | No |
| 13 | Dynamic Type: px → rem/clamp (roadmap) | Medio | No (strutturale) |
| 14 | Fallback `@supports` per `backdrop-filter` | Basso | No |
