# SPEC — I battiti dell'evento (eco + avvicinamento)

> 6 agosto 2026. Pensata una volta, per non tornarci.
> Due prompt in fondo: E1 (motore + home), E2 (notifiche nei tempi morti).
> E1 parte solo quando il restyling della cattura è chiuso (stessa home).

---

## L'idea in una frase

Ogni evento ha dei **battiti**: torna a farsi sentire nei momenti giusti —
**prima** per caricarti, **dopo** per farti rivivere. Una card in home, e
(quando ha senso) una notifica nel tempo morto giusto.

Esempi:
- *Domani sera: Milan–Inter · Le probabili formazioni* (24h prima, notifica a pranzo)
- *Domani: Ultimo a San Siro · Scaldati con la playlist* (24h prima, notifica alle 19)
- *È passato un mese da Ultimo · Riascoltalo* (30 giorni dopo, notifica alle 19)
- *Ieri: Milan–Inter · Gli highlights* (il giorno dopo, notifica a pranzo)

Zero AI, zero API esterne: solo link di ricerca (Spotify, YouTube, Google).
Zero costi, zero paletti legali.

---

## Il motore (uno solo — la regola che non si negozia)

Il motore non contiene MAI la parola «concerto» o «partita». Sa solo questo:

> Per ogni evento dell'utente, per ogni battito configurato per il suo tipo:
> se adesso siamo nella finestra del battito, e quel battito non è mai stato
> mostrato né chiuso, è candidato. Si mostra UN battito alla volta.

Tutto il resto — quali tipi, quando, con che frase, con che link, con che
orario di notifica — è **una tabella di configurazione**. Aggiungere un tipo
o un battito = aggiungere una riga. Se per farlo serve toccare il motore, il
disegno è sbagliato.

## La tabella dei battiti (il condimento)

| Tipo | Battito | Quando | Frasi (a rotazione) | Azione / link | Notifica |
|---|---|---|---|---|---|
| sport | prima | 24h prima (finestra 18-30h) | «Domani sera: {titolo}» · «Ci siamo: {titolo}» | **Le formazioni** → Google «{titolo} probabili formazioni» | 13:00 |
| sport | dopo | il giorno dopo (finestra 12-48h) | «Ieri: {titolo}» · «Com'è finita lo sai. Rivedila» | **Gli highlights** → YouTube «{titolo} highlights» | 13:00 |
| concert | prima | 24h prima (finestra 18-30h) | «Domani: {artista}» · «-1 a {artista}» | **Scaldati con la playlist** → Spotify {artista} | 19:00 |
| concert | dopo | 30 giorni dopo (finestra 30-37g) | «Rivivi {artista}» · «È passato un mese da {artista}» | **Riascoltalo** → Spotify {artista} | 19:00 |

### La regola che decide chi entra in tabella

**Niente azione, niente battito.** Ogni battito DEVE avere un tocco che porta
da qualche parte: o DENTRO l'app (un'altra sezione di Keiko) o FUORI (Spotify,
YouTube, Google). Un battito che dice solo «ricordi?» senza niente da fare non
esiste — quindi «serata amici», «commissioni», eventi generici: nessun battito.
Il motore non ha bisogno di saperlo: se un tipo non è in tabella, non batte.

Le azioni INTERNE valgono quanto le esterne, e sono le più preziose (filtro
della convergenza: collegano i domini di Keiko tra loro). Esempio principe:
serata cinema → il giorno dopo → «Com'era? Segnalo in Guarda» → apre Guarda
con il film pronto da votare. È il ponte eventi ↔ intrattenimento.

Note sulla tabella:
- **Le frasi sono liste**: se ne pesca una per varietà, scelta in modo stabile
  (hash dell'id evento, non random a ogni render — la stessa eco non deve
  cambiare frase a ogni refresh).
- **{artista}** = la parte del titolo prima di «—»/«-»/« a »; se non
  riconoscibile, il titolo intero (le ricerche se la cavano). Split semplice,
  niente NLP.
