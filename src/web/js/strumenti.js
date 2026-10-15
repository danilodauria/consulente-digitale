/* ==========================================================================
 *  CONSULENTE DIGITALE - Salute e riparazioni
 *  Disco, batteria, sicurezza, velocità di Internet, riparazioni e ora esatta.
 *  Il «pilota automatico» (CD.pilota) fa tutti i controlli che non cambiano nulla e prepara
 *  il rapporto di salute del computer, stampabile.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;

  function blocco(id, el) {
    var a = CD.azioni[id];
    if (!a) return "";
    return '<div class="scheda"><div class="riga"><span class="em">' + a.icona + "</span><h3>" + esc(a.titolo) + '</h3><span class="spazio"></span><button class="btn primario" data-run="' + id + '">▶ ' +
      (a.rischio === "nessuno" ? "Controlla" : "Avvia") + "</button></div><p>" + esc(a.descrizione) + '</p><div class="esito" id="esito-' + id + '"></div></div>';
  }
  function lega(el) {
    CD.$$("[data-run]", el).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-run");
        CD.esegui(id, "", { senzaConferma: CD.azioni[id].rischio === "nessuno", silenzioso: CD.azioni[id].rischio === "nessuno" }).then(function (j) {
          var box = CD.$("#esito-" + id, el); if (box) box.innerHTML = CD.tabellaVoci(j.voci, { vuoto: j.stato === "fatto" ? "✔ Fatto." : "Nessun risultato: vedete il registro." });
        }, function () {});
      };
    });
  }
  function velocita(box) {
    box.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div><p>Misuro… (circa 20 secondi, scarico 25 MB dai server di Cloudflare)</p>';
    CD.cervello.stato("pensiero");
    CD.api("/api/rete/velocita", {}).then(function (r) {
      CD.cervello.stato("felice");
      var d = r.download_mbps || 0, giudizio = d >= 100 ? "Ottima: va bene anche per lo streaming 4K e il lavoro di più persone" : d >= 30 ? "Buona per videochiamate e streaming HD" : d >= 10 ? "Sufficiente per navigare e videochiamare" : "Lenta: provate a riavviare il router o ad avvicinarvi";
      box.innerHTML = '<div class="metri">' + CD.metro(Math.round(d), Math.max(100, Math.round(d)), "Download Mbit/s") + CD.metro(Math.round(r.upload_mbps || 0), Math.max(50, Math.round(r.upload_mbps || 0)), "Upload Mbit/s") +
        CD.metro(r.latenza_ms || 0, 200, "Risposta (ms)", r.latenza_ms < 40 ? "var(--ok)" : r.latenza_ms < 100 ? "var(--attenzione)" : "var(--male)") + "</div><p><b>" + esc(giudizio) + ".</b></p>" +
        (r.errore ? '<p class="piccolo-testo">Nota: ' + esc(r.errore) + "</p>" : "");
      CD.parla("Velocità di download: " + Math.round(d) + " megabit al secondo. " + giudizio + ".");
    }, function (e) { CD.cervello.stato("errore"); box.innerHTML = '<div class="avviso male">Prova non riuscita: ' + esc(e.message) + "</div>"; });
  }

  /* ------------------------------------------------------------------ pilota automatico */
  CD.pilota = function () {
    if (!CD.server) { CD.avviso("Il pilota automatico funziona con il programma installato.", "att"); return; }
    var lista = ["aggiornamenti_cerca", "sicurezza_controllo", "disco_salute", "batteria"].filter(function (i) { return CD.azioni[i]; });
    var html = '<p>Neura controlla il computer senza cambiare nulla. Alla fine trovate il rapporto completo.</p><ol class="lista-semplice pilota">' +
      '<li id="pl-analisi">🔬 Analisi dell\'hardware <span>…</span></li>' + lista.map(function (i) { return '<li id="pl-' + i + '">' + CD.azioni[i].icona + " " + esc(CD.azioni[i].titolo) + " <span>in attesa</span></li>"; }).join("") +
      '</ol><div id="pl-rapporto"></div>';
    var risultati = {}, finestra = null;
    CD.modale({ titolo: "🧭 Pilota automatico", html: html, chiudibile: false, pulsanti: [{ testo: "🖨️ Stampa il rapporto", valore: "stampa" }, { testo: "Chiudi", valore: null, classe: "primario" }],
      dopo: function (m) { finestra = m; } }).then(function (v) { if (v === "stampa") stampaRapporto(risultati); });
    CD.parla("Avvio il pilota automatico: controllo hardware, aggiornamenti, sicurezza, disco e batteria.");
    function segna(id, t, cl) { var e = finestra && CD.$("#pl-" + id + " span", finestra); if (e) { e.textContent = t; e.className = cl || ""; } }
    var catena = CD.analisi.dati(true).then(function (r) { risultati.analisi = r; segna("analisi", "✔ voto " + CD.analisi.punteggi(r).totale + "/10", "ok"); }, function () { segna("analisi", "✖", "male"); });
    lista.forEach(function (id) {
      catena = catena.then(function () {
        segna(id, "⏳ in corso…");
        return CD.esegui(id, "", { senzaConferma: true, silenzioso: true, parla: false, quieto: true }).then(function (j) { risultati[id] = j; segna(id, j.stato === "fatto" ? "✔ " + (j.voci.length ? j.voci.length + " elementi" : "ok") : "⚠ " + j.stato, j.stato === "fatto" ? "ok" : "att"); },
          function () { segna(id, "saltato", "att"); });
      });
    });
    catena.then(function () {
      var box = finestra && CD.$("#pl-rapporto", finestra);
      var testo = sintesi(risultati);
      if (box) box.innerHTML = '<div class="neura-dice"><span>🧠</span><div>' + testo.html + "</div></div>";
      CD.cervello.stato("felice");
      CD.neura.dici(testo.voce, testo.comandi);
      CD.salva("diario", { pilota: { quando: CD.dataEstesa() + " " + CD.oraTesto(), voto: risultati.analisi ? CD.analisi.punteggi(risultati.analisi).totale : null },
        aggiornamenti: risultati.aggiornamenti_cerca ? risultati.aggiornamenti_cerca.voci : [], info: risultati.aggiornamenti_cerca ? risultati.aggiornamenti_cerca.info : {},
        quando: CD.dataEstesa() + " " + CD.oraTesto() });
    });
  };
  function sintesi(R) {
    var punti = [], comandi = [];
    if (R.analisi) { var p = CD.analisi.punteggi(R.analisi); punti.push("Hardware: voto <b>" + p.totale + "/10</b>." + (CD.analisi.migliorie(R.analisi)[0] ? " Miglioria più utile: " + esc(CD.analisi.migliorie(R.analisi)[0].titolo.toLowerCase()) + "." : "")); }
    var ag = R.aggiornamenti_cerca;
    if (ag) { punti.push(ag.voci.length ? "Aggiornamenti: <b>" + ag.voci.length + " da installare</b>." : "Aggiornamenti: tutto aggiornato ✔."); if (ag.voci.length) comandi.push({ tipo: "azione", id: "aggiornamenti_installa", etichetta: "⬇️ Installa gli aggiornamenti" }); }
    var sc = R.sicurezza_controllo;
    if (sc) { var att = sc.voci.filter(function (v) { return /attenzione/i.test(v.nuova); }); punti.push(att.length ? "Sicurezza: <b>" + att.length + " punti da sistemare</b> (" + esc(att.map(function (v) { return v.nome; }).join(", ")) + ")." : "Sicurezza: nessun problema grave ✔."); }
    var ds = R.disco_salute;
    if (ds) { var male = ds.voci.filter(function (v) { return /fail|warning|non|bad|predict|copia/i.test(v.attuale + " " + v.nota) && !/healthy|passed|verified|ok/i.test(v.attuale); });
      punti.push(male.length ? "Disco: <b>attenzione</b>, fate subito una copia dei dati." : "Disco: in salute ✔."); }
    var bt = R.batteria;
    if (bt && bt.info.salute && bt.info.salute !== "nessuna") punti.push("Batteria: salute <b>" + esc(bt.info.salute) + "%</b>" + (+bt.info.salute < 75 ? " — valutate la sostituzione." : " ✔."));
    if (R.analisi) comandi.push({ tipo: "vai", hash: "#/analisi", etichetta: "🔬 Vedi l'analisi" });
    comandi.push({ tipo: "azione", id: "ottimizza", etichetta: "🚀 Ottimizza ora" });
    return { html: "<p>" + punti.join("</p><p>") + "</p>", voce: "Ho finito il controllo. " + punti.join(" ").replace(/<[^>]+>/g, ""), comandi: comandi.filter(function (c) { return c.tipo !== "azione" || CD.azioni[c.id]; }) };
  }
  function stampaRapporto(R) {
    var s = sintesi(R);
    CD.stampa("Rapporto di salute del computer", s.html + (R.analisi ? "<h2>Analisi</h2><p>" + esc(CD.analisi.riassuntoBreve(R.analisi)) + "</p>" : "") +
      ["aggiornamenti_cerca", "sicurezza_controllo", "disco_salute", "batteria"].map(function (k) { return R[k] ? "<h2>" + esc(R[k].titolo) + "</h2>" + CD.tabellaVoci(R[k].voci) : ""; }).join(""), { codice: CD.codiceScheda() });
  }

  CD.registra("strumenti", {
    titolo: "Salute e riparazioni",
    mostra: function (el, parti) {
      var tab = parti[0] || "salute";
      el.innerHTML = CD.titolo("🩺", "Salute e riparazioni", "Controlli, riparazioni e la prova della connessione") +
        '<div class="schede-tab" role="tablist">' + [["salute", "🩺 Salute"], ["rete", "📶 Internet"], ["riparazioni", "🔧 Riparazioni"], ["ora", "🕰️ Ora esatta"], ["apri", "🪟 Apri"]].map(function (t) {
          return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") +
        '<span class="spazio"></span><button class="btn primario" id="st-pilota">🧭 Pilota automatico</button></div><div id="st-corpo"></div>';
      CD.$$("[data-tab]", el).forEach(function (b) { b.onclick = function () { CD.vai("#/strumenti/" + b.getAttribute("data-tab")); }; });
      CD.$("#st-pilota", el).onclick = CD.pilota;
      var c = CD.$("#st-corpo", el);
      if (!CD.server && tab !== "ora") { c.innerHTML = '<div class="avviso att">Questi strumenti funzionano con il programma installato sul computer.</div>'; return; }
      if (tab === "salute") c.innerHTML = '<div class="griglia-2">' + blocco("disco_salute") + blocco("batteria") + blocco("sicurezza_controllo") + "</div>";
      else if (tab === "rete") c.innerHTML = '<div class="griglia-2"><div class="scheda luce"><h3>📶 Velocità di Internet</h3><p>Misura download, upload e tempo di risposta. Si avvia solo quando lo chiedete.</p>' +
        '<button class="btn primario" id="st-vel">▶ Misura adesso</button><div id="st-vel-esito"></div></div>' + blocco("rete_ripara") + "</div>";
      else if (tab === "apri") { CD.aperture.griglia(c); return; }
      else if (tab === "riparazioni") c.innerHTML = '<div class="griglia-2">' + blocco("punto_ripristino") + blocco("ripara") + blocco("licenza_windows") + "</div>";
      else {
        var s = CD.oraSync;
        c.innerHTML = '<div class="griglia-2"><div class="scheda luce"><h3>🕰️ Ora del computer e ora ufficiale</h3><div class="ora-mega" id="st-ora"></div>' +
          (s ? "<p>Fonte ufficiale: <b>" + esc(s.fonte) + "</b> (" + esc(s.metodo) + "). Il computer è " + (Math.abs(s.scarto_s) < 0.5 ? "<b>preciso</b>" : (s.scarto_s > 0 ? "avanti" : "indietro") + " di <b>" + CD.arrotonda(Math.abs(s.scarto_s), 2) + " s</b>") + ".</p>" :
            "<p>Ora del computer (sincronizzazione con Internet " + (CD.imp.online ? "non riuscita" : "spenta nelle impostazioni") + ").</p>") +
          '<p class="piccolo-testo">L\'ora ufficiale italiana è quella dell\'INRiM (Istituto Nazionale di Ricerca Metrologica) di Torino. Un orologio preciso serve per i certificati dei siti, la posta e per non perdere le offerte a tempo.</p>' +
          '<div class="riga"><button class="btn" id="st-sync">🔄 Ricontrolla</button></div></div>' + blocco("ora_sincronizza") + "</div>";
        var t = setInterval(function () { var o = CD.$("#st-ora"); if (!o) { clearInterval(t); return; } var d = CD.adesso(); o.innerHTML = "<b>" + CD.oraTesto(d) + ":" + ("0" + d.getSeconds()).slice(-2) + "</b><small>" + CD.dataEstesa(d) + "</small>"; }, 250);
        CD.$("#st-sync", c).onclick = function () { CD.sincronizzaOra().then(function () { CD.mostraVista(); }); };
      }
      lega(c);
      var v = CD.$("#st-vel", c); if (v) v.onclick = function () { velocita(CD.$("#st-vel-esito", c)); };
    }
  });
})();
