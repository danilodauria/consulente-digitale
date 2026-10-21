/* ==========================================================================
 *  CONSULENTE DIGITALE - Licenze, autore, piè di pagina delle stampe, «Sostieni il progetto»
 *  Il CODICE è MIT; i CONTENUTI (guide, schede, spiegazioni, consigli, storia, testi, immagini,
 *  grafica, il personaggio «Neura» e il marchio della fenice) sono di Danilo D'Auria con licenza
 *  Creative Commons BY-NC-SA 4.0, come il Professore Digitale e «Il Grande Quiz dell'Informatica».
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var L = CD.LICENZA = {
    autore: "Danilo D'Auria", anno: 2026, codice: "MIT", contenuti: "CC BY-NC-SA 4.0",
    nome: "Creative Commons Attribuzione – Non commerciale – Condividi allo stesso modo 4.0 Internazionale",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it",
    legale: "https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.it",
    sito: "https://danilodauria.github.io/consulente-digitale/",
    professore: "https://danilodauria.github.io/professore-digitale/",
    fenice: "https://danilodauria.github.io/feniceos/",
    contatto: "danilodauria.site@gmail.com"
  };
  L.citazione = "«Consulente Digitale» di Danilo D'Auria — un progetto FeniceOS — licenza CC BY-NC-SA 4.0 — " + L.sito;
  function anni() { var a = new Date().getFullYear(); return a > L.anno ? L.anno + "–" + a : String(L.anno); }
  CD.licenzaBreve = function () { return "© " + anni() + " Danilo D'Auria · contenuti CC BY-NC-SA 4.0 · codice MIT"; };
  CD.ccBadge = function () {
    return '<svg class="cc-badge" viewBox="0 0 88 31" width="88" height="31" role="img" aria-label="Creative Commons BY-NC-SA 4.0">' +
      '<rect width="88" height="31" rx="4" fill="#abb1aa"/><rect x="1" y="1" width="86" height="29" rx="3" fill="#000"/>' +
      '<circle cx="15.5" cy="15.5" r="11.5" fill="#fff"/><text x="15.5" y="20" font-family="Arial, sans-serif" font-weight="700" font-size="11" text-anchor="middle" fill="#000">cc</text>' +
      '<text x="56" y="13" font-family="Arial, sans-serif" font-weight="700" font-size="8.5" text-anchor="middle" fill="#fff">BY · NC · SA</text>' +
      '<text x="56" y="24" font-family="Arial, sans-serif" font-size="7.5" text-anchor="middle" fill="#abb1aa">4.0 Internazionale</text></svg>';
  };
  /* piè di pagina comune a TUTTE le stampe */
  CD.piedeStampa = function (extra) {
    return '<footer class="f-piede">Stampato dal <b>Consulente Digitale</b> · ideato e sviluppato da Danilo D\'Auria · un progetto FeniceOS. ' +
      "Contenuti © " + anni() + " Danilo D'Auria, licenza Creative Commons CC BY-NC-SA 4.0 (citare l'autore, niente usi commerciali, " +
      "stessa licenza per le modifiche) · codice MIT. Le indicazioni sono consigli generali: verificate sempre prezzi, compatibilità e garanzie." +
      (extra ? " " + extra : "") + "</footer>";
  };

  CD.registra("licenza", {
    titolo: "Licenza e autore",
    mostra: function (el) {
      el.innerHTML = CD.titolo("📜", "Licenza e autore", "Chi ha creato il Consulente Digitale e come potete usarlo") +
        '<div class="griglia-2"><div class="scheda luce"><h2>👤 L\'autore</h2>' +
        '<p>Il <b>Consulente Digitale</b> è ideato e sviluppato da <b>Danilo D\'Auria</b>, ideatore e sviluppatore di <b>FeniceOS</b>, ' +
        'autore del <b>Professore Digitale</b> e del libro <b>«Tecnologia Gentile: Informatica Sostenibile»</b>.</p>' +
        '<p>Nasce dalla stessa idea del Professore Digitale: la tecnologia deve essere <b>gentile</b> — semplice per tutti, rispettosa della privacy, ' +
        "capace di dare una seconda vita ai computer invece di buttarli.</p>" +
        '<div class="riga"><a class="btn" href="' + L.professore + '" target="_blank" rel="noopener">🎓 Professore Digitale</a>' +
        '<a class="btn" href="' + L.fenice + '" target="_blank" rel="noopener">🔥 FeniceOS</a>' +
        '<a class="btn" href="mailto:' + L.contatto + '">✉️ Scrivi all\'autore</a></div></div>' +
        '<div class="scheda"><h2>⚖️ La licenza</h2><div class="riga" style="align-items:flex-start">' + CD.ccBadge() +
        "<p style=\"flex:1\">Guide, schede, spiegazioni, consigli, la storia dei computer, i testi, le immagini, la grafica e il personaggio di <b>Neura</b> sono opera di " +
        "<b>Danilo D'Auria</b>, con licenza <a href=\"" + L.url + '" target="_blank" rel="license noopener">' + esc(L.nome) + "</a>.</p></div>" +
        '<ul class="lista-semplice"><li><b>👤 Attribuzione</b> — citate sempre l\'autore, il titolo e la licenza.</li>' +
        "<li><b>🚫💶 Non commerciale</b> — non si possono usare per guadagnarci (vendita, corsi a pagamento, pubblicità).</li>" +
        "<li><b>🔁 Condividi allo stesso modo</b> — le versioni modificate vanno condivise con la stessa licenza.</li></ul>" +
        "<p>Il <b>codice</b> (server, pagine, script per Windows, Linux e macOS) è software libero con licenza <b>MIT</b>.</p>" +
        "<p><b>Come citarlo:</b></p><p class=\"citazione\">" + esc(L.citazione) + "</p>" +
        '<div class="riga"><button class="btn" id="lic-copia">📋 Copia la citazione</button><a class="btn" href="' + L.legale + '" target="_blank" rel="noopener">Testo legale</a></div></div></div>' +
        '<div class="scheda"><h2>🧩 Strumenti di altri autori</h2><p>Il Consulente Digitale usa, quando li installate voi, strumenti che restano dei loro autori e con la loro licenza: ' +
        "Ollama e i modelli di intelligenza artificiale (licenze dei rispettivi autori), Chris Titus Tech WinUtil e LinUtil (MIT, christitus.com), Homebrew (BSD), winget (Microsoft, MIT), " +
        "Flatpak e Flathub, fwupd/LVFS, Vosk e faster-whisper, Piper. I programmi consigliati si scaricano sempre dalle loro fonti ufficiali.</p>" +
        "<p><b>Salvadati, Antivirus e Kit di emergenza</b>: PhotoRec e TestDisk (CGSecurity, Christophe Grenier, GPL), SystemRescue (system-rescue.org, GPL), " +
        "ClamAV (Cisco Talos, GPL), Microsoft Defender, Defender Offline e MRT (Microsoft, inclusi in Windows), e2fsprogs, ntfs-3g, efibootmgr, GRUB, smartmontools (GPL). " +
        "Nome e logo di Salvadati, idea, icone, grafica, testi e script di Neura Soccorso: Danilo D'Auria.</p>" +
        "<p class=\"piccolo-testo\">I marchi citati (Windows, macOS, Linux e gli altri) appartengono ai rispettivi proprietari e sono usati solo per descrivere la compatibilità.</p></div>";
      CD.$("#lic-copia", el).onclick = function () { CD.copiaTesto(L.citazione); };
    }
  });

  CD.registra("sostieni", {
    titolo: "Sostieni il progetto",
    mostra: function (el) {
      var S = window.CD_SOSTIENI || {};
      el.innerHTML = CD.titolo("❤️", "Sostieni il progetto", "Il Consulente Digitale è gratuito. Se vi è utile, potete aiutarlo a crescere.") +
        '<div class="griglia-2"><div class="scheda luce"><h2>💙 PayPal</h2><p>Un contributo libero, anche piccolo, in un minuto.</p>' +
        '<div class="qr">' + (S.qrPaypal || "") + '</div><div class="riga"><a class="btn primario" href="' + esc(S.paypal) + '" target="_blank" rel="noopener">Apri PayPal</a>' +
        '<button class="btn" data-copia="' + esc(S.paypal) + '">📋 Copia il link</button></div></div>' +
        '<div class="scheda"><h2>🏦 Bonifico</h2><p>Intestatario: <b>' + esc(S.intestatario) + "</b> (" + esc(S.conto) + ")<br>IBAN: <code>" + esc(S.iban) + "</code><br>Causale: <i>" + esc(S.causale) + "</i></p>" +
        '<div class="qr">' + (S.qrIban || "") + '</div><p class="piccolo-testo">Inquadrate il codice con l\'app della banca: il bonifico si compila da solo.</p>' +
        '<div class="riga"><button class="btn" data-copia="' + esc(S.iban) + '">📋 Copia l\'IBAN</button></div></div></div>' +
        '<div class="scheda"><h2>🛠️ Servizi</h2><p>Per installazioni, ottimizzazioni, rigenerazione di computer, corsi in centri anziani, scuole e associazioni ' +
        'scrivete a <a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a>.</p>" +
        '<p>Un altro modo di sostenere il progetto: <b>parlatene</b>, condividete il programma e il libro «Tecnologia Gentile».</p></div>';
      CD.$$("[data-copia]", el).forEach(function (b) { b.onclick = function () { CD.copiaTesto(b.getAttribute("data-copia")); }; });
    }
  });
})();
