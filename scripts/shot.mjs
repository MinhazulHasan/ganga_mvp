// Screenshot helper for visual QA.
// Usage: node scripts/shot.mjs <path> <out.png> [--w=1440] [--h=900] [--theme=light|dark] [--full] [--scale=1] [--wait=1200] [--click=<css>]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = (await import("playwright")).default; }
const [, , path = "/", out = "/tmp/shot.png", ...rest] = process.argv;
const opt = Object.fromEntries(rest.map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const width = Number(opt.w ?? 1440), height = Number(opt.h ?? 900), scale = Number(opt.scale ?? 1);
const theme = opt.theme === "dark" ? "dark" : "light";
const browser = await playwright.chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, colorScheme: theme, reducedMotion: opt.motion ? "no-preference" : "reduce" });
await ctx.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(`http://localhost:${opt.port ?? 3000}${path}`, { waitUntil: "networkidle", timeout: 90000 });
if (opt.click) { await page.click(String(opt.click)); }
if (opt.full) {
  // scroll through the page so whileInView animations fire, then return to the top
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += Math.round(height * 0.6)) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
}
await page.waitForTimeout(Number(opt.wait ?? 1200));
await page.screenshot({ path: out, fullPage: !!opt.full });
await browser.close();
if (errors.length) console.log("PAGE ERRORS:\n" + errors.slice(0, 10).join("\n")); else console.log("ok " + out);
