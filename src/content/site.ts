/**
 * OMERTA content model.
 *
 * Every piece of copy on the site lives here so it can be reviewed and edited in one
 * place. No business details were supplied for OMERTA, so service descriptions are
 * PROVISIONAL (see docs/omerta-creative-direction.md §4). While `contentStatus` is
 * 'provisional' the footer shows a short note saying so. Switch it to 'confirmed'
 * once the copy has been approved.
 *
 * Rules: no customer names, certifications, contracts, fleet sizes or statistics
 * unless verified. Numbers below are either orbital physics (computed) or metadata
 * from the cited NASA image records.
 */

export const contentStatus: 'provisional' | 'confirmed' = 'provisional';

export const site = {
  name: 'OMERTA',
  tagline: 'Quiet precision, in orbit.',
  description:
    'OMERTA designs satellite systems, Earth-observation products and ground infrastructure — engineered to perform without noise.',
  /** Contact e-mail is shown only when set. None has been confirmed yet. */
  contactEmail: null as string | null,
  /** URL of the privacy notice (a page on this site or elsewhere). When set it is
   *  linked from the footer and the contact form; the release check requires it. */
  privacyNoticeUrl: null as string | null,
  locale: 'en',
};

/** Site credit shown at the foot of every page. The name links to the designer's
 *  LinkedIn profile once `url` is set; until then it renders as plain text. */
export const designer = {
  name: 'Musa’b Abukaraki',
  url: null as string | null,
};

export const nav = [
  { label: 'Orbit', href: '/#orbit', index: '01' },
  { label: 'Observation', href: '/#observation', index: '02' },
  { label: 'Ground', href: '/#ground', index: '03' },
  { label: 'Capabilities', href: '/#capabilities', index: '04' },
  { label: 'Approach', href: '/#approach', index: '05' },
  { label: 'Contact', href: '/contact/', index: '06' },
];

export const hero = {
  titleLines: ['Quiet precision', 'in orbit'],
  lead: 'Satellite systems, Earth observation and ground infrastructure — engineered to perform without noise.',
  hint: 'Scroll to begin',
};

/** Reference orbit: a 550 km sun-synchronous circular orbit. Values are computed
 *  from standard constants (μ = 398 600.4418 km³/s², Rₑ = 6 378.137 km, J2 SSO
 *  condition) and are illustrative — not an OMERTA spacecraft. */
export const referenceOrbit = {
  altitudeKm: 550,
  inclinationDeg: 97.6,
  periodMin: 95.6,
  velocityKms: 7.59,
};

export const orbit = {
  index: '01',
  eyebrow: 'Space segment',
  title: ['Systems that', 'hold their line'],
  lead: 'Mission engineering for spacecraft that must perform for years without intervention — bus architecture, payload integration, power and attitude control, all defined against the orbit they will live in.',
  hudTitle: 'Reference orbit · SSO',
  caption: 'Real-time concept visualisation. Simulated reference orbit; not an OMERTA spacecraft.',
};

export const observation = {
  index: '02',
  eyebrow: 'Earth observation',
  title: ['From pixels', 'to ground truth'],
  lead: 'An image is only the beginning. Acquisitions become analysis-ready layers — classified, contoured and comparable over time — so decisions rest on evidence rather than impressions.',
  scene: [
    ['Scene', 'Zambezi River Delta, Mozambique'],
    ['Sensor', 'Landsat 8 · OLI'],
    ['Acquired', '2013-08-29'],
    ['Centre', '≈ 18.8° S  36.3° E'],
  ] as [string, string][],
  caption:
    'Natural-colour Landsat 8 image courtesy NASA. The analytic layer is an illustrative derivation from visible bands, not a spectral product.',
};

export const ground = {
  index: '03',
  eyebrow: 'Ground segment & data',
  title: ['The orbit ends', 'on the ground'],
  lead: 'A satellite is only as useful as the link that brings its data home. Ground-segment design, contact scheduling and data pipelines move measurements from downlink to delivery with their integrity intact.',
  caption: 'DSS-53, a 34 m beam-waveguide antenna at the Madrid Deep Space Communications Complex. Image: NASA/JPL-Caltech. Reference imagery; not an OMERTA facility.',
  path: [
    { code: '01', title: 'Acquire', text: 'On-orbit sensing and onboard storage' },
    { code: '02', title: 'Downlink', text: 'Scheduled X/Ka-band contact windows' },
    { code: '03', title: 'Receive', text: 'Ground-station reception and integrity checks' },
    { code: '04', title: 'Process', text: 'Calibration, correction and product generation' },
    { code: '05', title: 'Deliver', text: 'Controlled distribution to the people who decide' },
  ],
};

