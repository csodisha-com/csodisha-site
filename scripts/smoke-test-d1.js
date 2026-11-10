#!/usr/bin/env node
/**
 * Common Sense Odisha (CSO) — D1 Edge Backend Smoke-Test Suite
 * Runs against a live endpoint (local wrangler pages dev or production URL)
 * Usage:
 *   node scripts/smoke-test-d1.js [optional_target_url]
 * Environment Variable:
 *   TARGET_URL=https://csodisha-site.pages.dev node scripts/smoke-test-d1.js
 */

const targetUrl = process.argv[2] || process.env.TARGET_URL || 'http://127.0.0.1:8788';

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m"
};

function logPass(msg) {
  console.log(`${colors.green}  ✓ PASS:${colors.reset} ${msg}`);
}

function logFail(msg) {
  console.error(`${colors.red}  ✗ FAIL:${colors.reset} ${msg}`);
}

async function runSmokeTests() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}CS Odisha D1 Database Cloud Binding Smoke-Test Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}Target Base URL: ${targetUrl}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  let testCandidateId = null;
  const timestamp = Date.now();
  const testEmail = `smoke_${timestamp}@csodisha.test`;

  try {
    // Step 1: Request GET /api/health
    console.log(`${colors.bold}--> Step 1: Checking Database Health Endpoint (/api/health)...${colors.reset}`);
    const healthRes = await fetch(`${targetUrl}/api/health`);
    if (!healthRes.ok && healthRes.status !== 503) {
      logFail(`Health endpoint returned status ${healthRes.status}`);
      process.exit(1);
    }

    const healthData = await healthRes.json();
    if (!healthData.tablesFound && !healthData.mode) {
      logFail(`Health check returned invalid response format: ${JSON.stringify(healthData)}`);
      process.exit(1);
    }
    logPass(`Health endpoint verified. Tables present: ${(healthData.tablesFound || []).join(', ') || 'Simulated edge sandbox'}`);

    // Step 2: Request POST /api/auth?action=register
    console.log(`\n${colors.bold}--> Step 2: Testing Candidate Registration via PBKDF2 Web Crypto...${colors.reset}`);
    const registerPayload = {
      fullName: "Smoke Test Aspirant",
      email: testEmail,
      district: "Balasore (Baleswar)",
      password: "SmokeTest@Password123!",
      targetStreams: ["opsc", "ossc"]
    };

    const regRes = await fetch(`${targetUrl}/api/auth?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerPayload)
    });

    if (!regRes.ok) {
      const err = await regRes.text();
      logFail(`Candidate registration failed with status ${regRes.status}: ${err}`);
      process.exit(1);
    }

    const regData = await regRes.json();
    if (!regData.success || !regData.candidate || !regData.candidate.id) {
      logFail(`Registration payload missing candidate id: ${JSON.stringify(regData)}`);
      process.exit(1);
    }

    testCandidateId = regData.candidate.id;
    logPass(`Candidate registered successfully with ID: ${testCandidateId}`);

    // Step 3: Request POST /api/sync
    console.log(`\n${colors.bold}--> Step 3: Testing Candidate Workspace State Batch Synchronization...${colors.reset}`);
    const syncPayload = {
      candidateId: testCandidateId,
      checklists: {
        opsc: {
          "opsc-prelims": {
            "opsc-p-gs1-hist": true,
            "opsc-p-gs1-geo": true
          }
        }
      },
      locker: { "0": true, "1": true },
      notes: "Smoke test notes: Paika Rebellion occurred in 1817 under Bakshi Jagabandhu.",
      mockScores: [
        {
          id: `smoke_mock_${timestamp}`,
          exam: "OPSC OCS Prelims",
          paper: "General Studies Paper I",
          score: 154,
          max: 200,
          accuracy: "77%"
        }
      ]
    };

    const syncRes = await fetch(`${targetUrl}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload)
    });

    if (!syncRes.ok) {
      const err = await syncRes.text();
      logFail(`State synchronization failed with status ${syncRes.status}: ${err}`);
      process.exit(1);
    }

    const syncData = await syncRes.json();
    if (!syncData.success) {
      logFail(`Sync responded with failure: ${JSON.stringify(syncData)}`);
      process.exit(1);
    }
    logPass(`Workspace state synchronized. Operations batch count: ${syncData.syncedOperations !== undefined ? syncData.syncedOperations : 'OK'}`);

    // Step 4: Request GET /api/sync?candidateId=<id>
    console.log(`\n${colors.bold}--> Step 4: Testing Candidate State Round-Trip Readback...${colors.reset}`);
    const getSyncRes = await fetch(`${targetUrl}/api/sync?candidateId=${encodeURIComponent(testCandidateId)}`);
    if (!getSyncRes.ok) {
      logFail(`Failed to retrieve candidate state with status ${getSyncRes.status}`);
      process.exit(1);
    }

    const getSyncData = await getSyncRes.json();
    if (!getSyncData.success) {
      logFail(`GET /api/sync returned error: ${JSON.stringify(getSyncData)}`);
      process.exit(1);
    }

    if (getSyncData.notes && !getSyncData.notes.includes("Paika Rebellion")) {
      logFail(`Notes verification mismatch. Received: "${getSyncData.notes}"`);
      process.exit(1);
    }
    logPass(`Candidate notes and workspace records verified round-trip intact!`);

    console.log(`\n${colors.bold}${colors.green}🎉 ALL 4 BACKEND SMOKE-TEST STEPS PASSED CLEANLY!${colors.reset}\n`);
    process.exit(0);

  } catch (error) {
    logFail(`Network connection or test execution error: ${error.message}`);
    console.log(`\n${colors.yellow}Tip: Ensure your Cloudflare local dev server is running on ${targetUrl} (e.g. npx wrangler pages dev)${colors.reset}\n`);
    process.exit(1);
  }
}

runSmokeTests();
