// audio.js — fully synthesized sound effects, ambience and spatial audio (Web Audio API)
(function () {
  'use strict';
  const G = window.G, U = G.U;
  const A = (G.audio = { ready: false });
  let ctx, master, comp, buses = {}, noise = {};
  let convA, convB, gA, gB, useA = true, curReverb = null;
  const IR = {};

  // ------------------------------------------------------------------ init
  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = A.ctx = new AC();
    master = ctx.createGain();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    ['music', 'sfx', 'amb', 'ui', 'voice'].forEach((b) => { buses[b] = ctx.createGain(); buses[b].connect(master); });
    A.buses = buses;
    // noise buffers (4 s)
    const len = ctx.sampleRate * 4;
    ['white', 'pink', 'brown'].forEach((type) => {
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          if (type === 'white') d[i] = w;
          else if (type === 'pink') {
            b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
            b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
            d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
          } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
        }
      }
      noise[type] = buf;
    });
    // reverb
    A.reverbIn = ctx.createGain();
    convA = ctx.createConvolver(); convB = ctx.createConvolver();
    gA = ctx.createGain(); gB = ctx.createGain(); gB.gain.value = 0;
    A.reverbIn.connect(convA); A.reverbIn.connect(convB);
    convA.connect(gA); convB.connect(gB);
    const wet = ctx.createGain(); wet.gain.value = 0.9;
    gA.connect(wet); gB.connect(wet); wet.connect(master);
    const presets = { cell: [0.7, 3.5, 0.5], block: [1.8, 2.6, 0.45], hall: [2.8, 2.2, 0.4], small: [0.5, 4, 0.5], chapel: [5.5, 1.6, 0.35], tunnel: [3.2, 1.9, 0.3], cave: [5, 1.5, 0.25], outdoor: [1.2, 4, 0.6], sea: [2.5, 3, 0.5], music: [4.5, 1.8, 0.4] };
    Object.keys(presets).forEach((k) => (IR[k] = makeIR(...presets[k])));
    convA.buffer = IR.cell; curReverb = 'cell';
    // music reverb (independent)
    A.musicReverb = ctx.createConvolver(); A.musicReverb.buffer = IR.music;
    const mr = ctx.createGain(); mr.gain.value = 0.8;
    A.musicReverb.connect(mr); mr.connect(buses.music);
    A.ready = true;
    A.applyVolumes();
    ambInit();
  };

  function makeIR(dur, decay, bright) {
    const rate = ctx.sampleRate, len = Math.floor(rate * dur);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const k = bright * (1 - t * 0.85) + 0.02; // darker tail
        lp += (Math.random() * 2 - 1 - lp) * k;
        d[i] = lp * Math.pow(1 - t, decay) * (i < rate * 0.004 ? i / (rate * 0.004) : 1);
      }
      // early reflections
      for (let e = 0; e < 6; e++) {
        const idx = Math.floor(rate * (0.008 + Math.random() * 0.05 * Math.min(1, dur)));
        if (idx < len) d[idx] += (Math.random() < 0.5 ? -1 : 1) * 0.5 * (1 - e / 6);
      }
    }
    return buf;
  }

  A.applyVolumes = function () {
    if (!ctx) return;
    const s = G.settings;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(s.master * 0.9, t, 0.05);
    buses.music.gain.setTargetAtTime(s.music * 0.8, t, 0.05);
    buses.sfx.gain.setTargetAtTime(s.sfx, t, 0.05);
    buses.amb.gain.setTargetAtTime(s.sfx * 0.9, t, 0.05);
    buses.ui.gain.setTargetAtTime(s.sfx * 0.8, t, 0.05);
    buses.voice.gain.setTargetAtTime(s.sfx, t, 0.05);
  };
  G.on('settings', () => A.applyVolumes());

  A.setReverb = function (name) {
    if (!ctx || !IR[name] || name === curReverb) return;
    curReverb = name;
    const t = ctx.currentTime;
    if (useA) { convB.buffer = IR[name]; gB.gain.setTargetAtTime(1, t, 0.4); gA.gain.setTargetAtTime(0, t, 0.4); }
    else { convA.buffer = IR[name]; gA.gain.setTargetAtTime(1, t, 0.4); gB.gain.setTargetAtTime(0, t, 0.4); }
    useA = !useA;
  };

  A.suspend = (v) => { if (!ctx) return; if (v) ctx.suspend(); else ctx.resume(); };
  A.now = () => (ctx ? ctx.currentTime : 0);

  // master "muffle" (e.g. while paused / underwater) via duck
  A.duck = function (amount, time = 0.3) {
    if (!ctx) return;
    master.gain.setTargetAtTime(G.settings.master * 0.9 * (1 - amount), ctx.currentTime, time);
  };

  // ------------------------------------------------------------------ listener
  const _f = new window.THREE.Vector3(), _u = new window.THREE.Vector3();
  A.updateListener = function (cam) {
    if (!ctx) return;
    const L = ctx.listener, p = cam.getWorldPosition(new window.THREE.Vector3());
    cam.getWorldDirection(_f);
    _u.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const t = ctx.currentTime;
    if (L.positionX) {
      L.positionX.setTargetAtTime(p.x, t, 0.02); L.positionY.setTargetAtTime(p.y, t, 0.02); L.positionZ.setTargetAtTime(p.z, t, 0.02);
      L.forwardX.setTargetAtTime(_f.x, t, 0.02); L.forwardY.setTargetAtTime(_f.y, t, 0.02); L.forwardZ.setTargetAtTime(_f.z, t, 0.02);
      L.upX.setTargetAtTime(_u.x, t, 0.02); L.upY.setTargetAtTime(_u.y, t, 0.02); L.upZ.setTargetAtTime(_u.z, t, 0.02);
    } else {
      L.setPosition(p.x, p.y, p.z);
      L.setOrientation(_f.x, _f.y, _f.z, _u.x, _u.y, _u.z);
    }
    A.listenerPos = p;
  };

  // ------------------------------------------------------------------ node helpers
  const gn = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const flt = (type, f, q) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q !== undefined) b.Q.value = q; return b; };
  const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const nz = (kind = 'white', loop = false) => { const s = ctx.createBufferSource(); s.buffer = noise[kind]; s.loop = loop; return s; };
  const startN = (s, t, dur) => { s.start(t, Math.random() * 3); if (dur) s.stop(t + dur); };
  function perc(g, t, peak, a, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function setPos(p, pos) {
    const x = pos.x ?? pos[0], y = pos.y ?? pos[1], z = pos.z ?? pos[2];
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
  }
  let distCurve = null;
  function shaper(amount) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
    const w = ctx.createWaveShaper(); w.curve = c; return w;
  }
  A.helpers = { gn, flt, osc, nz, startN, perc, shaper };

  // Output chain: gain -> [panner] -> bus (+ reverb send)
  function output(o = {}) {
    const g = gn(o.vol ?? 1);
    let last = g, panner = null;
    if (o.pos) {
      panner = ctx.createPanner();
      panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
      panner.refDistance = o.ref || 1.5; panner.rolloffFactor = o.roll ?? 1.3; panner.maxDistance = 500;
      setPos(panner, o.pos);
      g.connect(panner); last = panner;
    }
    let muff = null;
    if (o.muffle) { muff = flt('lowpass', o.muffle, 0.7); last.connect(muff); last = muff; }
    last.connect(buses[o.bus || 'sfx']);
    const wet = o.wet ?? 0.35;
    let send = null;
    if (wet > 0) { send = gn(wet); last.connect(send); send.connect(A.reverbIn); }
    return { input: g, gain: g, panner, send, muff };
  }
  A.output = output;

  // ------------------------------------------------------------------ one-shot library
  const S = {};
  A.play = function (name, o = {}) {
    if (!A.ready || !S[name]) return null;
    try {
      const out = output(o);
      const t = ctx.currentTime + (o.delay || 0);
      S[name](t, out.input, o);
      return out;
    } catch (e) { console.warn('sound', name, e); return null; }
  };

  S.click = (t, out, o) => {
    const b = osc('square', o.freq || 1800), g = gn(0), f = flt('bandpass', o.freq || 1800, 2);
    b.connect(f); f.connect(g); g.connect(out); perc(g, t, 0.25, 0.001, 0.03); b.start(t); b.stop(t + 0.05);
    const n = nz(), ng = gn(0), hp = flt('highpass', 3000); n.connect(hp); hp.connect(ng); ng.connect(out); perc(ng, t, 0.3, 0.001, 0.02); startN(n, t, 0.05);
  };
  S.tick = (t, out, o) => {
    const n = nz(), f = flt('bandpass', o.freq || 4200, 3), g = gn(0);
    n.connect(f); f.connect(g); g.connect(out); perc(g, t, 0.6, 0.001, 0.025); startN(n, t, 0.05);
    const r = osc('sine', (o.freq || 4200) * 0.55), rg = gn(0); r.connect(rg); rg.connect(out); perc(rg, t, 0.08, 0.001, 0.06); r.start(t); r.stop(t + 0.1);
  };
  S.uiHover = (t, out) => { const b = osc('sine', 1400), g = gn(0); b.connect(g); g.connect(out); perc(g, t, 0.05, 0.005, 0.06); b.start(t); b.stop(t + 0.1); };
  S.uiClick = (t, out) => {
    [880, 1320].forEach((f, k) => { const b = osc('triangle', f), g = gn(0); b.connect(g); g.connect(out); perc(g, t + k * 0.05, 0.12, 0.004, 0.18); b.start(t + k * 0.05); b.stop(t + k * 0.05 + 0.3); });
  };
  S.uiBack = (t, out) => {
    [1100, 740].forEach((f, k) => { const b = osc('triangle', f), g = gn(0); b.connect(g); g.connect(out); perc(g, t + k * 0.05, 0.1, 0.004, 0.16); b.start(t + k * 0.05); b.stop(t + k * 0.05 + 0.3); });
  };
  S.pickup = (t, out) => {
    const n = nz('pink'), f = flt('bandpass', 1200, 0.8), g = gn(0);
    n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.25);
    startN(n, t, 0.35);
    [1046.5, 1568, 2093].forEach((fr, k) => {
      const b = osc('sine', fr), b2 = osc('triangle', fr * 2.01), g2 = gn(0), g3 = gn(0.15);
      b.connect(g2); b2.connect(g3); g3.connect(g2); g2.connect(out);
      perc(g2, t + 0.08 + k * 0.07, 0.12, 0.005, 0.7);
      b.start(t + 0.08 + k * 0.07); b.stop(t + 1.2); b2.start(t + 0.08 + k * 0.07); b2.stop(t + 1.2);
    });
  };
  S.solve = (t, out) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((fr, k) => {
      const b = osc('sine', fr), g2 = gn(0), b2 = osc('sine', fr * 3.01), g3 = gn(0.08);
      b.connect(g2); b2.connect(g3); g3.connect(g2); g2.connect(out);
      perc(g2, t + k * 0.09, 0.14, 0.01, 1.6);
      b.start(t + k * 0.09); b.stop(t + 2); b2.start(t + k * 0.09); b2.stop(t + 2);
    });
    const n = nz('pink'), f = flt('highpass', 5000), g = gn(0); n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); startN(n, t, 2);
  };
  S.paper = (t, out) => {
    const n = nz(), f = flt('bandpass', 3500, 0.7), g = gn(0);
    n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t);
    let tt = t;
    for (let k = 0; k < 7; k++) { g.gain.linearRampToValueAtTime(U.range(0.05, 0.22), tt + 0.02); g.gain.linearRampToValueAtTime(0.01, tt + 0.05); tt += U.range(0.03, 0.08); }
    g.gain.linearRampToValueAtTime(0.0001, tt + 0.1);
    startN(n, t, tt - t + 0.2);
  };

  S.step = (t, out, o) => {
    const s = o.surface || 'concrete', v = o.intensity ?? 1;
    const fc = { concrete: 1300, metal: 2400, wood: 650, water: 1600, mud: 420, stone: 1500, plate: 2800 }[s] || 1300;
    const n = nz(), bp = flt('bandpass', fc * U.range(0.8, 1.25), 0.9), g = gn(0);
    n.connect(bp); bp.connect(g); g.connect(out);
    const dur = s === 'water' ? 0.22 : s === 'mud' ? 0.2 : 0.085;
    perc(g, t, 0.55 * v, 0.004, dur);
    startN(n, t, dur + 0.05);
    const grit = nz(), hp = flt('highpass', 4000), gg = gn(0); grit.connect(hp); hp.connect(gg); gg.connect(out);
    perc(gg, t + 0.01, (s === 'concrete' || s === 'stone' ? 0.12 : 0.04) * v, 0.002, 0.04); startN(grit, t, 0.08);
    const th = osc('sine', U.range(65, 95)), tg = gn(0);
    th.connect(tg); tg.connect(out);
    perc(tg, t, (s === 'wood' ? 0.45 : 0.3) * v, 0.003, 0.08);
    th.frequency.exponentialRampToValueAtTime(38, t + 0.09); th.start(t); th.stop(t + 0.12);
    if (s === 'metal' || s === 'plate') {
      [520, 1130, 1870, 2750].forEach((f) => { const r = osc('sine', f * U.range(0.97, 1.03)), rg = gn(0); r.connect(rg); rg.connect(out); perc(rg, t, 0.035 * v, 0.002, 0.25); r.start(t); r.stop(t + 0.3); });
    }
    if (s === 'water' || s === 'mud') {
      const sp = nz(), sf = flt(s === 'water' ? 'highpass' : 'bandpass', s === 'water' ? 2000 : 900, 1), sg = gn(0);
      sp.connect(sf); sf.connect(sg); sg.connect(out);
      sg.gain.setValueAtTime(0.0001, t + 0.02); sg.gain.exponentialRampToValueAtTime(0.25 * v, t + 0.05); sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      if (s === 'mud') { sf.frequency.setValueAtTime(400, t); sf.frequency.exponentialRampToValueAtTime(1400, t + 0.2); }
      startN(sp, t, 0.4);
    }
  };

  S.thunder = (t, out, o) => {
    const d = o.dist ?? 0.5;
    if (d < 0.45) {
      const c = nz(), hp = flt('highpass', 600), cg = gn(0);
      c.connect(hp); hp.connect(cg); cg.connect(out);
      perc(cg, t, 0.9 * (1 - d), 0.003, 0.5);
      startN(c, t, 0.7);
    }
    const len = 5 + Math.random() * 4 + d * 2;
    [0, 1].forEach((ch) => {
      const n = nz('brown'), lp = flt('lowpass', 180 + (1 - d) * 320, 0.6), g = gn(0), pan = ctx.createStereoPanner();
      pan.pan.value = ch ? 0.5 : -0.5;
      n.connect(lp); lp.connect(g); g.connect(pan); pan.connect(out);
      g.gain.setValueAtTime(0.0001, t);
      let tt = t + 0.05 + d * 0.4;
      g.gain.linearRampToValueAtTime((1 - d * 0.55) * U.range(0.7, 1), tt);
      const peaks = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < peaks; k++) { tt += U.range(0.25, 1.1); g.gain.linearRampToValueAtTime(U.range(0.25, 0.85) * (1 - d * 0.5) * (1 - k / (peaks + 2)), tt); }
      g.gain.exponentialRampToValueAtTime(0.0005, t + len);
      lp.frequency.setTargetAtTime(90, t + 1, len * 0.3);
      startN(n, t, len + 0.2);
    });
  };

  S.drip = (t, out, o) => {
    const f0 = o.freq || U.range(1400, 2600);
    const b = osc('sine', f0), g = gn(0);
    b.connect(g); g.connect(out);
    b.frequency.setValueAtTime(f0 * 0.6, t); b.frequency.exponentialRampToValueAtTime(f0, t + 0.012); b.frequency.exponentialRampToValueAtTime(f0 * 1.4, t + 0.08);
    perc(g, t, 0.18 * (o.v ?? 1), 0.002, 0.09);
    b.start(t); b.stop(t + 0.15);
  };

  S.spark = (t, out, o) => {
    const dur = o.dur || 0.8;
    let tt = t;
    while (tt < t + dur) {
      const n = nz(), hp = flt('highpass', U.range(2000, 5000)), g = gn(0);
      n.connect(hp); hp.connect(g); g.connect(out);
      perc(g, tt, U.range(0.2, 0.7), 0.001, U.range(0.01, 0.05));
      startN(n, tt, 0.08);
      tt += U.range(0.015, 0.09);
    }
    const bz = osc('sawtooth', 120), bf = flt('bandpass', 900, 2), bg = gn(0);
    bz.connect(bf); bf.connect(bg); bg.connect(out);
    bg.gain.setValueAtTime(0.0001, t); bg.gain.exponentialRampToValueAtTime(0.2, t + 0.02); bg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    bz.start(t); bz.stop(t + dur + 0.1);
  };
  S.bang = (t, out, o) => {
    const n = nz(), lp = flt('lowpass', 3000), g = gn(0);
    n.connect(lp); lp.connect(g); g.connect(out);
    perc(g, t, o.v ?? 0.9, 0.002, 0.35); startN(n, t, 0.5);
    const b = osc('sine', 110), bg = gn(0); b.connect(bg); bg.connect(out);
    b.frequency.setValueAtTime(140, t); b.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    perc(bg, t, 0.8 * (o.v ?? 1), 0.002, 0.45); b.start(t); b.stop(t + 0.5);
  };
  S.clunk = (t, out, o) => {
    const v = o.v ?? 1;
    const b = osc('sine', o.freq || 90), bg = gn(0); b.connect(bg); bg.connect(out);
    b.frequency.exponentialRampToValueAtTime((o.freq || 90) * 0.5, t + 0.2);
    perc(bg, t, 0.7 * v, 0.002, 0.25); b.start(t); b.stop(t + 0.3);
    const n = nz(), f = flt('bandpass', 700, 1.2), g = gn(0); n.connect(f); f.connect(g); g.connect(out);
    perc(g, t, 0.5 * v, 0.002, 0.08); startN(n, t, 0.15);
    metal(t, out, 0.12 * v, o.ring || 0.6, o.pitch || 1);
  };
  function metal(t, out, v, decay, pitch = 1) {
    [233, 587, 941, 1412, 2089, 2877].forEach((f, k) => {
      const r = osc('sine', f * pitch * U.range(0.985, 1.015)), g = gn(0);
      r.connect(g); g.connect(out);
      perc(g, t, v / (1 + k * 0.5), 0.002, decay * (1 - k * 0.1));
      r.start(t); r.stop(t + decay + 0.1);
    });
  }
  S.metalHit = (t, out, o) => {
    const n = nz(), f = flt('bandpass', 1800, 0.8), g = gn(0); n.connect(f); f.connect(g); g.connect(out);
    perc(g, t, 0.5 * (o.v ?? 1), 0.001, 0.06); startN(n, t, 0.1);
    metal(t, out, 0.25 * (o.v ?? 1), o.decay || 1.4, o.pitch || 1);
  };
  S.cellDoor = (t, out, o) => {
    const dur = o.dur || 1.8;
    const n = nz('brown'), bp = flt('bandpass', 260, 1.2), g = gn(0), am = gn(1), lfo = osc('square', 14), lg = gn(0.35);
    lfo.connect(lg); lg.connect(am.gain);
    n.connect(bp); bp.connect(am); am.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.15); g.gain.setValueAtTime(0.9, t + dur - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    startN(n, t, dur + 0.1); lfo.start(t); lfo.stop(t + dur);
    const sq = osc('sine', 1900), sg = gn(0), vib = osc('sine', 7), vg = gn(40);
    vib.connect(vg); vg.connect(sq.frequency); sq.connect(sg); sg.connect(out);
    sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.02, t + 0.4); sg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    sq.start(t); sq.stop(t + dur); vib.start(t); vib.stop(t + dur);
    S.clunk(t + dur, out, { v: 1, freq: 80, ring: 1.4 });
  };
  S.creak = (t, out, o) => {
    const dur = o.dur || 1.5;
    const src = osc('sawtooth', o.freq || 110), g = gn(0);
    const f1 = flt('bandpass', 900, 6), f2 = flt('bandpass', 1750, 8), mix = gn(1);
    src.connect(f1); src.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(g); g.connect(out);
    let tt = t;
    const base = o.freq || 110;
    g.gain.setValueAtTime(0.0001, t);
    while (tt < t + dur) {
      const seg = U.range(0.04, 0.14);
      src.frequency.setValueAtTime(base * U.range(0.6, 1.5), tt);
      g.gain.linearRampToValueAtTime(U.range(0.15, 0.5) * (o.v ?? 1), tt + seg * 0.3);
      g.gain.linearRampToValueAtTime(0.02, tt + seg);
      tt += seg;
    }
    g.gain.linearRampToValueAtTime(0.0001, tt + 0.05);
    src.start(t); src.stop(tt + 0.1);
  };
  S.unlock = (t, out) => {
    const n = nz(), f = flt('highpass', 2500), g = gn(0); n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); startN(n, t, 0.3);
    S.tick(t + 0.3, out, { freq: 2600 }); S.tick(t + 0.42, out, { freq: 2200 });
    S.clunk(t + 0.5, out, { v: 0.6, freq: 160, ring: 0.5, pitch: 1.6 });
  };
  S.padlock = (t, out) => { S.tick(t, out, { freq: 3000 }); S.clunk(t + 0.08, out, { v: 0.4, freq: 300, ring: 0.8, pitch: 2.2 }); };
  S.switch = (t, out, o) => {
    S.tick(t, out, { freq: o.freq || 2500 });
    const b = osc('sine', 180), g = gn(0); b.connect(g); g.connect(out); perc(g, t, 0.25, 0.001, 0.05); b.start(t); b.stop(t + 0.08);
  };
  S.breaker = (t, out, o) => {
    S.clunk(t, out, { v: 0.55, freq: 140, ring: 0.3, pitch: 1.8 });
    if (o.zap) S.spark(t, out, { dur: 0.15 });
  };
  S.buzz = (t, out, o) => {
    const dur = o.dur || 0.5;
    const b = osc('sawtooth', o.freq || 120), f = flt('bandpass', 1200, 1.5), g = gn(0);
    b.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15 * (o.v ?? 1), t + 0.02); g.gain.setValueAtTime(0.15 * (o.v ?? 1), t + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    b.start(t); b.stop(t + dur + 0.05);
  };
  S.fluoro = (t, out) => {
    for (let k = 0; k < 3; k++) S.tick(t + k * U.range(0.08, 0.2), out, { freq: U.range(3000, 5000) });
    S.buzz(t + 0.35, out, { dur: 0.25, freq: 100, v: 0.6 });
  };
  S.whoosh = (t, out, o) => {
    const dur = o.dur || 0.6;
    const n = nz('pink'), f = flt('bandpass', 400, 1), g = gn(0);
    n.connect(f); f.connect(g); g.connect(out);
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(o.to || 2500, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3 * (o.v ?? 1), t + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    startN(n, t, dur + 0.05);
  };
  S.splash = (t, out, o) => {
    const n = nz(), f = flt('bandpass', 1500, 0.6), g = gn(0);
    n.connect(f); f.connect(g); g.connect(out);
    perc(g, t, 0.5 * (o.v ?? 1), 0.01, 0.5);
    f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.3);
    startN(n, t, 0.7);
  };
  S.pour = (t, out, o) => {
    const dur = o.dur || 1.2;
    const n = nz(), f = flt('bandpass', 1400, 2), g = gn(0), lfo = osc('sine', 9), lg = gn(400);
    lfo.connect(lg); lg.connect(f.frequency);
    n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.1); g.gain.setValueAtTime(0.3, t + dur - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    startN(n, t, dur + 0.1); lfo.start(t); lfo.stop(t + dur);
  };
  S.pump = (t, out, o) => {
    const n = o.n || 5;
    for (let k = 0; k < n; k++) {
      const tt = t + k * 0.55;
      S.creak(tt, out, { dur: 0.22, freq: 140, v: 0.5 });
      S.pour(tt + 0.2, out, { dur: 0.3 });
    }
  };
  S.stone = (t, out, o) => {
    const dur = o.dur || 3;
    const n = nz('brown'), bp = flt('bandpass', 180, 0.8), g = gn(0), am = gn(1), lfo = osc('sawtooth', 5.5), lg = gn(0.5);
    lfo.connect(lg); lg.connect(am.gain);
    n.connect(bp); bp.connect(am); am.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.0 * (o.v ?? 1), t + 0.3); g.gain.setValueAtTime(1.0 * (o.v ?? 1), t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    startN(n, t, dur + 0.1); lfo.start(t); lfo.stop(t + dur);
    const gr = nz(), gf = flt('bandpass', 1200, 1.5), gg = gn(0); gr.connect(gf); gf.connect(gg); gg.connect(out);
    gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.12, t + 0.3); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur); startN(gr, t, dur);
    S.clunk(t + dur, out, { v: 1, freq: 55, ring: 0.2, pitch: 0.4 });
  };
  S.squeak = (t, out) => {
    for (let k = 0; k < 3; k++) {
      const tt = t + k * U.range(0.08, 0.16), b = osc('sine', U.range(3500, 5200)), g = gn(0);
      b.connect(g); g.connect(out);
      b.frequency.setValueAtTime(b.frequency.value, tt); b.frequency.exponentialRampToValueAtTime(b.frequency.value * 1.3, tt + 0.05);
      perc(g, tt, 0.06, 0.005, 0.06); b.start(tt); b.stop(tt + 0.1);
    }
  };
  S.heartbeat = (t, out, o) => {
    [0, 0.28].forEach((d, k) => {
      const b = osc('sine', 55), g = gn(0); b.connect(g); g.connect(out);
      b.frequency.setValueAtTime(70, t + d); b.frequency.exponentialRampToValueAtTime(35, t + d + 0.15);
      perc(g, t + d, (k ? 0.5 : 0.8) * (o.v ?? 1), 0.005, 0.18); b.start(t + d); b.stop(t + d + 0.25);
    });
  };
  S.breath = (t, out, o) => {
    const dur = o.dur || 1.4;
    const n = nz('pink'), f = flt('bandpass', 900, 0.8), g = gn(0);
    n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * (o.v ?? 1), t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1300, t + dur);
    startN(n, t, dur + 0.05);
  };
  S.typeKey = (t, out) => {
    const n = nz(), f = flt('bandpass', U.range(1800, 2600), 1.5), g = gn(0); n.connect(f); f.connect(g); g.connect(out);
    perc(g, t, 0.35, 0.001, 0.03); startN(n, t, 0.06);
    const b = osc('sine', 200), bg = gn(0); b.connect(bg); bg.connect(out); perc(bg, t, 0.2, 0.001, 0.04); b.start(t); b.stop(t + 0.06);
  };
  S.typeBell = (t, out) => { const b = osc('sine', 2637), g = gn(0); b.connect(g); g.connect(out); perc(g, t, 0.12, 0.002, 1.2); b.start(t); b.stop(t + 1.3); };

  // organ note (o.freq, o.dur)
  S.organ = (t, out, o) => {
    const f = o.freq, dur = o.dur || 0.9, v = o.v ?? 1;
    const partials = [[1, 1], [2, 0.55], [3, 0.35], [4, 0.28], [6, 0.12], [8, 0.1], [0.5, 0.45]];
    const g = gn(0), trem = osc('sine', 5.4), tg = gn(0.06);
    trem.connect(tg); tg.connect(g.gain);
    partials.forEach(([m, a]) => {
      [0, 1].forEach((d) => {
        const b = osc('sine', f * m * (d ? 1.0025 : 0.9985)), pg = gn(a * 0.055 * v);
        b.connect(pg); pg.connect(g); b.start(t); b.stop(t + dur + 0.8);
      });
    });
    g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.06); g.gain.setValueAtTime(1, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    trem.start(t); trem.stop(t + dur + 0.8);
    const ch = nz(), cf = flt('bandpass', f * 4, 3), cg = gn(0); ch.connect(cf); cf.connect(cg); cg.connect(out);
    perc(cg, t, 0.12 * v, 0.01, 0.12); startN(ch, t, 0.2);
  };

  // Voice "mumble" matched to subtitle length (o.dur, o.pitch, o.radio, o.whisper)
  const VOWELS = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [440, 1020], [660, 1720], [490, 1350]];
  S.voice = (t, out, o) => {
    const dur = o.dur || 2;
    const src = o.whisper ? nz('pink') : osc('sawtooth', o.pitch || 115);
    const f1 = flt('bandpass', 600, 6), f2 = flt('bandpass', 1200, 8), f3 = flt('bandpass', 2600, 10);
    const g1 = gn(1), g2 = gn(0.7), g3 = gn(0.25), sum = gn(0), mix = gn(o.whisper ? 3.5 : 1.2);
    src.connect(f1); src.connect(f2); src.connect(f3);
    f1.connect(g1); f2.connect(g2); f3.connect(g3); g1.connect(sum); g2.connect(sum); g3.connect(sum);
    let last = sum;
    if (o.radio) {
      const hp = flt('highpass', 450), lp = flt('lowpass', 2600), sh = shaper(18);
      sum.connect(hp); hp.connect(sh); sh.connect(lp); last = lp;
      const st = nz(), sf = flt('bandpass', 3000, 0.5), sg = gn(0);
      st.connect(sf); sf.connect(sg); sg.connect(out);
      sg.gain.setValueAtTime(0.0001, t - 0.05); sg.gain.exponentialRampToValueAtTime(0.05, t); sg.gain.setValueAtTime(0.05, t + dur); sg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
      startN(st, t - 0.05, dur + 0.25);
      S.tick(t - 0.05, out, { freq: 1500 }); S.tick(t + dur + 0.1, out, { freq: 1200 });
    }
    last.connect(mix); mix.connect(out);
    let tt = t;
    const base = o.pitch || 115;
    sum.gain.setValueAtTime(0.0001, t);
    while (tt < t + dur) {
      const syl = U.range(0.09, 0.2), v = U.pick(VOWELS);
      f1.frequency.setTargetAtTime(v[0], tt, 0.02);
      f2.frequency.setTargetAtTime(v[1], tt, 0.02);
      if (!o.whisper) src.frequency.setTargetAtTime(base * U.range(0.88, 1.18) * (1 - (tt - t) / dur * 0.1), tt, 0.04);
      sum.gain.setTargetAtTime(U.range(0.5, 1), tt, 0.015);
      sum.gain.setTargetAtTime(0.03, tt + syl * 0.75, 0.02);
      tt += syl + (Math.random() < 0.14 ? U.range(0.1, 0.28) : 0);
    }
    sum.gain.setTargetAtTime(0.0001, t + dur, 0.03);
    if (o.whisper) startN(src, t, dur + 0.3); else { src.start(t); src.stop(t + dur + 0.3); }
  };

  S.shout = (t, out, o) => { S.voice(t, out, Object.assign({ pitch: 150, dur: 0.9 }, o)); };
  S.siren1 = (t, out, o) => {
    const dur = o.dur || 3;
    const b = osc('sawtooth', 600), f = flt('lowpass', 1800), g = gn(0);
    b.connect(f); f.connect(g); g.connect(out);
    b.frequency.setValueAtTime(500, t); b.frequency.linearRampToValueAtTime(1100, t + dur * 0.5); b.frequency.linearRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.2); g.gain.setValueAtTime(0.25, t + dur - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    b.start(t); b.stop(t + dur + 0.05);
  };
  S.pullCord = (t, out) => {
    const n = nz(), f = flt('bandpass', 900, 1.5), g = gn(0);
    n.connect(f); f.connect(g); g.connect(out);
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2500, t + 0.25);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    startN(n, t, 0.4);
    for (let k = 0; k < 5; k++) S.tick(t + 0.03 + k * 0.05, out, { freq: 900 + k * 100 });
  };
  S.sputter = (t, out, o) => {
    const n = o.n || 4;
    for (let k = 0; k < n; k++) {
      const tt = t + k * U.range(0.07, 0.16);
      const b = nz('brown'), f = flt('lowpass', 700), g = gn(0); b.connect(f); f.connect(g); g.connect(out);
      perc(g, tt, U.range(0.4, 0.9), 0.003, 0.09); startN(b, tt, 0.15);
      const th = osc('sine', 60), tg = gn(0); th.connect(tg); tg.connect(out); perc(tg, tt, 0.4, 0.002, 0.08); th.start(tt); th.stop(tt + 0.1);
    }
  };
  S.gull = (t, out) => {
    for (let k = 0; k < 3; k++) {
      const tt = t + k * 0.35, b = osc('sawtooth', 1500), f = flt('bandpass', 1800, 3), g = gn(0), m = osc('sine', 30), mg = gn(120);
      m.connect(mg); mg.connect(b.frequency); b.connect(f); f.connect(g); g.connect(out);
      b.frequency.setValueAtTime(1300, tt); b.frequency.linearRampToValueAtTime(1800, tt + 0.1); b.frequency.linearRampToValueAtTime(1100, tt + 0.3);
      perc(g, tt, 0.08, 0.03, 0.28); b.start(tt); b.stop(tt + 0.35); m.start(tt); m.stop(tt + 0.35);
    }
  };
  S.impact = (t, out, o) => { S.bang(t, out, { v: o.v ?? 0.8 }); S.metalHit(t, out, { v: 0.4, decay: 0.8, pitch: 0.6 }); };

  // ------------------------------------------------------------------ loops
  const L = {};
  const loops = new Set();
  A.stopAllLoops = function () { [...loops].forEach((h) => { if (!h.keep) h.stop(0.4); }); };
  A.loop = function (name, o = {}) {
    if (!A.ready || !L[name]) return null;
    const out = output(o);
    const t = ctx.currentTime;
    out.gain.gain.value = 0;
    const target = o.vol ?? 1;
    out.gain.gain.setTargetAtTime(target, t, o.fadeIn || 0.3);
    const h = L[name](out, o) || {};
    const handle = {
      out, vol: target, keep: !!o.keep,
      setVol(v, time = 0.3) { this.vol = v; out.gain.gain.setTargetAtTime(v, ctx.currentTime, time); },
      setPos(p) { if (out.panner) setPos(out.panner, p); },
      setMuffle(f) { if (out.muff) out.muff.frequency.setTargetAtTime(f, ctx.currentTime, 0.2); },
      set(k, v) { if (h.set) h.set(k, v); },
      stop(fade = 0.5) {
        const tt = ctx.currentTime;
        out.gain.gain.setTargetAtTime(0, tt, fade / 3);
        loops.delete(handle);
        setTimeout(() => { try { (h.nodes || []).forEach((n) => n.stop()); } catch (e) { /* already stopped */ } try { out.gain.disconnect(); } catch (e) { /* ignore */ } }, fade * 1000 + 300);
      },
    };
    loops.add(handle);
    return handle;
  };
  function loopNoise(kind) { const n = nz(kind, true); n.start(ctx.currentTime, Math.random() * 3); return n; }

  L.rain = (out) => {
    const n = loopNoise('pink'), hp = flt('highpass', 250), lp = flt('lowpass', 6000, 0.5);
    n.connect(hp); hp.connect(lp); lp.connect(out.input);
    const n2 = loopNoise('white'), bp = flt('bandpass', 5500, 0.6), g2 = gn(0.12);
    n2.connect(bp); bp.connect(g2); g2.connect(lp);
    return { nodes: [n, n2], set(k, v) { if (k === 'muffle') lp.frequency.setTargetAtTime(v, ctx.currentTime, 0.4); } };
  };
  L.wind = (out) => {
    const n = loopNoise('brown'), bp = flt('bandpass', 400, 0.8), g = gn(1), lfo = osc('sine', 0.13), lg = gn(250), lfo2 = osc('sine', 0.07), lg2 = gn(0.5);
    lfo.connect(lg); lg.connect(bp.frequency); lfo2.connect(lg2); lg2.connect(g.gain);
    n.connect(bp); bp.connect(g); g.connect(out.input);
    lfo.start(); lfo2.start();
    return { nodes: [n, lfo, lfo2] };
  };
  L.roomtone = (out) => {
    const n = loopNoise('brown'), lp = flt('lowpass', 160), hum = osc('sine', 60), hg = gn(0.05), hum2 = osc('sine', 120), hg2 = gn(0.02);
    n.connect(lp); lp.connect(out.input); hum.connect(hg); hg.connect(out.input); hum2.connect(hg2); hg2.connect(out.input);
    hum.start(); hum2.start();
    return { nodes: [n, hum, hum2] };
  };
  L.hum = (out, o) => {
    const b = osc('sawtooth', o.freq || 60), f = flt('lowpass', 400), g = gn(0.15), b2 = osc('sine', (o.freq || 60) * 2), g2 = gn(0.1);
    b.connect(f); f.connect(g); g.connect(out.input); b2.connect(g2); g2.connect(out.input);
    b.start(); b2.start();
    return { nodes: [b, b2] };
  };
  L.fluorescent = (out) => {
    const b = osc('sawtooth', 120), f = flt('bandpass', 2400, 4), g = gn(0.05), b2 = osc('sine', 120), g2 = gn(0.06);
    b.connect(f); f.connect(g); g.connect(out.input); b2.connect(g2); g2.connect(out.input);
    b.start(); b2.start();
    return { nodes: [b, b2] };
  };
  L.radioStatic = (out) => {
    const n = loopNoise('white'), bp = flt('bandpass', 2500, 0.5), g = gn(0.15);
    n.connect(bp); bp.connect(g); g.connect(out.input);
    return { nodes: [n] };
  };
  L.snore = (out) => {
    const n = loopNoise('pink'), lp = flt('lowpass', 500, 2), am = gn(0), flut = osc('sawtooth', 28), fg = gn(0.4), env = osc('sine', 0.22), eg = gn(0.5);
    const mid = gn(0.5);
    flut.connect(fg); env.connect(eg);
    eg.connect(am.gain); fg.connect(am.gain);
    n.connect(lp); lp.connect(am); am.connect(mid); mid.connect(out.input);
    flut.start(); env.start();
    return { nodes: [n, flut, env] };
  };
  L.engine = (out, o) => {
    const base = o.freq || 26;
    const o1 = osc('sawtooth', base), o2 = osc('square', base * 0.5), sub = osc('sine', base);
    const lp = flt('lowpass', o.lp || 520, 3), am = gn(0.7), lfo = osc('sine', base / 2), lg = gn(0.35);
    const g1 = gn(0.28), g2 = gn(0.16), gs = gn(0.5);
    lfo.connect(lg); lg.connect(am.gain);
    o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp); lp.connect(am); am.connect(out.input); sub.connect(gs); gs.connect(out.input);
    const mn = loopNoise('white'), mf = flt('bandpass', 1900, 1), mg = gn(o.mech ?? 0.05);
    mn.connect(mf); mf.connect(mg); mg.connect(out.input);
    const sh = o.rasp ? shaper(o.rasp) : null;
    if (sh) { am.disconnect(); am.connect(sh); sh.connect(out.input); }
    [o1, o2, sub, lfo].forEach((x) => x.start());
    return {
      nodes: [o1, o2, sub, lfo, mn],
      set(k, v) {
        const t = ctx.currentTime;
        if (k === 'rpm') { const f = base * v; o1.frequency.setTargetAtTime(f, t, 0.3); o2.frequency.setTargetAtTime(f * 0.5, t, 0.3); sub.frequency.setTargetAtTime(f, t, 0.3); lfo.frequency.setTargetAtTime(f / 2, t, 0.3); lp.frequency.setTargetAtTime((o.lp || 520) * (0.6 + v * 0.4), t, 0.3); }
      },
    };
  };
  L.starter = (out) => {
    const b = osc('sawtooth', 48), f = flt('lowpass', 900), am = gn(0.5), lfo = osc('square', 4.5), lg = gn(0.45);
    lfo.connect(lg); lg.connect(am.gain); b.connect(f); f.connect(am); am.connect(out.input);
    const n = loopNoise('brown'), nf = flt('bandpass', 300), ng = gn(0.4); n.connect(nf); nf.connect(ng); ng.connect(am);
    b.start(); lfo.start();
    return { nodes: [b, lfo, n] };
  };
  L.waves = (out) => {
    const n = loopNoise('brown'), lp = flt('lowpass', 600, 0.5), g = gn(0.6), lfo = osc('sine', 0.09), lg = gn(0.4);
    lfo.connect(lg); lg.connect(g.gain); n.connect(lp); lp.connect(g); g.connect(out.input);
    const n2 = loopNoise('pink'), hp = flt('highpass', 1200), g2 = gn(0.15), lfo2 = osc('sine', 0.09), lg2 = gn(0.15);
    lfo2.connect(lg2); lg2.connect(g2.gain); n2.connect(hp); hp.connect(g2); g2.connect(out.input);
    lfo.start(); lfo2.start();
    return { nodes: [n, n2, lfo, lfo2] };
  };
  L.siren = (out) => {
    const b = osc('sawtooth', 700), b2 = osc('square', 703), f = flt('lowpass', 1600, 2), g = gn(0.2), lfo = osc('sine', 0.18), lg = gn(300);
    lfo.connect(lg); lg.connect(b.frequency); lg.connect(b2.frequency);
    b.connect(f); b2.connect(f); f.connect(g); g.connect(out.input);
    b.start(); b2.start(); lfo.start();
    return { nodes: [b, b2, lfo] };
  };
  L.steam = (out) => {
    const n = loopNoise('white'), hp = flt('highpass', 2500), g = gn(0.3);
    n.connect(hp); hp.connect(g); g.connect(out.input);
    return { nodes: [n] };
  };
  L.candle = (out) => {
    const n = loopNoise('pink'), lp = flt('lowpass', 300), g = gn(0.3);
    n.connect(lp); lp.connect(g); g.connect(out.input);
    return { nodes: [n] };
  };
  L.water = (out) => {
    const n = loopNoise('pink'), bp = flt('bandpass', 700, 0.7), g = gn(0.5), lfo = osc('sine', 0.3), lg = gn(0.25);
    lfo.connect(lg); lg.connect(g.gain); n.connect(bp); bp.connect(g); g.connect(out.input);
    lfo.start();
    return { nodes: [n, lfo] };
  };

  // ------------------------------------------------------------------ ambience manager
  let amb = null;
  function ambInit() {
    amb = {
      rain: A.loop('rain', { bus: 'amb', vol: 0, wet: 0.05, keep: true }),
      wind: A.loop('wind', { bus: 'amb', vol: 0, wet: 0.1, keep: true }),
      room: A.loop('roomtone', { bus: 'amb', vol: 0, wet: 0, keep: true }),
      waves: A.loop('waves', { bus: 'amb', vol: 0, wet: 0.3, keep: true }),
    };
  }
  // {rain, rainMuffle(Hz), wind, room, waves}
  A.setAmbience = function (a, time = 1.2) {
    if (!amb) return;
    amb.rain.setVol(a.rain ?? 0, time);
    amb.rain.set('muffle', a.rainMuffle ?? 6000);
    amb.wind.setVol(a.wind ?? 0, time);
    amb.room.setVol(a.room ?? 0, time);
    amb.waves.setVol(a.waves ?? 0, time);
  };

  // Random positional emitters (drips etc.)
  const emitters = [];
  A.addEmitter = function (e) { emitters.push(Object.assign({ next: Math.random() * 3 }, e)); };
  A.update = function (dt) {
    if (!A.ready || !A.listenerPos) return;
    const lp = A.listenerPos;
    for (const e of emitters) {
      if (e.enabled && !e.enabled()) continue;
      e.next -= dt;
      if (e.next <= 0) {
        e.next = U.range(e.min || 1, e.max || 4);
        const dx = e.pos.x - lp.x, dy = e.pos.y - lp.y, dz = e.pos.z - lp.z;
        if (dx * dx + dy * dy + dz * dz > (e.range || 18) ** 2) continue;
        A.play(e.sound, Object.assign({ pos: e.pos }, e.opts || {}));
      }
    }
  };
})();
