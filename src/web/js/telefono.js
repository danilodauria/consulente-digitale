/* ==========================================================================
 *  CONSULENTE DIGITALE - L'app per telefono e tablet (Android, iPhone, iPad)
 *  Riconosce il dispositivo (telefono o tablet, Android o Apple, browser, app installata o no) e,
 *  quando il programma non c'è (app dal sito), toglie i comandi che servono solo al computer
 *  e li sostituisce con le utility dello stesso scopo per il telefono:
 *    🔬 Analisi del PC        → 📱 Il mio telefono (scheda del dispositivo e consigli)
 *    ⬇️ Aggiornamenti e driver → ⬇️ Aggiornamenti del sistema e delle app, passo per passo
 *    🚀 Ottimizza · 🩺 Salute  → 🩺 Salute e sicurezza (spazio, batteria, backup, furto, truffe, privacy, vista)
 *    📦 Programmi consigliati → 📦 App consigliate
 *  Mostra anche il banner «Aggiungi alla schermata Home» con l'icona del Consulente Digitale.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, testi CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var T = CD.telefono = { attivo: false };

  /* ------------------------------------------------------------------ riconoscere il dispositivo */
  T.rileva = function () {
    var ua = navigator.userAgent || "", tp = navigator.maxTouchPoints || 0;
    var ipad = /iPad/.test(ua) || (navigator.platform === "MacIntel" && tp > 1);
    var iphone = /iPhone|iPod/.test(ua), android = /Android/i.test(ua);
    var d = { os: iphone ? "ios" : ipad ? "ipados" : android ? "android" : "altro", apple: iphone || ipad, android: android };
    d.tablet = ipad || (android && !/Mobile/i.test(ua)) || (!iphone && tp > 0 && Math.min(screen.width, screen.height) >= 600);
    d.tipo = d.tablet ? "tablet" : "telefono";
    d.nome = iphone ? "iPhone" : ipad ? "iPad" : android ? (d.tablet ? "tablet Android" : "telefono Android") : (d.tablet ? "tablet" : "telefono");
    var m;
    if (d.apple) {
      m = ua.match(/OS (\d+)[_.](\d+)/); d.versione = m ? m[1] + "." + m[2] : "";
      var vs = ua.match(/Version\/(\d+)(?:\.(\d+))?/);          // da iOS 26 Safari scrive qui il numero vero
      if (vs && +vs[1] >= 26 && (!m || +vs[1] > +m[1])) d.versione = vs[1] + (vs[2] ? "." + vs[2] : "");
      d.sistema = (iphone ? "iOS " : "iPadOS ") + (d.versione || "");
    } else if (android) {
      m = ua.match(/Android (\d+(?:\.\d+)?)/); d.versione = m ? m[1] : ""; d.sistema = "Android " + d.versione;
    } else d.sistema = "";
    d.browser = /CriOS/.test(ua) ? "Chrome" : /FxiOS/.test(ua) ? "Firefox" : /EdgiOS|EdgA/.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" :
      /OPiOS|OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "browser";
    d.installata = !!((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone);
    return d;
  };
  T.disp = T.rileva();
  if (T.disp.os === "ipados") CD.mobile = true;      // gli iPad si presentano come un Mac

  // Android con Chrome: versione vera e modello (il browser li nasconde nel testo normale)
  T.dettagli = function () {
    var uad = navigator.userAgentData;
    if (!T.disp.android || !uad || !uad.getHighEntropyValues) return Promise.resolve(T.disp);
    return uad.getHighEntropyValues(["model", "platformVersion"]).then(function (h) {
      if (h.model) T.disp.modello = h.model;
      if (h.platformVersion) { T.disp.versione = h.platformVersion.split(".")[0]; T.disp.sistema = "Android " + T.disp.versione; }
      return T.disp;
    }, function () { return T.disp; });
  };

  /* ------------------------------------------------------------------ modalità telefono */
  var SOLO_PC = { analisi: "#/telefono", hardware: "#/telefono", interventi: "#/telefono/salute", aggiornamenti: "#/telefono/aggiornamenti",
    ottimizza: "#/telefono/salute", strumenti: "#/telefono/salute", programmi: "#/telefono/app", programma: "#/telefono/aggiornamenti" };
  T.soloPC = function (h) { return !!SOLO_PC[String(h || "").replace(/^#\/?/, "").split("/")[0]]; };
  T.prepara = function () {
    T.attivo = !CD.server && T.disp.os !== "altro";
    if (!T.attivo) return;
    document.body.classList.add("modo-telefono");
    document.body.setAttribute("data-dispositivo", T.disp.os + " " + T.disp.tipo);
    // menu: via le pagine del computer, dentro le utility del telefono
    var menu = CD.$("#menu"), primo = menu && menu.querySelector('[data-v="analisi"]');
    if (menu && primo) {
      var nuovi = [["#/telefono", "📱", T.disp.tablet ? "Il mio tablet" : "Il mio telefono"], ["#/telefono/aggiornamenti", "⬇️", "Aggiornamenti"],
        ["#/telefono/salute", "🩺", "Salute e sicurezza"], ["#/telefono/app", "📦", "App consigliate"]];
      nuovi.forEach(function (n) {
        var a = document.createElement("a"); a.href = n[0]; a.setAttribute("data-v", "telefono"); a.setAttribute("data-h", n[0]); a.className = "menu-telefono";
        a.innerHTML = "<span>" + n[1] + "</span>" + esc(n[2]); menu.insertBefore(a, primo);
      });
      Object.keys(SOLO_PC).forEach(function (v) { var x = menu.querySelector('[data-v="' + v + '"]'); if (x) x.parentNode.removeChild(x); });
    }
    // il vademecum sta nella cartella dei download del sito
    var vd = CD.$("#menu-vademecum"); if (vd) vd.href = "../scarica/Vademecum_Consulente_Digitale_" + CD.versione + ".pdf";
    // le pagine del computer portano alla utility del telefono con lo stesso scopo
    var mostra = CD.mostraVista;
    CD.mostraVista = function () {
      var id = (location.hash || "#/").replace(/^#\/?/, "").split("/")[0];
      if (SOLO_PC[id]) { location.replace(location.pathname + location.search + SOLO_PC[id]); return; }
      return mostra.apply(this, arguments);
    };
    setTimeout(banner, 20000);
  };

  /* ------------------------------------------------------------------ testi delle utility */
  // i: iPhone/iPad (si legge «iPhone» o «iPad» secondo il dispositivo), a: Android (i menu cambiano un po' secondo la marca)
  var AGG = {
    i: [["📲 Il sistema (iOS / iPadOS)", ["Collegate il dispositivo alla corrente e al Wi-Fi", "Aprite Impostazioni → Generali → Aggiornamento software",
          "Se c'è una versione nuova toccate «Aggiorna ora» o «Scarica e installa» e inserite il codice", "Nella stessa pagina attivate «Aggiornamenti automatici»"]],
      ["🛍️ Le app", ["Aprite l'App Store e toccate la vostra foto in alto a destra", "Scorrete e toccate «Aggiorna tutto»",
          "Per farlo da solo: Impostazioni → App → App Store (sulle versioni precedenti: Impostazioni → App Store) → attivate «Aggiornamenti app»"]],
      ["🌐 Il browser", ["Safari si aggiorna insieme al sistema", "Chrome, Firefox ed Edge si aggiornano dall'App Store come le altre app"]]],
    a: [["📲 Il sistema (Android)", ["Collegate il telefono alla corrente e al Wi-Fi", "Aprite Impostazioni → Sistema → Aggiornamento software (Samsung: Impostazioni → Aggiornamenti software → Scarica e installa)",
          "Se c'è una versione nuova toccate «Scarica e installa»"]],
      ["🛡️ Gli aggiornamenti di sicurezza di Google", ["Impostazioni → Sicurezza e privacy → Aggiornamenti di sistema", "Toccate «Aggiornamento di sicurezza» e «Aggiornamento di sistema Google Play»"]],
      ["🛍️ Le app", ["Aprite il Play Store e toccate l'icona del vostro profilo in alto a destra", "Toccate «Gestisci app e dispositivo» → «Aggiorna tutto»",
          "Per farlo da solo: profilo → Impostazioni → Preferenze di rete → «Aggiornamento automatico app» → «Tramite qualsiasi rete» o «Solo tramite Wi-Fi»"]],
      ["🌐 Il browser", ["Chrome, Firefox, Edge e Samsung Internet si aggiornano dal Play Store (o dal Galaxy Store) come le altre app"]]]
  };
  var SALUTE = [
    { t: "💾 Spazio libero", i: ["Impostazioni → Generali → Spazio iPhone: vedete cosa occupa più spazio", "Attivate «Rimuovi app inutilizzate» (le app tornano con un tocco, i dati restano)",
        "Cancellate video lunghi e foto doppie; svuotate l'album «Eliminati di recente»", "Tenete libero almeno il 10% dello spazio: il dispositivo resta veloce"],
      a: ["Aprite l'app «Files di Google» → Pulizia (oppure Impostazioni → Memoria; Samsung: Assistenza dispositivo → Memoria)", "Disinstallate le app che non usate da mesi",
        "In Google Foto, dopo il backup, toccate «Libera spazio»", "Tenete libero almeno il 10% dello spazio: il telefono resta veloce"] },
    { t: "🔋 Batteria", i: ["Impostazioni → Batteria → Stato batteria e caricamento: sotto l'80% di capacità conviene sostituirla", "Lasciate attiva la «Ricarica ottimizzata»",
        "Evitate il caldo (auto al sole, cuscini) e la ricarica sotto il cuscino", "Una batteria nuova costa molto meno di un telefono nuovo"],
      a: ["Impostazioni → Batteria: guardate quali app consumano di più", "Attivate la protezione della batteria se c'è (Samsung: «Proteggi batteria», Pixel: «Ricarica adattiva»)",
        "Usate il risparmio energetico quando la batteria è bassa", "Evitate il caldo: una batteria gonfia va portata subito al centro di raccolta"] },
    { t: "☁️ Copia di sicurezza (backup)", i: ["Impostazioni → il vostro nome → iCloud → Backup iCloud → attivo", "Il backup parte da solo di notte, in carica e con il Wi-Fi",
        "In alternativa: collegate l'iPhone al computer (Finder su Mac, app Dispositivi Apple o iTunes su Windows)"],
      a: ["Impostazioni → Google → Backup (o Impostazioni → Sistema → Backup) → «Esegui backup ora»", "Nell'app Google Foto attivate il backup di foto e video",
        "Copiate le foto importanti anche su un disco del computer (per esempio con LocalSend)"] },
    { t: "🔒 Blocco e ritrovamento", i: ["Impostazioni → Face ID e codice (o Touch ID e codice): usate un codice di 6 cifre", "Attivate «Protezione dispositivo rubato» nella stessa pagina",
        "Impostazioni → il vostro nome → Dov'è → «Trova il mio iPhone» attivo", "Se lo perdete: dal computer aprite icloud.com/find"],
      a: ["Impostazioni → Sicurezza: impostate un blocco schermo con PIN o impronta", "Impostazioni → Google → Trova il mio dispositivo: attivo",
        "Se lo perdete: dal computer aprite android.com/find"] },
    { t: "🎣 Truffe, chiamate e SMS", i: ["Impostazioni → App → Telefono → «Silenzia sconosciuti» (sulle versioni precedenti: Impostazioni → Telefono)",
        "Impostazioni → App → Messaggi → «Filtra mittenti sconosciuti»", "Banca, Poste e INPS non chiedono mai codici per SMS o telefono: non toccate i link dei messaggi"],
      a: ["App Telefono → ⋮ → Impostazioni → «ID chiamante e spam» → attivate il filtro", "Nei Messaggi: ⋮ → Impostazioni → Protezione antispam",
        "Banca, Poste e INPS non chiedono mai codici per SMS o telefono: non toccate i link dei messaggi"] },
    { t: "🕵️ Privacy e permessi", i: ["Impostazioni → Privacy e sicurezza: controllate Localizzazione, Microfono, Fotocamera, Foto", "Usate il «Controllo di sicurezza» nella stessa pagina",
        "Quando un'app chiede di tracciarvi, scegliete «Chiedi all'app di non tracciare»"],
      a: ["Impostazioni → Sicurezza e privacy → Privacy → Gestione autorizzazioni", "Togliete posizione, microfono e fotocamera alle app che non ne hanno bisogno",
        "Il «Pannello privacy» mostra chi ha usato cosa nelle ultime 24 ore"] },
    { t: "👓 Vedere e usare meglio", i: ["Impostazioni → Schermo e luminosità → Dimensioni testo e «Testo in grassetto»", "Impostazioni → Accessibilità → Zoom, Lente d'ingrandimento, Contenuto letto ad alta voce",
        "Per una persona anziana: «Accesso assistito» (Impostazioni → Accessibilità) mostra solo poche app con pulsanti grandi"],
      a: ["Impostazioni → Display → Dimensione carattere e visualizzazione", "Impostazioni → Accessibilità → Ingrandimento, Seleziona per ascoltare",
        "Per una persona anziana: Samsung «Modalità facile» (Impostazioni → Display) o un launcher semplificato"] },
    { t: "🐢 Telefono lento", i: ["Spegnete e riaccendete una volta alla settimana", "Aggiornate sistema e app (scheda «Aggiornamenti»)", "Liberate spazio (vedi sopra)",
        "Non serve chiudere le app ogni volta: il sistema lo fa da solo"],
      a: ["Spegnete e riaccendete una volta alla settimana", "Aggiornate sistema e app (scheda «Aggiornamenti»)", "Disinstallate le app che non usate e liberate spazio",
        "Samsung: Assistenza dispositivo → «Ottimizza ora»"] }
  ];
  var APP = [
    ["🔐", "Bitwarden", "Gestore di password gratuito e open source: una password diversa per ogni sito, ricordata per voi.", "ia"],
    ["📲", "LocalSend", "Manda foto e file al computer senza cavi e senza Internet (basta lo stesso Wi-Fi).", "ia"],
    ["🏛️", "IO", "L'app dei servizi pubblici italiani: avvisi, pagamenti, documenti.", "ia"],
    ["🪪", "CieID", "Accesso ai servizi online con la Carta d'Identità Elettronica.", "ia"],
    ["🔑", "Microsoft Authenticator", "Codici per la verifica in due passaggi degli account importanti.", "ia"],
    ["💬", "Signal", "Messaggi e chiamate cifrati, senza pubblicità.", "ia"],
    ["🎬", "VLC", "Guarda video e ascolta musica in quasi tutti i formati.", "ia"],
    ["🦊", "Firefox", "Browser con protezione dal tracciamento.", "ia"],
    ["🗺️", "Organic Maps", "Mappe che funzionano anche senza Internet, senza pubblicità.", "ia"],
    ["🧹", "Files by Google", "Libera spazio e trova i file doppi o inutili.", "a"]
  ];

  function nomeApple(t) { return T.disp.os === "ipados" ? t.replace(/iPhone/g, "iPad") : t; }
  function passi(l) { return '<ol class="passi">' + l.map(function (x) { return "<li>" + esc(nomeApple(x)) + "</li>"; }).join("") + "</ol>"; }
  function sceltaSistema(el, quale, ridisegna) {
    return '<div class="opzioni tel-sistema"><button class="btn' + (quale === "i" ? " primario" : "") + '" data-sis="i">🍎 iPhone e iPad</button>' +
      '<button class="btn' + (quale === "a" ? " primario" : "") + '" data-sis="a">🤖 Android</button></div>';
  }

  /* ------------------------------------------------------------------ pagina */
  var TAB = [["", "📱 Il mio dispositivo"], ["aggiornamenti", "⬇️ Aggiornamenti"], ["salute", "🩺 Salute e sicurezza"], ["app", "📦 App consigliate"]];
  var scelto = null;
  CD.registra("telefono", {
    titolo: "Il mio telefono",
    mostra: function (el, parti) {
      var tab = parti[0] || "", d = T.disp;
      var quale = scelto || (d.android ? "a" : "i");
      el.innerHTML = CD.titolo("📱", d.tablet ? "Il mio tablet" : "Il mio telefono", "Controlli, aggiornamenti e consigli per il vostro telefono o tablet") +
        '<div class="schede-tab" role="tablist">' + TAB.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + "</div><div id=\"tel-corpo\"></div>";
      CD.$$("[data-tab]", el).forEach(function (b) { b.onclick = function () { CD.vai("#/telefono" + (b.getAttribute("data-tab") ? "/" + b.getAttribute("data-tab") : "")); }; });
      var c = CD.$("#tel-corpo", el);
      function sis() { CD.$$("[data-sis]", c).forEach(function (b) { b.onclick = function () { scelto = b.getAttribute("data-sis"); CD.mostraVista(); }; }); }
      if (tab === "aggiornamenti") {
        c.innerHTML = sceltaSistema(c, quale) + '<div class="griglia-2">' + AGG[quale].map(function (g) { return '<div class="scheda"><h3>' + esc(g[0]) + "</h3>" + passi(g[1]) + "</div>"; }).join("") + "</div>" +
          '<div class="avviso">ℹ️ Un dispositivo che non riceve più aggiornamenti di sicurezza va usato solo per cose senza dati personali (sveglia, musica, foto). ' +
          "Apple aggiorna di solito gli iPhone per 6-7 anni; i Pixel e i Samsung recenti fino a 7 anni. Vedete anche «Cosa comprare».</div>" +
          (quale === "a" ? '<p class="piccolo-testo">I nomi dei menu cambiano un po\' secondo la marca (Samsung, Xiaomi, Motorola…): se non trovate una voce, usate la lente di ricerca in alto nelle Impostazioni.</p>' : "");
        sis(); return;
      }
      if (tab === "salute") {
        c.innerHTML = sceltaSistema(c, quale) + SALUTE.map(function (s, i) {
          return "<details class=\"scheda\"" + (i === 0 ? " open" : "") + "><summary><b>" + esc(s.t) + "</b></summary>" + passi(s[quale]) + "</details>"; }).join("") +
          '<div class="riga"><button class="btn primario" id="tel-controllo">🧭 Controllo guidato</button></div>';
        sis();
        CD.$("#tel-controllo", c).onclick = function () { controllo(quale); };
        return;
      }
      if (tab === "app") {
        c.innerHTML = sceltaSistema(c, quale) + '<p>App affidabili e gratuite. Scaricatele <b>solo</b> dallo store ufficiale (' + (quale === "a" ? "Play Store" : "App Store") + ") e controllate il nome dello sviluppatore.</p>" +
          '<div class="griglia-schede">' + APP.filter(function (a) { return a[3].indexOf(quale) >= 0; }).map(function (a) {
            var link = quale === "a" ? '<a class="btn piccolo" target="_blank" rel="noopener" href="https://play.google.com/store/search?q=' + encodeURIComponent(a[1]) + '&c=apps">Play Store ↗</a>'
              : "<small>Aprite l'App Store e cercate <b>«" + esc(a[1]) + "»</b></small>";
            return '<div class="tessera"><span class="em">' + a[0] + "</span><b>" + esc(a[1]) + "</b><small>" + esc(a[2]) + "</small>" + link + "</div>"; }).join("") + "</div>" +
          '<p class="piccolo-testo">I nomi delle app e i marchi appartengono ai rispettivi proprietari. Il Consulente Digitale non riceve nulla da questi consigli.</p>';
        sis(); return;
      }
      // panoramica del dispositivo
      c.innerHTML = '<div class="griglia-2"><div class="scheda luce"><h3>' + (d.apple ? "🍎 " : d.android ? "🤖 " : "📱 ") + esc(d.nome) + '</h3><table class="tab" id="tel-dati"></table></div>' +
        '<div class="scheda"><h3>✅ Cosa vi consiglio</h3><ul id="tel-consigli"></ul></div></div>' +
        '<div class="griglia-schede">' +
        '<a class="tessera" href="#/telefono/aggiornamenti"><span class="em">⬇️</span><b>Aggiornamenti</b><small>Sistema, app e browser, passo per passo</small></a>' +
        '<a class="tessera" href="#/telefono/salute"><span class="em">🩺</span><b>Salute e sicurezza</b><small>Spazio, batteria, backup, furto, truffe, privacy</small></a>' +
        '<a class="tessera" href="#/telefono/app"><span class="em">📦</span><b>App consigliate</b><small>Gratuite e affidabili, dallo store ufficiale</small></a>' +
        '<a class="tessera" href="#/acquisti/smartphone"><span class="em">🛒</span><b>Cosa comprare</b><small>Il telefono o il tablet giusto e il momento migliore</small></a></div>' +
        '<div class="riga"><button class="btn" id="tel-voce">🔊 Prova la voce di Neura</button>' + (d.installata ? "" : '<button class="btn primario" id="tel-installa">📲 Aggiungi alla schermata Home</button>') + "</div>";
      CD.$("#tel-voce", c).onclick = function () { CD.parla("Ciao! Sono Neura. Se mi sentite, la voce funziona.", { sempre: true }); };
      var bi = CD.$("#tel-installa", c); if (bi) bi.onclick = function () { banner(true); };
      T.dettagli().then(function () { scheda(c); });
    }
  });

  function riga(k, v) { return v ? "<tr><th>" + esc(k) + "</th><td>" + v + "</td></tr>" : ""; }
  function scheda(c) {
    var d = T.disp, tab = CD.$("#tel-dati", c), cons = CD.$("#tel-consigli", c), consigli = [];
    if (!tab) return;
    var con = navigator.connection || {}, w = Math.round(screen.width), h = Math.round(screen.height), dpr = window.devicePixelRatio || 1;
    var html = riga("Dispositivo", esc(d.nome + (d.modello ? " · " + d.modello : ""))) + riga("Sistema", esc(d.sistema || "—")) + riga("Browser", esc(d.browser)) +
      riga("App", d.installata ? "✔ installata sulla schermata Home" : "aperta nel browser") +
      riga("Schermo", w + " × " + h + " punti · " + Math.round(w * dpr) + " × " + Math.round(h * dpr) + " pixel") +
      riga("Memoria", navigator.deviceMemory ? "almeno " + navigator.deviceMemory + " GB" : "") +
      riga("Processore", navigator.hardwareConcurrency ? navigator.hardwareConcurrency + " core" : "") +
      riga("Internet", navigator.onLine ? "✔ collegato" + (con.effectiveType ? " · " + esc(con.effectiveType.toUpperCase()) : "") + (con.saveData ? " · risparmio dati" : "") : "✖ non collegato");
    tab.innerHTML = html + '<tr id="tel-batt"></tr>';
    if (navigator.getBattery) navigator.getBattery().then(function (b) {
      var r = CD.$("#tel-batt", c); if (!r) return;
      r.innerHTML = "<th>Batteria</th><td>" + Math.round(b.level * 100) + "%" + (b.charging ? " · in carica" : "") + "</td>";
      if (b.level < 0.2 && !b.charging) { consigli.unshift("🔋 Batteria bassa: mettete in carica"); disegna(); }
    }, function () { /* non disponibile */ });
    if (!d.installata) consigli.push("📲 Aggiungete il Consulente alla schermata Home: si apre come un'app, anche senza Internet");
    consigli.push("⬇️ Controllate gli aggiornamenti del sistema e delle app almeno una volta al mese");
    consigli.push("☁️ Verificate che il backup automatico sia attivo");
    consigli.push(d.apple ? "🔒 Attivate «Trova il mio " + (d.os === "ipados" ? "iPad" : "iPhone") + "» e «Protezione dispositivo rubato»" : "🔒 Attivate «Trova il mio dispositivo» e un blocco schermo con PIN");
    if (con.saveData) consigli.push("📶 Il risparmio dati è attivo: le notizie si caricano più lentamente");
    if (d.apple && d.versione && parseFloat(d.versione) < 16) consigli.push("⚠️ Sistema vecchio: controllate se il dispositivo riceve ancora aggiornamenti di sicurezza");
    if (d.android && d.versione && parseFloat(d.versione) < 11) consigli.push("⚠️ Android vecchio: controllate se il telefono riceve ancora aggiornamenti di sicurezza");
    function disegna() { cons.innerHTML = consigli.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join(""); }
    disegna();
  }

  /* controllo guidato: una domanda alla volta, alla fine il riepilogo da stampare */
  function controllo(quale) {
    var dom = [["💾", "C'è almeno il 10% di spazio libero?"], ["⬇️", "Sistema e app sono aggiornati?"], ["☁️", "Il backup automatico è attivo?"],
      ["🔒", "C'è un codice di blocco ed è attivo «Trova il mio dispositivo»?"], ["🔋", "La batteria dura tutto il giorno?"], ["🕵️", "Avete controllato i permessi delle app?"]];
    var i = 0, risposte = [];
    function passo() {
      if (i >= dom.length) {
        var no = risposte.filter(function (r) { return !r[2]; });
        CD.modale({ titolo: "🧭 Risultato del controllo", html: "<p>" + (no.length ? "Da sistemare:" : "✔ Tutto in ordine. Bravissimi!") + "</p><ul>" +
          no.map(function (r) { return "<li>" + r[0] + " " + esc(r[1]) + "</li>"; }).join("") + "</ul>" + (no.length ? "<p>Le istruzioni passo per passo sono nella pagina «Salute e sicurezza».</p>" : ""),
          pulsanti: [{ testo: "OK", valore: true, classe: "primario" }] });
        if (CD.parla) CD.parla(no.length ? "Ci sono " + no.length + " cose da sistemare. Le istruzioni sono nella pagina." : "Tutto in ordine. Bravissimi!");
        return;
      }
      var q = dom[i];
      CD.modale({ titolo: "🧭 Controllo " + (i + 1) + " / " + dom.length, html: "<p class=\"grande\">" + q[0] + " " + esc(q[1]) + "</p>",
        pulsanti: [{ testo: "Non so", valore: "x" }, { testo: "No", valore: "n" }, { testo: "Sì", valore: "s", classe: "primario" }] }).then(function (v) {
        if (v == null) return;
        risposte.push([q[0], q[1], v === "s"]); i++; passo();
      });
      if (CD.parla) CD.parla(q[1]);
    }
    passo();
  }

  /* ------------------------------------------------------------------ banner «Aggiungi alla schermata Home» */
  var promptInstalla = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); promptInstalla = e; });
  window.addEventListener("appinstalled", function () { T.disp.installata = true; var b = CD.$("#banner-home"); if (b) b.parentNode.removeChild(b); });
  function memoria(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } return null; }
  function istruzioni() {
    var d = T.disp, b = d.browser;
    if (d.apple) {
      if (b === "Safari") return "Toccate <b>Condividi</b> ⬆️ (in basso" + (d.tablet ? " o in alto" : "") + "), poi <b>«Aggiungi alla schermata Home»</b> → <b>Aggiungi</b>.";
      if (b === "Chrome" || b === "Edge") return "Toccate <b>Condividi</b> ⬆️ nella barra dell'indirizzo in alto, poi <b>«Aggiungi alla schermata Home»</b> → <b>Aggiungi</b>.";
      if (b === "Firefox") return "Toccate il menu ☰, poi <b>Condividi</b> → <b>«Aggiungi alla schermata Home»</b>.";
      return "Dal menu del browser scegliete <b>Condividi</b> → <b>«Aggiungi alla schermata Home»</b> (oppure aprite questa pagina con Safari).";
    }
    if (b === "Samsung Internet") return "Toccate il menu ☰, poi <b>«Aggiungi pagina a»</b> → <b>Schermata Home</b>.";
    if (b === "Firefox") return "Toccate il menu ⋮, poi <b>«Installa»</b> o <b>«Aggiungi alla schermata principale»</b>.";
    return "Toccate il menu ⋮ in alto a destra, poi <b>«Installa app»</b> o <b>«Aggiungi a schermata Home»</b>.";
  }
  function banner(forza) {
    if (!T.attivo || T.disp.installata || CD.$("#banner-home")) return;
    if (!forza && (memoria("cd.banner-mai") || +memoria("cd.banner-dopo") > Date.now())) return;
    var b = document.createElement("div");
    b.id = "banner-home"; b.className = "banner-home"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Aggiungi alla schermata Home");
    b.innerHTML = '<img src="img/icona-192.png" alt="" width="56" height="56"><div class="bh-testo"><b>Mettete il Consulente Digitale sulla schermata Home</b>' +
      "<p>Si apre con un tocco, come un'app, anche senza Internet.</p>" + (promptInstalla ? "" : "<p>" + istruzioni() + "</p>") + "</div>" +
      '<div class="bh-pulsanti">' + (promptInstalla ? '<button class="btn primario" id="bh-installa">📲 Installa</button>' : "") +
      '<button class="btn" id="bh-dopo">Più tardi</button><button class="btn piccolo" id="bh-mai">Non mostrare più</button></div>';
    document.body.appendChild(b);
    function chiudi() { if (b.parentNode) b.parentNode.removeChild(b); }
    var bi = CD.$("#bh-installa", b);
    if (bi) bi.onclick = function () { var p = promptInstalla; promptInstalla = null; chiudi(); p.prompt(); if (p.userChoice) p.userChoice.then(function () {}, function () {}); };
    CD.$("#bh-dopo", b).onclick = function () { memoria("cd.banner-dopo", String(Date.now() + 3 * 864e5)); chiudi(); };
    CD.$("#bh-mai", b).onclick = function () { memoria("cd.banner-mai", "1"); chiudi(); };
  }
  T.banner = banner;
})();
