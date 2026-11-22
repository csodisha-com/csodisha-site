(function (global) {
  'use strict';

  var DISTRICTS = [
    { slug: 'angul', name_en: 'Angul', name_or: 'ଅନୁଗୁଳ', division: 'Northern', notice_url: 'https://angul.nic.in/notice_category/recruitment/' },
    { slug: 'balangir', name_en: 'Balangir', name_or: 'ବଲାଙ୍ଗୀର', division: 'Northern', notice_url: 'https://balangir.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'balasore', name_en: 'Balasore', name_or: 'ବାଲେଶ୍ୱର', division: 'Central', notice_url: 'https://balasore.nic.in/notice_category/recruitment/' },
    { slug: 'bargarh', name_en: 'Bargarh', name_or: 'ବରଗଡ଼', division: 'Northern', notice_url: 'https://bargarh.nic.in/notice_category/recruitment/' },
    { slug: 'bhadrak', name_en: 'Bhadrak', name_or: 'ଭଦ୍ରକ', division: 'Central', notice_url: 'https://bhadrak.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'boudh', name_en: 'Boudh', name_or: 'ବୌଦ୍ଧ', division: 'Southern', notice_url: 'https://boudh.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'cuttack', name_en: 'Cuttack', name_or: 'କଟକ', division: 'Central', notice_url: 'https://cuttack.nic.in/notice_category/recruitment/' },
    { slug: 'deogarh', name_en: 'Deogarh', name_or: 'ଦେବଗଡ଼', division: 'Northern', notice_url: 'https://deogarh.nic.in/notice_category/recruitment/' },
    { slug: 'dhenkanal', name_en: 'Dhenkanal', name_or: 'ଢେଙ୍କାନାଳ', division: 'Northern', notice_url: 'https://dhenkanal.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'gajapati', name_en: 'Gajapati', name_or: 'ଗଜପତି', division: 'Southern', notice_url: 'https://gajapati.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'ganjam', name_en: 'Ganjam', name_or: 'ଗଞ୍ଜାମ', division: 'Southern', notice_url: 'https://ganjam.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'jagatsinghpur', name_en: 'Jagatsinghpur', name_or: 'ଜଗତସିଂହପୁର', division: 'Central', notice_url: 'https://jagatsinghpur.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'jajpur', name_en: 'Jajpur', name_or: 'ଯାଜପୁର', division: 'Central', notice_url: 'https://jajpur.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'jharsuguda', name_en: 'Jharsuguda', name_or: 'ଝାରସୁଗୁଡ଼ା', division: 'Northern', notice_url: 'https://jharsuguda.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'kalahandi', name_en: 'Kalahandi', name_or: 'କଳାହାଣ୍ଡି', division: 'Southern', notice_url: 'https://kalahandi.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'kandhamal', name_en: 'Kandhamal', name_or: 'କନ୍ଧମାଳ', division: 'Southern', notice_url: 'https://kandhamal.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'kendrapara', name_en: 'Kendrapara', name_or: 'କେନ୍ଦ୍ରାପଡ଼ା', division: 'Central', notice_url: 'https://kendrapara.nic.in/notice_category/recruitment/' },
    { slug: 'kendujhar', name_en: 'Kendujhar', name_or: 'କେନ୍ଦୁଝର', division: 'Northern', notice_url: 'https://kendujhar.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'khordha', name_en: 'Khordha', name_or: 'ଖୋର୍ଦ୍ଧା', division: 'Central', notice_url: 'https://khordha.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'koraput', name_en: 'Koraput', name_or: 'କୋରାପୁଟ', division: 'Southern', notice_url: 'https://koraput.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'malkangiri', name_en: 'Malkangiri', name_or: 'ମାଲକାନଗିରି', division: 'Southern', notice_url: 'https://malkangiri.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'mayurbhanj', name_en: 'Mayurbhanj', name_or: 'ମୟୂରଭଞ୍ଜ', division: 'Central', notice_url: 'https://mayurbhanj.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'nabarangpur', name_en: 'Nabarangpur', name_or: 'ନବରଙ୍ଗପୁର', division: 'Southern', notice_url: 'https://nabarangpur.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'nayagarh', name_en: 'Nayagarh', name_or: 'ନୟାଗଡ଼', division: 'Central', notice_url: 'https://nayagarh.nic.in/notice_category/recruitment/' },
    { slug: 'nuapada', name_en: 'Nuapada', name_or: 'ନୂଆପଡ଼ା', division: 'Southern', notice_url: 'https://nuapada.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'puri', name_en: 'Puri', name_or: 'ପୁରୀ', division: 'Central', notice_url: 'https://puri.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'rayagada', name_en: 'Rayagada', name_or: 'ରାୟଗଡ଼ା', division: 'Southern', notice_url: 'https://rayagada.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'sambalpur', name_en: 'Sambalpur', name_or: 'ସମ୍ବଲପୁର', division: 'Northern', notice_url: 'https://sambalpur.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'subarnapur', name_en: 'Subarnapur', name_or: 'ସୁବର୍ଣ୍ଣପୁର', division: 'Northern', notice_url: 'https://subarnapur.odisha.gov.in/notice_category/recruitment/' },
    { slug: 'sundargarh', name_en: 'Sundargarh', name_or: 'ସୁନ୍ଦରଗଡ଼', division: 'Northern', notice_url: 'https://sundargarh.nic.in/notice_category/recruitment/' }
  ];

  global.CSO_ODISHA_DISTRICTS = DISTRICTS;
  global.CSO_FIND_ODISHA_DISTRICT = function (slug) {
    var key = String(slug || '').trim().toLowerCase();
    if (!key) return null;
    for (var i = 0; i < DISTRICTS.length; i++) {
      if (DISTRICTS[i].slug === key) return DISTRICTS[i];
    }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
