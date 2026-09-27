import type { APIRoute } from 'astro';
import { adminToken } from '../../../utils/store';

export const prerender = false;

const COOKIE = 'rl_admin';
const SEVEN_DAYS = 60 * 60 * 24 * 7;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = adminToken();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Admin disabled (no ADMIN_TOKEN)' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password !== 'string' || body.password !== token) {
      return new Response(JSON.stringify({ error: 'Wrong password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    cookies.set(COOKIE, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SEVEN_DAYS,
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Bad request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
