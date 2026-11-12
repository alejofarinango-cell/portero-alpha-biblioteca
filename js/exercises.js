/* Ejercicios: biblioteca por niveles, detalle, editor y actualización por internet */
(function () {
  'use strict';
  const PA = window.PA, h = PA.h;

  /* ---------- actualizar la biblioteca cuando hay internet ---------- */
  PA.syncLibrary = async function (force) {
    try {
      let res = null, fromCache = false, lib = null;
      // 1) la biblioteca en línea (la que yo actualizo cada semana); 2) la que viene dentro de la app
      if (PA.LIB_URL && navigator.onLine !== false) {
        try {
          const r = await fetch(PA.LIB_URL + '?ts=' + Date.now(), { cache: 'no-store' });
          if (r.ok) { const j = await r.json(); if (j && Array.isArray(j.exercises)) lib = j; }
        } catch (e) { /* sin internet: se usa la local */ }
      }
      if (!lib) {
        res = await fetch('library.json?ts=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return { error: true };
        fromCache = res.headers.get('X-From-Cache') === '1'; // respuesta guardada: no hay internet de verdad
        lib = await res.json();
      }
      if (!lib || !Array.isArray(lib.exercises)) return { error: true };
      const meta = await PA.db.get('meta', 'libVersion');
      const have = meta ? meta.value : 0;
      if (fromCache && have) return { error: true };
      if (!fromCache) await PA.db.put('meta', { key: 'libChecked', value: Date.now() });
      if (!force && lib.version <= have) return { updated: false, version: have };
      const existing = (await PA.db.all('exercises')).filter((e) => e.source === 'lib');
      const oldIds = new Set(existing.map((e) => e.id));
      const newIds = new Set(lib.exercises.map((e) => e.id));
      for (const e of existing) if (!newIds.has(e.id)) await PA.db.del('exercises', e.id);
      await PA.db.putMany('exercises', lib.exercises);
      await PA.db.put('meta', { key: 'libVersion', value: lib.version });
      await PA.db.put('meta', { key: 'libUpdated', value: Date.now() });
      return { updated: true, version: lib.version, count: lib.exercises.length, added: lib.exercises.filter((e) => !oldIds.has(e.id)).length };
    } catch (e) { return { error: true }; }
  };

  const F = (PA.state.exFilter = PA.state.exFilter || { lv: 'all', cat: 'all', q: '' });

  /* ---------- lista ---------- */
  PA.views.exercises = async function (root) {
    const all = await PA.db.all('exercises');
    const vMeta = await PA.db.get('meta', 'libVersion');
    const cMeta = await PA.db.get('meta', 'libChecked');
    const list = h('div', { class: 'list' });

    const chipDefs = [['all', 'Todos'], [1, 'Nivel 1'], [2, 'Nivel 2'], [3, 'Nivel 3'], ['mine', 'Míos']];
    const chips = h('div', { class: 'chips' }, chipDefs.map(([k, l]) =>
      h('button', { class: 'chip' + (k === F.lv ? ' on' : ''), onclick: (e) => {
        F.lv = k; chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); e.currentTarget.classList.add('on'); paint();
      } }, l)));
    const catSel = h('select', { class: 'input', onchange: (e) => { F.cat = e.target.value; paint(); } },
      h('option', { value: 'all' }, 'Todas las categorías'), PA.CATS.map((c) => h('option', { value: c }, c)));
    catSel.value = F.cat;
    const search = h('div', { class: 'search' }, PA.icon('search', 18), h('input', { type: 'search', class: 'input', placeholder: 'Buscar ejercicio…', value: F.q, oninput: (e) => { F.q = e.target.value.toLowerCase(); paint(); } }));

    function paint() {
      list.replaceChildren();
      const rows = all
        .filter((e) => F.lv === 'all' || (F.lv === 'mine' ? e.source === 'mine' : e.level === F.lv))
        .filter((e) => F.cat === 'all' || e.cat === F.cat)
        .filter((e) => !F.q || (e.title + ' ' + (e.obj || '') + ' ' + e.cat).toLowerCase().includes(F.q))
        .sort((a, b) => (a.level - b.level) || a.title.localeCompare(b.title, 'es'));
      if (!rows.length) {
        list.append(PA.empty('field', all.length ? 'No hay ejercicios con ese filtro.' : 'Todavía no se cargó la biblioteca. Conéctate a internet una vez y toca “Actualizar”.'));
        return;
      }
      rows.forEach((e) => {
        list.append(h('div', { class: 'item', onclick: () => PA.openExercise(e) },
          PA.thumb(e.scene, 168),
          h('div', { class: 'grow' },
            h('div', { class: 't' }, e.title),
            h('div', { style: { margin: '4px 0 2px' } },
              h('span', { class: 'badge l' + e.level }, PA.LEVEL_SHORT[e.level]),
              e.source === 'mine' ? h('span', { class: 'badge mine' }, 'Mío') : null,
              h('span', { class: 'badge' }, PA.icon('clock', 12), e.min + ' min')),
            h('div', { class: 's' }, e.cat)),
          PA.icon('chevR', 18)));
      });
    }

    const status = h('div', { class: 'muted small grow' },
      vMeta ? 'Biblioteca v' + vMeta.value + ' · ' + all.filter((e) => e.source === 'lib').length + ' ejercicios'
        + (cMeta ? ' · revisada ' + new Date(cMeta.value).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '') : 'Biblioteca sin cargar');
    const updBtn = h('button', { class: 'btn sm', onclick: async () => {
      updBtn.disabled = true; updBtn.querySelector('.ic').style.animation = 'spin .8s linear infinite';
      const r = await PA.syncLibrary(false);
      if (r.error) PA.toast('Sin conexión: se usará la biblioteca guardada');
      else if (r.updated) PA.toast('Biblioteca actualizada ✓ (' + PA.plural(r.added, 'ejercicio nuevo', 'ejercicios nuevos') + ')');
      else PA.toast('Ya tienes la biblioteca más reciente ✓');
      PA.render();
    } }, PA.icon('refresh', 16), 'Actualizar');

    root.append(h('div', { class: 'row' }, status, updBtn), h('div', { style: { height: '8px' } }), search, h('div', { style: { height: '8px' } }), chips, catSel, h('div', { style: { height: '10px' } }), list,
      h('button', { class: 'fab', onclick: () => PA.editExercise(null) }, PA.icon('plus', 20), 'Crear ejercicio'));
    PA.stagger(list);
    paint();
  };

  PA.openExercise = (ex) => PA.push(ex.title, (root) => renderDetail(root, ex));
  PA.editExercise = (ex) => PA.push(ex ? 'Editar ejercicio' : 'Nuevo ejercicio', (root) => renderEditor(root, ex));

  /* ---------- detalle ---------- */
  async function renderDetail(root, ex) {
    const holder = h('div');
    root.append(
      h('div', { class: 'row', style: { marginBottom: '10px' } },
        h('span', { class: 'badge l' + ex.level }, PA.LEVELS[ex.level]), h('span', { class: 'badge' }, ex.cat), h('span', { class: 'badge' }, PA.icon('clock', 12), ex.min + ' min'),
        ex.source === 'mine' ? h('span', { class: 'badge mine' }, 'Mío') : null),
      holder);
    const board = PA.createBoard(holder, ex.scene, { readOnly: true });
    PA.cleanup = () => board.destroy();

    const secIc = { Objetivo: 'sparkle', 'Cómo se hace': 'list', Material: 'field', 'Claves para el entrenador': 'shield' };
    const sec = (t, body) => (body ? h('div', { class: 'card' }, h('h3', null, PA.icon(secIc[t] || 'list', 19), t), h('div', { class: 'steps' }, body)) : null);
    root.append(
      h('div', { style: { height: '12px' } }),
      h('div', { class: 'row' },
        PA.btn('plus', 'Agregar a una sesión', 'primary', () => PA.addExerciseToSession(ex)),
        ex.source === 'mine'
          ? PA.btn('edit', 'Editar', '', () => PA.editExercise(ex))
          : PA.btn('copy', 'Duplicar y editar', '', () => PA.editExercise(Object.assign({}, ex, { id: null, source: 'mine', title: ex.title + ' (copia)' }))),
        PA.btn('image', 'Imagen', '', async () => { const b = await board.toPNG(); PA.download(ex.title.replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]/g, '') + '.png', b); })),
      h('div', { style: { height: '12px' } }),
      sec('Objetivo', ex.obj), sec('Cómo se hace', ex.desc), sec('Material', ex.mat), sec('Claves para el entrenador', ex.keys),
      ex.source === 'mine' ? PA.btn('trash', 'Borrar ejercicio', 'danger', async () => {
        if (await PA.confirm('Se borrará este ejercicio de tu biblioteca.', { danger: true, ok: 'Borrar', title: 'Borrar ejercicio' })) {
          await PA.db.del('exercises', ex.id); PA.toast('Ejercicio borrado'); PA.pop();
        }
      }) : null);
  }

  /* ---------- editor ---------- */
  async function renderEditor(root, src) {
    const ex = Object.assign({ id: 'u-' + PA.uid(), source: 'mine', title: '', level: 1, cat: PA.CATS[0], min: 10, obj: '', desc: '', mat: '', keys: '', scene: PA.blankScene() }, src || {});
    if (!ex.id) ex.id = 'u-' + PA.uid();

    const f = {};
    const title = f.title = h('input', { class: 'input', value: ex.title, placeholder: 'Nombre del ejercicio' });
    const level = f.level = h('select', { class: 'input' }, [1, 2, 3].map((n) => h('option', { value: n }, PA.LEVELS[n]))); level.value = String(ex.level);
    const cat = f.cat = h('select', { class: 'input' }, PA.CATS.map((c) => h('option', { value: c }, c))); cat.value = ex.cat;
    const min = f.min = h('input', { class: 'input', type: 'number', min: 1, max: 90, value: ex.min });
    const obj = f.obj = h('textarea', { class: 'input', placeholder: '¿Para qué sirve este ejercicio?' }); obj.value = ex.obj || '';
    const desc = f.desc = h('textarea', { class: 'input', style: { minHeight: '130px' }, placeholder: '1. …\n2. …\n3. …' }); desc.value = ex.desc || '';
    const mat = f.mat = h('input', { class: 'input', value: ex.mat || '', placeholder: 'Conos, balones, arco…' });
    const keys = f.keys = h('textarea', { class: 'input', placeholder: 'Puntos clave que debes corregir o recordar' }); keys.value = ex.keys || '';

    const boardHost = h('div');
    const form = h('div', { class: 'card' },
      h('label', { class: 'f', style: { marginTop: 0 } }, 'Nombre'), title,
      h('div', { class: 'two' }, h('div', null, h('label', { class: 'f' }, 'Nivel'), level), h('div', null, h('label', { class: 'f' }, 'Minutos'), min)),
      h('label', { class: 'f' }, 'Categoría'), cat,
      h('label', { class: 'f' }, 'Objetivo'), obj,
      h('label', { class: 'f' }, 'Cómo se hace (paso a paso)'), desc,
      h('label', { class: 'f' }, 'Material'), mat,
      h('label', { class: 'f' }, 'Claves para el entrenador'), keys);

    root.append(h('div', { class: 'cols' }, h('div', null, h('h3', { class: 'sec', style: { margin: '0 0 10px' } }, 'Pizarra'), boardHost,
      h('div', { class: 'hint', style: { marginTop: '10px' } }, PA.icon('sparkle', 17), h('span', null, 'Para animar: coloca las fichas, toca el botón “+” de los cuadros y muévelas a su nueva posición. Dibuja flechas con las herramientas.'))), form));
    const bd = PA.createBoard(boardHost, ex.scene, {});
    PA.cleanup = () => bd.destroy();

    const collect = () => ({
      title: title.value.trim(), level: Number(level.value), cat: cat.value, min: Math.max(1, Number(min.value) || 10),
      obj: obj.value.trim(), desc: desc.value.trim(), mat: mat.value.trim(), keys: keys.value.trim(), scene: bd.getScene()
    });
    const initial = JSON.stringify(collect());
    PA.guard = async () => (JSON.stringify(collect()) === initial ? true : PA.confirm('Hiciste cambios que no se han guardado.', { ok: 'Salir sin guardar', danger: true, title: '¿Salir?' }));

    const save = async () => {
      const d = collect();
      if (!d.title) { PA.toast('Ponle un nombre al ejercicio'); title.focus(); return; }
      const rec = Object.assign({}, ex, d, { source: 'mine', updated: Date.now() });
      await PA.db.put('exercises', rec);
      PA.guard = null;
      PA.toast('Ejercicio guardado ✓');
      PA.nav.stack = []; PA.nav.tab = 'exercises';
      await PA.render();
      PA.openExercise(rec);
    };
    root.append(h('div', { class: 'row end' }, PA.btn('check', 'Guardar ejercicio', 'primary', save)));
  }
})();
