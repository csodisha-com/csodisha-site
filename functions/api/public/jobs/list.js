import { handlePublicJobsListApi } from '../../../_lib/jobs-publishing-house.js';

export { handlePublicJobsListApi };

export async function onRequestGet({ request, env }) {
  return handlePublicJobsListApi(request, env);
}
