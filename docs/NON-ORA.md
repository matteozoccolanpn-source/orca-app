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
