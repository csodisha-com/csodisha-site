/* v157: 4-level hierarchical Early Childhood & Primary Education Learning Studio (Stage -> Board -> Class -> Rich Class Content). */
// 100% CSP compliant: zero inline <style>, style="", <script>, or .innerHTML.

export const EARLY_CHILDHOOD_SHOWCASE_COUNT = 14;
export const EC_BASE = '/study-library/early-childhood-primary-education';

export const EARLY_CHILDHOOD_STAGES = [
  {
    slug: 'early-childhood',
    num: '1',
    title: 'Early Childhood Education',
    titleOr: 'ପ୍ରାକ୍-ଶୈଶବ ଶିକ୍ଷା',
    ages: 'Ages 3–6 · Playgroup, Nursery, LKG & UKG / Balvatika 1–3',
    highlights: 'Play-based Nua Arunima, Jaadui Pitara, Vidya Pravesh, sensory & motor readiness, and Odia/English phonics.',
    countLabel: '4 Boards · 4 Classes · Visual Flashcards',
    cta: 'Explore Boards →',
    href: `${EC_BASE}/early-childhood/`
  },
  {
    slug: 'primary-education',
    num: '2',
    title: 'Primary Education',
    titleOr: 'ପ୍ରାଥମିକ ଶିକ୍ଷା',
    ages: 'Ages 6–11 · Class 1 to Class 5',
    highlights: 'OSEPA, CBSE NCERT & ICSE textbooks, NIPUN Odisha FLN Lakshya, Environmental Studies & OAVS Class 6 bridge.',
    countLabel: '4 Boards · 5 Classes · Books & Self-Tests',
    cta: 'Explore Boards →',
    href: `${EC_BASE}/primary-education/`
  },
  {
    slug: 'ecce-pedagogy',
    num: '3',
    title: 'ECCE Pedagogy & Parent/Teacher Guides',
    titleOr: 'ଶିକ୍ଷକ ଓ ଅଭିଭାବକ ମାର୍ଗଦର୍ଶିକା',
    ages: 'Educators, Anganwadi Workers & Parents',
    highlights: 'NIPUN Odisha FLN framework, Piaget/Vygotsky OTET & JT notes, Holistic Progress Card (HPC), and zero-cost home activities.',
    countLabel: '3 Curated Guides · ODF/ODS Packs',
    cta: 'Explore Guides →',
    href: `${EC_BASE}/ecce-pedagogy/`
  }
];

export const EARLY_CHILDHOOD_BOARDS = [
  {
    slug: 'odisha-board',
    title: 'Odisha State Board (OSEPA / SCERT / WCD Nua Arunima)',
    shortTitle: 'Odisha State Board',
    medium: 'Odia & English Medium (plus 21 Tribal MLE)',
    assessment: 'Holistic Progress Card (HPC) · Formative Activity Rubrics',
    portalName: 'OSEPA & SCERT Odisha',
    portalUrl: 'https://osepa.odisha.gov.in',
    summary: 'Official Odisha School Education Programme Authority (OSEPA), TE & SCERT, and WCD Nua Arunima curriculum.'
  },
  {
    slug: 'cbse',
    title: 'CBSE (NCERT / Jaadui Pitara / NCF-FS & NCF-SE)',
    shortTitle: 'CBSE (NCERT)',
    medium: 'English & Hindi / Bilingual',
    assessment: 'Holistic Progress Card (HPC) · Competency-Based NCF-FS',
    portalName: 'NCERT e-Pathshala & Jaadui Pitara',
    portalUrl: 'https://jaaduipitara.ncert.gov.in',
    summary: 'NCERT NCF-FS 2022 & NCF-SE 2023 textbooks (Sarangi, Mridang, Joyful Mathematics, Our Wondrous World).'
  },
  {
    slug: 'icse',
    title: 'ICSE (CISCE Pre-Primary & Primary Curriculum)',
    shortTitle: 'ICSE (CISCE)',
    medium: 'English Medium (with Second Language Odia)',
    assessment: 'Continuous Developmental Observation & Portfolio',
    portalName: 'DIKSHA & CISCE Reference Hub',
    portalUrl: 'https://diksha.gov.in',
    summary: 'CISCE structured phonics, mental mathematics, environmental awareness, and creative expression for Ages 3–11.'
  },
  {
    slug: 'montessori-anganwadi',
    title: 'Montessori, Anganwadi (ICDS) & Other Boards',
    shortTitle: 'Montessori & Anganwadi (ICDS)',
    medium: 'Mother-Tongue Odia / Play-Way & Sensory',
    assessment: 'Growth & Milestone Checklist · MSPY Nutrition Convergence',
    portalName: 'WCD Odisha (ICDS & Anganwadi)',
    portalUrl: 'https://wcd.odisha.gov.in',
    summary: 'WCD Odisha Anganwadi Balvatika (Nua Arunima), Montessori sensory apparatus, and Froebel play-way pedagogy.'
  }
];

