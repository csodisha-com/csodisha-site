(function (root) {
  'use strict';

  var PROGRESS_KEY = 'cso_ece_course_progress';
  var MISTAKE_DECK_KEY = 'cso_study_mistake_deck';

  var ECE_MODULES = [
    {
      id: 'ece-m1-foundations',
      number: 1,
      title: 'Foundations of ECCE: NEP 2020, NCF-FS & NIPUN Bharat',
      titleOr: 'ମୌଳିକ ଶୈଶବ ଯତ୍ନ ଏବଂ ଶିକ୍ଷା (ECCE) ର ଭିତ୍ତିଭୂମି',
      outcomes: [
        'Explain the 5+3+3+4 curricular structure under NEP 2020 with focus on the 5-year Foundational Stage (ages 3–8).',
        'Identify the role of Anganwadi Centres (AWCs), Balvatikas, and Foundational Literacy & Numeracy (FLN) under NIPUN Bharat.',
        'Connect NCF-FS 2022 Panchakosha Vikas (5-fold development) to daily Anganwadi and pre-primary routines.'
      ],
      notes: [
        {
          lead: 'NEP 2020 Foundational Stage (Ages 3–8):',
          text: 'Combines 3 years of pre-primary / Anganwadi / Balvatika (ages 3–6) with Grades 1 and 2 (ages 6–8) into one continuous, play-based stage.'
        },
        {
          lead: 'NCF-FS 2022 & Panchakosha Vikas:',
          text: 'Focuses on holistic growth across Physical (Annamaya), Life Energy (Pranamaya), Emotional/Mental (Manomaya), Intellectual (Vijnanamaya), and Spiritual/Joyful (Anandamaya) domains.'
        },
        {
          lead: 'NIPUN Bharat Mission:',
          text: 'Aims for universal Foundational Literacy and Numeracy (FLN) by the end of Grade 3, starting with Balvatika readiness for 5–6 year olds.'
        }
      ],
      diagramTitle: 'Visual Framework: 5-Year Foundational Stage Pathway',
      diagramNodes: [
        { stage: 'Ages 3–4', title: 'AWC / Pre-School 1', detail: 'Sensory play, motor skills, emotional security, and oral mother-tongue songs.' },
        { stage: 'Ages 4–5', title: 'AWC / Pre-School 2', detail: 'Guided play, picture books, sorting/matching, and peer socialisation.' },
        { stage: 'Ages 5–6', title: 'Balvatika (Pre-Grade 1)', detail: 'Phonemic awareness, 1–10 number sense, and school-readiness routines.' },
        { stage: 'Ages 6–8', title: 'Grades 1 & 2 (FLN)', detail: 'NIPUN Lakshya targets in reading comprehension and basic numeracy.' }
      ],
      references: [
        { label: 'NCERT: National Curriculum Framework for Foundational Stage (NCF-FS 2022)', url: 'https://ncert.nic.in/ncf.php' },
        { label: 'Ministry of Education: NIPUN Bharat Guidelines', url: 'https://nipunbharat.education.gov.in/' },
        { label: 'SCERT Odisha: Pre-School & Foundational Curriculum Resources', url: 'https://scertodisha.nic.in/' }
      ],
      quiz: [
        {
          id: 'ece-m1-q1',
          question: 'Under NEP 2020, which age group is covered in the 5-year Foundational Stage?',
          options: ['Ages 0 to 5 years', 'Ages 3 to 8 years', 'Ages 6 to 11 years', 'Ages 4 to 9 years'],
          answerIndex: 1,
          explanation: 'The Foundational Stage in NEP 2020 spans 5 years for ages 3–8 (3 years of ECCE/Balvatika + Grades 1 & 2).'
        },
        {
          id: 'ece-m1-q2',
          question: 'In NCF-FS 2022, which five-fold framework guides holistic child development?',
          options: ['Bloom Taxonomy', 'Panchakosha Vikas', 'Tri-Language Formula', 'RTE Norms'],
          answerIndex: 1,
          explanation: 'NCF-FS 2022 uses the Panchakosha Vikas framework (Annamaya, Pranamaya, Manomaya, Vijnanamaya, Anandamaya).'
        },
        {
          id: 'ece-m1-q3',
          question: 'What is the primary national target of the NIPUN Bharat Mission?',
          options: [
            'Universal secondary board pass rate',
            'Foundational Literacy and Numeracy (FLN) by Grade 3',
            'Digital tablets for all college students',
            'Vocational coding from Grade 1'
          ],
          answerIndex: 1,
          explanation: 'NIPUN Bharat targets universal Foundational Literacy and Numeracy (FLN) by the end of Grade 3.'
        }
      ]
    },
    {
      id: 'ece-m2-milestones',
      number: 2,
      title: 'Developmental Milestones (0–6 Years)',
      titleOr: '୦–୬ ବର୍ଷ ଶିଶୁର ବିକାଶଗତ ମାଇଲଖୁଣ୍ଟ',
      outcomes: [
        'Track physical (gross & fine motor), cognitive, language, and socio-emotional milestones from birth to 6 years.',
        'Spot early developmental red flags for timely referral under RBSK (Rashtriya Bal Swasthya Karyakram).',
        'Design age-appropriate stimulation activities for infants, toddlers, and preschoolers.'
      ],
      notes: [
        {
          lead: 'First 1,000 Days (Conception to Age 2):',
          text: 'Over 80% of rapid brain synapse growth occurs by age 3; responsive caregiving, nutrition, and talk/singing are critical.'
        },
        {
          lead: 'Gross vs. Fine Motor Skills:',
          text: 'Gross motor covers sitting, walking, jumping, and balancing; fine motor covers palmar grasp, scribbling, bead stringing, and buttoning.'
        },
        {
          lead: 'Early Screening (RBSK):',
          text: 'Anganwadi workers observe 4 Ds—Defects at birth, Deficiencies, Diseases, and Developmental delays—for timely District Early Intervention Centre (DEIC) referral.'
        }
      ],
      diagramTitle: 'Visual Milestone Map: 0–6 Years Growth Markers',
      diagramNodes: [
        { stage: '0–1 Year', title: 'Infancy & Trust', detail: 'Social smile (2m), sits without support (6–8m), babbles, pincer grasp (~9m).' },
        { stage: '1–3 Years', title: 'Toddler Exploration', detail: 'Walks steadily, 2-word phrases by 24m, parallel play, stacks 4–6 blocks.' },
        { stage: '3–5 Years', title: 'Preschool Curiosity', detail: 'Hops on one foot, asks "Why?", shares toys, names colours and shapes.' },
        { stage: '5–6 Years', title: 'School Readiness', detail: 'Tells short stories, counts 1–10 with one-to-one correspondence, holds pencil steadily.' }
      ],
      references: [
        { label: 'MoWCD: Nurturing Care Framework & Early Childhood Milestones', url: 'https://wcd.nic.in/' },
        { label: 'NHM RBSK: Child Health Screening & Early Intervention', url: 'https://rbsk.gov.in/' }
      ],
      quiz: [
        {
          id: 'ece-m2-q1',
          question: 'Which activity best develops fine motor control in a 3–4 year old child?',
          options: [
            'Running across the playground',
            'Bead stringing and clay moulding',
            'Memorising multiplication tables',
            'Listening silently to a 45-minute lecture'
          ],
          answerIndex: 1,
          explanation: 'Bead stringing, clay moulding, and tearing/pasting strengthen small hand-finger muscles (fine motor skills).'
        },
        {
          id: 'ece-m2-q2',
          question: 'Under RBSK, what do the "4 Ds" stand for in child screening?',
          options: [
            'Diet, Discipline, Drawing, Dance',
            'Defects at birth, Deficiencies, Diseases, Developmental delays',
            'Data, Documentation, Delivery, Development',
            'Dental, Dermatology, Diabetes, Dialysis'
          ],
          answerIndex: 1,
          explanation: 'RBSK screens children 0–18 years for Defects at birth, Deficiencies, Diseases, and Developmental delays.'
        },
        {
          id: 'ece-m2-q3',
          question: 'Around what age do most children begin combining two-word phrases (e.g., "more milk")?',
          options: ['4 months', '18–24 months', '4 years', '6 years'],
          answerIndex: 1,
          explanation: 'Toddlers typically begin combining two-word phrases between 18 and 24 months.'
        }
      ]
    },
    {
      id: 'ece-m3-pedagogy',
      number: 3,
      title: 'Play-Based Pedagogy & Odisha Cultural Context',
      titleOr: 'ଖେଳ-ଆଧାରିତ ଶିକ୍ଷାଦାନ ଏବଂ ଓଡ଼ିଶାର ସାଂସ୍କୃତିକ ପରିବେଶ',
      outcomes: [
        'Structure a balanced Anganwadi daily timetable mixing free play, guided play, storytelling, and outdoor movement.',
        'Use low-cost local materials and Jaadui Pitara (Magic Box) kits for hands-on learning.',
        'Apply Mother-Tongue Based Multilingual Education (MTBMLE) across Odia and Odisha tribal languages.'
      ],
      notes: [
        {
          lead: 'Mother-Tongue First (MTBMLE):',
          text: 'Children learn concepts fastest in their home language—Odia or tribal languages such as Santali, Kui, Kuvi, Saora, and Ho—before bridging to additional languages.'
        },
        {
          lead: 'Jaadui Pitara & Activity Corners:',
          text: 'Set up four low-cost corners in the AWC: Story/Reading corner, Block/Puzzle corner, Pretend-Play/Doll corner, and Art/Nature corner.'
        },
        {
          lead: 'Local Odisha Folk Culture:',
          text: 'Use Odia rhymes (chhabila barnabodha songs), local seeds/pebbles/leaves for sorting, and familiar festivals/craft stories.'
        }
      ],
      diagramTitle: 'Visual Timetable: 4-Block Play-Based AWC Morning',
      diagramNodes: [
        { stage: 'Block 1 (30m)', title: 'Welcome & Circle Time', detail: 'Attendance song, hygiene check, weather/day talk in mother tongue.' },
        { stage: 'Block 2 (45m)', title: 'Guided Concept Play', detail: 'Sorting pebbles/leaves, shape matching, story cards from Jaadui Pitara.' },
        { stage: 'Block 3 (35m)', title: 'Free Corner & Art', detail: 'Child-chosen play in doll, block, or clay corners; scribbling/drawing.' },
        { stage: 'Block 4 (30m)', title: 'Outdoor & Story Wrap', detail: 'Balancing games, folk rhymes, handwashing, and Hot Cooked Meal.' }
      ],
      references: [
        { label: 'NCERT: Jaadui Pitara (Play-Based Learning-Teaching Material)', url: 'https://ncert.nic.in/' },
        { label: 'Odisha SCERT: Nua Arunima ECCE Activity Book', url: 'https://scertodisha.nic.in/' }
      ],
      quiz: [
        {
          id: 'ece-m3-q1',
          question: 'Why does NCF-FS 2022 recommend Mother-Tongue Based Multilingual Education (MTBMLE) in ECCE?',
          options: [
            'To avoid teaching reading altogether',
            'Because young children comprehend concepts and express freely in their home language first',
            'Because storybooks do not exist in English',
            'To reduce classroom playtime'
          ],
          answerIndex: 1,
          explanation: 'Young children build stronger vocabulary, emotional confidence, and conceptual clarity when taught in their home language first.'
        },
        {
          id: 'ece-m3-q2',
          question: 'What is "Jaadui Pitara" introduced under NCF-FS 2022?',
          options: [
            'A competitive entrance exam for age 4',
            'A play-based learning-teaching kit with toys, puzzles, flashcards, and storybooks',
            'An online video-only lecture series',
            'A biometric attendance device'
          ],
          answerIndex: 1,
          explanation: 'Jaadui Pitara is NCERT’s play-based kit containing toys, puppets, puzzles, posters, and storybooks for ages 3–8.'
        },
        {
          id: 'ece-m3-q3',
          question: 'Which classroom setup best supports child-led exploration in an Anganwadi Centre?',
          options: [
            'Fixed rows of benches facing a blackboard',
            'Activity corners (Reading, Blocks, Pretend-Play, Art) at child eye-level',
            'Keeping all toys locked in a cupboard',
            'Silent copying from textbooks'
          ],
          answerIndex: 1,
          explanation: 'Accessible activity corners let children choose, manipulate, and explore materials at their own pace.'
        }
      ]
    },
    {
      id: 'ece-m4-nutrition-safety',
      number: 4,
      title: 'Child Nutrition, Health, Hygiene & Safe Spaces',
      titleOr: 'ଶିଶୁ ପୋଷଣ, ସ୍ୱାସ୍ଥ୍ୟ, ପରିଚ୍ଛନ୍ନତା ଏବଂ ସୁରକ୍ଷିତ ପରିବେଶ',
      outcomes: [
        'Explain ICDS & POSHAN Abhiyaan supplementary nutrition norms (THR and Hot Cooked Meals).',
        'Interpret growth-monitoring indicators (Weight-for-Age, Height-for-Age, MUAC) for stunting and wasting.',
        'Maintain WASH standards (safe drinking water, 6-step handwashing, child-friendly toilets) and injury prevention.'
      ],
      notes: [
        {
          lead: 'ICDS Supplementary Nutrition:',
          text: 'Children 6m–3y receive Take-Home Ration (THR), while 3–6y AWC children receive morning snacks and a freshly prepared Hot Cooked Meal (HCM); SAM children receive enhanced calories/protein.'
        },
        {
          lead: 'Growth Monitoring (POSHAN Tracker):',
          text: 'Monthly weighing and height/length measurement identify underweight, stunting (low height-for-age), and wasting (low weight-for-height) early.'
        },
        {
          lead: 'WASH & Safe AWC Space:',
          text: 'Enforce handwashing with soap before meals and after toilet use, clean drinking water, hazard-free floor/corners, and a stocked first-aid kit.'
        }
      ],
      diagramTitle: 'Visual Cycle: Monthly AWC Growth & Nutrition Care',
      diagramNodes: [
        { stage: 'Step 1', title: 'Measure & Plot', detail: 'Monthly weight/height entry on Growth Chart & POSHAN Tracker.' },
        { stage: 'Step 2', title: 'Spot Red/Yellow Zones', detail: 'Identify moderately or severely underweight/wasted children early.' },
        { stage: 'Step 3', title: 'Targeted Nutrition + VHSND', detail: 'Provide HCM/THR, IFA/Vitamin A drops, and ANM/ASHA check-up.' },
        { stage: 'Step 4', title: 'Home Visit & WASH', detail: 'Counsel caregivers on diverse local diets, handwashing, and safe water.' }
      ],
      references: [
        { label: 'MoWCD: POSHAN Abhiyaan & ICDS Nutrition Guidelines', url: 'https://poshanabhiyaan.gov.in/' },
        { label: 'Women & Child Development Dept, Govt. of Odisha', url: 'https://wcd.odisha.gov.in/' }
      ],
      quiz: [
        {
          id: 'ece-m4-q1',
          question: 'In child growth monitoring, what does "stunting" specifically indicate?',
          options: [
            'Low height-for-age caused by chronic undernutrition',
            'Temporary fever for two days',
            'High birth weight',
            'Vitamin D excess'
          ],
          answerIndex: 0,
          explanation: 'Stunting is low height-for-age, reflecting chronic or recurrent undernutrition and illness.'
        },
        {
          id: 'ece-m4-q2',
          question: 'Which service is provided to 3–6 year old children attending an Anganwadi Centre daily?',
          options: [
            'Only packaged biscuits once a month',
            'Morning snack and Hot Cooked Meal (HCM) under ICDS',
            'Take-Home Ration only, no AWC meal',
            'Evening tuition classes'
          ],
          answerIndex: 1,
          explanation: 'Children aged 3–6 attending AWCs receive a morning snack and a Hot Cooked Meal (HCM) daily.'
        },
        {
          id: 'ece-m4-q3',
          question: 'When is handwashing with soap most critical in an Anganwadi Centre?',
          options: [
            'Only on Annual Day',
            'Before eating/serving meals and after using the toilet',
            'Only after outdoor painting',
            'Once a week on Fridays'
          ],
          answerIndex: 1,
          explanation: 'Handwashing with soap before meals and after toilet use prevents diarrhoeal diseases and parasitic infections.'
        }
      ]
    },
    {
      id: 'ece-m5-assessment-community',
      number: 5,
      title: 'Observation, Portfolio Assessment & Parent Engagement',
      titleOr: 'ପର୍ଯ୍ୟବେକ୍ଷଣ, ପୋର୍ଟଫୋଲିଓ ମୂଲ୍ୟାଙ୍କନ ଏବଂ ଅଭିଭାବକ ସହଭାଗୀତା',
      outcomes: [
        'Conduct continuous, non-threatening observation instead of written tests or ranking in ages 3–6.',
        'Maintain child portfolios, anecdotal notes, and Holistic Progress Cards (HPC) aligned with NCF-FS 2022.',
        'Facilitate ECCE Day, Mother’s Committee meetings, and home-based play tips with parents.'
      ],
      notes: [
        {
          lead: 'No Exams or Pass/Fail in ECCE:',
          text: 'NCF-FS 2022 prohibits written tests, rote grading, or ranking for young children; assessment must be formative and supportive.'
        },
        {
          lead: 'Portfolios & Anecdotal Records:',
          text: 'Collect dated drawings, craft samples, and brief 2-line teacher observations showing what a child can do and what support comes next.'
        },
        {
          lead: 'ECCE Day & Home Continuity:',
          text: 'Monthly ECCE Days invite parents and grandparents to see children’s portfolios and learn simple kitchen/home play ideas.'
        }
      ],
      diagramTitle: 'Visual Loop: Formative ECCE Assessment & Parent Partnership',
      diagramNodes: [
        { stage: 'Observe', title: 'Natural Play Watch', detail: 'Notice how the child shares, speaks, counts pebbles, or holds crayons.' },
        { stage: 'Document', title: 'Anecdote + Portfolio', detail: 'Save dated artwork and short factual notes without comparison.' },
        { stage: 'Reflect', title: 'Holistic Progress Card', detail: 'Map strengths and next gentle steps across all 5 Panchakosha domains.' },
        { stage: 'Share', title: 'ECCE Day & Home Tips', detail: 'Celebrate progress with parents and suggest playful home routines.' }
      ],
      references: [
        { label: 'NCERT: Holistic Progress Card (HPC) — Foundational Stage', url: 'https://ncert.nic.in/' },
        { label: 'MoWCD: Guidelines for ECCE Day & Community Mobilisation', url: 'https://wcd.nic.in/' }
      ],
      quiz: [
        {
          id: 'ece-m5-q1',
          question: 'Which assessment method is recommended by NCF-FS 2022 for 3–6 year olds?',
          options: [
            'Monthly ranked written exams',
            'Continuous observation, anecdotal notes, and child portfolios',
            'Timed multiple-choice OMR sheets',
            'Publicly displaying merit lists'
          ],
          answerIndex: 1,
          explanation: 'NCF-FS 2022 recommends non-intrusive observation, anecdotal records, and portfolios over written tests.'
        },
        {
          id: 'ece-m5-q2',
          question: 'What is the main purpose of an anecdotal record in an Anganwadi portfolio?',
          options: [
            'To punish misbehaviour',
            'To record a brief, factual observation of a child’s milestone or learning moment',
            'To replace attendance registers',
            'To rank children from first to last'
          ],
          answerIndex: 1,
          explanation: 'Anecdotal records capture short, objective observations of a child’s natural behaviour and growth over time.'
        },
        {
          id: 'ece-m5-q3',
          question: 'Why are monthly ECCE Days held at Anganwadi Centres?',
          options: [
            'To collect tuition fees',
            'To engage parents and community members in children’s play-based learning and development',
            'To conduct board examinations',
            'To close the centre for maintenance'
          ],
          answerIndex: 1,
          explanation: 'ECCE Days build strong parent-AWW partnerships so play and responsive care continue at home.'
        }
      ]
    }
  ];

  function safeReadJson(storage, key, fallback) {
    try {
      var raw = storage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeWriteJson(storage, key, val) {
    try {
      storage.setItem(key, JSON.stringify(val));
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadProgress(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return { completedModules: [] };
    var data = safeReadJson(s, PROGRESS_KEY, { completedModules: [] });
    var list = Array.isArray(data.completedModules) ? data.completedModules.filter(function (id) {
      return typeof id === 'string';
    }) : [];
    return { completedModules: list };
  }

  function saveProgress(completedModules, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return { completedModules: completedModules };
    var unique = [];
    for (var i = 0; i < completedModules.length; i++) {
      if (unique.indexOf(completedModules[i]) === -1) unique.push(completedModules[i]);
    }
    var payload = { completedModules: unique, updatedAt: Date.now() };
    safeWriteJson(s, PROGRESS_KEY, payload);
    return payload;
  }

  function toggleModuleCompletion(moduleId, storage) {
    var current = loadProgress(storage).completedModules;
    var idx = current.indexOf(moduleId);
    if (idx === -1) {
      current.push(moduleId);
    } else {
      current.splice(idx, 1);
    }
    return saveProgress(current, storage);
  }

  function pushToMistakeDeck(entry, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s || !entry || !entry.id) return [];
    var deck = safeReadJson(s, MISTAKE_DECK_KEY, []);
    if (!Array.isArray(deck)) deck = [];
    var exists = false;
    for (var i = 0; i < deck.length; i++) {
      if (deck[i] && deck[i].id === entry.id) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      deck.unshift({
        id: String(entry.id),
        exam: String(entry.exam || 'ECE Course Hub'),
        q: String(entry.q || ''),
        a: String(entry.a || ''),
        addedAt: Date.now()
      });
      if (deck.length > 250) deck = deck.slice(0, 250);
      safeWriteJson(s, MISTAKE_DECK_KEY, deck);
    }
    return deck;
  }

  function evaluateQuizAnswer(moduleObj, questionId, selectedIndex, storage) {
    if (!moduleObj || !Array.isArray(moduleObj.quiz)) return null;
    var question = null;
    for (var i = 0; i < moduleObj.quiz.length; i++) {
      if (moduleObj.quiz[i].id === questionId) {
        question = moduleObj.quiz[i];
        break;
      }
    }
    if (!question) return null;
    var isCorrect = selectedIndex === question.answerIndex;
    if (!isCorrect) {
      pushToMistakeDeck({
        id: question.id,
        exam: 'ECE Module ' + moduleObj.number,
        q: question.question,
        a: question.options[question.answerIndex] + ' — ' + question.explanation
      }, storage);
    }
    return {
      questionId: question.id,
      isCorrect: isCorrect,
      correctIndex: question.answerIndex,
      explanation: question.explanation
    };
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function updateProgressBar(completedModules) {
    var count = completedModules.length;
    var total = ECE_MODULES.length;
    var countEl = document.getElementById('ece-progress-count');
    var fillEl = document.getElementById('ece-progress-fill');
    var barEl = document.getElementById('ece-progress-track');
    if (countEl) {
      countEl.textContent = count + ' of ' + total + ' Modules Completed';
    }
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(count));
      barEl.setAttribute('aria-valuemax', String(total));
    }
    if (fillEl) {
      fillEl.className = 'ece-progress-fill';
      var pct = Math.round((count / total) * 100);
      if (pct >= 100) fillEl.classList.add('ece-progress-fill--100');
      else if (pct >= 80) fillEl.classList.add('ece-progress-fill--80');
      else if (pct >= 60) fillEl.classList.add('ece-progress-fill--60');
      else if (pct >= 40) fillEl.classList.add('ece-progress-fill--40');
      else if (pct >= 20) fillEl.classList.add('ece-progress-fill--20');
    }
  }

  function buildQuizSection(mod) {
    var box = el('div', 'ece-quiz-box');
    var header = el('div', 'ece-quiz-header');
    header.appendChild(el('h3', 'ece-section-heading', 'Module ' + mod.number + ' Self-Check Quiz (3 Questions)'));
    var scoreBadge = el('span', 'ece-quiz-score', '0 / ' + mod.quiz.length + ' answered');
    header.appendChild(scoreBadge);
    box.appendChild(header);

    var state = {};
    var questionsWrap = el('div');

    function refreshScore() {
      var answered = Object.keys(state).length;
      var correct = 0;
      for (var k in state) {
        if (Object.prototype.hasOwnProperty.call(state, k) && state[k]) correct++;
      }
      scoreBadge.textContent = answered === 0
        ? '0 / ' + mod.quiz.length + ' answered'
        : 'Score: ' + correct + ' / ' + mod.quiz.length + ' (' + answered + ' answered)';
    }

    function renderQuestions() {
      while (questionsWrap.firstChild) questionsWrap.removeChild(questionsWrap.firstChild);
      mod.quiz.forEach(function (q, qIdx) {
        var qCard = el('div', 'ece-question-card');
        qCard.appendChild(el('p', 'ece-question-text', (qIdx + 1) + '. ' + q.question));

        var optsGrid = el('div', 'ece-options-grid');
        var feedback = el('div', 'ece-quiz-feedback');
        feedback.hidden = true;

        var buttons = [];
        q.options.forEach(function (optText, optIdx) {
          var btn = el('button', 'ece-option-btn', optText);
          btn.type = 'button';
          btn.addEventListener('click', function () {
            if (Object.prototype.hasOwnProperty.call(state, q.id)) return;
            var result = evaluateQuizAnswer(mod, q.id, optIdx);
            state[q.id] = result.isCorrect;

            buttons.forEach(function (b, bIdx) {
              b.disabled = true;
              if (bIdx === result.correctIndex) b.classList.add('is-correct');
              else if (bIdx === optIdx && !result.isCorrect) b.classList.add('is-wrong');
            });

            feedback.hidden = false;
            feedback.className = 'ece-quiz-feedback ' + (result.isCorrect ? 'ece-quiz-feedback--ok' : 'ece-quiz-feedback--err');
            feedback.textContent = (result.isCorrect ? 'Correct: ' : 'Added to Mistake Deck for review: ') + result.explanation;
            refreshScore();
          });
          buttons.push(btn);
          optsGrid.appendChild(btn);
        });

        qCard.appendChild(optsGrid);
        qCard.appendChild(feedback);
        questionsWrap.appendChild(qCard);
      });
    }

    renderQuestions();
    box.appendChild(questionsWrap);

    var actions = el('div', 'ece-quiz-actions');
    var resetBtn = el('button', 'ece-reset-quiz-btn', 'Reset Quiz');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', function () {
      state = {};
      renderQuestions();
      refreshScore();
    });
    actions.appendChild(resetBtn);

    var note = el('span', 'ece-mistake-note');
    note.appendChild(document.createTextNode('Missed questions auto-sync to your '));
    var link = el('a', '', 'Study Library Mistake Deck');
    link.href = '/study-library/#mistake-deck-section';
    note.appendChild(link);
    note.appendChild(document.createTextNode('.'));
    actions.appendChild(note);

    box.appendChild(actions);
    return box;
  }

  function renderCourse() {
    var container = document.getElementById('ece-course-modules');
    var tocNav = document.getElementById('ece-toc-nav');
    if (!container) return;

    var progress = loadProgress();
    updateProgressBar(progress.completedModules);

    if (tocNav) {
      while (tocNav.firstChild) tocNav.removeChild(tocNav.firstChild);
      ECE_MODULES.forEach(function (mod) {
        var tocLink = el('a', 'ece-toc-link', 'Module ' + mod.number);
        tocLink.href = '#' + mod.id;
        tocNav.appendChild(tocLink);
      });
    }

    while (container.firstChild) container.removeChild(container.firstChild);

    ECE_MODULES.forEach(function (mod) {
      var isDone = progress.completedModules.indexOf(mod.id) !== -1;
      var card = el('article', 'ece-module-card' + (isDone ? ' is-completed' : ''));
      card.id = mod.id;

      var head = el('div', 'ece-module-head');
      var titleGroup = el('div');
      titleGroup.appendChild(el('span', 'ece-module-kicker', 'Module ' + mod.number + ' of ' + ECE_MODULES.length));
      titleGroup.appendChild(el('h2', 'ece-module-title', mod.title));
      titleGroup.appendChild(el('p', 'ece-module-subtitle-or', mod.titleOr));
      head.appendChild(titleGroup);

      var completeBtn = el('button', 'ece-complete-btn', isDone ? '✓ Completed' : '✓ Mark Module Complete');
      completeBtn.type = 'button';
      completeBtn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
      completeBtn.addEventListener('click', function () {
        var updated = toggleModuleCompletion(mod.id);
        var nowDone = updated.completedModules.indexOf(mod.id) !== -1;
        completeBtn.setAttribute('aria-pressed', nowDone ? 'true' : 'false');
        completeBtn.textContent = nowDone ? '✓ Completed' : '✓ Mark Module Complete';
        card.classList.toggle('is-completed', nowDone);
        updateProgressBar(updated.completedModules);
      });
      head.appendChild(completeBtn);
      card.appendChild(head);

      // Learning Outcomes
      var outBlock = el('div', 'ece-section-block');
      outBlock.appendChild(el('h3', 'ece-section-heading', 'Learning Outcomes'));
      var outList = el('ul', 'ece-outcomes-list');
      mod.outcomes.forEach(function (item) {
        outList.appendChild(el('li', '', item));
      });
      outBlock.appendChild(outList);
      card.appendChild(outBlock);

      // Visual Milestone / Framework Diagram
      var diagBlock = el('div', 'ece-section-block');
      diagBlock.appendChild(el('h3', 'ece-section-heading', mod.diagramTitle));
      var diagGrid = el('div', 'ece-diagram-grid');
      mod.diagramNodes.forEach(function (node) {
        var diagCard = el('div', 'ece-diagram-node');
        diagCard.appendChild(el('div', 'ece-diagram-stage', node.stage));
        diagCard.appendChild(el('div', 'ece-diagram-title', node.title));
        diagCard.appendChild(el('p', 'ece-diagram-detail', node.detail));
        diagGrid.appendChild(diagCard);
      });
      diagBlock.appendChild(diagGrid);
      card.appendChild(diagBlock);

      // Structured Lesson Notes
      var notesBlock = el('div', 'ece-section-block');
      notesBlock.appendChild(el('h3', 'ece-section-heading', 'Key Study Notes'));
      var notesList = el('ul', 'ece-notes-list');
      mod.notes.forEach(function (note) {
        var li = el('li');
        var strong = el('strong', '', note.lead + ' ');
        li.appendChild(strong);
        li.appendChild(document.createTextNode(note.text));
        notesList.appendChild(li);
      });
      notesBlock.appendChild(notesList);
      card.appendChild(notesBlock);

      // Reference Books & Official PDFs
      var refsBlock = el('div', 'ece-section-block');
      refsBlock.appendChild(el('h3', 'ece-section-heading', 'Reference Books & Official Guidelines'));
      var refsList = el('ul', 'ece-refs-list');
      mod.references.forEach(function (ref) {
        var li = el('li');
        var a = el('a', '', ref.label);
        a.href = ref.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.appendChild(a);
        refsList.appendChild(li);
      });
      refsBlock.appendChild(refsList);
      card.appendChild(refsBlock);

      // 3-question interactive MCQ self-check
      card.appendChild(buildQuizSection(mod));

      container.appendChild(card);
    });
  }

  var api = {
    PROGRESS_KEY: PROGRESS_KEY,
    MISTAKE_DECK_KEY: MISTAKE_DECK_KEY,
    ECE_MODULES: ECE_MODULES,
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    toggleModuleCompletion: toggleModuleCompletion,
    pushToMistakeDeck: pushToMistakeDeck,
    evaluateQuizAnswer: evaluateQuizAnswer,
    renderCourse: renderCourse
  };

  root.CSOEceCourse = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderCourse);
    } else {
      renderCourse();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
