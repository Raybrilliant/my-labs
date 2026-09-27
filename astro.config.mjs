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

  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()],
    // Native addon — must stay a runtime require, never bundled.
    ssr: { external: ['better-sqlite3'] }
  }
});
