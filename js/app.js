/* Arranque de la app */
(function () {
  'use strict';
  const PA = window.PA;

  /* íconos fijos del encabezado y de la barra inferior */
  document.getElementById('backBtn').append(PA.icon('chevL', 22));
  document.getElementById('gearBtn').append(PA.icon('sliders', 20));
  document.querySelectorAll('#tabs .ti').forEach((el) => el.replaceWith(PA.icon(el.dataset.ic, 23)));

  /* navegación con aviso si hay cambios sin guardar */
  async function canLeave() {
    if (!PA.guard) return true;
    const ok = await PA.guard();
    if (ok) PA.guard = null;
    return ok;
  }
  document.getElementById('backBtn').addEventListener('click', async () => { if (await canLeave()) PA.pop(); });
  document.getElementById('gearBtn').addEventListener('click', async () => { if (await canLeave()) PA.push('Ajustes', PA.views.settings); });
  document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', async () => { if (await canLeave()) PA.setTab(b.dataset.tab); }));

  /* indicador de conexión */
  const pill = document.getElementById('netPill');
  function net() {
    const on = navigator.onLine;
    pill.textContent = on ? 'en línea' : 'sin internet';
    pill.className = 'pill ' + (on ? 'on' : 'off');
  }
  window.addEventListener('online', async () => {
    net();
    const r = await PA.syncLibrary(false);
    if (r.updated) PA.toast('Biblioteca actualizada: ' + PA.plural(r.added, 'ejercicio nuevo', 'ejercicios nuevos') + ' ✓');
    if (r.updated && PA.nav.tab === 'exercises' && !PA.nav.stack.length) PA.render();
  });
  window.addEventListener('offline', net);
  net();

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); PA.installEvent = e; if (PA.nav.tab === 'home' && !PA.nav.stack.length) PA.render(); });

  async function boot() {
    try {
      await PA.db.open();
    } catch (e) {
      document.getElementById('view').replaceChildren(PA.h('div', { class: 'page' },
        PA.empty('alert', 'Este navegador no deja guardar datos (¿modo privado?). Ábrelo en una ventana normal.')));
      return;
    }
    // pedirle al navegador que no borre los datos si se acaba el espacio
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ok */ }

    // primera vez: cargar la biblioteca guardada con la app (no necesita internet si ya se instaló)
    const have = await PA.db.get('meta', 'libVersion');
    const r = await PA.syncLibrary(false);
    if (!have && r.error) PA.toast('Conéctate una vez a internet para cargar la biblioteca', 4000);
    await PA.render();

    if (have && r.updated) PA.toast('Biblioteca actualizada: ' + PA.plural(r.added, 'ejercicio nuevo', 'ejercicios nuevos') + ' ✓', 3500);

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (nw) nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) PA.toast('Hay una versión nueva de la app. Ciérrala y ábrela otra vez.', 5000);
          });
        });
      }).catch(() => { /* sin modo sin conexión en este entorno */ });
    }
  }
  boot();
})();
