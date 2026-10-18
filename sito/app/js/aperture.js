/* ==========================================================================
 *  CONSULENTE DIGITALE - Neura apre programmi, impostazioni e servizi del computer
 *  Solo voci del catalogo del server (cd_aperture.py), mai comandi liberi. Prima di aprire compare un
 *  banner in alto: «Consenti» / «No», con la scelta «consenti per questa sessione» (le richieste seguenti
 *  si aprono da sole fino alla chiusura del programma). Si usa da Neura («apri la gestione attività»),
 *  dai pulsanti [[apri:ID]] della IA, dalla ricerca e dalla scheda «Apri» in Salute e riparazioni.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var AP = CD.aperture = { lista: [], sessione: false };
  var coda = null;

  AP.carica = function () {
    if (!CD.server) return Promise.resolve([]);
    if (AP.lista.length) return Promise.resolve(AP.lista);
    return CD.api("/api/aperture").then(function (j) { AP.lista = j.aperture || []; return AP.lista; }, function () { return []; });
  };
  AP.voce = function (id) { return CD.uno(AP.lista, function (a) { return a.id === id; }); };

  /* trova la voce più adatta a una frase («apri le impostazioni del wifi») */
  AP.trova = function (frase) {
    var n = CD.neura ? CD.neura.norm(frase) : String(frase).toLowerCase(), meglio = null, punti = 0;
    AP.lista.forEach(function (a) {
      var p = 0, parole = (CD.neura ? CD.neura.norm(a.parole + " " + a.titolo) : (a.parole + " " + a.titolo).toLowerCase());
      if (n.indexOf(CD.neura ? CD.neura.norm(a.titolo) : a.titolo.toLowerCase()) >= 0) p += 10;
      parole.split(/\s+/).forEach(function (w) { if (w.length > 3 && n.indexOf(w) >= 0) p += w.length > 6 ? 2 : 1; });
      if (p > punti) { punti = p; meglio = a; }
    });
    return punti >= 2 ? meglio : null;
  };

  function apriOra(a) {
    return CD.api("/api/apri", { id: a.id }).then(function (j) {
      CD.avviso("🪟 Aperto: <b>" + esc(a.titolo) + "</b>" + (j.prova ? " (prova)" : ""), "ok", 3500);
      if (CD.cervello) CD.cervello.stato("felice");
      return true;
    }, function (e) { CD.avviso("Non sono riuscita ad aprire «" + esc(a.titolo) + "»: " + esc(e.message), "male", 6000); return false; });
  }

  /* chiede il consenso con il banner e apre; restituisce una Promise<boolean> */
  AP.chiedi = function (id, motivo) {
    return AP.carica().then(function () {
      var a = AP.voce(id);
      if (!a) { CD.avviso("Questa finestra non è disponibile su " + CD.nomeSistema() + ".", "att"); return false; }
      if (AP.sessione) return apriOra(a);
      return new Promise(function (risolvi) {
        if (coda) coda(false);
        var b = CD.$("#banner-consenso");
        if (!b) { b = document.createElement("div"); b.id = "banner-consenso"; b.setAttribute("role", "alertdialog"); b.setAttribute("aria-live", "assertive"); document.body.appendChild(b); }
        b.innerHTML = '<div class="bc-corpo"><span class="bc-io">🧠</span><div><b>Neura vuole aprire «' + esc(a.icona + " " + a.titolo) + '»</b><br><small>' + esc(motivo || a.descrizione) +
          ". Si apre solo la finestra: nulla viene modificato.</small></div>" +
          '<label class="opzione"><input type="checkbox" id="bc-sempre"> Consenti per questa sessione</label>' +
          '<button class="btn" id="bc-no">✖ No</button><button class="btn primario" id="bc-si">✔ Consenti</button></div>';
        b.hidden = false; b.className = "visibile";
        if (CD.parla && CD.imp.voce) try { CD.parla("Posso aprire " + a.titolo + "?"); } catch (e) { /* niente */ }
        function chiudi(v) {
          coda = null; b.className = ""; setTimeout(function () { b.hidden = true; }, 300);
          document.removeEventListener("keydown", tasto);
          risolvi(v);
        }
        function tasto(e) { if (e.key === "Escape") chiudi(false); }
        coda = chiudi;
        document.addEventListener("keydown", tasto);
        CD.$("#bc-no", b).onclick = function () { chiudi(false); };
        CD.$("#bc-si", b).onclick = function () {
          if (CD.$("#bc-sempre", b).checked) AP.sessione = true;
          chiudi(true);
        };
        CD.$("#bc-si", b).focus();
      }).then(function (ok) { return ok ? apriOra(a) : false; });
    });
  };

  /* griglia di pulsanti (pagina Salute e riparazioni → «Apri») */
  AP.griglia = function (box) {
    box.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>';
    AP.carica().then(function (l) {
      box.innerHTML = '<p>Le finestre del sistema che Neura può aprire per voi su <b>' + CD.nomeSistema() + "</b>. Basta anche dirlo: <i>«Neura, apri la gestione attività»</i>. " +
        "Prima di aprire chiede sempre il permesso." + (AP.sessione ? ' <span class="etichetta ok">permesso concesso per questa sessione</span> <button class="btn piccolo" id="ap-revoca">Revoca</button>' : "") + "</p>" +
        (l.length ? '<div class="ap-griglia">' + l.map(function (a) {
          return '<button class="ap-voce" data-ap="' + esc(a.id) + '"><span>' + a.icona + "</span><b>" + esc(a.titolo) + "</b><small>" + esc(a.descrizione) + "</small></button>"; }).join("") + "</div>"
          : '<p class="vuoto">Nessuna finestra disponibile.</p>');
      CD.$$("[data-ap]", box).forEach(function (x) { x.onclick = function () { AP.chiedi(x.getAttribute("data-ap")); }; });
      var r = CD.$("#ap-revoca", box); if (r) r.onclick = function () { AP.sessione = false; AP.griglia(box); };
    });
  };

  /* ricerca globale */
  if (CD.cerca && CD.cerca.fonte) CD.cerca.fonte(function () {
    return AP.lista.map(function (a) { return { gruppo: "Apri sul computer", icona: a.icona, titolo: "Apri " + a.titolo, testo: a.descrizione + " · " + a.parole, apertura: a.id }; });
  });
  CD.hooks.avvio.push(function () { AP.carica(); });
})();
