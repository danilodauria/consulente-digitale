/* ==========================================================================
 *  CONSULENTE DIGITALE - Kit di emergenza e Neura Soccorso
 *  «kit»: prepara una chiavetta avviabile con SystemRescue (system-rescue.org, GPL) e Neura Soccorso.
 *  «soccorso»: la pagina che parte dalla chiavetta: diagnosi del PC che non si avvia, causa più probabile spiegata
 *  in parole semplici, riparazioni con un clic (solo quelle proposte dalla diagnosi), «Ripara tutto ciò che è sicuro».
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc, giro = null;

  function dim(b) { return b >= 1e9 ? CD.arrotonda(b / 1e9, b < 1e10 ? 1 : 0) + " GB" : CD.arrotonda(b / 1e6, 0) + " MB"; }

  /* ------------------------------------------------------------------ Kit di emergenza */
  CD.registra("kit", {
    titolo: "Kit di emergenza",
    mostra: function (el) {
      el.innerHTML = CD.titolo("🚑", "Kit di emergenza", "Una chiavetta che fa partire anche i computer che non si avviano, con Neura pronta ad aiutare") +
        '<div class="griglia-2"><div class="scheda"><h3>Cosa c\'è sulla chiavetta</h3><ul>' +
        "<li><b>Neura Soccorso</b>: capisce perché il PC non parte (disco, avvio, aggiornamenti bloccati, Windows ibernato…) e ripara con un clic.</li>" +
        "<li><b>Salvadati</b>: recupera foto e documenti anche se Windows non si avvia più.</li>" +
        "<li><b>SystemRescue</b> " + '<small>(system-rescue.org, software libero GPL)</small>: il sistema di soccorso con tanti strumenti dei tecnici.</li></ul>' +
        '<ol class="passi-kit"><li>Prendete una chiavetta da <b>almeno 4 GB</b> (verrà cancellata).</li><li>Scegliete qui sotto la chiavetta e premete «Crea».</li>' +
        "<li>Il programma scarica SystemRescue (1,3 GB) dal sito ufficiale, controlla che sia integro e prepara la chiavetta.</li>" +
        "<li>Tenetela in un cassetto: quando un PC non parte, inseritela e accendete con il tasto del menu di avvio (F12, F11, F9, Esc…).</li></ol></div>" +
        '<div class="scheda" id="kit-unita"><h3>💾 Scegliete la chiavetta</h3><div class="barra-progresso indeterminata"><i></i></div></div></div>' +
        '<div class="scheda luce"><h3>🪟 Unità di ripristino di Windows</h3><p>In più, Windows può creare una sua chiavetta di ripristino (16 GB): serve per reinstallare o per «Ripristino all\'avvio».</p>' +
        '<button class="btn" id="kit-win">🪟 Crea l\'unità di ripristino di Windows</button></div>' +
        '<details class="scheda"><summary><b>Se la chiavetta non parte</b></summary><ul><li>Nel BIOS/UEFI (tasto F2 o Canc all\'accensione) disattivate «Secure Boot», avviate dalla chiavetta e alla fine riattivatelo.</li>' +
        "<li>La chiavetta creata da Windows parte sui PC con UEFI (quasi tutti quelli dal 2012); quella creata da Linux, quando possibile, anche sui PC più vecchi (BIOS).</li>" +
        "<li>Dal Mac non si può creare: usate un PC Windows o Linux.</li></ul></details>" +
        '<p class="piccolo-testo">La pagina di soccorso si vede così: <a href="#/soccorso">🚑 Neura Soccorso</a>.</p>';
      var bw = CD.$("#kit-win", el);
      if (!CD.azioni || !CD.azioni.kit_ripristino_windows) bw.parentNode.style.display = "none";
      else bw.onclick = function () { CD.esegui("kit_ripristino_windows").catch(function () {}); };
      carica(el);
    }
  });

  function carica(el) {
    var box = CD.$("#kit-unita", el);
    if (!CD.server) { box.innerHTML = '<h3>💾 Scegliete la chiavetta</h3><div class="avviso">Il kit si crea con il programma installato sul computer.</div>'; return; }
    CD.api("/api/kit/unita").then(function (r) {
      if (!r.info.supportato) { box.innerHTML = '<h3>💾 Scegliete la chiavetta</h3><div class="avviso att">Dal Mac la chiavetta non si può creare: usate un PC con Windows o Linux.</div>'; return; }
      var adatte = r.unita.filter(function (u) { return u.adatta; });
      box.innerHTML = '<h3>💾 Scegliete la chiavetta</h3>' + (r.unita.length ? r.unita.map(function (u) {
        var dentro = u.partizioni.length ? u.partizioni.map(function (p) { return esc(p.nome) + (p.etichetta ? " «" + esc(p.etichetta) + "»" : ""); }).join(", ") : "vuota";
        return '<label class="scelta' + (u.adatta ? "" : " disattiva") + '"><input type="radio" name="kit-u" value="' + esc(u.id) + '"' + (u.adatta ? "" : " disabled") + "> 🔌 <span><b>" + esc(u.nome || u.id) +
          "</b> · " + dim(u.dimensione) + " · " + esc(u.bus) + "<br><small>" + (u.adatta ? "Contiene: " + dentro : esc(u.motivo)) + "</small></span></label>"; }).join("") : '<p class="vuoto">Nessuna unità trovata.</p>') +
        (adatte.length ? "" : '<div class="avviso">Inserite una chiavetta da almeno 4 GB e premete «Aggiorna».</div>') +
        '<div class="riga"><button class="btn primario grande" id="kit-crea"' + (adatte.length ? "" : " disabled") + '>🚑 Crea la chiavetta di emergenza</button><button class="btn" id="kit-agg">🔄 Aggiorna</button></div>' +
        '<p class="piccolo-testo">SystemRescue ' + esc(r.info.versione) + " · " + dim(r.info.dimensione) + " · verificato con SHA-256</p>";
      if (adatte.length === 1) CD.$('input[name="kit-u"]:not([disabled])', box).checked = true;
      CD.$("#kit-agg", box).onclick = function () { box.innerHTML = '<h3>💾 Scegliete la chiavetta</h3><div class="barra-progresso indeterminata"><i></i></div>'; carica(el); };
      CD.$("#kit-crea", box).onclick = function () {
        var s = CD.$('input[name="kit-u"]:checked', box);
        if (!s) { CD.avviso("Scegliete la chiavetta", "att"); return; }
        var u = r.unita.filter(function (x) { return x.id === s.value; })[0];
        CD.api("/api/kit/piano", { disco: s.value }).then(function (p) {
          return CD.esegui("kit_crea", p.piano.id, { nota: '<div class="avviso male">Verrà <b>CANCELLATA</b>: <b>' + esc(u.nome) + "</b> (" + dim(u.dimensione) + ").<br>Tutto quello che contiene andrà perso.</div>" });
        }).catch(function (e) { if (e.message !== "annullato") CD.avviso(esc(e.message), "male", 8000); });
      };
    }, function (e) { box.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; });
  }

  /* ------------------------------------------------------------------ Neura Soccorso */
  CD.registra("soccorso", {
    titolo: "Neura Soccorso",
    mostra: function (el) {
      el.innerHTML = CD.titolo("🚑", "Neura Soccorso", "Capisco perché il computer non si avvia e provo a ripararlo") + '<div id="sc-corpo"></div>';
      var c = CD.$("#sc-corpo", el);
      if (!CD.server || !CD.stato.soccorso) {
        c.innerHTML = '<div class="scheda luce"><p>Questa pagina lavora dalla <b>chiavetta di emergenza</b>: avviate da lì il PC che non parte e Neura Soccorso si apre da sola.</p>' +
          '<button class="btn primario" onclick="CD.vai(\'#/kit\')">🚑 Prepara la chiavetta</button></div>';
        return;
      }
      diagnosi(c);
    },
    esci: function () { clearTimeout(giro); }
  });

  function diagnosi(c) {
    c.innerHTML = '<div class="scheda"><h3>🔎 Diagnosi in corso</h3><div class="barra-progresso indeterminata"><i></i></div><p class="piccolo-testo">Controllo dischi, partizioni, file system e avvio. Non cambio nulla.</p></div>';
    CD.cervello.stato("pensiero");
    CD.api("/api/soccorso/diagnosi").then(function (d) {
      var sicure = d.problemi.filter(function (p) { return p.riparazione && p.rischio === "basso"; });
      CD.cervello.stato(d.problemi.some(function (p) { return p.gravita === "grave"; }) ? "errore" : "felice");
      c.innerHTML = '<div class="scheda luce"><p class="sintesi-neura">🧠 ' + esc(d.sintesi) + "</p>" +
        (d.prova ? '<p class="piccolo-testo">(Diagnosi di prova)</p>' : "") +
        '<p class="piccolo-testo">Sistemi trovati: ' + (d.sistemi.length ? d.sistemi.map(function (s) { return esc(s.nome) + " (" + esc(s.dev) + ")"; }).join(", ") : "nessuno") +
        " · Dischi: " + d.dischi.map(function (x) { return esc(x.nome || x.dev) + " " + dim(x.dimensione) + (x.smart === false ? " ⚠️" : ""); }).join(", ") + " · Avvio " + (d.uefi ? "UEFI" : "BIOS") + "</p>" +
        '<div class="riga">' + (sicure.length ? '<button class="btn primario grande" id="sc-tutto">🪄 Ripara tutto ciò che è sicuro (' + sicure.length + ")</button>" : "") +
        '<button class="btn" id="sc-ripeti">🔄 Ripeti la diagnosi</button><button class="btn" id="sc-riavvia">🔁 Riavvia il PC</button></div></div>' +
        d.problemi.map(function (p) {
          return '<div class="problema ' + p.gravita + '"><h4>' + ({ grave: "🔴", medio: "🟠", info: "🔵" }[p.gravita] || "") + " " + esc(p.titolo) + "</h4><p>" + esc(p.spiegazione) + "</p><p><b>Soluzione:</b> " + esc(p.soluzione) + "</p>" +
            (p.riparazione ? '<button class="btn" data-k="' + esc(p.chiave) + '">🔧 Ripara' + (p.rischio === "medio" ? " (con cautela)" : "") + "</button>" : "") +
            (p.tipo === "smart" || p.tipo === "nessun_sistema" ? ' <button class="btn" onclick="CD.vai(\'#/recupero\')">🛟 Salvadati</button>' : "") + "</div>";
        }).join("") +
        '<div id="sc-lavoro"></div><div class="griglia-2"><div class="scheda"><h3>🛟 Salvadati</h3><p>Copiate foto e documenti su un disco esterno prima di ogni riparazione importante.</p><button class="btn" onclick="CD.vai(\'#/recupero\')">🛟 Recupera i file</button></div>' +
        '<div class="scheda"><h3>🛡️ Antivirus</h3><p>Controllo del disco con il PC spento: i virus non possono nascondersi.</p><button class="btn" onclick="CD.vai(\'#/antivirus\')">🛡️ Antivirus</button></div></div>';
      if (CD.neura && CD.neura.dici) CD.neura.dici(d.sintesi + (sicure.length ? " Posso sistemare io le cose sicure: premete «Ripara tutto ciò che è sicuro»." : ""));
      CD.$("#sc-ripeti", c).onclick = function () { diagnosi(c); };
      CD.$("#sc-riavvia", c).onclick = function () {
        CD.conferma("Riavviare il PC?", "<p>Togliete la chiavetta quando lo schermo si spegne, così parte il sistema del disco.</p>", "🔁 Riavvia").then(function (ok) { if (ok) CD.api("/api/soccorso/riavvia", {}); });
      };
      var bt = CD.$("#sc-tutto", c);
      if (bt) bt.onclick = function () { ripara(c, { tutte_sicure: true }, "Riparo " + sicure.length + " problemi sicuri: " + sicure.map(function (p) { return p.titolo; }).join("; ") + "."); };
      CD.$$("[data-k]", c).forEach(function (b) {
        b.onclick = function () {
          var p = d.problemi.filter(function (x) { return x.chiave === b.getAttribute("data-k"); })[0];
          ripara(c, { chiavi: [p.chiave] }, "<b>" + esc(p.titolo) + "</b><br>" + esc(p.soluzione) + (p.rischio === "medio" ? '<div class="avviso att">⚠️ Intervento con cautela: se ci sono file importanti, salvateli prima con Salvadati.</div>' : ""));
        };
      });
    }, function (e) { CD.cervello.stato("errore"); c.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; });
  }

  function ripara(c, corpo, testo) {
    CD.conferma("🔧 Riparazione", "<p>" + testo + "</p>", "🔧 Ripara").then(function (ok) {
      if (!ok) return;
      CD.api("/api/soccorso/ripara", corpo).then(function () { segui(c); }, function (e) { CD.avviso(esc(e.message), "male", 7000); });
    });
  }

  function segui(c) {
    clearTimeout(giro);
    CD.api("/api/soccorso/stato").then(function (s) {
      var box = CD.$("#sc-lavoro", c);
      if (!box) return;
      box.innerHTML = '<div class="scheda"><h3>' + (s.fase === "in_corso" ? "🔧 Riparazione in corso" : "✅ Riparazione finita") + "</h3>" +
        (s.fase === "in_corso" ? '<div class="barra-progresso indeterminata"><i></i></div>' : "") + '<div class="console">' + s.righe.map(esc).join("\n") + "</div>" +
        (s.fase === "fatto" ? "<p>Riuscite: <b>" + s.fatti.length + "</b>" + (s.falliti.length ? " · non riuscite: <b>" + s.falliti.length + "</b>" : "") + '. Ora riavviate il PC <b>senza la chiavetta</b>.</p><button class="btn" id="sc-di-nuovo">🔄 Nuova diagnosi</button>' : "") + "</div>";
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
      if (s.fase === "in_corso") { giro = setTimeout(function () { segui(c); }, 800); return; }
      CD.cervello.stato(s.falliti.length ? "errore" : "felice");
      if (CD.neura && CD.neura.dici) CD.neura.dici(s.falliti.length ? "Alcune riparazioni non sono riuscite: guardate il registro." : "Fatto! Ora riavviate il computer togliendo la chiavetta.");
      var b = CD.$("#sc-di-nuovo", box); if (b) b.onclick = function () { diagnosi(c); };
    });
  }
})();
