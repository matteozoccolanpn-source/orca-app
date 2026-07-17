# Prompt per Claude in Chrome — Review UI completa e spietata della Home

> **Come usarlo:** apri in Chrome la pagina pubblica `…/ds-preview` (la nuova Home di Keiko, nessun login). Poi apri Claude in Chrome su quella scheda e **incolla tutto il testo sotto la riga**. Rimandami qui il report.

---

Sei un **principal product & visual designer** di livello assoluto (pensa: il designer che rifinisce Apple, Linear, Airbnb, Things, Cron). Il tuo standard è "sembra spedito da un top studio, non un prototipo". Nella scheda attiva c'è la **Home ridisegnata** di **Keiko**, un'app "calendario della vita" (trasforma input in eventi, dieta, allenamento, viaggi, film). Voglio che tu la smonti pixel per pixel e mi dia **TUTTE le migliorie possibili** per renderla un'app **seria, rifinita, professionale** — più di quanto sia mai stata.

## ⚠️ PREMESSA — leggila bene
Le card ora mostrano **gradienti di colore con una grande emoji sfumata** (microfono, manubrio, piatto, bussola, popcorn). Sono **SOLO placeholder**: in produzione **ogni card avrà una FOTO REALE** (poster del film, foto del piatto, foto della città/luogo, foto della palestra). Quindi:
- **NON criticare** i gradienti né le emoji come design finale. **Immagina una foto reale** dietro ogni card e valuta come reggerà (leggibilità testo su foto, scrim, contrasto).
- Concentrati su tutto il resto: **struttura, gerarchia, tipografia, spaziature, allineamenti, proporzioni, colore, micro-dettagli, coerenza, rifinitura**.

I dati sono d'esempio; ignora eventuali contenuti finti. Le interazioni non sono agganciate (è un'anteprima statica): non valutare i tap.

## Analizza OGNI aspetto (sii esaustivo e specifico)

### 1. Tipografia
- Scala (dimensioni di ogni livello: saluto, data, riepilogo, giorni settimana, titolo hero, intestazioni sezione, titoli card, meta): è armonica? Quali px cambieresti?
- Pesi (400/500/600/700): usati in modo coerente? Il font display (Fraunces) è dove deve, o invade?
- Interlinea, `letter-spacing`, ottical sizing. Refusi o incoerenze.

### 2. Spaziature e ritmo
- Ritmo verticale tra le sezioni: c'è un sistema (4/8) o è a caso? Troppo vuoto / troppo denso dove?
- Padding interni (card, topbar, nav). Margini di colonna coerenti?

### 3. Griglia e allineamenti
- Tutto allineato allo stesso margine sinistro/destro? La topbar, il saluto, le card, la nav sono sulla stessa griglia? Elementi fuori asse?

### 4. Card (il cuore)
- Proporzioni (hero, card griglia, mini). Radius, bordi, spessori. Lo **scrim** sotto il testo è adeguato (immaginando foto chiare)?
- Chip/badge: posizione, opacità, leggibilità su foto.
- Gerarchia interna: titolo vs meta vs chip.

### 5. Colore e contrasto
- Palette (nero-caldo + ambra). L'**ambra** è usata con parsimonia (firma) o troppo/troppo poco? Dove?
- Contrasto testo/sfondo: tutto sopra soglia AA? Grigi troppo spenti?

### 6. Elementi specifici
- **Topbar** (logo "keiko", barra "Chiedi a Keiko", avatar): proporzioni, allineamento, la barra è troppo lunga/corta?
- **Striscia settimana**: il giorno attivo (ambra), i pallini evento, il bilanciamento.
- **Riepilogo giornata** ("Oggi · … · riposo"): chiaro? ben posizionato?
- **Hero evento**: dimensione, contenuto, CTA.
- **"Oggi per te"**: la griglia, le 4 card, l'intestazione.
- **Bottom nav + FAB**: dimensioni, spaziatura, icone, il "+", coerenza forma.

### 7. Iconografia & micro-dettagli
- Icone coerenti (stessa famiglia/peso)? Emoji vs icone.
- Divisori, ombre, bordi hairline, safe-area, angoli. Dettagli che fanno "premium".

### 8. Microcopy
- Testi chiari, tono coerente, sentence-case, plurali corretti.

### 9. Prima impressione & "serietà"
- A colpo d'occhio sembra un **prodotto spedito** o un prototipo? Cosa tradisce di più l'uno o l'altro? Cosa la farebbe sembrare **più seria/professionale** subito?

## Output (il formato)
1. **Verdetto in 6 righe** + voti: **design /10**, **rifinitura/serietà /10**.
2. **TUTTE le migliorie**, raggruppate per tema (Tipografia / Spaziature / Griglia / Card / Colore / Elementi / Dettagli / Copy), ognuna con **valore esatto** dove possibile ("X da Apx a Bpx", "gap da A a B", "radius da A a B"). Ordina dentro ogni gruppo per impatto.
3. **Top 10 interventi** in assoluto per far fare il salto "prototipo → prodotto serio".
4. **3 dettagli di raffinatezza** che oggi mancano e che i top studio curano (micro-ombre, hairline, transizioni implicite, allineamenti ottici, ecc.).

Sii concreto e numerico: voglio una lista di modifiche applicabili, non impressioni. Ricorda: **le foto ci saranno** — giudica lo scheletro e la rifinitura.
