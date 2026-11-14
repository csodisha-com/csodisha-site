#!/usr/bin/env node
/**
 * Idempotent D1 Seeder for Study Library (`study_library_nodes` + `resources`).
 * 1. Extracts all 10 groups, 28 sections, 176 subcategories, and 1,467 entries (1,681 nodes)
 *    from `study-library/generated/directory.json` with bilingual Odia metadata, exam links,
 *    and official academic portal URLs.
 * 2. Upserts 14 verified Odisha & National study materials, syllabi, PYQs, and Odisha GK notes
 *    into `resources` (OPSC OAS, OSSC CGL, OSSSC RI/ARI/Amin, UGC NET English & Education,
 *    Odisha B.Ed./OTET/OSSTET, BSE Class 10, CHSE +2).
 *
 * Usage:
 *   node scripts/seed-study-library-d1.mjs --local
 *   NODE_OPTIONS="--dns-result-order=ipv4first" node scripts/seed-study-library-d1.mjs --remote
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
    slug: 'early-childhood-primary-education',
    icon: '🧒',
    title_or: 'ପ୍ରାଥମିକ ଓ ବାଲ୍ୟକାଳ ଶିକ୍ଷା',
    subtitle: 'Playgroup, FLN NIPUN Odisha, Classes 1–5 & OAVS foundational modules',
    subtitle_or: 'ବାଳବାଟିକା, ନିପୁଣ ଓଡ଼ିଶା ଓ ପ୍ରଥମରୁ ପଞ୍ଚମ ଶ୍ରେଣୀ ପାଠ୍ୟକ୍ରମ',
    badge: 'Foundation',
    exam_slug: 'odisha-bed-otet',
    resource_url: 'https://osepa.odisha.gov.in/'
  },
  '02': {
    slug: 'school-higher-secondary-education',
    icon: '🏫',
    title_or: 'ବିଦ୍ୟାଳୟ ଓ ଉଚ୍ଚ ମାଧ୍ୟମିକ ଶିକ୍ଷା',
    subtitle: 'BSE Odisha Class 6–10, CHSE +2 Arts/Science/Commerce & NCERT textbooks',
    subtitle_or: 'ବିଏସଇ ଓଡ଼ିଶା ଦଶମ, ସିଏଚ୍ଏସ୍ଇ ଯୁକ୍ତ ୨ ଓ ଏନସିଇଆରଟି ପାଠ୍ୟପୁସ୍ତକ',
    badge: 'BSE & CHSE',
    exam_slug: 'bse-odisha-10',
    resource_url: 'https://www.bseodisha.ac.in/'
  },
  '03': {
    slug: 'undergraduate-postgraduate-research',
    icon: '🎓',
    title_or: 'ସ୍ନାତକ, ସ୍ନାତକୋତ୍ତର ଓ ଗବେଷଣା',
    subtitle: 'Odisha State Universities (+3 CBCS), OSOU distance learning & PhD NET',
    subtitle_or: 'ଓଡ଼ିଶା ବିଶ୍ୱବିଦ୍ୟାଳୟ ସ୍ନାତକ, ଓଏସଓୟୁ ଓ ଗବେଷଣା ସହାୟତା',
    badge: 'Higher Ed',
    exam_slug: 'ugc-net',
    resource_url: 'https://dhe.odisha.gov.in/'
  },
  '04': {
    slug: 'competitive-exams-teacher-education',
    icon: '📝',
    title_or: 'ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା ଓ ଶିକ୍ଷକ ଶିକ୍ଷା',
    subtitle: 'OPSC OAS, OSSC CGL, OSSSC RI/ARI/Amin, OTET, OSSTET, B.Ed. & UGC NET',
    subtitle_or: 'ଓପିଏସସି, ଓଏସଏସସି, ଓଏସଏସଏସସି, ବି.ଏଡ୍, ଓଟିଇଟି ଓ ୟୁଜିସି ନେଟ୍',
    badge: 'Most Active',
    exam_slug: 'opsc-oas',
    resource_url: 'https://www.opsc.gov.in/'
  },
  '05': {
    slug: 'professional-vocational-digital-skills',
    icon: '💻',
    title_or: 'ବୃତ୍ତିଗତ, ଧନ୍ଦାମୂଳକ ଓ ଡିଜିଟାଲ ଦକ୍ଷତା',
    subtitle: 'OSDA ITI/Polytechnic, PGDCA computer proficiency, AI & coding tracks',
    subtitle_or: 'ଆଇଟିଆଇ, ପଲିଟେକନିକ୍, କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ଓ ଡିଜିଟାଲ ପ୍ରଶିକ୍ଷଣ',
    badge: 'Skilled Odisha',
    exam_slug: 'ossc-cgl',
    resource_url: 'https://skillodisha.gov.in/'
  },
  '06': {
    slug: 'subjects-languages-study-materials',
    icon: '📖',
    title_or: 'ବିଷୟ, ଭାଷା ଓ ଅଧ୍ୟୟନ ସାମଗ୍ରୀ',
    subtitle: 'Odia Sahitya, General English, Odisha History, Polity, Economy & Math',
    subtitle_or: 'ଓଡ଼ିଆ ସାହିତ୍ୟ, ଇଂରାଜୀ, ଓଡ଼ିଶା ଇତିହାସ, ଅର୍ଥନୀତି ଓ ଗଣିତ ନୋଟ୍ସ',
    badge: 'Core Subjects',
    exam_slug: 'opsc-oas',
    resource_url: 'https://scertodisha.nic.in/'
  },
  '07': {
    slug: 'international-inclusive-education',
    icon: '🌍',
    title_or: 'ଆନ୍ତର୍ଜାତୀୟ ଓ ଅନ୍ତର୍ଭୁକ୍ତିମୂଳକ ଶିକ୍ଷା',
    subtitle: 'MOOCs (SWAYAM/NPTEL), Inclusive CWSN, Tribal Mother-Tongue & Accessibility',
    subtitle_or: 'ସ୍ୱୟଂ ପୋର୍ଟାଲ, ଅନ୍ତର୍ଭୁକ୍ତିମୂଳକ ଶିକ୍ଷା ଓ ମାତୃଭାଷା ଭିତ୍ତିକ ଶିକ୍ଷଣ',
    badge: 'Inclusive',
    exam_slug: 'odisha-bed-otet',
    resource_url: 'https://swayam.gov.in/'
  },
  '08': {
    slug: 'life-skills-culture-lifelong-learning',
    icon: '🏛️',
    title_or: 'ଜୀବନ ଦକ୍ଷତା, ସଂସ୍କୃତି ଓ ନିରନ୍ତର ଶିକ୍ଷା',
    subtitle: 'Kalinga heritage, civic literacy, financial awareness & NEP 2020 skills',
    subtitle_or: 'କଳିଙ୍ଗ ଐତିହ୍ୟ, ଆର୍ଥିକ ସାକ୍ଷରତା, ନାଗରିକ ଦାୟିତ୍ୱ ଓ ନୈତିକ ଶିକ୍ଷା',
    badge: 'Lifelong',
    exam_slug: 'opsc-oas',
    resource_url: 'https://odisha.gov.in/'
  },
  '09': {
    slug: 'libraries-educators-learning-support',
    icon: '🗂️',
    title_or: 'ପାଠାଗାର, ଶିକ୍ଷକ ଓ ଶିକ୍ଷଣ ସହାୟତା',
    subtitle: 'HKM State Library, NDLI open e-books, SCERT lesson plans & pedagogy tools',
    subtitle_or: 'ହରେକୃଷ୍ଣ ମହତାବ ରାଜ୍ୟ ପାଠାଗାର, ଏନଡିଏଲଆଇ ଓ ଶିକ୍ଷଣ ସହାୟତା',
    badge: 'Open Access',
    exam_slug: 'ugc-net',
    resource_url: 'https://ndl.iitkgp.ac.in/'
  },
  '10': {
    slug: 'odisha-study-hub-resource-organisation',
    icon: '🧭',
    title_or: 'ଓଡ଼ିଶା ଅଧ୍ୟୟନ କେନ୍ଦ୍ର ଓ ସାମଗ୍ରୀ ସଂଗଠନ',
    subtitle: 'Exam calendar sync, PYQ repository mapping & offline revision workflows',
    subtitle_or: 'ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର, ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନପତ୍ର ଓ ଅଫଲାଇନ୍ ରିଭିଜନ ବ୍ୟବସ୍ଥା',
    badge: 'Odisha Hub',
    exam_slug: 'ossc-cgl',
    resource_url: 'https://csodisha.com/study-library/'
  }
};

function inferNodeContext(text, fallbackExam, fallbackUrl) {
  const s = String(text || '').toLowerCase();
  if (/opsc|oas|ocs|civil service|odisha geography|odisha history/.test(s)) {
    return { exam_slug: 'opsc-oas', resource_url: 'https://www.opsc.gov.in/' };
  }
  if (/ossc|cgl|chsl|combined graduate/.test(s)) {
    return { exam_slug: 'ossc-cgl', resource_url: 'https://www.ossc.gov.in/' };
  }
  if (/osssc|ri |amin|ari|sfs|icds|forester|peo|revenue inspector/.test(s)) {
    return { exam_slug: 'osssc-ri-amin', resource_url: 'https://www.osssc.gov.in/' };
  }
  if (/ugc|net|jrf|ph\.d|research|english literature|ma |msc /.test(s)) {
    return { exam_slug: 'ugc-net', resource_url: 'https://ugcnet.nta.ac.in/' };
  }
  if (/b\.ed|otet|osstet|ctet|pedagogy|d\.el\.ed|teacher|scert|nipun|fln/.test(s)) {
    return { exam_slug: 'odisha-bed-otet', resource_url: 'https://scertodisha.nic.in/' };
  }
  if (/chse|\+2|higher secondary|plus two|class 11|class 12/.test(s)) {
    return { exam_slug: 'chse-odisha-12', resource_url: 'https://chseodisha.nic.in/' };
  }
  if (/bse|matric|class 10|class 9|high school|patha|sahitya/.test(s)) {
    return { exam_slug: 'bse-odisha-10', resource_url: 'https://www.bseodisha.ac.in/' };
  }
  if (/osou|open university|distance/.test(s)) {
    return { exam_slug: 'ugc-net', resource_url: 'https://www.osou.ac.in/' };
  }
  if (/iti|polytechnic|sctevt|skill|vocational|computer|coding|ai/.test(s)) {
    return { exam_slug: 'ossc-cgl', resource_url: 'https://skillodisha.gov.in/' };
  }
  if (/ncert|cbse|diksha/.test(s)) {
    return { exam_slug: fallbackExam || 'bse-odisha-10', resource_url: 'https://ncert.nic.in/' };
  }
  return { exam_slug: fallbackExam || 'opsc-oas', resource_url: fallbackUrl || 'https://csodisha.com/study-library/' };
}

function buildDirectoryNodes() {
  const dirPath = path.join(ROOT, 'study-library', 'generated', 'directory.json');
  const raw = JSON.parse(fs.readFileSync(dirPath, 'utf8'));
  const nav = Array.isArray(raw.navigation) ? raw.navigation : [];
  const usedSlugs = new Set();
  const nodes = [];

  const claimSlug = (base, fallback) => {
    let s = slugify(base) || fallback;
    if (!usedSlugs.has(s)) {
      usedSlugs.add(s);
      return s;
    }
    let idx = 2;
    while (usedSlugs.has(`${s}-${idx}`)) idx += 1;
    const unique = `${s}-${idx}`;
    usedSlugs.add(unique);
    return unique;
  };

  nav.forEach((group, gIdx) => {
    const gNum = String(gIdx + 1).padStart(2, '0');
    const meta = GROUP_META[gNum] || {};
    const gSlug = claimSlug(meta.slug || group.id || group.title, `group-${gNum}`);
    const gCtx = {
      exam_slug: meta.exam_slug || 'opsc-oas',
      resource_url: meta.resource_url || 'https://csodisha.com/study-library/'
    };

    nodes.push({
      id: `study-grp-${gNum}`,
      slug: gSlug,
      parent_slug: null,
      level: 'group',
      title: group.title,
      title_or: meta.title_or || '',
      subtitle: meta.subtitle || '',
      subtitle_or: meta.subtitle_or || '',
      badge_text: meta.badge || 'Study Track',
      icon_name: meta.icon || '📚',
      exam_slug: gCtx.exam_slug,
      resource_url: gCtx.resource_url,
      metadata_json: JSON.stringify({ number: gNum, legacy_id: group.id || `group-${gNum}` }),
      sort_order: (gIdx + 1) * 10
    });

    const sections = Array.isArray(group.sections) ? group.sections : [];
    sections.forEach((sec, sIdx) => {
      const secNum = String(sec.number || `${gIdx + 1}.${sIdx + 1}`);
      const secPad = secNum.padStart(2, '0');
      const secSlug = claimSlug(`${gSlug}-${sec.title}`, `section-${secPad}`);
      const secCtx = inferNodeContext(sec.title, gCtx.exam_slug, gCtx.resource_url);

      nodes.push({
        id: `study-sec-${secPad}-${sIdx + 1}`,
        slug: secSlug,
        parent_slug: gSlug,
        level: 'section',
        title: sec.title,
        title_or: '',
        subtitle: `Section ${secNum} · ${group.title}`,
        subtitle_or: '',
        badge_text: `Sec ${secNum}`,
        icon_name: '📂',
        exam_slug: secCtx.exam_slug,
        resource_url: secCtx.resource_url,
        metadata_json: JSON.stringify({ number: secNum, notes: Array.isArray(sec.notes) ? sec.notes : [] }),
        sort_order: (sIdx + 1) * 10
      });

      const subcats = Array.isArray(sec.children) ? sec.children : [];
      subcats.forEach((sub, subIdx) => {
        const subNum = `${secNum}.${subIdx + 1}`;
        const subSlug = claimSlug(`${secSlug}-${sub.title}`, `sub-${secPad}-${subIdx + 1}`);
        const subCtx = inferNodeContext(`${sec.title} ${sub.title}`, secCtx.exam_slug, secCtx.resource_url);

        nodes.push({
          id: `study-sub-${secPad}-${String(subIdx + 1).padStart(2, '0')}`,
          slug: subSlug,
          parent_slug: secSlug,
          level: 'subcategory',
          title: sub.title,
          title_or: '',
          subtitle: `${sec.title}`,
          subtitle_or: '',
          badge_text: `${(sub.children || []).length} Topics`,
          icon_name: '📘',
          exam_slug: subCtx.exam_slug,
          resource_url: subCtx.resource_url,
          metadata_json: JSON.stringify({ number: subNum }),
          sort_order: (subIdx + 1) * 10
        });

        const entries = Array.isArray(sub.children) ? sub.children : [];
        entries.forEach((ent, eIdx) => {
          const entNum = String(ent.number || `${subNum}.${eIdx + 1}`);
          const entSlug = claimSlug(`${subSlug}-${ent.title}`, `ent-${secPad}-${subIdx + 1}-${eIdx + 1}`);
          const entCtx = inferNodeContext(`${sec.title} ${sub.title} ${ent.title}`, subCtx.exam_slug, subCtx.resource_url);

          nodes.push({
            id: `study-ent-${secPad}-${String(subIdx + 1).padStart(2, '0')}-${String(eIdx + 1).padStart(2, '0')}`,
            slug: entSlug,
            parent_slug: subSlug,
            level: 'entry',
            title: ent.title,
            title_or: '',
            subtitle: `${sub.title} · Section ${secNum}`,
            subtitle_or: '',
            badge_text: entNum,
            icon_name: '📄',
            exam_slug: entCtx.exam_slug,
            resource_url: entCtx.resource_url,
            metadata_json: JSON.stringify({ number: entNum }),
            sort_order: (eIdx + 1) * 10
          });
        });
      });
    });
  });

  return nodes;
}

const VERIFIED_RESOURCES = [
  {
    id: 'res-opsc-oas-syllabus',
    kind: 'syllabus',
    resource_type: 'syllabus',
    title: 'OPSC Civil Services (OAS) Prelims & Mains Complete Syllabus',
    title_or: 'ଓପିଏସସି ସିଭିଲ ସର୍ଭିସେସ୍ (OAS) ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ ସମ୍ପୂର୍ଣ୍ଣ ପାଠ୍ୟକ୍ରମ',
    exam: 'OPSC OAS',
    exam_slug: 'opsc-oas',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Official OPSC Odisha Civil Services Examination (OAS/OFS/OPS) Prelims GS-I & CSAT plus Mains 9-paper pattern with Odisha-specific GS weightage, Odia compulsory paper standards, and optional subject groupings.',
    description_or: 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ (OPSC OAS/OFS/OPS) ପ୍ରାରମ୍ଭିକ (GS-I ଓ CSAT) ଏବଂ ମୁଖ୍ୟ ପରୀକ୍ଷାର ୯ଟି ପେପରର ସବିଶେଷ ବିଶ୍ଳେଷଣ, ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଗୁରୁତ୍ୱ ଓ ବାଧ୍ୟତାମୂଳକ ଓଡ଼ିଆ ପେପର ମାନଦଣ୍ଡ।',
    official_source_url: 'https://www.opsc.gov.in/',
    media_key: 'external:https://www.opsc.gov.in/',
    syllabus_units: [
      { unit: 'Prelims Paper I — General Studies (200 Marks)', topics: 'Current events, History of India & Odisha, Geography of Odisha & India, Indian & Odisha Polity, Economy, Environment & Science' },
      { unit: 'Prelims Paper II — CSAT (200 Marks, Qualifying 33%)', topics: 'Comprehension, Logical Reasoning, Analytical Ability, Basic Numeracy (Class X level) & Data Interpretation' },
      { unit: 'Mains Compulsory Languages (250 + 250 Marks)', topics: 'Odia Language & English Language (Qualifying/Rank norms as per latest OPSC notification)' },
      { unit: 'Mains Essay & GS Papers I–IV (1250 Marks)', topics: 'Essay (250), GS-I Heritage/History/Geography (250), GS-II Governance/Polity (250), GS-III Economy/Sci-Tech/Disaster Management (250), GS-IV Ethics & Integrity (250)' },
      { unit: 'Mains Optional Subject Papers I & II (500 Marks)', topics: 'One Optional Subject (2 papers × 250 marks) + Personality Test (250 Marks)' }
    ],
    key_takeaways: [
      'Odisha History, Culture, Art, Geography & State Budget account for 25–35% of Mains GS questions.',
      'Prelims GS-II (CSAT) requires a minimum 33% qualifying score; merit is strictly determined on Paper-I.',
      'Master Economic Survey of Odisha & Union Budget highlights for GS-III high-yield answers.',
      'Practice answer writing with Odisha district case studies in GS-II and GS-IV Ethics.'
    ]
  },
  {
    id: 'res-opsc-oas-odisha-gk',
    kind: 'syllabus',
    resource_type: 'odisha_gk',
    title: 'Odisha History, Geography, Polity & Art Heritage Master Notes',
    title_or: 'ଓଡ଼ିଶା ଇତିହାସ, ଭୂଗୋଳ, ରାଜନୀତି ଓ କଳା-ସଂସ୍କୃତି ମାଷ୍ଟର ନୋଟ୍ସ',
    exam: 'OPSC OAS',
    exam_slug: 'opsc-oas',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'High-yield static & dynamic Odisha GK capsule covering Kalinga, Somavamsi, Ganga & Gajapati dynasties, Paika Rebellion, Freedom Movement in Odisha, River Systems (Mahanadi-Baitarani-Brahmani), Tribes, and GI Tags.',
    description_or: 'କଳିଙ୍ଗ, ସୋମବଂଶୀ, ଗଙ୍ଗ ଓ ଗଜପତି ବଂଶ, ପାଇକ ବିଦ୍ରୋହ, ଓଡ଼ିଶାର ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ, ପ୍ରମୁଖ ନଦୀ, ଜନଜାତି ଓ ଜିଆଇ ଟ୍ୟାଗ୍ ଉପରେ ସମ୍ପୂର୍ଣ୍ଣ ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ନୋଟ୍ସ।',
    official_source_url: 'https://odisha.gov.in/',
    media_key: 'external:https://odisha.gov.in/',
    syllabus_units: [
      { unit: 'Unit 1 — Ancient & Medieval Odisha Dynasties', topics: 'Kalinga War (261 BCE), Kharavela & Hathigumpha, Bhauma-Karas, Somavamsis (Lingaraj Temple), Eastern Gangas (Konark/Puri), Suryavamsi Gajapatis' },
      { unit: 'Unit 2 — Colonial Resistance & Modern Odisha', topics: 'Paika Rebellion (1817), Veer Surendra Sai, Utkal Sammilani (1903), Madhusudan Das, Gopabandhu Das & 1936 Province Formation' },
      { unit: 'Unit 3 — Physical Geography, Rivers & Minerals', topics: 'Eastern Ghats (Deomali), Coastal Plains, Mahanadi/Brahmani/Baitarani/Rushikulya basins, Hirakud, Iron Ore/Bauxite/Chromite belts' },
      { unit: 'Unit 4 — Art, Dance, Tribes & GI Heritage', topics: 'Odissi Dance & Music, Pattachitra, Pipili Applique, Sambalpuri Ikat, 64+ Tribes (PVTGs), Similipal & Bhitarkanika' }
    ],
    key_takeaways: [
      'Memorize chronologies of Konark, Lingaraj, Jagannath & Mukteshwar temple architectures (Rekha, Pidha, Khakhara Deula).',
      'Revise all 30 Odisha districts with headquarters, rivers, national parks, and latest GI-tagged products.',
      'Links directly to OPSC OAS Mains GS-I and OSSC/OSSSC Prelims Odisha GK sections.'
    ]
  },
  {
    id: 'res-ossc-cgl-pyq',
    kind: 'pyq',
    resource_type: 'pyq',
    title: 'OSSC CGLRE Previous Year Solved Question Bank (2022–2025)',
    title_or: 'ଓଏସଏସସି ସିଜିଏଲ୍ (CGLRE) ପୂର୍ବ ବର୍ଷ ସମାଧାନ ପ୍ରଶ୍ନବ୍ୟାଙ୍କ (୨୦୨୨–୨୦୨୫)',
    exam: 'OSSC CGL',
    exam_slug: 'ossc-cgl',
    year: 2025,
    verified_date: '2026-11-14',
    description: 'Authentic shift-wise solved Prelims & Mains papers for OSSC Combined Graduate Level Recruitment Examination (CGLRE) with official answer-key aligned Arithmetic, DI, Reasoning, Computer & Odisha GK solutions.',
    description_or: 'ଓଡ଼ିଶା କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (OSSC CGLRE) ପ୍ରାରମ୍ଭିକ ଓ ମୁଖ୍ୟ ପରୀକ୍ଷାର ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର ସହ ଗଣିତ, ଡାଟା ଇଣ୍ଟରପ୍ରିଟେସନ୍, ରିଜନିଂ, କମ୍ପ୍ୟୁଟର ଓ ଓଡ଼ିଶା ଜିକେ ସମାଧାନ।',
    official_source_url: 'https://www.ossc.gov.in/',
    media_key: 'external:https://www.ossc.gov.in/',
    syllabus_units: [
      { unit: 'Prelims Section A — Arithmetic (10th Standard)', topics: 'Percentage, Profit/Loss, Ratio, SI/CI, Time & Work, Mensuration & Speed-Distance' },
      { unit: 'Prelims Section B — Data Interpretation', topics: 'Tables, Bar Graphs, Line Charts, Pie Charts (30–35 marks high-scoring cluster)' },
      { unit: 'Prelims Section C — Logical Reasoning & Analytical Ability', topics: 'Syllogism, Coding-Decoding, Blood Relations, Seating Arrangement & Series' },
      { unit: 'Prelims Section D — Current Events, Computer & Internet', topics: 'National/Odisha Current Affairs, MS Office shortcuts, Networking & Cyber Security' }
    ],
    key_takeaways: [
      'Prelims is 150 questions / 150 marks in 150 minutes with 0.25 negative marking per wrong MCQ.',
      'Data Interpretation & Arithmetic together contribute ~45–50% of the Prelims score in OSSC CGLRE.',
      'Mains tests Paper-I Language (Odia & English) + Paper-II General Studies + Computer Skill Test.'
    ]
  },
  {
    id: 'res-ossc-cgl-syllabus-notes',
    kind: 'syllabus',
    resource_type: 'syllabus',
    title: 'OSSC CGL & Combined Technical Prelims + Mains Blueprint 2026',
    title_or: 'ଓଏସଏସସି ସିଜିଏଲ୍ ଓ ଯୁଗ୍ମ ବୈଷୟିକ ପରୀକ୍ଷା ପାଠ୍ୟକ୍ରମ ବ୍ଲୁପ୍ରିଣ୍ଟ ୨୦୨୬',
    exam: 'OSSC CGL',
    exam_slug: 'ossc-cgl',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Latest OSSC Group-B/C recruitment scheme covering CBRE Prelims, Mains Language & GS weightage, Certificate Verification checklist, and Computer Practical Skill Test topics.',
    description_or: 'ଓଏସଏସସି ଗ୍ରୁପ୍-ବି/ସି ପ୍ରିଲିମ୍ସ, ମେନ୍ସ ଭାଷା ଓ ସାଧାରଣ ଜ୍ଞାନ ପରୀକ୍ଷା ଢାଞ୍ଚା ଏବଂ କମ୍ପ୍ୟୁଟର ପ୍ରାକ୍ଟିକାଲ ଦକ୍ଷତା ପରୀକ୍ଷାର ସମ୍ପୂର୍ଣ୍ଣ ପାଠ୍ୟକ୍ରମ।',
    official_source_url: 'https://www.ossc.gov.in/',
    media_key: 'external:https://www.ossc.gov.in/',
    syllabus_units: [
      { unit: 'Prelims Qualifying Framework', topics: 'Arithmetic, Data Interpretation, Logical Reasoning, Current Events & Computer Awareness (150 Marks)' },
      { unit: 'Mains Paper I — Odia & English Language', topics: 'Precis, Essay, Letter Drafting, Odia-English Translation & Grammar (100 Marks)' },
      { unit: 'Mains Paper II — General Studies', topics: 'Indian Constitution, Economy, Geography, Odisha Schemes, Science & Environment (100 Marks)' },
      { unit: 'Stage III — Computer Skill Test (50 Marks, Qualifying)', topics: 'MS Word formatting, Excel formulas (VLOOKUP/SUMIF/Charts), PowerPoint & File Management' }
    ],
    key_takeaways: [
      'Minimum 40% in the Computer Skill Test is mandatory regardless of Mains score.',
      'Odia grammar (Sandhi, Samasa, Karaka-Vibhakti, Suddha-Asuddha) is decisive in Mains Paper-I.',
      'Use OSSC PYQ drills on /mock-tests/ to build speed under 150-minute negative-marking rules.'
    ]
  },
  {
    id: 'res-osssc-ri-amin-syllabus',
    kind: 'syllabus',
    resource_type: 'syllabus',
    title: 'OSSSC Combined Recruitment (RI, ICDS, ARI, Amin, SFS) Master Syllabus',
    title_or: 'ଓଏସଏସଏସସି ଯୁଗ୍ମ ପରୀକ୍ଷା (RI, ICDS, ARI, Amin, SFS) ସମ୍ପୂର୍ଣ୍ଣ ପାଠ୍ୟକ୍ରମ',
    exam: 'OSSSC RI/ARI/Amin',
    exam_slug: 'osssc-ri-amin',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Complete Prelims & Mains exam blueprint for OSSSC Revenue Inspector, ICDS Supervisor, Assistant Revenue Inspector, Amin, and Statistical Field Surveyor with negative marking & subject distribution.',
    description_or: 'ଓଡ଼ିଶା ଅଧସ୍ତନ କର୍ମଚାରୀ ଚୟନ ଆୟୋଗ (OSSSC) ଆରଆଇ, ଆଇସିଡିଏସ୍, ଏଆରଆଇ, ଅମିନ ଓ ଏସଏଫଏସ ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ ପରୀକ୍ଷାର ବିଷୟଭିତ୍ତିକ ପାଠ୍ୟକ୍ରମ।',
    official_source_url: 'https://www.osssc.gov.in/',
    media_key: 'external:https://www.osssc.gov.in/',
    syllabus_units: [
      { unit: 'Prelims (100 Marks, 1.5 Hrs)', topics: 'Mathematics (20), General Studies (20), English (20), Odia (20), Logical Reasoning (20) — 0.33 Negative' },
      { unit: 'Mains Core Subjects (180 Marks, 3 Hrs)', topics: 'Mathematics (40), General Studies (40), English (40), Odia Language (40), Computer Knowledge (20)' },
      { unit: 'Stage III — Practical Computer Skill Test (50 Marks)', topics: 'Hands-on MS Windows, Word, Excel, Access & PowerPoint qualifying test' },
      { unit: 'Revenue & Land Survey Vocabulary Bonus', topics: 'Basic Odisha Record of Rights (RoR/Patta), Khatian, Sabik-Hal settlement terms for post readiness' }
    ],
    key_takeaways: [
      'OSSSC deducts 1/3rd mark per wrong MCQ in Prelims & Mains — accuracy matters more than blind guessing.',
      'Equal weightage (40 marks each) across Math, GS, English & Odia in Mains keeps non-technical graduates competitive.',
      'Revise BSE Class 10 Odia Vyakarana and Arithmetic Mensuration thoroughly.'
    ]
  },
  {
    id: 'res-osssc-ri-amin-pyq-notes',
    kind: 'pyq',
    resource_type: 'pyq',
    title: 'OSSSC PEO, Junior Assistant & RI/Amin Solved Question Archive',
    title_or: 'ଓଏସଏସଏସସି ପିଇଓ, ଜୁନିଅର ଆସିଷ୍ଟାଣ୍ଟ ଓ ଆରଆଇ/ଅମିନ ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନପତ୍ର',
    exam: 'OSSSC RI/ARI/Amin',
    exam_slug: 'osssc-ri-amin',
    year: 2025,
    verified_date: '2026-11-14',
    description: 'Curated set of previous OSSSC PEO, JA, Livestock Inspector, and RI/Amin question trends covering Odia idioms, computer abbreviations, Odisha panchayati raj schemes, and Class-X mensuration.',
    description_or: 'ଓଏସଏସଏସସି ପିଇଓ, କନିଷ୍ଠ ସହାୟକ ଓ ଆରଆଇ/ଅମିନ ପରୀକ୍ଷାରେ ଆସିଥିବା ଓଡ଼ିଆ ରୂଢ଼ି, କମ୍ପ୍ୟୁଟର ସଂକ୍ଷିପ୍ତ ନାମ, ପଞ୍ଚାୟତିରାଜ ଯୋଜନା ଓ ପରିମିତି ପ୍ରଶ୍ନୋତ୍ତର।',
    official_source_url: 'https://www.osssc.gov.in/',
    media_key: 'external:https://www.osssc.gov.in/',
    syllabus_units: [
      { unit: 'Odia Language High-Frequency Cluster', topics: 'Rudhi O Lokabani, Biparita Sabda, Pratisabda, Samasa, Krudanta & Taddhita' },
      { unit: 'English Grammar Core Pattern', topics: 'Active/Passive Voice, Direct/Indirect Speech, Prepositions, Subject-Verb Agreement & Error Spotting' },
      { unit: 'Computer Fundamentals Drill', topics: 'OSI Layers, Shortcut Keys, File Extensions, Hardware/BIOS & E-Governance Portals of Odisha' }
    ],
    key_takeaways: [
      'Notice repeated question stems across OSSSC PEO/JA and Forest Guard shifts on Odisha districts & lakes.',
      'Practice 20-mark Computer sections daily using CS Odisha Spaced-Repetition Flashcards.'
    ]
  },
  {
    id: 'res-ugc-net-english-syllabus',
    kind: 'syllabus',
    resource_type: 'syllabus',
    title: 'UGC NET Paper II — English Literature Complete 10-Unit Syllabus',
    title_or: 'ୟୁଜିସି ନେଟ୍ ପେପର-୨ — ଇଂରାଜୀ ସାହିତ୍ୟ ସମ୍ପୂର୍ଣ୍ଣ ୧୦-ୟୁନିଟ୍ ପାଠ୍ୟକ୍ରମ',
    exam: 'UGC NET',
    exam_slug: 'ugc-net',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Complete NTA UGC-NET/JRF & PhD Admission syllabus for English Literature (Subject Code 30): Drama, Poetry, Fiction, Non-Fiction, ELT, Cultural Studies, Literary Criticism & Theory.',
    description_or: 'ଏନଟିଏ ୟୁଜିସି ନେଟ୍/ଜେଆରଏଫ ଇଂରାଜୀ ସାହିତ୍ୟ (କୋଡ୍-୩୦) ର ସମସ୍ତ ୧୦ଟି ୟୁନିଟ୍: ନାଟକ, କବିତା, ଉପନ୍ୟାସ, ଭାଷାବିଜ୍ଞାନ, ସାଂସ୍କୃତିକ ଅଧ୍ୟୟନ ଓ ସାହିତ୍ୟ ତତ୍ତ୍ୱ।',
    official_source_url: 'https://ugcnet.nta.ac.in/',
    media_key: 'external:https://ugcnet.nta.ac.in/',
    syllabus_units: [
      { unit: 'Units I–IV — Core Genres', topics: 'Drama (Shakespeare to Postcolonial), Poetry (Chaucer to Confessional/Indian), Fiction & Short Story, Non-Fictional Prose' },
      { unit: 'Units V–VI — Language & English in India', topics: 'Phonetics, Morphology, ELT Methods & Theories, History/Evolution of English in India (Macaulay to Contemporary)' },
      { unit: 'Units VII–IX — Cultural Studies & Criticism', topics: 'Birmingham School, Cultural Materialism, Aristotle/Longinus/Dryden/Wordsworth/Eliot, New Criticism to Poststructuralism/Postcolonialism' },
      { unit: 'Unit X — Research Methods & Materials in English', topics: 'MLA Style, Bibliography, Archival Criticism, Literary Historiography & Digital Humanities' }
    ],
    key_takeaways: [
      'Chronological matching of texts, sub-titles, first lines, and theoretical concepts accounts for 35% of Paper II.',
      'Pay special attention to Indian Writing in English (including Odia English translations like Fakir Mohan Senapati & Jayanta Mahapatra).'
    ]
  },
  {
    id: 'res-ugc-net-education-notes',
    kind: 'syllabus',
    resource_type: 'study_notes',
    title: 'UGC NET Paper I & Education (Paper II) Core Pedagogy & Research Notes',
    title_or: 'ୟୁଜିସି ନେଟ୍ ପେପର-୧ ଓ ଶିକ୍ଷା (ପେପର-୨) ଗବେଷଣା ଓ ଶିକ୍ଷଣ ତତ୍ତ୍ୱ ନୋଟ୍ସ',
    exam: 'UGC NET',
    exam_slug: 'ugc-net',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Unified revision notes for UGC NET General Paper I (Teaching/Research Aptitude, ICT, People & Environment, Higher Education NEP 2020) and Education Subject Code 09 (Educational Studies, Psychology, Curriculum & Inclusive Education).',
    description_or: 'ୟୁଜିସି ନେଟ୍ ସାଧାରଣ ପେପର-୧ (ଶିକ୍ଷଣ ଓ ଗବେଷଣା ଦକ୍ଷତା, ଆଇସିଟି, ଏନଇପି ୨୦୨୦) ଏବଂ ଶିକ୍ଷା ବିଷୟ (କୋଡ୍-୦୯) ର ସବିଶେଷ ରିଭିଜନ ନୋଟ୍ସ।',
    official_source_url: 'https://www.ugcgov.ac.in/',
    media_key: 'external:https://www.ugcgov.ac.in/',
    syllabus_units: [
      { unit: 'Paper I High-Scoring Modules', topics: 'Levels of Teaching, Positivism vs Post-Positivism, Sampling Methods, Logical Fallacies (Hetvabhasa), NEP 2020 & SDGs' },
      { unit: 'Education Units 1–4', topics: 'Indian Schools of Philosophy (Sankhya, Yoga, Vedanta, Buddhism, Jainism), Western Realism/Pragmatism, Policy Committees (1948–2020)' },
      { unit: 'Education Units 5–10', topics: 'Curriculum Models (Tyler/Taba), APA Research Statistics (ANOVA, Chi-Square), Educational Technology (ADDIE) & RPwD Act 2016' }
    ],
    key_takeaways: [
      'Paper I Indian Logic (Pramanas & Hetvabhasa) and Reading Comprehension offer reliable full-score opportunities.',
      'Compare NEP 2020 5+3+3+4 curricular structure with Kothari Commission & NCF 2005 recommendations.'
    ]
  },
  {
    id: 'res-odisha-bed-syllabus',
    kind: 'syllabus',
    resource_type: 'syllabus',
    title: 'Odisha SAMS B.Ed. & RIE CEE State/Regional Entrance Syllabus 2026',
    title_or: 'ଓଡ଼ିଶା SAMS ବି.ଏଡ୍ ଓ RIE CEE ପ୍ରବେଶିକା ପରୀକ୍ଷା ପାଠ୍ୟକ୍ରମ ୨୦୨୬',
    exam: 'Odisha B.Ed.',
    exam_slug: 'odisha-bed-otet',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Official Higher Education Department (SAMS Odisha) syllabus for B.Ed. Entrance Paper I (Compulsory 40 Marks) & Paper II (Arts/Science Stream 60 Marks), plus NCERT RIE CEE teaching aptitude blueprint.',
    description_or: 'ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ (SAMS Odisha) ଦ୍ୱାରା ପରିଚାଳିତ ବି.ଏଡ୍ ପ୍ରବେଶିକା ପରୀକ୍ଷା ପେପର-୧ (ବାଧ୍ୟତାମୂଳକ ୪୦ ନମ୍ବର) ଓ ପେପର-୨ (କଳା/ବିଜ୍ଞାନ ୬୦ ନମ୍ବର) ପାଠ୍ୟକ୍ରମ।',
    official_source_url: 'https://samsodisha.gov.in/',
    media_key: 'external:https://samsodisha.gov.in/',
    syllabus_units: [
      { unit: 'Paper I — Compulsory Section (40 Marks)', topics: 'Language English (10), General Awareness (10), Reasoning (10), Teaching Aptitude (10)' },
      { unit: 'Paper II — Arts Stream (60 Marks)', topics: 'General English (15), Odia (10), History & Political Science (20), Geography (15)' },
      { unit: 'Paper II — Science Stream (60 Marks)', topics: 'Physical Science (20), Bio-Science (20), Mathematics (20)' }
    ],
    key_takeaways: [
      '0.25 negative marking applies in Odisha SAMS B.Ed. CBT entrance; target 68+ out of 100 for Government B.Ed. seats.',
      'Focus on NCERT Class 9–10 textbooks and SCERT pedagogy scenarios for Teaching Aptitude.'
    ]
  },
  {
    id: 'res-otet-osstet-pedagogy-notes',
    kind: 'syllabus',
    resource_type: 'study_notes',
    title: 'OTET & OSSTET Child Development, Pedagogy & Inclusive Education Capsule',
    title_or: 'ଓଟିଇଟି (OTET) ଓ ଓଏସଏସଟିଇଟି ଶିଶୁ ବିକାଶ, ଶିକ୍ଷାଦାନ କୌଶଳ ଓ ଅନ୍ତର୍ଭୁକ୍ତିମୂଳକ ଶିକ୍ଷା ନୋଟ୍ସ',
    exam: 'OTET / OSSTET',
    exam_slug: 'odisha-bed-otet',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Concise exam-ready notes covering Piaget, Vygotsky, Kohlberg, Erikson, Gardner Multiple Intelligences, RTE Act 2009, CCE Evaluation, FLN NIPUN Bharat, and BSE Odisha OTET Paper I & II pedagogy.',
    description_or: 'ପିଆଜେ, ଭାଇଗୋଟସ୍କି, କୋହଲବର୍ଗ, ଆରଟିଇ ଆଇନ ୨୦୦୯, ସିସିଇ ମୂଲ୍ୟାଙ୍କନ ଓ ନିପୁଣ ଭାରତ ଉପରେ ଓଟିଇଟି/ଓଏସଏସଟିଇଟି ପରୀକ୍ଷା ଉପଯୋଗୀ ନୋଟ୍ସ।',
    official_source_url: 'https://www.bseodisha.ac.in/',
    media_key: 'external:https://www.bseodisha.ac.in/',
    syllabus_units: [
      { unit: 'Unit 1 — Learning & Cognitive Theories', topics: 'Piaget 4 Stages, Vygotsky ZPD & Scaffolding, Pavlov/Skinner Conditioning, Bandura Social Learning' },
      { unit: 'Unit 2 — Inclusive Education & CWSN', topics: 'Learning Disabilities (Dyslexia, Dyscalculia, Dysgraphia), IEP, Braille/Sign Adaptation & RPwD 2016' },
      { unit: 'Unit 3 — Assessment, NCF & RTE 2009', topics: 'Formative vs Summative Assessment, Bloom Taxonomy, Pupil-Teacher Ratios (30:1 / 35:1) & Minimum Working Days' }
    ],
    key_takeaways: [
      'Child Development & Pedagogy carries 30 marks directly plus 10–15 pedagogical questions inside Language/Math/EVS.',
      'Minimum qualifying score is 60% (90/150) for Unreserved and 50% (75/150) for SC/ST/SEBC/PwD.'
    ]
  },
  {
    id: 'res-otet-pyq-solved',
    kind: 'pyq',
    resource_type: 'pyq',
    title: 'BSE Odisha OTET (Paper I & II) & OSSTET Solved PYQ Compendium (2021–2025)',
    title_or: 'ବିଏସଇ ଓଡ଼ିଶା ଓଟିଇଟି (ପେପର ୧ ଓ ୨) ଓ ଓଏସଏସଟିଇଟି ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନୋତ୍ତର (୨୦୨୧–୨୦୨୫)',
    exam: 'OTET / OSSTET',
    exam_slug: 'odisha-bed-otet',
    year: 2025,
    verified_date: '2026-11-14',
    description: 'Verified BSE Odisha final answer-key aligned question papers for OTET Paper I (Classes I–V), OTET Paper II (Classes VI–VIII Math/Science & Social Studies), and OSSTET TGT Arts/Science.',
    description_or: 'ବିଏସଇ ଓଡ଼ିଶା ଦ୍ୱାରା ପ୍ରକାଶିତ ଚୂଡ଼ାନ୍ତ ଉତ୍ତରସୂଚୀ ଆଧାରିତ ଓଟିଇଟି ପେପର-୧, ପେପର-୨ ଏବଂ ଓଏସଏସଟିଇଟି ଟିଜିଟି କଳା ଓ ବିଜ୍ଞାନ ପ୍ରଶ୍ନପତ୍ର ସଂକଳନ।',
    official_source_url: 'https://www.bseodisha.ac.in/',
    media_key: 'external:https://www.bseodisha.ac.in/',
    syllabus_units: [
      { unit: 'OTET Paper I (Classes I–V)', topics: 'CDP (30), Odia (30), English (30), Mathematics (30), Environmental Studies (30) — No Negative Marking' },
      { unit: 'OTET Paper II (Classes VI–VIII)', topics: 'CDP (30), Odia (30), English (30) + Optional Math & Science (60) OR Social Studies (60)' },
      { unit: 'OSSTET TGT Secondary Track', topics: 'Odia/MIL (20), English (20), Stream Subjects (60), Pedagogy/Evaluation (50)' }
    ],
    key_takeaways: [
      'Zero negative marking in OTET/OSSTET — attempt all 150 questions after eliminating distractors.',
      'Odia Pedagogy questions repeatedly test Mother-Tongue reading fluency and diagnostic remediation.'
    ]
  },
  {
    id: 'res-bse-class-10-syllabus-blueprints',
    kind: 'syllabus',
    resource_type: 'syllabus',
    title: 'BSE Odisha Class 10 (HSC Matric) Revised Syllabus & Chapter Question Blueprint',
    title_or: 'ବିଏସଇ ଓଡ଼ିଶା ଦଶମ ଶ୍ରେଣୀ (ମାଟ୍ରିକ୍) ସଂଶୋଧିତ ପାଠ୍ୟକ୍ରମ ଓ ପ୍ରଶ୍ନପତ୍ର ବ୍ଲୁପ୍ରିଣ୍ଟ',
    exam: 'BSE Class 10',
    exam_slug: 'bse-odisha-10',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Official Board of Secondary Education (BSE Odisha, Cuttack) Class 10 Matric blueprint covering FLO (Sahitya Sindhu), SLE (Skills of Communicative English), TLH/TLS, Mathematics (Algebra & Geometry), General Science & Social Science.',
    description_or: 'ମାଧ୍ୟମିକ ଶିକ୍ଷା ପରିଷଦ (BSE Odisha) ଦଶମ ଶ୍ରେଣୀ ସାହିତ୍ୟ ସିନ୍ଧୁ, ଇଂରାଜୀ, ତୃତୀୟ ଭାଷା, ଗଣିତ (ବୀଜଗଣିତ ଓ ଜ୍ୟାମିତି), ସାଧାରଣ ବିଜ୍ଞାନ ଓ ସାମାଜିକ ବିଜ୍ଞାନ ପାଠ୍ୟକ୍ରମ।',
    official_source_url: 'https://www.bseodisha.ac.in/',
    media_key: 'external:https://www.bseodisha.ac.in/',
    syllabus_units: [
      { unit: 'First & Second Language (FLO Odia, SLE English)', topics: 'Prose, Poetry, Essay, Letter Writing, Grammar & Unseen Comprehension (100 Marks each)' },
      { unit: 'Mathematics (MTH — Algebra & Geometry)', topics: 'Quadratic Equations, Arithmetic Progression, Probability, Mensuration, Circle Theorems & Trigonometry' },
      { unit: 'General Science (SCP & SCL)', topics: 'Chemical Equations, Carbon Compounds, Light & Electricity, Control & Coordination, Heredity & Ecology' },
      { unit: 'Social Science (SSH & SSG)', topics: 'Indian National Movement, Creation of Odisha Province (1936), Indian Democracy, Resources & Economic Growth' }
    ],
    key_takeaways: [
      'BSE Odisha 50% OMR Objective + 50% Subjective split rewards textbook line-by-line mastery.',
      'Useful both for Class 10 students AND OSSSC/OSSC foundation aspirants revising state school textbooks.'
    ]
  },
  {
    id: 'res-chse-plus2-science-arts-pyq',
    kind: 'pyq',
    resource_type: 'pyq',
    title: 'CHSE Odisha +2 (Class 12) Science, Arts & Commerce Annual Exam Question Bank',
    title_or: 'ସିଏଚ୍ଏସ୍ଇ ଓଡ଼ିଶା ଯୁକ୍ତ ୨ ବିଜ୍ଞାନ, କଳା ଓ ବାଣିଜ୍ୟ ବାର୍ଷିକ ପରୀକ୍ଷା ପ୍ରଶ୍ନବ୍ୟାଙ୍କ',
    exam: 'CHSE +2',
    exam_slug: 'chse-odisha-12',
    year: 2025,
    verified_date: '2026-11-14',
    description: 'Council of Higher Secondary Education (CHSE Odisha) +2 2nd Year solved previous board questions and marking schemes for Physics, Chemistry, Mathematics, Biology, Political Science, History, Economics & Accountancy.',
    description_or: 'ଉଚ୍ଚ ମାଧ୍ୟମିକ ଶିକ୍ଷା ପରିଷଦ (CHSE Odisha) ଯୁକ୍ତ ୨ ଦ୍ୱିତୀୟ ବର୍ଷ ବିଜ୍ଞାନ, କଳା ଓ ବାଣିଜ୍ୟ ବିଭାଗର ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର ଓ ମୂଲ୍ୟାଙ୍କନ ସୂଚୀ।',
    official_source_url: 'https://chseodisha.nic.in/',
    media_key: 'external:https://chseodisha.nic.in/',
    syllabus_units: [
      { unit: '+2 Science Core Units', topics: 'Electrostatics, Optics, Coordination Chemistry, Biomolecules, Matrices/Calculus & Genetics/Biotechnology' },
      { unit: '+2 Arts Humanities Core Units', topics: 'Indian & World History, Contemporary Political Theory, Micro & Macroeconomics, Logic & Odia Literature' },
      { unit: '+2 Commerce Accounting & Business', topics: 'Partnership & Company Accounts, Financial Statement Analysis, Business Mathematics & Principles of Management' }
    ],
    key_takeaways: [
      'Practicing last 5 years of CHSE 1-mark MCQs and 7-mark long questions secures 85%+ in board exams.',
      'Aligns closely with NCERT syllabus used in CUET UG, JEE Main & NEET preparation.'
    ]
  },
  {
    id: 'res-odisha-history-culture-gk-compendium',
    kind: 'syllabus',
    resource_type: 'odisha_gk',
    title: 'Odisha State Budget, Welfare Schemes & Current Affairs Study Capsule 2026',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ବଜେଟ୍, ଜନକଲ୍ୟାଣ ଯୋଜନା ଓ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ଅଧ୍ୟୟନ କ୍ୟାପସୁଲ୍ ୨୦୨୬',
    exam: 'All Odisha Exams',
    exam_slug: 'opsc-oas',
    year: 2026,
    verified_date: '2026-11-14',
    description: 'Consolidated exam study notes connecting Odisha Economic Survey, Utkarsh Odisha industrial corridors, Subhadra Yojana, Gopabandhu Jan Arogya, Krushak Assistance & Scholarship portals for OPSC, OSSC & OSSSC.',
    description_or: 'ଓଡ଼ିଶା ଅର୍ଥନୈତିକ ସର୍ଭେ, ଉତ୍କର୍ଷ ଓଡ଼ିଶା, ସୁଭଦ୍ରା ଯୋଜନା, ଗୋପବନ୍ଧୁ ଜନ ଆରୋଗ୍ୟ, କୃଷକ ସହାୟତା ଓ ବୃତ୍ତି ଯୋଜନା ଉପରେ ସମ୍ପୂର୍ଣ୍ଣ ପରୀକ୍ଷା ଉପଯୋଗୀ ସାରାଂଶ।',
    official_source_url: 'https://finance.odisha.gov.in/',
    media_key: 'external:https://finance.odisha.gov.in/',
    syllabus_units: [
      { unit: 'Odisha Economic Survey & Fiscal Indicators', topics: 'GSDP Growth Rate, Sectoral Contribution (Mining, Manufacturing, Agriculture, Services) & Per Capita Income' },
      { unit: 'Flagship Welfare & Education Missions', topics: 'Subhadra Yojana, Godabarisha Mishra Adarsha Prathamik Vidyalaya, Mukhyamantri Medhabi Chhatra Protsahan' },
      { unit: 'Sports, Awards & Odisha Achievers', topics: 'Padma Awardees from Odisha, Kalinga Stadium Global Events, Hockey & Athletics Records' }
    ],
    key_takeaways: [
      'Cross-link these scheme facts with live eligibility tools on /schemes-benefits/.',
      'Essential for OPSC OAS Mains GS-III, Interview board questions & OSSC/OSSSC Prelims Current Affairs.'
    ]
  }
];

function writeSqlAndRun(label, sqlText) {
  const tmpFile = path.join(os.tmpdir(), `cso-study-${label}-${Date.now()}.sql`);
  fs.writeFileSync(tmpFile, sqlText, 'utf8');
  try {
    runWranglerD1(tmpFile, true);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function main() {
  const nodes = buildDirectoryNodes();
  const counts = {
    group: nodes.filter(n => n.level === 'group').length,
    section: nodes.filter(n => n.level === 'section').length,
    subcategory: nodes.filter(n => n.level === 'subcategory').length,
    entry: nodes.filter(n => n.level === 'entry').length,
    total: nodes.length
  };
  console.log(`Built Study Library tree (${modeFlag}):`, counts, `+ ${VERIFIED_RESOURCES.length} verified resources.`);

  if (dryRun) {
    console.log('Dry-run mode — skipping D1 writes.');
    return;
  }

  // Batch nodes into chunks of 250 statements each to avoid SQLite statement size limits
  const chunkSize = 250;
  for (let i = 0; i < nodes.length; i += chunkSize) {
    const slice = nodes.slice(i, i + chunkSize);
    const lines = slice.map(n => `INSERT INTO study_library_nodes (
  id, slug, parent_slug, level, title, title_or, subtitle, subtitle_or,
  badge_text, icon_name, exam_slug, resource_url, metadata_json, sort_order, status, updated_at
) VALUES (
  ${sqlStr(n.id)}, ${sqlStr(n.slug)}, ${sqlStr(n.parent_slug)}, ${sqlStr(n.level)},
  ${sqlStr(n.title)}, ${sqlStr(n.title_or)}, ${sqlStr(n.subtitle)}, ${sqlStr(n.subtitle_or)},
  ${sqlStr(n.badge_text)}, ${sqlStr(n.icon_name)}, ${sqlStr(n.exam_slug)}, ${sqlStr(n.resource_url)},
  ${sqlStr(n.metadata_json)}, ${sqlInt(n.sort_order)}, 'published', datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  slug = excluded.slug,
  parent_slug = excluded.parent_slug,
  level = excluded.level,
  title = excluded.title,
  title_or = excluded.title_or,
  subtitle = excluded.subtitle,
  subtitle_or = excluded.subtitle_or,
  badge_text = excluded.badge_text,
  icon_name = excluded.icon_name,
  exam_slug = excluded.exam_slug,
  resource_url = excluded.resource_url,
  metadata_json = excluded.metadata_json,
  sort_order = excluded.sort_order,
  status = 'published',
  updated_at = datetime('now');`);
    writeSqlAndRun(`nodes-${i}`, lines.join('\n'));
  }

  // Upsert 14 verified study resources (preserving kind IN ('syllabus', 'pyq') CHECK constraint)
  const resLines = VERIFIED_RESOURCES.map(r => `INSERT INTO resources (
  id, kind, title, exam, year, description, media_key, status, published_at, updated_at,
  exam_slug, resource_type, verified_date, title_or, description_or,
  syllabus_units_json, key_takeaways_json, official_source_url
) VALUES (
  ${sqlStr(r.id)}, ${sqlStr(r.kind)}, ${sqlStr(r.title)}, ${sqlStr(r.exam)}, ${sqlInt(r.year)},
  ${sqlStr(r.description)}, ${sqlStr(r.media_key)}, 'published', COALESCE((SELECT published_at FROM resources WHERE id = ${sqlStr(r.id)}), datetime('now')), datetime('now'),
  ${sqlStr(r.exam_slug)}, ${sqlStr(r.resource_type)}, ${sqlStr(r.verified_date)}, ${sqlStr(r.title_or)}, ${sqlStr(r.description_or)},
  ${sqlStr(JSON.stringify(r.syllabus_units))}, ${sqlStr(JSON.stringify(r.key_takeaways))}, ${sqlStr(r.official_source_url)}
)
ON CONFLICT(id) DO UPDATE SET
  kind = excluded.kind,
  title = excluded.title,
  exam = excluded.exam,
  year = excluded.year,
  description = excluded.description,
  media_key = excluded.media_key,
  status = 'published',
  updated_at = datetime('now'),
  deleted_at = NULL,
  exam_slug = excluded.exam_slug,
  resource_type = excluded.resource_type,
  verified_date = excluded.verified_date,
  title_or = excluded.title_or,
  description_or = excluded.description_or,
  syllabus_units_json = excluded.syllabus_units_json,
  key_takeaways_json = excluded.key_takeaways_json,
  official_source_url = excluded.official_source_url;`);
  writeSqlAndRun('resources', resLines.join('\n'));

  // Verify exact counts
  const out = runWranglerD1(
    `SELECT level, COUNT(*) AS n FROM study_library_nodes WHERE status='published' GROUP BY level ORDER BY CASE level WHEN 'group' THEN 0 WHEN 'section' THEN 1 WHEN 'subcategory' THEN 2 ELSE 3 END; SELECT COUNT(*) AS total_resources FROM resources WHERE deleted_at IS NULL AND status='published';`
  );
  console.log('D1 Verification Output:\n', out);
}

main().catch(err => {
  console.error('Seed failed:', err.stderr || err.message || err);
  process.exit(1);
});
