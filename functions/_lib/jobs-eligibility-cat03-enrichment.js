// Category #03 (v70): Exhaustive Minute Bilingual Enrichment of Eligibility & Qualification Explorer (7 Subcategories + 10 Eligibility Handbooks)
// Idempotent D1 enrichment routine invoked by ensureJobsDirectoryStudioSchema(db).

const SYSTEM_AUTHORS = new Set(['seed', 'legacy-bridge', 'system', 'cat01-enrich', 'cat02-enrich', 'cat03-enrich', '']);

function isShort160(val) {
  return String(val || '').trim().length < 160;
}

function isCustomAdminEdit(row) {
  const updater = String(row?.updated_by || '').trim().toLowerCase();
  if (!updater || SYSTEM_AUTHORS.has(updater)) return false;
  return !isShort160(row?.description_en || row?.description) && !isShort160(row?.description_or);
}

// Tailored >=160-char bilingual metadata for all Category #03 folders (7 bridged + 6 seeded)
const CAT03_FOLDER_ENRICHMENTS = {
  'eligibility & qualification explorer': {
    title_or: 'ଯୋଗ୍ୟତା ଏବଂ ଶିକ୍ଷାଗତ ମାନଦଣ୍ଡ ଡାଇରେକ୍ଟୋରୀ',
    badge: 'CAT #03',
    en: 'Master Odisha and National Eligibility & Qualification Explorer mapping 10th/HSC, +2 CHSE, ITI/Diploma (SCTE&VT), Graduation, PG/NET/GATE, mandatory Odia ME/HSC language rules, SEBC/SC/ST/Women/PwD age relaxations, and PST/PET physical standards.',
    or: 'ଓଡ଼ିଶା ଏବଂ ଜାତୀୟ ଯୋଗ୍ୟତା ଡାଇରେକ୍ଟୋରୀ: ଦଶମ/HSC, +୨ CHSE, ITI/ଡିପ୍ଲୋମା (SCTE&VT), ସ୍ନାତକ, PG/NET/GATE, ବାଧ୍ୟତାମୂଳକ ଓଡ଼ିଆ ଭାଷା ନିୟମ, SEBC/SC/ST/ମହିଳା/PwD ବୟସ କୋହଳ ଏବଂ ଶାରୀରିକ ମାନଦଣ୍ଡର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'educational eligibility': {
    title_or: 'ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା ମାନଦଣ୍ଡ',
    badge: 'EDUCATION RULES',
    en: 'Detailed educational qualification matrix for Odisha and Central Government jobs from 10th pass, +2 Arts/Science/Commerce/Vocational, ITI/Polytechnic Diploma, and Any-Stream Graduation to Professional Degrees, B.Ed./OTET/OSSTET, and PG/Ph.D. equivalence.',
    or: 'ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା ମାନଦଣ୍ଡ: ଦଶମ, +୨ (କଳା/ବିଜ୍ଞାନ/ବାଣିଜ୍ୟ/ଧନ୍ଦାମୂଳକ), ITI/ଡିପ୍ଲୋମା, ଯେକୌଣସି ବିଭାଗରେ ସ୍ନାତକ, B.Tech/MBBS/LLB/B.Ed. ଏବଂ ସ୍ନାତକୋତ୍ତର ଡିଗ୍ରୀର ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା ଯୋଗ୍ୟତା ସୂଚନା।'
  },
  'age eligibility': {
    title_or: 'ବୟସ ସୀମା ଏବଂ କୋହଳ ନିୟମାବଳୀ',
    badge: 'AGE MATRIX',
    en: 'Authoritative Odisha State and Central Government age-limit reference detailing minimum/maximum entry ages (18–38 years for Odisha Group B/C), cut-off date calculations, and statutory relaxations for SEBC, SC, ST, Women, PwD, and Ex-Servicemen.',
    or: 'ବୟସ ସୀମା ଏବଂ କୋହଳ ନିୟମାବଳୀ: ଓଡ଼ିଶା ସରକାରଙ୍କ ଗ୍ରୁପ୍-B/C ପଦବୀ (୨୧-୩୮ ବର୍ଷ) ଓ କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷାର ସର୍ବନିମ୍ନ/ସର୍ବାଧିକ ବୟସ, କଟ୍-ଅଫ୍ ତାରିଖ ଗଣନା ଏବଂ SEBC, SC, ST, ମହିଳା, PwD ଓ ପୂର୍ବତନ ସୈନିକଙ୍କ ପାଇଁ ବୟସ କୋହଳ।'
  },
  'reservation and category rules': {
    title_or: 'ସଂରକ୍ଷଣ ଏବଂ ବର୍ଗଗତ ପ୍ରମାଣପତ୍ର ନିୟମ',
    badge: 'RESERVATION',
    en: 'Complete Odisha reservation and certificate validity guide covering SC (16.25%), ST (22.5%), SEBC (11.25% State / OBC-NCL Central), EWS (Central), Women (33% horizontal), PwD (4% UDID), Ex-Servicemen, and Sports quota documentation norms.',
    or: 'ସଂରକ୍ଷଣ ଏବଂ ପ୍ରମାଣପତ୍ର ନିୟମ: ଓଡ଼ିଶାରେ SC (୧୬.୨୫%), ST (୨୨.୫%), SEBC (୧୧.୨୫%), ମହିଳା (୩୩%), ଭିନ୍ନକ୍ଷମ (୪% UDID), ପୂର୍ବତନ ସୈନିକ ଏବଂ କ୍ରୀଡ଼ା କୋଟା ସହିତ e-District ପ୍ରମାଣପତ୍ର ବୈଧତା ନିୟମାବଳୀ।'
  },
  'physical and medical standards': {
    title_or: 'ଶାରୀରିକ ମାପଦଣ୍ଡ (PST/PET) ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ପରୀକ୍ଷା',
    badge: 'PST / PET / MED',
    en: 'Standardized Physical Standard Test (PST), Physical Efficiency Test (PET), and Medical Fitness benchmark across OPRB Odisha Police SI/Constable, OSSSC Forest Guard/Forester/Excise, Fire Service, RRB Group D/ALP, SSC GD/CPO, and Defence Agniveer.',
    or: 'ଶାରୀରିକ ମାପଦଣ୍ଡ (PST/PET) ଏବଂ ମେଡିକାଲ୍ ପରୀକ୍ଷା: ଓଡ଼ିଶା ପୋଲିସ୍ SI/କନେଷ୍ଟବଳ, ଫରେଷ୍ଟ ଗାର୍ଡ/ଅବକାରୀ, ଫାୟାର ସର୍ଭିସ୍, ରେଳବାଇ, SSC GD ଏବଂ ପ୍ରତିରକ୍ଷା ଅଗ୍ନିବୀର ପରୀକ୍ଷାର ଉଚ୍ଚତା, ଛାତି, ଦୌଡ଼ ଏବଂ ଚକ୍ଷୁ ପରୀକ୍ଷା ମାନଦଣ୍ଡ।'
  },
  'other eligibility conditions': {
    title_or: 'ଓଡ଼ିଆ ଭାଷା ନିୟମ ଏବଂ ଅନ୍ୟାନ୍ୟ ଯୋଗ୍ୟତା',
    badge: 'ODIA & MISC',
    en: 'Essential Odisha-specific eligibility conditions including mandatory Odia language pass (ME Standard / HSC / BSE Single-Subject Odia Test), Odisha Domicile/Nativity proof, Employment Exchange registration, marital/character rules, and degree equivalence.',
    or: 'ଓଡ଼ିଆ ଭାଷା ନିୟମ ଓ ଅନ୍ୟାନ୍ୟ ଯୋଗ୍ୟତା: ବାଧ୍ୟତାମୂଳକ ଓଡ଼ିଆ ଭାଷା ଯୋଗ୍ୟତା (ME/HSC/BSE ଏକକ-ବିଷୟ ଓଡ଼ିଆ ପରୀକ୍ଷା), ଓଡ଼ିଶା ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର, ନିୟୋଜନ କାର୍ଯ୍ୟାଳୟ ପଞ୍ଜୀକରଣ, ଚରିତ୍ର ପ୍ରମାଣପତ୍ର ଏବଂ ଡିଗ୍ରୀ ସମତୁଲ୍ୟତା ନିୟମ।'
  },
  'eligibility comparison tools': {
    title_or: 'ଯୋଗ୍ୟତା ତୁଳନା ଏବଂ ଚେକ୍-ଲିଷ୍ଟ ଟୁଲ୍',
    badge: 'ELIGIBILITY TOOLS',
    en: 'Interactive qualification-to-exam comparison matrices allowing Odisha students to cross-check OPSC, OSSC, OSSSC, UPSC, SSC, RRB, IBPS, and Defence eligibility by marks percentage, age bracket, Odia pass status, and required Tahasil certificates.',
    or: 'ଯୋଗ୍ୟତା ତୁଳନା ଟୁଲ୍: ଓଡ଼ିଶାର ପରୀକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ ପ୍ରତିଶତ ମାର୍କ, ବୟସ ସୀମା, ଓଡ଼ିଆ ଭାଷା ଯୋଗ୍ୟତା ଏବଂ ତହସିଲ୍ ପ୍ରମାଣପତ୍ର ଆଧାରରେ OPSC, OSSC, OSSSC, UPSC, SSC, RRB ଓ IBPS ପରୀକ୍ଷାର ତୁଳନାତ୍ମକ ଚେକ୍-ଲିଷ୍ଟ।'
  },
  '10th / matric & +2 / 12th pass': {
    title_or: 'ଦଶମ (ମାଟ୍ରିକ୍) ଏବଂ +୨ ପାସ୍ ଯୋଗ୍ୟତା',
    badge: 'SCHOOL LEVEL',
    en: 'Comprehensive opportunity and eligibility guide for BSE Odisha Class 10 (Matric) and CHSE +2 (Arts, Science, Commerce, Vocational) pass candidates across State Group-C/D, Police, Forest, SSC MTS/CHSL/GD, RRB, India Post GDS, and Agniveer.',
    or: 'ଦଶମ (ମାଟ୍ରିକ୍) ଏବଂ +୨ ପାସ୍ ଯୋଗ୍ୟତା: BSE ଓଡ଼ିଶା ଦଶମ ଓ CHSE +୨ (କଳା/ବିଜ୍ଞାନ/ବାଣିଜ୍ୟ) ପାସ୍ ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ ଓଡ଼ିଶା ପୋଲିସ୍, ଫରେଷ୍ଟ ଗାର୍ଡ, SSC MTS/CHSL/GD, ରେଳବାଇ, ଡାକ GDS ଏବଂ ଅଗ୍ନିବୀର ନିଯୁକ୍ତି ସୂଚନା।'
  },
  'iti, polytechnic & technical trades': {
    title_or: 'ଆଇଟିଆଇ (ITI), ପଲିଟେକ୍ନିକ୍ ଏବଂ ବୈଷୟିକ ବୃତ୍ତି',
    badge: 'TECHNICAL',
    en: 'Complete eligibility matrix for NCVT/SCVT ITI and SCTE&VT Odisha Polytechnic Diploma holders targeting OSSC CTSRE Junior Engineer, RRB ALP/Technician, NALCO/MCL/SAIL/HAL non-executive cadres, and NAPS/NATS paid apprenticeships.',
    or: 'ITI ଓ ପଲିଟେକ୍ନିକ୍ ଡିପ୍ଲୋମା ଯୋଗ୍ୟତା: NCVT/SCVT ITI ଏବଂ SCTE&VT ଡିପ୍ଲୋମା ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ OSSC CTSRE ଜୁନିଅର ଇଞ୍ଜିନିୟର, RRB ALP/ଟେକ୍ନିସିଆନ୍, NALCO/MCL/SAIL ନିଯୁକ୍ତି ଏବଂ NAPS/NATS ପ୍ରଶିକ୍ଷଣ ସୂଚନା।'
  },
  'graduates, postgraduates & reservation rules': {
    title_or: 'ସ୍ନାତକ, ସ୍ନାତକୋତ୍ତର ଏବଂ ସଂରକ୍ଷଣ ନିୟମାବଳୀ',
    badge: 'DEGREE & QUOTA',
    en: 'Unified eligibility handbook for Any-Stream Graduates, Professional Degree holders (B.Tech/MBBS/LLB/B.Ed.), and Postgraduates (NET/GATE/Ph.D.) alongside Odisha GA & PG Department reservation, age relaxation, and equivalence rules.',
    or: 'ସ୍ନାତକ, ସ୍ନାତକୋତ୍ତର ଓ ସଂରକ୍ଷଣ ନିୟମ: ସାଧାରଣ ସ୍ନାତକ, ବୃତ୍ତିଗତ ଡିଗ୍ରୀ (B.Tech/MBBS/LLB/B.Ed.) ଓ PG/NET/GATE ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ରୀୟ ନିଯୁକ୍ତି ଯୋଗ୍ୟତା ଓ ସଂରକ୍ଷଣ ନିୟମାବଳୀ।'
  },
  '10th pass govt & defence': {
    title_or: 'ଦଶମ ପାସ୍ ସରକାରୀ ଏବଂ ପ୍ରତିରକ୍ଷା ନିଯୁକ୍ତି',
    badge: '10TH PASS',
    en: 'Dedicated eligibility guide for Class 10 / Matriculation pass candidates covering SSC MTS & Havaldar, SSC GD Constable, RRB Group D Level-1, India Post GDS (Odisha Circle), Odisha Police Battalion Constable/Sepoy, and Army/Navy Agniveer.',
    or: 'ଦଶମ ପାସ୍ ସରକାରୀ ଓ ପ୍ରତିରକ୍ଷା ନିଯୁକ୍ତି: ମାଟ୍ରିକ୍ ପାସ୍ ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ SSC MTS, SSC GD କନେଷ୍ଟବଳ, RRB ଗ୍ରୁପ୍-D, ଭାରତୀୟ ଡାକ GDS, ଓଡ଼ିଶା ପୋଲିସ୍ କନେଷ୍ଟବଳ/ସିପାହୀ ଏବଂ ଅଗ୍ନିବୀର ଯୋଗ୍ୟତା ମାନଦଣ୍ଡ।'
  },
  'any-stream graduate opportunities': {
    title_or: 'ଯେକୌଣସି ବିଭାଗରେ ସ୍ନାତକ ନିଯୁକ୍ତି ସୁଯୋଗ',
    badge: 'GRADUATE',
    en: 'Complete graduate eligibility matrix for BA, B.Sc., B.Com., BBA, and BCA holders covering OPSC OCS (OAS/OFS), OPSC/High Court ASO, OSSC CGLRE, OSSSC RI/ICDS Supervisor, UPSC CSE/CAPF, SSC CGL, and IBPS/SBI/RBI Officer exams.',
    or: 'ଯେକୌଣସି ବିଭାଗରେ ସ୍ନାତକ ସୁଯୋଗ: BA/B.Sc./B.Com./BBA/BCA ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ OPSC OAS, OPSC/ହାଇକୋର୍ଟ ASO, OSSC CGLRE, OSSSC RI, UPSC CSE, SSC CGL ଏବଂ IBPS/SBI ବ୍ୟାଙ୍କିଂ ପରୀକ୍ଷା ଯୋଗ୍ୟତା।'
  },
  'odisha age limit & category relaxation': {
    title_or: 'ଓଡ଼ିଶା ବୟସ ସୀମା ଏବଂ ବର୍ଗଗତ କୋହଳ',
    badge: 'AGE & QUOTA',
    en: 'Official Government of Odisha GA & PG Department reference for upper age limits (38 years standard for State Group B/C), 5-year SC/ST/SEBC/Women relaxation, 10–15 year PwD relaxation, Ex-Servicemen norms, and Tahasil certificate validity.',
    or: 'ଓଡ଼ିଶା ବୟସ ସୀମା ଓ ବର୍ଗଗତ କୋହଳ: ଓଡ଼ିଶା ସରକାରଙ୍କ GA & PG ବିଭାଗ ନିୟମ ଅନୁଯାୟୀ ୩୮ ବର୍ଷ ସର୍ବାଧିକ ବୟସ, SC/ST/SEBC/ମହିଳାଙ୍କ ପାଇଁ ୫ ବର୍ଷ, PwD ପାଇଁ ୧୦-୧୫ ବର୍ଷ କୋହଳ ଏବଂ ପ୍ରମାଣପତ୍ର ବୈଧତା।'
  }
};

