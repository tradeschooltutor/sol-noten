/* SOL-Noten – Service Worker: macht die App vollständig offline nutzbar. */
var CACHE = 'sol-noten-v0.9.0';
var FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/calc.js',
  'js/cryptobox.js',
  'js/importer.js',
  'js/xlsxwrite.js',
  'js/quarters.js',
  'js/store.js',
  'js/ui.js',
  'js/app.js',
  'icons/icon-192-v2.png',
  'icons/icon-512-v2.png',
  'icons/icon-512-maskable-v2.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  /* Nur eigene Dateien cachen; API-Aufrufe (Ferien) gehen direkt ins Netz. */
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (resp) {
        return resp;
      });
    })
  );
});
