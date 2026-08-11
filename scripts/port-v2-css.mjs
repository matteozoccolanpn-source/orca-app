/* Estrae il blocco <style> di docs/mockups/keiko-v2-mock.html e lo prefissa con `.k2`.
   Meccanico: nessun valore viene toccato. Regole:
   - :root resta :root (non prefissato)
   - @keyframes restano come sono (tranne la rinomina `pulse` -> `k2-pulse`, vedi report)
   - html/body/* diventano regole su .k2
   - il blocco #oldhome resta fuori
   Uso: node scripts/port-v2-css.mjs            (dalla radice del repo)
        node scripts/port-v2-css.mjs <mock.html> <out.css>
   Il perche' e il quando sta in scripts/README.md.
*/
import { readFileSync, writeFileSync } from 'node:fs';

/* Senza argomenti fa la cosa giusta: sorgente e destinazione sono sempre
   queste due. Gli argomenti restano per provare una variante senza
   sovrascrivere il foglio vero. */
const SRC = process.argv[2] ?? 'docs/mockups/keiko-v2-mock.html';
const OUT = process.argv[3] ?? 'app/keiko-v2.css';
const html = readFileSync(SRC, 'utf8');

const css = html.slice(
  html.indexOf('<style>') + '<style>'.length,
  html.indexOf('</style>'),
);

