/* ================================================================
   FX · SOUND DESIGN
   Semua suara disintesis WebAudio — nol aset, nol jaringan.
   - tick     : counter angka berjalan
   - whoosh   : transisi antar slide
   - impact   : stempel menghantam
   - crumble  : kota runtuh (slide 16)
   - chime    : momen penyelesaian
   Satu toggle mematikan semuanya (persisten di localStorage).
   ================================================================ */
window.FXSound = (function () {
  'use strict';

  const KEY = 'kwn-sound-v1';
  let ac = null, master = null, noiseBuf = null;
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== '0'; } catch (e) {}
  let lastTick = 0;

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = enabled ? 1 : 0;
      master.connect(ac.destination);
      /* buffer noise 2 detik, dipakai whoosh/crumble/impact */
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function noise(dur, filterType, f0, f1, gain, when) {
    const c = ctx(); if (!c) return;
    const t = when || c.currentTime;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const flt = c.createBiquadFilter();
    flt.type = filterType;
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    flt.Q.value = 0.9;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  function tone(freq, freq2, dur, gain, type, when) {
    const c = ctx(); if (!c) return;
    const t = when || c.currentTime;
    const o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const api = {
    /* klik tipis — dipanggil berkali-kali saat counter berjalan; di-throttle */
    tick(rate) {
      const c = ctx(); if (!c || !enabled) return;
      const now = c.currentTime * 1000;
      if (now - lastTick < (rate || 55)) return;
      lastTick = now;
      tone(1750 + Math.random() * 500, null, 0.028, 0.016, 'square');
    },

    /* sapuan angin untuk transisi; dur sekitar durasi transisi */
    whoosh(dur, down) {
      if (!enabled) return;
      dur = dur || 0.7;
      if (down) noise(dur, 'bandpass', 3200, 240, 0.085);
      else      noise(dur, 'bandpass', 300, 2800, 0.08);
    },

    /* hantaman: thud rendah + burst noise — stempel "Taat & Bersih" */
    impact(power) {
      if (!enabled) return;
      const p = power || 1;
      tone(120 * p, 34, 0.34, 0.30, 'sine');
      tone(58, 30, 0.5, 0.16, 'triangle');
      noise(0.16, 'lowpass', 2600, 300, 0.12);
    },

    /* gemuruh reruntuhan — slide 16 */
    crumble() {
      if (!enabled) return;
      const c = ctx(); if (!c) return;
      noise(1.5, 'lowpass', 900, 90, 0.16);
      noise(0.9, 'bandpass', 220, 60, 0.10, c.currentTime + 0.25);
      tone(70, 28, 1.1, 0.14, 'sawtooth', c.currentTime + 0.05);
      /* ketukan puing berjatuhan */
      for (let i = 0; i < 7; i++) {
        tone(300 + Math.random() * 900, null, 0.03, 0.03, 'square',
             c.currentTime + 0.4 + Math.random() * 1.3);
      }
    },

    /* denting halus — momen segel/target terkunci */
    chime() {
      if (!enabled) return;
      tone(1318, null, 0.5, 0.045, 'sine');
      tone(1976, null, 0.42, 0.03, 'sine');
      tone(2637, null, 0.3, 0.018, 'sine');
    },

    /* pop kecil — simpul rantai, dot grafik */
    pop(pitch) {
      if (!enabled) return;
      tone(pitch || 620, (pitch || 620) * 1.6, 0.07, 0.05, 'sine');
    },

    /* sobekan kertas — transisi tear */
    rip() {
      if (!enabled) return;
      const c = ctx(); if (!c) return;
      noise(0.5, 'highpass', 1200, 4200, 0.09);
      noise(0.3, 'bandpass', 2400, 800, 0.06, c.currentTime + 0.12);
    },

    setEnabled(on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {}
      if (master) master.gain.value = enabled ? 1 : 0;
      if (enabled) ctx();
      return enabled;
    },
    isEnabled() { return enabled; },
    /* panaskan konteks audio pada gestur pengguna pertama */
    unlock() { ctx(); }
  };

  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function once() {
      api.unlock();
      window.removeEventListener(ev, once);
    }, { passive: true, once: true });
  });

  return api;
})();
