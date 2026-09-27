import type { APIRoute } from 'astro';
import {
  readContent,
  writeContent,
  asString,
  asStringArray,
  slugify,
  type Service,
} from '../../../utils/store';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function normalizeService(body: Record<string, unknown>): Service | { error: string } {
  const title = asString(body.title, 120);
  if (!title) return { error: 'title is required' };
  return {
    id: slugify(asString(body.id, 64) || title),
    title,
    desc: asString(body.desc, 800),
    tags: asStringArray(body.tags, 8),
  };
}

export const GET: APIRoute = async () => {
  const { services } = await readContent();
  return json({ services });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = normalizeService(body);
    if ('error' in result) return json({ error: result.error }, 400);

    const content = await readContent();
    if (content.services.some((s) => s.id === result.id)) {
      return json({ error: `id "${result.id}" already exists` }, 409);
    }
    content.services.push(result);
    await writeContent(content);
    return json({ ok: true, service: result }, 201);
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const originalId = slugify(asString(body.originalId, 64));
    const result = normalizeService(body);
    if ('error' in result) return json({ error: result.error }, 400);

    const content = await readContent();
    const idx = content.services.findIndex((s) => s.id === originalId);
    if (idx === -1) return json({ error: `service "${originalId}" not found` }, 404);
    if (result.id !== originalId && content.services.some((s) => s.id === result.id)) {
      return json({ error: `id "${result.id}" already exists` }, 409);
    }
    content.services[idx] = result;
    await writeContent(content);
    return json({ ok: true, service: result });
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = slugify(url.searchParams.get('id') ?? '');
  if (!id) return json({ error: 'id query param required' }, 400);

  const content = await readContent();
  const before = content.services.length;
  content.services = content.services.filter((s) => s.id !== id);
  if (content.services.length === before) return json({ error: `service "${id}" not found` }, 404);
  await writeContent(content);
  return json({ ok: true });
};
