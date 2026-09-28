// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://labs.raybrilliant.my.id',

  // Static-first: every page prerenders, except routes that opt out
  // with `export const prerender = false` (i.e. /api/contact).
  // Node adapter -> deploy manually with `node dist/server/entry.mjs`.
  output: 'static',
  adapter: node({ mode: 'standalone' }),

  // Trust forwarded headers only for our own production origin. Behind
  // Cloudflare/TLS termination the socket is plain HTTP, so without this
  // Astro builds request URLs as http:// and its CSRF origin check
  // (security.checkOrigin) 403s every multipart POST (admin uploads) with
  // "Cross-site POST form submissions are forbidden". With allowedDomains,
  // X-Forwarded-Proto/Host are honored when they match, keeping CSRF
  // protection intact — and clientAddress uses real visitor IPs from
  // X-Forwarded-For instead of Cloudflare edge IPs.
  security: {
    allowedDomains: [{ hostname: 'labs.raybrilliant.my.id', protocol: 'https' }]
  },

  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()],
    // Native addon — must stay a runtime require, never bundled.
    ssr: { external: ['better-sqlite3'] }
  }
});
