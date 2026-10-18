/* ==========================================================================
 *  CONSULENTE DIGITALE - 📰 Notizie dal mondo dell'informatica e dell'elettronica
 *  Titoli e brevi sommari dai feed pubblici di testate italiane (elenco chiuso in cd_notizie.py), filtrati per
 *  tema e adattati a chi usa il programma (profilo): per esempio niente offerte commerciali né videogiochi
 *  per le persone anziane e le scuole, sicurezza e truffe sempre in primo piano.
 *  Si attivano e disattivano da qui o da Impostazioni. Ogni notizia si salva, si stampa (anche in PDF),
 *  si fa leggere a Neura e si condivide su WhatsApp, Telegram o Facebook con il link all'articolo originale.
 *  Sul telefono (senza programma sul PC) le notizie arrivano dal sito del progetto (notizie.json).
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 *  I testi delle notizie appartengono alle rispettive testate: qui solo titolo, sommario del feed e link.
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var NZ = CD.notizie = { dati: null, archivio: null };
  NZ.TEMI = { sicurezza: ["🛡️", "Sicurezza e truffe"], ia: ["🧠", "Intelligenza artificiale"], computer: ["💻", "Computer e software"], telefoni: ["📱", "Telefoni e tablet"],
    elettronica: ["🔌", "Elettronica"], internet: ["🌐", "Internet e diritti"], sostenibilita: ["♻️", "Sostenibilità"], generale: ["📰", "Varie"], giochi: ["🎮", "Videogiochi"], offerte: ["🏷️", "Offerte"] };
  /* il contesto: cosa mostrare a ciascun profilo (si può cambiare a mano) */
  var PER_PROFILO = {
    anziano: ["sicurezza", "telefoni", "computer", "ia", "internet", "sostenibilita"], centro: ["sicurezza", "telefoni", "computer", "ia", "internet", "sostenibilita"],
    famiglia: ["sicurezza", "telefoni", "computer", "ia", "internet", "sostenibilita", "generale"], scuola: ["sicurezza", "ia", "computer", "elettronica", "internet", "sostenibilita"],
    studente: ["ia", "computer", "elettronica", "telefoni", "sicurezza", "internet", "sostenibilita", "generale"], creativo: Object.keys(NZ.TEMI),
    professionista: ["sicurezza", "ia", "computer", "internet", "telefoni", "generale"], ditta: ["sicurezza", "ia", "computer", "internet", "telefoni", "generale"],
    azienda: ["sicurezza", "ia", "computer", "internet", "elettronica", "generale"], ente: ["sicurezza", "ia", "internet", "computer", "sostenibilita"],
    persona: ["sicurezza", "ia", "computer", "telefoni", "elettronica", "internet", "sostenibilita", "generale"]
  };
  /* temi mai mostrati se non scelti: offerte (pubblicità) e videogiochi, tranne «Creativo e gamer» */
  NZ.temiPredefiniti = function () { return (PER_PROFILO[(CD.profilo || {}).tipo] || PER_PROFILO.persona).slice(); };

  NZ.carica = function (nuovo) {
    if (!CD.imp.notizie) return Promise.reject(new Error("disattivate"));
    var p = CD.server ? CD.api("/api/notizie" + (nuovo ? "?nuovo=1" : "")) :
      fetch((CD.LICENZA ? CD.LICENZA.sito : "https://danilodauria.github.io/consulente-digitale/") + "notizie.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("notizie non raggiungibili"); return r.json(); });
    return p.then(function (d) { NZ.dati = d; return d; });
  };
  NZ.leggiArchivio = function () {
    if (NZ.archivio) return Promise.resolve(NZ.archivio);
    return CD.carica("notizie").then(function (a) { NZ.archivio = a || {}; NZ.archivio.salvate = NZ.archivio.salvate || []; return NZ.archivio; });
  };
  function salvaArchivio() { CD.salva("notizie", NZ.archivio); }
  NZ.filtra = function (lista, f) {
    var temi = f.temi, cerca = CD.neura ? CD.neura.norm(f.testo || "") : (f.testo || "").toLowerCase();
    return lista.filter(function (n) {
      if (f.fonti && f.fonti.length && f.fonti.indexOf(n.fonte_id) < 0) return false;
      if (temi && temi.length) {
        if (!n.temi.some(function (t) { return temi.indexOf(t) >= 0; })) return false;
        if (temi.indexOf("offerte") < 0 && n.temi.indexOf("offerte") >= 0) return false;    // la pubblicità resta fuori se non richiesta
        if (temi.indexOf("giochi") < 0 && n.temi.length === 1 && n.temi[0] === "giochi") return false;
      }
      if (cerca && (CD.neura ? CD.neura.norm(n.titolo + " " + n.sommario) : (n.titolo + " " + n.sommario).toLowerCase()).indexOf(cerca) < 0) return false;
      return true;
    });
  };
  NZ.quando = function (t) {
    if (!t) return "";
    var d = new Date(t * 1000), ora = CD.adesso(), min = Math.round((ora - d) / 60000);
    if (min < 1) return "adesso";
    if (min < 60) return min + " min fa";
    if (min < 60 * 24 && d.getDate() === ora.getDate()) return "oggi alle " + CD.oraTesto(d);
    if (min < 60 * 48) return "ieri alle " + CD.oraTesto(d);
    return CD.dataEstesa(d) + " " + CD.oraTesto(d);
  };

  /* condivisione: si condivide il link dell'articolo originale con il titolo */
  NZ.condividi = function (n, dove) {
    var t = n.titolo + " — " + n.fonte, u = n.link;
    var url = { whatsapp: "https://wa.me/?text=" + encodeURIComponent(t + "\n" + u),
      telegram: "https://t.me/share/url?url=" + encodeURIComponent(u) + "&text=" + encodeURIComponent(t),
      facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(u) }[dove];
    if (url) CD.apriLink(url);
  };
  NZ.stampa = function (lista, titolo) {
    var h = lista.map(function (n) {
      return '<div style="break-inside:avoid;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0"><h2 style="margin-top:4px">' + esc(n.titolo) + "</h2>" +
        "<p><b>" + esc(n.fonte) + "</b> · " + esc(NZ.quando(n.quando)) + " · " + n.temi.map(function (t) { return esc((NZ.TEMI[t] || ["", t])[1]); }).join(", ") + "</p>" +
        (n.sommario ? '<p class="f-msg">' + esc(n.sommario) + "</p>" : "") + (n.nota ? "<p><i>Appunti: " + esc(n.nota) + "</i></p>" : "") +
        '<p>Articolo completo: <a href="' + esc(n.link) + '">' + esc(n.link) + "</a></p></div>";
    }).join("") + '<p style="font-size:8.5pt;color:#475569">Titolo e sommario provengono dal feed pubblico della testata indicata, che ne detiene i diritti; il testo completo è sul sito originale.</p>';
    CD.stampa(titolo || (lista.length === 1 ? "Notizia" : "Notizie salvate"), h, { codice: CD.codiceScheda() });
  };

  function scheda(n, salvata) {
    return '<article class="nz-card" data-n="' + esc(n.id) + '">' + (n.immagine ? '<img src="' + esc(n.immagine) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : "") +
      '<div class="nz-testo"><div class="nz-meta"><b>' + esc(n.fonte) + "</b> · " + esc(NZ.quando(n.quando)) + n.temi.filter(function (t) { return NZ.TEMI[t]; }).map(function (t) { return ' <span class="etichetta">' + NZ.TEMI[t][0] + " " + esc(NZ.TEMI[t][1]) + "</span>"; }).join("") + "</div>" +
      "<h3>" + esc(n.titolo) + "</h3>" + (n.sommario ? "<p>" + esc(n.sommario) + "</p>" : "") +
      '<div class="riga nz-azioni"><a class="btn piccolo primario" href="' + esc(n.link) + '" target="_blank" rel="noopener noreferrer">Leggi sul sito ↗</a>' +
      '<button class="btn piccolo" data-a="leggi" title="Neura legge la notizia">🔊</button>' +
      '<button class="btn piccolo" data-a="salva">' + (salvata ? "★ Salvata" : "☆ Salva") + "</button>" +
      '<button class="btn piccolo" data-a="stampa" title="Stampa o salva in PDF">🖨️ PDF</button>' +
      '<button class="btn piccolo nz-wa" data-a="whatsapp" title="Invia con WhatsApp">WhatsApp</button><button class="btn piccolo nz-tg" data-a="telegram" title="Invia con Telegram">Telegram</button>' +
      '<button class="btn piccolo nz-fb" data-a="facebook" title="Condividi su Facebook">Facebook</button></div></div></article>';
  }

  CD.registra("notizie", {
    titolo: "Notizie",
    mostra: function (el, parti) {
      var tab = parti[0] === "salvate" ? "salvate" : "ultime";
      el.innerHTML = CD.titolo("📰", "Notizie dal mondo digitale", "Informatica, elettronica, sicurezza e intelligenza artificiale da testate italiane, scelte per «" + esc(((CD.TIPI[(CD.profilo || {}).tipo] || {}).nome) || "voi") + "»") +
        '<div class="schede-tab" role="tablist"><button role="tab" data-tab="ultime" aria-selected="' + (tab === "ultime") + '">📰 Ultime</button><button role="tab" data-tab="salvate" aria-selected="' + (tab === "salvate") + '">⭐ Salvate</button>' +
        '<span class="spazio"></span><label class="opzione"><input type="checkbox" id="nz-attive"' + (CD.imp.notizie ? " checked" : "") + "> Notizie attive</label></div><div id=\"nz-corpo\"></div>";
      CD.$$("[data-tab]", el).forEach(function (b) { b.onclick = function () { CD.vai("#/notizie/" + b.getAttribute("data-tab")); }; });
      CD.$("#nz-attive", el).onchange = function () { CD.imp.notizie = this.checked; CD.salvaImpostazioni(); CD.avviso(this.checked ? "📰 Notizie attivate" : "Notizie disattivate: il programma non le scarica più", this.checked ? "ok" : ""); CD.mostraVista(); };
      var c = CD.$("#nz-corpo", el);
      NZ.leggiArchivio().then(function (a) { if (tab === "salvate") salvate(c, a); else ultime(c, a); });
    }
  });

  function ultime(c, arch) {
    if (!CD.imp.notizie) {
      c.innerHTML = '<div class="avviso">Le notizie sono <b>disattivate</b>: il programma non si collega ai siti delle testate. Le notizie salvate restano disponibili.</div>' +
        '<button class="btn primario" id="nz-riattiva">📰 Riattiva le notizie</button>';
      CD.$("#nz-riattiva", c).onclick = function () { CD.imp.notizie = true; CD.salvaImpostazioni(); CD.mostraVista(); };
      return;
    }
    if (CD.imp.online === false) { c.innerHTML = '<div class="avviso att">L\'uso di Internet è spento nelle Impostazioni: le notizie non si possono scaricare.</div>'; return; }
    var f = { temi: (arch.temi && arch.temi.length ? arch.temi : NZ.temiPredefiniti()), fonti: arch.fonti || [], testo: "" };
    c.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>';
    NZ.carica(false).then(disegna, function (e) { c.innerHTML = '<div class="avviso att">Notizie non disponibili ora: ' + esc(e.message) + ". Controllate la connessione e riprovate.</div><button class=\"btn\" id=\"nz-riprova\">🔄 Riprova</button>"; CD.$("#nz-riprova", c).onclick = function () { ultime(c, arch); }; });
    function disegna(d) {
      var fonti = d.fonti || [];
      c.innerHTML = '<div class="scheda nz-filtri"><div class="opzioni" id="nz-temi">' + Object.keys(NZ.TEMI).map(function (t) {
          return '<button class="btn piccolo' + (f.temi.indexOf(t) >= 0 ? " primario" : "") + '" data-t="' + t + '">' + NZ.TEMI[t][0] + " " + esc(NZ.TEMI[t][1]) + "</button>"; }).join("") + "</div>" +
        '<div class="riga"><input type="search" id="nz-cerca" placeholder="Cerca nelle notizie (es. «WhatsApp», «truffa», «Windows»)" style="flex:1;min-width:12rem">' +
        '<select id="nz-fonte"><option value="">Tutte le fonti</option>' + fonti.map(function (x) { return '<option value="' + esc(x.id) + '"' + (f.fonti.length === 1 && f.fonti[0] === x.id ? " selected" : "") + ">" + esc(x.nome) + (x.esito && x.esito.ok === false ? " (non risponde)" : "") + "</option>"; }).join("") + "</select>" +
        '<button class="btn" id="nz-aggiorna">🔄 Aggiorna</button><button class="btn" id="nz-predef" title="Torna ai temi adatti al profilo">↺ Temi del profilo</button></div></div>' +
        '<p class="piccolo-testo" id="nz-info"></p><div id="nz-lista"></div>' +
        '<p class="piccolo-testo">' + esc(d.nota || "") + (d.dalla_cache ? " Copia salvata: Internet non risponde." : "") + "</p>";
      function lista() {
        var l = NZ.filtra(d.notizie || [], f);
        CD.$("#nz-info", c).textContent = l.length + " notizie · aggiornate " + NZ.quando(d.quando) + (d.prova ? " · 🧪 notizie di prova" : "");
        CD.$("#nz-lista", c).innerHTML = l.length ? l.slice(0, 60).map(function (n) { return scheda(n, !!CD.uno(arch.salvate, function (s) { return s.id === n.id; })); }).join("") :
          '<p class="vuoto">Nessuna notizia con questi filtri.</p>';
        azioni(CD.$("#nz-lista", c), l, arch, lista);
      }
      CD.$$("[data-t]", c).forEach(function (b) {
        b.onclick = function () { var t = b.getAttribute("data-t"), i = f.temi.indexOf(t); if (i >= 0) f.temi.splice(i, 1); else f.temi.push(t);
          b.classList.toggle("primario", i < 0); arch.temi = f.temi.slice(); salvaArchivio(); lista(); };
      });
      CD.$("#nz-cerca", c).oninput = function () { f.testo = this.value; lista(); };
      CD.$("#nz-fonte", c).onchange = function () { f.fonti = this.value ? [this.value] : []; arch.fonti = f.fonti; salvaArchivio(); lista(); };
      CD.$("#nz-aggiorna", c).onclick = function () { c.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>'; NZ.carica(true).then(disegna, function (e) { CD.avviso(esc(e.message), "att"); }); };
      CD.$("#nz-predef", c).onclick = function () { f.temi = NZ.temiPredefiniti(); arch.temi = []; salvaArchivio(); disegna(d); };
      lista();
    }
  }

  function salvate(c, arch) {
    var l = arch.salvate.slice().sort(function (a, b) { return (b.salvata || 0) - (a.salvata || 0); });
    c.innerHTML = (l.length ? '<div class="riga"><button class="btn" id="nz-stampa-tutte">🖨️ Stampa o salva in PDF tutte le notizie salvate</button></div>' : "") +
      '<div id="nz-lista">' + (l.length ? l.map(function (n) { return scheda(n, true); }).join("") : '<p class="vuoto">Nessuna notizia salvata. Premete «☆ Salva» su una notizia per ritrovarla qui, anche senza Internet.</p>') + "</div>";
    var b = CD.$("#nz-stampa-tutte", c); if (b) b.onclick = function () { NZ.stampa(l, "Notizie salvate"); };
    azioni(CD.$("#nz-lista", c), l, arch, function () { salvate(c, arch); });
  }

  function azioni(box, lista, arch, ridisegna) {
    CD.$$(".nz-card", box).forEach(function (card) {
      var n = CD.uno(lista, function (x) { return x.id === card.getAttribute("data-n"); });
      CD.$$("[data-a]", card).forEach(function (b) {
        b.onclick = function () {
          var a = b.getAttribute("data-a");
          if (a === "leggi") { if (CD.parla) CD.parla(n.titolo + ". " + (n.sommario || "") + " Fonte: " + n.fonte + ".", { sempre: true }); }
          else if (a === "stampa") NZ.stampa([n]);
          else if (a === "salva") {
            var i = arch.salvate.map(function (s) { return s.id; }).indexOf(n.id);
            if (i >= 0) { arch.salvate.splice(i, 1); CD.avviso("Notizia tolta dalle salvate"); }
            else { var copia = CD.copia(n); copia.salvata = Date.now(); arch.salvate.push(copia); if (arch.salvate.length > 300) arch.salvate.shift(); CD.avviso("⭐ Notizia salvata: la trovate in «Salvate»", "ok"); }
            salvaArchivio(); ridisegna();
          } else NZ.condividi(n, a);
        };
      });
    });
  }

  /* titoli per la pagina Inizio e per Neura */
  NZ.titoli = function (k) {
    return NZ.leggiArchivio().then(function (arch) { return NZ.carica(false).then(function (d) {
      return NZ.filtra(d.notizie || [], { temi: arch.temi && arch.temi.length ? arch.temi : NZ.temiPredefiniti(), fonti: arch.fonti || [] }).slice(0, k || 3); }); });
  };
  if (CD.cerca && CD.cerca.fonte) CD.cerca.fonte(function () {
    return ((NZ.archivio || {}).salvate || []).map(function (n) { return { gruppo: "Notizie salvate", icona: "⭐", titolo: n.titolo, testo: n.fonte + " · " + (n.sommario || ""), vai: "#/notizie/salvate" }; });
  });
})();
