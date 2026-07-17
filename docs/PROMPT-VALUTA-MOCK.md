# Prompt per Claude in Chrome — Valutazione del mock redesign

> **Come usarlo:** apri in Chrome il file `docs/mockups/keiko-redesign-home-v3.html` (doppio click → si apre come `file:///…`). Aspetta che le **foto carichino**. Poi apri Claude in Chrome sulla scheda del mock e **incolla tutto il testo sotto la riga**. Alla fine rimandami qui il suo report.

---

Sei un **senior product designer** di altissimo livello, spietato e concreto. Nella scheda attiva del browser c'è un **mock statico** (una sola schermata HTML): è la **direzione di redesign proposta per la Home** di un'app chiamata **Keiko** (un "calendario della vita" che trasforma screenshot/testo in eventi, dieta, allenamento, viaggi, film). Se la scheda non è quella, naviga tu al file locale `keiko-redesign-home-v3.html`.

La direzione proposta è: base **nero-caldo** (#0C0E13) invece del blu piatto, **un solo accento ambra** (#FFB84D) come firma, titoli in **Fraunces** (serif display) + Inter per il corpo, **un unico linguaggio di card** (foto reale + velo scuro/scrim + testo in basso) usato per tutto, e **foto vere** su ogni card. Le foto ora dovrebbero essere caricate: valuta il design **con le foto visibili** — è esattamente la cosa che prima non riuscivamo a vedere.

## Cosa devi fare
- **Fai screenshot** del mock (intero + dettagli delle card).
- **Sii spietato e specifico**: ogni problema con schermata + elemento + il perché. Niente "si può migliorare" generico.
- Ricorda che è un **mock statico**: NON valutare le interazioni (niente tap/scroll/flussi). Valuta solo **direzione visiva, leggibilità e coerenza**.

## Valuta in particolare (in ordine di importanza)
1. **Leggibilità del testo SULLE foto reali — il punto n.1.** Con le foto caricate: ogni titolo e ogni metadato è davvero leggibile su *ogni* card? Guarda con attenzione:
   - la card **"Bowl di pollo"** (foto volutamente **chiara**): il testo bianco + i macro regge o sparisce?
   - la **hero "Cena"** (foto ristorante illuminato): titolo serif e "21:00" ambra si leggono?
   - i **poster** in "Da guardare": il titolo bianco sul poster è leggibile?
   Verdetto secco: lo **scrim** basta o serve rinforzarlo? Dove?
2. **Gerarchia tipografica.** Fraunces è usato SOLO su saluto + titolo hero; tutti gli altri titoli sono in Inter. Funziona la gerarchia o è piatta? Il serif dà carattere o stona?
3. **Un solo linguaggio di card.** Le card (evento, allenamento, dieta, viaggio, film) sembrano *lo stesso sistema* o dialetti diversi?
4. **Contrasto dei metadati** (grigi su nero, "· San Siro", "640 kcal", ecc.): sopra o sotto la soglia di leggibilità?
5. **Troncamento.** La card con titolo lungo ("Semifinale Mondiali Francia–Spagna") tronca in modo pulito o sporco?
6. **Fallback senza foto.** La card **"Milano → Londra"** non ha foto (gradiente di categoria): sembra intenzionale o un buco?
7. **Identità.** Ambra + nero-caldo + serif: è una firma riconoscibile o "ancora una app tra tante"? L'accento ambra è troppo/troppo poco?
8. **Colpo d'occhio generale.** Sembra un **prodotto** o un **prototipo**? Cosa tradisce di più l'uno o l'altro?

## Output
1. **Verdetto in 5 righe** + due voti: **direzione visiva /10** e **pronto-a-diventare-UI-vera /10**.
2. **Leggibilità testo-su-foto**: card per card, promosso/bocciato, con screenshot dei casi peggiori.
3. **Cosa tenere** (le scelte giuste) e **cosa cambiare** prima di portarlo nel codice, in lista prioritaria.
4. **Go / No-go**: questa direzione va **bloccata come design system** e implementata, o va rivista prima? Se rivista, cosa esattamente.

Sii esaustivo sulla leggibilità: è il punto che decide se questa direzione regge col contenuto reale.
