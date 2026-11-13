// Admin-only idempotent Odisha starter content seeder (RBAC + CSRF enforced).
import { HttpError, json } from '../../_lib/http.js';
import { requireRole, audit } from '../../_lib/rbac.js';

const FUTURE_DATE = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const NOW_ISO = () => new Date().toISOString();

const SEED_JOBS = [
  {
    slug: 'opsc-ocs-2026-notification',
    title: 'OPSC Odisha Civil Services (OCS) 2026 — 399 Group A & B Posts',
    summary: 'Odisha Public Service Commission invites online applications for OAS, OFS, OPS, and allied Group A/B services.',
    body_md: '## OPSC OCS 2026 Overview\n\n- **Conducting Body:** Odisha Public Service Commission (OPSC)\n- **Total Vacancies:** 399\n- **Qualification:** Bachelor Degree from a recognised university\n- **Selection Stages:** Prelims, Mains, and Personality Test',
    category: 'OPSC',
    tags: '["OPSC","OAS","Civil Services","Odisha"]',
    organisation: 'Odisha Public Service Commission (OPSC)',
    vacancies: 399,
    qualification: 'Graduate (Any Stream)',
    apply_url: 'https://www.opsc.gov.in/',
    state: 'Odisha',
    daysAhead: 28
  },
  {
    slug: 'ossc-cglre-2026-combined-graduate',
    title: 'OSSC Combined Graduate Level (CGLRE) 2026 — 586 Group B & C Posts',
    summary: 'Odisha Staff Selection Commission notification for Auditor, Inspector of Co-op Societies, and Junior Assistant.',
    body_md: '## OSSC CGLRE 2026 Details\n\n- **Conducting Body:** OSSC\n- **Posts:** Group B & Group C Specialist/Generalist\n- **Exam Mode:** OMR / CBT Prelims + Mains',
    category: 'OSSC',
    tags: '["OSSC","CGLRE","Graduate","Odisha"]',
    organisation: 'Odisha Staff Selection Commission (OSSC)',
    vacancies: 586,
    qualification: 'Bachelor Degree + Computer Knowledge',
    apply_url: 'https://www.ossc.gov.in/',
    state: 'Odisha',
    daysAhead: 21
  },
  {
    slug: 'osssc-ri-ari-amin-2026',
    title: 'OSSSC RI, ARI, Amin & SFS Combined Recruitment 2026 — 2895 Posts',
    summary: 'District-wise Revenue Inspector, Assistant Revenue Inspector, Amin, and Statistical Field Surveyor recruitment.',
    body_md: '## OSSSC Combined District Cadre\n\n- **Conducting Body:** OSSSC\n- **Total Posts:** 2895\n- **Minimum Qualification:** +2 / +3 as per post',
    category: 'OSSSC',
    tags: '["OSSSC","RI","ARI","Amin","Odisha"]',
    organisation: 'Odisha Sub-Ordinate Staff Selection Commission (OSSSC)',
    vacancies: 2895,
    qualification: '+2 / Graduate',
    apply_url: 'https://www.osssc.gov.in/',
    state: 'Odisha',
    daysAhead: 35
  }
];

const SEED_CA = [
  {
    slug: 'odisha-cabinet-2026-industrial-policy',
    title: 'Odisha Cabinet Approves Green Hydrogen & MSME Industrial Corridor 2026',
    summary: 'State Cabinet clears special incentives for Paradip, Dhamra, and Gopalpur industrial clusters to boost youth employment.',
    body_md: '## Key Highlights\n\n- Focus on coastal industrial corridors and MSME capital subsidy.\n- Expected to create over 45,000 skilled jobs across Odisha.',
    category: 'Odisha',
    tags: '["Odisha","Economy","Cabinet","Current Affairs"]',
    event_date: FUTURE_DATE(-1)
  },
  {
    slug: 'national-budget-odisha-rail-2026',
    title: 'Union Budget 2026–27: Major Railway & Port Connectivity Projects for Odisha',
    summary: 'New allocations announced for Khurda Road–Balangir line completion, coastal highway, and East Coast Railway doubling.',
    body_md: '## Infrastructure Digest\n\n- Accelerated funding for Khurda–Balangir and Talcher–Bimlagarh rail links.\n- Boosts mineral and agricultural freight connectivity.',
    category: 'National',
    tags: '["National","Odisha","Infrastructure","Budget"]',
    event_date: FUTURE_DATE(-2)
  },
  {
    slug: 'similipal-tiger-conservation-award-2026',
    title: 'Similipal Biosphere Reserve Recognised for Community-Led Wildlife Conservation',
    summary: 'Mayurbhanj forest divisions and local Eco-Development Committees receive national recognition for biodiversity protection.',
    body_md: '## Environment & Ecology\n\n- Similipal in Mayurbhanj district is renowned for melanistic tigers and rich Sal forests.\n- Important topic for OPSC OCS & OSSSC GK.',
    category: 'Environment',
    tags: '["Odisha","Environment","Similipal","GK"]',
    event_date: FUTURE_DATE(-3)
  }
];

