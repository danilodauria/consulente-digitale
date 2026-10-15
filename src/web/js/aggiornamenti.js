/* ==========================================================================
 *  CONSULENTE DIGITALE - Aggiornamenti e driver
 *  Cerca (senza cambiare nulla) e poi, su conferma, scarica e installa: sistema, programmi, driver,
 *  firmware e app del negozio, SOLO dalle fonti ufficiali di ciascun sistema:
 *    Windows: Windows Update (anche driver), winget, Microsoft Store
 *    Linux: apt/dnf/zypper/pacman, Flatpak, Snap, fwupd (LVFS), ubuntu-drivers
 *    macOS: Aggiornamento Software di Apple, Homebrew, App Store (mas)
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var FONTI = { windows: "Windows Update (sistema e driver), winget (programmi), Microsoft Store", linux: "gestore della distribuzione, Flatpak/Snap, fwupd (firmware), ubuntu-drivers",
    mac: "Aggiornamento Software di Apple, Homebrew, App Store" };
  var NOMI = { sistema: "🪟 Sistema e sicurezza", programmi: "📦 Programmi", driver: "🧩 Driver", firmware: "🔩 Firmware", negozio: "🛍️ App del negozio" };

  function mostraRisultati(box, j) {
    if (!j) { box.innerHTML = '<p class="vuoto">Premete «Cerca aggiornamenti»: controllo senza cambiare nulla.</p>'; return; }
    var fonti = {};
    j.voci.forEach(function (v) { fonti[v.fonte] = (fonti[v.fonte] || 0) + 1; });
    var f = CD.sistema();
    var scelte = ["sistema", "programmi", "driver", "firmware"].concat(f === "windows" || f === "mac" ? ["negozio"] : []);
    box.innerHTML = (j.info.riavvio === "si" ? '<div class="avviso att">🔄 Il computer aspetta un riavvio per completare aggiornamenti precedenti.</div>' : "") +
      (j.voci.length ? '<div class="avviso">Trovati <b>' + j.voci.length + "</b> aggiornamenti.</div>" : '<div class="avviso ok">✅ Tutto aggiornato! Ultimo controllo: ' + esc(j.quando || "") + "</div>") +
      '<h3>Cosa installare</h3><div class="opzioni">' + scelte.map(function (s) {
        return '<label class="opzione"><input type="checkbox" data-fonte="' + s + '"' + (s !== "firmware" || fonti.firmware ? " checked" : "") + "> " + NOMI[s] + (fonti[s] ? " (" + fonti[s] + ")" : "") + "</label>"; }).join("") +
      '</div><div class="riga" style="margin:.8rem 0"><button class="btn verde grande" id="agg-installa">⬇️ Scarica e installa</button><span class="piccolo-testo">Prima di installare il firmware collegate il caricabatterie.</span></div>' +
      CD.tabellaVoci(j.voci, { vuoto: "Nessun aggiornamento in sospeso." });
    CD.$("#agg-installa", box).onclick = function () {
      var sel = CD.$$("[data-fonte]", box).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute("data-fonte"); });
      if (!sel.length) { CD.avviso("Scegliete almeno una fonte.", "att"); return; }
      CD.esegui("aggiornamenti_installa", sel.join(" ")).then(function () { cerca(box, true); }, function () {});
    };
  }
  function cerca(box, silenzioso) {
    return CD.esegui("aggiornamenti_cerca", "", { senzaConferma: true, silenzioso: silenzioso, senzaVoci: true }).then(function (j) {
      j.quando = CD.dataEstesa() + " " + CD.oraTesto();
      CD.salva("diario", { aggiornamenti: j.voci, info: j.info, quando: j.quando });
      mostraRisultati(box, j);
      return j;
    }, function () {});
  }

  CD.registra("aggiornamenti", {
    titolo: "Aggiornamenti e driver",
    mostra: function (el) {
      var f = CD.sistema();
      el.innerHTML = CD.titolo("⬇️", "Aggiornamenti e driver", "Il computer sempre aggiornato, sicuro e con i driver giusti, dalle fonti ufficiali") +
        (CD.server ? "" : '<div class="avviso att">Questa pagina funziona quando il Consulente Digitale è installato sul computer da aggiornare.</div>') +
        '<div class="griglia-2"><div class="scheda luce"><h2>🔄 Aggiornamenti</h2><p>Sistema: <b>' + esc(CD.stato.nome_sistema || CD.nomeSistema()) + "</b><br><small>Fonti: " + esc(FONTI[f] || "") + "</small></p>" +
        '<div class="riga"><button class="btn primario grande" id="agg-cerca">🔎 Cerca aggiornamenti</button></div></div>' +
        '<div class="scheda"><h2>🧩 Driver e periferiche</h2><p>Dispositivi senza driver, driver nuovi, scheda video e lo strumento ufficiale del produttore del vostro PC.</p>' +
        '<div class="riga"><button class="btn primario" id="drv-cerca">🧩 Controlla i driver</button><button class="btn" id="drv-inst">🛠️ Installa driver e firmware</button></div></div></div>' +
        '<div class="scheda"><h2>📋 Risultato</h2><div id="agg-ris"></div></div>' +
        '<div class="scheda"><h2>💡 Da sapere</h2><ul class="lista-semplice">' +
        (f === "windows" ? "<li><b>Windows 10</b>: per i privati gli aggiornamenti di sicurezza continuano fino a ottobre 2027 solo iscrivendosi al programma ESU (Impostazioni → Windows Update). Poi Windows 11, se compatibile, o Linux.</li>" +
          "<li>Gli aggiornamenti delle funzionalità (es. nuova versione annuale di Windows 11) arrivano da Windows Update quando il PC è pronto.</li><li>Driver della scheda video per i giochi: meglio quelli del produttore (NVIDIA, AMD, Intel).</li>" : "") +
        (f === "linux" ? "<li>Le distribuzioni con supporto lungo (LTS) ricevono aggiornamenti di sicurezza per anni: controllate la data di fine supporto della vostra versione.</li><li>Il firmware (BIOS, dischi, dock) arriva da LVFS tramite fwupd, se il produttore lo pubblica.</li>" : "") +
        (f === "mac" ? "<li>Apple aggiorna la sicurezza delle ultime tre versioni di macOS.</li><li>I programmi scaricati dal web si aggiornano dal loro menu o con Homebrew.</li>" : "") +
        "<li>Prima dei grandi aggiornamenti: copia di sicurezza dei dati.</li><li>Portatili: collegate il caricabatterie durante gli aggiornamenti.</li></ul></div>";
      var box = CD.$("#agg-ris", el);
      CD.carica("diario").then(function (d) {
        if (d && d.aggiornamenti) mostraRisultati(box, { voci: d.aggiornamenti, info: d.info || {}, quando: d.quando }); else mostraRisultati(box, null);
      });
      CD.$("#agg-cerca", el).onclick = function () { cerca(box); };
      CD.$("#drv-cerca", el).onclick = function () { CD.esegui("driver_cerca", "", { senzaConferma: true }).then(function (j) { box.innerHTML = CD.tabellaVoci(j.voci, { vuoto: "Nessun problema con i driver." }); }, function () {}); };
      CD.$("#drv-inst", el).onclick = function () { CD.esegui("driver_installa").catch(function () {}); };
    }
  });
})();
