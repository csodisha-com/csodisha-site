/* Extracted from community/join/index.html for strict CSP (v151). */
(function () {
  function syncTheme() {
    var settings = {};
    try {
      settings = JSON.parse(localStorage.getItem('cso') || '{}') || {};
    } catch (error) {
      settings = {};
    }

    var themes = ['light', 'dark', 'system', 'reading', 'sepia'];
    var theme = themes.includes(settings.theme)
      ? settings.theme
      : 'system';

    document.documentElement.setAttribute('data-theme', theme);
  }

  syncTheme();

  window.addEventListener('storage', function (event) {
    if (event.key === 'cso') syncTheme();
  });

  window.addEventListener('pageshow', syncTheme);
})();
