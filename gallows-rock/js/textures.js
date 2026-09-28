// textures.js — procedural textures (noise-based PBR sets + canvas art) and the material library
(function () {
  'use strict';
  const G = window.G, THREE = window.THREE, U = G.U;
  const T = (G.tex = {});

  // ------------------------------------------------------------------ noise
  function fbm(size, period, octaves, seed, persistence = 0.5, ridged = false) {
    const out = new Float32Array(size * size);
    const r = U.rng(seed * 7919 + 13);
    let amp = 1, total = 0, p = period;
    for (let o = 0; o < octaves && p <= size; o++) {
      const g = new Float32Array(p * p);
      for (let i = 0; i < g.length; i++) g[i] = r();
      const scale = p / size;
      for (let y = 0; y < size; y++) {
        const fy = y * scale, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
        const r0 = (y0 % p) * p, r1 = ((y0 + 1) % p) * p;
        for (let x = 0; x < size; x++) {
          const fx = x * scale, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
          const xa = x0 % p, xb = (x0 + 1) % p;
          const a = g[r0 + xa], b = g[r0 + xb], c = g[r1 + xa], d = g[r1 + xb];
          let v = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
          if (ridged) v = 1 - Math.abs(v * 2 - 1);
          out[y * size + x] += v * amp;
        }
      }
      total += amp;
      amp *= persistence;
      p *= 2;
    }
    for (let i = 0; i < out.length; i++) out[i] /= total;
    return norm(out);
  }
  function norm(a) {
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < a.length; i++) { if (a[i] < mn) mn = a[i]; if (a[i] > mx) mx = a[i]; }
    const k = 1 / (mx - mn || 1);
    for (let i = 0; i < a.length; i++) a[i] = (a[i] - mn) * k;
    return a;
  }
  function worley(size, cells, seed) {
    const r = U.rng(seed * 31 + 7);
    const pts = new Float32Array(cells * cells * 2);
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
      pts[(j * cells + i) * 2] = (i + r()) / cells;
      pts[(j * cells + i) * 2 + 1] = (j + r()) / cells;
    }
    const f1 = new Float32Array(size * size), f2 = new Float32Array(size * size), id = new Uint16Array(size * size);
    for (let y = 0; y < size; y++) {
      const v = y / size, cj = Math.floor(v * cells);
      for (let x = 0; x < size; x++) {
        const u = x / size, ci = Math.floor(u * cells);
        let d1 = 9, d2 = 9, best = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = ci + di, jj = cj + dj;
          const wi = (ii + cells) % cells, wj = (jj + cells) % cells;
          const k = wj * cells + wi;
          const px = pts[k * 2] + (ii - wi) / cells, py = pts[k * 2 + 1] + (jj - wj) / cells;
          const dx = u - px, dy = v - py, d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) { d2 = d1; d1 = d; best = k; } else if (d < d2) d2 = d;
        }
        const i = y * size + x;
        f1[i] = d1 * cells; f2[i] = d2 * cells; id[i] = best;
      }
    }
    return { f1, f2, id };
  }
  T.fbm = fbm;
  T.worley = worley;

  // ------------------------------------------------------------------ texture helpers
  function dataTex(u8, size, srgb) {
    const t = new THREE.DataTexture(new Uint8Array(u8.buffer), size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }
  function normalData(h, size, s) {
    const out = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) {
      const ym = ((y - 1 + size) % size) * size, yp = ((y + 1) % size) * size, yr = y * size;
      for (let x = 0; x < size; x++) {
        const l = h[yr + ((x - 1 + size) % size)], r = h[yr + ((x + 1) % size)];
        const u = h[ym + x], d = h[yp + x];
        let nx = (l - r) * s, ny = (u - d) * s, nz = 1;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        const i = (yr + x) * 4;
        out[i] = (nx * inv * 0.5 + 0.5) * 255;
        out[i + 1] = (ny * inv * 0.5 + 0.5) * 255;
        out[i + 2] = (nz * inv * 0.5 + 0.5) * 255;
        out[i + 3] = 255;
      }
    }
    return out;
  }
  // Generic PBR set: fn(x,y,i,p) sets p.r,p.g,p.b (0..1), p.h (height), p.ro (roughness), p.m (metalness)
  function pbr(size, strength, fn) {
    const n = size * size;
    const col = new Uint8ClampedArray(n * 4), hgt = new Float32Array(n), rgh = new Uint8ClampedArray(n * 4);
    const p = { r: 0, g: 0, b: 0, h: 0, ro: 0.8, m: 0 };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x;
      p.m = 0;
      fn(x, y, i, p);
      const k = i * 4;
      col[k] = p.r * 255; col[k + 1] = p.g * 255; col[k + 2] = p.b * 255; col[k + 3] = 255;
      hgt[i] = p.h;
      rgh[k] = 0; rgh[k + 1] = p.ro * 255; rgh[k + 2] = p.m * 255; rgh[k + 3] = 255;
    }
    const rough = dataTex(rgh, size, false);
    return { map: dataTex(col, size, true), normalMap: dataTex(normalData(hgt, size, strength), size, false), roughnessMap: rough, metalnessMap: rough };
  }
  function set3(p, c, k) { p.r = c[0] * k; p.g = c[1] * k; p.b = c[2] * k; }
  function mix3(p, c, t) { p.r += (c[0] - p.r) * t; p.g += (c[1] - p.g) * t; p.b += (c[2] - p.b) * t; }

  T.canvas = function (w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h || w;
    const ctx = c.getContext('2d');
    if (draw) draw(ctx, c.width, c.height);
    return c;
  };
  T.canvasTex = function (w, h, draw, opts = {}) {
    const c = T.canvas(w, h, draw);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    t.anisotropy = 8;
    if (opts.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    t.userData.canvas = c;
    return t;
  };

  // ------------------------------------------------------------------ PBR generators
  T.concrete = function (seed, tint, opt = {}) {
    const S = 512;
    const big = fbm(S, 3, 5, seed), det = fbm(S, 48, 3, seed + 1), st = fbm(S, 4, 4, seed + 2), cm = fbm(S, 6, 3, seed + 4);
    const w = worley(S, 9, seed + 3);
    const r = U.rng(seed + 99);
    const pits = new Float32Array(S * S);
    for (let k = 0; k < 1400; k++) { const i = Math.floor(r() * S * S); pits[i] = 1; pits[(i + 1) % (S * S)] = 0.5; }
    const stainAmt = opt.stain ?? 1;
    return pbr(S, opt.strength || 2.2, (x, y, i, p) => {
      let v = 0.9 + (big[i] - 0.5) * 0.32 + (det[i] - 0.5) * 0.16;
      const stain = U.smoothstep(0.55, 0.9, st[i]) * stainAmt;
      v *= 1 - stain * 0.38;
      const edge = w.f2[i] - w.f1[i];
      const crack = edge < 0.02 && cm[i] > 0.7 ? (1 - edge / 0.02) * U.smoothstep(0.7, 0.8, cm[i]) : 0;
      v *= 1 - crack * 0.28 - pits[i] * 0.18;
      set3(p, tint, v);
      p.h = det[i] * 0.5 + big[i] * 0.3 - pits[i] * 0.6 - crack * 0.8;
      p.ro = U.clamp(0.88 - stain * (opt.wet ? 0.55 : 0.2) + (det[i] - 0.5) * 0.1, 0.05, 1);
    });
  };

  T.block = function (paint, seed, opt = {}) {
    const S = 512, bw = 128, bh = 64, m = 3;
    const det = fbm(S, 64, 2, seed), big = fbm(S, 4, 4, seed + 1), peel = fbm(S, 8, 4, seed + 2), grime = fbm(S, 2, 4, seed + 5);
    const peelT = opt.peel ?? 0.76;
    return pbr(S, 3.2, (x, y, i, p) => {
      const row = Math.floor(y / bh), off = (row % 2) * (bw / 2);
      const bx = (x + off) % bw, by = y % bh;
      const e = Math.min(bx, bw - bx, by, bh - by);
      const mort = e < m;
      const bevel = U.smoothstep(m, m + 5, e);
      p.h = 0.25 + bevel * 0.6 + (det[i] - 0.5) * 0.14;
      const k = 0.9 + (big[i] - 0.5) * 0.16 + (det[i] - 0.5) * 0.07 - grime[i] * 0.12;
      set3(p, paint, k * (mort ? 0.8 : 1));
      p.ro = mort ? 0.95 : 0.62 + det[i] * 0.12;
      if (!mort && peel[i] > peelT) {
        const g = 0.36 + det[i] * 0.12;
        p.r = g; p.g = g * 0.98; p.b = g * 0.95;
        p.h -= 0.12; p.ro = 0.95;
      } else if (!mort && peel[i] > peelT - 0.02) {
        p.h += 0.08;
      }
    });
  };

  T.metal = function (color, rustAmt, seed, opt = {}) {
    const S = 512;
    const big = fbm(S, 4, 5, seed), det = fbm(S, 64, 2, seed + 1), rm = fbm(S, 8, 5, seed + 2);
    const scr = new Float32Array(S * S);
    const r = U.rng(seed + 5);
    for (let k = 0; k < (opt.scratches ?? 120); k++) {
      let x = r() * S, y = r() * S; const a = r() * Math.PI * 2, len = 10 + r() * 60;
      for (let s = 0; s < len; s++) { const xi = Math.floor(x + Math.cos(a) * s) & (S - 1), yi = Math.floor(y + Math.sin(a) * s) & (S - 1); scr[yi * S + xi] = 1; }
    }
    const rc = [0.32, 0.15, 0.07];
    return pbr(S, 1.4, (x, y, i, p) => {
      set3(p, color, 0.88 + (big[i] - 0.5) * 0.22 + (det[i] - 0.5) * 0.06);
      p.ro = (opt.rough ?? 0.5) + (det[i] - 0.5) * 0.12 + big[i] * 0.08;
      p.m = opt.metal ?? 0.15;
      p.h = det[i] * 0.2;
      const rust = U.smoothstep(1 - rustAmt * 0.45 - 0.05, 1 - rustAmt * 0.45 + 0.1, rm[i]);
      if (rust > 0) {
        mix3(p, [rc[0] * (0.7 + det[i] * 0.6), rc[1] * (0.7 + det[i] * 0.6), rc[2]], rust);
        p.ro = U.lerp(p.ro, 0.95, rust); p.m *= 1 - rust; p.h += rust * (det[i] * 0.8);
      }
      if (scr[i] && rust < 0.5) { mix3(p, [0.62, 0.62, 0.64], 0.6); p.m = 0.9; p.ro = 0.3; p.h -= 0.3; }
    });
  };

  T.wood = function (base, seed, opt = {}) {
    const S = 512, planks = opt.planks || 6, ph = S / planks;
    const warp = fbm(S, 4, 4, seed), det = fbm(S, 32, 3, seed + 1), big = fbm(S, 2, 3, seed + 2);
    const r = U.rng(seed + 3);
    const tints = [], joints = [];
    for (let k = 0; k < planks; k++) { tints.push(0.8 + r() * 0.4); joints.push(Math.floor(r() * S)); }
    return pbr(S, 1.6, (x, y, i, p) => {
      const pl = Math.floor(y / ph), py = y - pl * ph;
      const grain = 0.5 + 0.5 * Math.sin((y + warp[i] * 30 + pl * 17) * 0.55 + Math.sin(x * 0.01 + pl) * 2);
      const k = tints[pl] * (0.78 + grain * 0.22 + (det[i] - 0.5) * 0.12) * (0.9 + big[i] * 0.2);
      set3(p, base, k);
      p.ro = (opt.rough ?? 0.62) + (1 - grain) * 0.1;
      p.h = grain * 0.2 + det[i] * 0.1;
      const gap = py < 2 || Math.abs(x - joints[pl]) < 2;
      if (gap && planks > 1) { set3(p, base, 0.25); p.h = -0.6; p.ro = 0.95; }
    });
  };

  T.checker = function (a, b, seed) {
    const S = 512, ts = 128;
    const big = fbm(S, 3, 5, seed), det = fbm(S, 64, 2, seed + 1), scr = fbm(S, 32, 2, seed + 2, 0.5, true);
    return pbr(S, 1.2, (x, y, i, p) => {
      const tx = Math.floor(x / ts), ty = Math.floor(y / ts);
      const c = (tx + ty) % 2 ? a : b;
      const e = Math.min(x % ts, ts - (x % ts), y % ts, ts - (y % ts));
      const dirt = U.smoothstep(0.45, 0.85, big[i]);
      set3(p, c, (0.92 + (det[i] - 0.5) * 0.1) * (1 - dirt * 0.35));
      if (e < 1.5) set3(p, [0.12, 0.12, 0.11], 1);
      p.ro = 0.28 + dirt * 0.42 + (scr[i] > 0.93 ? 0.2 : 0);
      p.h = e < 1.5 ? -0.5 : det[i] * 0.05;
    });
  };

  T.tile = function (c, grout, seed, n = 4) {
    const S = 512, ts = S / n;
    const big = fbm(S, 4, 4, seed), det = fbm(S, 64, 2, seed + 1);
    const r = U.rng(seed + 2), tt = [];
    for (let k = 0; k < n * n; k++) tt.push(0.93 + r() * 0.1);
    return pbr(S, 2.5, (x, y, i, p) => {
      const tx = Math.floor(x / ts), ty = Math.floor(y / ts);
      const e = Math.min(x % ts, ts - (x % ts), y % ts, ts - (y % ts));
      const dirt = U.smoothstep(0.5, 0.95, big[i]);
      if (e < 4) { set3(p, grout, 0.9 + det[i] * 0.2 - dirt * 0.3); p.ro = 0.9; p.h = 0; }
      else { set3(p, c, tt[ty * n + tx] * (1 - dirt * 0.25)); p.ro = 0.18 + dirt * 0.3; p.h = 0.5 + U.smoothstep(4, 10, e) * 0.3; }
    });
  };

  T.stone = function (seed, opt = {}) {
    const S = 512, r = U.rng(seed);
    const det = fbm(S, 32, 3, seed + 1), big = fbm(S, 4, 4, seed + 2), warp = fbm(S, 16, 2, seed + 3);
    const stoneId = new Int32Array(S * S).fill(-1), edge = new Float32Array(S * S);
    // rows
    const rows = []; let sum = 0;
    while (sum < S) { const h = 44 + r() * 50; rows.push(h); sum += h; }
    const sc = S / sum; let yy = 0;
    const tints = [];
    rows.forEach((h0) => {
      const h = h0 * sc; let xx = r() * 40 - 60; const y0 = yy;
      while (xx < S) {
        const w = 60 + r() * 110; const id = tints.length;
        tints.push([0.85 + r() * 0.3, r()]);
        for (let y = Math.floor(y0); y < Math.floor(y0 + h); y++) for (let x = Math.floor(xx); x < Math.floor(xx + w); x++) {
          const X = ((x % S) + S) % S, Y = y % S;
          const i = Y * S + X;
          const e = Math.min(x - xx, xx + w - x, y - y0, y0 + h - y);
          stoneId[i] = id; edge[i] = e;
        }
        xx += w;
      }
      yy += h;
    });
    const base = opt.color || [0.44, 0.41, 0.37];
    return pbr(S, 3.5, (x, y, i, p) => {
      const id = stoneId[i];
      const e = edge[i] + (warp[i] - 0.5) * 9;
      const mort = e < 3.5 || id < 0;
      if (mort) {
        set3(p, opt.mortar || [0.5, 0.47, 0.41], 0.75 + det[i] * 0.25); p.h = 0; p.ro = 0.95;
      } else {
        const t = tints[id];
        const k = t[0] * (0.85 + (det[i] - 0.5) * 0.25) * (0.88 + big[i] * 0.2);
        set3(p, base, k);
        p.r *= 1 + (t[1] - 0.5) * 0.12; p.b *= 1 - (t[1] - 0.5) * 0.1;
        p.h = U.smoothstep(3.5, 14, e) * 0.7 + det[i] * 0.35;
        p.ro = 0.8 - big[i] * 0.15;
      }
    });
  };

  T.brick = function (seed) {
    const S = 512, rowsN = 12, rh = S / rowsN, bw = S / 4;
    const det = fbm(S, 64, 2, seed), big = fbm(S, 4, 4, seed + 1);
    const r = U.rng(seed + 2), tints = [];
    for (let k = 0; k < rowsN * 5; k++) tints.push(0.75 + r() * 0.45);
    return pbr(S, 3, (x, y, i, p) => {
      const row = Math.floor(y / rh), off = (row % 2) * (bw / 2);
      const bxAbs = x + off, bi = Math.floor(bxAbs / bw) % 5;
      const bx = bxAbs % bw, by = y - row * rh;
      const e = Math.min(bx, bw - bx, by, rh - by);
      if (e < 3) { set3(p, [0.42, 0.4, 0.36], 0.8 + det[i] * 0.2); p.h = 0; p.ro = 0.95; }
      else {
        set3(p, [0.42, 0.2, 0.13], tints[row * 5 + bi] * (0.85 + (det[i] - 0.5) * 0.3) * (0.85 + big[i] * 0.25));
        p.h = 0.4 + U.smoothstep(3, 8, e) * 0.4 + det[i] * 0.2; p.ro = 0.78;
      }
    });
  };

  T.rock = function (seed, opt = {}) {
    const S = 512;
    const rid = fbm(S, 4, 6, seed, 0.55, true), det = fbm(S, 32, 3, seed + 1), big = fbm(S, 2, 4, seed + 2);
    const c = opt.color || [0.3, 0.28, 0.26];
    return pbr(S, 5, (x, y, i, p) => {
      const k = 0.55 + rid[i] * 0.5 + (det[i] - 0.5) * 0.2;
      set3(p, c, k);
      p.b *= 1 + (big[i] - 0.5) * 0.2;
      p.h = rid[i] * 0.8 + det[i] * 0.3;
      p.ro = U.clamp(0.75 - U.smoothstep(0.5, 0.8, big[i]) * (opt.wet ? 0.5 : 0.1) + (det[i] - 0.5) * 0.2, 0.08, 1);
    });
  };

  T.mud = function (seed) {
    const S = 512;
    const big = fbm(S, 3, 5, seed), det = fbm(S, 48, 3, seed + 1), pud = fbm(S, 4, 5, seed + 2);
    const r = U.rng(seed + 3), grav = new Float32Array(S * S);
    for (let k = 0; k < 9000; k++) grav[Math.floor(r() * S * S)] = 0.5 + r() * 0.5;
    return pbr(S, 2.5, (x, y, i, p) => {
      const pm = U.smoothstep(0.6, 0.66, pud[i]);
      set3(p, [0.25, 0.22, 0.18], 0.75 + (big[i] - 0.5) * 0.4 + (det[i] - 0.5) * 0.25 + grav[i] * 0.3);
      p.h = det[i] * 0.5 + grav[i] * 0.5;
      p.ro = 0.8 - big[i] * 0.2;
      if (pm > 0) { mix3(p, [0.05, 0.055, 0.06], pm * 0.85); p.ro = U.lerp(p.ro, 0.03, pm); p.h = U.lerp(p.h, 0.1, pm); }
    });
  };

  T.asphalt = function (seed) {
    const S = 512;
    const big = fbm(S, 3, 5, seed), det = fbm(S, 128, 2, seed + 1), pud = fbm(S, 4, 4, seed + 2);
    return pbr(S, 1.8, (x, y, i, p) => {
      const pm = U.smoothstep(0.62, 0.7, pud[i]);
      set3(p, [0.2, 0.2, 0.21], 0.7 + det[i] * 0.5 + (big[i] - 0.5) * 0.2);
      p.h = det[i];
      p.ro = U.lerp(0.55 + det[i] * 0.2, 0.05, pm);
    });
  };

  T.fabric = function (c, seed, opt = {}) {
    const S = 256, det = fbm(S, 32, 3, seed), big = fbm(S, 4, 3, seed + 1);
    return pbr(S, 1.5, (x, y, i, p) => {
      const weave = (Math.sin(x * 1.7) * Math.sin(y * 1.7)) * 0.5 + 0.5;
      let k = 0.85 + weave * 0.12 + (det[i] - 0.5) * 0.2 + (big[i] - 0.5) * 0.1;
      if (opt.stripes) {
        const s = y % 32;
        if (s < 8) { set3(p, opt.stripes, k); p.h = weave * 0.3; p.ro = 0.95; return; }
      }
      set3(p, c, k);
      p.h = weave * 0.3 + det[i] * 0.2;
      p.ro = 0.95;
    });
  };

  T.paperSet = function (seed) {
    const S = 256, det = fbm(S, 64, 2, seed), big = fbm(S, 4, 3, seed + 1);
    return pbr(S, 0.6, (x, y, i, p) => {
      set3(p, [0.87, 0.83, 0.72], 0.92 + det[i] * 0.08 - U.smoothstep(0.6, 1, big[i]) * 0.1);
      p.h = det[i] * 0.2; p.ro = 0.9;
    });
  };

  T.hazard = function () {
    const S = 256, det = fbm(S, 32, 3, 77), big = fbm(S, 4, 3, 78);
    return pbr(S, 1, (x, y, i, p) => {
      const s = ((x + y) % 128) < 64;
      const worn = big[i] > 0.7;
      if (s && !worn) set3(p, [0.85, 0.66, 0.08], 0.9 + det[i] * 0.1); else set3(p, [0.07, 0.07, 0.07], 1 + det[i] * 0.5);
      if (worn) set3(p, [0.35, 0.34, 0.33], 0.9 + det[i] * 0.2);
      p.h = det[i] * 0.2; p.ro = 0.6;
    });
  };

  T.diamondPlate = function (seed) {
    const S = 256, det = fbm(S, 32, 2, seed), big = fbm(S, 4, 3, seed + 1);
    return pbr(S, 4, (x, y, i, p) => {
      const cell = 32, cx = x % cell - cell / 2, cy = y % cell - cell / 2;
      const odd = (Math.floor(x / cell) + Math.floor(y / cell)) % 2;
      const a = odd ? (cx + cy) : (cx - cy), b = odd ? (cx - cy) : (cx + cy);
      const bump = Math.abs(a) < 20 && Math.abs(b) < 4 ? 1 : 0;
      set3(p, [0.5, 0.5, 0.52], 0.8 + det[i] * 0.3 - big[i] * 0.2);
      p.m = 0.85; p.ro = 0.38 + big[i] * 0.3; p.h = bump * 0.8;
    });
  };

  T.waterNormal = function () {
    const S = 256, a = fbm(S, 8, 5, 501), b = fbm(S, 16, 4, 502);
    const h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) h[i] = a[i] * 0.7 + b[i] * 0.3;
    return dataTex(normalData(h, S, 6), S, false);
  };

  // ------------------------------------------------------------------ canvas art
  T.drawSymbol = function (ctx, name, cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color; ctx.strokeStyle = color;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const lw = r * 0.16;
    ctx.lineWidth = lw;
    if (name === 'moon') {
      const t = T.canvas(Math.ceil(r * 2.4), Math.ceil(r * 2.4), (c) => {
        c.fillStyle = color; c.beginPath(); c.arc(r * 1.2, r * 1.2, r, 0, Math.PI * 2); c.fill();
        c.globalCompositeOperation = 'destination-out';
        c.beginPath(); c.arc(r * 1.2 + r * 0.45, r * 1.2 - r * 0.2, r * 0.85, 0, Math.PI * 2); c.fill();
      });
      ctx.drawImage(t, cx - r * 1.2, cy - r * 1.2);
    } else if (name === 'anchor') {
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.78, r * 0.17, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.6); ctx.lineTo(cx, cy + r * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.42, cy - r * 0.4); ctx.lineTo(cx + r * 0.42, cy - r * 0.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.12, r * 0.75, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
      [-1, 1].forEach((s) => {
        const ax = cx + s * r * 0.75 * Math.cos(Math.PI * 0.12), ay = cy + r * 0.12 + r * 0.75 * Math.sin(Math.PI * 0.12);
        ctx.beginPath(); ctx.moveTo(ax + s * r * 0.08, ay - r * 0.3); ctx.lineTo(ax + s * r * 0.12, ay + r * 0.06); ctx.lineTo(ax - s * r * 0.22, ay - r * 0.02); ctx.closePath(); ctx.fill();
      });
    } else if (name === 'star') {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.42 : r;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill();
    } else if (name === 'sun') {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 12; k++) {
        const a = (k * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - 0.12) * r * 0.58, cy + Math.sin(a - 0.12) * r * 0.58);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a + 0.12) * r * 0.58, cy + Math.sin(a + 0.12) * r * 0.58);
        ctx.closePath(); ctx.fill();
      }
    } else if (name === 'skull') {
      const t = T.canvas(Math.ceil(r * 2.4), Math.ceil(r * 2.4), (c) => {
        const o = r * 1.2;
        c.fillStyle = color;
        c.beginPath(); c.arc(o, o - r * 0.15, r * 0.72, 0, Math.PI * 2); c.fill();
        c.fillRect(o - r * 0.42, o + r * 0.3, r * 0.84, r * 0.5);
        c.globalCompositeOperation = 'destination-out';
        c.beginPath(); c.arc(o - r * 0.28, o - r * 0.12, r * 0.19, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(o + r * 0.28, o - r * 0.12, r * 0.19, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.moveTo(o, o + r * 0.05); c.lineTo(o - r * 0.09, o + r * 0.25); c.lineTo(o + r * 0.09, o + r * 0.25); c.fill();
        for (let k = -1; k <= 1; k++) c.fillRect(o + k * r * 0.2 - r * 0.03, o + r * 0.5, r * 0.06, r * 0.3);
      });
      ctx.drawImage(t, cx - r * 1.2, cy - r * 1.2);
    } else if (name === 'trident') {
      ctx.beginPath(); ctx.moveTo(cx, cy + r); ctx.lineTo(cx, cy - r * 0.55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.55, cy - r * 0.7); ctx.quadraticCurveTo(cx - r * 0.55, cy - r * 0.15, cx, cy - r * 0.15); ctx.quadraticCurveTo(cx + r * 0.55, cy - r * 0.15, cx + r * 0.55, cy - r * 0.7); ctx.stroke();
      [-0.55, 0, 0.55].forEach((s) => {
        const px = cx + s * r, py = s === 0 ? cy - r * 0.55 : cy - r * 0.7;
        ctx.beginPath(); ctx.moveTo(px, py - r * 0.35); ctx.lineTo(px - r * 0.12, py); ctx.lineTo(px + r * 0.12, py); ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
  };
  T.SYMBOLS = ['moon', 'anchor', 'star', 'sun', 'skull', 'trident'];

  // wear/grime overlay on canvases
  T.grunge = function (ctx, w, h, amt = 0.25, seed = 1) {
    const r = U.rng(seed);
    ctx.save();
    for (let k = 0; k < 40 * amt * 4; k++) {
      ctx.globalAlpha = r() * 0.12 * amt * 3;
      ctx.fillStyle = r() < 0.5 ? '#2a241c' : '#000';
      const x = r() * w, y = r() * h, rad = 2 + r() * w * 0.08;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, ctx.fillStyle); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;
    const id = ctx.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 22 * amt;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(id, 0, 0);
    ctx.restore();
  };

  // Painted sign / stencil text
  T.sign = function (text, opt = {}) {
    const w = opt.w || 512, h = opt.h || 128;
    return T.canvasTex(w, h, (ctx) => {
      if (opt.bg !== null) { ctx.fillStyle = opt.bg || '#1d3b2a'; ctx.fillRect(0, 0, w, h); }
      if (opt.border) { ctx.strokeStyle = opt.border; ctx.lineWidth = h * 0.06; ctx.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16); }
      ctx.fillStyle = opt.fg || '#e8e0c8';
      const lines = String(text).split('\n');
      const fs = opt.size || Math.floor(h * (lines.length > 1 ? 0.34 : 0.58));
      ctx.font = `${opt.weight || 700} ${fs}px ${opt.font || '"Stardos Stencil", Impact, sans-serif'}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (opt.spacing) ctx.letterSpacing = opt.spacing + 'px';
      lines.forEach((ln, k) => ctx.fillText(ln, w / 2, h / 2 + (k - (lines.length - 1) / 2) * fs * 1.15));
      if (opt.grunge !== false) T.grunge(ctx, w, h, opt.grunge || 0.3, text.length * 7 + w);
    });
  };

  // Paper note lying around: fake handwriting lines
  T.noteTex = function (style = 'hand', seed = 1) {
    return T.canvasTex(256, 320, (ctx, w, h) => {
      const r = U.rng(seed);
      ctx.fillStyle = style === 'yellow' ? '#e9d770' : style === 'typed' ? '#e6e1d2' : '#e2d6b8';
      ctx.fillRect(0, 0, w, h);
      if (style === 'lined') { ctx.strokeStyle = 'rgba(70,100,160,.35)'; for (let y = 40; y < h; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } }
      ctx.strokeStyle = style === 'typed' ? '#333' : '#2b2a33';
      ctx.lineWidth = style === 'typed' ? 3 : 1.6;
      for (let y = 34; y < h - 30; y += style === 'typed' ? 14 : 18) {
        let x = 22; const end = w - 22 - r() * 60;
        ctx.beginPath(); ctx.moveTo(x, y);
        while (x < end) {
          if (style === 'typed') { const len = 8 + r() * 30; ctx.moveTo(x, y); ctx.lineTo(x + len, y); x += len + 6; }
          else { x += 3 + r() * 5; ctx.lineTo(x, y + (r() - 0.5) * 6); if (r() < 0.08) { x += 8; ctx.moveTo(x, y); } }
        }
        ctx.stroke();
      }
      // fold lines
      ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      T.grunge(ctx, w, h, 0.3, seed);
    });
  };

  T.photoFront = function () {
    return T.canvasTex(256, 320, (ctx, w, h) => {
      ctx.fillStyle = '#f1ece0'; ctx.fillRect(0, 0, w, h);
      const x0 = 16, y0 = 16, pw = w - 32, ph = h - 64;
      const g = ctx.createRadialGradient(w / 2, y0 + ph * 0.4, 10, w / 2, y0 + ph * 0.45, ph * 0.8);
      g.addColorStop(0, '#cdb48c'); g.addColorStop(1, '#5c4630');
      ctx.fillStyle = g; ctx.fillRect(x0, y0, pw, ph);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, pw, ph); ctx.clip();
      // cake on table
      ctx.fillStyle = '#6a5038'; ctx.fillRect(x0, y0 + ph * 0.82, pw, ph * 0.2);
      ctx.fillStyle = '#e9dcc0'; ctx.fillRect(w / 2 - 40, y0 + ph * 0.74, 80, 26);
      for (let k = 0; k < 7; k++) {
        ctx.fillStyle = '#f5ecd8'; ctx.fillRect(w / 2 - 33 + k * 11, y0 + ph * 0.66, 3, 14);
        ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.ellipse(w / 2 - 31.5 + k * 11, y0 + ph * 0.64, 2.5, 5, 0, 0, Math.PI * 2); ctx.fill();
      }
      // girl: dress
      ctx.fillStyle = '#3f2f22';
      ctx.beginPath(); ctx.moveTo(w / 2 - 70, y0 + ph * 0.82); ctx.quadraticCurveTo(w / 2, y0 + ph * 0.38, w / 2 + 70, y0 + ph * 0.82); ctx.fill();
      ctx.fillStyle = '#e8dcc4'; ctx.beginPath(); ctx.ellipse(w / 2, y0 + ph * 0.5, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
      // head + hair
      ctx.fillStyle = '#2e2218';
      ctx.beginPath(); ctx.ellipse(w / 2, y0 + ph * 0.33, 44, 50, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w / 2 - 44, y0 + ph * 0.42, 12, 26, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w / 2 + 44, y0 + ph * 0.42, 12, 26, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9a887'; ctx.beginPath(); ctx.ellipse(w / 2, y0 + ph * 0.36, 32, 38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e2218'; ctx.beginPath(); ctx.ellipse(w / 2, y0 + ph * 0.25, 36, 16, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a1e';
      ctx.beginPath(); ctx.arc(w / 2 - 12, y0 + ph * 0.35, 3.2, 0, Math.PI * 2); ctx.arc(w / 2 + 12, y0 + ph * 0.35, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6b3d2c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w / 2, y0 + ph * 0.4, 12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      // sepia vignette
      const v = ctx.createRadialGradient(w / 2, y0 + ph / 2, ph * 0.25, w / 2, y0 + ph / 2, ph * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,18,8,.55)');
      ctx.fillStyle = v; ctx.fillRect(x0, y0, pw, ph);
      ctx.restore();
      ctx.fillStyle = '#5a4a3a'; ctx.font = '26px Caveat, cursive'; ctx.textAlign = 'center';
      ctx.fillText('Lily', w / 2, h - 20);
      T.grunge(ctx, w, h, 0.35, 44);
    });
  };
  T.photoBack = function () {
    return T.canvasTex(256, 320, (ctx, w, h) => {
      ctx.fillStyle = '#e9e2d0'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#22306a'; ctx.textAlign = 'center';
      ctx.font = '700 38px Caveat, cursive'; ctx.fillText('Lily - 7 today!', w / 2, 110);
      ctx.font = '500 34px Caveat, cursive'; ctx.fillText('Sept. 14th', w / 2, 160);
      ctx.font = '500 26px Caveat, cursive'; ctx.fillText('Love you, Daddy xx', w / 2, 230);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.font = '12px Arial'; ctx.fillText('KODAK PAPER', w / 2, h - 20);
      T.grunge(ctx, w, h, 0.3, 45);
    });
  };

  T.stainedGlass = function (seed, motif) {
    const W = 256, H = 512;
    return T.canvasTex(W, H, (ctx) => {
      const r = U.rng(seed);
      const img = ctx.createImageData(W, H), d = img.data;
      const pal = [[170, 30, 30], [30, 60, 170], [200, 150, 40], [30, 120, 70], [120, 40, 140], [40, 110, 170], [190, 90, 30]];
      const pts = [];
      for (let y = 0; y < H; y += 44) for (let x = 0; x < W; x += 44) pts.push([x + r() * 44, y + r() * 44, pal[Math.floor(r() * pal.length)], 0.7 + r() * 0.5]);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let d1 = 1e9, d2 = 1e9, best = null;
        for (const p of pts) {
          const dx = x - p[0], dy = y - p[1];
          if (Math.abs(dx) > 100 || Math.abs(dy) > 100) continue;
          const dd = dx * dx + dy * dy;
          if (dd < d1) { d2 = d1; d1 = dd; best = p; } else if (dd < d2) d2 = dd;
        }
        const i = (y * W + x) * 4;
        const lead = Math.sqrt(d2) - Math.sqrt(d1) < 3.2;
        const n = 0.8 + Math.random() * 0.25;
        if (lead || !best) { d[i] = d[i + 1] = d[i + 2] = 18; }
        else { d[i] = best[2][0] * best[3] * n; d[i + 1] = best[2][1] * best[3] * n; d[i + 2] = best[2][2] * best[3] * n; }
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      // motif
      ctx.save();
      ctx.translate(W / 2, H * 0.52);
      ctx.fillStyle = '#e9d9a0'; ctx.strokeStyle = '#141414'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 78, 0, Math.PI * 2); ctx.fillStyle = '#1f3f8a'; ctx.fill(); ctx.stroke();
      if (motif === 'ship') {
        ctx.fillStyle = '#6b3b1a'; ctx.beginPath(); ctx.moveTo(-55, 20); ctx.lineTo(55, 20); ctx.lineTo(38, 42); ctx.lineTo(-38, 42); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#efe6c8'; ctx.beginPath(); ctx.moveTo(-4, -58); ctx.lineTo(-4, 14); ctx.lineTo(-46, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, -50); ctx.lineTo(4, 14); ctx.lineTo(40, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#8fc4e8'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-70, 54); ctx.quadraticCurveTo(-35, 44, 0, 54); ctx.quadraticCurveTo(35, 64, 70, 54); ctx.stroke();
      } else if (motif === 'anchor') {
        T.drawSymbol(ctx, 'anchor', 0, 0, 60, '#e8d69a');
      } else if (motif === 'lighthouse') {
        ctx.fillStyle = '#efe6c8'; ctx.beginPath(); ctx.moveTo(-14, 50); ctx.lineTo(14, 50); ctx.lineTo(8, -34); ctx.lineTo(-8, -34); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b3322a'; ctx.fillRect(-12, 10, 24, 12); ctx.fillRect(-10, -16, 20, 10);
        ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(8, -46); ctx.lineTo(74, -70); ctx.lineTo(74, -24); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe27a'; ctx.fillRect(-9, -46, 18, 12); ctx.strokeRect(-9, -46, 18, 12);
      } else {
        ctx.fillStyle = '#f0dc8c'; ctx.fillRect(-7, -60, 14, 120); ctx.fillRect(-40, -30, 80, 14); ctx.strokeRect(-7, -60, 14, 120); ctx.strokeRect(-40, -30, 80, 14);
      }
      ctx.restore();
      // pointed arch mask: everything outside the arch is dark stone
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      const m = 10;
      ctx.moveTo(m, H - m); ctx.lineTo(m, H * 0.3);
      ctx.quadraticCurveTo(m, m, W / 2, m);
      ctx.quadraticCurveTo(W - m, m, W - m, H * 0.3);
      ctx.lineTo(W - m, H - m); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#141210'; ctx.fillRect(0, 0, W, H); ctx.restore();
      // outline lead
      ctx.strokeStyle = '#0c0c0c'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(m, H - m); ctx.lineTo(m, H * 0.3); ctx.quadraticCurveTo(m, m, W / 2, m); ctx.quadraticCurveTo(W - m, m, W - m, H * 0.3); ctx.lineTo(W - m, H - m); ctx.closePath(); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); for (let y = 70; y < H; y += 90) { ctx.moveTo(m, y); ctx.lineTo(W - m, y); } ctx.stroke();
    });
  };

  T.roseWindow = function () {
    const S = 512;
    return T.canvasTex(S, S, (ctx) => {
      ctx.fillStyle = '#121010'; ctx.fillRect(0, 0, S, S);
      const c = S / 2;
      const cols = ['#b22222', '#1e40a0', '#d4a020', '#1e7a4a', '#7a2a90', '#2a78b0'];
      for (let ring = 3; ring >= 0; ring--) {
        const r1 = 60 + ring * 55, n = 8 + ring * 4;
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2;
          ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, r1, a0, a1); ctx.closePath();
          ctx.fillStyle = cols[(k + ring * 2) % cols.length]; ctx.fill();
          ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 5; ctx.stroke();
        }
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(c + Math.cos(a) * 120, c + Math.sin(a) * 120, 34, 0, Math.PI * 2);
        ctx.fillStyle = k % 2 ? '#e0b83a' : '#c33a2a'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(c, c, 54, 0, Math.PI * 2); ctx.fillStyle = '#f0e2a0'; ctx.fill(); ctx.lineWidth = 7; ctx.stroke();
      T.drawSymbol(ctx, 'star', c, c, 38, '#c9302a');
      // outer ring mask
      ctx.save(); ctx.globalCompositeOperation = 'destination-in'; ctx.beginPath(); ctx.arc(c, c, 245, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#121010'; ctx.fillRect(0, 0, S, S); ctx.restore();
      ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(c, c, 245, 0, Math.PI * 2); ctx.stroke();
    });
  };

  T.gauge = function (label, max, redFrom, unit) {
    return T.canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 6; ctx.stroke();
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      ctx.lineWidth = 14; ctx.strokeStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(128, 128, 96, a0 + (a1 - a0) * (redFrom / max), a1); ctx.stroke();
      ctx.strokeStyle = '#111'; ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 20px Oswald, Arial';
      for (let v = 0; v <= max; v += max / 8) {
        const a = a0 + (a1 - a0) * (v / max);
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); ctx.lineTo(128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88); ctx.stroke();
        ctx.fillText(String(v), 128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70);
      }
      ctx.font = '600 22px Oswald, Arial'; ctx.fillText(label, 128, 178);
      ctx.font = '16px Oswald, Arial'; ctx.fillText(unit, 128, 202);
      T.grunge(ctx, w, h, 0.2, 9);
    });
  };

  T.calendar = function () {
    return T.canvasTex(256, 320, (ctx, w, h) => {
      ctx.fillStyle = '#e6e0cf'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#7a1f1a'; ctx.fillRect(0, 0, w, 60);
      ctx.fillStyle = '#f4ecd8'; ctx.font = '700 30px Oswald, Arial'; ctx.textAlign = 'center'; ctx.fillText('OCTOBER 1971', w / 2, 42);
      ctx.fillStyle = '#333'; ctx.font = '16px Oswald, Arial';
      const days = 31, start = 5;
      for (let d = 0; d < days; d++) {
        const c = (d + start) % 7, r = Math.floor((d + start) / 7);
        const x = 22 + c * 33, y = 96 + r * 42;
        ctx.fillStyle = '#333'; ctx.fillText(String(d + 1), x + 8, y);
        if (d < 12) { ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 4, y - 18); ctx.lineTo(x + 20, y + 6); ctx.moveTo(x + 20, y - 18); ctx.lineTo(x - 4, y + 6); ctx.stroke(); }
        if (d === 12) { ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 8, y - 6, 16, 0, Math.PI * 2); ctx.stroke(); }
      }
      T.grunge(ctx, w, h, 0.35, 5);
    });
  };

  T.postcard = function () {
    return T.canvasTex(320, 220, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#f2b36b'); g.addColorStop(0.55, '#e7d7a8'); g.addColorStop(0.56, '#3f6f8f'); g.addColorStop(1, '#244a66');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#6b5a4a'; ctx.beginPath(); ctx.moveTo(170, h * 0.56); ctx.lineTo(320, h * 0.46); ctx.lineTo(320, h * 0.62); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f4f0e6'; ctx.beginPath(); ctx.moveTo(240, h * 0.5); ctx.lineTo(262, h * 0.5); ctx.lineTo(256, 40); ctx.lineTo(246, 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b3322a'; ctx.fillRect(244, 80, 16, 10); ctx.fillRect(245, 56, 14, 8);
      ctx.fillStyle = '#ffe89a'; ctx.fillRect(245, 30, 12, 10);
      ctx.fillStyle = 'rgba(40,20,10,.8)'; ctx.font = 'italic 700 24px Georgia'; ctx.fillText('Greetings from', 18, 34);
      ctx.font = '700 30px Georgia'; ctx.fillText('Crescent Bay', 18, 66);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, w, h);
      T.grunge(ctx, w, h, 0.4, 12);
    });
  };

  T.tally = function () {
    return T.canvasTex(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(30,26,22,.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const r = U.rng(3);
      for (let g = 0; g < 14; g++) {
        const gx = 10 + (g % 5) * 48, gy = 12 + Math.floor(g / 5) * 60;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(gx + k * 8 + r() * 2, gy + r() * 3); ctx.lineTo(gx + k * 8 + r() * 3, gy + 40 + r() * 3); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(gx - 4, gy + 34); ctx.lineTo(gx + 32, gy + 6); ctx.stroke();
      }
      ctx.font = '26px Caveat, cursive'; ctx.fillStyle = 'rgba(30,26,22,.8)'; ctx.fillText('T.H. 1941 -', 20, 236);
    });
  };

  T.boatDoodle = function () {
    return T.canvasTex(256, 200, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(25,22,20,.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(50, 120); ctx.lineTo(200, 120); ctx.lineTo(180, 150); ctx.lineTo(70, 150); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(125, 120); ctx.lineTo(125, 40); ctx.lineTo(180, 110); ctx.lineTo(125, 110); ctx.stroke();
      ctx.beginPath(); for (let x = 20; x < 240; x += 30) { ctx.moveTo(x, 165); ctx.quadraticCurveTo(x + 15, 155, x + 30, 165); } ctx.stroke();
      ctx.beginPath(); ctx.arc(215, 45, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '24px Caveat, cursive'; ctx.fillStyle = 'rgba(25,22,20,.85)'; ctx.fillText('soon', 30, 40);
    });
  };

  T.newspaper = function () {
    return T.canvasTex(256, 340, (ctx, w, h) => {
      ctx.fillStyle = '#d9d1bc'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#222'; ctx.textAlign = 'center';
      ctx.font = '700 15px Georgia'; ctx.fillText('THE HARBOR COURIER', w / 2, 24);
      ctx.fillRect(12, 32, w - 24, 2);
      ctx.font = '700 30px Oswald, Arial'; ctx.fillText('NO ESCAPE', w / 2, 70); ctx.fillText('FROM THE ROCK', w / 2, 104);
      ctx.font = 'italic 12px Georgia'; ctx.fillText('Warden: "Not in 38 years, not ever."', w / 2, 126);
      ctx.fillStyle = '#555'; ctx.fillRect(14, 138, 110, 80);
      ctx.fillStyle = '#444';
      for (let y = 140; y < h - 12; y += 7) {
        if (y < 222) ctx.fillRect(132, y, 110 - Math.random() * 20, 3);
        else { ctx.fillRect(14, y, 108 - Math.random() * 14, 3); ctx.fillRect(134, y, 108 - Math.random() * 14, 3); }
      }
      T.grunge(ctx, w, h, 0.45, 21);
    });
  };

  T.mapPaper = function () {
    return T.canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#d8cba8'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#3b3326'; ctx.lineWidth = 2;
      ctx.strokeRect(30, 40, 80, 50); ctx.strokeRect(110, 30, 40, 90); ctx.strokeRect(150, 70, 70, 110); ctx.strokeRect(40, 150, 60, 60);
      ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(70, 65); ctx.lineTo(130, 75); ctx.lineTo(185, 125); ctx.lineTo(220, 220); ctx.stroke();
      ctx.setLineDash([]); ctx.font = '22px Caveat, cursive'; ctx.fillStyle = '#3b3326'; ctx.fillText('X', 215, 230);
      T.grunge(ctx, w, h, 0.4, 31);
    });
  };

  T.bookSpine = function (title, color) {
    return T.canvasTex(64, 256, (ctx, w, h) => {
      ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,230,160,.8)'; ctx.fillRect(0, 18, w, 3); ctx.fillRect(0, h - 22, w, 3);
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(Math.PI / 2);
      ctx.font = '600 20px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(title, 0, 0); ctx.restore();
      T.grunge(ctx, w, h, 0.4, title.length);
    });
  };

  T.label = function (text, opt = {}) {
    return T.sign(text, Object.assign({ w: 256, h: 64, bg: '#e9e4d4', fg: '#1a1a1a', font: '"IBM Plex Mono", monospace', weight: 600, grunge: 0.15 }, opt));
  };

  // ------------------------------------------------------------------ materials
  const M = (G.M = {});
  function std(set, size, opts = {}) {
    const o = Object.assign({}, opts);
    const ns = o.normalScale, useMetal = o.useMetalMap;
    delete o.normalScale; delete o.useMetalMap;
    const m = new THREE.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 1, metalness: 0 }, o));
    if (set) {
      const rep = 1 / size;
      const clone = (t) => { if (!t) return null; const c = t.clone(); c.repeat.set(rep, rep); c.needsUpdate = true; return c; };
      m.map = clone(set.map);
      m.normalMap = clone(set.normalMap);
      m.roughnessMap = clone(set.roughnessMap);
      if (useMetal) m.metalnessMap = clone(set.metalnessMap);
      if (ns) m.normalScale = new THREE.Vector2(ns, ns);
    }
    m.userData.texSize = size;
    return m;
  }
  T.std = std;
  M.std = std;

  // Build all textures + materials. Yields between heavy steps so the loading bar animates.
  T.buildAll = async function (progress) {
    const steps = [];
    const S = {};
    const add = (label, fn) => steps.push([label, fn]);
    add('Pouring concrete', () => { S.concrete = T.concrete(1, [0.47, 0.46, 0.44]); S.concreteWet = T.concrete(2, [0.4, 0.4, 0.4], { wet: true, stain: 1.4 }); S.ceiling = T.concrete(3, [0.62, 0.61, 0.58], { stain: 0.6 }); });
    add('Painting cinder blocks', () => { S.blockGreen = T.block([0.28, 0.4, 0.32], 11, { peel: 0.84 }); S.blockCream = T.block([0.74, 0.7, 0.58], 12, { peel: 0.82 }); S.blockGray = T.block([0.5, 0.5, 0.49], 13, { peel: 2 }); S.blockWhite = T.block([0.8, 0.8, 0.77], 14, { peel: 0.82 }); });
    add('Forging steel', () => { S.metalDark = T.metal([0.2, 0.22, 0.24], 0.5, 21); S.metalGreen = T.metal([0.22, 0.33, 0.27], 0.6, 22); S.metalGray = T.metal([0.45, 0.46, 0.47], 0.3, 23, { scratches: 40 }); S.metalRed = T.metal([0.5, 0.1, 0.08], 0.4, 24); });
    add('Rusting iron', () => { S.rust = T.metal([0.3, 0.16, 0.09], 1.8, 25, { rough: 0.8, scratches: 10 }); S.plate = T.diamondPlate(26); S.hazard = T.hazard(); });
    add('Sawing timber', () => { S.wood = T.wood([0.45, 0.3, 0.17], 31); S.woodDark = T.wood([0.24, 0.13, 0.07], 32, { rough: 0.42, planks: 3 }); S.woodOld = T.wood([0.38, 0.33, 0.27], 33, { rough: 0.8, planks: 5 }); });
    add('Laying floors', () => { S.checker = T.checker([0.11, 0.15, 0.13], [0.62, 0.6, 0.52], 41); S.tile = T.tile([0.8, 0.8, 0.75], [0.42, 0.42, 0.4], 42); S.tileGreen = T.tile([0.42, 0.55, 0.5], [0.35, 0.36, 0.34], 43, 8); });
    add('Cutting stone', () => { S.stone = T.stone(51); S.brick = T.brick(52); });
    add('Carving rock', () => { S.rock = T.rock(61, { wet: true }); S.mud = T.mud(62); S.asphalt = T.asphalt(63); });
    add('Weaving fabric', () => { S.blanket = T.fabric([0.3, 0.33, 0.31], 71); S.mattress = T.fabric([0.78, 0.76, 0.7], 72, { stripes: [0.28, 0.33, 0.5] }); S.cloth = T.fabric([0.75, 0.73, 0.68], 73); S.paper = T.paperSet(74); });
    add('Stirring the sea', () => { S.waterN = T.waterNormal(); });

    for (let k = 0; k < steps.length; k++) {
      progress && progress(k / steps.length, steps[k][0]);
      await new Promise((r) => setTimeout(r, 0));
      steps[k][1]();
    }
    T.sets = S;

    // materials
    M.concrete = std(S.concrete, 3, { normalScale: 0.8 });
    M.concreteWet = std(S.concreteWet, 3.2, { normalScale: 0.8 });
    M.ceiling = std(S.ceiling, 3, { normalScale: 0.5 });
    M.wallGreen = std(S.blockGreen, 1.6, { normalScale: 0.9 });
    M.wallCream = std(S.blockCream, 1.6, { normalScale: 0.9 });
    M.wallGray = std(S.blockGray, 1.6, { normalScale: 1 });
    M.wallWhite = std(S.blockWhite, 1.6, { normalScale: 0.8 });
    M.metalDark = std(S.metalDark, 1.2, { metalness: 0.6, useMetalMap: true });
    M.bars = std(S.metalDark, 0.8, { metalness: 0.7, useMetalMap: true, color: 0x9aa0a8 });
    M.metalGreen = std(S.metalGreen, 1.5, { metalness: 0.5, useMetalMap: true });
    M.metalGray = std(S.metalGray, 1.2, { metalness: 0.6, useMetalMap: true });
    M.metalRed = std(S.metalRed, 1.2, { metalness: 0.5, useMetalMap: true });
    M.rust = std(S.rust, 1.2, { metalness: 0.4, useMetalMap: true });
    M.plate = std(S.plate, 0.6, { metalness: 1, useMetalMap: true });
    M.hazard = std(S.hazard, 0.6);
    M.wood = std(S.wood, 1, { normalScale: 0.6 });
    M.woodDark = std(S.woodDark, 1.2, { normalScale: 0.5 });
    M.woodOld = std(S.woodOld, 1.2, { normalScale: 1 });
    M.checker = std(S.checker, 1.2, { normalScale: 0.4 });
    M.tile = std(S.tile, 0.6, { normalScale: 0.6 });
    M.tileGreen = std(S.tileGreen, 0.8, { normalScale: 0.6 });
    M.stone = std(S.stone, 2.2, { normalScale: 1.2 });
    M.stoneFloor = std(S.stone, 2.6, { normalScale: 1, color: 0xb8b0a4 });
    M.stoneWet = std(S.stone, 2.2, { normalScale: 1.3, color: 0x9a948c, roughness: 0.55 });
    M.brick = std(S.brick, 0.9, { normalScale: 1.1 });
    M.brickWet = std(S.brick, 0.9, { normalScale: 1.1, color: 0x8a8480, roughness: 0.6 });
    M.rock = std(S.rock, 4, { normalScale: 1.4 });
    M.rockDark = std(S.rock, 3, { normalScale: 1.4, color: 0x8a8580 });
    M.mud = std(S.mud, 4, { normalScale: 1 });
    M.asphalt = std(S.asphalt, 3, { normalScale: 0.6 });
    M.blanket = std(S.blanket, 0.6);
    M.mattress = std(S.mattress, 0.8);
    M.cloth = std(S.cloth, 0.5);
    M.paper = std(S.paper, 0.3);
    M.steel = new THREE.MeshStandardMaterial({ color: 0xc4c8cc, metalness: 0.55, roughness: 0.38, map: S.metalGray.map });
    M.steel.userData.fixedEnv = false;
    M.chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.15 });
    M.brass = new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 1, roughness: 0.32 });
    M.copper = new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: 0.4 });
    M.black = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 });
    M.rubber = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    M.plastic = new THREE.MeshStandardMaterial({ color: 0x222426, roughness: 0.45 });
    M.bakelite = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.35 });
    M.white = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.6 });
    M.orange = new THREE.MeshStandardMaterial({ color: 0xc85a18, roughness: 0.6 });
    M.redPaint = new THREE.MeshStandardMaterial({ color: 0x8a1c14, roughness: 0.5 });
    M.yellowPaint = new THREE.MeshStandardMaterial({ color: 0xb8901c, roughness: 0.55 });
    M.bone = new THREE.MeshStandardMaterial({ color: 0xa89a7c, roughness: 0.8 });
    M.rope = new THREE.MeshStandardMaterial({ color: 0x8a7550, roughness: 0.95 });
    M.skin = new THREE.MeshStandardMaterial({ color: 0x9a7560, roughness: 0.7 });
    M.glass = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18, depthWrite: false });
    M.glassDirty = new THREE.MeshStandardMaterial({ color: 0x7f8a80, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false });
    M.invisible = new THREE.MeshBasicMaterial({ visible: false });
  };
})();
