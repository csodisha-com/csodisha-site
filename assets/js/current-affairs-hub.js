/**
 * Common Sense Odisha — Bilingual Daily Current Affairs Quiz & Clean-Sheet Study Digest (v403)
 * Powers /current-affairs/ with:
 *  - Section A: Topic & Date Filter Toolbar synced with ?topic= URL param
 *  - Section B: Interactive 10-MCQ Odisha + National Current Affairs Drill with localStorage best score
 *  - Section C: Live D1 Bulletin Archive + 1-Click Clean-Sheet Print Study Digest (PDF)
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOCurrentAffairsHub = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOCurrentAffairsHub = api;
})(function (win, doc) {
  'use strict';

  var STATS_STORAGE_KEY = 'cso_ca_quiz_stats_v1';

  var TOPICS = [
    { key: 'all', en: 'All Topics', or: 'ସବୁ ବିଷୟ' },
    { key: 'odisha-governance', en: 'Odisha Governance', or: 'ଓଡ଼ିଶା ଶାସନ' },
    { key: 'economy', en: 'Economy', or: 'ଅର୍ଥନୀତି' },
    { key: 'awards-sports', en: 'Awards & Sports', or: 'ପୁରସ୍କାର ଓ କ୍ରୀଡ଼ା' },
    { key: 'national-international', en: 'National & International', or: 'ଜାତୀୟ ଓ ଅନ୍ତର୍ଜାତୀୟ' }
  ];

  var DATE_WINDOWS = [
    { key: 'all', en: 'All Bulletins', or: 'ସବୁ ବୁଲେଟିନ୍' },
    { key: 'today', en: 'Today / Latest', or: 'ଆଜି / ସଦ୍ୟତମ' },
    { key: '7d', en: 'Last 7 Days', or: 'ଗତ ୭ ଦିନ' },
    { key: 'nov-2026', en: 'November 2026 Archive', or: 'ନଭେମ୍ବର ୨୦୨୬' }
  ];

  var CURATED_BULLETINS = [
    {
      id: 'ca:paradip-green-hydrogen-2026',
      url: '/updates/?category=guides',
      topic: 'economy',
      date_iso: '2026-11-27',
      org: 'Paradip Port Authority · Govt. of Odisha',
      title_en: 'Paradip Port Green Hydrogen & Maritime Logistics Corridor Expansion',
      title_or: 'ପାରାଦୀପ ବନ୍ଦର ଗ୍ରୀନ୍ ହାଇଡ୍ରୋଜେନ୍ ଓ ସାମୁଦ୍ରିକ ଲଜିଷ୍ଟିକ୍ସ କରିଡର୍ ବିସ୍ତାର',
      summary_en: 'Paradip Port advances India\'s Eastern Maritime Green Hydrogen Export Hub under the National Green Hydrogen Mission with dedicated ammonia bunkering and coastal cargo berths.',
      summary_or: 'ଜାତୀୟ ଗ୍ରୀନ୍ ହାଇଡ୍ରୋଜେନ୍ ମିଶନ୍ ଅଧୀନରେ ପାରାଦୀପ ବନ୍ଦରରେ ଗ୍ରୀନ୍ ଆମୋନିଆ ବଙ୍କରିଂ ଓ ରପ୍ତାନି ହବ୍ ପ୍ରକଳ୍ପ ତ୍ୱରାନ୍ୱିତ ହୋଇଛି।',
      key_facts_en: 'Paradip Port (Jagatsinghpur) is Odisha\'s only Major Port and a leading cargo-handling port on India\'s east coast.'
    },
    {
      id: 'ca:bbsr-semiconductor-design-2026',
      url: '/odisha-special/',
      topic: 'odisha-governance',
      date_iso: '2026-11-26',
      org: 'E&IT Department, Govt. of Odisha',
      title_en: 'Bhubaneswar Semiconductor Design & O-Chip Centre Milestones',
      title_or: 'ଭୁବନେଶ୍ୱର ସେମିକଣ୍ଡକ୍ଟର ଡିଜାଇନ୍ ଓ O-Chip କେନ୍ଦ୍ର ଅଗ୍ରଗତି',
      summary_en: 'Under the Odisha Semiconductor Manufacturing & Fabless Policy, Bhubaneswar\'s Info Valley & O-Chip design ecosystem expands VLSI training and OSAT investment incentives.',
      summary_or: 'ଓଡ଼ିଶା ସେମିକଣ୍ଡକ୍ଟର ଓ ଫ୍ୟାବଲେସ୍ ନୀତି ଅଧୀନରେ ଭୁବନେଶ୍ୱରରେ VLSI ତାଲିମ ଓ OSAT ନିବେଶ ପ୍ରୋତ୍ସାହନ ବୃଦ୍ଧି ପାଇଛି।',
      key_facts_en: 'Info Valley (Khordha/Bhubaneswar) anchors Odisha\'s Electronics Manufacturing Cluster (EMC 2.0).'
    },
    {
      id: 'ca:opsc-osssc-digital-governance-2026',
      url: '/jobs/',
      topic: 'odisha-governance',
      date_iso: '2026-11-25',
      org: 'OPSC · OSSC · OSSSC',
      title_en: 'Odisha Public Recruitment Transparency & Unified Exam Calendar Push',
      title_or: 'ଓଡ଼ିଶା ସରକାରୀ ନିଯୁକ୍ତି ସ୍ୱଚ୍ଛତା ଓ ଏକୀକୃତ ପରୀକ୍ଷା କ୍ୟାଲେଣ୍ଡର୍',
      summary_en: 'State recruitment commissions streamline OTR verification, OMR answer-key transparency, and district-wise CBT centre mapping across all 30 Odisha districts.',
      summary_or: 'ରାଜ୍ୟ ନିଯୁକ୍ତି ଆୟୋଗଗୁଡ଼ିକ ୩୦ଟି ଜିଲ୍ଲାରେ OTR ଯାଞ୍ଚ, OMR ଉତ୍ତର କୀ ଓ CBT କେନ୍ଦ୍ର ବ୍ୟବସ୍ଥାକୁ ସୁଦୃଢ଼ କରିଛନ୍ତି।',
      key_facts_en: 'Candidates can track live OPSC, OSSC, OSSSC & OAVS cycles directly via the CS Odisha Jobs & Updates hubs.'
    },
    {
      id: 'ca:odisha-hockey-kalinga-sports-2026',
      url: '/odisha-special/',
      topic: 'awards-sports',
      date_iso: '2026-11-24',
      org: 'Sports & Youth Services Dept, Odisha',
      title_en: 'Odisha Hockey High-Performance Centres & Birsa Munda Stadium Legacy',
      title_or: 'ଓଡ଼ିଶା ହକି ହାଇ-ପରଫର୍ମାନ୍ସ କେନ୍ଦ୍ର ଓ ବିର୍ସା ମୁଣ୍ଡା ଷ୍ଟାଡିୟମ୍',
      summary_en: 'Rourkela\'s Birsa Munda International Hockey Stadium and Bhubaneswar\'s Kalinga Stadium host junior national camps and grassroots turf academies across Sundargarh.',
      summary_or: 'ରାଉରକେଲାର ବିର୍ସା ମୁଣ୍ଡା ହକି ଷ୍ଟାଡିୟମ୍ ଓ ଭୁବନେଶ୍ୱରର କଳିଙ୍ଗ ଷ୍ଟାଡିୟମ୍ ଜାତୀୟ କ୍ରୀଡ଼ା ପ୍ରଶିକ୍ଷଣର ପ୍ରମୁଖ କେନ୍ଦ୍ର ଭାବେ ଉଭା ହୋଇଛି।',
      key_facts_en: 'Birsa Munda International Hockey Stadium (Rourkela, Sundargarh) is recognized as the world\'s largest seated hockey stadium.'
    },
    {
      id: 'ca:india-dpi-upi-global-2026',
      url: '/guides/',
      topic: 'national-international',
      date_iso: '2026-11-22',
      org: 'NPCI · Ministry of External Affairs',
      title_en: 'India\'s Digital Public Infrastructure (UPI & DigiLocker) Global Expansion',
      title_or: 'ଭାରତର ଡିଜିଟାଲ୍ ପବ୍ଲିକ୍ ଇନଫ୍ରାଷ୍ଟ୍ରକଚର୍ (UPI ଓ DigiLocker) ବିଶ୍ୱସ୍ତରୀୟ ପ୍ରସାର',
      summary_en: 'Cross-border UPI merchant linkages expand across Asia, Europe, and the Gulf, reinforcing India\'s Digital Public Infrastructure (DPI) framework in G20/Global South forums.',
      summary_or: 'ଏସିଆ, ୟୁରୋପ୍ ଓ ଗଲ୍ଫ ଦେଶଗୁଡ଼ିକରେ UPI ଲିଙ୍କେଜ୍ ପ୍ରସାରିତ ହୋଇ ଭାରତର DPI ମଡେଲକୁ ବିଶ୍ୱସ୍ତରରେ ସ୍ୱୀକୃତି ମିଳିଛି।',
      key_facts_en: 'NPCI (National Payments Corporation of India) operates UPI, RuPay, and IMPS under RBI oversight.'
    },
    {
      id: 'ca:subhadra-dbt-financial-inclusion-2026',
      url: '/schemes/',
      topic: 'economy',
      date_iso: '2026-11-18',
      org: 'W&CD Dept, Govt. of Odisha',
      title_en: 'Subhadra Yojana Direct Benefit Transfer (DBT) & Women Financial Inclusion',
      title_or: 'ସୁଭଦ୍ରା ଯୋଜନା DBT ଓ ମହିଳା ଆର୍ଥିକ ସଶକ୍ତିକରଣ',
      summary_en: 'Aadhaar-seeded NPCI Direct Benefit Transfer under Subhadra Yojana boosts rural household liquidity and digital banking literacy across all 30 Odisha districts.',
      summary_or: 'ଆଧାର-ଲିଙ୍କ୍ NPCI DBT ମାଧ୍ୟମରେ ସୁଭଦ୍ରା ଯୋଜନା ଓଡ଼ିଶାର ୩୦ ଜିଲ୍ଲାରେ ମହିଳାଙ୍କ ଆର୍ଥିକ ସଶକ୍ତିକରଣକୁ ଗତି ଦେଇଛି।',
      key_facts_en: 'Eligible women aged 21–60 receive ₹10,000 per year in two installments of ₹5,000 via Aadhaar-enabled DBT.'
    }
  ];

  var MCQ_BANK = [
    {
      id: 'caq1',
      topic: 'economy',
      question_en: 'Which major port in Odisha is being developed as a Green Hydrogen & Green Ammonia Export Hub under the National Green Hydrogen Mission?',
      question_or: 'ଜାତୀୟ ଗ୍ରୀନ୍ ହାଇଡ୍ରୋଜେନ୍ ମିଶନ୍ ଅଧୀନରେ ଓଡ଼ିଶାର କେଉଁ ପ୍ରମୁଖ ବନ୍ଦରକୁ ଗ୍ରୀନ୍ ହାଇଡ୍ରୋଜେନ୍ ରପ୍ତାନି ହବ୍ ଭାବେ ବିକଶିତ କରାଯାଉଛି?',
      options_en: ['Gopalpur Port', 'Paradip Port', 'Dhamra Port', 'Astaranga Port'],
      options_or: ['ଗୋପାଳପୁର ବନ୍ଦର', 'ପାରାଦୀପ ବନ୍ଦର', 'ଧାମରା ବନ୍ଦର', 'ଅସ୍ତରଙ୍ଗ ବନ୍ଦର'],
      correct_index: 1,
      explanation_en: 'Paradip Port (Jagatsinghpur district) is Odisha\'s only Major Port and one of India\'s flagship Green Hydrogen export hubs.',
      explanation_or: 'ଜଗତସିଂହପୁର ଜିଲ୍ଲାର ପାରାଦୀପ ବନ୍ଦର ହେଉଛି ଓଡ଼ିଶାର ଏକମାତ୍ର ପ୍ରମୁଖ ବନ୍ଦର ଓ ଗ୍ରୀନ୍ ହାଇଡ୍ରୋଜେନ୍ ରପ୍ତାନି ହବ୍।'
    },
    {
      id: 'caq2',
      topic: 'odisha-governance',
      question_en: 'Where is Odisha\'s flagship Electronics Manufacturing Cluster (EMC 2.0 / Info Valley) supporting semiconductor design and OSAT located?',
      question_or: 'ସେମିକଣ୍ଡକ୍ଟର ଡିଜାଇନ୍ ଓ OSAT ପାଇଁ ଓଡ଼ିଶାର ପ୍ରମୁଖ Electronics Manufacturing Cluster (Info Valley) କେଉଁଠାରେ ଅବସ୍ଥିତ?',
      options_en: ['Sambalpur', 'Bhubaneswar (Khordha)', 'Berhampur', 'Balasore'],
      options_or: ['ସମ୍ବଲପୁର', 'ଭୁବନେଶ୍ୱର (ଖୋର୍ଦ୍ଧା)', 'ବ୍ରହ୍ମପୁର', 'ବାଲେଶ୍ୱର'],
      correct_index: 1,
      explanation_en: 'Info Valley near Bhubaneswar (Khordha) anchors Odisha\'s semiconductor design (O-Chip) and EMC 2.0 ecosystem.',
      explanation_or: 'ଭୁବନେଶ୍ୱର (ଖୋର୍ଦ୍ଧା) ନିକଟସ୍ଥ ଇନଫୋ ଭ୍ୟାଲି ଓଡ଼ିଶାର ସେମିକଣ୍ଡକ୍ଟର ଓ EMC 2.0 ଇକୋସିଷ୍ଟମର କେନ୍ଦ୍ର।'
    },
    {
      id: 'caq3',
      topic: 'awards-sports',
      question_en: 'In which Odisha district is the Birsa Munda International Hockey Stadium located?',
      question_or: 'ବିର୍ସା ମୁଣ୍ଡା ଅନ୍ତର୍ଜାତୀୟ ହକି ଷ୍ଟାଡିୟମ୍ ଓଡ଼ିଶାର କେଉଁ ଜିଲ୍ଲାରେ ଅବସ୍ଥିତ?',
      options_en: ['Khordha', 'Cuttack', 'Sundargarh', 'Mayurbhanj'],
      options_or: ['ଖୋର୍ଦ୍ଧା', 'କଟକ', 'ସୁନ୍ଦରଗଡ଼', 'ମୟୂରଭଞ୍ଜ'],
      correct_index: 2,
      explanation_en: 'Birsa Munda International Hockey Stadium is located in Rourkela, Sundargarh district.',
      explanation_or: 'ବିର୍ସା ମୁଣ୍ଡା ଅନ୍ତର୍ଜାତୀୟ ହକି ଷ୍ଟାଡିୟମ୍ ସୁନ୍ଦରଗଡ଼ ଜିଲ୍ଲାର ରାଉରକେଲାରେ ଅବସ୍ଥିତ।'
    },
    {
      id: 'caq4',
      topic: 'economy',
      question_en: 'Under Odisha\'s Subhadra Yojana, how much annual financial assistance is transferred via Aadhaar-enabled DBT to eligible women?',
      question_or: 'ଓଡ଼ିଶାର ସୁଭଦ୍ରା ଯୋଜନା ଅଧୀନରେ ଯୋଗ୍ୟ ମହିଳାମାନଙ୍କୁ ବାର୍ଷିକ କେତେ ଟଙ୍କା ଆର୍ଥିକ ସହାୟତା DBT ମାଧ୍ୟମରେ ଦିଆଯାଏ?',
      options_en: ['₹6,000', '₹10,000', '₹12,000', '₹15,000'],
      options_or: ['₹୬,୦୦୦', '₹୧୦,୦୦୦', '₹୧୨,୦୦୦', '₹୧୫,୦୦୦'],
      correct_index: 1,
      explanation_en: 'Subhadra Yojana provides ₹10,000 per year in two equal installments of ₹5,000 (on Rakhi Purnima and International Women\'s Day).',
      explanation_or: 'ସୁଭଦ୍ରା ଯୋଜନାରେ ବାର୍ଷିକ ₹୧୦,୦୦୦ ଟଙ୍କା ଦୁଇଟି ₹୫,୦୦୦ କିସ୍ତିରେ ଦିଆଯାଏ।'
    },
    {
      id: 'caq5',
      topic: 'national-international',
      question_en: 'Which organization operates India\'s Unified Payments Interface (UPI) and RuPay payment networks?',
      question_or: 'ଭାରତର Unified Payments Interface (UPI) ଓ RuPay ପେମେଣ୍ଟ ନେଟୱାର୍କ କେଉଁ ସଂସ୍ଥା ଦ୍ୱାରା ପରିଚାଳିତ?',
      options_en: ['SEBI', 'NPCI', 'SIDBI', 'NABARD'],
      options_or: ['SEBI', 'NPCI', 'SIDBI', 'NABARD'],
      correct_index: 1,
      explanation_en: 'The National Payments Corporation of India (NPCI) operates UPI, RuPay, IMPS, and AePS under RBI oversight.',
      explanation_or: 'National Payments Corporation of India (NPCI) ଭାରତରେ UPI ଓ RuPay ପରିଚାଳନା କରେ।'
    },
    {
      id: 'caq6',
      topic: 'odisha-governance',
      question_en: 'How many Revenue Divisions administer the 30 districts of Odisha?',
      question_or: 'ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲାକୁ କେତୋଟି ରାଜସ୍ୱ ଡିଭିଜନ୍ (Revenue Divisions) ରେ ବିଭକ୍ତ କରାଯାଇଛି?',
      options_en: ['2 Divisions', '3 Divisions', '4 Divisions', '5 Divisions'],
      options_or: ['୨ଟି ଡିଭିଜନ୍', '୩ଟି ଡିଭିଜନ୍', '୪ଟି ଡିଭିଜନ୍', '୫ଟି ଡିଭିଜନ୍'],
      correct_index: 1,
      explanation_en: 'Odisha has 3 Revenue Divisions — Central (Cuttack), Northern (Sambalpur), and Southern (Berhampur) — with 10 districts each.',
      explanation_or: 'ଓଡ଼ିଶାରେ ୩ଟି ରାଜସ୍ୱ ଡିଭିଜନ୍ (କେନ୍ଦ୍ରୀୟ, ଉତ୍ତରାଞ୍ଚଳ ଓ ଦକ୍ଷିଣାଞ୍ଚଳ) ଅଛି, ପ୍ରତ୍ୟେକରେ ୧୦ଟି ଜିଲ୍ଲା।'
    },
    {
      id: 'caq7',
      topic: 'odisha-governance',
      question_en: 'Which wetlands in Odisha are recognized as Ramsar Sites of International Importance alongside Chilika Lake and Bhitarkanika?',
      question_or: 'ଚିଲିକା ଓ ଭିତରକନିକା ସହିତ ଓଡ଼ିଶାର କେଉଁ ଆର୍ଦ୍ରଭୂମିଗୁଡ଼ିକ ରାମସାର୍ ସାଇଟ୍ (Ramsar Sites) ମାନ୍ୟତା ପାଇଛନ୍ତି?',
      options_en: ['Satkosia Gorge, Tampara, Hirakud & Ansupa', 'Only Chilika and Hirakud', 'Kanjia and Pata Lake only', 'Kolab and Indravati only'],
      options_or: ['ସାତକୋଶିଆ ଗଣ୍ଡ, ତାମ୍ପରା, ହୀରାକୁଦ ଓ ଅଂଶୁପା', 'କେବଳ ଚିଲିକା ଓ ହୀରାକୁଦ', 'କେବଳ କାଞ୍ଜିଆ ହ୍ରଦ', 'କେବଳ କୋଲାବ ଓ ଇନ୍ଦ୍ରାବତୀ'],
      correct_index: 0,
      explanation_en: 'Odisha has 6 Ramsar Sites: Chilika Lake, Bhitarkanika Mangroves, Satkosia Gorge, Tampara Lake, Hirakud Reservoir, and Ansupa Lake.',
      explanation_or: 'ଓଡ଼ିଶାରେ ମୋଟ ୬ଟି ରାମସାର୍ ସାଇଟ୍ ଅଛି: ଚିଲିକା, ଭିତରକନିକା, ସାତକୋଶିଆ, ତାମ୍ପରା, ହୀରାକୁଦ ଓ ଅଂଶୁପା।'
    },
    {
      id: 'caq8',
      topic: 'awards-sports',
      question_en: 'Which traditional sweet from Odisha\'s Kendrapara district received the Geographical Indication (GI) tag?',
      question_or: 'ଓଡ଼ିଶାର କେନ୍ଦ୍ରାପଡ଼ା ଜିଲ୍ଲାର କେଉଁ ପାରମ୍ପରିକ ମିଠା GI ଟ୍ୟାଗ୍ ମାନ୍ୟତା ପାଇଛି?',
      options_en: ['Chhena Poda', 'Kendrapara Rasabali', 'Khaja', 'Arisa Pitha'],
      options_or: ['ଛେନାପୋଡ଼', 'କେନ୍ଦ୍ରାପଡ଼ା ରସାବଳୀ', 'ଖଜା', 'ଆରିସା ପିଠା'],
      correct_index: 1,
      explanation_en: 'Kendrapara Rasabali, offered at the Baladevjew Temple, received the prestigious GI tag.',
      explanation_or: 'ବଳଦେବଜୀଉ ମନ୍ଦିରର ପ୍ରସିଦ୍ଧ କେନ୍ଦ୍ରାପଡ଼ା ରସାବଳୀ GI ଟ୍ୟାଗ୍ ମାନ୍ୟତା ଲାଭ କରିଛି।'
    },
    {
      id: 'caq9',
      topic: 'economy',
      question_en: 'Which body is responsible for determining the Monetary Policy Repo Rate in India?',
      question_or: 'ଭାରତରେ ମୌଦ୍ରିକ ନୀତି ରେପୋ ରେଟ୍ (Repo Rate) କେଉଁ ସଂସ୍ଥା ନିର୍ଦ୍ଧାରଣ କରେ?',
      options_en: ['Finance Commission', 'RBI Monetary Policy Committee (MPC)', 'NITI Aayog', 'GST Council'],
      options_or: ['ଅର୍ଥ ଆୟୋଗ', 'RBI ମୌଦ୍ରିକ ନୀତି କମିଟି (MPC)', 'ନୀତି ଆୟୋଗ', 'GST ପରିଷଦ'],
      correct_index: 1,
      explanation_en: 'The 6-member Monetary Policy Committee (MPC) chaired by the RBI Governor sets India\'s benchmark Repo Rate.',
      explanation_or: 'RBI ଗଭର୍ଣ୍ଣରଙ୍କ ଅଧ୍ୟକ୍ଷତାରେ ୬-ସଦସ୍ୟ ବିଶିଷ୍ଟ MPC ରେପୋ ରେଟ୍ ନିର୍ଦ୍ଧାରଣ କରେ।'
    },
    {
      id: 'caq10',
      topic: 'national-international',
      question_en: 'Which Constitutional Amendment Act introduced the Goods and Services Tax (GST) in India?',
      question_or: 'କେଉଁ ସମ୍ବିଧାନ ସଂଶୋଧନ ଆଇନ ଦ୍ୱାରା ଭାରତରେ Goods and Services Tax (GST) ଲାଗୁ ହୋଇଥିଲା?',
      options_en: ['99th Amendment Act', '100th Amendment Act', '101st Amendment Act', '103rd Amendment Act'],
      options_or: ['୯୯ତମ ସଂଶୋଧନ', '୧୦୦ତମ ସଂଶୋଧନ', '୧୦୧ତମ ସଂଶୋଧନ', '୧୦୩ତମ ସଂଶୋଧନ'],
      correct_index: 2,
      explanation_en: 'The 101st Constitutional Amendment Act, 2016 enabled GST and created the GST Council under Article 279A.',
      explanation_or: '୧୦୧ତମ ସମ୍ବିଧାନ ସଂଶୋଧନ ଆଇନ, ୨୦୧୬ ଦ୍ୱାରା GST ଏବଂ ଧାରା 279A ଅଧୀନରେ GST ପରିଷଦ ଗଠିତ ହୋଇଥିଲା।'
    },
    {
      id: 'caq11',
      topic: 'odisha-governance',
      question_en: 'Which university in Kalahandi district (Bhawanipatna) conducts 4-year Integrated Teacher Education Programme (ITEP) recruitments?',
      question_or: 'କଳାହାଣ୍ଡି ଜିଲ୍ଲାର (ଭବାନୀପାଟଣା) କେଉଁ ବିଶ୍ୱବିଦ୍ୟାଳୟ ୪-ବର୍ଷିଆ ITEP ଶିକ୍ଷକ ନିଯୁକ୍ତି ପରିଚାଳନା କରୁଛି?',
      options_en: ['Utkal University', 'Maa Manikeswari University (MMU)', 'Ravenshaw University', 'Berhampur University'],
      options_or: ['ଉତ୍କଳ ବିଶ୍ୱବିଦ୍ୟାଳୟ', 'ମା\' ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ (MMU)', 'ରେଭେନ୍ସା ବିଶ୍ୱବିଦ୍ୟାଳୟ', 'ବ୍ରହ୍ମପୁର ବିଶ୍ୱବିଦ୍ୟାଳୟ'],
      correct_index: 1,
      explanation_en: 'Maa Manikeswari University (MMU), Bhawanipatna (formerly Kalahandi University) serves Kalahandi and Nuapada districts.',
      explanation_or: 'ଭବାନୀପାଟଣାର ମା\' ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ (MMU) କଳାହାଣ୍ଡି ଓ ନୂଆପଡ଼ା ଜିଲ୍ଲାର ପ୍ରମୁଖ ବିଶ୍ୱବିଦ୍ୟାଳୟ।'
    },
    {
      id: 'caq12',
      topic: 'awards-sports',
      question_en: 'Which famous tribal craft from Odisha\'s Koraput district received the GI tag along with Koraput Kalajeera Rice?',
      question_or: 'କୋରାପୁଟ କଳାଜୀରା ଚାଉଳ ସହିତ ଓଡ଼ିଶାର କେଉଁ ପାରମ୍ପରିକ ଖାଦ୍ୟ/କଳା GI ଟ୍ୟାଗ୍ ପାଇଛି?',
      options_en: ['Similipal Kai Chutney (Mayurbhanj)', 'Banarasi Silk', 'Darjeeling Tea', 'Pashmina Shawl'],
      options_or: ['ଶିମିଳିପାଳ କାଇ ଚଟଣି (ମୟୂରଭଞ୍ଜ)', 'ବନାରସୀ ପାଟ', 'ଦାର୍ଜିଲିଂ ଚା\'', 'ପଶ୍ମିନା ଶାଲ୍'],
      correct_index: 0,
      explanation_en: 'Similipal Kai Chutney (Red Weaver Ant chutney of Mayurbhanj) and Koraput Kalajeera Rice both earned GI tags for Odisha.',
      explanation_or: 'ମୟୂରଭଞ୍ଜର ଶିମିଳିପାଳ କାଇ ଚଟଣି ଓ କୋରାପୁଟ କଳାଜୀରା ଚାଉଳ ଉଭୟ ଓଡ଼ିଶା ପାଇଁ GI ଟ୍ୟାଗ୍ ଅର୍ଜନ କରିଛନ୍ତି।'
    }
  ];

  var state = {
    lang: 'en',
    topic: 'all',
    dateWindow: 'all',
    q: '',
    bulletins: CURATED_BULLETINS.slice(),
    quizSet: [],
    answers: {},
    shuffleSeed: 0
  };

  function classifyTopic(item) {
    if (!item) return 'odisha-governance';
    if (item.topic && ['odisha-governance', 'economy', 'awards-sports', 'national-international'].indexOf(item.topic) !== -1) {
      return item.topic;
    }
    var hay = [item.title_en, item.summary_en, item.org, item.keywords].filter(Boolean).join(' ').toLowerCase();
    if (/(sport|hockey|cricket|olympic|stadium|award|padma|nobel|gi tag|rasabali|chutney)/i.test(hay)) return 'awards-sports';
    if (/(econom|rbi|repo|gdp|budget|hydrogen|port|bank|dbt|subhadra|tax|gst|inflation|trade)/i.test(hay)) return 'economy';
    if (/(international|global|un |g20|brics|upi|npci|parliament|supreme court|national|isro|amendment)/i.test(hay)) return 'national-international';
    return 'odisha-governance';
  }

  function filterBulletins(items, opts) {
    var list = Array.isArray(items) ? items : [];
    var o = opts || {};
    var topic = String(o.topic || 'all').toLowerCase();
    var dateWin = String(o.dateWindow || 'all').toLowerCase();
    var q = String(o.q || '').trim().toLowerCase();
    var nowMs = o.now instanceof Date ? o.now.getTime() : Date.now();

    var counts = {
      all: 0,
      'odisha-governance': 0,
      economy: 0,
      'awards-sports': 0,
      'national-international': 0
    };

    var dateMatched = [];
    for (var i = 0; i < list.length; i += 1) {
      var it = list[i];
      if (!it) continue;
      if (q) {
        var hay = [it.title_en, it.title_or, it.summary_en, it.summary_or, it.org, it.key_facts_en].filter(Boolean).join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      var dIso = String(it.date_iso || it.updated_at || '').slice(0, 10);
      if (dateWin === 'today') {
        var tsT = Date.parse(dIso + 'T00:00:00Z');
        if (isFinite(tsT) && (nowMs - tsT) > 48 * 3600000) continue;
      } else if (dateWin === '7d') {
        var ts7 = Date.parse(dIso + 'T00:00:00Z');
        if (isFinite(ts7) && (nowMs - ts7) > 8 * 86400000) continue;
      } else if (dateWin === 'nov-2026') {
        if (dIso && dIso.indexOf('2026-11') !== 0) continue;
      }
      var tKey = classifyTopic(it);
      counts.all += 1;
      if (Object.prototype.hasOwnProperty.call(counts, tKey)) counts[tKey] += 1;
      dateMatched.push(Object.assign({}, it, { topic: tKey }));
    }

    var results = topic === 'all'
      ? dateMatched
      : dateMatched.filter(function (x) { return x.topic === topic; });

    results.sort(function (a, b) {
      return String(b.date_iso || '').localeCompare(String(a.date_iso || ''));
    });

    return { counts: counts, results: results };
  }

  function selectTenMcqs(bank, seed) {
    var src = (Array.isArray(bank) && bank.length ? bank : MCQ_BANK).slice();
    var s = Number(seed || 0);
    if (s > 0) {
      for (var i = src.length - 1; i > 0; i -= 1) {
        var j = Math.abs((s * 31 + i * 17) % (i + 1));
        var tmp = src[i];
        src[i] = src[j];
        src[j] = tmp;
      }
    }
    return src.slice(0, 10);
  }

  function scoreMcqAttempt(questions, answers) {
    var qs = Array.isArray(questions) ? questions : [];
    var ans = answers || {};
    var answered = 0;
    var correct = 0;
    for (var i = 0; i < qs.length; i += 1) {
      var q = qs[i];
      if (q && Object.prototype.hasOwnProperty.call(ans, q.id)) {
        answered += 1;
        if (Number(ans[q.id]) === Number(q.correct_index)) correct += 1;
      }
    }
    return { correct: correct, answered: answered, total: qs.length };
  }

  function loadBestScore() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(STATS_STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return { best: Number(parsed.best || 0), total: Number(parsed.total || 10), attempts: Number(parsed.attempts || 0) };
        }
      }
    } catch (_) {}
    return { best: 0, total: 10, attempts: 0 };
  }

  function saveBestScore(score, total) {
    var cur = loadBestScore();
    var next = {
      best: Math.max(cur.best, Number(score || 0)),
      total: Number(total || 10),
      attempts: cur.attempts + 1
    };
    try {
      if (win && win.localStorage) {
        win.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(next));
      }
    } catch (_) {}
    return next;
  }

  function buildPrintDigestSummary(bulletins, questions, isOr) {
    var bs = Array.isArray(bulletins) ? bulletins : [];
    var qs = Array.isArray(questions) ? questions : [];
    return {
      heading: isOr
        ? 'Common Sense Odisha — ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ରିଭିଜନ୍ ସିଟ୍'
        : 'Common Sense Odisha — Daily Current Affairs Clean-Sheet Study Digest',
      bulletin_count: bs.length,
      mcq_count: qs.length,
      bulletins: bs.map(function (b) {
        return {
          date: b.date_iso || '',
          title: (isOr && b.title_or) ? b.title_or : b.title_en,
          summary: (isOr && b.summary_or) ? b.summary_or : b.summary_en,
          key_fact: b.key_facts_en || ''
        };
      }),
      answer_key: qs.map(function (q, idx) {
        var opts = (isOr && Array.isArray(q.options_or)) ? q.options_or : q.options_en;
        return {
          num: idx + 1,
          question: (isOr && q.question_or) ? q.question_or : q.question_en,
          correct_letter: String.fromCharCode(65 + Number(q.correct_index || 0)),
          correct_text: opts[q.correct_index] || '',
          explanation: (isOr && q.explanation_or) ? q.explanation_or : q.explanation_en
        };
      })
    };
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function safeUrl(raw) {
    var s = String(raw || '').trim();
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '/current-affairs/';
  }

  function localizeStatic() {
    var root = doc && doc.getElementById('cso-ca-hub-root');
    if (!root) return;
    var orMode = state.lang === 'or';
    root.querySelectorAll('[data-en]').forEach(function (n) {
      var t = orMode ? n.getAttribute('data-or') : n.getAttribute('data-en');
      if (t) n.textContent = t;
    });
    root.querySelectorAll('[data-ca-lang]').forEach(function (b) {
      var act = b.getAttribute('data-ca-lang') === state.lang;
      b.classList.toggle('is-active', act);
      b.setAttribute('aria-pressed', act ? 'true' : 'false');
    });
  }

  function renderAll() {
    var orMode = state.lang === 'or';
    var out = filterBulletins(state.bulletins, {
      topic: state.topic,
      dateWindow: state.dateWindow,
      q: state.q
    });

    // Section A: Topic & Date Filter Pills
    var topicHost = doc.getElementById('cso-ca-topic-pills');
    if (topicHost) {
      topicHost.replaceChildren();
      TOPICS.forEach(function (t) {
        var act = state.topic === t.key;
        var b = el('button', 'cso-ca-pill' + (act ? ' is-active' : ''), (orMode ? t.or : t.en) + ' (' + (out.counts[t.key] || 0) + ')');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('data-ca-topic', t.key);
        b.setAttribute('aria-selected', act ? 'true' : 'false');
        b.addEventListener('click', function () {
          state.topic = t.key;
          try {
            var u = new URL(win.location.href);
            if (t.key === 'all') u.searchParams.delete('topic');
            else u.searchParams.set('topic', t.key);
            win.history.replaceState({}, '', u.toString());
          } catch (_) {}
          renderAll();
        });
        topicHost.appendChild(b);
      });
    }

    var dateHost = doc.getElementById('cso-ca-date-pills');
    if (dateHost) {
      dateHost.replaceChildren();
      DATE_WINDOWS.forEach(function (dw) {
        var act = state.dateWindow === dw.key;
        var b = el('button', 'cso-ca-date-pill' + (act ? ' is-active' : ''), orMode ? dw.or : dw.en);
        b.type = 'button';
        b.setAttribute('data-ca-date', dw.key);
        b.setAttribute('aria-pressed', act ? 'true' : 'false');
        b.addEventListener('click', function () {
          state.dateWindow = dw.key;
          renderAll();
        });
        dateHost.appendChild(b);
      });
    }

    // Section B: Interactive 10-MCQ Drill
    var scoreObj = scoreMcqAttempt(state.quizSet, state.answers);
    var scoreEl = doc.getElementById('cso-ca-quiz-score');
    if (scoreEl) {
      scoreEl.textContent = orMode
        ? ('ସ୍କୋର୍: ' + scoreObj.correct + ' / ' + scoreObj.total + ' (' + scoreObj.answered + ' ଉତ୍ତର ଦିଆଯାଇଛି)')
        : ('Score: ' + scoreObj.correct + ' / ' + scoreObj.total + ' (' + scoreObj.answered + ' answered)');
    }
    var bestObj = loadBestScore();
    var bestEl = doc.getElementById('cso-ca-best-score');
    if (bestEl) {
      bestEl.textContent = orMode
        ? ('🏆 ଶ୍ରେଷ୍ଠ ସ୍କୋର୍: ' + bestObj.best + ' / ' + bestObj.total)
        : ('🏆 Best Score: ' + bestObj.best + ' / ' + bestObj.total);
    }

    var quizHost = doc.getElementById('cso-ca-quiz-root');
    if (quizHost) {
      var qFrag = doc.createDocumentFragment();
      state.quizSet.forEach(function (q, idx) {
        var card = el('article', 'cso-ca-q-card');
        var qHead = el('div', 'cso-ca-q-head');
        qHead.appendChild(el('span', 'cso-ca-q-num', 'Q' + (idx + 1)));
        var topicMeta = TOPICS.find(function (t) { return t.key === q.topic; });
        qHead.appendChild(el('span', 'cso-ca-topic-tag', topicMeta ? (orMode ? topicMeta.or : topicMeta.en) : 'Current Affairs'));
        card.appendChild(qHead);

        card.appendChild(el('p', 'cso-ca-q-text', (orMode && q.question_or) ? q.question_or : q.question_en));

        var chosen = Object.prototype.hasOwnProperty.call(state.answers, q.id) ? state.answers[q.id] : -1;
        var opts = (orMode && Array.isArray(q.options_or)) ? q.options_or : q.options_en;
        var optsWrap = el('div', 'cso-ca-q-opts');
        opts.forEach(function (optTxt, oi) {
          var cls = 'cso-ca-q-opt';
          if (chosen !== -1) {
            if (oi === q.correct_index) cls += ' is-correct';
            else if (oi === chosen) cls += ' is-wrong';
          }
          var b = el('button', cls, String.fromCharCode(65 + oi) + '. ' + optTxt);
          b.type = 'button';
          if (chosen !== -1) b.disabled = true;
          b.addEventListener('click', function () {
            if (Object.prototype.hasOwnProperty.call(state.answers, q.id)) return;
            state.answers[q.id] = oi;
            if (win && win.CSOStudyStreakPlanner && typeof win.CSOStudyStreakPlanner.recordPracticeActivity === 'function') {
              win.CSOStudyStreakPlanner.recordPracticeActivity({
                count: 1,
                correct: oi === q.ans ? 1 : 0,
                topicKey: q.topic || 'odisha-governance',
                topicLabel: q.topic || 'Current Affairs',
                source: 'current-affairs'
              });
            }
            var updated = scoreMcqAttempt(state.quizSet, state.answers);
            if (updated.answered === updated.total) {
              saveBestScore(updated.correct, updated.total);
            }
            renderAll();
          });
          optsWrap.appendChild(b);
        });
        card.appendChild(optsWrap);

        if (chosen !== -1) {
          var isRight = chosen === q.correct_index;
          var fb = el('div', 'cso-ca-q-fb ' + (isRight ? 'is-correct' : 'is-wrong'));
          fb.textContent = (isRight ? (orMode ? '✓ ଠିକ୍ ଉତ୍ତର! ' : '✓ Correct! ') : (orMode ? '✕ ଭୁଲ୍ ଉତ୍ତର। ' : '✕ Not quite. ')) +
            ((orMode && q.explanation_or) ? q.explanation_or : q.explanation_en);
          card.appendChild(fb);
        }
        qFrag.appendChild(card);
      });
      quizHost.replaceChildren(qFrag);
    }

    // Section C: Bulletin Archive
    var cntEl = doc.getElementById('cso-ca-bulletins-count');
    if (cntEl) {
      cntEl.textContent = orMode
        ? ('ମୋଟ ' + out.results.length + ' ଟି ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ ବୁଲେଟିନ୍')
        : ('Showing ' + out.results.length + ' verified current affairs bulletins');
    }

    var gridHost = doc.getElementById('cso-ca-bulletins-grid');
    if (gridHost) {
      if (!out.results.length) {
        gridHost.replaceChildren(el('div', 'cso-ca-empty', orMode
          ? 'ଏହି ଫିଲ୍ଟରରେ କୌଣସି ବୁଲେଟିନ୍ ମିଳିଲା ନାହିଁ।'
          : 'No current affairs bulletins matched this filter.'));
      } else {
        var bFrag = doc.createDocumentFragment();
        out.results.forEach(function (b) {
          var card = el('article', 'cso-ca-card');
          var top = el('div', 'cso-ca-card__top');
          var tObj = TOPICS.find(function (t) { return t.key === b.topic; });
          top.appendChild(el('span', 'cso-ca-topic-tag', tObj ? (orMode ? tObj.or : tObj.en) : 'Current Affairs'));
          if (b.date_iso) top.appendChild(el('span', 'cso-ca-date', '🗓️ ' + b.date_iso));
          if (b.org) top.appendChild(el('span', 'cso-ca-org', b.org));
          card.appendChild(top);

          var h3 = el('h3', 'cso-ca-card__title');
          var link = el('a', 'cso-ca-card__link', (orMode && b.title_or) ? b.title_or : b.title_en);
          link.href = safeUrl(b.url);
          h3.appendChild(link);
          card.appendChild(h3);

          if (!orMode && b.title_or && b.title_or !== b.title_en) {
            card.appendChild(el('div', 'cso-ca-card__or', b.title_or));
          }
          card.appendChild(el('p', 'cso-ca-card__desc', (orMode && b.summary_or) ? b.summary_or : b.summary_en));

          var acts = el('div', 'cso-ca-card__acts');
          var openBtn = el('a', 'cso-ca-btn cso-ca-btn--primary', orMode ? 'ସମ୍ପୂର୍ଣ୍ଣ ପଢ଼ନ୍ତୁ →' : 'Read Bulletin →');
          openBtn.href = safeUrl(b.url);
          acts.appendChild(openBtn);

          if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.createBookmarkButton === 'function') {
            var saveBtn = win.CSOSavedAlerts.createBookmarkButton({
              id: b.id || ('ca:' + b.title_en),
              slug: String(b.id || '').replace(/^ca:/, ''),
              url: safeUrl(b.url),
              title_en: b.title_en,
              title_or: b.title_or || '',
              org: b.org || 'Common Sense Odisha',
              category: 'current_affairs',
              deadline_iso: ''
            }, { isOr: orMode, compact: true });
            if (saveBtn) acts.appendChild(saveBtn);
          }
          card.appendChild(acts);
          bFrag.appendChild(card);
        });
        gridHost.replaceChildren(bFrag);
      }
    }

    // Section C2: Clean-Sheet Print Study Digest
    var digestHost = doc.getElementById('cso-ca-print-digest');
    if (digestHost) {
      var digest = buildPrintDigestSummary(out.results, state.quizSet, orMode);
      var dFrag = doc.createDocumentFragment();
      dFrag.appendChild(el('h2', 'cso-ca-digest__title', digest.heading));
      dFrag.appendChild(el('p', 'cso-ca-digest__meta', 'Source: https://csodisha.com/current-affairs/ · Bulletins: ' + digest.bulletin_count + ' · 10-MCQ Revision Key'));

      var bList = el('ul', 'cso-ca-digest__list');
      digest.bulletins.forEach(function (item) {
        var li = el('li', 'cso-ca-digest__item');
        li.appendChild(el('strong', '', (item.date ? ('[' + item.date + '] ') : '') + item.title + ': '));
        li.appendChild(doc.createTextNode(item.summary + (item.key_fact ? (' (' + item.key_fact + ')') : '')));
        bList.appendChild(li);
      });
      dFrag.appendChild(bList);

      dFrag.appendChild(el('h3', 'cso-ca-digest__sub', orMode ? '୧୦-ପ୍ରଶ୍ନ ଉତ୍ତର ତାଲିକା (Answer Key)' : '10-MCQ Revision Answer Key'));
      var aList = el('ol', 'cso-ca-digest__answers');
      digest.answer_key.forEach(function (ak) {
        var li = el('li', 'cso-ca-digest__ans-item');
        li.appendChild(el('strong', '', ak.question + ' — '));
        li.appendChild(doc.createTextNode('Ans: ' + ak.correct_letter + '. ' + ak.correct_text + ' (' + ak.explanation + ')'));
        aList.appendChild(li);
      });
      dFrag.appendChild(aList);
      digestHost.replaceChildren(dFrag);
    }
  }

  function init() {
    var root = doc && doc.getElementById('cso-ca-hub-root');
    if (!root) return;

    try {
      var u = new URL(win.location.href);
      var t = String(u.searchParams.get('topic') || '').toLowerCase();
      if (['odisha-governance', 'economy', 'awards-sports', 'national-international'].indexOf(t) !== -1) {
        state.topic = t;
      }
    } catch (_) {}

    state.quizSet = selectTenMcqs(MCQ_BANK, state.shuffleSeed);

    root.querySelectorAll('[data-ca-lang]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.lang = b.getAttribute('data-ca-lang') === 'or' ? 'or' : 'en';
        localizeStatic();
        renderAll();
      });
    });

    var searchInp = doc.getElementById('cso-ca-search');
    if (searchInp) {
      searchInp.addEventListener('input', function () {
        state.q = searchInp.value || '';
        renderAll();
      });
    }

    var shuffleBtn = doc.getElementById('cso-ca-quiz-shuffle');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', function () {
        state.shuffleSeed += 1;
        state.answers = {};
        state.quizSet = selectTenMcqs(MCQ_BANK, state.shuffleSeed);
        renderAll();
      });
    }

    var resetBtn = doc.getElementById('cso-ca-quiz-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        state.answers = {};
        renderAll();
      });
    }

    var printBtn = doc.getElementById('cso-ca-print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', function () {
        if (win && typeof win.print === 'function') win.print();
      });
    }

    localizeStatic();
    renderAll();

    // Hydrate live published current affairs items from /api/public/search-index
    if (typeof fetch === 'function') {
      fetch('/api/public/search-index', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !Array.isArray(d.items)) return;
          var liveCa = d.items.filter(function (it) {
            return it && it.type === 'current_affairs';
          }).map(function (it) {
            return {
              id: it.id,
              url: it.url,
              topic: classifyTopic(it),
              date_iso: String(it.updated_at || '').slice(0, 10) || '2026-11-27',
              org: it.org || 'Common Sense Odisha',
              title_en: it.title_en,
              title_or: it.title_or || '',
              summary_en: it.keywords || it.title_en,
              summary_or: '',
              key_facts_en: ''
            };
          });
          if (liveCa.length) {
            state.bulletins = liveCa.concat(CURATED_BULLETINS);
            renderAll();
          }
        })
        .catch(function () {});
    }
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
    else init();
  }

  return {
    version: 'v403',
    TOPICS: TOPICS,
    DATE_WINDOWS: DATE_WINDOWS,
    CURATED_BULLETINS: CURATED_BULLETINS,
    MCQ_BANK: MCQ_BANK,
    classifyTopic: classifyTopic,
    filterBulletins: filterBulletins,
    selectTenMcqs: selectTenMcqs,
    scoreMcqAttempt: scoreMcqAttempt,
    loadBestScore: loadBestScore,
    saveBestScore: saveBestScore,
    buildPrintDigestSummary: buildPrintDigestSummary,
    init: init
  };
});
