import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw=['/Users/matteozoccolan/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core','/Users/matteozoccolan/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core'].find(p=>fs.existsSync(path.join(p,'index.js')));
const { chromium } = require(pw);
const EXE='/Users/matteozoccolan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const b=await chromium.launch({executablePath:EXE});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
await p.goto('http://localhost:3000/v2/preview?debug',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
const btnTag = await p.evaluate(()=>document.querySelectorAll('.topbar button.icoBtn').length);
const dbg1 = await p.evaluate(()=>document.body.innerText.match(/build .*mood.*/)?.[0]||'NO DEBUG BAR');
// tap mood (secondo button icoBtn)
await p.click('.topbar button.icoBtn:nth-of-type(2)');
await p.waitForTimeout(500);
const after = await p.evaluate(()=>({cls:document.querySelector('.keiko').className, dbg:document.body.innerText.match(/tap \d+ · mood \w+/)?.[0]}));
// icona calendario (primo button) apre calPanel
await p.click('.topbar button.icoBtn:nth-of-type(1)');
await p.waitForTimeout(400);
const calOpen = await p.evaluate(()=>document.querySelector('.calPanel')?.classList.contains('open'));
console.log(JSON.stringify({topbarButtons:btnTag, debugBar:dbg1, afterTapClass:after.cls, afterTapDbg:after.dbg, calOpensFromIcon:calOpen},null,2));
await b.close();
