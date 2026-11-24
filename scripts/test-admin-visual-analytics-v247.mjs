#!/usr/bin/env node
/**
 * v247 Admin Studio Visual Analytics, SVG Charts & Color-Coded Tiles Verification
 * Verifies:
 *  1. GET /api/admin/visual-analytics is wired in COMMAND_SUITE_RESOURCES (STAFF_ROLES gated)
 *     and returns 14-day trend series, pillar inventory, normalized Odisha districts & exam tracks,
 *     doc readiness buckets, R2 storage breakdown, top homepage blocks, and recent mutations.
 *  2. admin/visual-analytics.js builds pure-CSP SVG charts using createElementNS('http://www.w3.org/2000/svg', ...)
 *     with KPI Sparkline Tiles, 14-Day Trend Area Chart, Donut Gauges, Horizontal Bar Charts & Sortable Tables.
 *  3. Command Overview (Alt+0), Candidate Hub (Alt+7), and Homepage Studio (Alt+6) integrate the visual charts.
 *  4. Strict CSP compliance across all v247 files and sw.js / ops-sentinel.js bumped to cso-candidate-cache-v247.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let passed = 0;
let failed = 0;

function check(label, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  PASS: ${label}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  FAIL: ${label}\n        ${err.message}`);
      failed++;
    });
}

console.log('\n=== v247 Admin Visual Analytics & SVG Charting Verification ===');

await check('Backend /api/admin/visual-analytics returns live D1-shaped analytics without dummy data', async () => {
  const mod = await import(path.join(ROOT, 'functions/_lib/command-suite.js'));
  assert.ok(mod.COMMAND_SUITE_RESOURCES.includes('visual-analytics'));
  const today = new Date().toISOString().slice(0, 10);
  const mockDb = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() {
          if (sql.includes('candidate_doc_templates')) return { n: 8 };
          if (sql.includes('candidate_assigned_acks')) return { seen: 5, downloaded: 3, completed: 2 };
          if (sql.includes('candidate_assigned_items')) return { n: 4 };
          return { total: 3, published: 2, n: 2 };
        },
        async all() {
          if (sql.includes('FROM candidates')) return { results: [{ district: 'Balasore (Baleswar)', n: 4 }, { district: 'Khurda', n: 3 }] };
          if (sql.endsWith('GROUP BY d')) return { results: [{ d: today, n: 3 }] };
          if (sql.includes('GROUP BY section_key')) return { results: [{ section_key: 'popular_searches', total: 11, published: 11, clicks: 45 }] };
          if (sql.includes('FROM homepage_blocks ORDER BY')) return { results: [{ id: 'hb_1', section_key: 'popular_searches', title_en: 'OSSTET', is_published: 1, clicks_count: 45, updated_at: today }] };
          if (sql.includes('FROM media_files')) return { results: [{ file_category: 'pdf', n: 2, bytes: 2097152 }] };
          if (sql.includes('FROM candidate_exam_preferences')) return { results: [{ primary_exam: 'ugc-net', selected_exams_json: '["opsc"]' }] };
          if (sql.includes('FROM candidate_lockers')) return { results: [{ locker_data: '{"aadhaar_id":true,"matric_cert":true}' }] };
          if (sql.includes('FROM audit_log')) return { results: [{ id: 1, action: 'homepage_block.publish', target_type: 'homepage_block', target_id: 'hb_1', created_at: today, actor_email: 'admin@csodisha.com' }] };
          return { results: [] };
        }
      };
    }
  };
  const res = await mod.handleVisualAnalytics(new Request('https://csodisha.com/api/admin/visual-analytics'), { DB: mockDb });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.trend_14d.length, 14);
  assert.equal(data.trend_14d[13].registrations, 3);
  assert.equal(data.demographics.districts[0].label, 'Balasore');
  assert.equal(data.demographics.districts[1].label, 'Khordha');
  assert.ok(data.demographics.exam_boards.some(e => e.label === 'UGC NET'));
  assert.equal(data.r2_storage.total_files, 2);
  assert.equal(data.r2_storage.total_mb, 2);
  assert.equal(data.top_homepage_blocks[0].clicks_count, 45);
});

await check('Pure-CSP SVG Chart Engine (admin/visual-analytics.js & css) implements all chart primitives', () => {
  const js = read('admin/visual-analytics.js');
  for (const token of [
    'http://www.w3.org/2000/svg', 'createElementNS',
    'kpiSparklineTile', 'quickActionTile', 'trendAreaChart',
    'donutChart', 'horizontalBarChart', 'dataTable'
  ]) {
    assert.ok(js.includes(token), `visual-analytics.js includes ${token}`);
  }
  const css = read('admin/visual-analytics.css');
  for (const tone of ['emerald', 'cobalt', 'amber', 'violet', 'rose']) {
    assert.ok(css.includes(`.va-tone-${tone}`), `visual-analytics.css defines .va-tone-${tone}`);
  }
  assert.equal(/@import|https?:\/\//.test(css), false, 'self-hosted CSS only');
});

await check('Admin Studio integrates visual charts across Overview, Candidate Hub, Homepage Studio & index.html', () => {
  const html = read('admin/index.html');
  assert.ok(html.includes('/admin/visual-analytics.css') && html.includes('/admin/visual-analytics.js'));
  assert.ok(read('admin/command-suite.js').includes('visual-analytics') && read('admin/command-suite.js').includes('trendAreaChart'));
  assert.ok(read('admin/candidate-hub-studio.js').includes('Visual Insights & Demographics') && read('admin/candidate-hub-studio.js').includes('va-collapse'));
  assert.ok(read('admin/homepage-studio.js').includes('Section Clicks & Block Distribution') && read('admin/homepage-studio.js').includes('horizontalBarChart'));
});

await check('Strict CSP compliance & sw.js / ops-sentinel.js bumped to cso-candidate-cache-v247', () => {
  for (const rel of ['admin/visual-analytics.js', 'admin/command-suite.js', 'admin/candidate-hub-studio.js', 'admin/homepage-studio.js', 'functions/_lib/command-suite.js']) {
    const js = read(rel);
    assert.equal(/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(js), false, `${rel}: no innerHTML`);
    assert.equal(/\.style\.[a-zA-Z]|\.style\s*=|setAttribute\(\s*['"]style/.test(js), false, `${rel}: no .style.*`);
    assert.equal(/\son[a-z]+\s*=\s*["']/i.test(js), false, `${rel}: no inline handlers`);
  }
  assert.ok(/const CACHE_NAME = 'cso-candidate-cache-v2(?:4[789]|[5-9]\d)';/.test(read('sw.js')));
  assert.ok(/export const ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v2(?:4[789]|[5-9]\d)';/.test(read('functions/_lib/ops-sentinel.js')));
});

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
