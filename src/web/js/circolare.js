/* ==========================================================================
 *  CONSULENTE DIGITALE - Economia circolare e recupero dei dispositivi
 *  Percorso guidato «cosa faccio con il vecchio dispositivo?», le regole (RAEE, diritto alla riparazione,
 *  caricatore unico, ecodesign, batterie), consigli pratici, domande frequenti, quiz e il «Patto per un
 *  digitale sostenibile» da stampare. Date e norme verificate a ottobre 2026 (vedi CD.CIRC.aggiornato).
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0
 *  Ispirato al libro «Tecnologia Gentile: Informatica Sostenibile» dello stesso autore.
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var C = CD.CIRC = { aggiornato: "ottobre 2026" };

  C.numeri = [
    ["62 milioni di tonnellate", "di rifiuti elettronici prodotti nel mondo nel 2022: come 1,5 milioni di camion in fila (Global E-waste Monitor 2024, ONU)."],
    ["22%", "soltanto: la parte raccolta e riciclata in modo documentato. Il resto finisce in discariche, inceneritori o traffici illegali."],
    ["circa 3/4", "dell'impatto ambientale di un computer o di uno smartphone nasce quando viene fabbricato, non quando lo usiamo: tenerlo più a lungo è la scelta più ecologica."],
    ["oltre 60", "elementi della tavola periodica dentro uno smartphone: oro, argento, rame, cobalto, terre rare. Recuperarli vale più che estrarli di nuovo."]
  ];
  C.erre = [
    ["🧠", "Ripensa", "Mi serve davvero un dispositivo nuovo? Spesso basta una miglioria (SSD, RAM, batteria) o un sistema più leggero."],
    ["🔧", "Ripara", "Schermo, batteria, tastiera, porta di ricarica: quasi tutto si ripara. Chiedete un preventivo prima di sostituire."],
    ["♻️", "Riusa", "Un PC lento con Windows può rinascere con Linux; un vecchio telefono diventa sveglia, telecamera, lettore musicale."],
    ["🎁", "Dona o vendi", "A scuole, associazioni, parrocchie, centri anziani o a chi ne ha bisogno: prima cancellate i dati in modo sicuro."],
    ["🏷️", "Compra ricondizionato", "Controllato, pulito, con garanzia: costa meno ed evita l'impatto di un nuovo dispositivo."],
    ["🗑️", "Ricicla bene", "Solo alla fine: al centro di raccolta comunale o in negozio (RAEE), mai nel cassonetto. Le pile a parte."]
  ];
  C.regole = [
    { t: "RAEE: riconsegna in negozio «uno contro uno»", d: "Quando comprate un apparecchio nuovo, il negozio (anche online) deve ritirare gratis quello vecchio di tipo equivalente (D.Lgs. 49/2014). Chiedetelo al momento dell'acquisto o della consegna." },
    { t: "RAEE: «uno contro zero» per i piccoli apparecchi", d: "Telefoni, mouse, caricabatterie, piccoli elettrodomestici sotto i 25 cm si lasciano gratis nei negozi di elettronica con superficie di vendita di almeno 400 m², senza obbligo di comprare (DM 121/2016)." },
    { t: "Centro di raccolta comunale (isola ecologica)", d: "Accetta tutti i RAEE gratuitamente dai cittadini. Molti Comuni hanno anche il ritiro a domicilio per gli apparecchi grandi: chiedete al gestore dei rifiuti." },
    { t: "Diritto alla riparazione (direttiva UE 2024/1799)", d: "Dal 31 luglio 2026 il produttore deve offrire la riparazione di smartphone, tablet, schermi, elettrodomestici e altri prodotti anche dopo la garanzia, a un prezzo ragionevole, con ricambi e informazioni disponibili per anni e senza blocchi software contro i riparatori indipendenti. Se il prodotto viene riparato in garanzia, la garanzia si allunga di 12 mesi. In Italia il decreto che la recepisce era in approvazione nell'estate 2026: verificate se è stato pubblicato." },
    { t: "Caricatore unico USB-C (direttiva UE 2022/2380)", d: "Dal 28 dicembre 2024 telefoni, tablet, fotocamere, cuffie, console portatili ed e-reader venduti nell'UE hanno la porta USB-C; dal 28 aprile 2026 anche i portatili. Si può comprare il dispositivo senza caricatore e riusare quello che si ha." },
    { t: "Ecodesign ed etichetta di smartphone e tablet (reg. UE 2023/1670 e 2023/1669)", d: "Dal 20 giugno 2025: ricambi per 7 anni, aggiornamenti del sistema per almeno 5 anni dall'uscita dal mercato, batterie più durevoli, resistenza a cadute e acqua, ed etichetta con la classe di riparabilità (da A a E) e la durata della batteria." },
    { t: "Batterie sostituibili (reg. UE 2023/1542, art. 11)", d: "Dal 18 febbraio 2027 le batterie portatili dei dispositivi (portatili, auricolari, smartwatch, e-reader…) dovranno essere rimovibili e sostituibili dall'utente con attrezzi comuni; smartphone e tablet seguono le regole dell'ecodesign." },
    { t: "Garanzia legale anche sull'usato e sul ricondizionato", d: "Comprando da un venditore professionale la garanzia legale è di 24 mesi; per i prodotti usati può essere ridotta per accordo, ma non sotto i 12 mesi (Codice del Consumo)." }
  ];
  C.consigli = [
    { t: "Allungare la vita al computer", p: ["Disco SSD al posto di quello meccanico: sembra un PC nuovo", "Più RAM se c'è uno slot libero", "Pulizia interna e pasta termica ogni 3-5 anni", "Se Windows non è più supportato: Linux leggero (vedi «Analisi del PC»)", "Usate «Ottimizza» e «Diagnosi e interventi» di questo programma"] },
    { t: "Allungare la vita alla batteria", p: ["Tenetela tra il 20% e l'80% quando potete", "Evitate il caldo (auto al sole, letto, cuscini)", "Usate la ricarica ottimizzata se il sistema la offre", "Una batteria nuova costa molto meno di un dispositivo nuovo"] },
    { t: "Prima di donare o vendere", p: ["Copia di sicurezza di foto e documenti", "Uscite dagli account (Google, Apple, Microsoft) e togliete il blocco del dispositivo", "Ripristino completo con cancellazione dei dati (con la cifratura attiva i dati restano illeggibili)", "Togliete SIM e schede di memoria", "Allegate caricatore e un foglio con la password di accesso nuova"] },
    { t: "Comprare meglio", p: ["Ricondizionato da un venditore che dà garanzia e fattura", "Guardate la classe di riparabilità sull'etichetta (smartphone e tablet)", "Preferite marche che pubblicano ricambi e manuali di riparazione", "Più RAM e disco all'inizio = più anni di vita", "Non comprate il caricatore se ne avete già uno USB-C"] },
    { t: "Uso etico e sobrio del digitale", p: ["Streaming in qualità adatta allo schermo (non in 4K sul telefono)", "Cancellate file e foto doppie: anche il cloud consuma energia", "Spegnete del tutto il computer la sera", "Meno app e notifiche: più attenzione e più batteria", "Condividete i dispositivi in famiglia o in associazione"] },
    { t: "Riparare insieme", p: ["Cercate un Repair Café o un laboratorio di riparazione nella vostra città", "Le biblioteche e i centri anziani possono ospitare giornate di riparazione", "Chiedete ai nonni come si riparavano le cose (vedi «Nonni Teach» → tema Riuso)", "Fate imparare ai ragazzi a cambiare una batteria o un SSD"] }
  ];
  C.faq = [
    ["Posso buttare un vecchio telefono nell'indifferenziata?", "No: è un RAEE. Contiene materiali preziosi e sostanze pericolose. Va al centro di raccolta comunale o in un negozio di elettronica (uno contro zero), gratis."],
    ["Il negozio deve ritirare il mio vecchio televisore?", "Sì, se ne comprate uno nuovo equivalente: è il ritiro «uno contro uno», gratuito, anche negli acquisti online con consegna."],
    ["Le pile e le batterie dove vanno?", "Negli appositi contenitori (supermercati, tabaccai, negozi di elettronica) o al centro di raccolta. Le batterie gonfie non si forano e non si buttano: portatele subito al centro di raccolta."],
    ["Conviene riparare un portatile di 6 anni?", "Spesso sì: SSD, RAM e batteria costano poco e danno ancora anni di vita. Se il processore non regge più il lavoro, valutate un ricondizionato."],
    ["Il ricondizionato è sicuro?", "Se comprato da un venditore professionale sì: è controllato, ha la garanzia legale e spesso una batteria verificata. Diffidate di prezzi troppo bassi e venditori senza recapiti."],
    ["Come cancello davvero i dati prima di regalare il PC?", "Con il ripristino del sistema scegliendo «Rimuovi tutto» e «Pulisci l'unità» (Windows), «Inizializza contenuti e impostazioni» (Mac) o reinstallando Linux con cifratura. Con il disco cifrato basta il ripristino."],
    ["Il mio PC non può avere Windows 11: devo buttarlo?", "No! Può continuare in sicurezza con un sistema Linux, oppure con gli aggiornamenti di sicurezza estesi di Microsoft dove disponibili. La pagina «Analisi del PC» vi dice quale sistema conviene."],
    ["Cosa succede ai RAEE riciclati?", "Vengono separati: plastiche, metalli (rame, alluminio, ferro), vetro, schede elettroniche da cui si recuperano oro, argento e palladio. Le sostanze pericolose vengono messe in sicurezza."]
  ];
  C.quiz = [
    ["Dove si porta un vecchio smartphone che non funziona?", ["Nell'indifferenziata", "Al centro di raccolta o in un negozio di elettronica", "Nella plastica"], 1, "È un RAEE: centro di raccolta comunale o negozio (uno contro zero), sempre gratis."],
    ["Quanta parte dei rifiuti elettronici del mondo viene riciclata correttamente?", ["Circa un quinto", "Circa la metà", "Quasi tutti"], 0, "Il 22% nel 2022 secondo il Global E-waste Monitor dell'ONU."],
    ["Quando nasce la maggior parte dell'impatto ambientale di un portatile?", ["Quando lo usiamo", "Quando viene fabbricato", "Quando lo ricarichiamo di notte"], 1, "Circa tre quarti nella fabbricazione: per questo usarlo più a lungo conta tanto."],
    ["Comprando una lavatrice nuova, il negozio ritira quella vecchia?", ["Sì, gratis (uno contro uno)", "Solo pagando", "No, mai"], 0, "È un obbligo del D.Lgs. 49/2014, anche per gli acquisti online."],
    ["Da quando anche i portatili devono avere la ricarica USB-C nell'UE?", ["Dal 2022", "Dal 28 aprile 2026", "Dal 2030"], 1, "Telefoni e tablet dal 28 dicembre 2024, i portatili dal 28 aprile 2026."],
    ["Qual è la miglioria che allunga di più la vita a un vecchio PC con disco meccanico?", ["Un mouse nuovo", "Un disco SSD", "Uno sfondo più leggero"], 1, "L'SSD rende avvio e programmi molte volte più veloci con una spesa piccola."],
    ["Cosa fare prima di regalare il proprio telefono?", ["Niente", "Copia dei dati, uscita dagli account e ripristino completo", "Solo togliere la cover"], 1, "Così i vostri dati restano vostri e chi lo riceve può usarlo subito."],
    ["Una batteria gonfia di un portatile…", ["Si buca per sgonfiarla", "Va tolta con cautela e portata al centro di raccolta", "Si mette in freezer"], 1, "È pericolosa: non forzatela, non bucatela, portatela al centro di raccolta o a un tecnico."]
  ];
  C.patto = ["Prima di comprare mi chiedo se posso riparare o migliorare quello che ho", "Faccio durare i miei dispositivi almeno 5 anni", "Considero sempre il ricondizionato", "Porto i RAEE e le pile solo nei punti di raccolta", "Cancello i miei dati e dono ciò che funziona ancora",
    "Non compro caricatori che ho già", "Uso il digitale con sobrietà: meno sprechi, più attenzione", "Insegno ad altri a riparare e riusare"];

  /* percorso guidato: albero di decisione */
  var PERCORSO = {
    inizio: { d: "Il dispositivo funziona ancora?", s: [["Sì, funziona", "serve"], ["Funziona male o è lento", "lento"], ["No, è rotto", "rotto"]] },
    serve: { d: "Vi serve ancora?", s: [["Sì", "tieni"], ["No", "dona"]] },
    lento: { d: "Che tipo di dispositivo è?", s: [["Computer", "pc"], ["Smartphone o tablet", "tel"]] },
    rotto: { d: "Cosa si è rotto?", s: [["Schermo, batteria, tasti, porta di ricarica", "ripara"], ["Non si accende più / scheda", "tecnico"], ["Non lo so", "tecnico"]] },
    pc: { f: "💻 Prima di sostituirlo: fate «Analisi del PC» e «Diagnosi e interventi». Spesso bastano un SSD, più RAM o un sistema Linux leggero per altri anni di vita.", vai: [["#/analisi", "🔬 Analisi del PC"], ["#/interventi", "🛠️ Diagnosi"]] },
    tel: { f: "📱 Liberate spazio, aggiornate il sistema, cambiate la batteria se dura poco (costa molto meno di un telefono nuovo). Se non riceve più aggiornamenti di sicurezza, usatelo per compiti senza dati personali (sveglia, musica, telecamera) e acquistate un ricondizionato.", vai: [["#/acquisti/smartphone", "🛒 Scegliere bene"]] },
    tieni: { f: "🌱 Ottimo: farlo durare è la scelta più ecologica. Proteggetelo con cover, aggiornamenti e un occhio alla batteria.", vai: [["#/ottimizza", "🚀 Ottimizza"]] },
    dona: { f: "🎁 Donatelo o vendetelo: scuole, associazioni, centri anziani, famiglie. Prima: copia dei dati, uscita dagli account, ripristino completo.", vai: [["#/sapere", "💡 Come cancellare i dati"]] },
    ripara: { f: "🔧 Si ripara! Chiedete un preventivo a un centro assistenza o a un riparatore indipendente; per smartphone e tablet il produttore deve offrire la riparazione anche dopo la garanzia (diritto alla riparazione). Valutate anche un Repair Café.", vai: [] },
    tecnico: { f: "🩺 Fatelo controllare da un tecnico: spesso il guasto è nell'alimentatore o in un componente sostituibile. Se non conviene ripararlo, recuperate i dati dal disco e portatelo al centro di raccolta RAEE.", vai: [] }
  };

  /* ------------------------------------------------------------------ pagina */
  var TAB = [["percorso", "🧭 Cosa ne faccio?"], ["regole", "📜 Regole e diritti"], ["consigli", "💡 Consigli"], ["domande", "❓ Domande"], ["quiz", "🧠 Quiz"], ["patto", "🤝 Il mio patto"]];
  CD.registra("circolare", {
    titolo: "Economia circolare",
    mostra: function (el, parti) {
      var tab = parti[0] && CD.uno(TAB, function (t) { return t[0] === parti[0]; }) ? parti[0] : "percorso";
      el.innerHTML = CD.titolo("♻️", "Economia circolare e recupero", "Riparare, riusare, donare e riciclare bene computer, telefoni ed elettronica: per risparmiare e rispettare il pianeta") +
        '<div class="circ-numeri">' + C.numeri.map(function (n) { return "<div><b>" + esc(n[0]) + "</b><span>" + esc(n[1]) + "</span></div>"; }).join("") + "</div>" +
        '<div class="schede-tab" role="tablist">' + TAB.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + "</div><div id=\"ci-corpo\"></div>" +
        '<p class="piccolo-testo">Informazioni aggiornate a ' + C.aggiornato + '. Le norme cambiano: per i dettagli consultate il vostro Comune, il Centro di Coordinamento RAEE e le pagine ufficiali dell\'Unione europea. Per approfondire: il libro «Tecnologia Gentile: Informatica Sostenibile» di Danilo D\'Auria.</p>';
      CD.$$("[data-tab]", el).forEach(function (b) { b.onclick = function () { CD.vai("#/circolare/" + b.getAttribute("data-tab")); }; });
      var c = CD.$("#ci-corpo", el);
      if (tab === "percorso") percorso(c, "inizio", []);
      else if (tab === "regole") c.innerHTML = '<div class="griglia-2">' + C.regole.map(function (r) { return '<div class="scheda"><h3>' + esc(r.t) + "</h3><p>" + esc(r.d) + "</p></div>"; }).join("") + "</div>";
      else if (tab === "consigli") c.innerHTML = '<div class="circ-erre">' + C.erre.map(function (r) { return '<div class="tessera"><span class="em">' + r[0] + "</span><b>" + esc(r[1]) + "</b><small>" + esc(r[2]) + "</small></div>"; }).join("") + "</div>" +
        '<div class="griglia-2">' + C.consigli.map(function (k) { return '<div class="scheda"><h3>' + esc(k.t) + "</h3><ul>" + k.p.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"; }).join("") + "</div>";
      else if (tab === "domande") c.innerHTML = C.faq.map(function (f) { return '<details class="scheda"><summary><b>' + esc(f[0]) + "</b></summary><p>" + esc(f[1]) + "</p></details>"; }).join("");
      else if (tab === "quiz") quiz(c);
      else patto(c);
    }
  });

  function percorso(c, nodo, storia) {
    var n = PERCORSO[nodo];
    var h = '<div class="scheda luce circ-percorso">' + (storia.length ? '<p class="piccolo-testo">' + storia.map(esc).join(" → ") + "</p>" : "");
    if (n.s) h += "<h3>" + esc(n.d) + '</h3><div class="opzioni">' + n.s.map(function (s, i) { return '<button class="btn grande" data-s="' + i + '">' + esc(s[0]) + "</button>"; }).join("") + "</div>";
    else h += '<div class="neura-dice"><span>🧠</span><div><p>' + esc(n.f) + "</p></div></div>" + '<div class="riga">' + n.vai.map(function (v) { return '<a class="btn primario" href="' + v[0] + '">' + esc(v[1]) + "</a>"; }).join("") +
      '<button class="btn" id="ci-ricomincia">↺ Ricomincia</button></div>';
    c.innerHTML = h + "</div>";
    CD.$$("[data-s]", c).forEach(function (b) { b.onclick = function () { var s = n.s[+b.getAttribute("data-s")]; percorso(c, s[1], storia.concat([s[0]])); }; });
    var r = CD.$("#ci-ricomincia", c); if (r) r.onclick = function () { percorso(c, "inizio", []); };
    if (n.f && CD.imp.voce && CD.parla) CD.parla(n.f.replace(/^\S+\s/, ""));
  }
  function quiz(c) {
    var i = 0, punti = 0, ordine = C.quiz.slice().sort(function () { return Math.random() - 0.5; });
    function mostra() {
      if (i >= ordine.length) {
        c.innerHTML = '<div class="scheda luce"><h3>Risultato: ' + punti + " su " + ordine.length + "</h3><p>" + (punti >= ordine.length - 1 ? "🌍 Bravissimi: siete ambasciatori dell'economia circolare!" : punti >= ordine.length / 2 ? "👍 Buon risultato: date un'occhiata ai consigli." : "🌱 Ogni quiz è un passo: leggete «Regole e diritti» e riprovate.") +
          '</p><button class="btn primario" id="ci-ancora">↺ Rifai il quiz</button></div>';
        CD.$("#ci-ancora", c).onclick = function () { quiz(c); };
        return;
      }
      var q = ordine[i];
      c.innerHTML = '<div class="scheda luce"><small>Domanda ' + (i + 1) + " di " + ordine.length + "</small><h3>" + esc(q[0]) + '</h3><div class="opzioni">' +
        q[1].map(function (r, k) { return '<button class="btn" data-r="' + k + '">' + esc(r) + "</button>"; }).join("") + '</div><div id="ci-sp"></div></div>';
      CD.$$("[data-r]", c).forEach(function (b) {
        b.onclick = function () {
          var k = +b.getAttribute("data-r"), giusto = k === q[2];
          if (giusto) punti++;
          CD.$$("[data-r]", c).forEach(function (x) { x.disabled = true; if (+x.getAttribute("data-r") === q[2]) x.classList.add("primario"); });
          CD.$("#ci-sp", c).innerHTML = '<div class="avviso ' + (giusto ? "ok" : "att") + '">' + (giusto ? "✔ Esatto! " : "✖ Non proprio. ") + esc(q[3]) + '</div><button class="btn primario" id="ci-avanti">Avanti ▶</button>';
          CD.$("#ci-avanti", c).onclick = function () { i++; mostra(); };
        };
      });
    }
    mostra();
  }
  function patto(c) {
    CD.carica("circolare").then(function (d) {
      d = d || { patto: [], nome: "" };
      c.innerHTML = '<div class="scheda luce"><h3>🤝 Patto per un digitale sostenibile</h3><p>Scegliete gli impegni che volete prendere: per voi, per la classe, per il centro o per l\'azienda. Poi stampatelo e appendetelo!</p>' +
        '<label>Chi firma<input id="ci-nome" value="' + esc(d.nome || (CD.profilo && CD.profilo.nome) || "") + '" placeholder="es. Classe 5ª A, Centro anziani San Lorenzo"></label>' +
        C.patto.map(function (p, i) { return '<label class="opzione"><input type="checkbox" data-p="' + i + '"' + (d.patto.indexOf(i) >= 0 ? " checked" : "") + "> " + esc(p) + "</label>"; }).join("<br>") +
        '<div class="riga"><button class="btn primario" id="ci-stampa">🖨️ Stampa il patto</button></div></div>';
      function salva() { d.nome = CD.$("#ci-nome", c).value; d.patto = CD.$$("[data-p]", c).filter(function (x) { return x.checked; }).map(function (x) { return +x.getAttribute("data-p"); }); CD.salva("circolare", d); }
      CD.$$("input", c).forEach(function (x) { x.onchange = salva; });
      CD.$("#ci-stampa", c).onclick = function () {
        salva();
        var scelti = d.patto.length ? d.patto : C.patto.map(function (_, i) { return i; });
        CD.stampa("Patto per un digitale sostenibile", '<p class="f-grande">' + (d.nome ? "<b>" + esc(d.nome) + "</b> si impegna a:" : "Ci impegniamo a:") + '</p><ol class="f-linea f-grande">' +
          scelti.map(function (i) { return "<li>" + esc(C.patto[i]) + "</li>"; }).join("") + "</ol>" +
          "<h2>Le 6 R</h2><ul>" + C.erre.map(function (r) { return "<li><b>" + r[0] + " " + esc(r[1]) + "</b>: " + esc(r[2]) + "</li>"; }).join("") + "</ul>" +
          '<div class="f-firme"><div>Data<br><br>________________________</div><div>Firma<br><br>________________________</div></div>', { codice: CD.codiceScheda() });
      };
    });
  }

  /* ricerca globale */
  if (CD.cerca && CD.cerca.fonte) CD.cerca.fonte(function () {
    return C.regole.map(function (r) { return { gruppo: "Economia circolare", icona: "♻️", titolo: r.t, testo: r.d, vai: "#/circolare/regole" }; })
      .concat(C.faq.map(function (f) { return { gruppo: "Economia circolare", icona: "❓", titolo: f[0], testo: f[1], vai: "#/circolare/domande" }; }));
  });
  /* testo per Neura (domande senza IA) */
  C.risposta = function (n) {
    var f = CD.uno(C.faq, function (x) { return CD.neura.norm(x[0]).split(" ").filter(function (w) { return w.length > 4 && n.indexOf(w) >= 0; }).length >= 2; });
    return f ? f[1] : "Prima di buttare: ripensa, ripara, riusa, dona o vendi, compra ricondizionato e solo alla fine ricicla al centro di raccolta RAEE (gratis, anche in negozio). Vi guido passo passo.";
  };
})();
