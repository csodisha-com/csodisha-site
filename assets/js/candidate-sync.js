/**
 * Common Sense Odisha (CSO) — Client-Side Background Sync Engine
 * Resilient, zero-dependency sync controller: window.CSOSync
 * Bridges local state engines (Checklists, Locker, Notes, Mock Scores) with Cloudflare D1
 */
(function(window) {
  'use strict';

  const SESSION_KEY = 'cso_candidate_session_v1';
  const CHECKLIST_KEY = 'cso_candidate_checklist_v1';
  const LOCKER_KEY = 'cso_candidate_locker_v1';
  const NOTES_KEY = 'cso_candidate_notes_v1';
  const SCORES_KEY = 'cso_candidate_mock_scores_v1';

  let isSyncing = false;
  let syncDebounceTimer = null;

  function getLocalCandidateSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
  }

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
      try {
        const raw = localStorage.getItem(CHECKLIST_KEY);
        if (raw) checklists = JSON.parse(raw);
      } catch(e) {}

      let locker = {};
      try {
        const raw = localStorage.getItem(LOCKER_KEY);
        if (raw) locker = JSON.parse(raw);
      } catch(e) {}

      let notes = '';
      try {
        notes = localStorage.getItem(NOTES_KEY) || '';
      } catch(e) {}

      let mockScores = [];
      try {
        const raw = localStorage.getItem(SCORES_KEY);
        if (raw) mockScores = JSON.parse(raw);
      } catch(e) {}

      const payload = {
        candidateId: session.id,
        checklists: checklists,
        locker: locker,
        notes: notes,
        mockScores: mockScores
      };

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          window.dispatchEvent(new CustomEvent('cso:cloud-synced', { detail: data }));
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

  function queueDebouncedSync(delayMs = 1500) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      pushLocalStateToCloud();
    }, delayMs);
  }

  async function pullCloudStateToLocal(candidateId) {
    if (!candidateId || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    try {
      const response = await fetch(`/api/sync?candidateId=${encodeURIComponent(candidateId)}`);
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
          window.dispatchEvent(new CustomEvent('cso:cloud-hydrated', { detail: data }));
        }
      }
    } catch (err) {
      console.warn('CSOSync: Cloud state pull skipped', err.message);
    }
  }

  // Reactive Event Listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      pushLocalStateToCloud();
    });

    window.addEventListener('storage', (e) => {
      if ([CHECKLIST_KEY, LOCKER_KEY, NOTES_KEY, SCORES_KEY].includes(e.key)) {
        queueDebouncedSync();
      }
    });
  }

  window.CSOSync = {
    pushLocalStateToCloud: pushLocalStateToCloud,
    pullCloudStateToLocal: pullCloudStateToLocal,
    queueDebouncedSync: queueDebouncedSync
  };

})(typeof window !== 'undefined' ? window : this);
