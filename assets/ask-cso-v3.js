
/* Ask CSO 3.0 — Whole-site knowledge index */
(function () {
  "use strict";

  const form = document.getElementById("af");
  const input = document.getElementById("aq");
  const results = document.getElementById("chat");
  const shell = document.querySelector(".cso-ask2");
  if (!form || !input || !results || !shell) return;

  let records = [];
  let loaded = false;
  let loadError = false;
  let currentQuery = "";

  const esc = text => String(text || "").replace(/[&<>"']/g, ch =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  const normalize = text => String(text || "")
    .toLocaleLowerCase().normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ").trim();

  const stopwords = new Set([
    "which","what","where","when","how","can","could","please","the",
    "for","with","after","about","from","have","does","are","and",
    "this","that","find","show","me","my","is","in","of","to"
  ]);

  const synonyms = {
    job:["recruitment","vacancy","employment"],
    jobs:["recruitment","vacancy","employment"],
    exam:["examination","test"],
    exams:["examination","test"],
    scheme:["yojana","benefit"],
    scholarship:["student","education","financial assistance"],
    graduate:["graduation","degree"],
    graduation:["graduate","degree"],
    deadline:["last date","closing date"],
    document:["certificate","documents"],
    documents:["certificate","documents"],
    odisha:["odisha","ଓଡ଼ିଶା","ओडिशा"]
  };

  function tokens(query) {
    const raw = normalize(query).split(" ").filter(x =>
      x.length > 1 && !stopwords.has(x));
    const out = new Set(raw);
    raw.forEach(word => (synonyms[word] || []).forEach(term => out.add(term)));
    return [...out].slice(0,20);
  }

  function score(record, terms) {
    const title = normalize(record.title);
    const text = normalize(record.text);
    let points = 0;
    terms.forEach(term => {
      if (title.includes(term)) points += 8;
      if (text.includes(term)) points += 2;
    });
    return points;
  }

  function safeUrl(value) {
    const url = String(value || "").trim();
    if (/^https:\/\//i.test(url)) return url;
    if (!url || /^(?:javascript|data|file):/i.test(url) ||
        url.startsWith("//") || url.startsWith("/") ||
        url.split("/").includes("..")) return "";
    return url;
  }

  function render(query) {
    currentQuery = query;
    if (!loaded) {
      results.hidden = false;
      results.textContent = loadError
        ? "The CSO knowledge index could not be loaded."
        : "Loading CSO knowledge index...";
      return;
    }

    const terms = tokens(query);
    if (!terms.length) {
      results.hidden = true;
      results.replaceChildren();
      return;
    }

    const matches = records
      .map(item => ({...item, relevance:score(item,terms)}))
      .filter(item => item.relevance > 0 && safeUrl(item.url))
      .sort((a,b) => b.relevance - a.relevance)
      .slice(0,18);

    results.hidden = false;

    const heading = '<div class="cso-ask3-heading"><strong>' +
      esc(matches.length ? "Relevant CSO information" : "No matching entries found") +
      '</strong><p>' + esc(matches.length
        ? "These are matching website entries, not verified eligibility or application decisions."
        : "Try a shorter phrase, a specific topic, or the full CSO search.") +
      '</p></div>';

    const items = matches.map(item =>
      '<a class="cso-ask2-result" href="' + esc(safeUrl(item.url)) + '">' +
      '<strong>' + esc(item.title) + '</strong>' +
      '<span>' + esc(item.type) + ' · ' + esc(item.source) + '</span>' +
      '</a>').join("");

    results.innerHTML = heading + items +
      '<div class="cso-ask2-actions">' +
      '<button type="button" id="cso-ask3-search">Search all CSO content</button>' +
      '<button type="button" id="cso-ask3-clear">Clear results</button></div>';

    document.getElementById("cso-ask3-search").onclick = () => {
      const searchInput = document.getElementById("sq");
      const searchForm = document.getElementById("sf");
      if (searchInput && searchForm) {
        searchInput.value = currentQuery;
        searchForm.requestSubmit();
      } else {
        location.hash = "#search";
      }
    };

    document.getElementById("cso-ask3-clear").onclick = () => {
      input.value = "";
      results.hidden = true;
      results.replaceChildren();
      input.focus();
    };
  }

  const suggest = document.createElement("div");
  suggest.className = "cso-ask3-suggest";
  suggest.setAttribute("role","listbox");
  suggest.setAttribute("aria-label","Suggested CSO topics");
  suggest.hidden = true;
  form.insertAdjacentElement("afterend", suggest);

  function updateSuggestions() {
    const q = normalize(input.value);
    if (q.length < 2 || !loaded) {
      suggest.hidden = true;
      suggest.replaceChildren();
      return;
    }

    const found = records.filter(item =>
      normalize(item.title).includes(q) && safeUrl(item.url))
      .slice(0,6);

    suggest.replaceChildren();

    found.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.title;
      button.onclick = () => {
        input.value = item.title;
        suggest.hidden = true;
        render(item.title);
      };
      suggest.appendChild(button);
    });

    suggest.hidden = !found.length;
  }

  input.addEventListener("input", updateSuggestions);

  form.addEventListener("submit", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    suggest.hidden = true;
    render(input.value.trim());
  }, true);

  shell.querySelectorAll("[data-question]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopImmediatePropagation();
      input.value = button.dataset.question;
      render(input.value);
    }, true);
  });

  fetch("data/cso-knowledge-index.json")
    .then(response => {
      if (!response.ok) throw Error("Index unavailable");
      return response.json();
    })
    .then(data => {
      records = Array.isArray(data.records) ? data.records : [];
      loaded = true;
      if (currentQuery) render(currentQuery);
    })
    .catch(() => {
      loadError = true;
      if (currentQuery) render(currentQuery);
    });
})();
