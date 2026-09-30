import type { APIRoute } from 'astro';
import {
  readContent,
  writeContent,
  asString,
  slugify,
  type Client,
} from '../../../utils/store';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function normalizeClient(body: Record<string, unknown>): Client | { error: string } {
  const name = asString(body.name, 120);
  if (!name) return { error: 'name is required' };
  return {
    id: slugify(asString(body.id, 64) || name),
    name,
    sector: asString(body.sector, 120),
    img: asString(body.img, 200),
    alt: asString(body.alt, 300) || `${name} — client logo`,
  };
}

export const GET: APIRoute = async () => {
  const { clients } = await readContent();
  return json({ clients });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = normalizeClient(body);
    if ('error' in result) return json({ error: result.error }, 400);

    const content = await readContent();
    if (content.clients.some((c) => c.id === result.id)) {
      return json({ error: `id "${result.id}" already exists` }, 409);
    }
    content.clients.push(result);
    await writeContent(content);
    return json({ ok: true, client: result }, 201);
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const originalId = slugify(asString(body.originalId, 64));
    const result = normalizeClient(body);
    if ('error' in result) return json({ error: result.error }, 400);

    const content = await readContent();
    const idx = content.clients.findIndex((c) => c.id === originalId);
    if (idx === -1) return json({ error: `client "${originalId}" not found` }, 404);
    if (result.id !== originalId && content.clients.some((c) => c.id === result.id)) {
      return json({ error: `id "${result.id}" already exists` }, 409);
    }
    content.clients[idx] = result;
    await writeContent(content);
    return json({ ok: true, client: result });
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = slugify(url.searchParams.get('id') ?? '');
  if (!id) return json({ error: 'id query param required' }, 400);

  const content = await readContent();
  const before = content.clients.length;
  content.clients = content.clients.filter((c) => c.id !== id);
  if (content.clients.length === before) return json({ error: `client "${id}" not found` }, 404);
  await writeContent(content);
  return json({ ok: true });
};
