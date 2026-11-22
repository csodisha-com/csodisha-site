(function (root) {
  'use strict';

  var EXAM_PACKS = [
    {
      id: 'opsc-oas',
      title: 'OPSC OAS Prelims (GS Paper-I)',
      title_or: 'OPSC OAS ପ୍ରିଲିମ୍ସ (GS ପେପର-I)',
      subtitle: 'Odisha History, Geography, Polity, Economy & Current Affairs',
      negLabel: '1/3 Negative (-0.66)',
      pos: 2,
      neg: 0.66,
      durationMin: 15,
      questions: [
        {
          id: 'opsc-p1',
          section: 'Odisha History',
          question: 'Who founded the Satyabadi Vana Vidyalaya at Sakhigopal in 1909?',
          question_or: '୧୯୦୯ ମସିହାରେ ସାକ୍ଷୀଗୋପାଳରେ ସତ୍ୟବାଦୀ ବନ ବିଦ୍ୟାଳୟ କିଏ ପ୍ରତିଷ୍ଠା କରିଥିଲେ?',
          options: ['Madhusudan Das', 'Gopabandhu Das', 'Fakir Mohan Senapati', 'Krushna Chandra Gajapati'],
          options_or: ['ମଧୁସୂଦନ ଦାସ', 'ଗୋପବନ୍ଧୁ ଦାସ', 'ଫକୀର ମୋହନ ସେନାପତି', 'କୃଷ୍ଣଚନ୍ଦ୍ର ଗଜପତି'],
          answerIndex: 1,
          explanation: 'Utkalmani Gopabandhu Das founded Satyabadi Vana Vidyalaya in 1909 to promote nationalistic education in Odisha.',
          explanation_or: 'ଉତ୍କଳମଣି ଗୋପବନ୍ଧୁ ଦାସ ୧୯୦୯ ମସିହାରେ ସାକ୍ଷୀଗୋପାଳରେ ଜାତୀୟତାବାଦୀ ଶିକ୍ଷା ପାଇଁ ସତ୍ୟବାଦୀ ବନ ବିଦ୍ୟାଳୟ ପ୍ରତିଷ୍ଠା କରିଥିଲେ।'
        },
        {
          id: 'opsc-p2',
          section: 'Odisha Geography',
          question: 'Which river forms the Duduma Waterfall in Koraput district?',
          question_or: 'କୋରାପୁଟ ଜିଲ୍ଲାର ଡୁଡୁମା ଜଳପ୍ରପାତ କେଉଁ ନଦୀରେ ସୃଷ୍ଟି ହୋଇଛି?',
          options: ['Mahanadi', 'Brahmani', 'Machkund (Sileru)', 'Baitarani'],
          options_or: ['ମହାନଦୀ', 'ବ୍ରାହ୍ମଣୀ', 'ମାଛକୁଣ୍ଡ (ସିଲେରୁ)', 'ବୈତରଣୀ'],
          answerIndex: 2,
          explanation: 'Duduma Waterfall (175 m) is formed on the Machkund river on the Odisha–Andhra Pradesh border.',
          explanation_or: 'ଡୁଡୁମା ଜଳପ୍ରପାତ (୧୭୫ ମି.) ଓଡ଼ିଶା–ଆନ୍ଧ୍ର ପ୍ରଦେଶ ସୀମାରେ ମାଛକୁଣ୍ଡ ନଦୀରେ ଅବସ୍ଥିତ।'
        },
        {
          id: 'opsc-p3',
          section: 'Indian Polity',
          question: 'Under which Article of the Constitution of India is the Finance Commission constituted?',
          question_or: 'ଭାରତୀୟ ସମ୍ବିଧାନର କେଉଁ ଧାରା ଅଧୀନରେ ଅର୍ଥ ଆୟୋଗ (Finance Commission) ଗଠିତ ହୁଏ?',
          options: ['Article 263', 'Article 280', 'Article 315', 'Article 324'],
          options_or: ['ଧାରା ୨୬୩', 'ଧାରା ୨୮୦', 'ଧାରା ୩୧୫', 'ଧାରା ୩୨୪'],
          answerIndex: 1,
          explanation: 'Article 280 empowers the President of India to constitute a Finance Commission every five years.',
          explanation_or: 'ଧାରା ୨୮୦ ଅନୁଯାୟୀ ପ୍ରତି ପାଞ୍ଚ ବର୍ଷରେ ରାଷ୍ଟ୍ରପତି ଅର୍ଥ ଆୟୋଗ ଗଠନ କରନ୍ତି।'
        },
        {
          id: 'opsc-p4',
          section: 'Odisha Economy',
          question: 'Which port in Odisha is an all-weather deep-water major port under the Major Port Authorities Act?',
          question_or: 'ଓଡ଼ିଶାର କେଉଁ ବନ୍ଦର ଏକ ପ୍ରମୁଖ ଗଭୀର ଜଳ ସର୍ବଋତୁ ବନ୍ଦର (Major Port) ଅଟେ?',
          options: ['Gopalpur Port', 'Dhamra Port', 'Paradip Port', 'Subarnarekha Port'],
          options_or: ['ଗୋପାଳପୁର ବନ୍ଦର', 'ଧାମରା ବନ୍ଦର', 'ପାରାଦୀପ ବନ୍ଦର', 'ସୁବର୍ଣ୍ଣରେଖା ବନ୍ଦର'],
          answerIndex: 2,
          explanation: 'Paradip Port in Jagatsinghpur district is Odisha’s only Major Port governed by the Paradip Port Authority.',
          explanation_or: 'ଜଗତସିଂହପୁର ଜିଲ୍ଲାର ପାରାଦୀପ ବନ୍ଦର ଓଡ଼ିଶାର ଏକମାତ୍ର ପ୍ରମୁଖ (Major) ବନ୍ଦର।'
        },
        {
          id: 'opsc-p5',
          section: 'Current Affairs',
          question: 'Which traditional Odisha craft received a Geographical Indication (GI) tag for its silver filigree work?',
          question_or: 'ରୂପା ତାରକସି କାର୍ଯ୍ୟ ପାଇଁ ଓଡ଼ିଶାର କେଉଁ ପାରମ୍ପରିକ ଶିଳ୍ପକୁ GI ଟ୍ୟାଗ୍ ମିଳିଛି?',
          options: ['Pipli Applique', 'Cuttack Rupa Tarakasi', 'Raghurajpur Pattachitra', 'Kotpad Handloom'],
          options_or: ['ପିପିଲି ଚାନ୍ଦୁଆ', 'କଟକ ରୂପା ତାରକସି', 'ରଘୁରାଜପୁର ପଟ୍ଟଚିତ୍ର', 'କୋଟପାଡ଼ ହସ୍ତତନ୍ତ'],
          answerIndex: 1,
          explanation: 'Cuttack Rupa Tarakasi (silver filigree) received GI recognition for its centuries-old intricate silver craftsmanship.',
          explanation_or: 'କଟକର ପ୍ରସିଦ୍ଧ ରୂପା ତାରକସି ଶିଳ୍ପକୁ ଭୌଗୋଳିକ ସଙ୍କେତ (GI) ମାନ୍ୟତା ମିଳିଛି।'
        }
      ]
    },
    {
      id: 'osssc-ri',
      title: 'OSSSC RI / ARI / AMIN / SFS',
      title_or: 'OSSSC RI / ARI / AMIN / SFS',
      subtitle: 'Mathematics, Odia Language, English, GK & Computer',
      negLabel: '1/3 Negative (-0.33)',
      pos: 1,
      neg: 0.33,
      durationMin: 15,
      questions: [
        {
          id: 'osssc-p1',
          section: 'Mathematics',
          question: 'If a train 180 m long crosses a pole in 9 seconds, what is its speed in km/h?',
          question_or: 'ଯଦି ୧୮୦ ମିଟର ଲମ୍ବ ଏକ ଟ୍ରେନ୍ ୯ ସେକେଣ୍ଡରେ ଗୋଟିଏ ଖୁଣ୍ଟ ଅତିକ୍ରମ କରେ, ତେବେ ଏହାର ବେଗ km/h ରେ କେତେ?',
          options: ['60 km/h', '64 km/h', '72 km/h', '80 km/h'],
          options_or: ['୬୦ km/h', '୬୪ km/h', '୭୨ km/h', '୮୦ km/h'],
          answerIndex: 2,
          explanation: 'Speed = 180 / 9 = 20 m/s. Converting to km/h: 20 × 18 / 5 = 72 km/h.',
          explanation_or: 'ବେଗ = ୧୮୦ / ୯ = ୨୦ ମି./ସେ. = ୨୦ × ୧୮ / ୫ = ୭୨ km/h।'
        },
        {
          id: 'osssc-p2',
          section: 'Odia Language',
          question: 'Identify the correct Sandhi of "ବିଦ୍ୟା + ଆଳୟ":',
          question_or: '"ବିଦ୍ୟା + ଆଳୟ" ର ସଠିକ୍ ସନ୍ଧି କ’ଣ ହେବ?',
          options: ['ବିଦ୍ୟାଳୟ', 'ବିଦ୍ୟଳୟ', 'ବିଦ୍ୟାଆଳୟ', 'ବିଦ୍ୟୟ'],
          options_or: ['ବିଦ୍ୟାଳୟ', 'ବିଦ୍ୟଳୟ', 'ବିଦ୍ୟାଆଳୟ', 'ବିଦ୍ୟୟ'],
          answerIndex: 0,
          explanation: 'ଆ + ଆ = ଆ (Dirgha Sandhi), hence ବିଦ୍ୟା + ଆଳୟ = ବିଦ୍ୟାଳୟ।',
          explanation_or: 'ଆ + ଆ = ଆ (ଦୀର୍ଘ ସନ୍ଧି), ତେଣୁ ବିଦ୍ୟା + ଆଳୟ = ବିଦ୍ୟାଳୟ।'
        },
        {
          id: 'osssc-p3',
          section: 'English',
          question: 'Choose the correct passive voice for: "The collectorate issued the notice."',
          question_or: '"The collectorate issued the notice." — ଏହାର ସଠିକ୍ Passive Voice ବାଛନ୍ତୁ:',
          options: [
            'The notice is issued by the collectorate.',
            'The notice was issued by the collectorate.',
            'The notice has issued by the collectorate.',
            'The notice were issued by the collectorate.'
          ],
          options_or: [
            'The notice is issued by the collectorate.',
            'The notice was issued by the collectorate.',
            'The notice has issued by the collectorate.',
            'The notice were issued by the collectorate.'
          ],
          answerIndex: 1,
          explanation: 'Simple past active ("issued") converts to "was + past participle" in passive voice.',
          explanation_or: 'Simple Past Active ("issued") Passive ରେ "was issued" ହୁଏ।'
        },
        {
          id: 'osssc-p4',
          section: 'General Knowledge',
          question: 'Which district in Odisha has the largest area?',
          question_or: 'କ୍ଷେତ୍ରଫଳ ଦୃଷ୍ଟିରୁ ଓଡ଼ିଶାର ସବୁଠାରୁ ବଡ଼ ଜିଲ୍ଲା କେଉଁଟି?',
          options: ['Sundargarh', 'Mayurbhanj', 'Kendujhar', 'Ganjam'],
          options_or: ['ସୁନ୍ଦରଗଡ଼', 'ମୟୂରଭଞ୍ଜ', 'କେନ୍ଦୁଝର', 'ଗଞ୍ଜାମ'],
          answerIndex: 1,
          explanation: 'Mayurbhanj (10,418 sq km) is the largest district in Odisha by geographical area.',
          explanation_or: 'ମୟୂରଭଞ୍ଜ (୧୦,୪୧୮ ବର୍ଗ କି.ମି.) କ୍ଷେତ୍ରଫଳ ଦୃଷ୍ଟିରୁ ଓଡ଼ିଶାର ବୃହତ୍ତମ ଜିଲ୍ଲା।'
        },
        {
          id: 'osssc-p5',
          section: 'Computer',
          question: 'Which shortcut key in LibreOffice Calc / Excel inserts the current date?',
          question_or: 'LibreOffice Calc / Excel ରେ ବର୍ତ୍ତମାନର ତାରିଖ (Current Date) ଦେବା ପାଇଁ କେଉଁ ସର୍ଟକଟ୍ ବ୍ୟବହୃତ ହୁଏ?',
          options: ['Ctrl + ;', 'Ctrl + Shift + D', 'Alt + D', 'F5'],
          options_or: ['Ctrl + ;', 'Ctrl + Shift + D', 'Alt + D', 'F5'],
          answerIndex: 0,
          explanation: 'Pressing Ctrl + ; inserts the current date into the active spreadsheet cell.',
          explanation_or: 'Ctrl + ; ଦବାଇଲେ ସକ୍ରିୟ ସେଲ୍‌ରେ ଆଜିର ତାରିଖ ଆସିଯାଏ।'
        }
      ]
    },
    {
      id: 'otet-osstet',
      title: 'OTET / OSSTET Paper-I',
      title_or: 'OTET / OSSTET ପେପର-I',
      subtitle: 'Child Development & Pedagogy, Odia, English & EVS',
      negLabel: 'No Negative Marking (0)',
      pos: 1,
      neg: 0,
      durationMin: 15,
      questions: [
        {
          id: 'otet-p1',
          section: 'Child Development & Pedagogy',
          question: 'According to Jean Piaget, the Concrete Operational Stage covers which age group?',
          question_or: 'ଜିନ୍ ପିଆଜେଙ୍କ ମତରେ Concrete Operational Stage କେଉଁ ବୟସ ସୀମାକୁ ବୁଝାଏ?',
          options: ['0–2 years', '2–7 years', '7–11 years', '11–15 years'],
          options_or: ['୦–୨ ବର୍ଷ', '୨–୭ ବର୍ଷ', '୭–୧୧ ବର୍ଷ', '୧୧–୧୫ ବର୍ଷ'],
          answerIndex: 2,
          explanation: 'Piaget’s Concrete Operational Stage (7–11 years) develops logical thinking about concrete objects and conservation.',
          explanation_or: 'ପିଆଜେଙ୍କ ୭–୧୧ ବର୍ଷ ସ୍ତରରେ ଶିଶୁ ବାସ୍ତବ ବସ୍ତୁ ବିଷୟରେ ଯୁକ୍ତିସଙ୍ଗତ ଚିନ୍ତା କରିପାରେ।'
        },
        {
          id: 'otet-p2',
          section: 'Pedagogy & NEP 2020',
          question: 'What is the new curricular and pedagogical structure introduced by NEP 2020?',
          question_or: 'ଜାତୀୟ ଶିକ୍ଷା ନୀତି (NEP 2020) ଦ୍ୱାରା ପ୍ରଚଳିତ ନୂତନ ପାଠ୍ୟକ୍ରମ ଗଠନ କ’ଣ?',
          options: ['10+2', '5+3+3+4', '5+4+3+2', '4+4+4+2'],
          options_or: ['୧୦+୨', '୫+୩+୩+୪', '୫+୪+୩+୨', '୪+୪+୪+୨'],
          answerIndex: 1,
          explanation: 'NEP 2020 replaces 10+2 with the 5+3+3+4 structure (Foundational, Preparatory, Middle, Secondary).',
          explanation_or: 'NEP 2020 ରେ ୫+୩+୩+୪ ଶିକ୍ଷା ଗଠନ (Foundational, Preparatory, Middle, Secondary) ଲାଗୁ ହୋଇଛି।'
        },
        {
          id: 'otet-p3',
          section: 'Odia Pedagogy',
          question: 'ଶିକ୍ଷାର୍ଥୀର ପଠନ ଦକ୍ଷତା ବିକାଶ ପାଇଁ କେଉଁ ପଦ୍ଧତି ସର୍ବାଧିକ ଉପଯୋଗୀ?',
          question_or: 'ଶିକ୍ଷାର୍ଥୀର ପଠନ ଦକ୍ଷତା ବିକାଶ ପାଇଁ କେଉଁ ପଦ୍ଧତି ସର୍ବାଧିକ ଉପଯୋଗୀ?',
          options: ['କେବଳ କଣ୍ଠସ୍ଥ କରିବା', 'ଅର୍ଥବୋଧ ସହ ସରବ ଓ ନୀରବ ପଠନ', 'ଶବ୍ଦ ତାଲିକା ନକଲ କରିବା', 'କେବଳ ବ୍ୟାକରଣ ନିୟମ ପଢ଼ିବା'],
          options_or: ['କେବଳ କଣ୍ଠସ୍ଥ କରିବା', 'ଅର୍ଥବୋଧ ସହ ସରବ ଓ ନୀରବ ପଠନ', 'ଶବ୍ଦ ତାଲିକା ନକଲ କରିବା', 'କେବଳ ବ୍ୟାକରଣ ନିୟମ ପଢ଼ିବା'],
          answerIndex: 1,
          explanation: 'Reading with comprehension (both aloud and silent reading) builds fluency and understanding.',
          explanation_or: 'ଅର୍ଥ ବୁଝି ସରବ ଓ ନୀରବ ପଠନ ଅଭ୍ୟାସ କଲେ ଭାଷା ଓ ପଠନ ଦକ୍ଷତା ଦ୍ରୁତ ବଢ଼େ।'
        },
        {
          id: 'otet-p4',
          section: 'Environmental Studies',
          question: 'Chilika Lake was designated as India’s first Ramsar Wetland of International Importance in which year?',
          question_or: 'ଚିଲିକା ହ୍ରଦ କେଉଁ ମସିହାରେ ଭାରତର ପ୍ରଥମ ରାମସାର ଆର୍ଦ୍ରଭୂମି (Ramsar Site) ମାନ୍ୟତା ପାଇଥିଲା?',
          options: ['1975', '1981', '1992', '2002'],
          options_or: ['୧୯୭୫', '୧୯୮୧', '୧୯୯୨', '୨୦୦୨'],
          answerIndex: 1,
          explanation: 'Chilika Lake (along with Keoladeo National Park) was designated as India’s first Ramsar Site in 1981.',
          explanation_or: '୧୯୮୧ ମସିହାରେ ଚିଲିକା ହ୍ରଦ ଭାରତର ପ୍ରଥମ ରାମସାର ଆର୍ଦ୍ରଭୂମି ଭାବେ ସ୍ୱୀକୃତି ପାଇଥିଲା।'
        }
      ]
    },
    {
      id: 'oprb',
      title: 'Odisha Police SI / Constable',
      title_or: 'ଓଡ଼ିଶା ପୋଲିସ SI / କନେଷ୍ଟବଳ',
      subtitle: 'General Awareness, Reasoning, Quantitative Aptitude & Odisha GK',
      negLabel: '1/4 Negative (-0.25)',
      pos: 1,
      neg: 0.25,
      durationMin: 15,
      questions: [
        {
          id: 'oprb-p1',
          section: 'Odisha GK',
          question: 'Where is the headquarters of the Odisha Police located?',
          question_or: 'ଓଡ଼ିଶା ପୋଲିସର ମୁଖ୍ୟ କାର୍ଯ୍ୟାଳୟ (Headquarters) କେଉଁଠାରେ ଅବସ୍ଥିତ?',
          options: ['Bhubaneswar', 'Cuttack (Buxi Bazar)', 'Rourkela', 'Berhampur'],
          options_or: ['ଭୁବନେଶ୍ୱର', 'କଟକ (ବକ୍ସି ବଜାର)', 'ରାଉରକେଲା', 'ବ୍ରହ୍ମପୁର'],
          answerIndex: 1,
          explanation: 'The State Police Headquarters of Odisha Police is located at Buxi Bazar, Cuttack.',
          explanation_or: 'ଓଡ଼ିଶା ପୋଲିସର ରାଜ୍ୟ ମୁଖ୍ୟାଳୟ କଟକର ବକ୍ସି ବଜାରଠାରେ ଅବସ୍ଥିତ।'
        },
        {
          id: 'oprb-p2',
          section: 'General Awareness',
          question: 'Which emergency helpline number in India integrates Police, Fire, and Ambulance services?',
          question_or: 'ଭାରତରେ ପୋଲିସ, ଅଗ୍ନିଶମ ଓ ଆମ୍ବୁଲାନ୍ସ ସେବା ପାଇଁ ଏକୀକୃତ ଜରୁରୀକାଳୀନ ନମ୍ବର କେଉଁଟି?',
          options: ['100', '108', '112', '1098'],
          options_or: ['୧୦୦', '୧୦୮', '୧୧୨', '୧୦୯୮'],
          answerIndex: 2,
          explanation: '112 is India’s single Emergency Response Support System (ERSS) helpline.',
          explanation_or: '୧୧୨ ହେଉଛି ଭାରତର ଏକୀକୃତ ଜରୁରୀକାଳୀନ ସହାୟତା ନମ୍ବର (ERSS)।'
        },
        {
          id: 'oprb-p3',
          section: 'Reasoning',
          question: 'Find the next number in the series: 3, 8, 15, 24, 35, ?',
          question_or: 'ପରବର୍ତ୍ତୀ ସଂଖ୍ୟାଟି କ’ଣ ହେବ: ୩, ୮, ୧୫, ୨୪, ୩୫, ?',
          options: ['46', '48', '50', '52'],
          options_or: ['୪୬', '୪୮', '୫୦', '୫୨'],
          answerIndex: 1,
          explanation: 'Differences are +5, +7, +9, +11, so the next difference is +13: 35 + 13 = 48.',
          explanation_or: 'ସଂଖ୍ୟାଗୁଡ଼ିକ ମଧ୍ୟରେ ପାର୍ଥକ୍ୟ +୫, +୭, +୯, +୧୧; ତେଣୁ ୩୫ + ୧୩ = ୪୮।'
        },
        {
          id: 'oprb-p4',
          section: 'Quantitative Aptitude',
          question: 'A candidate scores 144 marks out of 200. What is the percentage?',
          question_or: 'ଜଣେ ପରୀକ୍ଷାର୍ଥୀ ୨୦୦ ରୁ ୧୪୪ ନମ୍ବର ରଖିଲେ, ଶତକଡ଼ା ହାର କେତେ?',
          options: ['68%', '70%', '72%', '74%'],
          options_or: ['୬୮%', '୭୦%', '୭୨%', '୭୪%'],
          answerIndex: 2,
          explanation: '(144 / 200) × 100 = 72%.',
          explanation_or: '(୧୪୪ / ୨୦୦) × ୧୦୦ = ୭୨%।'
        }
      ]
    }
  ];

  root.CSO_CBT_EXAM_PACKS = EXAM_PACKS;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EXAM_PACKS: EXAM_PACKS };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
