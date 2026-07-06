# Post-UI Backlog — 20 migliorie (dall'uso reale, 2026-07-05)
> Si aprono a chiusura del blocco UI. [M] = idea di Matteo dall'uso. Rivisto coi numeri giusti.
> Batch 1 proposto: 3, 5, 1, 11, 19.

1. [M] Sentinella ritardi: cron T-15' treni, T-6h/T-2h voli → check (ViaggiaTreno / aviationstack) → push SOLO se ritardo verificato. Voice registro serio.
2. [M] Eventi smart ricchi per categoria: concerto → playlist "This is {artista}" (link Spotify), sport → classifica live, film → trailer.
3. [M] BUG prodotto: il rilevamento viaggi non crea più il plot in automatico — propone e crea solo su conferma.
4. [M] Profilo prudenza orari (rilassato/normale/prudente) che modula i buffer di "esci alle".
5. [M] Biglietto vero: conservare l'originale (PDF/img), "Mostra biglietto" = QR fullscreen con luminosità alta. Upload/save/show.
6. [M] Dieta precisa (quantità/macros) + "Lista della spesa" aggregata dai prossimi giorni.
7. [M] Condivisione via Keiko con registrazione per vedere l'evento (growth loop). DIPENDE da multi-utente+RLS (3A).
8. Ask conversazionale fase 1: sposta/crea/elimina/interroga con conferma UI (tool-use, gap cap.1).
9. Import Google/Apple Calendar (read-only, una tantum al primo accesso): abbatte il costo del trasloco per utenti nuovi. RIMANDATA a post test esterni — non serve nella fase single-user.
10. ~~Email-in~~ PARCHEGGIATA: lo screenshot e le vie già esistenti coprono il bisogno; si riapre solo se l'uso reale la reclama.
11. Parser esteso biglietti: arrivo, binario, carrozza, posto (e prezzo, per il 18) → riempie la banda biglietto. REGOLA: se un dato non c'è, la banda si compatta — MAI placeholder vuoti.
12. "Esci alle" reale: calcolo tragitto (Routes API) + punto 4.
13. Anticipi notifica per-evento (15/30/60/120 + doppia), come i to-do.
14. Notifica "in viaggio": binario/ritardi il giorno stesso (riusa infra punto 1).
15. Meteo destinazione reale (Open-Meteo) in kicker e pannelli.
16. TMDB completo: poster ovunque + dove vederlo + runtime.
17. Palestra storica: streak reale, auto-riprogramma se salti (TODO #17).
18. [M+] MEMORIA & STATISTICHE: "un anno fa" reale + storico per tipologia di esperienza (attività, musei, hotel, voli, ristoranti — dove i dati ci sono) con PREZZI PAGATI e orari → statistiche personali che aiutano a scegliere i viaggi futuri ("i tuoi hotel a Roma: media 110€/notte"). Prezzi TUOI storici, mai di vetrina (bussola). Dipende dal parser esteso (11).
19. "Keiko consiglia" reale a REGOLE (meteo+orario+eventi), senza LLM in v1.
20. Watchlist viva: notifiche uscite + consiglio serale automatico.
