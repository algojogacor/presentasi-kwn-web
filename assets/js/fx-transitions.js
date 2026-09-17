/* ================================================================
   FX · TRANSITIONS
   13 transisi berkarakter. Tiap transisi = fungsi(ov, ctx) yang
   membangun DOM di dalam #fx-overlay dan mengembalikan timeline
   GSAP dengan label 'mid' (layar tertutup penuh — core melompat
   ke slide berikutnya tepat di titik itu).
   Konteks naratif:
     Babak I-II  : kertas, tinta, presisi (curtain, tear, grid, stamp)
     Masuk III   : kekerasan — robekan dalam, glitch, retak, erosi, shatter
     Babak IV    : rekonstruksi — reassemble, koin, garis, blueprint, meteran
   ================================================================ */
window.FXTransitions = (function () {
  'use strict';

  function div(ov, styles, cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    Object.assign(d.style, { position: 'absolute', margin: 0 });
    if (styles) Object.assign(d.style, styles);
    ov.appendChild(d);
    return d;
  }

  function svgEl(ov, html) {
    const s = document.createElement('div');
    Object.assign(s.style, { position: 'absolute', inset: '0' });
    s.innerHTML = html;
    ov.appendChild(s);
    return s;
  }

  function shake(el, amp, dur) {
    const tl = gsap.timeline();
    const n = 8;
    for (let i = 0; i < n; i++) {
      tl.to(el, {
        x: (Math.random() - 0.5) * amp * 2,
        y: (Math.random() - 0.5) * amp * 2,
        duration: dur / n, ease: 'none'
      });
    }
    tl.to(el, { x: 0, y: 0, duration: dur / 4 });
    return tl;
  }

  const PAPER = '#F2EDE3', INK = '#15130F', RED = '#C33B22';
  const map = {};

  /* ============ 1. CURTAIN MERAH — jatuh lalu naik ============ */
  function curtain(ov, ctx, opts) {
    opts = opts || {};
    const N = opts.n || 5;
    const dropDur = opts.drop || 0.62, hold = opts.hold || 0.22, riseDur = opts.rise || 0.68;
    const panels = [];
    for (let i = 0; i < N; i++) {
      panels.push(div(ov, {
        left: (i * 100 / N) + '%', top: 0,
        width: (100 / N + 0.4) + '%', height: '100%',
        background: 'linear-gradient(90deg, #9E2E19 0%, #C33B22 22%, #D9553B 50%, #C33B22 78%, #8F2814 100%)',
        boxShadow: 'inset 0 0 40px rgba(21,19,15,.25)',
        transform: 'translateY(-101%)'
      }));
    }
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(dropDur + 0.15, true); });
    tl.to(panels, {
      yPercent: 0, duration: dropDur, stagger: opts.stagger || 0.065,
      ease: 'power3.inOut'
    });
    tl.addLabel('mid');
    tl.add(shake(ov, opts.heavy ? 7 : 3, 0.24));
    tl.to(panels, {
      yPercent: -101, duration: riseDur, stagger: (opts.stagger || 0.065) * 0.8,
      ease: 'power3.inOut'
    }, '+=' + hold);
    if (opts.final) tl.call(function () { window.FXSound.chime(); }, null, 'mid+=0.1');
    return tl;
  }
  map['curtain-red'] = function (ov, ctx) { return curtain(ov, ctx, {}); };
  map['curtain-final'] = function (ov, ctx) {
    return curtain(ov, ctx, { n: 7, drop: 0.82, hold: 0.45, rise: 0.88, stagger: 0.085, final: true });
  };

  /* ============ 2/3. SOBEKAN KERTAS ============ */
  function tear(ov, ctx, opts) {
    opts = opts || {};
    const dark = !!opts.dark;
    const bg = dark ? '#191510' : PAPER;
    const seamColor = dark ? RED : 'rgba(21,19,15,.85)';

    /* seam bergerigi di tengah */
    function clip(side) {
      const pts = [];
      const teeth = 16;
      for (let i = 0; i <= teeth; i++) {
        const y = (i / teeth) * 100;
        const j = (i % 2 === 0 ? -1 : 1) * (1.1 + (i * 37 % 5) * 0.32);
        const x = 50 + j;
        if (side === 'l') pts.push(x.toFixed(2) + '% ' + y.toFixed(2) + '%');
        else pts.push(x.toFixed(2) + '% ' + y.toFixed(2) + '%');
      }
      if (side === 'l') return 'polygon(0% 0%, ' + pts.join(', ') + ', 0% 100%)';
      return 'polygon(100% 0%, ' + pts.slice().reverse().join(', ') + ', 100% 100%)';
    }
    const L = div(ov, { left: 0, top: 0, width: '100%', height: '100%', background: bg, clipPath: clip('l'), transform: 'translateX(-101%)' });
    const R = div(ov, { left: 0, top: 0, width: '100%', height: '100%', background: bg, clipPath: clip('r'), transform: 'translateX(101%)' });
    /* garis seam */
    const seam = div(ov, {
      left: '50%', top: 0, width: '2px', height: '100%',
      background: seamColor, transform: 'translateX(-50%) scaleY(0)', opacity: 0
    });

    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.rip(); if (dark) window.FXSound.impact(0.8); });
    const inDur = dark ? 0.52 : 0.62;
    tl.to([L, R], { x: 0, duration: inDur, ease: dark ? 'power3.in' : 'power2.inOut' }, 0);
    tl.to(seam, { opacity: 1, scaleY: 1, duration: inDur * 0.8, ease: 'power2.out' }, 0.04);
    if (dark) tl.add(shake(ov, 9, 0.26), inDur * 0.7);
    tl.addLabel('mid', inDur + 0.04);
    /* flash merah untuk tear dalam */
    if (dark) {
      const flash = div(ov, { left: 0, top: 0, width: '100%', height: '100%', background: RED, opacity: 0 });
      tl.to(flash, { opacity: 0.35, duration: 0.12 }, 'mid');
      tl.to(flash, { opacity: 0, duration: 0.25 }, 'mid+=0.12');
    }
    const outDur = dark ? 0.65 : 0.72;
    tl.to(L, { x: '-104%', rotate: dark ? -2.5 : -1.2, y: dark ? 26 : 8, duration: outDur, ease: 'power2.inOut' }, 'mid+=0.18');
    tl.to(R, { x: '104%', rotate: dark ? 2.5 : 1.2, y: dark ? 26 : 8, duration: outDur, ease: 'power2.inOut' }, 'mid+=0.18');
    tl.to(seam, { opacity: 0, duration: 0.25 }, 'mid+=0.18');
    return tl;
  }
  map['tear-light'] = function (ov, ctx) { return tear(ov, ctx, {}); };
  map['tear-deep'] = function (ov, ctx) { return tear(ov, ctx, { dark: true }); };

  /* ============ 4. SAPUAN TINTA ============ */
  map['ink-wipe'] = function (ov) {
    const panel = div(ov, { left: 0, top: 0, width: '100%', height: '100%', background: INK, clipPath: 'inset(0 100% 0 0)' });
    const st = { t: 0 };
    function clip(t) {
      /* tepi kanan bergelombang */
      const pts = [];
      const steps = 14;
      const xr = t * 118 - 9;          /* posisi tepi kanan, % */
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * 100;
        const w = Math.sin(i * 1.7 + t * 4) * 4.2 + Math.sin(i * 0.7) * 2.4;
        pts.push((xr + w).toFixed(2) + '% ' + y.toFixed(2) + '%');
      }
      const xl = Math.max(0, t * 118 - 118);
      return 'polygon(0% 0%, ' + pts.join(', ') + ', ' + xl.toFixed(2) + '% 100%, 0% 100%)';
    }
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.65); });
    tl.to(st, {
      t: 1, duration: 0.72, ease: 'power2.inOut',
      onUpdate: function () { panel.style.clipPath = clip(st.t); }
    });
    tl.addLabel('mid');
    tl.call(function () { window.FXSound.whoosh(0.65); }, null, 'mid+=0.15');
    tl.to(st, {
      t: 2, duration: 0.72, ease: 'power2.inOut', delay: 0.18,
      onUpdate: function () { panel.style.clipPath = clip(st.t); }
    });
    return tl;
  };

  /* ============ 5. IRISAN GRID ============ */
  map['grid-slice'] = function (ov) {
    const N = 14;
    const slices = [];
    for (let i = 0; i < N; i++) {
      const fromTop = i % 2 === 0;
      slices.push(div(ov, {
        left: (i * 100 / N) + '%', top: 0,
        width: (100 / N + 0.3) + '%', height: '100%',
        background: 'linear-gradient(180deg,' + PAPER + ',' + '#E8E0D1' + ')',
        borderLeft: '1px solid rgba(21,19,15,.12)',
        transform: 'translateY(' + (fromTop ? '-101%' : '101%') + ')'
      }));
    }
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.55); });
    slices.forEach(function (s, i) {
      const fromTop = i % 2 === 0;
      tl.to(s, { y: 0, duration: 0.58, ease: 'power3.inOut' }, i * 0.028);
      tl.to(s, { yPercent: fromTop ? 101 : -101, duration: 0.62, ease: 'power3.inOut' }, 'mid+=' + (0.16 + i * 0.025));
    });
    tl.addLabel('mid', 0.58 + N * 0.028 + 0.04);
    return tl;
  };

  /* ============ 6. RAMBATANA BAGAN BATANG ============ */
  map['bars-shutter'] = function (ov) {
    const N = 9;
    const bars = [];
    for (let i = 0; i < N; i++) {
      bars.push(div(ov, {
        left: 0, top: (i * 100 / N) + '%',
        width: '100%', height: (100 / N + 0.5) + '%',
        background: i === 2 ? 'linear-gradient(90deg,' + INK + ' 86%,' + RED + ')' : INK,
        transform: 'scaleX(0)', transformOrigin: i % 2 ? 'right center' : 'left center'
      }));
    }
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.5); });
    tl.to(bars, { scaleX: 1, duration: 0.68, stagger: 0.04, ease: 'power3.out' });
    tl.addLabel('mid');
    tl.call(function () {
      bars.forEach(function (b) { b.style.transformOrigin = 'right center'; });
    }, null, 'mid');
    tl.to(bars, { scaleX: 0, duration: 0.62, stagger: 0.035, ease: 'power2.inOut' }, 'mid+=0.18');
    return tl;
  };

  /* ============ 7. ZOOM DIVE ============ */
  map['zoom-dive'] = function (ov) {
    const circ = div(ov, {
      left: '28%', top: '58%', width: '280vmax', height: '280vmax',
      marginLeft: '-140vmax', marginTop: '-140vmax',
      borderRadius: '50%', background: INK,
      border: '4px solid ' + RED,
      transform: 'scale(0)'
    });
    const ring = div(ov, {
      left: '28%', top: '58%', width: '60vmax', height: '60vmax',
      marginLeft: '-30vmax', marginTop: '-30vmax',
      borderRadius: '50%', border: '2px solid ' + RED, opacity: 0
    });
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.7, true); });
    tl.to(circ, { scale: 1, duration: 0.72, ease: 'power3.inOut' });
    tl.fromTo(ring, { opacity: 0.9, scale: 0.2 }, { scale: 3, opacity: 0, duration: 0.85, ease: 'power2.out' }, 0.1);
    tl.addLabel('mid');
    /* emerge: lingkaran mengecil ke titik berbeda (kanan-atas) */
    tl.to(circ, { left: '72%', top: '34%', scale: 0, duration: 0.7, ease: 'power3.inOut' }, 'mid+=0.18');
    return tl;
  };

  /* ============ 8. STAMP PRESS ============ */
  map['stamp-press'] = function (ov) {
    const panel = div(ov, { left: 0, top: 0, width: '100%', height: '100%', background: PAPER, opacity: 0 });
    const stamp = div(ov, {
      left: '50%', top: '50%', width: '58vmin', height: '32vmin',
      transform: 'translate(-50%,-50%) rotate(-6deg) scale(3.4)',
      border: '7px double ' + RED, outline: '2px solid ' + RED, outlineOffset: '6px',
      background: 'rgba(242,237,227,.2)', opacity: 0
    });
    const tl = gsap.timeline();
    tl.to(stamp, { opacity: 1, duration: 0.12 });
    tl.to(stamp, { scale: 1, duration: 0.46, ease: 'power4.in' }, 0);
    tl.call(function () { window.FXSound.impact(1.1); }, null, 0.46);
    tl.add(shake(ov, 8, 0.26), 0.46);
    tl.to(panel, { opacity: 1, duration: 0.2 }, 0.46);
    tl.addLabel('mid', 0.68);
    tl.to(panel, { yPercent: -104, duration: 0.68, ease: 'power3.inOut' }, 'mid+=0.18');
    tl.to(stamp, { y: '-130vh', duration: 0.68, ease: 'power3.inOut' }, 'mid+=0.21');
    return tl;
  };

  /* ============ 9. SPLIT PANELS ============ */
  map['split-panels'] = function (ov) {
    const T = div(ov, { left: 0, top: 0, width: '100%', height: '50.2%', background: PAPER, borderBottom: '2px solid ' + INK, transform: 'translateX(-101%)' });
    const B = div(ov, { left: 0, top: '49.8%', width: '100%', height: '50.2%', background: '#E8E0D1', borderTop: '2px solid ' + RED, transform: 'translateX(101%)' });
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.65); });
    tl.to([T, B], { x: 0, duration: 0.65, ease: 'power3.inOut' });
    tl.addLabel('mid');
    tl.to(T, { yPercent: -102, duration: 0.68, ease: 'power3.inOut' }, 'mid+=0.18');
    tl.to(B, { yPercent: 102, duration: 0.68, ease: 'power3.inOut' }, 'mid+=0.18');
    return tl;
  };

  /* ============ 10. PILAR NAIK ============ */
  map['pillar-rise'] = function (ov) {
    const cols = [];
    for (let i = 0; i < 3; i++) {
      cols.push(div(ov, {
        left: (i * 33.34) + '%', top: 0, width: '33.8%', height: '100%',
        background: 'linear-gradient(90deg,#1E1A14,' + INK + ' 30%,#221E17 70%,#171410)',
        borderTop: '6px solid ' + RED,
        transform: 'translateY(101%)'
      }));
    }
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.65, false); });
    tl.to(cols, { y: 0, duration: 0.68, stagger: 0.09, ease: 'power3.out' });
    tl.addLabel('mid');
    tl.to(cols, { yPercent: -101, duration: 0.66, stagger: 0.07, ease: 'power2.inOut' }, 'mid+=0.2');
    return tl;
  };

  /* ============ 11. INK BLEED (jeda tenang) ============ */
  map['ink-bleed'] = function (ov) {
    const s = svgEl(ov,
      '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">' +
      '<path id="fxBleed" fill="' + INK + '" d="M0,-8 C14,-9 26,-16 34,-6 C44,4 38,18 30,28 C20,40 6,36 -6,32 C-20,28 -34,22 -36,8 C-38,-6 -28,-14 -16,-12 C-10,-11 -5,-7 0,-8 Z"/>' +
      '</svg>');
    const blob = s.querySelector('#fxBleed');
    /* koordinat path relatif (0,0); gsap memindahkannya ke pusat viewBox
       dan menskalakan dari sana — CSS transform menggantikan atribut SVG */
    gsap.set(blob, { x: 50, y: 50, scale: 0, transformOrigin: 'center center', transformBox: 'fill-box' });
    const tl = gsap.timeline();
    tl.to(blob, { scale: 5.8, rotation: 26, duration: 1.15, ease: 'sine.inOut' });
    tl.addLabel('mid');
    tl.to(blob, { scale: 0, rotation: 52, duration: 0.9, ease: 'power2.inOut' }, 'mid+=0.22');
    return tl;
  };

  /* ============ 12. GLITCH SLICE (masuk babak korupsi) ============ */
  map['glitch-slice'] = function (ov) {
    const N = 9;
    const slices = [];
    for (let i = 0; i < N; i++) {
      const c = i === 3 || i === 6 ? RED : (i % 2 ? INK : PAPER);
      slices.push(div(ov, {
        left: 0, top: (i * 100 / N) + '%', width: '100%', height: (100 / N + 0.5) + '%',
        background: c, opacity: 0,
        transform: 'translateX(' + ((i % 2 ? 1 : -1) * (10 + Math.random() * 30)) + '%) skewX(' + ((Math.random() - 0.5) * 6) + 'deg)'
      }));
    }
    const tl = gsap.timeline();
    function burst(at, spread) {
      slices.forEach(function (s, i) {
        tl.to(s, {
          x: (i % 2 ? 1 : -1) * (Math.random() * spread) + '%',
          skewX: (Math.random() - 0.5) * 8,
          duration: 0.08, ease: 'none'
        }, at + i * 0.01);
      });
    }
    tl.call(function () { window.FXSound.tick(30); });
    tl.to(slices, { opacity: 1, duration: 0.08, stagger: 0.015 }, 0);
    burst(0.1, 14);
    burst(0.28, 8);
    tl.to(slices, { x: '0%', skewX: 0, duration: 0.28, ease: 'power2.in' }, 0.46);
    tl.addLabel('mid', 0.74);
    burst('mid+=0.18', 18);
    tl.to(slices, { opacity: 0, x: function (i) { return (i % 2 ? 60 : -60) + '%'; }, duration: 0.38, stagger: 0.02, ease: 'power2.in' }, 'mid+=0.28');
    return tl;
  };

  /* ============ 13. CRACK SPREAD ============ */
  map['crack-spread'] = function (ov) {
    const s = svgEl(ov,
      '<svg viewBox="0 0 1000 600" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">' +
      '<g id="fxCracks" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round">' +
      '<path d="M500,300 L420,220 L380,120 L340,40"/>' +
      '<path d="M500,300 L600,240 L700,210 L820,150"/>' +
      '<path d="M500,300 L460,400 L420,520 L400,590"/>' +
      '<path d="M500,300 L580,380 L640,480 L680,590"/>' +
      '<path d="M500,300 L380,320 L240,300 L80,320"/>' +
      '<path d="M500,300 L620,320 L780,300 L950,330"/>' +
      '<path d="M420,220 L300,200 L180,150"/>' +
      '<path d="M600,240 L720,120 L800,40"/>' +
      '</g></svg>');
    const paths = s.querySelectorAll('#fxCracks path');
    gsap.set(paths, { drawSVG: 0 });
    /* panel baji yang runtuh menutup layar */
    const wedges = [];
    for (let i = 0; i < 6; i++) {
      wedges.push(div(ov, {
        left: (i * 100 / 6 - 0.5) + '%', top: 0,
        width: (100 / 6 + 1.2) + '%', height: '100%',
        background: i === 2 || i === 4 ? '#1B1712' : INK,
        transform: 'translateY(-102%)'
      }));
    }
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.rip(); });
    tl.to(paths, { drawSVG: '100%', duration: 0.72, stagger: 0.055, ease: 'power3.in' });
    tl.add(shake(ov, 7, 0.32), 0.38);
    tl.call(function () { window.FXSound.whoosh(0.5, true); });
    tl.to(wedges, { y: 0, duration: 0.52, stagger: 0.05, ease: 'power3.in' }, 0.8);
    tl.to(s, { opacity: 0, duration: 0.25 }, 1.05);
    tl.addLabel('mid', 1.35);
    tl.to(wedges, { yPercent: 104, rotation: function (i) { return (i % 2 ? 1.5 : -1.5); }, duration: 0.65, stagger: 0.05, ease: 'power2.inOut' }, 'mid+=0.22');
    return tl;
  };

  /* ============ 14. EROSI NOISE ============ */
  map['erosion'] = function (ov) {
    const cv = document.createElement('canvas');
    Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    ov.appendChild(cv);
    const c2 = cv.getContext('2d');
    const CELL = 20;
    let cols = 0, rows = 0, order = [];
    function setup() {
      cv.width = window.innerWidth; cv.height = window.innerHeight;
      cols = Math.ceil(cv.width / CELL); rows = Math.ceil(cv.height / CELL);
      order = [];
      for (let i = 0; i < cols * rows; i++) order.push(i);
      /* urutan noise: acak berbobot dari sudut kiri-atas agar organik */
      order.sort(function (a, b) {
        const ax = a % cols, ay = (a / cols) | 0, bx2 = b % cols, by = (b / cols) | 0;
        return (ax * 0.7 + ay + Math.random() * 9) - (bx2 * 0.7 + by + Math.random() * 9);
      });
    }
    setup();
    let drawn = 0;
    function paintTo(p) {
      const target = Math.round(p * order.length);
      while (drawn < target) {
        const idx = order[drawn++];
        const x = (idx % cols) * CELL, y = ((idx / cols) | 0) * CELL;
        const shade = 226 + Math.random() * 16;
        c2.fillStyle = 'rgb(' + shade + ',' + (shade - 6) + ',' + (shade - 18) + ')';
        c2.globalAlpha = 0.55 + Math.random() * 0.45;
        c2.fillRect(x - 1, y - 1, CELL + 2, CELL + 2);
      }
      while (drawn > target) {
        const idx = order[--drawn];
        const x = (idx % cols) * CELL, y = ((idx / cols) | 0) * CELL;
        c2.clearRect(x - 2, y - 2, CELL + 4, CELL + 4);
      }
      c2.globalAlpha = 1;
    }
    const st = { p: 0 };
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.75, true); });
    tl.to(st, { p: 1, duration: 0.85, ease: 'power2.inOut', onUpdate: function () { paintTo(st.p); } });
    tl.addLabel('mid');
    tl.to(st, { p: 0, duration: 0.8, ease: 'power2.inOut', delay: 0.2, onUpdate: function () { paintTo(st.p); } });
    return tl;
  };

  /* ============ 15/16. SHATTER & REASSEMBLE ============ */
  function shatterPolys() {
    /* triangulasi radial dari titik pusat: 3 cincin x 14 arah */
    const cx = 46, cy = 52, DIRS = 14, RINGS = 3;
    const rings = [];
    for (let ring = 1; ring <= RINGS; ring++) {
      const pts = [];
      const R = ring / RINGS;
      for (let d = 0; d < DIRS; d++) {
        const a = (d / DIRS) * Math.PI * 2 + ring * 0.22;
        const rad = R * (0.94 + ((d * 7 + ring * 13) % 5) * 0.03) * 1.5;
        pts.push([cx + Math.cos(a) * rad * 78, cy + Math.sin(a) * rad * 52]);
      }
      rings.push(pts);
    }
    const polys = [];
    for (let d = 0; d < DIRS; d++) {
      const d2 = (d + 1) % DIRS;
      polys.push([[cx, cy], rings[0][d], rings[0][d2]]);
      for (let ring = 0; ring < RINGS - 1; ring++) {
        polys.push([rings[ring][d], rings[ring][d2], rings[ring + 1][d2]]);
        polys.push([rings[ring][d], rings[ring + 1][d2], rings[ring + 1][d]]);
      }
    }
    return polys;
  }

  function shatterBuild(ov, mode) {
    const polys = shatterPolys();
    const s = svgEl(ov, '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"></svg>');
    const svgNode = s.querySelector('svg');
    const nodes = polys.map(function (p, i) {
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', p.map(function (q) { return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' '));
      const shade = i % 5 === 0 ? '#1D1913' : (i % 7 === 0 ? '#221E17' : INK);
      poly.setAttribute('fill', shade);
      poly.setAttribute('stroke', i % 9 === 0 ? RED : 'rgba(195,59,34,.25)');
      poly.setAttribute('stroke-width', '0.08');
      svgNode.appendChild(poly);
      /* centroid untuk asal rotasi & arah terbang */
      const ccx = (p[0][0] + p[1][0] + p[2][0]) / 3;
      const ccy = (p[0][1] + p[1][1] + p[2][1]) / 3;
      return { el: poly, cx: ccx, cy: ccy };
    });

    const tl = gsap.timeline();
    /* masuk: terbang dari luar ke posisi terakit (menutup layar) */
    nodes.forEach(function (n, i) {
      const dx = (n.cx - 50) * 2.6, dy = (n.cy - 52) * 2.6;
      gsap.set(n.el, { x: dx, y: dy, rotate: (i % 2 ? 24 : -18), transformOrigin: 'center center', opacity: 0, scale: 1.25 });
    });
    tl.call(function () { window.FXSound.whoosh(0.55, true); if (mode === 'shatter') window.FXSound.impact(0.9); });
    tl.to(nodes.map(function (n) { return n.el; }), {
      x: 0, y: 0, rotate: 0, scale: 1, opacity: 1,
      duration: 0.68, stagger: { each: 0.009, from: 'center' }, ease: 'power3.out'
    });
    tl.add(shake(ov, mode === 'shatter' ? 10 : 4, 0.32));
    tl.addLabel('mid');

    if (mode === 'shatter') {
      /* keluar: jatuh oleh gravitasi, berputar */
      tl.call(function () { window.FXSound.crumble(); }, null, 'mid+=0.1');
      nodes.forEach(function (n, i) {
        tl.to(n.el, {
          y: 220 + Math.random() * 60,
          x: (Math.random() - 0.5) * 60,
          rotate: (Math.random() - 0.5) * 90,
          duration: 0.68 + Math.random() * 0.3,
          ease: 'power2.in'
        }, 'mid+=' + (0.16 + i * 0.007));
      });
    } else {
      /* reassemble: tersedot ke satu titik lalu lenyap — konstruktif */
      tl.to(nodes.map(function (n) { return n.el; }), {
        scale: 0.02, x: function (i) { return (50 - nodes[i].cx) * 0.9; }, y: function (i) { return (52 - nodes[i].cy) * 0.9; },
        rotate: 12, opacity: 0.4,
        duration: 0.68, stagger: { each: 0.007, from: 'edges' }, ease: 'power3.in'
      }, 'mid+=0.2');
      tl.call(function () { window.FXSound.chime(); }, null, 'mid+=0.7');
    }
    return tl;
  }
  map['shatter'] = function (ov) { return shatterBuild(ov, 'shatter'); };
  map['shards-reassemble'] = function (ov) { return shatterBuild(ov, 'reassemble'); };

  /* ============ 17. COIN FLIP ============ */
  map['coin-flip'] = function (ov) {
    const wrap = div(ov, { left: 0, top: 0, width: '100%', height: '100%', perspective: '1400px' });
    const disc = document.createElement('div');
    Object.assign(disc.style, {
      position: 'absolute', left: '50%', top: '50%',
      width: '230vmax', height: '230vmax',
      marginLeft: '-115vmax', marginTop: '-115vmax',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 42% 38%, #F5F0E6 0%, ' + PAPER + ' 46%, #DCD1BD 78%, #C9BC9F 100%)',
      border: '3px solid ' + INK,
      boxShadow: 'inset 0 0 12vmax rgba(21,19,15,.18)',
      transform: 'rotateY(-178deg)'
    });
    /* gerigi koin */
    const teeth = document.createElement('div');
    Object.assign(teeth.style, { position: 'absolute', inset: '4vmax', borderRadius: '50%', border: '2px dashed rgba(21,19,15,.35)' });
    disc.appendChild(teeth);
    const core = document.createElement('div');
    Object.assign(core.style, { position: 'absolute', left: '50%', top: '50%', width: '26vmax', height: '26vmax', marginLeft: '-13vmax', marginTop: '-13vmax', borderRadius: '50%', border: '3px solid ' + RED, opacity: '.8' });
    disc.appendChild(core);
    wrap.appendChild(disc);

    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.75); });
    tl.to(disc, { rotateY: 0, duration: 0.78, ease: 'power2.inOut' });
    tl.addLabel('mid');
    tl.to(disc, { rotateY: 178, duration: 0.78, ease: 'power2.inOut' }, 'mid+=0.2');
    return tl;
  };

  /* ============ 18. DRAW LINE (rantai) ============ */
  map['draw-line'] = function (ov) {
    const s = svgEl(ov,
      '<svg viewBox="0 0 1000 600" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">' +
      '<path id="fxLine" d="M0,300 L1000,300" stroke="' + RED + '" stroke-width="9" fill="none"/>' +
      '<circle id="fxNode" cx="0" cy="300" r="16" fill="' + PAPER + '" stroke="' + INK + '" stroke-width="4"/>' +
      '</svg>');
    const line = s.querySelector('#fxLine');
    const node = s.querySelector('#fxNode');
    gsap.set(line, { drawSVG: 0 });
    const panel = div(ov, { left: 0, top: 0, width: '100%', height: '100%', background: PAPER, transform: 'scaleY(0)', transformOrigin: 'center center' });
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.pop(520); });
    tl.to(line, { drawSVG: '100%', duration: 0.6, ease: 'power2.inOut' });
    tl.to(node, { attr: { cx: 1000 }, duration: 0.6, ease: 'power2.inOut' }, 0);
    tl.to(panel, { scaleY: 1, duration: 0.52, ease: 'power3.inOut' }, 0.4);
    tl.to(s, { opacity: 0, duration: 0.2 }, 0.75);
    tl.addLabel('mid', 0.95);
    tl.to(panel, { scaleY: 0, transformOrigin: 'center top', duration: 0.6, ease: 'power3.inOut' }, 'mid+=0.2');
    return tl;
  };

  /* ============ 19. BLUEPRINT UNFOLD ============ */
  map['blueprint-unfold'] = function (ov) {
    const panel = div(ov, {
      left: 0, top: 0, width: '100%', height: '100%',
      background:
        'repeating-linear-gradient(90deg, rgba(21,19,15,.10) 0 1px, transparent 1px 56px),' +
        'repeating-linear-gradient(0deg, rgba(21,19,15,.10) 0 1px, transparent 1px 56px),' +
        'linear-gradient(160deg,' + PAPER + ',#E4DBC9)',
      borderTop: '4px solid ' + RED,
      transform: 'scale(0.04) rotate(-3deg)', transformOrigin: 'left top', opacity: 0
    });
    const mark = div(ov, {
      right: '6vw', bottom: '8vh', width: '180px', height: '90px',
      border: '2px solid ' + RED, opacity: 0, transform: 'rotate(-4deg)'
    });
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.65, false); });
    tl.to(panel, { opacity: 1, duration: 0.08 });
    tl.to(panel, { scale: 1, rotate: 0, duration: 0.72, ease: 'power3.out' }, 0);
    tl.fromTo(mark, { opacity: 0, scale: 1.6 }, { opacity: 0.9, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.52);
    tl.addLabel('mid');
    tl.to(mark, { opacity: 0, duration: 0.2 }, 'mid+=0.08');
    tl.to(panel, { scale: 0.04, rotate: 2.4, transformOrigin: 'right bottom', duration: 0.65, ease: 'power3.inOut' }, 'mid+=0.18');
    tl.to(panel, { opacity: 0, duration: 0.16 }, 'mid+=0.75');
    return tl;
  };

  /* ============ 20. MEASURE SWEEP (penggaris menyapu) ============ */
  map['measure-sweep'] = function (ov) {
    const panel = div(ov, {
      left: 0, top: 0, width: '100%', height: '100%',
      background:
        'repeating-linear-gradient(90deg, rgba(21,19,15,.3) 0 1px, transparent 1px 84px),' +
        'linear-gradient(180deg,' + PAPER + ' 88%, #DCD1BD)',
      borderBottom: '3px solid ' + RED,
      transform: 'translateY(-101%)'
    });
    const ticks = div(ov, {
      left: 0, top: 0, width: '100%', height: '26px',
      background: 'repeating-linear-gradient(90deg, rgba(21,19,15,.18) 0 1px, transparent 1px 14px)',
      transform: 'translateY(-101%)'
    });
    const tl = gsap.timeline();
    tl.call(function () { window.FXSound.whoosh(0.65, true); });
    tl.to(panel, { y: 0, duration: 0.68, ease: 'power3.inOut' });
    tl.to(ticks, { y: '100vh', duration: 0.68, ease: 'power3.inOut' }, 0);
    tl.addLabel('mid');
    tl.to(panel, { yPercent: 101, duration: 0.65, ease: 'power3.inOut' }, 'mid+=0.2');
    tl.to(ticks, { y: '200vh', duration: 0.65, ease: 'power3.inOut' }, 'mid+=0.2');
    return tl;
  };

  return map;
})();
