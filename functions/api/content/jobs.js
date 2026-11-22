import { handleContent, detectJobStage, formatJobStageLabel } from './_public.js';

export async function onRequestGet({ request, env }) {
  return handleContent(request, env);
}

export async function handleJobsContent(request, env) {
  return handleContent(request, env);
}

export { detectJobStage, formatJobStageLabel };
