/**
 * Common Sense Odisha — Interactive Mock Test Series & Exam-Day Countdown Hub (v406)
 * Powers /mock-tests/ with:
 *  - Live IST Exam-Day Countdowns (OAVS, OPSC OAS, OSSC CGL, OSSSC, OTET/OSSTET, UGC NET)
 *  - 3 Timed 25-MCQ Sectional Drills:
 *      1) Odisha GK & Current Affairs (25 MCQs)
 *      2) Teaching Aptitude & Pedagogy / OTET / OSSTET (25 MCQs)
 *      3) Reasoning & Quantitative Aptitude (25 MCQs)
 *  - Negative-Marking Toggle (-0.25 / -0.50 / 0)
 *  - Instant Topic-Wise Accuracy Breakdown & localStorage best-score tracking
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOMockTestsHub = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOMockTestsHub = api;
})(function (win, doc) {
  'use strict';

  var STATS_KEY = 'cso_mock_drill_stats_v1';
  var NEGATIVE_OPTIONS = [
    { value: 0, label: '0 (No Negative — OTET / CTET)' },
    { value: 0.25, label: '−0.25 (OSSSC / OSSC / SSC)' },
    { value: 0.5, label: '−0.50 (Strict / Group-A)' }
  ];

  var EXAM_COUNTDOWNS = [
    { id: 'ugc-net', title: 'UGC NET December 2026', date_iso: '2026-12-31', drill_key: 'teaching-pedagogy', tag: 'NTA · National' },
    { id: 'oavs-2026', title: 'OAVS Teaching CBT 2026–27', date_iso: '2027-01-18', drill_key: 'teaching-pedagogy', tag: 'OAVS · Odisha' },
    { id: 'ossc-cgl', title: 'OSSC Combined Graduate Level (CGL)', date_iso: '2027-02-08', drill_key: 'reasoning-quant', tag: 'OSSC · Odisha' },
    { id: 'opsc-oas', title: 'OPSC OAS Civil Services Prelims', date_iso: '2027-03-14', drill_key: 'odisha-gk', tag: 'OPSC · Group-A' },
    { id: 'osssc-ri', title: 'OSSSC Combined RI / ARI / Amin', date_iso: '2027-02-22', drill_key: 'odisha-gk', tag: 'OSSSC · 30 Districts' },
    { id: 'otet-osstet', title: 'BSE Odisha OTET / OSSTET Cycle', date_iso: '2027-01-28', drill_key: 'teaching-pedagogy', tag: 'BSE Odisha · TET' }
  ];

  function qItem(id, subtopic, q, opts, ans, exp) {
    return { id: id, subtopic: subtopic, q: q, opts: opts, ans: ans, exp: exp };
  }

  var SECTIONAL_DRILLS = [
    {
      key: 'odisha-gk',
      title: 'Odisha GK & Current Affairs',
      title_or: 'ଓଡ଼ିଶା ସାଧାରଣ ଜ୍ଞାନ ଓ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ',
      duration_min: 20,
      default_neg: 0.25,
      badge: 'OPSC · OSSC · OSSSC · OAVS',
      questions: [
        qItem('og1', 'History', 'In which year did the historic Paika Rebellion take place in Khordha under Bakshi Jagabandhu?', ['1803', '1817', '1857', '1866'], 1, 'The Paika Rebellion erupted in 1817 in Khordha against British land revenue policies.'),
        qItem('og2', 'History', 'When was Odisha formed as a separate province on a linguistic basis (Utkala Dibasa)?', ['1 April 1936', '15 August 1947', '26 January 1950', '1 April 1948'], 0, 'Odisha became a separate linguistic province on 1 April 1936.'),
        qItem('og3', 'History', 'Who is revered as "Utkala Gouraba" for pioneering the Odia unification movement and Utkal Sammilani?', ['Gopabandhu Das', 'Madhusudan Das', 'Fakir Mohan Senapati', 'Krushna Chandra Gajapati'], 1, 'Madhusudan Das founded Utkal Sammilani in 1903 and is honored as Utkala Gouraba.'),
        qItem('og4', 'History', 'Which Kalinga ruler\'s achievements are inscribed in the Hathigumpha Inscription at Udayagiri?', ['Ashoka', 'Kharavela', 'Anantavarman Chodaganga', 'Kapilendra Deva'], 1, 'Emperor Kharavela of the Mahameghavahana dynasty authored the 17-line Hathigumpha Inscription.'),
        qItem('og5', 'History', 'Who built the world-famous Sun Temple at Konark in the 13th century?', ['Narasimhadeva I', 'Yayati Kesari', 'Anangabhima Deva III', 'Purushottama Deva'], 0, 'King Narasimhadeva I of the Eastern Ganga dynasty built the Konark Sun Temple around 1250 CE.'),
        qItem('og6', 'Geography', 'Which is the longest river flowing through Odisha?', ['Brahmani', 'Baitarani', 'Mahanadi', 'Subarnarekha'], 2, 'The Mahanadi is Odisha\'s longest river, spanning roughly 494 km within the state.'),
        qItem('og7', 'Geography', 'Deomali, the highest mountain peak of Odisha (1,672 m), is situated in which district?', ['Kalahandi', 'Koraput', 'Rayagada', 'Kandhamal'], 1, 'Deomali Peak lies in the Chandragiri-Pottangi sub-range in Koraput district.'),
        qItem('og8', 'Geography', 'How many Ramsar Wetlands of International Importance are located in Odisha?', ['2', '4', '6', '8'], 2, 'Odisha has 6 Ramsar Sites: Chilika, Bhitarkanika, Satkosia Gorge, Tampara, Hirakud, and Ansupa.'),
        qItem('og9', 'Geography', 'Similipal Biosphere Reserve and Tiger Reserve is located in which district of Odisha?', ['Keonjhar', 'Mayurbhanj', 'Sundargarh', 'Balasore'], 1, 'Similipal National Park & Biosphere Reserve is in Mayurbhanj district.'),
        qItem('og10', 'Geography', 'Hirakud Dam, one of the longest earthen dams in the world, is built across which river?', ['Mahanadi', 'Indravati', 'Rushikulya', 'Tel'], 0, 'Hirakud Dam is constructed across the Mahanadi River near Sambalpur.'),
        qItem('og11', 'Governance', 'How many total Assembly constituencies (MLAs) are there in the Odisha Legislative Assembly?', ['120', '140', '147', '150'], 2, 'The Odisha Legislative Assembly consists of 147 elected members.'),
        qItem('og12', 'Governance', 'How many Lok Sabha and Rajya Sabha seats does Odisha represent in the Indian Parliament?', ['20 LS, 10 RS', '21 LS, 10 RS', '21 LS, 12 RS', '18 LS, 10 RS'], 1, 'Odisha sends 21 members to the Lok Sabha and 10 members to the Rajya Sabha.'),
        qItem('og13', 'Governance', 'How many Revenue Divisions administer Odisha\'s 30 districts?', ['2', '3', '4', '5'], 1, 'Odisha has 3 Revenue Divisions (Central, Northern, Southern) with 10 districts each.'),
        qItem('og14', 'Governance', 'Where is the permanent seat of the High Court of Orissa located?', ['Bhubaneswar', 'Cuttack', 'Puri', 'Sambalpur'], 1, 'The Orissa High Court has been seated at Cuttack since its inauguration in 1948.'),
        qItem('og15', 'Governance', 'Which district headquarters is Bhawanipatna?', ['Nuapada', 'Kalahandi', 'Balangir', 'Rayagada'], 1, 'Bhawanipatna is the administrative headquarters of Kalahandi district.'),
        qItem('og16', 'Current Affairs', 'Which Odisha major port is being developed as a Green Hydrogen & Green Ammonia Export Hub?', ['Gopalpur', 'Paradip', 'Dhamra', 'Subarnarekha'], 1, 'Paradip Port (Jagatsinghpur) is Odisha\'s only Major Port and a National Green Hydrogen Hub.'),
        qItem('og17', 'Current Affairs', 'Under Odisha\'s Subhadra Yojana, eligible women aged 21–60 receive what annual DBT amount?', ['₹6,000', '₹8,000', '₹10,000', '₹12,000'], 2, 'Subhadra Yojana transfers ₹10,000/year in two installments of ₹5,000 via Aadhaar-seeded DBT.'),
        qItem('og18', 'Current Affairs', 'Effective April 1, 2026, what major tax relief did the Government of Odisha enact for salaried employees?', ['Abolition of Professional Tax', 'Zero GST on books', '50% Stamp Duty cut', 'Zero Road Tax'], 0, 'Odisha abolished Professional Tax w.e.f. April 1, 2026.'),
        qItem('og19', 'Current Affairs', 'Info Valley (EMC 2.0) supporting Odisha\'s semiconductor design (O-Chip) is located near which city?', ['Rourkela', 'Bhubaneswar', 'Berhampur', 'Balasore'], 1, 'Info Valley near Bhubaneswar (Khordha) anchors Odisha\'s Electronics & Semiconductor cluster.'),
        qItem('og20', 'Current Affairs', 'Birsa Munda International Hockey Stadium is located in which city of Sundargarh district?', ['Sundargarh', 'Rourkela', 'Rajgangpur', 'Bonai'], 1, 'Rourkela hosts the Birsa Munda International Hockey Stadium.'),
        qItem('og21', 'Culture & GI', 'Which traditional sweet from Kendrapara district holds a Geographical Indication (GI) tag?', ['Chhena Jhili', 'Kendrapara Rasabali', 'Poda Pitha', 'Manda Pitha'], 1, 'Kendrapara Rasabali received the GI tag for its unique preparation at Baladevjew Temple.'),
        qItem('og22', 'Culture & GI', 'Odia was officially recognized as the 6th Classical Language of India in which year?', ['2008', '2011', '2014', '2016'], 2, 'Odia received Classical Language status from the Government of India in February 2014.'),
        qItem('og23', 'Culture & GI', 'Koraput Kalajeera Rice, known as the "Prince of Rice", received its GI tag from which Odisha district?', ['Mayurbhanj', 'Koraput', 'Bargarh', 'Ganjam'], 1, 'Kalajeera Rice is an aromatic black rice variety native to Koraput district.'),
        qItem('og24', 'Culture & GI', 'Which classical dance form of Odisha traces its roots to the Mahari and Gotipua traditions?', ['Kuchipudi', 'Odissi', 'Sattriya', 'Manipuri'], 1, 'Odissi is one of India\'s eight recognized classical dance forms, rooted in Odisha\'s temple traditions.'),
        qItem('og25', 'Culture & GI', 'Similipal Kai Chutney, awarded a GI tag, is traditionally prepared by tribal communities in which district?', ['Mayurbhanj', 'Kandhamal', 'Malkangiri', 'Nabarangpur'], 0, 'Similipal Kai Chutney (Red Weaver Ant chutney) belongs to Mayurbhanj district.')
      ]
    },
    {
      key: 'teaching-pedagogy',
      title: 'Teaching Aptitude & Pedagogy (OTET / OSSTET / OAVS)',
      title_or: 'ଶିକ୍ଷାଦାନ ଦକ୍ଷତା ଓ ପେଡାଗୋଜି (OTET / OSSTET / OAVS)',
      duration_min: 20,
      default_neg: 0,
      badge: 'OTET · OSSTET · CTET · OAVS · ITEP',
      questions: [
        qItem('tp1', 'Child Development', 'According to Jean Piaget, during which stage do children develop conservation and logical thinking about concrete objects?', ['Sensorimotor', 'Pre-operational', 'Concrete Operational', 'Formal Operational'], 2, 'In the Concrete Operational stage (7–11 years), children master conservation, classification, and reversibility.'),
        qItem('tp2', 'Child Development', 'Lev Vygotsky\'s concept of the gap between what a learner can do independently and with guidance is called:', ['Schema', 'Zone of Proximal Development (ZPD)', 'Equilibration', 'Operant Conditioning'], 1, 'ZPD represents tasks a learner can accomplish with scaffolding from a More Knowledgeable Other (MKO).'),
        qItem('tp3', 'Child Development', 'Howard Gardner\'s Theory of Multiple Intelligences emphasizes that intelligence is:', ['A single general factor (g)', 'Multi-dimensional with distinct abilities', 'Fixed solely at birth', 'Measured only by IQ tests'], 1, 'Gardner proposed multiple independent intelligences (linguistic, logical, spatial, musical, interpersonal, etc.).'),
        qItem('tp4', 'Child Development', 'In Lawrence Kohlberg\'s stages of moral development, obeying rules solely to avoid punishment belongs to:', ['Pre-conventional level', 'Conventional level', 'Post-conventional level', 'Autonomous level'], 0, 'Stage 1 (Obedience and Punishment orientation) is part of the Pre-conventional level.'),
        qItem('tp5', 'Child Development', 'Erik Erikson\'s psychosocial crisis during early adolescence (12–18 years) is:', ['Trust vs. Mistrust', 'Industry vs. Inferiority', 'Identity vs. Role Confusion', 'Intimacy vs. Isolation'], 2, 'Adolescents explore personal values and career goals in Identity vs. Role Confusion.'),
        qItem('tp6', 'NEP 2020 & Policy', 'What is the new curricular and pedagogical structure introduced by NEP 2020 replacing 10+2?', ['5+3+3+4', '5+4+3+3', '6+3+3+2', '4+4+4+3'], 0, 'NEP 2020 establishes the 5+3+3+4 structure: Foundational (5), Preparatory (3), Middle (3), Secondary (4).'),
        qItem('tp7', 'NEP 2020 & Policy', 'Under NEP 2020, what is the full form of PARAKH, the national assessment centre?', ['Performance Assessment, Review, and Analysis of Knowledge for Holistic Development', 'Primary Academic Research and Knowledge Hub', 'Public Assessment Registry for Accredited Knowledge', 'Pedagogical Audit & Review Agency for Kids'], 0, 'PARAKH sets norms, standards, and guidelines for student assessment across India.'),
        qItem('tp8', 'NEP 2020 & Policy', 'The Right of Children to Free and Compulsory Education (RTE) Act, 2009 guarantees free education for ages:', ['3 to 12 years', '6 to 14 years', '6 to 18 years', '5 to 15 years'], 1, 'Article 21A and the RTE Act 2009 mandate free and compulsory education for children aged 6–14 years.'),
        qItem('tp9', 'NEP 2020 & Policy', 'NIPUN Bharat Mission launched under NEP 2020 aims to achieve universal Foundational Literacy and Numeracy (FLN) by:', ['Grade 1', 'Grade 3', 'Grade 5', 'Grade 8'], 1, 'NIPUN Bharat targets universal FLN for every child by the end of Grade 3.'),
        qItem('tp10', 'NEP 2020 & Policy', 'Under NEP 2020, what is the minimum degree qualification envisaged for school teachers by 2030?', ['1-year D.El.Ed', '2-year B.Ed', '4-year Integrated B.Ed (ITEP)', 'Any Graduate degree'], 2, 'NEP 2020 designates the 4-year Integrated Teacher Education Programme (ITEP) as the minimum qualification by 2030.'),
        qItem('tp11', 'Pedagogy & Methods', 'Which teaching method encourages learners to discover principles themselves through guided inquiry and experiments?', ['Lecture Method', 'Heuristic / Discovery Method', 'Rote Drill Method', 'Dictation Method'], 1, 'The Heuristic method (propounded by H.E. Armstrong) puts the student in the role of an active discoverer.'),
        qItem('tp12', 'Pedagogy & Methods', 'In Revised Bloom\'s Taxonomy (Anderson & Krathwohl), what is the highest level of the cognitive domain?', ['Analyzing', 'Evaluating', 'Creating', 'Applying'], 2, 'The revised hierarchy from lowest to highest is: Remember, Understand, Apply, Analyze, Evaluate, Create.'),
        qItem('tp13', 'Pedagogy & Methods', 'Micro-teaching is primarily designed to:', ['Teach large lecture halls', 'Practice specific teaching skills in scaled-down sessions', 'Replace annual examinations', 'Evaluate school principals'], 1, 'Micro-teaching scales down class size (5–10 peers) and duration (5–10 min) to master one teaching skill at a time.'),
        qItem('tp14', 'Pedagogy & Methods', 'Constructivist pedagogy views the teacher primarily as a:', ['Sole transmitter of fixed facts', 'Facilitator and co-constructor of knowledge', 'Strict disciplinarian', 'Passive observer'], 1, 'In constructivism (Piaget, Vygotsky, NCF 2005), teachers facilitate active meaning-making by learners.'),
        qItem('tp15', 'Pedagogy & Methods', 'Which approach integrates Science, Technology, Engineering, Arts, and Mathematics through real-world projects?', ['Behaviorist Drill', 'Project-Based STEAM Learning', 'Grammar-Translation Method', 'Silent Reading'], 1, 'Project-Based STEAM Learning connects interdisciplinary concepts to authentic real-world problems.'),
        qItem('tp16', 'Assessment', 'Assessment conducted DURING the teaching-learning process to provide ongoing feedback and improve instruction is:', ['Summative Assessment', 'Formative Assessment', 'Norm-referenced Ranking', 'Placement Testing'], 1, 'Formative assessment (Assessment FOR Learning) diagnoses learning gaps while instruction is still underway.'),
        qItem('tp17', 'Assessment', 'A test that consistently yields the same scores upon repeated administration under similar conditions has high:', ['Validity', 'Reliability', 'Objectivity', 'Usability'], 1, 'Reliability refers to consistency/stability of measurement; validity refers to measuring what it intends to measure.'),
        qItem('tp18', 'Assessment', 'Which tool uses explicit performance criteria and rating levels to grade essays, projects, or portfolios fairly?', ['Anecdotal Record', 'Scoring Rubric', 'Sociogram', 'Attendance Register'], 1, 'A rubric clearly specifies criteria and quality levels, enhancing grading objectivity and student clarity.'),
        qItem('tp19', 'Assessment', 'Diagnostic testing in a classroom is primarily followed by:', ['Punishment', 'Remedial Teaching', 'Promotion to next grade', 'Ranking on noticeboard'], 1, 'Diagnostic tests pinpoint specific misconceptions so teachers can deliver targeted remedial teaching.'),
        qItem('tp20', 'Assessment', 'Continuous and Comprehensive Evaluation (CCE) covers:', ['Only written annual exams', 'Both scholastic and co-scholastic aspects of growth', 'Only sports achievements', 'Only homework submission'], 1, 'CCE evaluates both scholastic (academic) and co-scholastic (life skills, values, arts, health) domains.'),
        qItem('tp21', 'Inclusive Education', 'Dyslexia is a specific learning disability primarily affecting:', ['Motor coordination', 'Reading, spelling, and phonological decoding', 'Mathematical computation only', 'Hearing acuity'], 1, 'Dyslexia primarily impairs fluent word recognition, spelling, and decoding skills.'),
        qItem('tp22', 'Inclusive Education', 'Difficulty primarily in understanding numbers, arithmetic facts, and mathematical reasoning is termed:', ['Dysgraphia', 'Dyscalculia', 'Dyspraxia', 'Aphasia'], 1, 'Dyscalculia specifically affects number sense and mathematical calculation.'),
        qItem('tp23', 'Inclusive Education', 'In an inclusive classroom, Universal Design for Learning (UDL) recommends providing:', ['One rigid textbook for all', 'Multiple means of engagement, representation, and expression', 'Separate segregated schools', 'Identical timed written tests only'], 1, 'UDL removes barriers by offering flexible ways to access content, engage, and demonstrate learning.'),
        qItem('tp24', 'Inclusive Education', 'Which statutory body regulates teacher education standards across India?', ['AICTE', 'NCTE', 'MCI', 'BCI'], 1, 'The National Council for Teacher Education (NCTE) oversees norms and standards for teacher education.'),
        qItem('tp25', 'Inclusive Education', 'Multilingual classrooms using the child\'s mother tongue (e.g., Odia / tribal languages) in early grades:', ['Confuse young learners', 'Strengthen conceptual understanding and cognitive growth', 'Delay literacy', 'Are prohibited by NCF'], 1, 'NEP 2020 and research affirm that mother-tongue instruction in early years deepens comprehension and retention.')
      ]
    },
    {
      key: 'reasoning-quant',
      title: 'Reasoning & Quantitative Aptitude',
      title_or: 'ତର୍କଶକ୍ତି ଓ ଗାଣିତିକ ଦକ୍ଷତା (OSSC / OSSSC / SSC)',
      duration_min: 25,
      default_neg: 0.25,
      badge: 'OSSC CGL · OSSSC · SSC · RRB · Banking',
      questions: [
        qItem('rq1', 'Number & Series', 'Find the next number in the series: 3, 7, 15, 31, 63, ?', ['125', '127', '129', '131'], 1, 'Pattern: each term = 2×previous + 1. So 63×2 + 1 = 127.'),
        qItem('rq2', 'Number & Series', 'Find the missing term: 4, 9, 25, 49, 121, ?', ['144', '169', '196', '225'], 1, 'Squares of consecutive prime numbers: 2², 3², 5², 7², 11², next is 13² = 169.'),
        qItem('rq3', 'Number & Series', 'Find the next number: 2, 6, 12, 20, 30, 42, ?', ['54', '56', '58', '60'], 1, 'Differences are +4, +6, +8, +10, +12, +14 → 42 + 14 = 56 (or n(n+1)).'),
        qItem('rq4', 'Number & Series', 'What comes next: 100, 96, 87, 71, 46, ?', ['10', '15', '21', '25'], 0, 'Subtracting squares: −2²(4), −3²(9), −4²(16), −5²(25), −6²(36) → 46 − 36 = 10.'),
        qItem('rq5', 'Number & Series', 'Find the odd one out: 27, 64, 125, 144, 216', ['27', '64', '144', '216'], 2, 'All except 144 (12²) are perfect cubes (3³, 4³, 5³, 6³).'),
        qItem('rq6', 'Logical Reasoning', 'If ODISHA is coded as PEJTIB, how is PURI coded in the same code?', ['QVSJ', 'QVRJ', 'QUSJ', 'PVSJ'], 0, 'Each letter shifts +1 forward: P→Q, U→V, R→S, I→J → QVSJ.'),
        qItem('rq7', 'Logical Reasoning', 'Pointing to a photograph, Ramesh says, "He is the only son of my father\'s father." How is the man related to Ramesh?', ['Brother', 'Uncle', 'Father', 'Grandfather'], 2, 'My father\'s father is grandfather; his only son is Ramesh\'s father.'),
        qItem('rq8', 'Logical Reasoning', 'A person walks 10 m North, turns right and walks 6 m, then turns right and walks 10 m. How far and in which direction is he from the start?', ['6 m East', '6 m West', '10 m North', '16 m East'], 0, 'North 10 m and South 10 m cancel out, leaving 6 m East of the starting point.'),
        qItem('rq9', 'Logical Reasoning', 'In a row of 40 students, Sita is 14th from the left end. What is her rank from the right end?', ['26th', '27th', '28th', '25th'], 1, 'Rank from right = Total − Left + 1 = 40 − 14 + 1 = 27th.'),
        qItem('rq10', 'Logical Reasoning', 'If ALL books are pens and SOME pens are pencils, which conclusion definitely follows?', ['All books are pencils', 'Some books are pens', 'No pen is a book', 'All pencils are books'], 1, 'Since all books are pens, "Some books are pens" is logically guaranteed.'),
        qItem('rq11', 'Percentage & Profit', 'If a candidate\'s score increases from 80 to 100, what is the percentage increase?', ['20%', '22.5%', '25%', '30%'], 2, 'Increase = 20; (20 / 80) × 100 = 25%.'),
        qItem('rq12', 'Percentage & Profit', 'An article bought for ₹800 is sold for ₹920. What is the profit percentage?', ['12%', '15%', '16%', '18%'], 1, 'Profit = ₹120; (120 / 800) × 100 = 15%.'),
        qItem('rq13', 'Percentage & Profit', 'What is 15% of 240 plus 20% of 150?', ['60', '66', '72', '76'], 1, '15% of 240 = 36; 20% of 150 = 30; 36 + 30 = 66.'),
        qItem('rq14', 'Percentage & Profit', 'A price is increased by 20% and then decreased by 20%. What is the net percentage change?', ['0% change', '4% decrease', '4% increase', '2% decrease'], 1, 'Net change = +20 − 20 − (20×20)/100 = −4% (4% decrease).'),
        qItem('rq15', 'Percentage & Profit', 'Simple Interest on ₹5,000 at 8% per annum for 3 years is:', ['₹1,000', '₹1,200', '₹1,250', '₹1,500'], 1, 'SI = (P × R × T) / 100 = (5000 × 8 × 3) / 100 = ₹1,200.'),
        qItem('rq16', 'Ratio & Average', 'The ratio of boys to girls in a class is 3 : 2. If there are 45 students total, how many are girls?', ['15', '18', '20', '27'], 1, 'Girls = (2 / 5) × 45 = 18.'),
        qItem('rq17', 'Ratio & Average', 'The average of 5 consecutive odd numbers is 21. What is the largest of these numbers?', ['23', '25', '27', '29'], 1, 'The middle (3rd) number is 21; numbers are 17, 19, 21, 23, 25 → largest is 25.'),
        qItem('rq18', 'Ratio & Average', 'If A : B = 2 : 3 and B : C = 4 : 5, what is A : B : C?', ['8 : 12 : 15', '6 : 12 : 15', '8 : 10 : 15', '4 : 6 : 15'], 0, 'Multiply first by 4 (8:12) and second by 3 (12:15) → 8 : 12 : 15.'),
        qItem('rq19', 'Ratio & Average', 'The average age of 4 friends is 24 years. If a 5th friend joins and the average becomes 25, what is the 5th friend\'s age?', ['25', '28', '29', '30'], 2, 'Total of 4 = 96; total of 5 = 125 → 5th age = 125 − 96 = 29 years.'),
        qItem('rq20', 'Ratio & Average', 'Find the LCM of 12, 15, and 20:', ['30', '45', '60', '120'], 2, '60 is the smallest positive multiple divisible by 12, 15, and 20.'),
        qItem('rq21', 'Time, Work & Speed', 'A can complete a work in 12 days and B in 6 days. Together they will finish it in:', ['3 days', '4 days', '5 days', '6 days'], 1, 'Combined rate = 1/12 + 1/6 = 3/12 = 1/4 → 4 days.'),
        qItem('rq22', 'Time, Work & Speed', 'A train runs at 72 km/h. What is its speed in metres per second (m/s)?', ['15 m/s', '18 m/s', '20 m/s', '24 m/s'], 2, '72 × (5 / 18) = 20 m/s.'),
        qItem('rq23', 'Time, Work & Speed', 'A bus covers 180 km in 3 hours and 120 km in 2 hours. Its average speed for the whole journey is:', ['55 km/h', '60 km/h', '62 km/h', '65 km/h'], 1, 'Total distance = 300 km; total time = 5 hours → 300 / 5 = 60 km/h.'),
        qItem('rq24', 'Time, Work & Speed', 'If 8 workers build a wall in 15 days, how many days will 12 workers take at the same rate?', ['8 days', '10 days', '12 days', '14 days'], 1, 'Work = 8 × 15 = 120 worker-days → 120 / 12 = 10 days.'),
        qItem('rq25', 'Time, Work & Speed', 'A 150 m long train passes a pole in 10 seconds. What is its speed in km/h?', ['45 km/h', '50 km/h', '54 km/h', '60 km/h'], 2, 'Speed = 150/10 = 15 m/s = 15 × (18/5) = 54 km/h.')
      ]
    }
  ];

  function quantizePct(pct) {
    var c = Math.max(0, Math.min(100, Number(pct) || 0));
    var s = Math.round(c / 5) * 5;
    if (c > 0 && s === 0) s = 5;
    return s;
  }

  function computeCountdownDays(dateIso, nowDate) {
    var now = nowDate instanceof Date ? nowDate : new Date();
    var istNow = new Date(now.getTime() + 330 * 60000);
    var todayUtc = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
    var parts = String(dateIso || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    var targetUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
    return Math.round((targetUtc - todayUtc) / 86400000);
  }

  function evaluateDrillAttempt(questions, answers, negativeMark) {
    var qs = Array.isArray(questions) ? questions : [];
    var ans = answers || {};
    var neg = Math.max(0, Number(negativeMark || 0));
    var correct = 0;
    var wrong = 0;
    var unanswered = 0;
    var subMap = {};
    var subOrder = [];

    for (var i = 0; i < qs.length; i += 1) {
      var q = qs[i];
      if (!q) continue;
      var st = q.subtopic || 'General';
      if (!subMap[st]) {
        subMap[st] = { subtopic: st, total: 0, correct: 0, wrong: 0, unanswered: 0 };
        subOrder.push(st);
      }
      subMap[st].total += 1;

      if (!Object.prototype.hasOwnProperty.call(ans, q.id) || ans[q.id] === undefined || ans[q.id] === null) {
        unanswered += 1;
        subMap[st].unanswered += 1;
      } else if (Number(ans[q.id]) === Number(q.ans)) {
        correct += 1;
        subMap[st].correct += 1;
      } else {
        wrong += 1;
        subMap[st].wrong += 1;
      }
    }

    var answered = correct + wrong;
    var rawMarks = correct;
    var penalty = Math.round(wrong * neg * 100) / 100;
    var netScore = Math.round((rawMarks - penalty) * 100) / 100;
    var accuracyPct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    var bySubtopic = subOrder.map(function (st) {
      var row = subMap[st];
      var att = row.correct + row.wrong;
      var pct = att > 0 ? Math.round((row.correct / att) * 100) : 0;
      return {
        subtopic: row.subtopic,
        total: row.total,
        correct: row.correct,
        wrong: row.wrong,
        unanswered: row.unanswered,
        accuracy_pct: pct,
        bar_step: quantizePct(pct)
      };
    });

    return {
      total: qs.length,
      answered: answered,
      correct: correct,
      wrong: wrong,
      unanswered: unanswered,
      negative_mark: neg,
      raw_marks: rawMarks,
      penalty: penalty,
      net_score: netScore,
      accuracy_pct: accuracyPct,
      by_subtopic: bySubtopic
    };
  }

  function loadBestStats() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(STATS_KEY);
      if (raw) return JSON.parse(raw) || {};
    } catch (_) {}
    return {};
  }

  function saveBestStat(drillKey, netScore) {
    var all = loadBestStats();
    var prev = Number(all[drillKey] || -999);
    if (netScore > prev) all[drillKey] = netScore;
    try {
      if (win && win.localStorage) win.localStorage.setItem(STATS_KEY, JSON.stringify(all));
    } catch (_) {}
    return all;
  }

  function fmtTimer(sec) {
    var s = Math.max(0, Math.floor(sec));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var state = {
      activeDrillKey: 'odisha-gk',
      negativeMark: 0.25,
      mode: 'lobby', // 'lobby' | 'running' | 'submitted'
      currentIdx: 0,
      answers: {},
      flagged: {},
      secondsLeft: 20 * 60,
      timerId: null
    };

    function getActiveDrill() {
      for (var i = 0; i < SECTIONAL_DRILLS.length; i += 1) {
        if (SECTIONAL_DRILLS[i].key === state.activeDrillKey) return SECTIONAL_DRILLS[i];
      }
      return SECTIONAL_DRILLS[0];
    }

    function stopTimer() {
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
    }

    function submitDrill() {
      stopTimer();
      var drill = getActiveDrill();
      var res = evaluateDrillAttempt(drill.questions, state.answers, state.negativeMark);
      saveBestStat(drill.key, res.net_score);
      state.mode = 'submitted';
      render();
    }

    function startDrill(drillKey) {
      stopTimer();
      if (drillKey) state.activeDrillKey = drillKey;
      var drill = getActiveDrill();
      state.mode = 'running';
      state.currentIdx = 0;
      state.answers = {};
      state.flagged = {};
      state.secondsLeft = drill.duration_min * 60;
      state.timerId = setInterval(function () {
        state.secondsLeft -= 1;
        var tEl = doc.getElementById('cso-mtd-timer');
        if (tEl) tEl.textContent = '⏱️ ' + fmtTimer(state.secondsLeft);
        if (state.secondsLeft <= 0) submitDrill();
      }, 1000);
      render();
    }

    function render() {
      var drill = getActiveDrill();
      var bestMap = loadBestStats();
      var wrap = el('div', 'cso-mtd-wrap');
      wrap.setAttribute('data-cso-mock-hub', '1');

      // 1. Live Exam-Day Countdowns Strip
      var cdSec = el('section', 'cso-mtd-card');
      cdSec.setAttribute('aria-label', 'Live Exam-Day Countdowns');
      cdSec.appendChild(el('h2', 'cso-mtd-title', '⏳ Live Odisha & National Exam-Day Countdowns'));
      var cdGrid = el('div', 'cso-mtd-cd-grid');
      EXAM_COUNTDOWNS.forEach(function (ex) {
        var days = computeCountdownDays(ex.date_iso);
        var card = el('div', 'cso-mtd-cd-card');
        card.appendChild(el('span', 'cso-mtd-tag', ex.tag));
        card.appendChild(el('div', 'cso-mtd-cd-name', ex.title));
        card.appendChild(el('div', 'cso-mtd-cd-days', days === null ? ex.date_iso : (days >= 0 ? (days + ' days left · ' + ex.date_iso) : ('Completed · ' + ex.date_iso))));
        var cdBtn = el('button', 'cso-mtd-btn cso-mtd-btn--sm', '▶ Practice 25-MCQ Drill');
        cdBtn.type = 'button';
        cdBtn.addEventListener('click', function () { startDrill(ex.drill_key); });
        card.appendChild(cdBtn);
        cdGrid.appendChild(card);
      });
      cdSec.appendChild(cdGrid);
      wrap.appendChild(cdSec);

      // 2. Sectional 25-MCQ Drill Selector & Negative Marking Bar
      var selSec = el('section', 'cso-mtd-card');
      selSec.setAttribute('aria-label', 'Timed 25-MCQ Sectional Drills');
      var selHead = el('div', 'cso-mtd-head');
      selHead.appendChild(el('h2', 'cso-mtd-title', '🎯 Timed 25-MCQ Sectional Mock Test Series'));

      var negWrap = el('div', 'cso-mtd-neg-group');
      negWrap.setAttribute('role', 'group');
      negWrap.setAttribute('aria-label', 'Negative marking rule');
      negWrap.appendChild(el('span', 'cso-mtd-neg-lbl', 'Negative Marking:'));
      NEGATIVE_OPTIONS.forEach(function (opt) {
        var nb = el('button', 'cso-mtd-pill' + (state.negativeMark === opt.value ? ' is-active' : ''), opt.label);
        nb.type = 'button';
        nb.setAttribute('data-mtd-neg', String(opt.value));
        nb.setAttribute('aria-pressed', state.negativeMark === opt.value ? 'true' : 'false');
        nb.addEventListener('click', function () {
          state.negativeMark = opt.value;
          render();
        });
        negWrap.appendChild(nb);
      });
      selHead.appendChild(negWrap);
      selSec.appendChild(selHead);

      var drillCards = el('div', 'cso-mtd-drill-grid');
      SECTIONAL_DRILLS.forEach(function (d) {
        var act = d.key === state.activeDrillKey;
        var dc = el('article', 'cso-mtd-drill-card' + (act ? ' is-active' : ''));
        dc.appendChild(el('span', 'cso-mtd-tag', d.badge));
        dc.appendChild(el('h3', 'cso-mtd-drill-name', d.title));
        dc.appendChild(el('div', 'cso-mtd-drill-or', d.title_or));
        var bestTxt = bestMap[d.key] !== undefined ? (' · 🏆 Best: ' + bestMap[d.key] + '/25') : '';
        dc.appendChild(el('div', 'cso-mtd-drill-meta', '25 MCQs · ' + d.duration_min + ' Mins' + bestTxt));
        var launchBtn = el('button', 'cso-mtd-btn cso-mtd-btn--primary', act && state.mode === 'running' ? '↻ Restart 25-MCQ Drill' : '▶ Start 25-MCQ Timed Drill');
        launchBtn.type = 'button';
        launchBtn.addEventListener('click', function () { startDrill(d.key); });
        dc.appendChild(launchBtn);
        drillCards.appendChild(dc);
      });
      selSec.appendChild(drillCards);
      wrap.appendChild(selSec);

      // 3. Active Timed Drill Runner OR Instant Topic-Wise Accuracy Breakdown
      if (state.mode === 'running') {
        var q = drill.questions[state.currentIdx];
        var runSec = el('section', 'cso-mtd-card cso-mtd-runner');
        var rHead = el('div', 'cso-mtd-head');
        rHead.appendChild(el('h3', 'cso-mtd-title', drill.title + ' — Q' + (state.currentIdx + 1) + ' / ' + drill.questions.length));
        var rRight = el('div', 'cso-mtd-neg-group');
        var timerPill = el('span', 'cso-mtd-timer', '⏱️ ' + fmtTimer(state.secondsLeft));
        timerPill.id = 'cso-mtd-timer';
        rRight.appendChild(timerPill);
        var subBtn = el('button', 'cso-mtd-btn cso-mtd-btn--primary', '✓ Finish & Submit Drill');
        subBtn.type = 'button';
        subBtn.addEventListener('click', submitDrill);
        rRight.appendChild(subBtn);
        rHead.appendChild(rRight);
        runSec.appendChild(rHead);

        runSec.appendChild(el('span', 'cso-mtd-tag', 'Topic: ' + q.subtopic + ' · +1 / −' + state.negativeMark));
        runSec.appendChild(el('p', 'cso-mtd-q-text', (state.currentIdx + 1) + '. ' + q.q));

        var optsBox = el('div', 'cso-mtd-opts');
        var chosen = Object.prototype.hasOwnProperty.call(state.answers, q.id) ? state.answers[q.id] : -1;
        q.opts.forEach(function (oTxt, oi) {
          var ob = el('button', 'cso-mtd-opt' + (chosen === oi ? ' is-selected' : ''), String.fromCharCode(65 + oi) + '. ' + oTxt);
          ob.type = 'button';
          ob.setAttribute('aria-pressed', chosen === oi ? 'true' : 'false');
          ob.addEventListener('click', function () {
            state.answers[q.id] = oi;
            render();
          });
          optsBox.appendChild(ob);
        });
        runSec.appendChild(optsBox);

        var navRow = el('div', 'cso-mtd-nav-row');
        var prevBtn = el('button', 'cso-mtd-btn', '← Previous');
        prevBtn.type = 'button';
        prevBtn.disabled = state.currentIdx === 0;
        prevBtn.addEventListener('click', function () { state.currentIdx -= 1; render(); });

        var flagBtn = el('button', 'cso-mtd-btn', state.flagged[q.id] ? '⚑ Flagged' : '⚐ Flag');
        flagBtn.type = 'button';
        flagBtn.addEventListener('click', function () {
          state.flagged[q.id] = !state.flagged[q.id];
          render();
        });

        var clrBtn = el('button', 'cso-mtd-btn', 'Clear');
        clrBtn.type = 'button';
        clrBtn.addEventListener('click', function () {
          delete state.answers[q.id];
          render();
        });

        var nextBtn = el('button', 'cso-mtd-btn cso-mtd-btn--primary', state.currentIdx < drill.questions.length - 1 ? 'Save & Next →' : 'Submit Drill ✓');
        nextBtn.type = 'button';
        nextBtn.addEventListener('click', function () {
          if (state.currentIdx < drill.questions.length - 1) {
            state.currentIdx += 1;
            render();
          } else {
            submitDrill();
          }
        });
        navRow.append(prevBtn, flagBtn, clrBtn, nextBtn);
        runSec.appendChild(navRow);

        var pal = el('div', 'cso-mtd-palette');
        drill.questions.forEach(function (pq, pi) {
          var isAns = Object.prototype.hasOwnProperty.call(state.answers, pq.id);
          var isFlg = Boolean(state.flagged[pq.id]);
          var cls = 'cso-mtd-pal-btn' + (pi === state.currentIdx ? ' is-current' : '') + (isAns ? ' is-answered' : '') + (isFlg ? ' is-flagged' : '');
          var pb = el('button', cls, String(pi + 1));
          pb.type = 'button';
          pb.addEventListener('click', function () { state.currentIdx = pi; render(); });
          pal.appendChild(pb);
        });
        runSec.appendChild(pal);
        wrap.appendChild(runSec);
      } else if (state.mode === 'submitted') {
        var res = evaluateDrillAttempt(drill.questions, state.answers, state.negativeMark);
        var sumSec = el('section', 'cso-mtd-card');
        var sHead = el('div', 'cso-mtd-head');
        sHead.appendChild(el('h3', 'cso-mtd-title', '📊 Scorecard & Instant Topic-Wise Accuracy — ' + drill.title));
        var retakeBtn = el('button', 'cso-mtd-btn cso-mtd-btn--primary', '↻ Retake 25-MCQ Drill');
        retakeBtn.type = 'button';
        retakeBtn.addEventListener('click', function () { startDrill(drill.key); });
        sHead.appendChild(retakeBtn);
        sumSec.appendChild(sHead);

        var kpis = el('div', 'cso-mtd-kpis');
        [
          ['Net Score (Neg −' + res.negative_mark + ')', res.net_score + ' / ' + res.total],
          ['Accuracy', res.accuracy_pct + '%'],
          ['Correct / Wrong', res.correct + ' ✓ / ' + res.wrong + ' ✕'],
          ['Unanswered', String(res.unanswered)]
        ].forEach(function (pair) {
          var k = el('div', 'cso-mtd-kpi');
          k.append(el('span', 'cso-mtd-kpi-k', pair[0]), el('b', 'cso-mtd-kpi-v', pair[1]));
          kpis.appendChild(k);
        });
        sumSec.appendChild(kpis);

        sumSec.appendChild(el('h4', 'cso-mtd-subhead', 'Topic-Wise Accuracy Breakdown'));
        var subBars = el('div', 'cso-mtd-sub-bars');
        res.by_subtopic.forEach(function (st) {
          var row = el('div', 'cso-vfv-bar-row');
          var meta = el('div', 'cso-vfv-bar-meta');
          meta.append(
            el('span', 'cso-vfv-bar-label', st.subtopic),
            el('span', 'cso-vfv-bar-val', st.correct + '/' + st.total + ' correct (' + st.accuracy_pct + '% accuracy)')
          );
          var track = el('div', 'cso-vfv-bar-track');
          track.appendChild(el('div', 'cso-vfv-bar-fill cso-vfv-bar--w' + st.bar_step));
          row.append(meta, track);
          subBars.appendChild(row);
        });
        sumSec.appendChild(subBars);

        sumSec.appendChild(el('h4', 'cso-mtd-subhead', '📋 Answer Key & Explanations'));
        var revList = el('div', 'cso-mtd-review');
        drill.questions.forEach(function (rq, ri) {
          var uAns = Object.prototype.hasOwnProperty.call(state.answers, rq.id) ? state.answers[rq.id] : -1;
          var ok = uAns === rq.ans;
          var item = el('div', 'cso-mtd-rev-item' + (ok ? ' is-ok' : ' is-miss'));
          item.appendChild(el('div', 'cso-mtd-rev-q', (ri + 1) + '. [' + rq.subtopic + '] ' + rq.q));
          item.appendChild(el('div', 'cso-mtd-rev-a',
            'Correct: ' + String.fromCharCode(65 + rq.ans) + '. ' + rq.opts[rq.ans] +
            (uAns === -1 ? ' · Your Answer: Skipped' : (' · Your Answer: ' + String.fromCharCode(65 + uAns) + (ok ? ' ✓' : ' ✕')))));
          item.appendChild(el('div', 'cso-mtd-rev-exp', rq.exp));
          revList.appendChild(item);
        });
        sumSec.appendChild(revList);
        wrap.appendChild(sumSec);
      }

      container.replaceChildren(wrap);
    }

    render();
    return { startDrill: startDrill, submitDrill: submitDrill };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-mock-tests-hub-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v406',
    NEGATIVE_OPTIONS: NEGATIVE_OPTIONS,
    EXAM_COUNTDOWNS: EXAM_COUNTDOWNS,
    SECTIONAL_DRILLS: SECTIONAL_DRILLS,
    computeCountdownDays: computeCountdownDays,
    evaluateDrillAttempt: evaluateDrillAttempt,
    mount: mount
  };
});
