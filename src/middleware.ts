import { defineMiddleware } from 'astro:middleware';
import { adminToken } from './utils/store';

const ADMIN_COOKIE = 'rl_admin';

/**
 * Gates /admin pages and /api/admin routes behind a shared-admin token.
 * Login posts the password to /api/admin/login which sets an HttpOnly
 * cookie; everything under the paths below requires it.
 */
export const onRequest = defineMiddleware((context, next) => {
  const { url, cookies, redirect, request } = context;
  const path = url.pathname;

  const isAdminPage = path === '/admin' || path.startsWith('/admin/');
  const isAdminApi = path === '/api/admin' || path.startsWith('/api/admin/');
  if (!isAdminPage && !isAdminApi) return next();

  const token = adminToken();
  if (!token) {
    const message = 'Admin is disabled: set ADMIN_TOKEN in the environment, then rebuild/restart.';
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: message }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(message, { status: 503 });
  }

  // The login endpoint and page must stay reachable without a cookie.
  if (path === '/admin/login' || path === '/api/admin/login' || path === '/api/admin/logout') {
    return next();
  }

  if (cookies.get(ADMIN_COOKIE)?.value === token) return next();

  if (isAdminApi) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return redirect('/admin/login');
});
