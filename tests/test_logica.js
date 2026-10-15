/* Prova della logica dell'analisi senza browser (Node): Windows 11, punteggi, sistemi consigliati.
 * Uso: node tests/test_logica.js   — Ideato e sviluppato da Danilo D'Auria - Codice MIT */
"use strict";
var fs = require("fs"), vm = require("vm"), path = require("path");
var web = path.join(__dirname, "..", "src", "web", "js");
var elemento = { style: {}, classList: { toggle: function () {}, add: function () {}, remove: function () {} }, setAttribute: function () {}, addEventListener: function () {} };
global.window = global; Object.defineProperty(global, "navigator", { value: { userAgent: "Node", platform: "Linux", onLine: true }, configurable: true });
global.document = { documentElement: elemento, addEventListener: function () {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, body: elemento };
global.location = { hash: "", protocol: "http:", search: "" };
global.addEventListener = function () {}; global.setInterval = function () {};
["core.js", "licenza.js", "analisi.js"].forEach(function (f) { vm.runInThisContext(fs.readFileSync(path.join(web, f), "utf8"), { filename: f }); });
var CD = window.CD, errori = 0;
function ok(c, msg) { console.log((c ? "  ✔ " : "  ✖ ") + msg); if (!c) errori++; }
function pc(o) {
  return { sistema: o.sistema, cpu: { nome: o.cpu, core: 8, stima: o.stima, flag: [] }, memoria: { totale_mb: o.ram || 16000 },
    dischi: [{ tipo: "NVMe", gb: 512 }], spazio: [{ totale_gb: 500, libero_gb: 200 }], gpu: [{ nome: "Intel Iris Xe" }], batteria: [],
    firmware: o.firmware || { uefi: true, secure_boot: true, tpm: "2.0" }, computer: { produttore: "LENOVO", modello: "IdeaPad" } };
}
// 1. Il caso di Danilo: Windows 11 installato, TPM non letto (senza amministratore)
var r = pc({ sistema: { famiglia: "windows", nome: "Microsoft Windows 11 Home", build: "26100.6584" }, cpu: "12th Gen Intel(R) Core(TM) i5-1235U",
  stima: { marca: "intel", generazione: 12, anno: 2021, fascia: "media" }, firmware: { uefi: true, secure_boot: true, tpm: "" } });
var w = CD.analisi.win11(r);
ok(w.ok && w.installato, "Windows 11 installato → compatibile anche se il TPM non è stato letto");
ok(/già/.test(CD.analisi.win11Testo(w)), "testo: «usa già Windows 11»");
ok(CD.analisi.consigliaSistemi(r)[0].id === "win11" || CD.analisi.consigliaSistemi(r).some(function (x) { return x.id === "win11"; }), "Windows 11 tra i sistemi consigliati");
ok(!/Non compatibile/.test(CD.analisi.riassunto(r)), "il riassunto di Neura non dice «non compatibile»");
// 2. Windows 10 con CPU vecchia
r = pc({ sistema: { famiglia: "windows", nome: "Microsoft Windows 10 Pro", build: "19045.5011" }, cpu: "Intel(R) Core(TM) i5-4590",
  stima: { marca: "intel", generazione: 4, anno: 2013, fascia: "media" } });
w = CD.analisi.win11(r);
ok(!w.ok && w.mancano.length === 1, "Windows 10 con Intel di 4ª gen. → non compatibile per il processore");
// 3. Windows 10 con CPU recente e TPM
r = pc({ sistema: { famiglia: "windows", nome: "Microsoft Windows 10 Home", build: "19045" }, cpu: "Intel(R) Core(TM) i5-1035G1",
  stima: { marca: "intel", generazione: 10, anno: 2019, fascia: "media" } });
ok(CD.analisi.win11(r).ok, "Windows 10 con i5-1035G1 e TPM 2.0 → compatibile");
console.log(errori ? "\n" + errori + " errori" : "\nTutto bene");
process.exit(errori ? 1 : 0);
