/* ================================================================
   FX · CORE — mesin orkestrasi
   - Mengambil alih navigasi: setiap perpindahan slide memainkan
     transisi dari registry; lompatan scroll terjadi di label 'mid'
     (layar tertutup penuh) sehingga tidak pernah terlihat "scroll".
   - Lifecycle per slide: init() saat masuk, destroy() saat keluar.
     Semua timeline GSAP, listener, physics, dan scene WebGL dimatikan
     bersih — tidak ada animasi yang bocor antar slide.
   - Hook cetak: paksa state akhir, sembunyikan lapisan FX.
   ================================================================ */
window.FX = (function () {
  'use strict';

  let started = false;
  let busy = false;
  let current = -1;
  let ctx = null;
  let heroStopTimer = 0;

  const api = { printing: false };

  /* ---------- bus event sederhana per slide ---------- */
  function emitter() {
    const m = {};
    return {
      on: function (e, f) { (m[e] = m[e] || []).push(f); },
      off: function (e, f) { if (m[e]) m[e] = m[e].filter(function (x) { return x !== f; }); },
      emit: function (e, d) { (m[e] || []).slice().forEach(function (f) { f(d); }); }
    };
  }

  /* ================================================================
     INIT SLIDE
     ================================================================ */
  function initSlide(idx) {
    const DN = window.DeckNav;
    const slide = DN.slides[idx];
    const cfg = window.FXConfig.SLIDES[idx] || {};
    if (!slide) return;
    current = idx;

    ctx = {
      slide: slide, index: idx, cfg: cfg,
      tl: gsap.timeline(),
      bus: emitter(),
      interacts: [],
      physics: null
    };

    /* 1. SVG scene — morph siluet + layer */
    try { window.FXSvg.apply(cfg.svg || {}, { immediate: idx === 0 && DN.firstPaint }); }
    catch (e) { console.error('[fx] svg', e); }

    /* 2. WebGL scene */
    if (cfg.webgl) window.FXGL.play(cfg.webgl);

    /* 3. Entrance */
    try {
      if (cfg.enter && cfg.enter.custom && window.FXConfig.CUSTOMS[cfg.enter.custom]) {
        window.FXConfig.CUSTOMS[cfg.enter.custom](ctx);
      } else {
        window.FXEntrances.standard(ctx,
          cfg.enter && cfg.enter.heading,
          cfg.enter && cfg.enter.cards);
      }
    } catch (e) {
      console.error('[fx] entrance', e);
      forceVisible(slide);
    }

    /* 4. Interaktivitas */
    (cfg.interact || []).forEach(function (spec) {
      const parts = spec.split(':');
      const fn = window.FXInteract[parts[0]];
      if (fn) {
        try { ctx.interacts.push(fn(slide, parts[1])); }
        catch (e) { console.error('[fx] interact', e); }
      }
    });
  }

  function forceVisible(slide) {
    /* jaring pengaman entrance gagal: tampilkan semua isi apa adanya */
    gsap.set(slide.querySelectorAll('.rv,.mask>span,.card,.fx-ch,[data-count],.cpi-txt,.cpi-dot,.cpi-target,.cpi-line,.chain-path,.chain-node circle,.chain-node text,.stamp,.cb-row b,.reveal-line,.kpi-track i,.kpi-track .gap,.kpi-track em,.bar-track i,.avgline span,.avgline b,.eyebrow .dash'),
      { clearProps: 'all' });
    slide.querySelectorAll('[data-count]').forEach(function (el) {
      const dec = parseInt(el.dataset.dec || '0', 10);
      el.textContent = parseFloat(el.dataset.count).toLocaleString('id-ID', {
        minimumFractionDigits: dec, maximumFractionDigits: dec
      }) + (el.dataset.suffix || '');
    });
  }

  /* ================================================================
     DESTROY SLIDE
     ================================================================ */
  function destroyCurrent() {
    if (!ctx) return;
    const slide = ctx.slide;
    const prevCfg = ctx.cfg;

    /* matikan semua tween di subtree slide */
    ctx.tl.kill();
    const all = slide.querySelectorAll('*');
    gsap.killTweensOf(all);
    gsap.killTweensOf(slide);

    /* interactions */
    ctx.interacts.forEach(function (m) { if (m && m.destroy) { try { m.destroy(); } catch (e) {} } });
    ctx.interacts.length = 0;

    /* physics */
    if (ctx.physics) { try { ctx.physics.destroy(); } catch (e) {} ctx.physics = null; }

    /* SplitText & tanda kepemilikan */
    window.FXEntrances.revert(slide);

    /* bersihkan properti inline hasil animasi (custom props --i/--v TIDAK disentuh) */
    gsap.set(all, {
      clearProps: 'transform,opacity,filter,width,boxShadow,clipPath,scale,rotate,skewX,x,y,strokeDasharray,strokeDashoffset'
    });
    gsap.set(slide, { clearProps: 'transform,filter' });

    /* WebGL keluar: hero dibiarkan meledak dulu, lainnya langsung mati
       (scene berikutnya dinyalakan oleh initSlide lewat cfg.webgl) */
    if (prevCfg.webgl === 'hero' && window.FXGL.active && window.FXGL.active.name === 'hero') {
      window.FXGL.active.explode();
      clearTimeout(heroStopTimer);
      heroStopTimer = setTimeout(function () {
        if (window.FXGL.active && window.FXGL.active.name === 'hero') window.FXGL.stop();
      }, 750);
    } else if (window.FXGL.active && window.FXGL.active.name !== 'hero') {
      window.FXGL.stop();
    }

    ctx = null;
  }

  /* ================================================================
     NAVIGASI BERTRANSISI
     ================================================================ */
  api.nav = function (i) {
    const DN = window.DeckNav;
    i = Math.max(0, Math.min(DN.total - 1, i));
    const cur = DN.currentIndex();
    if (busy || i === cur) return;

    const tName = window.FXConfig.TRANSITIONS[Math.max(0, Math.min(20, cur))];
    const fn = window.FXTransitions[tName] || window.FXTransitions['ink-wipe'];
    const ov = document.getElementById('fx-overlay');
    const hint = document.getElementById('hint');
    if (hint) hint.classList.remove('on');

    busy = true;
    ov.innerHTML = '';
    ov.style.pointerEvents = 'auto';

    let tl;
    try {
      tl = fn(ov, { from: cur, to: i });
    } catch (e) {
      console.error('[fx] transisi gagal, lompat langsung', e);
      ov.innerHTML = '';
      ov.style.pointerEvents = 'none';
      busy = false;
      DN.show(i);
      return;
    }

    tl.call(function () { DN.show(i); }, [], 'mid');
    tl.eventCallback('onComplete', function () {
      busy = false;
      ov.style.pointerEvents = 'none';
      ov.innerHTML = '';
    });

    /* jaring pengaman: transisi macet -> pastikan slide tetap berganti */
    const dur = tl.duration();
    setTimeout(function () {
      if (busy) {
        busy = false;
        ov.style.pointerEvents = 'none';
        ov.innerHTML = '';
        DN.show(i);
      }
    }, (dur + 1.2) * 1000);
  };

  api.goTo = api.nav;

  /* ================================================================
     WHEEL TAKEOVER (deck dikunci; navigasi lewat transisi)
     ================================================================ */
  function wheelTakeover() {
    let acc = 0, accT = 0;
    document.addEventListener('wheel', function (e) {
      if (api.printing) return;
      if (document.body.classList.contains('editing')) return;
      if (e.target.closest && e.target.closest('.notes, iframe, #notesText')) return;
      e.preventDefault();
      if (busy) return;
      clearTimeout(accT);
      accT = setTimeout(function () { acc = 0; }, 220);
      acc += e.deltaY;
      if (Math.abs(acc) > 42) {
        const dir = acc > 0 ? 1 : -1;
        acc = 0;
        api.nav(window.DeckNav.currentIndex() + dir);
      }
    }, { passive: false });
  }

  /* ================================================================
     PARALLAX MOUSE — rosette (kedalaman berbeda dari svg stage)
     ================================================================ */
  function rosetteParallax() {
    const ros = document.querySelector('.rosettes');
    if (!ros) return;
    const qx = gsap.quickTo(ros, 'x', { duration: 1.5, ease: 'power3' });
    const qy = gsap.quickTo(ros, 'y', { duration: 1.5, ease: 'power3' });
    window.addEventListener('mousemove', function (e) {
      qx((e.clientX / window.innerWidth - 0.5) * -44);
      qy((e.clientY / window.innerHeight - 0.5) * -26);
    }, { passive: true });
  }

  /* ================================================================
     SOUND TOGGLE
     ================================================================ */
  function buildSoundToggle() {
    const b = document.createElement('button');
    b.id = 'soundToggle';
    b.type = 'button';
    function paint() {
      const on = window.FXSound.isEnabled();
      b.innerHTML = '<span>SFX</span><i style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-left:5px;background:' +
        (on ? 'var(--vermilion)' : 'rgba(21,19,15,.25)') + '"></i>';
      b.title = on ? 'Suara efek: NYALA' : 'Suara efek: MATI';
      b.setAttribute('aria-label', b.title);
    }
    b.addEventListener('click', function () {
      window.FXSound.setEnabled(!window.FXSound.isEnabled());
      paint();
      if (window.FXSound.isEnabled()) window.FXSound.pop(660);
    });
    document.body.appendChild(b);
    paint();
  }

  /* ================================================================
     CETAK
     ================================================================ */
  api.preparePrint = function () {
    api.printing = true;
    busy = false;
    const ov = document.getElementById('fx-overlay');
    ov.innerHTML = '';
    ov.style.pointerEvents = 'none';
    if (ctx) { ctx.tl.pause(); }
    document.documentElement.classList.add('fx-print');
  };

  api.restorePrint = function () {
    document.documentElement.classList.remove('fx-print');
    api.printing = false;
    const idx = current;
    destroyCurrent();
    window.FXGL.stop();
    initSlide(idx);
  };

  /* ================================================================
     START
     ================================================================ */
  function boot() {
    if (started) return;
    if (!window.gsap || !window.DeckNav || !window.FXConfig) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.info('[fx] reduced-motion: sistem FX nonaktif, perilaku klasik dipertahankan');
      return;
    }

    gsap.registerPlugin(
      window.MorphSVGPlugin, window.SplitText, window.DrawSVGPlugin,
      window.MotionPathPlugin, window.CustomEase
    );

    document.documentElement.classList.add('fx-on');
    window.DeckNav.deck.classList.add('fx-locked');
    started = true;

    window.FXSvg.build();
    window.FXSvg.initParallax();
    window.FXCursor.init();
    buildSoundToggle();
    rosetteParallax();
    wheelTakeover();

    document.addEventListener('deck:activate', function (e) {
      const idx = e.detail.index;
      if (idx === current) return;
      destroyCurrent();
      initSlide(idx);
    });

    /* slide pertama */
    const first = Math.max(0, window.DeckNav.currentIndex());
    window.DeckNav.firstPaint = true;
    initSlide(first);
    window.DeckNav.firstPaint = false;

    console.log('[fx] sistem visual aktif · ' + window.FXConfig.SLIDES.length + ' slide · ' +
      window.FXConfig.TRANSITIONS.length + ' transisi');
  }

  api.boot = boot;
  api.initSlide = initSlide;
  api.destroyCurrent = destroyCurrent;
  Object.defineProperty(api, 'current', { get: function () { return current; } });
  Object.defineProperty(api, 'isBusy', { get: function () { return busy; } });

  /* Pasang bendera fx-on SEGERA saat script ini dievaluasi (sebelum event
     load), supaya animasi CSS primitif lama tidak sempat berkedip satu
     frame sebelum GSAP mengambil alih. Boot penuh tetap saat load. */
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.gsap) {
    document.documentElement.classList.add('fx-on');
    if (window.DeckNav) window.DeckNav.deck.classList.add('fx-locked');
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);

  return api;
})();
