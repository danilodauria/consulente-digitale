/* ==========================================================================
 *  CONSULENTE DIGITALE - Service worker dell'app per telefono (Android, iPhone) e tablet
 *  Usato SOLO dalla versione pubblicata sul sito (GitHub Pages), mai dal programma sul computer.
 *  Tiene una copia dei file dell'app per aprirla anche senza Internet; le notizie e i dizionari
 *  si chiedono prima alla rete (sempre aggiornati) e, se manca la rete, si usa l'ultima copia.
 *  Non raccoglie dati e non invia nulla: niente notifiche, niente tracciamento.
 *  Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
/* L'elenco FILE e la VERSIONE sono scritti da tools/prepara-pubblicazione.py */
var VERSIONE = "1.5.0";
var FILE = ["./", "css/app.css", "css/cervello.css", "css/pagine.css", "css/stampa.css", "dati/programmi.json", "i18n/de.json", "i18n/en.json", "i18n/es.json", "i18n/fr.json", "i18n/ro.json", "img/apple-touch-icon.png", "img/icona-192.png", "img/icona-512.png", "img/icona-maskable-512.png", "img/logo-piccolo.svg", "img/logo.svg", "index.html", "js/acquisti.js", "js/aggiornamenti.js", "js/analisi.js", "js/antivirus.js", "js/aperture.js", "js/avvio.js", "js/backup.js", "js/benvenuto.js", "js/cerca.js", "js/cervello.js", "js/circolare.js", "js/core.js", "js/data-acquisti.js", "js/data-sapere.js", "js/data-sostieni.js", "js/data-storia.js", "js/hardware.js", "js/i18n.js", "js/impostazioni.js", "js/inizio.js", "js/interventi.js", "js/kit.js", "js/lavori.js", "js/licenza.js", "js/neura.js", "js/notizie.js", "js/ottimizza.js", "js/programma.js", "js/programmi.js", "js/salvadati.js", "js/sapere.js", "js/scheda-madre.js", "js/storia.js", "js/strumenti.js", "js/telefono.js", "js/voce.js", "manifest.webmanifest"];
var CASSA = "consulente-digitale-" + VERSIONE;

self.addEventListener("install", function (e) {
  // «reload»: i file della nuova versione si prendono dal sito, non da copie vecchie del browser
  e.waitUntil(caches.open(CASSA).then(function (c) { return c.addAll(FILE.map(function (f) { return new Request(f, { cache: "reload" }); })); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (n) { return n.indexOf("consulente-digitale-") === 0 && n !== CASSA; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

function dallaRete(req) {
  // «no-cache»: la pagina e le notizie si chiedono sempre al sito (niente copie vecchie del browser); senza rete si usa la copia
  var dom = req.mode === "navigate" || /\.json$/.test(new URL(req.url).pathname) ? fetch(req.url, { cache: "no-cache", credentials: "same-origin" }) : fetch(req);
  return dom.then(function (r) {
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
