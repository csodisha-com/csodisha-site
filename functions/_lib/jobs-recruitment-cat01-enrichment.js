// Category #01 (v68): Exhaustive Minute Bilingual Enrichment of Jobs & Recruitment (137 Subcategories + 18 Recruitment Handbooks)
// Idempotent D1 enrichment routine invoked by ensureJobsDirectoryStudioSchema(db).

const SYSTEM_AUTHORS = new Set(['seed', 'legacy-bridge', 'system', 'cat01-enrich', '']);

function isGenericOrShort(val) {
  const s = String(val || '').trim();
  return s.length < 140;
}

function isCustomAdminEdit(row) {
  const updater = String(row?.updated_by || '').trim().toLowerCase();
  if (!updater || SYSTEM_AUTHORS.has(updater)) return false;
  return !isGenericOrShort(row?.description_en || row?.description) && !isGenericOrShort(row?.description_or);
}

// Tailored bilingual metadata for all 137 categories (depth 1 -> 2 -> 3) in Category #01 (Jobs & Recruitment)
// Keyed by normalized lowercase title so it matches both legacy-bridged 137 nodes and seeded folders.
const CAT01_FOLDER_ENRICHMENTS = {
  'jobs & recruitment directory': {
    title_or: 'ନିଯୁକ୍ତି ଏବଂ କ୍ୟାରିଅର୍ ଡାଇରେକ୍ଟୋରୀ',
    badge: 'CAT #01',
    en: 'Master Odisha and National Jobs & Recruitment Directory covering OPSC, OSSC, OSSSC, OPRB, OSEPA/OAVS, High Court of Orissa, UPSC, SSC, RRB, IBPS/SBI, Defence Agniveer, State & Central PSUs, apprenticeships, remote work, and verified notification lifecycle tracking.',
    or: 'ଓଡ଼ିଶା ଏବଂ ଜାତୀୟ ନିଯୁକ୍ତି ଡାଇରେକ୍ଟୋରୀ: OPSC, OSSC, OSSSC, OPRB, OSEPA/OAVS, ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ, UPSC, SSC, RRB, IBPS/SBI, ପ୍ରତିରକ୍ଷା ଅଗ୍ନିବୀର, ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରୀୟ PSU ଏବଂ ପ୍ରଶିକ୍ଷଣ ନିଯୁକ୍ତିର ସମ୍ପୂର୍ଣ୍ଣ ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ବିବରଣୀ।'
  },
  'odisha government recruitment': {
    title_or: 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି',
    badge: 'STATE GOVT',
    en: 'Verified Odisha State Government recruitment directory spanning OPSC Group A/B services, OSSC Group B/C technical & graduate drives, OSSSC district-cadre posts, OPRB Police, OSEPA/OAVS school teachers, and High Court of Orissa notifications.',
    or: 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି: OPSC ଗ୍ରୁପ୍ A/B, OSSC ଗ୍ରୁପ୍ B/C, OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍, OPRB ଓଡ଼ିଶା ପୋଲିସ୍, OSEPA/OAVS ଶିକ୍ଷକ ଏବଂ ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟର ସମସ୍ତ ପ୍ରାମାଣିକ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି ଓ ଯୋଗ୍ୟତା ସୂଚନା।'
  },
  'central government & psu': {
    title_or: 'କେନ୍ଦ୍ର ସରକାର ଏବଂ ପିଏସୟୁ ନିଯୁକ୍ତି',
    badge: 'CENTRAL & PSU',
    en: 'Comprehensive Central Government and Public Sector Undertaking recruitment guide for Odisha aspirants covering UPSC CSE/NDA/CDS, SSC Eastern Region, RRB East Coast Railway, Defence Agniveer, and Odisha-based PSUs like NALCO, MCL, SAIL Rourkela, and HAL.',
    or: 'କେନ୍ଦ୍ର ସରକାର ଏବଂ PSU ନିଯୁକ୍ତି: UPSC, SSC (ପୂର୍ବାଞ୍ଚଳ), RRB (ପୂର୍ବତଟ ରେଳପଥ), ପ୍ରତିରକ୍ଷା ଅଗ୍ନିବୀର ଏବଂ ଓଡ଼ିଶାର NALCO, MCL, SAIL ରାଉରକେଲା, HAL ସୁନାବେଡ଼ା ଓ ପାରାଦୀପ ବନ୍ଦର ନିଯୁକ୍ତି ସୂଚନା।'
  },
  'banking, it & private sector': {
    title_or: 'ବ୍ୟାଙ୍କିଂ, ଆଇଟି ଏବଂ ବେସରକାରୀ କ୍ଷେତ୍ର',
    badge: 'BANKING & IT',
    en: 'Public and private sector banking, insurance, IT, and industrial corridor opportunities for Odisha graduates including IBPS PO/Clerk/RRB, SBI, RBI, Odisha Gramya Bank, Bhubaneswar InfoCity/InfoValley tech parks, and Kalinga Nagar manufacturing.',
    or: 'ବ୍ୟାଙ୍କିଂ, ଆଇଟି ଏବଂ ବେସରକାରୀ କ୍ଷେତ୍ର: IBPS PO/Clerk/RRB, SBI, RBI, ଓଡ଼ିଶା ଗ୍ରାମ୍ୟ ବ୍ୟାଙ୍କ, ଭୁବନେଶ୍ୱର IT ପାର୍କ ଏବଂ କଳିଙ୍ଗନଗର ଶିଳ୍ପାଞ୍ଚଳରେ ସ୍ନାତକ ଓ ବୈଷୟିକ ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ ନିଯୁକ୍ତି ସୂଚନା।'
  },
  'opsc (odisha public service commission)': {
    title_or: 'ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ (OPSC)',
    badge: 'OPSC',
    en: 'Official OPSC Group-A and Group-B recruitment hub covering Odisha Civil Services (OAS, OFS, OPS, ORS), Assistant Professor, OES, PGT, Medical Officer, Dental Surgeon, AEE, ASO, and Odisha Judicial Service with OTR and ORSP pay matrix details.',
    or: 'ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ (OPSC): OAS/OFS/OPS ସିଭିଲ୍ ସର୍ଭିସ୍, ସହକାରୀ ପ୍ରଫେସର, OES, ମେଡିକାଲ୍ ଅଫିସର, AEE, ASO ଏବଂ OJS ପରୀକ୍ଷାର ସମ୍ପୂର୍ଣ୍ଣ ଯୋଗ୍ୟତା, ORSP ବେତନ ଏବଂ ଆବେଦନ ପ୍ରଣାଳୀ।'
  },
  'ossc & osssc district cadre': {
    title_or: 'OSSC ଏବଂ OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍',
    badge: 'OSSC / OSSSC',
    en: 'Combined OSSC State-Cadre and OSSSC District-Cadre recruitment guide covering CGLRE, CTSRE Junior Engineer, 10+2 Specialist Posts, RI, ARI, Amin, ICDS Supervisor, SFS, Forest Guard, Forester, Livestock Inspector, and Nursing Officer.',
    or: 'OSSC ଏବଂ OSSSC ନିଯୁକ୍ତି: OSSC CGLRE, CTSRE ଜୁନିଅର ଇଞ୍ଜିନିୟର, +2 ସ୍ପେଶାଲିଷ୍ଟ, OSSSC RI, ARI, ଅମିନ, ICDS ସୁପରଭାଇଜର, ଫରେଷ୍ଟ ଗାର୍ଡ, ନର୍ସିଂ ଅଫିସର ଏବଂ ଫାର୍ମାସିଷ୍ଟ ପଦବୀର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'odisha police & school teaching': {
    title_or: 'ଓଡ଼ିଶା ପୋଲିସ୍ ଏବଂ ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ ନିଯୁକ୍ତି',
    badge: 'POLICE & TEACH',
    en: 'Dedicated recruitment hub for OPRB Odisha Police Sub-Inspector, Sergeant, Station Officer (Fire Service), Battalion Constable/Sepoy, and OSEPA/SSD/OAVS LTR High School Teacher, TGT, PGT, and Junior Teacher Schematic drives.',
    or: 'ଓଡ଼ିଶା ପୋଲିସ୍ ଏବଂ ଶିକ୍ଷକ ନିଯୁକ୍ତି: OPRB ପୋଲିସ୍ SI, ସର୍ଜେଣ୍ଟ, କନେଷ୍ଟବଳ, ସିପାହୀ, ଫାୟାର ସର୍ଭିସ୍ ଏବଂ OSEPA/SSD/OAVS LTR ଶିକ୍ଷକ, TGT, PGT ଓ ଜୁନିଅର ଟିଚର ନିଯୁକ୍ତି ମାର୍ଗଦର୍ଶିକା।'
  },
  'odisha civil services (oas / ofs)': {
    title_or: 'ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସ୍ (OAS / OFS)',
    badge: 'OPSC OCS',
    en: 'Complete OPSC Odisha Civil Services Examination handbook covering OAS, OFS, OPS, ORS, OCoS, and OWS Group-A/B cadres, Prelims GS & CSAT, Mains 9-paper structure, Odia language qualifying paper, Personality Test, and ORSP Level-12 pay.',
    or: 'ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସ୍ (OPSC OCS): OAS, OFS, OPS, ORS, OCoS ଓ OWS ପଦବୀ ପାଇଁ ପ୍ରିଲିମ୍ସ, ମେନ୍ସ, ଓଡ଼ିଆ ଭାଷା ଯୋଗ୍ୟତା, ଇଣ୍ଟରଭ୍ୟୁ, ବୟସ ସୀମା ଏବଂ ORSP ଲେଭେଲ୍-୧୨ ବେତନର ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ।'
  },
  'ri, ari, amin & sfs combined': {
    title_or: 'ଆରଆଇ, ଏଆରଆଇ, ଅମିନ ଏବଂ ଏସଏଫଏସ',
    badge: 'OSSSC CRE',
    en: 'OSSSC Combined Recruitment Examination (CRE) guide for Revenue Inspector, Assistant Revenue Inspector, Amin, ICDS Supervisor, and Statistical Field Surveyor across all 30 Odisha districts with Prelims/Mains CBT and Computer Skill Test norms.',
    or: 'OSSSC ମିଳିତ ନିଯୁକ୍ତି (RI, ARI, ଅମିନ, ICDS ସୁପରଭାଇଜର, SFS): ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲା ପାଇଁ ପ୍ରିଲିମ୍ସ, ମେନ୍ସ CBT ପରୀକ୍ଷା, କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା ଏବଂ ଜିଲ୍ଲା କ୍ୟାଡର୍ ବେତନ ବିବରଣୀ।'
  },
  'odisha psus (nalco, mcl, sail, ntpc)': {
    title_or: 'ଓଡ଼ିଶା ପିଏସୟୁ (NALCO, MCL, SAIL, NTPC)',
    badge: 'ODISHA PSUs',
    en: 'Recruitment handbook for Maharatna, Navratna, and Odisha State PSUs operating in Odisha including NALCO, MCL, SAIL Rourkela Steel Plant, HAL Sunabeda, NTPC Talcher/Kaniha, OMC, OHPC, OPTCL, GRIDCO, and Paradip Port Authority.',
    or: 'ଓଡ଼ିଶା PSU ନିଯୁକ୍ତି: NALCO, MCL, SAIL ରାଉରକେଲା, HAL ସୁନାବେଡ଼ା, NTPC, OMC, OHPC, OPTCL, GRIDCO ଏବଂ ପାରାଦୀପ ବନ୍ଦରରେ GET, ଡିପ୍ଲୋମା ଟ୍ରେନି, ITI ଆପ୍ରେଣ୍ଟିସ୍ ଏବଂ ଅଧିକାରୀ ନିଯୁକ୍ତି ସୂଚନା।'
  },
  'ssc & east coast railway (ecor)': {
    title_or: 'SSC ଏବଂ ପୂର୍ବତଟ ରେଳପଥ (ECoR)',
    badge: 'SSC & RRB',
    en: 'Central recruitment guide for SSC CGL, CHSL, MTS, GD Constable, and JE (Eastern Region Odisha centres) alongside RRB Bhubaneswar NTPC, Group D Level-1, ALP, Technician, and JE under East Coast Railway (Khordha Road, Sambalpur, Waltair).',
    or: 'SSC ଏବଂ ପୂର୍ବତଟ ରେଳପଥ (ECoR): SSC CGL, CHSL, MTS, GD ଓ JE (ଓଡ଼ିଶା ପରୀକ୍ଷା କେନ୍ଦ୍ର) ଏବଂ RRB ଭୁବନେଶ୍ୱର NTPC, ଗ୍ରୁପ୍-D, ALP, ଟେକ୍ନିସିଆନ୍ ଓ JE ନିଯୁକ୍ତିର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  // 1.1 National-Level Government Jobs & Recruitment
  'national-level government jobs & recruitment': {
    title_or: 'ଜାତୀୟ ସ୍ତରୀୟ ସରକାରୀ ନିଯୁକ୍ତି',
    badge: 'NATIONAL GOVT',
    en: 'Central Government recruitment across UPSC, SSC, IBPS/SBI/RBI, Indian Railways, Armed Forces, CAPF, Central Ministries, Scientific Organisations (ISRO/DRDO), KVS/NVS, AIIMS/ESIC, and Supreme Court/Parliament services with Odisha exam centres.',
    or: 'ଜାତୀୟ ସ୍ତରୀୟ ସରକାରୀ ନିଯୁକ୍ତି: UPSC, SSC, ବ୍ୟାଙ୍କିଂ, ରେଳପଥ, ପ୍ରତିରକ୍ଷା, CAPF, କେନ୍ଦ୍ରୀୟ ମନ୍ତ୍ରଣାଳୟ, ISRO/DRDO, KVS/NVS ଏବଂ AIIMS/ESIC ନିଯୁକ୍ତିର ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'civil services and administration': {
    title_or: 'ସିଭିଲ୍ ସର୍ଭିସ୍ ଏବଂ ପ୍ରଶାସନ',
    badge: 'UPSC CSE',
    en: 'UPSC Civil Services Examination (IAS, IPS, IFS, IAAS, IRS), Indian Forest Service (IFoS), and Central Secretariat administration tracks with Odia Literature optional guidance, Prelims/Mains pattern, and 7th CPC Level-10 pay details.',
    or: 'ସିଭିଲ୍ ସର୍ଭିସ୍ ଏବଂ ପ୍ରଶାସନ (UPSC): IAS, IPS, IFS, IRS ଏବଂ IFoS ପରୀକ୍ଷା ପାଇଁ ଯୋଗ୍ୟତା, ଓଡ଼ିଆ ସାହିତ୍ୟ ଅପ୍ସନାଲ୍, ପ୍ରିଲିମ୍ସ/ମେନ୍ସ ଢାଞ୍ଚା ଏବଂ ସପ୍ତମ ବେତନ କମିଶନ ସ୍ତର-୧୦ ବେତନ ବିବରଣୀ।'
  },
  'staff selection commission (ssc)': {
    title_or: 'ଷ୍ଟାଫ୍ ସିଲେକ୍ସନ୍ କମିଶନ୍ (SSC)',
    badge: 'SSC ER',
    en: 'SSC Eastern Region recruitment for CGL, CHSL, MTS, Havaldar, Selection Posts, CPO Sub-Inspector, GD Constable, and Junior Engineer with Bhubaneswar, Cuttack, Sambalpur, Berhampur, Balasore, and Rourkela CBT centres.',
    or: 'ଷ୍ଟାଫ୍ ସିଲେକ୍ସନ୍ କମିଶନ୍ (SSC): CGL, CHSL, MTS, CPO SI, GD କନେଷ୍ଟବଳ ଏବଂ JE ନିଯୁକ୍ତି; ଓଡ଼ିଶାର ଭୁବନେଶ୍ୱର, କଟକ, ସମ୍ବଲପୁର, ବ୍ରହ୍ମପୁର, ବାଲେଶ୍ୱର ଓ ରାଉରକେଲା ପରୀକ୍ଷା କେନ୍ଦ୍ର ସୂଚନା।'
  },
  'banking, finance and insurance': {
    title_or: 'ବ୍ୟାଙ୍କିଂ, ଅର୍ଥ ଏବଂ ବୀମା ନିଯୁକ୍ତି',
    badge: 'IBPS / SBI / RBI',
    en: 'Public sector banking and insurance recruitment covering IBPS PO/Clerk/SO/RRB, SBI PO/Clerk, RBI Grade B/Assistant, LIC AAO/ADO, NIACL, and NABARD with Odia Local Language Proficiency Test (LPT) norms for Odisha circles.',
    or: 'ବ୍ୟାଙ୍କିଂ, ଅର୍ଥ ଏବଂ ବୀମା: IBPS PO/Clerk/RRB, SBI, RBI ଗ୍ରେଡ୍-B/ଆସିଷ୍ଟାଣ୍ଟ, LIC ଓ NABARD ନିଯୁକ୍ତି ଏବଂ ଓଡ଼ିଶା ସର୍କଲ୍ ପାଇଁ ଓଡ଼ିଆ ସ୍ଥାନୀୟ ଭାଷା ଦକ୍ଷତା ପରୀକ୍ଷା (LPT) ନିୟମାବଳୀ।'
  },
  'indian railways': {
    title_or: 'ଭାରତୀୟ ରେଳପଥ (RRB / RRC)',
    badge: 'RAILWAYS',
    en: 'Railway Recruitment Board (RRB Bhubaneswar & Bilaspur) and RRC East Coast Railway drives for NTPC Graduate/Undergraduate, Group D Level-1, ALP, Technician, Junior Engineer, and RPF SI/Constable with CBT and medical standards.',
    or: 'ଭାରତୀୟ ରେଳପଥ (RRB ଭୁବନେଶ୍ୱର / ECoR): NTPC, ଗ୍ରୁପ୍-D ଲେଭେଲ୍-୧, ALP, ଟେକ୍ନିସିଆନ୍, ଜୁନିଅର ଇଞ୍ଜିନିୟର ଏବଂ RPF SI/କନେଷ୍ଟବଳ ନିଯୁକ୍ତିର CBT ପ୍ୟାଟର୍ଣ୍ଣ ଓ ଶାରୀରିକ ମାନଦଣ୍ଡ।'
  },
  'defence and armed forces': {
    title_or: 'ପ୍ରତିରକ୍ଷା ଏବଂ ସଶସ୍ତ୍ର ବାହିନୀ',
    badge: 'DEFENCE',
    en: 'Indian Army Agniveer (ARO Cuttack, Sambalpur, Gopalpur), Indian Navy Agniveer & SSR/MR (INS Chilka training), Indian Air Force Agniveer Vayu, NDA, CDS, AFCAT, and Indian Coast Guard (Paradip) officer and sailor entries.',
    or: 'ପ୍ରତିରକ୍ଷା ଏବଂ ସଶସ୍ତ୍ର ବାହିନୀ: ଭାରତୀୟ ସେନା ଅଗ୍ନିବୀର (ARO କଟକ, ସମ୍ବଲପୁର, ଗୋପାଳପୁର), ନୌସେନା (INS ଚିଲିକା), ବାୟୁସେନା, NDA, CDS, AFCAT ଏବଂ ତଟରକ୍ଷୀ ବାହିନୀ (ପାରାଦୀପ) ନିଯୁକ୍ତି।'
  },
  'central armed police forces and security': {
    title_or: 'କେନ୍ଦ୍ରୀୟ ସଶସ୍ତ୍ର ପୋଲିସ୍ ବାହିନୀ (CAPF)',
    badge: 'CAPF / CISF',
    en: 'UPSC CAPF Assistant Commandant, SSC CPO Sub-Inspector, and SSC GD Constable recruitment across BSF, CRPF, CISF, ITBP, SSB, and Assam Rifles including Odisha Naxal-affected & border district reservation quotas and PST/PET norms.',
    or: 'କେନ୍ଦ୍ରୀୟ ସଶସ୍ତ୍ର ପୋଲିସ୍ ବାହିନୀ (CAPF): BSF, CRPF, CISF, ITBP, SSB ଓ ଆସାମ ରାଇଫଲ୍ସରେ AC, SI ଏବଂ GD କନେଷ୍ଟବଳ ନିଯୁକ୍ତି; ଓଡ଼ିଶା ଜିଲ୍ଲା କୋଟା ଏବଂ PST/PET ମାନଦଣ୍ଡ।'
  },
  'central ministries and departments': {
    title_or: 'କେନ୍ଦ୍ରୀୟ ମନ୍ତ୍ରଣାଳୟ ଏବଂ ବିଭାଗ',
    badge: 'MINISTRIES',
    en: 'Direct and commission-based recruitment in Central Ministries, India Post GDS (Odisha Circle), Income Tax, Customs/CBIC, EPFO SSA/EO, ESIC, and Central Secretariat Service (CSS) with 7th CPC allowances and transfer rules.',
    or: 'କେନ୍ଦ୍ରୀୟ ମନ୍ତ୍ରଣାଳୟ ଓ ବିଭାଗ: ଭାରତୀୟ ଡାକ GDS (ଓଡ଼ିଶା ସର୍କଲ୍), ଆୟକର, କଷ୍ଟମ୍ସ, EPFO, ESIC ଏବଂ କେନ୍ଦ୍ରୀୟ ସଚିବାଳୟ ସେବା (CSS) ନିଯୁକ୍ତିର ଯୋଗ୍ୟତା ଓ ବେତନ ବିବରଣୀ।'
  },
  'national scientific and technical organisations': {
    title_or: 'ଜାତୀୟ ବୈଜ୍ଞାନିକ ଏବଂ ବୈଷୟିକ ସଂସ୍ଥା',
    badge: 'ISRO / DRDO',
    en: 'Scientist/Engineer, Technical Assistant, and Technician-B recruitment across DRDO (ITR Chandipur & PXE Balasore), ISRO, BARC, CSIR-IMMT Bhubaneswar, IOP Bhubaneswar, NIC, and STPI for B.Tech, M.Sc, Diploma, and ITI holders.',
    or: 'ଜାତୀୟ ବୈଜ୍ଞାନିକ ଓ ବୈଷୟିକ ସଂସ୍ଥା: DRDO (ITR ଚାନ୍ଦିପୁର ଓ PXE ବାଲେଶ୍ୱର), ISRO, BARC, CSIR-IMMT ଭୁବନେଶ୍ୱର, IOP ଏବଂ NIC ରେ ବୈଜ୍ଞାନିକ, ଇଞ୍ଜିନିୟର ଓ ଟେକ୍ନିସିଆନ୍ ନିଯୁକ୍ତି।'
  },
  'central education and teaching recruitment': {
    title_or: 'କେନ୍ଦ୍ରୀୟ ଶିକ୍ଷା ଏବଂ ଶିକ୍ଷକ ନିଯୁକ୍ତି',
    badge: 'KVS / NVS',
    en: 'Central teaching and academic recruitment across Kendriya Vidyalaya Sangathan (KVS), Navodaya Vidyalaya Samiti (NVS), EMRS (NESTS), Central Universities (CUO Koraput), IIT Bhubaneswar, NIT Rourkela, and IISER Berhampur.',
    or: 'କେନ୍ଦ୍ରୀୟ ଶିକ୍ଷା ନିଯୁକ୍ତି: KVS, NVS, EMRS ଏକଲବ୍ୟ ବିଦ୍ୟାଳୟ, କେନ୍ଦ୍ରୀୟ ବିଶ୍ୱବିଦ୍ୟାଳୟ କୋରାପୁଟ, IIT ଭୁବନେଶ୍ୱର, NIT ରାଉରକେଲା ଏବଂ IISER ବ୍ରହ୍ମପୁରରେ PRT/TGT/PGT ଓ ଅଧ୍ୟାପକ ପଦବୀ।'
  },
  'healthcare and medical recruitment': {
    title_or: 'ଜାତୀୟ ସ୍ୱାସ୍ଥ୍ୟ ଏବଂ ଚିକିତ୍ସା ନିଯୁକ୍ତି',
    badge: 'AIIMS / ESIC',
    en: 'Central healthcare recruitment covering AIIMS Bhubaneswar, NORCET Nursing Officer, ESIC Hospitals (Rourkela/Bhubaneswar), ICMR-RMRC Bhubaneswar, NISER Health Centre, and Railway Medical Services for doctors, nurses, and paramedics.',
    or: 'ଜାତୀୟ ସ୍ୱାସ୍ଥ୍ୟ ନିଯୁକ୍ତି: AIIMS ଭୁବନେଶ୍ୱର, NORCET ନର୍ସିଂ ଅଫିସର, ESIC ହସ୍ପିଟାଲ୍, ICMR-RMRC ଭୁବନେଶ୍ୱର ଏବଂ ରେଳବାଇ ସ୍ୱାସ୍ଥ୍ୟ ସେବାରେ ଡାକ୍ତର, ନର୍ସ ଓ ପାରାମେଡିକାଲ୍ ନିଯୁକ୍ତି।'
  },
  'law, courts and parliamentary services': {
    title_or: 'ଆଇନ, ନ୍ୟାୟାଳୟ ଏବଂ ସଂସଦୀୟ ସେବା',
    badge: 'COURTS & LAW',
    en: 'Supreme Court of India Junior Court Assistant, Law Clerk-cum-Research Associate, Lok Sabha/Rajya Sabha Secretariat, Central Administrative Tribunal (CAT Cuttack Bench), and SEBI/IBBI Legal Officer recruitments.',
    or: 'ଆଇନ, ନ୍ୟାୟାଳୟ ଏବଂ ସଂସଦୀୟ ସେବା: ସୁପ୍ରିମ୍ କୋର୍ଟ ଜୁନିଅର କୋର୍ଟ ଆସିଷ୍ଟାଣ୍ଟ, ଲ କ୍ଲର୍କ, ଲୋକସଭା/ରାଜ୍ୟସଭା ସଚିବାଳୟ, SEBI ଆଇନ ଅଧିକାରୀ ଏବଂ CAT କଟକ ବେଞ୍ଚ ନିଯୁକ୍ତି ସୂଚନା।'
  },
  'other national recruitment': {
    title_or: 'ଅନ୍ୟାନ୍ୟ ଜାତୀୟ ନିଯୁକ୍ତି',
    badge: 'NATIONAL MISC',
    en: 'Specialized all-India public bodies including FCI, CWC, NAFED, FSSAI, BIS, AAI Airports Authority (Bhubaneswar/Jharsuguda), NHAI, and statutory regulatory authorities (SEBI, IRDAI, PFRDA, TRAI).',
    or: 'ଅନ୍ୟାନ୍ୟ ଜାତୀୟ ନିଯୁକ୍ତି: FCI, FSSAI, BIS, ଭାରତୀୟ ବିମାନବନ୍ଦର ପ୍ରାଧିକରଣ (ଭୁବନେଶ୍ୱର/ଝାରସୁଗୁଡ଼ା), NHAI ଏବଂ SEBI/IRDAI ନିୟାମକ ସଂସ୍ଥାର ନିଯୁକ୍ତି ବିବରଣୀ।'
  },
  // 1.2 Odisha State-Level Jobs & Recruitment
  'odisha state-level jobs & recruitment': {
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସ୍ତରୀୟ ନିଯୁକ୍ତି',
    badge: 'ODISHA STATE',
    en: 'Complete Odisha State Government recruitment architecture spanning OPSC, OSSC, OSSSC, OSEPA/OAVS, OPRB Police, Health & Family Welfare, Revenue & District Collectorates, High Court of Orissa, State PSUs, and ULB/PRI bodies.',
    or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ସ୍ତରୀୟ ନିଯୁକ୍ତି: OPSC, OSSC, OSSSC, OSEPA/OAVS, ଓଡ଼ିଶା ପୋଲିସ୍, ସ୍ୱାସ୍ଥ୍ୟ ବିଭାଗ, ରାଜସ୍ୱ ଓ ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟ, ଉଚ୍ଚ ନ୍ୟାୟାଳୟ ଏବଂ ରାଜ୍ୟ PSU ନିଯୁକ୍ତିର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।'
  },
  'odisha public service commission (opsc)': {
    title_or: 'ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ (OPSC)',
    badge: 'OPSC',
    en: 'OPSC Cuttack recruitment portal for Group-A and Group-B Gazetted & State Cadre posts: OCS (OAS/OFS/OPS/ORS), Assistant Professor, OES, Medical Officer, AEE, ASO, OJS, and SDIPRO with opsc.gov.in OTR workflow.',
    or: 'ଓଡ଼ିଶା ଲୋକ ସେବା ଆୟୋଗ (OPSC କଟକ): OAS/OFS/OPS ସିଭିଲ୍ ସର୍ଭିସ୍, ସହକାରୀ ପ୍ରଫେସର, ମେଡିକାଲ୍ ଅଫିସର, AEE, ASO ଏବଂ OJS ନିଯୁକ୍ତି; opsc.gov.in OTR ପଞ୍ଜୀକରଣ ଓ ପରୀକ୍ଷା ସୂଚନା।'
  },
  'odisha staff selection commission (ossc)': {
    title_or: 'ଓଡ଼ିଶା ଷ୍ଟାଫ୍ ସିଲେକ୍ସନ୍ କମିଶନ୍ (OSSC)',
    badge: 'OSSC',
    en: 'OSSC Bhubaneswar state-cadre Group-B and Group-C drives including CGLRE (Supplies Inspector, Auditor, JEO, Sub-Registrar), CTSRE (Junior Engineer, JMO), Combined 10+2 Specialist Posts, and Welfare Extension Officer via ossc.gov.in.',
    or: 'ଓଡ଼ିଶା ଷ୍ଟାଫ୍ ସିଲେକ୍ସନ୍ କମିଶନ୍ (OSSC ଭୁବନେଶ୍ୱର): CGLRE, CTSRE ଜୁନିଅର ଇଞ୍ଜିନିୟର, +2 ସ୍ପେଶାଲିଷ୍ଟ ପଦବୀ ଏବଂ WEO ନିଯୁକ୍ତିର ପ୍ରିଲିମ୍ସ, ମେନ୍ସ, କମ୍ପ୍ୟୁଟର ଦକ୍ଷତା ପରୀକ୍ଷା ଓ ଦରମା ବିବରଣୀ।'
  },
  'odisha sub-ordinate staff selection commission (osssc)': {
    title_or: 'ଓଡ଼ିଶା ସବ୍-ଅର୍ଡିନେଟ୍ ଷ୍ଟାଫ୍ ସିଲେକ୍ସନ୍ କମିଶନ୍ (OSSSC)',
    badge: 'OSSSC',
    en: 'OSSSC 30-district cadre Combined Recruitment Examinations for RI, ARI, Amin, ICDS Supervisor, SFS, Forest Guard, Forester, Livestock Inspector, Nursing Officer, Pharmacist, MPHW, and Excise Constable via osssc.gov.in.',
    or: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ ନିଯୁକ୍ତି: RI, ARI, ଅମିନ, ICDS ସୁପରଭାଇଜର, ଫରେଷ୍ଟ ଗାର୍ଡ, ଫରେଷ୍ଟର, LSI, ନର୍ସିଂ ଅଫିସର, ଫାର୍ମାସିଷ୍ଟ ଓ MPHW ପଦବୀ ପାଇଁ osssc.gov.in ଆବେଦନ ଓ ଚୟନ ପ୍ରକ୍ରିୟା।'
  },
  'odisha education recruitment': {
    title_or: 'ଓଡ଼ିଶା ଶିକ୍ଷା ଏବଂ ଶିକ୍ଷକ ନିଯୁକ୍ତି',
    badge: 'OSEPA / OAVS / SSB',
    en: 'Odisha school and higher education recruitment covering OSEPA LTR High School Teachers (TGT/Hindi/Sanskrit/PET), Junior Teacher (Schematic), OAVS Principal/PGT/TGT, SSD Dept Teachers, SSB Odisha Lecturers, and OPSC Assistant Professors.',
    or: 'ଓଡ଼ିଶା ଶିକ୍ଷା ନିଯୁକ୍ତି: OSEPA LTR ଶିକ୍ଷକ, ଜୁନିଅର ଟିଚର, OAVS ଆଦର୍ଶ ବିଦ୍ୟାଳୟ (PGT/TGT), SSD ବିଭାଗ ଶିକ୍ଷକ, SSB ଓଡ଼ିଶା ଅଧ୍ୟାପକ ଏବଂ OTET/OSSTET ଯୋଗ୍ୟତା ମାନଦଣ୍ଡ।'
  },
  'odisha police and state security': {
    title_or: 'ଓଡ଼ିଶା ପୋଲିସ୍ ଏବଂ ରାଜ୍ୟ ସୁରକ୍ଷା',
    badge: 'OPRB POLICE',
    en: 'Odisha Police Recruitment Board (OPRB) and State Selection Board drives for Sub-Inspector (SI), Sergeant, Station Officer (Fire Service), Battalion Constable, Sepoy, Home Guard, and Jail Warder with PST/PET standards.',
    or: 'ଓଡ଼ିଶା ପୋଲିସ୍ ଏବଂ ରାଜ୍ୟ ସୁରକ୍ଷା (OPRB): ପୋଲିସ୍ SI, ସର୍ଜେଣ୍ଟ, ଫାୟାର ସର୍ଭିସ୍ ଷ୍ଟେସନ୍ ଅଫିସର, ବାଟାଲିଅନ୍ କନେଷ୍ଟବଳ, ସିପାହୀ ଏବଂ ଜେଲ୍ ୱାର୍ଡର ନିଯୁକ୍ତିର ଲିଖିତ ଓ ଶାରୀରିକ ପରୀକ୍ଷା ସୂଚନା।'
  },
  'odisha health and medical services': {
    title_or: 'ଓଡ଼ିଶା ସ୍ୱାସ୍ଥ୍ୟ ଏବଂ ଚିକିତ୍ସା ସେବା',
    badge: 'HEALTH / NHM',
    en: 'Odisha Health & Family Welfare recruitment across OPSC Assistant Surgeon, Dental/Ayurvedic/Homoeopathic Medical Officer, OSSSC Nursing Officer, Pharmacist, Lab Technician, Radiographer, MPHW, and NHM Odisha contractual roles.',
    or: 'ଓଡ଼ିଶା ସ୍ୱାସ୍ଥ୍ୟ ଓ ଚିକିତ୍ସା ସେବା: OPSC ମେଡିକାଲ୍ ଅଫିସର, ଆୟୁର୍ବେଦିକ/ହୋମିଓପ୍ୟାଥିକ୍ ଡାକ୍ତର, OSSSC ନର୍ସିଂ ଅଫିସର, ଫାର୍ମାସିଷ୍ଟ, LT, MPHW ଏବଂ NHM ଓଡ଼ିଶା ଚୁକ୍ତିଭିତ୍ତିକ ନିଯୁକ୍ତି।'
  },
  'odisha revenue and district administration': {
    title_or: 'ଓଡ଼ିଶା ରାଜସ୍ୱ ଏବଂ ଜିଲ୍ଲା ପ୍ରଶାସନ',
    badge: 'REVENUE / DIST',
    en: 'District Collectorate, Tahasil, and Revenue & Disaster Management recruitment covering OSSSC RI, ARI, Amin, Gram Panchayat Technical Assistant, Jogana Sahayak, and District e-Governance / Aspirational Block Fellow posts.',
    or: 'ଓଡ଼ିଶା ରାଜସ୍ୱ ଓ ଜିଲ୍ଲା ପ୍ରଶାସନ: ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟ, ତହସିଲ୍, RI, ARI, ଅମିନ, ଯୋଗାଣ ସହାୟକ, GRS ଏବଂ ଜିଲ୍ଲାସ୍ତରୀୟ ପ୍ରକଳ୍ପ ନିଯୁକ୍ତିର ଯୋଗ୍ୟତା ଓ ଆବେଦନ ପ୍ରଣାଳୀ।'
  },
  'odisha judiciary and legal services': {
    title_or: 'ଓଡ଼ିଶା ନ୍ୟାୟପାଳିକା ଏବଂ ଆଇନ ସେବା',
    badge: 'HIGH COURT',
    en: 'High Court of Orissa (Cuttack) and District Judgeship recruitment for Odisha Judicial Service (Civil Judge Junior Division), ASO, Junior Stenographer, Junior Typist, DEO, Law Clerk, and Public Prosecutor / APP posts.',
    or: 'ଓଡ଼ିଶା ନ୍ୟାୟପାଳିକା: ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ (କଟକ) ଓ ଜିଲ୍ଲା କୋର୍ଟରେ OJS ସିଭିଲ୍ ଜଜ୍, ASO, ଜୁନିଅର ଷ୍ଟେନୋଗ୍ରାଫର, ଟାଇପିଷ୍ଟ, DEO ଏବଂ APP ନିଯୁକ୍ତିର ପରୀକ୍ଷା ଢାଞ୍ଚା ଓ ଦକ୍ଷତା ପରୀକ୍ଷା।'
  },
  'odisha departments and directorates': {
    title_or: 'ଓଡ଼ିଶା ସରକାରୀ ବିଭାଗ ଏବଂ ନିର୍ଦ୍ଦେଶାଳୟ',
    badge: 'DEPARTMENTS',
    en: 'Direct and departmental recruitment under Odisha Secretariat, Water Resources, Works, Rural Development, Agriculture, Fisheries, Handlooms, Panchayati Raj, and Women & Child Development directorates.',
    or: 'ଓଡ଼ିଶା ସରକାରୀ ବିଭାଗ ଓ ନିର୍ଦ୍ଦେଶାଳୟ: ଲୋକସେବା ଭବନ, ଜଳସମ୍ପଦ, ପୂର୍ତ୍ତ, ଗ୍ରାମ୍ୟ ଉନ୍ନୟନ, କୃଷି, ମତ୍ସ୍ୟ, ପଞ୍ଚାୟତିରାଜ ଏବଂ ମହିଳା ଓ ଶିଶୁ ବିକାଶ ବିଭାଗର ନିଯୁକ୍ତି ସୂଚନା।'
  },
  'odisha local bodies and field administration': {
    title_or: 'ଓଡ଼ିଶା ସ୍ଥାନୀୟ ସଂସ୍ଥା (ULB / PRI)',
    badge: 'ULB / PRI',
    en: 'Urban Local Bodies (BMC Bhubaneswar, CMC Cuttack, BeMC, RMC, SMC) and Panchayati Raj Institution recruitment for Junior Engineer, Sanitary Inspector, Community Organiser, Accountant, and Gram Rozgar Sevak (GRS).',
    or: 'ଓଡ଼ିଶା ସ୍ଥାନୀୟ ସଂସ୍ଥା (ପୌରପାଳିକା ଓ ପଞ୍ଚାୟତ): BMC, CMC, BeMC, RMC, SMC ଏବଂ ଗ୍ରାମ ପଞ୍ଚାୟତରେ ଜୁନିଅର ଇଞ୍ଜିନିୟର, ସାନିଟାରୀ ଇନ୍ସପେକ୍ଟର, GRS ଓ ଆକାଉଣ୍ଟାଣ୍ଟ ନିଯୁକ୍ତି।'
  },
  'odisha public-sector undertakings': {
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ପିଏସୟୁ (OMC / OPTCL / OHPC)',
    badge: 'STATE PSUs',
    en: 'Odisha State PSU recruitment across OMC (Odisha Mining Corporation), OPTCL, OHPC, GRIDCO, OPGC, IDCO, IPICOL, OSCSC, and Odisha State Cooperative Bank for Management Trainees, Junior Engineers, and Operators.',
    or: 'ଓଡ଼ିଶା ରାଜ୍ୟ PSU ନିଯୁକ୍ତି: OMC, OPTCL, OHPC, GRIDCO, OPGC, IDCO, OSCSC ଏବଂ ଓଡ଼ିଶା ରାଜ୍ୟ ସମବାୟ ବ୍ୟାଙ୍କରେ ମ୍ୟାନେଜମେଣ୍ଟ ଟ୍ରେନି, ଜୁନିଅର ଇଞ୍ଜିନିୟର ଓ ଟେକ୍ନିସିଆନ୍ ପଦବୀ।'
  },
  'odisha contractual and project-based jobs': {
    title_or: 'ଓଡ଼ିଶା ଚୁକ୍ତିଭିତ୍ତିକ ଏବଂ ପ୍ରକଳ୍ପ ନିଯୁକ୍ତି',
    badge: 'PROJECT JOBS',
    en: 'Odisha State contractual and scheme-based engagements under NHM, OLM (Odisha Livelihoods Mission), Mission Shakti, Samagra Shiksha, ORMAS, and District Mineral Foundation (DMF) across Keonjhar, Sundargarh, Angul, and Koraput.',
    or: 'ଓଡ଼ିଶା ଚୁକ୍ତିଭିତ୍ତିକ ଓ ପ୍ରକଳ୍ପ ନିଯୁକ୍ତି: NHM, OLM ଜୀବିକା ମିଶନ, ମିଶନ ଶକ୍ତି, ସମଗ୍ର ଶିକ୍ଷା, ORMAS ଏବଂ DMF (କେନ୍ଦୁଝର, ସୁନ୍ଦରଗଡ଼, ଅନୁଗୁଳ, କୋରାପୁଟ) ଅଧୀନରେ ପ୍ରକଳ୍ପ ନିଯୁକ୍ତି।'
  }
};

// Domain-aware bilingual generator for all remaining 137 subcategories (1.3 Other State, 1.4 Private, 1.5 PSUs, 1.6 Apprenticeships, 1.7 Contractual, 1.8 Remote, 1.9 Foreign, 1.10 Notification Lifecycle)
function buildSmartFolderEnrichment(folder, parentTitle) {
  const title = String(folder.title || '').trim();
  const slug = String(folder.slug || '').toLowerCase();
  const hay = `${title} ${parentTitle || ''} ${slug}`.toLowerCase();

  let badge = 'CAT #01';
  let en = '';
  let or = '';

  if (hay.includes('other state') || hay.startsWith('state ')) {
    badge = 'OTHER STATES';
    en = `Verified ${title} recruitment guide for Odisha and national candidates eligible for open-merit vacancies across neighbouring and Indian states, covering domicile rules, fee norms, and official state commission portals.`;
    or = `${title} ନିଯୁକ୍ତି ମାର୍ଗଦର୍ଶିକା: ଓଡ଼ିଶା ତଥା ଦେଶର ଅନ୍ୟାନ୍ୟ ରାଜ୍ୟର ସରକାରୀ ନିଯୁକ୍ତି, ସାଧାରଣ ବର୍ଗ ଯୋଗ୍ୟତା, ଡୋମିସାଇଲ୍ ନିୟମ ଏବଂ ସମ୍ପୃକ୍ତ ରାଜ୍ୟ କମିଶନଙ୍କ ସରକାରୀ ୱେବସାଇଟ୍ ସୂଚନା।`;
  } else if (hay.includes('private') || hay.includes('information technology') || hay.includes('corporate') || hay.includes('hospitality') || hay.includes('retail') || hay.includes('logistics') || hay.includes('agribusiness') || hay.includes('fresher') || hay.includes('managerial') || hay.includes('media') || hay.includes('construction') || hay.includes('legal, consulting')) {
    badge = 'PRIVATE SECTOR';
    en = `Curated ${title} hiring pathways across Bhubaneswar, Cuttack, Rourkela, Jharsuguda, and pan-India corporate hubs, detailing required skills, salary bands, campus/off-campus drives, and verified employer career portals.`;
    or = `${title} ବେସରକାରୀ ନିଯୁକ୍ତି: ଭୁବନେଶ୍ୱର, କଟକ, ରାଉରକେଲା, ଝାରସୁଗୁଡ଼ା ଏବଂ ଜାତୀୟ କର୍ପୋରେଟ୍ କ୍ଷେତ୍ରରେ ଯୋଗ୍ୟତା, ଦକ୍ଷତା, ଦରମା ଢାଞ୍ଚା ଏବଂ ପ୍ରାମାଣିକ କ୍ୟାରିୟର ପୋର୍ଟାଲ୍ ସୂଚନା।`;
  } else if (hay.includes('psu') || hay.includes('public-sector') || hay.includes('power') || hay.includes('mining') || hay.includes('oil, gas') || hay.includes('telecom') || hay.includes('ports') || hay.includes('graduate engineer')) {
    badge = 'PSU & CORE';
    en = `Public Sector Undertaking recruitment handbook for ${title}, covering GATE/non-GATE Graduate Engineer Trainee, Diploma Trainee, Management Trainee, and Trade Apprentice drives in Odisha plants and central units.`;
    or = `${title} PSU ନିଯୁକ୍ତି: GATE ଓ ନନ୍-GATE ଆଧାରିତ GET, ଡିପ୍ଲୋମା ଟ୍ରେନି, ମ୍ୟାନେଜମେଣ୍ଟ ଟ୍ରେନି ଏବଂ ଟ୍ରେଡ୍ ଆପ୍ରେଣ୍ଟିସ୍ ନିଯୁକ୍ତି; ଓଡ଼ିଶା ପ୍ଲାଣ୍ଟ ଓ କେନ୍ଦ୍ରୀୟ ୟୁନିଟ୍‌ର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  } else if (hay.includes('apprentice') || hay.includes('naps') || hay.includes('nats') || hay.includes('internship') || hay.includes('trainee') || hay.includes('work experience')) {
    badge = 'APPRENTICESHIP';
    en = `Structured ${title} directory covering NAPS (apprenticeshipindia.gov.in) and NATS (nats.education.gov.in) registration, monthly DBT stipend rules, ITI/Diploma/Graduate eligibility, and Odisha PSU training slots.`;
    or = `${title} ପ୍ରଶିକ୍ଷଣ ଓ ଇଣ୍ଟର୍ଣ୍ଣଶିପ୍: NAPS ଏବଂ NATS ପୋର୍ଟାଲ୍ ପଞ୍ଜୀକରଣ, ମାସିକ DBT ଷ୍ଟାଇପେଣ୍ଡ୍ ନିୟମ, ITI/ଡିପ୍ଲୋମା/ସ୍ନାତକ ଯୋଗ୍ୟତା ଏବଂ ଓଡ଼ିଶାର ପ୍ରମୁଖ ସଂସ୍ଥାରେ ତାଲିମ ସୁଯୋଗ।`;
  } else if (hay.includes('contractual') || hay.includes('fixed-term') || hay.includes('temporary') || hay.includes('daily-wage') || hay.includes('outsourced') || hay.includes('part-time') || hay.includes('disabilities') || hay.includes('veteran') || hay.includes('women-focused') || hay.includes('returning-to-work')) {
    badge = 'SPECIAL CADRE';
    en = `Dedicated ${title} employment guide covering Odisha & Central Government reservation norms, PwD/Ex-Servicemen/Women relaxations, outsourcing vendor verification, EPF/ESI statutory protections, and application portals.`;
    or = `${title} ସ୍ୱତନ୍ତ୍ର ନିଯୁକ୍ତି: ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ର ସରକାରଙ୍କ ସଂରକ୍ଷଣ ନିୟମ, ଭିନ୍ନକ୍ଷମ/ପୂର୍ବତନ ସୈନିକ/ମହିଳା କୋଟା, EPF/ESI ସୁରକ୍ଷା ଏବଂ ଆବେଦନ ପ୍ରକ୍ରିୟାର ପ୍ରାମାଣିକ ବିବରଣୀ।`;
  } else if (hay.includes('remote') || hay.includes('freelance') || hay.includes('translation') || hay.includes('tutoring') || hay.includes('programming') || hay.includes('graphic') || hay.includes('digital marketing') || hay.includes('virtual assistance') || hay.includes('data analysis') || hay.includes('creator')) {
    badge = 'REMOTE & DIGITAL';
    en = `Verified ${title} pathways for Odisha youth and professionals seeking location-independent income, detailing portfolio standards, Odia-English localisation demand, safe payment rails, and anti-scam guidelines.`;
    or = `${title} ରିମୋଟ୍ ଓ ଡିଜିଟାଲ୍ କାମ: ଓଡ଼ିଶାର ଯୁବପିଢ଼ିଙ୍କ ପାଇଁ ଘରେ ବସି ଆୟ, ପୋର୍ଟଫୋଲିଓ ପ୍ରସ୍ତୁତି, ଓଡ଼ିଆ-ଇଂରାଜୀ ଅନୁବାଦ, ସୁରକ୍ଷିତ ପେମେଣ୍ଟ ଏବଂ ଠକେଇରୁ ରକ୍ଷା ପାଇବାର ମାର୍ଗଦର୍ଶିକା।`;
  } else if (hay.includes('foreign') || hay.includes('overseas') || hay.includes('abroad') || hay.includes('multinational') || hay.includes('united nations') || hay.includes('work permits') || hay.includes('international')) {
    badge = 'OVERSEAS JOBS';
    en = `Verified ${title} guidance for Odisha candidates exploring global careers, highlighting MEA e-Migrate registered recruiting agents, work visa compliance, credential attestation, and anti-fraud helpline checks.`;
    or = `${title} ବିଦେଶୀ ନିଯୁକ୍ତି: ଓଡ଼ିଶାର ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ MEA e-Migrate ପଞ୍ଜୀକୃତ ଏଜେଣ୍ଟ ଯାଞ୍ଚ, ୱର୍କ ଭିସା ନିୟମ, ଶିକ୍ଷାଗତ ପ୍ରମାଣପତ୍ର ଆଟେଷ୍ଟେସନ୍ ଏବଂ ବିଦେଶୀ ନିଯୁକ୍ତି ସୁରକ୍ଷା ସୂଚନା।`;
  } else if (hay.includes('notification') || hay.includes('upcoming') || hay.includes('application open') || hay.includes('last date') || hay.includes('application closed') || hay.includes('admit card') || hay.includes('examination scheduled') || hay.includes('answer key') || hay.includes('result declared') || hay.includes('document verification') || hay.includes('final selection') || hay.includes('cancelled') || hay.includes('archived')) {
    badge = 'LIVE STATUS';
    en = `Recruitment lifecycle tracker for ${title}, helping Odisha aspirants monitor real-time official commission updates, admit card download windows, answer key objection dates, document verification schedules, and final merit lists.`;
    or = `${title} ବିଜ୍ଞପ୍ତି ସ୍ଥିତି: ଓଡ଼ିଶା ଓ ଜାତୀୟ ପରୀକ୍ଷାର୍ଥୀଙ୍କ ପାଇଁ ଆବେଦନ ତାରିଖ, ଆଡମିଟ୍ କାର୍ଡ, ପରୀକ୍ଷା ସୂଚୀ, ଆନ୍ସର୍ କି, ଡକ୍ୟୁମେଣ୍ଟ ଭେରିଫିକେସନ୍ ଏବଂ ଚୂଡ଼ାନ୍ତ ଫଳାଫଳର ସଦ୍ୟତମ ସୂଚନା।`;
  } else {
    en = `Verified Odisha & National recruitment guide for ${title}, detailing conducting authorities, ORSP/7th CPC pay levels, age limits with SC/ST/SEBC/Women/PwD relaxations, Odia qualification rules, and official application steps.`;
    or = `${title} ନିଯୁକ୍ତି ବିବରଣୀ: ପରୀକ୍ଷା ପରିଚାଳନା ସଂସ୍ଥା, ORSP/7th CPC ବେତନ, ବୟସ ସୀମା ଓ ସଂରକ୍ଷଣ କୋହଳ, ଓଡ଼ିଆ ଭାଷା ଯୋଗ୍ୟତା ଏବଂ ସରକାରୀ ପୋର୍ଟାଲରେ ଆବେଦନ ପ୍ରଣାଳୀର ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା।`;
  }

  return {
    title_or: folder.title_or || `${title} (ଓଡ଼ିଆ ସୂଚନା)`,
    badge,
    en,
    or
  };
}

// 18 Exhaustive Minute Bilingual Recruitment Handbooks (Category #01)
const CAT01_HANDBOOKS = [
  {
    id: 'ji-jr-opsc-ocs',
    slug: 'opsc-odisha-civil-services-ocs-guide',
    folderHints: ['odisha-civil-services-oas', 'odisha public service commission', 'civil services and administration'],
    title: 'OPSC Odisha Civil Services (OCS — OAS, OFS, OPS, ORS, OCoS, OWS Group A & B)',
    title_or: 'ଓପିଏସସି ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସ୍ (OCS — OAS, OFS, OPS, ORS, OCoS, OWS ଗ୍ରୁପ୍ A ଓ B)',
    conducting_body: 'Odisha Public Service Commission (OPSC)',
    exam_code: 'OPSC OCS (Advt. Annual Cycle)',
    cadre_group: 'Group A & Group B (OAS, OFS, OPS, ORS, OCoS, OWS)',
    pay_matrix: 'ORSP 2017 Level-12 (₹56,100–₹1,77,500 Group-A) & Level-10 (₹44,900–₹1,42,400 Group-B); In-hand ~₹72,000–₹86,000/month with DA & HRA.',
    age_limit_relaxation: '21–38 years (UR). +5 yrs SC/ST/SEBC/Women/Ex-Servicemen; +10 yrs PwD (up to 15 yrs for SC/ST/SEBC PwD). Max 6 attempts UR, 9 SEBC, Unlimited SC/ST.',
    qualification_odia_rule: 'Bachelor’s degree in any discipline from a recognised University; must read, write, and speak Odia and have passed ME Standard / HSC with Odia as a language subject.',
    selection_stages: '3 Stages: (1) Prelims: GS Paper-I (200 marks) + CSAT Paper-II (200 marks, 33% qualifying), 1/3rd negative marking; (2) Mains: Odia & English Qualifying (250 each) + Essay (250) + 4 GS Papers (250 each) + 2 Optional Papers (250 each) = 1750 merit marks; (3) Personality Test / Interview (250 marks).',
    pst_pet_skill_norms: 'OPS (Odisha Police Service) requires Height 168 cm (Men UR/SEBC), 163 cm (SC/ST), Chest 84–89 cm; Women 155 cm (UR/SEBC), 150 cm (SC/ST). Medical fitness board mandatory.',
    documents_checklist: 'OPSC OTR Slip, HSC & Degree Certificates + Marksheets, Odia Pass Certificate (ME/HSC), Valid SEBC/SC/ST Caste Certificate (Tahasil), Resident/Nativity Certificate, PwD UDID, NOC (if in Govt service), Passport Photos.',
    application_steps: '1. Complete One-Time Registration (OTR) at opsc.gov.in with Aadhaar & DigiLocker verification. 2. Select OCS Advertisement & post preferences. 3. Upload photo/signature & pay fee (exempted for Odisha SC/ST/PwD/Women as per rules). 4. Submit & print PDF.',
    official_portal_url: 'https://www.opsc.gov.in/',
    qualification_tag: 'Graduate (Any Stream) + Odia ME/HSC',
    vacancies: 'Annual State Cadre (350–450+ Posts)',
    summary: 'Complete OPSC OCS handbook covering OAS, OFS, OPS, ORS, OCoS & OWS cadres, ORSP Level-12/10 pay matrix, age relaxations, Prelims/Mains/Interview pattern, and opsc.gov.in OTR steps.',
    tags: ['OPSC', 'OCS', 'OAS', 'OFS', 'OPS', 'Graduate', 'Group A', 'Odisha Govt']
  },
  {
    id: 'ji-jr-opsc-asst-prof',
    slug: 'opsc-assistant-professor-oes-pgt-handbook',
    folderHints: ['odisha education recruitment', 'opsc-notifications', 'odisha public service commission'],
    title: 'OPSC Assistant Professor (State Public Universities & Govt Degree Colleges), OES & PGT',
    title_or: 'ଓପିଏସସି ସହକାରୀ ପ୍ରଫେସର, ଓଡ଼ିଶା ଶିକ୍ଷା ସେବା (OES) ଏବଂ PGT ନିଯୁକ୍ତି',
    conducting_body: 'Odisha Public Service Commission (OPSC)',
    exam_code: 'OPSC Asst. Prof / OES / PGT',
    cadre_group: 'Group A (University/College Academic Level-10) & Group B (OES / PGT)',
    pay_matrix: 'Assistant Professor: UGC Pay Level-10 (₹57,700–₹1,82,400, In-hand ~₹82,000+); OES & PGT: ORSP Level-10 (₹44,900–₹1,42,400).',
    age_limit_relaxation: 'Asst. Professor: 21–45 years (varies by University/College advt); OES/PGT: 21–38 years. +5 yrs SC/ST/SEBC/Women/Ex-Servicemen; +10 yrs PwD.',
    qualification_odia_rule: 'Master’s degree with 55% marks (50% SC/ST/SEBC/PwD) + UGC-NET/CSIR-NET/Ph.D. (Asst. Prof) or B.Ed. (OES/PGT). Odia ME/HSC pass required for State Govt Degree Colleges & OES/PGT.',
    selection_stages: 'Asst. Professor: API Shortlisting (UGC guidelines) + Subject Presentation & Interview Board; OES/PGT: Written Exam (GS + Subject Paper, 1/4th negative) + Career Assessment / Viva-Voce.',
    pst_pet_skill_norms: '10–15 minute classroom teaching / research presentation before OPSC Subject Expert Panel for Assistant Professor candidates.',
    documents_checklist: 'PG Degree & Marksheets, UGC-NET/JRF or Ph.D. Compliance Certificate, B.Ed. Certificate (OES/PGT), Research Publications & Teaching Experience Proofs, Caste/Resident Certificate, NOC.',
    application_steps: '1. Register on opsc.gov.in OTR. 2. Fill academic score & publication details carefully. 3. Upload self-attested PDFs if called for verification. 4. Download Interview/Written Admit Card.',
    official_portal_url: 'https://www.opsc.gov.in/',
    qualification_tag: 'PG (55%) + NET / Ph.D. / B.Ed.',
    vacancies: 'State Universities & Govt Colleges',
    summary: 'Bilingual handbook for OPSC Assistant Professor, Odisha Education Service (OES), and PGT drives covering UGC Level-10 / ORSP Level-10 pay, NET/Ph.D. norms, and OPSC selection stages.',
    tags: ['OPSC', 'Assistant Professor', 'OES', 'PGT', 'Higher Education', 'UGC NET']
  },
  {
    id: 'ji-jr-opsc-medical-officer',
    slug: 'opsc-medical-officer-dental-ayurvedic-homoeopathic',
    folderHints: ['odisha health and medical services', 'opsc-notifications', 'odisha public service commission'],
    title: 'OPSC Medical Officer (Assistant Surgeon), Dental Surgeon, Ayurvedic & Homoeopathic MO',
    title_or: 'ଓପିଏସସି ମେଡିକାଲ୍ ଅଫିସର (ସହକାରୀ ସର୍ଜନ), ଡେଣ୍ଟାଲ୍, ଆୟୁର୍ବେଦିକ ଏବଂ ହୋମିଓପ୍ୟାଥିକ୍ ଡାକ୍ତର',
    conducting_body: 'Odisha Public Service Commission (OPSC)',
    exam_code: 'OPSC MO (OMHS / OMDS / OAMS / OHMS)',
    cadre_group: 'Group A (Junior Branch) — Health & Family Welfare Dept, Govt of Odisha',
    pay_matrix: 'ORSP 2017 Level-12 (₹56,100–₹1,77,500) + Non-Practicing Allowance / Rural Incentive (In-hand ~₹80,000–₹95,000/month).',
    age_limit_relaxation: '21–38 years (up to 45 yrs for in-service contractual MO under NHM/State). +5 yrs SC/ST/SEBC/Women; +10 yrs PwD.',
    qualification_odia_rule: 'MBBS / BDS / BAMS / BHMS degree from NMC/DCI/NCISM/NCH recognised college + Compulsory Rotatory Internship + Valid Odisha State Medical/Dental/Ayurvedic/Homoeopathic Council Registration + Odia ME/HSC pass.',
    selection_stages: 'Written Examination (200 MCQs, 200 Marks, 3 hours, zero or 0.25 negative as per advt) + Career Weightage (for contractual service if applicable) + Document Verification.',
    pst_pet_skill_norms: 'Valid permanent registration with Odisha Council of Medical Registration (OCMR) / State Dental / Ayurvedic / Homoeopathic Board at the time of document verification.',
    documents_checklist: 'MBBS/BDS/BAMS/BHMS Degree & All Prof Marksheets, Internship Completion Certificate, Permanent Council Registration, Odia Pass Certificate, Caste/Resident Certificate, Contractual Service Certificate (if claiming weightage).',
    application_steps: '1. Log in to opsc.gov.in via OTR. 2. Choose Medical Officer / Dental / AYUSH post. 3. Enter Council Registration number & internship completion date. 4. Submit & download admit card for Cuttack/Bhubaneswar exam.',
    official_portal_url: 'https://www.opsc.gov.in/',
    qualification_tag: 'MBBS / BDS / BAMS / BHMS + Odia',
    vacancies: 'Statewide PHC / CHC / DHH Cadre',
    summary: 'Complete OPSC Medical Officer (Assistant Surgeon), Dental Surgeon, Ayurvedic & Homoeopathic MO guide with ORSP Level-12 pay, Odisha Council registration, and 200-mark exam pattern.',
    tags: ['OPSC', 'Medical Officer', 'MBBS', 'Dental', 'AYUSH', 'Odisha Health']
  },
  {
    id: 'ji-jr-opsc-aee-aso',
    slug: 'opsc-aee-civil-mech-elec-and-aso-secretariat',
    folderHints: ['opsc-notifications', 'odisha public service commission', 'odisha departments and directorates'],
    title: 'OPSC Assistant Executive Engineer (AEE Civil/Mech/Elec) & Assistant Section Officer (ASO)',
    title_or: 'ଓପିଏସସି ସହକାରୀ କାର୍ଯ୍ୟନିର୍ବାହୀ ଯନ୍ତ୍ରୀ (AEE) ଏବଂ ସହକାରୀ ସେକ୍ସନ୍ ଅଫିସର (ASO ସଚିବାଳୟ)',
    conducting_body: 'Odisha Public Service Commission (OPSC)',
    exam_code: 'OPSC AEE (GATE/Written) & OPSC ASO',
    cadre_group: 'Group A (AEE Engineering Service) & Group B (ASO Odisha Secretariat Service)',
    pay_matrix: 'AEE: ORSP Level-12 (₹56,100–₹1,77,500, In-hand ~₹75,000+); ASO: ORSP Level-9 (₹35,400–₹1,12,400, In-hand ~₹49,000+).',
    age_limit_relaxation: '21–38 years (AEE & ASO). +5 yrs SC/ST/SEBC/Women/Ex-Servicemen; +10 yrs PwD.',
    qualification_odia_rule: 'AEE: B.E./B.Tech in Civil/Mechanical/Electrical; ASO: Bachelor’s degree in any stream + Knowledge of Computer Applications. Both require Odia ME/HSC standard pass.',
    selection_stages: 'AEE: Valid GATE Score (90%) or Written Exam + Viva-Voce (10%); ASO: Written Exam (GS 100 + Reasoning/Math 100 + English/Odia 200 = 400 marks, 0.25 negative) + Computer Skill Test (50 marks qualifying).',
    pst_pet_skill_norms: 'ASO Computer Skill Test: MS Windows, MS Word, MS Excel, MS PowerPoint & MS Access practical test (40% qualifying).',
    documents_checklist: 'B.Tech/Graduate Degree & Marksheets, GATE Scorecard (if applicable for AEE), Computer Proficiency Certificate (ASO), Odia Pass Certificate, Caste/Resident Certificate, OPSC OTR Printout.',
    application_steps: '1. Complete OTR at opsc.gov.in. 2. Enter GATE registration ID (AEE) or Graduation details (ASO). 3. Choose exam zone (Cuttack/Bhubaneswar/Balasore/Berhampur/Sambalpur). 4. Download admission certificate.',
    official_portal_url: 'https://www.opsc.gov.in/',
    qualification_tag: 'B.Tech (AEE) / Graduate (ASO)',
    vacancies: 'Secretariat & Engineering Depts',
    summary: 'Detailed handbook for OPSC Assistant Executive Engineer (Civil/Mech/Elec) and Secretariat ASO covering ORSP Level-12 & Level-9 pay, GATE/Written weightage, and Computer Skill Test norms.',
    tags: ['OPSC', 'AEE', 'ASO', 'B.Tech', 'Secretariat', 'Group A', 'Group B']
  },
  {
    id: 'ji-jr-ossc-cglre',
    slug: 'ossc-cglre-supplies-inspector-auditor-jeo-handbook',
    folderHints: ['odisha staff selection commission', 'ossc-osssc-district-cadre'],
    title: 'OSSC Combined Graduate Level (CGLRE — Supplies Inspector, Auditor, JEO, Coop Inspector, Sub-Registrar)',
    title_or: 'ଓଏସଏସସି ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ ପରୀକ୍ଷା (CGLRE — ଯୋଗାଣ ନିରୀକ୍ଷକ, ଅଡିଟର, JEO, ସବ୍-ରେଜିଷ୍ଟ୍ରାର)',
    conducting_body: 'Odisha Staff Selection Commission (OSSC)',
    exam_code: 'OSSC CGLRE',
    cadre_group: 'Group B & Group C State Cadre Services',
    pay_matrix: 'ORSP 2017 Level-9 (₹35,400–₹1,12,400) for Inspector of Supplies/Auditor/Sub-Registrar & Level-7/8 (₹25,500–₹81,100) for Junior Assistant/JEO.',
    age_limit_relaxation: '21–38 years (UR). +5 yrs SC/ST/SEBC/Women/Ex-Servicemen; +10 yrs PwD.',
    qualification_odia_rule: 'Bachelor’s degree in any discipline + Basic Computer Knowledge; must have passed ME Standard / HSC with Odia as a language subject.',
    selection_stages: 'Stage-1 Prelims (150 Marks: Arithmetic, DI, Reasoning, Current Affairs, Computer — 0.25 negative); Stage-2 Mains (Paper-I Language Odia & English 100 marks + Paper-II GS 100 marks); Stage-3 Computer Skill Test (50 marks) & Certificate Verification.',
    pst_pet_skill_norms: 'Computer Skill Test (Practical): MS Office, Internet & Email, Odia/English typing familiarity; Mathematics/Statistics optional paper for Statistical/Auditor posts where notified.',
    documents_checklist: 'OSSC Application Printout, HSC & Graduation Certificates/Marksheets, Odia Pass Certificate, Valid Caste (SEBC within 1 yr/latest norm)/Resident Certificate, PwD/Sports/Ex-Servicemen Certificate.',
    application_steps: '1. Register at ossc.gov.in using mobile/email OTR. 2. Select CGLRE advertisement & rank post preferences carefully. 3. Upload photo/signature (no exam fee for Odisha Govt Group B/C posts as per policy). 4. Appear for OMR/CBT Prelims & Mains.',
    official_portal_url: 'https://www.ossc.gov.in/',
    qualification_tag: 'Graduate (Any Stream) + Computer',
    vacancies: '500–1,000+ State Cadre Posts',
    summary: 'OSSC CGLRE complete guide for Inspector of Supplies, Auditor, JEO, Cooperative Inspector & Sub-Registrar covering ORSP Level-9/8 pay, Prelims/Mains syllabus, 0.25 negative marking, and ossc.gov.in steps.',
    tags: ['OSSC', 'CGLRE', 'Graduate', 'Supplies Inspector', 'Auditor', 'Sub-Registrar']
  },
  {
    id: 'ji-jr-ossc-ctsre-chsl',
    slug: 'ossc-ctsre-junior-engineer-and-10plus2-specialist',
    folderHints: ['odisha staff selection commission', 'ossc-osssc-district-cadre'],
    title: 'OSSC Combined Technical Services (CTSRE — JE, JMO) & Combined Higher Secondary (10+2) Specialist Posts',
    title_or: 'ଓଏସଏସସି ମିଳିତ ବୈଷୟିକ ସେବା (CTSRE — JE, JMO) ଏବଂ +2 ସ୍ପେଶାଲିଷ୍ଟ ପଦବୀ',
    conducting_body: 'Odisha Staff Selection Commission (OSSC)',
    exam_code: 'OSSC CTSRE & OSSC CHSL (10+2)',
    cadre_group: 'Group B (Junior Engineer / JMO) & Group C (10+2 Amin / Soil Conservation / Technical)',
    pay_matrix: 'CTSRE JE/JMO: ORSP Level-9 (₹35,400–₹1,12,400); CHSL (10+2) Posts: ORSP Level-4 to Level-7 (₹19,900–₹81,100).',
    age_limit_relaxation: 'CTSRE: 21–38 years; CHSL (10+2): 18/21–38 years. +5 yrs SC/ST/SEBC/Women; +10 yrs PwD.',
    qualification_odia_rule: 'CTSRE: Diploma in Civil/Mech/Elec/Mining Engineering; CHSL: +2 / 10+2 Science/Vocational/ITI as per post. Odia ME/HSC standard mandatory.',
    selection_stages: 'Stage-1 Prelims (150 MCQs: Arithmetic, DI, Reasoning, Current Affairs, Computer — 0.25 negative); Stage-2 Technical Paper (200 marks in Civil/Mech/Elec/Mining/Science); Stage-3 Certificate Verification.',
    pst_pet_skill_norms: 'Practical/Field verification for Amin/Surveyor or Medical/Physical standard for Fire/Forest-allied technical posts where applicable.',
    documents_checklist: 'Diploma/10+2 Certificate & Marksheets, Odia Pass Certificate, Caste/Resident Certificate, SCTE&VT / AICTE affiliation proof (if required), OSSC Registration Slip.',
    application_steps: '1. Log in to ossc.gov.in. 2. Select CTSRE or CHSL (10+2) notification. 3. Choose engineering/specialist discipline & post preferences. 4. Submit & download Prelims CBT/OMR Admit Card.',
    official_portal_url: 'https://www.ossc.gov.in/',
    qualification_tag: 'Diploma Engg / 10+2 Science',
    vacancies: '400–1,200+ Technical Posts',
    summary: 'Bilingual handbook for OSSC CTSRE (Junior Engineer, Junior Mining Officer) and OSSC 10+2 Combined Higher Secondary Specialist posts with ORSP Level-9/7 pay and technical paper pattern.',
    tags: ['OSSC', 'CTSRE', 'Junior Engineer', 'Diploma', '10+2', 'CHSL']
  },
  {
    id: 'ji-jr-osssc-ri',
    slug: 'osssc-combined-ri-ari-amin-sfs',
    folderHints: ['ri-ari-amin-combined', 'odisha sub-ordinate staff selection commission', 'odisha revenue and district administration'],
    title: 'OSSSC Combined District-Cadre Recruitment (RI, ARI, Amin, ICDS Supervisor, SFS)',
    title_or: 'ଓଏସଏସଏସସି ମିଳିତ ଜିଲ୍ଲା କ୍ୟାଡର୍ ନିଯୁକ୍ତି (RI, ARI, ଅମିନ, ICDS ସୁପରଭାଇଜର, SFS)',
    conducting_body: 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)',
    exam_code: 'OSSSC CRE (RI / ARI / Amin / ICDS / SFS)',
    cadre_group: 'Group C District Cadre (Revenue & WCD Departments)',
    pay_matrix: 'RI & ICDS Supervisor: ORSP Level-9 (₹35,400–₹1,12,400); ARI, Amin & SFS: ORSP Level-4 to Level-7 (₹19,900–₹81,100).',
    age_limit_relaxation: '21–38 years (RI/ICDS) & 18/20–38 years (ARI/Amin/SFS). +5 yrs SC/ST/SEBC/Women; +10 yrs PwD.',
    qualification_odia_rule: 'RI & ICDS Supervisor (Women only for ICDS): Bachelor’s degree; ARI/Amin/SFS: +2 / 10+2 pass + Basic Computer Knowledge. Odia ME/HSC pass mandatory.',
    selection_stages: 'Stage-1 Prelims CBT (100 marks: Math, GS, English, Odia, Reasoning — 1/3rd negative); Stage-2 Mains CBT (180 marks — 1/3rd negative); Stage-3 Practical Skill Test in Basic Computer Skills (50 marks qualifying).',
    pst_pet_skill_norms: 'Computer Practical Test: MS Word, Excel, PowerPoint, Windows file handling & basic internet skills (qualifying 40% marks).',
    documents_checklist: 'HSC, +2, Graduation Certificates, Computer Certificate (PGDCA/DCA/OS-CIT/equivalent if applicable), Odia Pass Certificate, District Resident Certificate, Caste Certificate.',
    application_steps: '1. Register on osssc.gov.in. 2. Select home/preferred district for District Cadre allotment. 3. Fill post preferences (RI, ICDS, ARI, Amin, SFS). 4. Download CBT Admit Card & appear at district centre.',
    official_portal_url: 'https://www.osssc.gov.in/',
    qualification_tag: '12th Pass / Graduate + Computer',
    vacancies: '2,895+ District Cadre Posts',
    summary: 'Complete OSSSC CRE handbook for RI, ARI, Amin, ICDS Supervisor, and Statistical Field Surveyor across 30 Odisha districts covering Prelims/Mains CBT, 1/3rd negative marking, and Computer Skill Test.',
    tags: ['OSSSC', 'RI', 'ARI', 'Amin', 'ICDS Supervisor', 'SFS', 'District Cadre']
  },
  {
    id: 'ji-jr-osssc-uniformed',
    slug: 'osssc-forest-guard-forester-livestock-inspector-excise',
    folderHints: ['odisha sub-ordinate staff selection commission', 'ossc-osssc-district-cadre'],
    title: 'OSSSC Uniformed & Field Cadres (Forest Guard, Forester, Livestock Inspector, Excise Constable)',
    title_or: 'ଓଏସଏସସି କ୍ଷେତ୍ର ଓ ୟୁନିଫର୍ମ କ୍ୟାଡର୍ (ଫରେଷ୍ଟ ଗାର୍ଡ, ଫରେଷ୍ଟର, ପ୍ରାଣୀଧନ ନିରୀକ୍ଷକ, ଅବକାରୀ କନେଷ୍ଟବଳ)',
    conducting_body: 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)',
    exam_code: 'OSSSC CRE (FG / Forester / LSI / Excise)',
    cadre_group: 'Group C Uniformed & Field Cadres (Forest, F&ARD, Excise Depts)',
    pay_matrix: 'Forester & LSI: ORSP Level-7 (₹25,500–₹81,100); Forest Guard & Excise Constable: ORSP Level-4 (₹19,900–₹63,200).',
    age_limit_relaxation: '18–38 years (Forest Guard/LSI/Forester). +5 yrs SC/ST/SEBC/Women; +10 yrs PwD (where eligible).',
    qualification_odia_rule: 'Forest Guard: +2 / 10+2; Forester: +2 Science; Livestock Inspector: +2 Vocational (Dairy/Poultry) or +2 Science. Odia ME/HSC standard mandatory.',
    selection_stages: 'Stage-1 Written CBT (150 marks: English, Odia, Arithmetic, GK, Computer, General Science — 0.50 negative); Stage-2 Physical Standard Measurement (PST) & Physical Efficiency Test (PET — 25 km/16 km walking test); Stage-3 Document Verification.',
    pst_pet_skill_norms: 'Forest Guard/Forester Height: Men 168 cm (158 cm ST), Women 153 cm; Chest 79–84 cm. PET: Walking 25 km in 4 hours (Men) / 16 km in 4 hours (Women).',
    documents_checklist: 'HSC & +2 Science/Vocational Certificates, Odia Pass Certificate, District Resident & Caste Certificates, Medical Fitness Certificate for Walking Test, NCC/Sports Certificates (if claiming bonus).',
    application_steps: '1. Log in to osssc.gov.in. 2. Choose District/Circle preference for Forest & F&ARD cadres. 3. Submit online form & download CBT Admit Card. 4. Qualify CBT to receive PST/PET call letter.',
    official_portal_url: 'https://www.osssc.gov.in/',
    qualification_tag: '+2 / 10+2 Science + Physical Test',
    vacancies: '2,700+ Field & Forest Posts',
    summary: 'OSSSC Forest Guard, Forester, Livestock Inspector & Excise Constable handbook covering ORSP Level-7/4 pay, 150-mark CBT pattern, 25 km/16 km walking PET norms, and district verification.',
    tags: ['OSSSC', 'Forest Guard', 'Forester', 'Livestock Inspector', 'Excise Constable']
  },
  {
    id: 'ji-jr-osssc-healthcare',
    slug: 'osssc-nursing-officer-pharmacist-mphw-radiographer-lt',
    folderHints: ['odisha health and medical services', 'odisha sub-ordinate staff selection commission'],
    title: 'OSSSC Healthcare & Paramedical Cadres (Nursing Officer, Pharmacist, MPHW, Radiographer, Lab Tech)',
    title_or: 'ଓଏସଏସସି ସ୍ୱାସ୍ଥ୍ୟ ଓ ପାରାମେଡିକାଲ୍ କ୍ୟାଡର୍ (ନର୍ସିଂ ଅଫିସର, ଫାର୍ମାସିଷ୍ଟ, MPHW, ରେଡିଓଗ୍ରାଫର, LT)',
    conducting_body: 'Odisha Sub-ordinate Staff Selection Commission (OSSSC)',
    exam_code: 'OSSSC Paramedical & Nursing CRE',
    cadre_group: 'Group C Healthcare & Paramedical Cadre (H&FW Dept)',
    pay_matrix: 'Nursing Officer: ORSP Level-8 (₹29,200–₹92,300); Pharmacist, Radiographer & Lab Tech: ORSP Level-7 (₹25,500–₹81,100); MPHW: ORSP Level-5 (₹21,700–₹69,100).',
    age_limit_relaxation: '21–38 years (Nursing/Pharmacist/LT/Radiographer); 21–32/38 yrs (MPHW). +5 yrs SC/ST/SEBC/Women; +10 yrs PwD; extra relaxation for contractual NHM/Covid workers.',
    qualification_odia_rule: 'Nursing Officer: +2 with GNM/B.Sc Nursing + ONMRC reg; Pharmacist: +2 Science + D.Pharm/B.Pharm + OSPC reg; LT/Radiographer: +2 Science + DMLT/DMRT; MPHW(F): ANM. Odia ME/HSC pass mandatory.',
    selection_stages: 'Written Exam (100 Marks: Technical/Subject 60 + Practical Skill MCQ 25 + Arithmetic & English 15 — 0.25 negative) + Extra marks for contractual/Covid health workers as per Govt resolution + Document Verification.',
    pst_pet_skill_norms: 'Mandatory active registration with Odisha Nurses & Midwives Registration Council (ONMRC) / Odisha State Pharmacy Council (OSPC) / State Allied Medical Council.',
    documents_checklist: '+2 Science Certificate, GNM/B.Sc/D.Pharm/DMLT/DMRT/ANM Diploma, Valid Odisha Council Registration Certificate, Odia Pass Certificate, Experience Certificate (if contractual/Covid), Caste/Resident Certificate.',
    application_steps: '1. Register on osssc.gov.in. 2. Upload Council Registration number & expiry date. 3. Select District/Medical College Cadre. 4. Download Written Exam Admit Card & appear for CBT/OMR.',
    official_portal_url: 'https://www.osssc.gov.in/',
    qualification_tag: 'GNM / B.Sc Nursing / D.Pharm / DMLT / ANM',
    vacancies: '5,000+ Healthcare Cadre Posts',
    summary: 'Complete OSSSC Healthcare handbook for Nursing Officer, Pharmacist, MPHW (Male/Female), Radiographer & Lab Technician with ORSP Level-8/7/5 pay, Odisha Council registration, and 100-mark exam pattern.',
    tags: ['OSSSC', 'Nursing Officer', 'Pharmacist', 'MPHW', 'Lab Technician', 'Radiographer']
  },
  {
    id: 'ji-jr-oprb-police',
    slug: 'oprb-odisha-police-si-sergeant-fire-constable',
    folderHints: ['odisha police and state security', 'odisha-police-teaching'],
    title: 'OPRB Odisha Police Sub-Inspector (SI), Sergeant, Station Officer (Fire) & Battalion Constable / Sepoy',
    title_or: 'ଓପିଆରବି ଓଡ଼ିଶା ପୋଲିସ୍ ସବ୍-ଇନ୍ସପେକ୍ଟର (SI), ସର୍ଜେଣ୍ଟ, ଷ୍ଟେସନ୍ ଅଫିସର ଏବଂ କନେଷ୍ଟବଳ / ସିପାହୀ',
    conducting_body: 'Odisha Police Recruitment Board (OPRB) / SSB Odisha Police',
    exam_code: 'OPRB SI / Fire / Constable',
    cadre_group: 'Group B (SI / Station Officer) & Group C (Constable / Sepoy)',
    pay_matrix: 'SI / Station Officer: ORSP Level-9 (₹35,400–₹1,12,400, In-hand ~₹49,000+); Battalion Constable / Sepoy: ORSP Level-5 (₹21,700–₹69,100).',
    age_limit_relaxation: 'SI: 21–25/28 yrs (with state relaxation); Constable/Sepoy: 18–23/27 yrs. +5 yrs SC/ST/SEBC/Women; Ex-Servicemen service-period relaxation.',
    qualification_odia_rule: 'SI/Sergeant: Bachelor’s degree; Station Officer (Fire): Science/Engg Graduate; Constable/Sepoy: 10th / Matriculation (BSE Odisha or equivalent) with Odia as a subject.',
    selection_stages: 'SI: Paper-I (General English & Odia 100 marks) + Paper-II (GS & Aptitude 200 marks, 0.25 negative) + PST/PET (Qualifying); Constable/Sepoy: CBT (100 marks, 0.25 negative) + PST/PET + Driving/Trade Test (if applicable) + Medical Exam.',
    pst_pet_skill_norms: 'Men Height: 168 cm (163 cm SC/ST), Chest 79–84 cm; Women Height: 155 cm (150 cm SC/ST). PET: 1.6 km run in 7 mins (Men) / 9 mins (Women), Long Jump 3.66 m (Men) / 2.75 m (Women).',
    documents_checklist: 'Matric/Degree Certificates, Odia Pass Proof, Valid Caste/Resident Certificate, Driving Licence (if claiming bonus for Constable), NCC B/C Certificate, Home Guard Service Certificate (if applicable).',
    application_steps: '1. Apply online via odishapolice.gov.in recruitment portal. 2. Select Battalion/District unit & upload photo/signature. 3. Appear for CBT written test. 4. Qualify PST/PET & Medical Board at Battalion/Range HQ.',
    official_portal_url: 'https://odishapolice.gov.in/',
    qualification_tag: '10th Pass (Constable) / Graduate (SI)',
    vacancies: '1,000–4,000+ Uniformed Posts',
    summary: 'OPRB Odisha Police SI, Sergeant, Fire Station Officer & Battalion Constable/Sepoy guide detailing ORSP Level-9/5 pay, CBT negative marking, 1.6 km run PET norms, and medical standards.',
    tags: ['OPRB', 'Odisha Police', 'SI', 'Constable', 'Sepoy', 'Fire Service']
  },
  {
    id: 'ji-jr-osepa-oavs-teacher',
    slug: 'osepa-ssd-oavs-ltr-tgt-pgt-junior-teacher-handbook',
    folderHints: ['odisha education recruitment', 'odisha-police-teaching'],
    title: 'OSEPA, SSD & OAVS School Teacher Recruitment (LTR High School, TGT, PGT, Junior Teacher Schematic)',
    title_or: 'ଓଏସଇପିଏ, ଏସଏସଡି ଏବଂ ଓଏଭିଏସ ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ ନିଯୁକ୍ତି (LTR, TGT, PGT, ଜୁନିଅର ଟିଚର)',
    conducting_body: 'OSEPA / OSSC (LTR) / OAVS / ST & SC Development Dept',
    exam_code: 'OSEPA JTS / LTR / OAVS / SSD',
    cadre_group: 'Group B (PGT / OAVS TGT) & Group C / Schematic (LTR / Junior Teacher)',
    pay_matrix: 'OAVS PGT: ORSP Level-10 (₹44,900+); OAVS TGT & LTR High School: ORSP Level-9 (₹35,400+); Junior Teacher Schematic: ₹16,000–₹22,000 consolidated progressing to Level-7.',
    age_limit_relaxation: '21–38 years (LTR/JTS/OAVS; up to 32/38 yrs as per latest notification). +5 yrs SC/ST/SEBC/Women; +10 yrs PwD.',
    qualification_odia_rule: 'JTS: +2 + CT/D.El.Ed. + OTET-I or Graduation + B.Ed. + OTET-II; LTR/TGT: Graduation + B.Ed. + OSSTET; OAVS PGT: PG (50%) + B.Ed. Odia ME/HSC pass mandatory.',
    selection_stages: 'CBT Examination: Prelims (for LTR if via OSSC) + Mains / Single CBT (Pedagogy, Reasoning, Odia/English, Subject Content — 0.25 negative) + District-wise Merit List & Certificate Verification.',
    pst_pet_skill_norms: 'Mandatory valid OTET (Paper-I/II) for Junior Teacher or OSSTET/CTET/OTET-II for LTR/OAVS TGT before application cut-off date.',
    documents_checklist: 'HSC, +2, Graduation/PG, D.El.Ed./B.Ed./B.P.Ed. Certificates, Valid OTET/OSSTET/CTET Scorecard, Odia Pass Proof, District Resident & Caste Certificates.',
    application_steps: '1. Apply on osepa.odisha.gov.in, oav.edu.in, or ossc.gov.in (for LTR). 2. Select District preferences & teaching stream (Arts/PCM/CBZ/Hindi/Sanskrit/PET). 3. Appear for CBT & attend District Education Officer (DEO) verification.',
    official_portal_url: 'https://osepa.odisha.gov.in/',
    qualification_tag: 'CT/D.El.Ed. + OTET / B.Ed. + OSSTET',
    vacancies: '5,000–20,000+ Teacher Posts',
    summary: 'Complete Odisha teacher recruitment handbook for OSEPA LTR, Junior Teacher Schematic, OAVS PGT/TGT, and SSD school teachers covering OTET/OSSTET norms, pay matrix, and CBT pattern.',
    tags: ['OSEPA', 'OAVS', 'LTR Teacher', 'Junior Teacher', 'OSSTET', 'OTET', 'B.Ed']
  },
  {
    id: 'ji-jr-high-court-ojs',
    slug: 'high-court-of-orissa-aso-steno-deo-ojs-handbook',
    folderHints: ['odisha judiciary and legal services', 'opsc-notifications'],
    title: 'High Court of Orissa & District Judiciary (ASO, Jr. Steno, Typist, DEO, OJS Civil Judge)',
    title_or: 'ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ ଏବଂ ଜିଲ୍ଲା ନ୍ୟାୟପାଳିକା (ASO, ଷ୍ଟେନୋ, ଟାଇପିଷ୍ଟ, DEO, OJS ସିଭିଲ୍ ଜଜ୍)',
    conducting_body: 'High Court of Orissa (Cuttack) / OPSC (OJS)',
    exam_code: 'OHC ASO / District Court / OPSC OJS',
    cadre_group: 'Group A (OJS Civil Judge) & Group B/C (High Court ASO, Steno, Typist, DEO)',
    pay_matrix: 'OJS Civil Judge: J-1 Pay Scale (₹77,840–₹1,36,520); High Court ASO: ORSP Level-9 (₹35,400–₹1,12,400); District Court Clerk/Steno: ORSP Level-4/7.',
    age_limit_relaxation: 'OJS: 23–35 yrs (+5 yrs SC/ST/Women); High Court ASO/Steno/DEO: 21–32/38 yrs (+5 yrs SC/ST/SEBC/Women; +10 yrs PwD).',
    qualification_odia_rule: 'OJS: LL.B. degree + Odia read/write/speak (ME/HSC); High Court ASO: Bachelor’s degree + Computer Application; District Court: +2/Graduate + Typing/Shorthand + Odia ME/HSC.',
    selection_stages: 'OJS: Prelims (100 MCQs) + Mains (2 Compulsory + 3 Optional Law Papers) + Interview; High Court ASO: Prelims (150 marks) + Written Mains (English, Math, GK — 300 marks) + Computer Test (100 marks) + Viva (40 marks).',
    pst_pet_skill_norms: 'Jr. Stenographer: Shorthand 80 wpm + Typing 40 wpm (English); Jr. Typist: 40 wpm accuracy test; ASO: MS Office & Computer Application Test.',
    documents_checklist: 'LL.B. / Graduation / +2 Certificates, Diploma in Computer Application (DCA/PGDCA), Shorthand/Typing Certificates, Odia Pass Certificate, Caste/Resident Certificate, Bar Council Enrollment (if applicable).',
    application_steps: '1. Visit orissahighcourt.nic.in (Recruitment Corner) or opsc.gov.in (for OJS). 2. Register & pay exam fee (exempted for SC/ST/PwD). 3. Appear for Cuttack/District Court centre exams & skill tests.',
    official_portal_url: 'https://www.orissahighcourt.nic.in/',
    qualification_tag: 'LL.B. (OJS) / Graduate (ASO) / +2 (Clerk)',
    vacancies: 'High Court & 30 District Courts',
    summary: 'Comprehensive High Court of Orissa & District Judiciary guide covering OJS Civil Judge, High Court ASO, Junior Stenographer, Typist, and DEO pay scales, shorthand/typing norms, and exam stages.',
    tags: ['High Court of Orissa', 'OJS', 'Civil Judge', 'ASO', 'Stenographer', 'Judiciary']
  },
  {
    id: 'ji-jr-upsc-cse-nda-cds',
    slug: 'upsc-cse-ias-ips-ifs-nda-cds-capf-odisha-guide',
    folderHints: ['civil services and administration', 'national-level government jobs & recruitment'],
    title: 'UPSC Civil Services (IAS, IPS, IFS, IAAS, IRS), NDA, CDS & CAPF Assistant Commandant',
    title_or: 'ୟୁପିଏସସି ସିଭିଲ୍ ସର୍ଭିସ୍ (IAS, IPS, IFS, IRS), NDA, CDS ଏବଂ CAPF ଆସିଷ୍ଟାଣ୍ଟ କମାଣ୍ଡାଣ୍ଟ',
    conducting_body: 'Union Public Service Commission (UPSC)',
    exam_code: 'UPSC CSE / NDA / CDS / CAPF AC',
    cadre_group: 'All India Services & Central Civil Services Group A',
    pay_matrix: '7th CPC Level-10 (₹56,100–₹1,77,500) at entry; In-hand ~₹85,000–₹98,000/month + official accommodation & allowances.',
    age_limit_relaxation: 'CSE: 21–32 yrs (+3 yrs OBC, +5 yrs SC/ST, +10 yrs PwBD); CAPF AC: 20–25 yrs; CDS: 19–25 yrs; NDA: 16.5–19.5 yrs.',
    qualification_odia_rule: 'CSE/CAPF/CDS: Bachelor’s degree in any stream; NDA: 10+2 pass. Odia is a recognised 8th Schedule language for UPSC CSE Mains Compulsory Language Paper-A (300 marks) & Odia Literature Optional (500 marks).',
    selection_stages: 'CSE: Prelims (GS + CSAT, 1/3rd negative) -> Mains (9 Papers: Essay, GS I-IV, Optional I-II + Qualifying Odia & English = 1750 marks) -> Personality Test (275 marks). Cuttack & Sambalpur are Odisha Prelims centres.',
    pst_pet_skill_norms: 'IPS/CAPF/CDS/NDA require strict medical & physical standards (Height 165 cm Men / 150 cm Women for IPS/CAPF; 100m/800m run, Long Jump, Shot Put for CAPF PET).',
    documents_checklist: 'UPSC OTR Profile, Matriculation Certificate (DOB), Degree/Provisional Certificate, Central OBC-NCL (valid FY) / SC / ST / EWS Certificate, DAF-I/II Declaration.',
    application_steps: '1. Complete UPSC OTR at upsconline.nic.in. 2. Select Cuttack or Sambalpur Prelims Centre & Odia Literature Optional (if chosen). 3. Submit Part-I & Part-II before 6:00 PM deadline. 4. File DAF-I upon clearing Prelims.',
    official_portal_url: 'https://upsconline.nic.in/',
    qualification_tag: 'Graduate (CSE/CDS/CAPF) / 12th (NDA)',
    vacancies: '1,000+ All India Group-A Posts',
    summary: 'UPSC CSE, NDA, CDS & CAPF AC handbook for Odisha aspirants featuring Odia Literature Optional & Paper-A guidance, Cuttack/Sambalpur exam centres, 7th CPC Level-10 pay, and OTR steps.',
    tags: ['UPSC', 'IAS', 'IPS', 'Odia Optional', 'NDA', 'CDS', 'CAPF']
  },
  {
    id: 'ji-jr-ssc-eastern-region',
    slug: 'ssc-cgl-chsl-mts-gd-je-eastern-region-odisha',
    folderHints: ['staff selection commission (ssc)', 'ssc-east-coast-railway'],
    title: 'SSC CGL, CHSL, MTS, GD Constable & JE (Eastern Region / Odisha Exam Centres)',
    title_or: 'ଏସଏସସି CGL, CHSL, MTS, GD କନେଷ୍ଟବଳ ଏବଂ JE (ପୂର୍ବାଞ୍ଚଳ / ଓଡ଼ିଶା ପରୀକ୍ଷା କେନ୍ଦ୍ର)',
    conducting_body: 'Staff Selection Commission (SSC — Eastern Region Kolkata)',
    exam_code: 'SSC CGL / CHSL / MTS / GD / JE',
    cadre_group: 'Central Govt Group B (Non-Gazetted) & Group C',
    pay_matrix: 'CGL: 7th CPC Level-4 to Level-8 (₹25,500–₹1,51,100); CHSL: Level-2/4/5; MTS: Level-1 (₹18,000–₹56,900); JE: Level-6 (₹35,400–₹1,12,400).',
    age_limit_relaxation: 'CGL/JE: 18–30/32 yrs; CHSL/MTS: 18–25/27 yrs; GD: 18–23 yrs. +3 yrs OBC, +5 yrs SC/ST, +10 yrs PwBD.',
    qualification_odia_rule: 'CGL: Bachelor’s degree; CHSL: 12th Pass; MTS & GD: 10th Pass; JE: Diploma/B.Tech. Odia is available as a CBT medium in SSC MTS & SSC GD Constable.',
    selection_stages: 'CGL/CHSL: Tier-I CBT (Qualifying, 0.50 negative) + Tier-II CBT (Math, Reasoning, English, GA, Computer Knowledge + DEST Typing); MTS: Session-I (No negative) + Session-II (GA & English, 1 mark negative); GD: CBT + PST/PET.',
    pst_pet_skill_norms: 'CGL/CHSL DEST: 2,000 key depressions in 15 mins / 35 wpm English typing; GD Constable PET: 5 km in 24 mins (Men) / 1.6 km in 8.5 mins (Women), Height 170 cm / 157 cm (ST relaxation).',
    documents_checklist: 'Aadhaar/Voter ID, 10th/12th/Degree/Diploma Certificates, Central Format OBC-NCL / EWS / SC / ST Certificate, SSC OTR Printout (ssc.gov.in).',
    application_steps: '1. Complete new OTR at ssc.gov.in with live webcam photo capture. 2. Select Odisha centres (Bhubaneswar, Cuttack, Sambalpur, Berhampur, Balasore, Rourkela). 3. Pay ₹100 fee (exempted for Women/SC/ST/PwBD/ESM).',
    official_portal_url: 'https://ssc.gov.in/',
    qualification_tag: '10th / 12th / Diploma / Graduate',
    vacancies: '15,000–40,000+ Central Posts',
    summary: 'SSC CGL, CHSL, MTS, GD Constable & JE guide for Odisha candidates covering Eastern Region CBT centres, Odia medium in MTS/GD, 7th CPC pay levels, and ssc.gov.in live-photo OTR.',
    tags: ['SSC', 'CGL', 'CHSL', 'MTS', 'GD Constable', 'SSC JE', 'Eastern Region']
  },
  {
    id: 'ji-jr-rrb-ecor',
    slug: 'rrb-ntpc-group-d-alp-technician-je-east-coast-railway',
    folderHints: ['indian railways', 'ssc-east-coast-railway'],
    title: 'RRB NTPC, Group D (Level-1), ALP, Technician & JE (East Coast Railway — Odisha)',
    title_or: 'ଆରଆରବି NTPC, ଗ୍ରୁପ୍-D, ALP, ଟେକ୍ନିସିଆନ୍ ଏବଂ JE (ପୂର୍ବତଟ ରେଳପଥ — ଭୁବନେଶ୍ୱର, ଖୋର୍ଦ୍ଧା, ସମ୍ବଲପୁର)',
    conducting_body: 'Railway Recruitment Board (RRB Bhubaneswar) / RRC ECoR',
    exam_code: 'RRB CEN (NTPC / Level-1 / ALP / Tech / JE)',
    cadre_group: 'Central Railway Group C & Level-1 Posts (East Coast Railway)',
    pay_matrix: 'NTPC Graduate & JE: 7th CPC Level-5/6 (₹29,200–₹35,400); ALP & Tech: Level-2/5 (₹19,900–₹29,200); Group D: Level-1 (₹18,000–₹56,900) + Running/Night Duty Allowances.',
    age_limit_relaxation: '18–30/33/36 yrs (varies by CEN). +3 yrs OBC, +5 yrs SC/ST, +10 yrs PwBD.',
    qualification_odia_rule: 'Group D: 10th + ITI/NAC; ALP: 10th + ITI or Diploma/B.Tech; Technician: 10th + ITI or +2 PCM; NTPC: 12th / Graduate; JE: Diploma/B.Tech. Odia language CBT option available.',
    selection_stages: 'CBT-1 (Screening, 1/3rd negative) + CBT-2 (Merit, 1/3rd negative) + CBAT Psycho Test (for ALP & Station Master) / Typing Skill Test (NTPC) + PET (Group D: 1 km run + 35 kg weight carry) + Document Verification & Medical.',
    pst_pet_skill_norms: 'Strict Railway Medical Standards: A-1 (6/6 vision without glasses for ALP), A-2 (Station Master), B-1/C-1 for Tech/Clerical. Group D PET: 35 kg lift 100 m in 2 mins + 1000 m run in 4m15s (Men).',
    documents_checklist: '10th/12th/ITI/Diploma/Degree Certificates, Central OBC-NCL/SC/ST/EWS Certificate, Medical Fitness/Vision Proof, RRB Application Form, EBC Fee Waiver Certificate (if opted).',
    application_steps: '1. Create RRB Common Account at rrbapply.gov.in. 2. Select RRB Bhubaneswar (ECoR: Khordha Road, Sambalpur, Waltair divisions) or Bilaspur (Jharsuguda/Rourkela). 3. Choose Odia CBT language & submit.',
    official_portal_url: 'https://www.rrbbbs.gov.in/',
    qualification_tag: '10th + ITI / 12th / Diploma / Graduate',
    vacancies: 'East Coast Railway (Odisha Divisions)',
    summary: 'RRB Bhubaneswar & East Coast Railway recruitment handbook for NTPC, Group D, ALP, Technician, and JE covering 7th CPC pay, Odia CBT medium, A-1/A-2 medical norms, and PET standards.',
    tags: ['RRB', 'East Coast Railway', 'NTPC', 'Group D', 'ALP', 'Bhubaneswar']
  },
  {
    id: 'ji-jr-banking-ibps-sbi-rbi',
    slug: 'ibps-po-clerk-rrb-sbi-rbi-odia-lpt-handbook',
    folderHints: ['banking, finance and insurance', 'banking-it-private-sector'],
    title: 'IBPS PO/Clerk/SO/RRB, SBI PO/Clerk & RBI Grade B / Assistant (with Odia LPT)',
    title_or: 'ଆଇବିପିଏସ PO/କ୍ଲର୍କ/RRB, SBI ଏବଂ RBI ଗ୍ରେଡ୍-B / ଆସିଷ୍ଟାଣ୍ଟ (ଓଡ଼ିଆ ଭାଷା ଦକ୍ଷତା ପରୀକ୍ଷା)',
    conducting_body: 'IBPS / State Bank of India (SBI) / Reserve Bank of India (RBI)',
    exam_code: 'IBPS CRP / SBI PO-JA / RBI Grade B-Asst',
    cadre_group: 'Public Sector Bank Officer (Scale-I) & Clerical Cadres',
    pay_matrix: 'Bank PO (12th Bipartite): Basic ₹48,480 (Gross ~₹78,000–₹85,000/month); Bank Clerk: Basic ₹24,050 (Gross ~₹42,000/month); RBI Grade B: Basic ₹55,200 (Gross ~₹1.25 Lakh+/month).',
    age_limit_relaxation: 'PO/Clerk: 20–28/30 yrs; RBI Grade B: 21–30 yrs. +3 yrs OBC, +5 yrs SC/ST, +10 yrs PwBD.',
    qualification_odia_rule: 'Bachelor’s degree in any stream (60% for RBI Grade B). For IBPS Clerk, IBPS RRB (Odisha Gramya Bank / Utkal Grameen Bank), SBI JA, and RBI Assistant (Bhubaneswar), Odia Local Language Proficiency Test (LPT) is mandatory unless 10th/12th studied Odia.',
    selection_stages: 'Prelims (100 marks: English, Quant, Reasoning — 0.25 negative) -> Mains (Reasoning, Quant/DI, General/Financial Awareness, English + Descriptive) -> Interview (PO/Scale-I) or Odia LPT (Clerk/JA/Assistant).',
    pst_pet_skill_norms: 'Odia LPT: Reading Odia newspaper passage, writing a short Odia paragraph, and conversational comprehension before bank panel at Bhubaneswar Circle Office.',
    documents_checklist: '10th/12th/Degree Marksheets (showing Odia language if exempt from LPT), Central OBC-NCL/SC/ST/EWS Certificate, CIBIL/Credit history hygiene (no loan default), Call Letter & ID Proof.',
    application_steps: '1. Apply at ibps.in, sbi.co.in/careers, or opportunities.rbi.org.in. 2. Select Odisha State/Circle for state-wise Clerk/RRB/RBI Assistant vacancies. 3. Upload handwritten declaration & thumb impression.',
    official_portal_url: 'https://www.ibps.in/',
    qualification_tag: 'Graduate (Any Stream) + Odia LPT',
    vacancies: 'Odisha Circle & All-India Banks',
    summary: 'Banking & RBI handbook for Odisha aspirants covering IBPS PO/Clerk/RRB (Odisha Gramya Bank), SBI, and RBI Grade B/Assistant with 12th Bipartite pay and Odia Local Language Proficiency Test (LPT) rules.',
    tags: ['IBPS', 'SBI', 'RBI', 'Banking', 'Odia LPT', 'Odisha Gramya Bank']
  },
  {
    id: 'ji-jr-defence-agniveer',
    slug: 'defence-agniveer-army-navy-chilka-iaf-coast-guard',
    folderHints: ['defence and armed forces', 'central-government-psu'],
    title: 'Defence & Paramilitary (Army Agniveer ARO Cuttack/Sambalpur/Gopalpur, Navy INS Chilka, IAF, Coast Guard)',
    title_or: 'ପ୍ରତିରକ୍ଷା ଓ ଅଗ୍ନିବୀର ନିଯୁକ୍ତି (ARO କଟକ/ସମ୍ବଲପୁର/ଗୋପାଳପୁର, ନୌସେନା INS ଚିଲିକା, ବାୟୁସେନା, ତଟରକ୍ଷୀ)',
    conducting_body: 'Indian Army / Indian Navy / Indian Air Force / Indian Coast Guard',
    exam_code: 'Agniveer GD/Tech/Clerk, SSR/MR, IAF Vayu, ICG Navik',
    cadre_group: 'Agniveer (4-Year + 25% Regular Cadre) & Permanent Enrolled/Officer Entries',
    pay_matrix: 'Agniveer Package: Year-1 ₹30,000 to Year-4 ₹40,000 + Seva Nidhi ₹10.04 Lakh tax-free exit corpus + 10% reservation in CAPF/Odisha Police/PSUs.',
    age_limit_relaxation: 'Agniveer: 17.5–21 years; Coast Guard Navik: 18–22 years (+3 yrs OBC, +5 yrs SC/ST for ICG).',
    qualification_odia_rule: 'Agniveer GD/Tradesman: 10th (45% aggregate, 33% each subject); Technical: 10+2 PCM (50%); Clerk/SKT: 10+2 (60%); Navy SSR: 10+2 Maths/Physics. Odia CBT medium available in Army CEE.',
    selection_stages: 'Phase-1 Online Common Entrance Exam (CEE — 0.25 negative) -> Phase-2 Recruitment Rally (1.6 km run, Pull-ups, 9-ft Ditch, Zig-Zag Balance, Physical Measurement) -> Phase-3 Medical Board & INS Chilka / Training Centre Reporting.',
    pst_pet_skill_norms: 'Army Odisha Height: 169 cm (GD/Tech), 162 cm (Clerk), 162 cm (ST); 1.6 km run Group-I (<5m30s = 60 marks), Group-II (5m31s–5m45s = 48 marks); 10 Pull-ups (40 marks).',
    documents_checklist: '10th/12th Marksheets, Tahasil Domicile/Resident Certificate, Caste Certificate, Unmarried Certificate (signed by Sarpanch/Ward), Police Character Certificate, NCC A/B/C Certificate, Relation Certificate.',
    application_steps: '1. Register at joinindianarmy.nic.in (select ARO Cuttack, ARO Sambalpur, or ARO Gopalpur), joinindiannavy.gov.in, or agnipathvayu.cdac.in. 2. Pay ₹250–₹550 exam fee. 3. Appear for CEE & Rally.',
    official_portal_url: 'https://www.joinindianarmy.nic.in/',
    qualification_tag: '10th / 10+2 Pass + Physical Rally',
    vacancies: 'ARO Cuttack / Sambalpur / Gopalpur',
    summary: 'Defence & Agniveer handbook for Odisha youths covering Army ARO Cuttack/Sambalpur/Gopalpur rallies, Navy SSR/MR (INS Chilka), IAF Vayu, and Coast Guard Paradip with Seva Nidhi & 1.6 km PET norms.',
    tags: ['Agniveer', 'Indian Army', 'INS Chilka', 'ARO Cuttack', 'Coast Guard', 'Defence']
  },
  {
    id: 'ji-jr-odisha-central-psus',
    slug: 'odisha-state-and-central-psus-nalco-mcl-sail-omc-optcl',
    folderHints: ['odisha-psus-nalco-mcl', 'odisha public-sector undertakings', 'central public-sector enterprises'],
    title: 'Odisha State & Central PSUs (NALCO, MCL, SAIL Rourkela, HAL Sunabeda, OMC, OHPC, OPTCL, Paradip Port)',
    title_or: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରୀୟ PSU (NALCO, MCL, SAIL ରାଉରକେଲା, HAL ସୁନାବେଡ଼ା, OMC, OHPC, OPTCL, ପାରାଦୀପ)',
    conducting_body: 'NALCO / MCL / SAIL RSP / HAL / OMC / OPTCL / OHPC / GRIDCO / PPA',
    exam_code: 'PSU GET / MT / Diploma Trainee / ITI Technician / Apprentice',
    cadre_group: 'Executive (E-1/E-2) & Non-Executive (S-1/Technician/Operator) PSU Cadres',
    pay_matrix: 'Central Maharatna/Navratna GET (E-1/E-2): ₹50,000–₹1,60,000 / ₹60,000–₹1,80,000 (CTC ₹13–18 LPA); State PSU MT (OMC/OPTCL/OHPC): ₹56,100–₹1,77,500; Non-Exec Tech/Jr. Engg: ₹29,500–₹92,300.',
    age_limit_relaxation: 'GET/MT: 27–30/32 yrs; Non-Executive: 18–32/38 yrs (State PSUs follow Odisha 38 yrs). +3 yrs OBC, +5 yrs SC/ST/SEBC (State), +10 yrs PwBD.',
    qualification_odia_rule: 'GET: B.Tech (65%+) + GATE Score; Non-Exec: 10th + ITI (NCVT) / 3-yr Diploma; OMC/OPTCL/OHPC State PSUs require Odia ME/HSC pass and Odisha Employment Exchange / Domicile compliance for Non-Exec.',
    selection_stages: 'Executive (GET/MT): GATE Score or PSU CBT (Technical + Aptitude) + Group Discussion & Personal Interview; Non-Executive (ACT/OCT/Jr. Tech): Written CBT (Technical 70% + Aptitude 30%) + Trade/Skill Test & Medical.',
    pst_pet_skill_norms: 'Trade Skill Test (Electrical/Fitter/Welder/Mining Sirdar/Overman statutory competency certificate under DGMS for MCL & OMC).',
    documents_checklist: '10th, ITI (NCVT) / Diploma / B.Tech Certificates, GATE Scorecard (if applicable), DGMS Mining Sirdar/Overman/Blaster Certificate (MCL/OMC), Valid Caste/Resident Certificate, Land Displaced (R&R) Certificate if applicable.',
    application_steps: '1. Apply directly on official PSU portals: nalcoindia.com, mahanadicoal.in, sailcareers.com, hal-india.co.in, omcltd.in, optcl.co.in, ohpcltd.com, paradipport.gov.in. 2. Verify Advt No. before paying any fee.',
    official_portal_url: 'https://omcltd.in/',
    qualification_tag: '10th+ITI / Diploma / B.Tech + GATE',
    vacancies: 'Odisha Plants & State Energy/Mining',
    summary: 'Exhaustive handbook for NALCO, MCL, SAIL Rourkela, HAL Sunabeda, OMC, OHPC, OPTCL, GRIDCO & Paradip Port covering E-1/E-2 & Non-Executive pay scales, GATE/CBT selection, and DGMS/Odia norms.',
    tags: ['NALCO', 'MCL', 'SAIL Rourkela', 'HAL', 'OMC', 'OPTCL', 'OHPC', 'PSU']
  }
];

export async function enrichJobsRecruitmentCategory01(db, now) {
  if (!db) return { foldersUpdated: 0, itemsUpserted: 0 };
  const ts = now || new Date().toISOString();

  // 1. Fetch all folders in Category #01 (jobs-recruitment)
  const foldersRes = await db
    .prepare("SELECT * FROM jobs_directory_folders WHERE domain_slug = 'jobs-recruitment' ORDER BY depth ASC, sort_order ASC, title ASC")
    .all();
  const folders = foldersRes.results || [];
  const folderById = new Map(folders.map(f => [f.id, f]));

  const folderStmts = [];
  for (const f of folders) {
    if (isCustomAdminEdit(f)) continue;

    const key = String(f.title || '').trim().toLowerCase();
    const parent = f.parent_id ? folderById.get(f.parent_id) : null;
    const spec = CAT01_FOLDER_ENRICHMENTS[key] || buildSmartFolderEnrichment(f, parent ? parent.title : '');

    const needsEn = isGenericOrShort(f.description_en) || isGenericOrShort(f.description);
    const needsOr = isGenericOrShort(f.description_or);
    const needsTitleOr = !String(f.title_or || '').trim();
    const needsBadge = !String(f.featured_badge || f.hero_badge || '').trim();
    const needsSeoTitle = !String(f.seo_title || '').trim();
    const needsSeoDesc = isGenericOrShort(f.seo_description);
    const needsVerified = !String(f.verified_at || '').trim();

    if (!needsEn && !needsOr && !needsTitleOr && !needsBadge && !needsSeoTitle && !needsSeoDesc && !needsVerified) {
      continue;
    }

    const nextDescEn = isGenericOrShort(f.description_en)
      ? (isGenericOrShort(f.description) ? spec.en : f.description)
      : f.description_en;
    const nextDesc = isGenericOrShort(f.description) ? nextDescEn : f.description;
    const nextDescOr = needsOr ? spec.or : f.description_or;
    const nextTitleOr = needsTitleOr ? spec.title_or : f.title_or;
    const nextBadge = String(f.featured_badge || f.hero_badge || spec.badge).trim();
    const nextSeoTitle = needsSeoTitle ? `${f.title} (${nextBadge}) — CSOdisha Jobs` : f.seo_title;
    const nextSeoDesc = needsSeoDesc ? nextDescEn.slice(0, 300) : f.seo_description;
    const nextVerifiedAt = f.verified_at || ts;

    folderStmts.push(
      db.prepare(`UPDATE jobs_directory_folders
        SET description = ?, description_en = ?, description_or = ?, title_or = ?,
            hero_badge = ?, featured_badge = ?, seo_title = ?, seo_description = ?,
            verified_at = ?, updated_by = 'cat01-enrich', updated_at = ?
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

  // 2. Resolve best target folder for each of the 18 minute recruitment handbooks
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
    return folders[0]?.id || 'jf-jr-odisha-govt';
  }

  const existingItemsRes = await db
    .prepare("SELECT id, slug, updated_by FROM jobs_directory_items WHERE domain_slug = 'jobs-recruitment'")
    .all();
  const existingById = new Map((existingItemsRes.results || []).map(r => [r.id, r]));
  const existingBySlug = new Map((existingItemsRes.results || []).map(r => [r.slug, r]));

  const itemStmts = [];
  for (const hb of CAT01_HANDBOOKS) {
    const folderId = pickFolderId(hb.folderHints);
    const existing = existingById.get(hb.id) || existingBySlug.get(hb.slug);
    if (existing && existing.updated_by && !SYSTEM_AUTHORS.has(String(existing.updated_by).toLowerCase())) {
      // Respect custom admin edits
      continue;
    }

    const bodyHtml = [
      `<h2>${hb.title}</h2>`,
      `<p><strong>ଓଡ଼ିଆ ସାରାଂଶ:</strong> ${hb.title_or} — ${hb.conducting_body}</p>`,
      `<ul>`,
      `<li><strong>Conducting Body &amp; Exam Code:</strong> ${hb.conducting_body} (${hb.exam_code})</li>`,
      `<li><strong>Cadre &amp; Service Group:</strong> ${hb.cadre_group}</li>`,
      `<li><strong>Pay Matrix &amp; In-Hand Breakdown:</strong> ${hb.pay_matrix}</li>`,
      `<li><strong>Age Limit &amp; Odisha Category Relaxations:</strong> ${hb.age_limit_relaxation}</li>`,
      `<li><strong>Educational &amp; Odia Language Qualification:</strong> ${hb.qualification_odia_rule}</li>`,
      `<li><strong>Multi-Stage Selection Pattern:</strong> ${hb.selection_stages}</li>`,
      `<li><strong>PST/PET or Computer Skill Norms:</strong> ${hb.pst_pet_skill_norms}</li>`,
      `<li><strong>Mandatory Documents Checklist:</strong> ${hb.documents_checklist}</li>`,
      `<li><strong>Step-by-Step OTR &amp; Online Application:</strong> ${hb.application_steps}</li>`,
      `</ul>`
    ].join('');

    if (existing) {
      itemStmts.push(
        db.prepare(`UPDATE jobs_directory_items
          SET folder_id = ?, title = ?, title_or = ?, recruiting_body = ?, conducting_body = ?,
              exam_code = ?, cadre_group = ?, pay_matrix = ?, age_limit_relaxation = ?,
              qualification_odia_rule = ?, selection_stages = ?, pst_pet_skill_norms = ?,
              documents_checklist = ?, application_steps = ?, official_apply_url = ?,
              official_portal_url = ?, qualification_tag = ?, vacancies = ?,
              tags_json = ?, language = 'EN+OR', status = 'published', featured = 1,
              summary = ?, body_html = ?, seo_title = ?, seo_description = ?,
              verified_by = 'cat01-enrich@csodisha.com', verified_at = ?,
              updated_by = 'cat01-enrich', updated_at = ?
          WHERE id = ?`)
          .bind(
            folderId, hb.title, hb.title_or, hb.conducting_body, hb.conducting_body,
            hb.exam_code, hb.cadre_group, hb.pay_matrix, hb.age_limit_relaxation,
            hb.qualification_odia_rule, hb.selection_stages, hb.pst_pet_skill_norms,
            hb.documents_checklist, hb.application_steps, hb.official_portal_url,
            hb.official_portal_url, hb.qualification_tag, hb.vacancies,
            JSON.stringify(hb.tags), hb.summary, bodyHtml,
            `${hb.title} | CSOdisha`.slice(0, 160), hb.summary.slice(0, 300),
            ts, ts, existing.id
          )
      );
    } else {
      itemStmts.push(
        db.prepare(`INSERT OR IGNORE INTO jobs_directory_items
          (id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body, conducting_body,
           exam_code, cadre_group, pay_matrix, age_limit_relaxation, qualification_odia_rule,
           selection_stages, pst_pet_skill_norms, documents_checklist, application_steps,
           qualification_tag, vacancies, official_apply_url, official_portal_url,
           cover_image_url, cover_image_alt, attachments_json, links_json, tags_json,
           language, status, featured, summary, body_html, seo_title, seo_description,
           verified_by, verified_at, state_location, created_by, updated_by, created_at, updated_at)
          VALUES (?, 'jobs-recruitment', ?, ?, ?, ?, 'job-notification', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, 'EN+OR', 'published', 1, ?, ?, ?, ?, 'cat01-enrich@csodisha.com', ?, 'Odisha', 'cat01-enrich', 'cat01-enrich', ?, ?)`)
          .bind(
            hb.id, folderId, hb.title, hb.title_or, hb.slug,
            hb.conducting_body, hb.conducting_body, hb.exam_code, hb.cadre_group,
            hb.pay_matrix, hb.age_limit_relaxation, hb.qualification_odia_rule,
            hb.selection_stages, hb.pst_pet_skill_norms, hb.documents_checklist,
            hb.application_steps, hb.qualification_tag, hb.vacancies,
            hb.official_portal_url, hb.official_portal_url,
            JSON.stringify(hb.tags), hb.summary, bodyHtml,
            `${hb.title} | CSOdisha`.slice(0, 160), hb.summary.slice(0, 300),
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
