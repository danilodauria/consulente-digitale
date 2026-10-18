/* ==========================================================================
 *  CONSULENTE DIGITALE - Storia dei computer e dei sistemi operativi
 *  Linea del tempo per ere (con le tappe italiane), famiglie dei sistemi operativi, curiosità e quiz.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  function anno(t) { return t.quando || (t.anno < 0 ? -t.anno + " a.C." : String(t.anno)); }

  function quiz(box) {
    var Q = CD.STORIA.quiz, i = 0, giusti = 0;
    function mostra() {
      if (i >= Q.length) {
        box.innerHTML = '<div class="avviso ok"><b>Risultato: ' + giusti + " su " + Q.length + "</b> — " + (giusti >= 8 ? "da storico dell'informatica! 🏆" : giusti >= 5 ? "bravi! 👏" : "si impara giocando 🙂") +
          '</div><button class="btn" id="qz-ancora">🔁 Ricomincia</button>';
        CD.parla("Avete risposto bene a " + giusti + " domande su " + Q.length + ".");
        CD.$("#qz-ancora", box).onclick = function () { i = 0; giusti = 0; mostra(); };
        return;
      }
      var q = Q[i];
      box.innerHTML = '<p class="piccolo-testo">Domanda ' + (i + 1) + " di " + Q.length + '</p><h3>' + esc(q.d) + '</h3><div class="opzioni verticali">' +
        q.o.map(function (o, k) { return '<button class="opzione" data-k="' + k + '">' + esc(o) + "</button>"; }).join("") + '</div><div id="qz-sp"></div>';
      CD.$$("[data-k]", box).forEach(function (b) {
        b.onclick = function () {
          var k = +b.getAttribute("data-k"), ok = k === q.c;
          if (ok) giusti++;
          CD.$$("[data-k]", box).forEach(function (x) { x.disabled = true; if (+x.getAttribute("data-k") === q.c) x.classList.add("on"); });
          if (!ok) b.classList.add("sbagliata");
          CD.$("#qz-sp", box).innerHTML = '<div class="avviso ' + (ok ? "ok" : "att") + '">' + (ok ? "✔ Esatto! " : "✖ Non proprio. ") + esc(q.s) + '</div><button class="btn primario" id="qz-av">Avanti →</button>';
          CD.cervello.stato(ok ? "felice" : "riposo");
          CD.$("#qz-av", box).onclick = function () { i++; mostra(); };
        };
      });
    }
    mostra();
  }

  CD.registra("storia", {
    titolo: "Storia dei computer",
    mostra: function (el) {
      var S = CD.STORIA, filtro = "", soloItalia = false;
      el.innerHTML = CD.titolo("📜", "Storia dei computer e dei sistemi operativi", "Dall'abaco all'intelligenza artificiale, con le grandi invenzioni italiane") +
        '<div class="scheda curiosita"><span class="em">💡</span><div><b>Lo sapevate?</b><p id="st-cur"></p></div><button class="btn piccolo" id="st-cur-alt">Un\'altra</button></div>' +
        '<div class="opzioni" id="st-ere" style="margin:1rem 0"><button class="btn piccolo primario" data-era="">Tutte le ere</button>' + S.ere.map(function (e) { return '<button class="btn piccolo" data-era="' + e.id + '">' + e.icona + " " + esc(e.nome) + "</button>"; }).join("") +
        '<label class="opzione"><input type="checkbox" id="st-it"> 🇮🇹 Solo le tappe italiane</label></div><ol class="linea-tempo" id="st-linea"></ol>' +
        '<h2>🌳 Le famiglie dei sistemi operativi</h2><div class="griglia-2 famiglie">' + S.famiglie.map(function (f) {
          return '<div class="scheda"><h3>' + f.icona + " " + esc(f.nome) + '</h3><ol class="ramo">' + f.rami.map(function (r) { return "<li><b>" + esc(r[0]) + "</b><small>" + esc(r[1]) + "</small></li>"; }).join("") + "</ol></div>"; }).join("") + "</div>" +
        '<div class="scheda luce"><h2>🎯 Quiz della storia</h2><div id="st-quiz"></div></div><div class="riga"><button class="btn" id="st-stampa">🖨️ Stampa la linea del tempo</button></div>';
      function cur() { CD.$("#st-cur", el).textContent = S.curiosita[Math.floor(Math.random() * S.curiosita.length)]; }
      cur(); CD.$("#st-cur-alt", el).onclick = cur;
      function disegna() {
        var era = CD.uno(S.ere, function (e) { return e.id === filtro; });
        CD.$("#st-linea", el).innerHTML = S.tappe.filter(function (t) { return (!era || (t.anno >= era.da && t.anno <= era.a)) && (!soloItalia || t.italia); }).map(function (t) {
          return '<li class="' + (t.italia ? "italia" : "") + '"><span class="anno">' + esc(anno(t)) + '</span><div class="tappa"><span class="em">' + t.icona + "</span><div><b>" + esc(t.titolo) + "</b><p>" + esc(t.testo) + "</p></div></div></li>";
        }).join("");
      }
      disegna();
      CD.$$("[data-era]", el).forEach(function (b) { b.onclick = function () { filtro = b.getAttribute("data-era"); CD.$$("[data-era]", el).forEach(function (x) { x.classList.toggle("primario", x === b); }); disegna(); }; });
      CD.$("#st-it", el).onchange = function () { soloItalia = this.checked; disegna(); };
      quiz(CD.$("#st-quiz", el));
      CD.$("#st-stampa", el).onclick = function () {
        CD.stampa("Storia dei computer", '<ol class="f-linea">' + S.tappe.map(function (t) { return "<li><b>" + esc(anno(t)) + " — " + esc(t.titolo) + "</b>" + (t.italia ? " 🇮🇹" : "") + "<br>" + esc(t.testo) + "</li>"; }).join("") + "</ol>");
      };
    }
  });
})();
