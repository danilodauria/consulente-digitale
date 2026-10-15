/* ==========================================================================
 *  CONSULENTE DIGITALE - Ottimizza: pulsanti automatici, script pronti all'uso, strumenti degli esperti,
 *  consigli e soluzioni, guide «come fare». Gli script di Windows, Linux e macOS si possono leggere,
 *  copiare, salvare e stampare anche per un altro computer.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var GUIDE = [
    { icona: "🔌", titolo: "Creare una chiavetta avviabile", passi: ["Scaricate l'ISO dal sito ufficiale del sistema", "Windows: Rufus (scegliete chiavetta e ISO, poi «Avvia») oppure Ventoy (copiate le ISO dentro)",
      "Linux: «Creatore di dischi di avvio» o «Scrittura immagini USB»; Mac: balenaEtcher", "Tutto quello che c'è sulla chiavetta verrà cancellato"] },
    { icona: "⚙️", titolo: "Entrare nel BIOS/UEFI", passi: ["Spegnete il computer del tutto", "Accendete e premete ripetutamente F2 o Canc (Del); su alcuni HP Esc poi F10, su Lenovo F1/F2 o il tasto Novo",
      "Da Windows: Impostazioni → Sistema → Ripristino → Avvio avanzato → Riavvia ora → Risoluzione problemi → Impostazioni firmware UEFI", "Cambiate solo ciò che serve (es. TPM/PTT, Secure Boot, ordine di avvio) e salvate con F10"] },
    { icona: "🚦", titolo: "Togliere i programmi dall'avvio", passi: ["Windows: Ctrl+Maiusc+Esc → Gestione attività → App di avvio → Disabilita", "Mac: Impostazioni di Sistema → Generali → Elementi login",
      "Linux: «Applicazioni d'avvio» (Mint, Ubuntu) o Impostazioni → Avvio automatico (KDE)", "Lasciate antivirus, driver audio/touchpad e sincronizzazione cloud se la usate"] },
    { icona: "🛟", titolo: "Tornare indietro se qualcosa va storto", passi: ["Windows: menu Start → «rstrui» → scegliete il punto di ripristino del Consulente Digitale", "Le impostazioni di privacy e PC vecchio hanno anche una copia .reg in %APPDATA%\\ConsulenteDigitale\\copie: doppio clic per ripristinare",
      "Linux: Timeshift → scegliete l'istantanea → Ripristina; senza Timeshift la copia di /etc è in /var/backups/consulente-digitale", "Mac: Time Machine o Recovery (Cmd+R / tasto di accensione su chip Apple)"] },
    { icona: "📱", titolo: "Trasferire foto dal telefono al PC", passi: ["Con il cavo: sbloccate il telefono e scegliete «Trasferimento file»", "Senza cavo, nella stessa rete: LocalSend (Programmi consigliati)",
      "iPhone e Mac: AirDrop; iPhone e Windows: app Foto o iCloud", "Fatene sempre una copia anche sul disco esterno"] },
    { icona: "🖨️", titolo: "Aggiungere una stampante di rete", passi: ["Collegate la stampante al Wi-Fi dal suo pannello o dall'app del produttore", "Windows: Impostazioni → Bluetooth e dispositivi → Stampanti → Aggiungi",
      "Mac: Impostazioni → Stampanti → «+» (AirPrint, spesso senza driver)", "Linux: Impostazioni → Stampanti → Aggiungi (IPP Everywhere, spesso senza driver)"] }
  ];

  function cardAzione(a) {
    return '<div class="scheda azione-card"><div class="riga"><span class="em">' + a.icona + "</span><h3>" + esc(a.titolo) + "</h3></div><p>" + esc(a.descrizione) + "</p>" +
      '<div class="riga">' + (a.admin ? '<span class="etichetta">🔐 amministratore</span>' : "") + (a.riavvio ? '<span class="etichetta">🔄 riavvio</span>' : "") +
      '<span class="etichetta ' + (a.rischio === "nessuno" ? "ok" : a.rischio === "basso" ? "neon" : "att") + '">rischio ' + esc(a.rischio) + "</span></div>" +
      '<div class="riga" style="margin-top:.6rem"><button class="btn primario" data-az="' + a.id + '">▶ Avvia</button><button class="btn piccolo" data-vedi="' + esc(a.file) + '">📄 Vedi lo script</button></div></div>';
  }

  function vediScript(sistema, nome) {
    var p = CD.server ? CD.api("/api/script?sistema=" + sistema + "&nome=" + encodeURIComponent(nome)) : Promise.reject(new Error("Serve il programma installato"));
    p.then(function (j) {
      CD.modale({ titolo: "📄 " + esc(nome) + " · " + CD.nomeSistema(sistema),
        html: '<p class="piccolo-testo">' + (sistema === "windows" ? "Uso: salvatelo, poi tasto destro → «Esegui con PowerShell» (come amministratore se richiesto)." :
          "Uso: salvatelo, poi in un terminale: <code>bash " + esc(nome) + "</code> (con <code>sudo</code> se servono i permessi).") + '</p><pre class="codice">' + esc(j.testo) + "</pre>",
        pulsanti: [{ testo: "📋 Copia", valore: "copia" }, { testo: "💾 Salva", valore: "salva" }, { testo: "🖨️ Stampa", valore: "stampa" }, { testo: "Chiudi", valore: null, classe: "primario" }] })
        .then(function (v) {
          if (v === "copia") CD.copiaTesto(j.testo);
          if (v === "salva") CD.scarica(nome, sistema === "windows" ? "﻿" + j.testo.replace(/\r?\n/g, "\r\n") : j.testo);
          if (v === "stampa") CD.stampa("Script " + nome + " (" + CD.nomeSistema(sistema) + ")", '<pre class="f-registro">' + esc(j.testo) + "</pre>");
        });
    }, function (e) { CD.avviso(esc(e.message), "att"); });
  }

  CD.registra("ottimizza", {
    titolo: "Ottimizza",
    mostra: function (el, parti) {
      var tab = parti[0] || "automatico";
      el.innerHTML = CD.titolo("🚀", "Ottimizza", "Più veloce, più pulito, più sicuro: con un clic o con gli script pronti all'uso per Windows, Linux e macOS") +
        '<div class="schede-tab" role="tablist">' + [["automatico", "🤖 Automatico"], ["script", "📜 Script pronti"], ["esperti", "🧰 Strumenti esperti"], ["soluzioni", "🩹 Consigli e soluzioni"], ["guide", "📘 Come fare"]].map(function (t) {
          return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + '</div><div id="ott-corpo"></div>';
      CD.$$("[data-tab]", el).forEach(function (b) { b.onclick = function () { CD.vai("#/ottimizza/" + b.getAttribute("data-tab")); }; });
      var c = CD.$("#ott-corpo", el), f = CD.sistema();
      function lega() {
        CD.$$("[data-az]", c).forEach(function (b) { b.onclick = function () { CD.esegui(b.getAttribute("data-az")).catch(function () {}); }; });
        CD.$$("[data-vedi]", c).forEach(function (b) { b.onclick = function () { vediScript(b.getAttribute("data-sis") || f, b.getAttribute("data-vedi")); }; });
      }
      if (tab === "automatico") {
        var ids = ["ottimizza", "pulizia", "privacy", "pc_vecchio", "punto_ripristino", "ora_sincronizza"];
        var lista = ids.map(function (i) { return CD.azioni[i]; }).filter(Boolean);
        c.innerHTML = (CD.server ? '<div class="avviso">💡 Ordine consigliato: <b>punto di ripristino</b> → <b>ottimizzazione completa</b> → <b>più privacy</b>. Per i PC con poca RAM o disco meccanico anche <b>modalità PC vecchio</b>.</div>' :
          '<div class="avviso att">I pulsanti funzionano con il programma installato. Gli script si possono comunque leggere e salvare nella scheda «Script pronti».</div>') +
          '<div class="griglia-2">' + lista.map(cardAzione).join("") + "</div>";
        lega();
      } else if (tab === "script") {
        var sis = parti[1] || (f === "altro" ? "windows" : f);
        c.innerHTML = '<div class="opzioni">' + [["windows", "🪟 Windows"], ["linux", "🐧 Linux"], ["mac", "🍎 macOS"]].map(function (s) {
          return '<a class="btn' + (s[0] === sis ? " primario" : "") + '" href="#/ottimizza/script/' + s[0] + '">' + s[1] + "</a>"; }).join("") + "</div>" +
          '<p class="piccolo-testo">Gli stessi script usati dai pulsanti, con le funzioni comuni già incluse: pronti da salvare su una chiavetta e usare su altri computer. Ognuno scrive cosa fa, passo per passo.</p><div id="ott-script"></div>';
        var box = CD.$("#ott-script", c);
        if (!CD.server) { box.innerHTML = '<div class="avviso att">Per scaricare gli script serve il programma installato.</div>'; return; }
        CD.api("/api/azioni?sistema=" + sis).then(function (j) {
          box.innerHTML = '<table class="tab"><thead><tr><th>Script</th><th>Cosa fa</th><th></th></tr></thead><tbody>' + j.azioni.map(function (a) {
            return "<tr><td><b>" + a.icona + " " + esc(a.titolo) + "</b><br><code>" + esc(a.file) + "</code>" + (a.admin ? ' <span class="etichetta">🔐</span>' : "") + "</td><td>" + esc(a.descrizione) + "</td>" +
              '<td><button class="btn piccolo" data-sis="' + sis + '" data-vedi="' + esc(a.file) + '">📄 Apri</button></td></tr>'; }).join("") + "</tbody></table>";
          lega();
        });
      } else if (tab === "esperti") {
        var esp = ["winutil", "linutil", "homebrew", "licenza_windows"].map(function (i) { return CD.azioni[i]; }).filter(Boolean);
        c.innerHTML = '<div class="avviso att">⚠️ Strumenti potenti per chi ha un po\' di esperienza. Create sempre prima un punto di ripristino.</div><div class="griglia-2">' + esp.map(cardAzione).join("") + "</div>" +
          '<div class="scheda"><h2>📚 Fonti ufficiali e strumenti di fiducia</h2><ul class="lista-semplice">' +
          '<li><a href="https://christitus.com/windows-tool/" target="_blank" rel="noopener">Chris Titus Tech – WinUtil</a> e <a href="https://christitus.com/linux/" target="_blank" rel="noopener">LinUtil</a>: installazioni, ottimizzazioni e riparazioni (comandi ufficiali: <code>irm "https://christitus.com/win" | iex</code> e <code>curl -fsSL https://christitus.com/linux | sh</code>)</li>' +
          '<li><a href="https://learn.microsoft.com/it-it/windows/powertoys/" target="_blank" rel="noopener">Microsoft PowerToys</a>, <a href="https://learn.microsoft.com/it-it/sysinternals/" target="_blank" rel="noopener">Sysinternals</a> (Autoruns, Process Explorer)</li>' +
          '<li><a href="https://fwupd.org/" target="_blank" rel="noopener">fwupd / LVFS</a> per il firmware su Linux, <a href="https://brew.sh/it/" target="_blank" rel="noopener">Homebrew</a> su Mac</li>' +
          '<li><a href="https://www.ventoy.net/" target="_blank" rel="noopener">Ventoy</a> e <a href="https://rufus.ie/it/" target="_blank" rel="noopener">Rufus</a> per le chiavette avviabili</li></ul></div>';
        lega();
      } else if (tab === "soluzioni") {
        c.innerHTML = CD.PROBLEMI.map(function (p) {
          var az = (p.azioni || []).filter(function (i) { return CD.azioni[i]; });
          return '<details class="scheda problema"><summary><span class="em">' + p.icona + "</span> <b>" + esc(p.titolo) + "</b></summary><ol class=\"lista-semplice\">" +
            p.passi.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>" +
            (az.length ? '<div class="riga">' + az.map(function (i) { return '<button class="btn piccolo primario" data-az="' + i + '">' + CD.azioni[i].icona + " " + esc(CD.azioni[i].titolo) + "</button>"; }).join("") + "</div>" : "") +
            '<button class="btn piccolo" data-chiedi="' + esc(p.titolo) + '">🧠 Chiedi a Neura</button></details>';
        }).join("");
        lega();
        CD.$$("[data-chiedi]", c).forEach(function (b) { b.onclick = function () { CD.neura.chiedi(b.getAttribute("data-chiedi") + ": come posso risolvere?"); }; });
      } else {
        c.innerHTML = '<div class="griglia-2">' + GUIDE.map(function (g) {
          return '<div class="scheda"><h3>' + g.icona + " " + esc(g.titolo) + '</h3><ol class="lista-semplice">' + g.passi.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>"; }).join("") + "</div>";
      }
    }
  });
})();
