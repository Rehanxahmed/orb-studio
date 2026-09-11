/* OrbPanel — schema-driven control panel for the orb variants.
   Usage (from a variant page):
     OrbPanel.create({ id: '01-aurora', title: 'Aurora Bloom', groups: [...variant groups..., ...OrbPanel.shellGroups(overrides)],
                       apply: function (params) { ... } })
   The panel renders controls from the schema, remembers values in localStorage, and calls apply() on every change.
   OrbPanel.applyShell(params) sets the shared CSS variables (stroke, inner shadow, glow, halo, rings, size, phone frame).
   Visible when the page is opened on its own (or with ?panel=1); hidden inside the gallery iframes. Press "p" to toggle. */
(function () {
  'use strict';
  var CSS = [
    '.op-panel{position:fixed;top:14px;right:14px;bottom:14px;width:296px;z-index:50;display:flex;flex-direction:column;',
    'font:12px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif;color:#2b2740;',
    'background:rgba(255,255,255,.66);-webkit-backdrop-filter:blur(22px) saturate(1.3);backdrop-filter:blur(22px) saturate(1.3);',
    'border-radius:16px;box-shadow:0 0 0 1px rgba(60,50,100,.10),0 20px 50px -20px rgba(60,50,100,.45);overflow:hidden;-webkit-font-smoothing:antialiased}',
    '.op-panel.op-hidden{display:none}',
    '.op-head{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;border-bottom:1px solid rgba(60,50,100,.08)}',
    '.op-head b{font-size:13px;font-weight:600;flex:1;letter-spacing:-.01em}',
    '.op-btn{border:0;border-radius:8px;padding:5px 9px;font:inherit;font-weight:600;font-size:11px;color:#5a5570;background:rgba(60,50,100,.08);cursor:pointer}',
    '.op-btn:hover{background:rgba(60,50,100,.14)}.op-btn.op-on{background:#f5e7bf;color:#6b5a2c}',
    '.op-body{flex:1;overflow:auto;padding:4px 0 12px;overscroll-behavior:contain}',
    '.op-group{border-bottom:1px solid rgba(60,50,100,.07)}',
    '.op-gh{display:flex;align-items:center;padding:9px 14px 7px;cursor:pointer;user-select:none;font-weight:600;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#7d7894}',
    '.op-gh:after{content:"";margin-left:auto;width:6px;height:6px;border-right:1.5px solid #a09bb5;border-bottom:1.5px solid #a09bb5;transform:rotate(45deg);transition:transform .15s}',
    '.op-group.op-closed .op-gh:after{transform:rotate(-45deg)}.op-group.op-closed .op-gc{display:none}',
    '.op-gc{padding:0 14px 8px}',
    '.op-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;padding:4px 0}',
    '.op-row label{color:#4a4560}.op-row .op-val{font-variant-numeric:tabular-nums;color:#8b86a3;font-size:11px}',
    '.op-row input[type=range]{grid-column:1/3;width:100%;margin:2px 0 0;-webkit-appearance:none;appearance:none;height:18px;background:transparent}',
    '.op-row input[type=range]::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:rgba(60,50,100,.16)}',
    '.op-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5.5px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(60,50,100,.2),0 2px 6px rgba(60,50,100,.25)}',
    '.op-color{display:flex;align-items:center;gap:8px;justify-content:flex-end}',
    '.op-color input[type=color]{-webkit-appearance:none;appearance:none;width:26px;height:22px;border:0;padding:0;background:none;cursor:pointer}',
    '.op-color input[type=color]::-webkit-color-swatch-wrapper{padding:0}.op-color input[type=color]::-webkit-color-swatch{border-radius:6px;border:1px solid rgba(60,50,100,.18)}',
    '.op-color input[type=text]{width:66px;font:inherit;font-size:11px;font-variant-numeric:tabular-nums;padding:3px 6px;border-radius:6px;border:1px solid rgba(60,50,100,.14);background:rgba(255,255,255,.6);color:#2b2740}',
    '.op-toggle{width:34px;height:20px;border-radius:10px;background:rgba(60,50,100,.18);position:relative;cursor:pointer;justify-self:end}',
    '.op-toggle:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:left .15s}',
    '.op-toggle.op-on{background:#e4b94a}.op-toggle.op-on:after{left:16px}',
    '.op-pill{position:fixed;top:14px;right:14px;z-index:50;display:none}.op-pill.op-show{display:block}',
    '.op-foot{padding:8px 14px;border-top:1px solid rgba(60,50,100,.08);font-size:11px;color:#8b86a3}',
    '/* phone-frame preview mode */',
    'html.device{--R:calc(66.3px * var(--device-scale,1) * var(--orb-scale,1))}',
    'html.device body{background:#e9e6f0}',
    'html.device .scene{inset:auto;left:calc(50% - 155px);top:50%;width:calc(390px * var(--device-scale,1));height:calc(844px * var(--device-scale,1));transform:translate(-50%,-50%);',
    'border-radius:calc(46px * var(--device-scale,1));box-shadow:0 0 0 1px rgba(58,50,100,.10),0 30px 60px -30px rgba(58,50,100,.5)}',
    'html.device.op-nopanel .scene{left:50%}'
  ].join('');

  function hexToRgb(h) { h = (h || '#000000').replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 }; }
  function rgba(hex, a) { var c = hexToRgb(hex); return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + (+a).toFixed(3) + ')'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(v, step) { var d = (String(step).split('.')[1] || '').length; return (+v).toFixed(d); }

  var standalone = window.self === window.top;
  var q = new URLSearchParams(location.search);
  var wantPanel = q.get('panel') === '1' || (standalone && q.get('panel') !== '0');

  function shellGroups(o) {
    o = o || {};
    function d(k, v) { return o[k] === undefined ? v : o[k]; }
    return [
      { name: 'Stroke', controls: [
        { key: 'rimWidth', label: 'Width', type: 'range', min: 0, max: 4, step: 0.25, value: d('rimWidth', 1), unit: 'px' },
        { key: 'rimColor', label: 'Color', type: 'color', value: d('rimColor', '#ffffff') },
        { key: 'rimAlpha', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01, value: d('rimAlpha', 0.6) } ] },
      { name: 'Inner shadow', controls: [
        { key: 'ishColor', label: 'Color', type: 'color', value: d('ishColor', '#e8be6e') },
        { key: 'ishAlpha', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01, value: d('ishAlpha', 0.3) },
        { key: 'ishX', label: 'Offset X', type: 'range', min: -30, max: 30, step: 1, value: d('ishX', 0), unit: 'px' },
        { key: 'ishY', label: 'Offset Y', type: 'range', min: -30, max: 30, step: 1, value: d('ishY', -6), unit: 'px' },
        { key: 'ishBlur', label: 'Blur', type: 'range', min: 0, max: 60, step: 1, value: d('ishBlur', 14), unit: 'px' },
        { key: 'ishSpread', label: 'Spread', type: 'range', min: 0, max: 30, step: 1, value: d('ishSpread', 0), unit: 'px' } ] },
      { name: 'Outer glow', controls: [
        { key: 'glowColor', label: 'Color', type: 'color', value: d('glowColor', '#f6d682') },
        { key: 'glowAlpha', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01, value: d('glowAlpha', 0.45) },
        { key: 'glowSize', label: 'Blur', type: 'range', min: 0, max: 120, step: 1, value: d('glowSize', 40), unit: 'px' },
        { key: 'glowSpread', label: 'Spread', type: 'range', min: 0, max: 40, step: 1, value: d('glowSpread', 6), unit: 'px' },
        { key: 'glowWide', label: 'Wide glow', type: 'range', min: 0, max: 1, step: 0.01, value: d('glowWide', 0.22) } ] },
      { name: 'Halo & rings', controls: [
        { key: 'haloColor', label: 'Halo color', type: 'color', value: d('haloColor', '#fde8aa') },
        { key: 'haloAlpha', label: 'Halo opacity', type: 'range', min: 0, max: 1.5, step: 0.01, value: d('haloAlpha', 1) },
        { key: 'haloSize', label: 'Halo size', type: 'range', min: 2, max: 9, step: 0.1, value: d('haloSize', 5.2), unit: '×R' },
        { key: 'ringsOn', label: 'Rings', type: 'toggle', value: d('ringsOn', true) },
        { key: 'ringColor', label: 'Ring color', type: 'color', value: d('ringColor', '#ffffff') },
        { key: 'ringAlpha', label: 'Ring opacity', type: 'range', min: 0, max: 2, step: 0.01, value: d('ringAlpha', 1) },
        { key: 'ringWidth', label: 'Ring width', type: 'range', min: 0.5, max: 3, step: 0.25, value: d('ringWidth', 1), unit: 'px' },
        { key: 'ringSpacing', label: 'Ring spacing', type: 'range', min: 0.6, max: 1.6, step: 0.01, value: d('ringSpacing', 1) } ] },
      { name: 'Size & view', controls: [
        { key: 'orbScale', label: 'Orb size', type: 'range', min: 0.5, max: 1.8, step: 0.01, value: d('orbScale', 1), unit: '×' },
        { key: 'phoneFrame', label: 'Phone frame', type: 'toggle', value: d('phoneFrame', standalone) } ] }
    ];
  }

  function applyShell(p) {
    var r = document.documentElement.style, H = document.documentElement;
    r.setProperty('--orb-scale', p.orbScale);
    r.setProperty('--orb-inner', 'inset 0 0 0 ' + p.rimWidth + 'px ' + rgba(p.rimColor, p.rimAlpha) + ', inset ' + p.ishX + 'px ' + p.ishY + 'px ' + p.ishBlur + 'px ' + p.ishSpread + 'px ' + rgba(p.ishColor, p.ishAlpha));
    r.setProperty('--orb-outer', '0 0 ' + p.glowSize + 'px ' + p.glowSpread + 'px ' + rgba(p.glowColor, p.glowAlpha) + ', 0 0 ' + Math.round(p.glowSize * 2.25) + 'px ' + Math.round(p.glowSpread * 3.3) + 'px ' + rgba(p.glowColor, p.glowWide));
    r.setProperty('--halo-size', p.haloSize);
    r.setProperty('--halo-bg', 'radial-gradient(circle, ' + rgba(p.haloColor, clamp(.62 * p.haloAlpha, 0, 1)) + ' 0%, ' + rgba(p.haloColor, clamp(.34 * p.haloAlpha, 0, 1)) + ' 22%, ' + rgba(p.haloColor, clamp(.12 * p.haloAlpha, 0, 1)) + ' 42%, ' + rgba(p.haloColor, 0) + ' 62%)');
    r.setProperty('--ring-w', p.ringWidth + 'px');
    r.setProperty('--ring-1', rgba(p.ringColor, clamp(.40 * p.ringAlpha, 0, 1)));
    r.setProperty('--ring-2', rgba(p.ringColor, clamp(.32 * p.ringAlpha, 0, 1)));
    r.setProperty('--ring-3', rgba(p.ringColor, clamp(.24 * p.ringAlpha, 0, 1)));
    r.setProperty('--ring-sp', p.ringSpacing);
    r.setProperty('--rings-display', p.ringsOn ? 'block' : 'none');
    H.classList.toggle('device', !!p.phoneFrame && standalone);   // never inside the gallery iframes
    fitDevice();
  }
  function fitDevice() {
    var s = Math.min(1, (window.innerHeight - 40) / 844);
    document.documentElement.style.setProperty('--device-scale', s);
  }
  window.addEventListener('resize', fitDevice);

  function create(cfg) {
    var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    var defaults = {}, controls = {};
    cfg.groups.forEach(function (g) { g.controls.forEach(function (c) { defaults[c.key] = c.value; controls[c.key] = c; }); });
    var params = Object.assign({}, defaults);
    var storeKey = 'orb-panel:' + cfg.id;
    try { var saved = JSON.parse(localStorage.getItem(storeKey) || 'null'); if (saved) Object.keys(saved).forEach(function (k) { if (k in defaults) params[k] = saved[k]; }); } catch (e) {}

    var panel = document.createElement('div'); panel.className = 'op-panel';
    var pill = document.createElement('button'); pill.className = 'op-btn op-pill'; pill.textContent = 'Tune ⌃'; document.body.appendChild(pill);
    panel.innerHTML = '<div class="op-head"><b>' + cfg.title + '</b><button class="op-btn" data-a="pause">Pause</button><button class="op-btn" data-a="paste">Paste</button><button class="op-btn" data-a="copy">Copy</button><button class="op-btn" data-a="reset">Reset</button><button class="op-btn" data-a="hide">×</button></div><div class="op-body"></div><div class="op-foot">Values stick in this browser · press <b>p</b> to toggle · Copy gives JSON to hand back</div>';
    var body = panel.querySelector('.op-body');
    var inputs = {};

    cfg.groups.forEach(function (g, gi) {
      var ge = document.createElement('div'); ge.className = 'op-group' + (g.closed ? ' op-closed' : '');
      ge.innerHTML = '<div class="op-gh">' + g.name + '</div><div class="op-gc"></div>';
      ge.querySelector('.op-gh').addEventListener('click', function () { ge.classList.toggle('op-closed'); });
      var gc = ge.querySelector('.op-gc');
      g.controls.forEach(function (c) {
        var row = document.createElement('div'); row.className = 'op-row';
        if (c.type === 'range') {
          row.innerHTML = '<label>' + c.label + '</label><span class="op-val"></span><input type="range" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '">';
          var inp = row.querySelector('input'), val = row.querySelector('.op-val');
          inp.value = params[c.key]; val.textContent = fmt(params[c.key], c.step) + (c.unit || '');
          inp.addEventListener('input', function () { set(c.key, +inp.value); val.textContent = fmt(inp.value, c.step) + (c.unit || ''); });
          inputs[c.key] = function (v) { inp.value = v; val.textContent = fmt(v, c.step) + (c.unit || ''); };
        } else if (c.type === 'color') {
          row.innerHTML = '<label>' + c.label + '</label><div class="op-color"><input type="text" spellcheck="false"><input type="color"></div>';
          var col = row.querySelector('input[type=color]'), txt = row.querySelector('input[type=text]');
          col.value = params[c.key]; txt.value = params[c.key];
          col.addEventListener('input', function () { txt.value = col.value; set(c.key, col.value); });
          txt.addEventListener('change', function () { var v = txt.value.trim(); if (!/^#/.test(v)) v = '#' + v; if (/^#[0-9a-f]{6}$/i.test(v)) { col.value = v.toLowerCase(); set(c.key, v.toLowerCase()); } else txt.value = params[c.key]; });
          inputs[c.key] = function (v) { col.value = v; txt.value = v; };
        } else if (c.type === 'toggle') {
          row.innerHTML = '<label>' + c.label + '</label><div class="op-toggle' + (params[c.key] ? ' op-on' : '') + '"></div>';
          var tg = row.querySelector('.op-toggle');
          tg.addEventListener('click', function () { set(c.key, !params[c.key]); tg.classList.toggle('op-on', params[c.key]); });
          inputs[c.key] = function (v) { tg.classList.toggle('op-on', !!v); };
        }
        gc.appendChild(row);
      });
      body.appendChild(ge);
    });

    var pending = false;
    function flush() { pending = false; try { cfg.apply(params); } catch (e) { console.error('orb apply failed', e); } }
    function set(k, v) {
      params[k] = v;
      try { localStorage.setItem(storeKey, JSON.stringify(params)); } catch (e) {}
      if (!pending) { pending = true; requestAnimationFrame(flush); }
    }
    function show(on) { panel.classList.toggle('op-hidden', !on); pill.classList.toggle('op-show', !on); document.documentElement.classList.toggle('op-nopanel', !on); }
    panel.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return;
      if (a === 'hide') show(false);
      if (a === 'reset') { Object.assign(params, defaults); try { localStorage.removeItem(storeKey); } catch (e2) {} Object.keys(inputs).forEach(function (k) { inputs[k](params[k]); }); flush(); }
      if (a === 'copy') { var s = JSON.stringify(params, null, 2); (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(function () { e.target.textContent = 'Copied'; setTimeout(function () { e.target.textContent = 'Copy'; }, 1200); }, function () { window.prompt('Copy these settings:', s); }); }
      if (a === 'paste') {
        var apply = function (t) { var o; try { o = JSON.parse(String(t || '').trim()); } catch (er) { window.alert('That is not settings text. Paste exactly what Copy produced.'); return; }
          var st = o && o.settings && typeof o.settings === 'object' ? o.settings : o, n = 0;
          if (st && typeof st === 'object') Object.keys(st).forEach(function (k) { if (k in defaults) { params[k] = st[k]; n++; } });
          if (!n) { window.alert('No matching values found in that text.'); return; }
          try { localStorage.setItem(storeKey, JSON.stringify(params)); } catch (er2) {}
          Object.keys(inputs).forEach(function (k) { inputs[k](params[k]); }); flush(); };
        var t = window.prompt('Paste the settings text (from Copy):', ''); if (t) apply(t);
      }
      if (a === 'pause') { params.paused = !params.paused; e.target.textContent = params.paused ? 'Play' : 'Pause'; e.target.classList.toggle('op-on', params.paused); flush(); }
    });
    pill.addEventListener('click', function () { show(true); });
    window.addEventListener('keydown', function (e) { if (e.key === 'p' && !/input|textarea/i.test(document.activeElement.tagName)) show(panel.classList.contains('op-hidden')); });
    document.body.appendChild(panel);
    show(wantPanel);
    if (!wantPanel) pill.classList.remove('op-show');   // inside the gallery: no panel, no pill
    params.paused = false;
    flush();
    return { params: params, set: set };
  }

  window.OrbPanel = { create: create, shellGroups: shellGroups, applyShell: applyShell, rgba: rgba, hexToRgb: hexToRgb };
})();
