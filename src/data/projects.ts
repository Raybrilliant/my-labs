/**
 * Single source of truth for Selected Work.
 * Cards on the index and the /projects/[slug] case-study pages both read
 * from here — swap placeholders for real projects in one place.
 *
 * NOTE: tech stacks are intentionally omitted (the secret kitchen).
 * Publicly we only say: bleeding-edge, fast, efficient.
 */

export interface Swatch {
  name: string;
  hex: string;
  /** Ink color for labels rendered ON the swatch (contrast). */
  ink: string;
}

export interface TypefaceEntry {
  name: string;
  role: string;
  /** Which loaded font approximates the specimen rendering. */
  kind: 'display' | 'mono' | 'body';
}

export interface OutcomeStat {
  value: string;
  label: string;
}

export interface Project {
  slug: string;
  name: string;
  img: string;
  alt: string;
  year: string;
  /** Public service label — replaces tech stack on cards. */
  type: string;
  desc: string;
  /** Grid span on the index page — auto-assigned when omitted. */
  span?: string;
  client: string;
  /** Optional live site URL — omitted from UI when empty. */
  liveUrl?: string;
  /** What the client actually asked for. */
  briefIntro: string;
  brief: string[];
  palette: Swatch[];
  typefaces: TypefaceEntry[];
  design: string[];
  outcome: OutcomeStat[];
}

