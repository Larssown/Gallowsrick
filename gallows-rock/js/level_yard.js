// level_yard.js — the exercise yard in the storm: searchlight stealth, cover, towers, perimeter walls
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U, B = G.B, P = G.P;
  const L = { name: 'yard' };
  G.levels.push(L);
  const S = (L.s = { detect: 0, lights: [] });
  const think = (t, o) => G.ui.think(t, o);
  const IX = () => G.interact;

  L.build = function () {
    const M = G.M, scene = G.engine.scene;
    B.area({ name: 'yard', show: ['yard', 'hall', 'chapel'], boxes: [[40.3, -1, -8.5, 84.2, 40, 28.6]], lights: ['yard'], reverb: 'outdoor', music: 'tension', outdoor: true, rain: true,
      amb: { rain: 0.95, rainMuffle: 9000, wind: 0.45, room: 0 }, look: { fog: 0.03, fogColor: [0.05, 0.058, 0.072], hemi: 0.3, hemiSky: [0.32, 0.38, 0.5], moon: 0.7, exposure: 1.2, env: 0.35, contrast: 1.06 } });
    B.setArea('yard');
    // ground
    B.floor(40.0, -8.3, 84.2, 28.4, 0, M.mud, 'mud');
    const path = (x1, z1, x2, z2) => B.box({ x: (x1 + x2) / 2, y: 0.012, z: (z1 + z2) / 2, w: Math.abs(x2 - x1), h: 0.024, d: Math.abs(z2 - z1), mat: M.asphalt, cast: false });
    path(40.3, -1.8, 84, 1.8);
    path(62, 1.8, 65.5, 28);
    path(52, 13, 63, 25.5);
    B.region(40.3, -1.8, 84, 1.8, 0.024, 'concrete'); B.region(62, 1.8, 65.5, 28, 0.024, 'concrete'); B.region(52, 13, 63, 25.5, 0.024, 'concrete');
    // court lines
    const court = G.tex.canvasTex(512, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h); ctx.strokeStyle = 'rgba(230,225,210,.75)'; ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, w - 40, h - 40); ctx.beginPath(); ctx.moveTo(20, h / 2); ctx.lineTo(w - 20, h / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 60, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeRect(w / 2 - 70, h - 20 - 150, 140, 150); ctx.strokeRect(w / 2 - 70, 20, 140, 150);
      G.tex.grunge(ctx, w, h, 0.9, 4);
    });
    B.decal(court, { x: 57.5, y: 0.03, z: 19.25, w: 10.5, h: 12.2, rx: -Math.PI / 2, rough: 0.6 });

    // exterior facade of the main building (west) with shutter opening + lit windows
    B.wall('z', 40.4, -8.3, 28.4, 0, 10, M.wallGray, [{ a0: -1.75, a1: 1.75, y0: 0, y1: 3.6 }], { thick: 0.2 });
    B.box({ x: 40.6, y: 3.8, z: 0, w: 0.4, h: 0.3, d: 4.2, mat: M.metalDark });
    const winTex = G.tex.canvasTex(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#0a0b0c'; ctx.fillRect(0, 0, w, h);
      for (let k = 0; k < 4; k++) { const lit = [1, 0, 1, 1][k]; ctx.fillStyle = lit ? '#ffcf8a' : '#10151a'; ctx.fillRect(8 + k * 62, 8, 54, h - 16); ctx.fillStyle = '#111'; ctx.fillRect(8 + k * 62 + 25, 8, 4, h - 16); ctx.fillRect(8 + k * 62, h / 2 - 2, 54, 4); }
      ctx.fillStyle = '#0a0b0c'; for (let x = 0; x < w; x += 12) ctx.fillRect(x, 0, 3, h);
    });
    [8, 14, 20, 26].forEach((z, k) => B.decal(winTex, { x: 40.52, y: 6.2, z, w: 3.2, h: 1.6, ry: Math.PI / 2, emissive: 0xffffff, emissiveIntensity: k % 2 ? 0.6 : 1.1 }));
    B.decal(G.tex.sign('NO INMATES BEYOND\nTHIS POINT', { w: 512, h: 200, bg: '#e7dfc9', fg: '#7a1c14', border: '#7a1c14', size: 50 }), { x: 40.52, y: 2.4, z: 6, w: 1.4, h: 0.55, ry: Math.PI / 2 });

    // north: gym building + wall
    B.wall('x', -8.4, 40.3, 84.2, 0, 7, M.wallGray, [], { thick: 0.3 });
    B.box({ x: 58, y: 4.2, z: -9.2, w: 24, h: 8.4, d: 1.4, mat: M.brick });
    [49, 53, 57, 61, 65].forEach((x, k) => B.decal(winTex, { x, y: 5.5, z: -8.23, w: 2.4, h: 1.2, emissive: 0xffffff, emissiveIntensity: k === 2 ? 1 : 0.15 }));
    B.decal(G.tex.sign('GYMNASIUM', { w: 512, h: 128, bg: null, fg: '#d9d0b8', size: 80, grunge: 0.6 }), { x: 58, y: 3.4, z: -8.23, w: 3.6, h: 0.9 });
    // south wall + east walls (chapel sits between z 3..17 at x=84)
    B.wall('x', 28.5, 40.3, 84.2, 0, 7, M.concrete, [], { thick: 0.4 });
    B.wall('z', 84.2, -8.4, 3.0, 0, 7, M.concrete, [], { thick: 0.4 });
    B.wall('z', 84.2, 17.0, 28.6, 0, 7, M.concrete, [], { thick: 0.4 });
    // razor wire coils on walls
    const coil = new THREE.TorusGeometry(0.28, 0.012, 4, 10);
    const wireMat = G.M.steel;
    const addCoil = (x1, z1, x2, z2, y) => {
      const n = Math.floor(Math.hypot(x2 - x1, z2 - z1) / 0.3);
      const ry = Math.atan2(x2 - x1, z2 - z1);
      for (let i = 0; i <= n; i++) { const k = i / n; B.add(coil, wireMat, { pos: [x1 + (x2 - x1) * k, y + 0.28, z1 + (z2 - z1) * k], rot: [0.2, ry, 0], uv: 'native', cast: false }); }
    };
    addCoil(40.5, 28.5, 84, 28.5, 7); addCoil(84.2, -8.3, 84.2, 3, 7); addCoil(84.2, 17, 84.2, 28.4, 7); addCoil(66, -8.4, 84, -8.4, 7);

    // cover objects
    P.crate(45.2, 3.3, 1.1, 0.2); P.crate(45.3, 4.5, 1.0, -0.1); P.crate(45.25, 3.9, 0.9, 0.4, 1.1, { col: false }); B.colBox(45.25, 1.0, 3.9, 1.0, 1.0, 1.0);
    P.bench(42.9, 3.9, 0, 2.0);
    P.cart(50.2, 6.1, 0.3); P.cart(51.5, 6.9, -0.2); P.crate(52.6, 5.6, 1.0, 0.3); P.crate(52.7, 5.6, 0.8, 0.9, 1.0, { col: false }); B.colBox(52.7, 1.0, 5.6, 0.8, 0.8, 0.8);
    buildTruck(57.5, 8.3, 0.08);
    B.box({ x: 64.2, y: 0.8, z: 11.2, w: 3.2, h: 1.6, d: 0.5, mat: M.concrete, col: true });
    B.box({ x: 64.2, y: 1.62, z: 11.2, w: 3.3, h: 0.06, d: 0.6, mat: M.metalDark });
    P.crate(70.2, 9.4, 1.1, 0.1); P.crate(71.3, 10.3, 1.0, 0.5); P.crate(70.4, 10.6, 0.8, 0.3); P.crate(70.5, 9.9, 0.9, 0.7, 1.1, { col: false }); B.colBox(70.5, 1.0, 9.9, 0.9, 0.9, 0.9);
    buildShed(76.5, 13.2);
    P.crate(80.2, 13.4, 1.1, 0.05); P.crate(80.9, 12.6, 0.9, -0.2); P.crate(80.3, 13.3, 0.9, 0.3, 1.1, { col: false }); B.colBox(80.3, 1.1, 13.3, 0.9, 0.9, 0.9);
    // benches + weights (flavour + more cover)
    P.bench(47.5, 20.5, 0, 2.2); P.bench(47.5, 22.5, 0, 2.2);
    for (let k = 0; k < 3; k++) { B.cyl({ x: 49.5 + k * 1.2, y: 0.9, z: 25.5, r: 0.02, h: 1.4, rz: Math.PI / 2, mat: M.steel }); B.cyl({ x: 48.9 + k * 1.2, y: 0.9, z: 25.5, r: 0.22, h: 0.06, rz: Math.PI / 2, mat: M.black }); B.cyl({ x: 50.1 + k * 1.2, y: 0.9, z: 25.5, r: 0.22, h: 0.06, rz: Math.PI / 2, mat: M.black }); }
    B.box({ x: 50.7, y: 0.45, z: 25.8, w: 4, h: 0.9, d: 0.4, mat: M.metalDark, col: true });
    buildHoop(57.5, 25.4);
    buildHoop(57.5, 13.1, true);
    P.barrel(68.5, 24, {}); P.barrel(69.2, 24.4, { mat: M.metalGreen });
    P.cart(74, 22, 1.2);

    // Tom's note 3 on the bench
    const note = P.model.paper(G.tex.noteTex('hand', 61));
    note.position.set(42.7, 0.48, 3.9); note.rotation.y = 0.3;
    scene.add(note);
    S.note3 = note;
    IX().add({ id: 'letter3', box: [42.7, 0.5, 3.9, 0.3, 0.1, 0.3], glint: true, prompt: () => 'Read the <b>note on the bench</b>',
      use: () => { G.setFlag('read_letter3'); G.docs.add('letter3'); } });

    // floodlight poles (off unless circuit 4 is on)
    S.floods = [[46, -6.5], [72, -6.5], [46, 26.5], [72, 26.5]].map(([x, z]) => {
      B.cyl({ x, base: 0, z, r: 0.12, h: 9, mat: M.metalGray, col: true });
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.3), P.bulbMat(0xfff4e0, 0)); head.position.set(x, 9, z); head.lookAt(60, 0, 10); scene.add(head);
      return G.lights.add({ pos: [x, 8.5, z], color: 0xfff0dc, intensity: 220, distance: 45, area: 'yard', mesh: head, emissive: 8, on: false });
    });

    // towers + searchlights
    S.towerN = buildTower(80.5, -4.5);
    S.towerS = buildTower(80.5, 25.2);
    const mkBeam = () => {
      const g = new THREE.CylinderGeometry(0.2, 0.02, 1, 24, 1, true);
      g.translate(0, 0.5, 0);
      const m = new THREE.Mesh(g, G.engine.beamMaterial(0xdfe8ff, 0.36, { falloff: 0.5 }));
      m.renderOrder = 6; m.frustumCulled = false;
      scene.add(m);
      return m;
    };
    // two lights: A (north tower, wide sweep) and B (south tower, guards the chapel approach)
    S.lights = [
      { name: 'north', pos: new THREE.Vector3(80.5, 12.6, -4.5), spot: G.lights.spotA, beam: mkBeam(), head: S.towerN.head,
        path: [[52, 3], [58, 9], [66, 4], [72, 11], [64, 18], [55, 14], [50.5, 8], [58, 2], [68, 7], [75, 14], [66, 20], [56, 11]], period: 36, t: 0, target: new THREE.Vector3(), mode: 'sweep', track: new THREE.Vector3(), searchT: 0 },
      { name: 'south', pos: new THREE.Vector3(80.5, 12.6, 25.2), spot: G.lights.spotB, beam: mkBeam(), head: S.towerS.head,
        path: [[70, 4], [77, 7], [80, 14], [72, 17], [66, 9], [74, 3]], period: 15, t: 5, target: new THREE.Vector3(), mode: 'sweep', track: new THREE.Vector3(), searchT: 0 },
    ];
    // distant lighthouse beam sweeping the low clouds
    const lh = new THREE.CylinderGeometry(9, 0.3, 1, 24, 1, true); lh.translate(0, 0.5, 0);
    S.lighthouse = new THREE.Mesh(lh, G.engine.beamMaterial(0xfff2d0, 0.05));
    S.lighthouse.position.set(170, 40, 110); S.lighthouse.scale.set(1, 260, 1); S.lighthouse.frustumCulled = false;
    scene.add(S.lighthouse);
    G.engine.addBeam(S.lighthouse);
  };

  function buildTruck(x, z, ry) {
    const M = G.M, c = Math.cos(ry), s = Math.sin(ry);
    const off = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const body = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, metalness: 0.4, roughness: 0.55, map: G.tex.sets.metalGreen.map });
    let [px, pz] = off(-0.7, 0);
    B.box({ x: px, y: 1.5, z: pz, w: 3.6, h: 2.0, d: 2.2, ry, mat: body });
    [px, pz] = off(1.9, 0);
    B.box({ x: px, y: 1.15, z: pz, w: 1.6, h: 1.5, d: 2.1, ry, mat: body });
    [px, pz] = off(2.2, 0);
    B.box({ x: px, y: 1.55, z: pz, w: 0.9, h: 0.5, d: 1.9, ry, mat: G.M.glassDirty });
    for (const [lx, lz] of [[-1.8, -1.05], [-1.8, 1.05], [0.1, -1.05], [0.1, 1.05], [2.0, -1.05], [2.0, 1.05]]) {
      [px, pz] = off(lx, lz);
      B.cyl({ x: px, y: 0.45, z: pz, r: 0.45, h: 0.3, rx: Math.PI / 2, ry, mat: M.rubber, seg: 16 });
    }
    B.box({ x, y: 0.45, z, w: 5.2, h: 0.25, d: 1.6, ry, mat: M.metalDark });
    B.colBox(x + 0.1 * c, 0, z, 5.4, 2.6, 2.3, ry);
    B.decal(G.tex.sign('U.S. BUREAU OF PRISONS', { w: 512, h: 96, bg: null, fg: '#d9d0b8', size: 46, grunge: 0.6 }), { x: x - 0.7 * c + 1.11 * s, y: 1.8, z: z + 0.7 * s + 1.11 * c, w: 2.8, h: 0.5, ry });
  }
  function buildShed(x, z) {
    const M = G.M;
    B.box({ x, y: 1.25, z, w: 3, h: 2.5, d: 3, mat: M.woodOld, col: true });
    B.box({ x, y: 2.6, z, w: 3.4, h: 0.2, d: 3.4, mat: M.metalDark });
    B.box({ x: x - 1.51, y: 1.0, z, w: 0.04, h: 2.0, d: 0.9, mat: M.woodDark });
    B.decal(G.tex.sign('TOOLS', { w: 256, h: 96, bg: '#e7dfc9', fg: '#222', size: 60 }), { x: x - 1.52, y: 2.2, z, w: 0.6, h: 0.22, ry: -Math.PI / 2 });
  }
  function buildHoop(x, z, flip) {
    const M = G.M;
    const dz = flip ? -1 : 1;
    B.cyl({ x, base: 0, z: z + dz * 0.4, r: 0.08, h: 3.2, mat: M.metalGray, col: true });
    B.box({ x, y: 3.3, z, w: 1.8, h: 1.1, d: 0.06, mat: M.white });
    B.add(new THREE.TorusGeometry(0.23, 0.015, 6, 20), M.redPaint, { pos: [x, 3.0, z - dz * 0.3], rot: [Math.PI / 2, 0, 0], uv: 'native' });
  }
  function buildTower(x, z) {
    const M = G.M, scene = G.engine.scene;
    const h = 10;
    for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) B.box({ x: x + dx, y: h / 2, z: z + dz, w: 0.3, h, d: 0.3, mat: M.concrete, col: true });
    for (let y = 2.5; y < h; y += 3) { B.box({ x, y, z: z - 1.2, w: 2.6, h: 0.15, d: 0.15, mat: M.metalDark }); B.box({ x, y, z: z + 1.2, w: 2.6, h: 0.15, d: 0.15, mat: M.metalDark }); }
    B.box({ x, y: h + 0.1, z, w: 3.4, h: 0.3, d: 3.4, mat: M.concrete });
    B.box({ x, y: h + 0.8, z: z - 1.65, w: 3.4, h: 1.2, d: 0.1, mat: M.wallGray });
    B.box({ x, y: h + 0.8, z: z + 1.65, w: 3.4, h: 1.2, d: 0.1, mat: M.wallGray });
    B.box({ x: x - 1.65, y: h + 0.8, z, w: 0.1, h: 1.2, d: 3.4, mat: M.wallGray });
    B.box({ x: x + 1.65, y: h + 0.8, z, w: 0.1, h: 1.2, d: 3.4, mat: M.wallGray });
    for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) B.box({ x: x + dx, y: h + 2.0, z: z + dz, w: 0.15, h: 1.2, d: 0.15, mat: M.metalDark });
    B.box({ x, y: h + 2.7, z, w: 4.0, h: 0.2, d: 4.0, mat: M.metalDark });
    // glass band + guard silhouette
    B.box({ x, y: h + 2.0, z, w: 3.3, h: 1.1, d: 3.3, mat: M.glassDirty });
    B.cyl({ x: x + 0.4, y: h + 1.6, z: z + 0.3, r: 0.22, h: 1.2, mat: M.black });
    B.sphere({ x: x + 0.4, y: h + 2.35, z: z + 0.3, r: 0.13, mat: M.black });
    const lampGlow = G.lights.add({ pos: [x, h + 1.8, z], color: 0xffcf8a, intensity: 3, distance: 6, area: 'yard' });
    void lampGlow;
    // searchlight head
    const head = new THREE.Group(); head.position.set(x, h + 2.6, z); scene.add(head);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.8, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2e30, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }));
    can.rotation.x = Math.PI / 2; head.add(can);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), P.bulbMat(0xeaf2ff, 14)); lens.position.z = 0.4; head.add(lens);
    return { head };
  }

  // ------------------------------------------------------------------ searchlight logic
  function pathPoint(l, t) {
    const pts = l.path, n = pts.length;
    const u = ((t / l.period) % 1 + 1) % 1 * n;
    const i = Math.floor(u), f = u - i;
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);
    return new THREE.Vector3(cr(p0[0], p1[0], p2[0], p3[0]), 0, cr(p0[1], p1[1], p2[1], p3[1]));
  }
  function aim(l) {
    const sp = l.spot;
    sp.position.copy(l.pos);
    sp.target.position.copy(l.target);
    sp.target.updateMatrixWorld();
    sp.color.setHex(0xe8f0ff);
    sp.intensity = 2600;
    sp.distance = 70;
    sp.angle = 0.115; sp.penumbra = 0.35;
    sp.shadow.needsUpdate = true;
    _dir.copy(l.target).sub(l.pos);
    const len = _dir.length();
    _dir.normalize();
    l.beam.position.copy(l.pos);
    l.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _dir);
    const r = Math.tan(sp.angle) * len * 1.05;
    l.beam.scale.set(r / 0.2, len, r / 0.2);
    l.head.lookAt(l.target);
  }
  L.bakePose = function (k) {
    S.lights.forEach((l, i) => { l.target.copy(pathPoint(l, k * l.period + i * 3)); aim(l); l.beam.visible = true; });
  };
  L.bakeEnd = function () { S.lights.forEach((l) => { l.spot.intensity = 0; l.beam.visible = false; }); wasActive = false; };
  L.resetLights = function () {
    S.detect = 0;
    S.lights.forEach((l, i) => { l.t = i * 5; l.mode = 'sweep'; l.target.copy(pathPoint(l, l.t)); });
  };
  const _dir = new THREE.Vector3(), _to = new THREE.Vector3(), _chest = new THREE.Vector3();
  let wasActive = false, warnT = 0, heartT = 0;
  L.update = function (dt, t) {
    const area = G.world.current ? G.world.current.name : '';
    const active = G.flag('shutter_open') && !G.flag('chapel_inside') && (area === 'yard' || area === 'hall' || area === 'chapel');
    const playing = G.mode === 'play' && !G.ui.readerOpen && !G.ui.invOpen && !G.inspect.active;
    // lighthouse rotation
    S.lighthouse.rotation.set(Math.PI / 2 - 0.1, t * 0.35, 0, 'YXZ');
    S.lighthouse.visible = area === 'yard' || area === 'cave' || area === 'hall';
    if (active !== wasActive) {
      wasActive = active;
      S.lights.forEach((l) => { l.spot.intensity = 0; l.beam.visible = active; l.spot.shadow.autoUpdate = false; });
      if (active) L.resetLights();
    }
    // floods
    const floods = G.flag('floods_on');
    S.floods.forEach((v) => (v.on = floods));
    if (!active) { G.ui.detect(0, false); return; }
    const pp = G.player.pos;
    const inYard = area === 'yard';
    const crouch = G.player.crouch > 0.5;
    _chest.set(pp.x, pp.y + (crouch ? 0.65 : 1.2), pp.z);
    let exposure = 0;
    for (const l of S.lights) {
      // movement of the light's aim point
      if (l.mode === 'sweep') { l.t += dt; l.target.lerp(pathPoint(l, l.t), 1 - Math.exp(-dt * 6)); }
      else if (l.mode === 'track') { l.target.lerp(new THREE.Vector3(pp.x, 0, pp.z), 1 - Math.exp(-dt * 5)); }
      else if (l.mode === 'search') {
        l.searchT -= dt;
        const s = new THREE.Vector3(l.track.x + Math.sin(t * 2.3) * 2.5, 0, l.track.z + Math.cos(t * 1.7) * 2.5);
        l.target.lerp(s, 1 - Math.exp(-dt * 3));
        if (l.searchT <= 0) l.mode = 'sweep';
      }
      const sp = l.spot;
      aim(l);
      if (!inYard || !playing || G.player.noclip) continue;
      // detection
      _to.copy(_chest).sub(l.pos);
      const dist = _to.length();
      _to.normalize();
      const cosA = _to.dot(_dir);
      const edge = Math.cos(sp.angle * 1.05), core = Math.cos(sp.angle * 0.55);
      if (cosA < edge) { if (l.mode === 'track') { l.mode = 'search'; l.searchT = 3; l.track.set(pp.x, 0, pp.z); } continue; }
      let blocked = false;
      for (const hgt of crouch ? [0.3, 0.75] : [0.45, 1.3]) {
        const tp = new THREE.Vector3(pp.x, pp.y + hgt, pp.z);
        const dv = tp.clone().sub(l.pos); const dd = dv.length(); dv.normalize();
        const org = l.pos.clone().addScaledVector(dv, 2.5);
        if (G.world.rayColliders(org, dv, dd - 2.8, (c) => c.tag !== 'noshadow') < dd - 2.8) { blocked = true; break; }
      }
      if (blocked) { if (l.mode === 'track') { l.mode = 'search'; l.searchT = 3.5; l.track.set(pp.x, 0, pp.z); } continue; }
      const k = U.clamp((cosA - edge) / (core - edge), 0, 1);
      exposure = Math.max(exposure, 0.45 + 0.55 * k);
      if (S.detect > 0.5 && l.mode !== 'track') { l.mode = 'track'; G.ui.say('Hey! Who\'s down there?!', { speaker: 'Tower', pitch: 140, pos: [l.pos.x, l.pos.y, l.pos.z], vol: 1.2, dur: 1.8 }); }
    }
    // flashlight gives you away
    if (inYard && playing && G.lights.flashOn && G.inv.has('flashlight')) {
      exposure = Math.max(exposure, 0.18);
      warnT -= dt;
      if (warnT <= 0) { warnT = 8; think('Kill the torch! They\'ll see it from the tower.'); }
    }
    // floods -> impossible
    if (inYard && playing && floods && pp.x > 41) {
      G.player.pos.x = 40.2; G.player.vel.set(0, 0, 0);
      warnT -= dt;
      if (warnT <= 0) { warnT = 5; think('The floodlights are on &mdash; it\'s bright as noon out there. I\'d be seen in a second. They\'re on the generator\'s breakers&hellip;'); }
    }
    S.exposure = exposure;
    const rate = crouch ? 0.6 : 0.85;
    if (exposure > 0) S.detect = Math.min(1, S.detect + exposure * rate * dt);
    else S.detect = Math.max(0, S.detect - dt * 0.45);
    G.music.setIntensity(S.detect);
    G.ui.detect(S.detect, inYard && (S.detect > 0.01 || exposure > 0));
    const E = G.engine;
    E.post.tint.value.setRGB(0.6, 0.05, 0.02);
    E.post.tintAmt.value = inYard ? S.detect * 0.45 : 0;
    if (S.detect > 0.25) {
      heartT -= dt;
      if (heartT <= 0) { heartT = U.lerp(0.9, 0.45, S.detect); G.audio.play('heartbeat', { bus: 'sfx', vol: 0.5 + S.detect * 0.6, wet: 0 }); }
    }
    if (S.detect >= 1 && playing) caught();
  };

  async function caught() {
    if (S.catching) return;
    S.catching = true;
    G.mode = 'cutscene';
    G.player.control = false;
    const A = G.audio, E = G.engine;
    S.lights.forEach((l) => { l.mode = 'track'; });
    A.play('siren1', { bus: 'sfx', dur: 4, vol: 0.8, wet: 0.5 });
    const sir = A.loop('siren', { bus: 'amb', vol: 0.35, wet: 0.6 });
    G.ui.say('FREEZE! Hands where I can see them!', { speaker: 'Kowalski', pitch: 135, vol: 1.3, dur: 2.2 });
    await G.tween(1.2, (k) => { E.post.flash.value = k * 0.5; });
    G.state.stats.caught++;
    await G.ui.fade(1, 0.8);
    E.post.flash.value = 0; E.post.tintAmt.value = 0;
    if (sir) sir.stop(1.5);
    G.ui.detect(0, false);
    await G.ui.caught('Kowalski\'s searchlight found you. Try again &mdash; watch the sweep, use the cover.'.replace('&mdash;', '—'));
    G.respawn();
    L.resetLights();
    S.catching = false;
  }
  L.caught = caught;

  L.apply = function () {
    S.note3.visible = true;
    L.resetLights();
    wasActive = false;
  };
})();
