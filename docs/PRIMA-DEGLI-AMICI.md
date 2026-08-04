# Keiko — Prima che entrino gli amici

> Appunti del 4 agosto 2026, da riprendere quando K14 (onboarding) è finito.
> Non c'è fretta: qui c'è solo quello che serve prima di mandare il link.

---

## Cosa resta da fare

| | Cosa | Chi | Tempo |
|---|---|---|---|
| ☐ | **K14** — onboarding rifatto (vedi `onboarding-proposta.html`) | Claude Code | in corso |
| ☐ | **og:image** — l'anteprima del link su WhatsApp mostra un'icona generica invece del logo | Claude Code | 20 min |
| ☐ | **K9** — la riga dei numeri: iscritti · attivi 7gg · attivi 30gg · quanti hanno caricato qualcosa | Claude Code | 2 ore |
| ☐ | Verificare che la **notifica di prova** arrivi davvero (Profilo → 🐋 → Invia notifica di prova) | Matteo | 1 min |
| ☐ | Chiedere a ciascuno **che iPhone ha** | Matteo | 5 min |
| ☐ | Mandare **il messaggio** (sotto) | Matteo | 5 min |

### Spiccioli, quando capita
- `DROP TABLE IF EXISTS public.search_log;` → chiude K70
- Completare `.env.example` con tutte le variabili
- Rileggere i testi della cancellazione account in `IDEE-2026-08-03.md` §1quater

---

## ⚠️ iOS 16.4 — da verificare prima di invitare

Il web push su iPhone esiste **solo da iOS 16.4 in poi**. Sotto quella versione:
l'amico installa l'icona e **non riceve mai nessuna notifica**. Non è un difetto di Keiko,
ma se non lo sai prima passi mezz'ora a cercare un bug che non esiste.

Su Android il problema non si pone.

**Da chiedere a ciascuno prima di mandare il link.**

---

## Il messaggio da mandare

> Ciao, ti va di provare una cosa che ho fatto?
>
> Si chiama Keiko. Tiene insieme la settimana: prenotazioni, palestra, dieta, i film da
> vedere. Le scrivi una frase tipo «cena venerdì alle 20 da Marco» e te la sistema da sola.
>
> La uso io tutti i giorni, adesso vorrei capire se serve anche a qualcun altro.
>
> Due cose che è giusto tu sappia prima di entrare: i dati stanno su un database in Europa,
> non c'è pubblicità e non li do a nessuno. Ed è una prova — ci lavoro io, può capitare che
> qualcosa non vada. Se a un certo punto vuoi che sparisca tutto c'è un pulsante nel profilo,
> oppure dimmelo e lo faccio io in un secondo.
>
> Se ti va: [link]
>
> Quando la apri ti spiega lei come metterla nella schermata Home — serve per ricevere gli
> avvisi, altrimenti resta muta.
>
> E dimmi tutto quello che non va o non si capisce, anche le cose stupide. Quelle mi servono
> più dei complimenti.

### Perché è scritto così

- **L'ultima riga è la più importante.** Gli amici dicono "bello!" per farti piacere, e quel
  feedback non vale niente. Chiedere esplicitamente le cose che non funzionano è l'unico modo
  per ottenerle.
- **Il paragrafo sulla privacy è il pavimento minimo** (vedi `legal/README.md`): detto a voce,
  prima che entrino, con zero burocrazia. Copre il 90% della sostanza con lo 0% della forma.
- **La riga sulla schermata Home** evita il fraintendimento più costoso: chi non installa non
  riceve avvisi, non torna, e tu concludi che l'app non gli piace.

---

## Il video — se lo vuoi fare

Non serve più per spiegare l'installazione: **l'app lo fa da sola** (K15). Semmai serve per
il momento wow, 30 secondi:

> scrivi «cena domani alle 20» → tocchi → **compare l'evento già sistemato**

Prima di registrare: giornata vuota o con eventi finti, **Non disturbare attivo**, nessun nome
di altre persone a schermo (quelli sono dati di terzi, non tuoi), nessun riferimento di
prenotazione visibile.

Registrazione schermo dell'iPhone, presa unica, nessun montaggio. Per cinque amici
l'autenticità batte la produzione.

---

## Dopo che sono entrati

Il divertimento: lista della spesa automatica (K33), ricettario da link (K27), collegamento
ricetta ↔ allenamento (K32), viaggio condiviso (K44).

E il **checkpoint di inizio novembre**: quante persone sono attive a 30 giorni, cosa usano
davvero, quanto è costato, se ci si diverte ancora.
