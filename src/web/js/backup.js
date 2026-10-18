/* ==========================================================================
 *  CONSULENTE DIGITALE - 🧹 Reset, 💾 Backup (.cdbackup) e ripristino
 *  Il pulsante 🧹 in alto a destra chiede COSA azzerare (l'ultima domanda, i nomi rimasti, la conversazione,
 *  le schede, … oppure tutto), propone PRIMA di fare un backup e solo dopo azzera.
 *  Il backup è un file .cdbackup (archivio ZIP con i dati, le licenze e le istruzioni) che si importa con
 *  il Consulente Digitale su questo o su un altro computer, Windows, Linux o macOS (anche trascinandolo
 *  sulla finestra). Sul telefono il backup è un .cdbackup in solo JSON, importabile anche sul PC.
 *  Prima di importare o azzerare, il programma salva da solo una copia in «backup-automatici».
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT; formato .cdbackup e testi CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var B = CD.backup = {};
  var CHIAVI = ["impostazioni", "profilo", "cronologia", "schede", "preferiti", "diario", "acquisti", "hardware", "interventi", "nonni", "circolare", "notizie"];
  B.VOCI = [
    ["ultimo", "↩️", "L'ultima domanda", "Toglie l'ultima domanda fatta a Neura (e la sua risposta) e svuota i campi di scrittura."],
    ["nomi", "🏷️", "I nomi rimasti", "Nome del profilo, come vi chiama Neura, clienti e tecnici delle schede, firme del patto, curatore del podcast."],
    ["conversazione", "💬", "Tutta la conversazione con Neura", "Cancella i messaggi memorizzati."],
    ["interventi", "🛠️", "Diagnosi e schede dei lavori", "L'archivio delle diagnosi e dei lavori eseguiti."],
    ["notizie", "📰", "Notizie salvate e preferenze", "Le notizie con la stellina e i temi scelti."],
    ["acquisti", "🛒", "Ultima scelta guidata d'acquisto", ""],
    ["diario", "⬇️", "Diario di aggiornamenti e pilota automatico", ""],
    ["hardware", "🧬", "Dati salvati dell'hardware", "Ultimo controllo SMART dei dischi."],
    ["nonni", "🎙️", "Preferenze di Nonni Teach", "Indirizzo e nome del podcast. Le interviste solo se spuntate qui sotto."],
    ["impostazioni", "⚙️", "Impostazioni", "Tema, voce, testo, lingua… tornano come all'inizio."],
    ["profilo", "👤", "Profilo (chi usa il programma)", "Al prossimo avvio si riparte dalla scelta iniziale."],
    ["tutto", "🧨", "TUTTO", "Il programma torna come appena installato."]
  ];
  /* chiavi toccate da ogni voce: servono per pulire anche la memoria del browser */
  var TOCCA = { ultimo: ["cronologia"], nomi: ["profilo", "impostazioni", "circolare", "nonni", "interventi"], conversazione: ["cronologia"], interventi: ["interventi"],
    notizie: ["notizie"], acquisti: ["acquisti"], diario: ["diario"], hardware: ["hardware"], nonni: ["nonni"], impostazioni: ["impostazioni"], profilo: ["profilo"], tutto: CHIAVI };

  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem("cd." + k)); if (v === null) localStorage.removeItem("cd." + k); else localStorage.setItem("cd." + k, JSON.stringify(v)); } catch (e) { /* niente */ } return null; }
  function data() { var d = CD.adesso(); function z(n) { return (n < 10 ? "0" : "") + n; } return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "-" + z(d.getHours()) + z(d.getMinutes()); }
  function scaricaBlob(blob, nome) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

  /* ------------------------------------------------------------------ backup */
  B.crea = function (conAudio) {
    if (!CD.server) {
      var dati = {}; CHIAVI.forEach(function (k) { var v = ls(k); if (v != null) dati[k] = v; });
      var meta = { formato: "cdbackup", versione_formato: 1, app: "Consulente Digitale", versione_app: CD.versione, creato: new Date().toISOString().slice(0, 19), sistema: "browser",
        autore_programma: "Danilo D'Auria", licenza: "Programma MIT; formato e contenuti CC BY-NC-SA 4.0 - Danilo D'Auria", dati: dati };
      scaricaBlob(new Blob([JSON.stringify(meta, null, 1)], { type: "application/json" }), "ConsulenteDigitale-backup-" + data() + ".cdbackup");
      CD.avviso("💾 Backup salvato nella cartella dei download", "ok", 5000);
      return Promise.resolve(true);
    }
    CD.avviso("💾 Preparo il backup…", "", 2500);
    return fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: CD.stato.token, audio: !!conAudio }) }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.errore || "backup non riuscito"); });
      var nome = ((r.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/) || [])[1] || "ConsulenteDigitale-backup-" + data() + ".cdbackup";
      return r.blob().then(function (b) { scaricaBlob(b, nome); CD.avviso("💾 Backup <b>" + esc(nome) + "</b> salvato nella cartella dei download (" + CD.arrotonda(b.size / 1048576, 1) + " MB)", "ok", 7000); return true; });
    }).catch(function (e) { CD.avviso("Backup non riuscito: " + esc(e.message), "male", 7000); return false; });
  };
  B.chiediBackup = function (perche) {
    return CD.modale({ titolo: "💾 Prima un backup?", html: "<p>" + (perche || "Prima di continuare") + " conviene salvare una copia dei vostri dati: si potrà reimportare in qualsiasi momento, anche su un altro computer (Windows, Linux o macOS).</p>" +
        (CD.server ? '<label class="opzione"><input type="checkbox" id="bk-audio"> Includi le registrazioni di Nonni Teach (file più grande)</label>' : ""),
      pulsanti: [{ testo: "Annulla", valore: "annulla" }, { testo: "No, continua senza", valore: "no" }, { testo: "💾 Sì, crea il backup", valore: "si", classe: "primario" }],
      dopo: function (m) { B._audio = CD.$("#bk-audio", m); }
    }).then(function (v) {
      if (v === "si") { var audio = B._audio && B._audio.checked; return B.crea(audio).then(function (ok) { return ok ? "fatto" : "annulla"; }); }
      return v || "annulla";
    });
  };

  /* ------------------------------------------------------------------ importazione */
  B.importa = function (file) {
    if (!file) return;
    if (!/\.(cdbackup|zip|json)$/i.test(file.name)) { CD.avviso("Scegliete un file .cdbackup del Consulente Digitale.", "att"); return; }
    CD.modale({ titolo: "📥 Importare il backup?", html: "<p>File: <b>" + esc(file.name) + "</b> (" + CD.arrotonda(file.size / 1048576, 2) + " MB)</p>" +
        "<p><b>Unisci</b> aggiunge i dati del backup a quelli presenti; <b>Sostituisci</b> rimette tutto com'era nel backup.</p><p class=\"piccolo-testo\">Prima di importare il programma salva da solo una copia dei dati attuali.</p>",
      pulsanti: [{ testo: "Annulla", valore: null }, { testo: "Sostituisci", valore: "sostituisci" }, { testo: "Unisci", valore: "unisci", classe: "primario" }]
    }).then(function (modo) {
      if (!modo) return;
      if (!CD.server) {
        return leggiTesto(file).then(function (t) {
          var m = JSON.parse(t); if (m.formato !== "cdbackup") throw new Error("non è un backup del Consulente Digitale");
          Object.keys(m.dati || {}).forEach(function (k) { if (CHIAVI.indexOf(k) >= 0) ls(k, m.dati[k]); });
          CD.avviso("✅ Backup importato", "ok"); setTimeout(function () { location.reload(); }, 900);
        }).catch(function (e) { CD.avviso("Importazione non riuscita: " + esc(e.message) + (/PK/.test(e.message) ? "" : ""), "male", 8000); });
      }
      CD.avviso("📥 Importo il backup…", "", 2500);
      return fetch("/api/backup/importa?modo=" + modo, { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-CD-Token": CD.stato.token }, body: file })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.errore || "importazione non riuscita"); return j; }); })
        .then(function (j) {
          j.chiavi.forEach(function (k) { ls(k, null); });
          CD.modale({ titolo: "✅ Backup importato", html: "<p>Ripristinati: <b>" + j.chiavi.length + "</b> gruppi di dati" + (j.file ? " e <b>" + j.file + "</b> file di Nonni Teach" : "") + ".</p>" +
            "<p class=\"piccolo-testo\">Backup del " + esc(j.creato || "?") + " (versione " + esc(j.versione_app || "?") + "). Copia dei dati precedenti: " + esc(j.copia_di_sicurezza) + "</p>",
            pulsanti: [{ testo: "Ricarica il programma", valore: true, classe: "primario" }] }).then(function () { location.reload(); });
        }, function (e) { CD.avviso("Importazione non riuscita: " + esc(e.message), "male", 8000); });
    });
  };
  function leggiTesto(f) { return new Promise(function (ok, ko) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { ko(new Error("file non leggibile")); }; r.readAsText(f); }); }
  B.scegliFile = function () {
    var i = document.createElement("input"); i.type = "file"; i.accept = ".cdbackup,.zip,.json";
    i.onchange = function () { B.importa(i.files[0]); }; i.click();
  };

  /* ------------------------------------------------------------------ reset */
  B.reset = function (preselezione) {
    var sel = preselezione || ["ultimo"];
    return CD.modale({ titolo: "🧹 Reset: cosa volete azzerare?", html: '<div class="bk-voci">' + B.VOCI.map(function (v) {
        return '<label class="opzione bk-voce' + (v[0] === "tutto" ? " bk-tutto" : "") + '"><input type="checkbox" value="' + v[0] + '"' + (sel.indexOf(v[0]) >= 0 ? " checked" : "") + "> <span>" + v[1] + " <b>" + esc(v[2]) + "</b>" + (v[3] ? "<br><small>" + esc(v[3]) + "</small>" : "") + "</span></label>"; }).join("") + "</div>" +
        (CD.server ? '<label class="opzione"><input type="checkbox" id="bk-interviste"> 🎙️ Cancella anche le interviste e i podcast di Nonni Teach</label>' : ""),
      pulsanti: [{ testo: "Annulla", valore: null }, { testo: "Avanti ▶", valore: "ok", classe: "primario" }],
      dopo: function (m) {
        B._m = m;
        var tutto = CD.$('input[value="tutto"]', m);
        tutto.onchange = function () { CD.$$('.bk-voci input', m).forEach(function (x) { if (x !== tutto) { x.checked = tutto.checked; x.disabled = tutto.checked; } }); };
      }
    }).then(function (v) {
      if (!v) return;
      var m = B._m, cosa = CD.$$(".bk-voci input", m).filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
      var interviste = !!(CD.$("#bk-interviste", m) && CD.$("#bk-interviste", m).checked);
      if (cosa.indexOf("tutto") >= 0) cosa = ["tutto"];
      if (!cosa.length) { CD.avviso("Non avete scelto nulla da azzerare.", "att"); return; }
      var solo = cosa.length === 1 && cosa[0] === "ultimo";
      var passo = solo ? Promise.resolve("no") : B.chiediBackup("Prima di azzerare");
      return passo.then(function (r) {
        if (r === "annulla") return;
        var nomi = cosa.map(function (c) { return (CD.uno(B.VOCI, function (x) { return x[0] === c; }) || [])[2]; }).join(", ");
        var conferma = solo ? Promise.resolve(true) : CD.conferma("Confermate il reset?", "<p>Sto per azzerare: <b>" + esc(nomi) + "</b>" + (interviste ? " e <b>le interviste di Nonni Teach</b>" : "") + ".</p>" +
          (CD.server ? '<p class="piccolo-testo">Il programma salva comunque una copia di sicurezza in «backup-automatici».</p>' : ""), "🧹 Azzera");
        return conferma.then(function (ok) { if (ok) return esegui(cosa, interviste); });
      });
    });
  };
  function esegui(cosa, interviste) {
    CD.$$("#neura-input, #dock-input, #cerca-input").forEach(function (i) { i.value = ""; });
    if (CD.taci) CD.taci();
    var chiavi = []; cosa.forEach(function (c) { (TOCCA[c] || []).forEach(function (k) { if (chiavi.indexOf(k) < 0) chiavi.push(k); }); });
    var p;
    if (CD.server) p = CD.api("/api/reset", { cosa: cosa, interviste: interviste });
    else p = Promise.resolve(resetLocale(cosa));
    return p.then(function () {
      if (CD.server) chiavi.forEach(function (k) { ls(k, null); });
      if (cosa.indexOf("tutto") >= 0) { try { Object.keys(localStorage).forEach(function (k) { if (/^cd\./.test(k)) localStorage.removeItem(k); }); sessionStorage.clear(); } catch (e) { /* niente */ } }
      if (cosa.length === 1 && cosa[0] === "ultimo") {
        if (CD.neura && CD.neura.storia) { var s = CD.neura.storia; while (s.length && s[s.length - 1].chi !== "utente") s.pop(); if (s.length) s.pop(); CD.$$(".chat").forEach(function (c) { if (CD.neura.disegna) CD.neura.disegna(c); }); }
        CD.avviso("↩️ Ultima domanda tolta", "ok"); return;
      }
      CD.avviso("🧹 Reset completato", "ok");
      setTimeout(function () { location.href = location.pathname + (cosa.indexOf("tutto") >= 0 || cosa.indexOf("profilo") >= 0 ? "#/benvenuto" : location.hash); location.reload(); }, 800);
    }, function (e) { CD.avviso("Reset non riuscito: " + esc(e.message), "male", 7000); });
  }
  function resetLocale(cosa) {
    if (cosa.indexOf("tutto") >= 0) return;
    if (cosa.indexOf("nomi") >= 0) {
      [["profilo", "nome"], ["impostazioni", "nomeUtente"], ["circolare", "nome"], ["nonni", "autore"]].forEach(function (x) { var v = ls(x[0]); if (v) { v[x[1]] = ""; ls(x[0], v); } });
      var it = ls("interventi"); if (it && it.schede) { it.schede.forEach(function (s) { s.cliente = ""; s.tecnico = ""; }); ls("interventi", it); }
    }
    if (cosa.indexOf("conversazione") >= 0) ls("cronologia", []);
    if (cosa.indexOf("ultimo") >= 0) { var c = ls("cronologia") || []; while (c.length && c[c.length - 1].chi !== "utente") c.pop(); if (c.length) c.pop(); ls("cronologia", c); }
    ["interventi", "notizie", "acquisti", "diario", "hardware", "nonni", "impostazioni", "profilo"].forEach(function (k) { if (cosa.indexOf(k) >= 0) ls(k, null); });
  }

  /* ------------------------------------------------------------------ riquadro per Impostazioni */
  B.riquadro = function () {
    return '<div class="scheda" id="sez-backup"><h2>💾 Backup, ripristino e reset</h2>' +
      "<p>Il <b>backup</b> è un file <code>.cdbackup</code> con impostazioni, profilo, conversazione, schede, diagnosi e notizie salvate: si reimporta qui o su un altro computer, Windows, Linux o macOS." +
      (CD.server ? " Le registrazioni di Nonni Teach si possono includere." : "") + "</p>" +
      '<div class="riga"><button class="btn primario" id="bk-crea">💾 Crea un backup</button>' + (CD.server ? '<label class="opzione"><input type="checkbox" id="bk-crea-audio"> con le registrazioni</label>' : "") +
      '<button class="btn" id="bk-importa">📥 Importa un backup</button><button class="btn" id="bk-reset">🧹 Reset…</button></div>' +
      '<p class="piccolo-testo">Potete anche trascinare un file .cdbackup sulla finestra. Prima di importare o azzerare il programma salva da solo una copia dei dati. ' +
      "Il formato .cdbackup e i contenuti del programma sono di Danilo D'Auria, licenza CC BY-NC-SA 4.0; i dati dentro il backup sono vostri.</p></div>";
  };
  B.collega = function (el) {
    var c = CD.$("#bk-crea", el); if (!c) return;
    c.onclick = function () { var a = CD.$("#bk-crea-audio", el); B.crea(a && a.checked); };
    CD.$("#bk-importa", el).onclick = B.scegliFile;
    CD.$("#bk-reset", el).onclick = function () { B.reset(); };
  };

  /* trascinare un .cdbackup sulla finestra */
  document.addEventListener("dragover", function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], "Files") >= 0) e.preventDefault(); });
  document.addEventListener("drop", function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && /\.cdbackup$/i.test(f.name)) { e.preventDefault(); B.importa(f); }
  });
})();
