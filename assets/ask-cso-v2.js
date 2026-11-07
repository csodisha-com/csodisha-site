/* CSO Ask 2.0 — source-first knowledge navigator */
(function () {
  "use strict";
  const form = document.getElementById("af");
  const input = document.getElementById("aq");
  const results = document.getElementById("chat");
  const shell = document.querySelector(".cso-ask2");
  if (!form || !input || !results || !shell) return;

  const routes = [
    {name:"Job Opportunity Finder", url:"job-opportunity-finder/", terms:["job","jobs","recruitment","vacancy","employment","exam","exams","graduate","graduation","ଚାକିରି","नौकरी"]},
    {name:"Scheme Opportunity Finder", url:"scheme-opportunity-finder/", terms:["scheme","schemes","benefit","scholarship","pension","ration","housing","yojana","ଯୋଜନା","योजना"]},
    {name:"Study Hub", url:"study/", terms:["study","education","college","course","student","learning","school","ପଢ଼ା","शिक्षा"]},
    {name:"Career Guidance", url:"career-guidance/", terms:["career","guidance","skills","profession","career path"]},
    {name:"Latest Updates", url:"latest-updates/", terms:["latest","update","updates","notification","notice","deadline","documents","application"]}
  ];

  const esc = value => String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  function normal(value) {
    return String(value || "").toLocaleLowerCase().trim();
  }

  function show(html) {
    results.innerHTML = html;
    results.hidden = false;
    results.scrollIntoView({block:"nearest", behavior:"auto"});
  }

  function link(url, label, note) {
    return '<a class="cso-ask2-result" href="' + esc(url) + '">' +
      '<strong>' + esc(label) + '</strong>' +
      '<span>' + esc(note) + '</span></a>';
  }

  function guidance(title, body, links) {
    show('<div class="cso-ask2-answer"><strong>' + esc(title) +
      '</strong><p>' + esc(body) + '</p></div>' +
      links.map(item => link(item.url, item.name, item.note)).join(''));
  }

  function search(question) {
    const query = normal(question);
    if (!query) {
      input.focus();
      return;
    }

    const words = query.split(/\s+/).filter(word => word.length > 2);
    const ranked = routes.map(route => ({
      ...route,
      score: route.terms.reduce((score, term) =>
        score + (query.includes(term) ? 3 : words.some(word => term.includes(word)) ? 1 : 0), 0)
    })).filter(route => route.score > 0)
      .sort((a,b) => b.score - a.score);

    const matched = ranked.length ? ranked : routes;
    const intro = ranked.length
      ? "These CSO sections may help. Open a section to inspect its available information and source links."
      : "I could not identify a specific answer from this question. Try one of these CSO sections or search with more specific keywords.";

    show('<div class="cso-ask2-answer"><strong>Results for: ' +
      esc(question) + '</strong><p>' + esc(intro) +
      '</p><small>Navigation suggestions, not verified answers.</small></div>' +
      matched.slice(0,5).map(route =>
        link(route.url, route.name, "Explore this CSO section")
      ).join('') +
      '<div class="cso-ask2-actions">' +
      '<button type="button" id="cso-ask2-full-search">Search all CSO content</button>' +
      '<button type="button" id="cso-ask2-clear">Clear results</button></div>');

    const full = document.getElementById("cso-ask2-full-search");
    const clear = document.getElementById("cso-ask2-clear");
    if (full) full.addEventListener("click", () => {
      const searchInput = document.getElementById("sq");
      const searchForm = document.getElementById("sf");
      if (searchInput && searchForm) {
        searchInput.value = question;
        searchForm.requestSubmit();
      } else {
        location.hash = "#search";
      }
    });
    if (clear) clear.addEventListener("click", () => {
      results.replaceChildren();
      results.hidden = true;
      input.focus();
    });
  }

  /* Capture before the legacy handler; keep legacy search and voice elsewhere. */
  /* Ask CSO 3.0 owns form submission.
     Keep Ask CSO 2.0 topic navigation and capability guidance. */

  shell.querySelectorAll("[data-question]").forEach(button => {
    button.addEventListener("click", () => {
      input.value = button.dataset.question;
      search(input.value);
    });
  });

  shell.querySelectorAll("[data-topic]").forEach(button => {
    button.addEventListener("click", () => {
      const target = {
        jobs:"job-opportunity-finder/",
        schemes:"scheme-opportunity-finder/",
        study:"study/",
        updates:"latest-updates/"
      }[button.dataset.topic];
      if (target) location.href = target;
    });
  });

  shell.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "pdf") {
        guidance(
          "PDF explanation",
          "This version cannot read or summarize uploaded PDF files. Open the original notice and check its dates, eligibility, fees and instructions. Do not rely on an automatic summary.",
          [{name:"Latest Updates",url:"latest-updates/",note:"Find available notices and source links"}]
        );
      } else {
        guidance(
          "Language support",
          "CSO offers language controls where translations are available. This search tool does not automatically translate documents or generate multilingual answers.",
          [{name:"Study Hub",url:"study/",note:"Explore education resources"}]
        );
      }
    });
  });

  results.hidden = true;
})();
