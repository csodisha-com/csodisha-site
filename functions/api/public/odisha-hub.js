/**
 * Common Sense Odisha — Unified Live Odisha Special, 30-District Atlas & State GK API (v377)
 * Endpoint: GET /api/public/odisha-hub
 *
 * Aggregates published Odisha-focused entries from D1 (`cso_current_affairs`,
 * `informative_guides` matched to odisha-gk / odisha-special / heritage / district,
 * and Odisha `scheme_articles` / `posts`), merged with:
 *   - `districts[]`: Complete 30-District Odisha Quick Reference (Angul -> Sundargarh, 10 per Revenue Division)
 *   - `items[]`: Bilingual Odisha History, Geography, Art/GI Tags & State Governance capsules
 *   - `odisha_quiz[]`: 5 bilingual EN / ଓଡ଼ିଆ exam-grade Odisha GK MCQs
 */
import { json } from '../../_lib/http.js';
import { matchGuideToTopic } from '../../_lib/trending-topics.js';

function cleanText(val, max = 260) {
  return String(val || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const ODISHA_30_DISTRICTS_ATLAS = [
  { name_en: 'Angul', name_or: 'ଅନୁଗୋଳ', hq_en: 'Angul', hq_or: 'ଅନୁଗୋଳ', division: 'Northern', famous_for_en: 'Satkosia Tiger Reserve, Talcher Coalfields & NALCO', famous_for_or: 'ସାତକୋଶିଆ ବ୍ୟାଘ୍ର ଅଭୟାରଣ୍ୟ, ତାଳଚେର କୋଇଲା ଓ NALCO', district_portal_url: 'https://angul.odisha.gov.in/' },
  { name_en: 'Balangir', name_or: 'ବଲାଙ୍ଗୀର', hq_en: 'Balangir', hq_or: 'ବଲାଙ୍ଗୀର', division: 'Northern', famous_for_en: 'Ranipur-Jharial Chausathi Yogini & Harishankar Temple', famous_for_or: 'ରାଣୀପୁର-ଝରିଆଲ ଚଉଷଠି ଯୋଗିନୀ ଓ ହରିଶଙ୍କର ପୀଠ', district_portal_url: 'https://balangir.odisha.gov.in/' },
  { name_en: 'Balasore', name_or: 'ବାଲେଶ୍ୱର', hq_en: 'Balasore', hq_or: 'ବାଲେଶ୍ୱର', division: 'Central', famous_for_en: 'Chandipur Missile Range (ITR), Panchalingeswar & Fakir Mohan Legacy', famous_for_or: 'ଚାନ୍ଦିପୁର କ୍ଷେପଣାସ୍ତ୍ର ଘାଟି, ପଞ୍ଚଲିଙ୍ଗେଶ୍ୱର ଓ ଫକୀର ମୋହନ', district_portal_url: 'https://baleswar.odisha.gov.in/' },
  { name_en: 'Bargarh', name_or: 'ବରଗଡ଼', hq_en: 'Bargarh', hq_or: 'ବରଗଡ଼', division: 'Northern', famous_for_en: 'Dhanu Yatra (World’s Largest Open-Air Theatre) & Nrusinghanath', famous_for_or: 'ବିଶ୍ୱପ୍ରସିଦ୍ଧ ଧନୁଯାତ୍ରା ଓ ନୃସିଂହନାଥ ପୀଠ', district_portal_url: 'https://bargarh.odisha.gov.in/' },
  { name_en: 'Bhadrak', name_or: 'ଭଦ୍ରକ', hq_en: 'Bhadrak', hq_or: 'ଭଦ୍ରକ', division: 'Central', famous_for_en: 'Akhandalamani Temple (Aradi), Dhamra Port & Eram Rakta Tirtha', famous_for_or: 'ଆରଡ଼ି ଆଖଣ୍ଡଳମଣି, ଧାମରା ବନ୍ଦର ଓ ରକ୍ତତୀର୍ଥ ଇରମ', district_portal_url: 'https://bhadrak.odisha.gov.in/' },
  { name_en: 'Boudh', name_or: 'ବୌଦ୍ଧ', hq_en: 'Boudh', hq_or: 'ବୌଦ୍ଧ', division: 'Southern', famous_for_en: 'Ancient Buddhist Heritage, Rameswar Temple & Mahanadi Valley', famous_for_or: 'ପ୍ରାଚୀନ ବୌଦ୍ଧ ଐତିହ୍ୟ, ରାମେଶ୍ୱର ମନ୍ଦିର ଓ ମହାନଦୀ ଉପତ୍ୟକା', district_portal_url: 'https://boudh.odisha.gov.in/' },
  { name_en: 'Cuttack', name_or: 'କଟକ', hq_en: 'Cuttack', hq_or: 'କଟକ', division: 'Central', famous_for_en: 'Barabati Fort, Silver Filigree (GI Tag), Orissa High Court & Bali Yatra', famous_for_or: 'ବାରବାଟୀ ଦୁର୍ଗ, ରୂପା ତାରକସି (GI ଟ୍ୟାଗ୍), ଉଚ୍ଚ ନ୍ୟାୟାଳୟ ଓ ବାଲିଯାତ୍ରା', district_portal_url: 'https://cuttack.odisha.gov.in/' },
  { name_en: 'Deogarh', name_or: 'ଦେବଗଡ଼', hq_en: 'Deogarh', hq_or: 'ଦେବଗଡ଼', division: 'Northern', famous_for_en: 'Pradhanpat Waterfall & Kailash Palace Heritage', famous_for_or: 'ପ୍ରଧାନପାଟ ଜଳପ୍ରପାତ ଓ କୈଳାସ ରାଜପ୍ରସାଦ', district_portal_url: 'https://deogarh.odisha.gov.in/' },
  { name_en: 'Dhenkanal', name_or: 'ଢେଙ୍କାନାଳ', hq_en: 'Dhenkanal', hq_or: 'ଢେଙ୍କାନାଳ', division: 'Northern', famous_for_en: 'Kapilas Temple, Joranda Mahima Gadi & Dhenkanal Magji (GI Tag)', famous_for_or: 'କପିଳାସ ପୀଠ, ଜୋରନ୍ଦା ମହିମା ଗାଦି ଓ ଢେଙ୍କାନାଳ ମାଗଜି (GI)', district_portal_url: 'https://dhenkanal.odisha.gov.in/' },
  { name_en: 'Gajapati', name_or: 'ଗଜପତି', hq_en: 'Paralakhemundi', hq_or: 'ପାରଳାଖେମୁଣ୍ଡି', division: 'Southern', famous_for_en: 'Mahendragiri Hills, Jirang Monastery & Maharaja Krushna Chandra Gajapati', famous_for_or: 'ମହେନ୍ଦ୍ରଗିରି ପର୍ବତ, ଜିରାଙ୍ଗ ବୌଦ୍ଧ ବିହାର ଓ ମହାରାଜା କୃଷ୍ଣଚନ୍ଦ୍ର ଗଜପତି', district_portal_url: 'https://gajapati.odisha.gov.in/' },
  { name_en: 'Ganjam', name_or: 'ଗଞ୍ଜାମ', hq_en: 'Chhatrapur', hq_or: 'ଛତ୍ରପୁର', division: 'Southern', famous_for_en: 'Gopalpur-on-Sea, Tara Tarini Shakti Peetha & Berhampur Silk (GI Tag)', famous_for_or: 'ଗୋପାଳପୁର ବେଳାଭୂମି, ତାରାତାରିଣୀ ପୀଠ ଓ ବ୍ରହ୍ମପୁର ପାଟ (GI)', district_portal_url: 'https://ganjam.odisha.gov.in/' },
  { name_en: 'Jagatsinghpur', name_or: 'ଜଗତସିଂହପୁର', hq_en: 'Jagatsinghpur', hq_or: 'ଜଗତସିଂହପୁର', division: 'Central', famous_for_en: 'Paradip Major Port, Sarala Peetha (Jhankad) & Gorekhnath', famous_for_or: 'ପାରାଦୀପ ବନ୍ଦର, ଝଙ୍କଡ଼ ମା’ ସାରଳା ପୀଠ ଓ ଗୋରେଖନାଥ', district_portal_url: 'https://jagatsinghpur.odisha.gov.in/' },
  { name_en: 'Jajpur', name_or: 'ଯାଜପୁର', hq_en: 'Panikoili / Jajpur', hq_or: 'ଯାଜପୁର', division: 'Central', famous_for_en: 'Biraja Shakti Peetha, Ratnagiri-Udayagiri-Lalitgiri Buddhist Diamond Triangle & Kalinganagar', famous_for_or: 'ମା’ ବିରଜା ପୀଠ, ରତ୍ନଗିରି-ଉଦୟଗିରି-ଲଳିତଗିରି ବୌଦ୍ଧ ତ୍ରିକୋଣ ଓ କଳିଙ୍ଗନଗର', district_portal_url: 'https://jajpur.odisha.gov.in/' },
  { name_en: 'Jharsuguda', name_or: 'ଝାରସୁଗୁଡ଼ା', hq_en: 'Jharsuguda', hq_or: 'ଝାରସୁଗୁଡ଼ା', division: 'Northern', famous_for_en: 'Veer Surendra Sai Airport, Ib Thermal Power & Industrial Hub', famous_for_or: 'ବୀର ସୁରେନ୍ଦ୍ର ସାଏ ବିମାନବନ୍ଦର ଓ ଇବ୍ ତାପଜ ବିଦ୍ୟୁତ୍ କେନ୍ଦ୍ର', district_portal_url: 'https://jharsuguda.odisha.gov.in/' },
  { name_en: 'Kalahandi', name_or: 'କଳାହାଣ୍ଡି', hq_en: 'Bhawanipatna', hq_or: 'ଭବାନୀପାଟଣା', division: 'Southern', famous_for_en: 'Karlapat Wildlife Sanctuary, Indravati Project & Asurgarh Fort', famous_for_or: 'କାର୍ଲାପାଟ ଅଭୟାରଣ୍ୟ, ଇନ୍ଦ୍ରାବତୀ ପ୍ରକଳ୍ପ ଓ ଅସୁରଗଡ଼ ଦୁର୍ଗ', district_portal_url: 'https://kalahandi.odisha.gov.in/' },
  { name_en: 'Kandhamal', name_or: 'କନ୍ଧମାଳ', hq_en: 'Phulbani', hq_or: 'ଫୁଲବାଣୀ', division: 'Southern', famous_for_en: 'Kandhamal Haladi (Turmeric GI Tag), Daringbadi (Kashmir of Odisha)', famous_for_or: 'କନ୍ଧମାଳ ହଳଦୀ (GI ଟ୍ୟାଗ୍) ଓ ଦାରିଙ୍ଗବାଡ଼ି (ଓଡ଼ିଶାର କାଶ୍ମୀର)', district_portal_url: 'https://kandhamal.odisha.gov.in/' },
  { name_en: 'Kendrapara', name_or: 'କେନ୍ଦ୍ରାପଡ଼ା', hq_en: 'Kendrapara', hq_or: 'କେନ୍ଦ୍ରାପଡ଼ା', division: 'Central', famous_for_en: 'Bhitarkanika National Park (Ramsar), Gahirmatha Olive Ridley & Baladevjew', famous_for_or: 'ଭିତରକନିକା ଜାତୀୟ ଉଦ୍ୟାନ, ଗହିରମଥା କଇଁଛ ଓ ବଳଦେବଜୀଉ', district_portal_url: 'https://kendrapara.odisha.gov.in/' },
  { name_en: 'Kendujhar', name_or: 'କେନ୍ଦୁଝର', hq_en: 'Kendujhar', hq_or: 'କେନ୍ଦୁଝର', division: 'Northern', famous_for_en: 'Ghatagaon Maa Tarini, Sanaghagara Waterfall & Iron/Manganese Belt', famous_for_or: 'ଘଟଗାଁ ମା’ ତାରିଣୀ ପୀଠ, ସାନଘାଗରା ଜଳପ୍ରପାତ ଓ ଖଣିଜ ଭଣ୍ଡାର', district_portal_url: 'https://kendujhar.odisha.gov.in/' },
  { name_en: 'Khordha', name_or: 'ଖୋର୍ଦ୍ଧା', hq_en: 'Khordha (Bhubaneswar Capital)', hq_or: 'ଖୋର୍ଦ୍ଧା (ଭୁବନେଶ୍ୱର ରାଜଧାନୀ)', division: 'Central', famous_for_en: 'State Capital Bhubaneswar, Lingaraj Temple, Nandankanan, Dhauli & Paika Rebellion (1817)', famous_for_or: 'ରାଜଧାନୀ ଭୁବନେଶ୍ୱର, ଲିଙ୍ଗରାଜ ମନ୍ଦିର, ନନ୍ଦନକାନନ, ଧଉଳି ଓ ପାଇକ ବିଦ୍ରୋହ (୧୮୧୭)', district_portal_url: 'https://khordha.odisha.gov.in/' },
  { name_en: 'Koraput', name_or: 'କୋରାପୁଟ', hq_en: 'Koraput', hq_or: 'କୋରାପୁଟ', division: 'Southern', famous_for_en: 'Deomali (Odisha’s Highest Peak 1,672m), Koraput Kalajeera Rice (GI) & Kotpad Handloom', famous_for_or: 'ଦେଓମାଳି (ସର୍ବୋଚ୍ଚ ଶୃଙ୍ଗ), କୋରାପୁଟ କଳାଜୀରା ଚାଉଳ (GI) ଓ କୋଟପାଡ଼ ବୟନ', district_portal_url: 'https://koraput.odisha.gov.in/' },
  { name_en: 'Malkangiri', name_or: 'ମାଲକାନଗିରି', hq_en: 'Malkangiri', hq_or: 'ମାଲକାନଗିରି', division: 'Southern', famous_for_en: 'Balimela Hydro Reservoir, Bonda Hills & Gurupriya Setu', famous_for_or: 'ବାଲିମେଳା ଜଳଭଣ୍ଡାର, ବଣ୍ଡା ଘାଟି ଓ ଗୁରୁପ୍ରିୟା ସେତୁ', district_portal_url: 'https://malkangiri.odisha.gov.in/' },
  { name_en: 'Mayurbhanj', name_or: 'ମୟୂରଭଞ୍ଜ', hq_en: 'Baripada', hq_or: 'ବାରିପଦା', division: 'Central', famous_for_en: 'Simlipal Biosphere Reserve, Mayurbhanj Chhau Dance & Kai Chutney (GI Tag)', famous_for_or: 'ଶିମିଳିପାଳ ଜୈବମଣ୍ଡଳ, ମୟୂରଭଞ୍ଜ ଛଉ ନୃତ୍ୟ ଓ କାଇ ଚଟଣି (GI)', district_portal_url: 'https://mayurbhanj.odisha.gov.in/' },
  { name_en: 'Nabarangpur', name_or: 'ନବରଙ୍ଗପୁର', hq_en: 'Nabarangpur', hq_or: 'ନବରଙ୍ଗପୁର', division: 'Southern', famous_for_en: 'Podagada Historical Site, Papadahandi Freedom Memorial & Maize Bowl', famous_for_or: 'ପୋଡ଼ାଗଡ଼ ଐତିହାସିକ ସ୍ଥଳ ଓ ପାପଡ଼ାହାଣ୍ଡି ସ୍ୱାଧୀନତା ସ୍ମାରକୀ', district_portal_url: 'https://nabarangpur.odisha.gov.in/' },
  { name_en: 'Nayagarh', name_or: 'ନୟାଗଡ଼', hq_en: 'Nayagarh', hq_or: 'ନୟାଗଡ଼', division: 'Central', famous_for_en: 'Nayagarh Kanteimundi Brinjal (GI Tag), Kantilo Nilamadhav & Odagaon Raghunath', famous_for_or: 'ନୟାଗଡ଼ କଣ୍ଟେଇମୁଣ୍ଡି ବାଇଗଣ (GI), କଣ୍ଟିଲୋ ନୀଳମାଧବ ଓ ଓଡ଼ଗାଁ ରଘୁନାଥ', district_portal_url: 'https://nayagarh.odisha.gov.in/' },
  { name_en: 'Nuapada', name_or: 'ନୂଆପଡ଼ା', hq_en: 'Nuapada', hq_or: 'ନୂଆପଡ଼ା', division: 'Southern', famous_for_en: 'Sunabeda Wildlife Sanctuary, Patalganga & Yogeswar Temple', famous_for_or: 'ସୁନାବେଡ଼ା ଅଭୟାରଣ୍ୟ ଓ ପାତାଳଗଙ୍ଗା ତୀର୍ଥ', district_portal_url: 'https://nuapada.odisha.gov.in/' },
  { name_en: 'Puri', name_or: 'ପୁରୀ', hq_en: 'Puri', hq_or: 'ପୁରୀ', division: 'Central', famous_for_en: 'Shree Jagannath Temple, UNESCO Konark Sun Temple, Pattachitra (GI) & Chilika Lake', famous_for_or: 'ଶ୍ରୀଜଗନ୍ନାଥ ମନ୍ଦିର, କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର, ପଟ୍ଟଚିତ୍ର (GI) ଓ ଚିଲିକା ହ୍ରଦ', district_portal_url: 'https://puri.odisha.gov.in/' },
  { name_en: 'Rayagada', name_or: 'ରାୟଗଡ଼ା', hq_en: 'Rayagada', hq_or: 'ରାୟଗଡ଼ା', division: 'Southern', famous_for_en: 'Maa Majhighariani Temple, Niyamgiri Hills & Lanjia Saura Painting (GI Tag)', famous_for_or: 'ମା’ ମଝିଘରିଆଣୀ ପୀଠ, ନିୟମଗିରି ଓ ଲାଞ୍ଜିଆ ସଉରା ଚିତ୍ରକଳା (GI)', district_portal_url: 'https://rayagada.odisha.gov.in/' },
  { name_en: 'Sambalpur', name_or: 'ସମ୍ବଲପୁର', hq_en: 'Sambalpur', hq_or: 'ସମ୍ବଲପୁର', division: 'Northern', famous_for_en: 'Hirakud Dam (Longest Earthen Dam), Maa Samaleswari, Sambalpuri Bandha Saree (GI) & IIM', famous_for_or: 'ହୀରାକୁଦ ବନ୍ଧ, ମା’ ସମଲେଶ୍ୱରୀ, ସମ୍ବଲପୁରୀ ବାନ୍ଧ ଶାଢ଼ୀ (GI) ଓ IIM', district_portal_url: 'https://sambalpur.odisha.gov.in/' },
  { name_en: 'Subarnapur', name_or: 'ସୁବର୍ଣ୍ଣପୁର', hq_en: 'Sonepur', hq_or: 'ସୋନପୁର', division: 'Northern', famous_for_en: 'Bomkai Saree (GI Tag), Sureswari Temple & Mahanadi-Tel Confluence', famous_for_or: 'ବମକେଇ ଶାଢ଼ୀ (GI), ସୁରେଶ୍ୱରୀ ମନ୍ଦିର ଓ ମହାନଦୀ-ତେଲ ସଙ୍ଗମ', district_portal_url: 'https://subarnapur.odisha.gov.in/' },
  { name_en: 'Sundargarh', name_or: 'ସୁନ୍ଦରଗଡ଼', hq_en: 'Sundargarh', hq_or: 'ସୁନ୍ଦରଗଡ଼', division: 'Northern', famous_for_en: 'Rourkela Steel Plant (SAIL), Birsa Munda Hockey Stadium, NIT Rourkela & Vedavyas', famous_for_or: 'ରାଉରକେଲା ଇସ୍ପାତ କାରଖାନା, ବିର୍ସା ମୁଣ୍ଡା ହକି ଷ୍ଟାଡିୟମ୍ ଓ ବେଦବ୍ୟାସ', district_portal_url: 'https://sundargarh.odisha.gov.in/' }
];

export const CORE_ODISHA_CAPSULES = [
  {
    id: 'od-hist-timeline',
    title_en: 'Odisha History Milestone Capsule: Kalinga War (261 BCE) to Utkal Divas (1 April 1936)',
    title_or: 'ଓଡ଼ିଶା ଇତିହାସ କ୍ୟାପସୁଲ୍: କଳିଙ୍ଗ ଯୁଦ୍ଧ (୨୬୧ ଖ୍ରୀ.ପୂ.) ରୁ ଉତ୍କଳ ଦିବସ (୧ ଏପ୍ରିଲ୍ ୧୯୩୬)',
    summary_en: 'Covers Kharavela’s Hathigumpha Inscription, Paika Rebellion (1817) led by Buxi Jagabandhu, Utkal Sammilani (1903) by Madhusudan Das, and Linguistic Province Formation on 1 April 1936.',
    summary_or: 'ଖାରବେଳଙ୍କ ହାତୀଗୁମ୍ଫା ଶିଳାଲେଖ, ବକ୍ସି ଜଗବନ୍ଧୁଙ୍କ ପାଇକ ବିଦ୍ରୋହ (୧୮୧୭), ମଧୁସୂଦନ ଦାସଙ୍କ ଉତ୍କଳ ସମ୍ମିଳନୀ (୧୯୦୩) ଓ ୧ ଏପ୍ରିଲ୍ ୧୯୩୬ ଓଡ଼ିଶା ପ୍ରଦେଶ ଗଠନ।',
    tab_key: 'history',
    category_label: 'History & Freedom Movement',
    detail_url: '/guides/?category=odisha-gk&q=History',
    source_type: 'capsule'
  },
  {
    id: 'od-geo-rivers',
    title_en: 'Odisha Geography, River Basins & Ramsar Wetlands High-Yield Notes',
    title_or: 'ଓଡ଼ିଶା ଭୂଗୋଳ, ନଦୀ ଉପତ୍ୟକା ଓ ରାମସାର ଆର୍ଦ୍ରଭୂମି ନୋଟ୍ସ',
    summary_en: 'Mahanadi, Brahmani, Baitarani, Rushikulya, Subarnarekha & Budhabalanga rivers; 6 Ramsar wetlands (Chilika, Bhitarkanika, Satkosia Gorge, Tampara, Hirakud Reservoir, Ansupa) and Deomali peak (1,672m).',
    summary_or: 'ମହାନଦୀ, ବ୍ରାହ୍ମଣୀ, ବୈତରଣୀ, ଋଷିକୂଲ୍ୟା, ସୁବର୍ଣ୍ଣରେଖା ନଦୀ; ୬ଟି ରାମସାର ଆର୍ଦ୍ରଭୂମି (ଚିଲିକା, ଭିତରକନିକା, ସାତକୋଶିଆ, ତାମ୍ପରା, ହୀରାକୁଦ, ଅଂଶୁପା) ଓ ଦେଓମାଳି ଶୃଙ୍ଗ।',
    tab_key: 'geography',
    category_label: 'Geography & Rivers',
    detail_url: '/guides/?category=odisha-gk&q=Geography',
    source_type: 'capsule'
  },
  {
    id: 'od-gi-tags-art',
    title_en: 'Complete Odisha GI Tags, Classical Odissi & Heritage Crafts Compendium (2026)',
    title_or: 'ଓଡ଼ିଶାର ସମ୍ପୂର୍ଣ୍ଣ GI ଟ୍ୟାଗ୍, ଓଡ଼ିଶୀ ନୃତ୍ୟ ଓ ହସ୍ତଶିଳ୍ପ ସଙ୍କଳନ (୨୦୨୬)',
    summary_en: 'Odisha Rasagola, Pattachitra, Konark Stone Carving, Cuttack Rupa Tarakasi, Sambalpuri Bandha, Kotpad Handloom, Kandhamal Haladi, Nayagarh Kanteimundi Brinjal, Koraput Kalajeera Rice, Kai Chutney & Lanjia Saura.',
    summary_or: 'ଓଡ଼ିଶା ରସଗୋଲା, ପଟ୍ଟଚିତ୍ର, କୋଣାର୍କ ପଥର କାମ, କଟକ ରୂପା ତାରକସି, ସମ୍ବଲପୁରୀ ବାନ୍ଧ, କୋଟପାଡ଼, କନ୍ଧମାଳ ହଳଦୀ, ନୟାଗଡ଼ କଣ୍ଟେଇମୁଣ୍ଡି ବାଇଗଣ, କଳାଜୀରା ଚାଉଳ ଓ କାଇ ଚଟଣି।',
    tab_key: 'culture',
    category_label: 'Art, Culture & GI Tags',
    detail_url: '/guides/?category=odisha-gk&q=GI+Tag',
    source_type: 'capsule'
  },
  {
    id: 'od-gov-polity',
    title_en: 'Odisha State Governance: 147 Assembly Seats, 21 Lok Sabha, 3 Revenue Divisions & Public Schemes',
    title_or: 'ଓଡ଼ିଶା ଶାସନ ବ୍ୟବସ୍ଥା: ୧୪୭ ବିଧାନସଭା ଆସନ, ୨୧ ଲୋକସଭା, ୩ ରାଜସ୍ୱ ଡିଭିଜନ୍ ଓ ଜନକଲ୍ୟାଣ ଯୋଜନା',
    summary_en: 'Exam-ready snapshot of Odisha Legislature, High Court (Cuttack, est. 1948), 314 Blocks, 30 Districts across Central/Northern/Southern divisions, and flagship citizen welfare portals.',
    summary_or: 'ଓଡ଼ିଶା ବିଧାନସଭା, ଓଡ଼ିଶା ଉଚ୍ଚ ନ୍ୟାୟାଳୟ (୧୯୪୮), ୩୧୪ ବ୍ଲକ୍, ୩୦ ଜିଲ୍ଲା (କେନ୍ଦ୍ରୀୟ, ଉତ୍ତରାଞ୍ଚଳ, ଦକ୍ଷିଣାଞ୍ଚଳ ଡିଭିଜନ୍) ଓ ରାଜ୍ୟ ସରକାରୀ ପୋର୍ଟାଲ୍।',
    tab_key: 'governance',
    category_label: 'State Governance & Updates',
    detail_url: '/schemes/',
    source_type: 'capsule'
  }
];

export const ODISHA_GK_QUIZ = [
  {
    id: 'oq1',
    exam_tag: 'OPSC OAS / Odisha History',
    question_en: 'On which date was Odisha formed as India’s first province constituted on a linguistic basis?',
    question_or: 'ଭାଷା ଭିତ୍ତିରେ ଗଠିତ ଭାରତର ପ୍ରଥମ ପ୍ରଦେଶ ଭାବେ ଓଡ଼ିଶା କେଉଁ ତାରିଖରେ ଗଠିତ ହୋଇଥିଲା?',
    options_en: ['15 August 1947', '1 April 1936', '26 January 1950', '1 November 1956'],
    options_or: ['୧୫ ଅଗଷ୍ଟ ୧୯୪୭', '୧ ଏପ୍ରିଲ୍ ୧୯୩୬', '୨୬ ଜାନୁଆରୀ ୧୯୫୦', '୧ ନଭେମ୍ବର ୧୯୫୬'],
    correct_index: 1,
    explanation_en: 'Odisha became a separate linguistic province on 1 April 1936, celebrated every year as Utkal Divas (Odisha Day).',
    explanation_or: '୧ ଏପ୍ରିଲ୍ ୧୯୩୬ରେ ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର ଭାଷାଭିତ୍ତିକ ପ୍ରଦେଶ ଭାବେ ଗଠିତ ହୋଇଥିଲା, ଯାହା ଉତ୍କଳ ଦିବସ ଭାବେ ପାଳିତ ହୁଏ।'
  },
  {
    id: 'oq2',
    exam_tag: 'OSSC CGL / GI Tags',
    question_en: 'Which district of Odisha received the Geographical Indication (GI) tag for “Kanteimundi Brinjal”?',
    question_or: 'ଓଡ଼ିଶାର କେଉଁ ଜିଲ୍ଲା “କଣ୍ଟେଇମୁଣ୍ଡି ବାଇଗଣ” ପାଇଁ ଭୌଗୋଳିକ ସୂଚକ (GI) ଟ୍ୟାଗ୍ ପାଇଛି?',
    options_en: ['Kandhamal', 'Nayagarh', 'Koraput', 'Dhenkanal'],
    options_or: ['କନ୍ଧମାଳ', 'ନୟାଗଡ଼', 'କୋରାପୁଟ', 'ଢେଙ୍କାନାଳ'],
    correct_index: 1,
    explanation_en: 'Nayagarh Kanteimundi Brinjal was awarded the GI tag in 2024 alongside Cuttack Rupa Tarakasi and Koraput Kalajeera Rice.',
    explanation_or: 'ନୟାଗଡ଼ କଣ୍ଟେଇମୁଣ୍ଡି ବାଇଗଣ ୨୦୨୪ରେ GI ଟ୍ୟାଗ୍ ଲାଭ କରିଥିଲା।'
  },
  {
    id: 'oq3',
    exam_tag: 'OSSSC / Odisha Geography',
    question_en: 'Which is the highest mountain peak in Odisha, located in the Eastern Ghats of Koraput district?',
    question_or: 'କୋରାପୁଟ ଜିଲ୍ଲାର ପୂର୍ବଘାଟ ପର୍ବତମାଳାରେ ଅବସ୍ଥିତ ଓଡ଼ିଶାର ସର୍ବୋଚ୍ଚ ପର୍ବତ ଶୃଙ୍ଗ କେଉଁଟି?',
    options_en: ['Mahendragiri', 'Malayagiri', 'Deomali', 'Meghasani'],
    options_or: ['ମହେନ୍ଦ୍ରଗିରି', 'ମଳୟଗିରି', 'ଦେଓମାଳି', 'ମେଘାସନୀ'],
    correct_index: 2,
    explanation_en: 'Deomali in Koraput district is Odisha’s highest peak at approximately 1,672 metres above sea level.',
    explanation_or: 'କୋରାପୁଟ ଜିଲ୍ଲାର ଦେଓମାଳି (ପ୍ରାୟ ୧,୬୭୨ ମିଟର) ଓଡ଼ିଶାର ସର୍ବୋଚ୍ଚ ପର୍ବତ ଶୃଙ୍ଗ।'
  },
  {
    id: 'oq4',
    exam_tag: 'OAVS / Freedom Movement',
    question_en: 'Who led the historic Paika Rebellion of 1817 in Khordha against British East India Company rule?',
    question_or: '୧୮୧୭ ମସିହାରେ ଖୋର୍ଦ୍ଧାରେ ବ୍ରିଟିଶ୍ ଶାସନ ବିରୁଦ୍ଧରେ ଐତିହାସିକ ପାଇକ ବିଦ୍ରୋହର ନେତୃତ୍ୱ କିଏ ନେଇଥିଲେ?',
    options_en: ['Veer Surendra Sai', 'Buxi Jagabandhu', 'Jayee Rajaguru', 'Chakhi Khuntia'],
    options_or: ['ବୀର ସୁରେନ୍ଦ୍ର ସାଏ', 'ବକ୍ସି ଜଗବନ୍ଧୁ', 'ଜୟୀ ରାଜଗୁରୁ', 'ଚାଖି ଖୁଣ୍ଟିଆ'],
    correct_index: 1,
    explanation_en: 'Buxi Jagabandhu Bidyadhar Mohapatra led the Paika Rebellion of 1817 in Khordha.',
    explanation_or: 'ବକ୍ସି ଜଗବନ୍ଧୁ ବିଦ୍ୟାଧର ମହାପାତ୍ର ୧୮୧୭ରେ ଖୋର୍ଦ୍ଧାର ପାଇକ ବିଦ୍ରୋହର ନେତୃତ୍ୱ ନେଇଥିଲେ।'
  },
  {
    id: 'oq5',
    exam_tag: 'OTET / State Governance',
    question_en: 'How many total Ramsar Wetlands of International Importance are located in Odisha?',
    question_or: 'ଓଡ଼ିଶାରେ ମୋଟ କେତୋଟି ଆନ୍ତର୍ଜାତୀୟ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ରାମସାର ଆର୍ଦ୍ରଭୂମି (Ramsar Sites) ଅଛି?',
    options_en: ['2', '4', '6', '8'],
    options_or: ['୨', '୪', '୬', '୮'],
    correct_index: 2,
    explanation_en: 'Odisha has 6 Ramsar sites: Chilika Lake, Bhitarkanika Mangroves, Satkosia Gorge, Tampara Lake, Hirakud Reservoir, and Ansupa Lake.',
    explanation_or: 'ଓଡ଼ିଶାରେ ୬ଟି ରାମସାର ସ୍ଥଳ ଅଛି: ଚିଲିକା, ଭିତରକନିକା, ସାତକୋଶିଆ, ତାମ୍ପରା, ହୀରାକୁଦ ଓ ଅଂଶୁପା।'
  }
];

function classifyOdishaTab(blob) {
  const hay = String(blob || '').toLowerCase();
  if (/history|kalinga|paika|utkal|freedom|1936|1817|kharavela|temple history/.test(hay)) return { tab_key: 'history', category_label: 'History & Freedom Movement' };
  if (/geography|river|mahanadi|chilika|bhitarkanika|satkosia|ramsar|peak|deomali|simlipal|climate/.test(hay)) return { tab_key: 'geography', category_label: 'Geography & Rivers' };
  if (/gi tag|odissi|pattachitra|sambalpuri|heritage|culture|festival|art|craft|rasagola|literature/.test(hay)) return { tab_key: 'culture', category_label: 'Art, Culture & GI Tags' };
  return { tab_key: 'governance', category_label: 'State Governance & Updates' };
}

export async function buildOdishaHubPayload(db) {
  const [caRows, guideRows, schemeRows] = db
    ? await Promise.all([
        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, publish_date, updated_at
           FROM cso_current_affairs
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(publish_date, ''), updated_at) DESC
           LIMIT 50`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, category, tags, scope,
                  published_at, updated_at
           FROM informative_guides
           WHERE status = 'published'
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 100`
        ).all().then((r) => r.results || []).catch(() => []),

        db.prepare(
          `SELECT id, slug, title_en, title_or, summary_en, summary_or, department_en,
                  published_at, updated_at
           FROM scheme_articles
           WHERE is_published = 1
             AND (scheduled_publish_at = '' OR scheduled_publish_at IS NULL OR scheduled_publish_at <= datetime('now'))
           ORDER BY COALESCE(NULLIF(published_at, ''), updated_at) DESC
           LIMIT 30`
        ).all().then((r) => r.results || []).catch(() => [])
      ])
    : [[], [], []];

  const items = CORE_ODISHA_CAPSULES.map((c) => ({ ...c }));
  const seen = new Set(items.map((x) => x.id));

  for (const g of guideRows) {
    const blob = `${g.title_en || ''} ${g.summary_en || ''} ${g.tags || ''} ${g.category || ''}`;
    const isOdisha =
      matchGuideToTopic(g, 'odisha-gk') ||
      /(odisha-gk|odisha-special|heritage|district)/i.test(`${g.category || ''} ${g.tags || ''}`);
    if (!isOdisha) continue;
    const slug = cleanText(g.slug || g.id, 140);
    const id = `guide_${slug}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const cls = classifyOdishaTab(blob);
    items.push({
      id,
      title_en: cleanText(g.title_en, 220),
      title_or: cleanText(g.title_or, 220),
      summary_en: cleanText(g.summary_en, 240),
      summary_or: cleanText(g.summary_or, 240),
      tab_key: cls.tab_key,
      category_label: cls.category_label,
      detail_url: slug ? `/guides/${encodeURIComponent(slug)}` : '/guides/?category=odisha-gk',
      source_type: 'guide'
    });
  }

  for (const ca of caRows) {
    const blob = `${ca.title_en || ''} ${ca.summary_en || ''} ${ca.category || ''}`;
    if (!/odisha|utkal|bhubaneswar|cuttack|puri|sambalpur|state/i.test(blob)) continue;
    const slug = cleanText(ca.slug || ca.id, 140);
    const id = `ca_${slug}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const cls = classifyOdishaTab(blob);
    items.push({
      id,
      title_en: cleanText(ca.title_en, 220),
      title_or: cleanText(ca.title_or, 220),
      summary_en: cleanText(ca.summary_en, 240),
      summary_or: cleanText(ca.summary_or, 240),
      tab_key: cls.tab_key,
      category_label: cls.category_label,
      detail_url: slug ? `/current-affairs/?slug=${encodeURIComponent(slug)}` : '/current-affairs/',
      source_type: 'current_affairs'
    });
  }

  for (const s of schemeRows) {
    const slug = cleanText(s.slug || s.id, 140);
    const id = `scheme_${slug}`;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      title_en: cleanText(s.title_en, 220),
      title_or: cleanText(s.title_or, 220),
      summary_en: cleanText(s.summary_en, 240),
      summary_or: cleanText(s.summary_or, 240),
      tab_key: 'governance',
      category_label: 'State Governance & Updates',
      detail_url: slug ? `/schemes/?slug=${encodeURIComponent(slug)}` : '/schemes/',
      source_type: 'scheme'
    });
  }

  return {
    ok: true,
    version: 'v377',
    generated_at: new Date().toISOString(),
    summary: {
      districts_covered: ODISHA_30_DISTRICTS_ATLAS.length,
      gk_capsules: items.length,
      gi_and_culture_highlights: 16,
      live_state_updates: items.filter((i) => i.source_type !== 'capsule').length + CORE_ODISHA_CAPSULES.length
    },
    districts: ODISHA_30_DISTRICTS_ATLAS,
    items,
    odisha_quiz: ODISHA_GK_QUIZ
  };
}

