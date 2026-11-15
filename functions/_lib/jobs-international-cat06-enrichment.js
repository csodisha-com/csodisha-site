// Category #06 (v73): Exhaustive Minute Bilingual Enrichment of International & Overseas Opportunities (48 Subcategories + 12 Handbooks)
// Idempotent D1 enrichment routine invoked by ensureJobsDirectoryStudioSchema(db).

const SYSTEM_AUTHORS = new Set(['seed', 'legacy-bridge', 'system', 'cat01-enrich', 'cat02-enrich', 'cat03-enrich', 'cat04-enrich', 'cat05-enrich', 'cat06-enrich', '']);

function isShort160(val) {
  return String(val || '').trim().length < 160;
}

function isCustomAdminEdit(row) {
  const updater = String(row?.updated_by || '').trim().toLowerCase();
  if (!updater || SYSTEM_AUTHORS.has(updater)) return false;
  return !isShort160(row?.description_en || row?.description) && !isShort160(row?.description_or);
}

// Tailored >=160-char bilingual metadata for key Category #06 folders
const CAT06_FOLDER_ENRICHMENTS = {
  'international education and admissions': {
    title_or: 'ଆନ୍ତର୍ଜାତୀୟ ଶିକ୍ଷା ଏବଂ ବିଦେଶ ନାମଲେଖା',
    badge: 'STUDY ABROAD',
    en: 'Comprehensive overseas university admissions guide for Odisha students covering USA, UK, Germany, Japan, Canada, Australia, and EU countries with IELTS/TOEFL/GRE/GMAT norms, APS certificates, and MEA Apostille attestation.',
    or: 'ଆନ୍ତର୍ଜାତୀୟ ଶିକ୍ଷା ଓ ନାମଲେଖା: ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ଆମେରିକା, ଯୁକ୍ତରାଜ୍ୟ, ଜର୍ମାନୀ, ଜାପାନ, କାନାଡ଼ା, ଅଷ୍ଟ୍ରେଲିଆ ଓ EU ବିଶ୍ୱବିଦ୍ୟାଳୟରେ ନାମଲେଖା, IELTS/GRE/GMAT, APS ଏବଂ MEA ଆପୋଷ୍ଟିଲ୍ ସୂଚନା।'
  },
  'international jobs and employment': {
    title_or: 'ଆନ୍ତର୍ଜାତୀୟ ଚାକିରି ଏବଂ ବିଦେଶ ନିଯୁକ୍ତି',
    badge: 'OVERSEAS JOBS',
    en: 'Verified overseas career pathways across Healthcare/Nursing (GCC/UK/Germany), Engineering, IT/AI, Hospitality, Teaching, and Skilled Trades with mandatory MEA e-Migrate Recruiting Agent (RA) anti-fraud checks and PoE clearance.',
    or: 'ବିଦେଶୀ ଚାକିରି ଓ ନିଯୁକ୍ତି: GCC, UK, ଜର୍ମାନୀ ଓ ଜାପାନରେ ନର୍ସିଂ, ଇଞ୍ଜିନିୟରିଂ, IT/AI, ଶିକ୍ଷକତା ଏବଂ ଦକ୍ଷ ବୃତ୍ତି ପାଇଁ MEA e-Migrate ପଞ୍ଜୀକୃତ ଏଜେଣ୍ଟ ଯାଞ୍ଚ ଓ ସୁରକ୍ଷିତ ନିଯୁକ୍ତି ସୂଚନା।'
  },
  'international internships, research and exchange': {
    title_or: 'ଆନ୍ତର୍ଜାତୀୟ ଇଣ୍ଟର୍ନଶିପ୍, ଗବେଷଣା ଏବଂ ବିନିମୟ କାର୍ଯ୍ୟକ୍ରମ',
    badge: 'RESEARCH & EXCHANGE',
    en: 'Global research internships, visiting scholar tracks, PhD/postdoctoral fellowships (DAAD, Mitacs, JSPS, Marie Curie), public policy fellowships, and international conference travel grants for Odisha scholars.',
    or: 'ଆନ୍ତର୍ଜାତୀୟ ଇଣ୍ଟର୍ନଶିପ୍ ଓ ଗବେଷଣା: ବିଶ୍ୱସ୍ତରୀୟ ଛାତ୍ର ଇଣ୍ଟର୍ନଶିପ୍, PhD ଓ ପୋଷ୍ଟ-ଡକ୍ଟୋରାଲ୍ ଫେଲୋସିପ୍ (DAAD, Mitacs, JSPS, Marie Curie) ଏବଂ ଆନ୍ତର୍ଜାତୀୟ ସମ୍ମିଳନୀ ଭ୍ରମଣ ଅନୁଦାନ ସୂଚନା।'
  },
  'international organisations and diplomacy': {
    title_or: 'ଆନ୍ତର୍ଜାତୀୟ ସଂସ୍ଥା ଏବଂ କୂଟନୀତି କ୍ୟାରିଅର୍',
    badge: 'UN & DIPLOMACY',
    en: 'Career blueprints for the United Nations system (UN YPP, JPO, UNV), World Bank, IMF, ADB, WHO, multilateral development banks, foreign service/diplomatic tracks, and international human rights agencies.',
    or: 'ଆନ୍ତର୍ଜାତୀୟ ସଂସ୍ଥା ଓ କୂଟନୀତି: ଜାତିସଂଘ (UN YPP, JPO, UNV), ବିଶ୍ୱ ବ୍ୟାଙ୍କ, ADB, WHO ଏବଂ ଆନ୍ତର୍ଜାତୀୟ ଉନ୍ନୟନ ଓ ମାନବାଧିକାର ସଂସ୍ଥାରେ ନିଯୁକ୍ତି ଓ ଫେଲୋସିପ୍ ମାର୍ଗଦର୍ଶିକା।'
  },
  'global competitions, awards and fellowships': {
    title_or: 'ବିଶ୍ୱସ୍ତରୀୟ ପ୍ରତିଯୋଗିତା, ପୁରସ୍କାର ଏବଂ ଫେଲୋସିପ୍',
    badge: 'GLOBAL FELLOWSHIPS',
    en: 'Prestigious fully funded global awards for Odisha youth including Chevening, Commonwealth, Fulbright-Nehru, Erasmus Mundus (EMJMD), MEXT Japan, Rhodes, Gates Cambridge, and international hackathons/fellowships.',
    or: 'ବିଶ୍ୱସ୍ତରୀୟ ପୁରସ୍କାର ଓ ଫେଲୋସିପ୍: ଚେଭେନିଂ, କମନୱେଲ୍ଥ, ଫୁଲବ୍ରାଇଟ୍-ନେହେରୁ, ଇରାସମସ୍ ମୁଣ୍ଡସ୍, MEXT ଜାପାନ, ରୋଡ୍ସ ଏବଂ ଗେଟ୍ସ କେମ୍ବ୍ରିଜ୍ ସମ୍ପୂର୍ଣ୍ଣ ଅର୍ଥପୋଷିତ ବୃତ୍ତି ସୂଚନା।'
  },
  'overseas migration and worker protection': {
    title_or: 'ବିଦେଶୀ ପ୍ରବାସ ଏବଂ ଶ୍ରମିକ ସୁରକ୍ଷା',
    badge: 'SAFE MIGRATION',
    en: 'Mandatory legal protection guide for Odisha migrant workers covering MEA e-Migrate RA license verification, Emigration Check Required (ECR/ECNR), Pre-Departure Orientation (PDOT), PBBY insurance, MADAD, and Odisha Mo Parivar.',
    or: 'ବିଦେଶୀ ପ୍ରବାସ ଓ ଶ୍ରମିକ ସୁରକ୍ଷା: MEA e-Migrate ଏଜେଣ୍ଟ ଯାଞ୍ଚ, PoE ଇମିଗ୍ରେସନ୍ କ୍ଲିୟରାନ୍ସ, PDOT ପ୍ରଶିକ୍ଷଣ, ପ୍ରବାସୀ ଭାରତୀୟ ବୀମା (PBBY), MADAD ଏବଂ ଓଡ଼ିଶା ମୋ ପରିବାର ସହାୟତା ସୂଚନା।'
  },
  'global scholarships & study abroad': {
    title_or: 'ବିଶ୍ୱସ୍ତରୀୟ ଛାତ୍ରବୃତ୍ତି ଏବଂ ବିଦେଶ ଅଧ୍ୟୟନ',
    badge: 'STUDY ABROAD',
    en: 'Fully funded overseas Master’s, PhD, and postdoctoral scholarships for Indian and Odisha students covering Chevening, Commonwealth, Fulbright-Nehru, DAAD, MEXT, Erasmus Mundus, and ST & SC Dev Overseas Scholarships.',
    or: 'ବିଶ୍ୱସ୍ତରୀୟ ଛାତ୍ରବୃତ୍ତି ଓ ବିଦେଶ ଅଧ୍ୟୟନ: ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ଚେଭେନିଂ, କମନୱେଲ୍ଥ, ଫୁଲବ୍ରାଇଟ୍, DAAD, MEXT, ଇରାସମସ୍ ମୁଣ୍ଡସ୍ ଏବଂ ରାଜ୍ୟ/ଜାତୀୟ ବିଦେଶୀ ବୃତ୍ତିର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'global fellowships, visas & remote careers': {
    title_or: 'ବିଶ୍ୱସ୍ତରୀୟ ଫେଲୋସିପ୍, ଭିସା ଏବଂ ରିମୋଟ୍ କ୍ୟାରିଅର୍',
    badge: 'GLOBAL CAREERS',
    en: 'Multilateral UN, World Bank, and ADB fellowships alongside skilled work visas (UK Graduate/Care, Germany Chancenkarte, Canada Express Entry, Australia 485/189, GCC Healthcare) and MEA e-Migrate checks.',
    or: 'ବିଶ୍ୱସ୍ତରୀୟ ଫେଲୋସିପ୍, ଭିସା ଓ ରିମୋଟ୍ କ୍ୟାରିଅର୍: UN/World Bank/ADB ଫେଲୋସିପ୍, ଦକ୍ଷ କାର୍ଯ୍ୟ ଭିସା (UK, ଜର୍ମାନୀ, କାନାଡ଼ା, ଅଷ୍ଟ୍ରେଲିଆ, GCC) ଏବଂ MEA e-Migrate ସୁରକ୍ଷା ଯାଞ୍ଚ ସୂଚନା।'
  }
};

