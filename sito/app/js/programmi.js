/* ==========================================================================
 *  CONSULENTE DIGITALE - Programmi consigliati
 *  Catalogo (dati/programmi.json) filtrato per sistema, profilo e potenza del computer.
 *  «Installa» usa SOLO i cataloghi ufficiali: winget (Microsoft), Flathub o la distribuzione, Homebrew.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var P = CD.programmi = { catalogo: null };
  P.carica = function () {
    if (P.catalogo) return Promise.resolve(P.catalogo);
    return fetch("dati/programmi.json").then(function (r) { return r.json(); }).then(function (j) { P.catalogo = j; return j; });
  };
  P.idDisponibili = function () {
    if (!P.catalogo) return [];
    var f = CD.sistema();
    return P.catalogo.programmi.filter(function (p) { return p.pacchetti[f]; }).map(function (p) { return p.id; });
  };
  var PROFILI = { anziano: ["tutti", "anziani"], centro: ["tutti", "anziani", "scuola"], scuola: ["tutti", "scuola", "studenti"], studente: ["tutti", "studenti"],
    creativo: ["tutti", "creativi", "gamer"], professionista: ["tutti", "professionisti"], ditta: ["tutti", "professionisti", "aziende"], azienda: ["tutti", "professionisti", "aziende"],
    ente: ["tutti", "aziende", "professionisti"], famiglia: ["tutti", "anziani", "studenti", "scuola"], persona: ["tutti"] };

  P.mostraIn = function (box, opz) {
    opz = opz || {};
    box.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>';
    P.carica().then(function (cat) {
      var f = CD.sistema(), ram = opz.perAnalisi ? (opz.perAnalisi.memoria || {}).totale_mb / 1024 : (CD.analisi && CD.analisi.ultima ? (CD.analisi.ultima.memoria || {}).totale_mb / 1024 : 0);
      var stato = { cat: "", testo: CD.programmaDaCercare || "", soloAdatti: !!ram && !CD.programmaDaCercare, soloProfilo: false };
      CD.programmaDaCercare = "";
      box.innerHTML = '<div class="scheda"><div class="riga"><input type="search" id="pr-cerca" placeholder="Cerca un programma o un bisogno (es. «foto», «password»)" style="flex:1;min-width:14rem">' +
        '<label class="opzione"><input type="checkbox" id="pr-adatti"' + (stato.soloAdatti ? " checked" : "") + (ram ? "" : " disabled") + "> Adatti a questo PC" + (ram ? " (" + CD.arrotonda(ram, 1) + " GB RAM)" : "") + "</label>" +
        (CD.profilo ? '<label class="opzione"><input type="checkbox" id="pr-profilo"> Per «' + esc((CD.TIPI[CD.profilo.tipo] || {}).nome) + "»</label>" : "") + "</div>" +
        '<div class="opzioni" id="pr-cat" style="margin-top:.6rem"><button class="btn piccolo primario" data-c="">Tutti</button>' +
        Object.keys(cat.categorie).map(function (k) { return '<button class="btn piccolo" data-c="' + k + '">' + esc(cat.categorie[k]) + "</button>"; }).join("") + "</div></div>" +
        '<p class="piccolo-testo">Sistema: <b>' + CD.nomeSistema(f) + "</b> · fonte di installazione: " + ({ windows: "winget (catalogo Microsoft)", linux: "Flathub o la vostra distribuzione", mac: "Homebrew" }[f] || "—") +
        " · <span class=\"etichetta ok\">libero</span> = software libero o gratuito senza pubblicità</p><div class=\"griglia-schede\" id=\"pr-elenco\"></div>";
      function disegna() {
        var t = CD.neura.norm(stato.testo), profili = CD.profilo ? PROFILI[CD.profilo.tipo] || ["tutti"] : null;
        var lista = cat.programmi.filter(function (p) {
          if (stato.cat && p.categoria !== stato.cat) return false;
          if (stato.soloAdatti && ram && p.ram_min_gb > ram + 0.3) return false;
          if (stato.soloProfilo && profili && !p.profili.some(function (x) { return profili.indexOf(x) >= 0; })) return false;
          if (t && CD.neura.norm(p.nome + " " + p.descrizione + " " + (cat.categorie[p.categoria] || "")).indexOf(t) < 0) return false;
          return true;
        });
        lista.sort(function (a, b) { return (b.pacchetti[f] ? 1 : 0) - (a.pacchetti[f] ? 1 : 0) || (ram && ram < 4 ? (b.leggero ? 1 : 0) - (a.leggero ? 1 : 0) : 0); });
        CD.$("#pr-elenco", box).innerHTML = lista.length ? lista.map(function (p) {
          var pk = p.pacchetti[f];
          return '<div class="scheda programma"><div class="riga"><b>' + esc(p.nome) + '</b><span class="spazio"></span>' + (p.libero ? '<span class="etichetta ok">libero</span>' : '<span class="etichetta">gratuito/commerciale</span>') + "</div>" +
            '<small>' + esc(cat.categorie[p.categoria] || "") + (p.leggero ? " · 🪶 leggero" : "") + " · RAM consigliata " + p.ram_min_gb + " GB</small><p>" + esc(p.descrizione) + "</p>" +
            '<div class="riga">' + (pk ? '<button class="btn piccolo primario" data-inst="' + p.id + '">⬇️ Installa</button>' : '<span class="piccolo-testo">Non disponibile per ' + CD.nomeSistema(f) + "</span>") +
            (p.sito ? '<a class="btn piccolo" href="' + esc(p.sito) + '" target="_blank" rel="noopener">Sito ↗</a>' : "") + "</div></div>";
        }).join("") : '<p class="vuoto">Nessun programma con questi filtri.</p>';
        CD.$$("[data-inst]", box).forEach(function (b) {
          b.onclick = function () { var id = b.getAttribute("data-inst"), p = CD.uno(cat.programmi, function (x) { return x.id === id; });
            CD.esegui("programma_installa", id, { nota: "Programma: <b>" + esc(p.nome) + "</b> — " + esc(p.pacchetti[f]) }).catch(function () {}); };
        });
      }
      CD.$("#pr-cerca", box).value = stato.testo;
      CD.$("#pr-cerca", box).oninput = function () { stato.testo = this.value; disegna(); };
      var ad = CD.$("#pr-adatti", box); if (ad) ad.onchange = function () { stato.soloAdatti = this.checked; disegna(); };
      var pf = CD.$("#pr-profilo", box); if (pf) pf.onchange = function () { stato.soloProfilo = this.checked; disegna(); };
      CD.$$("#pr-cat button", box).forEach(function (b) {
        b.onclick = function () { stato.cat = b.getAttribute("data-c"); CD.$$("#pr-cat button", box).forEach(function (x) { x.classList.toggle("primario", x === b); }); disegna(); };
      });
      disegna();
    }, function () { box.innerHTML = '<div class="avviso male">Catalogo dei programmi non disponibile.</div>'; });
  };

  CD.registra("programmi", {
    titolo: "Programmi consigliati",
    mostra: function (el) {
      el.innerHTML = CD.titolo("📦", "Programmi consigliati", "Affidabili, quasi tutti gratuiti, scelti per il vostro computer e installati con un clic dalle fonti ufficiali") + '<div id="pr-box"></div>';
      if (CD.server && !CD.analisi.ultima) CD.analisi.dati().then(function () { P.mostraIn(CD.$("#pr-box", el)); }, function () { P.mostraIn(CD.$("#pr-box", el)); });
      else P.mostraIn(CD.$("#pr-box", el));
    }
  });
})();
