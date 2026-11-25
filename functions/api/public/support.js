// Public Support & "Report an Error" / "Suggest Resource" Submission API (v312)
// Route: POST /api/public/support
import { HttpError, json, readJson, validationError, errorResponse, clientIp } from '../../_lib/http.js';
import { cleanStr } from '../../_lib/validate.js';
import { checkRateLimit } from '../auth/_utils.js';
import { ensureCandidateOpsSchema } from '../admin/candidate-ops.js';

const TYPE_MAP = {
  report_error: 'report_error',
  error: 'report_error',
  broken_link: 'report_error',
  outdated: 'report_error',
  suggest_resource: 'suggest_resource',
  suggestion: 'suggest_resource',
  general_support: 'general_support',
  support: 'general_support'
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function handlePublicSupportSubmitApi(request, env) {
  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    if (request.method !== 'POST') {
      throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Use POST to submit a support ticket.');
    }
    if (!env || !env.DB) {
      throw new HttpError(500, 'NO_DATABASE', 'Database binding unavailable');
    }

    const ip = clientIp(request) || 'unknown';
    const rl = checkRateLimit(`pub_support_${ip}`, 10, 10 * 60 * 1000);
    if (!rl.allowed) {
      return json(
        { ok: false, error: 'Too many submissions. Please wait a few minutes and try again.' },
        429,
        { 'Retry-After': String(rl.retryAfter), 'Cache-Control': 'no-store' }
      );
    }

    const body = await readJson(request, 30000);
    // Honeypot check
    if (body.website && String(body.website).trim()) {
      return json({ ok: true, id: 'ignored', status: 'open', message: 'Thank you for your submission.' }, 201, { 'Cache-Control': 'no-store' });
    }

    const rawType = String(body.ticket_type || body.kind || 'report_error').trim().toLowerCase();
    const ticketType = TYPE_MAP[rawType] || 'report_error';

    const subject = cleanStr(body.subject, 180, { required: true });
    const message = cleanStr(body.message !== undefined ? body.message : body.details, 3000, { required: true, multiline: true });
    const pageUrl = cleanStr(body.page_url, 500) || '';
    const contactEmail = cleanStr(body.contact_email, 160) || '';

    const errors = {};
    if (!subject || subject.length < 3) errors.subject = 'Please enter a brief subject (at least 3 characters).';
    if (!message || message.length < 5) errors.message = 'Please describe the error or suggestion (at least 5 characters).';
    if (contactEmail && !EMAIL_RE.test(contactEmail)) errors.contact_email = 'Enter a valid email address or leave it blank.';
    if (Object.keys(errors).length) throw validationError(errors);

    await ensureCandidateOpsSchema(env.DB);
    const id = `tkt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const nowIso = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO support_tickets (id, ticket_type, page_url, subject, message, contact_email, status, admin_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', '', ?, ?)`
    ).bind(id, ticketType, pageUrl, subject, message, contactEmail, nowIso, nowIso).run();

    return json({
      ok: true,
      id,
      ticket_type: ticketType,
      status: 'open',
      created_at: nowIso,
      message: 'Thank you! Your report has been received in the editorial Support Inbox.'
    }, 201, { 'Cache-Control': 'no-store' });
  } catch (err) {
    return errorResponse(err);
  }
}
