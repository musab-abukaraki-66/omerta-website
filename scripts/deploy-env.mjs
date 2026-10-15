// Resolves the public origin and indexability for the current build environment.
// Shared by astro.config.mjs, write-headers.mjs and production-guard.mjs so the three
// can never disagree.
//
//   Vercel Production  → origin = SITE_URL (required; see production-guard.mjs), indexable
//   Vercel Preview/Dev → origin = https://$VERCEL_URL (this deployment), never indexable
//   Anywhere else      → origin = SITE_URL if set, otherwise none; indexable
const LOCAL = ['localhost', '127.0.0.1'];

export const resolveDeployEnv = (env = process.env) => {
  const vercelEnv = env.VERCEL_ENV || null; // 'production' | 'preview' | 'development'
  const onVercel = !!vercelEnv;
  const isPreview = onVercel && vercelEnv !== 'production';
  let site = null;
  if (isPreview) site = env.VERCEL_URL ? `https://${env.VERCEL_URL}` : null;
  else if (env.SITE_URL) site = env.SITE_URL;
  if (site && LOCAL.includes(new URL(site).hostname)) site = null;
  return { vercelEnv, onVercel, isPreview, site, indexable: !isPreview };
};
