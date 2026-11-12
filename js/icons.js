/* Íconos propios (trazo fino, redondeado) y pequeños efectos visuales */
(function () {
  'use strict';
  const PA = window.PA, h = PA.h;

  const P = {
    home: '<path d="M3.5 11 12 3.5 20.5 11"/><path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c2.8 0 4.5 1.9 4.5 4.5"/>',
    userPlus: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M19 7.5v6M16 10.5h6"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5h6V6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/><path d="M9 14.2l2.2 2.2 4.3-4.6"/>',
    field: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.6"/><path d="M3 9.5h2.5v5H3M21 9.5h-2.5v5H21"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    chevL: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    chevR: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.3-2h5.4L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
    stop: '<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/>',
    frame: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10.5 11v5M13.5 11v5"/>',
    undo: '<path d="M9 7.5 4.5 12 9 16.5"/><path d="M5 12h9.5a4.5 4.5 0 0 1 0 9H11"/>',
    download: '<path d="M12 4v11M7.5 11 12 15.5l4.5-4.5M5 19.5h14"/>',
    upload: '<path d="M12 16V5M7.5 9 12 4.5 16.5 9M5 19.5h14"/>',
    refresh: '<path d="M19.5 10.5A8 8 0 0 0 5.8 7L4 9"/><path d="M4 4.5V9h4.5"/><path d="M4.5 13.5A8 8 0 0 0 18.2 17l1.8-2"/><path d="M20 19.5V15h-4.5"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    move: '<path d="M12 3.5v17M3.5 12h17M9 6.5l3-3 3 3M9 17.5l3 3 3-3M6.5 9l-3 3 3 3M17.5 9l3 3-3 3"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M15.5 8.5V6.2A1.7 1.7 0 0 0 13.8 4.5H6.2A1.7 1.7 0 0 0 4.5 6.2v7.6a1.7 1.7 0 0 0 1.7 1.7h2.3"/>',
    edit: '<path d="M4.5 19.5 5.3 15 15.8 4.5a2.1 2.1 0 0 1 3 3L8.3 18z"/><path d="m14 6.5 3.5 3.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    ball: '<circle cx="12" cy="12" r="8.5"/><path d="m12 8 3.2 2.3-1.2 3.7h-4L8.8 10.3z"/><path d="M12 3.5V8M15.2 10.3l4-1.3M14 14l2.5 3.5M10 14l-2.5 3.5M8.8 10.3l-4-1.3"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.6"/><path d="M11 18.5h2"/>',
    book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5"/>',
    shield: '<path d="M12 3.5 19 6v5.5c0 4.3-2.9 7.7-7 9-4.1-1.3-7-4.7-7-9V6z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
    alert: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    chart: '<path d="M5 20V11M12 20V4.5M19 20v-6.5"/>',
    list: '<path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20"/><circle cx="4.5" cy="6.5" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="17.5" r=".9"/>',
    wifiOff: '<path d="M3 3l18 18M5 10.5a11 11 0 0 1 4-2M19 10.5A11 11 0 0 0 13 7.7M8.5 14a6 6 0 0 1 3-1.5M15.5 14a6 6 0 0 0-1-.8M12 18h.01"/>',
    sparkle: '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4L4.5 10.8 10.2 9z"/>'
  };

  PA.icon = function (name, size) {
    const s = h('span', { class: 'ic', style: { fontSize: (size || 20) + 'px' }, 'aria-hidden': 'true' });
    s.innerHTML = '<svg viewBox="0 0 24 24">' + (P[name] || '') + '</svg>';
    return s;
  };

  /* anillo de porcentaje que se llena con animación */
  PA.ring = function (pct, size, sw) {
    size = size || 44; sw = sw || 4;
    const r = (size - sw) / 2, c = 2 * Math.PI * r, m = size / 2;
    const cls = pct == null ? 'none' : (PA.pctClass(pct) || 'none');
    const wrap = h('div', { class: 'ring ' + cls, style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.3) + 'px' } });
    wrap.innerHTML = '<svg viewBox="0 0 ' + size + ' ' + size + '"><circle class="tr" cx="' + m + '" cy="' + m + '" r="' + r + '" stroke-width="' + sw + '"/>'
      + '<circle class="pg" cx="' + m + '" cy="' + m + '" r="' + r + '" stroke-width="' + sw + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" transform="rotate(-90 ' + m + ' ' + m + ')"/></svg>';
    wrap.append(h('span', null, pct == null ? '–' : String(pct)));
    const pg = wrap.querySelector('.pg');
    requestAnimationFrame(() => requestAnimationFrame(() => { pg.style.strokeDashoffset = String(c * (1 - (pct || 0) / 100)); }));
    return wrap;
  };

  /* número que sube suavemente hasta su valor */
  PA.countUp = function (el, to, suffix, ms) {
    suffix = suffix || ''; ms = ms || 700;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(to * e) + suffix;
      if (k < 1 && el.isConnected !== false) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* entrada escalonada de las filas de una lista (solo la primera vez que se pinta) */
  PA.stagger = function (list) {
    list.classList.add('stagger');
    setTimeout(() => list.classList.remove('stagger'), 900);
  };

  PA.empty = function (icon, text, extra) {
    return h('div', { class: 'empty' }, h('div', { class: 'empty-ic' }, PA.icon(icon, 30)), h('p', null, text), extra || null);
  };

  /* botón con ícono y texto */
  PA.btn = function (icon, label, cls, onclick, aria) {
    return h('button', { class: 'btn ' + (cls || ''), onclick, 'aria-label': aria || null }, icon ? PA.icon(icon, 18) : null, label ? h('span', null, label) : null);
  };
})();
