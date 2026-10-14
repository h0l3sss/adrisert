(function () {
  'use strict';
  var d = document;
  var ano = d.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  // botão flutuante do WhatsApp aparece depois do início da página
  var wf = d.querySelector('.wa-float'), heroEl = d.getElementById('hero');
  function onScroll() {
    if (wf && heroEl) wf.classList.toggle('show', heroEl.getBoundingClientRect().bottom < 80);
  }
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  // menu no celular
  var burger = d.getElementById('burger'), nav = d.getElementById('nav');
  if (burger && nav) {
    var closeNav = function () { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menu'); d.body.style.overflow = ''; };
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      d.body.style.overflow = open ? 'hidden' : '';
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
    addEventListener('resize', function () { if (innerWidth > 992) closeNav(); });
  }

  // comparador antes/depois: ao entrar na tela, a foto "limpa" varre a "suja" e para no meio; também dá para arrastar
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  var boxes = [].slice.call(d.querySelectorAll('.cmp')).filter(function (b) { return b.querySelector('input'); });
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  boxes.forEach(function (box, n) {
    var input = box.querySelector('input'), busy = false;
    function set(v) { input.value = v; box.style.setProperty('--p', v + '%'); }
    input.addEventListener('input', function () { busy = false; set(input.value); });
    var canAnimate = 'IntersectionObserver' in window && !reduce;
    set(canAnimate ? 100 : 50);
    if (!canAnimate) return;
    function tween(from, to, ms, done) {
      var t0 = null;
      requestAnimationFrame(function step(t) {
        if (!busy) return;
        if (t0 === null) t0 = t;
        var k = Math.min((t - t0) / ms, 1);
        set(Math.round((from + (to - from) * ease(k)) * 10) / 10);
        if (k < 1) requestAnimationFrame(step); else if (done) done();
      });
    }
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      setTimeout(function () {
        busy = true;
        tween(100, 0, 1700, function () {
          setTimeout(function () { tween(0, 50, 900, function () { busy = false; box.classList.add('is-ready'); }); }, 350);
        });
      }, 200 + n * 450);
    }, { threshold: .5 });
    io.observe(box);
  });

  // UTMs / gclid / fbclid (30 dias)
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'], origem = {};
  try {
    var saved = JSON.parse(localStorage.getItem('adrisert_origem') || '{}');
    if (saved.t && Date.now() - saved.t < 30 * 864e5) origem = saved.d || {};
    var p = new URLSearchParams(location.search), found = false;
    KEYS.forEach(function (k) { if (p.get(k)) { origem[k] = p.get(k); found = true; } });
    if (found) localStorage.setItem('adrisert_origem', JSON.stringify({ t: Date.now(), d: origem }));
  } catch (e) {}

  // eventos de conversão
  function track(name) {
    if (typeof gtag === 'function') gtag('event', name, { event_category: 'contato' });
    if (typeof fbq === 'function') fbq('track', 'Contact', { source: name });
    if (window.dataLayer) window.dataLayer.push({ event: name });
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest('[data-track]'); if (a) track(a.getAttribute('data-track'));
  });
})();
