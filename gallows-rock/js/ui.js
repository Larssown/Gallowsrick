// ui.js — HUD, prompts, subtitles, objectives, notifications, inventory/doc/map screens, menus, settings
(function () {
  'use strict';
  const G = window.G, U = G.U, $ = G.$, $$ = G.$$;
  const UI = (G.ui = {});

  UI.show = (el, on = true) => { if (typeof el === 'string') el = $(el); if (el) el.classList.toggle('hidden', !on); };

  // ------------------------------------------------------------------ fade
  UI.fade = function (to, dur = 1) {
    const f = $('#fade');
    f.style.transition = `opacity ${dur}s`;
    f.style.opacity = to;
    return G.wait(dur, true);
  };
  UI.fadeNow = (v) => { const f = $('#fade'); f.style.transition = 'none'; f.style.opacity = v; void f.offsetWidth; };

  // ------------------------------------------------------------------ prompt / crosshair
  let lastPrompt = '';
  UI.setPrompt = function (html, key = 'E') {
    const p = $('#prompt'), ch = $('#crosshair');
    if (!html) { p.classList.add('hidden'); ch.classList.remove('active'); lastPrompt = ''; return; }
    ch.classList.add('active');
    if (html !== lastPrompt) {
      p.querySelector('.txt').innerHTML = html;
      p.querySelector('.key').textContent = key;
      lastPrompt = html;
    }
    p.classList.remove('hidden');
  };
  UI.crosshair = (on) => $('#crosshair').classList.toggle('hidden-ch', !on);

  // ------------------------------------------------------------------ objective
  UI.objective = function (text, flash = true) {
    const o = $('#objective');
    if (!text) { o.classList.remove('show'); return; }
    const t = o.querySelector('.txt');
    if (t.textContent === text && o.classList.contains('show')) return;
    o.classList.remove('show');
    setTimeout(() => {
      t.textContent = text;
      o.classList.add('show');
      if (flash) { o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); G.audio.play('uiClick', { bus: 'ui', vol: 0.4, wet: 0.2 }); }
      clearTimeout(UI._objT);
      UI._objT = setTimeout(() => o.classList.remove('show'), 9000);
    }, 350);
  };
  UI.peekObjective = function () {
    const o = $('#objective');
    if (!o.querySelector('.txt').textContent) return;
    o.classList.add('show');
    clearTimeout(UI._objT);
    UI._objT = setTimeout(() => o.classList.remove('show'), 5000);
  };

  // ------------------------------------------------------------------ subtitles
  // say(text, {speaker, kind:'thought'|'radio'|'voice', dur, sound})
  UI.say = function (text, o = {}) {
    const dur = o.dur || Math.max(2.2, text.length * 0.058);
    if (o.voice !== false && o.kind !== 'thought') {
      G.audio.play('voice', Object.assign({ dur: Math.min(dur * 0.8, 6), bus: 'voice', wet: 0.3, radio: o.kind === 'radio', whisper: !!o.whisper, pitch: o.pitch || 115 }, o.pos ? { pos: o.pos } : {}, o.vol ? { vol: o.vol } : {}));
    }
    if (o.kind === 'thought' && o.breath !== false) G.audio.play('breath', { bus: 'voice', vol: 0.4, wet: 0.1, dur: 1.2 });
    if (!G.settings.subtitles && o.kind !== 'thought') return G.wait(dur);
    const box = $('#subtitles');
    const el = document.createElement('div');
    el.className = 'sub ' + (o.kind || '');
    el.innerHTML = (o.speaker ? `<span class="spk">${o.speaker}</span>` : '') + text;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); }, dur * 1000);
    return G.wait(dur);
  };
  UI.think = (text, o = {}) => UI.say(text, Object.assign({ kind: 'thought' }, o));
  UI.clearSubs = () => { $('#subtitles').innerHTML = ''; };

  // ------------------------------------------------------------------ notifications
  UI.notify = function (id, isDoc) {
    const box = $('#notify');
    const el = document.createElement('div');
    el.className = 'note-pop';
    if (isDoc) {
      const d = G.DOCS[id];
      el.innerHTML = `<div style="width:46px;height:46px;display:flex;align-items:center;justify-content:center;font-size:28px">&#9998;</div><div><div class="t1">Document</div><div class="t2">${d ? d.title : id}</div></div>`;
    } else {
      const it = G.ITEMS[id];
      el.innerHTML = `${G.icons[id] ? `<img src="${G.icons[id]}">` : ''}<div><div class="t1">Picked up</div><div class="t2">${it ? it.name : id}</div></div>`;
    }
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 500); }, 3800);
  };

  UI.hint = function (text, label) {
    const h = $('#hint-toast');
    h.innerHTML = `<small>${label || 'Tom\'s voice, somewhere in your head'}</small>${text}`;
    h.classList.add('on');
    clearTimeout(UI._hintT);
    UI._hintT = setTimeout(() => h.classList.remove('on'), Math.max(5000, text.length * 70));
  };

  UI.keysHelp = function (on) { $('#keys-help').classList.toggle('on', on); };

  // ------------------------------------------------------------------ detection meter
  UI.detect = function (v, visible) {
    const d = $('#detect');
    d.classList.toggle('hidden', !visible);
    if (!visible) return;
    d.querySelector('.fill').style.width = Math.round(v * 100) + '%';
    d.classList.toggle('hot', v > 0.45);
    d.style.opacity = 0.35 + v * 0.65;
  };

  // ------------------------------------------------------------------ focus & inspect UI
  UI.setFocusUI = function (on, help) {
    UI.show('#cursor', on);
    document.body.style.cursor = on && G.input.fallback ? 'none' : '';
    UI.show('#focus-help', on);
    if (help) $('#focus-help').innerHTML = help;
    else $('#focus-help').innerHTML = '<span class="key">RMB</span> step back';
    UI.crosshair(!on);
    UI.setPrompt(null);
  };
  UI.setInspectUI = function (on, name, desc) {
    UI.show('#inspect-info', on);
    if (on) { $('#inspect-info .name').textContent = name || ''; $('#inspect-info .desc').innerHTML = desc || ''; }
    UI.crosshair(!on);
    UI.setPrompt(null);
    G.engine.post.blur.value = on ? 1 : 0;
  };
  UI.setInspectDesc = (html) => { $('#inspect-info .desc').innerHTML = html; };

  // ------------------------------------------------------------------ reader
  UI.read = function (id) {
    const d = G.DOCS[id];
    if (!d) return;
    const p = $('#paper');
    p.className = 'paper ' + (d.style || '');
    p.innerHTML = typeof d.html === 'function' ? d.html() : d.html;
    p.style.width = id === 'map' ? 'min(940px, 94vw)' : '';
    p.scrollTop = 0;
    UI.show('#reader', true);
    UI.readerOpen = true;
    UI.readerOpenedAt = performance.now();
    G.audio.play('paper', { bus: 'ui', wet: 0 });
    G.player.control = false;
    G.engine.post.blur.value = 1;
  };
  UI.closeReader = function () {
    if (!UI.readerOpen || performance.now() - UI.readerOpenedAt < 250) return false;
    UI.show('#reader', false);
    UI.readerOpen = false;
    G.player.control = !G.focus.active;
    G.engine.post.blur.value = 0;
    G.audio.play('paper', { bus: 'ui', wet: 0, vol: 0.5 });
    const cb = UI._afterRead; UI._afterRead = null;
    if (cb) cb();
    return true;
  };
  UI.afterRead = (fn) => { UI._afterRead = fn; };

  // ------------------------------------------------------------------ inventory screen
  let invTab = 'items', selItem = null;
  UI.invOpen = false;
  UI.openInventory = function (tab) {
    UI.invOpen = true;
    UI.show('#inventory', true);
    UI.invTab(tab || invTab);
    G.player.control = false;
    G.engine.post.blur.value = 1;
    G.audio.play('uiClick', { bus: 'ui', wet: 0, vol: 0.6 });
  };
  UI.closeInventory = function () {
    UI.invOpen = false;
    UI.show('#inventory', false);
    G.player.control = true;
    G.engine.post.blur.value = 0;
    G.audio.play('uiBack', { bus: 'ui', wet: 0, vol: 0.6 });
  };
  UI.invTab = function (tab) {
    invTab = tab;
    $$('.inv-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    UI.show('#inv-items', tab === 'items'); UI.show('#inv-docs', tab === 'docs'); UI.show('#inv-map', tab === 'map');
    if (tab === 'items') renderItems();
    if (tab === 'docs') renderDocs();
    if (tab === 'map') renderMap();
  };
  function renderItems() {
    const grid = $('#inv-grid');
    grid.innerHTML = '';
    const inv = G.state.inv;
    if (!inv.includes(selItem)) selItem = inv[0] || null;
    const slots = Math.max(12, inv.length);
    for (let i = 0; i < slots; i++) {
      const id = inv[i];
      const s = document.createElement('div');
      s.className = 'slot' + (id && id === selItem ? ' sel' : '');
      if (id) {
        s.innerHTML = G.icons[id] ? `<img src="${G.icons[id]}">` : `<span>${G.ITEMS[id].name}</span>`;
        s.onclick = () => { selItem = id; renderItems(); G.audio.play('uiHover', { bus: 'ui', wet: 0 }); };
      } else s.style.opacity = 0.35;
      grid.appendChild(s);
    }
    const det = $('#inv-detail');
    if (selItem) {
      const it = G.ITEMS[selItem];
      det.innerHTML = `${G.icons[selItem] ? `<img src="${G.icons[selItem]}">` : ''}<div class="nm">${it.name}</div><div class="ds">${it.desc}</div>`;
    } else det.innerHTML = '<div class="nm">Empty pockets</div><div class="ds">Items you pick up will show here. Most items are used automatically when you interact with the right thing.</div>';
  }
  function renderDocs() {
    const l = $('#doc-list');
    l.innerHTML = '';
    if (!G.state.docs.length) { l.innerHTML = '<div class="doc-empty">No documents yet.</div>'; return; }
    G.state.docs.slice().reverse().forEach((id) => {
      const d = G.DOCS[id]; if (!d) return;
      const el = document.createElement('div');
      el.className = 'doc-item';
      el.innerHTML = `<div class="dk">${d.kind || 'Note'}</div><div class="dt">${d.title}</div>`;
      el.onclick = () => { UI.closeInventory(); UI.read(id); UI.afterRead(() => UI.openInventory('docs')); };
      l.appendChild(el);
    });
  }
  function renderMap() {
    const h = $('#map-holder');
    if (!G.state.flags.has_map) { h.innerHTML = '<div class="map-empty">You don\'t have a map. Tom mentioned he drew one&hellip;</div>'; return; }
    h.innerHTML = UI.mapSVG();
  }

  // Tom's hand-drawn map, generated from the real layout. World x -> svg x, world z -> svg y.
  UI.mapSVG = function () {
    const p = G.player.pos;
    const sx = (x) => 30 + (x + 2) * 5.6, sy = (z) => 150 + z * 5.6;
    const R = (x1, z1, x2, z2, label, lx, lz, extra = '') => `<rect x="${sx(x1)}" y="${sy(z1)}" width="${(x2 - x1) * 5.6}" height="${(z2 - z1) * 5.6}" ${extra}/>` + (label ? `<text x="${sx(lx ?? (x1 + x2) / 2)}" y="${sy(lz ?? (z1 + z2) / 2)}">${label}</text>` : '');
    const f = G.state.flags;
    const px = sx(p.x), pz = sy(p.z);
    const showYou = p.y > -30;
    return `<svg viewBox="0 0 880 380" width="880" height="380" style="background:#d9cca8;border-radius:2px;box-shadow:0 10px 40px rgba(0,0,0,.6)">
      <defs><filter id="pen"><feTurbulence baseFrequency=".04" numOctaves="2" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3"/></filter></defs>
      <g filter="url(#pen)" fill="none" stroke="#3a3122" stroke-width="2.2" font-family="Caveat, cursive" font-size="21">
        <g>
        ${R(0, 2, 24, 6)}${R(0, -2.5, 24, 2, 'C Block', 8, 0.2)}
        ${R(12, 2, 15, 6, '', 0, 0, 'fill="rgba(160,40,30,.25)"')}
        <text x="${sx(11.2)}" y="${sy(8.2)}" style="font-size:18px">our cell</text>
        ${R(18, -7, 24, -2.5, 'guards', 21, -4.3)}
        ${R(24, -8, 40, 8, 'Hall', 32, 4)}
        ${R(34.8, -22, 36.4, -8)}${R(28, -20, 34.8, -12, 'stores', 31.4, -15.5)}${R(36.4, -22, 46, -11, 'Gen B', 41, -16)}
        ${R(40, -8, 84, 28, '', 0, 0, 'stroke-dasharray="8 6"')}<text x="${sx(58)}" y="${sy(14)}">the yard</text>
        ${R(84, 3, 102, 17, 'chapel', 93, 11)}
        <circle cx="${sx(81)}" cy="${sy(-5)}" r="9"/><text x="${sx(76)}" y="${sy(-9)}" style="font-size:17px">tower</text>
        <circle cx="${sx(81)}" cy="${sy(25)}" r="9"/>
        </g>
        <g stroke="#7a1c14" fill="#7a1c14" stroke-width="0">
          <text x="${sx(40.5)}" y="${sy(-2.5)}" style="font-size:17px">shutter &rarr;</text>
          <text x="${sx(60)}" y="${sy(-4.5)}" style="font-size:17px">watch the light!</text>
          <text x="${sx(94)}" y="${sy(20.5)}" style="font-size:18px">the organ is the key</text>
          <text x="${sx(103)}" y="${sy(9)}" style="font-size:34px">&#10006;</text>
          <text x="${sx(103)}" y="${sy(14)}" style="font-size:17px">the sea</text>
          ${f.gate_open ? '' : `<text x="${sx(20)}" y="${sy(-9.5)}" style="font-size:17px">keys in the cabinet</text>`}
        </g>
      </g>
      ${showYou ? `<g><circle cx="${px}" cy="${pz}" r="7" fill="#b3261e"/><circle cx="${px}" cy="${pz}" r="13" fill="none" stroke="#b3261e" stroke-width="2"><animate attributeName="r" values="8;16;8" dur="1.6s" repeatCount="indefinite"/></circle></g>` : ''}
      <text x="24" y="360" font-family="Caveat, cursive" font-size="22" fill="#3a3122">Gallows Rock &mdash; drawn from memory. T.H.</text>
    </svg>`;
  };

  // ------------------------------------------------------------------ pause / settings
  UI.openPause = function () {
    UI.show('#pause', true);
    $('#pause-obj').textContent = G.story ? 'Objective: ' + (G.story.currentObjectiveText() || '') : '';
  };
  UI.closePause = () => UI.show('#pause', false);
  UI.openSettings = function (from) {
    UI.settingsFrom = from;
    UI.show('#settings', true);
    $$('#settings [data-set]').forEach((el) => {
      const k = el.dataset.set, v = G.settings[k];
      if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    });
  };
  UI.closeSettings = function () { UI.show('#settings', false); };

  UI.bindMenus = function (handlers) {
    $$('#ui .menu button').forEach((b) => {
      b.addEventListener('mouseenter', () => G.audio.ready && G.audio.play('uiHover', { bus: 'ui', vol: 0.5, wet: 0 }));
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        G.audio.ready && G.audio.play('uiClick', { bus: 'ui', vol: 0.6, wet: 0 });
        const scope = b.closest('#title-screen') ? 'title' : b.closest('#pause') ? 'pause' : b.closest('#settings') ? 'settings' : b.closest('#credits') ? 'credits' : b.closest('#ending') ? 'ending' : '';
        handlers(scope, b.dataset.act, b);
      });
    });
    $$('#settings [data-set]').forEach((el) => {
      const upd = () => {
        const k = el.dataset.set;
        G.settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? parseFloat(el.value) : el.value;
        G.saveSettings();
        if (k === 'quality') G.engine.applyQuality();
      };
      el.addEventListener('input', upd);
      el.addEventListener('change', upd);
    });
    $$('.inv-tabs button').forEach((b) => b.addEventListener('click', () => { UI.invTab(b.dataset.tab); G.audio.play('uiHover', { bus: 'ui', wet: 0 }); }));
  };

  // ------------------------------------------------------------------ loading
  UI.loading = function (p, label) {
    $('#load-fill').style.width = Math.round(p * 100) + '%';
    if (label) $('#load-status').textContent = label;
  };

  // ------------------------------------------------------------------ caught / ending
  UI.caught = async function (sub) {
    const c = $('#caught');
    $('#caught-sub').textContent = sub || '';
    UI.show(c, true);
    requestAnimationFrame(() => c.classList.add('on'));
    await G.wait(3.2, true);
    c.classList.remove('on');
    await G.wait(1, true);
    UI.show(c, false);
  };
})();
