import type { APIRoute } from 'astro';
import { readContent } from '../utils/store';

export const prerender = false;

/**
 * Generated live from the content store on every request — new projects
 * added via /admin show up here without a rebuild. Admin/API/upload routes
 * are intentionally excluded.
 */
export const GET: APIRoute = async ({ site: siteUrl }) => {
  const site = siteUrl ?? new URL('https://labs.raybrilliant.my.id');
  const { projects } = await readContent();

  const urls = [
    { loc: new URL('/', site).href, priority: '1.0' },
    ...projects.map((p) => ({
      loc: new URL(`/projects/${p.slug}`, site).href,
      priority: '0.8',
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${u.loc}</loc><changefreq>monthly</changefreq><priority>${u.priority}</priority></url>`
    ),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
