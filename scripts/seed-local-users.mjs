// Local-dev only: prints SQL that creates admin/editor/candidate test users (password: Test-Pass-12345).
import { webcrypto as crypto } from 'node:crypto';
const hex = b => Buffer.from(b).toString('hex');
async function hash(pw, salt) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Buffer.from(salt, 'hex'), iterations: 100000, hash: 'SHA-256' }, k, 256));
}
const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
const h = await hash('Test-Pass-12345', salt);
const now = Math.floor(Date.now() / 1000);
for (const [id, email, role] of [['u-admin', 'admin@test.local', 'admin'], ['u-editor', 'editor@test.local', 'editor'], ['u-cand', 'cand@test.local', 'candidate']]) {
  console.log(`INSERT OR REPLACE INTO users (id, email, password_hash, salt, created_at, updated_at, role) VALUES ('${id}', '${email}', '${h}', '${salt}', ${now}, ${now}, '${role}');`);
}
