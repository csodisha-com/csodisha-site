import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const jsPath = 'assets/js/negative-marking-simulator.js';
const src = fs.readFileSync(jsPath, 'utf8');

// 1. Strict CSP static checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');

// 2. Execute in clean sandbox and verify marking presets & break-even math
const sandbox = {
  window: {},
  document: { readyState: 'complete', addEventListener: () => {}, getElementById: () => null },
  console,
  Math
};
vm.runInNewContext(src, sandbox, { filename: jsPath });

const api = sandbox.window.CSONegativeMarkingSimulator;
assert.ok(api, 'window.CSONegativeMarkingSimulator must be exposed');
assert.equal(api.EXAM_PRESETS.length, 5, 'Must expose 5 Odisha/Central exam presets');

// OPSC Prelims (+2.00 / -0.66 => 1/3rd negative => 25% break-even)
const opsc = api.simulateAttemptStrategy({
  presetId: 'opsc-prelims',
  totalQuestions: 100,
  targetCutoff: 92,
  sureCount: 55,
  sureAccuracy: 0.90,
  fiftyCount: 20,
  threeOptCount: 5,
  blindCount: 0
});
assert.equal(opsc.breakEvenPct, 25, 'OPSC +2/-0.66 break-even must be 25%');
assert.ok(opsc.gainFromFifty > 0, '50-50 elimination yields positive expected gain');
assert.ok(opsc.floor10 < opsc.expectedNet && opsc.expectedNet < opsc.ceiling90, '10th < expected < 90th');
assert.equal(opsc.verdictCode, 'safe', 'High sure-shot + 50-50 without blind guesses is safe');
assert.equal(opsc.strategies.length, 3, '3 strategy comparisons returned');

// OSSC / OSSSC / OPRB (+1.00 / -0.25 => 20% break-even)
for (const pid of ['ossc-cglre', 'osssc-district', 'oprb-police']) {
  const res = api.simulateAttemptStrategy({ presetId: pid, sureCount: 30, fiftyCount: 10, threeOptCount: 0, blindCount: 30, targetCutoff: 90 });
  assert.equal(res.breakEvenPct, 20, `${pid} +1/-0.25 break-even must be 20%`);
  assert.equal(res.verdictCode, 'high-risk', `${pid} low expected net triggers high-risk verdict`);
}

// CTET / OTET / OSSTET (+1.00 / 0.00 => 0% break-even, attempt all safely)
const tet = api.simulateAttemptStrategy({ presetId: 'tet-zero-neg', totalQuestions: 150, sureCount: 80, fiftyCount: 20, threeOptCount: 10, blindCount: 10 });
assert.equal(tet.breakEvenPct, 0, 'Zero negative marking has 0% break-even');
assert.equal(tet.verdictCode, 'attempt-all', 'Skipped questions under zero negative triggers attempt-all verdict');

// 3. Verify mounts in mock-tests/index.html & tools/index.html + Quick-Jump registration
for (const htmlPath of ['mock-tests/index.html', 'tools/index.html']) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.includes('id="cso-negative-marking-simulator-root"'), `${htmlPath} mounts #cso-negative-marking-simulator-root`);
  assert.ok(html.includes('/assets/js/negative-marking-simulator.js?v=20261128v457'), `${htmlPath} loads negative-marking-simulator.js v446`);
}

const qj = fs.readFileSync('assets/js/tools-quick-jump-directory.js', 'utf8');
assert.ok(qj.includes("id: 'negative-marking-simulator'") && qj.includes("targetId: 'cso-negative-marking-simulator-root'"), 'Registered in tools-quick-jump-directory.js');

// 4. Verify CSS tokens & SW precache
const css = fs.readFileSync('assets/style.css', 'utf8');
assert.ok(css.includes('.cso-nms-root') && css.includes('.cso-nms-verdict'), 'CSS defines .cso-nms-* styles');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("'/assets/js/negative-marking-simulator.js?v=20261128v457'"), 'sw.js precaches negative-marking-simulator.js');

console.log('PASS: v444 Negative-Marking Risk & Attempt Strategy Simulator suite verified.');
