/* ==========================================================================
 *  CONSULENTE DIGITALE - «Salvadati»: recupero di foto, documenti e file cancellati o non più visibili
 *  1) analisi delle unità (RAW, illeggibili, cifrate) al primo avvio  2) scelta: unità, superficiale/approfondita,
 *  tipi di file, dove salvare (sempre un ALTRO disco)  3) ricerca con PhotoRec  4) controllo di ogni file: gli
 *  integri si contano, i danneggiati e i doppioni si scartano  5) maschera finale con file e spazio necessario,
 *  copia di sicurezza, «rendi visibili», riparazione dell'unità.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti e logo CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var giro = null, analisi = null, dest = [], ultimo = null;
  var CAT = [["foto", "🖼️", "Foto"], ["documenti", "📄", "Documenti"], ["video", "🎬", "Video"], ["musica", "🎵", "Musica"], ["archivi", "🗜️", "Archivi"]];
  var STATI = { ok: ["ok", "leggibile"], raw: ["male", "RAW"], illeggibile: ["att", "illeggibile qui"], cifrata: ["att", "cifrata"], speciale: ["", "di sistema"] };

  /* Logo originale di Salvadati (salvagente con foto e documento) - Danilo D'Auria, CC BY-NC-SA 4.0 */
  CD.logoSalvadati = function (px) {
    return '<svg class="logo-salvadati" width="' + (px || 64) + '" height="' + (px || 64) + '" viewBox="0 0 64 64" role="img" aria-label="Salvadati">' +
      '<circle cx="32" cy="32" r="27" fill="none" stroke="#e11d48" stroke-width="10"/>' +
      '<g stroke="#fff" stroke-width="10"><path d="M32 5v9M32 50v9M5 32h9M50 32h9" fill="none"/></g>' +
      '<circle cx="32" cy="32" r="27" fill="none" stroke="#9f1239" stroke-width="1.2"/><circle cx="32" cy="32" r="17" fill="#0ea5e9"/>' +
      '<rect x="22" y="23" width="13" height="16" rx="1.5" fill="#fff"/><path d="M24.5 27h8M24.5 30h8M24.5 33h5" stroke="#0369a1" stroke-width="1.4"/>' +
      '<rect x="30" y="28" width="13" height="11" rx="1.5" fill="#fde047" stroke="#0369a1" stroke-width="1"/>' +
      '<path d="M31.5 37.5l3.5-4 2.5 2.5 1.5-1.5 2.5 3z" fill="#16a34a"/><circle cx="39.5" cy="31" r="1.4" fill="#f97316"/></svg>';
  };

  function dim(b) {
    if (!b) return "0 MB";
    if (b < 1048576) return Math.max(1, Math.round(b / 1024)) + " KB";
    return b >= 1073741824 ? CD.arrotonda(b / 1073741824, b >= 1e11 ? 0 : 1) + " GB" : CD.arrotonda(b / 1048576, 1) + " MB";
  }

  CD.registra("recupero", {
    titolo: "Salvadati - recupero dati",
    mostra: function (el) {
      el.innerHTML = '<header class="titolo-pagina"><span class="em" aria-hidden="true">' + CD.logoSalvadati(56) + "</span><div><h1>Salvadati</h1>" +
        "<p>Recupera foto, documenti e file cancellati, o rimasti su chiavette e dischi che il computer non legge più</p></div></header>" +
        '<div class="avviso">🛡️ L\'unità da salvare viene <b>soltanto letta</b>: i file recuperati vanno sempre su <b>un altro disco</b>. ' +
        "Finché non avete recuperato i dati, non formattate e non scrivete nulla sull'unità da salvare.</div>" +
        '<div id="sd-analisi" class="scheda"><h3>🔎 Analisi delle unità</h3><div class="barra-progresso indeterminata"><i></i></div><p class="piccolo-testo">Guardo dischi, chiavette e schede di memoria…</p></div>' +
        '<div id="sd-scelte"></div><div id="sd-esito"></div>' +
        '<details class="scheda"><summary><b>Come lavora Salvadati</b></summary><ul>' +
        "<li><b>Superficiale</b>: cerca i file cancellati nello spazio libero delle unità leggibili. Veloce.</li>" +
        "<li><b>Approfondita</b>: legge tutta l'unità settore per settore, anche se è RAW, formattata o illeggibile. Lenta (ore), trova di più.</li>" +
        "<li>Ogni file trovato viene <b>controllato</b> (foto, PDF, documenti Office, video, musica…): i danneggiati vengono scartati prima di contare, e i doppioni si tolgono.</li>" +
        "<li>Le foto prendono il nome dalla data dello scatto, i documenti dal loro titolo; tutto ordinato in cartelle Foto, Documenti, Video, Musica, Archivi, con un rapporto stampabile.</li>" +
        "<li>Motore di ricerca: PhotoRec (CGSecurity, Christophe Grenier, software libero GPL).</li></ul></details>";
      if (!CD.server) { CD.$("#sd-analisi", el).innerHTML = '<div class="avviso">Salvadati funziona con il programma installato sul computer.</div>'; return; }
      analizza(el);
    },
    esci: function () { clearTimeout(giro); }
  });

  function analizza(el) {
    var box = CD.$("#sd-analisi", el);
    CD.cervello.stato("pensiero");
    Promise.all([CD.api("/api/recupero/analisi"), CD.api("/api/recupero/destinazioni")]).then(function (r) {
      analisi = r[0]; dest = r[1].destinazioni || [];
      CD.cervello.stato(analisi.problemi.length ? "pensiero" : "riposo");
      var h = "<h3>🔎 Analisi delle unità</h3>";
      if (analisi.problemi.length) {
        h += '<div class="avviso att"><b>Unità con problemi: ' + analisi.problemi.length + "</b><ul>" + analisi.problemi.map(function (p) {
          return "<li><b>" + esc(p.disco) + " · " + esc(p.partizione) + "</b> — " + esc(p.nota) + "</li>"; }).join("") + "</ul></div>";
      } else h += '<p class="ok-testo">✔ Nessuna unità RAW o illeggibile. Potete comunque cercare i file cancellati.</p>';
      h += '<table class="tab"><tr><th>Disco / unità</th><th>File system</th><th>Dimensione</th><th>Stato</th><th></th></tr>';
      analisi.dischi.forEach(function (d) {
        h += '<tr class="riga-disco"><td colspan="5"><b>' + (d.rimovibile ? "🔌 " : "💽 ") + esc(d.nome || d.id) + "</b> · " + dim(d.dimensione) +
          (d.bus ? " · " + esc(d.bus) : "") + (d.sistema ? ' · <span class="etichetta">sistema</span>' : "") + "</td></tr>";
        d.partizioni.forEach(function (p) {
          var s = STATI[p.stato] || ["", p.stato];
          var azioni = p.stato === "ok" && p.montata && !d.sistema ? '<button class="btn piccolo" data-vis="' + esc(p.id) + '">👁️ Rendi visibili</button>' : "";
          if ((p.stato === "ok" || p.stato === "illeggibile") && !d.sistema && p.montata !== "/") azioni += ' <button class="btn piccolo" data-rip="' + esc(p.id) + '">🔧 Ripara</button>';
          h += "<tr><td>&nbsp;&nbsp;" + esc(p.nome) + (p.etichetta ? " «" + esc(p.etichetta) + "»" : "") + "</td><td>" + esc(p.fs || "—") + "</td><td>" + dim(p.dimensione) +
            '</td><td><span class="etichetta ' + s[0] + '">' + esc(s[1]) + "</span>" + (p.nota ? '<br><small>' + esc(p.nota) + "</small>" : "") + "</td><td>" + azioni + "</td></tr>";
        });
      });
      h += "</table>";
      h += analisi.motore.pronto ? '<p class="piccolo-testo">Motore di ricerca: PhotoRec ✔</p>' :
        '<div class="avviso att">Manca il motore di ricerca (PhotoRec). <button class="btn primario" id="sd-motore">🧰 Installa il motore di recupero</button></div>';
      h += '<div class="riga"><button class="btn" id="sd-rianalizza">🔄 Ripeti l\'analisi</button><small>Avete collegato ora una chiavetta o un disco? Ripetete l\'analisi.</small></div>';
      box.innerHTML = h;
      CD.$("#sd-rianalizza", box).onclick = function () { box.innerHTML = '<h3>🔎 Analisi delle unità</h3><div class="barra-progresso indeterminata"><i></i></div>'; analizza(el); };
      var bm = CD.$("#sd-motore", box);
      if (bm) bm.onclick = function () { CD.esegui("recupero_motore").then(function () { analizza(el); }, function () {}); };
      CD.$$("[data-vis]", box).forEach(function (b) { b.onclick = function () { azioneUnita("recupero_visibili", b.getAttribute("data-vis")); }; });
      CD.$$("[data-rip]", box).forEach(function (b) { b.onclick = function () { azioneUnita("recupero_ripara", b.getAttribute("data-rip")); }; });
      scelte(el);
      if (CD.neura && CD.neura.dici && analisi.problemi.length) {
        CD.neura.dici("Ho trovato " + analisi.problemi.length + (analisi.problemi.length === 1 ? " unità" : " unità") + " che il computer non riesce a leggere. Scegliete quale salvare e dove mettere i file: al resto penso io.");
      }
    }, function (e) { CD.cervello.stato("errore"); box.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; });
  }

  function opzioniDest(escludiDisco) {
    return dest.map(function (x) {
      var stesso = escludiDisco && x.disco && x.disco === escludiDisco;
      return '<option value="' + esc(x.id) + '"' + (stesso || !x.scrivibile ? " disabled" : "") + ">" + (x.esterna ? "🔌 " : "💽 ") + esc(x.nome) + " — liberi " + dim(x.libero) +
        (stesso ? " (stesso disco: no)" : "") + "</option>";
    }).join("");
  }

  function discoDi(id) {
    for (var i = 0; i < analisi.dischi.length; i++) {
      var d = analisi.dischi[i];
      if (d.id === id) return d;
      for (var j = 0; j < d.partizioni.length; j++) if (d.partizioni[j].id === id) return d;
    }
    return null;
  }

  function scelte(el) {
    var box = CD.$("#sd-scelte", el), sorg = "";
    analisi.dischi.forEach(function (d) {
      var tutte = d.partizioni.filter(function (p) { return p.stato !== "speciale"; });
      tutte.forEach(function (p) {
        var s = STATI[p.stato] || ["", ""];
        sorg += '<label class="scelta"><input type="radio" name="sd-sorg" value="' + esc(p.id) + '"' + (p.stato === "raw" || p.stato === "illeggibile" ? " data-prob=1" : "") + "> " +
          (d.rimovibile ? "🔌 " : "💽 ") + esc(d.nome) + " · <b>" + esc(p.nome) + "</b>" + (p.etichetta ? " «" + esc(p.etichetta) + "»" : "") +
          ' <span class="etichetta ' + s[0] + '">' + esc(s[1]) + "</span></label>";
      });
      if (!d.sistema) sorg += '<label class="scelta"><input type="radio" name="sd-sorg" value="' + esc(d.id) + '"> ' + (d.rimovibile ? "🔌 " : "💽 ") + esc(d.nome) + " · <b>tutto il disco</b> (anche le partizioni cancellate)</label>";
    });
    box.innerHTML = '<div class="scheda"><h3>1️⃣ Quale unità salvare</h3><div class="scelte">' + sorg + "</div>" +
      '<h3>2️⃣ Tipo di analisi</h3><label class="scelta"><input type="radio" name="sd-modo" value="superficiale" checked> ⚡ <b>Superficiale</b> — file cancellati di recente, unità leggibili (minuti)</label>' +
      '<label class="scelta"><input type="radio" name="sd-modo" value="approfondita"> 🔬 <b>Approfondita</b> — tutta l\'unità, anche RAW o formattata (ore)</label>' +
      '<h3>3️⃣ Cosa cercare</h3><div class="riga">' + CAT.map(function (c) {
        return '<label class="scelta in-linea"><input type="checkbox" name="sd-cat" value="' + c[0] + '"' + (c[0] === "foto" || c[0] === "documenti" ? " checked" : "") + "> " + c[1] + " " + c[2] + "</label>"; }).join("") + "</div>" +
      '<h3>4️⃣ Dove mettere i file recuperati</h3><select id="sd-dest">' + opzioniDest("") + "</select>" +
      '<p class="piccolo-testo">Meglio un disco esterno o una chiavetta capiente: mai lo stesso disco da salvare.</p>' +
      '<div class="riga"><button class="btn primario grande" id="sd-avvia">🛟 Avvia il recupero</button></div></div>';
    var primo = CD.$('input[data-prob]', box) || CD.$('input[name="sd-sorg"]', box);
    if (primo) primo.checked = true;
    function aggiornaDest() {
      var s = CD.$('input[name="sd-sorg"]:checked', box), d = s ? discoDi(s.value) : null, sel = CD.$("#sd-dest", box), v = sel.value;
      sel.innerHTML = opzioniDest(d ? d.id : "");
      if (v && sel.querySelector('option[value="' + v + '"]:not([disabled])')) sel.value = v;
      else { var o = sel.querySelector("option:not([disabled])"); if (o) sel.value = o.value; }
      if (s) CD.$('input[value="' + (s.getAttribute("data-prob") ? "approfondita" : "superficiale") + '"]', box).checked = true;
    }
    CD.$$('input[name="sd-sorg"]', box).forEach(function (r) { r.onchange = aggiornaDest; });
    aggiornaDest();
    CD.$("#sd-avvia", box).onclick = function () { avvia(el, box); };
  }

  function avvia(el, box) {
    var s = CD.$('input[name="sd-sorg"]:checked', box), m = CD.$('input[name="sd-modo"]:checked', box);
    var cat = CD.$$('input[name="sd-cat"]:checked', box).map(function (c) { return c.value; });
    if (!s) { CD.avviso("Scegliete l'unità da salvare", "att"); return; }
    if (!cat.length) { CD.avviso("Scegliete almeno un tipo di file", "att"); return; }
    if (!analisi.motore.pronto) { CD.avviso("Prima installate il motore di recupero", "att"); return; }
    CD.api("/api/recupero/piano", { sorgente: s.value, modo: m.value, categorie: cat, destinazione: CD.$("#sd-dest", box).value }).then(function (r) {
      var p = r.piano, d = dest.filter(function (x) { return x.id === CD.$("#sd-dest", box).value; })[0];
      var nota = "Unità: <b>" + esc(p.sorgente_nome) + "</b> · ricerca <b>" + esc(p.modo) + "</b><br>File in: <code>" + esc(p.destinazione) + "</code>";
      if (d && r.stima && d.libero < r.stima) nota += '<div class="avviso att">Spazio libero nella destinazione: ' + dim(d.libero) + ". Nel caso peggiore la ricerca può aver bisogno fino a " + dim(r.stima) +
        " prima del controllo dei file: se lo spazio finisce, la ricerca si ferma e si tiene quanto trovato.</div>";
      return CD.esegui("recupero_avvia", p.id, { nota: nota, senzaVoci: true }).then(function (j) {
        if (j.stato === "fatto" || (+((j.info || {}).trovati) > 0)) elabora(el, p.id);
      });
    }).catch(function (e) { if (e.message !== "annullato") CD.avviso(esc(e.message), "male", 8000); });
  }

  function elabora(el, pid) {
    var box = CD.$("#sd-esito", el);
    box.innerHTML = '<div class="scheda"><h3>🧪 Controllo dei file trovati</h3><div class="barra-progresso"><i id="sd-bar" style="width:0"></i></div><p id="sd-cnt" class="piccolo-testo">Controllo uno per uno i file: i danneggiati e i doppioni vengono scartati…</p></div>';
    box.scrollIntoView({ behavior: "smooth" });
    CD.cervello.stato("pensiero");
    CD.api("/api/recupero/elabora", { piano: pid }).then(function () { segui(el, pid); }, function (e) { box.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; });
  }

  function segui(el, pid) {
    clearTimeout(giro);
    CD.api("/api/recupero/stato?piano=" + pid).then(function (r) {
      var s = r.stato, box = CD.$("#sd-esito", el);
      if (!box) return;
      if (s.fase === "in_corso") {
        var b = CD.$("#sd-bar", box), c = CD.$("#sd-cnt", box);
        if (b && s.totale) b.style.width = Math.round(100 * s.fatti / s.totale) + "%";
        if (c && s.totale) c.textContent = "Controllati " + s.fatti + " file su " + s.totale + "…";
        giro = setTimeout(function () { segui(el, pid); }, 700);
        return;
      }
      if (s.fase === "errore") { box.innerHTML = '<div class="avviso male">' + esc(s.errore || "Errore") + "</div>"; return; }
      maschera(el, pid, s);
    });
  }

  /* La maschera finale: quanti file, quanto spazio, cosa è stato scartato */
  function maschera(el, pid, s) {
    ultimo = s;
    var box = CD.$("#sd-esito", el);
    CD.cervello.stato(s.file ? "felice" : "riposo");
    var cat = CAT.filter(function (c) { return s.categorie && s.categorie[c[0]] && s.categorie[c[0]].file; }).map(function (c) {
      return '<div class="cifra"><b>' + s.categorie[c[0]].file + "</b><span>" + c[1] + " " + c[2] + "<br><small>" + dim(s.categorie[c[0]].byte) + "</small></span></div>"; }).join("");
    box.innerHTML = '<div class="scheda maschera-salvadati"><h3>' + CD.logoSalvadati(28) + " Risultato del recupero</h3>" +
      '<div class="cifre"><div class="cifra grande ok"><b>' + s.file + "</b><span>file recuperati<br>integri e funzionanti</span></div>" +
      '<div class="cifra grande"><b>' + dim(s.byte) + "</b><span>spazio necessario<br>per il backup</span></div>" +
      '<div class="cifra"><b>' + s.scartati + "</b><span>scartati perché<br>danneggiati</span></div>" +
      '<div class="cifra"><b>' + s.doppioni + "</b><span>doppioni tolti</span></div></div>" +
      (cat ? '<div class="cifre piccole">' + cat + "</div>" : "") +
      (s.non_verificati ? '<p class="piccolo-testo">Altri ' + s.non_verificati + " file sembravano buoni ma non si possono verificare: sono stati lasciati fuori.</p>" : "") +
      (s.file ? "<p>Cartella: <code>" + esc(s.cartella) + "</code></p>" +
        '<div class="riga"><button class="btn primario" id="sd-apri">📂 Apri la cartella</button><button class="btn" id="sd-stampa">🖨️ Stampa il rapporto</button></div>' +
        '<h3>💾 Copia di sicurezza su un\'altra unità</h3><div class="riga"><select id="sd-dest2">' + opzioniDest("") + '</select><button class="btn" id="sd-copia">💾 Copia</button></div><div id="sd-copia-stato"></div>'
        : '<div class="avviso att">Non ho trovato file integri. Provate l\'analisi <b>approfondita</b> o altri tipi di file.</div>') + "</div>";
    if (CD.neura && CD.neura.dici) CD.neura.dici(s.file ? "Fatto! Ho recuperato " + s.file + " file integri: servono " + dim(s.byte).replace(".", ",") + " per il backup. " + (s.scartati === 1 ? "Un file era danneggiato e l'ho scartato." : s.scartati ? s.scartati + " file erano danneggiati e li ho scartati." : "") :
      "Non ho trovato file integri. Possiamo riprovare con l'analisi approfondita.");
    if (!s.file) return;
    CD.$("#sd-apri", box).onclick = function () { CD.api("/api/recupero/apri", { piano: pid }).catch(function (e) { CD.avviso(esc(e.message), "att"); }); };
    CD.$("#sd-stampa", box).onclick = function () {
      CD.stampa("Rapporto di recupero - Salvadati", "<p>Unità: <b>" + esc(s.sorgente) + "</b> · ricerca " + esc(s.modo) + " · " + esc(s.quando) + "</p><p><b>" + s.file + "</b> file recuperati (" + dim(s.byte) +
        "), " + s.scartati + " scartati perché danneggiati, " + s.doppioni + " doppioni tolti.</p><p>Cartella: " + esc(s.cartella) + "</p><p class=\"piccolo-testo\">Ricerca con PhotoRec (CGSecurity, licenza GPL).</p>");
    };
    CD.$("#sd-copia", box).onclick = function () {
      var st = CD.$("#sd-copia-stato", box);
      CD.api("/api/recupero/copia", { piano: pid, destinazione: CD.$("#sd-dest2", box).value }).then(function () {
        (function g() {
          CD.api("/api/recupero/stato?piano=" + pid).then(function (r) {
            var c = r.copia;
            st.innerHTML = c.fase === "in_corso" ? '<div class="barra-progresso"><i style="width:' + Math.round(100 * c.fatti / Math.max(1, c.totale)) + '%"></i></div>' :
              c.fase === "fatto" ? '<p class="ok-testo">✔ Copia fatta: <code>' + esc(c.cartella) + "</code></p>" : '<div class="avviso male">' + esc(c.errore || "") + "</div>";
            if (c.fase === "in_corso") setTimeout(g, 600);
          });
        })();
      }, function (e) { st.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; });
    };
  }

  /* «Rendi visibili» e «Ripara» su una unità: piano con la prima destinazione valida (serve solo a nominare l'unità) */
  function azioneUnita(id, sorgente) {
    var d = discoDi(sorgente), ok = dest.filter(function (x) { return x.scrivibile && (!d || x.disco !== d.id); })[0];
    if (!ok) { CD.avviso("Serve almeno un'altra unità su cui scrivere il registro", "att"); return; }
    CD.api("/api/recupero/piano", { sorgente: sorgente, modo: "superficiale", categorie: ["foto"], destinazione: ok.id }).then(function (r) {
      return CD.esegui(id, r.piano.id, { nota: id === "recupero_ripara" ? '<div class="avviso att">⚠️ Fatelo <b>solo dopo</b> aver salvato i dati: la riparazione può eliminare i file rovinati.</div>' : "" });
    }).catch(function (e) { if (e.message !== "annullato") CD.avviso(esc(e.message), "male"); });
  }
})();
