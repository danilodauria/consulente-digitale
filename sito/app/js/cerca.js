/* ==========================================================================
 *  CONSULENTE DIGITALE - 🔎 Cerca e 🖨️ Stampa (pulsanti in alto a destra)
 *  CERCA: un unico campo che trova pagine, schede «Cose da sapere», problemi e soluzioni, glossario,
 *  programmi, azioni automatiche, aperture di Neura, storia, dispositivi da comprare, economia circolare
 *  e domande di Nonni Teach. Ogni modulo può aggiungere le sue voci con CD.cerca.fonte(funzione).
 *  Si apre anche con Ctrl+K o con il tasto «/». Se non trova nulla propone di chiederlo a Neura.
 *  STAMPA: stampa la pagina aperta come scheda professionale (intestazione, data e ora, piè di pagina con
 *  autore e licenza), senza pulsanti e caselle; i grafici animati diventano immagini.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var fonti = [];
  CD.cerca = { fonte: function (f) { fonti.push(f); } };

  var PAGINE = {
    inizio: ["🏠", "La plancia: saluto, stato del computer, momento per comprare, pilota automatico"],
    neura: ["🧠", "Conversazione scritta o a voce con il cervello digitale"],
    acquisti: ["🛒", "Scelta guidata di computer, tablet, telefoni, TV e il momento migliore per comprare"],
    analisi: ["🔬", "Voti, compatibilità Windows 11, sistema consigliato, migliorie, scheda tecnica"],
    hardware: ["🧬", "Sensori in diretta, processore, scheda madre, memoria, grafica, dischi, batteria"],
    interventi: ["🛠️", "Diagnosi, lavori da eseguire e lavori eseguiti, con le schede da stampare"],
    aggiornamenti: ["⬇️", "Aggiornamenti di sistema, programmi, driver e firmware"],
    ottimizza: ["🚀", "Pulsanti automatici, script pronti, strumenti degli esperti, soluzioni"],
    strumenti: ["🩺", "Disco, batteria, sicurezza, velocità di Internet, riparazioni, ora esatta"],
    programmi: ["📦", "Programmi consigliati da installare con un clic"],
    sapere: ["💡", "Cose da sapere per un uso sicuro e consapevole, glossario"],
    circolare: ["♻️", "Economia circolare, RAEE, riparare, riusare, recuperare"],
    nonni: ["👵", "Nonni Teach: interviste ai nonni, podcast della memoria"],
    storia: ["📜", "Storia dei computer e dei sistemi operativi, quiz"],
    impostazioni: ["⚙️", "Profilo, aspetto, voce, microfono, cervello, Internet"],
    programma: ["🔄", "Aggiornamenti del Consulente Digitale"],
    sostieni: ["❤️", "Sostenere il progetto"], licenza: ["📜", "Licenza e autore"]
  };

  function norm(t) { return CD.neura ? CD.neura.norm(t) : String(t || "").toLowerCase(); }
  function voci() {
    var out = [];
    Object.keys(CD.viste).forEach(function (id) {
      if (id === "benvenuto") return;
      var p = PAGINE[id] || ["📄", ""];
      out.push({ gruppo: "Pagine", icona: p[0], titolo: CD.viste[id].titolo || "Inizio", testo: p[1], vai: "#/" + (id === "inizio" ? "" : id) });
    });
    (CD.SAPERE || []).forEach(function (s) { out.push({ gruppo: "Cose da sapere", icona: s.icona, titolo: s.titolo, testo: s.sintesi, extra: s.punti.join(" ") + " " + s.parole.join(" "), vai: "#/sapere/" + s.id }); });
    (CD.PROBLEMI || []).forEach(function (p) { out.push({ gruppo: "Problemi e soluzioni", icona: p.icona, titolo: p.titolo, testo: p.passi[0], extra: p.passi.join(" ") + " " + p.parole.join(" "), vai: "#/ottimizza/soluzioni", chiedi: p.titolo }); });
    (CD.GLOSSARIO || []).forEach(function (g) { out.push({ gruppo: "Glossario", icona: "📖", titolo: g[0], testo: g[1], vai: "#/sapere", ancora: "glossario" }); });
    Object.keys(CD.azioni || {}).forEach(function (k) { var a = CD.azioni[k]; out.push({ gruppo: "Azioni automatiche", icona: a.icona, titolo: a.titolo, testo: a.descrizione, azione: k }); });
    if (CD.programmi && CD.programmi.catalogo) CD.programmi.catalogo.programmi.forEach(function (p) {
      out.push({ gruppo: "Programmi", icona: "📦", titolo: p.nome, testo: p.descrizione, extra: p.categoria, vai: "#/programmi", programma: p.nome });
    });
    if (CD.ACQ) Object.keys(CD.ACQ.dispositivi).forEach(function (k) { var d = CD.ACQ.dispositivi[k]; out.push({ gruppo: "Cosa comprare", icona: d.icona, titolo: d.nome, testo: d.desc, vai: "#/acquisti/" + k }); });
    if (CD.STORIA) CD.STORIA.tappe.forEach(function (t) { out.push({ gruppo: "Storia", icona: t.icona, titolo: (t.quando || t.anno) + " · " + t.titolo, testo: t.testo, vai: "#/storia" }); });
    fonti.forEach(function (f) { try { out = out.concat(f() || []); } catch (e) { /* modulo non pronto */ } });
    return out;
  }
  function evidenzia(t, parole) {
    var h = esc(t);
    parole.forEach(function (p) { if (p.length > 2) h = h.replace(new RegExp("(" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<mark>$1</mark>"); });
    return h;
  }
  function cerca(q) {
    var n = norm(q), parole = n.split(" ").filter(function (x) { return x.length > 1; });
    if (!parole.length) return [];
    var risultati = [];
    voci().forEach(function (v) {
      var tit = norm(v.titolo), tut = norm(v.titolo + " " + v.testo + " " + (v.extra || "")), p = 0;
      parole.forEach(function (w) {
        if (tit.indexOf(w) === 0) p += 6; else if (tit.indexOf(w) >= 0) p += 4;
        else if (tut.indexOf(w) >= 0) p += 1.5; else p -= 3;
      });
      if (tit === n) p += 10;
      if (p > 0) { v.p = p; risultati.push(v); }
    });
    risultati.sort(function (a, b) { return b.p - a.p; });
    return risultati.slice(0, 40);
  }

  var pannello = null, sel = 0, attuali = [];
  CD.apriCerca = function (iniziale) {
    if (pannello) { CD.$("#cerca-input", pannello).focus(); return; }
    pannello = document.createElement("div");
    pannello.className = "cerca-pannello";
    pannello.innerHTML = '<div class="cerca-box" role="dialog" aria-label="Cerca nel programma"><div class="cerca-campo"><span>🔎</span>' +
      '<input id="cerca-input" placeholder="Cosa cercate? (es. «batteria», «Windows 11», «password», «nonni»)" autocomplete="off"><kbd>Esc</kbd></div>' +
      '<div class="cerca-risultati" id="cerca-ris" role="listbox"></div><div class="cerca-piede"><span>↑ ↓ per scegliere · Invio per aprire</span><span>Ctrl+K o / per cercare da ogni pagina</span></div></div>';
    document.body.appendChild(pannello);
    var inp = CD.$("#cerca-input", pannello), box = CD.$("#cerca-ris", pannello);
    function disegna() {
      var q = inp.value.trim();
      attuali = cerca(q); sel = 0;
      if (!q) { box.innerHTML = '<p class="vuoto">Scrivete una o più parole: cerco in tutto il programma.</p>'; return; }
      var parole = norm(q).split(" "), gr = "", h = "";
      attuali.forEach(function (v, i) {
        if (v.gruppo !== gr) { gr = v.gruppo; h += '<div class="cerca-gruppo">' + esc(gr) + "</div>"; }
        h += '<button class="cerca-voce' + (i === 0 ? " attiva" : "") + '" data-i="' + i + '" role="option"><span class="em">' + v.icona + "</span><span><b>" + evidenzia(v.titolo, parole) +
          "</b><small>" + evidenzia(String(v.testo || "").slice(0, 160), parole) + "</small></span></button>";
      });
      h += '<div class="cerca-gruppo">Neura</div><button class="cerca-voce" data-neura="1"><span class="em">🧠</span><span><b>Chiedi a Neura: «' + esc(q) + '»</b><small>Risponde con l\'IA locale o con la guida</small></span></button>';
      box.innerHTML = h;
      CD.$$("[data-i]", box).forEach(function (b) { b.onclick = function () { apri(attuali[+b.getAttribute("data-i")]); }; });
      CD.$("[data-neura]", box).onclick = function () { var t = inp.value; chiudi(); CD.neura.chiedi(t); };
    }
    function evid() { CD.$$(".cerca-voce", box).forEach(function (b, i) { b.classList.toggle("attiva", i === sel); if (i === sel) b.scrollIntoView({ block: "nearest" }); }); }
    inp.oninput = disegna;
    inp.onkeydown = function (e) {
      var n = CD.$$(".cerca-voce", box).length;
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(n - 1, sel + 1); evid(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); evid(); }
      else if (e.key === "Enter") { e.preventDefault(); var b = CD.$$(".cerca-voce", box)[sel]; if (b) b.click(); }
      else if (e.key === "Escape") chiudi();
    };
    pannello.onclick = function (e) { if (e.target === pannello) chiudi(); };
    inp.value = iniziale || ""; disegna(); inp.focus();
  };
  function chiudi() { if (pannello) { pannello.remove(); pannello = null; } }
  function apri(v) {
    chiudi();
    if (!v) return;
    if (v.azione) { CD.esegui(v.azione).catch(function () {}); return; }
    if (v.apertura && CD.aperture) { CD.aperture.chiedi(v.apertura); return; }
    if (v.fn) { v.fn(); return; }
    if (v.programma) CD.programmaDaCercare = v.programma;
    CD.vai(v.vai || "#/");
    if (v.ancora) setTimeout(function () { var a = CD.$("#" + v.ancora); if (a) a.scrollIntoView({ behavior: "smooth" }); }, 300);
  }

  /* ------------------------------------------------------------------ stampa della pagina aperta */
  CD.stampaPagina = function () {
    var main = CD.$("#principale .vista");
    if (!main) return;
    var copia = main.cloneNode(true);
    // i disegni animati (cervello, grafici) diventano immagini ferme
    var orig = CD.$$("canvas", main), cop = CD.$$("canvas", copia);
    cop.forEach(function (c, i) {
      var img = document.createElement("img");
      try { img.src = orig[i].toDataURL("image/png"); } catch (e) { /* niente */ }
      img.style.maxWidth = "60mm"; img.className = "f-canvas";
      c.parentNode.replaceChild(img, c);
    });
    // i valori scritti nei campi restano, i comandi spariscono
    CD.$$("input, textarea, select", copia).forEach(function (el, i) {
      var o = CD.$$("input, textarea, select", main)[i], v = "";
      if (o) v = o.type === "checkbox" || o.type === "radio" ? (o.checked ? "☑ " : "☐ ") : (o.value || "");
      var s = document.createElement("span"); s.className = "f-valore"; s.textContent = v;
      if (o && (o.type === "checkbox" || o.type === "radio")) el.parentNode.replaceChild(s, el);
      else if (v && el.tagName !== "SELECT") el.parentNode.replaceChild(s, el); else el.remove();
    });
    CD.$$("button, .schede-tab, .riga > .btn, a.btn, .suggerimenti, .chat-modulo, .neura-parla, [data-no-stampa]", copia).forEach(function (b) { b.remove(); });
    CD.$$("details", copia).forEach(function (d) { d.setAttribute("open", ""); });
    var v = CD.viste[CD.vistaCorrente] || {};
    CD.stampa(v.titolo || "Consulente Digitale", '<div class="f-pagina">' + copia.innerHTML + "</div>", { codice: CD.codiceScheda() });
  };

  document.addEventListener("keydown", function (e) {
    var dentroCampo = /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "");
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); CD.apriCerca(); }
    else if (e.key === "/" && !dentroCampo) { e.preventDefault(); CD.apriCerca(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P") && !pannello) { e.preventDefault(); CD.stampaPagina(); }
  });
  document.addEventListener("DOMContentLoaded", function () {
    var c = CD.$("#btn-cerca"), s = CD.$("#btn-stampa");
    if (c) c.onclick = function () { CD.apriCerca(); };
    if (s) s.onclick = CD.stampaPagina;
  });
})();
