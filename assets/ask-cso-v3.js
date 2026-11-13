
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
    results.replaceChildren();

    const headingEl = document.createElement("div");
    headingEl.className = "cso-ask3-heading";
    const strongH = document.createElement("strong");
    strongH.textContent = matches.length ? "Relevant CSO information" : "No matching entries found";
    const descP = document.createElement("p");
    descP.textContent = matches.length
      ? "These are matching website entries, not verified eligibility or application decisions."
      : "Try a shorter phrase, a specific topic, or the full CSO search.";
    headingEl.append(strongH, descP);
    results.appendChild(headingEl);

    matches.forEach(item => {
      const a = document.createElement("a");
      a.className = "cso-ask2-result";
      a.href = safeUrl(item.url);
      const t = document.createElement("strong");
      t.textContent = item.title || "";
      const s = document.createElement("span");
      s.textContent = (item.type || "") + " · " + (item.source || "");
      a.append(t, s);
      results.appendChild(a);
    });

    const actDiv = document.createElement("div");
    actDiv.className = "cso-ask2-actions";
    const searchBtn = document.createElement("button");
    searchBtn.type = "button";
    searchBtn.id = "cso-ask3-search";
    searchBtn.textContent = "Search all CSO content";
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.id = "cso-ask3-clear";
    clearBtn.textContent = "Clear results";
    actDiv.append(searchBtn, clearBtn);
    results.appendChild(actDiv);

    document.getElementById("cso-ask3-search").onclick = () => {
      const searchInput = document.getElementById("cso-ask-input") || document.getElementById("sq") || document.querySelector("#sf input");
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

  let askSuggestIndex = -1;

  function updateSuggestions() {
    const q = normalize(input.value);
    if (q.length < 2 || !loaded) {
      suggest.hidden = true;
      suggest.replaceChildren();
      askSuggestIndex = -1;
      return;
    }

    const found = records.filter(item =>
      normalize(item.title).includes(q) && safeUrl(item.url))
      .slice(0,6);

    suggest.replaceChildren();
    askSuggestIndex = -1;

    found.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");
      button.id = "cso-ask-opt-" + index;
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

  input.addEventListener("keydown", event => {
    if (suggest.hidden) return;
    const buttons = Array.from(suggest.querySelectorAll("button"));
    if (!buttons.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      askSuggestIndex = (askSuggestIndex + 1) % buttons.length;
      buttons.forEach((b, i) => {
        const isSel = i === askSuggestIndex;
        b.classList.toggle("active", isSel);
        b.setAttribute("aria-selected", isSel ? "true" : "false");
      });
      buttons[askSuggestIndex].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      askSuggestIndex = askSuggestIndex <= 0 ? buttons.length - 1 : askSuggestIndex - 1;
      buttons.forEach((b, i) => {
        const isSel = i === askSuggestIndex;
        b.classList.toggle("active", isSel);
        b.setAttribute("aria-selected", isSel ? "true" : "false");
      });
      buttons[askSuggestIndex].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      suggest.hidden = true;
      askSuggestIndex = -1;
      input.focus();
    }
  });

  suggest.addEventListener("keydown", event => {
    const buttons = Array.from(suggest.querySelectorAll("button"));
    if (event.key === "Escape") {
      event.preventDefault();
      suggest.hidden = true;
      askSuggestIndex = -1;
      input.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      askSuggestIndex = (askSuggestIndex + 1) % buttons.length;
      buttons.forEach((b, i) => {
        const isSel = i === askSuggestIndex;
        b.classList.toggle("active", isSel);
        b.setAttribute("aria-selected", isSel ? "true" : "false");
      });
      buttons[askSuggestIndex].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (askSuggestIndex <= 0) {
        askSuggestIndex = -1;
        buttons.forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        input.focus();
      } else {
        askSuggestIndex--;
        buttons.forEach((b, i) => {
          const isSel = i === askSuggestIndex;
          b.classList.toggle("active", isSel);
          b.setAttribute("aria-selected", isSel ? "true" : "false");
        });
        buttons[askSuggestIndex].focus();
      }
    }
  });

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

  shell.querySelectorAll(".cso-ask2-modes button").forEach(button => {
    button.addEventListener("click", event => {
      event.stopImmediatePropagation();
      shell.querySelectorAll(".cso-ask2-modes button").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      button.classList.add("active");
      button.setAttribute("aria-selected", "true");
      if (button.dataset.topic) {
        input.value = button.dataset.topic;
        render(input.value);
      }
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
