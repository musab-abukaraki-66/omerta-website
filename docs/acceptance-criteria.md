# OMERTA — Acceptance Criteria

Each criterion is pass/fail and is verified by the method in brackets.

## Functional
- **F1** Every nav item (menu, header, footer) resolves to an existing route or an existing `id` on the page; no `href="#"`. [script: collect hrefs, assert targets]
- **F2** Menu opens/closes by click, closes on Esc and on link activation, traps focus while open, restores focus to the trigger, sets `aria-expanded`. [Playwright]
- **F3** Contact form: required-field validation with visible, announced errors; with no endpoint configured it shows an explicit *not sent* message and never a success message; with an endpoint it POSTs JSON and shows success only on a 2xx response. [Playwright with route mocking]
- **F4** Loader runs at most once per session, never blocks interaction for more than 2.2 s, and is skipped under reduced motion. [Playwright timing]
- **F5** Without WebGL the hero shows the static poster and no console errors. [Playwright with WebGL disabled]
- **F6** 404 page exists and links home. [build output]

## Visual / design
- **V1** Header wordmark is centred and recolours on the light Capabilities chapter. [screenshots]
- **V2** All six chapters render with their intended composition at 1440, 1280, 1024, 768, 390, 360. [screenshots reviewed]
- **V3** No horizontal page overflow at any tested width. [`scrollWidth <= innerWidth` check]
- **V4** No text clipped or overlapping at tested widths. [screenshot review]
- **V5** Imagery never stretched; captions identify NASA imagery as reference imagery and the 3D as a concept visualisation. [review]

## Motion
- **M1** Scroll is native (scrollbar, keyboard, anchors and find-in-page work). [manual via Playwright keyboard + anchor]
- **M2** Stage progress animations are scroll-linked and reversible. [screenshots at progress points both directions]
- **M3** `prefers-reduced-motion: reduce` disables smoothing, scramble, typewriter, loader and grain animation; content fully visible. [Playwright `reducedMotion: 'reduce'`]
- **M4** WebGL rendering stops when the stage is off-screen. [instrumented frame counter]

## Performance (Lighthouse, mobile emulation, local preview server)
- **P1** LCP ≤ 2.5 s, CLS ≤ 0.05, TBT ≤ 300 ms.
- **P2** Initial JS ≤ 60 kB gzip excluding the lazy three chunk.
- **P3** First-view transfer ≤ 3 MB. No failed requests.

## Accessibility
- **A1** Lighthouse accessibility ≥ 95.
- **A2** Text contrast ≥ 4.5:1 (computed for token pairs).
- **A3** One H1 per page, landmarks present, skip link works, every informative image has alt text.
- **A4** Visible focus on every interactive element.

## SEO
- **S1** Unique `<title>` and meta description per page, canonical, Open Graph + Twitter card, sitemap, robots.txt, `lang` attribute. [inspect build output]