export async function handlePublicOdishaHubApi(request, env) {
  const url = new URL(request.url);
  const payload = await buildOdishaHubPayload(env && env.DB);
  const division = cleanText(url.searchParams.get('division'), 30).toLowerCase();
  const tab = cleanText(url.searchParams.get('tab') || url.searchParams.get('category'), 30).toLowerCase();
  const q = cleanText(url.searchParams.get('q') || url.searchParams.get('search'), 120).toLowerCase();

  let districts = payload.districts;
  if (division && division !== 'all') {
    districts = districts.filter((d) => d.division.toLowerCase() === division);
  }
  let items = payload.items;
  if (tab && tab !== 'all') {
    items = items.filter((i) => i.tab_key === tab);
  }
  if (q) {
    districts = districts.filter((d) => `${d.name_en} ${d.name_or} ${d.hq_en} ${d.famous_for_en}`.toLowerCase().includes(q));
    items = items.filter((i) => `${i.title_en} ${i.title_or} ${i.summary_en} ${i.category_label}`.toLowerCase().includes(q));
  }

  return json(
    {
      ...payload,
      districts,
      items
    },
    200,
    {
      'Cache-Control': 'public, max-age=15, s-maxage=120, stale-while-revalidate=60',
      'X-CSO-Odisha-Hub': 'v377'
    }
  );
}

export async function onRequestGet({ request, env }) {
  return handlePublicOdishaHubApi(request, env);
}
