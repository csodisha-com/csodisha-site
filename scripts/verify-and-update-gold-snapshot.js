const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname, '..');
const goldPath = path.join(siteRoot, 'v1.0.0-gold-snapshot.json');

console.log('=== CSO Gold Snapshot Verification (v131, super-store.js retired) ===');
if (!fs.existsSync(goldPath)) {
  console.error('FAIL: v1.0.0-gold-snapshot.json is missing.');
  process.exit(1);
}

const gold = JSON.parse(fs.readFileSync(goldPath, 'utf8'));
if (!gold || typeof gold !== 'object' || !gold.state) {
  console.error('FAIL: v1.0.0-gold-snapshot.json missing .state');
  process.exit(1);
}

console.log('✓ Gold snapshot JSON verified cleanly (keys:', Object.keys(gold.state).length, ').');
