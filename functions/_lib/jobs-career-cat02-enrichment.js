// Category #02 (v69): Exhaustive Minute Bilingual Enrichment of Career Explorer (127 Subcategories + 16 Career Roadmaps)
// Idempotent D1 enrichment routine invoked by ensureJobsDirectoryStudioSchema(db).

const SYSTEM_AUTHORS = new Set(['seed', 'legacy-bridge', 'system', 'cat01-enrich', 'cat02-enrich', '']);

function isGenericOrShort(val) {
  const s = String(val || '').trim();
  return s.length < 140;
}

function isCustomAdminEdit(row) {
  const updater = String(row?.updated_by || '').trim().toLowerCase();
  if (!updater || SYSTEM_AUTHORS.has(updater)) return false;
  return !isGenericOrShort(row?.description_en || row?.description) && !isGenericOrShort(row?.description_or);
}

// Tailored bilingual metadata for Category #02 (Career Explorer) depth-1 & key depth-2 folders
const CAT02_FOLDER_ENRICHMENTS = {
  'civil services & public administration': {
    title_or: 'ସିଭିଲ୍ ସର୍ଭିସ୍ ଏବଂ ଲୋକ ପ୍ରଶାସନ',
    badge: 'GOVERNANCE',
    en: 'Structured career roadmaps for UPSC Civil Services (IAS, IPS, IFS) and OPSC Odisha Civil Services (OAS, OFS, OPS, ORS), detailing academic entry paths, Odisha posting realities, ORSP/7th CPC pay, and 15-year promotion ladders.',
    or: 'ସିଭିଲ୍ ସର୍ଭିସ୍ ଓ ଲୋକ ପ୍ରଶାସନ କ୍ୟାରିୟର ମାର୍ଗଦର୍ଶିକା: IAS, IPS, IFS ଏବଂ ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସ୍ (OAS, OFS, OPS, ORS) ପାଇଁ ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା, ଓଡ଼ିଶା ଜିଲ୍ଲା ପୋଷ୍ଟିଂ ଏବଂ ୧୫ ବର୍ଷୀୟ ପଦୋନ୍ନତି ସୋପାନ।'
  },
  'engineering, it & digital careers': {
    title_or: 'ଇଞ୍ଜିନିୟରିଂ, ଆଇଟି ଏବଂ ଡିଜିଟାଲ୍ କ୍ୟାରିୟର',
    badge: 'TECH & STEM',
    en: 'Comprehensive career pathways across Software Engineering, AI/Data Science, Cloud Architecture, Semiconductor/VLSI, and Core Mechanical/Mining/Power Engineering in Bhubaneswar IT hubs, Rourkela, Angul, and global tech ecosystems.',
    or: 'ଇଞ୍ଜିନିୟରିଂ, ଆଇଟି ଏବଂ ଡିଜିଟାଲ୍ କ୍ୟାରିୟର: ଭୁବନେଶ୍ୱର IT ପାର୍କ ଏବଂ ରାଉରକେଲା/ଅନୁଗୁଳ ଶିଳ୍ପାଞ୍ଚଳରେ ସଫ୍ଟୱେର, AI/ଡାଟା ସାଇନ୍ସ, କ୍ଲାଉଡ୍, ଖଣି, ଧାତୁ ଓ ଶକ୍ତି ଇଞ୍ଜିନିୟରିଂ କ୍ୟାରିୟର ସୂଚନା।'
  },
  'healthcare, teaching & skilled trades': {
    title_or: 'ସ୍ୱାସ୍ଥ୍ୟସେବା, ଶିକ୍ଷାଦାନ ଏବଂ କୁଶଳୀ ବୃତ୍ତି',
    badge: 'ESSENTIAL SECTORS',
    en: 'End-to-end career roadmaps for MBBS/MD, BDS, AYUSH, B.Sc Nursing, Pharmacy, Allied Diagnostics, School/University Teaching (OTET/OSSTET/UGC-NET), and high-demand World Skill Center / OSDA skilled technical trades in Odisha.',
    or: 'ସ୍ୱାସ୍ଥ୍ୟସେବା, ଶିକ୍ଷାଦାନ ଏବଂ କୁଶଳୀ ବୃତ୍ତି: MBBS, ନର୍ସିଂ, ଫାର୍ମାସୀ, ପାରାମେଡିକାଲ୍, ବିଦ୍ୟାଳୟ/ବିଶ୍ୱବିଦ୍ୟାଳୟ ଶିକ୍ଷକତା (OTET/NET) ଏବଂ ୱାର୍ଲ୍ଡ ସ୍କିଲ୍ ସେଣ୍ଟର ଦକ୍ଷତା କ୍ୟାରିୟର ମାର୍ଗଦର୍ଶିକା।'
  },
  'careers by educational qualification': {
    title_or: 'ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା ଅନୁଯାୟୀ କ୍ୟାରିୟର',
    badge: 'BY QUALIFICATION',
    en: 'Qualification-mapped career explorer helping Odisha students choose optimal tracks after Class 10, +2 Science/Commerce/Arts, ITI/Polytechnic Diploma, Graduation, Postgraduate, PhD, and professional licensing exams.',
    or: 'ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା ଅନୁଯାୟୀ କ୍ୟାରିୟର: ଦଶମ, +୨ (କଳା/ବିଜ୍ଞାନ/ବାଣିଜ୍ୟ), ITI/ଡିପ୍ଲୋମା, ସ୍ନାତକ, ସ୍ନାତକୋତ୍ତର, PhD ଏବଂ ବୃତ୍ତିଗତ ଯୋଗ୍ୟତା ପରେ ଉପଲବ୍ଧ ଶ୍ରେଷ୍ଠ କ୍ୟାରିୟର ପଥ।'
  },
  'careers by stream and subject': {
    title_or: 'ବିଭାଗ ଏବଂ ବିଷୟ ଅନୁଯାୟୀ କ୍ୟାରିୟର',
    badge: 'BY STREAM',
    en: 'Stream-by-stream career blueprint covering Arts & Humanities, Pure Sciences, Commerce & CA/CMA/CS, Engineering & Tech, Medical & Allied Health, Agriculture & Rural Studies, Management, and Creative Communication.',
    or: 'ବିଭାଗ ଏବଂ ବିଷୟ ଅନୁଯାୟୀ କ୍ୟାରିୟର: କଳା, ବିଜ୍ଞାନ, ବାଣିଜ୍ୟ (CA/CMA/CS), ଇଞ୍ଜିନିୟରିଂ, ଚିକିତ୍ସା ବିଜ୍ଞାନ, କୃଷି, ପରିଚାଳନା ଏବଂ ସୃଜନଶୀଳ ଗଣମାଧ୍ୟମ କ୍ଷେତ୍ରର ବିସ୍ତୃତ କ୍ୟାରିୟର ରୋଡମ୍ୟାପ୍।'
  },
  'careers by sector and occupation': {
    title_or: 'କ୍ଷେତ୍ର ଏବଂ ବୃତ୍ତି ଅନୁଯାୟୀ କ୍ୟାରିୟର',
    badge: 'BY SECTOR',
    en: 'Cross-sector career encyclopedia spanning Government, Education, Banking/FinTech, Healthcare, Infrastructure, R&D, IT, Law/Judiciary, Agriculture/Forestry, Climate, Media, Aviation/Maritime, Hospitality, Sports, and Emerging Tech.',
    or: 'କ୍ଷେତ୍ର ଏବଂ ବୃତ୍ତି ଅନୁଯାୟୀ କ୍ୟାରିୟର: ସରକାରୀ ପ୍ରଶାସନ, ଶିକ୍ଷା, ବ୍ୟାଙ୍କିଂ, ସ୍ୱାସ୍ଥ୍ୟ, ଶିଳ୍ପ, ଗବେଷଣା, ଆଇନ, କୃଷି, ଜଳବାୟୁ, ଗଣମାଧ୍ୟମ, ବିମାନ ଚଳାଚଳ, ପର୍ଯ୍ୟଟନ ଏବଂ ଭବିଷ୍ୟତର କ୍ୟାରିୟର।'
  },
  'government career pathways': {
    title_or: 'ସରକାରୀ କ୍ୟାରିୟର ପଥ',
    badge: 'GOVT PATHWAYS',
    en: 'Long-term public service career ladders across IAS/OAS, SSC, Public Sector Banks, Indian Railways (ECoR), Defence & Police, State/Central Teaching, Medical Cadres, PSUs, Judiciary, Revenue, and Urban/Rural Local Bodies.',
    or: 'ସରକାରୀ କ୍ୟାରିୟର ପଥ: IAS/OAS, SSC, ବ୍ୟାଙ୍କିଂ, ରେଳବାଇ, ପ୍ରତିରକ୍ଷା, ପୋଲିସ୍, ଶିକ୍ଷା, ସ୍ୱାସ୍ଥ୍ୟ, PSU, ନ୍ୟାୟପାଳିକା, ରାଜସ୍ୱ ଏବଂ ପଞ୍ଚାୟତ/ପୌର ପ୍ରଶାସନରେ ଦୀର୍ଘକାଳୀନ କ୍ୟାରିୟର ସୋପାନ।'
  },
  'private and professional career pathways': {
    title_or: 'ବେସରକାରୀ ଏବଂ ବୃତ୍ତିଗତ କ୍ୟାରିୟର ପଥ',
    badge: 'PRIVATE & PRO',
    en: 'Corporate, licensed-professional, and modern work pathways including fresher campus tracks, CA/Law/Architecture practice, corporate management, IT/digital roles, remote/hybrid careers, reskilling, and return-to-work programs.',
    or: 'ବେସରକାରୀ ଓ ବୃତ୍ତିଗତ କ୍ୟାରିୟର ପଥ: କର୍ପୋରେଟ୍ ପରିଚାଳନା, CA/ଆଇନ/ଆର୍କିଟେକ୍ଚର, ଆଇଟି/ଡିଜିଟାଲ୍, ଫ୍ରିଲାନ୍ସିଂ, ରିମୋଟ୍ କାମ, ପୁନଃ-ଦକ୍ଷତା ତାଲିମ ଏବଂ ନେତୃତ୍ୱ କ୍ୟାରିୟର ମାର୍ଗଦର୍ଶିକା।'
  },
  'international career pathways': {
    title_or: 'ଆନ୍ତର୍ଜାତୀୟ କ୍ୟାରିୟର ପଥ',
    badge: 'GLOBAL CAREERS',
    en: 'Global career pathways for Odisha professionals across multinational corporations, overseas healthcare/nursing, engineering/IT, international teaching, UN/multilateral agencies, global research fellowships, and verified work visas.',
    or: 'ଆନ୍ତର୍ଜାତୀୟ କ୍ୟାରିୟର ପଥ: ବହୁରାଷ୍ଟ୍ରୀୟ କମ୍ପାନୀ, ବିଦେଶୀ ସ୍ୱାସ୍ଥ୍ୟସେବା/ନର୍ସିଂ, ଇଞ୍ଜିନିୟରିଂ/IT, ଆନ୍ତର୍ଜାତୀୟ ଶିକ୍ଷାଦାନ, UN/NGO ସଂସ୍ଥା, ଗବେଷଣା ଫେଲୋସିପ୍ ଏବଂ ସୁରକ୍ଷିତ ୱର୍କ ଭିସା ସୂଚନା।'
  },
  'skilled migration and overseas settlement pathways': {
    title_or: 'ଦକ୍ଷ ପ୍ରବାସ ଏବଂ ବିଦେଶୀ ବସତି ପଥ',
    badge: 'MIGRATION & VISA',
    en: 'Transparent guide to global points-based skilled migration, employer-sponsored routes, WES/IQAS credential evaluation, IELTS/OET/PTE language benchmarks, MEA e-Migrate agent verification, and overseas worker rights.',
    or: 'ଦକ୍ଷ ପ୍ରବାସ ଏବଂ ବିଦେଶୀ ବସତି: ପଏଣ୍ଟ-ଆଧାରିତ ଭିସା, ନିଯୁକ୍ତିଦାତା ପ୍ରାୟୋଜିତ ପଥ, WES ଶିକ୍ଷାଗତ ମୂଲ୍ୟାଙ୍କନ, IELTS/OET ପରୀକ୍ଷା, MEA e-Migrate ଏଜେଣ୍ଟ ଯାଞ୍ଚ ଏବଂ ବିଦେଶୀ ଶ୍ରମିକ ସୁରକ୍ଷା।'
  },
  'research, academic and teaching careers': {
    title_or: 'ଗବେଷଣା, ଶିକ୍ଷାଦାନ ଏବଂ ଏକାଡେମିକ୍ କ୍ୟାରିୟର',
    badge: 'ACADEMIA & R&D',
    en: 'Complete academic trajectory from School Teacher, Higher Secondary PGT, College Lecturer, and Assistant Professor to University Faculty, PhD/Postdoctoral Researcher (NISER, IIT, NIT, Utkal), EdTech, and Grant Leadership.',
    or: 'ଗବେଷଣା ଓ ଏକାଡେମିକ୍ କ୍ୟାରିୟର: ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ, PGT, କଲେଜ ଅଧ୍ୟାପକ, ସହକାରୀ ପ୍ରଫେସର, PhD/ପୋଷ୍ଟଡକ୍ଟରାଲ୍ ଗବେଷକ (NISER, IIT, NIT, ଉତ୍କଳ), EdTech ଏବଂ ଗବେଷଣା ଅନୁଦାନ ନେତୃତ୍ୱ।'
  },
  'entrepreneurship and self-employment': {
    title_or: 'ଉଦ୍ୟମିତା ଏବଂ ସ୍ୱୟଂ ନିଯୁକ୍ତି',
    badge: 'STARTUP ODISHA',
    en: 'Founder and MSME career guide covering Startup Odisha / O-Hub incubation, MSME/PMEGP/MUDRA financing, Agri-business, Handloom/Craft exports, EdTech/Digital agencies, Social Enterprises, and Udyam/GST compliance.',
    or: 'ଉଦ୍ୟମିତା ଓ ସ୍ୱୟଂ ନିଯୁକ୍ତି: Startup Odisha / O-Hub ଇନକ୍ୟୁବେସନ୍, MSME/PMEGP/MUDRA ଋଣ, କୃଷି-ବ୍ୟବସାୟ, ହସ୍ତତନ୍ତ ରପ୍ତାନି, ଡିଜିଟାଲ୍ ସେବା, ସାମାଜିକ ଉଦ୍ୟୋଗ ଏବଂ ଉଦ୍ୟମ/GST ପଞ୍ଜୀକରଣ।'
  }
};

