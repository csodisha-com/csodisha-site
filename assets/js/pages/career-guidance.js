/* Extracted from career-guidance/index.html for strict CSP (v151). */
(function () {
  "use strict";

  const education = document.getElementById("cpf-education");
  const interest = document.getElementById("cpf-interest");
  const pathway = document.getElementById("cpf-pathway");
  const results = document.getElementById("cpf-results");
  const summary = document.getElementById("cpf-summary");
  const options = document.getElementById("cpf-options");
  const steps = document.getElementById("cpf-steps");

  const educationData = {
    below10: {
      level: "foundation",
      label: "Below Class 10",
      advice: "Focus on foundational learning, completing school education where possible, and age-appropriate skill exploration."
    },
    "10": {
      level: "school",
      label: "Class 10",
      advice: "Explore higher secondary education, recognised vocational programmes and suitable technical training."
    },
    "12science": {
      level: "higher",
      label: "Class 12 Science",
      advice: "Compare science, technical, healthcare and other programmes according to subject-specific eligibility."
    },
    "12commerce": {
      level: "higher",
      label: "Class 12 Commerce",
      advice: "Explore commerce, accounting, finance, business and other eligible education pathways."
    },
    "12arts": {
      level: "higher",
      label: "Class 12 Arts / Humanities",
      advice: "Explore humanities, social sciences, communication, education and other eligible programmes."
    },
    diploma: {
      level: "technical",
      label: "Diploma / Polytechnic",
      advice: "Consider technician roles, practical industry experience and eligible lateral-entry or further-study options."
    },
    bsc: {
      level: "graduate",
      label: "Science graduate",
      advice: "Consider subject-related employment, professional training, postgraduate study and eligible recruitment."
    },
    engineering: {
      level: "technicalGraduate",
      label: "Engineering graduate",
      advice: "Explore engineering roles, technical specialisations, industry experience and postgraduate options."
    },
    postgraduate: {
      level: "postgraduate",
      label: "Postgraduate",
      advice: "Consider specialised roles, research, advanced qualifications and eligibility-based recruitment."
    },
    iti: {
      level: "technical",
      label: "ITI certificate",
      advice: "Explore trade-related employment, apprenticeships and further recognised technical qualifications."
    },
    ba: {
      level: "graduate",
      label: "Arts graduate",
      advice: "Consider communication, administration, education-related routes and other eligible career options."
    },
    bcom: {
      level: "graduate",
      label: "Commerce graduate",
      advice: "Explore accounting, business operations, finance and relevant professional qualifications."
    },
    professional: {
      level: "professional",
      label: "Professional degree",
      advice: "Review profession-specific registration, licensing and recruitment requirements."
    },
    other: {
      level: "other",
      label: "Other qualifications / experience",
      advice: "Identify transferable skills and check the exact qualification requirements for each opportunity."
    }
  };

  const interestData = {
    technology: {
      label: "Technology & IT",
      roles: ["Digital support and IT services", "Software and web development", "Data and cybersecurity foundations"],
      skills: "Computer literacy, programming fundamentals, digital projects and problem-solving"
    },
    engineering: {
      label: "Engineering & technical trades",
      roles: ["Technical maintenance and operations", "Manufacturing and engineering support", "Trade-specific technical services"],
      skills: "Technical drawing, safety, tools, troubleshooting and practical workshop skills"
    },
    public: {
      label: "Government & public service",
      roles: ["Public administration support", "Government recruitment pathways", "Citizen-facing public services"],
      skills: "Communication, general awareness, digital literacy and examination preparation"
    },
    teaching: {
      label: "Teaching & education",
      roles: ["Education support services", "Teaching pathways subject to required qualifications", "Tutoring and learning support"],
      skills: "Subject knowledge, communication, lesson planning and digital teaching tools"
    },
    healthcare: {
      label: "Healthcare & medical services",
      roles: ["Healthcare support services", "Allied health education pathways", "Healthcare administration"],
      skills: "Science foundations, communication, hygiene and patient-service awareness"
    },
    business: {
      label: "Business & entrepreneurship",
      roles: ["Business operations", "Sales and customer services", "Small-enterprise development"],
      skills: "Budgeting, communication, marketing, customer service and business planning"
    },
    creative: {
      label: "Creative arts, design & media",
      roles: ["Graphic and digital design", "Content and media production", "Creative services"],
      skills: "Portfolio building, design tools, writing and visual communication"
    },
    defence: {
      label: "Defence, police & uniformed services",
      roles: ["Uniformed-service recruitment pathways", "Defence-related technical support", "Public safety support services"],
      skills: "Physical fitness, discipline, general awareness and role-specific preparation"
    },
    sports: {
      label: "Sports & fitness",
      roles: ["Sports coaching pathways", "Fitness and recreation services", "Sports administration"],
      skills: "Fitness fundamentals, coaching communication, safety and relevant certification"
    },
    social: {
      label: "Social work & community development",
      roles: ["Community outreach", "Development programme support", "Social-sector project coordination"],
      skills: "Communication, documentation, teamwork and community engagement"
    },
    hospitality: {
      label: "Hospitality, tourism & travel",
      roles: ["Hospitality operations", "Travel and tourism services", "Customer experience and event support"],
      skills: "Customer service, languages, digital booking tools and hospitality skills"
    },
    law: {
      label: "Law & public administration",
      roles: ["Legal support services", "Public administration", "Law education and professional pathways"],
      skills: "Reading, writing, research, documentation and analytical reasoning"
    },
    agriculture: {
      label: "Agriculture & allied sectors",
      roles: ["Agricultural services", "Food processing and allied activities", "Agri-enterprise development"],
      skills: "Farm-business basics, relevant technical skills, safety and market awareness"
    },
    banking: {
      label: "Banking, finance & accounting",
      roles: ["Accounting and bookkeeping", "Banking operations pathways", "Financial services support"],
      skills: "Numeracy, spreadsheets, accounting fundamentals and financial literacy"
    }
  };

  const pathwayData = {
    all: {
      label: "Multiple pathways",
      headline: "Compare employment, education and independent work",
      action: "Compare at least two routes before deciding.",
      note: "A balanced shortlist can include training, employment and further education."
    },
    government: {
      label: "Government employment",
      headline: "Explore eligibility-based public recruitment",
      action: "Check official recruitment notifications, qualification rules, age limits and application dates.",
      note: "Government recruitment varies by post; this finder cannot determine eligibility."
    },
    private: {
      label: "Private-sector employment",
      headline: "Build skills for industry and service-sector roles",
      action: "Prepare a CV, build demonstrable skills and review legitimate employer vacancies.",
      note: "Practical experience, communication and portfolio evidence may help."
    },
    study: {
      label: "Higher education",
      headline: "Compare recognised courses and entry requirements",
      action: "Check recognised institutions, subject prerequisites, admissions, fees and scholarships.",
      note: "Course eligibility depends on the institution and programme."
    },
    training: {
      label: "Vocational training",
      headline: "Develop practical, job-relevant skills",
      action: "Find recognised skill-training or vocational programmes suited to your current qualification.",
      note: "Compare course recognition, duration, costs and practical training."
    },
    self: {
      label: "Self-employment",
      headline: "Explore a small business or independent service",
      action: "Study local demand, required permissions, startup costs and training opportunities.",
      note: "Start with a realistic budget and test demand before committing funds."
    },
    freelance: {
      label: "Freelancing / remote work",
      headline: "Build a portfolio for independent work",
      action: "Choose a marketable skill, create sample projects and verify client or platform legitimacy.",
      note: "Avoid advance-fee job scams and unrealistic earnings promises."
    },
    apprenticeship: {
      label: "Apprenticeship / internship",
      headline: "Gain supervised practical experience",
      action: "Search official apprenticeship channels and legitimate employer internship notices.",
      note: "Check age, qualification, stipend and programme requirements."
    },
    exam: {
      label: "Competitive examinations",
      headline: "Prepare for suitable examinations",
      action: "Identify examinations for which you meet the published requirements and build a study plan.",
      note: "Exam eligibility and schedules must be checked with the recruiting authority."
    },
    unsure: {
      label: "Career exploration",
      headline: "Start by comparing a few realistic options",
      action: "Try a short skill project, speak with qualified advisers and compare available pathways.",
      note: "You do not need to commit to one career immediately."
    }
  };


  function educationFit(level, path) {
    if (level === "foundation") {
      return "Prioritise completing foundational education and age-appropriate skills. Many jobs and professional courses have minimum age or qualification requirements.";
    }
    if (level === "school") {
      return "Compare Class 10-level options, higher secondary education, ITI and recognised vocational routes.";
    }
    if (level === "higher") {
      return "Check whether your Class 12 stream, subjects and marks meet the published requirements.";
    }
    if (level === "technical") {
      return "Match opportunities to your specific ITI trade or diploma specialisation.";
    }
    if (level === "professional") {
      return "Check any mandatory registration, licence or professional qualification.";
    }
    return "Confirm the required degree, subject specialisation, experience and other conditions.";
  }

  const specificDirections = {
    technology: {
      "12science": ["BCA, B.Sc. Computer Science or eligible technical degree", "Programming, web development and IT support", "Build a basic website or coding portfolio"],
      "12commerce": ["BCA or other computing courses where eligible", "Business analytics and digital operations", "Practise spreadsheets and basic programming"],
      "12arts": ["Digital skills and computing courses where eligible", "Web content, IT support and digital operations", "Build a small digital project"],
      engineering: ["Software engineering and IT systems", "Cloud, cybersecurity or data specialisation", "Create a technical portfolio"],
      diploma: ["Technical IT support and networking", "Relevant diploma-based industry roles", "Develop practical troubleshooting skills"]
    },
    engineering: {
      "12science": ["Engineering degree or diploma subject to eligibility", "Polytechnic and technical education", "Explore mechanical, electrical or civil engineering fundamentals"],
      "10": ["Polytechnic or ITI routes subject to eligibility", "Technical trades and workshop learning", "Build maths, science and practical skills"],
      iti: ["Trade-related technician and maintenance roles", "Relevant apprenticeships", "Develop trade-specific practical experience"],
      diploma: ["Technician and junior technical roles", "Eligible lateral-entry engineering routes", "Strengthen CAD, safety and technical skills"],
      engineering: ["Graduate engineering roles", "Industry specialisation or postgraduate study", "Build practical engineering projects"]
    },
    healthcare: {
      "12science": ["Nursing or allied health courses subject to subject eligibility", "Pharmacy or other recognised healthcare courses where eligible", "Compare approved institutions and entrance requirements"],
      "12commerce": ["Healthcare administration and hospital operations", "Eligible healthcare support training", "Check science prerequisites before choosing clinical courses"],
      "12arts": ["Healthcare administration and community support", "Eligible healthcare service programmes", "Check professional course subject requirements"],
      bsc: ["Relevant allied health or postgraduate programmes", "Laboratory or research-related pathways where eligible", "Check course recognition and registration rules"]
    },
    teaching: {
      "12science": ["Teacher education routes after eligible higher study", "Subject-based higher education", "Explore recognised teacher-training requirements"],
      "12commerce": ["Commerce-related higher education", "Teaching routes subject to required qualifications", "Build communication and subject skills"],
      "12arts": ["Humanities and education-related degrees", "Recognised teacher education pathways", "Review teacher recruitment qualifications"],
      ba: ["Recognised teacher education where eligible", "Education support and tutoring", "Check applicable teacher eligibility tests"],
      bsc: ["Science teaching pathways where eligible", "Teacher education and subject specialisation", "Check recruitment and qualification rules"]
    },
    banking: {
      "12commerce": ["B.Com, finance or accounting education", "Bookkeeping and financial operations skills", "Practise spreadsheets and accounting basics"],
      bcom: ["Accounting, audit and finance support", "Banking recruitment subject to eligibility", "Develop Excel and financial analysis skills"],
      ba: ["Banking operations and customer service", "Eligible competitive recruitment", "Build numeracy and communication skills"]
    },
    agriculture: {
      "12science": ["Agriculture and allied science courses where eligible", "Food processing and agricultural technology", "Check subject and entrance requirements"],
      "10": ["Recognised agriculture-related vocational training", "Practical farming and allied skills", "Continue education and learn market basics"],
      bsc: ["Agriculture-related specialisation where eligible", "Research or technical services", "Explore recognised training and field experience"]
    },
    law: {
      "12arts": ["Integrated law degree where eligible", "Public administration and social science courses", "Check law entrance and admission requirements"],
      "12commerce": ["Integrated law degree where eligible", "Business law and administration interests", "Build research and writing skills"],
      ba: ["Graduate-entry law programmes where eligible", "Administration and legal support", "Check professional licensing rules"]
    },
    defence: {
      "10": ["Explore education routes for future uniformed-service recruitment", "Age-appropriate fitness and general awareness", "Check official recruitment qualifications"],
      "12science": ["Eligible defence or technical recruitment routes", "Higher education and technical options", "Check age, medical and physical standards"],
      engineering: ["Technical defence-related opportunities", "Engineering and support roles", "Verify official entry requirements"]
    },
    creative: {
      "12arts": ["Design, media or communication courses", "Graphic design and content creation", "Build a portfolio of original work"],
      ba: ["Communication and media opportunities", "Design and content roles", "Develop a writing or design portfolio"]
    },
    business: {
      "12commerce": ["Business or commerce higher education", "Small-enterprise and sales skills", "Create a simple business plan"],
      bcom: ["Business operations and finance", "Entrepreneurship and consulting support", "Learn budgeting and customer research"]
    }
  };

  const pathwayTitles = {
    all: "Explore several realistic directions",
    government: "Government recruitment route",
    private: "Private-sector career route",
    study: "Education and qualification route",
    training: "Practical skill-development route",
    self: "Self-employment route",
    freelance: "Freelance and remote-work route",
    apprenticeship: "Apprenticeship and internship route",
    exam: "Competitive examination route",
    unsure: "Career discovery route"
  };

  function makeCard(label, title, detail) {
    const card = document.createElement("article");
    card.className = "cpf-option";

    const eyebrow = document.createElement("span");
    eyebrow.className = "cpf-card-label";
    eyebrow.textContent = label;

    const heading = document.createElement("h4");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = detail;

    card.append(eyebrow, heading, paragraph);
    options.appendChild(card);
  }

  function render() {
    const edu = educationData[education.value];
    const field = interestData[interest.value];
    const path = pathwayData[pathway.value];

    if (!edu || !field || !path) return;

    const special =
      specificDirections[interest.value] &&
      specificDirections[interest.value][education.value];

    const directions = special || field.roles;
    const caution = educationFit(edu.level, pathway.value);

    summary.textContent =
      "Your selection: " + edu.label + " | " +
      field.label + " | " + path.label +
      ". Explore these possible directions and verify eligibility before applying.";

    options.replaceChildren();

    if (edu.level === "foundation") {
      makeCard(
        "01 · Career direction",
        "Build your education foundation",
        "Continue age-appropriate education and explore " +
        field.label + " through introductory learning."
      );
      makeCard(
        "02 · Skills to build",
        "Start with practical fundamentals",
        field.skills + "."
      );
      makeCard(
        "03 · Recommended action",
        "Plan your next learning step",
        caution
      );
    } else {
      const firstDirection = directions[0];
      const secondDirection = directions[1] || field.roles[1];
      const thirdDirection = directions[2] || field.roles[2];

      makeCard(
        "01 · Career direction",
        firstDirection,
        "A possible direction related to your education and interest. " +
        caution
      );

      makeCard(
        "02 · Skills to build",
        secondDirection,
        "Develop relevant abilities: " + field.skills + "."
      );

      makeCard(
        "03 · Recommended action",
        pathwayTitles[pathway.value],
        path.action + " " + thirdDirection + "."
      );
    }

    const nextSteps = [
      "Shortlist two or three options in " + field.label + ".",
      path.action,
      "Build relevant skills: " + field.skills + ".",
      caution,
      "Check official notices, recognised institutions, fees and deadlines.",
      "Prepare a practical 30-day learning or application plan."
    ];

    steps.replaceChildren();

    nextSteps.forEach(function (item) {
      const li = document.createElement("li");
      li.textContent = item;
      steps.appendChild(li);
    });

    results.hidden = false;
    results.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  document.getElementById("cpf-find")
    .addEventListener("click", render);

  document.getElementById("cpf-reset")
    .addEventListener("click", function () {
      education.value = "12science";
      interest.value = "technology";
      pathway.value = "all";
      results.hidden = true;
      summary.textContent = "";
      options.replaceChildren();
      steps.replaceChildren();
      education.focus();
    });

})();
