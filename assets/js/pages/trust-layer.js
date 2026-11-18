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
    meter.setAttribute("aria-valuenow", String(done));
    fill.style.width = (done / checks.length * 100) + "%";
  }

  box.addEventListener("change", render);

  reset.addEventListener("click", function () {
    checks.forEach(item => { item.checked = false; });
    render();
  });

  render();
})();
