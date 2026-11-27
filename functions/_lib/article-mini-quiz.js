/**
 * Common Sense Odisha — Grounded Bilingual 25-MCQ Article Mini-Quiz Engine (v387)
 * Zero Hallucinations:
 *  - Priority 1: Custom `quiz_json` / `mcqs` stored on the D1 record if present
 *  - Priority 2: Deterministic fact-grounded MCQs extracted directly from the article's
 *    verified D1 columns & Markdown tables (authority, advt/notice no., vacancies, pass %,
 *    exam/walk-in/deadline dates, qualification, official portal URL) paired with
 *    verified subject/exam-pattern bilingual MCQs (Pedagogy/CDP for Teaching/CTET/OSSTET/ITEP;
 *    Teaching & Research Aptitude for UGC NET; Odisha GK & Polity for state notices) up to 25 MCQs.
 */
import { json } from './http.js';

export function serializeQuizJson(payload) {
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

function cleanText(raw, max = 220) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stableHash(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildOptions(correctEn, distractorsEn, correctOr, distractorsOr, seed) {
  const uniq = [];
  const seen = new Set([String(correctEn).toLowerCase()]);
  uniq.push({ en: String(correctEn), or: String(correctOr || correctEn), isCorrect: true });
  for (let i = 0; i < distractorsEn.length && uniq.length < 4; i += 1) {
    const de = String(distractorsEn[i] || '').trim();
    if (!de || seen.has(de.toLowerCase())) continue;
    seen.add(de.toLowerCase());
    uniq.push({ en: de, or: String((distractorsOr && distractorsOr[i]) || de), isCorrect: false });
  }
  if (uniq.length < 4) return null;
  // Deterministic rotation based on seed so correct option isn't always index 0
  const shift = seed % 4;
  const rotated = uniq.map((_, idx) => uniq[(idx + shift) % 4]);
  const correctIndex = rotated.findIndex((o) => o.isCorrect);
  return {
    options_en: rotated.map((o) => o.en),
    options_or: rotated.map((o) => o.or),
    correct_index: correctIndex
  };
}

function extractFactMcqs(record, kind) {
  const qs = [];
  const slug = String(record.slug || record.id || 'article');
  const titleEn = cleanText(record.title_en, 160);
  const orgEn = cleanText(record.organisation_en || record.sector_badge, 80);
  const orgOr = cleanText(record.organisation_or || orgEn, 100);
  const advt = cleanText(record.advt_number, 80);
  const vacancies = Number(record.total_vacancies || 0);
  const district = cleanText(record.location_district, 60);
  const lastDate = cleanText(record.last_date, 30);
  const examDate = cleanText(record.exam_date, 30);
  const qual = cleanText(record.qualification_summary || record.qualification_level, 120);
  const salary = cleanText(record.salary_pay_scale, 100);
  const bodyEn = String(record.article_body_en || record.body_en || '');
  const summaryEn = String(record.summary_en || '');
  const fullText = `${titleEn} ${summaryEn} ${bodyEn}`;

  let portalHost = '';
  const rawPortal = String(record.official_website_url || record.official_apply_url || record.result_url || '').trim();
  if (/^https?:\/\//i.test(rawPortal)) {
    try { portalHost = new URL(rawPortal).hostname.replace(/^www\./i, ''); } catch {}
  } else if (Array.isArray(record.links) && record.links.length) {
    const off = record.links.find((l) => l && l.is_official && /^https?:\/\//i.test(l.url));
    if (off) {
      try { portalHost = new URL(off.url).hostname.replace(/^www\./i, ''); } catch {}
    }
  }

  // 1. Conducting Authority / Organization
  if (orgEn && orgEn.length >= 2) {
    const orgPool = ['OPSC', 'OSSC', 'OSSSC', 'NTA', 'CBSE', 'BSE Odisha', 'OAVS', 'MMU'].filter(
      (o) => o.toLowerCase() !== orgEn.toLowerCase()
    );
    const opts = buildOptions(orgEn, orgPool.slice(0, 3), orgOr, orgPool.slice(0, 3), stableHash(slug + 'org'));
    if (opts) {
      qs.push({
        id: `${slug}_f_org`,
        tag: 'Official Notice Fact',
        question_en: `Which official authority / organization issued "${titleEn}"?`,
        question_or: `"${cleanText(record.title_or || titleEn, 120)}" ବିଜ୍ଞପ୍ତି କେଉଁ ସରକାରୀ ସଂସ୍ଥା ଦ୍ୱାରା ଜାରି କରାଯାଇଛି?`,
        ...opts,
        explanation_en: `As per the verified notice on Common Sense Odisha, this notification is issued by ${orgEn}.`,
        explanation_or: `ସରକାରୀ ବିଜ୍ଞପ୍ତି ଅନୁଯାୟୀ ଏହା ${orgOr} ଦ୍ୱାରା ଜାରି କରାଯାଇଛି।`
      });
    }
  }

  // 2. Total Vacancies (only when explicitly > 0 in D1)
  if (vacancies > 0) {
    const d1 = String(vacancies + 14);
    const d2 = String(Math.max(5, vacancies - 9));
    const d3 = String(vacancies + 27);
    const opts = buildOptions(`${vacancies} Posts`, [`${d1} Posts`, `${d2} Posts`, `${d3} Posts`], `${vacancies} ପଦବୀ`, [`${d1} ପଦବୀ`, `${d2} ପଦବୀ`, `${d3} ପଦବୀ`], stableHash(slug + 'vac'));
    if (opts) {
      qs.push({
        id: `${slug}_f_vac`,
        tag: 'Vacancy Fact',
        question_en: `How many total vacancies are notified in "${titleEn}"?`,
        question_or: `"${cleanText(record.title_or || titleEn, 110)}" ରେ ମୋଟ କେତୋଟି ପଦବୀ ଘୋଷଣା କରାଯାଇଛି?`,
        ...opts,
        explanation_en: `The official advertisement notifies a total of ${vacancies} posts.`,
        explanation_or: `ସରକାରୀ ବିଜ୍ଞାପନ ଅନୁଯାୟୀ ମୋଟ ${vacancies}ଟି ପଦବୀ ଘୋଷଣା କରାଯାଇଛି।`
      });
    }
  }

  // 3. Pass Percentage fact (extracted verbatim from official text if present, e.g., OSSTET 79.15%)
  const passMatch = fullText.match(/\b(\d{2}\.\d{2})%\s*(?:overall\s*)?pass/i);
  if (passMatch) {
    const pct = `${passMatch[1]}%`;
    const opts = buildOptions(pct, ['64.20%', '71.45%', '86.30%'], pct, ['64.20%', '71.45%', '86.30%'], stableHash(slug + 'pass'));
    if (opts) {
      qs.push({
        id: `${slug}_f_pass`,
        tag: 'Result Statistics',
        question_en: `What is the overall pass percentage officially recorded in "${titleEn}"?`,
        question_or: `"${cleanText(record.title_or || titleEn, 110)}" ରେ ମୋଟ ପାସ୍ ହାର କେତେ ପ୍ରତିଶତ ରହିଛି?`,
        ...opts,
        explanation_en: `The official press note confirms an overall pass percentage of ${pct}.`,
        explanation_or: `ସରକାରୀ ପ୍ରେସ୍ ନୋଟ୍ ଅନୁଯାୟୀ ମୋଟ ପାସ୍ ହାର ${pct} ରହିଛି।`
      });
    }
  }

  // 4. Last / Walk-in / OMR Deadline Date
  if (lastDate && /^\d{4}-\d{2}-\d{2}$/.test(lastDate)) {
    const yr = lastDate.slice(0, 4);
    const mo = Number(lastDate.slice(5, 7));
    const day = Number(lastDate.slice(8, 10));
    const alt1 = `${yr}-${String(mo).padStart(2, '0')}-${String(Math.min(28, day + 6)).padStart(2, '0')}`;
    const alt2 = `${yr}-${String(mo).padStart(2, '0')}-${String(Math.max(1, day - 4)).padStart(2, '0')}`;
    const alt3 = `${yr}-${String(mo === 12 ? 11 : mo + 1).padStart(2, '0')}-${String(Math.min(28, day)).padStart(2, '0')}`;
    const opts = buildOptions(lastDate, [alt1, alt2, alt3], lastDate, [alt1, alt2, alt3], stableHash(slug + 'last'));
    if (opts) {
      const stage = String(record.lifecycle_stage || '').toLowerCase();
      const labelEn = stage === 'result' ? 'OMR download / closing deadline' : (stage === 'admit_card' ? 'exam schedule end date' : 'last / walk-in date');
      qs.push({
        id: `${slug}_f_date`,
        tag: 'Key Date',
        question_en: `What is the official ${labelEn} listed for this notification?`,
        question_or: `ଏହି ସରକାରୀ ବିଜ୍ଞପ୍ତି ପାଇଁ ନିର୍ଦ୍ଧାରିତ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ତାରିଖ କେଉଁଟି?`,
        ...opts,
        explanation_en: `The official timeline specifies ${lastDate} as the key deadline/date.`,
        explanation_or: `ସରକାରୀ ସମୟସୂଚୀ ଅନୁଯାୟୀ ${lastDate} ହେଉଛି ନିର୍ଦ୍ଧାରିତ ତାରିଖ।`
      });
    }
  }

  // 5. Location / District
  if (district && !/^all\s+(odisha|india)$/i.test(district)) {
    const distPool = ['Khordha', 'Cuttack', 'Sambalpur', 'Ganjam', 'Puri', 'Balasore'].filter(
      (d) => d.toLowerCase() !== district.toLowerCase()
    );
    const opts = buildOptions(district, distPool.slice(0, 3), district, distPool.slice(0, 3), stableHash(slug + 'dist'));
    if (opts) {
      qs.push({
        id: `${slug}_f_dist`,
        tag: 'Location Fact',
        question_en: `Which Odisha district is the primary location / venue for "${titleEn}"?`,
        question_or: `"${cleanText(record.title_or || titleEn, 110)}" ପାଇଁ ଓଡ଼ିଶାର କେଉଁ ଜିଲ୍ଲା ମୁଖ୍ୟ ସ୍ଥାନ?`,
        ...opts,
        explanation_en: `The notification specifies ${district} district, Odisha as the official location.`,
        explanation_or: `ବିଜ୍ଞପ୍ତି ଅନୁଯାୟୀ ଓଡ଼ିଶାର ${district} ଜିଲ୍ଲା ହେଉଛି ମୁଖ୍ୟ ସ୍ଥାନ।`
      });
    }
  }

  // 6. Advt / Reference Number
  if (advt && advt.length >= 4) {
    const opts = buildOptions(advt, ['Advt. No. 08/2025', 'Notice No. 112/2026', 'Ref. No. 904/Odisha'], advt, ['Advt. No. 08/2025', 'Notice No. 112/2026', 'Ref. No. 904/Odisha'], stableHash(slug + 'advt'));
    if (opts) {
      qs.push({
        id: `${slug}_f_advt`,
        tag: 'Official Reference',
        question_en: `Which official Advertisement / Notice Reference corresponds to this update?`,
        question_or: `ଏହି ବିଜ୍ଞପ୍ତିର ସରକାରୀ ବିଜ୍ଞାପନ / ରେଫରେନ୍ସ ନମ୍ବର କ’ଣ?`,
        ...opts,
        explanation_en: `The verified official reference recorded in D1 is: ${advt}.`,
        explanation_or: `ସରକାରୀ ବିଜ୍ଞାପନ ରେଫରେନ୍ସ ନମ୍ବର ହେଉଛି: ${advt}।`
      });
    }
  }

  // 7. Qualification / Eligibility
  if (qual && qual.length >= 6) {
    const opts = buildOptions(
      qual,
      ['10th Pass (Matriculation) only', 'ITI Electrician Trade Certificate only', 'MBBS / MD Medical Degree only'],
      qual,
      ['କେବଳ ମାଟ୍ରିକ୍ (୧୦ମ ପାସ୍)', 'କେବଳ ITI ସାର୍ଟିଫିକେଟ୍', 'କେବଳ MBBS ଡିଗ୍ରୀ'],
      stableHash(slug + 'qual')
    );
    if (opts) {
      qs.push({
        id: `${slug}_f_qual`,
        tag: 'Eligibility',
        question_en: `Which eligibility / qualification requirement applies to "${titleEn}"?`,
        question_or: `"${cleanText(record.title_or || titleEn, 110)}" ପାଇଁ କେଉଁ ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା ଆବଶ୍ୟକ?`,
        ...opts,
        explanation_en: `Official eligibility summary: ${qual}.`,
        explanation_or: `ସରକାରୀ ଯୋଗ୍ୟତା ବିବରଣୀ: ${qual}।`
      });
    }
  }

  // 8. Official Portal Domain
  if (portalHost) {
    const hostPool = ['upsc.gov.in', 'ssc.gov.in', 'rbi.org.in', 'indianrailways.gov.in'].filter(
      (h) => h.toLowerCase() !== portalHost.toLowerCase()
    );
    const opts = buildOptions(portalHost, hostPool.slice(0, 3), portalHost, hostPool.slice(0, 3), stableHash(slug + 'host'));
    if (opts) {
      qs.push({
        id: `${slug}_f_portal`,
        tag: 'Official Portal',
        question_en: `Which official portal domain should candidates use for authentic updates on this notice?`,
        question_or: `ଏହି ବିଜ୍ଞପ୍ତିର ସଠିକ୍ ସୂଚନା ପାଇଁ କେଉଁ ସରକାରୀ ୱେବସାଇଟ୍ ବ୍ୟବହାର କରିବା ଉଚିତ୍?`,
        ...opts,
        explanation_en: `Always verify official notifications, admit cards, or results directly on ${portalHost}.`,
        explanation_or: `ସର୍ବଦା ସରକାରୀ ୱେବସାଇଟ୍ ${portalHost} ରେ ସୂଚନା ଯାଞ୍ଚ କରନ୍ତୁ।`
      });
    }
  }

  // 9. Salary / Remuneration (if present)
  if (salary && /₹|\d{2,}/.test(salary)) {
    const opts = buildOptions(salary, ['₹12,000 fixed stipend', '₹18,500 Level-1 only', 'Unpaid honorary volunteer'], salary, ['₹୧୨,୦୦୦ ସ୍ଥିର ଭତ୍ତା', '₹୧୮,୫୦୦ ଲେଭଲ୍-୧', 'ଅବୈତନିକ ସ୍ୱେଚ୍ଛାସେବୀ'], stableHash(slug + 'sal'));
    if (opts) {
      qs.push({
        id: `${slug}_f_sal`,
        tag: 'Pay & Scale',
        question_en: `What pay scale / remuneration is mentioned in this recruitment notice?`,
        question_or: `ଏହି ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତିରେ କେଉଁ ବେତନ / ଦରମା ଉଲ୍ଲେଖ କରାଯାଇଛି?`,
        ...opts,
        explanation_en: `The official notice specifies: ${salary}.`,
        explanation_or: `ସରକାରୀ ବିଜ୍ଞପ୍ତି ଅନୁଯାୟୀ ବେତନ: ${salary}।`
      });
    }
  }

  // 10. Exam Date (if distinct from lastDate)
  if (examDate && examDate !== lastDate && /^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
    const opts = buildOptions(examDate, ['2026-07-15', '2026-08-22', '2026-10-05'], examDate, ['2026-07-15', '2026-08-22', '2026-10-05'], stableHash(slug + 'exdt'));
    if (opts) {
      qs.push({
        id: `${slug}_f_exdt`,
        tag: 'Exam Date',
        question_en: `Which official examination date is recorded for this update?`,
        question_or: `ଏହି ପରୀକ୍ଷା ପାଇଁ ସରକାରୀ ପରୀକ୍ଷା ତାରିଖ କେଉଁଟି?`,
        ...opts,
        explanation_en: `The verified exam date recorded is ${examDate}.`,
        explanation_or: `ସରକାରୀ ପରୀକ୍ଷା ତାରିଖ ହେଉଛି ${examDate}।`
      });
    }
  }

  return qs;
}

// Verified, textbook-accurate bilingual subject MCQ banks (Zero Fabrications)
const TEACHING_CDP_BANK = [
  {
    id: 'bk_cdp_1', tag: 'Pedagogy & CDP',
    question_en: 'Who proposed the concept of Zone of Proximal Development (ZPD) and Scaffolding in educational psychology?',
    question_or: 'ଶିକ୍ଷା ମନୋବିଜ୍ଞାନରେ Zone of Proximal Development (ZPD) ଓ Scaffolding ତତ୍ତ୍ୱ କିଏ ପ୍ରସ୍ତାବ କରିଥିଲେ?',
    options_en: ['Jean Piaget', 'Lev Vygotsky', 'B.F. Skinner', 'Lawrence Kohlberg'],
    options_or: ['ଜିନ୍ ପିଆଜେ', 'ଲେଭ୍ ଭାଇଗୋଟ୍ସକି', 'ବି.ଏଫ୍. ସ୍କିନର', 'ଲରେନ୍ସ କୋହଲବର୍ଗ'],
    correct_index: 1,
    explanation_en: 'Lev Vygotsky’s sociocultural theory defines ZPD as the gap between independent ability and guided potential.',
    explanation_or: 'ଲେଭ୍ ଭାଇଗୋଟ୍ସକିଙ୍କ ସାମାଜିକ-ସାଂସ୍କୃତିକ ତତ୍ତ୍ୱରେ ZPD ଓ ସ୍କାଫୋଲ୍ଡିଂର ଅବଧାରଣା ଦିଆଯାଇଛି।'
  },
  {
    id: 'bk_cdp_2', tag: 'NEP 2020',
    question_en: 'Under NEP 2020, the traditional 10+2 school curricular structure is replaced by which pedagogical structure?',
    question_or: 'ଜାତୀୟ ଶିକ୍ଷା ନୀତି (NEP) ୨୦୨୦ ରେ ପୂର୍ବତନ ୧୦+୨ ଢାଞ୍ଚା ବଦଳରେ କେଉଁ ଢାଞ୍ଚା ଗ୍ରହଣ କରାଯାଇଛି?',
    options_en: ['5+3+3+4', '5+4+3+2', '6+3+3+2', '4+4+4+3'],
    options_or: ['୫+୩+୩+୪', '୫+୪+୩+୨', '୬+୩+୩+୨', '୪+୪+୪+୩'],
    correct_index: 0,
    explanation_en: 'NEP 2020 introduces the 5+3+3+4 framework: Foundational (5), Preparatory (3), Middle (3), and Secondary (4).',
    explanation_or: 'NEP ୨୦୨୦ ରେ ୫+୩+୩+୪ (ମୌଳିକ, ପ୍ରସ୍ତୁତି, ମଧ୍ୟମ ଓ ମାଧ୍ୟମିକ) ଢାଞ୍ଚା ଲାଗୁ ହୋଇଛି।'
  },
  {
    id: 'bk_cdp_3', tag: 'Pedagogy & CDP',
    question_en: 'According to Jean Piaget, during which stage of cognitive development does a child develop "Object Permanence"?',
    question_or: 'ଜିନ୍ ପିଆଜେଙ୍କ ଅନୁସାରେ ଶିଶୁର କେଉଁ ବିକାଶ ଅବସ୍ଥାରେ "Object Permanence" (ବସ୍ତୁ ସ୍ଥାୟିତ୍ୱ) ବିକଶିତ ହୁଏ?',
    options_en: ['Sensorimotor Stage (0–2 yrs)', 'Pre-operational Stage (2–7 yrs)', 'Concrete Operational Stage (7–11 yrs)', 'Formal Operational Stage (11+ yrs)'],
    options_or: ['ସେନସରିମୋଟର ଅବସ୍ଥା (୦–୨ ବର୍ଷ)', 'ପ୍ରାକ୍-ସଂକ୍ରିୟାତ୍ମକ ଅବସ୍ଥା (୨–୭ ବର୍ଷ)', 'ମୂର୍ତ୍ତ ସଂକ୍ରିୟାତ୍ମକ ଅବସ୍ଥା (୭–୧୧ ବର୍ଷ)', 'ଔପଚାରିକ ସଂକ୍ରିୟାତ୍ମକ ଅବସ୍ଥା (୧୧+ ବର୍ଷ)'],
    correct_index: 0,
    explanation_en: 'Object permanence—understanding that objects continue to exist even when unseen—develops in the Sensorimotor stage.',
    explanation_or: 'ବସ୍ତୁ ଅଦୃଶ୍ୟ ହେଲେ ମଧ୍ୟ ତାର ଅସ୍ତିତ୍ୱ ରହିଥାଏ ବୋଲି ବୁଝିବା ସେନସରିମୋଟର ଅବସ୍ଥାରେ ବିକଶିତ ହୁଏ।'
  },
  {
    id: 'bk_cdp_4', tag: 'Inclusive Education',
    question_en: 'Which Constitutional Article guarantees free and compulsory education for all children aged 6 to 14 years in India?',
    question_or: 'ଭାରତୀୟ ସମ୍ବିଧାନର କେଉଁ ଅନୁଚ୍ଛେଦ ୬ ରୁ ୧୪ ବର୍ଷର ସମସ୍ତ ଶିଶୁଙ୍କ ପାଇଁ ମାଗଣା ଓ ବାଧ୍ୟତାମୂଳକ ଶିକ୍ଷା ନିଶ୍ଚିତ କରେ?',
    options_en: ['Article 19', 'Article 21A', 'Article 32', 'Article 45'],
    options_or: ['ଅନୁଚ୍ଛେଦ ୧୯', 'ଅନୁଚ୍ଛେଦ ୨୧A', 'ଅନୁଚ୍ଛେଦ ୩୨', 'ଅନୁଚ୍ଛେଦ ୪୫'],
    correct_index: 1,
    explanation_en: 'Article 21A (inserted by the 86th Constitutional Amendment Act, 2002) makes elementary education a Fundamental Right.',
    explanation_or: '୮୬ତମ ସମ୍ବିଧାନ ସଂଶୋଧନ (୨୦୦୨) ଦ୍ୱାରା ଅନୁଚ୍ଛେଦ ୨୧A ପ୍ରାଥମିକ ଶିକ୍ଷାକୁ ମୌଳିକ ଅଧିକାର କରିଛି।'
  },
  {
    id: 'bk_cdp_5', tag: 'Assessment & CCE',
    question_en: 'Assessment conducted DURING the teaching-learning process to improve student learning is called:',
    question_or: 'ଶିକ୍ଷାଦାନ ପ୍ରକ୍ରିୟା ଚାଲିଥିବା ସମୟରେ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ଉନ୍ନତି ପାଇଁ କରାଯାଉଥିବା ମୂଲ୍ୟାୟନକୁ କ’ଣ କୁହାଯାଏ?',
    options_en: ['Summative Assessment', 'Formative Assessment', 'Norm-Referenced Test', 'Terminal Examination'],
    options_or: ['ସମାପ୍ତି ମୂଲ୍ୟାୟନ', 'ଗଠନାତ୍ମକ ମୂଲ୍ୟାୟନ (Formative)', 'ନର୍ମ-ରେଫରେନ୍ସଡ୍ ଟେଷ୍ଟ', 'ଟର୍ମିନାଲ୍ ପରୀକ୍ଷା'],
    correct_index: 1,
    explanation_en: 'Formative Assessment (Assessment FOR Learning) provides ongoing diagnostic feedback during instruction.',
    explanation_or: 'ଗଠନାତ୍ମକ ମୂଲ୍ୟାୟନ (Formative Assessment) ଶିକ୍ଷଣ ସମୟରେ ନିରନ୍ତର ପ୍ରତିକ୍ରିୟା ଓ ସୁଧାର ପ୍ରଦାନ କରେ।'
  },
  {
    id: 'bk_cdp_6', tag: 'Pedagogy & CDP',
    question_en: 'Howard Gardner’s Theory of Multiple Intelligences originally proposed how many distinct types of intelligence?',
    question_or: 'ହାୱାର୍ଡ ଗାର୍ଡନରଙ୍କ ବହୁବିଧ ବୁଦ୍ଧିମତ୍ତା ତତ୍ତ୍ୱ (Multiple Intelligences) ରେ ମୂଳତଃ କେତୋଟି ବୁଦ୍ଧିମତ୍ତା ପ୍ରସ୍ତାବିତ ହୋଇଥିଲା?',
    options_en: ['3', '5', '7 (later expanded to 8)', '12'],
    options_or: ['୩', '୫', '୭ (ପରେ ୮କୁ ବୃଦ୍ଧି)', '୧୨'],
    correct_index: 2,
    explanation_en: 'Gardner proposed 7 intelligences in 1983 and later added Naturalistic intelligence (making 8).',
    explanation_or: 'ଗାର୍ଡନର ୧୯୮୩ ରେ ୭ଟି ଏବଂ ପରେ ପ୍ରାକୃତିକ ବୁଦ୍ଧିମତ୍ତା ଯୋଡ଼ି ୮ଟି ପ୍ରକାର ବର୍ଣ୍ଣନା କରିଥିଲେ।'
  },
  {
    id: 'bk_cdp_7', tag: 'Language Pedagogy',
    question_en: 'What is the natural sequence of acquiring the four fundamental language skills?',
    question_or: 'ଚାରୋଟି ମୌଳିକ ଭାଷା ଦକ୍ଷତା (Language Skills) ଅର୍ଜନର ସ୍ୱାଭାବିକ କ୍ରମ କ’ଣ?',
    options_en: ['Reading, Writing, Listening, Speaking', 'Listening, Speaking, Reading, Writing (LSRW)', 'Writing, Reading, Speaking, Listening', 'Speaking, Listening, Writing, Reading'],
    options_or: ['ପଠନ, ଲିଖନ, ଶ୍ରବଣ, କଥନ', 'ଶ୍ରବଣ, କଥନ, ପଠନ, ଲିଖନ (LSRW)', 'ଲିଖନ, ପଠନ, କଥନ, ଶ୍ରବଣ', 'କଥନ, ଶ୍ରବଣ, ଲିଖନ, ପଠନ'],
    correct_index: 1,
    explanation_en: 'LSRW (Listening → Speaking → Reading → Writing) is the universal pedagogical progression of language acquisition.',
    explanation_or: 'ଶ୍ରବଣ → କଥନ → ପଠନ → ଲିଖନ (LSRW) ହେଉଛି ଭାଷା ଶିକ୍ଷଣର ସ୍ୱାଭାବିକ କ୍ରମ।'
  },
  {
    id: 'bk_cdp_8', tag: 'Inclusive Education',
    question_en: 'Dyslexia is primarily associated with difficulty in which learning domain?',
    question_or: 'ଡିସଲେକ୍ସିଆ (Dyslexia) ମୁଖ୍ୟତଃ କେଉଁ ଶିକ୍ଷଣ ଅସୁବିଧା ସହ ଜଡ଼ିତ?',
    options_en: ['Mathematical calculation', 'Reading and decoding words', 'Physical motor coordination', 'Hearing impairment'],
    options_or: ['ଗାଣିତିକ ହିସାବ', 'ପଠନ ଏବଂ ଶବ୍ଦ ଚିହ୍ନଟ', 'ଶାରୀରିକ ସମନ୍ୱୟ', 'ଶ୍ରବଣ ଅସୁବିଧା'],
    correct_index: 1,
    explanation_en: 'Dyslexia affects reading fluency and phonological decoding; Dyscalculia affects math and Dysgraphia affects writing.',
    explanation_or: 'ଡିସଲେକ୍ସିଆ ପଠନ ଅସୁବିଧା ସହ ଜଡ଼ିତ (ଡିସକ୍ୟାଲକୁଲିଆ ଗଣିତ ଏବଂ ଡିସଗ୍ରାଫିଆ ଲିଖନ ସହ ଜଡ଼ିତ)।'
  },
  {
    id: 'bk_cdp_9', tag: 'Teaching Aptitude',
    question_en: 'In Bloom’s Revised Taxonomy (2001), which is the highest-order cognitive skill?',
    question_or: 'ବ୍ଲୁମ୍‌ଙ୍କ ସଂଶୋଧିତ ବର୍ଗୀକରଣ (୨୦୦୧) ଅନୁସାରେ ସର୍ବୋଚ୍ଚ ସ୍ତରର ଜ୍ଞାନାତ୍ମକ ଦକ୍ଷତା କେଉଁଟି?',
    options_en: ['Analyzing', 'Evaluating', 'Creating', 'Applying'],
    options_or: ['ବିଶ୍ଳେଷଣ (Analyzing)', 'ମୂଲ୍ୟାୟନ (Evaluating)', 'ସୃଜନ (Creating)', 'ପ୍ରୟୋଗ (Applying)'],
    correct_index: 2,
    explanation_en: 'Anderson & Krathwohl’s revised hierarchy runs: Remember → Understand → Apply → Analyze → Evaluate → Create.',
    explanation_or: 'ସଂଶୋଧିତ ବ୍ଲୁମ୍‌ ବର୍ଗୀକରଣରେ ସୃଜନ (Creating) ସର୍ବୋଚ୍ଚ ସ୍ତରରେ ରହିଛି।'
  },
  {
    id: 'bk_cdp_10', tag: 'Teacher Eligibility',
    question_en: 'As per NCTE norms, what is the validity period of a qualifying CTET / OTET / OSSTET Teacher Eligibility Certificate?',
    question_or: 'NCTE ନିୟମ ଅନୁଯାୟୀ CTET / OTET / OSSTET ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପ୍ରମାଣପତ୍ରର ବୈଧତା ଅବଧି କେତେ?',
    options_en: ['3 Years', '5 Years', '7 Years', 'Lifetime'],
    options_or: ['୩ ବର୍ଷ', '୫ ବର୍ଷ', '୭ ବର୍ଷ', 'ଆଜୀବନ (Lifetime)'],
    correct_index: 3,
    explanation_en: 'NCTE extended Teacher Eligibility Test (TET) qualifying certificate validity from 7 years to Lifetime.',
    explanation_or: 'NCTE ନିୟମ ଅନୁଯାୟୀ TET ଯୋଗ୍ୟତା ପ୍ରମାଣପତ୍ରର ବୈଧତା ଆଜୀବନ (Lifetime) କରାଯାଇଛି।'
  }
];

const UGC_NET_RESEARCH_BANK = [
  {
    id: 'bk_net_1', tag: 'Research Aptitude',
    question_en: 'Which type of research is primarily conducted to solve an immediate, localized classroom or institutional problem?',
    question_or: 'ତୁରନ୍ତ ସ୍ଥାନୀୟ ଶ୍ରେଣୀଗୃହ କିମ୍ବା ଅନୁଷ୍ଠାନିକ ସମସ୍ୟା ସମାଧାନ ପାଇଁ କେଉଁ ପ୍ରକାର ଗବେଷଣା କରାଯାଏ?',
    options_en: ['Fundamental Research', 'Action Research', 'Historical Research', 'Longitudinal Research'],
    options_or: ['ମୌଳିକ ଗବେଷଣା', 'କାର୍ଯ୍ୟମୂଳକ ଗବେଷଣା (Action Research)', 'ଐତିହାସିକ ଗବେଷଣା', 'ଦୀର୍ଘକାଳୀନ ଗବେଷଣା'],
    correct_index: 1,
    explanation_en: 'Action Research follows the Plan → Act → Observe → Reflect cycle to address immediate practical problems.',
    explanation_or: 'କାର୍ଯ୍ୟମୂଳକ ଗବେଷଣା (Action Research) ତୁରନ୍ତ ବ୍ୟବହାରିକ ସମସ୍ୟା ସମାଧାନ ପାଇଁ ବ୍ୟବହୃତ ହୁଏ।'
  },
  {
    id: 'bk_net_2', tag: 'Research Aptitude',
    question_en: 'Rejecting a true Null Hypothesis (H₀) in statistical hypothesis testing is known as:',
    question_or: 'ପରିସଂଖ୍ୟାନ ପରୀକ୍ଷଣରେ ଏକ ସତ୍ୟ ଶୂନ୍ୟ ପରିକଳ୍ପନା (Null Hypothesis) କୁ ପ୍ରତ୍ୟାଖ୍ୟାନ କରିବାକୁ କ’ଣ କୁହାଯାଏ?',
    options_en: ['Type-I Error (Alpha Error)', 'Type-II Error (Beta Error)', 'Sampling Bias', 'Standard Deviation'],
    options_or: ['ଟାଇପ୍-୧ ତ୍ରୁଟି (Alpha Error)', 'ଟାଇପ୍-୨ ତ୍ରୁଟି (Beta Error)', 'ନମୁନା ପକ୍ଷପାତ', 'ମାନକ ବିଚ୍ୟୁତି'],
    correct_index: 0,
    explanation_en: 'Type-I error (α) occurs when a true null hypothesis is rejected; Type-II error (β) occurs when a false null hypothesis is accepted.',
    explanation_or: 'ସତ୍ୟ ଶୂନ୍ୟ ପରିକଳ୍ପନାକୁ ପ୍ରତ୍ୟାଖ୍ୟାନ କଲେ Type-I Error (α) ହୁଏ।'
  },
  {
    id: 'bk_net_3', tag: 'Higher Education',
    question_en: 'SWAYAM, India’s national MOOCs platform launched by the Ministry of Education, stands for:',
    question_or: 'ଶିକ୍ଷା ମନ୍ତ୍ରଣାଳୟର ଜାତୀୟ MOOCs ପ୍ଲାଟଫର୍ମ SWAYAM ର ସମ୍ପୂର୍ଣ୍ଣ ରୂପ କ’ଣ?',
    options_en: [
      'Study Webs of Active-Learning for Young Aspiring Minds',
      'System Wide Academic Yield And Monitoring',
      'Student Welfare And Youth Academic Mission',
      'Smart Web Application for Youth And Mentors'
    ],
    options_or: [
      'Study Webs of Active-Learning for Young Aspiring Minds',
      'System Wide Academic Yield And Monitoring',
      'Student Welfare And Youth Academic Mission',
      'Smart Web Application for Youth And Mentors'
    ],
    correct_index: 0,
    explanation_en: 'SWAYAM delivers free online courses across 4 quadrants: video lectures, reading material, self-assessment tests, and discussion forums.',
    explanation_or: 'SWAYAM ହେଉଛି ଭାରତର ଜାତୀୟ ମାଗଣା ଅନଲାଇନ୍ ଶିକ୍ଷା ପ୍ଲାଟଫର୍ମ।'
  },
  {
    id: 'bk_net_4', tag: 'ICT & Digital',
    question_en: 'In computer networking, what does the acronym HTTPS stand for?',
    question_or: 'କମ୍ପ୍ୟୁଟର ନେଟୱର୍କିଂରେ HTTPS ର ସମ୍ପୂର୍ଣ୍ଣ ରୂପ କ’ଣ?',
    options_en: [
      'HyperText Transfer Protocol Secure',
      'High Transmission Text Processing System',
      'Hyperlink Terminal Transport Service',
      'Host Transfer Protocol Standard'
    ],
    options_or: [
      'HyperText Transfer Protocol Secure',
      'High Transmission Text Processing System',
      'Hyperlink Terminal Transport Service',
      'Host Transfer Protocol Standard'
    ],
    correct_index: 0,
    explanation_en: 'HTTPS encrypts communication between browser and server using TLS/SSL certificates.',
    explanation_or: 'HTTPS ବ୍ରାଉଜର ଓ ସର୍ଭର ମଧ୍ୟରେ TLS/SSL ଏନକ୍ରିପ୍ସନ୍ ସୁରକ୍ଷା ପ୍ରଦାନ କରେ।'
  },
  {
    id: 'bk_net_5', tag: 'People & Environment',
    question_en: 'The Montreal Protocol (1987) is an international treaty specifically designed to protect:',
    question_or: 'ମଣ୍ଟ୍ରିଆଲ୍ ପ୍ରୋଟୋକଲ୍ (୧୯୮୭) କେଉଁ ପରିବେଶ ସୁରକ୍ଷା ପାଇଁ ସ୍ୱାକ୍ଷରିତ ହୋଇଥିଲା?',
    options_en: ['Wetlands and Ramsar Sites', 'The Stratospheric Ozone Layer', 'Endangered Marine Species', 'Tropical Rainforests'],
    options_or: ['ଆର୍ଦ୍ରଭୂମି ସୁରକ୍ଷା', 'ଓଜୋନ୍ ସ୍ତର ସୁରକ୍ଷା', 'ସାମୁଦ୍ରିକ ପ୍ରାଣୀ ସୁରକ୍ଷା', 'ବର୍ଷାବନ ସୁରକ୍ଷା'],
    correct_index: 1,
    explanation_en: 'The Montreal Protocol phases out Ozone-Depleting Substances (ODS) such as CFCs and Halons.',
    explanation_or: 'ମଣ୍ଟ୍ରିଆଲ୍ ପ୍ରୋଟୋକଲ୍ CFC ଭଳି ଓଜୋନ୍ କ୍ଷୟକାରୀ ପଦାର୍ଥକୁ ନିୟନ୍ତ୍ରଣ କରିବାକୁ ଗଠିତ ହୋଇଥିଲା।'
  }
];

const ODISHA_GK_POLITY_BANK = [
  {
    id: 'bk_od_1', tag: 'Odisha GK',
    question_en: 'Which Odisha wetland is Asia’s largest brackish water lagoon and India’s first Ramsar site (1981)?',
    question_or: 'ଓଡ଼ିଶାର କେଉଁ ଆର୍ଦ୍ରଭୂମି ଏସିଆର ବୃହତ୍ତମ ଲୁଣିଆ ହ୍ରଦ ଏବଂ ଭାରତର ପ୍ରଥମ ରାମସାର ସ୍ଥଳ (୧୯୮୧)?',
    options_en: ['Bhitarkanika', 'Chilika Lake', 'Ansupa Lake', 'Tampara Lake'],
    options_or: ['ଭିତରକନିକା', 'ଚିଲିକା ହ୍ରଦ', 'ଅଂଶୁପା ହ୍ରଦ', 'ତାମ୍ପରା ହ୍ରଦ'],
    correct_index: 1,
    explanation_en: 'Chilika Lake (across Puri, Khordha & Ganjam) was designated India’s first Ramsar site in 1981.',
    explanation_or: 'ଚିଲିକା ହ୍ରଦ ୧୯୮୧ ରେ ଭାରତର ପ୍ରଥମ ରାମସାର ସ୍ଥଳ ଭାବେ ଘୋଷିତ ହୋଇଥିଲା।'
  },
  {
    id: 'bk_od_2', tag: 'Indian Polity',
    question_en: 'Which Article of the Indian Constitution provides for State Public Service Commissions such as OPSC?',
    question_or: 'ଭାରତୀୟ ସମ୍ବିଧାନର କେଉଁ ଅନୁଚ୍ଛେଦ OPSC ଭଳି ରାଜ୍ୟ ଲୋକସେବା ଆୟୋଗ ଗଠନର ବ୍ୟବସ୍ଥା କରେ?',
    options_en: ['Article 280', 'Article 315', 'Article 324', 'Article 356'],
    options_or: ['ଅନୁଚ୍ଛେଦ ୨୮୦', 'ଅନୁଚ୍ଛେଦ ୩୧୫', 'ଅନୁଚ୍ଛେଦ ୩୨୪', 'ଅନୁଚ୍ଛେଦ ୩୫୬'],
    correct_index: 1,
    explanation_en: 'Article 315 establishes Public Service Commissions for the Union (UPSC) and each State (OPSC).',
    explanation_or: 'ଅନୁଚ୍ଛେଦ ୩୧୫ କେନ୍ଦ୍ର (UPSC) ଓ ରାଜ୍ୟ (OPSC) ଲୋକସେବା ଆୟୋଗ ଗଠନର ବ୍ୟବସ୍ଥା କରେ।'
  },
  {
    id: 'bk_od_3', tag: 'Odisha GK',
    question_en: 'How many administrative districts does the state of Odisha currently comprise?',
    question_or: 'ଓଡ଼ିଶା ରାଜ୍ୟରେ ବର୍ତ୍ତମାନ ମୋଟ କେତୋଟି ପ୍ରଶାସନିକ ଜିଲ୍ଲା ରହିଛି?',
    options_en: ['24 Districts', '28 Districts', '30 Districts', '33 Districts'],
    options_or: ['୨୪ ଜିଲ୍ଲା', '୨୮ ଜିଲ୍ଲା', '୩୦ ଜିଲ୍ଲା', '୩୩ ଜିଲ୍ଲା'],
    correct_index: 2,
    explanation_en: 'Odisha has 30 districts grouped into 3 Revenue Divisions: Central, Northern, and Southern.',
    explanation_or: 'ଓଡ଼ିଶାରେ ୩ଟି ରାଜସ୍ୱ ଡିଭିଜନ୍ ଅଧୀନରେ ମୋଟ ୩୦ଟି ଜିଲ୍ଲା ରହିଛି।'
  },
  {
    id: 'bk_od_4', tag: 'Odisha Geography',
    question_en: 'Hirakud Dam, one of the longest earthen dams in the world, is built across which river in Odisha?',
    question_or: 'ବିଶ୍ୱର ଅନ୍ୟତମ ଦୀର୍ଘତମ ମାଟି ବନ୍ଧ ହୀରାକୁଦ ଓଡ଼ିଶାର କେଉଁ ନଦୀ ଉପରେ ନିର୍ମିତ?',
    options_en: ['Brahmani', 'Baitarani', 'Mahanadi', 'Subarnarekha'],
    options_or: ['ବ୍ରାହ୍ମଣୀ', 'ବୈତରଣୀ', 'ମହାନଦୀ', 'ସୁବର୍ଣ୍ଣରେଖା'],
    correct_index: 2,
    explanation_en: 'Hirakud Dam is built across the Mahanadi River near Sambalpur, Odisha (inaugurated in 1957).',
    explanation_or: 'ହୀରାକୁଦ ବନ୍ଧ ସମ୍ବଲପୁର ନିକଟରେ ମହାନଦୀ ଉପରେ ନିର୍ମିତ ହୋଇଛି।'
  },
  {
    id: 'bk_od_5', tag: 'Odisha Heritage',
    question_en: 'In which year was the Odia language officially granted "Classical Language" status by the Government of India?',
    question_or: 'ଭାରତ ସରକାରଙ୍କ ଦ୍ୱାରା ଓଡ଼ିଆ ଭାଷାକୁ କେଉଁ ବର୍ଷ "ଶାସ୍ତ୍ରୀୟ ଭାଷା" (Classical Language) ମାନ୍ୟତା ମିଳିଥିଲା?',
    options_en: ['2004', '2008', '2014', '2019'],
    options_or: ['୨୦୦୪', '୨୦୦୮', '୨୦୧୪', '୨୦୧୯'],
    correct_index: 2,
    explanation_en: 'Odia became the 6th Indian language to receive Classical Language status on 20 February 2014.',
    explanation_or: '୨୦ ଫେବୃଆରୀ ୨୦୧୪ ରେ ଓଡ଼ିଆ ଭାରତର ୬ଷ୍ଠ ଶାସ୍ତ୍ରୀୟ ଭାଷା ମାନ୍ୟତା ପାଇଥିଲା।'
  },
  {
    id: 'bk_od_6', tag: 'Odisha History',
    question_en: 'Odisha Day (Utkala Dibasa) is celebrated every year on April 1 to commemorate the formation of Odisha as a separate province in:',
    question_or: 'କେଉଁ ବର୍ଷ ଓଡ଼ିଶା ସ୍ୱତନ୍ତ୍ର ପ୍ରଦେଶ ଭାବେ ଗଠିତ ହୋଇଥିବାରୁ ପ୍ରତିବର୍ଷ ଏପ୍ରିଲ୍ ୧ ରେ ଉତ୍କଳ ଦିବସ ପାଳନ କରାଯାଏ?',
    options_en: ['1912', '1936', '1947', '1950'],
    options_or: ['୧୯୧୨', '୧୯୩୬', '୧୯୪୭', '୧୯୫୦'],
    correct_index: 1,
    explanation_en: 'Odisha became the first linguistic province in India on 1 April 1936.',
    explanation_or: '୧ ଏପ୍ରିଲ୍ ୧୯୩୬ ରେ ଓଡ଼ିଶା ଭାଷାଭିତ୍ତିକ ସ୍ୱତନ୍ତ୍ର ପ୍ରଦେଶ ଭାବେ ଗଠିତ ହୋଇଥିଲା।'
  },
  {
    id: 'bk_od_7', tag: 'Quantitative Aptitude',
    question_en: 'If a candidate increases study speed by 25%, by what percentage does the time needed to finish the same syllabus decrease?',
    question_or: 'ଯଦି ଜଣେ ପରୀକ୍ଷାର୍ଥୀ ଅଧ୍ୟୟନ ଗତି ୨୫% ବୃଦ୍ଧି କରନ୍ତି, ତେବେ ସମାନ ସିଲାବସ୍ ଶେଷ କରିବାକୁ ସମୟ କେତେ % କମିବ?',
    options_en: ['15%', '20%', '25%', '30%'],
    options_or: ['୧୫%', '୨୦%', '୨୫%', '୩୦%'],
    correct_index: 1,
    explanation_en: 'Time is inversely proportional to speed: 1 / 1.25 = 0.80 → 20% reduction in time.',
    explanation_or: 'ସମୟ ଗତିର ବିପରୀତାନୁପାତୀ: ୧ / ୧.୨୫ = ୦.୮୦, ଅର୍ଥାତ୍ ସମୟ ୨୦% କମିବ।'
  },
  {
    id: 'bk_od_8', tag: 'Indian Polity',
    question_en: 'Which Constitutional Amendment lowered the voting age in India from 21 years to 18 years?',
    question_or: 'କେଉଁ ସମ୍ବିଧାନ ସଂଶୋଧନ ଦ୍ୱାରା ଭାରତରେ ଭୋଟ୍ ଦେବା ବୟସ ୨୧ ରୁ ୧୮ ବର୍ଷକୁ ହ୍ରାସ କରାଯାଇଥିଲା?',
    options_en: ['42nd Amendment', '44th Amendment', '61st Amendment', '73rd Amendment'],
    options_or: ['୪୨ତମ ସଂଶୋଧନ', '୪୪ତମ ସଂଶୋଧନ', '୬୧ତମ ସଂଶୋଧନ', '୭୩ତମ ସଂଶୋଧନ'],
    correct_index: 2,
    explanation_en: 'The 61st Constitutional Amendment Act (1988) amended Article 326 to lower the voting age to 18.',
    explanation_or: '୬୧ତମ ସମ୍ବିଧାନ ସଂଶୋଧନ (୧୯୮୮) ଦ୍ୱାରା ଭୋଟ୍ ଦେବା ବୟସ ୧୮ ବର୍ଷ କରାଯାଇଥିଲା।'
  },
  {
    id: 'bk_od_9', tag: 'Odisha GK',
    question_en: 'Which Odisha district is home to Maa Manikeshwari University (Bhawanipatna) and the Karlapat Wildlife Sanctuary?',
    question_or: 'ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ (ଭବାନୀପାଟଣା) ଏବଂ କାର୍ଲାପାଟ ଅଭୟାରଣ୍ୟ ଓଡ଼ିଶାର କେଉଁ ଜିଲ୍ଲାରେ ଅବସ୍ଥିତ?',
    options_en: ['Koraput', 'Kalahandi', 'Balangir', 'Rayagada'],
    options_or: ['କୋରାପୁଟ', 'କଳାହାଣ୍ଡି', 'ବଲାଙ୍ଗୀର', 'ରାୟଗଡ଼ା'],
    correct_index: 1,
    explanation_en: 'Bhawanipatna is the district headquarters of Kalahandi district, Odisha.',
    explanation_or: 'ଭବାନୀପାଟଣା ଓଡ଼ିଶାର କଳାହାଣ୍ଡି ଜିଲ୍ଲାର ସଦର ମହକୁମା ଅଟେ।'
  },
  {
    id: 'bk_od_10', tag: 'Odisha Heritage',
    question_en: 'The Sun Temple at Konark, a UNESCO World Heritage Site, was built in the 13th century by which Ganga dynasty king?',
    question_or: 'ୟୁନେସ୍କୋ ବିଶ୍ୱ ଐତିହ୍ୟ ସ୍ଥଳ କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ୧୩ଶ ଶତାବ୍ଦୀରେ କେଉଁ ଗଙ୍ଗବଂଶୀ ରାଜାଙ୍କ ଦ୍ୱାରା ନିର୍ମିତ ହୋଇଥିଲା?',
    options_en: ['Anantavarman Chodaganga', 'Narasimhadeva I', 'Kapilendra Deva', 'Kharavela'],
    options_or: ['ଅନନ୍ତବର୍ମନ ଚୋଡ଼ଗଙ୍ଗ', 'ପ୍ରଥମ ନରସିଂହଦେବ', 'କପିଳେନ୍ଦ୍ର ଦେବ', 'ଖାରବେଳ'],
    correct_index: 1,
    explanation_en: 'King Narasimhadeva I of the Eastern Ganga dynasty constructed the Konark Sun Temple around 1250 CE.',
    explanation_or: 'ପୂର୍ବ ଗଙ୍ଗ ବଂଶର ରାଜା ପ୍ରଥମ ନରସିଂହଦେବ ପ୍ରାୟ ୧୨୫୦ ଖ୍ରୀଷ୍ଟାବ୍ଦରେ କୋଣାର୍କ ମନ୍ଦିର ନିର୍ମାଣ କରିଥିଲେ।'
  }
];

function selectSubjectBanks(record) {
  const blob = `${record.title_en || ''} ${record.tags || ''} ${record.organisation_en || ''} ${record.qualification_summary || ''}`.toLowerCase();
  if (/\b(ugc net|nta|jrf|assistant professor)\b/.test(blob)) {
    return [...UGC_NET_RESEARCH_BANK, ...TEACHING_CDP_BANK, ...ODISHA_GK_POLITY_BANK];
  }
  if (/\b(ctet|osstet|otet|oavs|itep|teaching|teacher|b\.?ed|m\.?ed|pedagogy)\b/.test(blob)) {
    return [...TEACHING_CDP_BANK, ...ODISHA_GK_POLITY_BANK, ...UGC_NET_RESEARCH_BANK];
  }
  return [...ODISHA_GK_POLITY_BANK, ...TEACHING_CDP_BANK, ...UGC_NET_RESEARCH_BANK];
}

export function buildArticleMiniQuizPayload(record, kind = 'job', dbExtraMcqs = []) {
  const out = [];
  const seenPrompts = new Set();

  function pushUnique(q) {
    if (!q || !q.question_en || !Array.isArray(q.options_en) || q.options_en.length < 2) return;
    const key = String(q.question_en).trim().toLowerCase().slice(0, 90);
    if (seenPrompts.has(key)) return;
    seenPrompts.add(key);
    out.push({
      id: String(q.id || `q_${out.length + 1}`),
      tag: String(q.tag || 'Practice'),
      question_en: String(q.question_en),
      question_or: String(q.question_or || q.question_en),
      options_en: q.options_en.map(String),
      options_or: Array.isArray(q.options_or) && q.options_or.length === q.options_en.length ? q.options_or.map(String) : q.options_en.map(String),
      correct_index: Number.isFinite(Number(q.correct_index)) ? Number(q.correct_index) : 0,
      explanation_en: String(q.explanation_en || ''),
      explanation_or: String(q.explanation_or || q.explanation_en || '')
    });
  }

  // Priority 1: Custom quiz_json on the record
  if (record && record.quiz_json) {
    try {
      const parsed = typeof record.quiz_json === 'string' ? JSON.parse(record.quiz_json) : record.quiz_json;
      if (Array.isArray(parsed)) parsed.forEach(pushUnique);
    } catch {}
  }

  // Priority 2a: Article-specific verified fact MCQs
  extractFactMcqs(record || {}, kind).forEach(pushUnique);

  // Priority 2b: Optional D1 question bank rows
  if (Array.isArray(dbExtraMcqs)) dbExtraMcqs.forEach(pushUnique);

  // Priority 2c: Matched verified bilingual subject banks up to 25 MCQs
  for (const bq of selectSubjectBanks(record || {})) {
    if (out.length >= 25) break;
    pushUnique(bq);
  }

  return {
    ok: true,
    version: 'v387',
    type: kind,
    slug: String((record && record.slug) || ''),
    title_en: cleanText(record && record.title_en, 160),
    title_or: cleanText(record && record.title_or, 180),
    total: out.length,
    questions: out.slice(0, 25)
  };
}

export async function handlePublicArticleQuizApi(request, env) {
  const url = new URL(request.url);
  const type = String(url.searchParams.get('type') || 'job').trim().toLowerCase() === 'guide' ? 'guide' : 'job';
  const slug = String(url.searchParams.get('slug') || '').trim();
  if (!slug) return json({ ok: false, error: 'Missing slug parameter' }, 400);
  if (!env || !env.DB) return json({ ok: false, error: 'Database unavailable' }, 503);

  let row = null;
  if (type === 'guide') {
    row = await env.DB.prepare(`SELECT * FROM informative_guides WHERE slug = ? AND status = 'published' LIMIT 1`).bind(slug).first().catch(() => null);
  } else {
    row = await env.DB.prepare(`SELECT * FROM job_articles WHERE slug = ? AND is_published = 1 LIMIT 1`).bind(slug).first().catch(() => null);
  }
  if (!row) return json({ ok: false, error: 'Article not found' }, 404);

  const payload = buildArticleMiniQuizPayload(row, type);
  return json(payload, 200, { 'Cache-Control': 'public, max-age=120, s-maxage=600, stale-while-revalidate=120' });
}
