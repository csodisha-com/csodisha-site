// Clean-slate v234: static Odisha starter seeders purged.
// All jobs, current affairs, mock tests, and resources are created strictly in Admin Studio (/admin/).
import { HttpError, json } from '../../_lib/http.js';
import { requireRole, audit } from '../../_lib/rbac.js';

const SEED_JOBS = [];
const SEED_CA = [];
const SEED_TESTS = [];
const SEED_RESOURCES = [];

export async function handleSeedOdisha(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  const inserted = { jobs: 0, current_affairs: 0, mock_tests: 0, questions: 0, resources: 0 };
  const skipped = { jobs: SEED_JOBS.length, current_affairs: SEED_CA.length, mock_tests: SEED_TESTS.length, resources: SEED_RESOURCES.length };
  await audit(env, request, actor, 'seed.odisha', 'system', 'clean_slate_noop', { inserted, skipped });
  return json({ ok: true, clean_slate: true, inserted, skipped });
}

export async function onRequest({ request, env }) {
  const actor = await requireRole(request, env, ['admin']);
  return handleSeedOdisha(request, env, actor);
}
