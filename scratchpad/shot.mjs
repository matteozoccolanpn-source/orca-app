// Strumento screenshot Keiko — salva in docs/screens/ a larghezza fissa (default 390px),
// tema scuro o chiaro via localStorage 'keiko-theme'. Timeout controllato da noi.
// Uso: node scratchpad/shot.mjs <url> <outName> <dark|light> [width]
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'url';
import path from 'path';

const [,, url, outName, theme = 'dark', widthArg = '390'] = process.argv;
if (!url || !outName) { console.error('uso: node shot.mjs <url> <out> <dark|light> [width]'); process.exit(1); }

const width = parseInt(widthArg, 10);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs', 'screens', outName);

const browser = await chromium.launch({ channel: undefined });
const ctx = await browser.newContext({
  viewport: { width, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

// file:// (mockup) non ha localStorage utile; per l'app impostiamo il tema prima del load.
const isHttp = url.startsWith('http');
if (isHttp) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => localStorage.setItem('keiko-theme', t), theme);
}
await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
// il mockup usa una classe .alt per il chiaro sul .phone: la applichiamo se serve
if (!isHttp) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle('dark', t === 'dark');
    const ph = document.querySelector('.phone');
    if (ph) ph.classList.toggle('alt', t === 'light');
  }, theme);
}
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('OK ->', path.relative(root, out));
