# Owner inputs and release blockers

The single authoritative checklist for this project. Everything technical that can be
done without company facts is done; what remains needs the owner, an account
permission, or real hardware.

`npm run release-check` enforces the automatable items, and a Vercel Production build
runs it first (`scripts/production-guard.mjs`), so none of this can be skipped by
accident.

## 1. Waiting for owner-provided facts (required before Production launch)

| # | Input | Where it goes | Check |
|---|---|---|---|
| F1 | Production domain (HTTPS origin) | Vercel env `SITE_URL` (Production scope only) | automated |
| F2 | Contact-form endpoint: accepts a JSON `POST`, returns 2xx only on real success | Vercel env `PUBLIC_CONTACT_ENDPOINT` (Production scope) | automated |
| F3 | Confirmed company copy: hero, chapter text, the six capability areas, approach steps | `src/content/site.ts`, then set `contentStatus = 'confirmed'` | automated |
| F4 | Privacy notice covering the contact form (see inputs below), published at a URL | `site.privacyNoticeUrl` in `src/content/site.ts` | automated |
| F5 | Official contact e-mail (optional) | `site.contactEmail` | warning |
| F6 | Designer's LinkedIn URL (optional) | `designer.url` | warning |
| F7 | The Approach photo (NASA, KSC-2011-7023) shows identifiable technicians. Kept by owner decision; NASA's guidelines restrict commercial use of recognisable people without their permission, so confirm before a commercial launch | `public/media/npp-cleanroom-*` | manual |

**Privacy-notice inputs** (facts only the operator can supply; do not invent them):
- legal entity name and registered address;
- contact for privacy requests;
- what the form collects: name, e-mail, organisation, area of interest, message, consent flag;
- the purpose (replying to the enquiry) and the legal basis;
- the form processor (the `PUBLIC_CONTACT_ENDPOINT` service) and where it stores data;
- the retention period;
- recipients and transfers, if any;
- the rights available under applicable law;
- whether analytics or cookies are used (currently: none in the code).

## 2. Required before making a repository public

| # | Item | Status |
|---|---|---|
| P1 | Publish only the **clean repository** (`omerta-website`, fresh history). The original `Omerta` repository's history contains 22 third-party edolus.com screenshots, so it must stay private permanently. | Clean history prepared and verified (see `final-qa-report.md` §11) |
| P2 | Licence: none chosen (owner decision, 2026-10-15). The code is "all rights reserved": readable, not reusable. A future code licence would not cover the NASA imagery, the fonts, or the OMERTA name and wordmark. | Decided; revisit before going public |
| P3 | Commit messages carry `Claude-Session` links to the private session that produced them. They need authentication and expose no content. | Informational |

## 3. Blocked by missing permissions

| # | Action | Why it was not done here |
|---|---|---|
| B1 | Create the empty GitHub repository `musab-abukaraki-66/omerta-website` and push this clean history to it | The build session's GitHub access is bound to the original repository: account-level repository creation is refused (HTTP 403), and changing the original repository's settings to use template generation was not permitted. |
| B2 | Connect `omerta-website` to the Vercel project `omerta` (Settings → Git). Until launch, set Production Branch to `production` (a branch that does not exist yet), so pushes to `main` keep producing Previews on `omerta-space.vercel.app`; switch it to `main` at launch | The Vercel API connector can create linked *new* projects but cannot link an existing one. Until it is linked, deployments are created explicitly from pushed commits. |
| B3 | GitHub default branch of the original repository → `main` | Repository settings are not exposed to the session. Low priority once the original is archived. |

## 4. Waiting for real-device or external validation

- Safari (macOS and iOS 17+), Firefox, Edge. Especially the OffscreenCanvas worker path:
  Safari 16 falls back to the poster by design.
- Physical Android and iOS devices on real GPUs: frame rate, thermals and memory of the
  3D stage (bloom adds fill cost).
- Screen readers: VoiceOver, NVDA, TalkBack.
- A real form submission against the production endpoint: receipt and spam handling.
- Lighthouse against the deployed URL (measured locally only).

## 5. Production launch sequence

1. Supply F1–F4. Set F1/F2 in Vercel for **Production** only; leave Preview without `SITE_URL`.
2. Locally: `SITE_URL=… PUBLIC_CONTACT_ENDPOINT=… npm run release-check` must pass.
3. In Vercel, set Production Branch to `main` and deploy `main`. The build runs the guard, which now passes, and deploys.
4. Add the custom domain in Vercel and confirm it matches `SITE_URL`.
5. Run the external validation in section 4.

## 6. Completed and verified

- Vercel Preview builds use the deployment's own URL and are not indexable (`noindex`
  meta, `X-Robots-Tag`, `Disallow`, no sitemap). Production builds are blocked while
  this checklist's automated items fail. Both behaviours were observed on Vercel.
- CSP with build-time hashes and the security headers are served on Vercel.
- The contact form never reports success without a 2xx confirmation, and says plainly
  when nothing was sent. Verified live.
- The interaction suite (30 checks), the CSP check and the live checks are recorded in
  `final-qa-report.md`.
- Stable preview hostname `omerta-space.vercel.app`, assigned to branch `main` of the
  Vercel project (`omerta.vercel.app` and `omerta-website.vercel.app` belong to other
  Vercel accounts).
