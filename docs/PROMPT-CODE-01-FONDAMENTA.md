# Ondata 1 — Fondamenta della UI V2
### prompt per Claude Code · da eseguire in `orca-app`

> È il primo di una serie. Questa ondata **non tocca nessuna sezione esistente**:
> crea il foglio di stile, i componenti condivisi e una rotta di parità.
> Le sezioni si portano una per volta, nelle ondate successive.

---

Lavori nel repo `orca-app` (Next.js 16, React 19, TypeScript, Tailwind v4 CSS-first).
Rispetta `AGENTS.md`: modifiche piccole e mirate, spiegate in italiano semplice;
non rifattorizzare file scollegati dal compito; **non toccare `lib/` né `app/api/`**;
`npx tsc --noEmit` e `npm run build` verdi **prima** di ogni commit;
**mai committare senza l'ok esplicito di Matteo**.

## Il materiale

Il riferimento è `docs/mockups/keiko-v2-mock.html`: un mock React precompilato,
un file solo. Dentro ci sono, in quest'ordine: un blocco `<style>` con tutto il
sistema, e il codice compilato delle schermate.

Le specifiche che quel mock incarna: `docs/UI-DECISIONI-V2.md` (manifesto),
`docs/UI-CUCINA-LOCKED.md`, `docs/UI-ALLENAMENTO-LOCKED.md`,
`docs/UI-GUARDA-AUDIT.md`, `docs/SPEC-VIAGGI-DIREZIONE.md`,
`docs/UI-V2-REVISIONE.md`. Leggile: servono a capire perché una regola è una
regola, ma **la fonte di verità visiva è il mock**.

## 1 · Il foglio di stile

Crea `app/keiko-v2.css` **estraendo meccanicamente** il blocco `<style>` del mock.
Non riscriverlo a mano e non «migliorarlo»: deve restare identico.

- ogni regola va prefissata con `.k2 ` (esempio: `.srf{…}` → `.k2 .srf{…}`);
- le variabili in `:root` restano in `:root`, **non** prefissate;
- i blocchi `@keyframes` restano come sono;
- le regole su `body`, `html`, `*` diventano regole su `.k2`;
- le regole del blocco `#oldhome` (la Home congelata) **lasciale fuori**: la Home
  si affronta nella sua ondata.

Importalo in `app/globals.css` con una sola riga, dopo gli import esistenti.
`app/keiko.css` non si tocca: è tutto sotto `.keiko`, quindi i due fogli non
collidono. Verifica questa affermazione prima di procedere; se trovi una
collisione, fermati e segnalala invece di inventare un rimedio.

## 2 · I componenti condivisi

Crea `app/components/v2/` con questi file, tipizzati, **senza logica di dominio**:

- `icons.tsx` — il set unico del mock (stroke 1.8, size come prop)
- `Sec.tsx` — titolo di sezione: `children`, `sm`, `more`, `onMore`
- `Ask.tsx` — la barra; `AskPanel.tsx` — il pannello a cinque stati
  (fermo → sta pensando → anteprima con diff → fatto → tetto raggiunto).
  Il pannello prende il diff come prop: **niente chiamate di rete qui**.
- `Check.tsx` (la spunta che si disegna) · `Ring.tsx` (l'anello) ·
  `DChips.tsx` (i chip-dato) · `Chip.tsx` (i chip-filtro)
- `Content.tsx` · `Poster.tsx` (2:3 e variante quadrata) · `DayCard.tsx` ·
  `Feature.tsx`
- `Sheet.tsx` (foglio dal basso, chiusura con maniglia e tocco fuori) ·
  `SheetHero.tsx`
- `Empty.tsx` · `Skeleton.tsx` · `Feedback.tsx` (pollici + «spiegami perché») ·
  `Step.tsx` (lo stepper − valore +)
- `Img.tsx` — la foto che sfuma sul colore dominante invece di apparire

Regole: nessun componente nuovo oltre a questi senza motivo scritto; i nomi
delle classi CSS restano quelli del mock; niente `any`.

## 3 · La rotta di parità

Crea `app/v2/keiko/page.tsx` che monta le schermate V2 con **dati finti**,
presi dal mock e messi in `app/components/v2/mockData.ts`.
È lo stesso metodo che c'è già in `app/v2/preview/page.tsx` («TAPPA 1 — parità
col mockup, DATI FINTI»): quella rotta vecchia lasciala dov'è.

Copri, in questa ondata, **solo Guarda** come schermata di prova: serve a
dimostrare che foglio e componenti reggono. Cucina, Allenamento, Viaggi e Home
arrivano nelle ondate successive.

**Obiettivo unico e misurabile**: lo screenshot di `/v2/keiko` a **430 × 932,
dpr 2** dev'essere indistinguibile dalla stessa schermata del mock. Verificalo
tu con Playwright, affiancando le due immagini, e dimmi dove differiscono.

## 4 · Cosa NON portare

Dal mock restano fuori, perché sono impalcature da revisione:
il pannello «Stati da provare» dentro il profilo, la «Nota di sistema ·
contrasto» in Gestione scheda, i toast segnaposto («Aperto…», «Segnato…») e
tutti i dati finti fuori da `mockData.ts`.

## 5 · Cosa consegnare

1. I file creati, con `npx tsc --noEmit` e `npm run build` verdi.
2. Gli screenshot del confronto mock ↔ `/v2/keiko`, e l'elenco delle
   differenze che restano.
3. In fondo alla risposta, **tre righe**: cosa hai fatto, cosa hai lasciato
   aperto, e la stima in ore per l'ondata successiva (Guarda con i dati veri).

Non committare finché Matteo non dice di sì.