function buildSmartInternationalFolderEnrichment(folder, parentTitle) {
  const title = String(folder.title || '').trim();
  const hay = `${title} ${parentTitle || ''} ${folder.slug || ''}`.toLowerCase();

  let badge = 'GLOBAL GUIDE';
  let en = '';
  let or = '';

  if (hay.includes('healthcare') || hay.includes('nursing') || hay.includes('gcc') || hay.includes('engineering') || hay.includes('it,') || hay.includes('hospitality') || hay.includes('trades') || hay.includes('employment') || hay.includes('jobs') || hay.includes('maritime') || hay.includes('agriculture')) {
    badge = 'OVERSEAS JOBS';
    en = `Verified ${title} overseas pathway for Odisha professionals detailing employer visa sponsorship, credential checks (DataFlow/WES/APS), MEA e-Migrate RA anti-fraud verification, salary norms, and PBBY worker protection.`;
    or = `${title} ବିଦେଶୀ ନିଯୁକ୍ତି: ଓଡ଼ିଶାର ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ ଭିସା ସ୍ପନସରଶିପ୍, DataFlow/WES/APS ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ, MEA e-Migrate ପଞ୍ଜୀକୃତ ଏଜେଣ୍ଟ ସୁରକ୍ଷା ଏବଂ PBBY ବୀମା ସମ୍ବନ୍ଧୀୟ ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।`;
  } else if (hay.includes('united nations') || hay.includes('diplomacy') || hay.includes('multilateral') || hay.includes('humanitarian') || hay.includes('ngo') || hay.includes('public policy') || hay.includes('law') || hay.includes('financial institutions')) {
    badge = 'UN & POLICY';
    en = `Authoritative ${title} career guide covering UN YPP/JPO/UNV, World Bank, ADB, WHO, and multilateral fellowship eligibility, competency-based applications, language requirements, and ethical international placements.`;
    or = `${title} ଆନ୍ତର୍ଜାତୀୟ କ୍ୟାରିଅର୍: ଜାତିସଂଘ (UN YPP/JPO), ବିଶ୍ୱ ବ୍ୟାଙ୍କ, ADB, WHO ଏବଂ ବହୁପାକ୍ଷିକ ସଂସ୍ଥାରେ ଯୋଗ୍ୟତା, ଆବେଦନ ପ୍ରକ୍ରିୟା, ଭାଷା ଦକ୍ଷତା ଏବଂ ନିଯୁକ୍ତି ସୁଯୋଗର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  } else if (hay.includes('internship') || hay.includes('research') || hay.includes('doctoral') || hay.includes('exchange') || hay.includes('conference') || hay.includes('fellowship')) {
    badge = 'RESEARCH & EXCHANGE';
    en = `Minute ${title} guide for Odisha students and scholars detailing host-university invitations, monthly stipends, visa categories (J-1/Schengen/UK), travel grants, and MEA Apostille document readiness.`;
    or = `${title} ଗବେଷଣା ଓ ବିନିମୟ: ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀ ଓ ଗବେଷକଙ୍କ ପାଇଁ ବିଦେଶୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଆମନ୍ତ୍ରଣ, ମାସିକ ଷ୍ଟାଇପେଣ୍ଡ, ଭିସା ନିୟମ, ଭ୍ରମଣ ଅନୁଦାନ ଏବଂ MEA ଆପୋଷ୍ଟିଲ୍ ପ୍ରସ୍ତୁତିର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  } else {
    en = `Comprehensive ${title} international guide for Odisha applicants covering official government portals, standardized tests (IELTS/TOEFL/GRE/Goethe/JLPT), visa rules, and anti-scam verification.`;
    or = `${title} ଆନ୍ତର୍ଜାତୀୟ ମାର୍ଗଦର୍ଶିକା: ଓଡ଼ିଶାର ଆବେଦନକାରୀଙ୍କ ପାଇଁ ସରକାରୀ ପୋର୍ଟାଲ୍, IELTS/TOEFL/GRE/Goethe/JLPT ପରୀକ୍ଷା, ଭିସା ନିୟମ ଏବଂ ପ୍ରତାରଣା-ମୁକ୍ତ ଯାଞ୍ଚ ପ୍ରକ୍ରିୟାର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।`;
  }

  return {
    title_or: folder.title_or || `${title} (ଆନ୍ତର୍ଜାତୀୟ ସୁଯୋଗ)`,
    badge,
    en,
    or
  };
}

