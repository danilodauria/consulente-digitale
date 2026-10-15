/* ==========================================================================
 *  CONSULENTE DIGITALE - Cose da sapere (uso ottimale e consapevole) e glossario
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  function dettaglio(s) {
    return '<article class="scheda luce sapere-art"><div class="riga"><span class="em grande-em">' + s.icona + "</span><div><small>" + esc(s.cat) + "</small><h2>" + esc(s.titolo) + "</h2></div></div>" +
      '<p class="grande">' + esc(s.sintesi) + '</p><ul class="lista-semplice punti">' + s.punti.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
      '<div class="riga"><button class="btn" id="sa-leggi">🔊 Leggi ad alta voce</button><button class="btn" id="sa-stampa">🖨️ Stampa</button><button class="btn" id="sa-chiedi">🧠 Chiedi a Neura di approfondire</button>' +
      '<a class="btn" href="#/sapere">← Tutte le schede</a></div></article>';
  }
  CD.registra("sapere", {
    titolo: "Cose da sapere",
    mostra: function (el, parti) {
      var s = parti[0] && CD.uno(CD.SAPERE, function (x) { return x.id === parti[0]; });
      if (s) {
        el.innerHTML = dettaglio(s);
        CD.$("#sa-leggi", el).onclick = function () { CD.parla(s.titolo + ". " + s.sintesi + " " + s.punti.join(". "), { sempre: true }); };
        CD.$("#sa-stampa", el).onclick = function () { CD.stampa(s.titolo, '<p class="f-grande">' + esc(s.sintesi) + "</p><ul>" + s.punti.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>"); };
        CD.$("#sa-chiedi", el).onclick = function () { CD.neura.chiedi("Spiegami meglio: " + s.titolo); };
        return;
      }
      var cat = {};
      CD.SAPERE.forEach(function (x) { (cat[x.cat] = cat[x.cat] || []).push(x); });
      el.innerHTML = CD.titolo("💡", "Cose da sapere", "Per usare computer e telefoni bene, in sicurezza e con la testa: in poche righe, da leggere o ascoltare") +
        Object.keys(cat).map(function (c) {
          return "<h2>" + esc(c) + '</h2><div class="griglia-schede">' + cat[c].map(function (x) {
            return '<a class="tessera" href="#/sapere/' + x.id + '"><span class="em">' + x.icona + "</span><b>" + esc(x.titolo) + "</b><small>" + esc(x.sintesi) + "</small></a>"; }).join("") + "</div>";
        }).join("") +
        '<div class="scheda" style="margin-top:1.4rem"><div class="riga"><h2>📖 Glossario</h2><span class="spazio"></span><input type="search" id="gl-cerca" placeholder="Cerca una parola…" style="max-width:18rem"><button class="btn piccolo" id="gl-stampa">🖨️ Stampa</button></div>' +
        '<dl class="glossario" id="glossario"></dl></div>';
      function disegna(t) {
        t = CD.neura.norm(t || "");
        CD.$("#glossario", el).innerHTML = CD.GLOSSARIO.filter(function (g) { return !t || CD.neura.norm(g[0] + " " + g[1]).indexOf(t) >= 0; })
          .map(function (g) { return "<dt>" + esc(g[0]) + "</dt><dd>" + esc(g[1]) + "</dd>"; }).join("");
      }
      disegna("");
      CD.$("#gl-cerca", el).oninput = function () { disegna(this.value); };
      CD.$("#gl-stampa", el).onclick = function () { CD.stampa("Glossario dell'informatica", '<dl class="glossario">' + CD.GLOSSARIO.map(function (g) { return "<dt>" + esc(g[0]) + "</dt><dd>" + esc(g[1]) + "</dd>"; }).join("") + "</dl>"); };
    }
  });
})();
