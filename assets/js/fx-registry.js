/* ================================================================
   FX · REGISTRY — konfigurasi terpusat 22 slide
   Menambah slide baru atau mengganti efek = mengubah file ini saja.
   Tiap config:
     enter    : { heading, cards, custom }  — pipeline entrance
     svg      : { silhouette, layers }      — scene SVG persisten
     webgl    : 'hero' | 'fluid' | null     — scene Three.js
     interact : ['tilt', 'magnetic:.card']  — modul interaktivitas
     sound    : opsional, hook suara ekstra
   TRANSISI: mapping eksplisit slide N -> N+1 (21 entri), masing-masing
   dipilih berdasarkan perpindahan narasinya.
   ================================================================ */
window.FXConfig = (function () {
  'use strict';

  /* ---- mapping 21 transisi (index 0 = 01->02) ---- */
  const TRANSITIONS = [
    /* 01->02 */ 'curtain-red',        /* upacara pembukaan: tirai merah jatuh-naik */
    /* 02->03 */ 'tear-light',         /* lembar kertas diganti: sobekan halus */
    /* 03->04 */ 'ink-wipe',           /* masuk ke media: sapuan tinta */
    /* 04->05 */ 'grid-slice',         /* masuk babak data: irisan grid presisi */
    /* 05->06 */ 'bars-shutter',       /* menuju momen puncak data: rana batang */
    /* 06->07 */ 'zoom-dive',          /* dari bar Indonesia menyelam ke "ke mana uangnya pergi" */
    /* 07->08 */ 'stamp-press',        /* masuk wilayah definisi hukum: cap dilekatkan */
    /* 08->09 */ 'split-panels',       /* dua panel faktor internal/eksternal: layar terbelah */
    /* 09->10 */ 'pillar-rise',        /* tiga pilar kepatuhan: pilar naik menyangga */
    /* 10->11 */ 'ink-bleed',          /* slide jeda: tinta merembes pelan, tenang */
    /* 11->12 */ 'tear-deep',          /* MASUK BABAK KORUPSI: robekan dalam + kilat merah */
    /* 12->13 */ 'glitch-slice',       /* realita mulai terganggu: glitch */
    /* 13->14 */ 'crack-spread',       /* retakan nilai menyebar */
    /* 14->15 */ 'erosion',            /* erosi karakter: lapisan terkikis noise */
    /* 15->16 */ 'shatter',            /* puncak CPI: layar pecah sebelum kota runtuh */
    /* 16->17 */ 'shards-reassemble',  /* BABAK SOLUSI: pecahan dirakit ulang — harapan */
    /* 17->18 */ 'coin-flip',          /* dua sisi satu koin: layar berputar */
    /* 18->19 */ 'draw-line',          /* rantai kausal menuju agen: garis tergambar */
    /* 19->20 */ 'blueprint-unfold',   /* dari peran ke program: cetak biru digelar */
    /* 20->21 */ 'measure-sweep',      /* dari rencana ke ukuran: penggaris menyapu */
    /* 21->22 */ 'curtain-final'       /* penutup upacara: tirai merah, lambat, khidmat */
  ];

  /* ---- config 22 slide ---- */
  const SLIDES = [
    { /* 01 · JUDUL */
      enter: { custom: 'hero' },
      svg: { silhouette: 'horizon', layers: [] },
      webgl: 'hero',
      interact: ['tilt:.doc'] },

    { /* 02 · IDENTITAS */
      enter: { heading: 'rise', cards: 'rise' },
      svg: { silhouette: 'sprout', layers: [] },
      webgl: null,
      interact: ['magnetic:.card', 'tilt:.doc'] },

    { /* 03 · PETA PAPARAN */
      enter: { heading: 'rise', cards: 'flip' },
      svg: { silhouette: 'sprout', layers: [] },
      webgl: null,
      interact: ['tilt', 'cardFocus'] },

    { /* 04 · VIDEO PENDAPATAN */
      enter: { heading: null, cards: null },
      svg: { silhouette: 'horizon', layers: [] },
      webgl: null,
      interact: ['magnetic:.video', 'tilt:.qr'] },

    { /* 05 · PAJAK KONTRIBUTOR UTAMA — kota mulai tumbuh */
      enter: { heading: 'rise', cards: 'stamp' },
      svg: { silhouette: 'skyline-small', layers: [] },
      webgl: null,
      interact: ['tilt'] },

    { /* 06 · RASIO PAJAK ★ */
      enter: { custom: 'bars' },
      svg: { silhouette: 'skyline-small', layers: ['grid'] },
      webgl: null,
      interact: ['barHover'] },

    { /* 07 · KE MANA UANG PAJAK PERGI */
      enter: { heading: 'rise', cards: 'rise' },
      svg: { silhouette: 'skyline-full', layers: ['icons'] },
      webgl: null,
      interact: ['cardFocus', 'tilt'] },

    { /* 08 · DEFINISI PAJAK */
      enter: { heading: 'rise', cards: 'stamp' },
      svg: { silhouette: 'skyline-full', layers: [] },
      webgl: null,
      interact: ['tilt'] },

    { /* 09 · FAKTOR KEPATUHAN */
      enter: { heading: 'rise', cards: 'rise' },
      svg: { silhouette: 'skyline-full', layers: [] },
      webgl: null,
      interact: ['tilt:.card'] },

    { /* 10 · TIGA PILAR */
      enter: { heading: 'rise', cards: 'rise' },
      svg: { silhouette: 'skyline-full', layers: ['pillars'] },
      webgl: null,
      interact: ['tilt'] },

    { /* 11 · FONDASI SISTEM — jembatan, retakan pertama */
      enter: { heading: null, cards: null },
      svg: { silhouette: 'skyline-full', layers: ['cracks'] },
      webgl: null,
      interact: [] },

    { /* 12 · VIDEO ANTI KORUPSI */
      enter: { heading: null, cards: null },
      svg: { silhouette: 'skyline-full', layers: ['cracks'] },
      webgl: null,
      interact: ['magnetic:.video'] },

    { /* 13 · HAKIKAT */
      enter: { heading: 'rise', cards: 'rise' },
      svg: { silhouette: 'skyline-full', layers: ['cracks'] },
      webgl: null,
      interact: ['tilt'] },

    { /* 14 · TUJUAN */
      enter: { heading: 'rise', cards: 'flip' },
      svg: { silhouette: 'skyline-full', layers: ['rings', 'cracks'] },
      webgl: null,
      interact: ['tilt'] },

    { /* 15 · DAMPAK GENERASI MUDA — kota mulai miring */
      enter: { heading: 'glitch', cards: 'rise' },
      svg: { silhouette: 'skyline-tilt', layers: ['cracks'] },
      webgl: null,
      interact: ['glitchHover'] },

    { /* 16 · CPI ★ — collapse + physics shard */
      enter: { custom: 'cpi' },
      svg: { silhouette: 'skyline-tilt', layers: ['cracks'] },
      webgl: null,                    /* 'ash' dinyalakan oleh modul collapse */
      interact: ['dotHover'] },

    { /* 17 · DUA SISI SATU KOIN */
      enter: { custom: 'coin' },
      svg: { silhouette: 'ruins', layers: ['coin'] },
      webgl: null,
      interact: ['coinTilt', 'tilt'] },

    { /* 18 · RANTAI SEBAB-AKIBAT ★ — kota dibangun ulang */
      enter: { custom: 'chain' },
      svg: { silhouette: 'rebuild', layers: ['bridge'] },
      webgl: null,
      interact: [] },

    { /* 19 · PERAN MAHASISWA & DOSEN */
      enter: { heading: 'rise', cards: 'rise' },
      svg: { silhouette: 'rebuild', layers: ['bridge'] },
      webgl: null,
      interact: ['tilt', 'cardFocus'] },

    { /* 20 · TIGA PROGRAM */
      enter: { heading: 'rise', cards: 'stamp' },
      svg: { silhouette: 'rebuild', layers: ['blueprint'] },
      webgl: null,
      interact: ['tilt', 'revealLi'] },

    { /* 21 · METRIK & JURANG ★ */
      enter: { custom: 'kpi' },
      svg: { silhouette: 'rebuild', layers: ['blueprint'] },
      webgl: null,
      interact: ['kpiHover'] },

    { /* 22 · KESIMPULAN ★ — fluid penutup */
      enter: { custom: 'redaction' },
      svg: { silhouette: 'city-final', layers: [] },
      webgl: 'fluid',
      interact: ['tilt:.doc'] }
  ];

  /* ---- custom entrance pipelines ---- */
  const CUSTOMS = {
    hero: function (ctx) { window.FXEntrances.hero(ctx); },
    bars: function (ctx) {
      window.FXEntrances.splitHeading(ctx, 'rise');
      window.FXEntrances.barsSpring(ctx);
      window.FXEntrances.rvDefault(ctx);
    },
    cpi: function (ctx) {
      window.FXEntrances.splitHeading(ctx, 'slow');
      window.FXEntrances.cpiCollapse(ctx);
      window.FXEntrances.rvDefault(ctx);
    },
    chain: function (ctx) {
      window.FXEntrances.splitHeading(ctx, 'rise');
      window.FXEntrances.chainDraw(ctx);
      window.FXEntrances.rvDefault(ctx);
    },
    kpi: function (ctx) {
      window.FXEntrances.splitHeading(ctx, 'rise');
      window.FXEntrances.kpiSpring(ctx);
      window.FXEntrances.rvDefault(ctx);
    },
    redaction: function (ctx) {
      window.FXEntrances.splitHeading(ctx, 'slow');
      window.FXEntrances.redactionFinal(ctx);
      window.FXEntrances.rvDefault(ctx);
    },
    coin: function (ctx) { window.FXEntrances.coinFlip3D(ctx); }
  };

  return { TRANSITIONS: TRANSITIONS, SLIDES: SLIDES, CUSTOMS: CUSTOMS };
})();