// 12 Exhaustive Minute Overseas Career, Scholarship & Safe Migration Handbooks (Category #06)
const CAT06_HANDBOOKS = [
  {
    id: 'ji-io-safe-emigrate-antifraud',
    folderKey: 'overseas migration and worker protection',
    fallbackFolder: 'jf-io-wes-visas',
    slug: 'safe-overseas-employment-mea-emigrate-anti-fraud-guide',
    title: 'Safe Overseas Employment & Anti-Fraud Verification Guide (MEA e-Migrate, Registered Recruiting Agents RA Check, PDOT & Pravasi Bharatiya Bima Yojana)',
    title_or: 'ସୁରକ୍ଷିତ ବିଦେଶୀ ନିଯୁକ୍ତି ଏବଂ ପ୍ରତାରଣା-ନିରୋଧୀ ଯାଞ୍ଚ ଗାଇଡ୍ (MEA e-Migrate, RA ଯାଞ୍ଚ, PDOT ଓ PBBY ବୀମା)',
    conducting_body: 'Ministry of External Affairs (MEA) — Protector General of Emigrants (PGE) & Odisha Labour Dept',
    exam_code: 'MEA-EMIGRATE-SAFE',
    cadre_group: 'All Overseas Workers (ECR & ECNR Passports, Skilled Trades, Nursing, Engineering)',
    pay_matrix: 'Strict Statutory Fee Cap (Max ₹30,000 + GST for RAs); PBBY ₹10 Lakh Accidental/Disability Insurance Cover',
    age_limit_relaxation: 'Minimum 18 yrs (30 yrs minimum age rule for ECR-category female domestic workers to notified countries)',
    qualification_odia_rule: 'Verify Recruiting Agent (RA) 1000+ series License on emigrate.gov.in; never pay cash or travel on Tourist/Visit Visa for employment',
    selection_stages: '1. Verify RA License & Demand Letter on emigrate.gov.in -> 2. Employment Contract Attestation -> 3. Complete 1-Day PDOT (Pre-Departure Orientation) -> 4. PBBY Insurance & PoE Emigration Clearance -> 5. Depart with Legal Employment Visa',
    pst_pet_skill_norms: 'Anti-Scam Red Flags: Tourist-to-Work visa promises, WhatsApp-only job offers, unregistered sub-agents, and passport confiscation are illegal under Emigration Act, 1983.',
    documents_checklist: '1. Valid Indian Passport (≥6 months validity; ECR/ECNR check)\n2. e-Migrate Verified Employment Contract & Foreign Employer Demand Letter\n3. Registered Recruiting Agent (RA) Receipt\n4. Pravasi Bharatiya Bima Yojana (PBBY) Policy\n5. PDOT Certificate & Police Clearance Certificate (PCC)',
    application_steps: '1. Visit emigrate.gov.in -> List of Registered Recruiting Agents to verify agent license & address.\n2. Attend free PDOT orientation before departure.\n3. Register on MADAD (madad.gov.in) and save Pravasi Bharatiya Sahayata Kendra (PBSK) 24x7 helpline: 1800-11-3090.',
    official_portal_url: 'https://emigrate.gov.in/',
    summary_en: 'Mandatory anti-scam legal verification guide for Odisha overseas workers covering MEA e-Migrate RA license checks, PoE emigration clearance, PDOT, and PBBY ₹10L insurance.',
    summary_or: 'ସୁରକ୍ଷିତ ବିଦେଶୀ ନିଯୁକ୍ତି ଗାଇଡ୍: MEA e-Migrate ରେ ପଞ୍ଜୀକୃତ ଏଜେଣ୍ଟ (RA) ଯାଞ୍ଚ, PoE ଇମିଗ୍ରେସନ୍ କ୍ଲିୟରାନ୍ସ, PDOT ପ୍ରଶିକ୍ଷଣ, PBBY ₹୧୦ ଲକ୍ଷ ବୀମା ଏବଂ ନକଲି ଭିସା ପ୍ରତାରଣାରୁ ରକ୍ଷା।',
    body_html: '<h3>Zero-Tolerance Anti-Fraud Protocol</h3><p>Before paying a single rupee to any overseas job agent in Odisha or metro cities, check their active <strong>Recruiting Agent (RA) Registration Certificate</strong> on <strong>emigrate.gov.in</strong>. Under the Emigration Act, 1983, working abroad on a Visit/Tourist visa is illegal and strips you of consular protection.</p><h3>24x7 Emergency Helplines</h3><ul><li><strong>PBSK Helpline:</strong> 1800-11-3090 (Toll-Free)</li><li><strong>MADAD Consular Grievance Portal:</strong> madad.gov.in</li><li><strong>Odisha Mo Parivar / Labour Helpline:</strong> Shramik Sahayata for stranded Odia workers</li></ul>',
    body_or: '<h3>ବିଦେଶୀ ନିଯୁକ୍ତି ପ୍ରତାରଣା-ନିରୋଧୀ ନିୟମ</h3><p>କୌଣସି ଏଜେଣ୍ଟଙ୍କୁ ଟଙ୍କା ଦେବା ପୂର୍ବରୁ <strong>emigrate.gov.in</strong> ରେ ସେମାନଙ୍କର ବୈଧ RA ଲାଇସେନ୍ସ ଯାଞ୍ଚ କରନ୍ତୁ। ଟୁରିଷ୍ଟ ବା ଭିଜିଟ୍ ଭିସାରେ ବିଦେଶକୁ କାମ କରିବାକୁ ଯିବା ବେଆଇନ ଅଟେ।</p>',
    tags: ['e-Migrate', 'Anti-Fraud', 'PBBY', 'PDOT', 'Safe Migration']
  },
  {
    id: 'ji-io-odisha-overseas-scholarships',
    folderKey: 'odisha overseas study & research grants',
    fallbackFolder: 'jf-io-odisha-overseas',
    slug: 'odisha-state-overseas-scholarships-and-pravasi-odia-support',
    title: 'Odisha State Overseas Study Scholarships & Pravasi Odia Support (ST & SC Development Overseas Scholarship, Odisha Mo Parivar & MADAD Consular Portal)',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ବିଦେଶ ଅଧ୍ୟୟନ ଛାତ୍ରବୃତ୍ତି ଏବଂ ପ୍ରବାସୀ ଓଡ଼ିଆ ସହାୟତା (ST/SC ବିଦେଶ ବୃତ୍ତି, ଓଡ଼ିଶା ମୋ ପରିବାର ଓ MADAD)',
    conducting_body: 'ST & SC Dev Dept (Odisha) / Ministry of Social Justice (NOS) / Odisha Mo Parivar / MEA MADAD',
    exam_code: 'ODISHA-NOS-PARIVAR',
    cadre_group: 'Master’s & PhD Aspirants from Odisha + Overseas Odia Students & Workers',
    pay_matrix: 'Full Tuition + Annual Maintenance ($15,400 US / £9,900 UK) + Visa, Airfare & Contingency (NOS / State Overseas)',
    age_limit_relaxation: 'Max 35 years (NOS / State Overseas); Odisha Domicile mandatory for State Overseas Schemes',
    qualification_odia_rule: '60%+ marks in qualifying UG/PG degree; unconditional admission offer from Top-500 QS-ranked foreign university; Family Income ≤ ₹8,00,000/yr (NOS)',
    selection_stages: '1. Unconditional Offer from Top-500 QS Foreign University -> 2. Online Application (nosmsje.gov.in / State Portal) -> 3. Document & Income Verification -> 4. Selection Committee -> 5. Embassy/University Fee Release',
    pst_pet_skill_norms: 'Consular Support: Every Odisha student abroad should register on MEA MADAD (madad.gov.in) and Indian Embassy student portal upon arrival for emergency evacuation/legal aid.',
    documents_checklist: '1. Unconditional Offer Letter from QS Top-500 University\n2. Odisha Resident & Caste Certificate (SC/ST/SEBC/DNT)\n3. Tehsildar Annual Family Income Certificate\n4. Passport, IELTS/TOEFL/GRE Score & Academic Transcripts',
    application_steps: '1. Secure admission in QS Top-500 overseas university.\n2. Apply on nosmsje.gov.in (Central NOS) or Odisha ST & SC Dev Overseas Scholarship notification.\n3. Register on madad.gov.in & Odisha Mo Parivar diaspora registry before departure.',
    official_portal_url: 'https://nosmsje.gov.in/',
    summary_en: 'Complete guide to National & Odisha State Overseas Scholarships for Master’s/PhD abroad plus Pravasi Odia consular protection via Odisha Mo Parivar and MEA MADAD.',
    summary_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ବିଦେଶ ଅଧ୍ୟୟନ ବୃତ୍ତି ଓ ପ୍ରବାସୀ ଓଡ଼ିଆ ସହାୟତା: QS ଟପ୍-୫୦୦ ବିଶ୍ୱବିଦ୍ୟାଳୟରେ ମାଷ୍ଟର୍ସ/PhD ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ଅର୍ଥ ସହାୟତା, ଓଡ଼ିଶା ମୋ ପରିବାର ଏବଂ MADAD ପୋର୍ଟାଲ୍ ସୂଚନା।',
    body_html: '<h3>State & National Overseas Funding for Odisha Scholars</h3><p>Meritorious SC, ST, and disadvantaged scholars from Odisha can access full tuition, living stipend ($15,400/£9,900 per annum), visa fees, and return airfare under the <strong>National Overseas Scholarship (NOS)</strong> and Odisha state-sponsored overseas study programmes.</p>',
    body_or: '<h3>ଓଡ଼ିଶା ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ବିଦେଶ ଅଧ୍ୟୟନ ସହାୟତା</h3><p>QS ଟପ୍-୫୦୦ ବିଶ୍ୱବିଦ୍ୟାଳୟରେ ନାମଲେଖା ପାଇଥିବା ଯୋଗ୍ୟ ଓଡ଼ିଆ ଛାତ୍ରଛାତ୍ରୀମାନେ NOS ଏବଂ ରାଜ୍ୟ ବିଦେଶୀ ବୃତ୍ତି ମାଧ୍ୟମରେ ସମ୍ପୂର୍ଣ୍ଣ ଟ୍ୟୁସନ୍ ଫି, ଭତ୍ତା ଓ ବିମାନ ଭଡ଼ା ପାଇପାରିବେ।</p>',
    tags: ['Odisha Overseas Scholarship', 'NOS', 'Mo Parivar', 'MADAD']
  },
  {
    id: 'ji-io-chevening',
    folderKey: 'chevening, fulbright, commonwealth & daad',
    fallbackFolder: 'jf-io-chevening-odisha',
    slug: 'chevening-commonwealth-masters-guide',
    title: 'Chevening Scholarships (UK FCDO) — Complete Application, 4 Leadership Essays, Eligibility & Interview Guide for Indian/Odisha Graduates',
    title_or: 'ଚେଭେନିଂ ଛାତ୍ରବୃତ୍ତି (UK FCDO) — ଆବେଦନ, ୪ଟି ନେତୃତ୍ୱ ପ୍ରବନ୍ଧ, ଯୋଗ୍ୟତା ଏବଂ ସାକ୍ଷାତକାର ଗାଇଡ୍',
    conducting_body: 'Foreign, Commonwealth & Development Office (FCDO), UK Government',
    exam_code: 'UK-CHEVENING-2026',
    cadre_group: '1-Year Full-Time Taught Master’s Degree at Any Accredited UK University',
    pay_matrix: '100% Tuition Fees + Monthly Living Stipend (~£1,350–£1,650/mo) + Return Economy Airfare + Arrival/Departure Allowances + Visa Fee',
    age_limit_relaxation: 'No upper age limit; Indian citizenship + commitment to return to India for minimum 2 years post-study',
    qualification_odia_rule: 'Bachelor’s Degree (equivalent to UK upper second-class 2:1) + Minimum 2 years (2,800 hours) of documented work experience (full-time, part-time, internships, or voluntary)',
    selection_stages: '1. Online Application + 4 Essays (Aug–Nov) -> 2. Eligibility & Reading Committee Sift -> 3. British High Commission Interview (Feb–Apr) -> 4. Unconditional UK Offer Submission (July) -> 5. UK Departure (Sept)',
    pst_pet_skill_norms: '4 Mandatory Essays (max 500 words each): Leadership & Influence, Networking & Relationship Building, Studying in the UK (3 chosen courses), and Career Plan.',
    documents_checklist: '1. Valid Indian Passport\n2. 3 Eligible UK Master’s Course Choices (Apply separately to universities)\n3. 2 Professional/Academic Referees\n4. Undergraduate Transcripts & Degree Certificate\n5. Proof of ≥2,800 Hours Work Experience',
    application_steps: '1. Apply online at chevening.org/apply between August and early November.\n2. Draft 4 STAR-method essays demonstrating measurable leadership impact in Odisha/India.\n3. Simultaneously apply to 3 UK universities to secure at least 1 Unconditional Offer by July.',
    official_portal_url: 'https://www.chevening.org/',
    summary_en: 'Complete Chevening UK Master’s scholarship guide for Odisha graduates covering the 2,800-hour work experience rule, 4 leadership essays, 3 UK course choices, and High Commission interview.',
    summary_or: 'ଚେଭେନିଂ UK ମାଷ୍ଟର୍ସ ଛାତ୍ରବୃତ୍ତି ଗାଇଡ୍: ୨,୮୦୦ ଘଣ୍ଟା କାର୍ଯ୍ୟ ଅଭିଜ୍ଞତା ନିୟମ, ୪ଟି ନେତୃତ୍ୱ ପ୍ରବନ୍ଧ, ୩ଟି UK ବିଶ୍ୱବିଦ୍ୟାଳୟ ଚୟନ ଏବଂ ସାକ୍ଷାତକାର ପ୍ରସ୍ତୁତିର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।',
    body_html: '<h3>Fully Funded 1-Year UK Master’s Programme</h3><p><strong>Chevening</strong> covers full UK university tuition, a generous monthly living stipend, return airfare, and UK visa fees for emerging leaders from India/Odisha with at least <strong>2,800 hours (2 years)</strong> of work experience.</p>',
    body_or: '<h3>ସମ୍ପୂର୍ଣ୍ଣ ଅର୍ଥପୋଷିତ UK ମାଷ୍ଟର୍ସ ବୃତ୍ତି</h3><p>ଚେଭେନିଂ ବୃତ୍ତି ଅଧୀନରେ ସମ୍ପୂର୍ଣ୍ଣ ଟ୍ୟୁସନ୍ ଫି, ମାସିକ ଭତ୍ତା, ଭିସା ଖର୍ଚ୍ଚ ଏବଂ ଯିବାଆସିବା ବିମାନ ଭଡ଼ା UK ସରକାରଙ୍କ ଦ୍ୱାରା ପ୍ରଦାନ କରାଯାଏ।</p>',
    tags: ['Chevening', 'Study in UK', 'UK FCDO', 'Leadership Scholarship']
  },
  {
    id: 'ji-io-commonwealth-uk',
    folderKey: 'chevening, fulbright, commonwealth & daad',
    fallbackFolder: 'jf-io-chevening-fulbright',
    slug: 'commonwealth-masters-phd-split-site-scholarships-csc-uk',
    title: 'Commonwealth Master’s, Ph.D. & Split-Site Scholarships (CSC UK) — Nomination Agencies (MoE / UGC), Stipend & Selection Criteria',
    title_or: 'କମନୱେଲ୍ଥ ମାଷ୍ଟର୍ସ, PhD ଏବଂ ସ୍ପ୍ଲିଟ୍-ସାଇଟ୍ ଛାତ୍ରବୃତ୍ତି (CSC UK) — MoE ନୋମିନେସନ୍ ଓ ଚୟନ ଗାଇଡ୍',
    conducting_body: 'Commonwealth Scholarship Commission (CSC UK) & Ministry of Education (MoE, Govt of India)',
    exam_code: 'CSC-UK-COMMONWEALTH',
    cadre_group: '1-Year Master’s, 3-Year PhD, and 12-Month Split-Site PhD in UK Universities',
    pay_matrix: 'Full Tuition + Monthly Stipend (£1,378–£1,690/mo) + Warm Clothing Allowance + Thesis Grant + Return Airfare',
    age_limit_relaxation: 'No upper age limit (PhD Split-Site requires current Indian PhD enrolment); permanent Indian resident',
    qualification_odia_rule: 'Master’s: ≥60% in Social Sciences/Humanities or ≥65% in Science/Tech/Engg in Bachelor’s | PhD: Master’s degree + UK supervisor support letter; Dual application on SAKSHAT (MoE) + CSC Central',
    selection_stages: '1. Apply on CSC Online System + MoE India Portal (proposal.sakshat.ac.in) -> 2. MoE Nomination Sift & Interview -> 3. CSC UK Final Selection across 6 Development Themes -> 4. UK Placement',
    pst_pet_skill_norms: 'MUST apply on BOTH CSC portal AND Ministry of Education (India) nomination portal; applications missing MoE India nomination are automatically disqualified.',
    documents_checklist: '1. Passport / Aadhaar & Birth Proof\n2. UG/PG Transcripts & Degree Certificates\n3. UK University Supervisor Support Letter (Mandatory for PhD)\n4. 2 Academic/Employer References\n5. Development Impact Statement aligned to CSC 6 Themes',
    application_steps: '1. Identify which of the 6 CSC Development Themes your degree serves.\n2. Submit CSC Central application AND MoE India (SAKSHAT) nomination application before deadlines (Oct–Dec).\n3. Prepare for MoE interview focusing on Odisha/India development impact.',
    official_portal_url: 'https://cscuk.fcdo.gov.uk/',
    summary_en: 'Complete Commonwealth UK Master’s, PhD & Split-Site scholarship guide detailing mandatory MoE India (SAKSHAT) + CSC dual application, £1,378–£1,690/mo stipend, and 6 development themes.',
    summary_or: 'କମନୱେଲ୍ଥ ମାଷ୍ଟର୍ସ ଓ PhD ଛାତ୍ରବୃତ୍ତି (CSC UK): MoE SAKSHAT ନୋମିନେସନ୍, £୧,୩୭୮–£୧,୬୯୦ ମାସିକ ଭତ୍ତା, PhD ସୁପରଭାଇଜର ଅନୁମତି ଏବଂ ୬ଟି ଉନ୍ନୟନ ବିଷୟବସ୍ତୁର ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍।',
    body_html: '<h3>Dual Nomination Requirement for Indian Applicants</h3><p>Indian candidates applying for <strong>Commonwealth Master’s</strong> or <strong>PhD Scholarships</strong> must submit applications to both the <strong>CSC Central Portal</strong> and the <strong>Ministry of Education (MoE), Government of India</strong> nominating agency.</p>',
    body_or: '<h3>ଭାରତୀୟ ଆବେଦନକାରୀଙ୍କ ପାଇଁ ଦ୍ୱୈତ ଆବେଦନ ନିୟମ</h3><p>କମନୱେଲ୍ଥ ବୃତ୍ତି ପାଇଁ CSC ପୋର୍ଟାଲ୍ ସହିତ ଭାରତ ସରକାରଙ୍କ ଶିକ୍ଷା ମନ୍ତ୍ରଣାଳୟ (MoE) ପୋର୍ଟାଲରେ ନୋମିନେସନ୍ ଆବେଦନ କରିବା ବାଧ୍ୟତାମୂଳକ ଅଟେ।</p>',
    tags: ['Commonwealth Scholarship', 'CSC UK', 'MoE Nomination', 'UK PhD']
  },
  {
    id: 'ji-io-fulbright-nehru',
    folderKey: 'chevening, fulbright, commonwealth & daad',
    fallbackFolder: 'jf-io-chevening-fulbright',
    slug: 'fulbright-nehru-fellowships-usief-complete-guide',
    title: 'Fulbright-Nehru Fellowships (USIEF — Master’s, Doctoral Research, Academic & Professional Excellence) — Complete Guide',
    title_or: 'ଫୁଲବ୍ରାଇଟ୍-ନେହେରୁ ଫେଲୋସିପ୍ (USIEF — ମାଷ୍ଟର୍ସ, ଡକ୍ଟୋରାଲ୍ ଗବେଷଣା ଏବଂ ବୃତ୍ତିଗତ ଉତ୍କର୍ଷ) ଗାଇଡ୍',
    conducting_body: 'United States-India Educational Foundation (USIEF), New Delhi',
    exam_code: 'USIEF-FULBRIGHT-NEHRU',
    cadre_group: 'Master’s (FNMasters), Doctoral Research (FNDR — 6–9 mo), Academic & Professional Excellence (FNAPE)',
    pay_matrix: 'J-1 Visa Support + Tuition/Fee Waiver + Monthly Living Stipend + Health Insurance (ASPE) + Round-Trip Economy Airfare',
    age_limit_relaxation: 'No fixed age cap; J-1 Visa carries mandatory 2-year home-country physical presence requirement',
    qualification_odia_rule: 'FNMasters: 4-Yr US-equivalent Bachelor’s (55%+) + 3 Yrs full-time professional work experience | FNDR: Registered PhD scholar in India with published/strong research proposal',
    selection_stages: '1. Online Application on usief.org.in (May–July) -> 2. National Discipline Expert Review -> 3. USIEF Interview in New Delhi (Sept–Oct) -> 4. IIE US University Placement & GRE/TOEFL -> 5. J-1 Visa & Departure',
    pst_pet_skill_norms: 'FNMasters requires 3 years of full-time paid work experience and strong leadership/community service record; applicants should not hold another US degree.',
    documents_checklist: '1. Personal Statement & Study/Research Objective Essays\n2. 3 Letters of Reference\n3. Academic Transcripts & Employer NOC (where employed)\n4. PhD Registration & Supervisor Endorsement (for FNDR)',
    application_steps: '1. Choose exact Fulbright-Nehru category on usief.org.in.\n2. Submit essays and 3 LORs before the annual deadline (typically May–July).\n3. Shortlisted candidates attend USIEF Delhi panel interview.',
    official_portal_url: 'https://www.usief.org.in/',
    summary_en: 'Authoritative USIEF Fulbright-Nehru guide covering Master’s (3-yr work rule), Doctoral Research (6–9 mo US lab access), J-1 visa sponsorship, and USIEF Delhi interview prep.',
    summary_or: 'ଫୁଲବ୍ରାଇଟ୍-ନେହେରୁ ଫେଲୋସିପ୍ (USIEF): ଆମେରିକାରେ ମାଷ୍ଟର୍ସ ଓ PhD ଗବେଷଣା ପାଇଁ J-1 ଭିସା, ଟ୍ୟୁସନ୍ ଫି, ମାସିକ ଭତ୍ତା ଏବଂ USIEF ସାକ୍ଷାତକାର ପ୍ରସ୍ତୁତିର ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍।',
    body_html: '<h3>Fulbright-Nehru Tracks for Odisha Scholars</h3><p>Administered by <strong>USIEF</strong>, Fulbright-Nehru supports Indian Master’s students (with ≥3 yrs experience), PhD researchers (6–9 months at top US universities), and faculty/professionals for up to 24 months.</p>',
    body_or: '<h3>ଓଡ଼ିଆ ଗବେଷକ ଓ ଛାତ୍ରଙ୍କ ପାଇଁ ଫୁଲବ୍ରାଇଟ୍ ସୁଯୋଗ</h3><p>USIEF ଦ୍ୱାରା ପରିଚାଳିତ ଫୁଲବ୍ରାଇଟ୍-ନେହେରୁ ଫେଲୋସିପ୍ ମାଧ୍ୟମରେ ଆମେରିକାର ଶୀର୍ଷ ବିଶ୍ୱବିଦ୍ୟାଳୟରେ ମାଷ୍ଟର୍ସ ଓ PhD ଗବେଷଣା ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ଆର୍ଥିକ ସହାୟତା ମିଳିଥାଏ।</p>',
    tags: ['Fulbright-Nehru', 'USIEF', 'Study in USA', 'J-1 Fellowship']
  },
  {
    id: 'ji-io-germany-daad-chancenkarte',
    folderKey: 'chevening, fulbright, commonwealth & daad',
    fallbackFolder: 'jf-io-chevening-fulbright',
    slug: 'daad-scholarships-germany-public-universities-chancenkarte-aps',
    title: 'DAAD Scholarships & Tuition-Free Public Universities in Germany + German Opportunity Card (Chancenkarte) & APS Certificate Guide',
    title_or: 'DAAD ଛାତ୍ରବୃତ୍ତି, ଜର୍ମାନୀର ବିନା-ଟ୍ୟୁସନ୍ ସରକାରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ, ଚାନ୍ସେନକାର୍ଟେ (Opportunity Card) ଏବଂ APS ଗାଇଡ୍',
    conducting_body: 'DAAD (German Academic Exchange Service) & APS India (German Embassy New Delhi)',
    exam_code: 'DE-DAAD-APS-CHANCENKARTE',
    cadre_group: 'Master’s / PhD Students (DAAD) + Skilled Graduates Seeking Work in Germany (Chancenkarte)',
    pay_matrix: 'Public Unis: €0 Tuition (€150–€350 semester fee) | DAAD: €934–€1,300/mo + Health/Travel | Chancenkarte: 1-Yr Job-Seeker Visa (20 hrs/wk part-time allowed)',
    age_limit_relaxation: 'No rigid age bar; DAAD EPOS prefers ≤6 years since last degree; Chancenkarte uses points system (age ≤35 gets max points)',
    qualification_odia_rule: 'Mandatory APS Certificate (aps-india.de) verifying Indian academic credentials BEFORE applying for German Student Visa; Blocked Account (~€11,904/yr) unless DAAD-funded',
    selection_stages: '1. Apply for APS Certificate (aps-india.de) -> 2. Apply to German Public Unis / DAAD (EPOS, Helmut-Schmidt, PhD) -> 3. Open Blocked Account (if self-funded) -> 4. VFS German National Visa',
    pst_pet_skill_norms: 'German Opportunity Card (Chancenkarte): Points-based 1-year job-seeker visa requiring recognised Indian degree (Anabin H+) + English B2 or German A1 + blocked account/part-time contract.',
    documents_checklist: '1. APS Certificate (Mandatory for Indian Degrees)\n2. Anabin University Recognition Printout\n3. IELTS / TOEFL / TestDaF / Goethe Certificate\n4. Blocked Account Confirmation (€11,904) or DAAD Award Letter\n5. SOP, CV (Europass) & LORs',
    application_steps: '1. Apply early for APS India verification (takes 4–8 weeks).\n2. Shortlist tuition-free German public universities on daad.de/en.\n3. For skilled job-seekers, check Chancenkarte points at make-it-in-germany.com.',
    official_portal_url: 'https://www.daad.de/en/',
    summary_en: 'Complete Germany study & work guide covering tuition-free public universities, DAAD scholarships (€934–€1,300/mo), mandatory APS India certificate, and German Opportunity Card (Chancenkarte).',
    summary_or: 'ଜର୍ମାନୀ ଅଧ୍ୟୟନ ଓ କ୍ୟାରିଅର୍ ଗାଇଡ୍: ବିନା-ଟ୍ୟୁସନ୍ ସରକାରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ, DAAD ବୃତ୍ତି (€୯୩୪–€୧,୩୦୦/ମାସ), ବାଧ୍ୟତାମୂଳକ APS ସାର୍ଟିଫିକେଟ୍ ଏବଂ ଜର୍ମାନ୍ ଚାନ୍ସେନକାର୍ଟେ ଭିସା ସୂଚନା।',
    body_html: '<h3>Germany: Tuition-Free Higher Education & Chancenkarte</h3><p>Most German public universities charge <strong>zero tuition fees</strong> even for international students. Indian applicants MUST obtain an <strong>APS Certificate (aps-india.de)</strong> prior to visa submission. Skilled graduates can also use the <strong>Opportunity Card (Chancenkarte)</strong> to search for jobs in Germany for up to 12 months.</p>',
    body_or: '<h3>ଜର୍ମାନୀରେ ବିନା-ଟ୍ୟୁସନ୍ ଉଚ୍ଚଶିକ୍ଷା ଏବଂ ଚାନ୍ସେନକାର୍ଟେ</h3><p>ଜର୍ମାନୀର ସରକାରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟଗୁଡ଼ିକରେ ଟ୍ୟୁସନ୍ ଫି ଶୂନ୍ୟ ଅଟେ। ଭାରତୀୟ ଛାତ୍ରଙ୍କ ପାଇଁ <strong>APS ସାର୍ଟିଫିକେଟ୍</strong> ବାଧ୍ୟତାମୂଳକ ଏବଂ ଦକ୍ଷ ସ୍ନାତକଙ୍କ ପାଇଁ <strong>Chancenkarte</strong> ଭିସା ଉପଲବ୍ଧ।</p>',
    tags: ['DAAD Germany', 'APS Certificate', 'Chancenkarte', 'Tuition Free Germany']
  },
  {
    id: 'ji-io-japan-mext-ssw',
    folderKey: 'global competitions, awards and fellowships',
    fallbackFolder: 'jf-io-global-scholarships',
    slug: 'mext-japan-scholarship-and-ssw-titp-skilled-worker-guide',
    title: 'MEXT Japanese Government Scholarships (Embassy & University Track) & Japan Specified Skilled Worker (SSW / TITP) Pathway',
    title_or: 'MEXT ଜାପାନ ସରକାରୀ ଛାତ୍ରବୃତ୍ତି (ଏମ୍ବାସୀ ଓ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଟ୍ରାକ୍) ଏବଂ ଜାପାନ SSW / TITP ଦକ୍ଷ କର୍ମଚାରୀ ପଥ',
    conducting_body: 'Ministry of Education, Culture, Sports, Science & Technology (MEXT Japan) & NSDC / Immigration Services Agency Japan',
    exam_code: 'JP-MEXT-SSW-2026',
    cadre_group: 'Undergraduate, Research/Master’s/PhD (MEXT) + Caregiving, Manufacturing, IT & Agriculture Workers (SSW)',
    pay_matrix: 'MEXT: 100% Tuition + ¥117,000–¥145,000/month + Return Flight | SSW: Competitive Japanese Wages + Social Insurance',
    age_limit_relaxation: 'MEXT Research: Under 35 yrs | MEXT UG: 17–24 yrs | SSW: 18+ yrs',
    qualification_odia_rule: 'MEXT: Embassy Track screening in India (May–July) + Written/Interview; Japanese not always mandatory for English-taught PG | SSW: JLPT N4 / JFT-Basic + Skill Test via NSDC-approved India centres',
    selection_stages: 'MEXT: 1. Apply via Embassy of Japan in India -> 2. Document Screening & Written Exam -> 3. Interview -> 4. University Placement | SSW: 1. Pass JFT-Basic/JLPT N4 + Sector Skill Test -> 2. NSDC Verified Employer Match -> 3. CoE & Japan Visa',
    pst_pet_skill_norms: 'Use ONLY NSDC-empanelled Sending Organisations (SOs) for Japan TITP/SSW placements in India to avoid illegal recruitment fees.',
    documents_checklist: '1. MEXT Application Form & Field of Study/Research Proposal\n2. Academic Transcripts & Recommendation Letters\n3. Medical Certificate (MEXT format)\n4. For SSW: JLPT N4 / JFT-Basic & Sector Skill Pass Certificate',
    application_steps: '1. Check Embassy of Japan in India (in.emb-japan.go.jp) MEXT notifications every April–May.\n2. For SSW technical/caregiving jobs, enrol only with NSDC/OSDA-verified Japanese language & skill centres.',
    official_portal_url: 'https://www.in.emb-japan.go.jp/',
    summary_en: 'Complete Japan MEXT scholarship (¥117k–¥145k/mo + full tuition) and Specified Skilled Worker (SSW/TITP) guide covering JLPT N4/JFT-Basic and NSDC verified recruitment.',
    summary_or: 'ଜାପାନ MEXT ବୃତ୍ତି (ମାସିକ ¥୧୧୭,୦୦୦–¥୧୪୫,୦୦୦ + ଟ୍ୟୁସନ୍) ଏବଂ SSW/TITP ଦକ୍ଷ ଶ୍ରମିକ ପଥ: JLPT N4/JFT-Basic, ଦକ୍ଷତା ପରୀକ୍ଷା ଏବଂ NSDC ଯାଞ୍ଚ ପ୍ରକ୍ରିୟା।',
    body_html: '<h3>Dual Japan Pathways: MEXT Academic & SSW Skilled Careers</h3><p><strong>MEXT</strong> funds Undergraduate, Master’s, and PhD scholars in Japan with zero tuition and generous monthly stipends. Separately, India-Japan <strong>SSW (Specified Skilled Worker)</strong> opens legal employment in Caregiving, Nursing, Manufacturing, Hospitality, and Agriculture via JLPT N4 / JFT-Basic.</p>',
    body_or: '<h3>ଜାପାନରେ ଅଧ୍ୟୟନ (MEXT) ଏବଂ ଦକ୍ଷ ନିଯୁକ୍ତି (SSW)</h3><p>MEXT ବୃତ୍ତି ମାଧ୍ୟମରେ ଜାପାନରେ ବିନା ଖର୍ଚ୍ଚରେ ଉଚ୍ଚଶିକ୍ଷା ଏବଂ NSDC ସ୍ୱୀକୃତ SSW/TITP ମାଧ୍ୟମରେ ନର୍ସିଂ, ଉତ୍ପାଦନ ଓ କୃଷି କ୍ଷେତ୍ରରେ ସୁରକ୍ଷିତ ନିଯୁକ୍ତି ମିଳିଥାଏ।</p>',
    tags: ['MEXT Japan', 'SSW Japan', 'JLPT N4', 'Study in Japan']
  },
  {
    id: 'ji-io-erasmus-mundus',
    folderKey: 'global competitions, awards and fellowships',
    fallbackFolder: 'jf-io-global-scholarships',
    slug: 'erasmus-mundus-joint-masters-emjmd-eu-guide',
    title: 'Erasmus Mundus Joint Master’s Degrees (EMJMD European Union) — Fully-Funded Multi-Country Study & Stipend Guide',
    title_or: 'ଇରାସମସ୍ ମୁଣ୍ଡସ୍ ଯୁଗ୍ମ ମାଷ୍ଟର୍ସ ଡିଗ୍ରୀ (EMJMD ୟୁରୋପୀୟ ସଂଘ) — ସମ୍ପୂର୍ଣ୍ଣ ଅର୍ଥପୋଷିତ ବହୁ-ଦେଶୀୟ ଅଧ୍ୟୟନ ଗାଇଡ୍',
    conducting_body: 'European Commission (EACEA) & Consortium of European Universities',
    exam_code: 'EU-ERASMUS-EMJMD',
    cadre_group: '2-Year Joint Master’s across 2–4 European Countries',
    pay_matrix: '100% Tuition + €1,400/month Living Allowance (24 months) + Travel & Installation Grants',
    age_limit_relaxation: 'No upper age limit; open to graduates from any discipline matching programme prerequisites',
    qualification_odia_rule: 'Bachelor’s Degree in relevant discipline + IELTS (6.5+) / TOEFL; apply directly to up to 3 EMJMD programme consortia per cycle (Oct–Feb)',
    selection_stages: '1. Search EMJMD Catalogue -> 2. Direct Online Application to Programme Consortium (SOP, CV, LORs) -> 3. Consortium Academic Review & Interview -> 4. EU Scholarship Award -> 5. Multi-Country Schengen Visas',
    pst_pet_skill_norms: 'Students study in at least 2–3 different EU countries and graduate with a joint or multiple European Master’s degree.',
    documents_checklist: '1. Bachelor’s Degree & Transcripts\n2. Motivation Letter tailored to Multi-Country Mobility\n3. 2–3 Academic/Professional Reference Letters\n4. IELTS / TOEFL Scorecard & Passport',
    application_steps: '1. Browse all active funded programmes at erasmus-plus.ec.europa.eu.\n2. Apply directly on each programme’s portal between October and February.\n3. Highlight cross-cultural adaptability and academic excellence.',
    official_portal_url: 'https://erasmus-plus.ec.europa.eu/',
    summary_en: 'Complete EU Erasmus Mundus (EMJMD) scholarship guide: study in 2–4 European countries with full tuition waiver, €1,400/month stipend, and direct consortium application steps.',
    summary_or: 'ଇରାସମସ୍ ମୁଣ୍ଡସ୍ (EMJMD) ୟୁରୋପୀୟ ସଂଘ ବୃତ୍ତି: ୨–୪ଟି ୟୁରୋପୀୟ ଦେଶରେ ଅଧ୍ୟୟନ, ସମ୍ପୂର୍ଣ୍ଣ ଟ୍ୟୁସନ୍ ଛାଡ଼, ମାସିକ €୧,୪୦୦ ଭତ୍ତା ଏବଂ ଆବେଦନ ପ୍ରକ୍ରିୟାର ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍।',
    body_html: '<h3>Study Across Europe With €1,400/Month Stipend</h3><p><strong>Erasmus Mundus Joint Master’s (EMJMD)</strong> programmes allow Odisha graduates to study across 2–4 European universities while receiving <strong>€1,400/month</strong> plus full tuition and travel coverage.</p>',
    body_or: '<h3>ୟୁରୋପର ଏକାଧିକ ଦେଶରେ ମାଷ୍ଟର୍ସ ଓ €୧,୪୦୦ ମାସିକ ଭତ୍ତା</h3><p>ଇରାସମସ୍ ମୁଣ୍ଡସ୍ ବୃତ୍ତିରେ ଓଡ଼ିଶାର ସ୍ନାତକମାନେ ୨ ରୁ ୪ଟି ୟୁରୋପୀୟ ଦେଶରେ ଅଧ୍ୟୟନ କରିବା ସହିତ ମାସିକ €୧,୪୦୦ ଭତ୍ତା ଏବଂ ସମ୍ପୂର୍ଣ୍ଣ ଟ୍ୟୁସନ୍ ଛାଡ଼ ପାଇପାରିବେ।</p>',
    tags: ['Erasmus Mundus', 'EMJMD', 'Study in Europe', 'EU Scholarship']
  },
  {
    id: 'ji-io-usa-f1-stem-opt',
    folderKey: 'international education and admissions',
    fallbackFolder: 'jf-io-global-scholarships',
    slug: 'usa-f1-student-visa-stem-opt-j1-research-funding-guide',
    title: 'USA Higher Education & Research (F-1 Student Visa, STEM OPT 36-Month Extension, J-1 Research Scholar, GRE/TOEFL & Funding)',
    title_or: 'ଆମେରିକା ଉଚ୍ଚଶିକ୍ଷା ଓ ଗବେଷଣା (F-1 ଛାତ୍ର ଭିସା, STEM OPT ୩୬-ମାସ ସମ୍ପ୍ରସାରଣ, J-1 ଗବେଷକ ଓ ଫଣ୍ଡିଂ ଗାଇଡ୍)',
    conducting_body: 'US Department of State / SEVP / EducationUSA India',
    exam_code: 'USA-F1-STEM-OPT',
    cadre_group: 'US Bachelor’s, Master’s, PhD (RA/TA Funding) & J-1 Research Scholars',
    pay_matrix: 'PhD RA/TA: Full Tuition + $28,000–$45,000/yr Stipend | Post-Study Work: 12-Mo OPT + 24-Mo STEM OPT = 36 Months',
    age_limit_relaxation: 'No upper age limit; genuine academic intent & strong home-country ties required for F-1 visa interview',
    qualification_odia_rule: 'GRE/GMAT (where required) + TOEFL iBT/IELTS + Form I-20 + SEVIS I-901 Fee ($350) + DS-160 + US Embassy/Consulate Visa Interview',
    selection_stages: '1. University Admission + RA/TA/Fellowship Offer -> 2. Receive Form I-20 -> 3. Pay SEVIS I-901 Fee & Submit DS-160 -> 4. OFC Biometrics & Consular Interview -> 5. Graduate -> 12-Mo OPT (+24-Mo STEM Extension)',
    pst_pet_skill_norms: 'Verify SEVP accreditation and CIP code eligibility for the 24-month STEM OPT extension before enrolling in any US Master’s programme.',
    documents_checklist: '1. Valid Passport & Form I-20 (signed)\n2. DS-160 Confirmation & SEVIS I-901 Fee Receipt\n3. Financial Support Proof (RA/TA Letter / Sanctioned Education Loan / Liquid Funds)\n4. Academic Transcripts & GRE/TOEFL/IELTS Scores',
    application_steps: '1. Use EducationUSA India (educationusa.state.gov) free advising to shortlist accredited US universities.\n2. Target funded PhD/MS programmes offering Research/Teaching Assistantships.\n3. Book F-1 visa slot early (90–120 days before I-20 start date).',
    official_portal_url: 'https://educationusa.state.gov/',
    summary_en: 'Complete USA study & research guide covering Form I-20, SEVIS, F-1 visa interview prep, RA/TA PhD funding, and 36-month STEM OPT post-study work rules.',
    summary_or: 'ଆମେରିକା ଉଚ୍ଚଶିକ୍ଷା ଗାଇଡ୍: Form I-20, SEVIS ଫି, F-1 ଭିସା ସାକ୍ଷାତକାର, PhD RA/TA ଫଣ୍ଡିଂ ଏବଂ ସ୍ନାତକୋତ୍ତର ୩୬ ମାସର STEM OPT କାର୍ଯ୍ୟ ଅନୁମତିର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।',
    body_html: '<h3>US F-1 Visa & 36-Month STEM OPT Advantage</h3><p>Students completing accredited US STEM degrees qualify for <strong>12 months of OPT plus a 24-month STEM OPT extension (36 months total)</strong> of US work authorization, while PhD students typically receive full tuition waivers and RA/TA stipends.</p>',
    body_or: '<h3>ଆମେରିକା F-1 ଭିସା ଏବଂ ୩୬-ମାସର STEM OPT ସୁବିଧା</h3><p>ଆମେରିକାରେ STEM ଡିଗ୍ରୀ ସମାପ୍ତ କଲା ପରେ ୩୬ ମାସ ପର୍ଯ୍ୟନ୍ତ କାର୍ଯ୍ୟ ଅନୁମତି (OPT) ମିଳିଥାଏ ଏବଂ PhD ଛାତ୍ରମାନେ RA/TA ମାଧ୍ୟମରେ ସମ୍ପୂର୍ଣ୍ଣ ଫି ଛାଡ଼ ଓ ଭତ୍ତା ପାଇଥାନ୍ତି।</p>',
    tags: ['USA F-1 Visa', 'STEM OPT', 'J-1 Research', 'EducationUSA']
  },
  {
    id: 'ji-io-uk-canada-australia-migration',
    folderKey: 'skilled trades and technical employment',
    fallbackFolder: 'jf-io-wes-visas',
    slug: 'uk-canada-australia-skilled-migration-post-study-work-guide',
    title: 'UK, Canada & Australia Skilled Migration & Post-Study Work Pathways (UK Graduate & Health/Care Visa, Canada Express Entry, Australia Subclass 485/189/190)',
    title_or: 'UK, କାନାଡ଼ା ଏବଂ ଅଷ୍ଟ୍ରେଲିଆ ଦକ୍ଷ ପ୍ରବାସ ଓ ଅଧ୍ୟୟନ-ପରବର୍ତ୍ତୀ କାର୍ଯ୍ୟ ଭିସା ଗାଇଡ୍ (Graduate Visa, Express Entry, Subclass 485/189)',
    conducting_body: 'UK Home Office / IRCC Canada / Department of Home Affairs Australia',
    exam_code: 'UK-CA-AU-SKILLED',
    cadre_group: 'Post-Study Graduates & Skilled Professionals (IT, Healthcare, Engineering, Trades)',
    pay_matrix: 'Local Market Salaries + Transparent Official Government Visa Portals (No Middlemen Needed)',
    age_limit_relaxation: 'Canada Express Entry & Australia Subclass 189/190 award maximum CRS/points between ages 20–32',
    qualification_odia_rule: 'Mandatory Educational Credential Assessment (WES/IQAS for Canada; VETASSESS/ACS/ANMAC for Australia) + Official Language Test (IELTS/PTE/CELPIP)',
    selection_stages: 'UK: Student Route -> Graduate Route (2–3 Yrs) -> Skilled Worker / Health & Care Visa | Canada: WES ECA + IELTS -> Express Entry CRS Pool -> ITA -> PR | Australia: Skills Assessment + IELTS/PTE -> EOI SkillSelect -> Subclass 189/190',
    pst_pet_skill_norms: 'Apply ONLY via official government portals (gov.uk, canada.ca, immi.homeaffairs.gov.au); never pay unregulated agents for fake LMIA or fake job offers.',
    documents_checklist: '1. WES / Skills Assessment Report\n2. IELTS General/Academic or PTE Academic Score\n3. Experience Letters, Pay Slips & Tax Returns\n4. Police Clearance Certificate (PCC) & Medical Exam',
    application_steps: '1. Complete WES or Australian Skills Assessment directly.\n2. Calculate official CRS (Canada) or SkillSelect (Australia) score on government portals.\n3. Submit profile directly online without paying middlemen for guaranteed visas.',
    official_portal_url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
    summary_en: 'Transparent guide to UK Graduate & Health/Care visas, Canada Express Entry (WES + CRS), and Australia Subclass 485/189/190 skilled migration using official government portals.',
    summary_or: 'UK ଗ୍ରାଜୁଏଟ୍ ଓ ହେଲ୍ଥ-କେୟାର ଭିସା, କାନାଡ଼ା ଏକ୍ସପ୍ରେସ୍ ଏଣ୍ଟ୍ରି (WES + CRS) ଏବଂ ଅଷ୍ଟ୍ରେଲିଆ Subclass 485/189/190 ଦକ୍ଷ ପ୍ରବାସର ସରକାରୀ ପୋର୍ଟାଲ୍ ଆଧାରିତ ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍।',
    body_html: '<h3>Official Points-Based & Post-Study Pathways</h3><p>All three destinations use transparent digital portals (<strong>gov.uk</strong>, <strong>canada.ca</strong>, <strong>immi.homeaffairs.gov.au</strong>). Candidates should verify UK sponsor lists, obtain genuine <strong>WES</strong> assessments for Canada, and complete Australian Skills Assessments directly.</p>',
    body_or: '<h3>ସରକାରୀ ପୋର୍ଟାଲ୍ ମାଧ୍ୟମରେ ସ୍ୱଚ୍ଛ ଭିସା ପ୍ରକ୍ରିୟା</h3><p>UK, କାନାଡ଼ା ଏବଂ ଅଷ୍ଟ୍ରେଲିଆରେ ଦକ୍ଷ କାର୍ଯ୍ୟ ଭିସା ଓ ସ୍ଥାୟୀ ପ୍ରବାସ (PR) ପାଇଁ କେବଳ ସରକାରୀ ୱେବସାଇଟ୍ ବ୍ୟବହାର କରନ୍ତୁ ଏବଂ ନକଲି ଜବ୍-ଅଫର୍ ଏଜେଣ୍ଟଙ୍କଠାରୁ ଦୂରେଇ ରୁହନ୍ତୁ।</p>',
    tags: ['UK Skilled Worker', 'Canada Express Entry', 'Australia 189 190', 'WES']
  },
  {
    id: 'ji-io-gcc-healthcare-engineering',
    folderKey: 'healthcare and nursing employment',
    fallbackFolder: 'jf-io-wes-visas',
    slug: 'gcc-middle-east-healthcare-nursing-engineering-careers-guide',
    title: 'GCC & Middle East Overseas Healthcare, Nursing & Engineering Careers (UAE, Saudi Arabia, Qatar, Oman — DataFlow PSV, Prometric/DHA/MOH & e-Migrate)',
    title_or: 'GCC ଓ ମଧ୍ୟପ୍ରାଚ୍ୟ ସ୍ୱାସ୍ଥ୍ୟସେବା, ନର୍ସିଂ ଏବଂ ଇଞ୍ଜିନିୟରିଂ କ୍ୟାରିଅର୍ ଗାଇଡ୍ (DataFlow, Prometric/DHA/MOH ଓ e-Migrate)',
    conducting_body: 'UAE DHA/MOH/DOH, Saudi SCFHS, Qatar DHP, Oman OMSB & MEA e-Migrate',
    exam_code: 'GCC-DATAFLOW-PROMETRIC',
    cadre_group: 'GNM / B.Sc. Nurses, Doctors, Pharmacists, Lab Techs & Civil/MEP/Oil-Gas Engineers',
    pay_matrix: 'Tax-Free GCC Salaries + Employer Housing/Medical + Annual Leave Ticket + Mandatory PBBY Protection',
    age_limit_relaxation: 'Typically 21–45 yrs with minimum 2 years post-registration clinical experience for GCC healthcare licensing',
    qualification_odia_rule: 'Active Odisha Nursing/Medical/Pharmacy Council Registration + DataFlow Primary Source Verification (PSV) + Prometric / DHA / MOH / HAAD exam + MEA e-Migrate RA check',
    selection_stages: '1. Complete 2 Yrs Clinical Experience in India -> 2. DataFlow PSV Credential Verification -> 3. Pass DHA/MOH/DOH/Prometric CBT -> 4. Verify GCC Employer & RA on emigrate.gov.in -> 5. GAMCA/Wafid Medical -> 6. Employment Visa',
    pst_pet_skill_norms: 'Healthcare workers from India must undergo Wafid (formerly GAMCA) medical test and verify employer demand through MEA e-Migrate / NORKA / ODEPC / state overseas cells.',
    documents_checklist: '1. Degree/GNM Diploma + Odisha Nursing/Medical Council Registration\n2. 2+ Years Hospital Experience Certificate\n3. DataFlow PSV Report & Prometric/DHA Pass Letter\n4. MEA Apostille + Embassy Attestation & Wafid Medical Fitness',
    application_steps: '1. Clear DataFlow PSV and Prometric/DHA/MOH licensing exam directly.\n2. Apply through licensed e-Migrate Recruiting Agents or direct hospital portals.\n3. Never travel on a Visit Visa for GCC hospital or construction jobs.',
    official_portal_url: 'https://emigrate.gov.in/',
    summary_en: 'Complete GCC (UAE, Saudi, Qatar, Oman) healthcare, nursing & engineering career guide covering DataFlow PSV, DHA/MOH/Prometric exams, Wafid medical, and MEA e-Migrate safety.',
    summary_or: 'GCC (UAE, ସାଉଦି, କତାର, ଓମାନ) ନର୍ସିଂ, ସ୍ୱାସ୍ଥ୍ୟସେବା ଓ ଇଞ୍ଜିନିୟରିଂ କ୍ୟାରିଅର୍ ଗାଇଡ୍: DataFlow PSV, DHA/MOH/Prometric ପରୀକ୍ଷା, Wafid ମେଡିକାଲ୍ ଏବଂ e-Migrate ସୁରକ୍ଷା।',
    body_html: '<h3>GCC Healthcare Licensing & Safe Recruitment</h3><p>Odisha B.Sc./GNM Nurses and Paramedics targeting UAE, Saudi Arabia, Qatar, or Oman must complete <strong>DataFlow Primary Source Verification (PSV)</strong> and pass <strong>DHA / MOH / DOH / Prometric</strong> CBT exams, then depart strictly via e-Migrate verified employment contracts.</p>',
    body_or: '<h3>GCC ସ୍ୱାସ୍ଥ୍ୟସେବା ଲାଇସେନ୍ସିଂ ଏବଂ ସୁରକ୍ଷିତ ନିଯୁକ୍ତି</h3><p>ଓଡ଼ିଶାର ନର୍ସ ଓ ସ୍ୱାସ୍ଥ୍ୟକର୍ମୀମାନେ DataFlow PSV ଏବଂ DHA/MOH/Prometric ପରୀକ୍ଷା ଉତ୍ତୀର୍ଣ୍ଣ ହୋଇ e-Migrate ପଞ୍ଜୀକୃତ ଚୁକ୍ତି ମାଧ୍ୟମରେ GCC ଦେଶରେ ଟିକସ-ମୁକ୍ତ ଚାକିରି ପାଇପାରିବେ।</p>',
    tags: ['GCC Nursing', 'DataFlow PSV', 'Prometric DHA', 'e-Migrate']
  },
  {
    id: 'ji-io-tests-apostille-checklist',
    folderKey: 'international admission requirements',
    fallbackFolder: 'jf-io-wes-visas',
    slug: 'standardized-tests-ielts-gre-goethe-jlpt-and-mea-apostille-checklist',
    title: 'Standardized Tests (IELTS, TOEFL iBT, PTE, GRE, GMAT, Goethe German, JLPT) & Odisha Document Attestation / MEA Apostille Master Checklist',
    title_or: 'ଆନ୍ତର୍ଜାତୀୟ ପରୀକ୍ଷା (IELTS, TOEFL, GRE, Goethe, JLPT) ଏବଂ ଓଡ଼ିଶା ଡକ୍ୟୁମେଣ୍ଟ ଆଟେଷ୍ଟେସନ୍ / MEA ଆପୋଷ୍ଟିଲ୍ ଚେକ୍-ଲିଷ୍ଟ',
    conducting_body: 'IDP/British Council, ETS, Pearson, GMAC, Goethe-Institut, JLPT & MEA India (Apostille)',
    exam_code: 'TESTS-MEA-APOSTILLE',
    cadre_group: 'All Study Abroad, Fellowship & Skilled Migration Applicants from Odisha',
    pay_matrix: 'IELTS/TOEFL/PTE: ~₹17,000–₹18,000 | GRE/GMAT: $220–$275 | MEA Apostille: ₹50 per document at RPO/outsourced centres',
    age_limit_relaxation: 'Test scores valid 2 years (IELTS/TOEFL/PTE) or 5 years (GRE/GMAT); Apostille required for Hague Convention countries',
    qualification_odia_rule: 'Odisha Attestation Chain: University/CHSE/BSE Verification -> Higher Education/Home Dept Odisha (Lok Seva Bhawan / Bhubaneswar) -> MEA Apostille / Embassy Attestation',
    selection_stages: '1. Book Official Test at Bhubaneswar/Cuttack/Online -> 2. Obtain Original Degree/Transcripts -> 3. State Home/Higher Ed Attestation (Odisha) -> 4. MEA Apostille (New Delhi / e-Sanad) -> 5. Embassy Attestation (Non-Hague GCC)',
    pst_pet_skill_norms: 'Use MEA e-Sanad (esanad.nic.in) for contactless online verification and Apostille where your Odisha university is onboarded.',
    documents_checklist: '1. Valid Indian Passport (Must match test registration name identically)\n2. Original Degree Certificate, Consolidated Marksheets & Birth/Marriage Certificate\n3. Official Language/Aptitude Scorecards\n4. e-Sanad / MEA Apostille Stamp',
    application_steps: '1. Register for IELTS/TOEFL/GRE/Goethe/JLPT using exact Passport spelling.\n2. For document legalization, check esanad.nic.in or complete Odisha State Home/Higher Education attestation before MEA Apostille.',
    official_portal_url: 'https://esanad.nic.in/',
    summary_en: 'Master Odisha checklist for IELTS, TOEFL iBT, PTE, GRE, GMAT, Goethe German, JLPT exams plus step-by-step Odisha State Authentication -> MEA Apostille & e-Sanad legalization.',
    summary_or: 'ଆନ୍ତର୍ଜାତୀୟ ପରୀକ୍ଷା (IELTS, TOEFL, GRE, Goethe, JLPT) ଏବଂ ଓଡ଼ିଶା ଡକ୍ୟୁମେଣ୍ଟ ଆଟେଷ୍ଟେସନ୍ / MEA ଆପୋଷ୍ଟିଲ୍ (e-Sanad) ର ସମ୍ପୂର୍ଣ୍ଣ ମାଷ୍ଟର ଚେକ୍-ଲିଷ୍ଟ।',
    body_html: '<h3>Odisha-to-MEA Document Legalization Chain</h3><p>For Hague Convention countries (Germany, UK, USA, EU, Japan, Australia), degrees and birth certificates must receive <strong>State Authentication (Odisha Home/Higher Education Dept)</strong> followed by <strong>MEA Apostille</strong> (or <strong>e-Sanad</strong>). Non-Hague GCC countries additionally require Embassy attestation.</p>',
    body_or: '<h3>ଓଡ଼ିଶାରୁ MEA ଆପୋଷ୍ଟିଲ୍ ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ ପ୍ରକ୍ରିୟା</h3><p>ବିଦେଶୀ ଭିସା ଓ ନାମଲେଖା ପାଇଁ ପ୍ରମାଣପତ୍ରଗୁଡ଼ିକ ଓଡ଼ିଶା ସରକାରଙ୍କ ଗୃହ/ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ ଦ୍ୱାରା ପ୍ରମାଣିତ ହେବା ପରେ <strong>MEA Apostille / e-Sanad</strong> ହେବା ଆବଶ୍ୟକ।</p>',
    tags: ['IELTS TOEFL GRE', 'MEA Apostille', 'e-Sanad', 'Odisha Attestation']
  }
];

