/**
 * Cloudflare Pages Functions — Candidate Authentication Engine
 * Route: /api/auth?action=register | /api/auth?action=login
 * Database: Cloudflare D1 (env.DB)
 * Web Crypto: PBKDF2 (100,000 iterations, SHA-256)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

// Convert buffer to hex string
function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to Uint8Array
function hexToBuf(hex) {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Generate cryptographically secure salt
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return bufToHex(array.buffer);
}

// PBKDF2 Web Crypto Hash (100,000 iterations, SHA-256)
async function hashPassword(password, saltHex) {
  const encoder = new TextEncoder();
  const passBuffer = encoder.encode(password);
  const saltBuffer = hexToBuf(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return bufToHex(derivedBits);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400);
    }

    // Fallback if D1 is not bound in local preview environment
    if (!env || !env.DB) {
      console.warn('env.DB binding not detected. Mocking response for edge sandbox.');
      const fallbackId = 'cso_usr_' + Date.now().toString(36);
      return jsonResponse({
        success: true,
        mode: 'edge_simulated',
        candidate: {
          id: fallbackId,
          fullName: body.fullName || 'Candidate Aspirant',
          email: body.email || 'aspirant@csodisha.com',
          district: body.district || 'Balasore (Baleswar)',
          targetStreams: body.targetStreams || ['opsc', 'ossc']
        }
      });
    }

    // 1. Candidate Registration
    if (action === 'register') {
      const { fullName, email, district, password, targetStreams } = body;

      if (!fullName || !email || !district || !password) {
        return jsonResponse({
          success: false,
          error: 'Missing required registration parameters (fullName, email, district, password)'
        }, 400);
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanDistrict = district.trim();
      const streamArray = Array.isArray(targetStreams) ? targetStreams : ['opsc', 'ossc'];

      // Check duplicate email
      const existing = await env.DB.prepare('SELECT id FROM candidates WHERE email = ?')
        .bind(cleanEmail)
        .first();

      if (existing) {
        return jsonResponse({
          success: false,
          error: 'An account with this email address already exists.'
        }, 409);
      }

      // Generate salt and PBKDF2 hash
      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const candidateId = 'cso_usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const now = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO candidates (
          id, full_name, email, district, password_hash, salt, target_streams, created_at, last_login_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        candidateId,
        cleanName,
        cleanEmail,
        cleanDistrict,
        passwordHash,
        salt,
        JSON.stringify(streamArray),
        now,
        now
      ).run();

      return jsonResponse({
        success: true,
        candidate: {
          id: candidateId,
          fullName: cleanName,
          email: cleanEmail,
          district: cleanDistrict,
          targetStreams: streamArray
        }
      }, 201);
    }

    // 2. Candidate Login
    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return jsonResponse({
          success: false,
          error: 'Email and password are required for authentication.'
        }, 400);
      }

      const cleanEmail = email.trim().toLowerCase();

      const candidate = await env.DB.prepare(`
        SELECT id, full_name, email, district, password_hash, salt, target_streams
        FROM candidates WHERE email = ?
      `).bind(cleanEmail).first();

      if (!candidate) {
        return jsonResponse({
          success: false,
          error: 'Invalid credentials. No candidate account found with this email.'
        }, 401);
      }

      const computedHash = await hashPassword(password, candidate.salt);
      if (computedHash !== candidate.password_hash) {
        return jsonResponse({
          success: false,
          error: 'Invalid password. Please check your credentials.'
        }, 401);
      }

      // Update login timestamp
      await env.DB.prepare(`
        UPDATE candidates SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(candidate.id).run();

      let parsedStreams = ['opsc', 'ossc'];
      try {
        parsedStreams = JSON.parse(candidate.target_streams);
      } catch(e) {}

      return jsonResponse({
        success: true,
        candidate: {
          id: candidate.id,
          fullName: candidate.full_name,
          email: candidate.email,
          district: candidate.district,
          targetStreams: parsedStreams
        }
      });
    }

    return jsonResponse({
      success: false,
      error: 'Invalid action parameter. Must be ?action=register or ?action=login'
    }, 400);

  } catch (error) {
    console.error('Fatal Edge Auth Error:', error);
    return jsonResponse({
      success: false,
      error: 'Internal edge server error occurred during authentication.'
    }, 500);
  }
}
