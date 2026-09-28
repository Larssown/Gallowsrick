// engine.js — renderer, post-processing, light pool, weather (lightning/rain), sky, particles & shader FX
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, X = window.THREEX, U = G.U;
  const E = (G.engine = {});
  let renderer, scene, camera, composer, renderPass, bloom, outputPass, finalPass;

  // ------------------------------------------------------------------ final grading pass
  const FinalShader = {
    uniforms: {
      tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 },
      vignette: { value: 0.55 }, grain: { value: 0.05 }, chroma: { value: 0.6 }, flash: { value: 0 }, fade: { value: 0 },
      blur: { value: 0 }, lid: { value: 0 }, sat: { value: 0.9 }, contrast: { value: 1.05 }, bright: { value: 1 },
      tint: { value: new THREE.Color(0, 0, 0) }, tintAmt: { value: 0 },
      lift: { value: new THREE.Vector3(0.01, 0.015, 0.025) }, gain: { value: new THREE.Vector3(1, 1, 1) },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 res; uniform float time, vignette, grain, chroma, flash, fade, blur, lid, sat, contrast, bright, tintAmt;
      uniform vec3 tint, lift, gain; varying vec2 vUv;
      float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      void main(){
        vec2 uv = vUv; vec2 d = uv - 0.5;
        float l0 = length(d);
        vec2 o = d * chroma * l0 * 0.012;
        vec3 col = vec3(texture2D(tDiffuse, uv + o).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - o).b);
        if (blur > 0.001) {
          vec3 acc = col; float ws = 1.0;
          for (int i = 0; i < 16; i++) {
            float a = float(i) * 2.39996; float r = (0.6 + float(i) * 0.45) * blur * 0.0035;
            vec2 off = vec2(cos(a), sin(a)) * r * vec2(res.y / res.x, 1.0);
            acc += texture2D(tDiffuse, uv + off).rgb; ws += 1.0;
          }
          col = acc / ws; col *= 1.0 - blur * 0.5;
        }
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, sat);
        col = (col - 0.5) * contrast + 0.5;
        col = col * gain + lift * (1.0 - clamp(col, 0.0, 1.0));
        col *= bright;
        float dist = length(d * vec2(res.x / res.y, 1.0));
        col = mix(col, tint, tintAmt * smoothstep(0.2, 1.0, dist));
        col *= 1.0 - vignette * smoothstep(0.3, 1.1, dist);
        col += flash;
        col += (hash(uv * res + fract(time * 7.13) * 91.7) - 0.5) * grain;
        if (lid > 0.001) {
          float e = abs(uv.y - 0.5) * 2.0 + pow(abs(uv.x - 0.5) * 2.0, 2.0) * 0.35;
          float openAmt = 1.4 * (1.0 - lid);
          col *= 1.0 - smoothstep(openAmt - 0.25, openAmt, e);
        }
        col *= 1.0 - fade;
        gl_FragColor = vec4(max(col, 0.0), 1.0);
      }`,
  };

  E.post = null; // uniforms shortcut
  E.lightScale = 2.4;
  E.look = { // current (smoothed) + target area look
    cur: null, tgt: null,
  };
  const LOOK_DEFAULT = { fog: 0.03, fogColor: [0.02, 0.025, 0.03], hemiSky: [0.35, 0.42, 0.55], hemiGround: [0.08, 0.07, 0.06], hemi: 0.35, moon: 0.25, moonColor: [0.62, 0.7, 0.9], exposure: 1.0, sat: 0.85, contrast: 1.06, bloom: 0.55, env: 0.25, lift: [0.01, 0.015, 0.03], gain: [1, 1, 1] };

  E.init = function () {
    renderer = E.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    renderer.domElement.id = 'game';
    document.body.insertBefore(renderer.domElement, document.getElementById('ui'));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    if (!renderer.capabilities.isWebGL2) throw new Error('WebGL2 is required.');

    scene = E.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010203);
    scene.fog = new THREE.FogExp2(0x05070a, 0.03);
    camera = E.camera = new THREE.PerspectiveCamera(G.settings.fov, innerWidth / innerHeight, 0.03, 1200);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    E.buildComposer();
    E.initLights();
    E.initSky();
    E.initRain();
    E.initParticles();
    E.look.cur = JSON.parse(JSON.stringify(LOOK_DEFAULT));
    E.look.tgt = JSON.parse(JSON.stringify(LOOK_DEFAULT));

    // dim environment for subtle reflections
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0a0c10);
    const panel = (c, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m); };
    panel(0x6a7890, 0, 8, -4, 6, 3); panel(0x3a4250, -8, 3, 2, 4, 6); panel(0x504438, 6, 2, 6, 5, 3); panel(0x1a1c20, 0, -6, 0, 20, 20);
    E.envMap = pm.fromScene(envScene, 0.04).texture;
    scene.environment = E.envMap;
    pm.dispose();

    window.addEventListener('resize', E.resize);
    E.applyQuality();
  };

  E.buildComposer = function () {
    const q = G.settings.quality;
    const size = new THREE.Vector2(innerWidth, innerHeight);
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: q === 'low' ? 0 : 4 });
    if (composer) composer.dispose && composer.dispose();
    composer = E.composer = new X.EffectComposer(renderer, rt);
    renderPass = new X.RenderPass(scene, camera);
    // sanitize: kill NaN/Inf and clamp hot pixels before bloom spreads them
    const sanitize = new X.ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0); gl_FragColor = vec4(min(max(c.rgb, 0.0), vec3(48.0)), 1.0); }',
    });
    bloom = new X.UnrealBloomPass(size.clone(), 0.55, 0.55, 0.82);
    outputPass = new X.OutputPass();
    finalPass = new X.ShaderPass(FinalShader);
    composer.addPass(renderPass);
    composer.addPass(sanitize);
    composer.addPass(bloom);
    composer.addPass(outputPass);
    composer.addPass(finalPass);
    E.post = finalPass.uniforms;
    E.bloom = bloom;
    E.renderPass = renderPass;
  };

  E.applyQuality = function () {
    const q = G.settings.quality;
    const pr = q === 'high' ? Math.min(devicePixelRatio, 1.6) : q === 'medium' ? Math.min(devicePixelRatio, 1.0) : 0.75;
    renderer.setPixelRatio(pr);
    const sm = q === 'high' ? 2048 : q === 'medium' ? 1024 : 512;
    const sl = E.lights;
    if (sl) {
      [[sl.moon, sm], [sl.flash, sm / 2], [sl.spotA, sm / 2], [sl.spotB, sm / 2]].forEach(([l, s]) => {
        if (l.shadow.mapSize.x !== s) { l.shadow.mapSize.set(s, s); if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; } }
      });
    }
    renderer.shadowMap.type = q === 'low' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    bloom.enabled = q !== 'low';
    E.resize();
  };
  G.on('settings', () => { if (renderer) { camera.fov = G.settings.fov; camera.updateProjectionMatrix(); } });

  E.resize = function () {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    const pr = renderer.getPixelRatio();
    E.post.res.value.set(w * pr, h * pr);
    G.emit('resize', w, h);
  };

  // ------------------------------------------------------------------ lights
  E.initLights = function () {
    const L = (E.lights = { virtual: [], pool: [] });
    G.lights = L;
    L.hemi = new THREE.HemisphereLight(0x8090a0, 0x151515, 0.3);
    scene.add(L.hemi);
    const moon = (L.moon = new THREE.DirectionalLight(0x9fb4d8, 0.3));
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    const sc = moon.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 1; sc.far = 120;
    moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03;
    L.moonDir = new THREE.Vector3(-0.35, 0.8, -0.5).normalize();
    scene.add(moon, moon.target);

    const fl = (L.flash = new THREE.SpotLight(0xffeedd, 0, 24, 0.46, 0.55, 1.6));
    fl.castShadow = true; fl.shadow.mapSize.set(1024, 1024); fl.shadow.camera.near = 0.1; fl.shadow.camera.far = 24; fl.shadow.bias = -0.0003; fl.shadow.normalBias = 0.02;
    scene.add(fl, fl.target);
    L.flashOn = false; L.flashLevel = 0;

    const gobo = G.tex.canvasTex(256, 256, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#f4f0e8'); g.addColorStop(0.8, '#908c86'); g.addColorStop(1, '#000000');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    });
    L.goboSearch = gobo;
    const mkSpot = (withMap) => {
      const s = new THREE.SpotLight(0xffffff, 0, 90, 0.2, 0.35, 1.2);
      s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.camera.near = 1; s.shadow.camera.far = 90; s.shadow.bias = -0.0004; s.shadow.normalBias = 0.03;
      if (withMap) s.map = gobo;
      s.shadow.autoUpdate = false;
      scene.add(s, s.target);
      return s;
    };
    L.spotA = mkSpot(true);
    L.spotB = mkSpot(false);
    L.spotB.shadow.camera.near = 0.2;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.PointLight(0xffffff, 0, 10, 2);
      scene.add(p);
      L.pool.push({ light: p, v: null });
    }
    L.add = function (o) {
      const v = {
        pos: o.pos.clone ? o.pos.clone() : new THREE.Vector3(...o.pos),
        color: new THREE.Color(o.color ?? 0xffffff), intensity: o.intensity ?? 5, distance: o.distance ?? 10,
        on: o.on ?? true, flicker: o.flicker || null, area: o.area || null, level: 1, phase: Math.random() * 100, eff: 0, mesh: o.mesh || null, emissive: o.emissive ?? 3,
      };
      L.virtual.push(v);
      return v;
    };
  };

  function flickerValue(v, t) {
    const f = v.flicker; if (!f) return 1;
    const p = v.phase;
    if (f === 'candle') return 0.78 + 0.12 * Math.sin(t * 9 + p) + 0.08 * Math.sin(t * 23.7 + p * 2) + 0.05 * Math.sin(t * 41 + p);
    if (f === 'fluoro') { const s = Math.sin(t * 0.7 + p) * Math.sin(t * 1.3 + p * 3); return s > 0.93 ? (Math.sin(t * 60) > 0 ? 0.15 : 1) : 1; }
    if (f === 'broken') { const s = Math.sin(t * 2.1 + p) + Math.sin(t * 5.3 + p * 1.7) * 0.6; return s > 1.1 ? (Math.random() < 0.5 ? 0.05 : 0.6) : 0.9 + Math.random() * 0.1; }
    if (f === 'pulse') return 0.5 + 0.5 * Math.sin(t * 5 + p);
    if (f === 'alarm') return Math.max(0, Math.sin(t * 6 + p)) * 1.2;
    if (f === 'fire') return 0.7 + 0.2 * Math.sin(t * 7 + p) + 0.1 * Math.sin(t * 17 + p) + Math.random() * 0.08;
    return 1;
  }

  const _v = new THREE.Vector3();
  E.updateLights = function (dt, t, pos) {
    const L = E.lights;
    const cam = pos ? _v.copy(pos) : camera.getWorldPosition(_v);
    const allowed = G.world && G.world.lightAreas ? G.world.lightAreas() : null;
    const cand = [];
    for (const v of L.virtual) {
      const fv = flickerValue(v, t);
      v.eff = v.on ? v.intensity * fv * v.level : 0;
      if (v.mesh && v.mesh.material && v.mesh.material.emissive) v.mesh.material.emissiveIntensity = v.on ? v.emissive * fv * v.level : 0;
      if (v.eff <= 0.001) continue;
      if (allowed && v.area && !allowed.includes(v.area)) continue;
      const d2 = v.pos.distanceToSquared(cam);
      if (d2 > (v.distance + 12) * (v.distance + 12)) continue;
      v.score = v.eff / (1 + d2 * 0.25);
      cand.push(v);
    }
    cand.sort((a, b) => b.score - a.score);
    const chosen = cand.slice(0, L.pool.length);
    for (const s of L.pool) if (s.v && !chosen.includes(s.v)) s.v = null;
    for (const v of chosen) {
      if (L.pool.some((s) => s.v === v)) continue;
      const free = L.pool.find((s) => !s.v);
      if (free) { free.v = v; free.fade = 0; }
    }
    for (const s of L.pool) {
      const l = s.light;
      if (!s.v) { l.intensity = 0; continue; }
      s.fade = Math.min(1, (s.fade ?? 1) + dt * 5);
      l.position.copy(s.v.pos); l.color.copy(s.v.color); l.distance = s.v.distance; l.intensity = s.v.eff * s.fade * E.lightScale * (s.v.poolScale ?? 1);
    }
    // moon follows the player (texel-snapped)
    const m = L.moon;
    const sz = (m.shadow.camera.right - m.shadow.camera.left) / m.shadow.mapSize.x;
    const cx = Math.round(cam.x / sz) * sz, cz = Math.round(cam.z / sz) * sz;
    m.target.position.set(cx, cam.y, cz);
    m.position.copy(m.target.position).addScaledVector(L.moonDir, 60);
    // flashlight
    const fl = L.flash;
    L.flashLevel = U.damp(L.flashLevel, L.flashOn ? 1 : 0, 18, dt);
    fl.intensity = L.flashLevel * 38 * (L.flashFlicker ?? 1) * (G.focus && G.focus.active ? 0.18 : 1);
    fl.visible = true;
  };

  // area look: smoothly blend fog, ambient, moon, grading
  E.setLook = function (o) { E.look.tgt = Object.assign(JSON.parse(JSON.stringify(LOOK_DEFAULT)), o); };
  E.snapLook = function () { E.look.cur = JSON.parse(JSON.stringify(E.look.tgt)); };
  E.updateLook = function (dt) {
    const c = E.look.cur, t = E.look.tgt, k = 1 - Math.exp(-dt * 1.6);
    for (const key in t) {
      if (Array.isArray(t[key])) for (let i = 0; i < t[key].length; i++) c[key][i] += (t[key][i] - c[key][i]) * k;
      else c[key] += (t[key] - c[key]) * k;
    }
    scene.fog.density = c.fog;
    scene.fog.color.setRGB(c.fogColor[0], c.fogColor[1], c.fogColor[2]);
    scene.background.copy(scene.fog.color);
    const L = E.lights;
    L.hemi.color.setRGB(...c.hemiSky); L.hemi.groundColor.setRGB(...c.hemiGround);
    const lf = E.weather.flash;
    L.hemi.intensity = c.hemi + lf * c.moon * 1.5;
    L.moon.intensity = c.moon * (1 + lf * 22);
    L.moon.color.setRGB(...c.moonColor);
    renderer.toneMappingExposure = c.exposure;
    E.post.sat.value = c.sat; E.post.contrast.value = c.contrast;
    E.post.lift.value.set(...c.lift); E.post.gain.value.set(...c.gain);
    bloom.strength = c.bloom;
    E.envLevel = c.env;
  };
  // apply env intensity to all materials (called when areas change)
  E.applyEnvIntensity = function (v) {
    scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial && !o.material.userData.fixedEnv) o.material.envMapIntensity = v; });
  };

  // ------------------------------------------------------------------ sky
  E.initSky = function () {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { time: { value: 0 }, flash: { value: 0 }, base: { value: new THREE.Color(0.018, 0.024, 0.036) }, glow: { value: new THREE.Color(0.1, 0.1, 0.13) } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: `
        varying vec3 vDir; uniform float time, flash; uniform vec3 base, glow;
        float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float n(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i), h(i+vec3(1,0,0)), f.x), mix(h(i+vec3(0,1,0)), h(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(h(i+vec3(0,0,1)), h(i+vec3(1,0,1)), f.x), mix(h(i+vec3(0,1,1)), h(i+vec3(1,1,1)), f.x), f.y), f.z); }
        float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a*n(p); p *= 2.03; a *= 0.5; } return s; }
        void main(){
          vec3 d = normalize(vDir);
          float up = clamp(d.y, -0.2, 1.0);
          vec3 p = d * 3.0 + vec3(time * 0.02, 0.0, time * 0.012);
          float c = fbm(p * 1.3);
          float c2 = fbm(p * 3.1 + 7.0);
          float clouds = smoothstep(0.35, 0.75, c * 0.7 + c2 * 0.3);
          vec3 col = mix(base * 0.6, base * 1.5, clouds);
          col += glow * pow(1.0 - abs(up), 6.0) * 0.6;
          col += vec3(0.55, 0.6, 0.75) * flash * (0.25 + clouds * 1.4) * smoothstep(-0.1, 0.3, up);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const sky = (E.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), mat));
    sky.frustumCulled = false;
    sky.renderOrder = -1000;
    scene.add(sky);
  };

  // ------------------------------------------------------------------ weather
  E.weather = { flash: 0, next: 6, seq: [], enabled: true, outdoor: false, rainVis: 0, rainTarget: 0 };
  E.lightning = function (dist) {
    const W = E.weather;
    dist = dist ?? Math.random();
    const strength = 1 - dist * 0.6;
    const t0 = G.time || 0;
    const pulses = 2 + Math.floor(Math.random() * 3);
    let tt = 0;
    for (let k = 0; k < pulses; k++) { W.seq.push({ at: t0 + tt, v: strength * U.range(0.5, 1) }); tt += U.range(0.05, 0.16); }
    const delay = 0.3 + dist * 2.6;
    setTimeout(() => G.audio.play('thunder', { bus: 'amb', dist, wet: 0.25, vol: 0.9 }), delay * 1000);
    G.emit('lightning', strength);
  };
  function updateWeather(dt, t) {
    const W = E.weather;
    if (W.enabled) {
      W.next -= dt;
      if (W.next <= 0) { W.next = U.range(9, 24); E.lightning(); }
    }
    let target = 0;
    for (let i = W.seq.length - 1; i >= 0; i--) {
      const s = W.seq[i];
      if (t >= s.at) { target = Math.max(target, s.v); if (t > s.at + 0.07) W.seq.splice(i, 1); }
    }
    W.flash = Math.max(target, W.flash * Math.exp(-dt * 9));
    E.sky.material.uniforms.flash.value = W.flash;
    E.sky.material.uniforms.time.value = t;
    E.post.flash.value = W.outdoor ? W.flash * 0.05 : 0;
    // rain
    W.rainVis = U.damp(W.rainVis, W.rainTarget, 3, dt);
    const r = E.rain;
    r.mesh.visible = W.rainVis > 0.02;
    r.mat.uniforms.opacity.value = W.rainVis * (0.16 + W.flash * 0.6);
    if (r.mesh.visible) {
      r.mat.uniforms.time.value = t;
      const cp = camera.getWorldPosition(_v);
      r.mat.uniforms.origin.value.copy(cp);
    }
  }

  E.initRain = function () {
    const N = 7000, pos = new Float32Array(N * 6), seed = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = U.range(-14, 14), y = U.range(0, 16), z = U.range(-14, 14);
      pos.set([x, y, z, x, y, z], i * 6);
      const s = Math.random();
      seed[i * 2] = s; seed[i * 2 + 1] = s;
    }
    const idx = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { idx[i * 2] = 0; idx[i * 2 + 1] = 1; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('endp', new THREE.BufferAttribute(idx, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { time: { value: 0 }, origin: { value: new THREE.Vector3() }, opacity: { value: 0 }, wind: { value: new THREE.Vector2(1.2, 0.5) } },
      vertexShader: `
        attribute float seed; attribute float endp; uniform float time; uniform vec3 origin; uniform vec2 wind; varying float vA;
        void main(){
          vec3 p = position;
          float speed = 11.0 + seed * 4.0;
          float y = mod(p.y - time * speed - seed * 16.0, 16.0);
          vec3 wp = vec3(p.x, y, p.z);
          wp.xz += wind * (16.0 - y) * 0.06;
          vec3 base = origin + vec3(0.0, -6.0, 0.0);
          wp.x = mod(wp.x - base.x + 14.0, 28.0) - 14.0 + base.x;
          wp.z = mod(wp.z - base.z + 14.0, 28.0) - 14.0 + base.z;
          wp.y += base.y;
          wp += endp * vec3(wind.x * 0.02, 0.32, wind.y * 0.02);
          float dc = distance(wp, cameraPosition);
          vA = (1.0 - endp * 0.9) * smoothstep(0.8, 4.0, dc) * (1.0 - smoothstep(12.0, 16.0, dc));
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: 'uniform float opacity; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.62, 0.68, 0.78) * opacity * vA, 1.0); }',
    });
    const mesh = new THREE.LineSegments(g, mat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    E.rain = { mesh, mat };
  };

  // ------------------------------------------------------------------ particles: sparks, glints, dust
  E.initParticles = function () {
    const N = 400;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, fog: false,
      uniforms: { scale: { value: innerHeight } },
      vertexShader: 'attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * 60.0 / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec3 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vC * a, 1.0); }',
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    E.parts = { g, pos, col, size, list: [], N };
  };
  // emit burst: {pos, count, color, speed, life, gravity, size, spread}
  E.burst = function (o) {
    const P = E.parts;
    for (let i = 0; i < (o.count || 30); i++) {
      if (P.list.length >= P.N) break;
      const dir = new THREE.Vector3(U.range(-1, 1), U.range(-0.2, 1), U.range(-1, 1)).normalize();
      if (o.dir) dir.lerp(o.dir, 0.6).normalize();
      P.list.push({
        p: o.pos.clone().add(new THREE.Vector3(U.range(-1, 1), U.range(-1, 1), U.range(-1, 1)).multiplyScalar(o.spread || 0.02)),
        v: dir.multiplyScalar((o.speed || 3) * U.range(0.3, 1)), life: (o.life || 0.8) * U.range(0.5, 1), age: 0,
        c: new THREE.Color(o.color ?? 0xffcc66), g: o.gravity ?? 9, s: (o.size || 0.05) * U.range(0.5, 1.2), drag: o.drag ?? 1,
      });
    }
  };
  function updateParticles(dt) {
    const P = E.parts;
    for (let i = P.list.length - 1; i >= 0; i--) {
      const q = P.list[i];
      q.age += dt;
      if (q.age >= q.life) { P.list.splice(i, 1); continue; }
      q.v.y -= q.g * dt;
      q.v.multiplyScalar(Math.exp(-q.drag * dt));
      q.p.addScaledVector(q.v, dt);
    }
    for (let i = 0; i < P.N; i++) {
      const q = P.list[i];
      if (q) {
        P.pos[i * 3] = q.p.x; P.pos[i * 3 + 1] = q.p.y; P.pos[i * 3 + 2] = q.p.z;
        const k = 1 - q.age / q.life;
        P.col[i * 3] = q.c.r * k * 3; P.col[i * 3 + 1] = q.c.g * k * 3; P.col[i * 3 + 2] = q.c.b * k * 3;
        P.size[i] = q.s;
      } else P.size[i] = 0;
    }
    P.g.attributes.position.needsUpdate = true; P.g.attributes.color.needsUpdate = true; P.g.attributes.size.needsUpdate = true;
  }

  // Volumetric beam material (fake light shaft). Geometry's local +Y runs from tip (y=0) to far end (y=1) after scaling.
  E.beamMaterial = function (color, intensity = 1, opts = {}) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: intensity }, time: { value: 0 }, flash: { value: 0 }, flashGain: { value: opts.flashGain ?? 0 }, falloff: { value: opts.falloff ?? 1.4 } },
      vertexShader: `varying float vY; varying vec3 vN; varying vec3 vW;
        void main(){ vY = uv.y; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 color; uniform float intensity, time, flash, flashGain, falloff; varying float vY; varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 V = cameraPosition - vW; float lv = length(V); V = lv > 1e-4 ? V / lv : vec3(0.0, 1.0, 0.0);
          float ln = length(vN); vec3 N = ln > 1e-4 ? vN / ln : vec3(0.0, 1.0, 0.0);
          float edge = pow(clamp(abs(dot(N, V)), 0.0, 1.0), 1.6) * smoothstep(0.0, 1.5, lv);
          float along = smoothstep(0.0, 0.08, vY) * pow(clamp(1.0 - vY, 0.0, 1.0), falloff);
          float dust = 0.85 + 0.15 * sin(vW.x * 3.0 + vW.y * 2.0 + time * 0.7) * sin(vW.z * 2.3 - time * 0.5);
          float a = edge * along * dust * (intensity + flash * flashGain);
          gl_FragColor = vec4(color * a, 1.0);
        }`,
    });
  };
  E.beams = [];
  E.addBeam = function (mesh) { E.beams.push(mesh); return mesh; };

  // Glints: sparkles that draw the eye toward small pickups
  const glintMat = new THREE.SpriteMaterial({ color: 0xfff2d0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  E.glintTex = null;
  E.addGlint = function (pos, test) {
    if (!E.glintTex) {
      E.glintTex = G.tex.canvasTex(64, 64, (ctx) => {
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,240,200,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(31, 4, 2, 56); ctx.fillRect(4, 31, 56, 2);
      });
      glintMat.map = E.glintTex;
    }
    const s = new THREE.Sprite(glintMat.clone());
    s.position.copy(pos);
    s.scale.setScalar(0.12);
    s.userData.phase = Math.random() * 10;
    s.userData.test = test;
    s.renderOrder = 10;
    scene.add(s);
    (E.glints = E.glints || []).push(s);
    return s;
  };
  function updateGlints(t) {
    if (!E.glints) return;
    const cam = camera.position;
    for (const s of E.glints) {
      const ok = G.settings.glints && (!s.userData.test || s.userData.test());
      s.visible = ok;
      if (!ok) continue;
      const d = s.position.distanceTo(cam);
      const tw = Math.pow(Math.max(0, Math.sin(t * 1.7 + s.userData.phase)), 12);
      s.material.opacity = tw * U.smoothstep(9, 3, d) * U.smoothstep(0.6, 1.4, d);
      s.material.rotation = t * 0.5;
      s.scale.setScalar(0.08 + tw * 0.08);
    }
  }

  // ------------------------------------------------------------------ frame
  E.update = function (dt, t) {
    updateWeather(dt, t);
    E.updateLights(dt, t);
    E.updateLook(dt);
    updateParticles(dt);
    updateGlints(t);
    for (const b of E.beams) { b.material.uniforms.time.value = t; b.material.uniforms.flash.value = E.weather.flash; }
    E.post.time.value = t;
    E.sky.position.copy(camera.position);
  };
  E.updateWeatherOnly = function (dt, t) {
    updateWeather(dt, t);
    E.updateLook(dt);
    E.post.time.value = t;
  };
  E.render = function () {
    composer.render();
    if (G.inspect && G.inspect.active) G.inspect.render(renderer);
  };
})();
