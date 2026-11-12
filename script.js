/* Suryam — all JavaScript in one file
   Sections: 1 Theme · 2 Validation · 3 UI (nav, sun scene, estimator, chart) · 4 Calculator · 5 Chatbot · 6 Router */

/* ========== 1. THEME (light/dark + localStorage) ========== */
/* Light/Dark mode — CSS tokens + localStorage persistence */
(function () {
  var KEY = 'suryam-theme', root = document.documentElement, saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var theme = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  root.setAttribute('data-theme', theme);
  function paint(btn) {
    var dark = root.getAttribute('data-theme') === 'dark';
    btn.textContent = dark ? '☀' : '☾';
    btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', String(dark));
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      paint(btn);
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        document.querySelectorAll('[data-theme-toggle]').forEach(paint);
      });
    });
  });
})();

/* ========== 2. FORM VALIDATION ========== */
/* Form validation — regex rules from the IA-3 checklist */
(function () {
  var RULES = {
    name:   { re: /^[a-zA-Z\s]{2,50}$/, msg: 'Use 2–50 letters and spaces only.' },
    empid:  { re: /^[A-Z0-9]{6,12}$/i, msg: 'Enter 6–12 letters or digits.' },
    email:  { re: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, msg: 'Enter a valid email, like name@example.com.' },
    mobile: { re: /^[6-9]\d{9}$/, msg: 'Enter 10 digits starting with 6, 7, 8 or 9.' },
    pass:   { re: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, msg: 'Use 8+ characters with upper, lower, a number and one of @$!%*?&.' },
    login:  { re: /^.{8,}$/, msg: 'Password must be at least 8 characters.' }
  };
  function check(el, form) {
    var rule = el.dataset.rule, ok = true, msg = '';
    if (rule === 'select') { ok = el.value !== ''; msg = 'Choose a division.'; }
    else if (rule === 'confirm') { var p = form.querySelector('[data-rule=pass]'); ok = el.value !== '' && p && el.value === p.value; msg = 'Passwords do not match.'; }
    else if (rule === 'terms') { ok = el.checked; msg = 'Accept the terms to continue.'; }
    else { ok = RULES[rule].re.test(el.value.trim()); msg = RULES[rule].msg; }
    return { ok: ok, msg: msg };
  }
  function show(el, res) {
    var out = el.closest('.field').querySelector('.error-msg');
    el.classList.toggle('invalid', !res.ok);
    el.classList.toggle('valid', res.ok);
    el.setAttribute('aria-invalid', String(!res.ok));
    if (out) out.textContent = res.ok ? '' : res.msg;
  }
  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    var fields = [].slice.call(form.querySelectorAll('[data-rule]'));
    var btn = form.querySelector('[type=submit]');
    var gate = !form.hasAttribute('data-nogate');
    function all() { return fields.every(function (f) { return check(f, form).ok; }); }
    function sync() { if (gate) btn.disabled = !all(); }
    fields.forEach(function (f) {
      f.addEventListener('blur', function () { show(f, check(f, form)); sync(); });
      f.addEventListener(f.type === 'checkbox' || f.tagName === 'SELECT' ? 'change' : 'input', function () {
        if (f.classList.contains('invalid') || f.classList.contains('valid') || f.type === 'checkbox') show(f, check(f, form));
        if (f.dataset.rule === 'pass') { var c = form.querySelector('[data-rule=confirm]'); if (c && c.value) show(c, check(c, form)); var m = form.querySelector('#strength'); if (m) m.value = ['(?=.*[a-z])','(?=.*[A-Z])','(?=.*\\d)','(?=.*[@$!%*?&])','.{8,}'].filter(function (r) { return new RegExp('^' + r).test(f.value); }).length; }
        sync();
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = fields.filter(function (f) { var r = check(f, form); show(f, r); return !r.ok; });
      var banner = form.querySelector('.alert');
      if (banner) banner.hidden = bad.length === 0;
      if (bad.length) { bad[0].focus(); return; }
      var data = {}; fields.forEach(function (f) { if (f.name && f.type !== 'password') data[f.name] = f.value.trim(); });
      if (data.name || data.email) { try { var old = JSON.parse(localStorage.getItem('suryam-user') || '{}'); localStorage.setItem('suryam-user', JSON.stringify(Object.assign(old, data))); } catch (x) {} }
      var done = form.dataset.next, dlg = form.parentElement.querySelector('dialog');
      if (dlg && dlg.showModal) { dlg.showModal(); dlg.querySelector('button').onclick = function () { dlg.close(); location.hash = '#' + done; }; }
      else location.hash = '#' + done;
    });
    sync();
  });
  document.querySelectorAll('[data-toggle-pw]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = document.getElementById(b.dataset.togglePw), show = i.type === 'password';
      i.type = show ? 'text' : 'password';
      b.textContent = show ? '🙈' : '👁';
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });
})();

