/* ==========================================================================
 *  CONSULENTE DIGITALE - Cosa comprare, e quando
 *  Procedura guidata: dispositivo → per chi → usi → budget e preferenze → scheda con requisiti minimi
 *  e ideali, trappole da evitare, momento migliore (calcolato sul giorno e sull'ora esatti, con il
 *  conto alla rovescia), ricerca dell'offerta del momento sui comparatori, controllo di un annuncio.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var Q = CD.acquisti = {};
  var S = null;       // scelte in corso
  var timerRovescia = null;

  /* ------------------------------------------------------------------ calendario delle occasioni */
  Q.calendario = function (disp, da) {
    var ora = da || CD.adesso(), anno = ora.getFullYear(), lista = [];
    (CD.ACQ.eventi || []).forEach(function (e) {
      if (e.per !== "tutti" && (!disp || e.per.indexOf(disp) < 0)) return;
      [anno - 1, anno, anno + 1].forEach(function (a) {
        var d = e.date(a);
        if (d[1] >= ora) lista.push({ ev: e, inizio: d[0], fine: d[1], picco: d[2] || d[0], inCorso: d[0] <= ora && ora <= d[1] });
      });
    });
    lista.sort(function (a, b) { return a.inizio - b.inizio; });
    var visto = {};
    return lista.filter(function (x) { if (visto[x.ev.id]) return false; visto[x.ev.id] = 1; return true; });
  };
  function giorni(ms) { return Math.ceil(ms / 864e5); }
  function quandoTesto(d) { return CD.GIORNI[d.getDay()] + " " + d.getDate() + " " + CD.MESI[d.getMonth()] + (d.getFullYear() !== CD.adesso().getFullYear() ? " " + d.getFullYear() : "") + (d.getHours() ? " alle " + CD.oraTesto(d) : " dalla mezzanotte"); }
  Q.consiglioMomento = function (disp) {
    var ora = CD.adesso(), cal = Q.calendario(disp, ora);
    var inCorso = cal.filter(function (x) { return x.inCorso && x.ev.forza >= 2; });
    var prossimi = cal.filter(function (x) { return !x.inCorso; });
    var forte = CD.uno(prossimi, function (x) { return x.ev.forza >= 2; });
    if (inCorso.length) return { tipo: "ora", ev: inCorso[0], prossimo: forte, testo: "È il momento giusto: è in corso «" + inCorso[0].ev.nome + "» fino a " + quandoTesto(inCorso[0].fine) + ". Confrontate comunque lo storico del prezzo." };
    if (forte && forte.inizio - ora < 21 * 864e5) return { tipo: "aspetta", ev: forte, testo: "Se potete, aspettate: tra " + giorni(forte.inizio - ora) + " giorni inizia «" + forte.ev.nome + "» (" + quandoTesto(forte.inizio) + "). " + forte.ev.nota };
    var x = prossimi[0];
    return { tipo: "libero", ev: forte || x, testo: "Nelle prossime tre settimane non ci sono grandi occasioni: se vi serve, potete comprare ora scegliendo un prezzo vicino al minimo dello storico." +
      (forte ? " La prossima grande occasione è «" + forte.ev.nome + "» tra " + giorni(forte.inizio - ora) + " giorni (" + quandoTesto(forte.inizio) + ")." : "") };
  };
  Q.testoMomento = function (disp) {
    var c = Q.consiglioMomento(disp), d = CD.adesso();
    return "Oggi è " + CD.dataEstesa(d) + ", ore " + CD.oraTesto(d) + (disp ? " e parliamo di " + CD.ACQ.dispositivi[disp].nome.toLowerCase() : "") + ". " + c.testo;
  };
  Q.prossimoEvento = function () {
    var c = Q.calendario("")[0];
    if (!c) return "";
    return c.inCorso ? "Intanto è in corso «" + c.ev.nome + "»." : "Prossima occasione per gli acquisti: «" + c.ev.nome + "» tra " + giorni(c.inizio - CD.adesso()) + " giorni.";
  };
  function rovescia(fino) {
    var s = Math.max(0, Math.floor((fino - CD.adesso()) / 1000)), g = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
    function z(n) { return (n < 10 ? "0" : "") + n; }
    return '<span class="rov"><b>' + g + "</b><small>giorni</small></span><span class=\"rov\"><b>" + z(h) + "</b><small>ore</small></span><span class=\"rov\"><b>" + z(m) + "</b><small>min</small></span><span class=\"rov\"><b>" + z(sec) + "</b><small>sec</small></span>";
  }
  Q.htmlCalendario = function (disp, quanti) {
    var cal = Q.calendario(disp).slice(0, quanti || 6), c = Q.consiglioMomento(disp), ora = CD.adesso();
    var obiettivo = c.tipo === "ora" ? c.ev.fine : c.ev ? c.ev.inizio : null;
    return '<div class="momento momento-' + c.tipo + '"><div class="momento-testa"><span class="em">' + (c.tipo === "ora" ? "🟢" : c.tipo === "aspetta" ? "⏳" : "🛒") + '</span><div><b>' +
      (c.tipo === "ora" ? "Comprate adesso" : c.tipo === "aspetta" ? "Conviene aspettare" : "Potete comprare quando vi serve") + "</b><p>" + esc(c.testo) + "</p></div></div>" +
      (obiettivo ? '<div class="rovescia" data-fino="' + obiettivo.getTime() + '" aria-label="Conto alla rovescia">' + rovescia(obiettivo) + '</div><p class="piccolo-testo">' + (c.tipo === "ora" ? "alla fine di «" : "all'inizio di «") + esc(c.ev.ev.nome) + "» · ora " + (CD.oraSync ? "ufficiale (" + esc(CD.oraSync.fonte) + ")" : "del computer") + "</p>" : "") + "</div>" +
      '<ol class="calendario">' + cal.map(function (x) {
        return '<li class="' + (x.inCorso ? "in-corso" : "") + '"><span class="em">' + x.ev.icona + "</span><div><b>" + esc(x.ev.nome) + "</b>" + new Array(x.ev.forza + 1).join("★") +
          "<br><small>" + (x.inCorso ? "in corso, fino a " + quandoTesto(x.fine) : "tra " + giorni(x.inizio - ora) + " giorni · " + quandoTesto(x.inizio)) + "</small><br><small>" + esc(x.ev.nota) + "</small></div></li>";
      }).join("") + "</ol>";
  };
  function avviaRovesce() {
    clearInterval(timerRovescia);
    timerRovescia = setInterval(function () {
      var r = CD.$$(".rovescia[data-fino]");
      if (!r.length) { clearInterval(timerRovescia); return; }
      r.forEach(function (el) { el.innerHTML = rovescia(new Date(+el.getAttribute("data-fino"))); });
    }, 1000);
  }
  Q.avviaRovesce = avviaRovesce;

  /* ------------------------------------------------------------------ requisiti */
  function livelloUsi() {
    var l = 1;
    S.usi.forEach(function (u) { var x = CD.ACQ.usi[u]; if (x && x.livello > l) l = x.livello; });
    if (S.usi.length >= 4 && l < 3) l++;
    return l;
  }
  function fasciaTesto(disp, f) {
    var r = CD.ACQ.dispositivi[disp].fasce[f];
    if (!r) return "nessun limite";
    return f === "top" ? "oltre " + r[0] + " €" : r[0] + "-" + r[1] + " €";
  }
  function risultato() {
    var D = CD.ACQ.dispositivi[S.disp], fam = D.famiglia, chi = S.chi, r = { min: [], ideale: [], evitare: (CD.ACQ.trappoleComuni[fam] || []).slice(), consigli: (CD.ACQ.consigli[fam] || []).slice(), serie: [], query: D.cerca, note: [] };
    var anziano = chi === "anziano", studente = chi === "studente", gruppo = /ditta|azienda|scuola|centro|ente/.test(chi);
    if (fam === "pc") {
      var l = livelloUsi(), L = CD.ACQ.livelliPC[l];
      if (gruppo && l < 2) { l = 2; L = CD.ACQ.livelliPC[2]; }
      r.livello = L.nome;
      r.min = ["Processore: " + L.cpu, "RAM: " + L.ram + " GB", "Disco: SSD da " + L.disco + " GB (NVMe)", "Grafica: " + L.video, "Schermo: " + L.schermo];
      r.ideale = ["RAM: " + L.ramIdeale + " GB", "SSD: " + (L.discoIdeale >= 1000 ? L.discoIdeale / 1000 + " TB" : L.discoIdeale + " GB"), "Wi-Fi 6 o 6E, Bluetooth 5", "Porte: USB-C, USB-A, HDMI", "Garanzia di almeno 2 anni (meglio 3 per il lavoro)"];
      r.query += " " + L.ram + "GB " + (L.disco >= 1000 ? "1TB" : L.disco + "GB") + " SSD";
      if (S.disp === "portatile") {
        r.ideale.push(anziano ? "Schermo da 15,6-16 pollici, tastiera con tastierino numerico" : studente ? "Peso sotto 1,5 kg, batteria da almeno 50 Wh (8+ ore)" : "Schermo 14-16 pollici, peso sotto 1,8 kg");
        if (S.usi.indexOf("giochi") >= 0 || S.usi.indexOf("video") >= 0) r.ideale.push("Raffreddamento efficace e schermo 120-165 Hz");
      }
      if (S.disp === "minipc") { r.ideale.push("Attacco VESA per fissarlo dietro al monitor", "Consumo 10-25 W", "Due uscite video se servono due schermi"); r.query = "mini pc " + L.ram + "GB"; }
      if (S.disp === "fisso") r.ideale.push("Alimentatore di marca 80 Plus", "Spazio per aggiungere dischi e RAM");
      if (S.sistema === "mac") { r.serie = ["MacBook Air (chip Apple M, 16 GB)", "MacBook Pro per video e IA", "Mac mini (fisso compatto)", "iMac (tutto in uno)"]; r.query = S.disp === "fisso" || S.disp === "minipc" ? "Mac mini" : "MacBook Air"; r.note.push("I Mac hanno RAM e disco non espandibili: scegliete subito quanto vi serve. Ottimi i ricondizionati ufficiali Apple con garanzia.");
      } else if (S.sistema === "linux") { r.serie = ["Lenovo ThinkPad / ThinkCentre", "Dell Latitude / XPS / OptiPlex", "Framework (riparabile)", "TUXEDO o Slimbook (Linux preinstallato)"]; r.note.push("Scegliete modelli con buona compatibilità Linux: Wi-Fi Intel e grafica Intel/AMD sono le più semplici.");
      } else if (S.sistema === "chrome") { r.serie = ["Chromebook con almeno 8 GB e 128 GB"]; r.query = "chromebook"; r.note.push("I Chromebook ricevono aggiornamenti per 10 anni dall'uscita: controllate la data di «scadenza aggiornamenti».");
      } else { r.serie = S.disp === "portatile" ? (gruppo ? ["Lenovo ThinkPad", "Dell Latitude", "HP ProBook / EliteBook"] : ["Lenovo IdeaPad / Yoga", "ASUS Vivobook / Zenbook", "HP Pavilion / OmniBook", "Acer Swift / Aspire"]) : S.disp === "minipc" ? ["Intel NUC e compatibili (ASUS, Geekom, Beelink)", "Lenovo ThinkCentre Tiny", "Dell OptiPlex Micro", "HP Elite Mini"] : ["Lenovo ThinkCentre / Legion", "HP Elite / Omen", "Dell OptiPlex", "PC assemblato da un negozio di fiducia"]; }
      if (S.usi.indexOf("ia") >= 0) r.note.push("Per l'intelligenza artificiale sul computer contano la memoria della scheda video (VRAM) o la memoria unificata dei Mac: 12-16 GB per modelli medi, 24 GB o più per quelli grandi.");
    } else if (fam === "telefono") {
      var f = S.fascia;
      r.min = ["Aggiornamenti di sicurezza garantiti per almeno 5 anni", "RAM 6 GB, memoria 128 GB", "Batteria 4500-5000 mAh", "NFC per i pagamenti e la CIE", "Schermo OLED o LCD luminoso (almeno 6,1\")"];
      r.ideale = ["8 GB di RAM e 256 GB", "Resistenza all'acqua IP67/IP68", "Fotocamera con stabilizzatore ottico (OIS)", "Ricarica rapida e wireless", "eSIM"];
      if (anziano) r.ideale.unshift("Schermo grande (6,5\" o più), modalità semplificata, tasto SOS e audio forte");
      r.serie = S.sistema === "ios" ? ["iPhone della generazione attuale o precedente (dura 6-7 anni)"] : f === "economico" ? ["Samsung Galaxy A (serie A1x-A3x)", "Motorola moto g", "Xiaomi Redmi Note"] : f === "medio" ? ["Samsung Galaxy A5x", "Google Pixel serie «a»", "Motorola edge", "Nothing Phone"] : ["Google Pixel", "Samsung Galaxy S", "iPhone"];
      r.query = S.sistema === "ios" ? "iPhone" : "smartphone 128GB NFC";
    } else if (fam === "tablet") {
      r.min = ["Schermo 10-11 pollici", "Memoria 128 GB", "Aggiornamenti garantiti per diversi anni", "Wi-Fi 6"];
      r.ideale = [S.usi.indexOf("disegno") >= 0 ? "Penna con sensibilità alla pressione (Apple Pencil, S Pen)" : "Custodia con supporto", studente ? "Tastiera agganciabile" : "Schermo luminoso e audio stereo", "Versione con SIM solo se lo usate fuori casa"];
      if (anziano) r.ideale.unshift("iPad o Galaxy Tab: app semplici, lettura con testo grande, videochiamate con i nipoti");
      r.serie = S.sistema === "ios" ? ["iPad (base)", "iPad Air", "iPad Pro per disegno professionale"] : ["Samsung Galaxy Tab A / S FE", "Lenovo Tab", "Xiaomi Pad"];
      r.query = S.sistema === "ios" ? "iPad" : "tablet android 128GB";
    } else if (fam === "tv") {
      var pollici = Math.round(S.distanza * 100 * 0.6 / 2.54 / 5) * 5 + 5;
      r.min = ["Dimensione consigliata per " + S.distanza + " m: circa " + Math.max(32, pollici - 10) + "-" + Math.max(40, pollici) + " pollici", "4K (UHD) con HDR10", "Decoder DVB-T2 HEVC Main10 e DVB-S2 (satellite/tivùsat)", "Smart TV con le app che usate (RaiPlay, Netflix, DAZN…)"];
      r.ideale = [S.luminosa ? "Stanza luminosa: Mini-LED o QLED con almeno 600 nit" : "Stanza buia: OLED per neri perfetti", "Dolby Vision e Dolby Atmos", S.usi.indexOf("giochi") >= 0 ? "2 porte HDMI 2.1, 120 Hz, VRR e ALLM per console" : "100/120 Hz per lo sport", "Soundbar per dialoghi più chiari"];
      if (anziano) r.ideale.unshift("Telecomando semplice con tasti grandi e sottotitoli facili da attivare");
      r.serie = ["LG (OLED/QNED, webOS)", "Samsung (Neo QLED/OLED, Tizen)", "Sony (Google TV)", "TCL/Hisense (Mini-LED, ottimo prezzo)", "Philips (Ambilight)"];
      r.query = "smart tv " + Math.max(40, pollici) + " pollici 4K";
    } else if (fam === "monitor") {
      var lav = S.usi.indexOf("lavoro") >= 0, gio = S.usi.indexOf("giochi") >= 0;
      r.min = ["Pannello IPS (o OLED)", "24\" Full HD, 27\" 2K o 32\" 4K", "Piede regolabile in altezza", "Filtro luce blu e niente sfarfallio (flicker-free)"];
      r.ideale = [lav ? "USB-C con ricarica del portatile (Power Delivery 65 W o più) e hub USB" : "Altoparlanti integrati se non avete casse", gio ? "144-180 Hz, 1 ms, FreeSync/G-Sync" : "100 Hz per uno scorrimento più morbido", "Copertura 100% sRGB per le foto"];
      r.query = lav ? "monitor 27 usb-c" : gio ? "monitor 27 144hz" : "monitor 27 ips";
      r.serie = ["Dell (UltraSharp/serie S)", "LG", "ASUS ProArt/TUF", "Philips", "BenQ (per occhi e foto)"];
    } else if (fam === "stampante") {
      var molte = S.stampe >= 200, colore = S.usi.indexOf("colore") >= 0;
      r.min = [colore ? "Serbatoi ricaricabili (EcoTank, MegaTank, InkBenefit, Ink Tank)" : "Laser in bianco e nero se stampate poco a colori", "Wi-Fi e stampa dal telefono", "Fronte-retro automatico"];
      r.ideale = ["Multifunzione con scanner" + (gruppo || molte ? " e alimentatore automatico (ADF)" : ""), "Costo per pagina basso (controllate i ricambi)", "Driver per Windows, macOS e Linux (o compatibile AirPrint/IPP Everywhere)"];
      r.serie = colore ? ["Epson EcoTank", "Canon MegaTank", "HP Smart Tank", "Brother InkBenefit"] : ["Brother laser mono", "HP LaserJet", "Canon i-SENSYS"];
      r.query = colore ? "stampante ecotank multifunzione" : "stampante laser wifi fronte retro";
    } else if (fam === "ereader") {
      r.min = ["Schermo e-ink 6-7 pollici, 300 ppi", "Luce frontale regolabile (calda per la sera)", "Lettura di ePub e PDF"];
      r.ideale = ["Resistente all'acqua", "Tasti fisici per girare pagina (comodi per le mani che tremano)", "Prestiti delle biblioteche (MLOL) — Kobo e PocketBook"];
      r.serie = ["Kobo (Clara, Libra)", "PocketBook", "Kindle (store Amazon)"];
      r.query = "ebook reader 7 pollici";
    }
    if (S.ricondizionato) { r.note.push("Ricondizionato: scegliete grado A/«eccellente», batteria verificata, garanzia di almeno 12 mesi e venditore con Partita IVA."); r.query += " ricondizionato"; }
    if (gruppo) r.consigli = r.consigli.concat(CD.ACQ.perGruppi);
    if (S.sostenibile) r.note.push("Scelta sostenibile: privilegiate prodotti riparabili (ricambi e manuali disponibili), ricondizionati e marchi con aggiornamenti lunghi.");
    var budget = D.fasce[S.fascia];
    if (fam === "pc" && budget && S.fascia === "economico" && livelloUsi() >= 3) r.note.unshift("⚠️ Per gli usi scelti il budget economico è stretto: valutate un ricondizionato di fascia superiore o alzate un po' il budget.");
    r.prezzo = fasciaTesto(S.disp, S.fascia);
    return r;
  }

  /* ------------------------------------------------------------------ controllo di un annuncio */
  Q.valutaAnnuncio = function (testo) {
    var t = " " + String(testo || "").toLowerCase().replace(/,/g, ".") + " ", s = [], ok = [], dati = {};
    var ram = t.match(/(\d{1,3})\s*gb\s*(di\s*)?(ram|ddr\d?|lpddr\d?x?|memoria ram)/) || t.match(/ram[^0-9]{0,12}(\d{1,3})\s*gb/);
    if (ram) dati.ram = +ram[1];
    var disco = t.match(/(\d{2,4}|\d(\.\d)?)\s*(gb|tb)\s*(di\s*)?(ssd|nvme|emmc|hdd|ufs|pcie)/);
    if (disco) { dati.disco = +disco[1] * (disco[3] === "tb" ? 1000 : 1); dati.tipoDisco = disco[5]; }
    var cpu = t.match(/(core\s*(i[3579]|ultra\s*[579]|[357])[- ]?\d{3,5}[a-z]{0,2}|ryzen\s*(ai\s*)?[3579]\s*(pro\s*)?\d{3,4}[a-z]{0,2}|celeron\s*n?\d{4}|pentium\s*\w+\s*n?\d{4}|\bn\d{3}\b|apple\s*m[1-5]\s*(pro|max)?|\bm[1-5]\s*(pro|max)?\s*chip|snapdragon\s*x\s*\w*|athlon\s*\w+\s*\d{4})/);
    if (cpu) dati.cpu = cpu[0].trim();
    var prezzo = t.match(/(\d{2,5}(\.\d{2})?)\s*(€|euro)/) || t.match(/€\s*(\d{2,5})/);
    if (prezzo) dati.prezzo = +prezzo[1];
    var pol = t.match(/(\d{2}(\.\d)?)\s*("|''|pollici|inch)/);
    if (pol) dati.pollici = +pol[1];
    if (/emmc/.test(t)) s.push("Memoria eMMC: lenta e piccola, da evitare per un computer.");
    if (dati.ram && dati.ram < 8) s.push("Solo " + dati.ram + " GB di RAM: troppo pochi nel 2026."); else if (dati.ram >= 16) ok.push(dati.ram + " GB di RAM: ottimo.");
    else if (dati.ram) ok.push(dati.ram + " GB di RAM: sufficienti per l'uso base.");
    if (dati.tipoDisco === "hdd") s.push("Disco meccanico (HDD): il computer sarà lento.");
    if (dati.disco && dati.disco < 256 && dati.tipoDisco !== "hdd") s.push("Disco da " + dati.disco + " GB: si riempie presto.");
    else if (dati.disco >= 512) ok.push("Disco da " + (dati.disco >= 1000 ? dati.disco / 1000 + " TB" : dati.disco + " GB") + ".");
    if (dati.cpu) {
      var c = dati.cpu;
      if (/celeron|pentium|athlon|n4\d{3}|n5\d{3}|n3\d{3}/.test(c)) s.push("Processore " + c + ": di fascia molto bassa.");
      else if (/i[3579][- ]?([2-7])\d{3}\b/.test(c)) s.push("Processore " + c + ": di diverse generazioni fa (non compatibile con Windows 11).");
      else ok.push("Processore " + c + ": riconosciuto.");
    }
    if (/1366\s*x\s*768|\bhd ready\b/.test(t)) s.push("Schermo 1366×768: poco nitido.");
    if (/\btn\b/.test(t)) s.push("Pannello TN: colori e angoli di visione scarsi.");
    if (/ricondizionat|refurbish/.test(t)) { if (/grado\s*c|grade\s*c|discreto|usura visibile/.test(t)) s.push("Ricondizionato di grado C: segni evidenti, controllate bene."); else ok.push("Ricondizionato: verificate garanzia (almeno 12 mesi) e batteria."); }
    if (/bonifico|ricarica postepay|western union|moneygram|amazon gift|buono regalo/.test(t)) s.push("Pagamento con bonifico, ricarica o buoni regalo: tipico delle truffe tra privati.");
    if (/spedizione dalla cina|import|versione globale|global version/.test(t)) s.push("Prodotto d'importazione: garanzia e assistenza in Italia potrebbero mancare.");
    if (/-\s*[6-9]\d\s*%/.test(t)) s.push("Sconto molto alto: controllate lo storico del prezzo, potrebbe essere gonfiato.");
    var voto = Math.max(1, Math.min(10, 7 + ok.length * 0.5 - s.length * 1.5));
    return { dati: dati, segnali: s, punti: ok, voto: Math.round(voto * 2) / 2 };
  };

  /* ------------------------------------------------------------------ pagina */
  function link(n, q) { return n.url + encodeURIComponent(q); }
  function passi(el) {
    var D = S.disp ? CD.ACQ.dispositivi[S.disp] : null;
    var corpo = "";
    if (!S.disp) {
      corpo = '<h2>1. Cosa volete comprare?</h2><div class="griglia-schede">' + Object.keys(CD.ACQ.dispositivi).map(function (k) {
        var d = CD.ACQ.dispositivi[k]; return '<button class="tessera" data-disp="' + k + '"><span class="em">' + d.icona + "</span><b>" + esc(d.nome) + "</b><small>" + esc(d.desc) + "</small></button>"; }).join("") + "</div>";
    } else if (S.passo === 2) {
      var chi = [["persona", "🙂 Per me"], ["anziano", "👵 Persona anziana"], ["studente", "🎒 Studente"], ["famiglia", "👨‍👩‍👧 Famiglia"], ["creativo", "🎨 Creativo / gamer"],
        ["professionista", "💼 Lavoro"], ["ditta", "🏪 Ditta"], ["azienda", "🏢 Azienda"], ["scuola", "🏫 Scuola"], ["centro", "🤝 Centro / associazione"], ["ente", "🏛️ Ente"]];
      corpo = "<h2>2. Per chi è " + esc(D.nome.toLowerCase()) + '?</h2><div class="opzioni grandi">' + chi.map(function (c) { return '<button class="opzione' + (S.chi === c[0] ? " on" : "") + '" data-chi="' + c[0] + '">' + c[1] + "</button>"; }).join("") + "</div>" +
        '<div class="campo" style="max-width:16rem;margin-top:1rem"><label for="acq-quanti">Quanti pezzi?</label><input type="number" id="acq-quanti" min="1" max="5000" value="' + S.quanti + '"></div>';
    } else if (S.passo === 3) {
      var usi = Object.keys(CD.ACQ.usi).filter(function (u) { return CD.ACQ.usi[u].per.indexOf(D.famiglia) >= 0; });
      corpo = '<h2>3. Per cosa lo userete?</h2><p>Scegliete tutto quello che serve.</p><div class="opzioni grandi">' + usi.map(function (u) {
        var x = CD.ACQ.usi[u]; return '<label class="opzione"><input type="checkbox" data-uso="' + u + '"' + (S.usi.indexOf(u) >= 0 ? " checked" : "") + "> " + x.icona + " " + esc(x.nome) + "</label>"; }).join("") + "</div>";
      if (D.famiglia === "tv") corpo += '<div class="campo"><label for="acq-dist">Distanza tra divano e TV: <b id="acq-dist-v">' + S.distanza + ' m</b></label><input type="range" id="acq-dist" min="1" max="5" step="0.25" value="' + S.distanza + '"></div>' +
        '<label class="opzione"><input type="checkbox" id="acq-lum"' + (S.luminosa ? " checked" : "") + "> ☀️ La stanza è molto luminosa di giorno</label>";
      if (D.famiglia === "stampante") corpo += '<div class="campo"><label for="acq-stampe">Pagine al mese circa: <b id="acq-stampe-v">' + S.stampe + '</b></label><input type="range" id="acq-stampe" min="10" max="2000" step="10" value="' + S.stampe + '"></div>';
    } else if (S.passo === 4) {
      var sis = D.famiglia === "pc" ? [["", "Indifferente"], ["windows", "🪟 Windows"], ["mac", "🍎 Mac"], ["linux", "🐧 Linux"], ["chrome", "🌐 Chromebook"]] :
        D.famiglia === "telefono" || D.famiglia === "tablet" ? [["", "Indifferente"], ["android", "🤖 Android"], ["ios", "🍎 Apple"]] : [];
      corpo = "<h2>4. Quanto volete spendere?</h2><div class=\"opzioni grandi\">" + ["economico", "medio", "alto", "top"].map(function (f) {
        return '<button class="opzione' + (S.fascia === f ? " on" : "") + '" data-fascia="' + f + '">' + { economico: "💶 Economico", medio: "💶💶 Medio", alto: "💶💶💶 Alto", top: "💎 Il meglio" }[f] + "<br><small>" + fasciaTesto(S.disp, f) + "</small></button>"; }).join("") +
        '</div><p class="piccolo-testo">Fasce indicative (' + CD.ACQ.aggiornato + "): i prezzi cambiano, li verifichiamo insieme alla fine.</p>" +
        (sis.length ? '<h3>Sistema preferito</h3><div class="opzioni">' + sis.map(function (x) { return '<button class="opzione' + (S.sistema === x[0] ? " on" : "") + '" data-sis="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>" : "") +
        '<h3>Preferenze</h3><div class="opzioni"><label class="opzione"><input type="checkbox" id="acq-ric"' + (S.ricondizionato ? " checked" : "") + "> ♻️ Va bene anche ricondizionato</label>" +
        '<label class="opzione"><input type="checkbox" id="acq-sos"' + (S.sostenibile ? " checked" : "") + "> 🌱 Conta la sostenibilità</label></div>";
    }
    el.innerHTML = '<div class="scheda luce acq-passi">' + (S.disp ? '<div class="avanzamento">' + [1, 2, 3, 4].map(function (i) { return '<span class="' + (S.passo >= i ? "fatto" : "") + '">' + i + "</span>"; }).join("") + "</div>" : "") + corpo +
      (S.disp ? '<div class="riga" style="margin-top:1.2rem"><button class="btn" id="acq-indietro">← Indietro</button><span class="spazio"></span><button class="btn primario grande" id="acq-avanti">' + (S.passo === 4 ? "Mostra il consiglio ✨" : "Avanti →") + "</button></div>" : "") + "</div>";
    CD.$$("[data-disp]", el).forEach(function (b) { b.onclick = function () { S.disp = b.getAttribute("data-disp"); S.passo = 2; passi(el); }; });
    CD.$$("[data-chi]", el).forEach(function (b) { b.onclick = function () {
      S.chi = b.getAttribute("data-chi");
      if (!/ditta|azienda|scuola|centro|ente|famiglia/.test(S.chi)) S.quanti = 1;
      else if (S.quanti < 2) S.quanti = CD.profilo && CD.profilo.quanti > 1 ? CD.profilo.quanti : 5;
      passi(el); }; });
    CD.$$("[data-fascia]", el).forEach(function (b) { b.onclick = function () { S.fascia = b.getAttribute("data-fascia"); passi(el); }; });
    CD.$$("[data-sis]", el).forEach(function (b) { b.onclick = function () { S.sistema = b.getAttribute("data-sis"); passi(el); }; });
    var leggi = function () {
      var q = CD.$("#acq-quanti", el); if (q) S.quanti = Math.max(1, +q.value || 1);
      if (S.passo === 3) S.usi = CD.$$("[data-uso]", el).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute("data-uso"); });
      var d = CD.$("#acq-dist", el); if (d) S.distanza = +d.value;
      var l = CD.$("#acq-lum", el); if (l) S.luminosa = l.checked;
      var st = CD.$("#acq-stampe", el); if (st) S.stampe = +st.value;
      var ri = CD.$("#acq-ric", el); if (ri) S.ricondizionato = ri.checked;
      var so = CD.$("#acq-sos", el); if (so) S.sostenibile = so.checked;
    };
    var dist = CD.$("#acq-dist", el); if (dist) dist.oninput = function () { CD.$("#acq-dist-v", el).textContent = this.value + " m"; };
    var stp = CD.$("#acq-stampe", el); if (stp) stp.oninput = function () { CD.$("#acq-stampe-v", el).textContent = this.value; };
    var ind = CD.$("#acq-indietro", el); if (ind) ind.onclick = function () { leggi(); if (S.passo <= 2) { S.disp = ""; S.passo = 1; } else S.passo--; passi(el); };
    var av = CD.$("#acq-avanti", el); if (av) av.onclick = function () {
      leggi();
      if (S.passo === 3 && !S.usi.length) { CD.avviso("Scegliete almeno un uso 🙂", "att"); return; }
      if (S.passo < 4) { S.passo++; passi(el); return; }
      CD.salva("acquisti", S);
      mostraRisultato(el);
    };
  }

  function mostraRisultato(el) {
    var D = CD.ACQ.dispositivi[S.disp], r = risultato(), q = r.query;
    CD.cervello.stato("felice");
    var negozi = CD.ACQ.negozi.filter(function (n) { return !n.ricondizionato || S.ricondizionato; });
    el.innerHTML = '<div class="scheda luce"><div class="riga"><span class="em grande-em">' + D.icona + "</span><div><h2>" + esc(D.nome) + (r.livello ? " · " + esc(r.livello) : "") + "</h2>" +
      "<p>Per: <b>" + esc((CD.TIPI[S.chi] || {}).nome || "") + "</b>" + (S.quanti > 1 ? " · " + S.quanti + " pezzi" : "") + " · usi: " + S.usi.map(function (u) { return CD.ACQ.usi[u].icona + " " + esc(CD.ACQ.usi[u].nome); }).join(", ") +
      " · budget: <b>" + esc(r.prezzo) + "</b>" + (S.quanti > 1 && CD.ACQ.dispositivi[S.disp].fasce[S.fascia] ? " (totale circa " + (CD.ACQ.dispositivi[S.disp].fasce[S.fascia][0] * S.quanti).toLocaleString("it-IT") + "-" + (CD.ACQ.dispositivi[S.disp].fasce[S.fascia][1] * S.quanti).toLocaleString("it-IT") + " €)" : "") + "</p></div>" +
      '<span class="spazio"></span><button class="btn" id="acq-ricomincia">🔁 Ricomincia</button><button class="btn primario" id="acq-stampa">🖨️ Stampa la scheda</button></div></div>' +
      '<div class="griglia-2"><div class="scheda"><h2>✅ Requisiti minimi</h2><ul class="lista-semplice">' + r.min.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      '<h3>⭐ Ideale</h3><ul class="lista-semplice">' + r.ideale.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      (r.serie.length ? '<h3>🔎 Serie da considerare</h3><p>' + r.serie.map(esc).join(" · ") + '</p><p class="piccolo-testo">Esempi di famiglie di prodotti affidabili: i modelli cambiano ogni anno, controllate le caratteristiche qui sopra.</p>' : "") +
      r.note.map(function (n) { return '<div class="avviso">' + esc(n) + "</div>"; }).join("") + "</div>" +
      '<div class="scheda"><h2>📅 Quando comprare</h2>' + Q.htmlCalendario(S.disp, 5) + "</div></div>" +
      '<div class="griglia-2"><div class="scheda"><h2>🚫 Da evitare</h2><ul class="lista-semplice">' + r.evitare.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      '<h3>💡 Consigli</h3><ul class="lista-semplice">' + r.consigli.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" +
      '<div class="scheda"><h2>🛍️ Le offerte di questo momento</h2><p>Cerco per voi <b>' + esc(q) + '</b> sui siti di confronto (si aprono nel browser).</p><div class="campo"><input id="acq-q" value="' + esc(q) + '"></div><div class="negozi">' +
      negozi.map(function (n) { return '<a class="btn" data-neg="' + n.id + '" href="' + link(n, q) + '" target="_blank" rel="noopener"><b>' + esc(n.nome) + "</b><small>" + esc(n.desc) + "</small></a>"; }).join("") + "</div>" +
      (CD.online ? "" : '<div class="avviso att">Siete offline: i link funzionano quando torna la connessione.</div>') +
      '<h3>🛡️ Comprare sicuri</h3><ul class="lista-semplice">' + CD.ACQ.sicurezzaAcquisto.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></div>" +
      '<div class="scheda"><h2>🧐 Avete trovato un\'offerta? Fatela controllare a Neura</h2><p>Incollate qui il testo dell\'annuncio (titolo, caratteristiche, prezzo).</p>' +
      '<textarea id="acq-annuncio" placeholder="Es.: Notebook 15,6&quot; Intel Core i5-1335U, 16GB RAM, SSD 512GB, 549 €"></textarea><div class="riga"><button class="btn primario" id="acq-valuta">🧐 Controlla l\'offerta</button>' +
      (CD.neura.ia.attivo ? '<button class="btn" id="acq-chiedi">🧠 Chiedi un parere a Neura</button>' : "") + '</div><div id="acq-esito"></div></div>';
    avviaRovesce();
    CD.parla("Ecco il mio consiglio. " + Q.consiglioMomento(S.disp).testo);
    CD.$("#acq-q", el).oninput = function () { var v = this.value; CD.$$("[data-neg]", el).forEach(function (a) { a.href = link(CD.uno(CD.ACQ.negozi, function (n) { return n.id === a.getAttribute("data-neg"); }), v); }); };
    CD.$("#acq-ricomincia", el).onclick = function () { S.disp = ""; S.passo = 1; S.usi = []; passi(el); };
    CD.$("#acq-stampa", el).onclick = function () { stampaScheda(r, D); };
    CD.$("#acq-valuta", el).onclick = function () {
      var v = Q.valutaAnnuncio(CD.$("#acq-annuncio", el).value), d = v.dati;
      CD.$("#acq-esito", el).innerHTML = '<div class="riga" style="margin-top:.8rem">' + CD.metro(v.voto, 10, "Voto dell'offerta") + '<div style="flex:1"><p>Ho letto: ' +
        [d.cpu ? "processore " + esc(d.cpu) : "", d.ram ? d.ram + " GB RAM" : "", d.disco ? d.disco + " GB " + esc(d.tipoDisco || "") : "", d.pollici ? d.pollici + " pollici" : "", d.prezzo ? d.prezzo + " €" : ""].filter(Boolean).join(" · ") + "</p>" +
        v.segnali.map(function (x) { return '<div class="avviso att">⚠️ ' + esc(x) + "</div>"; }).join("") + v.punti.map(function (x) { return '<div class="avviso ok">✔ ' + esc(x) + "</div>"; }).join("") +
        (d.prezzo && CD.ACQ.dispositivi[S.disp].fasce[S.fascia] ? '<p class="piccolo-testo">Il vostro budget: ' + esc(r.prezzo) + ". " + (d.prezzo > CD.ACQ.dispositivi[S.disp].fasce[S.fascia][1] ? "Questa offerta è sopra il budget." : "Dentro il budget.") + "</p>" : "") + "</div></div>";
      CD.parla(v.segnali.length ? "Attenzione: " + v.segnali.join(" ") : "Sembra un'offerta sensata. Controllate comunque lo storico del prezzo.");
    };
    var ch = CD.$("#acq-chiedi", el);
    if (ch) ch.onclick = function () { var t = CD.$("#acq-annuncio", el).value.trim(); if (t) CD.neura.chiedi("Valuta questa offerta per " + D.nome.toLowerCase() + " (usi: " + S.usi.join(", ") + ", budget " + r.prezzo + "): " + t); };
  }

  function stampaScheda(r, D) {
    var c = Q.consiglioMomento(S.disp);
    CD.stampa("Scheda d'acquisto: " + D.nome,
      "<p><b>Per:</b> " + esc((CD.TIPI[S.chi] || {}).nome || "") + (S.quanti > 1 ? " · " + S.quanti + " pezzi" : "") + " · <b>Usi:</b> " + S.usi.map(function (u) { return esc(CD.ACQ.usi[u].nome); }).join(", ") +
      " · <b>Budget:</b> " + esc(r.prezzo) + (S.sistema ? " · <b>Sistema:</b> " + esc(S.sistema) : "") + (S.ricondizionato ? " · anche ricondizionato" : "") + "</p>" +
      '<div class="f-due"><div><h2>Requisiti minimi</h2><ul>' + r.min.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div><div><h2>Ideale</h2><ul>" + r.ideale.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div></div>" +
      (r.serie.length ? "<h2>Serie da considerare</h2><p>" + r.serie.map(esc).join(" · ") + "</p>" : "") + r.note.map(function (n) { return "<p>• " + esc(n) + "</p>"; }).join("") +
      "<h2>Da evitare</h2><ul>" + r.evitare.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      "<h2>Quando comprare</h2><p>" + esc(c.testo) + "</p><ul>" + Q.calendario(S.disp).slice(0, 5).map(function (x) { return "<li>" + esc(x.ev.nome) + ": " + esc(x.inCorso ? "in corso" : quandoTesto(x.inizio)) + "</li>"; }).join("") + "</ul>" +
      "<h2>Dove confrontare i prezzi</h2><p>Cercate «" + esc(r.query) + "» su: " + CD.ACQ.negozi.map(function (n) { return esc(n.nome); }).join(", ") + ".</p>" +
      "<h2>Comprare sicuri</h2><ul>" + CD.ACQ.sicurezzaAcquisto.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      '<table class="f-tab f-confronto"><tr><th>Modello trovato</th><th>Negozio</th><th>Prezzo</th><th>Garanzia</th><th>Note</th></tr><tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr><tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr><tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr></table>',
      { codice: CD.codiceScheda(), piede: "Fasce di prezzo indicative aggiornate a " + CD.ACQ.aggiornato + "." });
  }

  CD.registra("acquisti", {
    titolo: "Cosa comprare",
    mostra: function (el, parti) {
      el.innerHTML = CD.titolo("🛒", "Cosa comprare, e quando", "Vi faccio 4 domande, vi preparo la scheda e vi dico il momento migliore, con il giorno e l'ora esatti") +
        '<div id="acq-passi"></div><div class="scheda"><h2>📅 Calendario delle occasioni</h2><div id="acq-cal">' + Q.htmlCalendario("", 8) + "</div></div>";
      var prof = CD.profilo ? CD.profilo.tipo : "persona";
      S = { disp: "", passo: 1, chi: prof === "creativo" ? "creativo" : prof, quanti: CD.profilo && CD.profilo.quanti > 1 ? CD.profilo.quanti : 1, usi: [], fascia: "medio", sistema: "",
        ricondizionato: /centro|scuola|ditta|ente/.test(prof), sostenibile: true, distanza: 2.5, luminosa: false, stampe: 100 };
      if (parti[0] && CD.ACQ.dispositivi[parti[0]]) { S.disp = parti[0]; S.passo = 2; }
      passi(CD.$("#acq-passi", el));
      avviaRovesce();
    },
    esci: function () { clearInterval(timerRovescia); }
  });
})();
