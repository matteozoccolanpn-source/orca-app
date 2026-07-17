# Keiko — Piano di implementazione, da qui al lancio

> Sequenza granulare per portare nel codice vero TUTTO ciò che abbiamo deciso: design v4, sistema immagini, coerenza dati, bug di fiducia, redesign schede, notifiche, lancio. Ogni step è piccolo e testabile. Effort: **S** = 1 serata · **M** = 2-3 · **L** = settimana.
>
> **Dove sei ora:** backend solido; design deciso (v4 + `DESIGN-SYSTEM.md` + bibbia immagini); il codice ha ancora la UI vecchia. Da qui è tutto implementazione.
>
> **Cosa serve da te (una tantum):** (a) API key gratuita **TMDB** (per Fase 4); (b) far girare 2-3 **SQL** su Supabase quando te li do (colonne `image`, ecc.); (c) testare dopo ogni fase e darmi feedback.
>
> **Regola trasversale:** dopo ogni fase → `npm run build` + push su `redesign` + tu provi. Il design resta bloccato sulla v4; se qualcosa non regge, si aggiusta sulla spec, non a caso.

---

## FASE 0 — Fondamenta design nel codice *(sblocca tutto)*
0.1 — **Token unici** (S). Un solo set di variabili CSS dai valori della spec (bg `#0C0E13`, ambra, grigi `--text/2/3`, scrim, radius). Additivo: non rompo la UI vecchia finché non la sostituisco. *Fatto quando:* le nuove variabili esistono e sono documentate.
0.2 — **Font brand** (S). Carico **Fraunces** (display) + **Inter** via `next/font/google`. *Fatto quando:* i titoli possono usare Fraunces, il corpo Inter.
0.3 — **Componente `<SmartMedia>`** (M). Card unica: slot immagine/gradiente + scrim a due lati + chip opachi + contenuto (titolo/meta), con varianti `hero | square | mini | poster`. È il "linguaggio unico" che elimina il patchwork. *Fatto quando:* rende una card con gradiente e testo leggibile.
0.4 — **Componenti base** (S). Chip, pill, bottone (primario/secondario/distruttivo), sezione-lead, riga-summary — tutti sui token nuovi.

## FASE 1 — Sistema immagini: architettura + livello 0 *(niente foto da raccogliere)*
1.1 — **SQL: colonna `image`** (S, serve te). `alter table tickets add column if not exists image text;` (+ analogo dove servirà). Ti do l'SQL.
1.2 — **`resolveImage` / `fromPool` / `pickForList`** (M). Scelta **deterministica anti-doppione** (hash(id)%N) + cascata specifica→semantica→categoria→fallback. Manifest minimale.
1.3 — **Livello 0 attivo** (S). Ogni card usa il **gradiente-categoria** (`--cat-*`) come immagine base → app immersiva subito, zero foto.
1.4 — **Persistenza `image` per entità** (M). L'immagine scelta si salva alla creazione e si rilegge ovunque → foto/dato **stabili e identici** in home e sezioni. *(Questo fixa il bug coerenza dati.)*
1.5 — **Fallback + icone categoria** (S). Set icona unico per cena/concerto/sport/volo/treno/hotel/museo/dieta/film.

## FASE 2 — Home nel codice (la v4) *(il salto percepibile)*
2.1 — **Struttura Home** (M). Sostituisco il layout di `KeikoPreview`: topbar (brand + Chiedi a Keiko + profilo), kicker+meteo, saluto Fraunces, **riepilogo giornata**, week strip.
2.2 — **Hero evento** (M). Card `hero` 16:10 con SmartMedia, chip categoria, orario ambra, "con chi" + CTA Maps inline.
2.3 — **"In arrivo"** (S). Carosello `mini` con SmartMedia + troncamento pulito.
2.4 — **"Oggi per te"** (M). Griglia uniforme: Allenamento (anello pieno), Dieta (macro), Viaggio, Guarda — **tutte SmartMedia, tutte dati veri** (via `live`, niente mock).
2.5 — **"Da guardare"** (S). Riga poster (per ora gradiente/placeholder; TMDB in Fase 4).
2.6 — **Bottom tab bar** (M). Home / Agenda / Viaggi / Profilo + FAB. *Fatto quando:* si naviga senza back-href continui.

