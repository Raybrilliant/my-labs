import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { asString, slugify } from '../../../utils/store';

export const prerender = false;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB upload cap
const UPLOAD_DIR = () => path.join(process.cwd(), 'data', 'uploads');

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Magic-byte sniffing — extensions lie, file headers don't. */
function detectImageType(buf: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  return null;
}

/**
 * POST multipart/form-data with a `file` field. Images are recompressed
 * to WEBP (max 1600px, q80) before hitting disk so server storage stays
 * small. Files land in data/uploads (the persistent volume) and are
 * served from /uploads/<name>.webp by the catch-all route.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'file field is required' }, 400);
    if (file.size === 0) return json({ error: 'file is empty' }, 400);
    if (file.size > MAX_BYTES) return json({ error: 'file too large — 10MB max' }, 413);

    const input = Buffer.from(await file.arrayBuffer());
    const type = detectImageType(input);
    if (!type) return json({ error: 'only JPEG, PNG or WEBP images are allowed' }, 415);

    const base =
      slugify(asString(path.parse(file.name || 'image').name, 60)).replace(/-/g, '').slice(0, 32) ||
      'img';
    // Full-buffer content hash — same image => same filename (dedup + safe
    // immutable caching), different image => never collides.
    const hash = createHash('sha256').update(input).digest('hex').slice(0, 10);
    const name = `${base}-${hash}.webp`;

    let output: Buffer;
    let ext = 'webp';
    try {
      output = await sharp(input)
        .rotate() // honour EXIF orientation before resizing
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      // Defensive fallback: never lose an admin upload over a sharp edge case.
      console.error('WEBP conversion failed, saving original:', err);
      output = input;
      ext = type === 'jpeg' ? 'jpg' : type;
    }

    await mkdir(UPLOAD_DIR(), { recursive: true });
    const filename = ext === 'webp' ? name : `${base}-${hash}.${ext}`;
    await writeFile(path.join(UPLOAD_DIR(), filename), output);

    return json({ ok: true, url: `/uploads/${filename}`, bytes: output.length }, 201);
  } catch (err) {
    console.error('Upload error:', err);
    return json({ error: 'Upload failed' }, 500);
  }
};
