/**
 * Common Sense Odisha — Bilingual 18-Roadmap Career Library & Matcher Engine (v453)
 * Provides 18 verified EN / ଓଡ଼ିଆ career roadmaps across all 6 career tracks
 * merged cleanly with live Cloudflare D1 career guides so track counters never show 0.
 * Strict CSP-compliant: pure data + pure functions, zero unsafe markup injection,
 * zero inline style mutations, zero inline event handlers.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis
  );
  if (typeof window !== 'undefined') window.CSOCareersRoadmapLibrary = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOCareersRoadmapLibrary = api;
})(function () {
  'use strict';

  var VERSION = 'v453';

  var TRACKS = [
    {
      slug: 'civil-services',
      aliases: ['civil-services', 'civil_services', 'oas-ias'],
      icon: '🏛️',
      accent: 'civil',
      label_en: 'Civil Services',
      label_or: 'ସିଭିଲ୍ ସର୍ଭିସେସ୍',
      desc_en: 'OPSC OAS/OFS/OPS, OSSC CGLRE, OSSSC District Cadre & Police SI',
      desc_or: 'OPSC OAS/OFS/OPS, OSSC CGLRE, OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ ଓ ପୋଲିସ୍ SI'
    },
    {
      slug: 'engineering-it',
      aliases: ['engineering-it', 'engineering_it', 'tech', 'engineering'],
      icon: '💻',
      accent: 'tech',
      label_en: 'Engineering & IT',
      label_or: 'ଇଞ୍ଜିନିୟରିଂ ଓ ଆଇଟି',
      desc_en: 'OPTCL/OHPC GATE PSU, OSSC/OPSC AEE-JE & Odisha IT/Semiconductor',
      desc_or: 'OPTCL/OHPC GATE PSU, OSSC/OPSC AEE-JE ଓ ଓଡ଼ିଶା IT/ସେମିକଣ୍ଡକ୍ଟର୍'
    },
    {
      slug: 'banking-finance',
      aliases: ['banking-finance', 'banking_finance', 'banking', 'finance'],
      icon: '🏦',
      accent: 'finance',
      label_en: 'Banking & Finance',
      label_or: 'ବ୍ୟାଙ୍କିଂ ଓ ଅର୍ଥନୀତି',
      desc_en: 'SBI/IBPS/Odisha RRB, RBI Grade B/NABARD & OSCB/DCCB Banking',
      desc_or: 'SBI/IBPS/ଓଡ଼ିଶା RRB, RBI Grade B/NABARD ଓ OSCB/DCCB ବ୍ୟାଙ୍କିଂ'
    },
    {
      slug: 'healthcare',
      aliases: ['healthcare', 'health', 'medical'],
      icon: '🩺',
      accent: 'health',
      label_en: 'Healthcare',
      label_or: 'ସ୍ୱାସ୍ଥ୍ୟସେବା',
      desc_en: 'OPSC OMHS Medical Officer, OSSSC Nursing/Paramedical & AYUSH/CHO',
      desc_or: 'OPSC OMHS ମେଡିକାଲ୍ ଅଫିସର୍, OSSSC ନର୍ସିଂ/ଫାର୍ମାସିଷ୍ଟ ଓ AYUSH/CHO'
    },
    {
      slug: 'agriculture',
      aliases: ['agriculture', 'agri', 'veterinary', 'forestry'],
      icon: '🌾',
      accent: 'agri',
      label_en: 'Agriculture',
      label_or: 'କୃଷି ଓ ପଶୁପାଳନ',
      desc_en: 'OPSC AAO/AHO, F&ARD VAS/Livestock Inspector & OUAT/ICAR Agri-Business',
      desc_or: 'OPSC AAO/AHO, F&ARD VAS/ପଶୁଧନ ନିରୀକ୍ଷକ ଓ OUAT/ICAR କୃଷି-ବ୍ୟବସାୟ'
    },
    {
      slug: 'career-pathways',
      aliases: ['career-pathways', 'pathways', 'career_pathways', 'stage-pathways'],
      icon: '🧭',
      accent: 'pathways',
      label_en: 'Career Stage & Pathways',
      label_or: 'କ୍ୟାରିୟର୍ ପର୍ଯ୍ୟାୟ ଓ ମାର୍ଗ',
      desc_en: 'After 10th/+2 Early Entry, Final-Year Graduate Blueprint & In-Service MACP',
      desc_or: 'ଦଶମ/+୨ ପ୍ରାରମ୍ଭିକ ପ୍ରବେଶ, ସ୍ନାତକ ବ୍ଲୁପ୍ରିଣ୍ଟ୍ ଓ ଚାକିରି-ପଦୋନ୍ନତି ମାର୍ଗ'
    }
  ];

  var STAGE_OPTIONS = [
    { slug: '', label_en: 'All Stages', label_or: 'ସମସ୍ତ ଯୋଗ୍ୟତା / ପର୍ଯ୍ୟାୟ' },
    { slug: 'after-10th-12th', label_en: 'After 10th / +2', label_or: 'ଦଶମ / +୨ ପରେ' },
    { slug: 'graduate', label_en: 'Graduate', label_or: 'ସ୍ନାତକ (Graduate)' },
    { slug: 'diploma-btech', label_en: 'Diploma / B.Tech', label_or: 'ଡିପ୍ଲୋମା / B.Tech' },
    { slug: 'pg-medical', label_en: 'Post-Graduate / Medical', label_or: 'ସ୍ନାତକୋତ୍ତର / ମେଡିକାଲ୍' },
    { slug: 'in-service', label_en: 'In-Service', label_or: 'ଚାକିରିରତ / ପଦୋନ୍ନତି' }
  ];

  var SCOPE_OPTIONS = [
    { slug: '', label_en: 'All Scopes', label_or: 'ସମସ୍ତ ସ୍କୋପ୍' },
    { slug: 'odisha-state', label_en: 'Odisha State', label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ' },
    { slug: 'national-central', label_en: 'National / Central', label_or: 'ଜାତୀୟ / କେନ୍ଦ୍ରୀୟ' }
  ];

  var TRACK_ALIAS_MAP = {};
  TRACKS.forEach(function (t) {
    TRACK_ALIAS_MAP[t.slug] = t.slug;
    (t.aliases || []).forEach(function (a) {
      TRACK_ALIAS_MAP[String(a).toLowerCase()] = t.slug;
    });
  });

  function normalizeTrackSlug(raw) {
    var s = String(raw || '').toLowerCase().trim();
    if (!s) return '';
    return TRACK_ALIAS_MAP[s] || s;
  }

  function normalizeScope(raw) {
    var s = String(raw || '').toLowerCase().trim();
    if (!s) return '';
    if (s === 'odisha-state' || s === 'odisha' || s === 'state' || s === 'odisha_state') return 'odisha-state';
    if (s === 'national-central' || s === 'national' || s === 'central' || s === 'all-india' || s === 'india') return 'national-central';
    if (s === 'both' || s === 'state-national' || s === 'state_national' || s === 'odisha-national') return 'both';
    return s;
  }

  function normalizeStage(raw) {
    var s = String(raw || '').toLowerCase().trim();
    if (!s) return '';
    if (s === 'after-10th-12th' || s === 'after-10th' || s === 'after-12th' || s === '10th-12th' || s === 'plus2' || s === 'high-school') {
      return 'after-10th-12th';
    }
    if (s === 'graduate' || s === 'undergraduate' || s === 'degree' || s === 'final-year') {
      return 'graduate';
    }
    if (s === 'diploma-btech' || s === 'diploma' || s === 'btech' || s === 'engineering' || s === 'technical') {
      return 'diploma-btech';
    }
    if (s === 'pg-medical' || s === 'postgraduate' || s === 'pg' || s === 'medical' || s === 'mbbs' || s === 'professional') {
      return 'pg-medical';
    }
    if (s === 'in-service' || s === 'working-professional' || s === 'departmental' || s === 'experienced') {
      return 'in-service';
    }
    return s;
  }

  var BUILT_IN_ROADMAPS = [
    /* ================================================================
     * TRACK 1: CIVIL SERVICES (3 Roadmaps)
     * ================================================================ */
    {
      id: 'cso-rm-opsc-oas',
      slug: 'opsc-oas-ofs-ops-ors',
      track_slug: 'civil-services',
      subtrack_slug: 'state-pcs',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'graduate',
      stage_tags: ['graduate', 'pg-medical'],
      stage_label_en: 'Graduate',
      stage_label_or: 'ସ୍ନାତକ',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'OPSC Odisha Civil Services (OAS / OFS / OPS / ORS)',
      title_or: 'OPSC ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OAS / OFS / OPS / ORS)',
      summary_en: 'Flagship Odisha Group-A & Group-B executive pathway into District Administration, State Finance, Police DSP, and Revenue Tahasildar cadres.',
      summary_or: 'ଜିଲ୍ଲା ପ୍ରଶାସନ, ରାଜ୍ୟ ଅର୍ଥସେବା, ପୋଲିସ୍ DSP ଏବଂ ରାଜସ୍ୱ ତହସିଲଦାର ପଦବୀ ପାଇଁ ଓଡ଼ିଶାର ଶୀର୍ଷ Group-A ଓ Group-B ପରୀକ୍ଷା ମାର୍ଗ।',
      orsp_level: 'ORSP L-12 · ₹56,100',
      salary_band: 'ORSP Level-12 (₹56,100 Basic; ~₹89,000+ Gross with DA & HRA)',
      salary_band_or: 'ORSP ଲେଭେଲ୍-୧୨ (₹୫୬,୧୦୦ ମୂଳ ବେତନ; DA ଓ HRA ସହ ~₹୮୯,୦୦୦+)',
      pay_allowances_en: 'ORSP 7th Pay Level-12 (₹56,100–₹1,77,500) for OAS/OFS/OPS Group-A; Level-10 (₹44,900) for ORS/OT&AS Group-B + 53%+ DA, HRA (10%–20%), Govt Quarters, Official Vehicle (field postings), and NPS/UPS benefits.',
      pay_allowances_or: 'OAS/OFS/OPS (Group-A) ପାଇଁ ORSP L-12 (₹୫୬,୧୦୦–₹୧,୭୭,୫୦୦) ଏବଂ ORS/OT&AS (Group-B) ପାଇଁ L-10 (₹୪୪,୯୦୦) + DA, HRA, ସରକାରୀ ବାସଭବନ ଓ NPS/UPS ସୁବିଧା।',
      eligibility_summary: 'Any Bachelor’s Degree + Odia read/write/speak (ME standard). Age: 21–38 yrs (UR), +5 yrs SC/ST/SEBC/Women.',
      eligibility_summary_or: 'ଯେକୌଣସି ସ୍ନାତକ ଡିଗ୍ରୀ + ଓଡ଼ିଆ ପଢ଼ିବା/ଲେଖିବା/କହିବା (ME ସ୍ତର)। ବୟସ: ୨୧–୩୮ ବର୍ଷ (UR), SC/ST/SEBC/ମହିଳା +୫ ବର୍ଷ ଛାଡ଼।',
      age_window_en: '21 to 38 years (UR) · Up to 43 yrs for SC/ST/SEBC/Women · Up to 48 yrs for PwBD · Zero State Exam Fee.',
      age_window_or: '୨୧ ରୁ ୩୮ ବର୍ଷ (UR) · SC/ST/SEBC/ମହିଳା ୪୩ ବର୍ଷ ପର୍ଯ୍ୟନ୍ତ · PwBD ୪୮ ବର୍ଷ · ରାଜ୍ୟ ପରୀକ୍ଷା ଫିସ୍ ₹୦।',
      key_exams: 'OPSC OCS Prelims (GS + CSAT) → Mains (9 Papers, 1750 Marks) → Personality Test (250 Marks)',
      selection_stages_en: [
        'Stage 1 — Prelims (Objective): GS Paper I (200M) + CSAT Paper II (200M, 33% qualifying, 1/3rd negative).',
        'Stage 2 — Mains (Written, 1750M): Qualifying Odia & English + Essay (250M) + 4 GS Papers (1000M) + 1 Optional (500M).',
        'Stage 3 — Personality Test (250M) & Medical / Document Verification at OPSC, Cuttack.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ପ୍ରିଲିମ୍ସ: GS ପେପର୍-୧ (୨୦୦) + CSAT ପେପର୍-୨ (୨୦୦, ୩୩% କ୍ୱାଲିଫାଇଙ୍ଗ୍)।',
        'ପର୍ଯ୍ୟାୟ ୨ — ମେନ୍ସ (୧୭୫୦ ମାର୍କ): ଓଡ଼ିଆ ଓ ଇଂରାଜୀ (କ୍ୱାଲିଫାଇଙ୍ଗ୍) + ପ୍ରବନ୍ଧ + ୪ଟି GS ପେପର୍ + ଗୋଟିଏ ଇଚ୍ଛାଧୀନ ବିଷୟ।',
        'ପର୍ଯ୍ୟାୟ ୩ — ସାକ୍ଷାତକାର (୨୫୦ ମାର୍କ) ଏବଂ Cuttack OPSC ରେ ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ।'
      ],
      milestones: [
        { step: '1', label_en: 'NCERT + Odisha GK & CSAT Prelims', label_or: 'NCERT + ଓଡ଼ିଶା GK ଓ ପ୍ରିଲିମ୍ସ' },
        { step: '2', label_en: 'GS Mains + Optional Answer Writing', label_or: 'GS ମେନ୍ସ + ଇଚ୍ଛାଧୀନ ଲିଖନ ଅଭ୍ୟାସ' },
        { step: '3', label_en: 'OPSC Interview & Gopabandhu Academy', label_or: 'OPSC ସାକ୍ଷାତକାର ଓ ତାଲିମ' }
      ],
      promotion_ladder_en: [
        'Years 0–5: OAS Group-A (JB) — BDO / Deputy Collector / Tahasildar (ORSP L-12).',
        'Years 5–10: OAS Group-A (SB) — Sub-Collector / ADM / Under Secretary (ORSP L-13/L-14).',
        'Years 10–15+: OAS Superior Administrative Grade / Special Secretary → IAS Conferment (UPSC Selection).'
      ],
      promotion_ladder_or: [
        '୦–୫ ବର୍ଷ: OAS Group-A (JB) — BDO / ଡେପୁଟି କଲେକ୍ଟର୍ (ORSP L-12)।',
        '୫–୧୦ ବର୍ଷ: OAS (SB) — ସବ୍-କଲେକ୍ଟର୍ / ADM / ଅଣ୍ଡର୍ ସେକ୍ରେଟାରୀ (L-13/14)।',
        '୧୦–୧୫+ ବର୍ଷ: ସ୍ପେଶାଲ୍ ସେକ୍ରେଟାରୀ → IAS କନଫରମେଣ୍ଟ୍।'
      ],
      required_certificates_en: [
        'HSC / 10th Certificate (DOB + Odia language proof)',
        'Graduation Provisional / Original Certificate & Marksheets',
        'Odisha Resident & Valid Caste / SEBC / EWS / PwBD Certificate (e-District)',
        'NOC from Employer (if already in Govt service)'
      ],
      required_certificates_or: [
        'ଦଶମ ପ୍ରମାଣପତ୍ର (ଜନ୍ମ ତାରିଖ ଓ ଓଡ଼ିଆ ଭାଷା ପ୍ରମାଣ)',
        'ସ୍ନାତକ ଡିଗ୍ରୀ ସାର୍ଟିଫିକେଟ୍ ଓ ମାର୍କସିଟ୍',
        'ଓଡ଼ିଶା ବାସିନ୍ଦା ଓ ଜାତି/SEBC/EWS/PwBD ପ୍ରମାଣପତ୍ର (e-District)',
        'ସରକାରୀ ଚାକିରିରେ ଥିଲେ NOC'
      ],
      roadmap_body_en: '### Preparation Blueprint\n- Build a strong 6-month foundation with NCERTs (Class 6–12), Laxmikanth Polity, and Odisha History/Geography/Economy.\n- Practice daily mains answer writing (150–250 words) aligned to the updated UPSC-pattern OPSC OCS syllabus.\n- Complete 15+ full-length Prelims & Mains test series with dedicated Odisha budget and Economic Survey notes.',
      roadmap_body_or: '### ପ୍ରସ୍ତୁତି ରୋଡମ୍ୟାପ୍\n- NCERT (୬ଷ୍ଠ–୧୨ଶ), ଭାରତୀୟ ସମ୍ବିଧାନ ଏବଂ ଓଡ଼ିଶା ଇତିହାସ/ଭୂଗୋଳ/ଅର୍ଥନୀତି ଉପରେ ଦୃଢ଼ ମୂଳଦୁଆ ଗଢ଼ନ୍ତୁ।\n- UPSC ଢାଞ୍ଚାର OPSC OCS ମେନ୍ସ ପାଇଁ ନିୟମିତ ଉତ୍ତର ଲିଖନ ଅଭ୍ୟାସ କରନ୍ତୁ।\n- ଓଡ଼ିଶା ବଜେଟ୍ ଓ ଅର୍ଥନୈତିକ ସର୍ବେକ୍ଷଣ ନୋଟ୍ସ ସହ ମକ୍ ଟେଷ୍ଟ ଦିଅନ୍ତୁ।',
      official_links: [
        { label: 'OPSC Official Portal', url: 'https://www.opsc.gov.in' },
        { label: 'Gopabandhu Academy (GAA)', url: 'https://gaaodisha.gov.in' }
      ]
    },
    {
      id: 'cso-rm-ossc-cglre',
      slug: 'ossc-cglre-departmental-cadres',
      track_slug: 'civil-services',
      subtrack_slug: 'ossc-graduate',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'graduate',
      stage_tags: ['graduate'],
      stage_label_en: 'Graduate',
      stage_label_or: 'ସ୍ନାତକ',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'OSSC CGLRE & Departmental Cadres (Inspector, Auditor, ASO)',
      title_or: 'OSSC CGLRE ଓ ବିଭାଗୀୟ ପଦବୀ (ଇନ୍ସପେକ୍ଟର, ଅଡିଟର, ASO)',
      summary_en: 'Fast-track Group-B & Group-C graduate state recruitment for Inspector of Supplies, Auditor, Junior Assistant (HoD), and Secretariat ASO roles.',
      summary_or: 'ଯୋଗାଣ ନିରୀକ୍ଷକ, ଅଡିଟର, HoD ଜୁନିୟର ଆସିଷ୍ଟାଣ୍ଟ ଏବଂ ସଚିବାଳୟ ASO ପାଇଁ OSSC ର ସବୁଠୁ ଲୋକପ୍ରିୟ ସ୍ନାତକ ନିଯୁକ୍ତି ମାର୍ଗ।',
      orsp_level: 'ORSP L-9 · ₹35,400',
      salary_band: 'ORSP Level-9 (₹35,400 Basic; ~₹56,000+ Gross) · Level-7 for Jr. Asst',
      salary_band_or: 'ORSP ଲେଭେଲ୍-୯ (₹୩୫,୪୦୦ ମୂଳ ବେତନ; ~₹୫୬,୦୦୦+ ଗ୍ରସ୍)',
      pay_allowances_en: 'ORSP Level-9 (₹35,400–₹1,12,400) for Inspector of Cooperative Societies, Auditor, Marketing Intelligence Inspector & ASO; Level-7 (₹25,500) for Junior Assistant (HoD) + DA, HRA, Medical & MACP.',
      pay_allowances_or: 'ଇନ୍ସପେକ୍ଟର, ଅଡିଟର ଓ ASO ପାଇଁ ORSP L-9 (₹୩୫,୪୦୦–₹୧,୧୨,୪୦୦) ଏବଂ ଜୁନିୟର ଆସିଷ୍ଟାଣ୍ଟ ପାଇଁ L-7 (₹୨୫,୫୦୦) + DA, HRA ଓ MACP।',
      eligibility_summary: 'Bachelor’s Degree in any discipline + Basic Computer Knowledge + Odia up to Class 7/10. Age: 21–38 yrs.',
      eligibility_summary_or: 'ଯେକୌଣସି ବିଭାଗରେ ସ୍ନାତକ + କମ୍ପ୍ୟୁଟର ଜ୍ଞାନ + ଓଡ଼ିଆ (୭ମ/୧୦ମ)। ବୟସ: ୨୧–୩୮ ବର୍ଷ।',
      age_window_en: '21 to 38 years (UR) · +5 yrs SC/ST/SEBC/Women · +10 yrs PwBD · ₹0 OSSC Application Fee.',
      age_window_or: '୨୧–୩୮ ବର୍ଷ (UR) · SC/ST/SEBC/ମହିଳା +୫ ବର୍ଷ · PwBD +୧୦ ବର୍ଷ · OSSC ଆବେଦନ ଫିସ୍ ₹୦।',
      key_exams: 'OSSC CGLRE Prelims (OMR/CBT) → Mains (Language + GS/Math) → Computer Skill Test → Certificate Verification',
      selection_stages_en: [
        'Stage 1 — Preliminary Exam (150 Marks, 150 Mins): Arithmetic, Data Interpretation, Logical Reasoning, Current Affairs & Computer.',
        'Stage 2 — Main Written Exam (200 Marks): Paper I (Odia & English Language — 100M) + Paper II (General Studies — 100M).',
        'Stage 3 — Computer Skill Test (50 Marks, Qualifying — MS Word, Excel, PowerPoint, Windows) & Certificate Verification.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ପ୍ରିଲିମ୍ସ (୧୫୦ ମାର୍କ): ଗଣିତ, DI, ତର୍କଶକ୍ତି, ସାମ୍ପ୍ରତିକ ଘଟଣା ଓ କମ୍ପ୍ୟୁଟର।',
        'ପର୍ଯ୍ୟାୟ ୨ — ମେନ୍ସ (୨୦୦ ମାର୍କ): ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ଭାଷା (୧୦୦) + ସାଧାରଣ ଅଧ୍ୟୟନ (୧୦୦)।',
        'ପର୍ଯ୍ୟାୟ ୩ — କମ୍ପ୍ୟୁଟର ସ୍କିଲ୍ ଟେଷ୍ଟ (୫୦ ମାର୍କ, କ୍ୱାଲିଫାଇଙ୍ଗ୍) ଓ ସାର୍ଟିଫିକେଟ୍ ଯାଞ୍ଚ।'
      ],
      milestones: [
        { step: '1', label_en: 'Arithmetic, DI & Reasoning Speed Drills', label_or: 'ଗଣିତ, DI ଓ ରିଜନିଂ ସ୍ପିଡ୍ ଅଭ୍ୟାସ' },
        { step: '2', label_en: 'Odia-English Grammar + GS Mains', label_or: 'ଓଡ଼ିଆ-ଇଂରାଜୀ ବ୍ୟାକରଣ ଓ GS ମେନ୍ସ' },
        { step: '3', label_en: 'Practical MS Office Computer Test', label_or: 'MS Office କମ୍ପ୍ୟୁଟର ସ୍କିଲ୍ ଟେଷ୍ଟ' }
      ],
      promotion_ladder_en: [
        'Years 0–6: Junior Assistant / Inspector / Auditor (ORSP L-7 to L-9).',
        'Years 6–12: Senior Assistant / Section Officer / Senior Inspector (ORSP L-10 to L-11).',
        'Years 12–18: Establishment Officer / Assistant Director / Desk Officer (ORSP L-12).'
      ],
      promotion_ladder_or: [
        '୦–୬ ବର୍ଷ: ଜୁନିୟର ଆସିଷ୍ଟାଣ୍ଟ / ଇନ୍ସପେକ୍ଟର / ଅଡିଟର (L-7 ରୁ L-9)।',
        '୬–୧୨ ବର୍ଷ: ସିନିୟର ଆସିଷ୍ଟାଣ୍ଟ / ସେକ୍ସନ ଅଫିସର୍ (L-10/11)।',
        '୧୨–୧୮ ବର୍ଷ: ଏଷ୍ଟାବ୍ଲିଶମେଣ୍ଟ ଅଫିସର୍ / ଆସିଷ୍ଟାଣ୍ଟ ଡାଇରେକ୍ଟର୍ (L-12)।'
      ],
      required_certificates_en: [
        '10th, +2 & Graduation Marksheets & Certificates',
        'Odia Pass Certificate (HSC / ME Standard)',
        'PGDCA / Basic Computer Certificate (where specified)',
        'Valid Caste / SEBC (within 3 yrs) / EWS / Sports / Ex-Serviceman Proof'
      ],
      required_certificates_or: [
        '୧୦ମ, +୨ ଓ ସ୍ନାତକ ମାର୍କସିଟ୍ ଏବଂ ପ୍ରମାଣପତ୍ର',
        'ଓଡ଼ିଆ ପାସ୍ ପ୍ରମାଣପତ୍ର (HSC / ME)',
        'PGDCA / କମ୍ପ୍ୟୁଟର ସାର୍ଟିଫିକେଟ୍',
        'ବୈଧ ଜାତି / SEBC / EWS ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### Winning OSSC CGLRE Strategy\n- Master Class 10 Arithmetic & Data Interpretation tables/charts to clear the Prelims cutoff comfortably.\n- Build crisp Odia precis/translation and English grammar skills for Mains Paper-I.\n- Practice practical Excel formulas, Mail Merge in MS Word, and PowerPoint slides 2 weeks before the Skill Test.',
      roadmap_body_or: '### OSSC CGLRE ସଫଳତା କୌଶଳ\n- ପ୍ରିଲିମ୍ସ ପାଇଁ ଦଶମ ସ୍ତରର ଗଣିତ ଓ ଡାଟା ଇଣ୍ଟରପ୍ରିଟେସନ୍ ଉପରେ ଅଧିକ ଅଭ୍ୟାସ କରନ୍ତୁ।\n- ମେନ୍ସ ପାଇଁ ଓଡ଼ିଆ ଅନୁବାଦ, ସାରାଂଶ ଲିଖନ ଓ ଇଂରାଜୀ ବ୍ୟାକରଣ ମଜବୁତ କରନ୍ତୁ।\n- ସ୍କିଲ୍ ଟେଷ୍ଟ ପୂର୍ବରୁ MS Word, Excel ଓ PowerPoint ଅଭ୍ୟାସ କରନ୍ତୁ।',
      official_links: [
        { label: 'OSSC Official Portal', url: 'https://www.ossc.gov.in' },
        { label: 'CSO ORSP Pay Calculator', url: '/career-paths/' }
      ]
    },
    {
      id: 'cso-rm-osssc-district-police',
      slug: 'osssc-district-cadre-police-si',
      track_slug: 'civil-services',
      subtrack_slug: 'district-police',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'after-10th-12th',
      stage_tags: ['after-10th-12th', 'graduate'],
      stage_label_en: 'After 10th / +2 · Graduate',
      stage_label_or: '+୨ / ସ୍ନାତକ',
      featured: 0,
      status: 'published',
      is_builtin: true,
      title_en: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS / Forest Guard) & Odisha Police SI Path',
      title_or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / ଫରେଷ୍ଟ ଗାର୍ଡ) ଓ ଓଡ଼ିଶା ପୋଲିସ୍ SI',
      summary_en: 'High-vacancy district-level Odisha recruitment covering Revenue, Forest, Panchayat (PEO), and Uniformed Police Sub-Inspector pathways.',
      summary_or: 'ରାଜସ୍ୱ (RI/ARI/ଅମିନ), ବନବିଭାଗ (ଫରେଷ୍ଟ ଗାର୍ଡ/ଫରେଷ୍ଟର୍) ଏବଂ ଓଡ଼ିଶା ପୋଲିସ୍ SI ପାଇଁ ସର୍ବାଧିକ ପଦବୀ ବିଶିଷ୍ଟ ରାଜ୍ୟ ନିଯୁକ୍ତି ମାର୍ଗ।',
      orsp_level: 'ORSP L-4 to L-9 · ₹19,900–₹35,400',
      salary_band: 'ORSP L-4 (₹19,900 Forest Guard/ARI) · L-9 (₹35,400 RI & Police SI)',
      salary_band_or: 'ORSP L-4 (₹୧୯,୯୦୦ ଫରେଷ୍ଟ ଗାର୍ଡ/ARI) · L-9 (₹୩୫,୪୦୦ RI ଓ ପୋଲିସ୍ SI)',
      pay_allowances_en: 'ORSP Level-4 (₹19,900) for Forest Guard/ARI/Amin, Level-5 (₹21,700) for PEO/Forester, Level-9 (₹35,400) for Revenue Inspector (RI) & Odisha Police SI + Uniform/Ration Allowance (Police/Forest), DA & HRA.',
      pay_allowances_or: 'ଫରେଷ୍ଟ ଗାର୍ଡ/ARI/ଅମିନ ପାଇଁ L-4 (₹୧୯,୯୦୦), PEO/ଫରେଷ୍ଟର୍ ପାଇଁ L-5 (₹୨୧,୭୦୦) ଏବଂ RI ଓ ପୋଲିସ୍ SI ପାଇଁ L-9 (₹୩୫,୪୦୦) + ପୋଷାକ/ରାସନ ଭତ୍ତା ଓ DA/HRA।',
      eligibility_summary: '+2 for ARI/Amin/PEO/Forest Guard; Graduation for RI & Odisha Police SI. PET/PST required for Police & Forest.',
      eligibility_summary_or: 'ARI/ଅମିନ/PEO/ଫରେଷ୍ଟ ଗାର୍ଡ ପାଇଁ +୨; RI ଓ ପୋଲିସ୍ SI ପାଇଁ ସ୍ନାତକ। ପୋଲିସ୍ ଓ ବନବିଭାଗ ପାଇଁ ଶାରୀରିକ ପରୀକ୍ଷା (PET/PST) ଆବଶ୍ୟକ।',
      age_window_en: '18–38 yrs (OSSSC District Cadres) · 21–25 yrs (Odisha Police SI, +5 yrs SC/ST/SEBC/Women).',
      age_window_or: '୧୮–୩୮ ବର୍ଷ (OSSSC) · ୨୧–୨୫ ବର୍ଷ (ପୋଲିସ୍ SI, SC/ST/SEBC/ମହିଳା +୫ ବର୍ଷ ଛାଡ଼)।',
      key_exams: 'OSSSC CRE (Prelims + Mains + Skill) · OPRB Odisha Police SI (Written + PET/PST)',
      selection_stages_en: [
        'Stage 1 — Objective Written CBT/OMR (Math, Odia, English, GK, Computer — 0.25/0.33 negative marking).',
        'Stage 2 — Practical Skill Test (RI/ARI/Amin/PEO) OR Physical Standard & Efficiency Test (Running, Long Jump, Walking for Police SI & Forest).',
        'Stage 3 — District-Wise Merit Allocation & Document Verification.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ଲିଖିତ ପରୀକ୍ଷା (ଗଣିତ, ଓଡ଼ିଆ, ଇଂରାଜୀ, GK, କମ୍ପ୍ୟୁଟର)।',
        'ପର୍ଯ୍ୟାୟ ୨ — କମ୍ପ୍ୟୁଟର ସ୍କିଲ୍ ଟେଷ୍ଟ (RI/ARI/PEO) କିମ୍ବା ଶାରୀରିକ ଦକ୍ଷତା ପରୀକ୍ଷା PET/PST (ପୋଲିସ୍ SI ଓ ଫରେଷ୍ଟ)।',
        'ପର୍ଯ୍ୟାୟ ୩ — ଜିଲ୍ଲାସ୍ତରୀୟ ମେଧା ତାଲିକା ଓ ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ।'
      ],
      milestones: [
        { step: '1', label_en: 'OSSSC 5-Subject Core Syllabus Mastery', label_or: 'OSSSC ୫-ବିଷୟ ସିଲାବସ୍ ପ୍ରସ୍ତୁତି' },
        { step: '2', label_en: 'Daily PET/PST Ground Conditioning', label_or: 'ଦୈନିକ PET/PST ଶାରୀରିକ ଅଭ୍ୟାସ' },
        { step: '3', label_en: 'District Preference & Verification', label_or: 'ଜିଲ୍ଲା ପସନ୍ଦ ଓ ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ' }
      ],
      promotion_ladder_en: [
        'Years 0–6: ARI / Amin / Forest Guard / Police SI (ORSP L-4 to L-9).',
        'Years 6–12: Revenue Inspector (RI) / Revenue Supervisor / Inspector of Police (ORSP L-9 to L-10).',
        'Years 12–18: Additional Tahasildar (ORS) / Range Officer / DSP (OPS Group-A via Departmental Promotion).'
      ],
      promotion_ladder_or: [
        '୦–୬ ବର୍ଷ: ARI / ଅମିନ / ଫରେଷ୍ଟ ଗାର୍ଡ / ପୋଲିସ୍ SI (L-4 ରୁ L-9)।',
        '୬–୧୨ ବର୍ଷ: RI / ରେଭିନ୍ୟୁ ସୁପରଭାଇଜର୍ / ପୋଲିସ୍ ଇନ୍ସପେକ୍ଟର (L-9/10)।',
        '୧୨–୧୮ ବର୍ଷ: ଅତିରିକ୍ତ ତହସିଲଦାର (ORS) / ରେଞ୍ଜ ଅଫିସର୍ / DSP (OPS)।'
      ],
      required_certificates_en: [
        '10th, +2 / Graduation Certificates & Odia Proficiency Proof',
        'District Employment Exchange Registration (where applicable)',
        'Odisha Resident, Caste / SEBC / Home Guard / NCC Certificate',
        'Medical Fitness Certificate for Uniformed Services'
      ],
      required_certificates_or: [
        '୧୦ମ, +୨ / ସ୍ନାତକ ଓ ଓଡ଼ିଆ ଭାଷା ପ୍ରମାଣପତ୍ର',
        'ଜିଲ୍ଲା ନିଯୁକ୍ତି ବିନିମୟ ପଞ୍ଜୀକରଣ',
        'ଓଡ଼ିଶା ବାସିନ୍ଦା, ଜାତି/SEBC/NCC ପ୍ରମାଣପତ୍ର',
        'ମେଡିକାଲ୍ ଫିଟନେସ୍ ସାର୍ଟିଫିକେଟ୍'
      ],
      roadmap_body_en: '### District Cadre & Police SI Playbook\n- Target 85%+ accuracy in Odia Grammar, Basic Computer, and Elementary Math — these three sections decide OSSSC merit.\n- For Police SI and Forest Guard, pair morning running/walking stamina drills with CSOdisha PET/PST Standards Checker.\n- Review previous OSSSC district cut-offs before locking district preferences.',
      roadmap_body_or: '### ଜିଲ୍ଲା କ୍ୟାଡର୍ ଓ ପୋଲିସ୍ SI କୌଶଳ\n- ଓଡ଼ିଆ ବ୍ୟାକରଣ, କମ୍ପ୍ୟୁଟର ଓ ମୌଳିକ ଗଣିତରେ ୮୫%+ ସଠିକତା ଲକ୍ଷ୍ୟ ରଖନ୍ତୁ।\n- ପୋଲିସ୍ SI ଓ ଫରେଷ୍ଟ ଗାର୍ଡ ପାଇଁ ପ୍ରତିଦିନ ସକାଳେ ଦୌଡ଼/ଚାଲିବା ଅଭ୍ୟାସ ସହ CSO PET/PST ଚେକର୍ ବ୍ୟବହାର କରନ୍ତୁ।',
      official_links: [
        { label: 'OSSSC Official Portal', url: 'https://www.osssc.gov.in' },
        { label: 'Odisha Police Recruitment Board', url: 'https://odishapolice.gov.in' }
      ]
    },

    /* ================================================================
     * TRACK 2: ENGINEERING & IT (3 Roadmaps)
     * ================================================================ */
    {
      id: 'cso-rm-psu-gate-engineer',
      slug: 'optcl-ohpc-gridco-psu-gate',
      track_slug: 'engineering-it',
      subtrack_slug: 'psu-gate',
      region_scope: 'both',
      scope_label_en: 'Odisha State & National',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ ଜାତୀୟ',
      career_stage: 'diploma-btech',
      stage_tags: ['diploma-btech', 'graduate'],
      stage_label_en: 'Diploma / B.Tech',
      stage_label_or: 'B.Tech / B.E.',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'OPTCL / OHPC / GRIDCO / OPGC & Central PSU GATE Engineer',
      title_or: 'OPTCL / OHPC / GRIDCO / OPGC ଏବଂ କେନ୍ଦ୍ରୀୟ PSU GATE ଇଞ୍ଜିନିୟର୍',
      summary_en: 'Management Trainee & Graduate Engineer Executive pathway into Odisha power utilities (OPTCL, OHPC, OPGC) and Maharatna PSUs (NALCO, NTPC, IOCL, MCL, RSP).',
      summary_or: 'ଓଡ଼ିଶାର ଶକ୍ତି ନିଗମ (OPTCL, OHPC, GRIDCO, OPGC) ଏବଂ ମହାରତ୍ନ PSU (NALCO, NTPC, IOCL, MCL) ରେ GATE ମାଧ୍ୟମରେ କାର୍ଯ୍ୟନିର୍ବାହୀ ଇଞ୍ଜିନିୟର୍ ନିଯୁକ୍ତି।',
      orsp_level: 'ORSP L-10–12 / PSU E2 · ₹50,000–₹1,60,000',
      salary_band: 'ORSP L-10–12 (OPTCL/OHPC) · IDA E2 ₹50,000–₹1,60,000 (~₹14–₹19 LPA CTC)',
      salary_band_or: 'ORSP L-10–12 (OPTCL/OHPC) · PSU E2 ₹୫୦,୦୦୦–₹୧,୬୦,୦୦୦ (~₹୧୪–₹୧୯ LPA)',
      pay_allowances_en: 'State Power PSUs (OPTCL/OHPC/GRIDCO): ORSP Level-10/12 (₹56,100 Basic after training). Central Maharatnas (NALCO, NTPC, IOCL, SAIL): IDA E2 Scale ₹50,000–₹1,60,000 + 44% IDA + 35% Cafeteria Perks + PRP + Township.',
      pay_allowances_or: 'OPTCL/OHPC ରେ ORSP L-10/12 ଏବଂ NALCO/NTPC/IOCL ରେ IDA E2 (₹୫୦,୦୦୦–₹୧,୬୦,୦୦୦) + ୪୪% IDA + ୩୫% ପର୍କସ୍ + PRP + ଟାଉନସିପ୍।',
      eligibility_summary: 'B.Tech / B.E. (60% UR, 50% SC/ST) in Electrical, Mechanical, Civil, C&I, IT/CS + Valid GATE Score (or OPTCL CBT).',
      eligibility_summary_or: 'Electrical, Mechanical, Civil, C&I, IT/CS ରେ B.Tech/B.E. (୬୦% UR, ୫୦% SC/ST) + ବୈଧ GATE ସ୍କୋର୍।',
      age_window_en: '21–32 yrs (OPTCL/OHPC, +5 yrs SC/ST/SEBC/Women) · 27–30 yrs (Central Maharatna PSUs).',
      age_window_or: '୨୧–୩୨ ବର୍ଷ (OPTCL/OHPC, +୫ ବର୍ଷ ଛାଡ଼) · ୨୭–୩୦ ବର୍ଷ (କେନ୍ଦ୍ରୀୟ PSU)।',
      key_exams: 'GATE (EE / ME / CE / EC / CS) → PSU Shortlisting / OPTCL CBT → GD & Personal Interview',
      selection_stages_en: [
        'Stage 1 — GATE Exam (100 Marks: 15M General Aptitude + 13M Engg Math + 72M Core Branch) or OPTCL CBT.',
        'Stage 2 — Branch-Wise Shortlisting (85% GATE Weightage in most PSUs) & Document Verification.',
        'Stage 3 — Group Discussion / Technical Interview (15% Weightage) + Pre-Employment Medical Exam.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — GATE ପରୀକ୍ଷା (୧୦୦ ମାର୍କ: ଆପ୍ଟିଚ୍ୟୁଡ୍ + ଗଣିତ + କୋର୍ ଇଞ୍ଜିନିୟରିଂ) କିମ୍ବା OPTCL CBT।',
        'ପର୍ଯ୍ୟାୟ ୨ — GATE ସ୍କୋର୍ ଆଧାରରେ ସର୍ଟଲିଷ୍ଟିଂ (୮୫% ୱେଟେଜ୍)।',
        'ପର୍ଯ୍ୟାୟ ୩ — ଗ୍ରୁପ୍ ଡିସକସନ୍, ଟେକ୍ନିକାଲ୍ ଇଣ୍ଟରଭ୍ୟୁ ଓ ମେଡିକାଲ୍ ଯାଞ୍ଚ।'
      ],
      milestones: [
        { step: '1', label_en: 'Core Branch + Engg Math GATE Prep', label_or: 'କୋର୍ ବ୍ରାଞ୍ଚ ଓ ଗଣିତ GATE ପ୍ରସ୍ତୁତି' },
        { step: '2', label_en: '20-Year GATE PYQs & Virtual Calc Mocks', label_or: '୨୦ ବର୍ଷର GATE PYQ ଓ ମକ୍ ଟେଷ୍ଟ' },
        { step: '3', label_en: 'OPTCL / NALCO / NTPC PSU Interviews', label_or: 'OPTCL / NALCO / NTPC ଇଣ୍ଟରଭ୍ୟୁ' }
      ],
      promotion_ladder_en: [
        'Years 0–4: Management Trainee (MT) → Assistant Manager / Engineer (E2).',
        'Years 4–10: Deputy Manager (E3) → Manager (E4) in Grid Operations / Plant Engineering.',
        'Years 10–15+: Senior Manager (E5) → DGM / General Manager (E6–E7).'
      ],
      promotion_ladder_or: [
        '୦–୪ ବର୍ଷ: ମ୍ୟାନେଜମେଣ୍ଟ ଟ୍ରେନି (MT) → ଆସିଷ୍ଟାଣ୍ଟ ମ୍ୟାନେଜର୍ (E2)।',
        '୪–୧୦ ବର୍ଷ: ଡେପୁଟି ମ୍ୟାନେଜର୍ (E3) → ମ୍ୟାନେଜର୍ (E4)।',
        '୧୦–୧୫+ ବର୍ଷ: ସିନିୟର ମ୍ୟାନେଜର୍ (E5) → DGM / GM (E6–E7)।'
      ],
      required_certificates_en: [
        'B.Tech / B.E. Degree & All-Semester CGPA-to-Percentage Conversion Formula',
        'Valid GATE Scorecard (Current Recruitment Year)',
        'Odia Proficiency Proof (Mandatory for OPTCL / OHPC / GRIDCO)',
        'Caste / OBC-NCL (Central Format) / SEBC / EWS / PwBD Certificate'
      ],
      required_certificates_or: [
        'B.Tech ଡିଗ୍ରୀ ଓ CGPA ରୁ ପ୍ରତିଶତ ରୂପାନ୍ତର ପ୍ରମାଣପତ୍ର',
        'ବୈଧ GATE ସ୍କୋରକାର୍ଡ',
        'ଓଡ଼ିଆ ଭାଷା ପ୍ରମାଣପତ୍ର (OPTCL/OHPC ପାଇଁ ବାଧ୍ୟତାମୂଳକ)',
        'କେନ୍ଦ୍ରୀୟ OBC-NCL / SC / ST / EWS ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### GATE & Odisha Power PSU Plan\n- Aim for 65+ normalized marks in GATE to stay competitive for NALCO (Angul/Damanjodi), NTPC (Talcher/Kaniha/Darlipali), OPTCL, and OHPC.\n- Keep 28/28 marks target in Engineering Mathematics + General Aptitude.\n- Prepare final-year B.Tech project fundamentals and power system / plant safety concepts for PSU interviews.',
      roadmap_body_or: '### GATE ଓ ଓଡ଼ିଶା PSU ପ୍ରସ୍ତୁତି\n- NALCO, NTPC, OPTCL ଓ OHPC ପାଇଁ GATE ରେ ୬୫+ ମାର୍କ ଲକ୍ଷ୍ୟ ରଖନ୍ତୁ।\n- ଇଞ୍ଜିନିୟରିଂ ଗଣିତ ଓ ଜେନେରାଲ୍ ଆପ୍ଟିଚ୍ୟୁଡ୍ ରୁ ସର୍ବାଧିକ ମାର୍କ ସ୍କୋର୍ କରନ୍ତୁ।\n- ଇଣ୍ଟରଭ୍ୟୁ ପାଇଁ ନିଜ B.Tech ପ୍ରୋଜେକ୍ଟ ଓ ପାୱାର ସିଷ୍ଟମ୍ ମୌଳିକ ଧାରଣା ପ୍ରସ୍ତୁତ ରଖନ୍ତୁ।',
      official_links: [
        { label: 'OPTCL Recruitment Portal', url: 'https://www.optcl.co.in' },
        { label: 'OHPC Careers', url: 'https://www.ohpcltd.com' },
        { label: 'NALCO Careers', url: 'https://nalcoindia.com' }
      ]
    },
    {
      id: 'cso-rm-opsc-ossc-aee-je',
      slug: 'ossc-opsc-aee-je-civil-elec-mech',
      track_slug: 'engineering-it',
      subtrack_slug: 'state-engineering',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'diploma-btech',
      stage_tags: ['diploma-btech'],
      stage_label_en: 'Diploma / B.Tech',
      stage_label_or: 'ଡିପ୍ଲୋମା / B.Tech',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'OSSC / OPSC AEE & JE (Civil / Electrical / Mechanical)',
      title_or: 'OSSC / OPSC AEE ଓ JE (ସିଭିଲ୍ / ଇଲେକ୍ଟ୍ରିକାଲ୍ / ମେକାନିକାଲ୍)',
      summary_en: 'Odisha Engineering Service (OPSC AEE Group-A) and Combined Technical Services (OSSC CTSRE Junior Engineer) in Works, Water Resources, Rural Development & H&UD.',
      summary_or: 'ପୂର୍ତ୍ତ, ଜଳସମ୍ପଦ, ଗ୍ରାମ୍ୟ ଉନ୍ନୟନ ଓ ନଗର ଉନ୍ନୟନ ବିଭାଗରେ OPSC AEE (Group-A) ଏବଂ OSSC CTSRE ଜୁନିୟର ଇଞ୍ଜିନିୟର୍ (JE) ନିଯୁକ୍ତି।',
      orsp_level: 'ORSP L-9 to L-12 · ₹35,400–₹56,100',
      salary_band: 'ORSP L-9 (₹35,400 OSSC JE) · L-12 (₹56,100 OPSC AEE Group-A)',
      salary_band_or: 'ORSP L-9 (₹୩୫,୪୦୦ OSSC JE) · L-12 (₹୫୬,୧୦୦ OPSC AEE Group-A)',
      pay_allowances_en: 'OSSC Junior Engineer (CTSRE): ORSP Level-9 (₹35,400 Basic; ~₹56,000+ Gross). OPSC Assistant Executive Engineer (AEE): ORSP Level-12 (₹56,100 Basic; ~₹89,000+ Gross) + Field Allowance, DA, HRA & Govt Accommodation.',
      pay_allowances_or: 'OSSC JE ପାଇଁ ORSP L-9 (₹୩୫,୪୦୦) ଏବଂ OPSC AEE (Group-A) ପାଇଁ ORSP L-12 (₹୫୬,୧୦୦) + DA, HRA ଓ ସରକାରୀ ବାସଭବନ।',
      eligibility_summary: 'Diploma in Civil/Elec/Mech for OSSC JE; B.Tech/B.E. + Valid GATE Score (or OPSC Written) for OPSC AEE. Odia mandatory.',
      eligibility_summary_or: 'OSSC JE ପାଇଁ ଡିପ୍ଲୋମା; OPSC AEE ପାଇଁ B.Tech + ବୈଧ GATE ସ୍କୋର୍ (କିମ୍ବା ଲିଖିତ ପରୀକ୍ଷା)। ଓଡ଼ିଆ ବାଧ୍ୟତାମୂଳକ।',
      age_window_en: '21–38 yrs (UR) · +5 yrs SC/ST/SEBC/Women · +10 yrs PwBD · ₹0 State Fee.',
      age_window_or: '୨୧–୩୮ ବର୍ଷ (UR) · SC/ST/SEBC/ମହିଳା +୫ ବର୍ଷ · PwBD +୧୦ ବର୍ଷ · ଫିସ୍ ₹୦।',
      key_exams: 'OSSC CTSRE (Prelims + Technical Mains) · OPSC AEE (GATE 90% + Interview 10% or Written)',
      selection_stages_en: [
        'OSSC CTSRE JE: Prelims (150M Non-Tech Arithmetic/DI/Reasoning/Computer) → Mains (200M Branch Technical Paper) → Certificate Verification.',
        'OPSC AEE: Valid GATE Score Shortlisting (90% Weightage in recent Water Resources/Works rules) → Viva-Voce Interview (10%).',
        'Final Cadre Allocation across Works, Water Resources, Rural Development, Panchayati Raj & H&UD.'
      ],
      selection_stages_or: [
        'OSSC CTSRE JE: ପ୍ରିଲିମ୍ସ (୧୫୦ ମାର୍କ) → ଟେକ୍ନିକାଲ୍ ମେନ୍ସ (୨୦୦ ମାର୍କ) → ସାର୍ଟିଫିକେଟ୍ ଯାଞ୍ଚ।',
        'OPSC AEE: GATE ସ୍କୋର୍ ସର୍ଟଲିଷ୍ଟିଂ (୯୦%) → ସାକ୍ଷାତକାର (୧୦%)।',
        'ପୂର୍ତ୍ତ, ଜଳସମ୍ପଦ ଓ ଗ୍ରାମ୍ୟ ଉନ୍ନୟନ ବିଭାଗରେ ନିଯୁକ୍ତି।'
      ],
      milestones: [
        { step: '1', label_en: 'CTSRE Prelims + IS Codes / Standard Formulas', label_or: 'CTSRE ପ୍ରିଲିମ୍ସ ଓ IS କୋଡ୍ ଅଭ୍ୟାସ' },
        { step: '2', label_en: 'Technical Mains / GATE Core Revision', label_or: 'ଟେକ୍ନିକାଲ୍ ମେନ୍ସ / GATE ରିଭିଜନ୍' },
        { step: '3', label_en: 'OSSC CV or OPSC Technical Viva', label_or: 'OSSC CV କିମ୍ବା OPSC ଭାଇଭା' }
      ],
      promotion_ladder_en: [
        'Years 0–6: Junior Engineer (L-9) → Assistant Engineer (L-10) OR Direct AEE (L-12).',
        'Years 6–12: Deputy Executive Engineer / Executive Engineer (ORSP L-13/L-14).',
        'Years 12–18+: Superintending Engineer → Chief Engineer / Engineer-in-Chief (ORSP L-15/L-16).'
      ],
      promotion_ladder_or: [
        '୦–୬ ବର୍ଷ: JE (L-9) → AE (L-10) କିମ୍ବା ସିଧାସଳଖ AEE (L-12)।',
        '୬–୧୨ ବର୍ଷ: ଡେପୁଟି ଏକ୍ସିକ୍ୟୁଟିଭ୍ ଇଞ୍ଜିନିୟର୍ / EE (L-13/14)।',
        '୧୨–୧୮+ ବର୍ଷ: ସୁପରିଣ୍ଟେଣ୍ଡିଂ ଇଞ୍ଜିନିୟର୍ → ଚିଫ୍ ଇଞ୍ଜିନିୟର୍ (L-15/16)।'
      ],
      required_certificates_en: [
        'Diploma (SCTE&VT / AICTE) or B.Tech Degree & Marksheets',
        'Odia Pass Proof (HSC / ME Standard)',
        'Valid GATE Scorecard (for OPSC AEE)',
        'e-District Resident, Caste / SEBC / EWS / PwBD Certificate'
      ],
      required_certificates_or: [
        'ଡିପ୍ଲୋମା (SCTE&VT) କିମ୍ବା B.Tech ପ୍ରମାଣପତ୍ର',
        'ଓଡ଼ିଆ ଭାଷା ପାସ୍ ପ୍ରମାଣପତ୍ର',
        'ବୈଧ GATE ସ୍କୋରକାର୍ଡ (OPSC AEE ପାଇଁ)',
        'ବାସିନ୍ଦା ଓ ଜାତି/SEBC/EWS ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### State Engineering Cadre Blueprint\n- For OSSC CTSRE JE, practice both Prelims Arithmetic/DI and Diploma-level core subjects (SOM, RCC, Surveying, Estimation, Fluid Mechanics / Power Systems / Thermodynamics).\n- Keep SCTE&VT/University equivalency certificates ready if applying with B.Tech for JE posts where permitted by service rules.',
      roadmap_body_or: '### ରାଜ୍ୟ ଇଞ୍ଜିନିୟରିଂ କ୍ୟାଡର୍ ରୋଡମ୍ୟାପ୍\n- OSSC CTSRE JE ପାଇଁ ପ୍ରିଲିମ୍ସ ଗଣିତ/DI ସହ ଡିପ୍ଲୋମା କୋର୍ ବିଷୟ (SOM, RCC, ସର୍ଭେ, ଏଷ୍ଟିମେସନ୍) ଭଲ ଭାବେ ଅଭ୍ୟାସ କରନ୍ତୁ।\n- OPSC AEE ପାଇଁ GATE ସ୍କୋର୍ ଉନ୍ନତ କରିବାକୁ ରିଭିଜନ୍ ଓ ମକ୍ ଟେଷ୍ଟ ଜାରି ରଖନ୍ତୁ।',
      official_links: [
        { label: 'OSSC CTSRE Portal', url: 'https://www.ossc.gov.in' },
        { label: 'OPSC AEE Portal', url: 'https://www.opsc.gov.in' }
      ]
    },
    {
      id: 'cso-rm-odisha-it-semiconductor',
      slug: 'odisha-it-semiconductor-gcc-startup',
      track_slug: 'engineering-it',
      subtrack_slug: 'it-semiconductor',
      region_scope: 'both',
      scope_label_en: 'Odisha State & National',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ ଜାତୀୟ',
      career_stage: 'graduate',
      stage_tags: ['after-10th-12th', 'graduate', 'diploma-btech'],
      stage_label_en: 'After +2 · Graduate · B.Tech',
      stage_label_or: '+୨ / ସ୍ନାତକ / B.Tech',
      featured: 0,
      status: 'published',
      is_builtin: true,
      title_en: 'IT / Software Engineering & Odisha Semiconductor / GCC / Startup Track',
      title_or: 'IT / ସଫ୍ଟୱେର୍ ଇଞ୍ଜିନିୟରିଂ ଏବଂ ଓଡ଼ିଶା ସେମିକଣ୍ଡକ୍ଟର୍ / GCC / ଷ୍ଟାର୍ଟଅପ୍ ମାର୍ଗ',
      summary_en: 'Industry roadmap covering Bhubaneswar Infocity/Infovalley GCCs (IBM, Deloitte, TCS, Infosys, Mindtree), Odisha Semiconductor/VLSI Policy hubs, and National product tech.',
      summary_or: 'ଭୁବନେଶ୍ୱର ଇନଫୋସିଟି/ଇନଫୋଭ୍ୟାଲି GCC (IBM, Deloitte, TCS, Infosys), ଓଡ଼ିଶା ସେମିକଣ୍ଡକ୍ଟର୍/VLSI ନୀତି ହବ୍ ଏବଂ ଜାତୀୟ ପ୍ରଡକ୍ଟ ଟେକ୍ କ୍ୟାରିୟର୍।',
      orsp_level: 'Industry · ₹4.5–₹24 LPA',
      salary_band: '₹4.5–₹9 LPA (Fresher IT/GCC) · ₹10–₹24+ LPA (VLSI / Product / Senior)',
      salary_band_or: '₹୪.୫–₹୯ LPA (ଫ୍ରେସର୍ IT/GCC) · ₹୧୦–₹୨୪+ LPA (VLSI / ପ୍ରଡକ୍ଟ)',
      pay_allowances_en: 'Bhubaneswar GCC & IT Services: ₹4.5–₹9 LPA entry (SDE-1 / Cloud / Data); Semiconductor/VLSI (SiCSem, RIR Power, Fabless Design) & National Product Firms: ₹10–₹24+ LPA + ESOPs + Performance Bonus + Health Cover.',
      pay_allowances_or: 'ଭୁବନେଶ୍ୱର GCC/IT ରେ ₹୪.୫–₹୯ LPA ଏବଂ ସେମିକଣ୍ଡକ୍ଟର୍/VLSI ଓ ପ୍ରଡକ୍ଟ କମ୍ପାନୀରେ ₹୧୦–₹୨୪+ LPA + ESOPs + ବୋନସ୍।',
      eligibility_summary: 'B.Tech/B.E. (CS/IT/ECE/EE), MCA, BCA/B.Sc. CS, or Diploma + Portfolio/Certifications. Strong DSA, Cloud, or VLSI skills.',
      eligibility_summary_or: 'B.Tech (CS/IT/ECE/EE), MCA, BCA/B.Sc. CS କିମ୍ବା ଡିପ୍ଲୋମା + ପ୍ରୋଜେକ୍ଟ ପୋର୍ଟଫୋଲିଓ। DSA, କ୍ଲାଉଡ୍ କିମ୍ବା VLSI ଦକ୍ଷତା।',
      age_window_en: 'No upper age bar (Merit & Portfolio-driven across startups, GCCs & global remote teams).',
      age_window_or: 'କୌଣସି ବୟସ ସୀମା ନାହିଁ (ଦକ୍ଷତା ଓ ପ୍ରୋଜେକ୍ଟ ପୋର୍ଟଫୋଲିଓ ଆଧାରିତ)।',
      key_exams: 'TCS NQT / Infosys SP / GATE CS-EC / Campus Drives / Open-Source & Kaggle / VLSI Design Assessments',
      selection_stages_en: [
        'Stage 1 — Online Coding / Aptitude Test (DSA, SQL, OS/DBMS or Verilog/Digital Electronics for VLSI).',
        'Stage 2 — 2 Technical Rounds (Live Problem Solving, System/API Design, Deployed GitHub Projects).',
        'Stage 3 — Hiring Manager & Cultural Fit Round + Offer Negotiation.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ଅନଲାଇନ୍ କୋଡିଂ / ଆପ୍ଟିଚ୍ୟୁଡ୍ ଟେଷ୍ଟ (DSA, SQL କିମ୍ବା VLSI/Verilog)।',
        'ପର୍ଯ୍ୟାୟ ୨ — ୨ଟି ଟେକ୍ନିକାଲ୍ ରାଉଣ୍ଡ (ଲାଇଭ୍ କୋଡିଂ, ସିଷ୍ଟମ୍ ଡିଜାଇନ୍, GitHub ପ୍ରୋଜେକ୍ଟ)।',
        'ପର୍ଯ୍ୟାୟ ୩ — ହାୟାରିଂ ମ୍ୟାନେଜର୍ ରାଉଣ୍ଡ ଓ ଅଫର୍।'
      ],
      milestones: [
        { step: '1', label_en: 'DSA + Core Stack or VLSI Fundamentals', label_or: 'DSA + ଫୁଲ୍-ଷ୍ଟ୍ୟାକ୍ କିମ୍ବା VLSI ମୂଳଦୁଆ' },
        { step: '2', label_en: '2 Deployed Projects + Internship / OSS', label_or: '୨ଟି ଲାଇଭ୍ ପ୍ରୋଜେକ୍ଟ ଓ ଇଣ୍ଟର୍ନସିପ୍' },
        { step: '3', label_en: 'GCC / Semiconductor / Product Interviews', label_or: 'GCC / ସେମିକଣ୍ଡକ୍ଟର୍ / ପ୍ରଡକ୍ଟ ଇଣ୍ଟରଭ୍ୟୁ' }
      ],
      promotion_ladder_en: [
        'Years 0–3: Software / VLSI / Cloud Engineer (SDE-1 — ₹5–₹12 LPA).',
        'Years 3–7: Senior Engineer / Tech Lead (SDE-2 / SDE-3 — ₹14–₹32 LPA).',
        'Years 7–15+: Staff Engineer / Engineering Manager / Principal Architect or Startup Odisha Founder.'
      ],
      promotion_ladder_or: [
        '୦–୩ ବର୍ଷ: ସଫ୍ଟୱେର୍ / VLSI / କ୍ଲାଉଡ୍ ଇଞ୍ଜିନିୟର୍ (SDE-1)।',
        '୩–୭ ବର୍ଷ: ସିନିୟର ଇଞ୍ଜିନିୟର୍ / ଟେକ୍ ଲିଡ୍ (SDE-2/3)।',
        '୭–୧୫+ ବର୍ଷ: ଷ୍ଟାଫ୍ ଇଞ୍ଜିନିୟର୍ / ଇଞ୍ଜିନିୟରିଂ ମ୍ୟାନେଜର୍ / ଷ୍ଟାର୍ଟଅପ୍ ପ୍ରତିଷ୍ଠାତା।'
      ],
      required_certificates_en: [
        'Clean 1-Page ATS Resume + Active GitHub / Portfolio URL',
        'B.Tech / MCA / BCA / Diploma Transcripts',
        'Optional High-Signal Certs: AWS/GCP Associate, NPTEL VLSI/AI, or Startup Odisha Registration',
        'PAN, Aadhaar & UAN (for Experienced Lateral Moves)'
      ],
      required_certificates_or: [
        '୧-ପୃଷ୍ଠାର ATS ରିଜ୍ୟୁମ୍ + GitHub ପୋର୍ଟଫୋଲିଓ',
        'B.Tech / MCA / BCA / ଡିପ୍ଲୋମା ପ୍ରମାଣପତ୍ର',
        'AWS/GCP/NPTEL VLSI କିମ୍ବା AI ପ୍ରମାଣପତ୍ର',
        'PAN, ଆଧାର ଓ UAN (ଅଭିଜ୍ଞ ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ)'
      ],
      roadmap_body_en: '### Odisha Tech & Semiconductor Acceleration\n- Track Bhubaneswar GCC hiring drives (Infocity, Infovalley, O-Hub Startup Odisha) alongside Bengaluru/Hyderabad/Pune product roles.\n- For ECE/EE graduates, pair NPTEL VLSI/Embedded Systems coursework with Verilog/SystemVerilog labs to tap Odisha’s growing semiconductor ecosystem.',
      roadmap_body_or: '### ଓଡ଼ିଶା ଟେକ୍ ଓ ସେମିକଣ୍ଡକ୍ଟର୍ ମାର୍ଗ\n- ଭୁବନେଶ୍ୱର ଇନଫୋସିଟି, ଇନଫୋଭ୍ୟାଲି ଓ O-Hub ଷ୍ଟାର୍ଟଅପ୍ ଓଡ଼ିଶା ନିଯୁକ୍ତି ଡ୍ରାଇଭ୍ ଉପରେ ନଜର ରଖନ୍ତୁ।\n- ECE/EE ଛାତ୍ରଛାତ୍ରୀମାନେ NPTEL VLSI ଓ Verilog ଅଭ୍ୟାସ କରି ସେମିକଣ୍ଡକ୍ଟର୍ କ୍ଷେତ୍ରରେ ସୁଯୋଗ ନିଅନ୍ତୁ।',
      official_links: [
        { label: 'Startup Odisha (O-Hub)', url: 'https://startupodisha.gov.in' },
        { label: 'OCAC Odisha IT Portal', url: 'https://ocac.in' }
      ]
    },

    /* ================================================================
     * TRACK 3: BANKING & FINANCE (3 Roadmaps)
     * ================================================================ */
    {
      id: 'cso-rm-sbi-ibps-rrb',
      slug: 'sbi-ibps-po-clerk-odisha-rrb',
      track_slug: 'banking-finance',
      subtrack_slug: 'psb-rrb',
      region_scope: 'both',
      scope_label_en: 'National & Odisha RRB',
      scope_label_or: 'ଜାତୀୟ ଓ ଓଡ଼ିଶା RRB',
      career_stage: 'graduate',
      stage_tags: ['graduate'],
      stage_label_en: 'Graduate',
      stage_label_or: 'ସ୍ନାତକ',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'SBI PO / Clerk & IBPS PO / Clerk / RRB Officer (Odisha Gramya Bank & Utkal Grameen Bank)',
      title_or: 'SBI PO / କ୍ଲର୍କ ଏବଂ IBPS PO / କ୍ଲର୍କ / RRB (ଓଡ଼ିଶା ଗ୍ରାମ୍ୟ ବ୍ୟାଙ୍କ ଓ ଉତ୍କଳ ଗ୍ରାମୀଣ ବ୍ୟାଙ୍କ)',
      summary_en: 'Annual predictable public-sector banking calendar with Odisha state-wise clerical & RRB vacancies backed by Local Odia Language Proficiency Test (LPT).',
      summary_or: 'ସ୍ଥାନୀୟ ଓଡ଼ିଆ ଭାଷା ପରୀକ୍ଷା (LPT) ସହିତ SBI, IBPS PO/କ୍ଲର୍କ ଏବଂ ଓଡ଼ିଶା ଗ୍ରାମ୍ୟ ବ୍ୟାଙ୍କ / ଉତ୍କଳ ଗ୍ରାମୀଣ ବ୍ୟାଙ୍କରେ ପ୍ରତିବର୍ଷ ନିୟମିତ ବ୍ୟାଙ୍କିଂ ନିଯୁକ୍ତି।',
      orsp_level: '12th Bipartite · ₹48,480 PO / ₹24,050 Clerk',
      salary_band: 'PO ₹48,480 Basic (~₹82,000+ Gross + Lease) · Clerk ₹24,050 (~₹42,000 Gross)',
      salary_band_or: 'PO ₹୪୮,୪୮୦ ମୂଳ ବେତନ (~₹୮୨,୦୦୦+ ଗ୍ରସ୍) · କ୍ଲର୍କ ₹୨୪,୦୫୦ (~₹୪୨,୦୦୦)',
      pay_allowances_en: '12th Bipartite Settlement: Probationary Officer (JMGS-I) starts at ₹48,480 Basic + DA + Leased House Accommodation (₹10k–₹30k) + Petrol + Newspaper + Medical; Clerk starts at ₹24,050 Basic + DA + HRA + Special Allowance.',
      pay_allowances_or: '୧୨ତମ ଦ୍ୱିପାକ୍ଷିକ ଚୁକ୍ତି: PO (JMGS-I) ₹୪୮,୪୮୦ + DA + ଘରଭଡ଼ା ଲିଜ୍ + ପେଟ୍ରୋଲ୍ ଭତ୍ତା; କ୍ଲର୍କ ₹୨୪,୦୫୦ + DA + HRA + ସ୍ୱତନ୍ତ୍ର ଭତ୍ତା।',
      eligibility_summary: 'Any Graduation Degree + Computer Literacy + Local Language Odia (10th/12th Marksheet or LPT for Odisha Circle/RRB).',
      eligibility_summary_or: 'ଯେକୌଣସି ସ୍ନାତକ ଡିଗ୍ରୀ + କମ୍ପ୍ୟୁଟର ଜ୍ଞାନ + ଓଡ଼ିଆ ଭାଷା ଦକ୍ଷତା (ଦଶମ/ଦ୍ୱାଦଶ କିମ୍ବା LPT)।',
      age_window_en: '20–28 yrs (Clerk) · 20–30 yrs (PO / RRB Officer Scale-I) · +3 yrs OBC-NCL · +5 yrs SC/ST.',
      age_window_or: '୨୦–୨୮ ବର୍ଷ (କ୍ଲର୍କ) · ୨୦–୩୦ ବର୍ଷ (PO / RRB) · OBC-NCL +୩ ବର୍ଷ · SC/ST +୫ ବର୍ଷ।',
      key_exams: 'SBI PO/JA · IBPS PO/Clerk · IBPS RRB PO/Office Assistant (OGB & UGB)',
      selection_stages_en: [
        'Stage 1 — Prelims (100 Marks, 60 Mins): English, Quantitative Aptitude & Reasoning (Sectional timing in SBI/IBPS; NO English in RRB Prelims).',
        'Stage 2 — Mains (200 Marks + Descriptive Essay/Letter for PO): Reasoning & Computer, Data Analysis, General/Banking Awareness, English/Odia.',
        'Stage 3 — Interview (for PO/RRB Scale-I) & Local Odia LPT (exempt if Odia studied in Class 10/12).'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ପ୍ରିଲିମ୍ସ (୧୦୦ ମାର୍କ, ୬୦ ମିନିଟ୍): ଇଂରାଜୀ, ଗଣିତ ଓ ତର୍କଶକ୍ତି (RRB ପ୍ରିଲିମ୍ସରେ ଇଂରାଜୀ ନାହିଁ)।',
        'ପର୍ଯ୍ୟାୟ ୨ — ମେନ୍ସ (୨୦୦ ମାର୍କ): ରିଜନିଂ, ଡାଟା ଆନାଲିସିସ୍, ବ୍ୟାଙ୍କିଂ ସଚେତନତା ଓ ଭାଷା।',
        'ପର୍ଯ୍ୟାୟ ୩ — ସାକ୍ଷାତକାର (PO ପାଇଁ) ଏବଂ ଓଡ଼ିଆ ଭାଷା ପରୀକ୍ଷା (LPT)।'
      ],
      milestones: [
        { step: '1', label_en: 'Speed Math, Puzzles & RC Prelims', label_or: 'ସ୍ପିଡ୍ ଗଣିତ, ପଜଲ୍ ଓ RC ପ୍ରିଲିମ୍ସ' },
        { step: '2', label_en: 'Mains DI + 6-Month Banking Awareness', label_or: 'ମେନ୍ସ DI ଓ ୬ ମାସର ବ୍ୟାଙ୍କିଂ GK' },
        { step: '3', label_en: 'PO Interview & Odia LPT Clearance', label_or: 'PO ଇଣ୍ଟରଭ୍ୟୁ ଓ ଓଡ଼ିଆ LPT' }
      ],
      promotion_ladder_en: [
        'Years 0–4: Probationary Officer (JMGS-I) → Deputy Manager (MMGS-II) via JAIIB/CAIIB.',
        'Years 4–10: Branch Manager (MMGS-III) → Chief Manager (SMGS-IV).',
        'Years 10–15+: Assistant General Manager (AGM, Scale-V) → DGM / GM.'
      ],
      promotion_ladder_or: [
        '୦–୪ ବର୍ଷ: PO (Scale-I) → ଡେପୁଟି ମ୍ୟାନେଜର୍ (Scale-II, JAIIB/CAIIB ସହ)।',
        '୪–୧୦ ବର୍ଷ: ବ୍ରାଞ୍ଚ ମ୍ୟାନେଜର୍ (Scale-III) → ଚିଫ୍ ମ୍ୟାନେଜର୍ (Scale-IV)।',
        '୧୦–୧୫+ ବର୍ଷ: AGM (Scale-V) → DGM / GM।'
      ],
      required_certificates_en: [
        'Graduation Degree & Semester Marksheets (Percentage Calculation Proof)',
        'Class 10 / 12 Marksheet showing Odia as a Subject (for Odisha Circle / RRB LPT Exemption)',
        'Central Format OBC-NCL / SC / ST / EWS / PwBD Certificate',
        'CIBIL Credit History Clearance (Clean Repayment Record for SBI/IBPS Joining)'
      ],
      required_certificates_or: [
        'ସ୍ନାତକ ଡିଗ୍ରୀ ଓ ସମସ୍ତ ସେମିଷ୍ଟର୍ ମାର୍କସିଟ୍',
        'ଓଡ଼ିଆ ବିଷୟ ଥିବା ୧୦ମ/୧୨ଶ ମାର୍କସିଟ୍ (LPT ଛାଡ଼ ପାଇଁ)',
        'କେନ୍ଦ୍ରୀୟ OBC-NCL / SC / ST / EWS ପ୍ରମାଣପତ୍ର',
        'ପରିଷ୍କାର CIBIL କ୍ରେଡିଟ୍ ରିପୋର୍ଟ'
      ],
      roadmap_body_en: '### 6-Month Banking Calendar Strategy\n- Because IBPS RRB, IBPS Clerk/PO, and SBI JA/PO run sequentially from August to March every year, one unified preparation unlocks 6+ exams.\n- Focus heavily on seating arrangements, puzzles, and arithmetic DI for Mains, plus RBI circulars and financial awareness from the last 6 months.',
      roadmap_body_or: '### ୬-ମାସିଆ ବ୍ୟାଙ୍କିଂ ପ୍ରସ୍ତୁତି ରୋଡମ୍ୟାପ୍\n- ଅଗଷ୍ଟରୁ ମାର୍ଚ୍ଚ ମଧ୍ୟରେ IBPS RRB, IBPS ଓ SBI ପରୀକ୍ଷା କ୍ରମାନ୍ୱୟରେ ହୁଏ — ଗୋଟିଏ ପ୍ରସ୍ତୁତିରେ ୬+ ପରୀକ୍ଷା ଦେଇହେବ।\n- ପଜଲ୍, ଡାଟା ଇଣ୍ଟରପ୍ରିଟେସନ୍ ଏବଂ ଗତ ୬ ମାସର ବ୍ୟାଙ୍କିଂ ଓ RBI ସର୍କୁଲାର୍ ଉପରେ ଗୁରୁତ୍ୱ ଦିଅନ୍ତୁ।',
      official_links: [
        { label: 'IBPS Official Portal', url: 'https://www.ibps.in' },
        { label: 'SBI Careers', url: 'https://sbi.co.in/web/careers' }
      ]
    },
    {
      id: 'cso-rm-rbi-nabard-sebi',
      slug: 'rbi-grade-b-nabard-sebi-officer',
      track_slug: 'banking-finance',
      subtrack_slug: 'regulatory-bodies',
      region_scope: 'national-central',
      scope_label_en: 'National / Central',
      scope_label_or: 'ଜାତୀୟ / କେନ୍ଦ୍ରୀୟ',
      career_stage: 'pg-medical',
      stage_tags: ['graduate', 'pg-medical'],
      stage_label_en: 'Graduate / Post-Graduate',
      stage_label_or: 'ସ୍ନାତକ / ସ୍ନାତକୋତ୍ତର',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'RBI Grade B / NABARD Grade A / SEBI Officer (Regulatory Bodies)',
      title_or: 'RBI ଗ୍ରେଡ୍-B / NABARD ଗ୍ରେଡ୍-A / SEBI ଅଫିସର୍ (ନିୟାମକ ସଂସ୍ଥା)',
      summary_en: 'India’s premier financial policy and regulatory officer cadres overseeing monetary policy, rural development (NABARD), and capital markets (SEBI).',
      summary_or: 'ମୁଦ୍ରାନୀତି (RBI), ଗ୍ରାମୀଣ ଓ କୃଷି ବିକାଶ (NABARD) ଏବଂ ପୁଞ୍ଜିବଜାର (SEBI) ରେ ଭାରତର ସର୍ବୋଚ୍ଚ ଆର୍ଥିକ ନିୟାମକ ଅଫିସର୍ କ୍ୟାରିୟର୍।',
      orsp_level: 'Regulatory · ₹55,200–₹78,450 Basic',
      salary_band: '₹55,200 Basic (RBI Gr-B; ~₹1.25–₹1.45L/mo Gross) · ₹44,500 (NABARD/SEBI)',
      salary_band_or: 'RBI ଗ୍ରେଡ୍-B ₹୫୫,୨୦୦ ମୂଳ ବେତନ (~₹୧.୨୫–₹୧.୪୫ ଲକ୍ଷ/ମାସ) · NABARD/SEBI ~₹୧L+',
      pay_allowances_en: 'RBI Grade B: ₹55,200 Basic + DA + Local Allowance + Grade Allowance + Staff Quarters / High Lease (₹1.25–₹1.45L/mo total value) + Education/Briefcase/Fuel Perks. NABARD Grade A & SEBI Grade A offer ~₹1.0–₹1.3L/mo CTC.',
      pay_allowances_or: 'RBI ଗ୍ରେଡ୍-B ରେ ₹୫୫,୨୦୦ ମୂଳ ବେତନ + DA + ସରକାରୀ କ୍ୱାର୍ଟର୍ସ/ଲିଜ୍ (~₹୧.୨୫–₹୧.୪୫ ଲକ୍ଷ/ମାସ) ଏବଂ NABARD/SEBI ରେ ~₹୧.୦–₹୧.୩ ଲକ୍ଷ/ମାସ।',
      eligibility_summary: 'RBI Gr-B: Graduation (60% UR, 50% SC/ST/PwBD); NABARD Gr-A: Graduation/Agri/Finance; SEBI Gr-A: PG / CA / B.Tech / LLB.',
      eligibility_summary_or: 'RBI ଗ୍ରେଡ୍-B: ସ୍ନାତକ (୬୦% UR); NABARD ଗ୍ରେଡ୍-A: ସ୍ନାତକ/କୃଷି/ଅର୍ଥନୀତି; SEBI ଗ୍ରେଡ୍-A: ସ୍ନାତକୋତ୍ତର / CA / B.Tech / LLB।',
      age_window_en: '21–30 yrs (UR) · +3 yrs OBC-NCL · +5 yrs SC/ST · +2/+4 yrs M.Phil/Ph.D (RBI).',
      age_window_or: '୨୧–୩୦ ବର୍ଷ (UR) · OBC +୩ ବର୍ଷ · SC/ST +୫ ବର୍ଷ · M.Phil/Ph.D ଅତିରିକ୍ତ ଛାଡ଼।',
      key_exams: 'RBI Grade B (Phase I + Phase II ESI/FM/Eng + Interview) · NABARD Grade A · SEBI Grade A',
      selection_stages_en: [
        'Stage 1 — Phase I Objective Screening (GA, Quant, Reasoning, English; plus ESI & ARD in NABARD or Commerce/Costing in SEBI).',
        'Stage 2 — Phase II (Objective + Typed Descriptive Papers): Economic & Social Issues (ESI), Finance & Management (FM) / ARD, and English Descriptive.',
        'Stage 3 — Psychometric Assessment & High-Level Panel Interview (75 Marks).'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ଫେଜ୍-୧ ଅବଜେକ୍ଟିଭ୍ ପରୀକ୍ଷା (GA, ଗଣିତ, ରିଜନିଂ, ଇଂରାଜୀ + ESI/ARD/କମର୍ସ)।',
        'ପର୍ଯ୍ୟାୟ ୨ — ଫେଜ୍-୨ (ଅବଜେକ୍ଟିଭ୍ + ଟାଇପିଂ ବର୍ଣ୍ଣନାତ୍ମକ): ESI, ଫାଇନାନ୍ସ ଓ ମ୍ୟାନେଜମେଣ୍ଟ ଏବଂ ଇଂରାଜୀ।',
        'ପର୍ଯ୍ୟାୟ ୩ — ସାଇକୋମେଟ୍ରିକ୍ ଟେଷ୍ଟ ଓ ପ୍ୟାନେଲ୍ ସାକ୍ଷାତକାର।'
      ],
      milestones: [
        { step: '1', label_en: 'Phase I Cutoff + RBI/PIB Reports', label_or: 'ଫେଜ୍-୧ + RBI ଓ PIB ରିପୋର୍ଟ' },
        { step: '2', label_en: 'ESI, Finance & Typed Descriptive Drills', label_or: 'ESI, ଫାଇନାନ୍ସ ଓ ଟାଇପିଂ ଅଭ୍ୟାସ' },
        { step: '3', label_en: 'Bio-Data & Policy Panel Interview', label_or: 'ବାୟୋ-ଡାଟା ଓ ନୀତିଗତ ଇଣ୍ଟରଭ୍ୟୁ' }
      ],
      promotion_ladder_en: [
        'Years 0–5: Manager (Grade B) / Assistant Manager (Grade A).',
        'Years 5–10: Assistant General Manager (Grade C) → Deputy General Manager (Grade D).',
        'Years 10–15+: General Manager (Grade E) → Chief General Manager (CGM) / Executive Director.'
      ],
      promotion_ladder_or: [
        '୦–୫ ବର୍ଷ: ମ୍ୟାନେଜର୍ (ଗ୍ରେଡ୍ B) / ଆସିଷ୍ଟାଣ୍ଟ ମ୍ୟାନେଜର୍ (ଗ୍ରେଡ୍ A)।',
        '୫–୧୦ ବର୍ଷ: AGM (ଗ୍ରେଡ୍ C) → DGM (ଗ୍ରେଡ୍ D)।',
        '୧୦–୧୫+ ବର୍ଷ: GM (ଗ୍ରେଡ୍ E) → CGM / କାର୍ଯ୍ୟନିର୍ବାହୀ ନିର୍ଦ୍ଦେଶକ।'
      ],
      required_certificates_en: [
        'Graduation / Post-Graduation Degree & Percentage Equivalency Certificate',
        'Central OBC-NCL / SC / ST / EWS / PwBD Certificate',
        'Typing Speed Practice (40+ WPM for Phase II Descriptive Keyboard Exam)',
        'Experience Proof (if claiming age relaxation / specialist stream)'
      ],
      required_certificates_or: [
        'ସ୍ନାତକ / ସ୍ନାତକୋତ୍ତର ଡିଗ୍ରୀ ଓ ମାର୍କସିଟ୍',
        'କେନ୍ଦ୍ରୀୟ OBC-NCL / SC / ST / EWS ପ୍ରମାଣପତ୍ର',
        'ଫେଜ୍-୨ ପାଇଁ ୪୦+ WPM ଟାଇପିଂ ଅଭ୍ୟାସ',
        'ଅଭିଜ୍ଞତା ପ୍ରମାଣପତ୍ର (ଯଦି ପ୍ରଯୁଜ୍ୟ)'
      ],
      roadmap_body_en: '### Regulatory Officer Roadmap\n- Read RBI Annual Report, Union Budget, Economic Survey, and PIB Finance/Agriculture releases religiously.\n- Practice keyboard typing of 400–600 word structured answers for Phase II ESI and Finance & Management.\n- Agriculture & Rural Development (ARD) in NABARD Grade A gives OUAT and Odisha agri graduates a strong edge.',
      roadmap_body_or: '### ନିୟାମକ ଅଫିସର୍ ପ୍ରସ୍ତୁତି\n- RBI ବାର୍ଷିକ ରିପୋର୍ଟ, କେନ୍ଦ୍ର ବଜେଟ୍, ଅର୍ଥନୈତିକ ସର୍ବେକ୍ଷଣ ଓ PIB ନିୟମିତ ପଢ଼ନ୍ତୁ।\n- ଫେଜ୍-୨ ପାଇଁ କିବୋର୍ଡରେ ୪୦୦–୬୦୦ ଶବ୍ଦର ଉତ୍ତର ଟାଇପିଂ ଅଭ୍ୟାସ କରନ୍ତୁ।\n- NABARD ଗ୍ରେଡ୍-A ର ARD ବିଭାଗରେ ଓଡ଼ିଶାର କୃଷି ସ୍ନାତକଙ୍କ ପାଇଁ ବିଶେଷ ସୁବିଧା ରହିଛି।',
      official_links: [
        { label: 'RBI Opportunities', url: 'https://opportunities.rbi.org.in' },
        { label: 'NABARD Careers', url: 'https://www.nabard.org' },
        { label: 'SEBI Careers', url: 'https://www.sebi.gov.in' }
      ]
    },
    {
      id: 'cso-rm-oscb-dccb',
      slug: 'oscb-dccb-assistant-manager-clerk',
      track_slug: 'banking-finance',
      subtrack_slug: 'state-cooperative-bank',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'graduate',
      stage_tags: ['graduate'],
      stage_label_en: 'Graduate',
      stage_label_or: 'ସ୍ନାତକ',
      featured: 0,
      status: 'published',
      is_builtin: true,
      title_en: 'Odisha State Cooperative Bank (OSCB) & DCCB Assistant Manager / Banking Assistant',
      title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସମବାୟ ବ୍ୟାଙ୍କ (OSCB) ଓ DCCB ଆସିଷ୍ଟାଣ୍ଟ ମ୍ୟାନେଜର୍ / ବ୍ୟାଙ୍କିଂ ଆସିଷ୍ଟାଣ୍ଟ',
      summary_en: 'Home-state banking career posted strictly inside Odisha across OSCB Headquarters (Bhubaneswar) and 17 District Central Cooperative Banks (DCCBs).',
      summary_or: 'ଓଡ଼ିଶା ଭିତରେ ସ୍ଥାୟୀ ପୋଷ୍ଟିଂ — ଭୁବନେଶ୍ୱର OSCB ମୁଖ୍ୟାଳୟ ଏବଂ ୧୭ଟି ଜିଲ୍ଲା କେନ୍ଦ୍ରୀୟ ସମବାୟ ବ୍ୟାଙ୍କ (DCCB) ରେ ବ୍ୟାଙ୍କିଂ କ୍ୟାରିୟର୍।',
      orsp_level: 'Co-op Pay · ₹35,400 AM / ₹21,700 BA',
      salary_band: 'Assistant Manager Gr-II ₹35,400 Basic · Banking Assistant Gr-II ₹21,700 Basic',
      salary_band_or: 'ଆସିଷ୍ଟାଣ୍ଟ ମ୍ୟାନେଜର୍ ₹୩୫,୪୦୦ · ବ୍ୟାଙ୍କିଂ ଆସିଷ୍ଟାଣ୍ଟ ₹୨୧,୭୦୦ + DA/HRA',
      pay_allowances_en: 'OSCB / DCCB State Cooperative Pay Matrix aligned with ORSP: Assistant Manager Grade-II (₹35,400–₹1,12,400) and Banking Assistant Grade-II (₹21,700–₹69,100) + State DA, HRA, Medical & Home-District Posting Stability.',
      pay_allowances_or: 'ORSP ଅନୁଯାୟୀ OSCB/DCCB ବେତନ: ଆସିଷ୍ଟାଣ୍ଟ ମ୍ୟାନେଜର୍ (₹୩୫,୪୦୦–₹୧,୧୨,୪୦୦) ଓ ବ୍ୟାଙ୍କିଂ ଆସିଷ୍ଟାଣ୍ଟ (₹୨୧,୭୦୦–₹୬୯,୧୦୦) + ରାଜ୍ୟ DA, HRA ଓ ନିଜ ଜିଲ୍ଲାରେ ପୋଷ୍ଟିଂ ସୁବିଧା।',
      eligibility_summary: 'Graduation in any discipline + Odia pass at HSC/ME + Proficiency in Computer Applications. Age: 21–32 yrs.',
      eligibility_summary_or: 'ସ୍ନାତକ ଡିଗ୍ରୀ + HSC/ME ରେ ଓଡ଼ିଆ ପାସ୍ + କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା। ବୟସ: ୨୧–୩୨ ବର୍ଷ।',
      age_window_en: '21 to 32 years (UR) · +5 yrs SC/ST/SEBC/Women · +10 yrs PwBD.',
      age_window_or: '୨୧ ରୁ ୩୨ ବର୍ଷ (UR) · SC/ST/SEBC/ମହିଳା +୫ ବର୍ଷ · PwBD +୧୦ ବର୍ଷ।',
      key_exams: 'OSCB / RCS Odisha Recruitment Exam (IBPS Conducted Prelims + Mains)',
      selection_stages_en: [
        'Stage 1 — Online Preliminary Exam (100 Marks, 60 Mins): English, Numerical Ability & Reasoning.',
        'Stage 2 — Online Main Exam (160 Marks, 120 Mins): General/Financial Awareness, English, Reasoning, Quantitative Aptitude & Computer.',
        'Stage 3 — Merit Selection & Document Verification by Registrar of Cooperative Societies (RCS) Odisha / DCCB.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ଅନଲାଇନ୍ ପ୍ରିଲିମ୍ସ (୧୦୦ ମାର୍କ): ଇଂରାଜୀ, ଗଣିତ ଓ ତର୍କଶକ୍ତି।',
        'ପର୍ଯ୍ୟାୟ ୨ — ଅନଲାଇନ୍ ମେନ୍ସ (୧୬୦ ମାର୍କ): ବ୍ୟାଙ୍କିଂ ସଚେତନତା, ଇଂରାଜୀ, ରିଜନିଂ, ଗଣିତ ଓ କମ୍ପ୍ୟୁଟର।',
        'ପର୍ଯ୍ୟାୟ ୩ — ମେଧା ତାଲିକା ଓ RCS ଓଡ଼ିଶା / DCCB ଦ୍ୱାରା ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ।'
      ],
      milestones: [
        { step: '1', label_en: 'IBPS Clerk-Level Prelims Speed', label_or: 'IBPS କ୍ଲର୍କ ସ୍ତରର ପ୍ରିଲିମ୍ସ ସ୍ପିଡ୍' },
        { step: '2', label_en: 'Odisha Cooperative & Rural Credit GA', label_or: 'ଓଡ଼ିଶା ସମବାୟ ଓ ଗ୍ରାମୀଣ ବ୍ୟାଙ୍କିଂ GK' },
        { step: '3', label_en: 'DCCB Allocation & Joining', label_or: 'DCCB ନିଯୁକ୍ତି ଓ ଯୋଗଦାନ' }
      ],
      promotion_ladder_en: [
        'Years 0–5: Banking Assistant Gr-II → Assistant Manager Gr-II.',
        'Years 5–12: Branch Manager / Manager (Grade-I) across District DCCB Branches.',
        'Years 12–18+: Deputy General Manager / Chief Executive Officer (CEO) of DCCB.'
      ],
      promotion_ladder_or: [
        '୦–୫ ବର୍ଷ: ବ୍ୟାଙ୍କିଂ ଆସିଷ୍ଟାଣ୍ଟ → ଆସିଷ୍ଟାଣ୍ଟ ମ୍ୟାନେଜର୍।',
        '୫–୧୨ ବର୍ଷ: ବ୍ରାଞ୍ଚ ମ୍ୟାନେଜର୍ / ମ୍ୟାନେଜର୍ (ଗ୍ରେଡ୍-୧)।',
        '୧୨–୧୮+ ବର୍ଷ: ଡେପୁଟି ଜେନେରାଲ୍ ମ୍ୟାନେଜର୍ / DCCB CEO।'
      ],
      required_certificates_en: [
        'Graduation Certificate & Marksheets',
        'Odia Language Pass Certificate (Class 10 / ME)',
        'Computer Application Certificate (PGDCA / DCA)',
        'Odisha Resident & Caste / SEBC / PwBD Certificate'
      ],
      required_certificates_or: [
        'ସ୍ନାତକ ପ୍ରମାଣପତ୍ର ଓ ମାର୍କସିଟ୍',
        'ଓଡ଼ିଆ ଭାଷା ପାସ୍ ସାର୍ଟିଫିକେଟ୍',
        'PGDCA / DCA କମ୍ପ୍ୟୁଟର ସାର୍ଟିଫିକେଟ୍',
        'ଓଡ଼ିଶା ବାସିନ୍ଦା ଓ ଜାତି/SEBC ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### OSCB & DCCB Preparation Guide\n- The exam is conducted on the IBPS pattern, so practicing IBPS Clerk & RRB PO mock tests directly prepares you for OSCB/DCCB.\n- Add Odisha Cooperative Societies Act basics, PACS digitalization, and NABARD refinance schemes to your Mains GA notes.',
      roadmap_body_or: '### OSCB ଓ DCCB ପ୍ରସ୍ତୁତି ମାର୍ଗଦର୍ଶିକା\n- IBPS ଢାଞ୍ଚାରେ ପରୀକ୍ଷା ହେଉଥିବାରୁ IBPS କ୍ଲର୍କ ଓ RRB ମକ୍ ଟେଷ୍ଟ ଅଭ୍ୟାସ କରନ୍ତୁ।\n- ମେନ୍ସ ପାଇଁ ଓଡ଼ିଶା ସମବାୟ ସମିତି, PACS ଡିଜିଟାଲାଇଜେସନ୍ ଓ NABARD ଯୋଜନା ବିଷୟରେ ପଢ଼ନ୍ତୁ।',
      official_links: [
        { label: 'OSCB Official Portal', url: 'https://odishascb.com' },
        { label: 'RCS Odisha Cooperative Dept', url: 'https://rcsodisha.nic.in' }
      ]
    },

    /* ================================================================
     * TRACK 4: HEALTHCARE (3 Roadmaps)
     * ================================================================ */
    {
      id: 'cso-rm-opsc-medical-officer',
      slug: 'opsc-medical-officer-omhs-dental',
      track_slug: 'healthcare',
      subtrack_slug: 'medical-dental',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'pg-medical',
      stage_tags: ['pg-medical'],
      stage_label_en: 'Post-Graduate / Medical',
      stage_label_or: 'MBBS / BDS / ମେଡିକାଲ୍',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'OPSC Medical Officer (OMHS Cadre) & Dental Surgeon',
      title_or: 'OPSC ମେଡିକାଲ୍ ଅଫିସର୍ (OMHS କ୍ୟାଡର୍) ଓ ଡେଣ୍ଟାଲ୍ ସର୍ଜନ୍',
      summary_en: 'Permanent Group-A Odisha Medical & Health Services (OMHS) doctor cadre with KBK/V-1 to V-4 rural incentives and PG in-service quota benefits.',
      summary_or: 'ସ୍ଥାୟୀ Group-A ଓଡ଼ିଶା ମେଡିକାଲ୍ ଓ ସ୍ୱାସ୍ଥ୍ୟ ସେବା (OMHS) ଡାକ୍ତର କ୍ୟାଡର୍ — ଗ୍ରାମାଞ୍ଚଳ ପ୍ରୋତ୍ସାହନ ଭତ୍ତା ଓ PG ଇନ୍-ସର୍ଭିସ୍ କୋଟା ସୁବିଧା ସହିତ।',
      orsp_level: 'ORSP L-12 · ₹56,100 + NPA + Rural Incentive',
      salary_band: 'ORSP L-12 (₹56,100 Basic + DA + HRA + KBK/Rural Place-Based Incentive)',
      salary_band_or: 'ORSP L-12 (₹୫୬,୧୦୦ + DA + HRA + ଗ୍ରାମାଞ୍ଚଳ/KBK ପ୍ରୋତ୍ସାହନ ଭତ୍ତା)',
      pay_allowances_en: 'ORSP Level-12 (₹56,100–₹1,77,500) + DA + HRA + Place-Based Vulnerability Incentive (V1–V4 / KBK districts up to ₹20k–₹40k/mo) + Higher Pay on PG completion + In-Service NEET-PG Weightage.',
      pay_allowances_or: 'ORSP L-12 (₹୫୬,୧୦୦–₹୧,୭୭,୫୦୦) + DA + HRA + V1–V4/KBK ଗ୍ରାମାଞ୍ଚଳ ପ୍ରୋତ୍ସାହନ ଭତ୍ତା + NEET-PG ଇନ୍-ସର୍ଭିସ୍ ୱେଟେଜ୍।',
      eligibility_summary: 'MBBS (OMHS MO) or BDS (Dental Surgeon) + Permanent Odisha Medical / Dental Council Registration + Odia proficiency.',
      eligibility_summary_or: 'MBBS (OMHS MO) କିମ୍ବା BDS (ଡେଣ୍ଟାଲ୍ ସର୍ଜନ୍) + ଓଡ଼ିଶା ମେଡିକାଲ୍/ଡେଣ୍ଟାଲ୍ କାଉନସିଲ୍ ପଞ୍ଜୀକରଣ + ଓଡ଼ିଆ ଜ୍ଞାନ।',
      age_window_en: '21–38 yrs (UR) · +5 yrs SC/ST/SEBC/Women · Extra age relaxation for NHM/Contractual Odisha doctors.',
      age_window_or: '୨୧–୩୮ ବର୍ଷ (UR) · SC/ST/SEBC/ମହିଳା +୫ ବର୍ଷ · NHM/ଚୁକ୍ତିଭିତ୍ତିକ ଡାକ୍ତରଙ୍କ ପାଇଁ ଅତିରିକ୍ତ ବୟସ ଛାଡ଼।',
      key_exams: 'OPSC Medical Officer (Assistant Surgeon) Written MCQ Exam (200 Questions, 200 Marks, No Negative Marking)',
      selection_stages_en: [
        'Stage 1 — OPSC Single-Paper Written MCQ Exam (200 Marks, 3 Hours: Pre-Clinical, Para-Clinical & Clinical MBBS/BDS Subjects).',
        'Stage 2 — Merit List with Contractual Service Weightage (1%–5% per year for NHM/State Govt doctors, as notified).',
        'Stage 3 — Document Verification at OPSC Cuttack & Counseling for PHC/CHC/DHH Posting.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — OPSC ଲିଖିତ MCQ ପରୀକ୍ଷା (୨୦୦ ମାର୍କ, ୩ ଘଣ୍ଟା: MBBS/BDS ବିଷୟ)।',
        'ପର୍ଯ୍ୟାୟ ୨ — ମେଧା ତାଲିକା (ଚୁକ୍ତିଭିତ୍ତିକ ଡାକ୍ତରଙ୍କ ଅଭିଜ୍ଞତା ୱେଟେଜ୍ ସହିତ)।',
        'ପର୍ଯ୍ୟାୟ ୩ — Cuttack OPSC ରେ ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ ଓ PHC/CHC/DHH ପୋଷ୍ଟିଂ।'
      ],
      milestones: [
        { step: '1', label_en: 'OMRC / OSDC Registration & Internship', label_or: 'OMRC / OSDC ପଞ୍ଜୀକରଣ ଓ ଇଣ୍ଟର୍ନସିପ୍' },
        { step: '2', label_en: 'Clinical & PSM High-Yield OPSC MCQ Prep', label_or: 'କ୍ଲିନିକାଲ୍ ଓ PSM MCQ ଅଭ୍ୟାସ' },
        { step: '3', label_en: 'OPSC Merit & OMHS Posting Counseling', label_or: 'OPSC ମେଧା ଓ OMHS ପୋଷ୍ଟିଂ' }
      ],
      promotion_ladder_en: [
        'Years 0–5: Assistant Surgeon / Medical Officer (Group-A Junior Branch, ORSP L-12).',
        'Years 5–11: Senior Medical Officer / Specialist (DACP Time-Bound Scale L-13/L-14).',
        'Years 11–18+: Additional DMO / Chief District Medical & Public Health Officer (CDM&PHO, L-15/L-16).'
      ],
      promotion_ladder_or: [
        '୦–୫ ବର୍ଷ: ଆସିଷ୍ଟାଣ୍ଟ ସର୍ଜନ୍ / ମେଡିକାଲ୍ ଅଫିସର୍ (L-12)।',
        '୫–୧୧ ବର୍ଷ: ସିନିୟର MO / ସ୍ପେଶାଲିଷ୍ଟ (DACP L-13/14)।',
        '୧୧–୧୮+ ବର୍ଷ: ADMO / CDM&PHO (L-15/16)।'
      ],
      required_certificates_en: [
        'MBBS / BDS Degree + Compulsory Rotating Internship Completion Certificate',
        'Valid Permanent Registration with Odisha Council of Medical Registration (OCMR) / OSDC',
        'HSC Certificate & Odia Pass Proof',
        'NHM / Contractual Experience Certificate (if claiming weightage)'
      ],
      required_certificates_or: [
        'MBBS / BDS ଡିଗ୍ରୀ ଓ ଇଣ୍ଟର୍ନସିପ୍ ସମାପ୍ତି ପ୍ରମାଣପତ୍ର',
        'ଓଡ଼ିଶା ମେଡିକାଲ୍/ଡେଣ୍ଟାଲ୍ କାଉନସିଲ୍ ସ୍ଥାୟୀ ପଞ୍ଜୀକରଣ',
        'ଦଶମ ଓ ଓଡ଼ିଆ ପାସ୍ ପ୍ରମାଣପତ୍ର',
        'NHM/ଚୁକ୍ତିଭିତ୍ତିକ ଅଭିଜ୍ଞତା ପ୍ରମାଣପତ୍ର (ଯଦି ଥାଏ)'
      ],
      roadmap_body_en: '### OMHS Medical Officer Strategy\n- High-yield subjects for OPSC MO: PSM/Community Medicine (National Health Programmes & Odisha schemes), Medicine, Surgery, OBG, Pediatrics, and Pharmacology.\n- Keep your OCMR renewal active before the application closing date — expired registration is a common rejection cause.',
      roadmap_body_or: '### OMHS ମେଡିକାଲ୍ ଅଫିସର୍ କୌଶଳ\n- PSM, ମେଡିସିନ୍, ସର୍ଜରୀ, OBG, ଶିଶୁରୋଗ ଓ ଫାର୍ମାକୋଲୋଜି ଉପରେ ବିଶେଷ ଗୁରୁତ୍ୱ ଦିଅନ୍ତୁ।\n- ଆବେଦନର ଶେଷ ତାରିଖ ପୂର୍ବରୁ OCMR ପଞ୍ଜୀକରଣ ବୈଧ ଥିବା ନିଶ୍ଚିତ କରନ୍ତୁ।',
      official_links: [
        { label: 'OPSC Medical Recruitment', url: 'https://www.opsc.gov.in' },
        { label: 'Health & Family Welfare Odisha', url: 'https://health.odisha.gov.in' }
      ]
    },
    {
      id: 'cso-rm-osssc-nursing-paramed',
      slug: 'osssc-nursing-pharmacist-paramedical',
      track_slug: 'healthcare',
      subtrack_slug: 'nursing-paramedical',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'diploma-btech',
      stage_tags: ['after-10th-12th', 'diploma-btech', 'graduate'],
      stage_label_en: 'After +2 · Diploma / B.Sc.',
      stage_label_or: '+୨ / ଡିପ୍ଲୋମା / B.Sc.',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'OSSSC Nursing Officer, Pharmacist, Radiographer & Lab Technician',
      title_or: 'OSSSC ନର୍ସିଂ ଅଫିସର୍, ଫାର୍ମାସିଷ୍ଟ, ରେଡିଓଗ୍ରାଫର୍ ଓ ଲ୍ୟାବ୍ ଟେକ୍ନିସିଆନ୍',
      summary_en: 'Large-scale district cadre healthcare recruitment across 30 Odisha DHHs, Medical Colleges (SCB/MKCG/VIMSAR), CHCs, and PHCs.',
      summary_or: 'ଓଡ଼ିଶାର ୩୦ ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ (DHH), ମେଡିକାଲ୍ କଲେଜ (SCB/MKCG/VIMSAR), CHC ଓ PHC ରେ ନର୍ସିଂ ଓ ପାରାମେଡିକାଲ୍ ନିଯୁକ୍ତି।',
      orsp_level: 'ORSP L-7 to L-8 · ₹25,500–₹29,200',
      salary_band: 'ORSP L-8 (₹29,200 Nursing Officer) · L-7 (₹25,500 Pharmacist/LT/Radiographer)',
      salary_band_or: 'ORSP L-8 (₹୨୯,୨୦୦ ନର୍ସିଂ ଅଫିସର୍) · L-7 (₹୨୫,୫୦୦ ଫାର୍ମାସିଷ୍ଟ/LT/ରେଡିଓଗ୍ରାଫର୍)',
      pay_allowances_en: 'ORSP Level-8 (₹29,200–₹92,300) for Nursing Officer; Level-7 (₹25,500–₹81,100) for Pharmacist, Radiographer & Laboratory Technician (LT); Level-5 (₹21,700) for MPHW(F/M) + DA, HRA, Uniform & Washing Allowance.',
      pay_allowances_or: 'ନର୍ସିଂ ଅଫିସର୍ ପାଇଁ L-8 (₹୨୯,୨୦୦) ଏବଂ ଫାର୍ମାସିଷ୍ଟ, ରେଡିଓଗ୍ରାଫର୍ ଓ LT ପାଇଁ L-7 (₹୨୫,୫୦୦) + DA, HRA ଓ ୟୁନିଫର୍ମ ଭତ୍ତା।',
      eligibility_summary: '+2 Science + GNM / B.Sc. Nursing (ONMRC), D.Pharm / B.Pharm (OSPC), DMLT / DMRT + Odisha Paramedical Council Registration.',
      eligibility_summary_or: '+୨ ବିଜ୍ଞାନ + GNM/B.Sc. Nursing (ONMRC), D.Pharm/B.Pharm (OSPC) କିମ୍ବା DMLT/DMRT + ଓଡ଼ିଶା କାଉନସିଲ୍ ପଞ୍ଜୀକରଣ।',
      age_window_en: '21–38 yrs (UR) · +5 yrs SC/ST/SEBC/Women · Extra contractual weightage for COVID/NHM staff.',
      age_window_or: '୨୧–୩୮ ବର୍ଷ (UR) · SC/ST/SEBC/ମହିଳା +୫ ବର୍ଷ · NHM/ଚୁକ୍ତିଭିତ୍ତିକ କର୍ମଚାରୀଙ୍କ ପାଇଁ ଅତିରିକ୍ତ ୱେଟେଜ୍।',
      key_exams: 'OSSSC Nursing Officer / Pharmacist / LT / Radiographer / MPHW Written Exam (100 Marks)',
      selection_stages_en: [
        'Stage 1 — Written MCQ Exam (100 Marks, 2 Hours): 60M Core Professional Syllabus + 25M Practical Skill Scenarios + 10M Arithmetic + 5M English (0.25 negative).',
        'Stage 2 — Addition of Contractual Experience Marks (for eligible Odisha Govt / NHM staff).',
        'Stage 3 — District / Medical College Preference Allocation & Certificate Verification.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ଲିଖିତ MCQ ପରୀକ୍ଷା (୧୦୦ ମାର୍କ): ୬୦ କୋର୍ ବିଷୟ + ୨୫ ପ୍ରାକ୍ଟିକାଲ୍ + ୧୦ ଗଣିତ + ୫ ଇଂରାଜୀ।',
        'ପର୍ଯ୍ୟାୟ ୨ — ଚୁକ୍ତିଭିତ୍ତିକ ଅଭିଜ୍ଞତା ମାର୍କ ଯୋଗ।',
        'ପର୍ଯ୍ୟାୟ ୩ — ଜିଲ୍ଲା / ମେଡିକାଲ୍ କଲେଜ୍ ଆବଣ୍ଟନ ଓ ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ।'
      ],
      milestones: [
        { step: '1', label_en: 'GNM/D.Pharm/DMLT + State Council Regn', label_or: 'ଡିପ୍ଲୋମା/ଡିଗ୍ରୀ ଓ ରାଜ୍ୟ କାଉନସିଲ୍ ପଞ୍ଜୀକରଣ' },
        { step: '2', label_en: 'Core Clinical + Practical Scenario MCQs', label_or: 'କୋର୍ କ୍ଲିନିକାଲ୍ ଓ ପ୍ରାକ୍ଟିକାଲ୍ MCQ' },
        { step: '3', label_en: 'OSSSC Merit & District Joining', label_or: 'OSSSC ମେଧା ଓ ଜିଲ୍ଲା ଯୋଗଦାନ' }
      ],
      promotion_ladder_en: [
        'Years 0–6: Nursing Officer / Pharmacist / LT (ORSP L-7 to L-8).',
        'Years 6–12: Senior Nursing Officer / Chief Pharmacist / Senior Technical Assistant (ORSP L-9 to L-10).',
        'Years 12–18+: Assistant Nursing Superintendent / Matron / District Technical Supervisor (ORSP L-11).'
      ],
      promotion_ladder_or: [
        '୦–୬ ବର୍ଷ: ନର୍ସିଂ ଅଫିସର୍ / ଫାର୍ମାସିଷ୍ଟ / LT (L-7/L-8)।',
        '୬–୧୨ ବର୍ଷ: ସିନିୟର ନର୍ସିଂ ଅଫିସର୍ / ଚିଫ୍ ଫାର୍ମାସିଷ୍ଟ (L-9/10)।',
        '୧୨–୧୮+ ବର୍ଷ: ଆସିଷ୍ଟାଣ୍ଟ ନର୍ସିଂ ସୁପରିଣ୍ଟେଣ୍ଡେଣ୍ଟ / ମ୍ୟାଟ୍ରନ୍ (L-11)।'
      ],
      required_certificates_en: [
        '10th, +2 Science & GNM / B.Sc. Nursing / D.Pharm / DMLT / DMRT Marksheets',
        'Valid Odisha Nursing (ONMRC) / Pharmacy (OSPC) / Allied Medical Council Registration',
        'Odia Pass Certificate & Odisha Resident / Caste / SEBC Certificate',
        'Contractual Experience Certificate (countersigned by CDM&PHO / Dean)'
      ],
      required_certificates_or: [
        '୧୦ମ, +୨ ବିଜ୍ଞାନ ଓ GNM/B.Sc./D.Pharm/DMLT ପ୍ରମାଣପତ୍ର',
        'ବୈଧ ଓଡ଼ିଶା ନର୍ସିଂ/ଫାର୍ମାସୀ/ପାରାମେଡିକାଲ୍ କାଉନସିଲ୍ ପଞ୍ଜୀକରଣ',
        'ଓଡ଼ିଆ ପାସ୍ ଓ ବାସିନ୍ଦା/ଜାତି ପ୍ରମାଣପତ୍ର',
        'CDM&PHO ଙ୍କ ଦ୍ୱାରା ପ୍ରମାଣିତ ଅଭିଜ୍ଞତା ସାର୍ଟିଫିକେଟ୍'
      ],
      roadmap_body_en: '### OSSSC Healthcare Cadre Playbook\n- Since 85 of 100 marks come directly from your professional curriculum and hospital practicals, revise standard GNM/D.Pharm/DMLT textbooks thoroughly.\n- Pair state OSSSC prep with AIIMS NORCET / ESIC / Railway Nursing & Pharmacist openings for nationwide opportunities.',
      roadmap_body_or: '### OSSSC ସ୍ୱାସ୍ଥ୍ୟ କ୍ୟାଡର୍ ପ୍ରସ୍ତୁତି\n- ୧୦୦ ରୁ ୮୫ ମାର୍କ ନିଜ ବିଷୟ ଓ ହସ୍ପିଟାଲ୍ ପ୍ରାକ୍ଟିକାଲ୍ ରୁ ଆସୁଥିବାରୁ GNM/D.Pharm/DMLT ପାଠ୍ୟପୁସ୍ତକ ଭଲ ଭାବେ ରିଭିଜନ୍ କରନ୍ତୁ।\n- ଏହା ସହ AIIMS NORCET ଓ ରେଳବାଇ ନର୍ସିଂ/ଫାର୍ମାସିଷ୍ଟ ପରୀକ୍ଷା ପାଇଁ ମଧ୍ୟ ପ୍ରସ୍ତୁତ ହୁଅନ୍ତୁ।',
      official_links: [
        { label: 'OSSSC Official Portal', url: 'https://www.osssc.gov.in' },
        { label: 'ONMRC Odisha Nursing Council', url: 'https://onmrc.odisha.gov.in' }
      ]
    },
    {
      id: 'cso-rm-ayush-nhm-cho',
      slug: 'opsc-ayush-mo-nhm-odisha-cho',
      track_slug: 'healthcare',
      subtrack_slug: 'ayush-cho',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'pg-medical',
      stage_tags: ['graduate', 'pg-medical'],
      stage_label_en: 'BAMS / BHMS / B.Sc. Nursing',
      stage_label_or: 'BAMS / BHMS / B.Sc. ନର୍ସିଂ',
      featured: 0,
      status: 'published',
      is_builtin: true,
      title_en: 'OPSC Ayurvedic / Homoeopathic MO (AYUSH) & NHM Odisha CHO',
      title_or: 'OPSC ଆୟୁର୍ବେଦିକ / ହୋମିଓପାଥିକ MO (AYUSH) ଏବଂ NHM ଓଡ଼ିଶା CHO',
      summary_en: 'Permanent OPSC Group-B AYUSH Medical Officer cadre and NHM Odisha Community Health Officer (CHO) leadership roles at Ayushman Arogya Mandirs.',
      summary_or: 'ସ୍ଥାୟୀ OPSC Group-B ଆୟୁଷ ମେଡିକାଲ୍ ଅଫିସର୍ ଏବଂ ଆୟୁଷ୍ମାନ ଆରୋଗ୍ୟ ମନ୍ଦିରରେ NHM ଓଡ଼ିଶା କମ୍ୟୁନିଟି ହେଲ୍ଥ ଅଫିସର୍ (CHO) କ୍ୟାରିୟର୍।',
      orsp_level: 'ORSP L-10 ₹44,900 · CHO ₹40,000',
      salary_band: 'ORSP L-10 (₹44,900 OPSC AYUSH MO) · ₹25,000 + ₹15,000 PBI (NHM CHO)',
      salary_band_or: 'ORSP L-10 (₹୪୪,୯୦୦ OPSC AYUSH MO) · ₹୨୫,୦୦୦ + ₹୧୫,୦୦୦ PBI (NHM CHO)',
      pay_allowances_en: 'OPSC Ayurvedic / Homoeopathic MO: ORSP Level-10 (₹44,900–₹1,42,400) + State DA, HRA & Govt Pension/NPS. NHM Odisha CHO: ₹25,000 fixed remuneration + up to ₹15,000 Performance-Based Incentive (PBI) = ₹40,000/mo + annual increment.',
      pay_allowances_or: 'OPSC ଆୟୁଷ MO ପାଇଁ ORSP L-10 (₹୪୪,୯୦୦) + DA/HRA ଏବଂ NHM CHO ପାଇଁ ₹୨୫,୦୦୦ + ₹୧୫,୦୦୦ ପ୍ରୋତ୍ସାହନ (ମୋଟ ₹୪୦,୦୦୦/ମାସ)।',
      eligibility_summary: 'BAMS / BHMS + State AYUSH Registration for OPSC MO; B.Sc. Nursing (with Integrated CPCH) / GNM + Bridge Course for NHM CHO.',
      eligibility_summary_or: 'OPSC MO ପାଇଁ BAMS/BHMS + ରାଜ୍ୟ ପଞ୍ଜୀକରଣ; NHM CHO ପାଇଁ B.Sc. Nursing (CPCH) / GNM।',
      age_window_en: '21–38 yrs (OPSC AYUSH MO) · 21–40 yrs (NHM Odisha CHO, +5 yrs SC/ST/SEBC/Women).',
      age_window_or: '୨୧–୩୮ ବର୍ଷ (OPSC AYUSH MO) · ୨୧–୪୦ ବର୍ଷ (NHM CHO, +୫ ବର୍ଷ ଛାଡ଼)।',
      key_exams: 'OPSC AMO/HMO Written Exam (2 Papers × 100 Marks) · NHM Odisha CHO Merit / CBT',
      selection_stages_en: [
        'OPSC AYUSH MO: Paper I (100M Basic & Pre-Clinical) + Paper II (100M Clinical BAMS/BHMS) → Document Verification.',
        'NHM Odisha CHO: Online Application → Career Merit / Screening Test → CPCH Bridge Verification (if needed) → District HWCs Posting.',
        'Odisha AYUSH Society also recruits RBSK Mobile Health Team AYUSH Doctors across blocks.'
      ],
      selection_stages_or: [
        'OPSC ଆୟୁଷ MO: ପେପର୍-୧ (୧୦୦) + ପେପର୍-୨ (୧୦୦) ଲିଖିତ ପରୀକ୍ଷା → ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ।',
        'NHM ଓଡ଼ିଶା CHO: ଅନଲାଇନ୍ ଆବେଦନ → ମେଧା / ସ୍କ୍ରିନିଂ → ଆୟୁଷ୍ମାନ ଆରୋଗ୍ୟ ମନ୍ଦିର ପୋଷ୍ଟିଂ।',
        'RBSK ମୋବାଇଲ୍ ହେଲ୍ଥ ଟିମ୍ ରେ ମଧ୍ୟ ଆୟୁଷ ଡାକ୍ତର ନିଯୁକ୍ତି।'
      ],
      milestones: [
        { step: '1', label_en: 'BAMS/BHMS or CPCH Nursing Regn', label_or: 'BAMS/BHMS କିମ୍ବା CPCH ପଞ୍ଜୀକରଣ' },
        { step: '2', label_en: 'Samhita / Materia Medica / Community Health', label_or: 'ସଂହିତା / ମ୍ୟାଟେରିଆ ମେଡିକା / ଜନସ୍ୱାସ୍ଥ୍ୟ' },
        { step: '3', label_en: 'OPSC AYUSH or NHM District Placement', label_or: 'OPSC ଆୟୁଷ କିମ୍ବା NHM ଜିଲ୍ଲା ନିଯୁକ୍ତି' }
      ],
      promotion_ladder_en: [
        'Years 0–6: AYUSH Medical Officer (L-10) / CHO at Sub-Centre HWC.',
        'Years 6–12: Senior AYUSH MO / District AYUSH Medical Officer (DAMO, L-11/L-12).',
        'Years 12–18+: Joint Director / Director of AYUSH Odisha (ORSP L-13/L-14).'
      ],
      promotion_ladder_or: [
        '୦–୬ ବର୍ଷ: ଆୟୁଷ MO (L-10) / CHO।',
        '୬–୧୨ ବର୍ଷ: ସିନିୟର ଆୟୁଷ MO / ଜିଲ୍ଲା ଆୟୁଷ MO (L-11/12)।',
        '୧୨–୧୮+ ବର୍ଷ: ଯୁଗ୍ମ ନିର୍ଦ୍ଦେଶକ / ଆୟୁଷ ନିର୍ଦ୍ଦେଶକ (L-13/14)।'
      ],
      required_certificates_en: [
        'BAMS / BHMS Degree + Internship Proof + Odisha State Board of Ayurvedic/Homoeopathic Medicine Regn',
        'B.Sc. Nursing + Integrated CPCH Certificate (for NHM CHO)',
        'HSC Certificate (Odia Proof) & Resident / Caste / SEBC Certificate'
      ],
      required_certificates_or: [
        'BAMS/BHMS ଡିଗ୍ରୀ, ଇଣ୍ଟର୍ନସିପ୍ ଓ ଓଡ଼ିଶା ଆୟୁଷ ବୋର୍ଡ ପଞ୍ଜୀକରଣ',
        'B.Sc. ନର୍ସିଂ + CPCH ପ୍ରମାଣପତ୍ର (CHO ପାଇଁ)',
        'ଦଶମ (ଓଡ଼ିଆ ପ୍ରମାଣ) ଓ ବାସିନ୍ଦା/ଜାତି ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### AYUSH & Community Health Track\n- For OPSC AMO/HMO, focus on Charaka/Sushruta Samhita & Kayachikitsa (BAMS) or Organon, Repertory & Materia Medica (BHMS) plus National Health Mission protocols.\n- For NHM CHO, track nhmodisha.gov.in notifications quarterly for district-wise vacancies.',
      roadmap_body_or: '### ଆୟୁଷ ଓ CHO ପ୍ରସ୍ତୁତି\n- OPSC AMO/HMO ପାଇଁ ଚରକ/ସୁଶ୍ରୁତ ସଂହିତା (BAMS) କିମ୍ବା ଅର୍ଗାନନ୍ ଓ ମ୍ୟାଟେରିଆ ମେଡିକା (BHMS) ଉପରେ ଗୁରୁତ୍ୱ ଦିଅନ୍ତୁ।\n- NHM CHO ନିଯୁକ୍ତି ପାଇଁ nhmodisha.gov.in ନିୟମିତ ଯାଞ୍ଚ କରନ୍ତୁ।',
      official_links: [
        { label: 'NHM Odisha Portal', url: 'https://nhmodisha.gov.in' },
        { label: 'Directorate of AYUSH Odisha', url: 'https://ayushodisha.nic.in' }
      ]
    },

    /* ================================================================
     * TRACK 5: AGRICULTURE (3 Roadmaps)
     * ================================================================ */
    {
      id: 'cso-rm-opsc-aao-aho',
      slug: 'opsc-aao-aho-agriculture-horticulture',
      track_slug: 'agriculture',
      subtrack_slug: 'state-agri-officers',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'graduate',
      stage_tags: ['graduate', 'pg-medical'],
      stage_label_en: 'B.Sc. Agriculture / Horticulture',
      stage_label_or: 'B.Sc. କୃଷି / ଉଦ୍ୟାନକୃଷି',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'OPSC Assistant Agriculture Officer (AAO) & Assistant Horticulture Officer (AHO)',
      title_or: 'OPSC ଆସିଷ୍ଟାଣ୍ଟ ଏଗ୍ରିକଲଚର୍ ଅଫିସର୍ (AAO) ଓ ଆସିଷ୍ଟାଣ୍ଟ ହର୍ଟିକଲଚର୍ ଅଫିସର୍ (AHO)',
      summary_en: 'Premier Class-II Group-B officer pathway under Odisha Dept. of Agriculture & Farmers’ Empowerment (DA&FE) leading block-level crop and horticulture programmes.',
      summary_or: 'ଓଡ଼ିଶା କୃଷି ଓ କୃଷକ ସଶକ୍ତିକରଣ ବିଭାଗ (DA&FE) ଅଧୀନରେ ବ୍ଲକ୍-ସ୍ତରୀୟ କୃଷି ଓ ଉଦ୍ୟାନକୃଷି କାର୍ଯ୍ୟକ୍ରମର ନେତୃତ୍ୱ ନେଉଥିବା Group-B ଅଫିସର୍ କ୍ୟାରିୟର୍।',
      orsp_level: 'ORSP L-10 · ₹44,900',
      salary_band: 'ORSP Level-10 (₹44,900 Basic; ~₹71,000+ Gross with DA & HRA)',
      salary_band_or: 'ORSP ଲେଭେଲ୍-୧୦ (₹୪୪,୯୦୦ ମୂଳ ବେତନ; DA ଓ HRA ସହ ~₹୭୧,୦୦୦+)',
      pay_allowances_en: 'ORSP Level-10 (₹44,900–₹1,42,400) Class-II Group-B Gazetted Officer + 53%+ DA, HRA, Field Travel Allowance, Govt Quarter (Block/Sub-Division), and NPS/UPS benefits.',
      pay_allowances_or: 'ORSP L-10 (₹୪୪,୯୦୦–₹୧,୪୨,୪୦୦) ଗେଜେଟେଡ୍ Group-B ଅଫିସର୍ + DA, HRA, ଫିଲ୍ଡ ଭତ୍ତା ଓ ସରକାରୀ ବାସଭବନ।',
      eligibility_summary: 'B.Sc. (Hons.) Agriculture for AAO; B.Sc. (Hons.) Horticulture / Agriculture for AHO (ICAR/OUAT recognized) + Odia proficiency.',
      eligibility_summary_or: 'AAO ପାଇଁ B.Sc. କୃଷି; AHO ପାଇଁ B.Sc. ଉଦ୍ୟାନକୃଷି / କୃଷି (OUAT/ICAR ସ୍ୱୀକୃତ) + ଓଡ଼ିଆ ଜ୍ଞାନ।',
      age_window_en: '21–38 yrs (UR) · +5 yrs SC/ST/SEBC/Women · +10 yrs PwBD · ₹0 OPSC Fee.',
      age_window_or: '୨୧–୩୮ ବର୍ଷ (UR) · SC/ST/SEBC/ମହିଳା +୫ ବର୍ଷ · PwBD +୧୦ ବର୍ଷ · ଫିସ୍ ₹୦।',
      key_exams: 'OPSC AAO / AHO Written Exam (2 Papers × 100 Marks = 200M) → Viva-Voce Interview (25 Marks)',
      selection_stages_en: [
        'Stage 1 — Written MCQ Exam (200 Marks, 0.25 negative): Paper I (Agronomy, Soil Science, Plant Breeding, Seed Tech) + Paper II (Horticulture, Pathology, Entomology, Extension & Agri-Economics).',
        'Stage 2 — Viva-Voce Interview (25 Marks) at OPSC, Cuttack.',
        'Stage 3 — Verification & Block/District Placement under DA&FE, Govt. of Odisha.'
      ],
      selection_stages_or: [
        'ପର୍ଯ୍ୟାୟ ୧ — ଲିଖିତ MCQ ପରୀକ୍ଷା (୨୦୦ ମାର୍କ, ୦.୨୫ ନେଗେଟିଭ୍): ପେପର୍-୧ ଓ ପେପର୍-୨ (କୃଷି/ଉଦ୍ୟାନକୃଷି ବିଷୟ)।',
        'ପର୍ଯ୍ୟାୟ ୨ — ସାକ୍ଷାତକାର (୨୫ ମାର୍କ, Cuttack OPSC)।',
        'ପର୍ଯ୍ୟାୟ ୩ — ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ ଓ ବ୍ଲକ୍/ଜିଲ୍ଲା ନିଯୁକ୍ତି।'
      ],
      milestones: [
        { step: '1', label_en: 'OUAT / ICAR Core Notes & Nem Raj Sunda', label_or: 'OUAT/ICAR ନୋଟ୍ସ ଓ ମୌଳିକ କୃଷି' },
        { step: '2', label_en: 'Paper I & II Mock Series + Odisha Agri Schemes', label_or: 'ପେପର୍-୧/୨ ମକ୍ ଓ ଓଡ଼ିଶା କୃଷି ଯୋଜନା' },
        { step: '3', label_en: 'OPSC Technical Interview & Block Joining', label_or: 'OPSC ଇଣ୍ଟରଭ୍ୟୁ ଓ ବ୍ଲକ୍ ଯୋଗଦାନ' }
      ],
      promotion_ladder_en: [
        'Years 0–6: Assistant Agriculture / Horticulture Officer (AAO/AHO, ORSP L-10).',
        'Years 6–12: Block Agriculture Officer (BAO) / Sub-Divisional Agriculture Officer (ORSP L-11/L-12).',
        'Years 12–18+: District Agriculture Officer / Chief District Agriculture Officer (CDAO, L-13/L-14).'
      ],
      promotion_ladder_or: [
        '୦–୬ ବର୍ଷ: AAO / AHO (ORSP L-10)।',
        '୬–୧୨ ବର୍ଷ: ବ୍ଲକ୍ ଏଗ୍ରିକଲଚର୍ ଅଫିସର୍ / SDAO (L-11/12)।',
        '୧୨–୧୮+ ବର୍ଷ: ଜିଲ୍ଲା କୃଷି ଅଧିକାରୀ / CDAO (L-13/14)।'
      ],
      required_certificates_en: [
        'B.Sc. (Hons.) Agriculture / Horticulture Degree & OGPA-to-Percentage Certificate',
        'HSC / 10th Odia Language Proof',
        'e-District Resident, Caste / SEBC / EWS / PwBD Certificate'
      ],
      required_certificates_or: [
        'B.Sc. କୃଷି / ଉଦ୍ୟାନକୃଷି ଡିଗ୍ରୀ ଓ OGPA ପ୍ରମାଣପତ୍ର',
        'ଦଶମ ଓଡ଼ିଆ ଭାଷା ପ୍ରମାଣପତ୍ର',
        'ବାସିନ୍ଦା ଓ ଜାତି/SEBC/EWS ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### AAO & AHO Exam Roadmap\n- Master Agronomy, Soil Science, Crop Physiology, Plant Protection, and Odisha’s 10 Agro-Climatic Zones.\n- For the 25-mark OPSC interview, stay fluent on Odisha Millets Mission (Shree Anna Abhiyan), CM-KISAN, JACKFRUIT/Horticulture missions, and Soil Health Card implementation.',
      roadmap_body_or: '### AAO ଓ AHO ପ୍ରସ୍ତୁତି ମାର୍ଗ\n- ଏଗ୍ରୋନୋମି, ମୃତ୍ତିକା ବିଜ୍ଞାନ, ଫସଲ ସୁରକ୍ଷା ଏବଂ ଓଡ଼ିଶାର ୧୦ଟି କୃଷି-ଜଳବାୟୁ ଅଞ୍ଚଳ ଭଲ ଭାବେ ପଢ଼ନ୍ତୁ।\n- ଇଣ୍ଟରଭ୍ୟୁ ପାଇଁ ଶ୍ରୀ ଅନ୍ନ ଅଭିଯାନ, CM-KISAN ଓ ଉଦ୍ୟାନକୃଷି ମିଶନ୍ ବିଷୟରେ ଜାଣିରଖନ୍ତୁ।',
      official_links: [
        { label: 'OPSC AAO/AHO Portal', url: 'https://www.opsc.gov.in' },
        { label: 'DA&FE Odisha Portal', url: 'https://agri.odisha.gov.in' }
      ]
    },
    {
      id: 'cso-rm-vas-livestock-inspector',
      slug: 'opsc-vas-osssc-livestock-inspector',
      track_slug: 'agriculture',
      subtrack_slug: 'veterinary-livestock',
      region_scope: 'odisha-state',
      scope_label_en: 'Odisha State',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ',
      career_stage: 'pg-medical',
      stage_tags: ['after-10th-12th', 'graduate', 'pg-medical'],
      stage_label_en: '+2 · B.V.Sc. & A.H.',
      stage_label_or: '+୨ / B.V.Sc. & A.H.',
      featured: 0,
      status: 'published',
      is_builtin: true,
      title_en: 'OPSC / F&ARD Veterinary Assistant Surgeon (VAS) & OSSSC Livestock Inspector (LI)',
      title_or: 'OPSC / F&ARD ଭେଟେରିନାରୀ ଆସିଷ୍ଟାଣ୍ଟ ସର୍ଜନ୍ (VAS) ଓ OSSSC ପଶୁଧନ ନିରୀକ୍ଷକ (LI)',
      summary_en: 'Dual-tier Odisha Fisheries & Animal Resources Development (F&ARD) career ladder — Class-I/II VAS for B.V.Sc. graduates and OSSSC LI for +2 Science/Vocational youth.',
      summary_or: 'ଓଡ଼ିଶା ମତ୍ସ୍ୟ ଓ ପ୍ରାଣୀସମ୍ପଦ ବିକାଶ (F&ARD) ବିଭାଗର ଦ୍ୱିସ୍ତରୀୟ କ୍ୟାରିୟର୍ — B.V.Sc. ପାଇଁ OPSC VAS ଏବଂ +୨ ବିଜ୍ଞାନ/ଧନ୍ଦାମୂଳକ ପାଇଁ OSSSC ପଶୁଧନ ନିରୀକ୍ଷକ।',
      orsp_level: 'ORSP L-5 ₹21,700 (LI) · L-12 ₹56,100 (VAS)',
      salary_band: 'ORSP L-12 (₹56,100 OPSC VAS) · L-5 (₹21,700 OSSSC Livestock Inspector)',
      salary_band_or: 'ORSP L-12 (₹୫୬,୧୦୦ OPSC VAS) · L-5 (₹୨୧,୭୦୦ ପଶୁଧନ ନିରୀକ୍ଷକ)',
      pay_allowances_en: 'OPSC Veterinary Assistant Surgeon (VAS): Group-A/B ORSP Level-10/12 (₹44,900–₹56,100 Basic) + DA + HRA + NPA (as per rules). OSSSC Livestock Inspector (LI): ORSP Level-5 (₹21,700–₹69,100) + State DA + HRA + Field Mobility.',
      pay_allowances_or: 'OPSC VAS ପାଇଁ ORSP L-10/12 (₹୪୪,୯୦୦–₹୫୬,୧୦୦) ଏବଂ OSSSC ପଶୁଧନ ନିରୀକ୍ଷକ ପାଇଁ L-5 (₹୨୧,୭୦୦) + DA ଓ HRA।',
      eligibility_summary: 'VAS: B.V.Sc. & A.H. + Odisha Veterinary Council (OVC) Regn. LI: +2 Vocational (Animal Husbandry/Dairy) or +2 Science + Cycling/Physical test.',
      eligibility_summary_or: 'VAS: B.V.Sc. & A.H. + ଓଡ଼ିଶା ଭେଟେରିନାରୀ କାଉନସିଲ୍ ପଞ୍ଜୀକରଣ। LI: +୨ ଧନ୍ଦାମୂଳକ (ପଶୁପାଳନ) କିମ୍ବା +୨ ବିଜ୍ଞାନ + ସାଇକେଲ୍/ଶାରୀରିକ ପରୀକ୍ଷା।',
      age_window_en: '21–38 yrs (OPSC VAS) · 18–38 yrs (OSSSC LI) · +5 yrs SC/ST/SEBC/Women · ₹0 State Fee.',
      age_window_or: '୨୧–୩୮ ବର୍ଷ (OPSC VAS) · ୧୮–୩୮ ବର୍ଷ (OSSSC LI) · +୫ ବର୍ଷ ଛାଡ଼ · ଫିସ୍ ₹୦।',
      key_exams: 'OPSC VAS (2 Written Papers × 100M + Interview) · OSSSC Livestock Inspector (130M CBT + Physical Test)',
      selection_stages_en: [
        'OPSC VAS: Written MCQ (2 Papers covering Veterinary Medicine, Surgery, Gynaecology, Animal Nutrition & Breeding) → Viva-Voce.',
        'OSSSC LI: Objective CBT (English, Odia, Arithmetic, GK & Animal Husbandry/Science) → Physical Standard & Cycling Test → 2-Year Training (for non-vocational) → District Posting.'
      ],
      selection_stages_or: [
        'OPSC VAS: ୨ଟି ଲିଖିତ MCQ ପେପର୍ (ପଶୁ ଚିକିତ୍ସା, ସର୍ଜରୀ, ପ୍ରଜନନ ଓ ପୋଷଣ) → ସାକ୍ଷାତକାର।',
        'OSSSC LI: ଲିଖିତ CBT (ଇଂରାଜୀ, ଓଡ଼ିଆ, ଗଣିତ, GK ଓ ବିଜ୍ଞାନ) → ଶାରୀରିକ ଓ ସାଇକେଲ୍ ପରୀକ୍ଷା → ଜିଲ୍ଲା ପୋଷ୍ଟିଂ।'
      ],
      milestones: [
        { step: '1', label_en: 'OVC Regn (VAS) or +2 Science/Vocational (LI)', label_or: 'OVC ପଞ୍ଜୀକରଣ (VAS) କିମ୍ବା +୨ (LI)' },
        { step: '2', label_en: 'Veterinary MCQs or OSSSC Combined CBT', label_or: 'ଭେଟେରିନାରୀ MCQ କିମ୍ବା OSSSC CBT' },
        { step: '3', label_en: 'OPSC Viva / LI Physical & Block Posting', label_or: 'OPSC ଭାଇଭା / LI ଶାରୀରିକ ପରୀକ୍ଷା' }
      ],
      promotion_ladder_en: [
        'Years 0–6: VAS at Veterinary Dispensary / LI at Livestock Aid Centre (LAC).',
        'Years 6–12: Block Veterinary Officer (BVO) / Sub-Divisional VO (for VAS) · Senior LI / Veterinary Technician (for LI).',
        'Years 12–18+: Chief District Veterinary Officer (CDVO, ORSP L-14/L-15).'
      ],
      promotion_ladder_or: [
        '୦–୬ ବର୍ଷ: VAS (ପଶୁ ଚିକିତ୍ସାଳୟ) / LI (ପଶୁଧନ ସହାୟତା କେନ୍ଦ୍ର)।',
        '୬–୧୨ ବର୍ଷ: ବ୍ଲକ୍ ଭେଟେରିନାରୀ ଅଫିସର୍ (BVO) / ସିନିୟର LI।',
        '୧୨–୧୮+ ବର୍ଷ: ଜିଲ୍ଲା ମୁଖ୍ୟ ପଶୁଚିକିତ୍ସା ଅଧିକାରୀ (CDVO, L-14/15)।'
      ],
      required_certificates_en: [
        'B.V.Sc. & A.H. Degree + Valid OVC Registration (for OPSC VAS)',
        '+2 Vocational (Dairying/Poultry) or +2 Science Certificate (for OSSSC LI)',
        'HSC Odia Pass Proof & e-District Resident / Caste / SEBC Certificate'
      ],
      required_certificates_or: [
        'B.V.Sc. & A.H. ଡିଗ୍ରୀ ଓ ବୈଧ OVC ପଞ୍ଜୀକରଣ (VAS ପାଇଁ)',
        '+୨ ଧନ୍ଦାମୂଳକ କିମ୍ବା +୨ ବିଜ୍ଞାନ ପ୍ରମାଣପତ୍ର (LI ପାଇଁ)',
        'ଦଶମ ଓଡ଼ିଆ ଓ ବାସିନ୍ଦା/ଜାତି ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### F&ARD Veterinary & Livestock Track\n- OPSC VAS aspirants should focus on clinical cases, zoonotic diseases, dairy genetics, and Mukhyamantri Kamadhenu Yojana.\n- OSSSC LI aspirants should pair standard OSSSC Odia/Math/GK preparation with Class 10–12 Biology & Animal Husbandry fundamentals.',
      roadmap_body_or: '### ପଶୁଚିକିତ୍ସା ଓ ପଶୁଧନ ନିରୀକ୍ଷକ ପ୍ରସ୍ତୁତି\n- OPSC VAS ପ୍ରାର୍ଥୀମାନେ କ୍ଲିନିକାଲ୍ କେସ୍, ପଶୁ ରୋଗ ଓ ମୁଖ୍ୟମନ୍ତ୍ରୀ କାମଧେନୁ ଯୋଜନା ବିଷୟରେ ଅଧ୍ୟୟନ କରନ୍ତୁ।\n- OSSSC LI ପ୍ରାର୍ଥୀମାନେ ଓଡ଼ିଆ/ଗଣିତ/GK ସହ ଜୀବବିଜ୍ଞାନ ଓ ପଶୁପାଳନ ମୌଳିକ ଜ୍ଞାନ ଅଭ୍ୟାସ କରନ୍ତୁ।',
      official_links: [
        { label: 'F&ARD Odisha Department', url: 'https://fard.odisha.gov.in' },
        { label: 'OPSC Portal', url: 'https://www.opsc.gov.in' },
        { label: 'OSSSC Portal', url: 'https://www.osssc.gov.in' }
      ]
    },
    {
      id: 'cso-rm-ouat-icar-agribusiness',
      slug: 'ouat-icar-jrf-agribusiness-fpo',
      track_slug: 'agriculture',
      subtrack_slug: 'research-agribusiness',
      region_scope: 'both',
      scope_label_en: 'Odisha State & National',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ ଜାତୀୟ',
      career_stage: 'pg-medical',
      stage_tags: ['after-10th-12th', 'graduate', 'pg-medical'],
      stage_label_en: '+2 · Graduate · PG / Research',
      stage_label_or: '+୨ / ସ୍ନାତକ / ଗବେଷଣା',
      featured: 0,
      status: 'published',
      is_builtin: true,
      title_en: 'OUAT / ICAR JRF-SRF, Agriculture Extension, Agri-Business & FPO Management Track',
      title_or: 'OUAT / ICAR JRF-SRF, କୃଷି ସମ୍ପ୍ରସାରଣ, ଏଗ୍ରି-ବିଜନେସ୍ ଓ FPO ପରିଚାଳନା',
      summary_en: 'Academic, research, and high-growth private/cooperative agribusiness career path via OUAT Bhubaneswar, ICAR-IARI/NRRI Cuttack, IBPS AFO, and FPO/Agri-Tech leadership.',
      summary_or: 'OUAT ଭୁବନେଶ୍ୱର, ICAR-NRRI କଟକ, IBPS AFO ଏବଂ FPO / ଏଗ୍ରି-ଟେକ୍ ନେତୃତ୍ୱ ମାଧ୍ୟମରେ ଗବେଷଣା ଓ ଏଗ୍ରି-ବିଜନେସ୍ କ୍ୟାରିୟର୍।',
      orsp_level: 'JRF ₹37,000/mo · Agri-Biz ₹6–₹16 LPA',
      salary_band: 'ICAR JRF/SRF ₹37,000–₹42,000/mo · IBPS AFO ₹48,480 · ABM ₹8–₹16 LPA',
      salary_band_or: 'ICAR JRF ₹୩୭,୦୦୦/ମାସ · IBPS AFO ₹୪୮,୪୮୦ · ଏଗ୍ରି-ବିଜନେସ୍ ₹୮–₹୧୬ LPA',
      pay_allowances_en: 'ICAR-AIEEA PG/PhD Fellowship: ₹12,640–₹37,000/mo + HRA; ARS Scientist (ICAR/NRRI/CIFA): 7th CPC Level-10 (₹57,700 Basic); IBPS Specialist Agriculture Field Officer (AFO): ₹48,480 Basic; IIM-A/MANAGE ABM: ₹8–₹18 LPA.',
      pay_allowances_or: 'ICAR-JRF/SRF ଫେଲୋସିପ୍ ₹୩୭,୦୦୦/ମାସ, ARS ବୈଜ୍ଞାନିକ (L-10 ₹୫୭,୭୦୦), IBPS AFO (₹୪୮,୪୮୦) ଏବଂ ABM ମ୍ୟାନେଜମେଣ୍ଟ (₹୮–₹୧୮ LPA)।',
      eligibility_summary: '+2 Science for OUAT UG; B.Sc. Agri/Hort/Forestry/Fisheries for ICAR JRF, IBPS AFO, CAT/MANAGE ABM, and FPO CEO roles.',
      eligibility_summary_or: 'OUAT UG ପାଇଁ +୨ ବିଜ୍ଞାନ; ICAR JRF, IBPS AFO, ABM ଓ FPO CEO ପାଇଁ B.Sc. କୃଷି/ଉଦ୍ୟାନକୃଷି/ମତ୍ସ୍ୟ।',
      age_window_en: '17+ yrs (OUAT UG) · 20–30 yrs (IBPS AFO) · 21–32 yrs (ICAR ARS Scientist) · No cap for FPO/Agri-Tech.',
      age_window_or: '୧୭+ ବର୍ଷ (OUAT UG) · ୨୦–୩୦ ବର୍ଷ (IBPS AFO) · ୨୧–୩୨ ବର୍ଷ (ARS ବୈଜ୍ଞାନିକ)।',
      key_exams: 'OUAT Entrance · ICAR AIEEA PG / JRF · ASRB NET / ARS · IBPS SO (AFO) · CAT / MANAGE ABM',
      selection_stages_en: [
        'Track A (Research/Academia): OUAT UG → ICAR AIEEA (PG/JRF) → Ph.D. / ASRB NET → Assistant Professor (OUAT) or ICAR-ARS Scientist (NRRI Cuttack, CIFA Bhubaneswar).',
        'Track B (Banking & Agri-Business): B.Sc. Agri → IBPS SO (AFO) OR MBA Agri-Business (MANAGE Hyderabad / IIM / XUB) → Agri-Finance, Seed/Input Manager, or NABARD FPO CEO.'
      ],
      selection_stages_or: [
        'ମାର୍ଗ A (ଗବେଷଣା): OUAT UG → ICAR JRF → Ph.D. / ASRB NET → OUAT ଅଧ୍ୟାପକ କିମ୍ବା ICAR ବୈଜ୍ଞାନିକ (NRRI କଟକ / CIFA)।',
        'ମାର୍ଗ B (ବ୍ୟାଙ୍କିଂ ଓ ବ୍ୟବସାୟ): B.Sc. କୃଷି → IBPS AFO କିମ୍ବା MBA-ABM → ଏଗ୍ରି-ଫାଇନାନ୍ସ କିମ୍ବା FPO CEO।'
      ],
      milestones: [
        { step: '1', label_en: 'OUAT / ICAR Foundation & Field RAWE', label_or: 'OUAT / ICAR ମୂଳଦୁଆ ଓ RAWE ତାଲିମ' },
        { step: '2', label_en: 'ICAR JRF, IBPS AFO or ABM Entrance', label_or: 'ICAR JRF, IBPS AFO କିମ୍ବା ABM ପରୀକ୍ଷା' },
        { step: '3', label_en: 'ARS Scientist / Bank AFO / FPO Lead', label_or: 'ARS ବୈଜ୍ଞାନିକ / AFO / FPO ନେତୃତ୍ୱ' }
      ],
      promotion_ladder_en: [
        'Years 0–5: Junior Scientist / IBPS AFO (Scale-I) / FPO Business Manager.',
        'Years 5–10: Senior Scientist (Level-12) / Agri-Credit Branch Head / Regional Agri-Business Manager.',
        'Years 10–15+: Principal Scientist (ICAR, Level-14) / Chief Agri Officer / Agri-Enterprise Founder.'
      ],
      promotion_ladder_or: [
        '୦–୫ ବର୍ଷ: ଜୁନିୟର ବୈଜ୍ଞାନିକ / IBPS AFO / FPO ମ୍ୟାନେଜର୍।',
        '୫–୧୦ ବର୍ଷ: ସିନିୟର ବୈଜ୍ଞାନିକ / ଏଗ୍ରି-କ୍ରେଡିଟ୍ ହେଡ୍।',
        '୧୦–୧୫+ ବର୍ଷ: ପ୍ରିନ୍ସିପାଲ୍ ବୈଜ୍ଞାନିକ (L-14) / ଚିଫ୍ ଏଗ୍ରି ଅଫିସର୍।'
      ],
      required_certificates_en: [
        'OUAT / ICAR Accredited Degree & Transcripts',
        'ICAR AIEEA / ASRB NET / CAT / IBPS Scorecard',
        'RAWE / Agro-Industrial Attachment Completion Certificate',
        'Central OBC-NCL / SC / ST / EWS Certificate (where applicable)'
      ],
      required_certificates_or: [
        'OUAT / ICAR ସ୍ୱୀକୃତ ଡିଗ୍ରୀ ଓ ଟ୍ରାନ୍ସକ୍ରିପ୍ଟ',
        'ICAR AIEEA / ASRB NET / IBPS ସ୍କୋରକାର୍ଡ',
        'RAWE ପ୍ରଶିକ୍ଷଣ ପ୍ରମାଣପତ୍ର',
        'କେନ୍ଦ୍ରୀୟ OBC-NCL / SC / ST / EWS ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### OUAT, ICAR & Agri-Business Pathways\n- Odisha hosts national premier institutes like ICAR-NRRI (Cuttack), ICAR-CIFA (Kausalyaganga), ICAR-CTCRI Regional Centre, and OUAT Bhubaneswar — ideal for internships and JRF/SRF projects.\n- IBPS AFO (Agriculture Field Officer) is one of the fastest direct graduate jobs with 60-mark pure agriculture Mains.',
      roadmap_body_or: '### OUAT, ICAR ଓ ଏଗ୍ରି-ବିଜନେସ୍ ମାର୍ଗ\n- କଟକ NRRI, ଭୁବନେଶ୍ୱର CIFA ଓ OUAT ଭଳି ଜାତୀୟ ପ୍ରତିଷ୍ଠାନରେ ଗବେଷଣା ଓ ପ୍ରୋଜେକ୍ଟ ସୁଯୋଗ ନିଅନ୍ତୁ।\n- B.Sc. କୃଷି ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ IBPS AFO ଏକ ଶୀଘ୍ର ଓ ନିୟମିତ ବ୍ୟାଙ୍କିଂ ଅଫିସର୍ ଚାକିରି।',
      official_links: [
        { label: 'OUAT Bhubaneswar', url: 'https://ouat.ac.in' },
        { label: 'ICAR Official Portal', url: 'https://icar.org.in' },
        { label: 'MANAGE Agri-Business', url: 'https://www.manage.gov.in' }
      ]
    },

    /* ================================================================
     * TRACK 6: CAREER STAGE & PATHWAYS (3 Roadmaps)
     * ================================================================ */
    {
      id: 'cso-rm-after-10th-12th-early',
      slug: 'after-10th-12th-early-entry-govt-skill',
      track_slug: 'career-pathways',
      subtrack_slug: 'after-10th-12th',
      region_scope: 'both',
      scope_label_en: 'Odisha State & National',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ ଜାତୀୟ',
      career_stage: 'after-10th-12th',
      stage_tags: ['after-10th-12th'],
      stage_label_en: 'After 10th / +2',
      stage_label_or: 'ଦଶମ / +୨ ପରେ',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'After 10th & +2 Early-Entry Govt & Skill Pathways (Odisha Police Constable, Forest Guard, SSC CHSL, ITI / Polytechnic)',
      title_or: 'ଦଶମ ଓ +୨ ପରେ ପ୍ରାରମ୍ଭିକ ସରକାରୀ ଚାକିରି ଓ ଦକ୍ଷତା ମାର୍ଗ (ପୋଲିସ୍ କନେଷ୍ଟବଲ୍, ଫରେଷ୍ଟ ଗାର୍ଡ, SSC CHSL, ITI/ପଲିଟେକ୍ନିକ୍)',
      summary_en: 'Practical early financial independence blueprint for 18–23 yr youth across Odisha uniformed services, Central SSC CHSL/MTS/GD, Railways ALP/Technician, and Skilled-in-Odisha ITI/Polytechnic.',
      summary_or: '୧୮–୨୩ ବର୍ଷର ଯୁବପିଢ଼ିଙ୍କ ପାଇଁ ଓଡ଼ିଶା ପୋଲିସ୍ କନେଷ୍ଟବଲ୍, ଫରେଷ୍ଟ ଗାର୍ଡ, SSC CHSL/MTS/GD, ରେଳବାଇ ALP ଏବଂ ସ୍କିଲ୍ଡ-ଇନ୍-ଓଡ଼ିଶା ITI/ପଲିଟେକ୍ନିକ୍ ମାର୍ଗ।',
      orsp_level: 'ORSP L-3–L-5 · ₹18,000–₹21,700',
      salary_band: 'ORSP L-3–L-5 (₹18,000–₹21,700) · 7th CPC L-2–L-4 (₹19,900–₹25,500)',
      salary_band_or: 'ORSP L-3–L-5 (₹୧୮,୦୦୦–₹୨୧,୭୦୦) · କେନ୍ଦ୍ରୀୟ L-2–L-4 (₹୧୯,୯୦୦–₹୨୫,୫୦୦)',
      pay_allowances_en: 'Odisha Police Constable / Sepoy (ORSP L-5 ₹21,700), Forest Guard (L-4 ₹19,900), SSC CHSL LDC/DEO (7th CPC L-2/L-4 ₹19,900–₹25,500), Railway ALP/Technician (L-2/L-5) + DA, HRA, Ration/Uniform & In-Service Degree Permission.',
      pay_allowances_or: 'ଓଡ଼ିଶା ପୋଲିସ୍ କନେଷ୍ଟବଲ୍ (L-5 ₹୨୧,୭୦୦), ଫରେଷ୍ଟ ଗାର୍ଡ (L-4 ₹୧୯,୯୦୦), SSC CHSL (₹୧୯,୯୦୦–₹୨୫,୫୦୦) ଓ ରେଳବାଇ ALP/ଟେକ୍ନିସିଆନ୍ + DA/HRA।',
      eligibility_summary: '10th Pass (OSAP/IRB Sepoy, SSC MTS/GD, ITI, RRB Group-D) or +2 Pass (District Police Constable, Forest Guard, SSC CHSL, OSSSC PEO/ARI).',
      eligibility_summary_or: 'ଦଶମ ପାସ୍ (ସେପୟ, SSC MTS/GD, ITI, RRB) କିମ୍ବା +୨ ପାସ୍ (ପୋଲିସ୍ କନେଷ୍ଟବଲ୍, ଫରେଷ୍ଟ ଗାର୍ଡ, SSC CHSL, OSSSC PEO/ARI)।',
      age_window_en: '18–23 yrs (Police Constable/SSC GD) · 18–27 yrs (SSC CHSL) · 18–38 yrs (OSSSC) · Category Relaxations apply.',
      age_window_or: '୧୮–୨୩ ବର୍ଷ (କନେଷ୍ଟବଲ୍/SSC GD) · ୧୮–୨୭ ବର୍ଷ (SSC CHSL) · ୧୮–୩୮ ବର୍ଷ (OSSSC)।',
      key_exams: 'OPRB Constable/Sepoy · OSSSC Forest Guard/PEO · SSC CHSL/MTS/GD · RRB ALP/Tech · SAMS ITI / Diploma',
      selection_stages_en: [
        'Uniformed Track (Constable / Forest Guard / SSC GD): CBT Written Exam → Physical Measurement & Running/Walking (PET/PST) → Medical.',
        'Clerical Track (SSC CHSL / OSSSC PEO-JA): Tier-I & Tier-II Objective CBT → 35 WPM Typing / Computer Skill Test.',
        'Technical Skill Track: SAMS Odisha Govt ITI (2 Yrs) / Polytechnic Diploma (3 Yrs) → RRB ALP/Technician, OPTCL JMT, DRDO/ISRO Tech-A, or World Skill Center.'
      ],
      selection_stages_or: [
        'ୟୁନିଫର୍ମ ମାର୍ଗ (କନେଷ୍ଟବଲ୍ / ଫରେଷ୍ଟ ଗାର୍ଡ / SSC GD): CBT ପରୀକ୍ଷା → PET/PST → ମେଡିକାଲ୍।',
        'କ୍ଲେରିକାଲ୍ ମାର୍ଗ (SSC CHSL / OSSSC PEO): CBT ପରୀକ୍ଷା → ୩୫ WPM ଟାଇପିଂ / କମ୍ପ୍ୟୁଟର ଟେଷ୍ଟ।',
        'ଟେକ୍ନିକାଲ୍ ମାର୍ଗ: ସରକାରୀ ITI / ପଲିଟେକ୍ନିକ୍ → RRB ALP, OPTCL JMT, DRDO/ISRO।'
      ],
      milestones: [
        { step: '1', label_en: 'Choose Uniformed, Clerical or ITI/Diploma', label_or: 'ୟୁନିଫର୍ମ, କ୍ଲେରିକାଲ୍ କିମ୍ବା ITI/ଡିପ୍ଲୋମା ବାଛନ୍ତୁ' },
        { step: '2', label_en: '10th-Level Math, GK + PET / Typing Prep', label_or: '୧୦ମ ଗଣିତ, GK + PET / ଟାଇପିଂ ଅଭ୍ୟାସ' },
        { step: '3', label_en: 'Join Early & Complete OSOU Graduation', label_or: 'ଶୀଘ୍ର ଚାକିରି + OSOU ସ୍ନାତକ ସମ୍ପୂର୍ଣ୍ଣ' }
      ],
      promotion_ladder_en: [
        'Years 0–5: Constable / LDC / Technician (ORSP L-4/L-5) while completing Graduation via OSOU/IGNOU.',
        'Years 5–10: ASI / Senior Clerk / Senior Technician (ORSP L-7 to L-9) or qualify OSSC CGL / OPSC OAS.',
        'Years 10–18+: Sub-Inspector / Office Superintendent / Section Officer (ORSP L-9 to L-11).'
      ],
      promotion_ladder_or: [
        '୦–୫ ବର୍ଷ: କନେଷ୍ଟବଲ୍ / LDC / ଟେକ୍ନିସିଆନ୍ (OSOU/IGNOU ରେ ସ୍ନାତକ ସହ)।',
        '୫–୧୦ ବର୍ଷ: ASI / ସିନିୟର କ୍ଲର୍କ / OSSC CGL କିମ୍ବା OAS ପରୀକ୍ଷା।',
        '୧୦–୧୮+ ବର୍ଷ: ସବ୍-ଇନ୍ସପେକ୍ଟର / ଅଫିସ୍ ସୁପରିଣ୍ଟେଣ୍ଡେଣ୍ଟ (L-9/11)।'
      ],
      required_certificates_en: [
        'BSE Odisha 10th & CHSE +2 Marksheets & Passing Certificates',
        'NCVT ITI Trade / SCTE&VT Diploma Certificate (for Technical Track)',
        'Odisha Resident, Caste / SEBC / EWS / NCC / Sports Certificate',
        'Driving License (Helpful for Police/Transport roles)'
      ],
      required_certificates_or: [
        'BSE ଦଶମ ଓ CHSE +୨ ମାର୍କସିଟ୍ ଏବଂ ପ୍ରମାଣପତ୍ର',
        'NCVT ITI / SCTE&VT ଡିପ୍ଲୋମା ସାର୍ଟିଫିକେଟ୍',
        'ଓଡ଼ିଶା ବାସିନ୍ଦା, ଜାତି/SEBC/NCC/କ୍ରୀଡ଼ା ପ୍ରମାଣପତ୍ର',
        'ଡ୍ରାଇଭିଂ ଲାଇସେନ୍ସ (ସହାୟକ)'
      ],
      roadmap_body_en: '### Smart Early-Entry Blueprint\n- Joining at age 19–21 gives you both financial security and 15+ extra years for promotions or higher competitive exams.\n- Use CSOdisha’s Typing Skill Arena (for SSC CHSL/OSSC) and PET/PST Checker (for Odisha Police/Forest Guard) daily.',
      roadmap_body_or: '### ପ୍ରାରମ୍ଭିକ ନିଯୁକ୍ତି ରୋଡମ୍ୟାପ୍\n- ୧୯–୨୧ ବର୍ଷ ବୟସରେ ଚାକିରି ପାଇଲେ ଆର୍ଥିକ ସ୍ୱାବଲମ୍ବୀ ହେବା ସହ ଉଚ୍ଚତର ପରୀକ୍ଷା ପାଇଁ ପର୍ଯ୍ୟାପ୍ତ ସମୟ ମିଳେ।\n- ଦୈନିକ CSO ଟାଇପିଂ ଆରେନା ଓ PET/PST ଚେକର୍ ଅଭ୍ୟାସ କରନ୍ତୁ।',
      official_links: [
        { label: 'SSC Official Portal', url: 'https://ssc.gov.in' },
        { label: 'SAMS Odisha ITI & Diploma', url: 'https://samsodisha.gov.in' },
        { label: 'World Skill Center Bhubaneswar', url: 'https://www.worldskillcenter.org' }
      ]
    },
    {
      id: 'cso-rm-final-year-grad-matrix',
      slug: 'final-year-graduate-parallel-exam-blueprint',
      track_slug: 'career-pathways',
      subtrack_slug: 'graduate-blueprint',
      region_scope: 'both',
      scope_label_en: 'Odisha State & National',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ ଜାତୀୟ',
      career_stage: 'graduate',
      stage_tags: ['graduate'],
      stage_label_en: 'Graduate (Final Year / Fresh)',
      stage_label_or: 'ଶେଷ ବର୍ଷ / ନୂତନ ସ୍ନାତକ',
      featured: 1,
      status: 'published',
      is_builtin: true,
      title_en: 'Final-Year Graduate Parallel Exam Blueprint (OPSC + OSSC + OSSSC + IBPS 12-Month Prep Matrix)',
      title_or: 'ଶେଷ ବର୍ଷ ସ୍ନାତକ ସମାନ୍ତରାଳ ପରୀକ୍ଷା ବ୍ଲୁପ୍ରିଣ୍ଟ୍ (OPSC + OSSC + OSSSC + IBPS ୧୨-ମାସିଆ ମ୍ୟାଟ୍ରିକ୍ସ)',
      summary_en: 'Structured 12-month unified timetable allowing final-year & fresh Odisha graduates to target 4 high-probability exams simultaneously without syllabus burnout.',
      summary_or: 'ଅନାବଶ୍ୟକ ଚାପ ବିନା ଗୋଟିଏ ୧୨-ମାସିଆ ଯୋଜନାରେ OPSC, OSSC CGLRE, OSSSC RI/PEO ଏବଂ IBPS ବ୍ୟାଙ୍କିଂ — ୪ଟି ପରୀକ୍ଷାକୁ ଏକାସାଙ୍ଗରେ ପ୍ରସ୍ତୁତ କରିବାର ବ୍ଲୁପ୍ରିଣ୍ଟ୍।',
      orsp_level: 'ORSP L-7 to L-12 · ₹25,500–₹56,100',
      salary_band: 'ORSP L-7 to L-12 (₹25,500–₹56,100) + IBPS PO/Clerk Scale',
      salary_band_or: 'ORSP L-7 ରୁ L-12 (₹୨୫,୫୦୦–₹୫୬,୧୦୦) + IBPS ବ୍ୟାଙ୍କିଂ ସ୍କେଲ୍',
      pay_allowances_en: 'Unlocks parallel entry into OSSSC District Cadre (ORSP L-4–L-9), OSSC CGLRE (L-7–L-9), IBPS Clerk/PO/RRB (₹24k–₹48k Basic), and OPSC OCS (L-12 ₹56,100) within 12–18 months of graduation.',
      pay_allowances_or: 'ସ୍ନାତକ ପରେ ୧୨–୧୮ ମାସ ମଧ୍ୟରେ OSSSC (L-4–9), OSSC CGLRE (L-7–9), IBPS ବ୍ୟାଙ୍କିଂ ଓ OPSC OCS (L-12) ପାଇଁ ସମାନ୍ତରାଳ ପ୍ରସ୍ତୁତି।',
      eligibility_summary: 'Final-Year or Fresh Bachelor’s Degree (BA/B.Sc./B.Com/B.Tech/BBA) + Basic Computer + Odia up to HSC/ME.',
      eligibility_summary_or: 'ଶେଷ ବର୍ଷ କିମ୍ବା ନୂତନ ସ୍ନାତକ (BA/B.Sc./B.Com/B.Tech) + କମ୍ପ୍ୟୁଟର ଜ୍ଞାନ + ଓଡ଼ିଆ।',
      age_window_en: '20–30 yrs (IBPS/SBI) · 21–38 yrs (OPSC / OSSC / OSSSC) · Ideal start: 5th/6th Semester.',
      age_window_or: '୨୦–୩୦ ବର୍ଷ (IBPS/SBI) · ୨୧–୩୮ ବର୍ଷ (OPSC/OSSC/OSSSC) · ଶ୍ରେଷ୍ଠ ଆରମ୍ଭ: ୫ମ/୬ଷ୍ଠ ସେମିଷ୍ଟର୍।',
      key_exams: 'Months 1–4 Core Overlap → Months 5–8 OSSC/OSSSC/IBPS Mocks → Months 9–12 OPSC Mains & Skill Tests',
      selection_stages_en: [
        'Months 1–4 (70% Shared Core): Daily 2h Arithmetic/DI + 1.5h Reasoning + 1h English/Odia Grammar + 1.5h NCERT GS & Odisha GK.',
        'Months 5–8 (Exam-Specific Sprints): Attempt IBPS RRB/Clerk/PO + OSSC CGLRE + OSSSC CRE Prelims/Mains with timed CBT mocks.',
        'Months 9–12 (Peak Conversion): Computer Skill Test + Answer Writing for OPSC OCS Mains + Document Pack Verification.'
      ],
      selection_stages_or: [
        'ମାସ ୧–୪ (୭୦% ସାଧାରଣ ସିଲାବସ୍): ଗଣିତ/DI, ରିଜନିଂ, ଓଡ଼ିଆ-ଇଂରାଜୀ ବ୍ୟାକରଣ ଏବଂ NCERT/ଓଡ଼ିଶା GK।',
        'ମାସ ୫–୮ (ପରୀକ୍ଷା ସ୍ପ୍ରିଣ୍ଟ୍): IBPS RRB/PO, OSSC CGLRE ଓ OSSSC CRE ମକ୍ ଟେଷ୍ଟ।',
        'ମାସ ୯–୧୨ (ସଫଳତା ପର୍ଯ୍ୟାୟ): କମ୍ପ୍ୟୁଟର ସ୍କିଲ୍ ଟେଷ୍ଟ, OPSC ମେନ୍ସ ଉତ୍ତର ଲିଖନ ଓ ଡକ୍ୟୁମେଣ୍ଟ ପ୍ରସ୍ତୁତି।'
      ],
      milestones: [
        { step: '1', label_en: 'M1–M4: 70% Common Quant, Reasoning & GK', label_or: 'ମାସ ୧–୪: ୭୦% ସାଧାରଣ ଗଣିତ, ରିଜନିଂ ଓ GK' },
        { step: '2', label_en: 'M5–M8: Timed IBPS + OSSC + OSSSC Mocks', label_or: 'ମାସ ୫–୮: IBPS + OSSC + OSSSC ମକ୍ ଟେଷ୍ଟ' },
        { step: '3', label_en: 'M9–M12: Mains, Skill Test & OPSC Upgrade', label_or: 'ମାସ ୯–୧୨: ମେନ୍ସ, ସ୍କିଲ୍ ଟେଷ୍ଟ ଓ OPSC' }
      ],
      promotion_ladder_en: [
        'Year 1 Target: Secure safety-net job (OSSSC / OSSC / IBPS Clerk-RRB) within 12 months.',
        'Years 2–4 Upgrade: Prepare peacefully with salary for OPSC OAS / RBI Grade B / UPSC CSE.',
        'Years 5–15+: Gazetted Group-A Executive / Senior Manager leadership trajectory.'
      ],
      promotion_ladder_or: [
        'ବର୍ଷ ୧ ଲକ୍ଷ୍ୟ: ୧୨ ମାସରେ ପ୍ରଥମ ନିଶ୍ଚିତ ଚାକିରି (OSSSC / OSSC / IBPS)।',
        'ବର୍ଷ ୨–୪ ଉନ୍ନତି: ଦରମା ସହିତ OPSC OAS / RBI ଗ୍ରେଡ୍-B / UPSC ପ୍ରସ୍ତୁତି।',
        'ବର୍ଷ ୫–୧୫+: Group-A ଗେଜେଟେଡ୍ ଅଫିସର୍ / ସିନିୟର ମ୍ୟାନେଜର୍।'
      ],
      required_certificates_en: [
        'Provisional Degree & Consolidated Marksheet immediately upon Final Semester result',
        'PGDCA / Basic Computer Certificate + Odia HSC Certificate',
        'Renewed e-District Resident, Caste / SEBC / EWS Certificates (before notification dates)',
        'Standardized Scanned Photo & Signature (CSOdisha Photo Resizer)'
      ],
      required_certificates_or: [
        'ଶେଷ ସେମିଷ୍ଟର୍ ଫଳାଫଳ ପରେ ପ୍ରୋଭିଜନାଲ୍ ଡିଗ୍ରୀ ଓ ମାର୍କସିଟ୍',
        'PGDCA / କମ୍ପ୍ୟୁଟର ଓ ଓଡ଼ିଆ ଦଶମ ପ୍ରମାଣପତ୍ର',
        'ବୈଧ e-District ବାସିନ୍ଦା, ଜାତି/SEBC/EWS ପ୍ରମାଣପତ୍ର',
        'ସଠିକ୍ ସାଇଜ୍ ଫଟୋ ଓ ଦସ୍ତଖତ (CSO ଫଟୋ ରିସାଇଜର୍)'
      ],
      roadmap_body_en: '### Why the Parallel Matrix Works\n- Nearly 70% of OSSC CGLRE, OSSSC CRE, IBPS, and OPSC Prelims CSAT/GS overlaps.\n- Track your syllabus completion week-by-week in CSOdisha’s Syllabus Mastery Tracker and simulate negative marking in the CBT Mock Hub.',
      roadmap_body_or: '### ସମାନ୍ତରାଳ ମ୍ୟାଟ୍ରିକ୍ସ କାହିଁକି ସଫଳ?\n- OSSC CGLRE, OSSSC CRE, IBPS ଓ OPSC ପ୍ରିଲିମ୍ସର ପ୍ରାୟ ୭୦% ସିଲାବସ୍ ସମାନ।\n- CSO ସିଲାବସ୍ ମାଷ୍ଟରୀ ଟ୍ରାକର୍ ଓ CBT ମକ୍ ଟେଷ୍ଟ ହବ୍ ମାଧ୍ୟମରେ ସାପ୍ତାହିକ ପ୍ରଗତି ମାପନ୍ତୁ।',
      official_links: [
        { label: 'CSO Syllabus Mastery Tracker', url: '/exams/' },
        { label: 'CSO Live CBT Mock Tests', url: '/mock-tests/' }
      ]
    },
    {
      id: 'cso-rm-in-service-macp-switch',
      slug: 'in-service-promotion-macp-career-switch',
      track_slug: 'career-pathways',
      subtrack_slug: 'in-service-progression',
      region_scope: 'both',
      scope_label_en: 'Odisha State & National',
      scope_label_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ ଜାତୀୟ',
      career_stage: 'in-service',
      stage_tags: ['in-service'],
      stage_label_en: 'In-Service / Working Pro',
      stage_label_or: 'ଚାକିରିରତ / ପଦୋନ୍ନତି',
      featured: 0,
      status: 'published',
      is_builtin: true,
      title_en: 'In-Service & Working Professional Career Switch / Departmental Promotion Track (MACP, Departmental Accounts / Law Exam, Lateral Tech / Management)',
      title_or: 'ଚାକିରିରତ କର୍ମଚାରୀ ପଦୋନ୍ନତି ଓ କ୍ୟାରିୟର୍ ପରିବର୍ତ୍ତନ ମାର୍ଗ (MACP, ବିଭାଗୀୟ ଆକାଉଣ୍ଟସ୍/ଆଇନ ପରୀକ୍ଷା, ଲ୍ୟାଟେରାଲ୍ ଟେକ୍/ମ୍ୟାନେଜମେଣ୍ଟ)',
      summary_en: 'Growth blueprint for Odisha Govt employees (10/20/30-Yr RACP/MACP, Departmental Accounts/OAS Selection, OCS Study Leave) and mid-career private professionals switching into Tech/Analytics/MBA.',
      summary_or: 'ଓଡ଼ିଶା ସରକାରୀ କର୍ମଚାରୀଙ୍କ ପାଇଁ MACP (୧୦/୨୦/୩୦ ବର୍ଷ), ବିଭାଗୀୟ ଆକାଉଣ୍ଟସ୍/ଆଇନ ପରୀକ୍ଷା, OAS ଚୟନ ଏବଂ ଘରୋଇ କର୍ମଚାରୀଙ୍କ ପାଇଁ ଟେକ୍/MBA କ୍ୟାରିୟର୍ ସୁଇଚ୍ ମାର୍ଗ।',
      orsp_level: 'ORSP L-10 to L-14 · MACP / Lateral',
      salary_band: 'ORSP MACP 10/20/30-Yr Pay Upgrade (L-10–L-14) · Lateral 30–70% Hike',
      salary_band_or: 'ORSP MACP ୧୦/୨୦/୩୦-ବର୍ଷ ବେତନ ବୃଦ୍ଧି (L-10–L-14) · ଲ୍ୟାଟେରାଲ୍ ୩୦–୭୦% ବୃଦ୍ଧି',
      pay_allowances_en: 'Odisha Govt In-Service: Guaranteed RACP/MACP financial upgradation at 10, 20 & 30 years of service + Departmental Accounts Exam increments + HBA/GPF/NPS-UPS optimization + Study Leave/NOC for higher posts.',
      pay_allowances_or: 'ଓଡ଼ିଶା ସରକାରୀ କର୍ମଚାରୀଙ୍କ ପାଇଁ ୧୦, ୨୦ ଓ ୩୦ ବର୍ଷରେ MACP ବେତନ ବୃଦ୍ଧି + ବିଭାଗୀୟ ପରୀକ୍ଷା ଇନକ୍ରିମେଣ୍ଟ + HBA/GPF/NPS-UPS ସୁବିଧା।',
      eligibility_summary: 'Confirmed Odisha State / Central Govt employees (for Departmental Exams, MACP & In-Service Age/Quota) OR Working Professionals (2+ yrs experience for Executive MBA / Lateral Switch).',
      eligibility_summary_or: 'ସ୍ଥାୟୀ ରାଜ୍ୟ/କେନ୍ଦ୍ରୀୟ ସରକାରୀ କର୍ମଚାରୀ (MACP ଓ ବିଭାଗୀୟ ପରୀକ୍ଷା ପାଇଁ) କିମ୍ବା ୨+ ବର୍ଷ ଅଭିଜ୍ଞ ଘରୋଇ କର୍ମଚାରୀ।',
      age_window_en: 'In-Service Govt Employees get up to 45–50 yrs age relaxation in specified state/departmental recruitment; Zero upper age limit for MACP & Lateral switches.',
      age_window_or: 'ସରକାରୀ କର୍ମଚାରୀଙ୍କୁ ବିଭାଗୀୟ ପରୀକ୍ଷାରେ ୪୫–୫୦ ବର୍ଷ ପର୍ଯ୍ୟନ୍ତ ବୟସ ଛାଡ଼; MACP ଓ ଲ୍ୟାଟେରାଲ୍ ସୁଇଚ୍ ପାଇଁ ବୟସ ସୀମା ନାହିଁ।',
      key_exams: 'Odisha Departmental Accounts & Law Exam · LDCE (SSC/Railways/Banks) · OPSC In-Service Selection · Executive MBA / Cloud-AI Certs',
      selection_stages_en: [
        'Govt Departmental Path: Confirm probation → Clear Departmental Accounts/Revenue/Law Exam (Board of Revenue / Madhusudan Das Regional Academy) → Apply for LDCE / DPC Promotion / MACP fixation.',
        'Higher Govt Upgrade: Obtain Prior Intimation / NOC from Cadre Controlling Authority → Appear in OPSC OCS / UPSC / Central Deputation.',
        'Private Lateral Switch: 6-month weekend upskilling (Data Analytics, Cloud, Product Management, or Executive MBA) → Portfolio & Referral Hiring.'
      ],
      selection_stages_or: [
        'ସରକାରୀ ବିଭାଗୀୟ ମାର୍ଗ: ପ୍ରୋବେସନ୍ ସମାପ୍ତ → ବିଭାଗୀୟ ଆକାଉଣ୍ଟସ୍/ଆଇନ ପରୀକ୍ଷା ପାସ୍ → DPC ପଦୋନ୍ନତି / MACP ଫିକ୍ସେସନ୍।',
        'ଉଚ୍ଚତର ସରକାରୀ ସେବା: ବିଭାଗରୁ NOC ନେଇ OPSC OCS / କେନ୍ଦ୍ରୀୟ ଡେପୁଟେସନ୍।',
        'ଘରୋଇ କ୍ୟାରିୟର୍ ସୁଇଚ୍: ୬-ମାସିଆ ସପ୍ତାହାନ୍ତ ଅପସ୍କିଲିଂ (ଡାଟା/କ୍ଲାଉଡ୍/MBA) ଓ ପୋର୍ଟଫୋଲିଓ।'
      ],
      milestones: [
        { step: '1', label_en: 'Audit Service Book, MACP & NOC Rules', label_or: 'ସର୍ଭିସ୍ ବୁକ୍, MACP ଓ NOC ଯାଞ୍ଚ' },
        { step: '2', label_en: 'Clear Dept Accounts / LDCE / Upskill Cert', label_or: 'ବିଭାଗୀୟ ପରୀକ୍ଷା / LDCE / ଦକ୍ଷତା ପ୍ରମାଣ' },
        { step: '3', label_en: 'Pay Fixation, DPC Promotion or Lateral Offer', label_or: 'ବେତନ ଫିକ୍ସେସନ୍, DPC ପଦୋନ୍ନତି କିମ୍ବା ନୂତନ ଅଫର୍' }
      ],
      promotion_ladder_en: [
        '10-Year Milestone: 1st MACP Level Jump / Departmental Promotion (e.g. L-7 → L-9 or L-9 → L-10).',
        '20-Year Milestone: 2nd MACP / Gazetted Cadre Induction (ORSP L-11 to L-12).',
        '30-Year Milestone: 3rd MACP / Senior Supervisory & Pension Optimization (ORSP L-13 to L-14).'
      ],
      promotion_ladder_or: [
        '୧୦ ବର୍ଷ: ପ୍ରଥମ MACP ବେତନ ବୃଦ୍ଧି / ବିଭାଗୀୟ ପଦୋନ୍ନତି।',
        '୨୦ ବର୍ଷ: ଦ୍ୱିତୀୟ MACP / ଗେଜେଟେଡ୍ କ୍ୟାଡର୍ ପ୍ରବେଶ (L-11/12)।',
        '୩୦ ବର୍ଷ: ତୃତୀୟ MACP / ବରିଷ୍ଠ ପଦବୀ ଓ ପେନସନ୍ ଅପ୍ଟିମାଇଜେସନ୍ (L-13/14)।'
      ],
      required_certificates_en: [
        'Updated Service Book, PAR / CCR Grading (5 Years) & Vigilance Clearance',
        'Departmental Accounts / Revenue / Law Exam Pass Notification',
        'Prior Permission / NOC for External Exams or Part-Time Higher Degrees',
        'Form-16, Pay Slip & Experience Letters (for Lateral Corporate Moves)'
      ],
      required_certificates_or: [
        'ଅପଡେଟ୍ ସର୍ଭିସ୍ ବୁକ୍, ୫ ବର୍ଷର PAR/CCR ଓ ଭିଜିଲାନ୍ସ କ୍ଲିୟରାନ୍ସ',
        'ବିଭାଗୀୟ ଆକାଉଣ୍ଟସ୍ / ଆଇନ ପରୀକ୍ଷା ପାସ୍ ବିଜ୍ଞପ୍ତି',
        'ବାହ୍ୟ ପରୀକ୍ଷା କିମ୍ବା ଉଚ୍ଚଶିକ୍ଷା ପାଇଁ NOC',
        'Form-16, ପେ-ସ୍ଲିପ୍ ଓ ଅଭିଜ୍ଞତା ପ୍ରମାଣପତ୍ର'
      ],
      roadmap_body_en: '### In-Service Growth & MACP Optimization\n- Use CSOdisha’s MACP Progression Simulator, Employee HBA/GPF Advance Calculator, and ORSP 7th Pay Estimator on `/career-paths/` to verify every increment and pay-fixation option (Option-I vs Option-II under ORSP Rule 12).\n- Never miss Departmental Exam windows — clearing Accounts/Law early removes promotion bottlenecks.',
      roadmap_body_or: '### ଚାକିରିରତ କର୍ମଚାରୀ ପଦୋନ୍ନତି ଓ MACP ମାର୍ଗ\n- `/career-paths/` ରେ ଥିବା CSO MACP ସିମୁଲେଟର୍, HBA/GPF କାଲକୁଲେଟର୍ ଏବଂ ORSP ବେତନ ଏଷ୍ଟିମେଟର୍ ବ୍ୟବହାର କରି ସଠିକ୍ ବେତନ ଫିକ୍ସେସନ୍ ଯାଞ୍ଚ କରନ୍ତୁ।\n- ପଦୋନ୍ନତି ବାଧା ଦୂର କରିବାକୁ ବିଭାଗୀୟ ଆକାଉଣ୍ଟସ୍/ଆଇନ ପରୀକ୍ଷା ଶୀଘ୍ର ପାସ୍ କରନ୍ତୁ।',
      official_links: [
        { label: 'CSO MACP & ORSP Calculator', url: '/career-paths/' },
        { label: 'HRMS Odisha Portal', url: 'https://hrmsodisha.gov.in' },
        { label: 'Finance Dept Odisha (ORSP)', url: 'https://finance.odisha.gov.in' }
      ]
    }
  ];

  function extractStages(item) {
    var set = {};
    if (item && Array.isArray(item.stage_tags)) {
      item.stage_tags.forEach(function (st) {
        var norm = normalizeStage(st);
        if (norm) set[norm] = true;
      });
    }
    var primary = normalizeStage(item && item.career_stage);
    if (primary) set[primary] = true;
    return Object.keys(set);
  }

  function normalizeLiveItem(raw, idx) {
    if (!raw || typeof raw !== 'object') return null;
    var track = normalizeTrackSlug(raw.track_slug) || 'career-pathways';
    var scope = normalizeScope(raw.region_scope) || 'odisha-state';
    var stage = normalizeStage(raw.career_stage) || 'graduate';
    var slug = String(raw.slug || raw.id || ('d1-roadmap-' + idx)).trim();
    var titleEn = String(raw.title_en || raw.title_or || 'Career Roadmap').trim();
    var titleOr = String(raw.title_or || titleEn).trim();
    var salaryBand = String(raw.salary_band || 'As per ORSP / Official Pay Matrix').trim();

    var milestones = Array.isArray(raw.milestones) && raw.milestones.length ? raw.milestones : [
      { step: '1', label_en: 'Check Eligibility & Syllabus', label_or: 'ଯୋଗ୍ୟତା ଓ ସିଲାବସ୍ ଯାଞ୍ଚ' },
      { step: '2', label_en: 'Clear Selection Stages', label_or: 'ଚୟନ ପର୍ଯ୍ୟାୟ ସଫଳତା' },
      { step: '3', label_en: 'Document Verification & Joining', label_or: 'ଡକ୍ୟୁମେଣ୍ଟ ଯାଞ୍ଚ ଓ ଯୋଗଦାନ' }
    ];

    return {
      id: String(raw.id || ('d1-' + slug)),
      slug: slug,
      track_slug: track,
      subtrack_slug: String(raw.subtrack_slug || ''),
      role_stream_slug: String(raw.role_stream_slug || ''),
      region_scope: scope,
      scope_label_en: raw.scope_label_en || (scope === 'national-central' ? 'National / Central' : (scope === 'both' ? 'Odisha State & National' : 'Odisha State')),
      scope_label_or: raw.scope_label_or || (scope === 'national-central' ? 'ଜାତୀୟ / କେନ୍ଦ୍ରୀୟ' : (scope === 'both' ? 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ ଜାତୀୟ' : 'ଓଡ଼ିଶା ରାଜ୍ୟ')),
      career_stage: stage,
      stage_tags: extractStages({ career_stage: stage, stage_tags: raw.stage_tags }),
      stage_label_en: raw.stage_label_en || (STAGE_OPTIONS.find(function (o) { return o.slug === stage; }) || { label_en: 'Graduate' }).label_en,
      stage_label_or: raw.stage_label_or || (STAGE_OPTIONS.find(function (o) { return o.slug === stage; }) || { label_or: 'ସ୍ନାତକ' }).label_or,
      featured: raw.featured ? 1 : 0,
      status: String(raw.status || 'published'),
      is_builtin: Boolean(raw.is_builtin),
      title_en: titleEn,
      title_or: titleOr,
      summary_en: String(raw.summary_en || raw.summary_or || 'Structured bilingual career roadmap with eligibility, exams, pay band, and promotion ladder.'),
      summary_or: String(raw.summary_or || raw.summary_en || 'ଯୋଗ୍ୟତା, ପରୀକ୍ଷା, ଦରମା ଓ ପଦୋନ୍ନତି ସହିତ ସମ୍ପୂର୍ଣ୍ଣ କ୍ୟାରିୟର୍ ରୋଡମ୍ୟାପ୍।'),
      orsp_level: String(raw.orsp_level || salaryBand.slice(0, 44)),
      salary_band: salaryBand,
      salary_band_or: String(raw.salary_band_or || salaryBand),
      pay_allowances_en: String(raw.pay_allowances_en || salaryBand),
      pay_allowances_or: String(raw.pay_allowances_or || raw.salary_band_or || salaryBand),
      eligibility_summary: String(raw.eligibility_summary || 'See detailed roadmap requirements'),
      eligibility_summary_or: String(raw.eligibility_summary_or || raw.eligibility_summary || 'ସମ୍ପୂର୍ଣ୍ଣ ଯୋଗ୍ୟତା ବିବରଣୀ ଦେଖନ୍ତୁ'),
      age_window_en: String(raw.age_window_en || raw.eligibility_summary || 'As per official recruitment notification'),
      age_window_or: String(raw.age_window_or || raw.eligibility_summary_or || 'ସରକାରୀ ବିଜ୍ଞପ୍ତି ଅନୁଯାୟୀ'),
      key_exams: String(raw.key_exams || 'Direct / Competitive Selection'),
      selection_stages_en: Array.isArray(raw.selection_stages_en) ? raw.selection_stages_en : [],
      selection_stages_or: Array.isArray(raw.selection_stages_or) ? raw.selection_stages_or : [],
      milestones: milestones,
      promotion_ladder_en: Array.isArray(raw.promotion_ladder_en) ? raw.promotion_ladder_en : [],
      promotion_ladder_or: Array.isArray(raw.promotion_ladder_or) ? raw.promotion_ladder_or : [],
      required_certificates_en: Array.isArray(raw.required_certificates_en) ? raw.required_certificates_en : [],
      required_certificates_or: Array.isArray(raw.required_certificates_or) ? raw.required_certificates_or : [],
      roadmap_body_en: String(raw.roadmap_body_en || ''),
      roadmap_body_or: String(raw.roadmap_body_or || raw.roadmap_body_en || ''),
      official_links: Array.isArray(raw.official_links) ? raw.official_links : []
    };
  }

  /**
   * Merges live Cloudflare D1 career roadmaps with the 18 built-in bilingual roadmaps.
   * Deduplicates by slug (live D1 overrides built-in if same slug) while guaranteeing
   * every track stays populated and never displays 0 counts.
   */
  function getAllCareerRoadmaps(liveD1Items) {
    var liveList = Array.isArray(liveD1Items) ? liveD1Items : [];
    var bySlug = {};
    var merged = [];

    liveList.forEach(function (raw, idx) {
      var norm = normalizeLiveItem(raw, idx);
      if (!norm) return;
      var key = norm.slug.toLowerCase();
      if (bySlug[key]) return;
      bySlug[key] = true;
      merged.push(norm);
    });

    BUILT_IN_ROADMAPS.forEach(function (rm, idx) {
      var key = String(rm.slug || '').toLowerCase();
      if (bySlug[key]) return;
      bySlug[key] = true;
      merged.push(normalizeLiveItem(rm, idx));
    });

    return merged;
  }

  function matchesScope(itemScope, filterScope) {
    if (!filterScope) return true;
    var normItem = normalizeScope(itemScope);
    var normFilter = normalizeScope(filterScope);
    if (!normFilter) return true;
    if (normItem === 'both') return true;
    return normItem === normFilter;
  }

  function matchesStage(item, filterStage) {
    if (!filterStage) return true;
    var normFilter = normalizeStage(filterStage);
    if (!normFilter) return true;
    var stages = extractStages(item);
    return stages.indexOf(normFilter) !== -1;
  }

  function matchesQuery(item, query) {
    var q = String(query || '').toLowerCase().trim();
    if (!q) return true;
    var hay = [
      item.title_en,
      item.title_or,
      item.summary_en,
      item.summary_or,
      item.key_exams,
      item.eligibility_summary,
      item.salary_band,
      item.orsp_level,
      item.track_slug,
      item.subtrack_slug,
      item.scope_label_en,
      item.stage_label_en
    ].join(' ').toLowerCase();
    var tokens = q.split(/\s+/).filter(Boolean);
    for (var i = 0; i < tokens.length; i += 1) {
      if (hay.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  /**
   * Filters career roadmaps by track, subtrack, scope/region, stage, and search query,
   * while computing dynamic per-track counts under the active matcher criteria.
   */
  function filterCareerRoadmaps(roadmaps, filters) {
    var list = Array.isArray(roadmaps) ? roadmaps : getAllCareerRoadmaps([]);
    var f = filters || {};
    var fTrack = normalizeTrackSlug(f.track || '');
    var fSubtrack = String(f.subtrack || '').toLowerCase().trim();
    var fScope = normalizeScope(f.scope || f.region || '');
    var fStage = normalizeStage(f.stage || '');
    var fQuery = String(f.q || '').trim();

    var trackCounts = {};
    TRACKS.forEach(function (t) {
      trackCounts[t.slug] = 0;
    });

    // Base set matching matcher controls (stage + scope + search query) for live track pill counters
    var baseMatched = [];
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      if (!matchesScope(item.region_scope, fScope)) continue;
      if (!matchesStage(item, fStage)) continue;
      if (!matchesQuery(item, fQuery)) continue;
      baseMatched.push(item);
      var tSlug = normalizeTrackSlug(item.track_slug) || 'career-pathways';
      trackCounts[tSlug] = (trackCounts[tSlug] || 0) + 1;
    }

    var filtered = baseMatched.filter(function (item) {
      if (fTrack && normalizeTrackSlug(item.track_slug) !== fTrack) return false;
      if (fSubtrack && String(item.subtrack_slug || '').toLowerCase() !== fSubtrack) return false;
      return true;
    });

    return {
      items: filtered,
      total: filtered.length,
      allTracksTotal: baseMatched.length,
      trackCounts: trackCounts,
      track_counts: trackCounts
    };
  }

  function getTrackMeta(slug) {
    var norm = normalizeTrackSlug(slug);
    for (var i = 0; i < TRACKS.length; i += 1) {
      if (TRACKS[i].slug === norm) return TRACKS[i];
    }
    return TRACKS[TRACKS.length - 1];
  }

  return {
    version: VERSION,
    VERSION: VERSION,
    TRACKS: TRACKS,
    STAGE_OPTIONS: STAGE_OPTIONS,
    SCOPE_OPTIONS: SCOPE_OPTIONS,
    BUILT_IN_ROADMAPS: BUILT_IN_ROADMAPS,
    normalizeTrackSlug: normalizeTrackSlug,
    normalizeScope: normalizeScope,
    normalizeStage: normalizeStage,
    getTrackMeta: getTrackMeta,
    getAllCareerRoadmaps: getAllCareerRoadmaps,
    filterCareerRoadmaps: filterCareerRoadmaps
  };
});
