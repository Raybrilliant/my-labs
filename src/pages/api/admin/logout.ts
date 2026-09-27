import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('rl_admin', { path: '/' });
  return redirect('/admin/login');
};
