# scripts/

## `port-v2-css.mjs` — da dove viene `app/keiko-v2.css`

**`app/keiko-v2.css` non si scrive a mano.** È generato da questo script a
partire dal blocco `<style>` di `docs/mockups/keiko-v2-mock.html`. Se lo
modifichi a mano, la prima rigenerazione se lo mangia.

```
node scripts/port-v2-css.mjs
```

Senza argomenti legge il mock e riscrive il foglio. Con due argomenti
(`<mock.html> <out.css>`) scrive altrove: serve per provare una variante
senza toccare il foglio vero.

### Quando si rilancia

Quando cambia il mock. Fuori da quel caso, non serve mai — e se ti trovi a
volerlo lanciare per «sistemare» qualcosa nel foglio, quello che vuoi
cambiare va messo qui dentro come sostituzione dichiarata, non nel CSS.

Dopo ogni rigenerazione, `git diff app/keiko-v2.css`: se compare qualcosa
che non c'entra con quello che hai cambiato nel mock, fermati.

### Cosa fa, meccanicamente

Il porting è 1:1: **nessun valore visivo viene reinterpretato**. Le regole
sono solo di ambito:

- `:root` → `:root, .k2` — dentro l'app esiste già `.keiko`, che ridefinisce
  `--bg` e compagnia: se le variabili V2 stessero solo su `:root`, un `.k2`
  dentro un `.keiko` erediterebbe i colori vecchi;
- `*` → `.k2, .k2 *`; `html` e `body` → `.k2`;
- `@keyframes` restano identici, tranne `pulse` → `k2-pulse` (Tailwind ne
  definisce già uno globale e vincerebbe lui);
- il blocco `#oldhome` resta fuori: la Home ha la sua ondata.

### Le sostituzioni dichiarate

Tutto quello che *non* è meccanico sta in fondo allo script, ognuna col suo
perché scritto accanto. In breve:

| Sostituzione | Perché |
|---|---|
| `font-family:Fraunces` / `Inter` → le variabili di `next/font` | sono le uniche che caricano davvero i font dentro l'app |
| `.k2{line-height:normal}` | il preflight di Tailwind mette `1.5` su `<html>` e si eredita: erano 46px di scarto a fine schermata |
| `--c-guarda:#A47BE0` → `#8F7AC0` | l'unica sostituzione **visiva**: vedi `docs/UI-DECISIONI-V2.md`, punto 2-ter |
| safe-area in cima a `.screen` e `.topbar` | il mock gira in una finestra del desktop, dove la tacca non esiste |
| `--pad-bottom` 116 → 128px | è l'altezza vera di `KeikoNav`, più alta della tab bar del mock |
| blocco «AGGIUNTE FUORI DAL MOCK» in coda | snap e sfumatura dei chip |

### Le sostituzioni spaccano apposta

Le tre correzioni della safe-area passano da una funzione che **lancia un
errore** se la stringa che cerca non c'è più. È voluto: se il mock cambia
sotto e la sostituzione non attacca, il modo peggiore di scoprirlo è un
foglio che si genera senza lamentarsi e una testata che finisce sotto la
tacca sul telefono di Matteo. Meglio uno script che si ferma.

Se ti si ferma: guarda cos'è cambiato nel mock, aggiorna la stringa, e
controlla che la correzione serva ancora.

### Perché sta qui e non in una cartella temporanea

Ci è stato, ed è quasi costato caro. L'11 agosto 2026 la copia nel banco di
lavoro era rimasta indietro di cinque correzioni: una rigenerazione fatta
per cambiare un colore le ha cancellate tutte in una volta, in silenzio.
Un pezzo di codice che può disfare il lavoro di un'ondata deve stare nella
storia del repo, dove si vede cosa gli succede.
