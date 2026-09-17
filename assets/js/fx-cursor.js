/* ================================================================
   FX · CURSOR EDITORIAL
   Crosshair setipis rambut melintang seisi viewport + cincin tinta
   yang morph jadi blob saat hover + trail titik yang memudar +
   label kontekstual ("PUTAR", "LIHAT", "GESER").
   Hanya di perangkat penunjuk presisi.
   ================================================================ */
window.FXCursor = (function () {
  'use strict';

  let built = false, hovering = false;
  let el = {};
  let mx = -100, my = -100;
  const trail = [];
  const TRAIL_N = 7;

  const CIRCLE = 'M22,6 C30.8,6 38,13.2 38,22 C38,30.8 30.8,38 22,38 C13.2,38 6,30.8 6,22 C6,13.2 13.2,6 22,6 Z';
  const BLOB   = 'M22,4 C31,5 39,11 38.5,21 C38,31 32,39.5 21,38 C10.5,36.6 3.5,31 5,20.5 C6.4,10 13,3 22,4 Z';
  const GRIP   = 'M22,2 C33,4 43,10 41,22 C39,34 32,43 20,41 C8,39 1,32 3,20 C5,8 11,0 22,2 Z';

  function build() {
    if (built) return;
    built = true;

    el.h = document.createElement('div');
    el.h.className = 'fxc-line fxc-h';
    el.v = document.createElement('div');
    el.v.className = 'fxc-line fxc-v';

    el.ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.ring.setAttribute('class', 'fxc-ring');
    el.ring.setAttribute('viewBox', '0 0 44 44');
    el.ring.setAttribute('width', '44');
    el.ring.setAttribute('height', '44');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', CIRCLE);
    p.setAttribute('class', 'fxc-ring-path');
    el.ring.appendChild(p);
    el.path = p;

    el.dot = document.createElement('div');
    el.dot.className = 'fxc-dot';

    el.label = document.createElement('div');
    el.label.className = 'fxc-label';
    document.body.appendChild(el.label);

    el.wrap = document.createElement('div');
    el.wrap.id = 'fxCursor';
    el.wrap.appendChild(el.h);
    el.wrap.appendChild(el.v);
    el.wrap.appendChild(el.ring);
    el.wrap.appendChild(el.dot);
    for (let i = 0; i < TRAIL_N; i++) {
      const d = document.createElement('i');
      d.className = 'fxc-trail';
      document.body.appendChild(d);
      trail.push({ el: d, x: mx, y: my, q: null });
    }
    document.body.appendChild(el.wrap);

    gsap.set(el.ring, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
    gsap.set(el.dot, { xPercent: -50, yPercent: -50, scale: 0 });
    gsap.set([el.h, el.v], { opacity: 0 });

    el.qx = gsap.quickTo(el.ring, 'x', { duration: 0.32, ease: 'power3' });
    el.qy = gsap.quickTo(el.ring, 'y', { duration: 0.32, ease: 'power3' });
    el.qdx = gsap.quickTo(el.dot, 'x', { duration: 0.06 });
    el.qdy = gsap.quickTo(el.dot, 'y', { duration: 0.06 });
    el.qhx = gsap.quickTo(el.h, 'y', { duration: 0.12 });
    el.qvy = gsap.quickTo(el.v, 'x', { duration: 0.12 });
    el.qlblx = gsap.quickTo(el.label, 'x', { duration: 0.36, ease: 'power3' });
    el.qllby = gsap.quickTo(el.label, 'y', { duration: 0.36, ease: 'power3' });
    gsap.set(el.label, { xPercent: 0, yPercent: -50 });
    trail.forEach(function (t, i) {
      t.qx = gsap.quickTo(t.el, 'x', { duration: 0.28 + i * 0.075, ease: 'power2' });
      t.qy = gsap.quickTo(t.el, 'y', { duration: 0.28 + i * 0.075, ease: 'power2' });
      gsap.set(t.el, { opacity: 0.30 - i * 0.038, scale: 1 - i * 0.11 });
    });

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!el.wrap.classList.contains('on')) {
        el.wrap.classList.add('on');
        gsap.to([el.h, el.v], { opacity: 1, duration: 0.4 });
        gsap.to(el.dot, { scale: 1, duration: 0.3 });
        gsap.to(el.ring, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' });
      }
      el.qdx(mx); el.qdy(my);
      el.qhx(my); el.qvy(mx);
      el.qx(mx); el.qy(my);
      el.qlblx(mx + 30); el.qllby(my);
      trail.forEach(function (t) { t.qx(mx); t.qy(my); });
      hitTest(e);
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      el.wrap.classList.remove('on');
      gsap.to([el.h, el.v, el.dot, el.ring], { opacity: 0, duration: 0.25 });
    });
    document.addEventListener('mouseenter', function () {
      if (mx > 0) {
        el.wrap.classList.add('on');
        gsap.to([el.h, el.v], { opacity: 1, duration: 0.3 });
        gsap.to(el.dot, { opacity: 1, duration: 0.3 });
        gsap.to(el.ring, { opacity: 1, duration: 0.3 });
      }
    });
    window.addEventListener('mousedown', function () { squeeze(0.82, GRIP); });
    window.addEventListener('mouseup', function () { squeeze(1, hovering ? BLOB : CIRCLE); });
  }

  function squeeze(s, d) {
    gsap.to(el.ring, { scale: s, duration: 0.28, ease: 'power3.out' });
    if (d) gsap.to(el.path, { attr: { d: d }, duration: 0.28, ease: 'power3.out' });
  }

  function hitTest(e) {
    const t = e.target;
    const interactive = t.closest && t.closest(
      'a,button,.video,.card,.doc,.bar-row,.cpi-dot,.chain-node,.kpi-row,.qr,.stamp,.dots button'
    );
    const want = !!interactive;
    if (want !== hovering) {
      hovering = want;
      gsap.to(el.ring, {
        scale: want ? 1.55 : 1,
        duration: 0.4,
        ease: want ? 'back.out(2.4)' : 'power3.out'
      });
      gsap.to(el.path, {
        attr: { d: want ? BLOB : CIRCLE },
        duration: 0.5,
        ease: 'power2.inOut',
        overwrite: 'auto'
      });
      el.ring.classList.toggle('hot', want);
    }
    if (want) {
      let txt = '';
      if (interactive.classList.contains('video')) txt = 'PUTAR';
      else if (interactive.classList.contains('qr')) txt = 'PINDAI';
      else if (interactive.classList.contains('bar-row')) txt = 'RASIO';
      else if (interactive.classList.contains('cpi-dot')) txt = 'LIHAT';
      else if (interactive.tagName === 'BUTTON') txt = 'BUKA';
      api.label(txt);
    } else if (el.label.textContent) {
      api.label('');
    }
  }

  const api = {
    init() {
      if (window.matchMedia('(pointer: coarse)').matches) return;
      build();
      document.body.classList.add('fx-cursor-on');
    },
    destroy() {
      document.body.classList.remove('fx-cursor-on');
      if (el.wrap) el.wrap.classList.remove('on');
    },
    label(txt) {
      if (!built) return;
      if (el.label.textContent === txt) return;
      if (txt) {
        el.label.textContent = txt;
        gsap.fromTo(el.label, { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)' });
      } else {
        gsap.to(el.label, { opacity: 0, duration: 0.2 });
      }
    },
    /* denyatkan cincin sesaat — dipakai saat momen penting (stamp, collapse) */
    pulse(color) {
      if (!built) return;
      gsap.fromTo(el.ring, { scale: 2.1 },
        { scale: hovering ? 1.55 : 1, duration: 0.6, ease: 'elastic.out(1,0.5)' });
      if (color) {
        gsap.fromTo(el.path, { stroke: color },
          { stroke: 'rgba(21,19,15,.55)', duration: 0.8 });
      }
    }
  };
  return api;
})();
