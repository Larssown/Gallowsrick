// level_hall.js — Central hall, maintenance corridor, stores, Generator B room (fuel, start sequence, breaker load puzzle), yard shutter
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U, B = G.B, P = G.P;
  const L = { name: 'hall' };
  G.levels.push(L);
  const S = (L.s = {});
  const think = (t, o) => G.ui.think(t, o);
  const IX = () => G.interact;

  const BREAKERS = [
    { id: 1, name: 'C BLOCK\nLIGHTING', kw: 15, on: true },
    { id: 2, name: 'C BLOCK\nCELL LOCKS', kw: 10, on: true, locked: 'Locked out with a red tag: "CELL LOCKS &mdash; CONTROL ROOM AUTH ONLY". Just as well &mdash; a riot is the last thing I need.' },
    { id: 3, name: 'CENTRAL HALL\nLIGHTING', kw: 10, on: true },
    { id: 4, name: 'YARD\nFLOODLIGHTS', kw: 25, on: true },
    { id: 5, name: 'YARD\nSHUTTER MOTOR', kw: 15, on: false },
    { id: 6, name: 'KITCHEN\nCOLD STORE', kw: 20, on: true },
    { id: 7, name: 'INFIRMARY', kw: 15, on: true, locked: 'A padlocked tag: "INFIRMARY &mdash; LIFE SUPPORT &mdash; DO NOT SWITCH OFF". Tom\'s in there. I wouldn\'t dream of it.' },
    { id: 8, name: 'LAUNDRY', kw: 10, on: true },
  ];
  L.BREAKERS = BREAKERS;
  const MAXKW = 60;
  const brk = (id) => { const v = G.state.flags['brk_' + id]; return v === undefined ? BREAKERS[id - 1].on : v; };
  const load = () => BREAKERS.reduce((s, b) => s + (brk(b.id) ? b.kw : 0), 0);
  L.load = load; L.brk = brk;
  L.powerOn = () => G.flag('gen_running') && G.flag('main_on');

  // ------------------------------------------------------------------ BUILD
  L.build = function () {
    const M = G.M;
    B.area({ name: 'storage', show: ['storage', 'maint'], boxes: [[28, -1, -20.2, 34.8, 3.4, -11.9]], lights: ['storage', 'maint'], reverb: 'small', music: 'dark',
      amb: { rain: 0.18, rainMuffle: 600, room: 0.4 }, look: { fog: 0.06, hemi: 0.07, moon: 0.05, exposure: 1.25, env: 0.2 } });
    B.area({ name: 'genroom', show: ['genroom', 'maint'], boxes: [[36.4, -1, -22.2, 46.2, 5.5, -10.9]], lights: ['genroom', 'maint'], reverb: 'hall', music: 'explore',
      amb: { rain: 0.22, rainMuffle: 800, room: 0.4 }, look: { fog: 0.05, hemi: 0.08, moon: 0.05, exposure: 1.25, env: 0.3 } });
    B.area({ name: 'maint', show: ['maint', 'hall', 'storage', 'genroom'], boxes: [[34.7, -1, -22.2, 36.5, 3.4, -8.1]], lights: ['maint', 'storage', 'genroom', 'hall'], reverb: 'block', music: 'dark',
      amb: { rain: 0.15, rainMuffle: 500, room: 0.5 }, look: { fog: 0.06, hemi: 0.06, moon: 0.03, exposure: 1.25, env: 0.2 } });
    B.area({ name: 'hall', show: ['hall', 'block', 'guard', 'maint', 'yard'], boxes: [[24.1, -1, -8.1, 40.1, 9, 8.1]], lights: ['hall', 'block', 'maint'], reverb: 'hall', music: 'dark',
      amb: { rain: 0.55, rainMuffle: 2200, room: 0.25, wind: 0.12 }, look: { fog: 0.035, hemi: 0.12, moon: 0.55, exposure: 1.15, env: 0.3 } });
    buildHall();
    buildMaintenance();
    buildStores();
    buildGenerator();
  };

  function buildHall() {
    const M = G.M, scene = G.engine.scene;
    B.setArea('hall');
    B.floor(24.0, -8.0, 40.0, 8.0, 0, M.checker, 'concrete');
    B.region(24.0, -8.35, 40.0, 8.35, 0, 'concrete');
    // ceiling with skylight hole
    B.ceiling(24, -8.3, 40.3, -4, 8, M.ceiling); B.ceiling(24, 4, 40.3, 8.3, 8, M.ceiling);
    B.ceiling(24, -4, 28, 4, 8, M.ceiling); B.ceiling(36, -4, 40.3, 4, 8, M.ceiling);
    // skylight frame + glass
    for (let x = 28; x <= 36.01; x += 1) B.box({ x, y: 8.3, z: 0, w: 0.08, h: 0.12, d: 8, mat: M.metalDark });
    for (let z = -4; z <= 4.01; z += 2) B.box({ x: 32, y: 8.3, z, w: 8, h: 0.12, d: 0.08, mat: M.metalDark });
    B.box({ x: 32, y: 8.36, z: 0, w: 8, h: 0.02, d: 8, mat: M.glassDirty });
    [[32, -4.05, 8.2, 0.1], [32, 4.05, 8.2, 0.1]].forEach(([x, z, w, d]) => B.box({ x, y: 8.2, z, w, h: 0.4, d, mat: M.metalDark }));
    [[27.95, 0], [36.05, 0]].forEach(([x, z]) => B.box({ x, y: 8.2, z, w: 0.1, h: 0.4, d: 8.2, mat: M.metalDark }));

    const two = { lower: { mat: M.wallGreen, h: 1.4 }, trim: M.metalDark, thick: 0.3 };
    B.wall('z', 24.15, -8.3, 8.3, 0, 8, M.wallCream, [{ a0: -2.5, a1: 2.0, y0: 0, y1: 3.2 }], two);
    B.wall('x', -8.15, 24, 40.3, 0, 8, M.wallCream, [{ a0: 35.05, a1: 36.15, y0: 0, y1: 2.2 }], two);
    B.wall('z', 40.15, -8.3, 8.3, 0, 8, M.wallCream, [{ a0: -1.75, a1: 1.75, y0: 0, y1: 3.6 }], two);
    const southWins = [27.5, 32, 36.5].map((a) => ({ a0: a - 0.8, a1: a + 0.8, y0: 5, y1: 7 }));
    B.wall('x', 8.15, 24, 40.3, 0, 8, M.wallCream, [{ a0: 27, a1: 30, y0: 0, y1: 3 }, { a0: 35.05, a1: 36.15, y0: 0, y1: 2.2 }].concat(southWins), two);
    southWins.forEach((h) => P.window('x', 8.15, (h.a0 + h.a1) / 2, 6, 1.6, 2, { thick: 0.3, glassOff: 0.08 }));

    // D-block gate (locked) + dark corridor behind
    P.bars('x', 8.15, 27, 30, 0, 3);
    B.box({ x: 28.5, y: 3.05, z: 8.15, w: 3.1, h: 0.12, d: 0.34, mat: M.metalDark });
    B.floor(27, 8.3, 30, 14, 0, M.concrete, false);
    B.wall('z', 26.9, 8.3, 14, 0, 3.2, M.wallGray, [], { thick: 0.2 });
    B.wall('z', 30.1, 8.3, 14, 0, 3.2, M.wallGray, [], { thick: 0.2 });
    B.wall('x', 14, 26.8, 30.2, 0, 3.2, M.wallGray, [], { thick: 0.2 });
    B.ceiling(26.8, 8.3, 30.2, 14, 3.2, M.ceiling);
    P.emergency(28.5, 2.6, 13.88, Math.PI, { on: true, intensity: 1.5, distance: 6, area: 'hall', flicker: 'fluoro' });
    B.decal(G.tex.sign('D BLOCK', { w: 512, h: 128, bg: '#1d3b2a', fg: '#e8e0c8', border: '#e8e0c8' }), { x: 28.5, y: 3.6, z: 7.99, w: 1.6, h: 0.4, ry: Math.PI });
    IX().add({ id: 'dgate', box: [28.5, 1.4, 8.15, 3, 2.6, 0.3], prompt: () => 'Examine <b>D-Block gate</b>', use: () => think('D Block. Full of men who\'d sell me for a pack of smokes.') });
    G.audio.addEmitter({ sound: 'voice', pos: new THREE.Vector3(28.5, 1.5, 12), min: 7, max: 15, range: 20, opts: { dur: 1.6, pitch: 100, vol: 0.25, wet: 0.6 } });

    // doors
    S.maintDoor = P.door({ x: 35.6, z: -8.15, axis: 'x', w: 1.1, h: 2.2, hinge: 1, open: 1, mat: M.metalGreen, sign: 'MAINTENANCE\nSTAFF ONLY', signSize: 56 });
    IX().add({ id: 'maintdoor', box: [35.6, 1.1, -8.15, 1.1, 2.2, 0.3], enabled: () => !G.flag('maint_open'), prompt: () => 'Open <b>maintenance door</b>',
      use: () => { G.setFlag('maint_open'); G.audio.play('creak', { pos: [35.6, 1.2, -8.1], dur: 1.2, freq: 120 }); S.maintDoor.open(1.3); } });
    S.adminDoor = P.door({ x: 35.6, z: 8.15, axis: 'x', w: 1.1, h: 2.2, hinge: -1, mat: M.woodDark, window: true, sign: 'ADMINISTRATION\nINFIRMARY', signSize: 50 });
    IX().add({ id: 'admindoor', box: [35.6, 1.1, 8.15, 1.1, 2.2, 0.3], prompt: () => 'Try the <b>administration door</b>',
      use: () => { G.audio.play('metalHit', { pos: [35.6, 1, 8.1], v: 0.3, decay: 0.4, pitch: 1.5 }); think('Locked. The warden\'s side of the house. Tom\'s in the infirmary past there&hellip; I can\'t help him. Not tonight.'); } });

    // control booth
    const bx0 = 30.5, bx1 = 33.5, bz0 = -1.5, bz1 = 1.5;
    B.box({ x: 32, y: 0.18, z: 0, w: 3.1, h: 0.36, d: 3.1, mat: M.concrete });
    B.box({ x: bx0, y: 0.85, z: 0, w: 0.1, h: 1.0, d: 3.0, mat: M.metalGray }); B.box({ x: bx1, y: 0.85, z: 0, w: 0.1, h: 1.0, d: 3.0, mat: M.metalGray });
    B.box({ x: 32, y: 0.85, z: bz0, w: 3.0, h: 1.0, d: 0.1, mat: M.metalGray }); B.box({ x: 32, y: 0.85, z: bz1, w: 3.0, h: 1.0, d: 0.1, mat: M.metalGray });
    B.box({ x: bx0, y: 1.9, z: 0, w: 0.03, h: 1.1, d: 3.0, mat: M.glassDirty }); B.box({ x: bx1, y: 1.9, z: 0, w: 0.03, h: 1.1, d: 3.0, mat: M.glassDirty });
    B.box({ x: 32, y: 1.9, z: bz0, w: 3.0, h: 1.1, d: 0.03, mat: M.glassDirty }); B.box({ x: 32, y: 1.9, z: bz1, w: 3.0, h: 1.1, d: 0.03, mat: M.glassDirty });
    for (const [x, z] of [[bx0, bz0], [bx1, bz0], [bx0, bz1], [bx1, bz1]]) B.box({ x, y: 1.4, z, w: 0.12, h: 2.2, d: 0.12, mat: M.metalDark });
    B.box({ x: 32, y: 2.55, z: 0, w: 3.3, h: 0.15, d: 3.3, mat: M.metalDark });
    B.box({ x: 32, y: 0.75, z: -1.1, w: 2.6, h: 0.8, d: 0.5, mat: M.metalGray });
    for (let k = 0; k < 10; k++) B.box({ x: 30.9 + k * 0.24, y: 1.16, z: -1.05, w: 0.08, h: 0.03, d: 0.08, mat: k % 3 ? M.redPaint : M.yellowPaint });
    B.collider(bx0 - 0.1, 0, bz0 - 0.1, bx1 + 0.1, 2.6, bz1 + 0.1);
    IX().add({ id: 'booth', box: [32, 1.5, 0, 3.2, 2.2, 3.2], range: 2.0, prompt: () => 'Examine <b>control booth</b>', use: () => think('The control booth. Locked, dark, and empty. Every button in there is dead with the mains down.') });
    P.clock(32, 2.95, -1.64, Math.PI, { h: 11, m: 51 });

    // hall lights (Gen B circuit 3) + emergency
    S.hallLights = [[28, -5], [36, -5], [28, 5], [36, 5]].map(([x, z]) => {
      B.cyl({ x, y: 7.1, z, r: 0.01, h: 1.8, mat: M.metalDark });
      B.cyl({ x, y: 6.1, z, rt: 0.08, rb: 0.38, h: 0.3, mat: M.metalGreen, open: true, seg: 20 });
      const bm = P.bulbMat(0xfff0d0, 5);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), bm); bulb.position.set(x, 5.95, z); scene.add(bulb);
      return G.lights.add({ pos: [x, 5.6, z], color: 0xffe0b8, intensity: 8, distance: 13, area: 'hall', mesh: bulb, emissive: 5, on: false, flicker: 'fluoro' });
    });
    S.hallEmerg = [P.emergency(24.33, 3.6, -5.5, Math.PI / 2, { on: true, intensity: 3, distance: 9, area: 'hall' }), P.emergency(39.97, 4.2, -3.5, -Math.PI / 2, { on: true, intensity: 3, distance: 9, area: 'hall' }), P.emergency(32, 4.2, 7.97, Math.PI, { on: true, intensity: 3, distance: 9, area: 'hall' })];
    const md = G.lights.moonDir.clone().negate();
    for (let k = 0; k < 4; k++) P.shaft(29 + k * 2, 8.2, 0, 1.6, 7, md, 9.5, 0x8aa0d0, 0.018, { flashGain: 0.5 });

    // dressing
    P.bench(27.5, 7.55, 0, 2.4); P.bench(32.2, 7.55, 0, 2.4); P.bench(24.6, 4.5, Math.PI / 2, 2);
    B.cyl({ x: 38.6, y: 0.4, z: -7.5, r: 0.25, h: 0.8, mat: M.metalGray, open: true, col: true });
    P.fireExt(34.3, 0.95, -7.9, 0);
    B.box({ x: 34.3, y: 0.95, z: -7.98, w: 0.12, h: 0.04, d: 0.06, mat: M.metalDark });
    const note2 = B.decal(G.tex.noteTex('hand', 31), { x: 34.12, y: 1.32, z: -7.97, w: 0.1, h: 0.13, rz: 0.25 });
    IX().add({ id: 'letter2', box: [34.2, 1.25, -7.95, 0.3, 0.4, 0.2], glint: true, prompt: () => G.flag('read_letter2') ? 'Read <b>Tom\'s note</b> again' : 'A note tucked behind the <b>fire extinguisher</b>',
      use: () => { const first = !G.flag('read_letter2'); G.setFlag('read_letter2'); G.docs.add('letter2'); if (first) { note2.visible = false; G.ui.afterRead(() => think('Generator B. Maintenance is right here.')); } } });
    S.note2 = note2;
    // bulletin board + clipping
    B.box({ x: 24.33, y: 1.75, z: -5.3, w: 0.04, h: 0.9, d: 1.5, mat: new THREE.MeshStandardMaterial({ color: 0x7a5a38, roughness: 0.95 }) });
    B.decal(G.tex.newspaper(), { x: 24.36, y: 1.78, z: -5.55, w: 0.3, h: 0.4, ry: Math.PI / 2, rz: 0.03 });
    B.decal(G.tex.noteTex('typed', 41), { x: 24.36, y: 1.7, z: -5.0, w: 0.22, h: 0.28, ry: Math.PI / 2, rz: -0.04 });
    B.decal(G.tex.sign('VISITING HOURS\nSUSPENDED', { w: 384, h: 192, bg: '#e9e2cf', fg: '#222', size: 44 }), { x: 24.36, y: 2.0, z: -4.75, w: 0.3, h: 0.15, ry: Math.PI / 2 });
    IX().add({ id: 'clipping', box: [24.4, 1.78, -5.55, 0.1, 0.44, 0.34], glint: true, prompt: () => 'Read the <b>newspaper clipping</b>', use: () => G.docs.add('clipping') });
    IX().add({ id: 'rules', box: [24.4, 1.7, -5.0, 0.1, 0.3, 0.25], prompt: () => 'Read <b>notice</b>', use: () => think('Rule 14: Inmates shall not whistle. Tom whistled anyway. Every day for thirty years.') });
    B.decal(G.tex.sign('YARD', { w: 512, h: 160, bg: '#1d3b2a', fg: '#e8e0c8', border: '#e8e0c8' }), { x: 39.99, y: 4.5, z: 0, w: 1.4, h: 0.44, ry: -Math.PI / 2 });
    B.decal(G.tex.sign('C BLOCK', { w: 512, h: 128, bg: '#1d3b2a', fg: '#e8e0c8', border: '#e8e0c8' }), { x: 24.31, y: 3.7, z: -0.25, w: 1.6, h: 0.4, ry: Math.PI / 2 });
    P.pipe([[24.3, 7.4, -7.8], [40, 7.4, -7.8]], 0.08, M.rust);
    G.audio.addEmitter({ sound: 'drip', pos: new THREE.Vector3(30, 0.05, 3), min: 2, max: 5, range: 18, opts: { vol: 0.7, wet: 0.7 } });

    // shutter
    B.box({ x: 39.95, y: 3.95, z: 0, w: 0.5, h: 0.7, d: 4.0, mat: M.metalGray });
    B.box({ x: 40.05, y: 1.8, z: -1.85, w: 0.2, h: 3.6, d: 0.1, mat: M.metalDark }); B.box({ x: 40.05, y: 1.8, z: 1.85, w: 0.2, h: 3.6, d: 0.1, mat: M.metalDark });
    const sh = new THREE.Group();
    const slatTex = G.tex.canvasTex(64, 256, (ctx, w, h) => { for (let y = 0; y < h; y += 16) { const g = ctx.createLinearGradient(0, y, 0, y + 16); g.addColorStop(0, '#7a7e80'); g.addColorStop(0.5, '#babdbf'); g.addColorStop(1, '#5a5d60'); ctx.fillStyle = g; ctx.fillRect(0, y, w, 16); } }, { repeat: true });
    slatTex.repeat.set(4, 3);
    const shMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a0, map: slatTex, metalness: 0.6, roughness: 0.45 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.6, 3.5), shMat);
    panel.position.set(0, 1.8, 0); panel.castShadow = true; panel.receiveShadow = true;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.5), G.M.metalDark); bar.position.set(0, 0.05, 0);
    sh.add(panel, bar);
    sh.position.set(40.1, 0, 0);
    scene.add(sh);
    S.shutter = sh;
    S.shutterCol = B.collider(40.0, 0, -1.8, 40.3, 3.6, 1.8, 'shutter');
    // control box
    const cb = new THREE.Group(); cb.position.set(39.98, 1.35, 2.5); cb.rotation.y = -Math.PI / 2; scene.add(cb);
    B.box({ parent: cb, x: 0, y: 0, z: 0.07, w: 0.3, h: 0.42, d: 0.14, mat: M.metalGray });
    S.lampRed = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), P.bulbMat(0xff3020, 0)); S.lampRed.position.set(-0.07, 0.12, 0.145); cb.add(S.lampRed);
    S.lampGreen = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), P.bulbMat(0x30ff60, 0)); S.lampGreen.position.set(0.07, 0.12, 0.145); cb.add(S.lampGreen);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0x1a7a3a, roughness: 0.4 })); btn.rotation.x = Math.PI / 2; btn.position.set(0, -0.05, 0.15); cb.add(btn);
    B.decal(G.tex.label('SHUTTER', { w: 256, h: 64 }), { parent: cb, x: 0, y: -0.16, z: 0.142, w: 0.18, h: 0.045 });
    S.shutterBtn = btn;
    IX().add({ id: 'shutterbox', box: [39.9, 1.35, 2.5, 0.2, 0.45, 0.35], enabled: () => !G.flag('shutter_open'), prompt: () => 'Press the <b>shutter button</b>',
      use: async () => {
        G.audio.play('click', { pos: [39.9, 1.3, 2.5], freq: 900 });
        G.tween(0.15, (k) => { btn.position.z = 0.15 - Math.sin(k * Math.PI) * 0.012; });
        if (!G.flag('shutter_power')) { await G.wait(0.3); think(G.flag('gen_running') ? 'Still dead. The shutter motor must be switched off at the breaker panel.' : 'Nothing. Dead. The shutter must run off the generator Tom mentioned.'); return; }
        if (G.flag('shutter_open')) return;
        openShutter(true);
      } });
    IX().add({ id: 'shutter', box: [40.1, 1.8, 0, 0.3, 3.6, 3.5], enabled: () => !G.flag('shutter_open'), range: 2.2, prompt: () => 'Examine the <b>yard shutter</b>',
      use: () => { G.audio.play('metalHit', { pos: [40.1, 1.2, 0], v: 0.4, decay: 0.6, pitch: 0.7 }); think('A motorised steel shutter. The yard\'s on the other side. The control box is on the wall to the right.'); } });
  }

  async function openShutter(anim) {
    G.setFlag('shutter_open');
    if (!anim) { S.shutter.position.y = 3.45; S.shutterCol.enabled = false; return; }
    G.player.control = false;
    G.audio.play('clunk', { pos: [40, 3.9, 0], v: 0.8, freq: 80 });
    const mot = G.audio.loop('engine', { pos: [39.9, 3.9, 0], vol: 0.6, freq: 55, lp: 900, mech: 0.12 });
    await G.tween(4.5, (k) => { S.shutter.position.y = k * 3.45; S.shutter.position.x = 40.1 + Math.sin(k * 60) * 0.004; }, { ease: U.easeInOut });
    if (mot) mot.stop(0.3);
    G.audio.play('clunk', { pos: [40, 3.9, 0], v: 0.9, freq: 70, ring: 1.2 });
    S.shutterCol.enabled = false;
    G.player.control = true;
    G.checkpoint('shutter_open');
    await G.ui.think('Rain. Wind. Air that doesn\'t smell of forty men.');
  }

  // ------------------------------------------------------------------ maintenance corridor
  function buildMaintenance() {
    const M = G.M;
    B.setArea('maint');
    B.floor(34.7, -22.2, 36.5, -8.0, 0, M.concreteWet, 'concrete');
    B.ceiling(34.6, -22.3, 36.6, -8.3, 3.0, M.ceiling);
    B.wall('z', 34.7, -22.2, -8.3, 0, 3.0, M.wallGray, [{ a0: -15.2, a1: -14.0, y0: 0, y1: 2.2 }], { thick: 0.2 });
    B.wall('z', 36.5, -22.2, -8.3, 0, 3.0, M.wallGray, [{ a0: -17.4, a1: -15.8, y0: 0, y1: 2.4 }], { thick: 0.2 });
    B.wall('x', -22.3, 34.6, 36.6, 0, 3.0, M.wallGray, [], { thick: 0.2 });
    P.pipe([[34.95, 2.7, -8.4], [34.95, 2.7, -22.1]], 0.07, M.rust, { flanges: true });
    P.pipe([[36.2, 2.45, -8.4], [36.2, 2.45, -12.4], [36.2, 2.45, -22.1]], 0.05, M.metalGray);
    P.pipe([[36.2, 2.2, -8.4], [36.2, 2.2, -22.1]], 0.035, M.copper);
    // boiler at the end
    B.cyl({ x: 35.6, base: 0, z: -21.5, r: 0.55, h: 2.2, mat: M.metalGray, col: true });
    B.cyl({ x: 35.6, y: 2.4, z: -21.5, r: 0.08, h: 0.6, mat: M.rust });
    S.maintEmerg = P.emergency(35.6, 2.5, -8.5, Math.PI, { on: true, intensity: 2.2, distance: 8, area: 'maint', flicker: 'broken' });
    P.emergency(35.6, 2.5, -21.95, 0, { on: true, intensity: 2, distance: 7, area: 'maint' });
    S.maintLamps = [-11, -15, -19].map((z) => P.cageLamp(35.6, 3.0, z, { drop: 0.15, intensity: 3, distance: 6, on: false, area: 'maint' }));
    // steam leak
    S.steamPos = new THREE.Vector3(36.15, 2.45, -12.4);
    S.steamT = 0;
    B.decal(G.tex.sign('GENERATOR B\nDANGER  HIGH VOLTAGE', { w: 512, h: 220, bg: '#c9a21c', fg: '#111', border: '#111', size: 52 }), { x: 36.39, y: 2.62, z: -16.6, w: 0.9, h: 0.38, ry: -Math.PI / 2 });
    B.decal(G.tex.sign('STORES', { w: 384, h: 128, bg: '#e7dfc9', fg: '#222', border: '#222' }), { x: 34.81, y: 2.45, z: -14.6, w: 0.6, h: 0.2, ry: Math.PI / 2 });
    G.audio.addEmitter({ sound: 'drip', pos: new THREE.Vector3(35.5, 0.05, -18), min: 1.5, max: 3.5, range: 12, opts: { vol: 0.8, wet: 0.6 } });
  }

  // ------------------------------------------------------------------ stores
  function buildStores() {
    const M = G.M, scene = G.engine.scene;
    B.setArea('storage');
    B.floor(28, -20.2, 34.7, -11.9, 0, M.concrete, 'concrete');
    B.ceiling(27.8, -20.3, 34.8, -11.8, 3.0, M.ceiling);
    B.wall('z', 27.9, -20.2, -11.9, 0, 3.0, M.wallGray, [], { thick: 0.2 });
    B.wall('x', -20.3, 27.8, 34.8, 0, 3.0, M.wallGray, [], { thick: 0.2 });
    B.wall('x', -11.8, 27.8, 34.8, 0, 3.0, M.wallGray, [], { thick: 0.2 });
    S.storeLamp = P.cageLamp(31.4, 3.0, -16, { drop: 0.5, intensity: 5, distance: 8, on: false, area: 'storage' });
    // shelves
    P.shelf(28.35, -17.5, Math.PI / 2, 3.2, 2.2, 0.55);
    P.shelf(30.6, -19.85, 0, 2.6, 2.2, 0.5);
    // workbench + pegboard
    B.box({ x: 30.6, y: 0.9, z: -12.3, w: 3.0, h: 0.06, d: 0.7, mat: M.woodOld });
    B.box({ x: 30.6, y: 0.45, z: -12.3, w: 2.9, h: 0.9, d: 0.6, mat: M.metalGray });
    B.colBox(30.6, 0, -12.3, 3.0, 0.95, 0.7);
    B.box({ x: 29.6, y: 1.02, z: -12.35, w: 0.18, h: 0.18, d: 0.12, mat: M.metalRed });
    B.box({ x: 31.8, y: 0.98, z: -12.4, w: 0.4, h: 0.1, d: 0.25, mat: M.metalGreen });
    const peg = G.tex.canvasTex(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#9a8766'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3a2f22'; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#1c1c1c'; ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 40, 150); ctx.strokeRect(110, 60, 90, 30); ctx.strokeRect(230, 50, 20, 140);
      ctx.beginPath(); ctx.moveTo(300, 30); ctx.lineTo(330, 220); ctx.lineTo(360, 30); ctx.stroke();
      ctx.strokeRect(400, 60, 70, 100);
      G.tex.grunge(ctx, w, h, 0.3, 77);
    });
    B.decal(peg, { x: 30.6, y: 1.75, z: -11.91, w: 2.4, h: 1.2, ry: Math.PI });
    const cutters = P.model.boltcutters();
    cutters.rotation.set(0, Math.PI, Math.PI / 2 - 0.05);
    cutters.position.set(29.95, 1.75, -11.97);
    scene.add(cutters);
    S.cutters = cutters;
    IX().add({ id: 'cutters', box: [29.95, 1.75, -12.0, 0.2, 0.75, 0.16], glint: true, enabled: () => !G.flag('took_cutters'),
      prompt: () => 'Take <b>Bolt Cutters</b>', use: () => { G.setFlag('took_cutters'); IX().flyToCamera(cutters); G.inv.add('boltcutters'); } });
    // wrench outline etc on bench
    const wrench = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.015, 0.035), M.steel); wrench.position.set(30.4, 0.94, -12.25); wrench.rotation.y = 0.4; scene.add(wrench);
    IX().add({ id: 'bench', box: [30.9, 1.0, -12.3, 1.5, 0.2, 0.6], prompt: () => 'Examine <b>workbench</b>', use: () => think('Tom\'s old workbench. He fixed half the plumbing in this place from here.') });

    // diesel drum with hand pump + hazard floor paint
    B.cyl({ x: 33.9, base: 0, z: -19.3, r: 0.3, h: 0.9, mat: M.metalRed, seg: 20, col: true });
    [0.12, 0.45, 0.78].forEach((y) => B.cyl({ x: 33.9, y, z: -19.3, r: 0.31, h: 0.03, mat: M.metalDark, seg: 20 }));
    B.cyl({ x: 34.0, y: 1.15, z: -19.3, r: 0.025, h: 0.5, mat: M.metalGray });
    B.box({ x: 34.0, y: 1.42, z: -19.2, w: 0.04, h: 0.04, d: 0.25, mat: M.metalGray });
    B.cyl({ x: 34.0, y: 1.2, z: -19.1, r: 0.012, h: 0.2, rx: Math.PI / 2, mat: M.rubber });
    B.decal(G.tex.sign('DIESEL', { w: 384, h: 128, bg: '#e8dcc0', fg: '#8a1c14', size: 80 }), { x: 33.9, y: 0.6, z: -18.99, w: 0.34, h: 0.12 });
    B.decal(G.tex.hazard ? G.tex.canvasTex(256, 256, (ctx) => { ctx.fillStyle = '#c9a21c'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = '#111'; for (let k = -256; k < 512; k += 64) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 32, 0); ctx.lineTo(k + 32 + 256, 256); ctx.lineTo(k + 256, 256); ctx.fill(); } G.tex.grunge(ctx, 256, 256, 0.6, 3); }) : null, { x: 33.6, y: 0.006, z: -19.1, w: 1.6, h: 1.6, rx: -Math.PI / 2, rough: 0.7 });
    IX().add({ id: 'drum', box: [33.95, 0.8, -19.3, 0.7, 1.4, 0.7],
      prompt: () => G.inv.has('jerrycan') ? 'Fill the <b>Jerrycan</b> with diesel' : 'Examine <b>diesel drum</b>',
      use: async () => {
        if (G.inv.has('jerrycan')) {
          G.player.control = false;
          G.audio.play('pump', { pos: [34, 1.3, -19.2], n: 4 });
          await G.wait(2.4);
          G.inv.replace('jerrycan', 'jerrycan_full', false);
          G.audio.play('pickup', { bus: 'ui', wet: 0.1 });
          G.player.control = true;
          think('Five gallons of diesel. Heavy as sin.');
        } else if (G.inv.has('jerrycan_full')) think('The can\'s already full.');
        else if (G.flag('gen_fueled')) think('I\'ve taken all I need.');
        else { G.audio.play('metalHit', { pos: [34, 0.9, -19.2], v: 0.3, decay: 0.6, pitch: 0.8 }); think('A drum of diesel with a hand pump on top. I need something to carry it in.'); }
      } });
    const can = P.model.jerrycan();
    can.position.set(33.0, 0, -19.55); can.rotation.y = 0.5;
    can.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(can);
    S.can = can;
    IX().add({ id: 'jerrycan', mesh: can, pad: 0.05, glint: true, enabled: () => !G.flag('took_can'),
      prompt: () => 'Take <b>Jerrycan</b>', use: () => { G.setFlag('took_can'); IX().flyToCamera(can); G.inv.add('jerrycan'); } });
    // clutter
    P.crate(28.8, -12.8, 0.7, 0.2); P.crate(28.8, -12.8, 0.5, 0.5, 0.7, { col: false });
    P.barrel(33.2, -12.6, { mat: M.metalGreen });
    for (let k = 0; k < 4; k++) B.cyl({ x: 32.2 + k * 0.22, base: 0, z: -19.8, r: 0.1, h: 0.24, mat: k % 2 ? M.white : M.metalGray });
  }

  // ------------------------------------------------------------------ Generator B
  function buildGenerator() {
    const M = G.M, scene = G.engine.scene;
    B.setArea('genroom');
    B.floor(36.5, -22.2, 46, -10.9, 0, M.concreteWet, 'concrete');
    B.box({ x: 41.5, y: 0.03, z: -16.5, w: 4.2, h: 0.06, d: 6.6, mat: M.plate, cast: false });
    B.region(39.4, -19.8, 43.6, -13.2, 0.06, 'plate');
    B.ceiling(36.3, -22.4, 46.3, -10.8, 5.0, M.ceiling);
    B.wall('x', -22.3, 36.3, 46.3, 0, 5, M.wallGray, [], { thick: 0.2 });
    B.wall('x', -10.85, 36.3, 46.3, 0, 5, M.wallGray, [], { thick: 0.3 });
    B.wall('z', 46.1, -22.4, -10.8, 0, 5, M.wallGray, [], { thick: 0.2 });
    B.wall('z', 36.5, -22.4, -10.8, 3.0, 5, M.wallGray, [], { thick: 0.2 });
    // hazard stripe on floor around generator
    // generator body (long axis along z)
    const gx = 41.5, gz = -16.5;
    B.box({ x: gx, y: 0.2, z: gz, w: 1.6, h: 0.28, d: 4.4, mat: M.metalDark, col: true });
    const genMat = new THREE.MeshStandardMaterial({ color: 0x4a5a48, metalness: 0.55, roughness: 0.5, map: G.tex.sets.metalGreen.map, roughnessMap: G.tex.sets.metalGreen.roughnessMap });
    B.box({ x: gx, y: 0.95, z: gz - 0.3, w: 1.2, h: 1.2, d: 2.2, mat: genMat });
    B.box({ x: gx, y: 1.62, z: gz - 0.3, w: 0.9, h: 0.16, d: 1.9, mat: genMat });
    for (let k = 0; k < 6; k++) B.cyl({ x: gx, y: 1.76, z: gz - 1.1 + k * 0.32, r: 0.07, h: 0.12, mat: M.metalDark });
    B.cyl({ x: gx, y: 0.95, z: gz + 1.45, r: 0.55, h: 1.1, rx: Math.PI / 2, mat: new THREE.MeshStandardMaterial({ color: 0x2f3e50, metalness: 0.6, roughness: 0.45 }), seg: 24 });
    B.box({ x: gx, y: 1.0, z: gz - 1.75, w: 1.3, h: 1.4, d: 0.35, mat: M.metalDark });
    const grille = G.tex.canvasTex(256, 256, (ctx) => { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = '#555'; ctx.lineWidth = 3; for (let y = 6; y < 256; y += 12) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); } });
    B.decal(grille, { x: gx, y: 1.0, z: gz - 1.93, w: 1.15, h: 1.25, ry: Math.PI, rough: 0.5 });
    B.colBox(gx, 0, gz, 1.5, 1.9, 4.2);
    // exhaust
    P.pipe([[gx + 0.3, 1.7, gz + 0.3], [gx + 0.3, 3.2, gz + 0.3], [gx + 0.3, 3.4, gz + 0.8], [gx + 0.3, 5.0, gz + 0.8]], 0.1, M.rust, { flanges: true });
    B.decal(G.tex.sign('GEN  B', { w: 384, h: 128, bg: null, fg: '#e8e0c8', size: 90 }), { x: gx + 0.61, y: 1.1, z: gz - 0.3, w: 0.8, h: 0.26, ry: Math.PI / 2 });
    B.decal(G.tex.sign('GEN  B', { w: 384, h: 128, bg: null, fg: '#e8e0c8', size: 90 }), { x: gx - 0.61, y: 1.1, z: gz - 0.3, w: 0.8, h: 0.26, ry: -Math.PI / 2 });
    S.genPos = new THREE.Vector3(gx, 1.0, gz);

    // day tank
    const tx = 44.6, tz = -20.8;
    B.cyl({ x: tx, y: 1.15, z: tz, r: 0.45, h: 1.8, rz: Math.PI / 2, mat: M.metalRed, seg: 24 });
    [-0.6, 0.6].forEach((d) => B.box({ x: tx + d, y: 0.4, z: tz, w: 0.12, h: 0.8, d: 0.7, mat: M.metalDark }));
    B.colBox(tx, 0, tz, 1.9, 1.6, 1.0);
    B.cyl({ x: tx - 0.4, y: 1.64, z: tz, r: 0.07, h: 0.1, mat: M.metalDark });
    S.cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 16), M.brass);
    S.cap.position.set(tx - 0.4, 1.71, tz); scene.add(S.cap);
    // sight gauge
    B.box({ x: tx + 0.3, y: 1.15, z: tz + 0.47, w: 0.06, h: 0.8, d: 0.02, mat: M.glass });
    B.box({ x: tx + 0.3, y: 1.15, z: tz + 0.455, w: 0.1, h: 0.86, d: 0.01, mat: M.metalDark });
    S.fuelFloat = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.02), P.bulbMat(0xff9a20, 1.5));
    S.fuelFloat.position.set(tx + 0.3, 0.78, tz + 0.475); scene.add(S.fuelFloat);
    B.decal(G.tex.label('FULL', { w: 128, h: 48 }), { x: tx + 0.44, y: 1.5, z: tz + 0.47, w: 0.1, h: 0.035 });
    B.decal(G.tex.label('EMPTY', { w: 128, h: 48 }), { x: tx + 0.44, y: 0.8, z: tz + 0.47, w: 0.1, h: 0.035 });
    B.decal(G.tex.sign('DAY TANK\nDIESEL', { w: 384, h: 192, bg: '#e8dcc0', fg: '#1a1a1a', size: 56 }), { x: tx - 0.3, y: 1.18, z: tz + 0.455, w: 0.4, h: 0.2 });
    P.pipe([[tx - 0.8, 0.9, tz + 0.2], [gx + 0.4, 0.9, tz + 0.2], [gx + 0.4, 0.9, gz - 0.9], [gx + 0.4, 0.7, gz - 0.9]], 0.02, M.copper);
    IX().add({ id: 'tank', box: [tx - 0.4, 1.66, tz, 0.4, 0.2, 0.4], range: 2.4, enabled: () => !G.flag('gen_fueled'),
      prompt: () => G.inv.has('jerrycan_full') ? 'Pour <b>diesel</b> into the day tank' : 'Open the <b>fuel filler cap</b>',
      use: async () => {
        if (!G.inv.has('jerrycan_full')) { G.audio.play('metalHit', { pos: [tx, 1.6, tz], v: 0.3, decay: 1.4, pitch: 0.7 }); think(G.inv.has('jerrycan') ? 'Bone dry, just like Tom said. The can\'s empty too &mdash; fill it at the drum.' : 'Hollow. The day tank\'s bone dry.'); return; }
        G.player.control = false;
        G.tween(0.4, (k) => { S.cap.position.y = 1.71 + k * 0.08; S.cap.position.x = tx - 0.4 + k * 0.15; });
        G.audio.play('pour', { pos: [tx - 0.4, 1.7, tz], dur: 3.2 });
        await G.tween(3.2, (k) => { S.fuelFloat.position.y = 0.78 + k * 0.62; });
        G.inv.replace('jerrycan_full', 'jerrycan', true);
        G.inv.remove('jerrycan');
        G.setFlag('gen_fueled');
        G.player.control = true;
        think('Full. Now to wake her up.');
      } });

    // start card on the west wall
    B.decal(G.tex.noteTex('typed', 51), { x: 36.62, y: 1.55, z: -18.8, w: 0.3, h: 0.38, ry: Math.PI / 2 });
    B.box({ x: 36.61, y: 1.79, z: -18.8, w: 0.02, h: 0.05, d: 0.32, mat: M.metalRed });
    IX().add({ id: 'card', box: [36.66, 1.55, -18.8, 0.08, 0.4, 0.34], glint: true, prompt: () => 'Read the <b>start card</b>', use: () => { G.setFlag('read_card'); G.docs.add('genmanual'); } });

    // lights
    S.genLamps = [[39, -14], [44, -14], [39, -19.5], [43.5, -19.5]].map(([x, z]) => P.tubeLamp(x, 5.0, z, 1.4, 'x', { on: false, area: 'genroom', intensity: 9, distance: 10 }));
    S.genEmerg = P.emergency(45.97, 3.2, -16, -Math.PI / 2, { on: true, intensity: 2.5, distance: 10, area: 'genroom' });
    P.pipe([[36.7, 4.5, -21.9], [45.9, 4.5, -21.9]], 0.09, M.rust, { flanges: true });
    P.pipe([[36.7, 4.2, -11.1], [45.9, 4.2, -11.1]], 0.05, M.metalGray);
    P.barrel(45.4, -11.7, { mat: M.metalGreen }); P.barrel(44.8, -11.6, { mat: M.rust });
    P.crate(37.3, -21.4, 0.8, 0.1);

    buildGenPanel();
    buildBreakerPanel();
  }

  // generator control pedestal (faces -x toward the doorway)
  function buildGenPanel() {
    const M = G.M, scene = G.engine.scene;
    const g = new THREE.Group();
    g.position.set(39.35, 0, -17.9); g.rotation.y = -Math.PI / 2;
    scene.add(g);
    B.box({ parent: g, x: 0, y: 0.55, z: 0, w: 0.2, h: 1.1, d: 0.2, mat: M.metalDark });
    const panel = new THREE.Group(); panel.position.set(0, 1.25, 0.05); panel.rotation.x = -0.35; g.add(panel);
    B.box({ parent: panel, x: 0, y: 0, z: 0, w: 0.62, h: 0.42, d: 0.12, mat: M.metalGray });
    const face = G.tex.canvasTex(512, 350, (ctx, w, h) => {
      ctx.fillStyle = '#2a3230'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#8a948e'; ctx.lineWidth = 3; ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#e8e2d0'; ctx.font = '600 26px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText('GENERATOR  B', w / 2, 44);
      ctx.font = '600 19px "IBM Plex Mono", monospace';
      ctx.fillText('FUEL PUMP', 95, 300); ctx.fillText('GLOW PLUG', 255, 300); ctx.fillText('START', 410, 300);
      ctx.fillText('ON', 95, 110); ctx.fillText('OFF', 95, 250);
      G.tex.grunge(ctx, w, h, 0.25, 61);
    });
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.41), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }));
    fm.position.z = 0.061; panel.add(fm);
    // fuel pump toggle
    const sw = new THREE.Group(); sw.position.set(-0.19, 0.0, 0.07); panel.add(sw);
    B.box({ parent: sw, x: 0, y: 0, z: 0, w: 0.06, h: 0.08, d: 0.02, mat: M.chrome });
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.07, 10), M.chrome); lever.geometry.translate(0, 0.035, 0); lever.rotation.x = Math.PI - 0.5; sw.add(lever);
    const lk = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), M.black); lk.position.y = 0.07; lever.add(lk);
    S.pumpLever = lever; S.pumpSwitch = sw;
    S.pumpLamp = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), P.bulbMat(0xffa020, 0)); S.pumpLamp.position.set(-0.11, 0.11, 0.07); panel.add(S.pumpLamp);
    // glow plug button + lamp
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xb02a20, roughness: 0.4 })); glow.rotation.x = Math.PI / 2; glow.position.set(0.0, -0.03, 0.07); panel.add(glow);
    S.glowBtn = glow;
    S.glowLamp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), P.bulbMat(0xffa020, 0)); S.glowLamp.position.set(0.0, 0.07, 0.07); panel.add(S.glowLamp);
    // start button
    const start = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0x1a6a30, roughness: 0.4 })); start.rotation.x = Math.PI / 2; start.position.set(0.19, -0.03, 0.07); panel.add(start);
    S.startBtn = start;
    // rpm gauge
    const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshStandardMaterial({ map: G.tex.gauge('RPM', 2000, 1700, 'x1'), roughness: 0.4 }));
    gauge.position.set(0.19, 0.09, 0.062); panel.add(gauge);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.003, 0.002), M.redPaint); needle.geometry.translate(0.02, 0, 0); needle.position.set(0.19, 0.09, 0.066); panel.add(needle);
    S.rpmNeedle = needle;
    S.genPanel = panel;
    S.genPanelGroup = g;
    const setNeedle = (v) => { const a = Math.PI * 0.75 + Math.PI * 1.5 * U.clamp(v, 0, 1); needle.rotation.z = -a; };
    S.setRpm = setNeedle; setNeedle(0);
    IX().add({ id: 'genpanel', box: [39.35, 1.25, -17.9, 0.35, 0.5, 0.7], prompt: () => 'Use the <b>generator controls</b>', use: () => focusGenPanel() });
  }

  function focusGenPanel() {
    const center = S.genPanel.getWorldPosition(new THREE.Vector3());
    const nrm = new THREE.Vector3(0, 0, 1).applyQuaternion(S.genPanel.getWorldQuaternion(new THREE.Quaternion()));
    const parts = [
      { obj: S.pumpSwitch, click: () => {
        const on = !G.flag('pump_on'); G.setFlag('pump_on', on);
        G.audio.play('switch', { pos: center });
        if (on) G.audio.play('buzz', { pos: center, dur: 1.2, freq: 90, v: 0.5 });
        updateGenPanel();
      } },
      { obj: S.glowBtn, down: () => { S.glowHeld = true; G.audio.play('click', { pos: center, freq: 700 }); S.glowBtn.position.z = 0.06; }, up: () => { S.glowHeld = false; S.glowBtn.position.z = 0.07; } },
      { obj: S.startBtn, down: () => { S.startBtn.position.z = 0.06; tryStart(); }, up: () => { S.startBtn.position.z = 0.07; } },
    ];
    G.focus.enter({ pos: center.clone().addScaledVector(nrm, 0.6).add(new THREE.Vector3(0, 0.08, 0)), look: center, parts,
      help: '<span class="key">Click</span> switches &nbsp; <span class="key">Hold</span> buttons &nbsp; <span class="key">RMB</span> step back' });
  }
  function updateGenPanel() {
    S.pumpLever.rotation.x = G.flag('pump_on') ? 0.5 : Math.PI - 0.5;
    S.pumpLamp.material.emissiveIntensity = G.flag('pump_on') ? 4 : 0;
  }
  S.glow = 0; S.glowReadyT = 0;
  async function tryStart() {
    if (S.cranking || G.flag('gen_running')) { if (G.flag('gen_running')) G.audio.play('click', { pos: S.genPos, freq: 600 }); return; }
    S.cranking = true;
    const ready = S.glowReadyT > 0;
    const crank = G.audio.loop('starter', { pos: S.genPos, vol: 0.9, ref: 2 });
    S.crankT = 0;
    const fueled = G.flag('gen_fueled'), pump = G.flag('pump_on');
    const willStart = fueled && pump && ready;
    await G.wait(willStart ? 1.6 : 2.4);
    if (crank) crank.stop(0.15);
    if (willStart) {
      G.audio.play('sputter', { pos: S.genPos, n: 5 });
      await G.wait(0.5);
      startEngine(true);
    } else {
      if (fueled && pump) G.audio.play('sputter', { pos: S.genPos, n: 3 });
      await G.wait(0.4);
      if (!fueled) think('It turns over and dies. No fuel &mdash; the day tank\'s empty.');
      else if (!pump) think('Turns over, but it won\'t catch. Fuel isn\'t getting through &mdash; the pump.');
      else think('Coughs and dies. Too cold. The card said to heat the glow plug first.');
    }
    S.cranking = false;
  }
  function startEngine(anim) {
    G.setFlag('gen_running');
    if (!S.engineLoop && G.audio.ready) S.engineLoop = G.audio.loop('engine', { pos: S.genPos, vol: 1.1, freq: 25, ref: 2.5, roll: 1.1, fadeIn: anim ? 0.8 : 0.1 });
    if (anim) {
      G.tween(2.5, (k) => S.setRpm(k * 0.75));
      G.audio.play('solve', { bus: 'ui', vol: 0.4, wet: 0.3 });
      setTimeout(() => think('She\'s alive! Now the breakers.'), 1800);
    } else S.setRpm(0.75);
  }
  L.stopEngineSound = () => { if (S.engineLoop) { S.engineLoop.stop(0.5); S.engineLoop = null; } };

  // ------------------------------------------------------------------ breaker panel
  function buildBreakerPanel() {
    const M = G.M, scene = G.engine.scene;
    const g = new THREE.Group();
    g.position.set(39.4, 1.45, -11.0); g.rotation.y = Math.PI;
    scene.add(g);
    B.box({ parent: g, x: 0, y: 0, z: 0.08, w: 1.1, h: 1.3, d: 0.16, mat: M.metalGray });
    const dp = new THREE.Group(); dp.position.set(-0.55, 0, 0.16); dp.rotation.y = -2.1; g.add(dp);
    B.box({ parent: dp, x: 0.55, y: 0, z: 0, w: 1.1, h: 1.3, d: 0.02, mat: M.metalGray });
    B.decal(G.tex.sign('DANGER\n415 VOLTS', { w: 384, h: 256, bg: '#c9a21c', fg: '#111', border: '#111', size: 64 }), { parent: dp, x: 0.55, y: 0.35, z: 0.012, w: 0.36, h: 0.24 });
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.24), new THREE.MeshStandardMaterial({ color: 0x2c3130, roughness: 0.7, map: G.tex.canvasTex(512, 600, (ctx, w, h) => {
      ctx.fillStyle = '#2c3130'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8e2d0'; ctx.font = '600 22px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText('GEN B  DISTRIBUTION', w / 2, 36);
      ctx.font = '600 16px "IBM Plex Mono", monospace'; ctx.fillText('MAX CONTINUOUS LOAD 60 kW', w / 2, 62);
      G.tex.grunge(ctx, w, h, 0.2, 90);
    }) }));
    inner.position.z = 0.161; g.add(inner);
    // main breaker
    const main = new THREE.Group(); main.position.set(-0.3, 0.38, 0.17); g.add(main);
    B.box({ parent: main, x: 0, y: 0, z: 0.02, w: 0.16, h: 0.22, d: 0.05, mat: M.black });
    const ml = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.03), M.redPaint); ml.geometry.translate(0, 0.07, 0); ml.position.set(0, 0, 0.05); main.add(ml);
    B.decal(G.tex.label('MAIN', { w: 192, h: 64, bg: '#b8322a', fg: '#fff' }), { parent: main, x: 0, y: -0.15, z: 0.01, w: 0.12, h: 0.04 });
    S.mainLever = ml; S.main = main;
    // load gauge
    const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.11, 32), new THREE.MeshStandardMaterial({ map: G.tex.gauge('LOAD', 80, 60, 'kW'), roughness: 0.4 }));
    gauge.position.set(0.2, 0.38, 0.17); g.add(gauge);
    const nd = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.005, 0.003), M.redPaint); nd.geometry.translate(0.04, 0, 0); nd.position.set(0.2, 0.38, 0.175); g.add(nd);
    S.loadNeedle = nd;
    S.overLamp = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), P.bulbMat(0xff2010, 0)); S.overLamp.position.set(0.38, 0.47, 0.18); g.add(S.overLamp);
    S.runLamp = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), P.bulbMat(0x20ff50, 0)); S.runLamp.position.set(0.38, 0.29, 0.18); g.add(S.runLamp);
    B.decal(G.tex.label('OVER', { w: 128, h: 48 }), { parent: g, x: 0.45, y: 0.47, z: 0.17, w: 0.07, h: 0.026 });
    B.decal(G.tex.label('GEN', { w: 128, h: 48 }), { parent: g, x: 0.45, y: 0.29, z: 0.17, w: 0.07, h: 0.026 });
    // 8 breakers: 2 rows of 4
    S.brk = [];
    BREAKERS.forEach((b, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const bg = new THREE.Group(); bg.position.set(-0.39 + col * 0.26, 0.02 - row * 0.4, 0.17); g.add(bg);
      B.box({ parent: bg, x: 0, y: 0.05, z: 0.015, w: 0.08, h: 0.13, d: 0.04, mat: M.black });
      const lv = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.025), M.white); lv.geometry.translate(0, 0.035, 0); lv.position.set(0, 0.05, 0.04); bg.add(lv);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.1), new THREE.MeshStandardMaterial({ map: G.tex.sign(b.name + '\n' + b.kw + ' kW', { w: 320, h: 160, bg: '#e9e4d4', fg: '#111', font: '"IBM Plex Mono", monospace', weight: 600, size: 30, grunge: 0.1 }), roughness: 0.7 }));
      lab.position.set(0, -0.1, 0.001); bg.add(lab);
      if (b.locked) {
        const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0xc0281c, roughness: 0.6, side: THREE.DoubleSide }));
        tag.position.set(0.035, 0.02, 0.06); tag.rotation.z = 0.2; bg.add(tag);
        const pl = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 12), M.brass); pl.position.set(0.02, 0.1, 0.06); bg.add(pl);
      }
      S.brk.push({ def: b, group: bg, lever: lv });
    });
    S.breakerGroup = g;
    updateBreakers(true);
    IX().add({ id: 'breakers', box: [39.4, 1.45, -11.2, 1.2, 1.4, 0.5], prompt: () => 'Open the <b>breaker panel</b>', use: () => focusBreakers() });
  }

  function updateBreakers(instant) {
    S.brk.forEach((b) => {
      const on = brk(b.def.id);
      const target = on ? -0.55 : 0.55;
      if (instant) b.lever.rotation.x = target; else { const s = b.lever.rotation.x; G.tween(0.12, (k) => { b.lever.rotation.x = s + (target - s) * k; }); }
    });
    S.mainLever.rotation.x = G.flag('main_on') ? -0.6 : 0.6;
    const l = load();
    const a = Math.PI * 0.75 + Math.PI * 1.5 * U.clamp(l / 80, 0, 1);
    if (instant) S.loadNeedle.rotation.z = -a; else { const s = S.loadNeedle.rotation.z; G.tween(0.4, (k) => { S.loadNeedle.rotation.z = s + (-a - s) * k; }, { ease: U.easeOut }); }
    S.overLamp.material.emissiveIntensity = l > MAXKW ? 5 : 0;
    S.runLamp.material.emissiveIntensity = G.flag('gen_running') ? 4 : 0;
  }
  L.updateBreakers = updateBreakers;

  function focusBreakers() {
    const g = S.breakerGroup;
    const center = g.localToWorld(new THREE.Vector3(0, 0.1, 0.17));
    const nrm = new THREE.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
    const parts = S.brk.map((b) => ({
      obj: b.group,
      click: () => {
        if (b.def.locked) { G.audio.play('metalHit', { pos: center, v: 0.15, decay: 0.3, pitch: 3 }); think(b.def.locked); return; }
        const on = !brk(b.def.id);
        G.setFlag('brk_' + b.def.id, on);
        G.audio.play('breaker', { pos: center });
        updateBreakers(false);
        powerChanged();
        if (G.flag('main_on') && load() > MAXKW) overload();
      },
    }));
    parts.push({ obj: S.main, click: () => {
      const on = !G.flag('main_on');
      G.audio.play('breaker', { pos: center, zap: on && G.flag('gen_running') });
      if (on && !G.flag('gen_running')) { G.setFlag('main_on', false); S.mainLever.rotation.x = -0.6; G.tween(0.3, (k) => { S.mainLever.rotation.x = -0.6 + k * 1.2; }); think('It springs back. Nothing to switch &mdash; the generator isn\'t running.'); return; }
      G.setFlag('main_on', on);
      updateBreakers(false);
      if (on && load() > MAXKW) overload();
      else powerChanged(true);
    } });
    G.focus.enter({ pos: center.clone().addScaledVector(nrm, 1.05), look: center, parts,
      help: '<span class="key">Click</span> flip a breaker &nbsp; <span class="key">RMB</span> step back' });
  }

  async function overload() {
    if (S.overloading) return;
    S.overloading = true;
    const e = S.engineLoop;
    if (e) e.set('rpm', 0.6);
    S.setRpm(0.45);
    G.audio.play('buzz', { pos: S.genPos, dur: 1.2, freq: 70, v: 0.8 });
    powerChanged(true, true);
    await G.wait(1.3);
    G.audio.play('bang', { pos: [39.4, 1.8, -11.1], v: 0.7 });
    G.audio.play('spark', { pos: [39.4, 1.8, -11.1], dur: 0.4 });
    G.engine.burst({ pos: new THREE.Vector3(39.1, 1.85, -11.15), count: 30, speed: 2.5, life: 0.6, color: 0xbfe0ff, dir: new THREE.Vector3(0, 0.2, -1) });
    G.setFlag('main_on', false);
    updateBreakers(false);
    if (e) e.set('rpm', 1);
    S.setRpm(0.75);
    powerChanged();
    S.overloading = false;
    think(load() > MAXKW ? 'Tripped. Way too much load &mdash; the needle\'s deep in the red. Shed some circuits first.' : 'Tripped.');
  }

  // Apply the effects of the power state on the world
  function powerChanged(announce, flickerOnly) {
    const on = L.powerOn() && !flickerOnly;
    S.genLamps.forEach((v) => (v.on = on));
    S.maintLamps.forEach((v) => (v.on = on));
    S.storeLamp.on = on;
    S.hallLights.forEach((v) => (v.on = on && brk(3)));
    const blk = G.levels.find((l) => l.name === 'block');
    if (blk && blk.s.night && G.flag('blackout_c')) {
      blk.s.night.forEach((v) => (v.on = on && brk(1)));
      blk.s.cellLamp.on = on && brk(1);
    }
    const shutterPower = on && brk(5);
    S.lampGreen.material.emissiveIntensity = shutterPower ? 5 : 0;
    S.lampRed.material.emissiveIntensity = on && !brk(5) ? 4 : 0;
    const was = G.flag('shutter_power');
    if (shutterPower) G.setFlag('shutter_power');
    G.setFlag('floods_on', on && brk(4));
    G.emit('power', on);
    if (announce && on) {
      G.audio.play('fluoro', { pos: [41, 4.8, -16] });
      if (shutterPower && !was) { G.audio.play('solve', { bus: 'ui', vol: 0.5, wet: 0.3 }); setTimeout(() => think('Lights. And somewhere out in the hall, a relay just clicked. The shutter should have power now.'), 900); G.checkpoint('power_on'); }
      else if (!brk(5)) setTimeout(() => think('Power&hellip; but the shutter motor\'s still switched off.'), 900);
    }
  }
  L.powerChanged = powerChanged;

  // ------------------------------------------------------------------ apply state
  L.apply = function () {
    const f = G.flag;
    if (f('maint_open')) S.maintDoor.set(1); else S.maintDoor.set(0);
    S.adminDoor.set(0);
    S.cutters.visible = !f('took_cutters');
    S.can.visible = !f('took_can');
    S.note2.visible = !f('read_letter2');
    if (f('gen_fueled')) { S.fuelFloat.position.y = 1.4; S.cap.position.set(44.35, 1.79, -20.8); }
    else { S.fuelFloat.position.y = 0.78; S.cap.position.set(44.2, 1.71, -20.8); }
    updateGenPanel();
    L.stopEngineSound();
    S.glow = 0; S.glowReadyT = 0; S.cranking = false; S.overloading = false;
    if (f('gen_running')) startEngine(false); else S.setRpm(0);
    updateBreakers(true);
    powerChanged(false);
    if (f('shutter_open')) openShutter(false); else { S.shutter.position.y = 0; S.shutterCol.enabled = true; }
  };

  // ------------------------------------------------------------------ update
  L.update = function (dt, t) {
    const area = G.world.current ? G.world.current.name : '';
    // glow plug heating
    if (S.glowHeld) { S.glow = Math.min(1, S.glow + dt / 3.5); if (S.glow >= 1 && S.glowReadyT <= 0) { S.glowReadyT = 25; G.audio.play('tick', { pos: S.genPos, freq: 2500 }); } }
    else if (S.glowReadyT <= 0) S.glow = Math.max(0, S.glow - dt * 0.5);
    if (S.glowReadyT > 0) S.glowReadyT -= dt;
    if (S.glowLamp) {
      const m = S.glowLamp.material;
      if (S.glowReadyT > 0) { m.emissive.setHex(0x30ff60); m.emissiveIntensity = 4; }
      else { m.emissive.setHex(0xffa020); m.emissiveIntensity = S.glow > 0.02 ? 1 + S.glow * 4 * (0.8 + Math.sin(t * 20) * 0.2) : 0; }
    }
    // engine vibration near the generator
    if (G.flag('gen_running') && S.genPos) {
      const d = G.player.pos.distanceTo(S.genPos);
      const k = U.clamp(1 - d / 6, 0, 1) * 0.004;
      G.player.eyeOffset.set((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, 0);
      if (S.engineLoop) S.engineLoop.setMuffle && 0;
    } else G.player.eyeOffset.set(0, 0, 0);
    // steam leak puffs
    if (area === 'maint' || area === 'storage' || area === 'genroom' || area === 'hall') {
      S.steamT -= dt;
      if (S.steamT <= 0) {
        S.steamT = U.range(3, 7);
        G.audio.play('whoosh', { pos: S.steamPos, dur: 1.4, to: 5000, v: 0.4 });
        G.engine.burst({ pos: S.steamPos, count: 30, color: 0x444848, speed: 1.2, life: 1.6, gravity: -0.6, size: 0.35, spread: 0.05, drag: 1.5, dir: new THREE.Vector3(-1, -0.2, 0) });
      }
    }
    // first visit to maintenance
    if ((area === 'maint' || area === 'genroom' || area === 'storage') && !G.flag('visited_maint')) {
      G.setFlag('visited_maint');
      if (!G.inv.has('flashlight')) setTimeout(() => think('Black as pitch in here. A light would help &mdash; the guard station had one.'), 600);
    }
    // yard floods block
  };
})();
