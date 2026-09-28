// level_cave.js — the sea cave: Eddie's boat, the outboard puzzle, the alarm and the escape
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U, B = G.B, P = G.P;
  const L = { name: 'cave' };
  G.levels.push(L);
  const S = (L.s = {});
  const think = (t, o) => G.ui.think(t, o);
  const IX = () => G.interact;
  const WATER_Y = -9.2;
  const TIME_LIMIT = 200;

  L.build = function () {
    const M = G.M, scene = G.engine.scene;
    B.area({ name: 'cave', show: ['cave', 'tunnel'], boxes: [[100, -25, 30.2, 400, 30, 90]], lights: ['cave', 'tunnel'], reverb: 'cave', music: 'dark',
      amb: { rain: 0.35, rainMuffle: 2500, waves: 0.9, wind: 0.25, room: 0.1 }, look: { fog: 0.03, fogColor: [0.02, 0.03, 0.04], hemi: 0.1, hemiSky: [0.3, 0.38, 0.5], moon: 0.35, exposure: 1.2, env: 0.35 } });
    B.setArea('cave');
    buildShell();
    // ledge + rocks
    B.box({ x: 122, y: -8.6, z: 33.2, w: 20, h: 1.2, d: 6.6, mat: M.rock, cast: false });
    B.region(112, 30, 132, 36.5, -8.0, 'stone');
    const rng = U.rng(7);
    for (let k = 0; k < 18; k++) {
      const x = 112 + rng() * 20, z = 30.5 + rng() * 5.5;
      if (Math.abs(x - 122) < 2.5 && z < 33) continue;
      if (x > 117 && x < 136 && z > 35.3) continue;
      const r = 0.3 + rng() * 0.8;
      const g = new THREE.IcosahedronGeometry(r, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const s = 0.75 + rng() * 0.45; p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.7, p.getZ(i) * s); }
      g.computeVertexNormals();
      B.add(g, M.rockDark, { pos: [x, -8.0 + r * 0.2, z], rot: [rng(), rng() * 6, rng()], uv: 'native' });
      if (r > 0.5) B.colBox(x, -8.0, z, r * 1.6, r, r * 1.6);
    }
    // dock
    const dockMat = M.woodOld;
    B.region(118, 36.3, 138, 38.6, -8.12, 'wood');
    for (let x = 118.1; x < 138; x += 0.32) B.box({ x, y: -8.2, z: 37.45, w: 0.28, h: 0.08, d: 2.2, mat: dockMat, cast: false });
    for (let x = 118.5; x <= 138; x += 2.4) for (const z of [36.45, 38.45]) B.cyl({ x, base: -10.5, z, r: 0.12, h: 2.5, mat: M.woodDark });
    B.box({ x: 128, y: -8.32, z: 36.45, w: 20, h: 0.15, d: 0.15, mat: M.woodDark });
    B.box({ x: 128, y: -8.32, z: 38.45, w: 20, h: 0.15, d: 0.15, mat: M.woodDark });
    // lantern on a post
    B.cyl({ x: 126.9, base: -8.2, z: 36.55, r: 0.06, h: 1.9, mat: M.woodDark });
    B.box({ x: 126.9, y: -6.35, z: 36.8, w: 0.05, h: 0.05, d: 0.5, mat: M.woodDark });
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.18, 12), P.bulbMat(0xffa850, 3)); lg.position.set(126.9, -6.65, 37.0); scene.add(lg);
    S.lantern = G.lights.add({ pos: [126.9, -6.8, 37.1], color: 0xff9a48, intensity: 9, distance: 14, flicker: 'fire', area: 'cave', mesh: lg, emissive: 3 });
    S.mouthGlow = G.lights.add({ pos: [146, -6, 43], color: 0x6f86a8, intensity: 6, distance: 30, area: 'cave' });
    // crates & gear on the dock
    P.crate(119.2, 37.0, 0.6, 0.3, -8.12); P.barrel(120.2, 37.8, { y: -8.12, mat: M.metalRed });
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 16), M.rope); coil.rotation.x = Math.PI / 2; coil.position.set(121, -8.08, 37.0); scene.add(coil);
    // water
    const wn = G.tex.sets.waterN.clone(); wn.wrapS = wn.wrapT = THREE.RepeatWrapping; wn.repeat.set(60, 60); wn.needsUpdate = true;
    S.waterNormal = wn;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: 0x0b1a1e, roughness: 0.2, metalness: 0.2, normalMap: wn, normalScale: new THREE.Vector2(0.3, 0.3) }));
    water.rotation.x = -Math.PI / 2; water.position.set(250, WATER_Y, 60);
    water.receiveShadow = true;
    scene.add(water);
    S.water = water;
    buildBoat();
    // tunnel-mouth guard beams (appear late in the countdown)
    S.guardBeams = [0, 1].map(() => {
      const g = new THREE.CylinderGeometry(0.9, 0.05, 1, 16, 1, true); g.translate(0, 0.5, 0);
      const m = new THREE.Mesh(g, G.engine.beamMaterial(0xfff4dc, 0.12)); m.visible = false; m.scale.set(1, 9, 1); m.frustumCulled = false; scene.add(m);
      G.engine.addBeam(m);
      return m;
    });
    G.audio.addEmitter({ sound: 'splash', pos: new THREE.Vector3(140, WATER_Y, 42), min: 3, max: 7, range: 40, opts: { vol: 0.5, wet: 0.8 } });
    G.audio.addEmitter({ sound: 'drip', pos: new THREE.Vector3(118, -8, 33), min: 1.5, max: 4, range: 20, opts: { vol: 0.6, wet: 0.9 } });
  };

  function buildShell() {
    const M = G.M, scene = G.engine.scene;
    const c = new THREE.Vector3(126, -6, 42), R = new THREE.Vector3(26, 11, 15);
    let g = new THREE.SphereGeometry(1, 128, 64);
    g = g.toNonIndexed();
    const p = g.attributes.position;
    const rng = U.rng(33);
    const noiseAt = (x, y, z) => Math.sin(x * 3.1 + y * 1.7) * 0.06 + Math.sin(z * 4.3 - x * 2.2) * 0.05 + Math.sin(y * 6.1 + z * 2.9) * 0.03;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + noiseAt(x, y, z) + (rng() - 0.5) * 0.015;
      p.setXYZ(i, c.x + x * R.x * n, c.y + y * R.y * n * (y < 0 ? 0.6 : 1), c.z + z * R.z * n);
    }
    // cut openings: sea mouth (east) and tunnel entrance (north side)
    const keep = [];
    for (let i = 0; i < p.count; i += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) { cx += p.getX(i + k); cy += p.getY(i + k); cz += p.getZ(i + k); }
      cx /= 3; cy /= 3; cz /= 3;
      const mouth = cx > 143 && cy > -12 && cy < 1.5 + (Math.sin(cz) * 0.8) && cz > 35 && cz < 51;
      const tunnel = cx > 120 && cx < 124.2 && cz < 32 && cy > -9 && cy < -4.8;
      if (!mouth && !tunnel) keep.push(i);
    }
    const pos2 = new Float32Array(keep.length * 9), uv2 = new Float32Array(keep.length * 6);
    const uv = g.attributes.uv;
    keep.forEach((i, j) => { for (let k = 0; k < 3; k++) { pos2[j * 9 + k * 3] = p.getX(i + k); pos2[j * 9 + k * 3 + 1] = p.getY(i + k); pos2[j * 9 + k * 3 + 2] = p.getZ(i + k); uv2[j * 6 + k * 2] = uv.getX(i + k) * 10; uv2[j * 6 + k * 2 + 1] = uv.getY(i + k) * 5; } });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
    sg.setAttribute('uv', new THREE.BufferAttribute(uv2, 2));
    sg.computeVertexNormals();
    const mat = M.rockDark.clone(); mat.side = THREE.BackSide;
    const mesh = new THREE.Mesh(sg, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    S.shell = mesh;
    // boulders around the sea mouth hide the cut edge
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * Math.PI;
      const z = 43 + Math.cos(a) * 8.5, y = -9.5 + Math.sin(a) * 10.5;
      const r = 1.4 + rng() * 1.6;
      const bg = new THREE.IcosahedronGeometry(r, 1);
      const bp = bg.attributes.position;
      for (let i = 0; i < bp.count; i++) { const s = 0.7 + rng() * 0.5; bp.setXYZ(i, bp.getX(i) * s, bp.getY(i) * s, bp.getZ(i) * s); }
      bg.computeVertexNormals();
      B.add(bg, M.rockDark, { pos: [143.5 + rng() * 2.5, y, z], rot: [rng() * 3, rng() * 3, rng() * 3], uv: 'native', uvScale: [2, 2] });
    }
    // stalactites
    for (let k = 0; k < 26; k++) {
      const x = 108 + rng() * 34, z = 32 + rng() * 20;
      const h = 0.6 + rng() * 2.2;
      const ny = (x - c.x) / R.x, nz = (z - c.z) / R.z;
      const top = c.y + R.y * Math.sqrt(Math.max(0, 1 - ny * ny - nz * nz)) * 0.95;
      if (top < -2) continue;
      B.add(new THREE.ConeGeometry(0.15 + rng() * 0.25, h, 7), M.rock, { pos: [x, top - h / 2 + 0.3, z], rot: [Math.PI, rng() * 3, 0], uv: 'native' });
    }
    // tunnel mouth frame
    B.box({ x: 120.6, y: -6.5, z: 30.8, w: 1.2, h: 3.6, d: 1.4, mat: M.rock });
    B.box({ x: 123.6, y: -6.5, z: 30.8, w: 1.2, h: 3.6, d: 1.4, mat: M.rock });
    B.box({ x: 122.1, y: -4.6, z: 30.8, w: 4.2, h: 0.8, d: 1.4, mat: M.rock });
  }

  // ------------------------------------------------------------------ the boat
  function hullGeometry(len, beam, depth) {
    const ST = 18, RG = 12;
    const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= ST; i++) {
      const t = i / ST;
      const hw = (beam / 2) * (0.84 + 0.16 * Math.sin(Math.min(1, t / 0.6) * Math.PI / 2)) * (t > 0.62 ? Math.cos(((t - 0.62) / 0.38) * Math.PI / 2) : 1) + 0.0001;
      const top = 0.1 * t * t + 0.05;
      const dep = depth * (1 - 0.35 * t * t);
      for (let j = 0; j <= RG; j++) {
        const a = (j / RG) * Math.PI;
        const px = -Math.cos(a) * hw;
        const py = top - Math.pow(Math.sin(a), 0.55) * dep;
        pos.push(t * len - len / 2, py, px);
        uvs.push(t, j / RG);
      }
    }
    for (let i = 0; i < ST; i++) for (let j = 0; j < RG; j++) {
      const a = i * (RG + 1) + j, b = a + RG + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  G.boatHull = hullGeometry;
  function buildBoat() {
    const M = G.M, scene = G.engine.scene;
    const boat = new THREE.Group();
    boat.position.set(128.5, WATER_Y + 0.5, 39.9);
    scene.add(boat);
    S.boat = boat;
    S.boatBase = boat.position.clone();
    const len = 5.6, beam = 2.0, depth = 0.85;
    const paint = G.tex.canvasTex(256, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2c4a3a'); g.addColorStop(0.1, '#2c4a3a'); g.addColorStop(0.12, '#e8e2d2'); g.addColorStop(0.36, '#e0d9c6'); g.addColorStop(0.38, '#7a2a1c');
      g.addColorStop(0.62, '#7a2a1c'); g.addColorStop(0.64, '#e0d9c6'); g.addColorStop(0.88, '#e8e2d2'); g.addColorStop(0.9, '#2c4a3a'); g.addColorStop(1, '#2c4a3a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; for (let x = 0; x < w; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      G.tex.grunge(ctx, w, h, 0.5, 17);
    });
    const hullMat = (S.hullMat = new THREE.MeshStandardMaterial({ map: paint, roughness: 0.6, side: THREE.DoubleSide }));
    const hull = new THREE.Mesh(hullGeometry(len, beam, depth), hullMat);
    hull.castShadow = true; hull.receiveShadow = true;
    boat.add(hull);
    // transom
    const tw = beam / 2 * 0.84;
    const sh = new THREE.Shape(); sh.moveTo(-tw, 0.05);
    for (let j = 0; j <= 12; j++) { const a = (j / 12) * Math.PI; sh.lineTo(-Math.cos(a) * tw, 0.05 - Math.pow(Math.sin(a), 0.55) * depth); }
    sh.lineTo(tw, 0.05);
    const tr = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.7, side: THREE.DoubleSide, map: G.tex.sets.wood.map }));
    tr.rotation.y = Math.PI / 2; tr.position.x = -len / 2; boat.add(tr);
    // floorboards, thwarts, gunwale
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len * 0.75, 0.04, beam * 0.62), M.woodOld); deck.position.set(-0.3, -0.55, 0); deck.receiveShadow = true; boat.add(deck);
    [[-1.0], [0.6]].forEach(([x]) => { const th = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, beam * 0.86), M.wood); th.position.set(x, -0.18, 0); th.castShadow = true; boat.add(th); });
    const name = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.2), new THREE.MeshStandardMaterial({ map: G.tex.sign('MARGARET', { w: 512, h: 112, bg: null, fg: '#1c2a24', size: 80, font: 'Georgia, serif', grunge: 0.4 }), transparent: true }));
    name.position.set(1.2, -0.08, beam / 2 * 0.93 + 0.02); name.rotation.y = -0.12; boat.add(name);
    // bow cleat + rope to dock
    const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), M.metalDark); cleat.position.set(2.3, 0.12, 0); boat.add(cleat);
    S.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), M.rope);
    scene.add(S.rope);
    S.dockCleat = new THREE.Vector3(131.4, -8.06, 38.4);
    B.box({ x: 131.4, y: -8.08, z: 38.35, w: 0.25, h: 0.06, d: 0.08, mat: M.metalDark });
    IX().add({ id: 'rope', box: [131.4, -8.0, 38.35, 0.5, 0.3, 0.4], enabled: () => !G.flag('rope_untied'), prompt: () => 'Untie the <b>mooring rope</b>',
      use: () => { G.setFlag('rope_untied'); G.audio.play('whoosh', { pos: S.dockCleat, dur: 0.5, to: 1800, v: 0.5 }); G.audio.play('splash', { pos: S.dockCleat, v: 0.3 }); think('Untied. Nothing holding her now but me.'); } });
    // Eddie's note on the aft thwart
    const note = P.model.paper(G.tex.noteTex('hand', 101)); note.position.set(-1.0, -0.15, 0.2); note.rotation.y = 0.4; boat.add(note);
    S.eddieNote = note;
    IX().add({ id: 'eddie', box: [127.5, -8.8, 40.1, 0.6, 0.4, 0.8], range: 3.2, glint: true, prompt: () => 'Read the <b>note in the boat</b>', use: () => { G.setFlag('read_eddie'); G.docs.add('eddie'); } });
    // outboard motor
    const ob = new THREE.Group(); ob.position.set(-len / 2 - 0.12, 0.1, 0); boat.add(ob);
    const cowl = new THREE.MeshStandardMaterial({ color: 0x1a3a5a, metalness: 0.4, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.34), cowl); body.position.set(-0.1, 0.25, 0); ob.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), cowl); cap.scale.set(1, 0.5, 0.75); cap.position.set(-0.1, 0.46, 0); ob.add(cap);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 10), M.metalDark); shaft.position.set(-0.08, -0.45, 0); ob.add(shaft);
    const skeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.06), M.metalDark); skeg.position.set(-0.08, -0.95, 0); ob.add(skeg);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.2), M.metalGray); clamp.position.set(0.12, 0.05, 0); ob.add(clamp);
    B.decal(G.tex.sign('SEA KING  12 HP', { w: 512, h: 96, bg: null, fg: '#e8e2d0', size: 58, grunge: 0.3 }), { parent: ob, x: -0.1, y: 0.42, z: 0.171, w: 0.34, h: 0.065 });
    B.decal(G.tex.sign('SEA KING  12 HP', { w: 512, h: 96, bg: null, fg: '#e8e2d0', size: 58, grunge: 0.3 }), { parent: ob, x: -0.1, y: 0.42, z: -0.171, w: 0.34, h: 0.065, ry: Math.PI });
    // tiller + gear
    const tiller = new THREE.Group(); tiller.position.set(0.12, 0.18, 0); ob.add(tiller);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.6, 10), M.metalGray); arm.rotation.z = Math.PI / 2 + 0.25; arm.position.set(0.3, 0.07, 0); tiller.add(arm);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12), M.rubber); grip.rotation.z = Math.PI / 2 + 0.25; grip.position.set(0.62, 0.15, 0); tiller.add(grip);
    // controls (on the -z side of the cowling, facing the dock/player)
    const ctrl = new THREE.Group(); ctrl.position.set(-0.1, 0.22, -0.175); ctrl.rotation.y = Math.PI; ob.add(ctrl);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshStandardMaterial({ color: 0x15283c, roughness: 0.5, metalness: 0.3 })); plate.position.z = 0.002; ctrl.add(plate);
    const mkLabel = (t, x, y) => B.decal(G.tex.label(t, { w: 192, h: 56, bg: '#0e1a28', fg: '#f0e8d4' }), { parent: ctrl, x, y, z: 0.006, w: 0.085, h: 0.026 });
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xd8a62a, roughness: 0.4, metalness: 0.2 });
    S.valve = new THREE.Group(); S.valve.position.set(-0.13, 0.07, 0.02); ctrl.add(S.valve);
    const vl = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.1, 0.022), M.redPaint); vl.position.y = 0.04; S.valve.add(vl);
    const vb = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 12), M.chrome); vb.rotation.x = Math.PI / 2; S.valve.add(vb);
    mkLabel('FUEL', -0.13, 0.012);
    S.choke = new THREE.Group(); S.choke.position.set(0.0, 0.075, 0.01); ctrl.add(S.choke);
    const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.028, 16), knobMat); ck.rotation.x = Math.PI / 2; ck.position.z = 0.018; S.choke.add(ck);
    const cs = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), M.chrome); cs.rotation.x = Math.PI / 2; S.choke.add(cs);
    S.chokeKnob = ck;
    mkLabel('CHOKE', 0.0, 0.012);
    S.cord = new THREE.Group(); S.cord.position.set(0.13, 0.075, 0.025); ctrl.add(S.cord);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xb02a1c, roughness: 0.6 })); hd.rotation.z = Math.PI / 2; S.cord.add(hd);
    const cordLine = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 4), M.rope); cordLine.position.y = 0; S.cord.add(cordLine);
    S.cordLine = cordLine; cordLine.visible = false;
    mkLabel('PULL', 0.13, 0.012);
    S.gear = new THREE.Group(); S.gear.position.set(0.0, -0.13, 0.01); ctrl.add(S.gear);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.09, 0.022), M.chrome); gl.position.y = 0.04; S.gear.add(gl);
    const gk = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), M.redPaint); gk.position.y = 0.09; S.gear.add(gk);
    mkLabel('N  \u2194  FWD', 0.0, -0.138);
    S.outboard = ob;
    S.ctrl = ctrl;
    [S.valve, S.choke, S.cord, S.gear].forEach((o) => (o.userData.keep = true));
    B.bakeGroup(ctrl);
    ctrl.userData.keep = true; note.userData.keep = true;
    B.bakeGroup(ob);
    ob.userData.keep = true;
    B.bakeGroup(boat);
    IX().add({ id: 'motor', box: [125.6, -8.35, 39.9, 0.8, 0.9, 0.8], range: 2.8, enabled: () => !G.flag('escaped'), prompt: () => 'Work the <b>outboard motor</b>', use: () => focusMotor() });
    // dock end near the motor
    B.region(125, 38.5, 127, 38.9, -8.12, 'wood');
  }

  // ------------------------------------------------------------------ outboard focus puzzle
  S.pulls = 0; S.warm = false;
  function focusMotor() {
    const center = S.ctrl.localToWorld(new THREE.Vector3(0, 0, 0));
    const parts = [
      { obj: S.valve, click: () => { const on = !G.flag('fuel_on'); G.setFlag('fuel_on', on); G.audio.play('switch', { pos: center, freq: 1500 }); updateMotor(); } },
      { obj: S.choke, click: () => { const out = !G.flag('choke_out'); G.setFlag('choke_out', out); G.audio.play('tick', { pos: center, freq: 1200 }); updateMotor(); if (!out && S.running && S.rough) { S.rough = false; S.floodT = 0; if (S.engine) S.engine.set('rpm', 1); think('Smooth. She\'s purring.'); G.setFlag('boat_running'); } } },
      { obj: S.cord, click: () => pullCord() },
      { obj: S.gear, click: () => shiftGear() },
    ];
    G.focus.enter({ pos: center.clone().add(new THREE.Vector3(-0.04, 0.22, -0.55)), look: center.clone().add(new THREE.Vector3(0, -0.02, 0)), parts,
      help: '<span class="key">Click</span> valve, choke, cord, gear &nbsp; <span class="key">RMB</span> step back' });
  }
  function updateMotor() {
    S.valve.rotation.z = G.flag('fuel_on') ? -Math.PI / 2 : 0;
    S.choke.position.z = G.flag('choke_out') ? 0.05 : 0.01;
    S.gear.rotation.z = G.flag('gear_fwd') ? -0.5 : 0.3;
  }
  async function pullCord() {
    if (S.pulling) return;
    S.pulling = true;
    const center = S.ctrl.localToWorld(new THREE.Vector3(0.12, 0.06, 0));
    G.audio.play('pullCord', { pos: center });
    S.cordLine.visible = true;
    await G.tween(0.25, (k) => { S.cord.position.z = 0.025 + Math.sin(k * Math.PI) * 0.45; S.cordLine.scale.y = Math.sin(k * Math.PI) * 0.45 + 0.001; S.cordLine.position.z = -S.cordLine.scale.y / 2; S.cordLine.rotation.x = Math.PI / 2; });
    S.cordLine.visible = false;
    S.pulling = false;
    if (S.running) { think('She\'s already running.'); return; }
    const fuel = G.flag('fuel_on'), choke = G.flag('choke_out');
    if (!fuel) { S.pulls = 0; setTimeout(() => think('Nothing but the cord. No fuel reaching her &mdash; the valve.'), 300); return; }
    S.pulls++;
    const need = S.warm ? 2 : 3;
    if (!choke && !S.warm) { G.audio.play('sputter', { pos: center, n: 1 }); if (S.pulls >= 3) setTimeout(() => think('Cold as a witch\'s heart. Eddie said to pull the choke out.'), 400); return; }
    if (S.pulls < need) { G.audio.play('sputter', { pos: center, n: S.pulls + 1 }); return; }
    // she starts!
    G.audio.play('sputter', { pos: center, n: 4 });
    S.running = true; S.pulls = 0; S.warm = true;
    S.engine = G.audio.loop('engine', { pos: center, vol: 1.0, freq: 38, lp: 1200, mech: 0.1, rasp: 6, ref: 2 });
    if (choke) { S.rough = true; S.floodT = 5; if (S.engine) S.engine.set('rpm', 0.8); setTimeout(() => S.rough && think('She\'s running rough &mdash; push the choke back in!'), 700); }
    else { S.rough = false; G.setFlag('boat_running'); think('She\'s running!'); }
    G.music.setIntensity(0.8);
  }
  async function stall() {
    S.running = false; S.rough = false;
    if (S.engine) { S.engine.stop(0.3); S.engine = null; }
    G.setFlag('boat_running', false);
    G.audio.play('sputter', { pos: S.boat.position, n: 3 });
    think('Flooded &mdash; she died. Choke in, then pull again.');
  }
  async function shiftGear() {
    const center = S.ctrl.localToWorld(new THREE.Vector3(0, -0.1, 0));
    G.audio.play('switch', { pos: center, freq: 900 });
    if (!S.running || S.rough) {
      G.setFlag('gear_fwd', true); updateMotor();
      await G.wait(0.4);
      G.setFlag('gear_fwd', false); updateMotor();
      think(S.running ? 'She\'ll stall like that. Push the choke in first.' : 'The engine isn\'t running.');
      return;
    }
    G.setFlag('gear_fwd', true); updateMotor();
    if (!G.flag('rope_untied')) {
      if (S.engine) S.engine.set('rpm', 1.4);
      G.tween(0.5, (k) => { S.boat.position.x = S.boatBase.x + Math.sin(k * Math.PI) * 0.4; });
      G.audio.play('creak', { pos: S.dockCleat, dur: 0.6, freq: 90 });
      await G.wait(0.6);
      if (S.engine) S.engine.set('rpm', 1);
      G.setFlag('gear_fwd', false); updateMotor();
      think('Still tied to the dock! The rope &mdash; on the cleat.');
      return;
    }
    escape();
  }

  // ------------------------------------------------------------------ alarm & escape
  S.timer = TIME_LIMIT; S.alarmOn = false;
  function startAlarm() {
    if (S.alarmOn) return;
    S.alarmOn = true;
    S.timer = TIME_LIMIT;
    S.cues = { a: false, b: false, c: false, d: false };
    G.music.setMood('finale');
    G.musicLock = true;
    S.siren = G.audio.loop('siren', { pos: [122, -3, 22], vol: 0.55, ref: 6, roll: 0.5, wet: 0.8 });
    setTimeout(() => think('The alarm. They\'ve found my empty cell.'), 1200);
  }
  L.stopAlarm = function () {
    S.alarmOn = false;
    if (S.siren) { S.siren.stop(1); S.siren = null; }
    S.guardBeams.forEach((b) => (b.visible = false));
    G.musicLock = false;
  };
  async function escape() {
    if (G.flag('escaped')) return;
    G.setFlag('escaped');
    G.mode = 'cutscene';
    await G.focus.exit();
    G.player.control = false;
    G.state.stats.endTime = G.state.stats.time;
    if (S.engine) S.engine.set('rpm', 1.6);
    G.music.sting('triumph');
    // put the player in the boat (behind the aft thwart), looking forward (+x)
    const cam = G.player;
    const start = cam.pos.clone();
    const seat = () => S.boat.localToWorld(new THREE.Vector3(-1.9, -0.55, 0));
    const y0 = cam.yaw, p0 = cam.pitch;
    const dy = U.wrapAngle(-Math.PI / 2 - y0);
    await G.tween(1.1, (k) => { const s = seat(); cam.pos.lerpVectors(start, s, k); cam.pos.y = U.lerp(start.y, s.y, k) + Math.sin(k * Math.PI) * 0.5; cam.yaw = y0 + dy * k; cam.pitch = U.lerp(p0, 0.04, k); cam.applyCamera(0.016); }, { ease: U.easeInOut });
    S.riding = true;
    S.rideT = 0;
    G.ui.say('STOP! STOP THAT BOAT!', { speaker: 'Guard', pitch: 145, pos: [122, -7, 31], vol: 1.3, dur: 1.8 });
    G.emit('escape');
  }
  L.isRiding = () => S.riding;

  // ------------------------------------------------------------------ rope rendering
  function updateRope() {
    const r = S.rope;
    if (G.flag('rope_untied')) { r.visible = false; return; }
    r.visible = true;
    const a = S.boat.localToWorld(new THREE.Vector3(2.3, 0.12, 0));
    const b = S.dockCleat;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    r.position.copy(mid);
    r.scale.set(1, a.distanceTo(b), 1);
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }

  L.apply = function () {
    S.running = false; S.rough = false; S.pulls = 0; S.riding = false; S.flashDone = false; S.endDone = false; S.rideT = 0; S.warm = false; S.catching = false;
    if (S.engine) { S.engine.stop(0.1); S.engine = null; }
    G.setFlag('gear_fwd', false);
    G.setFlag('boat_running', false);
    S.boat.position.copy(S.boatBase); S.boat.rotation.set(0, 0, 0);
    updateMotor();
    L.stopAlarm();
    S.timer = TIME_LIMIT;
  };

  L.update = function (dt, t) {
    const area = G.world.current ? G.world.current.name : '';
    // water animation
    if (area === 'cave' || area === 'tunnel' || S.riding) {
      S.waterNormal.offset.x = t * 0.004; S.waterNormal.offset.y = t * 0.0025;
    }
    // boat bobbing (unless riding - handled below)
    if (!S.riding) {
      const b = S.boat;
      b.position.y = S.boatBase.y + Math.sin(t * 1.3) * 0.05 + Math.sin(t * 0.7) * 0.03;
      b.rotation.z = Math.sin(t * 1.1) * 0.02; b.rotation.x = Math.sin(t * 0.9 + 1) * 0.025;
      if (S.running && S.rough) b.rotation.x += (Math.random() - 0.5) * 0.01;
    }
    updateRope();
    // choke flooding
    if (S.running && S.rough) {
      S.floodT -= dt;
      if (S.engine) S.engine.set('rpm', 0.7 + Math.random() * 0.3);
      if (S.floodT <= 0) stall();
    }
    // entering the cave triggers the alarm
    if (area === 'cave' && !S.alarmOn && !G.flag('escaped') && G.mode === 'play') startAlarm();
    if (S.alarmOn && !G.flag('escaped') && G.mode === 'play' && !G.ui.readerOpen && !G.ui.invOpen) {
      S.timer -= dt;
      const k = 1 - S.timer / TIME_LIMIT;
      G.music.setIntensity(0.4 + k * 0.6);
      const c = S.cues;
      if (!c.a && S.timer < TIME_LIMIT - 12) { c.a = true; G.ui.say('&hellip;the chapel! The altar\'s been moved!', { speaker: 'Distant voice', pitch: 140, pos: [122, -3, 18], vol: 0.8 }); }
      if (!c.b && S.timer < TIME_LIMIT * 0.55) { c.b = true; G.ui.say('There\'s a passage down here! Get lights!', { speaker: 'Guard', pitch: 135, pos: [110, -3, 10], vol: 0.9 }); }
      if (!c.c && S.timer < TIME_LIMIT * 0.25) { c.c = true; G.ui.say('I hear an engine! The sea door &mdash; move, move!', { speaker: 'Guard', pitch: 150, pos: [122, -5, 22], vol: 1.1 }); think('They\'re close. Hurry!'); }
      if (S.timer < TIME_LIMIT * 0.2) {
        S.guardBeams.forEach((bm, i) => {
          bm.visible = true;
          bm.position.set(121.6 + i * 1.0, -6.4, 29.2 - (S.timer / (TIME_LIMIT * 0.2)) * 6);
          const dir = new THREE.Vector3(Math.sin(t * 1.3 + i * 2) * 0.5, -0.25 + Math.sin(t * 2 + i) * 0.1, 1).normalize();
          bm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        });
      }
      if (S.timer <= 0) caughtInCave();
    }
    // riding out of the cave
    if (S.riding) {
      S.rideT += dt;
      const b = S.boat;
      const speed = Math.min(6, S.rideT * 1.6);
      b.position.x += speed * dt;
      b.position.z += (41.5 - b.position.z) * dt * 0.5;
      b.position.y = S.boatBase.y + Math.sin(t * 1.8) * 0.12 * Math.min(1, S.rideT / 4) + Math.sin(t * 0.9) * 0.06;
      b.rotation.z = Math.sin(t * 1.4) * 0.05; b.rotation.x = Math.sin(t * 1.1) * 0.04 - 0.02;
      const s = b.localToWorld(new THREE.Vector3(-1.9, -0.55, 0));
      G.player.pos.copy(s);
      if (S.rideT > 5 && !S.flashDone) { S.flashDone = true; G.engine.lightning(0.05); }
      if (S.rideT > 11 && !S.endDone) { S.endDone = true; G.emit('rideEnd'); }
    }
  };

  async function caughtInCave() {
    if (S.catching) return;
    S.catching = true;
    G.mode = 'cutscene';
    G.player.control = false;
    G.ui.say('FREEZE! Don\'t you move!', { speaker: 'Guard', pitch: 140, vol: 1.3, dur: 2 });
    await G.tween(1, (k) => { G.engine.post.flash.value = k * 0.4; });
    G.state.stats.caught++;
    await G.ui.fade(1, 0.8);
    G.engine.post.flash.value = 0;
    L.stopAlarm();
    await G.ui.caught('The guards reached the cave before you got the boat running.');
    G.respawn();
    S.catching = false;
  }
})();
