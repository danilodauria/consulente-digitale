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

  /* un pulsante che manca (pagina e file di versioni diverse) non deve bloccare l'avvio */
  function imposta(sel, f) { var e = CD.$(sel); if (e) e.onclick = f; }
  function barra() {
    CD.$("#menu-btn").onclick = function () { var m = CD.$("#menu"); m.classList.toggle("aperto"); this.setAttribute("aria-expanded", m.classList.contains("aperto")); };
    imposta("#btn-lingua", function () { CD.i18n.scegli(); });
    imposta("#btn-indietro", function () {
      var h = percorso.pop();
      while (h && CD.telefono && CD.telefono.attivo && CD.telefono.soloPC(h)) h = percorso.pop();   // pagine del computer: saltate
      tornando = true;
      location.replace(location.pathname + location.search + (h && h !== location.hash ? h : "#/"));
    });
    imposta("#btn-reset", function () { CD.backup.reset(); });
    imposta("#btn-stop", function () { var era = CD.staParlando(); CD.ferma(); if (era) CD.avviso("⏹ Voce fermata", "", 1500); });
    imposta("#btn-voce", function () { CD.imp.voce = !CD.imp.voce; if (!CD.imp.voce) CD.taci(); CD.salvaImpostazioni(); CD.avviso(CD.imp.voce ? "🔊 Voce accesa" : "🔇 Voce spenta"); });
    imposta("#btn-tema", function () { var t = ["notte", "giorno", "contrasto"]; CD.imp.tema = t[(t.indexOf(CD.imp.tema) + 1) % 3]; CD.salvaImpostazioni(); });
    imposta("#btn-testo", function () { CD.imp.testo = CD.imp.testo >= 26 ? 16 : CD.imp.testo + 2; CD.salvaImpostazioni(); CD.avviso("Testo: " + CD.imp.testo + " px"); });
    imposta("#profilo-breve", function () { CD.vai("#/benvenuto"); });
    var s = CD.$("#spia-sistema") || document.createElement("span");
    var ua = navigator.userAgent || "";
    s.textContent = { windows: "🪟 Windows", linux: "🐧 Linux", mac: "🍎 macOS" }[CD.sistema()] || (/Android/i.test(ua) ? "📱 Android" : /iPad/i.test(ua) ? "📱 iPad" : /iPhone|iPod/i.test(ua) ? "📱 iPhone" : "📱 dispositivo");
    s.className = "spia" + (CD.server ? " on" : "");
    s.title = CD.server ? (CD.stato.nome_sistema || "") + (CD.stato.amministratore ? " · amministratore" : "") : "Modalità guida (senza il programma installato)";
    var altezza = function () { var h = CD.$(".barra"); if (h) document.documentElement.style.setProperty("--alto-barra", h.offsetHeight + "px"); };
    altezza(); window.addEventListener("resize", altezza);
    document.addEventListener("pointermove", function (e) {
      var t = e.target.closest && e.target.closest(".tessera");
      if (t) { var r = t.getBoundingClientRect(); t.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%"); }
    }, { passive: true });
  }

  /* app per telefono: il service worker serve solo alla versione pubblicata sul sito (https, senza server locale) */
  function appTelefono() {
    if (CD.server || location.protocol !== "https:" || !("serviceWorker" in navigator)) return;
    try {
      var cera = !!navigator.serviceWorker.controller, ricaricato = false;
      // arriva una versione nuova dell'app: si ricarica una volta sola, così si usano subito i file nuovi
      navigator.serviceWorker.addEventListener("controllerchange", function () { if (cera && !ricaricato) { ricaricato = true; location.reload(); } });
      navigator.serviceWorker.register("sw.js").then(function (r) { if (r && r.update) r.update(); }).catch(function () {});
    } catch (e) { /* browser senza supporto (alcuni browser su iPhone) */ }
  }

  function avvia() {
    barra();
    return collegaServer().then(function () {
      CD.$("#spia-sistema").className = "spia" + (CD.server ? " on" : "");
      if (CD.telefono) CD.telefono.prepara();         // app su telefono o tablet: solo i comandi utili lì
      return Promise.all([CD.carica("impostazioni"), CD.carica("profilo"), CD.neura.caricaStoria()]);
    }).then(function (r) {
      if (r[0]) for (var k in r[0]) if (Object.prototype.hasOwnProperty.call(r[0], k) && k in CD.PREDEFINITE) CD.imp[k] = r[0][k];
      CD.profilo = r[1] || null;
      return CD.i18n.imposta(CD.imp.lingua || "it").then(function () { return r; });
    }).then(function () {
      CD.i18n.osserva(); CD.i18n.traduciAlbero(document.body);
      var bl = CD.$("#btn-lingua"); if (bl) bl.querySelector(".cod-lingua").textContent = (CD.imp.lingua || "it").toUpperCase();
      CD.applicaImpostazioni(); CD.mostraProfilo();
      barra();
      CD.neura.avviaDock();
      return Promise.all([CD.caricaAzioni(), CD.neura.controllaIA(), CD.controllaRete()]);
    }).then(function () {
      CD.sincronizzaOra(); appTelefono();
      if (CD.server) { CD.analisi.dati().catch(function () {}); CD.programmi.carica().catch(function () {}); }
      var primo = !CD.profilo && !/noprofilo/.test(parametri);
      if (primo && location.hash.indexOf("#/benvenuto") !== 0) location.hash = "#/benvenuto"; else CD.mostraVista();
      if (!primo && CD.imp.saluto && !/nosaluto/.test(parametri) && !sessionStorageOk("cd.salutato")) {
        setTimeout(function () {
          var h = CD.adesso().getHours(), n = CD.imp.nomeUtente || (CD.profilo && CD.profilo.nome) || "";
          var s = CD.i18n.saluto(h, n);
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
  /* ← Indietro: torna alla pagina precedente del programma (o all'Inizio) */
  var percorso = [], ultimo = location.hash || "#/", tornando = false;
  window.addEventListener("hashchange", function () {
    if (!tornando && ultimo !== location.hash) { percorso.push(ultimo); if (percorso.length > 50) percorso.shift(); }
    tornando = false; ultimo = location.hash || "#/";
  });
  window.addEventListener("online", CD.controllaRete);
  window.addEventListener("offline", CD.controllaRete);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvia); else avvia();
})();
