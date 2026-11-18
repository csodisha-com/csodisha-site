/* v156: Early Childhood & Primary Education showcase module (bilingual EN+OR, SVG diagram, ODF/ODS/PDF packs, official portals, 8-Q self-test). */
// 100% CSP compliant: zero inline <style>, style="", <script>, or .innerHTML.

export const EARLY_CHILDHOOD_SHOWCASE_COUNT = 14;

export const EARLY_CHILDHOOD_PORTALS = [
  { name: 'OSEPA (Odisha School Education Programme Authority)', url: 'https://osepa.odisha.gov.in', badge: 'Official State Portal', desc: 'FLN NIPUN Odisha circulars, Class 1–5 textbooks, Kalika/Khelaghar guidelines, and school readiness trackers.' },
  { name: 'SCERT Odisha (TE & SCERT)', url: 'https://scertodisha.nic.in', badge: 'Curriculum & Teacher Ed', desc: 'D.El.Ed / OTET / JT curriculum, Vidya Pravesh modules, and Holistic Progress Card (HPC) formats.' },
  { name: 'DIKSHA Odisha', url: 'https://diksha.gov.in', badge: 'Digital Textbooks & QR', desc: 'Energised Odia & English Class 1–5 textbooks, NIPUN FLN teacher training courses, and audio-visual lessons.' },
  { name: 'NCERT e-Pathshala & Jaadui Pitara', url: 'https://epathshala.nic.in', badge: 'National Play & Print Kits', desc: 'NCF-FS 2022 foundational play-based learning kits, Balvatika workbooks, and multilingual storybooks.' },
  { name: 'Odisha Adarsha Vidyalaya Sangathan (OAVS)', url: 'https://oav.edu.in', badge: 'Class 6 Entry Bridge', desc: 'OAVS Class 6 entrance syllabus, primary bridge competencies, and 314 block-level model school portal.' },
  { name: 'Women & Child Development (WCD) Odisha', url: 'https://wcd.odisha.gov.in', badge: 'Anganwadi & ECCE', desc: 'ICDS Anganwadi centres, Mukhyamantri Sampoorna Pushti Yojana (MSPY), and Balvatika convergence.' },
  { name: 'NIPUN Bharat Mission (MoE)', url: 'https://nipunbharat.education.gov.in', badge: 'National FLN Lakshya', desc: 'National guidelines for Foundational Literacy and Numeracy (Ages 3–8) and Lakshya competency benchmarks.' }
];

