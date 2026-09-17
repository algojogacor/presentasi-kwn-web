/* ================================================================
   FX · SVG STAGE — "KOTA NEGARA"
   Satu lapisan SVG persisten di belakang semua slide.
   Path induk (siluet landscape) MORPH dari slide ke slide:
     horizon -> tunas -> kota kecil -> kota penuh -> kota miring
     -> reruntuhan -> kota dibangun ulang -> kota final
   Layer aksen (grid, retakan, pilar, cincin, koin, jembatan,
   blueprint) dinyalakan/dimatikan per config slide.
   Semua bentuk deterministik (seeded RNG) supaya konsisten.
   ================================================================ */
window.FXSvg = (function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1600, H = 900;
  const GROUND = 810;

  let svg, master, layers = {}, built = false;
  let currentSil = null;
  let morphTl = null;

  /* --- RNG deterministik --- */
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function mk(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ================================================================
     SILUET — semuanya path tertutup dari kiri bawah ke kanan bawah
     ================================================================ */
  const SILS = {};

  // 1. HORIZON (Soft natural hills)
  SILS.horizon = function () {
    let d = 'M0,' + GROUND;
    for (let x = 0; x <= W; x += 15) {
      const y = GROUND - 12 - 22 * Math.sin(x / W * Math.PI) - 8 * Math.sin(x / 180) - 4 * Math.cos(x / 75) - 2 * Math.sin(x / 25);
      d += ' L' + x + ',' + y.toFixed(1);
    }
    return d + ' L' + W + ',' + H + ' L0,' + H + ' Z';
  };

  // 2. SPROUT (Early civilization, Nusantara roofs, stilts)
  SILS.sprout = function () {
    const r = rng(101);
    let d = 'M0,' + GROUND;
    let x = 0;
    while (x < W) {
      const gap = 15 + r() * 30;
      x += gap;
      if (x > W - 20) break;
      const groundY = GROUND - 5 - 10 * Math.sin(x / W * Math.PI);
      d += ' L' + x.toFixed(1) + ',' + groundY.toFixed(1);
      if (r() > 0.4 && x > 80 && x < W - 80) {
        const w = 20 + r() * 30, h = 15 + r() * 25;
        d += ' L' + x.toFixed(1) + ',' + (groundY - 8).toFixed(1);
        d += ' L' + (x + 4).toFixed(1) + ',' + (groundY - 8).toFixed(1);
        d += ' L' + (x + 4).toFixed(1) + ',' + (groundY - h).toFixed(1);
        d += ' L' + (x - 6).toFixed(1) + ',' + (groundY - h + 4).toFixed(1);
        d += ' Q' + (x + w / 2).toFixed(1) + ',' + (groundY - h - 15 - r() * 10).toFixed(1) + ' ' + (x + w / 2).toFixed(1) + ',' + (groundY - h - 20).toFixed(1);
        d += ' Q' + (x + w / 2).toFixed(1) + ',' + (groundY - h - 15).toFixed(1) + ' ' + (x + w + 6).toFixed(1) + ',' + (groundY - h + 4).toFixed(1);
        d += ' L' + (x + w - 4).toFixed(1) + ',' + (groundY - h).toFixed(1);
        d += ' L' + (x + w - 4).toFixed(1) + ',' + (groundY - 8).toFixed(1);
        d += ' L' + (x + w).toFixed(1) + ',' + (groundY - 8).toFixed(1);
        d += ' L' + (x + w).toFixed(1) + ',' + groundY.toFixed(1);
        x += w;
      }
    }
    return d + ' L' + W + ',' + GROUND + ' L' + W + ',' + H + ' L0,' + H + ' Z';
  };

  // Base skyline builder for architectural eras
  function buildSkyline(seed, minH, maxH, styleOpts) {
    const r = rng(seed);
    let d = 'M0,' + GROUND;
    let x = -10;
    const tilt = styleOpts.tilt || 0, ruins = styleOpts.ruins || 0;
    const isModern = styleOpts.isModern || false, isFuture = styleOpts.isFuture || false, isRebuild = styleOpts.isRebuild || false;

    while (x < W + 10) {
      const gap = ruins > 0 ? (2 + r() * 15) : (1 + r() * 10);
      x += gap;
      if (x > W + 20) break;
      let w = 30 + r() * 70;
      if (isModern || isFuture) w += 20 + r() * 60;
      const cx = Math.abs(x - W * 0.55) / (W * 0.5);
      let h = minH + r() * (maxH - minH);
      h *= (1.4 - cx * 0.7);
      if (h < minH * 0.5) h = minH * 0.5;
      const topY = GROUND - h, t = (r() - 0.5) * tilt;

      if (ruins > 0) {
        d += ' L' + x.toFixed(1) + ',' + GROUND;
        const leftBreak = topY + h * (0.3 + 0.6 * r());
        d += ' L' + (x + t).toFixed(1) + ',' + leftBreak.toFixed(1);
        const jagged = 3 + Math.floor(r() * 5);
        for (let j = 1; j <= jagged; j++) {
          d += ' L' + (x + (w * j) / jagged + t).toFixed(1) + ',' + (topY + h * (0.2 + 0.7 * r())).toFixed(1);
        }
        const rightBreak = topY + h * (0.3 + 0.6 * r());
        d += ' L' + (x + w + t).toFixed(1) + ',' + rightBreak.toFixed(1);
        if (r() > 0.7) {
          d += ' L' + (x + w + t).toFixed(1) + ',' + (rightBreak - 20 - r() * 30).toFixed(1);
          d += ' L' + (x + w + t + 2).toFixed(1) + ',' + (rightBreak - 20).toFixed(1);
          d += ' L' + (x + w + t + 2).toFixed(1) + ',' + rightBreak.toFixed(1);
        }
        d += ' L' + (x + w).toFixed(1) + ',' + GROUND;
      } else if (isRebuild) {
        d += ' L' + x.toFixed(1) + ',' + GROUND;
        if (r() > 0.6) {
          const cx_pos = x + w / 2, cy_top = topY - 50 - r() * 60;
          d += ' L' + (cx_pos - 4).toFixed(1) + ',' + GROUND;
          d += ' L' + (cx_pos - 4).toFixed(1) + ',' + cy_top.toFixed(1);
          d += ' L' + (cx_pos - 30).toFixed(1) + ',' + cy_top.toFixed(1);
          d += ' L' + (cx_pos - 30).toFixed(1) + ',' + (cy_top - 6).toFixed(1);
          d += ' L' + cx_pos.toFixed(1) + ',' + (cy_top - 16).toFixed(1);
          d += ' L' + (cx_pos + 60 + r() * 40).toFixed(1) + ',' + (cy_top - 6).toFixed(1);
          d += ' L' + (cx_pos + 60).toFixed(1) + ',' + cy_top.toFixed(1);
          d += ' L' + (cx_pos + 4).toFixed(1) + ',' + cy_top.toFixed(1);
          d += ' L' + (cx_pos + 4).toFixed(1) + ',' + GROUND;
        } else {
          d += ' L' + x.toFixed(1) + ',' + topY.toFixed(1);
          const floors = 3 + Math.floor(r() * 4);
          for (let f = 1; f < floors; f++) {
            const fy = topY + (h / floors) * f;
            d += ' L' + (x + w * 0.2).toFixed(1) + ',' + fy.toFixed(1);
            d += ' L' + (x + w * 0.2).toFixed(1) + ',' + (fy + 4).toFixed(1);
            d += ' L' + x.toFixed(1) + ',' + (fy + 4).toFixed(1);
          }
          d += ' L' + (x + w).toFixed(1) + ',' + topY.toFixed(1);
          d += ' L' + (x + w).toFixed(1) + ',' + GROUND;
        }
      } else {
        d += ' L' + x.toFixed(1) + ',' + GROUND;
        d += ' L' + (x + t).toFixed(1) + ',' + topY.toFixed(1);
        const kind = r();
        if (isFuture) {
          if (kind > 0.85) {
            d += ' L' + (x + w / 2 + t).toFixed(1) + ',' + (topY - w / 3).toFixed(1);
            d += ' Q' + (x + w + t * 2).toFixed(1) + ',' + (topY - w / 4).toFixed(1) + ' ' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          } else if (kind > 0.6) {
            d += ' Q' + (x + w / 2 + t).toFixed(1) + ',' + (topY - 60).toFixed(1) + ' ' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          } else if (kind > 0.3) {
            const bw = w * 0.3;
            d += ' L' + (x + bw + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + bw + t).toFixed(1) + ',' + (topY + h * 0.2).toFixed(1);
            d += ' L' + (x + w - bw + t).toFixed(1) + ',' + (topY + h * 0.2).toFixed(1);
            d += ' L' + (x + w - bw + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          } else {
            d += ' L' + (x + w * 0.2 + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w * 0.2 + t).toFixed(1) + ',' + (topY - 20).toFixed(1);
            d += ' L' + (x + w * 0.8 + t).toFixed(1) + ',' + (topY - 20).toFixed(1);
            d += ' L' + (x + w * 0.8 + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          }
        } else if (isModern) {
          if (kind > 0.9) {
            const mid = x + w / 2 + t;
            d += ' L' + (mid - 6).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (mid - 2).toFixed(1) + ',' + (topY - 40).toFixed(1);
            d += ' L' + (mid - 12).toFixed(1) + ',' + (topY - 40).toFixed(1);
            d += ' L' + (mid - 12).toFixed(1) + ',' + (topY - 44).toFixed(1);
            d += ' L' + (mid - 1).toFixed(1) + ',' + (topY - 44).toFixed(1);
            d += ' L' + mid.toFixed(1) + ',' + (topY - 80).toFixed(1);
            d += ' L' + (mid + 1).toFixed(1) + ',' + (topY - 44).toFixed(1);
            d += ' L' + (mid + 12).toFixed(1) + ',' + (topY - 44).toFixed(1);
            d += ' L' + (mid + 12).toFixed(1) + ',' + (topY - 40).toFixed(1);
            d += ' L' + (mid + 2).toFixed(1) + ',' + (topY - 40).toFixed(1);
            d += ' L' + (mid + 6).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          } else if (kind > 0.7) {
            d += ' L' + (x + w * 0.1 + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w * 0.1 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
            d += ' L' + (x + w * 0.25 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
            d += ' L' + (x + w * 0.25 + t).toFixed(1) + ',' + (topY - 35).toFixed(1);
            d += ' L' + (x + w * 0.45 + t).toFixed(1) + ',' + (topY - 35).toFixed(1);
            d += ' L' + (x + w * 0.5 + t).toFixed(1) + ',' + (topY - 70).toFixed(1);
            d += ' L' + (x + w * 0.55 + t).toFixed(1) + ',' + (topY - 35).toFixed(1);
            d += ' L' + (x + w * 0.75 + t).toFixed(1) + ',' + (topY - 35).toFixed(1);
            d += ' L' + (x + w * 0.75 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
            d += ' L' + (x + w * 0.9 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
            d += ' L' + (x + w * 0.9 + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          } else if (kind > 0.4) {
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
            for (let n = 1; n <= 3; n++) {
               const ny = topY + (h * 0.3 * n) / 3;
               d += ' L' + (x + w + t * 2).toFixed(1) + ',' + ny.toFixed(1);
               d += ' L' + (x + w - 4 + t * 2).toFixed(1) + ',' + ny.toFixed(1);
               d += ' L' + (x + w - 4 + t * 2).toFixed(1) + ',' + (ny + 4).toFixed(1);
               d += ' L' + (x + w + t * 2).toFixed(1) + ',' + (ny + 4).toFixed(1);
            }
          } else {
             d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          }
        } else {
          if (kind > 0.85) {
            const mid = x + w / 2 + t;
            d += ' L' + (mid - 15).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (mid - 15).toFixed(1) + ',' + (topY - 30).toFixed(1);
            d += ' L' + (mid - 18).toFixed(1) + ',' + (topY - 30).toFixed(1);
            d += ' L' + mid.toFixed(1) + ',' + (topY - 55).toFixed(1);
            d += ' L' + (mid + 18).toFixed(1) + ',' + (topY - 30).toFixed(1);
            d += ' L' + (mid + 15).toFixed(1) + ',' + (topY - 30).toFixed(1);
            d += ' L' + (mid + 15).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          } else if (kind > 0.65) {
            d += ' L' + (x + w / 2 + t).toFixed(1) + ',' + (topY - 20 - r() * 15).toFixed(1);
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          } else if (kind > 0.4) {
            d += ' L' + (x + w * 0.3 + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w * 0.3 + t).toFixed(1) + ',' + (topY - 25).toFixed(1);
            d += ' L' + (x + w * 0.4 + t).toFixed(1) + ',' + (topY - 25).toFixed(1);
            d += ' L' + (x + w * 0.4 + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w * 0.7 + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w * 0.7 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
            d += ' L' + (x + w * 0.8 + t).toFixed(1) + ',' + (topY - 15).toFixed(1);
            d += ' L' + (x + w * 0.8 + t).toFixed(1) + ',' + topY.toFixed(1);
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          } else {
            d += ' L' + (x + w + t * 2).toFixed(1) + ',' + topY.toFixed(1);
          }
        }

        d += ' L' + (x + w + t * 2).toFixed(1) + ',' + GROUND;
      }
      x += w;
    }
    d += ' L' + (W + 40) + ',' + GROUND + ' L' + (W + 40) + ',' + H + ' L-40,' + H + ' L-40,' + GROUND + ' Z';
    return d;
  }

  SILS['skyline-small'] = function () { return buildSkyline(42, 35, 130, { isModern: false }); };
  SILS['skyline-full']  = function () { return buildSkyline(105, 60, 270, { isModern: true }); };
  SILS['skyline-tilt']  = function () { return buildSkyline(105, 60, 270, { isModern: true, tilt: 18 }); };
  SILS.ruins           = function () { return buildSkyline(105, 25, 200, { ruins: 1 }); };
  SILS.rebuild         = function () { return buildSkyline(204, 55, 250, { isRebuild: true }); };
  SILS['city-final']   = function () { return buildSkyline(308, 75, 310, { isFuture: true }); };

  /* ================================================================
     LAYER AKSEN
     ================================================================ */
  const gridLines = [];

  function buildGrid(g) {
    const cols = 16, rows = 8;
    const x0 = 80, x1 = W - 80, y0 = 150, y1 = GROUND - 20;
    for (let i = 0; i <= cols; i++) {
      const x = x0 + (x1 - x0) * (i / cols);
      const ln = mk('line', { x1: x, y1: y0, x2: x, y2: y1, class: 'sv-grid-v' }, g);
      gridLines.push({ el: ln, x: x, i: i });
    }
    for (let j = 0; j <= rows; j++) {
      const y = y0 + (y1 - y0) * (j / rows);
      mk('line', { x1: x0, y1: y, x2: x1, y2: y, class: 'sv-grid-h' }, g);
    }
    /* tanda silang di beberapa persimpangan */
    const r = rng(9);
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        if (r() > 0.88) {
          const x = x0 + (x1 - x0) * (i / cols), y = y0 + (y1 - y0) * (j / rows);
          mk('path', { d: 'M' + (x - 5) + ',' + y + ' H' + (x + 5) + ' M' + x + ',' + (y - 5) + ' V' + (y + 5), class: 'sv-grid-cross' }, g);
        }
      }
    }
    g.__x0 = x0; g.__x1 = x1; g.__y0 = y0; g.__y1 = y1; g.__cols = cols;
  }

  function buildCracks(g) {
    const r = rng(31);
    for (let c = 0; c < 6; c++) {
      const sx = 200 + r() * (W - 400), sy = 40 + r() * 160;
      let d = 'M' + sx.toFixed(0) + ',' + sy.toFixed(0);
      let x = sx, y = sy;
      const n = 5 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        x += (r() - 0.5) * 160;
        y += 50 + r() * 120;
        if (y > GROUND) y = GROUND;
        d += ' L' + x.toFixed(0) + ',' + y.toFixed(0);
      }
      mk('path', { d: d, class: 'sv-crack' }, g);
      /* cabang kecil */
      if (r() > 0.4) {
        const bx = sx + (r() - 0.5) * 120, by = sy + 120 + r() * 200;
        mk('path', { d: 'M' + bx.toFixed(0) + ',' + by.toFixed(0) + ' l' + (40 + r() * 70).toFixed(0) + ',' + (30 + r() * 60).toFixed(0), class: 'sv-crack-thin' }, g);
      }
    }
  }

  function buildPillars(g) {
    const xs = [380, 780, 1180];
    xs.forEach(function (x, i) {
      const w = 86, top = 300, base = GROUND;
      mk('rect', { x: x - w / 2, y: top + 24, width: w, height: base - top - 24, class: 'sv-pillar' }, g);
      mk('rect', { x: x - w / 2 - 16, y: top, width: w + 32, height: 24, class: 'sv-pillar-cap' }, g);
      mk('rect', { x: x - w / 2 - 22, y: base - 14, width: w + 44, height: 14, class: 'sv-pillar-base' }, g);
      /* garis alur pilar */
      for (let k = 1; k < 4; k++) {
        mk('line', { x1: x - w / 2 + (w * k) / 4, y1: top + 34, x2: x - w / 2 + (w * k) / 4, y2: base - 22, class: 'sv-pillar-flute' }, g);
      }
    });
    /* balok atap yang disangga */
    mk('rect', { x: 260, y: top_(), width: 1080, height: 16, class: 'sv-pillar-cap' }, g);
    function top_() { return 276; }
  }

  function buildRings(g) {
    const cx = 1180, cy = 430;
    [210, 150, 92, 40].forEach(function (r0, i) {
      mk('circle', { cx: cx, cy: cy, r: r0, class: i === 3 ? 'sv-ring-core' : 'sv-ring' }, g);
    });
    for (let a = 0; a < 12; a++) {
      const th = (a / 12) * Math.PI * 2;
      mk('line', {
        x1: cx + Math.cos(th) * 210, y1: cy + Math.sin(th) * 210,
        x2: cx + Math.cos(th) * 226, y2: cy + Math.sin(th) * 226,
        class: 'sv-ring-tick'
      }, g);
    }
  }

  function buildCoin(g) {
    const cx = 800, cy = 420, r0 = 240;
    mk('circle', { cx: cx, cy: cy, r: r0, class: 'sv-coin-edge' }, g);
    mk('circle', { cx: cx, cy: cy, r: r0 - 18, class: 'sv-coin-inner' }, g);
    mk('path', { d: 'M' + cx + ',' + (cy - r0 + 18) + ' A' + (r0 - 18) + ',' + (r0 - 18) + ' 0 0 0 ' + cx + ',' + (cy + r0 - 18) + ' Z', class: 'sv-coin-half-l' }, g);
    mk('path', { d: 'M' + cx + ',' + (cy - r0 + 18) + ' A' + (r0 - 18) + ',' + (r0 - 18) + ' 0 0 1 ' + cx + ',' + (cy + r0 - 18) + ' Z', class: 'sv-coin-half-r' }, g);
    mk('line', { x1: cx, y1: cy - r0 + 6, x2: cx, y2: cy + r0 - 6, class: 'sv-coin-seam' }, g);
    /* gerigi tepi koin */
    for (let a = 0; a < 36; a++) {
      const th = (a / 36) * Math.PI * 2;
      mk('line', {
        x1: cx + Math.cos(th) * (r0 - 8), y1: cy + Math.sin(th) * (r0 - 8),
        x2: cx + Math.cos(th) * r0, y2: cy + Math.sin(th) * r0,
        class: 'sv-coin-tooth'
      }, g);
    }
    g.__cx = cx; g.__cy = cy;
  }

  function buildBridge(g) {
    /* rantai/jembatan: kabel utama + 5 menara + dek */
    const y = 470, x0 = 140, x1 = 1460;
    mk('path', { d: 'M' + x0 + ',' + y + ' L' + x1 + ',' + y, class: 'sv-bridge-deck' }, g);
    let cable = 'M' + x0 + ',' + (y - 30);
    const xs = [];
    for (let i = 0; i <= 5; i++) {
      const x = x0 + ((x1 - x0) * i) / 5;
      xs.push(x);
      const h = i % 2 === 0 ? 150 : 210;
      mk('rect', { x: x - 8, y: y - h, width: 16, height: h, class: 'sv-bridge-tower' }, g);
      mk('line', { x1: x, y1: y - h, x2: x, y2: y, class: 'sv-bridge-hanger' }, g);
      cable += ' Q' + (x + (x1 - x0) / 10) + ',' + (y - h + 90) + ' ' + (i < 5 ? x + (x1 - x0) / 5 : x) + ',' + (i < 5 ? y - (i % 2 === 0 ? 150 : 210) : y - 30);
    }
    mk('path', { d: cable, class: 'sv-bridge-cable' }, g);
    g.__deckY = y;
  }

  function buildBlueprint(g) {
    const r = rng(77);
    /* grid blueprint rapat + marka dimensi */
    for (let x = 100; x < W - 60; x += 70) {
      mk('line', { x1: x, y1: 220, x2: x, y2: GROUND - 10, class: 'sv-bp-line' }, g);
    }
    for (let y = 220; y < GROUND; y += 70) {
      mk('line', { x1: 100, y1: y, x2: W - 60, y2: y, class: 'sv-bp-line' }, g);
    }
    /* kotak rencana bangunan */
    for (let i = 0; i < 7; i++) {
      const x = 140 + i * 195 + r() * 40, w = 90 + r() * 70, h = 90 + r() * 180;
      mk('rect', { x: x, y: GROUND - h, width: w, height: h, class: 'sv-bp-box' }, g);
      mk('line', { x1: x, y1: GROUND - h, x2: x + w, y2: GROUND, class: 'sv-bp-x' }, g);
      mk('line', { x1: x + w, y1: GROUND - h, x2: x, y2: GROUND, class: 'sv-bp-x' }, g);
    }
  }

  function buildIcons(g) {
    /* ikon layanan publik tumbuh dari kota: sekolah(+), rumah sakit(+), jalan.
       Duduk DI ATAS garis skyline, bukan di zona teks konten. */
    const items = [
      { x: 430, y: 668, kind: 'school' },
      { x: 820, y: 648, kind: 'health' },
      { x: 1210, y: 678, kind: 'road' }
    ];
    items.forEach(function (it) {
      const gg = mk('g', { class: 'sv-icon sv-icon-' + it.kind, transform: 'translate(' + it.x + ',' + it.y + ')' }, g);
      mk('circle', { cx: 0, cy: 0, r: 36, class: 'sv-icon-ring' }, gg);
      if (it.kind === 'school') {
        mk('path', { d: 'M-18,7 L0,-11 L18,7 M-13,7 V18 H13 V7', class: 'sv-icon-glyph' }, gg);
      } else if (it.kind === 'health') {
        mk('path', { d: 'M-5,-13 H5 V-5 H13 V5 H5 V13 H-5 V5 H-13 V-5 H-5 Z', class: 'sv-icon-glyph' }, gg);
      } else {
        mk('path', { d: 'M-15,16 L-5,-15 M15,16 L5,-15 M0,-8 V-2 M0,5 V11', class: 'sv-icon-glyph' }, gg);
      }
    });
  }

  const LAYER_DEFS = {
    grid:      buildGrid,
    cracks:    buildCracks,
    pillars:   buildPillars,
    rings:     buildRings,
    coin:      buildCoin,
    bridge:    buildBridge,
    blueprint: buildBlueprint,
    icons:     buildIcons
  };

  /* ================================================================
     BUILD PANGGUNG
     ================================================================ */
  function build() {
    if (built) return;
    built = true;
    svg = document.getElementById('svgStage');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');

    /* Isian siluet memudar ke nol menjelang dasar layar: zona footer
       (teks kecil --muted) harus tetap duduk di atas kertas bersih,
       sesuai anggaran kontras deck ini. */
    const defs = mk('defs', {}, svg);
    const grad = mk('linearGradient', {
      id: 'svFill', gradientUnits: 'userSpaceOnUse',
      x1: 0, y1: 340, x2: 0, y2: 900
    }, defs);
    mk('stop', { offset: '0', 'stop-color': 'rgba(21,19,15,.085)' }, grad);
    mk('stop', { offset: '0.55', 'stop-color': 'rgba(21,19,15,.05)' }, grad);
    mk('stop', { offset: '1', 'stop-color': 'rgba(21,19,15,0)' }, grad);

    master = mk('path', { id: 'svMaster', d: SILS.horizon(), class: 'sv-master' }, svg);

    /* matahari/stempel vermilion kecil — satu-satunya aksen warna */
    const sun = mk('g', { id: 'svSun' }, svg);
    mk('circle', { cx: 1280, cy: 210, r: 52, class: 'sv-sun' }, sun);
    mk('circle', { cx: 1280, cy: 210, r: 66, class: 'sv-sun-ring' }, sun);

    for (const name in LAYER_DEFS) {
      const g = mk('g', { id: 'svL-' + name, class: 'sv-layer', opacity: 0 }, svg);
      LAYER_DEFS[name](g);
      layers[name] = g;
    }
    currentSil = 'horizon';
  }

  /* ================================================================
     API
     ================================================================ */
  let activeLayers = [];

  function apply(cfg, opts) {
    build();
    opts = opts || {};
    cfg = cfg || {};
    const sil = cfg.silhouette || 'horizon';
    const want = cfg.layers || [];

    /* 1. morph siluet */
    if (sil !== currentSil) {
      currentSil = sil;
      if (morphTl) morphTl.kill();
      if (opts.immediate) {
        master.setAttribute('d', SILS[sil]());
      } else {
        morphTl = gsap.timeline();
        morphTl.to(master, {
          morphSVG: { shape: SILS[sil]() },
          duration: 1.5,
          ease: 'power2.inOut'
        });
      }
    }

    /* 2. layer aksen */
    want.forEach(function (name) {
      const g = layers[name];
      if (!g || activeLayers.indexOf(name) >= 0) return;
      activeLayers.push(name);
      g.classList.add('on');
      gsap.killTweensOf(g);
      gsap.to(g, { opacity: LAYER_OP[name] || 1, duration: 0.9, ease: 'power2.out' });
      animLayerIn(name, g);
    });
    activeLayers.slice().forEach(function (name) {
      if (want.indexOf(name) >= 0) return;
      activeLayers.splice(activeLayers.indexOf(name), 1);
      const g = layers[name];
      gsap.killTweensOf(g);
      gsap.to(g, {
        opacity: 0, duration: 0.55, ease: 'power2.in',
        onComplete: function () { g.classList.remove('on'); }
      });
    });
  }

  const LAYER_OP = { grid: 0.5, cracks: 0.75, pillars: 0.6, rings: 0.65, coin: 0.8, bridge: 0.6, blueprint: 0.5, icons: 0.85 };

  function animLayerIn(name, g) {
    if (name === 'grid' || name === 'blueprint') {
      gsap.fromTo(g.querySelectorAll('line'),
        { attr: name === 'grid' ? {} : {}, drawSVG: 0 },
        { drawSVG: '100%', duration: 1.1, stagger: 0.012, ease: 'power2.out' });
    }
    if (name === 'cracks') {
      gsap.fromTo(g.querySelectorAll('path'),
        { drawSVG: 0 },
        { drawSVG: '100%', duration: 1.4, stagger: 0.14, ease: 'power3.in' });
    }
    if (name === 'pillars') {
      gsap.from(g.querySelectorAll('rect'), {
        scaleY: 0, transformOrigin: 'center bottom',
        duration: 1.0, stagger: 0.07, ease: 'power3.out'
      });
    }
    if (name === 'rings') {
      gsap.from(g.querySelectorAll('circle'), {
        scale: 0, transformOrigin: 'center center', transformBox: 'fill-box',
        duration: 0.9, stagger: 0.1, ease: 'back.out(2)'
      });
    }
    if (name === 'coin') {
      gsap.from(g, { scale: 0.4, rotation: -90, transformOrigin: '800px 420px', duration: 1.3, ease: 'power3.out' });
    }
    if (name === 'bridge') {
      gsap.fromTo(g.querySelectorAll('.sv-bridge-deck,.sv-bridge-cable'),
        { drawSVG: 0 }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' });
      gsap.from(g.querySelectorAll('.sv-bridge-tower'), {
        scaleY: 0, transformOrigin: 'center bottom', duration: 0.8, stagger: 0.1, ease: 'back.out(1.6)'
      });
    }
    if (name === 'icons') {
      gsap.from(g.querySelectorAll('.sv-icon'), {
        scale: 0, transformOrigin: 'center center', transformBox: 'fill-box',
        duration: 0.8, stagger: 0.18, ease: 'back.out(2.2)'
      });
    }
  }

  /* Ripple grid saat bar chart slide 06 tumbuh.
     i = indeks bar (0..n-1), n = jumlah bar, v = nilai (0..25) */
  function gridPulse(i, n, v) {
    const g = layers.grid;
    if (!g || !g.classList.contains('on')) return;
    const x0 = g.__x0, x1 = g.__x1, y0 = g.__y0, y1 = g.__y1;
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n;
    const y = y1 - ((y1 - y0) * Math.min(v, 25)) / 25;

    /* garis vertikal terdekat tersentak */
    let nearest = null, nd = Infinity;
    gridLines.forEach(function (L) {
      const d = Math.abs(L.x - x);
      if (d < nd) { nd = d; nearest = L.el; }
    });
    if (nearest) {
      gsap.fromTo(nearest, { stroke: 'rgba(195,59,34,.85)' },
        { stroke: 'rgba(21,19,15,.22)', duration: 1.2, ease: 'power2.out', overwrite: 'auto' });
    }
    /* ripple lingkaran di koordinat (x,y) */
    for (let k = 0; k < 2; k++) {
      const c = mk('circle', { cx: x, cy: y, r: 6, class: 'sv-ripple' }, g);
      gsap.to(c, {
        attr: { r: 90 + k * 50 }, opacity: 0,
        duration: 1.5 + k * 0.3, delay: k * 0.12, ease: 'power2.out',
        onComplete: function () { c.remove(); }
      });
    }
    /* denyut titik koordinat */
    const dot = mk('circle', { cx: x, cy: y, r: 4, class: 'sv-ripple-dot' }, g);
    gsap.to(dot, { opacity: 0, duration: 1.4, delay: 0.5, ease: 'power2.in', onComplete: function () { dot.remove(); } });
  }

  /* Koin berputar mengikuti mouse (slide 17) */
  function coinTilt(rx, ry) {
    const g = layers.coin;
    if (!g) return;
    gsap.set(g, { rotateY: ry * 24, rotateX: rx * 14, transformOrigin: '800px 420px' });
  }

  /* Parallax mouse — tiga kedalaman */
  let pxq = null, pyq = null;
  function initParallax() {
    pxq = { x: gsap.quickTo(svg, 'x', { duration: 0.9, ease: 'power3' }) };
    const sun = svg.querySelector('#svSun');
    pxq.sun = gsap.quickTo(sun, 'x', { duration: 1.3, ease: 'power3' });
    window.addEventListener('mousemove', function (e) {
      const nx = (e.clientX / window.innerWidth - 0.5);
      const ny = (e.clientY / window.innerHeight - 0.5);
      pxq.x(nx * -26);
      pxq.sun(nx * -46);
      pxq.sunY = pxq.sunY || gsap.quickTo(svg.querySelector('#svSun'), 'y', { duration: 1.3, ease: 'power3' });
      pxq.sunY(ny * -22);
    }, { passive: true });
  }

  return {
    build: build,
    apply: apply,
    gridPulse: gridPulse,
    coinTilt: coinTilt,
    initParallax: initParallax,
    get master() { return master; },
    get svg() { return svg; },
    SILS: SILS
  };
})();
