// =====================================================================
// PORT 1:1  docs/mockups/keiko-final.html  ->  app/keiko.css
// Metodo (vincolante, vedi AGENTS.md): si COPIA, non si interpreta.
//   :root        -> .keiko
//   .phone.alt   -> .keiko.alt
//   .phone       -> .keiko
//   ogni altro selettore  -> discendente ".keiko <sel>"
//   @keyframes NAME -> @keyframes k_NAME  (+ rinomina negli animation:)
//   scaffold di pagina (html, body, .manifesto) -> SCARTATO
//   ordine dei blocchi PRESERVATO (gli override REV.* in fondo devono
//   restare dopo le regole base: contano).
// Uso: node scratchpad/port-css.mjs
// =====================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'docs/mockups/keiko-final.html'), 'utf8');

const s = html.indexOf('<style>');
const e = html.indexOf('</style>');
// via i commenti di sezione del mockup: come il port precedente, l'output
// generato è pulito (la tracciabilità resta nel mockup, fonte di verità).
const css = html.slice(s + '<style>'.length, e).replace(/\/\*[\s\S]*?\*\//g, '');

// --- tokenizza in regole top-level, con brace-matching ---
function splitRules(str) {
  const rules = [];
  let buf = '', i = 0;
  while (i < str.length) {
    const c = str[i];
    if (c === '{') {
      const prelude = buf;
      let d = 1, j = i + 1, body = '';
      while (j < str.length && d > 0) {
        if (str[j] === '{') d++;
        else if (str[j] === '}') d--;
        if (d > 0) body += str[j];
        j++;
      }
      rules.push({ prelude, body });
      buf = '';
      i = j;
    } else { buf += c; i++; }
  }
  const tail = buf.trim();               // eventuale coda non-regola (commenti)
  return { rules, tail };
}

// --- scoping di un singolo selettore ---
function scopeOne(sel) {
  let x = sel.trim();
  if (!x) return null;
  if (/^(html|body)\b/.test(x)) return null;       // scaffold di pagina
  if (/^\.manifesto\b/.test(x)) return null;        // scaffold di pagina
  x = x.replace(/:root/g, '.keiko');
  x = x.replace(/\.phone\.alt/g, '.keiko.alt');
  x = x.replace(/\.phone\.animMood/g, '.keiko.animMood');
  x = x.replace(/\.phone\b/g, '.keiko');
  if (x.startsWith('.keiko')) return x;
  if (x.startsWith('*')) return x.replace(/^\*/, '.keiko *');
  return '.keiko ' + x;
}
function scopeSelectorList(list) {
  return list.split(',').map(scopeOne).filter(Boolean).join(', ');
}

// --- passata 1: raccogli i nomi dei @keyframes (per rinominarli negli animation:) ---
const keyframeNames = [];
{
  const { rules } = splitRules(css);
  for (const r of rules) {
    const m = r.prelude.trim().match(/^@keyframes\s+([A-Za-z0-9_-]+)/);
    if (m) keyframeNames.push(m[1]);
  }
}
function renameAnimations(text) {
  let out = text;
  for (const n of keyframeNames) {
    // rinomina solo dentro il valore di animation / animation-name
    out = out.replace(new RegExp('(animation(?:-name)?\\s*:\\s*)' + n + '\\b', 'g'), '$1k_' + n);
  }
  return out;
}

// --- passata 2: emetti ---
function emit(str, indent = '') {
  const { rules } = splitRules(str);
  const parts = [];
  for (const { prelude, body } of rules) {
    const p = prelude.trim();
    if (p.startsWith('@keyframes')) {
      const m = p.match(/^@keyframes\s+([A-Za-z0-9_-]+)(.*)$/);
      parts.push(`@keyframes k_${m[1]}${m[2] || ''} {${body}}`);
    } else if (p.startsWith('@media') || p.startsWith('@supports')) {
      // ricorsione: scopa le regole interne, tieni il prelude
      const inner = emit(body, indent + '  ');
      parts.push(`${p} {\n${inner}\n}`);
    } else if (p.startsWith('@')) {
      parts.push(`${p} {${body}}`);            // @font-face ecc: invariato
    } else {
      const scoped = scopeSelectorList(p);
      if (!scoped) continue;                    // tutte le parti erano scaffold
      parts.push(`${scoped} {${renameAnimations(body)}}`);
    }
  }
  return parts.join('\n');
}

const HEADER = `/* =====================================================================
   KEIKO — CSS PORTATO 1:1 da docs/mockups/keiko-final.html
   Generato da scratchpad/port-css.mjs (NON modificare a mano: rigenerare).
   Scoping: :root->.keiko, .phone->.keiko, .phone.alt->.keiko.alt.
   Keyframes prefissati k_*. Scaffold di pagina (html/body/.manifesto) scartato.
   In fondo: "adattamenti minimi app" (NON valori del mockup) — vedi commenti.
   ===================================================================== */
`;

// coda "adattamenti minimi app" — NON sono valori del mockup, sono le regole
// che servono per far vivere la .phone dentro l'app a schermo intero.
const TAIL = `

/* ---- adattamenti minimi app (NON valori visivi del mockup) ----
   Il mockup è una "phone" 390x844; nell'app la .keiko riempie lo schermo. */
.keiko { width: 100%; max-width: none; height: 100dvh; border-radius: 0; border: 0; box-shadow: none; }
.keiko::before { position: fixed; } /* il bloom copre l'intero viewport durante lo scroll */
/* nel mockup le card sono <div onclick>; qui sono <a>: niente underline/colore link */
.keiko a { color: inherit; text-decoration: none; }
/* il font arrotondato del mockup viaggia su html/body (scaffold, scartato dal
   port): lo rimettiamo qui perché la .keiko lo erediti (approvato: look telefono). */
.keiko { font-family: var(--f); }
/* i tasti della topbar sono <button> reali (il click nativo scatta sempre su
   iOS Safari, dove <div onClick> delegato di React a volte no): neutralizza il
   chrome di default del button, il resto lo dà .icoBtn. */
.keiko button.icoBtn { -webkit-appearance: none; appearance: none; font: inherit; padding: 0; }

/* ---- REGOLE BASE (docs/UI-REGOLE-BASE.md) — vincolanti su ogni card ----
   Ogni card stacca dal fondo col trio completo; le art senza bordo nel mockup
   lo ricevono qui perché non affoghino (test scala di grigi). */
.keiko .hero, .keiko .mini { border: 1px solid var(--card-line); }

/* Biglietto strutturato: il mockup ha solo il treno. Per i voli l'aereo. */
.keiko .tkt.isFlight .times i::after { content: "✈️"; }

/* Reveal/glow: stessi valori del mockup ma via animazione CSS (finiscono SEMPRE
   visibili) invece dell'IntersectionObserver, incompatibile con i re-render React. */
@keyframes k_rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes k_glow { from { opacity: 0; } to { opacity: 1; } }
.keiko .rise { opacity: 1; transform: none; animation: k_rise .7s cubic-bezier(.2,.8,.2,1) both; }
.keiko .glowable::before { opacity: 1; animation: k_glow 1s ease .35s both; }

/* Hotel: categoria non nel mockup — gradiente fornito dal committente (oro caldo
   scuro, non viola). Serve per gli eventi hotel in hero e agenda. */
.keiko .art.hotel {
  background:
    radial-gradient(110% 80% at 88% -6%, rgba(214,178,110,.42) 0%, transparent 52%),
    radial-gradient(90% 70% at 10% 20%, rgba(120,95,45,.30) 0%, transparent 58%),
    linear-gradient(168deg,#54431F 0%,#2E240F 60%,#151007 100%);
}
`;

const output = HEADER + emit(css) + '\n' + TAIL;
fs.writeFileSync(path.join(root, 'app/keiko.css'), output);
console.log('keiko.css rigenerato:', output.length, 'byte,', keyframeNames.length, 'keyframes:', keyframeNames.join(','));
