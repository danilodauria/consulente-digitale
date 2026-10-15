/* ==========================================================================
 *  CONSULENTE DIGITALE - Azioni automatiche e lavori in corso
 *  CD.esegui(id, parametro, opzioni): chiede conferma (spiegando cosa succede, se servono i permessi
 *  di amministratore e se serve un riavvio), avvia l'azione del catalogo sul server e mostra
 *  la console in diretta con passi, registro ed elenco dei risultati. Restituisce il lavoro finito.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  CD.azioni = {};
  CD.caricaAzioni = function () {
    if (!CD.server) return Promise.resolve({});
    return CD.api("/api/azioni").then(function (j) {
      CD.azioni = {}; (j.azioni || []).forEach(function (a) { CD.azioni[a.id] = a; });
      return CD.azioni;
    }, function () { return {}; });
  };
  CD.azioneDisponibile = function (id) { return !!CD.azioni[id]; };

  var ADMIN = { windows: "Windows mostrerà la finestra «Controllo account utente»: premete <b>Sì</b>.",
    linux: "Linux chiederà la <b>password</b> del vostro utente (quella con cui accedete).",
    mac: "Il Mac chiederà la <b>password</b> del vostro utente." };

  function coloraRiga(r) {
    var e = esc(r);
    if (/^▶/.test(r)) return '<span class="passo">' + e + "</span>";
    if (/✔|completat|installat|pronto/i.test(r)) return '<span class="ok">' + e + "</span>";
    if (/⚠|attenzione|avviso|warning/i.test(r)) return '<span class="att">' + e + "</span>";
    if (/✖|errore|error|failed|non riuscit|negat/i.test(r)) return '<span class="male">' + e + "</span>";
    return e;
  }
  CD.tabellaVoci = function (voci, opz) {
    opz = opz || {};
    if (!voci || !voci.length) return '<p class="vuoto">' + (opz.vuoto || "Nessun elemento.") + "</p>";
    var gruppi = {};
    voci.forEach(function (v) { (gruppi[v.fonte] = gruppi[v.fonte] || []).push(v); });
    var NOMI = { sistema: "🪟 Sistema", programmi: "📦 Programmi", driver: "🧩 Driver", firmware: "🔩 Firmware", negozio: "🛍️ Negozio", periferica: "🔌 Periferiche",
      video: "🎮 Scheda video", strumento: "🧰 Strumenti ufficiali", disco: "💽 Dischi", batteria: "🔋 Batteria", controllo: "🛡️ Controlli", avvio: "🚦 Programmi all'avvio",
      licenza: "📄 Licenza", estensione: "🧩 Estensioni" };
    var h = "";
    Object.keys(gruppi).forEach(function (g) {
      h += "<h3>" + (NOMI[g] || esc(g)) + ' <span class="etichetta">' + gruppi[g].length + "</span></h3><table class=\"tab\"><tbody>";
      gruppi[g].forEach(function (v) {
        var stato = v.nuova || "";
        var cl = /^ok$/i.test(stato) ? "ok" : /attenzione|^no$/i.test(stato) ? "att" : /consiglio/i.test(stato) ? "neon" : "";
        if (g === "controllo") stato = '<span class="etichetta ' + cl + '">' + esc(stato) + "</span>";
        else stato = esc(stato);
        var nota = esc(v.nota || "");
        if (/^https?:\/\//.test(v.id || "")) nota += ' <a href="' + esc(v.id) + '" target="_blank" rel="noopener">sito ufficiale ↗</a>';
        h += "<tr><td><b>" + esc(v.nome) + "</b>" + (nota ? '<br><small>' + nota + "</small>" : "") + "</td><td>" + esc(v.attuale || "") + "</td><td>" + stato + "</td></tr>";
      });
      h += "</tbody></table>";
    });
    return h;
  };

  CD.esegui = function (id, parametro, opz) {
    opz = opz || {};
    var a = CD.azioni[id];
    if (!CD.server) {
      CD.modale({ titolo: "Serve il programma installato", html: "<p>Le azioni automatiche funzionano quando il Consulente Digitale è installato su questo computer " +
        "(non dalla versione per il telefono). Gli script si possono comunque <b>vedere, salvare e stampare</b> dalla pagina «Ottimizza».</p>" });
      return Promise.reject(new Error("senza server"));
    }
    if (!a) { CD.avviso("Questa azione non è disponibile su " + CD.nomeSistema(), "att"); return Promise.reject(new Error("non disponibile")); }
    var domanda = opz.senzaConferma && a.rischio === "nessuno" ? Promise.resolve(true) : CD.conferma(a.icona + " " + esc(a.titolo),
      "<p>" + esc(a.descrizione) + "</p>" +
      (a.admin ? '<div class="avviso">🔐 Servono i permessi di amministratore. ' + (ADMIN[CD.sistema()] || "") + "</div>" : "") +
      (a.rischio === "medio" ? '<div class="avviso att">⚠️ Cambia impostazioni del sistema. Prima viene creato un punto di ripristino quando possibile.</div>' : "") +
      (a.riavvio ? '<div class="avviso">🔄 Alla fine potrebbe servire un <b>riavvio</b>: salvate il lavoro aperto.</div>' : "") +
      (a.finestra ? '<div class="avviso">🪟 Si aprirà una finestra a parte: continuate lì.</div>' : "") +
      (opz.nota ? "<p>" + opz.nota + "</p>" : "") +
      '<p class="piccolo-testo">Script: <code>' + esc(a.file) + "</code> (si può leggere nella pagina «Ottimizza»).</p>",
      a.admin ? "🔐 Avvia" : "▶ Avvia");
    return domanda.then(function (si) {
      if (!si) throw new Error("annullato");
      return CD.api("/api/azioni/avvia", { id: id, parametro: parametro || "" });
    }).then(function (j) { return segui(j.lavoro, a, opz); });
  };

  function segui(idLav, a, opz) {
    return new Promise(function (risolvi) {
      var da = 0, finito = false, ultimo = null, tutte = [];
      CD.cervello.stato("pensiero");
      var corpo = '<div class="riga"><span class="etichetta neon" id="lav-stato">in corso…</span><span id="lav-passo" class="piccolo-testo"></span><span class="spazio"></span>' +
        '<span class="piccolo-testo" id="lav-tempo">0 s</span></div><div class="barra-progresso indeterminata" style="margin:.6rem 0"><i id="lav-barra"></i></div>' +
        '<div class="console" id="lav-console" role="log" aria-live="polite"></div><div id="lav-voci"></div>';
      var modale = !opz.silenzioso;
      var box = null;
      if (modale) {
        CD.modale({
          titolo: a.icona + " " + esc(a.titolo), html: corpo, chiudibile: false,
          pulsanti: [{ testo: "⏹ Ferma", valore: "ferma", classe: "rosso" }, { testo: "🖨️ Stampa", valore: "stampa" }, { testo: "Chiudi", valore: "chiudi", classe: "primario" }],
          dopo: function (m) { box = m; }
        }).then(function (v) {
          if (v === "ferma" && !finito) CD.api("/api/lavori/" + idLav + "/ferma", {}).catch(function () {});
          if (v === "stampa" && ultimo) stampaLavoro(ultimo);
          if (!finito) { modale = false; CD.avviso("⏳ «" + esc(a.titolo) + "» continua in sottofondo.", "", 3500); }
        });
      }
      function giro() {
        CD.api("/api/lavori/" + idLav + "?da=" + da).then(function (j) {
          var nuove = j.righe; tutte = tutte.concat(nuove); j.righe = tutte; ultimo = j; da = j.totale;
          if (box && box.isConnected) {
            var con = CD.$("#lav-console", box);
            if (nuove.length) {
              con.insertAdjacentHTML("beforeend", nuove.map(coloraRiga).join("\n") + "\n");
              con.scrollTop = con.scrollHeight;
            }
            if (j.passo) {
              CD.$("#lav-passo", box).textContent = "Passo " + j.passo.n + " di " + j.passo.di + ": " + j.passo.testo;
              var barra = CD.$("#lav-barra", box), pb = barra.parentNode;
              pb.classList.remove("indeterminata"); barra.style.width = Math.round(100 * (+j.passo.n - 0.5) / +j.passo.di) + "%";
            }
            CD.$("#lav-tempo", box).textContent = (j.secondi >= 60 ? Math.floor(j.secondi / 60) + " min " : "") + (j.secondi % 60) + " s";
          }
          if (j.stato === "in_corso") { setTimeout(giro, 700); return; }
          finito = true;
          var esito = { fatto: ["ok", "✔ completato"], errore: ["male", "✖ con errori"], negato: ["att", "🔐 permesso non concesso"], annullato: ["att", "⏹ fermato"] }[j.stato] || ["", j.stato];
          CD.cervello.stato(j.stato === "fatto" ? "felice" : j.stato === "errore" ? "errore" : "riposo");
          if (box && box.isConnected) {
            var et = CD.$("#lav-stato", box); et.className = "etichetta " + esito[0]; et.textContent = esito[1];
            var b2 = CD.$("#lav-barra", box); b2.parentNode.classList.remove("indeterminata"); b2.style.width = "100%";
            if (j.voci.length && !opz.senzaVoci) CD.$("#lav-voci", box).innerHTML = CD.tabellaVoci(j.voci);
            if (j.info.riavvio === "si") CD.$("#lav-voci", box).insertAdjacentHTML("afterbegin", '<div class="avviso att">🔄 Serve un riavvio per completare. Salvate il lavoro e riavviate quando potete.</div>');
          } else if (!opz.quieto) {
            CD.avviso((j.stato === "fatto" ? "✅ " : "⚠️ ") + "«" + esc(a.titolo) + "»: " + esito[1], esito[0], 6000);
          }
          if (opz.parla !== false && CD.neura && CD.neura.commentaLavoro) CD.neura.commentaLavoro(a, j);
          risolvi(j);
        }, function (e) { setTimeout(giro, 1500); if (window.console) console.warn(e); });
      }
      giro();
    });
  }

  function stampaLavoro(j) {
    CD.stampa("Registro: " + j.titolo, '<p>Esito: <b>' + esc(j.stato) + "</b> · durata " + j.secondi + " s</p>" + (j.voci.length ? CD.tabellaVoci(j.voci) : "") +
      '<h3>Registro</h3><pre class="f-registro">' + esc(j.righe.join("\n")) + "</pre>");
  }
  CD.stampaLavoro = stampaLavoro;
})();
