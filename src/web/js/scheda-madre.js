/* ==========================================================================
 *  CONSULENTE DIGITALE - Il modello del computer e il disegno della scheda madre
 *  CD.hw.modello(dettagli, sensori, analisi, diario) → componenti con stato (ok / attenzione / guasto
 *  possibile / sconosciuto), valori e problemi, secondo regole esplicite (soglie qui sotto).
 *  CD.hw.disegna(modello, opzioni) → SVG originale della scheda madre (fisso ATX o portatile) con i
 *  componenti rilevati, i collegamenti, i colori dello stato e i segnali dei guasti imminenti.
 *  È uno SCHEMA indicativo costruito dai dati letti: non una fotografia né il disegno del produttore.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, grafica CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var HW = CD.hw = CD.hw || {};
  /* Soglie (°C, %, giri): scritte qui una volta sola e riportate nel vademecum */
  HW.SOGLIE = { cpu: [85, 95], gpu: [80, 90], nvme: [65, 75], hdd: [50, 55], scheda: [70, 80], batteria: [75, 60], ram: [90, 97], spazio: [15, 8], cicli: [800, 1000] };
  var COL = { ok: "#10b981", att: "#f59e0b", male: "#ef4444", ignoto: "#64748b" };
  HW.COL = COL;
  var NOMI_STATO = { ok: "in salute", att: "da tenere d'occhio", male: "guasto possibile", ignoto: "non verificabile" };
  HW.NOMI_STATO = NOMI_STATO;

  function num(x) { var n = parseFloat(x); return isNaN(n) ? null : n; }
  function peggiore(a, b) { var o = { ignoto: 0, ok: 1, att: 2, male: 3 }; return o[b] > o[a] ? b : a; }
  HW.peggiore = peggiore;
  function temps(sens, re) {
    return (sens.sensori || []).filter(function (s) { return s.tipo === "temp" && re.test(s.nome + " " + s.chip) && num(s.valore) > 5 && num(s.valore) < 130; })
      .map(function (s) { return num(s.valore); });
  }
  /* data del BIOS: «2024-03-12», «03/12/2024», «20240312000000.000000+000» o «/Date(1710201600000)/» (PowerShell) */
  HW.annoBios = function (x) {
    var s = String(x || ""), m = s.match(/Date\((-?\d+)/);
    if (m) return new Date(+m[1]).getFullYear();
    m = s.match(/^(19|20)\d\d/) || s.match(/(19|20)\d\d(?!\d)/);
    return m ? +m[0].slice(0, 4) : null;
  };
  function max(a) { return a.length ? Math.max.apply(null, a) : null; }

  HW.modello = function (det, sens, an, diario) {
    det = det || {}; sens = sens || {}; an = an || {}; diario = diario || {};
    var c = [], S = HW.SOGLIE;
    var portatile = an.portatile || [8, 9, 10, 11, 14, 30, 31, 32].indexOf(+(det.scheda || {}).telaio) >= 0 || (det.batteria && det.batteria.progetto_mwh) || (an.batteria || []).length > 0;
    function add(o) { o.problemi = o.problemi || []; o.stato = o.stato || "ok"; c.push(o); return o; }
    // Processore
    var tc = max(temps(sens, /package|tctl|tdie|core|cpu|k10temp|coretemp|x86_pkg/i));
    var cpu = add({ id: "cpu", tipo: "cpu", nome: (det.cpu || {}).nome || (an.cpu || {}).nome || "Processore", valore: tc != null ? Math.round(tc) + " °C" : "" });
    if (tc == null) cpu.nota = "temperatura non disponibile senza sensori avanzati";
    else if (tc >= S.cpu[1]) { cpu.stato = "male"; cpu.problemi.push("Temperatura " + Math.round(tc) + " °C: il processore rallenta per proteggersi e alla lunga si rovina. Pulizia interna e pasta termica nuova."); }
    else if (tc >= S.cpu[0]) { cpu.stato = "att"; cpu.problemi.push("Temperatura alta (" + Math.round(tc) + " °C) sotto sforzo: controllate le prese d'aria e la polvere."); }
    if ((an.cpu || {}).stima && an.cpu.stima.anno && CD.adesso().getFullYear() - an.cpu.stima.anno >= 8) cpu.problemi.push("Processore di circa " + (CD.adesso().getFullYear() - an.cpu.stima.anno) + " anni: la pasta termica va probabilmente rinnovata.");
    // Ventole
    var fans = (sens.sensori || []).filter(function (s) { return s.tipo === "fan"; });
    if (fans.length) fans.slice(0, 3).forEach(function (f, i) {
      var v = add({ id: "fan" + i, tipo: "ventola", nome: f.nome || "Ventola", valore: Math.round(num(f.valore)) + " giri/min" });
      if (num(f.valore) === 0 && tc != null && tc > 70) { v.stato = "male"; v.problemi.push("Ventola ferma con il processore a " + Math.round(tc) + " °C: va pulita o sostituita subito."); }
    });
    else add({ id: "fan0", tipo: "ventola", nome: "Ventola del processore", stato: tc != null && tc >= S.cpu[1] ? "att" : "ignoto", valore: "" ,
      problemi: tc != null && tc >= S.cpu[1] ? ["Raffreddamento insufficiente: verificate che la ventola giri e non sia piena di polvere."] : [] });
    // Memoria
    var mods = ((det.memoria || {}).moduli || []).filter(function (m) { return !m.vuoto; });
    var slot = (det.memoria || {}).slot || 0;
    var totMb = (sens.memoria || {}).totale_mb || (an.memoria || {}).totale_mb || 0, lib = (sens.memoria || {}).libera_mb;
    var usoRam = totMb && lib != null ? Math.round(100 * (1 - lib / totMb)) : null;
    var ram = add({ id: "ram", tipo: "ram", nome: (CD.arrotonda(totMb / 1024, 0) || "?") + " GB " + ((mods[0] || {}).tipo || ""), valore: usoRam != null ? usoRam + "% in uso" : "",
      moduli: mods, slot: Math.max(slot, mods.length) });
    if (usoRam != null && usoRam >= S.ram[1]) { ram.stato = "att"; ram.problemi.push("Memoria quasi piena (" + usoRam + "%): chiudete programmi o aggiungete RAM."); }
    if (totMb && totMb < 7600) { ram.stato = peggiore(ram.stato, "att"); ram.problemi.push("Solo " + CD.arrotonda(totMb / 1024, 1) + " GB: per il sistema di oggi ne servono almeno 8."); }
    // Dischi
    var dischi = (det.dischi && det.dischi.length ? det.dischi : an.dischi || []).filter(function (d) { return d.tipo !== "USB"; });
    var salute = {};
    ((diario.disco || {}).voci || []).forEach(function (v) { salute[v.nome] = v; });
    dischi.forEach(function (d, i) {
      var nvme = /nvme/i.test((d.bus || "") + " " + d.tipo), hdd = /hdd|3/i.test(String(d.tipo)) && !nvme;
      var td = max(temps(sens, nvme ? /nvme|composite|ssd/i : /drive|disk|hdd|sata|ata/i));
      var o = add({ id: "disco" + i, tipo: nvme ? "nvme" : hdd ? "hdd" : "ssd", nome: d.nome || "Disco", valore: (d.gb ? d.gb + " GB" : "") + (td != null ? " · " + Math.round(td) + " °C" : ""), bus: d.bus || "" });
      var sg = (S[nvme ? "nvme" : "hdd"]);
      if (td != null && td >= sg[1]) { o.stato = "male"; o.problemi.push("Disco troppo caldo (" + Math.round(td) + " °C)."); }
      else if (td != null && td >= sg[0]) { o.stato = "att"; o.problemi.push("Disco caldo (" + Math.round(td) + " °C)."); }
      var s = String(d.salute || "");
      var v = CD.uno(Object.keys(salute), function (k) { return d.nome && k.indexOf(d.nome.slice(0, 10)) >= 0; });
      if (v) s += " " + salute[v].attuale + " " + salute[v].nota;
      if (/warning|unhealthy|fail|predict|copia|settori riallocati: [1-9]/i.test(s)) { o.stato = "male"; o.problemi.push("Il disco segnala un guasto in arrivo: fate SUBITO una copia dei dati e sostituitelo."); }
      if (hdd) { o.stato = peggiore(o.stato, "att"); o.problemi.push("Disco meccanico: lento e più fragile; un SSD lo sostituisce con poca spesa."); }
    });
    var sp = (an.spazio || [])[0];
    if (sp && sp.totale_gb && sp.libero_gb / sp.totale_gb * 100 < S.spazio[0] && c.filter(function (x) { return /nvme|ssd|hdd/.test(x.tipo); })[0]) {
      var d0 = c.filter(function (x) { return /nvme|ssd|hdd/.test(x.tipo); })[0];
      d0.stato = peggiore(d0.stato, sp.libero_gb / sp.totale_gb * 100 < S.spazio[1] ? "male" : "att");
      d0.problemi.push("Spazio libero: " + sp.libero_gb + " GB su " + sp.totale_gb + " (" + Math.round(sp.libero_gb / sp.totale_gb * 100) + "%).");
    }
    // Scheda video
    var gs = (det.gpu && det.gpu.length ? det.gpu : an.gpu || []);
    var dedicata = gs.filter(function (g) { return /rtx|gtx|radeon rx|rx \d{3,4}|arc a\d|arc b\d|quadro/i.test(g.nome); })[0];
    var gsens = (sens.gpu || []).filter(function (g) { return g.temp != null; })[0];
    if (dedicata || gsens) {
      var g = add({ id: "gpu", tipo: "gpu", nome: (dedicata || gs[0] || {}).nome || (gsens || {}).nome, valore: gsens ? Math.round(gsens.temp) + " °C" : "" });
      if (gsens && gsens.temp >= S.gpu[1]) { g.stato = "male"; g.problemi.push("Scheda video a " + Math.round(gsens.temp) + " °C: pulizia e controllo delle ventole."); }
      else if (gsens && gsens.temp >= S.gpu[0]) { g.stato = "att"; g.problemi.push("Scheda video calda (" + Math.round(gsens.temp) + " °C)."); }
    } else add({ id: "gpu", tipo: "igpu", nome: (gs[0] || {}).nome || "Grafica integrata", valore: "nel processore" });
    // Scheda madre e chipset
    var tb = max(temps(sens, /scheda|board|pch|chipset|acpi|systin|motherboard|thermal|thz|tz/i));
    var ch = add({ id: "chipset", tipo: "chipset", nome: ((det.scheda || {}).produttore || "") + " " + ((det.scheda || {}).modello || "Chipset"), valore: tb != null ? Math.round(tb) + " °C" : "" });
    if (tb != null && tb >= S.scheda[1]) { ch.stato = "att"; ch.problemi.push("Scheda madre calda (" + Math.round(tb) + " °C): aerazione insufficiente."); }
    ((an.problemi_dispositivi || [])).forEach(function (p) { ch.stato = peggiore(ch.stato, "att"); ch.problemi.push("Dispositivo con problemi: " + p.nome + "."); });
    // BIOS
    var anno = HW.annoBios((det.scheda || {}).bios_data || (an.computer || {}).bios_data);
    var bios = add({ id: "bios", tipo: "bios", nome: "BIOS " + ((det.scheda || {}).bios || (an.computer || {}).bios || ""), valore: anno || "" });
    if (anno && CD.adesso().getFullYear() - anno >= 4) { bios.stato = "att"; bios.problemi.push("BIOS del " + anno + ": controllate sul sito del produttore se c'è un aggiornamento (correzioni di sicurezza e stabilità)."); }
    // Batteria
    var b0 = (an.batteria || [])[0], bd2 = det.batteria;
    if (portatile || b0 || bd2) {
      var sal = b0 && b0.salute ? b0.salute : bd2 && bd2.progetto_mwh ? Math.round(100 * bd2.piena_mwh / bd2.progetto_mwh) : null;
      var cic = b0 && b0.cicli ? b0.cicli : bd2 ? bd2.cicli : null;
      var bt = add({ id: "batteria", tipo: "batteria", nome: "Batteria" + (bd2 && bd2.nome ? " " + bd2.nome : ""), valore: (sal != null ? "salute " + sal + "%" : "") + (cic ? " · " + cic + " cicli" : "") });
      if (sal != null && sal < S.batteria[1]) { bt.stato = "male"; bt.problemi.push("La batteria tiene solo il " + sal + "% della carica originale: va sostituita (può anche gonfiarsi)."); }
      else if (sal != null && sal < S.batteria[0]) { bt.stato = "att"; bt.problemi.push("Batteria consumata (" + sal + "%): durata ridotta."); }
      else if (sal == null) bt.stato = "ignoto";
      if (cic && cic >= S.cicli[0]) { bt.stato = peggiore(bt.stato, "att"); bt.problemi.push(cic + " cicli di carica: vicina a fine vita."); }
    }
    // Rete e porte (solo informativi)
    add({ id: "rete", tipo: "rete", nome: ((det.rete || [])[0] || {}).nome || "Rete", valore: ((det.rete || [])[0] || {}).tipo || "", stato: "ok" });
    var mondo = { componenti: c, portatile: !!portatile, porte: det.porte || [], slot: det.slot || [], stato: "ok", problemi: 0 };
    c.forEach(function (x) { mondo.stato = peggiore(mondo.stato, x.stato); mondo.problemi += x.problemi.length; });
    return mondo;
  };

  /* ------------------------------------------------------------------ disegno */
  function comp(m, id) { return CD.uno(m.componenti, function (c) { return c.id === id; }); }
  function stile(x) { return x ? COL[x.stato] : COL.ignoto; }
  function etichetta(x, y, testo, sotto, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="sm-et" text-anchor="' + (anchor || "middle") + '">' + esc(testo) + "</text>" +
      (sotto ? '<text x="' + x + '" y="' + (y + 15) + '" class="sm-val" text-anchor="' + (anchor || "middle") + '">' + esc(sotto) + "</text>" : "");
  }
  function gruppo(x, inner) {
    if (!x) return inner;
    return '<g class="sm-comp sm-' + x.stato + '" data-id="' + x.id + '"><title>' + esc(x.nome + (x.valore ? " — " + x.valore : "") + " · " + NOMI_STATO[x.stato] +
      (x.problemi.length ? "\n• " + x.problemi.join("\n• ") : "")) + "</title>" + inner + "</g>";
  }
  function avviso(x, cx, cy, n) {   // cerchio pulsante e numero del problema
    if (!x || (x.stato !== "male" && x.stato !== "att")) return "";
    var col = COL[x.stato];
    return '<g class="sm-allarme"><circle cx="' + cx + '" cy="' + cy + '" r="16" fill="none" stroke="' + col + '" stroke-width="3">' +
      (x.stato === "male" ? '<animate attributeName="r" values="14;30;14" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0;1" dur="1.6s" repeatCount="indefinite"/>' : "") +
      '</circle><circle cx="' + cx + '" cy="' + cy + '" r="13" fill="' + col + '"/><text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" class="sm-num">' + n + "</text></g>";
  }

  HW.disegna = function (m, opz) {
    opz = opz || {};
    var o = [], numeri = {}, n = 0;
    m.componenti.forEach(function (c) { if (c.stato === "male" || c.stato === "att") numeri[c.id] = ++n; });
    var cpu = comp(m, "cpu"), ram = comp(m, "ram"), gpu = comp(m, "gpu"), ch = comp(m, "chipset"), bios = comp(m, "bios"), bat = comp(m, "batteria"), fan = comp(m, "fan0"), rete = comp(m, "rete");
    var dischi = m.componenti.filter(function (c) { return /nvme|ssd|hdd/.test(c.tipo); });
    o.push('<svg class="schema-scheda" viewBox="0 0 1000 660" role="img" aria-label="Schema della scheda madre" xmlns="http://www.w3.org/2000/svg">');
    o.push('<defs><linearGradient id="pcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d2a3a"/><stop offset="1" stop-color="#081a26"/></linearGradient>' +
      '<pattern id="piste" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 20h14l6 -6h20M20 0v8l6 6v26" fill="none" stroke="#1f6f8b" stroke-width="1" opacity=".35"/></pattern>' +
      '<filter id="sm-luce" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>');
    o.push('<style>.sm-et{font:600 13px Inter,Segoe UI,Arial,sans-serif;fill:#e6f1ff}.sm-val{font:12px Inter,Segoe UI,Arial,sans-serif;fill:#9fb3cf}.sm-num{font:700 15px Arial,sans-serif;fill:#0b1220}' +
      '.sm-pin{fill:#c9a227}.sm-comp{cursor:help}.sm-titolo{font:700 15px Inter,Arial,sans-serif;fill:#7dd3fc;letter-spacing:.12em}</style>');
    if (!m.portatile) {
      /* ---------------- scheda madre ATX (computer fisso) ---------------- */
      o.push('<rect x="40" y="30" width="900" height="600" rx="14" fill="url(#pcb)" stroke="#2b6f8f" stroke-width="2"/><rect x="40" y="30" width="900" height="600" rx="14" fill="url(#piste)"/>');
      for (var h = 0; h < 4; h++) o.push('<circle cx="' + [70, 910, 70, 910][h] + '" cy="' + [60, 60, 600, 600][h] + '" r="9" fill="#0b1220" stroke="#c9a227" stroke-width="3"/>');
      // pannello posteriore
      o.push(gruppo(rete, '<rect x="52" y="70" width="70" height="300" rx="6" fill="#1e293b" stroke="#475569"/>' +
        ["USB", "USB", "LAN", "HDMI", "DP", "AUDIO"].map(function (t, i) { return '<rect x="62" y="' + (82 + i * 47) + '" width="50" height="34" rx="4" fill="#0f172a" stroke="' + (t === "LAN" ? stile(rete) : "#64748b") + '"/><text x="87" y="' + (104 + i * 47) + '" text-anchor="middle" class="sm-val" style="font-size:10px">' + t + "</text>"; }).join("")));
      // VRM
      for (var v = 0; v < 6; v++) o.push('<rect x="' + (250 + v * 34) + '" y="62" width="26" height="26" rx="3" fill="#334155" stroke="#64748b"/>');
      // CPU
      o.push(gruppo(cpu, '<rect x="270" y="105" width="190" height="190" rx="10" fill="#111827" stroke="' + stile(cpu) + '" stroke-width="4" filter="url(#sm-luce)"/>' +
        '<rect x="300" y="135" width="130" height="130" rx="6" fill="#cbd5e1" opacity=".15"/>' + '<circle cx="365" cy="200" r="58" fill="none" stroke="#94a3b8" stroke-dasharray="6 6" opacity=".6"/>' +
        etichetta(365, 192, "CPU", cpu && cpu.valore) + '<text x="365" y="318" text-anchor="middle" class="sm-val">' + esc((cpu ? cpu.nome : "").replace(/\(R\)|\(TM\)|CPU|@.*$/g, "").slice(0, 34)) + "</text>"));
      o.push(gruppo(fan, '<circle cx="365" cy="200" r="78" fill="none" stroke="' + stile(fan) + '" stroke-width="2" opacity=".55"/>'));
      // RAM
      var slotN = Math.max(2, Math.min(8, (ram && ram.slot) || ((ram && ram.moduli.length) || 2))), pieni = ram ? ram.moduli.length || Math.min(slotN, 2) : 0;
      var ramIn = "";
      for (var r = 0; r < slotN; r++) {
        var x = 520 + r * 30, pieno = r < pieni;
        ramIn += '<rect x="' + x + '" y="80" width="20" height="250" rx="3" fill="#0b1220" stroke="#475569"/>';
        if (pieno) { ramIn += '<rect x="' + (x + 2) + '" y="86" width="16" height="238" rx="2" fill="' + stile(ram) + '" opacity=".85"/>'; for (var k = 0; k < 6; k++) ramIn += '<rect x="' + (x + 4) + '" y="' + (96 + k * 38) + '" width="12" height="26" fill="#0f172a" opacity=".55"/>'; }
      }
      o.push(gruppo(ram, ramIn + etichetta(520 + slotN * 15, 350, "RAM " + (ram ? ram.nome : ""), (pieni + " di " + slotN + " slot") + (ram && ram.valore ? " · " + ram.valore : ""))));
      // alimentazione
      o.push('<rect x="880" y="120" width="40" height="200" rx="4" fill="#111827" stroke="#64748b"/>' + etichetta(900, 340, "ATX 24", ""));
      // M.2 e SATA
      var nvme = dischi.filter(function (d) { return d.tipo === "nvme"; }), sata = dischi.filter(function (d) { return d.tipo !== "nvme"; });
      (nvme.length ? nvme : [null]).slice(0, 2).forEach(function (d, i) {
        o.push(gruppo(d, '<rect x="300" y="' + (378 + i * 46) + '" width="220" height="30" rx="4" fill="' + (d ? "#111827" : "transparent") + '" stroke="' + (d ? stile(d) : "#475569") + '" stroke-width="' + (d ? 3 : 1) + '" stroke-dasharray="' + (d ? "" : "5 4") + '"/>' +
          '<text x="312" y="' + (398 + i * 46) + '" class="sm-val">M.2 ' + (d ? esc(d.nome.slice(0, 22)) + " · " + esc(d.valore) : "(libero)") + "</text>"));
      });
      sata.slice(0, 4).forEach(function (d, i) {
        o.push(gruppo(d, '<rect x="860" y="' + (400 + i * 40) + '" width="60" height="26" rx="3" fill="#111827" stroke="' + stile(d) + '" stroke-width="3"/><text x="852" y="' + (418 + i * 40) + '" text-anchor="end" class="sm-val">SATA · ' + esc(d.nome.slice(0, 26)) + "</text>"));
      });
      // PCIe e scheda video
      for (var p = 0; p < 3; p++) o.push('<rect x="140" y="' + (480 + p * 44) + '" width="' + (p ? 220 : 420) + '" height="14" rx="3" fill="#0b1220" stroke="#475569"/>');
      if (gpu && gpu.tipo === "gpu") o.push(gruppo(gpu, '<rect x="130" y="456" width="460" height="56" rx="8" fill="#111827" stroke="' + stile(gpu) + '" stroke-width="4" filter="url(#sm-luce)"/>' +
        '<circle cx="230" cy="484" r="20" fill="none" stroke="#94a3b8"/><circle cx="330" cy="484" r="20" fill="none" stroke="#94a3b8"/>' + etichetta(470, 480, "GPU", gpu.valore) +
        '<text x="140" y="530" class="sm-val">' + esc(gpu.nome.slice(0, 50)) + "</text>"));
      else o.push(etichetta(250, 600, "PCIe (liberi)", ""));
      // chipset, BIOS, batteria tampone
      o.push(gruppo(ch, '<rect x="660" y="430" width="110" height="90" rx="8" fill="#1e293b" stroke="' + stile(ch) + '" stroke-width="3"/>' + etichetta(715, 470, "Chipset", ch && ch.valore)));
      o.push(gruppo(bios, '<rect x="660" y="550" width="60" height="40" rx="4" fill="#111827" stroke="' + stile(bios) + '" stroke-width="2"/>' + etichetta(690, 575, "BIOS", "")));
      o.push('<circle cx="790" cy="575" r="22" fill="#cbd5e1" stroke="#94a3b8"/><text x="790" y="580" text-anchor="middle" class="sm-num" style="font-size:10px">CR2032</text>');
      // allarmi
      if (cpu) o.push(avviso(cpu, 455, 115, numeri.cpu));
      if (fan) o.push(avviso(fan, 290, 128, numeri.fan0));
      if (ram) o.push(avviso(ram, 520 + slotN * 30, 86, numeri.ram));
      dischi.forEach(function (d, i) { var y = d.tipo === "nvme" ? 392 + nvme.indexOf(d) * 46 : 412 + sata.indexOf(d) * 40; o.push(avviso(d, d.tipo === "nvme" ? 530 : 935, y, numeri[d.id])); });
      if (gpu) o.push(avviso(gpu, 590, 462, numeri.gpu));
      if (ch) o.push(avviso(ch, 770, 436, numeri.chipset));
      if (bios) o.push(avviso(bios, 724, 552, numeri.bios));
    } else {
      /* ---------------- scheda di un portatile ---------------- */
      o.push('<path d="M60 40 H700 a16 16 0 0 1 16 16 V140 H940 a16 16 0 0 1 16 16 V420 a16 16 0 0 1 -16 16 H60 a16 16 0 0 1 -16 -16 V56 a16 16 0 0 1 16 -16z" fill="url(#pcb)" stroke="#2b6f8f" stroke-width="2"/>' +
        '<path d="M60 40 H700 a16 16 0 0 1 16 16 V140 H940 a16 16 0 0 1 16 16 V420 a16 16 0 0 1 -16 16 H60 a16 16 0 0 1 -16 -16 V56 a16 16 0 0 1 16 -16z" fill="url(#piste)"/>');
      // ventola e tubi di calore
      o.push(gruppo(fan, '<circle cx="140" cy="140" r="72" fill="#0b1220" stroke="' + stile(fan) + '" stroke-width="4"/>' +
        [0, 1, 2, 3, 4, 5, 6].map(function (i) { var a = i * Math.PI * 2 / 7; return '<path d="M140 140 Q' + (140 + 60 * Math.cos(a)) + " " + (140 + 60 * Math.sin(a)) + " " + (140 + 66 * Math.cos(a + .5)) + " " + (140 + 66 * Math.sin(a + .5)) + '" stroke="#64748b" stroke-width="5" fill="none"/>'; }).join("") +
        etichetta(140, 240, "Ventola", fan && fan.valore)));
      o.push('<path d="M205 120 C 280 110, 300 160, 360 160" stroke="#c08457" stroke-width="12" fill="none" opacity=".85"/><path d="M205 160 C 270 170, 300 200, 360 200" stroke="#c08457" stroke-width="12" fill="none" opacity=".7"/>');
      // CPU e GPU
      o.push(gruppo(cpu, '<rect x="350" y="110" width="140" height="120" rx="8" fill="#111827" stroke="' + stile(cpu) + '" stroke-width="4" filter="url(#sm-luce)"/>' +
        '<rect x="385" y="140" width="70" height="60" rx="4" fill="#cbd5e1" opacity=".18"/>' + etichetta(420, 170, "CPU", cpu && cpu.valore) +
        '<text x="420" y="250" text-anchor="middle" class="sm-val">' + esc((cpu ? cpu.nome : "").replace(/\(R\)|\(TM\)|CPU|@.*$/g, "").slice(0, 32)) + "</text>"));
      if (gpu && gpu.tipo === "gpu") o.push(gruppo(gpu, '<rect x="510" y="110" width="120" height="100" rx="8" fill="#111827" stroke="' + stile(gpu) + '" stroke-width="4"/>' + etichetta(570, 160, "GPU", gpu.valore)));
      // RAM
      var mods = ram ? ram.moduli : [], sod = mods.filter(function (x) { return !/saldat|onboard|row of chips/i.test((x.formato || "") + " " + (x.posizione || "")); }).length;
      var sald = mods.length - sod, slotL = Math.max(sod, (ram && ram.slot ? ram.slot - sald : 0));
      var rIn = "";
      if (sald || !mods.length) {
        rIn += '<rect x="660" y="250" width="130" height="80" rx="6" fill="#111827" stroke="' + stile(ram) + '" stroke-width="3"/>';
        for (var q = 0; q < 8; q++) rIn += '<rect x="' + (670 + (q % 4) * 30) + '" y="' + (262 + Math.floor(q / 4) * 34) + '" width="22" height="24" fill="' + stile(ram) + '" opacity=".75"/>';
        rIn += '<text x="725" y="350" text-anchor="middle" class="sm-val">' + (mods.length ? "memoria saldata" : "memoria") + "</text>";
      }
      for (var s2 = 0; s2 < Math.min(2, slotL); s2++) {
        var pien = s2 < sod;
        rIn += '<rect x="' + (820) + '" y="' + (170 + s2 * 70) + '" width="120" height="52" rx="5" fill="' + (pien ? "#111827" : "transparent") + '" stroke="' + (pien ? stile(ram) : "#475569") + '" stroke-width="' + (pien ? 3 : 1) + '" stroke-dasharray="' + (pien ? "" : "5 4") + '"/>' +
          '<text x="880" y="' + (201 + s2 * 70) + '" text-anchor="middle" class="sm-val">' + (pien ? "SO-DIMM " + ((mods.filter(function (x) { return !/saldat|onboard/i.test((x.formato || "") + x.posizione); })[s2] || {}).gb || "?") + " GB" : "slot libero") + "</text>";
      }
      o.push(gruppo(ram, rIn + etichetta(800, 395, "RAM " + (ram ? ram.nome : ""), ram && ram.valore)));
      // SSD M.2 e Wi-Fi
      dischi.slice(0, 2).forEach(function (d, i) {
        o.push(gruppo(d, '<rect x="' + (360 + i * 10) + '" y="' + (300 + i * 50) + '" width="260" height="36" rx="5" fill="#111827" stroke="' + stile(d) + '" stroke-width="3"/>' +
          '<text x="' + (372 + i * 10) + '" y="' + (323 + i * 50) + '" class="sm-val" style="font-size:11px">' + (d.tipo === "nvme" ? "M.2 NVMe" : d.tipo === "hdd" ? "HDD 2,5\"" : "SSD") + " · " + esc(d.nome.slice(0, 14)) + " · " + esc(d.valore.replace(/ · /, " ")) + "</text>"));
      });
      o.push(gruppo(rete, '<rect x="200" y="300" width="90" height="40" rx="4" fill="#111827" stroke="' + stile(rete) + '" stroke-width="2"/>' + etichetta(245, 325, "Wi-Fi", "")));
      o.push(gruppo(ch, '<rect x="520" y="230" width="70" height="56" rx="6" fill="#1e293b" stroke="' + stile(ch) + '" stroke-width="2"/>' + etichetta(555, 262, "PCH", ch && ch.valore)));
      o.push(gruppo(bios, '<rect x="200" y="370" width="60" height="34" rx="4" fill="#111827" stroke="' + stile(bios) + '" stroke-width="2"/>' + etichetta(230, 392, "BIOS", "")));
      // porte sui lati
      ["USB-C", "USB", "HDMI"].forEach(function (t, i) { o.push('<rect x="44" y="' + (270 + i * 42) + '" width="40" height="28" rx="4" fill="#0f172a" stroke="#64748b"/><text x="64" y="' + (288 + i * 42) + '" text-anchor="middle" class="sm-val" style="font-size:9px">' + t + "</text>"); });
      ["USB", "Audio"].forEach(function (t, i) { o.push('<rect x="912" y="' + (300 + i * 42) + '" width="40" height="28" rx="4" fill="#0f172a" stroke="#64748b"/><text x="932" y="' + (318 + i * 42) + '" text-anchor="middle" class="sm-val" style="font-size:9px">' + t + "</text>"); });
      // batteria (sotto la scheda)
      o.push(gruppo(bat, '<rect x="100" y="470" width="800" height="150" rx="14" fill="#0b1220" stroke="' + stile(bat) + '" stroke-width="4"/>' +
        [0, 1, 2, 3].map(function (i) { return '<rect x="' + (120 + i * 195) + '" y="490" width="180" height="110" rx="10" fill="' + stile(bat) + '" opacity=".22"/>'; }).join("") +
        '<rect x="480" y="440" width="40" height="34" fill="#334155"/>' + etichetta(500, 545, bat ? bat.nome : "Batteria", bat && bat.valore)));
      if (cpu) o.push(avviso(cpu, 488, 112, numeri.cpu));
      if (fan) o.push(avviso(fan, 205, 78, numeri.fan0));
      if (ram) o.push(avviso(ram, 940, 160, numeri.ram));
      dischi.slice(0, 2).forEach(function (d, i) { o.push(avviso(d, 625 + i * 10, 302 + i * 50, numeri[d.id])); });
      if (gpu && gpu.tipo === "gpu") o.push(avviso(gpu, 628, 112, numeri.gpu));
      if (ch) o.push(avviso(ch, 592, 232, numeri.chipset));
      if (bios) o.push(avviso(bios, 262, 372, numeri.bios));
      if (bat) o.push(avviso(bat, 895, 476, numeri.batteria));
    }
    o.push('<text x="500" y="652" text-anchor="middle" class="sm-val" style="font-size:11px">Schema indicativo generato dai dati letti · Consulente Digitale di Danilo D\'Auria · CC BY-NC-SA 4.0</text>');
    o.push("</svg>");
    return { svg: o.join(""), numeri: numeri };
  };

  /* legenda e elenco dei problemi numerati (sotto il disegno) */
  HW.legenda = function (m, numeri) {
    var h = '<div class="sm-legenda">' + ["ok", "att", "male", "ignoto"].map(function (s) { return '<span><i style="background:' + COL[s] + '"></i>' + NOMI_STATO[s] + "</span>"; }).join("") + "</div>";
    var pr = m.componenti.filter(function (c) { return numeri[c.id]; });
    if (!pr.length) return h + '<div class="avviso ok">✔ Nessun guasto imminente rilevato dai sensori e dai controlli disponibili.</div>';
    return h + '<ol class="sm-problemi">' + pr.map(function (c) {
      return '<li class="sm-' + c.stato + '"><b>' + numeri[c.id] + ". " + esc(c.nome) + "</b> — " + NOMI_STATO[c.stato] + (c.valore ? " (" + esc(c.valore) + ")" : "") +
        "<br><small>" + c.problemi.map(esc).join("<br>") + "</small></li>"; }).join("") + "</ol>";
  };
})();
