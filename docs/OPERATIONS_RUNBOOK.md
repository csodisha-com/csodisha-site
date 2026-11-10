# Common Sense Odisha (CSO) — Editorial & Platform Operations Runbook

**Document Version:** 2.0.0 (Production Release)  
**Classification:** Standard Operating Procedures (SOP)  
**Target Audience:** Platform Administrators, Content Editors, DevOps & Incident Responders

---

## 1. Platform Architecture Overview

Common Sense Odisha (CSO) is an open-access public knowledge architecture providing Odisha aspirants and citizens with access to verified government recruitments, welfare benefits, and educational archives.

### 1.1 Architectural Pillars
- **Public Client Runtime:** High-performance, serverless edge-rendered platform with sub-second FCP/LCP, zero external render-blocking dependencies, and offline PWA capability (`sw.js`).
- **SuperStore Unified Engine (`admin/super-store.js`):** A centralized platform data and administration engine orchestrating **11 Super Suites** across 220 active configuration/state modules.
- **Candidate Identity Vault:** Salted, client-side verified authentication state (`cso_registered_accounts_v1`), session persistence (`cso_candidate_session_v1`), cross-directory bookmarks (`cso_candidate_bookmarks_v1`), and multi-stream examination syllabus checklists (`cso_candidate_checklist_v1`).
- **Edge Deployment Architecture:** Cloudflare Pages with custom edge cache policies (`_headers`), canonical redirects (`_redirects`), and Cloudflare R2 object storage for PDF syllabi and previous years' questions (PYQ).

---

## 2. Content Editorial Workflow

Content editors manage official recruitment notices, welfare schemes, and study materials through the Admin Studio (`/admin/`) or authenticated local authoring sessions.

### 2.1 Standard Content Publication Lifecycle
```
[Draft Notification] ➔ [Editorial Verification] ➔ [SuperStore Mutation] ➔ [Edge Cache Purge] ➔ [Public Broadcast]
```

1. **Drafting Content:**
   - Verify official gazette notifications directly from departmental portals:
     - **OPSC:** `opsc.gov.in`
     - **OSSC:** `ossc.gov.in`
     - **OSSSC:** `osssc.gov.in`
     - **SAMS Odisha:** `samsodisha.gov.in`
   - Capture essential metadata: Post Title, Advt No., Total Vacancies, Age Range, Educational Eligibility, Online Registration Window, Application Fees, and Selection Stages.

2. **Bilingual Odia/English Formatting Standard:**
   - All notifications and schemes must feature parallel Odia and English headlines and summaries:
     - **English:** `OSSC Combined Graduate Level (CGL) Specialist Recruitment 2026`
     - **Odia:** `ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ ନିଯୁକ୍ତି ୨୦୨୬`
   - Use clean Unicode Odia characters without broken ligatures or proprietary font encodings.

3. **Publishing to Platform Tree:**
   - Access the relevant module under **Jobs & Careers Suite** (`folder-01`) or **Schemes & Benefits Suite** (`folder-02`) in `/admin/`.
   - Update the recursive JSON state node and click **Save & Publish**.
   - If an urgent statewide alert is needed, broadcast via **Communications, Alerts & Notifications Suite** (`folder-11`) to populate `#cso-broadcast-banner`.

---

## 3. Cloudflare R2 Document Mirroring SOP

All public PDF assets (official commission notices, syllabus PDFs, and PYQ collections) are stored on Cloudflare R2 object storage with global edge CDN distribution to eliminate bandwidth costs and prevent upstream portal crashes.

### 3.1 R2 Bucket Structure & URL Schema
Assets are stored within the `cso-public-assets` R2 bucket following the standardized hierarchy:

```
https://assets.csodisha.org/pdf/{category}/{year}/{slug}.pdf
```

- **Recruitment Notices:** `https://assets.csodisha.org/pdf/jobs/2026/opsc-ocs-advt-04-2026.pdf`
- **Official Syllabi:** `https://assets.csodisha.org/pdf/syllabus/2026/ossc-cgl-syllabus-detailed.pdf`
- **PYQ Compilations:** `https://assets.csodisha.org/pdf/pyq/2025/opsc-ocs-prelims-gs1-solved.pdf`
- **Welfare Guidelines:** `https://assets.csodisha.org/pdf/schemes/2026/subhadra-guidelines-revised.pdf`

### 3.2 Upload & Mirroring Procedure
1. **Compress PDF:** Verify document is clean, readable, and under 15 MB using standard PDF compression (`qpdf` or Adobe Acrobat).
2. **Compute SHA-256 Checksum:** Record document hash for data integrity verification:
   ```bash
   sha256sum document.pdf
   ```
3. **Upload to R2:**
   - Via Cloudflare Dashboard: Navigate to **R2 > cso-public-assets > Upload**.
   - Via Wrangler CLI:
     ```bash
     npx wrangler r2 object put cso-public-assets/pdf/jobs/2026/opsc-ocs-advt.pdf --file=./opsc-ocs-advt.pdf
     ```
4. **Link Verification:** Ensure the asset link is embedded into `cso_study_recursive_tree_v1` or the corresponding job post node.

---

## 4. Disaster Recovery & Rollback Playbook

The platform maintains full point-in-time recovery capabilities, automated snapshot generation, and cold-storage restoration.

### 4.1 Exporting Periodic Snapshots
1. In `/admin/`, navigate to **Operations, Backups & Disaster Recovery Suite** (`folder-17`).
2. Click **Create Comprehensive Snapshot** (or trigger `CSOSuperStore.createPlatformSnapshot()` via developer console).
3. The generated JSON bundle (~18 MB) encapsulates:
   - All 220 administrative configuration modules.
   - Candidate Identity Vault (`cso_registered_accounts_v1`).
   - Preparation checklists and milestone mappings (`cso_candidate_checklist_v1`).
4. Store the exported snapshot in the air-gapped cold-storage repository or git-tracked golden file (`v1.0.0-gold-snapshot.json`).

### 4.2 Point-in-Time Single-Engine State Rollbacks
If a bad mutation or corrupted publication occurs in an isolated module (e.g., corrupted syllabus node):
1. In `/admin/`, open the affected suite's **Revision History & Rollback** panel.
2. Select the desired historical revision timestamp.
3. Click **Rollback Engine State**. The SuperStore will rollback only the targeted state tree while keeping all other 10 suites intact.

### 4.3 Complete Cold-Storage Restoration
To restore the entire platform from `v1.0.0-gold-snapshot.json`:
1. **Automated Verification:**
   ```bash
   node scripts/verify-and-update-gold-snapshot.js
   ```
2. **Browser Execution:**
   - Open `/admin/` in an authorized session.
   - Upload `v1.0.0-gold-snapshot.json` under **Disaster Recovery > Restore Platform State**.
   - Confirm cryptographic checksum and click **Execute Restoration**.
   - SuperStore unpacks and hydrates all 220 state trees into local storage and triggers visual confirmation.

---

## 5. Continuous Integration & Edge Verification Run

Prior to committing or merging changes to `main`:
1. **Run Syntax Validation:**
   ```bash
   node -c assets/js/*.js && node -c admin/*.js && node -c sw.js
   ```
2. **Run Site-Wide Link & Asset Integrity Audit:**
   ```bash
   node scripts/audit-links.js
   ```
3. **Run Candidate E2E & PWA Smoke Tests:**
   ```bash
   node scripts/verify-candidate-e2e.js
   ```
4. **Run Snapshot Round-Trip Verification:**
   ```bash
   node scripts/verify-and-update-gold-snapshot.js
   ```

All test suites must exit with code `0`.
