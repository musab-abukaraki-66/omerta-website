# Reference Audit — edolus.com

**Audit date:** 2026-10-15
**Method:** direct HTTP retrieval of the public build files, static analysis of the
publicly served (unauthenticated) JavaScript/JSON, and live rendering in headless
Chromium 141 (Playwright 1.56, SwiftShader software WebGL) at 1440×900 and 390×844.
No authentication, access control or technical restriction was bypassed. Everything
below was retrieved from URLs the site serves to every visitor.

Confidence labels used throughout:

- **Confirmed (code)** — read directly in the served source/config.
- **Confirmed (render)** — observed in a live browser capture.
- **Estimate** — measured from screenshots or inferred; marked explicitly.
- **Hypothesis** — plausible but not verified.

The screenshots taken of edolus.com during this audit are **not distributed with this
repository**: they are third-party material and no right to redistribute them has been
established. Findings below cite the public source files and describe what the captures
showed; anyone can reproduce them by visiting the site.

---

## 1. What Edolus actually is

| Finding | Evidence | Confidence |
|---|---|---|
| Edolus is **not a DOM website**. It is an exported **PlayCanvas** (WebGL game engine) project rendered into a single full-window `<canvas>`. | `index.html` loads `playcanvas-stable.min.js`, `__settings__.js`, `__start__.js`, `__loading__.js`; `config.json` → `engineV2: true`, `fillMode: FILL_WINDOW`. | Confirmed (code) |
| There is **one route** (`/`). There are no other pages, no navigation menu, no links between pages. | No `<a>` elements in served HTML; overlay creates only a logo and an AUDIO toggle (`OverlayManager.js`). | Confirmed (code + render) |
| Edolus is a **fictional brand used as a studio showcase**. The finale states *"Edolus never existed." / "The experience did."* then *"Now imagine your own."* with a link to `vertex3d.asia` and `studio@vertex3d.asia`. | `endingCredits.js` attribute descriptions + generated HTML. | Confirmed (code) |
| Consequently its "company" claims (e.g. *"EDL-72 Compute Core"*, *"4.8 ExaOPS"*) are fiction by design. OMERTA must **not** borrow this device of invented specifications. | `hudText` attribute strings in scene JSON. | Confirmed (code) |

This matters for the translation: Edolus optimises for a cinematic, linear, audio-led
experience; it deliberately sacrifices SEO, accessibility, selectable text, deep
linking and low-bandwidth support. OMERTA is a real company site and needs all of
those, so we translate the *principles*, not the architecture (see
`omerta-creative-direction.md`).

## 2. Technical implementation

### 2.1 Stack (confirmed)

| Layer | What is used | Evidence |
|---|---|---|
| Rendering | PlayCanvas engine (WebGL2 → WebGL1 fallback), `antialias: true`, `alpha: false`, `powerPreference: high-performance` | `__settings__.js` |
| Scripts | 107 PlayCanvas script assets concatenated into one minified `__game-scripts.js` (1,000,462 bytes) | `config.json` asset registry |
| Tweening (DOM) | GSAP 3.12.5 from cdnjs, used only by the loading screen (title letters, CTA construct-in) and `TransitionManager` overlays | `__loading__.js`, `game.js` |
| Scroll | **Custom virtual scroll** (`ScrollManager.js`) — wheel/touch/keys are captured and mapped to a 0→1 progress value; the page itself never scrolls (`body { overflow: hidden }`) | `ScrollManager.js`, `styles.css` |
| Messaging | A tiny global pub/sub `EventBus` (`scroll:progress`, `scene:changed`, `experience:entered`…) | `game.js` line 1 |
| Texture compression | Basis Universal WASM transcoder (lazy) | `PRELOAD_MODULES` |
| Fonts | General Sans (Indian Type Foundry; 6 OTF weights in the project, Fontshare CDN fallback), JetBrains Mono 300/400/500/800 from Google Fonts | `__loading__.js`, `CursorManager.js` |
| Hosting | Cloudflare (`server: cloudflare`, `cf-cache-status: HIT`) | response headers |

### 2.2 Asset inventory (confirmed from `config.json`)

| Type | Count | Notable items |
|---|---|---|
| Scripts | 107 | see §2.4 |
| Materials | 61 | — |
| Render/mesh | 49 | — |
| Textures | 35 | `EARTH.png` (1.0 MB), card screenshots, solar panel PBR maps, cubemap faces |
| GLB containers | 11 | `StarlinkV2-1.glb` (3.6 MB), `Tesla-ready2.glb` (7.3 MB), `ComputeTrayJOINED.glb` (7.5 MB), `DiamondV4.glb`, `MAP.glb`, `processor.glb` |
| Audio / video | 17 | two background MP4s (~5.7 MB and ~6.0 MB, "Space" and an AI-generated "Seedance" clip), 3 music stems (~0.6–0.9 MB each), 11 UI sound effects (OGG) |
| Fonts | 6 | General Sans Extralight → Bold |

