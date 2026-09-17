/* ================================================================
   FX · INTERACTIONS
   Modul interaktivitas per slide. Tiap modul = fn(slide, opts)
   dan WAJIB mengembalikan { destroy() } — core memutusnya saat
   slide keluar supaya tidak ada listener bocor.
   ================================================================ */
window.FXInteract = (function () {
  'use strict';

  const mods = {};

  function norm(e, el) {
    const r = el.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width - 0.5,
      y: (e.clientY - r.top) / r.height - 0.5,
      rect: r
    };
  }

  /* ---------- TILT 3D ---------- */
  mods.tilt = function (slide, sel) {
    const els = Array.from(slide.querySelectorAll(sel || '.card, .doc, .video, .qr'));
    if (!els.length) return { destroy: function () {} };
    const cleanups = [];
    els.forEach(function (el) {
      if (el.parentElement) el.parentElement.style.perspective = '900px';
      el.style.transformStyle = 'preserve-3d';
      function move(e) {
        const p = norm(e, el);
        gsap.to(el, {
          rotateY: p.x * 10, rotateX: -p.y * 8,
          scale: 1.014, z: 12,
          duration: 0.45, ease: 'power3.out', overwrite: 'auto'
        });
      }
      function leave() {
        gsap.to(el, { rotateY: 0, rotateX: 0, scale: 1, z: 0, duration: 0.75, ease: 'elastic.out(1,0.6)', overwrite: 'auto' });
      }
      el.addEventListener('mousemove', move);
      el.addEventListener('mouseleave', leave);
      cleanups.push(function () {
        el.removeEventListener('mousemove', move);
        el.removeEventListener('mouseleave', leave);
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: 'transform,perspective' });
      });
    });
    return { destroy: function () { cleanups.forEach(function (f) { f(); }); } };
  };

  /* ---------- MAGNETIC PULL ---------- */
  mods.magnetic = function (slide, sel, strength) {
    const els = Array.from(slide.querySelectorAll(sel || '.card'));
    strength = strength || 12;
    const cleanups = [];
    els.forEach(function (el) {
      function move(e) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const d = Math.hypot(dx, dy);
        const reach = Math.max(r.width, r.height) * 0.9 + 60;
        if (d < reach) {
          const f = (1 - d / reach);
          gsap.to(el, { x: dx * f * 0.16, y: dy * f * 0.16, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        }
      }
      function leave() {
        gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,0.45)', overwrite: 'auto' });
      }
      window.addEventListener('mousemove', move, { passive: true });
      el.addEventListener('mouseleave', leave);
      cleanups.push(function () {
        window.removeEventListener('mousemove', move);
        el.removeEventListener('mouseleave', leave);
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: 'transform' });
      });
    });
    return { destroy: function () { cleanups.forEach(function (f) { f(); }); } };
  };

  /* ---------- CARD FOCUS: satu disorot, yang lain meredup ---------- */
  mods.cardFocus = function (slide) {
    const cards = Array.from(slide.querySelectorAll('.card'));
    if (!cards.length) return { destroy: function () {} };
    const cleanups = [];
    cards.forEach(function (c) {
      function enter() {
        cards.forEach(function (o) {
          if (o !== c) gsap.to(o, { opacity: 0.38, duration: 0.35, overwrite: 'auto' });
        });
        gsap.to(c, { y: -7, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
        c.dataset.prevBorder = c.style.borderTopColor || '';
        c.style.borderTopColor = 'var(--vermilion)';
        window.FXSound.tick(30);
      }
      function leave() {
        cards.forEach(function (o) { gsap.to(o, { opacity: 1, duration: 0.4, overwrite: 'auto' }); });
        gsap.to(c, { y: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
        c.style.borderTopColor = c.dataset.prevBorder || '';
      }
      c.addEventListener('mouseenter', enter);
      c.addEventListener('mouseleave', leave);
      cleanups.push(function () {
        c.removeEventListener('mouseenter', enter);
        c.removeEventListener('mouseleave', leave);
        gsap.set(c, { clearProps: 'opacity,transform' });
        c.style.borderTopColor = c.dataset.prevBorder || '';
      });
    });
    return { destroy: function () { cleanups.forEach(function (f) { f(); }); } };
  };

  /* ---------- SLIDE 06: bar & grid terhubung ---------- */
  mods.barHover = function (slide) {
    const rows = Array.from(slide.querySelectorAll('.bar-row'));
    const cleanups = [];
    rows.forEach(function (row, i) {
      function enter() {
        rows.forEach(function (o) {
          if (o !== row) gsap.to(o, { opacity: 0.3, duration: 0.3, overwrite: 'auto' });
        });
        gsap.to(row.querySelector('.val'), { scale: 1.22, duration: 0.35, ease: 'back.out(3)', overwrite: 'auto' });
        const v = parseFloat(getComputedStyle(row).getPropertyValue('--v'));
        window.FXSvg.gridPulse(i, rows.length, v);
        window.FXSound.tick(40);
      }
      function leave() {
        rows.forEach(function (o) { gsap.to(o, { opacity: 1, duration: 0.4, overwrite: 'auto' }); });
        gsap.to(row.querySelector('.val'), { scale: 1, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      }
      row.addEventListener('mouseenter', enter);
      row.addEventListener('mouseleave', leave);
      cleanups.push(function () {
        row.removeEventListener('mouseenter', enter);
        row.removeEventListener('mouseleave', leave);
        gsap.set(row, { clearProps: 'opacity' });
      });
    });
    return { destroy: function () { cleanups.forEach(function (f) { f(); }); } };
  };

  /* ---------- SLIDE 16: titik CPI ---------- */
  mods.dotHover = function (slide) {
    const dots = Array.from(slide.querySelectorAll('.cpi-dot'));
    const cleanups = [];
    dots.forEach(function (d) {
      d.style.cursor = 'none';
      function enter() {
        gsap.to(d, { scale: 1.65, duration: 0.4, ease: 'back.out(3)', overwrite: 'auto', transformBox: 'fill-box', transformOrigin: 'center center' });
        window.FXSound.pop(880);
      }
      function leave() {
        gsap.to(d, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.5)', overwrite: 'auto' });
      }
      d.addEventListener('mouseenter', enter);
      d.addEventListener('mouseleave', leave);
      cleanups.push(function () {
        d.removeEventListener('mouseenter', enter);
        d.removeEventListener('mouseleave', leave);
      });
    });
    return { destroy: function () { cleanups.forEach(function (f) { f(); }); } };
  };

  /* ---------- SLIDE 21: baris KPI ---------- */
  mods.kpiHover = function (slide) {
    const rows = Array.from(slide.querySelectorAll('.kpi-row'));
    const cleanups = [];
    rows.forEach(function (row) {
      function enter() {
        rows.forEach(function (o) {
          if (o !== row) gsap.to(o, { opacity: 0.42, duration: 0.3, overwrite: 'auto' });
        });
        gsap.to(row.querySelector('.vals'), { scale: 1.1, duration: 0.35, ease: 'back.out(2.5)', overwrite: 'auto' });
        gsap.to(row.querySelector('.kpi-track'), { scale: 1.02, duration: 0.35, overwrite: 'auto' });
        window.FXSound.tick(40);
      }
      function leave() {
        rows.forEach(function (o) { gsap.to(o, { opacity: 1, duration: 0.4, overwrite: 'auto' }); });
        gsap.to(row.querySelector('.vals'), { scale: 1, duration: 0.5, overwrite: 'auto' });
        gsap.to(row.querySelector('.kpi-track'), { scale: 1, duration: 0.5, overwrite: 'auto' });
      }
      row.addEventListener('mouseenter', enter);
      row.addEventListener('mouseleave', leave);
      cleanups.push(function () {
        row.removeEventListener('mouseenter', enter);
        row.removeEventListener('mouseleave', leave);
      });
    });
    return { destroy: function () { cleanups.forEach(function (f) { f(); }); } };
  };

  /* ---------- SLIDE 17: koin menoleh ke mouse ---------- */
  mods.coinTilt = function (slide) {
    function move(e) {
      const rx = (e.clientY / window.innerHeight - 0.5) * 2;
      const ry = (e.clientX / window.innerWidth - 0.5) * 2;
      window.FXSvg.coinTilt(rx, ry);
    }
    window.addEventListener('mousemove', move, { passive: true });
    return {
      destroy: function () {
        window.removeEventListener('mousemove', move);
        window.FXSvg.coinTilt(0, 0);
      }
    };
  };

  /* ---------- SLIDE 15: glitch mikro saat hover ---------- */
  mods.glitchHover = function (slide) {
    const cards = Array.from(slide.querySelectorAll('.card'));
    const cleanups = [];
    cards.forEach(function (c) {
      function enter() {
        const tl = gsap.timeline();
        for (let i = 0; i < 4; i++) {
          tl.to(c, { x: (Math.random() - 0.5) * 9, skewX: (Math.random() - 0.5) * 3, duration: 0.045 }, i * 0.075);
        }
        tl.to(c, { x: 0, skewX: 0, duration: 0.18, ease: 'power2.out' }, 0.34);
        window.FXSound.tick(25);
        c.__gl = tl;
      }
      function leave() { if (c.__gl) c.__gl.kill(); gsap.set(c, { clearProps: 'transform' }); }
      c.addEventListener('mouseenter', enter);
      c.addEventListener('mouseleave', leave);
      cleanups.push(function () {
        c.removeEventListener('mouseenter', enter);
        c.removeEventListener('mouseleave', leave);
        leave();
      });
    });
    return { destroy: function () { cleanups.forEach(function (f) { f(); }); } };
  };

  /* ---------- hover reveal: baris target kartu program (20) ---------- */
  mods.revealLi = function (slide) {
    const cards = Array.from(slide.querySelectorAll('.card'));
    const cleanups = [];
    cards.forEach(function (c) {
      const li = c.querySelectorAll('li');
      if (!li.length) return;
      gsap.set(li, { autoAlpha: 0.55, x: -4 });
      function enter() {
        gsap.to(li, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.07, ease: 'power2.out', overwrite: 'auto' });
      }
      function leave() {
        gsap.to(li, { autoAlpha: 0.55, x: -4, duration: 0.35, overwrite: 'auto' });
      }
      c.addEventListener('mouseenter', enter);
      c.addEventListener('mouseleave', leave);
      cleanups.push(function () {
        c.removeEventListener('mouseenter', enter);
        c.removeEventListener('mouseleave', leave);
        gsap.set(li, { clearProps: 'all' });
      });
    });
    return { destroy: function () { cleanups.forEach(function (f) { f(); }); } };
  };

  return mods;
})();
