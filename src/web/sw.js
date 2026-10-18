/* ==========================================================================
 *  CONSULENTE DIGITALE - Service worker dell'app per telefono (Android, iPhone) e tablet
 *  Usato SOLO dalla versione pubblicata sul sito (GitHub Pages), mai dal programma sul computer.
 *  Tiene una copia dei file dell'app per aprirla anche senza Internet; le notizie e i dizionari
 *  si chiedono prima alla rete (sempre aggiornati) e, se manca la rete, si usa l'ultima copia.
 *  Non raccoglie dati e non invia nulla: niente notifiche, niente tracciamento.
 *  Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
/* L'elenco FILE e la VERSIONE sono scritti da tools/prepara-pubblicazione.py */
var VERSIONE = "sviluppo";
var FILE = ["./", "index.html"];
var CASSA = "consulente-digitale-" + VERSIONE;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CASSA).then(function (c) { return c.addAll(FILE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n.indexOf("consulente-digitale-") === 0 && n !== CASSA; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

function dallaRete(req) {
  return fetch(req).then(function (r) {
    if (r && r.ok && r.type === "basic") { var copia = r.clone(); caches.open(CASSA).then(function (c) { c.put(req, copia); }); }
    return r;
  }).catch(function () { return caches.match(req, { ignoreSearch: true }); });
}

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;        // link esterni: il browser fa da sé
  if (/\.json$/.test(url.pathname) || req.mode === "navigate") { e.respondWith(dallaRete(req)); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (r) { return r || dallaRete(req); }));
});
