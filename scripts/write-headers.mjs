// Post-build: security headers with a Content-Security-Policy whose inline-script
// hashes are computed from the built HTML, so they cannot drift from the code.
//   - dist/_headers (Netlify / Cloudflare Pages format) on every build
//   - .vercel/output/ (Vercel Build Output API: static files + routes with headers)
//     when building on Vercel, because vercel.json is read before the build runs and
//     so cannot carry build-time hashes
// Usage: node scripts/write-headers.mjs [distDir]
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { resolveDeployEnv } from './deploy-env.mjs';

const dist = process.argv[2] || 'dist';
const html = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && html.push(p); });
walk(dist);

const hashes = new Set();
for (const file of html) {
  for (const m of readFileSync(file, 'utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    if (m[1].trim()) hashes.add(`'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
  }
}

let endpointOrigin = '';
try {
  if (process.env.PUBLIC_CONTACT_ENDPOINT) endpointOrigin = new URL(process.env.PUBLIC_CONTACT_ENDPOINT).origin;
} catch {}

export const csp = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].join(' ')}`,
  "style-src 'self' 'unsafe-inline'", // Astro-inlined critical CSS and style attributes
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${endpointOrigin ? ' ' + endpointOrigin : ''}`,
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const securityHeaders = {
  'Content-Security-Policy': csp,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};
const deploy = resolveDeployEnv();
if (!deploy.indexable) securityHeaders['X-Robots-Tag'] = 'noindex, nofollow';

const cacheRules = [
  ['/_astro/*', 'public, max-age=31536000, immutable'],
  ['/textures/*', 'public, max-age=604800'],
  ['/media/*', 'public, max-age=604800'],
];

const lines = ['/*', ...Object.entries(securityHeaders).map(([k, v]) => `  ${k}: ${v}`), ''];
for (const [path, value] of cacheRules) lines.push(path, `  Cache-Control: ${value}`, '');
writeFileSync(join(dist, '_headers'), lines.join('\n'));

if (deploy.onVercel) {
  const out = '.vercel/output';
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(dist, join(out, 'static'), { recursive: true });
  rmSync(join(out, 'static', '_headers'), { force: true });
  const routes = [
    { src: '/(.*)', headers: securityHeaders, continue: true },
    ...cacheRules.map(([path, value]) => ({ src: path.replace('*', '(.*)'), headers: { 'Cache-Control': value }, continue: true })),
    { handle: 'filesystem' },
    { src: '/(.*)', status: 404, dest: '/404.html' },
  ];
  writeFileSync(join(out, 'config.json'), JSON.stringify({ version: 3, routes }, null, 2));
  console.log(`[headers] Vercel Build Output written (${deploy.vercelEnv}, ${deploy.indexable ? 'indexable' : 'noindex'})`);
}
// Same headers as JSON for local verification with `serve --config`.
// (Without HSTS / upgrade-insecure-requests, which would break a plain-HTTP local server.)
const local = Object.entries(securityHeaders)
  .filter(([k]) => k !== 'Strict-Transport-Security')
  .map(([key, value]) => ({ key, value: value.replace('; upgrade-insecure-requests', '') }));
writeFileSync(join(dist, '..', `.headers.test${dist === 'dist' ? '' : '-' + dist}.json`), JSON.stringify({ headers: [{ source: '**/*', headers: local }] }, null, 2));
console.log(`[headers] ${html.length} HTML files, ${hashes.size} inline script hash(es), connect-src endpoint: ${endpointOrigin || 'none'}`);
