/**
 * Common Sense Odisha (CSO) — Cross-Device Candidate Bookmark Manager
 * Authenticated users read/write directly to D1 via /api/user/bookmarks
 * (and auto-sync guest localStorage bookmarks on sign-in via /api/user/bookmarks/sync).
 * Guests seamlessly fall back to localStorage (cso_candidate_bookmarks_v1).
 * Strict CSP-compliant: zero inline styles, zero innerHTML.
 */
(function (window) {
  'use strict';

  const STORAGE_KEY = 'cso_candidate_bookmarks_v1';
  const SYNCED_FLAG_KEY = 'cso_bookmarks_d1_synced_v1';

  const DEFAULT_BOOKMARKS = {
    jobs: [],
    schemes: [],
    study: []
  };

  const VALID_API_TYPES = ['job', 'current-affair', 'mock-test', 'resource'];

  function toShelfType(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'job' || t === 'jobs') return 'jobs';
    if (t === 'scheme' || t === 'schemes') return 'schemes';
    return 'study';
  }

  function toApiItemType(type, item) {
    const t = String(type || '').toLowerCase();
    if (VALID_API_TYPES.includes(t)) return t;
    if (t === 'jobs') return 'job';
    if (item && VALID_API_TYPES.includes(item.item_type)) return item.item_type;
    const idStr = String((item && (item.item_id || item.id)) || '');
    if (idStr.startsWith('ca-')) return 'current-affair';
    if (idStr.startsWith('mock-')) return 'mock-test';
    return 'resource';
  }

  function typeLabel(apiType) {
    if (apiType === 'job') return 'Job Alert';
    if (apiType === 'current-affair') return 'Current Affairs';
    if (apiType === 'mock-test') return 'Mock Test';
    return 'Resource';
  }

  function getAllBookmarks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { jobs: [], schemes: [], study: [] };
      const parsed = JSON.parse(raw);
      return {
        jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [],
        schemes: Array.isArray(parsed.schemes) ? parsed.schemes : [],
        study: Array.isArray(parsed.study) ? parsed.study : []
      };
    } catch (e) {
      return { ...DEFAULT_BOOKMARKS, jobs: [], schemes: [], study: [] };
    }
  }

  function getFlatBookmarks(bookmarksObj) {
    const all = bookmarksObj || getAllBookmarks();
    const list = [];
    ['jobs', 'schemes', 'study'].forEach(shelf => {
      const arr = Array.isArray(all[shelf]) ? all[shelf] : [];
      arr.forEach(item => {
        if (!item || !item.id) return;
        const apiType = toApiItemType(item.item_type || shelf, item);
        list.push({
          id: String(item.id),
          item_id: String(item.item_id || item.id),
          item_type: apiType,
          shelf,
          title: item.title || 'Saved Item',
          url: item.url || item.pdfUrl || '/',
          badge: item.badge || typeLabel(apiType),
          pdfUrl: item.pdfUrl || '',
          deadline: item.deadline || '',
          meta: item.meta || {
            badge: item.badge || typeLabel(apiType),
            pdfUrl: item.pdfUrl || '',
            deadline: item.deadline || '',
            shelf
          },
          savedAt: item.savedAt || item.created_at || new Date().toISOString()
        });
      });
    });
    return list;
  }

  function writeLocalBookmarks(bookmarks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
      window.dispatchEvent(new CustomEvent('cso:bookmarks-updated', {
        detail: {
          ...bookmarks,
          flat: getFlatBookmarks(bookmarks)
        }
      }));
    } catch (e) {
      // Ignore storage quota errors in restricted contexts
    }
  }

  function saveAllBookmarks(bookmarks) {
    writeLocalBookmarks(bookmarks);
    syncLegacyCandidateBookmarks(bookmarks);
  }

  // Maintain compatibility with legacy /api/candidate/bookmarks endpoint
  let bmSyncTimeout = null;
  function syncLegacyCandidateBookmarks(bookmarks) {
    if (typeof fetch !== 'function') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    clearTimeout(bmSyncTimeout);
    bmSyncTimeout = setTimeout(async () => {
      try {
        const rawSession = localStorage.getItem('cso_candidate_session_v1');
        if (!rawSession) return;
        const session = JSON.parse(rawSession);
        if (!session || !session.id) return;

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
          credentials: 'same-origin',
          body: JSON.stringify({ bookmarks: flatList })
        });
      } catch (_) {}
    }, 1200);
  }

  async function pushD1Upsert(record) {
    if (typeof fetch !== 'function') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      await fetch('/api/user/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSO-CSRF': '1'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          item_type: record.item_type,
          item_id: record.item_id,
          title: record.title,
          url: record.url || '/',
          meta: record.meta || {
            badge: record.badge || '',
            pdfUrl: record.pdfUrl || '',
            deadline: record.deadline || '',
            shelf: record.shelf || toShelfType(record.item_type)
          }
        })
      });
    } catch (_) {}
  }

  async function pushD1Delete(apiType, itemId) {
    if (typeof fetch !== 'function') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      await fetch(`/api/user/bookmarks/${encodeURIComponent(apiType)}/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: { 'X-CSO-CSRF': '1' },
        credentials: 'same-origin'
      });
    } catch (_) {}
  }

  function applyServerItemsToLocal(serverItems) {
    if (!Array.isArray(serverItems)) return;
    const next = { jobs: [], schemes: [], study: [] };

    serverItems.forEach(row => {
      if (!row) return;
      const itemType = VALID_API_TYPES.includes(row.item_type) ? row.item_type : 'resource';
      const itemId = String(row.item_id || row.id || '');
      if (!itemId) return;
      const meta = (row.meta && typeof row.meta === 'object') ? row.meta : {};
      const shelf = meta.shelf && ['jobs', 'schemes', 'study'].includes(meta.shelf)
        ? meta.shelf
        : toShelfType(itemType);

      if (!next[shelf].some(x => String(x.id) === itemId && (x.item_type || toApiItemType(shelf, x)) === itemType)) {
        next[shelf].push({
          id: itemId,
          item_id: itemId,
          item_type: itemType,
          title: row.title || 'Saved Item',
          titleOdia: meta.titleOdia || '',
          badge: meta.badge || typeLabel(itemType),
          url: row.url || '/',
          pdfUrl: meta.pdfUrl || '',
          deadline: meta.deadline || undefined,
          meta,
          savedAt: row.created_at || row.createdAt || new Date().toISOString()
        });
      }
    });

    writeLocalBookmarks(next);
    updateBookmarkButtonsUI();
  }

  // Reconcile & auto-sync localStorage guest bookmarks with D1 /api/user/bookmarks
  async function reconcileBookmarksFromCloud() {
    if (typeof fetch !== 'function') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    try {
      const res = await fetch('/api/user/bookmarks', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        const serverItems = Array.isArray(data && data.items) ? data.items : [];
        const localFlat = getFlatBookmarks();
        const alreadySynced = sessionStorageSafeGet(SYNCED_FLAG_KEY);

        if (localFlat.length > 0 && !alreadySynced) {
          const syncPayload = localFlat.map(b => ({
            item_type: b.item_type,
            item_id: b.item_id,
            title: b.title,
            url: b.url || '/',
            meta: b.meta
          }));
          const syncRes = await fetch('/api/user/bookmarks/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSO-CSRF': '1'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ items: syncPayload })
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            sessionStorageSafeSet(SYNCED_FLAG_KEY, '1');
            if (Array.isArray(syncData && syncData.items)) {
              applyServerItemsToLocal(syncData.items);
              return;
            }
          }
        }

        sessionStorageSafeSet(SYNCED_FLAG_KEY, '1');
        applyServerItemsToLocal(serverItems);
        return;
      }
    } catch (_) {}
  }

  function sessionStorageSafeGet(k) {
    try {
      return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(k) : null;
    } catch (_) {
      return null;
    }
  }

  function sessionStorageSafeSet(k, v) {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(k, v);
    } catch (_) {}
  }

  function getBookmarksByType(type) {
    const all = getAllBookmarks();
    if (type === 'jobs' || type === 'schemes' || type === 'study') {
      return all[type] || [];
    }
    const apiType = toApiItemType(type);
    return getFlatBookmarks(all).filter(item => item.item_type === apiType);
  }

  function isBookmarked(type, id) {
    if (!type || !id) return false;
    const targetId = String(id);
    const all = getAllBookmarks();
    if (type === 'jobs' || type === 'schemes' || type === 'study') {
      return (all[type] || []).some(item => String(item.id) === targetId);
    }
    const apiType = toApiItemType(type);
    const shelf = toShelfType(apiType);
    return (all[shelf] || []).some(item => {
      if (String(item.id) !== targetId) return false;
      return !item.item_type || item.item_type === apiType;
    });
  }

  function toggleBookmark(type, item) {
    if (!type || !item || !item.id) return false;
    const shelf = toShelfType(type);
    const apiType = toApiItemType(type, item);
    const itemId = String(item.id);

    const all = getAllBookmarks();
    all[shelf] = all[shelf] || [];

    const existingIndex = all[shelf].findIndex(b => {
      if (String(b.id) !== itemId) return false;
      if (VALID_API_TYPES.includes(String(type))) {
        return !b.item_type || b.item_type === apiType;
      }
      return true;
    });

    let added = false;

    if (existingIndex !== -1) {
      const removed = all[shelf][existingIndex];
      all[shelf].splice(existingIndex, 1);
      added = false;
      pushD1Delete(toApiItemType(removed.item_type || type, removed), itemId);
    } else {
      const cleanUrl = (item.url && String(item.url).startsWith('/')) || /^https?:\/\//i.test(String(item.url || ''))
        ? String(item.url)
        : (typeof window.location === 'object' && window.location.pathname ? window.location.pathname : '/');
      const record = {
        id: itemId,
        item_id: itemId,
        item_type: apiType,
        shelf,
        title: item.title || 'Saved Item',
        titleOdia: item.titleOdia || '',
        badge: item.badge || item.category || typeLabel(apiType),
        url: cleanUrl,
        pdfUrl: item.pdfUrl || item.link || '',
        deadline: item.deadline || item.deadlineDate || undefined,
        meta: item.meta || {
          badge: item.badge || item.category || typeLabel(apiType),
          pdfUrl: item.pdfUrl || item.link || '',
          deadline: item.deadline || item.deadlineDate || '',
          shelf
        },
        savedAt: new Date().toISOString()
      };
      all[shelf].unshift(record);
      added = true;
      pushD1Upsert(record);
    }

    saveAllBookmarks(all);
    updateBookmarkButtonsUI();

    if (window.CSOSync && typeof window.CSOSync.saveBookmarkAction === 'function') {
      const prefixedId = `${shelf}:${itemId}`;
      if (added) {
        window.CSOSync.saveBookmarkAction('save', {
          postId: prefixedId,
          postTitle: item.title,
          postUrl: item.url || item.pdfUrl || '',
          category: item.badge || shelf.toUpperCase(),
          deadlineDate: item.deadline || item.deadlineDate || null
        });
      } else {
        window.CSOSync.saveBookmarkAction('remove', { postId: prefixedId });
      }
    }
    return added;
  }

  function removeBookmark(type, id) {
    if (!type || !id) return;
    const shelf = toShelfType(type);
    const apiType = toApiItemType(type, { id });
    const targetId = String(id);
    const all = getAllBookmarks();
    if (all[shelf]) {
      all[shelf] = all[shelf].filter(item => {
        if (String(item.id) !== targetId) return true;
        if (VALID_API_TYPES.includes(String(type)) && item.item_type) {
          return item.item_type !== apiType;
        }
        return false;
      });
      saveAllBookmarks(all);
      updateBookmarkButtonsUI();
      pushD1Delete(apiType, targetId);
    }
  }

  function updateBookmarkButtonsUI() {
    if (typeof document.querySelectorAll !== 'function') return;
    const buttons = document.querySelectorAll('.cso-bookmark-btn');
    buttons.forEach(btn => {
      const type = btn.dataset.bookmarkType;
      const id = btn.dataset.bookmarkId;
      if (type && id) {
        const bookmarked = isBookmarked(type, id);
        btn.classList.toggle('bookmarked', bookmarked);
        btn.setAttribute('aria-pressed', String(bookmarked));
        if (typeof document.createElement === 'function' && typeof btn.replaceChildren === 'function') {
          const star = document.createElement('span');
          star.className = bookmarked ? 'cso-bm-star is-saved' : 'cso-bm-star';
          star.setAttribute('aria-hidden', 'true');
          star.textContent = bookmarked ? '★' : '☆';
          const text = document.createElement('span');
          text.className = 'cso-bm-text';
          const idleLabel = btn.dataset.bookmarkIdle || 'Bookmark';
          const savedLabel = btn.dataset.bookmarkSaved || 'Saved';
          text.textContent = bookmarked ? savedLabel : idleLabel;
          btn.replaceChildren(star, ' ', text);
        }
      }
    });
  }

  function initBookmarkDelegator() {
    document.addEventListener('click', function (e) {
      if (!e.target || typeof e.target.closest !== 'function') return;
      const btn = e.target.closest('.cso-bookmark-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const type = btn.dataset.bookmarkType || 'resource';
      const id = btn.dataset.bookmarkId;
      const title = btn.dataset.bookmarkTitle || btn.closest('.card, .cso-card, .pc-card, .live-job-card, [data-id]')?.querySelector('h2, h3, h4, .title')?.textContent?.trim() || id;
      const badge = btn.dataset.bookmarkBadge || btn.dataset.bookmarkCat || '';
      const url = btn.dataset.bookmarkUrl || (window.location ? window.location.pathname + window.location.search : '/');
      const pdfUrl = btn.dataset.bookmarkPdf || '';
      const deadline = btn.dataset.bookmarkDeadline || '';

      const isNowBookmarked = toggleBookmark(type, { id, title, badge, url, pdfUrl, deadline });

      try {
        window.dispatchEvent(new CustomEvent('cso:bookmark-toggled', {
          detail: {
            type,
            id,
            title,
            badge,
            url,
            pdfUrl,
            deadline,
            bookmarked: isNowBookmarked
          }
        }));
      } catch (_) {}

      if (window.CSOSuperStore && typeof window.CSOSuperStore.showToast === 'function') {
        window.CSOSuperStore.showToast(
          isNowBookmarked ? '★ Saved to your Bookmarks!' : 'Removed from bookmarks.',
          isNowBookmarked ? 'success' : 'info'
        );
      }
    });

    window.addEventListener('storage', function (e) {
      if (e && e.key === STORAGE_KEY) {
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
    getFlatBookmarks,
    getBookmarksByType,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    reconcileFromCloud: reconcileBookmarksFromCloud,
    updateUI: updateBookmarkButtonsUI
  };
})(window);
