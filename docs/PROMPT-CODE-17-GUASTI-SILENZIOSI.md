# I guasti che si travestono da risposte
### prompt per Claude Code · da eseguire **prima** della PARTE 3 del ricettario

> Nasce dalla tua ricognizione: 173 `catch`, 51 morbidi, **5 gravi**. Qui si
> chiudono i cinque. Gli altri sono elencati in fondo e restano scritti, non
> dimenticati.

---

Rispetta `AGENTS.md`: modifiche piccole e mirate; niente rifattorizzazioni;
`npx tsc --noEmit` e `npm run build` verdi; **mai committare senza l'ok
esplicito di Matteo**.

**Autorizzazione**: `app/api/cron/tick/`, `app/api/cron/reminders/`,
`app/api/cucina/search/`, `lib/supabase.ts`, `lib/ai.ts` — solo per i punti
elencati qui. Niente altro.

---

## La regola, e viene da un pezzo che hai scritto tu

`lib/ai.ts:217` — `speseOggi` torna **-1**, non 0. Un valore che **non può
essere confuso** con una risposta vera, il chiamante lo controlla, e accanto c'è
scritto perché.

> **Un `catch` non può restituire un valore che assomigli a un risultato
> legittimo.** O dichiara il guasto in modo distinguibile, o rilancia.

