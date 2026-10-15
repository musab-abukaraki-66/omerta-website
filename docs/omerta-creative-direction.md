# OMERTA — Creative Direction

## 1. From reference to OMERTA

The audit (`reference-audit.md`) shows that Edolus's quality comes from six
principles, not from its PlayCanvas architecture. We keep the principles and replace
the architecture with one that a real company site needs (native scroll, semantic
HTML, SEO, accessibility, <3 MB first load).

| Edolus principle (verified) | OMERTA translation |
|---|---|
| One narrative spine: orbit → atmosphere → ground → infrastructure → product | The **data's journey**: Orbit → Observation → Ground → Capabilities → Approach → Contact. Each chapter answers "what happens next to the signal". |
| Restrained chrome: centred logo + one control | Centred wordmark, a left **Index** (menu) button and a right **Contact** link. The menu exists because a real site needs navigation; it stays visually silent. |
| Light / heavy / mono type voice | Archivo (variable width + weight) for light editorial statements and heavy expanded chapter titles; IBM Plex Mono for every "machine" element. |
| "System booting & reporting" micro-interactions (scramble, typewriter, odometer, blink, crosshairs, corner squares) | Same family, re-authored: L-shaped **bracket corners** (not squares), scramble on labels, typewriter HUD readouts, odometer loader, `+` crosshair bullets. |
| Colour comes from imagery; UI is monochrome | Monochrome UI; one functional accent (**Signal**, an aerospace safety orange) used only for live data points and focus. |
| Pacing via stretch bands & pinned scenes | Sticky "stages" whose height sets reading time; scroll-linked progress inside each stage. No hijacking, no forced snap. |
| Seamless handoffs (logo dock, band reveal) | Loader wordmark docks into the header; an **aperture** reveal (two bands) opens the hero; the finale closes the same bands like a shutter. |

What we deliberately do **not** take: scroll hijacking, the 3-second minimum black
screen, audio, invented specifications, pinch-zoom lock, the Edolus logo, fonts,
models, textures or copy.

## 2. Brand positioning

*Omertà* is a code of silence. For a space company we read it as **discretion and
precision**: systems that work without drama, data handled with confidentiality, and
claims made only when they can be proven. The brand therefore speaks quietly and
specifically — and never inflates.

- **Line:** *Quiet precision, in orbit.*
- **Voice:** declarative, short sentences; engineering nouns over adjectives; no
  "revolutionising"; no numbers that are not physics or sourced metadata.
- **Attributes:** precision · discretion · engineering discipline · reliability ·
  strategic capability.

## 3. Identity system

### Wordmark
Original geometric stroke wordmark, `OMERTA`, drawn on a 28-unit cap height with a
single stroke weight. The **O is an orbit**: a ring with a small satellite node that
travels around it (slow loop, paused under reduced motion). Because it is
stroke-built, the loader draws it on with `stroke-dashoffset` — our own take on the
reference's letter wipe. Never set in a font; always the SVG component.

### Colour tokens
| Token | Value | Use |
|---|---|---|
| `--void` | `#05070A` | primary dark background |
| `--graphite` | `#0D1117` | raised dark surfaces |
| `--line-dark` | `rgba(236,234,228,.14)` | hairlines on dark |
| `--bone` | `#ECEAE4` | primary light background / text on dark |
| `--paper` | `#F5F4F0` | light raised surface |
| `--ink` | `#101317` | text on light |
| `--mist` | `#9AA4AF` | secondary text on dark (7.97:1 on void) |
| `--slate` | `#59626C` | secondary text on light (5.15:1 on bone) |
| `--signal` | `#FF5A1F` | live data, focus ring, active states (≤ 2% of any viewport) |

Chapters alternate dark (Orbit, Observation, Ground, Approach, Finale) and light
(Capabilities) and the header recolours itself — the same mechanism as the
reference's logo dark/light threshold, but driven by the section under the header.

