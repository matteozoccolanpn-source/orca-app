import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw = ['/Users/matteozoccolan/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core','/Users/matteozoccolan/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core'].find(p=>fs.existsSync(path.join(p,'index.js')));
const { chromium } = require(pw);
const EXE='/Users/matteozoccolan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const b=await chromium.launch({executablePath:EXE});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
await p.goto('http://localhost:3000/?v2',{waitUntil:'networkidle'});
await p.waitForTimeout(1400);
await p.evaluate(()=>document.querySelectorAll('nextjs-portal').forEach(e=>e.remove()));
await p.screenshot({path:'docs/screens/live-scuro.png'});
// quanti hero/mini reali?
const info = await p.evaluate(()=>({heroes:document.querySelectorAll('#heroRow .hero').length, minis:document.querySelectorAll('#miniRow .mini').length, kick:document.querySelector('.kick .over')?.textContent, lede:document.querySelector('.lede')?.textContent, heroTitle:document.querySelector('#heroRow .hero h2')?.textContent}));
console.log('LIVE:', JSON.stringify(info));
// chiaro
await p.click('[title="Mood chiaro/scuro"]'); await p.waitForTimeout(2200);
await p.screenshot({path:'docs/screens/live-chiaro.png'});
await b.close();
