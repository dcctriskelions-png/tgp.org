/* Service worker: lets the site be installed and show a friendly page when offline.
   It never touches requests to Apps Script (member data always comes live from the server)
   and never stores pages whose address contains a login token. */
var CACHE = 'tgp-v1';
var SHELL = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png', '/gas-shim.js', '/session.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;       // Apps Script, CDNs, POSTs: not ours
  var cacheable = url.search.indexOf('token') === -1;
  e.respondWith(
    fetch(req).then(function (res) {
      if (cacheable && res.ok && !res.redirected) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('/offline.html') : Response.error());
      });
    })
  );
});
