// level_chapel.js — the fort-era chapel (chain, candles, stained glass, organ puzzle) and the smugglers' passage (symbol door)
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U, B = G.B, P = G.P;
  const L = { name: 'chapel' };
  G.levels.push(L);
  const S = (L.s = { played: [] });
  const think = (t, o) => G.ui.think(t, o);
  const IX = () => G.interact;
  const TUNE = [9, 0, 4, 2, 0, 11, 9]; // A C E D C B A (pitch classes)
  let tunnelTold = false;
  const CODE = ['moon', 'anchor', 'star'];

  L.build = function () {
    B.area({ name: 'chapel', show: ['chapel', 'yard', 'tunnel'], boxes: [[84.3, -1, 3.2, 101.75, 12, 16.8]], lights: ['chapel'], reverb: 'chapel', music: 'chapel',
      amb: { rain: 0.45, rainMuffle: 1400, room: 0.2, wind: 0.2 }, look: { fog: 0.028, fogColor: [0.035, 0.026, 0.02], hemi: 0.16, hemiSky: [0.5, 0.4, 0.3], hemiGround: [0.12, 0.08, 0.05], moon: 0.45, exposure: 1.35, env: 0.25, sat: 0.95, gain: [1.05, 0.98, 0.9] } });
    B.area({ name: 'tunnel', show: ['tunnel', 'chapel', 'cave'], boxes: [[101.75, -9.5, 8, 124.5, 3.2, 30.2]], lights: ['tunnel', 'chapel'], reverb: 'tunnel', music: 'tunnel',
      noSky: true, amb: { rain: 0.05, rainMuffle: 300, room: 0.5, waves: 0.15 }, look: { fog: 0.08, fogColor: [0.012, 0.014, 0.016], hemi: 0.05, moon: 0.0, exposure: 1.3, env: 0.15 } });
    buildChapelShell();
    buildChapelInterior();
    buildOrgan();
    buildTunnel();
  };

  // ------------------------------------------------------------------ chapel shell
  function buildChapelShell() {
    const M = G.M, scene = G.engine.scene;
    B.setArea('chapel');
    B.floor(84.3, 3.3, 101.7, 16.7, 0, M.stoneFloor, 'stone');
    B.region(83.9, 9.2, 84.6, 10.8, 0, 'stone');
    // chancel platform + step
    B.box({ x: 98.95, y: 0.225, z: 10, w: 5.5, h: 0.45, d: 13.4, mat: M.stoneFloor, cast: false });
    B.box({ x: 96.0, y: 0.11, z: 10, w: 0.5, h: 0.22, d: 13.4, mat: M.stoneFloor, cast: false });
    B.region(95.75, 3.3, 96.25, 16.7, 0.22, 'stone');
    B.region(96.2, 3.3, 101.75, 16.7, 0.45, 'stone');
    const northWins = [87.5, 91.5].map((a) => ({ a0: a - 0.7, a1: a + 0.7, y0: 2.2, y1: 5.8 }));
    const southWins = [87.5, 91.5, 95.5].map((a) => ({ a0: a - 0.7, a1: a + 0.7, y0: 2.2, y1: 5.8 }));
    B.wall('x', 3.05, 84.0, 102.2, 0, 7, M.stone, northWins, { thick: 0.5 });
    B.wall('x', 16.95, 84.0, 102.2, 0, 7, M.stone, southWins, { thick: 0.5 });
    B.wall('z', 84.25, 3.3, 16.7, 0, 7, M.stone, [{ a0: 9.2, a1: 10.8, y0: 0, y1: 2.9 }], { thick: 0.5 });
    B.wall('z', 101.95, 3.3, 16.7, 0, 7, M.stone, [{ a0: 9.3, a1: 10.7, y0: 0.45, y1: 2.65 }, { a0: 8.5, a1: 11.5, y0: 3.7, y1: 6.7 }], { thick: 0.5 });
    // gables + roof
    const gable = (x) => {
      const sh = new THREE.Shape(); sh.moveTo(2.8, 0); sh.lineTo(17.2, 0); sh.lineTo(10, 4.2); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false });
      B.add(g, M.stone, { pos: [x + 0.5, 7, 0], rot: [0, -Math.PI / 2, 0] });
    };
    gable(84.0); gable(101.7);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.85, map: G.tex.sets.woodDark.map });
    const rl = Math.hypot(7.4, 4.3);
    B.box({ x: 93.1, y: 9.15, z: 6.5, w: 18.6, h: 0.25, d: rl, rx: -0.54, mat: M.woodDark });
    B.box({ x: 93.1, y: 9.15, z: 13.5, w: 18.6, h: 0.25, d: rl, rx: 0.54, mat: M.woodDark });
    B.box({ x: 93.1, y: 9.33, z: 6.45, w: 18.8, h: 0.08, d: rl + 0.2, rx: -0.54, mat: roofMat });
    B.box({ x: 93.1, y: 9.33, z: 13.55, w: 18.8, h: 0.08, d: rl + 0.2, rx: 0.54, mat: roofMat });
    for (let x = 85.5; x < 101; x += 2.2) {
      B.box({ x, y: 6.9, z: 10, w: 0.25, h: 0.25, d: 13.4, mat: M.woodDark });
      B.box({ x, y: 8.75, z: 6.9, w: 0.2, h: 0.2, d: 5, rx: -0.54, mat: M.woodDark });
      B.box({ x, y: 8.75, z: 13.1, w: 0.2, h: 0.2, d: 5, rx: 0.54, mat: M.woodDark });
    }
    // belfry
    B.box({ x: 84.6, y: 11.8, z: 10, w: 1.6, h: 2.2, d: 1.6, mat: M.stone });
    B.box({ x: 84.6, y: 13.1, z: 10, w: 1.9, h: 0.3, d: 1.9, mat: roofMat });
    B.add(new THREE.ConeGeometry(1.3, 2.4, 4), roofMat, { pos: [84.6, 14.4, 10], rot: [0, Math.PI / 4, 0], uv: 'native' });
    // porch
    B.box({ x: 83.2, y: 3.3, z: 10, w: 1.8, h: 0.18, d: 3.0, mat: M.woodDark });
    B.box({ x: 82.45, y: 1.6, z: 8.65, w: 0.18, h: 3.2, d: 0.18, mat: M.woodDark, col: true });
    B.box({ x: 82.45, y: 1.6, z: 11.35, w: 0.18, h: 3.2, d: 0.18, mat: M.woodDark, col: true });
    B.collider(82.3, 3.2, 8.5, 84.1, 3.5, 11.5, 'porch');
    B.decal(G.tex.sign('ST. BRENDAN\'S\nCHAPEL', { w: 512, h: 200, bg: '#2a2218', fg: '#d8c8a0', border: '#d8c8a0', size: 56, font: 'Georgia, serif' }), { x: 83.98, y: 3.7, z: 10, w: 1.3, h: 0.5, ry: -Math.PI / 2 });
    S.porchLamp = P.cageLamp(83.7, 3.2, 10, { drop: 0.1, color: 0xffb870, intensity: 2.5, distance: 6, area: 'yard', flicker: 'broken' });

    // double doors (hinged at the jambs, open inward)
    const mkLeaf = (z, sign) => {
      const pv = new THREE.Group(); pv.position.set(84.25, 0, z); scene.add(pv);
      const leaf = new THREE.Group(); pv.add(leaf);
      B.box({ parent: leaf, x: 0, y: 1.45, z: sign * 0.4, w: 0.1, h: 2.9, d: 0.8, mat: M.woodDark });
      for (const y of [0.5, 1.5, 2.5]) B.box({ parent: leaf, x: -0.06, y, z: sign * 0.4, w: 0.03, h: 0.08, d: 0.78, mat: M.metalDark });
      B.cyl({ parent: leaf, x: -0.08, y: 1.3, z: sign * 0.68, r: 0.05, h: 0.02, rz: Math.PI / 2, mat: M.metalDark });
      B.bakeGroup(leaf);
      return pv;
    };
    S.doorN = mkLeaf(9.2, 1); S.doorS = mkLeaf(10.8, -1);
    S.doorCol = B.collider(84.1, 0, 9.2, 84.4, 2.9, 10.8, 'chapeldoor');
    // chain + padlock (outside)
    const chain = new THREE.Group(); chain.position.set(84.1, 1.3, 10); scene.add(chain);
    for (let k = 0; k < 9; k++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 10), M.steel);
      link.position.set(0, Math.sin(k / 8 * Math.PI) * -0.12, -0.36 + k * 0.09);
      link.rotation.set(k % 2 ? Math.PI / 2 : 0, Math.PI / 2, 0);
      chain.add(link);
    }
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.07), M.brass); pl.position.set(-0.02, -0.18, 0); chain.add(pl);
    chain.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    S.chain = chain;
    IX().add({ id: 'chapeldoor', box: [84.0, 1.4, 10, 0.4, 2.8, 1.7], enabled: () => !G.flag('chapel_open'),
      prompt: () => G.inv.has('boltcutters') ? 'Cut the chain with the <b>Bolt Cutters</b>' : 'Try the <b>chapel door</b>',
      use: async () => {
        if (!G.inv.has('boltcutters')) { G.audio.play('metalHit', { pos: [84.1, 1.3, 10], v: 0.3, decay: 0.6, pitch: 1.6 }); think('Chained and padlocked, like the warden\'s memo said. I need to cut through it.'); return; }
        G.player.control = false;
        G.audio.play('clunk', { pos: [84.1, 1.3, 10], v: 0.8, freq: 200, ring: 0.9, pitch: 2 });
        G.audio.play('metalHit', { pos: [84.1, 1.3, 10], v: 0.6, decay: 1, pitch: 2.4 });
        await G.wait(0.3);
        G.tween(0.6, (k) => { chain.position.y = 1.3 - k * k * 1.25; chain.rotation.x = k * 0.8; });
        await G.wait(0.6);
        G.audio.play('metalHit', { pos: [84.1, 0.1, 10], v: 0.4, decay: 0.5, pitch: 1.8 });
        openDoors(true);
        G.player.control = true;
      } });
  }
  function openDoors(anim) {
    G.setFlag('chapel_open');
    S.doorCol.enabled = false;
    if (anim) {
      G.audio.play('creak', { pos: [84.3, 1.4, 10], dur: 2.2, freq: 80, v: 0.8 });
      G.tween(2.2, (k) => { S.doorN.rotation.y = k * 1.4; S.doorS.rotation.y = -k * 1.4; }, { ease: U.easeOut });
    } else { S.doorN.rotation.y = 1.4; S.doorS.rotation.y = -1.4; S.chain.visible = false; }
  }

  // ------------------------------------------------------------------ interior
  function candle(x, y, z, h = 0.25, light) {
    const M = G.M;
    B.cyl({ x, y: y + h / 2, z, r: 0.025, h, mat: new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 }) });
    const flame = new THREE.Sprite(S.flameMat);
    flame.position.set(x, y + h + 0.035, z);
    flame.scale.set(0.05, 0.1, 1);
    flame.userData.phase = Math.random() * 10;
    flame.userData.base = flame.position.y;
    G.engine.scene.add(flame);
    S.flames.push(flame);
    if (light) G.lights.add({ pos: [x, y + h + 0.3, z], color: 0xffa050, intensity: light, distance: 9, flicker: 'candle', area: 'chapel' });
    void M;
  }
  function buildChapelInterior() {
    const M = G.M, scene = G.engine.scene;
    B.setArea('chapel');
    S.flames = [];
    S.flameMat = new THREE.SpriteMaterial({ map: G.tex.canvasTex(32, 64, (ctx) => {
      const g = ctx.createRadialGradient(16, 44, 1, 16, 40, 22); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, 'rgba(255,190,90,.95)'); g.addColorStop(0.7, 'rgba(255,90,20,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(16, 2); ctx.quadraticCurveTo(30, 40, 16, 62); ctx.quadraticCurveTo(2, 40, 16, 2); ctx.fill();
    }), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    S.flameMat.color.setScalar(2.2);
    // pews
    for (let r = 0; r < 5; r++) {
      const x = 87 + r * 1.65;
      for (const zc of [6.35, 13.65]) {
        B.box({ x, y: 0.45, z: zc, w: 0.45, h: 0.05, d: 4.3, mat: M.woodDark });
        B.box({ x: x + 0.22, y: 0.75, z: zc, w: 0.05, h: 0.6, d: 4.3, mat: M.woodDark });
        B.box({ x: x + 0.05, y: 0.22, z: zc - 2.1, w: 0.5, h: 0.45, d: 0.06, mat: M.woodDark });
        B.box({ x: x + 0.05, y: 0.22, z: zc + 2.1, w: 0.5, h: 0.45, d: 0.06, mat: M.woodDark });
        B.box({ x: x - 0.2, y: 0.12, z: zc, w: 0.12, h: 0.06, d: 4.1, mat: M.woodDark });
        B.colBox(x + 0.05, 0, zc, 0.55, 1.05, 4.3);
      }
    }
    // altar
    B.box({ x: 99.2, y: 0.95, z: 10, w: 1.0, h: 1.0, d: 2.4, mat: M.stone, col: true });
    B.box({ x: 99.2, y: 1.47, z: 10, w: 1.1, h: 0.04, d: 2.6, mat: M.cloth });
    B.box({ x: 98.66, y: 1.2, z: 10, w: 0.02, h: 0.5, d: 1.0, mat: new THREE.MeshStandardMaterial({ color: 0x7a1a1a, roughness: 0.8 }) });
    candle(99.2, 1.49, 9.0, 0.35, 7); candle(99.2, 1.49, 11.0, 0.35, 7);
    B.box({ x: 99.2, y: 1.53, z: 10, w: 0.3, h: 0.06, d: 0.2, mat: M.brass });
    B.box({ x: 99.2, y: 1.85, z: 10, w: 0.04, h: 0.6, d: 0.04, mat: M.brass });
    B.box({ x: 99.2, y: 1.95, z: 10, w: 0.04, h: 0.04, d: 0.3, mat: M.brass });
    // hidden stone panel behind altar (the passage door)
    const panel = new THREE.Group(); panel.position.set(101.95, 0.45, 10); scene.add(panel);
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.46, 2.2, 1.4), M.stone); pm.position.y = 1.1; pm.castShadow = true; pm.receiveShadow = true; panel.add(pm);
    const relief = G.tex.canvasTex(256, 384, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(20,16,12,.8)'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.save(); ctx.translate(3, 3); G.tex.drawSymbol(ctx, 'anchor', w / 2, h / 2, 80, 'rgba(15,12,8,.7)'); ctx.restore();
      G.tex.drawSymbol(ctx, 'anchor', w / 2, h / 2, 80, 'rgba(210,200,180,.35)');
      ctx.font = 'italic 22px Georgia'; ctx.fillStyle = 'rgba(30,24,18,.8)'; ctx.textAlign = 'center'; ctx.fillText('THEY THAT GO DOWN', w / 2, 44); ctx.fillText('TO THE SEA', w / 2, h - 34);
    });
    const rm = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.0), new THREE.MeshStandardMaterial({ map: relief, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
    rm.position.set(-0.235, 1.1, 0); rm.rotation.y = -Math.PI / 2; panel.add(rm);
    S.panel = panel;
    S.panelCol = B.collider(101.7, 0.45, 9.3, 102.2, 2.65, 10.7, 'panel');
    IX().add({ id: 'panel', box: [101.72, 1.5, 10, 0.1, 2.0, 1.4], enabled: () => !G.flag('altar_open'), prompt: () => 'Examine the <b>carved panel</b>',
      use: () => think('"They that go down to the sea." An anchor, carved in the stone. It sounds hollow when I knock.') });

    // stained glass
    S.glass = [];
    const mkWindow = (x, z, face, motif, seed) => {
      const tex = G.tex.stainedGlass(seed, motif);
      const m = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.3, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 3.6), m);
      mesh.position.set(x, 4.0, z); mesh.rotation.y = face;
      scene.add(mesh);
      S.glass.push(m);
      // coloured light pool on the floor (additive)
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      pool.rotation.x = -Math.PI / 2; pool.rotation.z = face === 0 ? 0 : Math.PI;
      pool.position.set(x + 0.6, 0.02, z + (face === 0 ? 2.8 : -2.8));
      pool.renderOrder = 3;
      scene.add(pool);
      S.glass.push(pool.material);
      return mesh;
    };
    mkWindow(87.5, 3.05, 0, 'ship', 11); mkWindow(91.5, 3.05, 0, 'anchor', 12);
    mkWindow(87.5, 16.95, Math.PI, 'lighthouse', 13); mkWindow(91.5, 16.95, Math.PI, 'cross', 14); mkWindow(95.5, 16.95, Math.PI, 'ship', 15);
    const rose = G.tex.roseWindow();
    const rmat = new THREE.MeshStandardMaterial({ map: rose, emissive: 0xffffff, emissiveMap: rose, emissiveIntensity: 0.35, roughness: 0.3, side: THREE.DoubleSide });
    const rmesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), rmat); rmesh.position.set(101.95, 5.2, 10); rmesh.rotation.y = -Math.PI / 2; scene.add(rmesh);
    S.glass.push(rmat);
    S.roseLight = G.lights.add({ pos: [99.5, 5.2, 10], color: 0x8a70c0, intensity: 0.5, distance: 12, area: 'chapel' });

    // candle stands
    const stand = (x, z) => {
      B.cyl({ x, base: 0, z, r: 0.03, h: 1.3, mat: M.brass });
      B.cyl({ x, y: 0.02, z, r: 0.2, h: 0.04, mat: M.brass });
      B.cyl({ x, y: 1.32, z, r: 0.22, h: 0.03, mat: M.brass });
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; candle(x + Math.cos(a) * 0.15, 1.33, z + Math.sin(a) * 0.15, 0.12 + (k % 2) * 0.06, k === 0 ? 7 : 0); }
      B.colBox(x, 0, z, 0.45, 1.4, 0.45);
    };
    stand(95.4, 4.2); stand(95.4, 15.8); stand(85.3, 4.0);
    // votive rack by the door
    B.box({ x: 85.1, y: 0.8, z: 12.8, w: 0.4, h: 0.06, d: 1.2, mat: M.metalDark });
    B.box({ x: 85.1, y: 0.4, z: 12.8, w: 0.35, h: 0.8, d: 0.05, mat: M.metalDark });
    for (let k = 0; k < 8; k++) candle(85.02 + (k % 2) * 0.16, 0.83, 12.35 + Math.floor(k / 2) * 0.3, 0.05, k === 3 ? 4 : 0);
    B.colBox(85.1, 0, 12.8, 0.45, 0.9, 1.25);

    // lectern + hymnal
    B.cyl({ x: 94.6, base: 0, z: 14.2, r: 0.06, h: 1.0, mat: M.woodDark });
    B.box({ x: 94.6, y: 0.03, z: 14.2, w: 0.5, h: 0.06, d: 0.5, mat: M.woodDark });
    B.box({ x: 94.6, y: 1.1, z: 14.2, w: 0.45, h: 0.04, d: 0.55, rz: -0.35, mat: M.woodDark });
    B.colBox(94.6, 0, 14.2, 0.5, 1.2, 0.55);
    const book = new THREE.Group();
    const pageTex = G.tex.canvasTex(256, 160, (ctx, w, h) => {
      ctx.fillStyle = '#e9e0c8'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e2d8be'; ctx.fillRect(w / 2 - 2, 0, 4, h);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
      for (const x0 of [12, w / 2 + 12]) for (let s = 0; s < 3; s++) for (let l = 0; l < 5; l++) { const y = 20 + s * 45 + l * 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w / 2 - 24, y); ctx.stroke(); }
      ctx.fillStyle = '#555'; ctx.font = '18px Caveat, cursive'; ctx.fillText('A C E D C B A', w / 2 + 20, 150);
    });
    const pages = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.28), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.9 }));
    pages.rotation.x = -Math.PI / 2; book.add(pages);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.015, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a1410, roughness: 0.7 })); cover.position.y = -0.01; book.add(cover);
    book.position.set(94.62, 1.14, 14.2); book.rotation.set(0, Math.PI / 2, 0.35, 'YXZ');
    book.rotation.set(0, 0, 0); book.rotateY(Math.PI / 2); book.rotateX(0.35);
    scene.add(book);
    IX().add({ id: 'hymnal', box: [94.6, 1.15, 14.2, 0.4, 0.2, 0.5], glint: true, prompt: () => 'Read the <b>hymnal</b>', use: () => { G.setFlag('read_hymnal'); G.docs.add('hymnal'); } });
    // hymn board
    const hb = G.tex.canvasTex(256, 384, (ctx, w, h) => {
      ctx.fillStyle = '#3a2416'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8dcc0'; ctx.font = '600 70px Georgia'; ctx.textAlign = 'center';
      ['318', '97', '406'].forEach((n, k) => ctx.fillText(n, w / 2, 110 + k * 110));
      ctx.font = 'italic 22px Georgia'; ctx.fillText('HYMNS', w / 2, 36);
      G.tex.grunge(ctx, w, h, 0.4, 3);
    });
    B.decal(hb, { x: 97.5, y: 2.2, z: 16.68, w: 0.6, h: 0.9, ry: Math.PI });
    IX().add({ id: 'hymnboard', box: [97.5, 2.2, 16.6, 0.7, 1.0, 0.15], prompt: () => 'Look at the <b>hymn board</b>', use: () => think('Hymn 318 first. Tom always chose the hymns &mdash; "Eternal Father". For those in peril on the sea.') });

    // confessional
    const cx = 85.9, cz = 15.9;
    B.box({ x: cx, y: 1.2, z: cz, w: 2.0, h: 2.4, d: 1.4, mat: M.woodDark, col: true });
    B.box({ x: cx, y: 2.5, z: cz, w: 2.2, h: 0.2, d: 1.6, mat: M.woodDark });
    const curtainMat = new THREE.MeshStandardMaterial({ color: 0x5a1414, roughness: 0.9, side: THREE.DoubleSide });
    B.box({ x: cx - 0.5, y: 1.2, z: cz - 0.71, w: 0.8, h: 2.0, d: 0.02, mat: curtainMat });
    B.decal(G.tex.noteTex('hand', 71), { x: cx + 0.5, y: 1.1, z: cz - 0.71, w: 0.18, h: 0.22, ry: Math.PI, rz: 0.1 });
    IX().add({ id: 'brennan', box: [cx + 0.5, 1.1, cz - 0.74, 0.3, 0.3, 0.1], glint: true, prompt: () => 'Read the <b>pages pinned to the confessional</b>', use: () => G.docs.add('brennan') });
    IX().add({ id: 'confessional', box: [cx - 0.5, 1.2, cz - 0.75, 0.8, 2.0, 0.1], prompt: () => 'Examine <b>confessional</b>', use: () => think('Forgive me, Father, for I am about to leave.') });
    IX().add({ id: 'altar', box: [99.2, 1.2, 10, 1.1, 0.8, 2.6], prompt: () => 'Examine the <b>altar</b>', use: () => think('Plain stone, older than the prison around it. Someone keeps the candles lit.') });
    IX().add({ id: 'glass', box: [91.5, 4, 3.2, 1.4, 3.6, 0.2], range: 4, prompt: () => 'Look at the <b>stained glass</b>', use: () => think('An anchor in blue glass. Hope, Tom called it. "The anchor of the soul."') });
    G.audio.addEmitter({ sound: 'drip', pos: new THREE.Vector3(90, 0.05, 10), min: 3, max: 7, range: 16, opts: { vol: 0.5, wet: 0.9 } });
  }

  // ------------------------------------------------------------------ organ
  function buildOrgan() {
    const M = G.M, scene = G.engine.scene;
    // pipes on the north wall
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0xb8b0a0, metalness: 0.95, roughness: 0.28 });
    for (let k = 0; k < 17; k++) {
      const h = 2.4 + Math.sin((k / 16) * Math.PI) * 2.2;
      const x = 95.1 + k * 0.22;
      B.cyl({ x, base: 2.3, z: 3.55, r: 0.075, h, mat: pipeMat, seg: 14 });
      B.cyl({ x, base: 2.0, z: 3.55, rt: 0.075, rb: 0.02, h: 0.3, mat: pipeMat, seg: 10 });
      B.box({ x, y: 2.55, z: 3.625, w: 0.08, h: 0.03, d: 0.01, mat: M.black, cast: false });
    }
    B.box({ x: 96.85, y: 2.05, z: 3.6, w: 4.0, h: 0.3, d: 0.5, mat: M.woodDark });
    B.box({ x: 96.85, y: 1.2, z: 3.8, w: 4.0, h: 1.5, d: 0.9, mat: M.woodDark });
    // console
    const con = new THREE.Group(); con.position.set(97.2, 0.45, 4.55); scene.add(con);
    B.box({ parent: con, x: 0, y: 0.45, z: 0, w: 1.3, h: 0.9, d: 0.7, mat: M.woodDark });
    B.box({ parent: con, x: 0, y: 1.25, z: -0.2, w: 1.3, h: 0.7, d: 0.3, mat: M.woodDark });
    B.box({ parent: con, x: 0, y: 0.95, z: 0.1, w: 1.2, h: 0.04, d: 0.5, mat: M.woodDark });
    B.box({ parent: con, x: 0, y: 1.02, z: -0.02, w: 1.15, h: 0.05, d: 0.18, mat: new THREE.MeshStandardMaterial({ color: 0xece4d0, roughness: 0.35 }) });
    for (let k = 0; k < 6; k++) {
      for (const side of [-1, 1]) {
        const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 10), M.bakelite); kn.rotation.x = Math.PI / 2;
        kn.position.set(side * (0.54 - (k % 2) * 0.06), 1.0 + Math.floor(k / 2) * 0.1 + 0.08, -0.05); con.add(kn);
      }
    }
    B.colBox(97.2, 0.45, 4.55, 1.35, 1.6, 0.75);
    // playable manual: 15 white keys C3..C5, black keys
    S.keys = [];
    const wk = 0.07, x0 = -(15 * wk) / 2 + wk / 2;
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf2ead4, roughness: 0.3 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x151210, roughness: 0.3 });
    const WHITE = [0, 2, 4, 5, 7, 9, 11];
    const NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const kb = new THREE.Group(); kb.position.set(0, 0.95, 0.2); con.add(kb);
    for (let i = 0; i < 15; i++) {
      const oct = Math.floor(i / 7), pc = WHITE[i % 7];
      const midi = 48 + oct * 12 + pc;
      const key = new THREE.Group(); key.position.set(x0 + i * wk, 0.02, 0); kb.add(key);
      const km = new THREE.Mesh(new THREE.BoxGeometry(wk - 0.004, 0.025, 0.2), whiteMat); km.geometry.translate(0, 0, 0.1); km.position.z = -0.1; key.add(km);
      if (oct === 1) {
        const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.035), new THREE.MeshStandardMaterial({ map: G.tex.canvasTex(64, 56, (ctx) => { ctx.fillStyle = '#efe4b8'; ctx.fillRect(0, 0, 64, 56); ctx.fillStyle = '#2a2a3a'; ctx.font = '700 40px Caveat, cursive'; ctx.textAlign = 'center'; ctx.fillText(NAMES[i % 7], 32, 44); }), roughness: 0.8 }));
        tab.rotation.x = -Math.PI / 2; tab.position.set(0, 0.0135, 0.06); key.add(tab);
      }
      S.keys.push({ group: key, mesh: km, midi, pc, white: true });
    }
    const blackAfter = [0, 1, 3, 4, 5];
    for (let o = 0; o < 2; o++) for (const b of blackAfter) {
      const i = o * 7 + b;
      const pc = WHITE[b] + 1;
      const key = new THREE.Group(); key.position.set(x0 + i * wk + wk / 2, 0.045, -0.04); kb.add(key);
      const km = new THREE.Mesh(new THREE.BoxGeometry(wk * 0.55, 0.03, 0.12), blackMat); km.geometry.translate(0, 0, 0.06); km.position.z = -0.06; key.add(km);
      S.keys.push({ group: key, mesh: km, midi: 48 + o * 12 + pc, pc, white: false });
    }
    S.console = con;
    // bench + Tom's last note
    B.box({ x: 97.2, y: 0.95, z: 5.35, w: 1.1, h: 0.06, d: 0.35, mat: M.woodDark });
    B.box({ x: 96.75, y: 0.7, z: 5.35, w: 0.05, h: 0.5, d: 0.3, mat: M.woodDark }); B.box({ x: 97.65, y: 0.7, z: 5.35, w: 0.05, h: 0.5, d: 0.3, mat: M.woodDark });
    const note = P.model.paper(G.tex.noteTex('hand', 81));
    note.position.set(97.0, 0.985, 5.35); note.rotation.y = 0.2; scene.add(note);
    IX().add({ id: 'letter4', box: [97.0, 1.0, 5.35, 0.3, 0.1, 0.3], glint: true, prompt: () => 'Read the <b>note on the organ bench</b>',
      use: () => { const first = !G.flag('read_letter4'); G.setFlag('read_letter4'); G.docs.add('letter4'); if (first) G.ui.afterRead(() => think('Tom&hellip; you stubborn old goat.')); } });
    IX().add({ id: 'organ', box: [97.2, 1.45, 4.6, 1.3, 0.3, 0.6], enabled: () => !G.flag('altar_open'), prompt: () => 'Sit at the <b>organ</b>', use: () => focusOrgan() });
    IX().add({ id: 'organdone', box: [97.2, 1.45, 4.6, 1.3, 0.3, 0.6], enabled: () => G.flag('altar_open'), prompt: () => 'Play the <b>organ</b>', use: () => focusOrgan() });
  }

  function focusOrgan() {
    const kbPos = S.console.localToWorld(new THREE.Vector3(0, 1.0, 0.1));
    const parts = S.keys.map((k) => ({
      obj: k.group,
      down: () => { pressKey(k); },
      up: () => { k.group.rotation.x = 0; },
    }));
    G.focus.enter({ pos: kbPos.clone().add(new THREE.Vector3(0, 0.55, 0.62)), look: kbPos.clone().add(new THREE.Vector3(0, -0.02, -0.08)), parts,
      help: '<span class="key">Click</span> play a key &nbsp; <span class="key">RMB</span> step back' });
  }
  function pressKey(k) {
    k.group.rotation.x = 0.06;
    const f = 440 * Math.pow(2, (k.midi - 69) / 12);
    G.audio.play('organ', { freq: f, dur: 0.8, pos: [97.2, 3.5, 3.8], ref: 4, roll: 0.6, wet: 0.9, vol: 1 });
    G.flames && S.flames.forEach((fl) => (fl.userData.gust = 0.3));
    if (G.flag('altar_open')) return;
    S.played.push(k.pc);
    if (S.played.length > TUNE.length) S.played.shift();
    if (S.played.length === TUNE.length && S.played.every((v, i) => v === TUNE[i])) solveOrgan();
  }
  async function solveOrgan() {
    G.setFlag('organ_solved');
    await G.wait(1.0);
    G.audio.play('organ', { freq: 110, dur: 3.5, pos: [97, 4, 3.8], ref: 5, roll: 0.4, wet: 1, vol: 1.2 });
    G.audio.play('organ', { freq: 164.8, dur: 3.5, pos: [97, 4, 3.8], ref: 5, roll: 0.4, wet: 1, vol: 1 });
    G.audio.play('organ', { freq: 220, dur: 3.5, pos: [97, 4, 3.8], ref: 5, roll: 0.4, wet: 1, vol: 1 });
    G.audio.play('organ', { freq: 55, dur: 3.5, pos: [97, 4, 3.8], ref: 5, roll: 0.4, wet: 1, vol: 1.2 });
    await G.wait(1.5);
    await G.focus.exit();
    openPassage(true);
  }
  async function openPassage(anim) {
    G.setFlag('altar_open');
    S.panelCol.enabled = false;
    if (!anim) { S.panel.position.y = -1.9; return; }
    G.player.control = false;
    G.music.setMood('silence');
    G.audio.play('stone', { pos: [101.9, 1.5, 10], dur: 4.5, v: 1.2 });
    G.audio.play('clunk', { pos: [101.9, 0.5, 10], v: 1, freq: 45, ring: 0.3, pitch: 0.4 });
    const cam = G.player;
    await G.tween(4.5, (k) => {
      S.panel.position.y = 0.45 - k * 2.35;
      cam.eyeOffset.set((Math.random() - 0.5) * 0.02 * (1 - k), (Math.random() - 0.5) * 0.02 * (1 - k), 0);
      if (Math.random() < 0.3) G.engine.burst({ pos: new THREE.Vector3(101.6, 2.7 + Math.random() * 0.5, 9.3 + Math.random() * 1.4), count: 2, color: 0x6a6258, speed: 0.4, life: 1.5, gravity: 2, size: 0.05 });
    }, { ease: U.easeInOut });
    cam.eyeOffset.set(0, 0, 0);
    S.flames.forEach((fl) => (fl.userData.gust = 1));
    G.player.control = true;
    G.music.sting('discover');
    G.checkpoint('altar_open');
    await G.ui.think('A way down. Cold air, and the smell of the sea.');
  }

  // ------------------------------------------------------------------ smugglers' tunnel
  function carving(num, sym, x, y, z, ry) {
    const tex = G.tex.canvasTex(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(120,110,95,.75)'; ctx.fillRect(14, 14, w - 28, h - 28);
      ctx.strokeStyle = 'rgba(15,12,9,.95)'; ctx.lineWidth = 8; ctx.strokeRect(20, 20, w - 40, h - 40);
      ctx.save(); ctx.translate(4, 4); G.tex.drawSymbol(ctx, sym, w / 2, h / 2 + 20, 66, 'rgba(8,6,4,.95)'); ctx.restore();
      G.tex.drawSymbol(ctx, sym, w / 2, h / 2 + 20, 66, 'rgba(235,225,200,.85)');
      ctx.font = '700 52px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(8,6,4,.95)'; ctx.fillText(num, w / 2 + 3, 74);
      ctx.fillStyle = 'rgba(235,225,200,.85)'; ctx.fillText(num, w / 2, 71);
      G.tex.grunge(ctx, w, h, 0.6, num.length * 9);
    });
    const d = B.decal(tex, { x, y, z, w: 0.8, h: 0.8, ry, rough: 0.95 });
    IX().add({ id: 'carve' + num, box: [x, y, z, ry === 0 || Math.abs(ry) === Math.PI ? 0.6 : 0.12, 0.6, ry === 0 || Math.abs(ry) === Math.PI ? 0.12 : 0.6], range: 3, prompt: () => 'Examine the <b>carving</b>',
      use: () => { G.setFlag('saw_' + sym); think(`A mark cut into the rock: the numeral ${num}, and ${sym === 'moon' ? 'a crescent moon' : sym === 'anchor' ? 'an anchor' : 'a star'}.`); } });
    return d;
  }
  function buildTunnel() {
    const M = G.M, scene = G.engine.scene;
    B.setArea('tunnel');
    const wallM = M.stoneWet, floorM = M.stoneFloor;
    // stairwell: landing x 102.2..103, stairs 103..110 down to -4.5
    const y0 = 0.45, y1 = -4.5, xs = 103, xe = 110;
    B.floor(101.7, 9.3, 103, 10.7, y0, floorM, 'stone');
    const stairY = (x) => y0 + (y1 - y0) * U.clamp((x - xs) / (xe - xs), 0, 1);
    B.region(103, 9.3, 110, 10.7, (x) => stairY(x), 'stone');
    const nSteps = 20;
    for (let i = 0; i < nSteps; i++) {
      const xa = xs + (i / nSteps) * (xe - xs), xb = xs + ((i + 1) / nSteps) * (xe - xs);
      const topStep = (stairY(xa) + stairY(xb)) / 2;
      B.box({ x: (xa + xb) / 2, y: (topStep + y1 - 0.4) / 2, z: 10, w: xb - xa, h: topStep - (y1 - 0.4), d: 1.4, mat: floorM, cast: false });
    }
    B.box({ x: 106.1, y: -0.85, z: 9.15, w: 8.3, h: 7.9, d: 0.3, mat: wallM, col: true });
    B.box({ x: 106.1, y: -0.85, z: 10.85, w: 8.3, h: 7.9, d: 0.3, mat: wallM, col: true });
    const ang = Math.atan2(y0 - y1, xe - xs);
    B.box({ x: 106.5, y: (y0 + y1) / 2 + 2.55, z: 10, w: 8.8, h: 0.3, d: 1.8, rz: -ang, mat: wallM });
    B.box({ x: 102.6, y: 2.95, z: 10, w: 1.4, h: 0.3, d: 1.8, mat: wallM });
    for (let x = 103.5; x < 110; x += 1.6) B.box({ x, y: stairY(x) + 2.3, z: 10, w: 0.18, h: 0.18, d: 1.4, mat: M.woodOld });
    // landing chamber L1
    B.floor(110, 8.4, 113, 11.6, y1, floorM, 'stone');
    B.ceiling(110, 8.4, 113, 11.6, y1 + 2.8, wallM);
    B.box({ x: 111.5, y: y1 + 1.4, z: 8.25, w: 3.2, h: 3.0, d: 0.3, mat: wallM, col: true });
    B.box({ x: 111.5, y: y1 + 1.4, z: 11.75, w: 3.2, h: 3.0, d: 0.3, mat: wallM, col: true });
    B.box({ x: 110.1, y: y1 + 1.4, z: 8.7, w: 0.3, h: 2.8, d: 0.6, mat: wallM, col: true });
    B.box({ x: 110.1, y: y1 + 1.4, z: 11.3, w: 0.3, h: 2.8, d: 0.6, mat: wallM, col: true });
    carving('I', 'moon', 111.6, y1 + 1.5, 8.41, 0);
    B.box({ x: 113.0, y: y1 + 1.4, z: 8.6, w: 0.3, h: 2.8, d: 0.5, mat: wallM, col: true });
    B.box({ x: 113.0, y: y1 + 1.4, z: 11.4, w: 0.3, h: 2.8, d: 0.5, mat: wallM, col: true });
    B.box({ x: 113.0, y: -1.3, z: 10, w: 0.3, h: 0.8, d: 3.4, mat: wallM });
    S.lantern1 = hangLantern(112.6, y1 + 2.5, 11.4);
    // T2 corridor x 113..123.2 (z 8.9..11.1), vaulted brick
    B.region(113, 8.9, 123.2, 11.1, y1, 'stone');
    B.box({ x: 118.1, y: y1 - 0.15, z: 10, w: 10.2, h: 0.3, d: 2.2, mat: floorM, cast: false });
    B.box({ x: 118.1, y: -3.4, z: 8.75, w: 10.2, h: 3.0, d: 0.3, mat: M.brickWet, col: true });
    B.wall('x', 11.25, 113, 121, -4.9, -1.9, M.brickWet, [{ a0: 116, a1: 119.5, y0: -5, y1: -2.3 }], { thick: 0.3 });
    const vault = new THREE.CylinderGeometry(1.1, 1.1, 10.2, 16, 1, true, 0, Math.PI);
    const vaultMat = M.brickWet.clone(); vaultMat.side = THREE.BackSide;
    B.add(vault, vaultMat, { pos: [118.1, -2.4, 10], rot: [0, 0, Math.PI / 2], uv: 'native', uvScale: [3, 8] });
    // rum alcove (south)
    B.floor(116, 11.1, 119.5, 14.2, y1, floorM, 'stone');
    B.ceiling(116, 11.1, 119.5, 14.2, -2.25, M.brickWet);
    B.box({ x: 117.75, y: -3.4, z: 14.35, w: 3.8, h: 2.6, d: 0.3, mat: M.brickWet, col: true });
    B.box({ x: 115.85, y: -3.4, z: 12.7, w: 0.3, h: 2.6, d: 3.4, mat: M.brickWet, col: true });
    B.box({ x: 119.65, y: -3.4, z: 12.7, w: 0.3, h: 2.6, d: 3.4, mat: M.brickWet, col: true });
    P.barrel(116.5, 13.6, { y: y1, mat: M.woodOld, r: 0.35, h: 0.95 });
    P.barrel(117.3, 13.7, { y: y1, mat: M.woodOld, r: 0.35, h: 0.95 });
    P.barrel(116.9, 13.65, { y: y1 + 0.95, mat: M.woodOld, r: 0.33, h: 0.9, col: false });
    P.barrel(118.9, 13.3, { y: y1, mat: M.woodOld, r: 0.35, h: 0.95 });
    P.barrel(118.95, 12.5, { y: y1, mat: M.woodOld, r: 0.35, h: 0.95 });
    P.crate(117.2, 12.0, 0.6, 0.3, y1);
    B.decal(G.tex.sign('RUM\nJAMAICA', { w: 256, h: 160, bg: null, fg: '#1a1410', size: 48, font: 'Georgia, serif' }), { x: 116.5, y: -4.1, z: 13.24, w: 0.35, h: 0.22, rough: 0.9 });
    carving('II', 'anchor', 119.49, -3.55, 13.55, -Math.PI / 2);
    // T3 corridor south x 121..123.2, z 11.1..20
    B.region(121, 11.1, 123.2, 20.4, -4.8, 'stone');
    B.box({ x: 122.1, y: -4.95, z: 15.7, w: 2.2, h: 0.3, d: 9.4, mat: floorM, cast: false });
    B.box({ x: 120.85, y: -3.4, z: 15.9, w: 0.3, h: 3.0, d: 9.5, mat: wallM, col: true });
    B.box({ x: 123.35, y: -3.4, z: 14.5, w: 0.3, h: 3.0, d: 12.2, mat: wallM, col: true });
    B.ceiling(120.7, 8.5, 123.5, 20.4, -2.2, wallM);
    for (let z = 12; z < 20; z += 1.8) { B.box({ x: 122.1, y: -2.3, z, w: 2.4, h: 0.2, d: 0.2, mat: M.woodOld }); B.box({ x: 121.1, y: -3.55, z, w: 0.18, h: 2.5, d: 0.18, mat: M.woodOld }); B.box({ x: 123.1, y: -3.55, z, w: 0.18, h: 2.5, d: 0.18, mat: M.woodOld }); }
    // skeleton + journal + carving III
    buildSkeleton(122.8, -4.8, 16.6);
    carving('III', 'star', 123.19, -3.25, 16.5, -Math.PI / 2);
    const j = P.model.paper(G.tex.noteTex('hand', 91));
    j.position.set(122.3, -4.79, 16.2); j.rotation.y = 1.2; j.scale.setScalar(0.8); scene.add(j);
    IX().add({ id: 'diary1868', box: [122.3, -4.75, 16.2, 0.3, 0.12, 0.3], glint: true, prompt: () => 'Read the <b>water-stained journal</b>', use: () => { G.setFlag('read_diary'); G.docs.add('diary1868'); } });
    IX().add({ id: 'skeleton', box: [122.85, -4.3, 16.6, 0.6, 1.0, 0.8], prompt: () => 'Examine the <b>remains</b>', use: () => think('Some poor devil from another century. He never found his way out. I will.') });
    // symbol door (wall at z 20.25)
    B.box({ x: 121.05, y: -3.4, z: 20.25, w: 0.5, h: 3.0, d: 0.3, mat: wallM, col: true });
    B.box({ x: 123.05, y: -3.4, z: 20.25, w: 0.5, h: 3.0, d: 0.3, mat: wallM, col: true });
    B.box({ x: 122.1, y: -2.35, z: 20.25, w: 1.6, h: 0.9, d: 0.3, mat: wallM });
    const door = new THREE.Group(); door.position.set(122.1, -4.8, 20.25); scene.add(door);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.25), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.8, map: G.tex.sets.woodOld.map, normalMap: G.tex.sets.woodOld.normalMap }));
    slab.position.y = 1.05; slab.castShadow = true; door.add(slab);
    for (const y of [0.3, 1.05, 1.8]) { const band = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.27), M.rust); band.position.y = y; door.add(band); }
    S.seaDoor = door;
    S.seaDoorCol = B.collider(121.3, -4.8, 20.1, 122.9, -2.7, 20.4, 'seadoor');
    // three wheels on the door
    S.wheels = []; S.wheelIdx = [4, 4, 4];
    const wheelTex = G.tex.canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#4a4238'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a1612'; ctx.lineWidth = 10; ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2); ctx.fillStyle = '#2a241e'; ctx.fill();
      G.tex.SYMBOLS.forEach((sym, i) => {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        const cx = w / 2 + Math.cos(a) * 170, cy = h / 2 + Math.sin(a) * 170;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI / 2);
        G.tex.drawSymbol(ctx, sym, 0, 0, 52, '#d8ccb0');
        ctx.restore();
        ctx.strokeStyle = '#1a1612'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a + Math.PI / 6) * 80, h / 2 + Math.sin(a + Math.PI / 6) * 80); ctx.lineTo(w / 2 + Math.cos(a + Math.PI / 6) * 250, h / 2 + Math.sin(a + Math.PI / 6) * 250); ctx.stroke();
      });
      G.tex.grunge(ctx, w, h, 0.5, 5);
    });
    for (let i = 0; i < 3; i++) {
      const wg = new THREE.Group(); wg.position.set(0.44 - i * 0.44, 1.35, -0.14); door.add(wg);
      const spin = new THREE.Group(); wg.add(spin);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 32), new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.8 }));
      rim.rotation.x = Math.PI / 2; spin.add(rim);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.185, 32), new THREE.MeshStandardMaterial({ map: wheelTex, roughness: 0.75 }));
      disc.rotation.y = Math.PI; disc.position.z = -0.027; spin.add(disc);
      const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 3), M.brass); ptr.position.set(0, 0.225, -0.04); ptr.rotation.z = Math.PI; wg.add(ptr);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.06), new THREE.MeshStandardMaterial({ map: G.tex.sign(['I', 'II', 'III'][i], { w: 128, h: 80, bg: null, fg: '#d8ccb0', font: 'Georgia, serif', size: 60, grunge: 0.3 }), transparent: true }));
      num.position.set(0, -0.26, -0.01); num.rotation.y = Math.PI; wg.add(num);
      S.wheels.push({ group: wg, spin, disc });
    }
    S.setWheel = (i, anim) => {
      const target = -(S.wheelIdx[i] / 6) * Math.PI * 2;
      const w = S.wheels[i].spin;
      if (!anim) { w.rotation.z = target; return; }
      const s = w.rotation.z; let d = target - s; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      G.tween(0.3, (k) => { w.rotation.z = s + d * k; }, { ease: U.easeOut });
    };
    for (let i = 0; i < 3; i++) S.setWheel(i, false);
    IX().add({ id: 'seadoor', box: [122.1, -3.6, 20.05, 1.5, 2.2, 0.3], enabled: () => !G.flag('seadoor_open'), prompt: () => 'Examine the <b>iron-bound door</b>', use: () => focusSeaDoor() });
    S.doorGlow = G.lights.add({ pos: [122.1, -3.6, 19.3], color: 0x6f8fb0, intensity: 0.6, distance: 5, area: 'tunnel' });
    // T4 beyond the door: ramp down to the cave
    const t4y = (z) => -4.8 + (-8.0 + 4.8) * U.clamp((z - 20.4) / 9.6, 0, 1);
    B.region(121, 20.25, 123.2, 30.4, (x, z) => t4y(z), 'stone');
    for (let i = 0; i < 16; i++) {
      const za = 20.4 + i * 0.6;
      B.box({ x: 122.1, y: t4y(za + 0.3) - 0.2, z: za + 0.3, w: 2.2, h: 0.4, d: 0.62, mat: M.rock, cast: false });
    }
    B.box({ x: 120.85, y: -5.5, z: 25.3, w: 0.3, h: 5.4, d: 10.2, mat: M.rock, col: true });
    B.box({ x: 123.35, y: -5.5, z: 25.3, w: 0.3, h: 5.4, d: 10.2, mat: M.rock, col: true });
    for (let i = 0; i < 5; i++) B.box({ x: 122.1, y: t4y(21 + i * 2) + 2.6, z: 21 + i * 2, w: 2.8, h: 0.4, d: 2.1, rx: 0.3, mat: M.rock });
    // rats
    S.rats = [[117, -4.75, 9.1], [121.3, -4.75, 13.5], [114, -4.6, 10.9]].map(([x, y, z]) => makeRat(x, y, z));
    // drips + ambience emitters
    [[111, y1, 10], [118, -4.8, 10], [122, -4.8, 18], [122, -6.5, 26]].forEach(([x, y, z]) => G.audio.addEmitter({ sound: 'drip', pos: new THREE.Vector3(x, y + 0.05, z), min: 1.2, max: 3.5, range: 14, opts: { vol: 0.8, wet: 0.8 } }));
    G.audio.addEmitter({ sound: 'thunder', pos: new THREE.Vector3(122, -6, 32), min: 10, max: 20, range: 40, opts: { dist: 0.8, vol: 0.35, wet: 0.9 }, enabled: () => G.world.current && G.world.current.name === 'tunnel' });
  }
  function hangLantern(x, y, z) {
    const M = G.M;
    B.cyl({ x, y: y + 0.25, z, r: 0.005, h: 0.4, mat: M.metalDark });
    B.cyl({ x, y: y - 0.05, z, r: 0.08, h: 0.03, mat: M.metalDark });
    B.cyl({ x, y: y - 0.22, z, r: 0.09, h: 0.03, mat: M.metalDark });
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 12), P.bulbMat(0xffa850, 2.5)); glass.position.set(x, y - 0.14, z); G.engine.scene.add(glass);
    return G.lights.add({ pos: [x, y - 0.3, z], color: 0xff9a48, intensity: 3.5, distance: 9, flicker: 'fire', area: 'tunnel', mesh: glass, emissive: 2.5 });
  }
  function buildSkeleton(x, y, z) {
    const M = G.M, bone = M.bone;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = -Math.PI / 2; G.engine.scene.add(g);
    const add = (geo, px, py, pz, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, bone); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
    add(new THREE.SphereGeometry(0.1, 12, 10), 0, 0.82, 0.05, 0.4).scale.set(0.9, 1, 1.1);
    add(new THREE.BoxGeometry(0.08, 0.05, 0.08), 0, 0.72, 0.1);
    for (let k = 0; k < 6; k++) add(new THREE.TorusGeometry(0.1 - k * 0.006, 0.01, 5, 12, Math.PI * 1.4), 0, 0.62 - k * 0.055, 0.02, Math.PI / 2 + 0.2, 0, -Math.PI * 0.2);
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 6), 0, 0.5, -0.05, 0.25);
    add(new THREE.BoxGeometry(0.22, 0.08, 0.12), 0, 0.22, -0.02);
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6), s * 0.09, 0.2, 0.2, Math.PI / 2 - 0.1);
      add(new THREE.CylinderGeometry(0.017, 0.017, 0.4, 6), s * 0.11, 0.03, 0.44, 0.2);
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), s * 0.16, 0.5, 0.05, 0.1, 0, s * 0.2);
      add(new THREE.CylinderGeometry(0.013, 0.013, 0.28, 6), s * 0.2, 0.3, 0.15, 1.2);
    }
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 10), M.rust); lamp.position.set(0.3, 0.1, 0.2); g.add(lamp);
    B.bakeGroup(g);
    B.colBox(x, y, z, 0.6, 0.9, 0.7);
  }
  function makeRat(x, y, z) {
    const g = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: 0x3a342e, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), fur); body.scale.set(1, 0.8, 2); g.add(body);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 8), fur); head.rotation.x = -Math.PI / 2; head.position.z = -0.12; g.add(head);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0x9a7a70, roughness: 0.7 })); tail.rotation.x = Math.PI / 2 - 0.2; tail.position.set(0, -0.01, 0.17); g.add(tail);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.006, 4, 4), P.bulbMat(0xff2010, 1.5)); eye.position.set(0.02, 0.02, -0.13); g.add(eye);
    const eye2 = eye.clone(); eye2.position.x = -0.02; g.add(eye2);
    g.position.set(x, y + 0.04, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    G.engine.scene.add(g);
    B.bakeGroup(g);
    return { g, fled: false };
  }

  function focusSeaDoor() {
    const door = S.seaDoor;
    const center = door.localToWorld(new THREE.Vector3(0, 1.35, -0.14));
    const parts = S.wheels.map((w, i) => ({
      obj: w.group,
      click: () => {
        S.wheelIdx[i] = (S.wheelIdx[i] + 1) % 6;
        S.setWheel(i, true);
        G.audio.play('stone', { pos: center, dur: 0.35, v: 0.5 });
        G.audio.play('tick', { pos: center, freq: 1800 });
        checkSeaDoor();
      },
      wheel: (d) => { S.wheelIdx[i] = (S.wheelIdx[i] + (d > 0 ? 1 : 5)) % 6; S.setWheel(i, true); G.audio.play('tick', { pos: center, freq: 1800 }); checkSeaDoor(); },
    }));
    G.focus.enter({ pos: center.clone().add(new THREE.Vector3(0, 0.05, -1.05)), look: center, parts,
      help: '<span class="key">Click</span> turn a wheel &nbsp; <span class="key">RMB</span> step back' });
  }
  function checkSeaDoor() {
    const syms = S.wheelIdx.map((k) => G.tex.SYMBOLS[k]);
    if (syms.join() !== CODE.join() || G.flag('seadoor_open')) return;
    G.setFlag('seadoor_open');
    setTimeout(async () => {
      G.audio.play('clunk', { pos: [122.1, -3.5, 20.2], v: 1, freq: 60, ring: 0.6, pitch: 0.6 });
      G.audio.play('solve', { bus: 'ui', vol: 0.5, wet: 0.4 });
      await G.wait(0.8);
      await G.focus.exit();
      openSeaDoor(true);
    }, 400);
  }
  async function openSeaDoor(anim) {
    S.seaDoorCol.enabled = false;
    if (!anim) { S.seaDoor.position.x = 122.1 - 1.45; return; }
    G.audio.play('stone', { pos: [122.1, -3.5, 20.2], dur: 3, v: 1 });
    G.audio.play('creak', { pos: [122.1, -3.5, 20.2], dur: 2.8, freq: 70, v: 0.7 });
    await G.tween(3, (k) => { S.seaDoor.position.x = 122.1 - k * 1.45; }, { ease: U.easeInOut });
    G.checkpoint('seadoor_open');
    G.ui.think('Sea air. And&hellip; the sound of waves.');
  }

  L.apply = function () {
    const f = G.flag;
    if (f('chapel_open')) openDoors(false); else { S.doorN.rotation.y = 0; S.doorS.rotation.y = 0; S.doorCol.enabled = true; S.chain.visible = true; S.chain.position.set(84.1, 1.3, 10); S.chain.rotation.set(0, 0, 0); }
    if (f('altar_open')) openPassage(false); else { S.panel.position.y = 0.45; S.panelCol.enabled = true; }
    if (f('seadoor_open')) { S.wheelIdx = [0, 1, 2]; for (let i = 0; i < 3; i++) S.setWheel(i, false); openSeaDoor(false); }
    else { S.wheelIdx = [4, 4, 4]; for (let i = 0; i < 3; i++) S.setWheel(i, false); S.seaDoor.position.x = 122.1; S.seaDoorCol.enabled = true; }
    S.rats.forEach((r) => { r.fled = false; r.g.visible = true; if (!r.home) r.home = r.g.position.clone(); r.g.position.copy(r.home); });
    tunnelTold = false;
    S.played = [];
  };

  L.update = function (dt, t) {
    const area = G.world.current ? G.world.current.name : '';
    // candle flames
    if (area === 'chapel' || area === 'yard' || area === 'tunnel') {
      for (const fl of S.flames) {
        const u = fl.userData;
        u.gust = Math.max(0, (u.gust || 0) - dt * 0.8);
        const fk = 0.85 + Math.sin(t * 11 + u.phase) * 0.08 + Math.sin(t * 23 + u.phase * 2) * 0.05 + (Math.random() - 0.5) * 0.06 + u.gust * (Math.random() - 0.3);
        fl.scale.set(0.05 * fk, 0.1 * fk * (1 + u.gust * 0.5), 1);
        fl.position.y = u.base + (fk - 1) * 0.01;
      }
      const lf = G.engine.weather.flash;
      S.glass.forEach((m) => { if (m.isMeshBasicMaterial) m.opacity = 0.08 + lf * 0.6; else m.emissiveIntensity = 0.3 + lf * 3; });
      S.roseLight.intensity = 0.4 + lf * 12;
    }
    if (area === 'chapel' && !G.flag('chapel_inside')) { G.setFlag('chapel_inside'); G.checkpoint('chapel_inside'); G.ui.think('Candles. Father Brennan\'s vigil.'); }
    // tunnel: guarantee a light source
    if (area === 'tunnel' && !tunnelTold) {
      tunnelTold = true;
      if (!G.inv.has('flashlight')) {
        G.inv.remove('flashlight_dead'); G.inv.remove('batteries');
        G.inv.add('flashlight'); G.lights.flashOn = true; G.setFlag('has_flashlight');
        setTimeout(() => think('Someone left an electric torch on the top step. Bless you, Father Brennan.'), 400);
      }
    }
    // rats flee
    if (area === 'tunnel') {
      const pp = G.player.pos;
      for (const r of S.rats) {
        if (r.fled) continue;
        if (r.g.position.distanceTo(pp) < 3.2) {
          r.fled = true;
          G.audio.play('squeak', { pos: r.g.position });
          const dir = r.g.position.clone().sub(pp).setY(0).normalize();
          r.g.rotation.y = Math.atan2(-dir.x, -dir.z);
          const start = r.g.position.clone();
          G.tween(0.9, (k) => { r.g.position.copy(start).addScaledVector(dir, k * 2.5); r.g.position.y = start.y + Math.abs(Math.sin(k * 30)) * 0.01; }).then(() => { r.g.visible = false; });
        }
      }
    }
  };
})();
