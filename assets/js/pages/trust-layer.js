/* Extracted from trust-layer/index.html for strict CSP (v151). */
(function () {
  "use strict";
  const box = document.getElementById("cso-trust-v2-items");
  const status = document.getElementById("cso-trust-v2-progress");
  const meter = document.getElementById("cso-trust-v2-meter");
  const fill = document.getElementById("cso-trust-v2-fill");
  const reset = document.getElementById("cso-trust-v2-reset");
  if (!box || !status || !meter || !fill || !reset) return;

  const checks = Array.from(box.querySelectorAll('input[type="checkbox"]'));

  function render() {
    const done = checks.filter(item => item.checked).length;
    status.textContent = done + " of " + checks.length + " checks completed";
    const pct = Math.round((done / Math.max(1, checks.length)) * 100);
    meter.setAttribute("aria-valuenow", String(done));
    fill.dataset.progressPct = String(pct);
    fill.setAttribute("aria-valuenow", String(pct));
  }

  box.addEventListener("change", render);

  reset.addEventListener("click", function () {
    checks.forEach(item => { item.checked = false; });
    render();
  });

  render();
})();
