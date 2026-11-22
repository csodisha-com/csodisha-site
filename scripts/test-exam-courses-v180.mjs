import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const courseHub = require(path.join(root, 'study-library/assets/course-hub.js'));
const otetCourse = require(path.join(root, 'study-library/otet-osstet/assets/course.js'));
const opscCourse = require(path.join(root, 'study-library/opsc-oas/assets/course.js'));

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

function verifyCourseConfig(courseObj, expectedKey, expectedUrl, htmlPath, jsPath) {
  assert.equal(courseObj.PROGRESS_KEY, expectedKey);
  assert.equal(courseObj.MODULES.length, 5, `${expectedUrl} must have 5 modules`);

  let totalQuiz = 0;
  for (const mod of courseObj.MODULES) {
    assert.ok(mod.id && mod.title && mod.titleOr, `Module ${mod.number} must have id, title, and Odia subtitle`);
    assert.ok(Array.isArray(mod.outcomes) && mod.outcomes.length >= 3);
    assert.ok(Array.isArray(mod.notes) && mod.notes.length >= 3);
    assert.ok(Array.isArray(mod.diagramNodes) && mod.diagramNodes.length === 4);
    assert.ok(Array.isArray(mod.references) && mod.references.length >= 2);
    assert.ok(Array.isArray(mod.quiz) && mod.quiz.length === 3);
    totalQuiz += mod.quiz.length;
  }
  assert.equal(totalQuiz, 15, `${expectedUrl} must have 15 MCQs total`);

  // Progress toggle & persistence
  const storage = createMemoryStorage();
  assert.deepEqual(courseHub.loadProgress(expectedKey, storage).completedModules, []);
  courseHub.toggleModuleCompletion(expectedKey, courseObj.MODULES[0].id, storage);
  courseHub.toggleModuleCompletion(expectedKey, courseObj.MODULES[2].id, storage);
  assert.equal(courseHub.loadProgress(expectedKey, storage).completedModules.length, 2);
  const raw = JSON.parse(storage.getItem(expectedKey));
  assert.equal(raw.completedModules.length, 2);

  // Quiz evaluation & Mistake Deck sync
  const mod1 = courseObj.MODULES[0];
  const okRes = courseHub.evaluateQuizAnswer(courseObj.EXAM_PREFIX, mod1, mod1.quiz[0].id, mod1.quiz[0].answerIndex, storage);
  assert.equal(okRes.isCorrect, true);
  assert.equal(storage.getItem('cso_study_mistake_deck'), null);

  const wrongIdx = (mod1.quiz[1].answerIndex + 1) % mod1.quiz[1].options.length;
  const errRes = courseHub.evaluateQuizAnswer(courseObj.EXAM_PREFIX, mod1, mod1.quiz[1].id, wrongIdx, storage);
  assert.equal(errRes.isCorrect, false);
  let deck = JSON.parse(storage.getItem('cso_study_mistake_deck'));
  assert.equal(deck.length, 1);
  assert.equal(deck[0].id, mod1.quiz[1].id);
  courseHub.evaluateQuizAnswer(courseObj.EXAM_PREFIX, mod1, mod1.quiz[1].id, wrongIdx, storage);
  deck = JSON.parse(storage.getItem('cso_study_mistake_deck'));
  assert.equal(deck.length, 1, 'Mistake deck must deduplicate by question id');

  // HTML + JSON-LD + CSP checks
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
  otetCourse,
  'cso_otet_course_progress',
  'https://csodisha.com/study-library/otet-osstet/',
  'study-library/otet-osstet/index.html',
  'study-library/otet-osstet/assets/course.js'
);

verifyCourseConfig(
  opscCourse,
  'cso_opsc_course_progress',
  'https://csodisha.com/study-library/opsc-oas/',
  'study-library/opsc-oas/index.html',
  'study-library/opsc-oas/assets/course.js'
);

const hubJs = fs.readFileSync(path.join(root, 'study-library/assets/course-hub.js'), 'utf8');
assert.equal(/innerHTML|insertAdjacentHTML/i.test(hubJs), false, 'Zero innerHTML in course-hub.js');

const studyHtml = fs.readFileSync(path.join(root, 'study-library/index.html'), 'utf8');
assert.ok(studyHtml.includes('/study-library/early-childhood-education/'));
assert.ok(studyHtml.includes('/study-library/otet-osstet/'));
assert.ok(studyHtml.includes('/study-library/opsc-oas/'));

const studySsr = fs.readFileSync(path.join(root, 'functions/_lib/study-library-ssr.js'), 'utf8');
assert.ok(studySsr.includes("pathname.startsWith('/study-library/otet-osstet/')"));
assert.ok(studySsr.includes("pathname.startsWith('/study-library/opsc-oas/')"));

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('https://csodisha.com/study-library/otet-osstet/'));
assert.ok(sitemap.includes('https://csodisha.com/study-library/opsc-oas/'));

const seoJs = fs.readFileSync(path.join(root, 'functions/api/content/_seo.js'), 'utf8');
assert.ok(seoJs.includes("'/study-library/otet-osstet/'"));
assert.ok(seoJs.includes("'/study-library/opsc-oas/'"));

console.log('test-exam-courses-v180: ALL CHECKS PASSED');
