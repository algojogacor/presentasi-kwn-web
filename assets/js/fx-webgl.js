/* ================================================================
   FX · WEBGL (Three.js)
   Satu canvas #fx-three dipakai bergantian oleh tiga scene:
     hero   : particle field yang mengumpul membentuk rosette segel,
              bereaksi mouse, lalu meledak saat keluar (slide 01)
     ash    : partikel abu/hujan debris halus (slide 16)
     fluid  : simulasi fluida GPU (adveksi + pressure solve) dengan
              tinta cream & vermilion, disuntik mouse (slide 22)
   Scene di-swap tanpa reload; hanya satu yang aktif.
   ================================================================ */
window.FXGL = (function () {
  'use strict';

  const canvas = document.getElementById('fx-three');
  let renderer = null;
  let active = null;      /* controller scene aktif */
  let activeName = null;

  function ensureRenderer() {
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, alpha: true, antialias: false,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.autoClear = true;
    }
    return renderer;
  }

  function show(on) {
    canvas.style.display = on ? 'block' : 'none';
  }

  function play(name) {
    if (activeName === name && active) return active;
    stop();
    ensureRenderer();
    show(true);
    activeName = name;
    if (name === 'hero') active = heroScene();
    else if (name === 'ash') active = ashScene();
    else if (name === 'fluid') active = fluidScene();
    else { active = null; activeName = null; show(false); }
    return active;
  }

  function stop() {
    if (active && active.destroy) active.destroy();
    active = null;
    activeName = null;
    show(false);
  }

  window.addEventListener('resize', function () {
    if (!renderer || !active) return;
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (active.resize) active.resize();
  });

  /* ==============================================================
     SCENE 1 · HERO PARTICLES — rosette segel
     ============================================================== */
  function heroScene() {
    const r = ensureRenderer();
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000);
    cam.position.z = 600;

    const N = 5600;
    const viewH = 2 * 600 * Math.tan(THREE.MathUtils.degToRad(25));
    const viewW = viewH * (window.innerWidth / window.innerHeight);

    /* target: tiga lapis rosette guilloche (k=9, 14, 6 — sama dgn rosette deck) */
    const targets = new Float32Array(N * 3);
    const homes = new Float32Array(N * 3);
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const mix = new Float32Array(N);
    const seed = new Float32Array(N);

    const rose = [
      { R: 0.30, A: 0.075, k: 9, w: 0.34 },
      { R: 0.24, A: 0.052, k: 14, w: 0.33 },
      { R: 0.17, A: 0.038, k: 6, w: 0.33 }
    ];
    let idx = 0;
    for (let i = 0; i < N; i++) {
      /* pilih lapis */
      let acc = 0, li = 0;
      const q = Math.random();
      for (li = 0; li < rose.length; li++) { acc += rose[li].w; if (q < acc) break; }
      li = Math.min(li, rose.length - 1);
      const L = rose[li];
      const th = Math.random() * Math.PI * 2;
      const rr = (L.R + L.A * Math.cos(L.k * th)) * (0.985 + Math.random() * 0.03);
      targets[i * 3]     = Math.cos(th) * rr * viewH * 1.05;
      targets[i * 3 + 1] = Math.sin(th) * rr * viewH * 1.05 + viewH * 0.06;
      targets[i * 3 + 2] = (Math.random() - 0.5) * 30;

      homes[i * 3]     = (Math.random() - 0.5) * viewW * 1.6;
      homes[i * 3 + 1] = (Math.random() - 0.5) * viewH * 1.6;
      homes[i * 3 + 2] = (Math.random() - 0.5) * 400;

      pos[i * 3] = homes[i * 3];
      pos[i * 3 + 1] = homes[i * 3 + 1];
      pos[i * 3 + 2] = homes[i * 3 + 2];
      mix[i] = Math.random() < 0.14 ? 1 : 0;
      seed[i] = Math.random() * 100;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aMix', new THREE.BufferAttribute(mix, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uSize: { value: 2.6 * Math.min(window.devicePixelRatio, 2) },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uInk: { value: new THREE.Color(0x15130f) },
        uRed: { value: new THREE.Color(0xc33b22) }
      },
      vertexShader: `
        attribute float aMix; attribute float aSeed;
        uniform float uSize, uTime;
        varying float vMix;
        void main(){
          vMix = aMix;
          vec3 p = position;
          p.x += sin(uTime*0.7 + aSeed)*2.4;
          p.y += cos(uTime*0.6 + aSeed*1.3)*2.4;
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          gl_PointSize = uSize * (600.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uInk, uRed; uniform float uOpacity;
        varying float vMix;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.08, d) * uOpacity;
          gl_FragColor = vec4(mix(uInk, uRed, vMix), a * (0.55 + 0.45*vMix));
        }`
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const state = { form: 0, explode: 0, opacity: 0 };
    const mouse = { x: 1e5, y: 1e5, wx: 0, wy: 0, active: false };

    function onMove(e) {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
      mouse.wx = (e.clientX / window.innerWidth - 0.5) * viewW;
      mouse.wy = -(e.clientY / window.innerHeight - 0.5) * viewH;
    }
    window.addEventListener('mousemove', onMove, { passive: true });

    /* koreografi: fade in -> mengumpul -> bernapas */
    const tl = gsap.timeline();
    tl.to(state, { opacity: 0.9, duration: 0.8, ease: 'power2.out' })
      .to(state, { form: 1, duration: 2.6, ease: 'power2.inOut' }, 0.25);

    let raf = 0, t0 = performance.now(), disposed = false;

    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      const dt = Math.min(1 / 30, 1 / 60 * 2);
      mat.uniforms.uTime.value = t;
      mat.uniforms.uOpacity.value = state.opacity;

      const formK = 0.02 + state.form * 0.075;
      const expl = state.explode;
      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        if (expl > 0) {
          vel[i3]     += (pos[i3] * 0.0016 + (Math.random() - 0.5) * 0.5) * expl;
          vel[i3 + 1] += (pos[i3 + 1] * 0.0016 - 0.35) * expl;
          vel[i3 + 2] += (Math.random() - 0.5) * 0.4 * expl;
          vel[i3] *= 0.985; vel[i3 + 1] *= 0.985; vel[i3 + 2] *= 0.985;
          pos[i3] += vel[i3]; pos[i3 + 1] += vel[i3 + 1]; pos[i3 + 2] += vel[i3 + 2];
        } else {
          /* napas halus pada target */
          const br = 1 + Math.sin(t * 0.8 + seed[i] * 0.1) * 0.015;
          let tx = targets[i3] * br, ty = targets[i3 + 1] * br, tz = targets[i3 + 2];
          const hx = homes[i3] + Math.sin(t * 0.3 + seed[i]) * 30;
          const hy = homes[i3 + 1] + Math.cos(t * 0.24 + seed[i] * 1.7) * 30;
          const k = state.form;
          const gx = tx * k + hx * (1 - k);
          const gy = ty * k + hy * (1 - k);
          pos[i3]     += (gx - pos[i3]) * formK;
          pos[i3 + 1] += (gy - pos[i3 + 1]) * formK;
          pos[i3 + 2] += (tz * k - pos[i3 + 2]) * formK;

          /* tolakan mouse */
          if (mouse.active) {
            const dx = pos[i3] - mouse.wx, dy = pos[i3 + 1] - mouse.wy;
            const d2 = dx * dx + dy * dy;
            const R = 85;
            if (d2 < R * R && d2 > 0.01) {
              const f = (1 - Math.sqrt(d2) / R) * 5.2;
              pos[i3] += (dx / Math.sqrt(d2)) * f;
              pos[i3 + 1] += (dy / Math.sqrt(d2)) * f;
            }
          }
        }
      }
      geo.attributes.position.needsUpdate = true;
      r.render(scene, cam);
      void dt;
    }
    raf = requestAnimationFrame(frame);

    return {
      name: 'hero',
      explode() {
        tl.kill();
        gsap.to(state, { explode: 1, duration: 0.9, ease: 'power2.in' });
        gsap.to(state, { opacity: 0, duration: 1.3, delay: 0.35, ease: 'power2.in' });
      },
      resize() { cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix(); },
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        tl.kill();
        window.removeEventListener('mousemove', onMove);
        geo.dispose(); mat.dispose();
        scene.clear();
      }
    };
  }

  /* ==============================================================
     SCENE 2 · ASH — hujan debris halus slide 16
     ============================================================== */
  function ashScene() {
    const r = ensureRenderer();
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const N = 620;
    const pos = new Float32Array(N * 3);
    const spd = new Float32Array(N);
    const mix = new Float32Array(N);
    const seed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = 0;
      spd[i] = 0.08 + Math.random() * 0.3;
      mix[i] = Math.random() < 0.2 ? 1 : 0;
      seed[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aMix', new THREE.BufferAttribute(mix, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uOpacity: { value: 0 },
        uPx: { value: Math.min(window.devicePixelRatio, 2) },
        uInk: { value: new THREE.Color(0x3a352c) },
        uRed: { value: new THREE.Color(0x9e2e19) }
      },
      vertexShader: `
        attribute float aMix; varying float vMix; uniform float uPx;
        void main(){
          vMix = aMix;
          gl_PointSize = (1.5 + aMix*2.0) * uPx;
          gl_Position = vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float uOpacity; uniform vec3 uInk, uRed; varying float vMix;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          if (dot(c,c) > 0.25) discard;
          gl_FragColor = vec4(mix(uInk,uRed,vMix), uOpacity * (0.35 + 0.4*vMix));
        }`
    });
    scene.add(new THREE.Points(geo, mat));

    const state = { opacity: 0 };
    gsap.to(state, { opacity: 0.85, duration: 1.6, ease: 'power2.inOut' });

    let raf = 0, disposed = false, last = performance.now();
    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      mat.uniforms.uOpacity.value = state.opacity * (0.75 + 0.25 * Math.sin(now / 900));
      const p = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        p[i * 3 + 1] -= spd[i] * dt * 0.5;
        p[i * 3] += Math.sin(now / 1400 + seed[i]) * dt * 0.05;
        if (p[i * 3 + 1] < -1.05) {
          p[i * 3 + 1] = 1.05;
          p[i * 3] = Math.random() * 2 - 1;
        }
      }
      geo.attributes.position.needsUpdate = true;
      r.render(scene, cam);
    }
    raf = requestAnimationFrame(frame);

    return {
      name: 'ash',
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        geo.dispose(); mat.dispose(); scene.clear();
      }
    };
  }

  /* ==============================================================
     SCENE 3 · FLUID — simulasi fluida GPU, tinta cream & merah
     Navier-Stokes ringkas: splat -> advection -> divergence ->
     pressure (Jacobi 18x) -> gradient subtract -> display.
     ============================================================== */
  function fluidScene() {
    const r = ensureRenderer();
    ensureRenderer();
    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeo, null);
    quad.frustumCulled = false;
    scene.add(quad);

    const SIM = 128, DYE = 512;
    const rtOpts = {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping
    };
    function doubleTarget(res) {
      return {
        a: new THREE.WebGLRenderTarget(res, res, rtOpts),
        b: new THREE.WebGLRenderTarget(res, res, rtOpts),
        get read() { return this.a; },
        get write() { return this.b; },
        swap() { const t = this.a; this.a = this.b; this.b = t; }
      };
    }
    const velRT = doubleTarget(SIM);
    const dyeRT = doubleTarget(DYE);
    const divRT = new THREE.WebGLRenderTarget(SIM, SIM, rtOpts);
    const preRT = doubleTarget(SIM);

    const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

    function mat(fs, uniforms) {
      return new THREE.ShaderMaterial({
        vertexShader: VS, fragmentShader: fs, uniforms: uniforms, depthTest: false, depthWrite: false
      });
    }

    const mAdvect = mat(`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity; uniform sampler2D uSource;
      uniform vec2 uTexelV; uniform vec2 uTexelS;
      uniform float dt; uniform float dissipation;
      void main(){
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * uTexelV;
        vec4 s = texture2D(uSource, coord);
        gl_FragColor = s / (1.0 + dissipation * dt);
      }`, {
      uVelocity: { value: null }, uSource: { value: null },
      uTexelV: { value: new THREE.Vector2(1 / SIM, 1 / SIM) },
      uTexelS: { value: new THREE.Vector2(1 / SIM, 1 / SIM) },
      dt: { value: 0.016 }, dissipation: { value: 0.25 }
    });

    const mDiv = mat(`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main(){
        float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
        float Rr = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
        float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
        gl_FragColor = vec4(0.5 * (Rr - L + T - B), 0.0, 0.0, 1.0);
      }`, {
      uVelocity: { value: null }, uTexel: { value: new THREE.Vector2(1 / SIM, 1 / SIM) }
    });

    const mPressure = mat(`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uPressure; uniform sampler2D uDivergence; uniform vec2 uTexel;
      void main(){
        float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
        float Rr = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
        float div = texture2D(uDivergence, vUv).x;
        gl_FragColor = vec4((L + Rr + B + T - div) * 0.25, 0.0, 0.0, 1.0);
      }`, {
      uPressure: { value: null }, uDivergence: { value: null },
      uTexel: { value: new THREE.Vector2(1 / SIM, 1 / SIM) }
    });

    const mGrad = mat(`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uPressure; uniform sampler2D uVelocity; uniform vec2 uTexel;
      void main(){
        float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
        float Rr = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
        vec2 v = texture2D(uVelocity, vUv).xy - vec2(Rr - L, T - B) * 0.5;
        gl_FragColor = vec4(v, 0.0, 1.0);
      }`, {
      uPressure: { value: null }, uVelocity: { value: null },
      uTexel: { value: new THREE.Vector2(1 / SIM, 1 / SIM) }
    });

    const mSplat = mat(`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget; uniform float aspectRatio;
      uniform vec3 color; uniform vec2 point; uniform float radius;
      void main(){
        vec2 p = vUv - point;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
      }`, {
      uTarget: { value: null }, aspectRatio: { value: window.innerWidth / window.innerHeight },
      color: { value: new THREE.Vector3() }, point: { value: new THREE.Vector2() }, radius: { value: 0.0022 }
    });

    const mDisplay = mat(`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTexture; uniform float uOpacity;
      void main(){
        vec3 c = texture2D(uTexture, vUv).rgb;
        float a = smoothstep(0.06, 0.40, length(c)) * uOpacity;
        gl_FragColor = vec4(c, a * 0.55);
      }`, {
      uTexture: { value: null }, uOpacity: { value: 0 }
    });

    function blit(material, target) {
      quad.material = material;
      r.setRenderTarget(target || null);
      r.render(scene, cam);
      r.setRenderTarget(null);
    }

    /* warna tinta: sepia-cream hangat & vermilion; "ink" dipakai sebagai
       sepia lembut, bukan hitam pekat, supaya fluida terasa kertas+tinta
       encer, bukan noda gelap */
    const CREAM = new THREE.Vector3(0.56, 0.48, 0.36);
    const RED = new THREE.Vector3(0.74, 0.20, 0.10);
    const INK = new THREE.Vector3(0.50, 0.44, 0.35);

    function splat(x, y, dx, dy, color, rad) {
      mSplat.uniforms.uTarget.value = velRT.read.texture;
      mSplat.uniforms.aspectRatio.value = window.innerWidth / window.innerHeight;
      mSplat.uniforms.point.value.set(x, y);
      mSplat.uniforms.color.value.set(dx, dy, 0);
      mSplat.uniforms.radius.value = rad || 0.0022;
      blit(mSplat, velRT.write); velRT.swap();

      mSplat.uniforms.uTarget.value = dyeRT.read.texture;
      mSplat.uniforms.color.value.copy(color);
      mSplat.uniforms.radius.value = (rad || 0.0022) * 1.3;
      blit(mSplat, dyeRT.write); dyeRT.swap();
    }

    /* splat pembuka + ambient berkala supaya fluida selalu hidup */
    function ambient() {
      const t = performance.now() / 1000;
      const x = 0.5 + Math.sin(t * 0.23) * 0.32;
      const y = 0.5 + Math.cos(t * 0.17) * 0.28;
      const col = Math.random() < 0.42 ? RED : (Math.random() < 0.62 ? CREAM : INK);
      splat(x, y, Math.cos(t) * 260, Math.sin(t * 1.3) * 260, col, 0.0026);
    }
    splat(0.55, 0.55, 400, 120, RED, 0.0035);
    splat(0.72, 0.42, -300, -80, CREAM, 0.005);
    splat(0.5, 0.7, 120, -260, RED, 0.0028);
    const ambInt = setInterval(ambient, 1150);

    const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, down: false, moved: false };
    function onMove(e) {
      pointer.px = pointer.x; pointer.py = pointer.y;
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = 1 - e.clientY / window.innerHeight;
      pointer.moved = true;
    }
    window.addEventListener('mousemove', onMove, { passive: true });

    const state = { opacity: 0 };
    gsap.to(state, { opacity: 0.66, duration: 2.2, ease: 'power2.inOut' });

    let raf = 0, disposed = false, last = performance.now();
    const clearM = mat(`precision highp float; varying vec2 vUv; void main(){ gl_FragColor = vec4(0.0); }`, {});
    void clearM;

    function frame(now) {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      let dt = (now - last) / 1000; last = now;
      dt = Math.min(dt, 0.033);

      /* suntik mouse */
      if (pointer.moved) {
        pointer.moved = false;
        const dx = (pointer.x - pointer.px) * 5200;
        const dy = (pointer.y - pointer.py) * 5200;
        if (Math.abs(dx) + Math.abs(dy) > 1.5) {
          const col = Math.random() < 0.3 ? RED : CREAM;
          splat(pointer.x, pointer.y, dx, dy, col, 0.0016);
        }
      }

      /* adveksi velocity & dye */
      mAdvect.uniforms.uVelocity.value = velRT.read.texture;
      mAdvect.uniforms.uSource.value = velRT.read.texture;
      mAdvect.uniforms.uTexelV.value.set(1 / SIM, 1 / SIM);
      mAdvect.uniforms.dt.value = dt;
      mAdvect.uniforms.dissipation.value = 0.32;
      blit(mAdvect, velRT.write); velRT.swap();

      mAdvect.uniforms.uVelocity.value = velRT.read.texture;
      mAdvect.uniforms.uSource.value = dyeRT.read.texture;
      mAdvect.uniforms.uTexelV.value.set(1 / DYE, 1 / DYE);
      mAdvect.uniforms.dissipation.value = 0.42;
      blit(mAdvect, dyeRT.write); dyeRT.swap();

      /* divergence -> pressure -> gradient subtract */
      mDiv.uniforms.uVelocity.value = velRT.read.texture;
      blit(mDiv, divRT);

      mPressure.uniforms.uDivergence.value = divRT.texture;
      for (let i = 0; i < 18; i++) {
        mPressure.uniforms.uPressure.value = preRT.read.texture;
        blit(mPressure, preRT.write); preRT.swap();
      }
      mGrad.uniforms.uPressure.value = preRT.read.texture;
      mGrad.uniforms.uVelocity.value = velRT.read.texture;
      blit(mGrad, velRT.write); velRT.swap();

      /* display */
      mDisplay.uniforms.uTexture.value = dyeRT.read.texture;
      mDisplay.uniforms.uOpacity.value = state.opacity;
      quad.material = mDisplay;
      r.setRenderTarget(null);
      r.render(scene, cam);
    }
    raf = requestAnimationFrame(frame);

    return {
      name: 'fluid',
      resize() {
        mSplat.uniforms.aspectRatio.value = window.innerWidth / window.innerHeight;
      },
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        clearInterval(ambInt);
        window.removeEventListener('mousemove', onMove);
        [velRT.a, velRT.b, dyeRT.a, dyeRT.b, divRT, preRT.a, preRT.b].forEach(function (t) { t.dispose(); });
        [mAdvect, mDiv, mPressure, mGrad, mSplat, mDisplay, clearM].forEach(function (m) { m.dispose(); });
        quadGeo.dispose();
        scene.clear();
        if (renderer) renderer.setRenderTarget(null);
      }
    };
  }

  return { play: play, stop: stop, get active() { return active; } };
})();
