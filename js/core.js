/* Portero Alpha Academy — núcleo: utilidades, base de datos local, navegación */
(function () {
  'use strict';
  const PA = (window.PA = window.PA || {});
  PA.VERSION = '1.1.0';
  PA.views = {};
  PA.state = {};
  PA.LEVELS = { 1: 'Nivel 1 · Iniciación', 2: 'Nivel 2 · Intermedio', 3: 'Nivel 3 · Avanzado' };
  PA.LEVEL_SHORT = { 1: 'Iniciación', 2: 'Intermedio', 3: 'Avanzado' };
  PA.CATS = [
    'Calentamiento', 'Posición y desplazamientos', 'Blocaje y atajadas', 'Reacciones', 'Estiradas',
    'Juego aéreo', 'Salidas y 1 contra 1', 'Juego con los pies', 'Saques con la mano', 'Situaciones de juego'
  ];

  /* ---------- crear elementos del DOM sin riesgos ---------- */
  PA.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    const props = {};
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'value' || k === 'checked') props[k] = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    kids.flat(Infinity).forEach((c) => {
      if (c == null || c === false) return;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    for (const k in props) el[k] = props[k];
    return el;
  };
  const h = PA.h;

  /* ---------- utilidades ---------- */
  PA.uid = (n = 8) => Math.random().toString(36).slice(2, 2 + n) + Date.now().toString(36).slice(-3);
  PA.todayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  PA.fmtDate = (s) => {
    if (!s) return '';
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  PA.fmtDateLong = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    const t = new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  PA.age = (s) => {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    const now = new Date();
    let a = now.getFullYear() - y;
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
    return a >= 0 && a < 100 ? a : null;
  };
  PA.initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  PA.debounce = (fn, ms) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };
  PA.avatar = (s, size) =>
    h('div', { class: 'avatar', style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.38) + 'px' } },
      s.foto ? h('img', { src: s.foto, alt: s.nombre }) : PA.initials(s.nombre));
  PA.plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  PA.pctClass = (p) => (p == null ? '' : p >= 80 ? 'good' : p >= 60 ? 'mid' : 'low');

  PA.copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); PA.toast('Copiado ✓'); return true; } catch (e) { /* intento alternativo */ }
    try {
      const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } });
      ta.value = text; document.body.append(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      if (ok) { PA.toast('Copiado ✓'); return true; }
    } catch (e) { /* nada */ }
    PA.toast('No se pudo copiar');
    return false;
  };
  PA.download = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  /* reducir la foto del alumno para que pese poco (≈ 20–40 KB) */
  PA.resizePhoto = (file, size = 360) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('foto')); };
    img.src = url;
  });

  /* ---------- base de datos local (IndexedDB) ---------- */
  let dbp;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('portero-alpha', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        ['students', 'exercises', 'sessions'].forEach((n) => d.createObjectStore(n, { keyPath: 'id' }));
        d.createObjectStore('attendance', { keyPath: 'date' });
        d.createObjectStore('meta', { keyPath: 'key' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return open().then((db) => new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      const r = fn(s);
      if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }
  PA.db = {
    open,
    get: (s, k) => tx(s, 'readonly', (o) => o.get(k)),
    all: (s) => tx(s, 'readonly', (o) => o.getAll()),
    put: (s, v) => tx(s, 'readwrite', (o) => o.put(v)),
    del: (s, k) => tx(s, 'readwrite', (o) => o.delete(k)),
    clear: (s) => tx(s, 'readwrite', (o) => o.clear()),
    putMany: (s, arr) => tx(s, 'readwrite', (o) => { arr.forEach((v) => o.put(v)); return null; })
  };

  /* ---------- asistencia: estadísticas por alumno ---------- */
  PA.attStats = async function () {
    const recs = await PA.db.all('attendance');
    const m = {};
    recs.forEach((r) => {
      for (const id in r.marks) {
        const v = r.marks[id];
        const o = m[id] || (m[id] = { p: 0, t: 0, a: 0 });
        if (v === 'P') o.p++; else if (v === 'T') o.t++; else if (v === 'A') o.a++;
      }
    });
    for (const id in m) {
      const o = m[id];
      o.total = o.p + o.t + o.a;
      o.pct = o.total ? Math.round(((o.p + o.t) / o.total) * 100) : null;
    }
    return m;
  };

  /* ---------- avisos y ventanas ---------- */
  let toastTimer;
  PA.toast = (msg, ms = 2200) => {
    const t = document.getElementById('toast');
    const warn = /^(sin |no |ese |nada|conéctate|hay una|algo|debe|agrega|ponle|escribe)/i.test(msg);
    t.replaceChildren(PA.icon(warn ? 'alert' : 'check', 18), PA.h('span', null, msg.replace(/\s*✓\s*$/, '')));
    t.firstChild.style.color = warn ? 'var(--yellow)' : 'var(--green)';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  };

  PA.modal = function (title, body, opts) {
    opts = opts || {};
    const root = document.getElementById('modalRoot');
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true; ov.classList.add('out');
      setTimeout(() => { ov.remove(); if (!root.children.length) document.body.classList.remove('noscroll'); }, 190);
      if (opts.onClose) opts.onClose();
    };
    const ov = h('div', { class: 'overlay', onclick: (e) => { if (e.target === ov && !opts.static) close(); } },
      h('div', { class: 'sheet', role: 'dialog' },
        h('div', { class: 'sheet-head' }, h('h2', null, title),
          h('button', { class: 'icon-btn', onclick: close, 'aria-label': 'Cerrar' }, PA.icon('x', 20))),
        h('div', { class: 'sheet-body' }, body)));
    root.append(ov);
    document.body.classList.add('noscroll');
    return { close, el: ov };
  };

  PA.confirm = (msg, o = {}) => new Promise((res) => {
    let m;
    const done = (v) => { res(v); m.close(); };
    m = PA.modal(o.title || '¿Seguro?',
      h('div', null, h('p', null, msg),
        h('div', { class: 'row end' },
          h('button', { class: 'btn ghost', onclick: () => done(false) }, 'Cancelar'),
          h('button', { class: 'btn ' + (o.danger ? 'danger' : 'primary'), onclick: () => done(true) }, o.ok || 'Aceptar'))),
      { onClose: () => res(false) });
  });

  /* ---------- navegación ---------- */
  const TITLES = { home: 'Portero Alpha', students: 'Alumnos', attendance: 'Asistencia', exercises: 'Ejercicios', sessions: 'Sesiones' };
  PA.nav = { tab: 'home', stack: [] };
  PA.cleanup = null;

  PA.render = async function () {
    if (PA.cleanup) {
      const c = PA.cleanup; PA.cleanup = null;
      try { await c(); } catch (e) { console.error(e); }
    }
    PA.guard = null;
    const view = document.getElementById('view');
    const root = h('div', { class: 'page' });
    const rawAppend = root.append.bind(root); // ignora null/false al agregar contenido
    root.append = (...kids) => rawAppend(...kids.flat(Infinity).filter((k) => k != null && k !== false));
    view.replaceChildren(root);
    view.scrollTop = 0;
    const top = PA.nav.stack[PA.nav.stack.length - 1];
    document.getElementById('title').textContent = top ? top.title : TITLES[PA.nav.tab];
    document.getElementById('backBtn').hidden = !top;
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === PA.nav.tab));
    document.getElementById('tabs').style.setProperty('--i', String(Math.max(0, ['home', 'students', 'attendance', 'exercises', 'sessions'].indexOf(PA.nav.tab))));
    try {
      if (top) await top.render(root); else await PA.views[PA.nav.tab](root);
    } catch (e) {
      console.error(e);
      root.append(PA.empty('alert', 'Algo salió mal al abrir esta pantalla.'));
    }
  };
  PA.setTab = (t) => { PA.nav.tab = t; PA.nav.stack = []; return PA.render(); };
  PA.push = (title, render) => { PA.nav.stack.push({ title, render }); return PA.render(); };
  PA.pop = () => { PA.nav.stack.pop(); return PA.render(); };
})();
