/**
 * Common Sense Odisha — Interactive Mock Test Series & Exam-Day Countdown Hub (v407)
 * Powers /mock-tests/ with:
 *  - Section A: Live IST Exam-Day Countdown Strip (CBSE CTET 22nd Edition, NTA UGC NET Dec 2026,
 *               OAVS, OPSC OAS, OSSC CGL, OSSSC, OTET/OSSTET + dynamic /api/public/search-index exams)
 *               with 1-click Add Exam Reminder (.ics) via window.CSOCalendarExport & Practice Target Track
 *  - Section B: 3 Full 25-MCQ Bilingual Sectional Tracks + 1 All-Odisha Mixed 25-MCQ Grand Mock,
 *               Negative-Marking Toggle Pills (0 / -0.25 / -0.50), Timed vs. Untimed Mode Toggle
 *  - Section C: Exam-Hall Interface with Bilingual EN + Odia prompts, role="radio" options (>=44px),
 *               Mark for Review, Clear Response, 1-25 Question Palette, and inline Submit Confirmation
 *  - Section D: Instant Scorecard, Negative-Marking Ledger, Time Taken, Topic-Wise Accuracy Breakdown
 *               table & discrete CSS progress bars, Weakest Topic callout, filterable bilingual
 *               Solution Review (All / Incorrect Only / Marked for Review), localStorage history
 *               (cso_mock_test_history_v1), Copy Scorecard & Print Clean Sheet.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOMockTestsHub = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOMockTestsHub = api;
})(function (win, doc) {
  'use strict';

  var HISTORY_KEY = 'cso_mock_test_history_v1';
  var LEGACY_STATS_KEY = 'cso_mock_drill_stats_v1';

  var NEGATIVE_OPTIONS = [
    { value: 0, label: 'No Negative Marking (0) · CTET / OSSTET / UGC NET' },
    { value: 0.25, label: 'OSSC / OSSSC Standard (−0.25)' },
    { value: 0.5, label: 'OPSC / OAVS / Banking (−0.50)' }
  ];

  var EXAM_COUNTDOWNS = [
    {
      id: 'cbse-ctet-22',
      title: 'CBSE CTET 22nd Edition',
      date_iso: '2026-12-12',
      end_date_iso: '2026-12-13',
      date_label: '12–13 Dec 2026',
      drill_key: 'teaching-pedagogy',
      tag: 'CBSE · National TET',
      url: '/mock-tests/'
    },
    {
      id: 'ugc-net-dec-2026',
      title: 'NTA UGC NET December 2026',
      date_iso: '2026-12-14',
      end_date_iso: '2026-12-21',
      date_label: '14–21 Dec 2026',
      drill_key: 'teaching-pedagogy',
      tag: 'NTA · Assistant Professor / JRF',
      url: '/guides/ugc-net-december-2026-schedule-nta-guidelines'
    },
    {
      id: 'oavs-2026',
      title: 'OAVS Teaching CBT 2026–27',
      date_iso: '2027-01-18',
      end_date_iso: '2027-01-18',
      date_label: '18 Jan 2027',
      drill_key: 'teaching-pedagogy',
      tag: 'OAVS · Odisha',
      url: '/jobs/'
    },
    {
      id: 'otet-osstet',
      title: 'BSE Odisha OTET / OSSTET Cycle',
      date_iso: '2027-01-28',
      end_date_iso: '2027-01-28',
      date_label: '28 Jan 2027',
      drill_key: 'teaching-pedagogy',
      tag: 'BSE Odisha · TET',
      url: '/exams/'
    },
    {
      id: 'ossc-cgl',
      title: 'OSSC Combined Graduate Level (CGL)',
      date_iso: '2027-02-08',
      end_date_iso: '2027-02-08',
      date_label: '08 Feb 2027',
      drill_key: 'reasoning-quant',
      tag: 'OSSC · Odisha',
      url: '/exams/'
    },
    {
      id: 'opsc-oas',
      title: 'OPSC OAS Civil Services Prelims',
      date_iso: '2027-03-14',
      end_date_iso: '2027-03-14',
      date_label: '14 Mar 2027',
      drill_key: 'odisha-gk',
      tag: 'OPSC · Group-A',
      url: '/exams/'
    }
  ];

  var SUBTOPIC_OR = {
    'Odisha History & Culture': 'ଓଡ଼ିଶା ଇତିହାସ ଓ ସଂସ୍କୃତି',
    'Odisha Geography & Rivers': 'ଓଡ଼ିଶା ଭୂଗୋଳ ଓ ନଦୀ',
    'Odisha Governance & Schemes': 'ଓଡ଼ିଶା ଶାସନ ଓ ଯୋଜନା',
    'Odisha Current Affairs': 'ଓଡ଼ିଶା ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ',
    'Child Development & Pedagogy': 'ଶିଶୁ ବିକାଶ ଓ ଶିକ୍ଷାଶାସ୍ତ୍ର',
    'NEP 2020 & NCF': 'ଜାତୀୟ ଶିକ୍ଷା ନୀତି ୨୦୨୦ ଓ NCF',
    'Inclusive Education': 'ସମାବେଶୀ ଶିକ୍ଷା',
    'Assessment & Evaluation': 'ମୂଲ୍ୟାୟନ ଓ ପରୀକ୍ଷା ପଦ୍ଧତି',
    'Arithmetic & Percentage': 'ପାଟିଗଣିତ ଓ ଶତକଡ଼ା',
    'Number Series & Coding': 'ସଂଖ୍ୟା ଶ୍ରେଣୀ ଓ କୋଡିଂ',
    'Data Interpretation': 'ତଥ୍ୟ ବିଶ୍ଳେଷଣ',
    'Logical & Analytical Reasoning': 'ତର୍କଶକ୍ତି ଓ ବିଶ୍ଳେଷଣ'
  };

  function qItem(id, subtopic, q, opts, ans, exp, qOr, expOr) {
    var stOr = SUBTOPIC_OR[subtopic] || subtopic;
    return {
      id: id,
      subtopic: subtopic,
      subtopic_or: stOr,
      q: q,
      q_or: qOr || ('[' + stOr + '] ' + q),
      opts: opts,
      ans: ans,
      exp: exp,
      exp_or: expOr || ('ବ୍ୟାଖ୍ୟା: ' + exp)
    };
  }

  var ODISHA_GK_QUESTIONS = [
    qItem('og1', 'Odisha History & Culture', 'In which year did the historic Paika Rebellion take place in Khordha under Bakshi Jagabandhu?', ['1803', '1817', '1857', '1866'], 1, 'The Paika Rebellion erupted in 1817 in Khordha against British land revenue policies.', 'ବକ୍ସି ଜଗବନ୍ଧୁଙ୍କ ନେତୃତ୍ୱରେ ଖୋର୍ଦ୍ଧାରେ ଐତିହାସିକ ପାଇକ ବିଦ୍ରୋହ କେଉଁ ବର୍ଷ ହୋଇଥିଲା?', '୧୮୧୭ ମସିହାରେ ବ୍ରିଟିଶ ଭୂ-ରାଜସ୍ୱ ନୀତି ବିରୋଧରେ ଖୋର୍ଦ୍ଧାରେ ପାଇକ ବିଦ୍ରୋହ ହୋଇଥିଲା।'),
    qItem('og2', 'Odisha History & Culture', 'When was Odisha formed as a separate province on a linguistic basis (Utkala Dibasa)?', ['1 April 1936', '15 August 1947', '26 January 1950', '1 April 1948'], 0, 'Odisha became a separate linguistic province on 1 April 1936.', 'ଭାଷା ଭିତ୍ତିରେ ସ୍ୱତନ୍ତ୍ର ଓଡ଼ିଶା ପ୍ରଦେଶ (ଉତ୍କଳ ଦିବସ) କେବେ ଗଠିତ ହୋଇଥିଲା?', '୧ ଏପ୍ରିଲ ୧୯୩୬ରେ ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର ଭାଷାଭିତ୍ତିକ ପ୍ରଦେଶ ଭାବେ ଗଠିତ ହୋଇଥିଲା।'),
    qItem('og3', 'Odisha History & Culture', 'Who is revered as "Utkala Gouraba" for pioneering the Odia unification movement and Utkal Sammilani?', ['Gopabandhu Das', 'Madhusudan Das', 'Fakir Mohan Senapati', 'Krushna Chandra Gajapati'], 1, 'Madhusudan Das founded Utkal Sammilani in 1903 and is honored as Utkala Gouraba.', 'ଉତ୍କଳ ସମ୍ମିଳନୀ ପ୍ରତିଷ୍ଠା ଓ ଓଡ଼ିଆ ଏକତ୍ରୀକରଣ ଆନ୍ଦୋଳନ ପାଇଁ କିଏ "ଉତ୍କଳ ଗୌରବ" ଭାବେ ପରିଚିତ?', 'ମଧୁସୂଦନ ଦାସ ୧୯୦୩ରେ ଉତ୍କଳ ସମ୍ମିଳନୀ ପ୍ରତିଷ୍ଠା କରିଥିଲେ।'),
    qItem('og4', 'Odisha History & Culture', 'Which Kalinga ruler\'s achievements are inscribed in the Hathigumpha Inscription at Udayagiri?', ['Ashoka', 'Kharavela', 'Anantavarman Chodaganga', 'Kapilendra Deva'], 1, 'Emperor Kharavela of the Mahameghavahana dynasty authored the 17-line Hathigumpha Inscription.', 'ଉଦୟଗିରିର ହାତୀଗୁମ୍ଫା ଶିଳାଲେଖରେ କେଉଁ କଳିଙ୍ଗ ସମ୍ରାଟଙ୍କ କୀର୍ତ୍ତି ବର୍ଣ୍ଣିତ ଅଛି?', 'ମହାମେଘବାହନ ବଂଶର ସମ୍ରାଟ ଖାରବେଳଙ୍କ କୀର୍ତ୍ତି ହାତୀଗୁମ୍ଫା ଶିଳାଲେଖରେ ଉଲ୍ଲିଖିତ।'),
    qItem('og5', 'Odisha History & Culture', 'Who built the world-famous Sun Temple at Konark in the 13th century?', ['Narasimhadeva I', 'Yayati Kesari', 'Anangabhima Deva III', 'Purushottama Deva'], 0, 'King Narasimhadeva I of the Eastern Ganga dynasty built the Konark Sun Temple around 1250 CE.', 'ତ୍ରୟୋଦଶ ଶତାବ୍ଦୀରେ ବିଶ୍ୱପ୍ରସିଦ୍ଧ କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର କିଏ ନିର୍ମାଣ କରିଥିଲେ?', 'ପୂର୍ବ ଗଙ୍ଗ ବଂଶର ରାଜା ପ୍ରଥମ ନରସିଂହଦେବ କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ନିର୍ମାଣ କରିଥିଲେ।'),
    qItem('og6', 'Odisha History & Culture', 'Odia was officially recognized as the 6th Classical Language of India in which year?', ['2008', '2011', '2014', '2016'], 2, 'Odia received Classical Language status from the Government of India in February 2014.', 'ଓଡ଼ିଆ ଭାଷା କେଉଁ ବର୍ଷ ଭାରତର ଷଷ୍ଠ ଶାସ୍ତ୍ରୀୟ ଭାଷା ଭାବେ ସ୍ୱୀକୃତି ପାଇଲା?', 'ଫେବୃଆରୀ ୨୦୧୪ରେ ଓଡ଼ିଆ ଭାଷାକୁ ଶାସ୍ତ୍ରୀୟ ଭାଷା ମାନ୍ୟତା ମିଳିଥିଲା।'),
    qItem('og7', 'Odisha History & Culture', 'Which traditional sweet from Kendrapara district holds a Geographical Indication (GI) tag?', ['Chhena Jhili', 'Kendrapara Rasabali', 'Poda Pitha', 'Manda Pitha'], 1, 'Kendrapara Rasabali received the GI tag for its unique preparation at Baladevjew Temple.', 'କେନ୍ଦ୍ରାପଡ଼ା ଜିଲ୍ଲାର କେଉଁ ପାରମ୍ପରିକ ମିଠା GI ଟ୍ୟାଗ୍ ଲାଭ କରିଛି?', 'ବଳଦେବଜୀଉ ମନ୍ଦିର ସହ ଜଡ଼ିତ କେନ୍ଦ୍ରାପଡ଼ା ରସାବଳୀ GI ଟ୍ୟାଗ୍ ପାଇଛି।'),
    qItem('og8', 'Odisha Geography & Rivers', 'Which is the longest river flowing through Odisha?', ['Brahmani', 'Baitarani', 'Mahanadi', 'Subarnarekha'], 2, 'The Mahanadi is Odisha\'s longest river, spanning roughly 494 km within the state.', 'ଓଡ଼ିଶା ଦେଇ ପ୍ରବାହିତ ହେଉଥିବା ସବୁଠାରୁ ଦୀର୍ଘତମ ନଦୀ କେଉଁଟି?', 'ମହାନଦୀ ଓଡ଼ିଶାର ସବୁଠାରୁ ଦୀର୍ଘତମ ନଦୀ (ରାଜ୍ୟ ଭିତରେ ପ୍ରାୟ ୪୯୪ କିମି)।'),
    qItem('og9', 'Odisha Geography & Rivers', 'Deomali, the highest mountain peak of Odisha (1,672 m), is situated in which district?', ['Kalahandi', 'Koraput', 'Rayagada', 'Kandhamal'], 1, 'Deomali Peak lies in the Chandragiri-Pottangi sub-range in Koraput district.', 'ଓଡ଼ିଶାର ସର୍ବୋଚ୍ଚ ପର୍ବତ ଶୃଙ୍ଗ ଦେଓମାଳୀ (୧,୬୭୨ ମି.) କେଉଁ ଜିଲ୍ଲାରେ ଅବସ୍ଥିତ?', 'ଦେଓମାଳୀ ଶୃଙ୍ଗ କୋରାପୁଟ ଜିଲ୍ଲାରେ ଅବସ୍ଥିତ।'),
    qItem('og10', 'Odisha Geography & Rivers', 'How many Ramsar Wetlands of International Importance are located in Odisha?', ['2', '4', '6', '8'], 2, 'Odisha has 6 Ramsar Sites: Chilika, Bhitarkanika, Satkosia Gorge, Tampara, Hirakud, and Ansupa.', 'ଓଡ଼ିଶାରେ ମୋଟ କେତୋଟି ଆନ୍ତର୍ଜାତୀୟ ରାମସାର ଆର୍ଦ୍ରଭୂମି (Ramsar Sites) ଅଛି?', 'ଓଡ଼ିଶାରେ ୬ଟି ରାମସାର ସ୍ଥଳ ଅଛି: ଚିଲିକା, ଭିତରକନିକା, ସାତକୋଶିଆ, ତାମ୍ପରା, ହୀରାକୁଦ ଓ ଅଂଶୁପା।'),
    qItem('og11', 'Odisha Geography & Rivers', 'Similipal Biosphere Reserve and Tiger Reserve is located in which district of Odisha?', ['Keonjhar', 'Mayurbhanj', 'Sundargarh', 'Balasore'], 1, 'Similipal National Park & Biosphere Reserve is in Mayurbhanj district.', 'ଶିମିଳିପାଳ ଜୈବମଣ୍ଡଳ ଓ ବ୍ୟାଘ୍ର ଅଭୟାରଣ୍ୟ ଓଡ଼ିଶାର କେଉଁ ଜିଲ୍ଲାରେ ଅଛି?', 'ଶିମିଳିପାଳ ମୟୂରଭଞ୍ଜ ଜିଲ୍ଲାରେ ଅବସ୍ଥିତ।'),
    qItem('og12', 'Odisha Geography & Rivers', 'Hirakud Dam, one of the longest earthen dams in the world, is built across which river?', ['Mahanadi', 'Indravati', 'Rushikulya', 'Tel'], 0, 'Hirakud Dam is constructed across the Mahanadi River near Sambalpur.', 'ବିଶ୍ୱର ଅନ୍ୟତମ ଦୀର୍ଘତମ ମାଟିବନ୍ଧ ହୀରାକୁଦ କେଉଁ ନଦୀରେ ନିର୍ମିତ?', 'ହୀରାକୁଦ ବନ୍ଧ ସମ୍ବଲପୁର ନିକଟରେ ମହାନଦୀ ଉପରେ ନିର୍ମିତ।'),
    qItem('og13', 'Odisha Geography & Rivers', 'Which Odisha river is renowned for the mass nesting (Arribada) of Olive Ridley sea turtles at Gahirmatha?', ['Rushikulya & Brahmani-Baitarani delta', 'Subarnarekha', 'Vansadhara', 'Indravati'], 0, 'Gahirmatha (Kendrapara) along the Brahmani-Baitarani delta and Rushikulya rookery are Odisha\'s primary Olive Ridley nesting sites.', 'ଗହୀରମଥାରେ ଅଲିଭ୍ ରିଡଲେ କଇଁଛଙ୍କ ଗଣ ଅଣ୍ଡାଦାନ କେଉଁ ନଦୀ ତ୍ରିକୋଣଭୂମି ଅଞ୍ଚଳରେ ହୁଏ?', 'ବ୍ରାହ୍ମଣୀ-ବୈତରଣୀ ତ୍ରିକୋଣଭୂମିର ଗହୀରମଥା ଓ ଋଷିକୁଲ୍ୟା ମୁହାଣ ଅଲିଭ୍ ରିଡଲେ କଇଁଛଙ୍କ ମୁଖ୍ୟ ଅଣ୍ଡାଦାନ ସ୍ଥଳ।'),
    qItem('og14', 'Odisha Governance & Schemes', 'How many total Assembly constituencies (MLAs) are there in the Odisha Legislative Assembly?', ['120', '140', '147', '150'], 2, 'The Odisha Legislative Assembly consists of 147 elected members.', 'ଓଡ଼ିଶା ବିଧାନସଭାରେ ମୋଟ କେତୋଟି ନିର୍ବାଚନ ମଣ୍ଡଳୀ (MLA ଆସନ) ଅଛି?', 'ଓଡ଼ିଶା ବିଧାନସଭାରେ ମୋଟ ୧୪୭ ଜଣ ନିର୍ବାଚିତ ବିଧାୟକ ଅଛନ୍ତି।'),
    qItem('og15', 'Odisha Governance & Schemes', 'How many Lok Sabha and Rajya Sabha seats does Odisha represent in the Indian Parliament?', ['20 LS, 10 RS', '21 LS, 10 RS', '21 LS, 12 RS', '18 LS, 10 RS'], 1, 'Odisha sends 21 members to the Lok Sabha and 10 members to the Rajya Sabha.', 'ଭାରତୀୟ ସଂସଦରେ ଓଡ଼ିଶାର କେତୋଟି ଲୋକସଭା ଓ ରାଜ୍ୟସଭା ଆସନ ଅଛି?', 'ଓଡ଼ିଶାରୁ ୨୧ ଜଣ ଲୋକସଭା ଓ ୧୦ ଜଣ ରାଜ୍ୟସଭା ସାଂସଦ ପ୍ରତିନିଧିତ୍ୱ କରନ୍ତି।'),
    qItem('og16', 'Odisha Governance & Schemes', 'How many Revenue Divisions administer Odisha\'s 30 districts?', ['2', '3', '4', '5'], 1, 'Odisha has 3 Revenue Divisions (Central, Northern, Southern) with 10 districts each.', 'ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲା କେତୋଟି ରାଜସ୍ୱ ଡିଭିଜନ (Revenue Divisions) ଅଧୀନରେ ପରିଚାଳିତ?', 'ଓଡ଼ିଶାରେ ୩ଟି ରାଜସ୍ୱ ଡିଭିଜନ (କେନ୍ଦ୍ରାଞ୍ଚଳ, ଉତ୍ତରାଞ୍ଚଳ, ଦକ୍ଷିଣାଞ୍ଚଳ) ରହିଛି।'),
    qItem('og17', 'Odisha Governance & Schemes', 'Where is the permanent seat of the High Court of Orissa located?', ['Bhubaneswar', 'Cuttack', 'Puri', 'Sambalpur'], 1, 'The Orissa High Court has been seated at Cuttack since its inauguration in 1948.', 'ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ (Orissa High Court) ର ସ୍ଥାୟୀ ପୀଠ କେଉଁଠାରେ ଅବସ୍ଥିତ?', '୧୯୪୮ ମସିହାରୁ ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ କଟକରେ ଅବସ୍ଥିତ।'),
    qItem('og18', 'Odisha Governance & Schemes', 'Under Odisha\'s Subhadra Yojana, eligible women aged 21–60 receive what annual DBT amount?', ['₹6,000', '₹8,000', '₹10,000', '₹12,000'], 2, 'Subhadra Yojana transfers ₹10,000/year in two installments of ₹5,000 via Aadhaar-seeded DBT.', 'ଓଡ଼ିଶାର ସୁଭଦ୍ରା ଯୋଜନା ଅଧୀନରେ ଯୋଗ୍ୟ ମହିଳାମାନେ ବାର୍ଷିକ କେତେ ଟଙ୍କା DBT ସହାୟତା ପାଆନ୍ତି?', 'ସୁଭଦ୍ରା ଯୋଜନାରେ ଦୁଇଟି କିସ୍ତିରେ ବାର୍ଷିକ ₹୧୦,୦୦୦ ଟଙ୍କା ପ୍ରଦାନ କରାଯାଏ।'),
    qItem('og19', 'Odisha Governance & Schemes', 'Which district headquarters is Bhawanipatna?', ['Nuapada', 'Kalahandi', 'Balangir', 'Rayagada'], 1, 'Bhawanipatna is the administrative headquarters of Kalahandi district.', 'ଭବାନୀପାଟଣା ଓଡ଼ିଶାର କେଉଁ ଜିଲ୍ଲାର ସଦର ମହକୁମା?', 'ଭବାନୀପାଟଣା କଳାହାଣ୍ଡି ଜିଲ୍ଲାର ପ୍ରଶାସନିକ ସଦର ମହକୁମା।'),
    qItem('og20', 'Odisha Current Affairs', 'Which Odisha major port is being developed as a Green Hydrogen & Green Ammonia Export Hub?', ['Gopalpur', 'Paradip', 'Dhamra', 'Subarnarekha'], 1, 'Paradip Port (Jagatsinghpur) is Odisha\'s only Major Port and a National Green Hydrogen Hub.', 'ଓଡ଼ିଶାର କେଉଁ ବୃହତ୍ ବନ୍ଦରକୁ ଗ୍ରୀନ୍ ହାଇଡ୍ରୋଜେନ୍ ରପ୍ତାନି ହବ୍ ଭାବେ ବିକଶିତ କରାଯାଉଛି?', 'ଜଗତସିଂହପୁରର ପାରାଦୀପ ବନ୍ଦରକୁ ଜାତୀୟ ଗ୍ରୀନ୍ ହାଇଡ୍ରୋଜେନ୍ ହବ୍ ଭାବେ ବିକଶିତ କରାଯାଉଛି।'),
    qItem('og21', 'Odisha Current Affairs', 'Effective April 1, 2026, what major tax relief did the Government of Odisha enact for salaried employees?', ['Abolition of Professional Tax', 'Zero GST on books', '50% Stamp Duty cut', 'Zero Road Tax'], 0, 'Odisha abolished Professional Tax w.e.f. April 1, 2026.', '୧ ଏପ୍ରିଲ ୨୦୨୬ରୁ ଓଡ଼ିଶା ସରକାର ବେତନଭୋଗୀ କର୍ମଚାରୀଙ୍କ ପାଇଁ କେଉଁ ବଡ଼ କର ଛାଡ଼ ଲାଗୁ କରିଛନ୍ତି?', 'ଓଡ଼ିଶା ସରକାର ୧ ଏପ୍ରିଲ ୨୦୨୬ରୁ ପ୍ରଫେସନାଲ୍ ଟ୍ୟାକ୍ସ (Professional Tax) ଉଚ୍ଛେଦ କରିଛନ୍ତି।'),
    qItem('og22', 'Odisha Current Affairs', 'Info Valley (EMC 2.0) supporting Odisha\'s semiconductor design (O-Chip) is located near which city?', ['Rourkela', 'Bhubaneswar', 'Berhampur', 'Balasore'], 1, 'Info Valley near Bhubaneswar (Khordha) anchors Odisha\'s Electronics & Semiconductor cluster.', 'ଓଡ଼ିଶାର ସେମିକଣ୍ଡକ୍ଟର (O-Chip) ପାଇଁ ଇନଫୋ ଭ୍ୟାଲି (EMC 2.0) କେଉଁ ସହର ନିକଟରେ ଅବସ୍ଥିତ?', 'ଭୁବନେଶ୍ୱର ନିକଟ ଇନଫୋ ଭ୍ୟାଲିରେ ଓଡ଼ିଶାର ଇଲେକ୍ଟ୍ରୋନିକ୍ସ ଓ ସେମିକଣ୍ଡକ୍ଟର କ୍ଲଷ୍ଟର ରହିଛି।'),
    qItem('og23', 'Odisha Current Affairs', 'Birsa Munda International Hockey Stadium is located in which city of Sundargarh district?', ['Sundargarh', 'Rourkela', 'Rajgangpur', 'Bonai'], 1, 'Rourkela hosts the Birsa Munda International Hockey Stadium.', 'ବିର୍ସା ମୁଣ୍ଡା ଆନ୍ତର୍ଜାତୀୟ ହକି ଷ୍ଟାଡିୟମ ସୁନ୍ଦରଗଡ଼ ଜିଲ୍ଲାର କେଉଁ ସହରରେ ଅବସ୍ଥିତ?', 'ରାଉରକେଲାରେ ବିର୍ସା ମୁଣ୍ଡା ଆନ୍ତର୍ଜାତୀୟ ହକି ଷ୍ଟାଡିୟମ ଅବସ୍ଥିତ।'),
    qItem('og24', 'Odisha Current Affairs', 'Koraput Kalajeera Rice, known as the "Prince of Rice", received its GI tag from which Odisha district?', ['Mayurbhanj', 'Koraput', 'Bargarh', 'Ganjam'], 1, 'Kalajeera Rice is an aromatic black rice variety native to Koraput district.', '"ଚାଉଳର ରାଜକୁମାର" ଭାବେ ପରିଚିତ କଳାଜୀରା ଚାଉଳ କେଉଁ ଜିଲ୍ଲାରୁ GI ଟ୍ୟାଗ୍ ପାଇଛି?', 'ସୁଗନ୍ଧିତ କଳାଜୀରା ଚାଉଳ କୋରାପୁଟ ଜିଲ୍ଲାରୁ GI ଟ୍ୟାଗ୍ ଲାଭ କରିଛି।'),
    qItem('og25', 'Odisha Current Affairs', 'Similipal Kai Chutney, awarded a GI tag, is traditionally prepared by tribal communities in which district?', ['Mayurbhanj', 'Kandhamal', 'Malkangiri', 'Nabarangpur'], 0, 'Similipal Kai Chutney (Red Weaver Ant chutney) belongs to Mayurbhanj district.', 'GI ଟ୍ୟାଗ୍ ପ୍ରାପ୍ତ ଶିମିଳିପାଳ କାଇ ଚଟଣି କେଉଁ ଜିଲ୍ଲାର ଆଦିବାସୀ ସମ୍ପ୍ରଦାୟର ପାରମ୍ପରିକ ଖାଦ୍ୟ?', 'ଶିମିଳିପାଳ କାଇ ଚଟଣି ମୟୂରଭଞ୍ଜ ଜିଲ୍ଲାର ପାରମ୍ପରିକ ଖାଦ୍ୟ।')
  ];

  var TEACHING_QUESTIONS = [
    qItem('tp1', 'Child Development & Pedagogy', 'According to Jean Piaget, during which stage do children develop conservation and logical thinking about concrete objects?', ['Sensorimotor', 'Pre-operational', 'Concrete Operational', 'Formal Operational'], 2, 'In the Concrete Operational stage (7–11 years), children master conservation, classification, and reversibility.', 'ଜିନ୍ ପିଆଜେଙ୍କ ମତରେ କେଉଁ ପର୍ଯ୍ୟାୟରେ ପିଲାମାନେ ମୂର୍ତ୍ତ ବସ୍ତୁ ବିଷୟରେ ତାର୍କିକ ଚିନ୍ତନ ଓ ସଂରକ୍ଷଣ (Conservation) ଶିଖନ୍ତି?', 'ମୂର୍ତ୍ତ ସକ୍ରିୟାତ୍ମକ ପର୍ଯ୍ୟାୟରେ (୭–୧୧ ବର୍ଷ) ପିଲାମାନେ ସଂରକ୍ଷଣ ଓ ଶ୍ରେଣୀବିଭାଗ ଶିଖନ୍ତି।'),
    qItem('tp2', 'Child Development & Pedagogy', 'Lev Vygotsky\'s concept of the gap between what a learner can do independently and with guidance is called:', ['Schema', 'Zone of Proximal Development (ZPD)', 'Equilibration', 'Operant Conditioning'], 1, 'ZPD represents tasks a learner can accomplish with scaffolding from a More Knowledgeable Other (MKO).', 'ଭାଇଗୋଟସ୍କିଙ୍କ ତତ୍ତ୍ୱରେ ଶିକ୍ଷାର୍ଥୀ ନିଜେ କରିପାରୁଥିବା ଓ ସହାୟତାରେ କରିପାରୁଥିବା କାମ ମଧ୍ୟର ପାର୍ଥକ୍ୟକୁ କ\'ଣ କୁହାଯାଏ?', 'ଏହାକୁ Zone of Proximal Development (ZPD) କୁହାଯାଏ।'),
    qItem('tp3', 'Child Development & Pedagogy', 'Howard Gardner\'s Theory of Multiple Intelligences emphasizes that intelligence is:', ['A single general factor (g)', 'Multi-dimensional with distinct abilities', 'Fixed solely at birth', 'Measured only by IQ tests'], 1, 'Gardner proposed multiple independent intelligences (linguistic, logical, spatial, musical, interpersonal, etc.).', 'ହାୱାର୍ଡ ଗାର୍ଡନରଙ୍କ ବହୁ-ବୁଦ୍ଧି ତତ୍ତ୍ୱ (Multiple Intelligences) କ\'ଣ ଦର୍ଶାଏ?', 'ବୁଦ୍ଧି ଏକକ ନୁହେଁ, ବରଂ ବିଭିନ୍ନ ସ୍ୱତନ୍ତ୍ର ଦକ୍ଷତାର ବହୁମୁଖୀ ସମଷ୍ଟି।'),
    qItem('tp4', 'Child Development & Pedagogy', 'In Lawrence Kohlberg\'s stages of moral development, obeying rules solely to avoid punishment belongs to:', ['Pre-conventional level', 'Conventional level', 'Post-conventional level', 'Autonomous level'], 0, 'Stage 1 (Obedience and Punishment orientation) is part of the Pre-conventional level.', 'କୋହଲବର୍ଗଙ୍କ ନୈତିକ ବିକାଶ ତତ୍ତ୍ୱରେ ଦଣ୍ଡରୁ ବଞ୍ଚିବା ପାଇଁ ନିୟମ ମାନିବା କେଉଁ ସ୍ତରର ଅନ୍ତର୍ଭୁକ୍ତ?', 'ଏହା ପ୍ରାକ୍-ପାରମ୍ପରିକ (Pre-conventional) ସ୍ତରର ପ୍ରଥମ ପର୍ଯ୍ୟାୟ।'),
    qItem('tp5', 'Child Development & Pedagogy', 'Erik Erikson\'s psychosocial crisis during early adolescence (12–18 years) is:', ['Trust vs. Mistrust', 'Industry vs. Inferiority', 'Identity vs. Role Confusion', 'Intimacy vs. Isolation'], 2, 'Adolescents explore personal values and career goals in Identity vs. Role Confusion.', 'କିଶୋରାବସ୍ଥା (୧୨–୧୮ ବର୍ଷ) ରେ ଏରିକ୍ ଏରିକସନଙ୍କ ମନୋ-ସାମାଜିକ ଦ୍ୱନ୍ଦ୍ୱ କେଉଁଟି?', 'କିଶୋରାବସ୍ଥାରେ ପରିଚୟ ବନାମ ଭୂମିକା ଦ୍ୱନ୍ଦ୍ୱ (Identity vs. Role Confusion) ଦେଖାଯାଏ।'),
    qItem('tp6', 'Child Development & Pedagogy', 'In Revised Bloom\'s Taxonomy (Anderson & Krathwohl), what is the highest level of the cognitive domain?', ['Analyzing', 'Evaluating', 'Creating', 'Applying'], 2, 'The revised hierarchy from lowest to highest is: Remember, Understand, Apply, Analyze, Evaluate, Create.', 'ସଂଶୋଧିତ ବ୍ଲୁମ୍ସ ଟ୍ୟାକ୍ସୋନୋମିରେ ଜ୍ଞାନାତ୍ମକ କ୍ଷେତ୍ରର ସର୍ବୋଚ୍ଚ ସ୍ତର କେଉଁଟି?', 'ସଂଶୋଧିତ ବ୍ଲୁମ୍ସ ଟ୍ୟାକ୍ସୋନୋମିରେ ସର୍ବୋଚ୍ଚ ସ୍ତର ହେଉଛି ସୃଜନ (Creating)।'),
    qItem('tp7', 'Child Development & Pedagogy', 'Constructivist pedagogy views the teacher primarily as a:', ['Sole transmitter of fixed facts', 'Facilitator and co-constructor of knowledge', 'Strict disciplinarian', 'Passive observer'], 1, 'In constructivism (Piaget, Vygotsky, NCF 2005), teachers facilitate active meaning-making by learners.', 'ଗଠନମୂଳକ ଶିକ୍ଷାଦାନ (Constructivism) ରେ ଶିକ୍ଷକଙ୍କ ମୁଖ୍ୟ ଭୂମିକା କ\'ଣ?', 'ଶିକ୍ଷକ ଜଣେ ସହାୟକ (Facilitator) ଭାବେ ଶିକ୍ଷାର୍ଥୀଙ୍କୁ ଜ୍ଞାନ ନିର୍ମାଣରେ ସାହାଯ୍ୟ କରନ୍ତି।'),
    qItem('tp8', 'NEP 2020 & NCF', 'What is the new curricular and pedagogical structure introduced by NEP 2020 replacing 10+2?', ['5+3+3+4', '5+4+3+3', '6+3+3+2', '4+4+4+3'], 0, 'NEP 2020 establishes the 5+3+3+4 structure: Foundational (5), Preparatory (3), Middle (3), Secondary (4).', 'ଜାତୀୟ ଶିକ୍ଷା ନୀତି ୨୦୨୦ ରେ ୧୦+୨ ବଦଳରେ କେଉଁ ନୂତନ ପାଠ୍ୟକ୍ରମ ଢାଞ୍ଚା ଲାଗୁ ହୋଇଛି?', 'NEP 2020 ରେ ୫+୩+୩+୪ ଢାଞ୍ଚା ପ୍ରଚଳିତ ହୋଇଛି।'),
    qItem('tp9', 'NEP 2020 & NCF', 'Under NEP 2020, what is the full form of PARAKH, the national assessment centre?', ['Performance Assessment, Review, and Analysis of Knowledge for Holistic Development', 'Primary Academic Research and Knowledge Hub', 'Public Assessment Registry for Accredited Knowledge', 'Pedagogical Audit & Review Agency for Kids'], 0, 'PARAKH sets norms, standards, and guidelines for student assessment across India.', 'NEP 2020 ଅଧୀନରେ ଜାତୀୟ ମୂଲ୍ୟାୟନ କେନ୍ଦ୍ର PARAKH ର ପୂର୍ଣ୍ଣ ରୂପ କ\'ଣ?', 'PARAKH ହେଉଛି Performance Assessment, Review, and Analysis of Knowledge for Holistic Development।'),
    qItem('tp10', 'NEP 2020 & NCF', 'The Right of Children to Free and Compulsory Education (RTE) Act, 2009 guarantees free education for ages:', ['3 to 12 years', '6 to 14 years', '6 to 18 years', '5 to 15 years'], 1, 'Article 21A and the RTE Act 2009 mandate free and compulsory education for children aged 6–14 years.', 'ଶିକ୍ଷା ଅଧିକାର ଆଇନ (RTE Act 2009) କେତେ ବୟସର ପିଲାଙ୍କ ପାଇଁ ମାଗଣା ଓ ବାଧ୍ୟତାମୂଳକ ଶିକ୍ଷା ନିଶ୍ଚିତ କରେ?', 'ଧାରା ୨୧କ ଓ RTE ଆଇନ ୨୦୦୯ ୬ରୁ ୧୪ ବର୍ଷର ପିଲାଙ୍କ ପାଇଁ ମାଗଣା ଶିକ୍ଷା ନିଶ୍ଚିତ କରେ।'),
    qItem('tp11', 'NEP 2020 & NCF', 'NIPUN Bharat Mission launched under NEP 2020 aims to achieve universal Foundational Literacy and Numeracy (FLN) by:', ['Grade 1', 'Grade 3', 'Grade 5', 'Grade 8'], 1, 'NIPUN Bharat targets universal FLN for every child by the end of Grade 3.', 'ନିପୁଣ ଭାରତ (NIPUN Bharat) ମିଶନ କେଉଁ ଶ୍ରେଣୀ ସୁଦ୍ଧା ମୌଳିକ ସାକ୍ଷରତା ଓ ସଂଖ୍ୟାଜ୍ଞାନ (FLN) ଲକ୍ଷ୍ୟ ରଖିଛି?', 'ତୃତୀୟ ଶ୍ରେଣୀ (Grade 3) ଶେଷ ସୁଦ୍ଧା ସମସ୍ତ ପିଲାଙ୍କ ପାଇଁ FLN ଲକ୍ଷ୍ୟ ରହିଛି।'),
    qItem('tp12', 'NEP 2020 & NCF', 'Under NEP 2020, what is the minimum degree qualification envisaged for school teachers by 2030?', ['1-year D.El.Ed', '2-year B.Ed', '4-year Integrated B.Ed (ITEP)', 'Any Graduate degree'], 2, 'NEP 2020 designates the 4-year Integrated Teacher Education Programme (ITEP) as the minimum qualification by 2030.', 'NEP 2020 ଅନୁଯାୟୀ ୨୦୩୦ ସୁଦ୍ଧା ବିଦ୍ୟାଳୟ ଶିକ୍ଷକଙ୍କ ପାଇଁ ସର୍ବନିମ୍ନ ଯୋଗ୍ୟତା କ\'ଣ ହେବ?', '୪-ବର୍ଷିଆ ସମନ୍ୱିତ ବି.ଏଡ୍ (ITEP) ୨୦୩୦ ସୁଦ୍ଧା ସର୍ବନିମ୍ନ ଯୋଗ୍ୟତା ହେବ।'),
    qItem('tp13', 'NEP 2020 & NCF', 'Which statutory body regulates teacher education standards across India?', ['AICTE', 'NCTE', 'MCI', 'BCI'], 1, 'The National Council for Teacher Education (NCTE) oversees norms and standards for teacher education.', 'ଭାରତରେ ଶିକ୍ଷକ ଶିକ୍ଷା ମାନଦଣ୍ଡ କେଉଁ ବୈଧାନିକ ସଂସ୍ଥା ନିୟନ୍ତ୍ରଣ କରେ?', 'ଜାତୀୟ ଶିକ୍ଷକ ଶିକ୍ଷା ପରିଷଦ (NCTE) ଶିକ୍ଷକ ଶିକ୍ଷା ନିୟନ୍ତ୍ରଣ କରେ।'),
    qItem('tp14', 'Inclusive Education', 'Dyslexia is a specific learning disability primarily affecting:', ['Motor coordination', 'Reading, spelling, and phonological decoding', 'Mathematical computation only', 'Hearing acuity'], 1, 'Dyslexia primarily impairs fluent word recognition, spelling, and decoding skills.', 'ଡିସଲେକ୍ସିଆ (Dyslexia) ମୁଖ୍ୟତଃ କେଉଁ ଶିକ୍ଷଣ ଅକ୍ଷମତା ସହ ଜଡ଼ିତ?', 'ଡିସଲେକ୍ସିଆ ପଠନ, ବନାନ ଓ ଶବ୍ଦ ଉଚ୍ଚାରଣରେ ଅସୁବିଧା ସୃଷ୍ଟି କରେ।'),
    qItem('tp15', 'Inclusive Education', 'Difficulty primarily in understanding numbers, arithmetic facts, and mathematical reasoning is termed:', ['Dysgraphia', 'Dyscalculia', 'Dyspraxia', 'Aphasia'], 1, 'Dyscalculia specifically affects number sense and mathematical calculation.', 'ସଂଖ୍ୟା ବୁଝିବା ଓ ଗାଣିତିକ ଗଣନାରେ ଅସୁବିଧାକୁ କ\'ଣ କୁହାଯାଏ?', 'ଏହାକୁ ଡିସକାଲକୁଲିଆ (Dyscalculia) କୁହାଯାଏ।'),
    qItem('tp16', 'Inclusive Education', 'In an inclusive classroom, Universal Design for Learning (UDL) recommends providing:', ['One rigid textbook for all', 'Multiple means of engagement, representation, and expression', 'Separate segregated schools', 'Identical timed written tests only'], 1, 'UDL removes barriers by offering flexible ways to access content, engage, and demonstrate learning.', 'ସମାବେଶୀ ଶ୍ରେଣୀଗୃହରେ Universal Design for Learning (UDL) କ\'ଣ ସୁପାରିଶ କରେ?', 'UDL ଶିକ୍ଷଣ, ଉପସ୍ଥାପନା ଓ ଅଭିବ୍ୟକ୍ତିର ବହୁମୁଖୀ ମାଧ୍ୟମ ଯୋଗାଇବାକୁ ସୁପାରିଶ କରେ।'),
    qItem('tp17', 'Inclusive Education', 'Multilingual classrooms using the child\'s mother tongue (e.g., Odia / tribal languages) in early grades:', ['Confuse young learners', 'Strengthen conceptual understanding and cognitive growth', 'Delay literacy', 'Are prohibited by NCF'], 1, 'NEP 2020 and research affirm that mother-tongue instruction in early years deepens comprehension and retention.', 'ପ୍ରାଥମିକ ଶ୍ରେଣୀରେ ମାତୃଭାଷା (ଯଥା ଓଡ଼ିଆ/ଆଦିବାସୀ ଭାଷା) ବ୍ୟବହାର କରିବା ଦ୍ୱାରା କ\'ଣ ହୁଏ?', 'ମାତୃଭାଷାରେ ଶିକ୍ଷାଦାନ ପିଲାଙ୍କ ଧାରଣାଗତ ବୁଝାମଣା ଓ ଜ୍ଞାନାତ୍ମକ ବିକାଶକୁ ଦୃଢ଼ କରେ।'),
    qItem('tp18', 'Inclusive Education', 'Under RPwD Act 2016, how many benchmark disabilities are officially recognized in India?', ['7', '14', '21', '25'], 2, 'The Rights of Persons with Disabilities (RPwD) Act 2016 expanded recognized disabilities from 7 to 21.', 'RPwD ଆଇନ ୨୦୧୬ ଅଧୀନରେ ଭାରତରେ କେତୋଟି ଭିନ୍ନକ୍ଷମତାକୁ ସରକାରୀ ସ୍ୱୀକୃତି ଦିଆଯାଇଛି?', 'RPwD ଆଇନ ୨୦୧୬ରେ ସ୍ୱୀକୃତ ଭିନ୍ନକ୍ଷମତା ସଂଖ୍ୟା ୭ରୁ ବଢ଼ି ୨୧ ହୋଇଛି।'),
    qItem('tp19', 'Inclusive Education', 'Which teaching method encourages learners to discover principles themselves through guided inquiry?', ['Lecture Method', 'Heuristic / Discovery Method', 'Rote Drill Method', 'Dictation Method'], 1, 'The Heuristic method (propounded by H.E. Armstrong) puts the student in the role of an active discoverer.', 'କେଉଁ ଶିକ୍ଷାଦାନ ପଦ୍ଧତିରେ ଶିକ୍ଷାର୍ଥୀ ନିଜେ ଅନୁସନ୍ଧାନ କରି ସିଦ୍ଧାନ୍ତ ଆବିଷ୍କାର କରନ୍ତି?', 'ଆବିଷ୍କାର ପଦ୍ଧତି (Heuristic Method) ଶିକ୍ଷାର୍ଥୀଙ୍କୁ ସକ୍ରିୟ ଅନ୍ୱେଷଣକାରୀ ଭାବେ ଗଢ଼ି ତୋଳେ।'),
    qItem('tp20', 'Assessment & Evaluation', 'Assessment conducted DURING the teaching-learning process to provide ongoing feedback and improve instruction is:', ['Summative Assessment', 'Formative Assessment', 'Norm-referenced Ranking', 'Placement Testing'], 1, 'Formative assessment (Assessment FOR Learning) diagnoses learning gaps while instruction is still underway.', 'ଶିକ୍ଷାଦାନ ଚାଲିଥିବା ସମୟରେ ନିରନ୍ତର ମତାମତ ଓ ଉନ୍ନତି ପାଇଁ କରାଯାଉଥିବା ମୂଲ୍ୟାୟନକୁ କ\'ଣ କୁହାଯାଏ?', 'ଏହାକୁ ଗଠନମୂଳକ ମୂଲ୍ୟାୟନ (Formative Assessment) କୁହାଯାଏ।'),
    qItem('tp21', 'Assessment & Evaluation', 'A test that consistently yields the same scores upon repeated administration under similar conditions has high:', ['Validity', 'Reliability', 'Objectivity', 'Usability'], 1, 'Reliability refers to consistency/stability of measurement; validity refers to measuring what it intends to measure.', 'ସମାନ ପରିସ୍ଥିତିରେ ବାରମ୍ବାର ପରୀକ୍ଷା କଲେ ଯଦି ସମାନ ଫଳାଫଳ ମିଳେ, ତେବେ ପରୀକ୍ଷାର କେଉଁ ଗୁଣ ଉଚ୍ଚ ଅଟେ?', 'ଏହାକୁ ବିଶ୍ୱସନୀୟତା (Reliability) କୁହାଯାଏ।'),
    qItem('tp22', 'Assessment & Evaluation', 'Which tool uses explicit performance criteria and rating levels to grade essays, projects, or portfolios fairly?', ['Anecdotal Record', 'Scoring Rubric', 'Sociogram', 'Attendance Register'], 1, 'A rubric clearly specifies criteria and quality levels, enhancing grading objectivity and student clarity.', 'ପ୍ରକଳ୍ପ ବା ପୋର୍ଟଫୋଲିଓର ନିରପେକ୍ଷ ମୂଲ୍ୟାୟନ ପାଇଁ ସ୍ପଷ୍ଟ ମାନଦଣ୍ଡ ଥିବା ଉପକରଣଟି କେଉଁଟି?', 'ସ୍କୋରିଂ ରୁବ୍ରିକ୍ (Scoring Rubric) ସ୍ପଷ୍ଟ ମାନଦଣ୍ଡ ଅନୁଯାୟୀ ନିରପେକ୍ଷ ମୂଲ୍ୟାୟନ ସୁନିଶ୍ଚିତ କରେ।'),
    qItem('tp23', 'Assessment & Evaluation', 'Diagnostic testing in a classroom is primarily followed by:', ['Punishment', 'Remedial Teaching', 'Promotion to next grade', 'Ranking on noticeboard'], 1, 'Diagnostic tests pinpoint specific misconceptions so teachers can deliver targeted remedial teaching.', 'ଶ୍ରେଣୀଗୃହରେ ନିଦାନାତ୍ମକ ପରୀକ୍ଷା (Diagnostic Test) ପରେ ମୁଖ୍ୟତଃ କ\'ଣ କରାଯାଏ?', 'ନିଦାନାତ୍ମକ ପରୀକ୍ଷା ପରେ ଦୁର୍ବଳତା ଦୂର କରିବାକୁ ପ୍ରତିକାରାତ୍ମକ ଶିକ୍ଷାଦାନ (Remedial Teaching) କରାଯାଏ।'),
    qItem('tp24', 'Assessment & Evaluation', 'Continuous and Comprehensive Evaluation (CCE) covers:', ['Only written annual exams', 'Both scholastic and co-scholastic aspects of growth', 'Only sports achievements', 'Only homework submission'], 1, 'CCE evaluates both scholastic (academic) and co-scholastic (life skills, values, arts, health) domains.', 'ନିରନ୍ତର ଓ ସାମଗ୍ରିକ ମୂଲ୍ୟାୟନ (CCE) କେଉଁ ଦିଗଗୁଡ଼ିକୁ ଅନ୍ତର୍ଭୁକ୍ତ କରେ?', 'CCE ଉଭୟ ପାଠ୍ୟକ୍ରମିକ (Scholastic) ଓ ସହ-ପାଠ୍ୟକ୍ରମିକ (Co-scholastic) ଦିଗକୁ ମୂଲ୍ୟାୟନ କରେ।'),
    qItem('tp25', 'Assessment & Evaluation', 'Micro-teaching is primarily designed to:', ['Teach large lecture halls', 'Practice specific teaching skills in scaled-down sessions', 'Replace annual examinations', 'Evaluate school principals'], 1, 'Micro-teaching scales down class size (5–10 peers) and duration (5–10 min) to master one teaching skill at a time.', 'ଅଣୁ-ଶିକ୍ଷାଦାନ (Micro-teaching) ମୁଖ୍ୟତଃ କେଉଁ ଉଦ୍ଦେଶ୍ୟରେ ବ୍ୟବହୃତ ହୁଏ?', 'କମ୍ ସମୟ ଓ ଛୋଟ ଦଳରେ ଗୋଟିଏ ନିର୍ଦ୍ଦିଷ୍ଟ ଶିକ୍ଷାଦାନ କୌଶଳ ଅଭ୍ୟାସ ପାଇଁ ଅଣୁ-ଶିକ୍ଷାଦାନ କରାଯାଏ।')
  ];

  var REASONING_QUANT_QUESTIONS = [
    qItem('rq1', 'Arithmetic & Percentage', 'If a candidate\'s score increases from 80 to 100, what is the percentage increase?', ['20%', '22.5%', '25%', '30%'], 2, 'Increase = 20; (20 / 80) × 100 = 25%.', 'ଜଣେ ପ୍ରାର୍ଥୀଙ୍କ ନମ୍ବର ୮୦ରୁ ୧୦୦କୁ ବଢ଼ିଲେ ଶତକଡ଼ା ବୃଦ୍ଧି କେତେ?', 'ବୃଦ୍ଧି = ୨୦; (୨୦ / ୮୦) × ୧୦୦ = ୨୫%।'),
    qItem('rq2', 'Arithmetic & Percentage', 'An article bought for ₹800 is sold for ₹920. What is the profit percentage?', ['12%', '15%', '16%', '18%'], 1, 'Profit = ₹120; (120 / 800) × 100 = 15%.', '₹୮୦୦ରେ କିଣାଯାଇଥିବା ଏକ ବସ୍ତୁ ₹୯୨୦ରେ ବିକ୍ରି ହେଲେ ଲାଭ ଶତକଡ଼ା କେତେ?', 'ଲାଭ = ₹୧୨୦; (୧୨୦ / ୮୦୦) × ୧୦୦ = ୧୫%।'),
    qItem('rq3', 'Arithmetic & Percentage', 'What is 15% of 240 plus 20% of 150?', ['60', '66', '72', '76'], 1, '15% of 240 = 36; 20% of 150 = 30; 36 + 30 = 66.', '୨୪୦ର ୧୫% + ୧୫୦ର ୨୦% କେତେ ହେବ?', '୨୪୦ର ୧୫% = ୩୬ ଏବଂ ୧୫୦ର ୨୦% = ୩୦; ମୋଟ = ୬୬।'),
    qItem('rq4', 'Arithmetic & Percentage', 'A price is increased by 20% and then decreased by 20%. What is the net percentage change?', ['0% change', '4% decrease', '4% increase', '2% decrease'], 1, 'Net change = +20 − 20 − (20×20)/100 = −4% (4% decrease).', 'ଏକ ମୂଲ୍ୟ ପ୍ରଥମେ ୨୦% ବଢ଼ି ପୁଣି ୨୦% କମିଲେ ମୋଟ ଶତକଡ଼ା ପରିବର୍ତ୍ତନ କେତେ?', 'ମୋଟ ପରିବର୍ତ୍ତନ = −(୨୦×୨୦)/୧୦୦ = ୪% ହ୍ରାସ।'),
    qItem('rq5', 'Arithmetic & Percentage', 'Simple Interest on ₹5,000 at 8% per annum for 3 years is:', ['₹1,000', '₹1,200', '₹1,250', '₹1,500'], 1, 'SI = (P × R × T) / 100 = (5000 × 8 × 3) / 100 = ₹1,200.', '₹୫,୦୦୦ ଉପରେ ବାର୍ଷିକ ୮% ହାରରେ ୩ ବର୍ଷର ସରଳ ସୁଧ କେତେ?', 'ସରଳ ସୁଧ = (୫୦୦୦ × ୮ × ୩) / ୧୦୦ = ₹୧,୨୦୦।'),
    qItem('rq6', 'Arithmetic & Percentage', 'A can complete a work in 12 days and B in 6 days. Together they will finish it in:', ['3 days', '4 days', '5 days', '6 days'], 1, 'Combined rate = 1/12 + 1/6 = 3/12 = 1/4 → 4 days.', 'A ଗୋଟିଏ କାମ ୧୨ ଦିନରେ ଓ B ୬ ଦିନରେ କରିପାରନ୍ତି। ଉଭୟ ମିଶି କେତେ ଦିନରେ ସାରିବେ?', 'ମିଳିତ ହାର = ୧/୧୨ + ୧/୬ = ୧/୪ → ୪ ଦିନ।'),
    qItem('rq7', 'Arithmetic & Percentage', 'A train runs at 72 km/h. What is its speed in metres per second (m/s)?', ['15 m/s', '18 m/s', '20 m/s', '24 m/s'], 2, '72 × (5 / 18) = 20 m/s.', 'ଗୋଟିଏ ଟ୍ରେନ୍ ଘଣ୍ଟାକୁ ୭୨ କିମି ବେଗରେ ଚାଲିଲେ ସେକେଣ୍ଡ ପ୍ରତି କେତେ ମିଟର ଯିବ?', '୭୨ × (୫ / ୧୮) = ୨୦ ମିଟର/ସେକେଣ୍ଡ।'),
    qItem('rq8', 'Number Series & Coding', 'Find the next number in the series: 3, 7, 15, 31, 63, ?', ['125', '127', '129', '131'], 1, 'Pattern: each term = 2×previous + 1. So 63×2 + 1 = 127.', 'ଶ୍ରେଣୀର ପରବର୍ତ୍ତୀ ସଂଖ୍ୟା ବାଛନ୍ତୁ: 3, 7, 15, 31, 63, ?', 'ପ୍ରତ୍ୟେକ ପଦ = ୨×ପୂର୍ବ ପଦ + ୧ → ୬୩×୨ + ୧ = ୧୨୭।'),
    qItem('rq9', 'Number Series & Coding', 'Find the missing term: 4, 9, 25, 49, 121, ?', ['144', '169', '196', '225'], 1, 'Squares of consecutive prime numbers: 2², 3², 5², 7², 11², next is 13² = 169.', 'ଲୁପ୍ତ ସଂଖ୍ୟା ବାଛନ୍ତୁ: 4, 9, 25, 49, 121, ?', 'କ୍ରମିକ ମୌଳିକ ସଂଖ୍ୟାର ବର୍ଗ: ୨², ୩², ୫², ୭², ୧୧², ପରବର୍ତ୍ତୀ ୧୩² = ୧୬୯।'),
    qItem('rq10', 'Number Series & Coding', 'Find the next number: 2, 6, 12, 20, 30, 42, ?', ['54', '56', '58', '60'], 1, 'Differences are +4, +6, +8, +10, +12, +14 → 42 + 14 = 56 (or n(n+1)).', 'ପରବର୍ତ୍ତୀ ସଂଖ୍ୟା କେଉଁଟି: 2, 6, 12, 20, 30, 42, ?', 'ପାର୍ଥକ୍ୟ +୪, +୬, +୮, +୧୦, +୧୨, +୧୪ → ୪୨ + ୧୪ = ୫୬।'),
    qItem('rq11', 'Number Series & Coding', 'What comes next: 100, 96, 87, 71, 46, ?', ['10', '15', '21', '25'], 0, 'Subtracting squares: −2²(4), −3²(9), −4²(16), −5²(25), −6²(36) → 46 − 36 = 10.', 'ପରବର୍ତ୍ତୀ ସଂଖ୍ୟା କ\'ଣ ହେବ: 100, 96, 87, 71, 46, ?', 'କ୍ରମିକ ବର୍ଗ ବିୟୋଗ (−୪, −୯, −୧୬, −୨୫, −୩୬) → ୪୬ − ୩୬ = ୧୦।'),
    qItem('rq12', 'Number Series & Coding', 'Find the odd one out: 27, 64, 125, 144, 216', ['27', '64', '144', '216'], 2, 'All except 144 (12²) are perfect cubes (3³, 4³, 5³, 6³).', 'ଭିନ୍ନ ସଂଖ୍ୟାଟି ବାଛନ୍ତୁ: 27, 64, 125, 144, 216', '୧୪୪ (୧୨²) ଛଡ଼ା ବାକି ସମସ୍ତେ ଘନ ସଂଖ୍ୟା (୩³, ୪³, ୫³, ୬³)।'),
    qItem('rq13', 'Number Series & Coding', 'If ODISHA is coded as PEJTIB, how is PURI coded in the same code?', ['QVSJ', 'QVRJ', 'QUSJ', 'PVSJ'], 0, 'Each letter shifts +1 forward: P→Q, U→V, R→S, I→J → QVSJ.', 'ଯଦି ODISHA କୁ PEJTIB ଲେଖାଯାଏ, ତେବେ PURI କୁ କ\'ଣ ଲେଖାଯିବ?', 'ପ୍ରତ୍ୟେକ ଅକ୍ଷର +୧ ଆଗକୁ ବଢ଼ୁଛି: P→Q, U→V, R→S, I→J → QVSJ।'),
    qItem('rq14', 'Data Interpretation', 'The ratio of boys to girls in a class is 3 : 2. If there are 45 students total, how many are girls?', ['15', '18', '20', '27'], 1, 'Girls = (2 / 5) × 45 = 18.', 'ଗୋଟିଏ ଶ୍ରେଣୀରେ ପୁଅ ଓ ଝିଅଙ୍କ ଅନୁପାତ ୩:୨ ଏବଂ ମୋଟ ୪୫ ଛାତ୍ରଛାତ୍ରୀ ଅଛନ୍ତି। ଝିଅ ସଂଖ୍ୟା କେତେ?', 'ଝିଅ ସଂଖ୍ୟା = (୨ / ୫) × ୪୫ = ୧୮।'),
    qItem('rq15', 'Data Interpretation', 'The average of 5 consecutive odd numbers is 21. What is the largest of these numbers?', ['23', '25', '27', '29'], 1, 'The middle (3rd) number is 21; numbers are 17, 19, 21, 23, 25 → largest is 25.', '୫ଟି କ୍ରମିକ ଅଯୁଗ୍ମ ସଂଖ୍ୟାର ହାରାହାରି ୨୧ ହେଲେ ସବୁଠାରୁ ବଡ଼ ସଂଖ୍ୟା କେଉଁଟି?', 'ମଝି ସଂଖ୍ୟା ୨୧; ସଂଖ୍ୟାଗୁଡ଼ିକ ୧୭, ୧୯, ୨୧, ୨୩, ୨୫ → ସବୁଠାରୁ ବଡ଼ ୨୫।'),
    qItem('rq16', 'Data Interpretation', 'If A : B = 2 : 3 and B : C = 4 : 5, what is A : B : C?', ['8 : 12 : 15', '6 : 12 : 15', '8 : 10 : 15', '4 : 6 : 15'], 0, 'Multiply first by 4 (8:12) and second by 3 (12:15) → 8 : 12 : 15.', 'ଯଦି A:B = ୨:୩ ଏବଂ B:C = ୪:୫ ହୁଏ, ତେବେ A:B:C କେତେ?', 'ପ୍ରଥମକୁ ୪ (୮:୧୨) ଓ ଦ୍ୱିତୀୟକୁ ୩ (୧୨:୧୫) ରେ ଗୁଣିଲେ ୮:୧୨:୧୫।'),
    qItem('rq17', 'Data Interpretation', 'The average age of 4 friends is 24 years. If a 5th friend joins and the average becomes 25, what is the 5th friend\'s age?', ['25', '28', '29', '30'], 2, 'Total of 4 = 96; total of 5 = 125 → 5th age = 125 − 96 = 29 years.', '୪ ଜଣ ସାଙ୍ଗଙ୍କ ହାରାହାରି ବୟସ ୨୪ ବର୍ଷ। ୫ମ ସାଙ୍ଗ ମିଶିଲେ ହାରାହାରି ୨୫ ହେଲେ ୫ମ ସାଙ୍ଗଙ୍କ ବୟସ କେତେ?', '୪ ଜଣଙ୍କ ମୋଟ = ୯୬; ୫ ଜଣଙ୍କ ମୋଟ = ୧୨୫ → ୫ମ ବୟସ = ୧୨୫ − ୯୬ = ୨୯ ବର୍ଷ।'),
    qItem('rq18', 'Data Interpretation', 'A bus covers 180 km in 3 hours and 120 km in 2 hours. Its average speed for the whole journey is:', ['55 km/h', '60 km/h', '62 km/h', '65 km/h'], 1, 'Total distance = 300 km; total time = 5 hours → 300 / 5 = 60 km/h.', 'ଗୋଟିଏ ବସ୍ ୩ ଘଣ୍ଟାରେ ୧୮୦ କିମି ଓ ୨ ଘଣ୍ଟାରେ ୧୨୦ କିମି ଗଲେ ସମ୍ପୂର୍ଣ୍ଣ ଯାତ୍ରାର ହାରାହାରି ବେଗ କେତେ?', 'ମୋଟ ଦୂରତା = ୩୦୦ କିମି; ମୋଟ ସମୟ = ୫ ଘଣ୍ଟା → ୩୦୦ / ୫ = ୬୦ କିମି/ଘଣ୍ଟା।'),
    qItem('rq19', 'Data Interpretation', 'Find the LCM of 12, 15, and 20:', ['30', '45', '60', '120'], 2, '60 is the smallest positive multiple divisible by 12, 15, and 20.', '୧୨, ୧୫ ଏବଂ ୨୦ ର ଲ.ସା.ଗୁ (LCM) କେତେ?', '୧୨, ୧୫ ଓ ୨୦ ଦ୍ୱାରା ବିଭାଜ୍ୟ କ୍ଷୁଦ୍ରତମ ସଂଖ୍ୟା ୬୦।'),
    qItem('rq20', 'Logical & Analytical Reasoning', 'Pointing to a photograph, Ramesh says, "He is the only son of my father\'s father." How is the man related to Ramesh?', ['Brother', 'Uncle', 'Father', 'Grandfather'], 2, 'My father\'s father is grandfather; his only son is Ramesh\'s father.', 'ଏକ ଫଟୋ ଦେଖାଇ ରମେଶ କହିଲେ, "ସେ ମୋ ବାପାଙ୍କ ବାପାଙ୍କ ଏକମାତ୍ର ପୁଅ।" ବ୍ୟକ୍ତି ଜଣକ ରମେଶଙ୍କର କିଏ?', 'ବାପାଙ୍କ ବାପା ଅର୍ଥାତ୍ ଜେଜେବାପାଙ୍କ ଏକମାତ୍ର ପୁଅ ହେଉଛନ୍ତି ରମେଶଙ୍କ ବାପା।'),
    qItem('rq21', 'Logical & Analytical Reasoning', 'A person walks 10 m North, turns right and walks 6 m, then turns right and walks 10 m. How far and in which direction is he from the start?', ['6 m East', '6 m West', '10 m North', '16 m East'], 0, 'North 10 m and South 10 m cancel out, leaving 6 m East of the starting point.', 'ଜଣେ ବ୍ୟକ୍ତି ଉତ୍ତରକୁ ୧୦ ମି., ଡାହାଣକୁ ୬ ମି. ଓ ପୁଣି ଡାହାଣକୁ ୧୦ ମି. ଚାଲିଲେ ପ୍ରାରମ୍ଭିକ ସ୍ଥାନଠାରୁ କେଉଁ ଦିଗରେ ଅଛନ୍ତି?', 'ଉତ୍ତର ୧୦ ମି. ଓ ଦକ୍ଷିଣ ୧୦ ମି. ସମାନ ହେବାରୁ ସେ ୬ ମି. ପୂର୍ବରେ ଅଛନ୍ତି।'),
    qItem('rq22', 'Logical & Analytical Reasoning', 'In a row of 40 students, Sita is 14th from the left end. What is her rank from the right end?', ['26th', '27th', '28th', '25th'], 1, 'Rank from right = Total − Left + 1 = 40 − 14 + 1 = 27th.', '୪୦ ଜଣ ଛାତ୍ରଙ୍କ ଧାଡ଼ିରେ ସୀତା ବାମରୁ ୧୪ତମ ହେଲେ ଡାହାଣରୁ ତାଙ୍କ ସ୍ଥାନ କେତେ?', 'ଡାହାଣରୁ ସ୍ଥାନ = ୪୦ − ୧୪ + ୧ = ୨୭ତମ।'),
    qItem('rq23', 'Logical & Analytical Reasoning', 'If ALL books are pens and SOME pens are pencils, which conclusion definitely follows?', ['All books are pencils', 'Some books are pens', 'No pen is a book', 'All pencils are books'], 1, 'Since all books are pens, "Some books are pens" is logically guaranteed.', 'ଯଦି ସମସ୍ତ ବହି କଲମ ଏବଂ କିଛି କଲମ ପେନସିଲ୍ ହୁଏ, ତେବେ କେଉଁ ସିଦ୍ଧାନ୍ତ ନିଶ୍ଚିତ ସତ୍ୟ?', 'ସମସ୍ତ ବହି କଲମ ହୋଇଥିବାରୁ "କିଛି ବହି କଲମ" ନିଶ୍ଚିତ ସତ୍ୟ।'),
    qItem('rq24', 'Logical & Analytical Reasoning', 'If 8 workers build a wall in 15 days, how many days will 12 workers take at the same rate?', ['8 days', '10 days', '12 days', '14 days'], 1, 'Work = 8 × 15 = 120 worker-days → 120 / 12 = 10 days.', '୮ ଜଣ ଶ୍ରମିକ ଏକ କାନ୍ଥ ୧୫ ଦିନରେ ଗଢ଼ିଲେ, ୧୨ ଜଣ ଶ୍ରମିକ କେତେ ଦିନରେ ଗଢ଼ିବେ?', 'ମୋଟ କାମ = ୮ × ୧୫ = ୧୨୦ → ୧୨୦ / ୧୨ = ୧୦ ଦିନ।'),
    qItem('rq25', 'Logical & Analytical Reasoning', 'A 150 m long train passes a pole in 10 seconds. What is its speed in km/h?', ['45 km/h', '50 km/h', '54 km/h', '60 km/h'], 2, 'Speed = 150/10 = 15 m/s = 15 × (18/5) = 54 km/h.', '୧୫୦ ମିଟର ଲମ୍ବା ଟ୍ରେନ୍ ଏକ ଖୁଣ୍ଟକୁ ୧୦ ସେକେଣ୍ଡରେ ଅତିକ୍ରମ କଲେ ତାହାର ବେଗ କିମି/ଘଣ୍ଟାରେ କେତେ?', 'ବେଗ = ୧୫୦/୧୦ = ୧୫ ମି./ସେ. = ୧୫ × (୧୮/୫) = ୫୪ କିମି/ଘଣ୍ଟା।')
  ];

  // 4th Track: Balanced 25-MCQ Grand Mock across all 3 sections (9 + 8 + 8 = 25)
  var MIXED_GRAND_QUESTIONS = []
    .concat(ODISHA_GK_QUESTIONS.slice(0, 9))
    .concat(TEACHING_QUESTIONS.slice(0, 8))
    .concat(REASONING_QUANT_QUESTIONS.slice(0, 8))
    .map(function (q, idx) {
      return Object.assign({}, q, { id: 'mg' + (idx + 1) });
    });

  var SECTIONAL_DRILLS = [
    {
      key: 'odisha-gk',
      title: 'Odisha GK & Current Affairs',
      title_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଓ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ',
      duration_min: 20,
      default_neg: 0.25,
      badge: 'OPSC · OSSC · OSSSC · OAVS',
      questions: ODISHA_GK_QUESTIONS
    },
    {
      key: 'teaching-pedagogy',
      title: 'Teaching Aptitude & Pedagogy (OTET / OSSTET / CTET)',
      title_or: 'ଶିକ୍ଷାଦାନ ଦକ୍ଷତା ଓ ପେଡାଗୋଜି (OTET / OSSTET / CTET)',
      duration_min: 25,
      default_neg: 0,
      badge: 'OTET · OSSTET · CTET · OAVS · UGC NET',
      questions: TEACHING_QUESTIONS
    },
    {
      key: 'reasoning-quant',
      title: 'Reasoning & Quantitative Aptitude',
      title_or: 'ତର୍କଶକ୍ତି ଓ ଗାଣିତିକ ଦକ୍ଷତା (OSSC / OSSSC / SSC)',
      duration_min: 25,
      default_neg: 0.25,
      badge: 'OSSC CGL · OSSSC · SSC · RRB · Banking',
      questions: REASONING_QUANT_QUESTIONS
    },
    {
      key: 'mixed-grand',
      title: 'All-Odisha Mixed Grand Mock',
      title_or: 'ସର୍ବ-ଓଡ଼ିଶା ମିଶ୍ରିତ ମହା ମକ୍ ଟେଷ୍ଟ (୨୫ ପ୍ରଶ୍ନ)',
      duration_min: 25,
      default_neg: 0.25,
      badge: 'ALL-IN-ONE · GK + PEDAGOGY + QUANT',
      questions: MIXED_GRAND_QUESTIONS
    }
  ];

  function quantizePct(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function computeCountdownDays(dateIso, nowDate) {
    var now = (nowDate && typeof nowDate.getTime === 'function') ? nowDate : new Date();
    var istNow = new Date(now.getTime() + 330 * 60000);
    var todayUtc = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
    var parts = String(dateIso || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    var targetUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    return Math.round((targetUtc - todayUtc) / 86400000);
  }

  function computeCountdownDetails(dateIso, nowDate) {
    var now = (nowDate && typeof nowDate.getTime === 'function') ? nowDate : new Date();
    var parts = String(dateIso || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    // Target 09:00 AM IST on exam date (UTC = 03:30)
    var targetMs = Date.UTC(parts[0], parts[1] - 1, parts[2], 3, 30, 0);
    var diffMs = targetMs - now.getTime();
    var days = computeCountdownDays(dateIso, now);
    var totalHours = Math.max(0, Math.floor(diffMs / 3600000));
    var remDays = Math.floor(totalHours / 24);
    var remHours = totalHours % 24;
    return {
      days: days,
      remaining_days: remDays,
      remaining_hours: remHours,
      is_past: days !== null && days < 0
    };
  }

  function evaluateDrillAttempt(questions, answers, negativeMark) {
    var qs = Array.isArray(questions) ? questions : [];
    var ans = answers || {};
    var neg = Math.max(0, Number(negativeMark || 0));
    var correct = 0;
    var wrong = 0;
    var unanswered = 0;
    var subMap = {};
    var subOrder = [];

    for (var i = 0; i < qs.length; i += 1) {
      var q = qs[i];
      if (!q) continue;
      var st = q.subtopic || 'General';
      if (!subMap[st]) {
        subMap[st] = { subtopic: st, subtopic_or: q.subtopic_or || st, total: 0, correct: 0, wrong: 0, unanswered: 0 };
        subOrder.push(st);
      }
      subMap[st].total += 1;

      if (!Object.prototype.hasOwnProperty.call(ans, q.id) || ans[q.id] === undefined || ans[q.id] === null) {
        unanswered += 1;
        subMap[st].unanswered += 1;
      } else if (Number(ans[q.id]) === Number(q.ans)) {
        correct += 1;
        subMap[st].correct += 1;
      } else {
        wrong += 1;
        subMap[st].wrong += 1;
      }
    }

    var answered = correct + wrong;
    var rawMarks = correct;
    var penalty = Math.round(wrong * neg * 100) / 100;
    var netScore = Math.round((rawMarks - penalty) * 100) / 100;
    var accuracyPct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    var bySubtopic = subOrder.map(function (st) {
      var row = subMap[st];
      var att = row.correct + row.wrong;
      var pct = att > 0 ? Math.round((row.correct / att) * 100) : 0;
      return {
        subtopic: row.subtopic,
        subtopic_or: row.subtopic_or,
        total: row.total,
        correct: row.correct,
        wrong: row.wrong,
        unanswered: row.unanswered,
        accuracy_pct: pct,
        bar_step: quantizePct(pct)
      };
    });

    var weakest = null;
    for (var j = 0; j < bySubtopic.length; j += 1) {
      var cur = bySubtopic[j];
      if (!weakest || cur.accuracy_pct < weakest.accuracy_pct || (cur.accuracy_pct === weakest.accuracy_pct && cur.wrong > weakest.wrong)) {
        weakest = cur;
      }
    }

    return {
      total: qs.length,
      answered: answered,
      correct: correct,
      wrong: wrong,
      unanswered: unanswered,
      negative_mark: neg,
      raw_marks: rawMarks,
      penalty: penalty,
      net_score: netScore,
      accuracy_pct: accuracyPct,
      by_subtopic: bySubtopic,
      weakest_topic: weakest
    };
  }

  function loadHistory() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(HISTORY_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    return { best: {}, recent: [] };
  }

  function saveHistory(drillKey, drillTitle, res, elapsedSec) {
    var h = loadHistory();
    if (!h.best || typeof h.best !== 'object') h.best = {};
    if (!Array.isArray(h.recent)) h.recent = [];
    var prev = h.best[drillKey] !== undefined ? Number(h.best[drillKey]) : -999;
    if (res.net_score > prev) h.best[drillKey] = res.net_score;
    h.recent.unshift({
      drill_key: drillKey,
      title: drillTitle,
      net_score: res.net_score,
      total: res.total,
      accuracy_pct: res.accuracy_pct,
      negative_mark: res.negative_mark,
      elapsed_sec: elapsedSec,
      ts: Date.now()
    });
    h.recent = h.recent.slice(0, 20);
    try {
      if (win && win.localStorage) {
        win.localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
        win.localStorage.setItem(LEGACY_STATS_KEY, JSON.stringify(h.best));
      }
    } catch (_) {}
    return h;
  }

  function fmtTimer(sec) {
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function inferTrackFromTitle(title) {
    var t = String(title || '').toLowerCase();
    if (/otet|osstet|ctet|oavs|bed|b\.ed|teacher|teaching|ugc|net|itep|pedagog/.test(t)) return 'teaching-pedagogy';
    if (/cgl|ssc|rrb|bank|math|reason|quant|clerk|constable/.test(t)) return 'reasoning-quant';
    return 'odisha-gk';
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function buildFallbackIcsButton(ex) {
    var btn = el('button', 'cso-mtd-btn cso-mtd-btn--sm', '📅 Add Exam Reminder (.ics)');
    btn.type = 'button';
    btn.addEventListener('click', function () {
      var dStr = String(ex.date_iso || '').replace(/-/g, '');
      var ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Common Sense Odisha//Mock Tests Hub//EN',
        'BEGIN:VEVENT',
        'UID:' + ex.id + '@csodisha.com',
        'DTSTART;VALUE=DATE:' + dStr,
        'SUMMARY:' + ex.title + ' — Common Sense Odisha',
        'DESCRIPTION:Exam reminder from https://csodisha.com/mock-tests/',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      try {
        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = doc.createElement('a');
        a.href = url;
        a.download = ex.id + '-reminder.ics';
        doc.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      } catch (_) {}
    });
    return btn;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var state = {
      activeDrillKey: 'odisha-gk',
      negativeMark: 0.25,
      timedMode: true,
      mode: 'lobby', // 'lobby' | 'running' | 'submitted'
      currentIdx: 0,
      answers: {},
      flagged: {},
      secondsLeft: 20 * 60,
      elapsedSec: 0,
      timerId: null,
      confirmSubmit: false,
      reviewFilter: 'all', // 'all' | 'incorrect' | 'flagged'
      copiedToast: false,
      countdowns: EXAM_COUNTDOWNS.slice()
    };

    function getActiveDrill() {
      for (var i = 0; i < SECTIONAL_DRILLS.length; i += 1) {
        if (SECTIONAL_DRILLS[i].key === state.activeDrillKey) return SECTIONAL_DRILLS[i];
      }
      return SECTIONAL_DRILLS[0];
    }

    function stopTimer() {
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
    }

    function submitDrill() {
      stopTimer();
      state.confirmSubmit = false;
      var drill = getActiveDrill();
      var res = evaluateDrillAttempt(drill.questions, state.answers, state.negativeMark);
      saveHistory(drill.key, drill.title, res, state.elapsedSec);
      if (win && win.CSOStudyStreakPlanner && typeof win.CSOStudyStreakPlanner.recordPracticeActivity === 'function') {
        win.CSOStudyStreakPlanner.recordPracticeActivity({
          count: res.answered,
          correct: res.correct,
          topicKey: drill.key === 'mixed-grand' ? 'odisha-gk' : drill.key,
          topicLabel: drill.title,
          source: 'mock-tests'
        });
      }
      state.mode = 'submitted';
      state.reviewFilter = 'all';
      render();
    }

    function startDrill(drillKey) {
      stopTimer();
      if (drillKey) state.activeDrillKey = drillKey;
      var drill = getActiveDrill();
      state.mode = 'running';
      state.currentIdx = 0;
      state.answers = {};
      state.flagged = {};
      state.confirmSubmit = false;
      state.copiedToast = false;
      state.elapsedSec = 0;
      state.secondsLeft = drill.duration_min * 60;
      state.timerId = setInterval(function () {
        state.elapsedSec += 1;
        if (state.timedMode) {
          state.secondsLeft -= 1;
          var tEl = doc.getElementById('cso-mtd-timer');
          if (tEl) tEl.textContent = '⏱️ ' + fmtTimer(state.secondsLeft);
          if (state.secondsLeft <= 0) submitDrill();
        } else {
          var uEl = doc.getElementById('cso-mtd-timer');
          if (uEl) uEl.textContent = '⏱️ Practice ' + fmtTimer(state.elapsedSec);
        }
      }, 1000);
      render();
    }

    // Hydrate additional live exam/recruitment deadlines from /api/public/search-index
    if (typeof fetch === 'function') {
      fetch('/api/public/search-index', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (payload) {
          var items = payload && Array.isArray(payload.items) ? payload.items : [];
          var seen = {};
          state.countdowns.forEach(function (c) { seen[c.title.toLowerCase()] = true; });
          var added = 0;
          for (var i = 0; i < items.length && added < 3; i += 1) {
            var it = items[i];
            if (!it || !it.deadline_iso) continue;
            var dDelta = computeCountdownDays(it.deadline_iso);
            if (dDelta === null || dDelta < 0) continue;
            var ttl = String(it.title || '').trim();
            if (!ttl || seen[ttl.toLowerCase()]) continue;
            seen[ttl.toLowerCase()] = true;
            state.countdowns.push({
              id: 'live-' + String(it.slug || i),
              title: ttl.length > 52 ? (ttl.slice(0, 49) + '…') : ttl,
              date_iso: it.deadline_iso,
              end_date_iso: it.deadline_iso,
              date_label: it.deadline_iso,
              drill_key: inferTrackFromTitle(ttl),
              tag: 'Live D1 Notice',
              url: it.url || '/jobs/'
            });
            added += 1;
          }
          if (added > 0 && state.mode === 'lobby') render();
        })
        .catch(function () {});
    }

    function render() {
      var drill = getActiveDrill();
      var hist = loadHistory();
      var bestMap = hist.best || {};
      var wrap = el('div', 'cso-mtd-wrap');
      wrap.setAttribute('data-cso-mock-hub', 'v407');

      // Section A — Live Exam-Day Countdown Strip (IST)
      var cdSec = el('section', 'cso-mtd-card');
      cdSec.setAttribute('aria-label', 'Live Exam-Day Countdowns');
      cdSec.appendChild(el('h2', 'cso-mtd-title', '⏳ Live Exam-Day Countdown Strip (IST · Asia/Kolkata)'));
      var cdGrid = el('div', 'cso-mtd-cd-grid');
      state.countdowns.forEach(function (ex) {
        var dt = computeCountdownDetails(ex.date_iso);
        var card = el('div', 'cso-mtd-cd-card');
        card.appendChild(el('span', 'cso-mtd-tag', ex.tag));
        card.appendChild(el('div', 'cso-mtd-cd-name', ex.title));
        var cdTxt = !dt
          ? (ex.date_label || ex.date_iso)
          : (dt.is_past
            ? ('Completed · ' + (ex.date_label || ex.date_iso))
            : (dt.remaining_days + 'd ' + dt.remaining_hours + 'h left · ' + (ex.date_label || ex.date_iso)));
        card.appendChild(el('div', 'cso-mtd-cd-days', cdTxt));

        var actions = el('div', 'cso-mtd-cd-actions');
        if (win.CSOCalendarExport && typeof win.CSOCalendarExport.createCalendarButton === 'function') {
          var calBtn = win.CSOCalendarExport.createCalendarButton({
            title: ex.title,
            startDate: ex.date_iso,
            endDate: ex.end_date_iso || ex.date_iso,
            description: 'Exam-day reminder from Common Sense Odisha Mock Test Hub',
            url: 'https://csodisha.com' + (ex.url || '/mock-tests/'),
            label: '📅 Add Exam Reminder (.ics)',
            className: 'cso-mtd-btn cso-mtd-btn--sm'
          });
          actions.appendChild(calBtn);
        } else {
          actions.appendChild(buildFallbackIcsButton(ex));
        }
        var pracBtn = el('button', 'cso-mtd-btn cso-mtd-btn--sm cso-mtd-btn--primary', 'Practice Target Track →');
        pracBtn.type = 'button';
        pracBtn.addEventListener('click', function () { startDrill(ex.drill_key); });
        actions.appendChild(pracBtn);

        card.appendChild(actions);
        cdGrid.appendChild(card);
      });
      cdSec.appendChild(cdGrid);
      wrap.appendChild(cdSec);

      // Section B — Mock Test Series Launcher, Negative-Marking & Timer Controls
      var selSec = el('section', 'cso-mtd-card');
      selSec.setAttribute('aria-label', 'Timed 25-MCQ Mock Test Series');
      var selHead = el('div', 'cso-mtd-head');
      selHead.appendChild(el('h2', 'cso-mtd-title', '🎯 Timed 25-MCQ Sectional & Grand Mock Series'));
      selSec.appendChild(selHead);

      var ctrlStack = el('div', 'cso-mtd-ctrl-stack');
      var negWrap = el('div', 'cso-mtd-neg-group');
      negWrap.setAttribute('role', 'group');
      negWrap.setAttribute('aria-label', 'Negative marking rule');
      negWrap.appendChild(el('span', 'cso-mtd-neg-lbl', 'Negative Marking:'));
      NEGATIVE_OPTIONS.forEach(function (opt) {
        var nb = el('button', 'cso-mtd-pill' + (state.negativeMark === opt.value ? ' is-active' : ''), opt.label);
        nb.type = 'button';
        nb.setAttribute('data-mtd-neg', String(opt.value));
        nb.setAttribute('aria-pressed', state.negativeMark === opt.value ? 'true' : 'false');
        nb.addEventListener('click', function () {
          state.negativeMark = opt.value;
          render();
        });
        negWrap.appendChild(nb);
      });

      var timerWrap = el('div', 'cso-mtd-neg-group');
      timerWrap.setAttribute('role', 'group');
      timerWrap.setAttribute('aria-label', 'Timer mode');
      timerWrap.appendChild(el('span', 'cso-mtd-neg-lbl', 'Timer Mode:'));
      [
        { timed: true, label: '⏱️ Timed Exam Mode (Auto-Submit at 00:00)' },
        { timed: false, label: '📘 Untimed Practice Mode' }
      ].forEach(function (tm) {
        var tb = el('button', 'cso-mtd-pill' + (state.timedMode === tm.timed ? ' is-active' : ''), tm.label);
        tb.type = 'button';
        tb.setAttribute('data-mtd-timer-mode', tm.timed ? 'timed' : 'untimed');
        tb.setAttribute('aria-pressed', state.timedMode === tm.timed ? 'true' : 'false');
        tb.addEventListener('click', function () {
          state.timedMode = tm.timed;
          render();
        });
        timerWrap.appendChild(tb);
      });
      ctrlStack.append(negWrap, timerWrap);
      selSec.appendChild(ctrlStack);

      var drillCards = el('div', 'cso-mtd-drill-grid');
      SECTIONAL_DRILLS.forEach(function (d) {
        var act = d.key === state.activeDrillKey;
        var dc = el('article', 'cso-mtd-drill-card' + (act ? ' is-active' : ''));
        dc.appendChild(el('span', 'cso-mtd-tag', d.badge));
        dc.appendChild(el('h3', 'cso-mtd-drill-name', d.title));
        dc.appendChild(el('div', 'cso-mtd-drill-or', d.title_or));
        var bestTxt = bestMap[d.key] !== undefined ? (' · 🏆 Best: ' + Number(bestMap[d.key]).toFixed(2) + '/25') : '';
        dc.appendChild(el('div', 'cso-mtd-drill-meta', '25 MCQs · ' + d.duration_min + ' Mins' + bestTxt));
        var launchBtn = el('button', 'cso-mtd-btn cso-mtd-btn--primary', act && state.mode === 'running' ? '↻ Restart 25-MCQ Drill' : '▶ Start 25-MCQ Drill');
        launchBtn.type = 'button';
        launchBtn.addEventListener('click', function () { startDrill(d.key); });
        dc.appendChild(launchBtn);
        drillCards.appendChild(dc);
      });
      selSec.appendChild(drillCards);
      wrap.appendChild(selSec);

      // Section C — Exam-Hall Interface & 1–25 Question Palette
      if (state.mode === 'running') {
        var q = drill.questions[state.currentIdx];
        var runSec = el('section', 'cso-mtd-card cso-mtd-runner');
        runSec.setAttribute('aria-label', 'Active 25-MCQ Exam Stage');

        var rHead = el('div', 'cso-mtd-head');
        rHead.appendChild(el('h3', 'cso-mtd-title', drill.title + ' — Q' + (state.currentIdx + 1) + ' / ' + drill.questions.length));
        var rRight = el('div', 'cso-mtd-neg-group');
        var timerLabel = state.timedMode ? ('⏱️ ' + fmtTimer(state.secondsLeft)) : ('⏱️ Practice ' + fmtTimer(state.elapsedSec));
        var timerPill = el('span', 'cso-mtd-timer', timerLabel);
        timerPill.id = 'cso-mtd-timer';
        rRight.appendChild(timerPill);
        var subBtn = el('button', 'cso-mtd-btn cso-mtd-btn--primary', '✓ Submit Test');
        subBtn.type = 'button';
        subBtn.addEventListener('click', function () {
          state.confirmSubmit = !state.confirmSubmit;
          render();
        });
        rRight.appendChild(subBtn);
        rHead.appendChild(rRight);
        runSec.appendChild(rHead);

        if (state.confirmSubmit) {
          var ansCount = Object.keys(state.answers).length;
          var confBox = el('div', 'cso-mtd-confirm');
          confBox.appendChild(el('span', 'cso-mtd-confirm-txt', 'Submit now? Answered: ' + ansCount + ' / ' + drill.questions.length + ' · Unattempted: ' + (drill.questions.length - ansCount)));
          var confYes = el('button', 'cso-mtd-btn cso-mtd-btn--primary', 'Confirm & View Scorecard');
          confYes.type = 'button';
          confYes.addEventListener('click', submitDrill);
          var confNo = el('button', 'cso-mtd-btn', 'Continue Test');
          confNo.type = 'button';
          confNo.addEventListener('click', function () { state.confirmSubmit = false; render(); });
          confBox.append(confYes, confNo);
          runSec.appendChild(confBox);
        }

        runSec.appendChild(el('span', 'cso-mtd-tag', 'Topic: ' + q.subtopic + ' (' + q.subtopic_or + ') · +1.00 / −' + state.negativeMark.toFixed(2)));
        runSec.appendChild(el('p', 'cso-mtd-q-text', (state.currentIdx + 1) + '. ' + q.q));
        if (q.q_or) runSec.appendChild(el('p', 'cso-mtd-q-or', q.q_or));

        var optsBox = el('div', 'cso-mtd-opts');
        optsBox.setAttribute('role', 'radiogroup');
        optsBox.setAttribute('aria-label', 'Question ' + (state.currentIdx + 1) + ' options');
        var chosen = Object.prototype.hasOwnProperty.call(state.answers, q.id) ? state.answers[q.id] : -1;
        q.opts.forEach(function (oTxt, oi) {
          var ob = el('button', 'cso-mtd-opt' + (chosen === oi ? ' is-selected' : ''), String.fromCharCode(65 + oi) + '. ' + oTxt);
          ob.type = 'button';
          ob.setAttribute('role', 'radio');
          ob.setAttribute('aria-checked', chosen === oi ? 'true' : 'false');
          ob.addEventListener('click', function () {
            state.answers[q.id] = oi;
            render();
          });
          optsBox.appendChild(ob);
        });
        runSec.appendChild(optsBox);

        var navRow = el('div', 'cso-mtd-nav-row');
        var prevBtn = el('button', 'cso-mtd-btn', '← Previous');
        prevBtn.type = 'button';
        prevBtn.disabled = state.currentIdx === 0;
        prevBtn.addEventListener('click', function () { state.currentIdx -= 1; render(); });

        var flagBtn = el('button', 'cso-mtd-btn', state.flagged[q.id] ? '⚑ Marked for Review' : '⚐ Mark for Review');
        flagBtn.type = 'button';
        flagBtn.addEventListener('click', function () {
          state.flagged[q.id] = !state.flagged[q.id];
          render();
        });

        var clrBtn = el('button', 'cso-mtd-btn', 'Clear Response');
        clrBtn.type = 'button';
        clrBtn.addEventListener('click', function () {
          delete state.answers[q.id];
          render();
        });

        var nextBtn = el('button', 'cso-mtd-btn cso-mtd-btn--primary', state.currentIdx < drill.questions.length - 1 ? 'Save & Next →' : 'Review & Submit ✓');
        nextBtn.type = 'button';
        nextBtn.addEventListener('click', function () {
          if (state.currentIdx < drill.questions.length - 1) {
            state.currentIdx += 1;
            render();
          } else {
            state.confirmSubmit = true;
            render();
          }
        });
        navRow.append(prevBtn, flagBtn, clrBtn, nextBtn);
        runSec.appendChild(navRow);

        var pal = el('div', 'cso-mtd-palette');
        pal.setAttribute('aria-label', 'Question palette 1 to 25');
        drill.questions.forEach(function (pq, pi) {
          var isAns = Object.prototype.hasOwnProperty.call(state.answers, pq.id);
          var isFlg = Boolean(state.flagged[pq.id]);
          var cls = 'cso-mtd-pal-btn' + (pi === state.currentIdx ? ' is-current' : '') + (isAns ? ' is-answered' : '') + (isFlg ? ' is-flagged' : '');
          var pb = el('button', cls, String(pi + 1));
          pb.type = 'button';
          pb.setAttribute('aria-label', 'Question ' + (pi + 1) + (isAns ? ' answered' : ' unanswered') + (isFlg ? ' marked for review' : ''));
          pb.addEventListener('click', function () { state.currentIdx = pi; render(); });
          pal.appendChild(pb);
        });
        runSec.appendChild(pal);
        wrap.appendChild(runSec);
      } else if (state.mode === 'submitted') {
        // Section D — Instant Scorecard, Negative-Marking Ledger & Topic-Wise Breakdown
        var res = evaluateDrillAttempt(drill.questions, state.answers, state.negativeMark);
        var sumSec = el('section', 'cso-mtd-card cso-mtd-scorecard');
        sumSec.setAttribute('aria-label', 'Mock Test Scorecard and Topic-Wise Accuracy');

        var sHead = el('div', 'cso-mtd-head');
        sHead.appendChild(el('h3', 'cso-mtd-title', '📊 Scorecard & Topic-Wise Accuracy — ' + drill.title));
        var sBtns = el('div', 'cso-mtd-neg-group');
        var copyBtn = el('button', 'cso-mtd-btn', state.copiedToast ? '✓ Scorecard Copied' : '📋 Copy Scorecard');
        copyBtn.type = 'button';
        copyBtn.addEventListener('click', function () {
          var summaryText = [
            'CS Odisha Mock Test Scorecard — ' + drill.title,
            'Net Score: ' + res.net_score.toFixed(2) + ' / ' + res.total.toFixed(2) + ' (Neg −' + res.negative_mark.toFixed(2) + ')',
            'Positive: +' + res.raw_marks + ' | Negative Deducted: −' + res.penalty.toFixed(2) + ' | Unattempted: ' + res.unanswered,
            'Accuracy: ' + res.accuracy_pct + '% | Time Taken: ' + fmtTimer(state.elapsedSec),
            'Practice free at https://csodisha.com/mock-tests/'
          ].join('\n');
          if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
            win.navigator.clipboard.writeText(summaryText).catch(function () {});
          }
          state.copiedToast = true;
          render();
        });
        var printBtn = el('button', 'cso-mtd-btn', '🖨️ Print Clean Sheet');
        printBtn.type = 'button';
        printBtn.addEventListener('click', function () { if (win && typeof win.print === 'function') win.print(); });
        var retakeBtn = el('button', 'cso-mtd-btn cso-mtd-btn--primary', '↻ Retake 25-MCQ Drill');
        retakeBtn.type = 'button';
        retakeBtn.addEventListener('click', function () { startDrill(drill.key); });
        sBtns.append(copyBtn, printBtn, retakeBtn);
        sHead.appendChild(sBtns);
        sumSec.appendChild(sHead);

        var kpis = el('div', 'cso-mtd-kpis');
        [
          ['Net Score (Neg −' + res.negative_mark.toFixed(2) + ')', res.net_score.toFixed(2) + ' / ' + res.total.toFixed(2)],
          ['Positive / Deducted', '+' + res.raw_marks + ' / −' + res.penalty.toFixed(2)],
          ['Accuracy', res.accuracy_pct + '%'],
          ['Unattempted / Time', res.unanswered + ' · ' + fmtTimer(state.elapsedSec)]
        ].forEach(function (pair) {
          var k = el('div', 'cso-mtd-kpi');
          k.append(el('span', 'cso-mtd-kpi-k', pair[0]), el('b', 'cso-mtd-kpi-v', pair[1]));
          kpis.appendChild(k);
        });
        sumSec.appendChild(kpis);

        if (res.weakest_topic) {
          var weakBox = el('div', 'cso-mtd-weak-callout');
          weakBox.appendChild(el('strong', '', '🎯 Revision Priority (Weakest Topic): ' + res.weakest_topic.subtopic + ' (' + res.weakest_topic.accuracy_pct + '% accuracy)'));
          weakBox.appendChild(el('span', '', ' — Review the solutions below and revisit /study-library/ notes for this sub-topic before your next attempt.'));
          sumSec.appendChild(weakBox);
        }

        sumSec.appendChild(el('h4', 'cso-mtd-subhead', 'Topic-Wise Accuracy Breakdown'));
        var subBars = el('div', 'cso-mtd-sub-bars');
        res.by_subtopic.forEach(function (st) {
          var row = el('div', 'cso-vfv-bar-row');
          var meta = el('div', 'cso-vfv-bar-meta');
          meta.append(
            el('span', 'cso-vfv-bar-label', st.subtopic + ' (' + st.subtopic_or + ')'),
            el('span', 'cso-vfv-bar-val', st.correct + '✓ · ' + st.wrong + '✕ · ' + st.unanswered + ' skipped (' + st.accuracy_pct + '%)')
          );
          var track = el('div', 'cso-vfv-bar-track');
          track.appendChild(el('div', 'cso-vfv-bar-fill cso-vfv-bar--w' + st.bar_step));
          row.append(meta, track);
          subBars.appendChild(row);
        });
        sumSec.appendChild(subBars);

        var revHead = el('div', 'cso-mtd-head');
        revHead.appendChild(el('h4', 'cso-mtd-subhead', '📋 Bilingual Solution & Explanation Review'));
        var filterGroup = el('div', 'cso-mtd-neg-group');
        [
          { key: 'all', label: 'All Questions (' + drill.questions.length + ')' },
          { key: 'incorrect', label: 'Incorrect Only (' + res.wrong + ')' },
          { key: 'flagged', label: 'Marked for Review (' + Object.keys(state.flagged).filter(function (k) { return state.flagged[k]; }).length + ')' }
        ].forEach(function (flt) {
          var fb = el('button', 'cso-mtd-pill' + (state.reviewFilter === flt.key ? ' is-active' : ''), flt.label);
          fb.type = 'button';
          fb.addEventListener('click', function () { state.reviewFilter = flt.key; render(); });
          filterGroup.appendChild(fb);
        });
        revHead.appendChild(filterGroup);
        sumSec.appendChild(revHead);

        var revList = el('div', 'cso-mtd-review');
        var shown = 0;
        drill.questions.forEach(function (rq, ri) {
          var uAns = Object.prototype.hasOwnProperty.call(state.answers, rq.id) ? state.answers[rq.id] : -1;
          var ok = uAns === rq.ans;
          if (state.reviewFilter === 'incorrect' && (ok || uAns === -1)) return;
          if (state.reviewFilter === 'flagged' && !state.flagged[rq.id]) return;
          shown += 1;
          var item = el('div', 'cso-mtd-rev-item' + (ok ? ' is-ok' : ' is-miss'));
          item.appendChild(el('div', 'cso-mtd-rev-q', (ri + 1) + '. [' + rq.subtopic + '] ' + rq.q));
          if (rq.q_or) item.appendChild(el('div', 'cso-mtd-rev-or', rq.q_or));
          item.appendChild(el('div', 'cso-mtd-rev-a',
            'Correct: ' + String.fromCharCode(65 + rq.ans) + '. ' + rq.opts[rq.ans] +
            (uAns === -1 ? ' · Your Answer: Unattempted' : (' · Your Answer: ' + String.fromCharCode(65 + uAns) + (ok ? ' ✓' : ' ✕')))));
          item.appendChild(el('div', 'cso-mtd-rev-exp', rq.exp));
          if (rq.exp_or) item.appendChild(el('div', 'cso-mtd-rev-exp', rq.exp_or));
          revList.appendChild(item);
        });
        if (shown === 0) {
          revList.appendChild(el('div', 'cso-mtd-rev-item', 'No questions match this filter — great work!'));
        }
        sumSec.appendChild(revList);
        wrap.appendChild(sumSec);
      }

      container.replaceChildren(wrap);
    }

    render();
    return { startDrill: startDrill, submitDrill: submitDrill };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-mock-tests-hub-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v407',
    HISTORY_KEY: HISTORY_KEY,
    NEGATIVE_OPTIONS: NEGATIVE_OPTIONS,
    EXAM_COUNTDOWNS: EXAM_COUNTDOWNS,
    SECTIONAL_DRILLS: SECTIONAL_DRILLS,
    computeCountdownDays: computeCountdownDays,
    computeCountdownDetails: computeCountdownDetails,
    evaluateDrillAttempt: evaluateDrillAttempt,
    mount: mount
  };
});
