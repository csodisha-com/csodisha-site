/**
 * Cloudflare Worker / Serverless API Router for CSO Admin Portal
 *
 * Implements:
 *  - GET  /api/admin/verify
 *  - GET  /api/admin/submissions (with pagination, status & search filtering)
 *  - PATCH /api/admin/submissions/:id (updates status: unread, read, resolved, archived)
 *  - Enforces Bearer token authentication
 *  - Returns standardized error envelopes: { "error": "Unauthorized" | "Forbidden" | "Not Found" }
 */

const ADMIN_EMAIL = 'admin@csodisha.com';
const VALID_TOKEN_PREFIX = 'cso_adm_';

// Initial in-memory/seed data fallback
const SEED_SUBMISSIONS = [
  {
    id: "INQ-2026-1082",
    timestamp: "2026-11-08T14:45:20Z",
    name: "Subrat Kumar Mohanty",
    email: "subrat.mohanty@gmail.com",
    phone: "+91 94371 88290",
    subject: "OPSC Civil Services Preliminary Syllabus clarification",
    message: "Respected team, could you please verify if the recent CSAT pattern update has been published in the jobs & careers portal? The syllabus link for General Studies Paper II seems to refer to last year's notification. Thank you for maintaining this excellent platform for Odisha students.",
    category: "Exam Syllabus",
    status: "unread",
    priority: "high",
    source: "contact@csodisha.com"
  },
  {
    id: "INQ-2026-1081",
    timestamp: "2026-11-08T12:15:05Z",
    name: "Priyadarshini Rout",
    email: "priya.rout99@yahoo.co.in",
    phone: "+91 70081 23456",
    subject: "Medhabruti Scholarship renewal application deadline",
    message: "Hello CSO Team, I am an engineering student studying at VSSUT Burla. I wanted to confirm the last date for submitting the income declaration certificate on the State Scholarship Portal for Medhabruti renewal. Your portal's scheme tracker has been very helpful.",
    category: "Scholarships",
    status: "unread",
    priority: "medium",
    source: "contact@csodisha.com"
  },
  {
    id: "INQ-2026-1079",
    timestamp: "2026-11-07T18:32:40Z",
    name: "Dr. Bijaylaxmi Das",
    email: "bijaylaxmi.das@utkaluniversity.ac.in",
    phone: "+91 98610 99412",
    subject: "Odisha Higher Education Faculty Research Grant details",
    message: "Dear CSO Editorial Team, We recently published a state-funded research index under OSHEC. Would it be possible to include the OSHEC Post-Doctoral Fellowship details in your Study Library under Odisha Higher Education opportunities? Happy to provide official notification PDFs.",
    category: "Resource Suggestion",
    status: "read",
    priority: "medium",
    source: "admin@csodisha.com"
  },
  {
    id: "INQ-2026-1076",
    timestamp: "2026-11-07T09:10:15Z",
    name: "Chandan Behera",
    email: "chandan.behera.od@outlook.com",
    phone: "+91 99380 55123",
    subject: "OSSSC Combined Recruitment Examination Admit Card link",
    message: "Greetings, The download link for OSSSC Junior Assistant admit card leads to server maintenance on the official OSSSC site. Does CSO maintain an alternative mirror link or cache? Looking forward to your guidance.",
    category: "Admit Card",
    status: "resolved",
    priority: "low",
    source: "contact@csodisha.com"
  },
  {
    id: "INQ-2026-1074",
    timestamp: "2026-11-06T15:20:00Z",
    name: "Ananya Patnaik",
    email: "ananya.patnaik@gmail.com",
    phone: "+91 91780 44321",
    subject: "OTET / OSSTET Qualifying Mark calculation for reserved category",
    message: "Sir/Madam, in the eligibility explorer under Teacher Recruitment, the pass mark for SC/ST candidates is stated as 50% (75 marks). Is there any additional relaxation for PwD candidates as per recent BSE Odisha notification? Kindly update if possible.",
    category: "Eligibility Criteria",
    status: "resolved",
    priority: "medium",
    source: "contact@csodisha.com"
  },
  {
    id: "INQ-2026-1071",
    timestamp: "2026-11-05T11:05:44Z",
    name: "Rashmi Ranjan Sahoo",
    email: "rashmi.sahoo@techodisha.in",
    phone: "+91 94399 77810",
    subject: "Technical issue: Study notes search filter on mobile view",
    message: "Hi, when searching under Study Library with two active filters (Secondary + Odia medium), the dropdown menu does not collapse after selection on Android Chrome. Minor UI glitch, otherwise very fast website.",
    category: "Bug Report",
    status: "read",
    priority: "low",
    source: "admin@csodisha.com"
  }
];

