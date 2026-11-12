// POST /api/admin/media/upload — multipart upload to R2 with magic-byte validation.
import { HttpError, json, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';

const MB = 1024 * 1024;
const TYPES = {
  'image/jpeg': { ext: 'jpg', kind: 'image', max: 5 * MB },
  'image/png': { ext: 'png', kind: 'image', max: 5 * MB },
  'image/webp': { ext: 'webp', kind: 'image', max: 5 * MB },
  'application/pdf': { ext: 'pdf', kind: 'pdf', max: 15 * MB }
};

export function sniffMime(b) {
  const eq = (off, sig) => sig.every((x, i) => b[off + i] === x);
  if (b.length >= 3 && eq(0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (b.length >= 8 && eq(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (b.length >= 12 && eq(0, [0x52, 0x49, 0x46, 0x46]) && eq(8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  if (b.length >= 5 && eq(0, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf';
  return null;
}

export async function handleUpload(request, env, actor) {
  if (!env.MEDIA) throw new HttpError(500, 'NO_STORAGE', 'Media storage is not configured');
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.toLowerCase().startsWith('multipart/form-data')) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use multipart/form-data');
  const declaredLen = Number(request.headers.get('Content-Length') || 0);
  if (declaredLen > 16 * MB) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'File too large');
  let form;
  try { form = await request.formData(); } catch { throw new HttpError(400, 'BAD_REQUEST', 'Invalid multipart body'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') throw validationError({ file: 'Choose a file to upload' });

  const declared = (file.type || '').toLowerCase();
  const spec = TYPES[declared];
  if (!spec) throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPEG, PNG, WebP images and PDF files are allowed');
  if (file.size > spec.max) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', `File exceeds the ${spec.max / MB} MB limit for ${spec.kind}s`);
  if (file.size === 0) throw validationError({ file: 'File is empty' });

  const buf = await file.arrayBuffer();
  const sniffed = sniffMime(new Uint8Array(buf.slice(0, 16)));
  if (sniffed !== declared) throw new HttpError(415, 'CONTENT_MISMATCH', 'File contents do not match its declared type');

  const key = `${crypto.randomUUID()}.${spec.ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: declared } });
  const id = crypto.randomUUID();
  const name = String(file.name || '').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  try {
    await env.DB.prepare(
      `INSERT INTO media_assets (id, object_key, kind, mime_type, size_bytes, original_name, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, key, spec.kind, declared, file.size, name, actor.userId).run();
  } catch (e) {
    await env.MEDIA.delete(key);
    throw e;
  }
  await audit(env, request, actor, 'media.upload', 'media', id, { key, kind: spec.kind, size: file.size });
  return json({ id, key, kind: spec.kind, mime_type: declared, size_bytes: file.size, url: `/api/media/${key}` }, 201);
}
