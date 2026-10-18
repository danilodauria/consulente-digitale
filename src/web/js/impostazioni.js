/* ==========================================================================
 *  CONSULENTE DIGITALE - Impostazioni: profilo, aspetto, voce, microfono, cervello (IA locale),
 *  Internet e automatismi, informazioni sul programma.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var MODELLI = [["qwen3.5:0.8b", "Leggerissimo (meno di 6 GB di RAM)"], ["qwen3.5:2b", "Leggero (6-8 GB)"], ["qwen3.5:4b", "Equilibrato (8-16 GB)"],
    ["qwen3.5:9b", "Bravo (16-24 GB)"], ["gemma4:12b", "Il più bravo (24 GB o più)"]];

  function sezioneIA() {
    var ia = CD.neura.ia;
    if (!CD.server) return '<p class="avviso att">Il cervello locale si installa con il programma sul computer.</p>';
    var modelli = ia.modelli || [];
    return '<p>Neura pensa con <b>Ollama</b>, un motore di intelligenza artificiale che gira <b>sul computer</b>: funziona anche senza Internet e quello che dite non esce da qui.</p>' +
      '<div class="riga"><span class="etichetta ' + (ia.attivo ? "ok" : ia.installato ? "att" : "") + '">' + (ia.attivo ? "✔ attivo" : ia.installato ? "installato, senza modello o spento" : "non installato") + "</span>" +
      '<span class="etichetta">RAM: ' + CD.gb(ia.ram_mb) + " GB · modello consigliato: <b>" + esc(ia.consigliato || "") + "</b></span></div>" +
      '<ol class="lista-semplice passi-ia"><li>' + (ia.installato ? "✔ Motore installato" : '<button class="btn primario" data-ia="installa">⬇️ Installa il motore (Ollama)</button>') + "</li>" +
      "<li>Scaricate il cervello adatto a questo computer (1-8 GB, una volta sola):<div class=\"opzioni verticali\">" + MODELLI.map(function (m) {
        var c = m[0] === ia.consigliato, ha = modelli.indexOf(m[0]) >= 0;
        return '<div class="riga"><button class="btn piccolo' + (c ? " primario" : "") + '" data-mod="' + m[0] + '"' + (ha ? " disabled" : "") + ">" + (ha ? "✔ " : "📥 ") + esc(m[0]) + "</button><small>" + esc(m[1]) + (c ? " · <b>consigliato</b>" : "") + "</small></div>"; }).join("") +
      '</div></li><li>Scegliete quale usare: <select id="imp-modello"><option value="">Automatico</option>' + modelli.map(function (m) { return '<option value="' + esc(m) + '"' + (CD.imp.modelloIA === m ? " selected" : "") + ">" + esc(m) + "</option>"; }).join("") + "</select></li></ol>" +
      '<div class="riga"><button class="btn" id="imp-ia-ric">🔄 Ricontrolla</button><input id="imp-mod-altro" placeholder="Altro modello (es. llama3.2:3b)" style="max-width:16rem"><button class="btn" id="imp-mod-altro-b">📥 Scarica</button></div>';
  }

  /* app per telefono e tablet: stessa interfaccia, pubblicata sul sito; si installa dal browser */
  function telefono() {
    var url = (CD.LICENZA ? CD.LICENZA.sito : "https://danilodauria.github.io/consulente-digitale/") + "app/";
    return '<div class="scheda" id="imp-telefono"><h2>📱 App per telefono e tablet</h2>' +
      '<p>Il Consulente Digitale si usa anche su Android, iPhone e iPad: aprite <a href="' + CD.esc(url) + '" target="_blank" rel="noopener">' + CD.esc(url) + '</a> e installatelo.</p>' +
      '<ul><li><b>🤖 Android</b> (Chrome): menu ⋮ → «Installa app» o «Aggiungi a schermata Home».</li>' +
      '<li><b>🍎 iPhone e iPad</b> (Safari): «Condividi» ⬆️ → «Aggiungi alla schermata Home».</li></ul>' +
      '<p class="piccolo-testo">Sul telefono funzionano Neura, notizie, acquisti, economia circolare, cose da sapere, storia, lingue e backup. Le azioni sul sistema restano al programma per computer. Per portare i dati: «Crea un backup» qui e «Importa un backup» sul telefono (e viceversa).</p></div>';
  }

  CD.registra("impostazioni", {
    titolo: "Impostazioni",
    mostra: function (el, parti) {
      var p = CD.profilo, voci = CD.vociSistema(), vs = CD.stato.voci_server || [];
      el.innerHTML = CD.titolo("⚙️", "Impostazioni", "Tutto si può cambiare quando volete") +
        '<div class="griglia-2"><div class="scheda"><h2>👤 Chi usa il programma</h2><p>' + (p ? (CD.TIPI[p.tipo] || {}).icona + " <b>" + esc(p.nome || (CD.TIPI[p.tipo] || {}).nome) + "</b> · " + esc((CD.TIPI[p.tipo] || {}).nome) + (p.quanti > 1 ? " · " + p.quanti + " persone/postazioni" : "") : "Non ancora scelto") +
        '</p><a class="btn" href="#/benvenuto">✏️ Cambia</a>' +
        '<div class="campo" style="margin-top:1rem"><label for="imp-nome">Come vi chiama Neura</label><input id="imp-nome" value="' + esc(CD.imp.nomeUtente) + '" maxlength="40"></div></div>' +
        '<div class="scheda"><h2>🎨 Aspetto</h2><div class="opzioni">' + [["notte", "🌌 Notte"], ["giorno", "☀️ Giorno"], ["contrasto", "🔳 Alto contrasto"]].map(function (t) {
          return '<label class="opzione"><input type="radio" name="imp-tema" value="' + t[0] + '"' + (CD.imp.tema === t[0] ? " checked" : "") + "> " + t[1] + "</label>"; }).join("") + "</div>" +
        '<div class="campo"><label for="imp-testo">Dimensione del testo: <b id="imp-testo-v">' + CD.imp.testo + '</b></label><input type="range" id="imp-testo" min="14" max="28" value="' + CD.imp.testo + '"></div>' +
        '<label class="opzione"><input type="checkbox" id="imp-anim"' + (CD.imp.animazioni !== "piene" ? " checked" : "") + "> 🐢 Animazioni leggere (PC lenti)</label></div></div>" +
        '<div class="griglia-2"><div class="scheda"><h2>🔊 Voce di Neura</h2><label class="opzione"><input type="checkbox" id="imp-voce"' + (CD.imp.voce ? " checked" : "") + "> Legge le risposte ad alta voce</label>" +
        '<div class="campo"><label for="imp-voce-id">Voce</label><select id="imp-voce-id"><option value="auto">Automatica (la più naturale disponibile)</option>' +
        vs.map(function (v) { return '<option value="server:' + v.id + '"' + (CD.imp.voceId === "server:" + v.id ? " selected" : "") + ">" + esc(v.nome) + " — sul computer</option>"; }).join("") +
        voci.map(function (v) { return '<option value="' + esc(v.voiceURI) + '"' + (CD.imp.voceId === v.voiceURI ? " selected" : "") + ">" + esc(v.name) + (v.localService === false || /online|natural|google/i.test(v.name) ? " (online: il testo va a " + (/google/i.test(v.name) ? "Google" : "Microsoft") + ")" : "") + "</option>"; }).join("") + "</select></div>" +
        '<div class="campo"><label for="imp-vel">Velocità: <b id="imp-vel-v">' + CD.imp.velocitaVoce + '</b></label><input type="range" id="imp-vel" min="0.6" max="1.6" step="0.05" value="' + CD.imp.velocitaVoce + '"></div>' +
        '<button class="btn" id="imp-prova">▶ Prova la voce</button>' + (voci.length ? "" : '<p class="piccolo-testo">Nessuna voce italiana nel browser: su Linux installate «speech-dispatcher» ed «espeak-ng», oppure Piper (anche quello del Professore Digitale).</p>') + "</div>" +
        '<div class="scheda"><h2>🎤 Microfono</h2><p>Motore: <b>' + ({ locale: "trascrizione sul computer (nulla esce dal PC)", browser: "riconoscimento del browser (la voce va a Google/Microsoft, solo con il vostro consenso)", "": "non disponibile" }[CD.motoreAscolto()]) + "</b></p>" +
        (CD.imp.micConsenso ? '<button class="btn" id="imp-mic-off">🔇 Revoca il consenso al riconoscimento del browser</button>' : "") +
        '<label class="opzione"><input type="checkbox" id="imp-mani"' + (CD.imp.maniLibere ? " checked" : "") + "> 🙌 Conversazione a mani libere (dopo la risposta Neura ascolta di nuovo)</label>" +
        '<p class="piccolo-testo">Trascrizione sul computer: installate <b>Vosk</b> o <b>faster-whisper</b> per Python e mettete il modello nella cartella <code>' + esc((CD.stato.dati || "") + "/modelli") + '</code> (come nel Professore Digitale). Scorciatoia: Ctrl + Spazio.</p></div></div>' +
        '<div class="scheda" id="sez-ia"><h2>🧠 Cervello (IA locale)</h2><div id="imp-ia">' + sezioneIA() + "</div></div>" +
        '<div class="griglia-2"><div class="scheda"><h2>🌐 Internet e automatismi</h2>' +
        '<label class="opzione"><input type="checkbox" id="imp-online"' + (CD.imp.online ? " checked" : "") + "> 🌐 Il programma può usare Internet (ora esatta, link alle offerte, aggiornamenti)</label>" +
        '<label class="opzione"><input type="checkbox" id="imp-ora"' + (CD.imp.oraInternet ? " checked" : "") + "> 🕰️ Ora esatta da Internet (INRiM, NTP)</label>" +
        '<label class="opzione"><input type="checkbox" id="imp-auto"' + (CD.imp.automatico ? " checked" : "") + "> 🤖 Neura avvia da sola i controlli che non cambiano nulla</label>" +
        '<label class="opzione"><input type="checkbox" id="imp-notizie"' + (CD.imp.notizie ? " checked" : "") + "> 📰 Notizie dal mondo digitale (si scaricano solo dai siti delle testate)</label>" +
        '<label class="opzione"><input type="checkbox" id="imp-saluto"' + (CD.imp.saluto ? " checked" : "") + "> 👋 Saluto all'avvio</label>" +
        '<p class="piccolo-testo">Senza il vostro clic il programma non installa e non modifica nulla. Nessun dato viene inviato all\'autore: niente telemetria.</p></div>' +
        '<div class="scheda"><h2>ℹ️ Informazioni</h2><table class="tab"><tr><th>Versione</th><td>' + esc(CD.stato.versione || CD.versione) + "</td></tr><tr><th>Sistema</th><td>" + esc(CD.stato.nome_sistema || CD.nomeSistema()) + "</td></tr>" +
        "<tr><th>Python</th><td>" + esc(CD.stato.python || "—") + "</td></tr><tr><th>Dati</th><td><code>" + esc(CD.stato.dati || "browser") + "</code></td></tr></table>" +
        '<div class="riga" style="margin-top:.8rem"><button class="btn" id="imp-cron">🧹 Cancella la conversazione</button>' + (CD.server ? '<button class="btn rosso" id="imp-spegni">⏻ Chiudi il programma</button>' : "") + "</div></div></div>" +
        (CD.backup ? CD.backup.riquadro() : "") + telefono();

      function salva() { CD.salvaImpostazioni(); }
      CD.$("#imp-nome", el).onchange = function () { CD.imp.nomeUtente = this.value.trim(); salva(); };
      CD.$$('input[name="imp-tema"]', el).forEach(function (r) { r.onchange = function () { CD.imp.tema = this.value; salva(); }; });
      CD.$("#imp-testo", el).oninput = function () { CD.imp.testo = +this.value; CD.$("#imp-testo-v", el).textContent = this.value; salva(); };
      CD.$("#imp-anim", el).onchange = function () { CD.imp.animazioni = this.checked ? "leggere" : "piene"; salva(); };
      CD.$("#imp-voce", el).onchange = function () { CD.imp.voce = this.checked; salva(); };
      CD.$("#imp-voce-id", el).onchange = function () { CD.imp.voceId = this.value; salva(); };
      CD.$("#imp-vel", el).oninput = function () { CD.imp.velocitaVoce = +this.value; CD.$("#imp-vel-v", el).textContent = this.value; salva(); };
      CD.$("#imp-prova", el).onclick = function () { CD.parla("Ciao! Sono Neura, il cervello digitale del Consulente Digitale. Come vi sembra la mia voce?", { sempre: true }); };
      var mo = CD.$("#imp-mic-off", el); if (mo) mo.onclick = function () { CD.imp.micConsenso = false; salva(); CD.mostraVista(); };
      CD.$("#imp-mani", el).onchange = function () { CD.imp.maniLibere = this.checked; salva(); };
      CD.$("#imp-online", el).onchange = function () { CD.imp.online = this.checked; salva(); CD.controllaRete(); CD.sincronizzaOra(); };
      CD.$("#imp-ora", el).onchange = function () { CD.imp.oraInternet = this.checked; salva(); CD.sincronizzaOra(); };
      CD.$("#imp-auto", el).onchange = function () { CD.imp.automatico = this.checked; salva(); };
      CD.$("#imp-notizie", el).onchange = function () { CD.imp.notizie = this.checked; salva(); };
      CD.$("#imp-saluto", el).onchange = function () { CD.imp.saluto = this.checked; salva(); };
      if (CD.backup) CD.backup.collega(el);
      if (parti[0] === "backup") setTimeout(function () { var s = CD.$("#sez-backup"); if (s) s.scrollIntoView({ behavior: "smooth" }); }, 100);
      CD.$("#imp-cron", el).onclick = function () { CD.neura.storia = []; CD.salva("cronologia", []); CD.avviso("Conversazione cancellata.", "ok"); };
      var sp = CD.$("#imp-spegni", el);
      if (sp) sp.onclick = function () { CD.conferma("Chiudere il Consulente Digitale?", "<p>Il programma si chiude. Per riaprirlo usate l'icona sul desktop o nel menu.</p>", "⏻ Chiudi").then(function (s) {
        if (s) CD.api("/api/spegni", {}).then(function () { document.body.innerHTML = '<div style="display:grid;place-items:center;height:100vh;font-size:1.4rem">👋 Arrivederci! Potete chiudere questa finestra.</div>'; window.close(); }); }); };
      function legaIA() {
        var box = CD.$("#imp-ia", el);
        CD.$$("[data-ia]", box).forEach(function (b) { b.onclick = function () { CD.esegui("ia_installa").then(function () { CD.neura.controllaIA().then(function () { box.innerHTML = sezioneIA(); legaIA(); }); }, function () {}); }; });
        CD.$$("[data-mod]", box).forEach(function (b) { b.onclick = function () { scarica(b.getAttribute("data-mod")); }; });
        var s = CD.$("#imp-modello", box); if (s) s.onchange = function () { CD.imp.modelloIA = this.value; salva(); CD.neura.controllaIA(); };
        var r = CD.$("#imp-ia-ric", box); if (r) r.onclick = function () { CD.neura.controllaIA().then(function () { box.innerHTML = sezioneIA(); legaIA(); }); };
        var a = CD.$("#imp-mod-altro-b", box); if (a) a.onclick = function () { var v = CD.$("#imp-mod-altro", box).value.trim().toLowerCase(); if (v) scarica(v); };
        function scarica(m) { CD.esegui("ia_modello", m, { nota: "Modello: <b>" + esc(m) + "</b>. Serve Internet; il download può durare a lungo." }).then(function () { CD.neura.controllaIA().then(function () { box.innerHTML = sezioneIA(); legaIA(); }); }, function () {}); }
      }
      legaIA();
      if (parti[0] === "ia") setTimeout(function () { var s = CD.$("#sez-ia"); if (s) s.scrollIntoView({ behavior: "smooth" }); }, 100);
    }
  });
})();
