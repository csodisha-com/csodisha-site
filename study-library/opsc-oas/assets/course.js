(function (root) {
  'use strict';

  var PROGRESS_KEY = 'cso_opsc_course_progress';
  var EXAM_PREFIX = 'OPSC OAS';

  var OPSC_MODULES = [
    {
      id: 'opsc-m1-history',
      number: 1,
      title: 'Odisha History, Art, Heritage & Freedom Movement',
      titleOr: 'ଓଡ଼ିଶାର ଇତିହାସ, କଳା, ଐତିହ୍ୟ ଏବଂ ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ',
      outcomes: [
        'Trace Odisha’s historical arc from Kalinga War (261 BCE) and Kharavela’s Hathigumpha inscription to Somavamsi, Ganga, and Gajapati dynasties.',
        'Distinguish Kalingan temple architecture styles (Rekha, Pidha, Khakhara Deula) and classical traditions like Odissi and Pattachitra.',
        'Analyse Odisha’s anti-colonial resistance from the 1817 Paika Rebellion to the 1936 formation of a separate Odisha province.'
      ],
      notes: [
        {
          lead: 'Ancient & Medieval Dynasties:',
          text: 'Kharavela (Chedi/Mahameghavahana) recorded his reign in the Prakrit Hathigumpha inscription at Udayagiri; Somavamsis built Lingaraja Temple; Eastern Gangas (Anantavarman Chodaganga Deva & Narasimhadeva I) built Puri Jagannath and Konark Sun Temple.'
        },
        {
          lead: 'Kalingan Temple Architecture:',
          text: 'Characterised by Rekha Deula (curvilinear sanctum tower), Pidha Deula (stepped pyramidal Jagamohana), and Khakhara Deula (barrel-vaulted roof, e.g., Vaital Deula).'
        },
        {
          lead: 'Freedom & Province Movement:',
          text: 'Buxi Jagabandhu led the 1817 Paika Rebellion; Utkal Sammilani (1903, Madhusudan Das) spearheaded the linguistic movement culminating in Odisha becoming India’s first linguistic state on 1 April 1936.'
        }
      ],
      diagramTitle: 'Visual Timeline: Milestones of Odisha History & Heritage',
      diagramNodes: [
        { stage: 'Ancient (261 BCE–1st c.)', title: 'Kalinga & Kharavela', detail: 'Ashoka’s Dhauli/Jaugada Rock Edicts and Udayagiri Hathigumpha inscription.' },
        { stage: 'Temple Golden Age', title: 'Somavamsi & Ganga', detail: 'Mukteswar, Lingaraja, Puri Jagannath, and Konark Sun Temple.' },
        { stage: '1817–1920s', title: 'Paika & Prajamandal', detail: 'Buxi Jagabandhu, Surendra Sai, and Non-Cooperation under Gopabandhu Das.' },
        { stage: '1 April 1936', title: 'Utkal Dibasa', detail: 'Separate Odisha province formed; Prajamandal and Quit India movements.' }
      ],
      references: [
        { label: 'Odisha Reference Annual (I&PR Dept, Govt. of Odisha)', url: 'https://inpr.odisha.gov.in/' },
        { label: 'OPSC Official Civil Services Syllabus & Notifications', url: 'https://www.opsc.gov.in/' }
      ],
      quiz: [
        {
          id: 'opsc-m1-q1',
          question: 'Which ancient Odisha ruler’s achievements are inscribed in the Hathigumpha inscription at Udayagiri?',
          options: ['Ashoka', 'Kharavela', 'Kapilendra Deva', 'Yayati II'],
          answerIndex: 1,
          explanation: 'The Hathigumpha inscription at Udayagiri near Bhubaneswar records the 13-year reign of King Kharavela.'
        },
        {
          id: 'opsc-m1-q2',
          question: 'Which of the following temples in Bhubaneswar is a classic example of the "Khakhara Deula" style?',
          options: ['Lingaraja Temple', 'Vaital Deula', 'Mukteswar Temple', 'Rajarani Temple'],
          answerIndex: 1,
          explanation: 'Vaital Deula (8th century) features the semi-cylindrical barrel-vaulted roof characteristic of Khakhara Deula.'
        },
        {
          id: 'opsc-m1-q3',
          question: 'Who founded the Utkal Sammilani in 1903 to unite Odia-speaking tracts?',
          options: ['Buxi Jagabandhu', 'Madhusudan Das', 'Harekrushna Mahatab', 'Fakir Mohan Senapati'],
          answerIndex: 1,
          explanation: 'Utkal Gourab Madhusudan Das founded Utkal Sammilani in 1903, leading to the 1936 formation of Odisha.'
        }
      ]
    },
    {
      id: 'opsc-m2-geography-economy',
      number: 2,
      title: 'Odisha Geography, Climate, Rivers & Economy',
      titleOr: 'ଓଡ଼ିଶାର ଭୂଗୋଳ, ଜଳବାୟୁ, ନଦୀ ଏବଂ ଅର୍ଥନୀତି',
      outcomes: [
        'Classify Odisha’s 5 physiographic regions and major river basins (Mahanadi, Brahmani, Baitarani, Subarnarekha, Rushikulya, Vansadhara).',
        'Analyse Odisha’s mineral belt (iron ore, bauxite, chromite, coal) and coastal cyclone/monsoon vulnerability.',
        'Evaluate key drivers of Odisha’s GSDP: agriculture, MSMEs, ports (Paradip, Dhamra, Gopalpur), and IT/industrial corridors.'
      ],
      notes: [
        {
          lead: 'Physiography & Highest Peak:',
          text: 'Odisha spans the Coastal Plains ("Hexadeltaic" Gift of 6 Rivers), Middle Mountainous Highlands (Deomali at 1,672 m in Koraput), Central Plateaus, Rolling Uplands, and River Valleys.'
        },
        {
          lead: 'Major Lakes & Wetlands:',
          text: 'Chilika Lake (Asia’s largest brackish water lagoon & first Indian Ramsar site) and Ansupa (freshwater oxbow lake on Mahanadi); Bhitarkanika mangroves in Kendrapara.'
        },
        {
          lead: 'Mineral & Industrial Base:',
          text: 'Odisha leads India in chromite, bauxite, and iron ore reserves, anchored by Rourkela, Angul-Talcher, Kalinganagar, and Paradip industrial clusters.'
        }
      ],
      diagramTitle: 'Visual Map: Odisha’s 4 Geographic & Economic Pillars',
      diagramNodes: [
        { stage: 'Coastal Plains', title: 'Hexadeltaic Belt', detail: 'Alluvial rice bowl formed by Subarnarekha, Budhabalanga, Baitarani, Brahmani, Mahanadi, Rushikulya.' },
        { stage: 'Eastern Ghats', title: 'Highland & Deomali', detail: 'Bauxite-rich Koraput-Rayagada plateaus and Deomali peak (1,672 m).' },
        { stage: 'Wetlands & Coast', title: 'Chilika & Bhitarkanika', detail: 'Ramsar biodiversity hotspots and Bay of Bengal cyclone-resilient coast.' },
        { stage: 'Blue & Green Economy', title: 'Ports & Minerals', detail: 'Paradip/Dhamra/Gopalpur ports, steel-aluminium clusters, and millet/horticulture.' }
      ],
      references: [
        { label: 'Odisha Economic Survey & Planning Convergence Dept', url: 'https://pc.odisha.gov.in/' },
        { label: 'Odisha State Disaster Management Authority (OSDMA)', url: 'https://www.osdma.org/' }
      ],
      quiz: [
        {
          id: 'opsc-m2-q1',
          question: 'Which is the highest mountain peak in Odisha?',
          options: ['Mahendragiri', 'Deomali', 'Malayagiri', 'Gandhamardan'],
          answerIndex: 1,
          explanation: 'Deomali (1,672 m) in Koraput district is the highest peak in Odisha.'
        },
        {
          id: 'opsc-m2-q2',
          question: 'Which Odisha wetland was designated among India’s very first Ramsar Sites in 1981?',
          options: ['Ansupa Lake', 'Chilika Lake', 'Tampara Lake', 'Hirakud Reservoir'],
          answerIndex: 1,
          explanation: 'Chilika Lake (along with Keoladeo National Park) was designated as one of India’s first Ramsar Sites in 1981.'
        },
        {
          id: 'opsc-m2-q3',
          question: 'Odisha holds the largest share of India’s reserves in which mineral?',
          options: ['Gold', 'Chromite', 'Lithium', 'Rock Phosphate'],
          answerIndex: 1,
          explanation: 'Sukinda Valley in Jajpur district accounts for the vast majority of India’s chromite reserves.'
        }
      ]
    },
    {
      id: 'opsc-m3-polity-governance',
      number: 3,
      title: 'Indian Polity, Constitution & Odisha Governance',
      titleOr: 'ଭାରତୀୟ ରାଜନୀତି, ସମ୍ବିଧାନ ଏବଂ ଓଡ଼ିଶା ଶାସନ ବ୍ୟବସ୍ଥା',
      outcomes: [
        'Connect Fundamental Rights, Directive Principles (DPSP), and Federalism articles to current Supreme Court rulings and state governance.',
        'Trace Odisha’s Unicameral Legislature (147 MLAs), 30 districts, Revenue Divisions (Central, Northern, Southern), and High Court at Cuttack.',
        'Understand PESA Act 1996, 5th Schedule Areas in Odisha, 73rd/74th Amendments, and e-Governance initiatives.'
      ],
      notes: [
        {
          lead: 'State Executive & Legislature:',
          text: 'Odisha has a unicameral Vidhan Sabha with 147 seats (21 Lok Sabha and 10 Rajya Sabha seats), 30 districts, and 3 Revenue Divisional Commissioners (Cuttack, Sambalpur, Berhampur).'
        },
        {
          lead: '5th Schedule & PESA Governance:',
          text: 'Nearly half of Odisha’s districts fall wholly or partly under the Fifth Schedule, empowering Gram Sabhas under PESA 1996 over minor forest produce and land.'
        },
        {
          lead: 'Constitutional Basics:',
          text: 'Master Articles 12–51A, Money vs. Financial Bills, Governor’s discretionary powers, Election Commission, CAG, and Public Service Commissions (UPSC/OPSC Articles 315–323).'
        }
      ],
      diagramTitle: 'Visual Structure: Odisha Governance & Constitutional Tiers',
      diagramNodes: [
        { stage: 'Union–State', title: 'Parliament & 21/10 Seats', detail: '21 Lok Sabha + 10 Rajya Sabha MPs; 7th Schedule legislative lists.' },
        { stage: 'State Tier', title: '147-Seat Vidhan Sabha', detail: 'Unicameral legislature, Council of Ministers, and Orissa High Court (Cuttack).' },
        { stage: 'Regional Tier', title: '3 RDCs & 30 Districts', detail: 'Central (Cuttack), Northern (Sambalpur), Southern (Berhampur) divisions.' },
        { stage: 'Local Self-Govt', title: 'PRIs, ULBs & PESA', detail: '3-tier Panchayati Raj (50% women reservation in Odisha) & 5th Schedule Gram Sabhas.' }
      ],
      references: [
        { label: 'India Code: Constitution of India (Official Text)', url: 'https://www.indiacode.nic.in/' },
        { label: 'Odisha Legislative Assembly Official Portal', url: 'https://odishaassembly.nic.in/' }
      ],
      quiz: [
        {
          id: 'opsc-m3-q1',
          question: 'How many elected seats are there in the Odisha Legislative Assembly (Vidhan Sabha)?',
          options: ['120', '147', '154', '165'],
          answerIndex: 1,
          explanation: 'The unicameral Odisha Legislative Assembly comprises 147 elected members.'
        },
        {
          id: 'opsc-m3-q2',
          question: 'Which Articles of the Indian Constitution govern Public Service Commissions like UPSC and OPSC?',
          options: ['Articles 280–281', 'Articles 315–323', 'Articles 352–360', 'Articles 148–151'],
          answerIndex: 1,
          explanation: 'Part XIV, Articles 315–323 provide for the Union and State Public Service Commissions.'
        },
        {
          id: 'opsc-m3-q3',
          question: 'Which law extends Panchayati Raj self-governance specifically to Fifth Schedule tribal areas in Odisha?',
          options: ['MRTP Act 1969', 'PESA Act 1996', 'FEMA 1999', 'Banking Regulation Act'],
          answerIndex: 1,
          explanation: 'The Provisions of the Panchayats (Extension to Scheduled Areas) Act, 1996 (PESA) empowers Gram Sabhas in Fifth Schedule areas.'
        }
      ]
    },
    {
      id: 'opsc-m4-science-env-ca',
      number: 4,
      title: 'General Science, Environment & Current Affairs',
      titleOr: 'ସାଧାରଣ ବିଜ୍ଞାନ, ପରିବେଶ ଏବଂ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ',
      outcomes: [
        'Master everyday Physics, Chemistry, Biology, Biotechnology, and Space/Defence milestones (ISRO, DRDO Chandipur/Wheeler Island).',
        'Connect biodiversity conservation (Similipal, Satkosia, Gahirmatha Olive Ridley) to climate adaptation and SDG targets.',
        'Structure daily newspaper notes into GS Mains-ready facts, data points, and Odisha scheme updates.'
      ],
      notes: [
        {
          lead: 'Environment & Odisha Conservation:',
          text: 'Gahirmatha Marine Sanctuary is the world’s largest rookery for Olive Ridley turtles; Similipal Biosphere Reserve hosts melanistic tigers; Satkosia Gorge anchors gharial conservation.'
        },
        {
          lead: 'Science & Strategic Tech:',
          text: 'Dr. APJ Abdul Kalam Island (Wheeler Island, Bhadrak) and ITR Chandipur are premier DRDO missile-testing ranges in Odisha; track AI, CRISPR, renewable hydrogen, and ISRO missions.'
        },
        {
          lead: 'Current Affairs Synthesis:',
          text: 'Link every news item to static GS syllabus tags (Polity, Economy, Environment, Odisha) using a monthly 1-page revision sheet.'
        }
      ],
      diagramTitle: 'Visual Synthesis: Linking Science, Ecology & Current Affairs',
      diagramNodes: [
        { stage: 'Odisha Ecology', title: 'Protected Network', detail: 'Similipal Biosphere, Bhitarkanika, Satkosia, and Gahirmatha Marine Sanctuary.' },
        { stage: 'Climate & DRR', title: 'Zero-Casualty Model', detail: 'Early cyclone warning, resilient shelters, and mangrove bio-shields.' },
        { stage: 'Science & Space', title: 'ITR & ISRO Tech', detail: 'Chandipur/Kalam Island defence tech, vaccines, renewables, and digital public infra.' },
        { stage: 'CA Workflow', title: 'News -> GS Tag', detail: 'Convert PIB, Economic Survey, and Odisha updates into Prelims + Mains bullets.' }
      ],
      references: [
        { label: 'Press Information Bureau (PIB) — Government of India', url: 'https://pib.gov.in/' },
        { label: 'Forest, Environment & Climate Change Dept, Odisha', url: 'https://forest.odisha.gov.in/' }
      ],
      quiz: [
        {
          id: 'opsc-m4-q1',
          question: 'Gahirmatha Marine Sanctuary in Odisha is globally famous for the mass nesting (arribada) of which species?',
          options: ['Snow Leopard', 'Olive Ridley Sea Turtle', 'One-Horned Rhinoceros', 'Great Indian Bustard'],
          answerIndex: 1,
          explanation: 'Gahirmatha in Kendrapara district is the world’s largest nesting beach for Olive Ridley sea turtles.'
        },
        {
          id: 'opsc-m4-q2',
          question: 'Where is Dr. A.P.J. Abdul Kalam Island (formerly Wheeler Island) missile test facility located?',
          options: ['Ganjam coast', 'Off the Bhadrak coast, Odisha', 'Kalahandi plateau', 'Sambalpur'],
          answerIndex: 1,
          explanation: 'Dr. A.P.J. Abdul Kalam Island is an integrated missile testing facility off the coast of Bhadrak district, Odisha.'
        },
        {
          id: 'opsc-m4-q3',
          question: 'Which Odisha tiger reserve is uniquely known for its wild population of pseudo-melanistic (black) tigers?',
          options: ['Debrigarh', 'Similipal Tiger Reserve', 'Sunabeda', 'Karlapat'],
          answerIndex: 1,
          explanation: 'Similipal Tiger Reserve in Mayurbhanj is globally noted for its rare pseudo-melanistic Bengal tigers.'
        }
      ]
    },
    {
      id: 'opsc-m5-exam-strategy',
      number: 5,
      title: 'OPSC Prelims CSAT, Mains Answer-Writing & Personality Test',
      titleOr: 'OPSC ପ୍ରିଲିମ୍ସ CSAT, ମେନ୍ସ ଉତ୍ତର ଲେଖା ଏବଂ ସାକ୍ଷାତକାର ରଣନୀତି',
      outcomes: [
        'Navigate the 3-stage OPSC OAS exam: Prelims (GS I + qualifying 33% CSAT), Mains (written GS, Essay, Optional & Language papers), and Personality Test.',
        'Structure high-scoring Mains answers with Intro–Body (Subheadings/Flowcharts)–Odisha Examples–Way Forward within 7–9 minutes.',
        'Prepare a balanced Detailed Application Form (DAF) brief for the OPSC Personality Test board.'
      ],
      notes: [
        {
          lead: 'Prelims Stage (Screening):',
          text: 'GS Paper I (200 marks) determines Prelims merit cut-off; GS Paper II (CSAT, 200 marks) is qualifying at 33% (66 marks). Beware of 1/3rd negative marking.'
        },
        {
          lead: 'Mains Answer Architecture:',
          text: 'Use crisp 2-line definitions/data intros, numbered multi-dimensional points (Social, Economic, Governance, Environmental), Odisha-specific examples, and a constitutional/SDG conclusion.'
        },
        {
          lead: 'Personality Test (Interview):',
          text: 'Tests administrative poise, integrity, home-district awareness (socio-economic profile, tourism, challenges), and balanced stance on policy dilemmas.'
        }
      ],
      diagramTitle: 'Visual Blueprint: 3-Stage OPSC OAS Selection Funnel',
      diagramNodes: [
        { stage: 'Stage 1: Prelims', title: 'GS I + Qualifying CSAT', detail: 'GS I merit + 33% qualifying CSAT; manage 1/3rd negative marking.' },
        { stage: 'Stage 2: Mains', title: 'Language, Essay, GS & Optional', detail: 'Odia & English qualifying + Essay, GS I–IV, and Optional merit papers.' },
        { stage: 'Answer Craft', title: 'IBC-O Framework', detail: 'Intro (data/article) -> Body (dimensions) -> Odisha case -> Way Forward.' },
        { stage: 'Stage 3: Interview', title: 'Personality Test', detail: 'DAF mastery, home-district dossier, ethics, and calm situational judgement.' }
      ],
      references: [
        { label: 'OPSC Official Portal: OCS Exam Rules & Previous Papers', url: 'https://www.opsc.gov.in/' },
        { label: 'CSOdisha Current Affairs & Mock Test Practice', url: '/current-affairs/' }
      ],
      quiz: [
        {
          id: 'opsc-m5-q1',
          question: 'What is the minimum qualifying percentage required in OPSC Prelims Paper II (CSAT)?',
          options: ['25%', '33%', '40%', '50%'],
          answerIndex: 1,
          explanation: 'Prelims Paper II (CSAT) is qualifying in nature with a minimum 33% requirement; Paper I determines the merit cut-off.'
        },
        {
          id: 'opsc-m5-q2',
          question: 'Which habit most improves Mains GS answer quality under strict time limits?',
          options: [
            'Writing long unparagraphed essays with zero headings',
            'Using structured subheadings, data/constitutional articles, and Odisha-specific examples',
            'Leaving the conclusion blank on every answer',
            'Skipping 10-mark questions to write 3 pages on one question'
          ],
          answerIndex: 1,
          explanation: 'Structured subheadings, concise data/articles, and local Odisha illustrations make answers scannable and high-scoring.'
        },
        {
          id: 'opsc-m5-q3',
          question: 'What is the primary focus of the OPSC Personality Test (Interview)?',
          options: [
            'Testing speed of mental arithmetic only',
            'Assessing mental alertness, balanced judgement, integrity, and awareness of Odisha & national issues',
            'Memorising all 395 Articles word-for-word',
            'Physical endurance'
          ],
          answerIndex: 1,
          explanation: 'The Personality Test evaluates administrative suitability, clarity of thought, integrity, and awareness of one’s DAF and Odisha.'
        }
      ]
    }
  ];

  var api = {
    PROGRESS_KEY: PROGRESS_KEY,
    EXAM_PREFIX: EXAM_PREFIX,
    MODULES: OPSC_MODULES
  };

  root.CSOOpscCourse = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root.CSOCourseHub && typeof root.CSOCourseHub.mount === 'function') {
    root.CSOCourseHub.mount({
      progressKey: PROGRESS_KEY,
      examPrefix: EXAM_PREFIX,
      modules: OPSC_MODULES
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
