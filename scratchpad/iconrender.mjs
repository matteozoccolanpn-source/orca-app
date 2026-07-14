import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw=['/Users/matteozoccolan/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core','/Users/matteozoccolan/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core'].find(p=>fs.existsSync(path.join(p,'index.js')));
const { chromium } = require(pw);
const EXE='/Users/matteozoccolan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const svg = fs.readFileSync('public/keiko-icon.svg','utf8');
const b=await chromium.launch({executablePath:EXE});
async function render(size, out){
  const ctx=await b.newContext({viewport:{width:size,height:size},deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.setContent(`<!doctype html><html><body style="margin:0;padding:0"><div style="width:${size}px;height:${size}px">${svg.replace('<svg','<svg width="'+size+'" height="'+size+'"')}</div></body></html>`);
  await p.waitForTimeout(200);
  await p.screenshot({path:out,omitBackground:false});
  await ctx.close();
  console.log('OK', out, size);
}
await render(512,'public/icon-512.png');
await render(192,'public/icon-192.png');
await render(180,'public/apple-touch-icon.png');
await b.close();
