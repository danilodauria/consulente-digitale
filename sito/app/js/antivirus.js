/* ==========================================================================
 *  CONSULENTE DIGITALE - Antivirus
 *  Windows: Microsoft Defender (aggiornamento, controllo rapido/completo/chiavette, controllo all'avvio con
 *  Defender Offline) e lo Strumento di rimozione malware (MRT). Linux e Mac: ClamAV (Cisco Talos, GPL) con
 *  quarantena. Tutti gratuiti e aggiornabili. Quando Windows non parte: chiavetta di emergenza (Kit).
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;

  function tessera(id, param, em, titolo, testo, classe) {
    if (!CD.azioni || !CD.azioni[id]) return "";
    return '<div class="scheda ' + (classe || "") + '"><h3>' + em + " " + esc(titolo) + "</h3><p>" + testo + '</p><button class="btn primario" data-av="' + id + '" data-p="' + (param || "") + '">' +
      em + " " + esc(titolo) + "</button></div>";
  }

  CD.registra("antivirus", {
    titolo: "Antivirus",
    mostra: function (el) {
      var win = CD.sistema() === "windows";
      el.innerHTML = CD.titolo("🛡️", "Antivirus", win ? "Microsoft Defender e lo Strumento di rimozione malware: già dentro Windows, gratuiti e sempre aggiornati" :
        "ClamAV, l'antivirus libero e gratuito, aggiornato ogni giorno") +
        (CD.server ? "" : '<div class="avviso">I controlli antivirus funzionano con il programma installato sul computer.</div>') +
        '<div class="griglia-2">' +
        tessera("antivirus_aggiorna", "", "🔄", "Aggiorna l'antivirus", "Scarica le «firme» dei virus più recenti. Fatelo prima di ogni controllo (lo faccio io in automatico).") +
        tessera("antivirus_scansione", "rapida", "⚡", "Controllo rapido", "Pochi minuti: le cartelle dove arrivano i file scaricati e i punti dove i virus si avviano.") +
        tessera("antivirus_scansione", "completa", "🔬", "Controllo completo", "Tutto il disco, file per file. Può durare ore: il computer si può usare lo stesso.") +
        tessera("antivirus_scansione", "chiavette", "🔌", "Controlla chiavette e dischi esterni", "Prima di aprire i file di una chiavetta che arriva da altri computer.") +
        tessera("antivirus_quarantena", "", "🔒", "Quarantena", "Sposta i file infetti trovati in una cartella chiusa: non si aprono più, ma si possono rimettere a posto.") +
        tessera("antivirus_mrt", "", "🧽", "Rimozione malware (MRT)", "Lo strumento di Microsoft, aggiornato ogni mese, che toglie i malware più diffusi.") +
        tessera("antivirus_avvio", "", "🔁", "Controllo all'avvio", "Per i virus che si nascondono quando Windows è acceso: il PC si riavvia e controlla il disco prima di Windows (15 minuti).", "att") +
        "</div>" +
        '<div class="scheda luce"><h3>🚑 E se il computer non si avvia?</h3><p>Preparate la <b>chiavetta di emergenza</b>: parte da sola, controlla il disco senza avviare Windows, ' +
        "recupera i file e prova a riparare l'avvio.</p><button class=\"btn\" onclick=\"CD.vai('#/kit')\">🚑 Kit di emergenza</button></div>" +
        '<details class="scheda"><summary><b>Consigli</b></summary><ul><li>Un solo antivirus alla volta: due insieme si ostacolano e rallentano il PC.</li>' +
        "<li>Su Windows 10 e 11 Microsoft Defender basta per l'uso di casa: non servono antivirus a pagamento.</li>" +
        "<li>La miglior difesa: aggiornamenti installati, niente programmi da siti sconosciuti, attenzione agli allegati e ai link nei messaggi.</li>" +
        "<li>La quarantena non cancella: se un file era buono (falso allarme) si può ripristinare.</li></ul></details>";
      CD.$$("[data-av]", el).forEach(function (b) {
        b.onclick = function () { CD.esegui(b.getAttribute("data-av"), b.getAttribute("data-p")).catch(function () {}); };
      });
    }
  });
})();
