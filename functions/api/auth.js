/**
 * Cloudflare Pages Functions — Unified Auth Router
 * Handles /api/auth?action=register and /api/auth?action=login
 * Delegates to hardened handlers with full backward compatibility.
 */

import { onRequestPost as handleRegister } from './auth/register.js';
import { onRequestPost as handleVerifyOtp } from './auth/verify-otp.js';
import { onRequestPost as handleLogin } from './auth/login.js';
import { CORS_HEADERS, jsonResponse } from './auth/_utils.js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const action = url.searchParams.get('action');

  if (action === 'register' || action === 'resend-otp') {
    // resend-otp re-dispatches the dual-channel code while preserving the
    // pending password hash captured at sign-up time
    return handleRegister(context);
  }

  if (action === 'verify-otp') {
    return handleVerifyOtp(context);
  }

  if (action === 'login') {
    return handleLogin(context);
  }

  return jsonResponse({
    success: false,
    error: 'Invalid action parameter. Must be ?action=register or ?action=login'
  }, 400);
}
