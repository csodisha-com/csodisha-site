// Category #05 (v72): Exhaustive Minute Bilingual Enrichment of Scholarships & Financial Support (8 Subcategories + 12 Handbooks)
// Idempotent D1 enrichment routine invoked by ensureJobsDirectoryStudioSchema(db).

const SYSTEM_AUTHORS = new Set(['seed', 'legacy-bridge', 'system', 'cat01-enrich', 'cat02-enrich', 'cat03-enrich', 'cat04-enrich', 'cat05-enrich', '']);

function isShort160(val) {
  return String(val || '').trim().length < 160;
}

function isCustomAdminEdit(row) {
  const updater = String(row?.updated_by || '').trim().toLowerCase();
  if (!updater || SYSTEM_AUTHORS.has(updater)) return false;
  return !isShort160(row?.description_en || row?.description) && !isShort160(row?.description_or);
}

// Tailored >=160-char bilingual metadata for all Category #05 folders (8 directory.json folders + 11 seeded folders)
const CAT05_FOLDER_ENRICHMENTS = {
  'scholarships, fellowships and education funding': {
    title_or: 'ଛାତ୍ରବୃତ୍ତି, ଫେଲୋସିପ୍ ଏବଂ ଶିକ୍ଷା ସହାୟତା',
    badge: 'SCHOLARSHIPS',
    en: 'Comprehensive Odisha and National student funding directory covering Odisha State Scholarship Portal schemes, NSP Central Sector programmes, UGC/CSIR JRF, DST-INSPIRE, AICTE Pragati/Saksham, school talent scholarships, and collateral-free education loans.',
    or: 'ଛାତ୍ରବୃତ୍ତି ଓ ଶିକ୍ଷା ସହାୟତା ଡାଇରେକ୍ଟୋରୀ: ଓଡ଼ିଶା ରାଜ୍ୟ ସ୍କଲାରଶିପ୍ ପୋର୍ଟାଲ୍, NSP କେନ୍ଦ୍ରୀୟ ଯୋଜନା, UGC/CSIR JRF, DST-INSPIRE, AICTE ପ୍ରଗତି/ସକ୍ଷମ ଏବଂ ଶିକ୍ଷା ଋଣର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'odisha scholarships and support': {
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ଏବଂ ସହାୟତା',
    badge: 'ODISHA PORTAL',
    en: 'Authoritative guide to Odisha state-funded scholarships on scholarship.odisha.gov.in including Post-Matric (SC/ST/OBC/SEBC/EBC), Pre-Matric, e-Medhabruti UG/PG/Technical Merit, Gopabandhu Sikhya Sahayata Yojana, Nirman Shramik Kalyan Yojana, and KSSY 1% interest subvention.',
    or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି: scholarship.odisha.gov.in ରେ ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍, ଇ-ମେଧାବୃତ୍ତି, ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା, ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ଯୋଜନା ଏବଂ କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ ଯୋଜନାର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।'
  },
  'central government scholarships': {
    title_or: 'କେନ୍ଦ୍ର ସରକାରୀ ଛାତ୍ରବୃତ୍ତି ଏବଂ ଫେଲୋସିପ୍',
    badge: 'CENTRAL / NSP',
    en: 'Complete blueprint for National Scholarship Portal (scholarships.gov.in) schemes, OTR Face-Authentication, PM-USP Central Sector Scholarship (CHSE Odisha Top 20th Percentile), AICTE Pragati & Saksham, DST-INSPIRE SHE, and UGC-NET / CSIR-NET JRF/SRF fellowships.',
    or: 'କେନ୍ଦ୍ର ସରକାରୀ ଛାତ୍ରବୃତ୍ତି: NSP ପୋର୍ଟାଲ୍, OTR ଫେସ୍-ଅଥେଣ୍ଟିକେସନ୍, PM-USP ସେଣ୍ଟ୍ରାଲ୍ ସେକ୍ଟର, AICTE ପ୍ରଗତି ଓ ସକ୍ଷମ, DST-INSPIRE ଏବଂ UGC/CSIR NET JRF/SRF ଫେଲୋସିପ୍ ସୂଚନା।'
  },
  'scholarships by education level': {
    title_or: 'ଶିକ୍ଷା ସ୍ତର ଅନୁଯାୟୀ ଛାତ୍ରବୃତ୍ତି',
    badge: 'BY LEVEL',
    en: 'Stage-wise scholarship finder for Odisha students spanning Class 6–10 (NMMS, PMST, NRTS, Pre-Matric), +2/CHSE (Junior Merit, Post-Matric), Undergraduate/Diploma/ITI (e-Medhabruti, PM-USP, AICTE Pragati/Saksham, INSPIRE), PG/Technical, and PhD research fellowships.',
    or: 'ଶିକ୍ଷା ସ୍ତର ଅନୁଯାୟୀ ଛାତ୍ରବୃତ୍ତି: ସ୍କୁଲ୍ (NMMS, PMST, NRTS, ପ୍ରି-ମ୍ୟାଟ୍ରିକ୍), +୨, ସ୍ନାତକ/ଡିପ୍ଲୋମା/ITI (ଇ-ମେଧାବୃତ୍ତି, PM-USP, ପ୍ରଗତି/ସକ୍ଷମ) ଏବଂ PG/PhD ଗବେଷଣା ବୃତ୍ତିର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚୀ।'
  },
  'scholarships by eligibility group': {
    title_or: 'ଯୋଗ୍ୟତା ବର୍ଗ ଅନୁଯାୟୀ ଛାତ୍ରବୃତ୍ତି',
    badge: 'ELIGIBILITY GROUP',
    en: 'Category-specific financial aid matrix covering SC, ST, OBC/SEBC, EBC, Minority, General/EWS merit-cum-means, Divyangjan (PwD ≥40% UDID), girl students (AICTE Pragati, Single Girl Child), construction workers’ wards (OB&OCWB), orphans, and first-generation learners.',
    or: 'ଯୋଗ୍ୟତା ବର୍ଗ ଅନୁଯାୟୀ ଛାତ୍ରବୃତ୍ତି: SC, ST, OBC/SEBC, EBC, ସଂଖ୍ୟାଲଘୁ, ସାଧାରଣ/EWS, ଦିବ୍ୟାଙ୍ଗ (PwD), ଛାତ୍ରୀ (ପ୍ରଗତି), ନିର୍ମାଣ ଶ୍ରମିକ ପରିବାର ଏବଂ ଅନାଥ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ସ୍ୱତନ୍ତ୍ର ଆର୍ଥିକ ସହାୟତା।'
  },
  'international scholarships and financial aid': {
    title_or: 'ଆନ୍ତର୍ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ଏବଂ ବିଦେଶ ଶିକ୍ଷା ସହାୟତା',
    badge: 'GLOBAL AID',
    en: 'Fully funded and partially funded overseas Master’s, PhD, and postdoctoral funding guide for Odisha graduates covering National Overseas Scholarship (NOS), Chevening, Commonwealth, Fulbright-Nehru, DAAD, Erasmus Mundus, MEXT, and international conference travel grants.',
    or: 'ଆନ୍ତର୍ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି: ବିଦେଶରେ ସ୍ନାତକୋତ୍ତର, PhD ଓ ପୋଷ୍ଟ-ଡକ୍ଟୋରାଲ୍ ଗବେଷଣା ପାଇଁ ନ୍ୟାସନାଲ୍ ଓଭରସିଜ୍ ସ୍କଲାରଶିପ୍ (NOS), ଚେଭେନିଂ, କମନୱେଲ୍ଥ, ଫୁଲବ୍ରାଇଟ୍, DAAD, ଇରାସମସ୍ ଏବଂ MEXT ବୃତ୍ତି ସୂଚନା।'
  },
  'other financial support': {
    title_or: 'ଅନ୍ୟାନ୍ୟ ଆର୍ଥିକ ସହାୟତା ଏବଂ ଶିକ୍ଷା ଋଣ',
    badge: 'LOANS & WAIVERS',
    en: 'Non-scholarship education financing covering OJEE/SAMS Tuition Fee Waiver (TFW), hostel & mess subsidies, PM-Vidyalaxmi collateral-free loans, Odisha Kalinga Sikhya Sathi Yojana (KSSY 1% interest subvention), NAPS/NATS stipends, and emergency academic grants.',
    or: 'ଅନ୍ୟାନ୍ୟ ଆର୍ଥିକ ସହାୟତା: TFW ଫି ଛାଡ଼, ହଷ୍ଟେଲ୍ ଓ ମେସ୍ ସବସିଡି, PM-ବିଦ୍ୟାଲକ୍ଷ୍ମୀ ଯୋଜନା, ଓଡ଼ିଶା କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ (KSSY ୧% ସୁଧ ରିହାତି), NAPS/NATS ଷ୍ଟାଇପେଣ୍ଡ ଏବଂ ଶିକ୍ଷା ଋଣ ସୂଚନା।'
  },
  'scholarship application support': {
    title_or: 'ଛାତ୍ରବୃତ୍ତି ଆବେଦନ ଏବଂ DBT ସହାୟତା',
    badge: 'APPLICATION HELP',
    en: 'Step-by-step operational handbook on Aadhaar NPCI bank mapper seeding, Tehsildar Income/Resident/Caste certificate validity, Institute Nodal Officer (INO) verification, PFMS payment tracking, renewal attendance/marks rules, and stacking vs non-duplication norms.',
    or: 'ଛାତ୍ରବୃତ୍ତି ଆବେଦନ ସହାୟତା: ଆଧାର NPCI ବ୍ୟାଙ୍କ ସିଡିଂ, ଆୟ/ଜାତି/ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର, କଲେଜ୍ ନୋଡାଲ୍ ଅଫିସର ଭେରିଫିକେସନ୍, PFMS ପେମେଣ୍ଟ ଟ୍ରାକିଂ, ନବୀକରଣ ନିୟମ ଏବଂ ଅଭିଯୋଗ ସମାଧାନ ମାର୍ଗଦର୍ଶିକା।'
  },
  'odisha state scholarships': {
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି',
    badge: 'STATE PORTAL',
    en: 'Unified State Scholarship Portal (scholarship.odisha.gov.in) hub covering ST & SC Development, Higher Education (e-Medhabruti), School & Mass Education, Skill Development & Technical Education, and Labour & ESI Department student welfare schemes.',
    or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି: scholarship.odisha.gov.in ଅଧୀନରେ ST/SC, ଉଚ୍ଚଶିକ୍ଷା (ଇ-ମେଧାବୃତ୍ତି), ବିଦ୍ୟାଳୟ ଓ ଗଣଶିକ୍ଷା, ବୈଷୟିକ ଶିକ୍ଷା ଏବଂ ଶ୍ରମ ବିଭାଗର ସମସ୍ତ ଛାତ୍ରବୃତ୍ତି ଯୋଜନାର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'national & central scholarships': {
    title_or: 'ଜାତୀୟ ଏବଂ କେନ୍ଦ୍ରୀୟ ଛାତ୍ରବୃତ୍ତି',
    badge: 'CENTRAL & NSP',
    en: 'Central Ministries, UGC, CSIR, DST, and AICTE student funding schemes hosted on scholarships.gov.in and dedicated fellowship portals, including PM-USP CSSS, AICTE Pragati/Saksham, DST-INSPIRE SHE, and UGC/CSIR NET JRF/SRF.',
    or: 'ଜାତୀୟ ଓ କେନ୍ଦ୍ରୀୟ ଛାତ୍ରବୃତ୍ତି: scholarships.gov.in (NSP) ଏବଂ UGC, CSIR, DST, AICTE ର PM-USP ସେଣ୍ଟ୍ରାଲ୍ ସେକ୍ଟର, ପ୍ରଗତି/ସକ୍ଷମ, DST-INSPIRE ଏବଂ NET JRF/SRF ଫେଲୋସିପ୍ ଯୋଜନାର ବିସ୍ତୃତ ବିବରଣୀ।'
  },
  'education loans & skill stipends': {
    title_or: 'ଶିକ୍ଷା ଋଣ ଏବଂ ଦକ୍ଷତା ଷ୍ଟାଇପେଣ୍ଡ',
    badge: 'LOANS & STIPENDS',
    en: 'Dedicated financing and earn-while-you-learn support for Odisha youth via PM-Vidyalaxmi Portal, Odisha Kalinga Sikhya Sathi Yojana (KSSY), NAPS industrial apprenticeship DBT stipends, and NATS graduate/diploma engineering stipends.',
    or: 'ଶିକ୍ଷା ଋଣ ଓ ଦକ୍ଷତା ଷ୍ଟାଇପେଣ୍ଡ: PM-ବିଦ୍ୟାଲକ୍ଷ୍ମୀ ପୋର୍ଟାଲ୍, ଓଡ଼ିଶା କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ ଯୋଜନା (KSSY), NAPS ଆପ୍ରେଣ୍ଟିସଶିପ୍ DBT ଷ୍ଟାଇପେଣ୍ଡ ଏବଂ NATS ଇଞ୍ଜିନିୟରିଂ ତାଲିମ ସହାୟତା ସୂଚନା।'
  },
  'state scholarship portal (post-matric & pre-matric)': {
    title_or: 'ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ (ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଓ ପ୍ରି-ମ୍ୟାଟ୍ରିକ୍)',
    badge: 'POST & PRE MATRIC',
    en: 'Complete Odisha State Scholarship Portal workflow for Pre-Matric (Class 9–10) and Post-Matric (+2 to PhD/Technical) SC, ST, OBC/SEBC, and EBC students with Aadhaar-seeded DBT disbursement and institute verification steps.',
    or: 'ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍: SC, ST, OBC/SEBC ଏବଂ EBC ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ପ୍ରି-ମ୍ୟାଟ୍ରିକ୍ (୯ମ-୧୦ମ) ଓ ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ (+୨ ରୁ PhD) ଆବେଦନ, ଆଧାର DBT ସିଡିଂ ଏବଂ କଲେଜ୍ ଭେରିଫିକେସନ୍ ପ୍ରକ୍ରିୟା।'
  },
  'kalia, gopabandhu & nirman shramik student aid': {
    title_or: 'କାଳିଆ, ଗୋପବନ୍ଧୁ ଏବଂ ନିର୍ମାଣ ଶ୍ରମିକ ଛାତ୍ର ସହାୟତା',
    badge: 'WELFARE AID',
    en: 'Targeted Odisha welfare scholarships including Gopabandhu Sikhya Sahayata Yojana (orphans, single-mother families, PwD, HIV/Kala-Azar affected) and Nirman Shramik Kalyan Yojana (OB&OCWB registered construction workers’ children from Class 6 to PG).',
    or: 'ବିଶେଷ କଲ୍ୟାଣମୂଳକ ଛାତ୍ରବୃତ୍ତି: ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା ଯୋଜନା (ଅନାଥ, ଏକକ-ମାତା, ଦିବ୍ୟାଙ୍ଗ) ଏବଂ ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ଯୋଜନା (OB&OCWB ପଞ୍ଜୀକୃତ ଶ୍ରମିକଙ୍କ ପିଲାଙ୍କ ପାଇଁ ୬ଷ୍ଠ ରୁ PG) ସହାୟତା ସୂଚନା।'
  },
  'odisha merit & research fellowships': {
    title_or: 'ଓଡ଼ିଶା ମେଧା ଏବଂ ଗବେଷଣା ଫେଲୋସିପ୍',
    badge: 'MERIT & RESEARCH',
    en: 'State merit and talent awards including e-Medhabruti (UG, PG, Technical & Professional Merit), Pathani Samanta Mathematics Talent Scholarship (PMST), NRTS, NMMS Odisha, and Biju Patnaik / Odisha State Research Fellowships.',
    or: 'ଓଡ଼ିଶା ମେଧା ଓ ଗବେଷଣା ବୃତ୍ତି: ଇ-ମେଧାବୃତ୍ତି (UG, PG, ବୈଷୟିକ), ପଠାଣି ସାମନ୍ତ ଗଣିତ ମେଧା ବୃତ୍ତି (PMST), NRTS, NMMS ଓଡ଼ିଶା ଏବଂ ବିଜୁ ପଟ୍ଟନାୟକ ଗବେଷଣା ଫେଲୋସିପ୍ ର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'nsp (national scholarship portal) schemes': {
    title_or: 'NSP (ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍) ଯୋଜନା',
    badge: 'NSP OTR',
    en: 'End-to-end National Scholarship Portal (scholarships.gov.in) guide covering mandatory 14-digit OTR (One-Time Registration), Aadhaar FaceRD authentication, PM-USP CSSS, NMMS renewal, and AICTE Pragati & Saksham submissions.',
    or: 'NSP ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍: scholarships.gov.in ରେ ୧୪-ଅଙ୍କ ବିଶିଷ୍ଟ OTR ପଞ୍ଜୀକରଣ, AadhaarFaceRD ବାୟୋମେଟ୍ରିକ୍ ଯାଞ୍ଚ, PM-USP, NMMS ଏବଂ AICTE ପ୍ରଗତି ଓ ସକ୍ଷମ ଆବେଦନର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'ugc net jrf, maulana azad & inspire fellowships': {
    title_or: 'UGC NET JRF, ମୌଲାନା ଆଜାଦ ଏବଂ INSPIRE ଫେଲୋସିପ୍',
    badge: 'JRF & INSPIRE',
    en: 'High-value science and doctoral fellowships: DST-INSPIRE SHE (₹80,000/yr for B.Sc./M.Sc. Natural Sciences), INSPIRE PhD Fellowship, and UGC-NET / CSIR-NET JRF (₹37,000/mo + HRA) upgrading to SRF (₹42,000/mo + HRA).',
    or: 'ଉଚ୍ଚତର ବିଜ୍ଞାନ ଓ ଗବେଷଣା ଫେଲୋସିପ୍: DST-INSPIRE SHE (ବାର୍ଷିକ ₹୮୦,୦୦୦), INSPIRE ଡକ୍ଟୋରାଲ୍ ଏବଂ UGC-NET / CSIR-NET JRF (ମାସିକ ₹୩୭,୦୦୦ + HRA) ଓ SRF (₹୪୨,୦୦୦ + HRA) ସୂଚନା।'
  },
  'vidya lakshmi & odisha student credit cards': {
    title_or: 'ବିଦ୍ୟାଲକ୍ଷ୍ମୀ ଏବଂ ଓଡ଼ିଶା କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ ଋଣ',
    badge: 'EDUCATION LOANS',
    en: 'Comprehensive education loan guide covering PM-Vidyalaxmi Scheme (collateral-free QHEI loans & 3% interest subvention) and Odisha Kalinga Sikhya Sathi Yojana (KSSY 1% effective interest rate up to ₹10 Lakh for technical/professional studies).',
    or: 'ଶିକ୍ଷା ଋଣ ମାର୍ଗଦର୍ଶିକା: PM-ବିଦ୍ୟାଲକ୍ଷ୍ମୀ ଯୋଜନା (ବିନା ବନ୍ଧକ ଋଣ ଓ ୩% ସୁଧ ରିହାତି) ଏବଂ ଓଡ଼ିଶା କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ ଯୋଜନା (KSSY ୧% ସୁଧ ହାରରେ ₹୧୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ଋଣ) ର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'naps apprenticeship & internship stipends': {
    title_or: 'NAPS ଆପ୍ରେଣ୍ଟିସଶିପ୍ ଏବଂ ଇଣ୍ଟର୍ନଶିପ୍ ଷ୍ଟାଇପେଣ୍ଡ',
    badge: 'NAPS / NATS',
    en: 'Monthly stipend support for ITI, Diploma, and Graduate trainees in Odisha industries under National Apprenticeship Promotion Scheme (NAPS-2 DBT ₹1,500 central share + employer stipend) and NATS portal.',
    or: 'NAPS ଓ NATS ଷ୍ଟାଇପେଣ୍ଡ: ଓଡ଼ିଶାର ITI, ଡିପ୍ଲୋମା ଓ ସ୍ନାତକ ତାଲିମାର୍ଥୀଙ୍କ ପାଇଁ NAPS-2 DBT ମାସିକ ଷ୍ଟାଇପେଣ୍ଡ ଏବଂ NATS ପୋର୍ଟାଲ୍ ମାଧ୍ୟମରେ ଶିଳ୍ପ ପ୍ରଶିକ୍ଷଣ ଆର୍ଥିକ ସହାୟତାର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'odisha post-matric renewal & bank seeding': {
    title_or: 'ଓଡ଼ିଶା ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ନବୀକରଣ ଏବଂ ବ୍ୟାଙ୍କ ସିଡିଂ',
    badge: 'DBT & RENEWAL',
    en: 'Critical DBT checklist for Odisha scholarship applicants: NPCI Aadhaar-bank mapper verification (UIDAI Bank Seeding Status), active savings account KYC, previous year promotion/marksheet upload, and PFMS disbursement tracking.',
    or: 'ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ନବୀକରଣ ଓ DBT ସିଡିଂ: NPCI ଆଧାର-ବ୍ୟାଙ୍କ ମ୍ୟାପର୍ ଯାଞ୍ଚ, ସକ୍ରିୟ ବ୍ୟାଙ୍କ ଖାତା KYC, ପୂର୍ବ ବର୍ଷର ମାର୍କସିଟ୍ ଅପଲୋଡ୍ ଏବଂ PFMS ପେମେଣ୍ଟ ଷ୍ଟାଟସ୍ ଟ୍ରାକିଂର ସମ୍ପୂର୍ଣ୍ଣ ମାର୍ଗଦର୍ଶିକା।'
  }
};

function buildSmartScholarshipFolderEnrichment(folder, parentTitle) {
  const title = String(folder.title || '').trim();
  const hay = `${title} ${parentTitle || ''} ${folder.slug || ''}`.toLowerCase();

  let badge = 'SCHOLARSHIPS';
  let en = '';
  let or = '';

  if (hay.includes('loan') || hay.includes('vidya') || hay.includes('credit') || hay.includes('stipend') || hay.includes('naps')) {
    badge = 'LOANS & STIPENDS';
    en = `Verified ${title} financing guide for Odisha students covering PM-Vidyalaxmi, Odisha Kalinga Sikhya Sathi Yojana (KSSY 1% interest subvention), collateral-free limits, NAPS/NATS stipends, and bank sanction steps.`;
    or = `${title} ଆର୍ଥିକ ସହାୟତା: ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ PM-ବିଦ୍ୟାଲକ୍ଷ୍ମୀ, କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ (KSSY ୧% ସୁଧ ରିହାତି), ବିନା ବନ୍ଧକ ଶିକ୍ଷା ଋଣ ଏବଂ NAPS/NATS ଷ୍ଟାଇପେଣ୍ଡ ପ୍ରକ୍ରିୟାର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।`;
  } else if (hay.includes('international') || hay.includes('overseas') || hay.includes('global')) {
    badge = 'GLOBAL AID';
    en = `Authoritative ${title} guide covering fully funded Master’s, PhD, and research scholarships (NOS, Chevening, Commonwealth, Fulbright-Nehru, DAAD, Erasmus Mundus) with eligibility, stipend, and application deadlines.`;
    or = `${title} ଆନ୍ତର୍ଜାତୀୟ ବୃତ୍ତି: ବିଦେଶରେ ଉଚ୍ଚଶିକ୍ଷା ଓ ଗବେଷଣା ପାଇଁ NOS, ଚେଭେନିଂ, କମନୱେଲ୍ଥ, ଫୁଲବ୍ରାଇଟ୍-ନେହେରୁ, DAAD ଏବଂ ଇରାସମସ୍ ମୁଣ୍ଡସ୍ ଛାତ୍ରବୃତ୍ତିର ଯୋଗ୍ୟତା ଓ ଆବେଦନ ସୂଚନା।`;
  } else if (hay.includes('nsp') || hay.includes('central') || hay.includes('jrf') || hay.includes('inspire') || hay.includes('aicte')) {
    badge = 'CENTRAL / NSP';
    en = `Detailed ${title} handbook covering National Scholarship Portal (scholarships.gov.in) OTR Face-Authentication, family income ceilings, merit cutoffs, PFMS DBT disbursement, and stacking/non-duplication norms.`;
    or = `${title} କେନ୍ଦ୍ରୀୟ ଛାତ୍ରବୃତ୍ତି: NSP ପୋର୍ଟାଲ୍ OTR ଫେସ୍-ଅଥେଣ୍ଟିକେସନ୍, ପାରିବାରିକ ଆୟ ସୀମା, ମେଧା କଟ୍-ଅଫ୍, PFMS DBT ପେମେଣ୍ଟ ଏବଂ ଏକାଧିକ ବୃତ୍ତି ନିୟମାବଳୀର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।`;
  } else {
    en = `Comprehensive ${title} guide for Odisha students detailing sanctioning departments, scholarship amounts, Aadhaar-seeded DBT bank rules, Tehsildar certificates, renewal norms, and official portal tracking.`;
    or = `${title} ଛାତ୍ରବୃତ୍ତି ମାର୍ଗଦର୍ଶିକା: ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ମଞ୍ଜୁରୀ ବିଭାଗ, ବୃତ୍ତି ରାଶି, ଆଧାର-ସିଡେଡ୍ DBT ବ୍ୟାଙ୍କ ନିୟମ, ପ୍ରମାଣପତ୍ର ତାଲିକା, ନବୀକରଣ ଏବଂ ସରକାରୀ ପୋର୍ଟାଲ୍ ଟ୍ରାକିଂର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  }

  return {
    title_or: folder.title_or || `${title} (ଛାତ୍ରବୃତ୍ତି ଓ ସହାୟତା)`,
    badge,
    en,
    or
  };
}

// 12 Exhaustive Minute Scholarship, Fellowship & Student Finance Handbooks (Category #05)
const CAT05_HANDBOOKS = [
  {
    id: 'ji-ss-state-portal',
    folderKey: 'odisha state scholarships',
    fallbackFolder: 'jf-ss-ssp-renewal',
    slug: 'odisha-state-scholarship-portal-guide',
    title: 'Odisha State Scholarship Portal (scholarship.odisha.gov.in) — Complete Master Guide, Registration & DBT Tracking',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ (scholarship.odisha.gov.in) — ସମ୍ପୂର୍ଣ୍ଣ ମାଷ୍ଟର ଗାଇଡ୍ ଏବଂ DBT ଟ୍ରାକିଂ',
    conducting_body: 'ST & SC Development / Higher Education / Labour & Skill Dev Depts, Odisha',
    exam_code: 'OSP-MASTER-DBT',
    cadre_group: 'Unified State Portal (Class 9 to PhD / Technical / ITI)',
    pay_matrix: '₹2,300 to ₹50,000+ per annum (Scheme & Course Dependent, Direct DBT)',
    age_limit_relaxation: 'Odisha Domicile; No rigid upper age bar for regular bonafide students (scheme-specific academic continuity)',
    qualification_odia_rule: 'Permanent Resident / Domicile of Odisha; Aadhaar-seeded active Bank Account (NPCI Mapper Active); valid Tehsildar Income & Caste certificates (where applicable)',
    selection_stages: '1. Aadhaar One-Time Registration -> 2. Online Form & Academic Bank Details -> 3. Institute Nodal Officer (INO) Verification -> 4. District Welfare/DHE Sanction -> 5. PFMS/Treasury DBT Credit',
    pst_pet_skill_norms: 'Stacking Rule: Students generally cannot draw two full Post-Matric maintenance scholarships simultaneously; check scheme-specific non-duplication undertaking before applying.',
    documents_checklist: '1. Student Aadhaar Card (linked to mobile for e-KYC)\n2. Active Bank Passbook with NPCI Aadhaar Seeding\n3. Tehsildar Resident/Nativity & Income Certificates\n4. Tehsildar Caste Certificate (SC/ST/OBC/SEBC)\n5. Bonafide Certificate & Fee Receipt\n6. Last Qualifying Exam Marksheet',
    application_steps: '1. Visit scholarship.odisha.gov.in and click Registration -> Aadhaar e-KYC.\n2. Select Department & Scheme matching your category and course.\n3. Verify IFSC and ensure Aadhaar is mapped at bank branch (NPCI).\n4. Submit application, download PDF, and submit hardcopy + self-attested proofs to College Nodal Officer.\n5. Track stage-wise status (Pending at Institute -> Approved by DWO/DHE -> Disbursed).',
    official_portal_url: 'https://scholarship.odisha.gov.in/',
    summary_en: 'Master handbook for Odisha State Scholarship Portal (scholarship.odisha.gov.in) covering unified Aadhaar registration, NPCI bank seeding, INO verification, renewal, and non-duplication rules.',
    summary_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ (scholarship.odisha.gov.in) ର ସମ୍ପୂର୍ଣ୍ଣ ମାଷ୍ଟର ଗାଇଡ୍: ଆଧାର e-KYC ପଞ୍ଜୀକରଣ, NPCI ବ୍ୟାଙ୍କ ସିଡିଂ, କଲେଜ୍ ଭେରିଫିକେସନ୍ ଏବଂ DBT ଟ୍ରାକିଂ।',
    body_html: '<h3>Unified Odisha State Scholarship Portal Architecture</h3><p>Operated jointly by OCAC and 6+ Odisha Government Departments (ST & SC Development, Higher Education, School & Mass Education, Skill Development & Technical Education, Labour & ESI, Agriculture), <strong>scholarship.odisha.gov.in</strong> routes all state scholarships directly into Aadhaar-mapped bank accounts via DBT.</p><h3>Critical DBT & Stacking Rules</h3><ul><li><strong>NPCI Seeding Mandatory:</strong> Having an Aadhaar number on your passbook is not enough; NPCI Aadhaar Mapper status must be Active.</li><li><strong>One-Scheme-One-Year Rule:</strong> Dual Post-Matric maintenance scholarships from two government portals for the same academic year lead to automatic rejection or recovery.</li></ul>',
    body_or: '<h3>ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ ପରିଚୟ</h3><p><strong>scholarship.odisha.gov.in</strong> ମାଧ୍ୟମରେ ଓଡ଼ିଶାର ST/SC, ଉଚ୍ଚଶିକ୍ଷା, ବିଦ୍ୟାଳୟ ଓ ଗଣଶିକ୍ଷା, ବୈଷୟିକ ଶିକ୍ଷା ଏବଂ ଶ୍ରମ ବିଭାଗର ସମସ୍ତ ଛାତ୍ରବୃତ୍ତି ସିଧାସଳଖ ଆଧାର-ସିଡେଡ୍ ବ୍ୟାଙ୍କ ଖାତାକୁ (DBT) ପଠାଯାଏ।</p>',
    tags: ['Odisha Scholarship Portal', 'DBT', 'NPCI Seeding', 'State Scholarship']
  },
  {
    id: 'ji-ss-post-matric-odisha',
    folderKey: 'state scholarship portal (post-matric & pre-matric)',
    fallbackFolder: 'jf-ss-ssp-post-pre',
    slug: 'odisha-post-matric-scholarship-sc-st-obc-sebc-ebc',
    title: 'Post-Matric Scholarship for SC, ST, OBC/SEBC & EBC Students (ST & SC Development / Higher Education Dept, Odisha)',
    title_or: 'ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି (SC, ST, OBC/SEBC ଏବଂ EBC) — ଓଡ଼ିଶା ସରକାର',
    conducting_body: 'ST & SC Development Dept & Higher Education Dept, Govt of Odisha',
    exam_code: 'ODISHA-PMS-2026',
    cadre_group: 'Post-Matric (+2, ITI, Diploma, UG, PG, B.Tech, MBBS, PhD)',
    pay_matrix: 'Maintenance ₹2,300–₹13,500/yr + Full Compulsory Non-Refundable Tuition/Exam Fee Reimbursement',
    age_limit_relaxation: 'No upper age bar for regular bonafide Odisha domicile students in recognised institutions',
    qualification_odia_rule: 'Odisha Domicile; Annual Family Income ≤ ₹2,50,000 (SC/ST/OBC/SEBC; EBC norms as notified); passed previous qualifying examination',
    selection_stages: '1. Online Application on State Scholarship Portal -> 2. Institute Nodal Officer (INO) Academic & Fee Verification -> 3. District Welfare Officer (DWO) Approval -> 4. Central/State Share PFMS DBT',
    pst_pet_skill_norms: '75% attendance & promotion to next class required for Renewal; cannot be combined with e-Medhabruti or PM-USP Central Sector Scholarship.',
    documents_checklist: '1. Aadhaar Card & Passport Photo\n2. Tehsildar Caste Certificate (SC/ST/OBC/SEBC)\n3. Tehsildar Annual Family Income Certificate (≤ ₹2.5 Lakh)\n4. Tehsildar Resident Certificate\n5. College Bonafide & Itemised Fee Receipt\n6. Previous Class Marksheet & Aadhaar-Seeded Bank Passbook',
    application_steps: '1. Log in to scholarship.odisha.gov.in and select Post-Matric Scholarship (SC/ST or OBC/SEBC/EBC).\n2. Enter SAMS/College Roll Number and exact Non-Refundable Tuition Fee.\n3. Upload scanned certificates and submit.\n4. Hand over signed printout to College Scholarship Cell before deadline for INO forwarding.',
    official_portal_url: 'https://scholarship.odisha.gov.in/',
    summary_en: 'Complete Odisha Post-Matric Scholarship guide for SC, ST, OBC/SEBC & EBC students covering ₹2.5 Lakh income limit, tuition fee reimbursement, maintenance allowance, and renewal rules.',
    summary_or: 'ଓଡ଼ିଶା ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ଛାତ୍ରବୃତ୍ତି (SC, ST, OBC/SEBC, EBC): ₹୨.୫ ଲକ୍ଷ ଆୟ ସୀମା, ଟ୍ୟୁସନ୍ ଫି ରିହାତି, ମେଣ୍ଟେନାନ୍ସ ଭତ୍ତା ଏବଂ ନବୀକରଣ ନିୟମର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।',
    body_html: '<h3>Course Groups & Reimbursement Structure</h3><p>Odisha Post-Matric Scholarship covers Group I (Degree/PG Professional: MBBS, B.Tech, MBA, MCA), Group II (Other Professional/Diploma/PG), Group III (General UG B.A./B.Sc./B.Com), and Group IV (+2/ITI). Hostellers receive higher monthly maintenance than day scholars alongside compulsory non-refundable fee reimbursement.</p>',
    body_or: '<h3>ପାଠ୍ୟକ୍ରମ ବର୍ଗ ଏବଂ ଆର୍ଥିକ ସହାୟତା</h3><p>ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ ବୃତ୍ତିରେ ଗ୍ରୁପ୍-୧ (MBBS, B.Tech, MBA) ରୁ ଗ୍ରୁପ୍-୪ (+୨/ITI) ପର୍ଯ୍ୟନ୍ତ ହଷ୍ଟେଲର ଓ ଡେ-ସ୍କଲାର ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ ମାସିକ ଭତ୍ତା ଏବଂ ବାଧ୍ୟତାମୂଳକ ଟ୍ୟୁସନ୍ ଫି ପ୍ରଦାନ କରାଯାଏ।</p>',
    tags: ['Post-Matric Scholarship', 'SC ST OBC SEBC', 'Odisha Scholarship']
  },
  {
    id: 'ji-ss-e-medhabruti',
    folderKey: 'odisha merit & research fellowships',
    fallbackFolder: 'jf-ss-odisha-merit',
    slug: 'e-medhabruti-merit-scholarship-odisha',
    title: 'e-Medhabruti Merit Scholarship Odisha (UG Merit, PG Merit, Technical & Professional Merit — ₹5,000 to ₹10,000/yr)',
    title_or: 'ଇ-ମେଧାବୃତ୍ତି ମେରିଟ୍ ସ୍କଲାରଶିପ୍ ଓଡ଼ିଶା (UG, PG ଏବଂ ବୈଷୟିକ ମେଧା — ₹୫,୦୦୦ ରୁ ₹୧୦,୦୦୦/ବର୍ଷ)',
    conducting_body: 'Higher Education Department, Government of Odisha',
    exam_code: 'DHE-EMEDHABRUTI',
    cadre_group: 'UG Merit (+3), PG Merit, Technical & Professional Merit (B.Tech/MBBS/MBA/MCA)',
    pay_matrix: 'UG Merit: ₹5,000/yr | PG Merit: ₹10,000/yr | Technical/Professional: ₹10,000/yr (DBT)',
    age_limit_relaxation: 'Odisha Domicile studying inside or outside Odisha in recognised Govt/Private institutions',
    qualification_odia_rule: 'Minimum 55%–60% aggregate marks in last qualifying exam (+2 for UG; UG for PG/Tech); Annual Parental Income ≤ ₹6,00,000 (₹8,00,000 where revised)',
    selection_stages: '1. Online Application on State Scholarship Portal -> 2. College Principal / INO Validation -> 3. DHE State Merit List (Mark-wise Cutoff) -> 4. Direct DBT Credit',
    pst_pet_skill_norms: 'Non-duplication: Students availing Post-Matric Scholarship or any other state/central scholarship are not eligible for e-Medhabruti simultaneously.',
    documents_checklist: '1. Aadhaar Card & Odisha Resident Certificate\n2. Tehsildar Annual Income Certificate\n3. Last Qualifying Exam Marksheet (+2 / Graduation)\n4. College Admission / Bonafide Certificate\n5. Aadhaar-Seeded Bank Passbook',
    application_steps: '1. Register/Login at scholarship.odisha.gov.in under Higher Education Dept -> e-Medhabruti.\n2. Choose UG, PG, or Technical/Professional stream.\n3. Upload marksheet, income & resident certificates.\n4. Ensure Principal/INO verifies within timeline.',
    official_portal_url: 'https://scholarship.odisha.gov.in/',
    summary_en: 'Detailed e-Medhabruti Odisha guide covering UG Merit (₹5,000/yr), PG Merit (₹10,000/yr), and Technical/Professional Merit (₹10,000/yr) eligibility, income cap, and merit selection.',
    summary_or: 'ଇ-ମେଧାବୃତ୍ତି ଓଡ଼ିଶା ଗାଇଡ୍: UG ମେରିଟ୍ (₹୫,୦୦୦/ବର୍ଷ), PG ମେରିଟ୍ (₹୧୦,୦୦୦/ବର୍ଷ) ଏବଂ ବୈଷୟିକ ମେରିଟ୍ (₹୧୦,୦୦୦/ବର୍ଷ) ର ଯୋଗ୍ୟତା, ଆୟ ସୀମା ଏବଂ ଆବେଦନ ପ୍ରକ୍ରିୟା।',
    body_html: '<h3>Merit Streams Under e-Medhabruti</h3><p><strong>e-Medhabruti</strong> rewards meritorious Odisha students across General UG (+3 Arts/Science/Commerce), General PG (M.A./M.Sc./M.Com), and Technical/Professional courses (B.Tech, MBBS, BDS, B.Pharm, MBA, MCA, Nursing, B.Ed.) based on merit rank within notified income limits.</p>',
    body_or: '<h3>ଇ-ମେଧାବୃତ୍ତିର ତିନୋଟି ବର୍ଗ</h3><p>ଉଚ୍ଚଶିକ୍ଷା ବିଭାଗ ଦ୍ୱାରା ପରିଚାଳିତ ଇ-ମେଧାବୃତ୍ତି ସାଧାରଣ ସ୍ନାତକ (UG), ସ୍ନାତକୋତ୍ତର (PG) ଏବଂ ବୈଷୟିକ/ବୃତ୍ତିଗତ ପାଠ୍ୟକ୍ରମର ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ ବାର୍ଷିକ ଆର୍ଥିକ ସହାୟତା ପ୍ରଦାନ କରେ।</p>',
    tags: ['e-Medhabruti', 'Merit Scholarship', 'Higher Education Odisha']
  },
  {
    id: 'ji-ss-gopabandhu-sikhya',
    folderKey: 'kalia, gopabandhu & nirman shramik student aid',
    fallbackFolder: 'jf-ss-kalia-gopabandhu',
    slug: 'gopabandhu-sikhya-sahayata-yojana-odisha',
    title: 'Gopabandhu Sikhya Sahayata Yojana (Odisha) — Financial Support for Orphans, Single-Mother Families, PwD & HIV/Kala-Azar Affected Students',
    title_or: 'ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା ଯୋଜନା (ଓଡ଼ିଶା) — ଅନାଥ, ଏକକ-ମାତା, ଦିବ୍ୟାଙ୍ଗ ଓ ବିଶେଷ ବର୍ଗ ଛାତ୍ର ସହାୟତା',
    conducting_body: 'Higher Education Department, Government of Odisha',
    exam_code: 'DHE-GSSY-ODISHA',
    cadre_group: 'UG, PG & Technical/Professional Students from Vulnerable Categories',
    pay_matrix: '₹20,000 per annum (Direct DBT to Student Bank Account)',
    age_limit_relaxation: 'Odisha Domicile; Special humanitarian priority for vulnerable family backgrounds',
    qualification_odia_rule: 'Student must belong to: HIV/AIDS affected family, Households without Shelter, Destitute/Single-Mother/Widow family, Manual Scavenger family, Orphan, or PwD/Kala-Azar affected; Family Income ≤ ₹2,50,000/yr',
    selection_stages: '1. Online Application on State Scholarship Portal -> 2. Supporting Vulnerability Certificate Verification -> 3. INO & DHE Approval -> 4. ₹20,000 Annual DBT',
    pst_pet_skill_norms: 'Renewable each academic year upon successful promotion to next semester/year; Aadhaar-seeded bank account mandatory.',
    documents_checklist: '1. Vulnerability Proof (Death certificate of parent / Orphanage / Single-Mother / PwD UDID / CDMO medical certificate)\n2. Tehsildar Income Certificate (≤ ₹2.5 Lakh)\n3. Resident Certificate & Aadhaar\n4. Bonafide Student Certificate & Passbook',
    application_steps: '1. Visit scholarship.odisha.gov.in -> Higher Education Dept -> Gopabandhu Sikhya Sahayata Yojana.\n2. Select exact vulnerability category and upload valid official certificate.\n3. Submit to College Nodal Officer for verification.',
    official_portal_url: 'https://scholarship.odisha.gov.in/',
    summary_en: 'Complete guide to Gopabandhu Sikhya Sahayata Yojana Odisha (₹20,000/yr) supporting orphans, single-mother families, PwD, destitute, and HIV/Kala-Azar affected college students.',
    summary_or: 'ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା ଯୋଜନା ଓଡ଼ିଶା (ବାର୍ଷିକ ₹୨୦,୦୦୦): ଅନାଥ, ଏକକ-ମାତା, ଦିବ୍ୟାଙ୍ଗ (PwD) ଏବଂ ଅସହାୟ ପରିବାରର କଲେଜ୍ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ଆର୍ଥିକ ସହାୟତା ଗାଇଡ୍।',
    body_html: '<h3>Humanitarian Higher Education Support</h3><p>Gopabandhu Sikhya Sahayata Yojana ensures vulnerable Odisha students pursuing Graduation, Post-Graduation, or Technical/Professional degrees do not drop out due to financial distress, providing <strong>₹20,000 per year</strong> directly via DBT.</p>',
    body_or: '<h3>ଅସହାୟ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ଉଚ୍ଚଶିକ୍ଷା ସହାୟତା</h3><p>ଏହି ଯୋଜନା ମାଧ୍ୟମରେ ଅନାଥ, ବିଧବା/ଏକକ-ମାତା ସନ୍ତାନ, ଦିବ୍ୟାଙ୍ଗ ଏବଂ ବିଶେଷ ବର୍ଗର ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ ବାର୍ଷିକ ₹୨୦,୦୦୦ ଆର୍ଥିକ ସହାୟତା ପ୍ରଦାନ କରାଯାଏ।</p>',
    tags: ['Gopabandhu Sikhya Sahayata', 'Orphan Scholarship', 'Odisha Welfare']
  },
  {
    id: 'ji-ss-nirman-shramik',
    folderKey: 'kalia, gopabandhu & nirman shramik student aid',
    fallbackFolder: 'jf-ss-kalia-gopabandhu',
    slug: 'nirman-shramik-kalyan-yojana-education-assistance-odisha',
    title: 'Nirman Shramik Kalyan Yojana (Odisha Building & Other Construction Workers Board) — Educational Assistance from Class 6 to Technical/Medical PG',
    title_or: 'ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ଯୋଜନା (OB&OCWB ଓଡ଼ିଶା) — ୬ଷ୍ଠ ଶ୍ରେଣୀରୁ ବୈଷୟିକ/ମେଡିକାଲ୍ PG ପର୍ଯ୍ୟନ୍ତ ଶିକ୍ଷା ସହାୟତା',
    conducting_body: 'Odisha Building & Other Construction Workers Welfare Board (Labour & ESI Dept)',
    exam_code: 'OBOCWB-NSKY-EDU',
    cadre_group: 'Wards of Registered Construction Workers (Class 6 to PhD / B.Tech / MBBS)',
    pay_matrix: '₹2,000/yr (Class 6–7) | ₹2,000–₹4,000 (Class 8–10) | ₹5,000 (+2) | ₹7,000 (UG) | ₹10,000 (PG) | ₹40,000/yr (B.Tech/MBBS/Professional)',
    age_limit_relaxation: 'Up to 2 children of active OB&OCWB registered construction worker with minimum 1 year continuous membership',
    qualification_odia_rule: 'Parent must hold active OB&OCWB Registration Card with up-to-date annual contribution; 20% extra incentive for Girl Children across levels',
    selection_stages: '1. Online Application on State Scholarship Portal (Labour & ESI Dept) -> 2. Institute Verification -> 3. District Labour Officer (DLO) Validation of Worker Card -> 4. DBT Credit',
    pst_pet_skill_norms: '50%+ attendance & class promotion required; girl students receive an additional 20% bonus over standard slab rates.',
    documents_checklist: '1. Parent OB&OCWB Construction Worker Registration Card & Renewal Receipt\n2. Student Aadhaar & Bank Passbook\n3. School/College Bonafide Certificate\n4. Previous Class Marksheet\n5. Income/Resident Declaration',
    application_steps: '1. Ensure parent OB&OCWB card is active/renewed on labour.odisha.gov.in.\n2. Apply on scholarship.odisha.gov.in under Labour & ESI Department -> Nirman Shramik Kalyan Yojana.\n3. Enter Worker Registration Number and verify with DLO.',
    official_portal_url: 'https://scholarship.odisha.gov.in/',
    summary_en: 'Complete Odisha Nirman Shramik Kalyan Yojana (OB&OCWB) scholarship slab guide from Class 6 (₹2,000) up to B.Tech/MBBS (₹40,000/yr) plus 20% extra incentive for girl students.',
    summary_or: 'ନିର୍ମାଣ ଶ୍ରମିକ କଲ୍ୟାଣ ଯୋଜନା (OB&OCWB): ୬ଷ୍ଠ ଶ୍ରେଣୀ (₹୨,୦୦୦) ରୁ B.Tech/MBBS (₹୪୦,୦୦୦/ବର୍ଷ) ପର୍ଯ୍ୟନ୍ତ ଶିକ୍ଷା ସହାୟତା ଏବଂ ଛାତ୍ରୀଙ୍କ ପାଇଁ ଅତିରିକ୍ତ ୨୦% ପ୍ରୋତ୍ସାହନ ସୂଚନା।',
    body_html: '<h3>Slab-Wise Education Assistance (OB&OCWB)</h3><p>Active registered construction workers’ children in Odisha receive annual financial assistance from Class 6 through Doctoral/Medical/Engineering degrees, with an additional <strong>20% incentive for girl students</strong>.</p>',
    body_or: '<h3>ଶ୍ରେଣୀ ଅନୁଯାୟୀ ଆର୍ଥିକ ସହାୟତା (OB&OCWB)</h3><p>ପଞ୍ଜୀକୃତ ନିର୍ମାଣ ଶ୍ରମିକଙ୍କ ପିଲାମାନଙ୍କୁ ୬ଷ୍ଠ ଶ୍ରେଣୀରୁ ଉଚ୍ଚତର ବୈଷୟିକ ଓ ମେଡିକାଲ୍ ଶିକ୍ଷା ପର୍ଯ୍ୟନ୍ତ ବାର୍ଷିକ ସହାୟତା ସହିତ ଝିଅମାନଙ୍କ ପାଇଁ ୨୦% ଅତିରିକ୍ତ ରାଶି ମିଳିଥାଏ।</p>',
    tags: ['Nirman Shramik', 'OBOCWB', 'Labour Dept Odisha', 'Girl Child Incentive']
  },
  {
    id: 'ji-ss-nsp-otr',
    folderKey: 'nsp (national scholarship portal) schemes',
    fallbackFolder: 'jf-ss-nsp-schemes',
    slug: 'national-scholarship-portal-nsp-otr-guide',
    title: 'National Scholarship Portal (NSP — scholarships.gov.in) & OTR (One-Time Registration) Face-Authentication Guide',
    title_or: 'ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ (NSP — scholarships.gov.in) ଏବଂ OTR ଫେସ୍-ଅଥେଣ୍ଟିକେସନ୍ ଗାଇଡ୍',
    conducting_body: 'Ministry of Electronics & IT / National Informatics Centre (NIC), Govt of India',
    exam_code: 'NSP-OTR-2026',
    cadre_group: 'All Central Ministry, UGC, AICTE & State-Linked NSP Schemes',
    pay_matrix: 'Unified Gateway for ₹12,000 to ₹80,000+/yr Central Scholarships (PFMS DBT)',
    age_limit_relaxation: 'All Indian/Odisha students enrolled in AISHE/UDISE+ registered schools and colleges',
    qualification_odia_rule: 'Mandatory 14-digit OTR (One-Time Registration) generated via Aadhaar FaceRD Mobile App before applying for any NSP Fresh or Renewal scheme',
    selection_stages: '1. Generate 14-digit OTR via NSP OTR App + AadhaarFaceRD -> 2. Log in to scholarships.gov.in -> 3. Fill Scheme Form -> 4. Institute Nodal Officer (INO) Biometric Verification -> 5. State/Ministry Verification -> 6. PFMS DBT',
    pst_pet_skill_norms: 'NSP enforces strict single-scholarship selection: only ONE Central/UGC/AICTE NSP scheme can be availed per student in an academic year.',
    documents_checklist: '1. Aadhaar Card (linked to active mobile)\n2. Smartphones with NSP OTR App & AadhaarFaceRD installed\n3. AISHE/UDISE+ Institute Code\n4. Income, Caste & Bonafide Certificates\n5. Aadhaar-Seeded Bank Account (NPCI Active)',
    application_steps: '1. Download AadhaarFaceRD and NSP OTR apps from Google Play.\n2. Complete e-KYC face authentication to receive permanent 14-digit OTR number.\n3. Log in on scholarships.gov.in with OTR, apply for eligible scheme, and verify with INO.',
    official_portal_url: 'https://scholarships.gov.in/',
    summary_en: 'Step-by-step guide to National Scholarship Portal (scholarships.gov.in), 14-digit One-Time Registration (OTR), AadhaarFaceRD biometric e-KYC, INO verification, and PFMS tracking.',
    summary_or: 'NSP (scholarships.gov.in) ଏବଂ ୧୪-ଅଙ୍କ ବିଶିଷ୍ଟ OTR ଫେସ୍-ଅଥେଣ୍ଟିକେସନ୍ ଗାଇଡ୍: AadhaarFaceRD ଆପ୍ ମାଧ୍ୟମରେ ପଞ୍ଜୀକରଣ, କଲେଜ୍ ଭେରିଫିକେସନ୍ ଏବଂ PFMS ଟ୍ରାକିଂ।',
    body_html: '<h3>Mandatory OTR & Face-Authentication Workflow</h3><p>From 2024–25 onwards, <strong>NSP (scholarships.gov.in)</strong> requires every fresh and renewal applicant to hold a permanent <strong>14-digit OTR ID</strong> verified via AadhaarFaceRD. Once generated, the same OTR works across your entire academic career.</p>',
    body_or: '<h3>NSP OTR ଏବଂ ଫେସ୍-ଅଥେଣ୍ଟିକେସନ୍ ପ୍ରକ୍ରିୟା</h3><p>ଜାତୀୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲରେ ଆବେଦନ ପାଇଁ AadhaarFaceRD ଆପ୍ ମାଧ୍ୟମରେ ୧୪-ଅଙ୍କ ବିଶିଷ୍ଟ OTR ନମ୍ବର ବାଧ୍ୟତାମୂଳକ ଅଟେ।</p>',
    tags: ['NSP', 'OTR', 'AadhaarFaceRD', 'Central Scholarship']
  },
  {
    id: 'ji-ss-pm-usp-csss',
    folderKey: 'nsp (national scholarship portal) schemes',
    fallbackFolder: 'jf-ss-nsp-schemes',
    slug: 'pm-usp-central-sector-scholarship-chse-odisha',
    title: 'PM-USP Central Sector Scheme of Scholarship for College & University Students (CHSE Odisha Top 20th Percentile — ₹12,000 to ₹20,000/yr)',
    title_or: 'PM-USP ସେଣ୍ଟ୍ରାଲ୍ ସେକ୍ଟର ସ୍କଲାରଶିପ୍ (CHSE ଓଡ଼ିଶା ଟପ୍ ୨୦% — ₹୧୨,୦୦୦ ରୁ ₹୨୦,୦୦୦/ବର୍ଷ)',
    conducting_body: 'Department of Higher Education, Ministry of Education & CHSE Odisha',
    exam_code: 'PM-USP-CSSS',
    cadre_group: 'Regular UG & PG Degree Students (All Streams: Arts, Science, Commerce, Tech)',
    pay_matrix: '₹12,000/yr (1st 3 Years of Graduation) | ₹20,000/yr (4th–5th Year / PG)',
    age_limit_relaxation: 'Students who passed Class 12 (CHSE Odisha / CBSE / ICSE) in the relevant year',
    qualification_odia_rule: 'Above 80th percentile (Top 20%) of successful candidates in CHSE Odisha Class 12 Board Exam; Annual Parental Income ≤ ₹4,50,000; regular college admission',
    selection_stages: '1. CHSE Odisha Top 20th Percentile Merit List Publication -> 2. NSP Online Application -> 3. College INO & CHSE State Verification -> 4. Ministry Merit Allotment -> 5. PFMS DBT',
    pst_pet_skill_norms: 'Renewal requires minimum 50% marks in previous annual/semester exam and 75% attendance; cannot be combined with any other scholarship/fee-reimbursement scheme.',
    documents_checklist: '1. CHSE Odisha / CBSE Class 12 Marksheet & Admit Card\n2. NSP OTR ID & Aadhaar Card\n3. Tehsildar Family Income Certificate (≤ ₹4.5 Lakh)\n4. College Admission Receipt & Bonafide\n5. Aadhaar-Seeded Bank Account',
    application_steps: '1. Check CHSE Odisha official Top 20th Percentile merit list at chseodisha.nic.in.\n2. Log in to scholarships.gov.in using OTR and apply under Department of Higher Education -> PM-USP CSSS.\n3. Verify through College INO and CHSE Nodal Officer.',
    official_portal_url: 'https://scholarships.gov.in/',
    summary_en: 'Complete PM-USP Central Sector Scholarship guide for CHSE Odisha Top 20th Percentile Class 12 pass students: ₹12,000/yr (UG) to ₹20,000/yr (PG/4th-5th yr), ₹4.5 Lakh income cap, and renewal rules.',
    summary_or: 'PM-USP ସେଣ୍ଟ୍ରାଲ୍ ସେକ୍ଟର ସ୍କଲାରଶିପ୍: CHSE ଓଡ଼ିଶା ଯୁକ୍ତ-୨ ଟପ୍ ୨୦% ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ₹୧୨,୦୦୦ (UG) ରୁ ₹୨୦,୦୦୦/ବର୍ଷ (PG) ସହାୟତା, ₹୪.୫ ଲକ୍ଷ ଆୟ ସୀମା ଓ ନବୀକରଣ ନିୟମ।',
    body_html: '<h3>CHSE Odisha Top 20th Percentile Quota</h3><p>Under <strong>PM-USP CSSS</strong>, Odisha’s state board (CHSE) receives a dedicated state quota distributed across Arts, Science, and Commerce streams. Students scoring in the top 20th percentile with parental income up to ₹4.5 Lakh receive ₹12,000/yr for UG years 1–3 and ₹20,000/yr for 4th/5th year or PG.</p>',
    body_or: '<h3>CHSE ଓଡ଼ିଶା ଟପ୍ ୨୦% ମେଧା କୋଟା</h3><p>CHSE ଓଡ଼ିଶା ଦ୍ୱାଦଶ ପରୀକ୍ଷାରେ କଳା, ବିଜ୍ଞାନ ଓ ବାଣିଜ୍ୟ ବିଭାଗର ଟପ୍ ୨୦% ମଧ୍ୟରେ ଥିବା ଏବଂ ₹୪.୫ ଲକ୍ଷରୁ କମ୍ ପାରିବାରିକ ଆୟ ଥିବା ଛାତ୍ରଛାତ୍ରୀ ଏହି ବୃତ୍ତି ପାଇଁ ଯୋଗ୍ୟ।</p>',
    tags: ['PM-USP', 'Central Sector Scholarship', 'CHSE Odisha', 'NSP']
  },
  {
    id: 'ji-ss-aicte-pragati-saksham',
    folderKey: 'scholarships by eligibility group',
    fallbackFolder: 'jf-ss-nsp-schemes',
    slug: 'aicte-pragati-and-saksham-scholarship-guide',
    title: 'AICTE Pragati Scholarship (Girl Students — ₹50,000/yr) & AICTE Saksham Scholarship (Divyangjan/PwD Students — ₹50,000/yr) for Degree & Diploma',
    title_or: 'AICTE ପ୍ରଗତି (ଛାତ୍ରୀ — ₹୫୦,୦୦୦/ବର୍ଷ) ଏବଂ AICTE ସକ୍ଷମ (ଦିବ୍ୟାଙ୍ଗ/PwD — ₹୫୦,୦୦୦/ବର୍ଷ) ଛାତ୍ରବୃତ୍ତି ଗାଇଡ୍',
    conducting_body: 'All India Council for Technical Education (AICTE), Ministry of Education',
    exam_code: 'AICTE-PRAGATI-SAKSHAM',
    cadre_group: '1st Year (or 2nd Year Lateral Entry) AICTE-Approved Technical Degree / Diploma',
    pay_matrix: '₹50,000 per annum (Consolidated lump-sum for tuition, books, laptop & incidentals)',
    age_limit_relaxation: 'Pragati: Up to 2 Girl Children per family | Saksham: All eligible PwD (≥40% disability) students',
    qualification_odia_rule: 'Admitted to 1st year or 2nd year (Lateral Entry) of AICTE-approved Degree (B.Tech/B.Pharm/etc.) or Diploma (SCTE&VT) course; Annual Family Income ≤ ₹8,00,000',
    selection_stages: '1. NSP Portal Application -> 2. College AICTE Nodal Verification -> 3. State/AICTE Merit List (Saksham: all eligible ≥40% PwD applicants funded) -> 4. Direct DBT',
    pst_pet_skill_norms: 'Pragati has state-wise reserved slots plus special open merit; Saksham funds all eligible ≥40% Divyangjan applicants. Cannot be stacked with other full scholarships.',
    documents_checklist: '1. Class 10 & 12 / ITI Marksheets\n2. OJEE / DET Admission Allotment Letter\n3. Tehsildar Income Certificate (≤ ₹8 Lakh)\n4. UDID / Disability Certificate (≥40% for Saksham)\n5. Family Declaration (for Pragati) & Aadhaar-Seeded Bank Account',
    application_steps: '1. Confirm your college/polytechnic is AICTE-approved for the current academic year.\n2. Generate NSP OTR ID and apply under AICTE -> Pragati or Saksham on scholarships.gov.in.\n3. Upload documents and get INO + DTE Odisha verification.',
    official_portal_url: 'https://scholarships.gov.in/',
    summary_en: 'Complete AICTE Pragati (girls) and Saksham (Divyangjan/PwD ≥40%) scholarship guide: ₹50,000/yr for B.Tech, B.Pharm & SCTE&VT Diploma students with ₹8 Lakh family income ceiling.',
    summary_or: 'AICTE ପ୍ରଗତି (ଛାତ୍ରୀ) ଏବଂ ସକ୍ଷମ (ଦିବ୍ୟାଙ୍ଗ ≥୪୦%): B.Tech, B.Pharm ଏବଂ ଡିପ୍ଲୋମା ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ବାର୍ଷିକ ₹୫୦,୦୦୦ ସହାୟତା ଓ ₹୮ ଲକ୍ଷ ଆୟ ସୀମାର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।',
    body_html: '<h3>₹50,000/Yr Technical Education Support</h3><p>Both <strong>AICTE Pragati</strong> (for female technical students) and <strong>AICTE Saksham</strong> (for Divyangjan students with ≥40% disability) provide <strong>₹50,000 every year</strong> for up to 4 years (Degree) or 3 years (Diploma), including Lateral Entry entrants.</p>',
    body_or: '<h3>ବୈଷୟିକ ଶିକ୍ଷା ପାଇଁ ବାର୍ଷିକ ₹୫୦,୦୦୦ ସହାୟତା</h3><p>AICTE ଅନୁମୋଦିତ ଇଞ୍ଜିନିୟରିଂ ଡିଗ୍ରୀ ବା ଡିପ୍ଲୋମା ପଢ଼ୁଥିବା ଛାତ୍ରୀ (ପ୍ରଗତି) ଏବଂ ଦିବ୍ୟାଙ୍ଗ ଛାତ୍ରଛାତ୍ରୀ (ସକ୍ଷମ) ବାର୍ଷିକ ₹୫୦,୦୦୦ ବୃତ୍ତି ପାଇପାରିବେ।</p>',
    tags: ['AICTE Pragati', 'AICTE Saksham', 'Girl Scholarship', 'PwD Scholarship']
  },
  {
    id: 'ji-ss-dst-inspire',
    folderKey: 'ugc net jrf, maulana azad & inspire fellowships',
    fallbackFolder: 'jf-ss-ugc-inspire',
    slug: 'dst-inspire-she-and-doctoral-fellowship-guide',
    title: 'DST-INSPIRE Scholarship for Higher Education (SHE — ₹80,000/yr for Basic & Natural Sciences) & INSPIRE Doctoral Fellowship',
    title_or: 'DST-INSPIRE ଉଚ୍ଚଶିକ୍ଷା ବୃତ୍ତି (SHE — ବାର୍ଷିକ ₹୮୦,୦୦୦) ଏବଂ INSPIRE ଡକ୍ଟୋରାଲ୍ ଫେଲୋସିପ୍ ଗାଇଡ୍',
    conducting_body: 'Department of Science & Technology (DST), Ministry of Science & Technology',
    exam_code: 'DST-INSPIRE-SHE',
    cadre_group: 'B.Sc., B.S., Int. M.Sc./M.S. in 18 Basic & Natural Sciences (and PhD INSPIRE Fellows)',
    pay_matrix: 'SHE: ₹60,000/yr Cash + ₹20,000/yr Summer Research Mentorship Grant = ₹80,000/yr',
    age_limit_relaxation: '17–22 years for SHE; Top 1% in Class 12 Board (CHSE Odisha Top 1% / JEE / NEET / NEST Top 10,000)',
    qualification_odia_rule: 'Top 1% in Class 12 CHSE Odisha / CBSE / ICSE Board OR Top 10,000 rank in JEE/NEET/NEST/IAT pursuing Physics, Chemistry, Maths, Biology, Earth/Life Sciences (NOT Engineering/Medicine)',
    selection_stages: '1. Online Application on online-inspire.gov.in -> 2. Advisory Note / Top 1% Verification -> 3. Provisional Offer -> 4. Annual Performance Report + Mentorship Grant Claim -> 5. DBT',
    pst_pet_skill_norms: 'Strictly for Basic & Natural Sciences (B.Sc./B.S./Int. M.Sc.); requires ≥60% aggregate (7.0 CGPA) each year for continuation. Cannot be stacked with KVPY/other full science fellowships.',
    documents_checklist: '1. Class 12 Marksheet & CHSE/CBSE Top 1% Advisory Note (if issued)\n2. Endorsement Form signed by College Principal\n3. SBI Bank Account Details (INSPIRE prefers SBI)\n4. Class 10 Certificate & Aadhaar',
    application_steps: '1. Register at online-inspire.gov.in during the annual SHE call (usually Sept–Nov).\n2. Upload Class 12 marksheet, endorsement form, and rank proof.\n3. After selection, submit annual marksheets and summer project report for ₹60k + ₹20k release.',
    official_portal_url: 'https://www.online-inspire.gov.in/',
    summary_en: 'Authoritative DST-INSPIRE SHE (₹80,000/yr) & INSPIRE Fellowship guide for Odisha Class 12 Top 1% & NEST/JEE/NEET rankers pursuing Basic & Natural Sciences (B.Sc./M.Sc./PhD).',
    summary_or: 'DST-INSPIRE (SHE — ବାର୍ଷିକ ₹୮୦,୦୦୦) ଏବଂ ଡକ୍ଟୋରାଲ୍ ଫେଲୋସିପ୍: ଯୁକ୍ତ-୨ ଟପ୍ ୧% କିମ୍ବା NEST/JEE/NEET ର୍ୟାଙ୍କଧାରୀ ବିଜ୍ଞାନ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍।',
    body_html: '<h3>Basic & Natural Sciences Merit Fellowship</h3><p><strong>DST-INSPIRE SHE</strong> provides <strong>₹80,000 per year</strong> (₹5,000/month scholarship + ₹20,000 annual summer mentorship grant) for up to 5 years to top 1% Class 12 performers (including CHSE Odisha Top 1%) and NISER/IISER/JEE/NEET rankers studying pure sciences.</p>',
    body_or: '<h3>ମୌଳିକ ବିଜ୍ଞାନ ଶିକ୍ଷା ପାଇଁ ବାର୍ଷିକ ₹୮୦,୦୦୦</h3><p>B.Sc., B.S. କିମ୍ବା Integrated M.Sc. (ପଦାର୍ଥ ବିଜ୍ଞାନ, ରସାୟନ ବିଜ୍ଞାନ, ଗଣିତ, ଜୀବବିଜ୍ଞାନ) ପଢ଼ୁଥିବା ମେଧାବୀ ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ DST-INSPIRE ବାର୍ଷିକ ₹୮୦,୦୦୦ ପ୍ରଦାନ କରେ।</p>',
    tags: ['DST INSPIRE', 'SHE Scholarship', 'Natural Sciences', 'CHSE Top 1%']
  },
  {
    id: 'ji-ss-ugc-csir-jrf',
    folderKey: 'ugc net jrf, maulana azad & inspire fellowships',
    fallbackFolder: 'jf-ss-ugc-inspire',
    slug: 'ugc-csir-net-jrf-srf-fellowship-guide',
    title: 'UGC NET / CSIR NET Junior Research Fellowship (JRF — ₹37,000/mo + HRA) & Senior Research Fellowship (SRF — ₹42,000/mo + HRA)',
    title_or: 'UGC NET / CSIR NET ଜୁନିଅର ରିସର୍ଚ୍ଚ ଫେଲୋସିପ୍ (JRF — ₹୩୭,୦୦୦/ମାସ + HRA) ଏବଂ SRF (₹୪୨,୦୦୦/ମାସ + HRA)',
    conducting_body: 'National Testing Agency (NTA) / UGC / CSIR',
    exam_code: 'UGC-CSIR-JRF-SRF',
    cadre_group: 'Full-Time PhD / M.Phil Research Scholars in Indian Universities & Institutes',
    pay_matrix: 'JRF (Years 1–2): ₹37,000/mo + HRA + Contingency | SRF (Years 3–5): ₹42,000/mo + HRA + Contingency',
    age_limit_relaxation: 'JRF Max Age: 30 yrs (UR) | +5 yrs relaxation (35 yrs) for SC/ST/OBC-NCL/PwD/Women/Transgender',
    qualification_odia_rule: 'Master’s Degree (55% UR / 50% SC-ST-OBC-NCL-PwD) OR 4-Year NEP Bachelor’s (75%+); must qualify NTA UGC-NET or CSIR-NET JRF award letter and register for PhD within 3 years',
    selection_stages: '1. Qualify NTA UGC-NET / CSIR-NET JRF -> 2. Download JRF Award Letter -> 3. PhD Admission in Recognised University -> 4. University Nodal Officer Activation on UGC/CSIR Portal -> 5. Monthly DBT + 2-Yr SRF Upgrade Committee',
    pst_pet_skill_norms: 'Full-time PhD scholars cannot hold simultaneous salaried employment; annual progress report and 2-year external expert review required for JRF → SRF upgradation.',
    documents_checklist: '1. NTA UGC-NET / CSIR-NET JRF Award Letter & Scorecard\n2. PhD Registration / Joining Letter\n3. Master’s Degree Marksheet & Certificate\n4. Category/PwD Certificate (if applicable)\n5. Joining Report & Contingency Claim Vouchers',
    application_steps: '1. Qualify UGC-NET (Humanities/Commerce/Social Sciences) or CSIR-NET (Science/Life/Physical/Chem/Math) for JRF.\n2. Secure PhD admission at Utkal, Ravenshaw, Sambalpur, Berhampur, NIT Rourkela, NISER, or any UGC university.\n3. Submit Joining Report via University Fellowship Cell for monthly DBT.',
    official_portal_url: 'https://ugcnet.nta.ac.in/',
    summary_en: 'Complete UGC-NET & CSIR-NET JRF (₹37,000/mo + HRA) to SRF (₹42,000/mo + HRA) fellowship guide covering age limit relaxations, PhD activation window, contingency grant, and HRA rules.',
    summary_or: 'UGC-NET ଓ CSIR-NET JRF (ମାସିକ ₹୩୭,୦୦୦ + HRA) ଏବଂ SRF (₹୪୨,୦୦୦ + HRA): PhD ଗବେଷଣା ଫେଲୋସିପ୍, ବୟସ ସୀମା ଛାଡ଼, ଯୋଗଦାନ ପ୍ରକ୍ରିୟା ଏବଂ କଣ୍ଟିଜେନ୍ସି ଅନୁଦାନ ଗାଇଡ୍।',
    body_html: '<h3>Revised JRF & SRF Fellowship Rates</h3><p>Following the DST/UGC revision, <strong>JRF scholars receive ₹37,000/month</strong> for the first two years and <strong>₹42,000/month upon SRF upgradation</strong> (Years 3–5), plus 9%–27% city HRA (e.g., 18% in Bhubaneswar/Cuttack/Rourkela) and annual contingency grants.</p>',
    body_or: '<h3>ସଂଶୋଧିତ JRF ଏବଂ SRF ଫେଲୋସିପ୍ ହାର</h3><p>UGC/CSIR JRF ଗବେଷକଙ୍କୁ ପ୍ରଥମ ଦୁଇ ବର୍ଷ ମାସିକ ₹୩୭,୦୦୦ ଏବଂ SRF କୁ ଉନ୍ନୀତ ହେଲା ପରେ ମାସିକ ₹୪୨,୦୦୦ ସହିତ HRA ଏବଂ ବାର୍ଷିକ ଗବେଷଣା ଖର୍ଚ୍ଚ (Contingency) ପ୍ରଦାନ କରାଯାଏ।</p>',
    tags: ['UGC NET JRF', 'CSIR NET JRF', 'PhD Fellowship', 'SRF']
  },
  {
    id: 'ji-ss-nmms-pmst-nrts',
    folderKey: 'scholarships by education level',
    fallbackFolder: 'jf-ss-odisha-merit',
    slug: 'odisha-nmms-pmst-nrts-school-scholarships',
    title: 'School Talent & Means-Cum-Merit Scholarships in Odisha: NMMS (Class 8 — ₹12,000/yr), Pathani Samanta Mathematics Talent Scholarship (PMST) & NRTS',
    title_or: 'ଓଡ଼ିଶା ବିଦ୍ୟାଳୟ ମେଧା ଛାତ୍ରବୃତ୍ତି: NMMS (୮ମ ଶ୍ରେଣୀ — ₹୧୨,୦୦୦/ବର୍ଷ), ପଠାଣି ସାମନ୍ତ ଗଣିତ ମେଧା (PMST) ଏବଂ NRTS',
    conducting_body: 'SCERT Odisha & BSE Odisha / Ministry of Education',
    exam_code: 'ODISHA-NMMS-PMST-NRTS',
    cadre_group: 'School Students (Class 6–12 in Govt / Aided / Odia Medium Schools)',
    pay_matrix: 'NMMS: ₹12,000/yr (Class 9–12) | PMST: ₹200–₹500/mo | NRTS: ₹250/mo (Class 9–10)',
    age_limit_relaxation: 'Class 8 (NMMS), Class 6/9/11 (PMST), Class 9 (NRTS) regular students in Govt/Aided Odisha schools',
    qualification_odia_rule: 'NMMS: Class 7 ≥55% (50% SC/ST) + Family Income ≤ ₹3.5 Lakh | PMST: High Maths marks in Class 5/8/10 | NRTS: Top rural block students via BSE Odisha Class 9 test',
    selection_stages: '1. Online School-Level Registration (scertodisha.nic.in / bseodisha.ac.in) -> 2. Written MAT/SAT or Maths/Scholarship Exam -> 3. District Merit Selection -> 4. NSP (NMMS) or State Portal DBT',
    pst_pet_skill_norms: 'NMMS requires Fresh & Renewal application on NSP (scholarships.gov.in) every year from Class 9 to 12 with ≥60% in Class 10 board.',
    documents_checklist: '1. Aadhaar Card & School Headmaster Certification\n2. Tehsildar Income Certificate (≤ ₹3.5 Lakh for NMMS)\n3. Caste Certificate (SC/ST/SEBC if applicable)\n4. Class 7/8/10 Marksheet & Aadhaar-Seeded Student/Joint Bank Passbook',
    application_steps: '1. Apply through School Headmaster on scertodisha.nic.in (NMMS) or bseodisha.ac.in (PMST/NRTS).\n2. Appear for district examination.\n3. Selected NMMS scholars MUST register on NSP (scholarships.gov.in) with OTR to receive ₹12,000/yr.',
    official_portal_url: 'https://scertodisha.nic.in/',
    summary_en: 'Complete Odisha school scholarship guide covering NMMS (₹12,000/yr from Class 9–12), Pathani Samanta Mathematics Talent Scholarship (PMST), and NRTS exam pattern & NSP renewal.',
    summary_or: 'ଓଡ଼ିଶା ବିଦ୍ୟାଳୟ ଛାତ୍ରବୃତ୍ତି: NMMS (ବାର୍ଷିକ ₹୧୨,୦୦୦), ପଠାଣି ସାମନ୍ତ ଗଣିତ ମେଧା ବୃତ୍ତି (PMST) ଏବଂ NRTS ପରୀକ୍ଷା, ଯୋଗ୍ୟତା ଏବଂ NSP ନବୀକରଣ ସୂଚନା।',
    body_html: '<h3>Three Pillars of Odisha School Merit Awards</h3><ul><li><strong>NMMS Odisha:</strong> Conducted by SCERT Odisha (MAT + SAT); ₹1,000/month (₹12,000/yr) from Class 9 to 12 via NSP.</li><li><strong>PMST (Pathani Samanta):</strong> Recognises Mathematics talent across Junior (Class 6–7), Senior (Class 8–10), and +2 levels in Odia medium/Govt schools.</li><li><strong>NRTS (National Rural Talent Scholarship):</strong> Conducted by BSE Odisha for Class 9 rural students.</li></ul>',
    body_or: '<h3>ଓଡ଼ିଶାର ପ୍ରମୁଖ ବିଦ୍ୟାଳୟ ମେଧା ବୃତ୍ତି</h3><p>SCERT ଓଡ଼ିଶା ଦ୍ୱାରା NMMS (ବାର୍ଷିକ ₹୧୨,୦୦୦) ଏବଂ BSE ଓଡ଼ିଶା ଦ୍ୱାରା ପଠାଣି ସାମନ୍ତ ଗଣିତ ମେଧା ବୃତ୍ତି (PMST) ଓ ଗ୍ରାମୀଣ ମେଧା ବୃତ୍ତି (NRTS) ପରିଚାଳିତ ହୁଏ।</p>',
    tags: ['NMMS Odisha', 'PMST', 'NRTS', 'School Scholarship']
  },
  {
    id: 'ji-ss-pm-vidyalaxmi-kssy',
    folderKey: 'vidya lakshmi & odisha student credit cards',
    fallbackFolder: 'jf-ss-vidya-lakshmi',
    slug: 'pm-vidyalaxmi-odisha-kssy-education-loan-guide',
    title: 'PM-Vidyalaxmi Scheme, Odisha Kalinga Sikhya Sathi Yojana (KSSY 1% Interest Subvention) & Collateral-Free Education Loans',
    title_or: 'PM-ବିଦ୍ୟାଲକ୍ଷ୍ମୀ ଯୋଜନା, ଓଡ଼ିଶା କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ ଯୋଜନା (KSSY ୧% ସୁଧ) ଏବଂ ବିନା ବନ୍ଧକ ଶିକ୍ଷା ଋଣ ଗାଇଡ୍',
    conducting_body: 'Dept of Higher Education (Govt of India) & Higher Education Dept, Govt of Odisha',
    exam_code: 'VIDYALAXMI-KSSY',
    cadre_group: 'Undergraduate, Postgraduate, Technical & Professional Degree Students',
    pay_matrix: 'PM-Vidyalaxmi: Up to ₹7.5L–₹10L+ Collateral-Free + 3% Subvention | KSSY Odisha: Loans up to ₹10 Lakh at 1% Effective Interest',
    age_limit_relaxation: 'Odisha Domicile (for KSSY); Admitted to QHEI (Top 860 NIRF/NAAC institutions) for PM-Vidyalaxmi',
    qualification_odia_rule: 'PM-Vidyalaxmi: Family Income ≤ ₹8 Lakh for 3% interest subvention (≤ ₹4.5L full CSIS subvention) | KSSY Odisha: Annual Family Income ≤ ₹6,00,000 for 1% effective interest loan up to ₹10 Lakh',
    selection_stages: '1. Admission Offer Letter -> 2. Online Application on pmvidyalaxmi.co.in / State Bank Portal -> 3. Bank Credit Sanction (Collateral-Free up to ₹7.5L under CGFSEL) -> 4. Moratorium Period (Course + 1 Yr) -> 5. Govt Interest Subvention Claim',
    pst_pet_skill_norms: 'Moratorium covers full course duration + 1 year; interest subvention applies strictly to regular students without default.',
    documents_checklist: '1. College Admission Letter & Fee Schedule\n2. Aadhaar, PAN & Odisha Resident Certificate\n3. Tehsildar Annual Family Income Certificate\n4. Co-borrower (Parent) KYC & Income Proof\n5. Class 10, 12 & Entrance Rank Card (JEE/OJEE/NEET/CAT)',
    application_steps: '1. Register on pmvidyalaxmi.co.in (or apply for KSSY via Odisha State Scholarship / partner banks).\n2. Select up to 3 partner banks (SBI, UCO, Bank of Baroda, Canara, etc.) and upload fee schedule.\n3. Track sanction and interest subvention credit.',
    official_portal_url: 'https://pmvidyalaxmi.co.in/',
    summary_en: 'Complete guide to PM-Vidyalaxmi collateral-free QHEI education loans (3% interest subvention) and Odisha Kalinga Sikhya Sathi Yojana (KSSY 1% effective interest up to ₹10 Lakh).',
    summary_or: 'PM-ବିଦ୍ୟାଲକ୍ଷ୍ମୀ ଯୋଜନା (ବିନା ବନ୍ଧକ ଋଣ ଓ ୩% ସୁଧ ରିହାତି) ଏବଂ ଓଡ଼ିଶା କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ ଯୋଜନା (KSSY ୧% ସୁଧ ହାରରେ ₹୧୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ଋଣ) ର ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍।',
    body_html: '<h3>Dual Shield for Higher Education Financing</h3><ul><li><strong>PM-Vidyalaxmi Scheme:</strong> Provides collateral-free, guarantor-free loans to students admitted to Quality Higher Education Institutions (QHEIs), with 75% credit guarantee up to ₹7.5 Lakh and 3% interest subvention for families earning up to ₹8 Lakh.</li><li><strong>Odisha Kalinga Sikhya Sathi Yojana (KSSY):</strong> Ensures Odisha students from families earning ≤ ₹6 Lakh pay only <strong>1% effective interest</strong> on education loans up to ₹10 Lakh.</li></ul>',
    body_or: '<h3>ଉଚ୍ଚଶିକ୍ଷା ପାଇଁ ଦୁଇଟି ପ୍ରମୁଖ ଋଣ ଯୋଜନା</h3><p>PM-ବିଦ୍ୟାଲକ୍ଷ୍ମୀ ଯୋଜନାରେ ବିନା ବନ୍ଧକରେ ଶିକ୍ଷା ଋଣ ଓ ୩% ସୁଧ ରିହାତି ମିଳୁଥିବା ବେଳେ, ଓଡ଼ିଶାର କଳିଙ୍ଗ ଶିକ୍ଷା ସାଥୀ ଯୋଜନା (KSSY) ରେ ₹୧୦ ଲକ୍ଷ ପର୍ଯ୍ୟନ୍ତ ଋଣ ମାତ୍ର ୧% ସୁଧରେ ମିଳିଥାଏ।</p>',
    tags: ['PM-Vidyalaxmi', 'KSSY Odisha', 'Education Loan', '1% Interest Subvention']
  }
];

export async function enrichScholarshipsCategory05(db, now) {
  if (!db) return { foldersUpdated: 0, itemsUpserted: 0 };
  const ts = now || new Date().toISOString();

  const foldersRes = await db
    .prepare("SELECT * FROM jobs_directory_folders WHERE domain_slug IN ('scholarships-support', 'scholarships-financial-support') ORDER BY depth ASC, sort_order ASC, title ASC")
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
    const spec = CAT05_FOLDER_ENRICHMENTS[key] || buildSmartScholarshipFolderEnrichment(f, parent ? parent.title : '');

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
    const nextSeoTitle = needsSeoTitle ? `${f.title} (${nextBadge}) — CSOdisha Scholarships` : f.seo_title;
    const nextSeoDesc = needsSeoDesc ? nextDescEn.slice(0, 300) : f.seo_description;
    const nextVerifiedAt = f.verified_at || ts;

    folderStmts.push(
      db.prepare(`UPDATE jobs_directory_folders
        SET description = ?, description_en = ?, description_or = ?, title_or = ?,
            hero_badge = ?, featured_badge = ?, seo_title = ?, seo_description = ?,
            verified_at = ?, updated_by = 'cat05-enrich', updated_at = ?
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

  const existingItemsRes = await db
    .prepare("SELECT id, slug, updated_by FROM jobs_directory_items WHERE domain_slug IN ('scholarships-support', 'scholarships-financial-support')")
    .all();
  const existingById = new Map((existingItemsRes.results || []).map((r) => [r.id, r]));
  const existingBySlug = new Map((existingItemsRes.results || []).map((r) => [r.slug, r]));

  const itemStmts = [];
  for (const item of CAT05_HANDBOOKS) {
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
    const seoTitle = `${item.title} | CSOdisha Scholarships`.slice(0, 160);
    const seoDesc = item.summary_en.slice(0, 300);

    if (existing) {
      itemStmts.push(
        db.prepare(`UPDATE jobs_directory_items
          SET folder_id = ?, title = ?, title_or = ?, item_type = 'scholarship',
              recruiting_body = ?, conducting_body = ?, exam_code = ?, cadre_group = ?,
              pay_matrix = ?, age_limit_relaxation = ?, qualification_odia_rule = ?,
              selection_stages = ?, pst_pet_skill_norms = ?, documents_checklist = ?,
              application_steps = ?, qualification_tag = ?,
              official_apply_url = ?, official_portal_url = ?,
              tags_json = ?, language = 'EN+OR', status = 'published', featured = 1,
              summary = ?, body_html = ?, seo_title = ?, seo_description = ?,
              verified_by = 'cat05-enrich@csodisha.com', verified_at = ?,
              updated_by = 'cat05-enrich', updated_at = ?
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
          VALUES (?, 'scholarships-support', ?, ?, ?, ?, 'scholarship', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, 'EN+OR', 'published', 1, ?, ?, ?, ?, 'cat05-enrich@csodisha.com', ?, 'Odisha', 'cat05-enrich', 'cat05-enrich', ?, ?)`)
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
