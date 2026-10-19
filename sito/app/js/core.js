/* ==========================================================================
 *  CONSULENTE DIGITALE - nucleo dell'interfaccia
 *  Funzioni di base: elementi, server locale, dati, impostazioni, pagine (router),
 *  orologio sincronizzato con Internet, avvisi, finestre, stampa professionale.
 *  JavaScript puro (ES5): gira anche su PC ricondizionati e senza server (file://, telefono).
 *  Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD = window.CD || {};
  CD.versione = "1.3.0";

  /* ------------------------------------------------------------------ utilita' */
  CD.$ = function (s, r) { return (r || document).querySelector(s); };
  CD.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  CD.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  CD.copia = function (o) { return JSON.parse(JSON.stringify(o)); };
  CD.attendi = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  CD.arrotonda = function (n, d) { var p = Math.pow(10, d || 0); return Math.round(n * p) / p; };
  CD.gb = function (mb) { return mb ? CD.arrotonda(mb / 1024, mb < 10240 ? 1 : 0) : 0; };
  CD.mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);   // iPad = «Mac» con il tocco
  CD.hooks = { avvio: [], cambioProfilo: [] };
  CD.uno = function (lista, fn) { for (var i = 0; i < lista.length; i++) if (fn(lista[i], i)) return lista[i]; return null; };

  /* ------------------------------------------------------------------ server locale */
  CD.server = false;
  CD.stato = { sistema: "", token: "" };
  CD.sistema = function () {    // sistema del computer (dal server) o stimato dal browser
    if (CD.stato.sistema) return CD.stato.sistema;
    var u = (navigator.userAgent || "") + " " + (navigator.platform || "");
    if (/Windows/i.test(u)) return "windows";
    if (/Mac/i.test(u) && !/iPhone|iPad/i.test(u)) return "mac";
    if (/Linux|X11|CrOS/i.test(u) && !/Android/i.test(u)) return "linux";
    return "altro";
  };
  CD.nomeSistema = function (f) { return { windows: "Windows", linux: "Linux", mac: "macOS", altro: "questo dispositivo" }[f || CD.sistema()] || f; };

  CD.api = function (percorso, corpo, opz) {
    opz = opz || {};
    if (!CD.server && !opz.forza) return Promise.reject(new Error("server locale non disponibile"));
    var init = { method: corpo === undefined ? "GET" : "POST", headers: {} };
    if (corpo !== undefined) {
      if (corpo && typeof corpo === "object" && !(corpo instanceof Blob) && !(corpo instanceof ArrayBuffer)) {
        if (corpo.token === undefined && CD.stato.token) corpo.token = CD.stato.token;
        init.body = JSON.stringify(corpo); init.headers["Content-Type"] = "application/json";
      } else { init.body = corpo; init.headers["Content-Type"] = opz.tipo || "application/octet-stream"; }
    }
    return fetch(percorso, init).then(function (r) {
      if (opz.grezzo) { if (!r.ok) throw new Error("errore " + r.status); return r; }
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.errore || ("errore " + r.status));
        return j;
      });
    });
  };

  /* ------------------------------------------------------------------ dati (server + copia nel browser) */
  function ls(k, v) {
    try { if (v === undefined) { var x = localStorage.getItem("cd." + k); return x ? JSON.parse(x) : null; } localStorage.setItem("cd." + k, JSON.stringify(v)); }
    catch (e) { /* archivio del browser non disponibile */ }
    return null;
  }
  var timer = {};
  CD.carica = function (chiave) {
    var locale = ls(chiave);
    if (!CD.server) return Promise.resolve(locale);
    return CD.api("/api/data/" + chiave).then(function (j) { return j.valore != null ? j.valore : locale; }, function () { return locale; });
  };
  CD.salva = function (chiave, valore, subito) {     // subito = true: salva adesso e restituisce una promessa (prima di ricaricare)
    ls(chiave, valore);
    if (!CD.server) return Promise.resolve();
    clearTimeout(timer[chiave]);
    if (subito) return CD.api("/api/data/" + chiave, { valore: valore }).catch(function () {});
    timer[chiave] = setTimeout(function () { CD.api("/api/data/" + chiave, { valore: valore }).catch(function () {}); }, 400);
  };

  /* ------------------------------------------------------------------ impostazioni */
  CD.PREDEFINITE = {
    tema: "notte", testo: 18, voce: true, voceId: "auto", velocitaVoce: 1.0, online: true, oraInternet: true,
    automatico: true, maniLibere: false, animazioni: "piene", modelloIA: "", micConsenso: false, saluto: true, nomeUtente: "", notizie: true, lingua: "it", traduzioneIA: true
  };
  CD.imp = CD.copia(CD.PREDEFINITE);
  CD.salvaImpostazioni = function () { CD.salva("impostazioni", CD.imp); CD.applicaImpostazioni(); };
  CD.applicaImpostazioni = function () {
    var r = document.documentElement;
    r.setAttribute("data-tema", CD.imp.tema);
    r.style.setProperty("--fs", (CD.imp.testo || 18) + "px");
    r.classList.toggle("animazioni-leggere", CD.imp.animazioni !== "piene");
    var bv = CD.$("#btn-voce");
    if (bv) { bv.textContent = CD.imp.voce ? "🔊" : "🔇"; bv.setAttribute("aria-label", CD.imp.voce ? "Voce di Neura accesa" : "Voce di Neura spenta"); }
  };

  /* ------------------------------------------------------------------ profilo (chi usa il programma) */
  CD.profilo = null;
  CD.TIPI = {
    persona: { nome: "Persona", icona: "🙂", desc: "Per me e per l'uso di tutti i giorni" },
    famiglia: { nome: "Famiglia", icona: "👨‍👩‍👧", desc: "Computer e dispositivi di casa, per grandi e piccoli" },
    anziano: { nome: "Persona anziana", icona: "👵", desc: "Semplicità, caratteri grandi, sicurezza" },
    studente: { nome: "Studente", icona: "🎒", desc: "Studio, appunti, lezioni online" },
    creativo: { nome: "Creativo e gamer", icona: "🎨", desc: "Foto, video, musica, giochi" },
    professionista: { nome: "Professionista", icona: "💼", desc: "Libero professionista, partita IVA, lavoro da casa" },
    ditta: { nome: "Ditta / negozio", icona: "🏪", desc: "Piccola impresa, artigiano, negozio" },
    azienda: { nome: "Società / azienda", icona: "🏢", desc: "Più postazioni, uffici, reparti" },
    scuola: { nome: "Scuola / aula", icona: "🏫", desc: "Laboratori, aule, docenti e allievi" },
    centro: { nome: "Centro anziani / sociale", icona: "🤝", desc: "Centri anziani, biblioteche, associazioni, parrocchie" },
    ente: { nome: "Ente pubblico", icona: "🏛️", desc: "Comune, ufficio pubblico, sanità" }
  };
  CD.gruppo = function () { return CD.profilo && /^(ditta|azienda|scuola|centro|ente|famiglia)$/.test(CD.profilo.tipo); };
  CD.salvaProfilo = function (p) {
    CD.profilo = p; CD.salva("profilo", p);
    CD.hooks.cambioProfilo.forEach(function (f) { try { f(p); } catch (e) { console.error(e); } });
    CD.mostraProfilo();
  };
  CD.mostraProfilo = function () {
    var el = CD.$("#profilo-breve");
    if (!el) return;
    if (!CD.profilo) { el.innerHTML = "👤 Scegliete chi usa il programma"; return; }
    var t = CD.TIPI[CD.profilo.tipo] || CD.TIPI.persona;
    el.innerHTML = t.icona + " <b>" + CD.esc(CD.profilo.nome || t.nome) + "</b><br><small>" + CD.esc(t.nome) +
      (CD.profilo.quanti > 1 ? " · " + CD.profilo.quanti + " persone/postazioni" : "") + " · cambia</small>";
  };

  /* ------------------------------------------------------------------ orologio: ora del PC + ora ufficiale */
  CD.scarto = 0;          // millisecondi da aggiungere all'ora del PC per avere l'ora esatta
  CD.oraSync = null;      // {fonte, metodo, scarto_s, quando}
  CD.adesso = function () { return new Date(Date.now() + CD.scarto); };
  CD.sincronizzaOra = function () {
    var el = CD.$("#ora-sync");
    if (!CD.server || !CD.imp.online || !CD.imp.oraInternet) {
      if (el) { el.textContent = "ora del PC"; el.className = "sync"; }
      return Promise.resolve(null);
    }
    return CD.api("/api/ora?internet=1").then(function (j) {
      if (!j.internet) { if (el) { el.textContent = "ora del PC (Internet non risponde)"; el.className = "sync att"; } return null; }
      CD.scarto = Math.round(j.internet.unix * 1000 - j.unix * 1000);
      CD.oraSync = { fonte: j.internet.fonte, metodo: j.internet.metodo, scarto_s: j.internet.scarto_s, quando: new Date() };
      var s = Math.abs(j.internet.scarto_s);
      if (el) {
        el.textContent = (s < 1 ? "esatta ✓ " : "corretta di " + CD.arrotonda(s, 1) + " s · ") + j.internet.fonte;
        el.className = "sync " + (s < 2 ? "ok" : "att");
        el.title = "Ora ufficiale da " + j.internet.fonte + " (" + j.internet.metodo + "). Il computer è " + (j.internet.scarto_s > 0 ? "avanti" : "indietro") + " di " + CD.arrotonda(s, 2) + " secondi.";
      }
      return CD.oraSync;
    }, function () { return null; });
  };
  var GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  var MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  CD.GIORNI = GIORNI; CD.MESI = MESI;
  CD.dataEstesa = function (d) { d = d || CD.adesso(); return GIORNI[d.getDay()] + " " + d.getDate() + " " + MESI[d.getMonth()] + " " + d.getFullYear(); };
  CD.oraTesto = function (d) { d = d || CD.adesso(); function z(n) { return (n < 10 ? "0" : "") + n; } return z(d.getHours()) + ":" + z(d.getMinutes()); };
  function ticchettio() {
    var d = CD.adesso();
    function z(n) { return (n < 10 ? "0" : "") + n; }
    var a = CD.$("#ora-locale"), b = CD.$("#data-locale");
    if (a) a.textContent = z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds());
    if (b) b.textContent = GIORNI[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + MESI[d.getMonth()].slice(0, 3) + " " + d.getFullYear();
  }
  setInterval(ticchettio, 1000);

  /* ------------------------------------------------------------------ rete e stato */
  CD.online = navigator.onLine !== false;
  CD.controllaRete = function () {
    var p = CD.server && CD.imp.online ? CD.api("/api/rete").then(function (j) { return !!j.online; }, function () { return navigator.onLine; })
      : Promise.resolve(navigator.onLine !== false && CD.imp.online);
    return p.then(function (on) {
      CD.online = on;
      var s = CD.$("#spia-rete");
      if (s) { s.className = "spia " + (on ? "on" : "off"); s.textContent = on ? "● online" : "○ offline"; }
      return on;
    });
  };

  /* ------------------------------------------------------------------ pagine */
  CD.viste = {};
  CD.registra = function (id, def) { def.id = id; CD.viste[id] = def; };
  CD.vai = function (h) { if (location.hash === h) CD.mostraVista(); else location.hash = h; };
  CD.vistaCorrente = "";
  CD.mostraVista = function () {
    var h = (location.hash || "#/").replace(/^#\/?/, "");
    var parti = h.split("/"), id = parti[0] || "inizio";
    var v = CD.viste[id] || CD.viste.inizio;
    var main = CD.$("#principale");
    if (CD.vistaCorrente && CD.viste[CD.vistaCorrente] && CD.viste[CD.vistaCorrente].esci) {
      try { CD.viste[CD.vistaCorrente].esci(); } catch (e) { /* niente */ }
    }
    CD.vistaCorrente = v.id;
    document.body.setAttribute("data-vista", v.id);
    main.innerHTML = "";
    var box = document.createElement("section");
    box.className = "vista vista-" + v.id; box.id = "vista-" + v.id;
    main.appendChild(box);
    document.title = (v.titolo ? v.titolo + " · " : "") + "Consulente Digitale";
    CD.$$("#menu a").forEach(function (a) {
      var esatto = a.getAttribute("data-h");                // voci che puntano a una scheda precisa (utility del telefono)
      a.classList.toggle("attiva", esatto ? esatto === "#/" + h.split("/").slice(0, 2).join("/").replace(/\/$/, "") : a.getAttribute("data-v") === v.id);
    });
    CD.$("#menu").classList.remove("aperto");
    try { v.mostra(box, parti.slice(1)); } catch (e) { box.innerHTML = '<div class="avviso male">Errore nella pagina: ' + CD.esc(e.message) + "</div>"; console.error(e); }
    if (v.id !== "neura") window.scrollTo(0, 0);
    if (CD.neura && CD.neura.pagina) CD.neura.pagina(v);
  };
  window.addEventListener("hashchange", function () { CD.mostraVista(); });

  CD.titolo = function (em, titolo, sotto) {
    return '<header class="titolo-pagina"><span class="em" aria-hidden="true">' + em + '</span><div><h1>' + CD.esc(titolo) + "</h1>" +
      (sotto ? "<p>" + sotto + "</p>" : "") + "</div></header>";
  };

  /* ------------------------------------------------------------------ avvisi e finestre */
  CD.avviso = function (testo, tipo, ms) {
    var box = CD.$("#avvisi"), d = document.createElement("div");
    d.className = "avviso-volante " + (tipo || ""); d.innerHTML = testo;
    box.appendChild(d);
    setTimeout(function () { d.style.opacity = "0"; d.style.transition = "opacity .4s"; setTimeout(function () { d.remove(); }, 450); }, ms || 4200);
  };
  CD.modale = function (opz) {
    return new Promise(function (risolvi) {
      var sf = CD.$("#modale-sfondo");
      var puls = (opz.pulsanti || [{ testo: "Chiudi", valore: null, classe: "" }]).map(function (b, i) {
        return '<button class="btn ' + (b.classe || "") + '" data-i="' + i + '">' + b.testo + "</button>";
      }).join("");
      sf.innerHTML = '<div class="modale" role="dialog" aria-modal="true" aria-labelledby="modale-titolo"><h2 id="modale-titolo">' + (opz.titolo || "") + "</h2>" +
        '<div class="modale-corpo">' + (opz.html || "") + '</div><div class="pulsanti">' + puls + "</div></div>";
      sf.hidden = false;
      var prima = document.activeElement;
      function chiudi(v) {
        sf.hidden = true; sf.innerHTML = ""; document.removeEventListener("keydown", tasto);
        if (prima && prima.focus) prima.focus();
        risolvi(v);
      }
      function tasto(e) { if (e.key === "Escape" && opz.chiudibile !== false) chiudi(null); }
      document.addEventListener("keydown", tasto);
      CD.$$(".pulsanti button", sf).forEach(function (b) {
        b.addEventListener("click", function () {
          var def = opz.pulsanti ? opz.pulsanti[+b.getAttribute("data-i")] : { valore: null };
          chiudi(def.valore);
        });
      });
      sf.onclick = function (e) { if (e.target === sf && opz.chiudibile !== false) chiudi(null); };
      if (opz.dopo) opz.dopo(CD.$(".modale", sf), chiudi);
      var f = CD.$(".pulsanti .primario, .pulsanti button", sf); if (f) f.focus();
    });
  };
  CD.conferma = function (titolo, html, si, no) {
    return CD.modale({ titolo: titolo, html: html, pulsanti: [{ testo: no || "Annulla", valore: false }, { testo: si || "Procedi", valore: true, classe: "primario" }] });
  };

  /* ------------------------------------------------------------------ stampa professionale */
  CD.stampa = function (titolo, corpoHtml, opz) {
    opz = opz || {};
    var d = CD.adesso();
    var chi = CD.profilo ? (CD.profilo.nome || (CD.TIPI[CD.profilo.tipo] || {}).nome || "") : "";
    var css = "";
    CD.$$('link[rel="stylesheet"]').forEach(function (l) { if (/stampa\.css/.test(l.href)) css = '<link rel="stylesheet" href="' + l.href + '">'; });
    var logo = new URL("img/logo.svg", location.href).href;
    var html = '<!doctype html><html lang="it"><head><meta charset="utf-8"><title>' + CD.esc(titolo) + "</title>" + css + "</head><body class=\"foglio\">" +
      '<header class="f-testa"><img src="' + logo + '" alt=""><div><div class="f-marchio">Consulente Digitale</div><div class="f-tit">' + CD.esc(titolo) + "</div></div>" +
      '<div class="f-data">' + CD.esc(CD.dataEstesa(d)) + "<br>ore " + CD.oraTesto(d) + (chi ? "<br>per: <b>" + CD.esc(chi) + "</b>" : "") +
      (opz.codice ? "<br>Scheda n. " + CD.esc(opz.codice) : "") + "</div></header>" +
      '<main class="f-corpo">' + corpoHtml + "</main>" + (CD.piedeStampa ? CD.piedeStampa(opz.piede) : "") + "</body></html>";
    if (CD.i18n && CD.i18n.attiva()) html = html.replace(/<body class="foglio">([\s\S]*)<\/body>/, function (m, b) { return '<body class="foglio">' + CD.i18n.traduciHtml(b) + "</body>"; }).replace('<html lang="it">', '<html lang="' + CD.i18n.lingua + '">');
    var fr = CD.$("#cornice-stampa");
    var doc = fr.contentWindow.document;
    doc.open(); doc.write(html); doc.close();
    setTimeout(function () {
      try { fr.contentWindow.focus(); fr.contentWindow.print(); }
      catch (e) { var w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); w.print(); } }
    }, 500);
  };
  CD.codiceScheda = function () {
    var d = CD.adesso();
    return "CD-" + d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  };

  /* ------------------------------------------------------------------ download di un testo (script, schede) */
  CD.scarica = function (nome, testo, tipo) {
    var b = new Blob([testo], { type: tipo || "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = nome;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  CD.copiaTesto = function (t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(function () { CD.avviso("📋 Copiato", "ok"); });
    var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); CD.avviso("📋 Copiato", "ok"); } catch (e) { /* niente */ }
    ta.remove(); return Promise.resolve();
  };
  CD.apriLink = function (url) { var w = window.open(url, "_blank", "noopener"); if (!w) location.href = url; };

  /* ------------------------------------------------------------------ indicatori circolari (punteggi) */
  CD.metro = function (valore, max, etichetta, colore) {
    var p = Math.max(0, Math.min(1, valore / max)), r = 42, c = 2 * Math.PI * r;
    colore = colore || (p >= .7 ? "var(--ok)" : p >= .45 ? "var(--attenzione)" : "var(--male)");
    return '<div class="metro"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--linea)" stroke-width="9"/>' +
      '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + colore + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + (c * p).toFixed(1) + " " + c.toFixed(1) +
      '" transform="rotate(-90 50 50)" style="filter:drop-shadow(0 0 6px ' + colore + ')"/>' +
      '<text x="50" y="57" text-anchor="middle" font-size="24" font-weight="700" fill="currentColor">' + CD.esc(valore) + "</text></svg><b>" + CD.esc(etichetta) + "</b></div>";
  };
})();
