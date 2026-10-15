// Verifies the generated Content-Security-Policy does not break the site.
// Usage: node scripts/qa/csp-check.mjs <baseUrl> <endpointBaseUrl>
// (serve both builds with scripts/qa/static-server.mjs and the .headers.test*.json files)
import { chromium } from 'playwright';
const [BASE, EP] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const run = async (name, url, fn) => {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const v = [];
  p.on('console', (m) => /Content Security Policy|Refused to/.test(m.text()) && v.push(m.text().slice(0, 160)));
  p.on('pageerror', (e) => v.push('PAGEERROR ' + e.message));
  p.on('worker', (w) => w.on('console', (m) => /Content Security Policy|Refused/.test(m.text()) && v.push('worker: ' + m.text().slice(0, 160))));
  await p.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.log(`Content Security Policy violation: ${e.violatedDirective} ${e.blockedURI}`)));
  await p.goto(url);
  const extra = await fn(p);
  results.push({ name, violations: v, ...extra });
  console.log(`${v.length ? 'FAIL' : 'PASS'}  ${name}  ${JSON.stringify(extra)} ${v.join(' | ')}`);
  await p.close();
};
await run('home: intro, worker boot, scroll', BASE + '/', async (p) => {
  await p.waitForFunction(() => document.querySelector('[data-orbit-stage]').classList.contains('is-live'), null, { timeout: 90000 }).catch(() => {});
  for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 1500); await p.waitForTimeout(400); }
  return await p.evaluate(() => ({ live: document.querySelector('[data-orbit-stage]').classList.contains('is-live'), mode: document.querySelector('[data-orbit-stage]').dataset.stageMode, intro: document.documentElement.classList.contains('intro-done') }));
});
await run('contact submit to configured endpoint', EP + '/contact/', async (p) => {
  await p.route('https://forms.test/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}', headers: { 'access-control-allow-origin': '*' } }));
  await p.fill('#f-name', 'Ada Test'); await p.fill('#f-email', 'ada@example.org'); await p.fill('#f-message', 'We need a ground segment review for a small EO mission.'); await p.check('#f-consent');
  await p.click('button[type=submit]'); await p.waitForTimeout(1500);
  return { status: (await p.textContent('[data-form-status]')).slice(0, 40) };
});
await run('404 page', BASE + '/missing-page', async (p) => ({ h1: await p.textContent('h1') }));
await b.close();
process.exit(results.some((r) => r.violations.length) ? 1 : 0);
