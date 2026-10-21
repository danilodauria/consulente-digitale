/* ==========================================================================
 *  CONSULENTE DIGITALE - Neura, il cervello che conversa
 *  Come risponde (in quest'ordine):
 *   1. COMANDI E INTENZIONI riconosciuti sul computer, anche senza IA: ora esatta, analisi del PC,
 *      aggiornamenti, ottimizzazione, cosa comprare e quando, impostazioni («parla più piano»…);
 *   2. IA LOCALE (Ollama): conversazione libera, con il contesto di data e ora, profilo, hardware,
 *      pagina aperta e le schede «Cose da sapere» più pertinenti. Può proporre azioni con
 *      [[azione:ID]] e pagine con [[vai:PAGINA]]: diventano pulsanti, mai azioni automatiche che cambiano il PC;
 *   3. senza IA: le risposte della guida interna (parole chiave) e le soluzioni ai problemi frequenti.
 *  JavaScript puro (ES5). Ideato e sviluppato da Danilo D'Auria - Codice MIT, personaggio CC BY-NC-SA 4.0
 * ========================================================================== */
(function () {
  "use strict";
  var CD = window.CD, esc = CD.esc;
  var N = CD.neura = { storia: [], ia: { attivo: false, modelli: [], consigliato: "" }, occupata: false, paginaAperta: "inizio" };
  var MAX_STORIA = 60;

  /* ------------------------------------------------------------------ testo */
  function norm(t) {
    t = String(t || "").toLowerCase();
    try { t = t.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) { /* browser vecchio */ }
    return t.replace(/[’']/g, " ").replace(/\s+/g, " ").trim();
  }
  N.norm = norm;
  function markdown(t) {
    var h = esc(t);
    h = h.replace(/```([\s\S]*?)```/g, function (m, c) { return '<pre class="codice">' + c.replace(/^\w*\n/, "") + "</pre>"; });
    h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<i>$2</i>");
    h = h.replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    var righe = h.split("\n"), out = [], lista = null;
    righe.forEach(function (r) {
      var m = r.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/);
      if (m) { if (!lista) { lista = /^\s*\d/.test(r) ? "ol" : "ul"; out.push("<" + lista + ">"); } out.push("<li>" + m[1] + "</li>"); return; }
      if (lista) { out.push("</" + lista + ">"); lista = null; }
      var t2 = r.match(/^#{1,4}\s+(.*)/);
      if (t2) { out.push("<b>" + t2[1] + "</b>"); return; }
      if (r.trim()) out.push("<p>" + r + "</p>");
    });
    if (lista) out.push("</" + lista + ">");
    return out.join("");
  }

  /* ------------------------------------------------------------------ comandi nelle risposte: [[azione:id|param]] [[vai:pagina]] */
  function estraiComandi(t) {
    var comandi = [];
    var pulito = String(t || "").replace(/\[\[\s*(azione|vai|apri)\s*:\s*([a-z_\-\/]+)(?:\|([^\]]*))?\s*\]\]/gi, function (m, tipo, id, param) {
      tipo = tipo.toLowerCase();
      if (tipo === "azione" && CD.azioni[id]) comandi.push({ tipo: "azione", id: id, param: param || "", etichetta: CD.azioni[id].icona + " " + CD.azioni[id].titolo });
      if (tipo === "apri" && CD.aperture && CD.aperture.voce(id)) comandi.push({ tipo: "apri", id: id, etichetta: "🪟 Apri " + CD.aperture.voce(id).titolo });
      if (tipo === "vai" && CD.viste[id.split("/")[0]]) comandi.push({ tipo: "vai", hash: "#/" + id, etichetta: "➜ Apri «" + (CD.viste[id.split("/")[0]].titolo || id) + "»" });
      return "";
    });
    return { testo: pulito.replace(/\n{3,}/g, "\n\n").trim(), comandi: comandi };
  }

  /* ------------------------------------------------------------------ conversazione e disegno */
  function aggiungi(chi, testo, extra) {
    var m = { chi: chi, testo: testo, comandi: (extra && extra.comandi) || [], quando: Date.now(), id: "m" + Date.now() + Math.random().toString(36).slice(2, 6) };
    N.storia.push(m);
    if (N.storia.length > MAX_STORIA) N.storia.splice(0, N.storia.length - MAX_STORIA);
    disegnaTutte();
    salvaStoria();
    return m;
  }
  var tSalva = null;
  function salvaStoria() { clearTimeout(tSalva); tSalva = setTimeout(function () { CD.salva("cronologia", N.storia.slice(-40)); }, 800); }
  function htmlMessaggio(m) {
    var bottoni = (m.comandi || []).map(function (c, i) { return '<button class="btn piccolo ' + (i === 0 ? "primario" : "") + '" data-cmd="' + m.id + ":" + i + '">' + esc(c.etichetta) + "</button>"; }).join("");
    return '<div class="msg msg-' + m.chi + '" id="' + m.id + '">' + (m.chi === "neura" ? '<span class="msg-io" aria-hidden="true">🧠</span>' : "") +
      '<div class="msg-corpo">' + (m.chi === "neura" ? markdown(m.testo) : "<p>" + esc(m.testo) + "</p>") + (bottoni ? '<div class="msg-azioni">' + bottoni + "</div>" : "") + "</div></div>";
  }
  function disegna(box) {
    if (!box) return;
    if (!N.storia.length) { box.innerHTML = '<div class="vuoto">Chiedetemi qualsiasi cosa: <i>«il mio computer è lento»</i>, <i>«che portatile compro?»</i>, <i>«ci sono aggiornamenti?»</i></div>'; return; }
    box.innerHTML = N.storia.map(htmlMessaggio).join("");
    box.scrollTop = box.scrollHeight;
  }
  function disegnaTutte() { CD.$$(".chat").forEach(disegna); }
  N.disegna = disegna;
  function aggiornaMessaggio(m) {
    CD.$$("#" + m.id).forEach(function (el) {
      var nuovo = document.createElement("div"); nuovo.innerHTML = htmlMessaggio(m);
      el.parentNode.replaceChild(nuovo.firstChild, el);
    });
    CD.$$(".chat").forEach(function (b) { b.scrollTop = b.scrollHeight; });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-cmd]") : null;
    if (!b) return;
    var p = b.getAttribute("data-cmd").split(":"), m = CD.uno(N.storia, function (x) { return x.id === p[0]; });
    if (!m) return;
    var c = m.comandi[+p[1]];
    if (!c) return;
    if (c.tipo === "azione") CD.esegui(c.id, c.param).catch(function () {});
    else if (c.tipo === "vai") CD.vai(c.hash);
    else if (c.tipo === "apri" && CD.aperture) CD.aperture.chiedi(c.id);
    else if (c.tipo === "url") CD.apriLink(c.url);
    else if (c.tipo === "fn" && c.fn) c.fn();
  });

  /* ------------------------------------------------------------------ guida interna (senza IA) */
  function cercaGuida(q) {
    var n = norm(q), migliori = [];
    function valuta(item, tipo) {
      var p = 0;
      (item.parole || []).forEach(function (k) { var kk = norm(k); if (n.indexOf(kk) >= 0) p += 2 + kk.split(" ").length; });
      if (n.indexOf(norm(item.titolo)) >= 0) p += 4;
      if (p) migliori.push({ p: p, item: item, tipo: tipo });
    }
    (CD.SAPERE || []).forEach(function (s) { valuta(s, "sapere"); });
    (CD.PROBLEMI || []).forEach(function (s) { valuta(s, "problema"); });
    (CD.GLOSSARIO || []).forEach(function (g) { var t = norm(g[0].split("(")[0]); if (t.length > 2 && new RegExp("\\b" + t.replace(/[^a-z0-9 ]/g, "") + "\\b").test(n)) migliori.push({ p: 3, item: { titolo: g[0], sintesi: g[1] }, tipo: "glossario" }); });
    migliori.sort(function (a, b) { return b.p - a.p; });
    return migliori;
  }
  N.cercaGuida = cercaGuida;
  function rispostaGuida(r) {
    var it = r.item, testo, comandi = [];
    if (r.tipo === "problema") {
      testo = "**" + it.titolo + "**: ecco cosa fare.\n" + it.passi.map(function (p, i) { return (i + 1) + ". " + p; }).join("\n");
      (it.azioni || []).forEach(function (id) { if (CD.azioni[id]) comandi.push({ tipo: "azione", id: id, etichetta: CD.azioni[id].icona + " " + CD.azioni[id].titolo }); });
    } else if (r.tipo === "sapere") {
      testo = "**" + it.titolo + "**\n" + it.sintesi + "\n" + it.punti.map(function (p) { return "- " + p; }).join("\n");
      comandi.push({ tipo: "vai", hash: "#/sapere/" + it.id, etichetta: "💡 Leggi la scheda completa" });
    } else {
      testo = "**" + it.titolo + "**: " + it.sintesi;
    }
    return { testo: testo, comandi: comandi };
  }

  /* ------------------------------------------------------------------ intenzioni riconosciute sul computer */
  var DISPOSITIVI = [["portatile", /portatil|notebook|laptop|macbook/], ["fisso", /\b(pc|computer) fisso|desktop|torre\b/], ["minipc", /mini ?pc/],
    ["tablet", /tablet|ipad/], ["smartphone", /telefon|smartphone|cellulare|iphone|android/], ["tv", /\btv\b|televisor|smart ?tv/], ["monitor", /monitor|schermo/],
    ["stampante", /stampant/], ["ereader", /e-?reader|kindle|kobo|libri digitali/]];
  function dispositivoIn(n) { var d = CD.uno(DISPOSITIVI, function (x) { return x[1].test(n); }); return d ? d[0] : ""; }
  function saluto() { var h = CD.adesso().getHours(); return h < 5 ? "Buonanotte" : h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera"; }
  function nome() { return CD.imp.nomeUtente || (CD.profilo && CD.profilo.tipo === "persona" ? CD.profilo.nome : "") || ""; }

  var INTENZIONI = [
    { r: /^(ciao|salve|buongiorno|buonasera|buon pomeriggio|hey|ehi)\b/, f: function () {
      return { testo: saluto() + (nome() ? ", " + nome() : "") + "! Sono Neura. Posso analizzare il computer, cercare aggiornamenti, ottimizzarlo o aiutarvi a scegliere cosa comprare. Da dove cominciamo?",
        comandi: [{ tipo: "vai", hash: "#/analisi", etichetta: "🔬 Analizza il PC" }, { tipo: "vai", hash: "#/acquisti", etichetta: "🛒 Cosa comprare" }] }; } },
    { r: /^(per favore |puoi |potresti |mi )?(apri|aprimi|apra|mostrami|fammi vedere|avvia|lancia|fai partire)\b/, f: function (n) {
      if (!CD.server || !CD.aperture) return null;
      return CD.aperture.carica().then(function () {
        var a = CD.aperture.trova(n);
        if (!a) return null;
        CD.aperture.chiedi(a.id);
        return { testo: "Apro **" + a.titolo + "**" + (CD.aperture.sessione ? "." : ": confermate con «Consenti» nel riquadro in alto.") + " " + a.descrizione + "." };
      }); } },
    { r: /(chi sei|come ti chiami|cosa sai fare|cosa puoi fare|presentati)/, f: function () {
      return { testo: "Sono **Neura**, il cervello digitale del Consulente Digitale, ideato da Danilo D'Auria. Penso direttamente su questo computer" +
        (N.ia.attivo ? " con l'intelligenza artificiale locale (" + esc(N.modello()) + "): quello che mi dite non esce da qui." : ": per conversare di tutto mi serve il motore di IA locale, che si installa con un clic.") +
        "\nSo fare:\n- 🔬 analizzare il computer e consigliare il sistema operativo migliore\n- ⬇️ cercare e installare aggiornamenti e driver\n- 🚀 ottimizzare e riparare Windows, Linux e macOS\n- 🛒 consigliare cosa comprare e **il momento migliore** per farlo\n- 💡 spiegare le cose importanti, con calma",
        comandi: N.ia.attivo ? [] : [{ tipo: "vai", hash: "#/impostazioni/ia", etichetta: "🧠 Installa il cervello (IA locale)" }] }; } },
    { r: /(grazie|ti ringrazio|gentilissima|bravissima|sei brava)/, f: function () {
      CD.cervello.stato("felice");
      return { testo: ["Con piacere!", "Grazie a voi, è bello aiutare.", "Quando volete, sono qui."][Math.floor(Math.random() * 3)] }; } },
    { r: /(che ore sono|che ora e|ora esatta|che giorno e|che giorno siamo|che data e|data di oggi)/, f: function () {
      var d = CD.adesso(), s = CD.oraSync;
      return { testo: "Sono le **" + CD.oraTesto(d) + "** di " + CD.dataEstesa(d) + "." +
        (s ? " L'ora è sincronizzata con " + s.fonte + (Math.abs(s.scarto_s) >= 1 ? " (l'orologio del computer era " + (s.scarto_s > 0 ? "avanti" : "indietro") + " di " + CD.arrotonda(Math.abs(s.scarto_s), 1) + " secondi)." : ": l'orologio del computer è preciso.")
          : " Uso l'orologio del computer.") + (CD.acquisti && CD.acquisti.prossimoEvento ? "\n" + CD.acquisti.prossimoEvento() : "") }; } },
    { r: /(parla piu piano|piu lentamente|rallenta la voce)/, f: function () { CD.imp.velocitaVoce = Math.max(0.6, (CD.imp.velocitaVoce || 1) - 0.15); CD.salvaImpostazioni(); return { testo: "Va bene, parlo più piano." }; } },
    { r: /(parla piu veloce|piu velocemente|accelera la voce)/, f: function () { CD.imp.velocitaVoce = Math.min(1.6, (CD.imp.velocitaVoce || 1) + 0.15); CD.salvaImpostazioni(); return { testo: "D'accordo, parlo un po' più veloce." }; } },
    { r: /^(zitta|silenzio|stai zitta|basta parlare|non parlare|spegni la voce)/, f: function () { CD.imp.voce = false; CD.salvaImpostazioni(); CD.taci(); return { testo: "Va bene, da ora rispondo solo per iscritto. Per riattivare la voce premete 🔇 in alto.", muto: true }; } },
    { r: /(accendi la voce|parla di nuovo|riattiva la voce)/, f: function () { CD.imp.voce = true; CD.salvaImpostazioni(); return { testo: "Eccomi, vi sento e vi parlo di nuovo!" }; } },
    { r: /(tema (chiaro|giorno)|sfondo chiaro|modalita chiara)/, f: function () { CD.imp.tema = "giorno"; CD.salvaImpostazioni(); return { testo: "Fatto: tema chiaro." }; } },
    { r: /(tema (scuro|notte)|sfondo scuro|modalita scura)/, f: function () { CD.imp.tema = "notte"; CD.salvaImpostazioni(); return { testo: "Fatto: tema notte." }; } },
    { r: /(alto contrasto|vedo poco|caratteri piu grandi|testo piu grande|ingrandisci)/, f: function () {
      CD.imp.testo = Math.min(26, (CD.imp.testo || 18) + 2); CD.salvaImpostazioni(); return { testo: "Ho ingrandito il testo. Se serve ancora più contrasto dite «alto contrasto» o usate il pulsante 🌓 in alto." }; } },
    { r: /(temperatur|sensori|quanto scalda|si scalda|surriscald|ventola|hwinfo|cpu-?z|gpu-?z|scheda madre|componenti (del|interni)|che processore|che scheda video)/, f: function () {
      if (!CD.server) return null;
      return CD.hw.raccogli().then(function (r) {
        var m = r.modello, pr = m.componenti.filter(function (c) { return c.problemi.length; }), t = CD.uno(m.componenti, function (c) { return c.id === "cpu"; });
        return { testo: (t && t.valore ? "Il processore è a **" + t.valore + "**. " : "") + (pr.length ? "Ci sono " + pr.length + " punti da tenere d'occhio:\n" +
          pr.slice(0, 4).map(function (c) { return "- **" + c.nome + "**: " + c.problemi[0]; }).join("\n") : "I componenti che riesco a controllare sono in salute."),
          comandi: [{ tipo: "vai", hash: "#/hardware", etichetta: "🧬 Sensori in diretta" }, { tipo: "vai", hash: "#/hardware/schema", etichetta: "🧩 Schema della scheda madre" }] };
      }); } },
    { r: /(notizi|novita (del|dal) mondo|ultime (news|novita)|\bnews\b|cosa c e di nuovo|telegiornale della tecnologia)/, nonSe: /(aggiorn|programma|versione)/, f: function () {
      if (!CD.imp.notizie) return { testo: "Le notizie sono disattivate. Le riattivo quando volete.", comandi: [{ tipo: "fn", fn: function () { CD.imp.notizie = true; CD.salvaImpostazioni(); CD.vai("#/notizie"); }, etichetta: "📰 Riattiva le notizie" }] };
      return CD.notizie.titoli(3).then(function (l) {
        return { testo: l.length ? "Ecco le ultime notizie scelte per voi:\n" + l.map(function (n) { return "- **" + n.titolo + "** (" + n.fonte + ")"; }).join("\n") : "Per ora non ho notizie nuove.",
          comandi: [{ tipo: "vai", hash: "#/notizie", etichetta: "📰 Tutte le notizie" }] };
      }, function () { return { testo: "Non riesco a raggiungere i siti delle notizie in questo momento.", comandi: [{ tipo: "vai", hash: "#/notizie", etichetta: "📰 Apri le notizie" }] }; }); } },
    { r: /(\breset\b|azzera|cancella (tutto|i nomi|l ultima)|ricomincia da capo|backup|copia di sicurezza dei (miei )?dati|importa(re)? (il|un) backup)/, f: function (n) {
      if (/backup|copia di sicurezza|importa/.test(n) && !/reset|azzera|cancella/.test(n)) return { testo: "Posso salvare tutti i vostri dati in un file **.cdbackup** da reimportare qui o su un altro computer (Windows, Linux o macOS).",
        comandi: [{ tipo: "fn", fn: function () { CD.backup.crea(false); }, etichetta: "💾 Crea il backup" }, { tipo: "fn", fn: CD.backup.scegliFile, etichetta: "📥 Importa un backup" }] };
      return { testo: "Con il **reset** scegliete cosa azzerare: l'ultima domanda, i nomi rimasti, la conversazione oppure tutto. Prima vi propongo un backup, così non si perde nulla.",
        comandi: [{ tipo: "fn", fn: function () { CD.backup.reset(); }, etichetta: "🧹 Reset…" }] }; } },
    { r: /(raee|economia circolare|smaltir|buttare (il|un|i|la|le|lo) (vecchio|vecchia|vecchi|pc|computer|telefon|cellulare|tablet|televisor|tv|pile|batteri)|riciclar|ricondizionat|diritto alla riparazione|isola ecologica|centro di raccolta|donare (il|un) (pc|computer|telefono)|rifiuti elettronici)/, f: function (n) {
      return { testo: CD.CIRC.risposta(n), comandi: [{ tipo: "vai", hash: "#/circolare", etichetta: "♻️ Cosa ne faccio? (percorso guidato)" }, { tipo: "vai", hash: "#/circolare/regole", etichetta: "📜 Regole e diritti" }] }; } },
    { r: /(nonni teach|intervist\w* (a |al |alla |i |il |la )?(nonn|anzian)|podcast|registrare i ricordi|memoria del quartiere)/, f: function () {
      return { testo: "Nonni Teach si è trasferito nel Professore Digitale, il programma gratuito di Danilo D'Auria per imparare a usare il computer: lì sono sempre io a fare le domande ai nonni e a preparare il podcast. Le interviste registrate qui restano sul computer e il Professore le copia con un clic.",
        comandi: [{ tipo: "url", url: CD.PROFESSORE_URL, etichetta: "🌐 Il Professore Digitale" }, { tipo: "fn", fn: function () { if (CD.backup) CD.backup.crea(true); }, etichetta: "💾 Backup con le registrazioni" }] }; } },
    { r: /(diagnosi|guast|si e rotto|lavori da (fare|eseguire)|scheda (lavori|intervento)|riparazione completa)/, f: function () {
      if (!CD.server) return null;
      return { testo: "Faccio la diagnosi completa: leggo sensori e componenti, trovo i problemi e preparo l'elenco dei lavori da eseguire, con le schede da stampare (diagnosi e lavori eseguiti).",
        comandi: [{ tipo: "vai", hash: "#/interventi", etichetta: "🛠️ Diagnosi e interventi" }] }; } },
    { r: /(analizza|analisi|com e il mio (pc|computer)|che computer ho|caratteristiche del (pc|computer)|scheda tecnica|quanta ram)/, f: function () {
      if (!CD.server) return { testo: "Per analizzare un computer devo essere installata su quel computer. Dal telefono posso aiutarvi a scegliere cosa comprare." };
      return CD.analisi.dati().then(function (r) {
        return { testo: CD.analisi.riassunto(r), comandi: [{ tipo: "vai", hash: "#/analisi", etichetta: "🔬 Analisi completa e scheda da stampare" }] };
      }); } },
    { r: /(quale sistema operativo|che sistema operativo|sistema operativo (migliore|consigliato)|conviene (linux|windows)|passare a (linux|windows 11)|windows 11 (si puo|compatibile))/, f: function () {
      if (!CD.server) return null;
      return CD.analisi.dati().then(function (r) {
        var c = CD.analisi.consigliaSistemi(r), p = c[0];
        return { testo: "Per questo computer consiglio **" + p.nome + "**: " + p.perche.join("; ") + "." + (c[1] ? "\nIn alternativa: **" + c[1].nome + "** (" + c[1].perche[0] + ")." : ""),
          comandi: [{ tipo: "vai", hash: "#/analisi/sistemi", etichetta: "🧭 Confronta i sistemi operativi" }] };
      }); } },
    { r: /(chris titus|winutil|linutil)/, f: function () {
      var id = CD.sistema() === "windows" ? "winutil" : CD.sistema() === "linux" ? "linutil" : "";
      if (!id || !CD.azioni[id]) return { testo: "Lo strumento di Chris Titus esiste per Windows (WinUtil) e Linux (LinUtil). Su questo sistema non è disponibile, ma la pagina Ottimizza ha script equivalenti." };
      return { testo: "Lo strumento di **Chris Titus Tech** è ottimo per chi è un po' esperto: installa programmi, toglie il superfluo e ripara Windows Update. Si apre in una finestra sua. Vi consiglio prima un punto di ripristino.",
        comandi: [{ tipo: "azione", id: "punto_ripristino", etichetta: "🛟 Prima il punto di ripristino" }, { tipo: "azione", id: id, etichetta: "🧰 Apri " + CD.azioni[id].titolo }] }; } },
    { r: /((aggiorna|aggiornament|nuova versione)\w* (del |il |questo )?(programma|consulente digitale|consulente|neura|te stessa)|versione del (programma|consulente)|scarica gli aggiornamenti del programma)/, f: function () {
      return { testo: "Sono alla versione **" + (CD.stato.versione || CD.versione) + "**. Controllo il sito ufficiale solo quando me lo chiedete: se c'è una versione nuova la scarico, verifico l'impronta di sicurezza e la installo, senza toccare i vostri dati.",
        comandi: [{ tipo: "vai", hash: "#/programma", etichetta: "🔄 Scarica gli aggiornamenti" }] }; } },
    { r: /(aggiorna|aggiornament|update|nuova versione)/, nonSe: /(perche|cosa sono|a cosa serv)/, f: function (n) {
      if (!CD.server) return null;
      var comandi = [{ tipo: "azione", id: "aggiornamenti_cerca", etichetta: "🔎 Cerca aggiornamenti" }, { tipo: "vai", hash: "#/aggiornamenti", etichetta: "⬇️ Pagina aggiornamenti" }];
      if (/driver|periferic/.test(n)) comandi.unshift({ tipo: "azione", id: "driver_cerca", etichetta: "🧩 Controlla i driver" });
      if (CD.imp.automatico && /(cerca|controlla|ci sono|verifica)/.test(n)) {
        setTimeout(function () { CD.esegui(/driver/.test(n) ? "driver_cerca" : "aggiornamenti_cerca", "", { senzaConferma: true }).catch(function () {}); }, 600);
        return { testo: "Controllo subito, dalle fonti ufficiali di " + CD.nomeSistema() + ". Non cambio nulla: vi dico solo cosa c'è." };
      }
      return { testo: "Posso cercare gli aggiornamenti del sistema, dei programmi, dei driver e del firmware, tutto dalle fonti ufficiali. Prima cerco, poi decidete voi cosa installare.", comandi: comandi }; } },
    { r: /(driver|periferic|stampante non|non funziona (il|la) (wifi|audio|scheda))/, f: function () {
      if (!CD.server) return null;
      return { testo: "Controllo i dispositivi senza driver, i driver nuovi disponibili e lo strumento ufficiale del produttore del vostro computer.", comandi: [{ tipo: "azione", id: "driver_cerca", etichetta: "🧩 Controlla driver e periferiche" }] }; } },
    { r: /(quando (conviene )?comprare|momento migliore|offert|black friday|saldi|prime day|sconti)/, f: function (n) {
      var d = dispositivoIn(n);
      if (!CD.acquisti) return null;
      return { testo: CD.acquisti.testoMomento(d), comandi: [{ tipo: "vai", hash: "#/acquisti/" + (d || ""), etichetta: "🛒 Apri la guida all'acquisto" }] }; } },
    { r: /(compra|comprare|acquist|consigli(a|ami|ate)? (un|una|il|la)|quale (portatile|computer|pc|tablet|telefono|smartphone|tv|televisore|monitor|stampante)|devo prendere|regalare)/, f: function (n) {
      var d = dispositivoIn(n);
      return { testo: d ? "Vi aiuto a scegliere " + CD.ACQ.dispositivi[d].nome.toLowerCase() + " con poche domande: per chi è, per cosa lo userete e quanto volete spendere. Alla fine vi dico anche **quando** conviene comprarlo." :
        "Volentieri! Cosa volete comprare? Computer, tablet, smartphone, TV, monitor, stampante o e-reader: vi faccio poche domande e vi preparo una scheda.", comandi: [{ tipo: "vai", hash: "#/acquisti/" + d, etichetta: "🛒 Inizia la scelta guidata" }] }; } },
    { r: /(programmi? (consigliat|utili|per)|che programma|quale programma|app per|alternativa a)/, f: function () {
      return { testo: "Ho un catalogo di programmi affidabili e quasi tutti gratuiti, filtrati per il vostro computer: li installo con un clic dalle fonti ufficiali (winget, Flathub, Homebrew).", comandi: [{ tipo: "vai", hash: "#/programmi", etichetta: "📦 Programmi consigliati" }] }; } },
    { r: /(storia (del|dei)|chi ha inventato|primo computer|quando e nato)/, f: function () {
      var c = CD.STORIA.curiosita[Math.floor(Math.random() * CD.STORIA.curiosita.length)];
      return { testo: "La storia dei computer è piena di sorprese, e di italiani geniali come Olivetti e Federico Faggin! Una curiosità: " + c, comandi: [{ tipo: "vai", hash: "#/storia", etichetta: "📜 Viaggio nella storia" }] }; } },
    { r: /(velocita (di )?internet|quanto va internet|speed ?test|prova (la )?connessione)/, f: function () {
      return { testo: "Misuro la velocità di Internet (download, upload e tempo di risposta) quando volete.", comandi: [{ tipo: "vai", hash: "#/strumenti/rete", etichetta: "📶 Prova la velocità" }] }; } },
    { r: /(recuper\w* (i |le |dei |delle )?(file|foto|dati|documenti)|(ho )?cancellat\w* (per sbaglio )?(le |i |delle |dei )?(foto|file|documenti)|file (spariti|scomparsi|nascosti)|(chiavetta|disco|scheda|sd)\b.*(non (si )?(legge|apre|vede)|raw|formattar)|\braw\b|salvadati)/, f: function () {
      return { testo: "Con **Salvadati** analizzo dischi e chiavette (anche quelli RAW o illeggibili), cerco i file cancellati, scarto quelli rovinati e vi dico quanti ne ho salvati e quanto spazio serve. Importante: non formattate e non scrivete nulla sull'unità da salvare.",
        comandi: [{ tipo: "vai", hash: "#/recupero", etichetta: "🛟 Apri Salvadati" }] }; } },
    { r: /(virus|antivirus|malware|trojan|ransomware|infett|defender|clamav|\bmrt\b)/, f: function () {
      return { testo: CD.sistema() === "windows" ? "Uso Microsoft Defender e lo Strumento di rimozione malware di Microsoft, già dentro Windows e gratuiti: aggiorno le firme, controllo il disco o le chiavette e, se serve, faccio il controllo all'avvio prima di Windows." :
        "Uso ClamAV, l'antivirus libero: lo aggiorno, controllo il disco o le chiavette e metto in quarantena i file infetti.", comandi: [{ tipo: "vai", hash: "#/antivirus", etichetta: "🛡️ Antivirus" }] }; } },
    { r: /((pc|computer|portatile|windows|linux)\b.*(non (si )?(avvia|accende|parte)|schermo (blu|nero)|bloccat\w* all.avvio)|chiavetta (di )?(emergenza|soccorso|avviabile)|kit di emergenza|soccorso)/, f: function () {
      return { testo: "Per un computer che non si avvia preparo la **chiavetta di emergenza**: la inserite, accendete e io parto da lì. Faccio la diagnosi (disco, avvio, aggiornamenti bloccati, Windows ibernato…), vi dico in parole semplici dov'è il problema e lo riparo con un clic. Si prepara da un altro computer che funziona.",
        comandi: [{ tipo: "vai", hash: "#/kit", etichetta: "🚑 Kit di emergenza" }, { tipo: "vai", hash: "#/recupero", etichetta: "🛟 Salvadati" }] }; } },
    { r: /(barzelletta|fammi ridere|qualcosa di divertente)/, f: function () {
      var b = ["Perché il computer è andato dal dottore? Aveva un virus… ma per fortuna era solo un raffreddore di sistema!",
        "Sapete come si chiama un computer che canta? Un Dell… a voce!", "Il mio mouse è timido: appena lo sposto, la freccia si nasconde dietro le finestre.",
        "Ho chiesto al Wi-Fi se mi voleva bene. Mi ha detto: dipende dalla distanza."];
      CD.cervello.stato("felice");
      return { testo: b[Math.floor(Math.random() * b.length)] + " 😄" }; } }
  ];

  function intenzione(testo) {
    var n = norm(testo);
    for (var i = 0; i < INTENZIONI.length; i++) {
      var it = INTENZIONI[i];
      if (it.r.test(n) && !(it.nonSe && it.nonSe.test(n))) {
        var r = it.f(n);
        if (r) return Promise.resolve(r);
      }
    }
    return Promise.resolve(null);
  }

  /* ------------------------------------------------------------------ IA locale */
  N.modello = function () {
    if (CD.imp.modelloIA && N.ia.modelli.indexOf(CD.imp.modelloIA) >= 0) return CD.imp.modelloIA;
    if (N.ia.consigliato && N.ia.modelli.indexOf(N.ia.consigliato) >= 0) return N.ia.consigliato;
    return N.ia.modelli[0] || "";
  };
  N.controllaIA = function () {
    if (!CD.server) { N.ia.attivo = false; return Promise.resolve(N.ia); }
    return CD.api("/api/ia").then(function (j) {
      N.ia = j; N.ia.attivo = !!(j.attivo && j.modelli && j.modelli.length);
      var s = CD.$("#spia-ia");
      if (s) { s.className = "spia " + (N.ia.attivo ? "on" : "off"); s.textContent = N.ia.attivo ? "● IA locale" : "○ IA da installare"; s.title = N.ia.attivo ? "Modello: " + N.modello() : "Impostazioni → Cervello (IA locale)"; }
      return N.ia;
    }, function () { return N.ia; });
  };

  function promptDiSistema(domanda, pagina) {
    var d = CD.adesso(), p = CD.profilo, t = p ? (CD.TIPI[p.tipo] || {}).nome : "non indicato";
    var righe = [
      "Sei Neura, il «cervello digitale» del programma Consulente Digitale, ideato e sviluppato da Danilo D'Auria (autore anche del Professore Digitale, di FeniceOS e del libro «Tecnologia Gentile: Informatica Sostenibile»).",
      "Parli in italiano, con calore e naturalezza, come una consulente informatica esperta, paziente e un po' simpatica. Frasi brevi e chiare, adatte anche a persone anziane. Di solito 3-7 frasi; elenchi puntati per i passaggi.",
      "Le tue risposte vengono anche lette ad alta voce: evita tabelle e simboli inutili.",
      "Oggi è " + CD.dataEstesa(d) + ", ore " + CD.oraTesto(d) + (CD.oraSync ? " (ora ufficiale sincronizzata con " + CD.oraSync.fonte + ")" : "") + ".",
      "Chi usa il programma: " + t + (p && p.nome ? " («" + p.nome + "»)" : "") + (p && p.quanti > 1 ? ", per " + p.quanti + " persone o postazioni" : "") + (nome() ? ". Si chiama " + nome() : "") + ".",
      "Il computer in uso: " + (CD.analisi && CD.analisi.ultima ? CD.analisi.riassuntoBreve(CD.analisi.ultima) : CD.nomeSistema()) + ".",
      "Pagina aperta nel programma: " + pagina + ". Connessione a Internet: " + (CD.online ? "sì" : "no") + "."
    ];
    var az = Object.keys(CD.azioni).map(function (k) { return "[[azione:" + k + "]] = " + CD.azioni[k].titolo; });
    if (az.length) righe.push("Puoi proporre un'azione automatica scrivendo su una riga a parte il suo comando (diventa un pulsante; la esegue l'utente). Comandi disponibili su questo computer:\n" + az.join("\n") +
      "\nPer [[azione:programma_installa|ID]] usa uno di questi ID: " + (CD.programmi ? CD.programmi.idDisponibili().join(", ") : "") + ".");
    righe.push("Puoi aprire una pagina con [[vai:PAGINA]]: inizio, acquisti, acquisti/portatile, acquisti/smartphone, analisi, hardware, hardware/schema, interventi, circolare, circolare/regole, circolare/quiz, programma, notizie, notizie/salvate, aggiornamenti, ottimizza, strumenti, programmi, sapere, storia, impostazioni.");
    if (CD.aperture && CD.aperture.lista.length) righe.push("Puoi proporre di aprire una finestra del sistema con [[apri:ID]] (diventa un pulsante; chiede il permesso): " +
      CD.aperture.lista.map(function (a) { return a.id + " = " + a.titolo; }).join(", ") + ".");
    if (CD.i18n && CD.i18n.attiva()) righe.push("IMPORTANTE: l'utente ha scelto la lingua " + CD.i18n.LINGUE[CD.i18n.lingua].ia + ". Rispondi SEMPRE e solo in questa lingua, anche se le informazioni qui sopra sono in italiano.");
    righe.push("Regole: non dire mai di aver eseguito un'azione (la avvia l'utente con il pulsante). Non inventare prezzi esatti né modelli che non conosci: dai fasce indicative e invita a confrontare i prezzi. " +
      "Su soldi, salute e leggi sii prudente. Se non sai una cosa, dillo. Consiglia fonti ufficiali e software libero quando ha senso. Non chiedere mai password o codici.");
    var g = cercaGuida(domanda).slice(0, 2);
    if (g.length) righe.push("Informazioni utili dalla guida del programma:\n" + g.map(function (x) { return rispostaGuida(x).testo; }).join("\n\n"));
    if (CD.acquisti && /compr|offert|prezz|sconto|black|saldi|regal/.test(norm(domanda))) righe.push("Calendario delle offerte: " + CD.acquisti.testoMomento(""));
    return righe.join("\n");
  }

  function chiediIA(testo, m) {
    var messaggi = [{ role: "system", content: promptDiSistema(testo, N.paginaAperta) }];
    N.storia.slice(-13, -1).forEach(function (x) { if (x.chi === "utente" || x.chi === "neura") messaggi.push({ role: x.chi === "utente" ? "user" : "assistant", content: x.testo }); });
    messaggi.push({ role: "user", content: testo });
    CD.cervello.stato("pensiero");
    var buffer = "", parlato = 0, inizio = Date.now(); N.zittita = false;
    return fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modello: N.modello(), messaggi: messaggi, temperatura: 0.55, contesto: 6144 }) }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.errore || "IA non disponibile"); });
      var lettore = r.body.getReader(), dec = new TextDecoder(), resto = "";
      function leggi() {
        return lettore.read().then(function (p) {
          if (p.done) return;
          resto += dec.decode(p.value, { stream: true });
          var righe = resto.split("\n"); resto = righe.pop();
          righe.forEach(function (rg) {
            if (!rg.trim()) return;
            try { var o = JSON.parse(rg); if (o.errore) throw new Error(o.errore); buffer += o.t || ""; } catch (e) { if (e.message && !/JSON/.test(e.message)) throw e; }
          });
          var vis = buffer.replace(/<think>[\s\S]*?(<\/think>|$)/g, "");
          m.testo = vis.replace(/\[\[[^\]]*$/, ""); aggiornaMessaggio(m);
          if (CD.cervello.stato() === "pensiero" && m.testo.trim()) CD.cervello.stato("parla");
          // parla frase per frase mentre scrive
          var daDire = estraiComandi(m.testo).testo;
          var cand = Math.max(daDire.lastIndexOf(". "), daDire.lastIndexOf("! "), daDire.lastIndexOf("? "), daDire.lastIndexOf("\n"));
          if (cand > parlato + 20 && CD.imp.voce && !N.zittita) { CD.parla(daDire.slice(parlato, cand + 1), { interrompi: false }); parlato = cand + 1; }
          return leggi();
        });
      }
      return leggi().then(function () {
        var e = estraiComandi(buffer.replace(/<think>[\s\S]*?<\/think>/g, ""));
        m.testo = e.testo || "…"; m.comandi = e.comandi; aggiornaMessaggio(m); salvaStoria();
        if (CD.imp.voce && !N.zittita && e.testo.length > parlato) CD.parla(e.testo.slice(parlato), { interrompi: false });
        if (!CD.staParlando()) CD.cervello.stato("riposo");
        N.ultimaDurata = Date.now() - inizio;
        return m;
      });
    });
  }

  /* ⏹ Stop: la risposta continua a comparire scritta, ma Neura non la legge più ad alta voce */
  N.interrompi = function () { N.zittita = true; N.conversazioneVoce = false; };

  /* ------------------------------------------------------------------ domanda principale */
  N.chiedi = function (testo, opz) {
    opz = opz || {};
    testo = String(testo || "").trim();
    if (!testo || N.occupata) return Promise.resolve();
    N.occupata = true;
    CD.taci();
    aggiungi("utente", testo);
    apriDockSeServe(opz);
    var m = aggiungi("neura", "…");
    CD.cervello.stato("pensiero");
    return intenzione(testo).then(function (r) {
      if (r) return r;
      if (N.ia.attivo) return chiediIA(testo, m).then(function () { return { fatto: true }; }, function (e) {
        var g = cercaGuida(testo)[0];
        if (g) { var rg = rispostaGuida(g); rg.testo = "(L'IA locale non ha risposto: " + e.message + ")\n" + rg.testo; return rg; }
        return { testo: "L'intelligenza artificiale locale non ha risposto (" + e.message + "). Riprovate tra poco o controllate Impostazioni → Cervello." };
      });
      var g2 = cercaGuida(testo);
      if (g2.length && g2[0].p >= 3) return rispostaGuida(g2[0]);
      return { testo: "Questa domanda richiede il mio cervello completo, cioè l'intelligenza artificiale locale, che non è ancora installata" + (CD.server ? "" : " (e qui non posso installarla)") + ". " +
        "Intanto posso analizzare il PC, aggiornarlo, ottimizzarlo, consigliarvi cosa comprare e quando, e rispondere alle domande della guida.",
        comandi: CD.server ? [{ tipo: "vai", hash: "#/impostazioni/ia", etichetta: "🧠 Installa il cervello (IA locale, gratis)" }, { tipo: "vai", hash: "#/sapere", etichetta: "💡 Cose da sapere" }] : [] };
    }).then(function (r) {   // in un'altra lingua le risposte pronte si traducono con l'IA locale (se c'è)
      if (r && !r.fatto && r.testo && CD.i18n && CD.i18n.attiva()) return CD.i18n.traduciTesto(r.testo).then(function (t) { r.testo = t; return r; });
      return r;
    }).then(function (r) {
      if (r && !r.fatto) {
        m.testo = r.testo; m.comandi = r.comandi || []; aggiornaMessaggio(m); salvaStoria();
        if (!r.muto) CD.parla(r.testo).then(dopoParlato); else CD.cervello.stato("riposo");
        if (!CD.imp.voce) CD.cervello.stato("riposo");
      } else if (r && r.fatto) { aspettaFineVoce(); }
      N.occupata = false;
    }, function (e) {
      m.testo = "Mi dispiace, qualcosa è andato storto: " + e.message; aggiornaMessaggio(m);
      CD.cervello.stato("errore"); N.occupata = false;
    });
  };
  function aspettaFineVoce() {
    var t = setInterval(function () { if (!CD.staParlando()) { clearInterval(t); dopoParlato(); } }, 300);
  }
  function dopoParlato() {
    if (CD.cervello.stato() === "parla") CD.cervello.stato("riposo");
    if (CD.imp.maniLibere && N.conversazioneVoce) setTimeout(function () { N.ascoltaEChiedi(); }, 400);
  }
  N.ascoltaEChiedi = function () {
    N.conversazioneVoce = true;
    return CD.ascolta().then(function (t) {
      if (t === null) return;
      if (!t) { N.conversazioneVoce = false; CD.cervello.stato("riposo"); return; }
      CD.$$(".chat-modulo input").forEach(function (i) { i.value = ""; });
      return N.chiedi(t, { voce: true });
    }, function () { N.conversazioneVoce = false; });
  };
  N.dici = function (testo, comandi) {   // Neura prende la parola da sola (saluti, commenti ai lavori)
    aggiungi("neura", testo, { comandi: comandi || [] });
    return CD.parla(testo);
  };
  N.pagina = function (v) { N.paginaAperta = v.titolo || v.id; };

  /* ------------------------------------------------------------------ commenti ai lavori finiti */
  N.commentaLavoro = function (a, j) {
    var t = null, c = [];
    if (j.stato === "negato") t = "Non ho avuto il permesso di amministratore, quindi non ho cambiato nulla. Riprovate quando volete.";
    else if (a.id === "aggiornamenti_cerca") {
      var n = j.voci.length, f = {};
      j.voci.forEach(function (v) { f[v.fonte] = (f[v.fonte] || 0) + 1; });
      if (!n) t = "Ottime notizie: è tutto aggiornato!" + (j.info.riavvio === "si" ? " Però il computer aspetta un riavvio per completare gli aggiornamenti precedenti." : "");
      else { t = "Ho trovato **" + n + " aggiornamenti**" + Object.keys(f).map(function (k) { return " · " + f[k] + " " + k; }).join("") + ". Volete che li scarichi e li installi?";
        c.push({ tipo: "azione", id: "aggiornamenti_installa", param: Object.keys(f).join(" "), etichetta: "⬇️ Installa tutto" }); }
    } else if (a.id === "driver_cerca") {
      var prob = j.voci.filter(function (v) { return v.fonte === "periferica" || v.fonte === "driver"; }).length;
      t = prob ? "Ci sono " + prob + " dispositivi o driver da sistemare. Posso installare quelli ufficiali." : "I dispositivi hanno tutti il loro driver.";
      if (prob) c.push({ tipo: "azione", id: "driver_installa", etichetta: "🛠️ Installa i driver" });
    } else if (j.stato === "fatto") t = "Ho finito «" + a.titolo + "»: tutto bene." + (j.info.riavvio === "si" ? " Per completare serve un riavvio." : "") + (j.info.liberati_mb ? " Ho liberato " + j.info.liberati_mb + " MB." : "");
    else if (j.stato === "errore") t = "«" + a.titolo + "» ha avuto qualche problema: trovate i dettagli nel registro. Posso aiutarvi a capirlo, se volete.";
    if (t) { aggiungi("neura", t, { comandi: c }); if (CD.imp.voce) CD.parla(t, { interrompi: false }); }
  };

  /* ------------------------------------------------------------------ pannellino in basso a destra */
  function apriDockSeServe(opz) {
    if (CD.vistaCorrente === "neura" || opz.nonAprire) return;
    var p = CD.$("#dock-pannello"); if (p && p.hidden) { p.hidden = false; disegna(CD.$("#chat-dock")); }
  }
  N.modulo = function (form, input, mic) {
    form.addEventListener("submit", function (e) { e.preventDefault(); var t = input.value; input.value = ""; N.conversazioneVoce = false; N.chiedi(t); });
    if (mic) {
      mic.addEventListener("click", function () {
        if (!CD.puoAscoltare()) { CD.avviso("🎤 Microfono non disponibile: scrivete pure.", "att"); return; }
        mic.classList.add("ascolta");
        CD.suParziale = function (t) { input.value = t; };
        N.ascoltaEChiedi().then(function () { mic.classList.remove("ascolta"); }, function () { mic.classList.remove("ascolta"); });
      });
      if (!CD.puoAscoltare()) mic.title = "Microfono non disponibile su questo browser";
    }
  };
  N.avviaDock = function () {
    var btn = CD.$("#dock-cervello"), pan = CD.$("#dock-pannello");
    CD.cervello.crea(CD.$("#cervello-mini"), { mini: true });
    btn.onclick = function () {
      if (CD.vistaCorrente === "neura") { CD.$("#neura-input") && CD.$("#neura-input").focus(); return; }
      pan.hidden = !pan.hidden; if (!pan.hidden) { disegna(CD.$("#chat-dock")); CD.$("#dock-input").focus(); }
    };
    CD.$("#dock-chiudi").onclick = function () { pan.hidden = true; };
    N.modulo(CD.$("#dock-modulo"), CD.$("#dock-input"), CD.$("#dock-mic"));
    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && (e.code === "Space" || e.key === " ")) { e.preventDefault(); N.ascoltaEChiedi(); }
      if (e.key === "Escape" && CD.$("#modale-sfondo").hidden) CD.ferma();
    });
  };

  /* ------------------------------------------------------------------ pagina «Parla con Neura» */
  CD.registra("neura", {
    titolo: "Parla con Neura",
    mostra: function (el) {
      el.innerHTML = '<div class="neura-palco"><div class="neura-grande"><canvas id="cervello-grande" aria-label="Neura, il cervello digitale"></canvas>' +
        '<div class="neura-nome"><b>NEURA</b><span class="neura-stato">' + CD.cervello.nomeStato() + "</span></div>" +
        '<button class="btn grande primario neura-parla" id="neura-parla">🎤 Parla con me</button>' +
        '<label class="opzione piccola"><input type="checkbox" id="neura-mani"' + (CD.imp.maniLibere ? " checked" : "") + "> Conversazione a mani libere</label>" +
        '<p class="piccolo-testo neura-motore" id="neura-motore"></p></div>' +
        '<div class="neura-chat scheda"><div class="chat chat-grande" id="chat-grande" aria-live="polite"></div>' +
        '<div class="suggerimenti" id="suggerimenti"></div>' +
        '<form class="chat-modulo" id="neura-modulo" autocomplete="off"><button type="button" class="mic" id="neura-mic" aria-label="Parla">🎤</button>' +
        '<input id="neura-input" placeholder="Chiedetemi qualsiasi cosa…" aria-label="Domanda per Neura"><button class="invia" aria-label="Invia">➤</button></form>' +
        '<div class="riga"><button class="btn piccolo" id="neura-pulisci">🧹 Nuova conversazione</button><button class="btn piccolo" id="neura-stampa">🖨️ Stampa la conversazione</button><span class="spazio"></span>' +
        '<small>Ctrl + Spazio per parlare</small></div></div></div>';
      CD.$("#dock-pannello").hidden = true;
      CD.cervello.crea(CD.$("#cervello-grande", el));
      disegna(CD.$("#chat-grande", el));
      N.modulo(CD.$("#neura-modulo", el), CD.$("#neura-input", el), CD.$("#neura-mic", el));
      CD.$("#neura-parla", el).onclick = function () { N.ascoltaEChiedi(); };
      CD.$("#neura-mani", el).onchange = function () { CD.imp.maniLibere = this.checked; CD.salvaImpostazioni(); };
      CD.$("#neura-pulisci", el).onclick = function () { N.storia = []; salvaStoria(); disegnaTutte(); CD.taci(); };
      CD.$("#neura-stampa", el).onclick = function () {
        CD.stampa("Conversazione con Neura", N.storia.map(function (m) { return '<div class="f-msg"><b>' + (m.chi === "utente" ? "Domanda" : "Neura") + ":</b> " + markdown(m.testo) + "</div>"; }).join(""));
      };
      var mot = CD.$("#neura-motore", el);
      mot.innerHTML = (N.ia.attivo ? "🧠 IA locale: <b>" + esc(N.modello()) + "</b> · niente esce dal computer" : "🧠 Senza IA: rispondo con la guida interna. <a href=\"#/impostazioni/ia\">Installa il cervello</a>") +
        "<br>🎤 " + ({ locale: "Trascrizione sul computer", browser: "Riconoscimento del browser (con consenso)", "": "Microfono non disponibile" }[CD.motoreAscolto()]);
      var sugg = ["Il mio computer è lento", "Che portatile mi consigli per studiare?", "Ci sono aggiornamenti?", "Quando conviene comprare una TV?",
        "Che sistema operativo mi consigli?", "Come riconosco una truffa?", "Che ore sono?", "Raccontami la storia del computer"];
      CD.$("#suggerimenti", el).innerHTML = sugg.map(function (s) { return '<button class="btn piccolo" type="button">' + esc(s) + "</button>"; }).join("");
      CD.$$("#suggerimenti button", el).forEach(function (b) { b.onclick = function () { N.chiedi(b.textContent); }; });
      CD.$("#neura-input", el).focus();
    }
  });

  N.caricaStoria = function () { return CD.carica("cronologia").then(function (s) { if (Array.isArray(s)) N.storia = s.slice(-40); }); };
})();
