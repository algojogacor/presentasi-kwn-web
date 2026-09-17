# Arsitektur FX

Peta modul, urutan muat, dan API publik. Baca ini sebelum menyentuh kode.

## Urutan muat (`index.html`, tepat sebelum `</body>`)

```
vendor: gsap, CustomEase, MorphSVGPlugin, SplitText, DrawSVGPlugin,
        MotionPathPlugin, three
js:     fx-sound → fx-cursor → fx-svg-stage → fx-webgl → fx-physics
        → fx-transitions → fx-entrances → fx-interactions
        → fx-registry → fx-core          ← core paling akhir (mengorkestrasi)
```

Semua library **ter-vendor lokal** di `assets/vendor/`. Dilarang menambah
`<script src="https://…">` / `<link>` remote.

## Modul & API publik

| File | Global | Tanggung jawab | API yang dipakai lintas modul |
|---|---|---|---|
| `fx-sound.js` | `FXSound` | WebAudio synth (pop/tick/impact/chime/whoosh), toggle | `isEnabled()`, `setEnabled(b)`, `pop(f)`, `tick()`, `impact(v)`, `chime()`, `whoosh(v,rev)` |
| `fx-cursor.js` | `FXCursor` | Kursor tinta + pulse | `init()`, `pulse(colorHex)` |
| `fx-svg-stage.js` | `FXSvg` | Panggung SVG persisten: siluet kota morph + layer ikon + parallax | `build()`, `apply(cfg,{immediate})`, `gridPulse()`, `coinTilt()`, `initParallax()`, `get master` |
| `fx-webgl.js` | `FXGL` | Three.js: `hero` (partikel slide 01), `fluid` (slide 22), `ash` (collapse 15) | `play(name)`, `stop()`, `get active` (`active.name`, `active.explode()`) |
| `fx-physics.js` | `FXPhysics` | Simulasi shard puing saat meninggalkan hero | `start(...)` |
| `fx-transitions.js` | `FXTransitions` | 21 transisi keyed nama kebab-case, tiap fungsi `(ctx) → gsap.timeline` | `FXTransitions['ink-wipe'](ctx)` dst. |
| `fx-entrances.js` | `FXEntrances` | Pipeline masuk per elemen | `standard(ctx,…)`, `splitHeading(ctx,mode)`, `maskLines`, `rvDefault`, `countersAll`/`counter`, `cards`, `barsSpring`, `cpiCollapse`, `chainDraw`, `kpiSpring`, `redactionFinal`, `stampSlam`, `hero`, `coinFlip3D`, `shakeSlide`, `revert(slide)` |
| `fx-interactions.js` | `FXInteract` | Interaktivitas hover/tilt/magnetic | tiap modul `(slide) → {destroy()}`; nama: `tilt`, `magnetic`, `cardFocus`, `barHover`, `kpiHover`, `dotHover`, `coinTilt`, `glitchHover`, `revealLi` |
| `fx-registry.js` | `FXConfig` | **Satu-satunya tempat konfigurasi 22 slide** | `{ TRANSITIONS, SLIDES, CUSTOMS }` |
| `fx-core.js` | `FX` | Mesin state + orkestrasi + bendera `fx-on` | `nav(i)` **(indeks absolut 0‑based)**, `get current`, `get isBusy`, `preparePrint()`, `restorePrint()`, `destroyCurrent()` |

`window.DeckNav` (pra‑FX) tetap ada: `currentIndex()`, `slides`, `deck`,
`firstPaint`.

## Mesin state (`fx-core.js`)

- **Satu slide aktif.** `current` = indeks 0‑based. `goTo(i)` guard
  `if (i === current) return; destroyCurrent(); …` (fx-core:301).
- **`busy`** naik selama transisi → `FX.isBusy`; input roda/kursor dikunci.
- **`ctx`** yang diumpan ke entrance/transisi/interact:
  `{ slide, index, cfg, tl: gsap.timeline(), bus: emitter(), interacts: [], physics: null }`.
- **`destroyCurrent()`** (fx-core:97) memanggil `FXEntrances.revert(slide)` +
  `interacts[].destroy()` + matikan GL/physics milik slide lama.
- **Pemicu navigasi:** roda (`wheelTakeover`), keyboard, tombol — semuanya
  memanggil `api.nav(currentIndex + dir)` (fx-core:208), jadi **`FX.nav`
  menerima indeks absolut**.

## Boot & mode khusus

- `prefers-reduced-motion: reduce` → **FX tidak init** (fx-core:278), kelas
  `fx-on` tidak dipasang, `DeckNav` klasik tetap jalan penuh.
- Tanpa reduced-motion + `window.gsap` ada → kelas **`fx-on`** dipasang
  secepat mungkin (fx-core:325) agar CSS fallback non‑FX tidak berkedip.
- **Cetak:** `FX.preparePrint()` menambah `html.fx-print` (bar redaksi → 0,
  karakter split → terlihat), `FX.restorePrint()` mengembalikan.

## Registry: menambah/mengganti efek = SATU file

`FXConfig.SLIDES[idx]`:
```js
{
  enter: { heading: 'rise'|'slow'|…, cards: bool, custom: 'hero'|'bars'|'cpi'|'chain'|'kpi'|'redaction'|… },
  svg:   { silhouette: 'city-final'|…, layers: [ /* ikon layer */ ] },
  webgl: 'hero' | 'fluid' | null,
  interact: [ 'tilt', 'magnetic:.card', … ],   // string = modul[:selektor]
  sound: { /* hook opsional */ }
}
```
`FXConfig.TRANSITIONS` = 21 entri **N → N+1**, tiap nilai adalah key fungsi
di `FXTransitions`. `FXConfig.CUSTOMS` memetakan nama custom → fungsi yang
memanggil `FXEntrances.*`.

## Pola `own()` / revert (WAJIB dipatuhi entrance)

Setiap elemen yang diberi GSAP inline style harus ditandai `own(el)`
(fx-entrances:13) supaya `FXEntrances.revert(slide)` (fx-entrances:483)
membatalkan inline style saat slide ditinggalkan. Tanpa `own()`, slide
bekas tertinggal dalam state animasi.
