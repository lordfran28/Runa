/* Keeps Runa readable without a connection. Entries are fetched by fingerprint, so a stored one never goes
   stale; the page and the list of entries are fetched fresh whenever there is a connection. */
var V = "runa-3";
var CORE = ["./", "index.html", "assets/runa.js", "assets/voice-key.json", "assets/voice-check.locked", "manifest.webmanifest", "assets/vines-light.jpg", "assets/vines-dark.jpg", "assets/fonts/gothic-letters.woff",
  "assets/fonts/eb-garamond-latin-wght-normal.woff2", "assets/fonts/eb-garamond-latin-wght-italic.woff2",
  "assets/fonts/im-fell-french-canon-latin-400-normal.woff2", "assets/fonts/im-fell-french-canon-latin-400-italic.woff2"];
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE); }).catch(function () {}));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.clients.claim(); }));
});
function fresh(req, key) {
  return fetch(req).then(function (r) {
    if (r.ok) { var c = r.clone(); caches.open(V).then(function (cc) { cc.put(key, c); }); }
    return r;
  }, function () { return caches.match(key).then(function (m) { return m || Response.error(); }); });
}
self.addEventListener("fetch", function (e) {
  var req = e.request, u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== location.origin || u.pathname.indexOf(new URL("./", location).pathname) !== 0) return;
  if (/\/data\/[^/]+\.locked$/.test(u.pathname) && u.searchParams.get("h")) {
    e.respondWith(caches.match(req).then(function (m) {
      return m || fetch(req).then(function (r) { if (r.ok) { var c = r.clone(); caches.open(V).then(function (cc) { cc.put(req, c); }); } return r; });
    }));
    return;
  }
  var key = new Request(u.origin + u.pathname);
  if (req.mode === "navigate" || /\/(index\.html)?$/.test(u.pathname) || /\/data\/index\.json$/.test(u.pathname) || /\.(js|json|locked|webmanifest)$/.test(u.pathname)) {
    e.respondWith(fresh(req, req.mode === "navigate" ? new Request(new URL("./", location).href) : key));
    return;
  }
  e.respondWith(caches.match(key).then(function (m) { return m || fresh(req, key); }));
});
