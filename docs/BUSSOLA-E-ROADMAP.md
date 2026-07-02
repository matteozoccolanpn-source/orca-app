# Keiko — Bussola e Roadmap

> Documento vivo. È la nostra bussola: quando un'idea o una feature non è chiara,
> si torna qui e si controlla se rispetta la filosofia. Scritto in italiano semplice,
> aggiornato il 2026-07-02.

---

## 0. Fatti correnti del progetto (per non ripartire da dati vecchi)

Alcune istruzioni e doc vecchi dicevano cose non più vere. La verità di oggi:

- **Nome del prodotto: Keiko** ("Il calendario della tua vita"). "OrCa" sopravvive solo
  come placeholder in `app/design-test/page.tsx` — non è il prodotto.
- **Database: Supabase.** `lib/airtable.ts` è codice morto, resta solo per lo script di
  migrazione (`scripts/migrate-airtable-to-supabase.ts`). In `app/` non è più importato.
- **Modello: `claude-sonnet-4-5`**, chiamato via `fetch` diretto all'API Anthropic in
  `app/api/upload/route.ts` (nessuno strumento attivo: no web search, no memoria).
- **Input a testo libero: già esistente.** `/api/upload` accetta sia `image` che `text`
  (branch `IMAGE_PARSE_PROMPT` / `TEXT_PARSE_PROMPT`). Il vecchio "obiettivo unico"
  delle istruzioni è già fatto.
- **Keiko non è un ticket-parser.** Domini attivi: eventi/biglietti, **dieta**,
  **allenamento**, **salute**, più push notifications, PWA, login.
- Tipi evento oggi: train, flight, concert, hotel, museum, restaurant (schema `Ticket`).

> ⚠️ Le **istruzioni Cowork del progetto** (fuori dal repo) dicono ancora OrCa/Airtable.
> Le deve aggiornare Matteo a mano: io non posso editarle da qui.

---

## 1. La bussola (filosofia del prodotto)

**Keiko non compete con Claude, ChatGPT o Google. Fa una cosa sola: mette tutto in un
unico posto e semplifica la vita.**

Conseguenze pratiche di questa frase (sono regole, non slogan):

1. **Non ricreiamo un motore di ricerca né una chat generica.** Se una cosa la fa già
   bene Google/Claude, noi non la rifacciamo: la colleghiamo.
2. **Niente prezzi finti da vetrina.** Un prezzo salvato oggi domani è sbagliato, e tanto
   l'utente entra comunque nel sito. Quindi per il commerciale (hotel, voli, biglietti)
   diamo il **link diretto**, non un numero che invecchia.
3. **Il valore è togliere fatica, non aggiungere informazioni.** "Non dover aprire otto
   app" vale più di "sapere il prezzo esatto".
4. **"Forzare" = affezionare, non chiudere le porte.** Le persone restano su Keiko perché
   più lo usano più diventa loro (vedi §3, profilo utente), non perché non possono uscire.

---

## 2. Roadmap (ordine aggiornato)

Gli step originali di Matteo, con **due correzioni di ordine** decise insieme:

1. **Pianificatore da input frammentari (itinerari dagli incastri).** Vedi
   `SPEC-PIANIFICATORE.md`. È la feature più distintiva ("il pezzo tuo"). Si costruisce
   a fette per non impantanarsi.
2. **Sistemazione delle funzionalità attuali** (cose che non vanno, una per una).
3. **UI completa** (Matteo studia in parallelo; si affronta quando ci si arriva).
4. **Privacy totale.** → **SPOSTATO PRIMA del test amici.** Motivo sotto.
5. **Login personale + personalizzazione profilo.**
6. **Ritocchi finali PWA.**
7. **Test con amici/fidanzata.**
8. *(nuovo, dopo la privacy)* **Tabella personalità/preferenze utente** (vedi §3).

### Perché privacy prima del test amici

Al test (step 7) metti dati di **altre persone** dentro Supabase. Se privacy e login
multi-utente non ci sono già, o non fai davvero il test, o rifai mezze cose dopo. Privacy
e login sono **fondamenta**, non rifiniture finali.

### Dove siamo a fine step 7 (risposta onesta)

A fine step 7, se tutto si incastra, sei a un **MVP personale solido, testato da 3-4
persone fidate. Non a un prodotto lanciabile — e va benissimo così.** Hai un'app che usi
ogni giorno, che regge l'uso di altri senza rompersi, con privacy e login veri e il primo
feedback reale. Il salto a "prodotto" (multi-tenant scalabile, onboarding per estranei,
gestione costi sotto carico) è lo step 8+ ancora da scrivere.

---

## 3. Il profilo utente (moat, da fare DOPO la privacy)

Idea: a ogni incastro, Keiko accumula in Supabase un **profilo di preferenze** dell'utente
(es. viaggia in coppia, evita il caldo, budget medio, ama i musei). È la **Fase 3 del PDF**
("modella l'utente turno dopo turno") resa permanente. È il vero motivo per cui le persone
torneranno: più usano Keiko, più i piani escono su misura senza richiedere nulla.

Paletti (decisi insieme):

- **Va DOPO la privacy (step 4), prima dello step 8.** Tratti dedotti su una persona sono
  dato più sensibile dei biglietti: non si mette in un DB prima di aver sistemato la privacy.
- **Deve essere leggibile e correggibile, non una scatola nera.** L'utente vede "Keiko pensa
  che: coppia, eviti il caldo, budget medio" e può correggere (come lo swap-ingredienti
  della dieta). Vantaggi: privacy-friendly, più accurato, e in stile "leggi → capisci".
- **Per la v1 è uno stub**: raccoglie segnali e basta. L'intelligenza (usare il profilo per
  personalizzare i piani) si accende quando l'itinerario base funziona.

---

## 4. Come lavoriamo (metodo)

- Modalità "leggi → capisci → modifica": modifiche piccole e mirate, spiegate in italiano
  semplice; si preferisce la soluzione più semplice a quella più furba.
- Non si rifattorizzano file non collegati al task.
- `npm run build` deve passare prima di ogni commit.
- **Non si committa finché Matteo non dà l'ok.**
