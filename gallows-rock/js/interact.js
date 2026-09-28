// interact.js — look-at interaction, inventory, documents, focus mode (virtual cursor puzzles), inspect mode, icons
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U;

  // ------------------------------------------------------------------ interactables
  const IX = (G.interact = { list: [], hover: null });
  // o: {id, box:THREE.Box3 | mesh, pad, enabled(), prompt(), use(), range}
  IX.add = function (o) {
    if (!o.box && o.mesh) {
      o.mesh.updateWorldMatrix(true, true);
      o.box = new THREE.Box3().setFromObject(o.mesh).expandByScalar(o.pad ?? 0.03);
    } else if (Array.isArray(o.box)) {
      const [x, y, z, w, h, d] = o.box;
      o.box = new THREE.Box3(new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2));
    }
    o.range = o.range || 2.3;
    IX.list.push(o);
    if (o.glint) {
      const c = o.box.getCenter(new THREE.Vector3());
      o.glintSprite = G.engine.addGlint(c, () => IX.isEnabled(o));
    }
    return o;
  };
  IX.isEnabled = (o) => !o.removed && (!o.enabled || o.enabled());
  IX.remove = (o) => { o.removed = true; if (o.glintSprite) o.glintSprite.visible = false; };
  IX.refreshBox = (o) => { if (o.mesh) { o.mesh.updateWorldMatrix(true, true); o.box.setFromObject(o.mesh).expandByScalar(o.pad ?? 0.03); } };

  const _ray = new THREE.Ray(), _hit = new THREE.Vector3(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
  IX.update = function () {
    const cam = G.engine.camera;
    cam.getWorldPosition(_o);
    cam.getWorldDirection(_d);
    _ray.set(_o, _d);
    let best = null, bt = Infinity;
    for (const o of IX.list) {
      if (!IX.isEnabled(o)) continue;
      if (o.box.distanceToPoint(_o) > o.range) continue;
      const p = _ray.intersectBox(o.box, _hit);
      if (!p) continue;
      const t = p.distanceTo(_o);
      if (t < bt && t <= o.range) { bt = t; best = o; }
    }
    if (best && !best.noOcclude) {
      const wallT = G.world.rayColliders(_o, _d, bt, (c) => !c.noOcclude && !best.box.containsPoint(c.min) && !(best.ignore && best.ignore.includes(c)));
      if (wallT < bt - 0.08) best = null;
    }
    IX.hover = best;
    return best;
  };
  IX.use = function () {
    const h = IX.hover;
    if (!h) return false;
    try { h.use(); } catch (e) { console.error(e); }
    return true;
  };

  // ------------------------------------------------------------------ inventory
  const INV = (G.inv = {});
  INV.has = (id) => G.state.inv.includes(id);
  INV.add = function (id, opts = {}) {
    if (INV.has(id)) return;
    G.state.inv.push(id);
    if (!opts.silent) { G.audio.play('pickup', { bus: 'ui', wet: 0.1 }); G.ui.notify(id); }
    G.emit('inv', id);
  };
  INV.remove = function (id) {
    const i = G.state.inv.indexOf(id);
    if (i >= 0) G.state.inv.splice(i, 1);
    G.emit('inv', id);
  };
  INV.replace = function (a, b, silent = true) {
    const i = G.state.inv.indexOf(a);
    if (i >= 0) G.state.inv[i] = b; else G.state.inv.push(b);
    if (!silent) G.ui.notify(b);
    G.emit('inv', b);
  };

  // ------------------------------------------------------------------ documents
  const DOC = (G.docs = {});
  DOC.has = (id) => G.state.docs.includes(id);
  DOC.add = function (id, open = true) {
    const first = !DOC.has(id);
    if (first) { G.state.docs.push(id); G.ui.notify(id, true); }
    if (open) G.ui.read(id);
    G.emit('doc', id);
    return first;
  };

  // ------------------------------------------------------------------ pick-up helper: animate a world object into the camera
  IX.flyToCamera = function (obj, done) {
    const cam = G.engine.camera;
    const start = obj.position.clone();
    const startScale = obj.scale.clone();
    const worldStart = obj.getWorldPosition(new THREE.Vector3());
    if (obj.parent !== G.engine.scene) { G.engine.scene.attach(obj); }
    return G.tween(0.35, (k) => {
      const target = new THREE.Vector3(0, -0.2, -0.45).applyQuaternion(cam.quaternion).add(cam.position);
      obj.position.lerpVectors(worldStart, target, k);
      obj.scale.copy(startScale).multiplyScalar(1 - k * 0.7);
    }, { ease: U.easeIn }).then(() => { obj.visible = false; obj.parent && obj.parent.remove(obj); void start; if (done) done(); });
  };

  // ------------------------------------------------------------------ focus mode
  const F = (G.focus = { active: false, parts: [], cursor: { x: 0, y: 0 }, hoverPart: null });
  const cursorEl = () => document.getElementById('cursor');
  const raycaster = new THREE.Raycaster();
  raycaster.layers.enableAll();
  F.enter = async function (o) {
    if (F.active) return;
    F.active = true;
    F.opts = o;
    F.parts = o.parts || [];
    const cam = G.engine.camera;
    G.player.control = false;
    F.fromPos = cam.position.clone();
    F.fromQuat = cam.quaternion.clone();
    const toPos = o.pos.clone();
    const m = new THREE.Matrix4().lookAt(toPos, o.look, new THREE.Vector3(0, 1, 0));
    const toQuat = new THREE.Quaternion().setFromRotationMatrix(m);
    F.toPos = toPos; F.toQuat = toQuat;
    F.cursor.x = innerWidth / 2; F.cursor.y = innerHeight / 2 + 40;
    G.ui.setFocusUI(true, o.help);
    F.transit = true;
    await G.tween(0.65, (k) => { cam.position.lerpVectors(F.fromPos, toPos, k); cam.quaternion.slerpQuaternions(F.fromQuat, toQuat, k); }, { ease: U.easeInOut });
    F.transit = false;
    if (o.onEnter) o.onEnter();
  };
  F.exit = async function () {
    if (!F.active || F.transit) return;
    const o = F.opts;
    F.release();
    F.transit = true;
    G.ui.setFocusUI(false);
    const cam = G.engine.camera;
    const p0 = cam.position.clone(), q0 = cam.quaternion.clone();
    G.player.applyCamera(0.016);
    const p1 = cam.position.clone(), q1 = cam.quaternion.clone();
    await G.tween(0.5, (k) => { cam.position.lerpVectors(p0, p1, k); cam.quaternion.slerpQuaternions(q0, q1, k); }, { ease: U.easeInOut });
    F.active = false; F.transit = false; F.parts = [];
    G.player.control = true;
    if (o && o.onExit) o.onExit();
  };
  F.pick = function () {
    const cam = G.engine.camera;
    const nx = (F.cursor.x / innerWidth) * 2 - 1, ny = -(F.cursor.y / innerHeight) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), cam);
    let best = null, bd = Infinity, bestHit = null;
    for (const p of F.parts) {
      if (p.enabled && !p.enabled()) continue;
      const hits = raycaster.intersectObject(p.obj, true);
      if (hits.length && hits[0].distance < bd) { bd = hits[0].distance; best = p; bestHit = hits[0]; }
    }
    return best ? { part: best, hit: bestHit } : null;
  };
  F.update = function (dt) {
    if (!F.light) F.light = G.lights.add({ pos: [0, -100, 0], color: 0xfff1dc, intensity: 0, distance: 3 });
    const cam = G.engine.camera;
    F.light.pos.copy(cam.position).add(new THREE.Vector3(0, 0.45, 0));
    F.light.intensity = U.damp(F.light.intensity, F.active ? 0.22 : 0, 6, dt);
    if (F.active && F.transit) G.input.consume(); // discard mouse motion while the camera flies in
    if (!F.active || F.transit) return;
    const I = G.input;
    if (I.locked) {
      const [dx, dy] = I.consume();
      F.cursor.x = U.clamp(F.cursor.x + dx * G.settings.sensitivity, 0, innerWidth);
      F.cursor.y = U.clamp(F.cursor.y + dy * G.settings.sensitivity, 0, innerHeight);
    } else if (I.fallback) { I.consume(); F.cursor.x = I.mouseX; F.cursor.y = I.mouseY; }
    const el = cursorEl();
    el.style.transform = `translate(${F.cursor.x}px, ${F.cursor.y}px)`;
    const p = F.pick();
    const hp = p ? p.part : null;
    if (hp !== F.hoverPart) {
      if (F.hoverPart && F.hoverPart.onHover) F.hoverPart.onHover(false);
      F.hoverPart = hp;
      if (hp && hp.onHover) hp.onHover(true);
      if (hp) G.audio.play('uiHover', { bus: 'ui', vol: 0.3, wet: 0 });
    }
    el.classList.toggle('hover', !!hp);
    if (F.opts && F.opts.update) F.opts.update(dt, F);
    if (I.wheel && hp && hp.wheel) hp.wheel(I.wheel);
  };
  F.click = function (button) {
    if (!F.active || F.transit) return;
    if (button === 2) { F.exit(); return; }
    const p = F.pick();
    const el = cursorEl();
    el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 120);
    if (p && p.part.down) { p.part.down(p.hit); F.held = p.part; }
    if (p && p.part.click) p.part.click(p.hit);
  };
  F.release = function () { if (F.held) { const h = F.held; F.held = null; if (h.up) h.up(); } };

  // ------------------------------------------------------------------ inspect mode
  const IN = (G.inspect = { active: false });
  IN.init = function () {
    IN.scene = new THREE.Scene();
    IN.cam = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 10);
    IN.cam.position.set(0, 0, 0.6);
    const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.set(0.5, 0.8, 1);
    const fill = new THREE.DirectionalLight(0x9ab0d0, 0.8); fill.position.set(-1, 0.2, 0.5);
    const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(0, 0.5, -1);
    IN.scene.add(key, fill, rim, new THREE.AmbientLight(0x404048, 0.8));
    IN.scene.environment = G.engine.envMap;
    IN.holder = new THREE.Group();
    IN.scene.add(IN.holder);
    G.on('resize', (w, h) => { IN.cam.aspect = w / h; IN.cam.updateProjectionMatrix(); });
  };
  // o: {model, name, desc, onClose, onUpdate, rot:[x,y], dist}
  IN.open = function (o) {
    if (IN.active) return;
    IN.active = true;
    IN.opts = o;
    IN.holder.clear();
    const model = o.model;
    const bb = new THREE.Box3().setFromObject(model);
    const size = bb.getSize(new THREE.Vector3()).length();
    const c = bb.getCenter(new THREE.Vector3());
    model.position.sub(c);
    const wrap = new THREE.Group(); wrap.add(model);
    IN.holder.add(wrap);
    IN.wrap = wrap;
    IN.dist = o.dist || size * 1.9;
    IN.zoom = 1;
    IN.rx = o.rot ? o.rot[0] : 0.35; IN.ry = o.rot ? o.rot[1] : 0;
    IN.trx = IN.rx; IN.try = IN.ry;
    G.player.control = false;
    G.ui.setInspectUI(true, o.name, o.desc);
    G.audio.play('paper', { bus: 'ui', vol: 0.5, wet: 0 });
    IN.openedAt = performance.now();
  };
  IN.close = function () {
    if (!IN.active) return;
    if (performance.now() - IN.openedAt < 250) return;
    IN.active = false;
    G.ui.setInspectUI(false);
    G.player.control = true;
    const o = IN.opts; IN.opts = null;
    if (o && o.onClose) o.onClose();
  };
  IN.update = function (dt) {
    if (!IN.active) return;
    const I = G.input;
    const [dx, dy] = I.consume();
    if (I.locked || I.dragging) { IN.try += dx * 0.008; IN.trx += dy * 0.008; }
    IN.trx = U.clamp(IN.trx, -1.4, 1.4);
    if (I.wheel) IN.zoom = U.clamp(IN.zoom + I.wheel * 0.12, 0.5, 1.6);
    IN.rx = U.damp(IN.rx, IN.trx, 10, dt); IN.ry = U.damp(IN.ry, IN.try, 10, dt);
    IN.wrap.rotation.set(IN.rx, IN.ry, 0, 'YXZ');
    IN.cam.position.set(0, 0, IN.dist * IN.zoom);
    IN.cam.lookAt(0, 0, 0);
    if (IN.opts.onUpdate) IN.opts.onUpdate(IN);
  };
  IN.render = function (renderer) {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(IN.scene, IN.cam);
    renderer.autoClear = true;
  };

  // ------------------------------------------------------------------ icons (rendered once with an offscreen renderer)
  G.icons = {};
  G.makeIcons = function () {
    const size = 160;
    let r;
    try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
    r.setSize(size, size); r.setPixelRatio(1);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.2;
    const sc = new THREE.Scene();
    sc.environment = G.engine.envMap;
    const k = new THREE.DirectionalLight(0xfff0dd, 2.6); k.position.set(1, 2, 2);
    const f = new THREE.DirectionalLight(0x8899cc, 1); f.position.set(-2, 0.5, 1);
    sc.add(k, f, new THREE.AmbientLight(0x505058, 1.2));
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
    for (const id in G.ITEMS) {
      const def = G.ITEMS[id];
      const mk = G.P.model[def.model];
      if (!mk) continue;
      const m = mk(def.modelArg);
      m.rotation.set(def.iconRot ? def.iconRot[0] : 0.5, def.iconRot ? def.iconRot[1] : -0.6, def.iconRot ? def.iconRot[2] : 0);
      const holder = new THREE.Group(); holder.add(m); sc.add(holder);
      const bb = new THREE.Box3().setFromObject(holder);
      const c = bb.getCenter(new THREE.Vector3()), s = bb.getSize(new THREE.Vector3()).length();
      holder.position.sub(c);
      cam.position.set(0, 0, s * 1.75); cam.lookAt(0, 0, 0);
      r.setClearColor(0x000000, 0);
      r.render(sc, cam);
      G.icons[id] = r.domElement.toDataURL('image/png');
      sc.remove(holder);
    }
    r.dispose();
    r.forceContextLoss && r.forceContextLoss();
  };
})();
