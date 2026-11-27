/**
 * Common Sense Odisha — Interactive Odisha Competitive Exam Current Affairs
 * & GK Flashcard Spaced-Repetition Deck (/current-affairs/ & /mock-tests/, v443)
 * 30 curated bilingual (EN + ଓଡ଼ିଆ) flashcards across 5 Odisha domains (6 cards each)
 * powered by a 3-Box Leitner Spaced-Repetition engine persisted in localStorage.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * keyboard shortcuts (Space/1/2/3); discrete CSS bars (cso-vfv-bar--w*); 4-theme var(--cso-*) tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOGkFlashcardDeck = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOGkFlashcardDeck = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v443';
  var ROOT_ID = 'cso-gk-flashcard-deck-root';
  var STORAGE_KEY = 'cso_gk_flashcard_leitner_v1';

  var DOMAINS = [
    { id: 'all', en: 'All 30 Cards', or: 'ସବୁ 30 କାର୍ଡ' },
    { id: 'polity', en: 'Odisha Polity & Admin', or: 'ଓଡ଼ିଶା ରାଜନୀତି ଓ ପ୍ରଶାସନ' },
    { id: 'geography', en: 'Geography & Wildlife', or: 'ଭୂଗୋଳ ଓ ବନ୍ୟଜୀବ' },
    { id: 'economy', en: 'Economy & GI Tags', or: 'ଅର୍ଥନୀତି ଓ GI ଟ୍ୟାଗ୍' },
    { id: 'schemes', en: 'Welfare Schemes', or: 'ଜନକଲ୍ୟାଣ ଯୋଜନା' },
    { id: 'history', en: 'History, Art & Awards', or: 'ଇତିହାସ, କଳା ଓ ପୁରସ୍କାର' }
  ];

  var FLASHCARD_DECK = [
    // 1. Odisha Polity, Governance & Administration (6 cards)
    { id: 'pol-1', domain: 'polity', diff: 'Core', qEn: 'How many Lok Sabha and Rajya Sabha seats represent Odisha in Parliament?', qOr: 'ସଂସଦରେ ଓଡ଼ିଶାର ଲୋକସଭା ଓ ରାଜ୍ୟସଭା ଆସନ ସଂଖ୍ୟା କେତେ?', aEn: '21 Lok Sabha seats and 10 Rajya Sabha seats.', aOr: '୨୧ଟି ଲୋକସଭା ଓ ୧୦ଟି ରାଜ୍ୟସଭା ଆସନ।', tip: 'OPSC/OSSC Frequent: Remember 147 MLA, 21 MP (LS), 10 MP (RS).' },
    { id: 'pol-2', domain: 'polity', diff: 'Core', qEn: 'What is the total strength of the Odisha Legislative Assembly (Vidhan Sabha)?', qOr: 'ଓଡ଼ିଶା ବିଧାନସଭାର ମୋଟ ସଦସ୍ୟ ସଂଖ୍ୟା କେତେ?', aEn: '147 elected members (Unicameral Legislature).', aOr: '୧୪୭ ଜଣ ନିର୍ବାଚିତ ବିଧାୟକ (ଏକକକ୍ଷୀୟ ବିଧାନସଭା)।', tip: 'Includes 24 SC and 33 ST reserved Assembly constituencies.' },
    { id: 'pol-3', domain: 'polity', diff: 'Core', qEn: 'How many districts, revenue divisions, and blocks constitute Odisha?', qOr: 'ଓଡ଼ିଶାରେ କେତୋଟି ଜିଲ୍ଲା, ରାଜସ୍ୱ ଡିଭିଜନ୍ ଓ ବ୍ଲକ୍ ଅଛି?', aEn: '30 Districts, 3 Revenue Divisions (Central-Cuttack, Northern-Sambalpur, Southern-Berhampur), 58 Sub-Divisions & 314 Blocks.', aOr: '୩୦ ଜିଲ୍ଲା, ୩ ରାଜସ୍ୱ ଡିଭିଜନ୍, ୫୮ ସବ୍-ଡିଭିଜନ୍ ଓ ୩୧୪ ବ୍ଲକ୍।', tip: '10 districts in each of the 3 Revenue Divisions.' },
    { id: 'pol-4', domain: 'polity', diff: 'Medium', qEn: 'When was the High Court of Orissa formally inaugurated and where is its seat?', qOr: 'ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ କେବେ ଓ କେଉଁଠାରେ ପ୍ରତିଷ୍ଠିତ ହୋଇଥିଲା?', aEn: 'Inaugurated on 26 July 1948 at Cuttack (First Chief Justice: Justice Bira Kishore Ray).', aOr: '୨୬ ଜୁଲାଇ ୧୯୪୮ ରେ କଟକଠାରେ ପ୍ରତିଷ୍ଠିତ।', tip: 'Justice Bira Kishore Ray is a staple OPSC/OSSC GK question.' },
    { id: 'pol-5', domain: 'polity', diff: 'Medium', qEn: 'Which constitutional schedule governs PESA and Odisha’s Scheduled (TSP) Areas?', qOr: 'ଓଡ଼ିଶାର ଅନୁସୂଚିତ ଅଞ୍ଚଳ ଓ PESA କେଉଁ ସମ୍ବିଧାନ ଅନୁସୂଚୀ ଅଧୀନରେ ଆସେ?', aEn: 'Fifth Schedule of the Indian Constitution (PESA Act, 1996 applies to 118+ Scheduled blocks across Odisha).', aOr: 'ଭାରତୀୟ ସମ୍ବିଧାନର ପଞ୍ଚମ ଅନୁସୂଚୀ (PESA ଆଇନ ୧୯୯୬)।', tip: 'Odisha has 9 fully Scheduled districts + 4 partially Scheduled districts.' },
    { id: 'pol-6', domain: 'polity', diff: 'High', qEn: 'Under which Articles are the Odisha State Election Commission & State Finance Commission constituted?', qOr: 'ରାଜ୍ୟ ନିର୍ବାଚନ ଆୟୋଗ ଓ ରାଜ୍ୟ ଅର୍ଥ ଆୟୋଗ କେଉଁ ଅନୁଚ୍ଛେଦ ଅଧୀନରେ ଗଠିତ?', aEn: 'Article 243K (State Election Commission) and Article 243I (State Finance Commission) via 73rd Amendment.', aOr: 'ଅନୁଚ୍ଛେଦ 243K (ନିର୍ବାଚନ ଆୟୋଗ) ଓ 243I (ଅର୍ଥ ଆୟୋଗ)।', tip: '243K conducts Panchayat/ULB polls; ECI (Art 324) conducts Assembly/LS polls.' },

    // 2. Odisha Geography, Rivers, Wildlife & Biosphere (6 cards)
    { id: 'geo-1', domain: 'geography', diff: 'Core', qEn: 'Which river is the longest in Odisha and hosts the Hirakud Dam?', qOr: 'ଓଡ଼ିଶାର ଦୀର୍ଘତମ ନଦୀ ଓ ହୀରାକୁଦ ବନ୍ଧ କେଉଁ ନଦୀରେ ଅବସ୍ଥିତ?', aEn: 'Mahanadi River (~851 km total, 494 km in Odisha); Hirakud Dam (Sambalpur) is the longest earthen dam in the world.', aOr: 'ମହାନଦୀ; ହୀରାକୁଦ ବନ୍ଧ (ସମ୍ବଲପୁର) ବିଶ୍ୱର ଦୀର୍ଘତମ ମାଟି ବନ୍ଧ।', tip: 'Hirakud was inaugurated by PM Jawaharlal Nehru on 13 Jan 1957.' },
    { id: 'geo-2', domain: 'geography', diff: 'Core', qEn: 'When was Chilika Lake designated as India’s first Ramsar Wetland of International Importance?', qOr: 'ଚିଲିକା ହ୍ରଦ କେବେ ଭାରତର ପ୍ରଥମ ରାମସାର ଆର୍ଦ୍ରଭୂମି ମାନ୍ୟତା ପାଇଲା?', aEn: '1 October 1981 — Asia’s largest brackish water lagoon, home to Irrawaddy Dolphins.', aOr: '୧ ଅକ୍ଟୋବର ୧୯୮୧ — ଏସିଆର ସର୍ବବୃହତ ଲବଣାକ୍ତ ହ୍ରଦ।', tip: 'Odisha has 6 Ramsar sites including Bhitarkanika, Satkosia, Tampara, Hirakud & Ansupa.' },
    { id: 'geo-3', domain: 'geography', diff: 'Core', qEn: 'Name Odisha’s two National Parks and their signature wildlife species.', qOr: 'ଓଡ଼ିଶାର ଦୁଇଟି ଜାତୀୟ ଉଦ୍ୟାନ ଓ ସେମାନଙ୍କର ପ୍ରମୁଖ ବନ୍ୟପ୍ରାଣୀ କ’ଣ?', aEn: 'Similipal National Park (Mayurbhanj — Melanistic Royal Bengal Tigers, Biosphere Reserve) & Bhitarkanika (Kendrapara — Saltwater Crocodiles & Mangroves).', aOr: 'ଶିମିଳିପାଳ (ମୟୂରଭଞ୍ଜ — କଳା ବାଘ) ଓ ଭିତରକନିକା (କେନ୍ଦ୍ରାପଡ଼ା — ବଉଳା କୁମ୍ଭୀର)।', tip: 'Similipal was added to UNESCO World Network of Biosphere Reserves in 2009.' },
    { id: 'geo-4', domain: 'geography', diff: 'Core', qEn: 'Which is the highest mountain peak in Odisha and where is it located?', qOr: 'ଓଡ଼ିଶାର ସର୍ବୋଚ୍ଚ ପର୍ବତ ଶୃଙ୍ଗ କେଉଁଟି ଓ କେଉଁ ଜିଲ୍ଲାରେ ଅବସ୍ଥିତ?', aEn: 'Deomali Peak (1,672 metres) in the Chandragiri-Pottangi subrange of Eastern Ghats, Koraput district.', aOr: 'ଦେଓମାଳି ଶୃଙ୍ଗ (୧,୬୭୨ ମିଟର), କୋରାପୁଟ ଜିଲ୍ଲା।', tip: 'Mahendragiri (1,501 m, Gajapati) is the second highest peak.' },
    { id: 'geo-5', domain: 'geography', diff: 'Medium', qEn: 'Which marine sanctuary in Odisha is the world’s largest mass-nesting rookery for Olive Ridley turtles?', qOr: 'ଅଲିଭ୍ ରିଡଲେ କଇଁଛଙ୍କ ବିଶ୍ୱର ସର୍ବବୃହତ ଅଣ୍ଡାଦାନ ସ୍ଥଳ ଓଡ଼ିଶାର କେଉଁଠାରେ ଅଛି?', aEn: 'Gahirmatha Marine Sanctuary (Kendrapara), along with Rushikulya (Ganjam) and Devi river mouths.', aOr: 'ଗହୀରମଥା ସାମୁଦ୍ରିକ ଅଭୟାରଣ୍ୟ (କେନ୍ଦ୍ରାପଡ଼ା) ଓ ଋଷିକୂଲ୍ୟା ମୁହାଣ।', tip: 'Mass nesting phenomenon is called "Arribada".' },
    { id: 'geo-6', domain: 'geography', diff: 'Medium', qEn: 'What is the approximate length of Odisha’s coastline along the Bay of Bengal?', qOr: 'ବଙ୍ଗୋପସାଗର କୂଳରେ ଓଡ଼ିଶାର ଉପକୂଳ ରେଖାର ଦୈର୍ଘ୍ୟ କେତେ?', aEn: 'Approximately 480 km (485 km in recent surveys) spanning 6 coastal districts from Balasore to Ganjam.', aOr: 'ପ୍ରାୟ ୪୮୦ କିଲୋମିଟର (ବାଲେଶ୍ୱର ରୁ ଗଞ୍ଜାମ ପର୍ଯ୍ୟନ୍ତ ୬ ଉପକୂଳ ଜିଲ୍ଲା)।', tip: 'Major mineral belts: Sukinda (Chromite), Keonjhar/Sundargarh (Iron Ore), Koraput/Rayagada (Bauxite).' },

    // 3. Odisha Economy, Budget & Industrial Corridors (6 cards)
    { id: 'eco-1', domain: 'economy', diff: 'Core', qEn: 'Which is Odisha’s only Major Port under the Central Government and which is the major private deep-water port?', qOr: 'ଓଡ଼ିଶାର ଏକମାତ୍ର କେନ୍ଦ୍ରୀୟ ବୃହତ ବନ୍ଦର ଓ ପ୍ରମୁଖ ଘରୋଇ ବନ୍ଦର କେଉଁଟି?', aEn: 'Paradip Port (Jagatsinghpur — Major Port) and Dhamra Port (Bhadrak — deep-water port) + Gopalpur Port (Ganjam).', aOr: 'ପାରାଦୀପ ବନ୍ଦର (ଜଗତସିଂହପୁର) ଓ ଧାମରା ବନ୍ଦର (ଭଦ୍ରକ)।', tip: 'Paradip Port was commissioned in 1966 and leads India in cargo throughput.' },
    { id: 'eco-2', domain: 'economy', diff: 'Core', qEn: 'Which industrial complex in Jajpur district is known as Odisha’s premier integrated steel hub?', qOr: 'ଯାଜପୁର ଜିଲ୍ଲାର କେଉଁ ଶିଳ୍ପ କେନ୍ଦ୍ର ଓଡ଼ିଶାର ପ୍ରମୁଖ ଇସ୍ପାତ ହବ୍ ଭାବରେ ପରିଚିତ?', aEn: 'Kalinganagar Industrial Complex (Jajpur), hosting major steel plants near Sukinda chromite belt.', aOr: 'କଳିଙ୍ଗନଗର ଶିଳ୍ପ କେନ୍ଦ୍ର (ଯାଜପୁର)।', tip: 'Odisha contributes over 25% of India’s crude steel capacity.' },
    { id: 'eco-3', domain: 'economy', diff: 'Medium', qEn: 'What are the key focus sectors of the Odisha Semiconductor Manufacturing & Fabless Policy?', qOr: 'ଓଡ଼ିଶା ସେମିକଣ୍ଡକ୍ଟର ଓ ଆଇଟି ନୀତିର ମୁଖ୍ୟ ଲକ୍ଷ୍ୟ କ’ଣ?', aEn: 'OSAT/ATMP chip packaging, compound semiconductors (SiC), electronics system design (InfoValley Bhubaneswar) & capital subsidies.', aOr: 'ଚିପ୍ ପ୍ୟାକେଜିଂ (OSAT), ଇନଫୋଭ୍ୟାଲି ଭୁବନେଶ୍ୱରରେ ସେମିକଣ୍ଡକ୍ଟର ଓ ଆଇଟି ନିବେଶ।', tip: 'InfoValley-II (Bhubaneswar) is Odisha’s flagship EMC 2.0 electronics cluster.' },
    { id: 'eco-4', domain: 'economy', diff: 'Medium', qEn: 'Which Odisha agricultural/food product received GI Tag in 2019 as "Odisha Rasagola" and which tribal spice from Kandhamal holds a GI Tag?', qOr: 'ଓଡ଼ିଶାର କେଉଁ ମିଠା ଓ କନ୍ଧମାଳର କେଉଁ ମସଲା GI ଟ୍ୟାଗ୍ ପାଇଛି?', aEn: 'Odisha Rasagola (GI Tag July 2019) and Kandhamal Haladi (Turmeric, GI Tag April 2019).', aOr: 'ଓଡ଼ିଶା ରସଗୋଲା (୨୦୧୯) ଓ କନ୍ଧମାଳ ହଳଦୀ (୨୦୧୯)।', tip: 'Also remember Kai Chutney (Mayurbhanj Red Weaver Ant) & Kapadaganda Shawl (Rayagada) GI tags (2024).' },
    { id: 'eco-5', domain: 'economy', diff: 'Medium', qEn: 'Name 4 famous GI-tagged handloom weaves of Odisha.', qOr: 'ଓଡ଼ିଶାର ୪ଟି ପ୍ରସିଦ୍ଧ GI-ଟ୍ୟାଗ୍ ହସ୍ତତନ୍ତ ଶାଢ଼ୀ / ବସ୍ତ୍ରର ନାମ କ’ଣ?', aEn: 'Sambalpuri Bandha, Kotpad Handloom (Koraput), Berhampur Patta (Phoda Kumbha), Bomkai, Gopalpur Tussar & Khandua.', aOr: 'ସମ୍ବଲପୁରୀ ବାନ୍ଧ, କୋଟପାଡ଼ ହସ୍ତତନ୍ତ, ବ୍ରହ୍ମପୁର ପାଟ ଓ ବୋମକାଇ।', tip: 'Kotpad fabric uses organic Aal (Indian Madder) root dye.' },
    { id: 'eco-6', domain: 'economy', diff: 'High', qEn: 'What is Odisha’s FRBM Act fiscal deficit target benchmark in State Budgets?', qOr: 'ଓଡ଼ିଶା ରାଜ୍ୟ ବଜେଟ୍ ରେ FRBM ଆଇନ ଅନୁଯାୟୀ ବିତ୍ତୀୟ ନିଅଣ୍ଟ ସୀମା କେତେ?', aEn: 'Within 3.0%–3.5% of GSDP while maintaining a Revenue Surplus and Debt-to-GSDP well below 25%.', aOr: 'GSDP ର 3.0%–3.5% ମଧ୍ୟରେ ବିତ୍ତୀୟ ନିଅଣ୍ଟ ଓ ରାଜସ୍ୱ ବଳକା।', tip: 'Odisha is consistently ranked among India’s most fiscally prudent states.' },

    // 4. Odisha Welfare Schemes & Initiatives (6 cards)
    { id: 'sch-1', domain: 'schemes', diff: 'Core', qEn: 'What is the annual financial assistance provided under Odisha’s Subhadra Yojana?', qOr: 'ଓଡ଼ିଶାର ସୁଭଦ୍ରା ଯୋଜନା ଅଧୀନରେ ବାର୍ଷିକ କେତେ ଟଙ୍କା ସହାୟତା ମିଳେ?', aEn: '₹10,000 per year (₹5,000 on Rakhi Purnima + ₹5,000 on International Women’s Day) for 5 years (₹50,000 total) to eligible women aged 21–60.', aOr: 'ବାର୍ଷିକ ₹10,000 (୫ ବର୍ଷରେ ମୋଟ ₹50,000) — ୨୧ ରୁ ୬୦ ବର୍ଷର ଯୋଗ୍ୟ ମହିଳାଙ୍କୁ।', tip: 'Direct Benefit Transfer (DBT) into Aadhaar-enabled single-holder bank account.' },
    { id: 'sch-2', domain: 'schemes', diff: 'Core', qEn: 'What health assurance coverage does Gopabandhu Jan Arogya Yojana (GJAY) + Ayushman Bharat provide in Odisha?', qOr: 'ଗୋପବନ୍ଧୁ ଜନ ଆରୋଗ୍ୟ ଯୋଜନା (GJAY) ରେ କେତେ ଟଙ୍କାର ସ୍ୱାସ୍ଥ୍ୟ ବୀମା ମିଳେ?', aEn: '₹5 lakh/year per family, plus an additional ₹5 lakh (₹10 lakh total) for women members across empanelled hospitals.', aOr: 'ପରିବାର ପିଛା ବାର୍ଷିକ ₹5 ଲକ୍ଷ ଓ ମହିଳାଙ୍କ ପାଇଁ ଅତିରିକ୍ତ ₹5 ଲକ୍ଷ (ମୋଟ ₹10 ଲକ୍ଷ)।', tip: 'Converged with AB-PMJAY for nationwide cashless portability.' },
    { id: 'sch-3', domain: 'schemes', diff: 'Core', qEn: 'Who are the beneficiaries of CM-KISAN Odisha and what is the annual transfer?', qOr: 'CM-KISAN ଓଡ଼ିଶା ଯୋଜନାରେ ଚାଷୀଙ୍କୁ ବାର୍ଷିକ କେତେ ସହାୟତା ମିଳେ?', aEn: '₹4,000/year in two ₹2,000 instalments (Nuakhai & Akshaya Tritiya) for small/marginal farmers; ₹12,500 in 3 phases for landless agri-households.', aOr: 'କ୍ଷୁଦ୍ର/ନାମମାତ୍ର ଚାଷୀଙ୍କୁ ବାର୍ଷିକ ₹4,000 (ନୂଆଖାଇ ଓ ଅକ୍ଷୟ ତୃତୀୟା) ଓ ଭୂମିହୀନଙ୍କୁ ₹12,500।', tip: 'Also links farmer children to Krishi Vidya Nidhi Scholarship.' },
    { id: 'sch-4', domain: 'schemes', diff: 'Core', qEn: 'What is the family income ceiling and annual payout under Odisha’s e-Medhabruti Merit Scholarship?', qOr: 'ଇ-ମେଧାବୃତ୍ତି ଛାତ୍ରବୃତ୍ତିର ଆୟ ସୀମା ଓ ବାର୍ଷିକ ସହାୟତା ରାଶି କେତେ?', aEn: 'Income ceiling ≤ ₹8,00,000/yr; ₹10,000/yr (UG), ₹15,000/yr (PG), and ₹20,000/yr (Technical & Professional).', aOr: 'ଆୟ ସୀମା ≤ ₹8 ଲକ୍ଷ; ₹10,000 (UG), ₹15,000 (PG) ଓ ₹20,000 (ବୈଷୟିକ)।', tip: 'Managed via State Scholarship Portal (scholarship.odisha.gov.in).' },
    { id: 'sch-5', domain: 'schemes', diff: 'Medium', qEn: 'Which scheme provides ₹20,000/year concurrently to students from Single-Mother & vulnerable households in Odisha?', qOr: 'ଏକକ ମାତା ଓ ଅସୁରକ୍ଷିତ ପରିବାରର ଛାତ୍ରଛାତ୍ରୀଙ୍କୁ କେଉଁ ଯୋଜନାରେ ବାର୍ଷିକ ₹20,000 ମିଳେ?', aEn: 'Gopabandhu Sikhya Sahayata Yojana (GSSY) — income < ₹1.20L/yr; permitted concurrently with other scholarships.', aOr: 'ଗୋପବନ୍ଧୁ ଶିକ୍ଷା ସହାୟତା ଯୋଜନା (GSSY) — ଆୟ < ₹1.20 ଲକ୍ଷ।', tip: 'One of the few schemes allowing concurrent scholarship stacking.' },
    { id: 'sch-6', domain: 'schemes', diff: 'Medium', qEn: 'What is the primary objective of Mission Shakti and Vikshit Gaon Vikshit Odisha?', qOr: 'ମିଶନ ଶକ୍ତି ଓ ବିକଶିତ ଗାଁ ବିକଶିତ ଓଡ଼ିଶାର ମୁଖ୍ୟ ଲକ୍ଷ୍ୟ କ’ଣ?', aEn: 'Mission Shakti empowers Women Self-Help Groups (WSHGs) via interest-free loans & livelihood enterprises; Vikshit Gaon builds rural civic infrastructure.', aOr: 'ମିଶନ ଶକ୍ତି ମହିଳା ସ୍ୱୟଂ ସହାୟକ ଗୋଷ୍ଠୀ ସଶକ୍ତିକରଣ ଓ ବିକଶିତ ଗାଁ ଗ୍ରାମୀଣ ଭିତ୍ତିଭୂମି ବିକାଶ।', tip: 'High-yield OPSC Mains GS-II / GS-III governance topic.' },

    // 5. Odisha History, Art, Literature & Awards (6 cards)
    { id: 'his-1', domain: 'history', diff: 'Core', qEn: 'Who led the historic Paika Rebellion (Paika Bidroha) of 1817 in Khordha?', qOr: '୧୮୧୭ ମସିହାର ଖୋର୍ଦ୍ଧା ପାଇକ ବିଦ୍ରୋହର ନେତୃତ୍ୱ କିଏ ନେଇଥିଲେ?', aEn: 'Buxi Jagabandhu Bidyadhar Mahapatra Bhramarabar Ray (Commander of Raja Mukunda Deva II of Khordha).', aOr: 'ବକ୍ସି ଜଗବନ୍ଧୁ ବିଦ୍ୟାଧର ମହାପାତ୍ର ଭ୍ରମରବର ରାୟ।', tip: 'Jayee Rajaguru (1804) preceded the 1817 Paika uprising against British rule.' },
    { id: 'his-2', domain: 'history', diff: 'Core', qEn: 'When was Utkal Sammilani founded and when did Odisha become India’s first linguistic province?', qOr: 'ଉତ୍କଳ ସମ୍ମିଳନୀ କେବେ ଗଠିତ ହେଲା ଓ ସ୍ୱତନ୍ତ୍ର ଓଡ଼ିଶା ପ୍ରଦେଶ କେବେ ଗଠିତ ହେଲା?', aEn: 'Utkal Sammilani founded in Dec 1903 by Utkal Gourab Madhusudan Das; Odisha formed as a separate province on 1 April 1936 (Utkal Divas).', aOr: 'ଉତ୍କଳ ସମ୍ମିଳନୀ ୧୯୦୩ (ମଧୁସୂଦନ ଦାସ); ସ୍ୱତନ୍ତ୍ର ଓଡ଼ିଶା ପ୍ରଦେଶ ୧ ଏପ୍ରିଲ୍ ୧୯୩୬ (ଉତ୍କଳ ଦିବସ)।', tip: 'Sir John Austen Hubback was the first Governor of Odisha.' },
    { id: 'his-3', domain: 'history', diff: 'Core', qEn: 'Who built the Konark Sun Temple and in which year was it declared a UNESCO World Heritage Site?', qOr: 'କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର କିଏ ନିର୍ମାଣ କରିଥିଲେ ଓ କେବେ UNESCO ବିଶ୍ୱ ଐତିହ୍ୟ ମାନ୍ୟତା ପାଇଲା?', aEn: 'Built by Eastern Ganga King Narasimhadeva I (~1250 CE); inscribed as UNESCO World Heritage Site in 1984.', aOr: 'ପୂର୍ବ ଗଙ୍ଗ ବଂଶର ରାଜା ପ୍ରଥମ ନରସିଂହଦେବ (~୧୨୫୦ ଖ୍ରୀଷ୍ଟାବ୍ଦ); ୧୯୮୪ ରେ UNESCO ମାନ୍ୟତା।', tip: 'Designed as a 24-wheeled chariot of Surya drawn by 7 horses (Kalinga style).' },
    { id: 'his-4', domain: 'history', diff: 'Medium', qEn: 'Which international science popularization award was instituted in 1952 with a grant from Biju Patnaik?', qOr: 'ବିଜୁ ପଟ୍ଟନାୟକଙ୍କ ଅନୁଦାନରେ ୧୯୫୨ ରେ କେଉଁ ଆନ୍ତର୍ଜାତୀୟ ବିଜ୍ଞାନ ପୁରସ୍କାର ଆରମ୍ଭ ହୋଇଥିଲା?', aEn: 'UNESCO Kalinga Prize for the Popularization of Science (jointly supported by Kalinga Foundation Trust, Govt of Odisha & DST India).', aOr: 'UNESCO କଳିଙ୍ଗ ପୁରସ୍କାର (ବିଜ୍ଞାନର ଲୋକପ୍ରିୟତା ପାଇଁ)।', tip: 'Louis de Broglie (1952) was the first recipient.' },
    { id: 'his-5', domain: 'history', diff: 'Medium', qEn: 'When was Odia accorded Classical Language status by the Government of India?', qOr: 'ଓଡ଼ିଆ ଭାଷାକୁ କେବେ ଶାସ୍ତ୍ରୀୟ ଭାଷା (Classical Language) ମାନ୍ୟତା ମିଳିଲା?', aEn: '20 February 2014 — Odia became the 6th Indian language (and first Indo-Aryan language) to receive Classical status.', aOr: '୨୦ ଫେବୃଆରୀ ୨୦୧୪ — ଭାରତର ଷଷ୍ଠ ଶାସ୍ତ୍ରୀୟ ଭାଷା।', tip: 'Atibadi Jagannath Das Award is Odisha’s highest literary lifetime honour.' },
    { id: 'his-6', domain: 'history', diff: 'Medium', qEn: 'Who wrote the iconic Odia novel "Chha Mana Atha Guntha" and who composed "Bande Utkala Janani"?', qOr: '"ଛ ମାଣ ଆଠ ଗୁଣ୍ଠ" ର ଲେଖକ କିଏ ଓ "ବନ୍ଦେ ଉତ୍କଳ ଜନନୀ" କିଏ ରଚନା କରିଥିଲେ?', aEn: '"Chha Mana Atha Guntha" by Vyasakabi Fakir Mohan Senapati; "Bande Utkala Janani" (Odisha State Anthem) by Kantakabi Laxmikanta Mohapatra.', aOr: '"ଛ ମାଣ ଆଠ ଗୁଣ୍ଠ" — ବ୍ୟାସକବି ଫକୀରମୋହନ ସେନାପତି; "ବନ୍ଦେ ଉତ୍କଳ ଜନନୀ" — କାନ୍ତକବି ଲକ୍ଷ୍ମୀକାନ୍ତ ମହାପାତ୍ର।', tip: 'Bande Utkala Janani was accorded official State Anthem status on 7 June 2020.' }
  ];

  var DAY_MS = 86400000;

  function scheduleFlashcardReview(cardId, rating, progressMap, nowMs) {
    var now = typeof nowMs === 'number' ? nowMs : Date.now();
    var map = Object.assign({}, progressMap || {});
    var r = String(rating || 'good').toLowerCase();
    var box = 2;
    var intervalDays = 3;
    if (r === 'again' || r === '1') {
      box = 1;
      intervalDays = 1;
    } else if (r === 'mastered' || r === '3') {
      box = 3;
      intervalDays = 7;
    }
    var prev = map[cardId] || { reviews: 0 };
    var entry = {
      cardId: cardId,
      box: box,
      rating: r,
      reviews: (prev.reviews || 0) + 1,
      lastReviewedAt: now,
      nextDueAt: now + (intervalDays * DAY_MS)
    };
    map[cardId] = entry;
    return { entry: entry, progressMap: map };
  }

  function quantizeStep(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function loadProgress() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress(map) {
    try {
      if (win.localStorage) win.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var progress = loadProgress();
    var state = {
      lang: 'bilingual',
      domain: 'all',
      dueOnly: false,
      index: 0,
      flipped: false
    };

    function getFilteredCards() {
      var now = Date.now();
      return FLASHCARD_DECK.filter(function (c) {
        if (state.domain !== 'all' && c.domain !== state.domain) return false;
        if (state.dueOnly) {
          var p = progress[c.id];
          if (p && p.nextDueAt > now && p.box >= 2) return false;
        }
        return true;
      });
    }

    function rateActive(rating) {
      var cards = getFilteredCards();
      if (!cards.length) return;
      var active = cards[state.index % cards.length];
      var res = scheduleFlashcardReview(active.id, rating, progress);
      progress = res.progressMap;
      saveProgress(progress);
      state.flipped = false;
      state.index = (state.index + 1) % Math.max(1, getFilteredCards().length);
      render();
    }

    // Keyboard shortcuts when card area is focused
    var keyHandler = function (ev) {
      if (!container.contains(doc.activeElement)) return;
      if (ev.code === 'Space') {
        ev.preventDefault();
        state.flipped = !state.flipped;
        render();
      } else if (ev.key === '1') {
        rateActive('again');
      } else if (ev.key === '2') {
        rateActive('good');
      } else if (ev.key === '3') {
        rateActive('mastered');
      }
    };
    if (typeof doc.addEventListener === 'function') {
      doc.addEventListener('keydown', keyHandler);
    }

    function render() {
      var cards = getFilteredCards();
      if (state.index >= cards.length) state.index = 0;
      var active = cards[state.index] || null;

      var masteredCount = FLASHCARD_DECK.filter(function (c) {
        return progress[c.id] && progress[c.id].box === 3;
      }).length;
      var masteryPct = Math.round((masteredCount / FLASHCARD_DECK.length) * 100);

      var card = el('div', 'cso-gfd-card');
      card.setAttribute('data-cso-gk-flashcards', '1');
      card.setAttribute('tabindex', '0');

      // Header
      var head = el('div', 'cso-gfd-head');
      var headCopy = el('div', 'cso-gfd-head-copy');
      headCopy.appendChild(el('div', 'cso-gfd-eyebrow', '🧠 30-CARD ODISHA GK & CURRENT AFFAIRS LEITNER FLASHCARD DECK'));
      headCopy.appendChild(el('h2', 'cso-gfd-title', 'Interactive Bilingual Odisha Exam Spaced-Repetition Flashcards'));
      headCopy.appendChild(el('p', 'cso-gfd-sub', 'Master high-yield OPSC, OSSC & OSSSC Odisha GK across 5 domains. Press Space to flip, or 1 (Again) / 2 (Good) / 3 (Mastered) to schedule Leitner boxes.'));
      head.appendChild(headCopy);

      var meterBox = el('div', 'cso-gfd-meter-box');
      meterBox.appendChild(el('span', 'cso-gfd-meter-lbl', '🏆 Mastery: ' + masteredCount + ' / ' + FLASHCARD_DECK.length + ' (' + masteryPct + '%)'));
      var trk = el('div', 'cso-gfd-bar-track');
      trk.appendChild(el('div', 'cso-gfd-bar-fill cso-vfv-bar--w' + quantizeStep(masteryPct)));
      meterBox.appendChild(trk);
      head.appendChild(meterBox);
      card.appendChild(head);

      // Domain Filter Pills + Due Today Toggle
      var filterRow = el('div', 'cso-gfd-filters');
      DOMAINS.forEach(function (d) {
        var b = el('button', 'cso-gfd-pill' + (state.domain === d.id ? ' is-active' : ''), d.en);
        b.type = 'button';
        b.addEventListener('click', function () { state.domain = d.id; state.index = 0; state.flipped = false; render(); });
        filterRow.appendChild(b);
      });
      var dueBtn = el('button', 'cso-gfd-pill' + (state.dueOnly ? ' is-active' : ''), state.dueOnly ? '✓ Due Today Only' : '📅 Due Today Only');
      dueBtn.type = 'button';
      dueBtn.addEventListener('click', function () { state.dueOnly = !state.dueOnly; state.index = 0; state.flipped = false; render(); });
      filterRow.appendChild(dueBtn);
      card.appendChild(filterRow);

      // Active Flashcard Stage
      if (!active) {
        var doneBox = el('div', 'cso-gfd-empty');
        doneBox.appendChild(el('strong', '', '🎉 All cards in this filter are reviewed for today!'));
        var showAllBtn = el('button', 'cso-gfd-btn cso-gfd-btn--primary', 'Show All Cards');
        showAllBtn.type = 'button';
        showAllBtn.addEventListener('click', function () { state.dueOnly = false; state.domain = 'all'; render(); });
        doneBox.appendChild(showAllBtn);
        card.appendChild(doneBox);
      } else {
        var boxNum = (progress[active.id] && progress[active.id].box) || 1;
        var stage = el('div', 'cso-gfd-stage' + (state.flipped ? ' is-flipped' : ''));
        var topMeta = el('div', 'cso-gfd-stage-meta');
        topMeta.appendChild(el('span', 'cso-gfd-tag', active.domain.toUpperCase() + ' · ' + active.diff));
        topMeta.appendChild(el('span', 'cso-gfd-tag', 'Leitner Box ' + boxNum + ' · Card ' + (state.index + 1) + ' / ' + cards.length));
        stage.appendChild(topMeta);

        if (!state.flipped) {
          stage.appendChild(el('div', 'cso-gfd-face-label', 'QUESTION (Tap or Press Space to Flip)'));
          stage.appendChild(el('h3', 'cso-gfd-q-en', active.qEn));
          stage.appendChild(el('p', 'cso-gfd-q-or', active.qOr));
        } else {
          stage.appendChild(el('div', 'cso-gfd-face-label', 'VERIFIED EXAM ANSWER'));
          stage.appendChild(el('h3', 'cso-gfd-a-en', active.aEn));
          stage.appendChild(el('p', 'cso-gfd-a-or', active.aOr));
          stage.appendChild(el('div', 'cso-gfd-tip', '💡 Exam Tip: ' + active.tip));
        }

        var flipBtn = el('button', 'cso-gfd-btn cso-gfd-btn--primary', state.flipped ? '↺ Show Question' : '🔄 Flip to Reveal Answer (Space)');
        flipBtn.type = 'button';
        flipBtn.addEventListener('click', function () { state.flipped = !state.flipped; render(); });
        stage.appendChild(flipBtn);
        card.appendChild(stage);

        // Leitner Rating Controls
        var rateRow = el('div', 'cso-gfd-rates');
        [
          { r: 'again', lbl: '1 · Review Again (Box 1 · +1d)', cls: 'cso-gfd-btn' },
          { r: 'good', lbl: '2 · Good Recall (Box 2 · +3d)', cls: 'cso-gfd-btn' },
          { r: 'mastered', lbl: '3 · Mastered (Box 3 · +7d)', cls: 'cso-gfd-btn cso-gfd-btn--primary' }
        ].forEach(function (rt) {
          var rb = el('button', rt.cls, rt.lbl);
          rb.type = 'button';
          rb.addEventListener('click', function () { rateActive(rt.r); });
          rateRow.appendChild(rb);
        });
        card.appendChild(rateRow);
      }

      // Footer Utilities
      var foot = el('div', 'cso-gfd-actions');
      var resetBtn = el('button', 'cso-gfd-btn', '🔄 Reset Deck Progress');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        progress = {};
        saveProgress(progress);
        state.index = 0;
        state.flipped = false;
        render();
      });
      foot.appendChild(resetBtn);

      var printBtn = el('button', 'cso-gfd-btn', '🖨️ Print Flashcard Revision Sheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      foot.appendChild(printBtn);
      card.appendChild(foot);

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
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    STORAGE_KEY: STORAGE_KEY,
    DOMAINS: DOMAINS,
    FLASHCARD_DECK: FLASHCARD_DECK,
    scheduleFlashcardReview: scheduleFlashcardReview,
    mount: mount
  };
});
