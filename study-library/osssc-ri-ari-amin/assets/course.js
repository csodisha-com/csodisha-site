(function (root) {
  'use strict';

  var PROGRESS_KEY = 'cso_osssc_ri_course_progress';
  var EXAM_PREFIX = 'OSSSC RI/ARI/Amin';

  var OSSSC_MODULES = [
    {
      id: 'osssc-m1-arithmetic',
      number: 1,
      title: 'Arithmetic, Mensuration & Land Measurement Basics',
      titleOr: 'ଗଣିତ, କ୍ଷେତ୍ରମିତି ଏବଂ ଭୂମି ମାପ ମୌଳିକ ଧାରଣା',
      outcomes: [
        'Solve percentage, ratio-proportion, profit-loss, SI/CI, and time-work problems rapidly without calculators.',
        'Compute areas and perimeters of triangles, rectangles, circles, and irregular field plots in Odisha land surveys.',
        'Convert standard Odisha land units (Decimal, Guntha, Acre, Hectare, Square Links).'
      ],
      notes: [
        {
          lead: 'Odisha Land Units:',
          text: '1 Acre = 100 Decimals = 4,046.86 sq. metres = 43,560 sq. feet; 1 Guntha (Odisha standard) = 4 Decimals = 1,742.4 sq. feet; 1 Hectare = 2.471 Acres.'
        },
        {
          lead: 'High-Yield Arithmetic:',
          text: 'Percentages, ratios, averages, time & distance, and compound interest account for over 60% of OSSSC quantitative questions.'
        },
        {
          lead: 'Mensuration Formulas:',
          text: 'Master 2D areas (Heron’s formula for triangles, trapezium = 1/2 × (a+b) × h) and 3D volumes (cylinder, cone, sphere).'
        }
      ],
      diagramTitle: 'Visual Framework: Land Survey & Mensuration Conversion Chain',
      diagramNodes: [
        { stage: 'Unit 1', title: '100 Links = 1 Chain', detail: 'Gunter’s chain (66 ft) used in Odisha cadastral/Amin surveys.' },
        { stage: 'Unit 2', title: '10 Sq. Chains = 1 Acre', detail: '1 Acre equals 100 Decimals or 100,000 square links.' },
        { stage: 'Unit 3', title: '1 Hectare = 2.47 Acres', detail: 'Metric Record-of-Rights (RoR / Patta) conversion standard.' },
        { stage: 'Unit 4', title: '2D & 3D Geometry', detail: 'Trapezium, triangle, and cylinder formulas for RI/SFS.' }
      ],
      references: [
        { label: 'OSSSC: Official Combined Recruitment Syllabus & Rules', url: 'https://www.osssc.gov.in/Public/OSSSC/Default.aspx' },
        { label: 'Bhulekh Odisha: Land Records & RoR Terminology', url: 'https://bhulekh.ori.nic.in/' }
      ],
      quiz: [
        {
          id: 'osssc-m1-q1',
          question: 'How many Decimals make 1 Acre in Odisha land measurement?',
          options: ['10 Decimals', '40 Decimals', '100 Decimals', '1,000 Decimals'],
          answerIndex: 2,
          explanation: '1 Acre equals 100 Decimals (approximately 4,046.86 square metres).'
        },
        {
          id: 'osssc-m1-q2',
          question: 'A rectangular plot measures 50 m by 40 m. What is its area in square metres?',
          options: ['180 sq. m', '900 sq. m', '2,000 sq. m', '4,000 sq. m'],
          answerIndex: 2,
          explanation: 'Area of rectangle = length × breadth = 50 × 40 = 2,000 sq. m.'
        },
        {
          id: 'osssc-m1-q3',
          question: 'If an article bought for Rs. 800 is sold for Rs. 920, what is the profit percentage?',
          options: ['12%', '15%', '18%', '20%'],
          answerIndex: 1,
          explanation: 'Profit = 120; Profit % = (120 / 800) × 100 = 15%.'
        }
      ]
    },
    {
      id: 'osssc-m2-odisha-gk',
      number: 2,
      title: 'General Awareness & Odisha GK (Districts, Schemes, Geography)',
      titleOr: 'ସାଧାରଣ ଜ୍ଞାନ ଏବଂ ଓଡ଼ିଶା GK (ଜିଲ୍ଲା, ଯୋଜନା, ଭୂଗୋଳ)',
      outcomes: [
        'Recall Odisha’s 30 districts, river basins, wildlife sanctuaries, and mineral belts.',
        'Connect flagship Odisha welfare schemes (Subhadra, BSKY/Gopabandhu Jan Arogya, KALIA/CM-Kisan) to implementing departments.',
        'Track national current affairs, constitutional bodies, and Indian Freedom Struggle milestones.'
      ],
      notes: [
        {
          lead: 'Districts & Rivers:',
          text: 'Mahanadi (Hirakud Dam), Brahmani (Rengali), Baitarani, Subarnarekha, Rushikulya, and Indravati form Odisha’s core river network.'
        },
        {
          lead: 'Revenue Administration:',
          text: 'Odisha is divided into 3 Revenue Divisions (Central-Cuttack, Northern-Sambalpur, Southern-Berhampur), 30 Districts, 58 Sub-divisions, and 317 Tahasils.'
        },
        {
          lead: 'Flagship Schemes:',
          text: 'Know eligibility and nodal departments for state nutrition, women empowerment, and farmer support schemes.'
        }
      ],
      diagramTitle: 'Visual Framework: Odisha Revenue & Administrative Hierarchy',
      diagramNodes: [
        { stage: 'Division', title: '3 RDCs', detail: 'Central (Cuttack), Northern (Sambalpur), Southern (Berhampur).' },
        { stage: 'District', title: '30 Districts', detail: 'Headed by District Collector & Magistrate.' },
        { stage: 'Tahasil', title: '317 Tahasils', detail: 'Tahasildar oversees land revenue, mutation & RI circles.' },
        { stage: 'RI Circle', title: 'RI / ARI / Amin', detail: 'Field-level revenue collection, demarcation & disaster relief.' }
      ],
      references: [
        { label: 'Government of Odisha: Official State Portal', url: 'https://odisha.gov.in/' },
        { label: 'OSSSC: Official Notifications & Exam Calendar', url: 'https://www.osssc.gov.in/Public/OSSSC/Default.aspx' }
      ],
      quiz: [
        {
          id: 'osssc-m2-q1',
          question: 'How many Revenue Divisions (RDCs) exist in Odisha?',
          options: ['2', '3', '5', '7'],
          answerIndex: 1,
          explanation: 'Odisha has 3 Revenue Divisions: Central (Cuttack), Northern (Sambalpur), and Southern (Berhampur).'
        },
        {
          id: 'osssc-m2-q2',
          question: 'Which river is known as the "Sorrow of Odisha" historically due to delta floods, now moderated by Hirakud Dam?',
          options: ['Baitarani', 'Subarnarekha', 'Mahanadi', 'Rushikulya'],
          answerIndex: 2,
          explanation: 'Hirakud Dam on the Mahanadi River in Sambalpur regulates floodwaters across the delta.'
        },
        {
          id: 'osssc-m2-q3',
          question: 'At the field level, which officer directly supervises Revenue Inspector (RI) circles for land mutation and revenue?',
          options: ['Tahasildar', 'Block Education Officer', 'Inspector of Police', 'Forest Ranger'],
          answerIndex: 0,
          explanation: 'The Tahasildar heads the Tahasil revenue office and supervises RI, ARI, and Amin staff.'
        }
      ]
    },
    {
      id: 'osssc-m3-grammar',
      number: 3,
      title: 'English & Odia Language Grammar',
      titleOr: 'ଇଂରାଜୀ ଏବଂ ଓଡ଼ିଆ ବ୍ୟାକରଣ',
      outcomes: [
        'Apply English tenses, active-passive voice, direct-indirect speech, prepositions, and error spotting.',
        'Master Odia Sandhi, Samasa, Karaka-Vibhakti, Krudanta-Taddhita, and spelling correction (ଅଶୁଦ୍ଧି ସଂଶୋଧନ).',
        'Translate short administrative sentences accurately between Odia and English.'
      ],
      notes: [
        {
          lead: 'English Core:',
          text: 'Subject-verb agreement, conditional sentences, phrasal verbs, synonyms/antonyms, and one-word substitutions are recurring in OSSSC papers.'
        },
        {
          lead: 'Odia Grammar:',
          text: 'Focus on ବିପରୀତ ଶବ୍ଦ (antonyms), ପ୍ରତିଶବ୍ଦ (synonyms), ରୂଢ଼ି ପ୍ରୟୋଗ (idioms), and ବାକ୍ୟ ସଂଶୋଧନ (sentence correction).'
        },
        {
          lead: 'Comprehension Speed:',
          text: 'Read the questions before scanning the passage to locate exact factual answers in under 2 minutes.'
        }
      ],
      diagramTitle: 'Visual Framework: High-Scoring Language Grammar Pillars',
      diagramNodes: [
        { stage: 'Odia 1', title: 'Sandhi & Samasa', detail: 'Word formation, compound words & Vibhakti rules.' },
        { stage: 'Odia 2', title: 'Shuddha Banana', detail: 'Correct spelling, idioms (Rudhi) & one-word terms.' },
        { stage: 'English 1', title: 'Voice & Narration', detail: 'Active/Passive and Direct/Indirect transformations.' },
        { stage: 'English 2', title: 'Error Spotting', detail: 'Subject-verb agreement, articles & prepositions.' }
      ],
      references: [
        { label: 'BSE Odisha: Odia & English Grammar Textbooks', url: 'https://www.bseodisha.ac.in/' },
        { label: 'OSSSC: Sample Question Papers Archive', url: 'https://www.osssc.gov.in/Public/OSSSC/Default.aspx' }
      ],
      quiz: [
        {
          id: 'osssc-m3-q1',
          question: 'Choose the correct passive voice of: "The Tahasildar signed the order."',
          options: [
            'The order was signed by the Tahasildar.',
            'The order is signed by the Tahasildar.',
            'The order had signed by the Tahasildar.',
            'The Tahasildar was signed the order.'
          ],
          answerIndex: 0,
          explanation: 'Simple past active ("signed") converts to "was/were + past participle" ("was signed").'
        },
        {
          id: 'osssc-m3-q2',
          question: 'Which sentence has correct subject-verb agreement?',
          options: [
            'Neither of the applicants have arrived.',
            'Neither of the applicants has arrived.',
            'Each of the students are present.',
            'The committee are divided in its single opinion.'
          ],
          answerIndex: 1,
          explanation: '"Neither of + plural noun" takes a singular verb ("has").'
        },
        {
          id: 'osssc-m3-q3',
          question: 'In Odia grammar, "ଅନ୍ଧର ଲଉଡ଼ି" is an example of:',
          options: ['ସନ୍ଧି (Sandhi)', 'ରୂଢ଼ି (Idiom)', 'କାରକ (Case)', 'ବିଶେଷଣ (Adjective)'],
          answerIndex: 1,
          explanation: '"ଅନ୍ଧର ଲଉଡ଼ି" (sole support of a helpless person) is a classic Odia idiom (ରୂଢ଼ି).'
        }
      ]
    },
    {
      id: 'osssc-m4-computer',
      number: 4,
      title: 'Computer Fundamentals & Practical Office Skills',
      titleOr: 'କମ୍ପ୍ୟୁଟର ମୌଳିକ ଜ୍ଞାନ ଏବଂ ଅଫିସ୍ ଦକ୍ଷତା',
      outcomes: [
        'Distinguish hardware, OS, memory hierarchy (RAM, ROM, Cache), and networking protocols.',
        'Use MS Word, Excel formulas (SUM, AVERAGE, IF, VLOOKUP), and PowerPoint shortcuts for the Skill Test.',
        'Identify common cybersecurity threats (phishing, ransomware, 2FA) in e-Governance portals.'
      ],
      notes: [
        {
          lead: 'Excel & Word Shortcuts:',
          text: 'Ctrl+S (Save), Ctrl+Shift+L (Filter in Excel), F2 (Edit cell), Ctrl+; (Insert date), and Mail Merge in MS Word.'
        },
        {
          lead: 'Memory & Storage:',
          text: '1 Byte = 8 Bits; 1 KB = 1024 Bytes; Cache is faster than RAM, while SSD/HDD provide non-volatile storage.'
        },
        {
          lead: 'Networking & E-Governance:',
          text: 'Understand HTTP vs. HTTPS, DNS, IPv4/IPv6, LAN/WAN, and PDF/CSV digital record handling.'
        }
      ],
      diagramTitle: 'Visual Framework: Computer Skill Stack for OSSSC',
      diagramNodes: [
        { stage: 'Hardware', title: 'CPU & Memory', detail: 'ALU, Control Unit, Cache, RAM, ROM & I/O devices.' },
        { stage: 'OS & Files', title: 'Windows & PDF', detail: 'File extensions (.docx, .xlsx, .csv, .pdf) & shortcuts.' },
        { stage: 'MS Office', title: 'Word & Excel', detail: 'Formulas, Pivot basics, Mail Merge & page layout.' },
        { stage: 'Security', title: 'Cyber Hygiene', detail: 'HTTPS, strong passwords, phishing & backup habits.' }
      ],
      references: [
        { label: 'OSSSC: Computer Practical Skill Test Guidelines', url: 'https://www.osssc.gov.in/Public/OSSSC/Default.aspx' },
        { label: 'NIC India: Digital India & Cyber Security Basics', url: 'https://www.nic.in/' }
      ],
      quiz: [
        {
          id: 'osssc-m4-q1',
          question: 'In MS Excel, every formula must begin with which symbol?',
          options: ['#', '@', '=', '$'],
          answerIndex: 2,
          explanation: 'Excel evaluates formulas when the cell entry starts with an equals sign (=).'
        },
        {
          id: 'osssc-m4-q2',
          question: 'Which memory is volatile and loses its data when power is switched off?',
          options: ['ROM', 'SSD', 'RAM', 'Optical Disc'],
          answerIndex: 2,
          explanation: 'RAM (Random Access Memory) is volatile working memory.'
        },
        {
          id: 'osssc-m4-q3',
          question: 'Which shortcut key opens the Find & Replace dialog in MS Word?',
          options: ['Ctrl + F', 'Ctrl + H', 'Ctrl + K', 'Alt + F4'],
          answerIndex: 1,
          explanation: 'Ctrl + H opens Find and Replace directly in MS Word.'
        }
      ]
    },
    {
      id: 'osssc-m5-strategy',
      number: 5,
      title: 'OSSSC Combined Recruitment Exam Pattern & Mock Strategy',
      titleOr: 'OSSSC ମିଳିତ ନିଯୁକ୍ତି ପରୀକ୍ଷା ପ୍ୟାଟର୍ନ ଏବଂ ମକ୍ ରଣନୀତି',
      outcomes: [
        'Navigate the two-tier Preliminary + Main CBT structure and negative marking rules.',
        'Balance accuracy vs. speed across 100-question Prelims and 180-question Mains papers.',
        'Maintain an error log (Mistake Deck) for weak topics in Mensuration, Odia, and Computer.'
      ],
      notes: [
        {
          lead: 'Negative Marking Discipline:',
          text: 'OSSSC typically deducts 1/3rd mark per wrong MCQ—avoid blind guessing when fewer than two options are eliminated.'
        },
        {
          lead: 'Prelims vs. Mains:',
          text: 'Prelims screens candidates (~5× vacancies); final merit depends on Mains marks plus qualifying Practical Skill Test.'
        },
        {
          lead: 'Mock Review Loop:',
          text: 'Spend equal time analysing wrong and skipped questions as taking the mock test itself.'
        }
      ],
      diagramTitle: 'Visual Framework: OSSSC Combined Recruitment Selection Flow',
      diagramNodes: [
        { stage: 'Stage 1', title: 'Preliminary Exam', detail: 'Screening CBT across Math, GK, English, Odia & Reasoning.' },
        { stage: 'Stage 2', title: 'Main Written Exam', detail: 'Merit-deciding multi-subject objective paper.' },
        { stage: 'Stage 3', title: 'Practical Skill Test', detail: 'Qualifying MS Office & Computer proficiency test.' },
        { stage: 'Stage 4', title: 'Document Verification', detail: 'Original certificates, caste/resident & district preference.' }
      ],
      references: [
        { label: 'OSSSC: Official Exam Calendar & Results', url: 'https://www.osssc.gov.in/Public/OSSSC/Default.aspx' },
        { label: 'CS Odisha: Free CBT Mock Tests Hub', url: 'https://csodisha.com/mock-tests/' }
      ],
      quiz: [
        {
          id: 'osssc-m5-q1',
          question: 'With 1/3rd negative marking per wrong answer, when is guessing mathematically unfavourable?',
          options: [
            'When you know the exact answer',
            'When you have zero idea among 4 options (25% chance)',
            'When you eliminated 3 options',
            'When there is no negative marking'
          ],
          answerIndex: 1,
          explanation: 'With 4 random options and -1/3 penalty, expected gain is 0 or negative if time is wasted; always eliminate options first.'
        },
        {
          id: 'osssc-m5-q2',
          question: 'Which stage is qualifying in nature for OSSSC RI/ARI/Amin after the Mains exam?',
          options: ['Physical Endurance Test', 'Practical Computer Skill Test', 'Group Discussion', 'Viva-Voce'],
          answerIndex: 1,
          explanation: 'Candidates shortlisted from Mains appear for the qualifying Practical Skill Test in Basic Computer Skills.'
        },
        {
          id: 'osssc-m5-q3',
          question: 'What is the most effective post-mock habit?',
          options: [
            'Checking only the total score and closing the tab',
            'Logging missed questions into a Mistake Deck and revising them within 48 hours',
            'Skipping Mains topics until results are out',
            'Memorising question numbers'
          ],
          answerIndex: 1,
          explanation: 'Active error-log revision turns weak areas into reliable marks on exam day.'
        }
      ]
    }
  ];

  var api = {
    PROGRESS_KEY: PROGRESS_KEY,
    EXAM_PREFIX: EXAM_PREFIX,
    MODULES: OSSSC_MODULES
  };

  root.CSOOssscCourse = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root.CSOCourseHub && typeof root.CSOCourseHub.mount === 'function') {
    root.CSOCourseHub.mount({
      progressKey: PROGRESS_KEY,
      examPrefix: EXAM_PREFIX,
      modules: OSSSC_MODULES
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
