/* Extracted from scheme-opportunity-finder/index.html for strict CSP (v151). */
/* CSO-SOF-THEME3-20261030 */
(function () {
  "use strict";

  function init() {
    const input = document.getElementById("sof-search");
    const form = document.getElementById("sof-theme3-form");

    if (!input || !form) return;

    function runSearch(value) {
      if (typeof value === "string") {
        input.value = value;
      }

      input.dispatchEvent(
        new Event("input", { bubbles: true })
      );

      if (input.value.trim()) {
        const feedback = document.getElementById(
          "sof-search-feedback"
        );

        if (feedback && !feedback.hidden) {
          feedback.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
          });
        }
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      runSearch();
    });

    document.querySelectorAll("[data-sof-query]").forEach(
      function (button) {
        button.addEventListener("click", function () {
          runSearch(button.dataset.sofQuery || "");
        });
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
