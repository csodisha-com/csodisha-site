(function (root) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var HUB_SUBTRACK_DOSSIERS = {
    'hub-otet-osstet-eligibility': {
      slug: 'hub-otet-osstet-eligibility',
      title: 'OTET & OSSTET Teacher Eligibility Test Dossier',
      title_or: 'OTET ଏବଂ OSSTET ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା ବିବରଣୀ',
      organisation: 'Board of Secondary Education (BSE), Odisha',
      category: 'Teaching',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 1500,
      qualification: '+2 / Graduation with D.El.Ed. / B.Ed.',
      last_date: '2026-12-31',
      apply_url: 'https://www.bseodisha.ac.in/',
      summary: 'Mandatory Odisha Teacher Eligibility Test (OTET Paper I/II & OSSTET) for primary and secondary school teacher appointments across Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ପ୍ରାଥମିକ ଓ ମାଧ୍ୟମିକ ବିଦ୍ୟାଳୟ ଶିକ୍ଷକ ନିଯୁକ୍ତି ପାଇଁ ବାଧ୍ୟତାମୂଳକ OTET ଏବଂ OSSTET ଯୋଗ୍ୟତା ପରୀକ୍ଷା।'
    },
    'hub-osepa-junior-teacher': {
      slug: 'hub-osepa-junior-teacher',
      title: 'OSEPA Junior Teacher (Schematic) District Cadre Recruitment',
      title_or: 'OSEPA କନିଷ୍ଠ ଶିକ୍ଷକ (ସ୍କିମାଟିକ୍) ଜିଲ୍ଲା କ୍ୟାଡର ନିଯୁକ୍ତି',
      organisation: 'Odisha School Education Programme Authority (OSEPA)',
      category: 'Teaching',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 2000,
      qualification: 'OTET Qualified + D.El.Ed. / B.Ed.',
      last_date: '2027-01-10',
      apply_url: 'https://osepa.odisha.gov.in/',
      summary: 'District-wise recruitment of Junior Teachers (Schematic) under Samagra Shiksha across all 30 districts of Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ଟି ଜିଲ୍ଲାରେ ସମଗ୍ର ଶିକ୍ଷା ଅଧୀନରେ କନିଷ୍ଠ ଶିକ୍ଷକ (ସ୍କିମାଟିକ୍) ନିଯୁକ୍ତି।'
    },
    'hub-opsc-dhse-lecturer': {
      slug: 'hub-opsc-dhse-lecturer',
      title: 'OPSC / SSB & DHSE College Lecturer Recruitment',
      title_or: 'OPSC / SSB ଏବଂ DHSE କଲେଜ ଅଧ୍ୟାପକ ନିଯୁକ୍ତି',
      organisation: 'OPSC / SSB Odisha',
      category: 'Teaching',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 786,
      qualification: 'Master Degree (55%) + NET / Ph.D.',
      last_date: '2027-01-20',
      apply_url: 'https://www.opsc.gov.in/',
      summary: 'Group-A/B Lecturer recruitment for Government Degree Colleges & Aided Colleges across Odisha.',
      summary_or: 'ଓଡ଼ିଶାର ସରକାରୀ ଓ ଅନୁଦାନପ୍ରାପ୍ତ ଡିଗ୍ରୀ କଲେଜ ପାଇଁ ଅଧ୍ୟାପକ ନିଯୁକ୍ତି।'
    },
    'hub-rrb-ntpc-railway': {
      slug: 'hub-rrb-ntpc-railway',
      title: 'RRB NTPC & Railway Group-D (East Coast Railway Bhubaneswar)',
      title_or: 'RRB NTPC ଓ ରେଳବାଇ ଗ୍ରୁପ୍-D (ପୂର୍ବତଟ ରେଳପଥ ଭୁବନେଶ୍ୱର)',
      organisation: 'Railway Recruitment Board (RRB Bhubaneswar)',
      category: 'Banking & PSU',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 11558,
      qualification: '10th / +2 / Graduate',
      last_date: '2027-01-25',
      apply_url: 'https://www.rrbbbs.gov.in/',
      summary: 'Central Railway recruitment for Station Master, Goods Train Manager, Clerk & Level-1 posts under RRB Bhubaneswar.',
      summary_or: 'RRB ଭୁବନେଶ୍ୱର ଅଧୀନରେ ଷ୍ଟେସନ ମାଷ୍ଟର, କ୍ଲର୍କ ଓ ଗ୍ରୁପ୍-D ପଦବୀ ପାଇଁ କେନ୍ଦ୍ରୀୟ ରେଳବାଇ ନିଯୁକ୍ତି।'
    },
    'hub-ibps-sbi-banking': {
      slug: 'hub-ibps-sbi-banking',
      title: 'IBPS PO / Clerk & SBI Associate Banking Recruitment',
      title_or: 'IBPS PO / କ୍ଲର୍କ ଓ SBI ବ୍ୟାଙ୍କିଙ୍ଗ୍ ନିଯୁକ୍ତି',
      organisation: 'IBPS / State Bank of India',
      category: 'Banking & PSU',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 6128,
      qualification: 'Graduate in Any Discipline',
      last_date: '2027-01-30',
      apply_url: 'https://www.ibps.in/',
      summary: 'Public sector bank Probationary Officer and Clerk recruitment with Odisha state language (Odia) proficiency.',
      summary_or: 'ଓଡ଼ିଆ ଭାଷା ଦକ୍ଷତା ସହିତ ରାଷ୍ଟ୍ରାୟତ୍ତ ବ୍ୟାଙ୍କରେ PO ଓ କ୍ଲର୍କ ନିଯୁକ୍ତି।'
    },
    'hub-upsc-central': {
      slug: 'hub-upsc-central',
      title: 'UPSC Civil Services (CSE) & CDS / NDA National Defence',
      title_or: 'UPSC ସିଭିଲ୍ ସର୍ଭିସେସ୍ ଓ CDS / NDA ନିଯୁକ୍ତି',
      organisation: 'Union Public Service Commission (UPSC)',
      category: 'Central',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 1056,
      qualification: 'Graduate / 12th (NDA)',
      last_date: '2027-02-15',
      apply_url: 'https://upsc.gov.in/',
      summary: 'All-India Civil Services (IAS, IPS, IFS) and Defence Academy examinations with Cuttack/Sambalpur centres.',
      summary_or: 'କଟକ ଓ ସମ୍ବଲପୁର ପରୀକ୍ଷା କେନ୍ଦ୍ର ସହିତ ସର୍ବଭାରତୀୟ UPSC ସିଭିଲ୍ ସର୍ଭିସେସ୍ ପରୀକ୍ଷା।'
    },
    'hub-osssc-forest-guard': {
      slug: 'hub-osssc-forest-guard',
      title: 'OSSSC Forest Guard, Forester & Livestock Inspector',
      title_or: 'OSSSC ଫରେଷ୍ଟ ଗାର୍ଡ, ଫରେଷ୍ଟର ଓ ପ୍ରାଣୀଧନ ନିରୀକ୍ଷକ',
      organisation: 'OSSSC',
      category: 'Police & Defence',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 2712,
      qualification: '10th / +2 Science',
      last_date: '2027-01-18',
      apply_url: 'https://www.osssc.gov.in/',
      summary: 'Uniformed forestry and wildlife conservation cadre recruitment across all Odisha forest divisions.',
      summary_or: 'ଓଡ଼ିଶାର ସମସ୍ତ ବନଖଣ୍ଡରେ ଫରେଷ୍ଟ ଗାର୍ଡ ଓ ଫରେଷ୍ଟର ପଦବୀ ନିଯୁକ୍ତି।'
    },
    'hub-odisha-excise-si': {
      slug: 'hub-odisha-excise-si',
      title: 'Odisha Excise Sub-Inspector & Constable Recruitment',
      title_or: 'ଓଡ଼ିଶା ଅବକାରୀ ସବ୍-ଇନ୍ସପେକ୍ଟର ଓ କନେଷ୍ଟବଳ ନିଯୁକ୍ତି',
      organisation: 'OSSC / Excise Dept, Odisha',
      category: 'Police & Defence',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 540,
      qualification: '10th / Graduate + PET',
      last_date: '2027-01-22',
      apply_url: 'https://www.ossc.gov.in/',
      summary: 'Excise enforcement recruitment with written CBT and qualifying Physical Efficiency Test (PET).',
      summary_or: 'ଲିଖିତ ପରୀକ୍ଷା ଓ ଶାରୀରିକ ଦକ୍ଷତା ପରୀକ୍ଷା (PET) ସହିତ ଓଡ଼ିଶା ଅବକାରୀ ନିଯୁକ୍ତି।'
    },
    'hub-capf-agniveer': {
      slug: 'hub-capf-agniveer',
      title: 'CAPF / SSC GD Constable & Indian Army Agniveer (Odisha)',
      title_or: 'CAPF / SSC GD କନେଷ୍ଟବଳ ଓ ଅଗ୍ନିବୀର (ଓଡ଼ିଶା)',
      organisation: 'SSC / Indian Army ARO Cuttack-Sambalpur',
      category: 'Police & Defence',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 39481,
      qualification: '10th / 12th Pass',
      last_date: '2027-02-01',
      apply_url: 'https://ssc.gov.in/',
      summary: 'Central Armed Police Forces (BSF, CRPF, CISF, ITBP) and Army Agniveer rallies in Odisha.',
      summary_or: 'ଓଡ଼ିଶାରେ କେନ୍ଦ୍ରୀୟ ସଶସ୍ତ୍ର ପୋଲିସ ବଳ (CAPF) ଓ ଅଗ୍ନିବୀର ନିଯୁକ୍ତି ରାଲି।'
    },
    'hub-osssc-nursing-nhm': {
      slug: 'hub-osssc-nursing-nhm',
      title: 'OSSSC Nursing Officer, ANM & Pharmacist Recruitment',
      title_or: 'OSSSC ନର୍ସିଂ ଅଫିସର୍, ANM ଓ ଫାର୍ମାସିଷ୍ଟ ନିଯୁକ୍ତି',
      organisation: 'OSSSC / NHM Odisha',
      category: 'PSU, Technical & Healthcare',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 4500,
      qualification: 'GNM / B.Sc. Nursing / D.Pharm',
      last_date: '2027-01-28',
      apply_url: 'https://www.osssc.gov.in/',
      summary: 'District cadre healthcare recruitment across Government Medical Colleges and District Headquarters Hospitals.',
      summary_or: 'ସରକାରୀ ମେଡିକାଲ୍ କଲେଜ ଓ ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟ ପାଇଁ ନର୍ସିଂ ଅଫିସର୍ ଓ ANM ନିଯୁକ୍ତି।'
    },
    'hub-odisha-psu-engineering': {
      slug: 'hub-odisha-psu-engineering',
      title: 'Odisha PSUs (NALCO, SAIL Rourkela, OHPC, OPTCL) Engineer / Trainee',
      title_or: 'ଓଡ଼ିଶା PSU (NALCO, SAIL, OHPC, OPTCL) ଇଞ୍ଜିନିୟର ନିଯୁକ୍ତି',
      organisation: 'NALCO / SAIL / OHPC / OPTCL',
      category: 'PSU, Technical & Healthcare',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 420,
      qualification: 'B.E. / B.Tech / Diploma / ITI',
      last_date: '2027-01-30',
      apply_url: 'https://nalcoindia.com/',
      summary: 'Graduate Engineer Trainee (GET) and Diploma Management Trainee drives across Odisha Central & State PSUs.',
      summary_or: 'ଓଡ଼ିଶାର ପ୍ରମୁଖ କେନ୍ଦ୍ରୀୟ ଓ ରାଜ୍ୟ PSU ଗୁଡ଼ିକରେ ଇଞ୍ଜିନିୟର ଓ ଟେକ୍ନିକାଲ୍ ଟ୍ରେନି ନିଯୁକ୍ତି।'
    },
    'hub-odisha-it-campus': {
      slug: 'hub-odisha-it-campus',
      title: 'Bhubaneswar IT Park & Odisha Tech Campus Drives',
      title_or: 'ଭୁବନେଶ୍ୱର IT ପାର୍କ ଓ ଓଡ଼ିଶା ଟେକ୍ କ୍ୟାମ୍ପସ୍ ନିଯୁକ୍ତି',
      organisation: 'Infocity / Odisha IT Sector',
      category: 'Private & Internships',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 650,
      qualification: 'B.Tech / MCA / B.Sc. IT',
      last_date: '2027-02-10',
      apply_url: 'https://it.odisha.gov.in/',
      summary: 'Software Developer, QA, and Cloud Support openings across Bhubaneswar Infocity and SEZ tech centres.',
      summary_or: 'ଭୁବନେଶ୍ୱର ଇନଫୋସିଟିରେ ସଫ୍ଟୱେୟାର ଓ IT କ୍ଷେତ୍ରରେ କ୍ୟାମ୍ପସ୍ ନିଯୁକ୍ତି।'
    },
    'hub-naps-nats-apprenticeship': {
      slug: 'hub-naps-nats-apprenticeship',
      title: 'NAPS / NATS National Apprenticeship Training (Odisha)',
      title_or: 'NAPS / NATS ଜାତୀୟ ଆପ୍ରେଣ୍ଟିସ୍ ପ୍ରଶିକ୍ଷଣ (ଓଡ଼ିଶା)',
      organisation: 'Ministry of Skill Development & Odisha SDTE',
      category: 'Private & Internships',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 1200,
      qualification: 'ITI / Diploma / Graduate',
      last_date: '2027-02-15',
      apply_url: 'https://www.apprenticeshipindia.gov.in/',
      summary: 'Paid 1-year government-certified apprenticeship stipend placements across Odisha industries and PSUs.',
      summary_or: 'ଓଡ଼ିଶାର ଶିଳ୍ପାନୁଷ୍ଠାନ ଓ PSU ରେ ଷ୍ଟାଇପେଣ୍ଡ ସହ ୧ ବର୍ଷିଆ ଆପ୍ରେଣ୍ଟିସ୍ ପ୍ରଶିକ୍ଷଣ।'
    },
    'hub-private-bfsi': {
      slug: 'hub-private-bfsi',
      title: 'Odisha Private Banking, Microfinance & BFSI Associate Roles',
      title_or: 'ଓଡ଼ିଶା ଘରୋଇ ବ୍ୟାଙ୍କିଙ୍ଗ୍ ଓ BFSI ଆସୋସିଏଟ୍ ନିଯୁକ୍ତି',
      organisation: 'BFSI Skill Council Odisha',
      category: 'Private & Internships',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 500,
      qualification: 'Graduate in Any Stream',
      last_date: '2027-02-12',
      apply_url: 'https://skillodisha.gov.in/',
      summary: 'Branch Relationship Officer and Operations Associate openings across all 30 Odisha districts.',
      summary_or: 'ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲାରେ ବ୍ୟାଙ୍କିଙ୍ଗ୍ ଓ ଫାଇନାନ୍ସ କ୍ଷେତ୍ରରେ ନିଯୁକ୍ତି।'
    },
    'hub-remote-internships': {
      slug: 'hub-remote-internships',
      title: 'Remote Content, Data & Digital India Internships',
      title_or: 'ରିମୋଟ୍ କଣ୍ଟେଣ୍ଟ, ଡାଟା ଓ ଡିଜିଟାଲ୍ ଇଣ୍ଡିଆ ଇଣ୍ଟର୍ନସିପ୍',
      organisation: 'AICTE / Digital India Internship Portal',
      category: 'Private & Internships',
      stage: 'new-recruitment',
      stage_label: 'New Recruitment',
      vacancies: 300,
      qualification: 'Pursuing / Completed Graduation',
      last_date: '2027-02-20',
      apply_url: 'https://internship.aicte-india.org/',
      summary: 'Verified remote internships for Odisha college students in policy research, Odia localization & data analytics.',
      summary_or: 'ଓଡ଼ିଶାର ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ ରିମୋଟ୍ ଇଣ୍ଟର୍ନସିପ୍ ଓ ପ୍ରଶିକ୍ଷଣ ସୁଯୋଗ।'
    }
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, String(attrs[k])); });
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function buildVacancyBreakdown(totalVac) {
    var total = Math.max(10, Number(totalVac) || 100);
    var ur = Math.round(total * 0.50);
    var sebc = Math.round(total * 0.1125);
    var sc = Math.round(total * 0.1625);
    var st = Math.max(1, total - ur - sebc - sc);
    var women = Math.round(total * 0.33);
    return [
      { label: 'UR (50%)', count: ur },
      { label: 'SEBC (11.25%)', count: sebc },
      { label: 'SC (16.25%)', count: sc },
      { label: 'ST (22.5%)', count: st },
      { label: 'Women (33% Horiz.)', count: women }
    ];
  }

  function buildPayScaleData(job) {
    if (Array.isArray(job.payProgression) && job.payProgression.length) {
      return job.payProgression;
    }
    var hay = [job.title, job.category, job.organisation].join(' ').toLowerCase();
    if (hay.includes('opsc') || hay.includes('oas') || hay.includes('lecturer')) {
      return [
        { label: 'Selected Post (L-12)', pay: 56100 },
        { label: 'Group-B (L-10)', pay: 44900 },
        { label: 'Group-B Jr (L-9)', pay: 35400 }
      ];
    }
    if (hay.includes('ossc') || hay.includes('cgl') || hay.includes('si') || hay.includes('teacher') || hay.includes('oavs')) {
      return [
        { label: 'Selected Post (L-9)', pay: 35400 },
        { label: 'Level 7 (RI/JA)', pay: 25500 },
        { label: 'Level 4 (ARI/Amin)', pay: 19900 }
      ];
    }
    return [
      { label: 'Level 9 (OSSC)', pay: 35400 },
      { label: 'Selected Post (L-7)', pay: 25500 },
      { label: 'Level 4 (ARI/Amin)', pay: 19900 }
    ];
  }

  function getExamPatternRows(job) {
    var hay = [job.title, job.category, job.organisation].join(' ').toLowerCase();
    if (hay.includes('opsc') || hay.includes('oas')) {
      return [
        ['Prelims Pattern', 'GS Paper-I (200 Marks) + CSAT Paper-II (200 Marks, Qualifying 33%)'],
        ['Negative Marking', '1/3rd (-0.33) per wrong answer in Prelims MCQs'],
        ['Mains & Interview', 'Written Mains (Essay + 4 GS + Optional) + Personality Test (250 Marks)']
      ];
    }
    if (hay.includes('police') || hay.includes('oprb') || hay.includes('forest') || hay.includes('excise')) {
      return [
        ['Written CBT/OMR', 'Paper-I (100 Marks: EN & Odia) + Paper-II (200 Marks: GS, Reasoning, Math)'],
        ['Negative Marking', '-0.25 mark deduction per wrong answer'],
        ['Physical (PMT/PET)', 'Height, Weight, Chest Expansion (≥ 5 cm) + 1600m/3200m Run & Long Jump']
      ];
    }
    return [
      ['Written Stages', 'Preliminary Objective CBT + Main Written Examination + Computer Skill Test'],
      ['Negative Marking', '-0.25 to -0.33 per wrong MCQ as per Board Advertisement'],
      ['Document Verification', 'Original Certificates, Odisha Resident/Caste/SEBC/EWS & OTR Verification']
    ];
  }

  function renderSvgBarChart(title, rows, barClass, valuePrefix) {
    var card = el('section', 'cso-dossier-card');
    card.appendChild(el('h2', 'cso-dossier-section-title', title));
    var maxVal = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.count || r.pay || 0; })));
    var svg = svgEl('svg', { viewBox: '0 0 640 210', class: 'cso-dossier-svg', role: 'img', 'aria-label': title });

    rows.forEach(function (row, idx) {
      var val = row.count !== undefined ? row.count : row.pay;
      var y = 16 + idx * 38;
      var lbl = svgEl('text', { x: 4, y: y + 16, class: 'cso-svg-label' });
      lbl.textContent = row.label;
      svg.appendChild(lbl);

      var track = svgEl('rect', { x: 155, y: y + 2, width: 375, height: 18, rx: 6, class: 'cso-svg-track' });
      svg.appendChild(track);

      var w = Math.max(14, Math.round((val / maxVal) * 375));
      var bar = svgEl('rect', { x: 155, y: y + 2, width: w, height: 18, rx: 6, class: barClass });
      svg.appendChild(bar);

      var valTxt = svgEl('text', { x: 540, y: y + 16, class: 'cso-svg-val' });
      valTxt.textContent = (valuePrefix || '') + Number(val).toLocaleString('en-IN');
      svg.appendChild(valTxt);
    });
    card.appendChild(svg);
    return card;
  }

  function renderDossier(rootEl, job, allJobs) {
    clear(rootEl);
    var crumbTitle = document.getElementById('cso-dossier-crumb-title');
    if (crumbTitle) crumbTitle.textContent = job.title || 'Visual Dossier';
    if (typeof document !== 'undefined') {
      document.title = (job.title || 'Recruitment Dossier') + ' | Common Sense Odisha';
    }

    // 1. Visual Hero & Verified Authority Banner
    var hero = el('section', 'cso-dossier-card cso-dossier-hero');
    var top = el('div', 'cso-dossier-hero__top');

    var emblem = svgEl('svg', { viewBox: '0 0 64 64', class: 'cso-dossier-emblem', 'aria-hidden': 'true' });
    emblem.appendChild(svgEl('circle', { cx: 32, cy: 32, r: 28, class: 'cso-dossier-emblem__bg' }));
    emblem.appendChild(svgEl('circle', { cx: 32, cy: 32, r: 26, class: 'cso-dossier-emblem__ring' }));
    var embTxt = svgEl('text', { x: 32, y: 37, 'text-anchor': 'middle', class: 'cso-dossier-emblem__text' });
    embTxt.textContent = String(job.category || 'CSO').slice(0, 5).toUpperCase();
    emblem.appendChild(embTxt);
    top.appendChild(emblem);

    var badges = el('div', 'cso-dossier-badges');
    badges.appendChild(el('span', 'cso-dossier-badge cso-dossier-badge--stage', job.stage_label || 'New Recruitment'));
    var dataApi = root.CSO_JOBS_DIRECTORY_DATA;
    var secMeta = dataApi && job.section && typeof dataApi.getSectionBySlug === 'function' ? dataApi.getSectionBySlug(job.section) : null;
    if (secMeta) {
      var catLink = el('a', 'cso-dossier-badge', (secMeta.icon || '') + ' ' + secMeta.title);
      catLink.href = secMeta.href;
      badges.appendChild(catLink);
    } else if (job.category) {
      badges.appendChild(el('span', 'cso-dossier-badge', job.category));
    }
    if (job.organisation) badges.appendChild(el('span', 'cso-dossier-badge', job.organisation));
    if (job.last_date) {
      var tracker = root.CSO_DEADLINE_TRACKER;
      var days = tracker && typeof tracker.calculateDaysRemaining === 'function' ? tracker.calculateDaysRemaining(job.last_date) : null;
      var dlLabel = days !== null ? tracker.formatUrgencyLabel(days) + ' (' + job.last_date + ')' : 'Last Date: ' + job.last_date;
      badges.appendChild(el('span', 'cso-dossier-badge' + (days !== null && days <= 7 ? ' cso-dossier-badge--urgent' : ''), dlLabel));
    }
    top.appendChild(badges);
    hero.appendChild(top);

    hero.appendChild(el('h1', 'cso-dossier-title', job.title || 'Official Odisha Recruitment Notice'));
    if (job.title_or) hero.appendChild(el('p', 'cso-dossier-title-or', job.title_or));

    var actions = el('div', 'cso-dossier-actions');
    var applyUrl = job.apply_url || job.notification_url || job.source_url || 'https://www.ossc.gov.in/';
    var applyBtn = el('a', 'cso-dossier-btn cso-dossier-btn--primary', 'Official Notification PDF / Portal ↗');
    applyBtn.href = applyUrl;
    applyBtn.target = '_blank';
    applyBtn.rel = 'noopener noreferrer';
    actions.appendChild(applyBtn);

    if (root.CSO_DEADLINE_TRACKER) {
      var dlPayload = {
        id: job.slug || job.id || job.title,
        title: job.title,
        board: job.organisation || job.category || '',
        district: job.state || 'Odisha',
        lastDate: job.last_date || '',
        applyUrl: applyUrl
      };
      var tracked = root.CSO_DEADLINE_TRACKER.isTracked(dlPayload.id);
      var trackBtn = el('button', 'cso-dossier-btn' + (tracked ? ' is-tracked' : ''), tracked ? '✓ Tracked in Hub' : '📌 Track Deadline');
      trackBtn.type = 'button';
      trackBtn.addEventListener('click', function () {
        var r = root.CSO_DEADLINE_TRACKER.toggleTrack(dlPayload);
        trackBtn.classList.toggle('is-tracked', r.tracked);
        trackBtn.textContent = r.tracked ? '✓ Tracked in Hub' : '📌 Track Deadline';
      });
      actions.appendChild(trackBtn);

      if (job.last_date) {
        var icsBtn = el('button', 'cso-dossier-btn', '📅 Download .ics');
        icsBtn.type = 'button';
        icsBtn.addEventListener('click', function () { root.CSO_DEADLINE_TRACKER.downloadIcsReminder(dlPayload); });
        actions.appendChild(icsBtn);
      }
    }

    var searchParams = root.location ? new URLSearchParams(root.location.search || '') : new URLSearchParams('');
    var qSection = (searchParams.get('section') || job.section || '').trim();
    var qL1 = (searchParams.get('l1') || job.l1Code || '').trim();
    var qL2 = (searchParams.get('l2') || job.l2Code || '').trim();

    var backHref = secMeta ? secMeta.href : (qSection ? '/jobs-careers/' + encodeURIComponent(qSection) : '/jobs-careers/jobs-recruitment');
    if (qL1) {
      var backQs = new URLSearchParams();
      backQs.set('l1', qL1);
      if (qL2) backQs.set('l2', qL2);
      backHref += '?' + backQs.toString();
    }
    var backLabel = qL1
      ? '← Previous level (' + (qL2 || qL1) + ')'
      : (secMeta ? '← Back to ' + secMeta.title : '← Back to Jobs & Recruitment');
    var backBtn = el('a', 'cso-dossier-btn', backLabel);
    backBtn.href = backHref;
    actions.appendChild(backBtn);
    hero.appendChild(actions);
    rootEl.appendChild(hero);

    // 2. Pure SVG Data Graphs (Category-wise Vacancy or Marks Breakdown + 7th CPC/ORSP Pay Scale Comparison)
    var chartsGrid = el('div', 'cso-dossier-charts-grid');
    if (Array.isArray(job.marksChart) && job.marksChart.length) {
      chartsGrid.appendChild(renderSvgBarChart('UPSC CSE 3-Stage Marks Breakdown (2,025 Grand Total)', job.marksChart, 'cso-svg-bar-vac', ''));
    } else {
      chartsGrid.appendChild(renderSvgBarChart('Category-Wise Indicative Vacancy Breakdown', buildVacancyBreakdown(job.vacancies), 'cso-svg-bar-vac', ''));
    }
    chartsGrid.appendChild(renderSvgBarChart('7th CPC / ORSP Pay Matrix Basic Pay Progression', buildPayScaleData(job), 'cso-svg-bar-pay', '₹'));
    rootEl.appendChild(chartsGrid);

    // 3. 5-Step Selection Process Timeline
    var tlCard = el('section', 'cso-dossier-card');
    tlCard.appendChild(el('h2', 'cso-dossier-section-title', '5-Step Odisha Selection Process Timeline'));
    var tlGrid = el('div', 'cso-dossier-timeline');
    var activeStepIdx = job.stage === 'admit-card' ? 2 : (job.stage === 'answer-key' ? 3 : (job.stage === 'result' ? 4 : 0));
    [
      { step: 'Step 1', title: 'Notification', desc: 'Official Advt. & OTR Check' },
      { step: 'Step 2', title: 'Online Apply', desc: 'Portal Submission & Fee Waiver' },
      { step: 'Step 3', title: 'Admit Card', desc: 'Hall Ticket & Centre Logistics' },
      { step: 'Step 4', title: 'Written Exam', desc: 'CBT / OMR Prelims & Mains' },
      { step: 'Step 5', title: 'Skill / PET & DV', desc: 'Merit List & Document Verification' }
    ].forEach(function (st, idx) {
      var box = el('div', 'cso-timeline-step' + (idx === activeStepIdx ? ' is-active' : ''));
      box.appendChild(el('span', 'cso-timeline-step__num', st.step));
      box.appendChild(el('strong', '', st.title));
      box.appendChild(el('span', '', st.desc));
      tlGrid.appendChild(box);
    });
    tlCard.appendChild(tlGrid);
    rootEl.appendChild(tlCard);

    // 4. Complete Bilingual Information & Specification Tables
    var infoCard = el('section', 'cso-dossier-card');
    infoCard.appendChild(el('h2', 'cso-dossier-section-title', 'Bilingual Overview (EN + ଓଡ଼ିଆ) & Eligibility Specifications'));
    var prose = el('div', 'cso-dossier-prose');
    prose.appendChild(el('p', '', job.summary || 'Verified recruitment notice from official Odisha or Central Government portal.'));
    if (job.summary_or) prose.appendChild(el('p', '', job.summary_or));
    infoCard.appendChild(prose);

    var tblWrap = el('div', 'cso-dossier-table-wrap');
    var tbl = el('table', 'cso-dossier-table');
    var tbody = document.createElement('tbody');
    var specRows = [
      ['Recruiting Board / Authority', job.organisation || job.category || 'Govt of Odisha'],
      ['Total Vacancies', job.vacancies ? Number(job.vacancies).toLocaleString('en-IN') + ' Posts' : 'As per Official Notification'],
      ['Essential Qualification', job.qualification || 'Check Official Notification PDF'],
      ['Age Limit & Relaxation', job.age_limit || '18–38 Years (Odisha SEBC/SC/ST/Women +5 Years)'],
      ['Pay Matrix / Stipend', job.pay_level || 'ORSP 7th Pay Matrix (Level 4 – Level 12)'],
      ['Lifecycle Stage', job.stage_label || 'New Recruitment'],
      ['Application Deadline', job.last_date || 'See Official Portal']
    ];
    specRows.forEach(function (pair) {
      var tr = document.createElement('tr');
      tr.appendChild(el('th', '', pair[0]));
      tr.appendChild(el('td', '', pair[1]));
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    tblWrap.appendChild(tbl);
    infoCard.appendChild(tblWrap);
    rootEl.appendChild(infoCard);

    // 5. Exam Pattern & Negative Marking Table (Multi-Row 2,025 Marks Breakdown or Branch Exam Pattern Table)
    var patCard = el('section', 'cso-dossier-card');
    var patHeading = Array.isArray(job.examStages)
      ? '3-Stage Exam Pattern & Marks Breakdown (2,025 Grand Total)'
      : (Array.isArray(job.examPatternTable) ? 'Exam Pattern, Stages & Negative Marking Blueprint' : 'Exam Pattern & Negative Marking Blueprint');
    patCard.appendChild(el('h2', 'cso-dossier-section-title', patHeading));
    var patTbl = el('table', 'cso-dossier-table');
    var patBody = document.createElement('tbody');
    var patRows = Array.isArray(job.examStages)
      ? job.examStages
      : (Array.isArray(job.examPatternTable) ? job.examPatternTable : getExamPatternRows(job));
    patRows.forEach(function (pair) {
      var tr = document.createElement('tr');
      tr.appendChild(el('th', '', pair[0]));
      tr.appendChild(el('td', '', pair[1]));
      if (pair[2]) tr.appendChild(el('td', '', pair[2]));
      patBody.appendChild(tr);
    });
    patTbl.appendChild(patBody);
    patCard.appendChild(patTbl);
    rootEl.appendChild(patCard);

    var relaxRows = Array.isArray(job.attemptMatrix) && job.attemptMatrix.length
      ? job.attemptMatrix
      : (Array.isArray(job.relaxationTable) && job.relaxationTable.length ? job.relaxationTable : null);
    if (relaxRows) {
      var attCard = el('section', 'cso-dossier-card');
      attCard.appendChild(el('h2', 'cso-dossier-section-title', Array.isArray(job.attemptMatrix) ? 'Statutory Eligibility, Age Relaxation (1st August) & Attempt Matrix' : 'Category Age Relaxation, Fee & Attempt Matrix'));
      var attTbl = el('table', 'cso-dossier-table');
      var attBody = document.createElement('tbody');
      relaxRows.forEach(function (row) {
        var tr = document.createElement('tr');
        tr.appendChild(el('th', '', row[0]));
        tr.appendChild(el('td', '', row[1]));
        tr.appendChild(el('td', '', row[2]));
        if (row[3]) tr.appendChild(el('td', '', row[3]));
        attBody.appendChild(tr);
      });
      attTbl.appendChild(attBody);
      attCard.appendChild(attTbl);
      rootEl.appendChild(attCard);
    }

    if (Array.isArray(job.physicalStandards) && job.physicalStandards.length) {
      var phyCard = el('section', 'cso-dossier-card');
      phyCard.appendChild(el('h2', 'cso-dossier-section-title', 'Physical & Medical Standards (PST / PET / Medical)'));
      var phyTbl = el('table', 'cso-dossier-table');
      var phyBody = document.createElement('tbody');
      job.physicalStandards.forEach(function (row) {
        var tr = document.createElement('tr');
        tr.appendChild(el('th', '', row[0]));
        tr.appendChild(el('td', '', row[1]));
        if (row[2]) tr.appendChild(el('td', '', row[2]));
        phyBody.appendChild(tr);
      });
      phyTbl.appendChild(phyBody);
      phyCard.appendChild(phyTbl);
      rootEl.appendChild(phyCard);
    }

    if (Array.isArray(job.serviceAllocations) && job.serviceAllocations.length) {
      var srvCard = el('section', 'cso-dossier-card');
      srvCard.appendChild(el('h2', 'cso-dossier-section-title', 'Service Allocation List (All ' + job.serviceAllocations.length + ' Services)'));
      var srvTbl = el('table', 'cso-dossier-table');
      var srvBody = document.createElement('tbody');
      job.serviceAllocations.forEach(function (srv) {
        var tr = document.createElement('tr');
        tr.appendChild(el('th', '', srv[0]));
        tr.appendChild(el('td', '', srv[1]));
        tr.appendChild(el('td', '', srv[2]));
        srvBody.appendChild(tr);
      });
      srvTbl.appendChild(srvBody);
      srvCard.appendChild(srvTbl);
      rootEl.appendChild(srvCard);
    }

    // 6. Official References & CSO Prep Tools Cards
    var toolsCard = el('section', 'cso-dossier-card');
    toolsCard.appendChild(el('h2', 'cso-dossier-section-title', Array.isArray(job.referenceLinks) ? 'Verified Official Reference Portals & CSO Prep Tools' : 'Official PDFs & CSO Candidate Prep Tools'));
    var toolsGrid = el('div', 'cso-dossier-tools-grid');
    var toolList = Array.isArray(job.referenceLinks) ? job.referenceLinks : [
      { href: '/tools/#photo-resizer', title: '📸 Photo & Signature Resizer', desc: 'Format 20–50 KB JPG for OPSC / OSSC / OSSSC OTR' },
      { href: '/tools/#orsp-salary-calculator', title: '💰 7th Pay Salary & Fee Calculator', desc: 'Compute ORSP Level 4–12 In-Hand Salary & ₹0 Fee Waiver' },
      { href: '/tools/#odisha-pet-checker', title: '🏃 Police & Forest PET Checker', desc: 'Verify Height, Weight, Chest (≥ 5 cm) & Run Targets' },
      { href: '/study-library/', title: '📚 Study Library & Odia Glossary', desc: 'Solved PYQs, 30-District GK & Administrative Glossary' }
    ];
    toolList.forEach(function (t) {
      var a = el('a', 'cso-dossier-tool-card');
      a.href = t.href;
      if (/^https?:\/\//i.test(t.href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      a.appendChild(el('strong', '', t.title));
      a.appendChild(el('span', '', t.desc));
      toolsGrid.appendChild(a);
    });
    toolsCard.appendChild(toolsGrid);
    rootEl.appendChild(toolsCard);

    // 7. Related Live Opportunities & Same-Category Pages
    var dataApiRel = root.CSO_JOBS_DIRECTORY_DATA;
    var sameSection = dataApiRel && job.section && typeof dataApiRel.getItemsBySection === 'function'
      ? dataApiRel.getItemsBySection(job.section).filter(function (j) { return j.slug !== job.slug; })
      : [];
    var pool = sameSection.length ? sameSection : (allJobs || []);
    var related = pool.filter(function (j) { return j.slug !== job.slug; }).slice(0, 4);
    if (related.length) {
      var relCard = el('section', 'cso-dossier-card');
      relCard.appendChild(el('h2', 'cso-dossier-section-title', secMeta ? 'Related ' + secMeta.title + ' Pages' : 'Related Odisha & Central Recruitment Dossiers'));
      var relGrid = el('div', 'cso-dossier-tools-grid');
      related.forEach(function (r) {
        var a = el('a', 'cso-dossier-tool-card');
        a.href = '/jobs-careers/detail/' + encodeURIComponent(r.slug || r.id);
        a.appendChild(el('strong', '', r.title));
        a.appendChild(el('span', '', (r.stage_label || 'Active') + ' · ' + (r.organisation || r.category || 'Official')));
        relGrid.appendChild(a);
      });
      relCard.appendChild(relGrid);
      rootEl.appendChild(relCard);
    }
  }

  function resolveSlugFromLocation(loc) {
    if (!loc) return '';
    var pathMatch = String(loc.pathname || '').match(/^\/jobs-careers\/detail\/([^/]+)\/?$/);
    if (pathMatch && pathMatch[1] && pathMatch[1] !== 'index.html') {
      try { return decodeURIComponent(pathMatch[1]).trim(); } catch (_) { return pathMatch[1].trim(); }
    }
    var params = new URLSearchParams(loc.search || '');
    return (params.get('slug') || params.get('id') || '').trim();
  }

  async function init() {
    var rootEl = document.getElementById('cso-dossier-root');
    if (!rootEl) return;

    var slug = resolveSlugFromLocation(root.location);

    var items = [];
    try {
      var res = await fetch('/api/content/jobs?limit=50', { credentials: 'same-origin' });
      if (res.ok) {
        var data = await res.json();
        items = Array.isArray(data.items) ? data.items : [];
      }
    } catch (_) {}

    var dataApi = root.CSO_JOBS_DIRECTORY_DATA;
    var dirItem = dataApi && typeof dataApi.getItemBySlug === 'function' ? dataApi.getItemBySlug(slug) : null;
    var matched = items.find(function (j) { return j.slug === slug || j.id === slug; })
      || dirItem
      || HUB_SUBTRACK_DOSSIERS[slug]
      || null;

    if (!matched && slug && dataApi && typeof dataApi.resolveBranchFromDirectory === 'function') {
      try {
        var dirRes = await fetch('/jobs-careers/generated/directory.json', { credentials: 'same-origin' });
        if (dirRes.ok) {
          var dirJson = await dirRes.json();
          matched = dataApi.resolveBranchFromDirectory(dirJson, slug);
        }
      } catch (_) {}
    }

    if (!matched) {
      matched = items[0]
        || (dataApi && dataApi.DIRECTORY_ITEMS && dataApi.DIRECTORY_ITEMS[0])
        || HUB_SUBTRACK_DOSSIERS['hub-otet-osstet-eligibility'];
    }

    var combinedPool = items.concat(dataApi && Array.isArray(dataApi.DIRECTORY_ITEMS) ? dataApi.DIRECTORY_ITEMS : []);
    renderDossier(rootEl, matched, combinedPool);
  }

  var api = {
    HUB_SUBTRACK_DOSSIERS: HUB_SUBTRACK_DOSSIERS,
    buildVacancyBreakdown: buildVacancyBreakdown,
    buildPayScaleData: buildPayScaleData,
    resolveSlugFromLocation: resolveSlugFromLocation,
    renderDossier: renderDossier
  };
  root.CSO_CONTENT_DOSSIER = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
