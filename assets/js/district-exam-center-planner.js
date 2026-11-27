/**
 * Common Sense Odisha — Interactive Odisha 30-District Exam Center
 * & Travel Logistics Planner (/exams/ & /odisha-special/, v432)
 * Covers all 30 Odisha districts (Angul to Sundargarh) with OPSC/OSSC/OSSSC/OJEE
 * CBT & OMR test zones, East Coast / South Eastern Railway & OSRTC bus corridors,
 * reporting gate closure buffers, and district collectorate/helpline contacts.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSODistrictExamCenterPlanner = api;
  if (typeof globalThis !== 'undefined') globalThis.CSODistrictExamCenterPlanner = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v432';
  var ROOT_ID = 'cso-district-exam-center-root';
  var PREFS_KEY = 'cso_district_exam_center_prefs_v1';

  var STATE_EXAM_HELPLINES = [
    { board: 'OPSC', phone: '0671-2304141', labelEn: 'OPSC Cuttack Helpline', labelOr: 'OPSC କଟକ ହେଲ୍ପଲାଇନ୍', url: 'https://www.opsc.gov.in/' },
    { board: 'OSSC', phone: '0674-2394466', labelEn: 'OSSC Bhubaneswar Helpline', labelOr: 'OSSC ଭୁବନେଶ୍ୱର ହେଲ୍ପଲାଇନ୍', url: 'https://www.ossc.gov.in/' },
    { board: 'OSSSC', phone: '0674-2597149', labelEn: 'OSSSC Bhubaneswar Helpline', labelOr: 'OSSSC ଭୁବନେଶ୍ୱର ହେଲ୍ପଲାଇନ୍', url: 'https://www.osssc.gov.in/' },
    { board: 'OJEE', phone: '0674-2386075', labelEn: 'OJEE Gandamunda Helpline', labelOr: 'OJEE ଗଣ୍ଡମୁଣ୍ଡା ହେଲ୍ପଲାଇନ୍', url: 'https://ojee.nic.in/' }
  ];

  var SHIFT_PRESETS = [
    { id: 'morning', examStart: '09:00 AM', gateCloses: '08:30 AM', reportBy: '07:45 AM', en: 'Shift 1 — Morning (09:00 AM)', or: 'ଶିଫ୍ଟ ୧ — ସକାଳ (09:00 AM)' },
    { id: 'midday', examStart: '12:30 PM', gateCloses: '12:00 PM', reportBy: '11:15 AM', en: 'Shift 2 — Mid-Day (12:30 PM)', or: 'ଶିଫ୍ଟ ୨ — ମଧ୍ୟାହ୍ନ (12:30 PM)' },
    { id: 'afternoon', examStart: '03:00 PM', gateCloses: '02:30 PM', reportBy: '01:45 PM', en: 'Shift 3 — Afternoon (03:00 PM)', or: 'ଶିଫ୍ଟ ୩ — ଅପରାହ୍ନ (03:00 PM)' }
  ];

  var DISTRICT_HUBS = [
    {
      slug: 'angul', en: 'Angul', or: 'ଅନୁଗୋଳ', division: 'northern', hq: 'Angul', stdCode: '06764',
      portal: 'https://angul.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Angul Town IT Labs, Nalco Nagar & Talcher Engineering Test Centers',
      omrZones: 'Angul Autonomous College, Govt High School & District Police Reserve Ground (PET/PST)',
      railhead: 'Angul (ANGL) / Talcher Road (TLHD) — ECoR',
      busCorridor: 'NH-55 (Cuttack–Sambalpur) · OSRTC Angul Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'balangir', en: 'Balangir', or: 'ବଲାଙ୍ଗୀର', division: 'northern', hq: 'Balangir', stdCode: '06652',
      portal: 'https://balangir.odisha.gov.in/',
      boards: ['OPSC', 'OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Balangir Town CBT Labs, Rajendra University Road & Larkipali Digital Zone',
      omrZones: 'Rajendra University, Govt Women’s College & Balangir Police Parade Ground',
      railhead: 'Balangir Junction (BLGR) / Titlagarh Jn (TIG) — ECoR',
      busCorridor: 'NH-26 & NH-57 · OSRTC Balangir Private/Govt Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'balasore', en: 'Balasore', or: 'ବାଲେଶ୍ୱର', division: 'central', hq: 'Balasore', stdCode: '06782',
      portal: 'https://baleswar.odisha.gov.in/',
      boards: ['OPSC', 'OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Remuna Golai ION Digital Zone, Ganeswarpur & Balasore Engineering College CBT',
      omrZones: 'Fakir Mohan Autonomous College, FM University Nuapadhi & Police Line Ground',
      railhead: 'Balasore (BLS) — South Eastern Railway (Howrah–Chennai Mainline)',
      busCorridor: 'NH-16 (Kolkata–Bhubaneswar) · OSRTC Balasore Bus Stand',
      lastMileBufferMin: 40
    },
    {
      slug: 'bargarh', en: 'Bargarh', or: 'ବରଗଡ଼', division: 'northern', hq: 'Bargarh', stdCode: '06646',
      portal: 'https://bargarh.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Bargarh Town Digital Lab & Sohela Road CBT Centers (Sambalpur Overflow)',
      omrZones: 'Panchayat College Bargarh, Vikash Campus & District Stadium PET/PST',
      railhead: 'Bargarh Road (BRGA) — ECoR',
      busCorridor: 'NH-53 (Raipur–Sambalpur) · OSRTC Bargarh Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'bhadrak', en: 'Bhadrak', or: 'ଭଦ୍ରକ', division: 'central', hq: 'Bhadrak', stdCode: '06784',
      portal: 'https://bhadrak.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Charampa / Bhadrak Bypass CBT Labs & Balasore Nearby Digital Zones',
      omrZones: 'Bhadrak Autonomous College, Zilla School & Nehru Stadium Ground',
      railhead: 'Bhadrak (BHC) — ECoR Mainline',
      busCorridor: 'NH-16 (Bhubaneswar–Balasore) · OSRTC Bhadrak Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'boudh', en: 'Boudh', or: 'ବୌଦ୍ଧ', division: 'southern', hq: 'Boudh', stdCode: '06841',
      portal: 'https://boudh.odisha.gov.in/',
      boards: ['OSSSC'],
      cbtZones: 'Nearest Major CBT Hubs: Balangir / Sambalpur / Cuttack (OSSSC District HQ Local)',
      omrZones: 'Boudh Panchayat College, Govt High School & Boudh Stadium (OSSSC/Police)',
      railhead: 'Rairakhol (RAIR) / Phulbani-Boudh Rail Link (Under ECoR) / Balangir',
      busCorridor: 'NH-57 (Khordha–Balangir) · OSRTC Boudh Bus Stand',
      lastMileBufferMin: 30
    },
    {
      slug: 'cuttack', en: 'Cuttack', or: 'କଟକ', division: 'central', hq: 'Cuttack', stdCode: '0671',
      portal: 'https://cuttack.odisha.gov.in/',
      boards: ['OPSC', 'OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'CDA Sector-11 / Choudwar / Gopalpur ION Digital Zones & Twin-City Bhubaneswar',
      omrZones: 'Ravenshaw University, Sailabala Women’s College, Stewart & Barabati / OSAP 6th Bn',
      railhead: 'Cuttack Junction (CTC) — ECoR Major Hub',
      busCorridor: 'NH-16 · Netaji Bus Terminal (CNBT Khannagar) + CRUT Mo Bus',
      lastMileBufferMin: 55
    },
    {
      slug: 'deogarh', en: 'Deogarh', or: 'ଦେବଗଡ଼', division: 'northern', hq: 'Deogarh', stdCode: '06641',
      portal: 'https://deogarh.odisha.gov.in/',
      boards: ['OSSSC'],
      cbtZones: 'Nearest Major CBT Hubs: Sambalpur / Rourkela / Angul',
      omrZones: 'Deogarh College, Raja Basudev High School & District Police Ground',
      railhead: 'Bamra (BMB) / Sambalpur (SBP) — SER / ECoR',
      busCorridor: 'NH-49 & NH-53 · OSRTC Deogarh Bus Stand',
      lastMileBufferMin: 30
    },
    {
      slug: 'dhenkanal', en: 'Dhenkanal', or: 'ଢେଙ୍କାନାଳ', division: 'northern', hq: 'Dhenkanal', stdCode: '06762',
      portal: 'https://dhenkanal.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Dhenkanal Town Engineering/IT Labs & Cuttack/Bhubaneswar CBT Corridor',
      omrZones: 'Dhenkanal Autonomous College, BB High School & Stadium Ground',
      railhead: 'Dhenkanal (DNKL) — ECoR',
      busCorridor: 'NH-55 (Cuttack–Angul) · OSRTC Dhenkanal Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'gajapati', en: 'Gajapati', or: 'ଗଜପତି', division: 'southern', hq: 'Paralakhemundi', stdCode: '06815',
      portal: 'https://gajapati.odisha.gov.in/',
      boards: ['OSSSC', 'OJEE / NTA'],
      cbtZones: 'Centurion University (Paralakhemundi) CBT Labs & Berhampur Hub',
      omrZones: 'SKCG Autonomous College, MR Boys High School & Gajapati Stadium',
      railhead: 'Paralakhemundi (PLH) / Palasa (PSA) — ECoR',
      busCorridor: 'NH-326A · OSRTC Paralakhemundi Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'ganjam', en: 'Ganjam', or: 'ଗଞ୍ଜାମ', division: 'southern', hq: 'Chhatrapur / Berhampur', stdCode: '0680',
      portal: 'https://ganjam.odisha.gov.in/',
      boards: ['OPSC', 'OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Ambapua / Konisi / Golanthara (Berhampur) ION Digital & Engineering Zones',
      omrZones: 'Khallikote Unitary University, Berhampur Univ Bhanja Bihar & Chhatrapur Ground',
      railhead: 'Brahmapur (BAM) / Chhatrapur (CAP) — ECoR Mainline',
      busCorridor: 'NH-16 · Haldiapadar New Bus Terminal (Berhampur) + City Bus',
      lastMileBufferMin: 50
    },
    {
      slug: 'jagatsinghpur', en: 'Jagatsinghpur', or: 'ଜଗତସିଂହପୁର', division: 'central', hq: 'Jagatsinghpur', stdCode: '06724',
      portal: 'https://jagatsinghpur.odisha.gov.in/',
      boards: ['OSSSC', 'OJEE / NTA'],
      cbtZones: 'Paradip / Jagatsinghpur Town Labs & Cuttack Nearby CBT Hub',
      omrZones: 'SVM Autonomous College, SK Academy & District Police Parade Ground',
      railhead: 'Gorakhnath (GRKN) / Paradip (PRDP) / Cuttack (CTC) — ECoR',
      busCorridor: 'NH-55 & SH-12 · OSRTC Jagatsinghpur Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'jajpur', en: 'Jajpur', or: 'ଯାଜପୁର', division: 'central', hq: 'Panikoili / Jajpur Town', stdCode: '06728',
      portal: 'https://jajpur.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Vyasanagar (Jajpur Road) / Panikoili CBT Labs & Cuttack Nearby Hub',
      omrZones: 'NC Autonomous College, Vyasanagar College & Panikoili Police Ground',
      railhead: 'Jajpur Keonjhar Road (JJKR) — ECoR Mainline',
      busCorridor: 'NH-16 (Panikoili Junction) · OSRTC Jajpur Road Bus Stand',
      lastMileBufferMin: 40
    },
    {
      slug: 'jharsuguda', en: 'Jharsuguda', or: 'ଝାରସୁଗୁଡ଼ା', division: 'northern', hq: 'Jharsuguda', stdCode: '06645',
      portal: 'https://jharsuguda.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Jharsuguda Engineering School / Sarbahal CBT Labs & Sambalpur Hub',
      omrZones: 'LN College Jharsuguda, Govt High School & OSAP 2nd Bn Ground',
      railhead: 'Jharsuguda Junction (JSG) — South Eastern Railway Major Hub',
      busCorridor: 'NH-49 · OSRTC Jharsuguda Bus Stand (Near Veer Surendra Sai Airport)',
      lastMileBufferMin: 35
    },
    {
      slug: 'kalahandi', en: 'Kalahandi', or: 'କଳାହାଣ୍ଡି', division: 'southern', hq: 'Bhawanipatna', stdCode: '06670',
      portal: 'https://kalahandi.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Government College of Engineering (GCE) Kalahandi & Bhawanipatna CBT Labs',
      omrZones: 'Kalahandi University, Govt Autonomous College & Lal Bahadur Stadium',
      railhead: 'Bhawanipatna (BWIP) / Kesinga (KSNG) — ECoR',
      busCorridor: 'NH-26 · OSRTC Bhawanipatna Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'kandhamal', en: 'Kandhamal', or: 'କନ୍ଧମାଳ', division: 'southern', hq: 'Phulbani', stdCode: '06842',
      portal: 'https://kandhamal.odisha.gov.in/',
      boards: ['OSSSC', 'OJEE / NTA'],
      cbtZones: 'Phulbani Govt Polytechnic / IT Labs & Berhampur Nearby CBT Hub',
      omrZones: 'Govt Autonomous College Phulbani, AJO High School & Reserve Police Ground',
      railhead: 'Brahmapur (BAM) / Muniguda (MNGD) — ECoR (Road Connect)',
      busCorridor: 'NH-157 · OSRTC Phulbani Bus Stand (Ghat Road Buffer Advised)',
      lastMileBufferMin: 40
    },
    {
      slug: 'kendrapara', en: 'Kendrapara', or: 'କେନ୍ଦ୍ରାପଡ଼ା', division: 'central', hq: 'Kendrapara', stdCode: '06727',
      portal: 'https://kendrapara.odisha.gov.in/',
      boards: ['OSSSC', 'OJEE / NTA'],
      cbtZones: 'Kendrapara Town IT Labs & Cuttack Nearby ION Digital Zones',
      omrZones: 'Kendrapara Autonomous College, Tulasi Women’s College & Police Ground',
      railhead: 'Kendrapara Road (KNPR) / Cuttack (CTC) — ECoR',
      busCorridor: 'NH-53 (Chandikhole–Paradip) · OSRTC Kendrapara Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'kendujhar', en: 'Kendujhar', or: 'କେନ୍ଦୁଝର', division: 'northern', hq: 'Kendujhar', stdCode: '06766',
      portal: 'https://kendujhar.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'GCE Keonjhar (Jamunalia) CBT Labs & Joda/Barbil Transit Corridor',
      omrZones: 'Dharanidhar University, DN High School & District Police Ground',
      railhead: 'Kendujhargarh (KDJR) — ECoR',
      busCorridor: 'NH-20 & NH-49 · OSRTC Keonjhar Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'khordha', en: 'Khordha', or: 'ଖୋର୍ଦ୍ଧା', division: 'central', hq: 'Khordha / Bhubaneswar', stdCode: '0674',
      portal: 'https://khordha.odisha.gov.in/',
      boards: ['OPSC', 'OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Patia / Infocity / Mancheswar / Tamando / Baramunda ION Digital Zones (State Capital Hub)',
      omrZones: 'BJB Autonomous College, Rama Devi Women’s Univ, Utkal Univ & OSAP 7th Bn Ground',
      railhead: 'Bhubaneswar (BBS) / Khurda Road Jn (KUR) — ECoR HQ',
      busCorridor: 'NH-16 · Baramunda ISBT (BSABT) + CRUT Mo Bus Routes',
      lastMileBufferMin: 60
    },
    {
      slug: 'koraput', en: 'Koraput', or: 'କୋରାପୁଟ', division: 'southern', hq: 'Koraput / Jeypore', stdCode: '06852',
      portal: 'https://koraput.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Jeypore / Sunabeda / Koraput Central University & Engineering CBT Labs',
      omrZones: 'Vikram Dev University (Jeypore), Govt College Koraput & Police Ground',
      railhead: 'Koraput Junction (KRPU) / Jeypore (JYP) — ECoR',
      busCorridor: 'NH-26 & NH-326 · OSRTC Jeypore & Koraput Bus Stands',
      lastMileBufferMin: 40
    },
    {
      slug: 'malkangiri', en: 'Malkangiri', or: 'ମାଲକାନଗିରି', division: 'southern', hq: 'Malkangiri', stdCode: '06861',
      portal: 'https://malkangiri.odisha.gov.in/',
      boards: ['OSSSC'],
      cbtZones: 'Nearest Major CBT Hub: Jeypore / Koraput (District HQ Local for OSSSC)',
      omrZones: 'Malkangiri College, Govt High School & District Police Ground',
      railhead: 'Jeypore (JYP) / Koraput (KRPU) — ECoR (OSRTC Connect)',
      busCorridor: 'NH-326 · OSRTC Malkangiri Bus Stand (Overnight Travel Buffer)',
      lastMileBufferMin: 35
    },
    {
      slug: 'mayurbhanj', en: 'Mayurbhanj', or: 'ମୟୂରଭଞ୍ଜ', division: 'central', hq: 'Baripada', stdCode: '06792',
      portal: 'https://mayurbhanj.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Baripada Takatpur / MSCB University & Rairangpur CBT Labs',
      omrZones: 'MPC Autonomous College, MSCB University & Baripada Police Parade Ground',
      railhead: 'Baripada (BPO) / Betnoti (BTQ) / Balasore (BLS) — SER',
      busCorridor: 'NH-18 & NH-49 · OSRTC Baripada Bus Stand',
      lastMileBufferMin: 40
    },
    {
      slug: 'nabarangpur', en: 'Nabarangpur', or: 'ନବରଙ୍ଗପୁର', division: 'southern', hq: 'Nabarangpur', stdCode: '06858',
      portal: 'https://nabarangpur.odisha.gov.in/',
      boards: ['OSSSC'],
      cbtZones: 'Nearest Major CBT Hub: Jeypore / Koraput / Bhawanipatna',
      omrZones: 'Nabarangpur College, RCD High School & Police Reserve Ground',
      railhead: 'Jeypore (JYP) / Koraput (KRPU) — ECoR',
      busCorridor: 'NH-26 · OSRTC Nabarangpur Bus Stand',
      lastMileBufferMin: 30
    },
    {
      slug: 'nayagarh', en: 'Nayagarh', or: 'ନୟାଗଡ଼', division: 'central', hq: 'Nayagarh', stdCode: '06753',
      portal: 'https://nayagarh.odisha.gov.in/',
      boards: ['OSSSC', 'OJEE / NTA'],
      cbtZones: 'Nayagarh Town Labs & Khordha / Bhubaneswar Nearby CBT Hub',
      omrZones: 'Nayagarh Autonomous College, Brajendra High School & Police Ground',
      railhead: 'Nayagarh Town (NYGT) — ECoR',
      busCorridor: 'NH-57 (Khordha–Nayagarh) · OSRTC Nayagarh Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'nuapada', en: 'Nuapada', or: 'ନୂଆପଡ଼ା', division: 'southern', hq: 'Nuapada', stdCode: '06678',
      portal: 'https://nuapada.odisha.gov.in/',
      boards: ['OSSSC'],
      cbtZones: 'Nearest Major CBT Hub: Balangir / Bhawanipatna / Sambalpur',
      omrZones: 'National College Nuapada, Khariar College & Police Ground',
      railhead: 'Nuapada Road (NPD) / Khariar Road (KRAR) — ECoR',
      busCorridor: 'NH-353 · OSRTC Nuapada & Khariar Bus Stands',
      lastMileBufferMin: 30
    },
    {
      slug: 'puri', en: 'Puri', or: 'ପୁରୀ', division: 'central', hq: 'Puri', stdCode: '06752',
      portal: 'https://puri.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Puri Bypass / Sakhigopal IT Labs & Bhubaneswar Twin-Corridor CBT',
      omrZones: 'SCS Autonomous College, Govt Women’s College & Talabania Police Ground',
      railhead: 'Puri (PURI) — ECoR Terminal Station',
      busCorridor: 'NH-316 (Bhubaneswar–Puri) · Malatipatpur / Puri Bus Stand + Mo Bus',
      lastMileBufferMin: 45
    },
    {
      slug: 'rayagada', en: 'Rayagada', or: 'ରାୟଗଡ଼ା', division: 'southern', hq: 'Rayagada', stdCode: '06856',
      portal: 'https://rayagada.odisha.gov.in/',
      boards: ['OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'GIET University (Gunupur) / Rayagada Autonomous College CBT Labs',
      omrZones: 'Rayagada Autonomous College, GCD High School & Police Parade Ground',
      railhead: 'Rayagada (RGDA) — ECoR Junction',
      busCorridor: 'NH-326 · OSRTC Rayagada Bus Stand',
      lastMileBufferMin: 35
    },
    {
      slug: 'sambalpur', en: 'Sambalpur', or: 'ସମ୍ବଲପୁର', division: 'northern', hq: 'Sambalpur', stdCode: '0663',
      portal: 'https://sambalpur.odisha.gov.in/',
      boards: ['OPSC', 'OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Ainthapali / Burla / Hirakud / VSSUT & Sambalpur Univ ION Digital Zones',
      omrZones: 'Gangadhar Meher University, Burla Govt College & Reserve Police Ground',
      railhead: 'Sambalpur Junction (SBP) / Hirakud (HKG) — ECoR Division HQ',
      busCorridor: 'NH-53 & NH-55 · Ainthapali Private/OSRTC Bus Terminal',
      lastMileBufferMin: 50
    },
    {
      slug: 'subarnapur', en: 'Subarnapur', or: 'ସୁବର୍ଣ୍ଣପୁର', division: 'northern', hq: 'Sonepur', stdCode: '06654',
      portal: 'https://subarnapur.odisha.gov.in/',
      boards: ['OSSSC'],
      cbtZones: 'Nearest Major CBT Hub: Balangir / Sambalpur (District HQ Local for OSSSC)',
      omrZones: 'Sonepur College, Maharaja High School & Police Reserve Ground',
      railhead: 'Sonepur (SNPU) / Balangir (BLGR) — ECoR',
      busCorridor: 'NH-57 · OSRTC Sonepur Bus Stand',
      lastMileBufferMin: 30
    },
    {
      slug: 'sundargarh', en: 'Sundargarh', or: 'ସୁନ୍ଦରଗଡ଼', division: 'northern', hq: 'Sundargarh / Rourkela', stdCode: '0661',
      portal: 'https://sundargarh.odisha.gov.in/',
      boards: ['OPSC', 'OSSC', 'OSSSC', 'OJEE / NTA'],
      cbtZones: 'Chhend / NIT Rourkela / Panposh / Sector-2 ION Digital Zones (Steel City Hub)',
      omrZones: 'Govt Autonomous College Rourkela, Sundargarh Govt College & OSAP 4th Bn Ground',
      railhead: 'Rourkela Junction (ROU) — South Eastern Railway Mainline',
      busCorridor: 'NH-143 · Rourkela New Bus Stand & Sundargarh OSRTC Stand',
      lastMileBufferMin: 50
    }
  ];

  function getDistrictBySlug(slug) {
    var key = String(slug || 'khordha').toLowerCase();
    for (var i = 0; i < DISTRICT_HUBS.length; i += 1) {
      if (DISTRICT_HUBS[i].slug === key) return DISTRICT_HUBS[i];
    }
    return DISTRICT_HUBS[18]; // Khordha default
  }

  function getShiftById(shiftId) {
    var key = String(shiftId || 'morning').toLowerCase();
    for (var i = 0; i < SHIFT_PRESETS.length; i += 1) {
      if (SHIFT_PRESETS[i].id === key) return SHIFT_PRESETS[i];
    }
    return SHIFT_PRESETS[0];
  }

  function planDistrictExamTrip(opts) {
    var o = opts || {};
    var home = getDistrictBySlug(o.homeDistrict || 'khordha');
    var center = getDistrictBySlug(o.centerDistrict || 'khordha');
    var shift = getShiftById(o.shiftPreset || 'morning');

    var isSameDistrict = home.slug === center.slug;
    var sameDivision = home.division === center.division;
    var gateClosureBufferMin = 30;
    var lastMileBufferMin = center.lastMileBufferMin;

    var travelType = isSameDistrict
      ? 'same-district'
      : (sameDivision ? 'same-division-inter' : 'cross-division-overnight');
    var recommendedLeadMinutes = isSameDistrict
      ? (gateClosureBufferMin + lastMileBufferMin + 30)
      : (sameDivision ? (gateClosureBufferMin + lastMileBufferMin + 180) : (gateClosureBufferMin + lastMileBufferMin + 480));

    var adviceEn = isSameDistrict
      ? ('Same-District Local Transit: Leave home at least ' + recommendedLeadMinutes + ' mins before exam start (' + shift.examStart + ') to clear local traffic & ' + gateClosureBufferMin + '-min strict gate closure (' + shift.gateCloses + ').')
      : (sameDivision
        ? ('Inter-District Same-Division Travel (' + home.en + ' → ' + center.en + '): Start early morning via ' + center.railhead + ' or ' + center.busCorridor + '; keep ' + lastMileBufferMin + ' mins for last-mile auto/city bus to reach by ' + shift.reportBy + '.')
        : ('Cross-Division Overnight Travel (' + home.en + ' → ' + center.en + '): Reach ' + center.hq + ' the evening before exam day via ' + center.railhead + ' / OSRTC night coach and stay near the test zone to avoid missing ' + shift.gateCloses + ' gate closure.'));

    var adviceOr = isSameDistrict
      ? ('ସମାନ ଜିଲ୍ଲା ଯାତ୍ରା: ପରୀକ୍ଷା (' + shift.examStart + ') ରୁ ଅତି କମରେ ' + recommendedLeadMinutes + ' ମିନିଟ୍ ପୂର୍ବରୁ ବାହାରନ୍ତୁ, ଯେପରି ' + shift.gateCloses + ' ଗେଟ୍ ବନ୍ଦ ପୂର୍ବରୁ ପହଞ୍ଚିପାରିବେ।')
      : (sameDivision
        ? ('ଆନ୍ତଃ-ଜିଲ୍ଲା ଯାତ୍ରା (' + home.or + ' → ' + center.or + '): ସକାଳୁ ' + center.railhead + ' କିମ୍ବା OSRTC ବସ୍ ଯୋଗେ ବାହାରି ' + shift.reportBy + ' ସୁଦ୍ଧା ପହଞ୍ଚନ୍ତୁ।')
        : ('ଦୂର ଆନ୍ତଃ-ଡିଭିଜନ୍ ଯାତ୍ରା (' + home.or + ' → ' + center.or + '): ପରୀକ୍ଷାର ପୂର୍ବ ସନ୍ଧ୍ୟାରେ ' + center.hq + ' ରେ ପହଞ୍ଚି ରାତ୍ରିଯାପନ କରନ୍ତୁ, ଯେପରି ' + shift.gateCloses + ' ଗେଟ୍ ବନ୍ଦ ମିସ୍ ନହୁଏ।'));

    return {
      homeDistrict: home,
      centerDistrict: center,
      shift: shift,
      isSameDistrict: isSameDistrict,
      sameDivision: sameDivision,
      travelType: travelType,
      gateClosureBufferMin: gateClosureBufferMin,
      lastMileBufferMin: lastMileBufferMin,
      recommendedLeadMinutes: recommendedLeadMinutes,
      adviceEn: adviceEn,
      adviceOr: adviceOr
    };
  }

  function loadPrefs() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function savePrefs(state) {
    try {
      if (win.localStorage) win.localStorage.setItem(PREFS_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function copyText(str) {
    if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      return win.navigator.clipboard.writeText(str);
    }
    return new Promise(function (resolve) {
      try {
        var ta = doc.createElement('textarea');
        ta.value = str;
        ta.className = 'cso-sr-only';
        doc.body.appendChild(ta);
        ta.select();
        doc.execCommand('copy');
        ta.remove();
      } catch (_) {}
      resolve();
    });
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadPrefs() || {};
    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      homeDistrict: saved.homeDistrict || 'cuttack',
      centerDistrict: saved.centerDistrict || 'khordha',
      shiftPreset: saved.shiftPreset || 'morning',
      divisionFilter: saved.divisionFilter || 'all'
    };

    function persistAndRender() {
      savePrefs(state);
      render();
    }

    function render() {
      var orMode = state.lang === 'or';
      var trip = planDistrictExamTrip(state);
      var c = trip.centerDistrict;

      var card = el('div', 'cso-dec-card');
      card.setAttribute('data-cso-district-exam-planner', '1');

      // Header
      var head = el('div', 'cso-dec-head');
      var headCopy = el('div', 'cso-dec-head-copy');
      headCopy.appendChild(el('div', 'cso-dec-eyebrow', orMode
        ? '🚆 ୩୦-ଜିଲ୍ଲା ପରୀକ୍ଷା କେନ୍ଦ୍ର ଓ ଯାତାୟାତ ଯୋଜନା (OPSC / OSSC / OSSSC / OJEE)'
        : '🚆 30-DISTRICT ODISHA EXAM CENTER & TRAVEL LOGISTICS PLANNER'));
      headCopy.appendChild(el('h2', 'cso-dec-title', orMode
        ? 'ଓଡ଼ିଶା ଜିଲ୍ଲାୱାରୀ CBT / OMR ପରୀକ୍ଷା କେନ୍ଦ୍ର, ରେଳ-ବସ୍ ରୁଟ୍ ଓ ହେଲ୍ପଲାଇନ୍'
        : 'Odisha District-Wise Exam Center, Rail/Bus Corridor & Reporting Buffer'));
      headCopy.appendChild(el('p', 'cso-dec-sub', orMode
        ? 'ନିଜ ଜିଲ୍ଲା ଓ ପରୀକ୍ଷା କେନ୍ଦ୍ର ଜିଲ୍ଲା ବାଛନ୍ତୁ — ପ୍ରମୁଖ ION Digital / OMR ଜୋନ୍, ECoR ରେଳ ଷ୍ଟେସନ୍, OSRTC ବସ୍ ରୁଟ୍, 30-ମିନିଟ୍ ଗେଟ୍ ବନ୍ଦ ବଫର୍ ଓ ଜିଲ୍ଲାପାଳ ହେଲ୍ପଲାଇନ୍ ଦେଖନ୍ତୁ।'
        : 'Select your Home District & Allotted Exam Center District to check CBT/OMR test zones, ECoR/SER railheads, OSRTC corridors, 30-min gate buffers & helplines.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-dec-lang-toggle');
      langToggle.setAttribute('role', 'group');
      langToggle.setAttribute('aria-label', 'Language toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-dec-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persistAndRender(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Route & Shift Form
      var formGrid = el('div', 'cso-dec-form-grid');

      function addSelect(id, label, items, currentVal, onChange) {
        var box = el('div', 'cso-dec-field');
        var lbl = el('label', 'cso-dec-label', label);
        lbl.setAttribute('for', id);
        var sel = el('select', 'cso-dec-input');
        sel.id = id;
        items.forEach(function (it) {
          var opt = el('option', '', it.label);
          opt.value = it.value;
          if (it.value === currentVal) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', function () { onChange(sel.value); });
        box.appendChild(lbl);
        box.appendChild(sel);
        formGrid.appendChild(box);
      }

      var distOpts = DISTRICT_HUBS.map(function (d) {
        return { value: d.slug, label: orMode ? (d.or + ' (' + d.en + ')') : (d.en + ' — ' + d.hq) };
      });
      addSelect('cso-dec-home', orMode ? 'ନିଜ ଜିଲ୍ଲା (Home District)' : 'Home District', distOpts, state.homeDistrict, function (v) { state.homeDistrict = v; persistAndRender(); });
      addSelect('cso-dec-center', orMode ? 'ଆବଣ୍ଟିତ ପରୀକ୍ଷା କେନ୍ଦ୍ର ଜିଲ୍ଲା' : 'Allotted Exam Center District', distOpts, state.centerDistrict, function (v) { state.centerDistrict = v; persistAndRender(); });
      addSelect('cso-dec-shift', orMode ? 'ପରୀକ୍ଷା ଶିଫ୍ଟ ସମୟ' : 'Exam Shift Preset', SHIFT_PRESETS.map(function (sp) {
        return { value: sp.id, label: orMode ? sp.or : sp.en };
      }), state.shiftPreset, function (v) { state.shiftPreset = v; persistAndRender(); });

      card.appendChild(formGrid);

      // Travel & Gate Buffer Advisory Banner
      var adv = el('div', 'cso-dec-advisory cso-dec-advisory--' + trip.travelType);
      adv.setAttribute('role', 'status');
      adv.setAttribute('aria-live', 'polite');
      var advHead = el('strong', 'cso-dec-advisory-title', orMode
        ? (trip.homeDistrict.or + ' → ' + c.or + ' · ଗେଟ୍ ବନ୍ଦ: ' + trip.shift.gateCloses + ' (30-ମିନିଟ୍ ବଫର୍) · ରିପୋର୍ଟିଂ: ' + trip.shift.reportBy)
        : (trip.homeDistrict.en + ' → ' + c.en + ' · Gate Closes: ' + trip.shift.gateCloses + ' (30-Min Buffer) · Report By: ' + trip.shift.reportBy));
      adv.appendChild(advHead);
      adv.appendChild(el('span', 'cso-dec-advisory-body', orMode ? trip.adviceOr : trip.adviceEn));
      card.appendChild(adv);

      // Selected District Exam Center Dossier
      var dossier = el('div', 'cso-dec-dossier');
      var dTop = el('div', 'cso-dec-dossier-top');
      dTop.appendChild(el('h3', 'cso-dec-dossier-title', (orMode ? c.or + ' (' + c.en + ')' : c.en + ' (' + c.hq + ')') + ' — ' + (orMode ? 'ପରୀକ୍ଷା କେନ୍ଦ୍ର ଓ ଯାତାୟାତ ବିବରଣୀ' : 'Exam Center & Transit Dossier')));
      var boardsWrap = el('div', 'cso-dec-boards');
      c.boards.forEach(function (b) { boardsWrap.appendChild(el('span', 'cso-dec-board-pill', b)); });
      dTop.appendChild(boardsWrap);
      dossier.appendChild(dTop);

      var infoGrid = el('div', 'cso-dec-info-grid');
      [
        { k: orMode ? '💻 ପ୍ରମୁଖ CBT ଟେଷ୍ଟ ଜୋନ୍' : '💻 Major CBT Test Zones', v: c.cbtZones },
        { k: orMode ? '📝 OMR କଲେଜ ଓ PET/PST ପଡ଼ିଆ' : '📝 OMR School/College & PET/PST Clusters', v: c.omrZones },
        { k: orMode ? '🚆 ନିକଟତମ ରେଳ ଷ୍ଟେସନ୍ (ECoR / SER)' : '🚆 Primary Railhead (ECoR / SER)', v: c.railhead },
        { k: orMode ? '🚌 OSRTC ବସ୍ ଓ ଜାତୀୟ ରାଜପଥ (NH)' : '🚌 OSRTC Bus & Highway Corridor', v: c.busCorridor + ' (Last-mile buffer: +' + c.lastMileBufferMin + ' mins)' }
      ].forEach(function (row) {
        var box = el('div', 'cso-dec-info-box');
        box.appendChild(el('span', 'cso-dec-info-key', row.k));
        box.appendChild(el('span', 'cso-dec-info-val', row.v));
        infoGrid.appendChild(box);
      });
      dossier.appendChild(infoGrid);

      // Collectorate & Helplines Strip
      var helpRow = el('div', 'cso-dec-helplines');
      var nicLink = el('a', 'cso-dec-help-chip cso-dec-help-chip--link', (orMode ? '🏛️ ଜିଲ୍ଲା NIC ପୋର୍ଟାଲ୍: ' : '🏛️ Collectorate NIC Portal: ') + c.portal.replace('https://', ''));
      nicLink.href = c.portal;
      nicLink.target = '_blank';
      nicLink.rel = 'noopener noreferrer';
      helpRow.appendChild(nicLink);
      helpRow.appendChild(el('span', 'cso-dec-help-chip', (orMode ? '🚨 ଜିଲ୍ଲା କଣ୍ଟ୍ରୋଲ୍ ରୁମ୍: ' : '🚨 District Emergency Control Room: ') + '1077 (STD ' + c.stdCode + ')'));
      STATE_EXAM_HELPLINES.forEach(function (hl) {
        helpRow.appendChild(el('span', 'cso-dec-help-chip', '📞 ' + hl.board + ': ' + hl.phone));
      });
      dossier.appendChild(helpRow);
      card.appendChild(dossier);

      // Quick 30-District Hub Chips (Division Filter)
      var divBar = el('div', 'cso-dec-div-bar');
      [
        { id: 'all', en: 'All 30 Districts', or: 'ସମସ୍ତ ୩୦ ଜିଲ୍ଲା' },
        { id: 'central', en: 'Central (10)', or: 'କେନ୍ଦ୍ରୀୟ (୧୦)' },
        { id: 'northern', en: 'Northern (10)', or: 'ଉତ୍ତରାଞ୍ଚଳ (୧୦)' },
        { id: 'southern', en: 'Southern (10)', or: 'ଦକ୍ଷିଣାଞ୍ଚଳ (୧୦)' }
      ].forEach(function (dv) {
        var b = el('button', 'cso-dec-div-btn' + (state.divisionFilter === dv.id ? ' is-active' : ''), orMode ? dv.or : dv.en);
        b.type = 'button';
        b.addEventListener('click', function () { state.divisionFilter = dv.id; persistAndRender(); });
        divBar.appendChild(b);
      });
      card.appendChild(divBar);

      var chipGrid = el('div', 'cso-dec-chips');
      DISTRICT_HUBS.filter(function (d) {
        return state.divisionFilter === 'all' || d.division === state.divisionFilter;
      }).forEach(function (d) {
        var cb = el('button', 'cso-dec-chip' + (d.slug === state.centerDistrict ? ' is-active' : ''), orMode ? d.or : d.en);
        cb.type = 'button';
        cb.addEventListener('click', function () { state.centerDistrict = d.slug; persistAndRender(); });
        chipGrid.appendChild(cb);
      });
      card.appendChild(chipGrid);

      // Actions
      var actions = el('div', 'cso-dec-actions');
      var copyBtn = el('button', 'cso-dec-btn cso-dec-btn--primary', orMode ? '📋 କେନ୍ଦ୍ର ଓ ଯାତାୟାତ ଯୋଜନା କପି କରନ୍ତୁ' : '📋 Copy Center & Transit Plan');
      copyBtn.type = 'button';
      var copyStatus = el('span', 'cso-dec-copy-status');
      copyStatus.setAttribute('aria-live', 'polite');
      copyBtn.addEventListener('click', function () {
        var text = [
          'CS Odisha — Exam Center & Travel Plan (' + trip.homeDistrict.en + ' → ' + c.en + ')',
          'Shift: ' + trip.shift.en + ' | Report By: ' + trip.shift.reportBy + ' | Gate Closes: ' + trip.shift.gateCloses,
          'Advice: ' + trip.adviceEn,
          'CBT Zones: ' + c.cbtZones,
          'OMR / PET-PST: ' + c.omrZones,
          'Railhead: ' + c.railhead,
          'Bus / NH: ' + c.busCorridor + ' (Last-mile +' + c.lastMileBufferMin + ' mins)',
          'District Portal: ' + c.portal + ' | Control Room: 1077 (STD ' + c.stdCode + ')',
          'Helplines: OPSC 0671-2304141 | OSSC 0674-2394466 | OSSSC 0674-2597149 | OJEE 0674-2386075'
        ].join('\n');
        copyText(text).then(function () {
          copyStatus.textContent = orMode ? '✅ କପି ହୋଇଗଲା!' : '✅ Center & transit plan copied!';
          setTimeout(function () { copyStatus.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-dec-btn', orMode ? '🖨️ ପରୀକ୍ଷା କେନ୍ଦ୍ର ଡୋସିଅର୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Exam Center Dossier');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      actions.appendChild(copyStatus);
      card.appendChild(actions);

      container.replaceChildren(card);
    }

    render();
    return { render: render, getState: function () { return Object.assign({}, state); } };
  }

  function autoMount() {
    if (!doc) return;
    var root = doc.getElementById(ROOT_ID);
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', autoMount);
    } else {
      autoMount();
    }
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    STATE_EXAM_HELPLINES: STATE_EXAM_HELPLINES,
    SHIFT_PRESETS: SHIFT_PRESETS,
    DISTRICT_HUBS: DISTRICT_HUBS,
    getDistrictBySlug: getDistrictBySlug,
    planDistrictExamTrip: planDistrictExamTrip,
    mount: mount
  };
});
