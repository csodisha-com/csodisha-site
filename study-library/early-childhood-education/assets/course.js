/* Clean-slate v232: purged hardcoded ECE modules; course content loads strictly from live Cloudflare D1 via Admin Studio. */
(function (root) {
  'use strict';

  var PROGRESS_KEY = 'cso_ece_course_progress';
  var MISTAKE_DECK_KEY = 'cso_study_mistake_deck';
  var ECE_MODULES = [];

  function noopProgress() { return { completedModules: [] }; }
  function renderCourse() {
    if (root.CSOCourseHub && typeof root.CSOCourseHub.renderCourseHub === 'function') {
      root.CSOCourseHub.renderCourseHub({
        progressKey: PROGRESS_KEY,
        examPrefix: 'Early Childhood Education',
        modules: ECE_MODULES
      });
      return;
    }
    if (typeof document === 'undefined') return;
    var container = document.getElementById('ece-modules-container');
    if (!container) return;
    while (container.firstChild) container.removeChild(container.firstChild);
    var box = document.createElement('div');
    box.className = 'ece-module-card';
    var h = document.createElement('h2');
    h.textContent = 'No items published yet';
    var p = document.createElement('p');
    p.textContent = 'No items published yet — add categories or content in Admin Studio.';
    box.append(h, p);
    container.appendChild(box);
  }

  var api = {
    PROGRESS_KEY: PROGRESS_KEY,
    MISTAKE_DECK_KEY: MISTAKE_DECK_KEY,
    ECE_MODULES: ECE_MODULES,
    loadProgress: noopProgress,
    saveProgress: function (completed) { return { completedModules: Array.isArray(completed) ? completed : [] }; },
    toggleModuleCompletion: noopProgress,
    pushToMistakeDeck: function () { return []; },
    evaluateQuizAnswer: function () { return null; },
    renderCourse: renderCourse
  };

  root.CSOEceCourse = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderCourse);
    else renderCourse();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
