import { errorResponse } from '../../../_lib/http.js';
import { requireRole, rateLimit, STAFF_ROLES } from '../../../_lib/rbac.js';
import { handleAdminCareersSnippets } from '../../../_lib/careers-portal.js';

export { handleAdminCareersSnippets };

async function run({ request, env }) {
  try {
    const actor = await requireRole(request, env, STAFF_ROLES);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
    }
    return await handleAdminCareersSnippets(request, env, actor);
  } catch (err) {
    return errorResponse(err);
  }
}

export const onRequestGet = run;
export const onRequestPost = run;
export const onRequestPut = run;
export const onRequestPatch = run;
export const onRequestDelete = run;
