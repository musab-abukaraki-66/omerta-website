// Quick visual probe: node scripts/qa/shoot.mjs <outDir> <w> <h> <path> [scrollYs...|selectors]
import { chromium } from 'playwright';
const [out, w, h, path = '/?nointro', ...stops] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const mobile = +w < 800;
const page = await browser.newPage({ viewport: { width: +w, height: +h }, isMobile: mobile, hasTouch: mobile });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => errors.push('FAILED ' + r.url()));
await page.goto('http://127.0.0.1:4321' + path, { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelector('[data-orbit-stage]')?.classList.contains('is-live') || !document.querySelector('[data-orbit-stage]'), null, { timeout: 60000 }).catch(() => errors.push('stage never live'));
await page.waitForTimeout(800);
const list = stops.length ? stops : ['0'];
for (const s of list) {
  const y = s.includes('@')
    ? await page.evaluate(([sel, f]) => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); return r.top + scrollY + f * Math.max(0, el.offsetHeight - innerHeight); }, [s.split('@')[0], +s.split('@')[1]])
    : /^[\d.]+$/.test(s) ? (s.includes('.') ? await page.evaluate((f) => f * (document.documentElement.scrollHeight - innerHeight), +s) : +s) : await page.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().top + scrollY, s);
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(1600);
  const name = `${out}/${w}x${h}-${String(s).replace(/[^\w.]/g, '_')}.png`;
  await page.screenshot({ path: name, timeout: 120000 });
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log(JSON.stringify({ errors, overflow, docH: await page.evaluate(() => document.documentElement.scrollHeight) }));
await browser.close();
