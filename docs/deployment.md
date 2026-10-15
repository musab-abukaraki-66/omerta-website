# Deployment

The site is static. `npm run build` produces `dist/` (HTML, assets, `_headers`). When
the build runs on Vercel it also writes `.vercel/output/` (Vercel's Build Output API),
which carries the same files plus the security headers. Headers are emitted this way
because the CSP contains hashes of the built inline scripts, and `vercel.json` is read
before the build runs, so it cannot know them.

## How the build adapts to its environment

`scripts/deploy-env.mjs` is the single source of truth:

| Environment | Origin used for absolute URLs | Indexable | Sitemap |
|---|---|---|---|
| Vercel **Production** (`VERCEL_ENV=production`) | `SITE_URL` (required) | yes | yes |
| Vercel **Preview** / development | `https://$VERCEL_URL` (that deployment) | **no**: `noindex` meta, `X-Robots-Tag: noindex, nofollow`, `Disallow: /` | no |
| Any other host or local build | `SITE_URL` if set, else none | yes | only with `SITE_URL` |

`scripts/production-guard.mjs` runs before `astro build`. On a Vercel Production
build it runs `scripts/release-check.mjs` and **fails the build** while the
production origin, contact endpoint or confirmed copy is missing. This is
intentional. Do not bypass it to "make production work"; supply the information
instead (see `owner-inputs-and-release-blockers.md`).

## Current state

- **Project `omerta`** is connected to this repository (`musab-abukaraki-66/omerta-website`).
- **Production Branch: `production`.** Every push to `main` (or any other branch)
  creates a Preview. `main` Previews take over the stable URL
  **https://omerta-space.vercel.app**. Pushes to `production` create Production
  deployments, which fail at the release guard until launch inputs exist.
- **Vercel Authentication:** disabled, so preview links open without a Vercel login.
  Previews are always `noindex`.
- `omerta-tau.vercel.app` is Vercel's automatic production address; it shows nothing
  until a Production deployment succeeds.

## Vercel project setup (one time, by the account owner)

1. In Vercel, go to **Add New… → Project** and import the GitHub repository.
2. Use these build settings:
   - Framework Preset **Other**
   - Build Command `npm run build`
   - Install Command `npm ci`
   - Output Directory `dist`. It is only a fallback: the build emits `.vercel/output`, which takes precedence.
   - Node.js version **22.x**
3. Under **Settings → Git**, set the **Production Branch**. Until launch use
   `production`, a branch that does not exist yet: every push to `main` then creates a
   Preview, which `omerta-space.vercel.app` follows. At launch, change it to `main`.
4. The first deployment Vercel starts after import targets Production. Until the
   release check passes, that deployment **fails by design** with
   `Production build blocked`. Previews are unaffected.
5. Deployment Protection: by default Vercel requires a Vercel login to open preview
   URLs. To share a preview with someone without a Vercel account, either use a
   shareable link from the deployment page or relax protection for previews. Previews
   are `noindex` either way.

## Environment variables

Set them per environment in **Settings → Environment Variables**. Never put
secrets in `PUBLIC_` variables; they are compiled into client JavaScript.

| Variable | Production | Preview |
|---|---|---|
| `SITE_URL` | the confirmed `https://` origin | leave unset (the deployment URL is used automatically) |
| `PUBLIC_CONTACT_ENDPOINT` | the real form endpoint | unset, or a separate test endpoint. Never a fake one: with no endpoint the form truthfully says nothing was sent |

The endpoint's origin is added to the CSP `connect-src` automatically at build time.

## Going to production

1. Supply the owner inputs F1–F4 in `owner-inputs-and-release-blockers.md`.
2. Set the production variables above.
3. Run locally: `SITE_URL=… PUBLIC_CONTACT_ENDPOINT=… npm run release-check`. It must pass.
4. Merge into the production branch. Vercel builds it; the guard passes; the deployment is live.
5. Add the custom domain in Vercel only once it is confirmed, and make sure
   `SITE_URL` matches it.

## Other static hosts

- **Netlify / Cloudflare Pages:** publish `dist/`. `dist/_headers` is read natively.
- **Elsewhere:** publish `dist/` and copy the headers from `dist/_headers` into the
  server or CDN configuration. Keep HSTS only once HTTPS is confirmed on the domain.

Verify headers locally with `node scripts/qa/static-server.mjs dist 4321
.headers.test.json` and `node scripts/qa/csp-check.mjs`.
