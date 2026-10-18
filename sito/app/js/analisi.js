/* ==========================================================================
 *  CONSULENTE DIGITALE - Analisi del computer, sistema operativo consigliato, migliorie, scheda stampabile
 *  I dati arrivano dal server (cd_sistema.py: solo informazioni locali). Qui si calcolano i punteggi,
 *  la compatibilità con Windows 11, la classifica dei sistemi operativi adatti a QUEL computer e a QUEL
 *  profilo, le migliorie hardware convenienti e la scheda professionale da stampare.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var A = CD.analisi = { ultima: null };
  var inCorso = null;

  A.dati = function (forza) {
    if (!CD.server) return Promise.reject(new Error("Serve il programma installato su questo computer"));
    if (A.ultima && !forza) return Promise.resolve(A.ultima);
    if (inCorso) return inCorso;
    inCorso = CD.api("/api/sistema" + (forza ? "?nuovo=1" : "")).then(function (r) { A.ultima = r; inCorso = null; return r; }, function (e) { inCorso = null; throw e; });
    return inCorso;
  };

  /* ------------------------------------------------------------------ punteggi */
  function ramGB(r) { return (r.memoria && r.memoria.totale_mb || 0) / 1024; }
  function discoPrincipale(r) {
    var d = (r.dischi || []).filter(function (x) { return x.tipo !== "USB"; });
    d.sort(function (a, b) { var o = { NVMe: 0, SSD: 1, HDD: 2 }; return (o[a.tipo] == null ? 3 : o[a.tipo]) - (o[b.tipo] == null ? 3 : o[b.tipo]); });
    return d[0] || { tipo: "?", gb: 0, nome: "" };
  }
  function gpuInfo(r) {
    var g = (r.gpu || []).map(function (x) { return x.nome || ""; }).join(" | ");
    var dedicata = /rtx|gtx|radeon rx|rx \d{3,4}|arc a\d|quadro|radeon pro/i.test(g);
    var moderna = dedicata || /iris xe|arc|radeon (680|780|880|890|760)m|radeon graphics|apple|m[1-5]|uhd graphics 7|adreno/i.test(g) || (r.cpu && r.cpu.stima && r.cpu.stima.marca === "apple");
    return { nome: g || "integrata", dedicata: dedicata, moderna: moderna, nvidia: /nvidia|geforce|rtx|gtx/i.test(g) };
  }
  A.punteggi = function (r) {
    var s = (r.cpu && r.cpu.stima) || {}, anno = s.anno || 0, core = (r.cpu && r.cpu.core) || 1, cpu;
    if (s.marca === "apple") cpu = 8.5 + (s.fascia === "top" ? 1 : 0) + Math.min(0.5, (s.generazione - 1) * 0.15);
    else if (anno) cpu = anno >= 2023 ? 9 : anno >= 2021 ? 8 : anno >= 2019 ? 7 : anno >= 2017 ? 6 : anno >= 2015 ? 4.5 : anno >= 2012 ? 3.5 : anno >= 2010 ? 2.5 : 1.5;
    else cpu = core >= 12 ? 8 : core >= 8 ? 7 : core >= 4 ? 5 : core >= 2 ? 3 : 1.5;
    if (s.fascia === "top") cpu += 1; else if (s.fascia === "alta") cpu += 0.5; else if (s.fascia === "base" && s.marca !== "apple") cpu -= 1;
    if (core >= 8) cpu += 0.5; if (core <= 2) cpu -= 1;
    var g = ramGB(r), ram = g < 1.8 ? 1 : g < 3.6 ? 2.5 : g < 7.5 ? 4.5 : g < 15 ? 7 : g < 30 ? 9 : 10;
    var d = discoPrincipale(r), disco = { NVMe: 10, SSD: 8, HDD: 3 }[d.tipo] || 5;
    var sp = (r.spazio || [])[0];
    if (sp && sp.totale_gb && sp.libero_gb / sp.totale_gb < 0.1) disco -= 2;
    var gi = gpuInfo(r), gpu = gi.dedicata ? (/rtx (40|50)|rx (7|9)\d{3}|arc b/i.test(gi.nome) ? 9.5 : 8) : gi.moderna ? 6 : 3;
    var b = (r.batteria || [])[0], batt = b && b.salute ? Math.round(b.salute / 10) : null;
    function lim(x) { return Math.max(0.5, Math.min(10, Math.round(x * 2) / 2)); }
    var p = { cpu: lim(cpu), ram: lim(ram), disco: lim(disco), gpu: lim(gpu), batteria: batt };
    p.totale = lim(p.cpu * 0.35 + p.ram * 0.25 + p.disco * 0.25 + p.gpu * 0.15);
    p.eta = anno ? Math.max(0, CD.adesso().getFullYear() - anno) : null;
    return p;
  };

  /* ------------------------------------------------------------------ Windows 11 */
  A.win11 = function (r) {
    var s = (r.cpu && r.cpu.stima) || {}, man = [], dubbi = [];
    var a64 = !r.cpu || !r.cpu.flag || !r.cpu.flag.length || r.cpu.flag.indexOf("lm") >= 0 || /64/.test((r.sistema || {}).architettura || "");
    if (!a64) man.push("processore a 64 bit");
    var cpuOk = (s.marca === "intel" && s.generazione >= 8) || (s.marca === "amd" && s.generazione >= 2) || s.marca === "qualcomm";
    if (s.marca === "apple") return { ok: false, mac: true, mancano: ["Windows 11 sui Mac con chip Apple solo in macchina virtuale (Parallels)"] };
    if (!cpuOk) man.push("processore della lista supportata (Intel 8ª generazione o AMD Ryzen 2000 e successivi)");
    if (ramGB(r) < 3.8) man.push("almeno 4 GB di RAM");
    var tpm = String((r.firmware || {}).tpm || "");
    if (!/2/.test(tpm)) { if (tpm) dubbi.push("TPM presente ma versione non verificata (controllate nel BIOS: PTT/fTPM)"); else man.push("chip di sicurezza TPM 2.0 (spesso si attiva nel BIOS: «PTT» Intel o «fTPM» AMD)"); }
    if ((r.firmware || {}).uefi === false) man.push("avvio UEFI (il PC parte in modalità BIOS «Legacy»)");
    if ((r.firmware || {}).secure_boot === false) dubbi.push("Secure Boot spento (si accende nel BIOS)");
    var d = discoPrincipale(r); if (d.gb && d.gb < 64) man.push("disco di almeno 64 GB");
    // Se il computer usa GIA' Windows 11 (build 22000 o successiva) e' compatibile per definizione: cio' che sembra
    // mancare e' solo un dato che il programma non e' riuscito a leggere (es. TPM senza permessi di amministratore).
    var si = r.sistema || {}, build = parseInt(String(si.build || "").split(".")[0], 10) || 0;
    if (si.famiglia === "windows" && (build >= 22000 || /windows 11/i.test(si.nome || ""))) {
      return { ok: true, installato: true, mancano: [], dubbi: man.concat(dubbi).map(function (x) { return "non letto con certezza: " + x; }) };
    }
    return { ok: !man.length, mancano: man, dubbi: dubbi };
  };
  /* testo unico per pagina, plancia, stampa e Neura (cosi' non possono piu' contraddirsi) */
  A.win11Testo = function (w, breve) {
    if (w.mac) return w.mancano[0];
    if (w.installato) return breve ? "già installato" : "✔ Questo computer usa già Windows 11: è compatibile.";
    if (w.ok) return breve ? "compatibile" : "✔ Compatibile con Windows 11.";
    return breve ? "non compatibile" : "✖ Non compatibile. Manca: " + w.mancano.join("; ") + ".";
  };

  /* ------------------------------------------------------------------ sistemi operativi consigliati */
  var SO = {
    win11: { nome: "Windows 11", icona: "🪟", link: "https://www.microsoft.com/it-it/software-download/windows11", tipo: "windows" },
    win10esu: { nome: "Windows 10 con aggiornamenti estesi (ESU)", icona: "🪟", link: "https://support.microsoft.com/it-it/windows/windows-10-consumer-extended-security-updates-esu-program", tipo: "windows" },
    macos: { nome: "macOS (l'ultimo supportato)", icona: "🍎", link: "https://support.apple.com/it-it/102662", tipo: "mac" },
    feniceos: { nome: "FeniceOS", icona: "🔥", link: "https://danilodauria.github.io/feniceos/", tipo: "linux" },
    mint: { nome: "Linux Mint (Cinnamon)", icona: "🌿", link: "https://www.linuxmint.com/download.php", tipo: "linux" },
    mintxfce: { nome: "Linux Mint XFCE", icona: "🌿", link: "https://www.linuxmint.com/download.php", tipo: "linux" },
    zorin: { nome: "Zorin OS", icona: "🔷", link: "https://zorin.com/os/download/", tipo: "linux" },
    ubuntu: { nome: "Ubuntu", icona: "🟠", link: "https://ubuntu.com/download/desktop", tipo: "linux" },
    fedora: { nome: "Fedora Workstation", icona: "🎩", link: "https://fedoraproject.org/it/workstation/download", tipo: "linux" },
    lite: { nome: "Linux Lite", icona: "🪶", link: "https://www.linuxliteos.com/download.php", tipo: "linux" },
    mx: { nome: "MX Linux (XFCE)", icona: "✖️", link: "https://mxlinux.org/download-links/", tipo: "linux" },
    antix: { nome: "antiX", icona: "🐜", link: "https://antixlinux.com/download/", tipo: "linux" },
    chromeflex: { nome: "ChromeOS Flex", icona: "🌐", link: "https://chromeenterprise.google/intl/it_it/os/chromeosflex/", tipo: "chrome" },
    bazzite: { nome: "Bazzite (giochi)", icona: "🎮", link: "https://bazzite.gg/", tipo: "linux" },
    popos: { nome: "Pop!_OS", icona: "🚀", link: "https://system76.com/pop/", tipo: "linux" }
  };
  A.SO = SO;
  A.consigliaSistemi = function (r) {
    var g = ramGB(r), s = (r.cpu && r.cpu.stima) || {}, fam = (r.sistema || {}).famiglia, p = A.punteggi(r), w = A.win11(r);
    var tipo = CD.profilo ? CD.profilo.tipo : "persona", d = discoPrincipale(r), gi = gpuInfo(r);
    var a64 = !r.cpu || !r.cpu.flag || !r.cpu.flag.length || r.cpu.flag.indexOf("lm") >= 0;
    var semplice = /anziano|centro|famiglia|persona/.test(tipo), aula = /scuola|centro|ente/.test(tipo), lavoro = /professionista|ditta|azienda|ente/.test(tipo);
    var out = [];
    function add(id, voto, perche, contro) { out.push({ id: id, nome: SO[id].nome, icona: SO[id].icona, link: SO[id].link, voto: Math.max(0, Math.min(10, voto)), perche: perche, contro: contro || [] }); }
    if (s.marca === "apple" || fam === "mac") {
      if (s.marca === "apple") add("macos", 9.5, ["è il sistema pensato per questo Mac", "aggiornamenti per molti anni", "batteria e prestazioni ottimali"], []);
      else {
        var vecchio = (s.anno && s.anno < 2018);
        add("macos", vecchio ? 5 : 8, vecchio ? ["funziona finché riceve aggiornamenti di sicurezza"] : ["sistema originale del Mac", "macOS Tahoe 26 è l'ultimo per i Mac con processore Intel"],
          vecchio ? ["i Mac Intel più vecchi non ricevono più le nuove versioni"] : ["dal 2026 Apple smette di aggiornare i Mac Intel"]);
        add("mint", vecchio ? 8.5 : 6.5, ["dà una seconda vita ai Mac Intel non più aggiornati", "gratuito e aggiornato"], ["alcune componenti (Wi-Fi, webcam) a volte richiedono driver"]);
        add("feniceos", vecchio ? 8 : 6, ["leggerissimo, pensato per hardware rigenerato"], []);
      }
      return out.sort(function (a, b) { return b.voto - a.voto; });
    }
    if (!a64) {
      add("antix", 9, ["funziona sui processori a 32 bit", "leggerissimo (bastano 256 MB di RAM)"], ["aspetto spartano"]);
      add("mx", 6, ["solo le versioni a 32 bit ancora disponibili"], ["poche distribuzioni supportano ancora i 32 bit"]);
      return out.sort(function (a, b) { return b.voto - a.voto; });
    }
    // Windows
    if (w.ok) {
      var v = 8;
      if (g < 7.5) v -= 2; if (d.tipo === "HDD") v -= 1.5; if (p.cpu < 5) v -= 1;
      if (/creativo|professionista|ditta|azienda|ente/.test(tipo)) v += 1;
      if (gi.dedicata && tipo === "creativo") v += 0.5;
      add("win11", v, ["il computer è compatibile", "tutti i programmi e i giochi per Windows", lavoro ? "software gestionali e professionali" : "il sistema più diffuso"],
        (g < 7.5 ? ["con meno di 8 GB di RAM è lento: aggiungete RAM"] : []).concat(d.tipo === "HDD" ? ["con il disco meccanico è lento: passate a un SSD"] : []).concat(["raccoglie dati e mostra pubblicità: usate «Più privacy»"]));
    } else if (fam === "windows") {
      add("win10esu", 4.5, ["nessun cambiamento per ora", "aggiornamenti di sicurezza per i privati fino a ottobre 2027, con l'iscrizione"], ["poi resterà senza protezione", "il PC non è compatibile con Windows 11: " + w.mancano.join(", ")]);
    }
    // Linux e alternative
    var leggero = g < 3.6 || p.cpu < 3.5, medio = g < 7.5 || d.tipo === "HDD";
    add("feniceos", leggero ? 9.5 : aula ? 8.8 : medio ? 8 : 7, ["leggerissimo: nato per i PC rigenerati (RAM sotto i 500 MB)", aula ? "pensato per aule, centri anziani e associazioni" : "veloce anche sui computer vecchi",
      "con il Professore Digitale per imparare", "creato da Danilo D'Auria"], ["progetto giovane: per i programmi molto specifici controllate la compatibilità"]);
    if (g >= 3.6) add("mint", (semplice ? 8.6 : 8) - (leggero ? 2 : 0) + (w.ok ? 0 : 0.6), ["facile per chi viene da Windows", "stabile, sicuro e gratuito", "aggiornamenti per anni"], g < 6 ? ["meglio la versione XFCE con poca RAM"] : []);
    if (g < 6) add("mintxfce", leggero ? 8 : 8.2, ["come Linux Mint, ma più leggero", "ottimo per 2-4 GB di RAM"], []);
    if (g >= 3.6) add("zorin", (semplice ? 8.4 : 7.8) - (leggero ? 2 : 0), ["aspetto simile a Windows o macOS", "molto curato, adatto a chi inizia"], ["la versione Pro è a pagamento (quella Core è gratuita)"]);
    if (leggero) add("lite", 7.8, ["leggero e semplice, menu in stile Windows"], []);
    if (leggero) add("mx", 7.4, ["leggero, veloce e ricco di strumenti"], ["un po' meno intuitivo per i principianti"]);
    if (g >= 3.6 && p.cpu >= 5) add("ubuntu", 7.2 + (tipo === "studente" ? 0.4 : 0), ["moderno, molto diffuso, tanta documentazione"], ["più pesante di Mint"]);
    if (g >= 7.5 && s.anno >= 2017) add("fedora", 7 + (tipo === "professionista" || tipo === "studente" ? 0.6 : 0), ["software sempre recente", "ottimo per chi programma"], ["aggiornamenti di versione ogni 6 mesi"]);
    if (g >= 3.6 && d.gb >= 16) add("chromeflex", semplice && !lavoro ? 7.6 : 5.5, ["semplicissimo: solo browser e app web", "si aggiorna da solo, nessun virus"], ["serve un account Google", "niente programmi tradizionali", "non tutti i modelli sono certificati"]);
    if (tipo === "creativo" && gi.dedicata && g >= 15) add("bazzite", gi.nvidia ? 7.5 : 8, ["pensato per i giochi (come la Steam Deck)", "driver video già pronti"], ["meno adatto all'ufficio"]);
    if (gi.nvidia && g >= 7.5) add("popos", 7, ["driver NVIDIA già inclusi"], []);
    return out.sort(function (a, b) { return b.voto - a.voto; });
  };

  /* ------------------------------------------------------------------ migliorie hardware */
  A.migliorie = function (r) {
    var m = [], g = ramGB(r), d = discoPrincipale(r), p = A.punteggi(r), mem = r.memoria || {};
    if (d.tipo === "HDD") m.push({ icona: "💽", titolo: "Sostituire il disco meccanico con un SSD", impatto: "altissimo", costo: "30-60 €",
      testo: "È la miglioria che cambia di più: avvio in pochi secondi e programmi che si aprono subito. Si può clonare il disco o reinstallare il sistema." });
    if (g < 7.5) m.push({ icona: "🧠", titolo: "Aggiungere RAM (almeno fino a 8 GB, meglio 16)", impatto: g < 3.6 ? "altissimo" : "alto", costo: "20-60 €",
      testo: "Più schede del browser e programmi aperti senza rallentamenti." + (mem.slot && mem.banchi ? " Slot totali: " + mem.slot + ", occupati: " + mem.banchi.length + "." : "") + " Controllate che la RAM non sia saldata." });
    var b = (r.batteria || [])[0];
    if (b && b.salute && b.salute < 75) m.push({ icona: "🔋", titolo: "Sostituire la batteria", impatto: "alto", costo: "30-90 €", testo: "La batteria tiene il " + b.salute + "% della carica originale. Una nuova riporta l'autonomia di quando era nuovo." });
    if (p.eta && p.eta >= 5) m.push({ icona: "🌀", titolo: "Pulizia interna e pasta termica", impatto: "medio", costo: "0-40 €", testo: "Dopo 5 anni la polvere e la pasta termica secca fanno scaldare e rallentare il processore." });
    var sp = (r.spazio || [])[0];
    if (sp && sp.totale_gb && sp.libero_gb / sp.totale_gb < 0.15) m.push({ icona: "🧹", titolo: "Liberare spazio sul disco", impatto: "medio", costo: "gratis", testo: "Restano " + sp.libero_gb + " GB liberi: sotto il 15% il sistema rallenta. Usate «Pulizia sicura»." });
    if (!A.win11(r).ok && (r.sistema || {}).famiglia === "windows") m.push({ icona: "🔁", titolo: "Valutare Linux per una seconda vita", impatto: "alto", costo: "gratis", testo: "Questo PC non è compatibile con Windows 11: con Linux resta aggiornato e sicuro per anni." });
    if (p.totale < 3.5) m.push({ icona: "♻️", titolo: "Valutare un computer nuovo o ricondizionato", impatto: "—", costo: "vedi «Cosa comprare»", testo: "L'hardware è molto datato: le migliorie costerebbero più del beneficio. Un ricondizionato di qualità è una scelta economica e sostenibile." });
    return m;
  };

  /* ------------------------------------------------------------------ testi */
  A.riassuntoBreve = function (r) {
    var d = discoPrincipale(r);
    return (r.sistema || {}).nome + ", " + ((r.computer || {}).produttore || "") + " " + ((r.computer || {}).modello || "") + ", processore " + ((r.cpu || {}).nome || "?") +
      " (" + ((r.cpu || {}).core || "?") + " core), " + CD.arrotonda(ramGB(r), 1) + " GB di RAM, disco " + d.tipo + " " + (d.gb || "?") + " GB, video " + gpuInfo(r).nome +
      (r.portatile ? ", portatile" : ", fisso") + ". Voto complessivo " + A.punteggi(r).totale + "/10";
  };
  A.riassunto = function (r) {
    var p = A.punteggi(r), w = A.win11(r), so = A.consigliaSistemi(r)[0], d = discoPrincipale(r);
    var giudizio = p.totale >= 8 ? "un computer potente" : p.totale >= 6 ? "un buon computer" : p.totale >= 4 ? "un computer discreto, che si può migliorare" : "un computer datato, ma che può rinascere";
    return "Questo è " + giudizio + ": voto **" + p.totale + "/10**" + (p.eta ? " (circa " + p.eta + " anni)" : "") + ".\n" +
      "- Processore: " + esc((r.cpu || {}).nome) + " → " + p.cpu + "/10\n- Memoria: " + CD.arrotonda(ramGB(r), 1) + " GB → " + p.ram + "/10\n- Disco: " + d.tipo + " da " + d.gb + " GB → " + p.disco + "/10\n" +
      ((r.sistema || {}).famiglia !== "mac" ? "- Windows 11: " + A.win11Testo(w, !w.ok ? false : true) + "\n" : "") +
      "Sistema consigliato: **" + so.nome + "**." + (A.migliorie(r)[0] ? " Miglioria più utile: " + A.migliorie(r)[0].titolo.toLowerCase() + "." : "");
  };

  var BOOT = [[/lenovo/i, "F12 (o il piccolo tasto «Novo» con un foro)"], [/hp|hewlett/i, "F9 (oppure Esc e poi F9)"], [/dell/i, "F12"], [/acer/i, "F12 (attivatelo nel BIOS con F2)"],
    [/asus/i, "F8 o Esc"], [/msi|micro-star/i, "F11"], [/toshiba|dynabook/i, "F12"], [/samsung/i, "F10 o Esc"], [/fujitsu/i, "F12"], [/apple/i, "tenete premuto Opzione (⌥) all'accensione"], [/./, "F12, F11, F10, F8 o Esc (dipende dal produttore)"]];
  A.tastoAvvio = function (r) { var p = ((r.computer || {}).produttore || "") + " "; return CD.uno(BOOT, function (b) { return b[0].test(p); })[1]; };

  /* ------------------------------------------------------------------ pagina */
  function righeSpec(r) {
    var d = discoPrincipale(r), sp = r.spazio || [], bt = (r.batteria || [])[0], fw = r.firmware || {}, c = r.computer || {}, s = r.sistema || {};
    var riga = function (k, v) { return v === "" || v == null ? "" : "<tr><th>" + k + "</th><td>" + v + "</td></tr>"; };
    return riga("Computer", esc((c.produttore || "") + " " + (c.modello || "")) + (r.portatile ? " · portatile" : " · fisso")) +
      riga("Sistema operativo", esc(s.nome + (s.versione ? " " + s.versione : "") + (s.build ? " (build " + s.build + ")" : "")) + (s.desktop ? " · desktop " + esc(s.desktop) : "")) +
      riga("Processore", esc((r.cpu || {}).nome) + " · " + ((r.cpu || {}).core || "?") + " thread" + ((r.cpu || {}).fisici ? ", " + r.cpu.fisici + " core" : "") + ((r.cpu || {}).mhz ? " · " + r.cpu.mhz + " MHz" : "") +
        ((r.cpu || {}).stima && r.cpu.stima.anno ? " · circa " + r.cpu.stima.anno : "")) +
      riga("Memoria RAM", CD.arrotonda(ramGB(r), 1) + " GB" + ((r.memoria || {}).banchi && r.memoria.banchi.length ? " (" + r.memoria.banchi.map(function (b) { return b.gb + " GB" + (b.mhz ? " " + b.mhz + " MHz" : ""); }).join(" + ") + (r.memoria.slot ? ", slot: " + r.memoria.slot : "") + ")" : "") +
        ((r.memoria || {}).zram ? " · zram attivo" : "")) +
      riga("Dischi", (r.dischi || []).map(function (x) { return esc(x.tipo + " " + x.gb + " GB " + (x.nome || "")) + (x.salute ? " · " + esc(x.salute) : ""); }).join("<br>")) +
      riga("Spazio libero", sp.map(function (x) { return esc(x.unita) + ": " + x.libero_gb + " GB su " + x.totale_gb + " GB"; }).join(" · ")) +
      riga("Scheda video", (r.gpu || []).map(function (x) { return esc(x.nome) + (x.driver ? " (driver " + esc(x.driver) + ")" : ""); }).join("<br>")) +
      riga("Batteria", bt ? "salute " + (bt.salute ? bt.salute + "%" : "n.d.") + (bt.cicli ? " · " + bt.cicli + " cicli" : "") + " · carica " + bt.carica + "%" : "") +
      riga("Avvio e sicurezza", "UEFI: " + (fw.uefi ? "sì" : fw.uefi === false ? "no (Legacy)" : "?") + " · Secure Boot: " + (fw.secure_boot ? "attivo" : fw.secure_boot === false ? "spento" : "?") + " · TPM: " + esc(fw.tpm || "non rilevato")) +
      riga("BIOS / firmware", esc((c.bios || "") + (c.bios_data ? " del " + c.bios_data : ""))) +
      riga("Acceso da", r.acceso_da_ore ? r.acceso_da_ore + " ore" + (r.acceso_da_ore > 72 ? " (riavviate ogni tanto!)" : "") : "") +
      ((r.problemi_dispositivi || []).length ? riga("Dispositivi con problemi", r.problemi_dispositivi.map(function (x) { return esc(x.nome); }).join("<br>")) : "");
  }
  function htmlSistemi(r) {
    return A.consigliaSistemi(r).slice(0, 6).map(function (o, i) {
      return '<div class="scheda so' + (i === 0 ? " luce primo" : "") + '"><div class="riga"><span class="em">' + o.icona + "</span><h3>" + (i === 0 ? "🏆 " : "") + esc(o.nome) + '</h3><span class="spazio"></span>' +
        '<span class="etichetta ' + (o.voto >= 8 ? "ok" : o.voto >= 6 ? "neon" : "att") + '">' + o.voto.toFixed(1) + "/10</span></div>" +
        '<ul class="lista-semplice">' + o.perche.map(function (x) { return "<li>✔ " + esc(x) + "</li>"; }).join("") + o.contro.map(function (x) { return "<li>⚠ " + esc(x) + "</li>"; }).join("") + "</ul>" +
        '<a class="btn piccolo" href="' + o.link + '" target="_blank" rel="noopener">Sito ufficiale ↗</a></div>';
    }).join("");
  }
  function htmlInstallare(r) {
    return '<div class="scheda"><h2>🧭 Come cambiare sistema operativo, passo per passo</h2><ol class="lista-semplice">' +
      "<li><b>Copia di sicurezza</b> di documenti, foto, posta e password (pagina «Cose da sapere → Backup»).</li>" +
      "<li>Scaricate il file <b>ISO</b> dal sito ufficiale del sistema scelto.</li>" +
      "<li>Create la <b>chiavetta avviabile</b> (8 GB o più): con <b>Rufus</b> o <b>Ventoy</b> su Windows, «Creatore di dischi di avvio»/Balena Etcher su Linux e Mac. Si trovano in «Programmi consigliati».</li>" +
      "<li>Inserite la chiavetta, riavviate e premete subito <b>" + esc(A.tastoAvvio(r)) + "</b> per scegliere la chiavetta.</li>" +
      "<li>Provate il sistema «live» <b>senza installare</b>: Wi-Fi, audio, stampante funzionano? Se sì, avviate l'installazione.</li>" +
      "<li>Scegliete se <b>affiancarlo</b> a quello attuale (doppio avvio) o <b>sostituirlo</b>. Poi tornate qui per installare i programmi consigliati.</li></ol>" +
      '<p class="piccolo-testo">Dubbi? Chiedete a Neura: «come installo Linux Mint?».</p></div>';
  }

  function mostra(el, parti) {
    var tab = parti[0] || "panoramica";
    el.innerHTML = CD.titolo("🔬", "Analisi del computer", "Cosa c'è dentro, quanto vale, come migliorarlo e quale sistema operativo gli sta meglio") +
      '<div class="schede-tab" role="tablist">' + [["panoramica", "📊 Panoramica"], ["sistemi", "🧭 Sistema consigliato"], ["migliorie", "🔧 Migliorie"], ["programmi", "📦 Programmi adatti"]].map(function (t) {
        return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") +
      '<span class="spazio"></span><button class="btn piccolo" id="an-rifai">🔄 Rianalizza</button><button class="btn piccolo primario" id="an-stampa">🖨️ Scheda professionale</button></div><div id="an-corpo"><div class="scheda"><div class="barra-progresso indeterminata"><i></i></div><p>Neura sta analizzando il computer…</p></div></div>';
    CD.$$("[data-tab]", el).forEach(function (b) { b.onclick = function () { CD.vai("#/analisi/" + b.getAttribute("data-tab")); }; });
    if (!CD.server) { CD.$("#an-corpo", el).innerHTML = '<div class="avviso att">L\'analisi funziona quando il Consulente Digitale è installato su questo computer.</div>'; return; }
    CD.cervello.stato("pensiero");
    function disegna(r) {
      CD.cervello.stato("riposo");
      var p = A.punteggi(r), w = A.win11(r), c = CD.$("#an-corpo", el);
      if (!c) return;
      if (tab === "panoramica") {
        c.innerHTML = '<div class="scheda luce"><div class="metri">' + CD.metro(p.totale, 10, "Voto complessivo") + CD.metro(p.cpu, 10, "Processore") + CD.metro(p.ram, 10, "Memoria") +
          CD.metro(p.disco, 10, "Disco") + CD.metro(p.gpu, 10, "Grafica") + (p.batteria != null ? CD.metro(p.batteria, 10, "Batteria") : "") + "</div>" +
          '<div class="neura-dice"><span>🧠</span><div>' + (function () { var t = A.riassunto(r).split("\n"); return "<p>" + t[0].replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>") + "</p>"; })() + "</div></div></div>" +
          '<div class="griglia-2"><div class="scheda"><h2>📋 Caratteristiche</h2><table class="tab">' + righeSpec(r) + "</table></div>" +
          '<div class="scheda"><h2>🪟 Compatibilità Windows 11</h2>' + (w.mac ? "<p>" + esc(w.mancano[0]) + "</p>" : w.ok ? '<div class="avviso ok">' + esc(A.win11Testo(w)) + "</div>" :
            '<div class="avviso att">✖ Non compatibile. Manca: <ul class="lista-semplice">' + w.mancano.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>") +
          (w.dubbi && w.dubbi.length ? '<p class="piccolo-testo">Da verificare: ' + esc(w.dubbi.join("; ")) + "</p>" : "") +
          "<h3>🏆 Sistema consigliato</h3>" + (function () { var o = A.consigliaSistemi(r)[0]; return "<p><b>" + o.icona + " " + esc(o.nome) + "</b>: " + esc(o.perche.join("; ")) + '.</p><a class="btn piccolo" href="#/analisi/sistemi">Tutte le alternative →</a>'; })() +
          "<h3>🔧 Miglioria più utile</h3>" + (A.migliorie(r)[0] ? "<p>" + A.migliorie(r)[0].icona + " " + esc(A.migliorie(r)[0].titolo) + "</p>" : "<p>Nessuna: è già in forma! 💪</p>") +
          '<p class="piccolo-testo">Analisi fatta in ' + r.durata_s + " s alle " + esc((r.quando || "").slice(11, 16)) + ". Nessun dato è uscito dal computer.</p></div></div>";
      } else if (tab === "sistemi") {
        c.innerHTML = '<p>Classifica calcolata per <b>questo computer</b>' + (CD.profilo ? " e per il profilo <b>" + esc((CD.TIPI[CD.profilo.tipo] || {}).nome) + "</b>" : "") + ".</p>" +
          '<div class="griglia-2">' + htmlSistemi(r) + "</div>" + htmlInstallare(r);
      } else if (tab === "migliorie") {
        var mg = A.migliorie(r);
        c.innerHTML = mg.length ? '<div class="griglia-2">' + mg.map(function (m) {
          return '<div class="scheda"><h3>' + m.icona + " " + esc(m.titolo) + '</h3><p>' + esc(m.testo) + '</p><div class="riga"><span class="etichetta ' + (/altissimo|alto/.test(m.impatto) ? "ok" : "neon") +
            '">beneficio: ' + esc(m.impatto) + '</span><span class="etichetta">costo indicativo: ' + esc(m.costo) + "</span></div></div>"; }).join("") + "</div>" :
          '<div class="avviso ok">💪 Questo computer è già in ottima forma: nessuna miglioria hardware necessaria.</div>';
        var mod = (((r.computer || {}).produttore || "") + " " + ((r.computer || {}).modello || "")).trim();
        c.innerHTML += '<div class="avviso">💡 Prima di comprare pezzi chiedete a Neura o a un tecnico di fiducia: verificate il modello esatto di RAM e SSD compatibili con ' +
          (mod ? "<b>" + esc(mod) + "</b>" : "questo computer (il modello è scritto sotto il portatile o sul retro del PC)") + ".</div>";
      } else {
        CD.programmi.mostraIn(c, { perAnalisi: r });
      }
    }
    A.dati().then(disegna, function (e) { CD.$("#an-corpo", el).innerHTML = '<div class="avviso male">Analisi non riuscita: ' + esc(e.message) + "</div>"; CD.cervello.stato("errore"); });
    CD.$("#an-rifai", el).onclick = function () { CD.$("#an-corpo", el).innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>'; CD.cervello.stato("pensiero"); A.dati(true).then(disegna); };
    CD.$("#an-stampa", el).onclick = function () { A.dati().then(A.stampa); };
  }

  A.stampa = function (r) {
    var p = A.punteggi(r), w = A.win11(r), so = A.consigliaSistemi(r).slice(0, 3), mg = A.migliorie(r);
    CD.stampa("Scheda tecnica e diagnosi del computer",
      '<section class="f-voti"><div><b>' + p.totale + '</b><span>Voto complessivo</span></div><div><b>' + p.cpu + "</b><span>Processore</span></div><div><b>" + p.ram + "</b><span>Memoria</span></div><div><b>" + p.disco + "</b><span>Disco</span></div><div><b>" + p.gpu + "</b><span>Grafica</span></div>" +
      (p.batteria != null ? "<div><b>" + p.batteria + "</b><span>Batteria</span></div>" : "") + "</section>" +
      "<h2>Caratteristiche</h2><table class=\"f-tab\">" + righeSpec(r) + "</table>" +
      "<h2>Compatibilità Windows 11</h2><p>" + esc(A.win11Testo(w)) + (w.dubbi && w.dubbi.length ? "<br><small>Da verificare: " + esc(w.dubbi.join("; ")) + "</small>" : "") + "</p>" +
      "<h2>Sistemi operativi consigliati</h2><ol>" + so.map(function (o) { return "<li><b>" + esc(o.nome) + "</b> (" + o.voto.toFixed(1) + "/10): " + esc(o.perche.join("; ")) + (o.contro.length ? ". <i>Attenzione: " + esc(o.contro.join("; ")) + "</i>" : "") + "</li>"; }).join("") + "</ol>" +
      "<h2>Migliorie consigliate</h2>" + (mg.length ? "<ul>" + mg.map(function (m) { return "<li><b>" + esc(m.titolo) + "</b> — " + esc(m.testo) + " (beneficio " + esc(m.impatto) + ", costo indicativo " + esc(m.costo) + ")</li>"; }).join("") + "</ul>" : "<p>Nessuna miglioria necessaria.</p>") +
      '<div class="f-firme"><div>Tecnico / consulente<br><br>______________________</div><div>Data<br><br>______________________</div><div>Firma del cliente<br><br>______________________</div></div>',
      { codice: CD.codiceScheda() });
  };

  CD.registra("analisi", { titolo: "Analisi del PC", mostra: mostra });
})();
