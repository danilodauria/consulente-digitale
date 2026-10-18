/* ==========================================================================
 *  CONSULENTE DIGITALE - Scarica gli aggiornamenti del programma
 *  Come nel Professore Digitale: il controllo parte SOLO quando lo chiedete. Legge il manifesto pubblicato
 *  su danilodauria.github.io, mostra le novità, scarica il pacchetto per il vostro sistema, ne verifica
 *  l'impronta SHA-256 e lo installa. I vostri dati restano dove sono.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var NOMI = { windows: "installatore per Windows", linux: "pacchetto .deb per Linux", mac: "app per macOS", portatile: "versione portatile (zip)", sorgenti: "codice sorgente (git)" };
  var giro = null;

  CD.registra("programma", {
    titolo: "Aggiornamenti del programma",
    mostra: function (el) {
      el.innerHTML = CD.titolo("🔄", "Aggiornamenti del Consulente Digitale", "Scaricate la nuova versione dal sito ufficiale, verificata con l'impronta SHA-256") + '<div id="pg-corpo"></div>';
      var c = CD.$("#pg-corpo", el);
      if (!CD.server) { c.innerHTML = '<div class="avviso">Le nuove versioni si scaricano dal sito: <a href="' + esc(CD.LICENZA ? CD.LICENZA.sito : "https://danilodauria.github.io/consulente-digitale/") + '" target="_blank" rel="noopener">danilodauria.github.io/consulente-digitale ↗</a></div>'; return; }
      CD.api("/api/programma").then(function (p) {
        c.innerHTML = '<div class="griglia-2"><div class="scheda luce"><h3>Questa installazione</h3><p>Versione <b>' + esc(p.versione) + "</b> · " + esc(NOMI[p.tipo] || p.tipo) + "</p>" +
          '<p class="piccolo-testo">Il programma si collega a Internet solo quando premete il pulsante, e solo al sito ufficiale del progetto.</p>' +
          '<div class="riga"><button class="btn primario grande" id="pg-controlla">🔎 Controlla aggiornamenti</button></div></div>' +
          '<div class="scheda" id="pg-esito"><h3>Nuova versione</h3><p class="vuoto">Premete «Controlla aggiornamenti».</p></div></div><div id="pg-lavoro"></div>' +
          '<details class="scheda"><summary><b>Come funziona e cosa resta al sicuro</b></summary><ul><li>Il manifesto <code>aggiornamenti.json</code> e i pacchetti stanno su GitHub Pages di Danilo D\'Auria.</li>' +
          "<li>Ogni file scaricato viene controllato con l'impronta <b>SHA-256</b> pubblicata: se non corrisponde, viene scartato.</li><li>Windows: si apre l'installatore, il programma si chiude e alla fine si riapre. Linux: chiede la password e aggiorna il pacchetto. Mac: si apre il Finder sul file.</li>" +
          "<li>Impostazioni, schede, diagnosi e interviste di Nonni Teach sono in una cartella separata e restano intatte.</li></ul></details>";
        CD.$("#pg-controlla", c).onclick = function () { controlla(c, p); };
        if (p.stato && p.stato.fase !== "pronto") segui(c);
      }, function (e) { c.innerHTML = '<div class="avviso male">' + esc(e.message) + "</div>"; });
    },
    esci: function () { clearTimeout(giro); }
  });

  function controlla(c, p) {
    var box = CD.$("#pg-esito", c);
    box.innerHTML = '<h3>Nuova versione</h3><div class="barra-progresso indeterminata"><i></i></div>';
    CD.cervello.stato("pensiero");
    CD.api("/api/programma/controlla", {}).then(function (r) {
      CD.cervello.stato(r.nuova ? "felice" : "riposo");
      box.innerHTML = "<h3>" + (r.nuova ? "✨ È disponibile la versione " + esc(r.disponibile) : "✔ Siete aggiornati") + "</h3>" +
        "<p>Sul sito: versione <b>" + esc(r.disponibile) + "</b>" + (r.data ? " del " + esc(r.data) : "") + ". Installata: " + esc(r.attuale) + ".</p>" +
        (r.novita.length ? "<b>Novità</b><ul>" + r.novita.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>" : "") +
        (r.nuova && r.pacchetto ? '<div class="riga"><button class="btn primario" id="pg-scarica">⬇️ Scarica e installa</button><small>' + esc(r.pacchetto.nome || "") + (r.pacchetto.byte ? " · " + CD.arrotonda(r.pacchetto.byte / 1048576, 1) + " MB" : "") + "</small></div>" : "") +
        (r.vademecum ? '<p><a href="' + esc(r.vademecum.url) + '" target="_blank" rel="noopener">📘 Vademecum aggiornato (PDF) ↗</a></p>' : "");
      var b = CD.$("#pg-scarica", box);
      if (b) b.onclick = function () {
        b.disabled = true;
        CD.api("/api/programma/scarica", {}).then(function () { segui(c); }, function (e) { b.disabled = false; CD.avviso(esc(e.message), "male", 7000); });
      };
      if (CD.neura && CD.neura.dici && r.nuova) CD.neura.dici("È uscita la versione " + r.disponibile + " del Consulente Digitale. Posso scaricarla e installarla quando volete.");
    }, function (e) { CD.cervello.stato("errore"); box.innerHTML = '<h3>Nuova versione</h3><div class="avviso att">' + esc(e.message) + ". Controllate la connessione a Internet.</div>"; });
  }

  function segui(c) {
    var box = CD.$("#pg-lavoro", c);
    clearTimeout(giro);
    CD.api("/api/programma").then(function (p) {
      var s = p.stato;
      if (!box.isConnected) return;
      box.innerHTML = '<div class="scheda"><h3>' + ({ scarico: "⬇️ Scaricamento in corso", scaricato: "✔ Scaricato e verificato", installo: "⚙️ Installazione", installato: "✅ Fatto", errore: "⚠️ Problema" }[s.fase] || "") + "</h3>" +
        '<div class="barra-progresso"><i style="width:' + (s.percento || 0) + '%"></i></div>' + (s.errore ? '<div class="avviso male">' + esc(s.errore) + "</div>" : "") +
        '<div class="console">' + s.registro.map(esc).join("\n") + "</div>" + (s.fase === "scaricato" ? '<div class="riga"><button class="btn primario grande" id="pg-installa">🛠️ Installa ora la versione ' + esc(s.versione) + "</button></div>" : "") + "</div>";
      var b = CD.$("#pg-installa", box);
      if (b) b.onclick = function () {
        CD.conferma("Installare l'aggiornamento?", p.tipo === "windows" ? "<p>Si apre l'installatore; il Consulente Digitale si chiude e potrete riaprirlo dall'ultima schermata. I vostri dati restano intatti.</p>" :
          p.tipo === "linux" ? "<p>Vi verrà chiesta la password del computer. Alla fine chiudete e riaprite il programma.</p>" : "<p>Vi mostro il file scaricato: apritelo e sostituite la versione precedente.</p>", "🛠️ Installa").then(function (ok) {
          if (ok) CD.api("/api/programma/installa", {}).then(function () { segui(c); }, function (e) { CD.avviso(esc(e.message), "male"); });
        });
      };
      if (s.fase === "scarico" || s.fase === "installo") giro = setTimeout(function () { segui(c); }, 800);
    }, function () { if (box.isConnected) box.innerHTML = '<div class="avviso">Il programma si è chiuso per completare l\'installazione. Riapritelo quando l\'installatore ha finito.</div>'; });
  }
})();
