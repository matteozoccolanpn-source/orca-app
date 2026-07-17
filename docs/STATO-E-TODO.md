# Keiko — Stato attuale e TODO aperti
> Snapshot per ripartire (anche in una nuova chat). Aggiornato il 2026-07-07, fine del blocco UI.
> Metodo di sempre: leggi → capisci → modifica piccola; build verde prima di ogni commit;
> MAI committare/pushare senza ok di Matteo; capitolato = docs/mockups/keiko-final.html (v2.3.1).

## DOVE SIAMO (la settimana del redesign)
- **Blocco UI (1A) COMPLETO**: home nuova + 5 pagine interne (salute, allenamento, guarda,
  viaggio, agenda+day panel) al capitolato v2.3.1, dati veri, due mood, logo orca, voice.
  Branch `redesign`, home nuova = default `/` (vecchia su `?classic`).
- **PWA quotidiana**: dominio stabile `orca-app-git-redesign-…vercel.app` (si aggiorna a ogni
  push). Produzione (`orca-app-zeta`) = Keiko vecchia + hotfix sicurezza, intatta fino al merge.
- **SICUREZZA — fatto importante**: trovata e chiusa falla in produzione (pagine e API servite
  senza login: middleware next-auth senza callback `authorized`). Hotfix su main deployato e
  verificato; preview esposti eliminati; Deployment Protection disattivata (protegge il login
  dell'app); AUTH_URL rimossa dal Preview (login resta sul dominio del branch).
- Metodo di lavoro consolidato: Claude Code con AGENTS.md (regole vincolanti), sistema agentico
  (coordinatore + agenti-pagina + QA + art director), auto-verifica con playwright + scala di
  grigi, screenshot in docs/screens/.

## DOCUMENTI DI RIFERIMENTO (tutti in docs/)
- `mockups/keiko-final.html` — capitolato v2.3.1 (fonte di verità visiva)
- `UI-REGOLE-BASE.md` · `UI-VOICE.md` · `UI-MAPPA-HOME.md` · `CHECKLIST-COLLAUDO.md`
- `REVIEW-CRITICA-MOCKUP.md` (review FAANG: criticità e roadmap MVP/1.1/V2)
- `UI-RICERCA-MIGLIORIE.md` (14 proposte: TUTTE approvate tranne 13-DynamicType→backlog)
- `UI-POLISH-PROPOSTE.md` (verdetti dati) · `99-MIGLIORIE.md` (lista viva fix dall'uso)
- `POST-UI-BACKLOG.md` (20 migliorie post-UI) · `AI-GAP-ANALYSIS.md` (84 voci backend/AI)
- `logo/` (keiko-logo.svg, keiko-icon.svg, keiko-lockup.svg — timbro orca + wordmark W3)

## TODO — CODA UI (piccoli fix, si lavorano in corso d'uso)
1. ⚠️ Verifica finale mood: i "tre Sì/No" (sole cambia? persiste? /salute?mood=chiaro sabbia?)
   — MAI completata da Matteo, farla dalla PWA.
2. Pagina /login: togliere la barra "Chiedi a Keiko" e ogni chrome (solo logo+Keiko+Google).
3. Poster watchlist: colonna `poster` su DB + pipeline TMDB (presentazione già pronta,
   modifica additiva approvata).
4. Verificare che i verdetti RICERCA-MIGLIORIE (1-12,14) siano tutti applicati e committati.
5. Rimuovere la barra ?debug quando il mood è confermato.
6. Fix dall'uso → annotarli in 99-MIGLIORIE.md con smistamento UI/logica/bug.
7. Bug persistenza mood home (localStorage non riletto al mount) — segnalato, verificare fix.

## TODO — POST-UI BACKLOG (approvato, vedi POST-UI-BACKLOG.md)
Batch 1: **3** bug viaggi auto-creati (proporre, non creare) → **5** biglietto vero
(salva/mostra originale+QR) → **1** sentinella ritardi treni/voli → **11** parser esteso
(arrivo/binario/posto/prezzo) → **19** "Keiko consiglia" a regole.
Poi: 2 playlist/link smart, 4 profilo prudenza, 6 dieta+lista spesa, 12-17, 18 Memoria &
Statistiche (feature-firma: storico prezzi/orari per tipologia), 20 watchlist viva.
Parcheggiate: 10 email-in; 9 import calendario (post test esterni); 7 condivisione (post multi-utente).

## TODO — BACKEND/AI (da AI-GAP-ANALYSIS.md, ordine consigliato)
1. **Ask conversazionale fase 1** (cap.1): /api/ask con tool-use (sposta/crea/elimina/interroga)
   + conferme UI. NB: multi-utente/RLS rimandato (fase attuale single-user, scelta di Matteo).
2. Resolver con cache (cap.3): meteo, luoghi via Places, TMDB, classifiche + enriched_at
   (le etichette freschezza devono diventare vere).
3. Cron tick schedulato (⚠️ ancora aperto) + coda per lavori >60s (cap.4, cap.2.3).
4. Voce/STT (cap.2.2). Poi il resto della gap analysis.

## ROADMAP GRANDE (invariata)
1B "99 migliorie" (in corso d'uso) → **2 Privacy** (informativa, retention screenshot=PII,
GDPR — PREREQUISITO di qualsiasi utente esterno, fidanzata inclusa formalmente) →
3A login multi-utente+RLS → 3B profilo → 3C onboarding → test fidanzata e amici.

## CERIMONIA DI FINE REDESIGN (quando Matteo decreta "pronto")
Merge redesign→main: la v2 diventa produzione; rimuovere ?classic e la home vecchia;
manifest/icone definitivi; smoke test produzione; via il codice morto.

## REGOLE D'ORO (non cambiano)
- Capitolato = unica verità visiva: i valori si copiano, mai si inventano.
- Guardia funzionalità: nessuna funzione esistente si perde, mai.
- TBC visibili con chip "Presto" (scelta Matteo, fase single-user).
- Placeholder vuoti: mai — se non c'è, il modulo non esiste.
- lib/ e app/api/ si toccano solo con ok esplicito (eccezione: sicurezza).
- Push = decisione di Matteo (deroghe esplicite una tantum).
