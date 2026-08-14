/* SOL-Noten – Service Worker: macht die App vollständig offline nutzbar. */
var CACHE = 'sol-noten-v0.49.3';
var FILES = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/calc.js',
  'js/cryptobox.js',
  'js/importer.js',
  'js/xlsxwrite.js',
  'js/photo.js',
  'js/quarters.js',
  'js/share.js',
  'js/store.js',
  'js/ui.js',
  'js/demo.js',
  'js/help.js',
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
        /* 'share-inbox' parkt eine gerade hereingeteilte Datei und darf beim
           Versionswechsel nicht mitgelöscht werden. */
        if (k !== CACHE && k !== 'share-inbox') return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  /* Nur eigene Dateien cachen; API-Aufrufe (Ferien) gehen direkt ins Netz. */
  if (url.origin !== location.origin) return;

  /* Teilen-Ziel (Web Share Target, Android): Das System schickt die geteilte
     Datei als POST an ./share-import. Der Inhalt wird kurz im Cache geparkt
     und die App mit ?shared=1 geöffnet; app.js holt ihn dort ab und startet
     die Import-Vorschau. Redirect 303 verhindert, dass ein Neuladen den
     POST wiederholt. */
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-import')) {
    e.respondWith((function () {
      return e.request.formData().then(function (fd) {
        var file = fd.get('file');
        if (!file) return Response.redirect('./', 303);
        return file.text().then(function (text) {
          return caches.open('share-inbox').then(function (c) {
            return c.put('./shared-file', new Response(text, {
              headers: { 'Content-Type': 'text/plain', 'X-File-Name': encodeURIComponent(file.name || '') }
            }));
          });
        }).then(function () {
          return Response.redirect('./?shared=1', 303);
        });
      }).catch(function () { return Response.redirect('./', 303); });
    })());
    return;
  }

  if (e.request.method !== 'GET') return;

  /* Das Manifest netz-zuerst: Chrome liest es bei der Installation, und ein
     WebAPK wird mit genau dem Stand gebaut, den es dabei bekommt. Aus dem
     Cache bedient könnte eine Neuinstallation sonst ein altes Manifest ohne
     Teilen-Ziel erwischen. Offline fällt es auf den Cache zurück. */
  if (url.pathname.endsWith('manifest.webmanifest')) {
    e.respondWith(
      fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return resp;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (resp) {
        return resp;
      });
    })
  );
});