**Measured (render, 390×844 mobile emulation):** a first visit made **103 unique
requests totalling ≈ 49.3 MB** (largest: two GLB models of 7.5 MB and 7.3 MB, two
background MP4s of 6.0 MB and 5.7 MB fetched as ~20 range requests each, the 3.6 MB
satellite GLB). Mobile receives the same payload as desktop. This explains the
3-second minimum black loading hold the loader enforces.

### 2.3 Scene timeline (confirmed — `SceneManager.SEGMENTS` + `ScrollManager` attributes in `2509662.json`)

The whole experience is one timeline, `progress ∈ [0, 1]`.

| # | Segment | Progress | What is on screen (render) |
|---|---|---|---|
| 0 | `sceneSatellite` | 0.00 – 0.14 | Deep navy space, Earth limb glow, a detailed satellite model flies in; huge bold title "ORBITAL INTELLIGENCE" bottom-left with a mono subtitle; a plexus of thin lines with `+` crosshair nodes; a label "AI CHIP / Autonomous Inference Core" scrambles in beside the satellite. |
| 1 | `sceneDiamondMap` | 0.14 – 0.28 | Camera drops through a lilac-grey cloud layer; light trails converge on a diamond-shaped hub emblem; then a satellite map (desert city) inside a HUD frame with bracketed corners; glowing street grid; title "URBAN SYSTEMS" + mono body text. |
| 2 | `sceneDatacenter` | 0.28 – 0.54 | Black/gold data-centre corridor, spotlight cone, dust particles, wet reflective floor; a typewriter mono line "+ MASSIVE COMPUTATIONAL INFRASTRUCTURE…"; camera dollies to one hero rack "NVX-72 Compute Array". |
| 3 | `sceneChip` | 0.54 – 0.57 | Gold processor package rises; huge "EDL-72" title, mono spec list typed line by line. |
| 4 | `sceneUI` | 0.57 – 0.71 | Warm brown nebula, curved gold light arcs; a rounded-corner "screen" with cards (title / subtitle / 3 bullets each). |
| 5 | `sceneCar` | 0.71 – 0.85 | Car interior with an in-dash screen, then the car in a bright white studio (header logo turns `#1F1F1F`); two centred messages ("From digital twin / to real-world execution," → "AI systems bridge perception…") are confirmed in code but were not caught on screen. |
| 6 | `sceneEnding` | 0.85 – 1.00 | Letterbox bands close, background blurs; "Edolus never existed." → "The experience did." → studio logo + "Now **imagine your own.**" + bracketed e-mail + REPLAY EXPERIENCE. Regular/bold split inside one line. Captured (`17`–`19`). |

Scroll configuration actually deployed (scene JSON overrides the script defaults):

| Setting | Value | Meaning |
|---|---|---|
| `totalScrollPx` | 32,000 | wheel pixels for the whole 0→1 timeline (≈ 35 desktop viewports) |
| `touchScrollPx` | 4,000 | finger-travel px for the whole timeline on touch |
| `lerpSpeed` | 0.1 | exponential smoothing per 60 fps frame, frame-rate independent (`1-(1-0.1)^(60·dt)`) |
| `keyStep` | 0.12 | Arrow/PageUp/PageDown progress step |
| `introGate` | true, 1,200 px | after the CTA, the first 1,200 px of scroll only fly the satellite in |
| `snapPoints` | 0.06, 0.145, 0.205, 0.44, 0.52, 0.61, 1 | "hero" poses; range ±0.014, applied after 1 s idle |
| `stretchBands` | satellite 0.06–0.085 ×1.5, map 0.205–0.28 ×1.6, chip 0.545–0.57 ×2.5, UI 0.57–0.705 ×1.5, car 0.715–0.84 ×1.5 | slows the scroll rate where reading is required |

Scenes are enabled/disabled around the active segment (`dropPrevAt`, `preloadNextAt`)
so only ≤3 scenes render at once. At start-up a **warm-up walk** visits 2 points per
segment with frustum culling off to compile shaders before the reveal.

### 2.4 Script families (confirmed names; behaviour confirmed where noted)

