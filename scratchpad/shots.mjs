// Screenshot di verifica TAPPA 1 — salva in docs/screens/.
// App /v2/preview (scuro/chiaro/pannello) + mockup affiancato, a 390px.
// Risolve playwright-core dalla cache npx (nessuna dipendenza aggiunta al progetto).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const CANDS = [
  '/Users/matteozoccolan/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core',
  '/Users/matteozoccolan/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core',
];
const pwPath = CANDS.find((p) => fs.existsSync(path.join(p, 'index.js')));
const { chromium } = require(pwPath);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs', 'screens');
fs.mkdirSync(outDir, { recursive: true });
const APP = 'http://localhost:3000/v2/preview';
const MOCK = 'file://' + path.join(root, 'docs', 'mockups', 'keiko-final.html');

const EXE = '/Users/matteozoccolan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE });

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  return ctx.newPage();
}
const hideDev = (page) => page.evaluate(() => {
  document.querySelectorAll('nextjs-portal').forEach((e) => e.remove());
});
const shot = async (page, name) => { await hideDev(page); return page.screenshot({ path: path.join(outDir, name) }); };
const gray = (page, on) => page.evaluate((g) => { document.documentElement.style.filter = g ? 'grayscale(1)' : ''; }, on);

// ---------- APP ----------
{
  const page = await newPage();
  await page.goto(APP, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);            // reveal .rise finiscono l'animazione
  await shot(page, 'home-scuro.png');
  await gray(page, true); await shot(page, 'home-scuro-grigi.png'); await gray(page, false);

  // chiaro: click sul tasto mood (sole/luna)
  await page.click('[title="Mood chiaro/scuro"]');
  await page.waitForTimeout(2200);
  await shot(page, 'home-chiaro.png');
  await gray(page, true); await shot(page, 'home-chiaro-grigi.png'); await gray(page, false);

  // pannello treno: torna scuro, apri il primo hero
  await page.click('[title="Mood chiaro/scuro"]');
  await page.waitForTimeout(2200);
  await page.click('#heroRow .hero h2');
  await page.waitForSelector('.evPanel.open', { timeout: 3000 });
  await page.waitForTimeout(700);
  await shot(page, 'pannello-treno.png');
  await page.close();
}

// ---------- MOCKUP (riferimento) ----------
{
  const page = await newPage();
  await page.goto(MOCK, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2400);            // splash del mockup si chiude a 2s
  const phone = await page.$('#phone');
  await phone.screenshot({ path: path.join(outDir, 'mockup-scuro.png') });

  await page.click('[title="Mood chiaro/scuro"]');
  await page.waitForTimeout(2200);
  await phone.screenshot({ path: path.join(outDir, 'mockup-chiaro.png') });

  await page.click('[title="Mood chiaro/scuro"]');
  await page.waitForTimeout(2200);
  await page.click('#heroRow .hero h2');
  await page.waitForTimeout(700);
  await phone.screenshot({ path: path.join(outDir, 'mockup-treno.png') });
  await page.close();
}

await browser.close();
console.log('OK — screenshot in docs/screens/:', fs.readdirSync(outDir).filter((f) => f.endsWith('.png')).join(', '));
