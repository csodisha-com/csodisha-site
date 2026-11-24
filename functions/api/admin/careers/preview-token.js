import { errorResponse } from '../../../_lib/http.js';
import { requireRole, rateLimit, STAFF_ROLES } from '../../../_lib/rbac.js';
import { handleAdminCareersPreviewToken } from '../../../_lib/careers-portal.js';

export { handleAdminCareersPreviewToken };

async function run({ request, env }) {
  try {
    const actor = await requireRole(request, env, STAFF_ROLES);
    await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
    return await handleAdminCareersPreviewToken(request, env, actor);
  } catch (err) {
    return errorResponse(err);
  }
}

export const onRequestPost = run;
