/* ==========================================================================
 *  CONSULENTE DIGITALE - Diagnosi e interventi
 *  1) Diagnosi: dai sensori, dalle schede hardware e dall'analisi nasce l'elenco dei problemi.
 *  2) Lavori da eseguire: proposti in automatico (con il pulsante dell'azione, quando il programma può farla)
 *     o aggiunti a mano; si spuntano quando sono fatti (le azioni riuscite si spuntano da sole).
 *  3) Due schede da stampare: «Diagnosi e lavori da eseguire» e «Lavori eseguiti», con codice, firme e licenza.
 *  Le schede restano in archivio (chiave dati "interventi").
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var I = CD.interventi = { dati: null };
  var PRIORITA = { urgente: ["🔴", "Urgente"], presto: ["🟠", "Da fare presto"], consigliato: ["🔵", "Consigliato"], controllo: ["⚪", "Controllo"] };

  I.carica = function () {
    if (I.dati) return Promise.resolve(I.dati);
    return CD.carica("interventi").then(function (d) { I.dati = d && d.schede ? d : { schede: [], corrente: "" }; return I.dati; });
  };
  function salva() { CD.salva("interventi", I.dati); }
  function corrente() { return CD.uno(I.dati.schede, function (s) { return s.codice === I.dati.corrente; }); }
  function quando() { return CD.dataEstesa() + " " + CD.oraTesto(); }
  function nuovoId() { return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function azioneEsiste(id) { return !!(CD.azioni && CD.azioni[id]); }

  /* ------------------------------------------------------------------ dalla diagnosi ai lavori */
  var REGOLE = [   // [tipo componente, stato, testo del lavoro, priorità, azione del programma (facoltativa)]
    ["cpu", "male", "Pulizia interna di ventola e dissipatore, sostituzione della pasta termica", "urgente"],
    ["cpu", "att", "Pulizia delle prese d'aria e controllo della ventola", "presto"],
    ["ventola", "male", "Pulizia o sostituzione della ventola", "urgente"],
    ["nvme", "male", "Copia di sicurezza immediata dei dati e sostituzione del disco", "urgente"],
    ["ssd", "male", "Copia di sicurezza immediata dei dati e sostituzione del disco", "urgente"],
    ["hdd", "male", "Copia di sicurezza immediata dei dati e sostituzione del disco con un SSD", "urgente"],
    ["hdd", "att", "Sostituzione del disco meccanico con un SSD (clonazione o installazione pulita)", "consigliato"],
    ["nvme", "att", "Liberare spazio e migliorare l'aerazione del disco", "presto", "pulizia"],
    ["ssd", "att", "Liberare spazio sul disco", "presto", "pulizia"],
    ["ram", "att", "Aggiunta di memoria RAM (verificare lo slot libero e il tipo)", "consigliato"],
    ["gpu", "male", "Pulizia della scheda video e controllo delle sue ventole", "urgente"],
    ["gpu", "att", "Pulizia della scheda video", "presto"],
    ["chipset", "att", "Controllo dei dispositivi con problemi e reinstallazione dei driver", "presto", "driver_cerca"],
    ["bios", "att", "Aggiornamento del BIOS/UEFI dal sito del produttore (con l'alimentatore collegato)", "consigliato", "driver_cerca"],
    ["batteria", "male", "Sostituzione della batteria (originale o compatibile certificata)", "urgente"],
    ["batteria", "att", "Calibrazione e controllo della batteria; valutare la sostituzione", "consigliato", "batteria"]
  ];
  I.proponi = function (r) {
    var lavori = [], visti = {};
    function add(testo, prio, comp, azione, origine) {
      if (visti[testo]) return; visti[testo] = 1;
      lavori.push({ id: nuovoId(), testo: testo, priorita: prio, componente: comp || "", azione: azione && azioneEsiste(azione) ? azione : "", origine: origine || "", fatto: false });
    }
    add("Punto di ripristino o copia di sicurezza prima degli interventi", "controllo", "sistema", CD.sistema() === "windows" ? "punto_ripristino" : "");
    r.modello.componenti.forEach(function (c) {
      REGOLE.forEach(function (g) { if (g[0] === c.tipo && g[1] === c.stato) add(g[2], g[3], c.nome, g[4], c.problemi.join(" ")); });
    });
    if (!((r.arch || {}).disco || {}).voci) add("Controllo della salute dei dischi (SMART)", "controllo", "dischi", "disco_salute");
    add("Ricerca e installazione degli aggiornamenti di sistema e driver", "controllo", "sistema", "aggiornamenti_cerca");
    add("Controllo di sicurezza (antivirus, firewall, cifratura)", "controllo", "sistema", "sicurezza_controllo");
    if (r.an && r.an.sistema && CD.analisi.migliorie) CD.analisi.migliorie(r.an).forEach(function (m) {
      var az = /spazio/i.test(m.titolo) ? "pulizia" : "";
      if (az && lavori.some(function (l) { return l.azione === az; })) return;
      if (!/ssd|ram|batteria|pasta/i.test(m.titolo)) add(m.titolo + (m.costo ? " (costo indicativo " + m.costo + ")" : ""), "consigliato", "", az, m.testo);
    });
    var o = { urgente: 0, presto: 1, consigliato: 2, controllo: 3 };
    lavori.sort(function (a, b) { return o[a.priorita] - o[b.priorita]; });
    return lavori;
  };
  I.nuova = function () {
    return HW().raccogli(true).then(function (r) {
      var an = r.an || {}, c = an.computer || {}, d = r.det || {};
      var s = { codice: CD.codiceScheda(), creata: quando(), cliente: CD.profilo ? CD.profilo.nome || "" : "", tecnico: "", note: "",
        computer: ((d.scheda || {}).sistema || ((c.produttore || "") + " " + (c.modello || ""))).trim() || "Computer", seriale: c.seriale || "",
        sistema: (an.sistema || {}).nome || CD.nomeSistema(), riassunto: an.sistema ? CD.analisi.riassuntoBreve(an) : "",
        stato: r.modello.stato, guasti: r.modello.componenti.filter(function (x) { return x.problemi.length; }).map(function (x) {
          return { nome: x.nome, stato: x.stato, valore: x.valore, problemi: x.problemi }; }),
        lavori: I.proponi(r), chiusa: "" };
      I.dati.schede.unshift(s); I.dati.corrente = s.codice;
      if (I.dati.schede.length > 60) I.dati.schede.length = 60;
      salva(); return s;
    });
  };
  function HW() { return CD.hw; }

  /* ------------------------------------------------------------------ schede da stampare */
  function testata(s) {
    return '<table class="f-tab"><tr><th>Computer</th><td>' + esc(s.computer) + (s.seriale ? " · n. di serie " + esc(s.seriale) : "") + "</td></tr><tr><th>Sistema</th><td>" + esc(s.sistema) +
      "</td></tr>" + (s.cliente ? "<tr><th>Cliente / utente</th><td>" + esc(s.cliente) + "</td></tr>" : "") + (s.tecnico ? "<tr><th>Tecnico</th><td>" + esc(s.tecnico) + "</td></tr>" : "") +
      "<tr><th>Diagnosi del</th><td>" + esc(s.creata) + "</td></tr></table>";
  }
  function firme(a, b) { return '<div class="f-firme"><div>' + a + "<br><br>________________________</div><div>" + b + "<br><br>________________________</div></div>"; }
  I.stampaDiagnosi = function (s) {
    var schema = CD.hw.ultimoModello ? CD.hw.disegna(CD.hw.ultimoModello).svg : "";
    var h = testata(s) + (s.riassunto ? '<p class="f-msg">' + esc(s.riassunto) + "</p>" : "") +
      "<h2>Esito della diagnosi</h2>" + (s.guasti.length ? '<ol class="f-linea">' + s.guasti.map(function (g) {
        return "<li><b>" + esc(g.nome) + "</b> — " + esc(CD.hw.NOMI_STATO[g.stato] || g.stato) + (g.valore ? " (" + esc(g.valore) + ")" : "") + "<br>" + g.problemi.map(esc).join("<br>") + "</li>"; }).join("") + "</ol>"
        : "<p>Nessun guasto imminente rilevato dai sensori e dai controlli disponibili.</p>") +
      (schema ? '<h2>Schema della scheda madre</h2><div style="break-inside:avoid">' + schema.replace("<svg ", '<svg style="width:100%;height:auto" ') + "</div>" : "") +
      "<h2>Lavori da eseguire</h2>" + tabLavori(s.lavori.filter(function (l) { return !l.fatto; }), false) +
      (s.note ? "<h2>Note</h2><p>" + esc(s.note) + "</p>" : "") +
      '<p style="font-size:8.5pt;color:#475569">Lo schema è indicativo, generato dai dati letti dal computer. Le priorità: 🔴 urgente, 🟠 da fare presto, 🔵 consigliato, ⚪ controllo.</p>' +
      firme("Firma del tecnico", "Firma del cliente per presa visione");
    CD.stampa("Scheda di diagnosi e lavori da eseguire", h, { codice: s.codice });
  };
  I.stampaEseguiti = function (s) {
    var fatti = s.lavori.filter(function (l) { return l.fatto; }), aperti = s.lavori.filter(function (l) { return !l.fatto; });
    var h = testata(s) + "<h2>Lavori eseguiti</h2>" + (fatti.length ? tabLavori(fatti, true) : "<p>Nessun lavoro segnato come eseguito.</p>") +
      (aperti.length ? "<h2>Lavori ancora da eseguire</h2>" + tabLavori(aperti, false) : "<p><b>✔ Tutti i lavori previsti sono stati eseguiti.</b></p>") +
      (s.note ? "<h2>Note</h2><p>" + esc(s.note) + "</p>" : "") + (s.chiusa ? "<p>Intervento chiuso il " + esc(s.chiusa) + ".</p>" : "") +
      firme("Firma del tecnico", "Firma del cliente per accettazione");
    CD.stampa("Scheda lavori eseguiti", h, { codice: s.codice });
  };
  function tabLavori(l, fatti) {
    if (!l.length) return "<p>Nessuno.</p>";
    return '<table class="f-tab f-confronto"><tr><th>#</th><th>Priorità</th><th>Lavoro</th><th>Componente</th>' + (fatti ? "<th>Eseguito il</th><th>Esito / note</th>" : "<th>Fatto ☐</th>") + "</tr>" +
      l.map(function (x, i) {
        return "<tr><td>" + (i + 1) + "</td><td>" + PRIORITA[x.priorita][0] + " " + PRIORITA[x.priorita][1] + "</td><td>" + esc(x.testo) + "</td><td>" + esc(x.componente) + "</td>" +
          (fatti ? "<td>" + esc(x.quando || "") + "</td><td>" + esc(x.nota || "") + "</td>" : "<td></td>") + "</tr>"; }).join("") + "</table>";
  }

  /* ------------------------------------------------------------------ pagina */
  CD.registra("interventi", {
    titolo: "Diagnosi e interventi",
    mostra: function (el) {
      el.innerHTML = CD.titolo("🛠️", "Diagnosi e interventi", "Dalla diagnosi ai lavori da eseguire, poi la scheda dei lavori eseguiti: per voi, per il tecnico o per l'assistenza del centro") +
        '<div id="int-corpo"><div class="barra-progresso indeterminata"><i></i></div></div>';
      var corpo = CD.$("#int-corpo", el);
      I.carica().then(disegna);
      function disegna() {
        var s = corrente();
        var arch = I.dati.schede.filter(function (x) { return x !== s; });
        var h = '<div class="riga" data-no-stampa><button class="btn primario" id="int-nuova">🔬 ' + (s ? "Nuova diagnosi" : "Fai la diagnosi ora") + "</button>" +
          (s ? '<button class="btn" id="int-st1">🖨️ Scheda di diagnosi e lavori da eseguire</button><button class="btn" id="int-st2">🖨️ Scheda lavori eseguiti</button>' : "") + "</div>";
        if (!s) h += '<div class="avviso">Il programma legge sensori, componenti e salute del computer, trova i problemi e prepara l\'elenco dei lavori. Nulla viene cambiato senza il vostro clic.</div>';
        else {
          var fatti = s.lavori.filter(function (l) { return l.fatto; }).length;
          h += '<div class="scheda"><div class="riga"><b>Scheda ' + esc(s.codice) + "</b><span class=\"etichetta " + (s.stato === "male" ? "male" : s.stato === "att" ? "att" : "ok") + '">' +
            esc(CD.hw.NOMI_STATO[s.stato] || "") + '</span><span class="spazio"></span><small>' + esc(s.creata) + "</small></div>" +
            "<p>" + esc(s.computer) + " · " + esc(s.sistema) + "</p>" +
            '<div class="griglia-2"><label>Cliente / utente<input id="int-cliente" value="' + esc(s.cliente) + '"></label><label>Tecnico<input id="int-tecnico" value="' + esc(s.tecnico) + '"></label></div>' +
            '<label>Note<textarea id="int-note" rows="2">' + esc(s.note) + "</textarea></label>" +
            '<div class="barra-progresso"><i style="width:' + (s.lavori.length ? Math.round(100 * fatti / s.lavori.length) : 0) + '%"></i></div><small>' + fatti + " lavori fatti su " + s.lavori.length + "</small></div>";
          h += "<h2>🔎 Diagnosi</h2>" + (s.guasti.length ? '<ol class="sm-problemi">' + s.guasti.map(function (g) {
            return '<li class="sm-' + g.stato + '"><b>' + esc(g.nome) + "</b> — " + esc(CD.hw.NOMI_STATO[g.stato]) + (g.valore ? " (" + esc(g.valore) + ")" : "") + "<br><small>" + g.problemi.map(esc).join("<br>") + "</small></li>"; }).join("") + "</ol>"
            : '<div class="avviso ok">✔ Nessun guasto imminente rilevato.</div>') + '<p><a href="#/hardware/schema">🧩 Vedi lo schema della scheda madre</a></p>';
          h += "<h2>📋 Lavori da eseguire</h2>" + lista(s.lavori.filter(function (l) { return !l.fatto; }), false) +
            '<div class="riga" data-no-stampa><input id="int-nuovo" placeholder="Aggiungi un lavoro (es. «sostituita tastiera»)" style="flex:1;min-width:14rem"><select id="int-prio">' +
            Object.keys(PRIORITA).map(function (k) { return '<option value="' + k + '"' + (k === "consigliato" ? " selected" : "") + ">" + PRIORITA[k][0] + " " + PRIORITA[k][1] + "</option>"; }).join("") +
            '</select><button class="btn" id="int-aggiungi">➕ Aggiungi</button></div>';
          h += "<h2>✅ Lavori eseguiti</h2>" + lista(s.lavori.filter(function (l) { return l.fatto; }), true);
        }
        if (arch.length) h += "<h2>🗂️ Archivio</h2><table class=\"tab\"><tbody>" + arch.map(function (x) {
          var f = x.lavori.filter(function (l) { return l.fatto; }).length;
          return "<tr><td><b>" + esc(x.codice) + "</b><br><small>" + esc(x.creata) + "</small></td><td>" + esc(x.computer) + (x.cliente ? "<br><small>" + esc(x.cliente) + "</small>" : "") + "</td><td>" + f + "/" + x.lavori.length +
            ' fatti</td><td><button class="btn piccolo" data-apri="' + esc(x.codice) + '">Apri</button> <button class="btn piccolo" data-togli="' + esc(x.codice) + '">🗑️</button></td></tr>'; }).join("") + "</tbody></table>";
        corpo.innerHTML = h;
        collega(s);
      }
      function lista(l, fatti) {
        if (!l.length) return '<p class="vuoto">' + (fatti ? "Ancora nessun lavoro segnato come fatto." : "Nessun lavoro in sospeso. 🎉") + "</p>";
        return '<ul class="int-lavori">' + l.map(function (x) {
          return '<li class="' + (fatti ? "fatto" : "") + '"><label class="opzione"><input type="checkbox" data-fatto="' + x.id + '"' + (fatti ? " checked" : "") + "> " +
            PRIORITA[x.priorita][0] + " <span>" + esc(x.testo) + "</span></label>" + (x.componente ? ' <small class="etichetta">' + esc(x.componente) + "</small>" : "") +
            (fatti ? '<br><small>Fatto il ' + esc(x.quando || "") + (x.nota ? " · " + esc(x.nota) : "") + "</small>" : (x.origine ? "<br><small>" + esc(x.origine) + "</small>" : "")) +
            (!fatti && x.azione ? ' <button class="btn piccolo primario" data-azione="' + x.id + '">▶ Esegui ora</button>' : "") + "</li>";
        }).join("") + "</ul>";
      }
      function collega(s) {
        CD.$("#int-nuova", el).onclick = function () {
          corpo.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div><p>Lettura di sensori e componenti…</p>';
          CD.cervello.stato("pensiero");
          I.nuova().then(function (n) {
            CD.cervello.stato(n.stato === "male" ? "errore" : "felice"); disegna();
            if (CD.neura && CD.neura.dici) CD.neura.dici(n.guasti.length ? "Diagnosi pronta: ho trovato " + n.guasti.length + " punti da controllare e preparato " + n.lavori.length + " lavori." :
              "Diagnosi pronta: nessun guasto in arrivo. Ho preparato " + n.lavori.length + " controlli di routine.");
          }, function (e) { corpo.innerHTML = '<div class="avviso male">Diagnosi non riuscita: ' + esc(e.message) + "</div>"; CD.cervello.stato("errore"); });
        };
        CD.$$("[data-apri]", el).forEach(function (b) { b.onclick = function () { I.dati.corrente = b.getAttribute("data-apri"); salva(); disegna(); window.scrollTo(0, 0); }; });
        CD.$$("[data-togli]", el).forEach(function (b) {
          b.onclick = function () { CD.conferma("Eliminare la scheda?", "La scheda " + esc(b.getAttribute("data-togli")) + " sarà tolta dall'archivio.", "Elimina").then(function (ok) {
            if (!ok) return; I.dati.schede = I.dati.schede.filter(function (x) { return x.codice !== b.getAttribute("data-togli"); }); salva(); disegna(); }); };
        });
        if (!s) return;
        CD.$("#int-st1", el).onclick = function () { I.stampaDiagnosi(s); };
        CD.$("#int-st2", el).onclick = function () { I.stampaEseguiti(s); };
        ["cliente", "tecnico", "note"].forEach(function (k) { CD.$("#int-" + k, el).onchange = function () { s[k] = this.value; salva(); }; });
        function segna(l, fatto, nota) { l.fatto = fatto; l.quando = fatto ? quando() : ""; if (nota != null) l.nota = nota;
          if (s.lavori.every(function (x) { return x.fatto; })) s.chiusa = quando(); else s.chiusa = ""; salva(); disegna(); }
        CD.$$("[data-fatto]", el).forEach(function (c) {
          c.onchange = function () {
            var l = CD.uno(s.lavori, function (x) { return x.id === c.getAttribute("data-fatto"); });
            if (!c.checked) return segna(l, false, "");
            CD.modale({ titolo: "Lavoro eseguito", html: "<p>" + esc(l.testo) + '</p><label>Esito o note (facoltativo)<input id="int-esito" placeholder="es. pasta termica Arctic MX-4, temperatura scesa a 62 °C"></label>',
              pulsanti: [{ testo: "Annulla", valore: null }, { testo: "✔ Segna come fatto", valore: "si", classe: "primario" }],
              dopo: function (m) { m._esito = CD.$("#int-esito", m); I._esito = m._esito; } }).then(function (v) {
                if (v) segna(l, true, I._esito ? I._esito.value : ""); else c.checked = false; });
          };
        });
        CD.$$("[data-azione]", el).forEach(function (b) {
          b.onclick = function () {
            var l = CD.uno(s.lavori, function (x) { return x.id === b.getAttribute("data-azione"); });
            CD.esegui(l.azione).then(function (j) {
              if (j.stato === "fatto") segna(l, true, "eseguito dal Consulente Digitale" + (j.voci.length ? " · " + j.voci.length + " elementi" : ""));
              if (l.azione === "disco_salute" && CD.hw.leggiArchivio) CD.hw.leggiArchivio().then(function (a) { a.disco = { voci: j.voci, quando: quando() }; CD.salva("hardware", a); });
            }, function () {});
          };
        });
        CD.$("#int-aggiungi", el).onclick = function () {
          var t = CD.$("#int-nuovo", el).value.trim(); if (!t) return;
          s.lavori.push({ id: nuovoId(), testo: t, priorita: CD.$("#int-prio", el).value, componente: "", azione: "", origine: "aggiunto a mano", fatto: false }); salva(); disegna();
        };
        CD.$("#int-nuovo", el).onkeydown = function (e) { if (e.key === "Enter") CD.$("#int-aggiungi", el).click(); };
      }
    }
  });
})();
