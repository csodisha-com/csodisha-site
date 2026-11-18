/* Extracted from opportunity-compass/index.html for strict CSP (v151). */
// CSO-IN Opportunity Compass matching engine v1
const compassPathways = {
  job: {
    title: "Job and employment pathways",
    url: "../jobs-careers/",
    general: [
      "Explore recruitment categories and official job notifications.",
      "Compare required qualifications before applying."
    ],
    levels: {
      "Below Class 10": ["Explore foundational skills and vocational training."],
      "Class 10": ["Explore Class 10-level recruitment and skill training."],
      "Class 12": ["Explore Class 12-level recruitment and apprenticeships."],
      "ITI / Diploma": ["Explore technical recruitment and apprenticeship pathways."],
      "Graduate": ["Explore graduate-level recruitment and competitive examinations."],
      "Postgraduate": ["Explore specialised recruitment, teaching and research pathways."],
      "Other": ["Explore qualification-based recruitment and skill-development routes."]
    }
  },
  study: {
    title: "Education and learning pathways",
    url: "../study-library/",
    general: [
      "Explore courses, entrance examinations and recognised institutions.",
      "Check admission requirements and official application schedules."
    ],
    levels: {
      "Below Class 10": ["Explore school progression and foundational learning."],
      "Class 10": ["Explore higher secondary, ITI and vocational options."],
      "Class 12": ["Explore undergraduate, diploma and entrance-exam pathways."],
      "ITI / Diploma": ["Explore advanced technical qualifications and lateral-entry options."],
      "Graduate": ["Explore postgraduate courses and professional certifications."],
      "Postgraduate": ["Explore research, doctoral and advanced professional learning."],
      "Other": ["Explore flexible learning and recognised certification options."]
    }
  },
  scheme: {
    title: "Schemes and assistance pathways",
    url: "../schemes-benefits/",
    general: [
      "Explore government schemes and public assistance categories.",
      "Verify eligibility, documents and application deadlines on official portals."
    ],
    levels: {
      "Below Class 10": ["Explore school education and family-support categories."],
      "Class 10": ["Explore education support and skills-related assistance."],
      "Class 12": ["Explore scholarships, higher education and training assistance."],
      "ITI / Diploma": ["Explore technical education and livelihood-support categories."],
      "Graduate": ["Explore higher education, employment and entrepreneurship support."],
      "Postgraduate": ["Explore research, higher education and professional development support."],
      "Other": ["Explore assistance categories based on individual circumstances."]
    }
  },
  career: {
    title: "Career guidance pathways",
    url: "../jobs-careers/",
    general: [
      "Compare career families, qualifications and skill requirements.",
      "Explore training options and longer-term progression."
    ],
    levels: {
      "Below Class 10": ["Explore interests, foundational skills and education choices."],
      "Class 10": ["Compare higher secondary, vocational and technical pathways."],
      "Class 12": ["Compare degree, diploma, apprenticeship and career options."],
      "ITI / Diploma": ["Explore technical careers and upskilling routes."],
      "Graduate": ["Explore professional careers, examinations and postgraduate options."],
      "Postgraduate": ["Explore specialised, research and leadership career routes."],
      "Other": ["Explore career choices based on interests and existing skills."]
    }
  }
};

document.getElementById("compass-form").addEventListener("submit", function(event) {
  event.preventDefault();

  const goal = document.getElementById("goal").value;
  const education = document.getElementById("education").value;
  const age = document.getElementById("age").value;
  const district = document.getElementById("district").value;
  const pathway = compassPathways[goal];

  if (!pathway || !education || !age) return;

  const suggestions = [
    ...(pathway.levels[education] || []),
    ...pathway.general
  ];

  if (age === "Under 18") {
    suggestions.push(
      "Prioritise age-appropriate education and training; check minimum-age rules before considering recruitment."
    );
  } else if (age === "18–24") {
    suggestions.push(
      "Explore youth-oriented training, education and early-career pathways where relevant."
    );
  } else if (age === "25–34") {
    suggestions.push(
      "Compare qualification requirements, professional development and age limits where applicable."
    );
  } else if (age === "35–44" || age === "45+") {
    suggestions.push(
      "Explore continuing education, livelihood support and career transitions; check age restrictions individually."
    );
  }


  // CSO-IN interest matching v1
  const interest = document.getElementById("interest").value;

  const interestSuggestions = {
    government: [
      "Explore public recruitment categories and official examination notices.",
      "Check qualification, age limits and reservation rules in each official notification."
    ],
    private: [
      "Explore private-sector roles, internships and workplace skills.",
      "Compare employer requirements and avoid unverified recruitment offers."
    ],
    technical: [
      "Explore ITI, diploma, apprenticeship and practical skills pathways.",
      "Check recognised training providers and certification requirements."
    ],
    education: [
      "Explore higher education, scholarships and entrance examinations.",
      "Check official admission criteria, accreditation and deadlines."
    ],
    business: [
      "Explore entrepreneurship, self-employment and business-skills pathways.",
      "Research registration, financing and support schemes through official sources."
    ],
    general: [
      "Compare multiple career, education and skills pathways before deciding."
    ]
  };

  suggestions.push(...(interestSuggestions[interest] || []));

  const results = document.getElementById("compass-results");
  results.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = "Your suggested pathways";

  const summary = document.createElement("p");
  summary.textContent = education + " • " + age + " • " + district + " • " + document.getElementById("interest").selectedOptions[0].textContent;

  const list = document.createElement("div");
  list.className = "compass-pathway-grid";

  suggestions.forEach(function(suggestion, index) {
    const item = document.createElement("article");
    item.className = "compass-pathway-card";

    const number = document.createElement("span");
    number.className = "compass-pathway-number";
    number.textContent = "PATHWAY " + (index + 1);

    const description = document.createElement("p");
    description.textContent = suggestion;

    item.append(number, description);
    list.appendChild(item);
  });

  const link = document.createElement("a");
  link.className = "compass-result";
  link.href = pathway.url;

  const title = document.createElement("strong");
  title.textContent = pathway.title + " →";

  const description = document.createElement("span");
  description.textContent = "Open the relevant CSO explorer to research these pathways.";

  link.append(title, description);

  const note = document.createElement("p");
  note.className = "compass-note";
  note.textContent =
    "Location preference: " + district +
    ". District-specific matching is not available yet. These suggestions do not confirm eligibility, vacancies or scheme availability.";


  // CSO-IN next steps guidance v1
  const nextSteps = {
    job: [
      "Identify recruitment categories matching your qualification.",
      "Read the latest official recruitment notification.",
      "Check age limits, required documents and application deadlines."
    ],
    study: [
      "Shortlist suitable courses or examinations.",
      "Check recognition, admission requirements and official schedules.",
      "Compare fees, scholarships and application procedures."
    ],
    scheme: [
      "Identify relevant assistance categories.",
      "Read official eligibility and document requirements.",
      "Check application methods, deadlines and authorised portals."
    ],
    career: [
      "Compare career options with your interests and qualifications.",
      "Identify skills or additional training you may need.",
      "Explore recognised learning and employment pathways."
    ]
  };

  const stepsHeading = document.createElement("h3");
  stepsHeading.textContent = "What to Do Next";

  const stepsList = document.createElement("ol");
  stepsList.className = "compass-next-steps";

  for (const step of (nextSteps[goal] || [])) {
    const item = document.createElement("li");
    item.textContent = step;
    stepsList.appendChild(item);
  }

  results.append(heading, summary, list, stepsHeading, stepsList, link, note);
  results.scrollIntoView({behavior:"smooth", block:"nearest"});
});