/* ========== 3. UI: NAV, SUN SCENE, ESTIMATOR, CHART ========== */
/* Shared UI: nav drawer, sun-path scene, savings estimator, generation chart */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  document.querySelectorAll('[data-menu]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = document.getElementById(b.dataset.menu), open = t.classList.toggle('open');
      b.setAttribute('aria-expanded', String(open));
    });
  });
  /* hero: sun path */
  var slider = $('#hour');
  if (slider) {
    var sun = $('#sun'), glow = $('#glow'), dim = $('#dim'), P = 2.5, E = 1.5;
    var power = function (t) { return P * Math.pow(Math.sin(Math.PI * t), E); };
    function scene() {
      var t = slider.value / 100, x = 40 + 520 * t, y = 300 - 1040 * t * (1 - t), kw = power(t), sum = 0;
      for (var i = 0; i < slider.value; i++) sum += power(i / 100) * 0.12;
      sun.setAttribute('cx', x); sun.setAttribute('cy', y); glow.setAttribute('cx', x); glow.setAttribute('cy', y);
      glow.setAttribute('r', 30 + kw * 14); dim.setAttribute('opacity', (0.55 * (1 - Math.sin(Math.PI * t))).toFixed(2));
      var h = 6 + 12 * t, hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
      $('#oTime').textContent = (hh > 12 ? hh - 12 : hh) + ':' + String(mm).padStart(2, '0') + (hh >= 12 ? ' PM' : ' AM');
      $('#oKw').textContent = kw.toFixed(2) + ' kW';
      $('#oKwh').textContent = sum.toFixed(1) + ' kWh';
      slider.setAttribute('aria-valuetext', $('#oTime').textContent);
    }
    slider.addEventListener('input', scene); slider.value = 52; scene();
  }
  /* dashboard estimator */
  var est = $('#estimator');
  if (est) {
    var f = est.elements, rupee = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
    function run() {
      var bill = +f.bill.value, rate = +f.rate.value, cover = +f.cover.value / 100;
      var units = bill / rate, kw = Math.max(1, Math.ceil(units * cover / 135 * 2) / 2);
      var cost = kw * 60000, sub = Math.min(kw, 2) * 30000 + (kw > 2 ? Math.min(kw - 2, 1) * 18000 : 0);
      var net = cost - sub, yearly = Math.min(kw * 135, units) * 12 * rate;
      $('#oBill').textContent = rupee(bill); $('#oCover').textContent = f.cover.value + '%';
      $('#eKw').textContent = kw + ' kW'; $('#eCost').textContent = rupee(cost); $('#eSub').textContent = rupee(sub);
      $('#eNet').textContent = rupee(net); $('#eYear').textContent = rupee(yearly);
      $('#ePay').textContent = (net / yearly).toFixed(1) + ' yrs'; $('#eCo2').textContent = (kw * 135 * 12 * 0.71 / 1000).toFixed(1) + ' t/yr';
      $('#payBar').value = Math.min(10, net / yearly);
    }
    est.addEventListener('input', run); run();
  }
  /* greeting from registration (refreshed on every route change) */
  function greet() {
    var hi = $('#userName'); if (!hi) return;
    try {
      var u = JSON.parse(localStorage.getItem('suryam-user') || '{}'), n = (u.name || u.email || 'Guest').split(/[\s@]/)[0];
      hi.textContent = n; var h2 = $('#userName2'); if (h2) h2.textContent = n;
      var av = $('#avatar'); if (av) av.textContent = n.charAt(0).toUpperCase();
    } catch (e) {}
  }
  greet(); addEventListener('route', greet);
  /* generation chart (canvas) */
  var cv = $('#chart');
  if (cv) {
    var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], D = [390,410,460,440,420,350,330,340,360,380,350,360];
    function draw() {
      var cs = getComputedStyle(document.documentElement), dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; var c = cv.getContext('2d'); c.scale(dpr, dpr); c.clearRect(0, 0, w, h);
      var ink = cs.getPropertyValue('--muted').trim(), line = cs.getPropertyValue('--line').trim(), bar = cs.getPropertyValue('--brand').trim(), sun = cs.getPropertyValue('--sun').trim();
      var pad = 30, bw = (w - pad) / 12, max = 500;
      c.font = '12px sans-serif'; c.fillStyle = ink; c.strokeStyle = line; c.textAlign = 'center';
      for (var g = 0; g <= 500; g += 100) { var gy = h - 24 - (h - 44) * g / max; c.beginPath(); c.moveTo(pad, gy); c.lineTo(w, gy); c.stroke(); c.textAlign = 'right'; c.fillText(g, pad - 4, gy + 4); }
      c.textAlign = 'center';
      D.forEach(function (v, i) { var bh = (h - 44) * v / max, x = pad + i * bw + bw * .18; c.fillStyle = v === Math.max.apply(null, D) ? sun : bar; c.fillRect(x, h - 24 - bh, bw * .64, bh); c.fillStyle = ink; c.fillText(M[i], x + bw * .32, h - 8); });
    }
    draw(); addEventListener('resize', draw);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
})();

