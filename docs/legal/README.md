# Keiko — Cartella legale: stato e decisione

> **Decisione del 4 agosto 2026: lavoro sospeso.**
> Non perché non serva, ma perché oggi è sproporzionato al rischio.
> Qui sotto: perché, cosa resta comunque da fare, e cosa lo riaccende.

---

## La situazione di oggi

- **5 persone al massimo** nel prossimo mese, tutte amici e familiari, invitate a mano
- Nessuna registrazione aperta, nessun pagamento, nessuna finalità commerciale
- Ognuno di loro sa chi è Matteo e cosa sta provando

In questo perimetro c'è un argomento serio per l'**esenzione domestica** (art. 2.2.c GDPR):
attività a carattere esclusivamente personale, cerchia chiusa di conoscenti, nessuna diffusione.
L'argomento non è granitico — il considerando 18 dice che il Regolamento si applica a chi
*fornisce i mezzi* per attività personali, e qui i mezzi li fornisce Matteo — ma con cinque
persone consenzienti che si conoscono di persona, il rischio concreto è teorico.

**Quindi**: il pacchetto formale (informativa pubblicata, consensi tracciati, registro tenuto,
DPIA, email dedicata) resta scritto e pronto in questa cartella, e si attiva quando serve.

---

## Il pavimento — cosa si fa comunque, adesso

Non è burocrazia: è il minimo per non fare figure e non fare danni.

- [ ] **Dirlo a voce.** Un messaggio a ciascuno prima che entri: cosa salvo, dove sta, che è
      una prova, che possono chiedermi di cancellare tutto quando vogliono. Cinque minuti,
      ed è il 90% della sostanza con lo 0% della forma
- [ ] **Il pulsante "cancella tutti i miei dati"** (K4). Non per il GDPR: perché se qualcuno
      chiede di sparire, deve sparire in cinque secondi, non con una query SQL
- [ ] **Le quattro DPA con i fornitori** — Supabase, Vercel, Anthropic, Google. Sono gratuite,
      standard, e vanno accettate attivamente: non sono automatiche con l'iscrizione. Mezz'ora,
      e valgono a prescindere dal numero di utenti
- [ ] **Mai generare diete personalizzate** (art. 348 c.p.). Non dipende dal numero di utenti:
      vale con 5 come con 5.000

### Sulla sostituzione degli alimenti — la zona grigia, e come starne fuori

Digitalizzare il piano ✅ · far scegliere fra le alternative scritte dal professionista ✅ ·
**sostituire un alimento con uno equivalente non previsto nel piano ⚠️** · generare il piano ❌

Il terzo caso è quello che Keiko fa oggi. Cinque accorgimenti lo spostano dalla parte giusta:

1. **Prima le alternative del professionista.** Se il PDF ha opzioni A/B/C, usa quelle. Calcola
   solo quando non ce ne sono
2. **Proposta, non prescrizione**: Keiko propone, l'utente conferma. La scelta resta sua
3. **Blocco duro sulle allergie dichiarate.** Mai proporre un alimento marcato come allergia
4. **Mostra l'aritmetica**: "stesse calorie, stesse proteine". Trasparente e verificabile
5. **Niente sostituzioni** a chi dichiara patologie o gravidanza

La frase da tenere in testa: **Keiko non decide cosa devi mangiare. Propone un'equivalenza, e tu confermi.**

---

## Cosa riaccende il lavoro

Non una data. Il **primo** di questi eventi:

- Entra una persona che **non conosci di persona**
- Apri la **registrazione a chiunque**
- Non sai più elencare gli utenti **a memoria** (indicativamente oltre 15-20)
- Gira **denaro**, in qualunque forma
- Qualcuno **condivide dati con qualcun altro** dentro l'app
- Arriva un **professionista sanitario** (allora cambia anche il ruolo: lui titolare, Keiko responsabile)

Il primo e l'ultimo sono decisivi: lì l'argomento "cerchia personale" cade del tutto.

---

## Cosa c'è in questa cartella

| File | Cosa contiene | Stato |
|---|---|---|
| `INFORMATIVA-PRIVACY.md` | Bozza completa, con i fatti tecnici verificati (dove stanno i dati, chi li tratta, trasferimenti extra-UE) | pronta, **da rifinire e pubblicare** |
| `CONSENSO-E-DISCLAIMER.md` | I testi che l'utente legge davvero, nella voce di Keiko + le frasi da non usare mai | pronta |
| `REGISTRO-TRATTAMENTI.md` | Registro art. 30 con i 6 trattamenti reali di Keiko + la decisione sulla DPIA | pronta |

### Lavori in sospeso dentro i file

- **Tono della schermata di benvenuto**: la versione nel file suona come una scusa
  ("ci lavoro nei ritagli di tempo"). Va sostituita con la riscrittura concordata il 4/8,
  più sicura di sé: *"Sei fra i primi a provarla, e ci tengo che tu sappia come funziona."*
- **Terza casella** — consenso facoltativo alle novità del prodotto **via email**, e relativo
  trattamento T7 nel registro. Attenzione: sono comunicazioni *di servizio*, non commerciali.
  Il giorno in cui si promuove un abbonamento, la finalità cambia e il consenso va richiesto di nuovo
- **Nota sui backup**: la cancellazione dal database è immediata, ma i backup conservano i dati
  per il periodo di retention del piano. "Definitivo per sempre" va scritto con precisione
- **Le tre decisioni aperte** in cima all'informativa: base giuridica, dati del titolare,
  perimetro dei dati art. 9

### Struttura corretta della schermata iniziale (per quando si farà)

Una schermata sola, a strati:

```
Benvenuto in Keiko
[testo breve, leggibile — mai carattere piccolo: l'art. 12 chiede
 forma concisa, trasparente e facilmente accessibile]
[ Informativa completa ]  ← link, secondo strato

☐ Acconsento al trattamento dei dati di salute
☐ Avvisami per email quando c'è qualcosa di nuovo

[ Cominciamo ]
```

Note di metodo emerse il 4/8:

- **Informativa ≠ consenso.** L'informativa si rende accessibile, non si "approva". Il consenso
  è un atto positivo separato, granulare, non pre-spuntato
- La **vessatorietà** (artt. 33-34 Cod. Consumo, 1341 c.c.) non c'entra con l'informativa:
  riguarda le clausole contrattuali. Tornerà rilevante se un giorno ci saranno Termini d'uso
- Il consenso è l'**inizio** degli obblighi, non la fine: prova del consenso, risposta alle
  richieste entro un mese, revoca facile, registro aggiornato, sicurezza, tempi di conservazione,
  DPA, e notifica delle violazioni entro 72 ore **solo se c'è un rischio** (art. 33.1) — se non
  c'è, non si notifica ma si documenta perché
- I disclaimer su Dieta e Allenamento stanno **dentro le sezioni**, sempre visibili, non all'avvio

---

*Ultimo aggiornamento: 4 agosto 2026*