export async function enrichInternationalCategory06(db, now) {
  if (!db) return { foldersUpdated: 0, itemsUpserted: 0 };
  const ts = now || new Date().toISOString();

  // 1. Enrich all depth >= 1 folders in Category #06
  const foldersRes = await db
    .prepare("SELECT * FROM jobs_directory_folders WHERE domain_slug IN ('international-overseas', 'international-and-overseas-opportunities') ORDER BY depth ASC, sort_order ASC, title ASC")
    .all();
  const folders = foldersRes.results || [];
  const folderById = new Map(folders.map((f) => [f.id, f]));
  const folderByTitle = new Map(folders.map((f) => [String(f.title || '').trim().toLowerCase(), f]));

  const folderStmts = [];
  for (const f of folders) {
    if (f.depth === 0) continue;
    if (isCustomAdminEdit(f)) continue;

    const key = String(f.title || '').trim().toLowerCase();
    const parent = f.parent_id ? folderById.get(f.parent_id) : null;
    const spec = CAT06_FOLDER_ENRICHMENTS[key] || buildSmartInternationalFolderEnrichment(f, parent ? parent.title : '');

    const needsEn = isShort160(f.description_en) || isShort160(f.description);
    const needsOr = isShort160(f.description_or);
    const needsTitleOr = !String(f.title_or || '').trim();
    const needsBadge = !String(f.featured_badge || f.hero_badge || '').trim();
    const needsSeoTitle = !String(f.seo_title || '').trim();
    const needsSeoDesc = isShort160(f.seo_description);
    const needsVerified = !String(f.verified_at || '').trim();

    if (!needsEn && !needsOr && !needsTitleOr && !needsBadge && !needsSeoTitle && !needsSeoDesc && !needsVerified) {
      continue;
    }

    const nextDescEn = isShort160(f.description_en)
      ? (isShort160(f.description) ? spec.en : f.description)
      : f.description_en;
    const nextDesc = isShort160(f.description) ? nextDescEn : f.description;
    const nextDescOr = needsOr ? spec.or : f.description_or;
    const nextTitleOr = needsTitleOr ? spec.title_or : f.title_or;
    const nextBadge = String(f.featured_badge || f.hero_badge || spec.badge).trim();
    const nextSeoTitle = needsSeoTitle ? `${f.title} (${nextBadge}) — CSOdisha International` : f.seo_title;
    const nextSeoDesc = needsSeoDesc ? nextDescEn.slice(0, 300) : f.seo_description;
    const nextVerifiedAt = f.verified_at || ts;

    folderStmts.push(
      db.prepare(`UPDATE jobs_directory_folders
        SET description = ?, description_en = ?, description_or = ?, title_or = ?,
            hero_badge = ?, featured_badge = ?, seo_title = ?, seo_description = ?,
            verified_at = ?, updated_by = 'cat06-enrich', updated_at = ?
        WHERE id = ?`)
        .bind(
          nextDesc,
          nextDescEn,
          nextDescOr,
          nextTitleOr,
          nextBadge,
          nextBadge,
          nextSeoTitle.slice(0, 160),
          nextSeoDesc,
          nextVerifiedAt,
          ts,
          f.id
        )
    );
  }

  for (let i = 0; i < folderStmts.length; i += 45) {
    await db.batch(folderStmts.slice(i, i + 45));
  }

  // 2. Upsert all 12 International & Overseas handbooks
  const existingItemsRes = await db
    .prepare("SELECT id, slug, updated_by FROM jobs_directory_items WHERE domain_slug IN ('international-overseas', 'international-and-overseas-opportunities')")
    .all();
  const existingById = new Map((existingItemsRes.results || []).map((r) => [r.id, r]));
  const existingBySlug = new Map((existingItemsRes.results || []).map((r) => [r.slug, r]));

  const itemStmts = [];
  for (const item of CAT06_HANDBOOKS) {
    const existing = existingById.get(item.id) || existingBySlug.get(item.slug);
    if (existing && existing.updated_by && !SYSTEM_AUTHORS.has(String(existing.updated_by).toLowerCase())) {
      continue;
    }

    const matchedFolder =
      folderByTitle.get(item.folderKey) ||
      folderById.get(item.fallbackFolder) ||
      folders.find((f) => f.depth >= 1) ||
      null;
    const folderId = matchedFolder ? matchedFolder.id : item.fallbackFolder;
    const bodyHtml = `${item.body_html}${item.body_or || ''}`;
    const seoTitle = `${item.title} | CSOdisha International`.slice(0, 160);
    const seoDesc = item.summary_en.slice(0, 300);

    if (existing) {
      itemStmts.push(
        db.prepare(`UPDATE jobs_directory_items
          SET folder_id = ?, title = ?, title_or = ?, item_type = 'overseas-track',
              recruiting_body = ?, conducting_body = ?, exam_code = ?, cadre_group = ?,
              pay_matrix = ?, age_limit_relaxation = ?, qualification_odia_rule = ?,
              selection_stages = ?, pst_pet_skill_norms = ?, documents_checklist = ?,
              application_steps = ?, qualification_tag = ?,
              official_apply_url = ?, official_portal_url = ?,
              tags_json = ?, language = 'EN+OR', status = 'published', featured = 1,
              summary = ?, body_html = ?, seo_title = ?, seo_description = ?,
              verified_by = 'cat06-enrich@csodisha.com', verified_at = ?,
              updated_by = 'cat06-enrich', updated_at = ?
          WHERE id = ?`)
          .bind(
            folderId, item.title, item.title_or,
            item.conducting_body, item.conducting_body, item.exam_code, item.cadre_group,
            item.pay_matrix, item.age_limit_relaxation, item.qualification_odia_rule,
            item.selection_stages, item.pst_pet_skill_norms, item.documents_checklist,
            item.application_steps, item.cadre_group,
            item.official_portal_url, item.official_portal_url,
            JSON.stringify(item.tags), item.summary_en, bodyHtml,
            seoTitle, seoDesc, ts, ts, existing.id
          )
      );
    } else {
      itemStmts.push(
        db.prepare(`INSERT OR IGNORE INTO jobs_directory_items
          (id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body, conducting_body,
           exam_code, cadre_group, pay_matrix, age_limit_relaxation, qualification_odia_rule,
           selection_stages, pst_pet_skill_norms, documents_checklist, application_steps,
           qualification_tag, official_apply_url, official_portal_url,
           cover_image_url, cover_image_alt, attachments_json, links_json, tags_json,
           language, status, featured, summary, body_html, seo_title, seo_description,
           verified_by, verified_at, state_location, created_by, updated_by, created_at, updated_at)
          VALUES (?, 'international-overseas', ?, ?, ?, ?, 'overseas-track', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, 'EN+OR', 'published', 1, ?, ?, ?, ?, 'cat06-enrich@csodisha.com', ?, 'Odisha / Global', 'cat06-enrich', 'cat06-enrich', ?, ?)`)
          .bind(
            item.id, folderId, item.title, item.title_or, item.slug,
            item.conducting_body, item.conducting_body, item.exam_code, item.cadre_group,
            item.pay_matrix, item.age_limit_relaxation, item.qualification_odia_rule,
            item.selection_stages, item.pst_pet_skill_norms, item.documents_checklist,
            item.application_steps, item.cadre_group,
            item.official_portal_url, item.official_portal_url,
            JSON.stringify(item.tags), item.summary_en, bodyHtml,
            seoTitle, seoDesc, ts, ts, ts
          )
      );
    }
  }

  for (let i = 0; i < itemStmts.length; i += 30) {
    await db.batch(itemStmts.slice(i, i + 30));
  }

  return { foldersUpdated: folderStmts.length, itemsUpserted: itemStmts.length };
}
