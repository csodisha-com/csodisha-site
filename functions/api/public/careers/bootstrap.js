import { handlePublicCareersBootstrap } from '../../../_lib/careers-portal.js';

export { handlePublicCareersBootstrap };

export async function onRequestGet({ request, env }) {
  return handlePublicCareersBootstrap(request, env);
}
