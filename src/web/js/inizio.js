/* ==========================================================================
 *  CONSULENTE DIGITALE - Pagina iniziale (plancia di comando)
 *  Il cervello grande, il saluto con data e ora esatte, il pilota automatico, lo stato del computer,
 *  il momento giusto per comprare, il consiglio del giorno e tutte le sezioni.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var SEZIONI = [
    ["#/acquisti", "🛒", "Cosa comprare", "Computer, tablet, telefoni, TV: il modello giusto e il momento migliore"],
    ["#/analisi", "🔬", "Analisi del PC", "Voto, compatibilità, sistema operativo consigliato, scheda da stampare"],
    ["#/aggiornamenti", "⬇️", "Aggiornamenti e driver", "Sistema, programmi, driver e firmware dalle fonti ufficiali"],
    ["#/ottimizza", "🚀", "Ottimizza", "Pulsanti automatici e script pronti per Windows, Linux e macOS"],
    ["#/strumenti", "🩺", "Salute e riparazioni", "Disco, batteria, sicurezza, velocità di Internet, ora esatta"],
    ["#/programmi", "📦", "Programmi consigliati", "I migliori programmi gratuiti, installati con un clic"],
    ["#/sapere", "💡", "Cose da sapere", "Backup, password, truffe, privacy, salute e sostenibilità"],
    ["#/storia", "📜", "Storia dei computer", "Dall'abaco all'IA, con le invenzioni italiane e un quiz"]
  ];
  function saluto() { var h = CD.adesso().getHours(); return h < 5 ? "Buonanotte" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera"; }
  CD.registra("inizio", {
    titolo: "",
    mostra: function (el) {
      var n = CD.imp.nomeUtente || (CD.profilo && CD.profilo.nome) || "";
      var consiglio = CD.SAPERE[(CD.adesso().getDate() + CD.adesso().getMonth()) % CD.SAPERE.length];
      el.innerHTML = '<div class="plancia"><div class="plancia-cervello"><canvas id="cervello-home" aria-label="Neura, il cervello digitale"></canvas>' +
        '<div class="neura-nome"><b>NEURA</b><span class="neura-stato">' + CD.cervello.nomeStato() + "</span></div></div>" +
        '<div class="plancia-testo"><p class="sopratitolo">' + esc(CD.dataEstesa()) + ' · <span id="home-ora">' + CD.oraTesto() + "</span></p>" +
        "<h1>" + saluto() + (n ? ", <span class=\"nome-grad\">" + esc(n) + "</span>" : "") + "!</h1>" +
        '<p class="grande">Sono <b>Neura</b>, il cervello digitale che vi aiuta a scegliere, aggiornare e far volare i vostri dispositivi. Parlatemi o scrivetemi: capisco l\'italiano di tutti i giorni.</p>' +
        '<div class="riga"><button class="btn grande primario" id="home-pilota">🧭 Pilota automatico</button><a class="btn grande oro" href="#/acquisti">🛒 Cosa comprare</a>' +
        '<button class="btn grande" id="home-parla">🎤 Parla con Neura</button></div>' +
        '<p class="piccolo-testo">Il pilota automatico controlla hardware, aggiornamenti, sicurezza, disco e batteria senza cambiare nulla, poi vi propone cosa fare.</p></div></div>' +
        '<div class="griglia-schede cruscotto">' +
        '<div class="scheda" id="home-pc"><h3>💻 Questo computer</h3><div class="barra-progresso indeterminata"><i></i></div></div>' +
        '<div class="scheda" id="home-momento"><h3>📅 Il momento per comprare</h3><div id="home-cal"></div></div>' +
        '<div class="scheda"><h3>' + consiglio.icona + " Consiglio del giorno</h3><p><b>" + esc(consiglio.titolo) + "</b></p><p>" + esc(consiglio.sintesi) + '</p><a class="btn piccolo" href="#/sapere/' + consiglio.id + '">Leggi →</a></div>' +
        '<div class="scheda" id="home-agg"><h3>⬇️ Aggiornamenti</h3><p class="piccolo-testo">Nessun controllo recente.</p></div></div>' +
        '<h2 class="titolo-sezioni">Tutto quello che posso fare</h2><div class="griglia-schede">' + SEZIONI.map(function (s) {
          return '<a class="tessera" href="' + s[0] + '"><span class="em">' + s[1] + "</span><b>" + esc(s[2]) + "</b><small>" + esc(s[3]) + "</small></a>"; }).join("") + "</div>";
      CD.cervello.crea(CD.$("#cervello-home", el));
      CD.$("#home-pilota", el).onclick = function () { CD.pilota(); };
      CD.$("#home-parla", el).onclick = function () { CD.vai("#/neura"); setTimeout(function () { CD.neura.ascoltaEChiedi(); }, 300); };
      // momento giusto per comprare (con conto alla rovescia)
      var c = CD.acquisti.consiglioMomento("");
      CD.$("#home-cal", el).innerHTML = CD.acquisti.htmlCalendario("", 3);
      CD.acquisti.avviaRovesce();
      // ora che scorre
      var t = setInterval(function () { var o = CD.$("#home-ora"); if (!o) { clearInterval(t); return; } o.textContent = CD.oraTesto() + (CD.oraSync ? " (ora esatta)" : ""); }, 1000);
      // computer
      var pc = CD.$("#home-pc", el);
      if (!CD.server) pc.innerHTML = '<h3>📱 Questo dispositivo</h3><p>State usando il Consulente Digitale senza il programma installato: la guida all\'acquisto, le cose da sapere e la storia funzionano. Per analizzare e ottimizzare un computer, installatelo lì.</p>';
      else CD.analisi.dati().then(function (r) {
        var p = CD.analisi.punteggi(r), w = CD.analisi.win11(r), so = CD.analisi.consigliaSistemi(r)[0];
        pc.innerHTML = '<h3>💻 Questo computer</h3><div class="riga">' + CD.metro(p.totale, 10, "Voto") + '<div style="flex:1"><p><b>' + esc((r.computer || {}).produttore || "") + " " + esc((r.computer || {}).modello || "") + "</b><br><small>" +
          esc((r.sistema || {}).nome) + "<br>" + esc((r.cpu || {}).nome) + "<br>" + CD.arrotonda((r.memoria || {}).totale_mb / 1024, 1) + " GB RAM</small></p>" +
          ((r.sistema || {}).famiglia === "windows" ? '<span class="etichetta ' + (w.ok ? "ok" : "att") + '">Windows 11: ' + CD.analisi.win11Testo(w, true) + "</span> " : "") +
          '<span class="etichetta neon">consigliato: ' + esc(so.nome) + '</span></div></div><a class="btn piccolo" href="#/analisi">Analisi completa →</a>';
      }, function () { pc.innerHTML = "<h3>💻 Questo computer</h3><p>Analisi non disponibile.</p>"; });
      CD.carica("diario").then(function (d) {
        if (!d) return;
        var a = CD.$("#home-agg", el); if (!a) return;
        var n2 = (d.aggiornamenti || []).length;
        a.innerHTML = "<h3>⬇️ Aggiornamenti</h3><p>" + (n2 ? "<b>" + n2 + "</b> aggiornamenti da installare" : "✔ Tutto aggiornato") + '<br><small>Controllo: ' + esc(d.quando || "") + "</small></p>" +
          (d.pilota ? '<p class="piccolo-testo">Ultimo pilota automatico: ' + esc(d.pilota.quando) + "</p>" : "") + '<a class="btn piccolo" href="#/aggiornamenti">Apri →</a>';
      });
      void c;
    }
  });
})();
