// Total bytes transferred for a full visit (intro, WebGL boot, scroll to the end).
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://127.0.0.1:4321';
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const mobile = W < 800;
const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: mobile, hasTouch: mobile });
const rows = [];
p.on('response', async (r) => { try { const buf = await r.body(); rows.push([buf.length, r.url().replace(BASE, ''), r.status()]); } catch {} });
await p.goto(BASE + '/', { waitUntil: 'load' });
const firstView = () => rows.reduce((s, r) => s + r[0], 0);
await p.waitForTimeout(3000);
const atIntro = firstView();
for (let y = 0; y < 30; y++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(250); }
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(4000);
const total = firstView();
console.log(JSON.stringify({ viewport: `${W}x${H}`, firstViewKB: Math.round(atIntro / 1024), fullVisitKB: Math.round(total / 1024), requests: rows.length, failed: rows.filter(r => r[2] >= 400).map(r => r[1]) }));
rows.sort((a, b) => b[0] - a[0]).slice(0, 12).forEach((r) => console.log(String(Math.round(r[0] / 1024)).padStart(6) + ' KB  ' + r[1]));
await b.close();
