/**
 * v402: Interactive Exam Fee & Category-Wise Vacancy Visualizer Verification Suite
 * Validates:
 *  1. Structured category-wise vacancy_breakdown / vacancies_json & fee_structure / fees_json parsing
 *     across UR, SEBC, SC, ST, and PwBD with exact share percentages & fee exemption detection
 *  2. Smart fallback parsing from article body prose when structured category columns are absent,
 *     plus post-wise distribution fallback (e.g. MMU Bhawanipatna 31 posts)
 *  3. Strict CSP compliance (zero .innerHTML, zero .style.*, zero hardcoded hex), detail-only mount
 *     on /jobs/<slug>, and Admin Studio category/fee preset buttons
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const vizSrc = fs.readFileSync('assets/js/job-vacancy-fee-visualizer.js', 'utf8');
assert.ok(!/\.innerHTML\b/.test(vizSrc), 'job-vacancy-fee-visualizer.js must not use .innerHTML');
assert.ok(!/\.outerHTML\b/.test(vizSrc), 'job-vacancy-fee-visualizer.js must not use .outerHTML');
assert.ok(!/insertAdjacentHTML/.test(vizSrc), 'job-vacancy-fee-visualizer.js must not use insertAdjacentHTML');
assert.ok(!/\.style\./.test(vizSrc), 'job-vacancy-fee-visualizer.js must not mutate .style.*');

const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(vizSrc, sandbox);
const viz = sandbox.CSOJobVacancyFeeViz;
assert.ok(viz && viz.version === 'v402', 'CSOJobVacancyFeeViz v402 loaded');

// 1. Structured category-wise vacancies + fees
const structuredOut = viz.parseVacancyAndFeeData({
  total_vacancies: 100,
  vacancy_breakdown: [
    { post_name: 'UR (Unreserved)', vacancies: '50' },
    { post_name: 'SEBC', vacancies: '12' },
    { post_name: 'SC', vacancies: '16' },
    { post_name: 'ST', vacancies: '18' },
    { post_name: 'PwBD', vacancies: '4' }
  ],
  fee_structure: [
    { category: 'UR / SEBC', amount: '₹500', payment_mode: 'Online' },
    { category: 'SC / ST / PwBD', amount: '₹0 (Exempted)', payment_mode: 'Exempted' }
  ]
});
assert.equal(structuredOut.has_data, true);
assert.equal(structuredOut.has_category_split, true);
assert.equal(structuredOut.total_vacancies, 100);
const urVac = structuredOut.category_vacancies.find((x) => x.key === 'ur');
const stVac = structuredOut.category_vacancies.find((x) => x.key === 'st');
assert.equal(urVac.count, 50);
assert.equal(urVac.pct, 50);
assert.equal(urVac.bar_step, 50);
assert.equal(stVac.count, 18);
assert.equal(structuredOut.fees_by_cat.ur.amount_num, 500);
assert.equal(structuredOut.fees_by_cat.ur.is_exempt, false);
assert.equal(structuredOut.fees_by_cat.sc.amount_num, 0);
assert.equal(structuredOut.fees_by_cat.sc.is_exempt, true);
assert.equal(structuredOut.fees_by_cat.pwbd.is_exempt, true);

// 2. Smart fallback parsing from article body prose
const fallbackOut = viz.parseVacancyAndFeeData({
  total_vacancies: 33,
  article_body_en: 'Category split: UR: 15, SEBC: 4, SC: 5, ST: 7, PwBD: 2. Application fee for UR/SEBC is ₹400 while SC/ST/PwBD candidates are Exempted.'
});
assert.equal(fallbackOut.has_category_split, true);
assert.equal(fallbackOut.category_vacancies.find((x) => x.key === 'ur').count, 15);
assert.equal(fallbackOut.category_vacancies.find((x) => x.key === 'sebc').count, 4);
assert.equal(fallbackOut.category_vacancies.find((x) => x.key === 'pwbd').count, 2);
assert.equal(fallbackOut.fees_by_cat.ur.amount_num, 400);
assert.equal(fallbackOut.fees_by_cat.st.is_exempt, true);

// 2b. Post-wise fallback (e.g., MMU Bhawanipatna 31 posts across subjects, no category split)
const postWiseOut = viz.parseVacancyAndFeeData({
  total_vacancies: 31,
  vacancy_breakdown: [
    { post_name: 'Assistant Professor (Education)', vacancies: '12' },
    { post_name: 'Assistant Professor (Odia)', vacancies: '9' },
    { post_name: 'Assistant Professor (Mathematics)', vacancies: '10' }
  ],
  article_body_en: 'No application fee for all candidates.'
});
assert.equal(postWiseOut.has_data, true);
assert.equal(postWiseOut.has_category_split, false);
assert.equal(postWiseOut.post_bars.length, 3);
assert.equal(postWiseOut.fees_by_cat.ur.is_exempt, true);

// 3. Mount, Admin presets & CSS checks
const jobsHtml = fs.readFileSync('jobs/index.html', 'utf8');
const jobsPortalJs = fs.readFileSync('assets/js/jobs-portal.js', 'utf8');
const adminJobsJs = fs.readFileSync('admin/jobs-publishing-studio.js', 'utf8');
const styleCss = fs.readFileSync('assets/style.css', 'utf8');

assert.ok(jobsHtml.includes('/assets/js/job-vacancy-fee-visualizer.js?v=20261127v431'), 'jobs/index.html loads job-vacancy-fee-visualizer.js');
assert.ok(!jobsHtml.includes('id="cso-vacancy-fee-viz-root"'), '/jobs/ hub static HTML omits detail visualizer root');
assert.ok(jobsPortalJs.includes("vfvMount.id = 'cso-vacancy-fee-viz-root'"), 'jobs-portal.js mounts #cso-vacancy-fee-viz-root in detail view');
assert.ok(jobsPortalJs.includes('CSOJobVacancyFeeViz.mount'), 'jobs-portal.js invokes CSOJobVacancyFeeViz.mount');
assert.ok(adminJobsJs.includes('Load UR/SEBC/SC/ST/PwBD Vacancy Split Preset'), 'Admin Studio includes category split preset button');
assert.ok(adminJobsJs.includes('Load Odisha Fee Exemption Preset'), 'Admin Studio includes fee exemption preset button');

const v402Css = styleCss.slice(styleCss.indexOf('v402:'));
assert.ok(v402Css.includes('.cso-vfv-card') && v402Css.includes('.cso-vfv-bar--w50'), 'assets/style.css defines v402 styles & discrete bar classes');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v402Css), 'Zero hardcoded hex colors in v402 CSS');

console.log('✅ v402 Interactive Exam Fee & Category-Wise Vacancy Visualizer test suite passed!');