function buildSmartEligibilityFolderEnrichment(folder, parentTitle) {
  const title = String(folder.title || '').trim();
  return {
    title_or: folder.title_or || `${title} (ଯୋଗ୍ୟତା ନିୟମ)`,
    badge: 'ELIGIBILITY',
    en: `Verified Odisha & National eligibility guide for ${title}${parentTitle ? ` under ${parentTitle}` : ''}, covering minimum educational percentage, Odia ME/HSC language rules, SEBC/SC/ST/Women/PwD age relaxations, and required Tahasil documents.`,
    or: `${title} ଯୋଗ୍ୟତା ମାର୍ଗଦର୍ଶିକା: ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ସରକାରୀ ନିଯୁକ୍ତି ପାଇଁ ସର୍ବନିମ୍ନ ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା, ଓଡ଼ିଆ ଭାଷା ନିୟମ (ME/HSC), ବୟସ ସୀମା କୋହଳ ଏବଂ ଆବଶ୍ୟକୀୟ ତହସିଲ୍ ପ୍ରମାଣପତ୍ରର ବିସ୍ତୃତ ସୂଚନା।`
  };
}

// 10 Exhaustive Minute Bilingual Eligibility Handbooks (Category #03)
const CAT03_HANDBOOKS = [
  {
    id: 'ji-ee-10th-pass-matrix',
    slug: '10th-pass-matric-bse-odisha-govt-defence-railway-matrix',
    folderHints: ['10th-pass-govt-defence', '10th / matric', 'educational eligibility'],
    title: '10th Pass (Matriculation / BSE Odisha HSC) — Govt Jobs, Defence, Railway & Skill Matrix',
    title_or: 'ଦଶମ ପାସ୍ (ମାଟ୍ରିକ୍ / BSE ଓଡ଼ିଶା) — ସରକାରୀ ଚାକିରି, ପ୍ରତିରକ୍ଷା, ରେଳବାଇ ଏବଂ ଦକ୍ଷତା ମ୍ୟାଟ୍ରିକ୍ସ',
    conducting_body: 'OPRB / SSC / RRB / India Post / Indian Army / Indian Navy / OSDA',
    cadre_group: 'Group C & Level-1 Central/State Posts & ITI/Apprenticeship Entries',
    pay_matrix: 'State Level-4/5 (₹19,900–₹69,100); Central Level-1/3 (₹18,000–₹69,100); Agniveer ₹30k–₹40k + Seva Nidhi.',
    age_limit_relaxation: '18–23 yrs (GD/Police), 18–25/27 yrs (SSC MTS), 18–33 yrs (RRB), 18–40 yrs (India Post GDS), 17.5–21 yrs (Agniveer). +3/+5/+10 yrs category relaxations.',
    qualification_odia_rule: 'Pass in Class 10 / HSC from BSE Odisha, CBSE, ICSE or equivalent. Mandatory Odia subject in Class 10 for India Post GDS Odisha Circle & Odisha Police Battalion Constable/Sepoy.',
    selection_stages: 'SSC MTS/GD & Police Constable: Computer Based Test (Odia medium available in MTS/GD/Army CEE) + PST/PET (for uniformed posts); India Post GDS: Merit list based on Class 10 marks (no exam).',
    pst_pet_skill_norms: 'Uniformed 10th-pass posts require 1.6 km / 5 km run & height/chest standards; India Post GDS requires basic cycling/scooter ability & local Odia fluency.',
    documents_checklist: 'BSE Odisha / Board HSC Pass Certificate & Marksheet, Odia Language Pass Proof, Tahasil Resident & Caste Certificate, Aadhaar, Medical Fitness, Driving Licence (if applicable).',
    application_steps: '1. Verify Board roll number & exact percentage. 2. Check Odia language eligibility for State/GDS posts. 3. Register on ssc.gov.in / rrbapply.gov.in / indiapostgdsonline.gov.in / odishapolice.gov.in.',
    academic_pathways: 'Higher Education after 10th: +2 CHSE (Arts/Science/Commerce/Vocational via SAMS), 3-yr Polytechnic Diploma (DET/SCTE&VT), or 2-yr ITI (NCVT/SCVT via SAMS Odisha).',
    premier_institutions: 'Govt ITIs (Cuttack, Bhubaneswar, Berhampur, Rourkela, Balasore), Govt Polytechnics, World Skill Center Bhubaneswar.',
    entrance_licensing: 'SAMS Odisha (+2 / ITI), Odisha DET (Diploma), SSC MTS/GD, RRB Group D, India Post GDS, Army CEE.',
    skills_certifications: 'NSQF Level-4 ITI trades (Electrician, Fitter, Welder, COPA), NAPS Apprenticeship, basic computer & Odia typing.',
    qualification_tag: '10th Pass (BSE Odisha / CBSE / ICSE)',
    official_portal_url: 'https://www.bseodisha.ac.in/',
    summary: 'Complete 10th Pass (Matriculation) eligibility matrix for Odisha youth covering Odisha Police Constable, SSC MTS/GD, RRB Group D, India Post GDS, Agniveer, and ITI/Diploma pathways.',
    tags: ['10th Pass', 'Matric', 'SSC MTS', 'India Post GDS', 'Agniveer', 'Odisha Police']
  },
  {
    id: 'ji-ee-plus2-chse-matrix',
    slug: 'plus2-chse-odisha-arts-science-commerce-govt-courses-matrix',
    folderHints: ['10th / matric & +2 / 12th pass', 'educational eligibility'],
    title: '+2 Higher Secondary (CHSE Odisha Arts, Science, Commerce & Vocational) — Exams & Courses Matrix',
    title_or: '+୨ ଉଚ୍ଚ ମାଧ୍ୟମିକ (CHSE ଓଡ଼ିଶା କଳା, ବିଜ୍ଞାନ, ବାଣିଜ୍ୟ ଓ ଧନ୍ଦାମୂଳକ) — ପରୀକ୍ଷା ଓ ପାଠ୍ୟକ୍ରମ ମ୍ୟାଟ୍ରିକ୍ସ',
    conducting_body: 'OSSC / OSSSC / SSC / RRB / UPSC (NDA) / NTA / OJEE',
    cadre_group: 'Group C State & Central Clerical, Forest, Revenue & Officer Cadet Entries',
    pay_matrix: 'OSSSC ARI/Amin/Forest Guard: ORSP Level-4/7 (₹19,900–₹81,100); SSC CHSL: Level-2/4/5; NDA Officer Entry: Level-10.',
    age_limit_relaxation: '18–38 yrs (Odisha State OSSSC/OSSC +5 SC/ST/SEBC/Women, +10 PwD); 18–27 yrs (SSC CHSL); 16.5–19.5 yrs (NDA).',
    qualification_odia_rule: 'Pass in +2 / Higher Secondary (Arts/Science/Commerce/Vocational) from CHSE Odisha, CBSE, ICSE or equivalent. Odia pass at ME/HSC level mandatory for OSSC CHSL & OSSSC posts.',
    selection_stages: 'OSSSC CRE (ARI/Amin/Forest Guard): Prelims + Mains CBT + Computer/Walking Test; OSSC 10+2 Specialist: Prelims + Technical Paper; SSC CHSL: Tier-I + Tier-II + Typing.',
    pst_pet_skill_norms: 'Forest Guard/Forester (+2 Science): 25 km/16 km walking PET; SSC CHSL / OSSSC ARI-Amin: English/Computer typing & MS Office practical skill test.',
    documents_checklist: 'HSC & +2 CHSE Pass Certificate & Marksheet, College Leaving Certificate (CLC), Conduct Certificate, Odia Pass Proof, Caste/Resident/Income Certificates.',
    application_steps: '1. Match stream (+2 Science PCB/PCM vs Any Stream) to target exam. 2. Apply via osssc.gov.in, ossc.gov.in, ssc.gov.in, or upsconline.nic.in (NDA). 3. Use SAMS Odisha for Degree/Professional admissions.',
    academic_pathways: 'After +2 Science: JEE/OJEE (B.Tech), NEET (MBBS/BDS/BAMS/Nursing), NEST/IAT (NISER/IISER), OUAT (Agri/Vet); After +2 Arts/Commerce: CUET-UG, CLAT (5-yr LLB), CA/CMA/CS Foundation, IHM (NCHM JEE).',
    premier_institutions: 'Ravenshaw University, BJB Autonomous College, NISER Jatni, IIT Bhubaneswar, NIT Rourkela, AIIMS Bhubaneswar, OUAT, NLUO Cuttack, IHM Bhubaneswar.',
    entrance_licensing: 'OJEE, JEE Main, NEET-UG, CUET-UG, CLAT, NATA, NEST, OUAT Entrance, NDA & NA.',
    skills_certifications: 'OS-CIT / DCA computer proficiency, English & Odia typing (35–40 wpm), Tally Prime (Commerce), Basic Lab/Field skills.',
    qualification_tag: '+2 / 12th Pass (CHSE Arts/Sci/Com/Voc)',
    official_portal_url: 'https://chseodisha.nic.in/',
    summary: 'Complete +2 Higher Secondary (CHSE Odisha) eligibility matrix mapping OSSSC ARI/Amin/Forest Guard, OSSC 10+2, SSC CHSL, NDA, and OJEE/NEET/JEE/CUET/CLAT admissions.',
    tags: ['+2 Pass', 'CHSE Odisha', 'OSSSC', 'SSC CHSL', 'OJEE', 'NEET', 'CLAT']
  },
  {
    id: 'ji-ee-iti-diploma-sctevt',
    slug: 'iti-ncvt-scvt-and-polytechnic-diploma-sctevt-odisha-matrix',
    folderHints: ['iti-polytechnic-trades', 'educational eligibility'],
    title: 'ITI (NCVT/SCVT) & Polytechnic Diploma (SCTE&VT Odisha) — JE, Technician, NAPS & PSU Matrix',
    title_or: 'ଆଇଟିଆଇ (NCVT/SCVT) ଏବଂ ପଲିଟେକ୍ନିକ୍ ଡିପ୍ଲୋମା (SCTE&VT ଓଡ଼ିଶା) — JE, ଟେକ୍ନିସିଆନ୍ ଓ PSU ମ୍ୟାଟ୍ରିକ୍ସ',
    conducting_body: 'OSSC (CTSRE) / SSC (JE) / RRB (JE/ALP/Tech) / NALCO / MCL / SAIL / NAPS-NATS',
    cadre_group: 'Group B Junior Engineer, Group C Technician & PSU Non-Executive Cadres',
    pay_matrix: 'OSSC/SSC/RRB Junior Engineer: ₹35,400–₹1,12,400 (Level-6/9); PSU Technician/ACT/OCT: ₹26,000–₹92,300; NAPS/NATS Stipend: ₹8,000–₹15,000/mo.',
    age_limit_relaxation: '21–38 yrs (OSSC CTSRE +5 SC/ST/SEBC/Women, +10 PwD); 18–30/32 yrs (SSC JE / PSU); 18–33/36 yrs (RRB ALP/Tech/JE).',
    qualification_odia_rule: '3-yr Diploma in Civil/Mech/Elec/Mining/Electronics from SCTE&VT Odisha / AICTE; OR 10th + ITI (NCVT/SCVT). Odia ME/HSC pass mandatory for OSSC CTSRE & Odisha State PSUs (OMC/OPTCL/OHPC).',
    selection_stages: 'OSSC CTSRE: Prelims CBT + Technical Paper (200 marks); RRB JE/ALP: CBT-1 + CBT-2 + CBAT (ALP); PSU ACT/OCT: Written CBT + Trade Skill Test.',
    pst_pet_skill_norms: 'RRB ALP requires A-1 medical vision (6/6 without glasses); Trade Skill Test tests practical wiring, welding, fitting, lathe, or AutoCAD/surveying.',
    documents_checklist: 'SCTE&VT Diploma / NCVT NTC-NAC Certificate & All-Semester Marksheets, Odia Pass Certificate, Valid Caste/Resident Certificate, NAPS/NATS Portal Registration ID.',
    application_steps: '1. Register on apprenticeshipindia.gov.in (NAPS for ITI) or nats.education.gov.in (NATS for Diploma). 2. Apply for OSSC CTSRE, SSC JE, RRB JE/ALP, and NALCO/MCL/SAIL/OMC drives.',
    academic_pathways: 'Lateral Entry B.Tech (2nd Year Direct Admission) via OJEE Lateral Entry exam for Diploma & B.Sc. holders; CITS Instructor training for ITI holders.',
    premier_institutions: 'BOYS/Govt Polytechnics (Bhubaneswar, Cuttack, Rourkela, Berhampur, Jharsuguda), IGIT Sarang (Diploma), World Skill Center Bhubaneswar.',
    entrance_licensing: 'OJEE Lateral Entry, OSSC CTSRE, SSC JE, RRB JE/ALP, CEA Wireman/Electrical Supervisor Permit, DGMS Overman/Sirdar.',
    skills_certifications: 'PLC/SCADA automation, CNC machining, AutoCAD/Revit, Solar PV installation, Industrial Safety (OSHA/NEBOSH).',
    qualification_tag: 'ITI (NCVT/SCVT) / Diploma (SCTE&VT)',
    official_portal_url: 'https://sctevtodisha.nic.in/',
    summary: 'Complete ITI & SCTE&VT Polytechnic Diploma eligibility guide covering OSSC CTSRE JE, SSC/RRB JE & ALP, NALCO/MCL/SAIL/OMC technician drives, NAPS/NATS stipends, and OJEE Lateral Entry.',
    tags: ['ITI', 'Polytechnic Diploma', 'SCTEVT', 'OSSC CTSRE', 'Junior Engineer', 'NAPS', 'NATS']
  },
  {
    id: 'ji-ee-graduate-any-stream',
    slug: 'bachelors-degree-any-stream-opsc-ossc-osssc-upsc-ssc-banking',
    folderHints: ['any-stream-graduate', 'graduates-pg-reservation', 'educational eligibility'],
    title: 'Bachelor’s Degree (Any Stream: BA, B.Sc., B.Com., BBA, BCA) — OPSC, OSSC, UPSC, SSC & Banking Matrix',
    title_or: 'ସ୍ନାତକ ଡିଗ୍ରୀ (BA, B.Sc., B.Com., BBA, BCA) — OPSC, OSSC, UPSC, SSC ଏବଂ ବ୍ୟାଙ୍କିଂ ଯୋଗ୍ୟତା ମ୍ୟାଟ୍ରିକ୍ସ',
    conducting_body: 'OPSC / OSSC / OSSSC / High Court / UPSC / SSC / IBPS / SBI / RBI',
    cadre_group: 'Group A, Group B & Group C Administrative, Revenue & Officer Cadres',
    pay_matrix: 'OPSC OAS / UPSC IAS: Level-10/12 (₹56,100–₹1,77,500); OPSC/HC ASO, OSSC CGL, OSSSC RI, SSC CGL: Level-6/9 (₹35,400–₹1,12,400); Bank PO: ₹78k+/mo.',
    age_limit_relaxation: 'Odisha State (OPSC/OSSC/OSSSC): 21–38 yrs (+5 SC/ST/SEBC/Women, +10 PwD); UPSC CSE: 21–32 yrs; SSC CGL: 18–30/32 yrs; IBPS PO: 20–30 yrs.',
    qualification_odia_rule: 'Bachelor’s degree from a UGC-recognised University (Utkal, Ravenshaw, Berhampur, Sambalpur, FM, Rama Devi, Gangadhar Meher, etc.). Pass in Odia at ME/HSC level mandatory for Odisha State exams; Odia LPT for Banking Clerk/RRB.',
    selection_stages: 'Prelims -> Mains -> Interview (UPSC/OPSC OCS) OR Prelims -> Mains -> Computer Skill Test (OSSC CGL, OSSSC RI, OPSC ASO, SSC CGL Tier-II).',
    pst_pet_skill_norms: 'Computer Practical / DEST Skill Test (MS Word, Excel, PowerPoint, Windows, Typing 35 wpm) mandatory for ASO, OSSC CGL, OSSSC RI, and SSC CGL.',
    documents_checklist: 'Original/Provisional Degree Certificate & All-Semester Marksheets, Odia Pass Proof, Caste/Resident/Income Certificates, Computer Proficiency Certificate (DCA/PGDCA where specified).',
    application_steps: '1. Complete OTR on opsc.gov.in, ossc.gov.in, upsconline.nic.in, and ssc.gov.in. 2. Keep final-year provisional degree ready before cut-off date (final-year students eligible in UPSC/SSC/IBPS as per cut-off).',
    academic_pathways: 'Higher Studies after Graduation: MBA/PGDM (CAT/XAT/OJEE — XIMB, IIM Sambalpur), 3-yr LL.B., B.Ed., MCA, or MA/M.Sc./M.Com. (CUET-PG / Odisha CPET).',
    premier_institutions: 'Utkal University, Ravenshaw University, Sambalpur University, Berhampur University, FM University, Gangadhar Meher University, Rama Devi Women’s University, XIMB, IIM Sambalpur.',
    entrance_licensing: 'OPSC OCS/ASO, OSSC CGLRE, OSSSC RI/ICDS, UPSC CSE/CDS/CAPF, SSC CGL, IBPS/SBI/RBI, CAT/XAT/CPET.',
    skills_certifications: 'MS Excel & Data Interpretation, Odia-English précis & essay writing, General Studies, Financial Awareness, and Computer Skill Test fluency.',
    qualification_tag: 'Bachelor’s Degree (Any Stream)',
    official_portal_url: 'https://www.opsc.gov.in/',
    summary: 'Complete Any-Stream Graduate eligibility handbook for BA/B.Sc./B.Com./BBA/BCA holders covering OPSC OCS/ASO, OSSC CGLRE, OSSSC RI, UPSC, SSC CGL, IBPS/SBI, and CPET/MBA.',
    tags: ['Graduate', 'OPSC OCS', 'OSSC CGL', 'OSSSC RI', 'SSC CGL', 'IBPS PO', 'CPET']
  },
  {
    id: 'ji-ee-professional-graduates',
    slug: 'professional-graduates-btech-mbbs-nursing-bpharm-llb-agri-matrix',
    folderHints: ['graduates-pg-reservation', 'educational eligibility'],
    title: 'Professional & Technical Graduates (B.Tech., MBBS/BDS/AYUSH, Nursing, B.Pharm, LL.B., B.Sc. Agri)',
    title_or: 'ବୃତ୍ତିଗତ ସ୍ନାତକ (B.Tech., MBBS/AYUSH, ନର୍ସିଂ, B.Pharm, LL.B., କୃଷି) — ସ୍ପେଶାଲିଷ୍ଟ କ୍ୟାଡର୍ ମ୍ୟାଟ୍ରିକ୍ସ',
    conducting_body: 'OPSC / OSSSC / High Court / PSUs / ISRO / DRDO / IBPS SO / NABARD',
    cadre_group: 'Specialist Group A & Group B Executive, Clinical, Judicial & Technical Cadres',
    pay_matrix: 'OPSC AEE/MO/OJS & PSU GET: ₹56,100–₹1,77,500 (Level-10/12); OSSSC Nursing/Pharmacist: Level-7/8; IBPS SO/AFO: ₹78k+/mo.',
    age_limit_relaxation: 'OPSC AEE/MO/VAS/AHO: 21–38 yrs (+5 SC/ST/SEBC/Women, +10 PwD); OJS Civil Judge: 23–35 yrs; PSU GET: 27–30/32 yrs.',
    qualification_odia_rule: 'Valid AICTE/NMC/DCI/NCISM/INC/PCI/BCI/ICAR recognised professional degree + active Statutory Council Registration (OCMR/ONMRC/OSPC/BCI) + Odia ME/HSC pass for Odisha State cadres.',
    selection_stages: 'AEE/PSU GET: GATE Score or Technical CBT + Interview; OPSC MO: 200-MCQ Exam; OJS: Prelims + Law Mains + Viva; IBPS SO/AFO: Prelims + Professional Knowledge Mains + Interview.',
    pst_pet_skill_norms: 'Mandatory active registration with State Medical/Nursing/Pharmacy/Bar Council or valid GATE/CLAT/ICAR scorecard before document verification.',
    documents_checklist: 'Professional Degree & All-Prof Marksheets, Internship Completion (MBBS/BDS/AYUSH/B.V.Sc), Council Registration Certificate, GATE Scorecard, Odia Pass Certificate, Caste/Resident.',
    application_steps: '1. Renew State Council Registration before expiry. 2. Apply on opsc.gov.in, osssc.gov.in, orihighcourt.nic.in, ibps.in, or PSU career portals.',
    academic_pathways: 'M.Tech (GATE), MD/MS (NEET-PG), M.Pharm (GPAT), M.Sc Nursing, LL.M. (CLAT-PG), M.Sc Agri (ICAR-PG), MBA (CAT/XAT).',
    premier_institutions: 'IIT Bhubaneswar, NIT Rourkela, AIIMS Bhubaneswar, SCB/MKCG/VIMSAR, OUAT, NLUO Cuttack, VSSUT Burla, OUTR Bhubaneswar.',
    entrance_licensing: 'GATE, NEET-PG, GPAT, AIBE (BCI), OCMR, ONMRC, OSPC, OPSC OJS/AEE/MO, IBPS SO/AFO.',
    skills_certifications: 'Domain-specific licensing, clinical/engineering software, statutory compliance, and technical project management.',
    qualification_tag: 'B.Tech / MBBS / Nursing / B.Pharm / LL.B. / Agri',
    official_portal_url: 'https://www.opsc.gov.in/',
    summary: 'Specialist eligibility matrix for B.Tech, MBBS/BDS/AYUSH, B.Sc Nursing, B.Pharm, LL.B., and B.Sc Agriculture/Forestry graduates across OPSC, OSSSC, OJS, PSUs, and IBPS SO.',
    tags: ['B.Tech', 'MBBS', 'B.Sc Nursing', 'B.Pharm', 'LLB', 'B.Sc Agriculture', 'GATE']
  },
  {
    id: 'ji-ee-teacher-education-tet',
    slug: 'teacher-education-deled-ct-bed-med-otet-osstet-ctet-matrix',
    folderHints: ['educational eligibility', 'graduates-pg-reservation'],
    title: 'Teacher Education (D.El.Ed./CT, B.Ed., M.Ed.) & TET Matrix (OTET Paper I & II, OSSTET, CTET)',
    title_or: 'ଶିକ୍ଷକ ଶିକ୍ଷା (D.El.Ed./CT, B.Ed., M.Ed.) ଏବଂ TET ମ୍ୟାଟ୍ରିକ୍ସ (OTET, OSSTET, CTET)',
    conducting_body: 'BSE Odisha (OTET/OSSTET) / CBSE (CTET) / OSEPA / OAVS / OSSC (LTR) / KVS-NVS',
    cadre_group: 'Primary (Class I–V), Upper Primary (VI–VIII), Secondary TGT (IX–X) & PGT (XI–XII)',
    pay_matrix: 'Junior Teacher Schematic: ₹16k–₹22k progressing to Level-7; LTR/OAVS TGT: ORSP Level-9 (₹35,400+); OAVS/OPSC PGT: Level-10 (₹44,900+); KVS/NVS: 7th CPC Level-6/7/8.',
    age_limit_relaxation: 'Odisha State (OSEPA/OAVS/LTR): 21–38 yrs (+5 SC/ST/SEBC/Women, +10 PwD); KVS/NVS: 30–40 yrs (+3 OBC, +5 SC/ST, +10 Women).',
    qualification_odia_rule: 'NCTE-recognised D.El.Ed./CT or B.Ed./B.P.Ed. + mandatory pass in OTET (Paper-I for Class I–V, Paper-II for VI–VIII), OSSTET (for Odisha High School TGT/Hindi/Sanskrit/PET), or CTET (for KVS/NVS/EMRS). Odia ME/HSC pass mandatory for Odisha State schools.',
    selection_stages: 'Step-1: Qualify OTET / OSSTET / CTET (60% UR = 90/150; 50% SC/ST/SEBC/PwD = 75/150); Step-2: Apply for OSEPA JTS / OSSC LTR / OAVS / KVS-NVS CBT Recruitment.',
    pst_pet_skill_norms: 'PET Teachers require B.P.Ed./C.P.Ed.; Hindi/Sanskrit Teachers require Shastri/Acharya/Ratna/Praveen or Degree with Hindi/Sanskrit + B.Ed./OSSTET.',
    documents_checklist: 'HSC, +2, Graduation/PG Marksheets, NCTE Approval Proof (if out-of-state B.Ed./D.El.Ed.), D.El.Ed./B.Ed. Certificate, Valid OTET/OSSTET/CTET Scorecard, Odia Pass Proof, Caste/Resident.',
    application_steps: '1. Complete D.El.Ed./B.Ed. via SAMS Odisha (scertodisha.nic.in / dhe.odisha.gov.in) or RIE Bhubaneswar. 2. Clear OTET/OSSTET at bseodisha.ac.in. 3. Apply for OSEPA/OSSC LTR/OAVS drives.',
    academic_pathways: '+2 (50%+) → 2-yr D.El.Ed. (CT) OR 4-yr Integrated B.A./B.Sc. B.Ed. (ITEP); Graduation/PG (50%+; 45% SC/ST/SEBC/PwD) → 2-yr B.Ed. → M.Ed. → UGC-NET Education.',
    premier_institutions: 'RIE (NCERT) Bhubaneswar, Radhanath IASE Cuttack, Nalini Devi Women’s College of Teacher Education Bhubaneswar, Dr. PM IASE Sambalpur, CTE Balasore/Berhampur, DIETs across 30 districts.',
    entrance_licensing: 'Odisha State B.Ed./D.El.Ed. Entrance (SAMS), RIE CEE, OTET (Paper I & II), OSSTET, CTET.',
    skills_certifications: 'NEP 2020 FLN pedagogy, inclusive classroom management, Odia-medium & bilingual lesson planning, NISHTHA/DIKSHA digital modules.',
    qualification_tag: 'CT/D.El.Ed. + OTET / B.Ed. + OSSTET/CTET',
    official_portal_url: 'https://www.bseodisha.ac.in/',
    summary: 'Complete Teacher Eligibility & TET matrix for Odisha covering D.El.Ed./CT, B.Ed., M.Ed., NCTE recognition, OTET Paper I & II, OSSTET, CTET qualifying marks, and OSEPA/OAVS/KVS rules.',
    tags: ['B.Ed', 'D.El.Ed', 'OTET', 'OSSTET', 'CTET', 'NCTE', 'OSEPA', 'OAVS']
  },
  {
    id: 'ji-ee-pg-net-gate-phd',
    slug: 'postgraduate-ugc-net-csir-net-gate-phd-eligibility-matrix',
    folderHints: ['graduates-pg-reservation', 'educational eligibility'],
    title: 'Post-Graduation (MA/M.Sc./M.Com./MBA/MCA), UGC/CSIR NET, GATE & Ph.D. Eligibility Matrix',
    title_or: 'ସ୍ନାତକୋତ୍ତର (PG), UGC/CSIR NET, GATE ଏବଂ Ph.D. — ଅଧ୍ୟାପକ, OES, JRF ଓ PSU ମ୍ୟାଟ୍ରିକ୍ସ',
    conducting_body: 'OPSC / SSB Odisha / NTA (UGC-NET / CSIR-NET) / IITs (GATE) / Universities',
    cadre_group: 'Group A University/College Faculty, Research Fellows (JRF/SRF) & PSU Executives',
    pay_matrix: 'UGC JRF/SRF: ₹37,000–₹42,000/mo + HRA; Asst. Professor: UGC Level-10 (₹57,700–₹1,82,400); PSU Executive (GATE): ₹14–₹18 LPA.',
    age_limit_relaxation: 'UGC/CSIR JRF: Max 30 yrs (+5 yrs SC/ST/OBC-NCL/PwD/Women); Assistant Professor (NET) & GATE: No upper age limit; OPSC Asst. Prof: 21–45 yrs.',
    qualification_odia_rule: 'Master’s degree with minimum 55% marks (50% for SC/ST/SEBC/PwD) from UGC-recognised University. Odia ME/HSC pass mandatory for OPSC Assistant Professor / SSB Odisha Lecturer / OES.',
    selection_stages: 'UGC-NET (3 categories: JRF+Asst Prof, Asst Prof+PhD, PhD only); GATE (valid for 3 years for M.Tech/PhD & PSU/OPSC AEE shortlisting); Ph.D. (NET/GATE + Research Interview).',
    pst_pet_skill_norms: 'UGC Ph.D. 2022 Regulations require coursework + original thesis + viva-voce; API academic score determines shortlisting in OPSC/University faculty drives.',
    documents_checklist: 'PG Degree & Marksheets (55%/50% proof), UGC-NET/CSIR-NET/GATE Scorecard, Ph.D. Notification & UGC-2009/2016 Compliance Certificate (if exempt from NET), Caste/Resident/Odia Pass.',
    application_steps: '1. Apply for CPET Odisha / CUET-PG / GATE for PG admissions. 2. Appear for UGC-NET/CSIR-NET (June/Dec) via ugcnet.nta.ac.in. 3. Track opsc.gov.in & ssbodisha.ac.in for faculty drives.',
    academic_pathways: 'Graduation → 2-yr PG (MA/M.Sc./M.Com./MBA/MCA/M.Tech) OR 4-yr Hons with Research → Direct Ph.D. → Postdoctoral Fellowship (PDF).',
    premier_institutions: 'Utkal University, Ravenshaw University, NISER Jatni, IIT Bhubaneswar, NIT Rourkela, IISER Berhampur, CSIR-IMMT, DBT-ILS, XIMB, IIM Sambalpur.',
    entrance_licensing: 'CPET Odisha, CUET-PG, GATE, CAT/XAT, UGC-NET, CSIR-NET, OPSC Assistant Professor, SSB Odisha Lecturer.',
    skills_certifications: 'Research design, SPSS/R/Python data analysis, LaTeX, Scopus/UGC-CARE paper writing, grant proposal drafting.',
    qualification_tag: 'PG (55%/50%) + NET / GATE / Ph.D.',
    official_portal_url: 'https://ugcnet.nta.ac.in/',
    summary: 'Postgraduate, UGC/CSIR-NET, GATE & Ph.D. eligibility matrix covering 55%/50% marks rules, JRF age limits, 3-tier NET categories, OPSC Assistant Professor, SSB Lecturer, and PSU GATE entry.',
    tags: ['Postgraduate', 'UGC NET', 'CSIR NET', 'GATE', 'PhD', 'Assistant Professor', 'SSB Odisha']
  },
  {
    id: 'ji-ee-odia-language-equivalence',
    slug: 'odisha-mandatory-odia-language-rule-and-degree-equivalence',
    folderHints: ['other eligibility conditions', 'eligibility comparison tools'],
    title: 'Odisha Mandatory Odia Language Rule & Degree Equivalence Guide (ME/HSC & BSE Single-Subject)',
    title_or: 'ଓଡ଼ିଶାର ବାଧ୍ୟତାମୂଳକ ଓଡ଼ିଆ ଭାଷା ନିୟମ ଏବଂ ଡିଗ୍ରୀ ସମତୁଲ୍ୟତା ମାର୍ଗଦର୍ଶିକା',
    conducting_body: 'GA & PG Dept, Govt of Odisha / BSE Odisha / CHSE Odisha / OSHEC',
    cadre_group: 'All Odisha State Govt Recruitments (OPSC, OSSC, OSSSC, OPRB, OSEPA, High Court)',
    pay_matrix: 'Applies across all ORSP 2017 Group A, B, C & D posts.',
    age_limit_relaxation: 'No age bar for appearing in BSE Odisha Single-Subject Odia Examination (Class VII / ME Standard or Class X / HSC Standard).',
    qualification_odia_rule: 'Candidate must be able to read, write, and speak Odia AND satisfy ONE of: (a) Passed HSC/10th with Odia as medium of exam in non-language subjects; OR (b) Passed Odia as a language subject in Final Exam of Class VII (ME Standard) or above from BSE/Govt-recognised school; OR (c) Passed Test in Odia in ME School Standard conducted by School & Mass Education Dept / BSE Odisha Single-Subject Odia Exam.',
    selection_stages: 'CBSE/ICSE students from Odisha who did NOT have Odia in Class 10 can check Class VII/VIII school marksheet OR pass the BSE Odisha Single-Subject Odia Test before the recruitment cut-off date.',
    pst_pet_skill_norms: 'Degree Equivalence: CHSE Odisha +2 Equivalence applies to CBSE/ICSE/NIOS/Diploma (as per notification); Distance/Open University degrees (IGNOU, OSOU Sambalpur) are valid if UGC-DEB approved.',
    documents_checklist: 'BSE Odisha / CBSE / ICSE Class 10 or Class 7/8 Marksheet showing Odia subject OR BSE Odisha Single-Subject Odia Pass Certificate, UGC-DEB / AIU Equivalence Certificate (for foreign/open degrees).',
    application_steps: '1. Check your Class 7, 8, or 10 marksheet for Odia as MIL/2nd/3rd language. 2. If missing, apply for BSE Odisha Single-Subject Odia Examination at bseodisha.ac.in. 3. Preserve original pass certificate for OPSC/OSSC/OSSSC DV.',
    academic_pathways: 'CBSE/ICSE/Kendriya Vidyalaya/JNV students domiciled in Odisha -> verify Class VII/VIII Odia or clear BSE Single-Subject Odia exam -> 100% eligible for all Odisha State Govt jobs.',
    premier_institutions: 'Board of Secondary Education (BSE) Odisha Cuttack, CHSE Odisha Bhubaneswar, Odisha State Open University (OSOU) Sambalpur, Odisha State Higher Education Council (OSHEC).',
    entrance_licensing: 'BSE Odisha Single-Subject Odia Examination (ME Standard / HSC Standard), AIU Equivalence (for overseas degrees).',
    skills_certifications: 'Odia reading, writing, official noting/drafting, and spoken fluency.',
    qualification_tag: 'Odia ME (Class VII) / HSC (Class X) Standard',
    official_portal_url: 'https://www.bseodisha.ac.in/',
    summary: 'Authoritative guide to Odisha’s mandatory Odia language eligibility rule (ME Standard vs HSC Odia, CBSE/ICSE CBSE rules, BSE Odisha Single-Subject Odia Exam) and UGC-DEB/OSOU degree equivalence.',
    tags: ['Odia Language Rule', 'ME Standard', 'BSE Odisha', 'Single Subject Odia', 'Equivalence']
  },
  {
    id: 'ji-ee-age-matrix',
    slug: 'odisha-govt-age-limit-relaxation-matrix',
    folderHints: ['odisha-age-limit-relaxation', 'reservation and category rules', 'age eligibility'],
    title: 'Odisha Reservation, Age Relaxation & Certificate Validity Rules (SEBC, SC, ST, Women, PwD, ESM)',
    title_or: 'ଓଡ଼ିଶା ସଂରକ୍ଷଣ, ବୟସ କୋହଳ ଏବଂ ପ୍ରମାଣପତ୍ର ବୈଧତା ନିୟମାବଳୀ (SEBC, SC, ST, ମହିଳା, PwD)',
    conducting_body: 'GA & PG Dept / ST & SC Dev Dept, Govt of Odisha & DoPT Govt of India',
    cadre_group: 'State Govt (OPSC/OSSC/OSSSC/OPRB) & Central Govt (UPSC/SSC/RRB/IBPS)',
    pay_matrix: 'Applies across all State & Central Government recruitments.',
    age_limit_relaxation: 'Odisha State Standard (Group B/C): 21–38 yrs (UR). Relaxations: +5 yrs for SC, ST, SEBC, Women & Ex-Servicemen (service period + 3 yrs); +10 yrs for PwD (up to +15 yrs for SC/ST/SEBC PwD). Central Govt: +3 yrs OBC-NCL, +5 yrs SC/ST, +10 yrs PwBD.',
    qualification_odia_rule: 'State Reservation Quotas in Odisha: ST 22.5%, SC 16.25%, SEBC 11.25% (Total 50%); Horizontal: Women 33%, PwD 4% (Benchmark >=40% disability), Ex-Servicemen 3%, Sports 1%. Note: State SEBC != Central OBC-NCL automatically unless caste is in Central OBC list + Non-Creamy Layer.',
    selection_stages: 'e-District Odisha Certificates: (1) Caste Certificate (SC/ST permanent; SEBC non-creamy layer/income threshold must be current/within 1–3 yrs as per advt); (2) Resident/Nativity Certificate (Tahasil); (3) UDID PwD Card (Swavlamban); (4) EWS (Central exams only — valid FY).',
    pst_pet_skill_norms: 'PwD Scribe & Compensatory Time (20 mins/hour) provided for >=40% benchmark disability with Chief District Medical Officer (CDMO) / UDID certificate.',
    documents_checklist: 'e-District Caste Certificate (SC/ST/SEBC), Central Format OBC-NCL / EWS Certificate (for UPSC/SSC/RRB/IBPS), Tahasil Resident Certificate, UDID Card, Discharge Book (ESM), Sports Dept ID Card.',
    application_steps: '1. Apply for Caste, Resident & Income certificates on edistrict.odisha.gov.in or Mo Seba Kendra before notification deadline. 2. For Central exams, obtain Central OBC-NCL / EWS from Tahasildar in prescribed DoPT format.',
    academic_pathways: 'Reservation & fee waivers also apply in OJEE, SAMS (+2/+3/B.Ed.), State Scholarship Portal, and National Scholarship Portal.',
    premier_institutions: 'e-District Odisha (Revenue & Disaster Management Dept), Directorate of Sports & Youth Services Odisha, SSEPD Dept (UDID).',
    entrance_licensing: 'e-District Odisha Tahasil Verification, UDID Disability Portal, Rajya Sainik Board Odisha.',
    skills_certifications: 'Proactive certificate renewal (especially SEBC/OBC-NCL & EWS every financial year).',
    qualification_tag: 'SEBC / SC / ST / Women / PwD / ESM / EWS',
    official_portal_url: 'https://edistrict.odisha.gov.in/',
    summary: 'Complete Odisha Reservation, Age Relaxation & e-District Certificate Validity guide covering 21–38 yrs base limit, +5/+10/+15 yr relaxations, SEBC vs Central OBC-NCL, UDID PwD, and Women/ESM quotas.',
    tags: ['Reservation', 'Age Relaxation', 'SEBC', 'SC/ST', 'UDID', 'e-District Odisha']
  },
  {
    id: 'ji-ee-pst-pet-medical',
    slug: 'physical-standard-pst-pet-and-medical-fitness-norms-odisha',
    folderHints: ['physical and medical standards', 'eligibility comparison tools'],
    title: 'Physical Standard (PST), Physical Efficiency (PET) & Medical Fitness Standards (Police, Forest, Defence, RRB)',
    title_or: 'ଶାରୀରିକ ମାପଦଣ୍ଡ (PST), ଦକ୍ଷତା (PET) ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ପରୀକ୍ଷା ମାନଦଣ୍ଡ (ପୋଲିସ୍, ବନ, ପ୍ରତିରକ୍ଷା, ରେଳବାଇ)',
    conducting_body: 'OPRB / OSSSC (Forest & Excise) / SSC (GD & CPO) / RRB / Indian Armed Forces',
    cadre_group: 'Uniformed, Field, Railway Safety & Defence Cadres',
    pay_matrix: 'Covers Odisha Police SI/Constable, Forest Guard/Forester, Fire Service, SSC GD/CPO, RRB ALP/Group D, and Agniveer.',
    age_limit_relaxation: 'Uniformed posts typically have lower upper age limits (17.5–21 yrs Agniveer; 18–23/27 yrs Constable/GD; 21–25/28 yrs Police SI; 18–38 yrs OSSSC Forest Guard).',
    qualification_odia_rule: 'Height & Chest Norms: Odisha Police SI/Constable/Forest Guard: Men 168 cm (163/158 cm ST/SC), Chest 79–84 cm; Women 155 cm (150 cm ST/SC). SSC GD/CPO: Men 170 cm (162.5 cm ST), Women 157 cm (150 cm ST). Army Agniveer (Odisha): 169 cm (162 cm ST/Clerk).',
    selection_stages: 'PET Running & Endurance: Odisha Police SI/Constable: 1.6 km in 7 min (Men) / 9 min (Women) + Long Jump; Forest Guard/Forester: Walking 25 km in 4 hrs (Men) / 16 km (Women); SSC GD: 5 km in 24 min (Men) / 1.6 km in 8.5 min (Women); RRB Group D: 35 kg weight carry 100 m + 1 km run.',
    pst_pet_skill_norms: 'Medical Standards: 6/6 distant vision (RRB ALP A-1 requires 6/6 without glasses; no colour blindness/night blindness), no knock-knees, flat-foot, varicose veins, or severe DNS/hearing loss.',
    documents_checklist: 'Admit Card for PST/PET, Photo ID, Physical Fitness Indemnity Undertaking, Medical Specialist Clearance (if temporary unfitness review), Caste/ST Height Relaxation Certificate.',
    application_steps: '1. Verify height/chest/vision norms BEFORE applying to A-1/uniformed posts. 2. Practice timed 1.6 km / 5 km runs and 25 km brisk walking on measured tracks.',
    academic_pathways: 'NCC A/B/C Certificates & State/National Sports participation provide bonus marks or quota in Odisha Police, Army Agniveer, and SSC GD/CPO.',
    premier_institutions: 'Odisha Police Training Academy (Biju Patnaik State Police Academy Bhubaneswar), Forest Rangers College Angul, INS Chilka.',
    entrance_licensing: 'OPRB PST/PET, OSSSC Forest Walking Test, SSC GD/CPO PET, RRB Medical (A-1/A-2/B-1), Army Rally & Medical Board.',
    skills_certifications: 'Cardiovascular endurance, swimming (Fire Service/Navy), driving licence (LMV/HMV for Police Driver), and vision hygiene.',
    qualification_tag: 'PST / PET / Vision A-1 & Medical Norms',
    official_portal_url: 'https://odishapolice.gov.in/',
    summary: 'Complete PST, PET & Medical Fitness comparison across OPRB Odisha Police, OSSSC Forest Guard/Forester, Fire Service, SSC GD/CPO, RRB ALP/Group D, and Army Agniveer rallies.',
    tags: ['PST', 'PET', 'Physical Standard', 'Odisha Police', 'Forest Guard', 'Agniveer', 'RRB Medical']
  }
];

