import { handleGoogleAuthCallback } from '../google.js';

export async function onRequestGet({ request, env }) {
  return handleGoogleAuthCallback({ request, env });
}
