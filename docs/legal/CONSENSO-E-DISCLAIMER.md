# Keiko — Testi da mostrare all'utente (K2 consenso · K5 disclaimer)

> Questi non sono testi da avvocato: sono i testi che l'utente **legge davvero**,
> scritti nella voce di Keiko (vedi `docs/UI-VOICE.md`). Devono essere veri e completi,
> ma leggibili in trenta secondi. L'informativa completa sta dietro un link.

---

## 1. Schermata di benvenuto — primo accesso

> ### Prima di cominciare
>
> Keiko è un progetto personale, ancora in prova. Te lo dico chiaro, così sai dove metti i piedi.
>
> **Cosa faccio con i tuoi dati**
> Li tengo per organizzarti la settimana. Nient'altro. Nessuna pubblicità, niente rivendita a nessuno, mai.
>
> **Dove stanno**
> Il database è in Europa. Quando leggo uno screenshot o un PDF, però, mi appoggio a un'intelligenza artificiale che gira su server negli Stati Uniti — con le garanzie previste dalla legge europea.
>
> **Che è una prova**
> Ci lavoro nei ritagli di tempo. Può capitare che qualcosa si rompa. Fai conto che i dati non siano garantiti per sempre.
>
> **Non sono un medico**
> Custodisco il piano che ti ha dato il tuo nutrizionista o il tuo allenatore, e ti aiuto a seguirlo. Non lo scrivo io e non do consigli sanitari.
>
> [ Leggi l'informativa completa ]
>
> ☐ **Ho capito e voglio provare Keiko**
> ☐ **Acconsento a che Keiko tratti i miei dati di salute** — piano alimentare, allergie, infortuni, allenamenti. Serve solo se userai Dieta e Allenamento, e puoi togliere il consenso quando vuoi.
>
> [ Cominciamo ]

---

### Regole di implementazione ⚠️

- **Le due caselle sono separate e nessuna è pre-spuntata.** Il consenso ai dati di salute è distinto e facoltativo: senza, l'utente usa l'app senza le sezioni Dieta e Allenamento
- **Registra sempre**: chi ha acconsentito, a cosa, quando, e su quale versione del testo. Serve tabella `consents` (user_id, tipo, versione, timestamp)
- **La revoca deve essere facile quanto il consenso** (art. 7.3): un interruttore nel profilo, non una email da scrivere
- Se cambi il testo, **la versione cambia** e va richiesto di nuovo

---

## 2. Nel profilo — sempre raggiungibile

> ### I tuoi dati
>
> **Consenso ai dati di salute** — attivo dal 12 aprile 2026 [ Revoca ]
> Se lo togli, smetto di trattare piano alimentare e allenamenti. I dati già salvati li cancello.
>
> **Scarica tutto** [ Esporta ]
> Un file con tutto quello che ho di tuo.
>
> **Cancella tutto** [ Elimina il mio account ]
> Sparisce tutto: eventi, piani, allenamenti, notifiche. Non si torna indietro.
>
> [ Informativa privacy ] · [ Come funziona Keiko ]

---

## 3. Disclaimer su Dieta — sopra il piano, sempre visibile

> Il piano è quello del tuo professionista. Io lo tengo in ordine e ti ricordo cosa c'è oggi.
> Non do consigli alimentari e non sostituisco una visita.

**Sulle calorie e i macro:**

> Valori indicativi. Per i numeri veri, chiedi al tuo nutrizionista.

---

## 4. Disclaimer su Allenamento

> La scheda è la tua o quella del tuo allenatore. Io tengo il conto e il tempo.
> Se qualcosa fa male, fermati e senti un professionista.

---

## 5. Sull'intelligenza artificiale — richiesto dall'AI Act (art. 50)

Da mostrare la prima volta che l'utente usa una funzione con AI (cattura, "Chiedi a Keiko", generazione scheda):

> Quello che carichi lo leggo con un'intelligenza artificiale. Ci prende quasi sempre, ma non sempre: dai un'occhiata prima di confermare.

Basta una volta, in modo chiaro. Non serve ripeterlo a ogni schermata.

---

## 6. Frasi da NON usare ⚠️

| ❌ Da evitare | Perché |
|---|---|
| "I tuoi dati restano in Europa" | Falso per l'elaborazione AI: Anthropic archivia negli USA |
| "Keiko ti crea la dieta" | Atto riservato a medici, dietisti e biologi nutrizionisti (art. 348 c.p.) |
| "Dieta personalizzata per te" | Stessa ragione |
| "Ti aiuta a dimagrire / a curare…" | Claim sanitario: sposta il prodotto verso il dispositivo medico |
| "Dati al sicuro al 100%" | Nessuno può prometterlo |
| "L'AI ha analizzato…" | Vietato dalla voce di Keiko, e non serve |

La qualificazione come dispositivo medico dipende dalla **destinazione d'uso dichiarata**, desumibile anche da etichettatura e materiale promozionale. Quindi: attenzione a cosa scrivi, non solo a cosa fa il codice.
