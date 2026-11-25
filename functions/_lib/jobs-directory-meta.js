// Pure ESM metadata & routing helper for /jobs-careers/ categorized pages,
// /jobs-careers/detail/<slug> item pages, and legacy 301 redirects.

export const JOBS_CATEGORY_SECTIONS = {
  'jobs-recruitment': {
    slug: 'jobs-recruitment',
    title: 'Jobs & Recruitment',
    description: 'Verified Odisha State (OPSC, OSSC, OSSSC, OPRB) and Central (SSC, RRB, IBPS, UPSC) recruitment notices, dates, and official portals.'
  },
  'career-explorer': {
    slug: 'career-explorer',
    title: 'Career Explorer',
    description: 'Sector-wise career pathways across Civil Services, Engineering, PSUs, Medical & Nursing, IT, Agriculture, Law, and Research.'
  },
  'eligibility-explorer': {
    slug: 'eligibility-explorer',
    title: 'Eligibility & Qualification Explorer',
    description: 'Explore Odisha and Central opportunities by qualification (10th, +2, ITI, Diploma, Graduate, PG), age relaxation, and PET standards.'
  },
  'courses-exams': {
    slug: 'courses-exams',
    title: 'Courses, Entrance Exams & Certifications',
    description: 'OJEE, JEE Main, NEET UG, GATE, CUET, OTET, OSSTET, Odisha B.Ed., UGC NET, and government skill certifications.'
  },
  'scholarships-support': {
    slug: 'scholarships-support',
    title: 'Scholarships & Financial Support',
    description: 'Odisha State Scholarship Portal, Post-Matric, Gopabandhu Sikhya Sahayata, KALIA, NSP, and PM-Vidyalaxmi education loans.'
  },
  'international-overseas': {
    slug: 'international-overseas',
    title: 'International & Overseas Opportunities',
    description: 'MEA e-Migrate verified overseas jobs, Chevening, Fulbright-Nehru, DAAD Germany, Japan TITP/SSW, and National Overseas Scholarships.'
  },
  'career-development': {
    slug: 'career-development',
    title: 'Career Development & Employability',
    description: 'NAPS/NATS apprenticeships, AICTE & PM internships, World Skill Center Bhubaneswar, resume building, and interview prep.'
  },
  'institutions-portals': {
    slug: 'institutions-portals',
    title: 'Institutions, Official Portals & Verification',
    description: 'Verified .gov.in portals (OPSC, OSSC, OSSSC, SAMS, e-District, DigiLocker, NCS) and anti-fraud recruitment verification.'
  }
};

export const LEGACY_JOBS_REDIRECTS = {
  '/jobs-careers/odisha-state-jobs': '/jobs/',
  '/jobs-careers/odisha-state-jobs/': '/jobs/',
  '/jobs-careers/odisha-state-jobs/index.html': '/jobs/',
  '/jobs-careers/central-ssc-railways-banking': '/jobs/',
  '/jobs-careers/central-ssc-railways-banking/': '/jobs/',
  '/jobs-careers/central-ssc-railways-banking/index.html': '/jobs/',
  '/jobs-careers/police-defence': '/jobs/',
  '/jobs-careers/police-defence/': '/jobs/',
  '/jobs-careers/police-defence/index.html': '/jobs/',
  '/jobs-careers/teaching-education': '/study-library/',
  '/jobs-careers/teaching-education/': '/study-library/',
  '/jobs-careers/teaching-education/index.html': '/study-library/',
  '/jobs-careers/psu-technical-healthcare': '/careers/',
  '/jobs-careers/psu-technical-healthcare/': '/careers/',
  '/jobs-careers/psu-technical-healthcare/index.html': '/careers/',
  '/jobs-careers/private-remote-internships': '/careers/',
  '/jobs-careers/private-remote-internships/': '/careers/',
  '/jobs-careers/private-remote-internships/index.html': '/careers/'
};

export function matchJobsCategoryPath(pathname) {
  const m = String(pathname || '').match(/^\/jobs-careers\/([a-z0-9-]+)\/?$/i);
  if (!m) return null;
  const slug = m[1].toLowerCase();
  return JOBS_CATEGORY_SECTIONS[slug] || null;
}

export function matchJobsDetailPath(pathname) {
  const m = String(pathname || '').match(/^\/jobs-careers\/detail\/([^/]+)\/?$/i);
  if (!m) return null;
  const raw = m[1];
  if (!raw || raw === 'index.html') return null;
  try { return decodeURIComponent(raw).trim(); } catch { return raw.trim(); }
}

export function humanizeSlug(slug) {
  return String(slug || '')
    .replace(/^hub-/, '')
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
