# Mappa interattiva della Home — keiko-final.html
> Riferimento per la Fase 3 (design system + migrazione). Aggiornata al 2026-07-04.

## Barra alta
1. **Logo 🐋** → torna in cima. Idea futura: profilo dietro long-press.
2. **"Chiedi a Keiko"** → Ask a schermo intero: barra con cursore, 4 chip "Prova a chiedere", 3 richieste recenti con esito. Futuro: chip eseguono il comando.
3. **🌓** → cambio mood chiaro/scuro animato (0,45s). Bloom colorato varia con l'ora (mattina pesca / giorno azzurro-teal / sera tramonto / notte indaco).
4. **Campanella (badge)** → oggi toast. Idea: sheet notifiche con prossime scadenze e azioni inline.

## Settimana
5. **Giorno (×7)** → peek: titolo, righe eventi/to-do, "Apri il giorno →". Vuoto: "💡 Proponimi qualcosa".
6. **Apri il giorno** → overlay: eventi tratteggiati, to-do (check, chip orario/Maps/Chiama, stella, swipe dx=fatto sx=elimina), campo aggiunta.

## Momento corrente
7. **"Esci alle 17:20"** → Maps verso il luogo del prossimo evento (link maps/dir con `location`). Countdown vivo nel sottotitolo.

## Hero (carosello + puntini)
8. **Card treno** → dettaglio morph: Il viaggio / Per arrivare in tempo / Biglietto QR su carta + barra fissa (countdown, Maps, WhatsApp).
9. **Pill Maps nel biglietto** → Maps stazione.
10. **Card cena** → DA COLLEGARE: dettaglio come treno (La serata / Prenotazione su carta / barra Maps + Scrivi a Marco).
11. **Pill Maps prenotazione** → Maps ristorante.
12. **Long-press hero** → action sheet Sposta/Condividi/Elimina.

## In arrivo (carosello + puntini)
13. **Titolo ›** → DA COLLEGARE: pagina agenda per settimana.
14. **Card GP** → dettaglio: top 3 mondiale, 🔔 Ricordamelo (crea to-do), Classifica (link).
15. **Card volo** → DA COLLEGARE: dettaglio con gate, countdown check-in, carta d'imbarco su carta.
16. **Card concerto** → DA COLLEGARE: biglietti ×2 su carta, condividi con Giulia, Maps.
17. **Long-press** → action sheet.

## Oggi per te
18. **"Vai 💪"** → espande 6 esercizi in card; anello progresso; 6/6 → toast.
19. **Esercizio** → check con rimbalzo.
20. **Piatto cena** → segna fatta. Idea: long-press = swap pasto.
21. **"La settimana ›"** → /salute.
22. **Long-press tile** → action sheet.

## Da guardare
23. **Titolo ›** → /guarda.
24. **Poster (×3)** → oggi toggle visto. Idea: tap = scheda film (TMDB, dove vederlo, trailer); visto su long-press/swipe.
25. **Long-press** → action sheet.

## Viaggi
26. **Titolo ›** → lista viaggi.
27. **"Vedi itinerario"** → /viaggio.
28. **"Aggiorna"** → shimmer 1s + conferma (ri-verifica).
29. **Long-press card** → action sheet.

## Tab bar
30. Home (attiva) · 31. Dieta → /salute · 32. **FAB ＋** → foglio: Scrivilo / Screenshot / Dillo a voce · 33. Sport (badge) → /allenamento · 34. Guarda (badge) → /guarda.

## Gesti
Swipe caroselli (puntini) · parallax hero · pillola contesto oltre 120px scroll · pull-to-refresh · tap fuori chiude peek/sheet.

## Buchi da chiudere in Fase 3
Cena (#10), volo (#15), concerto (#16), titoli sezione (#13/23/26), tab (#31/33/34), campanella (#4).
