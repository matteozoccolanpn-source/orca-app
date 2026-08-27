<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:keiko-redesign-rules -->
# Redesign Keiko (branch `redesign`) — regole vincolanti

**Fonte di verità visiva**: `docs/mockups/keiko-final.html`. Le misure e i colori NON si
interpretano: si copiano (metodo port 1:1 — stesso CSS, stesse classi, stessa struttura DOM).
Se un valore visivo non esiste nel mockup, chiedilo a Matteo: non inventarlo.

Prima di toccare la UI, leggi:
- `docs/UI-REGOLE-BASE.md` — separazione card/fondo (trio fill+bordo+ombra, 3 strati delle art,
  test scala di grigi), un accento per card, ordine di lettura.
- `docs/UI-VOICE.md` — ogni testo visibile si copia da qui, non si inventa.
- `docs/UI-MAPPA-HOME.md` — cosa apre ogni tasto.
- Logo: `docs/logo/keiko-logo.svg` (inline, currentColor) · icona PWA: `docs/logo/keiko-icon.svg`.

Vincoli di sempre: non toccare `lib/` e `app/api/` (solo presentazione); build verde prima di
ogni commit; MAI committare senza ok esplicito di Matteo; la home vecchia resta funzionante
(v2 dietro interruttore); accent = var(--accent), il viola non esiste.

**«Il viola non esiste» riguarda l'ACCENTO della UI** — ambra nella UI attuale,
terracotta in V2 — non i pallini che codificano la sezione. Le cinque sezioni
hanno cinque colori di famiglia, e uno di quei cinque è viola: `--c-guarda:
#8F7AC0`. Vale **solo** su `.dot`, mai su testo, bottoni o superfici. La regola
per esteso, col perché, sta in `docs/UI-DECISIONI-V2.md`.

**PROVARE SULL'APP VERA**: in locale si entra senza Google con `KEIKO_DEV_LOGIN` in
`.env.local` — vale per le pagine e per le rotte `app/api/*`, quindi si può anche premere.
Esiste perché fino al 12 agosto 2026 nessuna ondata era mai stata provata sull'app vera:
si costruivano banchi finti e i difetti uscivano sul telefono di Matteo. **Non deve mai
stare in produzione**: è guardata anche da `NODE_ENV !== "production"` (`lib/dev-login.ts`),
e senza la variabile l'app si comporta esattamente come prima. Da qui in avanti «non
provato, serve la sessione» non è più una scusa valida.

**E l'indirizzo è `prova@keiko.local`, non quello di Matteo.** La chiave utente si ricava
dall'email: con la sua, ogni tasto premuto durante le prove scrive nel SUO storico — serie
finte nell'allenamento, spunte sulla sua lista della spesa — e corrompe proprio i dati su
cui si sta lavorando. Con l'indirizzo di prova hai un utente tutto tuo dove puoi premere
qualsiasi cosa. **L'indirizzo di Matteo si usa in sola lettura, per guardare, mai per
premere**: si mette solo quando serve vedere una schermata piena di roba vera, e si rimette
`prova@keiko.local` prima di toccare qualunque comando. Vale anche qui la regola dei DATI
DI PROVA qui sotto.

**LA SCORCIATOIA VINCE ANCHE PER MATTEO, NON SOLO PER CHI SCRIVE CODICE.** `auth()` sceglie
la sessione vera SOLO se c'è già un login Google nel browser; altrimenti — e questo vale
anche per Matteo che apre l'app in locale senza aver fatto login — la sessione finta di
`prova@keiko.local` vince di default. «Guardare l'app con i miei dati» richiede un login
Google esplicito in quel browser: senza, si guardano i dati di prova credendo di guardare
i propri. Non è sfortuna: è il terzo incidente di identità in due giorni (la sessione Google
rimasta attiva in un browser di prova, poi questo al contrario — un browser senza sessione
che doveva mostrare dati veri) — la scorciatoia non lo diceva. (Scritta il 28 agosto 2026,
dopo un documento di viaggio caricato "nel mio account" che era in realtà finito sotto
`prova@keiko.local`.)

**DATI DI PROVA**: ogni riga di prova si crea con prefisso `PROVA-` nel titolo e si cancella
SOLO per elenco di id salvati alla creazione. MAI una DELETE con pattern (`ilike`/`like`/`%`)
su tabelle vere. Se una DELETE potrebbe toccare dati non di prova: prima la SELECT delle righe,
mostrarle a Matteo, aspettare l'ok esplicito prima di cancellare.
(Scritta il 6 agosto 2026 dopo che una `DELETE ... ilike '%Milano Centrale%'`, nata per pulire
due biglietti di prova, ne ha cancellati quattro veri.)

Auto-verifica: dopo ogni sezione, screenshot dell'app (localhost:3000/?v2) accanto al mockup
alla stessa larghezza + versione in scala di grigi: ogni card deve staccare dal fondo.

**UNA VIA D'USCITA NON SI METTE MAI DENTRO IL RAMO DEL CASO CHE FUNZIONA.** Se una
schermata ha un ramo «va tutto bene» e uno «manca qualcosa», la porta va nel secondo —
o fuori da tutti e due. È la terza volta che succede (due porte in Allenamento, poi
«Scrivili tu» nella Cucina, sparita per chi non aveva nemmeno gli ingredienti): `tsc`
non lo vede, perché il tipo torna giusto lo stesso.
<!-- END:keiko-redesign-rules -->