/* ========== 4. CALCULATOR ========== */
/* Calculator — digits, + - * /, C, = with divide-by-zero handling */
(function () {
  var box = document.getElementById('calc'); if (!box) return;
  var keys = ['C','⌫','%','/','7','8','9','*','4','5','6','-','1','2','3','+','0','.','=',''];
  var screen = box.querySelector('.calc-main'), hist = box.querySelector('small'), pad = box.querySelector('.keys');
  var cur = '0', prev = null, op = null, fresh = false, err = false;
  keys.forEach(function (k) {
    if (!k) return;
    var b = document.createElement('button'); b.type = 'button'; b.textContent = k === '*' ? '×' : k === '/' ? '÷' : k; b.dataset.k = k;
    b.className = k === '=' ? 'eq' : k === 'C' ? 'clr' : '+-*/'.indexOf(k) > -1 ? 'op' : '';
    if (k === '0') b.style.gridColumn = 'span 1';
    pad.appendChild(b);
  });
  function compute(a, b, o) { a = parseFloat(a); b = parseFloat(b);
    if (o === '+') return a + b; if (o === '-') return a - b; if (o === '*') return a * b;
    if (o === '/') return b === 0 ? null : a / b; return b; }
  function fmt(n) { return String(+parseFloat(n).toPrecision(12)); }
  function draw() { screen.textContent = cur; hist.textContent = prev !== null && op ? fmt(prev) + ' ' + ({'*':'×','/':'÷'}[op] || op) : ''; }
  function press(k) {
    if (err && k !== 'C') return;
    if (/\d/.test(k)) { cur = (cur === '0' || fresh) ? k : (cur.length < 14 ? cur + k : cur); fresh = false; }
    else if (k === '.') { if (fresh) { cur = '0'; fresh = false; } if (cur.indexOf('.') < 0) cur += '.'; }
    else if (k === 'C') { cur = '0'; prev = op = null; err = fresh = false; }
    else if (k === '⌫') { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; }
    else if (k === '%') { cur = fmt(parseFloat(cur) / 100); }
    else if ('+-*/'.indexOf(k) > -1) {
      if (op && !fresh) { var r = compute(prev, cur, op); if (r === null) return fail(); prev = r; cur = fmt(r); } else prev = parseFloat(cur);
      op = k; fresh = true;
    } else if (k === '=') {
      if (!op) return; var res = compute(prev, cur, op); if (res === null) return fail();
      cur = fmt(res); prev = null; op = null; fresh = true;
    }
    draw();
  }
  function fail() { err = true; cur = 'Cannot divide by 0'; prev = op = null; screen.style.fontSize = '1.1rem'; draw(); setTimeout(function () { screen.style.fontSize = ''; }, 0); }
  pad.addEventListener('click', function (e) { var k = e.target.dataset.k; if (k) { if (cur === 'Cannot divide by 0' && k === 'C') screen.style.fontSize = ''; press(k); } });
  box.addEventListener('keydown', function (e) {
    var k = e.key === 'Enter' ? '=' : e.key === 'Backspace' ? '⌫' : e.key === 'Escape' ? 'C' : e.key;
    if (/^[\d.+\-*/%=C⌫]$/.test(k)) { e.preventDefault(); press(k); }
  });
  draw();
})();