export const EARLY_CHILDHOOD_MCQS = [
  {
    q: '1. Under NEP 2020 (5+3+3+4), which age group and classes constitute the Foundational Stage?',
    opts: ['A) Ages 6–11 (Classes 1–5)', 'B) Ages 3–8 (3 yrs Anganwadi/Balvatika + Classes 1–2)', 'C) Ages 3–6 (Pre-primary only)', 'D) Ages 5–10 (Balvatika to Class 4)'],
    ans: 'B) Ages 3–8 (3 yrs Anganwadi/Balvatika + Classes 1–2)',
    exp: 'NEP 2020 integrates 3 years of ECCE/Balvatika (ages 3–6) with Classes 1 and 2 (ages 6–8) into a single 5-year Foundational Stage.'
  },
  {
    q: '2. What is the 3-month play-based school preparation module introduced for Class 1 entrants under NIPUN Bharat / Odisha?',
    opts: ['A) Kalika', 'B) Vidya Pravesh', 'C) Ujjwal', 'D) Utthan'],
    ans: 'B) Vidya Pravesh',
    exp: 'Vidya Pravesh (ବିଦ୍ୟା ପ୍ରବେଶ) is a 3-month play-based school readiness module for children entering Class 1.'
  },
  {
    q: '3. Under NIPUN Odisha Lakshya for Class 3, what is the expected reading fluency benchmark in Odia/mother tongue?',
    opts: ['A) 15–20 words per minute', 'B) 30 words per minute', 'C) 60+ words per minute with comprehension', 'D) 120 words per minute'],
    ans: 'C) 60+ words per minute with comprehension',
    exp: 'By the end of Class 3, NIPUN Lakshya targets reading at least 60 words per minute accurately with comprehension (Class 2 targets 45–60 WPM).'
  },
  {
    q: '4. Which Odisha initiative provides play-based learning kits (storybooks, puzzles, puppets) for Ages 3–8 aligned with NCF-FS 2022?',
    opts: ['A) Jaadui Pitara', 'B) Pathani Samanta Kit', 'C) Mo School Lab', 'D) e-Gyan'],
    ans: 'A) Jaadui Pitara',
    exp: 'Jaadui Pitara (Magic Box) is NCERT/OSEPA’s play-based learning-teaching material kit for Balvatika and Classes 1–2.'
  },
  {
    q: '5. According to Jean Piaget, children aged 2 to 7 years are in which stage of cognitive development?',
    opts: ['A) Sensorimotor Stage', 'B) Preoperational Stage', 'C) Concrete Operational Stage', 'D) Formal Operational Stage'],
    ans: 'B) Preoperational Stage',
    exp: 'Piaget’s Preoperational Stage (ages 2–7) is marked by symbolic play, language explosion, and egocentrism.'
  },
  {
    q: '6. Who proposed the "Zone of Proximal Development (ZPD)" and Scaffolding in early childhood learning?',
    opts: ['A) Maria Montessori', 'B) Friedrich Froebel', 'C) Lev Vygotsky', 'D) B.F. Skinner'],
    ans: 'C) Lev Vygotsky',
    exp: 'Lev Vygotsky’s sociocultural theory highlights ZPD—what a learner can do with guided support (scaffolding) from a teacher or peer.'
  },
  {
    q: '7. Which Odisha scheme converges maternal & child nutrition (ages 0–6) at Anganwadi Centres with ECCE school readiness?',
    opts: ['A) Mukhyamantri Sampoorna Pushti Yojana (MSPY)', 'B) KALIA Yojana', 'C) BSKY', 'D) Subhadra Yojana'],
    ans: 'A) Mukhyamantri Sampoorna Pushti Yojana (MSPY)',
    exp: 'MSPY (WCD Odisha) strengthens supplementary nutrition for pregnant women, adolescent girls, and children under 6 alongside ICDS ECCE.'
  },
  {
    q: '8. Under NEP 2020, what replaces traditional marks-only report cards in the Foundational Stage?',
    opts: ['A) Annual Ranking Ledger', 'B) Holistic Progress Card (HPC)', 'C) OMR Merit Sheet', 'D) Cumulative Attendance Slip'],
    ans: 'B) Holistic Progress Card (HPC)',
    exp: 'The 360-degree Holistic Progress Card (HPC) tracks cognitive, socio-emotional, physical, and foundational literacy/numeracy growth.'
  }
];

