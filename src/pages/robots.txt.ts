import type { APIRoute } from 'astro';

// Preview deployments disallow crawling; the Sitemap line is only emitted for a real,
// indexable origin.
export const GET: APIRoute = ({ site }) => {
  const real = site && !['localhost', '127.0.0.1'].includes(site.hostname);
  const body = !__OMERTA_INDEXABLE__
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n${real ? `\nSitemap: ${new URL('/sitemap-index.xml', site)}\n` : ''}`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
