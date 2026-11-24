import { handlePublicCareersList } from '../../../_lib/careers-portal.js';

export { handlePublicCareersList };

export async function onRequestGet({ request, env }) {
  return handlePublicCareersList(request, env);
}