const SEED_TESTS = [
  {
    slug: 'odisha-gk-ossc-opsc-starter',
    title: 'Odisha GK & Heritage Special — OPSC / OSSC Starter Test',
    target_exam: 'OPSC OCS / OSSC CGL',
    duration_minutes: 15,
    total_marks: 5,
    negative_marking: 0.25,
    questions: [
      { section: 'Odisha History', q: 'Who was the founder of the Bhoi dynasty in Odisha?', a: 'Govinda Vidyadhara', b: 'Kapilendra Deva', c: 'Purushottama Deva', d: 'Mukunda Deva', ans: 'A', exp: 'Govinda Vidyadhara founded the Bhoi dynasty in 1541 CE.' },
      { section: 'Odisha Geography', q: 'Which river is known as the Sorrow of Odisha historically before Hirakud Dam?', a: 'Baitarani', b: 'Mahanadi', c: 'Brahmani', d: 'Subarnarekha', ans: 'B', exp: 'The Mahanadi caused frequent floods prior to the construction of the Hirakud Dam.' },
      { section: 'Odisha Culture', q: 'Konark Sun Temple was built in the 13th century by which Eastern Ganga king?', a: 'Anantavarman Chodaganga', b: 'Narasimhadeva I', c: 'Bhanudeva IV', d: 'Rajaraja II', ans: 'B', exp: 'King Narasimhadeva I (1238–1264 CE) built the Konark Sun Temple.' },
      { section: 'Odisha Polity', q: 'How many Lok Sabha constituencies does Odisha have?', a: '14', b: '18', c: '21', d: '24', ans: 'C', exp: 'Odisha sends 21 members to the Lok Sabha and 10 members to the Rajya Sabha.' },
      { section: 'Odisha Economy', q: 'Chilika Lake is primarily spread across which three districts of Odisha?', a: 'Puri, Khordha, Ganjam', b: 'Cuttack, Puri, Kendrapara', c: 'Ganjam, Gajapati, Rayagada', d: 'Balasore, Bhadrak, Jajpur', ans: 'A', exp: 'Chilika Lake spans Puri, Khordha, and Ganjam districts.' }
    ]
  },
  {
    slug: 'general-studies-polity-economy-2026',
    title: 'General Studies: Indian Polity & Economy Practice Set',
    target_exam: 'OSSSC RI / ARI / Amin',
    duration_minutes: 15,
    total_marks: 5,
    negative_marking: 0.25,
    questions: [
      { section: 'Polity', q: 'Which Article of the Indian Constitution deals with the Election Commission of India?', a: 'Article 280', b: 'Article 324', c: 'Article 356', d: 'Article 368', ans: 'B', exp: 'Article 324 vests superintendence, direction, and control of elections in the Election Commission.' },
      { section: 'Polity', q: 'The 73rd Constitutional Amendment Act, 1992 is related to:', a: 'Municipalities', b: 'Panchayati Raj Institutions', c: 'Fundamental Duties', d: 'Anti-Defection Law', ans: 'B', exp: 'The 73rd Amendment gave constitutional status to Panchayati Raj Institutions.' },
      { section: 'Economy', q: 'Who chairs the Monetary Policy Committee (MPC) of India?', a: 'Union Finance Minister', b: 'RBI Governor', c: 'NITI Aayog Vice-Chairman', d: 'Chief Economic Advisor', ans: 'B', exp: 'The Governor of the Reserve Bank of India is the ex-officio Chairperson of the MPC.' },
      { section: 'Polity', q: 'Right to Education (Article 21A) was added by which Constitutional Amendment?', a: '42nd Amendment', b: '44th Amendment', c: '86th Amendment', d: '91st Amendment', ans: 'C', exp: 'The 86th Constitutional Amendment Act, 2002 inserted Article 21A.' },
      { section: 'Economy', q: 'GST in India was implemented from which date?', a: '1 April 2017', b: '1 July 2017', c: '1 January 2018', d: '8 November 2016', ans: 'B', exp: 'Goods and Services Tax (GST) came into effect on 1 July 2017.' }
    ]
  }
];

