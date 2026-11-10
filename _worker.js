/**
 * Cloudflare Worker Entrypoint (_worker.js)
 * Routes dynamic API endpoints (/api/health, /api/auth, /api/sync) to functions
 * and falls back to static assets (env.ASSETS).
 */

import { onRequestGet as handleHealthGet, onRequestOptions as handleHealthOptions } from './functions/api/health.js';
import { onRequestPost as handleAuthPost, onRequestOptions as handleAuthOptions } from './functions/api/auth.js';
import { onRequestPost as handleRegisterPost, onRequestOptions as handleRegisterOptions } from './functions/api/auth/register.js';
import { onRequestPost as handleLoginPost, onRequestOptions as handleLoginOptions } from './functions/api/auth/login.js';
import { onRequestGet as handleSyncGet, onRequestPost as handleSyncPost, onRequestOptions as handleSyncOptions } from './functions/api/sync.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. /api/health
    if (pathname === '/api/health') {
      if (request.method === 'OPTIONS') return handleHealthOptions();
      if (request.method === 'GET') return handleHealthGet({ request, env, ctx });
    }

    // 2. /api/auth/register
    if (pathname === '/api/auth/register') {
      if (request.method === 'OPTIONS') return handleRegisterOptions();
      if (request.method === 'POST') return handleRegisterPost({ request, env, ctx });
    }

    // 3. /api/auth/login
    if (pathname === '/api/auth/login') {
      if (request.method === 'OPTIONS') return handleLoginOptions();
      if (request.method === 'POST') return handleLoginPost({ request, env, ctx });
    }

    // 4. /api/auth?action=register | login
    if (pathname === '/api/auth') {
      if (request.method === 'OPTIONS') return handleAuthOptions();
      if (request.method === 'POST') return handleAuthPost({ request, env, ctx });
    }

    // 5. /api/sync
    if (pathname === '/api/sync') {
      if (request.method === 'OPTIONS') return handleSyncOptions();
      if (request.method === 'GET') return handleSyncGet({ request, env, ctx });
      if (request.method === 'POST') return handleSyncPost({ request, env, ctx });
    }

    // Fall back to static asset binding
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
