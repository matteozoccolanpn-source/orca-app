# SPEC — L'editoriale di Keiko (Scoperte + Settimanale + onboarding dei gusti)

> 9 agosto 2026. Contenuto che nasce dai TUOI dati e dai TUOI gusti, dentro
> slot editoriali. Tre pezzi di una famiglia sola.
> ⏸ SEQUENZA: si costruisce DOPO il manifesto UI (queste pagine sono i clienti
> perfetti del design nuovo — farle prima = rifarle dopo).

---

## 1 · L'ONBOARDING DEI GUSTI (il seme)

Al primo avvio (dentro K14, come passo nuovo) e sempre rivedibile dal profilo:
**«Cosa ti piace?»** — quattro tappe veloci, TUTTE saltabili:

| Tappa | Come | Fonte |
|---|---|---|
| 🎬 Film & serie | scegli 3-5 tra ~20 poster popolari + generi a chip | TMDB (gratis) |
| 🎵 Musica | scrivi/scegli 3 artisti (autocomplete) | Deezer search (gratis) |
| ⚽ Sport | squadre/sport seguiti, a chip | lista statica |
| 🍝 Cucina | che cucina ti piace, a chip (italiana, asiatica, veloce…) | lista statica |

**Paletti di design:**
- **Massimo 60 secondi percepiti**: 4 schermate, skip enorme, mai obbligatorio.
  Un amico che salta tutto deve entrare comunque — i gusti si imparano anche
  dall'uso (è il profilo della idea 13).
- I poster da toccare (stile Netflix/TV Time) valgono più di mille chip: si
  scelgono con gli occhi, non leggendo.
- Si salva in `profile.tastes` (jsonb): { film: [tmdb_id...], generi: [...],
  artisti: [{nome, deezer_id}...], sport: [...], cucine: [...] }.
- **Trasparenza (idea 151)**: nel profilo, «Cosa sa Keiko dei tuoi gusti» —
  leggibile, modificabile, cancellabile voce per voce.
- Chi c'è già (Matteo): un invito una-tantum in home a fare il giro gusti.

**Cosa nutre da subito:** lo slot Per te (sotto), il consiglio film
(la query si arricchisce coi generi amati), l'interprete di Cucina.

## 2 · LE SCOPERTE (lo slot «Per te» in home)

Un modulo editoriale che appare in home quando un gusto EMERGE — mai a caso.

**Trigger** (query sui dati esistenti, zero AI):
- 3+ film visti dello stesso regista/attore → modulo regista/attore
- gusto dichiarato nell'onboarding → modulo di benvenuto sul tema (day one!)
- 5+ ricette con lo stesso ingrediente → modulo cucina
- concerto passato + artista nei gusti → modulo artista (news/tour via ricerca)

**I tre strati del contenuto, dal più solido:**
1. **Fatti veri da TMDB/Deezer** (gratis, zero invenzioni, personali):
   «Hai visto 3 film di Nolan · il suo più amato che ti manca: Memento (8.2)
   · in lista con un tocco». Il cuore della funzione.
2. **Link d'approfondimento** (Tavily, cache 7gg, ~gratis): «3 letture su
   Nolan» → articoli veri, fuori. Colleghiamo, non ricreiamo.
3. **(V2, non ora) il pezzo scritto da Keiko** — SOLO ancorato a ricerca web
   vera, mai trivia a memoria del modello: una curiosità inventata brucia la
   fiducia. 2-3 cent, peso 1.

**Regole anti-spam (le stesse dei battiti):**
- UNO slot Per te in home, sempre
- ogni scoperta appare una volta; ✕ chiude; «non dirmelo più» sul TEMA
  (idea 147: mai più Nolan, se lo chiedi)
- max 1 scoperta nuova a settimana per area — è un regalo, non un feed
- stato in profile o tabella dedicata, pattern a fusione

## 3 · IL SETTIMANALE (il rituale)

Domenica sera: push «Il tuo settimanale è pronto 🐋» → pagina editoriale:
la settimana in numeri · la ricetta della settimana · visto e votato ·
il ricordo (battito migliore) · la settimana che arriva.
- Generato da query sui dati (gratis); editoriale d'apertura AI opzionale
  (1-2 cent/settimana, peso 1).
- Il dispatch è UN battito settimanale: riusa cron, quiet hours, interruttore.
- Paletto dieta: si RIPORTA («2 ricette fatte»), mai si giudica.
- A dicembre lo stesso motore fa il Wrapped (idea 50).

## Ordine di costruzione (quando si sblocca)

1. Onboarding gusti (sblocca tutto, è piccolo)
2. Scoperte strato 1+2 (fatti TMDB + link)
3. Settimanale
4. Scoperte strato 3 e Wrapped

## Costi

Trigger e fatti: 0 · link: 0 (Tavily in cache) · onboarding: 0 ·
Settimanale: 0-2 cent/settimana/utente · Scoperte V2: 2-3 cent a pezzo.
