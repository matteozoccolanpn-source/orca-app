# Fix round 1 — riportare profondità e immersività (dal confronto screenshot vs mockup)
> Prompt per Claude Code. Regola sopra tutte: LE MISURE E I COLORI NON SI INTERPRETANO,
> SI COPIANO da docs/mockups/keiko-final.html. Aprilo e cerca i selettori indicati.

## 0. Regola dei tre strati (perché ora è piatto)
Ogni schermata del mockup ha 3 strati che oggi mancano:
1) BLOOM ambientale sopra lo sfondo, 2) RADIALI dentro le art delle card + shade scuro in basso,
3) GLOW di personalità sulle card di oggi. Senza questi, qualsiasi misura giusta resta piatta.

## 1. Sfondo + bloom (subito, cambia tutto)
- Lo sfondo pagina è `--bg:#12203A` (ora è quasi nero). 
- Aggiungi un layer fisso sopra lo sfondo, sotto il contenuto (pointer-events:none):
  background: 
    radial-gradient(72% 44% at 90% -4%, rgba(var(--pB),.4) 0%, transparent 60%),
    radial-gradient(100% 55% at 40% -12%, rgba(var(--pA),.5) 0%, transparent 64%),
    linear-gradient(to bottom, rgba(var(--pA),.22) 0%, transparent 40%);
- Personalità: --pA/--pB su <body> via JS: Oceano 90,157,255 / 255,138,92 · Tramonto 255,158,100 / 201,139,255 · Laguna 53,196,181 / 255,209,102. Random al load.

## 2. Accent sbagliato
- Il viola NON esiste. Accent scuro = #5A9DFF, chiaro = #0E8F87. FAB, bottone invio, link "Vai/La settimana", pill today: tutti var(--accent).

## 3. Hero (selettore .hero nel mockup)
- Altezza FISSA 238px, larghezza 326 (flex:0 0 326px), radius 26.
- Art del treno = ESATTAMENTE:
  radial-gradient(110% 80% at 88% -6%,rgba(130,168,215,.46) 0%,transparent 52%),
  radial-gradient(90% 70% at 8% 18%,rgba(60,96,150,.28) 0%,transparent 58%),
  linear-gradient(168deg,#2A4568 0%,#16273F 55%,#0D1728 100%)
- Sopra l'art: shade `linear-gradient(to top,rgba(4,9,18,.5) 0%,transparent 55%)` e tinta personalità `radial-gradient(130% 100% at 90% -10%,rgba(var(--pA),.22),transparent 55%)`.
- Titolo 22px/800, categoria 11px ambra #F5D9AE ls .13em, meta 11px bianco .82.

## 4. Biglietto dentro l'hero (selettore .tkt)
- Struttura: sinistra = riga orari `18:05 ——🚄—— 21:50` (linea tratteggiata repeating-linear-gradient) con stazioni sotto in maiuscolo 10px; destra oltre il tratteggio verticale = pill "📍 Maps" scura (#15202F) + carrozza/posto + "agg. X′ fa".
- NIENTE titolo ripetuto dentro il biglietto. Notch laterali: ::before/::after cerchi 14px rgba(4,9,18,.32).

## 5. "Adesso" (selettore .now)
- NON è una card di carta: è il bottone inverso — background var(--text), testo var(--bg), icona freccia-navigazione SVG, "Esci alle X" 15px/800 + sotto countdown 11px. La card hotel di oggi vive nel carosello hero/agenda, non qui.

## 6. Week strip (selettore .week/.day)
- Compatta: label giorno 10px/700 uppercase, numero 15px/800, padding 9px sopra 7px sotto, today = pill var(--accent) radius 14, pallini 4px nei colori personalità. Altezza totale ~64px, non di più.

## 7. In arrivo (selettore .mini)
- 200×128, dentro l'art: radiale categoria in alto a destra (sport rgba(235,110,85,.5) / volo rgba(95,175,220,.5) / concerto rgba(165,120,225,.48)) + linear scura, pshade `to top rgba(0,0,0,.55)→transparent 62%`, chip data in alto a sx, riga info in basso con la parola calda in #F5D9AE.

## 8. Oggi per te (selettore .tile)
- min-height 196, glow personalità: ::before radial rgba(var(--pA),.26) (palestra) / rgba(var(--pB),.22) (dieta) che si ACCENDE con IntersectionObserver (classe .lit, transizione 1s) + reveal .rise (translateY 16px→0).

## 9. Ombre
- Tutte le card: box-shadow 0 16px 36px rgba(2,8,20,.45) (scuro) — mai le shadow di default di Tailwind.

## 10. Fondo pagina: la barra chat flottante in basso NON esiste nel design
- L'Ask sta SOLO in alto. In basso va la tab bar: blur var(--bar), border-top card-line, Home/Dieta/＋FAB(52px, gradiente accent, margin-top -22)/Sport/Guarda.

## 11. Mood chiaro (per vederlo)
- Implementa il secondo set di token (in keiko-final.html è `.phone.alt`): bg #EAE3D3, card #F8F4E9, text #241E12, accent #0E8F87, ecc. Toggle dal sole/luna con transizione 0.65s su colori, persisti in localStorage. 
- Logo: usa docs/logo/keiko-logo.svg inline (currentColor), non l'emoji balena.

## Verifica finale
Apri keiko-final.html e l'app fianco a fianco alla stessa larghezza: se una sezione non è
indistinguibile a colpo d'occhio, non è finita.