Tre volte in questo progetto un ripiego plausibile ha tenuto in vita una bugia:
il contatore dei costi (3× sbagliato per settimane), la lista della spesa (rotta
dall'inizio), la ripesca (`ripescati: 0`, morta dal giorno uno). Sempre la
stessa forma.

---

## 1 · I due cron che cancellano — è il punto per cui questo documento esiste

`app/api/cron/tick/route.ts:64` e `app/api/cron/reminders/route.ts:67`.

```
try { await sendPush(...) }
catch { await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint) }
```

Il commento dice «410/404 = scaduta → elimina». Il codice **non guarda il codice
di stato**. Qualunque eccezione disiscrive il telefono per sempre, in silenzio.

⚠️ Questo gira **in produzione, ogni ora, senza nessuno che guardi**. Se le
variabili VAPID andassero storte, il primo giro cancellerebbe tutte le
sottoscrizioni di tutti in una passata — e non ci sarebbe traccia di cosa è
successo.

**Cosa fare:**

- si cancella **solo** su `404` e `410`, letti da `WebPushError.statusCode`.
  L'informazione c'è già;
- ogni altro errore: **la sottoscrizione resta**, e si registra cosa è successo
  con l'endpoint e lo stato;
- 🚫 nessuna cancellazione «per sicurezza». Una notifica persa si recupera, una
  sottoscrizione cancellata richiede che l'utente riabiliti le notifiche a mano,
  e nessuno lo fa.

## 2 · Gli stessi cron: la lettura fallita che diventa «nessun utente»

Righe 26 e 49: l'`error` della `select` è buttato via nella destrutturazione,
`subs` è `undefined`, il ciclo non gira, la rotta risponde **200 `{ sent: 0 }`**.
Un guasto totale che nei log sembra una giornata tranquilla.

**Cosa fare**: guarda l'`error`. Se la lettura fallisce, la rotta **non risponde
200** — deve risultare fallita anche a chi guarda solo l'elenco delle esecuzioni,
perché è l'unica cosa che qualcuno guarderà mai.

⚠️ Distingui i due casi nel corpo della risposta: «zero sottoscrizioni» e «non
sono riuscito a leggerle» non possono avere la stessa forma.

## 3 · La ricerca che dice una cosa falsa sul mondo

`app/api/cucina/search/route.ts:556`: risponde `{ risultati: [], errore: … }`
con **status 200**, e `errore` non è letto da nessuno (verificato: zero
occorrenze in `CucinaView`).

⚠️ **Il filtro di ieri ha peggiorato il danno**: prima si leggeva «non ho trovato
niente», adesso si legge «di questa non ho trovato nessuna versione con il
procedimento scritto». Cioè Keiko **afferma una cosa sul mondo** quando in realtà
è Tavily a essere giù. È una regressione nostra, di questa settimana.

**Cosa fare**: quando la ricerca è caduta, la schermata lo dice — «non sono
riuscito a cercare adesso», con la possibilità di riprovare. Non è lo stato
vuoto: è un altro stato, e va scritto.

🚫 Niente «Qualcosa non torna, riprovo». È la frase che ha nascosto la lista
della spesa rotta per mesi: minimizza, quindi nessuno la segnala.

## 4 · La mina armata di ieri

`app/api/cucina/search/route.ts:263`: passi `userId` come argomento, giusto. Ma
se fosse `null`, `risolviCtx` (`lib/ai.ts:134`) chiamerebbe `currentUserId()` →
`auth()` → `headers()` **dentro la cache**, e si ricadrebbe nello stesso crash
che il `catch` mangia.

Oggi non succede perché la rotta è protetta. **Disarmala lo stesso**: rendi
impossibile arrivare lì senza `userId`, in modo che sia il tipo o un controllo
esplicito a impedirlo, non la fortuna della rotta.

## 5 · Le tre letture che mostrano il vuoto

`lib/supabase.ts:1543` `getRecipes`, `:1643` `getShoppingItems`, `:147`
`getUpcomingTickets` → `[]`.

Al supermercato, davanti allo scaffale, **«non hai niente da comprare» e «il
database non risponde» sono due frasi molto diverse**. Aggravante: in
`app/cucina/page.tsx:25` stanno in un `Promise.all`, quindi se cade solo la
spesa il resto della pagina è perfetto e quella sezione mente da sola.

**Cosa fare qui e adesso**: la funzione deve **distinguere** i due casi al
chiamante — vuoto vero contro lettura caduta. Come lo rappresenti decidilo tu
(il modello è `-1` di `speseOggi`), ma dev'essere impossibile confonderli.

⚠️ **Il testo nell'interfaccia per il caso «caduta» NON si fa qui.** Sono tre
schermate e va scritto con cura: va nel giro finale. Qui basta che il dato
arrivi distinguibile, così quando scriveremo la frase ci sarà su cosa
appoggiarla.

Dimmi in quali punti dell'interfaccia il nuovo stato arriva senza essere
gestito: sarà la lista di partenza del giro finale.

---

## Cosa NON si tocca adesso

I 🟠 medi e i 🟡 lievi della tua ricognizione. In particolare:

- `onboarded_at → null`, `eventi dei battiti → []`, `event-enrich → null`,
  `films.ts → []`, `setWatchProgress → false`;
- i venticinque di foto e decorazioni (unsplash, tmdb, spotify, places…): lì
  `null` significa onestamente «niente immagine» e l'interfaccia ha già il suo
  ripiego. **Non sono difetti.**

📌 Scrivi i 🟠 in `docs/NON-ORA.md` con una riga ciascuna, così esistono senza
occupare posto.

---

## Come verificare

1. `npx tsc --noEmit` e `npm run build` verdi.
2. **Il punto 1 si prova rompendolo**: forza un errore di rete in `sendPush` e
   verifica che la sottoscrizione **ci sia ancora** dopo. Poi forza un 410 e
   verifica che sparisca. Sono i due casi, e vanno visti tutti e due.
3. **Il punto 2**: fai fallire la `select` e verifica che la rotta non risponda
   200.
4. **Il punto 3**: fai cadere la ricerca (chiave sbagliata) e guarda cosa legge
   uno sullo schermo. Deve capire che è Keiko a non farcela, non che la ricetta
   non esiste.
5. A **430 × 932 dpr 2**.

## Cosa consegnare

Voce per voce con **fatto / non fatto / rotto**, l'elenco dei punti
dell'interfaccia dove il nuovo stato «caduta» arriva non gestito, e tre righe:
cosa hai portato, cosa hai lasciato aperto, e ogni punto in cui hai dovuto
decidere qualcosa che questo documento non copriva.

Non committare finché Matteo non dice di sì.