export const EARLY_CHILDHOOD_CLASSES = {
  'early-childhood': [
    { slug: 'playgroup', title: 'Playgroup (Ages 2.5–3.5)', titleOr: 'ପ୍ଲେ-ଗ୍ରୁପ୍', age: '2.5–3.5 yrs', domains: 'Sensory Play · Motor Skills · Oral Rhymes · MSPY Nutrition', nep: 'Pre-Balvatika / Anganwadi' },
    { slug: 'nursery', title: 'Nursery / Balvatika 1 (Ages 3–4)', titleOr: 'ନର୍ସରୀ / ବାଲବାଟିକା-୧', age: '3–4 yrs', domains: 'Odia & English Sounds · Pre-Number Sorting · Art & Story', nep: 'Balvatika 1' },
    { slug: 'lkg', title: 'LKG / Balvatika 2 (Ages 4–5)', titleOr: 'LKG / ବାଲବାଟିକା-୨', age: '4–5 yrs', domains: 'Varnamala Recognition · Counting 1–20 · My Family & Nature', nep: 'Balvatika 2' },
    { slug: 'ukg', title: 'UKG / Balvatika 3 (Ages 5–6)', titleOr: 'UKG / ବାଲବାଟିକା-୩', age: '5–6 yrs', domains: 'Matras & 3-Letter Words · Numbers 1–50 · Vidya Pravesh Bridge', nep: 'Balvatika 3' }
  ],
  'primary-education': [
    { slug: 'class-1', title: 'Class 1 (Ages 6–7)', titleOr: 'ପ୍ରଥମ ଶ୍ରେଣୀ', age: '6–7 yrs', domains: 'Odia · English · Ganita (1–99) · Vidya Pravesh · Art', nep: 'Foundational Year 4' },
    { slug: 'class-2', title: 'Class 2 (Ages 7–8)', titleOr: 'ଦ୍ୱିତୀୟ ଶ୍ରେଣୀ', age: '7–8 yrs', domains: 'Odia Reading (45–60 WPM) · English · Ganita (Add/Sub) · EVS', nep: 'Foundational Year 5' },
    { slug: 'class-3', title: 'Class 3 (Ages 8–9)', titleOr: 'ତୃତୀୟ ଶ୍ରେଣୀ', age: '8–9 yrs', domains: 'NIPUN Lakshya · Odia · English · Ganita (999) · Paribesh Vigyan', nep: 'Preparatory Year 1' },
    { slug: 'class-4', title: 'Class 4 (Ages 9–10)', titleOr: 'ଚତୁର୍ଥ ଶ୍ରେଣୀ', age: '9–10 yrs', domains: 'Odia Sahitya · English Grammar · Multiplication/Fractions · Odisha EVS', nep: 'Preparatory Year 2' },
    { slug: 'class-5', title: 'Class 5 (Ages 10–11)', titleOr: 'ପଞ୍ଚମ ଶ୍ରେଣୀ', age: '10–11 yrs', domains: 'OAVS Class 6 Entry Bridge · Odia · English · Ganita · Paribesh Vigyan', nep: 'Preparatory Year 3' }
  ]
};

export const ECCE_GUIDES = [
  { slug: 'nipun-odisha-fln', title: 'NIPUN Odisha & FLN Framework (Balvatika to Class 3)', titleOr: 'ନିପୁଣ ଓଡ଼ିଶା ଓ FLN ଢାଞ୍ଚା', desc: 'Oral Language, Reading Fluency (60+ WPM), Writing, and Numeracy (999) Lakshya targets plus Vidya Pravesh.', domain: 'odia' },
  { slug: 'child-development-teacher-notes', title: 'Child Development & Teacher Exam Notes (OTET / JT / Anganwadi)', titleOr: 'OTET / JT ଓ ଅଙ୍ଗନବାଡ଼ି ପରୀକ୍ଷା ନୋଟ୍', desc: 'Piaget, Vygotsky ZPD, Montessori, Froebel, RPwD CWSN inclusion, and Holistic Progress Card (HPC) assessment.', domain: 'evs' },
  { slug: 'home-activities-rbsk-health', title: 'Zero-Cost Home Activities & RBSK Child Health / MSPY Nutrition', titleOr: 'ଘରୋଇ ଶିକ୍ଷା ଖେଳ ଓ RBSK ସ୍ୱାସ୍ଥ୍ୟ', desc: 'Weekly zero-cost learning games using household objects, ICDS immunization, and MSPY nutrition convergence.', domain: 'rhymes' }
];

export const EARLY_CHILDHOOD_TEXTBOOKS = [
  { title: 'Nua Arunima (ନୂଆ ଅରୁଣିମା) — ECCE Activity Workbook', board: 'Odisha Board / WCD', medium: 'Odia (with MLE support)', domain: 'odia', desc: 'State WCD & SCERT play-based workbook for Anganwadi & Balvatika 1–3 covering rhymes, picture talk, and motor readiness.', url: 'https://wcd.odisha.gov.in' },
  { title: 'Vidya Pravesh (ବିଦ୍ୟା ପ୍ରବେଶ) — 3-Month School Readiness Module', board: 'Odisha Board & NCERT', medium: 'Odia & English', domain: 'rhymes', desc: 'Play-based bridge module for Class 1 entrants building phonological awareness, pre-number logic, and social-emotional confidence.', url: 'https://osepa.odisha.gov.in' },
  { title: 'Ama Bhasa Ama Sahitya (ଆମ ଭାଷା ଆମ ସାହିତ୍ୟ) — Classes 1–5', board: 'Odisha Board (OSEPA)', medium: 'Odia Medium', domain: 'odia', desc: 'Core OSEPA Odia language textbook series featuring Varnamala, Matras, folk stories, and reading fluency exercises.', url: 'https://osepa.odisha.gov.in' },
  { title: 'My English Book — OSEPA Primary Series (Classes 1–5)', board: 'Odisha Board (OSEPA)', medium: 'English / Bilingual', domain: 'english', desc: 'Phonics, everyday dialogues, picture stories, and functional grammar aligned with SCERT Odisha primary outcomes.', url: 'https://scertodisha.nic.in' },
  { title: 'Ganita Mala / Ganita (ଗଣିତ ମାଳା) — Classes 1–5', board: 'Odisha Board (OSEPA)', medium: 'Odia & English', domain: 'math', desc: 'Hands-on number sense (1–999), place value, four operations, fractions, Odisha currency, and spatial shapes.', url: 'https://osepa.odisha.gov.in' },
  { title: 'Paribesh Vigyan (ପରିବେଶ ବିଜ୍ଞାନ) — Classes 3–5', board: 'Odisha Board (OSEPA)', medium: 'Odia & English', domain: 'evs', desc: 'Nature observation, Odisha flora/fauna, clean water, nutrition, community helpers, and local heritage.', url: 'https://scertodisha.nic.in' },
  { title: 'NCERT Jaadui Pitara (ଯାଦୁଇ ପିଟାରା) & Balvatika Kits', board: 'CBSE (NCERT NCF-FS)', medium: 'Bilingual / Multilingual', domain: 'rhymes', desc: 'Play-based storybooks, flashcards, puppets, and puzzles for ages 3–8 aligned with NCF-FS 2022.', url: 'https://jaaduipitara.ncert.gov.in' },
  { title: 'NCERT Sarangi, Mridang, Joyful Mathematics & Our Wondrous World', board: 'CBSE (NCERT NCF-SE)', medium: 'English & Hindi', domain: 'math', desc: 'New NEP 2020 NCERT textbooks for Classes 1–5 emphasizing joyful inquiry, experiential math, and environmental awareness.', url: 'https://epathshala.nic.in' },
  { title: 'CISCE Primary Guides & OTET / SCERT D.El.Ed. Pedagogy Reference', board: 'ICSE & Teacher Ed', medium: 'English & Odia', domain: 'english', desc: 'Structured phonics, mental math, and child development notes (Piaget, Vygotsky, HPC) for teachers and parents.', url: 'https://diksha.gov.in' }
];

