/* Inicio y Ajustes (respaldo, restaurar, actualizar biblioteca) */
(function () {
  'use strict';
  const PA = window.PA, h = PA.h;

  PA.views.home = async function (root) {
    const [students, sessions, exercises, att] = await Promise.all([
      PA.db.all('students'), PA.db.all('sessions'), PA.db.all('exercises'), PA.db.all('attendance')]);
    const today = PA.todayStr();
    const active = students.filter((s) => s.activo !== false);
    const next = sessions.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const todayAtt = att.find((r) => r.date === today);
    const markedToday = todayAtt ? Object.keys(todayAtt.marks).length : 0;

    // promedio de asistencia de los últimos 30 días
    const lim = new Date(); lim.setDate(lim.getDate() - 30);
    const limStr = lim.getFullYear() + '-' + String(lim.getMonth() + 1).padStart(2, '0') + '-' + String(lim.getDate()).padStart(2, '0');
    let p = 0, tot = 0;
    att.filter((r) => r.date >= limStr).forEach((r) => Object.values(r.marks).forEach((v) => { tot++; if (v !== 'A') p++; }));
    const avg = tot ? Math.round((p / tot) * 100) : null;

    const numA = h('div', { class: 'big' }, '0');
    root.append(
      h('div', { class: 'hero' },
        h('img', { class: 'logo', src: 'icons/icon-192.png', alt: '' }),
        h('div', { class: 'small', style: { marginTop: '12px', color: '#a9c3f5' } }, PA.fmtDateLong(today)),
        h('h2', null, 'Portero Alpha Academy'),
        h('div', { class: 'row', style: { marginTop: '14px' } },
          PA.btn('clipboard', 'Tomar lista', 'primary', () => PA.setTab('attendance')),
          PA.btn('field', 'Ver ejercicios', '', () => PA.setTab('exercises')))),
      h('div', { class: 'two', style: { marginBottom: '12px' } },
        h('div', { class: 'card stat', onclick: () => PA.setTab('students') }, h('div', { class: 'chip-ic' }, PA.icon('users', 24)),
          h('div', null, numA, h('div', { class: 'muted small', style: { marginTop: '4px' } }, active.length === 1 ? 'alumno activo' : 'alumnos activos'))),
        h('div', { class: 'card stat', onclick: () => PA.setTab('attendance') }, PA.ring(avg, 54, 5),
          h('div', null, h('div', { style: { fontWeight: 800, fontSize: '16px' } }, 'Asistencia'), h('div', { class: 'muted small', style: { marginTop: '2px' } }, avg == null ? 'sin registros aún' : 'últimos 30 días')))),
      h('div', { class: 'card' }, h('h3', null, PA.icon('calendar', 19), 'Próxima sesión'),
        next
          ? h('div', { class: 'item', onclick: () => PA.editSession(next) },
            h('div', { class: 'grow' }, h('div', { class: 't' }, next.title || 'Entrenamiento'),
              h('div', { class: 's' }, PA.fmtDate(next.date) + ' · ' + PA.plural((next.blocks || []).length, 'bloque', 'bloques'))),
            h('span', { class: 'badge ' + (next.date === today ? 'l1' : 'mine') }, next.date === today ? 'Hoy' : 'Próxima'), PA.icon('chevR', 18))
          : h('div', null, h('p', { class: 'muted' }, 'No tienes sesiones planificadas.'),
            h('div', { class: 'row', style: { marginTop: '12px' } }, PA.btn('plus', 'Crear una sesión', 'sm primary', () => PA.editSession(null))))),
      markedToday ? h('div', { class: 'hint' }, PA.icon('check', 17), h('span', null, 'Hoy ya marcaste a ' + PA.plural(markedToday, 'alumno', 'alumnos') + ' en la lista.')) : null,
      !students.length ? h('div', { class: 'card', style: { marginTop: '12px' } }, h('h3', null, PA.icon('sparkle', 19), 'Para empezar'),
        h('p', { class: 'muted' }, 'Agrega a tus alumnos con su foto y luego toma lista en cada entrenamiento.'),
        h('div', { class: 'row end' }, PA.btn('userPlus', 'Agregar primer alumno', 'primary', () => PA.studentForm(null, () => PA.setTab('students'))))) : null,
      installCard(),
      h('div', { class: 'muted small', style: { textAlign: 'center', marginTop: '18px' } }, PA.plural(exercises.length, 'ejercicio', 'ejercicios') + ' en tu biblioteca · v' + PA.VERSION));
    PA.countUp(numA, active.length);
  };

  function installCard() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) return null;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return h('div', { class: 'card', style: { marginTop: '12px' } }, h('h3', null, PA.icon('phone', 19), 'Instalar la app'),
      PA.installEvent
        ? h('div', null, h('p', { class: 'muted small' }, 'Instálala para abrirla como una app y usarla sin internet.'),
          h('div', { class: 'row end' }, PA.btn('download', 'Instalar', 'primary', async () => { PA.installEvent.prompt(); await PA.installEvent.userChoice; PA.installEvent = null; PA.render(); })))
        : h('p', { class: 'muted small' }, ios
          ? 'En iPhone/iPad: toca el botón Compartir de Safari y elige “Añadir a pantalla de inicio”.'
          : 'En el menú del navegador elige “Instalar app” o “Añadir a pantalla de inicio”.'));
  }

  /* ---------- Ajustes ---------- */
  PA.views.settings = async function (root) {
    const counts = {};
    for (const s of ['students', 'attendance', 'sessions', 'exercises']) counts[s] = (await PA.db.all(s)).length;
    const mine = (await PA.db.all('exercises')).filter((e) => e.source === 'mine').length;
    const vMeta = await PA.db.get('meta', 'libVersion');
    const lastBackup = await PA.db.get('meta', 'lastBackup');

    const restoreInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (data.app !== 'portero-alpha') throw new Error('formato');
        if (!(await PA.confirm('Se agregarán o reemplazarán los datos del respaldo (' + (data.students || []).length + ' alumnos, ' + (data.sessions || []).length + ' sesiones, ' + (data.attendance || []).length + ' días de asistencia). Lo que ya tienes y no está en el respaldo se conserva.', { ok: 'Restaurar', title: 'Restaurar respaldo' }))) return;
        await PA.db.putMany('students', data.students || []);
        await PA.db.putMany('attendance', data.attendance || []);
        await PA.db.putMany('sessions', data.sessions || []);
        await PA.db.putMany('exercises', (data.exercises || []).map((x) => Object.assign({}, x, { source: 'mine' })));
        PA.toast('Respaldo restaurado ✓'); PA.render();
      } catch (err) { PA.toast('Ese archivo no es un respaldo válido'); }
    } });

    const row = (ic, title, body, ...extra) => h('div', { class: 'card' }, h('div', { class: 'setrow' }, h('div', { class: 'chip-ic' }, PA.icon(ic, 21)),
      h('div', { class: 'grow' }, h('h3', { style: { marginBottom: '4px' } }, title), body, ...extra)));
    root.append(
      row('download', 'Respaldo de tus datos',
        h('p', { class: 'muted small' }, 'Tus datos viven en este aparato. Descarga un respaldo cada cierto tiempo, y úsalo también para pasar tu información a otro celular o tablet.'),
        h('div', { class: 'row', style: { marginTop: '12px' } },
          PA.btn('download', 'Descargar', 'primary sm', backup),
          PA.btn('upload', 'Restaurar', 'sm', () => restoreInput.click()), restoreInput),
        h('div', { class: 'muted small', style: { marginTop: '10px' } }, lastBackup ? 'Último respaldo: ' + new Date(lastBackup.value).toLocaleString('es') : 'Aún no has descargado ningún respaldo.')),
      row('book', 'Biblioteca de ejercicios',
        h('p', { class: 'muted small' }, 'Versión ' + (vMeta ? vMeta.value : '—') + '. Cuando tienes internet, la app busca ejercicios nuevos sola. También puedes buscarlos ahora.'),
        h('div', { class: 'row', style: { marginTop: '12px' } }, PA.btn('refresh', 'Buscar actualizaciones', 'sm', async () => {
          const r = await PA.syncLibrary(false);
          PA.toast(r.error ? 'Sin conexión por ahora' : r.updated ? 'Biblioteca actualizada ✓' : 'Ya tienes la versión más reciente ✓'); PA.render();
        }))),
      row('chart', 'Resumen de datos',
        h('div', { class: 'muted small' }, counts.students + ' alumnos · ' + counts.attendance + ' días de asistencia · ' + counts.sessions + ' sesiones · ' + mine + ' ejercicios propios')),
      row('alert', 'Zona delicada',
        h('p', { class: 'muted small' }, 'Borra todo lo que hay en este aparato (alumnos, asistencia, sesiones y tus ejercicios). La biblioteca oficial se vuelve a cargar.'),
        h('div', { class: 'row', style: { marginTop: '12px' } }, PA.btn('trash', 'Borrar todos los datos', 'danger sm', async () => {
          if (!(await PA.confirm('Se borrarán TODOS tus datos de este aparato. Si no tienes un respaldo, no se podrán recuperar.', { danger: true, ok: 'Borrar todo', title: 'Borrar todo' }))) return;
          for (const st of ['students', 'attendance', 'sessions', 'exercises', 'meta']) await PA.db.clear(st);
          await PA.syncLibrary(true); PA.toast('Datos borrados'); PA.setTab('home');
        }))),
      h('div', { class: 'muted small', style: { textAlign: 'center' } }, 'Portero Alpha Academy · versión ' + PA.VERSION));
  };

  async function backup() {
    const data = {
      app: 'portero-alpha', v: 1, exportedAt: new Date().toISOString(),
      students: await PA.db.all('students'), attendance: await PA.db.all('attendance'), sessions: await PA.db.all('sessions'),
      exercises: (await PA.db.all('exercises')).filter((e) => e.source === 'mine')
    };
    const d = PA.todayStr();
    PA.download('respaldo-portero-alpha-' + d + '.json', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    await PA.db.put('meta', { key: 'lastBackup', value: Date.now() });
    PA.toast('Respaldo descargado ✓'); PA.render();
  }
})();
