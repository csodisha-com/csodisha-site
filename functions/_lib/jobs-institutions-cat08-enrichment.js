// Category #08 (v75): Exhaustive Minute Bilingual Enrichment of Institutions, Official Portals & Verification (27 Subcategories + 12 Handbooks)
// Idempotent D1 enrichment routine invoked by ensureJobsDirectoryStudioSchema(db).

const SYSTEM_AUTHORS = new Set(['seed', 'legacy-bridge', 'system', 'cat01-enrich', 'cat02-enrich', 'cat03-enrich', 'cat04-enrich', 'cat05-enrich', 'cat06-enrich', 'cat07-enrich', 'cat08-enrich', '']);

function isShort160(val) {
  return String(val || '').trim().length < 160;
}

function isCustomAdminEdit(row) {
  const updater = String(row?.updated_by || '').trim().toLowerCase();
  if (!updater || SYSTEM_AUTHORS.has(updater)) return false;
  return !isShort160(row?.description_en || row?.description) && !isShort160(row?.description_or);
}

// Tailored >=160-char bilingual metadata for key Category #08 folders
const CAT08_FOLDER_ENRICHMENTS = {
  'educational institutions directory': {
    title_or: 'ଶିକ୍ଷାନୁଷ୍ଠାନ ଡାଇରେକ୍ଟୋରୀ (ଓଡ଼ିଶା, ଭାରତ ଓ ବିଶ୍ୱ)',
    badge: 'INSTITUTIONS',
    en: 'Verified directory of premier central institutes in Odisha (IIT Bhubaneswar, NIT Rourkela, NISER, AIIMS, IIM Sambalpur, CUO), Odisha State Public & Technical Universities, and accredited national/global institutions.',
    or: 'ଶିକ୍ଷାନୁଷ୍ଠାନ ଡାଇରେକ୍ଟୋରୀ: IIT ଭୁବନେଶ୍ୱର, NIT ରାଉରକେଲା, NISER, AIIMS, IIM ସମ୍ବଲପୁର, ଓଡ଼ିଶାର ସରକାରୀ ଓ ବୈଷୟିକ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଏବଂ ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ଜାତୀୟ/ଆନ୍ତର୍ଜାତୀୟ ଅନୁଷ୍ଠାନ ସୂଚନା।'
  },
  'official recruitment authorities and portals': {
    title_or: 'ସରକାରୀ ନିଯୁକ୍ତି କର୍ତ୍ତୃପକ୍ଷ ଏବଂ ପୋର୍ଟାଲ୍',
    badge: 'OFFICIAL PORTALS',
    en: 'Authoritative .gov.in and .nic.in directory for Odisha commissions (OPSC, OSSC, OSSSC, OPRB, SSB Odisha, High Court) and Central agencies (UPSC, SSC, IBPS, RRB Bhubaneswar, NTA) with OTR and result links.',
    or: 'ସରକାରୀ ନିଯୁକ୍ତି ପୋର୍ଟାଲ୍: OPSC, OSSC, OSSSC, OPRB, SSB ଓଡ଼ିଶା, ହାଇକୋର୍ଟ ଏବଂ UPSC, SSC, IBPS, RRB ଭୁବନେଶ୍ୱର ଓ NTA ର ପ୍ରାମାଣିକ .gov.in / .nic.in ୱେବସାଇଟ୍ ଓ OTR ଲିଙ୍କ୍।'
  },
  'professional, regulatory and accreditation authorities': {
    title_or: 'ବୃତ୍ତିଗତ, ନିୟାମକ ଏବଂ ମାନ୍ୟତା କର୍ତ୍ତୃପକ୍ଷ',
    badge: 'REGULATORS',
    en: 'Complete verification directory for UGC (including UGC-DEB distance/online validity), AICTE, NCTE, NMC, INC, PCI, BCI, NAAC accreditation grades, and NIRF rankings to prevent unapproved-degree admission traps.',
    or: 'ନିୟାମକ ଓ ମାନ୍ୟତା କର୍ତ୍ତୃପକ୍ଷ: ନାମଲେଖା ପୂର୍ବରୁ UGC (UGC-DEB), AICTE, NCTE, NMC, INC, PCI, BCI ଅନୁମୋଦନ, NAAC ଗ୍ରେଡ୍ ଏବଂ NIRF ର୍ୟାଙ୍କିଂ ଯାଞ୍ଚ କରିବାର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'official scholarship and financial support portals': {
    title_or: 'ସରକାରୀ ଛାତ୍ରବୃତ୍ତି ଏବଂ ଆର୍ଥିକ ସହାୟତା ପୋର୍ଟାଲ୍',
    badge: 'SCHOLARSHIP PORTALS',
    en: 'Verified government funding and payment gateways covering Odisha State Scholarship Portal (scholarship.odisha.gov.in), NSP (scholarships.gov.in), PFMS DBT payment tracking, PM-Vidyalaxmi, and KSSY.',
    or: 'ସରକାରୀ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍: ଓଡ଼ିଶା ରାଜ୍ୟ ସ୍କଲାରଶିପ୍ ପୋର୍ଟାଲ୍, ଜାତୀୟ NSP ପୋର୍ଟାଲ୍, PFMS DBT ପେମେଣ୍ଟ ଟ୍ରାକିଂ, PM-ବିଦ୍ୟାଲକ୍ଷ୍ମୀ ଏବଂ କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ ପୋର୍ଟାଲ୍ ସୂଚନା।'
  },
  'verification, safety and fraud prevention': {
    title_or: 'ଯାଞ୍ଚ, ସୁରକ୍ଷା ଏବଂ ପ୍ରତାରଣା ନିବାରଣ',
    badge: 'ANTI-FRAUD',
    en: 'Candidate protection toolkit covering fake recruitment notice checks, lookalike .com/.org phishing alerts, UPI/fee scam reporting (1930 / cybercrime.gov.in), MEA e-Migrate overseas checks, and fake university blacklists.',
    or: 'ପ୍ରତାରଣା ନିବାରଣ ଓ ସୁରକ୍ଷା: ନକଲି ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି, ଫିସିଂ ୱେବସାଇଟ୍, UPI ଠକେଇ ଅଭିଯୋଗ (୧୯୩୦ / cybercrime.gov.in), e-Migrate ଯାଞ୍ଚ ଏବଂ ନକଲି ବିଶ୍ୱବିଦ୍ୟାଳୟ ଚିହ୍ନଟ ଗାଇଡ୍।'
  },
  'career glossary and reference library': {
    title_or: 'କ୍ୟାରିଅର୍ ଶବ୍ଦକୋଷ ଏବଂ ସନ୍ଦର୍ଭ ପାଠାଗାର',
    badge: 'GLOSSARY',
    en: 'Clear bilingual glossary explaining Indian and Odisha education, recruitment, and international migration terms (OTR, ORSP, SEBC, EWS, ABC ID, DigiLocker, NAD, WES, Apostille, NAAC, NIRF, PFMS, NPCI).',
    or: 'କ୍ୟାରିଅର୍ ଶବ୍ଦକୋଷ: OTR, ORSP 2017, SEBC, EWS, ABC ID, DigiLocker, NAD, WES, ଆପୋଷ୍ଟିଲ୍, NAAC, NIRF, PFMS ଏବଂ NPCI ଭଳି ପ୍ରମୁଖ ଶବ୍ଦ ଓ ନିୟମର ସରଳ ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ବ୍ୟାଖ୍ୟା।'
  },
  'career information by geography': {
    title_or: 'ଭୌଗୋଳିକ କ୍ଷେତ୍ର ଅନୁଯାୟୀ କ୍ୟାରିଅର୍ ସୂଚନା',
    badge: 'GEOGRAPHY INDEX',
    en: 'Location-indexed career, exam, and institution portals across Odisha (all 30 districts, e-District, SAMS, EmpMission), Pan-India central agencies, and verified international destinations.',
    or: 'ଭୌଗୋଳିକ କ୍ଷେତ୍ର ଅନୁଯାୟୀ କ୍ୟାରିଅର୍: ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲା (e-District, SAMS, EmpMission), ଭାରତୀୟ କେନ୍ଦ୍ରୀୟ ନିଯୁକ୍ତି ସଂସ୍ଥା ଏବଂ ବିଦେଶୀ ଅଧ୍ୟୟନ ଓ ନିଯୁକ୍ତି ପୋର୍ଟାଲଗୁଡ଼ିକର ସ୍ଥାନ-ଭିତ୍ତିକ ସୂଚୀ।'
  },
  'opportunities by applicant group': {
    title_or: 'ଆବେଦନକାରୀ ବର୍ଗ ଅନୁଯାୟୀ ସୁଯୋଗ',
    badge: 'APPLICANT GROUPS',
    en: 'Tailored portal and verification pathways by applicant profile: School/CHSE students, Graduates, Women, SC/ST/SEBC/EWS, Divyangjan (UDID), Ex-Servicemen, Skilled Artisans, and Overseas Workers.',
    or: 'ଆବେଦନକାରୀ ବର୍ଗ ଅନୁଯାୟୀ ସୁଯୋଗ: ସ୍କୁଲ୍/ଯୁକ୍ତ-୨ ଛାତ୍ର, ସ୍ନାତକ, ମହିଳା, SC/ST/SEBC/EWS, ଦିବ୍ୟାଙ୍ଗ (UDID), ପୂର୍ବତନ ସୈନିକ ଏବଂ ପ୍ରବାସୀ ଶ୍ରମିକଙ୍କ ପାଇଁ ସ୍ୱତନ୍ତ୍ର ପୋର୍ଟାଲ୍ ସୂଚୀ।'
  }
};

