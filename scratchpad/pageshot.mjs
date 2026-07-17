// Helper screenshot pagine interne (DoD): scuro + chiaro + grigi a 390px in docs/screens/.
// Uso: node scratchpad/pageshot.mjs <route> <basename>
//   es. node scratchpad/pageshot.mjs /salute salute
// Produce docs/screens/{basename}-scuro.png, {basename}-chiaro.png, {basename}-grigi.png
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const pw = [
  "/Users/matteozoccolan/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core",
  "/Users/matteozoccolan/.npm/_npx/e41f203b7505f1fb/node_modules/playwright-core",
].find((p) => fs.existsSync(path.join(p, "index.js")));
const { chromium } = require(pw);
const EXE = "/Users/matteozoccolan/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const [, , route, name] = process.argv;
if (!route || !name) { console.error("uso: node pageshot.mjs <route> <basename>"); process.exit(1); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "screens");
fs.mkdirSync(outDir, { recursive: true });
const base = `http://localhost:3000${route}`;
const sep = route.includes("?") ? "&" : "?";

const browser = await chromium.launch({ executablePath: EXE });
async function shot(mood, file, gray) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(`${base}${sep}mood=${mood}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));
  if (gray) await page.evaluate(() => { document.documentElement.style.filter = "grayscale(1)"; });
  await page.screenshot({ path: path.join(outDir, file), fullPage: true });
  await ctx.close();
  return errs;
}
const e1 = await shot("scuro", `${name}-scuro.png`, false);
const e2 = await shot("chiaro", `${name}-chiaro.png`, false);
await shot("scuro", `${name}-grigi.png`, true);
await browser.close();
console.log(`OK ${name}: -scuro -chiaro -grigi in docs/screens/`);
console.log("console errors scuro:", e1.length, e1.slice(0, 5));
console.log("console errors chiaro:", e2.length, e2.slice(0, 5));
