// Cloudflare Pages Function: /api/admin/submissions and /api/admin/submissions/:id
const ADMIN_EMAIL = 'admin@csodisha.com';
const VALID_TOKEN_PREFIX = 'cso_adm_';

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

export async function onRequest(context) {
  const { request, env, params } = context;

  // Handle CORS Preflight
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

  const auth = verifyAuth(request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const url = new URL(request.url);
  const pathParts = params.id || [];
  const submissionId = Array.isArray(pathParts) ? pathParts[0] : pathParts;

  // PATCH /api/admin/submissions/:id
  if (request.method === 'PATCH' && submissionId) {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const allowedStatuses = ['unread', 'read', 'resolved', 'archived'];
    if (!body || !body.status || !allowedStatuses.includes(body.status.toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const target = SEED_SUBMISSIONS.find(s => s.id.toLowerCase() === submissionId.toLowerCase());
    if (!target) {
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    target.status = body.status.toLowerCase();
    target.updatedAt = new Date().toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Inquiry ${submissionId} status updated to ${target.status}`,
        submission: target
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

  // GET /api/admin/submissions
  if (request.method === 'GET') {
    let list = [...SEED_SUBMISSIONS];
    const statusParam = (url.searchParams.get('status') || 'all').toLowerCase();
    const searchParam = (url.searchParams.get('q') || '').toLowerCase().trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '10', 10)));

    if (statusParam && statusParam !== 'all') {
      list = list.filter(item => item.status.toLowerCase() === statusParam);
    }

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

    return new Response(
      JSON.stringify({
        submissions: paginated,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        },
        metrics: {
          total: SEED_SUBMISSIONS.length,
          unread: SEED_SUBMISSIONS.filter(s => s.status === 'unread').length,
          read: SEED_SUBMISSIONS.filter(s => s.status === 'read').length,
          resolved: SEED_SUBMISSIONS.filter(s => s.status === 'resolved').length
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

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