/* ========== 5. CHATBOT ========== */
/* Surya Assistant — keyword-matching chatbot, injected on every page */
(function () {
  var KB = [
    { k: ['hello','hi','hey','namaste'], a: 'Namaste! I am Surya Assistant. Ask me about solar panels, subsidy, cost, savings or maintenance.' },
    { k: ['subsidy','pm surya','scheme','government'], a: 'Under PM Surya Ghar, central support is about ₹30,000 per kW for the first 2 kW and ₹18,000 for the 3rd kW, capped at ₹78,000. Amounts can change, so confirm on the national portal before you apply.' },
    { k: ['cost','price','expensive','budget'], a: 'A home rooftop system costs roughly ₹55,000–₹70,000 per kW before subsidy. A 3 kW system is the common size for a family home. Use the estimator on the Dashboard for your bill.' },
    { k: ['save','saving','bill','payback','roi'], a: 'Most households recover the net cost in 4–6 years and then get about 20 more years of near-free power. Try the savings estimator on the Dashboard.' },
    { k: ['size','kw','how many panels','capacity'], a: 'Rule of thumb: 1 kW needs about 8–10 m² of shadow-free roof and makes about 4–5 units a day across most of India. Divide your monthly units by 135 to get the kW you need.' },
    { k: ['net meter','netmeter','grid','export'], a: 'Net metering lets your extra daytime units flow to the grid and be credited against evening use. Your electricity board installs a bi-directional meter.' },
    { k: ['maintenance','clean','dust','repair'], a: 'Wipe panels with water and a soft cloth every 2–3 weeks in dusty areas, early morning. Check the inverter display monthly. Most panels carry a 25-year performance warranty.' },
    { k: ['battery','night','power cut','backup'], a: 'A grid-tied system switches off during a grid outage for safety. For backup you need a hybrid inverter plus a battery, which adds cost.' },
    { k: ['rain','cloud','monsoon','weather'], a: 'Panels still work under cloud, at roughly 10–30% of full output. Rain also washes dust off. Monsoon months give the lowest monthly total.' },
    { k: ['co2','carbon','environment','climate','sdg'], a: 'A 3 kW system avoids about 3 tonnes of CO₂ a year. That supports SDG 7 (Affordable and Clean Energy) and SDG 13 (Climate Action).' },
    { k: ['calculator','calc'], a: 'The calculator is on the Dashboard, right column. Use it for quick sums like units × rate. You can also type on your keyboard.' },
    { k: ['dark','light','theme'], a: 'Use the ☾ / ☀ button in the top bar. Your choice is saved in this browser.' },
    { k: ['register','sign','login','account'], a: 'Use Register for a full profile, Sign up for a quick account, or Sign in if you already have one. All forms check your input as you type.' },
    { k: ['thanks','thank','bye'], a: 'You are welcome! Switch on the sunshine ☀' }
  ];
  var CHIPS = ['Subsidy','Cost','Panel size','Maintenance'];
  var fab = document.createElement('button'); fab.className = 'fab'; fab.type = 'button'; fab.textContent = '💬'; fab.setAttribute('aria-label', 'Open chat assistant'); fab.setAttribute('aria-expanded', 'false');
  var box = document.createElement('div'); box.className = 'chat'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Chat assistant');
  box.innerHTML = '<div class="chat-head"><span>☀ Surya Assistant</span><button type="button" aria-label="Close chat">×</button></div><div class="chat-log" aria-live="polite"></div><div class="chips"></div><form class="chat-form"><input type="text" placeholder="Ask about solar…" aria-label="Your message" autocomplete="off"><button class="btn sm sun" type="submit">Send</button></form>';
  document.body.append(box, fab);
  var log = box.querySelector('.chat-log'), form = box.querySelector('form'), input = box.querySelector('input'), chips = box.querySelector('.chips');
  function add(text, cls) { var m = document.createElement('div'); m.className = cls; m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; }
  function reply(q) {
    var t = q.toLowerCase(), hit = KB.find(function (e) { return e.k.some(function (w) { return t.indexOf(w) > -1; }); });
    return hit ? hit.a : 'I can help with solar subsidy, cost, panel size, savings, net metering, maintenance and the environment. Try one of those words.';
  }
  function ask(q) {
    add(q, 'user-msg');
    setTimeout(function () { add(reply(q), 'bot-msg'); }, 450);
  }
  CHIPS.forEach(function (c) { var b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.onclick = function () { ask(c); }; chips.appendChild(b); });
  function toggle(open) { box.hidden = !open; fab.setAttribute('aria-expanded', String(open)); fab.textContent = open ? '×' : '💬'; if (open) input.focus(); }
  fab.onclick = function () { toggle(box.hidden); };
  box.querySelector('.chat-head button').onclick = function () { toggle(false); };
  form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value.trim(); if (!q) return; input.value = ''; ask(q); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) toggle(false); });
  add('Namaste! Ask me anything about rooftop solar for your home.', 'bot-msg');
})();


