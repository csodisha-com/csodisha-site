(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_saved_glossary_v1';

  var CATEGORIES = [
    'Revenue & District Admin',
    'Secretariat & Notifications',
    'Judiciary & Polity',
    'Finance & Welfare Schemes'
  ];

  var GLOSSARY_TERMS = [
    // 1. Revenue & District Admin (11)
    { id: 'rev-collector', en: 'District Collector & Magistrate', odia: 'ଜିଲ୍ଲାପାଳ ଓ ଜିଲ୍ଲା ମାଜିଷ୍ଟ୍ରେଟ୍', translit: 'Jillapala o Jilla Magistrate', category: 'Revenue & District Admin', usageEn: 'Head of district revenue administration and law & order.', usageOdia: 'ଜିଲ୍ଲା ରାଜସ୍ୱ ପ୍ରଶାସନ ଓ ଆଇନ ଶୃଙ୍ଖଳାର ମୁଖ୍ୟ।' },
    { id: 'rev-tahasildar', en: 'Tahasildar', odia: 'ତହସିଲଦାର', translit: 'Tahasildar', category: 'Revenue & District Admin', usageEn: 'Revenue officer in charge of a Tahasil and land records.', usageOdia: 'ତହସିଲ ଓ ଭୂ-ଅଭିଲେଖ ଦାୟିତ୍ୱରେ ଥିବା ରାଜସ୍ୱ ଅଧିକାରୀ।' },
    { id: 'rev-ri', en: 'Revenue Inspector (RI)', odia: 'ରାଜସ୍ୱ ନିରୀକ୍ଷକ (RI)', translit: 'Rajaswa Nirikshaka', category: 'Revenue & District Admin', usageEn: 'Field-level revenue official collecting land revenue and verifying caste/resident certificates.', usageOdia: 'ଭୂ-ରାଜସ୍ୱ ଆଦାୟ ଓ ଜାତି/ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର ଯାଞ୍ଚ କରୁଥିବା କ୍ଷେତ୍ରୀୟ ଅଧିକାରୀ।' },
    { id: 'rev-sdm', en: 'Sub-Divisional Magistrate (SDM)', odia: 'ଉପ-ଜିଲ୍ଲାପାଳ (SDM)', translit: 'Upa-Jillapala', category: 'Revenue & District Admin', usageEn: 'Executive Magistrate heading a Revenue Sub-Division.', usageOdia: 'ରାଜସ୍ୱ ଉପଖଣ୍ଡର ମୁଖ୍ୟ କାର୍ଯ୍ୟନିର୍ବାହୀ ମାଜିଷ୍ଟ୍ରେଟ୍।' },
    { id: 'rev-ror', en: 'Record of Rights (RoR / Patta)', odia: 'ସ୍ୱତ୍ୱଲିପି / ପଟ୍ଟା (RoR)', translit: 'Swatwalipi / Patta', category: 'Revenue & District Admin', usageEn: 'Official land ownership record maintained in Bhulekh Odisha.', usageOdia: 'ଭୂଲେଖ ଓଡ଼ିଶାରେ ସଂରକ୍ଷିତ ସରକାରୀ ଜମି ମାଲିକାନା ଦସ୍ତାବିଜ୍।' },
    { id: 'rev-mutation', en: 'Mutation (Dakhil Kharij)', odia: 'ନାମଜାରି / ଦାଖଲ ଖାରଜ', translit: 'Namajari / Dakhil Kharij', category: 'Revenue & District Admin', usageEn: 'Updating land title in revenue records after sale or inheritance.', usageOdia: 'ଜମି କ୍ରୟ କିମ୍ବା ଉତ୍ତରାଧିକାର ପରେ ରାଜସ୍ୱ ରେକର୍ଡରେ ନାମ ପରିବର୍ତ୍ତନ।' },
    { id: 'rev-amin', en: 'Amin (Land Surveyor)', odia: 'ଅମିନ (ଭୂମି ମାପକ)', translit: 'Amina (Bhumi Mapaka)', category: 'Revenue & District Admin', usageEn: 'Trained official conducting cadastral land measurement and demarcation.', usageOdia: 'ଜମି ମାପଚୁପ ଓ ସୀମା ନିର୍ଦ୍ଧାରଣ କରୁଥିବା ସରକାରୀ କର୍ମଚାରୀ।' },
    { id: 'rev-gram-sabha', en: 'Gram Sabha', odia: 'ଗ୍ରାମ ସଭା', translit: 'Grama Sabha', category: 'Revenue & District Admin', usageEn: 'Constitutional body of all registered voters in a Gram Panchayat.', usageOdia: 'ଗ୍ରାମ ପଞ୍ଚାୟତର ସମସ୍ତ ପଞ୍ଜୀକୃତ ଭୋଟରଙ୍କୁ ନେଇ ଗଠିତ ସାମ୍ବିଧାନିକ ସଭା।' },
    { id: 'rev-panchayat-samiti', en: 'Panchayat Samiti (Block)', odia: 'ପଞ୍ଚାୟତ ସମିତି (ବ୍ଲକ୍)', translit: 'Panchayata Samiti', category: 'Revenue & District Admin', usageEn: 'Intermediate tier of Panchayati Raj at the Block level.', usageOdia: 'ବ୍ଲକ୍ ସ୍ତରରେ ପଞ୍ଚାୟତିରାଜ ବ୍ୟବସ୍ଥାର ମଧ୍ୟବର୍ତ୍ତୀ ସ୍ତର।' },
    { id: 'rev-zilla-parishad', en: 'Zilla Parishad', odia: 'ଜିଲ୍ଲା ପରିଷଦ', translit: 'Jilla Parishada', category: 'Revenue & District Admin', usageEn: 'Apex district-level Panchayati Raj institution in Odisha.', usageOdia: 'ଓଡ଼ିଶାରେ ଜିଲ୍ଲା ସ୍ତରୀୟ ସର୍ବୋଚ୍ଚ ପଞ୍ଚାୟତିରାଜ ଅନୁଷ୍ଠାନ।' },
    { id: 'rev-encroachment', en: 'Encroachment Eviction', odia: 'ଜବରଦଖଲ ଉଚ୍ଛେଦ', translit: 'Jabardakhala Uchheda', category: 'Revenue & District Admin', usageEn: 'Legal removal of unauthorized occupation on government land.', usageOdia: 'ସରକାରୀ ଜମିରୁ ବେଆଇନ ଦଖଲ ହଟାଇବା ପ୍ରକ୍ରିୟା।' },

    // 2. Secretariat & Notifications (11)
    { id: 'sec-gazette', en: 'Gazette Notification', odia: 'ରାଜପତ୍ର ବିଜ୍ଞପ୍ତି (ଗେଜେଟ୍)', translit: 'Rajapatra Bigyapti', category: 'Secretariat & Notifications', usageEn: 'Official publication of rules, appointments, and statutes in the Odisha Gazette.', usageOdia: 'ଓଡ଼ିଶା ଗେଜେଟରେ ସରକାରୀ ନିୟମ, ନିଯୁକ୍ତି ଓ ଆଇନର ଆନୁଷ୍ଠାନିକ ପ୍ରକାଶନ।' },
    { id: 'sec-om', en: 'Office Memorandum (OM)', odia: 'କାର୍ଯ୍ୟାଳୟ ସ୍ମାରକପତ୍ର', translit: 'Karyalaya Smarakapatra', category: 'Secretariat & Notifications', usageEn: 'Formal inter-departmental communication issuing policy instructions.', usageOdia: 'ନୀତିଗତ ନିର୍ଦ୍ଦେଶାବଳୀ ଜାରି କରିବା ପାଇଁ ଆନ୍ତଃ-ବିଭାଗୀୟ ସରକାରୀ ପତ୍ର।' },
    { id: 'sec-resolution', en: 'Government Resolution', odia: 'ସରକାରୀ ସଂକଳ୍ପ', translit: 'Sarakari Sankalpa', category: 'Secretariat & Notifications', usageEn: 'Formal policy decision adopted by the State Cabinet or Department.', usageOdia: 'ରାଜ୍ୟ କ୍ୟାବିନେଟ୍ କିମ୍ବା ବିଭାଗ ଦ୍ୱାରା ଗୃହୀତ ନୀତିଗତ ନିଷ୍ପତ୍ତି।' },
    { id: 'sec-corrigendum', en: 'Corrigendum', odia: 'ଶୁଦ୍ଧିପତ୍ର', translit: 'Shuddhipatra', category: 'Secretariat & Notifications', usageEn: 'Official correction notice issued to rectify errors in an earlier notification.', usageOdia: 'ପୂର୍ବ ବିଜ୍ଞପ୍ତିରେ ଥିବା ତ୍ରୁଟି ସଂଶୋଧନ ପାଇଁ ଜାରି ପତ୍ର।' },
    { id: 'sec-addendum', en: 'Addendum', odia: 'ସଂଯୋଜନା ପତ୍ର / ଅତିରିକ୍ତ ବିଜ୍ଞପ୍ତି', translit: 'Sanyojana Patra', category: 'Secretariat & Notifications', usageEn: 'Supplementary notice adding new clauses or vacancies to an advertisement.', usageOdia: 'ପୂର୍ବ ବିଜ୍ଞାପନରେ ନୂତନ ପଦବୀ କିମ୍ବା ସର୍ତ୍ତ ଯୋଡ଼ିବା ପାଇଁ ଅତିରିକ୍ତ ବିଜ୍ଞପ୍ତି।' },
    { id: 'sec-standing-order', en: 'Standing Order', odia: 'ସ୍ଥାୟୀ ଆଦେଶ', translit: 'Sthayi Adesha', category: 'Secretariat & Notifications', usageEn: 'Permanent administrative instruction remaining valid until revoked.', usageOdia: 'ପ୍ରତ୍ୟାହାର ନହେବା ପର୍ଯ୍ୟନ୍ତ ବଳବତ୍ତର ରହୁଥିବା ସ୍ଥାୟୀ ପ୍ରଶାସନିକ ଆଦେଶ।' },
    { id: 'sec-deputation', en: 'Deputation', odia: 'ପ୍ରତିନିଯୁକ୍ତି', translit: 'Pratinijukti', category: 'Secretariat & Notifications', usageEn: 'Temporary transfer of an officer from one department or cadre to another.', usageOdia: 'ଜଣେ ଅଧିକାରୀଙ୍କର ଗୋଟିଏ ବିଭାଗରୁ ଅନ୍ୟ ବିଭାଗକୁ ଅସ୍ଥାୟୀ ବଦଳି।' },
    { id: 'sec-probation', en: 'Probationary Period', odia: 'ପରିବୀକ୍ଷଣ କାଳ (ପ୍ରୋବେସନ୍)', translit: 'Paribikshana Kala', category: 'Secretariat & Notifications', usageEn: 'Initial evaluation period before confirmation in regular government service.', usageOdia: 'ନିୟମିତ ସରକାରୀ ଚାକିରିରେ ସ୍ଥାୟୀ ହେବା ପୂର୍ବରୁ ପ୍ରାରମ୍ଭିକ ମୂଲ୍ୟାଙ୍କନ ସମୟ।' },
    { id: 'sec-superannuation', en: 'Superannuation (Retirement)', odia: 'ଅବସର ଗ୍ରହଣ (ବୟସ ସୀମା)', translit: 'Abasara Grahana', category: 'Secretariat & Notifications', usageEn: 'Retirement from government service upon reaching the prescribed age.', usageOdia: 'ନିର୍ଦ୍ଧାରିତ ବୟସ ସୀମା ପୂରଣ ପରେ ସରକାରୀ ସେବାରୁ ଅବସର।' },
    { id: 'sec-vigilance', en: 'Vigilance Clearance', odia: 'ଭିଜିଲାନ୍ସ ଅନାପତ୍ତି ପ୍ରମାଣପତ୍ର', translit: 'Vigilance Anapatti Pramanapatra', category: 'Secretariat & Notifications', usageEn: 'Verification confirming no pending anti-corruption inquiry against an employee.', usageOdia: 'କର୍ମଚାରୀଙ୍କ ବିରୁଦ୍ଧରେ କୌଣସି ଦୁର୍ନୀତି ମାମଲା ନଥିବାର ପ୍ରମାଣପତ୍ର।' },
    { id: 'sec-joining-report', en: 'Joining Report', odia: 'ଯୋଗଦାନ ପତ୍ର', translit: 'Jogadana Patra', category: 'Secretariat & Notifications', usageEn: 'Written report submitted upon assuming charge of a new post.', usageOdia: 'ନୂତନ ପଦବୀରେ କାର୍ଯ୍ୟଭାର ଗ୍ରହଣ କରିବା ସମୟରେ ଦିଆଯାଉଥିବା ଲିଖିତ ପତ୍ର।' },

    // 3. Judiciary & Polity (11)
    { id: 'pol-ordinance', en: 'Ordinance', odia: 'ଅଧ୍ୟାଦେଶ', translit: 'Adhyadesha', category: 'Judiciary & Polity', usageEn: 'Temporary law promulgated by the Governor or President when legislature is not in session.', usageOdia: 'ବିଧାନସଭା କିମ୍ବା ସଂସଦ ଅଧିବେଶନ ନଥିବା ସମୟରେ ରାଜ୍ୟପାଳ ବା ରାଷ୍ଟ୍ରପତିଙ୍କ ଦ୍ୱାରା ଜାରି ଆଇନ।' },
    { id: 'pol-writ', en: 'Writ Petition', odia: 'ରିଟ୍ ଆବେଦନ / ପରମାଦେଶ', translit: 'Writ Abedana', category: 'Judiciary & Polity', usageEn: 'Constitutional petition filed in High Court (Art 226) or Supreme Court (Art 32).', usageOdia: 'ମୌଳିକ ଅଧିକାର ସୁରକ୍ଷା ପାଇଁ ହାଇକୋର୍ଟ କିମ୍ବା ସୁପ୍ରିମକୋର୍ଟରେ ଦାଖଲ ଆବେଦନ।' },
    { id: 'pol-pil', en: 'Public Interest Litigation (PIL)', odia: 'ଜନସ୍ୱାର୍ଥ ମାମଲା (PIL)', translit: 'Janaswartha Mamala', category: 'Judiciary & Polity', usageEn: 'Litigation filed in court for the protection of public interest.', usageOdia: 'ସାଧାରଣ ଜନତାଙ୍କ ସ୍ୱାର୍ଥ ରକ୍ଷା ପାଇଁ ଅଦାଲତରେ ଦାଏର ମାମଲା।' },
    { id: 'pol-mandamus', en: 'Mandamus', odia: 'ପରମାଦେଶ (ମାଣ୍ଡାମସ୍)', translit: 'Paramadesha', category: 'Judiciary & Polity', usageEn: 'Judicial command directing a public authority to perform its legal duty.', usageOdia: 'ସରକାରୀ କର୍ତ୍ତୃପକ୍ଷଙ୍କୁ ନିଜର ଆଇନଗତ କର୍ତ୍ତବ୍ୟ ପାଳନ ପାଇଁ ଅଦାଲତଙ୍କ ଆଦେଶ।' },
    { id: 'pol-quo-warranto', en: 'Quo Warranto', odia: 'ଅଧିକାର ପୃଚ୍ଛା', translit: 'Adhikara Pruchha', category: 'Judiciary & Polity', usageEn: 'Writ inquiring into the legality of a person holding a public office.', usageOdia: 'ଜଣେ ବ୍ୟକ୍ତି କେଉଁ ଅଧିକାରରେ ସରକାରୀ ପଦବୀରେ ଅଛନ୍ତି ତାହାର ନ୍ୟାୟିକ ଯାଞ୍ଚ।' },
    { id: 'pol-judicial-review', en: 'Judicial Review', odia: 'ନ୍ୟାୟିକ ସମୀକ୍ଷା', translit: 'Nyayika Samiksha', category: 'Judiciary & Polity', usageEn: 'Power of courts to examine the constitutionality of legislative acts.', usageOdia: 'ବିଧାନମଣ୍ଡଳ ଦ୍ୱାରା ପ୍ରଣୀତ ଆଇନର ସାମ୍ବିଧାନିକ ବୈଧତା ପରୀକ୍ଷା କରିବାର କ୍ଷମତା।' },
    { id: 'pol-lokayukta', en: 'Odisha Lokayukta', odia: 'ଓଡ଼ିଶା ଲୋକାୟୁକ୍ତ', translit: 'Odisha Lokayukta', category: 'Judiciary & Polity', usageEn: 'Statutory anti-corruption ombudsman in Odisha.', usageOdia: 'ଓଡ଼ିଶାରେ ଦୁର୍ନୀତି ନିବାରଣ ପାଇଁ ଗଠିତ ବୈଧାନିକ ସଂସ୍ଥା।' },
    { id: 'pol-gram-nyayalaya', en: 'Gram Nyayalaya', odia: 'ଗ୍ରାମ ନ୍ୟାୟାଳୟ', translit: 'Grama Nyayalaya', category: 'Judiciary & Polity', usageEn: 'Village-level mobile court for speedy and affordable justice.', usageOdia: 'ଗ୍ରାମାଞ୍ଚଳରେ ତ୍ୱରିତ ଓ ସୁଲଭ ନ୍ୟାୟ ପ୍ରଦାନ ପାଇଁ ଗଠିତ ଅଦାଲତ।' },
    { id: 'pol-fundamental-duties', en: 'Fundamental Duties (Art 51A)', odia: 'ମୌଳିକ କର୍ତ୍ତବ୍ୟ', translit: 'Maulika Kartabya', category: 'Judiciary & Polity', usageEn: '11 moral and civic obligations of Indian citizens under Part IVA.', usageOdia: 'ସମ୍ବିଧାନର ଭାଗ ୪-କ ଅନ୍ତର୍ଗତ ନାଗରିକମାନଙ୍କର ୧୧ଟି ମୌଳିକ କର୍ତ୍ତବ୍ୟ।' },
    { id: 'pol-concurrent-list', en: 'Concurrent List', odia: 'ଯୁଗ୍ମ ତାଲିକା', translit: 'Jugma Talika', category: 'Judiciary & Polity', usageEn: 'Seventh Schedule subjects on which both Parliament and State Legislature can legislate.', usageOdia: 'ଯେଉଁ ବିଷୟରେ କେନ୍ଦ୍ର ଓ ରାଜ୍ୟ ଉଭୟ ଆଇନ ପ୍ରଣୟନ କରିପାରିବେ।' },
    { id: 'pol-unicameral', en: 'Unicameral Legislature', odia: 'ଏକକକ୍ଷ ବିଶିଷ୍ଟ ବିଧାନମଣ୍ଡଳ', translit: 'Ekakaksha Bidhanamandala', category: 'Judiciary & Polity', usageEn: 'State legislature having only one house (Odisha Legislative Assembly).', usageOdia: 'କେବଳ ଗୋଟିଏ ଗୃହ (ବିଧାନସଭା) ଥିବା ରାଜ୍ୟ ବିଧାନମଣ୍ଡଳ।' },

    // 4. Finance & Welfare Schemes (11)
    { id: 'fin-consolidated-fund', en: 'Consolidated Fund of State', odia: 'ରାଜ୍ୟ ସଞ୍ଚିତ ପାଣ୍ଠି', translit: 'Rajya Sanchita Panthi', category: 'Finance & Welfare Schemes', usageEn: 'Primary government account (Art 266) into which all revenues flow.', usageOdia: 'ସରକାରଙ୍କର ସମସ୍ତ ରାଜସ୍ୱ ଜମା ହେଉଥିବା ମୁଖ୍ୟ ସାମ୍ବିଧାନିକ ପାଣ୍ଠି।' },
    { id: 'fin-contingency-fund', en: 'Contingency Fund of State', odia: 'ରାଜ୍ୟ ଆକସ୍ମିକ ପାଣ୍ଠି', translit: 'Rajya Akasmika Panthi', category: 'Finance & Welfare Schemes', usageEn: 'Emergency fund at the disposal of the Governor for unforeseen expenditure.', usageOdia: 'ଅପ୍ରତ୍ୟାଶିତ ଜରୁରୀକାଳୀନ ଖର୍ଚ୍ଚ ପାଇଁ ରାଜ୍ୟପାଳଙ୍କ ଅଧୀନରେ ଥିବା ପାଣ୍ଠି।' },
    { id: 'fin-appropriation-bill', en: 'Appropriation Bill', odia: 'ବିନିଯୋଗ ବିଧେୟକ', translit: 'Biniyoga Bidheyaka', category: 'Finance & Welfare Schemes', usageEn: 'Money bill authorizing withdrawal of funds from Consolidated Fund.', usageOdia: 'ସଞ୍ଚିତ ପାଣ୍ଠିରୁ ଅର୍ଥ ଉଠାଣ ପାଇଁ ବିଧାନସଭାରେ ଗୃହୀତ ଅର୍ଥ ବିଲ୍।' },
    { id: 'fin-dbt', en: 'Direct Benefit Transfer (DBT)', odia: 'ପ୍ରତ୍ୟକ୍ଷ ଲାଭ ହସ୍ତାନ୍ତର (DBT)', translit: 'Pratyaksha Labha Hastantara', category: 'Finance & Welfare Schemes', usageEn: 'Transferring scheme subsidies directly into Aadhaar-seeded bank accounts.', usageOdia: 'ଆଧାର ସଂଯୁକ୍ତ ବ୍ୟାଙ୍କ ଖାତାକୁ ସିଧାସଳଖ ସରକାରୀ ସହାୟତା ପଠାଇବା ବ୍ୟବସ୍ଥା।' },
    { id: 'fin-uc', en: 'Utilization Certificate (UC)', odia: 'ବିନିଯୋଗ ପ୍ରମାଣପତ୍ର (UC)', translit: 'Biniyoga Pramanapatra', category: 'Finance & Welfare Schemes', usageEn: 'Certificate confirming that government grant money was spent for the intended purpose.', usageOdia: 'ସରକାରୀ ଅନୁଦାନ ନିର୍ଦ୍ଧାରିତ କାର୍ଯ୍ୟରେ ସଠିକ୍ ଭାବେ ଖର୍ଚ୍ଚ ହୋଇଥିବାର ପ୍ରମାଣପତ୍ର।' },
    { id: 'fin-audit-objection', en: 'Audit Objection', odia: 'ଅଡିଟ୍ ଆପତ୍ତି (ହିସାବ ପରୀକ୍ଷା ଆପତ୍ତି)', translit: 'Audit Apatti', category: 'Finance & Welfare Schemes', usageEn: 'Irregularity flagged by CAG or Local Fund Audit during financial review.', usageOdia: 'ଆର୍ଥିକ ହିସାବ ପରୀକ୍ଷା ସମୟରେ CAG ଦ୍ୱାରା ଚିହ୍ନଟ ଅନିୟମିତତା।' },
    { id: 'fin-beneficiary', en: 'Beneficiary Identification', odia: 'ହିତାଧିକାରୀ ଚିହ୍ନଟ', translit: 'Hitadhikari Chihnata', category: 'Finance & Welfare Schemes', usageEn: 'Process of verifying eligible citizens for welfare schemes like Subhadra or CM-KISAN.', usageOdia: 'ସୁଭଦ୍ରା କିମ୍ବା CM-KISAN ଭଳି ଯୋଜନା ପାଇଁ ଯୋଗ୍ୟ ହିତାଧିକାରୀଙ୍କ ଚିହ୍ନଟ।' },
    { id: 'fin-social-audit', en: 'Social Audit', odia: 'ସାମାଜିକ ସମୀକ୍ଷା (ସୋସିଆଲ୍ ଅଡିଟ୍)', translit: 'Samajika Samiksha', category: 'Finance & Welfare Schemes', usageEn: 'Public verification of MGNREGA and welfare works by villagers in Gram Sabha.', usageOdia: 'ଗ୍ରାମ ସଭାରେ ଜନସାଧାରଣଙ୍କ ଦ୍ୱାରା ସରକାରୀ ଯୋଜନା କାମର ପ୍ରତ୍ୟକ୍ଷ ସମୀକ୍ଷା।' },
    { id: 'fin-shg', en: 'Self-Help Group (SHG)', odia: 'ସ୍ୱୟଂ ସହାୟକ ଗୋଷ୍ଠୀ (SHG)', translit: 'Swayam Sahayaka Goshthi', category: 'Finance & Welfare Schemes', usageEn: 'Women-led community micro-enterprise groups under Mission Shakti Odisha.', usageOdia: 'ମିଶନ ଶକ୍ତି ଓଡ଼ିଶା ଅଧୀନରେ ମହିଳାମାନଙ୍କ ଦ୍ୱାରା ପରିଚାଳିତ ଗୋଷ୍ଠୀ।' },
    { id: 'fin-financial-inclusion', en: 'Financial Inclusion', odia: 'ଆର୍ଥିକ ଅନ୍ତର୍ଭୁକ୍ତିକରଣ', translit: 'Arthika Antarbhuktikarana', category: 'Finance & Welfare Schemes', usageEn: 'Providing affordable banking, credit, and insurance access to every citizen.', usageOdia: 'ପ୍ରତ୍ୟେକ ନାଗରିକଙ୍କୁ ସୁଲଭ ବ୍ୟାଙ୍କିଂ, ଋଣ ଓ ବୀମା ସେବା ଯୋଗାଇଦେବା।' },
    { id: 'fin-bpl', en: 'Below Poverty Line (BPL)', odia: 'ଦାରିଦ୍ର୍ୟ ସୀମାରେଖା ତଳେ (BPL)', translit: 'Daridrya Simarekha Tale', category: 'Finance & Welfare Schemes', usageEn: 'Economic benchmark identifying households eligible for priority welfare support.', usageOdia: 'ପ୍ରାଥମିକ ସରକାରୀ ସହାୟତା ପାଇଁ ଯୋଗ୍ୟ ପରିବାର ଚିହ୍ନଟର ଆର୍ଥିକ ମାନଦଣ୍ଡ।' }
  ];

  function loadSaved(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return [];
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function saveIds(ids, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var clean = Array.isArray(ids) ? ids.map(String) : [];
    if (s) {
      try { s.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch (_) {}
    }
    if (typeof fetch === 'function') {
      try {
        fetch('/api/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
          body: JSON.stringify({ savedGlossary: clean })
        }).catch(function () {});
      } catch (_) {}
    }
    return clean;
  }

  function isSaved(id, storage) {
    return loadSaved(storage).indexOf(String(id)) !== -1;
  }

  function toggleSave(id, storage) {
    var key = String(id || '').trim();
    if (!key) return { saved: false, ids: loadSaved(storage) };
    var list = loadSaved(storage);
    var idx = list.indexOf(key);
    if (idx !== -1) {
      list.splice(idx, 1);
      saveIds(list, storage);
      return { saved: false, ids: list };
    }
    list.unshift(key);
    saveIds(list, storage);
    return { saved: true, ids: list };
  }

  function filterTerms(opts, storage) {
    var o = opts && typeof opts === 'object' ? opts : {};
    var cat = String(o.category || 'All').trim();
    var savedOnly = Boolean(o.savedOnly);
    var savedSet = savedOnly ? loadSaved(storage) : null;
    return GLOSSARY_TERMS.filter(function (term) {
      if (cat && cat !== 'All' && term.category !== cat) return false;
      if (savedOnly && savedSet.indexOf(term.id) === -1) return false;
      return true;
    });
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function mountGlossary(hostEl, storage) {
    var host = hostEl || (typeof document !== 'undefined' ? document.getElementById('odia-glossary') : null);
    if (!host) return;

    var state = {
      category: 'All',
      savedOnly: false,
      hideOdia: false,
      revealedIds: {}
    };

    function render() {
      clear(host);

      var head = el('div', 'cso-glossary-head');
      var titleGroup = el('div', 'cso-glossary-title-group');
      var h2 = el('h2', '', '📖 Bilingual Odia–English Administrative & Exam Glossary');
      h2.id = 'odia-glossary-heading';
      var sub = el('p', 'cso-glossary-sub', 'Essential Odisha Secretariat, Revenue, Polity & Welfare terminology for OPSC OAS, OSSC CGLRE, and OSSSC examinations.');
      titleGroup.append(h2, sub);

      var filtered = filterTerms({ category: state.category, savedOnly: state.savedOnly }, storage);
      var countBadge = el('span', 'cso-glossary-count', filtered.length + ' / ' + GLOSSARY_TERMS.length + ' Terms');
      countBadge.id = 'odia-glossary-count';
      head.append(titleGroup, countBadge);
      host.appendChild(head);

      var controls = el('div', 'cso-glossary-controls');
      var catSel = document.createElement('select');
      catSel.id = 'odia-glossary-category';
      catSel.className = 'cso-glossary-select';
      catSel.setAttribute('aria-label', 'Filter glossary by administrative category');

      var allOpt = el('option', '', 'All Categories (' + GLOSSARY_TERMS.length + ')');
      allOpt.value = 'All';
      catSel.appendChild(allOpt);
      CATEGORIES.forEach(function (c) {
        var opt = el('option', '', c);
        opt.value = c;
        if (state.category === c) opt.selected = true;
        catSel.appendChild(opt);
      });
      catSel.value = state.category;
      catSel.addEventListener('change', function () {
        state.category = catSel.value || 'All';
        render();
      });

      var savedBtn = el('button', 'cso-glossary-pill' + (state.savedOnly ? ' is-active' : ''), '🔖 Saved for Revision Only (' + loadSaved(storage).length + ')');
      savedBtn.type = 'button';
      savedBtn.id = 'odia-glossary-saved-toggle';
      savedBtn.setAttribute('aria-pressed', String(state.savedOnly));
      savedBtn.addEventListener('click', function () {
        state.savedOnly = !state.savedOnly;
        render();
      });

      var selfTestBtn = el('button', 'cso-glossary-pill' + (state.hideOdia ? ' is-active' : ''), state.hideOdia ? '👁️ Show Odia Meaning' : '🙈 Hide Odia Meaning (Self-Test)');
      selfTestBtn.type = 'button';
      selfTestBtn.id = 'odia-glossary-selftest-btn';
      selfTestBtn.setAttribute('aria-pressed', String(state.hideOdia));
      selfTestBtn.addEventListener('click', function () {
        state.hideOdia = !state.hideOdia;
        state.revealedIds = {};
        render();
      });

      controls.append(catSel, savedBtn, selfTestBtn);
      host.appendChild(controls);

      if (!filtered.length) {
        var empty = el('p', 'cso-glossary-empty', state.savedOnly
          ? 'No glossary terms bookmarked for revision yet. Click "🔖 Save" on any term card to build your personal revision deck.'
          : 'No terms match this category.');
        host.appendChild(empty);
        return;
      }

      var grid = el('div', 'cso-glossary-grid');
      filtered.forEach(function (term) {
        var card = el('article', 'cso-glossary-card');
        var top = el('div', 'cso-glossary-card__top');
        top.appendChild(el('span', 'cso-glossary-cat-badge', term.category));

        var saved = isSaved(term.id, storage);
        var saveBtn = el('button', 'cso-glossary-save-btn' + (saved ? ' is-saved' : ''), saved ? '✓ Saved' : '🔖 Save');
        saveBtn.type = 'button';
        saveBtn.setAttribute('aria-pressed', String(saved));
        saveBtn.addEventListener('click', function () {
          var res = toggleSave(term.id, storage);
          if (state.savedOnly && !res.saved) {
            render();
            return;
          }
          saveBtn.classList.toggle('is-saved', res.saved);
          saveBtn.setAttribute('aria-pressed', String(res.saved));
          saveBtn.textContent = res.saved ? '✓ Saved' : '🔖 Save';
          savedBtn.textContent = '🔖 Saved for Revision Only (' + res.ids.length + ')';
        });
        top.appendChild(saveBtn);
        card.appendChild(top);

        card.appendChild(el('h3', 'cso-glossary-en', term.en));
        card.appendChild(el('span', 'cso-glossary-translit', term.translit));

        var isHidden = state.hideOdia && !state.revealedIds[term.id];
        if (isHidden) {
          var revealBtn = el('button', 'cso-glossary-reveal-btn', '👁️ Reveal Odia Meaning');
          revealBtn.type = 'button';
          revealBtn.addEventListener('click', function () {
            state.revealedIds[term.id] = true;
            render();
          });
          card.appendChild(revealBtn);
        } else {
          card.appendChild(el('div', 'cso-glossary-odia', term.odia));
          card.appendChild(el('p', 'cso-glossary-usage', term.usageEn));
          card.appendChild(el('p', 'cso-glossary-usage cso-glossary-usage--or', term.usageOdia));
        }

        grid.appendChild(card);
      });
      host.appendChild(grid);
    }

    render();
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    CATEGORIES: CATEGORIES,
    GLOSSARY_TERMS: GLOSSARY_TERMS,
    loadSaved: loadSaved,
    saveIds: saveIds,
    isSaved: isSaved,
    toggleSave: toggleSave,
    filterTerms: filterTerms,
    mountGlossary: mountGlossary
  };

  root.CSO_ODIA_GLOSSARY = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { mountGlossary(); });
    } else {
      mountGlossary();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
