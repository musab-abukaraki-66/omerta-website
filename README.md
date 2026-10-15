# OMERTA — website

Marketing website for **OMERTA**, a satellite and space-technology company. It is a
static [Astro](https://astro.build) site built around a scroll-driven narrative: a
real-time 3D orbit scene, Earth-observation and ground-segment chapters, a
capabilities rail and a contact page.

> **Status: pre-launch.** Service descriptions in `src/content/site.ts` are
> **provisional**, and the production domain, contact-form endpoint, privacy notice
> and legal details have not been supplied. `npm run release-check` fails until they
> are, and Vercel production builds are blocked by the same check. See
> [`docs/owner-inputs-and-release-blockers.md`](docs/owner-inputs-and-release-blockers.md).

## What is implemented

- **Orbit stage (three.js).** NASA Blue/Black Marble Earth with a day/night
  terminator shader and atmosphere, an original procedural spacecraft with
  canvas-drawn PBR maps, image-based lighting, bloom and a lens pass. A scroll-linked
  camera moves from the hero close-up to the orbit view, with a live HUD for a
  reference 550 km sun-synchronous orbit.
- **Off the main thread.** The scene renders in a Web Worker on an `OffscreenCanvas`.
  Where that is unavailable it falls back to the main thread after the first user
  interaction. Without WebGL, or after a context loss or texture failure, a
  pre-rendered poster of the same scene stays in place.
- **Chaptered scrolling.** Sticky stages are driven by native scroll progress through
  CSS custom properties. Lenis smooths wheel input for fine pointers only. Keyboard
  scrolling, anchors and find-in-page keep working.
- **Accessibility.** Reduced-motion variants, a skip link, a focus-trapped menu,
  real headings and landmarks, and a flow layout that unpins stages when content
  does not fit (200 % text, zoom, short screens). Without JavaScript, all content is
  shown in normal flow.
- **Honest contact form.** Client-side validation and a JSON `POST` to a configurable
  endpoint. The form only reports success when the endpoint confirms it. With no
  endpoint configured it says nothing was sent.
- **Security headers.** A Content-Security-Policy with SHA-256 hashes of the built
  inline scripts is generated after every build, plus `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, COOP and HSTS.

## Stack

Astro 7 (static output) · TypeScript (strict) · three.js r186 · Lenis · Fontsource
(Archivo, IBM Plex Mono) · Playwright for QA. There is no UI framework and no server
code.

```
src/
  pages/           index, contact, 404, robots.txt
  layouts/         Base.astro: SEO, fonts, header/footer
  components/      header, footer, loader, wordmark, sections/*
  content/site.ts  all copy and the content-status flag
  scripts/
    stages/        orbit scene (stage, worker, host, satellite), section controllers
    core/ ui/ fx/  scroll and RAF loop, menu, form, reveal/scramble effects
  styles/          tokens and global CSS
scripts/           build helpers (headers, deploy env, guards) and qa/ tooling
docs/              research, design, QA and release documentation
public/            textures, media, favicon
```

## Run locally

Requires Node **≥ 22.12** (Astro 7).

```bash
npm ci
npm run dev            # http://localhost:4321  (?nointro skips the intro)
npm run typecheck
npm run build          # dist/ plus dist/_headers
npm run preview        # serve dist/
```

## Tests and QA

The QA scripts drive a built site in headless Chromium via Playwright (a pinned
devDependency). Install its browser once, then serve `dist/`:

```bash
npx playwright install chromium
npm run build
node scripts/qa/static-server.mjs dist 4321 &
# A second build with an origin and a (mocked) endpoint enables the SEO and form tests:
SITE_URL=https://omerta.test PUBLIC_CONTACT_ENDPOINT=https://forms.test/submit npx astro build --outDir dist-ep
node scripts/qa/static-server.mjs dist-ep 4322 &

npm run qa:interactions -- http://127.0.0.1:4321 http://127.0.0.1:4322   # 30 checks
node scripts/qa/csp-check.mjs <baseUrl> <endpointBuildUrl>              # CSP violations
scripts/qa/lighthouse.sh <outDir> <url> 3                               # needs CHROME_PATH
node scripts/qa/make-poster.mjs                                         # re-render poster + OG image
```

The interaction suite covers navigation, menu focus handling, the worker and
fallback paths, context loss, missing textures, the intro, reduced motion, form
failure modes, layout shift, 200 % text and SEO output. Results and Lighthouse
figures are recorded in [`docs/final-qa-report.md`](docs/final-qa-report.md).

## Configuration

| Variable | Purpose | If unset |
|---|---|---|
| `SITE_URL` | Production HTTPS origin: canonical URLs, Open Graph, sitemap | Absolute URLs and sitemap are omitted (never `localhost`) |
| `PUBLIC_CONTACT_ENDPOINT` | HTTPS endpoint accepting the form's JSON `POST`; added to the CSP `connect-src` | The form states that nothing was sent |

`PUBLIC_` variables are compiled into client code. No secrets belong in this project.
See `.env.example`.

## Deployment

The site is designed for Vercel, but any static host works.

- **Vercel previews** use their own deployment URL as the origin and are never
  indexable (`noindex` meta, `X-Robots-Tag`, `Disallow` in robots.txt, no sitemap).
- **Vercel production builds** run the release check and fail while launch
  information is missing.
- **Other hosts** serve `dist/` and `dist/_headers`.

See [`docs/deployment.md`](docs/deployment.md).

## Assets and licensing

Earth textures and photographs are NASA / NASA-JPL imagery used with credit. They
show NASA missions, not OMERTA hardware, and the site captions them as such. Fonts
are under the SIL Open Font License. The spacecraft, poster, wordmark and effects
are original. Details: [`docs/asset-credits.md`](docs/asset-credits.md).

**No licence has been chosen for this repository.** Until one is added, all rights
are reserved: the code may be read but not reused.

## Documentation

| Document | Contents |
|---|---|
| [`docs/owner-inputs-and-release-blockers.md`](docs/owner-inputs-and-release-blockers.md) | The one checklist: owner inputs, permissions, validation, launch steps |
| [`docs/deployment.md`](docs/deployment.md) | Vercel preview/production setup and other hosts |
| [`docs/final-qa-report.md`](docs/final-qa-report.md) | Test, performance and accessibility results |
| [`docs/asset-credits.md`](docs/asset-credits.md) | Sources and licences of every external asset |
| [`docs/omerta-creative-direction.md`](docs/omerta-creative-direction.md), [`docs/implementation-plan.md`](docs/implementation-plan.md), [`docs/acceptance-criteria.md`](docs/acceptance-criteria.md) | Design and engineering decisions |
| [`docs/reference-audit.md`](docs/reference-audit.md), [`docs/interaction-inventory.md`](docs/interaction-inventory.md), [`docs/reference-limitations.md`](docs/reference-limitations.md) | Research on the reference site that informed the design (text only) |
