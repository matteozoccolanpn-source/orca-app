# Keiko — NON ORA (parcheggio, non cestino)

> Deciso il **3 agosto 2026**: Keiko è un **progetto personale + amici**. Nessun ricavo,
> nessuna scadenza, nessuna metrica da rispettare. Un solo appuntamento: **inizio novembre 2026**.
>
> Questo file esiste perché niente vada perso. Tutto ciò che è qui dentro è **valido, studiato
> e documentato** — semplicemente non è di questo trimestre.
>
> Regola: **si aggiunge qualcosa al lavoro solo togliendo qualcos'altro.**

---

## Perché è parcheggiato (in tre righe)

L'analisi di mercato del 3 agosto 2026 (19 agenti di ricerca, verifica avversariale su ogni filone,
604 interrogazioni a fonti) ha concluso: **il "concierge di vita" orizzontale non è commercializzabile
in questa configurazione**; l'unico residuo con aritmetica viva è il verticale del piano professionale.
Ma la domanda commerciale non era quella che il progetto si era posto: `VISION.md` diceva già
*"non sto ottimizzando per il ricavo diretto adesso"*. Quindi il piano commerciale resta scritto,
verificato, e in attesa.

---

## Cosa è parcheggiato

**Monetizzazione**
- Prezzo consumer (€7,99–8,99/mese, annuale €79) · mese gratis · abbonamento a strati
- Prezzo professionista (€29/mese, TBC)
- Hard paywall vs trial di 21 giorni · free tier con tetto duro
- Stripe, IVA, regime OSS oltre i €10.000/anno di vendite UE, partita IVA / SRL

**Canale professionisti**
- 8 chiamate a nutrizionisti / dietisti / personal trainer
- Dashboard professionista, ruolo `professionista`, `pro_client`
- DPA ex art. 28 GDPR, informativa dedicata
- v0 finta: report settimanale mandato a mano

**Crescita**
- Landing page italiana, waitlist, ASO
- Budget marketing per fasi (€0 → €300-500 → €1.000-2.000)
- CAC misurato su traffico web (stimato ~€24/pagante contro LTV ~€30)
- App native iOS/Android

