// Interaction & acceptance tests. Usage: node scripts/qa/interactions.mjs [baseUrl] [endpointBaseUrl]
// Requires a running preview server (npm run preview). The optional second URL points
// at a build made with PUBLIC_CONTACT_ENDPOINT set, to test the configured form path.
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:4321';
const EP_BASE = process.argv[3];
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const results = [];
const check = (id, name, pass, detail = '') => {
  results.push({ id, name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}${detail ? '  — ' + detail : ''}`);
};

const browser = await chromium.launch({ args: ARGS });
const newPage = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()));
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('requestfailed', (r) => page.errors.push('FAILED ' + r.url()));
  return page;
};

/* F1 — every link resolves */
{
  const page = await newPage();
  const bad = [];
  for (const path of ['/', '/contact/', '/404']) {
    await page.goto(BASE + path + '?nointro');
    const links = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const href of links) {
      if (href === '#' || href === '') bad.push(`${path}: empty href`);
      if (/^(mailto|https?:)/.test(href) && !href.startsWith(BASE)) continue;
      const url = new URL(href, BASE + path);
      if (url.hash && url.hash !== '#top') {
        const res = await page.request.get(url.origin + url.pathname);
        const html = await res.text();
        if (!html.includes(`id="${url.hash.slice(1)}"`)) bad.push(`${path}: missing target ${href}`);
      } else if (!url.hash) {
        const res = await page.request.get(url.href);
        if (res.status() !== 200) bad.push(`${path}: ${href} → ${res.status()}`);
      }
    }
  }
  check('F1', 'All internal links and anchors resolve; no empty hrefs', bad.length === 0, bad.join('; '));
  await page.context().close();
}

/* F2 — menu */
{
  const page = await newPage();
  await page.goto(BASE + '/?nointro');
  const t = page.locator('[data-menu-toggle]');
  await t.click();
  await page.waitForTimeout(800);
  const expanded = await t.getAttribute('aria-expanded');
  const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
  const inertMain = await page.evaluate(() => document.querySelector('main').inert);
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  const trapped = await page.evaluate(() => !!document.activeElement.closest('[data-menu], [data-menu-toggle]'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const closed = (await t.getAttribute('aria-expanded')) === 'false' && (await page.locator('[data-menu]').isHidden());
  const focusBack = await page.evaluate(() => document.activeElement?.hasAttribute('data-menu-toggle'));
  check('F2a', 'Menu opens, sets aria-expanded, focuses first link, inerts page', expanded === 'true' && /01\s*Orbit/.test(focused) && inertMain, `focus="${focused}"`);
  check('F2b', 'Focus trapped while open', trapped);
  check('F2c', 'Esc closes and restores focus to toggle', closed && focusBack);
  await t.click();
  await page.waitForTimeout(800);
  await page.locator('[data-menu-link]', { hasText: 'Observation' }).click();
  await page.waitForTimeout(2500);
  const pos = await page.evaluate(() => Math.abs(document.querySelector('#observation').getBoundingClientRect().top));
  const hh = await page.evaluate(() => document.querySelector('[data-header]').offsetHeight);
  check('F2d', 'Menu link closes menu and scrolls chapter to just below the header', (await t.getAttribute('aria-expanded')) === 'false' && Math.abs(pos - hh) < 24, `offset=${pos.toFixed(0)}px, header=${hh}px`);
  await page.context().close();
}

/* V1 — header recolours on light chapter; M1 — native scroll + anchor via the index */
{
  const page = await newPage();
  await page.goto(BASE + '/?nointro');
  await page.locator('[data-menu-toggle]').click();
  await page.waitForTimeout(800);
  await page.locator('[data-menu-link]', { hasText: 'Orbit' }).click();
  await page.waitForTimeout(2500);
  const hash = await page.evaluate(() => location.hash);
  const off = await page.evaluate(() => Math.abs(document.querySelector('#orbit').getBoundingClientRect().top));
  const hh = await page.evaluate(() => document.querySelector('[data-header]').offsetHeight);
  check('M1a', 'Index link scrolls to #orbit (below header) and updates the URL', hash === '#orbit' && Math.abs(off - hh) < 24, `offset=${off.toFixed(0)}px`);
  await page.keyboard.press('End');
  // Native smooth scrolling over ~12k px can take >2 s under software GL: wait for the
  // end (up to 8 s) instead of sampling at a fixed time.
  const atEnd = await page
    .waitForFunction(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 4, null, { timeout: 8000 })
    .then(() => true, () => false);
  check('M1b', 'Keyboard End scrolls the native document', atEnd);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#capabilities').offsetTop + 200));
  await page.waitForTimeout(1200);
  const theme = await page.getAttribute('[data-header]', 'data-theme');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);
  const theme2 = await page.getAttribute('[data-header]', 'data-theme');
  check('V1', 'Header switches to light on Capabilities and back to dark', theme === 'light' && theme2 === 'dark', `${theme} → ${theme2}`);
  check('C1', 'No console errors or failed requests (home, scripted scroll)', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
}

/* M4 — WebGL idles off-screen; F5 — no-WebGL fallback */
{
  const page = await newPage();
  await page.goto(BASE + '/?nointro');
  await page.waitForFunction(() => window.__omertaStage && document.querySelector('[data-orbit-stage]').classList.contains('is-live'), null, { timeout: 90000 });
  const a = await page.evaluate(() => window.__omertaStage.frames());
  await page.waitForTimeout(1500);
  const b = await page.evaluate(() => window.__omertaStage.frames());
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#ground').offsetTop));
  await page.waitForTimeout(3000); // smooth scroll + async worker messages settle
  const c = await page.evaluate(() => window.__omertaStage.frames());
  await page.waitForTimeout(2000);
  const d = await page.evaluate(() => window.__omertaStage.frames());
  check('M4', 'WebGL renders while visible and stops off-screen', b > a && d === c, `visible +${b - a} frames / 1.5 s, off-screen +${d - c} frames / 2 s`);
  const ds = await page.evaluate(() => ({ ...document.querySelector('[data-orbit-stage]').dataset }));
  check('W1', 'Stage runs in a Web Worker (OffscreenCanvas) and boots without user input', ds.stageMode === 'worker' && ds.stageBoot === 'auto-worker', JSON.stringify({ mode: ds.stageMode, boot: ds.stageBoot }));
  await page.context().close();
}
{
  // Simulate a browser without WebGL2 (three.js requirement) by removing the API.
  // (Chromium's --disable-webgl still lets a worker's OffscreenCanvas obtain a context.)
  const b2 = await chromium.launch();
  const page = await b2.newPage();
  await page.addInitScript(() => { delete window.WebGL2RenderingContext; });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(BASE + '/?nointro');
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({
    noGl: document.querySelector('[data-orbit-stage]').classList.contains('no-webgl'),
    poster: getComputedStyle(document.querySelector('.ostage__poster')).opacity,
    loaded: document.querySelector('.ostage__poster').complete && document.querySelector('.ostage__poster').naturalWidth > 0,
  }));
  check('F5', 'Without WebGL the poster is shown and no errors occur', st.noGl && st.poster === '1' && st.loaded && errs.length === 0, JSON.stringify(st) + errs.join('|'));
  await b2.close();
}

/* W2 — main-thread fallback waits for real interaction; W3 — context loss degrades to poster */
{
  const page = await newPage();
  await page.addInitScript(() => { delete window.OffscreenCanvas; });
  await page.goto(BASE + '/?nointro');
  await page.waitForTimeout(3000);
  const before = await page.evaluate(() => document.querySelector('[data-orbit-stage]').dataset.stageBoot ?? null);
  await page.mouse.move(400, 300);
  await page.waitForTimeout(500);
  const afterMove = await page.evaluate(() => document.querySelector('[data-orbit-stage]').dataset.stageBoot ?? null);
  await page.mouse.wheel(0, 40);
  await page.waitForFunction(() => document.querySelector('[data-orbit-stage]').classList.contains('is-live'), null, { timeout: 90000 }).catch(() => {});
  const ds = await page.evaluate(() => ({ ...document.querySelector('[data-orbit-stage]').dataset, live: document.querySelector('[data-orbit-stage]').classList.contains('is-live') }));
  check('W2', 'Fallback (no OffscreenCanvas): no boot before input, ignores bare mouse moves, boots on wheel, renders on main thread', before === null && afterMove === null && ds.stageMode === 'main' && ds.stageBoot === 'wheel' && ds.live, JSON.stringify({ before, afterMove, mode: ds.stageMode, boot: ds.stageBoot, live: ds.live }));
  await page.evaluate(() => document.querySelector('[data-orbit-canvas]').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  // The poster fades back in over 900 ms: wait for it (up to 3 s) rather than sampling mid-transition.
  await page
    .waitForFunction(() => getComputedStyle(document.querySelector('.ostage__poster')).opacity === '1', null, { timeout: 3000 })
    .catch(() => {});
  const lost = await page.evaluate(() => { const r = document.querySelector('[data-orbit-stage]'); return { noGl: r.classList.contains('no-webgl'), live: r.classList.contains('is-live'), err: r.dataset.stageError, poster: getComputedStyle(r.querySelector('.ostage__poster')).opacity }; });
  check('W3', 'WebGL context loss falls back to the poster without errors', lost.noGl && !lost.live && lost.err === 'context-lost' && lost.poster === '1' && page.errors.length === 0, JSON.stringify(lost) + page.errors.join('|'));
  await page.context().close();
}
/* W4 — texture load failure degrades to poster, page keeps working */
{
  const page = await newPage();
  await page.route('**/textures/earth-*', (r) => r.fulfill({ status: 404, body: '' }));
  await page.goto(BASE + '/?nointro');
  await page.waitForFunction(() => document.querySelector('[data-orbit-stage]').classList.contains('no-webgl'), null, { timeout: 60000 }).catch(() => {});
  const st = await page.evaluate(() => { const r = document.querySelector('[data-orbit-stage]'); return { noGl: r.classList.contains('no-webgl'), err: r.dataset.stageError, poster: getComputedStyle(r.querySelector('.ostage__poster')).opacity }; });
  await page.locator('[data-menu-toggle]').click();
  await page.waitForTimeout(600);
  const menuOk = (await page.locator('[data-menu-toggle]').getAttribute('aria-expanded')) === 'true';
  const uncaught = page.errors.filter((e) => !/404|Failed to load resource|FAILED/.test(e));
  check('W4', 'Missing Earth textures: poster stays, error recorded, rest of page works', st.noGl && /texture/.test(st.err || '') && st.poster === '1' && menuOk && uncaught.length === 0, JSON.stringify(st) + uncaught.join('|'));
  await page.context().close();
}

/* F4 — loader */
{
  const page = await newPage();
  await page.goto(BASE + '/');
  await page.waitForFunction(() => document.documentElement.classList.contains('intro-done'), null, { timeout: 15000 });
  const ms = await page.evaluate(() => Math.round(window.__introDoneAt - performance.getEntriesByType('navigation')[0].domInteractive));
  await page.waitForFunction(() => !document.querySelector('[data-loader]'), null, { timeout: 8000 }).catch(() => {});
  const removed = await page.evaluate(() => !document.querySelector('[data-loader]'));
  const logo = await page.evaluate(() => getComputedStyle(document.querySelector('[data-header-logo]')).opacity);
  await page.reload();
  const skipped = await page.evaluate(() => document.documentElement.classList.contains('intro-skip'));
  check('F4', 'Intro ≤ 2.6 s after DOM interactive, docks logo, is removed, skipped on reload', ms <= 2600 && removed && logo === '1' && skipped, `intro ${ms} ms; removed=${removed}; logo=${logo}; skipped=${skipped}`);
  await page.context().close();
}

/* M3 — reduced motion */
{
  const page = await newPage({ reducedMotion: 'reduce' });
  await page.goto(BASE + '/');
  await page.waitForTimeout(800);
  const st = await page.evaluate(() => ({
    skip: document.documentElement.classList.contains('intro-skip'),
    lenis: document.documentElement.classList.contains('lenis'),
    split: document.querySelectorAll('.hero__title .ch').length,
  }));
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#orbit').getBoundingClientRect().top + scrollY));
  await page.waitForTimeout(600);
  const hud = await page.textContent('[data-hud="period"]');
  const grain = await page.evaluate(() => getComputedStyle(document.querySelector('.grain')).animationName);
  check('M3', 'Reduced motion: no intro, no smoothing, no letter split, HUD shown instantly, grain static', st.skip && !st.lenis && st.split === 0 && hud === '95.6 min' && grain === 'none', JSON.stringify({ ...st, hud, grain }));
  await page.context().close();
}

/* F3 — contact form, unconfigured endpoint */
{
  const page = await newPage();
  await page.goto(BASE + '/contact/');
  await page.click('button[type="submit"]');
  const invalid = await page.$$eval('[aria-invalid="true"]', (els) => els.map((e) => e.name));
  const status1 = await page.textContent('[data-form-status]');
  const focusedName = await page.evaluate(() => document.activeElement.name);
  await page.fill('#f-name', 'Ada Test');
  await page.fill('#f-email', 'not-an-email');
  await page.locator('#f-email').blur();
  const emailErr = await page.textContent('[data-error-for="email"]');
  await page.fill('#f-email', 'ada@example.org');
  await page.fill('#f-message', 'We need a ground segment review for a small EO mission.');
  await page.check('#f-consent');
  let posted = false;
  page.on('request', (r) => r.method() === 'POST' && (posted = true));
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
  const status2 = await page.textContent('[data-form-status]');
  check('F3a', 'Empty submit flags all required fields, announces and focuses first error', invalid.length === 4 && /correct/.test(status1) && focusedName === 'name', invalid.join(','));
  check('F3b', 'Invalid e-mail shows inline error on blur', /valid e-mail/.test(emailErr));
  check('F3c', 'Unconfigured endpoint: says "not been sent", sends nothing, no success message', /has not been sent/.test(status2) && !posted && !/Thank you/.test(status2), status2);
  await page.context().close();
}

/* F3 — configured endpoint (mocked responses) */
if (EP_BASE) {
  const cases = [
    ['200 ok', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}', headers: { 'access-control-allow-origin': '*' } }), /Thank you/],
    ['500', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{}', headers: { 'access-control-allow-origin': '*' } }), /could not be sent/],
    ['200 {ok:false}', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false,"error":"rejected"}', headers: { 'access-control-allow-origin': '*' } }), /could not be sent/],
    ['network error', (r) => r.abort('failed'), /could not be sent/],
    ['hung >15 s', () => {}, /could not be sent/],
  ];
  for (const [name, handler, expect] of cases) {
    const page = await newPage();
    let body = null;
    await page.route('https://forms.test/**', async (route) => {
      body = route.request().postDataJSON();
      await handler(route);
    });
    await page.goto(EP_BASE + '/contact/');
    await page.fill('#f-name', 'Ada Test');
    await page.fill('#f-email', 'ada@example.org');
    await page.fill('#f-message', 'We need a ground segment review for a small EO mission.');
    await page.check('#f-consent');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => !/Sending/.test(document.querySelector('[data-form-status]').textContent), null, { timeout: 25000 }).catch(() => {});
    const status = await page.textContent('[data-form-status]');
    const btnEnabled = await page.locator('button[type="submit"]').isEnabled();
    check(`F3-${name}`, `Configured endpoint, ${name} → correct message, JSON posted, button re-enabled`, expect.test(status) && body?.email === 'ada@example.org' && !('company_site' in body) && btnEnabled, status);
    await page.context().close();
  }
}

/* P1 — layout stability on mobile with slow network (fonts arrive late) */
{
  const page = await newPage({ viewport: { width: 412, height: 823 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1.75 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 188000, uploadThroughput: 86000 });
  await page.addInitScript(() => { window.__cls = 0; window.__clsSrc = []; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) { window.__cls += e.value; if (e.value > 0.01) window.__clsSrc.push(e.sources.map((s) => s.node?.className?.toString().slice(0, 30)).join(',')); } })).observe({ type: 'layout-shift', buffered: true }); });
  await page.goto(BASE + '/');
  await page.waitForTimeout(7000);
  const r = await page.evaluate(() => ({ cls: +window.__cls.toFixed(3), src: window.__clsSrc }));
  check('P1', 'Mobile first load (slow 4G, intro playing): cumulative layout shift < 0.05', r.cls < 0.05, JSON.stringify(r));
  await page.context().close();
}

/* A5 — 200% text size: nothing clipped in pinned stages; A6 — normal text keeps pinned layouts */
{
  const clippedIn = (page) => page.evaluate(async () => {
    const out = [];
    for (const [sel, f] of [['[data-orbit-stage]', 0.02], ['[data-orbit-stage]', 0.8], ['[data-obs]', 0.5], ['[data-appr-stage]', 0.8], ['[data-fin]', 0.9], ['#capabilities', 0.3]]) {
      const root = document.querySelector(sel);
      scrollTo(0, root.getBoundingClientRect().top + scrollY + f * Math.max(0, root.offsetHeight - innerHeight));
      await new Promise((r) => setTimeout(r, 400));
      const box = (root.querySelector('[class*="__sticky"]') || root).getBoundingClientRect();
      root.querySelectorAll('h1,h2,h3,p,dd,dt,a.btn').forEach((e) => {
        const r = e.getBoundingClientRect();
        const o = +getComputedStyle(e.closest('.hero,.orbitc,.fin__inner,.appr__statement,section') || e).opacity;
        if (r.height > 0 && o > 0.5 && (r.top < box.top - 1 || r.bottom > box.bottom + 1)) out.push(`${sel}: ${e.textContent.trim().slice(0, 24)}`);
      });
    }
    return out;
  });
  const issues = [];
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    const page = await newPage({ viewport: { width: w, height: h } });
    await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'html{font-size:200% !important}'; document.head.appendChild(s); }));
    await page.goto(BASE + '/?nointro');
    await page.waitForTimeout(1500);
    const c = await clippedIn(page);
    if (c.length) issues.push(`${w}px: ${c.join('; ')}`);
    await page.context().close();
  }
  check('A5', '200% text size: no text clipped by pinned stages (flow layout engages)', issues.length === 0, issues.join(' | '));
  const st = [];
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [390, 844]]) {
    const page = await newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE + '/?nointro');
    await page.waitForTimeout(1500);
    st.push(await page.evaluate((w) => ({ w, flow: document.querySelectorAll('.is-flow').length, pinned: document.querySelector('[data-caps]').classList.contains('is-pinned') }), w));
    await page.context().close();
  }
  const ok = st.every((x) => x.flow === 0 && x.pinned === x.w >= 1024);
  check('A6', 'Normal text: no stage falls back to flow; capabilities pinned at ≥1024 px (incl. 1280×800)', ok, JSON.stringify(st));
}

/* S1 / A3 — metadata, headings, alt text. Full SEO metadata is checked on the build
   configured with a production origin (EP_BASE build uses SITE_URL=https://omerta.example,
   a reserved test domain); the unconfigured build must not leak localhost URLs (S2). */
{
  const page = await newPage();
  const issues = [];
  const SEO_BASE = EP_BASE || BASE;
  for (const path of ['/', '/contact/', '/404']) {
    await page.goto(SEO_BASE + path + '?nointro');
    const m = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      desc: document.querySelector('meta[name=description]')?.content,
      canonical: document.querySelector('link[rel=canonical]')?.href,
      og: document.querySelector('meta[property="og:image"]')?.content,
      noindex: !!document.querySelector('meta[name=robots][content*=noindex]'),
      h1: document.querySelectorAll('h1').length,
      noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
      landmarks: !!document.querySelector('header') && !!document.querySelector('main') && !!document.querySelector('footer') && !!document.querySelector('nav'),
      skip: !!document.querySelector('.skip-link[href="#main"]'),
    }));
    if (!m.lang || !m.title || !m.desc || !m.og?.startsWith('https://')) issues.push(`${path}: missing meta`);
    if (path === '/404' ? m.canonical || !m.noindex : !m.canonical?.startsWith('https://')) issues.push(`${path}: canonical/noindex wrong (${m.canonical})`);
    if (m.h1 !== 1) issues.push(`${path}: ${m.h1} h1`);
    if (m.noAlt) issues.push(`${path}: ${m.noAlt} img without alt`);
    if (!m.landmarks || !m.skip) issues.push(`${path}: landmarks/skip`);
  }
  const robots = await (await page.request.get(SEO_BASE + '/robots.txt')).text();
  const sm = await page.request.get(SEO_BASE + '/sitemap-0.xml');
  const smText = await sm.text();
  if (!/Sitemap: https:\/\//.test(robots) || sm.status() !== 200 || /404/.test(smText) || !/contact/.test(smText)) issues.push('robots/sitemap');
  check('S1/A3', 'Configured origin: meta, canonical (none on noindex 404), OG, one h1, alt, landmarks, skip link, robots, sitemap', issues.length === 0, issues.join('; '));
  const leaks = [];
  for (const path of ['/', '/contact/', '/robots.txt']) {
    const t = await (await page.request.get(BASE + path)).text();
    if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(t)) leaks.push(path);
  }
  check('S2', 'Unconfigured build (no SITE_URL) emits no localhost canonical/OG/sitemap URLs', leaks.length === 0, leaks.join(', '));
  await page.context().close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
