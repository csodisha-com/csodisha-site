/* Extracted from trust-layer/index.html for strict CSP (v151). */
(function () {
  "use strict";

  const form = document.getElementById("cso-report-form");
  if (!form) return;

  const message = document.getElementById("cso-report-message");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const type = document.getElementById("cso-report-type");
    const page = document.getElementById("cso-report-url");
    const description =
      document.getElementById("cso-report-description");
    const source = document.getElementById("cso-report-source");

    if (!type.value) {
      message.textContent = "Please select a problem type.";
      type.focus();
      return;
    }

    if (description.value.trim().length < 15) {
      message.textContent =
        "Please describe the issue in at least 15 characters.";
      description.focus();
      return;
    }

    for (const field of [page, source]) {
      if (field.value.trim() && !field.checkValidity()) {
        message.textContent = "Please enter a valid URL.";
        field.focus();
        return;
      }
    }


    const evidence = document.getElementById("cso-report-evidence");
    const evidenceMessage =
      document.getElementById("cso-evidence-message");

    const files = Array.from(evidence.files || []);
    const allowed = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp"
    ]);

    evidenceMessage.textContent = "";

    if (files.length > 3) {
      evidenceMessage.textContent =
        "Please select no more than 3 evidence files.";
      evidence.focus();
      return;
    }

    for (const file of files) {
      const extension = file.name.split(".").pop().toLowerCase();

      const validExtension = [
        "pdf", "jpg", "jpeg", "png", "webp"
      ].includes(extension);

      if (!validExtension || !allowed.has(file.type)) {
        evidenceMessage.textContent =
          "Unsupported file: " + file.name;
        evidence.focus();
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        evidenceMessage.textContent =
          "File exceeds 10 MB: " + file.name;
        evidence.focus();
        return;
      }
    }


    const otherProblem =
      document.getElementById("cso-other-problem");

    if (type.value === "Other" &&
        !otherProblem.value.trim()) {
      message.textContent =
        "Please briefly describe the other problem.";
      otherProblem.focus();
      return;
    }

    const subject = "CSO Correction Report: " + type.value;

    const body = [
      "Common Sense Odisha — Correction Report",
      "",
      "Problem Type: " + type.value,
      "Other Problem: " +
        (type.value === "Other"
          ? otherProblem.value.trim()
          : "Not applicable"),
      "Related Page: " + (page.value.trim() || "Not provided"),
      "Supporting Source: " +
        (source.value.trim() || "Not provided"),
      "",
      "Evidence Files Selected: " +
        (files.length
          ? files.map(file => file.name).join(", ")
          : "None"),
      "",
      "IMPORTANT: Attach selected evidence files manually.",
      "",
      "Issue Description:",
      description.value.trim(),
      "",
      "Submitted by: Website visitor",
      "Please review against the original official notice."
    ].join("\n");

    const mailto =
      "mailto:?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    message.textContent =
      "Your email application will open. Choose the CSO " +
      "contact address, manually attach your evidence files " +
      "(if selected), and send the message to submit your report.";

    window.location.href = mailto;
  });
})();
