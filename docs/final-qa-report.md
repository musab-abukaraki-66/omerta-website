# OMERTA — Final QA Report (release-readiness pass)

**Date:** 2026-10-15 · **Branch:** `claude/intelligent-thompson-ab51p0` · **Build:** Astro 7.3.8 static
**Environment:** cloud Linux container, Node 22.22, Playwright 1.56 + headless Chromium 141,
WebGL via **SwiftShader software rendering (no GPU)**, Lighthouse 13.5.

> **Verdict: not ready for public launch.** The engineering is in a releasable state, but
> launch-critical owner input is missing (domain, form endpoint, confirmed copy, privacy
> notice). See §8 and [`owner-inputs-and-release-blockers.md`](owner-inputs-and-release-blockers.md). `npm run release-check`
> currently fails, by design.

> **Update — deployment and public-repository preparation (§10).** Vercel-specific
> build behaviour, a production guard, third-party material removed from the tree.
> Earlier sections are kept as the record of the passes they describe.

> **Update — hero rebuilt after the Awwwards "Orbital Intelligence" reference (§9).** The
> first screen now follows the Edolus hero composition, with OMERTA copy and an original
> spacecraft. Section 9 has the tests and measurements for that change; earlier sections
> describe the release-readiness pass that preceded it.

Earlier research and design documents (unchanged): `reference-audit.md`,
`interaction-inventory.md`, `reference-limitations.md`, `omerta-creative-direction.md`,
`implementation-plan.md`, `acceptance-criteria.md`.

---

## 1. Baseline at the start of this pass (re-measured, not assumed)

| Check | Previously reported | Re-measured baseline |
|---|---|---|
| Build / typecheck | pass | pass |
| Interaction suite | 19/19 | 19/19 |
| Lighthouse mobile, applied throttling, TBT | 270–300 ms | **358–704 ms (median 437)** — the earlier figure did not hold |
| Lighthouse mobile, simulated, TBT | 40–60 ms | 53–491 ms (median 81) |
| Lighthouse desktop, TBT | 40–370 ms | 155–284 ms (median 221) |

## 2. Root causes found and what changed

### 2.1 Interaction responsiveness (TBT)
Investigated with Lighthouse long-task data, Lighthouse's own saved trace, Chrome traces under
CPU and network throttling, and CPU sampling profiles. The film-grain layer was **not** a factor
(an earlier hypothesis, disproved previously).

| Cause (evidence) | Fix |
|---|---|
| The WebGL stage booted on the main thread inside the measurement window: the three.js chunk was fetched in every mobile-applied run and the largest task (409–614 ms) was stage initialisation. The interaction gate didn't prevent this: Chrome's synthetic mouse moves after layout trigger `pointermove` without user input. | **Stage moved to a Web Worker with `OffscreenCanvas`**: three.js parsing, shader compilation, texture decoding (`createImageBitmap`) and rendering all run off the main thread. Main-thread fallback (no OffscreenCanvas) boots only on real input (`scroll`/`wheel`/`touchstart`/`pointerdown`/`keydown`, not `pointermove`) or after 8 s idle. |
| Main-thread WebGL capability probes created throwaway GL contexts (≈400 ms task at ~5.5 s; another at startup) | Detection by API presence only; real failures degrade via the error path |

Result on the same machine and settings (3 runs each):

| Lighthouse mode (home) | Before (median) | After: final build |
|---|---|---|
| Mobile, applied DevTools throttling | TBT 437 ms, Perf 76–87 | **TBT 17–51 ms (median 21)**, Perf 95–96, LCP 1.76 s, CLS 0.001 |
| Mobile, simulated throttling | TBT 81 ms | TBT 0–32 ms (median 23), Perf 97–99, LCP 2.1 s, CLS 0 |
| Desktop | TBT 221 ms | **TBT 0 ms** (all runs), Perf 98–100, LCP 0.49 s, CLS 0 |
| Accessibility / Best practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |

The worker chunk was fetched *inside* the measurement window in the mobile-applied runs and TBT
stayed ≤ 51 ms, which is direct evidence that the 3D work no longer blocks the main thread.

### 2.2 3D lifecycle (verified by automated tests W1–W4, M4)
- Poster shows until the **textured** Earth has rendered (previously the hand-over could reveal
  an untextured globe for a moment; seen in a capture and fixed).
