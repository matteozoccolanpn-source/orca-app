# Keiko — Informativa privacy (bozza tecnica)

> **Cos'è questo documento.** Una bozza costruita sui fatti tecnici reali di Keiko:
> quali dati esistono davvero nel database, dove girano, chi li tocca. La struttura e i
> contenuti tecnici sono verificati; **la valutazione giuridica e la stesura finale sono tue.**
> Le parti da completare sono marcate `[DA COMPLETARE]`.
>
> Versione: bozza 1 · 4 agosto 2026 · Contesto: prova privata con un piccolo gruppo di persone.

---

## ⚠️ Le tre decisioni che devi prendere prima di pubblicarla

**1. La base giuridica.** Due strade:

- **(A) Consenso per tutto** — art. 6.1.a per i dati comuni + art. 9.2.a (consenso esplicito) per i dati sanitari. È la più lineare per una prova gratuita fra conoscenti, ed è quella su cui è scritta questa bozza. Contro: il consenso è revocabile in qualsiasi momento e da lì devi fermarti.
- **(B) Contratto + consenso** — art. 6.1.b per le funzioni base (esegui il servizio che l'utente ti chiede) + art. 9.2.a per dieta, allergie e infortuni. Più solido se un domani il servizio diventa a pagamento.

**2. Il titolare.** Oggi sei tu come persona fisica. Va indicato con nome, cognome e un contatto (una email dedicata, non quella personale di sempre).

**3. Il perimetro dei dati sanitari.** Piano alimentare, allergie, infortuni, obiettivi di peso e log degli allenamenti sono, nella lettura del Garante sui fitness tracker, **dati relativi alla salute**. Questa bozza li tratta come art. 9. Se decidi diversamente su qualcuna di queste voci, va motivato e scritto.

---

## 1. Chi tratta i tuoi dati

**Titolare del trattamento:** `[DA COMPLETARE: nome e cognome]`
**Contatto:** `[DA COMPLETARE: email dedicata]`

Keiko è un progetto personale, non un servizio commerciale. Non c'è una società dietro, non c'è pubblicità, e i dati non vengono venduti né ceduti a terzi per finalità di marketing.

**Responsabile della protezione dei dati (DPO):** non nominato. `[VERIFICA TU: l'art. 37.1.c lo impone quando le attività principali consistono nel trattamento su larga scala di dati art. 9. Con un piccolo gruppo di utenti in prova gratuita l'esclusione è sostenibile, ma la valutazione va fatta e documentata.]`

---

## 2. Quali dati trattiamo

### 2.1 Dati che fornisci creando l'account
- Indirizzo email e nome, ricevuti da Google al momento dell'accesso
- Un identificativo interno derivato in modo deterministico dall'email

### 2.2 Dati che inserisci usando l'app
- **Eventi e prenotazioni**: titolo, tipo, data e ora, luogo, riferimenti di prenotazione, note. Provengono da screenshot, testo libero, PDF o, in futuro, email che tu inoltri
- **Attività e promemoria**: cose da fare, orari, stato
- **Viaggi**: destinazioni, date, itinerari
- **Contenuti da vedere**: film e serie salvati

### 2.3 Dati relativi alla salute (art. 9 GDPR) 🔒
- **Piano alimentare**: pasti, alimenti, quantità, il nome del professionista che lo ha redatto se lo indichi
- **Vincoli alimentari**: allergie, intolleranze, preferenze
- **Allenamento**: schede, esercizi, carichi, serie, ripetizioni, sensazioni, storico delle sessioni
- **Profilo fisico**: obiettivi, livello, frequenza di allenamento, infortuni o limitazioni che dichiari

Questi dati sono trattati **solo sulla base del tuo consenso esplicito**, che puoi revocare in qualsiasi momento.

### 2.4 Dati tecnici
- Sottoscrizione alle notifiche push (identificativo del browser, chiavi di cifratura del canale)
- Città indicata nel profilo, per il meteo
- Conteggio delle operazioni con intelligenza artificiale, per limitarne i costi

### 2.5 Cosa NON trattiamo
- Nessun dato di pagamento: il servizio è gratuito
- Nessun dato di geolocalizzazione continua
- Nessuna rubrica, nessun contatto del tuo telefono
- Nessun accesso alla tua casella di posta: se un giorno userai l'inoltro email, saremo noi a ricevere solo i messaggi che tu decidi di inoltrare
- Nessuna profilazione a fini pubblicitari

---

## 3. Perché li trattiamo

| Finalità | Base giuridica |
|---|---|
| Farti usare l'app: salvare, mostrare e organizzare i tuoi eventi, attività e viaggi | Consenso — art. 6.1.a `[oppure contratto, art. 6.1.b: scegli]` |
| Trasformare screenshot, testi e PDF in dati strutturati tramite intelligenza artificiale | Consenso — art. 6.1.a |
| Gestire piano alimentare, allenamento e vincoli di salute | **Consenso esplicito — art. 9.2.a** |
| Inviarti promemoria e notifiche sugli impegni che hai salvato | Consenso — art. 6.1.a |
| Limitare i costi e prevenire abusi (conteggio operazioni) | Legittimo interesse — art. 6.1.f |
| Sicurezza dell'applicazione e diagnostica tecnica | Legittimo interesse — art. 6.1.f |

**Non c'è alcun processo decisionale automatizzato che produca effetti giuridici o incida in modo analogo significativo sulla tua persona.** Le proposte dell'app sono suggerimenti: nessuna azione viene compiuta senza una tua conferma.

---

## 4. Interazione con l'intelligenza artificiale

Keiko usa modelli di intelligenza artificiale di **Anthropic** (famiglia Claude) per leggere ciò che carichi — screenshot, testi, PDF — e trasformarlo in eventi, piani e attività.

- **Stai interagendo con un sistema di intelligenza artificiale.** Le risposte e i contenuti generati sono prodotti automaticamente e possono contenere errori: vanno sempre verificati (informazione resa ai sensi dell'art. 50 del Regolamento UE 2024/1689 — AI Act)
- I dati che invii al modello **non vengono usati per addestrarlo**: l'uso via API commerciale esclude l'addestramento per impostazione predefinita
- **Keiko non elabora piani alimentari.** Digitalizza e rende eseguibile il piano redatto dal tuo professionista sanitario. Ogni indicazione nutrizionale o di allenamento presente nell'app ha finalità di semplice organizzazione personale e **non costituisce consulenza medica, dietetica o sanitaria**

---

## 5. Dove stanno i dati e chi li tratta per noi

| Fornitore | Cosa fa | Dove | Trasferimento extra-UE |
|---|---|---|---|
| **Supabase** | Database e archiviazione | Unione Europea (Svezia) | No |
| **Vercel** | Hosting dell'applicazione | Stati Uniti / rete globale | Sì — clausole contrattuali standard |
| **Anthropic** | Elaborazione con intelligenza artificiale | **Dati archiviati negli Stati Uniti** | Sì — clausole contrattuali standard (moduli 2 e 3) e certificazione EU-US Data Privacy Framework |
| **Google** | Autenticazione (accesso con Google) | Stati Uniti / UE | Sì — clausole contrattuali standard |
| **Google Maps Platform** | Foto dei luoghi | Stati Uniti | Sì |
| **OpenWeather** | Meteo (solo il nome della città) | UE / Stati Uniti | Sì |
| **TMDB** | Dati su film e serie (nessun dato personale) | Stati Uniti | Non pertinente |
| `[DA COMPLETARE: servizio di scheduling usato per le notifiche]` | Avvio dei promemoria programmati | | |

> ⚠️ **Nota importante e da scrivere con precisione.** Il database è in Unione Europea, ma **l'elaborazione con intelligenza artificiale avviene su infrastruttura Anthropic con archiviazione negli Stati Uniti**. Non è corretto affermare che "tutti i dati restano in Europa". Anthropic offre residenza dei dati europea solo tramite piattaforme cloud terze, con disponibilità annunciata ma non ancora attiva. Il trasferimento è legittimo tramite clausole contrattuali standard e certificazione DPF, ma va dichiarato per quello che è.

---

## 6. Per quanto tempo

- I dati restano finché usi Keiko
- Puoi **cancellare tutto** in qualsiasi momento dalle impostazioni: la cancellazione è immediata e definitiva
- Se non accedi per `[DA COMPLETARE: es. 12 mesi]`, ti scriviamo e, in assenza di risposta, cancelliamo l'account e i dati
- I backup del database sono conservati per `[DA COMPLETARE: verifica la retention del piano Supabase in uso]`

---

## 7. I tuoi diritti

Puoi in qualsiasi momento:

- **Accedere** ai tuoi dati e ottenerne copia (art. 15)
- **Correggerli** se sono sbagliati (art. 16)
- **Cancellarli** tutti, con il pulsante in app o scrivendoci (art. 17)
- **Limitarne** il trattamento (art. 18)
- **Portarli altrove** in un formato leggibile da una macchina (art. 20)
- **Opporti** ai trattamenti fondati sul legittimo interesse (art. 21)
- **Revocare il consenso** in qualsiasi momento, senza che questo pregiudichi la liceità di quanto fatto prima (art. 7.3)

Per esercitarli: `[DA COMPLETARE: email]`. Rispondiamo entro un mese.

Hai inoltre diritto di **proporre reclamo al Garante per la protezione dei dati personali** (www.garanteprivacy.it) o all'autorità del tuo Stato di residenza.

---

## 8. Sicurezza

- Accesso solo tramite account Google: nessuna password conservata da noi
- **Isolamento dei dati a livello di database**: ogni utente può leggere e scrivere solo le proprie righe, e la regola è applicata dal database stesso, non solo dal codice dell'applicazione
- Comunicazioni cifrate in transito
- Le chiavi dei servizi esterni restano sul server e non sono mai esposte al browser

---

## 9. Minori

Keiko non è destinata a persone di età inferiore a 18 anni e non ne raccoglie consapevolmente i dati.

---

## 10. Modifiche

Questa informativa può cambiare. Le modifiche rilevanti ti saranno comunicate nell'app prima che diventino efficaci.

**Ultimo aggiornamento:** `[DATA]`
