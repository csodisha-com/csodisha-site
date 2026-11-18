/* Extracted from scheme-opportunity-finder/index.html for strict CSP (v151). */
/* CSO-SOF-FINAL-ENTER-SEARCH-20261030 */
(function () {
  "use strict";

  function init() {
    const form = document.getElementById("sof-theme3-form");
    const input = document.getElementById("sof-search");

    if (!form || !input) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      input.dispatchEvent(
        new Event("input", { bubbles: true })
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