- **Managers:** `SceneManager`, `ScrollManager`, `TransitionManager` (DOM overlay wipes via GSAP: fade, wipe-up/down `expo.inOut`, slice), `AudioManager`, `CursorManager`, `PostFXManager`, `CameraController`, `OverlayManager`, `LightManager`.
- **Text:** `textScramble`, `typeWriter`, `hudText`, `worldText`, `sceneText`, `textSatellite`, `textdatacenter`, `textCenterFade`, `textblur`, `diamondLabel`, `satelliteLabel`.
- **Post / atmosphere:** `FilmGrainEffect`, `posteffect-bloom`, `posteffect-bokeh`, `chromaticTransition`, `haloVignette`, `aurora`, `nebula`, `spacecloud`, `cloudTransition`, `cloudShadows`, `dustLight`, `lightShot`.
- **Geometry / data viz:** `plexus`, `dotgrid`, `infraGrid`, `infraGridMap`, `matrix`, `matrixGrid`, `dataScan`, `datalights`, `ringPulse`, `mapHud`, `intelligenceLayer`.
- **Interaction:** `mouseParallax`, `pointerRipple`, `cardHover`, `cardSystem`, `scrollRotate`, `scrollAppear`.

## 3. Visual system

### 3.1 Colour (sampled from captures — Estimate unless noted)

| Role | Value | Source |
|---|---|---|
| Page/loader base | `#000000` | Confirmed (loader CSS) |
| Canvas fallback background | `#1d292c` | Confirmed (`styles.css`) |
| Primary text | `#FFFFFF` | Confirmed (CSS) |
| Secondary text (subtitle, notices) | `#C4C7C7` at 0.8 opacity | Confirmed (CSS) |
| Logo on light scenes | `#1F1F1F` | Confirmed (`OverlayManager` default) |
| Dim overlay behind splash | `rgba(0,0,0,0.5)` | Confirmed |
| Space navy (satellite scene) | ≈ `#020A1A` → `#0B2A55` gradient | Estimate (sampled) |
| Cloud layer | ≈ `#8E9BB8` – `#B4BCD2` | Estimate |
| Desert map | ≈ `#B79A7A` / `#6E5A47` | Estimate |
| Data-centre gold | ≈ `#C9A46A` light cone on `#000` | Estimate |
| Nebula brown/gold | ≈ `#2A1E14` base, `#E0A860` highlights | Estimate |

Pattern: the site is **monochrome UI over chapter-specific colour temperatures** — each
scene owns one dominant hue (navy → lilac grey → desert → black/gold → brown/gold).
UI chrome never introduces its own accent colour; colour comes from the imagery.

### 3.2 Typography (confirmed CSS values)

| Element | Family | Weight | Size | Tracking | Case |
|---|---|---|---|---|---|
| Splash title | General Sans | 300 | `clamp(44px, 8.9vw, 96px)`, line-height 1.04 | 0.01em | upper |
| Splash subtitle | General Sans | 400 | `clamp(11px, 3.2vw, 14px)` | 0.12em | upper |
| CTA label | JetBrains Mono | 500 | 12px (9.6px mobile) | 0.1em | upper |
| Loading % | — | — | 0.75rem | 0.15em | — |
| AUDIO toggle | General Sans | 500 | 12px | 0.14em | upper |
| Cursor hint | JetBrains Mono | 400 / 800 | 12px | — | upper |
| Scene titles ("ORBITAL INTELLIGENCE", "URBAN SYSTEMS", "EDL-72") | General Sans | 700 (default) | viewport-relative (`0.06 × screen`) | 0 | upper |
| Scene body / HUD | JetBrains Mono | 400 | ≈ 12–13px (Estimate) | ≈ 0.05em | upper |

Pairing principle: **light, wide-set display sans for statements; heavy display sans for
chapter titles; monospace for anything "machine" (labels, specs, CTA, hints).**

### 3.3 Layout & spacing

- Header: logo **top-centre**, 156 px wide, 40 px from top (108 px / 20 px ≤ 768 px). AUDIO control top-right on the same baseline, side margin ≈ 60 px (Estimate). Confirmed (OverlayManager attributes / loader defaults).
- Splash: title group absolutely centred; subtitle 2rem below title; CTA slot 2.75rem below (1.75rem mobile); bottom notice pinned 40 px (20 px mobile) from bottom — mirroring the logo's top inset. Confirmed.
- Side safe margin: `clamp(24px, 6vw, 64px)`. Confirmed.
- In-scene titles sit on a loose left third (satellite) or centre (chip); HUD frames inset ≈ 14% horizontally (Estimate).
- Content density is extremely low: at most one title + one 1–3 line body per viewport.

### 3.4 Borders, radius, shapes

- CTA: solid white rectangle, **no radius**, with four 4×4 px white squares floating 6/8 px outside its corners. Confirmed.
- HUD map frame: thin translucent white strokes with chamfered corners and two small squares top-right (render).
- Cards/screen in `sceneUI`: generous rounded corners (≈ 16 px, Estimate).
- Crosshair "+" glyphs are the recurring ornament (plexus nodes, text bullets, frame corners).

### 3.5 Imagery

