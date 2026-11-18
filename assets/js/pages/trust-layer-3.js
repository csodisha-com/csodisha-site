/* Extracted from trust-layer/index.html for strict CSP (v151). */
(function () {
  const input = document.getElementById("cso-report-evidence");
  const preview = document.getElementById("cso-evidence-preview");

  if (!input || !preview) return;

  input.addEventListener("change", function () {
    const files = Array.from(input.files || []);

    preview.replaceChildren();

    if (!files.length) {
      preview.textContent = "No evidence files selected.";
      return;
    }

    const heading = document.createElement("strong");
    heading.textContent =
      files.length + " evidence file(s) selected:";
    preview.appendChild(heading);

    const list = document.createElement("ul");

    for (const file of files) {
      const item = document.createElement("li");
      item.textContent =
        file.name + " — " +
        (file.size / (1024 * 1024)).toFixed(2) + " MB";
      list.appendChild(item);
    }

    preview.appendChild(list);
  });
})();
