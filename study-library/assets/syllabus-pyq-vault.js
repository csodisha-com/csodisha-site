(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_syllabus_progress_v1';

  var VAULT = [
    {
      id: 'opsc-oas',
      shortLabel: 'OPSC OAS',
      title: 'OPSC OAS (Odisha Civil Services Prelims & Mains)',
      title_or: 'OPSC OAS (ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା ପ୍ରିଲିମ୍ସ ଓ ମେନ୍ସ)',
      boardName: 'OPSC (opsc.gov.in)',
      officialUrl: 'https://www.opsc.gov.in/',
      cbtUrl: '/study-library/cbt-mock-test/?pack=opsc-oas',
      topics: [
        {
          id: 'opsc-gs1-hist',
          paper: 'GS Paper-I',
          title: 'Odisha History, Heritage & Freedom Struggle (Paika Rebellion to 1947)',
          title_or: 'ଓଡ଼ିଶା ଇତିହାସ, ଐତିହ୍ୟ ଓ ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ (ପାଇକ ବିଦ୍ରୋହରୁ ୧୯୪୭)',
          weightage: 'High (18–22 Qs)'
        },
        {
          id: 'opsc-gs1-geo',
          paper: 'GS Paper-I',
          title: 'Odisha & Indian Geography (Mahanadi Basin, Chilika, Minerals & Climate)',
          title_or: 'ଓଡ଼ିଶା ଓ ଭାରତୀୟ ଭୂଗୋଳ (ମହାନଦୀ ଅବବାହିକା, ଚିଲିକା, ଖଣିଜ ଓ ଜଳବାୟୁ)',
          weightage: 'High (15–18 Qs)'
        },
        {
          id: 'opsc-gs1-pol',
          paper: 'GS Paper-I',
          title: 'Indian Polity, Panchayati Raj (PESA) & Odisha Governance',
          title_or: 'ଭାରତୀୟ ରାଜନୀତି, ପଞ୍ଚାୟତିରାଜ (PESA) ଓ ଓଡ଼ିଶା ଶାସନ ବ୍ୟବସ୍ଥା',
          weightage: 'Core (16–20 Qs)'
        },
        {
          id: 'opsc-gs1-eco',
          paper: 'GS Paper-I',
          title: 'Odisha Economy, Budget, Welfare Schemes & Sustainable Development',
          title_or: 'ଓଡ଼ିଶା ଅର୍ଥନୀତି, ବଜେଟ୍, ଜନକଲ୍ୟାଣ ଯୋଜନା ଓ ସ୍ଥାୟୀ ବିକାଶ',
          weightage: 'Core (14–16 Qs)'
        },
        {
          id: 'opsc-csat-p2',
          paper: 'CSAT Paper-II',
          title: 'Comprehension, Logical Reasoning, Data Interpretation & Decision Making',
          title_or: 'ଅବବୋଧ, ଯୁକ୍ତିଶକ୍ତି, ତଥ୍ୟ ବିଶ୍ଳେଷଣ ଓ ନିଷ୍ପତ୍ତି ଗ୍ରହଣ (Qualifying 33%)',
          weightage: 'Qualifying (80 Qs)'
        }
      ]
    },
    {
      id: 'osssc-group-c',
      shortLabel: 'OSSSC Group-C',
      title: 'OSSSC Combined Group-C (RI / ARI / AMIN / SFS / Forest Guard)',
      title_or: 'OSSSC ସମ୍ମିଳିତ ଗ୍ରୁପ୍-C (RI / ARI / AMIN / SFS / ଫରେଷ୍ଟ ଗାର୍ଡ)',
      boardName: 'OSSSC (osssc.gov.in)',
      officialUrl: 'https://www.osssc.gov.in/',
      cbtUrl: '/study-library/cbt-mock-test/?pack=osssc-ri',
      topics: [
        {
          id: 'osssc-arith',
          paper: 'Mathematics',
          title: 'Arithmetic (Percentage, Ratio, Profit & Loss, Time-Work, Mensuration)',
          title_or: 'ପାଟୀଗଣିତ (ଶତକଡ଼ା, ଅନୁପାତ, ଲାଭ-କ୍ଷତି, ସମୟ-କାର୍ଯ୍ୟ ଓ ପରିମିତି)',
          weightage: 'High (20–30 Qs)'
        },
        {
          id: 'osssc-odia',
          paper: 'Odia Grammar',
          title: 'Odia Grammar (Sandhi, Samasa, Krudanta, Taddhita, Suddha-Asuddha)',
          title_or: 'ଓଡ଼ିଆ ବ୍ୟାକରଣ (ସନ୍ଧି, ସମାସ, କୃଦନ୍ତ, ତଦ୍ଧିତ, ଶୁଦ୍ଧ-ଅଶୁଦ୍ଧ)',
          weightage: 'High (20–25 Qs)'
        },
        {
          id: 'osssc-eng',
          paper: 'English',
          title: 'English Grammar, Active/Passive Voice, Idioms & Comprehension',
          title_or: 'ଇଂରାଜୀ ବ୍ୟାକରଣ, Voice Change, Idioms ଓ ଅବବୋଧ',
          weightage: 'Core (20 Qs)'
        },
        {
          id: 'osssc-gs',
          paper: 'General Studies',
          title: 'Odisha & India General Studies, Revenue Administration & Current Affairs',
          title_or: 'ଓଡ଼ିଶା ଓ ଭାରତ ସାଧାରଣ ଜ୍ଞାନ, ରାଜସ୍ୱ ପ୍ରଶାସନ ଓ ସାମ୍ପ୍ରତିକ ଘଟଣା',
          weightage: 'Core (20–25 Qs)'
        },
        {
          id: 'osssc-comp',
          paper: 'Computer',
          title: 'Computer Fundamentals, MS Office / LibreOffice, Shortcuts & Cyber Safety',
          title_or: 'କମ୍ପ୍ୟୁଟର ମୌଳିକ ଜ୍ଞାନ, MS Office / LibreOffice, ସର୍ଟକଟ୍ ଓ ସାଇବର ସୁରକ୍ଷା',
          weightage: 'Scoring (15–20 Qs)'
        }
      ]
    },
    {
      id: 'ossc-cgl',
      shortLabel: 'OSSC CGL',
      title: 'OSSC CGL (Combined Graduate Level)',
      title_or: 'OSSC CGL (ସମ୍ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ ପରୀକ୍ଷା)',
      boardName: 'OSSC (ossc.gov.in)',
      officialUrl: 'https://www.ossc.gov.in/',
      cbtUrl: '/study-library/cbt-mock-test/',
      topics: [
        {
          id: 'ossc-di',
          paper: 'Prelims',
          title: 'Data Interpretation (Tables, Bar/Pie Charts) & Quantitative Aptitude',
          title_or: 'ତଥ୍ୟ ବିଶ୍ଳେଷଣ (ସାରଣୀ, ବାର୍/ପାଇ ଚାର୍ଟ) ଓ ପରିମାଣାତ୍ମକ ଦକ୍ଷତା',
          weightage: 'High (45 Qs)'
        },
        {
          id: 'ossc-reas',
          paper: 'Prelims',
          title: 'Logical Reasoning, Analytical Ability & Number/Letter Series',
          title_or: 'ତାର୍କିକ ଯୁକ୍ତିଶକ୍ତି, ବିଶ୍ଳେଷଣାତ୍ମକ ଦକ୍ଷତା ଓ ସିରିଜ୍',
          weightage: 'High (30 Qs)'
        },
        {
          id: 'ossc-curr',
          paper: 'Prelims',
          title: 'National, International & Odisha Current Events + Sports & Awards',
          title_or: 'ଜାତୀୟ, ଆନ୍ତର୍ଜାତୀୟ ଓ ଓଡ଼ିଶା ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ',
          weightage: 'Core (30 Qs)'
        },
        {
          id: 'ossc-comp',
          paper: 'Prelims',
          title: 'Computer Awareness, Internet Protocols, DBMS & Networking',
          title_or: 'କମ୍ପ୍ୟୁଟର ସଚେତନତା, ଇଣ୍ଟରନେଟ୍, DBMS ଓ ନେଟୱାର୍କିଂ',
          weightage: 'Core (25 Qs)'
        },
        {
          id: 'ossc-odgk',
          paper: 'Mains',
          title: 'Odisha GK, Language Papers (Odia & English) & Essay Writing',
          title_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ, ଓଡ଼ିଆ ଓ ଇଂରାଜୀ ଭାଷା ଏବଂ ପ୍ରବନ୍ଧ',
          weightage: 'Mains (200 Marks)'
        }
      ]
    },
    {
      id: 'otet-osstet',
      shortLabel: 'OTET / OSSTET',
      title: 'OTET / OSSTET (Odisha Teacher Eligibility Test)',
      title_or: 'OTET / OSSTET (ଓଡ଼ିଶା ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା)',
      boardName: 'BSE Odisha (bseodisha.ac.in)',
      officialUrl: 'https://www.bseodisha.ac.in/',
      cbtUrl: '/study-library/cbt-mock-test/?pack=otet-osstet',
      topics: [
        {
          id: 'otet-cdp',
          paper: 'Section A',
          title: 'Child Development & Pedagogy (Piaget, Vygotsky, Inclusive Ed, NEP 2020)',
          title_or: 'ଶିଶୁ ବିକାଶ ଓ ଶିକ୍ଷାଦାନ ବିଜ୍ଞାନ (ପିଆଜେ, ଭାଇଗୋଟସ୍କି, NEP 2020)',
          weightage: 'Core (30 Qs)'
        },
        {
          id: 'otet-l1',
          paper: 'Section B',
          title: 'Odia Language-I (Reading Comprehension, Grammar & Odia Pedagogy)',
          title_or: 'ଓଡ଼ିଆ ଭାଷା-I (ଅବବୋଧ, ବ୍ୟାକରଣ ଓ ଓଡ଼ିଆ ଶିକ୍ଷଣ ପଦ୍ଧତି)',
          weightage: 'Core (30 Qs)'
        },
        {
          id: 'otet-l2',
          paper: 'Section C',
          title: 'English Language-II (Passage, Remedial Teaching & Grammar Pedagogy)',
          title_or: 'ଇଂରାଜୀ ଭାଷା-II (ପଠନ ଅବବୋଧ, ବ୍ୟାକରଣ ଓ ଶିକ୍ଷଣ ଶାସ୍ତ୍ର)',
          weightage: 'Core (30 Qs)'
        },
        {
          id: 'otet-math-evs',
          paper: 'Section D/E',
          title: 'Mathematics, Science & Environmental Studies / Social Studies Content',
          title_or: 'ଗଣିତ, ବିଜ୍ଞାନ ଏବଂ ପରିବେଶ ଅଧ୍ୟୟନ / ସାମାଜିକ ବିଜ୍ଞାନ',
          weightage: 'High (60 Qs)'
        }
      ]
    }
  ];

  function loadProgress(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return {};
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress(map, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var clean = map && typeof map === 'object' ? map : {};
    if (s) {
      try { s.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch (_) {}
    }
    if (typeof fetch === 'function') {
      try {
        fetch('/api/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ syllabus_progress: clean })
        }).catch(function () {});
      } catch (_) {}
    }
    return clean;
  }

  function toggleTopic(topicId, checked, storage) {
    var map = loadProgress(storage);
    if (checked) map[topicId] = true;
    else delete map[topicId];
    return saveProgress(map, storage);
  }

  function getExamStats(examId, progressMap) {
    var map = progressMap || loadProgress();
    var exam = null;
    for (var i = 0; i < VAULT.length; i++) {
      if (VAULT[i].id === examId) { exam = VAULT[i]; break; }
    }
    if (!exam) return { total: 0, done: 0, pct: 0 };
    var total = exam.topics.length;
    var done = 0;
    for (var j = 0; j < total; j++) {
      if (map[exam.topics[j].id]) done += 1;
    }
    return {
      total: total,
      done: done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    VAULT: VAULT,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    toggleTopic: toggleTopic,
    getExamStats: getExamStats
  };

  root.CSO_SYLLABUS_PYQ_VAULT = VAULT;
  root.CSO_SYLLABUS_VAULT_API = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
