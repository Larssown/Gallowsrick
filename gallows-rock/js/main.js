// main.js — boot, game loop, modes (title / intro / play / paused / ending), input routing, checkpoints
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U;
  const UI = G.ui, I = G.input;
  G.mode = 'loading';
  G.time = 0;

  const CP = {
    start: { pos: [13.55, 0, 3.9], yaw: Math.PI, pitch: 0.1 },
    cell_open: { pos: [13.5, 0, 3.4], yaw: 0, pitch: 0 },
    gate_open: { pos: [25.3, 0, -0.25], yaw: -Math.PI / 2, pitch: 0 },
    power_on: { pos: [38.3, 0, -16.6], yaw: Math.PI / 2, pitch: 0 },
    shutter_open: { pos: [38.6, 0, 0.2], yaw: -Math.PI / 2, pitch: 0 },
    chapel_inside: { pos: [86.0, 0, 10], yaw: -Math.PI / 2, pitch: 0 },
    altar_open: { pos: [100.9, 0.45, 11.8], yaw: -0.585, pitch: 0 },
    seadoor_open: { pos: [122.1, -4.8, 18.6], yaw: Math.PI, pitch: 0 },
  };
  G.CP = CP;

  G.checkpoint = function (id) {
    G.state.cp = id;
    G.save();
    const n = document.createElement('div');
    n.className = 'note-pop';
    n.style.cssText = 'position:absolute;right:30px;bottom:30px;top:auto';
    n.innerHTML = '<div><div class="t1">Checkpoint</div><div class="t2" style="font-size:14px;opacity:.8">Progress saved</div></div>';
    G.$('#hud').appendChild(n);
    requestAnimationFrame(() => n.classList.add('on'));
    setTimeout(() => { n.classList.remove('on'); setTimeout(() => n.remove(), 600); }, 2500);
  };
  G.respawn = function () {
    const c = CP[G.state.cp] || CP.start;
    G.player.teleport(c.pos[0], c.pos[1], c.pos[2], c.yaw, c.pitch);
    G.player.control = true;
    G.player.crouch = 0; G.player.crouchToggle = false; G.player.forceCrouch = false;
    G.levels.forEach((l) => { if (l.name === 'yard' || l.name === 'cave') l.apply(); });
    G.world.current = null;
    G.mode = 'play';
    UI.fade(0, 1.2);
  };

  // ------------------------------------------------------------------ boot
  G.boot = async function () {
    const yieldUI = () => new Promise((r) => setTimeout(r, 0));
    UI.loading(0.02, 'Loading fonts');
    try {
      await Promise.race([
        Promise.all(['700 40px "Stardos Stencil"', '20px "Special Elite"', '500 30px Caveat', '700 30px Caveat', '400 20px Oswald', '600 20px "IBM Plex Mono"'].map((f) => document.fonts.load(f))),
        new Promise((r) => setTimeout(r, 3500)),
      ]);
    } catch (e) { /* fonts optional */ }
    UI.loading(0.05, 'Starting the renderer');
    await yieldUI();
    G.engine.init();
    G.inspect.init();
    await G.tex.buildAll((p, label) => UI.loading(0.07 + p * 0.45, label));
    const names = { block: 'Building C Block', hall: 'Building the central hall', yard: 'Building the yard', chapel: 'Building the chapel', cave: 'Carving the sea cave' };
    for (let i = 0; i < G.levels.length; i++) {
      UI.loading(0.54 + (i / G.levels.length) * 0.26, names[G.levels[i].name] || 'Building');
      await yieldUI();
      G.levels[i].build();
    }
    UI.loading(0.8, 'Merging geometry');
    await yieldUI();
    G.B.finalize();
    G.B.assignLayers();
    UI.loading(0.84, 'Painting item icons');
    await yieldUI();
    G.makeIcons();
    UI.loading(0.87, 'Setting up the island');
    await yieldUI();
    G.cine.build();
    UI.loading(0.9, 'Compiling shaders');
    await yieldUI();
    newState();
    applyAll();
    G.lights.spotA.shadow.needsUpdate = true; G.lights.spotB.shadow.needsUpdate = true;
    try { G.engine.renderer.compile(G.engine.scene, G.engine.camera); G.engine.renderer.compile(G.cine.ext.sc, G.cine.ext.cam); } catch (e) { console.warn(e); }
    UI.loading(0.95, 'Wiring the cameras');
    await yieldUI();
    try { bakeCCTV(); } catch (e) { console.warn('cctv', e); }
    UI.loading(1, 'Ready');
    bindInput();
    UI.bindMenus(menuAction);
    G.booted = true;
    G.$('#load-status').innerHTML = 'Click anywhere to begin';
    G.$('#load-status').style.color = '#e9e3d3';
    G.$('#load-status').style.animation = 'flicker 3s infinite';
    requestAnimationFrame(frame);
    const go = () => {
      window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go);
      G.audio.init();
      G.music.init();
      G.audio.applyVolumes();
      toTitleFirst();
      if (G.quick) startGame(false);
    };
    window.addEventListener('pointerdown', go);
    window.addEventListener('keydown', go);
    window.addEventListener('pointerdown', () => { if (G.audio.ctx && G.audio.ctx.state === 'suspended') G.audio.ctx.resume(); });
    window.addEventListener('keydown', () => { if (G.audio.ctx && G.audio.ctx.state === 'suspended') G.audio.ctx.resume(); });
    if (/[?&]debug/.test(location.search)) G.debugMode = true;
    if (/[?&]quick/.test(location.search)) { G.debugMode = true; G.quick = true; go(); }
  };

  function newState() {
    G.state = G.newState();
    G.lights.flashOn = false;
  }
  function applyAll() {
    G.levels.forEach((l) => { try { l.apply && l.apply(); } catch (e) { console.error(l.name, e); } });
  }

  // ------------------------------------------------------------------ CCTV bake
  function bakeCCTV() {
    const E = G.engine, W = G.world, r = E.renderer;
    const blk = G.levels.find((l) => l.name === 'block').s;
    const yard = G.levels.find((l) => l.name === 'yard');
    const rt = new THREE.WebGLRenderTarget(256, 192, { samples: 0 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const cam = new THREE.PerspectiveCamera(68, 256 / 192, 0.1, 150);
    cam.layers.enableAll();
    G.world.showAll();
    const buf = new Uint8Array(256 * 192 * 4);
    const views = [
      { area: 'yard', pos: [42.5, 8.5, 26.5], look: [62, 0, 4], frames: 12 },
      { area: 'genroom', pos: [45.6, 4.6, -11.4], look: [40, 0.3, -18.5], frames: 2 },
      { area: 'chapel', pos: [85.0, 6.2, 16.2], look: [97, 0.8, 7.5], frames: 4 },
    ];
    const oldFog = E.scene.fog.density;
    views.forEach((v, vi) => {
      W.current = W.area(v.area);
      const mon = blk.monitors[vi];
      mon.frames = [];
      cam.position.set(...v.pos); cam.lookAt(...v.look); cam.updateMatrixWorld();
      for (let f = 0; f < v.frames; f++) {
        const t = f * 0.7;
        if (v.area === 'yard') yard.bakePose(f / v.frames);
        E.scene.fog.density = v.area === 'yard' ? 0.02 : 0.03;
        E.updateLights(0.016, t * 3, cam.position);
        r.setRenderTarget(rt);
        r.render(E.scene, cam);
        r.readRenderTargetPixels(rt, 0, 0, 256, 192, buf);
        const img = new ImageData(256, 192);
        for (let y = 0; y < 192; y++) for (let x = 0; x < 256; x++) {
          const si = ((191 - y) * 256 + x) * 4, di = (y * 256 + x) * 4;
          const l = Math.min(255, (buf[si] * 0.3 + buf[si + 1] * 0.59 + buf[si + 2] * 0.11) * 1.9 + 14);
          img.data[di] = l * 0.72; img.data[di + 1] = l; img.data[di + 2] = l * 0.82; img.data[di + 3] = 255;
        }
        mon.frames.push(img);
      }
    });
    yard.bakeEnd();
    r.setRenderTarget(null);
    rt.dispose();
    E.scene.fog.density = oldFog;
    W.current = null;
  }

  // ------------------------------------------------------------------ modes
  function toTitleFirst() {
    UI.show('#loading', false);
    UI.fadeNow(1);
    G.toTitle(true);
  }
  G.toTitle = function (first) {
    G.mode = 'title';
    G.audio.stopAllLoops && G.audio.stopAllLoops();
    I.exitLock();
    UI.show('#hud', false); UI.show('#pause', false); UI.show('#settings', false); UI.show('#ending', false); UI.show('#inventory', false); UI.show('#reader', false);
    UI.show('#resume-overlay', false); UI.show('#cursor', false); UI.show('#focus-help', false); UI.show('#inspect-info', false);
    G.engine.weather.enabled = true;
    G.engine.post.blur.value = 0; G.engine.post.lid.value = 0; G.engine.post.tintAmt.value = 0;
    G.cine.startTitle();
    G.audio.setAmbience({ rain: 0.8, rainMuffle: 7000, wind: 0.4, waves: 0.7, room: 0 }, 2);
    G.audio.setReverb('outdoor');
    G.music.setMood('title', { force: true });
    G.musicLock = false;
    UI.show('#btn-continue', G.hasSave());
    UI.show('#title-screen', true);
    UI.fade(0, first ? 3 : 1.5);
  };

  async function startGame(cont) {
    UI.show('#title-screen', false);
    I.requestLock();
    await UI.fade(1, 1.0);
    G.cine.stopExterior();
    G.engine.weather.enabled = true;
    if (cont) {
      const s = G.loadSave();
      G.state = s || G.newState();
      G.lights.flashOn = G.inv.has('flashlight');
    } else {
      newState();
      G.clearSave();
    }
    applyAll();
    G.player.forceCrouch = false; G.player.crouchToggle = false; G.player.crouch = 0; G.player.noclip = false;
    G.player.eyeOffset.set(0, 0, 0); G.player.control = true;
    G.focus.active = false; G.inspect.active = false;
    G.story.checkObjective(true);
    G.world.current = null;
    G.audio.setAmbience({ rain: 0, wind: 0, waves: 0, room: 0 }, 1);
    G.music.setMood('none', { force: true });
    if (!cont) {
      G.mode = 'intro';
      if (G.quick) G.cine.skipIntro = true; else await G.cine.intro();
      G.mode = 'cutscene';
      G.player.teleport(...CP.start.pos, CP.start.yaw, CP.start.pitch);
      UI.show('#hud', true);
      UI.objective(null);
      updateArea(true);
      G.engine.snapLook();
      G.mode = 'cutscene';
      G.player.control = false;
      if (G.quick) { G.player.teleport(...CP.start.pos, CP.start.yaw, CP.start.pitch); UI.fade(0, 0.3); } else await G.cine.wakeUp();
      G.mode = 'play';
      G.player.control = true;
      G.story.checkObjective(true);
      UI.objective(G.story.currentObjectiveText());
      UI.keysHelp(true);
      setTimeout(() => UI.keysHelp(false), 16000);
      G.save();
    } else {
      const c = CP[G.state.cp] || CP.start;
      G.player.teleport(c.pos[0], c.pos[1], c.pos[2], c.yaw, c.pitch);
      UI.show('#hud', true);
      updateArea(true);
      G.engine.snapLook();
      G.mode = 'play';
      G.player.control = true;
      await UI.fade(0, 1.2);
      UI.objective(G.story.currentObjectiveText());
    }
  }

  function pause() {
    if (G.mode !== 'play') return;
    G.mode = 'paused';
    if (G.focus.active) G.focus.exit();
    if (UI.readerOpen) { UI.readerOpenedAt = 0; UI.closeReader(); }
    if (G.inspect.active) { G.inspect.openedAt = 0; G.inspect.close(); }
    if (UI.invOpen) UI.closeInventory();
    UI.openPause();
    G.engine.post.blur.value = 1;
    G.audio.duck(0.5);
    I.exitLock();
  }
  function resume() {
    UI.closePause(); UI.closeSettings();
    G.engine.post.blur.value = 0;
    G.audio.duck(0);
    G.mode = 'play';
    I.requestLock();
  }

  function menuAction(scope, act) {
    if (scope === 'title') {
      if (act === 'new') startGame(false);
      if (act === 'continue') startGame(true);
      if (act === 'settings') UI.openSettings('title');
      if (act === 'credits') UI.show('#credits', true);
    } else if (scope === 'pause') {
      if (act === 'resume') resume();
      if (act === 'hint') { resume(); setTimeout(() => G.story.hint(), 250); }
      if (act === 'settings') UI.openSettings('pause');
      if (act === 'checkpoint') { resume(); UI.fadeNow(1); G.levels.forEach((l) => l.apply && l.apply()); G.respawn(); }
      if (act === 'quit') { G.save(); UI.closePause(); G.audio.duck(0); UI.fade(1, 0.8).then(() => { G.cine.stopExterior(); G.toTitle(); }); }
    } else if (scope === 'settings') {
      if (act === 'back') UI.closeSettings();
    } else if (scope === 'credits') {
      if (act === 'back') UI.show('#credits', false);
    }
  }

  // ------------------------------------------------------------------ input routing
  function inGameUI() { return UI.readerOpen || UI.invOpen || G.inspect.active || G.focus.active; }
  function bindInput() {
    G.on('key', (code, e) => {
      if (G.mode === 'intro' && (code === 'Space' || code === 'Enter' || code === 'Escape')) { G.cine.skipIntro = true; return; }
      if (G.mode === 'paused') { if (code === 'Escape' && I.fallback) resume(); return; }
      if (G.mode !== 'play') return;
      if (code === 'Escape') {
        if (UI.invOpen) { UI.closeInventory(); if (!I.fallback) showResume(); return; }
        if (I.fallback || !I.locked) { if (UI.readerOpen) { UI.readerOpenedAt = 0; UI.closeReader(); return; } if (G.inspect.active) { G.inspect.openedAt = 0; G.inspect.close(); return; } if (G.focus.active) { G.focus.exit(); return; } pause(); }
        return;
      }
      if (UI.invOpen) { if (code === 'Tab' || code === 'KeyI' || code === 'KeyM') { UI.closeInventory(); I.requestLock(); } return; }
      if (UI.readerOpen) { if (code === 'KeyE' || code === 'Space' || code === 'Enter') UI.closeReader(); return; }
      if (G.inspect.active) { if (code === 'KeyE' || code === 'Space') G.inspect.close(); return; }
      if (G.focus.active) {
        if (code === 'KeyS' || code === 'Backspace' || code === 'KeyQ' || code === 'ArrowDown') G.focus.exit();
        if (code === 'KeyE' || code === 'Space') { G.focus.click(0); setTimeout(() => G.focus.release(), 120); }
        return;
      }
      if (code === 'KeyE') G.interact.use();
      if (code === 'Tab' || code === 'KeyI') openInv('items');
      if (code === 'KeyM') { if (G.flag('has_map')) openInv('map'); else UI.think('I don\'t have a map. Tom said he\'d drawn me one&hellip;'); }
      if (code === 'KeyF') toggleFlash();
      if (code === 'KeyH') G.story.hint();
      if (code === 'KeyC') G.player.crouchToggle = !G.player.crouchToggle;
      if (code === 'KeyO' && G.debugMode) UI.peekObjective();
      if (G.debugMode && code === 'KeyN') G.player.noclip = !G.player.noclip;
    });
    G.on('mousedown', (button) => {
      if (G.mode !== 'play') return;
      if (!I.locked && !I.fallback) { I.requestLock(); UI.show('#resume-overlay', false); return; }
      if (UI.invOpen) return;
      if (UI.readerOpen) { UI.closeReader(); return; }
      if (G.inspect.active) { if (button === 0 && !I.fallback) G.inspect.close(); if (button === 2) G.inspect.close(); return; }
      if (G.focus.active) { G.focus.click(button); return; }
      if (button === 0 && !I.fallback) G.interact.use();
    });
    G.on('mouseup', (button) => {
      if (G.focus.active) G.focus.release();
      if (I.fallback && button === 0 && G.mode === 'play' && !inGameUI() && Math.hypot(I.mouseX - I.downX, I.mouseY - I.downY) < 5) G.interact.use();
      if (I.fallback && G.inspect.active && Math.hypot(I.mouseX - I.downX, I.mouseY - I.downY) < 5) G.inspect.close();
    });
    G.on('lockLost', () => {
      if (G.intentionalUnlock) { G.intentionalUnlock = false; return; }
      if (G.mode === 'play') pause();
    });
    G.on('lockFailed', () => { UI.show('#resume-overlay', G.mode === 'play' && !I.fallback); });
    G.$('#resume-overlay').addEventListener('click', () => { UI.show('#resume-overlay', false); I.requestLock(); });
    window.addEventListener('wheel', (e) => { if (UI.readerOpen) G.$('#paper').scrollTop += e.deltaY; }, { passive: true });
    G.on('escape', () => {});
    G.on('rideEnd', () => G.cine.ending());
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play' && !G.debugMode) pause(); });
  }
  function showResume() { if (G.mode === 'play' && !I.locked && !I.fallback) UI.show('#resume-overlay', true); }
  function openInv(tab) {
    G.intentionalUnlock = !!I.locked;
    I.exitLock();
    UI.openInventory(tab);
  }
  G.on('inventoryClosedByButton', () => I.requestLock());
  function toggleFlash() {
    if (!G.inv.has('flashlight')) {
      if (G.inv.has('flashlight_dead')) { G.audio.play('click', { freq: 1200 }); UI.think('Dead. It needs batteries.'); }
      return;
    }
    G.lights.flashOn = !G.lights.flashOn;
    G.audio.play('click', { freq: G.lights.flashOn ? 1500 : 1100, wet: 0.1 });
  }

  // ------------------------------------------------------------------ areas
  function updateArea(force) {
    const W = G.world;
    const p = G.player.pos;
    const a = W.areaAt(new THREE.Vector3(p.x, p.y + 1, p.z));
    if (!a || (a === W.current && !force)) return;
    W.current = a;
    G.engine.setLook(a.look || {});
    G.engine.applyEnvIntensity(a.look && a.look.env !== undefined ? a.look.env : 0.25);
    G.audio.setAmbience(a.amb || {});
    if (a.reverb) G.audio.setReverb(a.reverb);
    if (a.music && !G.musicLock && G.mode !== 'ending') {
      let mood = a.music;
      if (!G.flag('cell_open') && (a.name === 'cell' || a.name === 'block')) mood = 'explore';
      G.music.setMood(mood);
    }
    G.engine.sky.visible = !a.noSky;
    G.world.showAreas(a.show || [a.name]);
    G.engine.weather.rainTarget = a.rain ? 1 : 0;
    G.engine.weather.outdoor = !!a.outdoor;
    G.emit('area', a.name);
  }

  // ------------------------------------------------------------------ frame
  let last = performance.now(), lastRaf = 0;
  // debug/testing aid: keep simulating when the tab is hidden (rAF paused)
  setInterval(() => { if (G.debugMode && G.booted && performance.now() - lastRaf > 150) step(performance.now()); }, 33);
  function frame(now) {
    requestAnimationFrame(frame);
    lastRaf = performance.now();
    step(now);
  }
  function step(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    G.time += dt;
    const paused = G.mode === 'paused' || G.mode === 'loading';
    G.updateTweens(dt, paused);
    const E = G.engine;
    if (G.mode === 'play' || G.mode === 'cutscene' || G.mode === 'intro') gameUpdate(dt);
    else if (G.mode === 'title' || G.mode === 'ending') {
      E.updateWeatherOnly(dt, G.time);
      G.cine.update(dt, G.time);
    } else if (G.mode === 'paused') {
      E.post.time.value = G.time;
    }
    if (G.mode !== 'play' && !G.$('#resume-overlay').classList.contains('hidden')) UI.show('#resume-overlay', false);
    if (G.mode !== 'loading' || G.booted) E.render();
    I.endFrame();
  }

  // adaptive quality: if the first seconds of play run slowly, step the quality down once
  const perf = { t: 0, n: 0, sum: 0, done: false };
  function watchPerf(dt) {
    if (perf.done || document.hidden || G.debugMode) return;
    perf.t += dt;
    if (perf.t < 2) return;
    perf.sum += dt; perf.n++;
    if (perf.t > 7) {
      perf.done = true;
      const avg = perf.sum / perf.n;
      const q = G.settings.quality;
      if (avg > 0.026 && q !== 'low') {
        G.settings.quality = q === 'high' ? 'medium' : 'low';
        G.saveSettings();
        G.engine.applyQuality();
        UI.hint('Graphics quality lowered to <b>' + G.settings.quality + '</b> for smoother play. You can change it in Settings.', 'Performance');
      }
    }
  }

  function gameUpdate(dt) {
    const t = G.time, E = G.engine, P = G.player;
    if (G.mode === 'play') { G.state.stats.time += dt; watchPerf(dt); }
    if (!G.camOverride) {
      P.update(dt);
      if (G.levels.find((l) => l.name === 'cave').isRiding()) { P.control = false; P.forceCrouch = true; }
    } else I.consume();
    P.updateFlashlight(dt);
    updateArea(false);
    const canInteract = G.mode === 'play' && P.control && !inGameUI();
    if (canInteract) {
      const h = G.interact.update();
      UI.setPrompt(h ? (typeof h.prompt === 'function' ? h.prompt() : h.prompt) : null, I.fallback ? 'Click' : 'E');
    } else if (!G.focus.active) UI.setPrompt(null);
    G.focus.update(dt);
    G.inspect.update(dt);
    for (const l of G.levels) { try { l.update && l.update(dt, t); } catch (e) { console.error(l.name, e); } }
    if (G.levels.find((l) => l.name === 'cave').isRiding()) P.applyCamera(dt);
    E.update(dt, t);
    G.audio.updateListener(E.camera);
    G.audio.update(dt);
    if (G.mode === 'play' && !I.locked && !I.fallback && !inGameUI() && !UI.invOpen) showResume();
    else if (inGameUI()) UI.show('#resume-overlay', false);
    document.body.classList.toggle('ui-raised', G.inspect.active || G.focus.active);
  }

  // ------------------------------------------------------------------ debug helpers (console)
  G.debug = {
    tp(x, y, z, yaw = 0) { G.player.teleport(x, y, z, yaw, 0); },
    give(...ids) { ids.forEach((i) => G.inv.add(i, { silent: true })); },
    flag(n, v = true) { G.setFlag(n, v); },
    cp(id) { G.state.cp = id; G.respawn(); },
    noclip() { G.player.noclip = !G.player.noclip; },
    look(yaw, pitch = 0) { G.player.yaw = yaw; G.player.pitch = pitch; },
    apply() { applyAll(); },
    start(cont) { return startGame(cont); },
    use() { const h = G.interact.update(); if (h) { h.use(); return h.id; } return null; },
    hover() { const h = G.interact.update(); return h ? h.id : null; },
    find(id) { return G.interact.list.find((o) => o.id === id); },
    stage(name) {
      const order = ['yard', 'chapel', 'tunnel', 'cave'];
      const idx = order.indexOf(name);
      const F = {};
      ['read_letter1', 'took_spoon', 'took_cup', 'socket_open', 'cell_open', 'blackout_c', 'has_map', 'visited_guard', 'took_flashlight', 'radio_taken', 'has_flashlight', 'cabinet_open', 'gate_open', 'maint_open', 'took_can', 'took_cutters', 'gen_fueled', 'pump_on', 'gen_running', 'main_on', 'shutter_power', 'shutter_open', 'read_letter2', 'visited_maint', 'brk_5'].forEach((f) => (F[f] = true));
      F.brk_1 = false; F.brk_4 = false; F.brk_6 = false;
      if (idx >= 1) Object.assign(F, { chapel_open: true, chapel_inside: true, read_letter3: true });
      if (idx >= 2) Object.assign(F, { organ_solved: true, altar_open: true, read_letter4: true, read_hymnal: true });
      if (idx >= 3) Object.assign(F, { seadoor_open: true, read_diary: true });
      G.state = G.newState();
      G.state.flags = F;
      G.state.inv = ['flashlight', 'spoon', 'boltcutters'];
      G.state.cp = ['shutter_open', 'chapel_inside', 'altar_open', 'seadoor_open'][idx];
      G.lights.flashOn = false;
      applyAll();
      G.story.checkObjective(true);
      G.respawn();
      return G.state.cp;
    },
    aim(id) {
      const o = this.find(id); if (!o) return 'no such id';
      const c = o.box.getCenter(new THREE.Vector3());
      const e = G.player.eyePos();
      const d = c.sub(e);
      G.player.yaw = Math.atan2(-d.x, -d.z);
      G.player.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      G.player.applyCamera(0.016);
      return this.hover();
    },
    // stand at (x,z) and aim at interactable id
    at(id, x, z, y = 0) { G.player.teleport(x, y, z, 0, 0); return this.aim(id); },
    act(id, x, z, y) { if (x !== undefined) this.at(id, x, z, y); else this.aim(id); const h = G.interact.update(); if (!h || h.id !== id) return 'hover=' + (h && h.id); h.use(); return 'used ' + id; },
  };
})();
