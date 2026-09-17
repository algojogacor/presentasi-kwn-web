/* ================================================================
   FX · ENTRANCES
   Modul entrance per slide. Tiap modul = fn(ctx) dengan
   ctx = { slide, tl, bus, index } — menambahkan tween ke timeline
   slide. Elemen yang ditangani modul khusus ditandai data-fx-owned
   supaya tidak dianimasikan ganda oleh default.
   ================================================================ */
window.FXEntrances = (function () {
  'use strict';

  const splits = new WeakMap();   /* slide -> [SplitText] */

  function own(el) { el.setAttribute('data-fx-owned', '1'); }
  function owned(root, sel) {
    return Array.prototype.filter.call(root.querySelectorAll(sel), function (e) {
      return !e.hasAttribute('data-fx-owned');
    });
  }

  /* CustomEase khas — dibuat sekali */
  if (window.CustomEase) {
    CustomEase.create('countSnap', 'M0,0 C0.18,0 0.26,0.04 0.4,0.14 0.56,0.3 0.68,0.58 0.79,0.82 0.86,0.97 0.9,1.03 0.94,1.015 0.97,1.005 0.99,1 1,1');
    CustomEase.create('barSpring', 'M0,0 C0.1,0 0.18,0.55 0.3,0.88 0.42,1.2 0.52,1.07 0.64,0.975 0.76,0.92 0.86,1.015 0.94,1 0.97,0.995 1,1 1,1');
    CustomEase.create('recoil', 'M0,0 C0.08,0 0.15,0.7 0.26,1.12 0.36,1.5 0.48,1.1 0.6,0.96 0.72,0.88 0.84,1.03 0.92,1.005 0.96,0.995 1,1 1,1');
  }

  /* ==============================================================
     HEADING — split per karakter, tiap huruf punya trayektori sendiri
     mode: assemble | rise | glitch | slow | mask (default baris)
     ============================================================== */
  function splitHeading(ctx, mode) {
    const slide = ctx.slide;
    const heads = slide.querySelectorAll('h1.hero, h2.title');
    if (!heads.length) return;
    heads.forEach(function (h) {
      own(h);
      const inners = h.querySelectorAll('.mask > span');
      const targets = inners.length ? inners : [h];
      targets.forEach(function (el, li) {
        const st = new SplitText(el, { type: 'chars', charsClass: 'fx-ch' });
        if (!splits.has(slide)) splits.set(slide, []);
        splits.get(slide).push(st);
        const chars = st.chars;
        gsap.set(chars, { display: 'inline-block', willChange: 'transform' });

        if (mode === 'assemble') {
          gsap.set(chars, {
            opacity: 0,
            x: function () { return (Math.random() - 0.5) * 460; },
            y: function () { return (Math.random() - 0.5) * 300 + 60; },
            rotation: function () { return (Math.random() - 0.5) * 120; },
            scale: function () { return 0.4 + Math.random() * 0.8; },
            filter: 'blur(10px)'
          });
          ctx.tl.to(chars, {
            opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, filter: 'blur(0px)',
            duration: 1.15, ease: 'power4.out',
            stagger: { each: 0.026, from: 'random' },
            delay: li * 0.14
          }, 0.15);
        } else if (mode === 'glitch') {
          chars.forEach(function (ch, ci) {
            gsap.set(ch, {
              opacity: 0, y: 26, filter: 'blur(4px)',
              x: (Math.random() - 0.5) * 16,
              skewX: (Math.random() - 0.5) * 10
            });
            ctx.tl.to(ch, {
              opacity: 1, y: 0, x: 0, skewX: 0, filter: 'blur(0px)',
              duration: 0.42, ease: 'steps(5)'
            }, 0.1 + li * 0.12 + ci * 0.02);
          });
        } else if (mode === 'slow') {
          gsap.set(chars, { opacity: 0, y: 22, filter: 'blur(7px)' });
          ctx.tl.to(chars, {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: 1.05, ease: 'power2.out',
            stagger: 0.034, delay: li * 0.16
          }, 0.2);
        } else {
          /* rise — default: huruf naik dari bawah baris, rotasi kecil */
          gsap.set(chars, {
            opacity: 0,
            y: function () { return 70 + Math.random() * 40; },
            rotation: function () { return (Math.random() - 0.5) * 16; },
            filter: 'blur(6px)'
          });
          ctx.tl.to(chars, {
            opacity: 1, y: 0, rotation: 0, filter: 'blur(0px)',
            duration: 0.95, ease: 'power4.out',
            stagger: 0.022, delay: li * 0.1
          }, 0.1);
        }
      });
    });
    /* eyebrow dash */
    const dash = slide.querySelector('.eyebrow .dash');
    if (dash) {
      own(dash);
      ctx.tl.fromTo(dash, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power3.out' }, 0.1);
    }
  }

  function pseudoRand(seed) {
    let s = seed + 1;
    return function () {
      s = (s * 1103515245 + 12345) >>> 0;
      return (s % 10000) / 10000;
    };
  }

  /* heading tanpa split — baris mask naik (fallback GSAP) */
  function maskLines(ctx) {
    const spans = owned(ctx.slide, '.mask > span');
    if (!spans.length) return;
    spans.forEach(function (sp) {
      own(sp);
      const p = sp.closest('.mask');
      const iv = parseFloat(getComputedStyle(p).getPropertyValue('--i') || 0);
      gsap.set(sp, { yPercent: 112 });
      ctx.tl.to(sp, { yPercent: 0, duration: 1.05, ease: 'power3.out' }, 0.1 + iv * 0.09);
    });
  }

  /* ==============================================================
     DEFAULT .rv — stagger mengikuti --i seperti CSS asli
     ============================================================== */
  function rvDefault(ctx) {
    const els = owned(ctx.slide, '.rv');
    if (!els.length) return;
    els.forEach(function (el) {
      own(el);
      const from = { autoAlpha: 0, duration: 0.78, ease: 'power3.out' };
      if (el.classList.contains('rv-l')) from.x = -34;
      else if (el.classList.contains('rv-r')) from.x = 34;
      else from.y = 20;
      if (el.classList.contains('rv-s')) from.scale = 0.94;
      if (el.classList.contains('rv-b')) from.filter = 'blur(9px)';
      const iv = parseFloat(getComputedStyle(el).getPropertyValue('--i') || 0);
      ctx.tl.from(el, from, iv * 0.068);
    });
  }

  /* ==============================================================
     COUNTER DRAMATIS — lambat, akselerasi, snap
     ============================================================== */
  function counter(el, tl, at) {
    own(el);
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const suffix = el.dataset.suffix || '';
    const st = { v: 0 };
    el.textContent = (0).toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
    tl.to(st, {
      v: target, duration: 1.7, ease: 'countSnap',
      onUpdate: function () {
        el.textContent = st.v.toLocaleString('id-ID', {
          minimumFractionDigits: dec, maximumFractionDigits: dec
        }) + suffix;
        window.FXSound.tick(62);
      },
      onComplete: function () {
        el.textContent = target.toLocaleString('id-ID', {
          minimumFractionDigits: dec, maximumFractionDigits: dec
        }) + suffix;
        gsap.fromTo(el, { scale: 1.055 }, { scale: 1, duration: 0.4, ease: 'power2.out' });
        window.FXSound.pop(760);
      }
    }, at == null ? '>' : at);
  }

  function countersAll(ctx) {
    const els = owned(ctx.slide, '[data-count]');
    els.forEach(function (el, i) { counter(el, ctx.tl, 0.55 + i * 0.12); });
  }

  /* ==============================================================
     SLIDE 06 — BAR CHART SPRING + GRID RIPPLE
     ============================================================== */
  function barsSpring(ctx) {
    const rows = Array.from(ctx.slide.querySelectorAll('.bar-row'));
    if (!rows.length) return;
    const n = rows.length;
    rows.forEach(function (row, i) {
      own(row);
      const fill = row.querySelector('.bar-track i');
      const v = parseFloat(getComputedStyle(row).getPropertyValue('--v'));
      const name = row.querySelector('.name');
      const val = row.querySelector('.val');
      const hi = row.classList.contains('hi');
      gsap.set(fill, { width: '0%' });
      gsap.set([name, val], { autoAlpha: 0, x: hi ? -8 : 8 });

      ctx.tl.to([name, val], { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power2.out' }, 0.5 + i * 0.11);
      ctx.tl.to(fill, {
        width: (v / 25 * 100) + '%',
        duration: hi ? 1.35 : 0.95,
        ease: hi ? 'recoil' : 'barSpring',
        onStart: function () {
          window.FXSvg.gridPulse(i, n, v);
          window.FXSound.pop(hi ? 340 : 480 + i * 30);
        }
      }, 0.62 + i * 0.11);

      if (hi) {
        /* Indonesia: recoil merah — flash + getar tipis setelah overshoot */
        ctx.tl.fromTo(row, { boxShadow: '0 0 0 rgba(195,59,34,0)' },
          { boxShadow: '0 0 26px rgba(195,59,34,.4)', duration: 0.3, yoyo: true, repeat: 1 },
          0.62 + i * 0.11 + 0.4);
        ctx.tl.call(function () { window.FXSound.impact(0.55); }, null, 0.62 + i * 0.11 + 0.42);
      }
    });
    /* garis rata-rata kawasan */
    const av = ctx.slide.querySelector('.avgline span');
    const avb = ctx.slide.querySelector('.avgline b');
    if (av) {
      own(av); own(avb);
      gsap.set([av, avb], { autoAlpha: 0 });
      gsap.set(av, { transformOrigin: 'top center', scaleY: 0 });
      ctx.tl.to(av, { autoAlpha: 0.85, scaleY: 1, duration: 0.8, ease: 'power2.out' }, 1.9);
      ctx.tl.to(avb, { autoAlpha: 1, duration: 0.5 }, 2.25);
      ctx.tl.call(function () { window.FXSound.chime(); }, null, 2.3);
    }
  }

  /* ==============================================================
     SLIDE 16 — CPI DRAW + DOT JATUH + COLLAPSE
     ============================================================== */
  function cpiCollapse(ctx) {
    const slide = ctx.slide;
    const line = slide.querySelector('.cpi-line');
    const dots = slide.querySelectorAll('.cpi-dot');
    const txts = slide.querySelectorAll('.cpi-txt');
    const target = slide.querySelector('.cpi-target');
    if (!line) return;
    [line, target].concat(Array.from(dots), Array.from(txts)).forEach(function (e) { if (e) own(e); });

    const dot1 = slide.querySelector('.cpi-dot[data-d="1"]');
    const dot2 = slide.querySelector('.cpi-dot[data-d="2"]');
    const dot3 = slide.querySelector('.cpi-dot[data-d="3"]');
    const txtAxis = Array.from(txts).filter(function (t) { return !t.hasAttribute('data-d'); });
    const txt1 = slide.querySelector('.cpi-txt[data-d="1"]');
    const txt2 = slide.querySelector('.cpi-txt[data-d="2"]');
    const txt3s = slide.querySelectorAll('.cpi-txt[data-d="3"]');

    gsap.set(line, { drawSVG: 0 });
    gsap.set(dots, { scale: 0, transformOrigin: 'center center', transformBox: 'fill-box', opacity: 1 });
    gsap.set(txts, { autoAlpha: 0 });
    gsap.set(target, { autoAlpha: 0 });

    ctx.tl.to(txtAxis, { autoAlpha: 1, duration: 0.5, stagger: 0.05 }, 0.3);
    ctx.tl.to(line, { drawSVG: '100%', duration: 1.7, ease: 'power2.inOut' }, 0.4);
    ctx.tl.to(dot1, { scale: 1, duration: 0.5, ease: 'back.out(2.4)',
      onStart: function () { window.FXSound.pop(420); } }, 0.55);
    ctx.tl.to(txt1, { autoAlpha: 1, duration: 0.4 }, 0.75);
    ctx.tl.to(dot2, { scale: 1, duration: 0.5, ease: 'back.out(2.4)',
      onStart: function () { window.FXSound.pop(520); } }, 1.25);
    ctx.tl.to(txt2, { autoAlpha: 1, duration: 0.4 }, 1.45);
    /* titik 2025: muncul di posisi 37 (puncak harapan) lalu JATUH ke 34 */
    ctx.tl.set(dot3, { attr: { cy: 140.5 }, scale: 1 }, 1.95);
    ctx.tl.to(dot3, {
      attr: { cy: 166 }, duration: 0.85, ease: 'bounce.out', delay: 0.14,
      onComplete: function () {
        window.FXSound.crumble();
        shakeSlide(slide, 9, 0.5);
        ctx.bus.emit('cpi:collapse', {});
      }
    }, 2.15);
    ctx.tl.to(txt3s, { autoAlpha: 1, duration: 0.45 }, 2.95);
    ctx.tl.to(target, { autoAlpha: 0.9, duration: 0.6 }, 3.25);
    ctx.tl.call(function () { window.FXSound.pop(300); }, null, 3.35);

    /* physics shard — gedung runtuh selaras dot jatuh */
    let phys = null;
    ctx.bus.on('cpi:collapse', function once() {
      ctx.bus.off('cpi:collapse', once);
      /* siluet SVG morph ke reruntuhan tepat saat ledakan */
      window.FXSvg.apply({ silhouette: 'ruins', layers: ['cracks'] });
      const dotRect = dot3.getBoundingClientRect();
      const slRect = slide.getBoundingClientRect();
      phys = window.FXPhysics.start(slide, {
        epicenter: function () {
          return {
            x: dotRect.left - slRect.left + dotRect.width / 2,
            y: Math.max(60, dotRect.top - slRect.top - 40)
          };
        },
        onSettle: function () { ctx.bus.emit('cpi:settled', {}); }
      });
      ctx.physics = phys;
      setTimeout(function () { if (phys) phys.explode(1.15); }, 260);
      /* abu WebGL */
      window.FXGL.play('ash');
      gsap.fromTo(slide.querySelectorAll('.chart svg'), { opacity: 1 }, { opacity: 0.34, duration: 1.2, delay: 0.5 });
    });
  }

  function shakeSlide(slide, amp, dur) {
    const tl = gsap.timeline();
    for (let i = 0; i < 8; i++) {
      tl.to(slide, { x: (Math.random() - 0.5) * amp * 2, y: (Math.random() - 0.5) * amp * 1.4, duration: dur / 8, ease: 'none' });
    }
    tl.to(slide, { x: 0, y: 0, duration: dur / 3, ease: 'power2.out' });
    return tl;
  }

  /* ==============================================================
     SLIDE 18 — RANTAI DRAW
     ============================================================== */
  function chainDraw(ctx) {
    const slide = ctx.slide;
    const path = slide.querySelector('.chain-path');
    if (!path) return;
    const nodes = slide.querySelectorAll('.chain-node');
    own(path);
    gsap.set(path, { drawSVG: 0 });
    ctx.tl.to(path, { drawSVG: '100%', duration: 2.1, ease: 'power1.inOut' }, 0.45);
    nodes.forEach(function (n, i) {
      const c = n.querySelector('circle');
      const t = n.querySelectorAll('text');
      own(c); t.forEach(own);
      /* animasikan radius, bukan scale: GSAP + transform-box:fill-box pada
         circle SVG meninggalkan translasi sisa yang menggeser simpul */
      const r0 = parseFloat(c.getAttribute('r')) || 27;
      gsap.set(c, { attr: { r: 0 }, opacity: 1 });
      gsap.set(t, { autoAlpha: 0 });
      ctx.tl.to(c, { attr: { r: r0 }, duration: 0.62, ease: 'back.out(2.6)',
        onStart: function () { window.FXSound.pop(440 + i * 90); } }, 0.55 + i * 0.42);
      ctx.tl.to(t, { autoAlpha: 1, duration: 0.45 }, 0.75 + i * 0.42);
    });
  }

  /* ==============================================================
     SLIDE 21 — KPI SPRING
     ============================================================== */
  function kpiSpring(ctx) {
    const rows = ctx.slide.querySelectorAll('.kpi-row');
    rows.forEach(function (row, i) {
      own(row);
      const fill = row.querySelector('.kpi-track i');
      const gap = row.querySelector('.kpi-track .gap');
      const em = row.querySelector('.kpi-track em');
      const vals = row.querySelector('.kpi-head .vals');
      const v = parseFloat(getComputedStyle(row.querySelector('.kpi-track')).getPropertyValue('--v'));
      [fill, gap, em, vals].forEach(function (e) { if (e) own(e); });

      gsap.set(fill, { width: '0%' });
      gsap.set(gap, { autoAlpha: 0 });
      gsap.set(em, { scaleY: 0, transformOrigin: 'center bottom', autoAlpha: 0 });
      gsap.set(vals, { autoAlpha: 0, y: 8 });

      ctx.tl.to(vals, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 0.5 + i * 0.22);
      ctx.tl.to(fill, { width: v + '%', duration: 1.15, ease: 'barSpring',
        onStart: function () { window.FXSound.pop(500 + i * 60); } }, 0.62 + i * 0.22);
      ctx.tl.to(em, { autoAlpha: 1, scaleY: 1, duration: 0.55, ease: 'back.out(3)' }, 1.25 + i * 0.22);
      ctx.tl.to(gap, { autoAlpha: 1, duration: 0.5 }, 1.45 + i * 0.22);
      /* jurang berdenyut tiga kali — "pekerjaan yang belum selesai" */
      ctx.tl.fromTo(gap, { opacity: 0.45 }, { opacity: 1, duration: 0.3, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 1.9);
      ctx.tl.call(function () { if (i === rows.length - 1) window.FXSound.chime(); }, null, 1.5 + i * 0.22);
    });
  }

  /* ==============================================================
     SLIDE 22 — BAR REDAKSI FINAL + STAMP SLAM
     ============================================================== */
  function redactionFinal(ctx) {
    const slide = ctx.slide;
    const rows = slide.querySelectorAll('.cb-row');
    rows.forEach(function (row, i) {
      own(row);
      const bar = row.querySelector('i');
      const txt = row.querySelector('b');
      own(bar); own(txt);
      gsap.set(bar, { width: '0%' });
      gsap.set(txt, { autoAlpha: 0, y: 5 });
      /* bar menutup */
      ctx.tl.to(bar, { width: '100%', duration: 0.34, ease: 'power3.in',
        onStart: function () { window.FXSound.tick(40); } }, 0.5 + i * 0.13);
      /* tahan... lalu terbuka */
      ctx.tl.to(bar, { width: '0%', duration: 1.05, ease: 'power2.inOut' }, 2.35 + i * 0.14);
      ctx.tl.to(txt, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 2.75 + i * 0.14);
    });
    const reveal = slide.querySelector('.reveal-line');
    if (reveal) {
      own(reveal);
      gsap.set(reveal, { autoAlpha: 0, y: 10 });
      ctx.tl.to(reveal, { autoAlpha: 1, y: 0, duration: 0.9 }, 3.7);
    }
    stampSlam(ctx, 4.15);
  }

  function stampSlam(ctx, at) {
    const stamp = ctx.slide.querySelector('.stamp');
    if (!stamp) return;
    own(stamp);
    gsap.set(stamp, { autoAlpha: 0, scale: 2.8, rotation: -19, transformOrigin: 'center center' });
    ctx.tl.to(stamp, { autoAlpha: 0.95, scale: 1, rotation: -7, duration: 0.34, ease: 'power4.in' }, at);
    ctx.tl.call(function () {
      window.FXSound.impact(1.35);
      shakeSlide(ctx.slide, 7, 0.3);
      if (window.FXCursor) window.FXCursor.pulse('#C33B22');
    }, null, at + 0.32);
  }

  /* ==============================================================
     KARTU — tiga karakter masuk
     ============================================================== */
  function cards(ctx, mode) {
    const cards = owned(ctx.slide, '.card');
    if (!cards.length) return;
    cards.forEach(own);
    if (mode === 'stamp') {
      gsap.set(cards, { autoAlpha: 0, scale: 1.3, rotation: -3 });
      cards.forEach(function (c, i) {
        ctx.tl.to(c, {
          autoAlpha: 1, scale: 1, rotation: 0,
          duration: 0.5, ease: 'power4.out',
          onStart: function () { window.FXSound.tick(45); }
        }, 0.5 + i * 0.16);
      });
    } else if (mode === 'flip') {
      gsap.set(cards, { autoAlpha: 0, rotateY: 78, transformOrigin: 'left center' });
      ctx.tl.to(cards, {
        autoAlpha: 1, rotateY: 0, duration: 0.9, ease: 'power3.out', stagger: 0.14
      }, 0.5);
    } else {
      gsap.set(cards, { autoAlpha: 0, y: 46, rotateX: -7 });
      ctx.tl.to(cards, {
        autoAlpha: 1, y: 0, rotateX: 0, duration: 0.85, ease: 'power3.out', stagger: 0.11
      }, 0.45);
    }
  }

  /* ==============================================================
     SLIDE 01 — HERO
     ============================================================== */
  function hero(ctx) {
    const slide = ctx.slide;
    splitHeading(ctx, 'assemble');
    /* panel sumber masuk dari kanan seperti map diletakkan di meja */
    const doc = slide.querySelector('.doc');
    if (doc) {
      own(doc);
      ctx.tl.from(doc, { autoAlpha: 0, x: 70, rotateY: -8, duration: 1, ease: 'power3.out' }, 0.7);
      const items = slide.querySelectorAll('.src li');
      items.forEach(own);
      ctx.tl.from(items, { autoAlpha: 0, x: 26, duration: 0.55, stagger: 0.11, ease: 'power2.out' }, 1.0);
    }
    rvDefault(ctx);
    stampSlam(ctx, 2.2);
    /* partikel Three.js mulai berkumpul selaras judul terakit */
    ctx.tl.call(function () { window.FXSound.chime(); }, null, 1.5);
  }

  /* ==============================================================
     SLIDE 17 — KOIN 3D
     ============================================================== */
  function coinFlip3D(ctx) {
    const slide = ctx.slide;
    splitHeading(ctx, 'slow');
    cards(ctx, 'rise');
    rvDefault(ctx);
    /* koin SVG stage menoleh mengikuti pointer — didaftarkan interaksi */
    ctx.tl.call(function () {
      ctx.bus.emit('coin:ready', {});
    }, null, 1.2);
  }

  /* ==============================================================
     DEFAULT PIPELINE
     ============================================================== */
  function standard(ctx, headingMode, cardMode) {
    if (headingMode) splitHeading(ctx, headingMode);
    else maskLines(ctx);
    if (cardMode) cards(ctx, cardMode);
    rvDefault(ctx);
    countersAll(ctx);
  }

  /* ==============================================================
     REVERT — bersihkan SplitText & properti inline saat slide keluar
     ============================================================== */
  function revert(slide) {
    const list = splits.get(slide);
    if (list) {
      list.forEach(function (st) { try { st.revert(); } catch (e) {} });
      splits.delete(slide);
    }
    slide.querySelectorAll('[data-fx-owned]').forEach(function (e) {
      e.removeAttribute('data-fx-owned');
    });
  }

  return {
    standard: standard,
    splitHeading: splitHeading,
    maskLines: maskLines,
    rvDefault: rvDefault,
    countersAll: countersAll,
    counter: counter,
    cards: cards,
    barsSpring: barsSpring,
    cpiCollapse: cpiCollapse,
    chainDraw: chainDraw,
    kpiSpring: kpiSpring,
    redactionFinal: redactionFinal,
    stampSlam: stampSlam,
    hero: hero,
    coinFlip3D: coinFlip3D,
    shakeSlide: shakeSlide,
    revert: revert
  };
})();
