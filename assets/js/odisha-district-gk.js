(function (root) {
  'use strict';

  var DISTRICTS_GK = [
    {
      slug: 'angul', nameEn: 'Angul', nameOdia: 'ଅନୁଗୁଳ', headquarters: 'Angul', division: 'Northern',
      rivers: 'Mahanadi, Brahmani',
      gkHighlightsEn: 'Talcher Coalfields, NALCO Aluminium Smelter & Satkosia Tiger Reserve.',
      gkHighlightsOdia: 'ତାଳଚେର କୋଇଲା ଖଣି, ନାଲକୋ ଆଲୁମିନିୟମ୍ ପ୍ଲାଣ୍ଟ ଓ ସାତକୋଶିଆ ବ୍ୟାଘ୍ର ଅଭୟାରଣ୍ୟ।',
      jobsFilterUrl: '/jobs-careers/?district=angul'
    },
    {
      slug: 'balangir', nameEn: 'Balangir', nameOdia: 'ବଲାଙ୍ଗୀର', headquarters: 'Balangir', division: 'Northern',
      rivers: 'Tel, Suktel, Ong',
      gkHighlightsEn: 'Ranipur-Jharial 64 Yogini Temple, Harishankar Temple & Lower Suktel Project.',
      gkHighlightsOdia: 'ରାଣୀପୁର-ଝରିଆଲ ୬୪ ଯୋଗିନୀ ପୀଠ, ହରିଶଙ୍କର ମନ୍ଦିର ଓ ଲୋୟର ସୁକତେଲ ପ୍ରକଳ୍ପ।',
      jobsFilterUrl: '/jobs-careers/?district=balangir'
    },
    {
      slug: 'balasore', nameEn: 'Balasore', nameOdia: 'ବାଲେଶ୍ୱର', headquarters: 'Balasore', division: 'Central',
      rivers: 'Budhabalanga, Subarnarekha',
      gkHighlightsEn: 'Chandipur-on-sea, DRDO Integrated Test Range (ITR), Fakir Mohan Senapati birthplace.',
      gkHighlightsOdia: 'ଚାନ୍ଦିପୁର ବେଳାଭୂମି, DRDO କ୍ଷେପଣାସ୍ତ୍ର ପରୀକ୍ଷଣ କେନ୍ଦ୍ର ଓ ଫକୀର ମୋହନ ସେନାପତିଙ୍କ ଜନ୍ମସ୍ଥାନ।',
      jobsFilterUrl: '/jobs-careers/?district=balasore'
    },
    {
      slug: 'bargarh', nameEn: 'Bargarh', nameOdia: 'ବରଗଡ଼', headquarters: 'Bargarh', division: 'Northern',
      rivers: 'Jira, Ong, Mahanadi',
      gkHighlightsEn: 'World-famous Dhanu Yatra, Rice Bowl of Odisha & Nrusinghanath Temple (Gandhamardan).',
      gkHighlightsOdia: 'ବିଶ୍ୱପ୍ରସିଦ୍ଧ ଧନୁଯାତ୍ରା, ଓଡ଼ିଶାର ଭାତହାଣ୍ଡି ଓ ଗନ୍ଧମାର୍ଦ୍ଦନ ପର୍ବତର ନୃସିଂହନାଥ ପୀଠ।',
      jobsFilterUrl: '/jobs-careers/?district=bargarh'
    },
    {
      slug: 'bhadrak', nameEn: 'Bhadrak', nameOdia: 'ଭଦ୍ରକ', headquarters: 'Bhadrak', division: 'Central',
      rivers: 'Salandi, Baitarani',
      gkHighlightsEn: 'Dhamra Port, Akhandalamani Shiva Temple (Aradi) & Dr. Harekrushna Mahatab.',
      gkHighlightsOdia: 'ଧାମରା ବନ୍ଦର, ଆରଡ଼ିର ବାବା ଆଖଣ୍ଡଳମଣି ପୀଠ ଓ ଡଃ ହରେକୃଷ୍ଣ ମହତାବ।',
      jobsFilterUrl: '/jobs-careers/?district=bhadrak'
    },
    {
      slug: 'boudh', nameEn: 'Boudh', nameOdia: 'ବୌଦ୍ଧ', headquarters: 'Boudh', division: 'Southern',
      rivers: 'Mahanadi, Tel, Bagh',
      gkHighlightsEn: 'Charisambhu Temple, ancient Buddhist heritage & central Mahanadi valley.',
      gkHighlightsOdia: 'ଚାରିଶମ୍ଭୁ ମନ୍ଦିର, ପ୍ରାଚୀନ ବୌଦ୍ଧ ଐତିହ୍ୟ ଓ ମହାନଦୀ ଅବବାହିକା।',
      jobsFilterUrl: '/jobs-careers/?district=boudh'
    },
    {
      slug: 'cuttack', nameEn: 'Cuttack', nameOdia: 'କଟକ', headquarters: 'Cuttack', division: 'Central',
      rivers: 'Mahanadi, Kathajodi, Birupa',
      gkHighlightsEn: 'Silver City (Tarakasi GI), Orissa High Court, Barabati Fort, Netaji Birthplace & NRRI.',
      gkHighlightsOdia: 'ରୌପ୍ୟ ନଗରୀ (ତାରକସି GI), ଓଡ଼ିଶା ହାଇକୋର୍ଟ, ବାରବାଟୀ ଦୁର୍ଗ ଓ ନେତାଜୀ ଜନ୍ମସ୍ଥାନ।',
      jobsFilterUrl: '/jobs-careers/?district=cuttack'
    },
    {
      slug: 'deogarh', nameEn: 'Deogarh', nameOdia: 'ଦେବଗଡ଼', headquarters: 'Deogarh', division: 'Northern',
      rivers: 'Brahmani, Gohira',
      gkHighlightsEn: 'Pradhanpat Waterfall, smallest district by population & erstwhile Bamra State.',
      gkHighlightsOdia: 'ପ୍ରଧାନପାଟ ଜଳପ୍ରପାତ, ଜନସଂଖ୍ୟାରେ କ୍ଷୁଦ୍ରତମ ଜିଲ୍ଲା ଓ ପୂର୍ବତନ ବାମଣ୍ଡା ରାଜ୍ୟ।',
      jobsFilterUrl: '/jobs-careers/?district=deogarh'
    },
    {
      slug: 'dhenkanal', nameEn: 'Dhenkanal', nameOdia: 'ଢେଙ୍କାନାଳ', headquarters: 'Dhenkanal', division: 'Northern',
      rivers: 'Brahmani, Ramiala',
      gkHighlightsEn: 'Kapilash Temple, Joranda Mahima Gadi & Dhenkanal Magji (GI Tag).',
      gkHighlightsOdia: 'କପିଳାସ ଚନ୍ଦ୍ରଶେଖର ପୀଠ, ଜୋରନ୍ଦା ମହିମା ଗାଦି ଓ ଢେଙ୍କାନାଳ ମଗଜି (GI ଟ୍ୟାଗ୍)।',
      jobsFilterUrl: '/jobs-careers/?district=dhenkanal'
    },
    {
      slug: 'gajapati', nameEn: 'Gajapati', nameOdia: 'ଗଜପତି', headquarters: 'Paralakhemundi', division: 'Southern',
      rivers: 'Mahendratanaya, Vamsadhara',
      gkHighlightsEn: 'Mahendragiri Hills, Paralakhemundi Palace (Krushna Chandra Gajapati) & Jirang Monastery.',
      gkHighlightsOdia: 'ମହେନ୍ଦ୍ରଗିରି ପର୍ବତ, ପାରଳାଖେମୁଣ୍ଡି ରାଜପ୍ରସାଦ ଓ ଜୀରାଙ୍ଗ ବୌଦ୍ଧ ମଠ।',
      jobsFilterUrl: '/jobs-careers/?district=gajapati'
    },
    {
      slug: 'ganjam', nameEn: 'Ganjam', nameOdia: 'ଗଞ୍ଜାମ', headquarters: 'Chhatrapur', division: 'Southern',
      rivers: 'Rushikulya, Bahuda',
      gkHighlightsEn: 'Gopalpur-on-Sea, Tara Tarini Shakti Peetha, Rushikulya Olive Ridley rookery & Berhampur Silk.',
      gkHighlightsOdia: 'ଗୋପାଳପୁର ବେଳାଭୂମି, ତାରାତାରିଣୀ ଶକ୍ତିପୀଠ, ଋଷିକୁଲ୍ୟା କଇଁଛ ଅଣ୍ଡାଦାନ ସ୍ଥଳ ଓ ବ୍ରହ୍ମପୁର ପାଟ।',
      jobsFilterUrl: '/jobs-careers/?district=ganjam'
    },
    {
      slug: 'jagatsinghpur', nameEn: 'Jagatsinghpur', nameOdia: 'ଜଗତସିଂହପୁର', headquarters: 'Jagatsinghpur', division: 'Central',
      rivers: 'Mahanadi, Devi, Biluakhai',
      gkHighlightsEn: 'Paradip Major Port, Sarala Peetha (Jhankad) & smallest district by area in Odisha.',
      gkHighlightsOdia: 'ପାରାଦୀପ ବନ୍ଦର, ଝଙ୍କଡ଼ର ମା ଶାରଳା ପୀଠ ଓ ଆୟତନରେ ଓଡ଼ିଶାର କ୍ଷୁଦ୍ରତମ ଜିଲ୍ଲା।',
      jobsFilterUrl: '/jobs-careers/?district=jagatsinghpur'
    },
    {
      slug: 'jajpur', nameEn: 'Jajpur', nameOdia: 'ଯାଜପୁର', headquarters: 'Jajpur (Panikoili)', division: 'Central',
      rivers: 'Baitarani, Kharasrota, Brahmani',
      gkHighlightsEn: 'Biraja Shakti Peetha (Navi Gaya), Ratnagiri-Udayagiri-Lalitgiri Buddhist Diamond Triangle & Kalinganagar.',
      gkHighlightsOdia: 'ମା ବିରଜା ପୀଠ (ନାଭି ଗୟା), ରତ୍ନଗିରି-ଉଦୟଗିରି-ଲଳିତଗିରି ବୌଦ୍ଧ ହୀରକ ତ୍ରିଭୁଜ।',
      jobsFilterUrl: '/jobs-careers/?district=jajpur'
    },
    {
      slug: 'jharsuguda', nameEn: 'Jharsuguda', nameOdia: 'ଝାରସୁଗୁଡ଼ା', headquarters: 'Jharsuguda', division: 'Northern',
      rivers: 'Ib, Bheden',
      gkHighlightsEn: 'Veer Surendra Sai Airport, IB Valley Coalfields & industrial power hub of Western Odisha.',
      gkHighlightsOdia: 'ବୀର ସୁରେନ୍ଦ୍ର ସାଏ ବିମାନବନ୍ଦର, ଇବ୍ ଉପତ୍ୟକା କୋଇଲା ଖଣି ଓ ପଶ୍ଚିମ ଓଡ଼ିଶାର ଶିଳ୍ପ କେନ୍ଦ୍ର।',
      jobsFilterUrl: '/jobs-careers/?district=jharsuguda'
    },
    {
      slug: 'kalahandi', nameEn: 'Kalahandi', nameOdia: 'କଳାହାଣ୍ଡି', headquarters: 'Bhawanipatna', division: 'Southern',
      rivers: 'Indravati, Tel, Hati',
      gkHighlightsEn: 'Upper Indravati Hydro Project, Maa Manikeswari Temple & Karlapat Wildlife Sanctuary.',
      gkHighlightsOdia: 'ଉପର ଇନ୍ଦ୍ରାବତୀ ଜଳବିଦ୍ୟୁତ୍ ପ୍ରକଳ୍ପ, ମା ମାଣିକେଶ୍ୱରୀ ମନ୍ଦିର ଓ କର୍ଲାପାଟ ଅଭୟାରଣ୍ୟ।',
      jobsFilterUrl: '/jobs-careers/?district=kalahandi'
    },
    {
      slug: 'kandhamal', nameEn: 'Kandhamal', nameOdia: 'କନ୍ଧମାଳ', headquarters: 'Phulbani', division: 'Southern',
      rivers: 'Salunki, Khadaga',
      gkHighlightsEn: 'Daringbadi (Kashmir of Odisha) & Kandhamal Haladi (Turmeric GI Tag).',
      gkHighlightsOdia: 'ଦାରିଙ୍ଗିବାଡ଼ି (ଓଡ଼ିଶାର କାଶ୍ମୀର) ଓ କନ୍ଧମାଳ ହଳଦୀ (GI ଟ୍ୟାଗ୍)।',
      jobsFilterUrl: '/jobs-careers/?district=kandhamal'
    },
    {
      slug: 'kendrapara', nameEn: 'Kendrapara', nameOdia: 'କେନ୍ଦ୍ରାପଡ଼ା', headquarters: 'Kendrapara', division: 'Central',
      rivers: 'Brahmani, Baitarani, Luna',
      gkHighlightsEn: 'Bhitarkanika National Park, Gahirmatha Marine Sanctuary & Baladevjew Temple (Tulsi Kshetra).',
      gkHighlightsOdia: 'ଭିତରକନିକା ଜାତୀୟ ଉଦ୍ୟାନ, ଗହୀରମଥା ସାମୁଦ୍ରିକ ଅଭୟାରଣ୍ୟ ଓ ତୁଳସୀ କ୍ଷେତ୍ର ବଳଦେବଜୀଉ ମନ୍ଦିର।',
      jobsFilterUrl: '/jobs-careers/?district=kendrapara'
    },
    {
      slug: 'kendujhar', nameEn: 'Kendujhar', nameOdia: 'କେନ୍ଦୁଝର', headquarters: 'Kendujhar', division: 'Northern',
      rivers: 'Baitarani, Aradei',
      gkHighlightsEn: 'Ghatagaon Maa Tarini Temple, Sanaghagara Waterfall, Iron & Manganese ore reserves.',
      gkHighlightsOdia: 'ଘଟଗାଁ ମା ତାରିଣୀ ପୀଠ, ସାନଘାଗରା ଜଳପ୍ରପାତ ଓ ଲୌହ-ମାଙ୍ଗାନିଜ୍ ଖଣିଜ ସମ୍ପଦ।',
      jobsFilterUrl: '/jobs-careers/?district=kendujhar'
    },
    {
      slug: 'khordha', nameEn: 'Khordha', nameOdia: 'ଖୋର୍ଦ୍ଧା', headquarters: 'Khordha', division: 'Central',
      rivers: 'Daya, Kuakhai, Bhargavi',
      gkHighlightsEn: 'State Capital Bhubaneswar, Lingaraj Temple, Dhauli Peace Pagoda, Nandankanan & Paika Rebellion (1817).',
      gkHighlightsOdia: 'ରାଜ୍ୟ ରାଜଧାନୀ ଭୁବନେଶ୍ୱର, ଲିଙ୍ଗରାଜ ମନ୍ଦିର, ଧଉଳି ଶାନ୍ତିସ୍ତୂପ ଓ ୧୮୧୭ ପାଇକ ବିଦ୍ରୋହ।',
      jobsFilterUrl: '/jobs-careers/?district=khordha'
    },
    {
      slug: 'koraput', nameEn: 'Koraput', nameOdia: 'କୋରାପୁଟ', headquarters: 'Koraput', division: 'Southern',
      rivers: 'Kolab, Machkund, Indravati',
      gkHighlightsEn: 'Deomali (Highest Peak of Odisha, 1672m), Sabara Srikhetra, HAL Sunabeda & Koraput Kalajeera Rice (GI).',
      gkHighlightsOdia: 'ଦେଓମାଳି (ଓଡ଼ିଶାର ଉଚ୍ଚତମ ଶୃଙ୍ଗ), ଶବର ଶ୍ରୀକ୍ଷେତ୍ର ଓ କୋରାପୁଟ କଳାଜୀରା ଧାନ (GI)।',
      jobsFilterUrl: '/jobs-careers/?district=koraput'
    },
    {
      slug: 'malkangiri', nameEn: 'Malkangiri', nameOdia: 'ମାଲକାନଗିରି', headquarters: 'Malkangiri', division: 'Southern',
      rivers: 'Sabari, Sileru, Potteru',
      gkHighlightsEn: 'Balimela Hydroelectric Project, Chitrakonda (Gurupriya Setu) & Bonda Hills.',
      gkHighlightsOdia: 'ବାଲିମେଳା ଜଳବିଦ୍ୟୁତ୍ ପ୍ରକଳ୍ପ, ଗୁରୁପ୍ରିୟା ସେତୁ (ସ୍ୱାଭିମାନ ଅଞ୍ଚଳ) ଓ ବଣ୍ଡା ପାହାଡ଼।',
      jobsFilterUrl: '/jobs-careers/?district=malkangiri'
    },
    {
      slug: 'mayurbhanj', nameEn: 'Mayurbhanj', nameOdia: 'ମୟୂରଭଞ୍ଜ', headquarters: 'Baripada', division: 'Central',
      rivers: 'Budhabalanga, Baitarani, Kharkai',
      gkHighlightsEn: 'Largest district by area, Similipal Biosphere Reserve, Chhau Dance & Kai Chutney (GI Tag).',
      gkHighlightsOdia: 'ଆୟତନରେ ବୃହତ୍ତମ ଜିଲ୍ଲା, ଶିମିଳିପାଳ ଜୈବମଣ୍ଡଳ, ଛଉ ନୃତ୍ୟ ଓ କାଇ ଚଟଣି (GI)।',
      jobsFilterUrl: '/jobs-careers/?district=mayurbhanj'
    },
    {
      slug: 'nabarangpur', nameEn: 'Nabarangpur', nameOdia: 'ନବରଙ୍ଗପୁର', headquarters: 'Nabarangpur', division: 'Southern',
      rivers: 'Indravati, Bhaskel, Turi',
      gkHighlightsEn: 'Maize Bowl of Odisha, Papadahandi Shaheed Minar (1942 Quit India) & Podagarh heritage.',
      gkHighlightsOdia: 'ଓଡ଼ିଶାର ମକା ଭଣ୍ଡାର, ପାପଡ଼ାହାଣ୍ଡି ଶହୀଦ ମିନାର (୧୯୪୨) ଓ ପୋଡ଼ାଗଡ଼ ଐତିହ୍ୟ।',
      jobsFilterUrl: '/jobs-careers/?district=nabarangpur'
    },
    {
      slug: 'nayagarh', nameEn: 'Nayagarh', nameOdia: 'ନୟାଗଡ଼', headquarters: 'Nayagarh', division: 'Central',
      rivers: 'Mahanadi, Kusumi, Brutanga',
      gkHighlightsEn: 'Kantilo Nilamadhav Temple, Odagaon Raghunath Temple & Pathani Samanta birthplace (Khandapada).',
      gkHighlightsOdia: 'କଣ୍ଟିଲୋ ନୀଳମାଧବ ପୀଠ, ଓଡ଼ଗାଁ ରଘୁନାଥ ମନ୍ଦିର ଓ ପଠାଣି ସାମନ୍ତଙ୍କ ଜନ୍ମସ୍ଥାନ (ଖଣ୍ଡପଡ଼ା)।',
      jobsFilterUrl: '/jobs-careers/?district=nayagarh'
    },
    {
      slug: 'nuapada', nameEn: 'Nuapada', nameOdia: 'ନୂଆପଡ଼ା', headquarters: 'Nuapada', division: 'Southern',
      rivers: 'Jonk, Udanti, Indra',
      gkHighlightsEn: 'Sunabeda Wildlife Sanctuary, Patalaganga & Yogeswar Temple (Patora).',
      gkHighlightsOdia: 'ସୁନାବେଡ଼ା ବନ୍ୟପ୍ରାଣୀ ଅଭୟାରଣ୍ୟ, ପାତାଳଗଙ୍ଗା ଓ ପତୋରା ଯୋଗେଶ୍ୱର ମନ୍ଦିର।',
      jobsFilterUrl: '/jobs-careers/?district=nuapada'
    },
    {
      slug: 'puri', nameEn: 'Puri', nameOdia: 'ପୁରୀ', headquarters: 'Puri', division: 'Central',
      rivers: 'Bhargavi, Kushabhadra, Daya',
      gkHighlightsEn: 'Shree Jagannath Temple, Konark Sun Temple (UNESCO), Chilika Lake & Raghurajpur Pattachitra.',
      gkHighlightsOdia: 'ଶ୍ରୀ ଜଗନ୍ନାଥ ମନ୍ଦିର, କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର, ଚିଲିକା ହ୍ରଦ ଓ ରଘୁରାଜପୁର ପଟ୍ଟଚିତ୍ର।',
      jobsFilterUrl: '/jobs-careers/?district=puri'
    },
    {
      slug: 'rayagada', nameEn: 'Rayagada', nameOdia: 'ରାୟଗଡ଼ା', headquarters: 'Rayagada', division: 'Southern',
      rivers: 'Nagavali, Vamsadhara',
      gkHighlightsEn: 'Maa Majhighariani Temple, Chatikona Dongria Kondh market & Rayagada Kapadaganda shawl (GI).',
      gkHighlightsOdia: 'ମା ମଝିଘରିଆଣି ମନ୍ଦିର, ଡଙ୍ଗରିଆ କନ୍ଧ ହାଟ ଓ କପଡ଼ାଗଣ୍ଡା ଶାଲ୍ (GI)।',
      jobsFilterUrl: '/jobs-careers/?district=rayagada'
    },
    {
      slug: 'sambalpur', nameEn: 'Sambalpur', nameOdia: 'ସମ୍ବଲପୁର', headquarters: 'Sambalpur', division: 'Northern',
      rivers: 'Mahanadi, Ib',
      gkHighlightsEn: 'Hirakud Dam, Maa Samaleswari Temple, Leaning Temple of Huma & Sambalpuri Ikat Saree (GI).',
      gkHighlightsOdia: 'ହୀରାକୁଦ ବନ୍ଧ, ମା ସମଲେଶ୍ୱରୀ ପୀଠ, ହୁମା ବକ୍ର ମନ୍ଦିର ଓ ସମ୍ବଲପୁରୀ ଶାଢ଼ୀ (GI)।',
      jobsFilterUrl: '/jobs-careers/?district=sambalpur'
    },
    {
      slug: 'subarnapur', nameEn: 'Subarnapur', nameOdia: 'ସୁବର୍ଣ୍ଣପୁର', headquarters: 'Sonepur', division: 'Northern',
      rivers: 'Mahanadi, Tel, Ong',
      gkHighlightsEn: 'Second Temple City of Odisha, Metakani Temple, Bhima Bhoi Samadhi (Khaliapali) & Bomkai Saree.',
      gkHighlightsOdia: 'ଓଡ଼ିଶାର ଦ୍ୱିତୀୟ ମନ୍ଦିର ମାଳିନୀ ସହର, ମେଟାକାନୀ ପୀଠ, ଭୀମ ଭୋଇ ସମାଧି ଓ ବୋମକାଇ ଶାଢ଼ୀ।',
      jobsFilterUrl: '/jobs-careers/?district=subarnapur'
    },
    {
      slug: 'sundargarh', nameEn: 'Sundargarh', nameOdia: 'ସୁନ୍ଦରଗଡ଼', headquarters: 'Sundargarh', division: 'Northern',
      rivers: 'Brahmani, Sankha, Koel',
      gkHighlightsEn: 'Rourkela Steel Plant, Birsa Munda International Hockey Stadium, Vedavyas & Khandadhar Waterfall.',
      gkHighlightsOdia: 'ରାଉରକେଲା ଇସ୍ପାତ କାରଖାନା, ବିର୍ସା ମୁଣ୍ଡା ହକି ଷ୍ଟାଡିୟମ୍, ବେଦବ୍ୟାସ ଓ ଖଣ୍ଡାଧାର ଜଳପ୍ରପାତ।',
      jobsFilterUrl: '/jobs-careers/?district=sundargarh'
    }
  ];

  function filterDistricts(division, slug) {
    var div = String(division || 'All').trim();
    var s = String(slug || '').trim().toLowerCase();
    return DISTRICTS_GK.filter(function (d) {
      if (div && div !== 'All' && d.division !== div) return false;
      if (s && s !== 'all' && d.slug !== s) return false;
      return true;
    });
  }

  function generateDistrictDrill(seedIndex) {
    var start = Number(seedIndex) || 0;
    var questions = [];
    for (var i = 0; i < 5; i++) {
      var idx = (start + i * 6) % DISTRICTS_GK.length;
      var d = DISTRICTS_GK[idx];
      var qType = i % 3;
      var distractors = [
        DISTRICTS_GK[(idx + 3) % DISTRICTS_GK.length],
        DISTRICTS_GK[(idx + 7) % DISTRICTS_GK.length],
        DISTRICTS_GK[(idx + 11) % DISTRICTS_GK.length]
      ];
      if (qType === 0) {
        var opts0 = [d.headquarters, distractors[0].headquarters, distractors[1].headquarters, distractors[2].headquarters];
        questions.push({
          id: 'dgk-hq-' + d.slug,
          question: 'What is the administrative headquarters of ' + d.nameEn + ' (' + d.nameOdia + ') district?',
          options: opts0,
          answerIndex: 0,
          explanation: d.nameEn + ' headquarters is ' + d.headquarters + ' (' + d.division + ' Division).'
        });
      } else if (qType === 1) {
        var divOpts = ['Central', 'Northern', 'Southern'];
        questions.push({
          id: 'dgk-div-' + d.slug,
          question: d.nameEn + ' district falls under which Revenue Division of Odisha?',
          options: divOpts,
          answerIndex: divOpts.indexOf(d.division),
          explanation: d.nameEn + ' is part of the ' + d.division + ' Revenue Division.'
        });
      } else {
        var opts2 = [d.nameEn, distractors[0].nameEn, distractors[1].nameEn, distractors[2].nameEn];
        questions.push({
          id: 'dgk-gk-' + d.slug,
          question: 'Which Odisha district is renowned for: ' + d.gkHighlightsEn,
          options: opts2,
          answerIndex: 0,
          explanation: d.nameEn + ' (' + d.rivers + '): ' + d.gkHighlightsEn
        });
      }
    }
    return questions;
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

  function mountDistrictGk(hostEl) {
    var host = hostEl || (typeof document !== 'undefined' ? document.getElementById('odisha-district-gk') : null);
    if (!host) return;

    var state = {
      division: 'All',
      selectedSlug: 'all',
      lang: 'en',
      drillOpen: false,
      drillSeed: 0,
      drillAnswers: {}
    };

    function render() {
      clear(host);

      var head = el('div', 'cso-dgk-head');
      var titleGroup = el('div', 'cso-dgk-title-group');
      var h2 = el('h2', '', '🗺️ Odisha 30-District Static GK & Exam Fact-Sheet Explorer');
      h2.id = 'odisha-district-gk-heading';
      var sub = el('p', 'cso-dgk-sub', 'Explore all 30 Odisha districts across Central, Northern & Southern Revenue Divisions with rivers, GI tags, headquarters & district-level job links.');
      titleGroup.append(h2, sub);

      var filtered = filterDistricts(state.division, state.selectedSlug);
      var badge = el('span', 'cso-dgk-badge', filtered.length + ' / 30 Districts');
      badge.id = 'district-gk-count';
      head.append(titleGroup, badge);
      host.appendChild(head);

      var controls = el('div', 'cso-dgk-controls');

      var divSel = document.createElement('select');
      divSel.id = 'district-gk-division';
      divSel.className = 'cso-dgk-select';
      divSel.setAttribute('aria-label', 'Filter by Revenue Division');
      [
        { v: 'All', l: 'All 30 Districts (3 Divisions)' },
        { v: 'Central', l: 'Central Division (Cuttack)' },
        { v: 'Northern', l: 'Northern Division (Sambalpur)' },
        { v: 'Southern', l: 'Southern Division (Berhampur)' }
      ].forEach(function (optData) {
        var opt = el('option', '', optData.l);
        opt.value = optData.v;
        if (state.division === optData.v) opt.selected = true;
        divSel.appendChild(opt);
      });
      divSel.value = state.division;
      divSel.addEventListener('change', function () {
        state.division = divSel.value || 'All';
        state.selectedSlug = 'all';
        render();
      });

      var jumpSel = document.createElement('select');
      jumpSel.id = 'district-gk-jump';
      jumpSel.className = 'cso-dgk-select';
      jumpSel.setAttribute('aria-label', 'Jump to District');
      var divDistricts = filterDistricts(state.division, 'all');
      var allJumpOpt = el('option', '', 'All Districts in View (' + divDistricts.length + ')');
      allJumpOpt.value = 'all';
      jumpSel.appendChild(allJumpOpt);
      divDistricts.forEach(function (d) {
        var opt = el('option', '', d.nameEn + ' (' + d.nameOdia + ')');
        opt.value = d.slug;
        if (state.selectedSlug === d.slug) opt.selected = true;
        jumpSel.appendChild(opt);
      });
      jumpSel.value = state.selectedSlug;
      jumpSel.addEventListener('change', function () {
        state.selectedSlug = jumpSel.value || 'all';
        render();
      });

      var langBtn = el('button', 'cso-dgk-btn', state.lang === 'en' ? '🌐 EN / ଓଡ଼ିଆ' : '🌐 ଓଡ଼ିଆ / EN');
      langBtn.type = 'button';
      langBtn.id = 'district-gk-lang-btn';
      langBtn.addEventListener('click', function () {
        state.lang = state.lang === 'en' ? 'or' : 'en';
        render();
      });

      var drillBtn = el('button', 'cso-dgk-btn cso-dgk-btn--primary' + (state.drillOpen ? ' is-active' : ''), state.drillOpen ? '✕ Close 5-Q District Drill' : '⚡ Quick 5-Question District GK Drill');
      drillBtn.type = 'button';
      drillBtn.id = 'district-gk-drill-btn';
      drillBtn.setAttribute('aria-pressed', String(state.drillOpen));
      drillBtn.addEventListener('click', function () {
        state.drillOpen = !state.drillOpen;
        if (state.drillOpen) state.drillAnswers = {};
        render();
      });

      controls.append(divSel, jumpSel, langBtn, drillBtn);
      host.appendChild(controls);

      if (state.drillOpen) {
        var drillBox = el('div', 'cso-dgk-drill');
        drillBox.id = 'district-gk-drill-box';
        var questions = generateDistrictDrill(state.drillSeed);
        var correctCount = 0;
        var answeredCount = 0;
        questions.forEach(function (q, qi) {
          if (state.drillAnswers[qi] !== undefined) {
            answeredCount += 1;
            if (state.drillAnswers[qi] === q.answerIndex) correctCount += 1;
          }
        });

        var drillHead = el('div', 'cso-dgk-drill__head');
        drillHead.appendChild(el('strong', '', '⚡ 5-Question Odisha District GK Self-Test (' + correctCount + ' / 5 Correct)'));
        var newSetBtn = el('button', 'cso-dgk-btn', '↻ New 5 Questions');
        newSetBtn.type = 'button';
        newSetBtn.addEventListener('click', function () {
          state.drillSeed = (state.drillSeed + 1) % DISTRICTS_GK.length;
          state.drillAnswers = {};
          render();
        });
        drillHead.appendChild(newSetBtn);
        drillBox.appendChild(drillHead);

        questions.forEach(function (q, qi) {
          var qCard = el('div', 'cso-dgk-q');
          qCard.appendChild(el('p', 'cso-dgk-q__title', (qi + 1) + '. ' + q.question));
          var optsWrap = el('div', 'cso-dgk-q__opts');
          var picked = state.drillAnswers[qi];
          q.options.forEach(function (optText, oi) {
            var cls = 'cso-dgk-opt';
            if (picked !== undefined) {
              if (oi === q.answerIndex) cls += ' is-correct';
              else if (oi === picked) cls += ' is-wrong';
            }
            var oBtn = el('button', cls, optText);
            oBtn.type = 'button';
            oBtn.disabled = picked !== undefined;
            oBtn.addEventListener('click', function () {
              state.drillAnswers[qi] = oi;
              render();
            });
            optsWrap.appendChild(oBtn);
          });
          qCard.appendChild(optsWrap);
          if (picked !== undefined) {
            qCard.appendChild(el('p', 'cso-dgk-q__exp', (picked === q.answerIndex ? '✓ ' : '✗ ') + q.explanation));
          }
          drillBox.appendChild(qCard);
        });
        host.appendChild(drillBox);
      }

      var grid = el('div', 'cso-dgk-grid');
      filtered.forEach(function (d) {
        var card = el('article', 'cso-dgk-card');
        var top = el('div', 'cso-dgk-card__top');
        top.appendChild(el('span', 'cso-dgk-div-badge', d.division + ' Division'));
        top.appendChild(el('span', 'cso-dgk-hq', 'HQ: ' + d.headquarters));
        card.appendChild(top);

        card.appendChild(el('h3', 'cso-dgk-name', d.nameEn + ' (' + d.nameOdia + ')'));
        card.appendChild(el('p', 'cso-dgk-rivers', '🌊 Rivers: ' + d.rivers));
        card.appendChild(el('p', 'cso-dgk-fact', state.lang === 'or' ? d.gkHighlightsOdia : d.gkHighlightsEn));

        var jobLink = el('a', 'cso-dgk-btn cso-dgk-job-link', '💼 District Job Alerts →');
        jobLink.href = d.jobsFilterUrl;
        card.appendChild(jobLink);

        grid.appendChild(card);
      });
      host.appendChild(grid);
    }

    render();
  }

  var api = {
    DISTRICTS_GK: DISTRICTS_GK,
    filterDistricts: filterDistricts,
    generateDistrictDrill: generateDistrictDrill,
    mountDistrictGk: mountDistrictGk
  };

  root.CSO_ODISHA_DISTRICT_GK = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { mountDistrictGk(); });
    } else {
      mountDistrictGk();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
