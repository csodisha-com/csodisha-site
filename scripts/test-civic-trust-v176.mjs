// v176: Civic Trust (WhatsApp & .gov.in Scam-Check) & Voice Search (EN + Odia) Verification.
// Usage: node scripts/test-civic-trust-v176.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const scam = require(path.join(root, 'tools/assets/tools.js'));
const voice = require(path.join(root, 'assets/js/voice-search.js'));
const toolsJs = read('tools/assets/tools.js');
const toolsCss = read('tools/assets/tools.css');
const toolsHtml = read('tools/index.html');
const voiceJs = read('assets/js/voice-search.js');
const styleCss = read('assets/style.css');
const aboutHtml = read('about/index.html');

// 1. Scam-Check URL parser & WhatsApp forward analyzer
const rGov = scam.analyzeScamInput('https://opsc.gov.in/Public/OPSC/Default.aspx');
ok(rGov.verdict === 'official' && rGov.badge.includes('Official Govt Domain'), 'Passes real .gov.in URL');

const rNic = scam.analyzeScamInput('Apply on https://scholarship.odisha.gov.in or https://nta.ac.in');
ok(rNic.verdict === 'official' && rNic.urls.length === 2, 'Passes multiple official .gov.in / .ac.in URLs');

const rSpoof = scam.analyzeScamInput('https://odisha.gov.in.evil.com/apply');
ok(rSpoof.verdict === 'suspicious' && !scam.isOfficialGovHost('odisha.gov.in.evil.com'), 'Rejects spoofed subdomain odisha.gov.in.evil.com');

const rShort = scam.analyzeScamInput('Urgent last chance! Click https://bit.ly/free-odisha-job and forward to 10 groups!');
ok(rShort.verdict === 'suspicious' && rShort.reasons.some(r => r.includes('URL shortener')) && rShort.reasons.some(r => r.includes('Scam phrase')),
  'Flags URL shortener and WhatsApp scam phrases');

const rHttp = scam.analyzeScamInput('http://ossc.gov.in/');
ok(rHttp.verdict === 'suspicious' && rHttp.reasons.some(r => r.includes('http://')), 'Flags insecure http:// URL');

const rPlain = scam.analyzeScamInput('Congratulations! You won a free scheme.');
ok(rPlain.verdict === 'warn' && rPlain.urls.length === 0, 'Handles plain text without URLs safely');

// 2. Voice Search (EN + Odia)
ok(voiceJs.includes('SpeechRecognition') && voiceJs.includes('webkitSpeechRecognition'), 'Checks SpeechRecognition || webkitSpeechRecognition');
const mockStoreEn = { getItem: () => 'en' };
const mockStoreOr = { getItem: (k) => (k === 'cso_lang_pref' ? 'or' : null) };
ok(voice.resolveSpeechLang(mockStoreEn) === 'en-IN', 'Defaults to en-IN');
ok(voice.resolveSpeechLang(mockStoreOr) === 'or-IN', 'Switches to or-IN for Odia');
ok(voiceJs.includes("addEventListener('click'") && voiceJs.includes("addEventListener('result'"), 'Uses CSP-compliant addEventListener');
ok(/\.cso-voice-btn[\s\S]*?min-height:\s*44px/.test(styleCss), 'Voice button enforces 44px mobile touch target');

// 3. /about/ cross-link to /tools/#scam-checker & 100% CSP compliance
ok(aboutHtml.includes('href="/tools/#scam-checker"'), 'about/index.html links cleanly to /tools/#scam-checker');
ok(toolsHtml.includes('id="scam-checker"') && toolsHtml.includes('id="scam-check-btn"') && toolsHtml.includes('id="scam-clear-btn"'), 'tools/index.html renders Scam-Check UI');

for (const [rel, html] of [
  ['tools/index.html', toolsHtml],
  ['about/index.html', aboutHtml],
  ['index.html', read('index.html')],
  ['jobs-careers/index.html', read('jobs-careers/index.html')],
  ['schemes/index.html', read('schemes/index.html')],
  ['study-library/index.html', read('study-library/index.html')],
  ['community/index.html', read('community/index.html')]
]) {
  ok(!/<style[\s>]/i.test(html), `${rel}: zero inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${rel}: zero style="" attributes`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${rel}: zero inline event handlers`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${rel}: zero executable inline <script>`);
  }
  if (rel !== 'tools/index.html') {
    ok(html.includes('/assets/js/voice-search.js?v=20261121v176'), `${rel}: loads voice-search.js v176`);
  }
}

for (const [rel, src] of [['tools/assets/tools.js', toolsJs], ['assets/js/voice-search.js', voiceJs]]) {
  ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(src), `${rel}: zero innerHTML sinks`);
  ok(!/\bonclick\s*=/.test(src), `${rel}: zero onclick=`);
}

// 4. Asset & Cache bumps (v176)
ok(toolsHtml.includes('/tools/assets/tools.css?v=20261121v176') && toolsHtml.includes('/tools/assets/tools.js?v=20261121v176'), 'tools/index.html references v176 assets');
ok(read('functions/_lib/ssr-shell.js').includes('/assets/js/voice-search.js?v=20261121v176'), 'ssr-shell.js loads voice-search.js v176');
ok(toolsCss.includes('.cso-scam-badge'), 'tools.css includes scam-check badge styles');
ok(/CACHE_NAME = 'cso-candidate-cache-v176'/.test(read('sw.js')), 'sw.js bumped to v176');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v176'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v176');
ok(/cso-candidate-cache-v176/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v176');

console.log(`test-civic-trust-v176: ${passed} assertions passed`);
