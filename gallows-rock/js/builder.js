// builder.js — level construction toolkit: static batching, world-UV geometry, walls with holes,
// colliders, walkable floor regions and gameplay areas.
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, X = window.THREEX, U = G.U;
  const B = (G.B = {});
  const W = (G.world = {
    areas: [], colliders: [], floors: [], current: null, statics: new Map(), dynamic: [],
  });
  B.curArea = 'misc';
  B.setArea = (a) => { B.curArea = a; };

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

  // ------------------------------------------------------------------ UV helpers
  function worldUV(g) {
    const pos = g.attributes.position, nor = g.attributes.normal;
    let uv = g.attributes.uv;
    if (!uv) { uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2); g.setAttribute('uv', uv); }
    for (let i = 0; i < pos.count; i++) {
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (ny >= nx && ny >= nz) uv.setXY(i, x, z);
      else if (nx >= nz) uv.setXY(i, z, y);
      else uv.setXY(i, x, y);
    }
    uv.needsUpdate = true;
  }
  B.worldUV = worldUV;
  function scaleUV(g, su, sv) {
    const uv = g.attributes.uv; if (!uv) return;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    uv.needsUpdate = true;
  }
  B.scaleUV = scaleUV;

  function clean(g) {
    let out = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') out.deleteAttribute(k);
    if (!out.attributes.uv) out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2));
    out.morphAttributes = {};
    return out;
  }

  function matrixFrom(o) {
    const pos = o.pos || [0, 0, 0], rot = o.rot || [0, 0, 0], sc = o.scale || [1, 1, 1];
    _e.set(rot[0], rot[1], rot[2], o.order || 'XYZ');
    _q.setFromEuler(_e);
    _p.set(pos[0], pos[1], pos[2]);
    _s.set(sc[0], sc[1], sc[2]);
    return new THREE.Matrix4().compose(_p, _q, _s);
  }

  // Generic add: static (merged) unless o.dynamic / o.parent.
  // o: {pos, rot, scale, parent, dynamic, uv:'world'|'native', uvScale:[u,v], cast, receive, col, area, name}
  B.add = function (geom, mat, o = {}) {
    if (o.uvScale && (o.uv === 'native' || o.dynamic || o.parent)) { geom = geom.clone(); scaleUV(geom, o.uvScale[0], o.uvScale[1]); }
    if (o.dynamic || o.parent) {
      if (o.uv === 'world') { geom = geom.clone(); worldUV(geom); }
      const mesh = new THREE.Mesh(geom, mat);
      const pos = o.pos || [0, 0, 0], rot = o.rot || [0, 0, 0], sc = o.scale || [1, 1, 1];
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.set(rot[0], rot[1], rot[2], o.order || 'XYZ');
      mesh.scale.set(sc[0], sc[1], sc[2]);
      mesh.castShadow = o.cast ?? !mat.transparent;
      mesh.receiveShadow = o.receive ?? true;
      if (o.name) mesh.name = o.name;
      (o.parent || G.engine.scene).add(mesh);
      if (o.col) {
        mesh.updateWorldMatrix(true, false);
        const bb = new THREE.Box3().setFromObject(mesh);
        B.collider(bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z);
      }
      return mesh;
    }
    const m = matrixFrom(o);
    let g = geom.clone();
    g.applyMatrix4(m);
    g = clean(g);
    if (o.uv !== 'native') worldUV(g);
    else if (o.uvScale) scaleUV(g, o.uvScale[0], o.uvScale[1]);
    const area = o.area || B.curArea;
    const cast = o.cast ?? !mat.transparent;
    const key = area + '|' + mat.uuid + '|' + cast;
    let rec = W.statics.get(key);
    if (!rec) { rec = { mat, area, geoms: [], cast }; W.statics.set(key, rec); }
    rec.geoms.push(g);
    if (o.col) {
      g.computeBoundingBox();
      const bb = g.boundingBox;
      B.collider(bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z);
    }
    return null;
  };

  // Box by center + size. o: {x,y,z,w,h,d, mat, ry, ...add opts}. If o.base, y is the bottom.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  B.box = function (o) {
    const y = o.base !== undefined ? o.base + o.h / 2 : o.y;
    const g = new THREE.BoxGeometry(o.w, o.h, o.d);
    return B.add(g, o.mat, Object.assign({}, o, { pos: [o.x, y, o.z], rot: [o.rx || 0, o.ry || 0, o.rz || 0] }));
  };
  B.cyl = function (o) {
    const g = new THREE.CylinderGeometry(o.rt ?? o.r, o.rb ?? o.r, o.h, o.seg || 16, 1, !!o.open);
    return B.add(g, o.mat, Object.assign({ uv: 'native', uvScale: o.uvScale || [Math.max(1, Math.round((o.r || 0.1) * 6)), o.h] }, o, { pos: [o.x, o.base !== undefined ? o.base + o.h / 2 : o.y, o.z], rot: [o.rx || 0, o.ry || 0, o.rz || 0] }));
  };
  B.sphere = function (o) {
    const g = new THREE.SphereGeometry(o.r, o.seg || 16, o.seg2 || 12);
    return B.add(g, o.mat, Object.assign({ uv: 'native' }, o, { pos: [o.x, o.y, o.z], rot: [o.rx || 0, o.ry || 0, o.rz || 0], scale: o.scale }));
  };
  B.plane = function (o) {
    const g = new THREE.PlaneGeometry(o.w, o.h);
    return B.add(g, o.mat, Object.assign({ uv: 'native', cast: false }, o, { pos: [o.x, o.y, o.z], rot: [o.rx || 0, o.ry || 0, o.rz || 0] }));
  };
  // decal: plane slightly offset from a surface, no shadows, dynamic so it can use a unique transparent material
  B.decal = function (tex, o) {
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: o.rough ?? 0.9, metalness: 0, alphaTest: 0.01 });
    if (o.emissive) { mat.emissive = new THREE.Color(o.emissive); mat.emissiveMap = tex; mat.emissiveIntensity = o.emissiveIntensity ?? 1; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.h), mat);
    m.position.set(o.x, o.y, o.z);
    m.rotation.set(o.rx || 0, o.ry || 0, o.rz || 0);
    m.receiveShadow = true;
    m.renderOrder = 2;
    (o.parent || G.engine.scene).add(m);
    return m;
  };

  // ------------------------------------------------------------------ colliders & floors
  // AABB collider. Returns object with .enabled
  B.collider = function (x1, y1, z1, x2, y2, z2, tag) {
    const c = { min: new THREE.Vector3(Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2)), max: new THREE.Vector3(Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2)), enabled: true, tag };
    W.colliders.push(c);
    return c;
  };
  // Box collider from center/size (optionally rotated by ry -> stored as OBB)
  B.colBox = function (x, y0, z, w, h, d, ry = 0, tag) {
    if (!ry || Math.abs(Math.sin(ry * 2)) < 1e-3) {
      const sw = Math.abs(Math.cos(ry)) > 0.5 ? w : d, sd = Math.abs(Math.cos(ry)) > 0.5 ? d : w;
      return B.collider(x - sw / 2, y0, z - sd / 2, x + sw / 2, y0 + h, z + sd / 2, tag);
    }
    const c = { obb: true, cx: x, cz: z, hw: w / 2, hd: d / 2, ry, min: new THREE.Vector3(x - Math.hypot(w, d) / 2, y0, z - Math.hypot(w, d) / 2), max: new THREE.Vector3(x + Math.hypot(w, d) / 2, y0 + h, z + Math.hypot(w, d) / 2), enabled: true, tag };
    W.colliders.push(c);
    return c;
  };
  // Walkable region: y can be number or function(x,z)
  B.region = function (x1, z1, x2, z2, y, surface = 'concrete', o = {}) {
    const r = { x1: Math.min(x1, x2), x2: Math.max(x1, x2), z1: Math.min(z1, z2), z2: Math.max(z1, z2), y, surface, enabled: true, tag: o.tag };
    W.floors.push(r);
    return r;
  };
  W.groundAt = function (x, z, feetY, stepUp = 0.45) {
    let best = -Infinity, surf = 'concrete', region = null;
    for (const r of W.floors) {
      if (!r.enabled || x < r.x1 || x > r.x2 || z < r.z1 || z > r.z2) continue;
      const y = typeof r.y === 'function' ? r.y(x, z) : r.y;
      if (y <= feetY + stepUp && y > best) { best = y; surf = r.surface; region = r; }
    }
    return { y: best, surface: surf, region };
  };

  // Floor slab (top at y) + region
  B.floor = function (x1, z1, x2, z2, y, mat, surface, o = {}) {
    B.box(Object.assign({ x: (x1 + x2) / 2, y: y - 0.1, z: (z1 + z2) / 2, w: Math.abs(x2 - x1), h: 0.2, d: Math.abs(z2 - z1), mat, cast: false }, o));
    if (surface !== false) return B.region(x1, z1, x2, z2, y, surface || 'concrete');
    return null;
  };
  B.ceiling = function (x1, z1, x2, z2, y, mat, o = {}) {
    B.box(Object.assign({ x: (x1 + x2) / 2, y: y + 0.1, z: (z1 + z2) / 2, w: Math.abs(x2 - x1), h: 0.2, d: Math.abs(z2 - z1), mat }, o));
  };

  // Wall with rectangular holes. axis 'x': runs along X at z=pos; axis 'z': runs along Z at x=pos.
  // holes: [{a0,a1,y0,y1}] in wall coordinates (a = x or z). opts: {lower:{mat,h}, trim:mat, col:true, thick}
  B.wall = function (axis, pos, a0, a1, y0, y1, mat, holes = [], opts = {}) {
    const t = opts.thick ?? 0.25;
    const as = new Set([a0, a1]), ys = new Set([y0, y1]);
    if (opts.lower) ys.add(y0 + opts.lower.h);
    for (const h of holes) { as.add(U.clamp(h.a0, a0, a1)); as.add(U.clamp(h.a1, a0, a1)); ys.add(U.clamp(h.y0, y0, y1)); ys.add(U.clamp(h.y1, y0, y1)); }
    const A = [...as].sort((p, q) => p - q), Y = [...ys].sort((p, q) => p - q);
    const solid = (ac, yc) => !holes.some((h) => ac > h.a0 && ac < h.a1 && yc > h.y0 && yc < h.y1);
    for (let j = 0; j < Y.length - 1; j++) {
      const yb = Y[j], yt = Y[j + 1];
      if (yt - yb < 1e-4) continue;
      const yc = (yb + yt) / 2;
      const m = opts.lower && yc < y0 + opts.lower.h ? opts.lower.mat : mat;
      let runStart = null;
      for (let i = 0; i <= A.length - 1; i++) {
        const isEnd = i === A.length - 1;
        const ac = isEnd ? 0 : (A[i] + A[i + 1]) / 2;
        const s = !isEnd && A[i + 1] - A[i] > 1e-4 && solid(ac, yc);
        if (s && runStart === null) runStart = A[i];
        if ((!s || isEnd) && runStart !== null) {
          const ra0 = runStart, ra1 = A[i];
          const len = ra1 - ra0, mid = (ra0 + ra1) / 2;
          if (axis === 'x') B.box({ x: mid, y: yc, z: pos, w: len, h: yt - yb, d: t, mat: m, col: opts.col !== false });
          else B.box({ x: pos, y: yc, z: mid, w: t, h: yt - yb, d: len, mat: m, col: opts.col !== false });
          runStart = null;
        }
      }
    }
    if (opts.trim && opts.lower) {
      const yy = y0 + opts.lower.h;
      const segs = [];
      let s0 = a0;
      const hs = holes.filter((h) => yy > h.y0 && yy < h.y1).sort((p, q) => p.a0 - q.a0);
      for (const h of hs) { if (h.a0 > s0) segs.push([s0, h.a0]); s0 = Math.max(s0, h.a1); }
      if (s0 < a1) segs.push([s0, a1]);
      for (const [p0, p1] of segs) {
        if (axis === 'x') B.box({ x: (p0 + p1) / 2, y: yy, z: pos, w: p1 - p0, h: 0.05, d: t + 0.03, mat: opts.trim, cast: false });
        else B.box({ x: pos, y: yy, z: (p0 + p1) / 2, w: t + 0.03, h: 0.05, d: p1 - p0, mat: opts.trim, cast: false });
      }
    }
  };

  // Merge the rigid descendants of a group into one mesh per material (children flagged userData.keep stay separate)
  B.bakeGroup = function (group) {
    group.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map(), remove = [];
    group.traverse((o) => {
      if (!o.isMesh || o === group || Array.isArray(o.material) || o.userData.keep) return;
      for (let p = o.parent; p && p !== group; p = p.parent) if (p.userData.keep) return;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      if (m.determinant() < 0) return;
      const g = clean(o.geometry.clone().applyMatrix4(m));
      const key = o.material.uuid + '|' + o.castShadow;
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, list: [] });
      buckets.get(key).list.push(g);
      remove.push(o);
    });
    remove.forEach((o) => o.parent.remove(o));
    for (const [, b] of buckets) {
      const merged = X.mergeGeometries(b.list, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, b.mat);
      mesh.castShadow = b.cast; mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  };

  // ------------------------------------------------------------------ finalize statics
  B.finalize = function () {
    const scene = G.engine.scene;
    for (const [, rec] of W.statics) {
      if (!rec.geoms.length) continue;
      const merged = X.mergeGeometries(rec.geoms, false);
      if (!merged) { console.warn('merge failed', rec.area); continue; }
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, rec.mat);
      mesh.castShadow = rec.cast;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.name = 'static:' + rec.area;
      mesh.userData.area = rec.area;
      scene.add(mesh);
      rec.geoms.forEach((g) => g.dispose());
      rec.geoms = [];
    }
  };

  // ------------------------------------------------------------------ area layers (manual portal culling)
  W.LAYER = {};
  let nextLayer = 1;
  W.layerOf = (area) => (area in W.LAYER ? W.LAYER[area] : (W.LAYER[area] = Math.min(31, nextLayer++)));
  B.assignLayers = function () {
    const scene = G.engine.scene, p = new THREE.Vector3();
    scene.children.forEach((obj) => {
      if (obj.isCamera || obj.isLight || obj.userData.alwaysVisible) return;
      let area = obj.userData.area;
      if (!area) { obj.getWorldPosition(p); const a = W.areaAt(p); area = a ? a.name : null; }
      if (!area || area === 'misc') return;
      const L = W.layerOf(area);
      obj.traverse((o) => o.layers.set(L));
    });
  };
  W.showAreas = function (names) {
    let mask = 1;
    names.forEach((n) => { if (n in W.LAYER) mask |= 1 << W.LAYER[n]; });
    const E = G.engine;
    E.camera.layers.mask = mask;
    const Ls = E.lights;
    [Ls.moon, Ls.flash, Ls.spotA, Ls.spotB].forEach((l) => { l.shadow.camera.layers.mask = mask; });
    W.visibleMask = mask;
  };
  W.showAll = function () { W.showAreas(Object.keys(W.LAYER)); };

  // ------------------------------------------------------------------ areas
  // def: {name, boxes:[[x1,y1,z1,x2,y2,z2],...], look, amb, reverb, music, lights:[names], outdoor, env, rain}
  B.area = function (def) { W.areas.push(def); return def; };
  W.areaAt = function (p) {
    for (const a of W.areas) for (const b of a.boxes) if (p.x >= b[0] && p.x <= b[3] && p.y >= b[1] && p.y <= b[4] && p.z >= b[2] && p.z <= b[5]) return a;
    return null;
  };
  W.area = (name) => W.areas.find((a) => a.name === name);
  W.lightAreas = function () {
    const a = W.current; if (!a) return null;
    return a.lights || [a.name];
  };

  // ray vs colliders (for interaction occlusion / searchlight visibility). returns nearest t or Infinity
  const _inv = new THREE.Vector3();
  function slab(ox, oy, oz, ix, iy, iz, x0, y0, z0, x1, y1, z1) {
    let t1 = (x0 - ox) * ix, t2 = (x1 - ox) * ix;
    let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
    t1 = (y0 - oy) * iy; t2 = (y1 - oy) * iy;
    tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
    t1 = (z0 - oz) * iz; t2 = (z1 - oz) * iz;
    tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
    return tmax >= Math.max(tmin, 0) ? Math.max(tmin, 0) : Infinity;
  }
  W.rayColliders = function (origin, dir, maxT, filter) {
    let best = maxT;
    _inv.set(1 / dir.x, 1 / dir.y, 1 / dir.z);
    for (const c of W.colliders) {
      if (!c.enabled || c.noRay) continue;
      if (filter && !filter(c)) continue;
      if (c.obb) {
        const cs = Math.cos(c.ry), sn = Math.sin(c.ry);
        const dx = origin.x - c.cx, dz = origin.z - c.cz;
        const lox = dx * cs - dz * sn, loz = dx * sn + dz * cs;
        const ldx = dir.x * cs - dir.z * sn, ldz = dir.x * sn + dir.z * cs;
        const t = slab(lox, origin.y, loz, 1 / ldx, _inv.y, 1 / ldz, -c.hw, c.min.y, -c.hd, c.hw, c.max.y, c.hd);
        if (t < best) best = t;
        continue;
      }
      let t1 = (c.min.x - origin.x) * _inv.x, t2 = (c.max.x - origin.x) * _inv.x;
      let tmin = Math.min(t1, t2), tmax = Math.max(t1, t2);
      t1 = (c.min.y - origin.y) * _inv.y; t2 = (c.max.y - origin.y) * _inv.y;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      t1 = (c.min.z - origin.z) * _inv.z; t2 = (c.max.z - origin.z) * _inv.z;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      if (tmax >= Math.max(tmin, 0) && tmin < best) best = Math.max(tmin, 0);
    }
    return best;
  };
})();
