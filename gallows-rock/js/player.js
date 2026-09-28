// player.js — input (pointer lock with drag fallback), first-person controller, collisions, footsteps, flashlight
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U;

  // ------------------------------------------------------------------ input
  const I = (G.input = { keys: {}, pressed: {}, dx: 0, dy: 0, locked: false, fallback: false, dragging: false, mouseX: innerWidth / 2, mouseY: innerHeight / 2, wheel: 0 });
  const blockDefault = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown']);
  window.addEventListener('keydown', (e) => {
    if (blockDefault.has(e.code) && G.mode !== 'title') e.preventDefault();
    if (e.repeat) return;
    I.keys[e.code] = true;
    I.pressed[e.code] = true;
    G.emit('key', e.code, e);
  });
  window.addEventListener('keyup', (e) => { I.keys[e.code] = false; });
  window.addEventListener('blur', () => { I.keys = {}; });
  window.addEventListener('mousemove', (e) => {
    I.mouseX = e.clientX; I.mouseY = e.clientY;
    if (I.locked) { I.dx += e.movementX || 0; I.dy += e.movementY || 0; }
    else if (I.fallback && I.dragging) { I.dx += e.movementX || 0; I.dy += e.movementY || 0; }
  });
  window.addEventListener('mousedown', (e) => {
    if (e.target && e.target.closest && e.target.closest('button, input, select, .slot, .doc-item, .inv-tabs')) return;
    if (I.fallback && e.button === 0) I.dragging = true;
    I.downX = e.clientX; I.downY = e.clientY;
    G.emit('mousedown', e.button, e);
  });
  window.addEventListener('mouseup', (e) => {
    I.dragging = false;
    G.emit('mouseup', e.button, e);
  });
  window.addEventListener('wheel', (e) => { I.wheel += Math.sign(e.deltaY); }, { passive: true });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    const was = I.locked;
    I.locked = document.pointerLockElement === G.engine.renderer.domElement;
    if (was && !I.locked) G.emit('lockLost');
    if (I.locked) G.emit('locked');
  });
  // A failed lock request is often transient (e.g. re-locking right after Esc). Only fall back to
  // drag-to-look after repeated failures, or when the API is missing (sandboxed frames).
  I.failures = 0;
  const lockFailed = () => {
    I.failures++;
    if (I.failures >= 3 || !('requestPointerLock' in Element.prototype)) I.fallback = true;
    G.emit('lockFailed');
  };
  document.addEventListener('pointerlockerror', lockFailed);
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) I.failures = 0; });
  I.requestLock = function () {
    if (I.fallback) return;
    const el = G.engine.renderer.domElement;
    if (!el.requestPointerLock) { I.fallback = true; return; }
    try {
      const p = el.requestPointerLock();
      if (p && p.catch) p.catch(lockFailed);
    } catch (e) { lockFailed(); }
  };
  I.exitLock = function () { if (document.pointerLockElement) document.exitPointerLock(); };
  I.consume = function () { const d = [I.dx, I.dy]; I.dx = 0; I.dy = 0; return d; };
  I.endFrame = function () { I.pressed = {}; I.wheel = 0; };
  I.active = () => I.locked || I.fallback;

  // ------------------------------------------------------------------ player
  const P = (G.player = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, roll: 0,
    radius: 0.27, crouch: 0, crouchHeld: false, crouchToggle: false, onGround: true,
    control: true, look: true, noclip: false, surface: 'concrete', stepDist: 0, bob: 0, bobAmp: 0, landDip: 0,
    speedMul: 1, eyeOffset: new THREE.Vector3(), moving: false,
  });
  const W = G.world;
  const STAND = 1.62, CROUCH = 0.95, HEIGHT = 1.75, CHEIGHT = 1.1;

  P.teleport = function (x, y, z, yaw, pitch = 0) {
    P.pos.set(x, y, z); P.vel.set(0, 0, 0); P.vy = 0;
    if (yaw !== undefined) P.yaw = yaw;
    P.pitch = pitch;
    P.applyCamera(0);
  };
  P.eyeHeight = () => U.lerp(STAND, CROUCH, P.crouch);
  P.eyePos = (v = new THREE.Vector3()) => v.set(P.pos.x, P.pos.y + P.eyeHeight(), P.pos.z);

  function collide(p, r, feetY, h) {
    const cols = W.colliders;
    for (let it = 0; it < 4; it++) {
      let moved = false;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        if (!c.enabled || c.noCollide) continue;
        if (c.max.y <= feetY + 0.32 || c.min.y >= feetY + h) continue;
        if (p.x + r < c.min.x || p.x - r > c.max.x || p.z + r < c.min.z || p.z - r > c.max.z) continue;
        if (c.obb) {
          const cs = Math.cos(c.ry), sn = Math.sin(c.ry);
          const dx = p.x - c.cx, dz = p.z - c.cz;
          const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
          const qx = U.clamp(lx, -c.hw, c.hw), qz = U.clamp(lz, -c.hd, c.hd);
          let ox = lx - qx, oz = lz - qz;
          let d = Math.hypot(ox, oz);
          let px = 0, pz = 0;
          if (d < 1e-6) {
            const ex = c.hw - Math.abs(lx), ez = c.hd - Math.abs(lz);
            if (ex < ez) { px = Math.sign(lx) * (ex + r); } else { pz = Math.sign(lz) * (ez + r); }
          } else if (d < r) { px = (ox / d) * (r - d); pz = (oz / d) * (r - d); } else continue;
          p.x += px * cs + pz * sn; p.z += -px * sn + pz * cs; moved = true;
          continue;
        }
        const qx = U.clamp(p.x, c.min.x, c.max.x), qz = U.clamp(p.z, c.min.z, c.max.z);
        const ox = p.x - qx, oz = p.z - qz;
        const d = Math.hypot(ox, oz);
        if (d < 1e-6) {
          const e1 = p.x - c.min.x, e2 = c.max.x - p.x, e3 = p.z - c.min.z, e4 = c.max.z - p.z;
          const m = Math.min(e1, e2, e3, e4);
          if (m === e1) p.x = c.min.x - r; else if (m === e2) p.x = c.max.x + r; else if (m === e3) p.z = c.min.z - r; else p.z = c.max.z + r;
          moved = true;
        } else if (d < r) { p.x += (ox / d) * (r - d); p.z += (oz / d) * (r - d); moved = true; }
      }
      if (!moved) break;
    }
  }
  P.collide = collide;
  function headBlocked(p, feetY) {
    for (const c of W.colliders) {
      if (!c.enabled) continue;
      if (c.min.y > feetY + HEIGHT || c.max.y < feetY + CHEIGHT) continue;
      if (p.x + P.radius < c.min.x || p.x - P.radius > c.max.x || p.z + P.radius < c.min.z || p.z - P.radius > c.max.z) continue;
      return true;
    }
    return false;
  }

  const _wish = new THREE.Vector3(), _np = new THREE.Vector3();
  P.update = function (dt) {
    const s = G.settings;
    // close-up puzzles and the inspect view read the mouse themselves — leave the deltas for them
    if (P.look && I.active() && !G.focus.active && !G.inspect.active) {
      const [dx, dy] = I.consume();
      const k = 0.0021 * s.sensitivity;
      P.yaw -= dx * k;
      P.pitch -= dy * k * (s.invertY ? -1 : 1);
      P.pitch = U.clamp(P.pitch, -1.45, 1.45);
    }
    // crouch
    const wantCrouch = P.control && (I.keys.ControlLeft || I.keys.ControlRight || P.crouchToggle || P.forceCrouch);
    if (wantCrouch) P.crouch = Math.min(1, P.crouch + dt * 5);
    else if (!headBlocked(P.pos, P.pos.y)) P.crouch = Math.max(0, P.crouch - dt * 4);

    // movement
    _wish.set(0, 0, 0);
    if (P.control) {
      if (I.keys.KeyW || I.keys.ArrowUp) _wish.z -= 1;
      if (I.keys.KeyS || I.keys.ArrowDown) _wish.z += 1;
      if (I.keys.KeyA || I.keys.ArrowLeft) _wish.x -= 1;
      if (I.keys.KeyD || I.keys.ArrowRight) _wish.x += 1;
    }
    const running = (I.keys.ShiftLeft || I.keys.ShiftRight) && P.crouch < 0.3 && _wish.z < 0;
    let speed = P.crouch > 0.5 ? 1.35 : running ? 4.3 : 2.35;
    speed *= P.speedMul;
    if (_wish.lengthSq() > 0) _wish.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), P.yaw).multiplyScalar(speed);
    const accel = _wish.lengthSq() > 0 ? 11 : 9;
    P.vel.x = U.damp(P.vel.x, _wish.x, accel, dt);
    P.vel.z = U.damp(P.vel.z, _wish.z, accel, dt);

    if (P.noclip) {
      const f = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(P.pitch, P.yaw, 0, 'YXZ'));
      const sp = running ? 14 : 5;
      if (I.keys.KeyW) P.pos.addScaledVector(f, sp * dt);
      if (I.keys.KeyS) P.pos.addScaledVector(f, -sp * dt);
      const r = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), P.yaw);
      if (I.keys.KeyD) P.pos.addScaledVector(r, sp * dt);
      if (I.keys.KeyA) P.pos.addScaledVector(r, -sp * dt);
      if (I.keys.Space) P.pos.y += sp * dt;
      P.applyCamera(dt);
      return;
    }

    // integrate horizontally with substeps
    const h = U.lerp(HEIGHT, CHEIGHT, P.crouch);
    const total = Math.hypot(P.vel.x, P.vel.z) * dt;
    const steps = Math.max(1, Math.ceil(total / 0.12));
    const before = P.pos.clone();
    for (let k = 0; k < steps; k++) {
      _np.set(P.pos.x + (P.vel.x * dt) / steps, 0, P.pos.z + (P.vel.z * dt) / steps);
      collide(_np, P.radius, P.pos.y, h);
      const g = W.groundAt(_np.x, _np.z, P.pos.y);
      if (g.y === -Infinity || P.pos.y - g.y > 1.2) {
        // no floor there (edge of the world / drop) -> slide along axis
        const gx = W.groundAt(_np.x, P.pos.z, P.pos.y), gz = W.groundAt(P.pos.x, _np.z, P.pos.y);
        if (gx.y > -Infinity && P.pos.y - gx.y <= 1.2) _np.z = P.pos.z; else if (gz.y > -Infinity && P.pos.y - gz.y <= 1.2) _np.x = P.pos.x; else { _np.x = P.pos.x; _np.z = P.pos.z; }
      }
      P.pos.x = _np.x; P.pos.z = _np.z;
    }
    // vertical
    const g = W.groundAt(P.pos.x, P.pos.z, P.pos.y);
    if (g.y > -Infinity) {
      P.surface = g.surface;
      if (P.pos.y > g.y + 0.02) {
        P.vy -= 18 * dt;
        P.pos.y += P.vy * dt;
        if (P.pos.y <= g.y) { if (P.vy < -3) { P.landDip = Math.min(0.15, -P.vy * 0.02); step(1.2); } P.pos.y = g.y; P.vy = 0; }
        P.onGround = P.pos.y <= g.y + 0.02;
      } else {
        P.pos.y = U.damp(P.pos.y, g.y, 20, dt);
        if (Math.abs(P.pos.y - g.y) < 0.002) P.pos.y = g.y;
        P.vy = 0; P.onGround = true;
      }
    }
    // footsteps & bob
    const moved = Math.hypot(P.pos.x - before.x, P.pos.z - before.z);
    P.moving = moved > 0.001;
    if (P.onGround && moved > 0.0005) {
      const stride = running ? 0.95 : P.crouch > 0.5 ? 0.6 : 0.72;
      P.stepDist += moved;
      P.bob += (moved / stride) * Math.PI;
      if (P.stepDist >= stride) { P.stepDist -= stride; step(running ? 1.1 : P.crouch > 0.5 ? 0.45 : 0.8); }
    }
    const targetAmp = P.moving ? (running ? 1.6 : P.crouch > 0.5 ? 0.6 : 1) : 0;
    P.bobAmp = U.damp(P.bobAmp, targetAmp, 8, dt);
    if (!G.focus.active) P.applyCamera(dt);
  };

  function step(v) {
    G.audio.play('step', { surface: P.surface, intensity: v, vol: 0.45, wet: 0.35 });
    G.emit('footstep', P.surface, v);
  }

  const _ang = new THREE.Euler(0, 0, 0, 'YXZ');
  P.applyCamera = function (dt) {
    const cam = G.engine.camera;
    const s = G.settings;
    const amp = s.headBob ? P.bobAmp : P.bobAmp * 0.2;
    P.landDip = U.damp(P.landDip, 0, 10, dt || 0.016);
    const by = Math.abs(Math.sin(P.bob)) * 0.045 * amp - 0.02 * amp;
    const bx = Math.cos(P.bob) * 0.022 * amp;
    const t = G.time || 0;
    const breathe = Math.sin(t * 1.4) * 0.006;
    cam.position.set(P.pos.x, P.pos.y + P.eyeHeight() + by + breathe - P.landDip, P.pos.z);
    const right = new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
    cam.position.addScaledVector(right, bx);
    cam.position.add(P.eyeOffset);
    // strafe roll
    const side = P.vel.x * Math.cos(P.yaw) - P.vel.z * Math.sin(P.yaw);
    P.roll = U.damp(P.roll, -side * 0.006, 6, dt || 0.016);
    _ang.set(P.pitch, P.yaw, P.roll + Math.sin(P.bob * 0.5) * 0.004 * amp, 'YXZ');
    cam.quaternion.setFromEuler(_ang);
  };

  // flashlight follows the camera with a little lag
  const _fd = new THREE.Vector3(0, 0, -1), _tmp = new THREE.Vector3();
  P.updateFlashlight = function (dt) {
    const L = G.lights, cam = G.engine.camera;
    const want = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    _fd.lerp(want, 1 - Math.exp(-dt * 14)).normalize();
    const off = new THREE.Vector3(0.16, -0.18, -0.05).applyQuaternion(cam.quaternion);
    L.flash.position.copy(cam.position).add(off);
    L.flash.target.position.copy(L.flash.position).addScaledVector(_fd, 5);
    L.flash.target.updateMatrixWorld();
    void _tmp;
  };
})();