export const EARLY_CHILDHOOD_VISUALS = [
  { src: '/assets/img/study/nep-nipun-foundational-stage.svg', title: 'NEP 2020 Foundational Stage (5+3+3+4) & NIPUN Odisha FLN Pillars', alt: 'NEP 2020 Foundational Stage and NIPUN Odisha FLN Pillars Diagram' },
  { src: '/assets/img/study/panchakosha-5-domains-wheel.svg', title: 'Panchakosha Vikas — NCF-FS 2022 5 Developmental Domains', alt: 'Panchakosha Vikas 5 Developmental Domains Chart' },
  { src: '/assets/img/study/nipun-fln-lakshya-chart.svg', title: 'NIPUN Odisha FLN Lakshya Targets (Balvatika → Class 3)', alt: 'NIPUN Odisha FLN Lakshya Progression Chart' },
  { src: '/assets/img/study/odia-barnamala-number-flashcards.svg', title: 'Odia Barnamala (ଓଡ଼ିଆ ବର୍ଣ୍ଣମାଳା) & Bilingual Number Flashcards', alt: 'Odia Barnamala and Bilingual Number Flashcards' }
];

export const EARLY_CHILDHOOD_PORTALS = [
  { name: 'OSEPA (Odisha School Education Programme Authority)', url: 'https://osepa.odisha.gov.in', badge: 'Official State Portal', desc: 'FLN NIPUN Odisha circulars, Class 1–5 textbooks, Kalika/Khelaghar guidelines, and school readiness trackers.' },
  { name: 'SCERT Odisha (TE & SCERT)', url: 'https://scertodisha.nic.in', badge: 'Curriculum & Teacher Ed', desc: 'D.El.Ed / OTET / JT curriculum, Vidya Pravesh modules, and Holistic Progress Card (HPC) formats.' },
  { name: 'WCD Odisha (ICDS & Nua Arunima)', url: 'https://wcd.odisha.gov.in', badge: 'Anganwadi & ECCE', desc: 'ICDS Anganwadi centres, Nua Arunima workbooks, Mukhyamantri Sampoorna Pushti Yojana (MSPY), and Balvatika.' },
  { name: 'NCERT e-Pathshala', url: 'https://epathshala.nic.in', badge: 'NCERT Textbooks', desc: 'Free digital NCERT textbooks (Sarangi, Mridang, Joyful Mathematics, Our Wondrous World) for Classes 1–5.' },
  { name: 'NCERT Jaadui Pitara Portal', url: 'https://jaaduipitara.ncert.gov.in', badge: 'NCF-FS Play Kits', desc: 'Play-based foundational learning-teaching kits, story cards, rhymes, and teacher manuals for Ages 3–8.' },
  { name: 'DIKSHA Odisha', url: 'https://diksha.gov.in', badge: 'Digital Textbooks & QR', desc: 'Energised Odia & English Class 1–5 textbooks, NIPUN FLN teacher training courses, and audio-visual lessons.' },
  { name: 'Odisha Adarsha Vidyalaya Sangathan (OAVS)', url: 'https://oav.edu.in', badge: 'Class 6 Entry Bridge', desc: 'OAVS Class 6 entrance syllabus, Class 5 bridge competencies, and 314 block-level model school portal.' }
];

export const EARLY_CHILDHOOD_MCQS = [
  { q: '1. Under NEP 2020 (5+3+3+4), which age group and classes constitute the Foundational Stage?', opts: ['A) Ages 6–11 (Classes 1–5)', 'B) Ages 3–8 (3 yrs Anganwadi/Balvatika + Classes 1–2)', 'C) Ages 3–6 (Pre-primary only)', 'D) Ages 5–10 (Balvatika to Class 4)'], ans: 'B) Ages 3–8 (3 yrs Anganwadi/Balvatika + Classes 1–2)', exp: 'NEP 2020 integrates 3 years of ECCE/Balvatika (ages 3–6) with Classes 1 and 2 (ages 6–8) into a single 5-year Foundational Stage.' },
  { q: '2. What is the 3-month play-based school preparation module introduced for Class 1 entrants under NIPUN Bharat / Odisha?', opts: ['A) Kalika', 'B) Vidya Pravesh', 'C) Ujjwal', 'D) Utthan'], ans: 'B) Vidya Pravesh', exp: 'Vidya Pravesh (ବିଦ୍ୟା ପ୍ରବେଶ) is a 3-month play-based school readiness module for children entering Class 1.' },
  { q: '3. Under NIPUN Odisha Lakshya for Class 3, what is the expected reading fluency benchmark in Odia/mother tongue?', opts: ['A) 15–20 words per minute', 'B) 30 words per minute', 'C) 60+ words per minute with comprehension', 'D) 120 words per minute'], ans: 'C) 60+ words per minute with comprehension', exp: 'By the end of Class 3, NIPUN Lakshya targets reading at least 60 words per minute accurately with comprehension.' },
  { q: '4. Which Odisha workbook is designed by WCD & SCERT Odisha for Anganwadi & Balvatika (Ages 3–6)?', opts: ['A) Nua Arunima', 'B) Pathani Samanta Kit', 'C) Mo School Lab', 'D) e-Gyan'], ans: 'A) Nua Arunima', exp: 'Nua Arunima (ନୂଆ ଅରୁଣିମା) is Odisha’s state ECCE activity workbook for Anganwadi and Balvatika children.' },
  { q: '5. According to Jean Piaget, children aged 2 to 7 years are in which stage of cognitive development?', opts: ['A) Sensorimotor Stage', 'B) Preoperational Stage', 'C) Concrete Operational Stage', 'D) Formal Operational Stage'], ans: 'B) Preoperational Stage', exp: 'Piaget’s Preoperational Stage (ages 2–7) is marked by symbolic play, language explosion, and egocentrism.' },
  { q: '6. Who proposed the "Zone of Proximal Development (ZPD)" and Scaffolding in early childhood learning?', opts: ['A) Maria Montessori', 'B) Friedrich Froebel', 'C) Lev Vygotsky', 'D) B.F. Skinner'], ans: 'C) Lev Vygotsky', exp: 'Lev Vygotsky’s sociocultural theory highlights ZPD—what a learner can do with guided support (scaffolding).' },
  { q: '7. Which Odisha scheme converges maternal & child nutrition (ages 0–6) at Anganwadi Centres with ECCE readiness?', opts: ['A) Mukhyamantri Sampoorna Pushti Yojana (MSPY)', 'B) KALIA Yojana', 'C) BSKY', 'D) Subhadra Yojana'], ans: 'A) Mukhyamantri Sampoorna Pushti Yojana (MSPY)', exp: 'MSPY strengthens supplementary nutrition for pregnant women, adolescent girls, and children under 6 alongside ICDS ECCE.' },
  { q: '8. Under NEP 2020, what replaces traditional marks-only report cards in the Foundational Stage?', opts: ['A) Annual Ranking Ledger', 'B) Holistic Progress Card (HPC)', 'C) OMR Merit Sheet', 'D) Cumulative Attendance Slip'], ans: 'B) Holistic Progress Card (HPC)', exp: 'The 360-degree Holistic Progress Card (HPC) tracks cognitive, socio-emotional, physical, and foundational literacy/numeracy growth.' }
];

