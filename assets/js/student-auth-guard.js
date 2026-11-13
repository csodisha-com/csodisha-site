(function () {
  'use strict';

  try {
    var savedTheme = localStorage.getItem('cso_student_theme');
    var theme = (savedTheme === 'obsidian-mint' || savedTheme === 'alabaster-cobalt')
      ? savedTheme
      : 'alabaster-cobalt';
    document.documentElement.dataset.csoStudentTheme = theme;
  } catch (e) {
    document.documentElement.dataset.csoStudentTheme = 'alabaster-cobalt';
  }

  try {
    var raw = localStorage.getItem('cso_candidate_session_v1') || localStorage.getItem('cso_candidate_profile');
    if (!raw) {
      window.location.replace('/login.html?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    var session = JSON.parse(raw);
    if (!session || (!session.isAuthenticated && !session.email && !session.id)) {
      localStorage.removeItem('cso_candidate_session_v1');
      localStorage.removeItem('cso_candidate_profile');
      localStorage.removeItem('cso_auth_token');
      window.location.replace('/login.html?redirect=' + encodeURIComponent(window.location.pathname));
    }
  } catch (e) {
    window.location.replace('/login.html?redirect=' + encodeURIComponent(window.location.pathname));
  }
})();
