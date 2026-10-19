/* ==========================================================================
 *  CONSULENTE DIGITALE - NONNI TEACH
 *  Neura intervista i nonni (centro anziani, scuola primaria, biblioteca, famiglia…): legge le domande con la
 *  sua voce, registra le risposte dal microfono, le salva sul computer e monta il podcast con i capitoli.
 *  Poi prepara il sito del podcast (pagina + feed RSS) da pubblicare su GitHub Pages, e lo fa ascoltare
 *  anche da qui. Nulla esce dal computer senza che lo carichiate voi; si pubblica solo con il consenso scritto.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var NT = CD.nonniTeach = { stato: null, prefs: null };
  var reg = null;       // registrazione in corso {rec, stream, ctx, pezzi, inizio, timer}

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  NT.testo = function (q, ep) {
    var t = q.replace(/\{luogo\}/g, ep.luogo || "il tuo quartiere");
    t = ep.intervistato ? t.replace(/\{nome\}/g, ep.intervistato) : t.replace(/^\{nome\},\s*/, "").replace(/\s*\{nome\}/g, "");
    return cap(t);
  };
  function mescola(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  /* sceglie le domande: apertura + temi a rotazione + una del contesto + chiusura */
  NT.scegli = function (ep, temi, quante) {
    var N = CD.NONNI, out = [], usati = {};
    N.apertura.forEach(function (q) { out.push({ testo: q, tema: "apertura" }); });
    var mazzi = temi.map(function (t) { return { t: t, d: mescola(N.temi[t].d) }; }), ctx = mescola((N.contesti[ep.contesto] || {}).extra || []);
    var corpo = Math.max(1, quante - out.length - N.chiusura.length), giro = 0;
    if (ctx.length) { out.push({ testo: ctx[0], tema: "contesto" }); corpo--; }
    while (corpo > 0 && mazzi.some(function (m) { return m.d.length; })) {
      var m = mazzi[giro++ % mazzi.length];
      if (!m.d.length) continue;
      var q = m.d.shift(); if (usati[q]) continue; usati[q] = 1;
      out.push({ testo: q, tema: m.t }); corpo--;
    }
    N.chiusura.forEach(function (q) { out.push({ testo: q, tema: "chiusura" }); });
    return out.map(function (x) { return { testo: NT.testo(x.testo, ep), tema: x.tema, nota: "" }; });
  };
  NT.altra = function (ep, tema, gia) {
    var N = CD.NONNI, pool = tema && N.temi[tema] ? N.temi[tema].d : [].concat.apply([], Object.keys(N.temi).map(function (k) { return N.temi[k].d; }));
    var libere = pool.map(function (q) { return NT.testo(q, ep); }).filter(function (q) { return gia.indexOf(q) < 0; });
    return libere.length ? libere[Math.floor(Math.random() * libere.length)] : null;
  };

  function api(p, corpo) { return CD.api(p, corpo); }
  function salvaEp(ep) { return api("/api/nonni/salva", { episodio: ep }).then(function (e) { ep.id = e.id; ep.data = e.data; return e; }); }
  function urlFile(id, nome) { return "/api/nonni/" + encodeURIComponent(id) + "/file/" + encodeURIComponent(nome) + "?v=" + Date.now(); }

  /* ------------------------------------------------------------------ registrazione dal microfono */
  function formato() {
    var c = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4"];
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < c.length; i++) if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(c[i])) return c[i];
    return "";
  }
  function avviaRegistrazione(livello, tempo) {
    var f = formato();
    if (f === null || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("questo browser non può registrare dal microfono"));
    if (CD.taci) CD.taci();
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      var rec = new MediaRecorder(stream, f ? { mimeType: f, audioBitsPerSecond: 64000 } : undefined), pezzi = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) pezzi.push(e.data); };
      rec.start(1000);
      var ctx = null, an = null, buf = null;
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(stream).connect(an); buf = new Uint8Array(an.fftSize); } catch (e) { ctx = null; }
      reg = { rec: rec, stream: stream, ctx: ctx, pezzi: pezzi, inizio: Date.now() };
      reg.timer = setInterval(function () {
        var s = Math.floor((Date.now() - reg.inizio) / 1000);
        if (tempo) tempo.textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
        if (an && livello) {
          an.getByteTimeDomainData(buf); var p = 0; for (var i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i] - 128));
          livello.style.width = Math.min(100, p / 1.1) + "%";
          if (CD.cervello && p > 18) CD.cervello.stato("ascolto");
        }
      }, 120);
      if (CD.cervello) CD.cervello.stato("ascolto");
    });
  }
  function fermaRegistrazione() {
    return new Promise(function (risolvi) {
      if (!reg) return risolvi(null);
      var r = reg; reg = null;
      clearInterval(r.timer);
      r.rec.onstop = function () {
        r.stream.getTracks().forEach(function (t) { t.stop(); });
        if (r.ctx) try { r.ctx.close(); } catch (e) { /* niente */ }
        risolvi(new Blob(r.pezzi, { type: (r.rec.mimeType || "audio/webm").split(";")[0] }));
      };
      try { r.rec.stop(); } catch (e) { risolvi(null); }
      if (CD.cervello) CD.cervello.stato("pensiero");
    });
  }
  NT.annulla = function () { if (reg) fermaRegistrazione(); };
  function carica(ep, n, blob) {
    return fetch("/api/nonni/" + encodeURIComponent(ep.id) + "/audio/" + n, { method: "POST", headers: { "Content-Type": blob.type || "audio/webm", "X-CD-Token": CD.stato.token }, body: blob })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.errore || "salvataggio non riuscito"); return j; }); });
  }

  /* ------------------------------------------------------------------ liberatoria da stampare */
  NT.stampaLiberatoria = function (ep) {
    ep = ep || {};
    var riga = "________________________________";
    var h = "<p>Il/La sottoscritto/a <b>" + (ep.intervistato ? esc(ep.intervistato) : riga) + "</b>, nato/a a " + riga + " il __________,</p>" +
      "<p>in relazione all'intervista del progetto <b>Nonni Teach</b> realizzata " + (ep.luogo ? "a <b>" + esc(ep.luogo) + "</b>" : "presso " + riga) +
      (ep.intervistatore ? " da <b>" + esc(ep.intervistatore) + "</b>" : "") + " in data " + CD.dataEstesa() + ",</p>" +
      "<h2>Dichiaro</h2><ol class=\"f-linea\"><li>di aver ricevuto spiegazioni chiare sullo scopo dell'intervista: conservare e trasmettere ricordi, saperi ed esperienze;</li>" +
      "<li>☐ di <b>acconsentire alla registrazione</b> della mia voce, che sarà conservata sul computer dell'ente/famiglia indicato;</li>" +
      "<li>☐ di <b>acconsentire alla pubblicazione</b> della registrazione (podcast su un sito Internet e sui canali dell'ente), con il nome: ☐ completo ☐ solo nome ☐ anonimo;</li>" +
      "<li>che la registrazione potrà essere diffusa con licenza Creative Commons BY-NC-SA 4.0 (uso non commerciale, citando la fonte);</li>" +
      "<li>di sapere che posso <b>ritirare il consenso</b> in qualsiasi momento, chiedendo la cancellazione della registrazione;</li>" +
      "<li>di essere informato/a che la voce è un dato personale, trattato secondo il Regolamento UE 2016/679 (GDPR) dal titolare indicato qui sotto, solo per le finalità del progetto.</li></ol>" +
      '<table class="f-tab"><tr><th>Titolare del trattamento (ente, scuola, associazione, famiglia)</th><td></td></tr><tr><th>Contatto per revoca e cancellazione</th><td></td></tr></table>' +
      '<p style="font-size:9pt">Se nella registrazione compaiono le voci di <b>minorenni</b> (per esempio gli alunni che fanno le domande), serve anche il consenso scritto di chi esercita la responsabilità genitoriale; ' +
      "in alternativa registrate solo la voce dell'adulto intervistato. Questo è un modello indicativo: adattatelo alle regole del vostro ente.</p>" +
      '<div class="f-firme"><div>Luogo e data<br><br>________________________</div><div>Firma della persona intervistata<br><br>________________________</div><div>Firma del responsabile del progetto<br><br>________________________</div></div>';
    CD.stampa("Liberatoria per registrazione e pubblicazione — Nonni Teach", h, { codice: CD.codiceScheda() });
  };
  NT.stampaScheda = function (ep) {
    var h = '<table class="f-tab"><tr><th>Persona intervistata</th><td>' + esc(ep.intervistato || "") + "</td></tr><tr><th>Luogo</th><td>" + esc(ep.luogo || "") +
      "</td></tr><tr><th>Contesto</th><td>" + esc(((CD.NONNI.contesti[ep.contesto] || {}).nome) || "") + "</td></tr><tr><th>Intervista di</th><td>" + esc(ep.intervistatore || "") +
      "</td></tr><tr><th>Consensi</th><td>registrazione " + (ep.consenso_registrare ? "sì" : "no") + " · pubblicazione " + (ep.consenso_pubblicare ? "sì" : "no") + "</td></tr></table>" +
      "<h2>Domande e appunti</h2><ol class=\"f-linea\">" + ep.domande.map(function (q) { return "<li><b>" + esc(q.testo) + "</b>" + (q.file ? " 🎙️" : "") + (q.nota ? "<br>" + esc(q.nota) : "<br><br>") + "</li>"; }).join("") + "</ol>";
    CD.stampa("Nonni Teach — " + (ep.titolo || "Intervista"), h, { codice: ep.id });
  };

  /* ------------------------------------------------------------------ pagina */
  var TAB = [["nuova", "🎙️ Nuova intervista"], ["archivio", "🗂️ Archivio"], ["pubblica", "🌐 Pubblica e ascolta"], ["liberatoria", "📄 Liberatoria"]];
  CD.registra("nonni", {
    titolo: "Nonni Teach",
    mostra: function (el, parti) {
      var tel = CD.telefono && CD.telefono.attivo, tabs = tel ? [["ascolta", "🎧 Ascolta i podcast"], ["liberatoria", "📄 Liberatoria"]] : TAB;
      var tab = parti[0] && CD.uno(tabs, function (t) { return t[0] === parti[0]; }) ? parti[0] : tabs[0][0];
      el.innerHTML = CD.titolo("🎙️", "Nonni Teach", "I nonni insegnano: Neura fa le domande, registra le risposte e crea il podcast da ascoltare e pubblicare") +
        '<div class="schede-tab" role="tablist">' + tabs.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + "</div>" +
        '<div id="nt-corpo"></div>';
      CD.$$("[data-tab]", el).forEach(function (b) { b.onclick = function () { NT.annulla(); CD.vai("#/nonni/" + b.getAttribute("data-tab")); }; });
      var c = CD.$("#nt-corpo", el);
      if (tab === "ascolta") { ascolta(c); return; }
      if (!CD.server && tab !== "liberatoria") { c.innerHTML = '<div class="avviso att">Nonni Teach registra e salva sul computer: serve il programma avviato sul computer.</div>'; return; }
      ({ nuova: nuova, archivio: archivio, pubblica: pubblica, liberatoria: liberatoria }[tab])(c, parti[1]);
    },
    esci: function () { NT.annulla(); }
  });

  /* ---------- 1) preparazione */
  function nuova(c, idRiprendi) {
    if (idRiprendi) { api("/api/nonni/" + encodeURIComponent(idRiprendi)).then(function (e) { intervista(c, e, 0); }, function (e) { c.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; }); return; }
    var N = CD.NONNI, ep = NT.stato || { contesto: CD.profilo && CD.profilo.tipo === "centro" ? "centro" : CD.profilo && CD.profilo.tipo === "scuola" ? "scuola" : "centro", intervistato: "", luogo: "", intervistatore: "",
      consenso_registrare: false, consenso_pubblicare: false };
    NT.stato = ep;
    var temiSel = (N.contesti[ep.contesto] || N.contesti.centro).temi.slice(), quante = 10;
    function disegna() {
      c.innerHTML = '<div class="avviso">💡 <b>Come funziona.</b> Scegliete dove vi trovate e chi intervistate; Neura prepara le domande (ne ha ' + N.totale() + " in " + Object.keys(N.temi).length +
        " temi), le legge ad alta voce e registra ogni risposta. Alla fine il podcast è pronto da ascoltare, stampare e, con il consenso, pubblicare.</div>" +
        "<h2>1. Dove siete?</h2><div class=\"griglia-schede\">" + Object.keys(N.contesti).map(function (k) { var x = N.contesti[k];
          return '<button class="tessera' + (ep.contesto === k ? " scelta" : "") + '" data-ctx="' + k + '"><span class="em">' + x.icona + "</span><b>" + esc(x.nome) + "</b><small>" + esc(x.testo) + "</small></button>"; }).join("") + "</div>" +
        "<h2>2. Chi intervistiamo?</h2><div class=\"griglia-2\"><label>Come lo chiamiamo nelle domande<input id=\"nt-nome\" placeholder=\"es. nonno Pippo, signora Maria\" value=\"" + esc(ep.intervistato) + "\"></label>" +
        "<label>Quartiere o paese<input id=\"nt-luogo\" placeholder=\"es. il quartiere San Lorenzo, Bagnoli\" value=\"" + esc(ep.luogo) + "\"></label>" +
        "<label>Chi fa l'intervista<input id=\"nt-chi\" placeholder=\"es. classe 4ª B, il nipote Luca, la biblioteca\" value=\"" + esc(ep.intervistatore) + "\"></label>" +
        "<label>Quante domande<select id=\"nt-quante\">" + [6, 8, 10, 12, 16, 20].map(function (n) { return "<option" + (n === quante ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select></label></div>" +
        "<h2>3. Di cosa parliamo?</h2><div class=\"opzioni\">" + Object.keys(N.temi).map(function (k) {
          return '<label class="opzione"><input type="checkbox" data-tema="' + k + '"' + (temiSel.indexOf(k) >= 0 ? " checked" : "") + "> " + N.temi[k].icona + " " + esc(N.temi[k].nome) + "</label>"; }).join("") + "</div>" +
        "<h2>4. Consenso</h2><div class=\"scheda\"><label class=\"opzione\"><input type=\"checkbox\" id=\"nt-c1\"" + (ep.consenso_registrare ? " checked" : "") + "> La persona intervistata ha dato il consenso a <b>registrare</b> la sua voce (obbligatorio)</label><br>" +
        "<label class=\"opzione\"><input type=\"checkbox\" id=\"nt-c2\"" + (ep.consenso_pubblicare ? " checked" : "") + "> …e a <b>pubblicare</b> il podcast su Internet (facoltativo)</label>" +
        '<p class="piccolo-testo">Meglio con la liberatoria firmata: <a href="#/nonni/liberatoria">📄 stampatela qui</a>. Se le domande le fanno dei bambini, per pubblicare serve anche il consenso dei genitori, oppure registrate solo la voce del nonno.</p></div>' +
        '<div class="riga"><button class="btn primario grande" id="nt-prepara">🧠 Prepara le domande</button></div><div id="nt-elenco"></div>';
      CD.$$("[data-ctx]", c).forEach(function (b) { b.onclick = function () { leggi(); ep.contesto = b.getAttribute("data-ctx"); temiSel = N.contesti[ep.contesto].temi.slice(); disegna(); }; });
      CD.$("#nt-prepara", c).onclick = function () {
        leggi();
        if (!temiSel.length) return CD.avviso("Scegliete almeno un tema.", "att");
        ep.domande = NT.scegli(ep, temiSel, quante); ep.titolo = ep.intervistato ? "I racconti di " + ep.intervistato : "Nonni Teach — " + N.contesti[ep.contesto].nome;
        elenco();
      };
    }
    function leggi() {
      if (!CD.$("#nt-nome", c)) return;
      ep.intervistato = CD.$("#nt-nome", c).value.trim(); ep.luogo = CD.$("#nt-luogo", c).value.trim(); ep.intervistatore = CD.$("#nt-chi", c).value.trim();
      quante = +CD.$("#nt-quante", c).value; ep.consenso_registrare = CD.$("#nt-c1", c).checked; ep.consenso_pubblicare = CD.$("#nt-c2", c).checked && ep.consenso_registrare;
      temiSel = CD.$$("[data-tema]", c).filter(function (x) { return x.checked; }).map(function (x) { return x.getAttribute("data-tema"); });
    }
    function elenco() {
      var box = CD.$("#nt-elenco", c);
      box.innerHTML = '<h2>Le domande di Neura</h2><label>Titolo dell\'episodio<input id="nt-titolo" value="' + esc(ep.titolo) + '"></label><ol class="nt-domande">' + ep.domande.map(function (q, i) {
        return '<li><span contenteditable="true" data-q="' + i + '">' + esc(q.testo) + '</span> <small class="etichetta">' + esc((CD.NONNI.temi[q.tema] || {}).nome || q.tema) + '</small> <button class="btn piccolo" data-cambia="' + i + '" title="Un\'altra domanda">↻</button><button class="btn piccolo" data-togli="' + i + '" title="Togli">✖</button></li>'; }).join("") + "</ol>" +
        '<div class="riga"><input id="nt-mia" placeholder="Aggiungete una vostra domanda" style="flex:1;min-width:14rem"><button class="btn" id="nt-agg">➕ Aggiungi</button></div>' +
        '<div class="riga"><button class="btn primario grande" id="nt-via">🎙️ Inizia l\'intervista</button><button class="btn" id="nt-stampa-d">🖨️ Stampa le domande</button></div>';
      CD.$$("[data-q]", box).forEach(function (s) { s.oninput = function () { ep.domande[+s.getAttribute("data-q")].testo = s.textContent.trim(); }; });
      CD.$$("[data-cambia]", box).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute("data-cambia"), q = NT.altra(ep, ep.domande[i].tema, ep.domande.map(function (x) { return x.testo; })); if (q) { ep.domande[i].testo = q; elenco(); } }; });
      CD.$$("[data-togli]", box).forEach(function (b) { b.onclick = function () { ep.domande.splice(+b.getAttribute("data-togli"), 1); elenco(); }; });
      CD.$("#nt-agg", box).onclick = function () { var t = CD.$("#nt-mia", box).value.trim(); if (t) { ep.domande.splice(ep.domande.length - 1, 0, { testo: t, tema: "vostra", nota: "" }); elenco(); } };
      CD.$("#nt-titolo", box).oninput = function () { ep.titolo = this.value; };
      CD.$("#nt-stampa-d", box).onclick = function () { NT.stampaScheda(ep); };
      CD.$("#nt-via", box).onclick = function () {
        leggi();
        if (!ep.consenso_registrare) { CD.avviso("Prima serve il consenso a registrare (punto 4).", "att", 5000); CD.$("#nt-c1", c).focus(); return; }
        salvaEp(ep).then(function (e) { NT.stato = null; intervista(c, e, 0); }, function (e) { CD.avviso(esc(e.message), "male"); });
      };
      box.scrollIntoView({ behavior: "smooth" });
    }
    disegna();
  }

  /* ---------- 2) intervista */
  function intervista(c, ep, i) {
    if (i == null) i = 0;
    var primaVuota = CD.uno(ep.domande, function (q) { return !q.file; });
    if (i === 0 && primaVuota && ep.domande.indexOf(primaVuota) > 0) i = ep.domande.indexOf(primaVuota);
    function mostra() {
      var q = ep.domande[i], fatte = ep.domande.filter(function (x) { return x.file; }).length;
      c.innerHTML = '<div class="nt-palco"><div class="riga"><b>' + esc(ep.titolo) + '</b><span class="spazio"></span><small>' + fatte + " risposte registrate su " + ep.domande.length + "</small></div>" +
        '<div class="nt-puntini">' + ep.domande.map(function (x, k) { return '<button class="' + (k === i ? "ora " : "") + (x.file ? "fatta" : "") + '" data-vai="' + k + '" aria-label="Domanda ' + (k + 1) + '">' + (k + 1) + "</button>"; }).join("") + "</div>" +
        '<div class="nt-domanda"><small>Domanda ' + (i + 1) + " di " + ep.domande.length + '</small><p id="nt-q">' + esc(q.testo) + "</p></div>" +
        '<div class="nt-reg"><div class="nt-livello"><i id="nt-liv"></i></div><b id="nt-tempo">0:00</b></div>' +
        '<div class="riga nt-comandi"><button class="btn grande" id="nt-leggi">🔊 Neura fa la domanda</button><button class="btn primario grande" id="nt-rec">🎙️ Registra la risposta</button>' +
        '<button class="btn" id="nt-salta">⏭ Avanti</button><button class="btn" id="nt-altra">↻ Altra domanda</button></div>' +
        (q.file ? '<div class="scheda"><b>Risposta registrata</b>' + (q.durata ? " (" + Math.round(q.durata) + " s)" : "") + '<audio controls src="' + urlFile(ep.id, q.file) + '"></audio><small>Potete registrarla di nuovo: la nuova sostituisce questa.</small></div>' : "") +
        '<label>Appunti su questa risposta (facoltativo: nomi, date, parole in dialetto)<textarea id="nt-nota" rows="2">' + esc(q.nota || "") + "</textarea></label>" +
        '<div class="riga"><button class="btn" id="nt-fine">🎚️ Fine: crea il podcast</button><button class="btn" id="nt-scheda">🖨️ Scheda dell\'intervista</button></div></div>';
      CD.$$("[data-vai]", c).forEach(function (b) { b.onclick = function () { if (reg) return; i = +b.getAttribute("data-vai"); mostra(); }; });
      CD.$("#nt-leggi", c).onclick = function () { if (CD.parla) CD.parla(q.testo); };
      CD.$("#nt-nota", c).onchange = function () { q.nota = this.value; salvaEp(ep).catch(function () {}); };
      CD.$("#nt-salta", c).onclick = function () { if (reg) return; if (i < ep.domande.length - 1) { i++; mostra(); leggiAuto(); } else fine(); };
      CD.$("#nt-altra", c).onclick = function () {
        if (reg) return;
        var n = NT.altra(ep, q.tema, ep.domande.map(function (x) { return x.testo; }));
        if (!n) return CD.avviso("Non ho altre domande su questo tema.", "att");
        if (q.file) return CD.avviso("Questa domanda ha già una risposta: per cambiarla usate «Avanti».", "att");
        q.testo = n; salvaEp(ep).then(function () { mostra(); leggiAuto(); });
      };
      CD.$("#nt-scheda", c).onclick = function () { NT.stampaScheda(ep); };
      CD.$("#nt-fine", c).onclick = fine;
      var b = CD.$("#nt-rec", c);
      b.onclick = function () {
        if (!reg) {
          avviaRegistrazione(CD.$("#nt-liv", c), CD.$("#nt-tempo", c)).then(function () {
            b.textContent = "⏹ Fine della risposta"; b.classList.add("nt-in-reg"); CD.$("#nt-q", c).classList.add("nt-ascolto");
          }, function (e) { CD.avviso("🎙️ Microfono non disponibile: " + esc(e.message) + ". Controllate che sia collegato e consentito.", "male", 8000); });
        } else {
          b.disabled = true; b.textContent = "💾 Salvo…";
          fermaRegistrazione().then(function (blob) {
            if (!blob || blob.size < 1200) { CD.avviso("Registrazione troppo breve, riprovate.", "att"); mostra(); return; }
            return carica(ep, i + 1, blob).then(function (r) {
              q.file = r.file; q.durata = r.durata; CD.cervello.stato("felice");
              CD.avviso("✅ Risposta " + (i + 1) + " salvata", "ok", 2500);
              if (i < ep.domande.length - 1) { i++; mostra(); leggiAuto(); } else fine();
            });
          }).catch(function (e) { CD.avviso("Salvataggio non riuscito: " + esc(e.message), "male", 8000); mostra(); });
        }
      };
    }
    function leggiAuto() { if (CD.imp.voce && CD.parla) setTimeout(function () { CD.parla(ep.domande[i].testo); }, 300); }
    function fine() { NT.annulla(); CD.vai("#/nonni/archivio"); setTimeout(function () { NT.monta(ep.id); }, 600); }
    mostra(); leggiAuto();
  }

  /* ---------- montaggio del podcast */
  NT.monta = function (id) {
    CD.avviso("🎚️ Monto il podcast…", "", 3000);
    CD.cervello.stato("pensiero");
    return api("/api/nonni/" + encodeURIComponent(id) + "/monta", {}).then(function (r) {
      if (r.serve_ffmpeg) {
        CD.cervello.stato("riposo");
        return CD.conferma("Serve FFmpeg", "<p>" + esc(r.messaggio) + "</p><p>FFmpeg è un programma libero e gratuito, installato dalla fonte ufficiale del vostro sistema.</p>", "🎚️ Installa FFmpeg", "Più tardi")
          .then(function (ok) { if (ok) return CD.esegui("ffmpeg_installa").then(function (j) { if (j.stato === "fatto") return NT.monta(id); }); });
      }
      CD.cervello.stato("felice");
      CD.avviso("✅ Podcast pronto: " + r.capitoli.length + " capitoli, " + Math.round(r.durata / 60) + " minuti" + (r.voce_domande ? "" : " (le domande sono nei titoli dei capitoli: la voce del server non è installata)"), "ok", 7000);
      if (CD.vistaCorrente === "nonni") CD.mostraVista();
      return r;
    }, function (e) { CD.cervello.stato("errore"); CD.avviso("Montaggio non riuscito: " + esc(e.message), "male", 9000); });
  };

  /* ---------- 3) archivio */
  function archivio(c) {
    c.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>';
    api("/api/nonni").then(function (j) {
      if (!j.episodi.length) { c.innerHTML = '<p class="vuoto">Ancora nessuna intervista. <a href="#/nonni/nuova">🎙️ Iniziate la prima</a>.</p>'; return; }
      c.innerHTML = (j.ffmpeg ? "" : '<div class="avviso att">Per unire le risposte in un unico podcast MP3 serve FFmpeg. <button class="btn piccolo" id="nt-ff">🎚️ Installa FFmpeg</button></div>') +
        '<p class="piccolo-testo">Le registrazioni sono salvate sul computer, nella cartella dei dati del programma (nonni-teach). Nulla viene pubblicato senza che lo facciate voi.</p>' +
        j.episodi.map(function (e) {
          return '<div class="scheda nt-ep" data-ep="' + esc(e.id) + '"><div class="riga"><b>🎙️ ' + esc(e.titolo) + '</b><span class="spazio"></span>' +
            (e.consenso_pubblicare ? '<span class="etichetta ok">pubblicabile</span>' : '<span class="etichetta">solo archivio</span>') + (e.podcast ? ' <span class="etichetta ok">podcast pronto</span>' : "") + "</div>" +
            "<small>" + esc([e.intervistato, e.luogo, (CD.NONNI.contesti[e.contesto] || {}).nome, e.data].filter(Boolean).join(" · ")) + " · " + e.risposte + " risposte</small>" +
            '<div class="riga"><button class="btn piccolo primario" data-ascolta>▶ Ascolta</button><button class="btn piccolo" data-continua>🎙️ Continua</button>' +
            '<button class="btn piccolo" data-monta>🎚️ ' + (e.podcast ? "Rifai" : "Crea") + ' il podcast</button><button class="btn piccolo" data-stampa>🖨️ Scheda</button><button class="btn piccolo" data-elimina>🗑️</button></div><div class="nt-ascolto-box"></div></div>';
        }).join("");
      var ff = CD.$("#nt-ff", c); if (ff) ff.onclick = function () { CD.esegui("ffmpeg_installa").then(function () { archivio(c); }, function () {}); };
      CD.$$(".nt-ep", c).forEach(function (box) {
        var id = box.getAttribute("data-ep");
        CD.$("[data-continua]", box).onclick = function () { CD.vai("#/nonni/nuova/" + id); };
        CD.$("[data-monta]", box).onclick = function () { NT.monta(id); };
        CD.$("[data-stampa]", box).onclick = function () { api("/api/nonni/" + id).then(NT.stampaScheda); };
        CD.$("[data-elimina]", box).onclick = function () {
          CD.conferma("Eliminare l'intervista?", "Saranno cancellate dal computer anche le registrazioni. Non si può annullare.", "🗑️ Elimina").then(function (ok) {
            if (ok) api("/api/nonni/" + id + "/elimina", {}).then(function () { archivio(c); }); });
        };
        CD.$("[data-ascolta]", box).onclick = function () {
          var dove = CD.$(".nt-ascolto-box", box);
          api("/api/nonni/" + id).then(function (e) {
            var h = "";
            if (e.podcast) h += '<audio controls preload="metadata" src="' + urlFile(e.id, e.podcast) + '"></audio>' + (e.capitoli || []).map(function (k) {
              return '<button class="btn piccolo nt-cap" data-t="' + k.inizio + '">' + Math.floor(k.inizio / 60) + ":" + ("0" + Math.floor(k.inizio % 60)).slice(-2) + "</button> " + esc(k.titolo); }).join("<br>");
            else h += e.domande.filter(function (q) { return q.file; }).map(function (q) { return "<p><b>" + esc(q.testo) + '</b><audio controls preload="none" src="' + urlFile(e.id, q.file) + '"></audio></p>'; }).join("") || '<p class="vuoto">Nessuna risposta registrata.</p>';
            dove.innerHTML = h;
            CD.$$("[data-t]", dove).forEach(function (b) { b.onclick = function () { var a = CD.$("audio", dove); a.currentTime = +b.getAttribute("data-t"); a.play(); }; });
          });
        };
      });
    }, function (e) { c.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; });
  }

  /* ---------- 4) pubblicazione e ascolto online */
  function pubblica(c) {
    CD.carica("nonni").then(function (p) {
      p = p || {};
      var url = p.url || "https://danilodauria.github.io/nonni-teach/";
      c.innerHTML = '<div class="griglia-2"><div class="scheda luce"><h3>🌐 Prepara il sito del podcast</h3><p>Il programma crea una cartella con la pagina del podcast, il <b>feed RSS</b> (per le app dei podcast) e gli audio, ' +
        "solo per le interviste con il <b>consenso alla pubblicazione</b>.</p>" +
        '<label>Indirizzo del sito<input id="nt-url" value="' + esc(url) + '"></label><label>Nome del podcast<input id="nt-tit" value="' + esc(p.titolo || "Nonni Teach") + '"></label>' +
        '<label>Curato da<input id="nt-aut" placeholder="es. Centro anziani San Lorenzo" value="' + esc(p.autore || "") + '"></label>' +
        '<div class="riga"><button class="btn primario" id="nt-crea">🛠️ Crea il sito</button></div><div id="nt-esito"></div></div>' +
        '<div class="scheda"><h3>🎧 Ascolta i podcast pubblicati</h3><p>Legge il feed del sito e fa ascoltare gli episodi qui dentro (serve Internet).</p><div class="riga"><button class="btn" id="nt-ascolta">▶ Carica gli episodi</button></div><div id="nt-online"></div></div></div>' +
        '<h2>Come pubblicarlo su GitHub (gratis)</h2><ol class="passi"><li>Una volta sola: su <b>github.com</b> create il repository <code>nonni-teach</code> (pubblico).</li>' +
        "<li>Con <b>GitHub Desktop</b>: <i>File → Clone repository</i> e scegliete <code>nonni-teach</code>.</li><li>Premete «Crea il sito», poi «Scarica lo zip» ed estraetelo dentro la cartella del repository (sostituendo i file).</li>" +
        "<li>In GitHub Desktop: scrivete un riepilogo (es. «Nuovo episodio»), <b>Commit to main</b> e poi <b>Push origin</b>.</li><li>Solo la prima volta: su GitHub → <i>Settings → Pages → Deploy from a branch → main</i>.</li>" +
        "<li>Dopo un minuto il podcast è online all'indirizzo indicato; il feed è <code>feed.xml</code>: si può aggiungere a Spotify for Creators, Apple Podcasts e alle altre app.</li></ol>" +
        '<p class="piccolo-testo">Per i social: condividete il link dell\'episodio con i pulsanti qui sopra (il programma non pubblica nulla da solo sui vostri profili).</p>';
      function prefs() { var x = { url: CD.$("#nt-url", c).value.trim(), titolo: CD.$("#nt-tit", c).value.trim(), autore: CD.$("#nt-aut", c).value.trim() }; CD.salva("nonni", x); return x; }
      CD.$("#nt-crea", c).onclick = function () {
        var x = prefs(), es = CD.$("#nt-esito", c);
        es.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>';
        api("/api/nonni/sito", x).then(function (r) {
          var link = r.url, testo = "🎙️ " + (x.titolo || "Nonni Teach") + ": i nonni raccontano. Ascoltate i nuovi episodi! " + link;
          es.innerHTML = '<div class="avviso ok">✔ Sito pronto con <b>' + r.episodi + "</b> episodi.<br><small>Cartella: " + esc(r.cartella) + "</small></div>" +
            '<div class="riga"><a class="btn primario" href="/api/nonni/sito.zip" download>⬇️ Scarica lo zip</a><button class="btn" id="nt-copia">📋 Copia il messaggio per i social</button>' +
            '<a class="btn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link) + '">Facebook ↗</a>' +
            '<a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(testo) + '">WhatsApp ↗</a></div>';
          CD.$("#nt-copia", es).onclick = function () { CD.copiaTesto(testo); };
          if (!r.episodi) es.insertAdjacentHTML("beforeend", '<div class="avviso att">Nessuna intervista ha il consenso alla pubblicazione: il sito è vuoto.</div>');
        }, function (e) { es.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; });
      };
      CD.$("#nt-ascolta", c).onclick = function () {
        var x = prefs(), box = CD.$("#nt-online", c), u = x.url.replace(/\/?$/, "/") + "feed.xml";
        box.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>';
        fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("feed non trovato (" + r.status + ")"); return r.text(); }).then(function (t) {
          var xml = new DOMParser().parseFromString(t, "application/xml"), items = [].slice.call(xml.getElementsByTagName("item"));
          box.innerHTML = items.length ? items.map(function (it) {
            var en = it.getElementsByTagName("enclosure")[0], tit = (it.getElementsByTagName("title")[0] || {}).textContent || "";
            var src = en ? en.getAttribute("url") : "";
            return /^https:\/\//.test(src) ? "<p><b>" + esc(tit) + '</b><audio controls preload="none" src="' + esc(src) + '"></audio></p>' : "";
          }).join("") : '<p class="vuoto">Il feed non contiene ancora episodi.</p>';
        }).catch(function (e) { box.innerHTML = '<div class="avviso att">Non riesco a leggere ' + esc(u) + ": " + esc(e.message) + ". Il sito è già stato pubblicato?</div>"; });
      };
    });
  }

  /* ---------- sul telefono: si ascoltano i podcast pubblicati (le interviste si registrano con il programma sul computer) */
  function ascolta(c) {
    var u = "https://danilodauria.github.io/nonni-teach/feed.xml";
    c.innerHTML = '<div class="scheda luce"><h3>🎧 I podcast di Nonni Teach</h3><p>Gli episodi pubblicati, da ascoltare qui. Le interviste si registrano con il Consulente Digitale installato sul computer.</p><div id="nt-online"><div class="barra-progresso indeterminata"><i></i></div></div></div>';
    CD.carica("nonni").then(function (p) { if (p && p.url) u = p.url.replace(/\/?$/, "/") + "feed.xml"; return fetch(u, { cache: "no-store" }); })
      .then(function (r) { if (!r.ok) throw new Error("feed non trovato (" + r.status + ")"); return r.text(); }).then(function (t) {
        var box = CD.$("#nt-online", c); if (!box) return;
        var xml = new DOMParser().parseFromString(t, "application/xml"), items = [].slice.call(xml.getElementsByTagName("item"));
        box.innerHTML = items.length ? items.map(function (it) {
          var en = it.getElementsByTagName("enclosure")[0], tit = (it.getElementsByTagName("title")[0] || {}).textContent || "", src = en ? en.getAttribute("url") : "";
          return /^https:\/\//.test(src) ? "<p><b>" + esc(tit) + '</b><audio controls preload="none" src="' + esc(src) + '"></audio></p>' : "";
        }).join("") : '<p class="vuoto">Il feed non contiene ancora episodi.</p>';
      }).catch(function (e) { var box = CD.$("#nt-online", c); if (box) box.innerHTML = '<div class="avviso att">Podcast non raggiungibili ora: ' + esc(e.message) + "</div>"; });
  }

  /* ---------- 5) liberatoria */
  function liberatoria(c) {
    c.innerHTML = '<div class="scheda luce"><h3>📄 Liberatoria per la registrazione e la pubblicazione</h3><p>Un modello semplice da far firmare prima dell\'intervista: consenso a registrare, a pubblicare (con nome completo, solo nome o anonimo), ' +
      "licenza Creative Commons, diritto di ritirare il consenso, riferimento al GDPR e attenzione ai minorenni.</p>" +
      '<div class="griglia-2"><label>Persona intervistata<input id="nt-l-nome"></label><label>Luogo<input id="nt-l-luogo"></label><label>Chi fa l\'intervista<input id="nt-l-chi"></label></div>' +
      '<div class="riga"><button class="btn primario" id="nt-l-stampa">🖨️ Stampa la liberatoria</button></div>' +
      '<p class="piccolo-testo">È un modello indicativo, non una consulenza legale: scuole ed enti lo adattino al proprio regolamento sulla privacy.</p></div>';
    CD.$("#nt-l-stampa", c).onclick = function () { NT.stampaLiberatoria({ intervistato: CD.$("#nt-l-nome", c).value, luogo: CD.$("#nt-l-luogo", c).value, intervistatore: CD.$("#nt-l-chi", c).value }); };
  }

  /* ricerca globale: i temi e le domande */
  if (CD.cerca && CD.cerca.fonte) CD.cerca.fonte(function () {
    var out = [];
    Object.keys(CD.NONNI.temi).forEach(function (k) { var t = CD.NONNI.temi[k];
      out.push({ gruppo: "Nonni Teach", icona: t.icona, titolo: "Domande sul tema «" + t.nome + "»", testo: t.d.slice(0, 3).join(" ").replace(/\{nome\},?\s*/g, "").replace(/\{luogo\}/g, "il quartiere"), vai: "#/nonni/nuova" }); });
    return out;
  });
})();
