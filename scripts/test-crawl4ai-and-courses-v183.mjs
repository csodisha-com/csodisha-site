import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const fp = require(path.join(root, 'admin/fast-publish.js'));
const courseHub = require(path.join(root, 'study-library/assets/course-hub.js'));
const ossscCourse = require(path.join(root, 'study-library/osssc-ri-ari-amin/assets/course.js'));
const oprbCourse = require(path.join(root, 'study-library/odisha-police-oprb/assets/course.js'));

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    }
  };
}

// 1. Verify state-wide Crawl4AI sources.json
const sources = JSON.parse(fs.readFileSync(path.join(root, 'scripts/crawl4ai/sources.json'), 'utf8'));
assert.ok(sources.length >= 15, 'sources.json must include state-wide portals and district .nic.in targets');
const ids = new Set(sources.map((s) => s.id));
for (const reqId of ['opsc', 'ossc', 'osssc', 'oprb', 'osepa', 'khordha', 'cuttack', 'ganjam']) {
  assert.ok(ids.has(reqId), `sources.json must include ${reqId}`);
}
for (const src of sources) {
  assert.ok(src.url.startsWith('https://'), `Source URL must be HTTPS: ${src.url}`);
  assert.ok(fp.isVerifiedGovDomain(src.url), `Source URL must pass isVerifiedGovDomain: ${src.url}`);
}

// 2. Verify OSSSC & OPRB Course Hubs
function verifyCourseConfig(courseObj, expectedKey, expectedUrl, htmlPath, jsPath) {
  assert.equal(courseObj.PROGRESS_KEY, expectedKey);
  assert.equal(courseObj.MODULES.length, 5, `${expectedUrl} must have 5 modules`);

  let totalQuiz = 0;
  for (const mod of courseObj.MODULES) {
    assert.ok(mod.id && mod.title && mod.titleOr);
    assert.ok(Array.isArray(mod.outcomes) && mod.outcomes.length >= 3);
    assert.ok(Array.isArray(mod.notes) && mod.notes.length >= 3);
    assert.ok(Array.isArray(mod.diagramNodes) && mod.diagramNodes.length === 4);
    assert.ok(Array.isArray(mod.references) && mod.references.length >= 2);
    assert.ok(Array.isArray(mod.quiz) && mod.quiz.length === 3);
    totalQuiz += mod.quiz.length;
  }
  assert.equal(totalQuiz, 15, `${expectedUrl} must have 15 MCQs total`);

  const storage = createMemoryStorage();
  courseHub.toggleModuleCompletion(expectedKey, courseObj.MODULES[0].id, storage);
  assert.equal(courseHub.loadProgress(expectedKey, storage).completedModules.length, 1);

  const mod1 = courseObj.MODULES[0];
  const wrongIdx = (mod1.quiz[0].answerIndex + 1) % mod1.quiz[0].options.length;
  const errRes = courseHub.evaluateQuizAnswer(courseObj.EXAM_PREFIX, mod1, mod1.quiz[0].id, wrongIdx, storage);
  assert.equal(errRes.isCorrect, false);
  const deck = JSON.parse(storage.getItem('cso_study_mistake_deck'));
  assert.equal(deck.length, 1);
  assert.equal(deck[0].id, mod1.quiz[0].id);

  const html = fs.readFileSync(path.join(root, htmlPath), 'utf8');
  const js = fs.readFileSync(path.join(root, jsPath), 'utf8');
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(ldMatch, `${htmlPath} must include Course JSON-LD`);
  const ldJson = JSON.parse(ldMatch[1]);
  assert.equal(ldJson['@type'], 'Course');
  assert.equal(ldJson.isAccessibleForFree, true);
  assert.equal(ldJson.url, expectedUrl);

  assert.equal(/<style\b/i.test(html), false, `Zero <style> in ${htmlPath}`);
  assert.equal(/\sstyle="/i.test(html), false, `Zero style="" in ${htmlPath}`);
  assert.equal(/\sonclick=/i.test(html), false, `Zero onclick= in ${htmlPath}`);
  const nonLdScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
  for (const s of nonLdScripts) {
    assert.equal(s[2].trim(), '', `Executable scripts in ${htmlPath} must be external`);
  }
  assert.equal(/innerHTML|insertAdjacentHTML/i.test(js), false, `Zero innerHTML in ${jsPath}`);
}

verifyCourseConfig(
  ossscCourse,
  'cso_osssc_ri_course_progress',
  'https://csodisha.com/study-library/osssc-ri-ari-amin/',
  'study-library/osssc-ri-ari-amin/index.html',
  'study-library/osssc-ri-ari-amin/assets/course.js'
);

verifyCourseConfig(
  oprbCourse,
  'cso_oprb_course_progress',
  'https://csodisha.com/study-library/odisha-police-oprb/',
  'study-library/odisha-police-oprb/index.html',
  'study-library/odisha-police-oprb/assets/course.js'
);

// 3. Verify discovery, SSR pass-through, sitemap, SEO, and SW cache v183
const studyHtml = fs.readFileSync(path.join(root, 'study-library/index.html'), 'utf8');
for (const slug of [
  '/study-library/early-childhood-education/',
  '/study-library/otet-osstet/',
  '/study-library/opsc-oas/',
  '/study-library/osssc-ri-ari-amin/',
  '/study-library/odisha-police-oprb/'
]) {
  assert.ok(studyHtml.includes(slug), `study-library/index.html must showcase ${slug}`);
}

const studySsr = fs.readFileSync(path.join(root, 'functions/_lib/study-library-ssr.js'), 'utf8');
assert.ok(studySsr.includes("pathname.startsWith('/study-library/osssc-ri-ari-amin/')"));
assert.ok(studySsr.includes("pathname.startsWith('/study-library/odisha-police-oprb/')"));

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('https://csodisha.com/study-library/osssc-ri-ari-amin/'));
assert.ok(sitemap.includes('https://csodisha.com/study-library/odisha-police-oprb/'));

const seoJs = fs.readFileSync(path.join(root, 'functions/api/content/_seo.js'), 'utf8');
assert.ok(seoJs.includes("'/study-library/osssc-ri-ari-amin/'"));
assert.ok(seoJs.includes("'/study-library/odisha-police-oprb/'"));

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v183'"));

console.log('test-crawl4ai-and-courses-v183: ALL CHECKS PASSED');
