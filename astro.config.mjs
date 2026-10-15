// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { resolveDeployEnv } from './scripts/deploy-env.mjs';

// The production origin must be supplied at build time (canonical URLs, sitemap,
// Open Graph). It is intentionally not hard-coded: no domain has been confirmed.
// Vercel previews use their own deployment URL and are never indexable.
const { site, indexable, isPreview } = resolveDeployEnv();
if (!site && process.argv.includes('build')) {
  console.warn('\n[omerta] SITE_URL is not set: canonical, Open Graph and sitemap URLs will be omitted. Run `npm run release-check` before deploying.\n');
}
if (isPreview) console.log(`[omerta] Vercel preview build: origin ${site ?? '(none)'}, noindex`);

export default defineConfig({
  site: site ?? 'http://localhost:4321',
  trailingSlash: 'ignore',
  // The sitemap needs absolute URLs and is only useful where indexing is allowed.
  integrations: site && indexable ? [sitemap()] : [],
  build: { inlineStylesheets: 'auto' },
  vite: {
    define: { __OMERTA_INDEXABLE__: JSON.stringify(indexable) },
    build: { chunkSizeWarningLimit: 700 },
  },
});
