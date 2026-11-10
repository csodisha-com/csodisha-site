/**
 * Cloudflare Pages Functions — D1 Database Health Check Endpoint
 * Route: GET /api/health
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8'
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

export async function onRequestGet({ env }) {
  if (!env || !env.DB) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Database binding (DB) is missing.'
      }),
      {
        status: 500,
        headers: CORS_HEADERS
      }
    );
  }

  try {
    const result = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();

    const tablesFound = result && result.results ? result.results.map(r => r.name) : [];
    const requiredTables = [
      'candidates',
      'candidate_checklists',
      'candidate_lockers',
      'candidate_notes',
      'candidate_mock_scores'
    ];

    const missingTables = requiredTables.filter(t => !tablesFound.includes(t));

    return new Response(
      JSON.stringify({
        ok: missingTables.length === 0,
        database: 'Cloudflare D1 connected',
        edgeTimestamp: new Date().toISOString(),
        tablesFound,
        missingTables
      }),
      {
        status: missingTables.length === 0 ? 200 : 503,
        headers: CORS_HEADERS
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Database query execution failed: ' + err.message
      }),
      {
        status: 500,
        headers: CORS_HEADERS
      }
    );
  }
}
