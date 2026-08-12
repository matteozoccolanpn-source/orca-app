# KEIKO — la strada, da qui in avanti
### aggiornata l'11 agosto 2026

Questo documento dice **cosa viene dopo cosa**, e perché. Chi riprende il
lavoro parte da qui.

---

## Fase A — la UI V2 in codice (in corso)

Il metodo è sempre lo stesso, un'ondata per sezione: **cambia solo il vestito.**
Markup e classi dal mock, componenti da `app/components/v2/`, tutto dentro
`.k2`. Stato, effetti, chiamate di rete e gestori restano dov'erano. Dove il
mock e il codice si contraddicono, **vince il codice** e la contraddizione si
segnala invece di inventare il collegamento.

| # | sezione | file principale | stato |
|---|---|---|---|
| 1 | fondamenta (`keiko-v2.css`, `components/v2/`, `/v2/keiko`) | — | ✅ online |
| 2 | Guarda | `app/guarda/GuardaView.tsx` | ✅ online |
| 3 | Allenamento | `app/allenamento/AllenamentoView.tsx` + `SessioneLive.tsx` | ✅ online |
| 4 | **Home** | `app/components/keiko/KeikoHomeV4.tsx` | 🔄 in corso |
| 5 | Cucina | `app/cucina/CucinaView.tsx` | 📄 prompt pronto |
| 6 | Dieta | `app/salute/SaluteView.tsx` + `DietView.tsx` | da scrivere |
| — | Viaggi | `app/viaggio/ViaggioView.tsx` | ⏸️ in pausa — vedi Fase C |

I prompt vivono in `docs/PROMPT-CODE-0*.md`.

**La fase A finisce quando la UI nuova è sul telefono**, tutte le sezioni.
Non prima.

---

## Fase B — i bug della palestra

Da fare **subito dopo** la fase A. Sono difetti di sostanza, non di vestito:
qui si tocca la logica, e serve l'autorizzazione esplicita di Matteo per
`lib/` e `app/api/`.

Cosa c'è già in lista, raccolto durante le ondate:

- Il menu delle stagioni si riempie solo quando risponde `/api/workout/progress`,
  ma `WorkoutItem` ha già `totalSeasons` in tabella. Una riga (`detItem.totalSeasons`
  dentro il `Math.max`) e parte completo dal primo istante.
- «Com'è andata?»: il campo `sensazione` esiste in tabella e nessuna UI lo scrive.
- Il timer di recupero: il mock ha la classe `.giant` per un timer a schermo
  pieno che nel codice non esiste. È una funzione nuova, non un vestito.
- I chip di tendenza in «A che punto sei»: servono una serie storica che oggi
  non c'è. Una tendenza da due sedute sarebbe inventata.

Prima di partire, Matteo elenca i bug che vede lui usando l'app: questa lista
è quella emersa dal codice, non dall'uso.

---

## Fase C — i Viaggi

Da fare **dopo** la fase B. È la sezione con il debito più grosso, e la
direzione è già scritta in `docs/SPEC-VIAGGI-DIREZIONE.md`.

Il punto: **tre azioni su quattro non fanno quello che dicono.** «Scambia una
tappa» è solo un messaggio; «Cambia (1/3)» cicla le alternative in memoria e la
scelta si perde al ricaricamento; «Aggiorna» su un viaggio pronto non aggiorna
niente ma risponde «tutto confermato ✓». E spostare una singola visita costa 10
di AI, quanto generare un viaggio intero.

Per questo i Viaggi **non hanno un'ondata di restyling**: rivestirli vorrebbe
dire rendere belli dei bottoni che mentono. Prima la sostanza (i sette punti
del §2 della spec), poi il vestito.

I lavori di prodotto già identificati e che confluiscono qui:

- il peso AI dell'edit di uno slot da **10 a 1**;
- un biglietto nuovo tocca **solo la sua fascia oraria**, non fa ripartire tutto;
- la scelta fra le alternative **si salva** — se non si salva non è una scelta;
- i viaggi passati escono dalla vista, e la Home smette di mostrare il primo per
  data crescente senza filtro;
- «Aggiorna» o fa qualcosa o sparisce;
- il ponte `matchTicket` si finisce: la tappa delle 15:40 apre il biglietto vero.

---

## Fuori dalle fasi — lavori di prodotto in attesa

Emersi durante le ondate, non urgenti, da collocare quando serve:

- **Un endpoint che restituisce l'anteprima della modifica senza salvarla.**
  Serve al pannello della domanda: oggi non c'è modo di mostrare il «prima →
  dopo» senza aver già scritto.
- **Una regola vera per «Stasera per te»** nella Guarda: oggi il titolo è scelto
  con `Math.random()`, quindi la card non può avere un «perché» — sarebbe una
  bugia. Serve un criterio: l'ultimo aggiunto, il più corto, quello su una
  piattaforma che hai.
- **Il campo `info` di `lib/films.ts` fa due mestieri**: sul giro normale è un
  motivo vero, sul giro di ripiego diventa «generi, anno, stagioni». Serve un
  campo separato, altrimenti la card mostra come perché una cosa che perché non è.
- **Unire Cucina e Dieta in una tab sola**, come nel mock. Oggi sono due pagine
  (`/cucina` e `/salute`) e il tab «Dieta» punta alla seconda. È una decisione di
  prodotto, non di grafica.
- **La barra di ricerca della Home «un filo più piccola»**: chiesta, poi
  superata dall'istruzione «Home identica al mock congelato». Da riprendere
  quando la Home è in piedi.

---

## I vincoli che non cambiano mai

- Keiko **non scrive e non modifica un piano alimentare** (art. 348 c.p.) e non
  interpreta dati sanitari.
- La **scheda di allenamento è del personal trainer**: Keiko la trascrive, non
  la scrive. Nessun esercizio proposto, nessun carico suggerito.
- **Mai committare senza l'ok esplicito di Matteo**, mai push senza dirlo.
- `npx tsc --noEmit` e `npm run build` verdi prima di ogni commit.
- Niente rifattorizzazioni di file scollegati dal compito.
- Il backup CSV della dieta non si committa mai: sono dati sanitari.
