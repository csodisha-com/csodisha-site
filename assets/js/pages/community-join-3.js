/* Extracted from community/join/index.html for strict CSP (v151). */
window.addEventListener('load', function () {
  var nav = document.getElementById('navw');
  if (!nav) return;

  var siteRoot = new URL('../../', location.href);

  function repair() {
    nav.querySelectorAll('a[href]').forEach(function (a) {
      if (a.dataset.csoJoinFixed === '1') return;

      var href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (/^(https?:|mailto:|tel:|\/)/i.test(href)) return;

      var cleaned = href.replace(/^\.\.\//, '')
                        .replace(/^\.\//, '');

      var destination = new URL(cleaned, siteRoot);
      a.href = destination.href;
      a.dataset.csoJoinFixed = '1';
    });
  }

  repair();

  new MutationObserver(repair).observe(nav, {
    childList: true,
    subtree: true
  });
});
