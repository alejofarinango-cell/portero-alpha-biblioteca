/* Alumnos: fichas con foto */
(function () {
  'use strict';
  const PA = window.PA, h = PA.h;

  PA.views.students = async function (root) {
    const students = await PA.db.all('students');
    const stats = await PA.attStats();
    let q = '', lv = 'all', showOld = false;

    const list = h('div', { class: 'list' });
    const search = h('div', { class: 'search' }, PA.icon('search', 18), h('input', { type: 'search', class: 'input', placeholder: 'Buscar alumno…', oninput: (e) => { q = e.target.value.toLowerCase(); paint(); } }));
    const chipDefs = [['all', 'Todos'], [1, 'Iniciación'], [2, 'Intermedio'], [3, 'Avanzado']];
    const chips = h('div', { class: 'chips' }, chipDefs.map(([k, l]) =>
      h('button', { class: 'chip' + (k === lv ? ' on' : ''), onclick: (e) => {
        lv = k; chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('on'));
        e.currentTarget.classList.add('on'); paint();
      } }, l)));

    function paint() {
      list.replaceChildren();
      const rows = students
        .filter((s) => (showOld ? true : s.activo !== false))
        .filter((s) => lv === 'all' || s.nivel === lv)
        .filter((s) => !q || s.nombre.toLowerCase().includes(q))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      if (!rows.length) {
        list.append(PA.empty('users', students.length ? 'No hay alumnos con ese filtro.' : 'Aún no tienes alumnos. Agrega el primero con el botón de abajo.'));
        return;
      }
      rows.forEach((s) => {
        const st = stats[s.id];
        const age = PA.age(s.nacimiento);
        list.append(h('div', { class: 'item', onclick: () => PA.studentForm(s, () => PA.render()) },
          PA.avatar(s, 52),
          h('div', { class: 'grow' },
            h('div', { class: 't' }, s.nombre, s.activo === false ? h('span', { class: 'badge', style: { marginLeft: '6px' } }, 'inactivo') : null),
            h('div', { class: 's' }, [s.nivel ? PA.LEVEL_SHORT[s.nivel] : 'Sin nivel', age != null ? age + ' años' : null].filter(Boolean).join(' · '))),
          PA.ring(st && st.pct != null ? st.pct : null, 44, 4)));
      });
    }

    root.append(
      h('div', { class: 'row between' },
        h('div', { class: 'muted small' }, PA.plural(students.filter((s) => s.activo !== false).length, 'alumno activo', 'alumnos activos')),
        h('label', { class: 'small muted row', style: { gap: '6px', cursor: 'pointer' } },
          h('input', { type: 'checkbox', onchange: (e) => { showOld = e.target.checked; paint(); } }), 'ver inactivos')),
      h('div', { style: { height: '8px' } }), search, h('div', { style: { height: '8px' } }), chips, list,
      h('button', { class: 'fab', onclick: () => PA.studentForm(null, () => PA.render()) }, PA.icon('userPlus', 20), 'Nuevo alumno'));
    PA.stagger(list);
    paint();
  };

  /* Formulario de ficha del alumno (ventana emergente) */
  PA.studentForm = async function (student, onSaved) {
    const isNew = !student;
    const s = Object.assign({ id: PA.uid(), nombre: '', nacimiento: '', nivel: 1, representante: '', telefono: '', notas: '', foto: '', activo: true, creado: Date.now() }, student || {});
    const stats = isNew ? null : (await PA.attStats())[s.id];

    const preview = h('div');
    const paintPhoto = () => preview.replaceChildren(PA.avatar({ nombre: s.nombre || '?', foto: s.foto }, 96));
    paintPhoto();
    const onFile = async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try { s.foto = await PA.resizePhoto(f); paintPhoto(); } catch (err) { PA.toast('No se pudo leer la foto'); }
    };
    const camInput = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, onchange: onFile });
    const galInput = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: onFile });

    const nombre = h('input', { class: 'input', value: s.nombre, placeholder: 'Nombre y apellido', oninput: (e) => { s.nombre = e.target.value; if (!s.foto) paintPhoto(); } });
    const nac = h('input', { class: 'input', type: 'date', value: s.nacimiento, onchange: (e) => { s.nacimiento = e.target.value; } });
    const nivel = h('select', { class: 'input', onchange: (e) => { s.nivel = Number(e.target.value); } },
      [1, 2, 3].map((n) => h('option', { value: n }, PA.LEVELS[n])));
    nivel.value = String(s.nivel || 1);
    const rep = h('input', { class: 'input', value: s.representante, placeholder: 'Mamá, papá o representante', oninput: (e) => { s.representante = e.target.value; } });
    const tel = h('input', { class: 'input', type: 'tel', value: s.telefono, placeholder: 'Teléfono / WhatsApp', oninput: (e) => { s.telefono = e.target.value; } });
    const notas = h('textarea', { class: 'input', placeholder: 'Notas (lesiones, alergias, cosas a trabajar…)', oninput: (e) => { s.notas = e.target.value; } });
    notas.value = s.notas;
    const activo = h('input', { type: 'checkbox', checked: s.activo !== false, onchange: (e) => { s.activo = e.target.checked; } });

    let m;
    const save = async () => {
      s.nombre = s.nombre.trim();
      if (!s.nombre) { PA.toast('Escribe el nombre del alumno'); nombre.focus(); return; }
      await PA.db.put('students', s);
      m.close(); PA.toast('Alumno guardado ✓');
      if (onSaved) onSaved();
    };
    const remove = async () => {
      if (!(await PA.confirm('Se borrará la ficha de ' + s.nombre + ' y sus marcas de asistencia. Si solo dejó de venir, mejor desmarca "Alumno activo".', { danger: true, ok: 'Borrar', title: 'Borrar alumno' }))) return;
      await PA.db.del('students', s.id);
      const recs = await PA.db.all('attendance');
      for (const r of recs) if (r.marks && r.marks[s.id]) { delete r.marks[s.id]; await PA.db.put('attendance', r); }
      m.close(); PA.toast('Alumno borrado');
      if (onSaved) onSaved();
    };

    const body = h('div', null,
      h('div', { class: 'row', style: { gap: '14px' } }, preview,
        h('div', { class: 'stack grow' },
          PA.btn('camera', 'Tomar foto', 'block', () => camInput.click()),
          PA.btn('image', 'Elegir de la galería', 'block', () => galInput.click())),
        camInput, galInput),
      h('label', { class: 'f' }, 'Nombre'), nombre,
      h('div', { class: 'two' },
        h('div', null, h('label', { class: 'f' }, 'Fecha de nacimiento'), nac),
        h('div', null, h('label', { class: 'f' }, 'Nivel'), nivel)),
      h('label', { class: 'f' }, 'Representante'), rep,
      h('label', { class: 'f' }, 'Teléfono'), tel,
      h('label', { class: 'f' }, 'Notas'), notas,
      h('label', { class: 'row', style: { margin: '14px 0 8px', gap: '10px' } }, activo, 'Alumno activo'),
      stats && stats.total ? h('div', { class: 'hint' }, PA.icon('chart', 17), h('span', null,
        'Asistencia: ' + stats.pct + '% · ' + PA.plural(stats.p, 'presente', 'presentes') + ', ' + PA.plural(stats.t, 'tarde', 'tardes') + ', ' + PA.plural(stats.a, 'ausencia', 'ausencias'))) : null,
      h('div', { class: 'row between', style: { marginTop: '14px' } },
        isNew ? h('span') : PA.btn('trash', 'Borrar', 'danger', remove),
        PA.btn('check', 'Guardar', 'primary', save)));
    m = PA.modal(isNew ? 'Nuevo alumno' : 'Ficha del alumno', body);
  };
})();
