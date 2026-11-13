#!/usr/bin/env node
/**
 * Idempotent D1 Seeder for CSO Ecosystem Unification (Phase 1).
 * Usage:
 *   node scripts/seed-ecosystem-d1.mjs --local
 *   NODE_OPTIONS="--dns-result-order=ipv4first" node scripts/seed-ecosystem-d1.mjs --remote
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
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
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.trunc(n)) : 'NULL';
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
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
  const out = execFileSync('npx', cmdArgs, {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 25 * 1024 * 1024
  });
  return out;
}

function getExistingColumns(tableName) {
  const raw = runWranglerD1(`PRAGMA table_info(${tableName});`, false);
  const start = raw.indexOf('[');
  if (start === -1) return new Set();
  const parsed = JSON.parse(raw.slice(start));
  const rows = parsed[0]?.results || [];
  return new Set(rows.map((r) => r.name));
}

const GROUP_OR_MAP = {
  'Jobs & Recruitment': 'ନିଯୁକ୍ତି ଏବଂ କ୍ୟାରିଅର୍ ଡାଇରେକ୍ଟୋରୀ',
  'Exam Syllabus, Pattern & Archives': 'ପରୀକ୍ଷା ପାଠ୍ୟକ୍ରମ, ପ୍ୟାଟର୍ଣ୍ଣ ଏବଂ PYQ',
  'Results, Cutoffs & Counselling': 'ଫଳାଫଳ, କଟ୍-ଅଫ୍ ଏବଂ କାଉନସେଲିଂ',
  'Skill Training & Fellowships': 'ଦକ୍ଷତା ତାଲିମ ଏବଂ ଫେଲୋସିପ୍',
  'Self-Employment & Entrepreneurship': 'ସ୍ୱୟଂ ନିଯୁକ୍ତି ଏବଂ ଉଦ୍ୟମିତା',
  'Public Sector, Defence & Specialised Streams': 'ସରକାରୀ କ୍ଷେତ୍ର, ପ୍ରତିରକ୍ଷା ଏବଂ ସ୍ୱତନ୍ତ୍ର ବର୍ଗ',
  'Private Sector, Overseas & Career Transitions': 'ବେସରକାରୀ କ୍ଷେତ୍ର, ବିଦେଶୀ ନିଯୁକ୍ତି ଏବଂ କ୍ୟାରିଅର୍',
  'Career Advisory, Mentorship & Readiness': 'କ୍ୟାରିଅର୍ ପରାମର୍ଶ ଏବଂ ପ୍ରସ୍ତୁତି'
};

function buildDirectorySql() {
  const dirPath = path.join(ROOT, 'jobs-careers', 'generated', 'directory.json');
  const data = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const stmts = [];
  let seq = 0;

  function inferExamSlug(title, notes) {
    const hay = `${title} ${(notes || []).map((n) => n.text || '').join(' ')}`.toLowerCase();
    if (hay.includes('opsc') || hay.includes('civil service')) return 'opsc-oas';
    if (hay.includes('osssc')) return 'osssc-combined';
    if (hay.includes('ossc')) return 'ossc-cgl';
    if (hay.includes('oavs') || hay.includes('ltr') || hay.includes('teacher') || hay.includes('otet') || hay.includes('ctet')) return 'ltr-oavs';
    if (hay.includes('police') || hay.includes('constable')) return 'odisha-police';
    if (hay.includes('ssc')) return 'ssc-cgl';
    if (hay.includes('ibps') || hay.includes('banking')) return 'ibps-banking';
    if (hay.includes('rrb') || hay.includes('railway')) return 'rrb-railway';
    return null;
  }

  function walk(nodes, level, parentId, groupSlug) {
    if (!Array.isArray(nodes)) return;
    nodes.forEach((node, idx) => {
      seq += 1;
      const code = node.number ? String(node.number) : `g${idx + 1}`;
      const gSlug = level === 0 ? slugify(node.title || `group-${idx + 1}`) : groupSlug;
      const id = `jdn-${level}-${slugify(code)}-${String(seq).padStart(3, '0')}`;
      const title = String(node.title || 'Untitled').trim();
      const titleOr = GROUP_OR_MAP[title] || null;
      const notes = Array.isArray(node.notes)
        ? node.notes.map((n) => (typeof n === 'string' ? n : n?.text || '')).filter(Boolean)
        : [];
      const desc = notes.length ? notes.slice(0, 3).join(' · ') : null;
      const examSlug = inferExamSlug(title, node.notes);
      const tags = JSON.stringify(
        [gSlug, examSlug, level === 0 ? 'group' : level === 1 ? 'section' : level === 2 ? 'subcategory' : 'entry'].filter(Boolean)
      );

      stmts.push(
        `INSERT INTO jobs_directory_nodes (id, parent_id, level, code, title, title_or, description, group_slug, exam_slug, notes_json, tags, sort_order, is_active, updated_at)
VALUES (${sqlStr(id)}, ${sqlStr(parentId)}, ${sqlInt(level)}, ${sqlStr(code)}, ${sqlStr(title)}, ${sqlStr(titleOr)}, ${sqlStr(desc)}, ${sqlStr(gSlug)}, ${sqlStr(examSlug)}, ${sqlStr(JSON.stringify(notes))}, ${sqlStr(tags)}, ${sqlInt(idx + 1)}, 1, datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  parent_id=excluded.parent_id,
  level=excluded.level,
  code=excluded.code,
  title=excluded.title,
  title_or=COALESCE(jobs_directory_nodes.title_or, excluded.title_or),
  description=COALESCE(jobs_directory_nodes.description, excluded.description),
  group_slug=excluded.group_slug,
  exam_slug=COALESCE(jobs_directory_nodes.exam_slug, excluded.exam_slug),
  notes_json=excluded.notes_json,
  tags=excluded.tags,
  sort_order=excluded.sort_order,
  updated_at=datetime('now');`
      );

      if (Array.isArray(node.children) && node.children.length) {
        walk(node.children, level + 1, id, gSlug);
      }
    });
  }

  walk(data.sections || [], 0, null, null);
  return stmts;
}

const FLAGSHIP_SCHEMES = [
  {
    id: 'sch-subhadra-yojana',
    slug: 'subhadra-yojana-odisha',
    title: 'Subhadra Yojana (Odisha Women Financial Assistance)',
    title_or: 'ସୁଭଦ୍ରା ଯୋଜନା (ମହିଳା ଆର୍ଥିକ ସହାୟତା)',
    summary: 'Direct financial assistance of Rs. 50,000 over five years (Rs. 10,000 per year in two installments) to eligible women in Odisha aged 21–60.',
    summary_or: 'ଓଡ଼ିଶାର ୨୧–୬୦ ବର୍ଷ ବୟସ୍କା ଯୋଗ୍ୟ ମହିଳାଙ୍କୁ ୫ ବର୍ଷରେ ୫୦,୦୦୦ ଟଙ୍କାର ପ୍ରତ୍ୟକ୍ଷ ଆର୍ଥିକ ସହାୟତା ।',
    body_md: '## Overview\nSubhadra Yojana empowers women across Odisha via DBT transfers directly into Aadhaar-seeded bank accounts on Rakhi Purnima and International Women\'s Day.\n\n## Key Eligibility\n- Permanent resident of Odisha aged 21 to 60 years\n- Family annual income under Rs. 2.50 Lakh (NFSA/SFSS cardholders prioritized)\n- Not an income taxpayer or regular government employee',
    body_md_or: '## ମୁଖ୍ୟ ବିବରଣୀ\nରାକ୍ଷୀ ପୂର୍ଣ୍ଣିମା ଏବଂ ଅନ୍ତର୍ଜାତୀୟ ମହିଳା ଦିବସରେ ଡିବିଟି ମାଧ୍ୟମରେ ବାର୍ଷିକ ୧୦,୦୦୦ ଟଙ୍କା (ଦୁଇ କିସ୍ତିରେ ୫,୦୦୦ ଟଙ୍କା ଲେଖାଏଁ) ପ୍ରଦାନ କରାଯାଏ ।',
    category: 'Women & Child',
    department: 'Women & Child Development Dept., Govt. of Odisha',
    gov_level: 'Odisha',
    target_groups: ['women', 'bpl', 'rural'],
    min_age: 21,
    max_age: 60,
    max_income: 250000,
    gender_eligible: 'female',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'EWS', 'BPL'],
    benefit_summary: 'Rs. 10,000/year DBT (Rs. 50,000 total over 5 years) + Subhadra Debit Card',
    benefit_summary_or: 'ବାର୍ଷିକ ୧୦,୦୦୦ ଟଙ୍କା (୫ ବର୍ଷରେ ମୋଟ ୫୦,୦୦୦ ଟଙ୍କା) DBT ସହାୟତା',
    documents_required: ['Aadhaar Card (seeded with bank account)', 'NFSA / SFSS Ration Card or Income Certificate', 'Active Single-Holder Bank Account'],
    apply_url: 'https://subhadra.odisha.gov.in/',
    sort_order: 1,
    is_featured: 1
  },
  {
    id: 'sch-post-matric-odisha',
    slug: 'odisha-state-scholarship-post-matric',
    title: 'Odisha State Post-Matric Scholarship',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି',
    summary: 'Financial assistance and tuition reimbursement for SC, ST, OBC/SEBC, and EBC students pursuing +2, graduation, PG, and technical courses.',
    summary_or: '+୨, ସ୍ନାତକ, ସ୍ନାତକୋତ୍ତର ଏବଂ ବୈଷୟିକ ଶିକ୍ଷା ପାଇଁ SC, ST, OBC/SEBC ଏବଂ EBC ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ ଛାତ୍ରବୃତ୍ତି ।',
    body_md: '## Overview\nUnified State Scholarship Portal for post-matric education covering maintenance allowance and course fee reimbursement.\n\n## Eligibility\n- Domicile of Odisha studying in recognized institutions\n- Category-based family annual income limit (up to Rs. 2.50 Lakh)',
    body_md_or: '## ଯୋଗ୍ୟତା\nଓଡ଼ିଶାର ସ୍ଥାୟୀ ବାସିନ୍ଦା ଏବଂ ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ଶିକ୍ଷାନୁଷ୍ଠାନରେ ଅଧ୍ୟୟନରତ ଛାତ୍ରଛାତ୍ରୀ ।',
    category: 'Scholarship',
    department: 'ST & SC Development / Higher Education Dept., Govt. of Odisha',
    gov_level: 'Odisha',
    target_groups: ['students', 'sc_st_obc', 'youth'],
    min_age: 15,
    max_age: 35,
    max_income: 250000,
    gender_eligible: 'all',
    beneficiary_categories: ['SC', 'ST', 'OBC', 'SEBC', 'EWS'],
    benefit_summary: 'Annual maintenance allowance + tuition fee reimbursement up to Rs. 50,000+/year',
    benefit_summary_or: 'ବାର୍ଷିକ ରକ୍ଷଣାବେକ୍ଷଣ ଭତ୍ତା ଏବଂ ଶିକ୍ଷା ଦେୟ ଫେରସ୍ତ',
    documents_required: ['Aadhaar Card', 'Caste Certificate', 'Income Certificate (below Rs. 2.5L)', 'Bonafide Student Certificate & Marksheet', 'Bank Passbook'],
    apply_url: 'https://scholarship.odisha.gov.in/',
    sort_order: 2,
    is_featured: 1
  },
  {
    id: 'sch-cm-kisan-odisha',
    slug: 'cm-kisan-yojana-odisha',
    title: 'CM-KISAN Yojana (Farmer & Landless Agricultural Household Support)',
    title_or: 'ସିଏମ୍-କିଷାନ ଯୋଜନା (କୃଷକ ସହାୟତା)',
    summary: 'Rs. 4,000/year assistance for small/marginal farmers across Kharif and Rabi seasons plus Rs. 12,500 support for landless agricultural households.',
    summary_or: 'କ୍ଷୁଦ୍ର ଓ ନାମମାତ୍ର ଚାଷୀଙ୍କୁ ଖରିଫ୍ ଓ ରବି ଋତୁରେ ବାର୍ଷିକ ୪,୦୦୦ ଟଙ୍କା ଏବଂ ଭୂମିହୀନ କୃଷି ପରିବାରଙ୍କୁ ୧୨,୫୦୦ ଟଙ୍କା ସହାୟତା ।',
    body_md: '## Overview\nProvides direct income support before Kharif (Akshaya Tritiya) and Rabi (Nuakhai) agricultural cycles along with Krushi Vidya Nidhi scholarships for farmers\' children.',
    body_md_or: '## ବିବରଣୀ\nଅକ୍ଷୟ ତୃତୀୟା ଏବଂ ନୂଆଖାଇ ଅବସରରେ ଚାଷୀଙ୍କୁ ଆର୍ଥିକ ସହାୟତା ପ୍ରଦାନ କରାଯାଏ ।',
    category: 'Farmers & Rural',
    department: 'Dept. of Agriculture & Farmers\' Empowerment, Govt. of Odisha',
    gov_level: 'Odisha',
    target_groups: ['farmers', 'rural', 'bpl'],
    min_age: 18,
    max_age: 75,
    max_income: null,
    gender_eligible: 'all',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'EWS', 'BPL'],
    benefit_summary: 'Rs. 4,000/year for small/marginal farmers; Rs. 12,500 across 3 installments for landless households',
    benefit_summary_or: 'ଚାଷୀଙ୍କୁ ବାର୍ଷିକ ୪,୦୦୦ ଟଙ୍କା ଏବଂ ଭୂମିହୀନ ପରିବାରଙ୍କୁ ୧୨,୫୦୦ ଟଙ୍କା',
    documents_required: ['Aadhaar Card', 'Ration Card / Residence Proof', 'Land Record (RoR / Patta) if landowner', 'DBT-enabled Bank Account'],
    apply_url: 'https://cmkisan.odisha.gov.in/',
    sort_order: 3,
    is_featured: 1
  },
  {
    id: 'sch-gopabandhu-jan-arogya',
    slug: 'gopabandhu-jan-arogya-bsky-odisha',
    title: 'Gopabandhu Jan Arogya Yojana & Ayushman Bharat Convergence',
    title_or: 'ଗୋପବନ୍ଧୁ ଜନ ଆରୋଗ୍ୟ ଯୋଜନା (ସ୍ୱାସ୍ଥ୍ୟ ବୀମା)',
    summary: 'Cashless healthcare coverage up to Rs. 5 Lakh per family per annum (Rs. 10 Lakh for women beneficiaries) across empanelled hospitals.',
    summary_or: 'ପରିବାର ପିଛା ବାର୍ଷିକ ୫ ଲକ୍ଷ ଟଙ୍କା (ମହିଳାଙ୍କ ପାଇଁ ୧୦ ଲକ୍ଷ ଟଙ୍କା) ପର୍ଯ୍ୟନ୍ତ ନଗଦ-ବିହୀନ ସ୍ୱାସ୍ଥ୍ୟସେବା ।',
    body_md: '## Overview\nUniversal cashless secondary and tertiary treatment for economically vulnerable families across Odisha and converged national hospitals.',
    body_md_or: '## ସୁବିଧା\nତାଲିକାଭୁକ୍ତ ସରକାରୀ ଓ ବେସରକାରୀ ଡାକ୍ତରଖାନାରେ ମାଗଣା ଚିକିତ୍ସା ସୁବିଧା ।',
    category: 'Healthcare',
    department: 'Health & Family Welfare Dept., Govt. of Odisha',
    gov_level: 'Odisha',
    target_groups: ['bpl', 'women', 'rural', 'senior_citizens'],
    min_age: null,
    max_age: null,
    max_income: 250000,
    gender_eligible: 'all',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'EWS', 'BPL'],
    benefit_summary: 'Rs. 5 Lakh/year family cover + additional Rs. 5 Lakh exclusively for women members',
    benefit_summary_or: 'ବାର୍ଷିକ ୫ ଲକ୍ଷ + ମହିଳାଙ୍କ ପାଇଁ ଅତିରିକ୍ତ ୫ ଲକ୍ଷ ଟଙ୍କା ଚିକିତ୍ସା ସହାୟତା',
    documents_required: ['NFSA / SFSS Ration Card', 'Aadhaar Card', 'Health Assurance Card / e-KYC'],
    apply_url: 'https://health.odisha.gov.in/',
    sort_order: 4,
    is_featured: 1
  },
  {
    id: 'sch-nuakhai-nua-odisha',
    slug: 'nua-o-scholarship-skilled-odisha',
    title: 'NUA-O / Skilled in Odisha Youth Training & Scholarship',
    title_or: 'ନୂଆ-ଓ ଏବଂ ସ୍କିଲ୍ଡ ଇନ୍ ଓଡ଼ିଶା ଯୁବ ତାଲିମ ଯୋଜନା',
    summary: 'UG/PG student assistance and free residential industry-ready skill certification at World Skill Center & ITIs across Odisha.',
    summary_or: 'ସ୍ନାତକ/ସ୍ନାତକୋତ୍ତର ଛାତ୍ରବୃତ୍ତି ଏବଂ ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟରରେ ମାଗଣା ଦକ୍ଷତା ତାଲିମ ।',
    body_md: '## Overview\nCombines higher education financial aid with placement-linked industrial and IT skill training for Odisha youth aged 18–35.',
    body_md_or: '## ବିବରଣୀ\nଓଡ଼ିଶାର ଯୁବକଯୁବତୀଙ୍କ ପାଇଁ ଉଚ୍ଚଶିକ୍ଷା ସହାୟତା ଏବଂ ନିଯୁକ୍ତିଭିତ୍ତିକ ଦକ୍ଷତା ତାଲିମ ।',
    category: 'Youth & Skill',
    department: 'Skill Development & Technical Education / Higher Education Dept.',
    gov_level: 'Odisha',
    target_groups: ['youth', 'students'],
    min_age: 17,
    max_age: 35,
    max_income: 800000,
    gender_eligible: 'all',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'EWS'],
    benefit_summary: 'Free residential skill training + placement support + annual academic aid',
    benefit_summary_or: 'ମାଗଣା ଆବାସିକ ତାଲିମ ଏବଂ ବାର୍ଷିକ ଶିକ୍ଷା ସହାୟତା',
    documents_required: ['Aadhaar Card', 'Educational Marksheet (+2 / Graduation)', 'Residence Certificate'],
    apply_url: 'https://skillodisha.gov.in/',
    sort_order: 5,
    is_featured: 1
  },
  {
    id: 'sch-madhu-babu-pension',
    slug: 'madhu-babu-pension-yojana-odisha',
    title: 'Madhu Babu Pension Yojana (Senior Citizens, Widows & PwD)',
    title_or: 'ମଧୁ ବାବୁ ପେନସନ୍ ଯୋଜନା',
    summary: 'Monthly social security pension (Rs. 1,000–Rs. 3,500 based on age and disability category) for indigent elderly, widows, and PwD residents.',
    summary_or: 'ବୟସ୍କ, ବିଧବା ଏବଂ ଦିବ୍ୟାଙ୍ଗ ନାଗରିକଙ୍କୁ ମାସିକ ୧,୦୦୦ ରୁ ୩,୫୦୦ ଟଙ୍କା ସାମାଜିକ ସୁରକ୍ଷା ଭତ୍ତା ।',
    body_md: '## Overview\nState social security pension distributed directly via bank DBT or Gram Panchayat camps.',
    body_md_or: '## ବିବରଣୀ\nସାମାଜିକ ସୁରକ୍ଷା ଓ ଭିନ୍ନକ୍ଷମ ସଶକ୍ତିକରଣ ବିଭାଗ ଦ୍ୱାରା ମାସିକ ଭତ୍ତା ।',
    category: 'Social Security',
    department: 'SSEPD Dept., Govt. of Odisha',
    gov_level: 'Odisha',
    target_groups: ['senior_citizens', 'women', 'bpl', 'pwd'],
    min_age: 18,
    max_age: 100,
    max_income: 40000,
    gender_eligible: 'all',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'BPL'],
    benefit_summary: 'Monthly pension Rs. 1,000 to Rs. 3,500 depending on age (80+) and disability percentage',
    benefit_summary_or: 'ମାସିକ ୧,୦୦୦ ରୁ ୩,୫୦୦ ଟଙ୍କା ପର୍ଯ୍ୟନ୍ତ ପେନସନ୍',
    documents_required: ['Aadhaar Card', 'Age Proof / UDID Disability Certificate', 'Income Certificate', 'Bank Passbook'],
    apply_url: 'https://ssepd.odisha.gov.in/',
    sort_order: 6,
    is_featured: 0
  },
  {
    id: 'sch-mission-shakti-lakhpati',
    slug: 'mission-shakti-shg-lakhpati-didi',
    title: 'Mission Shakti SHG Interest-Free Loan & Lakhpati Didi Support',
    title_or: 'ମିଶନ ଶକ୍ତି ବିନା ସୁଧ ଋଣ ଏବଂ ଲକ୍ଷପତି ଦିଦି ସହାୟତା',
    summary: 'Zero-interest bank credit up to Rs. 10 Lakh for Women Self-Help Groups (WSHGs) along with revolving funds and market linkage.',
    summary_or: 'ମହିଳା ସ୍ୱୟଂ ସହାୟକ ଗୋଷ୍ଠୀ (SHG) ମାନଙ୍କୁ ୧୦ ଲକ୍ଷ ଟଙ୍କା ପର୍ଯ୍ୟନ୍ତ ବିନା ସୁଧରେ ଋଣ ।',
    body_md: '## Overview\nEmpowers WSHGs across Odisha to scale micro-enterprises, paddy procurement, tailoring, and rural retail.',
    body_md_or: '## ସୁବିଧା\nମହିଳା ଉଦ୍ୟୋଗୀ ଏବଂ ସ୍ୱୟଂ ସହାୟକ ଗୋଷ୍ଠୀଙ୍କୁ ୦% ସୁଧରେ ବ୍ୟାଙ୍କ ଋଣ ।',
    category: 'Women & Child',
    department: 'Dept. of Mission Shakti, Govt. of Odisha',
    gov_level: 'Odisha',
    target_groups: ['women', 'rural', 'entrepreneurs'],
    min_age: 18,
    max_age: 65,
    max_income: null,
    gender_eligible: 'female',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'BPL'],
    benefit_summary: '0% interest subvention on SHG bank loans up to Rs. 10 Lakh + enterprise training',
    benefit_summary_or: '୧୦ ଲକ୍ଷ ଟଙ୍କା ପର୍ଯ୍ୟନ୍ତ ୦% ସୁଧ ଋଣ',
    documents_required: ['WSHG Registration ID', 'Aadhaar of Office Bearers', 'SHG Savings Bank Passbook'],
    apply_url: 'https://missionshakti.odisha.gov.in/',
    sort_order: 7,
    is_featured: 0
  },
  {
    id: 'sch-pm-kisan-national',
    slug: 'pm-kisan-samman-nidhi-national',
    title: 'PM-KISAN Samman Nidhi (Central Farmer Income Support)',
    title_or: 'ପିଏମ୍-କିଷାନ ସମ୍ମାନ ନିଧି ଯୋଜନା',
    summary: 'Rs. 6,000 per year in three equal Rs. 2,000 installments transferred directly to landholding farmer families nationwide.',
    summary_or: 'କୃଷକ ପରିବାରଙ୍କୁ ତିନୋଟି କିସ୍ତିରେ ବାର୍ଷିକ ୬,୦୦୦ ଟଙ୍କା ପ୍ରତ୍ୟକ୍ଷ ଆର୍ଥିକ ସହାୟତା ।',
    body_md: '## Overview\nCentral sector DBT scheme supplementing financial needs of cultivable landholding farmer families.',
    body_md_or: '## ବିବରଣୀ\nଭାରତ ସରକାରଙ୍କ ଦ୍ୱାରା ପ୍ରତି ୪ ମାସରେ ୨,୦୦୦ ଟଙ୍କା ଲେଖାଏଁ ସହାୟତା ।',
    category: 'Farmers & Rural',
    department: 'Ministry of Agriculture & Farmers Welfare, Govt. of India',
    gov_level: 'Central',
    target_groups: ['farmers', 'rural'],
    min_age: 18,
    max_age: 80,
    max_income: null,
    gender_eligible: 'all',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'EWS', 'BPL'],
    benefit_summary: 'Rs. 6,000/year in 3 equal installments of Rs. 2,000 via DBT',
    benefit_summary_or: 'ବାର୍ଷିକ ୬,୦୦୦ ଟଙ୍କା (୩ଟି କିସ୍ତିରେ ୨,୦୦୦ ଟଙ୍କା)',
    documents_required: ['Aadhaar Card (e-KYC completed)', 'Land Ownership RoR/Khata', 'Aadhaar-seeded Bank Account'],
    apply_url: 'https://pmkisan.gov.in/',
    sort_order: 8,
    is_featured: 0
  },
  {
    id: 'sch-nsp-central-scholarships',
    slug: 'national-scholarship-portal-central',
    title: 'National Scholarship Portal (NSP) Central Sector & Merit Schemes',
    title_or: 'ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ (NSP) କେନ୍ଦ୍ରୀୟ ଯୋଜନା',
    summary: 'Central Sector Scheme for College/University Students, AICTE Pragati/Saksham, and NMMS scholarships with OTR authentication.',
    summary_or: 'କଲେଜ/ବିଶ୍ୱବିଦ୍ୟାଳୟ ଛାତ୍ରଛାତ୍ରୀ, AICTE ପ୍ରଗତି/ସକ୍ଷମ ଏବଂ NMMS କେନ୍ଦ୍ରୀୟ ଛାତ୍ରବୃତ୍ତି ।',
    body_md: '## Overview\nOne-Time Registration (OTR) portal for central merit, minority, girl-child technical, and PwD scholarships.',
    body_md_or: '## ବିବରଣୀ\nକେନ୍ଦ୍ରୀୟ ମେଧା, ଛାତ୍ରୀ ଏବଂ ଦିବ୍ୟାଙ୍ଗ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ।',
    category: 'Scholarship',
    department: 'Ministry of Education, Govt. of India',
    gov_level: 'Central',
    target_groups: ['students', 'youth', 'women', 'pwd'],
    min_age: 14,
    max_age: 35,
    max_income: 800000,
    gender_eligible: 'all',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'EWS'],
    benefit_summary: 'Rs. 12,000 to Rs. 50,000/year depending on stream & AICTE/UGC scholarship category',
    benefit_summary_or: 'ବାର୍ଷିକ ୧୨,୦୦୦ ରୁ ୫୦,୦୦୦ ଟଙ୍କା ପର୍ଯ୍ୟନ୍ତ ଛାତ୍ରବୃତ୍ତି',
    documents_required: ['NSP OTR ID', 'Aadhaar Card', 'Class 10/12 Marksheet (Top 20 percentile)', 'Family Income Certificate'],
    apply_url: 'https://scholarships.gov.in/',
    sort_order: 9,
    is_featured: 1
  },
  {
    id: 'sch-pm-vishwakarma',
    slug: 'pm-vishwakarma-artisan-scheme',
    title: 'PM Vishwakarma Artisan & Traditional Craft Support Scheme',
    title_or: 'ପିଏମ୍ ବିଶ୍ୱକର୍ମା କାରିଗର ଏବଂ ପାରମ୍ପରିକ ଶିଳ୍ପ ସହାୟତା',
    summary: 'Recognition certificate, Rs. 15,000 toolkit e-voucher, skill stipend (Rs. 500/day), and collateral-free credit up to Rs. 3 Lakh.',
    summary_or: 'କାରିଗରଙ୍କୁ ୧୫,୦୦୦ ଟଙ୍କା ଟୁଲକିଟ୍ ଭାଉଚର, ତାଲିମ ଭତ୍ତା ଏବଂ ୩ ଲକ୍ଷ ଟଙ୍କା ପର୍ଯ୍ୟନ୍ତ ସୁଲଭ ଋଣ ।',
    body_md: '## Overview\nSupports 18 traditional trades including carpenters, weavers, potters, goldsmiths, masons, and boat makers across Odisha.',
    body_md_or: '## ବିବରଣୀ\n୧୮ଟି ପାରମ୍ପରିକ କାରିଗରୀ ବର୍ଗ ପାଇଁ ପ୍ରଶିକ୍ଷଣ, ଟୁଲକିଟ୍ ଏବଂ ବିନା ବନ୍ଧକ ଋଣ ।',
    category: 'Youth & Skill',
    department: 'Ministry of MSME, Govt. of India',
    gov_level: 'Central',
    target_groups: ['youth', 'entrepreneurs', 'rural'],
    min_age: 18,
    max_age: 65,
    max_income: null,
    gender_eligible: 'all',
    beneficiary_categories: ['General', 'OBC', 'SEBC', 'SC', 'ST', 'EWS'],
    benefit_summary: 'Rs. 15,000 toolkit grant + Rs. 500/day training stipend + Rs. 1L–3L collateral-free credit at 5%',
    benefit_summary_or: '୧୫,୦୦୦ ଟଙ୍କା ଟୁଲକିଟ୍ + ଦୈନିକ ୫୦୦ ଟଙ୍କା ତାଲିମ ଭତ୍ତା + ୫% ସୁଧରେ ଋଣ',
    documents_required: ['Aadhaar Card', 'Mobile Number linked to Aadhaar', 'Ration Card', 'Bank Account'],
    apply_url: 'https://pmvishwakarma.gov.in/',
    sort_order: 10,
    is_featured: 0
  }
];

const SEED_POSTS = [
  {
    id: 'job-opsc-oas-2026',
    type: 'job',
    slug: 'opsc-odisha-civil-services-ocs-2026',
    title: 'OPSC Odisha Civil Services (OCS / OAS Group A & B) Examination',
    title_or: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS / OFS) ନିଯୁକ୍ତି',
    summary: 'Combined Competitive Recruitment for OAS, OFS, OPS, ORS, and allied Group A & B administrative services under Govt. of Odisha.',
    summary_or: 'ଓଡ଼ିଶା ସରକାରଙ୍କ ଅଧୀନରେ OAS, OFS, OPS ଏବଂ ORS ଗ୍ରୁପ୍ A ଓ B ପଦବୀ ପାଇଁ ମିଳିତ ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା ।',
    body_md: '## Selection Stages\n1. Preliminary Examination (GS Paper I & CSAT Paper II)\n2. Main Written Examination (Odia, English, Essay, 4 GS Papers, 1 Optional)\n3. Personality Test / Interview\n\n## Key Eligibility\n- Bachelor\'s degree from a recognized University\n- Ability to read, write and speak Odia fluently (ME / HSC standard Odia passed)',
    category: 'OPSC',
    tags: ['opsc-oas', 'odisha-govt', 'graduate', 'group-a'],
    organisation: 'Odisha Public Service Commission (OPSC)',
    vacancies: 399,
    qualification: 'Bachelor\'s Degree + Odia up to ME/HSC',
    last_date: '2026-12-20',
    apply_url: 'https://www.opsc.gov.in/',
    state: 'Odisha',
    age_limit: '21–38 Years (SC/ST/SEBC/Women +5 Yrs, PwD +10 Yrs)',
    salary_pay: 'Level-10 to Level-12 (ORSP Pay Matrix)',
    goal_exam_ids: ['opsc-oas', 'opsc-aso']
  },
  {
    id: 'job-ossc-cgl-2026',
    type: 'job',
    slug: 'ossc-combined-graduate-level-cglre-2026',
    title: 'OSSC Combined Graduate Level Recruitment Examination (CGLRE)',
    title_or: 'OSSC ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ ନିଯୁକ୍ତି ପରୀକ୍ଷା (CGLRE)',
    summary: 'Group-B & Group-C posts including Inspector of Supplies, Auditor, Junior Enforcement Officer, and Cooperative Inspector.',
    summary_or: 'ଇନ୍ସପେକ୍ଟର ଅଫ୍ ସପ୍ଲାଇଜ୍, ଅଡିଟର୍ ଏବଂ ଜୁନିଅର ଏନଫୋର୍ସମେଣ୍ଟ ଅଫିସର ଭଳି ଗ୍ରୁପ୍-B ଓ C ପଦବୀ ।',
    body_md: '## Exam Pattern\n- Stage I: Preliminary Exam (150 Marks, 150 Qs, 0.25 negative marking)\n- Stage II: Main Written Exam (Paper I Language + Paper II General Studies)\n- Stage III: Computer Skill Test & Certificate Verification',
    category: 'OSSC',
    tags: ['ossc-cgl', 'graduate', 'group-b', 'odisha-govt'],
    organisation: 'Odisha Staff Selection Commission (OSSC)',
    vacancies: 586,
    qualification: 'Graduate in any discipline + Basic Computer Knowledge',
    last_date: '2026-12-28',
    apply_url: 'https://www.ossc.gov.in/',
    state: 'Odisha',
    age_limit: '21–38 Years (relaxation as per Odisha Govt rules)',
    salary_pay: 'Pay Matrix Level-9 (Rs. 35,400–1,12,400)',
    goal_exam_ids: ['ossc-cgl']
  },
  {
    id: 'job-osssc-ri-ari-amin-2026',
    type: 'job',
    slug: 'osssc-combined-cre-ri-ari-amin-2026',
    title: 'OSSSC Combined Recruitment (RI, ARI, Amin, ICDS Supervisor, SFS)',
    title_or: 'OSSSC ମିଳିତ ନିଯୁକ୍ତି (RI, ARI, ଅମିନ ଏବଂ ICDS ସୁପରଭାଇଜର)',
    summary: 'District cadre Revenue & Disaster Management and Women & Child Development recruitment across all 30 districts of Odisha.',
    summary_or: 'ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲାରେ ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI), ARI, ଅମିନ ଏବଂ ICDS ସୁପରଭାଇଜର ପଦବୀ ।',
    body_md: '## Syllabus Focus\nArithmetic, General Studies, English, Odia Language, and Computer Proficiency across Prelims and Mains CBT.',
    category: 'OSSSC',
    tags: ['osssc-combined', 'district-cadre', 'odisha-govt', '12th-graduate'],
    organisation: 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)',
    vacancies: 2895,
    qualification: '+2 / Graduation (post-wise) + Odia & Computer Skill',
    last_date: '2027-01-15',
    apply_url: 'https://www.osssc.gov.in/',
    state: 'Odisha',
    age_limit: '20–38 Years',
    salary_pay: 'Pay Matrix Level-4 to Level-9',
    goal_exam_ids: ['osssc-combined', 'osssc-ri-ari']
  },
  {
    id: 'job-odisha-police-si-constable-2026',
    type: 'job',
    slug: 'odisha-police-sub-inspector-constable-2026',
    title: 'Odisha Police Recruitment Board (OPRB) SI & Battalion Constable',
    title_or: 'ଓଡ଼ିଶା ପୋଲିସ ସବ୍-ଇନ୍ସପେକ୍ଟର ଏବଂ କନେଷ୍ଟବଳ ନିଯୁକ୍ତି',
    summary: 'Combined Police Service Examination for Sub-Inspector of Police and Armed/Sepoy Battalion Constable vacancies.',
    summary_or: 'ଓଡ଼ିଶା ପୋଲିସ ସବ୍-ଇନ୍ସପେକ୍ଟର ଏବଂ ସେପୟ/ବାଟାଲିଅନ୍ କନେଷ୍ଟବଳ ପଦବୀ ପାଇଁ ନିଯୁକ୍ତି ।',
    body_md: '## Stages\nWritten CBT Examination followed by Physical Standard Test (PST) and Physical Efficiency Test (PET).',
    category: 'Police & Defence',
    tags: ['odisha-police', 'uniformed', 'odisha-govt'],
    organisation: 'Odisha Police Recruitment Board (OPRB)',
    vacancies: 1360,
    qualification: '+2 / 10th for Constable; Graduate for SI',
    last_date: '2027-01-25',
    apply_url: 'https://odishapolice.gov.in/',
    state: 'Odisha',
    age_limit: '18–23 Years (Constable) / 21–25 Years (SI) + category relaxation',
    salary_pay: 'Pay Matrix Level-5 to Level-9',
    goal_exam_ids: ['odisha-police']
  },
  {
    id: 'job-ssb-ltr-oavs-2026',
    type: 'job',
    slug: 'ssb-ltr-oavs-govt-high-school-teacher-2026',
    title: 'Odisha Govt High School LTR & OAVS TGT/PGT Teacher Recruitment',
    title_or: 'ଓଡ଼ିଶା ସରକାରୀ ଉଚ୍ଚ ବିଦ୍ୟାଳୟ LTR ଏବଂ OAVS ଶିକ୍ଷକ ନିଯୁକ୍ତି',
    summary: 'Leave Training Reserve (LTR) Teachers (TGT Arts, TGT Science, Hindi, Sanskrit, PET) & Odisha Adarsha Vidyalaya recruitment.',
    summary_or: 'ଓଡ଼ିଶା ସରକାରୀ ହାଇସ୍କୁଲ LTR ଏବଂ ଓଡ଼ିଶା ଆଦର୍ଶ ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ ନିଯୁକ୍ତି ।',
    body_md: '## Key Requirement\nOSSTET / OTET / CTET qualification along with B.Ed. / B.P.Ed. and Odia language proficiency.',
    category: 'Teaching',
    tags: ['ltr-oavs', 'teaching', 'osstet', 'odisha-govt'],
    organisation: 'SSB Odisha / OAVS',
    vacancies: 2650,
    qualification: 'Graduate + B.Ed + OSSTET/OTET/CTET',
    last_date: '2027-02-05',
    apply_url: 'https://ssbodisha.ac.in/',
    state: 'Odisha',
    age_limit: '21–38 Years (with Odisha age relaxations)',
    salary_pay: 'Pay Matrix Level-9 (Rs. 35,400 initial)',
    goal_exam_ids: ['ltr-oavs']
  },
  {
    id: 'job-ssc-cgl-national-2026',
    type: 'job',
    slug: 'ssc-combined-graduate-level-cgl-national-2026',
    title: 'SSC Combined Graduate Level (CGL) Central Ministries Recruitment',
    title_or: 'SSC ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ (CGL) କେନ୍ଦ୍ରୀୟ ନିଯୁକ୍ତି',
    summary: 'Group-B & Group-C central government posts including ASO in CSS, Income Tax Inspector, GST Inspector, and Auditor (C&AG).',
    summary_or: 'କେନ୍ଦ୍ରୀୟ ମନ୍ତ୍ରଣାଳୟରେ ASO, ଆୟକର ନିରୀକ୍ଷକ, GST ଇନ୍ସପେକ୍ଟର ଏବଂ ଅଡିଟର ପଦବୀ ।',
    body_md: '## Exam Structure\nTier-I Qualifying CBT + Tier-II Merit CBT (Maths, Reasoning, English, GA, Computer & Typing Skill Test). Odisha exam centres in Bhubaneswar, Cuttack, Sambalpur, Berhampur, Rourkela & Balasore.',
    category: 'Banking & PSU',
    tags: ['ssc-cgl', 'national', 'central-govt', 'graduate'],
    organisation: 'Staff Selection Commission (SSC)',
    vacancies: 14500,
    qualification: 'Bachelor\'s Degree from recognized University',
    last_date: '2027-01-31',
    apply_url: 'https://ssc.gov.in/',
    state: 'National',
    age_limit: '18–30 / 20–32 Years (post-wise + OBC/SC/ST relaxation)',
    salary_pay: '7th CPC Pay Level-4 to Level-8',
    goal_exam_ids: ['ssc-cgl']
  },
  {
    id: 'ca-odisha-industrial-conclave-2026',
    type: 'current_affair',
    slug: 'utkarsh-odisha-industrial-investment-policy-digest',
    title: 'Utkarsh Odisha & Industrial Policy Updates for State Mains',
    title_or: 'ଉତ୍କର୍ଷ ଓଡ଼ିଶା ଏବଂ ଶିଳ୍ପ ନୀତି ସାରାଂଶ',
    summary: 'Key takeaways on semiconductor, green hydrogen, port-led manufacturing corridors, and employment targets in Odisha Industrial Policy.',
    summary_or: 'ଓଡ଼ିଶା ଶିଳ୍ପ ନୀତିରେ ସେମିକଣ୍ଡକ୍ଟର, ଗ୍ରୀନ୍ ହାଇଡ୍ରୋଜେନ୍ ଏବଂ ବନ୍ଦର-ଭିତ୍ତିକ ଶିଳ୍ପ କରିଡର ସମ୍ବନ୍ଧୀୟ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ତଥ୍ୟ ।',
    body_md: '## Key Highlights for OPSC & OSSC\n- Expansion of Paradip, Dhamra & Gopalpur port-linked industrial nodes\n- Renewable energy & green ammonia incentives\n- MSME & Startup Odisha cluster grants',
    category: 'State',
    tags: ['odisha-economy', 'opsc-oas', 'mains'],
    event_date: '2026-11-10',
    state: 'Odisha',
    goal_exam_ids: ['opsc-oas', 'ossc-cgl']
  },
  {
    id: 'ca-odisha-heritage-budget-2026',
    type: 'current_affair',
    slug: 'odisha-agriculture-water-conservation-schemes-brief',
    title: 'Odisha Shree Anna Abhiyan & Minor Irrigation Initiatives',
    title_or: 'ଓଡ଼ିଶା ଶ୍ରୀ ଅନ୍ନ ଅଭିଯାନ ଏବଂ କ୍ଷୁଦ୍ର ଜଳସେଚନ ପଦକ୍ଷେପ',
    summary: 'Millet cultivation incentives across tribal blocks, climate-resilient paddy varieties, and cold-chain warehousing expansion.',
    summary_or: 'ଆଦିବାସୀ ବ୍ଲକରେ ମାଣ୍ଡିଆ ଚାଷ ପ୍ରୋତ୍ସାହନ ଏବଂ ଶୀତଳ ଭଣ୍ଡାର ସମ୍ପ୍ରସାରଣ ।',
    body_md: '## Exam Pointers\n- Shree Anna Abhiyan MSP support & women SHG procurement channels\n- Check-dam & solar micro-irrigation coverage in Koraput, Rayagada, Kalahandi, and Mayurbhanj.',
    category: 'Economy',
    tags: ['agriculture', 'odisha', 'millet-mission'],
    event_date: '2026-11-12',
    state: 'Odisha',
    goal_exam_ids: ['opsc-oas', 'osssc-combined']
  }
];

function buildPostsSql() {
  const stmts = [];
  for (const p of SEED_POSTS) {
    stmts.push(
      `INSERT INTO posts (id, type, slug, title, title_or, summary, summary_or, body_md, category, tags, event_date, organisation, vacancies, qualification, last_date, apply_url, state, status, published_at, goal_exam_ids, age_limit, salary_pay, created_at, updated_at)
VALUES (${sqlStr(p.id)}, ${sqlStr(p.type)}, ${sqlStr(p.slug)}, ${sqlStr(p.title)}, ${sqlStr(p.title_or)}, ${sqlStr(p.summary)}, ${sqlStr(p.summary_or)}, ${sqlStr(p.body_md)}, ${sqlStr(p.category)}, ${sqlStr(JSON.stringify(p.tags || []))}, ${sqlStr(p.event_date || null)}, ${sqlStr(p.organisation || null)}, ${sqlInt(p.vacancies)}, ${sqlStr(p.qualification || null)}, ${sqlStr(p.last_date || null)}, ${sqlStr(p.apply_url || null)}, ${sqlStr(p.state || 'Odisha')}, 'published', datetime('now'), ${sqlStr(JSON.stringify(p.goal_exam_ids || []))}, ${sqlStr(p.age_limit || null)}, ${sqlStr(p.salary_pay || null)}, datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  title_or=COALESCE(posts.title_or, excluded.title_or),
  summary_or=COALESCE(posts.summary_or, excluded.summary_or),
  goal_exam_ids=COALESCE(posts.goal_exam_ids, excluded.goal_exam_ids),
  age_limit=COALESCE(posts.age_limit, excluded.age_limit),
  salary_pay=COALESCE(posts.salary_pay, excluded.salary_pay),
  status=CASE WHEN posts.status IN ('draft','scheduled') THEN posts.status ELSE 'published' END,
  deleted_at=NULL,
  updated_at=datetime('now');`
    );
  }
  return stmts;
}

function buildSchemesSql() {
  return FLAGSHIP_SCHEMES.map(
    (s) => `INSERT INTO schemes_directory (
  id, slug, title, title_or, summary, summary_or, body_md, body_md_or, category, department,
  gov_level, target_groups, min_age, max_age, max_income, gender_eligible, beneficiary_categories,
  benefit_summary, benefit_summary_or, documents_required, apply_url, status, sort_order, is_featured, updated_at
) VALUES (
  ${sqlStr(s.id)}, ${sqlStr(s.slug)}, ${sqlStr(s.title)}, ${sqlStr(s.title_or)}, ${sqlStr(s.summary)}, ${sqlStr(s.summary_or)},
  ${sqlStr(s.body_md)}, ${sqlStr(s.body_md_or)}, ${sqlStr(s.category)}, ${sqlStr(s.department)},
  ${sqlStr(s.gov_level)}, ${sqlStr(JSON.stringify(s.target_groups))}, ${sqlInt(s.min_age)}, ${sqlInt(s.max_age)}, ${sqlInt(s.max_income)},
  ${sqlStr(s.gender_eligible)}, ${sqlStr(JSON.stringify(s.beneficiary_categories))},
  ${sqlStr(s.benefit_summary)}, ${sqlStr(s.benefit_summary_or)}, ${sqlStr(JSON.stringify(s.documents_required))},
  ${sqlStr(s.apply_url)}, 'published', ${sqlInt(s.sort_order)}, ${sqlInt(s.is_featured)}, datetime('now')
) ON CONFLICT(slug) DO UPDATE SET
  title=excluded.title,
  title_or=excluded.title_or,
  summary=excluded.summary,
  summary_or=excluded.summary_or,
  body_md=excluded.body_md,
  body_md_or=excluded.body_md_or,
  category=excluded.category,
  department=excluded.department,
  gov_level=excluded.gov_level,
  target_groups=excluded.target_groups,
  min_age=excluded.min_age,
  max_age=excluded.max_age,
  max_income=excluded.max_income,
  gender_eligible=excluded.gender_eligible,
  beneficiary_categories=excluded.beneficiary_categories,
  benefit_summary=excluded.benefit_summary,
  benefit_summary_or=excluded.benefit_summary_or,
  documents_required=excluded.documents_required,
  apply_url=excluded.apply_url,
  sort_order=excluded.sort_order,
  is_featured=excluded.is_featured,
  deleted_at=NULL,
  updated_at=datetime('now');`
  );
}

function buildMockTestsAndResourcesSql() {
  const stmts = [];
  const sampleTests = [
    {
      id: 'mt-opsc-odisha-gk-capsule',
      slug: 'opsc-odisha-gk-history-capsule',
      title: 'OPSC Odisha History, Geography & Polity Mock Drill',
      title_or: 'OPSC ଓଡ଼ିଶା ଇତିହାସ, ଭୂଗୋଳ ଏବଂ ରାଜନୀତି ମକ୍ ଟେଷ୍ଟ',
      target_exam: 'OPSC OAS',
      duration_minutes: 15,
      total_marks: 20,
      negative_marking: 0.25,
      qs: [
        ['Which treaty transferred Odisha from Maratha rule to the British East India Company in 1803?', 'Treaty of Deogaon', 'Treaty of Bassein', 'Treaty of Allahabad', 'Treaty of Sugauli', 'A', 'The Treaty of Deogaon was signed on 17 December 1803 between Raghuji Bhonsle II and the British East India Company.'],
        ['Who founded the Satyabadi Vana Vidyalaya at Sakhigopal in 1909?', 'Madhusudan Das', 'Gopabandhu Das', 'Fakir Mohan Senapati', 'Krushna Chandra Gajapati', 'B', 'Utkalmani Pandit Gopabandhu Das established Satyabadi Vana Vidyalaya to promote nationalist education in Odisha.'],
        ['Which river forms the Bhitarkanika Mangrove Sanctuary delta in Kendrapara?', 'Mahanadi', 'Brahmani-Baitarani', 'Rushikulya', 'Subarnarekha', 'B', 'Bhitarkanika lies in the estuarine delta formed by the Brahmani, Baitarani, and Dhamra rivers.'],
        ['How many Lok Sabha constituencies are there in Odisha?', '18', '21', '24', '28', 'B', 'Odisha elects 21 Members of Parliament to the Lok Sabha and 147 MLAs to the Vidhan Sabha.'],
        ['Who was the first Chief Minister of Odisha after the 1937 elections?', 'Harekrushna Mahatab', 'Biju Patnaik', 'Bishwanath Das', 'Nabakrushna Choudhury', 'C', 'Krushna Chandra Gajapati was Prime Minister in 1937 interim ministry, followed by Bishwanath Das heading the first Congress ministry in July 1937.']
      ]
    },
    {
      id: 'mt-osssc-cgl-core-drill',
      slug: 'osssc-ossc-computer-odia-arithmetic-drill',
      title: 'OSSC CGL & OSSSC Combined Core Competency Mock Test',
      title_or: 'OSSC CGL ଏବଂ OSSSC ମିଳିତ କମ୍ପ୍ୟୁଟର ଓ ଗଣିତ ମକ୍ ଟେଷ୍ଟ',
      target_exam: 'OSSC CGL',
      duration_minutes: 15,
      total_marks: 20,
      negative_marking: 0.25,
      qs: [
        ['Which shortcut opens Task Manager directly in Windows?', 'Ctrl + Alt + F4', 'Ctrl + Shift + Esc', 'Alt + Tab', 'Win + L', 'B', 'Ctrl + Shift + Esc opens Windows Task Manager directly without going through the security screen.'],
        ['If a candidate scores 72 out of 120 marks, what is the percentage?', '55%', '60%', '62.5%', '65%', 'B', '(72 / 120) * 100 = 60%.'],
        ['In Odia grammar, "ଉତ୍କଳ" + "ମଣି" combines under which Sandhi rule?', 'Swara Sandhi', 'Vyanjana Sandhi', 'Visarga Sandhi', 'Samasa', 'B', 'The consonant ending + consonant beginning forms Vyanjana Sandhi (ଉତ୍କଳମଣି).'],
        ['Which Constitutional Amendment lowered the voting age in India from 21 to 18?', '42nd Amendment', '44th Amendment', '61st Amendment', '73rd Amendment', 'C', 'The 61st Constitutional Amendment Act of 1988 reduced the voting age to 18 years.'],
        ['Which district of Odisha shares borders with Chhattisgarh and houses Hirakud Reservoir?', 'Jharsuguda / Sambalpur / Bargarh', 'Puri', 'Kendrapara', 'Jagatsinghpur', 'A', 'Hirakud Dam on the Mahanadi River is primarily in Sambalpur/Jharsuguda/Bargarh western Odisha belt.']
      ]
    }
  ];

  for (const t of sampleTests) {
    stmts.push(
      `INSERT INTO mock_tests (id, slug, title, title_or, target_exam, duration_minutes, total_marks, negative_marking, status, published_at, updated_at)
VALUES (${sqlStr(t.id)}, ${sqlStr(t.slug)}, ${sqlStr(t.title)}, ${sqlStr(t.title_or)}, ${sqlStr(t.target_exam)}, ${sqlInt(t.duration_minutes)}, ${Number(t.total_marks)}, ${Number(t.negative_marking)}, 'published', datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  title_or=COALESCE(mock_tests.title_or, excluded.title_or),
  status=CASE WHEN mock_tests.status='draft' THEN 'published' ELSE mock_tests.status END,
  deleted_at=NULL;`
    );
    t.qs.forEach((q, idx) => {
      const qid = `${t.id}-q${idx + 1}`;
      stmts.push(
        `INSERT OR IGNORE INTO mock_questions (id, test_id, position, section, question_en, option_a, option_b, option_c, option_d, correct_option, explanation, marks)
VALUES (${sqlStr(qid)}, ${sqlStr(t.id)}, ${sqlInt(idx + 1)}, 'General Studies', ${sqlStr(q[0])}, ${sqlStr(q[1])}, ${sqlStr(q[2])}, ${sqlStr(q[3])}, ${sqlStr(q[4])}, ${sqlStr(q[5])}, ${sqlStr(q[6])}, 4);`
      );
    });
  }

  const sampleResources = [
    ['res-opsc-oas-syllabus', 'syllabus', 'OPSC Civil Services (OAS) Prelims & Mains Complete Syllabus', 'OPSC OAS', 2026, 'Official GS-I, CSAT, Mains GS papers & Odia qualifying syllabus breakdown.', 'external:https://www.opsc.gov.in/'],
    ['res-ossc-cgl-pyq', 'pyq', 'OSSC CGLRE Previous Year Solved Question Bank (2022–2025)', 'OSSC CGL', 2025, 'Compiled Prelims + Mains arithmetic, reasoning, DI, and Odisha GK papers.', 'external:https://www.ossc.gov.in/'],
    ['res-osssc-ri-guide', 'study_material', 'OSSSC RI / ARI / Amin Odisha GK & Computer Compendium', 'OSSSC Combined', 2026, 'High-yield Odisha geography, districts, rivers, schemes, and MS Office shortcuts.', 'external:https://www.osssc.gov.in/']
  ];
  for (const [id, kind, title, exam, year, description, mediaKey] of sampleResources) {
    stmts.push(
      `INSERT OR IGNORE INTO resources (id, kind, title, exam, year, description, media_key, status, published_at, created_at, updated_at)
VALUES (${sqlStr(id)}, ${sqlStr(kind)}, ${sqlStr(title)}, ${sqlStr(exam)}, ${sqlInt(year)}, ${sqlStr(description)}, ${sqlStr(mediaKey)}, 'published', datetime('now'), datetime('now'), datetime('now'));`
    );
  }
  return stmts;
}

function main() {
  console.log(`[seed-ecosystem-d1] Mode: ${modeFlag}${dryRun ? ' (dry-run)' : ''}`);

  const stmts = [];
  if (!dryRun) {
    const postCols = getExistingColumns('posts');
    const missingPostCols = [
      ['goal_exam_ids', `TEXT DEFAULT '[]'`],
      ['age_limit', 'TEXT'],
      ['salary_pay', 'TEXT'],
      ['source_url', 'TEXT'],
      ['alert_sent_at', 'TEXT']
    ];
    for (const [col, def] of missingPostCols) {
      if (!postCols.has(col)) {
        stmts.push(`ALTER TABLE posts ADD COLUMN ${col} ${def};`);
      }
    }
  }

  stmts.push(...buildDirectorySql());
  stmts.push(...buildSchemesSql());
  stmts.push(...buildPostsSql());
  stmts.push(...buildMockTestsAndResourcesSql());

  const sqlText = stmts.join('\n');
  if (dryRun) {
    console.log(`[seed-ecosystem-d1] Generated ${stmts.length} SQL statements (${Buffer.byteLength(sqlText)} bytes).`);
    return;
  }

  const tmpFile = path.join(os.tmpdir(), `cso-seed-${crypto.randomUUID()}.sql`);
  fs.writeFileSync(tmpFile, sqlText, 'utf8');
  try {
    console.log(`[seed-ecosystem-d1] Executing ${stmts.length} statements on ${modeFlag}...`);
    runWranglerD1(tmpFile, true);
    const countsRaw = runWranglerD1(
      `SELECT 'jobs_dir_lvl_' || level AS metric, COUNT(*) AS cnt FROM jobs_directory_nodes GROUP BY level;
       SELECT 'schemes_directory' AS metric, COUNT(*) AS cnt FROM schemes_directory WHERE deleted_at IS NULL
       UNION ALL SELECT 'posts_jobs_live', COUNT(*) FROM posts WHERE type='job' AND deleted_at IS NULL AND status IN ('published','expired')
       UNION ALL SELECT 'posts_ca_live', COUNT(*) FROM posts WHERE type='current_affair' AND deleted_at IS NULL AND status='published'
       UNION ALL SELECT 'mock_tests_live', COUNT(*) FROM mock_tests WHERE deleted_at IS NULL AND status='published'
       UNION ALL SELECT 'resources_live', COUNT(*) FROM resources WHERE deleted_at IS NULL AND status='published';`,
      false
    );
    const parsedCounts = JSON.parse(countsRaw.slice(countsRaw.indexOf('[')));
    const rows = parsedCounts.flatMap((statementRes) => statementRes?.results || []);
    console.table(rows);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

main();
