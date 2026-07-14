# Keiko — Potenziamento per feature (dai 164 punti)

> Ogni feature ha due livelli: **DEMO** = il minimo che la rende *forte e onesta* per farla provare · **PIENO** = il potenziamento vero, dopo. I `#N` rimandano a `DECISIONI.md`.
> Regola: per la demo faccio la colonna DEMO di ogni feature; il PIENO è la roadmap di potenziamento feature-per-feature che parte dopo il primo test.

---

## 1. Aggiungi / Parsing AI  — *il cuore: screenshot o testo → evento*
**Visione:** butti dentro qualsiasi cosa (foto, testo, poi voce/email) e Keiko capisce e riempie tutto da solo.
- **DEMO:** #6 AI arricchisce sempre (orario/luogo/link) · #74 FAB "+" in Home · #69 esempi cliccabili nel testo · #71 form conferma in stile card.
- **PIENO:** #15 pipeline AI unica · #73 preview live mentre scrivi · #109 barra "Dimmi tutto" fissa · #110 input vocale · #112 eventi da email · #113 PDF biglietto → evento + tappa viaggio.

## 2. Home / Hub — *dove atterri e capisci la giornata*
**Visione:** in un colpo d'occhio vedi cosa conta oggi, con tono personale, e agisci senza cambiare pagina.
- **DEMO:** #10 via i dati mock · #152/#21 saluto col nome + gerarchia · foto sulle card principali (versione ridotta #163/#164D) · #74 FAB.
- **PIENO:** #14 popover contestuali (niente cambio-pagina) · #13 bottom tab bar · #17-26 estetica completa · #87 palette categorie coerente · #88 icone custom · #147 ordine Home personalizzabile.

## 3. Dieta — *ispirazione CREME + Kitchen Stories*
**Visione:** non una lista di pasti, ma un ricettario immersivo con foto e modalità cucina.
- **DEMO:** #34 "scambia pasto" reale (o lo nascondo) · #8/#90 via i "· presto" · foto sui pasti (ridotto) · #36 completamento giornata (x/n).
- **PIENO:** #27 categorie/stories · #28 dettaglio pasto con foto+azioni · #29 cook mode con timer · #30 editorialità · #31-33/#35 estetica · #155 profilo "chill/duro" dieta · #149 scontrino → dieta.

## 4. Allenamento — *ispirazione Equinox+ / Tonal (semplicità + metodo)*
**Visione:** una sessione pulita che parte, si cronometra, ricorda i tuoi pesi e cresce con te — mini personal trainer.
- **DEMO:** #4/#157 salva il completamento (bug loop) · #45 "riprogramma" collegato o tolto · #46 feedback spunta chiaro.
- **PIENO (le tue nuove idee):** #158 cronometro · #159 timer recupero personalizzabile · #160 registro pesi con progressione · #161 modifica/flessibilità per giornata · #37-44 redesign · #39 benchmark tipo Strength Score · #136 grafici progressi · #137 obiettivi · #138 Apple Health · #162 PT adattivo.

## 5. Viaggio — *ispirazione Stippl*
**Visione:** l'itinerario completo — mappa, giorno per giorno, notti, budget, checklist — costruito dai tuoi biglietti.
- **DEMO:** via i morti (#54-56 minori) · #105 conferma "copiato ✓" · hero con foto destinazione (ridotto #52).
- **PIENO:** #47 tab Destinazioni/Giorno-per-giorno · #48 mappa con rotta · #49 notti pianificate + tempi · #50 budget · #51 packing list · #120-127 feature viaggio complete.

## 6. Guarda — *watchlist cinematografica*
**Visione:** "stasera per te" con locandine vere, dove vederlo, e consigli AI.
- **DEMO:** #9 locandine reali (TMDB) · #60 via i `prompt()`, campo in-app · #66 via "notifiche uscite · presto" · #62/#64 badge tipo + logo piattaforma.
- **PIENO:** #58 hero cinematografico · #59 barra azioni separata · #61/#63/#65 estetica · #141 filtri · #142 "cosa vedo stasera" · #143-145 notifiche/import/trailer.

## 7. Profilo / Personalizzazione — *il nuovo cuore trasversale*
**Visione:** l'icona utente diventa il motore che adatta tutta l'app ai tuoi input (duro/chill, notifiche, abitudini).
- **DEMO:** #2 logout · #152 nome utente (alimenta i saluti).
- **PIENO:** #151 icona → Profilo · #153 tema · #154 notifiche per tipo evento · #155 personalità duro/chill per area · #95 Settings · #156 motore di personalizzazione unica (stella polare architetturale) · #162 lega l'allenamento a questo motore.

## 8. Sistema / Qualità — *le fondamenta invisibili*
**Visione:** stabile, coerente, senza crepe.
- **DEMO:** #1 tema scuro fisso · #3 cache/versione giusta · #7/#8/#90 via tutto ciò che è finto o morto · collaudo "tocca ogni bottone".
- **PIENO:** #11 design system unico · #84 notifiche push reali · #79-83 skeleton/undo/pull-refresh/empty · #89 accessibilità · #92-94 errori/persistenza/timezone · #99-101 performance/deep-link/test.

---

## Come lo eseguirei (senza fare tutto insieme)
1. **Prima la demo:** solo le righe **DEMO** di tutte le 8 feature → è il piano `DEMO-READY.md`, ogni feature risulta forte e senza crepe.
2. **Poi il potenziamento, una feature alla volta**, in quest'ordine di valore: Aggiungi/AI → Allenamento (le tue idee nuove) → Home → Dieta → Viaggio → Guarda → Profilo/motore.
3. Ogni feature: la potenzio, **la usi una settimana**, poi passo alla successiva. Così ogni potenziamento è testato sul campo, non a scatola chiusa.

Dimmi da dove parto: dico "vai demo" e faccio le righe DEMO in ordine, oppure "potenzia [feature]" e attacco il PIENO di quella.
