/**
 * Common Sense Odisha (CSO) — Public Current Affairs Controller
 * Fetches live published items from GET /api/content/current-affairs and
 * GET /api/content/current-affairs/:slug. Strict CSP-compliant, safe DOM rendering.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const pc = window.CSOPublicContent;
  const el = pc ? pc.el : (t, c, tx) => {
    const n = document.createElement(t);
    if (c) n.className = c;
    if (tx !== undefined && tx !== null) n.textContent = String(tx);
    return n;
  };

  const breadcrumbEl = $('ca-breadcrumb');
  const listViewEl = $('ca-list-view');
  const searchInput = $('ca-search');
  const searchClearBtn = $('ca-search-clear');
  const categoryBar = $('ca-categories');
  const langBtn = $('ca-lang-btn');
  const countLabel = $('ca-count-label');
  const resetBtn = $('ca-reset-btn');
  const statusEl = $('ca-status');
  const gridEl = $('ca-grid');
  const paginationEl = $('ca-pagination');

  const articleViewEl = $('ca-article-view');
  const backBtn = $('ca-back-btn');
  const articleActionsEl = $('ca-article-actions');
  const articleBadgesEl = $('ca-article-badges');
  const articleTitleEl = $('ca-article-title');
  const articleTitleOrEl = $('ca-article-title-or');
  const articleTagsEl = $('ca-article-tags');
  const articleCoverEl = $('ca-article-cover');
  const articleSummaryEl = $('ca-article-summary');
  const articleBodyEl = $('ca-article-body');

  let state = {
    page: 1,
    limit: 12,
    q: '',
    category: '',
    preferOdia: false,
    activeArticle: null
  };
  let searchTimer = null;

  function renderBreadcrumb(articleTitle) {
    if (!breadcrumbEl) return;
    breadcrumbEl.replaceChildren();

    const liHome = el('li');
    const aHome = el('a', '', 'Home');
    aHome.href = '../index.html';
    liHome.appendChild(aHome);
    breadcrumbEl.appendChild(liHome);

    if (!articleTitle) {
      const liCur = el('li');
      liCur.setAttribute('aria-current', 'page');
      liCur.appendChild(el('strong', '', 'Current Affairs'));
      breadcrumbEl.appendChild(liCur);
      return;
    }

    const liSection = el('li');
    const btnSection = el('button', '', 'Current Affairs');
    btnSection.type = 'button';
    btnSection.addEventListener('click', () => closeArticle(true));
    liSection.appendChild(btnSection);
    breadcrumbEl.appendChild(liSection);

    const liArt = el('li');
    liArt.setAttribute('aria-current', 'page');
    liArt.appendChild(el('strong', '', articleTitle));
    breadcrumbEl.appendChild(liArt);
  }

  function ensureCategoryChip(cat) {
    if (!categoryBar || !cat) return;
    const exists = Array.from(categoryBar.querySelectorAll('.pc-chip')).some(
      b => (b.dataset.category || '').toLowerCase() === cat.toLowerCase()
    );
    if (!exists) {
      const chip = el('button', 'pc-chip', cat);
      chip.type = 'button';
      chip.dataset.category = cat;
      categoryBar.appendChild(chip);
    }
  }

  function updateCategoryChipsUI() {
    if (!categoryBar) return;
    categoryBar.querySelectorAll('.pc-chip').forEach(btn => {
      const active = (btn.dataset.category || '') === state.category;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function renderCard(item) {
    const card = el('article', 'pc-card');
    const top = el('div');

    if (item.cover_url && pc && pc.safeMediaSrc(item.cover_url)) {
      const img = el('img', 'pc-card__cover');
      img.src = item.cover_url;
      img.alt = item.title || 'Current affair cover';
      img.loading = 'lazy';
      top.appendChild(img);
    }

    const badges = el('div', 'pc-badges');
    if (item.category) {
      ensureCategoryChip(item.category);
      badges.appendChild(el('span', 'pc-badge', item.category));
    }
    const dateStr = item.event_date || item.published_at;
    if (dateStr && pc) {
      badges.appendChild(el('span', 'pc-badge pc-badge--green', pc.formatDate(dateStr)));
    }
    top.appendChild(badges);

    const primaryTitle = (state.preferOdia && item.title_or) ? item.title_or : item.title;
    const secondaryTitle = (state.preferOdia && item.title_or) ? item.title : item.title_or;

    top.appendChild(el('h2', 'pc-card__title', primaryTitle || 'Untitled Update'));
    if (secondaryTitle) {
      top.appendChild(el('p', 'pc-card__subtitle', secondaryTitle));
    }

    const summaryText = (state.preferOdia && item.summary_or) ? item.summary_or : (item.summary || item.summary_or);
    if (summaryText) {
      top.appendChild(el('p', 'pc-card__summary', summaryText));
    }

    if (Array.isArray(item.tags) && item.tags.length > 0) {
      const tagsWrap = el('div', 'pc-tags');
      item.tags.slice(0, 6).forEach(tag => {
        tagsWrap.appendChild(el('span', 'pc-tag', `#${tag}`));
      });
      top.appendChild(tagsWrap);
    }

    card.appendChild(top);

    const footer = el('div', 'pc-card__footer');
    const readBtn = el('button', 'pc-btn pc-btn--primary', 'Read Full Update →');
    readBtn.type = 'button';
    readBtn.addEventListener('click', () => openArticle(item.slug, true));
    footer.appendChild(readBtn);

    if (pc && typeof pc.createBookmarkButton === 'function') {
      footer.appendChild(pc.createBookmarkButton({
        type: 'study',
        id: `ca-${item.slug || item.id}`,
        title: item.title,
        badge: item.category ? `Current Affairs · ${item.category}` : 'Current Affairs',
        url: `/current-affairs/?slug=${encodeURIComponent(item.slug)}`
      }));
    }

    card.appendChild(footer);
    return card;
  }

  function renderPagination(page, limit, total) {
    if (!paginationEl) return;
    paginationEl.replaceChildren();
    const totalPages = Math.ceil((total || 0) / (limit || 12));
    if (totalPages <= 1) {
      paginationEl.hidden = true;
      return;
    }
    paginationEl.hidden = false;

    const prev = el('button', 'pc-btn', '← Previous');
    prev.type = 'button';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        loadList();
      }
    });

    const label = el('span', 'pc-badge', `Page ${page} of ${totalPages}`);

    const next = el('button', 'pc-btn', 'Next →');
    next.type = 'button';
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => {
      if (state.page < totalPages) {
        state.page++;
        loadList();
      }
    });

    paginationEl.append(prev, label, next);
  }

  function renderActiveArticleBody() {
    const art = state.activeArticle;
    if (!art) return;

    const primaryTitle = (state.preferOdia && art.title_or) ? art.title_or : art.title;
    const secondaryTitle = (state.preferOdia && art.title_or) ? art.title : art.title_or;
    articleTitleEl.textContent = primaryTitle || 'Current Affairs Update';

    if (secondaryTitle) {
      articleTitleOrEl.textContent = secondaryTitle;
      articleTitleOrEl.hidden = false;
    } else {
      articleTitleOrEl.hidden = true;
    }

    const summary = (state.preferOdia && art.summary_or) ? art.summary_or : (art.summary || art.summary_or);
    if (summary) {
      articleSummaryEl.textContent = summary;
      articleSummaryEl.hidden = false;
    } else {
      articleSummaryEl.hidden = true;
    }

    const html = (state.preferOdia && art.body_html_or) ? art.body_html_or : (art.body_html || art.body_html_or);
    if (html && pc && typeof pc.renderSanitizedHtml === 'function') {
      pc.renderSanitizedHtml(articleBodyEl, html);
    } else {
      articleBodyEl.replaceChildren(el('p', '', summary || 'No additional article body provided.'));
    }
  }

  async function openArticle(slug, pushHistory = true) {
    if (!slug || !articleViewEl || !listViewEl) return;
    listViewEl.hidden = true;
    articleViewEl.hidden = false;
    articleBadgesEl.replaceChildren();
    articleTitleEl.textContent = 'Loading article…';
    articleTitleOrEl.hidden = true;
    articleTagsEl.replaceChildren();
    articleCoverEl.hidden = true;
    articleSummaryEl.hidden = true;
    articleActionsEl.replaceChildren();
    articleBodyEl.replaceChildren(el('p', '', 'Fetching full update from Common Sense Odisha…'));

    if (pushHistory) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('slug', slug);
        window.history.pushState({ slug }, '', u.toString());
      } catch (_) {}
    }

    try {
      const res = await fetch(`/api/content/current-affairs/${encodeURIComponent(slug)}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(res.status === 404 ? 'This current affairs article was not found or is no longer published.' : `HTTP ${res.status}`);
      const art = await res.json();
      state.activeArticle = art;

      renderBreadcrumb(art.title || 'Article');
      document.title = `${art.title || 'Article'} — Current Affairs | Common Sense Odisha`;

      if (art.category) {
        articleBadgesEl.appendChild(el('span', 'pc-badge', art.category));
      }
      if ((art.event_date || art.published_at) && pc) {
        articleBadgesEl.appendChild(el('span', 'pc-badge pc-badge--green', `📅 ${pc.formatDate(art.event_date || art.published_at)}`));
      }

      if (Array.isArray(art.tags) && art.tags.length > 0) {
        art.tags.forEach(t => articleTagsEl.appendChild(el('span', 'pc-tag', `#${t}`)));
      }

      if (art.cover_url && pc && pc.safeMediaSrc(art.cover_url)) {
        articleCoverEl.src = art.cover_url;
        articleCoverEl.alt = art.title || 'Article cover';
        articleCoverEl.hidden = false;
      }

      if (art.title_or || art.body_html_or || art.summary_or) {
        const toggleLang = el('button', 'pc-btn', state.preferOdia ? '🌐 Switch to English' : '🌐 ଓଡ଼ିଆରେ ପଢ଼ନ୍ତୁ');
        toggleLang.type = 'button';
        toggleLang.addEventListener('click', () => {
          state.preferOdia = !state.preferOdia;
          toggleLang.textContent = state.preferOdia ? '🌐 Switch to English' : '🌐 ଓଡ଼ିଆରେ ପଢ଼ନ୍ତୁ';
          renderActiveArticleBody();
        });
        articleActionsEl.appendChild(toggleLang);
      }

      if (pc && typeof pc.createBookmarkButton === 'function') {
        articleActionsEl.appendChild(pc.createBookmarkButton({
          type: 'study',
          id: `ca-${art.slug || art.id}`,
          title: art.title,
          badge: art.category ? `Current Affairs · ${art.category}` : 'Current Affairs',
          url: `/current-affairs/?slug=${encodeURIComponent(art.slug)}`
        }));
      }

      renderActiveArticleBody();

      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
        window.CSOBookmarks.updateUI();
      }
    } catch (err) {
      articleTitleEl.textContent = 'Unable to load article';
      articleBodyEl.replaceChildren(el('p', '', err.message || 'Please try again later.'));
    }
  }

  function closeArticle(pushHistory = true) {
    state.activeArticle = null;
    if (articleViewEl) articleViewEl.hidden = true;
    if (listViewEl) listViewEl.hidden = false;
    renderBreadcrumb(null);
    document.title = 'Current Affairs & Daily Updates | Common Sense Odisha';
    if (pushHistory) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('slug');
        window.history.pushState({}, '', u.toString());
      } catch (_) {}
    }
  }

  async function loadList() {
    if (!gridEl || !statusEl) return;
    const hasFilter = Boolean(state.q || state.category);
    if (resetBtn) resetBtn.hidden = !hasFilter;
    if (searchClearBtn) searchClearBtn.hidden = !state.q;

    statusEl.hidden = false;
    statusEl.replaceChildren(
      el('h3', '', 'Loading Current Affairs…'),
      el('p', '', 'Fetching verified Odisha & national updates.')
    );
    gridEl.replaceChildren();

    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);

    try {
      const res = await fetch(`/api/content/current-affairs?${params.toString()}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const total = Number(data.total) || items.length;

      if (countLabel) {
        countLabel.textContent = `${total.toLocaleString('en-IN')} published ${total === 1 ? 'update' : 'updates'}`;
      }

      if (items.length === 0) {
        statusEl.hidden = false;
        statusEl.replaceChildren(
          el('h3', '', hasFilter ? 'No matching current affairs found' : 'No current affairs published yet'),
          el('p', '', hasFilter
            ? 'Try clearing your search keyword or switching category filters.'
            : 'New daily current affairs digests and Odisha state updates will appear here automatically once published.')
        );
        if (paginationEl) paginationEl.hidden = true;
        return;
      }

      statusEl.hidden = true;
      const frag = document.createDocumentFragment();
      items.forEach(item => frag.appendChild(renderCard(item)));
      gridEl.appendChild(frag);
      renderPagination(data.page || state.page, data.limit || state.limit, total);

      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
        window.CSOBookmarks.updateUI();
      }
    } catch (err) {
      if (countLabel) countLabel.textContent = 'Feed unavailable';
      statusEl.hidden = false;
      const retry = el('button', 'pc-btn pc-btn--primary', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', loadList);
      statusEl.replaceChildren(
        el('h3', '', 'Unable to load current affairs'),
        el('p', '', 'Please check your connection and try again.'),
        retry
      );
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.q = searchInput.value.trim();
        state.page = 1;
        loadList();
      }, 220);
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.q = '';
      state.page = 1;
      loadList();
    });
  }

  if (categoryBar) {
    categoryBar.addEventListener('click', e => {
      const btn = e.target.closest('.pc-chip');
      if (!btn) return;
      state.category = btn.dataset.category || '';
      state.page = 1;
      updateCategoryChipsUI();
      loadList();
    });
  }

  if (langBtn) {
    langBtn.addEventListener('click', () => {
      state.preferOdia = !state.preferOdia;
      langBtn.classList.toggle('is-active', state.preferOdia);
      langBtn.setAttribute('aria-pressed', String(state.preferOdia));
      if (state.activeArticle) renderActiveArticleBody();
      else loadList();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.q = '';
      state.category = '';
      state.page = 1;
      if (searchInput) searchInput.value = '';
      updateCategoryChipsUI();
      loadList();
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => closeArticle(true));
  }

  window.addEventListener('popstate', () => {
    const slug = new URLSearchParams(window.location.search).get('slug');
    if (slug) openArticle(slug, false);
    else closeArticle(false);
  });

  const initialParams = new URLSearchParams(window.location.search);
  const initialCat = initialParams.get('category');
  const initialQ = initialParams.get('q');
  const initialSlug = initialParams.get('slug');
  if (initialCat) {
    ensureCategoryChip(initialCat);
    state.category = initialCat;
    updateCategoryChipsUI();
  }
  if (initialQ) {
    state.q = initialQ;
    if (searchInput) searchInput.value = initialQ;
  }

  loadList();
  if (initialSlug) {
    openArticle(initialSlug, false);
  }
})();
