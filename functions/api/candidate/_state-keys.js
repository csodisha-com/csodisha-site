/**
 * Candidate State Key Encoding — shared between the checklist and sync APIs.
 *
 * The dashboard represents checklist progress as a nested tree:
 *   { examKey: { stageId: { topicId: <bool> } } }   (canonical, staged)
 *   { examKey: { topicId: <bool> } }                (legacy, flat)
 *
 * These are stored losslessly in `candidate_checklist` as:
 *   exam_code     = examKey.toUpperCase()               e.g. 'OPSC'
 *   milestone_key = '<stageId>::<topicId>' when staged  e.g. 'opsc-prelims::opsc-p-gs1-hist'
 *                   topicId when flat/legacy
 * Neither exam keys, stage ids nor topic ids contain '::', so the split is
 * unambiguous and round-trip stable.
 */

export const MILESTONE_SEPARATOR = '::';

export function examCodeFrom(examKey) {
  return String(examKey || '').trim().toUpperCase();
}

export function examKeyFrom(examCode) {
  return String(examCode || '').trim().toLowerCase();
}

export function milestoneKeyFrom(stageId, topicId) {
  const topic = String(topicId || '').trim();
  const stage = String(stageId || '').trim();
  return stage ? `${stage}${MILESTONE_SEPARATOR}${topic}` : topic;
}

export function splitMilestoneKey(milestoneKey) {
  const key = String(milestoneKey || '');
  const idx = key.indexOf(MILESTONE_SEPARATOR);
  if (idx === -1) return { stageId: '', topicId: key };
  return { stageId: key.slice(0, idx), topicId: key.slice(idx + MILESTONE_SEPARATOR.length) };
}

// Deterministic primary key so repeated upserts of the same natural key reuse
// the same row id (the (candidate_id, exam_code, milestone_key) unique index
// is the actual conflict target).
function hashKey(value) {
  const str = String(value);
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export function checklistRowId(candidateId, examCode, milestoneKey) {
  return 'chk_' + candidateId + '_' + examCode + '_' + hashKey(milestoneKey);
}

// Build the (nested-or-flat) tree the dashboard expects from DB rows.
export function buildChecklistTree(rows) {
  const tree = {};
  (rows || []).forEach(row => {
    const examKey = examKeyFrom(row.exam_code);
    const { stageId, topicId } = splitMilestoneKey(row.milestone_key);
    if (!examKey || !topicId) return;
    if (!tree[examKey]) tree[examKey] = {};
    if (stageId) {
      if (!tree[examKey][stageId] || typeof tree[examKey][stageId] !== 'object') {
        tree[examKey][stageId] = {};
      }
      tree[examKey][stageId][topicId] = !!row.is_completed;
    } else {
      tree[examKey][topicId] = !!row.is_completed;
    }
  });
  return tree;
}

// Flatten any accepted payload shape into {examCode, milestoneKey, completed}
// update tuples. Supported shapes:
//   1. { checklists: { exam: { stage: { topic: bool } } } }  (canonical)
//   2. { checklists: { exam: { topic: bool } } }             (legacy flat)
//   3. { updates: [{ examStream, stageId?, topicId, completed }] }
//   4. { examStream, stageId?, topicId, completed }          (single toggle)
export function flattenChecklistPayload(payload) {
  const tuples = [];

  if (payload && typeof payload.checklists === 'object' && payload.checklists !== null) {
    for (const [examKey, stages] of Object.entries(payload.checklists)) {
      if (!stages || typeof stages !== 'object') continue;
      for (const [stageOrTopic, val] of Object.entries(stages)) {
        if (val !== null && typeof val === 'object') {
          // Staged: { stageId: { topicId: bool } }
          for (const [topicId, done] of Object.entries(val)) {
            tuples.push({
              examCode: examCodeFrom(examKey),
              milestoneKey: milestoneKeyFrom(stageOrTopic, topicId),
              completed: !!done
            });
          }
        } else {
          // Flat/legacy: { topicId: bool }
          tuples.push({
            examCode: examCodeFrom(examKey),
            milestoneKey: milestoneKeyFrom('', stageOrTopic),
            completed: !!val
          });
        }
      }
    }
  } else if (Array.isArray(payload && payload.updates)) {
    payload.updates.forEach(u => {
      const examCode = examCodeFrom(u.examCode || u.examStream || u.stream || '');
      const topicId = String(u.topicId || u.milestoneKey || u.milestone || '').trim();
      if (!examCode || !topicId) return;
      tuples.push({
        examCode,
        milestoneKey: milestoneKeyFrom(u.stageId || u.stage || '', topicId),
        completed: !!(u.completed !== undefined ? u.completed : u.isCompleted)
      });
    });
  } else if (payload) {
    const examCode = examCodeFrom(payload.examCode || payload.examStream || payload.stream || '');
    const topicId = String(payload.topicId || payload.milestoneKey || payload.milestone || '').trim();
    if (examCode && topicId) {
      tuples.push({
        examCode,
        milestoneKey: milestoneKeyFrom(payload.stageId || payload.stage || '', topicId),
        completed: !!(payload.completed !== undefined ? payload.completed : payload.isCompleted)
      });
    }
  }

  return tuples;
}

// Prepared upsert statement bound to a candidate's tuple.
export function upsertStatement(env, candidateId, tuple, nowIso) {
  return env.DB.prepare(`
    INSERT INTO candidate_checklist (id, candidate_id, exam_code, milestone_key, is_completed, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(candidate_id, exam_code, milestone_key) DO UPDATE SET
      is_completed = excluded.is_completed,
      updated_at = excluded.updated_at
  `).bind(
    checklistRowId(candidateId, tuple.examCode, tuple.milestoneKey),
    candidateId,
    tuple.examCode,
    tuple.milestoneKey,
    tuple.completed ? 1 : 0,
    nowIso
  );
}

export async function fetchChecklistTree(env, candidateId) {
  const { results } = await env.DB.prepare(`
    SELECT exam_code, milestone_key, is_completed
    FROM candidate_checklist
    WHERE candidate_id = ?
  `).bind(candidateId).all();
  return buildChecklistTree(results || []);
}
