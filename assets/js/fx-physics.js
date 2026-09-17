/* ================================================================
   FX · PHYSICS — reruntuhan kota slide 16
   Simulasi 2D nyata: tiap shard punya massa (∝ luas), gravitasi,
   restitusi (bounce) berbeda, gesekan, dan momentum sudut.
   Shard pecah dari siluet gedung, terlontar dari titik episentrum,
   jatuh, memantul di lantai, berguling, lalu mengendap.
   Debu partikel menyertai. Canvas 2D — ringan & presisi.
   ================================================================ */
window.FXPhysics = (function () {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Warna puing: kertas/tinta, sesekali tepi vermilion */
  const FILLS = ['#E8E0D1', '#DCD1BD', '#D8CFBA', '#CFC4AC', '#E3DAC8', '#2A2620', '#3A352C'];

  function start(container, opts) {
    opts = opts || {};
    const rand = rng(opts.seed || 4242);

    const canvas = document.createElement('canvas');
    canvas.className = 'shard-canvas';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let Wp = 0, Hp = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      Wp = container.clientWidth;
      Hp = container.clientHeight;
      canvas.width = Wp * DPR;
      canvas.height = Hp * DPR;
      canvas.style.width = Wp + 'px';
      canvas.style.height = Hp + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    /* lantai = di ATAS zona footer: tumpukan puing tidak boleh menutupi
       teks atribusi sumber di kaki slide */
    const FLOOR = Hp - Math.max(96, Hp * 0.13);
    const G = 1750;                 /* px/s^2 */
    const shards = [];
    const dust = [];

    /* --- susun gedung lalu pecah jadi fragmen --- */
    const buildings = [];
    let bx = -10;
    while (bx < Wp + 10) {
      const w = 44 + rand() * 100;
      const cxr = Math.abs(bx - Wp * 0.6) / Wp;
      let h = (60 + rand() * 230) * (Hp / 800) * (1.3 - cxr * 0.5);
      buildings.push({ x: bx, w: w, h: h });
      bx += w + 4 + rand() * 22;
    }

    buildings.forEach(function (b) {
      const topY = FLOOR - b.h;
      const cols = 2 + Math.floor(rand() * 2);
      const rows = Math.max(2, Math.round(b.h / 60));
      /* garis potong berjitter */
      const xs = [b.x];
      for (let c = 1; c < cols; c++) xs.push(b.x + (b.w * c) / cols + (rand() - 0.5) * b.w * 0.22);
      xs.push(b.x + b.w);
      const ys = [topY];
      for (let rr = 1; rr < rows; rr++) ys.push(topY + (b.h * rr) / rows + (rand() - 0.5) * 16);
      ys.push(FLOOR);

      for (let c = 0; c < cols; c++) {
        for (let rr = 0; rr < rows; rr++) {
          const x0 = xs[c], x1 = xs[c + 1], y0 = ys[rr], y1 = ys[rr + 1];
          const j = function () { return (rand() - 0.5) * 9; };
          const verts = [
            [x0 + j(), y0 + j()], [x1 + j(), y0 + j()],
            [x1 + j(), y1 + j()], [x0 + j(), y1 + j()]
          ];
          /* centroid */
          let cx = 0, cy = 0;
          verts.forEach(function (v) { cx += v[0]; cy += v[1]; });
          cx /= 4; cy /= 4;
          const area = Math.abs((x1 - x0) * (y1 - y0));
          const local = verts.map(function (v) { return [v[0] - cx, v[1] - cy]; });
          let maxR = 0;
          local.forEach(function (v) { maxR = Math.max(maxR, Math.hypot(v[0], v[1])); });

          const mass = area / 2600;                     /* massa ∝ luas */
          const heavy = mass > 3.2;
          shards.push({
            x: cx, y: cy,
            vx: 0, vy: 0,
            ang: 0,
            angVel: 0,
            mass: mass,
            maxR: maxR,
            /* benda berat: pantulan kecil, berat mati. benda ringan: memantul liar */
            rest: heavy ? 0.12 + rand() * 0.14 : 0.28 + rand() * 0.34,
            fric: 0.78 + rand() * 0.14,
            fill: FILLS[Math.floor(rand() * FILLS.length)],
            edge: rand() < 0.09 ? '#C33B22' : 'rgba(21,19,15,.55)',
            verts: local,
            sleep: false,
            spawned: false
          });
        }
      }
    });

    let raf = 0, disposed = false, exploded = false, settledCount = 0;
    let last = performance.now();
    let epicenter = { x: Wp * 0.62, y: FLOOR - Hp * 0.22 };
    if (opts.epicenter) epicenter = opts.epicenter(Wp, Hp, FLOOR);

    /* --- gambar shard utuh di posisi awal (menunggu ledakan) --- */
    function drawShard(s) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.ang);
      ctx.beginPath();
      ctx.moveTo(s.verts[0][0], s.verts[0][1]);
      for (let i = 1; i < s.verts.length; i++) ctx.lineTo(s.verts[i][0], s.verts[i][1]);
      ctx.closePath();
      ctx.fillStyle = s.fill;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = s.edge;
      ctx.stroke();
      ctx.restore();
    }

    function drawDust() {
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.life -= d.decay;
        if (d.life <= 0) { dust.splice(i, 1); continue; }
        d.x += d.vx; d.y += d.vy;
        d.vy -= 0.02;                 /* debu naik perlahan */
        d.vx *= 0.985; d.vy *= 0.985;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(58,53,44,' + (d.life * 0.28).toFixed(3) + ')';
        ctx.fill();
      }
    }

    function puff(x, y, n, power) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.4 + Math.random() * 2.2) * power;
        dust.push({
          x: x, y: y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6,
          r: 2 + Math.random() * 9,
          life: 0.5 + Math.random() * 0.5,
          decay: 0.008 + Math.random() * 0.014
        });
      }
    }

    function physicsTick(dt) {
      settledCount = 0;
      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];
        if (s.sleep) { settledCount++; drawShard(s); continue; }

        /* gravitasi — percepatan sama, tapi respons tumbukan beda per massa */
        s.vy += G * dt;
        /* drag udara ringan untuk fragmen kecil */
        const drag = s.mass < 1.4 ? 0.995 : 0.9992;
        s.vx *= drag; s.vy *= drag;

        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.ang += s.angVel * dt;

        /* lantai: pantul dengan restitusi, gesekan, dan kehilangan spin */
        if (s.y + s.maxR > FLOOR) {
          s.y = FLOOR - s.maxR;
          if (s.vy > 60) {
            puff(s.x, FLOOR, Math.min(10, 2 + Math.round(s.vy / 220)), Math.min(2.2, s.vy / 420));
            if (s.vy > 500 && window.FXSound) window.FXSound.pop(140 + Math.random() * 120);
          }
          s.vy = -s.vy * s.rest;
          s.vx *= s.fric;
          s.angVel *= 0.72;
          /* energi habis -> tidur */
          if (Math.abs(s.vy) < 26 && Math.abs(s.vx) < 12) {
            s.vy = 0; s.vx = 0;
            s.angVel *= 0.4;
            if (Math.abs(s.angVel) < 0.15) { s.angVel = 0; s.sleep = true; }
          }
        }
        /* dinding kiri/kanan */
        if (s.x - s.maxR < 0) { s.x = s.maxR; s.vx = -s.vx * s.rest; s.angVel *= 0.8; }
        if (s.x + s.maxR > Wp) { s.x = Wp - s.maxR; s.vx = -s.vx * s.rest; s.angVel *= 0.8; }
        /* langit-langit — biar tidak hilang */
        if (s.y - s.maxR < -Hp * 0.4) { s.y = -Hp * 0.4 + s.maxR; s.vy = Math.abs(s.vy) * 0.4; }

        drawShard(s);
      }
    }

    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000; last = now;
      if (dt > 0.05) dt = 0.05;
      ctx.clearRect(0, 0, Wp, Hp);
      if (exploded) {
        /* sub-step untuk stabilitas tumbukan */
        physicsTick(dt / 2);
        physicsTick(dt / 2);
      } else {
        for (let i = 0; i < shards.length; i++) drawShard(shards[i]);
      }
      drawDust();
      if (exploded && settledCount === shards.length && dust.length === 0 && !frame.done) {
        frame.done = true;
        if (opts.onSettle) opts.onSettle();
      }
    }
    raf = requestAnimationFrame(frame);

    const api = {
      canvas: canvas,
      /* ledakan: shard terlontar dari episentrum; gaya ~ 1/jarak, massa memengaruhi */
      explode(power) {
        if (exploded) return;
        exploded = true;
        power = power || 1;
        for (let i = 0; i < shards.length; i++) {
          const s = shards[i];
          const dx = s.x - epicenter.x;
          const dy = s.y - epicenter.y;
          const dist = Math.max(60, Math.hypot(dx, dy));
          const force = (118000 / dist) * power / (0.6 + s.mass * 0.22);
          s.vx = (dx / dist) * force * (0.55 + Math.random() * 0.7);
          s.vy = (dy / dist) * force * 0.4 - (160 + Math.random() * 420) * power;
          s.angVel = (Math.random() - 0.5) * (14 / (0.5 + s.mass * 0.35));
          /* shard dekat episentrum dapat dorongan ekstra */
          if (dist < 220) { s.vy -= 260 * power; s.vx += (Math.random() - 0.5) * 420; }
        }
        puff(epicenter.x, epicenter.y, 60, 2.4);
      },
      isSettled() { return frame.done === true; },
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        canvas.remove();
      }
    };
    return api;
  }

  return { start: start };
})();
