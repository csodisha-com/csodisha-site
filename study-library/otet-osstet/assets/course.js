(function (root) {
  'use strict';

  var PROGRESS_KEY = 'cso_otet_course_progress';
  var EXAM_PREFIX = 'OTET/OSSTET';

  var OTET_MODULES = [
    {
      id: 'otet-m1-cdp',
      number: 1,
      title: 'Child Development & Pedagogy (CDP)',
      titleOr: 'ଶିଶୁ ବିକାଶ ଏବଂ ଶିକ୍ଷା ବିଜ୍ଞାନ (CDP)',
      outcomes: [
        'Compare Piaget’s cognitive stages, Vygotsky’s Zone of Proximal Development (ZPD), and Kohlberg’s moral reasoning.',
        'Apply principles of growth, maturation, and individual differences to Odisha primary and secondary classrooms.',
        'Design child-centred, constructivist classroom tasks that foster intrinsic motivation.'
      ],
      notes: [
        {
          lead: 'Piaget vs. Vygotsky:',
          text: 'Piaget emphasises stage-wise discovery learning (Sensorimotor, Pre-operational, Concrete Operational, Formal Operational), while Vygotsky highlights social scaffolding and the Zone of Proximal Development (ZPD).'
        },
        {
          lead: 'Erikson & Kohlberg:',
          text: 'Elementary learners (ages 6–11) navigate Industry vs. Inferiority; adolescents (OSSTET) navigate Identity vs. Role Confusion and Conventional to Post-Conventional morality.'
        },
        {
          lead: 'Constructivist Classroom:',
          text: 'Under NCF 2005 and NEP 2020, teachers act as facilitators connecting new concepts to prior lived experiences.'
        }
      ],
      diagramTitle: 'Visual Framework: Core CDP Theorists for OTET & OSSTET',
      diagramNodes: [
        { stage: 'Piaget', title: 'Cognitive Stages', detail: 'Schema, assimilation, accommodation, and conservation milestones.' },
        { stage: 'Vygotsky', title: 'Sociocultural ZPD', detail: 'Scaffolding by More Knowledgeable Other (MKO) and inner speech.' },
        { stage: 'Kohlberg', title: 'Moral Development', detail: 'Pre-conventional, Conventional, and Post-conventional reasoning.' },
        { stage: 'Gardner', title: 'Multiple Intelligences', detail: 'Linguistic, logical, spatial, bodily-kinesthetic, and interpersonal strengths.' }
      ],
      references: [
        { label: 'BSE Odisha: Official OTET & OSSTET Syllabus & Guidelines', url: 'https://www.bseodisha.ac.in/' },
        { label: 'SCERT Odisha: D.El.Ed. & B.Ed. Pedagogy Modules', url: 'https://scertodisha.nic.in/' }
      ],
      quiz: [
        {
          id: 'otet-m1-q1',
          question: 'According to Vygotsky, what is the "Zone of Proximal Development" (ZPD)?',
          options: [
            'Tasks a child can never perform even with help',
            'The gap between what a learner can do independently and what they can achieve with guided scaffolding',
            'Only physical growth during adolescence',
            'Rote memorisation of textbook definitions'
          ],
          answerIndex: 1,
          explanation: 'ZPD is the difference between independent problem-solving and potential development under adult or peer scaffolding.'
        },
        {
          id: 'otet-m1-q2',
          question: 'In Piaget’s theory, conservation of volume and reversibility of thought typically emerge in which stage?',
          options: ['Sensorimotor (0–2 yrs)', 'Pre-operational (2–7 yrs)', 'Concrete Operational (7–11 yrs)', 'Infancy'],
          answerIndex: 2,
          explanation: 'Concrete Operational thinkers (ages 7–11) master conservation, classification, seriation, and reversibility.'
        },
        {
          id: 'otet-m1-q3',
          question: 'Which classroom practice best reflects Howard Gardner’s Multiple Intelligences theory?',
          options: [
            'Assessing every student solely via timed essays',
            'Offering varied entry points such as stories, charts, role-play, and hands-on models',
            'Grouping students permanently by roll number',
            'Eliminating art and sports periods'
          ],
          answerIndex: 1,
          explanation: 'Multiple Intelligences supports multimodal instruction and varied ways for learners to demonstrate understanding.'
        }
      ]
    },
    {
      id: 'otet-m2-language',
      number: 2,
      title: 'Odia & English Language Pedagogy',
      titleOr: 'ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀ ଭାଷା ଶିକ୍ଷଣ ପଦ୍ଧତି',
      outcomes: [
        'Sequence LSRW (Listening, Speaking, Reading, Writing) skills naturally for Language I (Odia) and Language II (English).',
        'Distinguish language acquisition from formal language learning and apply Krashen’s comprehensible input.',
        'Diagnose common reading/writing errors and run remedial phonics and guided-reading clinics.'
      ],
      notes: [
        {
          lead: 'LSRW Integration:',
          text: 'Oral fluency (Listening and Speaking) builds the foundation for decoding, reading comprehension (skimming & scanning), and expressive writing.'
        },
        {
          lead: 'Multilingualism as a Resource:',
          text: 'Encourage Odia, Sambalpuri, and tribal home vocabularies as bridges to standard Odia and English rather than treating mother-tongue interference as an error.'
        },
        {
          lead: 'Reading Comprehension Strategies:',
          text: 'Teach prediction, inferencing, context-clue vocabulary, and loud/silent reading balance.'
        }
      ],
      diagramTitle: 'Visual Progression: LSRW Mastery in Bilingual Classrooms',
      diagramNodes: [
        { stage: '1. Listening', title: 'Phonemic Ear', detail: 'Stories, rhymes, oral instructions, and minimal-pair sound discrimination.' },
        { stage: '2. Speaking', title: 'Oral Fluency', detail: 'Picture talk, pair dialogues, and storytelling without fear of mistakes.' },
        { stage: '3. Reading', title: 'Decoding + Meaning', detail: 'Sight words, phonics/Matra fluency, skimming, and critical inferencing.' },
        { stage: '4. Writing', title: 'Guided to Free', detail: 'Tracing, sentence frames, paragraph drafting, and peer editing.' }
      ],
      references: [
        { label: 'SCERT Odisha: Primary Odia & English Teacher Handbooks', url: 'https://scertodisha.nic.in/' },
        { label: 'NCERT: Language Pedagogy & NCF Position Papers', url: 'https://ncert.nic.in/' }
      ],
      quiz: [
        {
          id: 'otet-m2-q1',
          question: 'What is the natural pedagogical sequence of fundamental language skills?',
          options: [
            'Writing -> Reading -> Speaking -> Listening',
            'Listening -> Speaking -> Reading -> Writing (LSRW)',
            'Grammar -> Translation -> Dictation -> Listening',
            'Reading -> Writing -> Memorising -> Speaking'
          ],
          answerIndex: 1,
          explanation: 'Language develops naturally from Listening and Speaking to Reading and Writing (LSRW).'
        },
        {
          id: 'otet-m2-q2',
          question: 'When a student rapidly reads a passage to locate a specific date or name, which reading sub-skill are they using?',
          options: ['Skimming', 'Scanning', 'Extensive reading', 'Proofreading'],
          answerIndex: 1,
          explanation: 'Scanning is rapid reading for a specific fact (date, figure, name), whereas skimming looks for the overall gist.'
        },
        {
          id: 'otet-m2-q3',
          question: 'How should a teacher view a child’s mother tongue (e.g., Odia or Santali) in an English second-language class?',
          options: [
            'Punish any mother-tongue word used in class',
            'Use it as a cognitive scaffold and resource for meaning-making',
            'Delay English until Grade 10',
            'Only teach English via silent copying'
          ],
          answerIndex: 1,
          explanation: 'NCF and NEP 2020 treat multilingualism and the child’s home language as a valuable pedagogical bridge.'
        }
      ]
    },
    {
      id: 'otet-m3-math-evs',
      number: 3,
      title: 'Mathematics, Science & Environmental Studies (EVS)',
      titleOr: 'ଗଣିତ, ବିଜ୍ଞାନ ଏବଂ ପରିବେଶ ଅଧ୍ୟୟନ (EVS) ଶିକ୍ଷାଦାନ',
      outcomes: [
        'Apply the Concrete–Pictorial–Abstract (CPA / ELPS) sequence in primary Mathematics.',
        'Teach EVS as an integrated thematic subject linking Science, Social Studies, and local Odisha ecology.',
        'Use inquiry-based experiments and error analysis to address common math and science misconceptions.'
      ],
      notes: [
        {
          lead: 'ELPS / CPA in Mathematics:',
          text: 'Move from Experience with concrete manipulatives (pebbles, bundles) -> Spoken Language -> Pictures/Diagrams -> Symbolic notation.'
        },
        {
          lead: 'Integrated EVS Themes:',
          text: 'Family & Friends, Food, Shelter, Water, Travel, and Things We Make and Do connect textbook concepts to local Odisha ponds, farming, and forests.'
        },
        {
          lead: 'Scientific Temper:',
          text: 'Encourage hypothesising, observing, classifying, and testing rather than rote formula memorisation.'
        }
      ],
      diagramTitle: 'Visual Sequence: CPA / ELPS Concept Building',
      diagramNodes: [
        { stage: 'E — Experience', title: 'Concrete Objects', detail: 'Use sticks, seeds, fraction strips, and measuring cups in hands-on tasks.' },
        { stage: 'L — Language', title: 'Oral Reasoning', detail: 'Learners explain "how" and "why" in their own words.' },
        { stage: 'P — Pictures', title: 'Visual Models', detail: 'Number lines, bar models, Venn diagrams, and food-chain sketches.' },
        { stage: 'S — Symbols', title: 'Abstract Notation', detail: 'Equations, algorithms, units, and formal scientific laws.' }
      ],
      references: [
        { label: 'NCERT: Pedagogy of Mathematics & EVS at Primary/Upper Primary Stage', url: 'https://ncert.nic.in/' },
        { label: 'BSE Odisha: OTET Paper I & II Syllabus', url: 'https://www.bseodisha.ac.in/' }
      ],
      quiz: [
        {
          id: 'otet-m3-q1',
          question: 'In primary Mathematics pedagogy, what does the "ELPS" sequence stand for?',
          options: [
            'Exam -> Lecture -> Practice -> Score',
            'Experience -> Language -> Pictures -> Symbols',
            'Equations -> Logic -> Proofs -> Sums',
            'Evaluation -> Learning -> Planning -> Testing'
          ],
          answerIndex: 1,
          explanation: 'ELPS moves learners from concrete Experience and Language to Pictures and finally abstract Symbols.'
        },
        {
          id: 'otet-m3-q2',
          question: 'Why is EVS taught as an integrated subject in Classes III–V instead of separate Physics, Chemistry, and History?',
          options: [
            'To reduce textbook printing cost only',
            'Because young children perceive their environment holistically rather than in rigid disciplinary silos',
            'Because science is not important in primary school',
            'To avoid outdoor field visits'
          ],
          answerIndex: 1,
          explanation: 'Primary learners understand the world holistically; integrated EVS links natural, social, and cultural perspectives.'
        },
        {
          id: 'otet-m3-q3',
          question: 'If a student writes 1/3 > 1/2 because 3 > 2, what should the teacher do first?',
          options: [
            'Mark zero and move to the next chapter',
            'Use concrete paper-folding or fraction strips to show equal wholes divided into 2 vs. 3 parts',
            'Give 50 multiplication sums as homework',
            'Ask the student to memorise "1/2 is bigger"'
          ],
          answerIndex: 1,
          explanation: 'Visual/concrete fraction models directly resolve whole-number overgeneralisation errors.'
        }
      ]
    },
    {
      id: 'otet-m4-inclusive-nep',
      number: 4,
      title: 'Inclusive Education, Assessment & NEP 2020',
      titleOr: 'ସମାବେଶୀ ଶିକ୍ଷା, ମୂଲ୍ୟାଙ୍କନ ଏବଂ NEP 2020',
      outcomes: [
        'Differentiate Inclusive Education from Integrated Education under RPwD Act 2016 and RTE Act 2009.',
        'Identify accommodations for Dyslexia, Dyscalculia, ADHD, visual/hearing impairments, and gifted learners.',
        'Use Continuous and Comprehensive Evaluation (CCE), rubrics, and Competency-Based Assessment (NEP 2020).'
      ],
      notes: [
        {
          lead: 'Inclusive Education Principle:',
          text: 'The school adapts its curriculum, seating, TLM, and assessment to fit every child—not the child forced to fit a rigid system.'
        },
        {
          lead: 'Assessment FOR vs. OF Learning:',
          text: 'Formative assessment (assessment FOR learning) happens during instruction to guide feedback; summative assessment (OF learning) summarises mastery at term end.'
        },
        {
          lead: 'NEP 2020 & PARAKH:',
          text: 'Shifts from high-stakes rote testing toward 360-degree Holistic Progress Cards and competency-based questions.'
        }
      ],
      diagramTitle: 'Visual Matrix: Assessment & Inclusion Pillars',
      diagramNodes: [
        { stage: 'UDL', title: 'Universal Design', detail: 'Multiple means of representation, expression, and engagement for all learners.' },
        { stage: 'CCE', title: 'Formative Checks', detail: 'Portfolios, peer checks, observation rubrics, and exit tickets.' },
        { stage: 'RPwD 2016', title: '21 Benchmark Needs', detail: 'Scribe support, extra time, Braille/large print, and ramp/WASH access.' },
        { stage: 'RTE 2009', title: 'Child Rights', detail: 'Free compulsory schooling ages 6–14, no detention/corporal punishment.' }
      ],
      references: [
        { label: 'Ministry of Education: NEP 2020 Policy Document', url: 'https://www.education.gov.in/' },
        { label: 'DEPwD: Rights of Persons with Disabilities (RPwD) Act 2016', url: 'https://depwd.gov.in/' }
      ],
      quiz: [
        {
          id: 'otet-m4-q1',
          question: 'Which learning difficulty specifically affects number sense, arithmetic operations, and spatial calculation?',
          options: ['Dyslexia', 'Dyscalculia', 'Dysgraphia', 'Aphasia'],
          answerIndex: 1,
          explanation: 'Dyscalculia affects mathematical reasoning and number sense; Dyslexia affects reading, and Dysgraphia affects writing.'
        },
        {
          id: 'otet-m4-q2',
          question: 'Which of the following is an example of "Assessment FOR Learning" (Formative Assessment)?',
          options: [
            'Annual final board examination',
            'Diagnostic exit-slip check mid-lesson to adjust next-day reteaching',
            'Publishing state merit rank lists',
            'End-of-year promotion certificate'
          ],
          answerIndex: 1,
          explanation: 'Formative assessment happens during learning to provide immediate feedback and adapt teaching.'
        },
        {
          id: 'otet-m4-q3',
          question: 'What is the core difference between Inclusive Education and mere Integration?',
          options: [
            'Inclusion requires children with disabilities to attend separate schools',
            'Inclusion adapts school pedagogy, infrastructure, and attitudes so every child learns together meaningfully',
            'Integration provides free uniforms only',
            'There is no difference between the two'
          ],
          answerIndex: 1,
          explanation: 'Inclusion transforms the learning environment to welcome diverse learners rather than expecting learners to assimilate unchanged.'
        }
      ]
    },
    {
      id: 'otet-m5-strategy',
      number: 5,
      title: 'OTET / OSSTET Exam Pattern & PYQ Strategy',
      titleOr: 'OTET / OSSTET ପରୀକ୍ଷା ଢାଞ୍ଚା ଏବଂ ପୂର୍ବ ବର୍ଷ ପ୍ରଶ୍ନ ରଣନୀତି',
      outcomes: [
        'Map Paper I (Classes I–V) and Paper II (Classes VI–VIII) marks, qualifying thresholds, and OSSTET secondary streams.',
        'Apply elimination and time-boxing strategies across 150 MCQs in 150 minutes (zero negative marking in OTET).',
        'Build a 4-week Previous-Year Question (PYQ) revision cycle using the CSO Mistake Deck.'
      ],
      notes: [
        {
          lead: 'OTET Structure (150 Marks / 150 Mins):',
          text: 'Paper I covers CDP (30), Language I Odia (30), Language II English (30), Math (30), and EVS (30). Paper II covers CDP (30), Lang I (30), Lang II (30), and Math+Science OR Social Studies (60).'
        },
        {
          lead: 'OSSTET Structure (150 Marks / 150 Mins):',
          text: 'Compulsory Language I Odia (20), Language II English (20), Stream Content (60: PCM/CBZ/Arts/Hindi/Sanskrit/PET), and Pedagogy + Evaluation (50).'
        },
        {
          lead: 'Zero-Penalty Execution:',
          text: 'Check the latest BSE Odisha notification for negative marking rules; in OTET (no negative marking), attempt all 150 questions using a 2-pass sweep (easy first, flagged second).'
        }
      ],
      diagramTitle: 'Visual Exam Plan: 150-Minute 2-Pass MCQ Execution',
      diagramNodes: [
        { stage: 'Pass 1 (0–90m)', title: 'Sure-Shot Sweep', detail: 'Answer direct CDP, Language, and NCERT/SCERT concept MCQs at ~45s each.' },
        { stage: 'Pass 2 (90–130m)', title: 'Calculation & Passages', detail: 'Solve Math numericals, unseen comprehensions, and assertion-reason items.' },
        { stage: 'Pass 3 (130–145m)', title: 'Elimination & Review', detail: 'Apply 2-option elimination on flagged pedagogy items; verify OMR alignment.' },
        { stage: 'Post-Mock', title: 'Mistake Deck Loop', detail: 'Tag missed PYQs by topic and revise every 48 hours before exam day.' }
      ],
      references: [
        { label: 'BSE Odisha: OTET / OSSTET Official Portal & Notifications', url: 'https://www.bseodisha.ac.in/' },
        { label: 'CSOdisha Mock Tests & Practice Hub', url: '/mock-tests/' }
      ],
      quiz: [
        {
          id: 'otet-m5-q1',
          question: 'How many total questions and minutes are allotted in OTET Paper I and Paper II?',
          options: [
            '100 questions in 90 minutes',
            '150 questions in 150 minutes (2.5 hours)',
            '200 questions in 180 minutes',
            '120 questions in 120 minutes'
          ],
          answerIndex: 1,
          explanation: 'Both OTET Paper I and Paper II consist of 150 MCQs for 150 marks in 2 hours 30 minutes.'
        },
        {
          id: 'otet-m5-q2',
          question: 'In OSSTET, which section carries 50 marks across all streams?',
          options: [
            'Computer Literacy',
            'Child Development, Pedagogy, School Management & Evaluation',
            'Current Affairs',
            'General Knowledge of World History'
          ],
          answerIndex: 1,
          explanation: 'Section IV of OSSTET tests Child Development, Pedagogy, School Management & Evaluation for 50 marks.'
        },
        {
          id: 'otet-m5-q3',
          question: 'What is the most effective way to handle a lengthy Math calculation or comprehension question in Pass 1?',
          options: [
            'Spend 8 minutes on it immediately',
            'Flag it for Pass 2 and secure quick CDP/Language marks first',
            'Leave the exam hall early',
            'Skip the entire Language section'
          ],
          answerIndex: 1,
          explanation: 'A 2-pass sweep prevents time traps on single tough questions and maximises total attempts.'
        }
      ]
    }
  ];

  var api = {
    PROGRESS_KEY: PROGRESS_KEY,
    EXAM_PREFIX: EXAM_PREFIX,
    MODULES: OTET_MODULES
  };

  root.CSOOtetCourse = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root.CSOCourseHub && typeof root.CSOCourseHub.mount === 'function') {
    root.CSOCourseHub.mount({
      progressKey: PROGRESS_KEY,
      examPrefix: EXAM_PREFIX,
      modules: OTET_MODULES
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
