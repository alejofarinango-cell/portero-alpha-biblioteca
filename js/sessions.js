/* Sesiones: planificador de entrenamientos */
(function () {
  'use strict';
  const PA = window.PA, h = PA.h;

  const total = (s) => (s.blocks || []).reduce((a, b) => a + (Number(b.min) || 0), 0);
  const rel = (date) => {
    const t = PA.todayStr();
    return date === t ? ['Hoy', 'l1'] : date > t ? ['Próxima', 'mine'] : ['Pasada', ''];
  };

  PA.views.sessions = async function (root) {
    const all = await PA.db.all('sessions');
    const t = PA.todayStr();
    const up = all.filter((s) => s.date >= t).sort((a, b) => a.date.localeCompare(b.date));
    const past = all.filter((s) => s.date < t).sort((a, b) => b.date.localeCompare(a.date));
    const card = (s) => {
      const [lbl, cls] = rel(s.date);
      return h('div', { class: 'item', onclick: () => PA.editSession(s) },
        h('div', { class: 'grow' },
          h('div', { class: 't' }, s.title || 'Entrenamiento'),
          h('div', { class: 's' }, PA.fmtDate(s.date) + ' · ' + PA.plural((s.blocks || []).length, 'bloque', 'bloques') + ' · ' + total(s) + ' min')),
        h('span', { class: 'badge ' + cls }, lbl), PA.icon('chevR', 18));
    };
    if (!all.length) {
      root.append(PA.empty('calendar', 'Aquí armas tus entrenamientos: eliges ejercicios de la biblioteca, les pones minutos y ya tienes el plan de la clase.'));
    }
    if (up.length) root.append(h('h3', { class: 'sec', style: { marginTop: 0 } }, 'Próximas'), h('div', { class: 'list stagger' }, up.map(card)));
    if (past.length) root.append(h('h3', { class: 'sec' }, 'Anteriores'), h('div', { class: 'list' }, past.slice(0, 40).map(card)));
    root.append(h('button', { class: 'fab', onclick: () => PA.editSession(null) }, PA.icon('plus', 20), 'Nueva sesión'));
  };

  PA.editSession = (s) => PA.push(s ? 'Sesión' : 'Nueva sesión', (root) => renderEditor(root, s));

  /* agregar un ejercicio a una sesión (desde el detalle del ejercicio) */
  PA.addExerciseToSession = async function (ex) {
    const sessions = (await PA.db.all('sessions')).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
    const block = () => ({ id: PA.uid(), exId: ex.id, title: ex.title, min: ex.min || 10, notes: '' });
    let m;
    const addTo = async (s) => {
      s.blocks = s.blocks || []; s.blocks.push(block());
      await PA.db.put('sessions', s); m.close(); PA.toast('Agregado a “' + (s.title || 'Entrenamiento') + '” ✓');
    };
    const body = h('div', { class: 'stack' },
      PA.btn('plus', 'Crear sesión nueva con este ejercicio', 'primary block', async () => {
        const s = { id: PA.uid(), date: PA.todayStr(), title: 'Entrenamiento', objective: '', notes: '', blocks: [] };
        await addTo(s);
      }),
      sessions.length ? h('div', { class: 'muted small' }, 'O agrégalo a una sesión existente:') : null,
      sessions.map((s) => h('div', { class: 'item', onclick: () => addTo(s) },
        h('div', { class: 'grow' }, h('div', { class: 't' }, s.title || 'Entrenamiento'), h('div', { class: 's' }, PA.fmtDate(s.date) + ' · ' + total(s) + ' min')))));
    m = PA.modal('Agregar a sesión', body);
  };

  /* ---------- editor de sesión (se guarda solo) ---------- */
  async function renderEditor(root, src) {
    const s = Object.assign({ id: PA.uid(), date: PA.todayStr(), title: '', objective: '', notes: '', blocks: [] }, src || {});
    s.blocks = (s.blocks || []).map((b) => Object.assign({}, b));
    const exists = !!src;
    let dirty = false;
    const saveNow = async () => { if (!dirty) return; await PA.db.put('sessions', s); dirty = false; flash(); };
    const saveSoon = PA.debounce(() => saveNow(), 500);
    const touch = () => { dirty = true; saveSoon(); };
    PA.cleanup = async () => { await saveNow(); };

    const tag = h('span', { class: 'muted small' }, '');
    function flash() { tag.textContent = 'Guardado ✓'; setTimeout(() => (tag.textContent = ''), 1500); }

    const date = h('input', { class: 'input', type: 'date', value: s.date, onchange: (e) => { if (e.target.value) { s.date = e.target.value; touch(); } } });
    const title = h('input', { class: 'input', value: s.title, placeholder: 'Ej: Entrenamiento martes — salidas', oninput: (e) => { s.title = e.target.value; touch(); } });
    const objective = h('textarea', { class: 'input', placeholder: 'Objetivo de la sesión', oninput: (e) => { s.objective = e.target.value; touch(); } }); objective.value = s.objective || '';
    const blocksBox = h('div', { class: 'stack' });
    const totalLbl = h('div', { style: { color: 'var(--blue2)', fontWeight: 800 } });

    function paintBlocks() {
      blocksBox.replaceChildren();
      totalLbl.textContent = 'Total: ' + total(s) + ' min';
      if (!s.blocks.length) blocksBox.append(h('div', { class: 'hint' }, PA.icon('sparkle', 17), h('span', null, 'Todavía no hay ejercicios. Agrega uno de la biblioteca o crea un bloque libre (por ejemplo “Charla” o “Estiramientos”).')));
      s.blocks.forEach((b, i) => {
        const move = (d) => { const j = i + d; if (j < 0 || j >= s.blocks.length) return; [s.blocks[i], s.blocks[j]] = [s.blocks[j], s.blocks[i]]; touch(); paintBlocks(); };
        blocksBox.append(h('div', { class: 'block' },
          h('div', { class: 'head' }, h('div', { class: 'num' }, i + 1),
            h('b', null, b.title),
            b.exId ? PA.btn('eye', '', 'sm', async () => { const e = await PA.db.get('exercises', b.exId); if (e) { await saveNow(); PA.openExercise(e); } else PA.toast('Ese ejercicio ya no está en la biblioteca'); }, 'Ver ejercicio') : null,
            PA.btn('up', '', 'sm', () => move(-1), 'Subir'),
            PA.btn('down', '', 'sm', () => move(1), 'Bajar'),
            PA.btn('x', '', 'sm danger', () => { s.blocks.splice(i, 1); touch(); paintBlocks(); }, 'Quitar')),
          h('div', { class: 'row', style: { marginTop: '8px', flexWrap: 'nowrap' } },
            h('input', { class: 'input', type: 'number', min: 1, max: 120, value: b.min, style: { width: '84px' }, 'aria-label': 'Minutos',
              oninput: (e) => { b.min = Number(e.target.value) || 0; totalLbl.textContent = 'Total: ' + total(s) + ' min'; touch(); } }),
            h('span', { class: 'muted small' }, 'min'),
            h('input', { class: 'input', value: b.notes || '', placeholder: 'Notas (series, descansos, a quién corregir…)', oninput: (e) => { b.notes = e.target.value; touch(); } }))));
      });
    }

    function planText() {
      const L = [(s.title || 'Entrenamiento') + ' — ' + PA.fmtDateLong(s.date)];
      if (s.objective) L.push('Objetivo: ' + s.objective);
      L.push('');
      s.blocks.forEach((b, i) => L.push((i + 1) + '. ' + b.title + ' (' + b.min + ' min)' + (b.notes ? ' — ' + b.notes : '')));
      L.push('', 'Total: ' + total(s) + ' min');
      return L.join('\n');
    }

    const pick = () => {
      let m;
      const q = { t: '', lv: 'all' };
      const lst = h('div', { class: 'list' });
      const draw = async () => {
        const ex = (await PA.db.all('exercises')).filter((e) => (q.lv === 'all' || e.level === q.lv) && (!q.t || e.title.toLowerCase().includes(q.t)))
          .sort((a, b) => (a.level - b.level) || a.title.localeCompare(b.title, 'es'));
        lst.replaceChildren();
        if (!ex.length) lst.append(h('div', { class: 'muted small' }, 'No hay ejercicios con ese filtro.'));
        ex.forEach((e) => lst.append(h('div', { class: 'item', onclick: () => {
          s.blocks.push({ id: PA.uid(), exId: e.id, title: e.title, min: e.min || 10, notes: '' }); touch(); paintBlocks(); m.close();
        } }, h('div', { class: 'grow' }, h('div', { class: 't' }, e.title),
          h('div', { class: 's' }, PA.LEVEL_SHORT[e.level] + ' · ' + e.cat + ' · ' + e.min + ' min')))));
      };
      const chips = h('div', { class: 'chips' }, [['all', 'Todos'], [1, 'Nivel 1'], [2, 'Nivel 2'], [3, 'Nivel 3']].map(([k, l]) =>
        h('button', { class: 'chip' + (k === 'all' ? ' on' : ''), onclick: (e) => { q.lv = k; chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); draw(); } }, l)));
      m = PA.modal('Elegir ejercicio', h('div', null, h('div', { class: 'search' }, PA.icon('search', 18), h('input', { class: 'input', type: 'search', placeholder: 'Buscar…', oninput: (e) => { q.t = e.target.value.toLowerCase(); draw(); } })), h('div', { style: { height: '8px' } }), chips, lst));
      draw();
    };

    const addFree = () => {
      let m;
      const name = h('input', { class: 'input', placeholder: 'Ej: Charla técnica, Estiramientos, Juego libre' });
      const mins = h('input', { class: 'input', type: 'number', min: 1, value: 10 });
      m = PA.modal('Bloque libre', h('div', null, h('label', { class: 'f', style: { marginTop: 0 } }, 'Nombre'), name, h('label', { class: 'f' }, 'Minutos'), mins,
        h('div', { class: 'row end' }, PA.btn('plus', 'Agregar', 'primary', () => {
          if (!name.value.trim()) { name.focus(); return; }
          s.blocks.push({ id: PA.uid(), exId: null, title: name.value.trim(), min: Number(mins.value) || 10, notes: '' }); touch(); paintBlocks(); m.close();
        }))));
      setTimeout(() => name.focus(), 50);
    };

    root.append(
      h('div', { class: 'card' },
        h('div', { class: 'two' }, h('div', null, h('label', { class: 'f', style: { marginTop: 0 } }, 'Fecha'), date),
          h('div', null, h('label', { class: 'f', style: { marginTop: 0 } }, 'Nombre'), title)),
        h('label', { class: 'f' }, 'Objetivo'), objective),
      h('div', { class: 'row between', style: { margin: '6px 2px 10px' } }, h('h3', { class: 'sec', style: { margin: 0 } }, 'Plan de la sesión'), totalLbl),
      blocksBox,
      h('div', { class: 'row', style: { marginTop: '14px' } },
        PA.btn('plus', 'Ejercicio de la biblioteca', 'primary', pick),
        PA.btn('plus', 'Bloque libre', '', addFree)),
      h('div', { style: { height: '6px' } }), tag,
      h('div', { class: 'card', style: { marginTop: '14px' } },
        h('div', { class: 'row' },
          PA.btn('clipboard', 'Tomar lista de este día', 'sm', async () => { await saveNow(); PA.state.attDate = s.date; PA.setTab('attendance'); }),
          PA.btn('copy', 'Copiar plan', 'sm', () => PA.copyText(planText())),
          PA.btn('copy', 'Duplicar', 'sm', async () => {
            await saveNow();
            const c = JSON.parse(JSON.stringify(s)); c.id = PA.uid(); c.title = (s.title || 'Entrenamiento') + ' (copia)'; c.blocks.forEach((b) => (b.id = PA.uid()));
            await PA.db.put('sessions', c); PA.toast('Sesión duplicada'); PA.nav.stack = []; PA.nav.tab = 'sessions'; PA.render();
          }),
          exists ? PA.btn('trash', 'Borrar', 'sm danger', async () => {
            if (await PA.confirm('Se borrará esta sesión.', { danger: true, ok: 'Borrar', title: 'Borrar sesión' })) {
              dirty = false; await PA.db.del('sessions', s.id); PA.toast('Sesión borrada'); PA.nav.stack = []; PA.nav.tab = 'sessions'; PA.render();
            }
          }) : null)));
    paintBlocks();
    if (!exists) { title.focus && setTimeout(() => title.focus(), 60); }
  }
})();
