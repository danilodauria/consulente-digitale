/* ==========================================================================
 *  CONSULENTE DIGITALE - 🌐 Traduzione del programma
 *  Lingue: italiano (originale), English, Français, Español, Deutsch, Română.
 *  1. L'INTERFACCIA si traduce con i dizionari in web/i18n/<lingua>.json (scritti a mano, CC BY-NC-SA 4.0):
 *     ogni testo mostrato viene cercato nel dizionario; i numeri si conservano (segnaposto «#»).
 *  2. I CONTENUTI LUNGHI che il dizionario non conosce si traducono, se volete, con l'IA LOCALE (Ollama):
 *     sul computer, senza inviare nulla fuori; le traduzioni restano in memoria per le volte successive.
 *  3. Neura risponde nella lingua scelta; voce e microfono usano la lingua scelta; date e giorni pure.
 *  Senza IA locale, i testi non presenti nel dizionario restano in italiano.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, traduzioni CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD;
  var L = CD.i18n = { lingua: "it", diz: {}, mancanti: {}, pronta: false };
  L.LINGUE = {
    it: { nome: "Italiano", bandiera: "🇮🇹", bcp: "it-IT", ia: "italiano" },
    en: { nome: "English", bandiera: "🇬🇧", bcp: "en-GB", ia: "inglese (English)" },
    fr: { nome: "Français", bandiera: "🇫🇷", bcp: "fr-FR", ia: "francese (Français)" },
    es: { nome: "Español", bandiera: "🇪🇸", bcp: "es-ES", ia: "spagnolo (Español)" },
    de: { nome: "Deutsch", bandiera: "🇩🇪", bcp: "de-DE", ia: "tedesco (Deutsch)" },
    ro: { nome: "Română", bandiera: "🇷🇴", bcp: "ro-RO", ia: "rumeno (Română)" }
  };
  var DATE = {
    en: [["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]],
    fr: [["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"], ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]],
    es: [["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"], ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]],
    de: [["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"], ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]],
    ro: [["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"], ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"]]
  };
  L.bcp = function () { return (L.LINGUE[L.lingua] || L.LINGUE.it).bcp; };
  L.attiva = function () { return L.lingua !== "it"; };

  /* chiave del dizionario: numeri → «#», giorni → «@g», mesi → «@m» (riempiti poi nella lingua scelta) */
  var RE_NUM = /\d+(?:[.,]\d+)?/g;
  var GIORNI_IT = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  var MESI_IT = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  var RE_GM = new RegExp("\\b(" + GIORNI_IT.concat(MESI_IT).join("|") + ")(?![A-Za-zÀ-ÿ])", "gi");
  var BREVI_G = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"], BREVI_M = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  var RE_OROLOGIO = /^(dom|lun|mar|mer|gio|ven|sab) (\d+) (gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic) (\d+)$/;
  function chiave(t) {
    return t.replace(RE_NUM, "#").replace(RE_GM, function (w) { return GIORNI_IT.indexOf(w.toLowerCase()) >= 0 ? "@g" : "@m"; });
  }
  function nomeData(w) {
    var l = w.toLowerCase(), g = GIORNI_IT.indexOf(l), m = MESI_IT.indexOf(l), d = DATE[L.lingua];
    if (!d) return w;
    var r = g >= 0 ? d[0][g] : d[1][m];
    return w.charAt(0) === w.charAt(0).toUpperCase() ? r.charAt(0).toUpperCase() + r.slice(1) : r;
  }
  function riempi(tr, orig) {
    var n = orig.match(RE_NUM) || [], gm = orig.match(RE_GM) || [], i = 0, j = 0;
    return tr.replace(/#|@g|@m/g, function (x) { if (x === "#") return i < n.length ? n[i++] : "#"; return j < gm.length ? nomeData(gm[j++]) : x; });
  }
  /* traduce una stringa; se non la conosce la annota e la restituisce com'è */
  L.t = function (s) {
    if (!L.attiva() || !s) return s;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2].replace(/\s+/g, " ");
    if (!core || !/[A-Za-zÀ-ÿ]{2}/.test(core)) return s;
    var o = RE_OROLOGIO.exec(core);               // data breve dell'orologio in alto
    if (o && DATE[L.lingua]) return m[1] + DATE[L.lingua][0][BREVI_G.indexOf(o[1])].slice(0, 3) + " " + o[2] + " " + DATE[L.lingua][1][BREVI_M.indexOf(o[3])].slice(0, 3) + " " + o[4] + m[3];
    var tr = L.diz[chiave(core)];
    if (tr == null) {                             // icona davanti (☁️, 🌞…) che cambia: si traduce il resto
      var e = /^([^A-Za-zÀ-ÿ0-9«“"'(]+)(\S[\s\S]*)$/.exec(core);
      if (e && L.diz[chiave(e[2])] != null) return m[1] + e[1] + riempi(L.diz[chiave(e[2])], e[2]) + m[3];
      if (core.length < 1200) L.mancanti[core] = 1; return s;
    }
    return m[1] + riempi(tr, core) + m[3];
  };
  var ORIG = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var SALTA = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|INPUT|SELECT|OPTION_NO)$/;
  function nodoTesto(n) {
    var p = n.parentNode;
    if (!p || SALTA.test(p.nodeName) || (p.closest && p.closest("[data-no-trad],.console,pre,code,.msg-utente,[contenteditable]"))) return;
    var v = n.nodeValue, prima = ORIG && ORIG.get(n);
    if (prima && prima.tr === v) return;                 // già tradotto da noi
    var tr = L.t(v);
    if (tr !== v) { if (ORIG) ORIG.set(n, { it: v, tr: tr }); n.nodeValue = tr; }
  }
  var ATTR = ["placeholder", "title", "aria-label"];
  function elemento(e) {
    for (var i = 0; i < ATTR.length; i++) {
      var a = e.getAttribute && e.getAttribute(ATTR[i]);
      if (a && !e.hasAttribute("data-trad-" + ATTR[i])) { var tr = L.t(a); if (tr !== a) { e.setAttribute(ATTR[i], tr); e.setAttribute("data-trad-" + ATTR[i], "1"); } }
    }
  }
  L.traduciAlbero = function (radice) {
    if (!L.attiva() || !radice) return;
    if (radice.nodeType === 3) { nodoTesto(radice); return; }
    if (radice.nodeType !== 1 && radice.nodeType !== 11) return;
    if (radice.nodeType === 1) elemento(radice);
    var w = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) nodoTesto(n); else elemento(n); }
    pianificaIA();
  };
  /* le schede da stampare: si traduce l'HTML prima di stamparlo */
  L.traduciHtml = function (html) {
    if (!L.attiva()) return html;
    var d = document.createElement("div"); d.innerHTML = html; L.traduciAlbero(d); return d.innerHTML;
  };

  /* ------------------------------------------------------------------ traduzione con l'IA locale (facoltativa) */
  var timerIA = null, inCorsoIA = false;
  function pianificaIA() {
    if (!L.attiva() || !CD.server || !CD.imp.traduzioneIA || !(CD.neura && CD.neura.ia && CD.neura.ia.attivo)) return;
    clearTimeout(timerIA); timerIA = setTimeout(chiediIA, 1500);
  }
  function chiediIA() {
    if (inCorsoIA) return pianificaIA();
    var lista = Object.keys(L.mancanti).filter(function (s) { return L.diz[chiave(s)] == null; }).slice(0, 30);
    if (!lista.length) return;
    inCorsoIA = true;
    CD.api("/api/traduci", { lingua: L.lingua, testi: lista, modello: CD.neura.modello() }).then(function (j) {
      inCorsoIA = false;
      (j.traduzioni || []).forEach(function (t, i) { if (t) L.diz[chiave(lista[i])] = String(t).replace(RE_NUM, "#"); delete L.mancanti[lista[i]]; });
      L.traduciAlbero(document.body);
      if (Object.keys(L.mancanti).length) pianificaIA();
    }, function () { inCorsoIA = false; });
  }
  /* un testo lungo (risposte di Neura senza IA, schede) tradotto al volo con l'IA locale */
  L.traduciTesto = function (testo) {
    if (!L.attiva() || !testo) return Promise.resolve(testo);
    var d = L.diz[chiave(testo.trim())]; if (d != null) return Promise.resolve(riempi(d, testo.trim()));
    if (!CD.server || !(CD.neura && CD.neura.ia && CD.neura.ia.attivo)) return Promise.resolve(testo);
    return CD.api("/api/traduci", { lingua: L.lingua, testi: [testo], modello: CD.neura.modello() }).then(function (j) { return (j.traduzioni || [])[0] || testo; }, function () { return testo; });
  };

  /* saluto iniziale detto da Neura, nella lingua scelta */
  var SALUTI = {
    it: [["Buonanotte", "Buongiorno", "Buon pomeriggio", "Buonasera"], "Sono le %s.", "Sono pronta ad aiutarvi."],
    en: [["Good night", "Good morning", "Good afternoon", "Good evening"], "It is %s.", "I'm ready to help you."],
    fr: [["Bonne nuit", "Bonjour", "Bon après-midi", "Bonsoir"], "Il est %s.", "Je suis prête à vous aider."],
    es: [["Buenas noches", "Buenos días", "Buenas tardes", "Buenas noches"], "Son las %s.", "Estoy lista para ayudarle."],
    de: [["Gute Nacht", "Guten Morgen", "Guten Tag", "Guten Abend"], "Es ist %s Uhr.", "Ich bin bereit, Ihnen zu helfen."],
    ro: [["Noapte bună", "Bună dimineața", "Bună ziua", "Bună seara"], "Este ora %s.", "Sunt gata să vă ajut."]
  };
  L.saluto = function (h, nome) {
    var s = SALUTI[L.lingua] || SALUTI.it, i = h < 5 ? 0 : h < 13 ? 1 : h < 18 ? 2 : 3;
    return s[0][i] + (nome ? " " + nome : "") + "! " + s[1].replace("%s", CD.oraTesto()) + " " + s[2];
  };

  /* ------------------------------------------------------------------ avvio e cambio lingua */
  L.imposta = function (lingua) {
    if (!L.LINGUE[lingua]) lingua = "it";
    L.lingua = lingua;
    document.documentElement.lang = lingua;
    if (lingua === "it") { L.diz = {}; return Promise.resolve(); }
    return fetch("i18n/" + lingua + ".json").then(function (r) { if (!r.ok) throw new Error("dizionario mancante"); return r.json(); }).then(function (j) {
      L.diz = {}; Object.keys(j.t || {}).forEach(function (k) { L.diz[chiave(k)] = j.t[k]; });
      return CD.server ? CD.api("/api/traduci?lingua=" + lingua).then(function (c) { Object.keys(c.cache || {}).forEach(function (k) { if (L.diz[chiave(k)] == null) L.diz[chiave(k)] = c.cache[k]; }); }, function () {}) : null;
    }).catch(function (e) { console.warn("i18n", e); });
  };
  L.osserva = function () {
    if (L.oss || !window.MutationObserver) return;
    L.oss = new MutationObserver(function (lista) {
      if (!L.attiva()) return;
      lista.forEach(function (m) {
        if (m.type === "characterData") nodoTesto(m.target);
        else if (m.type === "attributes") elemento(m.target);
        else for (var i = 0; i < m.addedNodes.length; i++) L.traduciAlbero(m.addedNodes[i]);
      });
    });
    L.oss.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  };
  L.cambia = function (lingua) {
    CD.imp.lingua = lingua;
    var fatto = false, ricarica = function () { if (!fatto) { fatto = true; location.reload(); } };
    CD.salva("impostazioni", CD.imp, true).then(ricarica, ricarica);
    setTimeout(ricarica, 4000);
  };
  /* finestrella di scelta (pulsante 🌐 in alto) */
  L.scegli = function () {
    var cur = CD.imp.lingua || "it";
    CD.modale({ titolo: "🌐 Lingua · Language · Langue · Idioma · Sprache · Limbă",
      html: '<div class="lingue">' + Object.keys(L.LINGUE).map(function (k) { var x = L.LINGUE[k];
        return '<button class="tessera' + (k === cur ? " scelta" : "") + '" data-lingua="' + k + '"><span class="em">' + x.bandiera + "</span><b>" + x.nome + "</b></button>"; }).join("") + "</div>" +
        '<label class="opzione"><input type="checkbox" id="lingua-ia"' + (CD.imp.traduzioneIA ? " checked" : "") + "> 🧠 Traduci anche i contenuti lunghi con l'IA locale (sul computer, senza inviare nulla)</label>" +
        '<p class="piccolo-testo" data-no-trad>Interfaccia tradotta a mano; contenuti e schede tradotti dall\'IA locale se attiva, altrimenti restano in italiano. Il vademecum è in italiano.</p>',
      pulsanti: [{ testo: "OK", valore: null }],
      dopo: function (m, chiudi) {
        CD.$("#lingua-ia", m).onchange = function () { CD.imp.traduzioneIA = this.checked; CD.salvaImpostazioni(); };
        CD.$$("[data-lingua]", m).forEach(function (b) { b.onclick = function () { var l = b.getAttribute("data-lingua"); chiudi(); if (l !== cur) L.cambia(l); }; });
      }
    });
  };
})();
