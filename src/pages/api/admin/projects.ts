import type { APIRoute } from 'astro';
import {
  readContent,
  writeContent,
  asString,
  asStringArray,
  slugify,
  type Project,
} from '../../../utils/store';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type PaletteInput = { name?: unknown; hex?: unknown; ink?: unknown };
type TypefaceInput = { name?: unknown; role?: unknown; kind?: unknown };
type OutcomeInput = { value?: unknown; label?: unknown };

function normalizeProject(body: Record<string, unknown>): Project | { error: string } {
  const name = asString(body.name, 120);
  if (!name) return { error: 'name is required' };

  const slug = slugify(asString(body.slug, 64) || name);
  if (!slug) return { error: 'slug could not be generated' };

  const kinds = ['display', 'mono', 'body'] as const;
  const palette = Array.isArray(body.palette)
    ? (body.palette as PaletteInput[]).slice(0, 10).map((s) => ({
        name: asString(s?.name, 60),
        hex: asString(s?.hex, 32) || '#CCCCCC',
        ink: asString(s?.ink, 32) || '#1A1815',
      })).filter((s) => s.name)
    : [];
  const typefaces = Array.isArray(body.typefaces)
    ? (body.typefaces as TypefaceInput[]).slice(0, 8).map((t) => ({
        name: asString(t?.name, 80),
        role: asString(t?.role, 120),
        kind: (kinds as readonly string[]).includes(asString(t?.kind, 10))
          ? (asString(t?.kind, 10) as Project['typefaces'][number]['kind'])
          : 'display',
      })).filter((t) => t.name)
    : [];
  const outcome = Array.isArray(body.outcome)
    ? (body.outcome as OutcomeInput[]).slice(0, 8).map((o) => ({
        value: asString(o?.value, 40),
        label: asString(o?.label, 140),
      })).filter((o) => o.value || o.label)
    : [];

  const project: Project = {
    slug,
    name,
    img: asString(body.img, 200) || `/projects/${slug}.svg`,
    alt: asString(body.alt, 300) || `${name} — project visual`,
    year: asString(body.year, 10) || String(new Date().getFullYear()),
    type: asString(body.type, 60) || 'PROJECT',
    desc: asString(body.desc, 600),
    span: asString(body.span, 80) || undefined,
    client: asString(body.client, 160),
    briefIntro: asString(body.briefIntro, 800),
    brief: asStringArray(body.brief),
    palette,
    typefaces,
    design: asStringArray(body.design),
    outcome,
  };
  const liveUrl = asString(body.liveUrl, 300);
  if (liveUrl) project.liveUrl = liveUrl;
  return project;
}

export const GET: APIRoute = async () => {
  const { projects } = await readContent();
  return json({ projects });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = normalizeProject(body);
    if ('error' in result) return json({ error: result.error }, 400);

    const content = await readContent();
    if (content.projects.some((p) => p.slug === result.slug)) {
      return json({ error: `slug "${result.slug}" already exists` }, 409);
    }
    content.projects.push(result);
    await writeContent(content);
    return json({ ok: true, project: result }, 201);
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const originalSlug = slugify(asString(body.originalSlug, 64));
    const result = normalizeProject(body);
    if ('error' in result) return json({ error: result.error }, 400);

    const content = await readContent();
    const idx = content.projects.findIndex((p) => p.slug === originalSlug);
    if (idx === -1) return json({ error: `project "${originalSlug}" not found` }, 404);
    if (result.slug !== originalSlug && content.projects.some((p) => p.slug === result.slug)) {
      return json({ error: `slug "${result.slug}" already exists` }, 409);
    }
    content.projects[idx] = result;
    await writeContent(content);
    return json({ ok: true, project: result });
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  const slug = slugify(url.searchParams.get('slug') ?? '');
  if (!slug) return json({ error: 'slug query param required' }, 400);

  const content = await readContent();
  const before = content.projects.length;
  content.projects = content.projects.filter((p) => p.slug !== slug);
  if (content.projects.length === before) return json({ error: `project "${slug}" not found` }, 404);
  await writeContent(content);
  return json({ ok: true });
};