- **Sport: il link guarda la forma del titolo.** «Le formazioni» ha senso solo
  per le partite a due contendenti. Regola (dentro la riga sport della tabella,
  NON nel motore): se il titolo contiene due squadre/nomi separati da «–», «-»,
  «vs» o «contro» → formazioni (prima) e highlights (dopo). Altrimenti (europei
  di nuoto, F1, Giro, tennis senza avversario noto…) → generico: prima
  «Le ultime» → ricerca Google news sul titolo; dopo «I momenti migliori» →
  YouTube «{titolo} highlights». Mai una card che parla di formazioni a un
  evento che non le ha.
- **Niente battito "prima" per treni, voli, hotel**: quelli hanno già i
  promemoria veri (cron delle 7). I battiti non duplicano i promemoria:
  i promemoria dicono «non dimenticare», i battiti dicono «goditela».
- La classifica per lo sport resta FUORI: è un'informazione, non un'emozione.

## Dove vive

1. **La card in home** (sempre): piccola, sotto il saluto. Emoji tipo, frase,
   azione a destra, ✕ (44px) che chiude per sempre. Se non c'è nessun
   battito, la card non esiste — mai uno stato vuoto.
2. **La notifica** (solo dove la tabella la prevede): arriva nel tempo morto
   giusto — highlights e formazioni a pranzo (13:00), musica alle 19:00.
   Il tocco apre l'app sulla card del battito (idea 100). La notifica è un
   puntatore alla card, mai un canale a sé: tutto ciò che arriva in notifica
   esiste anche in home.

## Anti-spam (regole dure, non preferenze)

- UNA card battito in home alla volta (vince la più fresca).
- MASSIMO UNA notifica-battito al giorno, in totale. Se ne scattano due,
  vince quella col battito più fresco; l'altra resta solo in home.
- Silenzio 23-7 sempre (idea 100), e l'orario è quello di Roma.
- Ogni battito appare UNA volta nella vita. Finestra passata = perso,
  niente arretrati.
- Nel profilo un interruttore «Battiti» (default acceso) che spegne SOLO le
  notifiche: le card in home restano. Un ✕ sulla card chiude quel battito;
  l'interruttore chiude il canale.

## Dove si salva lo stato

`tickets.enrichment.beats` (jsonb esistente, zero migrazioni):
`{ "prima": "mostrato|chiuso|notificato", "dopo": ... }`.
Salvataggio A FUSIONE (stesso pattern di savePlacePhotoName): mai
sovrascrivere il resto di enrichment.

## Domani (non ora — righe future della tabella, tutte già col loro link)

