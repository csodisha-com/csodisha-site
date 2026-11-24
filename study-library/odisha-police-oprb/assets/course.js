/* Clean-slate v232: purged hardcoded OPRB modules; course content loads strictly from live Cloudflare D1 via Admin Studio. */
(function (root) {
  'use strict';

  var PROGRESS_KEY = 'cso_oprb_course_progress';
  var EXAM_PREFIX = 'Odisha Police (OPRB)';
  var OPRB_MODULES = [];

  var api = {
    PROGRESS_KEY: PROGRESS_KEY,
    EXAM_PREFIX: EXAM_PREFIX,
    MODULES: OPRB_MODULES
  };

  root.CSOOprbCourse = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (root.CSOCourseHub && typeof root.CSOCourseHub.mount === 'function') {
    root.CSOCourseHub.mount({ progressKey: PROGRESS_KEY, examPrefix: EXAM_PREFIX, modules: OPRB_MODULES });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