const SEED_RESOURCES = [
  {
    id: 'seed-res-opsc-syllabus-2026',
    kind: 'syllabus',
    title: 'OPSC OCS Prelims & Mains Complete Syllabus 2026',
    exam: 'OPSC OCS',
    year: 2026,
    description: 'Complete paper-wise syllabus for GS Paper I, CSAT, and Mains Compulsory/Optional papers.',
    media_key: 'seed-opsc-ocs-syllabus-2026.pdf'
  },
  {
    id: 'seed-res-ossc-cgl-pyq-2025',
    kind: 'pyq',
    title: 'OSSC CGLRE Previous Year Question Paper & Key',
    exam: 'OSSC CGLRE',
    year: 2025,
    description: 'Official Prelims question paper with Odisha GK, Reasoning, and Quantitative Aptitude solutions.',
    media_key: 'seed-ossc-cgl-pyq-2025.pdf'
  }
];

export async function handleSeedOdisha(request, env, actor) {
  if (request.method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  const now = NOW_ISO();
  const inserted = { jobs: 0, current_affairs: 0, mock_tests: 0, questions: 0, resources: 0 };
  const skipped = { jobs: 0, current_affairs: 0, mock_tests: 0, resources: 0 };

  for (const j of SEED_JOBS) {
    const exists = await env.DB.prepare("SELECT id FROM posts WHERE type = 'job' AND slug = ? AND deleted_at IS NULL").bind(j.slug).first();
    if (exists) { skipped.jobs++; continue; }
    await env.DB.prepare(
      `INSERT INTO posts (id, type, slug, title, summary, body_md, category, tags, organisation, vacancies, qualification, last_date, apply_url, state, status, published_at, created_by, updated_by)
       VALUES (?, 'job', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`
    ).bind(
      crypto.randomUUID(), j.slug, j.title, j.summary, j.body_md, j.category, j.tags,
      j.organisation, j.vacancies, j.qualification, FUTURE_DATE(j.daysAhead), j.apply_url, j.state,
      now, actor.userId, actor.userId
    ).run();
    inserted.jobs++;
  }

  for (const c of SEED_CA) {
    const exists = await env.DB.prepare("SELECT id FROM posts WHERE type = 'current_affair' AND slug = ? AND deleted_at IS NULL").bind(c.slug).first();
    if (exists) { skipped.current_affairs++; continue; }
    await env.DB.prepare(
      `INSERT INTO posts (id, type, slug, title, summary, body_md, category, tags, event_date, status, published_at, created_by, updated_by)
       VALUES (?, 'current_affair', ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`
    ).bind(
      crypto.randomUUID(), c.slug, c.title, c.summary, c.body_md, c.category, c.tags, c.event_date,
      now, actor.userId, actor.userId
    ).run();
    inserted.current_affairs++;
  }

  for (const t of SEED_TESTS) {
    const exists = await env.DB.prepare('SELECT id FROM mock_tests WHERE slug = ? AND deleted_at IS NULL').bind(t.slug).first();
    if (exists) { skipped.mock_tests++; continue; }
    const testId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO mock_tests (id, slug, title, target_exam, duration_minutes, total_marks, negative_marking, status, published_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`
    ).bind(testId, t.slug, t.title, t.target_exam, t.duration_minutes, t.total_marks, t.negative_marking, now, actor.userId, actor.userId).run();
    inserted.mock_tests++;
    for (let i = 0; i < t.questions.length; i++) {
      const q = t.questions[i];
      await env.DB.prepare(
        `INSERT INTO mock_questions (id, test_id, position, section, question_en, option_a, option_b, option_c, option_d, correct_option, explanation, marks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(crypto.randomUUID(), testId, i + 1, q.section, q.q, q.a, q.b, q.c, q.d, q.ans, q.exp).run();
      inserted.questions++;
    }
  }

  for (const r of SEED_RESOURCES) {
    const exists = await env.DB.prepare('SELECT id FROM resources WHERE id = ? AND deleted_at IS NULL').bind(r.id).first();
    if (exists) { skipped.resources++; continue; }
    await env.DB.prepare(
      `INSERT INTO resources (id, kind, title, exam, year, description, media_key, status, published_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`
    ).bind(r.id, r.kind, r.title, r.exam, r.year, r.description, r.media_key, now, actor.userId, actor.userId).run();
    inserted.resources++;
  }

  await audit(env, request, actor, 'seed.odisha', 'system', 'starter_content', { inserted, skipped });
  return json({ ok: true, inserted, skipped });
}

export async function onRequest({ request, env }) {
  const actor = await requireRole(request, env, ['admin']);
  return handleSeedOdisha(request, env, actor);
}
