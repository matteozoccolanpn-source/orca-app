# KEIKO UI V2 — GUARDA, audit prima del restyling

> Fatto il 9 agosto 2026 sugli screenshot reali della sezione in produzione
> (`scratchpad/guarda-griglia.png`, `guarda-filtri.png`, `guarda-menu.png`,
> `guarda-vuoto.png`, `ricerca.png`) più il codice `app/guarda/GuardaView.tsx`.
>
> **Metodo scelto da Matteo**: Guarda NON si ridisegna da zero. Il codice
> esiste, funziona ed è stato rifatto il 5-6 agosto. Si parte da qui: si elenca
> cosa rompe il sistema V2, si disegna solo quello, e i comportamenti conquistati
> restano dove sono.

---

## 1 · Comportamenti da NON toccare

Questi sono costati fatica e non si rimettono in discussione nel mock. Se il
mock sembra suggerire il contrario, ha ragione il codice.

- **Griglia unica**: prima lo stesso titolo compariva fino a tre volte.
- **Tap sulla locandina = scheda**, non «visto». (Il tap che segnava visto era
  il bug principale della versione precedente.)
- **Tocco lungo = menu azioni** in foglio dal basso.
- **Segmented** Da vedere / Visti / Tutti, più filtri a parte.
- **Serie con stagione ed episodio**, «Continua a guardare», +1 episodio.
- **Ricerca su tutti gli abbonamenti**: mostra dove ce l'hai già e ordina prima
  quello incluso nei servizi che paghi. Dati TMDB, nessun costo.
- **Voto dal toast**, scheletri di caricamento, stato vuoto progettato.
- `tmdb_id` risolto una volta sola all'aggiunta: poster e genere stanno in
  database. Nessuna chiamata TMDB all'apertura.

---

## 2 · Cosa rompe il sistema V2 (la lista di lavoro)

**Colore — è il problema grosso.** Tutta la sezione è ancora sull'ambra
`#FFB84D`, il colore dichiarato chiuso nel manifesto: chip «Consiglio»,
segmented attivo, «Dove vederlo», i «+» della ricerca, il FAB. Vanno
ricondotti al sistema: **teal per stato, selezione, filtri attivi, il “motivo”;
terracotta solo per la primaria di riga e il FAB.**

**Label.** «STASERA PER TE» è maiuscola e in colore accento. Il manifesto
(punto 11) vuole le label grigie, peso medium, possibilmente non maiuscole.
Diventa `stasera per te` in grigio, o kicker teal senza maiuscole.

**Emoji.** Restano nell'interfaccia strutturale: 🟡 davanti a «C'è su Netflix»,
▶ dentro i bottoni, ✓ testuale. Zero emoji: si passa al set di icone-linea.

**Badge accavallati.** Su una stessa locandina convivono tre trattamenti:
badge «Serie» in alto a sinistra, spunta gigante del visto al centro, pallino
col voto in basso. Il manifesto vuole **un solo stile di badge** (fondo
`rgba(16,16,19,.6)` + blur 10, testo ≥12px). Va scelta una gerarchia: sorgente
in alto a sinistra, stato in basso a destra, e il «visto» come velo scuro +
spunta piccola invece della spunta a tutta card.

**Foglio azioni.** Oggi è una pila di bottoni pieni tutti uguali, senza
gerarchia. Nel sistema è la **riga-azione con icona** della Cucina
(icona quadrata quota 2 + titolo + metadato + chevron), con la primaria sola in
alto ed «Elimina» in fondo, terziaria grigia.

**Segmented control.** Non esiste come componente V2. Si mappa sui **chip pill**
già in uso (attivo = fill teal pieno, inattivo = bordo marcato), stesso
componente dei filtri di Cucina.

**Testata.** «Da guardare» + «19 titoli» in alto a destra: il conteggio è un
metadato e va in grigio sotto il titolo, alla maniera della Cucina
(«Domenica · 5 pasti · il prossimo è la merenda»).

**Ricerca.** «C'è su Netflix, Now, TIMVision» fa esattamente il lavoro del
*motivo teal con la spunta* della Cucina («usi il pollo e le patate che hai»).
È già lo stesso componente: va solo rivestito — spunta teal, testo teal-soft,
e «Non in streaming in Italia» come metadato grigio, mai rosso né con ✕.

---

## 3 · Decisione presa: la variante «poster» entra nel sistema

Guarda usa locandine 2:3 su tre colonne. Il sistema conosceva solo Feature
(16:9) e Content (16:10, due colonne). **Matteo ha deciso il 9 agosto di
ammettere una terza variante**, perché la locandina è il linguaggio della
sezione e due colonne dimezzerebbero la densità.

- **Poster**: rapporto 2:3, griglia a **tre colonne**, radius 12,
  **un solo badge** in alto a sinistra, titolo Inter 12,5px **fuori** dalla
  foto, troncato a una riga, metadato grigio opzionale sotto.
- Vale anche per la mensola «Riprendi» della Home, dove i poster già ci sono.
- Resta l'unica eccezione ammessa: nessun altro formato nuovo senza motivo
  scritto.

---

## 4 · Da decidere nel primo giro di mock

1. Il blocco «Stasera per te» resta una card feature grande, o diventa la
   card-hero della sezione come il «Menu di oggi» in Cucina?
2. Il «Consiglio» (la richiesta a Keiko) diventa la **barra assistente** teal
   già usata in Cucina e Ricettario, con l'invio terracotta?
3. Cosa entra nelle sotto-viste: scheda del titolo, ricerca, salvati/visti.
