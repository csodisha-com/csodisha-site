/**
 * Common Sense Odisha (CSO) — Offline-First PWA Sync Engine
 *
 * window.CSOSync — bridges local candidate state (Checklists, Bookmarks,
 * Locker, Notes, Mock Scores) with Cloudflare D1, backed by an IndexedDB
 * mutation queue (cso-idb.js) for offline resilience.
 *
 * Optimistic flow for every candidate mutation:
 *   1. UI reflects instantly (caller's job).
 *   2. Local write: state mirrors into IndexedDB immediately.
 *   3. Network dispatch: if online, fire the request at once.
 *   4. Offline / non-4xx failure: append to sync_queue; show the
 *      "Saved offline" status pill.
 *   5. Auto-reconnection: window 'online' + Service Worker 'sync' events
 *      drain the queue FIFO; on success show "All changes synced".
 *
 * The core sync logic is built by _createSyncCore(overrides) so automated
 * tests can inject { fetch, isOnline, idb } fakes.
 */
(function(root) {
  'use strict';

  const SESSION_KEY = 'cso_candidate_session_v1';
  const CHECKLIST_KEY = 'cso_candidate_checklist_v1';
  const LOCKER_KEY = 'cso_candidate_locker_v1';
  const NOTES_KEY = 'cso_candidate_notes_v1';
  const SCORES_KEY = 'cso_candidate_mock_scores_v1';

  // Canonical endpoints (session-cookie authenticated; client IDs never sent).
  const CHECKLIST_ENDPOINT = '/api/candidate/checklist';
  const BOOKMARKS_ENDPOINT = '/api/candidate/bookmarks';
  const SYNC_ENDPOINT = '/api/sync';

  const STATUS_OFFLINE = 'Saved offline (Changes will sync automatically)';
  const STATUS_SYNCED = 'All changes synced';
  const STATUS_SYNCING = 'Syncing changes…';

  // Fire a CustomEvent only where the environment supports it (browser).
  function safeDispatch(type, detail) {
    const root = typeof window !== 'undefined' ? window : globalThis;
    if (typeof root.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      try { root.dispatchEvent(new CustomEvent(type, { detail })); } catch (e) { /* non-fatal */ }
    }
  }

  /**
   * Build the sync core. All side-effectful dependencies are injectable:
   *   fetch    — HTTP client (default: global fetch)
   *   isOnline — () => boolean connectivity probe (default: navigator.onLine)
   *   idb      — cso-idb module (default: root.CSOIdb)
   *   onStatus — (text, kind) status reporter (default: DOM status pill)
   *   logger   — console-compatible sink
   */
  function _createSyncCore(overrides) {
    const cfg = overrides || {};
    const fetchImpl = cfg.fetch || (typeof fetch === 'function' ? fetch : null);
    const isOnline = cfg.isOnline || (typeof navigator !== 'undefined'
      ? () => navigator.onLine
      : () => true);
    const idb = cfg.idb || (root && root.CSOIdb) || null;
    const onStatus = cfg.onStatus || (typeof document !== 'undefined' ? defaultStatusPill : () => {});
    const logger = cfg.logger || console;

    if (!idb) {
      logger.warn && logger.warn('CSOSync: IndexedDB layer unavailable — offline queue disabled');
    }
    if (!fetchImpl) {
      logger.warn && logger.warn('CSOSync: fetch unavailable — cloud dispatch disabled');
    }

    let flushing = false;
    let lastStatusKey = null;

    function emitStatus(text, kind) {
      const key = text + '|' + kind;
      if (key === lastStatusKey) return; // suppress duplicate pills
      lastStatusKey = key;
      try { onStatus(text, kind); } catch (e) { /* non-fatal */ }
    }

    // Dispatch one queued action to the network.
    // Resolves { ok: true } on 2xx, rejects with:
    //   { permanent: true, status } — 4xx (client error; retrying is futile)
    //   { permanent: false }        — offline / 5xx / network error
    async function attemptDispatch(entry) {
      if (!fetchImpl) {
        throw { permanent: false, offline: true };
      }
      if (!isOnline()) {
        throw { permanent: false, offline: true };
      }

      const init = {
        method: entry.method || 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      };
      if (entry.body !== undefined && entry.body !== null && init.method !== 'GET') {
        init.body = typeof entry.body === 'string' ? entry.body : JSON.stringify(entry.body);
      }

      let response;
      try {
        response = await fetchImpl(entry.url, init);
      } catch (err) {
        throw { permanent: false, cause: err };
      }

      if (response.ok) {
        return { ok: true, response };
      }
      if (response.status >= 400 && response.status < 500) {
        throw { permanent: true, status: response.status };
      }
      throw { permanent: false, status: response.status };
    }

    // Drain sync_queue sequentially (FIFO). Rules:
    //   - success            → delete entry, continue
    //   - 4xx                → delete entry (permanent failure), continue
    //   - offline / 5xx      → retryCount++, stop draining (preserve order)
    async function flushQueue() {
      if (!idb || flushing) {
        return { flushed: 0, remaining: null, stoppedOffline: !isOnline() };
      }
      if (!isOnline()) {
        return { flushed: 0, remaining: null, stoppedOffline: true };
      }

      flushing = true;
      let flushed = 0;
      let stoppedOffline = false;

      try {
        const queue = await idb.getSyncQueue();
        const ordered = Array.isArray(queue) ? [...queue].sort((a, b) => (a.id || 0) - (b.id || 0)) : [];

        if (ordered.length > 0) {
          emitStatus(STATUS_SYNCING, 'info');
        }

        for (const entry of ordered) {
          try {
            await attemptDispatch(entry);
            await idb.deleteSyncAction(entry.id);
            flushed++;
          } catch (err) {
            if (err && err.permanent) {
              // 4xx: server rejected the payload — retrying is futile.
              logger.warn && logger.warn('CSOSync: dropped permanently failed action', entry.url, err.status);
              await idb.deleteSyncAction(entry.id);
            } else {
              // Network/5xx: keep the entry, bump retryCount, stop FIFO drain.
              stoppedOffline = !isOnline();
              try { await idb.bumpRetryCount(entry); } catch (e2) { /* keep going */ }
              break;
            }
          }
        }

        const remaining = await idb.getSyncQueue();
        const remainingCount = Array.isArray(remaining) ? remaining.length : 0;

        if (flushed > 0 && remainingCount === 0) {
          emitStatus(STATUS_SYNCED, 'success');
          if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
            safeDispatch('cso:sync-queue-drained', { flushed });
          }
        }
        if (stoppedOffline) {
          emitStatus(STATUS_OFFLINE, 'offline');
        }

        return { flushed, remaining: remainingCount, stoppedOffline };
      } finally {
        flushing = false;
      }
    }

    // Optimistic mutation: dispatch immediately; on failure queue in IDB.
    //   - success              → { dispatched: true, queued: false }
    //   - 4xx                  → { dispatched: false, queued: false, dropped: true }
    //   - offline / 5xx / net  → { dispatched: false, queued: true }
    async function queueAction(url, method, body) {
      const entry = { url, method, body, timestamp: Date.now(), retryCount: 0 };

      // Never queue when there is no IndexedDB layer — fall back to the
      // in-memory catch below is pointless, so just report failure quietly.
      try {
        await attemptDispatch(entry);
        return { dispatched: true, queued: false };
      } catch (err) {
        const permanent = !!(err && err.permanent);
        const offline = !!(err && err.offline) || !isOnline();

        if (permanent) {
          logger.warn && logger.warn('CSOSync: action rejected by server (not queued)', url, err.status);
          return { dispatched: false, queued: false, dropped: true, status: err.status };
        }

        if (idb) {
          try {
            await idb.enqueueSyncAction({ url, method, body, timestamp: entry.timestamp });
          } catch (idbErr) {
            logger.error && logger.error('CSOSync: failed to enqueue action', idbErr);
          }
        }
        emitStatus(STATUS_OFFLINE, 'offline');
        if (offline && typeof CustomEvent === 'function') {
          safeDispatch('cso:saved-offline');
        }
        return { dispatched: false, queued: true, offline };
      }
    }

    // ---- Optimistic domain actions (mirror into IDB, then dispatch) ----

    // Checklist toggle: mirror { id, exam_code, milestone_key, is_completed }
    // into IDB, then dispatch the single-toggle payload.
    async function recordChecklistChange(examCode, milestoneKey, isCompleted) {
      const exam = String(examCode || '').toUpperCase();
      const milestone = String(milestoneKey || '');

      if (idb) {
        try {
          await idb.putRecord(idb.STORE_CHECKLIST, {
            id: idb.checklistRecordId(exam, milestone),
            exam_code: exam,
            milestone_key: milestone,
            is_completed: isCompleted ? 1 : 0
          });
        } catch (err) {
          logger.warn && logger.warn('CSOSync: checklist mirror failed', err);
        }
      }

      return queueAction(CHECKLIST_ENDPOINT, 'POST', {
        examStream: exam.toLowerCase(),
        topicId: milestone,
        completed: !!isCompleted
      });
    }

    // Bookmark save/remove: mirror the full set into IDB, then dispatch.
    //   saveBookmarkAction('save'  , bookmark)
    //   saveBookmarkAction('remove', { postId })
    async function saveBookmarkAction(action, bookmark) {
      const record = {
        post_id: String((bookmark && (bookmark.postId || bookmark.post_id)) || ''),
        category: (bookmark && bookmark.category) || 'OTHER',
        post_title: (bookmark && (bookmark.postTitle || bookmark.post_title || bookmark.title)) || 'Saved Item',
        post_url: (bookmark && (bookmark.postUrl || bookmark.post_url || bookmark.url)) || '',
        deadline_date: (bookmark && (bookmark.deadlineDate || bookmark.deadline_date || bookmark.deadline)) || null
      };

      if (idb && record.post_id) {
        try {
          if (action === 'remove') {
            await idb.deleteRecord(idb.STORE_BOOKMARKS, record.post_id);
          } else {
            await idb.putRecord(idb.STORE_BOOKMARKS, record);
          }
        } catch (err) {
          logger.warn && logger.warn('CSOSync: bookmark mirror failed', err);
        }
      }

      const payload = action === 'remove'
        ? { action: 'delete', postId: record.post_id }
        : {
            postId: record.post_id,
            postTitle: record.post_title,
            postUrl: record.post_url,
            category: record.category,
            deadlineDate: record.deadline_date
          };

      return queueAction(BOOKMARKS_ENDPOINT, 'POST', payload);
    }

    return {
      attemptDispatch,
      flushQueue,
      queueAction,
      recordChecklistChange,
      saveBookmarkAction,
      emitStatus,
      isOnline,
      STATUS_OFFLINE,
      STATUS_SYNCED,
      STATUS_SYNCING
    };
  }

  /**
   * Unobtrusive fixed status pill (bottom-center). Kinds: info | success | offline.
   */
  function defaultStatusPill(text, kind) {
    if (typeof document === 'undefined') return;
    let pill = document.getElementById('cso-sync-status-pill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'cso-sync-status-pill';
      pill.className = 'cso-sync-pill';
      document.body.appendChild(pill);
    }

    pill.textContent = text;
    pill.dataset.kind = kind || 'info';
    pill.classList.add('is-visible');

    clearTimeout(defaultStatusPill._timer);
    if (kind === 'success') {
      defaultStatusPill._timer = setTimeout(() => {
        pill.classList.remove('is-visible');
      }, 4000);
    }
  }

  // ---- Browser instance wiring ----
  function getLocalCandidateSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  let isSyncing = false;
  let syncDebounceTimer = null;

  async function pushLocalStateToCloud() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    const session = getLocalCandidateSession();
    if (!session || !session.id) {
      return;
    }

    if (isSyncing) return;
    isSyncing = true;

    try {
      let checklists = {};
      let locker = {};
      let notes = '';
      let mockScores = [];
      try {
        const raw = localStorage.getItem(CHECKLIST_KEY);
        if (raw) checklists = JSON.parse(raw);
      } catch (e) {}
      try {
        const raw = localStorage.getItem(LOCKER_KEY);
        if (raw) locker = JSON.parse(raw);
      } catch (e) {}
      try {
        notes = localStorage.getItem(NOTES_KEY) || '';
      } catch (e) {}
      try {
        const raw = localStorage.getItem(SCORES_KEY);
        if (raw) mockScores = JSON.parse(raw);
      } catch (e) {}

      const response = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklists, locker, notes, mockScores })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          safeDispatch('cso:cloud-synced', data);
        }
      } else {
        console.warn('CSOSync: Background sync responded with status', response.status);
      }
    } catch (err) {
      console.warn('CSOSync: Network offline or sync endpoint unreachable', err.message);
    } finally {
      isSyncing = false;
    }
  }

  async function pullCloudStateToLocal(candidateId) {
    // candidateId is accepted for backward compatibility but never trusted —
    // the server resolves identity from the HttpOnly session cookie.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      const response = await fetch(SYNC_ENDPOINT, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (data.checklists && Object.keys(data.checklists).length > 0) {
            localStorage.setItem(CHECKLIST_KEY, JSON.stringify(data.checklists));
          }
          if (data.locker && Object.keys(data.locker).length > 0) {
            localStorage.setItem(LOCKER_KEY, JSON.stringify(data.locker));
          }
          if (data.notes) {
            localStorage.setItem(NOTES_KEY, data.notes);
          }
          if (Array.isArray(data.mockScores) && data.mockScores.length > 0) {
            localStorage.setItem(SCORES_KEY, JSON.stringify(data.mockScores));
          }
          safeDispatch('cso:cloud-hydrated', data);
        }
      }
    } catch (err) {
      console.warn('CSOSync: Cloud state pull skipped', err.message);
    }
  }

  function queueDebouncedSync(delayMs = 1500) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      pushLocalStateToCloud();
    }, delayMs);
  }

  const core = _createSyncCore();

  // Reactive listeners: reconnect → drain queue, then bulk-sync state.
  if (typeof root.addEventListener === 'function') {
    root.addEventListener('online', () => {
      core.flushQueue();
      queueDebouncedSync(2000);
    });

    root.addEventListener('storage', (e) => {
      if ([CHECKLIST_KEY, LOCKER_KEY, NOTES_KEY, SCORES_KEY].includes(e.key)) {
        queueDebouncedSync();
      }
    });

    // Service Worker background-sync bridge: the SW's `sync` event handler
    // posts this message to all clients; every dashboard instance drains.
    if (root.navigator && root.navigator.serviceWorker) {
      root.navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CSO_FLUSH_SYNC_QUEUE') {
          core.flushQueue();
        }
      });
    }
  }

  const publicApi = {
    // Legacy full-state API
    pushLocalStateToCloud,
    pullCloudStateToLocal,
    queueDebouncedSync,
    // Offline-first queue API
    queueAction: core.queueAction,
    flushQueue: core.flushQueue,
    attemptDispatch: core.attemptDispatch,
    recordChecklistChange: core.recordChecklistChange,
    saveBookmarkAction: core.saveBookmarkAction,
    showStatus: core.emitStatus,
    STATUS_OFFLINE,
    STATUS_SYNCED,
    _createSyncCore
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = publicApi;
  } else {
    root.CSOSync = publicApi;
  }

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
