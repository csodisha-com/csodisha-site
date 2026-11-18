/* Extracted from trust-layer/index.html for strict CSP (v151). */
(function () {
  "use strict";

  const type = document.getElementById("cso-report-type");
  const description =
    document.getElementById("cso-report-description");
  const other = document.getElementById("cso-other-problem");
  const descriptionLabel = document.querySelector(
    'label[for="cso-report-description"]'
  );

  if (!type || !description || !other || !descriptionLabel) return;

  function updateDescription() {
    const isOther = type.value === "Other";

    description.required = !isOther;
    description.minLength = isOther ? 0 : 15;

    descriptionLabel.textContent = isOther
      ? "Additional Details (Optional)"
      : "Describe the Issue *";

    description.placeholder = isOther
      ? "Add more details if needed..."
      : "Explain the problem and what needs correction...";
  }

  type.addEventListener("change", updateDescription);
  updateDescription();

  // Existing submit handler validates the description before
  // this listener runs. Intercept the submit event in capture
  // phase so Other can use its short description instead.
  const form = document.getElementById("cso-report-form");

  if (!form) return;

  form.addEventListener("submit", function (event) {
    if (type.value !== "Other") return;

    if (!other.value.trim()) return;

    if (description.value.trim().length >= 15) return;

    // The original submit handler requires 15 characters.
    // Supply the short description only for email preparation.
    description.value = other.value.trim();
  }, true);
})();
