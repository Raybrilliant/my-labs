import type { APIRoute } from 'astro';
import {
  readContent,
  writeContent,
  asString,
  slugify,
  type TeamMember,
} from '../../../utils/store';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function normalizeMember(body: Record<string, unknown>): TeamMember | { error: string } {
  const name = asString(body.name, 120);
  if (!name) return { error: 'name is required' };
  return {
    id: slugify(asString(body.id, 64) || name),
    name,
    role: asString(body.role, 160),
    bio: asString(body.bio, 800),
    img: asString(body.img, 200) || '/team/founder.jpg',
    alt: asString(body.alt, 300) || `${name} — portrait`,
  };
}

export const GET: APIRoute = async () => {
  const { team } = await readContent();
  return json({ team });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = normalizeMember(body);
    if ('error' in result) return json({ error: result.error }, 400);

    const content = await readContent();
    if (content.team.some((m) => m.id === result.id)) {
      return json({ error: `id "${result.id}" already exists` }, 409);
    }
    content.team.push(result);
    await writeContent(content);
    return json({ ok: true, member: result }, 201);
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const originalId = slugify(asString(body.originalId, 64));
    const result = normalizeMember(body);
    if ('error' in result) return json({ error: result.error }, 400);

    const content = await readContent();
    const idx = content.team.findIndex((m) => m.id === originalId);
    if (idx === -1) return json({ error: `member "${originalId}" not found` }, 404);
    if (result.id !== originalId && content.team.some((m) => m.id === result.id)) {
      return json({ error: `id "${result.id}" already exists` }, 409);
    }
    content.team[idx] = result;
    await writeContent(content);
    return json({ ok: true, member: result });
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = slugify(url.searchParams.get('id') ?? '');
  if (!id) return json({ error: 'id query param required' }, 400);

  const content = await readContent();
  const before = content.team.length;
  content.team = content.team.filter((m) => m.id !== id);
  if (content.team.length === before) return json({ error: `member "${id}" not found` }, 404);
  await writeContent(content);
  return json({ ok: true });
};
