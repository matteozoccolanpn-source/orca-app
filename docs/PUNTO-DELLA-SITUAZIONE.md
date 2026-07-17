# Punto della situazione — Keiko (per ripartire con calma)

> Leggi questo file all'inizio della prossima chat. Racconta dove siamo,
> cosa è fatto, cosa manca e qual è il prossimo passo. In parole semplici.

---

## In una frase
Sto **rifacendo il vestito grafico** dell'app (il "redesign"). Il lavoro nuovo è su
un ramo separato (`redesign`) e **nascosto**: la tua app di tutti i giorni è identica
a prima, non ho rotto né tolto niente.

## Cosa NON è cambiato (stai tranquillo)
- La tua app funziona come prima. La Home "vera" è ancora quella vecchia.
- Nessuna funzione è stata tolta. Ci sono tutte, nel codice.
- Pipeline Make.com/Dropbox, login Google, database: **non toccati**.

## Come si vede il lavoro nuovo (due modi)
1. **Anteprima grafica pubblica (senza login):**
   `https://orca-app-git-redesign-matteozoccolanpn-7790s-projects.vercel.app/ds-preview`
   Serve SOLO a guardare il nuovo look con dati finti. Alcuni tasti (ricerca, ecc.)
   sono spenti qui, perché hanno bisogno del login.
2. **Home nuova con i tuoi dati veri:** aggiungi `?v4` all'indirizzo della tua app
   (funziona dopo il login). Es: `.../?v4`.

## Cosa ho già costruito (i pezzi del nuovo look)
- **Nuova Home** (`KeikoHomeV4`): saluto, striscia della settimana, evento in primo
  piano, "in arrivo", riquadri dieta/sport/viaggio/guarda, barra in basso col "+".
- **Pannello evento**: quando tocchi un evento si apre dal basso. Ha titolo, orario,
  luogo e tre azioni che funzionano: **Aggiungi al calendario** (scarica il file .ics),
  **Maps**, **Condividi**.
- **Ricerca "Chiedi a Keiko"**: pannello che risponde con l'AI e mostra i tuoi
  eventi/promemoria collegati. (Riusa quello che c'era già: /api/ask + /api/search.)

## Cosa manca prima di rendere la Home nuova quella "ufficiale"
Questa è la **checklist di parità** (nella Home nuova devono esserci TUTTE le funzioni
che hai oggi, prima di fare lo scambio):
1. Pannello evento: **Modifica** e **Elimina** (ora ci sono solo calendario/maps/condividi).
2. Ricerca "Chiedi a Keiko" — ✅ FATTA.
3. Pannello del **giorno** con i **to-do** (spunta / stella / elimina / aggiungi).
4. **Calendario** mensile + pannello **Profilo** (nome + logout).
5. **Scambio finale**: quando i punti sopra sono pronti, la Home nuova diventa quella
   di default (la vecchia resta raggiungibile con `?classic`).

## Il prossimo passo consigliato
Punto **1** o punto **3** della lista sopra: aggiungere **Modifica/Elimina** al pannello
evento, oppure il **pannello del giorno con i to-do**. Entrambi riusano codice che esiste
già (/api/update, /api/delete, /api/todos).

## Regole di lavoro (come mi hai chiesto di lavorare)
- Piccole modifiche mirate, spiegate in italiano semplice.
- La soluzione più semplice, non la più "furba".
- Non toccare file scollegati dal compito.
- `npm run build` deve passare prima di ogni commit.
- Niente commit senza il tuo ok (i push su `redesign` li hai già autorizzati).

## File nuovi principali del redesign (per orientarsi)
- `app/ds.css` — colori e stili del nuovo design.
- `app/components/keiko/KeikoHomeV4.tsx` — la nuova Home.
- `app/components/keiko/EventSheet.tsx` — il pannello evento.
- `app/components/keiko/AskSheet.tsx` — la ricerca.
- `components/SmartMedia.tsx` + `lib/smart-image.ts` — le card con foto/gradiente.
- `app/ds-preview/page.tsx` — l'anteprima pubblica con dati finti.
- `docs/DESIGN-SYSTEM.md` — le regole del design.
