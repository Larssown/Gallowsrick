// music.js — generative adaptive score (moods crossfade; Tom's theme is a recurring leitmotif)
(function () {
  'use strict';
  const G = window.G, U = G.U;
  const M = (G.music = { mood: 'none', intensity: 0 });
  let ctx, bus, rev, nextBeat = 0, beat = 0, timer = null, droneNodes = [], moodGain = null;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Tom's theme (the melody he whistled; it's also the organ code: A C E D C B A)
  const THEME = [[69, 1], [72, 0.5], [76, 1.5], [74, 0.5], [72, 0.5], [71, 0.5], [69, 2]];
  const THEME_MAJOR = [[72, 1], [76, 0.5], [79, 1.5], [77, 0.5], [76, 0.5], [74, 0.5], [72, 2]];
  M.THEME = THEME;

  const Am = [57, 60, 64], F = [53, 57, 60], C = [48, 55, 64], G_ = [55, 59, 62], Em = [52, 55, 59], Dm = [50, 57, 62], E = [52, 56, 59];
  const MOODS = {
    title: { bpm: 54, chords: [Am, F, C, E], bpc: 8, pad: 0.55, bells: 0.5, theme: 16, drone: 45 },
    explore: { bpm: 58, chords: [Am, F, Dm, E], bpc: 8, pad: 0.3, bells: 0.22, theme: 48, drone: 45 },
    dark: { bpm: 52, chords: [Am, [56, 60, 63], Dm, [55, 58, 62]], bpc: 8, pad: 0.28, bells: 0.12, drone: 33 },
    tension: { bpm: 88, chords: [Am, [58, 62, 65], Am, [56, 60, 63]], bpc: 8, pad: 0.22, bass: 0.5, hats: 0.35, drone: 33 },
    chapel: { bpm: 48, chords: [Am, F, C, G_, Am, Dm, E, Am], bpc: 8, choir: 0.4, bells: 0.08, theme: 64 },
    tunnel: { bpm: 50, chords: [Am, [53, 56, 60]], bpc: 16, drone: 33, bells: 0.08, pad: 0.15 },
    finale: { bpm: 116, chords: [Am, F, C, G_], bpc: 8, bass: 0.65, drums: 0.7, strings: 0.35, lead: 0.3, theme: 32, hats: 0.4 },
    ending: { bpm: 66, chords: [[48, 55, 64], [47, 55, 62], [45, 52, 60], [41, 53, 57]], bpc: 8, strings: 0.35, piano: 0.5, themeMajor: 16 },
    none: { bpm: 60, chords: [Am], bpc: 8 },
  };

  M.init = function () {
    if (ctx || !G.audio.ready) return;
    ctx = G.audio.ctx;
    bus = G.audio.buses.music;
    rev = G.audio.musicReverb;
    nextBeat = ctx.currentTime + 0.2;
    timer = setInterval(schedule, 50);
  };

  M.setMood = function (name, opts = {}) {
    if (!ctx) return;
    if (name === M.mood && !opts.force) return;
    const prev = M.mood;
    M.mood = name;
    const t = ctx.currentTime;
    // fade out previous mood voices
    if (moodGain) {
      const old = moodGain;
      old.gain.setTargetAtTime(0, t, opts.fade || 1.2);
      setTimeout(() => { try { old.disconnect(); } catch (e) { /* ignore */ } }, 8000);
    }
    droneNodes.forEach((n) => { try { n.stop(t + 4); } catch (e) { /* ignore */ } });
    droneNodes = [];
    moodGain = ctx.createGain();
    moodGain.gain.value = 0;
    moodGain.gain.setTargetAtTime(1, t, opts.fadeIn || 1.5);
    moodGain.connect(bus);
    const send = ctx.createGain(); send.gain.value = 0.55; moodGain.connect(send); send.connect(rev);
    beat = 0;
    nextBeat = Math.max(nextBeat, t + 0.05);
    const m = MOODS[name];
    if (m && m.drone) startDrone(m.drone, t + 0.1);
    return prev;
  };
  M.setIntensity = (v) => { M.intensity = U.clamp(v, 0, 1); };

  function schedule() {
    if (!ctx || !moodGain) return;
    const m = MOODS[M.mood] || MOODS.none;
    const spb = 60 / m.bpm;
    while (nextBeat < ctx.currentTime + 0.25) {
      onBeat(m, beat, nextBeat, spb);
      nextBeat += spb;
      beat++;
    }
  }

  let themeAt = 8;
  function onBeat(m, b, t, spb) {
    const out = moodGain;
    const ci = Math.floor(b / m.bpc) % m.chords.length;
    const chord = m.chords[ci];
    const inChord = b % m.bpc;
    const I = M.intensity;
    if (inChord === 0) {
      const dur = m.bpc * spb;
      if (m.pad) chord.forEach((n, k) => pad(out, n + (k === 0 ? 0 : 0), t, dur + 2, m.pad * (M.mood === 'tension' ? 0.6 + I * 0.5 : 1)));
      if (m.pad) pad(out, chord[0] - 12, t, dur + 2, m.pad * 0.6);
      if (m.choir) chord.forEach((n) => choir(out, n + 12, t, dur + 1.5, m.choir));
      if (m.strings) { chord.forEach((n) => strings(out, n + 12, t, dur, m.strings)); strings(out, chord[0], t, dur, m.strings * 0.7); }
    }
    if (m.piano && b % 2 === 0) {
      const n = chord[(b / 2) % chord.length] + 12 + (b % 8 === 0 ? 0 : 12 * (Math.random() < 0.3 ? 1 : 0));
      piano(out, n, t, 0.28 * m.piano);
      if (inChord === 0) piano(out, chord[0] - 12, t, 0.35 * m.piano);
    }
    if (m.bells && Math.random() < m.bells * 0.6) {
      const scale = [57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76];
      const n = Math.random() < 0.6 ? U.pick(chord) + 24 : U.pick(scale) + 12;
      bell(out, n, t + (Math.random() < 0.3 ? spb * 0.5 : 0), 0.12 + Math.random() * 0.1);
    }
    if (m.bass) {
      const root = chord[0] - 12;
      for (let k = 0; k < 2; k++) {
        const pat = M.mood === 'finale' ? [0, 0, 12, 0, 7, 0, 10, 12][(b * 2 + k) % 8] : 0;
        const vel = m.bass * (k === 0 ? 1 : 0.6) * (M.mood === 'tension' ? 0.5 + I * 0.7 : 1);
        bass(out, root + pat, t + k * spb * 0.5, spb * 0.45, vel);
      }
    }
    if (m.drums) {
      if (b % 2 === 0) kick(out, t, m.drums);
      if (b % 2 === 1) snare(out, t, m.drums * 0.5);
      if (b % 8 === 7) { tom(out, t + spb * 0.5, m.drums * 0.6, 90); tom(out, t + spb * 0.75, m.drums * 0.6, 70); }
    }
    if (m.hats) {
      const hv = m.hats * (M.mood === 'tension' ? 0.3 + I : 1);
      hat(out, t, hv * 0.7); hat(out, t + spb * 0.5, hv * 0.4);
      if (M.mood === 'tension' && I > 0.4) { hat(out, t + spb * 0.25, hv * 0.3); hat(out, t + spb * 0.75, hv * 0.3); }
    }
    if (M.mood === 'tension' && b % 4 === 0) kick(out, t, 0.25 + I * 0.5);
    // leitmotif
    const every = m.theme || m.themeMajor;
    if (every) {
      themeAt--;
      if (themeAt <= 0 && inChord === 0 && ci === 0) {
        themeAt = every;
        const th = m.themeMajor ? THEME_MAJOR : THEME;
        let tt = t;
        th.forEach(([n, d]) => {
          if (M.mood === 'finale') lead(out, n, tt, d * spb * 0.95, m.lead);
          else if (m.themeMajor) { piano(out, n + 12, tt, 0.35); bell(out, n + 12, tt, 0.06); }
          else if (M.mood === 'chapel') bell(out, n, tt, 0.14);
          else bell(out, n + 12, tt, 0.16);
          tt += d * spb;
        });
      }
    }
  }

  // ------------------------------------------------------------------ voices
  function env(g, t, a, peak, sus, rel, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }
  function pad(out, midi, t, dur, vel) {
    const f = mtof(midi);
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 700 + Math.random() * 300; lp.Q.value = 0.7;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.1 + Math.random() * 0.1; lg.gain.value = 250;
    lfo.connect(lg); lg.connect(lp.frequency);
    [-7, 7].forEach((c) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c + (Math.random() - 0.5) * 4; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); });
    const tri = ctx.createOscillator(); tri.type = 'triangle'; tri.frequency.value = f / 2; const tg = ctx.createGain(); tg.gain.value = 0.6; tri.connect(tg); tg.connect(lp); tri.start(t); tri.stop(t + dur + 0.1);
    lp.connect(g); g.connect(out);
    env(g, t, Math.min(2.5, dur * 0.3), 0.05 * vel, 1, Math.min(3, dur * 0.4), dur);
    lfo.start(t); lfo.stop(t + dur + 0.1);
  }
  function bell(out, midi, t, vel) {
    const f = mtof(midi);
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.8);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    const s = ctx.createOscillator(), sg = ctx.createGain(); s.frequency.value = f * 2; s.connect(sg); sg.connect(out);
    sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(vel * 0.12, t + 0.005); sg.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    [car, mod, s].forEach((o) => { o.start(t); o.stop(t + 3.6); });
  }
  function piano(out, midi, t, vel) {
    const f = mtof(midi), g = ctx.createGain();
    g.connect(out);
    [[1, 1, 2.8], [2, 0.45, 1.8], [3, 0.22, 1.2], [4, 0.12, 0.9], [5, 0.06, 0.6]].forEach(([m, a, d]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = f * m * (1 + 0.0004 * m * m);
      o.connect(og); og.connect(g);
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(a * vel * 0.3, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0001, t + d * (midi < 60 ? 1.6 : 1));
      o.start(t); o.stop(t + d * 1.7);
    });
    g.gain.value = 1;
  }
  function bass(out, midi, t, dur, vel) {
    const f = mtof(midi), o = ctx.createOscillator(), s = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; s.type = 'sine'; s.frequency.value = f;
    lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(150, t + dur);
    o.connect(lp); s.connect(g); lp.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.start(t); o.stop(t + dur + 0.1); s.start(t); s.stop(t + dur + 0.1);
  }
  function choir(out, midi, t, dur, vel) {
    const f = mtof(midi), g = ctx.createGain(), sum = ctx.createGain();
    [[750, 6, 1], [1150, 8, 0.6], [2800, 10, 0.2]].forEach(([ff, q, a]) => {
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = q;
      const bg = ctx.createGain(); bg.gain.value = a; sum.connect(b); b.connect(bg); bg.connect(g);
    });
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 4.8; vg.gain.value = f * 0.006; vib.connect(vg);
    [-6, 0, 6].forEach((c) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c; vg.connect(o.frequency); o.connect(sum); o.start(t); o.stop(t + dur + 0.1); });
    g.connect(out);
    env(g, t, 1.8, 0.08 * vel, 1, 2, dur);
    vib.start(t); vib.stop(t + dur + 0.1);
  }
  function strings(out, midi, t, dur, vel) {
    const f = mtof(midi), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 2200;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = f * 0.004; vib.connect(vg);
    [-9, 0, 9].forEach((c) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c; vg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(t + dur + 0.6); });
    lp.connect(g); g.connect(out);
    env(g, t, 0.9, 0.035 * vel, 1, 1.2, dur + 0.5);
    vib.start(t); vib.stop(t + dur + 0.6);
  }
  function lead(out, midi, t, dur, vel) {
    const f = mtof(midi), o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'square'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.003;
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.5; vg.gain.value = f * 0.008; vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out);
    env(g, t, 0.03, 0.07 * vel, 1, 0.15, dur);
    [o, o2, vib].forEach((x) => { x.start(t); x.stop(t + dur + 0.1); });
  }
  function noiseHit(out, t, type, f, q, vel, dec) {
    const n = G.audio.helpers.nz('white'), b = ctx.createBiquadFilter(), g = ctx.createGain();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    n.connect(b); b.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    n.start(t, Math.random() * 2); n.stop(t + dec + 0.05);
  }
  function kick(out, t, vel) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    o.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.start(t); o.stop(t + 0.4);
  }
  function snare(out, t, vel) { noiseHit(out, t, 'bandpass', 1800, 0.7, 0.25 * vel, 0.18); tom(out, t, vel * 0.5, 190); }
  function tom(out, t, vel, f) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.1);
    o.connect(g); g.connect(out);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.start(t); o.stop(t + 0.35);
  }
  function hat(out, t, vel) { noiseHit(out, t, 'highpass', 7000, 0.5, 0.08 * vel, 0.05); }

  function startDrone(midi, t) {
    const f = mtof(midi), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 2;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.05; lg.gain.value = 180; lfo.connect(lg); lg.connect(lp.frequency);
    const oscs = [];
    [[f, 'sawtooth', 1], [f * 1.5, 'sine', 0.4], [f * 1.003, 'sawtooth', 0.8], [f * 4, 'sine', 0.05]].forEach(([fr, ty, a]) => {
      const o = ctx.createOscillator(), og = ctx.createGain(); o.type = ty; o.frequency.value = fr; og.gain.value = a; o.connect(og); og.connect(lp); o.start(t); oscs.push(o);
    });
    lp.connect(g); g.connect(moodGain);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 4);
    lfo.start(t);
    droneNodes = oscs.concat([lfo]);
  }

  // one-off musical stingers
  M.sting = function (name) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const out = ctx.createGain(); out.gain.value = 1; out.connect(bus);
    const s = ctx.createGain(); s.gain.value = 0.6; out.connect(s); s.connect(rev);
    if (name === 'discover') { [69, 72, 76, 81].forEach((n, k) => bell(out, n + 12, t + k * 0.12, 0.2)); }
    else if (name === 'dread') { [45, 46].forEach((n) => pad(out, n, t, 4, 1.4)); bell(out, 58, t, 0.25); }
    else if (name === 'theme') { let tt = t; THEME.forEach(([n, d]) => { bell(out, n + 12, tt, 0.2); tt += d * 0.5; }); }
    else if (name === 'triumph') { [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [57, 61, 64, 69]].forEach((ch, k) => ch.forEach((n) => strings(out, n, t + k * 1.2, 1.4, 1.2))); }
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* ignore */ } }, 12000);
  };
})();