| Tipo | Battito | Azione | Interna/esterna |
|---|---|---|---|
| cinema | dopo, il giorno dopo | «Com'era? Segnalo in Guarda» → Guarda col titolo pronto da votare | INTERNA ⭐ |
| cinema | prima, 24h | «Il trailer» → YouTube «{titolo} trailer» | esterna |
| teatro/opera (oggi finisce in concert: La Scala funziona già — l'opera sta su Spotify) | prima/dopo | Spotify | esterna |
| museum | prima, 24h | «Cosa c'è da vedere» → Google «{titolo} cosa vedere» | esterna |
| restaurant | dopo, 60g | «Ci torni?» → apre la cattura precompilata «cena da {posto}» | INTERNA |
| viaggio | dopo, 30g | «Rivedi le tappe» → la pagina del viaggio | INTERNA |
| tutto | dopo, 365g | «Un anno fa oggi» → la card dell'evento | INTERNA (la 48 che si costruisce da sola) |

Nota per il cinema: oggi la cattura non ha il tipo «cinema» (finisce in
«other»). Per dargli i suoi battiti serve aggiungere il tipo alla lista del
parser — modifica piccola ma da fare a parte, non dentro E1. Il ponte
cinema → Guarda è il battito che vale di più di tutta la tabella: è il
filtro della convergenza fatto funzione.

---

# PROMPT E1 — motore, tabella, card in home, frasi a rotazione

```
Funzione nuova: I BATTITI. Leggi prima docs/SPEC-BATTITI.md (sezioni: idea,
motore, tabella, card in home, anti-spam, stato). Questo prompt fa TUTTO
TRANNE le notifiche (quelle sono il prompt E2, dopo).

Matteo autorizza: app/components/keiko/KeikoHomeV4.tsx, app/page.tsx,
lib/supabase.ts (lettura eventi passati/futuri + salvataggio a fusione su
enrichment.beats), una route piccola per il "chiudi". NON toccare
CaptureSheet e GlobalChrome.

Vincoli non negoziabili:
1. Il motore non nomina mai i tipi: legge la tabella BEATS. Aggiungere un
   tipo domani = una riga. Se ti serve un if sul tipo dentro il motore,
   fermati e riprogetta.
2. La tabella BEATS come da spec: sport prima/dopo, concert prima/dopo.
   NIENTE riga default: un tipo non in tabella non batte (regola «niente
   azione, niente battito»). Frasi in lista, hash stabile dell'id evento.
3. Una card sola in home; nessuna card se nessun battito; ✕ = chiuso per
   sempre; ogni battito una volta nella vita.
4. encodeURIComponent su tutto ciò che va negli URL. Artista = split
   semplice del titolo, fallback titolo intero.
5. Stato in enrichment.beats, salvataggio a fusione.

Prove (crea biglietti finti, poi cancellali e dimmelo):
1. Partita domani sera («Milan–Inter») → card «Domani sera: … · Le
   formazioni», link Google
2. Partita ieri → card highlights, link YouTube giusto
2b. «Europei nuoto» domani (sport SENZA due contendenti nel titolo) → card
   «Le ultime» con ricerca news, NON «Le formazioni»
3. Concerto di 30 giorni fa («Ultimo — San Siro») → frase con {artista}
   giusto, Spotify apre Ultimo
4. Cena di 30 giorni fa → NESSUN battito (tipo non in tabella = non batte)
5. Due battiti candidati insieme → in home ce n'è UNO (il più fresco)
6. ✕ → sparisce e non torna dopo refresh
7. Utente senza eventi → home identica a oggi
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.
```

# PROMPT E2 — le notifiche nei tempi morti (dopo E1, verificato)

```
Seconda metà dei BATTITI: le notifiche. Leggi docs/SPEC-BATTITI.md
(sezioni: dove vive, anti-spam) e il codice E1 già in produzione.

Matteo autorizza: app/api/cron/ (aggiungere il dispatch dei battiti),
vercel.json (se serve una pianificazione), lib/ per la selezione, e
ProfileSheet.tsx per l'interruttore «Battiti».

1. DISPATCH: agli orari della tabella (13:00 e 19:00 ora di Roma), per ogni
   utente con push attive e interruttore acceso: scegli AL MASSIMO UN
   battito notificabile (il più fresco, non ancora notificato né chiuso),
   manda la push con la stessa frase della card, marca "notificato" in
   enrichment.beats. Il tocco apre l'app sulla home con la card visibile.
   Guarda come gira il cron esistente (tick/reminders) e integra lì: NON
   creare un sistema di scheduling nuovo se ce n'è già uno.
2. REGOLE: massimo 1 notifica-battito al giorno per utente; silenzio 23-7;
   default: se un battito è già stato visto in home (mostrato/chiuso), NON
   si notifica — la notifica serve a chi l'app non l'ha aperta.
3. INTERRUTTORE: in ProfileSheet, sezione notifiche: «Battiti» on/off
   (default on). Spegne solo le notifiche, non le card.
4. Il cron è protetto da CRON_SECRET come gli altri.

Prove: forza un dispatch manuale (con il secret) con un battito candidato →
la notifica arriva sull'iPhone di Matteo, il tocco apre la home giusta, un
secondo dispatch nello stesso giorno non manda niente.
npx tsc --noEmit e npm run build verdi. NON committare: mostrami il diff.
```