- Worker boot without input (W1); fallback ignores bare mouse moves and boots on wheel (W2).
- WebGL context loss → poster returns, error recorded, no exceptions (W3).
- Missing Earth textures → poster stays, rest of page works (W4).
- Duplicate initialisation is guarded; `dispose()` frees geometries, materials, textures and the
  renderer; the worker is terminated.
- Rendering stops off-screen (+0 frames in 2 s, M4) and while the tab is hidden; off-screen
  resizes (mobile URL bar) no longer render.
- Idle drift renders at ≤30 fps; scroll- or pointer-driven motion stays at full rate.
- Without WebGL2 (three.js requirement), the poster is shown with no errors (F5).

### 2.3 Accessibility
- **WCAG 1.4.4 failure found and fixed:** at 200% text size, pinned 100vh stages clipped content
  (orbit HUD and caption at 1280; hero eyebrow, orbit and observation copy at 390; Capabilities
  heading). Stages now switch to a flow layout when their content doesn't fit (`ui/fit.ts`), the
  same layout as the no-JS fallback. Test A5.
- Pinned Capabilities was ~16 px taller than a 1280×800 viewport (cards slightly clipped); the
  layout was tightened for screens under 900 px tall so it stays pinned. Test A6.
- Approach chapter read "05 Approach" plus a hidden duplicate heading → the eyebrow is now the
  real `h2`.
- Live HUD rows exposed "—" to assistive tech until animated → real values from the start.
- Chromium's accessibility tree (CDP `Accessibility.getFullAXTree`) confirms the open menu exposes
  only the menu (380 → 53 nodes), so `inert` works. Playwright's DOM-based snapshot does not model
  `inert`, so it can't be used to judge that.

### 2.4 Contact form (tests F3-*)
HTTPS-only endpoint validation; 15 s timeout; success **only** on a 2xx response whose JSON body
(if any) does not report an error; `credentials: 'omit'`; visible message if the honeypot gets
auto-filled. Verified: 200 → success; 500, `200 {"ok":false}`, network failure and a hung
request → "could not be sent", button re-enabled; unconfigured → "has not been sent", nothing
transmitted.

### 2.5 Security & SEO
- `npm run build` writes `dist/_headers` with a strict CSP (inline-script SHA-256 hashes computed
  from the build; `connect-src` adds the form endpoint origin), `nosniff`, Referrer-Policy,
  Permissions-Policy, COOP, HSTS and cache rules. **Verified locally:** no CSP violations across
  intro, worker boot, scrolling, form POST and 404; a negative control (CSP without hashes) is
  detected (`scripts/qa/csp-check.mjs`).
- `npm audit`: 0 vulnerabilities. No secrets in source or build; the only client env value is the
  public form endpoint. All `target="_blank"` links carry `rel="noopener"`.
- Without `SITE_URL` the build no longer emits localhost canonical/OG/sitemap URLs (test S2) and
  warns at build time. The noindex 404 no longer declares a canonical. With a configured origin,
  canonical, OG, robots `Sitemap:` and sitemap (excluding 404) are correct (test S1, checked
  against the reserved domain `omerta.example`; no real domain was invented).

### 2.6 Visual polish (from a 96-screenshot sweep, 16 states × 6 widths)
- Closing sequence had an empty stretch (~30% of its scroll showed only bands) → content now
  resolves as the letterbox closes.
- Poster→canvas hand-over flash (2.2) and Capabilities clipping (2.3) as above.
- No console errors, failed requests or horizontal overflow in any of the 96 states.

### 2.7 Regressions I introduced during this pass and caught
- A test-file edit truncated the suite (A5/A6/S1 and the summary were lost) and was committed;
  noticed because the run printed no summary. Restored in a later commit.
- The first version of the Capabilities fit check toggled a class on mobile, which Lighthouse
  recorded as **CLS 0.93–1.02**. Fixed (CLS 0.001) and covered by the new test P1.

## 3. Decisions on the unfinished Edolus-inspired interactions
| Feature | Decision | Reason |
|---|---|---|
| Sound | **Not implemented** | OMERTA's identity is silence/discretion; no licensed audio exists; optional audio adds a control, an asset pipeline and accessibility considerations without informational value. No autoplay risk exists. |
| Drag-to-rotate | **Not implemented** | The satellite is a captioned concept visualisation, not a product to inspect; on touch, a drag on a full-screen pinned stage competes with scrolling (the primary navigation); the scroll-driven camera already reveals the spacecraft. |

