/* Portero Alpha Academy — modo sin conexión.
   La línea VERSION la actualiza solo el script de empaquetado cuando cambia algún archivo. */
const VERSION = '8a0c153a';
const CACHE = 'portero-alpha-' + VERSION;
const SHELL = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest', 'library.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'js/config.js', 'js/core.js', 'js/icons.js', 'js/students.js', 'js/attendance.js', 'js/board.js', 'js/exercises.js', 'js/sessions.js', 'js/home.js', 'js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('portero-alpha-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // La biblioteca: primero internet (para tener lo más nuevo), y si no hay, la guardada.
  if (url.pathname.endsWith('/library.json')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('library.json', copy)); }
          return res;
        })
        .catch(() => caches.match('library.json').then((r) => (r
          ? new Response(r.body, { status: 200, headers: { 'Content-Type': 'application/json', 'X-From-Cache': '1' } })
          : Response.error()))));
    return;
  }

  // El resto de la app: primero lo guardado (rápido y sin internet).
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
