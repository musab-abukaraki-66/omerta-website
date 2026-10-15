// Fails (exit 1) when launch-critical configuration or content is missing.
// Usage: SITE_URL=… PUBLIC_CONTACT_ENDPOINT=… node scripts/release-check.mjs
import { readFileSync } from 'node:fs';
const problems = [];
const warn = [];
const site = process.env.SITE_URL || '';
try {
  const u = new URL(site);
  if (u.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(u.hostname) || u.hostname.endsWith('.example')) problems.push(`SITE_URL must be the real HTTPS production origin (got "${site}")`);
} catch { problems.push('SITE_URL is not set'); }
const ep = process.env.PUBLIC_CONTACT_ENDPOINT || '';
try { if (new URL(ep).protocol !== 'https:') problems.push('PUBLIC_CONTACT_ENDPOINT must be HTTPS'); } catch { problems.push('PUBLIC_CONTACT_ENDPOINT is not set (the contact form will say nothing was sent)'); }
const content = readFileSync(new URL('../src/content/site.ts', import.meta.url), 'utf8');
if (/contentStatus[^=]*=\s*'provisional'/.test(content)) problems.push("src/content/site.ts: contentStatus is 'provisional' — confirm service copy, then set 'confirmed'");
if (/privacyNoticeUrl:\s*null/.test(content)) problems.push('src/content/site.ts: privacyNoticeUrl is null — publish a privacy notice covering the contact form and link it');
if (/contactEmail:\s*null/.test(content)) warn.push('src/content/site.ts: contactEmail is null (no e-mail shown on /contact/)');
if (/url:\s*null/.test(content.slice(content.indexOf('export const designer')))) warn.push('src/content/site.ts: designer.url is null (credit shown as plain text)');
console.log(problems.length ? 'RELEASE CHECK FAILED' : 'Release check passed');
problems.forEach((p) => console.log('  ✗ ' + p));
warn.forEach((w) => console.log('  ! ' + w));
console.log('  (Legal entity details and imagery-rights checks are manual — see docs/owner-inputs-and-release-blockers.md)');
process.exit(problems.length ? 1 : 0);