## 4. Tests actually performed (final build)
- `npm run typecheck`, `npm run build`: pass.
- Interaction suite (`scripts/qa/interactions.mjs`): **30/30 pass** (log: `qa/interactions-run.txt`), up from 19 checks: added worker/fallback/context-loss/texture-failure (W1–W4), mobile CLS (P1), 200% text (A5), pinned-layout fit (A6), unconfigured-origin leaks (S2) and five endpoint failure modes.
- CSP check (`scripts/qa/csp-check.mjs`): 3/3 pass + negative control detected.
- Lighthouse, 3 runs × 3 modes (§2.1); `scripts/qa/lighthouse.sh`.
- Screenshot sweep at **1440×900, 1280×800, 1024×768, 768×1024, 390×844, 360×740**, plus
  200%-text checks at 1280 and 390, missing-image checks at 1280 and 390, and no-JS checks.
- Payload (`scripts/qa/payload.mjs`, uncompressed bodies from the local server; worker texture
  fetches are invisible to Playwright's page listener and are added from file sizes):
  desktop full visit ≈ **1.6 MB** (1,334 KB observed + 274 KB 2k textures), 14 requests + 2 in the
  worker; mobile ≈ **1.07 MB** (983 KB + 83 KB 1k textures). Main-thread JS **14 KB gzip**;
  three.js worker chunk 552 KB raw / **136 KB gzip**, loaded after the intro (153 KB gzip
  after the hero rebuild, §9). 0 failed requests.
  (Reference site: ≈ 49 MB.)

## 5. Accessibility status
| Area | Status |
|---|---|
| Lighthouse accessibility | 100 on all pages and runs |
| Contrast (token pairs, computed WCAG ratios; palette unchanged this pass) | bone/void 16.76 · mist/void 7.97 · mist/graphite 7.48 · ink/bone 15.48 · slate/bone 5.15 · slate/paper 5.63 · index orange/bone 5.72 · signal/void 6.47 · error/void 8.68 — all ≥ 4.5:1 |
| Keyboard, focus visibility, menu trap/Esc/restore | automated tests F2a–d, M1a–b |
| Text resize 200% | fixed + test A5 |
| Reduced motion | test M3 |
| Form labels/errors/status | tests F3a–c; `role=status`, `aria-invalid`, `aria-describedby` |
| Accessibility tree review | done (code-level, via Chromium AX tree) |
| **Screen-reader testing** | **Not performed** — no screen reader or speech engine exists in this environment (only AT-SPI libraries). Must be done on real devices (release checklist C3). |
| Known nuance | Chromium exposes `text-transform: uppercase` text in upper case in accessible names; most screen readers read it normally, but this is unverified here. |

## 6. Status by category

**Verified and completed (automated evidence on the final build)**
Worker-based 3D stage and its lifecycle; TBT and CLS fixes; 200% text flow layout; Capabilities
fit at 1280×800; heading/HUD a11y fixes; form failure handling; CSP/security headers; SEO guards;
closing-sequence timing; no overflow, console errors or failed requests at six widths.

**Improved but not fully verified**
- Real-GPU behaviour of the worker path: works and renders identically in software GL, but
  frame rate, memory and thermals on real GPUs/phones were not measured. Software GL saturates
  one CPU-based GPU process in both worker and fallback modes, so it cannot show real gains.
- Safari 16 (OffscreenCanvas without WebGL): by design the worker reports the failure and the
  poster stays; not tested on Safari.

**Blocked by unavailable hardware or tooling**
Safari/Firefox/Edge; physical iOS/Android devices; screen readers. The pre-installed `serve` has a
broken header feature (`minimatch is not a function`); replaced for QA by
`scripts/qa/static-server.mjs`.

**Waiting for real company information**
Confirmed service copy (`contentStatus` stays `'provisional'`), contact e-mail, legal entity,
privacy notice.

**Required before public launch**
`SITE_URL`, `PUBLIC_CONTACT_ENDPOINT`, confirmed copy, privacy notice, a real end-to-end form
submission, real-device and screen-reader passes, an authorised deployment process (none is
configured; nothing was deployed).

## 7. Run instructions
```bash
npm install
npm run dev                  # http://localhost:4321
npm run build && npm run preview
npm run release-check        # fails until launch configuration is supplied
```
Node ≥ 22.12. QA tooling: `README.md`.

## 8. Remaining release blockers (summary)
1. `SITE_URL` (production HTTPS origin)
2. `PUBLIC_CONTACT_ENDPOINT` (and a real test submission)
3. Confirmed company copy → `contentStatus = 'confirmed'`
4. Privacy notice and legally required business information
5. Real-device, cross-browser and screen-reader verification
6. An authorised deployment process

## 9. Hero rebuild after the "Orbital Intelligence" reference

**Request:** make the first screen match the Edolus hero shown on Awwwards
(`awwwards.com/inspiration/orbital-intelligence-edolus`), with a realistic satellite.

**What was matched (composition only; no Edolus code, model, logo or copy used):**
- A black field. The camera is in close-up on one flat-panel spacecraft lying on a diagonal:
  the bus sits centre-right and an accordion solar wing reaches off the top-left of the frame.
- A thin white plexus with "+" nodes riding with the spacecraft. It fades out within the
  first 20 % of the stage scroll.
- A heavy two-line uppercase title low on the left (x ≈ 14 vw), with a mono uppercase
  subtitle and a "+" bullet beneath it. There is no eyebrow, paragraph or buttons in the hero.
- A warm scattered-light haze top-left, a spectral lens-flare crescent on the right and a
  faint blue horizon glow at the bottom (CSS, `aria-hidden`).
- A cursor-following "Scroll to begin ↓" label on fine pointers. Touch tablets keep the static
  hint.
- Scrolling pulls the camera back from the close-up to the existing Earth/orbit view.

**Satellite realism:**
- The new model is `src/scripts/stages/satellite.ts`: original procedural geometry with
  seeded, canvas-drawn PBR maps, so there are no downloads. It has:
  - a 16 × 16-cell solar face with fingers, bus bars and a harness strip, plus a roughness map
    and a bump map;
  - an anodised skin with seams, fasteners and mottling;
  - crumpled MLI foil, phased-array tiles, grilles, thrusters with bell nozzles and star
    trackers.
- The scene adds image-based lighting from a procedural environment: a cloud-flecked Earth
  below and in front, and a warm haze.
- It also adds hero key and fill lights, HDR bloom, and a lens pass (edge chromatic aberration
  and vignette).
- I evaluated NASA's Suomi NPP glTF (public domain) and rejected it: its solar array has no
  cell detail and its silhouette is unlike the reference. It is not shipped.

**Fixed along the way:**
- **Tone-mapped clear colour.** With post-processing, the clear colour now passes through tone
  mapping, so it is compensated to land on `--void`.
- **Atmosphere shell in the close-up.** From the close-up, the atmosphere shell filled the
  lower frame, so it now fades in as the camera pulls back.
- **Document height changed while scrolling (pre-existing).** `content-visibility: auto`
  height estimates on Ground (1700 px) and the footer (520 px) did not match their real heights
  (about 1279 px and 475 px at 1440 wide). The page shrank the first time those sections
  rendered, which made the End key land short (test M1b failed intermittently). I removed both
  estimates.
- **Keyboard scroll during an animated jump (pre-existing).** A keyboard scroll key pressed
  during an animated anchor jump was overridden by the animation. Navigation keys now cancel
  the animation. Verified 6/6 with End pressed 1.2 s into a jump.

**Tests (this build, SwiftShader, no GPU):**
- `typecheck` and `build` pass.
- Interaction suite: **30/30**. M1a now uses the index menu, because the hero CTA was
  removed with the reference layout.
- CSP check: 3/3 pass.
- Lighthouse mobile (applied throttling), 3 runs:
  - perf **92 / 94 / 90**
  - TBT 23 / 48 / 29 ms
  - LCP 2.28 / 2.06 / 2.57 s
  - CLS 0
- One extra run in the full script gave mobile-applied perf 88 with TBT 214 ms, which I treat
  as an outlier.
- Lighthouse mobile-simulated: perf 94. Desktop: perf 98, TBT 0.
- Mobile LCP is about 0.3–0.8 s later than before. The LCP element is now the hero title,
  revealed after the intro; the earlier layout's larger lead paragraph painted sooner.
- The worker chunk is 614 KB raw / **153 KB gzip** (was 136 KB), because of post-processing.
- Visual checks were done at 1440×900, 1024×768, 820×1180 and 390×844, and at 0 %, 20 % and
  50 % stage progress. I compared them by eye against the reference capture; this is not a
  pixel-diff.

**Not verified:** GPU frame rate and thermals on real phones, since bloom adds fill cost there;
Safari and Firefox.

## 10. Deployment and public-repository preparation

**Baseline (before changes, commit `4795634`, isolated worktree):**
- typecheck and build pass.
- Interaction suite 29/30. W3 sampled the poster at opacity 0.990, 800 ms into its
  900 ms fade (§10.3).
- An earlier 29/30 run (V1 failing) is discarded: I rebuilt `dist/` while that run was
  serving the tests.

### 10.1 Vercel behaviour (implemented, verified with simulated Vercel builds)

| Build | Origin | Robots | Result |
|---|---|---|---|
| `VERCEL_ENV=preview VERCEL_URL=…` | `https://$VERCEL_URL` | `noindex` meta, `X-Robots-Tag: noindex, nofollow`, robots.txt `Disallow: /`, no sitemap | `.vercel/output` with config.json routes carrying CSP and security headers |
| `VERCEL_ENV=production`, no launch info | — | — | **Build fails**: "Production build blocked: the release check failed" |
| local / other hosts | unchanged | unchanged | `dist/` + `dist/_headers` as before |

### 10.2 Deployment status

- **Vercel project:** `omerta` (account `musab-abukaraki-66`, Hobby). It was created
  without a Git link, so pushes do not deploy anything automatically. Node 22.x, build
  `npm run build`, install `npm ci`. Vercel Authentication is **disabled** for this
  project so the preview opens without a Vercel login; previews remain `noindex`.
- **Five unrelated projects already exist** on the account (`solo-chips-website`,
  `musab-abukaraki`, `datascope`, `datascope-zi2u`, `orbit`). They were not touched.
- **First deployment attempt** (branch `claude/intelligent-thompson-ab51p0`): Vercel
  inferred **Production**, because that branch is the GitHub default. The build
  **failed at the build step**, so nothing was published. The connector does not expose
  build logs; the failure is consistent with the production guard, and the guard's
  behaviour was verified in a local simulation.
- **Preview deployment:** `dpl_63yD3yztLypmfAtQWe2curtMpm1H`, built from `main` at
  `c23d1f3`. `main` was created with the owner's approval, identical to the working
  branch. Vercel classified it as Preview (target `null`), state READY.
- **Live checks** (headless Chromium + SwiftShader against the `*.vercel.app` URL), all
  passing:
  - intro plays; 3D stage runs in the worker; Archivo and IBM Plex Mono load; all images load;
  - Capabilities pins and translates (desktop) and swipes (390 px);
  - menu navigation lands on `#ground`;
  - no console errors or failed requests;
  - contact form says nothing was sent and issues **no** POST;
  - unknown path returns 404 with the custom page and `noindex`;
  - no horizontal overflow at 390 px.
- **Live HTTP checks:** CSP, HSTS, `nosniff`, Referrer-Policy, Permissions-Policy and COOP
  present; `X-Robots-Tag: noindex, nofollow`; robots.txt `Disallow: /`; no canonical;
  Open Graph image on the preview origin; `/contact` and `/contact/` return 200;
  sitemap absent (404); media cached for 7 days.
- **Not tested live:** Lighthouse against the Vercel URL; real devices and browsers.

### 10.3 Test changes (no assertions weakened)
- **W3** now waits up to 3 s for the poster to reach full opacity instead of sampling at
  800 ms during a 900 ms transition. The checked end state is unchanged.
- **M1b**: intermittent. Pressing End right after a menu anchor jump sometimes leaves the page
  where it is: 3 of 16 isolated runs on the current build and **3 of 16 on the
  unmodified baseline `4795634`**, so it predates this pass.
  - Instrumentation shows the key event arrives and is not `preventDefault`ed, no script
    calls a scroll API, Lenis is idle, and moving focus off the anchor does not help. The
    browser simply does not perform the default scroll.
  - Not reproduced outside headless Chromium + SwiftShader; real-browser behaviour is
    unverified.
  - The test waits up to 8 s for the end state (it still fails when the scroll never
    starts) and was not weakened further.
  - The final full-suite run passed 30/30; expect occasional M1b failures in this
    environment.

### 10.4 Public-repository audit
- **Secrets:** none found in the tree or in any commit, by pattern search for cloud keys,
  GitHub/Vercel/Slack tokens, private keys and inline credentials. No `.env`,
  `.vercel/`, `dist/` or `node_modules/` was ever committed.
- **Third-party material:** 22 edolus.com screenshots (`docs/reference-captures/`) were
  removed from the tree. **They remain in Git history**, which blocks making this
  repository public until the owner chooses a remediation (`owner-inputs-and-release-blockers.md` P1).
  The reference write-ups are text with short quotations for commentary.
- **Machine-specific paths:** `scripts/qa/make-poster.mjs` wrote to a local temp path.
  It now uses the OS temp directory and also writes the final images.
- **Dead code removed:** an unused import (`orbit-stage.ts`), an unread interval handle
  (`orbit-hud.ts`), a `qa:shots` npm script pointing at a missing file, and
  `docs/project-task-list.md` (duplicated the release checklist).
- **Licence:** none present. Not chosen on the owner's behalf (`owner-inputs-and-release-blockers.md` P2).
- **NASA imagery:** credited and captioned as reference imagery, not OMERTA hardware.
  One photograph shows people in a clean room; check NASA's guidance on identifiable
  persons before commercial launch (`asset-credits.md`).

### 10.5 Final verification (commit after `c23d1f3`; code unchanged since that commit)
- `npm run typecheck`: pass. `npm run build`: pass. Configured build (`SITE_URL`,
  `PUBLIC_CONTACT_ENDPOINT`): pass.
- Interaction suite: **30/30** (log `qa/interactions-run.txt`).
- CSP check served with the generated headers: **3/3**.
- `npm run release-check`: **fails, as intended**. `SITE_URL` and
  `PUBLIC_CONTACT_ENDPOINT` are unset and `contentStatus` is `provisional`; the privacy
  notice and legal details are not written.

## 11. Clean repository and finalisation

**Clean repository.** Built from `git archive` of the approved tree, so it carries only
tracked files and no history. It gets a fresh history of one initial commit.
- Excluded:
  - the 22 edolus.com screenshots (already absent from the tree);
  - outdated generated evidence: `docs/qa/screens/` (47 screenshots of the previous hero)
    and two Lighthouse HTML reports. Both remain in the private original repository.
- Audited:
  - no `.env`, build output, logs, caches or machine-specific paths;
  - no secret patterns;
  - every binary is listed in `asset-credits.md`.
- The fresh history was checked to contain no `reference-captures` path and no image
  outside `public/`.

**Changes in this pass.**
- `site.privacyNoticeUrl`: when set, it is linked from the footer and the contact form.
  The release check now **fails** while it is unset, which tightens the guard; it warns
  when `designer.url` is unset.
- `playwright` 1.56.1 pinned as a devDependency (the QA scripts import it).
- Launch requirements consolidated into `owner-inputs-and-release-blockers.md`, which
  replaces `release-checklist.md`.

**Verification in the clean tree** (fresh `npm ci`, 0 vulnerabilities):
- typecheck pass; production build pass; configured build pass.
- Interaction suite **30/30**, served with the generated security headers (CSP enforced).
- CSP check **3/3**.
- `npm run release-check`: fails as intended on `SITE_URL`, `PUBLIC_CONTACT_ENDPOINT`,
  `contentStatus` and `privacyNoticeUrl`.

**Not completed (permissions).** Creating the GitHub repository returned 403 for this
session's integration. Linking an existing Vercel project to a repository is not exposed
by the Vercel connector. See `owner-inputs-and-release-blockers.md` B1/B2.

## 12. Imagery replacement and stable preview URL

- **Imagery.** NASA's media guidelines state that recognisable people in NASA material may
  not be used commercially without their permission. The Approach chapter's Suomi NPP
  clean-room photograph (KSC-2011-7023) showed technicians, so it was replaced by an
  original render of the site's own orbit scene (`approach-orbit-*.webp`, produced by
  `scripts/qa/make-poster.mjs`). The NASA credit was removed; the caption now says the
  image is an illustrative render.
- **Stable preview URL.** `omerta-space.vercel.app` was added to the Vercel project as a
  domain bound to branch `main`. `omerta.vercel.app` (an unrelated "Omerta.io" site) and
  `omerta-website.vercel.app` (a paused deployment) belong to other accounts.
- **Verification in the clean tree:**
  - typecheck and both builds pass;
  - CSP check **3/3**;
  - interaction suite **29/30**: M1b failed, the known intermittent issue (§10.3) that
    also reproduces on the baseline; all other checks passed.

**Correction (same day).** At the owner's request the original NASA clean-room
photograph was restored to the Approach chapter, and the render was removed. Its
commercial-use question is tracked as F7 in `owner-inputs-and-release-blockers.md`.
