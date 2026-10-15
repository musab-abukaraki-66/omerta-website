// Renders the orbit stage at progress 0 without overlays and writes the hero poster
// (public/media/orbit-poster-{900,1600,2400}.webp) and the OG card (og-omerta.jpg).
// Needs a built site served locally: node scripts/qa/make-poster.mjs [baseUrl]
// Image encoding uses sharp, which is installed as a dependency of Astro.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
const BASE = process.argv[2] || 'http://127.0.0.1:4321';
const RAW = join(tmpdir(), 'omerta-poster-raw.png');
const OG = join(tmpdir(), 'omerta-og.png');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: 'reduce' });
await page.goto(BASE + '/?nointro', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('[data-orbit-stage]').classList.contains('is-live'), null, { timeout: 90000 });
await page.addStyleTag({ content: '.hero,.orbitc,.site-header,.grain,.ostage__scrim{display:none!important}' });
await page.waitForTimeout(1500);
await page.locator('[data-orbit-canvas]').screenshot({ path: RAW, timeout: 120000 });
// OG card
const svg = readFileSync('src/components/Wordmark.astro', 'utf8');
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const b64 = readFileSync(RAW).toString('base64');
await og.setContent(`<html><body style="margin:0;width:1200px;height:630px;background:#05070a url(data:image/png;base64,${b64}) center 70%/cover;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:monospace;color:#eceae4">
<svg viewBox="-2 -3 196 34" width="460" fill="none" stroke="#eceae4" stroke-width="2.2" stroke-linecap="square"><circle cx="14" cy="14" r="12"/><path d="M38 26V2l12 16 12-16v24"/><path d="M92 2H74v24h18M74 14h15"/><path d="M104 26V2h13a6 6 0 0 1 0 12h-13m11 0 9 12"/><path d="M134 2h22M145 2v24"/><path d="M166 26 178 2l12 24m-19.5-9h15"/><circle cx="14" cy="2" r="2.6" fill="#ff5a1f" stroke="none"/></svg>
<p style="margin-top:34px;letter-spacing:.3em;font-size:18px;text-transform:uppercase">Quiet precision, in orbit</p></body></html>`);
await og.screenshot({ path: OG });
await browser.close();

for (const w of [900, 1600, 2400]) {
  await sharp(RAW).resize({ width: w, height: Math.round(w * 0.625), fit: 'cover' }).webp({ quality: w > 1600 ? 72 : 78 }).toFile(`public/media/orbit-poster-${w}.webp`);
}
await sharp(OG).jpeg({ quality: 84, mozjpeg: true }).toFile('public/media/og-omerta.jpg');
console.log('Wrote public/media/orbit-poster-*.webp and og-omerta.jpg');
