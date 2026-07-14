# Fix immediati (ASAP, poco sbatti)

> Nota onesta: non posso entrare nell'app **loggata** (login Google tuo), quindi questa lista nasce da un'ispezione del codice v2 attuale — precisa, ma "a occhi chiusi" sul rendering. Se vuoi una passata **visiva vera**, posso usare **Claude in Chrome** mentre tu sei loggato con l'app aperta: la guardo schermata per schermata. Dimmi e lo attiviamo.

## Appena fatti — da testare al prossimo deploy
- **Ricerca reale** "Cerca in Keiko" (cerca nei tuoi eventi/to-do; se non trova, risponde simpatico + esempi).
- **Saluto col nome** del profilo.
- **Form Sposta/Modifica** ristylato (font Keiko + maniglia).
- **Via i chip "· presto"** in tutte le schede.

## UI — fix rapidi e visibili
1. **`prompt()` del browser** (Guarda: "aggiungi titolo" e "consiglio"; Home: orario del to-do) → sostituire con un campo in-app. È la cosa che più "sa di prototipo". (S)
2. **"Elimina" evento finto** — dal menu ⋯ su una card, "Elimina" fa solo un toast, non cancella davvero → collegarlo alla delete reale (o toglierlo). (S)
3. **"Scambia pasto"** in Dieta fa solo un toast → collegarlo allo swap vero (`DietSwap` esiste già). (S/M)
4. **"Riprogramma allenamento"** toast-only → nasconderlo per ora (il vero "sposta sessione" è il task post-demo su Supabase). (S)
5. **Copertine film** = gradienti placeholder → **locandine reali (TMDB)**. (M)
6. **Form Sposta/Modifica** — se ancora troppo "tailwind", rifarlo nativo Keiko (input + pill accento coerenti). (M)
7. **Card piatte senza foto** → foto reali con un **template unico** (foto + scrim + testo fisso). È il fix più visibile in assoluto. (M)

## Funzionalità ASAP (poco lavoro, alto valore)
8. **Saluto contestuale** — "Ciao Matteo 👋 — oggi 2 eventi, palestra da fare" invece del solo nome. (S)
9. **Notifiche push reali** — VAPID è già configurato: promemoria per eventi imminenti e to-do con orario. (M)
10. **Barra "Dimmi tutto" in Home** — input testo libero sempre visibile (il `CaptureSheet` c'è già): scrivi e Keiko crea l'evento. (S/M)

## La cosa che sposta di più
Il punto **7 (foto sulle card)** è ciò che risponde al tuo "modifiche minime": trasforma l'aspetto dell'app in un colpo solo. Te lo propongo come prossimo blocco, insieme al **saluto contestuale (8)** che costa pochissimo.

## Ordine consigliato (no fuss)
Prima i "tasti che mentono" — **1, 2, 3, 4** (mezza giornata, rendono l'app onesta) → poi il salto visivo **7 + 8** → poi **5** (locandine) → **9/10** come funzioni nuove.
