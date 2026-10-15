# Asset Credits & Licensing

| Asset (in `public/`) | Source | Licence / status | Processing |
|---|---|---|---|
| `textures/earth-day-{1k,2k}.webp` | NASA Visible Earth, *Blue Marble: Next Generation*, December 2004 (`world.topo.bathy.200412.3x5400x2700.jpg`) | NASA imagery, not copyrighted (NASA media guidelines) | Resized to 2048×1024 / 1024×512, WebP q80 |
| `textures/earth-night-{1k,2k}.webp` | NASA Earth Observatory, *Black Marble 2016* (`BlackMarble_2016_01deg.jpg`) | NASA imagery | Resized, WebP q80 |
| `media/zambezi-natural-*.webp` | NASA, Landsat 8 OLI, Zambezi Delta, 2013-08-29 — images.nasa.gov `PIA18155` | NASA imagery | Resized 800/1400/2000 w, WebP q72 |
| `media/zambezi-analytic-*.webp` | **Derived by us** from `PIA18155`: visible-band water mask, greenness ramp on land, smoothed sediment contours, traced coastline | Derivative of NASA imagery; labelled on site as *illustrative, not a spectral product* | Python/Pillow/NumPy (see git history) |
| `media/dss53-night-*.webp` | NASA/JPL-Caltech, DSS-53 at Madrid DSCC — `PIA25137` | NASA/JPL imagery | Resized, WebP q72 |
| `media/npp-cleanroom-*.webp` | NASA, Suomi NPP in clean room, Vandenberg, 2011 — `KSC-2011-7023` | NASA imagery | Resized, WebP q72 |
| `media/kazakhstan-fields-*.webp` | NASA, Landsat 8 OLI, eastern Kazakhstan, 2013-09-09 — `GSFC_20171208_Archive_e001371` | NASA imagery | Evaluated, not used (removed from the build) |
| `media/orbit-poster-*.webp`, `media/og-omerta.jpg` | **Rendered by us** from the site's own WebGL scene (`scripts/qa/make-poster.mjs`) | Original | — |
| `textures/grain.png` | Generated noise (NumPy) | Original | — |
| Satellite model | Procedural geometry and canvas-drawn PBR maps in `src/scripts/stages/satellite.ts` (no third-party model; NASA's Suomi NPP glTF was evaluated and not used) | Original | — |
| Wordmark, favicon | Original SVG | Original | — |
| Fonts | Archivo (Omnibus-Type) and IBM Plex Mono (IBM) via Fontsource | SIL Open Font License 1.1 | Self-hosted |

Usage notes
- NASA does not endorse OMERTA. NASA insignia/logos are not used. The footer states
  this and every NASA image caption says it is reference imagery, not OMERTA assets.
- No asset from edolus.com (models, textures, video, audio, fonts, logo) is used, and
  no screenshot of it is distributed in the current tree. Earlier history still
  contains research screenshots; that repository stays private and only the clean repository is published (`owner-inputs-and-release-blockers.md` P1).

Licence terms as understood (verify before commercial launch)
- **NASA imagery** (Visible Earth, Earth Observatory, images.nasa.gov) is generally not
  subject to copyright in the United States. NASA's media guidelines ask for credit,
  prohibit implying endorsement, and restrict use of the NASA insignia. They also state
  that recognisable people in NASA material may not be used for commercial purposes
  without their permission. The Suomi NPP clean-room photograph (KSC-2011-7023) shows
  technicians; the owner chose to keep it (2026-10-15). Before a commercial launch,
  confirm that use or swap the image (an original render can be produced with
  `scripts/qa/make-poster.mjs`).
- **NASA/JPL-Caltech** (`PIA25137`): JPL's image-use policy permits use with the credit
  "NASA/JPL-Caltech", without implied endorsement.
- **Landsat 8** data and NASA-derived products: public domain, credit requested.
- **Fonts**: SIL Open Font License 1.1. The font files are installed from npm and
  bundled into the build output; they are not committed to this repository.
- **Repository licence**: none chosen (see `owner-inputs-and-release-blockers.md` P2). A future code
  licence would not extend to the NASA imagery, the fonts, or the OMERTA name and
  wordmark.