export const EARLY_CHILDHOOD_SEED_ITEMS = [
  { id: 'sli_ec_nep_nipun_guide', folder_id: 'slf_ec_nipun', stage_slug: 'ecce-pedagogy', board_slug: 'odisha-board', class_slug: 'class-1', title: 'NEP 2020 Foundational Stage & NIPUN Odisha FLN Complete Guide', title_or: 'NEP 2020 ମୌଳିକ ସ୍ତର ଓ ନିପୁଣ ଓଡ଼ିଶା FLN ସମ୍ପୂର୍ଣ୍ଣ ଗାଇଡ୍', slug: 'nep-2020-foundational-stage-nipun-odisha-guide', resource_type: 'notes', board_or_exam: 'OSEPA / NIPUN Odisha', subject_tag: 'Foundational Literacy & Numeracy', language_parity: 'EN+OR', summary: 'Complete bilingual guide to NEP 2020 (5+3+3+4), Balvatika 1–3, Vidya Pravesh, and Class 1–3 NIPUN Odisha Lakshya targets.', pdf_url: '/assets/downloads/study/early-childhood-primary-education-complete-guide.odt', cover_image_url: '/assets/img/study/nep-nipun-foundational-stage.svg', is_featured: 1 },
  { id: 'sli_ec_fln_checklist', folder_id: 'slf_ec_fln_lit', stage_slug: 'primary-education', board_slug: 'odisha-board', class_slug: 'class-2', title: 'NIPUN Odisha FLN Competency Checklist (Class 1–3) — ODS Pack', title_or: 'ନିପୁଣ ଓଡ଼ିଶା FLN ଦକ୍ଷତା ତାଲିକା (ଶ୍ରେଣୀ ୧–୩)', slug: 'nipun-odisha-fln-competency-checklist', resource_type: 'worksheet', board_or_exam: 'OSEPA / SCERT Odisha', subject_tag: 'Oral Language, Reading & Numeracy', language_parity: 'EN+OR', summary: 'Downloadable OpenDocument Spreadsheet (.ods) tracking Balvatika, Class 1, Class 2, and Class 3 literacy & numeracy Lakshyas.', pdf_url: '/assets/downloads/study/nipun-odisha-fln-checklist.ods', cover_image_url: '/assets/img/study/nipun-fln-lakshya-chart.svg', is_featured: 1 },
  { id: 'sli_ec_osepa_textbooks', folder_id: 'slf_ec_osepa', stage_slug: 'primary-education', board_slug: 'odisha-board', class_slug: 'class-5', title: 'OSEPA Class 1–5 Curriculum, Textbooks & OAVS Bridge Compendium', title_or: 'OSEPA ଶ୍ରେଣୀ ୧–୫ ପାଠ୍ୟପୁସ୍ତକ ଓ OAVS ପ୍ରବେଶ ସାରାଂଶ', slug: 'osepa-class-1-5-curriculum-oavs-bridge', resource_type: 'syllabus', board_or_exam: 'OSEPA / OAVS', subject_tag: 'Odia, English, Ganita, Paribesh Vigyan', language_parity: 'EN+OR', summary: 'Subject-wise breakdown of Ama Bhasa Ama Sahitya, My English Book, Ganita Mala, Paribesh Vigyan, and OAVS Class 6 bridge.', pdf_url: '/assets/downloads/study/early-childhood-primary-print-pack.html', cover_image_url: '/assets/img/study/odia-barnamala-number-flashcards.svg', is_featured: 1 },
  { id: 'sli_ec_playgroup_ecce', folder_id: 'slf_ec_playgroup', stage_slug: 'early-childhood', board_slug: 'odisha-board', class_slug: 'nursery', title: 'Early Childhood, Playgroup & Anganwadi Balvatika Pedagogy Notes', title_or: 'ପ୍ରାକ୍-ଶୈଶବ ଶିକ୍ଷା, ଅଙ୍ଗନବାଡ଼ି ଓ ବାଲବାଟିକା ଶିକ୍ଷାଦାନ ନୋଟ୍', slug: 'early-childhood-playgroup-balvatika-pedagogy', resource_type: 'notes', board_or_exam: 'WCD Odisha / ICDS / SCERT', subject_tag: 'ECCE & Balvatika', language_parity: 'EN+OR', summary: 'Nua Arunima workbook, Panchakosha 5 domains, MSPY nutrition convergence, and Holistic Progress Card (HPC) for ages 3–6.', pdf_url: '/assets/downloads/study/early-childhood-primary-education-complete-guide.odt', cover_image_url: '/assets/img/study/panchakosha-5-domains-wheel.svg', is_featured: 0 },
  { id: 'sli_ec_otet_jt_notes', folder_id: 'slf_ec_teacher_notes', stage_slug: 'ecce-pedagogy', board_slug: 'odisha-board', class_slug: 'class-1', title: 'ECCE & Primary Teacher Exam Notes (OTET / JT / Anganwadi Supervisor)', title_or: 'OTET / କନିଷ୍ଠ ଶିକ୍ଷକ (JT) ଓ ଅଙ୍ଗନବାଡ଼ି ସୁପରଭାଇଜର ପରୀକ୍ଷା ନୋଟ୍', slug: 'ecce-primary-teacher-otet-jt-exam-notes', resource_type: 'pyq', board_or_exam: 'OTET / OSEPA JT / OSSSC', subject_tag: 'Child Development & Pedagogy', language_parity: 'EN+OR', summary: 'High-yield Child Development & Pedagogy notes (Piaget, Vygotsky, RPwD CWSN inclusion) plus 8 exam-oriented MCQs.', pdf_url: '/assets/downloads/study/early-childhood-primary-print-pack.html', cover_image_url: '/assets/img/study/nep-nipun-foundational-stage.svg', is_featured: 1 }
];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function findBoard(slug) {
  const s = slug === 'other-boards' ? 'montessori-anganwadi' : slug;
  return EARLY_CHILDHOOD_BOARDS.find((b) => b.slug === s) || EARLY_CHILDHOOD_BOARDS[0];
}