export const capabilities = {
  index: '04',
  eyebrow: 'Capabilities',
  title: ['Six disciplines', 'one system'],
  lead: 'Each discipline stands alone; together they cover a mission from first requirement to the last delivered dataset.',
  cards: [
    {
      title: 'Mission engineering',
      subtitle: 'Concept to requirements',
      bullets: ['Mission and orbit analysis', 'Requirements and trade studies', 'Concept of operations'],
    },
    {
      title: 'Satellite systems',
      subtitle: 'Architecture to integration',
      bullets: ['Bus and payload architecture', 'Power, thermal and attitude budgets', 'Integration and test planning'],
    },
    {
      title: 'Earth observation',
      subtitle: 'Acquisition to insight',
      bullets: ['Tasking and acquisition planning', 'Analysis-ready data products', 'Change detection over time'],
    },
    {
      title: 'Geospatial intelligence',
      subtitle: 'Insight to decision',
      bullets: ['Multi-source data fusion', 'Persistent area monitoring', 'Decision-ready reporting'],
    },
    {
      title: 'Ground segment',
      subtitle: 'Contact to delivery',
      bullets: ['Station and network design', 'Pass planning and scheduling', 'Secure data pipelines'],
    },
    {
      title: 'Orbital analytics',
      subtitle: 'Awareness in orbit',
      bullets: ['Conjunction screening', 'Orbit determination support', 'Constellation performance modelling'],
    },
  ],
};

export const approach = {
  index: '05',
  eyebrow: 'Approach',
  statements: [
    ['From mission concept', 'to operational orbit.'],
    ['Every decision traceable.', 'Every interface defined.'],
  ],
  steps: [
    { code: '01', title: 'Define', text: 'Objectives, constraints and success criteria agreed before design begins.' },
    { code: '02', title: 'Design', text: 'Architectures traded against requirements, budgets and risk — openly.' },
    { code: '03', title: 'Integrate', text: 'Subsystems verified at every interface and tested as they will fly.' },
    { code: '04', title: 'Operate', text: 'Commissioning, monitoring and continuous performance review.' },
  ],
  caption: 'Suomi NPP in a clean room before launch, 2011. Image: NASA. Reference imagery; not OMERTA hardware.',
};

export const finale = {
  statement: ['Discretion is a', 'design requirement.'],
  lead: 'Tell us about the mission, the data you need, or the problem in front of you.',
  cta: { label: 'Start a conversation', href: '/contact/' },
};

export const contact = {
  title: ['Start a', 'conversation'],
  lead: 'Describe the mission, the data you need or the problem in front of you. A short note is enough to begin.',
  interests: [
    'Mission engineering',
    'Satellite systems',
    'Earth observation',
    'Geospatial intelligence',
    'Ground segment',
    'Orbital analytics',
    'Something else',
  ],
};

export const credits = [
  { what: 'Earth day texture', source: 'NASA Visible Earth — Blue Marble: Next Generation (Dec 2004)', href: 'https://visibleearth.nasa.gov/images/73909' },
  { what: 'Earth night texture', source: 'NASA Earth Observatory — Black Marble 2016', href: 'https://earthobservatory.nasa.gov/features/NightLights' },
  { what: 'Zambezi Delta', source: 'NASA — Landsat 8 OLI, 29 Aug 2013 (PIA18155)', href: 'https://images.nasa.gov/details/PIA18155' },
  { what: 'DSS-53 antenna', source: 'NASA/JPL-Caltech (PIA25137)', href: 'https://images.nasa.gov/details/PIA25137' },
  { what: 'Suomi NPP clean room', source: 'NASA (KSC-2011-7023)', href: 'https://images.nasa.gov/details/KSC-2011-7023' },
];