/* ===== Page router: shows one page at a time using the URL hash ===== */
(function () {
  var pages = {}, current = null;
  document.querySelectorAll('.page').forEach(function (p) { pages[p.id.slice(2)] = p; });
  function route() {
    var h = decodeURIComponent(location.hash.slice(1)), name = 'index', anchor = null;
    if (pages[h]) name = h;
    else if (h && document.getElementById(h)) {
      anchor = document.getElementById(h);
      var pg = anchor.closest('.page'); name = pg ? pg.id.slice(2) : (current || 'index');
    }
    var changed = name !== current; current = name;
    Object.keys(pages).forEach(function (k) { pages[k].classList.toggle('active', k === name); });
    document.title = pages[name].dataset.title + ' | Suryam Rooftop Solar Guide';
    document.querySelectorAll('.nav ul a').forEach(function (a) {
      if (a.getAttribute('href') === '#' + name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var nav = document.getElementById('nav'); if (nav) nav.classList.remove('open');
    var side = document.getElementById('side'); if (side) side.classList.remove('open');
    dispatchEvent(new Event('route')); dispatchEvent(new Event('resize'));
    requestAnimationFrame(function () { if (anchor) anchor.scrollIntoView(); else if (changed) scrollTo(0, 0); });
  }
  addEventListener('hashchange', route); route();
})();
