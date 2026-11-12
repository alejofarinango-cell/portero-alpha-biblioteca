/* Asistencia: tomar lista */
(function () {
  'use strict';
  const PA = window.PA, h = PA.h;

  PA.views.attendance = async function (root) {
    let date = PA.state.attDate || PA.todayStr();
    PA.state.attDate = null;
    const students = (await PA.db.all('students')).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    let rec, all;

    async function load() {
      rec = (await PA.db.get('attendance', date)) || { date, title: '', marks: {} };
      all = (await PA.db.all('attendance')).filter((r) => Object.keys(r.marks).length || r.title).sort((a, b) => b.date.localeCompare(a.date));
    }
    async function persist() {
      if (Object.keys(rec.marks).length || (rec.title && rec.title.trim())) await PA.db.put('attendance', rec);
      else await PA.db.del('attendance', date);
    }
    const rowsForDate = () => students.filter((s) => s.activo !== false || rec.marks[s.id]);

    /* ---- partes fijas de la pantalla (no se vuelven a crear al marcar) ---- */
    const dateInput = h('input', { class: 'input', type: 'date', value: date, onchange: async (e) => {
      if (!e.target.value) return;
      date = e.target.value; await load(); titleInput.value = rec.title || ''; dateLbl.textContent = PA.fmtDateLong(date); paintList(); paintHistory();
    } });
    const titleInput = h('input', { class: 'input', placeholder: 'Ej: Salidas', value: '',
      oninput: PA.debounce(async (e) => { rec.title = e.target.value; await persist(); await load(); paintHistory(); }, 400) });
    const dateLbl = h('div', { class: 'muted small', style: { marginTop: '8px' } }, PA.fmtDateLong(date));
    const mP = h('i', { class: 'p' }), mT = h('i', { class: 't' }), mA = h('i', { class: 'a' });
    const sumBox = h('div', { class: 'sum' });
    const listBox = h('div', { class: 'list' });
    const histBox = h('div', { class: 'list' });
    const toolsBox = h('div', { class: 'row', style: { margin: '12px 0' } });
    const meterBox = h('div', null, h('div', { class: 'meter' }, mP, mT, mA), sumBox);

    function updateSummary() {
      const rows = rowsForDate();
      const n = (k) => rows.filter((s) => rec.marks[s.id] === k).length;
      const p = n('P'), t = n('T'), a = n('A'), tot = rows.length || 1;
      mP.style.width = (p / tot * 100) + '%'; mT.style.width = (t / tot * 100) + '%'; mA.style.width = (a / tot * 100) + '%';
      sumBox.replaceChildren(
        h('span', { class: 'p' }, 'Presentes ' + p), h('span', { class: 't' }, 'Tardes ' + t),
        h('span', { class: 'a' }, 'Ausentes ' + a), h('span', null, 'Sin marcar ' + (rows.length - p - t - a)));
    }

    function paintRow(row, s) {
      const cur = rec.marks[s.id];
      row.className = 'att-row' + (cur ? ' ' + cur : '');
      row.querySelectorAll('.seg button').forEach((b) => {
        const on = b.dataset.k === cur;
        if (on && !b.classList.contains('on')) { b.classList.remove('on'); void b.offsetWidth; }
        b.classList.toggle('on', on);
      });
    }

    function paintList() {
      listBox.replaceChildren(); toolsBox.replaceChildren();
      const rows = rowsForDate();
      meterBox.hidden = !rows.length;
      if (!rows.length) {
        listBox.append(PA.empty('users', 'Primero agrega a tus alumnos para poder tomar lista.',
          h('div', { style: { marginTop: '14px' } }, PA.btn('userPlus', 'Ir a Alumnos', 'primary', () => PA.setTab('students')))));
        return;
      }
      toolsBox.append(
        PA.btn('check', 'Todos presentes', 'sm', async () => {
          rows.forEach((s) => { if (!rec.marks[s.id]) rec.marks[s.id] = 'P'; }); await persist(); await load(); refreshRows(); updateSummary(); paintHistory();
        }),
        PA.btn('copy', 'Copiar resumen', 'sm', summary),
        PA.btn('x', 'Limpiar', 'sm ghost', async () => {
          if (!Object.keys(rec.marks).length) return;
          if (await PA.confirm('Se quitarán todas las marcas de este día.', { ok: 'Limpiar', danger: true })) { rec.marks = {}; await persist(); await load(); refreshRows(); updateSummary(); paintHistory(); }
        }));
      rows.forEach((s) => {
        const row = h('div', { class: 'att-row', 'data-id': s.id });
        const mk = (k, icon, label) => h('button', { 'data-k': k, class: k, 'aria-label': label, onclick: async () => {
          if (rec.marks[s.id] === k) delete rec.marks[s.id]; else rec.marks[s.id] = k;
          paintRow(row, s); updateSummary(); await persist(); await load(); paintHistory();
        } }, PA.icon(icon, 21));
        row.append(PA.avatar(s, 44), h('div', { class: 'nm' }, s.nombre),
          h('div', { class: 'seg' }, mk('P', 'check', 'Presente'), mk('T', 'clock', 'Tarde'), mk('A', 'x', 'Ausente')));
        paintRow(row, s);
        listBox.append(row);
      });
      PA.stagger(listBox);
      updateSummary();
    }
    function refreshRows() {
      rowsForDate().forEach((s) => { const r = listBox.querySelector('[data-id="' + s.id + '"]'); if (r) paintRow(r, s); });
    }

    function paintHistory() {
      histBox.replaceChildren();
      if (!all.length) { histBox.append(h('div', { class: 'muted small' }, 'Cuando tomes lista, aquí verás los días anteriores.')); return; }
      all.slice(0, 30).forEach((r) => {
        const v = Object.values(r.marks);
        const p = v.filter((x) => x === 'P').length, t = v.filter((x) => x === 'T').length, a = v.filter((x) => x === 'A').length;
        const pct = v.length ? Math.round(((p + t) / v.length) * 100) : null;
        histBox.append(h('div', { class: 'item', onclick: async () => {
          date = r.date; await load(); dateInput.value = date; titleInput.value = rec.title || ''; dateLbl.textContent = PA.fmtDateLong(date);
          paintList(); paintHistory(); document.getElementById('view').scrollTo({ top: 0, behavior: 'smooth' });
        } },
          PA.ring(pct, 40, 4),
          h('div', { class: 'grow' }, h('div', { class: 't' }, PA.fmtDate(r.date) + (r.title ? ' · ' + r.title : '')),
            h('div', { class: 's' }, 'Presentes ' + p + ' · Tardes ' + t + ' · Ausentes ' + a)),
          r.date === date ? h('span', { class: 'badge mine' }, 'abierto') : null));
      });
    }

    function summary() {
      const rows = rowsForDate();
      const names = (k) => rows.filter((s) => rec.marks[s.id] === k).map((s) => s.nombre);
      const lines = ['Asistencia ' + PA.fmtDateLong(date) + (rec.title ? ' — ' + rec.title : '')];
      [['P', 'Presentes'], ['T', 'Llegaron tarde'], ['A', 'Ausentes']].forEach(([k, l]) => {
        const n = names(k); if (n.length) lines.push(l + ' (' + n.length + '): ' + n.join(', '));
      });
      const sin = rows.filter((s) => !rec.marks[s.id]).map((s) => s.nombre);
      if (sin.length) lines.push('Sin marcar: ' + sin.join(', '));
      PA.copyText(lines.join('\n'));
    }

    await load();
    titleInput.value = rec.title || '';
    root.append(
      h('div', { class: 'card' },
        h('div', { class: 'two' },
          h('div', null, h('label', { class: 'f', style: { marginTop: 0 } }, 'Fecha'), dateInput),
          h('div', null, h('label', { class: 'f', style: { marginTop: 0 } }, 'Entrenamiento'), titleInput)),
        dateLbl, meterBox),
      toolsBox, listBox,
      h('div', { class: 'hint', style: { marginTop: '12px' } }, PA.icon('sparkle', 17), h('span', null, 'Toca ✓ presente, el reloj para tarde o ✕ ausente. Se guarda solo, también sin internet.')),
      h('h3', { class: 'sec' }, 'Historial'), histBox);
    paintList(); paintHistory();
  };
})();
