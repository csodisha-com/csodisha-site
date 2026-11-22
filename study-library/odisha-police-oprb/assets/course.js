(function (root) {
  'use strict';

  var PROGRESS_KEY = 'cso_oprb_course_progress';
  var EXAM_PREFIX = 'Odisha Police OPRB';

  var OPRB_MODULES = [
    {
      id: 'oprb-m1-selection',
      number: 1,
      title: 'Odisha Police Selection Stages, CBT Pattern & PET/PMT Standards',
      titleOr: 'ଓଡ଼ିଶା ପୋଲିସ ଚୟନ ପର୍ଯ୍ୟାୟ, CBT ପ୍ୟାଟର୍ନ ଏବଂ PET/PMT ମାନଦଣ୍ଡ',
      outcomes: [
        'Understand the 4-stage Odisha Police recruitment flow: CBT, PMT, PET, and Medical/Document Verification.',
        'Benchmark height, chest, and 1.6 km / 3.2 km running timings for Male, Female, and reserved categories.',
        'Plan a combined daily schedule balancing CBT mock practice and physical endurance training.'
      ],
      notes: [
        {
          lead: 'CBT Written Exam:',
          text: 'Objective multiple-choice Computer Based Test with 0.25 negative marking per wrong answer; questions cover Odia, English, Arithmetic, Reasoning, GK, and Computer.'
        },
        {
          lead: 'PMT & PET Qualifying:',
          text: 'Physical Measurement Test (height/weight/chest) and Physical Efficiency Test (running, long jump) are qualifying hurdles—failing PET disqualifies even high CBT scorers.'
        },
        {
          lead: 'Document Readiness:',
          text: 'Keep original +2 / Graduation certificates, Odia language pass proof, Residence, Caste/SEBC, and Driving Licence (where applicable) ready.'
        }
      ],
      diagramTitle: 'Visual Framework: Odisha Police 4-Stage Selection Pipeline',
      diagramNodes: [
        { stage: 'Stage 1', title: 'Written CBT', detail: 'Objective test deciding shortlist & final merit ranking.' },
        { stage: 'Stage 2', title: 'PMT Screening', detail: 'Height, weight & chest measurement per category norms.' },
        { stage: 'Stage 3', title: 'PET Endurance', detail: 'Timed 1.6 km run & broad jump qualifying standards.' },
        { stage: 'Stage 4', title: 'Medical & DV', detail: 'Vision/medical fitness and original certificate check.' }
      ],
      references: [
        { label: 'Odisha Police: Official Recruitment & Circulars', url: 'https://odishapolice.gov.in/' },
        { label: 'CS Odisha: Police & Defence Jobs Explorer', url: 'https://csodisha.com/jobs-careers/police-defence/' }
      ],
      quiz: [
        {
          id: 'oprb-m1-q1',
          question: 'In Odisha Police Constable/SI recruitment, what is the role of the Physical Efficiency Test (PET)?',
          options: [
            'It replaces the written CBT completely',
            'It is a mandatory qualifying stage after CBT shortlisting',
            'Only candidates above age 35 take it',
            'It is optional for Constable posts'
          ],
          answerIndex: 1,
          explanation: 'Candidates shortlisted from the CBT must qualify in PMT and PET to remain eligible for final selection.'
        },
        {
          id: 'oprb-m1-q2',
          question: 'If an OPRB CBT carries 0.25 negative marking per wrong answer, how many wrong answers cancel 1 correct mark?',
          options: ['2', '3', '4', '5'],
          answerIndex: 2,
          explanation: 'Four wrong answers (4 × 0.25 = 1.00) deduct 1 full mark.'
        },
        {
          id: 'oprb-m1-q3',
          question: 'Which language proficiency is mandatory for Odisha Police Constable/SI eligibility?',
          options: [
            'Ability to read, write, and speak Odia',
            'French',
            'German',
            'No language requirement'
          ],
          answerIndex: 0,
          explanation: 'Candidates must be able to speak, read, and write Odia and have passed ME/HSC with Odia.'
        }
      ]
    },
    {
      id: 'oprb-m2-languages',
      number: 2,
      title: 'Odia & English Comprehension and Grammar',
      titleOr: 'ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀ ବୋଧଗମ୍ୟତା ଏବଂ ବ୍ୟାକରଣ',
      outcomes: [
        'Solve reading comprehension passages accurately in both English and Odia.',
        'Master parts of speech, prepositions, tenses, idioms, and active/passive voice.',
        'Eliminate common Odia spelling (ଶୁଦ୍ଧ ବନାନ) and Sandhi/Samasa errors.'
      ],
      notes: [
        {
          lead: 'Odia Comprehension:',
          text: 'Practice unseen Odia prose passages and identify central theme, synonyms (ପ୍ରତିଶବ୍ଦ), and antonyms (ବିପରୀତ ଶବ୍ଦ).'
        },
        {
          lead: 'English Grammar Core:',
          text: 'Focus on prepositions (in/on/at/by/with), phrasal verbs, articles, and direct-indirect speech.'
        },
        {
          lead: 'Vocabulary Building:',
          text: 'Revise 15 high-frequency one-word substitutions and official administrative terms daily.'
        }
      ],
      diagramTitle: 'Visual Framework: Bilingual Language Scoring Matrix',
      diagramNodes: [
        { stage: 'Odia 1', title: 'Unseen Passage', detail: 'Inference, title selection & vocabulary in context.' },
        { stage: 'Odia 2', title: 'Grammar & Idioms', detail: 'Sandhi, Samasa, Krudanta & Shuddha Banana.' },
        { stage: 'English 1', title: 'Usage & Cloze', detail: 'Prepositions, articles, tenses & phrasal verbs.' },
        { stage: 'English 2', title: 'Voice & Speech', detail: 'Sentence transformation & error detection.' }
      ],
      references: [
        { label: 'BSE Odisha: High School Odia & English Grammar', url: 'https://www.bseodisha.ac.in/' },
        { label: 'Odisha Police: Official Model Syllabus', url: 'https://odishapolice.gov.in/' }
      ],
      quiz: [
        {
          id: 'oprb-m2-q1',
          question: 'Fill in the blank: "The patrol team arrived ___ the spot within ten minutes."',
          options: ['at', 'into', 'among', 'between'],
          answerIndex: 0,
          explanation: '"Arrive at" is used for a specific point, spot, or small location.'
        },
        {
          id: 'oprb-m2-q2',
          question: 'Choose the synonym of "VIGILANT":',
          options: ['Careless', 'Watchful', 'Sleepy', 'Reckless'],
          answerIndex: 1,
          explanation: '"Vigilant" means keeping careful watch for possible danger or difficulties.'
        },
        {
          id: 'oprb-m2-q3',
          question: 'In Odia, what is the antonym (ବିପରୀତ ଶବ୍ଦ) of "ଅନୁରାଗ"?',
          options: ['ପ୍ରେମ', 'ବିରାଗ', 'ସରାଗ', 'ଆନନ୍ଦ'],
          answerIndex: 1,
          explanation: 'ଅନୁରାଗ (affection/attachment) has the antonym ବିରାଗ (detachment/aversion).'
        }
      ]
    },
    {
      id: 'oprb-m3-quant-reasoning',
      number: 3,
      title: 'Arithmetic, Quantitative Aptitude & Logical Reasoning',
      titleOr: 'ଗଣିତ, ପରିମାଣାତ୍ମକ ଦକ୍ଷତା ଏବଂ ଯୁକ୍ତିଯୁକ୍ତ ତର୍କ',
      outcomes: [
        'Solve number series, coding-decoding, blood relations, direction sense, and syllogism questions.',
        'Compute percentages, averages, ratios, time-speed-distance, and simple interest quickly.',
        'Interpret bar charts, tables, and Venn diagrams in under 60 seconds per question.'
      ],
      notes: [
        {
          lead: 'Reasoning High-Yield:',
          text: 'Direction sense (N-E-S-W turns), blood relations, analogy, and mirror/water images are guaranteed marks in police CBTs.'
        },
        {
          lead: 'Speed & Distance:',
          text: 'Convert km/h to m/s by multiplying by 5/18; convert m/s to km/h by multiplying by 18/5.'
        },
        {
          lead: 'Mental Math:',
          text: 'Memorise squares up to 30, cubes up to 15, and fraction-to-percentage equivalents (1/6 = 16.67%, 1/8 = 12.5%).'
        }
      ],
      diagramTitle: 'Visual Framework: Quantitative & Reasoning Speed Toolkit',
      diagramNodes: [
        { stage: 'Number', title: 'Series & Coding', detail: 'Alphabet shifts, squares/cubes & difference patterns.' },
        { stage: 'Logic', title: 'Direction & Blood', detail: 'Compass diagrams & family-tree notation.' },
        { stage: 'Quant', title: 'Speed & Ratio', detail: '5/18 conversion, averages & percentage shortcuts.' },
        { stage: 'Data', title: 'DI & Venn', detail: 'Tables, bar graphs & syllogism overlap circles.' }
      ],
      references: [
        { label: 'Odisha Police: CBT Exam Guidelines', url: 'https://odishapolice.gov.in/' },
        { label: 'CS Odisha: Free CBT Practice Tests', url: 'https://csodisha.com/mock-tests/' }
      ],
      quiz: [
        {
          id: 'oprb-m3-q1',
          question: 'A police van travels at 72 km/h. What is its speed in metres per second (m/s)?',
          options: ['15 m/s', '18 m/s', '20 m/s', '25 m/s'],
          answerIndex: 2,
          explanation: '72 × (5 / 18) = 4 × 5 = 20 m/s.'
        },
        {
          id: 'oprb-m3-q2',
          question: 'Find the next number in the series: 3, 7, 15, 31, 63, ?',
          options: ['95', '125', '127', '131'],
          answerIndex: 2,
          explanation: 'Each term follows (previous × 2) + 1: 63 × 2 + 1 = 127.'
        },
        {
          id: 'oprb-m3-q3',
          question: 'Ravi walks 4 km North, turns right and walks 3 km East. How far is he from the starting point?',
          options: ['5 km', '6 km', '7 km', '1 km'],
          answerIndex: 0,
          explanation: 'By Pythagoras theorem: sqrt(4² + 3²) = sqrt(16 + 9) = 5 km.'
        }
      ]
    },
    {
      id: 'oprb-m4-gk-polity',
      number: 4,
      title: 'Odisha & National General Awareness, Polity & Current Affairs',
      titleOr: 'ଓଡ଼ିଶା ଏବଂ ଜାତୀୟ ସାଧାରଣ ଜ୍ଞାନ, ରାଜନୀତି ଏବଂ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ',
      outcomes: [
        'Recall Fundamental Rights, Directive Principles, Union/State Executive, and key Police/Law & Order constitutional entries.',
        'Identify Odisha’s geography, national parks, GI tags, cultural heritage, and freedom fighters.',
        'Track recent national awards, defence exercises, sports milestones, and Odisha government initiatives.'
      ],
      notes: [
        {
          lead: 'Polity & Constitution:',
          text: 'Police and Public Order fall under the State List (Seventh Schedule); Article 21 protects Life and Personal Liberty, and Article 22 covers arrest safeguards.'
        },
        {
          lead: 'Odisha Heritage & Geography:',
          text: 'Simlipal Biosphere Reserve (Mayurbhanj), Bhitarkanika (Kendrapara), Chilika Lake (Asia’s largest brackish lagoon), and Konark Sun Temple.'
        },
        {
          lead: 'Current Affairs Focus:',
          text: 'Cover the last 8–10 months of national appointments, ISRO missions, sports tournaments, and Odisha state awards.'
        }
      ],
      diagramTitle: 'Visual Framework: GK, Polity & Constitutional Safeguards',
      diagramNodes: [
        { stage: 'Polity 1', title: 'Fundamental Rights', detail: 'Articles 14–32, Writs (Habeas Corpus, Mandamus).' },
        { stage: 'Polity 2', title: '7th Schedule', detail: 'State List (Police/Public Order) & Concurrent List.' },
        { stage: 'Odisha', title: 'Parks & Rivers', detail: 'Simlipal, Bhitarkanika, Chilika & Mahanadi basin.' },
        { stage: 'Current', title: 'National & State', detail: 'ISRO, defence, sports & Odisha welfare updates.' }
      ],
      references: [
        { label: 'India Code / Constitution of India', url: 'https://legislative.gov.in/constitution-of-india/' },
        { label: 'Odisha State Portal: Know Odisha', url: 'https://odisha.gov.in/' }
      ],
      quiz: [
        {
          id: 'oprb-m4-q1',
          question: 'Under the Seventh Schedule of the Indian Constitution, "Police" and "Public Order" belong to which list?',
          options: ['Union List', 'State List', 'Concurrent List', 'Residuary List'],
          answerIndex: 1,
          explanation: 'Police (Entry 2) and Public Order (Entry 1) are subjects in the State List.'
        },
        {
          id: 'oprb-m4-q2',
          question: 'Which writ is issued by a court to produce a detained person before it to check the legality of detention?',
          options: ['Quo Warranto', 'Prohibition', 'Habeas Corpus', 'Certiorari'],
          answerIndex: 2,
          explanation: 'Habeas Corpus ("to have the body of") protects citizens against unlawful detention.'
        },
        {
          id: 'oprb-m4-q3',
          question: 'Bhitarkanika National Park, famous for saltwater crocodiles and mangroves, is in which Odisha district?',
          options: ['Sambalpur', 'Kendrapara', 'Koraput', 'Sundargarh'],
          answerIndex: 1,
          explanation: 'Bhitarkanika National Park is located in Kendrapara district in the Brahmani-Baitarani delta.'
        }
      ]
    },
    {
      id: 'oprb-m5-cyber-judgment',
      number: 5,
      title: 'Computer Basics, Cyber Awareness & Situational Judgment',
      titleOr: 'କମ୍ପ୍ୟୁଟର ମୌଳିକ ଜ୍ଞାନ, ସାଇବର ସଚେତନତା ଏବଂ ପରିସ୍ଥିତିଗତ ବିଚାର',
      outcomes: [
        'Recognise cybercrime typologies (OTP fraud, phishing, UPI spoofing, identity theft) and the national helpline 1930.',
        'Apply basic computer/internet concepts (IP address, MAC address, HTTPS, CCTNS) used in modern policing.',
        'Evaluate ethical, lawful, and calm situational-judgment responses in field policing scenarios.'
      ],
      notes: [
        {
          lead: 'Cyber Helpline 1930:',
          text: 'Immediate reporting on 1930 or cybercrime.gov.in within the golden hour enables freezing of fraudulent financial transfers.'
        },
        {
          lead: 'Digital Forensics Basics:',
          text: 'Understand IP addresses, browser history, two-factor authentication (2FA), and why OTPs/PINs are never shared by banks or police.'
        },
        {
          lead: 'Situational Judgment:',
          text: 'Prioritise human safety, de-escalation, chain-of-command reporting, and strict adherence to due process.'
        }
      ],
      diagramTitle: 'Visual Framework: Cyber Policing & Situational Response',
      diagramNodes: [
        { stage: 'Alert', title: 'Helpline 1930', detail: 'Golden-hour financial fraud reporting & cybercrime.gov.in.' },
        { stage: 'Threat', title: 'Phishing & OTP', detail: 'Spoofed links, fake KYC & screen-sharing scams.' },
        { stage: 'System', title: 'CCTNS & Networks', detail: 'Crime & Criminal Tracking Network, IP/MAC basics.' },
        { stage: 'Ethics', title: 'Field Judgment', detail: 'Public safety, de-escalation & lawful procedure.' }
      ],
      references: [
        { label: 'National Cyber Crime Reporting Portal', url: 'https://cybercrime.gov.in/' },
        { label: 'Odisha Police: Citizen & Cyber Safety Portal', url: 'https://odishapolice.gov.in/' }
      ],
      quiz: [
        {
          id: 'oprb-m5-q1',
          question: 'What is the national toll-free helpline number in India for immediate reporting of financial cyber fraud?',
          options: ['100', '108', '1930', '1098'],
          answerIndex: 2,
          explanation: '1930 is India’s national cybercrime financial fraud helpline.'
        },
        {
          id: 'oprb-m5-q2',
          question: 'If an unknown caller claims to be a bank officer asking for an OTP to prevent account blocking, what is this attack called?',
          options: ['Vishing / Social Engineering', 'Defragmentation', 'Cloud Backup', 'Compilation'],
          answerIndex: 0,
          explanation: 'Voice-based phishing to trick victims into revealing OTPs/credentials is called vishing.'
        },
        {
          id: 'oprb-m5-q3',
          question: 'On arriving first at a road accident scene during patrol, what should a constable prioritise?',
          options: [
            'Recording social media video first',
            'Securing the area, calling emergency medical aid (108/112), and ensuring traffic safety',
            'Leaving the scene immediately',
            'Arguing with bystanders'
          ],
          answerIndex: 1,
          explanation: 'Life safety, medical evacuation, and securing the scene come first in standard policing SOP.'
        }
      ]
    }
  ];

  var api = {
    PROGRESS_KEY: PROGRESS_KEY,
    EXAM_PREFIX: EXAM_PREFIX,
    MODULES: OPRB_MODULES
  };

  root.CSOOprbCourse = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root.CSOCourseHub && typeof root.CSOCourseHub.mount === 'function') {
    root.CSOCourseHub.mount({
      progressKey: PROGRESS_KEY,
      examPrefix: EXAM_PREFIX,
      modules: OPRB_MODULES
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
