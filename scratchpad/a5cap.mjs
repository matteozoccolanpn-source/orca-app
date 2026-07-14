import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw=['/Users/matteozoccolan/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core','/Users/matteozoccolan/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core'].find(p=>fs.existsSync(path.join(p,'index.js')));
const { chromium } = require(pw);
const EXE='/Users/matteozoccolan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const b=await chromium.launch({executablePath:EXE});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:3000/?v2',{waitUntil:'networkidle'}); await p.waitForTimeout(1300);
await p.evaluate(()=>document.querySelectorAll('nextjs-portal').forEach(e=>e.remove()));
// AGENDA: click "In arrivo"
await p.click('.sec.rise'); await p.waitForSelector('#agendaView.open',{timeout:3000}); await p.waitForTimeout(600);
await p.screenshot({path:'docs/screens/agenda-live-scuro.png'});
console.log('agenda rows:', await p.evaluate(()=>document.querySelectorAll('#agendaView .agRow').length));
// torna home, apri un giorno: tocca la pill di oggi poi "Apri il giorno"
await p.click('#agendaView .back'); await p.waitForTimeout(400);
await p.click('.week .day.today'); await p.waitForTimeout(300);
const hasOpen = await p.$('.peek.open .openBtn');
if(hasOpen){ await hasOpen.click(); await p.waitForSelector('#dayPanel.open',{timeout:3000}); await p.waitForTimeout(500);
  await p.screenshot({path:'docs/screens/daypanel-live-scuro.png'});
  console.log('daypanel todos:', await p.evaluate(()=>document.querySelectorAll('#dayPanel .todo').length), 'title:', await p.evaluate(()=>document.querySelector('#dayPanel h3')?.textContent));
} else console.log('peek non aperto');
console.log('console errors:', errs.length, errs.slice(0,3));
await b.close();