### Typography
| Role | Spec |
|---|---|
| Statement (H1) | Archivo 300, width 100, `clamp(2.6rem, 7.4vw, 6.75rem)`, lh 1.0, tracking -0.01em, uppercase |
| Chapter title (H2) | Archivo 800, width 112 (expanded), `clamp(2rem, 5vw, 4.5rem)`, lh 0.98, uppercase |
| Lead | Archivo 400, `clamp(1.05rem, 1.4vw, 1.3rem)`, lh 1.5 |
| Body | Archivo 400, 1rem / 1.6 |
| Label / HUD / button | IBM Plex Mono 500, 0.75rem, tracking 0.12em, uppercase |

### Layout
12-column grid, max content width 1440 px, side gutter `clamp(20px, 5vw, 72px)`.
Header: wordmark centred (148 px desktop / 112 px mobile), 32 px / 20 px from top.
One idea per viewport; long copy never exceeds 46 ch.

### Components & states
- **Bracket button**: solid bone (or ink on light) rectangle, 0 radius, mono label;
  four L-shaped corner brackets float 6 px outside and tighten to 3 px on
  hover/focus; label re-scrambles on hover; `:focus-visible` adds the Signal outline.
- **Ghost link**: mono label + 1 px underline that draws left→right on hover.
- **HUD panel**: hairline frame with chamfered corners, `+` crosshairs, mono key/value
  rows typed in.
- **Capability card**: index number, title, subtitle, three `+` bullets, hairline
  border; on hover the border becomes ink and the index ticks to Signal.

### Imagery & media
- Real NASA public-domain photography and Landsat imagery, credited, with captions
  that state plainly they are **reference imagery, not OMERTA assets**.
- Real-time WebGL Earth (NASA Blue Marble / Black Marble textures) with an original
  procedural satellite — labelled "Real-time concept visualisation".
- Derived analytic layer over Landsat imagery labelled as illustrative.
- Treatments: slight desaturation, deep vignettes, fine film grain (static texture,
  animated by background-position, disabled under reduced motion).

### Iconography
Hairline (1.25 px) geometric glyphs only: `+` crosshair, bracket corners, arrows,
orbit ring. No filled icons, no emoji-like illustrations.

### Motion principles
1. **Report, don't perform** — motion signals a system acquiring/locking data.
2. Durations: micro 180–300 ms; reveals 700–1,100 ms; stage choreography is
   scroll-linked, never time-forced.
3. Easing: `cubic-bezier(.65,0,.35,1)` for apertures/bands; `cubic-bezier(.16,1,.3,1)`
   (expo-out) for reveals; `steps(1)` for blinks.
4. Nothing loops continuously except the wordmark orbit node and the WebGL stage —
   and both stop when off-screen or under `prefers-reduced-motion`.

## 4. Content model (assumptions clearly marked)

No business information about OMERTA was supplied. All service copy is a
**provisional, editable content model** held in `src/content/site.ts`. The site
displays a discreet note while `contentStatus === 'provisional'`.

| Content | Status |
|---|---|
| Company name "OMERTA" | Given |
| Satellite & space technology focus | Given |
| Six capability areas (Mission Engineering, Satellite Systems, Earth Observation, Geospatial Intelligence, Ground Segment, Orbital Analytics) | **Assumption** — evaluate & confirm |
| Four-step approach (Define, Design, Integrate, Operate) | **Assumption** |
| Reference orbit figures (SSO, 550 km, 97.6°, 95.6 min, 7.59 km/s) | Physics — computed, labelled "reference orbit" |
| Image metadata (Zambezi Delta, Landsat 8 OLI, 2013-08-29; DSS-53 Madrid; Suomi NPP clean room 2011) | Sourced from NASA records |
| Customers, certifications, contracts, fleet size, statistics | **None shown** — none verified |
| Contact e-mail / address / legal entity | **Not shown** — must be supplied (see `final-qa-report.md`) |
