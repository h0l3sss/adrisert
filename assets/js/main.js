(function () {
  'use strict';
  var d = document, root = d.documentElement;
  d.getElementById('ano').textContent = new Date().getFullYear();
  var reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

  // header: sombra ao rolar
  var header = d.getElementById('topo'), topRow = d.querySelector('.header__top');
  var wf = d.querySelector('.wa-float'), heroEl = d.getElementById('hero');
  function onScroll() {
    header.classList.toggle('is-stuck', window.scrollY > 10);
    header.classList.toggle('is-mini', window.scrollY >= topRow.offsetHeight); // faixa de cima já saiu: o logo aparece no mini cabeçalho
    if (wf && heroEl) wf.classList.toggle('show', heroEl.getBoundingClientRect().bottom < 80);
  }
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  // menu mobile
  var burger = d.getElementById('burger'), nav = d.getElementById('nav');
  function closeNav() { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); d.body.style.overflow = ''; }
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    d.body.style.overflow = open ? 'hidden' : '';
  });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  addEventListener('resize', function () { if (innerWidth > 960) closeNav(); });

  // animações ao rolar
  var items = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (i) { io.observe(i); });
  } else { items.forEach(function (i) { i.classList.add('in'); }); }

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

  // hero carrossel
  var hero = d.getElementById('hero');
  if (hero && hero.querySelectorAll('.hs').length > 1) {
    var slides = hero.querySelectorAll('.hs'), tabs = hero.querySelectorAll('.hero__tabs button'), cur = 0, timer, DUR = 7000;
    hero.style.setProperty('--dur', DUR + 'ms');
    function go(n) {
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('is-on', i === cur); });
      tabs.forEach(function (t, i) {
        t.classList.remove('is-on'); t.setAttribute('aria-selected', i === cur);
        if (i === cur) { void t.offsetWidth; t.classList.add('is-on'); } // reinicia a barra
      });
      var img = slides[cur].querySelector('img'); if (img && img.loading === 'lazy') img.loading = 'eager';
      var nx = slides[(cur + 1) % slides.length].querySelector('img'); if (nx) nx.loading = 'eager';
    }
    function play() { clearInterval(timer); if (!reduce) timer = setInterval(function () { go(cur + 1); }, DUR); }
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { go(i); play(); }); });
    hero.querySelectorAll('[data-dir]').forEach(function (b) {
      b.addEventListener('click', function () { go(cur + parseInt(b.dataset.dir, 10)); play(); });
    });
    hero.addEventListener('mouseenter', function () { clearInterval(timer); hero.classList.add('is-paused'); });
    hero.addEventListener('mouseleave', function () { hero.classList.remove('is-paused'); play(); });
    // swipe no celular/tablet
    var x0 = null;
    hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) { go(cur + (dx < 0 ? 1 : -1)); play(); }
    }, { passive: true });
    d.addEventListener('visibilitychange', function () { d.hidden ? clearInterval(timer) : play(); });
    go(0); play();
  }


  // soluções: faixas que abrem uma de cada vez; varredura automática da esquerda para a direita
  var pan = d.getElementById('panels');
  if (pan) {
    var items = [].slice.call(pan.querySelectorAll('.panel')), idx = 0, sweep, running = false;
    var mobile = matchMedia('(max-width:760px)');
    function open(n) {
      idx = (n + items.length) % items.length;
      items.forEach(function (p, i) { p.classList.toggle('is-on', i === idx); });
    }
    function stop() { clearInterval(sweep); running = false; }
    function start() {
      stop();
      if (reduce || mobile.matches) return; // no celular só abre ao toque
      running = true;
      sweep = setInterval(function () { open(idx + 1); }, 4500);
    }
    items.forEach(function (p, i) {
      p.addEventListener('mouseenter', function () { if (!mobile.matches) { stop(); open(i); } });
      p.addEventListener('focus', function () { stop(); open(i); });
      p.addEventListener('click', function () { stop(); open(i); });
    });
    pan.addEventListener('mouseleave', function () { if (!mobile.matches) start(); });
    // celular: a rolagem decide qual solução está aberta (as faixas ficam fixas na tela)
    var track = pan.parentNode, ticking = false;
    function byScroll() {
      ticking = false;
      if (!mobile.matches) return;
      var htop = parseFloat(getComputedStyle(pan).top) || 0;
      var extra = track.offsetHeight - pan.offsetHeight;
      if (extra <= 0) return;
      var done = htop - track.getBoundingClientRect().top;       // quanto já rolou desde que as faixas fixaram
      var p = Math.min(Math.max(done / extra, 0), 0.9999);
      var n = Math.floor(p * items.length);
      if (n !== idx) open(n);
    }
    addEventListener('scroll', function () { if (mobile.matches) byScroll(); }, { passive: true });
    mobile.addEventListener('change', function () { stop(); if (mobile.matches) byScroll(); else { open(0); start(); } });
    d.addEventListener('visibilitychange', function () { d.hidden ? stop() : (pan.classList.contains('in') && start()); });
    if ('IntersectionObserver' in window && !reduce) {
      pan.classList.add('wipe-ready');
      var po = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) {
          pan.classList.add('in');
          setTimeout(function () { if (!mobile.matches) { open(0); start(); } else { byScroll(); } }, 1300); // começa depois da entrada
          po.disconnect();
        }
      }, { threshold: .25 });
      po.observe(pan);
    } else { start(); }
  }
})();
