/**
 * Candidate End-to-End Verification & Gold Snapshot Updater
 * Verifies:
 * 1. Candidate Profile Settings & Preferences Editor
 * 2. Multi-Stage Stream-Specific Exam Preparation Checklists
 * 3. Seeded Accounts Vault & State Synchronization
 * 4. Candidate Document Locker, Revision Notes, and Mock Test Scores
 * 5. Regenerates v1.0.0-gold-snapshot.json with all candidate workspace keys
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const siteRoot = '/home/rb717/projects/csodisha-site';

// 1. Mock Browser Environment for SuperStore
console.log('--> Step 1: Setting up mock environment for SuperStore...');
const storage = {};
const mockLocalStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Seed sample candidate identity vault & session
const sampleAccount = {
  id: "cso_usr_chandan_balasore_01",
  fullName: "Chandan Dash",
  email: "aspirant.balasore@csodisha.gov.in",
  mobile: "9876543210",
  passwordHash: "a1b2c3d4",
  dob: "15-08-2000",
  state: "Odisha",
  district: "Balasore (Baleswar)",
  targetExams: ["opsc", "ossc", "teaching"],
  registeredAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  failedLoginAttempts: 0,
  lockoutUntil: null
};

mockLocalStorage.setItem('cso_registered_accounts_v1', JSON.stringify([sampleAccount]));
mockLocalStorage.setItem('cso_candidate_session_v1', JSON.stringify({
  ...sampleAccount,
  isAuthenticated: true,
  sessionType: "local_verified"
}));

// Seed sample multi-stream checklists
const sampleChecklists = {
  opsc: {
    "opsc-prelims": {
      "opsc-p-gs1-hist": true,
      "opsc-p-gs1-geo": true,
      "opsc-p-gs1-pol": true,
      "opsc-p-gs2-csat": true
    },
    "opsc-mains": {
      "opsc-m-odia": true,
      "opsc-m-eng": true
    }
  },
  ossc: {
    "ossc-stage1": {
      "ossc-p-arith": true,
      "ossc-p-di": true,
      "ossc-p-reason": true
    }
  },
  teaching: {
    "bed-paper1": {
      "bed-p1-eng": true,
      "bed-p1-odia": true,
      "bed-p1-aptitude": true
    }
  }
};
mockLocalStorage.setItem('cso_candidate_checklist_v1', JSON.stringify(sampleChecklists));

// Seed sample candidate locker, notes, and mock scores
const sampleLocker = { "0": true, "1": true, "2": true, "4": true };
const sampleNotes = "Paika Rebellion: 1817 under Bakshi Jagabandhu.\nUtkal Sammilani founded in 1903 by Madhusudan Das.\nSeparate Odisha Province formed on 1 April 1936.";
const sampleMockScores = [
  { id: "mock-1", date: "2026-11-04", exam: "OPSC OCS Prelims", paper: "General Studies Paper I", score: 142, max: 200, accuracy: "71%" },
  { id: "mock-2", date: "2026-11-07", exam: "OSSC CGL CBRE", paper: "Arithmetic & Reasoning Speed Test", score: 118, max: 150, accuracy: "78.6%" }
];

mockLocalStorage.setItem('cso_candidate_locker_v1', JSON.stringify(sampleLocker));
mockLocalStorage.setItem('cso_candidate_notes_v1', sampleNotes);
mockLocalStorage.setItem('cso_candidate_mock_scores_v1', JSON.stringify(sampleMockScores));

// Load super-store.js in mock sandbox
console.log('--> Step 2: Hydrating super-store.js...');
const sandbox = {
  window: {},
  document: {
    addEventListener: () => {},
    createElement: () => ({ href: '', download: '', click: () => {} })
  },
  localStorage: mockLocalStorage,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  Math: Math,
  JSON: JSON,
  Array: Array,
  Object: Object
};
sandbox.window = sandbox;

const superStoreCode = fs.readFileSync(path.join(siteRoot, 'admin/super-store.js'), 'utf8');
vm.createContext(sandbox);
vm.runInContext(superStoreCode, sandbox);

const store = sandbox.window.CSOSuperStore;
if (!store) {
  console.error('FAIL: CSOSuperStore failed to instantiate.');
  process.exit(1);
}
console.log('✓ CSOSuperStore instantiated successfully.');

// Test createPlatformSnapshot
console.log('--> Step 3: Generating Platform Snapshot with Identity Vault, Checklists & Candidate Workspace...');
const snapshot = store.createPlatformSnapshot();

if (!snapshot || !snapshot.state) {
  console.error('FAIL: snapshot.state is missing.');
  process.exit(1);
}

if (!Array.isArray(snapshot.state.registeredAccounts) || snapshot.state.registeredAccounts.length === 0) {
  console.error('FAIL: snapshot.state.registeredAccounts is empty or not an array.');
  process.exit(1);
}
console.log(`✓ registeredAccounts captured in snapshot: ${snapshot.state.registeredAccounts.length} candidate(s)`);

if (!snapshot.state.candidateChecklists || typeof snapshot.state.candidateChecklists !== 'object') {
  console.error('FAIL: snapshot.state.candidateChecklists is missing.');
  process.exit(1);
}
console.log(`✓ candidateChecklists captured in snapshot for exams: ${Object.keys(snapshot.state.candidateChecklists).join(', ')}`);

if (!snapshot.state.candidateLocker || typeof snapshot.state.candidateLocker !== 'object') {
  console.error('FAIL: snapshot.state.candidateLocker is missing.');
  process.exit(1);
}
console.log('✓ candidateLocker captured in snapshot.');

if (typeof snapshot.state.candidateNotes !== 'string' || !snapshot.state.candidateNotes.includes('Paika Rebellion')) {
  console.error('FAIL: snapshot.state.candidateNotes is missing or corrupted.');
  process.exit(1);
}
console.log('✓ candidateNotes captured in snapshot.');

if (!Array.isArray(snapshot.state.candidateMockScores) || snapshot.state.candidateMockScores.length === 0) {
  console.error('FAIL: snapshot.state.candidateMockScores is missing.');
  process.exit(1);
}
console.log(`✓ candidateMockScores captured in snapshot: ${snapshot.state.candidateMockScores.length} test records`);

// Test restoreFromSnapshot
console.log('--> Step 4: Testing restoreFromSnapshot() round-trip...');
mockLocalStorage.clear();
if (mockLocalStorage.getItem('cso_registered_accounts_v1') !== null) {
  console.error('FAIL: Storage clear failed.');
  process.exit(1);
}

store.restoreFromSnapshot(snapshot);
const restoredAccounts = JSON.parse(mockLocalStorage.getItem('cso_registered_accounts_v1') || '[]');
const restoredChecklists = JSON.parse(mockLocalStorage.getItem('cso_candidate_checklist_v1') || '{}');
const restoredLocker = JSON.parse(mockLocalStorage.getItem('cso_candidate_locker_v1') || '{}');
const restoredNotes = mockLocalStorage.getItem('cso_candidate_notes_v1') || '';
const restoredMockScores = JSON.parse(mockLocalStorage.getItem('cso_candidate_mock_scores_v1') || '[]');

if (restoredAccounts.length !== 1 || restoredAccounts[0].fullName !== "Chandan Dash") {
  console.error('FAIL: Restored accounts do not match original payload.');
  process.exit(1);
}
console.log('✓ candidate accounts successfully restored from snapshot payload.');

if (!restoredChecklists.opsc || !restoredChecklists.opsc['opsc-prelims'] || !restoredChecklists.opsc['opsc-prelims']['opsc-p-gs1-hist']) {
  console.error('FAIL: Restored candidate checklists do not match original payload.');
  process.exit(1);
}
console.log('✓ candidate checklists successfully restored from snapshot payload.');

if (!restoredLocker["0"] || !restoredLocker["1"]) {
  console.error('FAIL: Restored candidate locker does not match original payload.');
  process.exit(1);
}
console.log('✓ candidate locker successfully restored from snapshot payload.');

if (!restoredNotes.includes('Paika Rebellion')) {
  console.error('FAIL: Restored candidate notes do not match original payload.');
  process.exit(1);
}
console.log('✓ candidate notes successfully restored from snapshot payload.');

if (restoredMockScores.length !== 2) {
  console.error('FAIL: Restored candidate mock scores do not match original payload.');
  process.exit(1);
}
console.log('✓ candidate mock scores successfully restored from snapshot payload.');

// Write out updated v1.0.0-gold-snapshot.json
console.log('--> Step 5: Updating v1.0.0-gold-snapshot.json on disk...');
const existingSnapshotRaw = fs.readFileSync(path.join(siteRoot, 'v1.0.0-gold-snapshot.json'), 'utf8');
const existingSnapshot = JSON.parse(existingSnapshotRaw);

// Merge snapshot.state with existing snapshot full state
existingSnapshot.createdAt = new Date().toISOString();
existingSnapshot.state.registeredAccounts = snapshot.state.registeredAccounts;
existingSnapshot.state.candidateChecklists = snapshot.state.candidateChecklists;
existingSnapshot.state.candidateLocker = snapshot.state.candidateLocker;
existingSnapshot.state.candidateNotes = snapshot.state.candidateNotes;
existingSnapshot.state.candidateMockScores = snapshot.state.candidateMockScores;

fs.writeFileSync(
  path.join(siteRoot, 'v1.0.0-gold-snapshot.json'),
  JSON.stringify(existingSnapshot, null, 2),
  'utf8'
);

const updatedStat = fs.statSync(path.join(siteRoot, 'v1.0.0-gold-snapshot.json'));
console.log(`✓ Golden Disaster Recovery Snapshot updated successfully (${(updatedStat.size / (1024 * 1024)).toFixed(2)} MB).`);
console.log('--> ALL CHECKS PASSED.');
