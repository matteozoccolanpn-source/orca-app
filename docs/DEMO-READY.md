# Keiko — Piano "Demo-ready" (farla provare a una persona vera)

> Obiettivo: un prodotto che sembra **finito** — zero cose rotte, zero tasti morti, un tocco di "wow". NON è il redesign completo: quello viene dopo. Qui si taglia tutto ciò che non serve alla prima impressione.
>
> Le voci `#N` rimandano a `DECISIONI.md`. Effort: **S** = 1 serata · **M** = 2-3 serate.
> **Fuori scope demo** (di proposito): redesign CREME/Stippl (#27-56 grossi), motore personalizzazione (#156/162), cronometro/pesi allenamento (#158-160), design system completo (#11), popover Home (#14). Bellissimi, ma dopo.

---

## BLOCCO A — Niente di rotto (la base di credibilità)
*Se si rompe davanti a lei, è finita. Prima questo.*

1. **Tema scuro fisso** (#1A) — niente più ribaltamento in chiaro. **S**
2. **Logout** minimo in topbar (#2A) — un'app completa ce l'ha. (Il profilo pieno #151-154 è dopo.) **S**
3. **Allenamento salva il completamento** (#4A + #157A) — alleni → torni in Home → risulta "fatto", non lo rifai. **M**
4. **Versione giusta sul telefono** (#3A) — versioning cache, così lei vede l'ultima build e non una vecchia. **S**

## BLOCCO B — Zero tasti morti (il tuo requisito n.1)
*Ogni bottone o fa qualcosa, o sparisce. Niente promesse "· presto".*

5. **Nascondo "Cerca in Keiko"** finto (#7A). **S**
6. **Nascondo tutti i chip/link morti e i "· presto"** (#8A + #90A + #66) su Dieta/Allenamento/Viaggio/Guarda. **S**
7. **"Scambia pasto" e "Riprogramma"**: se sono veloci li rendo reali, altrimenti li tolgo per la demo (#34, #45). **S/M**
8. **Rimuovo i dati evento finti** di fallback (#10A) — non deve vedere eventi mock. **S**
9. **Tolgo i `prompt()` del browser** in Guarda, li sostituisco con un campo in-app (#60A) — sennò sembra un prototipo. **S**
10. **FAB "+" in Home** (#74A) — deve poter aggiungere un evento senza cercarlo. **S**

## BLOCCO C — Un tocco di "wow" (perché resti impressionata)
*Poche cose, ad alto impatto visivo e sul cuore dell'app.*

11. **Ricerca AI che arricchisce sempre** (#6C) — è il momento magia: scrive "cena giovedì da Marco" e Keiko riempie orario/luogo/link. Questo è il "wow". **M**
12. **Copertine film reali** (#9A, TMDB) — via le immagini finte. **M**
13. **Foto sulle card principali + saluto personalizzato** (versione ridotta di #163/#164D + #152/#21) — foto reali dove esistono (film, eventi con categoria), template unico con scrim scuro; e un "Ciao 👋" con il nome. **M**

## BLOCCO D — Collaudo finale (mezz'ora, fondamentale)
14. **Giro "tocca ogni bottone"**: apro ogni schermata e clicco tutto, lista alla mano. Se qualcosa non fa nulla → o lo collego o lo nascondo. Nessuna eccezione. **S**

---

## Tempistica realistica
Sono ~14 step, quasi tutti S. Con un ritmo di **1-2 serate a blocco**:

- **Settimana 1:** Blocco A (stabilità) + Blocco B (tasti morti) → l'app è già *presentabile e onesta*.
- **Settimana 2:** Blocco C (wow) + Blocco D (collaudo) → l'app è *bella da mostrare*.

Se hai fretta, il minimo indispensabile per non fare brutta figura è **Blocco A + Blocco B + step 14** (una settimana): niente rotto, niente tasti morti. Il Blocco C è ciò che la fa dire "wow", ma è opzionale per la primissima prova.

## Ordine di attacco consigliato
A1 (tema) → A2 (logout) → B8 (mock) → B5/B6 (nascondi morti) → A4 (cache) → A3 (allenamento salva) → B10 (FAB) → B9 (prompt) → B7 (scambia/riprogramma) → C11 (AI) → C12 (film) → C13 (foto+saluto) → D14 (collaudo).

Dimmi "vai" e parto dal primo (tema scuro fisso).
