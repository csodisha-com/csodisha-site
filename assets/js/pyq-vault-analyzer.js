/**
 * Common Sense Odisha — Interactive Odisha Govt Previous Year Question (PYQ)
 * Paper Vault & Topic Weightage Analyzer (v421)
 * Mounted on /mock-tests/ and /guides/ (#cso-pyq-vault-analyzer-root).
 * Covers OPSC OAS, OSSC CGLRE, OSSSC Combined District Cadre, Odisha Police SI & CBSE CTET.
 * Strict CSP-compliant: DOM APIs only, zero inline styles or on* handlers;
 * bilingual EN / ଓଡ଼ିଆ; discrete CSS horizontal bars (cso-vfv-bar--w*); 4-theme var(--cso-*) tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOPyqVaultAnalyzer = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOPyqVaultAnalyzer = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v421';
  var ROOT_ID = 'cso-pyq-vault-analyzer-root';
  var PREFS_KEY = 'cso_pyq_vault_prefs_v1';

  var EXAM_TRACKS = [
    { key: 'all', en: 'All Exams', or: 'ସମସ୍ତ ପରୀକ୍ଷା' },
    { key: 'opsc-oas', en: 'OPSC OAS', or: 'OPSC OAS' },
    { key: 'ossc-cgl', en: 'OSSC CGLRE', or: 'OSSC CGLRE' },
    { key: 'osssc-combined', en: 'OSSSC Combined District Cadre', or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI/ARI/Amin)' },
    { key: 'odisha-police-si', en: 'Odisha Police SI', or: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI (OPRB)' },
    { key: 'cbse-ctet', en: 'CBSE CTET', or: 'CBSE CTET' }
  ];

  var YEAR_BRACKETS = [
    { key: 'all', en: 'All Years (2021–2026)', or: 'ସମସ୍ତ ବର୍ଷ (୨୦୨୧–୨୦୨୬)' },
    { key: '2025-2026', en: '2025–2026', or: '୨୦୨୫–୨୦୨୬' },
    { key: '2023-2024', en: '2023–2024', or: '୨୦୨୩–୨୦୨୪' },
    { key: '2021-2022', en: '2021–2022', or: '୨୦୨୧–୨୦୨୨' }
  ];

  var STAGES = [
    { key: 'all', en: 'All Stages', or: 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ' },
    { key: 'prelims', en: 'Prelims / Paper I', or: 'ପ୍ରିଲିମ୍ସ / ପେପର୍ I' },
    { key: 'mains', en: 'Mains / Paper II & III', or: 'ମେନ୍ସ / ପେପର୍ II ଓ III' }
  ];

  var WEIGHTAGE_PROFILES = {
    'opsc-oas': {
      examKey: 'opsc-oas',
      en: 'OPSC OAS Prelims (GS Paper I — 100 Qs / 200 Marks)',
      or: 'OPSC OAS ପ୍ରିଲିମ୍ସ (GS ପେପର୍ I — ୧୦୦ ପ୍ରଶ୍ନ / ୨୦୦ ମାର୍କ)',
      negativeMarking: '-0.66 Marks (1/3rd Negative Marking)',
      portal: 'https://opsc.gov.in/',
      topics: [
        {
          en: 'Odisha History, Geography & Polity',
          or: 'ଓଡ଼ିଶା ଇତିହାସ, ଭୂଗୋଳ ଓ ରାଜନୀତି',
          qs: 24,
          pct: 24,
          subtopics: ['Paika Rebellion', 'Mahanadi Basin', 'Odisha Assembly & Schemes'],
          practiceHref: '/mock-tests/?track=odisha-gk'
        },
        {
          en: 'Indian Polity & Governance',
          or: 'ଭାରତୀୟ ସମ୍ବିଧାନ ଓ ଶାସନ',
          qs: 18,
          pct: 18,
          subtopics: ['Fundamental Rights', 'Panchayati Raj (PESA)', 'Constitutional Bodies'],
          practiceHref: '/mock-tests/?track=odisha-gk'
        },
        {
          en: 'Economy & Social Development',
          or: 'ଅର୍ଥନୀତି ଓ ସାମାଜିକ ବିକାଶ',
          qs: 16,
          pct: 16,
          subtopics: ['Odisha State Budget', 'RBI & Inflation', 'Welfare Schemes'],
          practiceHref: '/current-affairs/'
        },
        {
          en: 'Geography & Environment',
          or: 'ଭୂଗୋଳ ଓ ପରିବେଶ',
          qs: 16,
          pct: 16,
          subtopics: ['Chilika & Bhitarkanika Ramsar', 'Monsoon', 'Biodiversity'],
          practiceHref: '/mock-tests/?track=odisha-gk'
        },
        {
          en: 'General Science & Tech',
          or: 'ସାଧାରଣ ବିଜ୍ଞାନ ଓ ପ୍ରଯୁକ୍ତିବିଦ୍ୟା',
          qs: 14,
          pct: 14,
          subtopics: ['ISRO Missions', 'Biotech & Health', 'Everyday Physics'],
          practiceHref: '/mock-tests/?track=reasoning-quant'
        },
        {
          en: 'Current Affairs',
          or: 'ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ',
          qs: 12,
          pct: 12,
          subtopics: ['Odisha State Awards', 'National Reports', 'Sports & Summits'],
          practiceHref: '/current-affairs/'
        }
      ]
    },
    'ossc-cgl': {
      examKey: 'ossc-cgl',
      en: 'OSSC CGLRE Prelims (150 Qs / 150 Marks)',
      or: 'OSSC CGLRE ପ୍ରିଲିମ୍ସ (୧୫୦ ପ୍ରଶ୍ନ / ୧୫୦ ମାର୍କ)',
      negativeMarking: '-0.25 Marks per Wrong Answer',
      portal: 'https://ossc.gov.in/',
      topics: [
        {
          en: 'Arithmetic & Data Interpretation',
          or: 'ଗଣିତ ଓ ଡାଟା ଇଣ୍ଟରପ୍ରିଟେସନ୍',
          qs: 45,
          pct: 30,
          subtopics: ['Percentage & Ratio', 'Time & Work', 'Bar/Pie/Table DI'],
          practiceHref: '/mock-tests/?track=reasoning-quant'
        },
        {
          en: 'Logical Reasoning & Analytical Ability',
          or: 'ତର୍କଶକ୍ତି ଓ ବିଶ୍ଳେଷଣ ଦକ୍ଷତା',
          qs: 36,
          pct: 24,
          subtopics: ['Seating Arrangement', 'Syllogism', 'Coding-Decoding'],
          practiceHref: '/mock-tests/?track=reasoning-quant'
        },
        {
          en: 'Current Events & Odisha / National GK',
          or: 'ସାମ୍ପ୍ରତିକ ଘଟଣା ଓ ଓଡ଼ିଶା / ଜାତୀୟ GK',
          qs: 36,
          pct: 24,
          subtopics: ['Odisha Schemes & GI Tags', 'Sports & Awards', 'National Polity'],
          practiceHref: '/current-affairs/'
        },
        {
          en: 'Computer & Internet Awareness',
          or: 'କମ୍ପ୍ୟୁଟର ଓ ଇଣ୍ଟରନେଟ୍ ଜ୍ଞାନ',
          qs: 33,
          pct: 22,
          subtopics: ['MS Excel / Word Shortcuts', 'Networking', 'Cyber Security'],
          practiceHref: '/mock-tests/?track=odisha-gk'
        }
      ]
    },
    'osssc-combined': {
      examKey: 'osssc-combined',
      en: 'OSSSC Combined District Cadre — RI / ARI / Amin / SFS / ICDS (180 Qs / 180 Marks)',
      or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ — RI / ARI / Amin / SFS / ICDS (୧୮୦ ପ୍ରଶ୍ନ / ୧୮୦ ମାର୍କ)',
      negativeMarking: '-0.50 Marks (or -0.33 per Notification)',
      portal: 'https://osssc.gov.in/',
      topics: [
        {
          en: 'General Studies & Odisha GK',
          or: 'ସାଧାରଣ ଜ୍ଞାନ ଓ ଓଡ଼ିଶା GK',
          qs: 45,
          pct: 25,
          subtopics: ['30 Districts & Rivers', 'Odisha History', 'Everyday Science'],
          practiceHref: '/mock-tests/?track=odisha-gk'
        },
        {
          en: 'Mathematics',
          or: 'ଗଣିତ (Mathematics)',
          qs: 40,
          pct: 22,
          subtopics: ['Mensuration (Amin/RI)', 'Profit & Loss', 'Simple/Compound Interest'],
          practiceHref: '/mock-tests/?track=reasoning-quant'
        },
        {
          en: 'English',
          or: 'ଇଂରାଜୀ (English)',
          qs: 36,
          pct: 20,
          subtopics: ['Tenses & Voice', 'Error Spotting', 'Reading Comprehension'],
          practiceHref: '/mock-tests/?track=teaching-pedagogy'
        },
        {
          en: 'Odia Language',
          or: 'ଓଡ଼ିଆ ଭାଷା ଓ ବ୍ୟାକରଣ',
          qs: 32,
          pct: 18,
          subtopics: ['ସନ୍ଧି ଓ ସମାସ', 'ଶୁଦ୍ଧ ବନାନ', 'ରୂଢ଼ି ଓ ଲୋକବାଣୀ'],
          practiceHref: '/mock-tests/?track=odisha-gk'
        },
        {
          en: 'Computer Knowledge',
          or: 'କମ୍ପ୍ୟୁଟର ଜ୍ଞାନ',
          qs: 27,
          pct: 15,
          subtopics: ['OS & Hardware', 'MS Office', 'Internet & e-Governance'],
          practiceHref: '/mock-tests/?track=reasoning-quant'
        }
      ]
    },
    'odisha-police-si': {
      examKey: 'odisha-police-si',
      en: 'Odisha Police SI (OPRB Paper I & II — 300 Marks)',
      or: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI (OPRB ପେପର୍ I ଓ II — ୩୦୦ ମାର୍କ)',
      negativeMarking: '-0.25 Marks per Wrong Answer',
      portal: 'https://odishapolice.gov.in/',
      topics: [
        {
          en: 'General English & Odia Comprehension',
          or: 'ଇଂରାଜୀ ଓ ଓଡ଼ିଆ ବ୍ୟାକରଣ (Paper I)',
          qs: 100,
          pct: 33,
          subtopics: ['Odia Grammar', 'English Precis/Vocab', 'Translation'],
          practiceHref: '/mock-tests/?track=odisha-gk'
        },
        {
          en: 'General Studies & Odisha History / Polity',
          or: 'ସାଧାରଣ ଜ୍ଞାନ ଓ ଓଡ଼ିଶା ଇତିହାସ (Paper II)',
          qs: 102,
          pct: 34,
          subtopics: ['Odisha Heritage', 'Indian Constitution', 'Current Affairs'],
          practiceHref: '/mock-tests/?track=odisha-gk'
        },
        {
          en: 'Reasoning, Quantitative Aptitude & Computer',
          or: 'ତର୍କଶକ୍ତି, ଗଣିତ ଓ କମ୍ପ୍ୟୁଟର (Paper II)',
          qs: 98,
          pct: 33,
          subtopics: ['Numerical Series', 'Logical Puzzles', 'Basic IT & Cyber'],
          practiceHref: '/mock-tests/?track=reasoning-quant'
        }
      ]
    },
    'cbse-ctet': {
      examKey: 'cbse-ctet',
      en: 'CBSE CTET Paper I & Paper II (150 Qs / 150 Marks)',
      or: 'CBSE CTET ପେପର୍ I ଓ II (୧୫୦ ପ୍ରଶ୍ନ / ୧୫୦ ମାର୍କ)',
      negativeMarking: 'No Negative Marking (0 Penalty)',
      portal: 'https://ctet.nic.in/',
      topics: [
        {
          en: 'Child Development & Pedagogy',
          or: 'ଶିଶୁ ବିକାଶ ଓ ଶିକ୍ଷାଦାନ ବିଜ୍ଞାନ (CDP)',
          qs: 30,
          pct: 20,
          subtopics: ['Piaget / Vygotsky', 'Inclusive Education', 'NEP 2020 Pedagogy'],
          practiceHref: '/mock-tests/?track=teaching-pedagogy'
        },
        {
          en: 'Language I (Odia / English)',
          or: 'ଭାଷା I (ଓଡ଼ିଆ / ଇଂରାଜୀ)',
          qs: 30,
          pct: 20,
          subtopics: ['Unseen Prose & Poetry', 'Language Acquisition', 'Remedial Teaching'],
          practiceHref: '/mock-tests/?track=teaching-pedagogy'
        },
        {
          en: 'Language II (English / Hindi)',
          or: 'ଭାଷା II (ଇଂରାଜୀ / ହିନ୍ଦୀ)',
          qs: 30,
          pct: 20,
          subtopics: ['Comprehension', 'Listening & Speaking Skills', 'TLM'],
          practiceHref: '/mock-tests/?track=teaching-pedagogy'
        },
        {
          en: 'Mathematics & EVS / Social Science',
          or: 'ଗଣିତ ଓ ପରିବେଶ / ସାମାଜିକ ବିଜ୍ଞାନ',
          qs: 60,
          pct: 40,
          subtopics: ['NCERT Class 1–8 Concepts', 'Pedagogical Issues', 'Data & Geometry'],
          practiceHref: '/mock-tests/?track=reasoning-quant'
        }
      ]
    }
  };

  var PYQ_PAPERS = [
    {
      id: 'opsc-oas-2025-prelims',
      examKey: 'opsc-oas',
      board: 'OPSC',
      year: 2025,
      yearBracket: '2025-2026',
      stage: 'prelims',
      en: 'OPSC OAS Prelims 2024–25 — General Studies Paper I & CSAT (Paper II)',
      or: 'OPSC OAS ପ୍ରିଲିମ୍ସ ୨୦୨୪–୨୫ — GS ପେପର୍ I ଓ CSAT',
      shift: 'Combined Civil Services Prelims',
      meta: '100 Qs · 200 Marks · 2 Hrs · -1/3 Negative',
      topTopics: ['Odisha History & Polity (24%)', 'Indian Polity (18%)', 'Economy & Budget (16%)'],
      practiceHref: '/mock-tests/?track=odisha-gk',
      portal: 'https://opsc.gov.in/'
    },
    {
      id: 'opsc-oas-2023-prelims',
      examKey: 'opsc-oas',
      board: 'OPSC',
      year: 2023,
      yearBracket: '2023-2024',
      stage: 'prelims',
      en: 'OPSC OAS Prelims 2023–24 — General Studies Paper I & CSAT',
      or: 'OPSC OAS ପ୍ରିଲିମ୍ସ ୨୦୨୩–୨୪ — GS ପେପର୍ I ଓ CSAT',
      shift: 'OCS Prelims (Set A–D)',
      meta: '100 Qs · 200 Marks · 2 Hrs · -1/3 Negative',
      topTopics: ['Odisha Geography & Ramsar Sites', 'Constitutional Governance', 'Science & Environment'],
      practiceHref: '/mock-tests/?track=odisha-gk',
      portal: 'https://opsc.gov.in/'
    },
    {
      id: 'opsc-oas-2024-mains',
      examKey: 'opsc-oas',
      board: 'OPSC',
      year: 2024,
      yearBracket: '2023-2024',
      stage: 'mains',
      en: 'OPSC OAS Mains 2023–24 — GS Papers I–IV, Essay & Odia/English',
      or: 'OPSC OAS ମେନ୍ସ ୨୦୨୩–୨୪ — GS ପେପର୍ I–IV ଓ ପ୍ରବନ୍ଧ',
      shift: 'Written Mains Examination',
      meta: '250 Marks / Paper · 3 Hrs · Descriptive',
      topTopics: ['Odisha Heritage & Culture', 'State Governance & Welfare', 'Ethics & Case Studies'],
      practiceHref: '/guides/?category=odisha-gk',
      portal: 'https://opsc.gov.in/'
    },
    {
      id: 'ossc-cgl-2025-prelims',
      examKey: 'ossc-cgl',
      board: 'OSSC',
      year: 2025,
      yearBracket: '2025-2026',
      stage: 'prelims',
      en: 'OSSC CGLRE 2024–25 Prelims — Combined Graduate Level (Shift I & II)',
      or: 'OSSC CGLRE ୨୦୨୪–୨୫ ପ୍ରିଲିମ୍ସ — କମ୍ବାଇଣ୍ଡ ଗ୍ରାଜୁଏଟ୍ ଲେଭଲ୍',
      shift: 'OMR / CBT Prelims',
      meta: '150 Qs · 150 Marks · 150 Mins · -0.25 Negative',
      topTopics: ['Arithmetic & DI (30%)', 'Logical Reasoning (24%)', 'Odisha & National CA (24%)'],
      practiceHref: '/mock-tests/?track=reasoning-quant',
      portal: 'https://ossc.gov.in/'
    },
    {
      id: 'ossc-cgl-2025-mains',
      examKey: 'ossc-cgl',
      board: 'OSSC',
      year: 2025,
      yearBracket: '2025-2026',
      stage: 'mains',
      en: 'OSSC CGLRE 2024–25 Mains — Paper I (Language) & Paper II (GS / Math)',
      or: 'OSSC CGLRE ୨୦୨୪–୨୫ ମେନ୍ସ — ଭାଷା, ଗଣିତ ଓ କମ୍ପ୍ୟୁଟର',
      shift: 'Mains Written + Computer Skill',
      meta: '200 Marks · 2.5 Hrs · -0.25 Negative',
      topTopics: ['Odia & English Grammar', 'Quantitative Aptitude', 'Computer Practical'],
      practiceHref: '/mock-tests/?track=reasoning-quant',
      portal: 'https://ossc.gov.in/'
    },
    {
      id: 'ossc-cgl-2023-prelims',
      examKey: 'ossc-cgl',
      board: 'OSSC',
      year: 2023,
      yearBracket: '2023-2024',
      stage: 'prelims',
      en: 'OSSC CGLRE 2023 Prelims — 150-MCQ Official Question Paper',
      or: 'OSSC CGLRE ୨୦୨୩ ପ୍ରିଲିମ୍ସ — ୧୫୦ ପ୍ରଶ୍ନପତ୍ର',
      shift: 'Single Shift Prelims',
      meta: '150 Qs · 150 Marks · 150 Mins · -0.25 Negative',
      topTopics: ['Data Interpretation Tables', 'Computer Shortcuts & MS Office', 'Odisha Current Affairs'],
      practiceHref: '/mock-tests/?track=reasoning-quant',
      portal: 'https://ossc.gov.in/'
    },
    {
      id: 'osssc-cre-2024-prelims',
      examKey: 'osssc-combined',
      board: 'OSSSC',
      year: 2024,
      yearBracket: '2023-2024',
      stage: 'prelims',
      en: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS / ICDS) 2024',
      or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / Amin / SFS / ICDS) ୨୦୨୪',
      shift: 'CRE Multi-Shift CBT Prelims',
      meta: '100 Qs (Prelims) / 180 Qs (Mains) · -0.33 Negative',
      topTopics: ['Odisha District GK (25%)', 'Mensuration & Arithmetic (22%)', 'Odia Grammar (18%)'],
      practiceHref: '/mock-tests/?track=odisha-gk',
      portal: 'https://osssc.gov.in/'
    },
    {
      id: 'osssc-cre-2021-paper',
      examKey: 'osssc-combined',
      board: 'OSSSC',
      year: 2021,
      yearBracket: '2021-2022',
      stage: 'mains',
      en: 'OSSSC Combined Recruitment (RI / ARI / Amin / Forest Guard) 2021',
      or: 'OSSSC କମ୍ବାଇଣ୍ଡ ପରୀକ୍ଷା (RI / ARI / Amin) ୨୦୨୧ ପ୍ରଶ୍ନପତ୍ର',
      shift: 'OMR Written Examination',
      meta: '180 Qs · 180 Marks · 3 Hrs · -0.50 Negative',
      topTopics: ['General Awareness & Odisha GK', 'English & Odia Language', 'Computer Basics'],
      practiceHref: '/mock-tests/?track=odisha-gk',
      portal: 'https://osssc.gov.in/'
    },
    {
      id: 'oprb-si-2024-paper12',
      examKey: 'odisha-police-si',
      board: 'OPRB',
      year: 2024,
      yearBracket: '2023-2024',
      stage: 'prelims',
      en: 'Odisha Police SI (CPSE / OPRB) 2024 — Paper I (Language) & Paper II (GS)',
      or: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI (OPRB) ୨୦୨୪ — ପେପର୍ I ଓ ପେପର୍ II',
      shift: 'CBT Combined Police Service Exam',
      meta: '300 Marks (100 + 200) · -0.25 Negative',
      topTopics: ['Odisha History & Polity (34%)', 'English & Odia Language (33%)', 'Reasoning & Computer (33%)'],
      practiceHref: '/mock-tests/?track=odisha-gk',
      portal: 'https://odishapolice.gov.in/'
    },
    {
      id: 'oprb-si-2021-paper12',
      examKey: 'odisha-police-si',
      board: 'OPRB',
      year: 2021,
      yearBracket: '2021-2022',
      stage: 'mains',
      en: 'Odisha Police Sub-Inspector (OPRB) 2021 — Paper I & Paper II Archive',
      or: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI (OPRB) ୨୦୨୧ — ପେପର୍ I ଓ II',
      shift: 'Written Examination',
      meta: '300 Marks · 90 + 180 Mins · -0.25 Negative',
      topTopics: ['General Studies & Constitution', 'Quantitative Aptitude', 'Odia & English Comprehension'],
      practiceHref: '/mock-tests/?track=reasoning-quant',
      portal: 'https://odishapolice.gov.in/'
    },
    {
      id: 'cbse-ctet-2025-paper12',
      examKey: 'cbse-ctet',
      board: 'CBSE CTET',
      year: 2025,
      yearBracket: '2025-2026',
      stage: 'prelims',
      en: 'CBSE CTET Dec 2025 — Paper I (Classes 1–5) & Paper II (Classes 6–8)',
      or: 'CBSE CTET ଡିସେମ୍ବର ୨୦୨୫ — ପେପର୍ I ଓ ପେପର୍ II',
      shift: 'Offline OMR (Morning & Afternoon)',
      meta: '150 Qs · 150 Marks · 150 Mins · No Negative Marking',
      topTopics: ['Child Development & Pedagogy (20%)', 'Maths & EVS / SST (40%)', 'Language I & II (40%)'],
      practiceHref: '/mock-tests/?track=teaching-pedagogy',
      portal: 'https://ctet.nic.in/'
    },
    {
      id: 'cbse-ctet-2024-paper12',
      examKey: 'cbse-ctet',
      board: 'CBSE CTET',
      year: 2024,
      yearBracket: '2023-2024',
      stage: 'mains',
      en: 'CBSE CTET July 2024 — Paper I & Paper II Official Solved Set',
      or: 'CBSE CTET ଜୁଲାଇ ୨୦୨୪ — ପେପର୍ I ଓ II ପ୍ରଶ୍ନପତ୍ର',
      shift: 'Paper I & Paper II (Set I–P)',
      meta: '150 Qs · 150 Marks · 150 Mins · No Negative Marking',
      topTopics: ['NEP 2020 & Inclusive Pedagogy', 'NCERT Science / Social Science', 'Odia / English Comprehension'],
      practiceHref: '/mock-tests/?track=teaching-pedagogy',
      portal: 'https://ctet.nic.in/'
    }
  ];

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function resolveStorage(override) {
    if (override) return override;
    try { return (win && win.localStorage) ? win.localStorage : null; } catch (_) { return null; }
  }

  function loadPrefs(storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      var raw = st && st.getItem(PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          return {
            exam: typeof p.exam === 'string' ? p.exam : 'all',
            year: typeof p.year === 'string' ? p.year : 'all',
            stage: typeof p.stage === 'string' ? p.stage : 'all',
            query: typeof p.query === 'string' ? p.query.slice(0, 80) : ''
          };
        }
      }
    } catch (_) {}
    return { exam: 'all', year: 'all', stage: 'all', query: '' };
  }

  function savePrefs(prefs, storageOverride) {
    var st = resolveStorage(storageOverride);
    try {
      if (st) st.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (_) {}
  }

  function filterPapers(options) {
    var opts = options || {};
    var exam = norm(opts.exam || 'all');
    var year = norm(opts.year || 'all');
    var stage = norm(opts.stage || 'all');
    var q = norm(opts.query || '');

    return PYQ_PAPERS.filter(function (p) {
      if (exam && exam !== 'all' && p.examKey !== exam) return false;
      if (year && year !== 'all' && p.yearBracket !== year) return false;
      if (stage && stage !== 'all' && p.stage !== stage) return false;
      if (q) {
        var hay = norm([p.en, p.or, p.board, p.shift, p.meta, p.topTopics.join(' '), String(p.year)].join(' '));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function detectLang() {
    try {
      var root = doc && doc.documentElement;
      if (root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or')) return 'or';
    } catch (_) {}
    return 'en';
  }

  function mount(containerEl) {
    if (!doc) return null;
    var root = containerEl || doc.getElementById(ROOT_ID);
    if (!root) return null;

    var state = {
      lang: detectLang(),
      prefs: loadPrefs(),
      activeWeightageExam: 'opsc-oas'
    };
    if (state.prefs.exam !== 'all' && WEIGHTAGE_PROFILES[state.prefs.exam]) {
      state.activeWeightageExam = state.prefs.exam;
    }

    var wrap = el('div', 'cso-pyq-wrap');

    // Header
    var head = el('div', 'cso-pyq-head');
    var titleBox = el('div', 'cso-pyq-title-box');
    var heading = el('h2', 'cso-pyq-title');
    var subtitle = el('p', 'cso-pyq-sub');
    titleBox.appendChild(heading);
    titleBox.appendChild(subtitle);

    var headControls = el('div', 'cso-pyq-head-controls');
    var langGroup = el('div', 'cso-pyq-lang-toggle');
    langGroup.setAttribute('role', 'group');
    var btnEn = el('button', 'cso-pyq-lang-btn', 'English');
    btnEn.type = 'button';
    var btnOr = el('button', 'cso-pyq-lang-btn', 'ଓଡ଼ିଆ');
    btnOr.type = 'button';
    langGroup.appendChild(btnEn);
    langGroup.appendChild(btnOr);

    var printBtn = el('button', 'cso-pyq-btn');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });

    headControls.appendChild(langGroup);
    headControls.appendChild(printBtn);
    head.appendChild(titleBox);
    head.appendChild(headControls);

    // Filter Controls
    var examPills = el('div', 'cso-pyq-pills');
    examPills.setAttribute('role', 'group');

    var filterRow = el('div', 'cso-pyq-filters');
    var yrWrap = el('div', 'cso-pyq-field');
    var yrLabel = el('label', 'cso-pyq-label');
    yrLabel.setAttribute('for', 'cso-pyq-year');
    var yrSelect = el('select', 'cso-pyq-select');
    yrSelect.id = 'cso-pyq-year';
    yrWrap.appendChild(yrLabel);
    yrWrap.appendChild(yrSelect);

    var stWrap = el('div', 'cso-pyq-field');
    var stLabel = el('label', 'cso-pyq-label');
    stLabel.setAttribute('for', 'cso-pyq-stage');
    var stSelect = el('select', 'cso-pyq-select');
    stSelect.id = 'cso-pyq-stage';
    stWrap.appendChild(stLabel);
    stWrap.appendChild(stSelect);

    var qWrap = el('div', 'cso-pyq-field');
    var qLabel = el('label', 'cso-pyq-label');
    qLabel.setAttribute('for', 'cso-pyq-search');
    var qInput = el('input', 'cso-pyq-input');
    qInput.type = 'search';
    qInput.id = 'cso-pyq-search';
    qInput.value = state.prefs.query;
    qWrap.appendChild(qLabel);
    qWrap.appendChild(qInput);

    var resetBtn = el('button', 'cso-pyq-btn');
    resetBtn.type = 'button';

    filterRow.appendChild(yrWrap);
    filterRow.appendChild(stWrap);
    filterRow.appendChild(qWrap);
    filterRow.appendChild(resetBtn);

    // Section A: Subject-Weightage Breakdown Visualizer
    var weightageBox = el('section', 'cso-pyq-weightage');

    // Section B: PYQ Archive
    var archiveStatus = el('div', 'cso-pyq-status');
    archiveStatus.setAttribute('role', 'status');
    archiveStatus.setAttribute('aria-live', 'polite');

    var archiveGrid = el('div', 'cso-pyq-grid');
    archiveGrid.setAttribute('aria-live', 'polite');

    wrap.appendChild(head);
    wrap.appendChild(examPills);
    wrap.appendChild(filterRow);
    wrap.appendChild(weightageBox);
    wrap.appendChild(archiveStatus);
    wrap.appendChild(archiveGrid);
    root.replaceChildren(wrap);

    function renderSelect(selectEl, list, val, orMode) {
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < list.length; i += 1) {
        var opt = el('option', '', orMode ? list[i].or : list[i].en);
        opt.value = list[i].key;
        if (list[i].key === val) opt.selected = true;
        frag.appendChild(opt);
      }
      selectEl.replaceChildren(frag);
      selectEl.value = val;
    }

    function renderExamPills(orMode) {
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < EXAM_TRACKS.length; i += 1) {
        (function (t) {
          var active = state.prefs.exam === t.key;
          var btn = el('button', 'cso-pyq-pill' + (active ? ' is-active' : ''), orMode ? t.or : t.en);
          btn.type = 'button';
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
          btn.addEventListener('click', function () {
            state.prefs.exam = t.key;
            if (t.key !== 'all' && WEIGHTAGE_PROFILES[t.key]) {
              state.activeWeightageExam = t.key;
            }
            savePrefs(state.prefs);
            render();
          });
          frag.appendChild(btn);
        })(EXAM_TRACKS[i]);
      }
      examPills.replaceChildren(frag);
    }

    function renderWeightage(orMode) {
      var profile = WEIGHTAGE_PROFILES[state.activeWeightageExam] || WEIGHTAGE_PROFILES['opsc-oas'];
      var frag = doc.createDocumentFragment();

      var wHead = el('div', 'cso-pyq-whead');
      wHead.appendChild(el('h3', 'cso-pyq-wtitle',
        (orMode ? '📊 ବିଷୟ-ଭିତ୍ତିକ ପ୍ରଶ୍ନ ଗୁରୁତ୍ୱ: ' : '📊 Subject-Weightage Breakdown: ') + (orMode ? profile.or : profile.en)));
      wHead.appendChild(el('span', 'cso-pyq-neg-badge', profile.negativeMarking));
      frag.appendChild(wHead);

      // Quick profile switcher when "All Exams" is selected
      var swRow = el('div', 'cso-pyq-wswitch');
      var keys = Object.keys(WEIGHTAGE_PROFILES);
      for (var k = 0; k < keys.length; k += 1) {
        (function (ek) {
          var tObj = EXAM_TRACKS.find(function (x) { return x.key === ek; });
          var active = state.activeWeightageExam === ek;
          var b = el('button', 'cso-pyq-wtab' + (active ? ' is-active' : ''), tObj ? (orMode ? tObj.or : tObj.en) : ek);
          b.type = 'button';
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
          b.addEventListener('click', function () {
            state.activeWeightageExam = ek;
            renderWeightage(state.lang === 'or');
          });
          swRow.appendChild(b);
        })(keys[k]);
      }
      frag.appendChild(swRow);

      var rows = el('div', 'cso-pyq-bars');
      for (var i = 0; i < profile.topics.length; i += 1) {
        var tp = profile.topics[i];
        var row = el('div', 'cso-pyq-bar-row');

        var rowTop = el('div', 'cso-pyq-bar-top');
        rowTop.appendChild(el('strong', 'cso-pyq-bar-name', orMode ? tp.or : tp.en));
        rowTop.appendChild(el('span', 'cso-pyq-bar-stat', tp.qs + (orMode ? ' ପ୍ରଶ୍ନ · ' : ' Qs · ') + tp.pct + '%'));
        row.appendChild(rowTop);

        var track = el('div', 'cso-pyq-bar-track');
        var fill = el('div', 'cso-pyq-bar-fill cso-vfv-bar--w' + quantizeStep(tp.pct));
        track.appendChild(fill);
        row.appendChild(track);

        var rowFoot = el('div', 'cso-pyq-bar-foot');
        var tags = el('div', 'cso-pyq-subtags');
        for (var s = 0; s < tp.subtopics.length; s += 1) {
          tags.appendChild(el('span', 'cso-pyq-subtag', tp.subtopics[s]));
        }
        var cta = el('a', 'cso-pyq-launch', orMode ? '🎯 ସେକ୍ସନାଲ୍ ଅଭ୍ୟାସ →' : '🎯 Launch Sectional Practice →');
        cta.href = tp.practiceHref;
        rowFoot.appendChild(tags);
        rowFoot.appendChild(cta);
        row.appendChild(rowFoot);

        rows.appendChild(row);
      }
      frag.appendChild(rows);
      weightageBox.replaceChildren(frag);
    }

    function renderArchive(orMode) {
      var list = filterPapers(state.prefs);
      archiveStatus.textContent = orMode
        ? ('ଦେଖାଯାଉଛି ' + list.length + ' / ' + PYQ_PAPERS.length + ' ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନପତ୍ର (PYQ)')
        : ('Showing ' + list.length + ' of ' + PYQ_PAPERS.length + ' Verified PYQ Papers (2021–2026)');

      if (!list.length) {
        archiveGrid.replaceChildren(el('div', 'cso-pyq-empty',
          orMode ? 'କୌଣସି PYQ ପ୍ରଶ୍ନପତ୍ର ମିଳିଲା ନାହିଁ। ଦୟାକରି ଫିଲ୍ଟର ପରିଷ୍କାର କରନ୍ତୁ।' : 'No matching PYQ papers found. Try clearing your filters.'));
        return;
      }

      var savedApi = win && win.CSOSavedAlerts;
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < list.length; i += 1) {
        var p = list[i];
        var card = el('article', 'cso-pyq-card');
        card.setAttribute('data-pyq-id', p.id);

        var badges = el('div', 'cso-pyq-badges');
        badges.appendChild(el('span', 'cso-pyq-badge cso-pyq-badge--board', p.board));
        badges.appendChild(el('span', 'cso-pyq-badge', String(p.year) + ' · ' + p.shift));
        card.appendChild(badges);

        card.appendChild(el('h3', 'cso-pyq-card__title', orMode ? p.or : p.en));
        card.appendChild(el('p', 'cso-pyq-card__meta', p.meta));

        var ul = el('ul', 'cso-pyq-top-topics');
        for (var t = 0; t < p.topTopics.length; t += 1) {
          ul.appendChild(el('li', '', p.topTopics[t]));
        }
        card.appendChild(ul);

        var actions = el('div', 'cso-pyq-actions');
        var prac = el('a', 'cso-pyq-btn cso-pyq-btn--primary',
          orMode ? '🎯 ସମାନ MCQ ଅଭ୍ୟାସ →' : '🎯 Practice Similar MCQs →');
        prac.href = p.practiceHref;
        actions.appendChild(prac);

        if (savedApi && typeof savedApi.createBookmarkButton === 'function') {
          var bm = savedApi.createBookmarkButton({
            id: 'pyq:' + p.id,
            title: p.en,
            url: '/mock-tests/#cso-pyq-vault-analyzer-root',
            category: 'PYQ Paper'
          }, {
            isOr: orMode,
            labelUnsavedEn: '☆ Save Paper',
            labelSavedEn: '★ Paper Saved',
            labelUnsavedOr: '☆ ପେପର୍ ସେଭ୍ କରନ୍ତୁ',
            labelSavedOr: '★ ସେଭ୍ ହୋଇଛି'
          });
          if (bm) {
            bm.classList.add('cso-pyq-btn');
            actions.appendChild(bm);
          }
        }

        var portal = el('a', 'cso-pyq-btn',
          orMode ? '🏛️ ଅଫିସିଆଲ୍ ପୋର୍ଟାଲ୍ ↗' : '🏛️ Official Commission Portal ↗');
        portal.href = p.portal;
        portal.target = '_blank';
        portal.rel = 'noopener noreferrer';
        actions.appendChild(portal);

        card.appendChild(actions);
        frag.appendChild(card);
      }
      archiveGrid.replaceChildren(frag);
    }

    function render() {
      var orMode = state.lang === 'or';
      btnEn.className = 'cso-pyq-lang-btn' + (!orMode ? ' is-active' : '');
      btnOr.className = 'cso-pyq-lang-btn' + (orMode ? ' is-active' : '');
      btnEn.setAttribute('aria-pressed', !orMode ? 'true' : 'false');
      btnOr.setAttribute('aria-pressed', orMode ? 'true' : 'false');

      heading.textContent = orMode
        ? '📚 ଓଡ଼ିଶା ସରକାରୀ ପରୀକ୍ଷା PYQ ପେପର୍ ଭଲ୍ଟ ଓ ବିଷୟ ବିଶ୍ଳେଷଣ'
        : '📚 Odisha Govt PYQ Paper Vault & Topic Weightage Analyzer';
      subtitle.textContent = orMode
        ? 'OPSC OAS, OSSC CGLRE, OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI/ARI/Amin), ଓଡ଼ିଶା ପୋଲିସ୍ SI ଓ CBSE CTET ପାଇଁ ବିଷୟ-ଭିତ୍ତିକ ପ୍ରଶ୍ନ ଗୁରୁତ୍ୱ ଓ ୨୦୨୧–୨୦୨୬ PYQ ଆର୍କାଇଭ୍।'
        : 'Analyze subject-wise question weightage and browse verified 2021–2026 PYQ papers for OPSC OAS, OSSC CGLRE, OSSSC Combined District Cadre, Odisha Police SI & CBSE CTET.';
      printBtn.textContent = orMode ? '🖨️ PYQ ଓ ୱେଟେଜ୍ ସିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print PYQ & Weightage Sheet';
      yrLabel.textContent = orMode ? 'ପରୀକ୍ଷା ବର୍ଷ' : 'Paper Year';
      stLabel.textContent = orMode ? 'ପର୍ଯ୍ୟାୟ / ଶିଫ୍ଟ' : 'Stage / Shift';
      qLabel.textContent = orMode ? 'ବିଷୟ କିମ୍ବା ପରୀକ୍ଷା ଖୋଜନ୍ତୁ' : 'Search Topic, Board or Year';
      qInput.placeholder = orMode ? 'ଉଦାହରଣ: OAS, CGL, RI/Amin, CTET, Pedagogy...' : 'e.g., OAS, CGLRE, RI/Amin, Police SI, CTET, Pedagogy...';
      resetBtn.textContent = orMode ? '↻ ଫିଲ୍ଟର ହଟାନ୍ତୁ' : '↻ Reset Filters';

      renderExamPills(orMode);
      renderSelect(yrSelect, YEAR_BRACKETS, state.prefs.year, orMode);
      renderSelect(stSelect, STAGES, state.prefs.stage, orMode);
      renderWeightage(orMode);
      renderArchive(orMode);
    }

    btnEn.addEventListener('click', function () { state.lang = 'en'; render(); });
    btnOr.addEventListener('click', function () { state.lang = 'or'; render(); });

    yrSelect.addEventListener('change', function () {
      state.prefs.year = yrSelect.value;
      savePrefs(state.prefs);
      renderArchive(state.lang === 'or');
    });

    stSelect.addEventListener('change', function () {
      state.prefs.stage = stSelect.value;
      savePrefs(state.prefs);
      renderArchive(state.lang === 'or');
    });

    qInput.addEventListener('input', function () {
      state.prefs.query = qInput.value;
      savePrefs(state.prefs);
      renderArchive(state.lang === 'or');
    });

    resetBtn.addEventListener('click', function () {
      state.prefs = { exam: 'all', year: 'all', stage: 'all', query: '' };
      qInput.value = '';
      savePrefs(state.prefs);
      render();
    });

    render();
    return { refresh: render };
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', function () { mount(); });
    } else {
      mount();
    }
  }

  return {
    version: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    EXAM_TRACKS: EXAM_TRACKS,
    YEAR_BRACKETS: YEAR_BRACKETS,
    STAGES: STAGES,
    WEIGHTAGE_PROFILES: WEIGHTAGE_PROFILES,
    PYQ_PAPERS: PYQ_PAPERS,
    quantizeStep: quantizeStep,
    filterPapers: filterPapers,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    mount: mount
  };
});
