/* CSO safe DOM helper (CSP-compliant): parses markup with DOMParser and swaps nodes in; no innerHTML sink. */
(function () {
  'use strict';
  var WRAP = {
    TBODY: ['<table><tbody>', 'tbody'], THEAD: ['<table><thead>', 'thead'], TFOOT: ['<table><tfoot>', 'tfoot'],
    TR: ['<table><tbody><tr>', 'tr'], SELECT: ['<select>', 'select']
  };
  window.csoSetHtml = function (el, html) {
    if (!el) return;
    var w = WRAP[el.tagName];
    var src = '<!doctype html><html><body>' + (w ? w[0] : '') + String(html == null ? '' : html);
    var doc = new DOMParser().parseFromString(src, 'text/html');
    var host = w ? doc.body.querySelector(w[1]) : doc.body;
    el.replaceChildren.apply(el, host ? Array.prototype.slice.call(host.childNodes) : []);
  };
})();
