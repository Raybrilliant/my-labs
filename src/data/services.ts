/**
 * Services offered by the studio — single source of truth.
 * Seeded into data/content.json by the server store; managed at
 * /admin/services afterwards.
 *
 * NOTE: no implementation tech stacks here on purpose (secret kitchen).
 */

export interface Service {
  id: string;
  title: string;
  desc: string;
  tags: string[];
}

export const services: Service[] = [
  {
    id: 'web-development',
    title: 'WEB DEVELOPMENT',
    desc: 'Marketing sites, web apps and e-commerce that load fast and convert harder. Built on a bleeding-edge stack we keep to ourselves — with animation that serves the brand, not the portfolio.',
    tags: ['FAST', 'SEO-READY', 'CONVERSION-FIRST'],
  },
  {
    id: 'product-design',
    title: 'PRODUCT DESIGN / UI-UX',
    desc: 'Interfaces with a point of view. Research, flows, design systems and high-fidelity UI that your developers will not quietly rewrite — from first wireframe to shipped pixel.',
    tags: ['FIGMA', 'DESIGN SYSTEMS', 'PROTOTYPING'],
  },
  {
    id: 'mobile-apps',
    title: 'MOBILE APPS',
    desc: 'iOS and Android apps that feel native because they are built native-first. Offline-ready, push-ready, store-review-proof — shipped to both stores without the drama.',
    tags: ['IOS + ANDROID', 'OFFLINE-READY', 'STORE-PROOF'],
  },
  {
    id: 'mvp-development',
    title: 'MVP DEVELOPMENT',
    desc: 'Idea to paying users in weeks, not quarters. Ruthlessly scoped, cleanly architected MVPs so you can validate fast and pivot without burning the codebase down.',
    tags: ['LEAN SCOPE', 'CLEAN ARCHITECTURE', 'SHIP IN WEEKS'],
  },
  {
    id: 'technical-consulting',
    title: 'TECHNICAL CONSULTING',
    desc: 'Audits, architecture reviews and performance rescues. We dig into your codebase, tell you what is actually wrong in plain language, and fix the things that matter.',
    tags: ['AUDITS', 'ARCHITECTURE', 'PERF'],
  },
];
