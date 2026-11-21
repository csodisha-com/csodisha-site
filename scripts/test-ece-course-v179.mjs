import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();

const eceCourse = require(path.join(root, 'study-library/early-childhood-education/assets/course.js'));

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

// 1. Verify 5 structured curriculum modules
assert.equal(eceCourse.ECE_MODULES.length, 5, 'Should have exactly 5 ECE modules');
for (const mod of eceCourse.ECE_MODULES) {
  assert.ok(mod.id && mod.title && mod.titleOr, `Module ${mod.number} must have id, title, and Odia subtitle`);
  assert.ok(Array.isArray(mod.outcomes) && mod.outcomes.length >= 3, `Module ${mod.number} must have >=3 outcomes`);
  assert.ok(Array.isArray(mod.notes) && mod.notes.length >= 3, `Module ${mod.number} must have >=3 notes`);
  assert.ok(Array.isArray(mod.diagramNodes) && mod.diagramNodes.length === 4, `Module ${mod.number} must have 4 visual diagram nodes`);
  assert.ok(Array.isArray(mod.references) && mod.references.length >= 2, `Module ${mod.number} must have >=2 references`);
  assert.ok(Array.isArray(mod.quiz) && mod.quiz.length === 3, `Module ${mod.number} must have 3 MCQ questions`);
}

// 2. Verify cso_ece_course_progress toggle & persistence
const storage = createMemoryStorage();
assert.deepEqual(eceCourse.loadProgress(storage).completedModules, []);
eceCourse.toggleModuleCompletion('ece-m1-foundations', storage);
eceCourse.toggleModuleCompletion('ece-m3-pedagogy', storage);
let saved = eceCourse.loadProgress(storage);
assert.deepEqual(saved.completedModules, ['ece-m1-foundations', 'ece-m3-pedagogy']);
const rawProgress = JSON.parse(storage.getItem('cso_ece_course_progress'));
assert.equal(rawProgress.completedModules.length, 2);
eceCourse.toggleModuleCompletion('ece-m1-foundations', storage);
assert.deepEqual(eceCourse.loadProgress(storage).completedModules, ['ece-m3-pedagogy']);

// 3. Verify quiz scoring & cso_study_mistake_deck auto-sync without duplicates
const mod1 = eceCourse.ECE_MODULES[0];
const correctRes = eceCourse.evaluateQuizAnswer(mod1, mod1.quiz[0].id, mod1.quiz[0].answerIndex, storage);
assert.equal(correctRes.isCorrect, true);
assert.equal(storage.getItem('cso_study_mistake_deck'), null, 'Correct answer must not push to mistake deck');

const wrongIndex = (mod1.quiz[1].answerIndex + 1) % mod1.quiz[1].options.length;
const wrongRes = eceCourse.evaluateQuizAnswer(mod1, mod1.quiz[1].id, wrongIndex, storage);
assert.equal(wrongRes.isCorrect, false);
let deck = JSON.parse(storage.getItem('cso_study_mistake_deck'));
assert.equal(deck.length, 1);
assert.equal(deck[0].id, mod1.quiz[1].id);
assert.ok(deck[0].exam.includes('ECE Module 1'));

// Re-missing same question should not duplicate in mistake deck
eceCourse.evaluateQuizAnswer(mod1, mod1.quiz[1].id, wrongIndex, storage);
deck = JSON.parse(storage.getItem('cso_study_mistake_deck'));
assert.equal(deck.length, 1, 'Mistake deck must deduplicate by question id');

// 4. Verify HTML, Course JSON-LD, sitemap.xml, _seo.js, and Study Library discovery link
const html = fs.readFileSync(path.join(root, 'study-library/early-childhood-education/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'study-library/early-childhood-education/assets/course.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'study-library/early-childhood-education/assets/course.js'), 'utf8');

const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(ldMatch, 'Must contain Course JSON-LD script');
const ldJson = JSON.parse(ldMatch[1]);
assert.equal(ldJson['@type'], 'Course');
assert.equal(ldJson.isAccessibleForFree, true);
assert.equal(ldJson.url, 'https://csodisha.com/study-library/early-childhood-education/');

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('https://csodisha.com/study-library/early-childhood-education/'), 'sitemap.xml must register ECE course hub');

const seoJs = fs.readFileSync(path.join(root, 'functions/api/content/_seo.js'), 'utf8');
assert.ok(seoJs.includes("'/study-library/early-childhood-education/'"), '_seo.js must register ECE course hub');

const studyHtml = fs.readFileSync(path.join(root, 'study-library/index.html'), 'utf8');
assert.ok(studyHtml.includes('/study-library/early-childhood-education/'), 'study-library/index.html must link to ECE course hub');

const studySsr = fs.readFileSync(path.join(root, 'functions/_lib/study-library-ssr.js'), 'utf8');
assert.ok(
  studySsr.includes("pathname.startsWith('/study-library/early-childhood-education/')"),
  'study-library-ssr.js must pass /study-library/early-childhood-education/ through to static assets'
);

// 5. Verify 100% CSP compliance
assert.equal(/<style\b/i.test(html), false, 'Zero inline <style> tags');
assert.equal(/\sstyle="/i.test(html), false, 'Zero inline style="" attributes');
assert.equal(/\sonclick=/i.test(html), false, 'Zero inline onclick= handlers');
const nonLdScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((m) => !/type="application\/ld\+json"/i.test(m[1]));
for (const s of nonLdScripts) {
  assert.equal(s[2].trim(), '', 'Executable scripts must be external with empty body');
}
assert.equal(/innerHTML|insertAdjacentHTML/i.test(js), false, 'Zero innerHTML/insertAdjacentHTML in course.js');
assert.ok(css.includes('min-height: 44px'), '44px touch targets present in course.css');

console.log('test-ece-course-v179: ALL CHECKS PASSED');