function buildSmartCareerFolderEnrichment(folder, parentTitle) {
  const title = String(folder.title || '').trim();
  const hay = `${title} ${parentTitle || ''} ${folder.slug || ''}`.toLowerCase();

  let badge = 'CAREER GUIDE';
  let en = '';
  let or = '';

  if (hay.includes('migration') || hay.includes('visa') || hay.includes('overseas') || hay.includes('abroad') || hay.includes('credential') || hay.includes('settlement') || hay.includes('united nations') || hay.includes('country-specific')) {
    badge = 'GLOBAL PATH';
    en = `Step-by-step career roadmap for ${title}, detailing international qualification recognition, language benchmarks, verified employer/visa pathways, compensation ranges, and MEA e-Migrate safety norms for Odisha candidates.`;
    or = `${title} କ୍ୟାରିୟର ପଥ: ଓଡ଼ିଶାର ପ୍ରାର୍ଥୀଙ୍କ ପାଇଁ ଆନ୍ତର୍ଜାତୀୟ ଯୋଗ୍ୟତା ସ୍ୱୀକୃତି, ଭାଷା ପରୀକ୍ଷା ମାନଦଣ୍ଡ, ସୁରକ୍ଷିତ ୱର୍କ ଭିସା ପଥ, ବେତନ ଢାଞ୍ଚା ଏବଂ MEA e-Migrate ସୁରକ୍ଷା ନିୟମାବଳୀ।`;
  } else if (hay.includes('research') || hay.includes('phd') || hay.includes('postdoctoral') || hay.includes('teacher') || hay.includes('professor') || hay.includes('lecturer') || hay.includes('academic') || hay.includes('curriculum')) {
    badge = 'ACADEMIA';
    en = `Academic & research career blueprint for ${title}, mapping D.El.Ed./B.Ed./NET/GATE/PhD entry routes, premier Odisha institutions (NISER, IIT Bhubaneswar, NIT Rourkela, Utkal), UGC pay levels, and 15-year progression.`;
    or = `${title} ଶିକ୍ଷା ଓ ଗବେଷଣା କ୍ୟାରିୟର: B.Ed./NET/GATE/PhD ପ୍ରବେଶ ପଥ, ଓଡ଼ିଶାର ପ୍ରମୁଖ ଶିକ୍ଷାନୁଷ୍ଠାନ (NISER, IIT, NIT, ଉତ୍କଳ), UGC ବେତନ ସ୍ତର ଏବଂ ୧୫ ବର୍ଷୀୟ ପଦୋନ୍ନତି ସୋପାନ।`;
  } else if (hay.includes('entrepreneur') || hay.includes('startup') || hay.includes('business') || hay.includes('self-employment') || hay.includes('freelancing') || hay.includes('incubation') || hay.includes('export') || hay.includes('retail')) {
    badge = 'ENTERPRISE';
    en = `Entrepreneurial roadmap for ${title} in Odisha, covering Startup Odisha / O-Hub support, MSME/PMEGP/MUDRA credit, Udyam & GST registration, unit economics, and scaling strategies from local markets to exports.`;
    or = `${title} ଉଦ୍ୟମିତା ମାର୍ଗଦର୍ଶିକା: Startup Odisha / O-Hub ସହାୟତା, MSME/PMEGP/MUDRA ଋଣ, ଉଦ୍ୟମ/GST ପଞ୍ଜୀକରଣ, ବ୍ୟବସାୟିକ ମଡେଲ୍ ଏବଂ ସ୍ଥାନୀୟ ବଜାରରୁ ରପ୍ତାନି ପର୍ଯ୍ୟନ୍ତ ବିସ୍ତାର କୌଶଳ।`;
  } else if (hay.includes('civil') || hay.includes('government') || hay.includes('ssc') || hay.includes('railway') || hay.includes('defence') || hay.includes('police') || hay.includes('judiciary') || hay.includes('revenue') || hay.includes('psu') || hay.includes('local government')) {
    badge = 'PUBLIC SERVICE';
    en = `Public-sector career progression guide for ${title}, outlining academic eligibility, UPSC/OPSC/OSSC/OSSSC/RRB entry exams, ORSP/7th CPC pay progression, field postings in Odisha, and seniority promotion ladders.`;
    or = `${title} ସରକାରୀ କ୍ୟାରିୟର ସୋପାନ: ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା, UPSC/OPSC/OSSC/OSSSC/RRB ପ୍ରବେଶ ପରୀକ୍ଷା, ORSP/7th CPC ବେତନ ବୃଦ୍ଧି, ଓଡ଼ିଶାରେ କ୍ଷେତ୍ରୀୟ ପୋଷ୍ଟିଂ ଏବଂ ପଦୋନ୍ନତି ପଥ।`;
  } else if (hay.includes('health') || hay.includes('medical') || hay.includes('nursing') || hay.includes('pharmacy')) {
    badge = 'HEALTHCARE';
    en = `Clinical & allied health career roadmap for ${title}, covering NEET/OJEE entry pathways, AIIMS Bhubaneswar & SCB/MKCG/VIMSAR training, NMC/INC/PCI licensing, Odisha vs Metro pay bands, and specialty progression.`;
    or = `${title} ସ୍ୱାସ୍ଥ୍ୟସେବା କ୍ୟାରିୟର: NEET/OJEE ପ୍ରବେଶ ପଥ, AIIMS ଭୁବନେଶ୍ୱର ଓ SCB/MKCG/VIMSAR ତାଲିମ, NMC/INC/PCI ପଞ୍ଜୀକରଣ, ବେତନ ଢାଞ୍ଚା ଏବଂ ବିଶେଷଜ୍ଞ ପଦୋନ୍ନତି ସୋପାନ।`;
  } else if (hay.includes('agriculture') || hay.includes('forestry') || hay.includes('fisheries') || hay.includes('environment') || hay.includes('rural')) {
    badge = 'AGRI & RURAL';
    en = `Sustainable sector career guide for ${title}, highlighting OUAT Bhubaneswar, ICAR, XIMB Rural Management, IFS/OFS/AHO/AFO pathways, agri-tech & climate roles, and 5-to-15 year leadership trajectories.`;
    or = `${title} କୃଷି ଓ ଗ୍ରାମ୍ୟ ବିକାଶ କ୍ୟାରିୟର: OUAT ଭୁବନେଶ୍ୱର, ICAR, XIMB ଗ୍ରାମ୍ୟ ପରିଚାଳନା, IFS/OFS/AHO ପଦବୀ, ଏଗ୍ରି-ଟେକ୍ ଓ ଜଳବାୟୁ କ୍ଷେତ୍ରର ଦୀର୍ଘକାଳୀନ କ୍ୟାରିୟର ପଥ।`;
  } else {
    en = `Minute bilingual career roadmap for ${title}, covering entry pathways (After 10th/+2/Graduation), premier Odisha & national institutions, licensing/skills, Odisha vs Metro vs Global compensation, and 5–15 year career growth.`;
    or = `${title} କ୍ୟାରିୟର ମାର୍ଗଦର୍ଶିକା: ଦଶମ/+୨/ସ୍ନାତକ ପରେ ପ୍ରବେଶ ପଥ, ଓଡ଼ିଶା ଓ ଜାତୀୟ ଶିକ୍ଷାନୁଷ୍ଠାନ, ଆବଶ୍ୟକ ଦକ୍ଷତା ଓ ପ୍ରମାଣପତ୍ର, ବେତନ ତୁଳନା ଏବଂ ୫-୧୫ ବର୍ଷର ପଦୋନ୍ନତି ସୋପାନ।`;
  }

  return {
    title_or: folder.title_or || `${title} (କ୍ୟାରିୟର ପଥ)`,
    badge,
    en,
    or
  };
}

