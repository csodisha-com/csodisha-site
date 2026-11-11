/**
 * Common Sense Odisha (CSO) — IndexedDB Local Store (zero-dependency)
 *
 * Database: CSO_LOCAL_DB (version 1)
 *   bookmarks   keyPath 'post_id'   — mirror of saved recruitment posts
 *   checklist   keyPath 'id'        — one row per exam_code+milestone_key
 *   sync_queue  autoIncrement 'id'  — { url, method, body, timestamp, retryCount }
 *
 * Attached as window.CSOIdb in browsers; exported for Node tests (tests
 * inject their own indexedDB implementation).
 */
(function(root, factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSOIdb = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const DB_NAME = 'CSO_LOCAL_DB';
  const DB_VERSION = 1;

  const STORE_BOOKMARKS = 'bookmarks';
  const STORE_CHECKLIST = 'checklist';
  const STORE_SYNC_QUEUE = 'sync_queue';

  function openDb(indexedDbImpl) {
    const impl = indexedDbImpl || (typeof indexedDB !== 'undefined' ? indexedDB : null);
    if (!impl) {
      return Promise.reject(new Error('IndexedDB unavailable in this environment'));
    }
    return new Promise((resolve, reject) => {
      const request = impl.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
          db.createObjectStore(STORE_BOOKMARKS, { keyPath: 'post_id' });
        }
        if (!db.objectStoreNames.contains(STORE_CHECKLIST)) {
          // 'id' is '<exam_code>::<milestone_key>' — a stable composite of the
          // spec's (exam_code, milestone_key) natural key.
          db.createObjectStore(STORE_CHECKLIST, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          const queue = db.createObjectStore(STORE_SYNC_QUEUE, {
            keyPath: 'id',
            autoIncrement: true
          });
          queue.createIndex('by_timestamp', 'timestamp');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    });
  }

  let dbPromise = null;
  function getDb() {
    if (!dbPromise) dbPromise = openDb();
    return dbPromise;
  }

  function promisify(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
  }

  // Transactions dispatch 'complete' (not 'success') when they commit.
  function txComplete(t) {
    return new Promise((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error || new Error('IndexedDB transaction failed'));
      t.onabort = () => reject(t.error || new Error('IndexedDB transaction aborted'));
    });
  }

  async function tx(stores, mode, fn) {
    const db = await getDb();
    return fn(db.transaction(stores, mode));
  }

  // ---- Generic record helpers ----

  function putRecord(storeName, value) {
    return tx([storeName], 'readwrite', (t) => promisify(t.objectStore(storeName).put(value)));
  }

  function putRecords(storeName, values) {
    return tx([storeName], 'readwrite', (t) => {
      const os = t.objectStore(storeName);
      (values || []).forEach(v => os.put(v));
      return txComplete(t);
    });
  }

  function getRecord(storeName, key) {
    return tx([storeName], 'readonly', (t) => promisify(t.objectStore(storeName).get(key)));
  }

  function getAllRecords(storeName) {
    return tx([storeName], 'readonly', (t) => promisify(t.objectStore(storeName).getAll()));
  }

  function deleteRecord(storeName, key) {
    return tx([storeName], 'readwrite', (t) => promisify(t.objectStore(storeName).delete(key)));
  }

  function clearStore(storeName) {
    return tx([storeName], 'readwrite', (t) => promisify(t.objectStore(storeName).clear()));
  }

  // ---- Bookmarks mirror ----

  // A bookmark record mirrors the canonical API shape: post_id, category,
  // post_title, post_url, deadline_date.
  function mirrorBookmarks(list) {
    return putRecords(STORE_BOOKMARKS, list || []);
  }

  function getBookmarks() {
    return getAllRecords(STORE_BOOKMARKS);
  }

  // ---- Checklist mirror ----

  // record: { id: '<exam_code>::<milestone_key>', exam_code, milestone_key, is_completed }
  function checklistRecordId(examCode, milestoneKey) {
    return `${String(examCode || '').toUpperCase()}::${String(milestoneKey || '')}`;
  }

  function mirrorChecklist(records) {
    return putRecords(STORE_CHECKLIST, records || []);
  }

  function getChecklist() {
    return getAllRecords(STORE_CHECKLIST);
  }

  // ---- Sync queue ----

  // Enqueue a deferred mutation. Uses the autoIncrement keyPath value from
  // the put request (request.result holds the generated id in IndexedDB).
  function enqueueSyncAction({ url, method, body, timestamp }) {
    const record = {
      url: String(url || ''),
      method: String(method || 'POST').toUpperCase(),
      body: body === undefined ? null : body,
      timestamp: timestamp || Date.now(),
      retryCount: 0
    };
    return tx([STORE_SYNC_QUEUE], 'readwrite', (t) => {
      const request = t.objectStore(STORE_SYNC_QUEUE).put(record);
      return promisify(request).then(() => request.result);
    });
  }

  // FIFO drain order: lowest id first (= oldest first).
  function getSyncQueue() {
    return tx([STORE_SYNC_QUEUE], 'readonly', (t) => promisify(t.objectStore(STORE_SYNC_QUEUE).getAll()))
      .then(items => (items || []).sort((a, b) => (a.id || 0) - (b.id || 0)));
  }

  function deleteSyncAction(id) {
    return deleteRecord(STORE_SYNC_QUEUE, id);
  }

  function bumpRetryCount(record) {
    return putRecord(STORE_SYNC_QUEUE, { ...record, retryCount: (record.retryCount || 0) + 1 });
  }

  function clearSyncQueue() {
    return clearStore(STORE_SYNC_QUEUE);
  }

  return {
    DB_NAME,
    DB_VERSION,
    STORE_BOOKMARKS,
    STORE_CHECKLIST,
    STORE_SYNC_QUEUE,
    openDb,
    getDb,
    putRecord,
    putRecords,
    getRecord,
    getAllRecords,
    deleteRecord,
    clearStore,
    mirrorBookmarks,
    getBookmarks,
    checklistRecordId,
    mirrorChecklist,
    getChecklist,
    enqueueSyncAction,
    getSyncQueue,
    deleteSyncAction,
    bumpRetryCount,
    clearSyncQueue
  };
});
