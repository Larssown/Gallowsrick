// cinematics.js — exterior island scene (title: storm at night / ending: dawn at sea), intro text, wake-up, ending
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, X = window.THREEX, U = G.U;
  const C = (G.cine = { active: null });

  // ------------------------------------------------------------------ ocean shader
  function oceanMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }, amp: { value: 1 }, flash: { value: 0 },
        sunDir: { value: new THREE.Vector3(0.3, 0.2, 0.9).normalize() }, sunColor: { value: new THREE.Color(1, 0.8, 0.6) }, sunStrength: { value: 0 },
        skyTop: { value: new THREE.Color(0.02, 0.025, 0.04) }, skyHorizon: { value: new THREE.Color(0.05, 0.06, 0.08) },
        deep: { value: new THREE.Color(0.005, 0.012, 0.018) }, fogColor: { value: new THREE.Color(0.03, 0.035, 0.045) }, fogDensity: { value: 0.0025 },
        lightPos: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] }, lightDir: { value: [new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, -1, 0)] }, lightOn: { value: 0 },
      },
      vertexShader: `
        uniform float time, amp; varying vec3 vW; varying vec3 vN;
        vec3 gerstner(vec2 p, vec2 d, float a, float l, float s, inout vec3 T, inout vec3 Bn){
          float k = 6.28318 / l; float c = sqrt(9.8 / k); float f = k * (dot(d, p) - c * time * s); float q = a * k;
          T += vec3(-d.x * d.x * q * sin(f), d.x * q * cos(f), -d.x * d.y * q * sin(f));
          Bn += vec3(-d.x * d.y * q * sin(f), d.y * q * cos(f), -d.y * d.y * q * sin(f));
          return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
        }
        void main(){
          vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
          vec3 T = vec3(1.0, 0.0, 0.0), Bn = vec3(0.0, 0.0, 1.0);
          vec3 o = vec3(0.0);
          o += gerstner(p.xz, normalize(vec2(1.0, 0.3)), 0.9 * amp, 38.0, 1.0, T, Bn);
          o += gerstner(p.xz, normalize(vec2(0.6, 1.0)), 0.5 * amp, 21.0, 1.0, T, Bn);
          o += gerstner(p.xz, normalize(vec2(-0.4, 0.8)), 0.25 * amp, 9.0, 1.2, T, Bn);
          o += gerstner(p.xz, normalize(vec2(0.9, -0.5)), 0.12 * amp, 4.5, 1.3, T, Bn);
          p += o;
          vW = p; vN = normalize(cross(Bn, T));
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform float time, flash, sunStrength, fogDensity, lightOn; uniform vec3 sunDir, sunColor, skyTop, skyHorizon, deep, fogColor;
        uniform vec3 lightPos[3]; uniform vec3 lightDir[3];
        varying vec3 vW; varying vec3 vN;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec3 V = normalize(cameraPosition - vW);
          vec2 q = vW.xz * 0.35 + vec2(time * 0.3, time * 0.2);
          vec3 N = normalize(vN + vec3(n2(q) - 0.5, 0.0, n2(q + 17.3) - 0.5) * 0.18 + vec3(n2(q * 3.1) - 0.5, 0.0, n2(q * 2.7 + 5.0) - 0.5) * 0.08);
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 R = reflect(-V, N);
          vec3 sky = mix(skyHorizon, skyTop, clamp(R.y * 2.5, 0.0, 1.0)) * (1.0 + flash * 6.0);
          float spec = pow(max(dot(R, sunDir), 0.0), 300.0) * sunStrength + pow(max(dot(R, sunDir), 0.0), 20.0) * sunStrength * 0.04;
          vec3 col = mix(deep, sky, fres) + sunColor * spec;
          for (int i = 0; i < 3; i++) {
            vec3 L = normalize(lightPos[i] - vW);
            float cone = smoothstep(0.985, 0.995, dot(-L, normalize(lightDir[i])));
            col += vec3(0.8, 0.85, 0.9) * cone * lightOn * (0.25 + fres);
          }
          float foam = smoothstep(0.62, 0.9, n2(vW.xz * 0.8 + time * 0.1)) * smoothstep(0.2, 0.6, vN.y < 0.97 ? 1.0 : 0.0) * 0.15;
          col += foam * (skyHorizon + 0.05);
          float d = length(cameraPosition - vW);
          col = mix(col, fogColor, 1.0 - exp(-fogDensity * fogDensity * d * d));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }

  // ------------------------------------------------------------------ exterior scene
  C.build = function () {
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0x05070a);
    sc.fog = new THREE.FogExp2(0x070a0e, 0.0022);
    const cam = (C.cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 6000));
    G.on('resize', (w, h) => { cam.aspect = w / h; cam.updateProjectionMatrix(); });
    const hemi = new THREE.HemisphereLight(0x7080a0, 0x0a0c10, 0.3);
    const moon = new THREE.DirectionalLight(0xa6b8e0, 0.35); moon.position.set(-300, 400, -200);
    const sunL = new THREE.DirectionalLight(0xffc890, 0); sunL.position.set(1000, 120, 300);
    sc.add(hemi, moon, sunL);
    // storm sky (clone of main sky shader)
    const stormSky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), G.engine.sky.material.clone());
    stormSky.material.uniforms = THREE.UniformsUtils.clone(G.engine.sky.material.uniforms);
    stormSky.frustumCulled = false;
    sc.add(stormSky);
    // dawn sky (three.js Sky addon)
    const sky = new X.Sky(); sky.scale.setScalar(5000); sky.visible = false; sc.add(sky);
    // clamp the sun disc's extreme HDR values so bloom can't overflow (Inf -> black blotch)
    sky.material.fragmentShader = sky.material.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( min( retColor, vec3( 4.0 ) ), 1.0 );');
    sky.material.needsUpdate = true;
    const su = sky.material.uniforms;
    su.turbidity.value = 4; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.0022; su.mieDirectionalG.value = 0.78;
    // ocean (follows camera)
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 240, 240), oceanMaterial());
    ocean.rotation.x = -Math.PI / 2; ocean.frustumCulled = false;
    sc.add(ocean);
    // island
    const rockMat = G.M.rock.clone(); rockMat.color.setHex(0x7a746e);
    const ig = new THREE.CylinderGeometry(95, 140, 42, 120, 10, false);
    const ip = ig.attributes.position;
    for (let i = 0; i < ip.count; i++) {
      const x = ip.getX(i), y = ip.getY(i), z = ip.getZ(i);
      const a = Math.atan2(z, x), r = Math.hypot(x, z);
      if (r < 1) continue;
      const n = 1 + Math.sin(a * 5 + 1.3) * 0.08 + Math.sin(a * 13 + y * 0.2) * 0.04 + Math.sin(a * 29 + y * 0.5) * 0.02 + (y < 10 ? Math.sin(y * 0.8 + a * 7) * 0.03 : 0);
      ip.setXYZ(i, x * n, y, z * n);
    }
    ig.computeVertexNormals();
    const uvA = ig.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 30, uvA.getY(i) * 4);
    const island = new THREE.Mesh(ig, rockMat); island.position.set(0, -7, 0); sc.add(island);
    const prom = new THREE.Mesh(new THREE.CylinderGeometry(22, 34, 26, 40, 4), rockMat); prom.position.set(130, -5, 70); sc.add(prom);
    const top = 14;
    // prison silhouettes
    const conc = new THREE.MeshStandardMaterial({ color: 0x43464a, roughness: 0.9, map: G.tex.sets.concrete.map });
    const roofM = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.8 });
    const winTex = G.tex.canvasTex(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      for (let k = 0; k < 16; k++) { const lit = Math.random() < 0.35; ctx.fillStyle = lit ? '#ffc880' : '#07090b'; ctx.fillRect(4 + k * 16, 22, 8, 22); }
    });
    winTex.wrapS = THREE.RepeatWrapping;
    const blocks = [[-20, 0, 70, 14, 22], [30, -18, 36, 10, 14], [30, 22, 30, 11, 14], [-45, 30, 26, 8, 18], [55, 5, 18, 16, 12]];
    C.windows = [];
    blocks.forEach(([x, z, w, h, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), conc); m.position.set(x, top + h / 2, z); sc.add(m);
      const r = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.8, d + 1), roofM); r.position.set(x, top + h + 0.4, z); sc.add(r);
      for (let row = 0; row < Math.floor(h / 4); row++) {
        for (const side of [-1, 1]) {
          const t = winTex.clone(); t.repeat.set(w / 16, 1); t.needsUpdate = true; t.offset.x = Math.random();
          const wm = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 2.2), new THREE.MeshBasicMaterial({ map: t, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
          wm.position.set(x, top + 2 + row * 4, z + side * (d / 2 + 0.05)); if (side < 0) wm.rotation.y = Math.PI;
          sc.add(wm); C.windows.push(wm.material);
        }
      }
    });
    // chapel
    const ch = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 12), conc); ch.position.set(80, top + 4, 30); sc.add(ch);
    const chRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 9, 18, 4, 1), roofM); chRoof.rotation.set(0, 0, Math.PI / 2); chRoof.rotation.x = Math.PI / 4; chRoof.scale.set(1, 1, 0.55); chRoof.position.set(80, top + 10.5, 30); sc.add(chRoof);
    const bel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6, 2.4), conc); bel.position.set(71, top + 12, 30); sc.add(bel);
    const belR = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4, 4), roofM); belR.position.set(71, top + 17, 30); belR.rotation.y = Math.PI / 4; sc.add(belR);
    // perimeter wall
    const wallM = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.95 });
    [[0, -55, 190, 1.5], [0, 60, 190, 1.5], [-95, 0, 1.5, 115], [96, 0, 1.5, 115]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 7, d), wallM); m.position.set(x, top + 3.5, z); sc.add(m); });
    // towers with searchlights
    C.beams = [];
    [[92, -52], [92, 57], [-92, -52], [-92, 57]].forEach(([x, z], i) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(4, 18, 4), wallM); t.position.set(x, top + 9, z); sc.add(t);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 6), conc); cab.position.set(x, top + 19.5, z); sc.add(cab);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 8), G.P.bulbMat(0xeaf2ff, 12)); lamp.position.set(x, top + 21.5, z); sc.add(lamp);
      const g = new THREE.CylinderGeometry(9, 0.4, 1, 20, 1, true); g.translate(0, 0.5, 0);
      const beam = new THREE.Mesh(g, G.engine.beamMaterial(0xe6eeff, 0.13)); beam.position.copy(lamp.position); beam.scale.set(1, 190, 1); beam.frustumCulled = false;
      beam.userData = { phase: i * 1.7, speed: 0.12 + i * 0.03, base: Math.atan2(z, x) };
      sc.add(beam); C.beams.push(beam);
    });
    // lighthouse
    const lhM = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.6 });
    const lh = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 22, 16), lhM); lh.position.set(130, 19, 70); sc.add(lh);
    const lhTop = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3, 16), G.P.bulbMat(0xfff0c0, 10)); lhTop.position.set(130, 31.5, 70); sc.add(lhTop);
    const lhCap = new THREE.Mesh(new THREE.ConeGeometry(3, 3, 16), new THREE.MeshStandardMaterial({ color: 0x8a2a20, roughness: 0.5 })); lhCap.position.set(130, 34.5, 70); sc.add(lhCap);
    const lbg = new THREE.CylinderGeometry(22, 1, 1, 24, 1, true); lbg.translate(0, 0.5, 0);
    const lbeam = new THREE.Mesh(lbg, G.engine.beamMaterial(0xfff0cc, 0.09)); lbeam.position.set(130, 31.5, 70); lbeam.scale.set(1, 520, 1); lbeam.frustumCulled = false; sc.add(lbeam);
    C.lhBeam = lbeam;
    // ending boat (the Margaret) for the dawn ride
    const boat = new THREE.Group();
    const hg = G.boatHull ? G.boatHull(5.6, 2.0, 0.85) : new THREE.BoxGeometry(5.6, 0.8, 2);
    const hull = new THREE.Mesh(hg, G.levels.find((l) => l.name === 'cave').s.hullMat);
    boat.add(hull);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 1.24), G.M.woodOld); deck.position.set(-0.3, -0.55, 0); boat.add(deck);
    [-1.0, 0.6].forEach((x) => { const th = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 1.72), G.M.wood); th.position.set(x, -0.18, 0); boat.add(th); });
    boat.visible = false;
    sc.add(boat);
    // gulls
    C.gulls = [];
    const gullMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const gg = new THREE.Group();
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.18), gullMat); w.position.x = s * 0.45; w.userData.s = s; gg.add(w); }
      gg.userData = { r: 30 + i * 8, h: 18 + i * 3, sp: 0.15 + i * 0.03, ph: i * 1.3 };
      gg.visible = false; sc.add(gg); C.gulls.push(gg);
    }
    C.rainHost = sc;
    C.ext = { sc, cam, hemi, moon, sunL, stormSky, sky, ocean, island, boat };
  };

  // ------------------------------------------------------------------ title mode
  C.startTitle = function () {
    const e = C.ext;
    C.mode = 'title';
    C.t = 0;
    e.stormSky.visible = true; e.sky.visible = false; e.boat.visible = false;
    C.gulls.forEach((g) => (g.visible = false));
    e.sc.fog.color.setRGB(0.03, 0.035, 0.045); e.sc.fog.density = 0.0022;
    const om = e.ocean.material.uniforms;
    om.amp.value = 1.3; om.sunStrength.value = 0; om.lightOn.value = 1;
    om.skyTop.value.setRGB(0.02, 0.025, 0.04); om.skyHorizon.value.setRGB(0.05, 0.06, 0.08); om.deep.value.setRGB(0.004, 0.01, 0.016); om.fogColor.value.setRGB(0.03, 0.035, 0.045); om.fogDensity.value = 0.0022;
    e.hemi.intensity = 0.3; e.hemi.color.setHex(0x7080a0); e.moon.intensity = 0.35; e.sunL.intensity = 0;
    C.windows.forEach((m) => (m.opacity = 1));
    C.beams.forEach((b) => (b.visible = true)); C.lhBeam.visible = true;
    e.sc.add(G.engine.rain.mesh);
    G.engine.weather.rainTarget = 1; G.engine.weather.outdoor = true;
    G.engine.renderPass.scene = e.sc; G.engine.renderPass.camera = e.cam;
    const E = G.engine;
    E.setLook({ exposure: 1.1, sat: 0.85, contrast: 1.08, bloom: 0.7 }); E.snapLook();
    C.active = 'title';
  };
  C.stopExterior = function () {
    G.engine.scene.add(G.engine.rain.mesh);
    G.engine.renderPass.scene = G.engine.scene; G.engine.renderPass.camera = G.engine.camera;
    C.active = null;
  };

  // ------------------------------------------------------------------ ending mode
  C.startEnding = function () {
    const e = C.ext;
    C.mode = 'ending';
    C.t = 0;
    e.stormSky.visible = false; e.sky.visible = true; e.boat.visible = true;
    C.gulls.forEach((g) => (g.visible = true));
    C.beams.forEach((b) => (b.visible = false)); C.lhBeam.visible = false;
    C.windows.forEach((m) => (m.opacity = 0.15));
    const om = e.ocean.material.uniforms;
    om.amp.value = 0.45; om.lightOn.value = 0; om.sunStrength.value = 6;
    om.skyTop.value.setRGB(0.25, 0.35, 0.55); om.skyHorizon.value.setRGB(0.95, 0.62, 0.42); om.deep.value.setRGB(0.02, 0.05, 0.07);
    om.fogColor.value.setRGB(0.85, 0.62, 0.48); om.fogDensity.value = 0.0012;
    e.sc.fog.color.setRGB(0.85, 0.62, 0.48); e.sc.fog.density = 0.0012;
    e.hemi.intensity = 0.8; e.hemi.color.setHex(0xffd8b0); e.moon.intensity = 0; e.sunL.intensity = 2.2;
    e.sc.remove(G.engine.rain.mesh);
    G.engine.weather.rainTarget = 0; G.engine.weather.outdoor = false; G.engine.weather.enabled = false;
    G.engine.renderPass.scene = e.sc; G.engine.renderPass.camera = e.cam;
    G.engine.setLook({ exposure: 0.3, sat: 1.18, contrast: 1.08, bloom: 0.3, gain: [1.1, 0.99, 0.86], lift: [0.02, 0.01, 0.0] }); G.engine.snapLook();
    e.boat.position.set(600, 0, 40);
    C.active = 'ending';
  };

  const _v = new THREE.Vector3();
  C.update = function (dt, t) {
    if (!C.active) return;
    const e = C.ext;
    C.t += dt;
    const W = G.engine.weather;
    const om = e.ocean.material.uniforms;
    om.time.value = t;
    om.flash.value = C.mode === 'title' ? W.flash : 0;
    e.stormSky.material.uniforms.time.value = t;
    e.stormSky.material.uniforms.flash.value = W.flash;
    if (C.mode === 'title') {
      e.moon.intensity = 0.35 + W.flash * 6;
      e.hemi.intensity = 0.3 + W.flash * 1.5;
      const a = 0.9 + C.t * 0.015;
      e.cam.position.set(Math.cos(a) * 250, 6 + Math.sin(t * 0.6) * 0.8, Math.sin(a) * 250);
      e.cam.lookAt(0, 16, 0);
      e.cam.rotateZ(Math.sin(t * 0.5) * 0.015);
      // beams sweeping
      C.beams.forEach((b, i) => {
        const u = b.userData;
        const ang = u.base + Math.sin(t * u.speed + u.phase) * 0.9;
        const dir = new THREE.Vector3(Math.cos(ang), -0.12 - Math.sin(t * 0.3 + i) * 0.05, Math.sin(ang)).normalize();
        b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        if (i < 3) { om.lightPos.value[i].copy(b.position); om.lightDir.value[i].copy(dir); }
      });
      C.lhBeam.rotation.set(Math.PI / 2 - 0.04, t * 0.5, 0, 'YXZ');
    } else if (C.mode === 'ending') {
      // sun rising in the east
      const el = U.lerp(-2.0, 7.0, U.clamp(C.t / 55, 0, 1));
      const phi = THREE.MathUtils.degToRad(90 - el), theta = THREE.MathUtils.degToRad(88);
      const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      e.sky.material.uniforms.sunPosition.value.copy(sun);
      om.sunDir.value.copy(sun);
      e.sunL.position.copy(sun).multiplyScalar(1000);
      e.sunL.intensity = U.clamp((el + 1) / 4, 0, 1) * 1.6;
      G.engine.renderer.toneMappingExposure = U.lerp(0.3, 0.42, U.clamp(C.t / 40, 0, 1));
      // boat moves east
      const b = e.boat;
      b.position.x += dt * 3.2;
      b.position.y = Math.sin(t * 1.1) * 0.12 + 0.1;
      b.rotation.set(Math.sin(t * 0.9) * 0.03, 0, Math.sin(t * 1.3) * 0.04);
      const seat = b.localToWorld(_v.set(-1.7, 0.95, 0.15));
      e.cam.position.copy(seat);
      // look back at the island first, then turn toward the sunrise
      const k = U.smoothstep(12, 30, C.t);
      const back = new THREE.Vector3(0, 12, 0);
      const fwd = seat.clone().add(new THREE.Vector3(100, -4, -6));
      e.cam.lookAt(back.lerp(fwd, k));
      C.gulls.forEach((g) => {
        const u = g.userData;
        const a = t * u.sp + u.ph;
        g.position.set(b.position.x + 30 + Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.ph) * 2, b.position.z + Math.sin(a) * u.r);
        g.rotation.y = -a;
        g.children.forEach((w) => { w.rotation.z = w.userData.s * Math.sin(t * 6 + u.ph) * 0.5; });
      });
    }
    e.ocean.position.set(Math.round(e.cam.position.x / 10) * 10, 0, Math.round(e.cam.position.z / 10) * 10);
    e.stormSky.position.copy(e.cam.position);
    e.sky.position.copy(e.cam.position);
    G.audio.updateListener(e.cam);
  };

  // ------------------------------------------------------------------ intro text
  C.intro = async function () {
    const box = G.$('#intro-text');
    const lines = [
      ['GALLOWS ROCK FEDERAL PENITENTIARY', 'big'],
      ['Eleven miles off the coast of Maine.', ''],
      ['October 13th, 1971. &nbsp;11:47 p.m.', ''],
      ['In thirty-eight years, nobody has ever escaped.', ''],
      ['', ''],
      ['Tonight a storm is coming in off the Atlantic.', ''],
      ['Tom said it would.', ''],
    ];
    box.innerHTML = '';
    G.ui.show('#intro', true);
    C.skipIntro = false;
    const els = lines.map(([, cls]) => { const el = document.createElement('div'); el.className = 'line ' + cls; el.innerHTML = '&nbsp;'; box.appendChild(el); return el; });
    for (let li = 0; li < lines.length; li++) {
      const [txt, cls] = lines[li];
      if (C.skipIntro) break;
      const el = els[li];
      el.classList.add('on');
      const plain = txt.replace(/&nbsp;/g, ' ');
      for (let i = 0; i <= plain.length; i++) {
        if (C.skipIntro) break;
        el.textContent = plain.slice(0, i) || '\u00a0';
        if (plain[i] && plain[i] !== ' ') G.audio.play('typeKey', { bus: 'ui', vol: 0.35, wet: 0.05 });
        await G.wait(cls === 'big' ? 0.06 : 0.042, true);
      }
      el.textContent = plain || '\u00a0';
      if (plain) G.audio.play('typeBell', { bus: 'ui', vol: 0.15, wet: 0.2 });
      await G.wait(plain ? 1.1 : 0.6, true);
    }
    if (!C.skipIntro) await G.wait(1.6, true);
    await G.ui.fade(1, 0.8);
    G.ui.show('#intro', false);
  };

  // ------------------------------------------------------------------ wake up in the cell
  C.wakeUp = async function () {
    const cam = G.engine.camera, E = G.engine;
    G.camOverride = true;
    const lie = new THREE.Vector3(14.45, 0.78, 4.05);
    cam.position.copy(lie);
    cam.rotation.set(Math.PI / 2 - 0.15, Math.PI, 0, 'YXZ');
    E.post.lid.value = 1;
    E.post.fade.value = 0;
    G.ui.fadeNow(0);
    await G.wait(1.0);
    E.lightning(0.1);
    await G.tween(0.5, (k) => { E.post.lid.value = 1 - k * 0.7; });
    await G.tween(0.25, (k) => { E.post.lid.value = 0.3 + k * 0.7; });
    await G.wait(0.5);
    G.audio.play('breath', { bus: 'voice', vol: 0.5, dur: 1.6 });
    await G.tween(1.2, (k) => { E.post.lid.value = 1 - U.easeOut(k); });
    await G.wait(0.8);
    // sit up and turn
    const p0 = lie.clone(), q0 = cam.quaternion.clone();
    const p1 = new THREE.Vector3(13.8, 1.1, 4.3);
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.05, Math.PI * 0.62, 0.05, 'YXZ'));
    await G.tween(2.0, (k) => { cam.position.lerpVectors(p0, p1, k); cam.position.y += Math.sin(k * Math.PI) * 0.1; cam.quaternion.slerpQuaternions(q0, q1, k); }, { ease: U.easeInOut });
    const p2 = new THREE.Vector3(13.55, 1.62, 3.9);
    const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, Math.PI, 0, 'YXZ'));
    await G.tween(1.4, (k) => { cam.position.lerpVectors(p1, p2, k); cam.quaternion.slerpQuaternions(q1, q2, k); }, { ease: U.easeInOut });
    G.player.teleport(13.55, 0, 3.9, Math.PI, 0.12);
    G.camOverride = false;
    E.post.lid.value = 0;
    E.lightning(0.3);
    await G.ui.think('The storm Tom promised.');
    await G.ui.think('It\'s tonight.');
  };

  // ------------------------------------------------------------------ ending sequence
  C.ending = async function () {
    const E = G.engine;
    G.mode = 'ending';
    G.ui.show('#hud', false);
    await G.ui.fade(1, 2.2);
    G.levels.find((l) => l.name === 'cave').stopAlarm();
    G.audio.setAmbience({ rain: 0, wind: 0.08, waves: 0.55, room: 0 }, 3);
    G.audio.setReverb('sea');
    C.startEnding();
    G.music.setMood('ending', { force: true });
    await G.wait(1.5, true);
    G.ui.fade(0, 4);
    const inner = G.$('#end-inner');
    inner.innerHTML = '';
    G.ui.show('#ending', true);
    const show = async (html, cls = 'eline', hold = 3.4) => {
      const el = document.createElement('div');
      el.className = cls; el.innerHTML = html;
      inner.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      await G.wait(hold, true);
      return el;
    };
    const clear = async () => { [...inner.children].forEach((c) => c.classList.remove('on')); await G.wait(1.8, true); inner.innerHTML = ''; };
    await G.wait(4, true);
    setTimeout(() => G.audio.play('gull', { bus: 'amb', vol: 0.5, wet: 0.5 }), 1500);
    await show('Dawn, October 14th, 1971.', 'eline', 4);
    await show('Somewhere behind you, the siren on Gallows Rock is still wailing.', 'eline', 5);
    await clear();
    await G.wait(4, true);
    G.audio.play('gull', { bus: 'amb', vol: 0.4, wet: 0.5 });
    await show('Officially, nobody has ever escaped from Gallows Rock.', 'eline', 4.5);
    await show('The file on inmate 4127 was closed as <i>"presumed drowned."</i>', 'eline', 5);
    await clear();
    await show('Tom Harlan died in the prison infirmary eleven days later.', 'eline', 4.5);
    await show('His brother Eddie kept one last letter from him for the rest of his life.', 'eline', 4.5);
    await show('It said only: <i>"He made it. Worth every one of the thirty years."</i>', 'eline', 6);
    await clear();
    const st = G.state.stats;
    const docs = G.state.docs.length, total = Object.keys(G.DOCS).length;
    await show('GALLOWS ROCK', 'eline etitle', 1.5);
    const el = document.createElement('div');
    el.className = 'eline';
    el.innerHTML = `<div class="stats"><span>Time</span><span>${U.fmtTime(st.endTime || st.time)}</span><span>Documents</span><span>${docs} / ${total}</span><span>Hints used</span><span>${st.hints}</span><span>Times caught</span><span>${st.caught}</span></div>
      <p style="margin-top:22px;font-size:16px;opacity:.8">Thank you for playing.</p>
      <nav class="menu"><button data-act="title">Return to title</button></nav>`;
    inner.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    el.querySelector('button').addEventListener('click', () => { G.audio.play('uiClick', { bus: 'ui' }); G.toTitle(); });
    G.clearSave();
    G.input.exitLock();
  };
})();
