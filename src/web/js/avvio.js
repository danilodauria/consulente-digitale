/* ==========================================================================
 *  CONSULENTE DIGITALE - Avvio dell'interfaccia
 *  Collega il server locale (se c'è), carica impostazioni, profilo e conversazione, sincronizza l'ora,
 *  controlla rete e IA, mostra la scelta iniziale al primo avvio e saluta.
 *  Senza server (file://, telefono) funziona in modalità «guida»: acquisti, cose da sapere, storia.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD;
  var parametri = location.search || "";

  function collegaServer() {
    if (location.protocol === "file:") return Promise.resolve(false);
    return fetch("/api/status", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || j.app !== "Consulente Digitale") return false;
      CD.server = true; CD.stato = j; return true;
    }, function () { return false; });
  }

  function barra() {
    CD.$("#menu-btn").onclick = function () { var m = CD.$("#menu"); m.classList.toggle("aperto"); this.setAttribute("aria-expanded", m.classList.contains("aperto")); };
    CD.$("#btn-voce").onclick = function () { CD.imp.voce = !CD.imp.voce; if (!CD.imp.voce) CD.taci(); CD.salvaImpostazioni(); CD.avviso(CD.imp.voce ? "🔊 Voce accesa" : "🔇 Voce spenta"); };
    CD.$("#btn-tema").onclick = function () { var t = ["notte", "giorno", "contrasto"]; CD.imp.tema = t[(t.indexOf(CD.imp.tema) + 1) % 3]; CD.salvaImpostazioni(); };
    CD.$("#btn-testo").onclick = function () { CD.imp.testo = CD.imp.testo >= 26 ? 16 : CD.imp.testo + 2; CD.salvaImpostazioni(); CD.avviso("Testo: " + CD.imp.testo + " px"); };
    CD.$("#profilo-breve").onclick = function () { CD.vai("#/benvenuto"); };
    var s = CD.$("#spia-sistema");
    s.textContent = { windows: "🪟 Windows", linux: "🐧 Linux", mac: "🍎 macOS" }[CD.sistema()] || "📱 dispositivo";
    s.className = "spia" + (CD.server ? " on" : "");
    s.title = CD.server ? (CD.stato.nome_sistema || "") + (CD.stato.amministratore ? " · amministratore" : "") : "Modalità guida (senza il programma installato)";
    document.addEventListener("pointermove", function (e) {
      var t = e.target.closest && e.target.closest(".tessera");
      if (t) { var r = t.getBoundingClientRect(); t.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%"); }
    }, { passive: true });
  }

  function avvia() {
    barra();
    return collegaServer().then(function () {
      CD.$("#spia-sistema").className = "spia" + (CD.server ? " on" : "");
      return Promise.all([CD.carica("impostazioni"), CD.carica("profilo"), CD.neura.caricaStoria()]);
    }).then(function (r) {
      if (r[0]) for (var k in r[0]) if (Object.prototype.hasOwnProperty.call(r[0], k) && k in CD.PREDEFINITE) CD.imp[k] = r[0][k];
      CD.profilo = r[1] || null;
      CD.applicaImpostazioni(); CD.mostraProfilo();
      barra();
      CD.neura.avviaDock();
      return Promise.all([CD.caricaAzioni(), CD.neura.controllaIA(), CD.controllaRete()]);
    }).then(function () {
      CD.sincronizzaOra();
      if (CD.server) { CD.analisi.dati().catch(function () {}); CD.programmi.carica().catch(function () {}); }
      var primo = !CD.profilo && !/noprofilo/.test(parametri);
      if (primo && location.hash.indexOf("#/benvenuto") !== 0) location.hash = "#/benvenuto"; else CD.mostraVista();
      if (!primo && CD.imp.saluto && !/nosaluto/.test(parametri) && !sessionStorageOk("cd.salutato")) {
        setTimeout(function () {
          var h = CD.adesso().getHours(), n = CD.imp.nomeUtente || (CD.profilo && CD.profilo.nome) || "";
          var s = (h < 5 ? "Buonanotte" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera") + (n ? " " + n : "") + "! Sono le " + CD.oraTesto() + ". ";
          s += CD.neura.ia.attivo ? "Sono pronta: chiedetemi qualsiasi cosa." : "Sono pronta ad aiutarvi.";
          CD.parla(s);
        }, 900);
      }
      setInterval(function () { if (CD.server) CD.api("/api/ciao", {}).catch(function () {}); }, 60000);
      setInterval(CD.controllaRete, 60000);
      setInterval(CD.sincronizzaOra, 30 * 60000);
      setInterval(CD.neura.controllaIA, 120000);
      CD.hooks.avvio.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
    }).catch(function (e) {
      console.error(e);
      CD.$("#principale").innerHTML = '<div class="avviso male">Errore all\'avvio: ' + CD.esc(e.message) + "</div>";
    });
  }
  function sessionStorageOk(k) {
    try { if (sessionStorage.getItem(k)) return true; sessionStorage.setItem(k, "1"); } catch (e) { /* niente */ }
    return false;
  }
  window.addEventListener("online", CD.controllaRete);
  window.addEventListener("offline", CD.controllaRete);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia); else avvia();
})();
