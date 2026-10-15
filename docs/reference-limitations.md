# Reference Research — Limitations

What we could **not** fully inspect on edolus.com, why, and how much it matters for
the OMERTA design decisions.

## Environment constraints

| Constraint | Effect | Mitigation |
|---|---|---|
| Headless Chromium uses **SwiftShader software WebGL**, not a GPU. | Frame rates are far below real hardware (a single 1440×900 screenshot can take >30 s); time-based effects (bloom shimmer, particle motion, video playback) appear frozen or stepped. Shader quality may differ slightly from a GPU. | Visual composition, colour and typography were judged from stills; motion timing was taken from **source code values**, never from capture frame rates. |
| Only Chromium was available (no Safari/Firefox, no real phones). | Cross-browser behaviour of the reference is unknown. | Mobile behaviour was studied with Playwright device emulation (390×844, touch, `isMobile`) plus the mobile branches in source. |
| No audio output device. | The music stems and UI sound effects were not heard. | Their existence, file sizes and trigger names are confirmed from `config.json`; their character is **not** evaluated. |

## Content not observed in a live render

| Item | Status | Why | Impact |
|---|---|---|---|
| `sceneCar` (progress 0.71–0.85) | Observed at 1280×800 (car interior with in-dash screen; car in a white studio — header logo switches to dark). The two centre messages were **not** caught on screen. Because we jumped the timeline with `scroll:setProgress`, the satellite title from segment 0 lingered over these frames — almost certainly an artefact of jumping rather than real scroll behaviour. | Messages are progress-windowed; jump-induced state. | Low — copy and timing windows are confirmed in source (`textCenterFade`). |
| `sceneEnding` visuals (0.85–1.0) | Observed at 1280×800: letterbox bands over a blurred scene with "Edolus **never existed.**", then "The experience **did.**", then the studio logo, "Now **imagine your own.**" and the bracketed e-mail (`19-finale-credits`). The REPLAY button fade-in was not isolated. On mobile the 0.98 frame rendered black (text confirmed via DOM). | Fade timing vs capture moment. | Low. |
| `cardHover.js`, `pointerRipple.js`, `mouseParallax.js` behaviour | Names confirmed, effects not observed. | No real pointer movement during captures. | Low — we do not copy these; OMERTA designs its own hover states. |
| Drag-to-rotate interaction (0.44–0.46) | Confirmed in code, not exercised. | — | Low. |
| Real-world frame rate / jank on GPUs and phones | Not measured. | No GPU / devices. | Medium — we cannot claim Edolus is smooth or janky on real devices; we only note its 49 MB payload and continuous render loop as risks. |
| Accessibility tree | Not audited with a screen reader. | — | Low — the content is canvas-rendered; source shows no ARIA or semantic structure, and pinch-zoom is disabled by the viewport meta. |

## Method boundaries we respected

- We read only files the site serves publicly to every visitor (HTML, CSS, JS, JSON
  scene/config). We did **not** download or reuse its 3D models, textures, video,
  audio, fonts or logo SVG for OMERTA.
- We drove the timeline in captures by calling the page's own global
  `EventBus.emit('scroll:setProgress', p)`; this is equivalent to scrolling and
  touches nothing server-side.
- Measured values (payload, request count) come from one mobile-emulated session and
  may vary with caching and range-request behaviour.

## Hypotheses (not verified)

- The "Seedance" background MP4 is very likely AI-generated video (file name
  matches a known video-generation model naming pattern). Not verified.
- Several captured frames show chromatic fringing at frame edges; this is consistent
  with the `chromaticTransition` / post-FX scripts but could also be a software
  rendering artefact.
