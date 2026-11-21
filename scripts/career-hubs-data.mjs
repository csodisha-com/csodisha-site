// v161: single source of truth for the 6 standalone Career Hub pages.
// Consumed by scripts/build-career-hubs.mjs and scripts/test-career-hubs-v161.mjs.
export const ORIGIN = 'https://csodisha.com';

export const HUBS = [
  {
    slug: 'odisha-state-jobs',
    icon: '🏛️',
    title: 'Odisha State Jobs',
    boards: 'OPSC · OSSC · OSSSC · District Recruitments',
    description: 'Verified Odisha state government recruitment notices from OPSC, OSSC, OSSSC and district recruitment cells — eligibility, dates and official apply links.',
    summary: 'Odisha Public Service Commission, Staff Selection Commission, Subordinate Staff Selection Commission and district-level recruitment notices for Odisha Government posts, with verified eligibility, important dates and official apply links.',
    pattern: 'opsc|ossc|osssc|\\boas\\b|\\bocs\\b|\\boprb\\b|\\bosepa\\b|district|collector|odisha (public|staff|subordinate)|\\bpeo\\b|\\bari\\b|\\bamin\\b',
    chips: [
      { label: 'OPSC', pattern: 'opsc|\\boas\\b|\\bocs\\b' },
      { label: 'OSSC', pattern: 'ossc' },
      { label: 'OSSSC', pattern: 'osssc|\\bpeo\\b|\\bari\\b|\\bamin\\b' },
      { label: 'District Recruitments', pattern: 'district|collector|zilla|anganwadi|cdpo' }
    ],
    portals: [
      { label: 'OPSC', href: 'https://www.opsc.gov.in/' },
      { label: 'OSSC', href: 'https://www.ossc.gov.in/' },
      { label: 'OSSSC', href: 'https://www.osssc.gov.in/' },
      { label: 'Odisha Government', href: 'https://odisha.gov.in/' }
    ],
    related: [
      { title: 'OPSC / OAS Syllabus & PYQs', text: 'Prelims and mains syllabus with previous-year papers.', href: '/resources/' },
      { title: 'Odisha GK Mock Tests', text: 'Timed CBT practice for OSSC, OSSSC and OPSC exams.', href: '/mock-tests/' },
      { title: 'Odisha Current Affairs', text: 'Daily state and national updates for exam preparation.', href: '/current-affairs/' },
      { title: 'Study Library', text: 'Structured notes for state-level competitive exams.', href: '/study-library/' }
    ]
  },
  {
    slug: 'teaching-education',
    icon: '🎓',
    title: 'Teaching & Education',
    boards: 'OTET · OSSTET · JT · SSB · DHSE Guest Faculty · OAVS',
    description: 'Teaching and education recruitment in Odisha — OTET, OSSTET, Junior Teacher, SSB, DHSE guest faculty and OAVS notices with official links.',
    summary: 'Teacher eligibility tests, Junior Teacher and school-level recruitment, DHSE guest faculty engagements and Odisha Adarsha Vidyalaya Sangathan (OAVS) notices, gathered in one place with official portals.',
    pattern: 'teach|otet|osstet|\\btet\\b|\\bjt\\b|junior teacher|\\bssb\\b|dhse|guest faculty|oavs|adarsha|lecturer|\\btgt\\b|\\bpgt\\b|b\\.?ed|school|\\bcht\\b|\\bltr\\b|education',
    chips: [
      { label: 'OTET / OSSTET', pattern: 'otet|osstet|\\btet\\b' },
      { label: 'Junior Teacher', pattern: 'junior teacher|\\bjt\\b|\\bcht\\b|\\bltr\\b' },
      { label: 'SSB & Schools', pattern: '\\bssb\\b|school|\\btgt\\b|\\bpgt\\b' },
      { label: 'DHSE Guest Faculty', pattern: 'dhse|guest|lecturer|faculty' },
      { label: 'OAVS', pattern: 'oavs|adarsha' }
    ],
    portals: [
      { label: 'School & Mass Education', href: 'https://sme.odisha.gov.in/' },
      { label: 'Higher Education Dept', href: 'https://dhe.odisha.gov.in/' },
      { label: 'OAVS', href: 'https://oavs.in/' },
      { label: 'BSE Odisha', href: 'https://bseodisha.ac.in/' }
    ],
    related: [
      { title: 'OTET & OSSTET Syllabus / PYQs', text: 'Paper-wise syllabus and previous-year question papers.', href: '/resources/' },
      { title: 'Teacher Eligibility Mock Tests', text: 'Child pedagogy, language and subject practice sets.', href: '/mock-tests/' },
      { title: 'Education Study Library', text: 'Concept notes on pedagogy and subject content.', href: '/study-library/' },
      { title: 'Career Guidance', text: 'Plan a teaching career path with B.Ed and TET steps.', href: '/career-guidance/' }
    ]
  },
  {
    slug: 'central-ssc-railways-banking',
    icon: '🚆',
    title: 'Central, SSC, Railways & Banking',
    boards: 'SSC · RRB · IBPS · SBI · UPSC',
    description: 'Central government, SSC, Railways, banking and UPSC recruitment notices open to Odisha candidates, with official portals and dates.',
    summary: 'All-India recruitment from the Staff Selection Commission, Railway Recruitment Boards, IBPS, SBI, RBI and UPSC, filtered for candidates in Odisha with official notification links.',
    pattern: 'upsc|\\bssc\\b|\\bcgl\\b|\\bchsl\\b|\\bmts\\b|rrb|railway|\\bntpc\\b|group d|ibps|\\bsbi\\b|\\brbi\\b|nabard|bank|clerk|central',
    chips: [
      { label: 'SSC', pattern: '\\bssc\\b|\\bcgl\\b|\\bchsl\\b|\\bmts\\b' },
      { label: 'Railways (RRB)', pattern: 'rrb|railway|\\bntpc\\b|group d|\\balp\\b' },
      { label: 'Banking (IBPS / SBI)', pattern: 'ibps|\\bsbi\\b|\\brbi\\b|nabard|bank|clerk' },
      { label: 'UPSC', pattern: 'upsc|civil services|\\bnda\\b|\\bcds\\b|\\bcapf\\b' }
    ],
    portals: [
      { label: 'SSC', href: 'https://ssc.gov.in/' },
      { label: 'Indian Railways', href: 'https://indianrailways.gov.in/' },
      { label: 'UPSC', href: 'https://upsc.gov.in/' },
      { label: 'RBI', href: 'https://www.rbi.org.in/' },
      { label: 'IBPS', href: 'https://www.ibps.in/' }
    ],
    related: [
      { title: 'SSC, RRB & Banking Syllabus / PYQs', text: 'Tier-wise syllabus and previous papers.', href: '/resources/' },
      { title: 'Quant & Reasoning Mock Tests', text: 'CBT drills for SSC, railways and bank exams.', href: '/mock-tests/' },
      { title: 'Current Affairs', text: 'Daily national updates and monthly capsules.', href: '/current-affairs/' },
      { title: 'Study Library', text: 'General awareness, maths and English notes.', href: '/study-library/' }
    ]
  },
  {
    slug: 'police-defence',
    icon: '🛡️',
    title: 'Police & Defence',
    boards: 'Odisha Police · CAPF · Agniveer · Defence',
    description: 'Odisha Police, CAPF, Agniveer and Defence recruitment notices with eligibility, physical standards and official portals.',
    summary: 'Odisha Police constable and sub-inspector recruitment, CAPF forces, Agniveer entries and Army, Navy and Air Force opportunities, with official links for each.',
    pattern: 'police|constable|sub[- ]?inspector|\\bsi\\b|capf|crpf|\\bbsf\\b|cisf|itbp|assam rifles|paramilitary|agniveer|agnipath|army|navy|air force|defen[cs]e|\\bfire\\b|jail|excise|\\bnda\\b|\\bcds\\b',
    chips: [
      { label: 'Odisha Police', pattern: 'odisha police|police|constable|sub[- ]?inspector|\\bsi\\b|jail|\\bfire\\b|excise' },
      { label: 'CAPF', pattern: 'capf|crpf|\\bbsf\\b|cisf|itbp|assam rifles|paramilitary' },
      { label: 'Agniveer', pattern: 'agniveer|agnipath' },
      { label: 'Defence Services', pattern: 'army|navy|air force|defen[cs]e|\\bnda\\b|\\bcds\\b' }
    ],
    portals: [
      { label: 'Odisha Police', href: 'https://odishapolice.gov.in/' },
      { label: 'Ministry of Defence', href: 'https://mod.gov.in/' },
      { label: 'CRPF', href: 'https://crpf.gov.in/' },
      { label: 'BSF', href: 'https://bsf.gov.in/' },
      { label: 'Join Indian Navy', href: 'https://www.joinindiannavy.gov.in/' }
    ],
    related: [
      { title: 'Police & Defence Syllabus / PYQs', text: 'Written-test syllabus and previous papers.', href: '/resources/' },
      { title: 'Constable & SI Mock Tests', text: 'Reasoning, GK and arithmetic practice.', href: '/mock-tests/' },
      { title: 'Current Affairs', text: 'Security, defence and national updates.', href: '/current-affairs/' },
      { title: 'Career Guidance', text: 'Physical standards and selection-stage planning.', href: '/career-guidance/' }
    ]
  },
  {
    slug: 'psu-technical-healthcare',
    icon: '⚙️',
    title: 'PSU, Technical & Healthcare',
    boards: 'PSUs · Engineering · Medical · Nursing',
    description: 'PSU, engineering, medical and nursing recruitment notices for Odisha candidates with official portals and eligibility.',
    summary: 'Public sector undertakings, engineering and diploma posts, doctors, nurses and paramedical roles — Odisha and central notices with official recruitment links.',
    pattern: '\\bpsu\\b|ntpc|nalco|iocl?|bhel|\\bsail\\b|gail|ongc|coal|\\bhal\\b|drdo|isro|engineer|technical|diploma|\\biti\\b|\\bgate\\b|nurs|medical|doctor|health|\\bnhm\\b|aiims|pharmac|paramedical|\\banm\\b|\\bgnm\\b',
    chips: [
      { label: 'PSUs', pattern: '\\bpsu\\b|ntpc|nalco|iocl?|bhel|\\bsail\\b|gail|ongc|coal|\\bhal\\b|drdo|isro' },
      { label: 'Engineering & Technical', pattern: 'engineer|technical|diploma|\\biti\\b|\\bgate\\b|\\bje\\b' },
      { label: 'Medical', pattern: 'medical|doctor|aiims|\\bnhm\\b|pharmac|health|specialist' },
      { label: 'Nursing & Paramedical', pattern: 'nurs|paramedical|\\banm\\b|\\bgnm\\b|lab technician' }
    ],
    portals: [
      { label: 'NHM Odisha', href: 'https://nhmodisha.gov.in/' },
      { label: 'Health Dept Odisha', href: 'https://health.odisha.gov.in/' },
      { label: 'AIIMS Bhubaneswar', href: 'https://aiimsbhubaneswar.nic.in/' },
      { label: 'DRDO', href: 'https://www.drdo.gov.in/' },
      { label: 'ISRO', href: 'https://www.isro.gov.in/' }
    ],
    related: [
      { title: 'GATE, JE & Technical Syllabus', text: 'Engineering and diploma exam syllabus with PYQs.', href: '/resources/' },
      { title: 'Technical & Nursing Mock Tests', text: 'Subject practice for PSU, JE and nursing exams.', href: '/mock-tests/' },
      { title: 'Study Library', text: 'Core engineering and health-science notes.', href: '/study-library/' },
      { title: 'Career Guidance', text: 'Choose between PSU, technical and healthcare tracks.', href: '/career-guidance/' }
    ]
  },
  {
    slug: 'private-remote-internships',
    icon: '💼',
    title: 'Private, Remote & Internships',
    boards: 'Private Sector · Apprenticeships · Remote Work',
    description: 'Private sector jobs, apprenticeships, internships and remote work opportunities for Odisha candidates, with trusted portals.',
    summary: 'Private-sector openings, apprenticeship programmes, internships and remote or freelance work — with trusted government skill portals for safe, verified applications.',
    pattern: 'private|apprentice|intern|remote|work from home|\\bwfh\\b|freelanc|startup|trainee|corporate|walk[- ]?in|campus|fresher|software|\\bit\\b',
    chips: [
      { label: 'Private Sector', pattern: 'private|corporate|walk[- ]?in|campus|fresher|startup|software|\\bit\\b' },
      { label: 'Apprenticeships', pattern: 'apprentice|trainee|nats|skill' },
      { label: 'Internships', pattern: 'intern' },
      { label: 'Remote Work', pattern: 'remote|work from home|\\bwfh\\b|freelanc' }
    ],
    portals: [
      { label: 'National Career Service', href: 'https://www.ncs.gov.in/' },
      { label: 'Apprenticeship India', href: 'https://www.apprenticeshipindia.gov.in/' },
      { label: 'AICTE Internships', href: 'https://internship.aicte-india.org/' },
      { label: 'Skill India Digital', href: 'https://www.skillindiadigital.gov.in/' }
    ],
    related: [
      { title: 'Employability & Interview Prep', text: 'Resume, interview and aptitude guidance.', href: '/career-guidance/' },
      { title: 'Aptitude Mock Tests', text: 'Practice tests commonly used in campus hiring.', href: '/mock-tests/' },
      { title: 'Study Library', text: 'Skill and certification learning material.', href: '/study-library/' },
      { title: 'Schemes & Benefits', text: 'Skilling and stipend schemes for young job seekers.', href: '/schemes-benefits/' }
    ]
  }
];
