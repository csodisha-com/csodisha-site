/**
 * Common Sense Odisha (CSO) — Candidate Bookmark Manager
 * Manages saved jobs, welfare schemes, and study materials across portals.
 * Storage Key: cso_candidate_bookmarks_v1
 * Dispatches: 'cso:bookmarks-updated' CustomEvent
 */
(function(window) {
  'use strict';

  const STORAGE_KEY = 'cso_candidate_bookmarks_v1';

  const DEFAULT_BOOKMARKS = {
    jobs: [],
    schemes: [],
    study: []
  };

  function getAllBookmarks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_BOOKMARKS };
      const parsed = JSON.parse(raw);
      return {
        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
        schemes: Array.isArray(parsed.schemes) ? parsed.schemes : [],
        study: Array.isArray(parsed.study) ? parsed.study : []
      };
    } catch (e) {
      console.warn('Failed to load candidate bookmarks', e);
      return { ...DEFAULT_BOOKMARKS };
    }
  }

  function saveAllBookmarks(bookmarks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
      window.dispatchEvent(new CustomEvent('cso:bookmarks-updated', { detail: bookmarks }));

      // Trigger cloud sync if online and candidate session active
      syncBookmarksWithCloud(bookmarks);
    } catch (e) {
      console.error('Failed to save candidate bookmarks', e);
    }
  }

  // Background sync bookmarks with Cloudflare D1
  let bmSyncTimeout = null;
  async function syncBookmarksWithCloud(bookmarks) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    clearTimeout(bmSyncTimeout);
    bmSyncTimeout = setTimeout(async () => {
      try {
        const rawSession = localStorage.getItem('cso_candidate_session_v1');
        if (!rawSession) return;
        const session = JSON.parse(rawSession);
        if (!session || !session.id) return;

        // Flatten bookmarks array for cloud API. post_id is prefixed with the
        // shelf type ('jobs:'/'schemes:'/'study:') so shelf placement survives
        // the server's strict category enum round-trip; the server treats
        // post_id as an opaque key.
        const all = bookmarks || getAllBookmarks();
        const flatList = [];
        ['jobs', 'schemes', 'study'].forEach(cat => {
          if (Array.isArray(all[cat])) {
            all[cat].forEach(item => {
              flatList.push({
                postId: `${cat}:${item.id}`,
                postTitle: item.title,
                postUrl: item.url || item.pdfUrl || '',
                category: item.badge || cat,
                deadlineDate: item.deadline || item.deadlineDate || null
              });
            });
          }
        });

        await fetch('/api/candidate/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookmarks: flatList })
        });
      } catch (err) {
        console.warn('Bookmarks cloud sync notice:', err.message);
      }
    }, 1200);
  }

  // Initial cloud reconciliation on startup
  async function reconcileBookmarksFromCloud() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    try {
      const res = await fetch('/api/candidate/bookmarks');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success && Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
        const current = getAllBookmarks();
        let changed = false;

        data.bookmarks.forEach(bm => {
          // New spec shape (postId/postTitle/postUrl/deadlineDate) with legacy
          // aliases (article_id/title/url) still honoured.
          const rawPostId = bm.postId || bm.post_id || bm.article_id || '';
          const title = bm.postTitle || bm.post_title || bm.title || 'Saved Item';
          const url = bm.postUrl || bm.post_url || bm.url || '';
          const deadline = bm.deadlineDate || bm.deadline_date || null;

          // Decode the shelf type from the post_id prefix; recruitment-post
          // categories default to the jobs shelf, everything else to study.
          let shelf = null;
          const prefixMatch = /^(jobs|schemes|study):/.exec(String(rawPostId));
          if (prefixMatch) {
            shelf = prefixMatch[1];
          } else if (['OPSC', 'OSSC', 'OSSSC', 'TEACHING'].includes(bm.category)) {
            shelf = 'jobs';
          } else {
            shelf = 'study';
          }
          const itemId = prefixMatch ? String(rawPostId).slice(prefixMatch[0].length) : String(rawPostId);

          if (!current[shelf]) current[shelf] = [];
          const exists = current[shelf].some(x => String(x.id) === String(itemId));
          if (!exists) {
            current[shelf].unshift({
              id: itemId,
              title: title,
              url: url,
              deadline: deadline || undefined,
              badge: shelf.toUpperCase(),
              savedAt: bm.createdAt ? new Date(bm.createdAt).toISOString() : new Date().toISOString()
            });
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
          updateBookmarkButtonsUI();
          window.dispatchEvent(new CustomEvent('cso:bookmarks-updated', { detail: current }));
        }
      }
    } catch (err) {
      console.warn('Bookmarks cloud reconcile notice:', err.message);
    }
  }

  function getBookmarksByType(type) {
    const all = getAllBookmarks();
    return all[type] || [];
  }

  function isBookmarked(type, id) {
    if (!type || !id) return false;
    const list = getBookmarksByType(type);
    return list.some(item => String(item.id) === String(id));
  }

  function toggleBookmark(type, item) {
    if (!type || !item || !item.id) return false;
    const all = getAllBookmarks();
    all[type] = all[type] || [];

    const existingIndex = all[type].findIndex(b => String(b.id) === String(item.id));
    let added = false;

    if (existingIndex !== -1) {
      all[type].splice(existingIndex, 1);
      added = false;
    } else {
      all[type].unshift({
        id: String(item.id),
        title: item.title || 'Saved Item',
        titleOdia: item.titleOdia || '',
        badge: item.badge || item.category || type.toUpperCase(),
        url: item.url || '',
        pdfUrl: item.pdfUrl || item.link || '',
        deadline: item.deadline || item.deadlineDate || undefined,
        savedAt: new Date().toISOString()
      });
      added = true;
    }

    saveAllBookmarks(all);
    updateBookmarkButtonsUI();
    return added;
  }

  function removeBookmark(type, id) {
    const all = getAllBookmarks();
    if (all[type]) {
      all[type] = all[type].filter(item => String(item.id) !== String(id));
      saveAllBookmarks(all);
      updateBookmarkButtonsUI();
    }
  }

  // Updates all visible bookmark buttons on current page to match active state
  function updateBookmarkButtonsUI() {
    const buttons = document.querySelectorAll('.cso-bookmark-btn');
    buttons.forEach(btn => {
      const type = btn.dataset.bookmarkType;
      const id = btn.dataset.bookmarkId;
      if (type && id) {
        const bookmarked = isBookmarked(type, id);
        btn.classList.toggle('bookmarked', bookmarked);
        btn.setAttribute('aria-pressed', String(bookmarked));
        btn.innerHTML = bookmarked
          ? '<span style="color:#f59e0b;" aria-hidden="true">★</span> <span class="cso-bm-text">Saved</span>'
          : '<span style="color:#94a3b8;" aria-hidden="true">☆</span> <span class="cso-bm-text">Bookmark</span>';
        btn.style.borderColor = bookmarked ? '#f59e0b' : '#334155';
        btn.style.color = bookmarked ? '#fbbf24' : '#94a3b8';
      }
    });
  }

  // Global click delegator for bookmark triggers
  function initBookmarkDelegator() {
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.cso-bookmark-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const type = btn.dataset.bookmarkType;
      const id = btn.dataset.bookmarkId;
      const title = btn.dataset.bookmarkTitle || btn.closest('.card, .cso-card, [data-id]')?.querySelector('h2, h3, h4, .title')?.textContent?.trim() || id;
      const badge = btn.dataset.bookmarkBadge || btn.dataset.bookmarkCat || '';
      const url = btn.dataset.bookmarkUrl || window.location.href;
      const pdfUrl = btn.dataset.bookmarkPdf || '';
      const deadline = btn.dataset.bookmarkDeadline || '';

      const isNowBookmarked = toggleBookmark(type, { id, title, badge, url, pdfUrl, deadline });

      // Toast feedback if available
      if (window.CSOSuperStore && typeof window.CSOSuperStore.showToast === 'function') {
        window.CSOSuperStore.showToast(
          isNowBookmarked ? '★ Saved to your Student Dashboard!' : 'Removed from bookmarks.',
          isNowBookmarked ? 'success' : 'info'
        );
      }
    });

    window.addEventListener('storage', function(e) {
      if (e.key === STORAGE_KEY) {
        updateBookmarkButtonsUI();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initBookmarkDelegator();
      updateBookmarkButtonsUI();
      reconcileBookmarksFromCloud();
    });
  } else {
    initBookmarkDelegator();
    updateBookmarkButtonsUI();
    reconcileBookmarksFromCloud();
  }

  window.CSOBookmarks = {
    getAllBookmarks,
    getBookmarksByType,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    updateUI: updateBookmarkButtonsUI
  };

})(window);
