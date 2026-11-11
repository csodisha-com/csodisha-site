/**
 * Cloudflare Pages Functions — Unified Auth Router
 * Handles /api/auth?action=register|login|verify-otp|resend-otp|logout (POST)
 * and /api/auth?action=me (GET).
 * Delegates to hardened handlers with full backward compatibility.
 */

import { onRequestPost as handleRegister } from './auth/register.js';
import { onRequestPost as handleVerifyOtp } from './auth/verify-otp.js';
import { onRequestPost as handleLogin } from './auth/login.js';
import { onRequestPost as handleLogout } from './auth/logout.js';
import { onRequestGet as handleMe } from './auth/me.js';
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

  if (action === 'logout') {
    return handleLogout(context);
  }

  return jsonResponse({
    success: false,
    error: 'Invalid action parameter. Must be ?action=register, ?action=login, ?action=verify-otp, ?action=resend-otp or ?action=logout'
  }, 400);
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const action = url.searchParams.get('action');

  if (action === 'me') {
    return handleMe(context);
  }

  return jsonResponse({
    success: false,
    error: 'Invalid action parameter. Must be ?action=me'
  }, 400);
}
