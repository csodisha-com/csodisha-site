/* Extracted from trust-layer/index.html for strict CSP (v151). */
(function () {
  "use strict";

  const type = document.getElementById("cso-report-type");
  const wrap = document.getElementById("cso-other-problem-wrap");
  const input = document.getElementById("cso-other-problem");

  if (!type || !wrap || !input) return;

  function updateOtherField() {
    const show = type.value === "Other";

    wrap.hidden = !show;
    input.required = show;

    if (!show) {
      input.value = "";
    }
  }

  type.addEventListener("change", updateOtherField);
  updateOtherField();
})();