/* ── tokenizzatore a livello superiore: commenti, at-rule, regole ── */
function topLevel(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    // commento
    if (src.startsWith('/*', i)) {
      const end = src.indexOf('*/', i + 2) + 2;
      out.push({ type: 'comment', text: src.slice(i, end) });
      i = end;
      continue;
    }
    if (/\s/.test(src[i])) {
      const m = /^\s+/.exec(src.slice(i));
      out.push({ type: 'ws', text: m[0] });
      i += m[0].length;
      continue;
    }
    // regola: selettore fino a `{`, poi corpo bilanciato
    const open = src.indexOf('{', i);
    if (open === -1) break;
    const sel = src.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < src.length && depth > 0) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') depth--;
      j++;
    }
    out.push({ type: 'rule', sel, body: src.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

/* ── prefissa un singolo selettore ── */
function prefix(sel) {
  const parts = sel.split(',').map((s) => s.trim()).filter(Boolean);
  const done = [];
  for (const p of parts) {
    if (p === '*') {
      done.push('.k2', '.k2 *');
    } else if (p === 'html' || p === 'body') {
      done.push('.k2');
    } else if (p.startsWith('body:') || p.startsWith('body::')) {
      done.push('.k2' + p.slice('body'.length));
    } else if (p.startsWith('html:') || p.startsWith('html::')) {
      done.push('.k2' + p.slice('html'.length));
    } else {
      done.push('.k2 ' + p);
    }
  }
  // de-duplica mantenendo l'ordine (html,body -> .k2 due volte)
  return [...new Set(done)].join(', ');
}

const KEEP_KEYFRAME_RENAME = { pulse: 'k2-pulse' };

const chunks = [];
for (const t of topLevel(css)) {
  if (t.type === 'ws') { chunks.push(t.text); continue; }
  if (t.type === 'comment') { chunks.push(t.text); continue; }

  // il blocco della Home congelata resta fuori: si affronta nella sua ondata
  if (t.sel.includes('#oldhome')) continue;

  if (t.sel.startsWith('@keyframes')) {
    const name = t.sel.replace('@keyframes', '').trim();
    const newName = KEEP_KEYFRAME_RENAME[name] ?? name;
    chunks.push(`@keyframes ${newName}{${t.body}}`);
    continue;
  }
  /* `:root, .k2` e non solo `:root`: dentro l'app c'e' gia' `.keiko`, che
     ridefinisce --bg e compagnia. Se le variabili V2 stessero solo su :root,
     un `.k2` messo dentro un `.keiko` erediterebbe i colori vecchi. */
  if (t.sel === ':root') {
    chunks.push(`:root, .k2{${t.body}}`);
    continue;
  }
  chunks.push(`${prefix(t.sel)}{${t.body}}`);

  /* Il mock gira su una pagina nuda: il suo <body> ha line-height `normal`, e
     tutte le misure del foglio sono state disegnate lì sopra. Dentro l'app il
     preflight di Tailwind mette line-height:1.5 su <html>, che si eredita fin
     dentro .k2 e allunga OGNI riga senza line-height propria (h1 28px -> 33px,
     i titoli di sezione 20px -> 24,8px, i chip 35px -> 38px: alla fine della
     schermata sono 46px di scarto). Qui si rimette il valore che il mock ha
     davvero: non è un valore inventato, è quello misurato sul mock. */
  if (t.sel === 'body') chunks.push(`\n.k2{line-height:normal}`);
}

let out = chunks.join('');

/* Le due sostituzioni non-visive, dichiarate nel report:
   1. `animation:pulse ...` -> `k2-pulse` (Tailwind definisce già @keyframes pulse)
   2. i nomi-famiglia letterali diventano le variabili di next/font, che sono
      le UNICHE che caricano davvero Fraunces/Inter dentro l'app. */
out = out.replace(/animation:pulse /g, 'animation:k2-pulse ');
out = out.replace(/font-family:Fraunces,Georgia,serif/g,
  'font-family:var(--font-fraunces-v2),Fraunces,Georgia,serif');
out = out.replace(/font-family:Inter,-apple-system,system-ui,sans-serif/g,
  'font-family:var(--font-inter),Inter,-apple-system,system-ui,sans-serif');
out = out.replace(/font-family:Inter,sans-serif/g,
  'font-family:var(--font-inter),Inter,sans-serif');

/* L'UNICA sostituzione VISIVA, decisa da Matteo l'11 agosto 2026.
   Il pallino di sezione della Guarda resta viola — cinque sezioni vogliono
   cinque pallini distinguibili, e il viola e' l'unico spazio libero fra il blu
   dei Viaggi e la terracotta degli Eventi — ma il valore del mock (#A47BE0) e'
   piu' acceso degli altri quattro. #8F7AC0 sta sulla stessa saturazione della
   famiglia. Il mock non si tocca: la differenza vive qui, dichiarata.
   La regola per esteso sta in docs/UI-DECISIONI-V2.md. */
out = out.replace(/--c-guarda:#A47BE0/g, '--c-guarda:#8F7AC0');

/* ── LE CORREZIONI DELLA GUARDA (11 agosto 2026) ──
   Il mock gira in una finestra del desktop, dove la tacca e la barra di casa
   dell'iPhone non esistono: `env(safe-area-inset-*)` vale 0 e non si vede che
   manca. Sul telefono vero la testata finisce sotto la tacca. Qui si rimette
   il margine dove il mock non poteva accorgersene. */
const sostituisci = (da, a) => {
  if (!out.includes(da)) throw new Error('il mock e\' cambiato, questa correzione non attacca piu\':\n' + da);
  out = out.replace(da, a);
};

// 1 · il fondo pagina segue KeikoNav, che e' piu' alta della tab bar del mock
sostituisci('--pad-bottom:calc(116px + env(safe-area-inset-bottom))',
            '--pad-bottom:calc(128px + env(safe-area-inset-bottom))');
// 2 · la pagina parte sotto la tacca
sostituisci('.k2 .screen{position:relative;z-index:2;padding:16px 16px var(--pad-bottom)}',
            '.k2 .screen{position:relative;z-index:2;padding:calc(env(safe-area-inset-top) + 16px) 16px var(--pad-bottom)}');
// 3 · e cosi' la testata degli schermi pieni
sostituisci('backdrop-filter:blur(20px);\n  border-bottom:1px solid var(--hl);padding:12px 14px 10px}',
            'backdrop-filter:blur(20px);\n  border-bottom:1px solid var(--hl);padding:calc(env(safe-area-inset-top) + 12px) 14px 10px}');

out = out.trimEnd() + `

/* ══ AGGIUNTE FUORI DAL MOCK ══
   La riga dei chip non si ferma piu' a meta' di uno (scroll-snap), e i due
   orli sfumano solo dal lato dove c'e' ancora qualcosa da scorrere.
   Lo snap funziona ovunque; la sfumatura ha bisogno delle animazioni guidate
   dallo scorrimento, quindi sta in @supports: dove non c'e', la riga resta
   com'era. Deciso da Matteo l'11 agosto: un chip tagliato di netto non dice
   "c'e' dell'altro di lato", dice "si e' rotto qualcosa". */
.k2 .chips{scroll-snap-type:x mandatory;scroll-padding-left:16px;scroll-padding-right:16px}
.k2 .chips>*{scroll-snap-align:start}
@supports (animation-timeline: scroll()) {
  @property --k2-fl{syntax:'<length>';inherits:false;initial-value:0px}
  @property --k2-fr{syntax:'<length>';inherits:false;initial-value:0px}
  .k2 .chips{
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 var(--k2-fl),#000 calc(100% - var(--k2-fr)),transparent 100%);
    mask-image:linear-gradient(90deg,transparent 0,#000 var(--k2-fl),#000 calc(100% - var(--k2-fr)),transparent 100%);
    animation:k2-chips-orli linear both;
    animation-timeline:scroll(self inline);
  }
  @keyframes k2-chips-orli{
    from{--k2-fl:0px;--k2-fr:26px}
    to{--k2-fl:26px;--k2-fr:0px}
  }
}`;

const header = `/* =====================================================================
   KEIKO UI V2 — CSS PORTATO 1:1 da docs/mockups/keiko-v2-mock.html
   Generato da scratchpad/port-v2-css.mjs (NON modificare a mano: rigenerare).
   Scoping: ogni regola prefissata con .k2 · :root resta :root ·
   html/body/* diventano .k2 · il blocco #oldhome resta fuori (Home = sua ondata).
   Tre sostituzioni NON visive, tutte dichiarate nel report d'ondata:
   1) @keyframes pulse -> k2-pulse (Tailwind ne definisce già uno globale)
   2) font-family:Fraunces -> var(--font-fraunces-v2),Fraunces — istanza next/font
      variabile con asse ottico, la stessa che carica il mock (vedi layout.tsx)
   3) font-family:Inter    -> var(--font-inter),Inter        (next/font)
   Piu un ripristino: .k2{line-height:normal} — il preflight di Tailwind mette
   1.5 su <html> e si eredita dentro .k2, allungando ogni riga senza
   line-height propria (46px di scarto a fine schermata). 'normal' e' il valore
   che il mock ha davvero, misurato: non e' un valore nuovo.
   E UNA sostituzione visiva, decisa da Matteo l'11 agosto 2026:
   --c-guarda passa da #A47BE0 a #8F7AC0, stessa saturazione delle altre
   quattro famiglie. Vale SOLO come pallino di sezione (.dot): vedi
   docs/UI-DECISIONI-V2.md.
   Piu' le correzioni che il mock non poteva vedere, perche' gira in una
   finestra del desktop e non su un iPhone: la safe-area in cima a .screen e
   a .topbar, e --pad-bottom a 128px, che e' l'altezza vera di KeikoNav.
   In coda, il blocco AGGIUNTE FUORI DAL MOCK: snap e sfumatura dei chip.
   ===================================================================== */
`;

writeFileSync(OUT, header + out.trim() + '\n');
console.log('scritto', OUT, (header + out).length, 'byte');
