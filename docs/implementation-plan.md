# OMERTA — Implementation Plan

## 0. Starting point
The repository was empty (no commits, no files). There was no existing application
to preserve, so the stack is chosen fresh — the smallest set that meets the
acceptance criteria.

**Stack decision**
| Need | Choice | Why |
|---|---|---|
| Static, SEO-friendly multi-page output, components | **Astro 7** (static build) | Ships zero JS by default; real HTML for every page; typed components. |
| 3D Earth + satellite stage | **three.js** (lazy-loaded, one canvas) | The orbit stage is the brand's centrepiece; custom shaders needed for terminator/atmosphere. Loaded after first paint, only if WebGL is available. |
| Smooth wheel scrolling | **Lenis** (desktop fine-pointer only) | Reproduces the reference's lerp-0.1 smoothing *on top of native scroll* — no hijacking, scrollbar/anchors/find still work. Disabled for touch & reduced motion. |
| Fonts | `@fontsource-variable/archivo` (wdth+wght), `@fontsource/ibm-plex-mono` | Self-hosted, OFL, no third-party font CDN. |
| Sitemap | `@astrojs/sitemap` | SEO fundamental. |
| Tweening | none (own ~40-line rAF utilities) | GSAP not needed for scroll-linked progress. |

## 1. Information architecture
```
/                 Home — the chaptered narrative
  #top            Hero (aperture reveal, WebGL stage)
  #orbit          01 Space segment (WebGL stage continues, live reference-orbit HUD)
  #observation    02 Earth observation (scan reveal over Landsat scene)
  #ground         03 Ground segment & data (DSS-53 photo, data-path diagram)
  #capabilities   04 Capabilities (pinned horizontal cards, light chapter)
  #approach       05 Approach (statement cross-fade + 4 steps)
  #contact-cta    Finale (shutter bands close) → /contact/
/contact/         Enquiry form (honest submission behaviour)
/404              Not found
```

## 2. Design system
`src/styles/tokens.css` (colour, type scale, spacing, easing, z-index),
`src/styles/global.css` (reset, base, utilities, grain, focus). Tokens mirror
`omerta-creative-direction.md §3`.

## 3. Component architecture
```
src/
  layouts/Base.astro            <head> SEO/OG, header, menu, footer, grain, loader
  components/
    Wordmark.astro              SVG stroke wordmark with orbiting node
    Header.astro / Menu.astro   centred wordmark, Index + Contact, overlay menu
    Loader.astro                draw-on wordmark + odometer + aperture bands
    BracketButton.astro         CTA with bracket corners + scramble label
    SectionHead.astro           index / eyebrow / title / lead
    Hud.astro                   key–value HUD panel
    sections/Hero.astro, Orbit…, Observation…, Ground…, Capabilities…, Approach…, Finale…
    Footer.astro
  content/site.ts               all copy & data (editable content model)
  scripts/
    core/raf.ts                 single rAF loop, visibility pausing
    core/scroll.ts              Lenis init + section progress tracking
    core/motion.ts              reduced-motion flag, easing helpers
    fx/scramble.ts, typewriter.ts, reveal.ts, cursor-hint.ts
    ui/header.ts, menu.ts, loader.ts, contact-form.ts
    stages/orbit-stage.ts       three.js scene (lazy)
    stages/orbit-hud.ts         circular-orbit propagation for live readouts
    stages/scan.ts, diagram.ts, cards.ts, statements.ts, finale.ts
```

## 4. Asset strategy
- NASA public-domain sources only (credits in `docs/asset-credits.md` and footer).
- Pre-processed to WebP at 800/1400/2000 w; `srcset` + `sizes`; explicit
  width/height to prevent CLS; `loading="lazy"` except above-the-fold.
- Earth textures 1k (mobile) / 2k (desktop) WebP.
- WebGL fallback poster: a still rendered from our own scene.

## 5. Animation strategy
- One rAF loop (`core/raf.ts`) shared by Lenis, stage progress and WebGL; it idles
  when nothing subscribes and pauses on `visibilitychange`.
- Stages: a tall section with a `position: sticky` 100vh inner; progress =
  scrolled distance / (height − viewport). Only stages intersecting the viewport
  are computed (IntersectionObserver gating).
- Reveals: IntersectionObserver adds `.is-in`; CSS transitions do the work.
- WebGL renders only while its stage is on screen; DPR capped at 1.75 (1.25 on
  coarse pointers); no render when progress and time-driven motion are idle under
  reduced motion.
- `prefers-reduced-motion: reduce`: no loader, no Lenis, no scramble/typewriter
  (final text shown), no grain animation, stages show their end-state layouts
  statically, WebGL renders a single still frame per scroll change.

## 6. Responsive strategy
Breakpoints: 1280, 1024, 768, 480. Mobile changes are compositional, not just
scaling: hero copy moves to bottom third; HUD collapses to 2-column rows; the
capabilities track becomes a native horizontal swipe with scroll-snap (no pin);
diagram becomes vertical; stage heights shrink (less scroll per chapter).

## 7. Performance requirements
- JS on first load (excluding lazy three chunk) ≤ 60 kB gzip.
- three chunk lazy, fetched after `load` + idle.
- LCP ≤ 2.5 s on Lighthouse mobile emulation; CLS ≤ 0.05; TBT ≤ 300 ms.
- Total transferred on first view ≤ 3 MB (vs. 49 MB for the reference).

## 8. Accessibility requirements
WCAG 2.2 AA: semantic landmarks, one H1 per page, logical heading order, skip link,
visible focus (Signal outline), keyboard-operable menu with focus trap and Esc,
`aria-expanded`, form labels + error messaging with `aria-live`, alt text on every
informative image, decorative canvases `aria-hidden`, zoom never disabled,
contrast ≥ 4.5:1 for text.

## 9. Testing strategy
- `npm run build` + `tsc --noEmit`.
- Playwright scripts (`scripts/qa/`): screenshots of every section at 1440, 1280,
  1024, 768, 390, 360; horizontal-overflow detection; console-error and
  failed-request capture; interaction tests (menu open/close/Esc/focus, anchors,
  header theme switch, form validation and unconfigured-endpoint behaviour,
  reduced-motion run, WebGL fallback run).
- Lighthouse (mobile + desktop) via the pre-installed Chromium.

## 10. Milestones
| # | Deliverable | Depends on | Tasks | Verification | Done when |
|---|---|---|---|---|---|
| M1 | Scaffold + design tokens + base layout | — | Astro config, fonts, tokens, Base layout, header/footer | build passes; page renders | Base page renders at all widths without overflow |
| M2 | Wordmark, loader, header/menu | M1 | SVG wordmark, loader sequence, menu a11y | Playwright: menu keyboard test, loader skip on revisit/reduced motion | Tests pass |
| M3 | Hero + Orbit stage (WebGL) | M1 | three scene, procedural satellite, orbit HUD, fallback | screenshots; console clean; fallback run | Renders in SwiftShader; fallback shows poster |
| M4 | Observation, Ground, Capabilities, Approach, Finale | M1 | sections + stage scripts | full-page screenshots at 6 widths | All sections render; no overflow |
| M5 | Contact page | M1 | form, validation, endpoint config | interaction test (invalid, unconfigured, mocked success) | Honest messages verified |
| M6 | QA loop | M2–M5 | fix defects found | repeat screenshots | No known critical defects |
| M7 | Perf/a11y + handover | M6 | Lighthouse, contrast, docs | reports | `final-qa-report.md` reflects measured results |
