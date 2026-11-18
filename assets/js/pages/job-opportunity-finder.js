/* Extracted from job-opportunity-finder/index.html for strict CSP (v151). */
/* CSO Job Opportunity Finder v2 engine */
(function () {
  "use strict";

  const root = document.getElementById("cso-job-finder");
  if (!root) return;

  const education = root.querySelector("#jof-education");
  const interest = root.querySelector("#jof-interest");
  const type = root.querySelector("#jof-type");
  const results = root.querySelector("#jof-results");
  const summary = root.querySelector("#jof-summary");
  const cards = root.querySelector("#jof-cards");
  const steps = root.querySelector("#jof-steps");

  const qualifications = {
    below10: {
      direction: "Foundational education and age-appropriate learning",
      advice: "Prioritise continuing education and basic skills. Formal employment may have minimum age, education and safety requirements.",
      document: "School records and any recognised training records"
    },
    "10": {
      direction: "Class 10-level opportunities and vocational pathways",
      advice: "Compare recognised vocational courses, further education and recruitment notices that explicitly accept Class 10.",
      document: "Class 10 certificate and identity documents"
    },
    "12": {
      direction: "Class 12-level opportunities and entry-level training",
      advice: "Check the required stream, subjects, marks and minimum age for each advertised opportunity.",
      document: "Class 10 and Class 12 certificates"
    },
    iti: {
      direction: "Trade-specific technician and apprenticeship pathways",
      advice: "Match vacancies and apprenticeships to your exact ITI trade, certificate recognition and required experience.",
      document: "ITI trade certificate and relevant marksheets"
    },
    diploma: {
      direction: "Diploma-based technician and technical support roles",
      advice: "Check the required diploma branch, institution recognition and any technical tests.",
      document: "Diploma certificate and branch-specific records"
    },
    graduate: {
      direction: "Graduate-level recruitment and sector-specific entry roles",
      advice: "Check whether the vacancy accepts any degree or requires a specific subject, percentage or experience.",
      document: "Degree certificate, marksheets and relevant skills records"
    },
    engineering: {
      direction: "Engineering and technical graduate roles",
      advice: "Match roles to your engineering branch, projects, technical skills and required professional standards.",
      document: "Engineering degree, marksheets and project portfolio"
    },
    postgraduate: {
      direction: "Specialist and postgraduate-level pathways",
      advice: "Check subject specialisation, experience and any required eligibility examinations.",
      document: "Postgraduate degree and relevant research or work records"
    },
    professional: {
      direction: "Profession-specific employment pathways",
      advice: "Confirm mandatory registration, licensing, professional accreditation and experience before applying.",
      document: "Professional qualification and registration documents, where required"
    },
    other: {
      direction: "Experience-based and skills-based opportunities",
      advice: "Match roles to documented qualifications, demonstrable skills and prior work experience.",
      document: "Training certificates, experience letters and work portfolio"
    }
  };

  const sectors = {
    office: {
      title: "Office administration and operations",
      roles: ["Administrative assistant", "Documentation and records support", "Office operations"],
      skills: "Typing, spreadsheets, office software, communication and record keeping",
      caution: "Some clerical or administrative posts require specific examinations or computer qualifications."
    },
    technical: {
      title: "Technical and skilled-trade work",
      roles: ["Technician or trade assistant", "Maintenance and service support", "Technical operations"],
      skills: "Trade-specific practical skills, workplace safety, equipment handling and troubleshooting",
      caution: "Electrical, mechanical and other regulated work may require particular trade certificates or licences."
    },
    it: {
      title: "Technology and IT",
      roles: ["IT support", "Digital operations", "Junior web or software-related work"],
      skills: "Computer fundamentals, troubleshooting, programming basics and portfolio projects",
      caution: "Specialist IT roles may require demonstrable technical skills or particular qualifications."
    },
    teaching: {
      title: "Teaching and education services",
      roles: ["Education support", "Tutoring where appropriate", "Qualified teaching roles"],
      skills: "Subject knowledge, communication, lesson planning and digital teaching tools",
      caution: "Formal teaching posts may require recognised teacher education, eligibility tests and other qualifications."
    },
    health: {
      title: "Healthcare and support services",
      roles: ["Healthcare administration", "Hospital operations support", "Qualified clinical or allied-health roles"],
      skills: "Communication, record keeping, safety awareness and relevant healthcare training",
      caution: "Clinical practice requires the applicable recognised qualification and professional registration."
    },
    banking: {
      title: "Banking, finance and accounting",
      roles: ["Accounts support", "Customer service in financial operations", "Eligible banking recruitment"],
      skills: "Numeracy, spreadsheets, bookkeeping, communication and financial literacy",
      caution: "Banking recruitment may require specific degrees, examinations and other eligibility conditions."
    },
    defence: {
      title: "Defence, police and security services",
      roles: ["Eligible uniformed-service recruitment", "Security operations support", "Technical or administrative defence-related roles"],
      skills: "Fitness, discipline, general awareness and role-specific preparation",
      caution: "Check official age, citizenship, medical, physical and qualification requirements."
    },
    agriculture: {
      title: "Agriculture and rural livelihoods",
      roles: ["Agricultural operations", "Food processing and allied services", "Rural enterprise support"],
      skills: "Practical field skills, safety, record keeping and market awareness",
      caution: "Specialist agricultural posts may require agriculture-related qualifications."
    },
    sales: {
      title: "Sales, retail and customer service",
      roles: ["Retail associate", "Customer support", "Sales operations"],
      skills: "Communication, digital tools, product knowledge and customer handling",
      caution: "Check employment terms, salary structure and whether commissions are clearly disclosed."
    },
    creative: {
      title: "Media, design and digital work",
      roles: ["Content assistant", "Graphic or digital design support", "Media production support"],
      skills: "Writing, design tools, editing and an original work portfolio",
      caution: "Portfolio quality and practical tests may matter alongside formal qualifications."
    },
    hospitality: {
      title: "Hospitality, tourism and travel",
      roles: ["Guest services", "Hotel operations support", "Travel and tourism assistance"],
      skills: "Customer service, languages, communication and workplace etiquette",
      caution: "Some roles require specialised training, language ability or shift availability."
    },
    social: {
      title: "Community and social services",
      roles: ["Community programme assistant", "Field coordination support", "Social-sector administration"],
      skills: "Communication, documentation, community engagement and basic data handling",
      caution: "Specialist social-work positions may require recognised qualifications or field experience."
    }
  };

  const pathways = {
    all: {
      title: "Compare multiple employment pathways",
      action: "Explore suitable government notices, genuine private employers and recognised training opportunities.",
      preparation: "Prepare a general CV and shortlist two or three realistic pathways."
    },
    government: {
      title: "Government recruitment preparation",
      action: "Check official recruitment notices for post-specific eligibility, examination patterns and application dates.",
      preparation: "Create a study timetable and organise documents for verified recruitment processes."
    },
    private: {
      title: "Private-sector job applications",
      action: "Identify genuine employers, tailor your CV and prepare for interviews or practical tests.",
      preparation: "Build a skills portfolio and apply through employer websites or reputable platforms."
    },
    apprenticeship: {
      title: "Recognised apprenticeship or internship",
      action: "Look for training positions matching your trade, qualification, age and programme rules.",
      preparation: "Prepare training records and check the duration, stipend, supervision and certificate terms."
    },
    self: {
      title: "Self-employment and small enterprise",
      action: "Research local customer demand, startup costs and any applicable registration requirements.",
      preparation: "Draft a small budget, test your service and avoid large upfront spending without evidence of demand."
    },
    remote: {
      title: "Freelance and remote work",
      action: "Build a portfolio, learn remote collaboration tools and verify clients before accepting work.",
      preparation: "Prepare sample work and avoid advance-fee job offers or requests for sensitive documents."
    }
  };

  const focusedDirections = {
    iti: {
      technical: "Trade-specific technician, maintenance or apprenticeship work",
      it: "Computer or electronics support where your ITI trade is relevant",
      agriculture: "Agricultural equipment or technical service work where qualified"
    },
    diploma: {
      technical: "Diploma technician and technical operations roles",
      it: "IT support or networking roles matching your diploma branch",
      agriculture: "Agricultural equipment and technical services where eligible"
    },
    engineering: {
      technical: "Graduate engineering and branch-specific technical roles",
      it: "Software, systems or IT engineering roles matching your skills",
      agriculture: "Agricultural technology or engineering-related work where eligible"
    },
    graduate: {
      office: "Graduate-level administration and operations roles",
      banking: "Accounts, finance operations and eligible banking recruitment",
      social: "Programme coordination and community-sector roles"
    },
    postgraduate: {
      teaching: "Education and specialist teaching pathways subject to eligibility",
      social: "Research, programme coordination and specialist social-sector roles",
      it: "Specialist technology roles matching your degree and practical skills"
    },
    professional: {
      health: "Recognised healthcare roles matching your professional registration",
      teaching: "Qualified teaching roles subject to applicable recruitment rules",
      banking: "Profession-specific finance or accounting roles where eligible"
    }
  };

  function label(select) {
    return select.options[select.selectedIndex].textContent.trim();
  }

  function addCard(category, title, description) {
    const card = document.createElement("article");
    card.className = "jof-card";

    const eyebrow = document.createElement("small");
    eyebrow.textContent = category;

    const heading = document.createElement("h4");
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.textContent = description;

    card.append(eyebrow, heading, paragraph);
    cards.appendChild(card);
  }

  function explore() {
    const qualification = qualifications[education.value];
    const sector = sectors[interest.value];
    const pathway = pathways[type.value];

    if (!qualification || !sector || !pathway) return;

    const focused =
      focusedDirections[education.value] &&
      focusedDirections[education.value][interest.value];

    summary.textContent =
      "Education: " + label(education) +
      " | Interest: " + label(interest) +
      " | Preference: " + label(type) +
      ". These are suggested directions, not confirmed job vacancies or eligibility decisions.";

    cards.replaceChildren();

    if (education.value === "below10") {
      addCard(
        "01 · Suitable direction",
        "Continue education and develop foundational skills",
        "Explore age-appropriate learning related to " +
        sector.title.toLowerCase() +
        ". Do not treat this tool as permission to enter restricted employment."
      );
    } else {
      addCard(
        "01 · Suitable direction",
        focused || sector.roles[0],
        qualification.direction + ". " + qualification.advice
      );
    }

    addCard(
      "02 · Skills to build",
      sector.title,
      sector.skills + ". " + sector.caution
    );

    addCard(
      "03 · Recommended pathway",
      education.value === "below10"
        ? "Education and skill development first"
        : pathway.title,
      education.value === "below10"
        ? qualification.advice
        : pathway.action
    );

    const nextSteps = education.value === "below10"
      ? [
          "Continue foundational education and age-appropriate learning.",
          "Develop basic communication, digital literacy and numeracy.",
          "Explore your interest through safe projects or recognised education programmes.",
          "Ask a trusted educator or guardian about suitable future study and training routes.",
          "Check minimum age and qualification rules before considering any employment."
        ]
      : [
          "Shortlist roles related to " + sector.title.toLowerCase() + ".",
          qualification.advice,
          pathway.preparation,
          "Build relevant skills: " + sector.skills + ".",
          "Organise documents: " + qualification.document + ".",
          sector.caution,
          "Check the full official notification or genuine employer terms before applying.",
          "Never pay for a guaranteed job or share OTPs, passwords or banking credentials."
        ];

    steps.replaceChildren();

    nextSteps.forEach(function (text) {
      const item = document.createElement("li");
      item.textContent = text;
      steps.appendChild(item);
    });

    results.hidden = false;
    results.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  root.querySelector("#jof-explore")
    .addEventListener("click", explore);

  root.querySelector("#jof-reset")
    .addEventListener("click", function () {
      education.value = "12";
      interest.value = "office";
      type.value = "all";
      summary.textContent = "";
      cards.replaceChildren();
      steps.replaceChildren();
      results.hidden = true;
      education.focus();
    });


  /* CSO Job Plan actions v2 */

  function buildJobPlanText() {
    const lines = [
      "COMMON SENSE ODISHA (CSO-IN)",
      "YOUR JOB EXPLORATION PLAN",
      "",
      summary.textContent.trim(),
      "",
      "RECOMMENDATIONS"
    ];

    cards.querySelectorAll(".jof-card").forEach(function (card) {
      const heading = card.querySelector("h4");
      const description = card.querySelector("p");

      if (heading) {
        lines.push("", heading.textContent.trim());
      }
      if (description) {
        lines.push(description.textContent.trim());
      }
    });

    lines.push("", "PRACTICAL NEXT STEPS");

    steps.querySelectorAll("li").forEach(function (item, index) {
      lines.push((index + 1) + ". " + item.textContent.trim());
    });

    lines.push("", "OFFICIAL RESOURCES");

    root.querySelectorAll(".jof-resources a").forEach(function (link) {
      lines.push(
        link.textContent.trim() + ": " + link.href
      );
    });

    lines.push(
      "",
      "IMPORTANT",
      root.querySelector(".jof-disclaimer").textContent.trim(),
      "",
      "Common Sense Odisha — Be Self-Reliant"
    );

    return lines.join("\n");
  }

  const actionStatus = root.querySelector("#jof-action-status");

  root.querySelector("#jof-copy").addEventListener(
    "click",
    async function () {
      if (results.hidden) return;

      const text = buildJobPlanText();

      try {
        if (!navigator.clipboard ||
            !navigator.clipboard.writeText) {
          throw new Error("Clipboard API unavailable");
        }

        await navigator.clipboard.writeText(text);
        actionStatus.textContent = "Job plan copied.";
      } catch (error) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();

        let copied = false;

        try {
          copied = document.execCommand("copy");
        } catch (fallbackError) {
          copied = false;
        }

        textarea.remove();

        actionStatus.textContent = copied
          ? "Job plan copied."
          : "Copy unavailable. Please select and copy the plan manually.";
      }
    }
  );

  root.querySelector("#jof-print").addEventListener(
    "click",
    function () {
      if (results.hidden) return;

      const printWindow = window.open(
        "",
        "_blank",
        "width=850,height=1000"
      );

      if (!printWindow) {
        actionStatus.textContent =
          "Pop-up blocked. Please allow pop-ups to print the plan.";
        return;
      }

      const plan = buildJobPlanText();

      const escaped = plan
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      const documentHTML = [
        "<!DOCTYPE html>",
        '<html lang="en"><head>',
        '<meta charset="utf-8">',
        "<title>CSO-IN Job Exploration Plan</title>",
        "<style>",
        "@page{size:A4;margin:17mm}",
        "body{font-family:Arial,sans-serif;color:#172033;",
        "max-width:760px;margin:0 auto;padding:20px;line-height:1.65}",
        "h1{font-size:23px;color:#1749a2;margin-bottom:18px}",
        "pre{white-space:pre-wrap;overflow-wrap:anywhere;",
        "font:inherit;font-size:12px;line-height:1.65}",
        "@media print{body{padding:0}}",
        "</style></head><body>",
        "<h1>Common Sense Odisha — Job Exploration Plan</h1>",
        "<pre>", escaped, "</pre>",
        "</body></html>"
      ].join("");

      printWindow.document.open();
      printWindow.document.write(documentHTML);
      printWindow.document.close();

      printWindow.focus();

      printWindow.addEventListener("load", function () {
        printWindow.print();
      }, { once: true });
    }
  );

  education.value = "12";
})();
