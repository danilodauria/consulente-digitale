/* ==========================================================================
 *  CONSULENTE DIGITALE - Benvenuto: la scelta iniziale
 *  Come nel Professore Digitale, al primo avvio si sceglie CHI usa il programma (persona, famiglia,
 *  persona anziana, studente, creativo, professionista, ditta, azienda, scuola, centro anziani, ente),
 *  come chiamarlo, quante persone o postazioni, l'aspetto e cosa può fare Neura da sola.
 *  Tutti i consigli (acquisti, sistemi operativi, programmi) tengono conto di queste scelte.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var bozza = null;

  function passo1(el) {
    el.innerHTML = '<div class="benvenuto"><div class="benv-testa"><canvas id="cervello-benv"></canvas><div><h1>Benvenuti nel Consulente Digitale</h1>' +
      '<p class="grande">Sono <b>Neura</b>, il cervello digitale che vi aiuta a <b>scegliere</b>, <b>aggiornare</b> e <b>ottimizzare</b> computer, tablet, telefoni e TV.</p>' +
      '<p>Per darvi consigli giusti, ditemi <b>chi userà il programma</b>.</p></div></div>' +
      '<div class="griglia-schede" id="benv-tipi">' + Object.keys(CD.TIPI).map(function (k) {
        var t = CD.TIPI[k];
        return '<button class="tessera' + (bozza.tipo === k ? " scelta" : "") + '" data-t="' + k + '"><span class="em">' + t.icona + "</span><b>" + esc(t.nome) + "</b><small>" + esc(t.desc) + "</small></button>";
      }).join("") + "</div>" + '<p class="piccolo-testo">Si può cambiare quando volete da Impostazioni.</p></div>';
    CD.cervello.crea(CD.$("#cervello-benv", el));
    CD.$$("#benv-tipi .tessera", el).forEach(function (b) {
      b.onclick = function () { bozza.tipo = b.getAttribute("data-t"); passo2(el); };
    });
    if (!CD.benvenutoSalutato) { CD.benvenutoSalutato = true; setTimeout(function () { CD.parla("Benvenuti! Sono Neura. Ditemi chi userà il programma, così vi darò i consigli giusti."); }, 700); }
  }

  function passo2(el) {
    var t = CD.TIPI[bozza.tipo], gruppo = /^(ditta|azienda|scuola|centro|ente|famiglia)$/.test(bozza.tipo);
    var etNome = gruppo ? (bozza.tipo === "famiglia" ? "Come si chiama la famiglia? (es. Famiglia Rossi)" : "Nome della " + (bozza.tipo === "scuola" ? "scuola o dell'aula" : bozza.tipo === "centro" ? "struttura o associazione" : bozza.tipo === "ente" ? "struttura o dell'ufficio" : "ditta o società")) : "Come vi chiamo?";
    el.innerHTML = '<div class="benvenuto"><h1>' + t.icona + " " + esc(t.nome) + "</h1>" +
      '<div class="scheda"><div class="campo"><label for="benv-nome">' + etNome + '</label><input id="benv-nome" value="' + esc(bozza.nome || "") + '" maxlength="60" placeholder="' + (gruppo ? "Nome" : "Il vostro nome (facoltativo)") + '"></div>' +
      (gruppo ? '<div class="campo"><label for="benv-quanti">Quante persone o postazioni?</label><input id="benv-quanti" type="number" min="1" max="5000" value="' + (bozza.quanti || (bozza.tipo === "famiglia" ? 3 : 5)) + '"></div>' : "") +
      (bozza.tipo === "anziano" || bozza.tipo === "centro" ? '<div class="avviso ok">👓 Ho già preparato <b>caratteri più grandi</b> e il tema chiaro: si cambiano qui sotto.</div>' : "") +
      '<div class="campo"><span class="lbl">Aspetto</span><div class="opzioni" id="benv-tema">' +
      [["notte", "🌌 Notte (fantascienza)"], ["giorno", "☀️ Giorno"], ["contrasto", "🔳 Alto contrasto"]].map(function (x) {
        return '<label class="opzione"><input type="radio" name="tema" value="' + x[0] + '"' + (bozza.tema === x[0] ? " checked" : "") + "> " + x[1] + "</label>"; }).join("") +
      '</div></div><div class="campo"><span class="lbl">Dimensione del testo</span><input type="range" id="benv-testo" min="15" max="26" value="' + bozza.testo + '"></div>' +
      '<div class="campo"><span class="lbl">Neura</span><div class="opzioni">' +
      '<label class="opzione"><input type="checkbox" id="benv-voce"' + (bozza.voce ? " checked" : "") + "> 🔊 Mi legge le risposte ad alta voce</label>" +
      '<label class="opzione"><input type="checkbox" id="benv-online"' + (bozza.online ? " checked" : "") + "> 🌐 Può usare Internet (ora esatta, offerte, aggiornamenti)</label>" +
      '<label class="opzione"><input type="checkbox" id="benv-auto"' + (bozza.automatico ? " checked" : "") + "> 🤖 Può fare da sola i controlli che non cambiano nulla</label></div></div></div>" +
      '<div class="riga"><button class="btn" id="benv-indietro">← Indietro</button><span class="spazio"></span><button class="btn grande primario" id="benv-fine">Iniziamo! 🚀</button></div></div>';
    function anteprima() {
      var tm = CD.$('input[name="tema"]:checked', el); CD.imp.tema = tm ? tm.value : CD.imp.tema;
      CD.imp.testo = +CD.$("#benv-testo", el).value; CD.applicaImpostazioni();
    }
    CD.$$('input[name="tema"]', el).forEach(function (r) { r.onchange = anteprima; });
    CD.$("#benv-testo", el).oninput = anteprima;
    anteprima();
    CD.$("#benv-indietro", el).onclick = function () { passo1(el); };
    CD.$("#benv-fine", el).onclick = function () {
      bozza.nome = CD.$("#benv-nome", el).value.trim().slice(0, 60);
      bozza.quanti = gruppo ? Math.max(1, Math.min(5000, +CD.$("#benv-quanti", el).value || 1)) : 1;
      CD.imp.voce = CD.$("#benv-voce", el).checked; CD.imp.online = CD.$("#benv-online", el).checked; CD.imp.automatico = CD.$("#benv-auto", el).checked;
      if (!gruppo && bozza.nome) CD.imp.nomeUtente = bozza.nome;
      anteprima(); CD.salvaImpostazioni();
      CD.salvaProfilo({ tipo: bozza.tipo, nome: bozza.nome, quanti: bozza.quanti, creato: new Date().toISOString() });
      CD.controllaRete(); CD.sincronizzaOra();
      CD.vai("#/");
      setTimeout(function () {
        var n = bozza.nome && !gruppo ? ", " + bozza.nome : "";
        CD.neura.dici("Perfetto" + n + "! Da qui posso analizzare questo computer, cercare gli aggiornamenti e consigliarvi cosa comprare. Volete che faccia subito un controllo completo con il pilota automatico?",
          CD.server ? [{ tipo: "fn", fn: function () { CD.pilota && CD.pilota(); }, etichetta: "🧭 Sì, controlla tutto" }, { tipo: "vai", hash: "#/acquisti", etichetta: "🛒 Prima voglio comprare" }] : [{ tipo: "vai", hash: "#/acquisti", etichetta: "🛒 Cosa comprare" }]);
      }, 600);
    };
  }

  CD.registra("benvenuto", {
    titolo: "Benvenuto",
    mostra: function (el) {
      var p = CD.profilo || {};
      bozza = { tipo: p.tipo || "", nome: p.nome || "", quanti: p.quanti || 1, tema: CD.imp.tema, testo: CD.imp.testo, voce: CD.imp.voce, online: CD.imp.online, automatico: CD.imp.automatico };
      passo1(el);
      el.addEventListener("click", function (e) {
        var b = e.target.closest && e.target.closest(".tessera[data-t]");
        if (b && (b.getAttribute("data-t") === "anziano" || b.getAttribute("data-t") === "centro")) { bozza.tema = "giorno"; bozza.testo = Math.max(bozza.testo, 22); }
      }, true);
    }
  });
})();
