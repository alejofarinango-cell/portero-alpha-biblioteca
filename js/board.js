/* Pizarra de ejercicios: cancha, fichas, flechas y animación por cuadros */
(function () {
  'use strict';
  const PA = window.PA, h = PA.h;
  const W = 700, H = 600;
  const HIT = { gk: 22, pl: 22, op: 22, cone: 18, ball: 16, goal: 44, wall: 56 };
  const ARROW = {
    run: { color: '#ffffff', dash: [], w: 3.5 },
    pass: { color: '#ffffff', dash: [11, 9], w: 3.5 },
    gk: { color: '#ff9f1c', dash: [], w: 5 }
  };
  const TOOLS = [
    { k: 'move', ic: 'move', l: 'Mover' },
    { k: 'gk', l: 'Portero' }, { k: 'pl', l: 'Jugador' }, { k: 'op', l: 'Rival' },
    { k: 'cone', l: 'Cono' }, { k: 'ball', l: 'Balón' }, { k: 'goal', l: 'Mini arco' }, { k: 'wall', l: 'Muro' },
    { k: 'run', l: 'Correr' }, { k: 'pass', l: 'Pase/tiro' }, { k: 'gkrun', l: 'Portero' },
    { k: 'erase', ic: 'trash', l: 'Borrar' }
  ];
  const disc = (fill, txt, tc) => '<circle cx="13" cy="13" r="10.5" fill="' + fill + '" stroke="#0a0e1a" stroke-width="1.5"/>'
    + (txt ? '<text x="13" y="17.6" text-anchor="middle" font-size="12" font-weight="800" fill="' + tc + '" font-family="system-ui,sans-serif">' + txt + '</text>' : '');
  const arrow = (color, dash) => '<path d="M5 21 20 6" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" fill="none"' + (dash ? ' stroke-dasharray="3 3.6"' : '') + '/>'
    + '<path d="M21 5.5V14M21 5.5H12.5" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
  const TOOL_SVG = {
    gk: disc('#ff9f1c', 'P', '#111'), pl: disc('#2f80ff', '1', '#fff'), op: disc('#e5484d', '1', '#fff'),
    cone: '<path d="M13 3.5 21.5 22h-17z" fill="#ffb020" stroke="#0a0e1a" stroke-width="1.5" stroke-linejoin="round"/>',
    ball: '<circle cx="13" cy="13" r="9" fill="#fff" stroke="#111" stroke-width="1.5"/><circle cx="13" cy="13" r="3.4" fill="#111"/>',
    goal: '<rect x="3" y="7" width="20" height="12" rx="2" fill="rgba(255,255,255,.25)" stroke="#fff" stroke-width="1.6"/><path d="M8 7v12M13 7v12M18 7v12" stroke="#fff" stroke-opacity=".45"/>',
    wall: '<rect x="2" y="10" width="22" height="6.5" rx="1.6" fill="#aab4c4" stroke="#0a0e1a" stroke-width="1.2"/>',
    run: arrow('#ffffff', false), pass: arrow('#ffffff', true), gkrun: arrow('#ff9f1c', false)
  };
  function toolIcon(t) {
    if (t.ic) return PA.icon(t.ic, 24);
    const sp = h('span', { class: 'ti' });
    sp.innerHTML = '<svg viewBox="0 0 26 26">' + TOOL_SVG[t.k] + '</svg>';
    return sp;
  }
  const ITEM_TOOLS = ['gk', 'pl', 'op', 'cone', 'ball', 'goal', 'wall'];

  PA.blankScene = (view) => (view === 'front'
    ? { view: 'front', frames: [{ items: [{ id: 'gk_a', t: 'gk', x: 350, y: 338, n: 1 }], arrows: [] }] }
    : { frames: [{ items: [{ id: 'gk_a', t: 'gk', x: 350, y: 58, n: 1 }], arrows: [] }] });

  /* ---------- dibujo ---------- */
  function drawField(ctx) {
    ctx.fillStyle = '#1f6f3d'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i += 2) { ctx.fillStyle = 'rgba(255,255,255,0.045)'; ctx.fillRect(0, i * 60, W, 60); }
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.lineWidth = 3; ctx.setLineDash([]);
    ctx.strokeRect(40, 40, 620, 520);                       // borde
    ctx.strokeRect(130, 40, 440, 180);                      // área grande
    ctx.strokeRect(250, 40, 200, 60);                       // área chica
    ctx.beginPath(); ctx.arc(350, 160, 3.5, 0, 7); ctx.fill(); // punto penal
    ctx.beginPath(); ctx.arc(350, 160, 100, Math.atan2(60, 80), Math.PI - Math.atan2(60, 80)); ctx.stroke(); // medialuna
    ctx.beginPath(); ctx.arc(350, 560, 70, Math.PI, 2 * Math.PI); ctx.stroke();                            // centro
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(310, 16, 80, 24);                                // arco
    ctx.strokeRect(310, 16, 80, 24);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let x = 320; x < 390; x += 10) { ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x, 40); ctx.stroke(); }
  }


  /* ---------- VISTA DE FRENTE (el arco visto desde el tirador) ---------- */
  const GL = 330;                                   // línea de gol (altura en la imagen)
  const fs = (y) => Math.max(0.8, 0.95 + (y - 300) / 300 * 0.45); // tamaño según cercanía
  const PERSON = { gk: 1, pl: 1, op: 1 };
  const CAN_Z = { gk: 1, pl: 1, op: 1, ball: 1 };   // los que pueden ir en el aire
  const rad = (d) => d * Math.PI / 180;
  const h0 = (it) => { const r = rad(it.r || 0); return (54 * Math.abs(Math.cos(r)) + 12 * Math.abs(Math.sin(r)) - 27 * (it.k || 0)) * fs(it.y); };

  function frontBox(it) {  // centro y radio de toque de cada ficha
    const s = fs(it.y), z = it.z || 0;
    if (PERSON[it.t]) return { cx: it.x, cy: it.y - z - h0(it), r: Math.max(30, 46 * s) };
    if (it.t === 'ball') return { cx: it.x, cy: it.y - z - 10 * s, r: Math.max(22, 14 * s) };
    if (it.t === 'cone') return { cx: it.x, cy: it.y - 11 * s, r: 24 };
    if (it.t === 'goal') return { cx: it.x, cy: it.y - 22 * s, r: 44 * s, rect: [44 * s, 24 * s] };
    return { cx: it.x, cy: it.y - 28 * s, r: 62 * s, rect: [62 * s, 32 * s] };        // muro
  }

  function drawFront(ctx) {
    // fondo de estadio al atardecer
    const g = ctx.createLinearGradient(0, 0, 0, 290);
    g.addColorStop(0, '#070c1c'); g.addColorStop(1, '#183463');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 300);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 36; c++) { ctx.beginPath(); ctx.arc(10 + c * 20 + (r % 2) * 9, 60 + r * 28, 2.2, 0, 7); ctx.fill(); }
    // valla publicitaria
    ctx.fillStyle = '#0d2a5c'; ctx.fillRect(0, 262, W, 30);
    ctx.fillStyle = '#2f80ff'; ctx.fillRect(0, 262, W, 3);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '800 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let x = 70; x < W; x += 190) ctx.fillText('PORTERO ALPHA', x, 278);
    // césped: franjas que se hacen más anchas al acercarse
    ctx.fillStyle = '#1a5f35'; ctx.fillRect(0, 292, W, GL - 292);
    const ys = [GL]; for (let D = 14; D >= 4; D -= 2) ys.push(228 + 1.7 * 960 / D);
    ys.push(H + 40);
    for (let i = 0; i < ys.length - 1; i++) { ctx.fillStyle = i % 2 ? '#1c6a3b' : '#238043'; ctx.fillRect(0, ys[i], W, ys[i + 1] - ys[i]); }
    // líneas del campo
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, GL); ctx.lineTo(W, GL); ctx.stroke();                      // línea de gol
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 383); ctx.lineTo(W, 383); ctx.stroke(); // área chica
    ctx.beginPath(); ctx.ellipse(350, 554, 9, 3.6, 0, 0, 7); ctx.fill();                       // punto penal
    // red del fondo
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(10,20,40,.35)'; ctx.fillRect(150, 196, 400, 118);
    for (let x = 150; x <= 550; x += 16) { ctx.beginPath(); ctx.moveTo(x, 196); ctx.lineTo(x, 314); ctx.stroke(); }
    for (let y = 196; y <= 314; y += 16) { ctx.beginPath(); ctx.moveTo(150, y); ctx.lineTo(550, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    [[130, 184, 150, 196], [570, 184, 550, 196], [130, GL, 150, 314], [570, GL, 550, 314]].forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
    // arco: postes y travesaño
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(133, GL + 3); ctx.lineTo(133, 187); ctx.lineTo(573, 187); ctx.lineTo(573, GL + 3); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(130, GL); ctx.lineTo(130, 184); ctx.lineTo(570, 184); ctx.lineTo(570, GL); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  function figure(ctx, o) {  // persona de frente, origen en la cadera (alto total ≈ 108)
    const up = o.up || 0, L = (a, b) => a + (b - a) * up;
    const line = (x1, y1, x2, y2, c, w) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const sp = L(8, 15), kn = o.k || 0, fy = 51 - 27 * kn;          // kn = 1: de rodillas
    line(-4, 22, -sp - 1, fy, o.sock, 9); line(4, 22, sp + 1, fy, o.sock, 9);
    ctx.fillStyle = '#10141f';
    ctx.beginPath(); ctx.ellipse(-sp - 2, fy + 3, 7.5, 4.2, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sp + 2, fy + 3, 7.5, 4.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = o.short; ctx.beginPath(); ctx.roundRect(-14, 3, 28, 21, 5); ctx.fill();
    // brazos
    const ex = o.gk ? L(37, 11) : 22, ey = o.gk ? L(-13, -84) : 0;
    [-1, 1].forEach((d) => {
      line(d * 15, -27, d * ex, ey, o.jersey, 9);
      ctx.fillStyle = o.gk ? o.glove : o.skin; ctx.strokeStyle = '#0a0e1a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(d * ex, ey, o.gk ? 7 : 4.6, 0, 7); ctx.fill(); ctx.stroke();
    });
    // torso y cabeza
    ctx.fillStyle = o.jersey; ctx.strokeStyle = '#0a0e1a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-15.5, -35, 31, 43, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.back ? '#2a2018' : o.skin; ctx.beginPath(); ctx.arc(0, -46, 11, 0, 7); ctx.fill(); ctx.stroke();
    if (!o.back) { ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(0, -48, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
    if (o.num) { ctx.fillStyle = o.numc; ctx.font = '800 17px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(o.num), 0, -13); }
  }
  function personAt(ctx, x, y, z, r, o) {
    const s = fs(y), kn = o.k || 0;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y, 25 * s * Math.max(.45, 1 - z / 420), 7 * s, 0, 0, 7); ctx.fill();
    const rr = rad(r || 0), hh = (54 * Math.abs(Math.cos(rr)) + 12 * Math.abs(Math.sin(rr)) - 27 * kn) * s;
    ctx.save(); ctx.translate(x, y - z - hh); ctx.rotate(rr); ctx.scale(s, s);
    o.up = o.gk ? (o.u != null ? o.u : Math.max(0, Math.min(1, (Math.abs(r || 0) - 15) / 55))) : 0;
    figure(ctx, o); ctx.restore();
  }
  const KIT = {
    gk: { jersey: '#ff9f1c', short: '#1b2236', sock: '#2b2f3a', skin: '#e9b98f', glove: '#b8f56a', gk: true },
    pl: { jersey: '#2f80ff', short: '#10203f', sock: '#2f80ff', skin: '#e9b98f', numc: '#fff' },
    op: { jersey: '#e5484d', short: '#3a1216', sock: '#e5484d', skin: '#e9b98f', numc: '#fff' }
  };

  function drawItemFront(ctx, it, alpha, selected) {
    ctx.save(); ctx.globalAlpha = alpha;
    const s = fs(it.y), z = it.z || 0;
    if (PERSON[it.t]) personAt(ctx, it.x, it.y, z, it.r || 0, { ...KIT[it.t], k: it.k, u: it.u, back: it.t !== 'gk' && !it.fr, num: it.t === 'gk' ? '' : (it.n || '') });
    else if (it.t === 'ball') {
      const cy = it.y - z - 10 * s;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(it.x, it.y, 11 * s * Math.max(.45, 1 - z / 420), 4 * s, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(it.x, cy, 10 * s, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#111'; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; ctx[k ? 'lineTo' : 'moveTo'](it.x + Math.cos(a) * 4.2 * s, cy + Math.sin(a) * 4.2 * s); }
      ctx.closePath(); ctx.fill();
    } else if (it.t === 'cone') {
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(it.x, it.y, 15 * s, 4.5 * s, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(it.x, it.y - 24 * s); ctx.lineTo(it.x + 12 * s, it.y - 1); ctx.lineTo(it.x - 12 * s, it.y - 1); ctx.closePath();
      ctx.fillStyle = '#ffb020'; ctx.fill(); ctx.strokeStyle = '#0a0e1a'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(it.x - 6 * s, it.y - 12 * s, 12 * s, 3.5 * s);
    } else if (it.t === 'goal') {
      const w = 88 * s, hgt = 46 * s;
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(it.x - w / 2, it.y - hgt, w, hgt);
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1;
      for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(it.x - w / 2 + k * w / 6, it.y - hgt); ctx.lineTo(it.x - w / 2 + k * w / 6, it.y); ctx.stroke(); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(it.x - w / 2, it.y); ctx.lineTo(it.x - w / 2, it.y - hgt); ctx.lineTo(it.x + w / 2, it.y - hgt); ctx.lineTo(it.x + w / 2, it.y); ctx.stroke();
    } else if (it.t === 'wall') {
      for (let k = -1.5; k <= 1.5; k += 1) personAt(ctx, it.x + k * 30 * s, it.y, 0, 0, { jersey: '#8b95a7', short: '#323a4c', sock: '#8b95a7', skin: '#e9b98f' });
    }
    if (selected) {
      const b = frontBox(it);
      ctx.globalAlpha = 1; ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]);
      if (b.rect) ctx.strokeRect(b.cx - b.rect[0], b.cy - b.rect[1], b.rect[0] * 2, b.rect[1] * 2);
      else { ctx.beginPath(); ctx.arc(b.cx, b.cy, b.r, 0, 7); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawItem(ctx, it, alpha, selected) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineWidth = 2;
    ctx.font = 'bold 15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const disc = (fill, txt, tc) => {
      ctx.beginPath(); ctx.arc(it.x, it.y, 17, 0, 7); ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = '#0a0e1a'; ctx.stroke();
      ctx.fillStyle = tc; ctx.fillText(txt, it.x, it.y + 1);
    };
    if (it.t === 'gk') disc('#ff9f1c', 'P', '#111');
    else if (it.t === 'pl') disc('#2f80ff', String(it.n || ''), '#fff');
    else if (it.t === 'op') disc('#e5484d', String(it.n || ''), '#fff');
    else if (it.t === 'cone') {
      ctx.beginPath(); ctx.moveTo(it.x, it.y - 14); ctx.lineTo(it.x + 12, it.y + 11); ctx.lineTo(it.x - 12, it.y + 11); ctx.closePath();
      ctx.fillStyle = '#ffb020'; ctx.fill(); ctx.strokeStyle = '#0a0e1a'; ctx.stroke();
    } else if (it.t === 'ball') {
      ctx.beginPath(); ctx.arc(it.x, it.y, 10, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.stroke();
      ctx.beginPath(); ctx.arc(it.x, it.y, 3.6, 0, 7); ctx.fillStyle = '#111'; ctx.fill();
    } else if (it.t === 'goal') {
      ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(it.x - 34, it.y - 12, 68, 24);
      ctx.strokeStyle = '#fff'; ctx.strokeRect(it.x - 34, it.y - 12, 68, 24);
    } else if (it.t === 'wall') {
      ctx.fillStyle = '#aab4c4'; ctx.fillRect(it.x - 50, it.y - 7, 100, 14);
      ctx.strokeStyle = '#0a0e1a'; ctx.strokeRect(it.x - 50, it.y - 7, 100, 14);
    }
    if (selected) {
      ctx.globalAlpha = 1; ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(it.x, it.y, HIT[it.t] * 0.95, 0, 7); ctx.stroke();
    }
    ctx.restore();
  }

  function drawArrow(ctx, a, alpha) {
    const pts = a.pts;
    if (!pts || pts.length < 2) return;
    const st = ARROW[a.k] || ARROW.run;
    ctx.save();
    ctx.globalAlpha = alpha; ctx.strokeStyle = st.color; ctx.fillStyle = st.color;
    ctx.lineWidth = st.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(st.dash);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]); ctx.stroke();
    ctx.setLineDash([]);
    let j = pts.length - 2;
    while (j > 0 && Math.hypot(last[0] - pts[j][0], last[1] - pts[j][1]) < 14) j--;
    const ang = Math.atan2(last[1] - pts[j][1], last[0] - pts[j][0]), L = 16;
    ctx.beginPath(); ctx.moveTo(last[0], last[1]);
    ctx.lineTo(last[0] - L * Math.cos(ang - 0.45), last[1] - L * Math.sin(ang - 0.45));
    ctx.lineTo(last[0] - L * Math.cos(ang + 0.45), last[1] - L * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawView(ctx, view, sel, mode) {
    const front = mode === 'front';
    (front ? drawFront : drawField)(ctx);
    view.arrows.forEach(([a, al]) => drawArrow(ctx, a, al));
    if (front) {
      // lo más lejano primero; los balones siempre al final para que se vean
      const its = view.items.slice().sort((a, b) => ((a.t === 'ball') - (b.t === 'ball')) || (a.y - b.y));
      its.forEach((it) => drawItemFront(ctx, it, it.alpha == null ? 1 : it.alpha, sel && sel === it.id));
      return;
    }
    // los rivales y jugadores se dibujan arriba de las flechas; balones al final
    const order = { wall: 0, goal: 0, cone: 1, op: 2, pl: 2, gk: 3, ball: 4 };
    view.items.slice().sort((a, b) => (order[a.t] || 0) - (order[b.t] || 0))
      .forEach((it) => drawItem(ctx, it, it.alpha == null ? 1 : it.alpha, sel && sel === it.id));
  }

  function staticView(frame) {
    return { items: frame.items.map((i) => ({ ...i, alpha: 1 })), arrows: frame.arrows.map((a) => [a, 1]) };
  }

  /* miniatura para las listas */
  PA.thumb = function (scene, width) {
    width = width || 168;
    const c = document.createElement('canvas');
    c.width = width; c.height = Math.round(width * H / W); c.className = 'thumb';
    const ctx = c.getContext('2d');
    ctx.setTransform(width / W, 0, 0, width / W, 0, 0);
    drawView(ctx, staticView(scene.frames[0]), null, scene.view);
    return c;
  };

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

  /* ---------- componente de pizarra ---------- */
  PA.createBoard = function (host, sceneIn, opts) {
    opts = opts || {};
    const ro = !!opts.readOnly;
    const scene = JSON.parse(JSON.stringify(sceneIn && sceneIn.frames && sceneIn.frames.length ? sceneIn : PA.blankScene()));
    const S = { cur: 0, tool: 'move', sel: null, drag: null, path: null, play: false, pi: 0, t: 0, speed: 1, undo: [], raf: 0, last: 0 };
    const canvas = h('canvas', { class: 'board-canvas' });
    const ctx = canvas.getContext('2d');
    const playBtn = h('button', { class: 'play', 'aria-label': 'Animar', onclick: () => (S.play ? stop() : play()) }, PA.icon('play', 24));
    const speedBtn = h('button', { class: 'chip', 'aria-label': 'Velocidad', onclick: () => {
      const sp = [0.5, 1, 1.5, 2]; S.speed = sp[(sp.indexOf(S.speed) + 1) % sp.length]; speedBtn.textContent = S.speed + 'x';
    } }, '1x');
    const toolBtns = {};
    const tools = h('div', { class: 'tools' }, TOOLS.map((t) => {
      const b = h('button', { class: 'tool' + (t.k === S.tool ? ' on' : ''), 'data-tool': t.k, onclick: () => setTool(t.k) }, toolIcon(t), h('span', null, t.l));
      toolBtns[t.k] = b; return b;
    }));
    const hint = h('div', { class: 'hint' });
    const POSES = [['De pie', { r: 0, k: 0, u: 0 }], ['Brazos arriba', { r: 0, k: 0, u: 1 }], ['De rodillas', { r: 0, k: 1, u: 0 }],
      ['Caída izquierda', { r: -75, k: 0 }], ['Caída derecha', { r: 75, k: 0 }], ['De espaldas', { fr: 0 }], ['De frente', { fr: 1 }]];
    const poseBar = h('div', { class: 'chips posebar', hidden: true }, POSES.map(([l, v]) =>
      h('button', { class: 'chip', onclick: () => {
        const it = S.sel && frame().items.find((o) => o.id === S.sel);
        if (!it) return;
        snap(); Object.keys(v).forEach((k) => { if (v[k]) it[k] = v[k]; else delete it[k]; });
        if (v.r !== undefined && v.u === undefined) delete it.u;
        draw();
      } }, l)));
    const viewBtns = {};
    const setView = (v) => {
      if (S.play) stop();
      if ((scene.view || 'top') === v) return;
      snap();
      // se reacomodan las fichas y flechas para que queden en un lugar parecido en la nueva vista
      const toFront = v === 'front', cl = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
      const mp = toFront ? (x, y) => [cl(350 + (x - 350) * 0.9, 10, W - 10), cl(338 + Math.max(0, y - 58) * 0.45, 296, 595)]
        : (x, y) => [cl(350 + (x - 350) / 0.9, 10, W - 10), cl(58 + (y - 338) / 0.45, 10, H - 10)];
      scene.frames.forEach((f) => {
        f.items.forEach((it) => { const [nx, ny] = mp(it.x, it.y); it.x = Math.round(nx); it.y = Math.round(ny); ['z', 'r', 'k', 'u'].forEach((k) => delete it[k]); });
        f.arrows.forEach((ar) => { ar.pts = ar.pts.map(([x, y]) => mp(x, y).map(Math.round)); });
      });
      if (toFront) scene.view = 'front'; else delete scene.view;
      Object.keys(viewBtns).forEach((k) => viewBtns[k].classList.toggle('on', k === v));
      S.sel = null; updateHint(); draw();
      PA.toast('Vista cambiada: acomoda las fichas en la nueva imagen');
    };
    const viewSw = ro ? null : h('div', { class: 'chips viewsw' }, [['top', 'Desde arriba'], ['front', 'Arco de frente']].map(([k, l]) =>
      (viewBtns[k] = h('button', { class: 'chip' + ((scene.view || 'top') === k ? ' on' : ''), 'data-view': k, onclick: () => setView(k) }, l))));
    const chipsBox = h('div', { class: 'fchips' });
    const transport = h('div', { class: 'transport' },
      PA.btn('chevL', '', 'sm', () => go(-1), 'Cuadro anterior'),
      playBtn,
      PA.btn('chevR', '', 'sm', () => go(1), 'Cuadro siguiente'),
      speedBtn,
      ro ? null : PA.btn('undo', 'Deshacer', 'sm', undo));

    function paintChips() {
      chipsBox.replaceChildren();
      const cur = S.play ? S.pi : S.cur;
      scene.frames.forEach((_, i) => chipsBox.append(h('button', { class: 'fchip' + (i === cur ? ' on' : ''), 'aria-label': 'Cuadro ' + (i + 1), onclick: () => jump(i) }, String(i + 1))));
      if (!ro) {
        chipsBox.append(h('button', { class: 'fchip add', 'aria-label': 'Agregar cuadro', 'data-act': 'addframe', onclick: addFrame }, PA.icon('plus', 18)));
        if (scene.frames.length > 1) chipsBox.append(h('button', { class: 'fchip add', 'aria-label': 'Quitar este cuadro', 'data-act': 'delframe', onclick: delFrame }, PA.icon('trash', 16)));
      }
    }

    const wrap = h('div', { class: 'board-wrap' }, canvas);
    const root = h('div', { class: 'board' }, viewSw, ro ? null : tools, wrap, ro ? null : poseBar, chipsBox, transport, ro ? null : hint);
    host.append(root);

    /* tamaño nítido según pantalla */
    const fit = () => {
      const w = Math.max(200, wrap.clientWidth), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr * H / W);
      draw();
    };
    let ro2 = null;
    if (window.ResizeObserver) { ro2 = new ResizeObserver(PA.debounce(fit, 60)); ro2.observe(wrap); }
    else window.addEventListener('resize', fit);

    function frame() { return scene.frames[S.cur]; }
    function viewNow() {
      if (!S.play) return staticView(frame());
      const A = scene.frames[S.pi], B = scene.frames[S.pi + 1];
      const p = ease(Math.max(0, Math.min(1, (S.t - 0.25) / 0.7)));
      const bm = new Map(B.items.map((o) => [o.id, o]));
      const items = [];
      A.items.forEach((a) => {
        const b = bm.get(a.id);
        if (b) { items.push({ ...a, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * p, r: (a.r || 0) + ((b.r || 0) - (a.r || 0)) * p, k: (a.k || 0) + ((b.k || 0) - (a.k || 0)) * p, u: (a.u == null && b.u == null) ? undefined : (a.u || 0) + ((b.u || 0) - (a.u || 0)) * p, alpha: 1 }); bm.delete(a.id); }
        else items.push({ ...a, alpha: 1 - p });
      });
      bm.forEach((b) => items.push({ ...b, alpha: p }));
      const arrows = A.arrows.map((a) => [a, 1 - p]).concat(B.arrows.map((a) => [a, p]));
      return { items, arrows };
    }
    function draw() {
      const k = canvas.width / W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      drawView(ctx, viewNow(), S.play ? null : S.sel, scene.view);
      const si = !ro && !S.play && S.sel && frame().items.find((o) => o.id === S.sel);
      poseBar.hidden = !(scene.view === 'front' && si && PERSON[si.t]);
      const curF = S.play ? S.pi : S.cur;
      if (S._chipFrame !== curF + '/' + scene.frames.length) { S._chipFrame = curF + '/' + scene.frames.length; paintChips(); }
    }
    function updateHint() {
      const m = {
        move: 'Arrastra las fichas para moverlas.',
        run: 'Dibuja con el dedo el recorrido de un jugador.',
        pass: 'Dibuja con el dedo la línea de un pase o un tiro.',
        gkrun: 'Dibuja con el dedo el recorrido del portero.',
        erase: 'Toca una ficha o una flecha para borrarla.'
      };
      const fr = scene.view === 'front';
      if (fr) m.move = 'Arrastra las fichas. Sube al balón o al portero para ponerlos en el aire, bájalos para ponerlos en el piso.';
      hint.textContent = m[S.tool] || (fr ? 'Toca donde van los pies o el balón. Cambia a “Mover” para acomodarlo o elevarlo.' : 'Toca la cancha para colocar la ficha. Cambia a “Mover” para acomodarla.');
    }
    function setTool(k) {
      S.tool = k; S.sel = null;
      Object.keys(toolBtns).forEach((x) => toolBtns[x].classList.toggle('on', x === k));
      updateHint(); draw();
    }

    /* ---------- historial (deshacer) ---------- */
    function snap() { S.undo.push(JSON.stringify(scene)); if (S.undo.length > 40) S.undo.shift(); }
    function undo() {
      if (S.play) stop();
      const s = S.undo.pop();
      if (!s) { PA.toast('Nada que deshacer'); return; }
      const sc = JSON.parse(s); scene.frames = sc.frames; if (sc.view) scene.view = sc.view; else delete scene.view; S.cur = Math.min(S.cur, scene.frames.length - 1); S.sel = null;
      Object.keys(viewBtns).forEach((k) => viewBtns[k].classList.toggle('on', k === (scene.view || 'top'))); updateHint(); draw();
    }

    /* ---------- cuadros ---------- */
    function go(d) {
      if (S.play) stop();
      S.cur = Math.max(0, Math.min(scene.frames.length - 1, S.cur + d)); S.sel = null; draw();
    }
    function jump(i) {
      if (S.play) stop();
      S.cur = Math.max(0, Math.min(scene.frames.length - 1, i)); S.sel = null; draw();
    }
    function addFrame() {
      if (S.play) stop();
      snap();
      const f = frame();
      scene.frames.splice(S.cur + 1, 0, { items: f.items.map((i) => ({ ...i })), arrows: [] });
      S.cur++; S.sel = null; draw();
      PA.toast('Cuadro nuevo: mueve las fichas a su nueva posición');
    }
    function delFrame() {
      if (S.play) stop();
      if (scene.frames.length < 2) { PA.toast('Debe quedar al menos un cuadro'); return; }
      snap(); scene.frames.splice(S.cur, 1); S.cur = Math.min(S.cur, scene.frames.length - 1); S.sel = null; draw();
    }

    /* ---------- animación ---------- */
    function play() {
      if (scene.frames.length < 2) { PA.toast('Agrega un segundo cuadro para animar'); return; }
      S.play = true; S.pi = S.cur >= scene.frames.length - 1 ? 0 : S.cur; S.t = 0; S.last = performance.now();
      playBtn.replaceChildren(PA.icon('stop', 24)); playBtn.classList.add('on'); playBtn.setAttribute('aria-label', 'Detener'); S.sel = null;
      S.raf = requestAnimationFrame(loop);
    }
    function stop() {
      S.play = false; cancelAnimationFrame(S.raf); playBtn.replaceChildren(PA.icon('play', 24)); playBtn.classList.remove('on'); playBtn.setAttribute('aria-label', 'Animar');
      S.cur = Math.min(S.pi, scene.frames.length - 1); draw();
    }
    function loop(now) {
      if (!S.play) return;
      const dt = Math.min(0.1, (now - S.last) / 1000); S.last = now;
      S.t += (dt * S.speed) / 1.6;
      const lastStep = S.pi >= scene.frames.length - 2;
      if (S.t >= (lastStep ? 1.9 : 1.15)) {
        if (lastStep) { S.pi = 0; S.t = -0.2; } // pausa en el último cuadro y vuelve a empezar
        else { S.pi++; S.t = 0; }
      }
      draw();
      S.raf = requestAnimationFrame(loop);
    }

    /* ---------- interacción con el dedo / mouse ---------- */
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return [Math.max(0, Math.min(W, (e.clientX - r.left) * W / r.width)), Math.max(0, Math.min(H, (e.clientY - r.top) * H / r.height))];
    };
    function hitItem(x, y) {
      const its = frame().items;
      for (let i = its.length - 1; i >= 0; i--) {
        const it = its[i], r = HIT[it.t] || 20;
        if (scene.view === 'front') {
          const b = frontBox(it);
          if (b.rect ? (Math.abs(x - b.cx) <= b.rect[0] && Math.abs(y - b.cy) <= b.rect[1]) : Math.hypot(x - b.cx, y - b.cy) <= b.r) return it;
          continue;
        }
        if (it.t === 'goal' ? (Math.abs(x - it.x) < 38 && Math.abs(y - it.y) < 18)
          : it.t === 'wall' ? (Math.abs(x - it.x) < 54 && Math.abs(y - it.y) < 14)
            : Math.hypot(x - it.x, y - it.y) <= r) return it;
      }
      return null;
    }
    function hitArrow(x, y) {
      const ar = frame().arrows;
      for (let i = ar.length - 1; i >= 0; i--) {
        const p = ar[i].pts;
        for (let j = 0; j < p.length - 1; j++) if (segDist(x, y, p[j][0], p[j][1], p[j + 1][0], p[j + 1][1]) < 16) return i;
      }
      return -1;
    }
    function nextNumber(t) {
      let m = 0;
      scene.frames.forEach((f) => f.items.forEach((i) => { if (i.t === t && (i.n || 0) > m) m = i.n; }));
      return m + 1;
    }
    function removeItemEverywhere(id) {
      for (let i = S.cur; i < scene.frames.length; i++) scene.frames[i].items = scene.frames[i].items.filter((o) => o.id !== id);
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (ro || S.play) return;
      e.preventDefault();
      const [x, y] = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      const t = S.tool;
      if (ITEM_TOOLS.includes(t)) {
        snap();
        const id = t + '_' + PA.uid(5), n = (t === 'pl' || t === 'op') ? nextNumber(t) : 1;
        const fy = scene.view === 'front' ? Math.max(296, Math.min(595, y)) : y;
        for (let i = S.cur; i < scene.frames.length; i++) scene.frames[i].items.push({ id, t, x, y: fy, n });
        S.sel = id; S.drag = { id, dx: 0, dy: 0, moved: false, fresh: true };
        draw();
      } else if (t === 'move') {
        const it = hitItem(x, y);
        S.sel = it ? it.id : null;
        if (it) { snap(); S.drag = { id: it.id, dx: x - it.x, dy: y - (it.y - (scene.view === 'front' ? (it.z || 0) : 0)) }; }
        draw();
      } else if (t === 'erase') {
        const it = hitItem(x, y);
        if (it) { snap(); removeItemEverywhere(it.id); }
        else { const ai = hitArrow(x, y); if (ai >= 0) { snap(); frame().arrows.splice(ai, 1); } }
        draw();
      } else if (t === 'run' || t === 'pass' || t === 'gkrun') {
        S.path = { k: t === 'gkrun' ? 'gk' : t, pts: [[x, y]] };
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (ro || S.play) return;
      const [x, y] = pos(e);
      if (S.drag) {
        const it = frame().items.find((o) => o.id === S.drag.id);
        if (it) {
          it.x = Math.max(10, Math.min(W - 10, x - S.drag.dx));
          const ay = y - S.drag.dy;
          if (scene.view === 'front') {
            // hacia arriba = más alto (en el aire); hacia abajo = baja y luego se acerca al tirador
            if (CAN_Z[it.t] && ay < it.y) it.z = Math.min(330, Math.round(it.y - ay));
            else { it.y = Math.max(296, Math.min(595, ay)); delete it.z; }
          } else it.y = Math.max(10, Math.min(H - 10, ay));
        }
        draw();
      } else if (S.path) {
        const l = S.path.pts[S.path.pts.length - 1];
        if (Math.hypot(x - l[0], y - l[1]) > 9) S.path.pts.push([x, y]);
        const v = staticView(frame()); v.arrows.push([S.path, 1]);
        const k = canvas.width / W; ctx.setTransform(k, 0, 0, k, 0, 0); drawView(ctx, v, null, scene.view);
      }
    });
    const end = () => {
      if (S.drag) {
        S.drag = null;
        if (S.tool !== 'move') { S.sel = null; }
        draw();
      }
      if (S.path) {
        const p = S.path; S.path = null;
        let len = 0;
        for (let i = 1; i < p.pts.length; i++) len += Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]);
        if (len > 28) {
          snap();
          // si hay muchos puntos, nos quedamos con unos pocos para que la línea quede limpia
          if (p.pts.length > 40) { const k = Math.ceil(p.pts.length / 40); p.pts = p.pts.filter((_, i) => i % k === 0 || i === p.pts.length - 1); }
          p.pts = p.pts.map((q) => [Math.round(q[0]), Math.round(q[1])]);
          frame().arrows.push(p);
        }
        draw();
      }
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    updateHint();
    requestAnimationFrame(fit);

    return {
      getScene: () => JSON.parse(JSON.stringify(scene)),
      toPNG: () => {
        const c = document.createElement('canvas'); c.width = 1400; c.height = 1200;
        const cx = c.getContext('2d'); cx.setTransform(2, 0, 0, 2, 0, 0);
        drawView(cx, staticView(frame()), null, scene.view);
        return new Promise((res) => c.toBlob(res, 'image/png'));
      },
      destroy: () => {
        S.play = false; cancelAnimationFrame(S.raf);
        if (ro2) ro2.disconnect(); else window.removeEventListener('resize', fit);
      }
    };
  };
})();
