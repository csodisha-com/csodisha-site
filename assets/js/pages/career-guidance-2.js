/* Extracted from career-guidance/index.html for strict CSP (v151). */
(function () {
  "use strict";

  const finder = document.getElementById("career-path-finder");
  const printButton = document.getElementById("cpf-print");
  const copyButton = document.getElementById("cpf-copy");
  const status = document.getElementById("cpf-copy-status");

  function selectedText(id) {
    const select = document.getElementById(id);
    return select.options[select.selectedIndex].textContent.trim();
  }

  function careerPlanText() {
    const summary = document.getElementById("cpf-summary").textContent.trim();

    const cards = Array.from(
      document.querySelectorAll("#cpf-options .cpf-option")
    ).map(function (card) {
      return card.innerText.trim();
    });

    const steps = Array.from(
      document.querySelectorAll("#cpf-steps li")
    ).map(function (li, index) {
      return (index + 1) + ". " + li.textContent.trim();
    });

    const resources = Array.from(
      document.querySelectorAll("#career-path-finder .cpf-resources a")
    ).map(function (link) {
      return link.textContent.trim() + ": " + link.href;
    });

    return [
      "COMMON SENSE ODISHA — CAREER EXPLORATION PLAN",
      "",
      "Education: " + selectedText("cpf-education"),
      "Interest: " + selectedText("cpf-interest"),
      "Preferred pathway: " + selectedText("cpf-pathway"),
      "",
      "CAREER SUMMARY",
      summary,
      "",
      "SUGGESTED DIRECTIONS",
      cards.join("\n\n"),
      "",
      "PRACTICAL NEXT STEPS",
      steps.join("\n"),
      "",
      "OFFICIAL RESOURCES",
      resources.join("\n"),
      "",
      "DISCLAIMER",
      "General educational guidance only. Verify eligibility, recognition,",
      "fees, deadlines and application procedures with official authorities."
    ].join("\n");
  }

  printButton.addEventListener("click", function () {
    if (document.getElementById("cpf-results").hidden) {
      status.textContent = "Explore your options first.";
      return;
    }

    window.print();
  });

  copyButton.addEventListener("click", async function () {
    if (document.getElementById("cpf-results").hidden) {
      status.textContent = "Explore your options first.";
      return;
    }

    const text = careerPlanText();

    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(text);
      status.textContent = "Career plan copied.";
    } catch (error) {
      status.textContent =
        "Copy unavailable in this browser. Use Print / Save as PDF.";
    }
  });

  const reset = document.getElementById("cpf-reset");

  reset.addEventListener("click", function () {
    status.textContent = "";
  });

  finder.querySelectorAll("select").forEach(function (select) {
    select.addEventListener("change", function () {
      status.textContent = "";
    });
  });
})();