## FASE 3 — Bug di fiducia *(niente tasti che mentono)*
3.1 — **Coerenza dati** (S). Verifica finale: home e sezioni leggono la stessa fonte (completa 1.4).
3.2 — **Tasti morti Guarda** (M): "Aggiungi titolo", "Dove vederlo", feedback "Consiglio". *Fatto quando:* ogni tap fa qualcosa di visibile.
3.3 — **"Vedi biglietto" (Viaggio)** (M): mostra biglietto/allegato o stato "nessun biglietto", non il modale Aggiungi vuoto.
3.4 — **Aggancio "Condividi"** (S): la feature già scritta (contatti) collegata al pannello evento; contatti editabili (dopo Profilo).
3.5 — **Undo in Guarda** (S) + conferma coerente sulle azioni distruttive.
3.6 — **Data calendario** (S): "oggi" corretto + fix clipping a 390px.
3.7 — **Stati "incastrati"** (M): reset completo alla chiusura di ogni pannello (una metafora sola: sheet che sale).
3.8 — **Freeze Guarda** (M): disabilitare controlli durante il load, debounce tap.
3.9 — **Micro-copy** (S): plurali ("1 evento"), label ambigue, tono coerente.

## FASE 4 — Immagini livello 1: TMDB *(il salto visivo più grande)*
4.1 — **Setup** (S, serve te): API key TMDB in env.
4.2 — **Adapter TMDB** (M): poster 2:3 + backdrop 16:9 (+ logo titolo, loghi piattaforma). Cache su DB.
4.3 — **Guarda con poster reali** (M): griglia + hero "Stasera" con backdrop; badge rating opaco; scrim forte sui poster chiari.

## FASE 5 — Rollout schede *(card unica + immagini, una alla volta)*
5.1 — **Dieta** (M): SmartMedia sui pasti (foto cibo per ricetta/slot), macro/kcal in scheda, dettaglio pasto, scambio pasto reale.
5.2 — **Allenamento** (M): card sessione con foto per tipo, anello progressi anche in sezione, serie/rip/peso nell'editor, coerenza con home.
5.3 — **Viaggio** (L): timeline verticale, foto città/tappe (o mappa itinerario), "messaggio pronto" allineato ai dati, rimozione tappe fantasma.
5.4 — **Guarda** (S): rifinitura post-TMDB (filtri Film/Serie/piattaforma, titoli puliti).
5.5 — **Aggiungi** (S): stepper vivo, esempi cliccabili, gestione input non parsabile, incolla-immagine.
5.6 — **Profilo** (M): impostazioni reali (notifiche, tema, unità, privacy/export/delete, versione) + contatti condivisione editabili.
5.7 — **Pannello giorno** (S): apertura a 1 tap, affordance swipe + undo, timeline con orari.
5.8 — **Chiedi a Keiko** (S): link tappabili nella risposta, chip domande suggerite.

## FASE 6 — Feature mancanti + notifiche
6.1 — **Notifiche push** (M): VAPID già configurato → promemoria eventi imminenti + to-do con orario. *(La lacuna n.1 per la retention.)*
6.2 — **Via i `prompt()` del browser** (S): campi in-app (residui in Guarda/Home).
6.3 — **Empty states** (M): illustrazioni coerenti (papera Keiko) per liste vuote.
6.4 — **Skeleton loading** (S): al posto degli spinner; ogni azione async con esito + toast.

## FASE 7 — Rifiniture & qualità
7.1 — Accessibilità: contrasti AA (già impostati nei token), touch target ≥44px. (S)
7.2 — Pool immagini livello 2 (Unsplash curati, script una tantum) dove il gradiente non basta. (M)
7.3 — Performance: lazy-load, blur-up (LQIP), controllo re-render. (M)
7.4 — Meteo icone coerenti, grain sul fondo, avatar contatti. (S)

## FASE 8 — Lancio
8.1 — **Collaudo "tocca ogni bottone"** (S): giro completo su ogni schermata, lista alla mano.
8.2 — **`npm run build`** pulito + test finale in incognito. (S)
8.3 — **Merge `redesign` → `main`** (S): la nuova app diventa produzione. Un solo URL stabile (`orca-app-zeta`) → fine confusione anteprime.
8.4 — **Deploy produzione + verifica** (S): controlli su tutte le schede in produzione.
8.5 — **PWA**: installazione su telefono, notifiche attive, cache versioning ok.

---

## Tempi & dipendenze
- **Blocco "salto percepibile" (Fasi 0-1-2):** ~2 settimane → la nuova Home immersiva con dati coerenti è online.
- **Blocco "app onesta" (Fase 3):** ~1 settimana.
- **Blocco "wow visivo pieno" (Fasi 4-5):** ~3-4 settimane (una scheda alla volta).
- **Blocco "prodotto vero" (Fasi 6-7-8):** ~2 settimane.
- **Totale realistico a lancio:** ~8-10 settimane di serate, una fase alla volta, testando sempre.

**Percorso critico:** Fase 0 sblocca tutto → falla per prima. La persistenza immagini (1.4) è doppio valore (immersività + fix dati): non saltarla. TMDB (4) dipende dalla tua key. Notifiche (6.1) sono ciò che rende Keiko un "prodotto" e non un quaderno: non rimandarle troppo.

### Prossimo passo immediato
**Fase 0.1 + 0.2** (token unici + font): additivo, a basso rischio, e da lì tutto il resto si aggancia. Dico "vai" e comincio.
