#!/usr/bin/env node
/**
 * Idempotent D1 Seeder for About CSO Directory (`about_directory_nodes`).
 * Extracts all groups, sections, and entries from about/generated/directory.json,
 * enriches bilingual Odia (_or) metadata, authoritative Mission & Purpose copy,
 * and authentic platform milestones, and upserts cleanly into D1.
 *
 * Usage:
 *   node scripts/seed-about-d1.mjs --local
 *   NODE_OPTIONS="--dns-result-order=ipv4first" node scripts/seed-about-d1.mjs --remote
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const dryRun = args.includes('--dry-run');
const modeFlag = isRemote ? '--remote' : '--local';

function sqlStr(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.trunc(n)) : '0';
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function runWranglerD1(sqlOrFile, isFile = false) {
  const cmdArgs = ['wrangler', 'd1', 'execute', 'cso-database', modeFlag];
  if (isRemote) cmdArgs.push('--yes');
  if (isFile) cmdArgs.push('--file', sqlOrFile);
  else cmdArgs.push('--command', sqlOrFile, '--json');
  const env = { ...process.env };
  if (isRemote && !env.NODE_OPTIONS) {
    env.NODE_OPTIONS = '--dns-result-order=ipv4first';
  }
  return execFileSync('npx', cmdArgs, {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

// Authoritative bilingual overrides & official links keyed by directory number or slug
const GROUP_META = {
  '01': {
    slug: 'about-cso',
    icon: '🧭',
    title_or: 'CSO ବିଷୟରେ',
    subtitle: 'Mission, purpose, non-government charter, and authentic platform evolution',
    subtitle_or: 'ଲକ୍ଷ୍ୟ, ଉଦ୍ଦେଶ୍ୟ, ଅଣ-ସରକାରୀ ଚାର୍ଟର ଏବଂ ପ୍ଲାଟଫର୍ମ ବିକାଶ',
    badge: 'Core Charter'
  },
  '02': {
    slug: 'our-approach',
    icon: '📐',
    title_or: 'ଆମର ପଦ୍ଧତି',
    subtitle: 'Bilingual clarity, offline-first PWA workspace, and 3-step editorial verification',
    subtitle_or: 'ଦ୍ୱିଭାଷୀ ସ୍ପଷ୍ଟତା, ଅଫଲାଇନ୍ PWA ଓ ୩-ସ୍ତରୀୟ ଯାଞ୍ଚ',
    badge: 'Methodology'
  },
  '03': {
    slug: 'trust-and-transparency',
    icon: '🛡️',
    title_or: 'ବିଶ୍ୱାସ ଓ ସ୍ୱଚ୍ଛତା',
    subtitle: 'Official .gov.in verification badges, anti-scam URL rules, and public corrections archive',
    subtitle_or: 'ସରକାରୀ .gov.in ଯାଞ୍ଚ, ଠକେଇ ପ୍ରତିରୋଧ ଓ ସଂଶୋଧନ ଲଗ୍',
    badge: 'Trust Layer'
  },
  '04': {
    slug: 'team-and-community',
    icon: '🤝',
    title_or: 'ଦଳ ଓ ସମ୍ପ୍ରଦାୟ',
    subtitle: 'Founder stewardship, syllabus researchers, subject reviewers, and 30-district reach',
    subtitle_or: 'ପ୍ରତିଷ୍ଠାତା ନେତୃତ୍ୱ, ଗବେଷକ ଏବଂ ୩୦ ଜିଲ୍ଲାର ଛାତ୍ରଛାତ୍ରୀ',
    badge: 'People & Reach'
  },
  '05': {
    slug: 'policies-and-standards',
    icon: '⚖️',
    title_or: 'ନୀତି ଓ ମାନଦଣ୍ଡ',
    subtitle: 'DPDP Act 2023 alignment, zero ad-tech surveillance, open educational fair use',
    subtitle_or: 'DPDP ଆଇନ ୨୦୨୩, ଶୂନ୍ୟ ବିଜ୍ଞାପନ ଟ୍ରାକିଂ ଓ ଖୋଲା ଶିକ୍ଷା ନୀତି',
    badge: 'Governance'
  },
  '06': {
    slug: 'contact-and-faqs',
    icon: '✉️',
    title_or: 'ଯୋଗାଯୋଗ ଓ ପ୍ରଶ୍ନୋତ୍ତର',
    subtitle: 'Editorial desk helplines, public error reports, and institutional collaboration',
    subtitle_or: 'ସମ୍ପାଦକୀୟ ସହାୟତା, ତ୍ରୁଟି ସୂଚନା ଏବଂ ଅନୁଷ୍ଠାନିକ ସହଯୋଗ',
    badge: 'Support Desk'
  }
};

const SECTION_OR = {
  '1.1': {
    title_or: 'ଲକ୍ଷ୍ୟ, ଦୃଷ୍ଟିକୋଣ ଓ ସାର୍ବଜନୀନ ପ୍ରତିବଦ୍ଧତା',
    subtitle: 'Why Common Sense Odisha exists across all 30 districts',
    subtitle_or: 'ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲାରେ କାହିଁକି Common Sense Odisha କାର୍ଯ୍ୟ କରେ'
  },
  '1.2': {
    title_or: 'ପ୍ଲାଟଫର୍ମ ଯାତ୍ରା ଓ ମାଇଲଖୁଣ୍ଟ',
    subtitle: 'Taxonomy, Candidate Hub PWA, and editorial architecture',
    subtitle_or: 'ପରୀକ୍ଷା ବର୍ଗୀକରଣ, ଛାତ୍ର ହବ୍ PWA ଏବଂ ସମ୍ପାଦକୀୟ ଗଠନ'
  },
  '2.1': {
    title_or: 'ଶିକ୍ଷାର୍ଥୀ-କୈନ୍ଦ୍ରିକ ଜ୍ଞାନ ସଂରଚନା',
    subtitle: 'Bilingual design built for fast, low-bandwidth mobile access',
    subtitle_or: 'କମ୍ ଇଣ୍ଟରନେଟ୍ ଓ ମୋବାଇଲ୍ ଉପଯୋଗୀ ଦ୍ୱିଭାଷୀ ଡିଜାଇନ୍'
  },
  '2.2': {
    title_or: 'ଇଣ୍ଟରାକ୍ଟିଭ୍ ଉପକରଣ ଓ ନିର୍ଣ୍ଣୟ ସହାୟତା',
    subtitle: 'Eligibility simulators, calculators, and zero-tracking global search',
    subtitle_or: 'ଯୋଗ୍ୟତା ସିମୁଲେଟର୍, କ୍ୟାଲକୁଲେଟର୍ ଓ ସନ୍ଧାନ ବ୍ୟବସ୍ଥା'
  },
  '3.1': {
    title_or: 'CSO ବିଶ୍ୱାସ ସ୍ତର ମାନଦଣ୍ଡ',
    subtitle: 'Strict separation between official notices and editorial study notes',
    subtitle_or: 'ସରକାରୀ ବିଜ୍ଞପ୍ତି ଏବଂ ସମ୍ପାଦକୀୟ ନୋଟ୍ସ ମଧ୍ୟରେ ସ୍ପଷ୍ଟ ପାର୍ଥକ୍ୟ'
  },
  '3.2': {
    title_or: 'ସଂଶୋଧନ ଓ ସମ୍ପାଦକୀୟ ଉତ୍ତରଦାୟିତ୍ୱ',
    subtitle: 'Citizen error reporting and live correction ledger',
    subtitle_or: 'ନାଗରିକ ତ୍ରୁଟି ସୂଚନା ଏବଂ ସାର୍ବଜନୀନ ସଂଶୋଧନ ତାଲିକା'
  },
  '4.1': {
    title_or: 'ସମ୍ପାଦକୀୟ ଓ ଗବେଷଣା ଦଳ',
    subtitle: 'Exam taxonomy analysts and public policy reviewers',
    subtitle_or: 'ପରୀକ୍ଷା ପାଠ୍ୟକ୍ରମ ବିଶ୍ଳେଷକ ଏବଂ ଯୋଜନା ସମୀକ୍ଷକ'
  },
  '4.2': {
    title_or: 'ସମ୍ପ୍ରଦାୟ ଯୋଗଦାନକାରୀ ଓ ସ୍ୱେଚ୍ଛାସେବୀ',
    subtitle: 'Faculty reviewers and district student ambassadors',
    subtitle_or: 'ଅଧ୍ୟାପକ ସମୀକ୍ଷକ ଏବଂ ଜିଲ୍ଲା ସ୍ତରୀୟ ଛାତ୍ର ପ୍ରତିନିଧି'
  },
  '5.1': {
    title_or: 'ଆଇନଗତ ଓ ପରିଚାଳନା ନୀତି',
    subtitle: 'DPDP 2023 privacy charter and fair academic access',
    subtitle_or: 'DPDP ୨୦୨୩ ଗୋପନୀୟତା ନୀତି ଏବଂ ନିରପେକ୍ଷ ପ୍ରବେଶ'
  },
  '5.2': {
    title_or: 'ବୌଦ୍ଧିକ ସମ୍ପତ୍ତି ଓ ଅସ୍ୱୀକୃତି',
    subtitle: 'Open-access CC BY-NC-SA notes & non-government status',
    subtitle_or: 'ଖୋଲା ଶିକ୍ଷା ଲାଇସେନ୍ସ ଏବଂ ଅଣ-ସରକାରୀ ଘୋଷଣା'
  },
  '6.1': {
    title_or: 'ସାଧାରଣ ପ୍ରଶ୍ନୋତ୍ତର (FAQs)',
    subtitle: 'Quick answers for Odisha students and aspirants',
    subtitle_or: 'ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ସାଧାରଣ ପ୍ରଶ୍ନୋତ୍ତର'
  },
  '6.2': {
    title_or: 'ଯୋଗାଯୋଗ ଓ ସହାୟତା ମାଧ୍ୟମ',
    subtitle: 'Direct channels for corrections, colleges, and civic outreach',
    subtitle_or: 'ସଂଶୋଧନ, ଶିକ୍ଷାନୁଷ୍ଠାନ ଓ ନାଗରିକ ସହଯୋଗ ପାଇଁ ଯୋଗାଯୋଗ'
  }
};

const ENTRY_OVERRIDES = {
  '1.1.1': {
    title: 'Mission & Core Purpose — Be Self-Reliant | Build a Better Tomorrow',
    title_or: 'ମୂଳ ଲକ୍ଷ୍ୟ — ଆତ୍ମନିର୍ଭର ହୁଅନ୍ତୁ | ଉନ୍ନତ ଭବିଷ୍ୟତ ଗଢ଼ନ୍ତୁ',
    subtitle: 'Authoritative Public Mission Charter',
    subtitle_or: 'ମୂଳ ସାର୍ବଜନୀନ ମିଶନ ଚାର୍ଟର',
    body_text:
      'Be Self-Reliant | Build a Better Tomorrow. Common Sense Odisha (CSO) empowers students, job aspirants, and citizens across all 30 Odisha districts with verified government job notices, bilingual Odisha + National mock tests, official syllabus & PYQ archives, and actionable welfare scheme guides — completely free and free from ad-tech tracking.',
    body_text_or:
      'ଆତ୍ମନିର୍ଭର ହୁଅନ୍ତୁ | ଏକ ଉନ୍ନତ ଭବିଷ୍ୟତ ଗଢ଼ନ୍ତୁ। Common Sense Odisha (CSO) ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲାର ଛାତ୍ରଛାତ୍ରୀ, ନିଯୁକ୍ତି ଆଶାୟୀ ଏବଂ ନାଗରିକମାନଙ୍କୁ ଯାଞ୍ଚ ହୋଇଥିବା ସରକାରୀ ଚାକିରି ବିଜ୍ଞପ୍ତି, ଦ୍ୱିଭାଷୀ ମକ୍ ଟେଷ୍ଟ, ସିଲାବସ୍, PYQ ଏବଂ ସରକାରୀ ଯୋଜନା ତଥ୍ୟ ସମ୍ପୂର୍ଣ୍ଣ ମାଗଣାରେ ପ୍ରଦାନ କରେ।',
    badge_text: 'Mission',
    icon_name: '🎯',
    official_url: '/about/#mission-charter'
  },
  '1.1.2': {
    title: 'Independent, Zero-Cost & Ad-Free Civic Guarantee',
    title_or: 'ସ୍ୱାଧୀନ, ନିଃଶୁଳ୍କ ଏବଂ ବିଜ୍ଞାପନ-ମୁକ୍ତ ନାଗରିକ ଗ୍ୟାରେଣ୍ଟି',
    subtitle: 'Open Access Forever',
    subtitle_or: 'ସର୍ବଦା ଖୋଲା ଓ ମାଗଣା',
    body_text:
      'Every syllabus guide, recruitment tracker, current affairs digest, mock test, and student dashboard utility remains open-access at zero fee. CSO rejects paywalls, intrusive popup ads, and speculative coaching clickbait.',
    body_text_or:
      'ପ୍ରତ୍ୟେକ ପାଠ୍ୟକ୍ରମ, ନିଯୁକ୍ତି ସୂଚନା, ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ, ମକ୍ ଟେଷ୍ଟ ଏବଂ ଛାତ୍ର ଡ୍ୟାସବୋର୍ଡ୍ ସୁବିଧା ସମ୍ପୂର୍ଣ୍ଣ ମାଗଣା ଅଟେ।',
    badge_text: 'Zero Fee',
    icon_name: '🌿',
    official_url: '/about/#policies-standards'
  },
  '1.2.1': {
    title: '44+ Exam Taxonomy & Unified Public Directory',
    title_or: '୪୪+ ପରୀକ୍ଷା ବର୍ଗୀକରଣ ଏବଂ ଏକୀକୃତ ସାର୍ବଜନୀନ ଡିରେକ୍ଟୋରୀ',
    subtitle: 'Platform Milestone — Structured Curriculum Index',
    subtitle_or: 'ପ୍ଲାଟଫର୍ମ ମାଇଲଖୁଣ୍ଟ — ସଂଗଠିତ ପରୀକ୍ଷା ସୂଚୀ',
    body_text:
      'Built a unified exam taxonomy bridging OPSC (OAS/OJS), OSSC (CGL/Combined Tech), OSSSC (RI/ARI/Amin/ICDS/PEO), Odisha Police, LTR/OSSTET/OTET, UPSC, SSC, Banking, and Railways into linked job alerts, mock tests, and PYQs.',
    body_text_or:
      'OPSC, OSSC, OSSSC, ଓଡ଼ିଶା ପୋଲିସ୍, ଶିକ୍ଷକ ନିଯୁକ୍ତି ଏବଂ ଜାତୀୟ ସ୍ତରୀୟ ପରୀକ୍ଷାଗୁଡ଼ିକୁ ଗୋଟିଏ ଏକୀକୃତ ସୂଚୀରେ ସଂଯୋଗ କରାଯାଇଛି।',
    badge_text: 'Milestone 1',
    icon_name: '🗂️',
    official_url: '/resources/'
  },
  '1.2.2': {
    title: 'Offline-First Candidate Hub (D1 + PWA) & DPDP 2023 Governance',
    title_or: 'ଅଫଲାଇନ୍ Candidate Hub (D1 + PWA) ଏବଂ DPDP ୨୦୨୩ ନୀତି',
    subtitle: 'Platform Milestone — Privacy-First Edge Architecture',
    subtitle_or: 'ପ୍ଲାଟଫର୍ମ ମାଇଲଖୁଣ୍ଟ — ଗୋପନୀୟତା-କୈନ୍ଦ୍ରିକ PWA',
    body_text:
      'Deployed Cloudflare Workers + D1 persistence, strict Content-Security-Policy (CSP) headers, IndexedDB offline bookmarks/flashcards/spaced repetition, and DPDP Act 2023 compliant minimal student data storage.',
    body_text_or:
      'Cloudflare D1 ଡାଟାବେସ୍, କଠୋର CSP ସୁରକ୍ଷା, ଅଫଲାଇନ୍ IndexedDB ଫ୍ଲାସକାର୍ଡ ଏବଂ DPDP ୨୦୨୩ ନିୟମ ଅନୁଯାୟୀ ଡାଟା ସୁରକ୍ଷା କାର୍ଯ୍ୟକାରୀ ହୋଇଛି।',
    badge_text: 'Milestone 2',
    icon_name: '⚡',
    official_url: '/student-dashboard/'
  },
  '2.1.1': {
    title: 'Bilingual Clarity & Rural Bandwidth Accessibility',
    title_or: 'ଦ୍ୱିଭାଷୀ ସ୍ପଷ୍ଟତା ଓ ଗ୍ରାମୀଣ ନେଟୱର୍କ ଅନୁକୂଳତା',
    subtitle: 'English + ଓଡ଼ିଆ Toggle & A11y Modes',
    subtitle_or: 'ଇଂରାଜୀ + ଓଡ଼ିଆ ଏବଂ ସୁଗମତା ମୋଡ୍',
    body_text_or: 'ଓଡ଼ିଆ ଓ ଇଂରାଜୀରେ ସହଜ ପାଠ୍ୟ, ବଡ଼ ଅକ୍ଷର, ହାଇ-କଣ୍ଟ୍ରାଷ୍ଟ ଏବଂ ଲାଇଟ୍-ଡାଟା ମୋଡ୍ ଉପଲବ୍ଧ।',
    official_url: '/about/#accessibility'
  },
  '2.1.2': {
    title: 'Structured Directory & Zero-Clutter Information Design',
    title_or: 'ସଂଗଠିତ ଡିରେକ୍ଟୋରୀ ଓ ସ୍ୱଚ୍ଛ ତଥ୍ୟ ଉପସ୍ଥାପନା',
    subtitle: 'Actionable Facts Over Clickbait',
    subtitle_or: 'ତଥ୍ୟଭିତ୍ତିକ ସଂକ୍ଷିପ୍ତ ବିବରଣୀ',
    body_text_or: 'ବିଭ୍ରାନ୍ତିକର ଶିରୋନାମା ପରିବର୍ତ୍ତେ ଯୋଗ୍ୟତା, ଶେଷ ତାରିଖ, ବୟସ ସୀମା ଓ ସରକାରୀ ଲିଙ୍କ୍ ସିଧାସଳଖ ଦିଆଯାଏ।',
    official_url: '/jobs-careers/'
  },
  '2.2.1': {
    title: 'Odisha Exam Age, Category & Attempt Eligibility Simulator',
    title_or: 'ଓଡ଼ିଶା ପରୀକ୍ଷା ବୟସ, ବର୍ଗ ଓ ଯୋଗ୍ୟତା ସିମୁଲେଟର୍',
    subtitle: 'Candidate Utility Suite',
    subtitle_or: 'ପରୀକ୍ଷାର୍ଥୀ ଉପକରଣ',
    body_text_or: 'OPSC, OSSC, OSSSC ଓ ଓଡ଼ିଶା ପୋଲିସ୍ ପାଇଁ ବୟସ ସୀମା ଛାଡ଼, ଯୋଗ୍ୟତା ଓ ପ୍ରୟାସ ସଂଖ୍ୟା ହିସାବ କରନ୍ତୁ।',
    official_url: '/student-dashboard/#tool-calculator'
  },
  '2.2.2': {
    title: 'Unified Multi-Table Global Search (Ctrl+K) Without Ad Tracking',
    title_or: 'ବିନା ଟ୍ରାକିଂରେ ଏକୀକୃତ ଗ୍ଲୋବାଲ୍ ସନ୍ଧାନ (Ctrl+K)',
    subtitle: 'Zero-Surveillance Discovery',
    subtitle_or: 'ଶୂନ୍ୟ ଟ୍ରାକିଂ ସନ୍ଧାନ',
    body_text_or: 'ଚାକିରି, ଯୋଜନା, ମକ୍ ଟେଷ୍ଟ, ପାଠ୍ୟକ୍ରମ ଓ About ତଥ୍ୟ ଗୋଟିଏ ସନ୍ଧାନରେ ପାଆନ୍ତୁ।',
    official_url: '/about/#directory-explorer'
  },
  '3.1.1': {
    title: 'Verified .gov.in / .nic.in Badges & Source Attribution',
    title_or: 'ଯାଞ୍ଚ ହୋଇଥିବା .gov.in / .nic.in ବ୍ୟାଜ୍ ଏବଂ ମୂଳ ସୂତ୍ର',
    subtitle: 'Primary Gazette & Commission Links',
    subtitle_or: 'ସରକାରୀ ଗେଜେଟ୍ ଓ ଆୟୋଗ ଲିଙ୍କ୍',
    body_text_or: 'ପ୍ରତ୍ୟେକ ବିଜ୍ଞପ୍ତି ସହିତ opsc.gov.in, ossc.gov.in, osssc.gov.in ବା odisha.gov.in ର ମୂଳ ଲିଙ୍କ୍ ଦିଆଯାଏ।',
    official_url: '/about/#portal-verifier'
  },
  '3.1.2': {
    title: '3-Step Editorial Verification & Deadline Audits',
    title_or: '୩-ସ୍ତରୀୟ ସମ୍ପାଦକୀୟ ଯାଞ୍ଚ ଓ ଶେଷ ତାରିଖ ଅଡିଟ୍',
    subtitle: 'Extract → Cross-Verify → Timestamp',
    subtitle_or: 'ସଂଗ୍ରହ → ପୁନଃଯାଞ୍ଚ → ସମୟ ଚିହ୍ନଟ',
    body_text_or: 'ସରକାରୀ PDF ରୁ ତଥ୍ୟ ସଂଗ୍ରହ କରି ଶେଷ ତାରିଖ ଓ ସଂଶୋଧନଗୁଡ଼ିକୁ ନିୟମିତ ଯାଞ୍ଚ କରାଯାଏ।',
    official_url: '/about/#editorial-policy'
  },
  '3.2.1': {
    title: 'Public Error Reporting & Citizen Correction Desk',
    title_or: 'ସାର୍ବଜନୀନ ତ୍ରୁଟି ସୂଚନା ଏବଂ ସଂଶୋଧନ ଡେସ୍କ',
    subtitle: 'Evidence-Backed Review within 24 Hours',
    subtitle_or: '୨୪ ଘଣ୍ଟା ମଧ୍ୟରେ ପ୍ରମାଣଭିତ୍ତିକ ସମୀକ୍ଷା',
    body_text_or: 'ଯେକୌଣସି ତ୍ରୁଟି ବା ଭୁଲ୍ ଲିଙ୍କ୍ Report an Error ମାଧ୍ୟମରେ ସିଧାସଳଖ ଜଣାଇପାରିବେ।',
    official_url: '/support/#report-error'
  },
  '3.2.2': {
    title: 'Public Changelog & Resolved Feedback Transparency Ledger',
    title_or: 'ସାର୍ବଜନୀନ ପରିବର୍ତ୍ତନ ଲଗ୍ ଏବଂ ସମାଧାନ ତାଲିକା',
    subtitle: 'D1-Backed Release & Correction History',
    subtitle_or: 'D1-ଆଧାରିତ ଅପଡେଟ୍ ଓ ସଂଶୋଧନ ଇତିହାସ',
    body_text_or: 'ସମ୍ପାଦକୀୟ ସଂଶୋଧନ ଓ ନୂତନ ପ୍ଲାଟଫର୍ମ ଅପଡେଟ୍ ଏଠାରେ ସ୍ୱଚ୍ଛ ଭାବେ ପ୍ରକାଶିତ ହୁଏ।',
    official_url: '/about/#changelog-ledger'
  },
  '4.1.1': {
    title: 'Education, Syllabus & Examination Researchers',
    title_or: 'ଶିକ୍ଷା, ପାଠ୍ୟକ୍ରମ ଏବଂ ପରୀକ୍ଷା ଗବେଷକ ଦଳ',
    subtitle: 'Odisha State & Central Exam Analysts',
    subtitle_or: 'ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା ବିଶ୍ଳେଷକ',
    body_text_or: 'OPSC, OSSC, OSSSC, OAVS, UPSC ଓ SSC ପରୀକ୍ଷାର ପାଠ୍ୟକ୍ରମ ଓ PYQ ବିଶ୍ଳେଷଣ କରନ୍ତି।',
    official_url: '/resources/'
  },
  '4.1.2': {
    title: 'Public Policy & Welfare Scheme Analysts',
    title_or: 'ସାଧାରଣ ନୀତି ଓ ଜନକଲ୍ୟାଣ ଯୋଜନା ସମୀକ୍ଷକ',
    subtitle: 'Odisha & Union Welfare Trackers',
    subtitle_or: 'ରାଜ୍ୟ ଓ କେନ୍ଦ୍ର ଯୋଜନା ସମୀକ୍ଷା',
    body_text_or: 'ସୁଭଦ୍ରା, ମଧୁବାବୁ ପେନସନ, କାଳିଆ/CM-KISAN ଏବଂ BSKY/ଗୋପବନ୍ଧୁ ଜନ ଆରୋଗ୍ୟ ଯୋଜନାର ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତି।',
    official_url: '/schemes-benefits/'
  },
  '4.2.1': {
    title: 'Founder Stewardship & Subject Matter Reviewers',
    title_or: 'ପ୍ରତିଷ୍ଠାତା ନେତୃତ୍ୱ ଓ ବିଷୟ ବିଶେଷଜ୍ଞ ସମୀକ୍ଷକ',
    subtitle: 'Founded by Ramesh Biswal · Civic Educator Network',
    subtitle_or: 'ପ୍ରତିଷ୍ଠାତା ରମେଶ ବିଶ୍ୱାଳ · ବିଷୟ ବିଶେଷଜ୍ଞ ନେଟୱର୍କ',
    body_text_or: 'ଅଭିଜ୍ଞ ଶିକ୍ଷକ, ଗବେଷକ ଏବଂ ସଫଳ ପ୍ରାର୍ଥୀମାନେ ମକ୍ ଟେଷ୍ଟ ଓ ନୋଟ୍ସର ଗୁଣବତ୍ତା ଯାଞ୍ଚ କରନ୍ତି।',
    official_url: '/about/#leadership'
  },
  '4.2.2': {
    title: '30-District Student Ambassadors & Rural Outreach',
    title_or: '୩୦ଟି ଜିଲ୍ଲାର ଛାତ୍ର ପ୍ରତିନିଧି ଏବଂ ଗ୍ରାମୀଣ ସଂଯୋଗ',
    subtitle: 'Angul to Sundargarh — Full 30-District Coverage',
    subtitle_or: 'ଅନୁଗୁଳରୁ ସୁନ୍ଦରଗଡ଼ — ସମସ୍ତ ୩୦ ଜିଲ୍ଲାରେ ସେବା',
    body_text_or: 'କୋରାପୁଟ, କଳାହାଣ୍ଡି, ମୟୂରଭଞ୍ଜ, କନ୍ଧମାଳ ଓ ଉପକୂଳ ଜିଲ୍ଲାମାନଙ୍କରେ ଗ୍ରାମୀଣ ଶିକ୍ଷାର୍ଥୀଙ୍କୁ ସଚେତନ କରନ୍ତି।',
    official_url: '/about/#district-coverage'
  },
  '5.1.1': {
    title: 'DPDP Act 2023 Data Privacy & Zero Ad-Tech Commercialisation',
    title_or: 'DPDP ଆଇନ ୨୦୨୩ ଡାଟା ଗୋପନୀୟତା ଏବଂ ଶୂନ୍ୟ ବିଜ୍ଞାପନ ନୀତି',
    subtitle: 'Minimal Collection · Zero Third-Party Sale',
    subtitle_or: 'ସର୍ବନିମ୍ନ ଡାଟା · ତୃତୀୟ-ପକ୍ଷ ବିକ୍ରୟ ନିଷେଧ',
    body_text_or: 'ଆମେ ଉପଭୋକ୍ତା ତଥ୍ୟ ବିକ୍ରୟ କରୁନାହୁଁ କିମ୍ବା କୌଣସି ତୃତୀୟ-ପକ୍ଷ ଟ୍ରାକର ବ୍ୟବହାର କରୁନାହୁଁ।',
    official_url: '/privacy-policy/'
  },
  '5.1.2': {
    title: 'Terms of Use & Fair Civic Access Policy',
    title_or: 'ବ୍ୟବହାର ସର୍ତ୍ତାବଳୀ ଏବଂ ନିରପେକ୍ଷ ପ୍ରବେଶ ନୀତି',
    subtitle: 'Equal Access · Academic Integrity',
    subtitle_or: 'ସମାନ ଅଧିକାର · ଶୈକ୍ଷିକ ସ୍ୱଚ୍ଛତା',
    body_text_or: 'ସମସ୍ତ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ସମାନ ପ୍ରବେଶ ଓ ସଠିକ୍ ବ୍ୟବହାରର ନିୟମାବଳୀ।',
    official_url: '/terms-of-use/'
  },
  '5.2.1': {
    title: 'Open-Access CC BY-NC-SA 4.0 Attribution & Citation',
    title_or: 'ଖୋଲା ଶିକ୍ଷା CC BY-NC-SA 4.0 ଲାଇସେନ୍ସ ଓ ସୂତ୍ର',
    subtitle: 'Free Non-Commercial Educational Reuse',
    subtitle_or: 'ମାଗଣା ଅଣ-ବ୍ୟବସାୟିକ ଶିକ୍ଷାଗତ ବ୍ୟବହାର',
    body_text_or: 'ମୂଳ CSO ଅଧ୍ୟୟନ ସାମଗ୍ରୀକୁ ଉତ୍ସ ସୂଚନା ସହିତ ଅଣ-ବ୍ୟବସାୟିକ ଶିକ୍ଷା ପାଇଁ ବ୍ୟବହାର କରାଯାଇପାରିବ।',
    official_url: '/about/#open-license'
  },
  '5.2.2': {
    title: 'Independent Non-Government Portal Disclaimer',
    title_or: 'ସ୍ୱାଧୀନ ଅଣ-ସରକାରୀ ପୋର୍ଟାଲ୍ ଘୋଷଣା',
    subtitle: 'Not Affiliated With Govt of Odisha or India',
    subtitle_or: 'ଓଡ଼ିଶା ବା ଭାରତ ସରକାରଙ୍କ ସହିତ ଆଧିକାରିକ ଭାବେ ସଂଯୁକ୍ତ ନୁହେଁ',
    body_text_or: 'CSO ଏକ ସ୍ୱାଧୀନ ନାଗରିକ ପ୍ଲାଟଫର୍ମ। ଚୂଡ଼ାନ୍ତ ଆବେଦନ ସର୍ବଦା ସରକାରୀ .gov.in ପୋର୍ଟାଲରେ କରନ୍ତୁ।',
    official_url: '/about/#non-gov-notice'
  },
  '6.1.1': {
    title: 'General Questions on CSO Services, Pricing & Corrections',
    title_or: 'CSO ସେବା, ମାଗଣା ପ୍ରବେଶ ଏବଂ ତ୍ରୁଟି ସଂଶୋଧନ ପ୍ରଶ୍ନ',
    subtitle: '100% Free Forever · Public Verification',
    subtitle_or: 'ସର୍ବଦା ୧୦୦% ମାଗଣା · ସାର୍ବଜନୀନ ଯାଞ୍ଚ',
    body_text_or: 'CSO ସମ୍ପୂର୍ଣ୍ଣ ମାଗଣା। ତ୍ରୁଟି ଜଣାଇବା ପାଇଁ Report an Error କିମ୍ବା support@csodisha.com ବ୍ୟବହାର କରନ୍ତୁ।',
    official_url: '/about/#faqs'
  },
  '6.1.2': {
    title: 'Student Dashboard, Offline Sync & Goal Tracking FAQs',
    title_or: 'ଛାତ୍ର ଡ୍ୟାସବୋର୍ଡ୍, ଅଫଲାଇନ୍ ସିଙ୍କ୍ ଏବଂ ଲକ୍ଷ୍ୟ ଟ୍ରାକିଂ',
    subtitle: 'IndexedDB Offline Notes + Cloud Sync',
    subtitle_or: 'ଅଫଲାଇନ୍ ନୋଟ୍ସ + କ୍ଲାଉଡ୍ ସିଙ୍କ୍',
    body_text_or: 'ମାଗଣା ଆକାଉଣ୍ଟ ଖୋଲି ବୁକମାର୍କ, ମକ୍ ଟେଷ୍ଟ ପ୍ରଗତି, ଫ୍ଲାସକାର୍ଡ ଓ ଷ୍ଟଡି ପ୍ଲାନ୍ ସଂରକ୍ଷଣ କରନ୍ତୁ।',
    official_url: '/student-dashboard/'
  },
  '6.2.1': {
    title: 'Official Editorial Desk & Citizen Helplines',
    title_or: 'ଆଧିକାରିକ ସମ୍ପାଦକୀୟ ଡେସ୍କ ଏବଂ ନାଗରିକ ସହାୟତା',
    subtitle: 'support@csodisha.com · corrections@csodisha.com',
    subtitle_or: 'support@csodisha.com · corrections@csodisha.com',
    body_text_or: 'ସଂଶୋଧନ, ପ୍ରଶ୍ନ ବା ବୈଷୟିକ ସହାୟତା ପାଇଁ ଆମ ସମ୍ପାଦକୀୟ ଡେସ୍କ ସହିତ ଯୋଗାଯୋଗ କରନ୍ତୁ।',
    official_url: '/support/'
  },
  '6.2.2': {
    title: 'University, College & Civil Society Collaboration',
    title_or: 'ବିଶ୍ୱବିଦ୍ୟାଳୟ, କଲେଜ ଏବଂ ନାଗରିକ ସଙ୍ଗଠନ ସହଯୋଗ',
    subtitle: 'Partnerships@csodisha.com · Rural Workshops',
    subtitle_or: 'partnerships@csodisha.com · ଗ୍ରାମୀଣ କର୍ମଶାଳା',
    body_text_or: 'ଓଡ଼ିଶାର ବିଶ୍ୱବିଦ୍ୟାଳୟ, ଡିଗ୍ରୀ କଲେଜ ଓ ଯୁବ ସଙ୍ଗଠନ ସହିତ ପରୀକ୍ଷା ସଚେତନତା ସହଯୋଗ।',
    official_url: '/about/#helplines'
  }
};

function buildNodes() {
  const dirPath = path.join(ROOT, 'about', 'generated', 'directory.json');
  const raw = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const nav = Array.isArray(raw.navigation) ? raw.navigation : [];
  const rows = [];
  const usedSlugs = new Set();

  function allocSlug(preferred, fallbackPrefix) {
    let base = slugify(preferred) || slugify(fallbackPrefix) || 'node';
    let cand = base;
    let idx = 2;
    while (usedSlugs.has(cand)) {
      cand = `${base}-${idx++}`;
    }
    usedSlugs.add(cand);
    return cand;
  }

  nav.forEach((group, gIdx) => {
    const gNum = String(group.number || String(gIdx + 1).padStart(2, '0'));
    const gm = GROUP_META[gNum] || {};
    const gSlug = allocSlug(gm.slug || group.title, `group-${gNum}`);
    rows.push({
      id: `about-group-${gNum}`,
      slug: gSlug,
      parent_slug: null,
      level: 'group',
      title: group.title,
      title_or: gm.title_or || group.title,
      subtitle: gm.subtitle || '',
      subtitle_or: gm.subtitle_or || '',
      body_text: `${group.title}: ${gm.subtitle || 'Common Sense Odisha institutional directory section.'}`,
      body_text_or: `${gm.title_or || group.title}: ${gm.subtitle_or || ''}`,
      badge_text: gm.badge || `Group ${gNum}`,
      icon_name: gm.icon || '📁',
      official_url: `/about/?group=${gSlug}`,
      sort_order: (gIdx + 1) * 10,
      status: 'published'
    });

    (group.sections || []).forEach((sec, sIdx) => {
      const sNum = String(sec.number || `${gIdx + 1}.${sIdx + 1}`);
      const sm = SECTION_OR[sNum] || {};
      const sSlug = allocSlug(sec.title, `sec-${sNum}`);
      rows.push({
        id: `about-sec-${sNum.replace(/\./g, '-')}`,
        slug: sSlug,
        parent_slug: gSlug,
        level: 'section',
        title: sec.title,
        title_or: sm.title_or || sec.title,
        subtitle: sm.subtitle || '',
        subtitle_or: sm.subtitle_or || '',
        body_text: sm.subtitle || `${sec.title} under ${group.title}.`,
        body_text_or: sm.subtitle_or || sm.title_or || sec.title,
        badge_text: `Section ${sNum}`,
        icon_name: gm.icon || '📂',
        official_url: `/about/?group=${gSlug}&section=${sSlug}`,
        sort_order: (sIdx + 1) * 10,
        status: 'published'
      });

      (sec.children || []).forEach((entry, eIdx) => {
        const eNum = String(entry.number || `${sNum}.${eIdx + 1}`);
        const em = ENTRY_OVERRIDES[eNum] || {};
        const noteText = ((entry.notes || [])[0] && entry.notes[0].text) || '';
        const eSlug = allocSlug(`${eNum}-${em.title || entry.title}`, `entry-${eNum}`);
        rows.push({
          id: `about-entry-${eNum.replace(/\./g, '-')}`,
          slug: eSlug,
          parent_slug: sSlug,
          level: 'entry',
          title: em.title || entry.title,
          title_or: em.title_or || entry.title,
          subtitle: em.subtitle || sec.title,
          subtitle_or: em.subtitle_or || sm.title_or || sec.title,
          body_text: em.body_text || noteText || `${entry.title} — verified Common Sense Odisha public directory entry.`,
          body_text_or: em.body_text_or || em.body_text || noteText,
          badge_text: em.badge_text || eNum,
          icon_name: em.icon_name || '📌',
          official_url: em.official_url || `/about/?group=${gSlug}&section=${sSlug}`,
          sort_order: (eIdx + 1) * 10,
          status: 'published'
        });
      });
    });
  });

  // Ensure two extra authoritative charter entries exist under 3.1 & 5.1 so Detailed Entries stays rich
  const extras = [
    {
      id: 'about-entry-anti-scam-verifier',
      slug: allocSlug('official-portal-domain-verification-standard', 'anti-scam'),
      parent_slug: rows.find(r => r.id === 'about-sec-3-1')?.slug || 'the-cso-trust-layer-standards',
      level: 'entry',
      title: 'Anti-Scam Domain Whitelist Standard (.gov.in / .nic.in)',
      title_or: 'ଠକେଇ ପ୍ରତିରୋଧକ ଡୋମେନ୍ ମାନଦଣ୍ଡ (.gov.in / .nic.in)',
      subtitle: 'Zero Spoof Links · Client-Side Checker',
      subtitle_or: 'ସୁରକ୍ଷିତ ସରକାରୀ ପୋର୍ଟାଲ୍ ଯାଞ୍ଚ',
      body_text:
        'CSO verifies every recruitment and welfare apply link against genuine .gov.in, .nic.in, and official Odisha commission domains (opsc.gov.in, ossc.gov.in, osssc.gov.in, odishapolice.gov.in, odisha.gov.in). Citizens can test suspicious WhatsApp links offline in the About Portal Checker.',
      body_text_or:
        'ସମସ୍ତ ଆବେଦନ ଲିଙ୍କ୍ .gov.in ଏବଂ .nic.in ଡୋମେନ୍ ସହିତ ଯାଞ୍ଚ କରାଯାଏ। ସନ୍ଦେହଜନକ ଲିଙ୍କ୍ ଏଠାରେ ପରୀକ୍ଷା କରନ୍ତୁ।',
      badge_text: 'Anti-Scam',
      icon_name: '🔐',
      official_url: '/about/#portal-verifier',
      sort_order: 30,
      status: 'published'
    },
    {
      id: 'about-entry-dpdp-rights',
      slug: allocSlug('dpdp-2023-citizen-rights-data-deletion', 'dpdp-rights'),
      parent_slug: rows.find(r => r.id === 'about-sec-5-1')?.slug || 'legal-and-operational-policies',
      level: 'entry',
      title: 'DPDP Act 2023 Candidate Data Export & Erasure Right',
      title_or: 'DPDP ୨୦୨୩ ପ୍ରାର୍ଥୀ ଡାଟା ରପ୍ତାନି ଓ ବିଲୋପ ଅଧିକାର',
      subtitle: 'Full Local & Server Data Control',
      subtitle_or: 'ସମ୍ପୂର୍ଣ୍ଣ ଡାଟା ନିୟନ୍ତ୍ରଣ',
      body_text:
        'Under India’s Digital Personal Data Protection Act 2023 guidelines, students can export bookmarks/study logs locally as JSON or request complete deletion of their CSO Hub account at any time without friction.',
      body_text_or:
        'DPDP ଆଇନ ୨୦୨୩ ଅନୁଯାୟୀ ଛାତ୍ରଛାତ୍ରୀ ଯେକୌଣସି ସମୟରେ ନିଜ ଡାଟା ରପ୍ତାନି ବା ବିଲୋପ କରିପାରିବେ।',
      badge_text: 'DPDP 2023',
      icon_name: '📜',
      official_url: '/privacy-policy/',
      sort_order: 30,
      status: 'published'
    }
  ];

  return [...rows, ...extras];
}

function generateSql(nodes) {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS about_directory_nodes (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      parent_slug TEXT,
      level TEXT NOT NULL CHECK (level IN ('group', 'section', 'entry')),
      title TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      subtitle TEXT NOT NULL DEFAULT '',
      subtitle_or TEXT NOT NULL DEFAULT '',
      body_text TEXT NOT NULL DEFAULT '',
      body_text_or TEXT NOT NULL DEFAULT '',
      badge_text TEXT NOT NULL DEFAULT '',
      icon_name TEXT NOT NULL DEFAULT '📄',
      official_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`
  ];

  for (const n of nodes) {
    stmts.push(
      `INSERT INTO about_directory_nodes (
        id, slug, parent_slug, level, title, title_or, subtitle, subtitle_or,
        body_text, body_text_or, badge_text, icon_name, official_url, sort_order, status, updated_at
      ) VALUES (
        ${sqlStr(n.id)}, ${sqlStr(n.slug)}, ${sqlStr(n.parent_slug)}, ${sqlStr(n.level)},
        ${sqlStr(n.title)}, ${sqlStr(n.title_or)}, ${sqlStr(n.subtitle)}, ${sqlStr(n.subtitle_or)},
        ${sqlStr(n.body_text)}, ${sqlStr(n.body_text_or)}, ${sqlStr(n.badge_text)}, ${sqlStr(n.icon_name)},
        ${sqlStr(n.official_url)}, ${sqlInt(n.sort_order)}, ${sqlStr(n.status)}, datetime('now')
      ) ON CONFLICT(slug) DO UPDATE SET
        parent_slug = excluded.parent_slug,
        level = excluded.level,
        title = excluded.title,
        title_or = excluded.title_or,
        subtitle = excluded.subtitle,
        subtitle_or = excluded.subtitle_or,
        body_text = excluded.body_text,
        body_text_or = excluded.body_text_or,
        badge_text = excluded.badge_text,
        icon_name = excluded.icon_name,
        official_url = excluded.official_url,
        sort_order = excluded.sort_order,
        status = excluded.status,
        updated_at = datetime('now');`
    );
  }

  return stmts.join('\n');
}

function main() {
  const nodes = buildNodes();
  const counts = nodes.reduce((acc, n) => {
    acc[n.level] = (acc[n.level] || 0) + 1;
    return acc;
  }, {});
  const sql = generateSql(nodes);

  if (dryRun) {
    console.log('[dry-run] Generated About Directory SQL statements:', nodes.length, counts);
    return;
  }

  const tmpFile = path.join(os.tmpdir(), `cso-about-seed-${Date.now()}.sql`);
  fs.writeFileSync(tmpFile, sql, 'utf8');
  try {
    console.log(`[seed-about-d1] Applying ${nodes.length} nodes to cso-database (${modeFlag})...`, counts);
    runWranglerD1(tmpFile, true);
    const verifyOut = runWranglerD1(
      `SELECT level, COUNT(*) AS cnt FROM about_directory_nodes WHERE status = 'published' GROUP BY level ORDER BY level ASC;`,
      false
    );
    console.log('[seed-about-d1] Verified published counts:', verifyOut.trim());
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

main();
