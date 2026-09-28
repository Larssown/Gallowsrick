// core.js — namespace, math helpers, events, state, settings, tweens
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  G.VERSION = '1.0.0';

  // ------------------------------------------------------------------ math
  const U = (G.U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    smoothstep: (a, b, v) => {
      const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return t * t * (3 - 2 * t);
    },
    damp: (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt)),
    easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeIn: (t) => t * t * t,
    range: (a, b) => a + Math.random() * (b - a),
    irange: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    chance: (p) => Math.random() < p,
    rng(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    wrapAngle(a) {
      while (a > Math.PI) a -= Math.PI * 2;
      while (a < -Math.PI) a += Math.PI * 2;
      return a;
    },
    fmtTime(sec) {
      sec = Math.floor(sec);
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
    },
  });

  // ------------------------------------------------------------------ events
  const handlers = {};
  G.on = (evt, fn) => { (handlers[evt] = handlers[evt] || []).push(fn); };
  G.off = (evt, fn) => { const h = handlers[evt]; if (h) { const i = h.indexOf(fn); if (i >= 0) h.splice(i, 1); } };
  G.emit = (evt, ...args) => { const h = handlers[evt]; if (h) h.slice().forEach((fn) => { try { fn(...args); } catch (e) { console.error(e); } }); };

  // ------------------------------------------------------------------ state
  G.newState = () => ({
    flags: {},
    inv: [],
    docs: [],
    cp: 'start',
    stats: { time: 0, hints: 0, caught: 0 },
    hintLevel: {},
  });
  G.state = G.newState();
  G.flag = (n) => !!G.state.flags[n];
  G.setFlag = (n, v = true) => {
    if (G.state.flags[n] === v) return;
    G.state.flags[n] = v;
    G.emit('flag', n, v);
  };

  const SAVE_KEY = 'gallowsrock.save.v1';
  const SET_KEY = 'gallowsrock.settings.v1';
  G.save = () => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); } catch (e) { /* storage unavailable */ }
  };
  G.loadSave = () => {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      const st = JSON.parse(s);
      if (!st || !st.flags) return null;
      return Object.assign(G.newState(), st);
    } catch (e) { return null; }
  };
  G.hasSave = () => { const s = G.loadSave(); return !!(s && s.cp && s.cp !== 'start' || (s && Object.keys(s.flags).length > 2)); };
  G.clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };

  // ------------------------------------------------------------------ settings
  G.settings = {
    master: 0.85, music: 0.55, sfx: 0.9, sensitivity: 1.0, fov: 72,
    invertY: false, headBob: true, subtitles: true, glints: true, quality: 'high',
  };
  try {
    const s = JSON.parse(localStorage.getItem(SET_KEY) || 'null');
    if (s) Object.assign(G.settings, s);
  } catch (e) { /* ignore */ }
  G.saveSettings = () => {
    try { localStorage.setItem(SET_KEY, JSON.stringify(G.settings)); } catch (e) { /* ignore */ }
    G.emit('settings');
  };

  // ------------------------------------------------------------------ tweens / waits (game time)
  const tweens = [];
  G.tween = (dur, update, opts = {}) =>
    new Promise((resolve) => {
      tweens.push({ t: 0, dur: Math.max(0.0001, dur), update, ease: opts.ease || ((x) => x), resolve, real: !!opts.real, tag: opts.tag });
    });
  G.wait = (sec, real) => G.tween(sec, null, { real });
  G.killTweens = (tag) => {
    for (let i = tweens.length - 1; i >= 0; i--) if (!tag || tweens[i].tag === tag) tweens.splice(i, 1);
  };
  // paused=true -> only "real" tweens advance
  G.updateTweens = (dt, paused) => {
    for (let i = 0; i < tweens.length; i++) {
      const tw = tweens[i];
      if (paused && !tw.real) continue;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      if (tw.update) tw.update(tw.ease(k), k);
      if (k >= 1) {
        tweens.splice(i, 1);
        i--;
        tw.resolve();
      }
    }
  };

  // Per-frame update hooks registered by modules: fn(dt, t)
  G.updaters = [];
  G.onUpdate = (fn) => G.updaters.push(fn);

  // helpers
  G.$ = (sel) => document.querySelector(sel);
  G.$$ = (sel) => Array.from(document.querySelectorAll(sel));
  G.nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
})();