export const projects: Project[] = [
  {
    slug: 'kavla-studio',
    name: 'KAVLA STUDIO',
    img: '/projects/kavla.svg',
    alt: 'Kavla Studio — architecture portfolio website with brutalist grid compositions',
    year: '2025',
    type: 'PORTFOLIO SITE',
    desc: 'An architecture firm that hated every template on earth. We built them a portfolio that reads like a printed monograph — case studies, awards, and zero stock photos.',
    span: 'md:col-span-7',
    client: 'KAVLA STUDIO — ARCHITECTURE FIRM',
    briefIntro:
      'Kavla wanted a portfolio that behaved like their buildings: structural, confident, impossible to mistake for someone else\'s. The brief was short and ruthless.',
    brief: [
      'ZERO TEMPLATES — THE SITE MUST FEEL LIKE A PRINTED MONOGRAPH',
      'CASE STUDIES FRONT AND CENTRE, NOT A GENERIC THUMBNAIL GRID',
      'NO STOCK PHOTOS, EVER — ONLY THEIR OWN PHOTOGRAPHY',
      'FAST ENOUGH TO IMPRESS AN IMPATIENT JURY ON CONFERENCE WIFI',
    ],
    palette: [
      { name: 'RAW PAPER', hex: '#F5F3EF', ink: '#1A1815' },
      { name: 'STRUCTURAL INK', hex: '#1A1815', ink: '#F5F3EF' },
      { name: 'BLUEPRINT GREY', hex: '#C9C3B8', ink: '#1A1815' },
      { name: 'SIGNAL RED', hex: '#FF2E1F', ink: '#F5F3EF' },
    ],
    typefaces: [
      { name: 'NEUE HAAS GROTESK', role: 'DISPLAY — HEADLINES & PROJECT TITLES', kind: 'display' },
      { name: 'IBM PLEX MONO', role: 'META — LABELS, DIMENSIONS, INDEX NUMBERS', kind: 'mono' },
      { name: 'SOURCE SANS', role: 'BODY — CASE STUDY PROSE', kind: 'body' },
    ],
    design: [
      'EXPOSED GRID LINES TREATED AS A DRAFTING TABLE, NOT A DECORATION',
      'OVERSIZED HEADLINES THAT CROP OFF-CANVAS LIKE ELEVATION DRAWINGS',
      'FULL-BLEED PHOTOGRAPHY WITH HARD OFFSET SHADOWS — NO SOFT BLUR',
      'NUMBERED SECTIONS SO THE SITE READS LIKE A SET OF PLANS',
    ],
    outcome: [
      { value: '2.4x', label: 'AVERAGE SESSION TIME VS OLD SITE' },
      { value: '+60%', label: 'PROJECT INQUIRIES IN FIRST QUARTER' },
      { value: '02', label: 'DESIGN AWARD SHORTLISTS' },
    ],
  },
  {
    slug: 'orbitpay',
    name: 'ORBITPAY',
    img: '/projects/orbitpay.svg',
    alt: 'OrbitPay — fintech payments dashboard with orbital data visualisation',
    year: '2025',
    type: 'FINTECH DASHBOARD',
    desc: 'Payments dashboard for a marketplace startup. Real-time reconciliation, multi-currency payouts, and an onboarding flow that cut drop-off by a third.',
    span: 'md:col-span-5 md:mt-28',
    client: 'ORBITPAY — MARKETPLACE FINTECH',
    briefIntro:
      'A payments team drowning in spreadsheets asked for one thing: see the money move in real time, without an accountant sitting next to you.',
    brief: [
      'REAL-TIME RECONCILIATION VISIBLE AT A GLANCE — NO REFRESH, NO EXPORTS',
      'MULTI-CURRENCY PAYOUTS WITHOUT THE CONFUSION',
      'ONBOARDING THAT DOES NOT DROP USERS MID-FLOW',
      'FEELS LIKE A TERMINAL, NOT A SPREADSHEET',
    ],
    palette: [
      { name: 'TERMINAL BLACK', hex: '#0D0C0A', ink: '#F5F3EF' },
      { name: 'SIGNAL RED', hex: '#FF2E1F', ink: '#F5F3EF' },
      { name: 'LEDGER PAPER', hex: '#F5F3EF', ink: '#1A1815' },
      { name: 'RECONCILE GREEN', hex: '#1F7A5C', ink: '#F5F3EF' },
    ],
    typefaces: [
      { name: 'SPACE GROTESK', role: 'DISPLAY — BALANCES, HEADLINES', kind: 'display' },
      { name: 'IBM PLEX MONO', role: 'DATA — LEDGERS, AMOUNTS, TIMESTAMPS', kind: 'mono' },
      { name: 'INTER', role: 'UI — LABELS, HELP TEXT', kind: 'body' },
    ],
    design: [
      'ORBITAL DATA RING AS THE CENTRAL METAPHOR — MONEY IN MOTION',
      'DARK SURFACE SO COLOURED BALANCES READ LIKE TERMINAL OUTPUT',
      'EVERY NUMBER TABBULAR, EVERY STATE RED / GREEN — NO AMBIGUITY',
      'KEYBOARD-FIRST FLOWS FOR THE OPS TEAM WHO LIVES IN THE TOOL',
    ],
    outcome: [
      { value: '-34%', label: 'ONBOARDING DROP-OFF' },
      { value: '<1s', label: 'RECONCILIATION VIEW LOAD' },
      { value: '99.98%', label: 'UPTIME SINCE LAUNCH' },
    ],
  },
  {
    slug: 'sentral',
    name: 'SENTRAL',
    img: '/projects/sentral.svg',
    alt: 'Sentral — fashion e-commerce storefront with bold diagonal art direction',
    year: '2024',
    type: 'E-COMMERCE',
    desc: 'Fashion label storefront with lookbook-first navigation and a checkout that gets out of the way. Season drops land like product releases — because they are.',
    span: 'md:col-span-5',
    client: 'SENTRAL — INDEPENDENT FASHION LABEL',
    briefIntro:
      'Sentral sells drops, not inventory. They asked for a store that treats every season like a release day — and a checkout that never interrupts the mood.',
    brief: [
      'LOOKBOOK-FIRST NAVIGATION — CLOTHES SEEN WORN BEFORE SEEN SOLD',
      'SEASON DROPS THAT LAND LIKE PRODUCT RELEASES, BECAUSE THEY ARE',
      'CHECKOUT IN UNDER A MINUTE, OUT OF THE WAY OF THE MOOD',
      'MOBILE-FIRST — THAT IS WHERE THEIR AUDIENCE LIVES',
    ],
    palette: [
      { name: 'BONE', hex: '#EFE9DF', ink: '#16130F' },
      { name: 'INK', hex: '#16130F', ink: '#EFE9DF' },
      { name: 'TERRACOTTA', hex: '#B4432E', ink: '#EFE9DF' },
      { name: 'STONE', hex: '#8A8378', ink: '#EFE9DF' },
    ],
    typefaces: [
      { name: 'DRUK WIDE', role: 'DISPLAY — DROP TITLES, SEASON CODES', kind: 'display' },
      { name: 'SPACE MONO', role: 'META — PRICES, SIZES, DROP TIMERS', kind: 'mono' },
      { name: 'INTER', role: 'BODY — PRODUCT DETAILS, POLICIES', kind: 'body' },
    ],
    design: [
      'DIAGONAL ART DIRECTION — THE GRID TILTS WITH THE GARMENTS',
      'COUNTDOWN TIMERS TREATED AS TYPE, NOT WIDGETS',
      'EDITORIAL SPREADS THAT SCROLL LIKE A LOOKBOOK ZINE',
      'ONE-PAGE CHECKOUT WITH THE FEWEST DECISIONS POSSIBLE',
    ],
    outcome: [
      { value: '+48%', label: 'CONVERSION VS PREVIOUS STORE' },
      { value: '-22%', label: 'CART ABANDONMENT' },
      { value: '12K', label: 'DROP-DAY VISITORS, ZERO DOWNTIME' },
    ],
  },
  {
    slug: 'medtrack',
    name: 'MEDTRACK',
    img: '/projects/medtrack.svg',
    alt: 'MedTrack — clinic appointment and medication tracking mobile app',
    year: '2024',
    type: 'MOBILE APP',
    desc: 'Clinic appointments plus medication reminders in one calm interface. Built for patients first, nurses second, lawyers never.',
    span: 'md:col-span-7 md:mt-16',
    client: 'MEDTRACK — CLINIC NETWORK',
    briefIntro:
      'A growing clinic network needed appointments and medication schedules in one place. The constraint that shaped everything: patients are anxious, tired, and older than your average beta tester.',
    brief: [
      'PATIENTS FIRST — CALM, LARGE, FORGIVING INTERFACE',
      'REMINDERS THAT PERSIST WITHOUT BECOMING NAGGING',
      'NURSES NEED SPEED — SCHEDULE CHANGES IN TWO TAPS MAX',
      'READABLE IN A MOVING CAR, IN LOW LIGHT, BY TIRED EYES',
    ],
    palette: [
      { name: 'CLINIC WHITE', hex: '#FAF8F4', ink: '#23282B' },
      { name: 'CALM TEAL', hex: '#1F7A6B', ink: '#FAF8F4' },
      { name: 'ALERT RED', hex: '#FF2E1F', ink: '#FAF8F4' },
      { name: 'SLATE INK', hex: '#23282B', ink: '#FAF8F4' },
    ],
    typefaces: [
      { name: 'MANROPE', role: 'DISPLAY — SCREEN TITLES, SCHEDULES', kind: 'display' },
      { name: 'JETBRAINS MONO', role: 'DATA — DOSAGES, TIMES, REF CODES', kind: 'mono' },
      { name: 'INTER', role: 'BODY — INSTRUCTIONS, CONFIRMATIONS', kind: 'body' },
    ],
    design: [
      'ONE SCREEN, ONE JOB — NOTHING ELSE COMPETES FOR ATTENTION',
      'TOUCH TARGETS SIZED FOR HANDS THAT ARE NOT 22 ANYMORE',
      'RED RESERVED STRICTLY FOR MISSED DOSES — SILENCE IS THE DEFAULT',
      'OFFLINE-FIRST: A CLINIC BASEMENT MUST NOT BREAK THE SCHEDULE',
    ],
    outcome: [
      { value: '-28%', label: 'MISSED APPOINTMENTS' },
      { value: '4.8/5', label: 'PATIENT RATING AFTER 6 MONTHS' },
      { value: '11', label: 'CLINICS ONBOARD, UP FROM 3' },
    ],
  },
];