export const EARLY_CHILDHOOD_SEED_ITEMS = [
  {
    id: 'sli_ec_nep_nipun_guide',
    folder_id: 'slf_ec_nipun',
    title: 'NEP 2020 Foundational Stage & NIPUN Odisha FLN Complete Guide',
    title_or: 'NEP 2020 ମୌଳିକ ସ୍ତର ଓ ନିପୁଣ ଓଡ଼ିଶା FLN ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍',
    slug: 'nep-2020-foundational-stage-nipun-odisha-guide',
    resource_type: 'notes',
    board_or_exam: 'OSEPA / NIPUN Odisha',
    subject_tag: 'Foundational Literacy & Numeracy',
    language_parity: 'EN+OR',
    summary: 'Complete bilingual guide to NEP 2020 (5+3+3+4), Balvatika 1–3, Vidya Pravesh, and Class 1–3 NIPUN Odisha Lakshya targets.',
    pdf_url: '/assets/downloads/study/early-childhood-primary-education-complete-guide.odt',
    cover_image_url: '/assets/img/study/nep-nipun-foundational-stage.svg',
    is_featured: 1
  },
  {
    id: 'sli_ec_fln_checklist',
    folder_id: 'slf_ec_fln_lit',
    title: 'NIPUN Odisha FLN Competency Checklist (Class 1–3) — ODS Pack',
    title_or: 'ନିପୁଣ ଓଡ଼ିଶା FLN ଦକ୍ଷତା ତାଲିକା (ଶ୍ରେଣୀ ୧–୩)',
    slug: 'nipun-odisha-fln-competency-checklist',
    resource_type: 'worksheet',
    board_or_exam: 'OSEPA / SCERT Odisha',
    subject_tag: 'Oral Language, Reading & Numeracy',
    language_parity: 'EN+OR',
    summary: 'Downloadable OpenDocument Spreadsheet (.ods) tracking Balvatika, Class 1, Class 2, and Class 3 literacy & numeracy Lakshyas.',
    pdf_url: '/assets/downloads/study/nipun-odisha-fln-checklist.ods',
    cover_image_url: '/assets/img/study/nep-nipun-foundational-stage.svg',
    is_featured: 1
  },
  {
    id: 'sli_ec_osepa_textbooks',
    folder_id: 'slf_ec_osepa',
    title: 'OSEPA Class 1–5 Curriculum, Textbooks & OAVS Bridge Compendium',
    title_or: 'OSEPA ଶ୍ରେଣୀ ୧–୫ ପାଠ୍ୟପୁସ୍ତକ ଓ OAVS ପ୍ରବେଶ ସାରାଂଶ',
    slug: 'osepa-class-1-5-curriculum-oavs-bridge',
    resource_type: 'syllabus',
    board_or_exam: 'OSEPA / OAVS',
    subject_tag: 'Odia, English, Ganita, Paribesh Vigyan',
    language_parity: 'EN+OR',
    summary: 'Subject-wise breakdown of Odia Sahitya, English, Ganita, Paribesh Vigyan, Jaadui Pitara, Kalika, Khelaghar, and OAVS Class 6 bridge.',
    pdf_url: '/assets/downloads/study/early-childhood-primary-print-pack.html',
    cover_image_url: '/assets/img/study/nep-nipun-foundational-stage.svg',
    is_featured: 1
  },
  {
    id: 'sli_ec_playgroup_ecce',
    folder_id: 'slf_ec_playgroup',
    title: 'Early Childhood, Playgroup & Anganwadi Balvatika Pedagogy Notes',
    title_or: 'ପ୍ରାକ୍-ଶୈଶବ ଶିକ୍ଷା, ଅଙ୍ଗନବାଡ଼ି ଓ ବାଲବାଟିକା ଶିକ୍ଷାଦାନ ନୋଟ୍',
    slug: 'early-childhood-playgroup-balvatika-pedagogy',
    resource_type: 'notes',
    board_or_exam: 'WCD Odisha / ICDS / SCERT',
    subject_tag: 'ECCE & Balvatika',
    language_parity: 'EN+OR',
    summary: 'Play-way pedagogy (Montessori, Froebel), MSPY nutrition convergence, and Holistic Progress Card (HPC) assessment for ages 3–6.',
    pdf_url: '/assets/downloads/study/early-childhood-primary-education-complete-guide.odt',
    cover_image_url: '/assets/img/study/nep-nipun-foundational-stage.svg',
    is_featured: 0
  },
  {
    id: 'sli_ec_otet_jt_notes',
    folder_id: 'slf_ec_teacher_notes',
    title: 'ECCE & Primary Teacher Exam Notes (OTET / JT / Anganwadi Supervisor)',
    title_or: 'OTET / କନିଷ୍ଠ ଶିକ୍ଷକ (JT) ଓ ଅଙ୍ଗନବାଡ଼ି ସୁପରଭାଇଜର ପରୀକ୍ଷା ନୋଟ୍',
    slug: 'ecce-primary-teacher-otet-jt-exam-notes',
    resource_type: 'pyq',
    board_or_exam: 'OTET / OSEPA JT / OSSSC',
    subject_tag: 'Child Development & Pedagogy',
    language_parity: 'EN+OR',
    summary: 'High-yield Child Development & Pedagogy notes (Piaget, Vygotsky, RPwD CWSN inclusion) plus 8 exam-oriented MCQs with explanations.',
    pdf_url: '/assets/downloads/study/early-childhood-primary-print-pack.html',
    cover_image_url: '/assets/img/study/nep-nipun-foundational-stage.svg',
    is_featured: 1
  }
];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderEarlyChildhoodShowcaseHtml(folderSlug = '', folderName = '') {
  const focusLabel = folderName && folderSlug !== 'early-childhood-primary-education'
    ? `Focused Topic View: ${folderName}`
    : 'Complete Module Guide: Early Childhood & Primary Education (Ages 3–11 · Balvatika to Class 5)';

  return `
    <section class="cso-sl-pub-section" id="cso-ec-overview">
      <div class="cso-sl-pub-section-head">
        <h2>${esc(focusLabel)}</h2>
        <span class="cso-sl-pub-muted">Bilingual English + ଓଡ଼ିଆ · Aligned with NEP 2020, OSEPA, SCERT Odisha &amp; OTET/JT</span>
      </div>

      <figure class="cso-sl-figure">
        <img src="/assets/img/study/nep-nipun-foundational-stage.svg" alt="NEP 2020 Foundational Stage (5+3+3+4) and NIPUN Odisha FLN Pillars Diagram" loading="lazy">
        <figcaption>
          <span><strong>Infographic:</strong> NEP 2020 Foundational Stage (Ages 3–8: Balvatika 1–3 → Vidya Pravesh → Class 1–2) &amp; NIPUN Odisha 4 FLN Pillars.</span>
          <a class="cso-sl-pub-btn-secondary" href="/assets/img/study/nep-nipun-foundational-stage.svg" target="_blank" rel="noopener noreferrer">Open Full-Size Diagram ↗</a>
        </figcaption>
      </figure>

      <div class="cso-sl-pack-bar" role="region" aria-label="Downloadable Study Packs">
        <a class="cso-sl-pub-btn-primary" href="/assets/downloads/study/early-childhood-primary-education-complete-guide.odt" download>Download Complete Guide (ODF .odt)</a>
        <a class="cso-sl-pub-btn-secondary" href="/assets/downloads/study/nipun-odisha-fln-checklist.ods" download>Download FLN Checklist (.ods)</a>
        <a class="cso-sl-pub-btn-secondary" href="/assets/downloads/study/early-childhood-primary-print-pack.html" target="_blank" rel="noopener noreferrer">Print / Save as PDF Pack ↗</a>
      </div>
    </section>

    <article class="cso-schemes-panel" id="cso-ec-unit-1">
      <h2>Unit 1 — NEP 2020 Foundational Stage &amp; NIPUN Odisha (FLN)</h2>
      <p>The National Education Policy (NEP) 2020 replaces the 10+2 structure with the <strong>5+3+3+4 curricular framework</strong>. The first 5 years form the <strong>Foundational Stage (Ages 3–8)</strong>: 3 years of Anganwadi / Pre-school (<em>Balvatika 1–3</em>) plus Classes 1 and 2, culminating in Grade 3 <strong>NIPUN Odisha</strong> proficiency.</p>
      <p><strong>ଓଡ଼ିଆ ସାରାଂଶ:</strong> ଜାତୀୟ ଶିକ୍ଷା ନୀତି ୨୦୨୦ ଅନୁଯାୟୀ ୩ ରୁ ୮ ବର୍ଷ ବୟସ ପର୍ଯ୍ୟନ୍ତ ‘ମୌଳିକ ସ୍ତର’ (Foundational Stage) ଅନ୍ତର୍ଭୁକ୍ତ। ନିପୁଣ ଓଡ଼ିଶା ମିଶନର ଲକ୍ଷ୍ୟ ହେଉଛି ୩ୟ ଶ୍ରେଣୀ ସୁଦ୍ଧା ପ୍ରତ୍ୟେକ ଶିଶୁ ମୌଳିକ ସାକ୍ଷରତା ଓ ସଂଖ୍ୟାଜ୍ଞାନ (FLN) ହାସଲ କରିବା।</p>
      <div class="cso-ssr-facts">
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Oral Language (କଥନ)</div><div class="cso-ssr-fact-v">Mother-tongue Odia &amp; 21 tribal MLE languages; storytelling &amp; phonological play.</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Reading Fluency (ପଠନ)</div><div class="cso-ssr-fact-v">Class 2: 45–60 WPM; Class 3 Lakshya: 60+ words/min with comprehension.</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Writing (ଲିଖନ)</div><div class="cso-ssr-fact-v">Odia Varnamala, Matras, simple meaningful sentences &amp; creative expression.</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Numeracy (ଗଣିତ)</div><div class="cso-ssr-fact-v">Pre-number concepts, place value up to 999, addition, subtraction &amp; shapes.</div></div>
      </div>
      <p><strong>Vidya Pravesh (ବିଦ୍ୟା ପ୍ରବେଶ):</strong> A mandatory 3-month play-based school preparation module for Class 1 entrants to bridge home/Anganwadi learning into formal primary school.</p>
    </article>

    <article class="cso-schemes-panel" id="cso-ec-unit-2">
      <h2>Unit 2 — OSEPA Class 1–5 Curriculum, Textbooks &amp; OAVS Primary Bridge</h2>
      <p>Odisha School Education Programme Authority (<strong>OSEPA</strong>) and <strong>TE &amp; SCERT Odisha</strong> design the primary curriculum for Classes 1–5 across government, aided, and Odisha Adarsha Vidyalaya (OAVS) feeder schools.</p>
      <ul class="cso-schemes-checklist">
        <li><strong>Odia Sahitya (ଓଡ଼ିଆ ସାହିତ୍ୟ):</strong> <em>Sahitya Kusuma</em> / <em>Mo Bahi</em> series focusing on Varnamala, rhymes, folk stories, and reading comprehension.</li>
        <li><strong>English:</strong> Functional vocabulary, phonics, picture reading, and conversational sentences (Classes 1–5).</li>
        <li><strong>Mathematics (ଗଣିତ):</strong> <em>Ganita Khela</em> / <em>Ganita</em> — number sense, four basic operations, fractions, measurement, and geometry basics.</li>
        <li><strong>Environmental Studies (ପରିବେଶ ବିଜ୍ଞାନ):</strong> Nature, local Odisha geography, hygiene, community helpers, and nutrition (Classes 3–5).</li>
        <li><strong>Play &amp; Remedial Kits:</strong> <em>Jaadui Pitara</em> (magic box of toys, puppets, flashcards), <em>Kalika</em>, and <em>Khelaghar</em> activity workbooks.</li>
        <li><strong>OAVS Class 6 Entry Bridge:</strong> Class 5 mastery in Odia, English, Mathematics, and EVS directly prepares students for the <strong>Odisha Adarsha Vidyalaya (OAVS)</strong> Class 6 entrance test.</li>
      </ul>
    </article>

    <article class="cso-schemes-panel" id="cso-ec-unit-3">
      <h2>Unit 3 — ECCE, Anganwadi &amp; Teacher Exam Notes (OTET / JT / Supervisor)</h2>
      <p>High-yield pedagogy and policy notes for <strong>OTET Paper-I</strong>, <strong>OSEPA Junior Teacher (JT)</strong>, and <strong>OSSSC ICDS Anganwadi Supervisor</strong> aspirants:</p>
      <div class="cso-ssr-facts">
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Jean Piaget</div><div class="cso-ssr-fact-v">Sensorimotor (0–2 yrs) &amp; Preoperational Stage (2–7 yrs): symbolic play, animism, egocentrism.</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Lev Vygotsky</div><div class="cso-ssr-fact-v">Zone of Proximal Development (ZPD), Scaffolding &amp; mother-tongue social interaction.</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Montessori &amp; Froebel</div><div class="cso-ssr-fact-v">Sensory apparatus, self-directed learning, Kindergarten ("children's garden") &amp; play-way gifts.</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Inclusive &amp; Nutrition Link</div><div class="cso-ssr-fact-v">RPwD Act 2016 CWSN inclusion, ICDS / Mukhyamantri Sampoorna Pushti Yojana (MSPY) &amp; Holistic Progress Card (HPC).</div></div>
      </div>
    </article>

    <section class="cso-schemes-panel" id="cso-ec-unit-4">
      <div class="cso-sl-pub-section-head">
        <h2>Unit 4 — Practice &amp; Self-Test Capsule (8 Exam MCQs)</h2>
        <button type="button" class="cso-sl-pub-btn-secondary cso-sl-selftest-toggle" aria-pressed="false">Hide Answers (Self-Test Mode)</button>
      </div>
      <div class="cso-sl-mcq-list">
        ${EARLY_CHILDHOOD_MCQS.map((m) => `
          <div class="cso-sl-mcq-card">
            <div class="cso-sl-mcq-q">${esc(m.q)}</div>
            <ul class="cso-sl-mcq-opts">
              ${m.opts.map((o) => `<li>${esc(o)}</li>`).join('')}
            </ul>
            <div class="cso-sl-mcq-ans">
              <strong>Answer:</strong> ${esc(m.ans)} — ${esc(m.exp)}
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="cso-schemes-panel" id="cso-ec-portals">
      <h2>Verified Official Portals (Odisha &amp; National)</h2>
      <div class="cso-sl-pub-grid">
        ${EARLY_CHILDHOOD_PORTALS.map((p) => `
          <a class="cso-sl-pub-dir-card" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
            <div class="cso-sl-pub-dir-card-top">
              <span class="cso-sl-pub-dir-title">${esc(p.name)}</span>
              <span class="cso-sl-pub-badge-soft">${esc(p.badge)}</span>
            </div>
            <p class="cso-sl-pub-dir-desc">${esc(p.desc)}</p>
            <div class="cso-sl-pub-dir-meta">
              <span class="cso-sl-pub-count-pill">Visit Official Portal ↗</span>
            </div>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}
