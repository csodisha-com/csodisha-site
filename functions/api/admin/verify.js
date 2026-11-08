// Cloudflare Pages Function: /api/admin/verify
const ADMIN_EMAIL = 'admin@csodisha.com';
const VALID_TOKEN_PREFIX = 'cso_adm_';

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    });
  }

  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token || (!token.startsWith(VALID_TOKEN_PREFIX) && token.length < 10)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      user: {
        email: ADMIN_EMAIL,
        name: 'CSO Lead Administrator',
        role: 'SuperAdmin',
        permissions: ['all', 'moderation', 'inquiries', 'config', 'broadcasts']
      },
      system: {
        version: '2026.11-PROD',
        region: 'ap-south-1 (Bhubaneswar/Kolkata Edge)',
        status: 'operational',
        verifiedAt: new Date().toISOString()
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}
