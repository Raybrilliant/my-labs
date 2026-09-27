import type { APIRoute } from 'astro';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

const TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/**
 * Serves admin-uploaded images from data/uploads (the persistent Docker
 * volume). Filenames are content-hashed at upload time, so responses can
 * be cached as immutable.
 */
export const GET: APIRoute = async ({ params }) => {
  const rel = params.file ?? '';
  // Flat namespace, strict charset — kills any traversal shenanigans.
  if (!rel || !/^[\w.-]+$/.test(rel)) {
    return new Response('Not found', { status: 404 });
  }

  const dir = path.join(process.cwd(), 'data', 'uploads');
  const full = path.join(dir, rel);
  if (!full.startsWith(dir + path.sep)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const info = await stat(full);
    if (!info.isFile()) throw new Error('not a file');
    const data = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': TYPES[ext] ?? 'application/octet-stream',
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
};