// 16 Exhaustive Minute Bilingual Career Roadmaps (Category #02)
const CAT02_ROADMAPS = [
  {
    id: 'ji-ce-oas-roadmap',
    slug: 'oas-career-roadmap-service-ladder',
    folderHints: ['oas-group-a-roadmap', 'civil services & public administration', 'civil services and administration'],
    title: 'Civil Services & State Public Administration (IAS, IPS, IFS, OAS, OFS, OPS)',
    title_or: 'ସିଭିଲ୍ ସର୍ଭିସ୍ ଏବଂ ରାଜ୍ୟ ଲୋକ ପ୍ରଶାସନ (IAS, IPS, IFS, OAS, OFS, OPS)',
    conducting_body: 'UPSC / OPSC / GA & PG Department, Govt of Odisha',
    cadre_group: 'All India Services (Group A) & Odisha State Civil Services (Group A/B)',
    pay_matrix: '7th CPC Level-10 to Level-18 (IAS/IPS/IFS) & ORSP Level-12 to Level-16 (OAS/OFS/OPS).',
    qualification_tag: 'Any Bachelor’s Degree + UPSC CSE / OPSC OCS',
    official_portal_url: 'https://www.opsc.gov.in/',
    academic_pathways: 'After 10th/12th: Choose Arts, Science, or Commerce with strong NCERT/General Studies foundation; After Graduation: Any UGC-recognised Bachelor’s degree (BA/B.Sc/B.Com/B.Tech/MBBS) qualifies for UPSC CSE & OPSC OCS.',
    premier_institutions: 'LBSNAA Mussoorie (IAS), SVPNPA Hyderabad (IPS), IGNFA Dehradun (IFS), Gopabandhu Academy of Administration Bhubaneswar (OAS), Madhusudan Das Regional Academy of Financial Management (OFS).',
    entrance_licensing: 'UPSC Civil Services Exam (CSE) / Indian Forest Service (IFoS) & OPSC Odisha Civil Services (OCS) — Prelims, Mains & Personality Test.',
    skills_certifications: 'Constitutional law, public policy analysis, Odia & English administrative drafting, disaster management (OSDMA protocols), financial auditing, and citizen-centric leadership.',
    salary_progression: 'Odisha Entry (Level-10/12): ₹72,000–₹98,000/month in-hand + Govt quarters/vehicle; Mid-Career (ADM/SP/Director, 9–14 yrs): ₹1.40–₹1.85 Lakh/month; Senior (Collector/Secretary/CS, 15+ yrs): ₹2.0–₹2.50 Lakh/month.',
    career_ladder: 'OAS Junior Branch (BDO/Tahasildar) → OAS Senior Branch (Sub-Collector/ADM) → OAS Selection Grade / IAS Promotion → District Collector → Department Secretary → Chief Secretary. Day-in-the-life blends field inspections, grievance hearings, and policy implementation.',
    summary: 'Complete IAS/IPS/IFS and OAS/OFS/OPS career roadmap covering academic entry paths, Gopabandhu Academy training, ORSP/7th CPC pay growth, and 15-year district-to-secretariat promotion ladder.',
    tags: ['IAS', 'OAS', 'OFS', 'OPS', 'Civil Services', 'Governance', 'Career Roadmap']
  },
  {
    id: 'ji-ce-teaching-academia',
    slug: 'school-college-university-teaching-academic-research-roadmap',
    folderHints: ['education and academia', 'school teacher', 'college lecturer and assistant professor'],
    title: 'School, College & University Teaching & Academic Research (OTET/OSSTET → NET → Ph.D. → Prof)',
    title_or: 'ବିଦ୍ୟାଳୟ, କଲେଜ ଓ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଶିକ୍ଷାଦାନ ଏବଂ ଗବେଷଣା କ୍ୟାରିୟର',
    conducting_body: 'OSEPA / OAVS / SSB Odisha / OPSC / UGC & Central Universities',
    cadre_group: 'School Cadre (JTS/LTR/TGT/PGT) & Higher Education (Lecturer/Assistant Professor/Professor)',
    pay_matrix: 'School TGT/PGT: ORSP Level-9/10 (₹35,400–₹1,42,400); College/University: UGC Academic Level-10 to Level-14 (₹57,700–₹2,18,200).',
    qualification_tag: 'CT/D.El.Ed. / B.Ed. / PG + NET / Ph.D.',
    official_portal_url: 'https://dhe.odisha.gov.in/',
    academic_pathways: 'After +2: 2-yr D.El.Ed. (CT) or 4-yr Integrated B.A./B.Sc. B.Ed. (RIE Bhubaneswar); After Graduation: 2-yr B.Ed. + Master’s degree; After PG (55%+): UGC-NET/CSIR-NET/GATE & Ph.D.',
    premier_institutions: 'Regional Institute of Education (RIE NCERT) Bhubaneswar, Utkal University, Ravenshaw University, Sambalpur University, Berhampur University, IIT Bhubaneswar, NIT Rourkela, NISER Jatni.',
    entrance_licensing: 'OTET (Class I–VIII), OSSTET/CTET (Secondary), SSB Odisha Lecturer Exam, OPSC Assistant Professor, UGC-NET/JRF, CSIR-NET.',
    skills_certifications: 'NEP 2020 pedagogy, bilingual Odia-English instruction, LMS/digital classroom tools, quantitative/qualitative research methodology, Scopus/UGC-CARE publishing.',
    salary_progression: 'Odisha Primary/LTR Teacher: ₹22,000–₹48,000/month; OAVS/KVS PGT: ₹58,000–₹75,000/month; Asst. Professor (Level-10): ₹82,000–₹95,000/month; Professor (Level-14): ₹1.80–₹2.30 Lakh/month.',
    career_ladder: 'Primary/TGT → PGT / Headmaster → Block/District Education Officer (OES) OR Junior Research Fellow (JRF) → Assistant Professor (Stage 1/2/3) → Associate Professor → Professor → Dean / Vice-Chancellor.',
    summary: 'End-to-end teaching and academic research roadmap from RIE Bhubaneswar & B.Ed./OTET/OSSTET to UGC-NET JRF, Ph.D., SSB Lecturer, and OPSC/University Professor.',
    tags: ['Teaching', 'Professor', 'UGC NET', 'PhD', 'RIE Bhubaneswar', 'Education']
  },
  {
    id: 'ji-ce-software-ai-cloud',
    slug: 'software-engineering-ai-data-science-cloud-roadmap',
    folderHints: ['software-cloud-engineering', 'information technology and digital careers', 'engineering-it-digital'],
    title: 'Software Engineering, AI, Data Science & Cloud Architecture (Bhubaneswar IT Hubs & Global Tech)',
    title_or: 'ସଫ୍ଟୱେର ଇଞ୍ଜିନିୟରିଂ, AI, ଡାଟା ସାଇନ୍ସ ଏବଂ କ୍ଲାଉଡ୍ ଆର୍କିଟେକ୍ଚର କ୍ୟାରିୟର',
    conducting_body: 'InfoCity / InfoValley Bhubaneswar / Global Tech & FinTech Employers',
    cadre_group: 'Private Tech, Product Engineering, AI/ML & Cloud Infrastructure',
    pay_matrix: 'Bhubaneswar Entry: ₹4.5–₹9 LPA; Metro/Remote Product: ₹12–₹35 LPA; Global/Staff Engineer: ₹45 LPA–$180k+.',
    qualification_tag: 'B.Tech / BCA / MCA / B.Sc CS / Diploma + Portfolio',
    official_portal_url: 'https://it.odisha.gov.in/',
    academic_pathways: 'After +2 Science/Commerce: B.Tech CSE/IT, BCA, or B.Sc Data Science; After Graduation: MCA or M.Tech CS/AI; Alternative: Skill-first open-source & cloud certification route.',
    premier_institutions: 'IIT Bhubaneswar, NIT Rourkela, IIIT Bhubaneswar, OUTR (CET) Bhubaneswar, VSSUT Burla, Silicon University, KIIT, SOA ITER.',
    entrance_licensing: 'JEE Main/Advanced, OJEE (MCA/Lateral B.Tech), GATE CS/DA; Industry Certs: AWS Solutions Architect, Google Cloud/Kubernetes (CKA), Microsoft Azure AI.',
    skills_certifications: 'DSA & System Design, Python/TypeScript/Go/Java, React/Node, SQL/PostgreSQL, PyTorch/LLM engineering, Docker/Kubernetes, CI/CD & Cybersecurity.',
    salary_progression: 'Odisha IT Hubs (TCS/Infosys/Deloitte/Mindtree/Startups): ₹4.5–₹12 LPA (0–4 yrs); Metro (Bengaluru/Hyderabad/Pune): ₹15–₹45 LPA (3–8 yrs); Global Remote/US/EU: ₹50 LPA–₹1.5 Cr+.',
    career_ladder: 'SDE-1 / Analyst (0–2 yrs) → SDE-2 / ML Engineer (2–5 yrs) → Senior / Tech Lead (5–8 yrs) → Staff / Principal Architect OR Engineering Manager / CTO. Hybrid & remote roles allow living in Odisha while earning metro/global pay.',
    summary: 'Software, AI/ML, Data Science & Cloud career roadmap comparing Bhubaneswar InfoCity/InfoValley, Bengaluru/Hyderabad, and global remote pay scales with IIT/NIT/OUTR/IIIT pathways.',
    tags: ['Software', 'AI', 'Data Science', 'Cloud', 'Bhubaneswar IT', 'IIT Bhubaneswar']
  },
  {
    id: 'ji-ce-core-engineering-odisha',
    slug: 'core-engineering-mining-metallurgy-power-civil-odisha',
    folderHints: ['engineering, industry and infrastructure', 'engineering-it-digital'],
    title: 'Core Engineering: Mining, Metallurgy, Power Systems, Mechanical & Civil Infrastructure in Odisha',
    title_or: 'କୋର ଇଞ୍ଜିନିୟରିଂ: ଖଣି, ଧାତୁବିଦ୍ୟା, ଶକ୍ତି, ମେକାନିକାଲ୍ ଏବଂ ସିଭିଲ୍ ଭିତ୍ତିଭୂମି କ୍ୟାରିୟର',
    conducting_body: 'NALCO / MCL / SAIL RSP / Tata Steel Kalinga Nagar / OMC / OPTCL / OPSC AEE',
    cadre_group: 'Core Industrial, PSU Executive & State Engineering Cadres',
    pay_matrix: 'PSU GET/OPSC AEE: ₹12–₹18 LPA CTC (Level-10/12); Private Steel/Mining (Tata/JSPL/Vedanta/Hindalco): ₹6–₹28 LPA.',
    qualification_tag: 'Diploma / B.Tech (Mining, Metallurgy, Mech, Elec, Civil)',
    official_portal_url: 'https://www.opsc.gov.in/',
    academic_pathways: 'After 10th: 3-yr Polytechnic Diploma (SCTE&VT); After +2 PCM: 4-yr B.Tech/B.E.; After B.Tech: M.Tech or PSU/State Engineering Services.',
    premier_institutions: 'NIT Rourkela, IIT Bhubaneswar, VSSUT Burla, OUTR Bhubaneswar, IGIT Sarang, GCE Keonjhar (Mining/Metallurgy), PMEC Berhampur.',
    entrance_licensing: 'JEE Main, OJEE, GATE; Statutory: DGMS First/Second Class Mine Manager Certificate (for Coal/Metal Mining), CEA Electrical Supervisor Licence.',
    skills_certifications: 'AutoCAD/STAAD.Pro/ETABS (Civil), ANSYS/SolidWorks (Mech), SCADA/Power Grid Protection (Elec), Mine Planning (Surpac/Datamine), ISO Safety/ESG.',
    salary_progression: 'Diploma Junior Engineer (Odisha): ₹4.2–₹7.5 LPA; B.Tech GET (NALCO/SAIL/Tata Steel): ₹9–₹18 LPA; Plant Head / Chief Engineer (12–18 yrs): ₹30–₹65 LPA.',
    career_ladder: 'GET / Junior Engineer → Assistant Manager / AEE → Deputy General Manager / Executive Engineer → General Manager / Superintending Engineer → Plant Director / Engineer-in-Chief. Postings span Angul, Rourkela, Kalinga Nagar, Jharsuguda, Keonjhar, and Koraput.',
    summary: 'Odisha core engineering roadmap for Mining, Metallurgy, Power, Mechanical & Civil covering NIT Rourkela, VSSUT Burla, GCE Keonjhar, DGMS/GATE licensing, and PSU/Tata Steel career ladders.',
    tags: ['Core Engineering', 'Mining', 'Metallurgy', 'Civil', 'NIT Rourkela', 'VSSUT Burla']
  },
  {
    id: 'ji-ce-medicine-ayush',
    slug: 'medicine-mbbs-md-dental-bds-ayush-clinical-roadmap',
    folderHints: ['healthcare and life sciences', 'healthcare-teaching-trades'],
    title: 'Medicine (MBBS/MD/MS), Dental (BDS), AYUSH (BAMS/BHMS) & Super-Specialty Clinical Practice',
    title_or: 'ଚିକିତ୍ସା ବିଜ୍ଞାନ (MBBS/MD/MS), ଡେଣ୍ଟାଲ୍ (BDS) ଏବଂ ଆୟୁଷ (BAMS/BHMS) କ୍ୟାରିୟର',
    conducting_body: 'NMC / AIIMS / OJEE / OPSC (OMHS) / State Health Mission',
    cadre_group: 'Clinical Medical Officers, Specialists & Academic Clinicians',
    pay_matrix: 'OPSC Medical Officer: ORSP Level-12 (₹80k–₹95k/mo); AIIMS/Metro MD/DM Specialist: ₹1.5–₹4.5 Lakh/mo.',
    qualification_tag: '+2 PCB + NEET-UG → MBBS/BDS/BAMS/BHMS → NEET-PG/INI-CET',
    official_portal_url: 'https://ojee.nic.in/',
    academic_pathways: 'After +2 Physics, Chemistry, Biology (50%+): NEET-UG → 5.5-yr MBBS / 5-yr BDS / 5.5-yr BAMS/BHMS (including 1-yr internship) → 3-yr MD/MS/MDS → 3-yr DM/M.Ch Super-Specialty.',
    premier_institutions: 'AIIMS Bhubaneswar, SCB Medical College Cuttack, MKCG Berhampur, VIMSAR Burla, PRM Baripada, SLN Koraput, SCB Dental College Cuttack, Gopabandhu Ayurveda Mahavidyalaya Puri.',
    entrance_licensing: 'NEET-UG, NEET-PG / NExT, INI-CET, AIAPGET (AYUSH); Mandatory registration with Odisha Council of Medical Registration (OCMR) / NMC.',
    skills_certifications: 'Clinical diagnostics, emergency trauma care (ACLS/BLS), surgical precision, tele-medicine, hospital administration, and compassionate Odia patient communication.',
    salary_progression: 'Intern/Junior Resident: ₹25,000–₹75,000/mo; Govt Asst. Surgeon (OPSC): ₹80,000–₹1.10 Lakh/mo; MD/MS Specialist (DHH/Corporate): ₹1.5–₹3.5 Lakh/mo; Super-Specialist (DM/M.Ch): ₹3–₹8 Lakh+/mo.',
    career_ladder: 'MBBS Intern → Medical Officer (PHC/CHC) / Junior Resident → MD/MS Specialist → Senior Consultant / Professor / CDM&PHO (District Health Head) → Director of Health Services.',
    summary: 'Medical, Dental & AYUSH career roadmap in Odisha covering NEET-UG/PG, AIIMS Bhubaneswar, SCB/MKCG/VIMSAR, OCMR licensing, OPSC Assistant Surgeon pay, and clinical progression.',
    tags: ['MBBS', 'NEET', 'AIIMS Bhubaneswar', 'SCB Cuttack', 'Medical Officer', 'AYUSH']
  },
  {
    id: 'ji-ce-nursing-pharmacy-allied',
    slug: 'nursing-pharmacy-physiotherapy-allied-diagnostics-roadmap',
    folderHints: ['healthcare and medical services', 'healthcare-teaching-trades'],
    title: 'Nursing (B.Sc./GNM), Pharmacy (B.Pharm/Pharm.D), Physiotherapy & Allied Diagnostic Sciences',
    title_or: 'ନର୍ସିଂ (B.Sc./GNM), ଫାର୍ମାସୀ, ଫିଜିଓଥେରାପି ଏବଂ ପାରାମେଡିକାଲ୍ ବିଜ୍ଞାନ କ୍ୟାରିୟର',
    conducting_body: 'ONMRC / OSPC / AIIMS NORCET / OSSSC / Global Nursing Boards',
    cadre_group: 'Hospital Nursing, Clinical Pharmacy, Rehabilitation & Diagnostic Cadres',
    pay_matrix: 'OSSSC Nursing/Pharmacist: ₹35,000–₹55,000/mo; AIIMS NORCET: ₹75,000+/mo; UK/GCC/Germany RN: ₹2.2–₹4.5 Lakh/mo.',
    qualification_tag: '+2 Science (PCB/PCM) → GNM/B.Sc Nursing / D.Pharm/B.Pharm / BPT / BMLT',
    official_portal_url: 'https://health.odisha.gov.in/',
    academic_pathways: 'After +2 Science: 4-yr B.Sc Nursing, 3-yr GNM, 2-yr D.Pharm / 4-yr B.Pharm / 6-yr Pharm.D, 4.5-yr BPT, or 3-yr BMLT/BRIT → M.Sc Nursing / M.Pharm / MPT.',
    premier_institutions: 'AIIMS Bhubaneswar College of Nursing, SCB College of Nursing Cuttack, SVNIRTAR Olatpur (Cuttack — Premier Physiotherapy), Utkal University Dept of Pharmacy, Berhampur University, ICT-IOC Bhubaneswar.',
    entrance_licensing: 'Odisha State Nursing Selection, OJEE (B.Pharm/M.Pharm), AIIMS NORCET, OSSSC CRE; Licensing: ONMRC (Nursing), OSPC (Pharmacy); Overseas: OET/IELTS + NMC UK / DHA / NCLEX.',
    skills_certifications: 'ICU/NICU critical care, OT nursing, pharmacovigilance, clinical trials, NABL lab quality protocols, and geriatric rehabilitation.',
    salary_progression: 'Odisha Private Hospital: ₹18,000–₹32,000/mo; OSSSC Govt Cadre: ₹38,000–₹60,000/mo; AIIMS/ESIC Central: ₹72,000–₹95,000/mo; Overseas Registered Nurse (UK/Ireland/Germany/UAE): ₹2.2–₹4.5 Lakh/mo.',
    career_ladder: 'Staff Nurse / Pharmacist / Physiotherapist → Nursing Officer / Senior Pharmacist → Nursing Superintendent / Chief Pharmacist / Drug Inspector (OPSC) → Hospital Operations Director.',
    summary: 'Nursing, Pharmacy, Physiotherapy & Allied Health career roadmap featuring SVNIRTAR Olatpur, AIIMS NORCET, OSSSC cadres, ONMRC/OSPC licensing, and global UK/GCC nursing pathways.',
    tags: ['Nursing', 'NORCET', 'Pharmacy', 'Physiotherapy', 'SVNIRTAR', 'Allied Health']
  },
  {
    id: 'ji-ce-agri-forestry-rural',
    slug: 'agriculture-horticulture-forestry-veterinary-rural-management',
    folderHints: ['agriculture, forestry and fisheries', 'agriculture and rural studies'],
    title: 'Agriculture, Horticulture, Forestry, Veterinary Science, Fisheries & Rural Management',
    title_or: 'କୃଷି, ଉଦ୍ୟାନକୃଷି, ବନବିଜ୍ଞାନ, ପ୍ରାଣୀଚିକିତ୍ସା, ମତ୍ସ୍ୟ ଏବଂ ଗ୍ରାମ୍ୟ ପରିଚାଳନା କ୍ୟାରିୟର',
    conducting_body: 'OUAT / ICAR / OPSC (AHO/AFO/VAS/OFS) / NABARD / XIMB',
    cadre_group: 'State Agri/Forestry/Vet Officers, Banking Agri Officers & Development Leaders',
    pay_matrix: 'OPSC VAS/OFS/AHO: ORSP Level-10/12 (₹55,000–₹85,000/mo); NABARD/IBPS AFO: ₹65,000–₹1.10 Lakh/mo; Rural Mgmt: ₹12–₹24 LPA.',
    qualification_tag: '+2 Science (PCB/PCM) → B.Sc Agri/Forestry / B.V.Sc & AH / B.F.Sc → M.Sc / MBA-RM',
    official_portal_url: 'https://www.ouat.ac.in/',
    academic_pathways: 'After +2 Science: 4-yr B.Sc (Hons) Agriculture/Horticulture/Forestry/Fisheries or 5.5-yr B.V.Sc & A.H. via OUAT/ICAR/NEET; After Graduation: M.Sc (ICAR) or MBA Rural Management (XIMB/IRMA).',
    premier_institutions: 'OUAT Bhubaneswar (College of Agriculture, Veterinary, Forestry, Fisheries & Agril Engg), ICAR-NRRI Cuttack, ICAR-CIFA Kausalyaganga, XIM University (XIMB School of Rural Management), IRMA Anand.',
    entrance_licensing: 'OUAT UG/PG Entrance, ICAR AIEEA, NEET-UG (for B.V.Sc), OPSC AHO/AFO/VAS/OFS, IBPS AFO, NABARD Grade A, XAT/CAT.',
    skills_certifications: 'Precision farming, drone/GIS watershed mapping, FPO/SHG value-chain management, veterinary clinical surgery, aquaculture hatchery tech, and climate-resilient cropping.',
    salary_progression: 'Block/Field Officer (AHO/AFO/VAS): ₹55,000–₹85,000/mo; NABARD/Agri-Bank Scale-I/II: ₹75,000–₹1.25 Lakh/mo; XIMB/IRMA Agri-Business & CSR Lead: ₹14–₹32 LPA.',
    career_ladder: 'Assistant Agriculture/Horticulture/Veterinary Officer → Block/District Officer (DDA/CDVO/DFO) → Joint Director / Conservator of Forests → Director of Agriculture / PCCF.',
    summary: 'Comprehensive Odisha Agriculture, Forestry, Veterinary, Fisheries & Rural Management roadmap highlighting OUAT Bhubaneswar, ICAR-NRRI/CIFA, XIMB, NABARD, and OPSC OFS/VAS/AHO cadres.',
    tags: ['OUAT', 'Agriculture', 'Veterinary', 'Forestry', 'XIMB', 'NABARD', 'ICAR']
  },
  {
    id: 'ji-ce-ca-cma-cs-finance',
    slug: 'chartered-accountancy-ca-cma-cs-corporate-finance-roadmap',
    folderHints: ['commerce and finance', 'banking, finance and insurance'],
    title: 'Chartered Accountancy (CA), Cost & Management Accounting (CMA), Company Secretary (CS) & Corporate Finance',
    title_or: 'ଚାର୍ଟାର୍ଡ ଆକାଉଣ୍ଟାନ୍ସି (CA), CMA, କମ୍ପାନୀ ସେକ୍ରେଟାରୀ (CS) ଏବଂ କର୍ପୋରେଟ୍ ଅର୍ଥ କ୍ୟାରିୟର',
    conducting_body: 'ICAI / ICMAI / ICSI / CFA Institute',
    cadre_group: 'Statutory Audit, Costing, Corporate Governance & Investment Finance',
    pay_matrix: 'Fresher CA/CMA/CS: ₹8–₹14 LPA; Big-4 / MNC / PSU Finance (5–8 yrs): ₹20–₹45 LPA; CFO / Partner: ₹60 LPA–₹2 Cr+.',
    qualification_tag: '+2 Commerce/Any Stream (Foundation) OR B.Com/Graduate (Direct Entry)',
    official_portal_url: 'https://www.icai.org/',
    academic_pathways: 'After +2: CA Foundation / CMA Foundation / CSEET + 3-yr Articleship/Training; After B.Com/BBA (55%+): Direct Entry to CA/CMA Intermediate or CS Executive.',
    premier_institutions: 'ICAI Bhubaneswar/Cuttack/Rourkela Chapters, ICMAI EIRC Bhubaneswar Chapter, Ravenshaw University, BJB Autonomous College, XIMB (Finance), IIM Sambalpur.',
    entrance_licensing: 'CA (Foundation, Intermediate, Final + 2/3-yr Articleship), CMA (Foundation, Inter, Final), CS (CSEET, Executive, Professional), CFA Levels I–III.',
    skills_certifications: 'Ind AS / IFRS reporting, GST & Direct Tax litigation, SAP FICO / ERP, Financial Modeling & Valuation, Forensic Audit, SEBI LODR & Insolvency (IBC) compliance.',
    salary_progression: 'Articleship Stipend: ₹8,000–₹25,000/mo; Newly Qualified CA/CMA/CS (Bhubaneswar/PSU): ₹8.5–₹13 LPA; Metro Big-4/Investment Banking: ₹14–₹35 LPA; Partner/CFO: ₹55 LPA+.',
    career_ladder: 'Audit/Tax Article → Associate / Assistant Manager Finance → Audit Manager / PSU Senior Finance Officer → VP Finance / Independent Practice Partner → Chief Financial Officer (CFO).',
    summary: 'Complete CA, CMA, CS & Corporate Finance roadmap for Odisha commerce students covering ICAI/ICMAI/ICSI Bhubaneswar chapters, direct entry rules, Big-4/PSU pay, and CFO progression.',
    tags: ['CA', 'CMA', 'CS', 'Commerce', 'ICAI', 'Corporate Finance', 'Big 4']
  },
  {
    id: 'ji-ce-banking-insurance-fintech',
    slug: 'banking-insurance-actuarial-fintech-capital-markets',
    folderHints: ['banking, finance and insurance', 'banking and financial institutions'],
    title: 'Banking, Insurance, Actuarial Science, FinTech & Capital Markets',
    title_or: 'ବ୍ୟାଙ୍କିଂ, ବୀମା, ଆକଚୁଆରିଆଲ୍ ସାଇନ୍ସ, ଫିନଟେକ୍ ଏବଂ ପୁଞ୍ଜି ବଜାର କ୍ୟାରିୟର',
    conducting_body: 'RBI / SBI / IBPS / NABARD / SEBI / IAI (Actuaries) / NISM',
    cadre_group: 'Public/Private Banking Officers, Risk Actuaries, Regulatory & FinTech Roles',
    pay_matrix: 'Bank PO: ₹10–₹13 LPA; RBI/SEBI Grade A/B: ₹20–₹28 LPA; Actuary / Investment Banker: ₹18–₹65 LPA.',
    qualification_tag: 'Graduate (Any Stream) / Maths-Stats (Actuarial) / MBA Finance',
    official_portal_url: 'https://www.rbi.org.in/',
    academic_pathways: 'After +2: B.Com, BBA, B.Sc Mathematics/Statistics, or B.Tech; After Graduation: IBPS/SBI/RBI exams, MBA Finance (XIMB/IIM Sambalpur), or IAI Actuarial papers.',
    premier_institutions: 'XIMB Bhubaneswar, IIM Sambalpur, Utkal University (MBA/M.Com), Ravenshaw University, NISM Navi Mumbai.',
    entrance_licensing: 'IBPS PO/Clerk/RRB, SBI PO/JA, RBI Grade B, SEBI Grade A, LIC AAO, NISM Series Certifications (Mutual Funds/Derivatives), Institute of Actuaries of India (IAI).',
    skills_certifications: 'Credit underwriting, Basel-III risk analytics, Python/R for quantitative finance, digital payments (UPI/NPCI), wealth advisory, and Odia customer financial literacy.',
    salary_progression: 'Bank Clerk/Associate: ₹5.2–₹6.5 LPA; Bank PO / Private RM: ₹9–₹15 LPA; RBI Grade B / SEBI Officer: ₹22–₹30 LPA; Senior Actuary / Treasury Head: ₹45–₹90 LPA.',
    career_ladder: 'Probationary Officer / Credit Analyst → Branch Manager / Relationship Manager → Regional Manager / AGM → General Manager → Chief General Manager / Executive Director.',
    summary: 'Banking, Insurance, Actuarial Science & FinTech career roadmap detailing IBPS/SBI/RBI/SEBI pathways, NISM/IAI certifications, XIMB/IIM Sambalpur MBA Finance, and Scale-I to GM progression.',
    tags: ['Banking', 'RBI Grade B', 'SEBI', 'Actuarial', 'FinTech', 'XIMB', 'IIM Sambalpur']
  },
  {
    id: 'ji-ce-law-judiciary-nluo',
    slug: 'law-odisha-judicial-service-corporate-counsel-nluo-roadmap',
    folderHints: ['law, justice and governance', 'judiciary and legal services'],
    title: 'Law, Odisha Judicial Service (Civil Judge), Corporate Counsel & Constitutional Litigation',
    title_or: 'ଆଇନ, ଓଡ଼ିଶା ନ୍ୟାୟିକ ସେବା (ସିଭିଲ୍ ଜଜ୍), କର୍ପୋରେଟ୍ କାଉନସେଲ୍ ଏବଂ ଓକିଲାତି କ୍ୟାରିୟର',
    conducting_body: 'Bar Council of India / OPSC (OJS) / High Court of Orissa / Law Firms',
    cadre_group: 'Judicial Officers, Litigating Advocates, Corporate Legal & Policy Counsel',
    pay_matrix: 'OJS Civil Judge: ₹77,840–₹1,36,520+ allowances; Tier-1 Law Firm: ₹15–₹22 LPA entry; Senior Advocate/GC: ₹40 LPA–₹2 Cr+.',
    qualification_tag: '5-Yr Integrated LL.B. (CLAT) OR 3-Yr LL.B. + AIBE',
    official_portal_url: 'https://www.nluo.ac.in/',
    academic_pathways: 'After +2 (Any Stream): 5-yr BA/BBA LL.B. (Hons); After Graduation: 3-yr LL.B. (Madhusudan Law University / University Law College Bhubaneswar) → LL.M. (Constitutional/Corporate/IPR).',
    premier_institutions: 'National Law University Odisha (NLUO) Cuttack, Madhusudan Law University (MLU) Cuttack, University Law College (Utkal) Bhubaneswar, SOA National Institute of Law, KIIT School of Law.',
    entrance_licensing: 'CLAT / AILET, All India Bar Examination (AIBE — Mandatory BCI Certificate of Practice), OPSC Odisha Judicial Service (OJS), SEBI/IBPS Law Officer.',
    skills_certifications: 'Constitutional & mining/environmental litigation (NGT), corporate M&A contract drafting, arbitration/mediation, legal research (SCC Online/Manupatra), Odia-English courtroom advocacy.',
    salary_progression: 'Junior Litigation Advocate (Cuttack HC): ₹15,000–₹35,000/mo initial; OJS Civil Judge (Jr. Div): ₹1.15–₹1.40 Lakh/mo; Corporate In-House/Law Firm (3–7 yrs): ₹14–₹38 LPA; High Court Judge / Senior Counsel: Top tier.',
    career_ladder: 'Law Intern / Junior Counsel → AIBE Enrolled Advocate / OJS Civil Judge / Legal Officer → Senior Civil Judge / Partner / Associate General Counsel → District Judge / High Court Bench / General Counsel.',
    summary: 'Law & Judiciary career roadmap in Odisha covering NLUO Cuttack, MLU Cuttack, CLAT, AIBE licensing, OPSC Odisha Judicial Service (Civil Judge), and High Court/Corporate legal ladders.',
    tags: ['Law', 'NLUO Cuttack', 'OJS', 'Civil Judge', 'CLAT', 'High Court of Orissa']
  },
  {
    id: 'ji-ce-media-odia-journalism',
    slug: 'odia-journalism-mass-comm-digital-content-iimc-dhenkanal',
    folderHints: ['media, language and creative industries', 'creative and communication fields'],
    title: 'Odia Journalism, Mass Communication, Digital Content, Documentary Filmmaking & Public Relations',
    title_or: 'ଓଡ଼ିଆ ସାମ୍ବାଦିକତା, ଗଣଯୋଗାଯୋଗ, ଡିଜିଟାଲ୍ କଣ୍ଟେଣ୍ଟ ଏବଂ ଲୋକସମ୍ପର୍କ କ୍ୟାରିୟର',
    conducting_body: 'IIMC Dhenkanal / OPSC (SDIPRO) / National & Regional Media Houses',
    cadre_group: 'Broadcast/Print Journalists, Govt DIPROs, Documentary Producers & PR Leads',
    pay_matrix: 'Odisha Media Entry: ₹3–₹6 LPA; OPSC SDIPRO: ORSP Level-10; Metro/National Desk & PR: ₹10–₹30 LPA.',
    qualification_tag: 'Graduate (Any Stream) + PG Diploma / MJMC',
    official_portal_url: 'https://iimc.gov.in/',
    academic_pathways: 'After +2: B.A. Journalism & Mass Comm (BJMC) / Visual Communication; After Graduation: 1-yr PG Diploma in Journalism (English or Odia) at IIMC Dhenkanal or MJMC.',
    premier_institutions: 'Indian Institute of Mass Communication (IIMC) Dhenkanal, Utkal University, Ravenshaw University, Berhampur University, Biju Patnaik Film & Television Institute of Odisha (BPFTIO) Cuttack.',
    entrance_licensing: 'CUET-PG (IIMC Dhenkanal), BPFTIO Entrance, OPSC Sub-Divisional Information & Public Relations Officer (SDIPRO), UPSC Indian Information Service (IIS).',
    skills_certifications: 'Bilingual Odia-English investigative reporting, mobile journalism (MoJo), Adobe Premiere/DaVinci Resolve editing, data journalism, fact-checking, and crisis PR.',
    salary_progression: 'Reporter / Content Producer (Odisha): ₹25,000–₹50,000/mo; IIMC/Metro Desk & Corporate PR: ₹7–₹16 LPA; Senior Editor / Govt DIPRO / Documentary Director: ₹15–₹35 LPA+.',
    career_ladder: 'Trainee Reporter / Video Editor → Correspondent / Sub-Editor / SDIPRO → Bureau Chief / Senior Producer / PR Manager → Resident Editor / Head of Corporate Communications.',
    summary: 'Odia & National Media career roadmap featuring IIMC Dhenkanal, BPFTIO Cuttack, OPSC SDIPRO, UPSC IIS, digital content entrepreneurship, and bilingual journalism progression.',
    tags: ['IIMC Dhenkanal', 'Odia Journalism', 'Mass Communication', 'SDIPRO', 'BPFTIO']
  },
  {
    id: 'ji-ce-handloom-architecture-design',
    slug: 'handloom-textile-design-architecture-urban-planning-nift',
    folderHints: ['media, language and creative industries', 'skilled trades and vocational careers'],
    title: 'Handloom, Textile Design, Architecture (B.Arch), Urban Planning & Craft Entrepreneurship',
    title_or: 'ହସ୍ତତନ୍ତ, ବୟନ ଡିଜାଇନ୍, ସ୍ଥାପତ୍ୟ (B.Arch), ନଗର ଯୋଜନା ଏବଂ ହସ୍ତଶିଳ୍ପ ଉଦ୍ୟମିତା',
    conducting_body: 'NIFT Bhubaneswar / Council of Architecture (COA) / Boyanika / Govt Planning',
    cadre_group: 'Architects, Urban Planners, Textile/Fashion Designers & Craft Exporters',
    pay_matrix: 'Junior Architect/Designer: ₹4.5–₹8 LPA; Senior Urban Planner / NIFT Lead: ₹14–₹30 LPA; Craft/D2C Brand Founder: Scalable.',
    qualification_tag: '+2 PCM (B.Arch via NATA/JEE) OR +2 Any Stream (NIFT/NID)',
    official_portal_url: 'https://nift.ac.in/bhubaneswar/',
    academic_pathways: 'After +2 PCM: 5-yr B.Arch (OUTR/VSSUT/Piloo Mody) or 4-yr B.Plan; After +2 Any Stream: 4-yr B.Des / B.F.Tech (NIFT Bhubaneswar); After Graduation: M.Arch / M.Plan / M.Des.',
    premier_institutions: 'NIFT Bhubaneswar, OUTR (CET) School of Architecture, Piloo Mody College of Architecture (Cuttack), NIT Rourkela (Planning & Architecture), IIHT Bargarh (Handloom Tech), NID Ahmedabad.',
    entrance_licensing: 'NATA / JEE Main Paper-2 (Architecture), NIFT Entrance, NID DAT, CEED/GATE; Mandatory Council of Architecture (COA) registration for practicing architects.',
    skills_certifications: 'Revit BIM, AutoCAD, Rhino 3D, GIS urban mapping, Sambalpuri/Bomkai/Kotpad Ikat GI-tag textile innovation, sustainable laterite/climate architecture, and D2C export branding.',
    salary_progression: 'Junior Architect / Textile Designer: ₹4–₹7.5 LPA; Project Architect / Town Planner (Odisha Govt/Smart City): ₹9–₹18 LPA; Principal Architect / Export Brand Owner: ₹25–₹75 LPA+.',
    career_ladder: 'Design Intern / Junior Architect → Licensed COA Architect / Textile Technologist → Urban Planner / Design Lead → Principal Architect / Creative Director / Global Craft Exporter.',
    summary: 'Design, Architecture & Odisha Handloom career roadmap covering NIFT Bhubaneswar, NIT Rourkela, OUTR, IIHT Bargarh, NATA/COA licensing, and GI-tag Sambalpuri/craft entrepreneurship.',
    tags: ['NIFT Bhubaneswar', 'B.Arch', 'NATA', 'Handloom', 'Urban Planning', 'Design']
  },
  {
    id: 'ji-ce-armed-forces-officer',
    slug: 'armed-forces-capf-commissioned-officer-nda-cds-afcat-roadmap',
    folderHints: ['defence and armed forces', 'government career pathways'],
    title: 'Commissioned Officer Careers in Armed Forces & CAPF (NDA, CDS, AFCAT, Coast Guard, CAPF AC)',
    title_or: 'ସଶସ୍ତ୍ର ବାହିନୀ ଓ CAPF କମିଶନଡ୍ ଅଫିସର କ୍ୟାରିୟର (NDA, CDS, AFCAT, ତଟରକ୍ଷୀ, CAPF AC)',
    conducting_body: 'UPSC / Indian Army / Indian Navy / Indian Air Force / Indian Coast Guard',
    cadre_group: 'Group A Commissioned Gazetted Officers (Defence & CAPF)',
    pay_matrix: 'Lieutenant / Sub-Lt / Flying Officer (Level-10): ₹56,100 + ₹15,500 MSP + Allowances (~₹95,000–₹1.25 Lakh/mo in-hand).',
    qualification_tag: '+2 PCM/Any (NDA) OR Graduate/B.Tech (CDS, AFCAT, CAPF AC)',
    official_portal_url: 'https://upsconline.nic.in/',
    academic_pathways: 'After 10th/12th: Sainik School Bhubaneswar/Sambalpur/Koraput → NDA Khadakwasla (3-yr degree + 1-yr IMA/INA/AFA); After Graduation: CDS / AFCAT / NCC Special Entry / TGC / UPSC CAPF AC.',
    premier_institutions: 'National Defence Academy (NDA) Khadakwasla, Indian Military Academy (IMA) Dehradun, Officers Training Academy (OTA) Chennai, Indian Naval Academy Ezhimala, Air Force Academy Dundigal, INS Chilka (Odisha).',
    entrance_licensing: 'UPSC NDA & NA, UPSC CDS, IAF AFCAT, Indian Coast Guard Assistant Commandant, UPSC CAPF AC + 5-day Services Selection Board (SSB) Psychological & GTO Interview.',
    skills_certifications: 'Officer-Like Qualities (OLQs), physical endurance, tactical leadership, aerospace/naval engineering, cybersecurity, and crisis disaster response.',
    salary_progression: 'Lt / Flying Officer (Entry): ₹12–₹15 LPA + free housing/ration/CSD; Major / Wing Commander (6–13 yrs): ₹18–₹26 LPA; Colonel / Brigadier / General (15+ yrs): ₹30–₹50 LPA + Lifetime Pension.',
    career_ladder: 'Cadet → Lieutenant → Captain → Major → Lieutenant Colonel → Colonel → Brigadier → Major General → Lieutenant General (or equivalent Naval/Air ranks) + respected post-retirement corporate/PSU leadership.',
    summary: 'Commissioned Officer roadmap for Odisha youth covering Sainik Schools, NDA, CDS, AFCAT, CAPF AC, 5-day SSB interview prep, Level-10 + MSP pay, and lifetime rank progression.',
    tags: ['NDA', 'CDS', 'AFCAT', 'SSB Interview', 'Armed Forces', 'CAPF AC', 'Officer']
  },
  {
    id: 'ji-ce-scientific-research-niser',
    slug: 'scientific-research-space-atomic-energy-niser-immt-drdo',
    folderHints: ['science, research and innovation', 'scientific research'],
    title: 'Scientific Research, Space, Atomic Energy & Environmental Conservation (NISER, IMMT, ILS, DRDO, ISRO)',
    title_or: 'ବୈଜ୍ଞାନିକ ଗବେଷଣା, ମହାକାଶ, ପରମାଣୁ ଶକ୍ତି ଏବଂ ପରିବେଶ ସଂରକ୍ଷଣ (NISER, IMMT, ILS, DRDO, ISRO)',
    conducting_body: 'DAE (NISER/BARC) / ISRO / DRDO / CSIR-IMMT / DBT-ILS / MoEFCC',
    cadre_group: 'Group A Scientists, Research Fellows & Conservation Biologists',
    pay_matrix: 'JRF/SRF: ₹37,000–₹42,000/mo; Scientist-B/C (Level-10/11): ₹90,000–₹1.25 Lakh/mo; Senior Scientist-G/Director: ₹2.25 Lakh+/mo.',
    qualification_tag: '+2 Science (NEST/IAT) → Int. M.Sc/B.Tech → GATE/NET/BARC OCES → Ph.D.',
    official_portal_url: 'https://www.niser.ac.in/',
    academic_pathways: 'After +2 Science: 5-yr Integrated M.Sc at NISER Jatni / IISER Berhampur / UM-DAE CEBS; After B.Sc/B.Tech: M.Sc/M.Tech → Ph.D. at CSIR-IMMT, DBT-ILS Bhubaneswar, IOP Bhubaneswar, or ISRO/DRDO Scientist recruitment.',
    premier_institutions: 'NISER Jatni (Khordha), IISER Berhampur, Institute of Physics (IOP) Bhubaneswar, CSIR-IMMT Bhubaneswar, DBT-Institute of Life Sciences (ILS) Bhubaneswar, DRDO ITR Chandipur & PXE Balasore.',
    entrance_licensing: 'NEST (NISER), IISER Aptitude Test (IAT), JAM, GATE, CSIR-UGC NET JRF, BARC OCES/DGFS, ISRO ICRB Scientist Exam, DRDO RAC.',
    skills_certifications: 'Quantum/material sciences, molecular biology, bioinformatics, telemetry & missile instrumentation, climate modeling, and peer-reviewed international publishing.',
    salary_progression: 'Integrated M.Sc INSPIRE/DISHA Fellowship: ₹60,000–₹80,000/yr; Ph.D. JRF/SRF: ₹37k–₹42k/mo + HRA; Scientist-C (BARC/ISRO/DRDO/CSIR): ₹1.05–₹1.35 Lakh/mo; Outstanding Scientist: ₹2.2–₹2.6 Lakh/mo.',
    career_ladder: 'Integrated M.Sc / B.Tech → JRF / Scientific Officer-C → Scientist-D/E (Principal Investigator) → Scientist-F/G → Laboratory Director (DRDO/CSIR/DAE) or Global Faculty.',
    summary: 'Odisha & National R&D roadmap featuring NISER Jatni, IISER Berhampur, IOP, CSIR-IMMT, DBT-ILS, and DRDO Chandipur covering NEST/IAT/GATE/BARC entry and Scientist-C to Director growth.',
    tags: ['NISER', 'IISER Berhampur', 'ISRO', 'DRDO Chandipur', 'CSIR-IMMT', 'Scientific Research']
  },
  {
    id: 'ji-ce-startup-social-csr',
    slug: 'startup-founding-social-entrepreneurship-ngo-csr-odisha',
    folderHints: ['entrepreneurship and self-employment', 'startups and innovation', 'social sciences and development'],
    title: 'Startup Founding, Social Entrepreneurship, NGO Leadership & CSR Program Management in Odisha',
    title_or: 'ଷ୍ଟାର୍ଟଅପ୍ ପ୍ରତିଷ୍ଠା, ସାମାଜିକ ଉଦ୍ୟମିତା, ଏନଜିଓ ନେତୃତ୍ୱ ଏବଂ CSR ପରିଚାଳନା',
    conducting_body: 'Startup Odisha (O-Hub) / MSME / Tata Steel Foundation / XIMB / TISS',
    cadre_group: 'Startup Founders, Social Sector Directors & Corporate CSR Heads',
    pay_matrix: 'CSR / Development Fellow: ₹4.5–₹9 LPA; CSR Manager (Mining/Metal PSUs in Odisha): ₹14–₹28 LPA; Startup Founder: Equity + Grants.',
    qualification_tag: 'Any Degree + Incubation / MSW / MBA / Public Policy',
    official_portal_url: 'https://startupodisha.gov.in/',
    academic_pathways: 'After Graduation: Direct startup founding via Startup Odisha O-Hub OR Master’s in Social Work (MSW) / Rural Management (XIMB) / Public Policy (TISS/IIM) / SBI Youth for India Fellowship.',
    premier_institutions: 'O-Hub (Startup Odisha Incubation Centre) Bhubaneswar, KIIT-TBI, IIT Bhubaneswar Research & Entrepreneurship Park, XIM University, Ravenshaw University, TISS Mumbai.',
    entrance_licensing: 'Startup Odisha Recognition & Seed Grant (up to ₹20 Lakh product dev), DPIIT Startup India Registration, Udyam MSME, Darpan NGO ID, 12A/80G & CSR-1 MCA Compliance.',
    skills_certifications: 'Lean canvas & unit economics, impact measurement (SROI), tribal/rural livelihood design, CSR Schedule VII compliance, grant writing, and B2B/D2C fundraising.',
    salary_progression: 'Social Fellow / Field Coordinator: ₹3.6–₹7 LPA; CSR Program Manager (Odisha industrial belt): ₹12–₹26 LPA; Head of CSR / VP Impact: ₹30–₹55 LPA; Funded Founder: Equity wealth.',
    career_ladder: 'Development Fellow / Early Founder → Program Officer / Seed-Stage CEO → CSR Manager / NGO Director → Head of Sustainability & CSR / Series-A+ Startup Founder.',
    summary: 'Startup & Social Impact career roadmap in Odisha detailing O-Hub Startup Odisha grants, KIIT-TBI, XIMB, CSR roles in Odisha’s industrial belt, and CSR-1/DPIIT compliance.',
    tags: ['Startup Odisha', 'O-Hub', 'Social Enterprise', 'CSR', 'NGO', 'KIIT-TBI']
  },
  {
    id: 'ji-ce-hospitality-aviation-maritime',
    slug: 'hospitality-tourism-aviation-maritime-merchant-navy-odisha',
    folderHints: ['hospitality, tourism and services', 'transport, logistics and aviation'],
    title: 'Hospitality, Tourism Management, Aviation & Maritime Merchant Navy Careers (IHM Bhubaneswar, Paradip Port)',
    title_or: 'ଆତିଥ୍ୟ, ପର୍ଯ୍ୟଟନ ପରିଚାଳନା, ବିମାନ ଚଳାଚଳ ଏବଂ ମର୍ଚ୍ଚାଣ୍ଟ ନେଭି କ୍ୟାରିୟର',
    conducting_body: 'NCHMCT (IHM Bhubaneswar) / DGCA / IMU (Indian Maritime University) / Paradip Port',
    cadre_group: 'Hotel Operations, Eco-Tourism, Commercial Aviation & Marine Engineering',
    pay_matrix: 'Hospitality Entry: ₹3.5–₹7 LPA (GM: ₹25–₹55 LPA); Merchant Navy Deck/Engine Officer: $2,500–$12,000/month (Tax-Free NRI).',
    qualification_tag: '+2 Any Stream (IHM/Cabin Crew) OR +2 PCM (IMU-CET / CPL)',
    official_portal_url: 'https://www.ihmbbsr.org/',
    academic_pathways: 'After +2 Any Stream: 3-yr B.Sc Hospitality & Hotel Admin (IHM Bhubaneswar) or Aviation Management; After +2 PCM (60%+): IMU-CET → B.Tech Marine Engg / B.Sc Nautical Science OR DGCA CPL Pilot Training.',
    premier_institutions: 'Institute of Hotel Management (IHM) Bhubaneswar, IITTM Bhubaneswar (Tourism), Indian Maritime University (IMU) Kolkata/Chennai, Paradip Port Authority Training, Biju Patnaik Aviation Centre (Birasal, Dhenkanal).',
    entrance_licensing: 'NCHM JEE (IHM), IMU-CET + DG Shipping Medical & CDC (Merchant Navy), DGCA Class-I Medical & Commercial Pilot Licence (CPL), OTDC/Eco-Tourism Certification.',
    skills_certifications: 'Luxury guest relations, F&B revenue management, STCW maritime safety, marine diesel propulsion, air navigation/CRM, and Odisha heritage/eco-tourism curation (Puri, Konark, Chilika, Similipal).',
    salary_progression: 'Hotel Management Trainee (Taj/Oberoi/Mayfair): ₹4.5–₹7.5 LPA; Hotel General Manager: ₹25–₹55 LPA; Merchant Navy 3rd Officer/4th Engg: ₹2–₹3.5 Lakh/mo; Captain / Chief Engineer: ₹8–₹12 Lakh/mo.',
    career_ladder: 'Trainee / Deck Cadet → Assistant Manager / 3rd Officer → Executive Chef / Chief Officer → General Manager / Ship Captain / Port Pilot (Paradip/Dhamra/Gopalpur).',
    summary: 'Hospitality, Tourism, Aviation & Merchant Navy roadmap covering IHM Bhubaneswar, IITTM, Birasal Aviation Centre, IMU-CET, Paradip Port marine roles, and global tax-free maritime pay.',
    tags: ['IHM Bhubaneswar', 'Merchant Navy', 'Aviation', 'Hospitality', 'Paradip Port', 'Tourism']
  }
];

