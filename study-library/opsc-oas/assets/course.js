/* Clean-slate v232: purged hardcoded OPSC OAS modules; course content loads strictly from live Cloudflare D1 via Admin Studio. */
(function (root) {
  'use strict';

  var PROGRESS_KEY = 'cso_opsc_course_progress';
  var EXAM_PREFIX = 'OPSC OAS';
  var OPSC_MODULES = [];

  var api = {
    PROGRESS_KEY: PROGRESS_KEY,
    EXAM_PREFIX: EXAM_PREFIX,
    MODULES: OPSC_MODULES
  };

  root.CSOOpscCourse = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (root.CSOCourseHub && typeof root.CSOCourseHub.mount === 'function') {
    root.CSOCourseHub.mount({ progressKey: PROGRESS_KEY, examPrefix: EXAM_PREFIX, modules: OPSC_MODULES });
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
