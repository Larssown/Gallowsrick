// props.js — reusable prop builders (static set dressing + dynamic objects) and item models
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U, B = G.B;
  const P = (G.P = {});
  const M = () => G.M;

  // ------------------------------------------------------------------ bars
  // Static bars along a wall line: axis 'x' => along X at z=pos
  P.bars = function (axis, pos, a0, a1, y0, y1, o = {}) {
    const sp = o.spacing || 0.13, r = o.r || 0.018, mat = o.mat || M().bars;
    const n = Math.max(1, Math.round((a1 - a0) / sp));
    const geo = new THREE.CylinderGeometry(r, r, y1 - y0, 8);
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      B.add(geo, mat, { pos: axis === 'x' ? [a, (y0 + y1) / 2, pos] : [pos, (y0 + y1) / 2, a], uv: 'native', uvScale: [1, y1 - y0] });
    }
    const straps = o.straps || [y0 + 0.08, (y0 + y1) / 2 + 0.2, y1 - 0.06];
    for (const y of straps) {
      if (axis === 'x') B.box({ x: (a0 + a1) / 2, y, z: pos, w: a1 - a0, h: 0.05, d: 0.05, mat });
      else B.box({ x: pos, y, z: (a0 + a1) / 2, w: 0.05, h: 0.05, d: a1 - a0, mat });
    }
    if (o.col !== false) {
      if (axis === 'x') B.collider(a0, y0, pos - 0.05, a1, y1, pos + 0.05, 'bars');
      else B.collider(pos - 0.05, y0, a0, pos + 0.05, y1, a1, 'bars');
    }
  };
  // Dynamic barred door leaf in a group (local X = width, origin bottom-left)
  P.barLeaf = function (w, h, o = {}) {
    const g = new THREE.Group();
    const mat = o.mat || M().bars, sp = 0.13, r = 0.018;
    const n = Math.max(1, Math.round(w / sp));
    const geo = new THREE.CylinderGeometry(r, r, h, 8);
    for (let i = 0; i <= n; i++) B.add(geo, mat, { parent: g, pos: [(w * i) / n, h / 2, 0] });
    [0.08, h / 2 + 0.2, h - 0.05].forEach((y) => B.box({ parent: g, x: w / 2, y, z: 0, w: w + 0.04, h: 0.06, d: 0.06, mat }));
    B.box({ parent: g, x: 0, y: h / 2, z: 0, w: 0.06, h, d: 0.06, mat });
    B.box({ parent: g, x: w, y: h / 2, z: 0, w: 0.06, h, d: 0.06, mat });
    if (o.lock) {
      B.box({ parent: g, x: o.lockX ?? w - 0.12, y: 1.05, z: 0, w: 0.2, h: 0.28, d: 0.12, mat: M().metalDark });
      B.cyl({ parent: g, x: o.lockX ?? w - 0.12, y: 1.1, z: 0.065, r: 0.02, h: 0.02, rx: Math.PI / 2, mat: M().brass });
    }
    return B.bakeGroup(g);
  };

  // ------------------------------------------------------------------ lights
  function bulbMat(color, int = 3) {
    return new THREE.MeshStandardMaterial({ color: 0x222222, emissive: new THREE.Color(color), emissiveIntensity: int, roughness: 0.4 });
  }
  P.bulbMat = bulbMat;
  // caged ceiling lamp hanging at (x, y=ceiling, z)
  P.cageLamp = function (x, y, z, o = {}) {
    const mat = M().metalDark;
    const drop = o.drop ?? 0.25;
    B.cyl({ x, y: y - 0.02, z, r: 0.09, h: 0.04, mat });
    if (drop > 0.05) B.cyl({ x, y: y - drop / 2, z, r: 0.01, h: drop, mat });
    const by = y - drop - 0.08;
    const bm = bulbMat(o.color ?? 0xffc98a, o.emissive ?? 4);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), bm);
    bulb.position.set(x, by, z);
    G.engine.scene.add(bulb);
    const ring = new THREE.TorusGeometry(0.1, 0.006, 4, 16);
    B.add(ring, mat, { pos: [x, by + 0.07, z], rot: [Math.PI / 2, 0, 0], uv: 'native' });
    B.add(ring, mat, { pos: [x, by - 0.07, z], rot: [Math.PI / 2, 0, 0], uv: 'native' });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      B.cyl({ x: x + Math.cos(a) * 0.1, y: by, z: z + Math.sin(a) * 0.1, r: 0.005, h: 0.16, mat, seg: 4 });
    }
    const v = G.lights.add({ pos: [x, by - 0.1, z], color: o.color ?? 0xffc98a, intensity: o.intensity ?? 6, distance: o.distance ?? 9, flicker: o.flicker, area: o.area || B.curArea, mesh: bulb, emissive: o.emissive ?? 4, on: o.on });
    return v;
  };
  // wall-mounted red emergency light; ry = direction the lamp faces
  P.emergency = function (x, y, z, ry, o = {}) {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = ry;
    G.engine.scene.add(g);
    B.box({ parent: g, x: 0, y: 0, z: 0.05, w: 0.28, h: 0.14, d: 0.1, mat: M().metalGray });
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.03), bulbMat(o.color ?? 0xff2a18, 5));
    lens.position.set(0, 0, 0.11); g.add(lens);
    const wp = new THREE.Vector3(0, -0.1, 0.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry).add(g.position);
    return G.lights.add({ pos: wp, color: o.color ?? 0xff2a18, intensity: o.intensity ?? 4, distance: o.distance ?? 9, area: o.area || B.curArea, mesh: lens, emissive: 5, on: o.on ?? false, flicker: o.flicker });
  };
  // fluorescent tube fixture along axis
  P.tubeLamp = function (x, y, z, len, axis, o = {}) {
    const w = axis === 'x' ? len : 0.22, d = axis === 'x' ? 0.22 : len;
    B.box({ x, y: y - 0.04, z, w, h: 0.08, d, mat: M().metalGray });
    const tm = bulbMat(o.color ?? 0xdfeeff, o.emissive ?? 3);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len - 0.1, 8), tm);
    tube.position.set(x, y - 0.1, z);
    tube.rotation.set(axis === 'x' ? 0 : Math.PI / 2, 0, axis === 'x' ? Math.PI / 2 : 0);
    G.engine.scene.add(tube);
    return G.lights.add({ pos: [x, y - 0.3, z], color: o.color ?? 0xdfeeff, intensity: o.intensity ?? 8, distance: o.distance ?? 11, flicker: o.flicker, area: o.area || B.curArea, mesh: tube, emissive: o.emissive ?? 3, on: o.on });
  };

  // ------------------------------------------------------------------ pipes
  P.pipe = function (pts, r, mat, o = {}) {
    mat = mat || M().rust;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
      const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
      const g = new THREE.CylinderGeometry(r, r, len, 12);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      const e = new THREE.Euler().setFromQuaternion(q);
      B.add(g, mat, { pos: [mid.x, mid.y, mid.z], rot: [e.x, e.y, e.z], uv: 'native', uvScale: [1, len] });
      if (i > 0) B.add(new THREE.SphereGeometry(r * 1.15, 12, 8), mat, { pos: pts[i], uv: 'native' });
      if (o.flanges) {
        const fg = new THREE.CylinderGeometry(r * 1.5, r * 1.5, 0.04, 12);
        B.add(fg, mat, { pos: [a.x + (b.x - a.x) * 0.02, a.y + (b.y - a.y) * 0.02, a.z + (b.z - a.z) * 0.02], rot: [e.x, e.y, e.z], uv: 'native' });
      }
    }
  };

  // ------------------------------------------------------------------ furniture
  P.crate = function (x, z, s = 0.8, ry = 0, y0 = 0, o = {}) {
    const mat = o.mat || M().woodOld;
    B.box({ x, y: y0 + s / 2, z, w: s, h: s, d: s, ry, mat });
    const t = 0.04, e = s / 2 + 0.005;
    const straps = [[0, s * 0.5 - 0.06], [0, -s * 0.5 + 0.06]];
    for (const [, dy] of straps) {
      B.box({ x, y: y0 + s / 2 + dy, z, w: s + 0.02, h: 0.1, d: s + 0.02, ry, mat: M().woodDark });
    }
    if (o.col !== false) B.colBox(x, y0, z, s, s, s, ry);
    void t; void e;
  };
  P.barrel = function (x, z, o = {}) {
    const r = o.r || 0.3, h = o.h || 0.9, y0 = o.y || 0;
    B.cyl({ x, base: y0, z, r, h, mat: o.mat || M().rust, seg: 20, uvScale: [2, 1] });
    [0.12, h / 2, h - 0.12].forEach((dy) => B.cyl({ x, y: y0 + dy, z, r: r + 0.01, h: 0.035, mat: M().metalDark, seg: 20 }));
    B.cyl({ x, y: y0 + h + 0.005, z, r: r * 0.96, h: 0.01, mat: M().metalDark, seg: 20 });
    if (o.col !== false) B.colBox(x, y0, z, r * 2, h, r * 2);
  };
  P.bench = function (x, z, ry, len = 2, o = {}) {
    const mat = o.mat || M().wood;
    const c = Math.cos(ry), s = Math.sin(ry);
    B.box({ x, y: 0.45, z, w: len, h: 0.05, d: 0.4, ry, mat });
    [-1, 1].forEach((k) => {
      const lx = x + c * k * (len / 2 - 0.15), lz = z - s * k * (len / 2 - 0.15);
      B.box({ x: lx, y: 0.21, z: lz, w: 0.06, h: 0.42, d: 0.36, ry, mat: M().metalDark });
    });
    if (o.col !== false) B.colBox(x, 0, z, len, 0.48, 0.4, ry);
  };
  P.table = function (x, z, w, d, ry = 0, o = {}) {
    const h = o.h || 0.76, mat = o.mat || M().wood;
    B.box({ x, y: h - 0.02, z, w, h: 0.04, d, ry, mat });
    const c = Math.cos(ry), s = Math.sin(ry);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const lx = a * (w / 2 - 0.05), lz = b * (d / 2 - 0.05);
      B.box({ x: x + lx * c + lz * s, y: (h - 0.04) / 2, z: z - lx * s + lz * c, w: 0.05, h: h - 0.04, d: 0.05, mat: o.legMat || M().metalDark });
    }
    if (o.col !== false) B.colBox(x, 0, z, w, h, d, ry);
  };
  P.chair = function (x, z, ry = 0, o = {}) {
    const mat = o.mat || M().woodDark;
    const c = Math.cos(ry), s = Math.sin(ry);
    const off = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    B.box({ x, y: 0.45, z, w: 0.42, h: 0.04, d: 0.42, ry, mat });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [px, pz] = off(a * 0.18, b * 0.18); B.box({ x: px, y: 0.22, z: pz, w: 0.035, h: 0.44, d: 0.035, mat: M().metalDark }); }
    const [bx, bz] = off(0, 0.19);
    B.box({ x: bx, y: 0.72, z: bz, w: 0.42, h: 0.3, d: 0.03, ry, mat });
    if (o.col !== false) B.colBox(x, 0, z, 0.45, 0.9, 0.45, ry);
  };
  P.shelf = function (x, z, ry, w, h, d, o = {}) {
    const mat = o.mat || M().metalGray;
    const c = Math.cos(ry), s = Math.sin(ry);
    const levels = o.levels || 4;
    for (let k = 0; k < levels; k++) B.box({ x, y: 0.1 + (k * (h - 0.15)) / (levels - 1), z, w, h: 0.03, d, ry, mat });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const lx = a * (w / 2 - 0.02), lz = b * (d / 2 - 0.02);
      B.box({ x: x + lx * c + lz * s, y: h / 2, z: z - lx * s + lz * c, w: 0.04, h, d: 0.04, mat });
    }
    if (o.col !== false) B.colBox(x, 0, z, w, h, d, ry);
    // clutter
    if (o.clutter !== false) {
      const r = U.rng(Math.floor(x * 13 + z * 7));
      for (let k = 0; k < levels - 1; k++) {
        let px = -w / 2 + 0.1;
        while (px < w / 2 - 0.2) {
          const bw = 0.15 + r() * 0.3, bh = 0.1 + r() * 0.25, bd = d * (0.5 + r() * 0.4);
          if (r() < 0.75) {
            const ly = 0.115 + (k * (h - 0.15)) / (levels - 1) + bh / 2;
            const lx = px + bw / 2, lz = (r() - 0.5) * 0.05;
            const kind = r();
            const pm = kind < 0.5 ? P.cardboard() : kind < 0.75 ? M().metalRed : M().metalGray;
            if (kind > 0.5 && kind < 0.9) B.cyl({ x: x + lx * c + lz * s, y: ly, z: z - lx * s + lz * c, r: Math.min(bw, bd) / 2.4, h: bh, mat: pm });
            else B.box({ x: x + lx * c + lz * s, y: ly, z: z - lx * s + lz * c, w: bw, h: bh, d: bd, ry, mat: pm });
          }
          px += bw + 0.03;
        }
      }
    }
  };
  let cardboardMat = null;
  P.cardboard = () => cardboardMat || (cardboardMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.95, map: G.tex.sets.paper.map }));
  P.cart = function (x, z, ry = 0) {
    const c = Math.cos(ry), s = Math.sin(ry);
    B.box({ x, y: 0.62, z, w: 1.1, h: 0.7, d: 0.7, ry, mat: P.cartMat || (P.cartMat = M().cloth.clone(), P.cartMat.color.setHex(0x6c727a), P.cartMat) });
    B.box({ x, y: 0.26, z, w: 1.12, h: 0.04, d: 0.72, ry, mat: M().metalGray });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const lx = a * 0.52, lz = b * 0.32;
      const px = x + lx * c + lz * s, pz = z - lx * s + lz * c;
      B.box({ x: px, y: 0.55, z: pz, w: 0.03, h: 0.62, d: 0.03, mat: M().metalGray });
      B.cyl({ x: px, y: 0.07, z: pz, r: 0.06, h: 0.04, rz: Math.PI / 2, ry, mat: M().rubber });
    }
    B.colBox(x, 0, z, 1.15, 1, 0.75, ry);
  };
  P.bucket = function (x, z, o = {}) {
    B.cyl({ x, base: o.y || 0, z, rt: 0.16, rb: 0.13, h: 0.3, mat: o.mat || M().metalGray, open: true });
    B.cyl({ x, y: (o.y || 0) + 0.005, z, r: 0.13, h: 0.01, mat: M().metalGray });
    if (o.water) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), new THREE.MeshStandardMaterial({ color: 0x1a2020, roughness: 0.05, metalness: 0.3 }));
      w.rotation.x = -Math.PI / 2; w.position.set(x, (o.y || 0) + 0.22, z); G.engine.scene.add(w);
    }
  };
  P.fireExt = function (x, y, z, ry) {
    B.cyl({ x, y: y + 0.28, z, r: 0.08, h: 0.56, mat: M().metalRed });
    B.sphere({ x, y: y + 0.56, z, r: 0.08, mat: M().metalRed, scale: [1, 0.6, 1] });
    B.cyl({ x, y: y + 0.63, z, r: 0.025, h: 0.08, mat: M().black });
  };
  P.clock = function (x, y, z, ry, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; G.engine.scene.add(g);
    const face = G.tex.canvasTex(128, 128, (ctx) => {
      ctx.fillStyle = '#ece6d6'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; ctx.fillRect(64 + Math.cos(a) * 50 - 2, 64 + Math.sin(a) * 50 - 5, 4, 10); }
    });
    B.cyl({ parent: g, x: 0, y: 0, z: 0, r: 0.17, h: 0.04, rx: Math.PI / 2, mat: M().black });
    const fm = new THREE.Mesh(new THREE.CircleGeometry(0.155, 24), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }));
    fm.position.z = 0.021; g.add(fm);
    const hand = (len, w, a) => { const h = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.004), M().black); h.geometry.translate(0, len / 2, 0); h.position.z = 0.026; h.rotation.z = -a; g.add(h); return h; };
    const hh = o.h ?? 11, mm = o.m ?? 47;
    hand(0.08, 0.012, ((hh % 12) + mm / 60) / 12 * Math.PI * 2);
    hand(0.12, 0.008, (mm / 60) * Math.PI * 2);
    return g;
  };

  // ------------------------------------------------------------------ swinging door
  // o: {x, z, axis:'x'|'z' (wall runs along), w, h, hinge: -1|1 (which end), open: sign of swing, mat, window, sign}
  P.door = function (o) {
    const w = o.w || 1, h = o.h || 2.1, t = 0.06;
    const pivot = new THREE.Group();
    const hingeOff = (o.hinge || -1) * (w / 2);
    if (o.axis === 'x') pivot.position.set(o.x + hingeOff, 0, o.z);
    else pivot.position.set(o.x, 0, o.z + hingeOff);
    pivot.rotation.y = o.axis === 'x' ? 0 : -Math.PI / 2;
    const flip = (o.hinge || -1) > 0 ? -1 : 1;
    G.engine.scene.add(pivot);
    const leaf = new THREE.Group();
    pivot.add(leaf);
    const mat = o.mat || M().metalGreen;
    B.box({ parent: leaf, x: flip * w / 2, y: h / 2, z: 0, w: w - 0.02, h: h - 0.01, d: t, mat });
    if (o.window) {
      B.box({ parent: leaf, x: flip * w / 2, y: 1.55, z: 0, w: 0.28, h: 0.36, d: t + 0.01, mat: M().glassDirty });
    }
    B.cyl({ parent: leaf, x: flip * (w - 0.1), y: 1.02, z: 0.06, r: 0.02, h: 0.12, rx: Math.PI / 2, mat: M().steel });
    B.cyl({ parent: leaf, x: flip * (w - 0.1), y: 1.02, z: -0.06, r: 0.02, h: 0.12, rx: Math.PI / 2, mat: M().steel });
    if (o.sign) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), new THREE.MeshStandardMaterial({ map: G.tex.sign(o.sign, { w: 512, h: 184, bg: '#d9d0b8', fg: '#1b1b1b', size: o.signSize || 58 }), roughness: 0.7 }));
      d.position.set(flip * w / 2, 1.62, t / 2 + 0.005);
      leaf.add(d);
    }
    // frame
    const fm = M().metalDark;
    if (o.axis === 'x') {
      B.box({ x: o.x - w / 2 - 0.04, y: h / 2, z: o.z, w: 0.08, h, d: 0.28, mat: fm });
      B.box({ x: o.x + w / 2 + 0.04, y: h / 2, z: o.z, w: 0.08, h, d: 0.28, mat: fm });
      B.box({ x: o.x, y: h + 0.04, z: o.z, w: w + 0.16, h: 0.08, d: 0.28, mat: fm });
    } else {
      B.box({ x: o.x, y: h / 2, z: o.z - w / 2 - 0.04, w: 0.28, h, d: 0.08, mat: fm });
      B.box({ x: o.x, y: h / 2, z: o.z + w / 2 + 0.04, w: 0.28, h, d: 0.08, mat: fm });
      B.box({ x: o.x, y: h + 0.04, z: o.z, w: 0.28, h: 0.08, d: w + 0.16, mat: fm });
    }
    B.bakeGroup(leaf);
    const col = o.axis === 'x' ? B.collider(o.x - w / 2, 0, o.z - 0.06, o.x + w / 2, h, o.z + 0.06, 'door') : B.collider(o.x - 0.06, 0, o.z - w / 2, o.x + 0.06, h, o.z + w / 2, 'door');
    const door = {
      pivot, leaf, collider: col, amount: 0, locked: !!o.locked,
      openAngle: (o.open || 1) * 1.75 * flip * -1,
      set(a) { this.amount = a; leaf.rotation.y = this.openAngle * a; col.enabled = a < 0.05; },
      open(dur = 1.2) {
        col.enabled = false;
        const a0 = this.amount;
        return G.tween(dur, (k) => this.set(a0 + (1 - a0) * k), { ease: U.easeOut });
      },
      close(dur = 0.8) { const a0 = this.amount; return G.tween(dur, (k) => this.set(a0 * (1 - k)), { ease: U.easeIn }); },
    };
    return door;
  };

  // window: frame + dirty glass + bars in an existing wall hole. axis like wall.
  P.window = function (axis, pos, a, y, w, h, o = {}) {
    const fm = o.frameMat || M().metalDark;
    const t = o.thick ?? 0.3;
    if (axis === 'x') {
      B.box({ x: a, y: y - h / 2 - 0.03, z: pos, w: w + 0.1, h: 0.06, d: t + 0.04, mat: fm });
      B.box({ x: a, y: y + h / 2 + 0.03, z: pos, w: w + 0.1, h: 0.06, d: t + 0.04, mat: fm });
      if (o.glass !== false) B.box({ x: a, y, z: pos + (o.glassOff || 0), w, h, d: 0.02, mat: o.glassMat || M().glassDirty });
      if (o.bars !== false) P.bars('x', pos - (o.glassOff || 0) * 2, a - w / 2, a + w / 2, y - h / 2, y + h / 2, { spacing: 0.15, straps: [y], col: false });
    } else {
      B.box({ x: pos, y: y - h / 2 - 0.03, z: a, w: t + 0.04, h: 0.06, d: w + 0.1, mat: fm });
      B.box({ x: pos, y: y + h / 2 + 0.03, z: a, w: t + 0.04, h: 0.06, d: w + 0.1, mat: fm });
      if (o.glass !== false) B.box({ x: pos + (o.glassOff || 0), y, z: a, w: 0.02, h, d: w, mat: o.glassMat || M().glassDirty });
      if (o.bars !== false) P.bars('z', pos - (o.glassOff || 0) * 2, a - w / 2, a + w / 2, y - h / 2, y + h / 2, { spacing: 0.15, straps: [y], col: false });
    }
  };

  // Moonlight shaft: a tapered box from a window to the floor (additive), dir = normalized light travel direction
  P.shaft = function (x, y, z, w, h, dir, len, color = 0x8fa6d8, intensity = 0.06, o = {}) {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 4, 1, true);
    g.rotateY(Math.PI / 4);
    g.translate(0, 0.5, 0);
    const mat = G.engine.beamMaterial(color, intensity, { flashGain: o.flashGain ?? 0.5 });
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    m.scale.set(w * 1.41, len, h * 1.41);
    m.renderOrder = 5;
    G.engine.scene.add(m);
    G.engine.addBeam(m);
    return m;
  };

  // ------------------------------------------------------------------ item models (Groups, not added to scene)
  const MD = (P.model = {});
  MD.spoon = function () {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M().steel);
    bowl.scale.set(0.9, 0.35, 1.4); bowl.rotation.x = Math.PI; bowl.position.set(0, 0.01, -0.07);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.13), M().steel);
    handle.position.set(0, 0.012, 0.03);
    g.add(bowl, handle);
    return g;
  };
  MD.cup = function (water) {
    const g = new THREE.Group();
    const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.038, 0), new THREE.Vector2(0.042, 0.005), new THREE.Vector2(0.045, 0.1), new THREE.Vector2(0.048, 0.105), new THREE.Vector2(0.043, 0.1), new THREE.Vector2(0.04, 0.008)];
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), new THREE.MeshStandardMaterial({ color: 0x9aa0a4, metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide }));
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 12, Math.PI), M().steel);
    h.position.set(0.045, 0.055, 0); h.rotation.z = -Math.PI / 2;
    g.add(body, h);
    if (water) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.041, 20), new THREE.MeshStandardMaterial({ color: 0x3a5260, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }));
      w.rotation.x = -Math.PI / 2; w.position.y = 0.088; g.add(w);
    }
    return g;
  };
  MD.cupWater = () => MD.cup(true);
  MD.flashlight = function () {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x2a2d30, metalness: 0.8, roughness: 0.35 }));
    body.rotation.z = Math.PI / 2;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.024, 0.06, 16), M().chrome);
    head.rotation.z = Math.PI / 2; head.position.x = 0.12;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0x332a18, roughness: 0.1 }));
    lens.rotation.y = Math.PI / 2; lens.position.x = 0.151;
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.015), M().black); sw.position.set(0.02, 0.024, 0);
    g.add(body, head, lens, sw);
    return g;
  };
  MD.batteries = function () {
    const g = new THREE.Group();
    const mk = (x) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0xb8471a, roughness: 0.5, metalness: 0.3 }));
      b.position.x = x;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 8), M().chrome); top.position.y = 0.033; b.add(top);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.015, 16), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })); band.position.y = -0.02; b.add(band);
      g.add(b);
    };
    mk(-0.019); mk(0.019);
    return g;
  };
  MD.key = function (color = 0xc9a050, tag = true) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.3 });
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 8, 16), mat);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.008, 0.004), mat); shaft.position.x = 0.05;
    const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.004), mat); bit1.position.set(0.07, -0.01, 0);
    const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.004), mat); bit2.position.set(0.082, -0.008, 0);
    const tagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.003), new THREE.MeshStandardMaterial({ map: G.tex.label('C-GATE', { w: 128, h: 80, bg: '#c94a2a', fg: '#f3e9d2' }), roughness: 0.6 }));
    tagMesh.position.set(-0.045, -0.02, 0); tagMesh.rotation.z = 0.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 6, 12), M().steel); ring.position.set(-0.025, -0.008, 0);
    g.add(bow, shaft, bit1, bit2, ring);
    if (tag) g.add(tagMesh);
    return g;
  };
  MD.jerrycan = function (full) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3b4a2a, metalness: 0.5, roughness: 0.55, map: G.tex.sets.metalGreen.map });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.46, 0.34), mat); body.position.y = 0.23;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.02), mat); rib.position.set(0, 0.22, 0.08);
    const rib2 = rib.clone(); rib2.position.z = -0.08;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.16), mat); handle.position.set(0, 0.5, 0);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 10), M().metalDark); spout.position.set(0, 0.48, 0.13);
    g.add(body, rib, rib2, handle, spout);
    return g;
  };
  MD.boltcutters = function () {
    const g = new THREE.Group();
    const grip = new THREE.MeshStandardMaterial({ color: 0xa3261a, roughness: 0.6 });
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8), M().metalDark);
      arm.rotation.z = Math.PI / 2 + s * 0.06; arm.position.set(0.05, s * 0.02, 0);
      const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), grip);
      gr.rotation.z = Math.PI / 2 + s * 0.06; gr.position.set(0.24, s * 0.032, 0);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.025), M().metalGray);
      jaw.position.set(-0.27, s * 0.012, 0);
      g.add(arm, gr, jaw);
    }
    const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 10), M().steel); piv.rotation.x = Math.PI / 2; piv.position.x = -0.2;
    g.add(piv);
    return g;
  };
  MD.paper = function (tex) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.25), new THREE.MeshStandardMaterial({ map: tex || G.tex.noteTex('hand', 3), roughness: 0.85, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    g.add(m);
    return g;
  };
  MD.photo = function () {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.19, 0.012), M().woodDark);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.165), new THREE.MeshStandardMaterial({ map: G.tex.photoFront(), roughness: 0.35 }));
    front.position.z = 0.0065;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.165), new THREE.MeshStandardMaterial({ map: G.tex.photoBack(), roughness: 0.8 }));
    back.position.z = -0.0065; back.rotation.y = Math.PI;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.165), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.02, metalness: 0.5 }));
    glass.position.z = 0.0075;
    g.add(frame, front, back, glass);
    return g;
  };
  MD.map = function () {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshStandardMaterial({ map: G.tex.mapPaper(), roughness: 0.9, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    g.add(m);
    return g;
  };
})();