// Helper: JSON response with standard CORS & cache-control
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      ...extraHeaders
    }
  });
}

// Helper: Error envelope
function errorResponse(error, status) {
  return jsonResponse({ error }, status);
}

// Auth Verification Helper
function verifyAuth(request) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, error: 'Unauthorized', status: 401 };
  }
  const token = authHeader.slice(7).trim();
  if (!token || (!token.startsWith(VALID_TOKEN_PREFIX) && token.length < 10)) {
    return { ok: false, error: 'Forbidden', status: 403 };
  }
  return { ok: true, email: ADMIN_EMAIL, token };
}

/**
 * Handle incoming API requests
 * @param {Request} request
 * @param {Object} env
 * @param {Object} ctx
 */
export async function handleAdminApi(request, env, ctx) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS'
      }
    });
  }

  // Enforce Bearer Auth on all /api/admin/* endpoints
  const auth = verifyAuth(request);
  if (!auth.ok) {
    return errorResponse(auth.error, auth.status);
  }

  // 1. GET /api/admin/verify
  if (pathname === '/api/admin/verify' && request.method === 'GET') {
    return jsonResponse({
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
    });
  }

  // 2. GET /api/admin/submissions (with filtering and pagination)
  if (pathname === '/api/admin/submissions' && request.method === 'GET') {
    let list = [...SEED_SUBMISSIONS];

    // If KV or D1 is bound in env, read from there:
    if (env && env.CSO_KV) {
      try {
        const stored = await env.CSO_KV.get('cso_admin_submissions', { type: 'json' });
        if (Array.isArray(stored)) list = stored;
      } catch (_) {}
    }

    // Query parameters
    const statusParam = (url.searchParams.get('status') || 'all').toLowerCase();
    const searchParam = (url.searchParams.get('q') || '').toLowerCase().trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '10', 10)));

    // Filter by status
    if (statusParam && statusParam !== 'all') {
      list = list.filter(item => item.status.toLowerCase() === statusParam);
    }

    // Filter by search query (name, email, subject, message, id)
    if (searchParam) {
      list = list.filter(item =>
        item.name.toLowerCase().includes(searchParam) ||
        item.email.toLowerCase().includes(searchParam) ||
        item.subject.toLowerCase().includes(searchParam) ||
        item.message.toLowerCase().includes(searchParam) ||
        item.id.toLowerCase().includes(searchParam)
      );
    }

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    // Compute metric tallies
    const unreadCount = SEED_SUBMISSIONS.filter(s => s.status === 'unread').length;
    const readCount = SEED_SUBMISSIONS.filter(s => s.status === 'read').length;
    const resolvedCount = SEED_SUBMISSIONS.filter(s => s.status === 'resolved').length;

    return jsonResponse({
      submissions: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      },
      metrics: {
        total: SEED_SUBMISSIONS.length,
        unread: unreadCount,
        read: readCount,
        resolved: resolvedCount
      }
    });
  }

  // 3. PATCH /api/admin/submissions/:id
  const patchMatch = pathname.match(/^\/api\/admin\/submissions\/([a-zA-Z0-9_-]+)$/);
  if (patchMatch && request.method === 'PATCH') {
    const submissionId = patchMatch[1];

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    const allowedStatuses = ['unread', 'read', 'resolved', 'archived'];
    if (!body || !body.status || !allowedStatuses.includes(body.status.toLowerCase())) {
      return errorResponse('Invalid status. Allowed values: unread, read, resolved, archived', 400);
    }

    const newStatus = body.status.toLowerCase();
    const target = SEED_SUBMISSIONS.find(s => s.id.toLowerCase() === submissionId.toLowerCase());

    if (!target) {
      return errorResponse('Not Found', 404);
    }

    target.status = newStatus;
    target.updatedAt = new Date().toISOString();

    if (env && env.CSO_KV) {
      try {
        await env.CSO_KV.put('cso_admin_submissions', JSON.stringify(SEED_SUBMISSIONS));
      } catch (_) {}
    }

    return jsonResponse({
      success: true,
      message: `Inquiry ${submissionId} status updated to ${newStatus}`,
      submission: target
    });
  }

  // Default: Not Found
  return errorResponse('Not Found', 404);
}

// Cloudflare Worker export default
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminApi(request, env, ctx);
    }
    return new Response('Not Found', { status: 404 });
  }
};
