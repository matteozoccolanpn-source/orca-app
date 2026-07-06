# Prompt per la chat "Redesign UI Keiko" (fase 1A)

> Copia tutto il blocco qua sotto nella chat nuova, e ALLEGA: foto dei disegni
> a mano + screenshot delle app di riferimento (quelle del brief).

---

Leggi prima questi file e non scrivere codice finché non te lo dico:
- docs/STATO-E-TODO.md (contesto e roadmap)
- docs/UI-BRIEF.md (il brief che ho compilato)

Poi guarda gli allegati: i DISEGNI A MANO sono come immagino io le schermate
(contano posizioni e priorità, non la qualità del tratto), gli screenshot sono
le app che amo citate nel brief.

FASE 1 — CAPIRE (prima di produrre qualsiasi cosa):
1. Dimmi cosa hai capito dai disegni: elenca gli elementi che vedi, la gerarchia
   che ne deduci, e le differenze rispetto alla UI attuale di Keiko.
2. Fammi le domande di chiarimento che ti servono (max 5, quelle che cambiano
   davvero il risultato). Aspetta le mie risposte.

FASE 2 — 3 CONCEPT DIVERSI:
Producimi TRE opzioni di design DAVVERO diverse tra loro (non tre varianti di
colore della stessa idea). Ognuna deve:
- partire dai miei disegni (la gerarchia che ho indicato è sacra) ma
  interpretarli con una personalità diversa — es. una più sobria/professionale,
  una più viva/giocosa, una più radicale;
- essere un MOCKUP HTML in un singolo file autonomo (apribile nel browser,
  larghezza mobile ~390px, dati finti ma realistici presi da Keiko: treno per
  Roma, GP Gran Bretagna, to-do con chip orario/Maps, card Film & serie);
- mostrare ALMENO: la home completa + una card evento aperta + l'overlay/vista
  del giorno con i to-do;
- avere un nome e un mini-manifesto (3 righe: che personalità ha, cosa prende
  dai miei disegni, per chi è perfetta);
- salvarsi in docs/mockups/ (concept-1.html, concept-2.html, concept-3.html).
NON toccare il codice dell'app in questa fase. Nessun framework: solo HTML+CSS
(e JS minimo se serve per aprire/chiudere le card).

FASE 3 — ITERAZIONE (dopo che ho scelto):
Sul concept che scelgo faremo 2-3 giri di modifiche finché non scatta il "è lui".
Solo a quel punto: design system (token CSS, tipografia, componenti) e piano di
migrazione pagina-per-pagina su branch separato, con Keiko attuale che resta usabile.

Regole di lavoro (le solite): sono un principiante, spiegami le scelte in
italiano semplice; un passo alla volta; non committare mai senza il mio ok.
