// level_block.js — Cell C-14, C-Block corridor, guard station and the C-Block gate
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U, B = G.B, P = G.P;
  G.levels = G.levels || [];
  const L = { name: 'block' };
  G.levels.push(L);
  const S = (L.s = {}); // dynamic handles

  const think = (t, o) => G.ui.think(t, o);
  const IX = () => G.interact;

  // ------------------------------------------------------------------ generic cell furniture
  function bunk(x, z, o = {}) {
    const M = G.M, st = M.metalGray;
    const len = 2.0, w = 0.8;
    const z0 = z - len / 2, z1 = z + len / 2, x0 = x - w / 2, x1 = x + w / 2;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) B.box({ x: px, y: 0.95, z: pz, w: 0.05, h: 1.9, d: 0.05, mat: st });
    for (const y of [0.38, 1.48]) {
      B.box({ x: x0, y, z, w: 0.05, h: 0.06, d: len, mat: st });
      B.box({ x: x1, y, z, w: 0.05, h: 0.06, d: len, mat: st });
      B.box({ x, y, z: z0, w, h: 0.06, d: 0.05, mat: st });
      B.box({ x, y, z: z1, w, h: 0.06, d: 0.05, mat: st });
      for (let k = 0; k < 9; k++) B.box({ x, y: y + 0.015, z: z0 + 0.12 + k * ((len - 0.24) / 8), w: w - 0.04, h: 0.02, d: 0.05, mat: M.metalDark });
      B.box({ x, y: y + 0.015, z, w: 0.04, h: 0.02, d: len - 0.04, mat: M.metalDark });
    }
    B.box({ x, y: 0.48, z, w: w - 0.06, h: 0.14, d: len - 0.08, mat: M.mattress });
    if (!o.upperBare) B.box({ x, y: 1.58, z, w: w - 0.06, h: 0.14, d: len - 0.08, mat: M.mattress });
    else { B.cyl({ x, y: 1.64, z: z1 - 0.35, r: 0.13, h: w - 0.1, rz: Math.PI / 2, mat: M.mattress }); }
    if (!o.noBlanket) {
      B.box({ x: x - 0.02, y: 0.565, z: z + 0.15, w: w + 0.02, h: 0.03, d: len - 0.4, mat: M.blanket });
      B.box({ x: x0 - 0.02, y: 0.45, z: z + 0.15, w: 0.02, h: 0.22, d: len - 0.4, mat: M.blanket });
    }
    B.sphere({ x, y: 0.6, z: z0 + 0.25, r: 0.25, scale: [1.2, 0.35, 0.7], mat: M.cloth });
    B.colBox(x, 0, z, w + 0.05, 1.9, len + 0.05);
    if (o.sleeper) {
      B.sphere({ x: x + 0.05, y: 0.66, z: z + 0.1, r: 0.5, scale: [0.55, 0.28, 1.4], mat: M.blanket });
      B.sphere({ x: x + 0.02, y: 0.7, z: z0 + 0.35, r: 0.12, scale: [1, 0.9, 1.1], mat: M.skin });
    }
  }
  function toilet(x, z, ry = 0) {
    const M = G.M;
    const pts = [[0.001, 0], [0.16, 0], [0.18, 0.1], [0.2, 0.3], [0.22, 0.4], [0.2, 0.42], [0.16, 0.36], [0.02, 0.3]].map((p) => new THREE.Vector2(p[0], p[1]));
    B.add(new THREE.LatheGeometry(pts, 20), M.steel, { pos: [x, 0, z], scale: [1, 1, 1.25], uv: 'native' });
    B.box({ x: x - Math.sin(ry) * 0.24, y: 0.32, z: z - Math.cos(ry) * 0.24 + 0.46, w: 0.36, h: 0.64, d: 0.14, ry, mat: M.steel });
    B.colBox(x, 0, z + 0.1, 0.5, 0.45, 0.65);
  }
  function sink(x, z, faceX = 1) {
    const M = G.M;
    B.box({ x, y: 0.8, z, w: 0.4, h: 0.16, d: 0.44, mat: M.steel });
    B.box({ x: x + 0.01 * faceX, y: 0.87, z, w: 0.3, h: 0.02, d: 0.32, mat: new THREE.MeshStandardMaterial({ color: 0x3a3e42, metalness: 0.9, roughness: 0.25 }) });
    B.cyl({ x: x - 0.14 * faceX, y: 0.95, z, r: 0.02, h: 0.14, mat: M.steel });
    B.box({ x: x - 0.09 * faceX, y: 1.0, z, w: 0.1, h: 0.025, d: 0.03, mat: M.steel });
    B.colBox(x, 0.7, z, 0.4, 0.3, 0.44);
  }
  function desk(x, z) {
    const M = G.M;
    B.box({ x, y: 0.74, z, w: 0.42, h: 0.03, d: 0.8, mat: M.metalGray });
    B.box({ x: x - 0.19, y: 0.62, z, w: 0.04, h: 0.2, d: 0.7, mat: M.metalGray });
    B.cyl({ x: x + 0.28, y: 0.42, z: z + 0.1, r: 0.16, h: 0.04, mat: M.metalGray });
    B.cyl({ x: x + 0.28, y: 0.2, z: z + 0.1, r: 0.025, h: 0.4, mat: M.metalDark });
    B.colBox(x, 0, z, 0.42, 0.78, 0.8);
  }

  function cellWindow(xm) {
    const M = G.M;
    P.window('x', 5.9, xm, 2.35, 0.6, 0.45, { thick: 0.2, glassOff: 0.05, glassMat: M.glassDirty });
  }

  // ------------------------------------------------------------------ BUILD
  L.build = function () {
    const M = G.M, E = G.engine;
    // areas (most specific first)
    B.area({ name: 'cell', show: ['cell', 'block', 'guard', 'hall'], boxes: [[12, -1, 2.0, 15, 3.4, 6.2]], lights: ['cell', 'block'], reverb: 'cell', music: 'explore',
      amb: { rain: 0.32, rainMuffle: 900, room: 0.35 }, look: { fog: 0.06, hemi: 0.16, moon: 0.2, exposure: 1.15, env: 0.25 } });
    B.area({ name: 'guard', show: ['guard', 'block', 'cell', 'hall'], boxes: [[18, -1, -7.2, 24, 3.4, -2.55]], lights: ['guard', 'block'], reverb: 'small', music: 'dark',
      amb: { rain: 0.25, rainMuffle: 700, room: 0.5 }, look: { fog: 0.05, hemi: 0.14, moon: 0.2, exposure: 1.2, env: 0.25 } });
    B.area({ name: 'block', show: ['block', 'cell', 'guard', 'hall'], boxes: [[-0.5, -1, -2.9, 24.1, 5, 6.2]], lights: ['block', 'cell', 'guard'], reverb: 'block', music: 'dark',
      amb: { rain: 0.45, rainMuffle: 1500, room: 0.3, wind: 0.08 }, look: { fog: 0.045, hemi: 0.14, moon: 0.4, exposure: 1.15, env: 0.25 } });

    B.setArea('block');
    // floors / ceilings
    B.floor(-0.3, -2.8, 24, 6, 0, M.concrete, 'concrete');
    B.ceiling(-0.3, -2.8, 24, 2.2, 4.5, M.ceiling);
    B.ceiling(-0.3, 2.0, 24, 6, 3.0, M.ceiling);
    const two = { lower: { mat: M.wallGreen, h: 1.2 }, trim: M.metalDark };

    // corridor north wall with high windows (x 0..18), guard station section (18..24)
    const wins = [1.5, 4.5, 7.5, 10.5, 13.5, 16.5].map((a) => ({ a0: a - 0.6, a1: a + 0.6, y0: 2.9, y1: 4.0 }));
    B.wall('x', -2.65, -0.3, 18, 0, 4.5, M.wallCream, wins, Object.assign({ thick: 0.3 }, two));
    wins.forEach((h) => P.window('x', -2.65, (h.a0 + h.a1) / 2, 3.45, 1.2, 1.1, { thick: 0.3, glassOff: -0.08 }));
    B.wall('x', -2.65, 18, 24, 0, 4.5, M.wallCream, [{ a0: 18.5, a1: 19.5, y0: 0, y1: 2.2 }, { a0: 20.2, a1: 23.4, y0: 1.0, y1: 2.2 }], Object.assign({ thick: 0.3 }, two));
    // guard window frame + glass
    B.box({ x: 21.8, y: 0.97, z: -2.65, w: 3.3, h: 0.06, d: 0.36, mat: M.metalDark });
    B.box({ x: 21.8, y: 2.23, z: -2.65, w: 3.3, h: 0.06, d: 0.34, mat: M.metalDark });
    B.box({ x: 21.8, y: 1.6, z: -2.65, w: 3.2, h: 1.2, d: 0.02, mat: M.glassDirty });
    B.box({ x: 21.8, y: 1.6, z: -2.65, w: 0.04, h: 1.2, d: 0.06, mat: M.metalDark });
    // upper wall above the cell fronts
    B.wall('x', 2.1, -0.3, 24, 3.0, 4.5, M.wallCream, [], { thick: 0.2 });
    // west end wall with a shower door
    B.wall('z', -0.15, -2.8, 6, 0, 4.5, M.wallCream, [{ a0: -1.9, a1: -0.9, y0: 0, y1: 2.1 }], Object.assign({ thick: 0.3 }, two));
    S.showerDoor = P.door({ x: 0.0, z: -1.4, axis: 'z', w: 1, h: 2.1, hinge: -1, mat: M.metalGreen, window: true, sign: 'SHOWERS', signSize: 64 });
    // back wall with small cell windows
    B.wall('x', 5.9, -0.3, 24, 0, 3.0, M.wallCream, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ a0: 3 * i + 1.2, a1: 3 * i + 1.8, y0: 2.12, y1: 2.58 })), Object.assign({ thick: 0.2 }, two));
    // partitions
    for (let i = 0; i <= 8; i++) B.wall('z', 3 * i, 1.95, 5.8, 0, 3.0, M.wallCream, [], Object.assign({ thick: 0.2 }, two));
    // east end: bars + upper wall (gate built below)
    B.wall('z', 24.0, -2.8, 2.1, 3.2, 4.5, M.wallCream, [], { thick: 0.2 });
    B.box({ x: 24.0, y: 3.15, z: -0.4, w: 0.22, h: 0.1, d: 4.8, mat: M.metalDark });

    // cells
    for (let i = 0; i < 8; i++) {
      const x0 = 3 * i, num = 10 + i, player = num === 14;
      B.setArea(player ? 'cell' : 'block');
      P.bars('x', 2.0, x0 + 0.12, x0 + 1.8, 0, 3.0);
      P.bars('x', 2.0, x0 + 2.82, x0 + 2.9, 0, 3.0, { straps: [] });
      B.box({ x: x0 + 1.8, y: 1.5, z: 2.0, w: 0.08, h: 3.0, d: 0.08, mat: M.bars });
      B.box({ x: x0 + 2.85, y: 1.5, z: 2.0, w: 0.08, h: 3.0, d: 0.08, mat: M.bars });
      B.box({ x: x0 + 1.5, y: 2.97, z: 2.0, w: 3.0, h: 0.06, d: 0.1, mat: M.bars });
      if (!player) {
        P.bars('x', 1.97, x0 + 1.85, x0 + 2.8, 0.02, 2.9);
        B.box({ x: x0 + 2.68, y: 1.05, z: 1.92, w: 0.2, h: 0.28, d: 0.12, mat: M.metalDark });
      }
      // number plate on the corridor side
      B.decal(G.tex.sign('C-' + num, { w: 256, h: 96, bg: '#d8cfb4', fg: '#1d1d1d', size: 64 }), { x: x0 + 2.3, y: 3.35, z: 1.99, w: 0.5, h: 0.19, ry: Math.PI });
      bunk(x0 + 2.45, 4.75, { sleeper: num === 12 || num === 16, upperBare: player, noBlanket: false });
      toilet(x0 + 0.42, 5.42);
      sink(x0 + 0.33, 4.55, 1);
      desk(x0 + 0.33, 3.15);
      cellWindow(x0 + 1.5);
      if (!player) P.shaft(x0 + 1.5, 2.35, 5.85, 0.5, 0.35, new THREE.Vector3(0, -0.55, -1), 3.0, 0x7f93c0, 0.018, { flashGain: 0.35 });
    }
    B.setArea('block');

    // corridor lights: night lamps (on) + emergency (off until blackout)
    S.night = [4, 12, 20].map((x) => P.cageLamp(x, 4.5, -0.3, { drop: 0.5, color: 0xffd9a0, intensity: 3.2, distance: 9, emissive: 3, flicker: 'fluoro' }));
    S.emerg = [3, 9, 15, 21].map((x) => P.emergency(x, 3.5, -2.48, 0, { intensity: 3.5, distance: 9 }));
    S.emerg.push(P.emergency(23.85, 3.5, 1.2, -Math.PI / 2, { intensity: 3, distance: 8 }));
    // moon shafts through the corridor windows
    const md = G.lights.moonDir.clone().negate();
    wins.forEach((h) => P.shaft((h.a0 + h.a1) / 2, 3.45, -2.6, 1.1, 1.0, md, 5.2, 0x8aa0d0, 0.03, { flashGain: 0.9 }));

    // corridor dressing
    P.bucket(9.6, 0.2, { water: true });
    S.dripPos = new THREE.Vector3(9.6, 4.45, 0.2);
    G.audio.addEmitter({ sound: 'drip', pos: new THREE.Vector3(9.6, 0.3, 0.2), min: 1.4, max: 2.6, range: 16, opts: { vol: 0.9, wet: 0.5 } });
    G.audio.addEmitter({ sound: 'drip', pos: new THREE.Vector3(2.5, 0.1, -1.5), min: 2.5, max: 5, range: 14, opts: { vol: 0.5, wet: 0.5 } });
    const pud = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshStandardMaterial({ color: 0x0b0d0f, roughness: 0.03, metalness: 0.4, transparent: true, opacity: 0.8, depthWrite: false })); m.scale.set(w, d, 1); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); m.renderOrder = 1; E.scene.add(m); };
    pud(9.5, 0.3, 1.8, 1.2); pud(2.4, -1.6, 1.2, 0.8); pud(16.8, -1.2, 1.4, 1.0); pud(21.5, 0.8, 1.0, 0.7);
    P.cart(2.1, -1.95, 0);
    B.cyl({ x: 5.2, y: 0.9, z: -2.3, r: 0.02, h: 1.7, rz: 0.12, mat: G.M.woodOld });
    P.bucket(5.0, -2.2, { mat: G.M.yellowPaint });
    B.decal(G.tex.sign('NO TALKING\nAFTER LIGHTS OUT', { w: 512, h: 256, bg: '#e7dfc9', fg: '#7a1c14', border: '#7a1c14' }), { x: 12, y: 2.2, z: -2.49, w: 1.2, h: 0.6 });
    B.decal(G.tex.sign('C  BLOCK', { w: 512, h: 128, bg: null, fg: '#e0d6bd', size: 90, grunge: 0.5 }), { x: 0.02, y: 3.3, z: 0.6, w: 2.2, h: 0.55, ry: Math.PI / 2 });
    P.pipe([[-0.1, 4.2, 1.8], [24, 4.2, 1.8]], 0.06, G.M.rust);
    P.pipe([[-0.1, 4.35, 1.6], [24, 4.35, 1.6]], 0.04, G.M.metalGray);
    G.audio.addEmitter({ sound: 'metalHit', pos: new THREE.Vector3(12, 4.2, 1.8), min: 14, max: 30, range: 30, opts: { vol: 0.15, decay: 2.2, pitch: 0.5, wet: 0.8 } });

    buildPlayerCell();
    buildNeighbours();
    buildGuardStation();
    buildGate();
  };

  // ------------------------------------------------------------------ the player's cell
  function buildPlayerCell() {
    const M = G.M, E = G.engine, scene = E.scene;
    B.setArea('cell');
    // lamp
    S.cellLamp = P.cageLamp(13.5, 3.0, 3.9, { drop: 0.15, color: 0xffc27a, intensity: 5, distance: 7, emissive: 4, flicker: 'fluoro', area: 'cell' });
    S.sparkLight = G.lights.add({ pos: [13.75, 0.35, 5.6], color: 0x9fc8ff, intensity: 0, distance: 6, area: 'cell' });
    S.cellMoon = P.shaft(13.5, 2.35, 5.85, 0.5, 0.36, new THREE.Vector3(0, -0.55, -1), 3.0, 0x8ba0d0, 0.018, { flashGain: 0.35 });

    // sliding door
    const door = P.barLeaf(1.0, 2.9, { lock: true, lockX: 0.88 });
    door.position.set(13.8, 0.02, 1.93);
    scene.add(door);
    S.door = door;
    S.doorCol = B.collider(13.8, 0, 1.88, 14.82, 3, 2.02, 'celldoor');

    // tray on desk with spoon, bowl, bread
    const trayY = 0.755;
    B.box({ x: 12.36, y: trayY + 0.01, z: 3.15, w: 0.3, h: 0.02, d: 0.4, mat: M.metalGray });
    B.add(new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.steel, { pos: [12.36, trayY + 0.085, 3.05], uv: 'native' });
    B.add(new THREE.CircleGeometry(0.062, 16), new THREE.MeshStandardMaterial({ color: 0xb8ab88, roughness: 0.9 }), { pos: [12.36, trayY + 0.06, 3.05], rot: [-Math.PI / 2, 0, 0], uv: 'native' });
    B.sphere({ x: 12.4, y: trayY + 0.04, z: 3.26, r: 0.05, scale: [1.2, 0.6, 0.8], mat: new THREE.MeshStandardMaterial({ color: 0x9a7040, roughness: 0.9 }) });
    const spoon = P.model.spoon();
    spoon.position.set(12.36, trayY + 0.02, 3.24); spoon.rotation.y = 0.5;
    scene.add(spoon);
    S.spoon = spoon;
    IX().add({ id: 'spoon', mesh: spoon, pad: 0.05, glint: true, enabled: () => !G.flag('took_spoon'),
      prompt: () => 'Take <b>Spoon</b>',
      use: () => { G.setFlag('took_spoon'); IX().flyToCamera(spoon); G.inv.add('spoon'); } });
    IX().add({ id: 'bowl', box: [12.36, trayY + 0.06, 3.07, 0.16, 0.1, 0.16], prompt: () => 'Examine <b>bowl</b>', use: () => think('Cold oatmeal with a skin on it. I\'ll pass.') });

    // bookshelf above desk + books
    B.box({ x: 12.24, y: 1.52, z: 3.15, w: 0.26, h: 0.03, d: 0.9, mat: M.woodDark });
    const books = [['Monte Cristo', '#5a1d17'], ['Holy Bible', '#1b1b1b'], ['Moby Dick', '#23374f'], ['Tide Tables 1971', '#3f4f2a'], ['Chess Openings', '#6b5a2a']];
    let bz = 2.78;
    books.forEach(([t, c], k) => {
      const w = 0.035 + (k % 2) * 0.012, h = 0.2 + (k % 3) * 0.03;
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
      const side = new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
      const pages = new THREE.MeshStandardMaterial({ color: 0xd8cfb0, roughness: 0.9 });
      mat.map = G.tex.bookSpine(t, c);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, w), [mat, pages, pages, pages, side, side]);
      mesh.position.set(12.24, 1.535 + h / 2, bz + w / 2);
      mesh.castShadow = true;
      scene.add(mesh);
      if (k === 0) S.book = mesh;
      bz += w + 0.008;
    });
    IX().add({ id: 'book', mesh: S.book, pad: 0.04, glint: true,
      prompt: () => G.flag('read_letter1') ? 'Read <b>Tom\'s letter</b> again' : 'Take down <b>The Count of Monte Cristo</b>',
      use: () => {
        const first = !G.flag('read_letter1');
        G.setFlag('read_letter1');
        if (first) {
          G.tween(0.3, (k) => { S.book.position.x = 12.24 + k * 0.08; });
          G.ui.afterRead(() => { think('Tom\'s favourite. He read it every winter.'); });
        }
        G.docs.add('letter1');
      } });

    // sink + cup
    const cup = P.model.cup();
    cup.position.set(12.36, 0.885, 4.78);
    scene.add(cup);
    S.cup = cup;
    IX().add({ id: 'cup', mesh: cup, pad: 0.05, glint: true, enabled: () => !G.flag('took_cup'),
      prompt: () => 'Take <b>Tin Cup</b>', use: () => { G.setFlag('took_cup'); IX().flyToCamera(cup); G.inv.add('cup'); } });
    IX().add({ id: 'sink', box: [12.36, 0.9, 4.5, 0.42, 0.3, 0.44],
      prompt: () => G.inv.has('cup') ? 'Fill <b>Tin Cup</b> at the sink' : 'Use the <b>sink</b>',
      use: () => {
        if (G.inv.has('cup')) {
          G.audio.play('pour', { pos: [12.36, 0.9, 4.5], dur: 1.1 });
          G.inv.replace('cup', 'cup_water', false);
          G.audio.play('pickup', { bus: 'ui', wet: 0.1, vol: 0.6 });
        } else if (G.inv.has('cup_water')) think('The cup\'s already full.');
        else { G.audio.play('pour', { pos: [12.36, 0.9, 4.5], dur: 0.8 }); think('The tap coughs out freezing water. I\'ve got nothing to carry it in.'); }
      } });

    // socket on the back wall beside the bunk foot
    const sx = 13.75, sy = 0.32, sz = 5.79;
    B.box({ x: sx, y: sy, z: sz + 0.01, w: 0.14, h: 0.14, d: 0.02, mat: M.black, cast: false });
    const wires = new THREE.Group();
    [0xa0301c, 0x2a2a2a, 0x2a5a2a].forEach((c, k) => {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 12, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
      w.position.set(-0.03 + k * 0.03, 0, -0.005); w.rotation.set(0, 0, k);
      wires.add(w);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 4), G.M.copper);
      tip.position.set(-0.03 + k * 0.03, 0.03, 0.01); wires.add(tip);
    });
    wires.position.set(sx, sy, sz - 0.01);
    scene.add(wires);
    const plate = new THREE.Group();
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.012), new THREE.MeshStandardMaterial({ color: 0xcfc7b0, roughness: 0.5 }));
    plate.add(pm);
    for (const dy of [-0.035, 0.035]) {
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.004), M.black); hole.position.set(-0.015, dy * 0.3, 0.006); plate.add(hole);
      const hole2 = hole.clone(); hole2.position.x = 0.015; plate.add(hole2);
    }
    S.screws = [];
    for (const dy of [-0.045, 0.045]) { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 8), G.M.brass); sc.rotation.x = Math.PI / 2; sc.position.set(0, dy, 0.008); plate.add(sc); S.screws.push(sc); }
    plate.position.set(sx, sy, sz - 0.012); plate.rotation.y = Math.PI; plate.rotation.z = 0.08;
    scene.add(plate);
    S.plate = plate;
    IX().add({ id: 'socket', box: [sx, sy, sz - 0.03, 0.2, 0.2, 0.08], enabled: () => !G.flag('socket_open'),
      prompt: () => G.inv.has('spoon') ? 'Unscrew the plate with the <b>Spoon</b>' : 'Examine the <b>wall socket</b>',
      use: () => {
        if (!G.inv.has('spoon')) { think('The cover plate hangs by two loose screws. I need something flat to turn them.'); return; }
        unscrewPlate();
      } });
    IX().add({ id: 'wires', box: [sx, sy, sz - 0.03, 0.2, 0.2, 0.08], enabled: () => G.flag('socket_open') && !G.flag('cell_open'),
      prompt: () => G.inv.has('cup_water') ? 'Pour the <b>Cup of Water</b> onto the wires' : 'Examine the <b>exposed wires</b>',
      use: () => {
        if (G.inv.has('cup_water')) shortCircuit();
        else if (G.inv.has('cup')) think('The cup\'s empty. Water does the rest, Tom said.');
        else think('Live wires, humming. Tom said water would do the rest.');
      } });

    // loose brick below window
    const brick = B.add(new THREE.BoxGeometry(0.39, 0.19, 0.12), G.M.wallCream, { dynamic: true, uv: 'world', pos: [13.5, 1.62, 5.8] });
    S.brick = brick;
    B.box({ x: 13.5, y: 1.62, z: 5.79, w: 0.41, h: 0.21, d: 0.02, mat: M.black, cast: false });
    IX().add({ id: 'brick', mesh: brick, pad: 0.05, enabled: () => !G.flag('has_map'),
      prompt: () => 'Pull out the <b>loose brick</b>',
      use: () => {
        G.setFlag('has_map');
        G.audio.play('stone', { pos: [13.5, 1.6, 5.7], dur: 0.5, v: 0.4 });
        G.tween(0.6, (k) => { brick.position.z = 5.8 - k * 0.25; brick.position.y = 1.62 - k * k * 0.3; brick.rotation.x = k * 0.4; }).then(() => {
          G.docs.add('map');
          G.ui.afterRead(() => { G.ui.hint('Press <b>M</b> any time to look at the map.', 'Tip'); });
        });
      } });

    // decor / flavour interactables
    B.decal(G.tex.tally(), { x: 12.1 + 0.005, y: 1.7, z: 4.9, w: 0.5, h: 0.5, ry: Math.PI / 2 });
    B.decal(G.tex.boatDoodle(), { x: 14.89, y: 2.25, z: 4.4, w: 0.45, h: 0.35, ry: -Math.PI / 2 });
    B.decal(G.tex.calendar(), { x: 12.11, y: 1.95, z: 3.9, w: 0.32, h: 0.4, ry: Math.PI / 2 });
    const pc = B.decal(G.tex.postcard(), { x: 14.3, y: 1.3, z: 3.72, w: 0.2, h: 0.14, rx: 0, ry: Math.PI - 0.1 });
    pc.rotation.z = 0.08;
    IX().add({ id: 'tally', box: [12.12, 1.7, 4.9, 0.06, 0.5, 0.5], prompt: () => 'Examine <b>scratches</b>', use: () => think('Tom\'s tally. Thirty years of it. He stopped counting last spring.') });
    IX().add({ id: 'doodle', box: [14.86, 2.25, 4.4, 0.06, 0.35, 0.45], prompt: () => 'Examine <b>drawing</b>', use: () => think('Tom\'s doodle. A little boat on a scribbled sea. "Soon," it says.') });
    IX().add({ id: 'calendar', box: [12.12, 1.95, 3.9, 0.06, 0.4, 0.32], prompt: () => 'Examine <b>calendar</b>', use: () => think('October the 13th, circled in Tom\'s pencil. Tonight.') });
    IX().add({ id: 'postcard', box: [14.3, 1.3, 3.72, 0.22, 0.16, 0.08], prompt: () => 'Examine <b>postcard</b>', use: () => think('"Greetings from Crescent Bay." Tom\'s brother Eddie sends one every Christmas.') });
    IX().add({ id: 'bunk', box: [14.45, 0.55, 4.75, 0.8, 0.3, 2.0], prompt: () => 'Examine <b>bunk</b>', use: () => think(G.flag('cell_open') ? 'No more sleeping here. Not ever.' : 'Four years on this mattress. Not one more night.') });
    IX().add({ id: 'upper', box: [14.45, 1.62, 4.75, 0.8, 0.3, 2.0], prompt: () => 'Examine <b>Tom\'s bunk</b>', use: () => think('Tom\'s bunk. They stripped it the moment they took him.') });
    IX().add({ id: 'cellwin', box: [13.5, 2.35, 5.85, 0.7, 0.5, 0.2], prompt: () => 'Look out of the <b>window</b>', use: () => think('Rain like nails. Eleven miles of black water between here and the mainland.') });
    IX().add({ id: 'toilet', box: [12.42, 0.35, 5.45, 0.45, 0.5, 0.55], prompt: () => 'Examine <b>toilet</b>', use: () => think('Stainless steel. The height of luxury.') });
    IX().add({ id: 'celldoor', box: [14.3, 1.4, 1.93, 1.0, 2.6, 0.2], enabled: () => !G.flag('cell_open'), prompt: () => 'Try the <b>cell door</b>',
      use: () => { G.audio.play('metalHit', { pos: [14.3, 1.1, 1.95], v: 0.4, decay: 0.8 }); think('Locked tight. I can hear the bolt\'s solenoid humming inside the lock box.'); } });
    G.audio.addEmitter({ sound: 'buzz', pos: new THREE.Vector3(14.7, 1.05, 1.9), min: 6, max: 11, range: 5, enabled: () => !G.flag('cell_open'), opts: { dur: 0.6, freq: 60, v: 0.25, wet: 0.2 } });
  }

  async function unscrewPlate() {
    G.player.control = false;
    for (let k = 0; k < 2; k++) {
      G.audio.play('tick', { pos: [13.75, 0.32, 5.75], freq: 3500 });
      await G.tween(0.35, (t) => { S.screws[k].rotation.y = t * Math.PI * 6; S.screws[k].position.z = 0.008 + t * 0.012; });
      S.screws[k].visible = false;
      G.audio.play('tick', { pos: [13.75, 0.1, 5.7], freq: 5200 });
    }
    G.setFlag('socket_open');
    const pl = S.plate;
    await G.tween(0.45, (t) => { pl.position.z = 5.778 - t * 0.12; pl.position.y = 0.32 - t * t * 0.3; pl.rotation.x = -t * 1.4; });
    pl.rotation.x = -Math.PI / 2; pl.position.y = 0.012;
    G.audio.play('metalHit', { pos: [13.75, 0.02, 5.6], v: 0.3, decay: 0.3, pitch: 2.5 });
    G.audio.play('spark', { pos: [13.75, 0.32, 5.75], dur: 0.2, vol: 0.4 });
    E_spark(12);
    G.player.control = true;
    G.ui.think('Bare wires. Live, too &mdash; I can feel them humming.');
  }
  function E_spark(n, big) {
    G.engine.burst({ pos: new THREE.Vector3(13.75, 0.33, 5.74), count: n, color: big ? 0xcfe4ff : 0xffd98a, speed: big ? 4.5 : 2.5, life: big ? 1.0 : 0.5, gravity: 9, size: big ? 0.07 : 0.04, dir: new THREE.Vector3(0, 0.3, -1) });
  }

  async function shortCircuit() {
    const A = G.audio, E = G.engine;
    G.player.control = false;
    G.inv.remove('cup_water');
    A.play('pour', { pos: [13.75, 0.4, 5.7], dur: 0.7 });
    await G.wait(0.45);
    A.play('spark', { pos: [13.75, 0.32, 5.7], dur: 1.3, vol: 1.2 });
    A.play('bang', { pos: [13.75, 0.32, 5.7], v: 1 });
    E_spark(80, true);
    S.sparkLight.intensity = 40;
    E.post.flash.value = 0.25;
    G.tween(0.5, (k) => { S.sparkLight.intensity = 40 * (1 - k) * (Math.random() * 0.6 + 0.4); E.post.flash.value = 0.25 * (1 - k); });
    // lamps die
    S.cellLamp.flicker = 'broken';
    S.night.forEach((v) => (v.flicker = 'broken'));
    await G.wait(0.7);
    S.cellLamp.on = false;
    S.night.forEach((v) => (v.on = false));
    A.play('clunk', { pos: [14.7, 1.05, 1.9], v: 0.8, freq: 70 });
    A.play('buzz', { pos: [13.5, 2.9, 3.9], dur: 0.25, freq: 100, v: 0.4 });
    G.music.setMood('silence');
    G.setFlag('blackout_c');
    await G.wait(1.3);
    E.lightning(0.15);
    await G.wait(0.9);
    A.play('clunk', { pos: [12, 3.5, -2.4], v: 0.7, freq: 110, ring: 0.8 });
    S.emerg.forEach((v, i) => { v.on = true; v.level = 0; G.tween(0.8 + i * 0.1, (k) => (v.level = k)); });
    await G.wait(0.8);
    // door releases
    A.play('clunk', { pos: [14.7, 1.05, 1.9], v: 1, freq: 90 });
    await G.wait(0.5);
    A.play('cellDoor', { pos: [14.3, 1.2, 1.95], dur: 2.0 });
    G.tween(2.0, (k) => { S.door.position.x = 13.8 - k * 0.98; }, { ease: U.easeInOut });
    await G.wait(2.1);
    S.doorCol.enabled = false;
    G.setFlag('cell_open');
    G.player.control = true;
    G.music.setMood('dark');
    G.checkpoint('cell_open');
    await G.ui.think('That did it.');
    G.ui.think('Now &mdash; quietly.');
  }

  // ------------------------------------------------------------------ neighbours
  function buildNeighbours() {
    const E = G.engine;
    B.setArea('block');
    // Mack in C-15: sitting on his bunk, cigarette glow
    const mack = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 4, 10), cloth); body.position.set(0, 0.95, 0); body.rotation.x = 0.15;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), G.M.skin); head.position.set(0, 1.5, -0.06);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.5), cloth); legs.position.set(0, 0.62, -0.25);
    const shins = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.14), cloth); shins.position.set(0, 0.3, -0.48);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), P.bulbMat(0xff5a1a, 6)); ember.position.set(0.1, 1.44, -0.2);
    mack.add(body, head, legs, shins, ember);
    mack.position.set(17.45, 0, 4.3);
    mack.rotation.y = Math.PI * 0.85;
    mack.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    ember.userData.keep = true;
    E.scene.add(mack);
    B.bakeGroup(mack);
    S.mack = mack; S.ember = ember;
    S.emberLight = G.lights.add({ pos: [17.35, 1.45, 4.1], color: 0xff6a2a, intensity: 0.6, distance: 2.5, flicker: 'fire', area: 'block', mesh: ember, emissive: 6 });
    const lines = [
      'Tom\'s boy. Well, I\'ll be damned. He said you\'d try it tonight.',
      'Keep your voice down. Miller went off toward the hall. Radio squawkin\' about the generator.',
      'I didn\'t see nothin\'. Never do.',
      'Tell the old man Mack said so long. If you see him.',
    ];
    S.mackLine = 0;
    IX().add({ id: 'mack', box: [17.1, 1.1, 3.6, 1.2, 1.8, 1.0], range: 3.2, prompt: () => 'Talk to <b>Mack</b>',
      use: () => { const l = lines[Math.min(S.mackLine, lines.length - 1)]; S.mackLine = Math.min(S.mackLine + 1, lines.length - 1); G.ui.say(l, { speaker: 'Mack', whisper: true, pos: [17.4, 1.5, 4.2], vol: 0.7 }); } });
    // snorers
    S.snores = [];
    S.snorePos = [[8.45, 0.7, 4.3], [20.45, 0.7, 4.3]];
  }

  // ------------------------------------------------------------------ guard station
  function buildGuardStation() {
    const M = G.M, E = G.engine, scene = E.scene;
    B.setArea('guard');
    B.floor(18, -7.2, 24, -2.8, 0.005, M.tile, 'concrete');
    B.ceiling(18, -7.3, 24, -2.8, 3.0, M.ceiling);
    const two = { lower: { mat: M.wallGreen, h: 1.2 }, trim: M.metalDark, thick: 0.2 };
    B.wall('x', -7.2, 17.9, 24.1, 0, 3.0, M.wallCream, [], two);
    B.wall('z', 17.9, -7.2, -2.8, 0, 3.0, M.wallCream, [], two);
    S.guardDoor = P.door({ x: 19.0, z: -2.65, axis: 'x', w: 1.0, h: 2.2, hinge: -1, open: -1, mat: M.metalGreen, window: true, sign: 'GUARD\nSTATION', signSize: 60 });
    S.guardDoor.set(0.62);
    P.tubeLamp(21, 3.0, -4.9, 1.2, 'x', { on: false, area: 'guard' });
    P.emergency(18.03, 2.6, -3.6, Math.PI / 2, { on: false, area: 'guard', intensity: 2.2, distance: 6 });
    S.guardEmerg = G.lights.virtual[G.lights.virtual.length - 1];

    // desk
    const dz = -6.65;
    B.box({ x: 21.2, y: 0.76, z: dz, w: 3.6, h: 0.05, d: 0.9, mat: M.woodDark });
    B.box({ x: 19.55, y: 0.37, z: dz, w: 0.5, h: 0.74, d: 0.85, mat: M.metalGray });
    B.box({ x: 22.85, y: 0.37, z: dz, w: 0.5, h: 0.74, d: 0.85, mat: M.metalGray });
    B.colBox(21.2, 0, dz, 3.6, 0.8, 0.9);
    P.chair(21.3, -5.55, 0.3);
    // CRT monitors with CCTV feeds
    S.monitors = [];
    [[20.35, 'CAM 04  YARD'], [21.2, 'CAM 07  GEN B'], [22.05, 'CAM 11  CHAPEL']].forEach(([x, label], k) => {
      B.box({ x, y: 0.98, z: dz - 0.05, w: 0.62, h: 0.42, d: 0.5, mat: M.metalGray });
      B.box({ x, y: 0.98, z: dz - 0.33, w: 0.44, h: 0.34, d: 0.1, mat: M.plastic });
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 192;
      const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.2, roughness: 0.2, metalness: 0.1 }));
      scr.position.set(x, 1.0, dz + 0.201);
      scene.add(scr);
      S.monitors.push({ canvas, ctx: canvas.getContext('2d'), tex, label, frames: [], k, mesh: scr });
    });
    S.monLight = G.lights.add({ pos: [21.2, 1.1, dz + 0.8], color: 0x8fc8b8, intensity: 1.8, distance: 5, area: 'guard', flicker: 'candle' });
    const sticky = B.decal(G.tex.noteTex('yellow', 8), { x: 21.5, y: 1.2, z: dz + 0.215, w: 0.09, h: 0.1, rz: 0.1 });
    IX().add({ id: 'sticky', box: [21.5, 1.2, dz + 0.22, 0.12, 0.12, 0.06], glint: true, prompt: () => 'Read <b>sticky note</b>', use: () => G.docs.add('sticky') });
    IX().add({ id: 'monitors', box: [21.2, 1.0, dz + 0.1, 2.0, 0.5, 0.3], prompt: () => 'Watch the <b>camera feeds</b>', use: () => think('Camera feeds: the yard, Generator B, the chapel. Nobody\'s watching them tonight but me.') });
    void sticky;

    // logbook
    const log = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.22), new THREE.MeshStandardMaterial({ color: 0x1f3b2a, roughness: 0.8 }));
    const pages = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), new THREE.MeshStandardMaterial({ map: G.tex.noteTex('lined', 11), roughness: 0.9 }));
    pages.rotation.x = -Math.PI / 2; pages.position.y = 0.0135;
    log.add(cover, pages); log.position.set(21.0, 0.795, dz + 0.3); log.rotation.y = 0.12;
    scene.add(log);
    IX().add({ id: 'log', mesh: log, pad: 0.04, glint: true, prompt: () => 'Read the <b>guard log</b>', use: () => G.docs.add('guardlog') });

    // photo frame (inspectable)
    const photo = P.model.photo();
    photo.position.set(19.75, 0.88, dz + 0.05); photo.rotation.set(-0.2, 0.35, 0, 'YXZ');
    scene.add(photo);
    S.photo = photo;
    IX().add({ id: 'photo', box: [19.75, 0.88, dz + 0.05, 0.2, 0.22, 0.12], glint: true, prompt: () => 'Pick up the <b>photograph</b>',
      use: () => {
        photo.visible = false;
        const m = P.model.photo();
        G.inspect.open({ model: m, name: 'Photograph', desc: 'A little girl blowing out candles on a cake. Miller\'s daughter, surely.', rot: [0, 0.3],
          onUpdate: (IN) => {
            const back = Math.cos(IN.ry) * Math.cos(IN.rx) < -0.35;
            if (back && !G.flag('photo_back')) {
              G.setFlag('photo_back');
              G.state.docs.includes('photo') || (G.state.docs.push('photo'), G.ui.notify('photo', true));
              G.audio.play('solve', { bus: 'ui', wet: 0.3, vol: 0.4 });
            }
            G.ui.setInspectDesc(back ? 'On the back, in blue ink: <i>"Lily &mdash; 7 today! Sept. 14th. Love you, Daddy xx"</i>' : 'A little girl blowing out candles on a cake. Miller\'s daughter, surely. <i>Something\'s written on the back.</i>');
          },
          onClose: () => { photo.visible = true; } });
      } });

    // radio
    const radio = new THREE.Group();
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.14), new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.5 }));
    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.13), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.9 }));
    grill.position.set(-0.07, 0, 0.071);
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), P.bulbMat(0xffb060, 1.2)); dial.position.set(0.09, 0.03, 0.071);
    const knob1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12), M.bakelite); knob1.rotation.x = Math.PI / 2; knob1.position.set(0.07, -0.05, 0.08);
    const knob2 = knob1.clone(); knob2.position.x = 0.12;
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.4, 4), M.chrome); ant.position.set(0.14, 0.28, -0.03); ant.rotation.z = -0.3;
    radio.add(rb, grill, dial, knob1, knob2, ant);
    radio.position.set(19.75, 0.885, dz + 0.1); radio.rotation.y = 0.25;
    radio.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(radio);
    B.bakeGroup(radio);
    S.radio = radio; S.radioDial = dial;
    S.radio.position.x = 19.35;
    IX().add({ id: 'radio', mesh: radio, pad: 0.04, glint: true,
      prompt: () => G.flag('radio_taken') ? 'Examine <b>radio</b>' : 'Take the <b>batteries</b> from the radio',
      use: () => {
        if (G.flag('radio_taken')) { think('Dead as a doornail now. Sorry, Miller.'); return; }
        if (S.chatter) { S.chatterCut = true; S.chatter = false; G.ui.clearSubs(); setTimeout(() => think('Sorry, Miller. I need these more than you do.'), 500); }
        G.setFlag('radio_taken');
        G.audio.play('click', { pos: [19.35, 0.9, dz + 0.1], freq: 900 });
        if (S.static) { S.static.stop(0.2); S.static = null; }
        dial.material.emissiveIntensity = 0;
        if (G.inv.has('flashlight_dead')) {
          G.inv.replace('flashlight_dead', 'flashlight', false);
          G.audio.play('pickup', { bus: 'ui', wet: 0.1 });
          flashlightReady();
        } else G.inv.add('batteries');
      } });

    // flashlight
    const fl = P.model.flashlight();
    fl.position.set(22.75, 0.81, dz + 0.25); fl.rotation.y = 2.4;
    scene.add(fl);
    S.flashModel = fl;
    IX().add({ id: 'flashlight', mesh: fl, pad: 0.05, glint: true, enabled: () => !G.flag('took_flashlight'),
      prompt: () => 'Take <b>Flashlight</b>',
      use: () => {
        G.setFlag('took_flashlight');
        IX().flyToCamera(fl);
        if (G.inv.has('batteries')) {
          G.inv.remove('batteries');
          G.inv.add('flashlight');
          flashlightReady();
        } else {
          G.inv.add('flashlight_dead');
          G.audio.play('click', { bus: 'sfx', freq: 1200 });
          setTimeout(() => think('Click. Nothing. The battery compartment\'s empty.'), 700);
        }
      } });

    // mug, clock, filing cabinet, bulletin board + memo
    B.cyl({ x: 22.35, y: 0.84, z: dz + 0.3, r: 0.04, h: 0.1, mat: M.white });
    IX().add({ id: 'mug', box: [22.35, 0.84, dz + 0.3, 0.1, 0.12, 0.1], prompt: () => 'Examine <b>mug</b>', use: () => think('Cold coffee. Four sugars, by the smell.') });
    P.clock(18.02, 2.45, -4.2, Math.PI / 2, { h: 11, m: 47 });
    IX().add({ id: 'clock', box: [18.05, 2.45, -4.2, 0.1, 0.36, 0.36], prompt: () => 'Look at the <b>clock</b>', use: () => think('Eleven forty-seven. It stopped when the power dipped.') });
    B.box({ x: 18.3, y: 0.66, z: -6.7, w: 0.5, h: 1.32, d: 0.6, mat: M.metalGray, col: true });
    for (let k = 0; k < 3; k++) B.box({ x: 18.56, y: 0.25 + k * 0.42, z: -6.7, w: 0.02, h: 0.02, d: 0.14, mat: M.steel });
    B.box({ x: 18.02, y: 1.6, z: -5.3, w: 0.03, h: 0.7, d: 1.0, mat: new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.95 }) });
    B.decal(G.tex.noteTex('typed', 21), { x: 18.04, y: 1.62, z: -5.05, w: 0.2, h: 0.26, ry: Math.PI / 2, rz: 0.04 });
    B.decal(G.tex.noteTex('typed', 22), { x: 18.04, y: 1.66, z: -5.55, w: 0.2, h: 0.26, ry: Math.PI / 2, rz: -0.05 });
    IX().add({ id: 'memo', box: [18.05, 1.62, -5.05, 0.08, 0.3, 0.24], glint: true, prompt: () => 'Read the <b>memo</b>', use: () => G.docs.add('memo') });
    IX().add({ id: 'roster', box: [18.05, 1.66, -5.55, 0.08, 0.3, 0.24], prompt: () => 'Read the <b>duty roster</b>', use: () => think('Duty roster. Kowalski: north tower, every night this week. Poor sod.') });

    buildKeyCabinet();
  }

  function flashlightReady() {
    G.setFlag('has_flashlight');
    G.lights.flashOn = true;
    G.audio.play('click', { bus: 'sfx', freq: 1400 });
    setTimeout(() => { G.ui.think('Let there be light.'); G.ui.hint('Press <b>F</b> to switch the flashlight on and off.', 'Tip'); }, 600);
  }

  // ------------------------------------------------------------------ key cabinet + dial lock
  function buildKeyCabinet() {
    const M = G.M, scene = G.engine.scene;
    const cab = new THREE.Group();
    cab.position.set(23.99, 1.45, -4.3);
    cab.rotation.y = -Math.PI / 2;
    scene.add(cab);
    const W = 0.6, H = 0.8, D = 0.14;
    // box (local +Z points into the room)
    B.box({ parent: cab, x: 0, y: 0, z: 0.006, w: W, h: H, d: 0.012, mat: M.metalGray });
    B.box({ parent: cab, x: -W / 2, y: 0, z: D / 2, w: 0.012, h: H, d: D, mat: M.metalGray });
    B.box({ parent: cab, x: W / 2, y: 0, z: D / 2, w: 0.012, h: H, d: D, mat: M.metalGray });
    B.box({ parent: cab, x: 0, y: H / 2, z: D / 2, w: W, h: 0.012, d: D, mat: M.metalGray });
    B.box({ parent: cab, x: 0, y: -H / 2, z: D / 2, w: W, h: 0.012, d: D, mat: M.metalGray });
    // hooks & labels inside
    const names = ['C-GATE', 'D-GATE', 'YARD', 'ARMORY', 'INFIRM.', 'ADMIN', 'CHAPEL', 'TOWER N', 'TOWER S', 'KITCHEN', 'LAUNDRY', 'GEN B'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const hx = -0.21 + c * 0.14, hy = 0.22 - r * 0.22;
      const hk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6), M.brass); hk.rotation.x = Math.PI / 2; hk.position.set(hx, hy, 0.03); cab.add(hk);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.03), new THREE.MeshStandardMaterial({ map: G.tex.label(names[r * 4 + c], { w: 256, h: 72 }), roughness: 0.7 }));
      lab.position.set(hx, hy + 0.06, 0.014); cab.add(lab);
      if (r * 4 + c > 0 && (r * 4 + c) % 3 === 1) { const k = P.model.key(0xa8a8a0, false); k.rotation.set(0, 0, -Math.PI / 2); k.position.set(hx, hy - 0.01, 0.045); cab.add(k); }
    }
    const key = P.model.key();
    key.rotation.set(0, 0, -Math.PI / 2);
    key.position.set(-0.21, 0.21, 0.045);
    cab.add(key);
    S.gateKeyModel = key;
    key.userData.keep = true;
    // door, hinged on the viewer's left edge
    const dp = new THREE.Group(); dp.position.set(-W / 2, 0, D + 0.01); cab.add(dp);
    B.box({ parent: dp, x: W / 2, y: 0, z: 0, w: W, h: H, d: 0.02, mat: M.metalGray });
    B.box({ parent: dp, x: W - 0.07, y: 0.08, z: 0.02, w: 0.03, h: 0.12, d: 0.025, mat: M.steel });
    B.decal(G.tex.sign('KEYS', { w: 256, h: 96, bg: '#b8322a', fg: '#f4ecd8', size: 60 }), { parent: dp, x: W / 2, y: 0.28, z: 0.012, w: 0.22, h: 0.08 });
    B.box({ parent: dp, x: W - 0.07, y: -0.08, z: 0.015, w: 0.05, h: 0.03, d: 0.01, mat: M.steel });
    S.cabDoor = dp;
    // dial padlock hanging on the hasp
    const lock = new THREE.Group();
    lock.position.set(W - 0.07, -0.14, 0.035);
    dp.add(lock);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.075, 0.035), M.brass); lock.add(body);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 8, 16, Math.PI), M.chrome); shackle.position.y = 0.037; lock.add(shackle);
    S.shackle = shackle;
    S.digitTex = [];
    for (let d = 0; d < 10; d++) {
      S.digitTex.push(G.tex.canvasTex(64, 64, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#050403'); g.addColorStop(0.5, '#2a2218'); g.addColorStop(1, '#050403');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f1e8d0'; ctx.font = '600 44px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(d), w / 2, h / 2 + 2);
        ctx.fillStyle = 'rgba(241,232,208,.25)'; ctx.font = '600 30px "IBM Plex Mono", monospace';
        ctx.fillText(String((d + 1) % 10), w / 2, -6); ctx.fillText(String((d + 9) % 10), w / 2, h + 8);
      }));
    }
    S.wheels = [];
    S.digits = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.016, 18), new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.5, metalness: 0.4 }));
      wh.rotation.z = Math.PI / 2;
      wh.position.set(-0.03 + i * 0.02, -0.008, 0.012);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.016, 0.022), new THREE.MeshStandardMaterial({ map: S.digitTex[0], roughness: 0.4 }));
      face.position.set(-0.03 + i * 0.02, -0.008, 0.0252);
      lock.add(wh, face);
      wh.userData.face = face;
      S.wheels.push(wh);
    }
    S.lock = lock;
    lock.userData.keep = true;
    dp.userData.keep = true;
    cab.traverse((o) => { if (o.isMesh && o.geometry.type === 'PlaneGeometry') o.castShadow = false; });
    B.bakeGroup(cab);
    dp.userData.keep = false;
    B.bakeGroup(dp);
    S.setWheel = (i) => {
      const wh = S.wheels[i];
      wh.userData.face.material.map = S.digitTex[S.digits[i]];
      G.tween(0.12, (k) => { wh.rotation.x = (1 - k) * 0.6; });
    };

    IX().add({ id: 'cabinet', box: [23.9, 1.45, -4.3, 0.22, 0.82, 0.64], enabled: () => !G.flag('cabinet_open'),
      prompt: () => 'Examine the <b>key cabinet</b>',
      use: () => focusLock() });
    IX().add({ id: 'gatekey', box: [23.93, 1.64, -4.51, 0.14, 0.2, 0.16], enabled: () => G.flag('cabinet_open') && !G.inv.has('gate_key') && !G.flag('gate_open'),
      prompt: () => 'Take <b>C-Block Gate Key</b>', glint: false,
      use: () => { S.gateKeyModel.visible = false; G.inv.add('gate_key'); think('C-GATE. That\'s my ticket out of the block.'); } });
  }

  function focusLock() {
    const lockWorld = S.lock.getWorldPosition(new THREE.Vector3());
    const normal = new THREE.Vector3(-1, 0, 0);
    // generous invisible hit boxes + engraved up/down arrows, created once
    if (!S.wheelHits) {
      const arrowMat = new THREE.MeshStandardMaterial({ color: 0x140c04, roughness: 0.7, metalness: 0.2 });
      const tri = (up) => { const sh = new THREE.Shape(); sh.moveTo(-0.004, 0); sh.lineTo(0.004, 0); sh.lineTo(0, up ? 0.005 : -0.005); sh.closePath(); return new THREE.ShapeGeometry(sh); };
      S.wheelHits = S.wheels.map((wh) => {
        const hb = new THREE.Mesh(new THREE.BoxGeometry(0.0195, 0.062, 0.03), G.M.invisible);
        hb.position.set(wh.position.x, -0.008, 0.02);
        S.lock.add(hb);
        const au = new THREE.Mesh(tri(true), arrowMat); au.position.set(wh.position.x, 0.014, 0.0178); S.lock.add(au);
        const ad = new THREE.Mesh(tri(false), arrowMat); ad.position.set(wh.position.x, -0.03, 0.0178); S.lock.add(ad);
        return hb;
      });
    }
    const center = S.wheels[1].getWorldPosition(new THREE.Vector3()).lerp(S.wheels[2].getWorldPosition(new THREE.Vector3()), 0.5);
    const turn = (i, delta) => {
      S.digits[i] = (S.digits[i] + delta + 10) % 10;
      S.setWheel(i);
      G.audio.play('tick', { pos: lockWorld, freq: 3800 + i * 200 });
      checkCombo();
    };
    const parts = S.wheelHits.map((hb, i) => ({
      obj: hb,
      click: (hit) => turn(i, hit.point.y > S.wheels[i].getWorldPosition(new THREE.Vector3()).y ? 1 : -1),
      wheel: (d) => turn(i, d < 0 ? 1 : -1),
      onHover: (on) => { const m = S.wheels[i].userData.face.material; m.emissive.setHex(on ? 0x5a4010 : 0x000000); },
    }));
    parts.push({ obj: S.shackle, click: () => { G.audio.play('metalHit', { pos: lockWorld, v: 0.2, decay: 0.3, pitch: 3 }); G.ui.think('Won\'t budge. Four digits.'); } });
    G.focus.enter({
      pos: center.clone().addScaledVector(normal, 0.2).add(new THREE.Vector3(0, 0.025, 0)), look: center,
      parts, help: '<span class="key">Click</span> above / below the middle of a wheel (or scroll) &nbsp; <span class="key">RMB</span> step back',
      onExit: () => S.wheels.forEach((w) => w.userData.face.material.emissive.setHex(0)),
    });
  }
  function checkCombo() {
    if (S.digits.join('') !== '0914' || G.flag('cabinet_open')) return;
    G.setFlag('cabinet_open');
    const lockWorld = S.lock.getWorldPosition(new THREE.Vector3());
    G.audio.play('padlock', { pos: lockWorld });
    G.audio.play('solve', { bus: 'ui', vol: 0.5, wet: 0.3 });
    G.tween(0.25, (k) => { S.shackle.position.y = 0.037 + k * 0.025; });
    setTimeout(async () => {
      await G.focus.exit();
      openCabinet(true);
    }, 700);
  }
  function openCabinet(anim) {
    const lock = S.lock;
    if (anim) {
      G.tween(0.5, (k) => { lock.position.y = -0.12 - k * k * 1.3; lock.rotation.x = k * 2; }).then(() => { lock.visible = false; G.audio.play('metalHit', { pos: [23.7, 0.05, -4.2], v: 0.5, decay: 0.6, pitch: 1.8 }); });
      G.audio.play('creak', { pos: [23.8, 1.45, -4.3], dur: 0.8, freq: 170, v: 0.5 });
      G.tween(1.0, (k) => { S.cabDoor.rotation.y = -k * 1.9; }, { ease: U.easeOut });
    } else { lock.visible = false; S.cabDoor.rotation.y = -1.9; }
  }

  // ------------------------------------------------------------------ C-Block gate
  function buildGate() {
    const M = G.M, scene = G.engine.scene;
    B.setArea('block');
    P.bars('z', 24.0, -2.5, -1.25, 0, 3.2);
    P.bars('z', 24.0, 0.75, 2.0, 0, 3.2);
    B.box({ x: 24.0, y: 1.6, z: -1.25, w: 0.1, h: 3.2, d: 0.1, mat: M.bars });
    B.box({ x: 24.0, y: 1.6, z: 0.75, w: 0.1, h: 3.2, d: 0.1, mat: M.bars });
    const pivot = new THREE.Group();
    pivot.position.set(24.0, 0.02, -1.22);
    pivot.rotation.y = -Math.PI / 2;
    scene.add(pivot);
    const leaf = P.barLeaf(1.94, 3.0, { lock: true, lockX: 1.78 });
    leaf.position.z = 0;
    pivot.add(leaf);
    S.gate = pivot;
    S.gateCol = B.collider(23.94, 0, -1.25, 24.06, 3.2, 0.75, 'gate');
    B.decal(G.tex.sign('C BLOCK', { w: 512, h: 128, bg: '#1d3b2a', fg: '#e8e0c8', border: '#e8e0c8' }), { x: 24.32, y: 3.7, z: -0.25, w: 1.6, h: 0.4, ry: Math.PI / 2 });
    IX().add({ id: 'gate', box: [24.0, 1.3, -0.25, 0.3, 2.4, 2.0], range: 2.5, enabled: () => !G.flag('gate_open'),
      prompt: () => G.inv.has('gate_key') ? 'Unlock the gate with the <b>C-Block Gate Key</b>' : 'Try the <b>C-Block gate</b>',
      use: async () => {
        if (!G.inv.has('gate_key')) { G.audio.play('metalHit', { pos: [24, 1.2, 0.5], v: 0.5, decay: 1.2 }); think('Locked. The key will be in the guard station &mdash; they never carry them on night shift.'); return; }
        G.player.control = false;
        G.inv.remove('gate_key');
        G.audio.play('unlock', { pos: [24, 1.1, 0.55] });
        await G.wait(0.8);
        G.audio.play('creak', { pos: [24, 1.5, -0.2], dur: 1.6, freq: 95, v: 0.9 });
        G.tween(1.6, (k) => { S.gate.rotation.y = -Math.PI / 2 + k * 1.45; }, { ease: U.easeOut });
        S.gateCol.enabled = false;
        G.setFlag('gate_open');
        await G.wait(0.6);
        G.player.control = true;
        G.checkpoint('gate_open');
      } });
  }

  // ------------------------------------------------------------------ state application (new game / load)
  L.apply = function () {
    const f = G.flag;
    if (S.snores && S.snores.length) { S.snores.forEach((s) => s && s.stop(0.2)); }
    S.snores = [];
    if (S.static) { S.static.stop(0.2); S.static = null; }
    S.chatter = false; S.mackSpoke = f('cell_open');
    S.mackLine = 0;
    S.spoon.visible = !f('took_spoon');
    S.cup.visible = !f('took_cup');
    if (f('socket_open')) { S.screws.forEach((s) => (s.visible = false)); S.plate.rotation.set(-Math.PI / 2, Math.PI, 0.08); S.plate.position.set(13.75, 0.012, 5.66); }
    else { S.screws.forEach((s, k) => { s.visible = true; s.rotation.set(Math.PI / 2, 0, 0); s.position.set(0, k ? 0.045 : -0.045, 0.008); }); S.plate.rotation.set(0, Math.PI, 0.08); S.plate.position.set(13.75, 0.32, 5.778); }
    if (f('has_map')) { S.brick.position.set(13.5, 1.32, 5.55); S.brick.rotation.x = 0.4; } else { S.brick.position.set(13.5, 1.62, 5.8); S.brick.rotation.set(0, 0, 0); }
    S.book.position.x = f('read_letter1') ? 12.32 : 12.24;
    S.photo.visible = true;
    const blackout = f('blackout_c');
    S.cellLamp.on = !blackout; S.cellLamp.flicker = 'fluoro';
    S.night.forEach((v) => { v.on = !blackout; v.flicker = 'fluoro'; });
    S.emerg.forEach((v) => { v.on = blackout; v.level = 1; });
    S.guardEmerg.on = blackout;
    if (f('cell_open')) { S.door.position.x = 13.8 - 0.98; S.doorCol.enabled = false; } else { S.door.position.x = 13.8; S.doorCol.enabled = true; }
    S.flashModel.visible = !f('took_flashlight');
    S.radioDial.material.emissiveIntensity = f('radio_taken') ? 0 : 1.2;
    if (f('cabinet_open')) { openCabinet(false); S.shackle.position.y = 0.062; }
    else {
      S.cabDoor.rotation.y = 0; S.lock.visible = true; S.lock.position.set(0.53, -0.14, 0.035); S.lock.rotation.set(0, 0, 0); S.shackle.position.y = 0.037;
      S.digits = [0, 0, 0, 0]; S.wheels.forEach((w, i) => { w.userData.face.material.map = S.digitTex[0]; w.rotation.x = 0; });
    }
    S.gateKeyModel.visible = !G.inv.has('gate_key') && !f('gate_open');
    if (f('gate_open')) { S.gate.rotation.y = -Math.PI / 2 + 1.45; S.gateCol.enabled = false; } else { S.gate.rotation.y = -Math.PI / 2; S.gateCol.enabled = true; }
    if (f('photo_back')) { /* nothing visual */ }
  };

  // ------------------------------------------------------------------ per-frame
  let monT = 0, dropY = 4.4, spotT = 0;
  L.update = function (dt, t) {
    const area = G.world.current ? G.world.current.name : '';
    // the cell bulb gets a real shadow-casting spot while we're in the cell
    const sp = G.lights.spotB;
    if (area === 'cell' && S.cellLamp.eff > 0.01) {
      S.usingSpot = true;
      sp.position.set(13.5, 2.72, 3.9); sp.target.position.set(13.5, 0, 4.0); sp.target.updateMatrixWorld();
      sp.color.setHex(0xffc27a); sp.angle = 1.25; sp.penumbra = 0.9; sp.distance = 9; sp.decay = 2;
      sp.intensity = S.cellLamp.eff * G.engine.lightScale * 1.3;
      spotT -= dt; if (spotT <= 0) { spotT = 0.25; sp.shadow.needsUpdate = true; }
      S.cellLamp.poolScale = 0.4;
    } else if (S.usingSpot) { S.usingSpot = false; sp.intensity = 0; S.cellLamp.poolScale = 1; }
    const inBlock = area === 'block' || area === 'cell' || area === 'guard';
    // snorers
    if (inBlock && !S.snores.length && G.audio.ready) S.snores = S.snorePos.map((p) => G.audio.loop('snore', { pos: p, vol: 0.35, ref: 1.2, roll: 1.4, wet: 0.3 }));
    if (!inBlock && S.snores.length) { S.snores.forEach((s) => s && s.stop(1)); S.snores = []; }
    // drip visual
    dropY -= dt * 7;
    if (dropY < 0.25) dropY = 4.4 + Math.random() * 6;
    if (!S.drop) { S.drop = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0, metalness: 0.5 })); G.engine.scene.add(S.drop); }
    S.drop.position.set(9.6, Math.min(4.45, dropY), 0.2);
    S.drop.visible = dropY < 4.45;
    // Mack's whisper when first passing after escaping
    const pp = G.player.pos;
    if (G.flag('cell_open') && !S.mackSpoke && pp.x > 15.2 && pp.x < 19 && pp.z < 1.5 && pp.z > -2.4) {
      S.mackSpoke = true;
      G.ui.say('Psst. Tom\'s boy. Well, I\'ll be damned&hellip; he said you\'d try it tonight.', { speaker: 'Mack', whisper: true, pos: [17.4, 1.5, 4.2], vol: 0.7 });
      S.mackLine = 1;
    }
    // Mack's ember breathing
    if (S.emberLight) S.emberLight.intensity = 0.4 + 0.5 * Math.max(0, Math.sin(t * 0.6));
    // first entry into the guard station -> radio chatter
    if (area === 'guard' && !G.flag('visited_guard')) { G.setFlag('visited_guard'); radioChatter(); }
    // CCTV monitors ~8fps
    if (area === 'guard' || area === 'block') {
      monT -= dt;
      if (monT <= 0) { monT = 0.12; drawMonitors(t); }
    }
  };

  async function radioChatter() {
    if (G.flag('radio_taken')) return;
    S.chatter = true;
    const pos = [19.35, 0.95, -6.55];
    S.static = G.audio.loop('radioStatic', { pos, vol: 0.12, ref: 1, roll: 1.5, wet: 0.2 });
    await G.wait(1.2);
    S.chatterCut = false;
    const r = (spk, text, pitch) => (S.chatterCut ? Promise.resolve() : G.ui.say(text, { speaker: spk, kind: 'radio', pos, pitch, vol: 0.9 }));
    await r('Control', 'Miller, come in. C Block just dropped off the board. What\'s going on over there?', 125);
    await G.wait(0.4);
    await r('Miller', '&hellip;whole east wing\'s flickering. I\'m at the infirmary with Harlan &mdash; old man\'s in a bad way.', 105);
    await G.wait(0.3);
    await r('Control', 'Copy. Leave C to the emergency lights. Kowalski\'s up the north tower on the searchlight. Nobody\'s going anywhere in this weather.', 125);
    await G.wait(0.3);
    await r('Miller', 'Famous last words. Miller out.', 105);
    if (S.chatterCut) return;
    S.chatter = false;
    await G.wait(0.8);
    G.ui.think('Harlan. Tom. Hang on, old man.');
  }

  // CCTV: draws baked frames with overlay text
  L.drawMonitorsNow = (t) => drawMonitors(t);
  function drawMonitors(t) {
    if (!S.monitors) return;
    for (const m of S.monitors) {
      const c = m.ctx, w = 256, h = 192;
      if (m.frames.length) {
        const fi = Math.floor(t * 3 + m.k) % m.frames.length;
        c.putImageData(m.frames[fi], 0, 0);
      } else { c.fillStyle = '#0a1210'; c.fillRect(0, 0, w, h); }
      // scanlines & noise
      c.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
      const band = (t * 40 + m.k * 60) % (h + 40) - 20;
      c.fillStyle = 'rgba(200,255,230,0.05)'; c.fillRect(0, band, w, 14);
      for (let k = 0; k < 90; k++) { c.fillStyle = `rgba(220,255,240,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 1); }
      c.fillStyle = 'rgba(210,255,225,0.85)'; c.font = '600 13px "IBM Plex Mono", monospace';
      c.fillText(m.label, 8, 18);
      const s = Math.floor(t) % 60;
      c.fillText('10-13-71  23:' + String(48 + Math.floor(t / 60) % 12).padStart(2, '0') + ':' + String(s).padStart(2, '0'), 8, h - 10);
      if (Math.floor(t * 2) % 2) { c.fillStyle = '#ff4a3a'; c.beginPath(); c.arc(w - 16, 14, 4, 0, Math.PI * 2); c.fill(); }
      m.tex.needsUpdate = true;
    }
  }
})();
