import type { APIRoute } from 'astro';

export const prerender = false; // server-rendered on demand (needs the SSR adapter)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tiny in-memory rate limiter (per server instance — a first line, not a fortress)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t > RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > RATE_MAX;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') {
      return json({ success: false, error: 'Invalid request body' }, 400);
    }

    // Honeypot: real users never fill this. Bots get a fake success.
    const website = typeof data.website === 'string' ? data.website.trim() : '';
    if (website !== '') {
      return json({ success: true }, 200);
    }

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim() : '';
    const role = typeof data.role === 'string' ? data.role.trim() : '';
    const portfolio = typeof data.portfolio === 'string' ? data.portfolio.trim() : '';
    const message = typeof data.message === 'string' ? data.message.trim() : '';

    if (!name || !EMAIL_RE.test(email) || !message) {
      return json({ success: false, error: 'Missing or invalid required fields' }, 400);
    }
    if (name.length > 200 || email.length > 320 || message.length > 5000 || portfolio.length > 300 || role.length > 60) {
      return json({ success: false, error: 'Payload too large' }, 400);
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (rateLimited(ip)) {
      return json({ success: false, error: 'Too many requests — try again in a minute' }, 429);
    }

    // Runtime env first (Docker compose) so secrets never get baked into the
    // image; import.meta.env covers dev/build-time .env as the fallback.
    const botToken = process.env.TELEGRAM_BOT_TOKEN || import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || import.meta.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
      console.error('Join form misconfigured: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
      return json({ success: false, error: 'Contact channel is not configured' }, 500);
    }

    const lines = [
      '🚀 NEW TEAM PITCH — Raybrilliant Labs',
      '',
      `👤 Name: ${escapeHtml(name)}`,
      `📧 Email: ${escapeHtml(email)}`,
      `🧑‍💻 Role: ${escapeHtml(role || 'Not specified')}`,
      `🔗 Portfolio: ${portfolio ? escapeHtml(portfolio) : '—'}`,
      '💬 Pitch:',
      escapeHtml(message),
    ];
    const text = lines.join('\n');

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!telegramRes.ok) {
      console.error('Telegram API error:', telegramRes.status, await telegramRes.text().catch(() => ''));
      return json({ success: false, error: 'Could not deliver your pitch — try email' }, 502);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error('Join form error:', err);
    return json({ success: false, error: 'Something went wrong' }, 500);
  }
};