function findClass(stageSlug, classSlug) {
  const list = EARLY_CHILDHOOD_CLASSES[stageSlug] || [];
  return list.find((c) => c.slug === classSlug) || null;
}

export function resolveEarlyChildhoodRoute(segments = []) {
  const s0 = String(segments[0] || '').toLowerCase();
  if (s0 !== 'early-childhood-primary-education' && s0 !== 'early-childhood') return null;
  const sub = segments.slice(1).map((x) => String(x || '').toLowerCase()).filter(Boolean);

  // Level 1: Root
  if (sub.length === 0) {
    return { level: 1, crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }] };
  }

  // Legacy redirects/aliases -> map cleanly to Level 2 or Level 4
  const first = sub[0];
  if (first === 'early-childhood-playgroup-kindergarten') {
    return { level: 2, stage: EARLY_CHILDHOOD_STAGES[0], crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }, { label: EARLY_CHILDHOOD_STAGES[0].title, url: `${EC_BASE}/early-childhood/` }] };
  }
  if (first === 'foundational-learning-primary-classes-1-5' || first === 'class-1-5-osepa') {
    return { level: 3, stage: EARLY_CHILDHOOD_STAGES[1], board: EARLY_CHILDHOOD_BOARDS[0], crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }, { label: EARLY_CHILDHOOD_STAGES[1].title, url: `${EC_BASE}/primary-education/` }, { label: EARLY_CHILDHOOD_BOARDS[0].shortTitle, url: `${EC_BASE}/primary-education/odisha-board/` }] };
  }
  if (first === 'nipun-odisha-fln' || first === 'ecce-primary-teacher-notes') {
    const guide = first === 'nipun-odisha-fln' ? ECCE_GUIDES[0] : ECCE_GUIDES[1];
    return { level: 4, stage: EARLY_CHILDHOOD_STAGES[2], board: EARLY_CHILDHOOD_BOARDS[0], classObj: { slug: guide.slug, title: guide.title, titleOr: guide.titleOr, age: 'Educators & Parents', domains: guide.desc, nep: 'NIPUN / OTET' }, crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }, { label: EARLY_CHILDHOOD_STAGES[2].title, url: `${EC_BASE}/ecce-pedagogy/` }, { label: guide.title, url: `${EC_BASE}/ecce-pedagogy/${guide.slug}/` }] };
  }

  const stage = EARLY_CHILDHOOD_STAGES.find((st) => st.slug === first);
  if (!stage) {
    // Any other legacy slug resolves to Level 4 rich class study hub for that topic
    const pretty = first.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return { level: 4, stage: EARLY_CHILDHOOD_STAGES[1], board: EARLY_CHILDHOOD_BOARDS[0], classObj: { slug: first, title: pretty, titleOr: '', age: 'Ages 3–11', domains: 'Bilingual Notes · Books · Charts · Self-Test', nep: 'Foundational & Primary' }, crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }, { label: pretty, url: `${EC_BASE}/${first}/` }] };
  }

  // Level 2: Stage
  if (sub.length === 1) {
    return { level: 2, stage, crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }, { label: stage.title, url: stage.href }] };
  }

  // Under ecce-pedagogy, sub[1] is a guide -> Level 4
  if (stage.slug === 'ecce-pedagogy') {
    const guide = ECCE_GUIDES.find((g) => g.slug === sub[1]) || ECCE_GUIDES[0];
    return { level: 4, stage, board: EARLY_CHILDHOOD_BOARDS[0], classObj: { slug: guide.slug, title: guide.title, titleOr: guide.titleOr, age: 'Educators, Anganwadi & Parents', domains: guide.desc, nep: 'NIPUN Odisha / OTET / JT' }, crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }, { label: stage.title, url: stage.href }, { label: guide.title, url: `${EC_BASE}/ecce-pedagogy/${guide.slug}/` }] };
  }

  const board = findBoard(sub[1]);
  // Level 3: Stage -> Board
  if (sub.length === 2) {
    return { level: 3, stage, board, crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }, { label: stage.title, url: stage.href }, { label: board.shortTitle, url: `${EC_BASE}/${stage.slug}/${board.slug}/` }] };
  }

  // Level 4: Stage -> Board -> Class
  const classList = EARLY_CHILDHOOD_CLASSES[stage.slug] || EARLY_CHILDHOOD_CLASSES['primary-education'];
  const classObj = findClass(stage.slug, sub[2]) || classList[0];
  return { level: 4, stage, board, classObj, crumbs: [{ label: 'Study Library', url: '/study-library/' }, { label: 'Early Childhood & Primary Education', url: `${EC_BASE}/` }, { label: stage.title, url: stage.href }, { label: board.shortTitle, url: `${EC_BASE}/${stage.slug}/${board.slug}/` }, { label: classObj.title, url: `${EC_BASE}/${stage.slug}/${board.slug}/${classObj.slug}/` }] };
}