function buildSmartInstitutionsFolderEnrichment(folder, parentTitle) {
  const title = String(folder.title || '').trim();
  const hay = `${title} ${parentTitle || ''} ${folder.slug || ''}`.toLowerCase();

  let badge = 'OFFICIAL PORTALS';
  let en = '';
  let or = '';

  if (hay.includes('fraud') || hay.includes('safety') || hay.includes('verification') || hay.includes('trust')) {
    badge = 'ANTI-FRAUD';
    en = `Verified ${title} protocol for Odisha citizens detailing authentic .gov.in/.nic.in domain checks, red-flag scam indicators, DigiLocker/e-District QR verification, and Cybercrime Helpline 1930 reporting.`;
    or = `${title} ସୁରକ୍ଷା ଯାଞ୍ଚ: ଓଡ଼ିଶାର ନାଗରିକଙ୍କ ପାଇଁ ପ୍ରାମାଣିକ .gov.in/.nic.in ଡୋମେନ୍ ଯାଞ୍ଚ, ନକଲି ନିଯୁକ୍ତି ସତର୍କତା, DigiLocker/e-District QR ଯାଞ୍ଚ ଏବଂ ସାଇବର ହେଲ୍ପଲାଇନ୍ ୧୯୩୦ ସୂଚନା।`;
  } else if (hay.includes('university') || hay.includes('institution') || hay.includes('odisha') || hay.includes('india') || hay.includes('international')) {
    badge = 'INSTITUTIONS';
    en = `Authoritative ${title} directory covering official websites, UGC/AICTE/NAAC accreditation status, SAMS/OJEE/JoSAA admission portals, ABC ID / DigiLocker NAD links, and student grievance desks.`;
    or = `${title} ଡାଇରେକ୍ଟୋରୀ: ସରକାରୀ ୱେବସାଇଟ୍, UGC/AICTE/NAAC ମାନ୍ୟତା ସ୍ଥିତି, SAMS/OJEE/JoSAA ନାମଲେଖା ପୋର୍ଟାଲ୍, ABC ID/DigiLocker NAD ଏବଂ ଛାତ୍ର ଅଭିଯୋଗ କେନ୍ଦ୍ରର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  } else if (hay.includes('glossary') || hay.includes('terms') || hay.includes('reference')) {
    badge = 'REFERENCE';
    en = `Bilingual ${title} reference guide explaining key statutory definitions, acronyms, portal codes, and verification workflows used across Odisha and Central recruitment, education, and migration portals.`;
    or = `${title} ସନ୍ଦର୍ଭ ଗାଇଡ୍: ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ର ସରକାରୀ ନିଯୁକ୍ତି, ଶିକ୍ଷା ଏବଂ ବିଦେଶୀ ପୋର୍ଟାଲରେ ବ୍ୟବହୃତ ପ୍ରମୁଖ ଶବ୍ଦ, ସଂକ୍ଷିପ୍ତ ନାମ ଏବଂ ଯାଞ୍ଚ ପ୍ରକ୍ରିୟାର ସରଳ ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ବିବରଣୀ।`;
  } else {
    en = `Official ${title} portal and verification guide for Odisha candidates featuring verified .gov.in/.nic.in/.ac.in URLs, step-by-step lookup instructions, helpdesk contacts, and anti-phishing checks.`;
    or = `${title} ସରକାରୀ ପୋର୍ଟାଲ୍ ଗାଇଡ୍: ଓଡ଼ିଶାର ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ ପ୍ରାମାଣିକ .gov.in/.nic.in/.ac.in ଲିଙ୍କ୍, ଯାଞ୍ଚ ପ୍ରକ୍ରିୟା, ହେଲ୍ପଡେସ୍କ ନମ୍ବର ଏବଂ ଫିସିଂ-ମୁକ୍ତ ସୁରକ୍ଷା ସୂଚନା।`;
  }

  return {
    title_or: folder.title_or || `${title} (ସରକାରୀ ପୋର୍ଟାଲ୍ ଓ ଯାଞ୍ଚ)`,
    badge,
    en,
    or
  };
}

// 12 Exhaustive Minute Official Portal, Institution & Anti-Fraud Verification Handbooks (Category #08)
const CAT08_HANDBOOKS = [
  {
    id: 'ji-ip-opsc-otr',
    folderKey: 'odisha recruitment authorities',
    fallbackFolder: 'jf-ip-otr-login',
    slug: 'verified-odisha-recruitment-portals-directory',
    title: 'Odisha State Recruitment Commissions Master Directory (OPSC — opsc.gov.in, OSSC — ossc.gov.in, OSSSC — osssc.gov.in, OPRB, High Court of Orissa) — OTR, Roll Number & Result Verification',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ନିଯୁକ୍ତି ଆୟୋଗ ମାଷ୍ଟର ଡାଇରେକ୍ଟୋରୀ (OPSC, OSSC, OSSSC, OPRB, ହାଇକୋର୍ଟ) — OTR ଓ ଫଳାଫଳ ଯାଞ୍ଚ',
    conducting_body: 'OPSC (Cuttack), OSSC (Bhubaneswar), OSSSC (Bhubaneswar), OPRB & High Court of Orissa',
    exam_code: 'ODISHA-COMMISSIONS-MASTER',
    cadre_group: 'All Odisha State Govt Group A, B, C & Judicial/Police Aspirants',
    pay_matrix: 'Official Portals Only (Zero Extra Agent Fees; Direct Treasury/SBI Collect Payment)',
    age_limit_relaxation: 'Verify exact advertisement PDF & Corrigendum directly on commission homepage',
    qualification_odia_rule: 'Only trust notices hosted on .gov.in / .nic.in / .ac.in domains: opsc.gov.in, ossc.gov.in, osssc.gov.in, odishapolice.gov.in, orissahighcourt.nic.in',
    selection_stages: '1. Verify Domain Ends in .gov.in or .nic.in -> 2. Complete One-Time Registration (OTR) -> 3. Cross-Check Advertisement Number in "What’s New" -> 4. Download Admit Card & Official Result PDF Directly',
    pst_pet_skill_norms: 'Phishing Alert: Reject lookalike sites such as opsc-jobs.com, osssc-apply.org, or WhatsApp PDF links demanding UPI payment to personal numbers.',
    documents_checklist: '1. Commission OTR User ID & Registered Email/Mobile\n2. Submitted Application PDF & Payment Challan/Reference ID\n3. Official Advertisement Number & Date\n4. Grievance / Helpdesk Ticket Screenshot',
    application_steps: '1. Bookmark opsc.gov.in, ossc.gov.in, osssc.gov.in, ssbodisha.ac.in, and orissahighcourt.nic.in.\n2. Cross-verify any social media job alert against the "Advertisements / Notices" tab before applying.\n3. Use commission toll-free/email helpdesks or Odisha RTI Portal for official grievances.',
    official_portal_url: 'https://www.opsc.gov.in/',
    summary_en: 'Authoritative Odisha recruitment portal directory (OPSC, OSSC, OSSSC, OPRB, High Court of Orissa) with OTR links, roll number/result verification, and lookalike domain red flags.',
    summary_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ନିଯୁକ୍ତି ଆୟୋଗ ମାଷ୍ଟର ଡାଇରେକ୍ଟୋରୀ (OPSC, OSSC, OSSSC, OPRB, ହାଇକୋର୍ଟ): ପ୍ରାମାଣିକ .gov.in ଲିଙ୍କ୍, OTR, ଆଡମିଟ୍ କାର୍ଡ ଓ ନକଲି ୱେବସାଇଟ୍ ଚିହ୍ନଟ ଗାଇଡ୍।',
    body_html: '<h3>Verified Odisha Commission Domains</h3><ul><li><strong>OPSC:</strong> https://www.opsc.gov.in/ (Group A/B Gazetted, OAS, OJS, Asst Prof)</li><li><strong>OSSC:</strong> https://www.ossc.gov.in/ (CGL, CTSRE, WEO, JE, Technical Group B/C)</li><li><strong>OSSSC:</strong> https://www.osssc.gov.in/ (RI, ARI, Amin, Forest Guard, Nursing, PEO)</li><li><strong>Odisha Police / OPRB:</strong> https://odishapolice.gov.in/</li><li><strong>High Court of Orissa:</strong> https://www.orissahighcourt.nic.in/</li></ul>',
    body_or: '<h3>ଓଡ଼ିଶାର ପ୍ରାମାଣିକ ସରକାରୀ ନିଯୁକ୍ତି ପୋର୍ଟାଲ୍</h3><p>କୌଣସି ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି କିମ୍ବା ଫଳାଫଳକୁ କେବଳ <strong>opsc.gov.in</strong>, <strong>ossc.gov.in</strong>, <strong>osssc.gov.in</strong>, <strong>odishapolice.gov.in</strong> ଏବଂ <strong>orissahighcourt.nic.in</strong> ରେ ଯାଞ୍ଚ କରନ୍ତୁ।</p>',
    tags: ['OPSC', 'OSSC', 'OSSSC', 'OPRB', 'Official Portals']
  },
  {
    id: 'ji-ip-central-agencies',
    folderKey: 'national recruitment authorities',
    fallbackFolder: 'jf-ip-commissions',
    slug: 'central-recruitment-and-testing-agencies-directory',
    title: 'Central Recruitment & Testing Agencies Directory (UPSC — upsc.gov.in, SSC — ssc.gov.in, IBPS — ibps.in, RRB Bhubaneswar — rrbbbs.gov.in, NTA — nta.ac.in)',
    title_or: 'କେନ୍ଦ୍ରୀୟ ନିଯୁକ୍ତି ଏବଂ ପରୀକ୍ଷା ସଂସ୍ଥା ଡାଇରେକ୍ଟୋରୀ (UPSC, SSC, IBPS, RRB ଭୁବନେଶ୍ୱର, NTA)',
    conducting_body: 'UPSC, SSC (ER Kolkata), IBPS, RRB Bhubaneswar & National Testing Agency (NTA)',
    exam_code: 'CENTRAL-AGENCIES-MASTER',
    cadre_group: 'All Central Civil Services, SSC CGL/CHSL/MTS, Railways, Banking & NTA Exams',
    pay_matrix: 'Official Portal Fees Only (UPSC/SSC ₹100; Women/SC/ST/PwD/ESM Exempted)',
    age_limit_relaxation: 'Verify official Employment News / agency portal PDF before applying',
    qualification_odia_rule: 'SSC migrated to ssc.gov.in (New OTR mandatory); RRB Bhubaneswar (rrbbbs.gov.in) handles Odisha Railway zones; NTA uses exams.nta.ac.in / nta.ac.in',
    selection_stages: '1. Complete OTR on upsconline.nic.in / ssc.gov.in / rrbapply.gov.in -> 2. Verify Exam City & Admit Card -> 3. Check Official Answer Key & Challenge Window -> 4. Verify Final Merit List PDF',
    pst_pet_skill_norms: 'Red Flag: Beware of fake "ssc-nic.in", "rrb-bhubaneswar.com", or "ibps-apply.org" domains; SSC’s official domain is strictly ssc.gov.in.',
    documents_checklist: '1. UPSC / SSC / RRB OTR ID & Password\n2. Aadhaar-Authenticated Registration Slip\n3. Official Fee Receipt\n4. Central Format Caste/OBC-NCL/EWS Certificate',
    application_steps: '1. Use upsc.gov.in / upsconline.nic.in for UPSC CSE, CDS, NDA, CAPF.\n2. Use ssc.gov.in (NOT old ssc.nic.in) for SSC OTR and applications.\n3. Use rrbbbs.gov.in for RRB Bhubaneswar notices and nta.ac.in for JEE/NEET/CUET/UGC-NET.',
    official_portal_url: 'https://ssc.gov.in/',
    summary_en: 'Verified directory of UPSC, SSC (new ssc.gov.in), IBPS, RRB Bhubaneswar (rrbbbs.gov.in), and NTA (nta.ac.in) with OTR, admit card, and phishing-domain warnings.',
    summary_or: 'କେନ୍ଦ୍ରୀୟ ନିଯୁକ୍ତି ସଂସ୍ଥା ଡାଇରେକ୍ଟୋରୀ: UPSC, SSC (ନୂଆ ssc.gov.in), IBPS, RRB ଭୁବନେଶ୍ୱର (rrbbbs.gov.in) ଏବଂ NTA ର ପ୍ରାମାଣିକ ୱେବସାଇଟ୍ ଓ ଯାଞ୍ଚ ଗାଇଡ୍।',
    body_html: '<h3>Verified Central Agency Domains</h3><ul><li><strong>UPSC:</strong> https://upsc.gov.in/ &amp; https://upsconline.nic.in/</li><li><strong>SSC (New Portal):</strong> https://ssc.gov.in/</li><li><strong>IBPS:</strong> https://www.ibps.in/</li><li><strong>RRB Bhubaneswar:</strong> https://www.rrbbbs.gov.in/</li><li><strong>NTA:</strong> https://www.nta.ac.in/</li></ul>',
    body_or: '<h3>କେନ୍ଦ୍ର ସରକାରୀ ପ୍ରାମାଣିକ ପୋର୍ଟାଲ୍</h3><p>SSC ର ନୂତନ ପୋର୍ଟାଲ୍ <strong>ssc.gov.in</strong>, UPSC ର <strong>upsc.gov.in</strong>, ରେଳବାଇର <strong>rrbbbs.gov.in</strong> ଏବଂ NTA ର <strong>nta.ac.in</strong> ବ୍ୟବହାର କରନ୍ତୁ।</p>',
    tags: ['UPSC', 'SSC', 'IBPS', 'RRB Bhubaneswar', 'NTA']
  },
  {
    id: 'ji-ip-sams-ojee-chse-bse',
    folderKey: 'odisha institutions',
    fallbackFolder: 'jf-ip-sams-dhe',
    slug: 'sams-odisha-ojee-chse-and-bse-odisha-verification-guide',
    title: 'SAMS Odisha (samsodisha.gov.in), OJEE (ojee.nic.in), CHSE Odisha (chseodisha.nic.in) & BSE Odisha (bseodisha.ac.in) — Admission, Marksheet & Migration Verification',
    title_or: 'SAMS ଓଡ଼ିଶା, OJEE, CHSE ଓଡ଼ିଶା ଏବଂ BSE ଓଡ଼ିଶା — ନାମଲେଖା, ମାର୍କସିଟ୍ ଏବଂ ମାଇଗ୍ରେସନ୍ ଯାଞ୍ଚ ଗାଇଡ୍',
    conducting_body: 'OCAC / Higher Education & School Education Depts, OJEE Board, CHSE Odisha & BSE Odisha',
    exam_code: 'SAMS-OJEE-CHSE-BSE',
    cadre_group: 'Class 10 (HSC), +2, +3, ITI, Diploma, B.Ed., B.Tech/MBA/MCA & PG Students in Odisha',
    pay_matrix: 'Official SAMS CAF Fee & Board Duplicate Certificate Fees Only via Govt Treasury/Portal',
    age_limit_relaxation: 'All past and current Odisha Board / SAMS students',
    qualification_odia_rule: 'Verify Class 10 (BSE) and Class 12 (CHSE) marksheets via DigiLocker / orissaresults.nic.in; SAMS Odisha (samsodisha.gov.in) is mandatory for Govt/Aided +2, +3, PG (CPET), ITI, and Diploma admissions',
    selection_stages: '1. Submit SAMS CAF / OJEE Application -> 2. Check Merit Intimation Letter -> 3. Slide/Freeze/Float & CLC Submission -> 4. Verify HSC/CHSE Certificates on DigiLocker or BSE/CHSE Portal',
    pst_pet_skill_norms: 'Duplicate Marksheet/Migration: Apply online via BSE Odisha (bseodisha.ac.in) or CHSE Odisha (chseodisha.nic.in) e-Services without middlemen.',
    documents_checklist: '1. SAMS Common Application Form (CAF) Barcode & Intimation Letter\n2. BSE Odisha HSC & CHSE +2 Provisional/Original Certificates\n3. College Leaving Certificate (CLC) & Conduct Certificate\n4. DigiLocker Verified Digital Marksheet',
    application_steps: '1. Access all Odisha +2/+3/PG/ITI/Diploma/B.Ed admissions strictly on samsodisha.gov.in.\n2. Access engineering/medical/MBA counselling strictly on ojee.nic.in.\n3. Verify results on orissaresults.nic.in, bseodisha.ac.in, and chseodisha.nic.in.',
    official_portal_url: 'https://www.samsodisha.gov.in/',
    summary_en: 'Complete portal & verification guide for SAMS Odisha (samsodisha.gov.in), OJEE (ojee.nic.in), CHSE Odisha, and BSE Odisha covering e-Admission, results, and duplicate certificates.',
    summary_or: 'SAMS ଓଡ଼ିଶା (samsodisha.gov.in), OJEE (ojee.nic.in), CHSE ଓଡ଼ିଶା ଏବଂ BSE ଓଡ଼ିଶା ଗାଇଡ୍: ଇ-ଆଡମିଶନ୍, ପରୀକ୍ଷା ଫଳାଫଳ ଏବଂ ଡୁପ୍ଲିକେଟ୍ ସାର୍ଟିଫିକେଟ୍ ଯାଞ୍ଚ ସୂଚନା।',
    body_html: '<h3>Odisha’s Core Admission & Board Portals</h3><p><strong>SAMS Odisha (samsodisha.gov.in)</strong> unifies +2, +3, CPET PG, ITI, Diploma, and Teacher Education admissions across Odisha. Engineering, Pharmacy, MBA, and State Quota MBBS/BDS counselling runs via <strong>ojee.nic.in</strong>.</p>',
    body_or: '<h3>ଓଡ଼ିଶାର ପ୍ରମୁଖ ନାମଲେଖା ଓ ବୋର୍ଡ ପୋର୍ଟାଲ୍</h3><p>SAMS ଓଡ଼ିଶା (samsodisha.gov.in), OJEE (ojee.nic.in), CHSE ଓଡ଼ିଶା (chseodisha.nic.in) ଏବଂ BSE ଓଡ଼ିଶା (bseodisha.ac.in) ମାଧ୍ୟମରେ ସମସ୍ତ ଶିକ୍ଷାଗତ ସେବା ଓ ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ ଉପଲବ୍ଧ।</p>',
    tags: ['SAMS Odisha', 'OJEE', 'CHSE Odisha', 'BSE Odisha']
  },
  {
    id: 'ji-ip-premier-central-odisha',
    folderKey: 'odisha institutions',
    fallbackFolder: 'jf-ip-sams-dhe',
    slug: 'premier-central-institutes-in-odisha-directory',
    title: 'Premier Central Institutes in Odisha Directory (IIT Bhubaneswar, NIT Rourkela, NISER Jatni, AIIMS Bhubaneswar, IIM Sambalpur, IIIT Bhubaneswar, Central University of Odisha)',
    title_or: 'ଓଡ଼ିଶାର ପ୍ରମୁଖ କେନ୍ଦ୍ରୀୟ ଶିକ୍ଷାନୁଷ୍ଠାନ ଡାଇରେକ୍ଟୋରୀ (IIT ଭୁବନେଶ୍ୱର, NIT ରାଉରକେଲା, NISER, AIIMS, IIM ସମ୍ବଲପୁର, CUO)',
    conducting_body: 'Institutes of National Importance (MoE / DAE / MoHFW) in Odisha',
    exam_code: 'INI-ODISHA-DIRECTORY',
    cadre_group: 'B.Tech, MBBS, Int. M.Sc., MBA, M.Tech, Ph.D., Faculty & Research Staff',
    pay_matrix: 'Institute-Specific Admissions (JoSAA / NEET MCC / NEST / CAT / GATE) & Recruitment Portals',
    age_limit_relaxation: 'As per JoSAA, MCC, NEST, IIM CAP & Central University norms',
    qualification_odia_rule: 'NIT Rourkela & IIIT Bhubaneswar provide 50% Home State / Odisha Quota seats via JoSAA/OJEE; AIIMS Bhubaneswar & NISER Jatni admit purely on All-India merit (NEET/NEST)',
    selection_stages: '1. Verify Official .ac.in / .edu.in Institute Domain -> 2. Check Admissions via JoSAA/CSAB/MCC/NEST/CAT -> 3. Verify Faculty/Non-Teaching Jobs on Institute Recruitment Tab -> 4. Confirm Fee Payments Only on Official Portal',
    pst_pet_skill_norms: 'Anti-Fraud Warning: Central Institutes in Odisha NEVER grant direct management-quota seats or jobs in exchange for cash.',
    documents_checklist: '1. Entrance Allotment Letter (JoSAA / MCC / NEST / CAT / CUET)\n2. Odisha Resident Certificate (for NIT Rourkela / IIIT BBSR Home State Quota)\n3. Academic Transcripts & Medical Fitness',
    application_steps: '1. IIT BBSR: iitbbs.ac.in | NIT Rourkela: nitrkl.ac.in | NISER: niser.ac.in.\n2. AIIMS BBSR: aiimsbhubaneswar.nic.in | IIM Sambalpur: iimsambalpur.ac.in.\n3. IIIT BBSR: iiit-bh.ac.in | Central University of Odisha (Koraput): cuo.ac.in.',
    official_portal_url: 'https://www.iitbbs.ac.in/',
    summary_en: 'Verified directory of Institutes of National Importance in Odisha: IIT Bhubaneswar, NIT Rourkela, NISER Jatni, AIIMS Bhubaneswar, IIM Sambalpur, IIIT Bhubaneswar, and CUO Koraput.',
    summary_or: 'ଓଡ଼ିଶାର ପ୍ରମୁଖ କେନ୍ଦ୍ରୀୟ ଶିକ୍ଷାନୁଷ୍ଠାନ: IIT ଭୁବନେଶ୍ୱର, NIT ରାଉରକେଲା, NISER ଜଟଣୀ, AIIMS ଭୁବନେଶ୍ୱର, IIM ସମ୍ବଲପୁର, IIIT ଭୁବନେଶ୍ୱର ଏବଂ CUO କୋରାପୁଟର ପ୍ରାମାଣିକ ସୂଚନା।',
    body_html: '<h3>Verified Official Websites of Central Institutes in Odisha</h3><ul><li><strong>IIT Bhubaneswar:</strong> iitbbs.ac.in</li><li><strong>NIT Rourkela:</strong> nitrkl.ac.in (50% Odisha Home State Quota)</li><li><strong>NISER Jatni:</strong> niser.ac.in (via NEST)</li><li><strong>AIIMS Bhubaneswar:</strong> aiimsbhubaneswar.nic.in (via NEET/INI-CET)</li><li><strong>IIM Sambalpur:</strong> iimsambalpur.ac.in | <strong>CUO Koraput:</strong> cuo.ac.in</li></ul>',
    body_or: '<h3>ଓଡ଼ିଶାରେ ଥିବା ଜାତୀୟ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ଶିକ୍ଷାନୁଷ୍ଠାନ</h3><p>IIT ଭୁବନେଶ୍ୱର, NIT ରାଉରକେଲା, NISER, AIIMS ଭୁବନେଶ୍ୱର, IIM ସମ୍ବଲପୁର, IIIT ଭୁବନେଶ୍ୱର ଏବଂ କେନ୍ଦ୍ରୀୟ ବିଶ୍ୱବିଦ୍ୟାଳୟ କୋରାପୁଟର ସରକାରୀ .ac.in / .nic.in ପୋର୍ଟାଲ୍ ସୂଚୀ।</p>',
    tags: ['IIT Bhubaneswar', 'NIT Rourkela', 'NISER', 'AIIMS Bhubaneswar', 'IIM Sambalpur']
  },
  {
    id: 'ji-ip-odisha-state-universities',
    folderKey: 'odisha institutions',
    fallbackFolder: 'jf-ip-sams-dhe',
    slug: 'odisha-state-public-and-technical-universities-directory',
    title: 'Odisha State Public & Technical Universities Directory (Ravenshaw, Utkal, Sambalpur, Berhampur, Fakir Mohan, North Orissa / MSCB, OUAT, VSSUT Burla, OUTR, NLUO Cuttack, Madhusudan Law University)',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସରକାରୀ ଏବଂ ବୈଷୟିକ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଡାଇରେକ୍ଟୋରୀ (ରେଭେନ୍ସା, ଉତ୍କଳ, ସମ୍ବଲପୁର, ବ୍ରହ୍ମପୁର, OUAT, VSSUT, OUTR, NLUO)',
    conducting_body: 'Higher Education, Skill Dev & Tech Ed, and Agriculture Depts, Govt of Odisha',
    exam_code: 'ODISHA-STATE-UNIV-DIR',
    cadre_group: 'UG, PG (CPET), B.Tech/M.Tech (OJEE), Agriculture/Vet (OUAT) & Law (CLAT/MLU)',
    pay_matrix: 'Subsidized State Public University Tuition + SAMS/OJEE Merit Seat Allotment',
    age_limit_relaxation: 'As per SAMS CPET, OJEE, OUAT CEE, and CLAT notifications',
    qualification_odia_rule: 'All listed universities are UGC-recognised State Public Universities; verify degree/transcript authenticity directly via university Examination Controller or DigiLocker NAD',
    selection_stages: '1. Verify Official University Domain -> 2. Apply via SAMS CPET / OJEE / OUAT CEE / CLAT -> 3. Check Affiliated College List Before Enrolling -> 4. Link ABC ID & DigiLocker NAD',
    pst_pet_skill_norms: 'Always verify whether a private college claiming affiliation to Utkal/Sambalpur/Berhampur/BPUT is listed on the university’s official "Affiliated Colleges" page.',
    documents_checklist: '1. SAMS CPET / OJEE / OUAT / CLAT Rank Card\n2. CLC, Migration & Conduct Certificates\n3. ABC ID (Academic Bank of Credits)\n4. Official Fee Receipt',
    application_steps: '1. Utkal: utkaluniversity.ac.in | Ravenshaw: ravenshawuniversity.ac.in | Sambalpur: suniv.ac.in.\n2. Berhampur: bamu.edu.in | Fakir Mohan: fmuniversity.nic.in | MSCB: mscbuniversity.edu.in.\n3. OUAT: ouat.ac.in | VSSUT: vssut.ac.in | OUTR: outr.ac.in | NLUO: nluo.ac.in | MLU: mlu.ac.in.',
    official_portal_url: 'https://utkaluniversity.ac.in/',
    summary_en: 'Verified directory of Odisha State Public, Agricultural, Technical & Law Universities (Utkal, Ravenshaw, Sambalpur, Berhampur, FMU, MSCB, OUAT, VSSUT, OUTR, NLUO, MLU).',
    summary_or: 'ଓଡ଼ିଶାର ରାଜ୍ୟ ସରକାରୀ, କୃଷି, ବୈଷୟିକ ଏବଂ ଆଇନ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଡାଇରେକ୍ଟୋରୀ: ଉତ୍କଳ, ରେଭେନ୍ସା, ସମ୍ବଲପୁର, ବ୍ରହ୍ମପୁର, FMU, MSCB, OUAT, VSSUT, OUTR, NLUO ଓ MLU ସୂଚନା।',
    body_html: '<h3>Odisha’s Accredited State Public Universities</h3><p>All 11 premier state universities—<strong>Utkal, Ravenshaw, Sambalpur, Berhampur, Fakir Mohan, MSCB (Baripada), OUAT, VSSUT Burla, OUTR Bhubaneswar, NLUO Cuttack,</strong> and <strong>Madhusudan Law University</strong>—are statutory UGC-recognised institutions.</p>',
    body_or: '<h3>ଓଡ଼ିଶାର ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ରାଜ୍ୟ ବିଶ୍ୱବିଦ୍ୟାଳୟ</h3><p>ଉତ୍କଳ, ରେଭେନ୍ସା, ସମ୍ବଲପୁର, ବ୍ରହ୍ମପୁର, ଫକୀର ମୋହନ, MSCB, OUAT, VSSUT ବୁର୍ଲା, OUTR, NLUO କଟକ ଏବଂ ମଧୁସୂଦନ ଆଇନ ବିଶ୍ୱବିଦ୍ୟାଳୟର ପ୍ରାମାଣିକ ୱେବସାଇଟ୍ ସୂଚୀ।</p>',
    tags: ['Utkal University', 'Ravenshaw', 'VSSUT Burla', 'OUTR', 'OUAT', 'NLUO']
  },
  {
    id: 'ji-ip-regulators-naac-nirf',
    folderKey: 'professional, regulatory and accreditation authorities',
    fallbackFolder: 'jf-ip-sams-dhe',
    slug: 'regulatory-and-accreditation-bodies-ugc-aicte-naac-nirf-directory',
    title: 'Regulatory & Accreditation Bodies Directory (UGC — ugc.gov.in, AICTE — aicte-india.org, NCTE — ncte.gov.in, NMC, INC, PCI, BCI, NAAC & NIRF Ranking Check)',
    title_or: 'ନିୟାମକ ଏବଂ ମାନ୍ୟତା କର୍ତ୍ତୃପକ୍ଷ ଡାଇରେକ୍ଟୋରୀ (UGC, AICTE, NCTE, NMC, INC, PCI, BCI, NAAC ଓ NIRF ଯାଞ୍ଚ)',
    conducting_body: 'UGC, AICTE, NCTE, NMC, INC, PCI, BCI, NAAC & NIRF (Ministry of Education)',
    exam_code: 'STATUTORY-REGULATORS-CHECK',
    cadre_group: 'All Degree, Engineering, Medical, Nursing, Pharmacy, B.Ed., Law & Research Applicants',
    pay_matrix: '100% Free Public Lookup Directories on Official Statutory Portals',
    age_limit_relaxation: 'Mandatory pre-admission check for every private/deemed/state college',
    qualification_odia_rule: 'B.Tech/MBA/MCA needs AICTE; B.Ed./D.El.Ed. needs NCTE; MBBS needs NMC; B.Sc. Nursing/GNM needs INC + ONMRC; B.Pharm/D.Pharm needs PCI; LL.B. needs BCI',
    selection_stages: '1. Check University on ugc.gov.in/university -> 2. Check Course Approval on AICTE / NCTE / NMC / INC / PCI / BCI -> 3. Check NAAC Grade (naac.gov.in) -> 4. Check NIRF Rank (nirfindia.org)',
    pst_pet_skill_norms: 'Critical Warning: A degree from a college lacking mandatory statutory council approval (e.g., B.Ed. without NCTE or Nursing without INC/ONMRC) is invalid for OPSC/OSSSC/OAVS jobs.',
    documents_checklist: '1. Institution AISHE Code & Statutory Approval Letter\n2. Current Academic Year AICTE/PCI/INC/NCTE Extension of Approval (EoA)\n3. NAAC Grade & Validity Date',
    application_steps: '1. Verify university status at ugc.gov.in.\n2. Verify professional course Extension of Approval (EoA) on aicte-india.org, ncte.gov.in, pci.nic.in, indiannursingcouncil.org, or barcouncilofindia.org.\n3. Compare genuine institutional quality via nirfindia.org.',
    official_portal_url: 'https://www.ugc.gov.in/',
    summary_en: 'Pre-admission statutory verification directory for UGC, AICTE, NCTE, NMC, INC, PCI, BCI, NAAC & NIRF—essential to ensure your degree is valid for Odisha & Central Govt jobs.',
    summary_or: 'UGC, AICTE, NCTE, NMC, INC, PCI, BCI, NAAC ଓ NIRF ଯାଞ୍ଚ ଡାଇରେକ୍ଟୋରୀ: ନାମଲେଖା ପୂର୍ବରୁ କଲେଜ୍ ଓ ପାଠ୍ୟକ୍ରମର ସରକାରୀ ଅନୁମୋଦନ ଯାଞ୍ଚ କରିବାର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।',
    body_html: '<h3>Verify Before Paying Admission Fees</h3><p>Before taking admission in any private college, confirm statutory approval for that exact course: <strong>AICTE</strong> (Engg/Mgmt), <strong>NCTE</strong> (B.Ed./D.El.Ed.), <strong>NMC</strong> (Medical), <strong>INC + ONMRC</strong> (Nursing), <strong>PCI</strong> (Pharmacy), and <strong>BCI</strong> (Law).</p>',
    body_or: '<h3>ନାମଲେଖା ପୂର୍ବରୁ ବାଧ୍ୟତାମୂଳକ ଅନୁମୋଦନ ଯାଞ୍ଚ</h3><p>ପାଠ୍ୟକ୍ରମ ଅନୁଯାୟୀ AICTE, NCTE, NMC, INC, PCI କିମ୍ବା BCI ଅନୁମୋଦନ ଯାଞ୍ଚ ନକରି କୌଣସି ଘରୋଇ କଲେଜରେ ନାମ ଲେଖାନ୍ତୁ ନାହିଁ।</p>',
    tags: ['UGC', 'AICTE', 'NCTE', 'NMC INC PCI BCI', 'NAAC NIRF']
  },
  {
    id: 'ji-ip-digilocker-abc-nad',
    folderKey: 'education and scholarship verification',
    fallbackFolder: 'jf-ip-sams-dhe',
    slug: 'digilocker-academic-bank-of-credits-abc-id-and-nad-guide',
    title: 'DigiLocker (digilocker.gov.in), Academic Bank of Credits (ABC ID) & NAD — Digital Certificate Issuance & Employer Verification Guide',
    title_or: 'ଡିଜିଲକର୍ (DigiLocker), ଏକାଡେମିକ୍ ବ୍ୟାଙ୍କ ଅଫ୍ କ୍ରେଡିଟ୍ସ (ABC ID) ଏବଂ NAD — ଡିଜିଟାଲ୍ ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ ଗାଇଡ୍',
    conducting_body: 'National e-Governance Division (NeGD / MeitY) & UGC-NAD',
    exam_code: 'DIGILOCKER-ABC-NAD',
    cadre_group: 'All School, College, University Students & Job Applicants',
    pay_matrix: '100% Free Official Digital Document Wallet (Legally Valid Under IT Act, 2000)',
    age_limit_relaxation: 'All Indian citizens with Aadhaar; ABC ID mandatory for NEP 2020 UG/PG admissions',
    qualification_odia_rule: 'DigiLocker digital marksheets (BSE Odisha, CHSE Odisha, Utkal/BPUT/SAMS) and e-District Odisha certificates carry legal equivalence to physical originals under Rule 9A of Information Technology Rules',
    selection_stages: '1. Sign Up at digilocker.gov.in via Aadhaar OTP -> 2. Pull BSE/CHSE/University Degree via NAD -> 3. Generate 12-Digit ABC ID (abc.gov.in) -> 4. Share QR-Verified Credentials with Employers / Commissions',
    pst_pet_skill_norms: 'ABC ID is mandatory for SAMS Odisha +3/PG admissions and NEP credit transfer across Indian universities.',
    documents_checklist: '1. Aadhaar Card (linked to active mobile)\n2. Board Roll Number & Passing Year (BSE/CHSE)\n3. University Roll/Registration Number (for NAD)\n4. 12-Digit ABC ID',
    application_steps: '1. Install DigiLocker or visit digilocker.gov.in and link Aadhaar.\n2. Search "Board of Secondary Education Odisha" / "CHSE Odisha" / your University to fetch digital certificates.\n3. Create your 12-digit Academic Bank of Credits ID at abc.gov.in or inside DigiLocker.',
    official_portal_url: 'https://www.digilocker.gov.in/',
    summary_en: 'Complete guide to DigiLocker (digilocker.gov.in), 12-digit Academic Bank of Credits (ABC ID), and NAD for fetching BSE/CHSE/Odisha university certificates legally.',
    summary_or: 'ଡିଜିଲକର୍ (digilocker.gov.in), ABC ID ଏବଂ NAD ଗାଇଡ୍: BSE ଓଡ଼ିଶା, CHSE ଏବଂ ବିଶ୍ୱବିଦ୍ୟାଳୟର ବୈଧ ଡିଜିଟାଲ୍ ମାର୍କସିଟ୍ ଓ କ୍ରେଡିଟ୍ ଟ୍ରାନ୍ସଫର ସୂଚନା।',
    body_html: '<h3>Legally Valid Digital Credentials & ABC ID</h3><p>Documents fetched from official issuers inside <strong>DigiLocker (digilocker.gov.in)</strong>—including BSE Odisha, CHSE Odisha, Odisha e-District, and UGC-NAD—are legally equivalent to physical originals. Generate your <strong>12-digit ABC ID</strong> via DigiLocker for NEP 2020 university enrolments.</p>',
    body_or: '<h3>ଆଇନତଃ ବୈଧ ଡିଜିଟାଲ୍ ପ୍ରମାଣପତ୍ର ଏବଂ ABC ID</h3><p>DigiLocker ରୁ ପ୍ରାପ୍ତ BSE, CHSE, ବିଶ୍ୱବିଦ୍ୟାଳୟ ଏବଂ e-District ପ୍ରମାଣପତ୍ରଗୁଡ଼ିକ ମୂଳ କାଗଜପତ୍ର ସହ ସମାନ ମାନ୍ୟତା ରଖେ।</p>',
    tags: ['DigiLocker', 'ABC ID', 'NAD', 'Digital Verification']
  },
  {
    id: 'ji-ip-edistrict-odisha',
    folderKey: 'odisha',
    fallbackFolder: 'jf-ip-edistrict',
    slug: 'edistrict-odisha-revenue-certificates-verification-guide',
    title: 'e-District Odisha (edistrict.odisha.gov.in) & Revenue Services — Resident, Caste, Income, SEBC, EWS & Legal Heir Certificate Verification',
    title_or: 'ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ଓଡ଼ିଶା (edistrict.odisha.gov.in) — ବାସିନ୍ଦା, ଜାତି, ଆୟ, SEBC, EWS ଏବଂ ଆଇନଗତ ଉତ୍ତରାଧିକାରୀ ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ',
    conducting_body: 'Revenue & Disaster Management Department, Govt of Odisha (OCAC)',
    exam_code: 'EDISTRICT-ODISHA-REV',
    cadre_group: 'All Odisha Citizens, Job Applicants & Scholarship Students',
    pay_matrix: 'Nominal Govt Statutory Fee (₹20–₹30) via e-District / Mo Seba Kendra',
    age_limit_relaxation: 'All Odisha residents; apply well before OPSC/OSSC/OSSSC/Scholarship deadlines',
    qualification_odia_rule: 'SEBC (State List) vs OBC-NCL (Central List): Use SEBC for OPSC/OSSC/OSSSC State jobs and Central OBC-NCL for UPSC/SSC/IBPS/RRB; Income & EWS valid for 1 financial year',
    selection_stages: '1. Register at edistrict.odisha.gov.in (or visit Mo Seba Kendra) -> 2. Upload Self-Declaration, Aadhaar & RoR/Khata -> 3. RI Field Inquiry -> 4. Tehsildar Digital Signature -> 5. Download & Verify QR Barcode',
    pst_pet_skill_norms: 'Processing SLA under ORTPSA: Resident/Income/Caste certificates typically 15 days; verify certificate authenticity anytime using the e-District Reference Number & QR code.',
    documents_checklist: '1. Aadhaar Card & Passport Photo\n2. Land Record (RoR / Khata) or Parent/Relative Certificate\n3. Self-Declaration Form & Salary/Income Proof\n4. Ration Card / Voter ID',
    application_steps: '1. Apply online at edistrict.odisha.gov.in or via nearest Mo Seba Kendra (CSC).\n2. Ensure you select the correct category (SEBC for Odisha vs OBC for Central).\n3. Verify issued certificate QR/barcode on edistrict.odisha.gov.in before document verification.',
    official_portal_url: 'https://edistrict.odisha.gov.in/',
    summary_en: 'Complete e-District Odisha (edistrict.odisha.gov.in) guide for Resident, Caste, Income, SEBC, OBC-NCL, EWS & Legal Heir certificates, ORTPSA timelines, and QR verification.',
    summary_or: 'ଇ-ଡିଷ୍ଟ୍ରିକ୍ଟ ଓଡ଼ିଶା (edistrict.odisha.gov.in) ଗାଇଡ୍: ବାସିନ୍ଦା, ଜାତି, ଆୟ, SEBC, OBC-NCL, EWS ଏବଂ ଉତ୍ତରାଧିକାରୀ ପ୍ରମାଣପତ୍ର ଆବେଦନ ଓ QR ଯାଞ୍ଚ ପ୍ରକ୍ରିୟା।',
    body_html: '<h3>Critical SEBC vs OBC-NCL & Validity Rules</h3><p>On <strong>edistrict.odisha.gov.in</strong>, apply separately for <strong>SEBC</strong> (Odisha State jobs/admissions) and <strong>OBC-NCL</strong> (Central UPSC/SSC/IBPS/NTA). Keep Income and EWS certificates renewed for the current financial year.</p>',
    body_or: '<h3>SEBC ବନାମ OBC-NCL ଏବଂ ବୈଧତା ନିୟମ</h3><p>ରାଜ୍ୟ ସରକାରୀ ଚାକିରି ପାଇଁ <strong>SEBC</strong> ଏବଂ କେନ୍ଦ୍ରୀୟ ଚାକିରି ପାଇଁ <strong>OBC-NCL</strong> ପ୍ରମାଣପତ୍ର edistrict.odisha.gov.in ରୁ ପ୍ରସ୍ତୁତ କରନ୍ତୁ।</p>',
    tags: ['e-District Odisha', 'SEBC OBC-NCL', 'Income Certificate', 'EWS Odisha']
  },
  {
    id: 'ji-ip-scholarship-employment-pfms',
    folderKey: 'official scholarship and financial support portals',
    fallbackFolder: 'jf-ip-verified-portals',
    slug: 'scholarship-employment-and-pfms-dbt-portals-directory',
    title: 'Scholarship, Employment & Payment Portals (scholarship.odisha.gov.in, scholarships.gov.in NSP, ncs.gov.in, empmissionodisha.gov.in, pfms.nic.in DBT Status)',
    title_or: 'ଛାତ୍ରବୃତ୍ତି, ନିୟୋଜନ ଏବଂ PFMS DBT ପେମେଣ୍ଟ ପୋର୍ଟାଲ୍ ଡାଇରେକ୍ଟୋରୀ',
    conducting_body: 'OCAC Odisha, NIC, Ministry of Labour & Employment, CGA (PFMS)',
    exam_code: 'DBT-EMP-SCHOLAR-PORTALS',
    cadre_group: 'All Scholarship Applicants, Job Seekers & DBT Beneficiaries in Odisha',
    pay_matrix: '100% Free Official Portals (Direct Bank Transfer via NPCI / PFMS)',
    age_limit_relaxation: 'Open to all eligible Odisha students and job seekers',
    qualification_odia_rule: 'Always check DBT credit status on pfms.nic.in (Track NSP Payments / DBT Status Tracker) and NPCI Aadhaar Mapper status on myaadhaar.uidai.gov.in',
    selection_stages: '1. Apply on scholarship.odisha.gov.in or scholarships.gov.in -> 2. Register on empmissionodisha.gov.in & ncs.gov.in -> 3. Verify NPCI Aadhaar Seeding -> 4. Track Disbursement on pfms.nic.in',
    pst_pet_skill_norms: 'Never share OTP, ATM PIN, or UPI PIN to "claim" a scholarship or job-fair payout—DBT credits automatically without user action.',
    documents_checklist: '1. Scholarship Application ID / NSP OTR ID\n2. Aadhaar-Seeded Bank Account Details\n3. Odisha Employment Exchange Registration Number\n4. PFMS Payment Reference Number',
    application_steps: '1. Track Odisha State Scholarships at scholarship.odisha.gov.in.\n2. Track Central NSP & DBT payments at pfms.nic.in -> Know Your Payment / Track NSP Payments.\n3. Register for jobs at empmissionodisha.gov.in and ncs.gov.in.',
    official_portal_url: 'https://pfms.nic.in/',
    summary_en: 'Master portal guide linking Odisha Scholarship Portal, NSP, NCS, Odisha Employment Exchange (EmpMission), and PFMS DBT payment status tracker.',
    summary_or: 'ଛାତ୍ରବୃତ୍ତି, ନିୟୋଜନ ଏବଂ PFMS DBT ପେମେଣ୍ଟ ପୋର୍ଟାଲ୍: scholarship.odisha.gov.in, NSP, NCS, empmissionodisha.gov.in ଏବଂ pfms.nic.in ଟ୍ରାକିଂ ଗାଇଡ୍।',
    body_html: '<h3>Unified Tracking for Scholarships, Jobs & DBT</h3><p>Use <strong>pfms.nic.in</strong> to track Central/NSP Direct Benefit Transfers, <strong>scholarship.odisha.gov.in</strong> for State schemes, and <strong>empmissionodisha.gov.in</strong> + <strong>ncs.gov.in</strong> for verified employment registration.</p>',
    body_or: '<h3>ଛାତ୍ରବୃତ୍ତି, ନିଯୁକ୍ତି ଏବଂ DBT ଟ୍ରାକିଂ</h3><p>ସମସ୍ତ ସରକାରୀ ଛାତ୍ରବୃତ୍ତି ଏବଂ ନିଯୁକ୍ତି ପଞ୍ଜୀକରଣ ପାଇଁ କେବଳ .gov.in / .nic.in ପୋର୍ଟାଲ୍ ବ୍ୟବହାର କରନ୍ତୁ।</p>',
    tags: ['PFMS DBT', 'Scholarship Portal', 'NCS', 'EmpMission Odisha']
  },
  {
    id: 'ji-ip-skill-apprenticeship-msme',
    folderKey: 'odisha',
    fallbackFolder: 'jf-ip-verified-portals',
    slug: 'skill-apprenticeship-and-msme-portals-sctevt-ncvt-naps-udyam',
    title: 'Skill, Apprenticeship & MSME Portals (SCTE&VT Odisha, NCVT MIS, NAPS apprenticeshipindia.gov.in, NATS, World Skill Center, Udyam Registration)',
    title_or: 'ଦକ୍ଷତା, ଆପ୍ରେଣ୍ଟିସଶିପ୍ ଏବଂ MSME ପୋର୍ଟାଲ୍ (SCTE&VT ଓଡ଼ିଶା, NCVT MIS, NAPS, NATS, WSC, ଉଦ୍ୟମ)',
    conducting_body: 'SCTE&VT Odisha, DGT (NCVT), MSDE (NAPS), MoE (NATS), OSDA & Ministry of MSME',
    exam_code: 'SKILL-TVET-MSME-PORTALS',
    cadre_group: 'ITI, Polytechnic Diploma, Engineering Graduates, Skill Trainees & MSME Founders',
    pay_matrix: '100% Free Official Portals (Zero Private Middleman Fees)',
    age_limit_relaxation: 'Open to all skill trainees, apprentices & MSME entrepreneurs',
    qualification_odia_rule: 'Verify ITI National Trade Certificates (NTC) on ncvtmis.gov.in / skillindiadigital.gov.in and Polytechnic Diplomas on sctevtodisha.nic.in',
    selection_stages: '1. Verify Diploma/ITI Result on sctevtodisha.nic.in or ncvtmis.gov.in -> 2. Register for Paid Apprenticeship on NAPS/NATS -> 3. Apply for WSC Bhubaneswar at worldskillcenter.org -> 4. Register MSME at udyamregistration.gov.in',
    pst_pet_skill_norms: 'Caution: Private websites like "udyam-registration.org" or "udyamcertificate.com" charge ₹1,500–₹3,000 for what is 100% FREE on udyamregistration.gov.in.',
    documents_checklist: '1. ITI NCVT / SCTE&VT Registration Number\n2. Aadhaar & Bank Details (for NAPS/NATS DBT)\n3. PAN & Aadhaar (for Free Udyam Registration)',
    application_steps: '1. Polytechnics/Diploma: sctevtodisha.nic.in | ITI: ncvtmis.gov.in.\n2. Apprenticeships: apprenticeshipindia.gov.in (NAPS) & nats.education.gov.in (NATS).\n3. MSME Udyam: strictly udyamregistration.gov.in (Free).',
    official_portal_url: 'https://sctevtodisha.nic.in/',
    summary_en: 'Verified directory of SCTE&VT Odisha, NCVT MIS, NAPS, NATS, World Skill Center Bhubaneswar, and free MSME Udyam Registration portals.',
    summary_or: 'ଦକ୍ଷତା, ଆପ୍ରେଣ୍ଟିସଶିପ୍ ଏବଂ MSME ପୋର୍ଟାଲ୍: SCTE&VT ଓଡ଼ିଶା, NCVT MIS, NAPS, NATS, ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର ଏବଂ ମାଗଣା ଉଦ୍ୟମ ପଞ୍ଜୀକରଣ ଗାଇଡ୍।',
    body_html: '<h3>Official TVET, Apprenticeship & MSME Portals</h3><p>Verify technical diplomas on <strong>sctevtodisha.nic.in</strong>, ITI certificates on <strong>ncvtmis.gov.in</strong>, apprenticeships on <strong>apprenticeshipindia.gov.in</strong> &amp; <strong>nats.education.gov.in</strong>, and register MSMEs for free exclusively on <strong>udyamregistration.gov.in</strong>.</p>',
    body_or: '<h3>ପ୍ରାମାଣିକ ବୈଷୟିକ ଶିକ୍ଷା ଓ MSME ପୋର୍ଟାଲ୍</h3><p>ଡ଼ିପ୍ଲୋମା ପାଇଁ sctevtodisha.nic.in, ITI ପାଇଁ ncvtmis.gov.in, ଆପ୍ରେଣ୍ଟିସଶିପ୍ ପାଇଁ NAPS/NATS ଏବଂ ମାଗଣା MSME ପଞ୍ଜୀକରଣ ପାଇଁ କେବଳ udyamregistration.gov.in ବ୍ୟବହାର କରନ୍ତୁ।</p>',
    tags: ['SCTEVT Odisha', 'NCVT MIS', 'NAPS NATS', 'Udyam Free']
  },
  {
    id: 'ji-ip-antiscam-recruitment-1930',
    folderKey: 'job notification verification',
    fallbackFolder: 'jf-ip-antifraud',
    slug: 'anti-scam-recruitment-fake-job-offer-and-cybercrime-1930-guide',
    title: 'Anti-Scam Recruitment & Fake Job Offer Verification Handbook — How to Detect Fake Appointment Letters, Lookalike .org/.com Portals & UPI Fee Frauds (1930 / cybercrime.gov.in)',
    title_or: 'ପ୍ରତାରଣା-ନିରୋଧୀ ନିଯୁକ୍ତି ଏବଂ ନକଲି ଚାକିରି ଅଫର୍ ଯାଞ୍ଚ ହ୍ୟାଣ୍ଡବୁକ୍ (୧୯୩୦ / cybercrime.gov.in)',
    conducting_body: 'I4C (MHA Cybercrime 1930), Odisha Police Cyber Cell & CSOdisha Verification Desk',
    exam_code: 'ANTISCAM-1930-VERIFY',
    cadre_group: 'All Govt, PSU, Private & Overseas Job Seekers in Odisha',
    pay_matrix: 'Zero-Tolerance Financial Fraud Rule: Report Within "Golden Hour" on 1930 to Freeze Fraudster Accounts',
    age_limit_relaxation: 'Applicable to every job seeker & parent',
    qualification_odia_rule: '6 Golden Rules: (1) Govt sites end in .gov.in/.nic.in; (2) No Govt/PSU conducts "direct interview-less WhatsApp selection"; (3) Genuine private firms NEVER ask for security deposit/laptop/training fee; (4) Verify CIN on mca.gov.in',
    selection_stages: '1. Inspect Sender Domain & Email (gmail.com != hr@tcs.com / opsc.gov.in) -> 2. Cross-Check Advertisement on Official .gov.in Site -> 3. Never Pay UPI/QR/Gift-Card "Verification Fees" -> 4. If Scammed, Call 1930 Immediately & File on cybercrime.gov.in',
    pst_pet_skill_norms: 'Common Odisha Scams: Fake OMC/NALCO/MCL/Tata Steel "direct joining letters", fake Gramin Dak Sevak / Anganwadi lists, and Telegram "prepaid task" scams.',
    documents_checklist: '1. Screenshots of Fraudulent Offer Letter, Website URL & Chat Logs\n2. UPI Transaction ID / UTR Number & Bank Statement\n3. Fraudster Phone Number & Account Details (for 1930 Complaint)',
    application_steps: '1. Cross-check every recruitment notice on the official .gov.in / company careers page.\n2. Never pay money for an interview, offer letter, or "refundable security deposit".\n3. If money is lost, call 1930 immediately (within 1–2 hours) and submit evidence at cybercrime.gov.in.',
    official_portal_url: 'https://cybercrime.gov.in/',
    summary_en: 'Essential anti-scam handbook on spotting fake appointment letters, lookalike .com/.org job sites, and UPI fee frauds, with immediate 1930 & cybercrime.gov.in reporting steps.',
    summary_or: 'ପ୍ରତାରଣା-ନିରୋଧୀ ନିଯୁକ୍ତି ଗାଇଡ୍: ନକଲି ନିଯୁକ୍ତି ପତ୍ର, ଫିସିଂ .com/.org ୱେବସାଇଟ୍ ଏବଂ UPI ଠକେଇ ଚିହ୍ନଟ କରିବା ସହିତ ୧୯୩୦ ଓ cybercrime.gov.in ରେ ଅଭିଯୋଗ ପ୍ରକ୍ରିୟା।',
    body_html: '<h3>7 Red Flags of a Fake Job Offer</h3><ul><li>Email sent from <code>@gmail.com</code> / <code>@yahoo.com</code> instead of corporate or <code>.gov.in</code> domain.</li><li>Demand for "registration fee", "uniform/laptop deposit", or "document verification fee" via UPI.</li><li>Direct appointment letter issued without an official exam/interview.</li></ul><p>If defrauded, call <strong>1930</strong> immediately and report at <strong>cybercrime.gov.in</strong>.</p>',
    body_or: '<h3>ନକଲି ଚାକିରି ଅଫରର ୭ଟି ସତର୍କ ସଙ୍କେତ</h3><p>କୌଣସି ପ୍ରକୃତ ସରକାରୀ କିମ୍ବା କର୍ପୋରେଟ୍ କମ୍ପାନୀ ସାକ୍ଷାତକାର ବା ଅଫର୍ ଲେଟର୍ ପାଇଁ UPI ମାଧ୍ୟମରେ ଟଙ୍କା ମାଗେ ନାହିଁ। ଠକେଇର ଶିକାର ହେଲେ ତୁରନ୍ତ <strong>୧୯୩୦</strong> କୁ କଲ୍ କରନ୍ତୁ।</p>',
    tags: ['Anti-Fraud', 'Cybercrime 1930', 'Fake Job Alert', 'Verification']
  },
  {
    id: 'ji-ip-fake-university-ugc-deb',
    folderKey: 'education and scholarship verification',
    fallbackFolder: 'jf-ip-antifraud',
    slug: 'fake-university-unapproved-college-and-ugc-deb-degree-validity-guide',
    title: 'Fake University, Unapproved College & Distance / Online Degree Validity Verification Guide (UGC DEB & AICTE Approval Check Before Admission)',
    title_or: 'ନକଲି ବିଶ୍ୱବିଦ୍ୟାଳୟ, ଅନନୁମୋଦିତ କଲେଜ୍ ଏବଂ ଦୂରବର୍ତ୍ତୀ / ଅନଲାଇନ୍ ଡିଗ୍ରୀ ବୈଧତା ଯାଞ୍ଚ ଗାଇଡ୍ (UGC DEB ଓ AICTE)',
    conducting_body: 'University Grants Commission (UGC / DEB), AICTE & Higher Education Dept, Odisha',
    exam_code: 'UGC-DEB-FAKE-UNIV-CHECK',
    cadre_group: 'Regular, Distance (ODL) & Online Degree Aspirants in Odisha',
    pay_matrix: 'Zero-Cost Statutory Verification Prevents Loss of ₹50,000–₹5,00,000+ & Disqualification',
    age_limit_relaxation: 'Check BEFORE paying admission fees to any study centre or private university',
    qualification_odia_rule: 'UGC Public Notice: Verify (1) University is NOT on UGC Fake University List; (2) Distance/Online (ODL/OL) programme is approved by UGC-DEB (deb.ugc.ac.in) for that exact academic session; (3) Engineering/B.Tech CANNOT be done by distance mode',
    selection_stages: '1. Check ugc.gov.in Fake University List -> 2. Verify ODL/Online Degree Approval on deb.ugc.ac.in -> 3. Confirm Study Centre Territorial Jurisdiction -> 4. Verify Previous Govt Job Equivalence Rules',
    pst_pet_skill_norms: 'Territorial Jurisdiction Rule: State private universities cannot open off-campus study centres in Odisha outside their home state without prior UGC/State approval.',
    documents_checklist: '1. University Name & UGC Act Section 2(f)/12(B) Status\n2. UGC-DEB Session-Wise ODL/Online Programme Approval Screenshot\n3. Official University Fee Receipt (Direct to University, NOT agent)',
    application_steps: '1. Check deb.ugc.ac.in before enrolling in any Distance (ODL) or Online B.A./B.Com/M.A./MBA/MCA.\n2. Remember: B.Tech/BE/MBBS/Nursing/B.Ed. (except NCTE-approved in-service) are NOT valid via regular distance study-centre franchises.\n3. For Odisha residents, OSOU (osou.ac.in) and IGNOU (ignou.ac.in) are verified public open universities.',
    official_portal_url: 'https://deb.ugc.ac.in/',
    summary_en: 'Pre-admission guide to spotting fake universities, unapproved off-campus study centres, and invalid distance degrees using UGC Fake List, UGC-DEB (deb.ugc.ac.in), and AICTE checks.',
    summary_or: 'ନକଲି ବିଶ୍ୱବିଦ୍ୟାଳୟ ଏବଂ ଦୂରବର୍ତ୍ତୀ/ଅନଲାଇନ୍ ଡିଗ୍ରୀ ବୈଧତା ଯାଞ୍ଚ ଗାଇଡ୍: UGC ନକଲି ତାଲିକା, UGC-DEB (deb.ugc.ac.in) ଏବଂ OSOU/IGNOU ମାନ୍ୟତା ଯାଞ୍ଚ ସୂଚନା।',
    body_html: '<h3>Verify Distance (ODL) & Online Degrees on UGC-DEB</h3><p>Never enrol in a distance or online degree through a local coaching/franchise centre without checking <strong>deb.ugc.ac.in</strong> for that exact university, programme, and academic year. In Odisha, <strong>OSOU (osou.ac.in)</strong> and <strong>IGNOU (ignou.ac.in)</strong> are recognised public open universities.</p>',
    body_or: '<h3>UGC-DEB ରେ ଦୂରବର୍ତ୍ତୀ ଓ ଅନଲାଇନ୍ ଡିଗ୍ରୀ ଯାଞ୍ଚ କରନ୍ତୁ</h3><p>କୌଣସି ଘରୋଇ ଷ୍ଟଡି ସେଣ୍ଟରରେ ନାମ ଲେଖାଇବା ପୂର୍ବରୁ <strong>deb.ugc.ac.in</strong> ରେ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଓ ପାଠ୍ୟକ୍ରମର ମାନ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ। ଓଡ଼ିଶାରେ <strong>OSOU</strong> ଏବଂ <strong>IGNOU</strong> ସ୍ୱୀକୃତିପ୍ରାପ୍ତ ସରକାରୀ ମୁକ୍ତ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଅଟନ୍ତି।</p>',
    tags: ['UGC DEB', 'Fake University Check', 'ODL Validity', 'OSOU IGNOU']
  }
];

export async function enrichInstitutionsPortalsCategory08(db, now) {
  if (!db) return { foldersUpdated: 0, itemsUpserted: 0 };
  const ts = now || new Date().toISOString();

  // 1. Enrich all depth >= 1 folders in Category #08
  const foldersRes = await db
    .prepare("SELECT * FROM jobs_directory_folders WHERE domain_slug IN ('institutions-portals', 'institutions-portals-verification', 'institutions-official-portals-verification') ORDER BY depth ASC, sort_order ASC, title ASC")
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
    const spec = CAT08_FOLDER_ENRICHMENTS[key] || buildSmartInstitutionsFolderEnrichment(f, parent ? parent.title : '');

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
    const nextSeoTitle = needsSeoTitle ? `${f.title} (${nextBadge}) — CSOdisha Official Portals` : f.seo_title;
    const nextSeoDesc = needsSeoDesc ? nextDescEn.slice(0, 300) : f.seo_description;
    const nextVerifiedAt = f.verified_at || ts;

    folderStmts.push(
      db.prepare(`UPDATE jobs_directory_folders
        SET description = ?, description_en = ?, description_or = ?, title_or = ?,
            hero_badge = ?, featured_badge = ?, seo_title = ?, seo_description = ?,
            verified_at = ?, updated_by = 'cat08-enrich', updated_at = ?
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

  // 2. Upsert all 12 Institutions, Official Portals & Verification handbooks
  const existingItemsRes = await db
    .prepare("SELECT id, slug, updated_by FROM jobs_directory_items WHERE domain_slug IN ('institutions-portals', 'institutions-portals-verification', 'institutions-official-portals-verification')")
    .all();
  const existingById = new Map((existingItemsRes.results || []).map((r) => [r.id, r]));
  const existingBySlug = new Map((existingItemsRes.results || []).map((r) => [r.slug, r]));

  const itemStmts = [];
  for (const item of CAT08_HANDBOOKS) {
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
    const seoTitle = `${item.title} | CSOdisha Official Portals`.slice(0, 160);
    const seoDesc = item.summary_en.slice(0, 300);

    if (existing) {
      itemStmts.push(
        db.prepare(`UPDATE jobs_directory_items
          SET folder_id = ?, title = ?, title_or = ?, item_type = 'official-portal',
              recruiting_body = ?, conducting_body = ?, exam_code = ?, cadre_group = ?,
              pay_matrix = ?, age_limit_relaxation = ?, qualification_odia_rule = ?,
              selection_stages = ?, pst_pet_skill_norms = ?, documents_checklist = ?,
              application_steps = ?, qualification_tag = ?,
              official_apply_url = ?, official_portal_url = ?,
              tags_json = ?, language = 'EN+OR', status = 'published', featured = 1,
              summary = ?, body_html = ?, seo_title = ?, seo_description = ?,
              verified_by = 'cat08-enrich@csodisha.com', verified_at = ?,
              updated_by = 'cat08-enrich', updated_at = ?
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
          VALUES (?, 'institutions-portals', ?, ?, ?, ?, 'official-portal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, 'EN+OR', 'published', 1, ?, ?, ?, ?, 'cat08-enrich@csodisha.com', ?, 'Odisha / India', 'cat08-enrich', 'cat08-enrich', ?, ?)`)
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
