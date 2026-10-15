# Interaction Inventory — edolus.com

Every row is either read from the served source (**code**) or seen in a live capture
(**render**), or both. Durations/easings marked *code* are exact values from the
source; others are estimates. Rows we could not observe are listed in
`reference-limitations.md`, not here.

Legend — Scroll dep.: *yes* = driven by timeline progress; *no* = time-based.

| # | Element / section | Initial state | User action | Resulting state | Animation / transition | Duration & easing | Scroll dep. | Desktop | Mobile | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Loader wordmark | Black screen, logo glyphs hidden | None (page load) | Wordmark fully drawn | Per-letter soft-edged left→right wipe on OffscreenCanvas in a Web Worker; fallback staggered fill fades | 1,100 ms/letter, 220 ms stagger, easeInOutCubic (fallback 0.9 s, 0.15 s stagger) | no | yes | yes | code + render (`00-loading-black`) |
| 2 | Loader % readout | Hidden, 20 px under logo | None | Counts to 100 then vanishes | Per-digit odometer: only changed digit columns roll | 200 ms slide easeOutCubic + 70 ms hold per step | no | yes | yes | code |
| 3 | Reveal bands | Two black bands cover screen | Load complete + logo drawn + ≥3 s elapsed | Live scene revealed | Bands translateY apart | 1,600 ms `cubic-bezier(0.65,0,0.35,1)` after 800 ms settle | no | yes | yes | code |
| 4 | Logo dock | Logo centred at 430 px wide | Reveal begins | Logo at header (156 px, top 40) | FLIP transform (scale + translate on one transform) | 1 s `cubic-bezier(0.25,0.1,0.25,1)` | no | yes | yes (108 px, top 20) | code + render |
| 5 | Splash title | Empty | Reveal | "INTELLIGENCE AT PLANETARY SCALE" | Letters in random order fade 0→1 and de-blur 12 px→0 | 1.2 s each, `expo.out`, 0.5 s lead, 60 ms stagger | no | yes | yes | code + render (`01-splash`) |
| 6 | Splash subtitle / bottom notice | opacity 0 | Reveal | Visible | Group opacity fade | 3 s ease, 0.3 s delay | no | yes | yes | code + render |
| 7 | CTA "INITIATE SYSTEM" construct-in | Hidden | Reveal | White button | Collapses to 1 px line, height expands; label scrambles in at 50% height | 0.18 s `power3.out` | no | yes | yes | code + render (scramble mid-state captured) |
| 8 | CTA corner squares | 4×4 px squares 6/8 px outside corners | Hover | Squares touch corners (4 px out) | `top/left/right/bottom` transition | 0.3 s ease | no | yes | n/a (no hover) | code + render (`02-cta-hover`) |
| 9 | CTA label blink | Steady | Hover | Two hard on/off flashes | `steps(1,end)` keyframes | 0.10 s | no | yes | n/a | code |
| 10 | CTA hover → scene | Background video static | Hover / leave | Video slowly pushes in / eases back | WebGL (`videoEarth.js` listens to `cta:hover`) | not measured | no | yes | n/a | code |
| 11 | CTA click | Splash visible | Click / tap | Splash dismissed, overlay header shown | Button blinks out; title group fades + blurs to 14 px; 50% dim fades; chromatic-aberration post-effect; overlay fades in under the logo then splash cut in one frame | blink 0.2 s steps; fade/blur 1.4 s `cubic-bezier(0.4,0,0.2,1)`; overlay 1.2 s | no | yes | yes | code + render (`03-post-cta`) |
| 12 | Intro gate | Timeline locked at 0 | First 1,200 px of wheel/touch | Satellite flies into its "in view" pose; timeline then unlocks | Lerped intro value | lerp 0.1 / frame | yes | yes | yes | code |
| 13 | Cursor scroll hint | Hidden | Pointer moves during progress 0.01–0.10 | "SCROLL TO BEGIN ↓" follows the cursor 24 px to its right | Text scramble + lagged follow (lerp 5) | show delay 600 ms | yes | yes | not observed (no cursor) | code + render (`03-post-cta`) |
| 14 | Virtual scroll | page never scrolls | Wheel / touch-drag / Arrow / PageUp/Down | Progress advances 0→1 | Exponential smoothing; deltaMode lines ×18, pages ×innerHeight | lerp 0.1, frame-rate independent | yes | 32,000 px | 4,000 px | code |
| 15 | Snap to hero poses | — | Stop scrolling within ±0.014 of a snap point | Eases onto 0.06 / 0.145 / 0.205 / 0.44 / 0.52 / 0.61 / 1 | via lerp | after 1 s idle | yes | yes | yes | code |
| 16 | Stretch bands | — | Scroll through a band | Same wheel distance advances progress more slowly (×1.5–2.5) | piecewise-linear remap | — | yes | yes | yes | code |
| 17 | Satellite title "ORBITAL INTELLIGENCE" | off | Scroll in segment 0 | Bold 2-line title bottom-left; mono subtitle scrambles | Scramble + blur-in on last letters | not measured | yes | yes | clipped at 390 px | render |
| 18 | Plexus network | — | Scroll | Thin white lines between `+` crosshair nodes drift around the satellite | WebGL lines | continuous | yes | yes | yes | render (`04`) |
| 19 | Satellite label "AI CHIP" | hidden | Scroll to ≈0.06 | Label + subtitle scramble in next to a ring marker | Scramble | not measured | yes | yes | yes | code + render (`05`) |
| 20 | Orbit cursor "DRAG TO ROTATE" | hidden | Pointer during progress 0.44–0.46 | 120 px spinning ring with label; dragging rotates the object | ring grow/shrink 0.45 s, spin 6 s | — | yes | yes | n/a | code |
| 21 | Cloud transition | — | Scroll 0.14→ | Camera passes through clouds; light trails converge on hub emblem | WebGL | continuous | yes | yes | yes | render (`06`) |
| 22 | Map HUD | — | Scroll segment 1 | Frame with chamfered corners; glowing street grid draws in; "URBAN SYSTEMS" title + mono body | WebGL + scramble | not measured | yes | yes | yes | render (`07`, `08`) |
| 23 | Typewriter lines | empty | Scroll segment 2/3 | Mono text typed with `_` caret | per-char typing | not measured | yes | yes | yes | code + render (`10`, `12`) |
| 24 | Data-centre dolly | wide corridor | Scroll 0.28–0.54 | Camera pushes to hero rack; dust particles in light cone | WebGL | — | yes | yes | yes | render (`09`–`11`) |
| 25 | Chip reveal | — | Scroll 0.54–0.57 | Processor rises; "EDL-72" title; spec list typed | WebGL + typewriter | stretch ×2.5 | yes | yes | yes | render (`12`) |
| 26 | Card system | — | Scroll 0.57–0.71 | Cards (title, subtitle, 3 bullets) slide horizontally inside a rounded "screen" | horizontal move driven by vertical scroll | stretch ×1.5 | yes | yes | horizontal strip partly off-screen | code + render (`14`, `m02`) |
| 27 | Card hover | — | Hover a card | Card responds (exact effect not observed) | `cardHover.js` | not measured | no | yes | n/a | code (name only) |
| 28 | Centre messages | — | Scroll 0.76–0.84 | Two centred messages cross-fade | opacity ramps, 0.008 progress fade | — | yes | yes | yes | code |
| 29 | Ending letterbox | — | Scroll 0.85→1 | Bands slide in to full black, backdrop blur ramps, lines fade in/out, finale logo + tagline + e-mail + REPLAY | opacity/blur ramps tied to progress | — | yes | yes | yes | code + DOM text dump |
| 30 | Replay | finale visible | Click REPLAY EXPERIENCE | Fade to black, session flag set, page reloads, silent reveal | fade then reload | configurable ms | no | yes | yes | code |
| 31 | Header logo colour | white | Scroll past threshold | Cross-fades to `#1F1F1F` (light scenes), reversible | colour lerp across ± fade half-width | — | yes | yes | yes | code |
| 32 | Header logo "O" | full ring | none (loop) | Stroke hides around the ring, redraws, pauses | CSS `stroke-dashoffset` keyframes | configurable | no | yes | yes | code + render (`ED`LUS` mid-loop in `06`, `08`) |
| 33 | AUDIO toggle | music state | Click | Toggles music; EQ bars animate while playing | `pc-eq-dance` 1 s loop | — | no | icon + label | icon only | code + render |
| 34 | Pointer ripple / mouse parallax | — | Move pointer | Ripple on surfaces / slight camera offset | WebGL | — | no | yes | not observed | code (names) |
| 35 | Film grain / chromatic | — | always / on transitions | Grain over image; RGB split on transitions and frame edges | post-effects | continuous | partly | yes | yes | code + render (fringing visible in `01`, `08`) |
| 36 | Menu open/close | — | — | **Not present** — the site has no menu | — | — | — | — | — | code (OverlayManager builds only logo + audio) |
| 37 | Page transitions / routes | — | — | **Not present** — single route | — | — | — | — | — | code |
| 38 | Forms | — | — | **Not present**; only a `mailto:` link at the finale | — | — | — | — | — | code |