export async function enrichCareerExplorerCategory02(db, now) {
  if (!db) return { foldersUpdated: 0, itemsUpserted: 0 };
  const ts = now || new Date().toISOString();

  // 1. Fetch all folders in Category #02 (career-explorer)
  const foldersRes = await db
    .prepare("SELECT * FROM jobs_directory_folders WHERE domain_slug = 'career-explorer' ORDER BY depth ASC, sort_order ASC, title ASC")
    .all();
  const folders = foldersRes.results || [];
  const folderById = new Map(folders.map(f => [f.id, f]));

  const folderStmts = [];
  for (const f of folders) {
    if (isCustomAdminEdit(f)) continue;

    const key = String(f.title || '').trim().toLowerCase();
    const parent = f.parent_id ? folderById.get(f.parent_id) : null;
    const spec = CAT02_FOLDER_ENRICHMENTS[key] || buildSmartCareerFolderEnrichment(f, parent ? parent.title : '');

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
    const nextSeoTitle = needsSeoTitle ? `${f.title} (${nextBadge}) — CSOdisha Career Explorer` : f.seo_title;
    const nextSeoDesc = needsSeoDesc ? nextDescEn.slice(0, 300) : f.seo_description;
    const nextVerifiedAt = f.verified_at || ts;

    folderStmts.push(
      db.prepare(`UPDATE jobs_directory_folders
        SET description = ?, description_en = ?, description_or = ?, title_or = ?,
            hero_badge = ?, featured_badge = ?, seo_title = ?, seo_description = ?,
            verified_at = ?, updated_by = 'cat02-enrich', updated_at = ?
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

  // 2. Resolve best target folder for each of the 16 minute career roadmaps
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
    return folders[0]?.id || 'jf-ce-civil-admin';
  }

  const existingItemsRes = await db
    .prepare("SELECT id, slug, updated_by FROM jobs_directory_items WHERE domain_slug = 'career-explorer'")
    .all();
  const existingById = new Map((existingItemsRes.results || []).map(r => [r.id, r]));
  const existingBySlug = new Map((existingItemsRes.results || []).map(r => [r.slug, r]));

  const itemStmts = [];
  for (const rm of CAT02_ROADMAPS) {
    const folderId = pickFolderId(rm.folderHints);
    const existing = existingById.get(rm.id) || existingBySlug.get(rm.slug);
    if (existing && existing.updated_by && !SYSTEM_AUTHORS.has(String(existing.updated_by).toLowerCase())) {
      continue;
    }

    const bodyHtml = [
      `<h2>${rm.title}</h2>`,
      `<p><strong>ଓଡ଼ିଆ ସାରାଂଶ:</strong> ${rm.title_or} — ${rm.conducting_body}</p>`,
      `<ul>`,
      `<li><strong>Academic Entry Pathways:</strong> ${rm.academic_pathways}</li>`,
      `<li><strong>Premier Odisha &amp; National Institutions:</strong> ${rm.premier_institutions}</li>`,
      `<li><strong>Key Entrance Exams &amp; Licensing Bodies:</strong> ${rm.entrance_licensing}</li>`,
      `<li><strong>Core Technical &amp; Soft Skills / Certifications:</strong> ${rm.skills_certifications}</li>`,
      `<li><strong>Compensation &amp; Pay Progression (Odisha vs Metro vs Global):</strong> ${rm.salary_progression}</li>`,
      `<li><strong>5-to-15 Year Career Ladder &amp; Work Realities:</strong> ${rm.career_ladder}</li>`,
      `</ul>`
    ].join('');

    if (existing) {
      itemStmts.push(
        db.prepare(`UPDATE jobs_directory_items
          SET folder_id = ?, title = ?, title_or = ?, item_type = 'career-guide',
              recruiting_body = ?, conducting_body = ?, cadre_group = ?, pay_matrix = ?,
              academic_pathways = ?, premier_institutions = ?, entrance_licensing = ?,
              skills_certifications = ?, salary_progression = ?, career_ladder = ?,
              qualification_tag = ?, official_apply_url = ?, official_portal_url = ?,
              tags_json = ?, language = 'EN+OR', status = 'published', featured = 1,
              summary = ?, body_html = ?, seo_title = ?, seo_description = ?,
              verified_by = 'cat02-enrich@csodisha.com', verified_at = ?,
              updated_by = 'cat02-enrich', updated_at = ?
          WHERE id = ?`)
          .bind(
            folderId, rm.title, rm.title_or,
            rm.conducting_body, rm.conducting_body, rm.cadre_group, rm.pay_matrix,
            rm.academic_pathways, rm.premier_institutions, rm.entrance_licensing,
            rm.skills_certifications, rm.salary_progression, rm.career_ladder,
            rm.qualification_tag, rm.official_portal_url, rm.official_portal_url,
            JSON.stringify(rm.tags), rm.summary, bodyHtml,
            `${rm.title} | CSOdisha Career Explorer`.slice(0, 160), rm.summary.slice(0, 300),
            ts, ts, existing.id
          )
      );
    } else {
      itemStmts.push(
        db.prepare(`INSERT OR IGNORE INTO jobs_directory_items
          (id, domain_slug, folder_id, title, title_or, slug, item_type, recruiting_body, conducting_body,
           cadre_group, pay_matrix, academic_pathways, premier_institutions, entrance_licensing,
           skills_certifications, salary_progression, career_ladder,
           qualification_tag, official_apply_url, official_portal_url,
           cover_image_url, cover_image_alt, attachments_json, links_json, tags_json,
           language, status, featured, summary, body_html, seo_title, seo_description,
           verified_by, verified_at, state_location, created_by, updated_by, created_at, updated_at)
          VALUES (?, 'career-explorer', ?, ?, ?, ?, 'career-guide', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', '[]', '[]', ?, 'EN+OR', 'published', 1, ?, ?, ?, ?, 'cat02-enrich@csodisha.com', ?, 'Odisha', 'cat02-enrich', 'cat02-enrich', ?, ?)`)
          .bind(
            rm.id, folderId, rm.title, rm.title_or, rm.slug,
            rm.conducting_body, rm.conducting_body, rm.cadre_group, rm.pay_matrix,
            rm.academic_pathways, rm.premier_institutions, rm.entrance_licensing,
            rm.skills_certifications, rm.salary_progression, rm.career_ladder,
            rm.qualification_tag, rm.official_portal_url, rm.official_portal_url,
            JSON.stringify(rm.tags), rm.summary, bodyHtml,
            `${rm.title} | CSOdisha Career Explorer`.slice(0, 160), rm.summary.slice(0, 300),
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
