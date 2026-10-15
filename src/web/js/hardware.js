/* ==========================================================================
 *  CONSULENTE DIGITALE - Hardware e sensori (come HWiNFO, CPU-Z e GPU-Z, ma in parole semplici)
 *  Sensori in diretta (letti ogni 2 secondi solo mentre la pagina è aperta), schede tecniche di processore,
 *  scheda madre, memoria, grafica, dischi, batteria, rete e porte, e lo schema della scheda madre con i
 *  punti di un guasto imminente (scheda-madre.js). Dati da /api/hardware/dettagli e /api/hardware/sensori.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var HW = CD.hw = CD.hw || {};
  var timer = null, storia = { cpu: [], temp: [], ram: [], disco: [], rete: [], gpu: [] }, estremi = {}, LUNG = 60;
  HW.dettagli = null; HW.sensoriUltimi = null; HW.archivio = null;

  HW.leggiDettagli = function (nuovo) {
    if (HW.dettagli && !nuovo) return Promise.resolve(HW.dettagli);
    return CD.api("/api/hardware/dettagli" + (nuovo ? "?nuovo=1" : "")).then(function (d) { HW.dettagli = d; return d; });
  };
  HW.leggiSensori = function () { return CD.api("/api/hardware/sensori").then(function (s) { HW.sensoriUltimi = s; return s; }); };
  HW.leggiArchivio = function () {
    if (HW.archivio) return Promise.resolve(HW.archivio);
    return CD.carica("hardware").then(function (a) { HW.archivio = a || {}; return HW.archivio; });
  };
  /* Tutto ciò che serve alla diagnosi: dettagli, una lettura dei sensori, analisi, archivio → modello */
  HW.raccogli = function (nuovo) {
    var an = CD.analisi.dati().catch(function () { return {}; });
    return Promise.all([HW.leggiDettagli(nuovo).catch(function () { return {}; }), HW.leggiSensori().catch(function () { return {}; }), an, HW.leggiArchivio()])
      .then(function (r) { var m = HW.modello(r[0], r[1], r[2], r[3]); HW.ultimoModello = m; return { det: r[0], sens: r[1], an: r[2], arch: r[3], modello: m }; });
  };

  /* ------------------------------------------------------------------ piccoli disegni */
  function scintilla(valori, max, colore) {
    if (valori.length < 2) return '<svg class="hw-sc" viewBox="0 0 120 34"></svg>';
    var m = max || Math.max.apply(null, valori.concat([1])), passo = 120 / Math.max(valori.length - 1, 1), pt = valori.map(function (v, i) {
      return (i * passo).toFixed(1) + "," + (32 - 30 * Math.min(1, v / m)).toFixed(1); });
    return '<svg class="hw-sc" viewBox="0 0 120 34" preserveAspectRatio="none"><polyline points="' + pt.join(" ") +
      '" fill="none" stroke="' + colore + '" stroke-width="1.8" vector-effect="non-scaling-stroke"/><polygon points="0,34 ' + pt.join(" ") + ' 120,34" fill="' + colore + '" opacity=".14"/></svg>';
  }
  function colTemp(t, s) { return t == null ? "var(--inchiostro2)" : t >= s[1] ? "var(--male)" : t >= s[0] ? "var(--attenzione)" : "var(--ok)"; }
  function tessera(icona, titolo, valore, sotto, grafico, colore) {
    return '<div class="hw-tessera"><div class="hw-tt"><span>' + icona + "</span>" + esc(titolo) + '</div><div class="hw-valore" style="color:' + (colore || "var(--inchiostro)") + '">' +
      valore + '</div><div class="hw-sotto">' + (sotto || "&nbsp;") + "</div>" + (grafico || "") + "</div>";
  }
  function righe(coppie) {
    coppie = coppie.filter(function (c) { return c[1] !== undefined && c[1] !== null && c[1] !== "" && c[1] !== "0 MHz"; });
    if (!coppie.length) return '<p class="vuoto">Nessun dato disponibile su questo computer.</p>';
    return '<table class="tab hw-tab"><tbody>' + coppie.map(function (c) { return "<tr><th>" + esc(c[0]) + "</th><td>" + (c[2] ? c[1] : esc(c[1])) + "</td></tr>"; }).join("") + "</tbody></table>";
  }
  function tabella(intest, righe2) {
    if (!righe2.length) return '<p class="vuoto">Nessun elemento rilevato.</p>';
    return '<div class="tab-scorre"><table class="tab"><thead><tr>' + intest.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      righe2.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c == null ? "" : c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }
  function mb(x) { return x >= 1024 ? CD.arrotonda(x / 1024, 1) + " GB" : Math.round(x) + " MB"; }
  function tempMax(s, re) {
    var t = (s.sensori || []).filter(function (x) { return x.tipo === "temp" && re.test(x.nome + " " + x.chip) && x.valore > 5 && x.valore < 130; }).map(function (x) { return +x.valore; });
    return t.length ? Math.max.apply(null, t) : null;
  }
  function spingi(k, v) { if (v == null || isNaN(v)) return; storia[k].push(+v); if (storia[k].length > LUNG) storia[k].shift(); }

  /* ------------------------------------------------------------------ panoramica in diretta */
  function panoramica(s) {
    var S = HW.SOGLIE, cpu = s.cpu || {}, mem = s.memoria || {}, t = tempMax(s, /package|tctl|tdie|core|cpu|k10temp|coretemp|x86_pkg/i);
    var uso = mem.totale_mb ? Math.round(100 * (1 - mem.libera_mb / mem.totale_mb)) : null;
    var d = (s.dischi || [])[0] || {}, rete = (s.rete || []).reduce(function (a, r) { return a + (+r.ricevuti_kbs || 0) + (+r.inviati_kbs || 0); }, 0);
    var g = (s.gpu || [])[0] || {}, b = (s.batteria || [])[0], fan = CD.uno(s.sensori || [], function (x) { return x.tipo === "fan"; });
    var watt = CD.uno(s.sensori || [], function (x) { return x.tipo === "power" && /package|cpu/i.test(x.nome); });
    spingi("cpu", cpu.uso); spingi("temp", t); spingi("ram", uso); spingi("disco", d.attivita); spingi("rete", rete); spingi("gpu", g.uso);
    var h = '<div class="hw-tessere">' +
      tessera("⚙️", "Processore", cpu.uso != null ? Math.round(cpu.uso) + "%" : "—", cpu.mhz && cpu.mhz.length ? "fino a " + Math.max.apply(null, cpu.mhz) + " MHz" : "", scintilla(storia.cpu, 100, "#38bdf8")) +
      tessera("🌡️", "Temperatura CPU", t != null ? Math.round(t) + " °C" : "—", t == null ? "servono i sensori avanzati" : watt ? "consumo " + watt.valore + " W" : "", scintilla(storia.temp, 105, "#f97316"), colTemp(t, S.cpu)) +
      tessera("🧠", "Memoria RAM", uso != null ? uso + "%" : "—", mem.totale_mb ? mb(mem.totale_mb - mem.libera_mb) + " di " + mb(mem.totale_mb) : "", scintilla(storia.ram, 100, "#a78bfa"), uso >= S.ram[1] ? "var(--attenzione)" : "") +
      tessera("💽", "Disco", d.attivita != null ? Math.round(d.attivita) + "%" : "—", d.lettura_mbs != null ? "↓ " + d.lettura_mbs + " MB/s · ↑ " + d.scrittura_mbs + " MB/s" : "", scintilla(storia.disco, 100, "#22d3ee")) +
      tessera("🎮", "Grafica", g.uso != null ? Math.round(g.uso) + "%" : "—", (g.temp != null ? Math.round(g.temp) + " °C · " : "") + esc((g.nome || "").slice(0, 26)), scintilla(storia.gpu, 100, "#34d399"), colTemp(g.temp, S.gpu)) +
      tessera("📶", "Rete", rete >= 1024 ? CD.arrotonda(rete / 1024, 1) + " MB/s" : Math.round(rete) + " kB/s", esc(((s.rete || [])[0] || {}).nome || ""), scintilla(storia.rete, 0, "#f472b6")) +
      (b ? tessera("🔋", "Batteria", (b.carica != null ? b.carica + "%" : "—"), esc(b.stato || "") + (b.watt ? " · " + Math.abs(b.watt) + " W" : ""), "", b.carica < 20 ? "var(--male)" : "") : "") +
      (fan ? tessera("🌀", "Ventola", Math.round(fan.valore) + "", "giri al minuto", "") : "") + "</div>";
    if (cpu.core && cpu.core.length) {
      h += '<h3>Lavoro di ogni core <small>(' + cpu.core.length + " thread)</small></h3><div class=\"hw-core\">" + cpu.core.map(function (u, i) {
        return '<div title="Thread ' + (i + 1) + ": " + u + "%" + (cpu.mhz && cpu.mhz[i] ? " · " + cpu.mhz[i] + " MHz" : "") + '"><i style="height:' + Math.max(2, u) + "%;background:" + (u > 90 ? "var(--male)" : u > 60 ? "var(--attenzione)" : "var(--neon)") + '"></i><span>' + (i + 1) + "</span></div>";
      }).join("") + "</div>";
    }
    return h;
  }

  /* ------------------------------------------------------------------ elenco completo dei sensori */
  var NOMI_TIPO = { temp: "🌡️ Temperature", fan: "🌀 Ventole", "in": "⚡ Tensioni", power: "🔌 Potenza", curr: "〰️ Correnti", clock: "⏱️ Frequenze", load: "📈 Carico", level: "📶 Livelli", data: "🗂️ Dati", control: "🎚️ Controlli" };
  function tuttiSensori(s) {
    var lista = s.sensori || [];
    lista.forEach(function (x) {
      var k = x.tipo + "|" + x.chip + "|" + x.nome, v = +x.valore;
      if (isNaN(v)) return;
      var e = estremi[k] = estremi[k] || { min: v, max: v };
      e.min = Math.min(e.min, v); e.max = Math.max(e.max, v);
    });
    var h = s.nota ? '<div class="avviso">ℹ️ ' + esc(s.nota) + "</div>" : "";
    if (!lista.length) return h + '<p class="vuoto">Il sistema non espone sensori leggibili senza un aiuto in più. Usate «Sensori avanzati» qui sopra.</p>';
    var gruppi = {};
    lista.forEach(function (x) { (gruppi[x.tipo] = gruppi[x.tipo] || []).push(x); });
    Object.keys(gruppi).forEach(function (t) {
      h += "<h3>" + (NOMI_TIPO[t] || esc(t)) + '</h3><div class="tab-scorre"><table class="tab hw-sensori"><thead><tr><th>Sensore</th><th>Componente</th><th>Attuale</th><th>Minimo</th><th>Massimo</th><th>Limite</th></tr></thead><tbody>' +
        gruppi[t].map(function (x) {
          var e = estremi[x.tipo + "|" + x.chip + "|" + x.nome] || {}, u = " " + (x.unita || ""), lim = x.critico || x.max;
          var allarme = lim && +x.valore >= lim * 0.92 ? ' class="hw-allarme"' : "";
          return "<tr" + allarme + "><td>" + esc(x.nome) + "</td><td><small>" + esc(x.chip || "") + "</small></td><td><b>" + esc(x.valore) + esc(u) + "</b></td><td>" + (e.min != null ? esc(e.min + u) : "") +
            "</td><td>" + (e.max != null ? esc(e.max + u) : "") + "</td><td>" + (lim ? esc(lim + u) : "") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    });
    return h;
  }

  /* ------------------------------------------------------------------ schede tecniche (stile CPU-Z / GPU-Z) */
  function schedaCpu(d, an) {
    var c = d.cpu || {}, a = an.cpu || {}, st = a.stima || {};
    var cache = (d.cache || []).map(function (x) { return x.livello + " " + (x.kb >= 1024 ? CD.arrotonda(x.kb / 1024, 1) + " MB" : x.kb + " KB"); }).join(" · ");
    return righe([["Nome", c.nome || a.nome], ["Produttore", c.produttore], ["Core fisici", c.core || a.fisici], ["Thread (processi in parallelo)", c.thread || a.core],
      ["Frequenza massima", c.mhz_max ? c.mhz_max + " MHz" : a.mhz ? a.mhz + " MHz" : ""], ["Zoccolo (socket)", c.socket], ["Architettura", c.bit ? c.bit + " bit" : ""],
      ["Memoria cache", cache], ["Generazione stimata", st.gen ? st.gen + "ª generazione" + (st.anno ? ", circa " + st.anno : "") : st.anno ? "circa " + st.anno : ""],
      ["Virtualizzazione", c.virtualizzazione == null ? "" : c.virtualizzazione ? "presente (serve per macchine virtuali e WSL)" : "non attiva o assente"],
      ["Istruzioni speciali", (c.istruzioni || []).join(", ")]]) +
      '<p class="piccolo-testo">Le <b>cache</b> sono piccole memorie velocissime dentro il processore; più <b>core</b> e <b>thread</b> significano più lavori insieme. Lo <b>zoccolo</b> «BGA» indica un processore saldato (tipico dei portatili): non si può cambiare.</p>';
  }
  function schedaMadre(d, an) {
    var s = d.scheda || {}, c = an.computer || {}, anno = HW.annoBios(s.bios_data || c.bios_data);
    return righe([["Computer", s.sistema || ((c.produttore || "") + " " + (c.modello || ""))], ["Scheda madre", ((s.produttore || "") + " " + (s.modello || "")).trim()], ["Revisione", s.versione],
      ["BIOS / UEFI", ((s.bios_produttore || "") + " " + (s.bios || c.bios || "")).trim()], ["Data del BIOS", anno ? anno + (CD.adesso().getFullYear() - anno >= 4 ? " — controllate se esiste un aggiornamento" : "") : ""],
      ["Avvio", (an.firmware || {}).uefi === false ? "BIOS tradizionale (Legacy)" : (an.firmware || {}).uefi ? "UEFI" + ((an.firmware || {}).secure_boot ? " con Avvio protetto" : "") : ""],
      ["TPM", (an.sicurezza || {}).tpm || (an.firmware || {}).tpm || ""]]) +
      "<h3>Slot di espansione</h3>" + tabella(["Slot", "Stato"], (d.slot || []).map(function (x) { return [x.nome, x.uso === 4 ? "occupato" : x.uso === 3 ? "libero" : "—"]; })) +
      "<h3>Porte</h3>" + tabella(["Porta", "Tipo"], (d.porte || []).map(function (p) { return [p.esterna || p.interna, p.descrizione || p.tipo]; })) +
      (CD.sistema() === "linux" && !(d.slot || []).length ? '<p class="piccolo-testo">Su Linux slot e porte si leggono con «Inventario completo» (chiede la password una volta).</p>' : "");
  }
  function schedaMemoria(d, an, s) {
    var m = d.memoria || {}, mods = m.moduli || [], mem = s.memoria || an.memoria || {};
    return righe([["Totale", mem.totale_mb ? mb(mem.totale_mb) : ""], ["In uso ora", mem.totale_mb && mem.libera_mb != null ? mb(mem.totale_mb - mem.libera_mb) : ""],
      ["Slot sulla scheda", m.slot || ""], ["Massimo supportato", m.max_gb ? m.max_gb + " GB" : ""]]) +
      "<h3>Moduli installati</h3>" + tabella(["Posizione", "Capacità", "Tipo", "Velocità", "Marca", "Codice", "Formato"], mods.filter(function (x) { return !x.vuoto; }).map(function (x) {
        return [x.posizione || x.banco, x.gb ? x.gb + " GB" : "", x.tipo, x.mhz ? x.mhz + " MT/s" : "", x.produttore, x.codice, x.formato]; })) +
      (mods.some(function (x) { return /saldat|onboard/i.test((x.formato || "") + (x.posizione || "")); }) ? '<div class="avviso att">Una parte della memoria è <b>saldata</b> sulla scheda: si può ampliare solo lo slot libero.</div>' : "") +
      (m.slot && mods.filter(function (x) { return !x.vuoto; }).length < m.slot ? '<div class="avviso ok">C\'è almeno uno slot libero: la RAM si può aumentare comprando un modulo dello stesso tipo e velocità.</div>' : "");
  }
  function schedaGrafica(d, an, s) {
    var gs = d.gpu && d.gpu.length ? d.gpu : an.gpu || [];
    return gs.map(function (g, i) {
      var vivo = (s.gpu || [])[i] || {};
      return '<div class="scheda"><b>' + esc(g.nome) + "</b>" + righe([["Memoria video", g.vram_mb ? mb(g.vram_mb) : ""], ["Driver", g.driver], ["Data del driver", g.data_driver],
        ["Schermo", g.risoluzione], ["Uso ora", vivo.uso != null ? vivo.uso + "%" : ""], ["Temperatura", vivo.temp != null ? vivo.temp + " °C" : ""],
        ["Memoria video in uso", vivo.mem_mb != null ? mb(vivo.mem_mb) : ""], ["Frequenza", vivo.mhz ? vivo.mhz + " MHz" : ""], ["Consumo", vivo.watt != null ? vivo.watt + " W" : ""]]) + "</div>";
    }).join("") || '<p class="vuoto">Nessuna scheda video letta.</p>';
  }
  function schedaDischi(d, an, s, arch) {
    var ds = d.dischi && d.dischi.length ? d.dischi : an.dischi || [];
    var h = tabella(["Disco", "Tipo", "Collegamento", "Capacità", "Firmware", "Salute"], ds.map(function (x) { return [x.nome, x.tipo, x.bus, x.gb ? x.gb + " GB" : "", x.firmware, x.salute]; }));
    h += "<h3>Spazio</h3>" + tabella(["Unità", "Libero", "Totale"], (an.spazio || []).map(function (x) { return [x.nome || x.punto, x.libero_gb + " GB", x.totale_gb + " GB"]; }));
    var v = ((arch || {}).disco || {});
    if (v.voci && v.voci.length) h += "<h3>Ultimo controllo SMART <small>(" + esc(v.quando || "") + ")</small></h3>" + CD.tabellaVoci(v.voci);
    return h;
  }
  function schedaBatteria(d, an, s) {
    var b = d.batteria, a = (an.batteria || [])[0], v = (s.batteria || [])[0];
    if (!b && !a && !v) return '<p class="vuoto">Nessuna batteria: è un computer fisso (o la batteria non è leggibile).</p>';
    var sal = a && a.salute ? a.salute : b && b.progetto_mwh ? Math.round(100 * b.piena_mwh / b.progetto_mwh) : null;
    return (sal != null ? '<div class="metri">' + CD.metro(sal, 100, "salute %") + "</div>" : "") + righe([["Modello", b ? ((b.produttore || "") + " " + (b.nome || "")).trim() : ""], ["Chimica", b && b.chimica],
      ["Capacità di progetto", b && b.progetto_mwh ? CD.arrotonda(b.progetto_mwh / 1000, 1) + " Wh" : ""], ["Capacità attuale a piena carica", b && b.piena_mwh ? CD.arrotonda(b.piena_mwh / 1000, 1) + " Wh" : ""],
      ["Salute", sal != null ? sal + "% della capacità originale" : ""], ["Cicli di carica", (b && b.cicli) || (a && a.cicli) || ""], ["Carica ora", v && v.carica != null ? v.carica + "%" : ""],
      ["Stato", v && v.stato], ["Tensione", v && v.volt ? v.volt + " V" : ""], ["Potenza", v && v.watt ? v.watt + " W" : ""]]) +
      '<p class="piccolo-testo">Una batteria al litio dura in media 500–1000 cicli. Sotto il 60% della capacità originale conviene sostituirla. Per allungarle la vita: evitate il caldo e, se possibile, tenetela tra il 20% e l\'80%.</p>';
  }
  function schedaPeriferiche(d) {
    return "<h3>Rete</h3>" + tabella(["Scheda", "Tipo", "Velocità", "Indirizzo fisico"], (d.rete || []).map(function (r) { return [r.nome, r.tipo, r.velocita_mbps ? r.velocita_mbps + " Mbit/s" : "", r.mac]; })) +
      "<h3>Audio</h3>" + tabella(["Dispositivo"], (d.audio || []).map(function (a) { return [a.nome || a]; })) +
      "<h3>USB</h3>" + tabella(["Dispositivo"], (d.usb || []).map(function (u) { return [u.nome || u]; }));
  }

  /* ------------------------------------------------------------------ pagina */
  var TAB = [["vivo", "📊 In diretta"], ["schema", "🧩 Scheda madre"], ["cpu", "⚙️ Processore"], ["memoria", "🧠 Memoria"], ["grafica", "🎮 Grafica"], ["dischi", "💽 Dischi"],
    ["batteria", "🔋 Batteria"], ["periferiche", "🔌 Rete e periferiche"], ["sensori", "🌡️ Tutti i sensori"]];
  function ferma() { if (timer) { clearTimeout(timer); timer = null; } }

  CD.registra("hardware", {
    titolo: "Hardware e sensori",
    mostra: function (el, parti) {
      var tab = parti[0] && CD.uno(TAB, function (t) { return t[0] === parti[0]; }) ? parti[0] : "vivo", stato = {};
      el.innerHTML = CD.titolo("🧬", "Hardware e sensori", "Ogni componente del computer, le temperature in diretta e lo schema della scheda madre con i punti a rischio") +
        (CD.server ? "" : '<div class="avviso att">Questa pagina ha bisogno del programma avviato sul computer (non funziona dal solo browser).</div>') +
        '<div class="riga" data-no-stampa><button class="btn" id="hw-rileggi">🔄 Rileggi tutto</button>' +
        (CD.sistema() === "linux" ? '<button class="btn" id="hw-completo">🧬 Inventario completo (slot, moduli)</button>' : '<button class="btn" id="hw-avanzati">🌡️ Sensori avanzati</button>') +
        '<button class="btn" id="hw-dischi">💽 Controlla la salute dei dischi</button><button class="btn primario" id="hw-diagnosi">🛠️ Diagnosi e lavori</button></div>' +
        '<div class="schede-tab" role="tablist">' + TAB.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + "</div>" +
        '<div id="hw-corpo"><div class="barra-progresso indeterminata"><i></i></div></div><p class="piccolo-testo" id="hw-fonte"></p>';
      var corpo = CD.$("#hw-corpo", el);
      function disegna() {
        if (!corpo.isConnected) return;
        var d = stato.det || {}, s = stato.sens || {}, an = stato.an || {};
        if (tab === "vivo") corpo.innerHTML = s.in_avvio ? '<div class="avviso">⏳ Avvio della lettura dei sensori…</div>' : panoramica(s);
        else if (tab === "sensori") corpo.innerHTML = tuttiSensori(s);
        else if (tab === "schema") {
          var m = HW.modello(d, s, an, stato.arch); HW.ultimoModello = m;
          var dis = HW.disegna(m);
          corpo.innerHTML = '<div class="avviso ' + (m.stato === "male" ? "male" : m.stato === "att" ? "att" : "ok") + '">' + (m.stato === "male" ? "⚠️ <b>Attenzione:</b> ci sono segni di un guasto in arrivo." :
            m.stato === "att" ? "Alcuni componenti vanno tenuti d'occhio." : "✔ I componenti controllati sono in salute.") + " Passate il mouse sui pezzi per i dettagli.</div>" +
            '<div class="hw-schema">' + dis.svg + "</div>" + HW.legenda(m, dis.numeri) +
            '<p class="piccolo-testo">Lo schema è <b>indicativo</b>: è disegnato dal programma con i componenti letti (' + (m.portatile ? "portatile" : "computer fisso") +
            ") e non riproduce la forma esatta della vostra scheda. Per smontare il computer seguite il manuale di servizio del produttore.</p>" +
            "<h2>Dati della scheda madre</h2>" + schedaMadre(d, an);
        }
        else corpo.innerHTML = ({ cpu: schedaCpu, memoria: schedaMemoria, grafica: schedaGrafica, dischi: schedaDischi, batteria: schedaBatteria, periferiche: schedaPeriferiche,
          schema: null }[tab] || schedaCpu)(d, an, s, stato.arch);
        CD.$("#hw-fonte", el).innerHTML = (s.prova || d.prova ? "🧪 <b>Dati di prova</b> · " : "") + (s.fonte ? "Sensori: " + esc(s.fonte) + " · " : "") + "Aggiornato alle " + CD.oraTesto();
      }
      function giro() {
        if (!corpo.isConnected) return ferma();
        HW.leggiSensori().then(function (s) { stato.sens = s; if (tab === "vivo" || tab === "sensori") disegna(); else spingiSolo(s); }, function () {})
          .then(function () { if (corpo.isConnected) timer = setTimeout(giro, 2000); });
      }
      function spingiSolo(s) { panoramica(s); }    // tiene vive le curve anche con un'altra scheda aperta
      function carica(nuovo) {
        corpo.innerHTML = '<div class="barra-progresso indeterminata"><i></i></div>';
        CD.cervello.stato("pensiero");
        HW.archivio = null;
        HW.raccogli(nuovo).then(function (r) { stato = r; CD.cervello.stato("riposo"); disegna(); ferma(); timer = setTimeout(giro, 2000); },
          function (e) { corpo.innerHTML = '<div class="avviso male">Lettura non riuscita: ' + esc(e.message) + "</div>"; CD.cervello.stato("errore"); });
      }
      CD.$$(".schede-tab button", el).forEach(function (b) {
        b.onclick = function () { tab = b.getAttribute("data-tab"); CD.$$(".schede-tab button", el).forEach(function (x) { x.setAttribute("aria-selected", x === b); }); if (stato.det) disegna(); };
      });
      CD.$("#hw-rileggi", el).onclick = function () { carica(true); };
      var av = CD.$("#hw-avanzati", el); if (av) av.onclick = function () { CD.esegui("sensori_avanzati").then(function () { carica(true); }, function () {}); };
      var co = CD.$("#hw-completo", el); if (co) co.onclick = function () { CD.esegui("hardware_completo").then(function () { carica(true); }, function () {}); };
      CD.$("#hw-dischi", el).onclick = function () {
        CD.esegui("disco_salute").then(function (j) {
          HW.leggiArchivio().then(function (a) { a.disco = { voci: j.voci, quando: CD.dataEstesa() + " " + CD.oraTesto() }; CD.salva("hardware", a); stato.arch = a; disegna(); });
        }, function () {});
      };
      CD.$("#hw-diagnosi", el).onclick = function () { CD.vai("#/interventi"); };
      if (CD.server) carica(false); else corpo.innerHTML = "";
    },
    esci: ferma
  });
})();
