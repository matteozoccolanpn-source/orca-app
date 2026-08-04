# Keiko — Registro delle attività di trattamento (art. 30 GDPR)

> **Perché è obbligatorio.** L'esonero dell'art. 30.5 per le realtà sotto i 250 dipendenti
> **non si applica** quando il trattamento include categorie particolari di dati ex art. 9.
> Keiko tratta piano alimentare, allergie e infortuni: il registro è dovuto, anche per un
> titolare persona fisica che lavora da solo.
>
> Bozza al 4 agosto 2026. Le parti `[DA COMPLETARE]` sono tue.

---

## Titolare

| | |
|---|---|
| Titolare | `[DA COMPLETARE: nome, cognome, codice fiscale]` |
| Contatto | `[DA COMPLETARE: email dedicata]` |
| DPO | Non nominato — `[valutazione art. 37.1.c da documentare]` |
| Rappresentante UE | Non applicabile (titolare stabilito in Italia) |

---

## T1 — Gestione dell'account

| Voce | Contenuto |
|---|---|
| **Finalità** | Consentire l'accesso e identificare l'utente |
| **Categorie di interessati** | Persone invitate a provare Keiko |
| **Categorie di dati** | Email, nome, identificativo interno |
| **Base giuridica** | Art. 6.1.a consenso `[o 6.1.b contratto]` |
| **Destinatari** | Google (autenticazione), Supabase (database), Vercel (hosting) |
| **Trasferimenti extra-UE** | Google e Vercel — Stati Uniti, clausole contrattuali standard |
| **Conservazione** | Fino a cancellazione dell'account |
| **Misure di sicurezza** | OAuth Google (nessuna password conservata), isolamento per utente applicato dal database, cifratura in transito |

---

## T2 — Organizzazione di eventi, attività e viaggi

| Voce | Contenuto |
|---|---|
| **Finalità** | Salvare, strutturare e mostrare eventi, prenotazioni, cose da fare e viaggi |
| **Categorie di dati** | Titoli, date e orari, luoghi, riferimenti di prenotazione, note, contenuti di screenshot, testi e PDF caricati dall'utente |
| **Base giuridica** | Art. 6.1.a consenso `[o 6.1.b contratto]` |
| **Destinatari** | Supabase, Vercel, **Anthropic** (elaborazione AI del contenuto caricato), Google Maps Platform (foto dei luoghi), OpenWeather (meteo per città) |
| **Trasferimenti extra-UE** | **Anthropic — dati archiviati negli Stati Uniti**, clausole contrattuali standard (moduli 2 e 3) e certificazione EU-US Data Privacy Framework. Vercel e Google — Stati Uniti, clausole contrattuali standard |
| **Conservazione** | Fino a cancellazione |
| **Note** | ⚠️ Gli screenshot caricati dall'utente possono contenere dati di terzi (nomi di compagni di viaggio, indirizzi). L'utente ne è informato e resta responsabile di ciò che carica |

---

## T3 — Piano alimentare e vincoli di salute 🔒 **CATEGORIA PARTICOLARE**

| Voce | Contenuto |
|---|---|
| **Finalità** | Digitalizzare il piano redatto da un professionista sanitario e renderlo eseguibile giorno per giorno |
| **Categorie di dati** | **Dati relativi alla salute (art. 9)**: piano alimentare, alimenti, quantità, allergie, intolleranze, obiettivi di peso, nome del professionista se indicato |
| **Base giuridica** | **Art. 9.2.a — consenso esplicito**, raccolto separatamente e revocabile |
| **Destinatari** | Supabase, Vercel, **Anthropic** (lettura del PDF e strutturazione) |
| **Trasferimenti extra-UE** | Anthropic — Stati Uniti, SCC + DPF |
| **Conservazione** | Fino a revoca del consenso o cancellazione dell'account; **cancellazione immediata alla revoca** |
| **Misure di sicurezza** | Isolamento per utente a livello di database; accesso con la sola chiave anonima limitato dalle policy; nessuna condivisione con altri utenti per impostazione predefinita |
| **DPIA** | `[DA DECIDERE: vedi sotto]` |

---

## T4 — Allenamento e tracciamento 🔒 **CATEGORIA PARTICOLARE**

| Voce | Contenuto |
|---|---|
| **Finalità** | Gestire la scheda, registrare le sessioni e i progressi |
| **Categorie di dati** | **Dati relativi alla salute (art. 9)**: infortuni, limitazioni, livello, carichi, serie, ripetizioni, storico delle sessioni |
| **Base giuridica** | **Art. 9.2.a — consenso esplicito** |
| **Destinatari** | Supabase, Vercel, Anthropic |
| **Trasferimenti extra-UE** | Anthropic — Stati Uniti, SCC + DPF |
| **Conservazione** | Fino a revoca o cancellazione |

---

## T5 — Notifiche push

| Voce | Contenuto |
|---|---|
| **Finalità** | Inviare promemoria sugli impegni salvati dall'utente |
| **Categorie di dati** | Identificativo della sottoscrizione push, chiavi del canale, orari e preferenze |
| **Base giuridica** | Art. 6.1.a consenso |
| **Destinatari** | Servizio push del browser (Google, Apple, Mozilla), `[DA COMPLETARE: servizio di scheduling]` |
| **Conservazione** | Fino a revoca o cancellazione |
| **Note** | ⚠️ Il contenuto della notifica può includere dati di salute ("oggi gambe", "pranzo pollo e quinoa") e appare sulla schermata di blocco. Valutare se rendere il contenuto generico un'opzione |

---

## T6 — Controllo dei costi e sicurezza

| Voce | Contenuto |
|---|---|
| **Finalità** | Contare le operazioni con AI per limitare la spesa e prevenire abusi |
| **Categorie di dati** | Identificativo utente, numero di operazioni, token consumati, data |
| **Base giuridica** | Art. 6.1.f legittimo interesse |
| **Valutazione del bilanciamento** | Impatto minimo (nessun contenuto, solo conteggi), interesse concreto (sostenibilità economica del progetto) |
| **Conservazione** | `[DA COMPLETARE: es. 12 mesi]` |

---

## La DPIA: da decidere e motivare ⚠️

L'elenco del Garante (provv. 467/2018) impone la valutazione d'impatto per i trattamenti **su larga scala** di dati sanitari e per quelli che usano **tecnologie innovative** in combinazione con dati particolari.

Due letture, entrambe sostenibili, ma **la scelta va scritta e datata**:

- **DPIA non necessaria**: un piccolo gruppo di persone in prova gratuita non è "larga scala" secondo i criteri WP248 (numero di interessati, volume, durata, ambito geografico)
- **DPIA opportuna comunque**: c'è la compresenza di due criteri — dati art. 9 **e** uso di intelligenza artificiale — e il Garante precisa che la compresenza di due o più criteri la impone

**Raccomandazione pratica**: farla in forma leggera adesso, quando il perimetro è piccolo e la conosci a memoria, invece che sotto pressione quando gli utenti saranno cinquanta. Ti serve comunque il giorno in cui volessi parlare con un professionista sanitario.

---

## Da rivedere quando

- Entra il primo utente che non conosci personalmente
- Il numero di utenti supera `[DA COMPLETARE: soglia che ti dai]`
- Si aggiunge un canale di ingresso nuovo (email-in) o un fornitore nuovo
- Si introduce la condivisione fra utenti
- Il servizio diventa a pagamento
- Anthropic attiva la residenza dei dati europea (cambia la sezione trasferimenti)
