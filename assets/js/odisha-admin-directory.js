/**
 * Common Sense Odisha — Interactive Odisha 30-District & 314-Block Administrative Directory (v418)
 * Mounted inside /odisha-special/ (#cso-odisha-admin-directory-root).
 * Complete exact Odisha state dataset: 30 Districts, 3 Revenue Divisions, 58 Sub-Divisions, 314 Blocks.
 * Strict CSP-compliant: DOM APIs only (document.createElement / textContent / addEventListener).
 * Zero inline styles or on* handlers; bilingual EN / ଓଡ଼ିଆ; localStorage filter persistence;
 * synced with window.CSODistrictFilter, window.CSOWatchlist & /api/public/search-index.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOOdishaAdminDirectory = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOOdishaAdminDirectory = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v418';
  var ROOT_ID = 'cso-odisha-admin-directory-root';
  var PREFS_KEY = 'cso_odisha_admin_dir_prefs_v1';
  var EDISTRICT_URL = 'https://edistrict.odisha.gov.in/';

  var DIVISIONS = [
    { key: 'all', en: 'All Divisions', or: 'ସମସ୍ତ ଡିଭିଜନ୍', hq: 'Odisha (Statewide)' },
    { key: 'central', en: 'Central Division', or: 'କେନ୍ଦ୍ରୀୟ ଡିଭିଜନ୍', hq: 'Cuttack' },
    { key: 'northern', en: 'Northern Division', or: 'ଉତ୍ତରାଞ୍ଚଳ ଡିଭିଜନ୍', hq: 'Sambalpur' },
    { key: 'southern', en: 'Southern Division', or: 'ଦକ୍ଷିଣାଞ୍ଚଳ ଡିଭିଜନ୍', hq: 'Berhampur' }
  ];

  var DISTRICTS = [
    // ===== 1. CENTRAL DIVISION (10 Districts, 17 Sub-Divisions, 115 Blocks) =====
    {
      slug: 'balasore',
      en: 'Balasore',
      or: 'ବାଲେଶ୍ୱର',
      division: 'central',
      hq: 'Balasore',
      portal: 'https://baleswar.odisha.gov.in/',
      collectorate: 'Collectorate, Balasore (Near Fakir Mohan Golai, Balasore - 756001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Balasore, Nilagiri, Soro, Jaleswar, Basta)',
      examCenters: ['Balasore Town', 'Remuna', 'Soro', 'Jaleswar'],
      subDivisions: ['Balasore', 'Nilagiri'],
      blocks: [
        'Bahanaga', 'Balasore Sadar', 'Baliapal', 'Basta', 'Bhograi', 'Jaleswar',
        'Khaira', 'Nilagiri', 'Oupada', 'Remuna', 'Simulia', 'Soro'
      ]
    },
    {
      slug: 'bhadrak',
      en: 'Bhadrak',
      or: 'ଭଦ୍ରକ',
      division: 'central',
      hq: 'Bhadrak',
      portal: 'https://bhadrak.odisha.gov.in/',
      collectorate: 'Collectorate, Bhadrak (Salandi By-Pass, Bhadrak - 756100)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Bhadrak, Chandbali, Dhamnagar, Basudevpur)',
      examCenters: ['Bhadrak Town', 'Charampa', 'Balasore (Nearby CBT)'],
      subDivisions: ['Bhadrak'],
      blocks: [
        'Bant', 'Basudevpur', 'Bhadrak', 'Bhandaripokhari', 'Chandbali', 'Dhamnagar', 'Tihidi'
      ]
    },
    {
      slug: 'cuttack',
      en: 'Cuttack',
      or: 'କଟକ',
      division: 'central',
      hq: 'Cuttack',
      portal: 'https://cuttack.odisha.gov.in/',
      collectorate: 'Collectorate, Cuttack (Chandini Chowk, Cuttack - 753002 · RDC Central HQ)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Cuttack Sadar, Athagarh, Banki, Salipur)',
      examCenters: ['Cuttack City', 'CDA Sector', 'Choudwar', 'Bhubaneswar (Twin City CBT)'],
      subDivisions: ['Cuttack Sadar', 'Athagarh', 'Banki'],
      blocks: [
        'Athagarh', 'Badamba', 'Banki', 'Banki-Dampara', 'Baranga', 'Cuttack Sadar',
        'Kantapada', 'Mahanga', 'Narasinghpur', 'Niali', 'Nischintakoili', 'Salipur',
        'Tangi-Choudwar', 'Tigiria'
      ]
    },
    {
      slug: 'jagatsinghpur',
      en: 'Jagatsinghpur',
      or: 'ଜଗତସିଂହପୁର',
      division: 'central',
      hq: 'Jagatsinghpur',
      portal: 'https://jagatsinghpur.odisha.gov.in/',
      collectorate: 'Collectorate, Jagatsinghpur (Court Chhak, Jagatsinghpur - 754103)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Jagatsinghpur, Kujang, Tirtol, Balikuda)',
      examCenters: ['Jagatsinghpur Town', 'Paradip', 'Cuttack (Nearby CBT)'],
      subDivisions: ['Jagatsinghpur'],
      blocks: [
        'Balikuda', 'Biridi', 'Erasama', 'Jagatsinghpur', 'Kujang', 'Naugaon',
        'Raghunathpur', 'Tirtol'
      ]
    },
    {
      slug: 'jajpur',
      en: 'Jajpur',
      or: 'ଯାଜପୁର',
      division: 'central',
      hq: 'Panikoili / Jajpur Town',
      portal: 'https://jajpur.odisha.gov.in/',
      collectorate: 'Collectorate, Jajpur (Jajpur Town / Panikoili - 755001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Jajpur, Vyasanagar, Dharmasala, Sukinda)',
      examCenters: ['Jajpur Town', 'Vyasanagar (Jajpur Road)', 'Cuttack (Nearby CBT)'],
      subDivisions: ['Jajpur'],
      blocks: [
        'Badachana', 'Bari', 'Binjharpur', 'Danagadi', 'Dasarathpur', 'Dharmasala',
        'Jajpur', 'Korei', 'Rasulpur', 'Sukinda'
      ]
    },
    {
      slug: 'kendrapara',
      en: 'Kendrapara',
      or: 'କେନ୍ଦ୍ରାପଡ଼ା',
      division: 'central',
      hq: 'Kendrapara',
      portal: 'https://kendrapara.odisha.gov.in/',
      collectorate: 'Collectorate, Kendrapara (Collectorate Road, Kendrapara - 754211)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Kendrapara, Pattamundai, Aul, Rajnagar)',
      examCenters: ['Kendrapara Town', 'Pattamundai', 'Cuttack (Nearby CBT)'],
      subDivisions: ['Kendrapara'],
      blocks: [
        'Aul', 'Derabish', 'Garadpur', 'Kendrapara', 'Mahakalapada', 'Marshaghai',
        'Pattamundai', 'Rajkanika', 'Rajnagar'
      ]
    },
    {
      slug: 'khordha',
      en: 'Khordha',
      or: 'ଖୋର୍ଦ୍ଧା',
      division: 'central',
      hq: 'Khordha',
      portal: 'https://khordha.odisha.gov.in/',
      collectorate: 'Collectorate, Khordha (Palla, Khordha - 752056 · State Capital Bhubaneswar)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Bhubaneswar, Khordha, Jatni, Banpur)',
      examCenters: ['Bhubaneswar (Major CBT Hub)', 'Patia / Infocity', 'Jatni', 'Khordha Town'],
      subDivisions: ['Bhubaneswar', 'Khordha'],
      blocks: [
        'Balianta', 'Balipatna', 'Banpur', 'Begunia', 'Bhubaneswar', 'Bolagarh',
        'Chilika', 'Jatni', 'Khordha', 'Tangi'
      ]
    },
    {
      slug: 'mayurbhanj',
      en: 'Mayurbhanj',
      or: 'ମୟୂରଭଞ୍ଜ',
      division: 'central',
      hq: 'Baripada',
      portal: 'https://mayurbhanj.odisha.gov.in/',
      collectorate: 'Collectorate, Mayurbhanj (Kacheri Road, Baripada - 757001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Baripada, Rairangpur, Karanjia, Udala)',
      examCenters: ['Baripada', 'Rairangpur', 'Karanjia', 'Balasore (Nearby CBT)'],
      subDivisions: ['Baripada', 'Bamanghaty (Rairangpur)', 'Kaptipada (Udala)', 'Panchpir (Karanjia)'],
      blocks: [
        'Badasahi', 'Bahalda', 'Bangriposi', 'Baripada', 'Betnoti', 'Bijatala',
        'Bisoi', 'Gopabandhunagar', 'Jamda', 'Jashipur', 'Kaptipada', 'Karanjia',
        'Khunta', 'Kuliana', 'Kusumi', 'Morada', 'Rairangpur', 'Raruan',
        'Rasgovindpur', 'Samakhunta', 'Saraskana', 'Sukruli', 'Suliapada',
        'Thakurmunda', 'Tiring', 'Udala'
      ]
    },
    {
      slug: 'nayagarh',
      en: 'Nayagarh',
      or: 'ନୟାଗଡ଼',
      division: 'central',
      hq: 'Nayagarh',
      portal: 'https://nayagarh.odisha.gov.in/',
      collectorate: 'Collectorate, Nayagarh (Old Town, Nayagarh - 752069)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Nayagarh, Daspalla, Khandapada, Ranpur)',
      examCenters: ['Nayagarh Town', 'Bhubaneswar (Nearby CBT)', 'Khordha'],
      subDivisions: ['Nayagarh'],
      blocks: [
        'Bhapur', 'Daspalla', 'Gania', 'Khandapada', 'Nayagarh', 'Nuagaon',
        'Odagaon', 'Ranpur'
      ]
    },
    {
      slug: 'puri',
      en: 'Puri',
      or: 'ପୁରୀ',
      division: 'central',
      hq: 'Puri',
      portal: 'https://puri.odisha.gov.in/',
      collectorate: 'Collectorate, Puri (VIP Road, Puri - 752001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Puri Sadar, Pipili, Nimapada, Konark)',
      examCenters: ['Puri Town', 'Pipili', 'Bhubaneswar (Nearby CBT)'],
      subDivisions: ['Puri'],
      blocks: [
        'Astaranga', 'Brahmagiri', 'Delang', 'Gop', 'Kakatpur', 'Kanas',
        'Krushnaprasad', 'Nimapada', 'Pipili', 'Puri Sadar', 'Satyabadi'
      ]
    },

    // ===== 2. NORTHERN DIVISION (10 Districts, 25 Sub-Divisions, 95 Blocks) =====
    {
      slug: 'angul',
      en: 'Angul',
      or: 'ଅନୁଗୁଳ',
      division: 'northern',
      hq: 'Angul',
      portal: 'https://angul.odisha.gov.in/',
      collectorate: 'Collectorate, Angul (Hakimpada, Angul - 759122)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Angul, Talcher, Athmallik, Pallahara)',
      examCenters: ['Angul Town', 'Talcher', 'Dhenkanal / Cuttack (Nearby CBT)'],
      subDivisions: ['Angul', 'Athmallik', 'Pallahara', 'Talcher'],
      blocks: [
        'Angul', 'Athmallik', 'Banarpal', 'Chhendipada', 'Kaniha', 'Kishorenagar',
        'Pallahara', 'Talcher'
      ]
    },
    {
      slug: 'balangir',
      en: 'Balangir',
      or: 'ବଲାଙ୍ଗୀର',
      division: 'northern',
      hq: 'Balangir',
      portal: 'https://balangir.odisha.gov.in/',
      collectorate: 'Collectorate, Balangir (Kacheri Chhak, Balangir - 767001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Balangir, Patnagarh, Titilagarh, Kantabanji)',
      examCenters: ['Balangir Town', 'Titilagarh', 'Sambalpur (Nearby CBT)'],
      subDivisions: ['Balangir', 'Patnagarh', 'Titilagarh'],
      blocks: [
        'Agalpur', 'Balangir', 'Bangomunda', 'Belpada', 'Deogaon', 'Gudvela',
        'Khaprakhol', 'Loisingha', 'Muribahal', 'Patnagarh', 'Puintala', 'Saintala',
        'Titilagarh', 'Turekela'
      ]
    },
    {
      slug: 'bargarh',
      en: 'Bargarh',
      or: 'ବରଗଡ଼',
      division: 'northern',
      hq: 'Bargarh',
      portal: 'https://bargarh.odisha.gov.in/',
      collectorate: 'Collectorate, Bargarh (NH-53, Bargarh - 768028)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Bargarh, Padampur, Attabira, Barpali)',
      examCenters: ['Bargarh Town', 'Padampur', 'Sambalpur (Nearby CBT)'],
      subDivisions: ['Bargarh', 'Padampur'],
      blocks: [
        'Ambabhona', 'Attabira', 'Bargarh', 'Barpali', 'Bhatli', 'Bheden',
        'Bijepur', 'Gaisilet', 'Jharbandh', 'Padampur', 'Paikmal', 'Sohela'
      ]
    },
    {
      slug: 'deogarh',
      en: 'Deogarh',
      or: 'ଦେବଗଡ଼',
      division: 'northern',
      hq: 'Deogarh',
      portal: 'https://deogarh.odisha.gov.in/',
      collectorate: 'Collectorate, Deogarh (Rajabati, Deogarh - 768108)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Deogarh, Barkote, Reamal)',
      examCenters: ['Deogarh Town', 'Sambalpur (Nearby CBT)', 'Rourkela (Nearby CBT)'],
      subDivisions: ['Deogarh'],
      blocks: ['Barkote', 'Reamal', 'Tileibani']
    },
    {
      slug: 'dhenkanal',
      en: 'Dhenkanal',
      or: 'ଢେଙ୍କାନାଳ',
      division: 'northern',
      hq: 'Dhenkanal',
      portal: 'https://dhenkanal.odisha.gov.in/',
      collectorate: 'Collectorate, Dhenkanal (Meenakshi Bazar, Dhenkanal - 759001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Dhenkanal, Kamakhyanagar, Hindol, Bhuban)',
      examCenters: ['Dhenkanal Town', 'Kamakhyanagar', 'Cuttack (Nearby CBT)'],
      subDivisions: ['Dhenkanal', 'Hindol', 'Kamakhyanagar'],
      blocks: [
        'Bhuban', 'Dhenkanal Sadar', 'Gondia', 'Hindol', 'Kamakhyanagar',
        'Kankadahad', 'Odapada', 'Parjang'
      ]
    },
    {
      slug: 'jharsuguda',
      en: 'Jharsuguda',
      or: 'ଝାରସୁଗୁଡ଼ା',
      division: 'northern',
      hq: 'Jharsuguda',
      portal: 'https://jharsuguda.odisha.gov.in/',
      collectorate: 'Collectorate, Jharsuguda (OSAP Road, Jharsuguda - 768204)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Jharsuguda, Brajrajnagar, Belpahar, Lakhanpur)',
      examCenters: ['Jharsuguda Town', 'Brajrajnagar', 'Sambalpur / Rourkela (CBT)'],
      subDivisions: ['Jharsuguda'],
      blocks: ['Jharsuguda', 'Kirmira', 'Kolabira', 'Laikera', 'Lakhanpur']
    },
    {
      slug: 'kendujhar',
      en: 'Kendujhar',
      or: 'କେନ୍ଦୁଝର',
      division: 'northern',
      hq: 'Kendujhar',
      portal: 'https://kendujhar.odisha.gov.in/',
      collectorate: 'Collectorate, Kendujhar (Keonjhargarh, Kendujhar - 758001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Kendujhar, Anandapur, Champua, Barbil)',
      examCenters: ['Kendujhar Town', 'Anandapur', 'Barbil / Joda'],
      subDivisions: ['Anandapur', 'Champua', 'Kendujhar'],
      blocks: [
        'Anandapur', 'Banspal', 'Champua', 'Ghasipura', 'Ghatgaon', 'Harichandanpur',
        'Hatadihi', 'Jhumpura', 'Joda', 'Kendujhar Sadar', 'Patna', 'Saharpada', 'Telkoi'
      ]
    },
    {
      slug: 'sambalpur',
      en: 'Sambalpur',
      or: 'ସମ୍ବଲପୁର',
      division: 'northern',
      hq: 'Sambalpur',
      portal: 'https://sambalpur.odisha.gov.in/',
      collectorate: 'Collectorate, Sambalpur (Kacheri Road, Sambalpur - 768001 · RDC Northern HQ)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Sambalpur, Burla, Kuchinda, Rairakhol)',
      examCenters: ['Sambalpur City (Major CBT Hub)', 'Burla', 'Hirakud'],
      subDivisions: ['Kuchinda', 'Rairakhol', 'Sambalpur'],
      blocks: [
        'Bamra', 'Dhankauda', 'Jamankira', 'Jujomura', 'Kuchinda', 'Maneswar',
        'Naktideul', 'Rairakhol', 'Rengali'
      ]
    },
    {
      slug: 'subarnapur',
      en: 'Subarnapur',
      or: 'ସୁବର୍ଣ୍ଣପୁର',
      division: 'northern',
      hq: 'Sonepur',
      portal: 'https://subarnapur.odisha.gov.in/',
      collectorate: 'Collectorate, Subarnapur (Sonepur - 767017)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Sonepur, Birmaharajpur, Binika, Tarbha)',
      examCenters: ['Sonepur Town', 'Balangir', 'Sambalpur (Nearby CBT)'],
      subDivisions: ['Birmaharajpur', 'Sonepur'],
      blocks: ['Binika', 'Birmaharajpur', 'Dunguripali', 'Sonepur', 'Tarbha', 'Ullunda']
    },
    {
      slug: 'sundargarh',
      en: 'Sundargarh',
      or: 'ସୁନ୍ଦରଗଡ଼',
      division: 'northern',
      hq: 'Sundargarh',
      portal: 'https://sundargarh.odisha.gov.in/',
      collectorate: 'Collectorate, Sundargarh (Sankara, Sundargarh - 770001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Sundargarh, Rourkela/Panposh, Bonai, Rajgangpur)',
      examCenters: ['Rourkela (Major CBT Hub)', 'Sundargarh Town', 'Rajgangpur'],
      subDivisions: ['Bonai', 'Panposh (Rourkela)', 'Sundargarh'],
      blocks: [
        'Balisankara', 'Bargaon', 'Bisra', 'Bonaigarh', 'Gurundia', 'Hemgir',
        'Koira', 'Kuanrmunda', 'Kutra', 'Lahunipara', 'Lathikata', 'Lefripada',
        'Nuagaon (Panposh)', 'Rajgangpur', 'Subdega', 'Sundargarh Sadar', 'Tangarpali'
      ]
    },

    // ===== 3. SOUTHERN DIVISION (10 Districts, 16 Sub-Divisions, 104 Blocks) =====
    {
      slug: 'boudh',
      en: 'Boudh',
      or: 'ବୌଦ୍ଧ',
      division: 'southern',
      hq: 'Boudh',
      portal: 'https://boudh.odisha.gov.in/',
      collectorate: 'Collectorate, Boudh (Boudhgarh, Boudh - 762014)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Boudh, Harabhanga, Kantamal)',
      examCenters: ['Boudh Town', 'Phulbani', 'Sambalpur (Nearby CBT)'],
      subDivisions: ['Boudh'],
      blocks: ['Boudh', 'Harabhanga', 'Kantamal']
    },
    {
      slug: 'gajapati',
      en: 'Gajapati',
      or: 'ଗଜପତି',
      division: 'southern',
      hq: 'Paralakhemundi',
      portal: 'https://gajapati.odisha.gov.in/',
      collectorate: 'Collectorate, Gajapati (Paralakhemundi - 761200)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Paralakhemundi, Kashinagar, Mohana, R. Udayagiri)',
      examCenters: ['Paralakhemundi', 'Berhampur (Nearby CBT)'],
      subDivisions: ['Paralakhemundi'],
      blocks: [
        'Gosani', 'Gumma', 'Kashinagar', 'Mohana', 'Nuagada', 'R. Udayagiri',
        'Rayagada (Gajapati)'
      ]
    },
    {
      slug: 'ganjam',
      en: 'Ganjam',
      or: 'ଗଞ୍ଜାମ',
      division: 'southern',
      hq: 'Chhatrapur',
      portal: 'https://ganjam.odisha.gov.in/',
      collectorate: 'Collectorate, Ganjam (Chhatrapur - 761020 · RDC Southern HQ: Berhampur)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Chhatrapur, Berhampur, Bhanjanagar, Aska)',
      examCenters: ['Berhampur (Major CBT Hub)', 'Chhatrapur', 'Bhanjanagar', 'Aska'],
      subDivisions: ['Berhampur', 'Bhanjanagar', 'Chhatrapur'],
      blocks: [
        'Aska', 'Beguniapada', 'Bellaguntha', 'Bhanjanagar', 'Buguda', 'Chhatrapur',
        'Chikiti', 'Dharakote', 'Digapahandi', 'Ganjam', 'Hinjilicut', 'Jagannathprasad',
        'Kabisuryanagar', 'Khallikote', 'Kukudakhandi', 'Patrapur', 'Polasara',
        'Purusottampur', 'Rangeilunda', 'Sanakhemundi', 'Seragada', 'Surada'
      ]
    },
    {
      slug: 'kalahandi',
      en: 'Kalahandi',
      or: 'କଳାହାଣ୍ଡି',
      division: 'southern',
      hq: 'Bhawanipatna',
      portal: 'https://kalahandi.odisha.gov.in/',
      collectorate: 'Collectorate, Kalahandi (Bhawanipatna - 766001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Bhawanipatna, Dharamgarh, Junagarh, Kesinga)',
      examCenters: ['Bhawanipatna', 'Dharamgarh', 'Junagarh', 'Kesinga'],
      subDivisions: ['Bhawanipatna', 'Dharamgarh'],
      blocks: [
        'Bhawanipatna', 'Dharamgarh', 'Golamunda', 'Jaipatna', 'Junagarh', 'Kalampur',
        'Karlamunda', 'Kesinga', 'Koksara', 'Lanjigarh', 'Madanpur Rampur', 'Narla',
        'Thuamul Rampur'
      ]
    },
    {
      slug: 'kandhamal',
      en: 'Kandhamal',
      or: 'କନ୍ଧମାଳ',
      division: 'southern',
      hq: 'Phulbani',
      portal: 'https://kandhamal.odisha.gov.in/',
      collectorate: 'Collectorate, Kandhamal (Phulbani - 762001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Phulbani, Balliguda, G. Udayagiri, Daringbadi)',
      examCenters: ['Phulbani', 'Balliguda', 'Berhampur (Nearby CBT)'],
      subDivisions: ['Balliguda', 'Phulbani'],
      blocks: [
        'Balliguda', 'Chakapad', 'Daringbadi', 'G. Udayagiri', 'K. Nuagaon',
        'Khajuripada', 'Kotagarh', 'Phiringia', 'Phulbani', 'Raikia', 'Tikabali',
        'Tumudibandha'
      ]
    },
    {
      slug: 'koraput',
      en: 'Koraput',
      or: 'କୋରାପୁଟ',
      division: 'southern',
      hq: 'Koraput',
      portal: 'https://koraput.odisha.gov.in/',
      collectorate: 'Collectorate, Koraput (Koraput - 764020)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Koraput, Jeypore, Sunabeda, Semiliguda)',
      examCenters: ['Jeypore (Major CBT Hub)', 'Koraput Town', 'Sunabeda'],
      subDivisions: ['Jeypore', 'Koraput'],
      blocks: [
        'Bandhugaon', 'Boipariguda', 'Borigumma', 'Dasamantpur', 'Jeypore', 'Koraput',
        'Kotpad', 'Kundra', 'Lamtaput', 'Laxmipur', 'Nandapur', 'Narayanpatna',
        'Pottangi', 'Semiliguda'
      ]
    },
    {
      slug: 'malkangiri',
      en: 'Malkangiri',
      or: 'ମାଲକାନଗିରି',
      division: 'southern',
      hq: 'Malkangiri',
      portal: 'https://malkangiri.odisha.gov.in/',
      collectorate: 'Collectorate, Malkangiri (DNK Road, Malkangiri - 764048)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Malkangiri, Kalimela, Chitrakonda, Mathili)',
      examCenters: ['Malkangiri Town', 'Jeypore (Nearby CBT)'],
      subDivisions: ['Malkangiri'],
      blocks: [
        'Chitrakonda', 'Kalimela', 'Khairput', 'Korukonda', 'Kudumulugumma',
        'Malkangiri', 'Mathili'
      ]
    },
    {
      slug: 'nabarangpur',
      en: 'Nabarangpur',
      or: 'ନବରଙ୍ଗପୁର',
      division: 'southern',
      hq: 'Nabarangpur',
      portal: 'https://nabarangpur.odisha.gov.in/',
      collectorate: 'Collectorate, Nabarangpur (Mirganiguda, Nabarangpur - 764059)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Nabarangpur, Umerkote, Papadahandi, Raighar)',
      examCenters: ['Nabarangpur Town', 'Umerkote', 'Jeypore (Nearby CBT)'],
      subDivisions: ['Nabarangpur'],
      blocks: [
        'Chandahandi', 'Dabugaon', 'Jharigaon', 'Kosagumuda', 'Nabarangpur',
        'Nandahandi', 'Papadahandi', 'Raighar', 'Tentulikhunti', 'Umerkote'
      ]
    },
    {
      slug: 'nuapada',
      en: 'Nuapada',
      or: 'ନୂଆପଡ଼ା',
      division: 'southern',
      hq: 'Nuapada',
      portal: 'https://nuapada.odisha.gov.in/',
      collectorate: 'Collectorate, Nuapada (Mini Stadium Road, Nuapada - 766105)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Nuapada, Khariar, Komna, Sinapali)',
      examCenters: ['Nuapada Town', 'Khariar', 'Bhawanipatna / Balangir (Nearby CBT)'],
      subDivisions: ['Nuapada'],
      blocks: ['Boden', 'Khariar', 'Komna', 'Nuapada', 'Sinapali']
    },
    {
      slug: 'rayagada',
      en: 'Rayagada',
      or: 'ରାୟଗଡ଼ା',
      division: 'southern',
      hq: 'Rayagada',
      portal: 'https://rayagada.odisha.gov.in/',
      collectorate: 'Collectorate, Rayagada (New Colony, Rayagada - 765001)',
      edistrict: 'e-District & Tehsil Sewa Kendra (Rayagada, Gunupur, Bissam Cuttack, Muniguda)',
      examCenters: ['Rayagada Town', 'Gunupur', 'Jeypore / Berhampur (Nearby CBT)'],
      subDivisions: ['Gunupur', 'Rayagada'],
      blocks: [
        'Bissam Cuttack', 'Chandrapur', 'Gudari', 'Gunupur', 'Kalyansinghpur',
        'Kashipur', 'Kolnara', 'Muniguda', 'Padmapur', 'Ramanaguda', 'Rayagada Sadar'
      ]
    }
  ];

  function getTotals() {
    var byDivision = { central: { districts: 0, subDivisions: 0, blocks: 0 }, northern: { districts: 0, subDivisions: 0, blocks: 0 }, southern: { districts: 0, subDivisions: 0, blocks: 0 } };
    var totalSubDivisions = 0;
    var totalBlocks = 0;
    for (var i = 0; i < DISTRICTS.length; i += 1) {
      var d = DISTRICTS[i];
      var subCount = d.subDivisions.length;
      var blkCount = d.blocks.length;
      totalSubDivisions += subCount;
      totalBlocks += blkCount;
      if (byDivision[d.division]) {
        byDivision[d.division].districts += 1;
        byDivision[d.division].subDivisions += subCount;
        byDivision[d.division].blocks += blkCount;
      }
    }
    return {
      districts: DISTRICTS.length,
      divisions: 3,
      subDivisions: totalSubDivisions,
      blocks: totalBlocks,
      byDivision: byDivision
    };
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function getDivisionLabel(divKey, orMode) {
    for (var i = 0; i < DIVISIONS.length; i += 1) {
      if (DIVISIONS[i].key === divKey) {
        return orMode ? DIVISIONS[i].or : DIVISIONS[i].en;
      }
    }
    return divKey;
  }

  function getDistrictLinks(slug) {
    var clean = encodeURIComponent(String(slug || '').trim().toLowerCase());
    return {
      jobs: '/jobs/?district=' + clean,
      updates: '/updates/?district=' + clean,
      edistrict: EDISTRICT_URL
    };
  }

  function filterDistricts(options) {
    var opts = options || {};
    var div = norm(opts.division || 'all');
    var distSlug = norm(opts.district || '');
    var q = norm(opts.query || '');
    var results = [];

    for (var i = 0; i < DISTRICTS.length; i += 1) {
      var d = DISTRICTS[i];
      if (div && div !== 'all' && d.division !== div) continue;
      if (distSlug && d.slug !== distSlug) continue;

      var matchedBlocks = [];
      var matchedSubDivisions = [];
      var matchedExamCenters = [];
      var isMatch = !q;

      if (q) {
        if (
          norm(d.en).indexOf(q) !== -1 ||
          norm(d.or).indexOf(q) !== -1 ||
          norm(d.slug).indexOf(q) !== -1 ||
          norm(d.hq).indexOf(q) !== -1 ||
          norm(d.division).indexOf(q) !== -1 ||
          norm(d.collectorate).indexOf(q) !== -1 ||
          norm(d.edistrict).indexOf(q) !== -1
        ) {
          isMatch = true;
        }
        for (var s = 0; s < d.subDivisions.length; s += 1) {
          if (norm(d.subDivisions[s]).indexOf(q) !== -1) {
            matchedSubDivisions.push(d.subDivisions[s]);
            isMatch = true;
          }
        }
        for (var b = 0; b < d.blocks.length; b += 1) {
          if (norm(d.blocks[b]).indexOf(q) !== -1) {
            matchedBlocks.push(d.blocks[b]);
            isMatch = true;
          }
        }
        for (var e = 0; e < d.examCenters.length; e += 1) {
          if (norm(d.examCenters[e]).indexOf(q) !== -1) {
            matchedExamCenters.push(d.examCenters[e]);
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        results.push({
          district: d,
          matchedBlocks: matchedBlocks,
          matchedSubDivisions: matchedSubDivisions,
          matchedExamCenters: matchedExamCenters,
          links: getDistrictLinks(d.slug)
        });
      }
    }
    return results;
  }

  function loadPrefs() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(PREFS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            division: ['all', 'central', 'northern', 'southern'].indexOf(parsed.division) !== -1 ? parsed.division : 'all',
            district: typeof parsed.district === 'string' ? parsed.district : '',
            query: typeof parsed.query === 'string' ? parsed.query.slice(0, 80) : ''
          };
        }
      }
    } catch (_) {}
    return { division: 'all', district: '', query: '' };
  }

  function savePrefs(prefs) {
    try {
      if (win && win.localStorage) {
        win.localStorage.setItem(PREFS_KEY, JSON.stringify({
          division: prefs.division || 'all',
          district: prefs.district || '',
          query: String(prefs.query || '').slice(0, 80)
        }));
      }
    } catch (_) {}
  }

  function detectLang() {
    try {
      var root = doc && doc.documentElement;
      if (root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or')) return 'or';
      var activeBtn = doc && doc.querySelector('.cso-od-lang-btn.is-active');
      if (activeBtn && activeBtn.getAttribute('data-lang') === 'or') return 'or';
    } catch (_) {}
    return 'en';
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function getPinnedDistricts() {
    try {
      var wl = win && win.CSOWatchlist;
      if (wl && typeof wl.loadPreferences === 'function') {
        var prefs = wl.loadPreferences();
        return Array.isArray(prefs && prefs.districts) ? prefs.districts : [];
      }
    } catch (_) {}
    return [];
  }

  function togglePinDistrict(slug) {
    try {
      var wl = win && win.CSOWatchlist;
      if (!wl || typeof wl.loadPreferences !== 'function' || typeof wl.savePreferences !== 'function') return false;
      var prefs = wl.loadPreferences();
      var list = Array.isArray(prefs.districts) ? prefs.districts.slice() : [];
      var idx = list.indexOf(slug);
      var pinned = false;
      if (idx === -1) {
        list.push(slug);
        pinned = true;
      } else {
        list.splice(idx, 1);
        pinned = false;
      }
      wl.savePreferences({
        districts: list,
        tracks: prefs.tracks || [],
        keywords: prefs.keywords || []
      });
      return pinned;
    } catch (_) {
      return false;
    }
  }

  function computeLiveCounts(items) {
    var counts = {};
    var dfApi = win && win.CSODistrictFilter;
    var list = Array.isArray(items) ? items : [];
    var nonHub = list.filter(function (it) { return it && it.type !== 'hub'; });
    for (var i = 0; i < DISTRICTS.length; i += 1) {
      var slug = DISTRICTS[i].slug;
      var n = 0;
      for (var k = 0; k < nonHub.length; k += 1) {
        if (dfApi && typeof dfApi.matchDistrict === 'function') {
          if (dfApi.matchDistrict(nonHub[k], slug, { includeStatewide: false })) n += 1;
        }
      }
      counts[slug] = n;
    }
    return counts;
  }

  function mount(containerEl) {
    if (!doc) return null;
    var root = containerEl || doc.getElementById(ROOT_ID);
    if (!root) return null;
    // v457: Skip rendering a duplicate second 30-district grid when unified into the single Atlas
    if (!containerEl && root.getAttribute('data-cso-unified-atlas') === '1') {
      root.replaceChildren();
      return { unified: true, totals: getTotals() };
    }

    var totals = getTotals();
    var state = {
      lang: detectLang(),
      prefs: loadPrefs(),
      liveCounts: {},
      liveLoaded: false
    };

    var wrap = el('div', 'cso-oad-wrap');
    var header = el('div', 'cso-oad-head');
    var titleBox = el('div', 'cso-oad-title-box');
    var heading = el('h2', 'cso-oad-title');
    heading.id = 'cso-oad-heading';
    var subtitle = el('p', 'cso-oad-sub');
    titleBox.appendChild(heading);
    titleBox.appendChild(subtitle);

    var headActions = el('div', 'cso-oad-head-actions');
    var printBtn = el('button', 'cso-oad-btn cso-oad-btn--outline');
    printBtn.type = 'button';
    printBtn.addEventListener('click', function () {
      if (win && typeof win.print === 'function') win.print();
    });
    headActions.appendChild(printBtn);
    header.appendChild(titleBox);
    header.appendChild(headActions);

    // KPI Summary Bar (30 Districts · 3 Divisions · 58 Sub-Divisions · 314 Blocks)
    var kpiBar = el('div', 'cso-oad-kpis');
    kpiBar.setAttribute('role', 'group');

    // Filter Controls
    var controls = el('div', 'cso-oad-controls');
    var divPills = el('div', 'cso-oad-div-pills');
    divPills.setAttribute('role', 'group');

    var searchRow = el('div', 'cso-oad-search-row');
    var searchWrap = el('div', 'cso-oad-field');
    var searchLabel = el('label', 'cso-oad-label');
    searchLabel.setAttribute('for', 'cso-oad-search-input');
    var searchInput = el('input', 'cso-oad-input');
    searchInput.type = 'search';
    searchInput.id = 'cso-oad-search-input';
    searchInput.value = state.prefs.query;
    searchWrap.appendChild(searchLabel);
    searchWrap.appendChild(searchInput);

    var selectWrap = el('div', 'cso-oad-field');
    var selectLabel = el('label', 'cso-oad-label');
    selectLabel.setAttribute('for', 'cso-oad-district-select');
    var distSelect = el('select', 'cso-oad-select');
    distSelect.id = 'cso-oad-district-select';
    selectWrap.appendChild(selectLabel);
    selectWrap.appendChild(distSelect);

    var clearBtn = el('button', 'cso-oad-btn cso-oad-btn--outline cso-oad-clear-btn');
    clearBtn.type = 'button';

    searchRow.appendChild(searchWrap);
    searchRow.appendChild(selectWrap);
    searchRow.appendChild(clearBtn);

    controls.appendChild(divPills);
    controls.appendChild(searchRow);

    var statusLine = el('div', 'cso-oad-status');
    statusLine.setAttribute('role', 'status');
    statusLine.setAttribute('aria-live', 'polite');

    var grid = el('div', 'cso-oad-grid');
    grid.setAttribute('aria-live', 'polite');

    wrap.appendChild(header);
    wrap.appendChild(kpiBar);
    wrap.appendChild(controls);
    wrap.appendChild(statusLine);
    wrap.appendChild(grid);
    root.replaceChildren(wrap);

    function renderKpis(orMode) {
      var items = [
        { n: totals.districts, l: orMode ? 'ଜିଲ୍ଲା (Districts)' : 'Odisha Districts' },
        { n: totals.divisions, l: orMode ? 'ରାଜସ୍ୱ ଡିଭିଜନ୍' : 'Revenue Divisions' },
        { n: totals.subDivisions, l: orMode ? 'ଉପଖଣ୍ଡ (Sub-Divisions)' : 'Sub-Divisions' },
        { n: totals.blocks, l: orMode ? 'ପଞ୍ଚାୟତ ସମିତି ବ୍ଲକ୍' : 'Panchayat Samiti Blocks' }
      ];
      kpiBar.setAttribute('aria-label', orMode ? 'ଓଡ଼ିଶା ପ୍ରଶାସନିକ ପରିସଂଖ୍ୟାନ' : 'Odisha administrative totals');
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < items.length; i += 1) {
        var box = el('div', 'cso-oad-kpi');
        box.appendChild(el('strong', 'cso-oad-kpi__n', String(items[i].n)));
        box.appendChild(el('span', 'cso-oad-kpi__l', items[i].l));
        frag.appendChild(box);
      }
      kpiBar.replaceChildren(frag);
    }

    function renderDivisionPills(orMode) {
      divPills.setAttribute('aria-label', orMode ? 'ରାଜସ୍ୱ ଡିଭିଜନ୍ ଫିଲ୍ଟର' : 'Filter by Revenue Division');
      var frag = doc.createDocumentFragment();
      for (var i = 0; i < DIVISIONS.length; i += 1) {
        (function (divObj) {
          var active = state.prefs.division === divObj.key;
          var btn = el('button', 'cso-oad-pill' + (active ? ' is-active' : ''));
          btn.type = 'button';
          btn.setAttribute('aria-pressed', active ? 'true' : 'false');
          btn.setAttribute('data-oad-div', divObj.key);
          var label = '';
          if (divObj.key === 'all') {
            label = orMode
              ? ('ସମସ୍ତ ଡିଭିଜନ୍ (୩୦ ଜିଲ୍ଲା · ୩୧୪ ବ୍ଲକ୍)')
              : ('All Divisions (' + totals.districts + ' Districts · ' + totals.blocks + ' Blocks)');
          } else {
            var stat = totals.byDivision[divObj.key];
            label = (orMode ? divObj.or : divObj.en) + ' (' + stat.districts + ' · ' + stat.blocks + (orMode ? ' ବ୍ଲକ୍)' : ' Blocks)');
          }
          btn.textContent = label;
          btn.addEventListener('click', function () {
            state.prefs.division = divObj.key;
            if (divObj.key !== 'all' && state.prefs.district) {
              var selDist = DISTRICTS.find(function (d) { return d.slug === state.prefs.district; });
              if (selDist && selDist.division !== divObj.key) state.prefs.district = '';
            }
            savePrefs(state.prefs);
            render();
          });
          frag.appendChild(btn);
        })(DIVISIONS[i]);
      }
      divPills.replaceChildren(frag);
    }

    function renderDistrictDropdown(orMode) {
      var frag = doc.createDocumentFragment();
      var allOpt = el('option', '', orMode ? 'ସମସ୍ତ ୩୦ ଜିଲ୍ଲା (ଦ୍ରୁତ ଚୟନ)' : 'All 30 Districts (Quick Jump)');
      allOpt.value = '';
      frag.appendChild(allOpt);
      var sorted = DISTRICTS.slice().sort(function (a, b) { return a.en.localeCompare(b.en); });
      for (var i = 0; i < sorted.length; i += 1) {
        var d = sorted[i];
        var opt = el('option', '', d.en + ' · ' + d.or + ' (' + d.blocks.length + ' blocks)');
        opt.value = d.slug;
        if (state.prefs.district === d.slug) opt.selected = true;
        frag.appendChild(opt);
      }
      distSelect.replaceChildren(frag);
      distSelect.value = state.prefs.district || '';
    }

    function renderCards(orMode) {
      var matches = filterDistricts(state.prefs);
      var pinnedList = getPinnedDistricts();
      var totalMatchedBlocks = 0;
      for (var m = 0; m < matches.length; m += 1) {
        totalMatchedBlocks += matches[m].district.blocks.length;
      }

      statusLine.textContent = orMode
        ? ('ଦେଖାଯାଉଛି ' + matches.length + ' / ' + totals.districts + ' ଜିଲ୍ଲା (' + totalMatchedBlocks + ' ବ୍ଲକ୍)')
        : ('Showing ' + matches.length + ' of ' + totals.districts + ' districts (' + totalMatchedBlocks + ' Panchayat Samiti blocks)');

      if (!matches.length) {
        var empty = el('div', 'cso-oad-empty', orMode
          ? 'କୌଣସି ଜିଲ୍ଲା କିମ୍ବା ବ୍ଲକ୍ ମିଳିଲା ନାହିଁ। ଦୟାକରି ଫିଲ୍ଟର ପରିଷ୍କାର କରନ୍ତୁ।'
          : 'No matching Odisha district, sub-division, or block found. Try clearing your search or switching Revenue Division.');
        grid.replaceChildren(empty);
        return;
      }

      var frag = doc.createDocumentFragment();
      for (var i = 0; i < matches.length; i += 1) {
        (function (entry) {
          var d = entry.district;
          var links = entry.links;
          var isPinned = pinnedList.indexOf(d.slug) !== -1;
          var liveCount = state.liveCounts[d.slug] || 0;

          var card = el('article', 'cso-oad-card');
          card.setAttribute('data-oad-district', d.slug);

          // Card Header
          var top = el('div', 'cso-oad-card__top');
          var titleWrap = el('div', 'cso-oad-card__title-wrap');
          titleWrap.appendChild(el('h3', 'cso-oad-card__name', d.en + ' · ' + d.or));
          var badges = el('div', 'cso-oad-badges');
          badges.appendChild(el('span', 'cso-oad-badge cso-oad-badge--div', getDivisionLabel(d.division, orMode)));
          badges.appendChild(el('span', 'cso-oad-badge', (orMode ? 'ମୁଖ୍ୟାଳୟ: ' : 'HQ: ') + d.hq));
          badges.appendChild(el('span', 'cso-oad-badge cso-oad-badge--live', state.liveLoaded
            ? (liveCount + (orMode ? ' ଲାଇଭ୍ ବିଜ୍ଞପ୍ତି' : (liveCount === 1 ? ' Live Notice' : ' Live Notices')))
            : (orMode ? 'ଲାଇଭ୍ ଅପଡେଟ୍' : 'Live Sync')));
          titleWrap.appendChild(badges);

          var pinBtn = el('button', 'cso-oad-pin-btn' + (isPinned ? ' is-pinned' : ''));
          pinBtn.type = 'button';
          pinBtn.setAttribute('aria-pressed', isPinned ? 'true' : 'false');
          pinBtn.textContent = isPinned
            ? (orMode ? '★ ୱାଚଲିଷ୍ଟରେ ପିନ୍ ହୋଇଛି' : '★ Pinned in Watchlist')
            : (orMode ? '⭐ ୱାଚଲିଷ୍ଟରେ ପିନ୍ କରନ୍ତୁ' : '⭐ Pin to Watchlist');
          pinBtn.addEventListener('click', function () {
            togglePinDistrict(d.slug);
            renderCards(isOdia());
          });

          top.appendChild(titleWrap);
          top.appendChild(pinBtn);
          card.appendChild(top);

          // Administrative Metadata
          var meta = el('dl', 'cso-oad-meta');

          var dtCol = el('dt', '', orMode ? 'ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟ' : 'District Collectorate');
          var ddCol = el('dd', '', d.collectorate);
          meta.appendChild(dtCol);
          meta.appendChild(ddCol);

          var dtSub = el('dt', '', (orMode ? 'ଉପଖଣ୍ଡ (' : 'Sub-Divisions (') + d.subDivisions.length + ')');
          var ddSub = el('dd', '', d.subDivisions.join(' · '));
          meta.appendChild(dtSub);
          meta.appendChild(ddSub);

          var dtEd = el('dt', '', orMode ? 'e-District ଓ ତହସିଲ୍ ସେବା' : 'e-District & Tehsil Office');
          var ddEd = el('dd', '', d.edistrict);
          meta.appendChild(dtEd);
          meta.appendChild(ddEd);

          var dtEx = el('dt', '', orMode ? 'ପ୍ରମୁଖ ପରୀକ୍ଷା କେନ୍ଦ୍ର' : 'Major Exam Centers (OPSC / OSSC / CBT)');
          var ddEx = el('dd', '', d.examCenters.join(' · '));
          meta.appendChild(dtEx);
          meta.appendChild(ddEx);

          card.appendChild(meta);

          // Panchayat Samiti Blocks List
          var blkSection = el('div', 'cso-oad-blocks');
          blkSection.appendChild(el('div', 'cso-oad-blocks__head',
            (orMode ? 'ପଞ୍ଚାୟତ ସମିତି ବ୍ଲକ୍ (' : 'Panchayat Samiti Blocks (') + d.blocks.length + ')'
          ));
          var blkList = el('div', 'cso-oad-blocks__list');
          for (var b = 0; b < d.blocks.length; b += 1) {
            var blkName = d.blocks[b];
            var isMatchedBlk = entry.matchedBlocks.indexOf(blkName) !== -1;
            var pill = el('span', 'cso-oad-block-pill' + (isMatchedBlk ? ' is-match' : ''), blkName);
            blkList.appendChild(pill);
          }
          blkSection.appendChild(blkList);
          card.appendChild(blkSection);

          // 1-Click Action Links
          var actions = el('div', 'cso-oad-actions');

          var aJobs = el('a', 'cso-oad-link cso-oad-link--primary',
            orMode ? '📋 ଜିଲ୍ଲା ଚାକିରି' : '📋 Live District Jobs');
          aJobs.href = links.jobs;

          var aUpd = el('a', 'cso-oad-link',
            orMode ? '📰 ଜିଲ୍ଲା ଅପଡେଟ୍' : '📰 District Updates');
          aUpd.href = links.updates;

          var aPortal = el('a', 'cso-oad-link',
            orMode ? '🏛️ ଅଫିସିଆଲ୍ ପୋର୍ଟାଲ୍ ↗' : '🏛️ Official District Portal ↗');
          aPortal.href = d.portal;
          aPortal.target = '_blank';
          aPortal.rel = 'noopener noreferrer';

          var aEdist = el('a', 'cso-oad-link',
            orMode ? '📄 e-District ସାର୍ଟିଫିକେଟ୍ ↗' : '📄 e-District Certificates ↗');
          aEdist.href = links.edistrict;
          aEdist.target = '_blank';
          aEdist.rel = 'noopener noreferrer';

          actions.appendChild(aJobs);
          actions.appendChild(aUpd);
          actions.appendChild(aPortal);
          actions.appendChild(aEdist);
          card.appendChild(actions);

          frag.appendChild(card);
        })(matches[i]);
      }
      grid.replaceChildren(frag);
    }

    function isOdia() {
      return state.lang === 'or';
    }

    function render() {
      var orMode = isOdia();
      heading.textContent = orMode
        ? '🏛️ ଓଡ଼ିଶା ୩୦ ଜିଲ୍ଲା ଓ ୩୧୪ ବ୍ଲକ୍ ପ୍ରଶାସନିକ ଡିରେକ୍ଟୋରୀ'
        : '🏛️ Odisha 30-District & 314-Block Administrative Directory';
      subtitle.textContent = orMode
        ? 'ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟ, ୫୮ ଉପଖଣ୍ଡ, ସମସ୍ତ ୩୧୪ ପଞ୍ଚାୟତ ସମିତି ବ୍ଲକ୍, e-District ତହସିଲ୍ ସାର୍ଟିଫିକେଟ୍, ପ୍ରମୁଖ ପରୀକ୍ଷା କେନ୍ଦ୍ର ଓ ଲାଇଭ୍ ଜିଲ୍ଲା ଚାକିରି ଖୋଜନ୍ତୁ।'
        : 'Search all 30 Odisha districts, 3 Revenue Divisions, 58 Sub-Divisions, and 314 Panchayat Samiti Blocks with Collectorate, e-District Tehsil offices, CBT exam centers, and live recruitment links.';
      printBtn.textContent = orMode ? '🖨️ ଡିରେକ୍ଟୋରୀ ପ୍ରିଣ୍ଟ୍ କରନ୍ତୁ' : '🖨️ Print Directory Sheet';
      searchLabel.textContent = orMode ? 'ଜିଲ୍ଲା, ବ୍ଲକ୍, ଉପଖଣ୍ଡ କିମ୍ବା ପରୀକ୍ଷା କେନ୍ଦ୍ର ଖୋଜନ୍ତୁ' : 'Search District, Block (314), Sub-Division, HQ or Exam Center';
      searchInput.placeholder = orMode
        ? 'ଉଦାହରଣ: Junagarh, Athmallik, Bhanjanagar, Rourkela, Baripada...'
        : 'e.g., Bhawanipatna, Junagarh, Athmallik, Bhanjanagar, Rourkela, Baripada...';
      selectLabel.textContent = orMode ? 'ଜିଲ୍ଲା ଦ୍ରୁତ ଚୟନ' : 'Quick-Jump to District';
      clearBtn.textContent = orMode ? '↻ ଫିଲ୍ଟର ହଟାନ୍ତୁ' : '↻ Reset Filters';

      renderKpis(orMode);
      renderDivisionPills(orMode);
      renderDistrictDropdown(orMode);
      renderCards(orMode);
    }

    searchInput.addEventListener('input', function () {
      state.prefs.query = searchInput.value;
      savePrefs(state.prefs);
      renderCards(isOdia());
    });

    distSelect.addEventListener('change', function () {
      state.prefs.district = distSelect.value;
      if (state.prefs.district) {
        var found = DISTRICTS.find(function (d) { return d.slug === state.prefs.district; });
        if (found && state.prefs.division !== 'all' && state.prefs.division !== found.division) {
          state.prefs.division = 'all';
        }
      }
      savePrefs(state.prefs);
      render();
    });

    clearBtn.addEventListener('click', function () {
      state.prefs = { division: 'all', district: '', query: '' };
      searchInput.value = '';
      savePrefs(state.prefs);
      render();
    });

    // Listen for language toggle clicks on /odisha-special/ or site-wide language events
    if (win) {
      win.addEventListener('cso:lang-change', function (ev) {
        var next = ev && ev.detail && ev.detail.lang;
        if (next === 'or' || next === 'en') {
          state.lang = next;
          render();
        }
      });
      win.addEventListener('storage', function (ev) {
        if (ev && ev.key === 'cso_candidate_watchlist_v1') {
          renderCards(isOdia());
        }
      });
    }
    if (doc) {
      doc.addEventListener('click', function (ev) {
        var btn = ev.target && ev.target.closest && ev.target.closest('.cso-od-lang-btn');
        if (btn) {
          var l = btn.getAttribute('data-lang');
          if (l === 'or' || l === 'en') {
            state.lang = l;
            render();
          }
        }
      });
    }

    render();

    // Hydrate live district notice counts from /api/public/search-index
    if (typeof win.fetch === 'function') {
      win.fetch('/api/public/search-index', { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data && Array.isArray(data.items)) {
            state.liveCounts = computeLiveCounts(data.items);
            state.liveLoaded = true;
            renderCards(isOdia());
          }
        })
        .catch(function () {});
    }

    return {
      refresh: render,
      setLang: function (l) {
        state.lang = l === 'or' ? 'or' : 'en';
        render();
      },
      getState: function () {
        return { lang: state.lang, prefs: state.prefs, totals: totals };
      }
    };
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', function () { mount(); });
    } else {
      mount();
    }
  }

  return {
    version: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    DIVISIONS: DIVISIONS,
    DISTRICTS: DISTRICTS,
    getTotals: getTotals,
    filterDistricts: filterDistricts,
    getDistrictLinks: getDistrictLinks,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    mount: mount
  };
});