- Real-time 3D models (satellite, rack, chip, car) with PBR materials, bloom, bokeh DOF, film grain and chromatic aberration.
- Two looping background MP4s; one satellite-photo map texture.
- Strong vignettes; scenes are always darker at the edges than the centre.

## 4. Motion language (confirmed values)

| Pattern | Spec |
|---|---|
| Loader logo draw | each letter wiped left→right with a 14-unit feathered edge, 1,100 ms per letter, 220 ms stagger, easeInOutCubic, rendered on an **OffscreenCanvas in a Web Worker** so it never stalls during asset loading |
| Loader % | per-digit odometer; each step slides 200 ms (easeOutCubic) then holds 70 ms |
| Reveal | two black bands (top/bottom) translate away in 1,600 ms `cubic-bezier(0.65,0,0.35,1)` after an 800 ms settle |
| Logo dock | FLIP transform to header position, 1 s `cubic-bezier(0.25,0.1,0.25,1)` |
| Title | letters revealed in **random order**, opacity 0→1 + blur 12px→0, 1.2 s `expo.out`, 0.5 s lead, 60 ms stagger |
| Title group | opacity fade 3 s ease, 0.3 s delay |
| CTA construct-in | collapses to a 1 px line, height expands in 0.18 s `power3.out`; label scrambles in at 50% height |
| CTA hover | corner squares slide in to touch the button (0.3 s ease); label hard-blinks (`steps(1)`, 0.1 s) |
| CTA click | button blinks out (0.2 s steps), title group fades + blurs to 14 px (1.4 s `cubic-bezier(0.4,0,0.2,1)`), chromatic-aberration post-effect |
| Overlay | fades in over 1.2 s `cubic-bezier(0.4,0,0.2,1)`; logo cross-fades white ↔ `#1F1F1F` around a progress threshold |
| Logo "O" | loop: stroke hides around the ring then redraws, then pauses |
| Text scramble | per-character random glyphs for 30–70 frames, chars re-rolled with p = 0.28 per frame, ghost layout preserves width |
| Typewriter | mono lines typed with trailing `_` caret |
| Scroll | lerp 0.1 smoothing, snap to hero poses after 1 s idle, stretch bands slow the pace at reading moments |
| Transitions | overlay wipes `expo.inOut` / `expo.in`→`expo.out` slice; scene-to-scene dissolves happen in WebGL (cloud, cubes, chromatic) |

## 5. Responsive behaviour

| Aspect | Desktop | Mobile (≤ 768 px) | Confidence |
|---|---|---|---|
| Logo | 156 px, top 40 | 108 px, top 20 | Confirmed |
| AUDIO label | icon + "AUDIO" | label hidden (`max-width` or `pointer:coarse`), icon only | Confirmed (code), render |
| CTA | 1.2rem × 3rem padding, 12px | ×0.8 | Confirmed |
| Headphones icon | 40 px | 32 px | Confirmed |
| Scroll | 32,000 wheel px | 4,000 touch px | Confirmed |
| Viewport meta | `maximum-scale=1, user-scalable=no` — **pinch-zoom disabled** | — | Confirmed (accessibility issue) |
| Scene titles | left-aligned large | at 390 px the "ORBITAL INTELLIGENCE" title was **clipped off the right edge** in our capture | Render (could be timing-dependent) |

## 6. Strengths worth translating

1. **A single narrative spine.** Chapters move from orbit → atmosphere → ground → infrastructure → product → vision. Every scene answers "what's next in the data's journey".
2. **Restraint in UI chrome.** Centred logo, one control, no menu. Imagery carries the colour.
3. **A coherent typographic voice.** Light display / heavy display / mono, all uppercase, generous tracking.
4. **Micro-interactions with a "machine" character.** Scramble, typewriter, odometer, hard blinks, crosshairs, bracket corners — all variations of one idea: *a system booting and reporting.*
5. **Pacing control.** Stretch bands and snap points mean the reader lingers where the copy is.
6. **Seamless handoffs.** Logo docking, pixel-identical logo swap, frame-synchronised reveals — no blinks.

## 7. Weaknesses we must not reproduce

1. **Scroll hijacking** — native scroll, scrollbar, find-in-page, deep links and history are all unavailable.
2. **Zero accessible content** — all text lives inside WebGL textures or transient DOM; no headings, landmarks or alt text; pinch zoom disabled.
3. **Heavy payload** (≈ 49 MB measured on mobile) and continuous rendering; a 3-second minimum black screen.
4. **No SEO surface** — `<title>EDOLUS</title>` only; no description, no social metadata.
5. **Invented specifications** presented as fact (acceptable for a fictional showcase, unacceptable for OMERTA).
6. **Mobile clipping** observed on the satellite title at 390 px.
