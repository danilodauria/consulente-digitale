/* ==========================================================================
 *  CONSULENTE DIGITALE - La voce e l'udito di Neura
 *  PARLARE: voci del sistema (Windows, macOS, Linux) tramite il browser, oppure la voce del server
 *           (Piper, anche quella del Professore Digitale, o espeak-ng). Il cervello si illumina sulle parole.
 *  ASCOLTARE: 1) trascrizione SUL COMPUTER (Vosk / faster-whisper, nulla esce dal PC) se installata;
 *             2) altrimenti il riconoscimento del browser, che invia la voce a Google o Microsoft:
 *                si usa SOLO dopo il consenso esplicito, spiegato in modo onesto.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD;
  var sintesi = window.speechSynthesis || null;
  var coda = [], inCorso = false, audioEl = null, contesto = null, generazione = 0;

  /* ------------------------------------------------------------------ testo adatto alla voce */
  function pulisci(t) {
    return String(t || "")
      .replace(/```[\s\S]*?```/g, " (vedete il codice sullo schermo) ")
      .replace(/\[\[[^\]]*\]\]/g, " ")
      .replace(/https?:\/\/\S+/g, " il link sullo schermo ")
      .replace(/[*_#>`|]/g, " ")
      .replace(/€/g, " euro ").replace(/→/g, ", poi ")
      .replace(/([←-⇿⌀-⏿①-⓿■-➿⬀-⯿]|[-]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|️|‍)/g, " ")
      .replace(/\bGB\b/g, "giga").replace(/\bMB\b/g, "mega").replace(/\bTB\b/g, "tera").replace(/\bRAM\b/g, "ram")
      .replace(/\bSSD\b/g, "esse esse dì").replace(/\bPC\b/g, "pi ci").replace(/\bIA\b/g, "i a").replace(/\bCPU\b/g, "processore")
      .replace(/\s+/g, " ").trim();
  }
  function frasi(t) {
    var p = t.match(/[^.!?;:]+[.!?;:]*/g) || [t], out = [], buf = "";
    p.forEach(function (s) { s = s.trim(); if (!s) return; if ((buf + " " + s).length < 180) buf = (buf ? buf + " " : "") + s; else { if (buf) out.push(buf); buf = s; } });
    if (buf) out.push(buf);
    return out;
  }

  /* ------------------------------------------------------------------ scelta della voce del sistema */
  var FEMMINILI = /elsa|isabella|alice|federica|paola|emma|giorgia|elena|francesca|chiara|silvia|bianca|carla|serena|female|donna/i;
  CD.vociSistema = function () {
    if (!sintesi) return [];
    return sintesi.getVoices().filter(function (v) { return /^it([-_]|$)/i.test(v.lang); });
  };
  function scegliVoce() {
    var voci = CD.vociSistema();
    if (!voci.length) return null;
    if (CD.imp.voceId && CD.imp.voceId !== "auto" && CD.imp.voceId.indexOf("server:") !== 0) {
      var s = CD.uno(voci, function (v) { return v.voiceURI === CD.imp.voceId || v.name === CD.imp.voceId; });
      if (s) return s;
    }
    // Privacy: in automatico solo voci che lavorano SUL computer. Le voci «online» (Edge «Natural», Google)
    // inviano il testo a Microsoft o Google: si usano solo se l'utente le sceglie in Impostazioni.
    function punti(v) {
      var p = 0;
      if (v.localService === false || /online|natural|google/i.test(v.name)) p -= 100;
      if (FEMMINILI.test(v.name)) p += 10;          // Neura ha una voce femminile, se c'e'
      if (/neural/i.test(v.name) && v.localService !== false) p += 5;
      if (/espeak/i.test(v.name)) p -= 20;
      return p;
    }
    return voci.slice().sort(function (a, b) { return punti(b) - punti(a); })[0];
  }
  if (sintesi && sintesi.onvoiceschanged !== undefined) sintesi.onvoiceschanged = function () { CD.vociSistema(); };

  /* ------------------------------------------------------------------ parlare */
  function finito() { inCorso = false; if (CD.cervello && CD.cervello.stato() === "parla") CD.cervello.stato("riposo"); }
  function prossima(gen, risolvi) {
    if (gen !== generazione) return;
    if (!coda.length) { finito(); risolvi(); return; }
    var f = coda.shift();
    var server = CD.imp.voceId && CD.imp.voceId.indexOf("server:") === 0 && CD.server;
    if (CD.cervello) CD.cervello.stato("parla");
    if (server) {
      CD.api("/api/tts", { testo: f, voce: CD.imp.voceId.slice(7), velocita: CD.imp.velocitaVoce }, { grezzo: true }).then(function (r) { return r.blob(); }).then(function (b) {
        if (gen !== generazione) return;
        audioEl = new Audio(URL.createObjectURL(b));
        try {
          contesto = contesto || new (window.AudioContext || window.webkitAudioContext)();
          var src = contesto.createMediaElementSource(audioEl), an = contesto.createAnalyser();
          an.fftSize = 256; src.connect(an); an.connect(contesto.destination);
          var dati = new Uint8Array(an.frequencyBinCount);
          (function misura() {
            if (!audioEl || audioEl.ended || audioEl.paused) return;
            an.getByteFrequencyData(dati); var s = 0; for (var i = 0; i < dati.length; i++) s += dati[i];
            CD.cervello.livello(s / dati.length / 90); requestAnimationFrame(misura);
          })();
        } catch (e) { /* senza analisi: pazienza */ }
        audioEl.onended = function () { prossima(gen, risolvi); };
        audioEl.onerror = function () { prossima(gen, risolvi); };
        audioEl.play().catch(function () { prossima(gen, risolvi); });
      }, function () { CD.imp.voceId = "auto"; coda.unshift(f); prossima(gen, risolvi); });
      return;
    }
    if (!sintesi) { finito(); risolvi(); return; }
    var u = new SpeechSynthesisUtterance(f), v = scegliVoce();
    if (v) u.voice = v;
    u.lang = v ? v.lang : "it-IT"; u.rate = CD.imp.velocitaVoce || 1; u.pitch = 1.04;
    var pulsa = setInterval(function () { CD.cervello.livello(0.35 + Math.random() * 0.55); }, 120);
    u.onboundary = function () { CD.cervello.livello(0.9); };
    u.onend = u.onerror = function () { clearInterval(pulsa); prossima(gen, risolvi); };
    sintesi.speak(u);
    setTimeout(function () { if (sintesi.paused) sintesi.resume(); }, 300);
  }
  CD.parla = function (testo, opz) {
    opz = opz || {};
    if (!CD.imp.voce && !opz.sempre) return Promise.resolve();
    var t = pulisci(testo);
    if (!t) return Promise.resolve();
    if (opz.interrompi !== false) CD.taci();
    frasi(t).forEach(function (f) { coda.push(f); });
    if (inCorso) return Promise.resolve();
    inCorso = true;
    var gen = generazione;
    return new Promise(function (r) { prossima(gen, r); });
  };
  CD.taci = function () {
    generazione++; coda = []; inCorso = false;
    if (sintesi) try { sintesi.cancel(); } catch (e) { /* niente */ }
    if (audioEl) { try { audioEl.pause(); } catch (e2) { /* niente */ } audioEl = null; }
    if (CD.cervello && CD.cervello.stato() === "parla") CD.cervello.stato("riposo");
  };
  CD.staParlando = function () { return inCorso; };

  /* ------------------------------------------------------------------ ascoltare */
  var Riconoscimento = window.SpeechRecognition || window.webkitSpeechRecognition;
  CD.puoAscoltare = function () { return !!((CD.stato.stt && navigator.mediaDevices) || Riconoscimento); };
  CD.motoreAscolto = function () { return CD.stato.stt ? "locale" : (Riconoscimento ? "browser" : ""); };
  var ascolto = null;

  function consensoBrowser() {
    if (CD.imp.micConsenso) return Promise.resolve(true);
    var chi = /Edg\//.test(navigator.userAgent) ? "Microsoft" : (/Chrome/.test(navigator.userAgent) ? "Google" : "chi produce il browser");
    return CD.modale({
      titolo: "🎤 Parlare con Neura",
      html: "<p>Su questo computer la trascrizione <b>locale</b> (che non fa uscire nulla) non è ancora installata.</p>" +
        "<p>Posso usare il riconoscimento vocale del browser: <b>quello che dite viene inviato a " + chi + "</b> per essere trascritto. " +
        "Il Consulente Digitale non salva la voce.</p><p class=\"piccolo-testo\">Per la trascrizione sul computer: Impostazioni → Voce e microfono.</p>",
      pulsanti: [{ testo: "No grazie, scrivo", valore: false }, { testo: "Accendo il microfono", valore: true, classe: "primario" }]
    }).then(function (si) { if (si) { CD.imp.micConsenso = true; CD.salvaImpostazioni(); } return !!si; });
  }

  function ascoltaBrowser() {
    return consensoBrowser().then(function (si) {
      if (!si) throw new Error("annullato");
      return new Promise(function (risolvi, rifiuta) {
        var r = new Riconoscimento();
        r.lang = "it-IT"; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
        var testo = "", parziale = "", livello = null;
        ascolto = { ferma: function () { try { r.stop(); } catch (e) { /* niente */ } } };
        r.onresult = function (e) {
          parziale = "";
          for (var i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) testo += e.results[i][0].transcript; else parziale += e.results[i][0].transcript;
          }
          CD.cervello.livello(0.9);
          if (CD.suParziale) CD.suParziale(testo + parziale);
        };
        r.onsoundstart = function () { livello = setInterval(function () { CD.cervello.livello(0.3 + Math.random() * 0.5); }, 140); };
        r.onerror = function (e) { clearInterval(livello); ascolto = null; rifiuta(new Error(e.error === "not-allowed" ? "microfono non permesso" : e.error)); };
        r.onend = function () { clearInterval(livello); ascolto = null; risolvi((testo || parziale).trim()); };
        r.start();
      });
    });
  }

  function ascoltaLocale() {
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }).then(function (flusso) {
      return new Promise(function (risolvi, rifiuta) {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var sorgente = ctx.createMediaStreamSource(flusso), proc = ctx.createScriptProcessor(4096, 1, 1);
        var pezzi = [], parlato = false, silenzio = 0, inizio = Date.now(), chiuso = false;
        function chiudi(invia) {
          if (chiuso) return; chiuso = true; ascolto = null;
          try { proc.disconnect(); sorgente.disconnect(); } catch (e) { /* niente */ }
          flusso.getTracks().forEach(function (t) { t.stop(); });
          var freq = ctx.sampleRate; ctx.close();
          if (!invia || !parlato) { risolvi(""); return; }
          CD.cervello.stato("pensiero");
          var wav = codificaWav(pezzi, freq, 16000);
          CD.api("/api/stt", wav, { tipo: "audio/wav" }).then(function (j) { risolvi(j.testo || ""); }, rifiuta);
        }
        ascolto = { ferma: function () { chiudi(true); } };
        proc.onaudioprocess = function (e) {
          var d = e.inputBuffer.getChannelData(0), s = 0;
          for (var i = 0; i < d.length; i++) s += d[i] * d[i];
          var rms = Math.sqrt(s / d.length);
          CD.cervello.livello(Math.min(1, rms * 12));
          pezzi.push(new Float32Array(d));
          if (rms > 0.02) { parlato = true; silenzio = 0; } else if (parlato) silenzio += d.length / ctx.sampleRate;
          if ((parlato && silenzio > 1.3) || Date.now() - inizio > 20000 || (!parlato && Date.now() - inizio > 8000)) chiudi(true);
        };
        sorgente.connect(proc); proc.connect(ctx.destination);
      });
    });
  }
  function codificaWav(pezzi, da, a) {
    var tot = 0; pezzi.forEach(function (p) { tot += p.length; });
    var tutto = new Float32Array(tot), o = 0;
    pezzi.forEach(function (p) { tutto.set(p, o); o += p.length; });
    var rap = da / a, n = Math.floor(tot / rap), buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    function str(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
    str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, a, true); v.setUint32(28, a * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, "data"); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var x = Math.max(-1, Math.min(1, tutto[Math.floor(i * rap)])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    return new Blob([buf], { type: "audio/wav" });
  }

  /* Ascolta e restituisce il testo detto. Se si sta gia' ascoltando, ferma (e invia). */
  CD.ascolta = function () {
    if (ascolto) { ascolto.ferma(); return Promise.resolve(null); }
    CD.taci();
    if (!CD.puoAscoltare()) {
      CD.avviso("🎤 Il microfono non è disponibile qui: scrivete la domanda.", "att");
      return Promise.reject(new Error("nessun microfono"));
    }
    CD.cervello.stato("ascolto");
    var p = CD.stato.stt && navigator.mediaDevices ? ascoltaLocale() : ascoltaBrowser();
    return p.then(function (t) { if (CD.cervello.stato() === "ascolto" || CD.cervello.stato() === "pensiero") CD.cervello.stato("riposo"); return t; },
      function (e) {
        CD.cervello.stato(e.message === "annullato" ? "riposo" : "errore");
        if (e.message !== "annullato") CD.avviso("🎤 " + CD.esc(e.message), "att");
        throw e;
      });
  };
  CD.staAscoltando = function () { return !!ascolto; };
})();
