// v157: verify 4-level Stage -> Board -> Class -> Rich Class Content hierarchy, SVG visuals, Admin cascading fields & CSP.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  resolveEarlyChildhoodRoute,
  renderLevel1Html,
  renderLevel2Html,
  renderLevel3Html,
  renderLevel4Html
} from '../functions/_lib/study-early-childhood-pack.js';
import { renderKicker } from '../functions/_lib/ssr-shell.js';

const root = resolve(new URL('..', import.meta.url).pathname);

// 1. SVG visual assets exist
for (const svg of [
  'assets/img/study/nep-nipun-foundational-stage.svg',
  'assets/img/study/panchakosha-5-domains-wheel.svg',
  'assets/img/study/nipun-fln-lakshya-chart.svg',
  'assets/img/study/odia-barnamala-number-flashcards.svg'
]) {
  const p = join(root, svg);
  assert.ok(existsSync(p), `missing ${svg}`);
  assert.ok(statSync(p).size > 500, `${svg} is too small`);
}

// 2. Level 1
const r1 = resolveEarlyChildhoodRoute(['early-childhood-primary-education']);
assert.equal(r1.level, 1);
const h1 = renderLevel1Html(renderKicker(r1.crumbs));
assert.ok(h1.includes('Early Childhood &amp; Primary Education'));
assert.ok(h1.includes('NEP 2020 Age-to-Class Equivalency Table'));
assert.ok(!h1.includes('Unit 4'), 'Level 1 should not dump all units');

// 3. Level 2
for (const st of ['early-childhood', 'primary-education', 'ecce-pedagogy']) {
  const r2 = resolveEarlyChildhoodRoute(['early-childhood-primary-education', st]);
  assert.equal(r2.level, 2);
  const h2 = renderLevel2Html(r2, renderKicker(r2.crumbs));
  if (st === 'ecce-pedagogy') {
    assert.ok(h2.includes('NIPUN Odisha'));
  } else {
    assert.ok(h2.includes('Odisha State Board'));
    assert.ok(h2.includes('CBSE (NCERT'));
    assert.ok(h2.includes('ICSE (CISCE'));
  }
}

// 4. Level 3
for (const [st, bd] of [['primary-education', 'odisha-board'], ['early-childhood', 'cbse']]) {
  const r3 = resolveEarlyChildhoodRoute(['early-childhood-primary-education', st, bd]);
  assert.equal(r3.level, 3);
  const h3 = renderLevel3Html(r3, renderKicker(r3.crumbs));
  assert.ok(h3.includes('Select Class'));
  assert.ok(h3.includes('Holistic Progress Card'));
}

// 5. Level 4
for (const [st, bd, cl] of [
  ['primary-education', 'odisha-board', 'class-1'],
  ['early-childhood', 'odisha-board', 'nursery']
]) {
  const r4 = resolveEarlyChildhoodRoute(['early-childhood-primary-education', st, bd, cl]);
  assert.equal(r4.level, 4);
  const h4 = renderLevel4Html(r4, renderKicker(r4.crumbs));
  assert.ok(h4.includes('cso-ec-filter-pill'), 'missing interactive subject filter pills');
  assert.ok(h4.includes('Nua Arunima'), 'missing textbook shelf');
  assert.ok(h4.includes('panchakosha-5-domains-wheel.svg'), 'missing visual gallery');
  assert.ok(h4.includes('cso-sl-selftest-toggle'), 'missing self-test toggle');
  assert.ok(h4.includes('early-childhood-primary-education-complete-guide.odt'), 'missing ODT pack');
}

// 6. Admin cascading selectors & books/visuals fields
const cmsSrc = readFileSync(join(root, 'admin/cms/cms.js'), 'utf8');
assert.ok(cmsSrc.includes('STAGE_CLASSES') && cmsSrc.includes('stage_slug') && cmsSrc.includes('board_slug') && cmsSrc.includes('class_slug'));
assert.ok(cmsSrc.includes('books_json') && cmsSrc.includes('visuals_json') && cmsSrc.includes('odf_url'));

// 7. CSP check
for (const rel of [
  'functions/_lib/study-early-childhood-pack.js',
  'functions/_lib/study-library-ssr.js',
  'functions/_lib/study-library-studio.js',
  'study-library/assets/ssr-actions.js'
]) {
  const code = readFileSync(join(root, rel), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/<style[\s>]/i.test(code), `${rel}: inline <style>`);
  assert.ok(!/\sstyle\s*=\s*["']/i.test(code), `${rel}: inline style=""`);
  assert.ok(!/\.innerHTML\b/.test(code), `${rel}: .innerHTML`);
}

console.log('PASS: 4-level Study Hierarchy v157 checks passed');