export async function enrichEligibilityExplorerCategory03(db, now) {
  if (!db) return { foldersUpdated: 0, itemsUpserted: 0 };
  const ts = now || new Date().toISOString();

  // 1. Fetch all folders in Category #03 (eligibility-explorer / eligibility-qualification)
  const foldersRes = await db
    .prepare("SELECT * FROM jobs_directory_folders WHERE domain_slug IN ('eligibility-explorer', 'eligibility-qualification') ORDER BY depth ASC, sort_order ASC, title ASC")
    .all();
  const folders = foldersRes.results || [];
  const folderById = new Map(folders.map(f => [f.id, f]));

  const folderStmts = [];
  for (const f of folders) {
    if (isCustomAdminEdit(f)) continue;

    const key = String(f.title || '').trim().toLowerCase();
    const parent = f.parent_id ? folderById.get(f.parent_id) : null;
    const spec = CAT03_FOLDER_ENRICHMENTS[key] || buildSmartEligibilityFolderEnrichment(f, parent ? parent.title : '');

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
    const nextSeoTitle = needsSeoTitle ? `${f.title} (${nextBadge}) — CSOdisha Eligibility` : f.seo_title;
    const nextSeoDesc = needsSeoDesc ? nextDescEn.slice(0, 300) : f.seo_description;
    const nextVerifiedAt = f.verified_at || ts;

    folderStmts.push(
      db.prepare(`UPDATE jobs_directory_folders
        SET description = ?, description_en = ?, description_or = ?, title_or = ?,
            hero_badge = ?, featured_badge = ?, seo_title = ?, seo_description = ?,
            verified_at = ?, updated_by = 'cat03-enrich', updated_at = ?
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

  // 2. Resolve best target folder for each of the 10 eligibility handbooks
  function pickFolderId(hints) {
    for (const h of hints) {
      const hl = h.toLowerCase();
      const hit = folders.find(f =>
        String(f.slug || '').toLowerCase() === hl ||
        String(f.slug || '').toLowerCase().includes(hl) ||
        String(f.title || '').toLowerCase().includes(hl)
      );
      if (hit) return hit.id;
    }
    return folders[0]?.id || 'jf-ee-school-pass';
  }

  const existingItemsRes = await db
    .prepare("SELECT id, slug, updated_by FROM jobs_directory_items WHERE domain_slug IN ('eligibility-explorer', 'eligibility-qualification')")
    .all();
  const existingById = new Map((existingItemsRes.results || []).map(r => [r.id, r]));
  const existingBySlug = new Map((existingItemsRes.results || []).map(r => [r.slug, r]));

  const itemStmts = [];
  for (const hb of CAT03_HANDBOOKS) {
    const folderId = pickFolderId(hb.folderHints);
    const existing = existingById.get(hb.id) || existingBySlug.get(hb.slug);
    if (existing && existing.updated_by && !SYSTEM_AUTHORS.has(String(existing.updated_by).toLowerCase())) {
      continue;
    }

    const bodyHtml = [
      `<h2>${hb.title}</h2>`,
      `<p><strong>ଓଡ଼ିଆ ସାରାଂଶ:</strong> ${hb.title_or} — ${hb.conducting_body}</p>`,
      `<ul>`,
      `<li><strong>Conducting Bodies &amp; Scope:</strong> ${hb.conducting_body} (${hb.cadre_group})</li>`,
      `<li><strong>Pay Matrix Range:</strong> ${hb.pay_matrix}</li>`,
      `<li><strong>Age Limit &amp; Odisha Category Relaxations:</strong> ${hb.age_limit_relaxation}</li>`,
      `<li><strong>Qualification, Equivalence &amp; Odia Language Rule:</strong> ${hb.qualification_odia_rule}</li>`,
      `<li><strong>Selection Stages &amp; Exam Pattern:</strong> ${hb.selection_stages}</li>`,
      `<li><strong>PST / PET / Skill / Medical Norms:</strong> ${hb.pst_pet_skill_norms}</li>`,
      `<li><strong>Required Certificates Checklist:</strong> ${hb.documents_checklist}</li>`,
      `<li><strong>Higher Education &amp; Course Pathways:</strong> ${hb.academic_pathways}</li>`,
      `<li><strong>Step-by-Step Verification &amp; Application:</strong> ${hb.application_steps}</li>`,
      `</ul>`
    ].join('');

    if (existing) {
      itemStmts.push(
        db.prepare(`UPDATE jobs_directory_items
          SET folder_id = ?, title = ?, title_or = ?, item_type = 'eligibility-matrix',
              recruiting_body = ?, conducting_body = ?, cadre_group = ?, pay_matrix = ?,
              age_limit_relaxation = ?, qualification_odia_rule = ?, selection_stages = ?,
              pst_pet_skill_norms = ?, documents_checklist = ?, application_steps = ?,
              academic_pathways = ?, premier_institutions = ?, entrance_licensing = ?,
              skills_certifications = ?, qualification_tag = ?,
              official_apply_url = ?, official_portal_url = ?,
              tags_json = ?, language = 'EN+OR', status = 'published', featured = 1,
              summary = ?, body_html = ?, seo_title = ?, seo_description = ?,
              verified_by = 'cat03-enrich@csodisha.com', verified_at = ?,
              updated_by = 'cat03-enrich', updated_at = ?
          WHERE id = ?`)
          .bind(
            folderId, hb.title, hb.title_or,
            hb.conducting_body, hb.conducting_body, hb.cadre_group, hb.pay_matrix,
            hb.age_limit_relaxation, hb.qualification_odia_rule, hb.selection_stages,
            hb.pst_pet_skill_norms, hb.documents_checklist, hb.application_steps,
            hb.academic_pathways, hb.premier_institutions, hb.entrance_licensing,
            hb.skills_certifications, hb.qualification_tag,
            hb.official_portal_url, hb.official_portal_url,
            JSON.stringify(hb.tags), hb.summary, bodyHtml,
            `${hb.title} | CSOdisha Eligibility`.slice(0, 160), hb.summary.slice(0, 300),
            ts, ts, existing.id
          )
      );
    } else {
      itemStmts.push(
        db.prepare(`INSERT OR IGNORE INTO jobs_directory_items
          (id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body, conducting_body,
           cadre_group, pay_matrix, age_limit_relaxation, qualification_odia_rule, selection_stages,
           pst_pet_skill_norms, documents_checklist, application_steps,
           academic_pathways, premier_institutions, entrance_licensing, skills_certifications,
           qualification_tag, official_apply_url, official_portal_url,
           cover_image_url, cover_image_alt, attachments_json, links_json, tags_json,
           language, status, featured, summary, body_html, seo_title, seo_description,
           verified_by, verified_at, state_location, created_by, updated_by, created_at, updated_at)
          VALUES (?, 'eligibility-explorer', ?, ?, ?, ?, 'eligibility-matrix', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, 'EN+OR', 'published', 1, ?, ?, ?, ?, 'cat03-enrich@csodisha.com', ?, 'Odisha', 'cat03-enrich', 'cat03-enrich', ?, ?)`)
          .bind(
            hb.id, folderId, hb.title, hb.title_or, hb.slug,
            hb.conducting_body, hb.conducting_body, hb.cadre_group, hb.pay_matrix,
            hb.age_limit_relaxation, hb.qualification_odia_rule, hb.selection_stages,
            hb.pst_pet_skill_norms, hb.documents_checklist, hb.application_steps,
            hb.academic_pathways, hb.premier_institutions, hb.entrance_licensing,
            hb.skills_certifications, hb.qualification_tag,
            hb.official_portal_url, hb.official_portal_url,
            JSON.stringify(hb.tags), hb.summary, bodyHtml,
            `${hb.title} | CSOdisha Eligibility`.slice(0, 160), hb.summary.slice(0, 300),
            ts, ts, ts
          )
      );
    }
  }

  for (let i = 0; i < itemStmts.length; i += 30) {
    await db.batch(itemStmts.slice(i, i + 30));
  }

  return { foldersUpdated: folderStmts.length, itemsUpserted: itemStmts.length };
}