export function renderLevel1Html(kickerHtml) {
  const ecClasses = EARLY_CHILDHOOD_CLASSES['early-childhood'];
  const priClasses = EARLY_CHILDHOOD_CLASSES['primary-education'];
  return `
    <section class="cso-sl-pub-hero">
      ${kickerHtml}
      <div class="cso-sl-pub-hero-meta">
        <span class="cso-sl-pub-badge">Study Library · Module 1</span>
        <span class="cso-sl-pub-badge-soft">NEP 2020 · Ages 3–11</span>
      </div>
      <h1>Early Childhood &amp; Primary Education</h1>
      <p class="cso-sl-pub-title-or">ପ୍ରାକ୍-ପ୍ରାଥମିକ ଓ ପ୍ରାଥମିକ ଶିକ୍ଷା (Playgroup to Class 5)</p>
      <p class="cso-sl-pub-hero-desc">Choose your learning stage, school board (Odisha OSEPA, CBSE NCERT, ICSE, or Anganwadi/Montessori), and class to access textbooks, visual diagrams, bilingual notes, downloadable ODF/PDF packs, and self-tests.</p>
      <div class="cso-ec-jump-pills" role="navigation" aria-label="Quick Class Jump">
        ${ecClasses.map((c) => `<a class="cso-ec-jump-pill" href="${EC_BASE}/early-childhood/odisha-board/${c.slug}/">${esc(c.slug.toUpperCase())}</a>`).join('')}
        ${priClasses.map((c) => `<a class="cso-ec-jump-pill" href="${EC_BASE}/primary-education/odisha-board/${c.slug}/">${esc(c.title.split(' (')[0])}</a>`).join('')}
      </div>
    </section>

    <section class="cso-sl-pub-section" id="cso-ec-stages">
      <div class="cso-sl-pub-section-head">
        <h2>Select Learning Stage (3 Pathways)</h2>
        <span class="cso-sl-pub-muted">Step 1 of 3 · Stage → Board → Class</span>
      </div>
      <div class="cso-ec-stage-grid">
        ${EARLY_CHILDHOOD_STAGES.map((st) => `
          <a class="cso-ec-stage-card" href="${esc(st.href)}">
            <div class="cso-sl-pub-hero-meta">
              <span class="cso-sl-pub-badge">Stage ${esc(st.num)}</span>
              <span class="cso-sl-pub-badge-soft">${esc(st.countLabel)}</span>
            </div>
            <h3 class="cso-ec-stage-title">${esc(st.num)}. ${esc(st.title)}</h3>
            <div class="cso-sl-pub-muted">${esc(st.titleOr)} · ${esc(st.ages)}</div>
            <p class="cso-sl-pub-dir-desc">${esc(st.highlights)}</p>
            <span class="cso-ec-stage-cta">${esc(st.cta)}</span>
          </a>
        `).join('')}
      </div>
    </section>

    <section class="cso-schemes-panel" id="cso-ec-nep-table">
      <h2>NEP 2020 Age-to-Class Equivalency Table</h2>
      <div class="cso-ec-table-wrap">
        <table class="cso-ec-table">
          <thead><tr><th>Age Group</th><th>Traditional Class</th><th>NEP 2020 Stage</th><th>Odisha / Board Alignment</th></tr></thead>
          <tbody>
            <tr><td>2.5 – 3.5 yrs</td><td>Playgroup</td><td>Pre-Balvatika / ECCE</td><td>WCD Anganwadi · Nua Arunima</td></tr>
            <tr><td>3 – 4 yrs</td><td>Nursery</td><td>Balvatika 1 (Foundational Yr 1)</td><td>WCD / CBSE / ICSE Pre-Primary</td></tr>
            <tr><td>4 – 5 yrs</td><td>LKG</td><td>Balvatika 2 (Foundational Yr 2)</td><td>Nua Arunima / Jaadui Pitara</td></tr>
            <tr><td>5 – 6 yrs</td><td>UKG</td><td>Balvatika 3 (Foundational Yr 3)</td><td>Vidya Pravesh Readiness</td></tr>
            <tr><td>6 – 8 yrs</td><td>Class 1 &amp; Class 2</td><td>Foundational Stage (Yrs 4–5)</td><td>OSEPA / NCERT Class 1–2 FLN</td></tr>
            <tr><td>8 – 11 yrs</td><td>Class 3, 4 &amp; Class 5</td><td>Preparatory Stage (3 Yrs)</td><td>NIPUN Lakshya → OAVS Class 6 Bridge</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function renderLevel2Html(route, kickerHtml) {
  const { stage } = route;
  if (stage.slug === 'ecce-pedagogy') {
    return `
      <section class="cso-sl-pub-hero">
        ${kickerHtml}
        <div class="cso-sl-pub-hero-meta"><span class="cso-sl-pub-badge">Stage 3 · Educator &amp; Parent Guides</span></div>
        <h1>${esc(stage.title)}</h1>
        <p class="cso-sl-pub-title-or">${esc(stage.titleOr)}</p>
        <p class="cso-sl-pub-hero-desc">${esc(stage.highlights)}</p>
      </section>
      <section class="cso-sl-pub-section">
        <div class="cso-sl-pub-section-head"><h2>Select Guide Topic (3 Curated Guides)</h2></div>
        <div class="cso-ec-stage-grid">
          ${ECCE_GUIDES.map((g) => `
            <a class="cso-ec-stage-card" href="${EC_BASE}/ecce-pedagogy/${esc(g.slug)}/">
              <span class="cso-sl-pub-badge-soft">${esc(g.titleOr)}</span>
              <h3 class="cso-ec-stage-title">${esc(g.title)}</h3>
              <p class="cso-sl-pub-dir-desc">${esc(g.desc)}</p>
              <span class="cso-ec-stage-cta">Open Complete Study Guide →</span>
            </a>
          `).join('')}
        </div>
      </section>
    `;
  }

  return `
    <section class="cso-sl-pub-hero">
      ${kickerHtml}
      <div class="cso-sl-pub-hero-meta">
        <span class="cso-sl-pub-badge">Stage ${esc(stage.num)} · Select Board</span>
        <span class="cso-sl-pub-badge-soft">${esc(stage.ages)}</span>
      </div>
      <h1>${esc(stage.title)}</h1>
      <p class="cso-sl-pub-title-or">${esc(stage.titleOr)}</p>
      <p class="cso-sl-pub-hero-desc">${esc(stage.highlights)} Select a school board or curriculum framework below:</p>
    </section>
    <section class="cso-sl-pub-section">
      <div class="cso-sl-pub-section-head">
        <h2>Select School Board / Curriculum (4 Boards)</h2>
        <span class="cso-sl-pub-muted">Step 2 of 3 · Choose Board</span>
      </div>
      <div class="cso-ec-stage-grid">
        ${EARLY_CHILDHOOD_BOARDS.map((b) => `
          <a class="cso-ec-stage-card" href="${EC_BASE}/${esc(stage.slug)}/${esc(b.slug)}/">
            <div class="cso-sl-pub-hero-meta"><span class="cso-sl-pub-badge-soft">${esc(b.medium)}</span></div>
            <h3 class="cso-ec-stage-title">${esc(b.title)}</h3>
            <p class="cso-sl-pub-dir-desc">${esc(b.summary)}</p>
            <div class="cso-sl-pub-muted">Assessment: ${esc(b.assessment)}</div>
            <span class="cso-ec-stage-cta">Browse Classes →</span>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

export function renderLevel3Html(route, kickerHtml) {
  const { stage, board } = route;
  const classes = EARLY_CHILDHOOD_CLASSES[stage.slug] || EARLY_CHILDHOOD_CLASSES['primary-education'];
  return `
    <section class="cso-sl-pub-hero">
      ${kickerHtml}
      <div class="cso-sl-pub-hero-meta">
        <span class="cso-sl-pub-badge">${esc(stage.title)}</span>
        <span class="cso-sl-pub-badge-soft">${esc(board.medium)}</span>
      </div>
      <h1>${esc(board.title)}</h1>
      <p class="cso-sl-pub-hero-desc">${esc(board.summary)} Assessment: <strong>${esc(board.assessment)}</strong>.</p>
      <div class="cso-sl-pub-stats-row">
        <a class="cso-sl-pub-btn-secondary" href="${esc(board.portalUrl)}" target="_blank" rel="noopener noreferrer">Official Portal: ${esc(board.portalName)} ↗</a>
        <a class="cso-sl-pub-btn-secondary" href="${esc(stage.href)}">← Switch Board</a>
      </div>
    </section>
    <section class="cso-sl-pub-section">
      <div class="cso-sl-pub-section-head">
        <h2>Select Class (${classes.length} Classes)</h2>
        <span class="cso-sl-pub-muted">Step 3 of 3 · Open Complete Class Study Hub</span>
      </div>
      <div class="cso-ec-stage-grid">
        ${classes.map((c) => `
          <a class="cso-ec-stage-card" href="${EC_BASE}/${esc(stage.slug)}/${esc(board.slug)}/${esc(c.slug)}/">
            <div class="cso-sl-pub-hero-meta">
              <span class="cso-sl-pub-badge">${esc(c.age)}</span>
              <span class="cso-sl-pub-badge-soft">${esc(c.nep)}</span>
            </div>
            <h3 class="cso-ec-stage-title">${esc(c.title)}</h3>
            <div class="cso-sl-pub-muted">${esc(c.titleOr)}</div>
            <p class="cso-sl-pub-dir-desc">${esc(c.domains)}</p>
            <div class="cso-sl-pub-muted">Books · Charts · Bilingual EN/ଓଡ଼ିଆ · ODF/PDF · Self-Test</div>
            <span class="cso-ec-stage-cta">Open Class Study Hub →</span>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}

export function renderLevel4Html(route, kickerHtml) {
  const { stage, board, classObj } = route;
  return `
    <section class="cso-sl-pub-hero">
      ${kickerHtml}
      <div class="cso-sl-pub-hero-meta">
        <span class="cso-sl-pub-badge">${esc(board.shortTitle)}</span>
        <span class="cso-sl-pub-badge-soft">${esc(classObj.age)}</span>
        <span class="cso-sl-pub-badge-soft">${esc(classObj.nep)}</span>
      </div>
      <h1>${esc(classObj.title)}</h1>
      ${classObj.titleOr ? `<p class="cso-sl-pub-title-or">${esc(classObj.titleOr)}</p>` : ''}
      <p class="cso-sl-pub-hero-desc">Core Domains: ${esc(classObj.domains)}. Complete bilingual study hub with official textbooks, visual diagrams, weekly activity routine, downloadable ODF/PDF packs, and self-test.</p>
      <div class="cso-sl-pub-stats-row">
        <span class="cso-sl-pub-stat"><strong>${EARLY_CHILDHOOD_SHOWCASE_COUNT}</strong> Curated Guides · Official Portals &amp; ODF/PDF Packs</span>
        <button type="button" class="cso-sl-pub-btn-secondary cso-sl-pub-offline-btn">Save for Offline</button>
      </div>
    </section>

    <section class="cso-sl-pub-section" id="cso-ec-books">
      <div class="cso-sl-pub-section-head">
        <h2>Official Textbooks &amp; Reference Books Shelf</h2>
        <span class="cso-sl-pub-muted">Filter by subject / domain</span>
      </div>
      <div class="cso-ec-filter-bar" role="group" aria-label="Filter textbooks by subject">
        <button type="button" class="cso-ec-filter-pill is-active" data-ec-filter="all" aria-pressed="true">All</button>
        <button type="button" class="cso-ec-filter-pill" data-ec-filter="odia" aria-pressed="false">Odia / Language</button>
        <button type="button" class="cso-ec-filter-pill" data-ec-filter="english" aria-pressed="false">English</button>
        <button type="button" class="cso-ec-filter-pill" data-ec-filter="math" aria-pressed="false">Mathematics / Pre-Numeracy</button>
        <button type="button" class="cso-ec-filter-pill" data-ec-filter="evs" aria-pressed="false">EVS / Awareness</button>
        <button type="button" class="cso-ec-filter-pill" data-ec-filter="rhymes" aria-pressed="false">Rhymes, Motor &amp; Art</button>
      </div>
      <div class="cso-ec-books-grid">
        ${EARLY_CHILDHOOD_TEXTBOOKS.map((bk) => `
          <article class="cso-ec-book-card" data-ec-domain="${esc(bk.domain)}">
            <div class="cso-sl-pub-hero-meta">
              <span class="cso-sl-pub-badge">${esc(bk.board)}</span>
              <span class="cso-sl-pub-badge-soft">${esc(bk.medium)}</span>
            </div>
            <h3>${esc(bk.title)}</h3>
            <p class="cso-sl-pub-dir-desc">${esc(bk.desc)}</p>
            <a class="cso-sl-pub-btn-secondary" href="${esc(bk.url)}" target="_blank" rel="noopener noreferrer">Official Portal / PDF ↗</a>
          </article>
        `).join('')}
      </div>
    </section>

    <section class="cso-sl-pub-section" id="cso-ec-visuals">
      <div class="cso-sl-pub-section-head">
        <h2>Visual Learning Gallery (Diagrams, Charts &amp; Flashcards)</h2>
        <span class="cso-sl-pub-muted">Click any diagram to open full-size</span>
      </div>
      <div class="cso-ec-gallery">
        ${EARLY_CHILDHOOD_VISUALS.map((v) => `
          <figure class="cso-sl-figure">
            <img src="${esc(v.src)}" alt="${esc(v.alt)}" loading="lazy">
            <figcaption>
              <span>${esc(v.title)}</span>
              <a class="cso-sl-pub-btn-secondary" href="${esc(v.src)}" target="_blank" rel="noopener noreferrer">Full View ↗</a>
            </figcaption>
          </figure>
        `).join('')}
      </div>
    </section>

    <article class="cso-schemes-panel" id="cso-ec-notes">
      <h2>Bilingual Chapter Notes, Outcomes &amp; Weekly Home Routine</h2>
      <p><strong>English Summary:</strong> Focuses on NEP 2020 Foundational Stage (<em>Balvatika 1–3 + Class 1–2</em>) &amp; Preparatory bridge (Class 3–5): oral storytelling in mother-tongue Odia, Varnamala &amp; phonics, number sense up to 999, nature observation, and Holistic Progress Card (HPC) continuous observation.</p>
      <p><strong>ଓଡ଼ିଆ ସାରାଂଶ:</strong> ମାତୃଭାଷା ଓଡ଼ିଆରେ କଥନ ଓ ଗଳ୍ପ ପଠନ, ବର୍ଣ୍ଣମାଳା ଓ ମାତ୍ରା ଜ୍ଞାନ, ୧–୯୯୯ ସଂଖ୍ୟାଜ୍ଞାନ, ପରିବେଶ ପର୍ଯ୍ୟବେକ୍ଷଣ ଏବଂ ଖେଳ-ଆଧାରିତ ଶିକ୍ଷା (Nua Arunima / Jaadui Pitara) ମାଧ୍ୟମରେ ଶିଶୁର ସର୍ବାଙ୍ଗୀନ ବିକାଶ।</p>
      <div class="cso-ssr-facts">
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Mon–Tue Routine</div><div class="cso-ssr-fact-v">Oral storytelling, Odia Varnamala / English phonics flashcards &amp; pebble counting games.</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Wed–Thu Routine</div><div class="cso-ssr-fact-v">Sorting leaves/seeds by size &amp; colour (zero-cost home kit), drawing &amp; number writing.</div></div>
        <div class="cso-ssr-fact"><div class="cso-ssr-fact-k">Fri–Sat Routine</div><div class="cso-ssr-fact-v">Role-play, local Odisha folk rhymes, hygiene/nutrition habits (MSPY) &amp; weekly recap.</div></div>
      </div>
    </article>

    <section class="cso-schemes-panel" id="cso-ec-packs">
      <h2>Downloadable Study Packs (ODF / ODS / Print-PDF)</h2>
      <div class="cso-sl-pack-bar" role="region" aria-label="Downloadable Study Packs">
        <a class="cso-sl-pub-btn-primary" href="/assets/downloads/study/early-childhood-primary-education-complete-guide.odt" download>Download Complete Guide (ODF .odt)</a>
        <a class="cso-sl-pub-btn-secondary" href="/assets/downloads/study/nipun-odisha-fln-checklist.ods" download>Download FLN Checklist (.ods)</a>
        <a class="cso-sl-pub-btn-secondary" href="/assets/downloads/study/early-childhood-primary-print-pack.html" target="_blank" rel="noopener noreferrer">Print / Save as PDF Pack ↗</a>
      </div>
    </section>

    <section class="cso-schemes-panel" id="cso-ec-selftest">
      <div class="cso-sl-pub-section-head">
        <h2>Interactive Self-Check Capsule (8 Exam &amp; Concept MCQs)</h2>
        <button type="button" class="cso-sl-pub-btn-secondary cso-sl-selftest-toggle" aria-pressed="false">Hide Answers (Self-Test Mode)</button>
      </div>
      <div class="cso-sl-mcq-list">
        ${EARLY_CHILDHOOD_MCQS.map((m) => `
          <div class="cso-sl-mcq-card">
            <div class="cso-sl-mcq-q">${esc(m.q)}</div>
            <ul class="cso-sl-mcq-opts">${m.opts.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
            <div class="cso-sl-mcq-ans"><strong>Answer:</strong> ${esc(m.ans)} — ${esc(m.exp)}</div>
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
            <div class="cso-sl-pub-dir-meta"><span class="cso-sl-pub-count-pill">Visit Official Portal ↗</span></div>
          </a>
        `).join('')}
      </div>
    </section>
  `;
}
