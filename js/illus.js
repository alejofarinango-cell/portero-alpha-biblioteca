/* Vista ilustrada: deportistas dibujados con cuerpo completo (cabeza, torso, brazos, piernas, guantes, botines).
   Usa las mismas fichas de la pizarra, pero las pone en un campo en perspectiva y les da una postura (pose). */
(function () {
  'use strict';
  window.PA = window.PA || {};
  const D = Math.PI / 180;
  const H = { drawArrow: null, drawMark: null, pill: null, MC: {}, ARROW: {} };   // lo entrega board.js

  /* ---------- matemática básica ---------- */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rx = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
  const ry = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; };
  const rz = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
  function rodrigues(v, n, a) { const c = Math.cos(a), s = Math.sin(a); return add(add(mul(v, c), mul(cross(n, v), s)), mul(n, dot(n, v) * (1 - c))); }
  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (sh) => Math.max(0, Math.min(255, Math.round(((n >> sh) & 255) * f)));
    return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
  };
  const angDiff = (a, b) => { let d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };

  /* ---------- posturas ----------
     sp = inclinación del torso hacia adelante, sr = inclinación de lado, tw = giro del torso, ht = cabeza
     pitch / roll = inclinación de todo el cuerpo (roll es la caída de lado; positivo = hacia su derecha)
     la / ra = brazo izq / der: [adelante, abierto, codo, plano del codo]   ll / rl = pierna: [adelante, abierta, rodilla]
     lf / rf = punta del pie hacia abajo    air = altura del salto (m) */
  const BASE = { sp: 0, sr: 0, tw: 0, ht: 0, pitch: 0, roll: 0, air: 0, la: [4, 9, 12, 0], ra: [4, 9, 12, 0], ll: [0, 4, 0], rl: [0, 4, 0], lf: 0, rf: 0 };
  const POSES = {
    stand: {},
    base: { sp: 24, ht: -14, la: [44, 22, 58, 0], ra: [44, 22, 58, 0], ll: [40, 15, 72], rl: [36, 15, 68] },
    shuffle: { sp: 22, ht: -12, la: [40, 28, 60, 0], ra: [40, 28, 60, 0], ll: [38, 24, 66], rl: [38, 24, 66] },
    run: { sp: 14, la: [-28, 8, 82, 0], ra: [32, 8, 82, 0], ll: [28, 3, 58], rl: [-30, 3, 70], lf: 10, rf: 40 },
    walk: { sp: 4, la: [-14, 6, 20, 0], ra: [14, 6, 20, 0], ll: [14, 3, 8], rl: [-14, 3, 18] },
    reach_up: { sp: -2, ht: -8, la: [168, 14, 3, 0], ra: [168, 14, 3, 0] },
    chest_pass: { sp: 8, la: [80, 14, 26, 0], ra: [80, 14, 26, 0], ll: [20, 10, 34], rl: [16, 10, 30] },
    hold: { sp: 6, la: [52, 16, 64, 0], ra: [52, 16, 64, 0] },
    point: { sp: 4, ra: [80, 24, 6, 0] },
    wall: { la: [24, -6, 96, 0], ra: [24, -6, 96, 0] },
    catch_chest: { sp: 14, ht: -8, la: [62, 22, 56, 0], ra: [62, 22, 56, 0], ll: [24, 12, 40], rl: [20, 12, 36] },
    catch_low: { sp: 38, ht: -26, la: [30, 12, 10, 0], ra: [30, 12, 10, 0], ll: [58, 18, 98], rl: [56, 18, 96] },
    block_low: { sp: 12, ht: -10, la: [30, 14, 24, 0], ra: [30, 14, 24, 0], ll: [78, 6, 88], rl: [-8, 8, 82], rf: 78, air: 0 },
    catch_high: { sp: -4, ht: -10, la: [172, 14, 3, 0], ra: [172, 14, 3, 0], ll: [-6, 6, 34], rl: [-22, 6, 58], lf: 28, rf: 38, air: 0.45 },
    punch: { sp: -6, la: [150, 20, 70, 0], ra: [150, 20, 70, 0], ll: [-4, 6, 32], rl: [-18, 6, 56], lf: 28, rf: 38, air: 0.4 },
    dive_r: { roll: 78, sp: -8, la: [176, 8, 2, 0], ra: [176, 8, 2, 0], ll: [10, 6, 12], rl: [-14, 10, 22], lf: 20, rf: 30, air: 0.3 },
    dive_l: { roll: -78, sp: -8, la: [176, 8, 2, 0], ra: [176, 8, 2, 0], ll: [-14, 10, 22], rl: [10, 6, 12], lf: 30, rf: 20, air: 0.3 },
    lie_r: { roll: 86, sp: -6, la: [176, 8, 2, 0], ra: [176, 8, 2, 0], ll: [6, 6, 10], rl: [-10, 8, 14], lf: 20, rf: 30, air: 0 },
    lie_l: { roll: -86, sp: -6, la: [176, 8, 2, 0], ra: [176, 8, 2, 0], ll: [-10, 8, 14], rl: [6, 6, 10], lf: 30, rf: 20, air: 0 },
    throw_wind: { sp: 4, tw: 28, ht: 0, la: [60, 22, 40, 0], ra: [0, 84, 96, 90], ll: [30, 12, 44], rl: [-8, 12, 32] },
    throw_over: { sp: 16, tw: -22, la: [-10, 30, 30, 0], ra: [150, 8, 14, 0], ll: [-6, 8, 14], rl: [34, 8, 56], lf: 8, rf: 28 },
    throw_under_back: { sp: 30, tw: 10, ht: -16, la: [30, 20, 20, 0], ra: [-48, 6, 8, 0], ll: [52, 12, 80], rl: [34, 12, 60] },
    throw_under: { sp: 26, tw: -8, ht: -12, la: [30, 20, 20, 0], ra: [58, 6, 6, 0], ll: [58, 12, 84], rl: [28, 12, 52] },
    kick_back: { sp: 6, la: [30, 40, 20, 0], ra: [30, 40, 20, 0], ll: [10, 6, 22], rl: [-38, 6, 76] },
    kick: { sp: -2, la: [20, 50, 18, 0], ra: [20, 50, 18, 0], ll: [12, 6, 22], rl: [62, 6, 16], rf: 30 },
    kick_follow: { sp: -8, la: [30, 52, 20, 0], ra: [10, 56, 20, 0], ll: [8, 6, 18], rl: [84, 6, 10], rf: 40 },
    receive: { sp: 12, la: [26, 40, 22, 0], ra: [26, 40, 22, 0], ll: [18, 8, 18], rl: [48, 14, 62], rf: 10 },
    squat: { sp: 44, ht: -26, la: [58, 12, 12, 0], ra: [58, 12, 12, 0], ll: [96, 14, 128], rl: [96, 14, 128] },
    sit: { sp: -4, la: [30, 14, 30, 0], ra: [30, 14, 30, 0], ll: [88, 8, 88], rl: [88, 8, 88], air: 0 }
  };
  const poseOf = (name) => {
    const d = POSES[name] || POSES.stand, o = {};
    Object.keys(BASE).forEach((k) => { o[k] = d[k] != null ? (Array.isArray(d[k]) ? d[k].slice() : d[k]) : (Array.isArray(BASE[k]) ? BASE[k].slice() : BASE[k]); });
    return o;
  };
  const blendPose = (A, B, t) => {
    const o = {};
    Object.keys(BASE).forEach((k) => { o[k] = Array.isArray(A[k]) ? A[k].map((v, i) => lerp(v, B[k][i], t)) : lerp(A[k], B[k], t); });
    return o;
  };
  // movimiento cíclico (correr / desplazarse) encima de la postura
  function cycle(P, kind, ph, amp) {
    const o = { ...P, la: P.la.slice(), ra: P.ra.slice(), ll: P.ll.slice(), rl: P.rl.slice() };
    const s = Math.sin(ph), c = Math.cos(ph), a = amp;
    if (kind === 'run') {
      o.ll[0] += 40 * s * a; o.rl[0] -= 40 * s * a;
      o.ll[2] += 52 * Math.max(0, -c) * a; o.rl[2] += 52 * Math.max(0, c) * a;
      o.la[0] -= 38 * s * a; o.ra[0] += 38 * s * a; o.lf += 20 * Math.max(0, c) * a; o.rf += 20 * Math.max(0, -c) * a;
    } else if (kind === 'shuffle') {
      o.ll[1] += 10 * s * a; o.rl[1] -= 10 * s * a; o.ll[2] += 12 * Math.max(0, -c) * a; o.rl[2] += 12 * Math.max(0, c) * a;
      o.la[1] += 6 * c * a; o.ra[1] -= 6 * c * a;
    } else { // walk
      o.ll[0] += 24 * s * a; o.rl[0] -= 24 * s * a; o.la[0] -= 18 * s * a; o.ra[0] += 18 * s * a;
    }
    return o;
  }

  /* ---------- esqueleto ---------- */
  const LEN = { th: 0.42, sh: 0.42, ua: 0.30, fa: 0.27, ha: 0.1, ft: 0.25 };
  function limbDir(f, a, side) { f *= D; a *= D; return [side * Math.sin(a), -Math.cos(a) * Math.cos(f), Math.cos(a) * Math.sin(f)]; }
  function bend(d, ang, ref, plane) {
    let u = ref;
    if (plane) u = rodrigues(ref, d, plane * D);
    if (len(cross(d, u)) < 0.12) u = [0, 1, 0];
    const n = norm(cross(d, u));
    return rodrigues(d, n, ang * D);
  }
  // devuelve puntos del cuerpo en el sistema del tronco (cadera = 0,0,0; adelante = +z; izquierda = +x)
  function skeleton(P) {
    const up = (v) => rz(rx(ry(v, P.tw * D), P.sp * D), P.sr * D);
    const S = {};
    S.neck = up([0, 0.52, 0]);
    S.head = add(S.neck, up(rx([0, 0.17, 0], P.ht * D)));
    S.shL = up([0.235, 0.46, 0]); S.shR = up([-0.235, 0.46, 0]);
    [['L', 1, P.la, S.shL], ['R', -1, P.ra, S.shR]].forEach(([n, side, ar, sh]) => {
      const d1 = up(limbDir(ar[0], ar[1], side));
      const eb = ar[3] ? -side * ar[3] : 0;
      const d2 = bend(d1, ar[2], up([0, 0, 1]), eb);
      S['el' + n] = add(sh, mul(d1, LEN.ua)); S['wr' + n] = add(S['el' + n], mul(d2, LEN.fa)); S['ha' + n] = add(S['wr' + n], mul(d2, LEN.ha));
    });
    [['L', 1, P.ll, P.lf], ['R', -1, P.rl, P.rf]].forEach(([n, side, lg, ft]) => {
      const hip = [side * 0.09, 0, 0];
      const d1 = limbDir(lg[0], lg[1], side);
      const d2 = bend(d1, lg[2], [0, 0, -1], 0);
      S['hip' + n] = hip; S['kn' + n] = add(hip, mul(d1, LEN.th)); S['an' + n] = add(S['kn' + n], mul(d2, LEN.sh));
      S['to' + n] = add(S['an' + n], mul([0, -Math.sin(ft * D), Math.cos(ft * D)], LEN.ft));
    });
    S.up = up;
    return S;
  }
  const R_RAD = { head: 0.13, neck: 0.05, ua: 0.06, fa: 0.052, th: 0.098, sh: 0.07, glove: 0.092, hand: 0.055, boot: 0.065 };

  /* ---------- cámara ---------- */
  const F = 1050, NEAR = 0.3;
  function makeCam(az, el, T, D0, ox, oy) {
    const a = az * D, e = el * D;
    const C = [T[0] + D0 * Math.sin(a) * Math.cos(e), T[1] + D0 * Math.sin(e), T[2] + D0 * Math.cos(a) * Math.cos(e)];
    const f = norm(sub(T, C)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
    return { C, f, r, u, cx: 350 + (ox || 0), cy: 300 + (oy || 0), az, el, T, D: D0 };
  }
  const toCam = (cam, p) => { const v = sub(p, cam.C); return [dot(v, cam.r), dot(v, cam.u), dot(v, cam.f)]; };
  const scr = (cam, c) => { const k = F / c[2]; return { x: cam.cx + c[0] * k, y: cam.cy - c[1] * k, d: c[2], s: k }; };
  const proj = (cam, p) => scr(cam, toCam(cam, p));
  function fitCam(pts, az, el) {
    let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    pts.forEach((p) => { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mnz = Math.min(mnz, p[2]); mxz = Math.max(mxz, p[2]); });
    const cxw = (mnx + mxx) / 2, czw = (mnz + mxz) / 2;
    // región mínima de 6 m para que nunca quede demasiado cerca
    const T = [cxw, 0.7, czw];
    const pad = [[-2.4, 0, -2.2], [2.4, 0, 2.2], [-2.4, 0, 2.2], [2.4, 0, -2.2]].map((o) => add([cxw, 0, czw], o));
    const all = pts.concat(pad).concat(pts.map((p) => [p[0], 2.0, p[2]]));
    const mx = 44, mt = 64, mb = 52;
    let D0 = 5, cam;
    for (let i = 0; i < 80; i++, D0 *= 1.06) {
      cam = makeCam(az, el, T, D0);
      let a = 1e9, b = -1e9, c = 1e9, d = -1e9, ok = true;
      for (const p of all) { const s = proj(cam, p); if (s.d < 1) { ok = false; break; } a = Math.min(a, s.x); b = Math.max(b, s.x); c = Math.min(c, s.y); d = Math.max(d, s.y); }
      if (ok && (b - a) <= 700 - 2 * mx && (d - c) <= 600 - mt - mb) {
        return makeCam(az, el, T, D0, 350 - (a + b) / 2, (mt + (600 - mb)) / 2 - (c + d) / 2 + 20);
      }
    }
    return makeCam(az, el, T, D0 * 2);
  }

  /* ---------- del plano de la pizarra al campo real ---------- */
  const TOPM = 10.9;
  function conv(scene) {
    if (scene.view === 'front') {
      return {
        front: true,
        pt: (x, y) => [(x - 350) / 60, Math.max(-1, 20 * (1 - 0.995 / (0.95 + (y - 300) / 300 * 0.45)))],
        ppm: (y) => 60 * (0.95 + (y - 300) / 300 * 0.45) / 0.995
      };
    }
    // las pizarras son esquemas: si el ejercicio ocupa mucho espacio, se acerca todo para que los deportistas se vean grandes
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    const see = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
    scene.frames.forEach((f) => {
      f.items.forEach((i) => { if (i.t !== 'goal' || true) see(i.x, i.y); });
    });
    const ext = Math.max(x1 - x0, (y1 - y0) * 1.1, 1);
    const kk = Math.max(TOPM, ext / 8.5);
    return { front: false, kk, pt: (x, y) => [(x - 350) / kk, (y - 40) / kk], ppm: () => kk };
  }

  /* ---------- estados por cuadro ---------- */
  const KITS = {
    gk: { jersey: '#ff9f1c', short: '#1b2236', sock: '#4a5470', skin: '#e9b98f', glove: '#b8f56a', hair: '#2a2018', boot: '#10141f', gk: true },
    pl: { jersey: '#2f80ff', short: '#10203f', sock: '#2f80ff', skin: '#e9b98f', hair: '#2a2018', boot: '#10141f', numc: '#fff' },
    op: { jersey: '#e5484d', short: '#3a1216', sock: '#e5484d', skin: '#d9a77c', hair: '#1d1612', boot: '#10141f', numc: '#fff' },
    wl: { jersey: '#8b95a7', short: '#323a4c', sock: '#8b95a7', skin: '#e9b98f', hair: '#2a2018', boot: '#10141f' }
  };

  function resolve(scene, fi) {
    const cv = conv(scene), fr = scene.frames[fi];
    const items = [];
    const balls = fr.items.filter((o) => o.t === 'ball').map((o) => cv.pt(o.x, o.y));
    const arrowsW = fr.arrows.map((a) => ({ k: a.k, pts: a.pts.map((p) => cv.pt(p[0], p[1])) }));
    fr.items.forEach((it) => {
      const [X, Z] = cv.pt(it.x, it.y);
      const o = { id: it.id, t: it.t, X, Z, n: it.n, Y: it.z ? it.z / cv.ppm(it.y) : 0, g: it.g || null, gw: it.gw || null, w: it.w || null };
      if (it.t === 'gk' || it.t === 'pl' || it.t === 'op' || it.t === 'wall') {
        // pose
        let name = it.p, roll = null;
        if (!name) {
          if (cv.front && it.t === 'gk') {
            const r = it.r || 0;
            if (Math.abs(r) >= 30) { name = r < 0 ? 'dive_r' : 'dive_l'; roll = -r; }
            else if (it.k) name = 'block_low';
            else if (it.u || (it.z && it.z > 20)) name = 'catch_high';
            else name = 'base';
          } else name = it.t === 'gk' ? 'base' : (it.t === 'wall' ? 'wall' : 'stand');
        }
        o.pname = name; o.roll = roll;
        o.air = 0;
        if (cv.front && it.t !== 'ball') { o.Y = 0; o.air = it.z ? it.z / cv.ppm(it.y) : 0; }
        // dirección a la que mira
        let h = it.h;
        if (h == null) {
          let tgt = null;
          const near = arrowsW.find((a) => a.pts.length > 1 && Math.hypot(a.pts[0][0] - X, a.pts[0][1] - Z) < 1.6 && (a.k === 'pass' || a.k === 'run' || a.k === 'gk'));
          if (near) { const q = near.pts[near.pts.length > 2 ? 1 : 1]; tgt = near.k === 'pass' ? near.pts[near.pts.length - 1] : q; }
          else {
            const b = balls.map((q) => ({ q, d: Math.hypot(q[0] - X, q[1] - Z) })).sort((a, b2) => a.d - b2.d)[0];
            if (b && b.d > 1.0) tgt = b.q;
          }
          if (tgt) h = Math.atan2(tgt[0] - X, tgt[1] - Z) / D;
          else if (cv.front) h = (it.t === 'gk' || it.fr) ? 0 : 180;
          else h = it.t === 'gk' ? 0 : 180;
        }
        o.h = h;
        o.fr = it.fr;
      }
      items.push(o);
    });
    // ficha con muro: 4 personas
    return {
      items, arrows: arrowsW, front: cv.front,
      marks: (fr.marks || []).map((m) => convMark(cv, m)), cap: fr.cap || ''
    };
  }
  function convMark(cv, m) {
    if (m.k === 'zone') { const a = cv.pt(m.x, m.y), b = cv.pt(m.x + m.w, m.y + m.h); return { k: 'zone', c: m.c, t: m.t, a, b, w: m.w }; }
    if (m.k === 'dist') return { k: 'dist', a: cv.pt(m.a[0], m.a[1]), b: cv.pt(m.b[0], m.b[1]), t: m.t };
    if (m.k === 'ring') { const p = cv.pt(m.x, m.y); return { k: 'ring', p, r: (m.r || 24) / cv.ppm(m.y), c: m.c }; }
    const p = cv.pt(m.x, m.y); return { k: m.k, p, t: m.t };
  }

  const stateCache = new WeakMap();
  function cached(scene) {
    const sig = JSON.stringify(scene.frames).length + ':' + scene.frames.length + ':' + (scene.view || '');
    let c = stateCache.get(scene);
    if (!c || c.sig !== sig) { c = { sig, frames: scene.frames.map((_, i) => resolve(scene, i)), cams: {} }; stateCache.set(scene, c); }
    return c;
  }

  // cuadro fijo
  PA.illusFrame = function (scene, fi) { return cached(scene).frames[fi]; };
  // cuadro intermedio (p = 0..1) con movimiento
  PA.illusBlend = function (scene, ai, bi, p, clock) {
    const c = cached(scene), A = c.frames[ai], B = c.frames[bi];
    const bm = new Map(B.items.map((o) => [o.id, o]));
    const items = [];
    A.items.forEach((a) => {
      const b = bm.get(a.id);
      if (!b) { items.push({ ...a, alpha: 1 - p }); return; }
      bm.delete(a.id);
      const o = { ...a, alpha: 1, X: lerp(a.X, b.X, p), Z: lerp(a.Z, b.Z, p), Y: lerp(a.Y || 0, b.Y || 0, p), air: lerp(a.air || 0, b.air || 0, p) };
      o.g = p < 0.5 ? a.g : b.g; o.gw = p < 0.5 ? a.gw : b.gw;
      if (a.h != null) {
        o.h = a.h + angDiff(a.h, b.h != null ? b.h : a.h) * p;
        const dist = Math.hypot(b.X - a.X, b.Z - a.Z);
        // si se desplaza, mira hacia donde va (salvo que el entrenador haya fijado la mirada)
        o.pa = a.pname; o.pb = b.pname; o.ra = a.roll; o.rb = b.roll; o.pt = p;
        const LOCO = ['stand', 'base', 'run', 'shuffle', 'walk', 'hold'];
        if (dist > 1.0 && LOCO.includes(a.pname) && LOCO.includes(b.pname)) {
          const dir = Math.atan2(b.X - a.X, b.Z - a.Z) / D;
          const sideStep = a.t === 'gk' && Math.abs(angDiff(o.h, dir)) > 45 && dist < 8;
          if (!sideStep && a.t !== 'gk' && a.pname === 'stand' && b.pname === 'stand') o.h = dir;
          o.mv = { kind: (a.pname === 'run' || b.pname === 'run') ? 'run' : (a.pname === 'hold' || b.pname === 'hold' ? 'walk' : (a.t === 'gk' && dist < 8 ? 'shuffle' : 'run')), ph: dist * p / 1.25, amp: Math.max(0, Math.min(1, Math.sin(Math.PI * p) * 2.2)) };
          if (a.pname === 'stand' && b.pname === 'stand') { o.pa = 'run'; o.pb = 'run'; }
          if (a.pname === 'base' && b.pname === 'base') { o.pa = o.mv.kind === 'run' ? 'run' : 'shuffle'; o.pb = o.pa; }
        }
      }
      items.push(o);
    });
    bm.forEach((b) => items.push({ ...b, alpha: p }));
    const arrows = A.arrows.map((a) => ({ ...a, al: 1 - p })).concat(B.arrows.map((a) => ({ ...a, al: p })));
    const ja = A.marks.map((m) => JSON.stringify(m)), jb = B.marks.map((m) => JSON.stringify(m));
    const marks = A.marks.map((m, i) => ({ ...m, al: jb.includes(ja[i]) ? 1 : 1 - p })).concat(B.marks.filter((m, i) => !ja.includes(jb[i])).map((m) => ({ ...m, al: p })));
    return { items, arrows, marks, front: A.front };
  };

  /* ---------- dibujo ---------- */
  function camFor(scene, az) {
    const c = cached(scene);
    const key = String(az || 0);
    if (c.cams[key]) return c.cams[key];
    const pts = [];
    c.frames.forEach((f) => {
      f.items.forEach((o) => { pts.push([o.X, 0, o.Z]); if (o.t === 'wall') { pts.push([o.X - 1.2, 0, o.Z], [o.X + 1.2, 0, o.Z]); } });
      f.marks.forEach((m) => { if (m.a) { pts.push([m.a[0], 0, m.a[1]]); if (m.b) pts.push([m.b[0], 0, m.b[1]]); } else if (m.p) pts.push([m.p[0], 0, m.p[1]]); });
    });
    const cam = fitCam(pts, az || 0, c.frames[0].front ? 13 : 30);
    c.cams[key] = cam; return cam;
  }

  function clipPoly(cp) {
    const out = [];
    for (let i = 0; i < cp.length; i++) {
      const a = cp[i], b = cp[(i + 1) % cp.length], ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), NEAR]); }
    }
    return out;
  }
  function polyW(ctx, cam, pts) {  // polígono en el mundo
    const cp = clipPoly(pts.map((p) => toCam(cam, p)));
    if (cp.length < 3) return false;
    ctx.beginPath(); cp.forEach((c, i) => { const s = scr(cam, c); ctx[i ? 'lineTo' : 'moveTo'](s.x, s.y); }); ctx.closePath(); return true;
  }
  function lineW(ctx, cam, a, b) {
    let ca = toCam(cam, a), cb = toCam(cam, b);
    if (ca[2] < NEAR && cb[2] < NEAR) return;
    if (ca[2] < NEAR) { const t = (NEAR - ca[2]) / (cb[2] - ca[2]); ca = [lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), NEAR]; }
    if (cb[2] < NEAR) { const t = (NEAR - cb[2]) / (ca[2] - cb[2]); cb = [lerp(cb[0], ca[0], t), lerp(cb[1], ca[1], t), NEAR]; }
    const s1 = scr(cam, ca), s2 = scr(cam, cb); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y);
  }

  function drawGround(ctx, cam) {
    const hz = cam.cy - F * Math.tan(cam.el * D);
    const bg = ctx.createLinearGradient(0, Math.min(hz, 0) - 120, 0, Math.max(hz, 40)); bg.addColorStop(0, '#070c1c'); bg.addColorStop(1, '#27508f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 700, 600);
    ctx.fillStyle = '#1b5f36';
    if (polyW(ctx, cam, [[-900, 0, -900], [900, 0, -900], [900, 0, 900], [-900, 0, 900]])) ctx.fill();
    for (let k = -14; k < 24; k++) {
      ctx.fillStyle = k % 2 ? '#1c6a3b' : '#238043';
      if (polyW(ctx, cam, [[-90, 0, k * 4], [90, 0, k * 4], [90, 0, k * 4 + 4], [-90, 0, k * 4 + 4]])) ctx.fill();
    }
    // líneas del campo (medidas reales)
    ctx.strokeStyle = 'rgba(255,255,255,.88)'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const wpx = Math.max(2, 0.13 * proj(cam, cam.T).s);
    ctx.lineWidth = wpx; ctx.beginPath();
    const L = (a, b) => lineW(ctx, cam, [a[0], 0, a[1]], [b[0], 0, b[1]]);
    L([-60, 0], [60, 0]);                                        // línea de gol
    L([-20.16, 0], [-20.16, 16.5]); L([20.16, 0], [20.16, 16.5]); L([-20.16, 16.5], [20.16, 16.5]);     // área grande
    L([-9.16, 0], [-9.16, 5.5]); L([9.16, 0], [9.16, 5.5]); L([-9.16, 5.5], [9.16, 5.5]);              // área chica
    for (let i = 0; i < 24; i++) {                                // medialuna
      const a0 = (-53 + i * (106 / 24)) * D, a1 = (-53 + (i + 1) * (106 / 24)) * D;
      L([9.15 * Math.sin(a0), 11 + 9.15 * Math.cos(a0)], [9.15 * Math.sin(a1), 11 + 9.15 * Math.cos(a1)]);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    if (polyW(ctx, cam, [[-0.18, 0, 10.82], [0.18, 0, 10.82], [0.18, 0, 11.18], [-0.18, 0, 11.18]])) ctx.fill();
  }

  function drawGoal(ctx, cam, X, Z, w, hgt, dep, yaw, alpha, net) {
    const rot = (x, y, z) => { const v = ry([x, y, z], yaw * D); return [X + v[0], y, Z + v[2]]; };
    const P = (x, y, z) => proj(cam, rot(x, y, z));
    const hw = w / 2;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const wpx = Math.max(2.5, 0.12 * proj(cam, [X, 0, Z]).s);
    // red
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1;
    ctx.beginPath();
    const ln = (a, b) => { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); };
    const nx = Math.max(6, Math.round(w / 0.6)), ny = Math.max(3, Math.round(hgt / 0.5));
    for (let i = 0; i <= nx; i++) { const x = -hw + w * i / nx; ln(P(x, 0, -dep), P(x, hgt, -dep)); ln(P(x, hgt, 0), P(x, hgt * 0.92, -dep)); }
    for (let j = 0; j <= ny; j++) { const y = hgt * j / ny; ln(P(-hw, y, -dep), P(hw, y, -dep)); }
    for (let j = 0; j <= ny; j++) { const y = hgt * j / ny; ln(P(-hw, y, 0 - 0), P(-hw, y, -dep)); ln(P(hw, y, 0), P(hw, y, -dep)); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = wpx * 0.5; ctx.beginPath();
    ln(P(-hw, 0, -dep), P(-hw, hgt, -dep)); ln(P(hw, 0, -dep), P(hw, hgt, -dep)); ln(P(-hw, hgt, -dep), P(hw, hgt, -dep));
    ln(P(-hw, hgt, 0), P(-hw, hgt, -dep)); ln(P(hw, hgt, 0), P(hw, hgt, -dep));
    ctx.stroke();
    // marco
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = wpx + 2.5; ctx.beginPath();
    let a = P(-hw, 0, 0), b = P(-hw, hgt, 0), c = P(hw, hgt, 0), d = P(hw, 0, 0);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = wpx; ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    ctx.restore();
  }

  function sphere(ctx, x, y, r, base) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#fff'); g.addColorStop(1, base || '#cfd6e4');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(1.2, r * 0.1); ctx.stroke();
  }
  function drawBall(ctx, cam, p) {
    const s = proj(cam, [p[0], p[1], p[2]]), r = 0.115 * s.s;
    const gp = proj(cam, [p[0], 0, p[2]]);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(gp.x, gp.y, r * 1.05 * Math.max(0.5, 1 - p[1] / 5), r * 0.42, 0, 0, 7); ctx.fill();
    sphere(ctx, s.x, s.y - 0.0, r);
    ctx.fillStyle = '#111';
    ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; ctx[k ? 'lineTo' : 'moveTo'](s.x + Math.cos(a) * r * 0.42, s.y + Math.sin(a) * r * 0.42); } ctx.closePath(); ctx.fill();
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.6; ctx.beginPath(); ctx.arc(s.x + Math.cos(a) * r * 0.82, s.y + Math.sin(a) * r * 0.82, r * 0.2, 0, 7); ctx.fill(); }
  }
  function drawBoard(ctx, cam, X, Z, yaw) {   // muro de rebote
    const hw = 1.6, hh = 1.25, th = 0.14, R = (x, y, z) => { const v = ry([x, y, z], yaw * D); return [X + v[0], y, Z + v[2]]; };
    const c = [[-hw, 0, th], [hw, 0, th], [hw, 0, -th], [-hw, 0, -th], [-hw, hh, th], [hw, hh, th], [hw, hh, -th], [-hw, hh, -th]].map((p) => proj(cam, R(p[0], p[1], p[2])));
    const ctr = proj(cam, [X, 0, Z]);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(ctr.x, ctr.y, hw * ctr.s * 1.05, 0.35 * ctr.s, 0, 0, 7); ctx.fill();
    const face = (idx, col) => { ctx.beginPath(); idx.forEach((i, k) => ctx[k ? 'lineTo' : 'moveTo'](c[i].x, c[i].y)); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#0a0e1a'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke(); };
    face([2, 3, 7, 6], '#59647a'); face([0, 3, 7, 4], '#6d7890'); face([1, 2, 6, 5], '#6d7890');
    face([0, 1, 5, 4], '#98a3b8'); face([4, 5, 6, 7], '#b9c3d6');
    const m = proj(cam, R(0, 0.62, th)), rr = 0.34 * m.s;
    [[1, '#e5484d'], [0.64, '#fff'], [0.3, '#e5484d']].forEach(([k, col]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(m.x, m.y, rr * k, 0, 7); ctx.fill(); });
  }
  function drawCone(ctx, cam, X, Z) {
    const b = proj(cam, [X, 0, Z]), t = proj(cam, [X, 0.32, Z]), w = 0.15 * b.s;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, w * 1.3, w * 0.45, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(b.x + w, b.y); ctx.quadraticCurveTo(b.x, b.y + w * 0.5, b.x - w, b.y); ctx.closePath();
    ctx.fillStyle = '#ffb020'; ctx.fill(); ctx.strokeStyle = '#0a0e1a'; ctx.lineWidth = 1.6; ctx.stroke();
    const m = proj(cam, [X, 0.16, Z]); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(m.x, m.y, w * 0.62, w * 0.2, 0, 0, 7); ctx.fill();
  }

  /* persona completa */
  function personWorld(P, spec) {
    const S = skeleton(P);
    const yaw = spec.yaw * D, pitch = P.pitch * D, roll = (spec.roll != null ? spec.roll : P.roll) * D;
    const R = (v) => ry(rz(rx(v, pitch), roll), yaw);
    const W = {};
    Object.keys(S).forEach((k) => { if (k !== 'up') W[k] = R(S[k]); });
    // alturas mínimas para apoyar el cuerpo en el piso
    const chk = [['anL', R_RAD.boot], ['anR', R_RAD.boot], ['toL', R_RAD.boot * 0.7], ['toR', R_RAD.boot * 0.7], ['knL', R_RAD.sh], ['knR', R_RAD.sh], ['haL', R_RAD.glove], ['haR', R_RAD.glove], ['head', R_RAD.head], ['elL', 0.05], ['elR', 0.05], ['hipL', 0.1], ['hipR', 0.1]];
    let low = 1e9; chk.forEach(([k, r]) => { low = Math.min(low, W[k][1] - r); });
    const y0 = -low + (spec.air || 0) + (spec.Y || 0);
    const place = (v) => [spec.X + v[0], y0 + v[1], spec.Z + v[2]];
    const O = {};
    Object.keys(W).forEach((k) => { O[k] = place(W[k]); });
    O.root = place([0, 0, 0]);
    O.R = R; O.S = S; O.y0 = y0; O.place = place;
    return O;
  }
  function boxFaces(c8) { return [[0, 1, 5, 4, 'f'], [3, 2, 6, 7, 'b'], [0, 3, 7, 4, 'l'], [1, 2, 6, 5, 'r'], [4, 5, 6, 7, 't'], [0, 1, 2, 3, 'd']]; }
  function drawPerson(ctx, cam, spec, P, kit) {
    const O = personWorld(P, spec);
    const prim = [];
    const S = (p) => proj(cam, p);
    const toC = (p) => norm(sub(cam.C, p));
    // sombra
    const g = proj(cam, [O.root[0], 0, O.root[2]]);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    const hgt = Math.max(0, O.root[1]), sh = Math.max(0.5, 1 - hgt / 3);
    ctx.beginPath(); ctx.ellipse(g.x, g.y, 0.5 * g.s * sh, 0.2 * g.s * sh, 0, 0, 7); ctx.fill();
    const OL = '#0a0e1a';
    const capsule = (a, b, ra, rb, col, bias) => {
      const A = S(a), B = S(b);
      prim.push({ d: (A.d + B.d) / 2 + (bias || 0), f: () => {
        const wa = ra * A.s, wb = rb * B.s, L2 = Math.hypot(B.x - A.x, B.y - A.y) || 0.001;
        const nx = -(B.y - A.y) / L2, ny = (B.x - A.x) / L2;
        const body = (e, color) => {
          ctx.fillStyle = color; ctx.beginPath();
          ctx.arc(A.x, A.y, wa + e, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(B.x, B.y, wb + e, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.moveTo(A.x + nx * (wa + e), A.y + ny * (wa + e)); ctx.lineTo(B.x + nx * (wb + e), B.y + ny * (wb + e));
          ctx.lineTo(B.x - nx * (wb + e), B.y - ny * (wb + e)); ctx.lineTo(A.x - nx * (wa + e), A.y - ny * (wa + e)); ctx.closePath(); ctx.fill();
        };
        body(1.4, OL); body(0, col);
      } });
    };
    // torso y pelvis como cajas
    const box = (corners, col, num, bias, flatNum) => {
      const ctr = corners.reduce((a, c) => add(a, c), [0, 0, 0]).map((v) => v / 8);
      const faces = boxFaces();
      const dC = S(ctr).d + (bias || 0);
      prim.push({ d: dC, f: () => {
        faces.map((fc) => {
          const pts = fc.slice(0, 4).map((i) => corners[i]);
          const fcn = pts.reduce((a, c) => add(a, c), [0, 0, 0]).map((v) => v / 4);
          const nrm = norm(sub(fcn, ctr));
          const vis = dot(nrm, toC(fcn));
          return { fc, pts, fcn, nrm, vis };
        }).filter((q) => q.vis > 0).sort((a, b) => S(b.fcn).d - S(a.fcn).d).forEach((q) => {
          const lit = 0.72 + 0.34 * Math.max(0, dot(q.nrm, norm([0.3, 0.8, 0.5]))) + (q.fc[4] === 'f' || q.fc[4] === 'b' ? 0.02 : -0.04);
          ctx.beginPath(); q.pts.forEach((p, i) => { const s = S(p); ctx[i ? 'lineTo' : 'moveTo'](s.x, s.y); }); ctx.closePath();
          ctx.fillStyle = shade(col, lit); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.stroke();
          if (num && q.fc[4] === 'b' && q.vis > 0.35) {
            const s = S(q.fcn); ctx.fillStyle = kit.numc || '#fff'; ctx.font = '800 ' + Math.round(0.2 * s.s) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(String(num), s.x, s.y - 0.02 * s.s);
          }
        });
      } });
    };
    const frame = (up, hw, hd, y0b, y1b, hw1, hd1) => {   // caja deformable
      const out = [];
      [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => out.push([sx * hw, y0b, sz * hd]));
      [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => out.push([sx * (hw1 || hw), y1b, sz * (hd1 || hd)]));
      return out;
    };
    const wld = (v, up) => { const p = O.R(up ? O.S.up(v) : v); return O.place(p); };
    // torso
    box(frame(true, 0.17, 0.1, 0.1, 0.5, 0.235, 0.115).map((v) => wld(v, true)), kit.jersey, spec.num, 0);
    // pantalón
    box(frame(false, 0.185, 0.115, -0.14, 0.13, 0.185, 0.115).map((v) => wld(v, false)), kit.short, null, 0.02);
    // piernas
    ['L', 'R'].forEach((n) => {
      const hip = O['hip' + n], kn = O['kn' + n], an = O['an' + n], to = O['to' + n];
      const mid = add(hip, mul(sub(kn, hip), 0.52));
      capsule(mid, kn, R_RAD.th * 0.82, R_RAD.th * 0.68, kit.skin, 0.01);
      capsule(hip, mid, R_RAD.th, R_RAD.th * 0.88, kit.short, 0.0);
      capsule(kn, an, R_RAD.sh, R_RAD.sh * 0.78, kit.sock, 0.0);
      capsule(an, to, R_RAD.boot, R_RAD.boot * 0.72, kit.boot, -0.02);
    });
    // brazos
    ['L', 'R'].forEach((n) => {
      const sh = O['sh' + n], el = O['el' + n], wr = O['wr' + n], ha = O['ha' + n];
      capsule(sh, el, R_RAD.ua, R_RAD.ua * 0.9, kit.jersey, -0.02);
      capsule(el, wr, R_RAD.fa, R_RAD.fa * 0.85, kit.gk ? kit.jersey : kit.skin, -0.02);
      const A = S(ha);
      prim.push({ d: A.d - 0.06, f: () => {
        const r = (kit.gk ? R_RAD.glove : R_RAD.hand) * A.s;
        ctx.fillStyle = kit.gk ? kit.glove : kit.skin; ctx.strokeStyle = OL; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(A.x, A.y, r, r * 0.92, 0, 0, 7); ctx.fill(); ctx.stroke();
        if (kit.gk) { ctx.strokeStyle = 'rgba(10,14,26,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A.x - r * 0.55, A.y - r * 0.1); ctx.lineTo(A.x + r * 0.55, A.y - r * 0.1); ctx.stroke(); }
      } });
    });
    // cuello y cabeza
    const nk = O.neck, hd = O.head;
    capsule(nk, hd, R_RAD.neck, R_RAD.neck, kit.skin, -0.02);
    const Hs = S(hd);
    const fwd = norm(sub(O.R(O.S.up(rx([0, 0, 1], P.ht * D))), [0, 0, 0]));
    prim.push({ d: Hs.d - 0.12, f: () => {
      const r = R_RAD.head * Hs.s, facing = dot(fwd, toC(hd));
      const rightScr = cam.r, upScr = cam.u;
      const fx = dot(fwd, rightScr), fy = -dot(fwd, upScr);
      ctx.strokeStyle = OL; ctx.lineWidth = 1.7;
      ctx.fillStyle = kit.hair; ctx.beginPath(); ctx.arc(Hs.x, Hs.y, r, 0, 7); ctx.fill(); ctx.stroke();
      if (facing > -0.2) {
        const k = Math.max(0, Math.min(1, (facing + 0.2) / 1.0));
        ctx.fillStyle = kit.skin; ctx.beginPath();
        ctx.arc(Hs.x + fx * r * 0.32, Hs.y + fy * r * 0.2 + r * 0.14 * k, r * (0.74 + 0.16 * k), 0, 7); ctx.fill();
        if (facing > 0.45) {
          ctx.fillStyle = '#1a1410'; const ex = r * 0.3;
          [-1, 1].forEach((s2) => { ctx.beginPath(); ctx.arc(Hs.x + fx * r * 0.32 + s2 * ex, Hs.y + fy * r * 0.2 + r * 0.16, Math.max(1, r * 0.09), 0, 7); ctx.fill(); });
        } else if (facing > -0.2) {
          ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(Hs.x + fx * r * 0.62, Hs.y + fy * r * 0.2 + r * 0.12, Math.max(1, r * 0.09), 0, 7); ctx.fill();
        }
      }
    } });
    prim.sort((a, b) => b.d - a.d).forEach((q) => q.f());
    return O;
  }

  const kitFor = (t) => KITS[t] || KITS.pl;
  function poseFor(it, clock) {
    let P;
    if (it.pa != null && it.pb != null && it.pt != null) {
      const A = poseOf(it.pa), B = poseOf(it.pb);
      P = blendPose(A, B, it.pt);
    } else P = poseOf(it.pname || 'stand');
    if (it.mv) P = cycle(P, it.mv.kind, it.mv.ph * 2.2 + 0.6, it.mv.amp);
    return P;
  }
  function rollOf(it) {
    if (it.pa != null && it.pb != null && it.pt != null) {
      const ra = it.ra, rb = it.rb;
      if (ra == null && rb == null) return null;
      return lerp(ra != null ? ra : poseOf(it.pa).roll, rb != null ? rb : poseOf(it.pb).roll, it.pt);
    }
    return it.roll != null ? it.roll : null;
  }

  /* ---------- marcas sobre el campo ---------- */
  function clampX(ctx, x, t) {   // que el texto no se salga de la imagen
    ctx.save(); ctx.font = '800 15px system-ui,-apple-system,sans-serif'; const w = ctx.measureText(t || '').width / 2 + 12; ctx.restore();
    return Math.max(w + 4, Math.min(700 - w - 4, x));
  }
  function drawMarks(ctx, cam, marks, zonesOnly) {
    marks.forEach((m) => {
      const al = m.al == null ? 1 : m.al;
      const g = (p, y) => proj(cam, [p[0], y || 0, p[1]]);
      if (m.k === 'zone') {
        if (!zonesOnly) return;
        const c = H.MC[m.c] || H.MC.g, a = m.a, b = m.b;
        ctx.save(); ctx.globalAlpha = al * 0.22; ctx.fillStyle = c;
        if (polyW(ctx, cam, [[a[0], 0.01, a[1]], [b[0], 0.01, a[1]], [b[0], 0.01, b[1]], [a[0], 0.01, b[1]]])) ctx.fill();
        ctx.globalAlpha = al; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.setLineDash([10, 7]); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        return;
      }
      if (zonesOnly) return;
      if (m.k === 'label') { const s = g(m.p, 2.4); H.drawMark(ctx, { k: 'label', x: clampX(ctx, s.x, m.t), y: Math.max(22, Math.min(578, s.y)), t: m.t }, al); }
      else if (m.k === 'num') { const s = g(m.p, 0.05); H.drawMark(ctx, { k: 'num', x: s.x, y: s.y, t: m.t }, al); }
      else if (m.k === 'ring') { const s = g(m.p, 0); ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = H.MC[m.c] || H.MC.y; ctx.lineWidth = 4; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.ellipse(s.x, s.y, m.r * s.s, m.r * s.s * 0.45, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      else if (m.k === 'dist') { const a = g(m.a), b = g(m.b); H.drawMark(ctx, { k: 'dist', a: [a.x, a.y], b: [b.x, b.y], t: m.t }, al); }
    });
    // los nombres de las zonas van al final, arriba de cada una
    if (zonesOnly) return;
    marks.forEach((m) => {
      if (m.k !== 'zone' || !m.t) return;
      const al = m.al == null ? 1 : m.al, a = m.a, b = m.b, c = H.MC[m.c] || H.MC.g;
      const s = proj(cam, [(a[0] + b[0]) / 2, 0, Math.min(a[1], b[1])]);
      ctx.save(); ctx.globalAlpha = al; H.pill(ctx, clampX(ctx, s.x, m.t), Math.max(22, Math.min(578, s.y - 16)), m.t, c); ctx.restore();
    });
  }

  PA.illusDraw = function (ctx, scene, st, az) {
    const cam = camFor(scene, az || 0);
    drawGround(ctx, cam);
    drawMarks(ctx, cam, st.marks, true);
    // arcos
    const hasGk = st.items.some((o) => o.t === 'gk' && o.Z < 7 && Math.abs(o.X) < 9);
    if (hasGk || st.items.some((o) => o.Z < 1 && o.t === 'ball')) drawGoal(ctx, cam, 0, 0, 7.32, 2.44, 2.0, 0, 1);
    st.items.filter((o) => o.t === 'goal').forEach((o) => drawGoal(ctx, cam, o.X, o.Z, 3.6, 1.2, 1.0, o.h != null ? o.h : 180, o.alpha));
    // flechas sobre el piso
    st.arrows.forEach((a) => {
      const pts = a.pts.map((p) => { const s = proj(cam, [p[0], 0.02, p[1]]); return [s.x, s.y]; });
      H.drawArrow(ctx, { k: a.k, pts }, a.al == null ? 1 : a.al);
    });
    // personas y objetos ordenados por profundidad
    const people = st.items.filter((o) => o.t === 'gk' || o.t === 'pl' || o.t === 'op');
    const handsOf = {};
    const drawList = [];
    st.items.forEach((o) => {
      if (o.t === 'goal') return;
      const d = proj(cam, [o.X, 0, o.Z]).d;
      drawList.push({ d: d + (o.t === 'ball' ? -0.5 : 0), o });
    });
    drawList.sort((a, b) => b.d - a.d);
    // primero calculamos dónde quedan las manos de cada persona para poder "sostener" el balón
    const posed = {};
    people.forEach((o) => {
      const P = poseFor(o), roll = rollOf(o);
      posed[o.id] = { P, roll };
      const O = personWorld(P, { X: o.X, Z: o.Z, yaw: o.h || 0, air: o.air, Y: o.Y, roll });
      handsOf[o.id] = O;
    });
    drawList.forEach(({ o }) => {
      ctx.save(); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
      if (o.t === 'ball') {
        let p = [o.X, 0.115 + (o.Y || 0), o.Z];
        const h = o.g && handsOf[o.g];
        if (h) {
          const w = o.gw || 'B'; const hL = h.haL, hR = h.haR;
          const base = w === 'L' ? hL : w === 'R' ? hR : mul(add(hL, hR), 0.5);
          p = [base[0], base[1] + (w === 'B' ? 0.0 : 0.1), base[2]];
        }
        drawBall(ctx, cam, p);
      } else if (o.t === 'cone') drawCone(ctx, cam, o.X, o.Z);
      else if (o.t === 'wall') {
        if (o.w === 'board') { drawBoard(ctx, cam, o.X, o.Z, o.h || 0); ctx.restore(); return; }
        const yaw = o.h || 0, spec = (k) => ({ X: o.X + Math.cos(yaw * D) * k * 0.55, Z: o.Z - Math.sin(yaw * D) * k * 0.55, yaw, air: 0, Y: 0, num: null });
        [-1.5, -0.5, 0.5, 1.5].forEach((k) => drawPerson(ctx, cam, spec(k), poseOf(o.pname || 'wall'), KITS.wl));
      } else {
        const q = posed[o.id];
        drawPerson(ctx, cam, { X: o.X, Z: o.Z, yaw: o.h || 0, air: o.air, Y: o.Y, roll: q.roll, num: o.t === 'gk' ? null : o.n }, q.P, kitFor(o.t));
      }
      ctx.restore();
    });
    drawMarks(ctx, cam, st.marks, false);
  };

  PA.illusInit = function (h) { Object.assign(H, h); };
  PA.illusPoses = Object.keys(POSES);
  PA.illusPoseOf = poseOf;
  PA.illusInternals = { personWorld, drawPerson, makeCam, fitCam, proj, drawGround, POSES, KITS, BASE };
})();