**Conformità da lancio commerciale**
- Vercel Pro + Supabase Pro (**obbligatori dal primo euro incassato**)
- Licenza commerciale TMDB (**solo se si incassa**; oggi l'uso gratuito è a posto)
- DPIA formale, eventuale DPO, assicurazione E&O, marchio UE
- Obblighi di trasparenza AI Act art. 50, Codice del Consumo (recesso 14 giorni), EAA

**Affiliazione sui link** *(aggiunto il 7 agosto 2026)*
- Keiko genera link in uscita (Booking/hotel, biglietti, Amazon per gli
  ingredienti del ricettario): tecnicamente basta un parametro di affiliazione.
- Chi NON paga: Spotify, YouTube, TikTok, JustWatch — cioè i link più frequenti.
- Con ~5 utenti rende centesimi al mese; richiede disclosure agli utenti; e
  incrina la bussola («link diretto» funziona perché è nell'interesse di chi
  usa, non di chi guadagna sul click).
- Si riapre con lo stesso criterio di tutto il resto: attivi a 30 giorni, novembre.

**Soglie e criteri di kill**
- Le 13 soglie decisionali con date (report, capitolo 12)
- D30 ≥30% · ≥25 paganti non-amici · churn ≤10% · ecc.

---

## I numeri che restano veri (per quando servirà)

| Cosa | Valore |
|---|---|
| Pool contendibile in Italia, **tutti i verticali sommati** | 14.000–43.000 persone = €1,4–4,1 mln/anno |
| Paganti per €1.000 / €3.000 / €10.000 netti al mese | 209 / 609 / 2.008 (a €7,99, margine €5,00) |
| Churn mensile mediano app in abbonamento | 16,8% → vita media 6 mesi |
| Conversione freemium vs hard paywall | 2,1% vs 10,7% |
| App che arrivano a $10k MRR entro 2 anni | 4,6% |
| Costo cattura su Haiku 4.5 + caching | ~€0,005 |
| Take reale su €7,99 dopo IVA 22% e Stripe | 76,6% |

Fonti e ricostruzioni complete nel report **"Keiko — Analisi di mercato e fattibilità di
commercializzazione"** (3 agosto 2026, 31 pagine) e nel cruscotto interattivo allegato.

---

## Cosa riaprirebbe il discorso

Non una data. Un numero, guardato al checkpoint di novembre:

> **Persone attive a 30 giorni.**

Se un gruppo di persone che non ti devono niente continua a usare Keiko dopo un mese,
quella è la validazione che nessuna ricerca di mercato può produrre. Da lì si riapre
questo file **da una posizione di forza**, non da una scommessa.

---

# Parte seconda · i difetti visti e rimandati

> Aggiunta il **18 agosto 2026**. Sopra c'è quello che il progetto non fa per
> scelta di strategia; qui sotto quello che il codice fa male e che si è deciso
> di non correggere adesso. Stesso file per la stessa ragione: esistono senza
> occupare posto.

## I `catch` morbidi rimasti (ricognizione del 18 agosto 2026)

Su 173 `catch` di `lib/` e `app/api/`, 51 restituiscono un valore che assomiglia
a una risposta legittima. I **cinque gravi** sono chiusi (i due cron delle
notifiche, la ricerca che diceva «nessuna», la mina di `unstable_cache`, le tre
letture che mostravano il vuoto). Questi restano, in ordine di quanto pesano:

- **`lib/supabase.ts` · `getOnboardedAt() → null`** — con la lettura caduta si
  rifà l'onboarding a chi l'ha già fatto. La scelta è **dichiarata nel commento**
  («meglio di una home muta») e regge: aspetta perché il rimedio vero è
  distinguere «non letto» da «mai fatto», e cambia una schermata d'ingresso.
- **`lib/supabase.ts:1385` · eventi dei battiti `→ []`** — nessun battito
  compare. Un battito che non parte è invisibile per definizione, quindi non ci
  si accorge della differenza fra «non c'era niente da dire» e «lettura caduta».
- **`lib/event-enrich.ts:47/63/92` → null** — l'arricchimento salta in silenzio e
  l'evento resta spoglio: sembra un evento povero, non un guasto.
- **`lib/films.ts:197` → []` su JSON non valido** — il consiglio esce vuoto e
  sembra «non ho trovato film».
- **`lib/supabase.ts:1152` · `setWatchProgress() → false`** — il guasto arriva al
  chiamante (`app/api/watch/progress/route.ts:91` lo guarda), ma `false` vuol
  dire anche «riga non trovata»: due fatti, una risposta.

🚫 **Non sono difetti** e non entrano in questo elenco: i venticinque `null` di
foto e decorazioni (`unsplash`, `tmdb`, `spotify`, `google-places`, `sportsdb`,
`wger`, `place-image`). Lì `null` significa onestamente «niente immagine» e
l'interfaccia ha già il suo ripiego.

---

## Il giro finale dei tre vuoti

`getRecipes`, `getShoppingItems` e `getUpcomingTickets` adesso tornano **`null`
quando la lettura cade** e `[]` quando è vuoto davvero (18 agosto 2026). Il dato
è distinguibile; **le frasi da mostrare non sono ancora scritte**. I punti dove
il nuovo stato arriva e non viene gestito sono marcati nel codice con
`⚠️ GUASTO NON GESTITO`, e si trovano con:

    grep -rn "GUASTO NON GESTITO" app lib

Sono sei, e vanno riscritti insieme perché sono la stessa frase detta in sei
posti: la Home che direbbe «giornata libera», la Cucina che direbbe «il
ricettario è vuoto» e «la spesa è vuota», la rotta dei passi che direbbe
«ricetta non trovata», e le due che passano un'agenda vuota a chi deve
consigliare.

---

## Il gradino ⑤ del ricettario

L'audio dei video (`docs/SPEC-RICETTARIO.md` §3). Parcheggiato di proposito: la
misura che dice quanto serve è stata fatta su un codice difettoso — con la
didascalia tagliata a 200 caratteri arrivavano al video 2 video su 8, e con la
didascalia intera il numero non lo sappiamo ancora. Si riprende quando ci sono
venti ricette vere da guardare invece di otto.

---

## Il gradino ② del ricettario — il commento sotto al video

**Chiuso per costruzione, non per mancanza di dati** (20 agosto 2026).

L'idea era: molti creator mettono la ricetta completa nel commento fissato,
perché la didascalia è corta. `commentThreads.list` funziona — chiave abilitata,
HTTP 200, un elenco costa 1 unità su 10.000 al giorno. Misurato su **18 video**
(i due del ricettario più sedici presi da due ricerche vere), guardando i primi
venti commenti per rilevanza e cercando anche quelli del creator:

- video senza passi in didascalia: **18**
- di questi, con un commento del creator: **4**
- con un commento che contiene i passi: **0**

**Il perché, ed è il motivo per cui non migliorerà con più dati**: il commento
fissato esiste perché su TikTok e Instagram la didascalia è corta. Su YouTube la
descrizione è praticamente illimitata, quindi il creator ci mette la ricetta o il
link al suo sito — e quel link lo prende già il gradino ①bis (6 su 16 nella
stessa misura, zero modelli). Il ② si può chiamare **solo dove serve meno**: sulle
due piattaforme dove servirebbe, la pagina non è servita a un server, e quello è
già misurato e chiuso.

Quindi la scala è **① → ①bis → ③ → ④**, e il ② non esiste. La chiave YouTube
resta com'è: `videos.list` la usa per prendere cinquanta didascalie in una
richiesta sola, ed è quella che rende sostenibile filtrare tutti i risultati
invece dei primi dodici.

---

## Due limiti di Viaggi · il documento caricato da fuori (27 agosto 2026)

- **Il verbatim del PDF/immagine è provato su ~1100 parole, non su un documento lungo**: non sappiamo se a 5000 parole il modello inizia a tagliare invece di trascrivere tutto.
- **L'offline (PARTE 1.3) funziona perché nel collaudo JS e CSS erano già nella cache HTTP normale del browser**: non c'è un precache degli asset — dopo giorni offline la pagina potrebbe aprirsi dalla cache del service worker ma restare senza interattività.
- **Il doppione fra documenti (28 agosto 2026) non regge se l'agenzia manda una versione aggiornata dello stesso programma**: l'hash del file e del testo sono diversi (è un documento diverso davvero), quindi passano entrambi i controlli, e la fusione "di sostanza" prende solo i pezzi rimasti identici — il risultato è un misto fra fatti fusi (invariati) e fatti duplicati (cambiati). Non risolto: servirebbe riconoscere "stessa fonte, versione nuova" invece di "stesso fatto", ed è un problema diverso da quello di oggi.
- **Gli hotel multi-notte possono restare doppi sulle notti successive alla prima** (29 agosto 2026, trovato collaudando due estrazioni dello stesso documento): un'estrazione ripete il fatto "hotel" su ogni notte, un'altra lo scrive una sola volta all'arrivo — la prima notte si fonde (stesso giorno), le successive no (un'estrazione non ha nessun fatto quel giorno con cui confrontarsi). Non è un difetto della fusione: è incoerenza fra due estrazioni dello stesso contenuto, che con l'hash riparato non dovrebbe più potersi creare. Non si allargano i criteri per inseguirlo.
- **Il `text_hash` fra due estrazioni diverse è best-effort per natura, non per svista** (28-29 agosto 2026): confronta il testo di mammoth (deterministico, da un `.docx`) con la trascrizione di un modello (da un PDF/immagine), e un modello non è un secondo mammoth — non promette di riprodurre lo stesso testo carattere per carattere, promette di leggerlo bene. Oggi le due differenze trovate erano sistematiche (virgolette tipografiche, spazi intorno a un trattino a un a-capo) e le abbiamo normalizzate via. Domani una trascrizione può inserire un numero di pagina, ripetere un'intestazione, spezzare una parola in un punto diverso — e il digest non combacerà più. **Non è un guasto quando succede**: sotto c'è la fusione di sostanza (`classificaSostanza`), che prende il doppione lo stesso guardando giorno, tipo, luogo e le parole del titolo. Chi ritrova due documenti non fusi fra loro non deve rincorrere un altro caratterino da normalizzare: deve prima controllare se la fusione di sostanza li ha comunque presi.
