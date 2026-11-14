#!/usr/bin/env node
/**
 * Idempotent D1 Seeder for Schemes & Benefits (`schemes_directory_nodes` + `schemes_directory`).
 * 1. Extracts all 8 groups, 28 sections, 162 subcategories, and 1,066 entries (1,264 nodes)
 *    from `schemes-benefits/generated/directory.json` with bilingual Odia metadata.
 * 2. Upserts 25+ comprehensive Odisha & Central welfare/scholarship schemes into
 *    `schemes_directory` with structured docs checklist, steps, disbursement mode,
 *    official helplines, verification dates, status windows, and exam links.
 *
 * Usage:
 *   node scripts/seed-schemes-tree-d1.mjs --local
 *   NODE_OPTIONS="--dns-result-order=ipv4first" node scripts/seed-schemes-tree-d1.mjs --remote
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

function sqlIntOrNull(v) {
  if (v === null || v === undefined || v === '') return 'NULL';
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.trunc(n)) : 'NULL';
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
  return execFileSync('npx', cmdArgs, {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

const GROUP_META = {
  '01': {
    slug: 'government-and-public-welfare',
    icon: '🏛️',
    title_or: 'ସରକାରୀ ଓ ଜନ କଲ୍ୟାଣ ଯୋଜନା',
    subtitle: 'Central, Odisha State & local governance public welfare missions',
    subtitle_or: 'କେନ୍ଦ୍ର, ଓଡ଼ିଶା ରାଜ୍ୟ ଏବଂ ସ୍ଥାନୀୟ ଶାସନ ଜନକଲ୍ୟାଣ ମିଶନ',
    badge: 'State & Central',
    official_url: 'https://odisha.gov.in/'
  },
  '02': {
    slug: 'education-employment-and-talent',
    icon: '🎓',
    title_or: 'ଶିକ୍ଷା, ନିଯୁକ୍ତି ଓ ପ୍ରତିଭା ବିକାଶ',
    subtitle: 'Scholarships, skill development, apprenticeships, youth & sports grants',
    subtitle_or: 'ବୃତ୍ତି, ଦକ୍ଷତା ବିକାଶ, ତାଲିମ, ଯୁବ ଓ କ୍ରୀଡ଼ା ସହାୟତା',
    badge: 'Students & Youth',
    official_url: 'https://scholarship.odisha.gov.in/'
  },
  '03': {
    slug: 'agriculture-business-and-livelihoods',
    icon: '🌾',
    title_or: 'କୃଷି, ବ୍ୟବସାୟ ଓ ଜୀବିକା',
    subtitle: 'Farmers, fisheries, MSME finance, SHGs, cooperatives, handloom & crafts',
    subtitle_or: 'ଚାଷୀ, ମତ୍ସ୍ୟଚାଷ, MSME ଋଣ, ସ୍ୱୟଂ ସହାୟକ ଗୋଷ୍ଠୀ ଓ ହସ୍ତତନ୍ତ',
    badge: 'Livelihoods',
    official_url: 'https://krushak.odisha.gov.in/'
  },
  '04': {
    slug: 'health-housing-and-financial-protection',
    icon: '🏥',
    title_or: 'ସ୍ୱାସ୍ଥ୍ୟ, ଆବାସ ଓ ଆର୍ଥିକ ସୁରକ୍ଷା',
    subtitle: 'Cashless healthcare, pucca housing, pensions, insurance & disaster relief',
    subtitle_or: 'ନଗଦହୀନ ଚିକିତ୍ସା, ପକ୍କା ଘର, ଭତ୍ତା, ବୀମା ଓ ବିପର୍ଯ୍ୟୟ ସହାୟତା',
    badge: 'Social Security',
    official_url: 'https://rhodisha.gov.in/'
  },
  '05': {
    slug: 'communities-and-special-beneficiaries',
    icon: '🤝',
    title_or: 'ସମ୍ପ୍ରଦାୟ ଓ ବିଶେଷ ହିତାଧିକାରୀ',
    subtitle: 'Women empowerment, tribal & SC/ST welfare, pensioners & migrant workers',
    subtitle_or: 'ମହିଳା ସଶକ୍ତିକରଣ, ଜନଜାତି ଓ SC/ST କଲ୍ୟାଣ, ପ୍ରବାସୀ ଶ୍ରମିକ',
    badge: 'Targeted Aid',
    official_url: 'https://stscodisha.gov.in/'
  },
  '06': {
    slug: 'private-global-and-innovation-support',
    icon: '🔬',
    title_or: 'ଘରୋଇ, ବିଶ୍ୱସ୍ତରୀୟ ଓ ନବସୃଜନ ସହାୟତା',
    subtitle: 'CSR fellowships, science/R&D grants, clean energy & international aid',
    subtitle_or: 'CSR ଫେଲୋସିପ୍, ବିଜ୍ଞାନ ଗବେଷଣା, ସବୁଜ ଶକ୍ତି ଓ ଆନ୍ତର୍ଜାତୀୟ ସହାୟତା',
    badge: 'Grants & Green',
    official_url: 'https://www.myscheme.gov.in/'
  },
  '07': {
    slug: 'find-schemes-and-check-eligibility',
    icon: '🎯',
    title_or: 'ଯୋଜନା ଖୋଜନ୍ତୁ ଓ ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ',
    subtitle: 'Browse by life stage, benefit format, income bracket & application readiness',
    subtitle_or: 'ଜୀବନ ସ୍ଥିତି, ସହାୟତା ପ୍ରକାର, ଆୟ ସୀମା ଓ ଆବେଦନ ସ୍ତର ଅନୁଯାୟୀ ଖୋଜନ୍ତୁ',
    badge: 'Decision Tool',
    official_url: 'https://www.myscheme.gov.in/'
  },
  '08': {
    slug: 'citizen-services-and-verification',
    icon: '🛡️',
    title_or: 'ନାଗରିକ ସେବା ଓ ସରକାରୀ ଯାଞ୍ଚ',
    subtitle: 'Mo Seba Kendra, e-District certificates, RTI grievances & .gov.in portal checks',
    subtitle_or: 'ମୋ ସେବା କେନ୍ଦ୍ର, ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ପ୍ରମାଣପତ୍ର, ଅଭିଯୋଗ ଓ .gov.in ଯାଞ୍ଚ',
    badge: 'Trust & Portals',
    official_url: 'https://edistrict.odisha.gov.in/'
  }
};

const SECTION_OR_MAP = {
  '1': { or: 'ସରକାରୀ ଯୋଜନା', icon: '🏛️', url: 'https://www.myscheme.gov.in/' },
  '2': { or: 'ଜନ କଲ୍ୟାଣ ଓ ଅତ୍ୟାବଶ୍ୟକ ସୁବିଧା', icon: '🍲', url: 'https://foododisha.in/' },
  '3': { or: 'ଶିକ୍ଷା, ଛାତ୍ରଛାତ୍ରୀ ଓ ଶିକ୍ଷାଗତ ସହାୟତା', icon: '🎓', url: 'https://scholarship.odisha.gov.in/' },
  '4': { or: 'ନିଯୁକ୍ତି, ଦକ୍ଷତା ଓ ଆତ୍ମନିର୍ଭରଶୀଳତା', icon: '💼', url: 'https://skillodisha.gov.in/' },
  '5': { or: 'କୃଷି, ଚାଷୀ, ମତ୍ସ୍ୟଚାଷ ଓ ଗ୍ରାମ୍ୟ ବିକାଶ', icon: '🌾', url: 'https://krushak.odisha.gov.in/' },
  '6': { or: 'ବ୍ୟବସାୟ, ଅର୍ଥ, ଉଦ୍ୟମିତା ଓ ଶିଳ୍ପ', icon: '🏭', url: 'https://msmeodisha.gov.in/' },
  '7': { or: 'ସ୍ୱାସ୍ଥ୍ୟସେବା, ପୁଷ୍ଟି ଓ ଆବାସ ସୁବିଧା', icon: '🏥', url: 'https://health.odisha.gov.in/' },
  '8': { or: 'ବୀମା, ପେନସନ୍, ଆଇନଗତ ସହାୟତା ଓ ଆର୍ଥିକ ସୁରକ୍ଷା', icon: '🛡️', url: 'https://ssepd.odisha.gov.in/' },
  '9': { or: 'ବିପର୍ଯ୍ୟୟ ରିଲିଫ୍ ଓ ଜରୁରୀକାଳୀନ ସହାୟତା', icon: '🆘', url: 'https://osdma.org/' },
  '10': { or: 'ଘରୋଇ କମ୍ପାନୀ, CSR, ଫାଉଣ୍ଡେସନ୍ ଓ NGO', icon: '🏢', url: 'https://www.buddy4study.com/' },
  '11': { or: 'ଆନ୍ତର୍ଜାତୀୟ ଯୋଜନା ଓ ବିଶ୍ୱସ୍ତରୀୟ ବିକାଶ', icon: '🌍', url: 'https://www.education.gov.in/' },
  '12': { or: 'ମହିଳା ସଶକ୍ତିକରଣ, ସମାନତା ଓ ସୁରକ୍ଷା', icon: '👩', url: 'https://wcd.odisha.gov.in/' },
  '13': { or: 'ଯୁବ, କ୍ରୀଡ଼ା, କଳା, ସଂସ୍କୃତି ଓ ପ୍ରତିଭା', icon: '🏅', url: 'https://sportsodisha.gov.in/' },
  '14': { or: 'ବିଜ୍ଞାନ, ଗବେଷଣା, ନବସୃଜନ ଓ ପ୍ରଯୁକ୍ତି ଅନୁଦାନ', icon: '🔬', url: 'https://dstodisha.gov.in/' },
  '15': { or: 'ପରିବେଶ, ଶକ୍ତି, ସଂରକ୍ଷଣ ଓ ସ୍ଥାୟୀ ବିକାଶ', icon: '🌿', url: 'https://pmsuryaghar.gov.in/' },
  '16': { or: 'ଆବାସ, ଜମି, ସମ୍ପତ୍ତି ଓ ସାମୁଦାୟିକ ଭିତ୍ତିଭୂମି', icon: '🏠', url: 'https://rhodisha.gov.in/' },
  '17': { or: 'ଜନଜାତି, ସାମାଜିକ ନ୍ୟାୟ ଓ ସମ୍ପ୍ରଦାୟ ବିକାଶ', icon: '🪶', url: 'https://stscodisha.gov.in/' },
  '18': { or: 'ସରକାରୀ କର୍ମଚାରୀ, ପେନସନଭୋଗୀ ଓ ପୂର୍ବତନ ସୈନିକ', icon: '🎖️', url: 'https://finance.odisha.gov.in/' },
  '19': { or: 'ସମବାୟ, ସ୍ୱୟଂ ସହାୟକ ଗୋଷ୍ଠୀ ଓ ସାମୂହିକ ଉଦ୍ୟମ', icon: '🤲', url: 'https://missionshakti.odisha.gov.in/' },
  '20': { or: 'ପର୍ଯ୍ୟଟନ, ହସ୍ତତନ୍ତ, ହସ୍ତଶିଳ୍ପ ଓ ପାରମ୍ପରିକ ବୃତ୍ତି', icon: '🧵', url: 'https://handlooms.odisha.gov.in/' },
  '21': { or: 'ପ୍ରବାସୀ ଶ୍ରମିକ, ବିଦେଶୀ କର୍ମଚାରୀ ଓ ପ୍ରତ୍ୟାବର୍ତ୍ତନକାରୀ', icon: '🚆', url: 'https://labour.odisha.gov.in/' },
  '22': { or: 'ଜନସେବା ପ୍ରାପ୍ତି, ନାଗରିକ ଅଧିକାର ଓ ଅଭିଯୋଗ', icon: '⚖️', url: 'https://edistrict.odisha.gov.in/' },
  '23': { or: 'ହିତଧିକାରୀ ଅନୁଯାୟୀ ଯୋଜନା ଖୋଜନ୍ତୁ', icon: '🧑‍🤝‍🧑', url: 'https://www.myscheme.gov.in/' },
  '24': { or: 'ସହାୟତା ପ୍ରକାର ଅନୁଯାୟୀ ଯୋଜନା', icon: '💡', url: 'https://www.myscheme.gov.in/' },
  '25': { or: 'ଯୋଗ୍ୟତା ଓ ଆବେଦନ ପର୍ଯ୍ୟାୟ ଅନୁଯାୟୀ ଯୋଜନା', icon: '✅', url: 'https://www.myscheme.gov.in/' },
  '26': { or: 'ଯୋଜନା କର୍ତ୍ତୃପକ୍ଷ, ସରକାରୀ ପୋର୍ଟାଲ୍ ଓ ଯାଞ୍ଚ', icon: '🔗', url: 'https://odisha.gov.in/' },
  '27': { or: 'ଓଡ଼ିଶା-କେନ୍ଦ୍ରିତ ଯୋଜନା ଓ ସୁବିଧା ଡିରେକ୍ଟୋରୀ', icon: '🟢', url: 'https://odisha.gov.in/' },
  '28': { or: 'CSO ଯୋଜନା ବିଶ୍ୱାସ ସ୍ତର ଓ ଜନସଚେତନତା', icon: '🛡️', url: 'https://csodisha.com/about/' }
};

function buildTreeNodes() {
  const dirPath = path.join(ROOT, 'schemes-benefits/generated/directory.json');
  const raw = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const nav = Array.isArray(raw.navigation) ? raw.navigation : [];
  const usedSlugs = new Set();
  const rows = [];

  function claimSlug(preferred, fallbackPrefix) {
    let base = slugify(preferred) || slugify(fallbackPrefix) || 'node';
    if (!usedSlugs.has(base)) {
      usedSlugs.add(base);
      return base;
    }
    const prefixed = slugify(`${fallbackPrefix}-${base}`).slice(0, 88);
    if (!usedSlugs.has(prefixed)) {
      usedSlugs.add(prefixed);
      return prefixed;
    }
    let idx = 2;
    while (usedSlugs.has(`${prefixed}-${idx}`)) idx++;
    const finalSlug = `${prefixed}-${idx}`;
    usedSlugs.add(finalSlug);
    return finalSlug;
  }

  nav.forEach((group, gIdx) => {
    const gNum = String(group.number || String(gIdx + 1).padStart(2, '0'));
    const gMeta = GROUP_META[gNum] || {};
    const gSlug = claimSlug(gMeta.slug || group.title, `grp-${gNum}`);
    const gId = `sch-node-g-${gNum}`;
    rows.push({
      id: gId,
      slug: gSlug,
      parent_slug: null,
      level: 'group',
      title: group.title,
      title_or: gMeta.title_or || '',
      subtitle: gMeta.subtitle || '',
      subtitle_or: gMeta.subtitle_or || '',
      badge_text: gMeta.badge || `Group ${gNum}`,
      icon_name: gMeta.icon || '🗂️',
      official_url: gMeta.official_url || '',
      metadata_json: JSON.stringify({ number: gNum, rawId: group.id || '' }),
      sort_order: (gIdx + 1) * 10
    });

    const secs = group.sections || group.children || [];
    secs.forEach((sec, sIdx) => {
      const sNum = String(sec.number || `${gIdx + 1}-${sIdx + 1}`);
      const sMeta = SECTION_OR_MAP[sNum] || {};
      const sSlug = claimSlug(sec.title, `sec-${sNum}`);
      const sId = `sch-node-s-${sNum}-${sIdx + 1}`;
      rows.push({
        id: sId,
        slug: sSlug,
        parent_slug: gSlug,
        level: 'section',
        title: sec.title,
        title_or: sMeta.or || '',
        subtitle: `Section ${sNum} · ${group.title}`,
        subtitle_or: sMeta.or ? `ବିଭାଗ ${sNum} · ${gMeta.title_or || ''}` : '',
        badge_text: `Section ${sNum}`,
        icon_name: sMeta.icon || '📁',
        official_url: sMeta.url || gMeta.official_url || '',
        metadata_json: JSON.stringify({ number: sNum, group: gSlug }),
        sort_order: (sIdx + 1) * 10
      });

      const subs = sec.children || [];
      subs.forEach((sub, subIdx) => {
        const subNum = String(sub.number || `${sNum}.${subIdx + 1}`);
        const subSlug = claimSlug(`${subNum.replace(/\./g, '-')}-${sub.title}`, `sub-${sNum}-${subIdx + 1}`);
        const subId = `sch-node-sub-${subNum.replace(/[^a-zA-Z0-9]/g, '-')}-${subIdx + 1}`;
        rows.push({
          id: subId,
          slug: subSlug,
          parent_slug: sSlug,
          level: 'subcategory',
          title: sub.title,
          title_or: '',
          subtitle: `${sec.title}`,
          subtitle_or: '',
          badge_text: subNum,
          icon_name: '📋',
          official_url: sMeta.url || '',
          metadata_json: JSON.stringify({ number: subNum, section: sNum, group: gSlug }),
          sort_order: (subIdx + 1) * 10
        });

        const entries = sub.children || [];
        entries.forEach((entry, eIdx) => {
          const eNum = String(entry.number || `${subNum}.${eIdx + 1}`);
          const eSlug = claimSlug(`${eNum.replace(/\./g, '-')}-${entry.title}`, `ent-${subIdx + 1}-${eIdx + 1}`);
          const eId = `sch-node-ent-${eNum.replace(/[^a-zA-Z0-9]/g, '-')}-${eIdx + 1}`;
          rows.push({
            id: eId,
            slug: eSlug,
            parent_slug: subSlug,
            level: 'entry',
            title: entry.title,
            title_or: '',
            subtitle: `${sub.title}`,
            subtitle_or: '',
            badge_text: eNum,
            icon_name: '📝',
            official_url: '',
            metadata_json: JSON.stringify({ number: eNum, subcategory: subNum, section: sNum, group: gSlug }),
            sort_order: (eIdx + 1) * 10
          });
        });
      });
    });
  });

  return rows;
}

const FLAGSHIP_SCHEMES = [
  {
    id: 'sch-subhadra-yojana',
    slug: 'subhadra-yojana-odisha',
    title: 'Subhadra Yojana (Odisha Women Financial Assistance)',
    title_or: 'ସୁଭଦ୍ରା ଯୋଜନା (ଓଡ଼ିଶା ମହିଳା ଆର୍ଥିକ ସହାୟତା)',
    summary: 'Flagship Government of Odisha DBT assistance providing ₹10,000 per year (₹50,000 over 5 years) directly to eligible women aged 21–60 years.',
    summary_or: 'ଓଡ଼ିଶା ସରକାରଙ୍କ ପ୍ରମୁଖ ଯୋଜନା: ୨୧ ରୁ ୬୦ ବର୍ଷର ଯୋଗ୍ୟ ମହିଳାଙ୍କୁ ବାର୍ଷିକ ₹୧୦,୦୦୦ (୫ ବର୍ଷରେ ₹୫୦,୦୦୦) DBT ସହାୟତା।',
    body_md: '### Key Benefits\n- **₹10,000/year** in two ₹5,000 DBT instalments (Raksha Bandhan & International Women’s Day).\n- Subhadra Debit Card & digital transaction incentive.\n\n### Core Exclusions\n- Regular govt/PSU employees, income-tax payees, and families with >5 acres irrigated land or 4-wheeler (other than tractor/mini-truck/two-wheeler).',
    body_md_or: '### ମୁଖ୍ୟ ସୁବିଧା\n- ପ୍ରତିବର୍ଷ ଦୁଇଟି କିସ୍ତିରେ ₹୫,୦୦୦ + ₹୫,୦୦୦ = **₹୧୦,୦୦୦** ସିଧାସଳଖ ଆଧାର-ଲିଙ୍କ୍ ବ୍ୟାଙ୍କ ଖାତାକୁ।',
    category: 'Women & Child',
    department: 'Women & Child Development Dept, Govt of Odisha',
    gov_level: 'Odisha',
    target_groups: ['women', 'shg', 'rural', 'urban'],
    min_age: 21,
    max_age: 60,
    max_income: 250000,
    gender_eligible: 'female',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹10,000/year (₹50,000 over 5 years via DBT)',
    benefit_summary_or: 'ବାର୍ଷିକ ₹୧୦,୦୦୦ (୫ ବର୍ଷରେ ₹୫୦,୦୦୦ DBT)',
    documents_required: ['NFSA/SFSA Ration Card (or Family Self-Declaration)', 'Aadhaar Card (e-KYC)', 'Aadhaar-Seeded NPCI Bank Account', 'Mobile linked with Aadhaar'],
    required_docs: [
      { doc: 'Aadhaar Card with updated e-KYC', where: 'UIDAI / CSC / Mo Seba Kendra', mandatory: true },
      { doc: 'Single-holder Aadhaar-seeded Bank Account (NPCI DBT enabled)', where: 'Bank Branch / IPPB', mandatory: true },
      { doc: 'NFSA or SFSA Ration Card (income & household check)', where: 'Food Supplies Portal / PDS Dealer', mandatory: false }
    ],
    application_steps: [
      'Complete Aadhaar e-KYC and verify NPCI DBT mapping at your bank branch.',
      'Collect free Subhadra application form from Anganwadi Centre or Mo Seba Kendra.',
      'Submit filled form + Aadhaar biometrics for instant receipt acknowledgement.',
      'Track beneficiary list & DBT instalment status on subhadra.odisha.gov.in.'
    ],
    disbursement_mode: 'DBT (Aadhaar-NPCI Bank Transfer)',
    helpline: '14678 (Subhadra Toll-Free Helpline)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://subhadra.odisha.gov.in/',
    sort_order: 10,
    is_featured: 1
  },
  {
    id: 'sch-post-matric-odisha',
    slug: 'odisha-state-scholarship-post-matric',
    title: 'Odisha State Post-Matric Scholarship',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି',
    summary: 'Unified state portal scholarship for SC, ST, OBC/SEBC, and EBC students pursuing +2, Graduation, PG, Technical & Professional courses.',
    summary_or: 'SC, ST, OBC/SEBC ଓ EBC ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ +୨, ସ୍ନାତକ, ସ୍ନାତକୋତ୍ତର ଓ ବୈଷୟିକ ଶିକ୍ଷା ପାଇଁ ବାର୍ଷିକ ବୃତ୍ତି।',
    body_md: '### Coverage\n- Maintenance allowance + compulsory non-refundable tuition fee reimbursement directly to student Aadhaar-seeded account.',
    body_md_or: '### ସୁବିଧା\n- ପାଠ୍ୟକ୍ରମ ଫି ଓ ହଷ୍ଟେଲ/ଭତ୍ତା ସହାୟତା ସିଧାସଳଖ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ବ୍ୟାଙ୍କ ଖାତାରେ।',
    category: 'Scholarship',
    department: 'ST & SC Development / Higher Education Dept, Odisha',
    gov_level: 'Odisha',
    target_groups: ['students', 'youth'],
    min_age: 15,
    max_age: 35,
    max_income: 250000,
    gender_eligible: 'all',
    beneficiary_categories: ['sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹3,000 – ₹15,000+ /yr + Fee Reimbursement',
    benefit_summary_or: 'ବାର୍ଷିକ ₹୩,୦୦୦ – ₹୧୫,୦୦୦+ ଓ ଟ୍ୟୁସନ୍ ଫି ଫେରସ୍ତ',
    documents_required: ['Aadhaar Card', 'Caste Certificate (e-District)', 'Income Certificate (≤ ₹2.5L)', 'College Bonafide & Last Marksheet', 'Active Bank Passbook'],
    required_docs: [
      { doc: 'e-District Caste & Residence Certificate', where: 'edistrict.odisha.gov.in / Tahasil', mandatory: true },
      { doc: 'Annual Family Income Certificate (≤ ₹2.5 Lakh)', where: 'edistrict.odisha.gov.in', mandatory: true },
      { doc: 'College Admission Receipt & Previous Year Marksheet', where: 'Institution Nodal Officer', mandatory: true },
      { doc: 'Student NPCI-linked Bank Passbook', where: 'Bank Branch', mandatory: true }
    ],
    application_steps: [
      'Register on scholarship.odisha.gov.in with Aadhaar OTR.',
      'Select Post-Matric scheme, academic year, and upload e-District certificates.',
      'Submit online application and take printout for Institute Principal verification.',
      'Track DWO/Department approval and DBT credit status online.'
    ],
    disbursement_mode: 'DBT via Odisha State Scholarship Portal',
    helpline: '155335 / 1800-345-6770',
    verified_date: '2026-11-10',
    application_status_label: 'Renewal Window Open',
    exam_slug: 'opsc-oas',
    apply_url: 'https://scholarship.odisha.gov.in/',
    sort_order: 20,
    is_featured: 1
  },
  {
    id: 'sch-cm-kisan-odisha',
    slug: 'cm-kisan-yojana-odisha',
    title: 'CM-KISAN Yojana (Farmer & Landless Agricultural Household Support)',
    title_or: 'ସିଏମ୍-କିଷାନ ଯୋଜନା (ଚାଷୀ ଓ ଭୂମିହୀନ କୃଷି ପରିବାର ସହାୟତା)',
    summary: 'Odisha state crop & livelihood support providing ₹4,000/yr to small/marginal farmers and ₹12,500 over 3 instalments to landless agricultural households.',
    summary_or: 'କ୍ଷୁଦ୍ର ଓ ନାମମାତ୍ର ଚାଷୀଙ୍କୁ ବାର୍ଷିକ ₹୪,୦୦୦ (ଖରିଫ୍ ଓ ରବି) ଏବଂ ଭୂମିହୀନ କୃଷି ପରିବାରକୁ ₹୧୨,୫୦୦ ଆର୍ଥିକ ସହାୟତା।',
    body_md: '### Key Highlights\n- **Small & Marginal Farmers**: ₹2,000 during Nuakhai (Kharif) + ₹2,000 during Akshaya Tritiya (Rabi).\n- **Landless Households**: ₹12,500 across 3 instalments for goat rearing, poultry, fishery, or mushroom farming.',
    body_md_or: '### ମୁଖ୍ୟ ତଥ୍ୟ\n- କ୍ଷୁଦ୍ର ଚାଷୀଙ୍କୁ ନୂଆଖାଇ ଓ ଅକ୍ଷୟ ତୃତୀୟାରେ ₹୨,୦୦୦ ଲେଖାଏଁ ₹୪,୦୦୦ ସହାୟତା।',
    category: 'Farmers & Rural',
    department: 'Agriculture & Farmers Empowerment Dept, Odisha',
    gov_level: 'Odisha',
    target_groups: ['farmers', 'rural'],
    min_age: 18,
    max_age: null,
    max_income: 200000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹4,000/yr (Farmers) · ₹12,500 total (Landless)',
    benefit_summary_or: 'ଚାଷୀଙ୍କୁ ₹୪,୦୦୦/ବର୍ଷ · ଭୂମିହୀନଙ୍କୁ ₹୧୨,୫୦୦',
    documents_required: ['Aadhaar Card', 'Ration Card', 'Land RoR (Patta) / Krushak Odisha ID', 'Bank Passbook (NPCI seeded)'],
    required_docs: [
      { doc: 'Krushak Odisha Farmer ID & Aadhaar', where: 'krushak.odisha.gov.in', mandatory: true },
      { doc: 'Land RoR (Patta) or Landless Agri Self-Declaration', where: 'Bhulekh / GP Nodal', mandatory: true },
      { doc: 'NPCI Aadhaar-Seeded Bank Account', where: 'Bank / PACS', mandatory: true }
    ],
    application_steps: [
      'Complete farmer e-KYC verification via Krushak Odisha or GP Krushak Sathi.',
      'Apply/update household category (SMF or Landless) on cmkisan.odisha.gov.in.',
      'Check Block-level verification and instalment credit status online.'
    ],
    disbursement_mode: 'DBT (Kharif & Rabi Seasonal Transfer)',
    helpline: '155333 / 1800-180-1551 (Ama Krushi)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://cmkisan.odisha.gov.in/',
    sort_order: 30,
    is_featured: 1
  },
  {
    id: 'sch-gopabandhu-jan-arogya',
    slug: 'gopabandhu-jan-arogya-bsky-odisha',
    title: 'Gopabandhu Jan Arogya Yojana & Ayushman Bharat Convergence',
    title_or: 'ଗୋପବନ୍ଧୁ ଜନ ଆରୋଗ୍ୟ ଯୋଜନା ଓ ଆୟୁଷ୍ମାନ ଭାରତ',
    summary: 'Cashless secondary and tertiary medical treatment up to ₹5 Lakh per family (plus additional ₹5 Lakh for women members) across empaneled hospitals.',
    summary_or: 'ପ୍ରତି ପରିବାରକୁ ₹୫ ଲକ୍ଷ (ଏବଂ ମହିଳା ସଦସ୍ୟଙ୍କ ପାଇଁ ଅତିରିକ୍ତ ₹୫ ଲକ୍ଷ, ମୋଟ ₹୧୦ ଲକ୍ଷ) ପର୍ଯ୍ୟନ୍ତ ନଗଦହୀନ ଚିକିତ୍ସା ସୁବିଧା।',
    body_md: '### Coverage\n- Integrated state + central converged health assurance across 27,000+ hospitals nationwide with zero paper admission hassle for Ration Card holders.',
    body_md_or: '### ଚିକିତ୍ସା ସୁବିଧା\n- ତାଲିକାଭୁକ୍ତ ସରକାରୀ ଓ ଘରୋଇ ଡାକ୍ତରଖାନାରେ ₹୧୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ମାଗଣା ଚିକିତ୍ସା।',
    category: 'Healthcare',
    department: 'Health & Family Welfare Dept, Odisha / NHA',
    gov_level: 'Odisha',
    target_groups: ['families', 'women', 'senior', 'rural', 'urban'],
    min_age: null,
    max_age: null,
    max_income: 120000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: 'Up to ₹10 Lakh/family/year cashless hospital cover',
    benefit_summary_or: 'ପରିବାର ପିଛା ₹୧୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ନଗଦହୀନ ସ୍ୱାସ୍ଥ୍ୟ ବୀମା',
    documents_required: ['NFSA / SFSA Ration Card', 'Aadhaar Card of all family members', 'Unified Health Card e-KYC'],
    required_docs: [
      { doc: 'NFSA or SFSA Ration Card', where: 'Food Supplies Odisha', mandatory: true },
      { doc: 'Aadhaar e-KYC of Beneficiaries', where: 'Mo Seba Kendra / CSC / Hospital Helpdesk', mandatory: true }
    ],
    application_steps: [
      'Verify Ration Card family members on gopabandhujanarogya.odisha.gov.in.',
      'Complete Aadhaar e-KYC via BIS portal or Mo Seba Kendra to download digital Health Card.',
      'Present Card at Swasthya Mitra desk of any empaneled hospital for cashless admission.'
    ],
    disbursement_mode: 'Cashless Hospital Package Settlement',
    helpline: '104 / 155369 (Health Helpline)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://bsky.odisha.gov.in/',
    sort_order: 40,
    is_featured: 1
  },
  {
    id: 'sch-nuakhai-nua-odisha',
    slug: 'nua-o-scholarship-skilled-odisha',
    title: 'NUA-O / Skilled in Odisha Youth Training & Scholarship',
    title_or: 'ନୂଆ-ଓ / ସ୍କିଲ୍ଡ ଇନ୍ ଓଡ଼ିଶା ଯୁବ ତାଲିମ ଓ ବୃତ୍ତି',
    summary: 'Undergraduate/PG scholarship and industry-certified World Skill Center / OSDA youth technical skilling support across Odisha districts.',
    summary_or: 'ଓଡ଼ିଶାର କଲେଜ ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ ବାର୍ଷିକ ବୃତ୍ତି ଓ ବିଶ୍ୱ ଦକ୍ଷତା କେନ୍ଦ୍ର / OSDA ମାଧ୍ୟମରେ ମାଗଣା ନିଯୁକ୍ତିମୁଖୀ ତାଲିମ।',
    body_md: '### Key Focus\n- Annual educational grant + placement-linked NSQF vocational certification in IT, Mechatronics, EV, Healthcare & Hospitality.',
    body_md_or: '### ମୁଖ୍ୟ ଉଦ୍ଦେଶ୍ୟ\n- ଉଚ୍ଚଶିକ୍ଷା ଛାତ୍ରବୃତ୍ତି ଏବଂ NSQF ପ୍ରମାଣିତ ଦକ୍ଷତା ତାଲିମ ସହ ନିଯୁକ୍ତି ସୁଯୋଗ।',
    category: 'Youth & Skill',
    department: 'Skill Development & Technical Education / Higher Education Dept',
    gov_level: 'Odisha',
    target_groups: ['students', 'youth'],
    min_age: 17,
    max_age: 32,
    max_income: 800000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹9,000–₹11,000/yr scholarship & free placement training',
    benefit_summary_or: 'ବାର୍ଷିକ ₹୯,୦୦୦–₹୧୧,୦୦୦ ସହାୟତା ଓ ମାଗଣା ଦକ୍ଷତା ତାଲିମ',
    documents_required: ['Aadhaar Card', 'College / ITI Bonafide ID', 'Bank Passbook (Aadhaar seeded)', 'Odisha Residence Proof'],
    required_docs: [
      { doc: 'Aadhaar & College Enrollment Proof', where: 'Institution Principal', mandatory: true },
      { doc: 'Annual Family Income Proof (Non-IT Payee)', where: 'Parent Self-Declaration / e-District', mandatory: true }
    ],
    application_steps: [
      'Register on scholarship.odisha.gov.in or skillodisha.gov.in.',
      'Select UG/PG grant or World Skill Center trade.',
      'Complete Aadhaar e-KYC and college nodal verification.'
    ],
    disbursement_mode: 'DBT & Free Residential Skill Training',
    helpline: '155335 / 1800-345-6770',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: 'ossc-cgl',
    apply_url: 'https://skillodisha.gov.in/',
    sort_order: 50,
    is_featured: 1
  },
  {
    id: 'sch-madhu-babu-pension',
    slug: 'madhu-babu-pension-yojana-odisha',
    title: 'Madhu Babu Pension Yojana (Senior Citizens, Widows & PwD)',
    title_or: 'ମଧୁବାବୁ ପେନସନ୍ ଯୋଜନା (ବରିଷ୍ଠ ନାଗରିକ, ବିଧବା ଓ ଭିନ୍ନକ୍ଷମ)',
    summary: 'Monthly social security pension (enhanced ₹1,000–₹1,200+/month, up to ₹3,500 for ≥80% PwD & 80+ yrs) for vulnerable Odisha residents.',
    summary_or: 'ଓଡ଼ିଶାର ବରିଷ୍ଠ ନାଗରିକ, ବିଧବା, ଅବିବାହିତା ମହିଳା ଓ ଭିନ୍ନକ୍ଷମ ବ୍ୟକ୍ତିଙ୍କୁ ମାସିକ ₹୧,୦୦୦–₹୩,୫୦୦ ପେନସନ୍ ସହାୟତା।',
    body_md: '### Monthly Tiers\n- Enhanced pension scales by age (60–79 vs 80+) and disability severity (40–79% vs ≥80%).',
    body_md_or: '### ମାସିକ ଭତ୍ତା\n- ୬୦ ବର୍ଷରୁ ଊର୍ଦ୍ଧ୍ୱ ବୃଦ୍ଧ, ବିଧବା ଓ ଭିନ୍ନକ୍ଷମଙ୍କୁ ନିୟମିତ ମାସିକ ସାମାଜିକ ସୁରକ୍ଷା ଭତ୍ତା।',
    category: 'Social Security',
    department: 'SSEPD Dept, Govt of Odisha',
    gov_level: 'Odisha',
    target_groups: ['senior', 'pwd', 'women', 'rural', 'urban'],
    min_age: 18,
    max_age: null,
    max_income: 40000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹1,000 – ₹3,500/month lifelong pension support',
    benefit_summary_or: 'ମାସିକ ₹୧,୦୦୦ – ₹୩,୫୦୦ ଆଜୀବନ ଭତ୍ତା',
    documents_required: ['Age Proof / Voter ID / Aadhaar', 'Income Certificate / BPL Card', 'UDID Disability Certificate / Spouse Death Certificate'],
    required_docs: [
      { doc: 'Aadhaar & Age Proof (≥60 yrs for old-age)', where: 'Mo Seba Kendra / Block', mandatory: true },
      { doc: 'UDID Card (≥40% disability) or Spouse Death Certificate (Widow)', where: 'swavlambancard.gov.in / Registrar', mandatory: false },
      { doc: 'Income Proof (≤ ₹40,000/yr)', where: 'Tahasil / e-District', mandatory: true }
    ],
    application_steps: [
      'Apply online at ssepd.odisha.gov.in or via Block/ULB Gram Panchayat office.',
      'Upload Aadhaar, bank passbook, and eligibility certificate (UDID / Widow / Age).',
      'Receive Block Social Security Officer verification & GP monthly pension credit.'
    ],
    disbursement_mode: 'Monthly DBT / GP Cash Camp Disbursement',
    helpline: '1800-345-7150 (SSEPD Helpline)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://ssepd.odisha.gov.in/',
    sort_order: 60,
    is_featured: 1
  },
  {
    id: 'sch-mission-shakti-lakhpati',
    slug: 'mission-shakti-shg-lakhpati-didi',
    title: 'Mission Shakti SHG Interest-Free Loan & Lakhpati Didi Support',
    title_or: 'ମିଶନ ଶକ୍ତି SHG ବିନା ସୁଧ ଋଣ ଓ ଲକ୍ଷପତି ଦିଦି ସହାୟତା',
    summary: 'Interest-free (0% interest) bank linkage loans up to ₹10 Lakh for registered Women Self-Help Groups (SHGs) plus enterprise revolving grants.',
    summary_or: 'ପଞ୍ଜୀକୃତ ମହିଳା ସ୍ୱୟଂ ସହାୟକ ଗୋଷ୍ଠୀ (SHG) ମାନଙ୍କୁ ₹୧୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ୦% ସୁଧରେ ଋଣ ଓ ଉଦ୍ୟୋଗ ସହାୟତା।',
    body_md: '### Support Structure\n- 0% effective interest via subvention, Bank Sakhi facilitation, and market linkage under Mission Shakti.',
    body_md_or: '### ଋଣ ଓ ଉଦ୍ୟମ ସୁବିଧା\n- ଠିକ୍ ସମୟରେ ଋଣ ପରିଶୋଧ କରୁଥିବା SHG କୁ ୦% ସୁଧ ଓ ସାମୁହିକ ବ୍ୟବସାୟ ପାଇଁ ସହାୟତା।',
    category: 'Women & Child',
    department: 'Department of Mission Shakti, Govt of Odisha',
    gov_level: 'Odisha',
    target_groups: ['women', 'shg', 'rural'],
    min_age: 18,
    max_age: 65,
    max_income: 300000,
    gender_eligible: 'female',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '0% Interest Bank Loan up to ₹10 Lakh per SHG',
    benefit_summary_or: 'ପ୍ରତି SHG କୁ ₹୧୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ୦% ସୁଧ ଋଣ',
    documents_required: ['WSHG Registration & Resolution', 'SHG Joint Savings Account', 'Members Aadhaar & PAN'],
    required_docs: [
      { doc: 'Active Mission Shakti WSHG Resolution & Grading', where: 'GPLF / BLF / Mission Shakti Block Office', mandatory: true },
      { doc: 'SHG Bank Savings Account & Repayment Track', where: 'Linkage Bank Branch', mandatory: true }
    ],
    application_steps: [
      'Convene SHG meeting and pass Micro-Credit Plan (MCP) resolution.',
      'Submit loan application through Community Resource Person (CRP-CM) & Bank Mitra.',
      'Get 0% interest subvention credited directly to the SHG loan account on timely repayment.'
    ],
    disbursement_mode: 'Direct SHG Bank Credit + Subvention',
    helpline: '0674-2392115 (Mission Shakti Odisha)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://missionshakti.odisha.gov.in/',
    sort_order: 70,
    is_featured: 1
  },
  {
    id: 'sch-pm-kisan-national',
    slug: 'pm-kisan-samman-nidhi-national',
    title: 'PM-KISAN Samman Nidhi (Central Farmer Income Support)',
    title_or: 'ପିଏମ୍-କିଷାନ ସମ୍ମାନ ନିଧି (କେନ୍ଦ୍ର ଚାଷୀ ଆୟ ସହାୟତା)',
    summary: 'Central sector scheme transferring ₹6,000/year in three ₹2,000 instalments to landholding farmer families nationwide.',
    summary_or: 'ସାରା ଦେଶର ଜମିଧାରୀ ଚାଷୀ ପରିବାରଙ୍କୁ ୩ଟି କିସ୍ତିରେ ବାର୍ଷିକ ₹୬,୦୦୦ ସିଧାସଳଖ ବ୍ୟାଙ୍କ ଖାତାକୁ ସହାୟତା।',
    body_md: '### Key Conditions\n- Land records must be mutated in applicant’s name along with mandatory Aadhaar e-KYC and NPCI bank seeding.',
    body_md_or: '### ଯୋଗ୍ୟତା\n- ଚାଷୀଙ୍କ ନାମରେ ଜମି ପଟ୍ଟା (RoR), e-KYC ଏବଂ NPCI ବ୍ୟାଙ୍କ ଆଧାର ଲିଙ୍କ୍ ଆବଶ୍ୟକ।',
    category: 'Farmers & Rural',
    department: 'Ministry of Agriculture & Farmers Welfare, Govt of India',
    gov_level: 'Central',
    target_groups: ['farmers', 'rural'],
    min_age: 18,
    max_age: null,
    max_income: null,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹6,000/year in 3 instalments (DBT)',
    benefit_summary_or: '୩ଟି କିସ୍ତିରେ ବାର୍ଷିକ ₹୬,୦୦୦ DBT',
    documents_required: ['Aadhaar Card (e-KYC)', 'Land Ownership RoR / Patta', 'NPCI Seeded Bank Account'],
    required_docs: [
      { doc: 'Aadhaar Card & OTP/Biometric e-KYC', where: 'pmkisan.gov.in / CSC', mandatory: true },
      { doc: 'Cultivable Land RoR / Patta in applicant name', where: 'Bhulekh Odisha', mandatory: true }
    ],
    application_steps: [
      'Register as New Farmer on pmkisan.gov.in or via CSC.',
      'Complete Aadhaar e-KYC and upload mutated land record details.',
      'District/State Revenue Officer verifies land seeding before DBT begins.'
    ],
    disbursement_mode: 'Central DBT (3 Instalments/Yr)',
    helpline: '155261 / 1800-115-526 (PM-KISAN Toll-Free)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://pmkisan.gov.in/',
    sort_order: 80,
    is_featured: 1
  },
  {
    id: 'sch-nsp-central-scholarships',
    slug: 'national-scholarship-portal-central',
    title: 'National Scholarship Portal (NSP) Central Sector & Merit Schemes',
    title_or: 'ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ (NSP) କେନ୍ଦ୍ରୀୟ ବୃତ୍ତି',
    summary: 'One-stop Government of India portal for Central Sector College & University Scholarships, AICTE Pragati/Saksham, and Minority/PwD fellowships.',
    summary_or: 'କେନ୍ଦ୍ରୀୟ କଲେଜ/ବିଶ୍ୱବିଦ୍ୟାଳୟ ବୃତ୍ତି, AICTE ପ୍ରଗତି/ସକ୍ଷମ ଓ ଦିବ୍ୟାଙ୍ଗ ଫେଲୋସିପ୍ ପାଇଁ ଏକକ ଜାତୀୟ ପୋର୍ଟାଲ୍।',
    body_md: '### Key Feature\n- Mandatory NSP One-Time Registration (OTR) app face-auth before applying for Ministry of Education, AICTE, and UGC scholarships.',
    body_md_or: '### ମୁଖ୍ୟ ବ୍ୟବସ୍ଥା\n- ଆବେଦନ ପୂର୍ବରୁ NSP OTR ଆପ୍ ମାଧ୍ୟମରେ ଆଧାର ଫେସ୍-ଅଥେଣ୍ଟିକେସନ୍ ବାଧ୍ୟତାମୂଳକ।',
    category: 'Scholarship',
    department: 'Ministry of Education & MeitY, Govt of India',
    gov_level: 'Central',
    target_groups: ['students', 'youth', 'women', 'pwd'],
    min_age: 14,
    max_age: 35,
    max_income: 450000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹12,000 – ₹50,000/year Merit & Girl-Child Grants',
    benefit_summary_or: 'ବାର୍ଷିକ ₹୧୨,୦୦୦ – ₹୫୦,୦୦୦ ମେଧା ଓ ଛାତ୍ରୀ ବୃତ୍ତି',
    documents_required: ['NSP OTR ID (Face Auth)', 'Aadhaar Card', 'Class 10/12 Marksheet', 'Income Certificate', 'Institute Bonafide'],
    required_docs: [
      { doc: 'NSP One-Time Registration (OTR) 14-digit ID', where: 'scholarships.gov.in + NSP OTR App', mandatory: true },
      { doc: 'Class 12 CHSE/CBSE Marksheet & College Admission Slip', where: 'Institution', mandatory: true },
      { doc: 'Family Income Certificate (≤ ₹4.5L–₹8L per scheme)', where: 'e-District Odisha', mandatory: true }
    ],
    application_steps: [
      'Download AadhaarFaceRD + NSP OTR app and generate your lifetime OTR number.',
      'Log in on scholarships.gov.in and complete academic + income details.',
      'Upload required certificates and submit to Institute Nodal Officer for verification.'
    ],
    disbursement_mode: 'PFMS Aadhaar-Payment Bridge DBT',
    helpline: '0120-6619540 (NSP Helpdesk)',
    verified_date: '2026-11-10',
    application_status_label: 'Closing Soon',
    exam_slug: 'ssc-chsl',
    apply_url: 'https://scholarships.gov.in/',
    sort_order: 90,
    is_featured: 1
  },
  {
    id: 'sch-pm-vishwakarma',
    slug: 'pm-vishwakarma-artisan-scheme',
    title: 'PM Vishwakarma Artisan & Traditional Craft Support Scheme',
    title_or: 'ପିଏମ୍ ବିଶ୍ୱକର୍ମା କାରିଗର ଓ ପାରମ୍ପରିକ ଶିଳ୍ପ ଯୋଜନା',
    summary: 'End-to-end support for 18 traditional trades (carpenters, goldsmiths, potters, tailors, weavers, barbers) with ₹15,000 toolkit grant & 5% credit up to ₹3 Lakh.',
    summary_or: '୧୮ଟି ପାରମ୍ପରିକ କାରିଗର ବୃତ୍ତି ପାଇଁ ₹୧୫,୦୦୦ ଟୁଲ୍‌କିଟ୍ ଅନୁଦାନ, ₹୫୦୦ ଦୈନିକ ତାଲିମ ଭତ୍ତା ଓ ୫% ସୁଧରେ ₹୩ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ଋଣ।',
    body_md: '### Key Provisions\n- Recognition certificate + ID card, ₹500/day training stipend, ₹15,000 e-RUPI toolkit voucher, and ₹1L + ₹2L collateral-free loans at 5% interest.',
    body_md_or: '### ମୁଖ୍ୟ ସୁବିଧା\n- ବିଶ୍ୱକର୍ମା ପ୍ରମାଣପତ୍ର, ୫–୭ ଦିନିଆ ତାଲିମ (₹୫୦୦/ଦିନ), ₹୧୫,୦୦୦ ଟୁଲ୍‌କିଟ୍ ଭାଉଚର ଓ ସହଜ ଋଣ।',
    category: 'Youth & Skill',
    department: 'Ministry of MSME, Govt of India',
    gov_level: 'Central',
    target_groups: ['artisans', 'youth', 'rural', 'urban'],
    min_age: 18,
    max_age: null,
    max_income: null,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹15,000 Toolkit + ₹500/day Stipend + 5% Loan up to ₹3L',
    benefit_summary_or: '₹୧୫,୦୦୦ ଟୁଲ୍‌କିଟ୍ + ₹୫୦୦/ଦିନ ଭତ୍ତା + ₹୩ ଲକ୍ଷ ଋଣ',
    documents_required: ['Aadhaar Card', 'Ration Card', 'Bank Account Details', 'Gram Panchayat / ULB Verification'],
    required_docs: [
      { doc: 'Aadhaar & Aadhaar-linked Mobile Number', where: 'UIDAI', mandatory: true },
      { doc: 'Family Ration Card (1 member per family rule)', where: 'PDS Odisha', mandatory: true },
      { doc: 'Active Savings Bank Account', where: 'Any Nationalised/RRB Bank', mandatory: true }
    ],
    application_steps: [
      'Visit nearest CSC / Mo Seba Kendra with Aadhaar and Ration Card.',
      'Select 1 of 18 Vishwakarma trades and verify biometrics.',
      'Await 3-step verification (GP/ULB -> District Implementation Committee -> National Portal).'
    ],
    disbursement_mode: 'e-RUPI Toolkit Voucher + 5% Subsidised Bank Loan',
    helpline: '1800-267-7777 / 17923',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://pmvishwakarma.gov.in/',
    sort_order: 100,
    is_featured: 0
  },
  {
    id: 'sch-antyodaya-gruha-odisha',
    slug: 'antyodaya-gruha-biju-pakka-ghara-odisha',
    title: 'Antyodaya Gruha Yojana & Biju Pakka Ghara (Odisha Rural Housing)',
    title_or: 'ଅନ୍ତ୍ୟୋଦୟ ଗୃହ ଯୋଜନା ଓ ବିଜୁ ପକ୍କା ଘର (ଓଡ଼ିଶା ଗ୍ରାମୀଣ ଆବାସ)',
    summary: 'Odisha state pucca house construction grant (₹1,20,000+ plus MGNREGS wage & early completion incentive) for kutcha-house rural families left out of PMAY-G.',
    summary_or: 'PMAY-G ରୁ ବଞ୍ଚିତ ଯୋଗ୍ୟ କଚ୍ଚା ଘର ପରିବାରକୁ ପକ୍କା ଘର ନିର୍ମାଣ ପାଇଁ ₹୧,୨୦,୦୦୦+ ଓ ମନରେଗା ମଜୁରି ସହାୟତା।',
    body_md: '### Key Focus\n- Targets PwD households, widows, victims of natural calamities, Forest Rights Act (FRA) patta holders, and extremely vulnerable families.',
    body_md_or: '### ଲକ୍ଷ୍ୟ ଗୋଷ୍ଠୀ\n- ଦିବ୍ୟାଙ୍ଗ, ବିଧବା, ପ୍ରାକୃତିକ ବିପର୍ଯ୍ୟୟ ପ୍ରଭାବିତ ଓ ବନ ଅଧିକାର ପଟ୍ଟାଧାରୀ ଗରିବ ପରିବାର।',
    category: 'Housing & Civic',
    department: 'Panchayati Raj & Drinking Water Dept, Odisha',
    gov_level: 'Odisha',
    target_groups: ['rural', 'families', 'pwd', 'women'],
    min_age: 18,
    max_age: null,
    max_income: 120000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹1,20,000 Construction Grant + MGNREGS Mandays + Incentive',
    benefit_summary_or: '₹୧,୨୦,୦୦୦ ଘର ନିର୍ମାଣ ସହାୟତା + ମନରେଗା ମଜୁରି',
    documents_required: ['Aadhaar Card', 'MGNREGS Job Card', 'Ration Card / Homestead Patta', 'Bank Passbook'],
    required_docs: [
      { doc: 'Aadhaar Card & MGNREGS Job Card', where: 'GP Office', mandatory: true },
      { doc: 'Homestead Land Patta / FRA Patta', where: 'Tahasil / Revenue Dept', mandatory: true },
      { doc: 'Geo-tagged Photo of Existing Kutcha House', where: 'GP PEO / GRS Survey', mandatory: true }
    ],
    application_steps: [
      'Register during Gram Panchayat / Block Rural Housing survey.',
      'Complete geo-tagging of kutcha dwelling and land record verification.',
      'Receive tranche payments at Foundation, Lintel, Roof, and Completion stages.'
    ],
    disbursement_mode: 'Stage-wise DBT with Geo-Tagged Milestones',
    helpline: '1800-345-6768 (Rural Housing Odisha)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://rhodisha.gov.in/',
    sort_order: 110,
    is_featured: 1
  },
  {
    id: 'sch-harischandra-sahayata-odisha',
    slug: 'harischandra-sahayata-yojana-odisha',
    title: 'Harischandra Sahayata Yojana (Last-Rites Financial Aid Odisha)',
    title_or: 'ହରିଶ୍ଚନ୍ଦ୍ର ସହାୟତା ଯୋଜନା (ଶେଷକୃତ୍ୟ ଆର୍ଥିକ ସହାୟତା)',
    summary: 'Immediate funeral assistance of ₹3,000 in rural areas (Gram Panchayat) and ₹4,000 in urban areas (ULB) for destitute & poor families in Odisha.',
    summary_or: 'ଅସହାୟ ଓ ଗରିବ ପରିବାରରେ ମୃତ୍ୟୁ ଘଟିଲେ ଶେଷକୃତ୍ୟ ପାଇଁ ଗ୍ରାମାଞ୍ଚଳରେ ₹୩,୦୦୦ ଏବଂ ସହରାଞ୍ଚଳରେ ₹୪,୦୦୦ ତୁରନ୍ତ ସହାୟତା।',
    body_md: '### Key Provision\n- Disbursed rapidly through Gram Panchayat Sarpanch/PEO or Urban Local Body / Swarga Ratha nodal officer without bureaucratic delay.',
    body_md_or: '### ତ୍ୱରିତ ସହାୟତା\n- ଗ୍ରାମ ପଞ୍ଚାୟତ ବା ପୌରପାଳିକା କାର୍ଯ୍ୟାଳୟରୁ ତୁରନ୍ତ ନଗଦ/DBT ସହାୟତା ଉପଲବ୍ଧ।',
    category: 'Social Security',
    department: 'General Administration / Panchayati Raj & H&UD Dept, Odisha',
    gov_level: 'Odisha',
    target_groups: ['families', 'rural', 'urban', 'senior'],
    min_age: null,
    max_age: null,
    max_income: 100000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹3,000 (Rural) / ₹4,000 (Urban) immediate funeral grant',
    benefit_summary_or: 'ଗ୍ରାମାଞ୍ଚଳରେ ₹୩,୦୦୦ / ସହରାଞ୍ଚଳରେ ₹୪,୦୦୦ ତୁରନ୍ତ ସହାୟତା',
    documents_required: ['Aadhaar of Applicant / Deceased', 'Ration Card / Destitute Endorsement', 'Hospital Slip or GP Report'],
    required_docs: [
      { doc: 'Applicant Identity / Aadhaar Card', where: 'Family Member', mandatory: true },
      { doc: 'Death Intimation / Hospital Memo / GP Verification', where: 'GP PEO / Medical Officer', mandatory: true }
    ],
    application_steps: [
      'Inform local Gram Panchayat Sarpanch/PEO or ULB Municipal Ward Officer.',
      'Submit Aadhaar & basic family declaration under Harischandra Sahayata register.',
      'Receive immediate grant release at local body level.'
    ],
    disbursement_mode: 'Immediate GP/ULB Cash/Cheque or DBT',
    helpline: '155330 (Odisha Citizen Call Centre)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://cmrfodisha.gov.in/',
    sort_order: 120,
    is_featured: 0
  },
  {
    id: 'sch-anwesha-st-sc-odisha',
    slug: 'anwesha-st-sc-pre-matric-scholarship-odisha',
    title: 'ST & SC Anwesha & Pre-Matric Residential Scholarship (Odisha)',
    title_or: 'ଅନ୍ୱେଷା ଓ ପ୍ରାକ୍-ମ୍ୟାଟ୍ରିକ୍ ST/SC ଛାତ୍ରବୃତ୍ତି (ଓଡ଼ିଶା)',
    summary: 'State-sponsored free English-medium quality schooling & hostel care (Anwesha) plus Class 1–10 Pre-Matric monthly stipends for SC/ST students.',
    summary_or: 'SC/ST ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ ପ୍ରସିଦ୍ଧ ଇଂରାଜୀ ମାଧ୍ୟମ ବିଦ୍ୟାଳୟରେ ମାଗଣା ଶିକ୍ଷା ଓ ହଷ୍ଟେଲ (ଅନ୍ୱେଷା) ଏବଂ ଦଶମ ପର୍ଯ୍ୟନ୍ତ ମାସିକ ବୃତ୍ତି।',
    body_md: '### Anwesha & Pre-Matric Benefits\n- Covers full tuition fees, uniform, books, and urban hostel lodging for ST/SC children from Class 1 onwards.',
    body_md_or: '### ମୁଖ୍ୟ ସୁବିଧା\n- ପ୍ରଥମ ଶ୍ରେଣୀରୁ ଦ୍ୱାଦଶ ପର୍ଯ୍ୟନ୍ତ ସ୍କୁଲ ଫି, ପୋଷାକ, ବହି ଓ ସହରାଞ୍ଚଳ ହଷ୍ଟେଲ ଖର୍ଚ୍ଚ ସରକାର ବହନ କରନ୍ତି।',
    category: 'Scholarship',
    department: 'ST & SC Development Dept, Govt of Odisha',
    gov_level: 'Odisha',
    target_groups: ['students', 'rural', 'families'],
    min_age: 6,
    max_age: 18,
    max_income: 250000,
    gender_eligible: 'all',
    beneficiary_categories: ['sc', 'st'],
    benefit_summary: '100% Free English-Medium Schooling, Hostel & Monthly Stipend',
    benefit_summary_or: '୧୦୦% ମାଗଣା ଇଂରାଜୀ ସ୍କୁଲ, ହଷ୍ଟେଲ ଓ ମାସିକ ଛାତ୍ରବୃତ୍ତି',
    documents_required: ['SC/ST Caste Certificate', 'Parent Income Certificate', 'Student Aadhaar & Birth Certificate'],
    required_docs: [
      { doc: 'Valid SC or ST Caste Certificate', where: 'e-District Odisha', mandatory: true },
      { doc: 'Parent Income Certificate (≤ ₹2.5L)', where: 'Tahasil', mandatory: true },
      { doc: 'School Headmaster Enrollment & Attendance Record', where: 'School Office', mandatory: true }
    ],
    application_steps: [
      'Apply through District Welfare Officer (DWO) Anwesha notification or school Mo Seba Desk.',
      'Participate in district lottery selection (for Anwesha Class 1 entry).',
      'For Pre-Matric (Class 9–10), verify via State Scholarship Portal for direct DBT.'
    ],
    disbursement_mode: 'DBT Stipend + Direct School Fee Payment',
    helpline: '155335 / 1800-345-6770',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: 'navodaya-odisha-adarsha',
    apply_url: 'https://stscodisha.gov.in/',
    sort_order: 130,
    is_featured: 0
  },
  {
    id: 'sch-pm-surya-ghar-odisha',
    slug: 'pm-surya-ghar-muft-bijli-odisha',
    title: 'PM Surya Ghar: Muft Bijli Yojana & Odisha State Solar Top-Up',
    title_or: 'ପିଏମ୍ ସୂର୍ଯ୍ୟ ଘର: ମାଗଣା ବିଜୁଳି ଯୋଜନା ଓ ଓଡ଼ିଶା ଅତିରିକ୍ତ ସବସିଡି',
    summary: 'Central rooftop solar subsidy up to ₹78,000 plus Odisha state top-up subsidy up to ₹60,000 (total up to ₹1,38,000 for 3kW) and 300 units free monthly power.',
    summary_or: 'ଘର ଛାତ ସୌର ପ୍ୟାନେଲ୍ ପାଇଁ କେନ୍ଦ୍ର (₹୭୮,୦୦୦) + ଓଡ଼ିଶା ରାଜ୍ୟ ଅତିରିକ୍ତ ସବସିଡି (₹୬୦,୦୦୦ ପର୍ଯ୍ୟନ୍ତ), ମୋଟ ₹୧,୩୮,୦୦୦ ରିହାତି ଓ ୩୦୦ ୟୁନିଟ୍ ମାଗଣା ବିଜୁଳି।',
    body_md: '### Odisha Dual Subsidy\n- Central CFA: ₹30,000/kW up to 2kW + ₹18,000 for 3rd kW (max ₹78,000).\n- Odisha Top-Up: Additional ₹25,000 (1kW), ₹50,000 (2kW), ₹60,000 (3kW) via GRIDCO/DISCOM.',
    body_md_or: '### ଦ୍ୱୈତ ସବସିଡି\n- କେନ୍ଦ୍ର ଓ ଓଡ଼ିଶା ସରକାରଙ୍କ ମିଳିତ ସହାୟତାରେ 3kW ସୌର ପ୍ଲାଣ୍ଟରେ ₹୧.୩୮ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ସିଧାସଳଖ ସବସିଡି।',
    category: 'Housing & Civic',
    department: 'Ministry of New & Renewable Energy / Dept of Energy, Odisha',
    gov_level: 'Central',
    target_groups: ['families', 'urban', 'rural'],
    min_age: 18,
    max_age: null,
    max_income: null,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: 'Up to ₹78,000 Central + ₹60,000 Odisha Solar Subsidy',
    benefit_summary_or: '₹୭୮,୦୦୦ କେନ୍ଦ୍ର + ₹୬୦,୦୦୦ ଓଡ଼ିଶା ସବସିଡି',
    documents_required: ['DISCOM Electricity Consumer Bill (TPCODL/TPNODL/TPSODL/TPWODL)', 'Aadhaar & Rooftop Ownership Proof', 'Cancelled Cheque'],
    required_docs: [
      { doc: 'Latest Odisha DISCOM Electricity Bill', where: 'TPCODL / TPWODL / TPNODL / TPSODL', mandatory: true },
      { doc: 'Aadhaar Card & Bank Account Cancelled Cheque', where: 'Applicant', mandatory: true }
    ],
    application_steps: [
      'Register Consumer Number & State Odisha on pmsuryaghar.gov.in.',
      'Obtain technical feasibility from DISCOM and select an empaneled solar vendor.',
      'Install plant, complete net-metering inspection, and get Central + State DBT subsidy.'
    ],
    disbursement_mode: 'DBT Subsidy within 30 Days of Net Metering',
    helpline: '15555 (National Solar Toll-Free)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://pmsuryaghar.gov.in/',
    sort_order: 140,
    is_featured: 1
  },
  {
    id: 'sch-kalakar-sahayata-odisha',
    slug: 'mukhyamantri-kalakar-sahayata-odisha',
    title: 'Mukhyamantri Kalakar Sahayata Yojana (Odisha Artist Pension)',
    title_or: 'ମୁଖ୍ୟମନ୍ତ୍ରୀ କଳାକାର ସହାୟତା ଯୋଜନା (ଓଡ଼ିଶା କଳାକାର ଭତ୍ତା)',
    summary: 'Monthly financial honourarium pension of ₹2,000/month (enhanced tier up to ₹2,500) for senior folk, Odissi, Gotipua, Pala, Daskathia & theatre artists of Odisha.',
    summary_or: 'ଓଡ଼ିଶାର ଲୋକକଳା, ଓଡ଼ିଶୀ, ପାଲା, ଦାସକାଠିଆ ଓ ନାଟ୍ୟ କଳାକାରଙ୍କୁ ମାସିକ ₹୨,୦୦୦ (ବରିଷ୍ଠ କଳାକାରଙ୍କୁ ₹୨,୫୦୦) ସମ୍ମାନ ଭତ୍ତା।',
    body_md: '### Eligibility Highlights\n- Artists with 10+ years of active cultural contribution aged ≥50 yrs (male) or ≥40 yrs (female), with annual income within prescribed limits.',
    body_md_or: '### ଯୋଗ୍ୟତା\n- ୧୦ ବର୍ଷର କଳା ସାଧନା ଥିବା ୫୦+ ବର୍ଷର ପୁରୁଷ ଓ ୪୦+ ବର୍ଷର ମହିଳା କଳାକାରଙ୍କ ପାଇଁ ଉଦ୍ଦିଷ୍ଟ।',
    category: 'Social Security',
    department: 'Odia Language, Literature & Culture Dept, Govt of Odisha',
    gov_level: 'Odisha',
    target_groups: ['artisans', 'senior', 'rural', 'urban'],
    min_age: 40,
    max_age: null,
    max_income: 48000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹2,000 – ₹2,500/month Lifetime Artist Pension',
    benefit_summary_or: 'ମାସିକ ₹୨,୦୦୦ – ₹୨,୫୦୦ କଳାକାର ଭତ୍ତା',
    documents_required: ['Aadhaar & Age Proof', 'Income Certificate', '10-Year Art Performance Certificates/News Clippings', 'Bank Passbook'],
    required_docs: [
      { doc: 'Artistic Contribution Proof (Stage photos / Certificates)', where: 'Applicant / Cultural Academy', mandatory: true },
      { doc: 'Aadhaar & Income Certificate', where: 'e-District Odisha', mandatory: true }
    ],
    application_steps: [
      'Apply via District Culture Officer (DCO) / Block office during Kalakar Sahayata drive.',
      'Appear before District Selection Committee verification.',
      'Receive monthly pension directly into bank account via DBT.'
    ],
    disbursement_mode: 'Monthly DBT Transfer',
    helpline: '0674-2532944 (Dept of Culture Odisha)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://culture.odisha.gov.in/',
    sort_order: 150,
    is_featured: 0
  },
  {
    id: 'sch-biju-shishu-surakshya-odisha',
    slug: 'biju-shishu-surakshya-yojana-odisha',
    title: 'Biju Shishu Surakshya Yojana (Orphan & Vulnerable Child Support)',
    title_or: 'ବିଜୁ ଶିଶୁ ସୁରକ୍ଷା ଯୋଜନା (ଅନାଥ ଓ ଅସହାୟ ଶିଶୁ ସହାୟତା)',
    summary: 'Financial guardianship, Sukanya/FD savings grants, higher-education tuition, and marriage assistance for orphan children & Child Care Institution residents.',
    summary_or: 'ଅନାଥ ଓ ଅସହାୟ ଶିଶୁଙ୍କ ଉଚ୍ଚଶିକ୍ଷା, ବ୍ୟାଙ୍କ ଜମା ଓ କନ୍ୟା ବିବାହ ସହାୟତା ପାଇଁ ଓଡ଼ିଶା ସରକାରଙ୍କ ବିଶେଷ ଯୋଜନା।',
    body_md: '### Key Components\n- One-time corpus deposit in Sukanya Samriddhi / bank FD up to ₹40,000+, technical study support up to Class 12 & graduation, and marriage aid of ₹50,000 for orphan girls.',
    body_md_or: '### ମୁଖ୍ୟ ସୁବିଧା\n- ପାଠପଢ଼ା, ବ୍ୟାଙ୍କ ଜମା ଓ ଅନାଥ ଝିଅଙ୍କ ବିବାହ ପାଇଁ ₹୫୦,୦୦୦ ପର୍ଯ୍ୟନ୍ତ ଆର୍ଥିକ ସହାୟତା।',
    category: 'Women & Child',
    department: 'WCD Dept & Odisha State Child Protection Society (OSCPS)',
    gov_level: 'Odisha',
    target_groups: ['students', 'women', 'families'],
    min_age: 0,
    max_age: 21,
    max_income: 120000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: 'Education + Savings Corpus + ₹50,000 Marriage Assistance',
    benefit_summary_or: 'ଶିକ୍ଷା + ଜମା ରାଶି + ₹୫୦,୦୦୦ ବିବାହ ସହାୟତା',
    documents_required: ['Parents Death Certificate / Orphanhood Report', 'Child Aadhaar & Birth Certificate', 'DCPO Sponsorship Recommendation'],
    required_docs: [
      { doc: 'Parental Death Certificates / Social Investigation Report', where: 'District Child Protection Unit (DCPU)', mandatory: true },
      { doc: 'School Enrollment & Bank Account Jointly with Guardian/DCPO', where: 'School & Bank', mandatory: true }
    ],
    application_steps: [
      'Report vulnerable/orphan child status to District Child Protection Officer (DCPO) or Childline 1098.',
      'DCPU completes Social Investigation Report & Child Welfare Committee order.',
      'Funds are released for schooling, Sukanya corpus, and higher study/marriage.'
    ],
    disbursement_mode: 'DBT to Minor/Sukanya Savings Account',
    helpline: '1098 (Childline India) / 181',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://oscps.odisha.gov.in/',
    sort_order: 160,
    is_featured: 0
  },
  {
    id: 'sch-sampoorna-pushti-odisha',
    slug: 'mukhyamantri-sampoorna-pushti-odisha',
    title: 'Mukhyamantri Sampoorna Pushti Yojana (Adolescent & Maternal Nutrition)',
    title_or: 'ମୁଖ୍ୟମନ୍ତ୍ରୀ ସମ୍ପୂର୍ଣ୍ଣ ପୁଷ୍ଟି ଯୋଜନା (କିଶୋରୀ ଓ ମାତୃ ପୁଷ୍ଟି)',
    summary: 'Odisha-exclusive nutrition mission delivering iron-rich dry rations, eggs, chhatua, millet laddoos & hot meals to pregnant women, adolescent girls & malnourished children.',
    summary_or: 'ଗର୍ଭବତୀ ମହିଳା, ପ୍ରସୂତି, କିଶୋରୀ ଓ ଅପପୁଷ୍ଟି ଶିଶୁଙ୍କୁ ଅଣ୍ଡା, ଛତୁଆ, ମାଣ୍ଡିଆ ଲଡୁ ଓ ପୋଷଣଯୁକ୍ତ ଖାଦ୍ୟ ସହାୟତା।',
    body_md: '### Key Nutrition Kit\n- Take-Home Ration (THR) + hot cooked meals at 74,000+ Anganwadi Centres, targeting anemia reduction among adolescent girls (15–19 yrs).',
    body_md_or: '### ପୁଷ୍ଟି କିଟ୍\n- ଅଙ୍ଗନୱାଡ଼ି କେନ୍ଦ୍ର ମାଧ୍ୟମରେ ଗର୍ଭବତୀ, କିଶୋରୀ ବାଳିକା ଓ ଶିଶୁଙ୍କୁ ନିୟମିତ ପୋଷଣ ସହାୟତା।',
    category: 'Healthcare',
    department: 'Women & Child Development Dept, Odisha',
    gov_level: 'Odisha',
    target_groups: ['women', 'families', 'rural', 'urban'],
    min_age: 0,
    max_age: 45,
    max_income: null,
    gender_eligible: 'female',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: 'Free Monthly Nutrition Kit, Eggs & Micronutrient Supplements',
    benefit_summary_or: 'ମାଗଣା ମାସିକ ପୁଷ୍ଟି କିଟ୍, ଅଣ୍ଡା ଓ ଆଇରନ୍ ବଟିକା',
    documents_required: ['Aadhaar Card', 'MCP Mother & Child Protection Card', 'Anganwadi Registration'],
    required_docs: [
      { doc: 'Anganwadi Registration & Mother-Child Protection (MCP) Card', where: 'Nearest Anganwadi Centre', mandatory: true },
      { doc: 'Aadhaar Number of Beneficiary/Mother', where: 'AWW', mandatory: true }
    ],
    application_steps: [
      'Register pregnancy, child growth record, or adolescent profile at local Anganwadi Centre.',
      'Receive monthly Take-Home Ration (THR) & weekly health/anemia tracking.'
    ],
    disbursement_mode: 'In-Kind Nutrition Delivery at Anganwadi Centres',
    helpline: '104 / 155330',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://wcd.odisha.gov.in/',
    sort_order: 170,
    is_featured: 0
  },
  {
    id: 'sch-lakshya-civil-services-coaching',
    slug: 'odisha-civil-services-lakshya-coaching',
    title: 'Odisha State Civil Services Coaching & Lakshya UPSC/OAS Stipend',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସିଭିଲ୍ ସର୍ଭିସେସ୍ କୋଚିଂ ଓ ଲକ୍ଷ୍ୟ UPSC/OAS ବୃତ୍ତି',
    summary: 'Free residential UPSC/OPSC Civil Services coaching in Bhubaneswar & Cuttack plus financial incentive grants for Mains/Interview qualifiers.',
    summary_or: 'UPSC ଓ OPSC (OAS) ପ୍ରସ୍ତୁତି ପାଇଁ ଭୁବନେଶ୍ୱରରେ ମାଗଣା ଆବାସିକ କୋଚିଂ ଏବଂ ପ୍ରିଲିମ୍ସ/ମେନ୍ସ ଉତ୍ତୀର୍ଣ୍ଣ ପରୀକ୍ଷାର୍ଥୀଙ୍କୁ ଆର୍ଥିକ ପ୍ରୋତ୍ସାହନ।',
    body_md: '### Support Structure\n- Free tuition, library hostel access, and test series support for meritorious Odisha domiciles preparing for UPSC CSE & OPSC OCS.',
    body_md_or: '### ପରୀକ୍ଷାର୍ଥୀ ସୁବିଧା\n- ଓଡ଼ିଶାର ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ମାଗଣା UPSC/OAS କୋଚିଂ, ହଷ୍ଟେଲ ଓ ଟେଷ୍ଟ ସିରିଜ୍ ସୁବିଧା।',
    category: 'Scholarship',
    department: 'Higher Education & ST/SC Development Dept, Odisha',
    gov_level: 'Odisha',
    target_groups: ['students', 'youth'],
    min_age: 21,
    max_age: 38,
    max_income: 800000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '100% Free Civil Services Coaching, Hostel & Prelims/Mains Grant',
    benefit_summary_or: '୧୦୦% ମାଗଣା UPSC/OAS କୋଚିଂ ଓ ହଷ୍ଟେଲ ସହାୟତା',
    documents_required: ['Graduation Certificate', 'Odisha Residence Certificate', 'Aadhaar & Income Proof', 'UPSC/OPSC Entrance Rank'],
    required_docs: [
      { doc: 'Graduation Marksheet & Degree Certificate', where: 'University', mandatory: true },
      { doc: 'Odisha Residence & Category Certificate', where: 'e-District Odisha', mandatory: true },
      { doc: 'Entrance Selection Score / UPSC Prelims Admit Card', where: 'Dept Portal', mandatory: true }
    ],
    application_steps: [
      'Apply on dhe.odisha.gov.in or scholarship.odisha.gov.in when Civil Services coaching window opens.',
      'Appear for state screening entrance test in Bhubaneswar / regional hubs.',
      'Attend sponsored coaching cohort + claim incentive grants cleanly.'
    ],
    disbursement_mode: 'Sponsored Residential Coaching + DBT Grant',
    helpline: '155335 / 0674-2396550',
    verified_date: '2026-11-10',
    application_status_label: 'Closing Soon',
    exam_slug: 'opsc-oas',
    apply_url: 'https://dhe.odisha.gov.in/',
    sort_order: 180,
    is_featured: 1
  },
  {
    id: 'sch-pm-mudra-pmegp-odisha',
    slug: 'pm-mudra-pmegp-odisha',
    title: 'PM MUDRA Yojana & PMEGP Self-Employment Credit (Odisha MSME)',
    title_or: 'ପିଏମ୍ ମୁଦ୍ରା ଯୋଜନା ଓ PMEGP ଆତ୍ମନିଯୁକ୍ତି ଋଣ (ଓଡ଼ିଶା MSME)',
    summary: 'Collateral-free business loans up to ₹20 Lakh (Tarun Plus) under MUDRA and up to ₹50 Lakh manufacturing/service project credit with 15%–35% subsidy under PMEGP.',
    summary_or: 'ବ୍ୟବସାୟ ପାଇଁ ବିନା ବନ୍ଧକରେ ₹୨୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ମୁଦ୍ରା ଋଣ ଏବଂ PMEGP ଅଧୀନରେ ₹୫୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ପ୍ରକଳ୍ପରେ ୧୫%–୩୫% ସବସିଡି।',
    body_md: '### Key Tiers\n- **MUDRA**: Shishu (≤₹50k), Kishore (₹50k–₹5L), Tarun (₹5L–₹10L), Tarun Plus (₹10L–₹20L).\n- **PMEGP**: Up to 35% margin money subsidy in rural Odisha for youth, women, SC/ST, and OBC entrepreneurs.',
    body_md_or: '### ଋଣ ଓ ସବସିଡି\n- ଗ୍ରାମାଞ୍ଚଳର ଯୁବକ, ମହିଳା ଓ SC/ST ଉଦ୍ୟୋଗୀଙ୍କୁ PMEGP ରେ ୩୫% ପର୍ଯ୍ୟନ୍ତ ସରକାରୀ ରିହାତି।',
    category: 'Youth & Skill',
    department: 'Ministry of Finance & KVIC / MSME Odisha',
    gov_level: 'Central',
    target_groups: ['youth', 'women', 'artisans', 'rural', 'urban'],
    min_age: 18,
    max_age: 65,
    max_income: null,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: 'Collateral-Free Loan ₹20L (MUDRA) · 15–35% Subsidy (PMEGP)',
    benefit_summary_or: '₹୨୦ ଲକ୍ଷ ମୁଦ୍ରା ଋଣ · PMEGP ରେ ୧୫–୩୫% ସବସିଡି',
    documents_required: ['Aadhaar & PAN Card', 'Project Report (DPR)', 'EDP Training / Educational Certificate', 'Special Category Certificate (for 25–35% subsidy)'],
    required_docs: [
      { doc: 'Aadhaar, PAN & Udyam Registration Number', where: 'udyamregistration.gov.in', mandatory: true },
      { doc: 'Brief Project Report & Quotation for Machinery', where: 'Applicant / DIC Odisha', mandatory: true },
      { doc: 'Caste / Rural Area Certificate (for 35% subsidy)', where: 'e-District Odisha', mandatory: false }
    ],
    application_steps: [
      'Register free on kviconline.gov.in/pmegpeportal or jansamarth.in for MUDRA.',
      'Upload project cost summary & choose your nearest Odisha bank branch.',
      'Complete DIC/KVIC screening & 10-day EDP training before subsidy lock-in.'
    ],
    disbursement_mode: 'Bank Term Loan + KVIC Margin Money Subsidy',
    helpline: '1800-3000-0034 (KVIC) / 1800-180-1111 (MUDRA)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://www.jansamarth.in/',
    sort_order: 190,
    is_featured: 1
  },
  {
    id: 'sch-sbm-gramin-toilet-odisha',
    slug: 'swachh-bharat-gramin-toilet-odisha',
    title: 'Swachh Bharat Mission (Gramin) Household Toilet Incentive',
    title_or: 'ସ୍ୱଚ୍ଛ ଭାରତ ମିଶନ (ଗ୍ରାମୀଣ) ବ୍ୟକ୍ତିଗତ ଶୌଚାଳୟ ସହାୟତା',
    summary: 'Financial incentive of ₹12,000 for construction of Individual Household Latrine (IHHL) with water facility for eligible left-out & new rural families in Odisha.',
    summary_or: 'ଗ୍ରାମାଞ୍ଚଳର ନୂଆ ଓ ବଞ୍ଚିତ ଯୋଗ୍ୟ ପରିବାରକୁ ଘରୋଇ ଶୌଚାଳୟ ନିର୍ମାଣ ପାଇଁ ₹୧୨,୦୦୦ ପ୍ରୋତ୍ସାହନ ସହାୟତା।',
    body_md: '### Direct DBT Process\n- Geo-tagged verification by GP Swachhagrahi / Block Coordinator followed by ₹12,000 direct credit to beneficiary bank account.',
    body_md_or: '### ସହାୟତା ପ୍ରକ୍ରିୟା\n- ଅନଲାଇନ୍ ଆବେଦନ ଓ ଜିଓ-ଟ୍ୟାଗିଂ ଯାଞ୍ଚ ପରେ ₹୧୨,୦୦୦ ସିଧାସଳଖ ବ୍ୟାଙ୍କ ଖାତାରେ।',
    category: 'Housing & Civic',
    department: 'Ministry of Jal Shakti / Panchayati Raj Dept, Odisha',
    gov_level: 'Central',
    target_groups: ['rural', 'families', 'women'],
    min_age: 18,
    max_age: null,
    max_income: 120000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹12,000 Direct DBT Incentive for Household Toilet',
    benefit_summary_or: 'ଶୌଚାଳୟ ନିର୍ମାଣ ପାଇଁ ₹୧୨,୦୦୦ DBT ସହାୟତା',
    documents_required: ['Aadhaar Card', 'Bank Account Passbook', 'Ration Card / Job Card', 'Geo-Tagged Site Photo'],
    required_docs: [
      { doc: 'Aadhaar & Active Savings Bank Account', where: 'Applicant', mandatory: true },
      { doc: 'Gram Panchayat Verification of No Existing Toilet', where: 'GP Office', mandatory: true }
    ],
    application_steps: [
      'Register Citizen Login on sbm.gov.in/sbmg_ihhl.',
      'Submit rural address (District -> Block -> GP) and bank details.',
      'Build twin-pit toilet after GP approval and upload completion photo for DBT.'
    ],
    disbursement_mode: 'Direct DBT after Geo-Tagged Verification',
    helpline: '1800-180-0404 (Jal Shakti Toll-Free)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://swachhbharatmission.ddws.gov.in/',
    sort_order: 200,
    is_featured: 0
  },
  {
    id: 'sch-biju-krushak-kalyan-odisha',
    slug: 'biju-krushak-kalyan-yojana-odisha',
    title: 'Biju Krushak Kalyan & Farm Mechanisation Subsidy (Odisha)',
    title_or: 'ବିଜୁ କୃଷକ କଲ୍ୟାଣ ଓ କୃଷି ଯାନ୍ତ୍ରିକୀକରଣ ସବସିଡି (ଓଡ଼ିଶା)',
    summary: 'Health safety & 40%–50% capital subsidy on tractors, power tillers, solar pumps & crop insurance (PMFBY/GO-SUGAM) for Odisha farmers.',
    summary_or: 'ଓଡ଼ିଶାର ଚାଷୀଙ୍କୁ ଟ୍ରାକ୍ଟର, ପାୱାର ଟିଲର, ସୌର ପମ୍ପ ଉପରେ ୪୦%–୫୦% ସବସିଡି ଏବଂ ଫସଲ ବୀମା ସୁରକ୍ଷା (GO-SUGAM)।',
    body_md: '### Key Tools via GO-SUGAM\n- Single-window agricultural subsidy portal for tractors, reapers, sprayers, borewells, and horticultural plantations.',
    body_md_or: '### GO-SUGAM ପୋର୍ଟାଲ୍\n- କୃଷି ଯନ୍ତ୍ରପାତି, ସୌର ପମ୍ପ ଓ ଉଦ୍ୟାନ କୃଷି ସବସିଡି ପାଇଁ ଗୋଟିଏ ପ୍ଲାଟଫର୍ମ।',
    category: 'Farmers & Rural',
    department: 'Dept of Agriculture & Farmers Empowerment, Odisha',
    gov_level: 'Odisha',
    target_groups: ['farmers', 'rural'],
    min_age: 18,
    max_age: null,
    max_income: null,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '40%–50% Capital Subsidy on Farm Equipment & Crop Cover',
    benefit_summary_or: 'କୃଷି ଯନ୍ତ୍ରପାତି ଉପରେ ୪୦%–୫୦% ସବସିଡି ଓ ଫସଲ ବୀମା',
    documents_required: ['Krushak Odisha ID', 'Aadhaar & Land RoR (Patta)', 'Bank Account & Dealer Invoice'],
    required_docs: [
      { doc: 'Krushak Odisha Farmer Registration', where: 'krushak.odisha.gov.in', mandatory: true },
      { doc: 'Land RoR (Patta) & Aadhaar Bank Passbook', where: 'Bhulekh Odisha', mandatory: true }
    ],
    application_steps: [
      'Log in on sugam.odisha.gov.in with Krushak ID.',
      'Select farm equipment/irrigation scheme and upload Land Patta.',
      'Receive GO-SUGAM permit, purchase machinery, and get subsidy DBT.'
    ],
    disbursement_mode: 'DBT Subsidy on Approved Equipment Purchase',
    helpline: '155333 (Ama Krushi Toll-Free)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://sugam.odisha.gov.in/',
    sort_order: 210,
    is_featured: 0
  },
  {
    id: 'sch-sukanya-mamata-convergence',
    slug: 'sukanya-samriddhi-mamata-convergence',
    title: 'Mamata Maternity Benefit & Sukanya Samriddhi Girl-Child Convergence',
    title_or: 'ମମତା ମାତୃତ୍ୱ ସହାୟତା ଓ ସୁକନ୍ୟା ସମୃଦ୍ଧି ବାଳିକା ଯୋଜନା',
    summary: 'Odisha ₹10,000+ Mamata DBT maternal nutrition aid converged with PMMVY + 8.2% tax-free Sukanya Samriddhi long-term savings for daughters (<10 yrs).',
    summary_or: 'ଓଡ଼ିଶାର ଗର୍ଭବତୀ/ପ୍ରସୂତି ମହିଳାଙ୍କୁ ₹୧୦,୦୦୦+ ମମତା ସହାୟତା ଏବଂ ୧୦ ବର୍ଷରୁ କମ୍ କନ୍ୟା ସନ୍ତାନ ପାଇଁ ୮.୨% ଟିକସମୁକ୍ତ ସୁକନ୍ୟା ସମୃଦ୍ଧି ଖାତା।',
    body_md: '### Dual Benefit\n- **Mamata/PMMVY**: Partial wage compensation + institutional delivery nutrition.\n- **SSY**: Government-guaranteed EEE tax-free return maturing for higher education & marriage.',
    body_md_or: '### ଯୁଗଳ ସୁବିଧା\n- ମାଆ ଓ ଶିଶୁ ପୁଷ୍ଟି ପାଇଁ ମମତା DBT ଏବଂ ଝିଅର ଭବିଷ୍ୟତ ଉଚ୍ଚଶିକ୍ଷା ପାଇଁ ସୁକନ୍ୟା ସମୃଦ୍ଧି।',
    category: 'Women & Child',
    department: 'WCD Odisha & Dept of Posts / Ministry of Finance',
    gov_level: 'Odisha',
    target_groups: ['women', 'families', 'rural', 'urban'],
    min_age: 18,
    max_age: 45,
    max_income: null,
    gender_eligible: 'female',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹10,000+ Maternity DBT & 8.2% Tax-Free Girl Savings',
    benefit_summary_or: '₹୧୦,୦୦୦+ ମାତୃତ୍ୱ ସହାୟତା ଓ ୮.୨% ସୁକନ୍ୟା ସୁଧ',
    documents_required: ['MCP Card & Child Birth Certificate', 'Mother Aadhaar & Bank Account', 'Post Office / Bank SSY Form'],
    required_docs: [
      { doc: 'Mother & Child Protection (MCP) Card & Aadhaar', where: 'Anganwadi Centre', mandatory: true },
      { doc: 'Girl Child Birth Certificate (for Sukanya account <10 yrs)', where: 'Hospital / Municipal Registrar', mandatory: true }
    ],
    application_steps: [
      'Register pregnancy at Anganwadi Centre (AWC) for Mamata DBT instalments.',
      'Open Sukanya Samriddhi Account with minimum ₹250 at any India Post / SBI branch after daughter’s birth.'
    ],
    disbursement_mode: 'DBT Maternity Aid + Govt Guaranteed 8.2% SSY Savings',
    helpline: '1800-266-6868 (India Post) / 104',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://www.indiapost.gov.in/',
    sort_order: 220,
    is_featured: 0
  },
  {
    id: 'sch-obocwwb-construction-workers',
    slug: 'obocwwb-construction-workers-welfare-odisha',
    title: 'OBOCWWB Construction Workers Welfare & Nirman Shramik Benefits',
    title_or: 'ଓଡ଼ିଶା ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ବୋର୍ଡ (OBOCWWB) ଯୋଜନା',
    summary: 'Comprehensive welfare benefits (₹10,000–₹40,000 educational scholarships for children, ₹50,000 daughter marriage aid, safety kit, pension & ₹2L–₹4L accident cover).',
    summary_or: 'ପଞ୍ଜୀକୃତ ନିର୍ମାଣ ଶ୍ରମିକଙ୍କ ପିଲାଙ୍କ ପାଠପଢ଼ା ପାଇଁ ₹୪୦,୦୦୦ ପର୍ଯ୍ୟନ୍ତ ବୃତ୍ତି, ଝିଅ ବିବାହ ପାଇଁ ₹୫୦,୦୦୦, ସାଇକେଲ/ସୁରକ୍ଷା କିଟ୍ ଓ ଦୁର୍ଘଟଣା ବୀମା।',
    body_md: '### Key Nirman Shramik Grants\n- Education assistance from Class 6 up to B.Tech/Medical.\n- Daughter Marriage Aid: ₹50,000.\n- Natural Death: ₹2 Lakh / Accidental Death: ₹4 Lakh.',
    body_md_or: '### ପ୍ରମୁଖ ସହାୟତା\n- ଷଷ୍ଠ ଶ୍ରେଣୀରୁ ଉଚ୍ଚଶିକ୍ଷା ପର୍ଯ୍ୟନ୍ତ ବୃତ୍ତି, ଝିଅ ବିବାହ ସହାୟତା ଓ ପରିବାରକୁ ₹୪ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ସୁରକ୍ଷା।',
    category: 'Social Security',
    department: 'Odisha Building & Other Construction Workers Welfare Board (Labour Dept)',
    gov_level: 'Odisha',
    target_groups: ['workers', 'students', 'families', 'rural', 'urban'],
    min_age: 18,
    max_age: 60,
    max_income: 200000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: 'Scholarships up to ₹40k + ₹50k Marriage + ₹4L Accident Cover',
    benefit_summary_or: '₹୪୦ ହଜାର ବୃତ୍ତି + ₹୫୦ ହଜାର ବିବାହ + ₹୪ ଲକ୍ଷ ବୀମା',
    documents_required: ['Nirman Shramik Registration Card', '90-Day Construction Work Certificate', 'Aadhaar & Bank Passbook', 'Student Bonafide'],
    required_docs: [
      { doc: 'Active OBOCWWB Labour Registration Card (Renewal up-to-date)', where: 'nirmanshramik.odisha.gov.in', mandatory: true },
      { doc: '90-Day Employment Certificate in Past 12 Months', where: 'Employer / Union / Labour Inspector', mandatory: true }
    ],
    application_steps: [
      'Register/renew card on nirmanshramik.odisha.gov.in (annual renewal fee ₹20–₹50).',
      'Apply online for Scholarship, Marriage, Safety Kit, or Maternity assistance.'
    ],
    disbursement_mode: 'DBT via Nirman Shramik Portal',
    helpline: '155368 (Shramik Sahayata Helpline)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://nirmanshramik.odisha.gov.in/',
    sort_order: 230,
    is_featured: 1
  },
  {
    id: 'sch-pmay-urban-gramin-odisha',
    slug: 'pmay-urban-gramin-housing-odisha',
    title: 'PM Awas Yojana (PMAY-Urban 2.0 & PMAY-Gramin Housing)',
    title_or: 'ପ୍ରଧାନମନ୍ତ୍ରୀ ଆବାସ ଯୋଜନା (ସହରାଞ୍ଚଳ ୨.୦ ଓ ଗ୍ରାମୀଣ)',
    summary: 'Central & State co-funded pucca house construction support (₹1.20L–₹1.30L rural IAP, up to ₹2.50L urban subsidy / EWS/LIG interest subsidy).',
    summary_or: 'ଗ୍ରାମାଞ୍ଚଳରେ ₹୧.୨୦–₹୧.୩୦ ଲକ୍ଷ ଏବଂ ସହରାଞ୍ଚଳରେ (PMAY-U 2.0) ₹୨.୫୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ପକ୍କା ଘର ଓ ଗୃହଋଣ ସୁଧ ରିହାତି।',
    body_md: '### Convergence with Odisha Toilet & Power\n- Every PMAY house converges with SBM toilet grant (₹12,000), MGNREGS wages, Jal Jeevan tap water & Saubhagya electricity.',
    body_md_or: '### ସମନ୍ୱିତ ସୁବିଧା\n- ପକ୍କା ଘର ସହ ଶୌଚାଳୟ, ପାନୀୟ ଜଳ ଓ ବିଜୁଳି ସଂଯୋଗ ସୁବିଧା।',
    category: 'Housing & Civic',
    department: 'Ministry of Housing & Rural Development / PR & H&UD Odisha',
    gov_level: 'Central',
    target_groups: ['families', 'rural', 'urban', 'women'],
    min_age: 18,
    max_age: null,
    max_income: 300000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹1.2L–₹2.5L Housing Assistance + Home Loan Interest Subsidy',
    benefit_summary_or: '₹୧.୨ ଲକ୍ଷ – ₹୨.୫ ଲକ୍ଷ ପକ୍କା ଘର ସହାୟତା',
    documents_required: ['Aadhaar Card', 'Income Certificate (EWS ≤₹3L)', 'No-Pucca-House Affidavit', 'Land Patta / ULB Plot Proof'],
    required_docs: [
      { doc: 'Aadhaar Cards of All Household Members', where: 'Applicant', mandatory: true },
      { doc: 'Land Patta / Residence Proof (Non-Ownership of Pucca House)', where: 'e-District Odisha', mandatory: true }
    ],
    application_steps: [
      'Apply on pmaymis.gov.in (Urban 2.0) or AwaasPlus GP survey (Gramin).',
      'Prefer joint or female household head ownership to unlock priority allotment.'
    ],
    disbursement_mode: 'Geo-Tagged Tranche DBT into Owner Account',
    helpline: '1800-11-6163 (Urban) / 1800-11-6446 (Gramin)',
    verified_date: '2026-11-10',
    application_status_label: 'Open Year-Round',
    exam_slug: '',
    apply_url: 'https://pmaymis.gov.in/',
    sort_order: 240,
    is_featured: 0
  },
  {
    id: 'sch-nmms-merit-scholarship',
    slug: 'nmms-national-means-cum-merit-scholarship',
    title: 'National Means-cum-Merit Scholarship (NMMS Class 8 -> 12 Odisha)',
    title_or: 'ଜାତୀୟ ମେଧା ଓ ସାଧନ ବୃତ୍ତି ପରୀକ୍ଷା (NMMS ଅଷ୍ଟମ ରୁ ଦ୍ୱାଦଶ)',
    summary: 'Annual ₹12,000 scholarship (₹1,000/month) from Class 9 to Class 12 for meritorious govt/aided school students selected through Odisha SCERT NMMS test.',
    summary_or: 'ସରକାରୀ/ଅନୁଦାନପ୍ରାପ୍ତ ବିଦ୍ୟାଳୟର ଅଷ୍ଟମ ଶ୍ରେଣୀ ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ SCERT ପରୀକ୍ଷା ମାଧ୍ୟମରେ ନବମରୁ ଦ୍ୱାଦଶ ପର୍ଯ୍ୟନ୍ତ ବାର୍ଷିକ ₹୧୨,୦୦୦ ବୃତ୍ତି।',
    body_md: '### Exam Pattern\n- 90-mark Mental Ability Test (MAT) + 90-mark Scholastic Aptitude Test (SAT) conducted by TE & SCERT Odisha in November–December.',
    body_md_or: '### ପରୀକ୍ଷା ଢାଞ୍ଚା\n- MAT (୯୦ ମାର୍କ) ଓ SAT (୯୦ ମାର୍କ) ପରୀକ୍ଷାରେ ଉତ୍ତୀର୍ଣ୍ଣ ହେଲେ ପ୍ରତିବର୍ଷ ₹୧୨,୦୦୦ ବୃତ୍ତି।',
    category: 'Scholarship',
    department: 'Ministry of Education & TE/SCERT Odisha',
    gov_level: 'Central',
    target_groups: ['students', 'rural', 'urban'],
    min_age: 12,
    max_age: 16,
    max_income: 350000,
    gender_eligible: 'all',
    beneficiary_categories: ['all', 'sc', 'st', 'obc', 'ews'],
    benefit_summary: '₹12,000/year (₹48,000 over Classes 9–12)',
    benefit_summary_or: 'ବାର୍ଷିକ ₹୧୨,୦୦୦ (ନବମ–ଦ୍ୱାଦଶରେ ₹୪୮,୦୦୦)',
    documents_required: ['Class 7 Marksheet (≥55%, 50% SC/ST)', 'Parent Income Certificate (≤₹3.5L)', 'NMMS Admit/Rank Card', 'NSP OTR ID'],
    required_docs: [
      { doc: 'Class 7 Annual Exam ≥55% Marksheet (50% SC/ST)', where: 'Govt / Aided School', mandatory: true },
      { doc: 'Parental Income Certificate (≤ ₹3.5 Lakh)', where: 'e-District Odisha', mandatory: true },
      { doc: 'NMMS Merit Selection Certificate + NSP Renewal', where: 'ntse.scertodisha.nic.in / NSP', mandatory: true }
    ],
    application_steps: [
      'Apply in Class 8 through Headmaster on SCERT Odisha NMMS portal (scertodisha.nic.in).',
      'Qualify MAT + SAT district merit cutoff.',
      'Claim annual ₹12,000 renewal every year from Class 9 to 12 on scholarships.gov.in.'
    ],
    disbursement_mode: 'Annual PFMS DBT via National Scholarship Portal',
    helpline: '0674-2502928 (TE & SCERT Odisha)',
    verified_date: '2026-11-10',
    application_status_label: 'Closing Soon',
    exam_slug: 'nmms-odisha',
    apply_url: 'https://scertodisha.nic.in/',
    sort_order: 250,
    is_featured: 1
  }
];

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildSql(nodes) {
  const stmts = [];

  for (const batch of chunk(nodes, 50)) {
    const values = batch.map(n => `(${[
      sqlStr(n.id),
      sqlStr(n.slug),
      sqlStr(n.parent_slug),
      sqlStr(n.level),
      sqlStr(n.title),
      sqlStr(n.title_or),
      sqlStr(n.subtitle),
      sqlStr(n.subtitle_or),
      sqlStr(n.badge_text),
      sqlStr(n.icon_name),
      sqlStr(n.official_url),
      sqlStr(n.metadata_json),
      sqlInt(n.sort_order),
      "'published'",
      "datetime('now')"
    ].join(', ')})`).join(',\n');

    stmts.push(`INSERT INTO schemes_directory_nodes (
  id, slug, parent_slug, level, title, title_or, subtitle, subtitle_or,
  badge_text, icon_name, official_url, metadata_json, sort_order, status, updated_at
) VALUES
${values}
ON CONFLICT(slug) DO UPDATE SET
  parent_slug = excluded.parent_slug,
  level = excluded.level,
  title = excluded.title,
  title_or = CASE WHEN excluded.title_or != '' THEN excluded.title_or ELSE schemes_directory_nodes.title_or END,
  subtitle = CASE WHEN excluded.subtitle != '' THEN excluded.subtitle ELSE schemes_directory_nodes.subtitle END,
  subtitle_or = CASE WHEN excluded.subtitle_or != '' THEN excluded.subtitle_or ELSE schemes_directory_nodes.subtitle_or END,
  badge_text = CASE WHEN excluded.badge_text != '' THEN excluded.badge_text ELSE schemes_directory_nodes.badge_text END,
  icon_name = CASE WHEN excluded.icon_name != '' THEN excluded.icon_name ELSE schemes_directory_nodes.icon_name END,
  official_url = CASE WHEN excluded.official_url != '' THEN excluded.official_url ELSE schemes_directory_nodes.official_url END,
  metadata_json = excluded.metadata_json,
  sort_order = excluded.sort_order,
  updated_at = datetime('now');`);
  }

  for (const s of FLAGSHIP_SCHEMES) {
    stmts.push(`INSERT INTO schemes_directory (
  id, slug, title, title_or, summary, summary_or, body_md, body_md_or,
  category, department, gov_level, target_groups, min_age, max_age, max_income,
  gender_eligible, beneficiary_categories, benefit_summary, benefit_summary_or,
  documents_required, required_docs_json, application_steps_json, disbursement_mode,
  helpline, verified_date, application_status_label, exam_slug,
  apply_url, status, sort_order, is_featured, updated_at
) VALUES (
  ${sqlStr(s.id)}, ${sqlStr(s.slug)}, ${sqlStr(s.title)}, ${sqlStr(s.title_or)},
  ${sqlStr(s.summary)}, ${sqlStr(s.summary_or)}, ${sqlStr(s.body_md)}, ${sqlStr(s.body_md_or)},
  ${sqlStr(s.category)}, ${sqlStr(s.department)}, ${sqlStr(s.gov_level)},
  ${sqlStr(JSON.stringify(s.target_groups))}, ${sqlIntOrNull(s.min_age)}, ${sqlIntOrNull(s.max_age)}, ${sqlIntOrNull(s.max_income)},
  ${sqlStr(s.gender_eligible)}, ${sqlStr(JSON.stringify(s.beneficiary_categories))},
  ${sqlStr(s.benefit_summary)}, ${sqlStr(s.benefit_summary_or)},
  ${sqlStr(JSON.stringify(s.documents_required))}, ${sqlStr(JSON.stringify(s.required_docs))},
  ${sqlStr(JSON.stringify(s.application_steps))}, ${sqlStr(s.disbursement_mode)},
  ${sqlStr(s.helpline)}, ${sqlStr(s.verified_date)}, ${sqlStr(s.application_status_label)},
  ${sqlStr(s.exam_slug)}, ${sqlStr(s.apply_url)}, 'published',
  ${sqlInt(s.sort_order)}, ${sqlInt(s.is_featured)}, datetime('now')
)
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  title_or = excluded.title_or,
  summary = excluded.summary,
  summary_or = excluded.summary_or,
  body_md = excluded.body_md,
  body_md_or = excluded.body_md_or,
  category = excluded.category,
  department = excluded.department,
  gov_level = excluded.gov_level,
  target_groups = excluded.target_groups,
  min_age = excluded.min_age,
  max_age = excluded.max_age,
  max_income = excluded.max_income,
  gender_eligible = excluded.gender_eligible,
  beneficiary_categories = excluded.beneficiary_categories,
  benefit_summary = excluded.benefit_summary,
  benefit_summary_or = excluded.benefit_summary_or,
  documents_required = excluded.documents_required,
  required_docs_json = excluded.required_docs_json,
  application_steps_json = excluded.application_steps_json,
  disbursement_mode = excluded.disbursement_mode,
  helpline = excluded.helpline,
  verified_date = excluded.verified_date,
  application_status_label = excluded.application_status_label,
  exam_slug = excluded.exam_slug,
  apply_url = excluded.apply_url,
  sort_order = excluded.sort_order,
  is_featured = excluded.is_featured,
  deleted_at = NULL,
  updated_at = datetime('now');`);
  }

  return stmts.join('\n\n') + '\n';
}

function main() {
  const nodes = buildTreeNodes();
  const counts = nodes.reduce((acc, n) => {
    acc[n.level] = (acc[n.level] || 0) + 1;
    return acc;
  }, {});
  console.log('Prepared Schemes tree nodes:', counts, 'totalNodes:', nodes.length, 'flagshipSchemes:', FLAGSHIP_SCHEMES.length);

  if (dryRun) return;

  const sql = buildSql(nodes);
  const tmpFile = path.join(os.tmpdir(), `cso-schemes-seed-${Date.now()}.sql`);
  fs.writeFileSync(tmpFile, sql, 'utf8');
  try {
    console.log(`Executing seed SQL (${(sql.length / 1024).toFixed(1)} KB) on ${modeFlag}...`);
    runWranglerD1(tmpFile, true);
    const out = runWranglerD1(
      `SELECT
        (SELECT COUNT(*) FROM schemes_directory_nodes WHERE status='published') AS tree_nodes,
        (SELECT COUNT(*) FROM schemes_directory_nodes WHERE level='group') AS groups_cnt,
        (SELECT COUNT(*) FROM schemes_directory_nodes WHERE level='section') AS sections_cnt,
        (SELECT COUNT(*) FROM schemes_directory_nodes WHERE level='subcategory') AS sub_cnt,
        (SELECT COUNT(*) FROM schemes_directory_nodes WHERE level='entry') AS entry_cnt,
        (SELECT COUNT(*) FROM schemes_directory WHERE deleted_at IS NULL AND status='published') AS schemes_cnt;`
    );
    console.log('Verified D1 counts:', out);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

main();
