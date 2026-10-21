#!/usr/bin/env python3
"""Genera il vademecum del Consulente Digitale.
1. Unisce le parti docs/sorgenti/vademecum/*.html (in ordine di nome) e riempie i segnaposto {{…}} con i dati VERI del programma
   (catalogo delle azioni e passi di ogni script, calendario delle occasioni, requisiti, programmi, glossario,
   cose da sapere, problemi, storia) → docs/sorgenti/vademecum-pronto.html
2. Lo stampa in PDF con tools/pdf-da-html.py e lo comprime → docs/Vademecum_Consulente_Digitale.pdf
Uso: python3 tools/genera-vademecum.py [--solo-html]
Autore: Danilo D'Auria - Codice MIT, contenuti CC BY-NC-SA 4.0"""
import datetime
import html
import json
import os
import re
import subprocess
import sys

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORG = os.path.join(RADICE, "docs", "sorgenti")
sys.path.insert(0, os.path.join(RADICE, "src", "server"))
import cd_azioni  # noqa: E402
import cd_aperture  # noqa: E402

E = html.escape
VERSIONE = open(os.path.join(RADICE, "VERSION")).read().strip()
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]

# --------------------------------------------------------------------------- dati dell'interfaccia (via Node)
NODE = r"""
global.window = { CD: { registra: function () {}, esc: function (s) { return s; }, hooks: { avvio: [] },
  uno: function (l, f) { for (var i = 0; i < l.length; i++) if (f(l[i])) return l[i]; return null; } } };
var fs = require('fs'), vm = require('vm');
['data-acquisti.js', 'data-sapere.js', 'data-storia.js', 'circolare.js', 'scheda-madre.js'].forEach(function (f) {
  vm.runInThisContext(fs.readFileSync(process.argv[1] + '/' + f, 'utf8'));
});
var CD = window.CD, anno = +process.argv[2], ev = [];
CD.ACQ.eventi.forEach(function (e) {
  [anno, anno + 1].forEach(function (a) {
    var d = e.date(a);
    ev.push({ id: e.id, nome: e.nome, icona: e.icona, forza: e.forza, per: e.per, nota: e.nota, anno: a,
      inizio: d[0].toISOString(), fine: d[1].toISOString(), il: [d[0].getFullYear(), d[0].getMonth(), d[0].getDate(), d[0].getDay(), d[0].getHours()],
      al: [d[1].getFullYear(), d[1].getMonth(), d[1].getDate(), d[1].getDay(), d[1].getHours()] });
  });
});
var acq = JSON.parse(JSON.stringify(CD.ACQ)); acq.eventi = ev;
process.stdout.write(JSON.stringify({ acq: acq, sapere: CD.SAPERE, problemi: CD.PROBLEMI, glossario: CD.GLOSSARIO, storia: CD.STORIA,
  circ: CD.CIRC, soglie: CD.hw.SOGLIE }));
"""


def dati_web():
    anno = datetime.date.today().year
    out = subprocess.run(["node", "-e", NODE, os.path.join(RADICE, "src", "web", "js"), str(anno)], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def data_it(a):
    y, m, d, wd, h = a
    giorno = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"][wd]
    return "%s %d %s %d" % (giorno, d, MESI[m], y)


# --------------------------------------------------------------------------- passi degli script
RE_PASSO = re.compile(r"""^\s*(?:passo|Passo)\s+\d+\s+\d+\s+(?:"([^"]*)"|'((?:[^']|'')*)')""", re.M)


def passi_script(sistema, file):
    try:
        t = open(os.path.join(RADICE, "src", "azioni", sistema, file), encoding="utf-8").read()
    except OSError:
        return []
    visti, out = set(), []
    for m in RE_PASSO.finditer(t):
        s = (m.group(1) or m.group(2) or "").replace("''", "'")
        s = re.sub(r"\$\{?[A-Za-z_]+\}?|\$CD_PARAM", "…", s)
        s = re.sub(r"\s+\d+ di \$\{?tot\}?:.*", "", s)
        if s and s not in visti:
            visti.add(s)
            out.append(s)
    return out


def commento_script(sistema, file):
    try:
        for r in open(os.path.join(RADICE, "src", "azioni", sistema, file), encoding="utf-8").read().splitlines()[:4]:
            if r.startswith("# ") and "Consulente" not in r and "Danilo" not in r:
                return r[2:].strip()
    except OSError:
        pass
    return ""


GRUPPI = {"aggiornamenti": "Aggiornamenti", "driver": "Driver", "ottimizza": "Ottimizzazione", "ripara": "Salute e riparazioni",
          "esperti": "Strumenti degli esperti", "programmi": "Programmi", "ia": "Intelligenza artificiale", "hardware": "Hardware"}
SIS = (("windows", "🪟 Windows"), ("linux", "🐧 Linux"), ("mac", "🍎 macOS"))


def tab_azioni():
    r = ['<table class="compatta"><thead><tr><th></th><th>Azione</th><th>Cosa fa</th><th>Rischio</th><th>🪟</th><th>🐧</th><th>🍎</th></tr></thead><tbody>']
    for a in cd_azioni.AZIONI:
        cel = []
        for s, _ in SIS:
            x = a["s"].get(s)
            cel.append('<td class="centro">' + ("—" if not x else ("🔐" if x["admin"] else "✔") + ("🪟" if x["finestra"] else "")) + "</td>")
        rc = {"nessuno": "v", "basso": "b", "medio": "g", "alto": "r"}[a["rischio"]]
        r.append('<tr><td class="ico">%s</td><td><b>%s</b><br><code>%s</code></td><td>%s%s</td><td><span class="et %s">%s</span></td>%s</tr>' % (
            a["icona"], E(a["titolo"]), a["id"], E(a["descrizione"]), " <i>Può chiedere un riavvio.</i>" if a.get("riavvio") else "", rc, a["rischio"], "".join(cel)))
    r.append("</tbody></table>")
    return "\n".join(r)


def dettaglio_azioni(gruppi):
    out = []
    for a in cd_azioni.AZIONI:
        if a["gruppo"] not in gruppi:
            continue
        righe = []
        for s, nome in SIS:
            x = a["s"].get(s)
            if not x:
                continue
            ps = passi_script(s, x["file"])
            com = commento_script(s, x["file"])
            righe.append("<tr><td class=\"nw\"><b>%s</b><br><code>%s</code>%s</td><td>%s%s</td></tr>" % (
                nome, x["file"], "<br>🔐 amministratore" if x["admin"] else "",
                "<i>" + E(com) + "</i>" if com else "",
                ('<ol class="small" style="margin:.2em 0">' + "".join("<li>%s</li>" % E(p) for p in ps) + "</ol>") if ps else ""))
        out.append('<h3>%s %s</h3><p class="small" style="margin-top:0">%s</p><table class="compatta"><tbody>%s</tbody></table>' % (
            a["icona"], E(a["titolo"]), E(a["descrizione"]), "".join(righe)))
    return "\n".join(out)


def tab_eventi(d):
    oggi = datetime.datetime.now()
    fra_un_anno = oggi + datetime.timedelta(days=366)
    def dt(a):
        return datetime.datetime(a[0], a[1] + 1, a[2], a[4])
    ev = [e for e in d["acq"]["eventi"] if dt(e["al"]) >= oggi and dt(e["il"]) <= fra_un_anno]
    ev.sort(key=lambda e: e["inizio"])
    vist, r = set(), ['<table class="compatta"><thead><tr><th></th><th style="width:20%">Occasione</th><th>Forza</th><th style="width:24%">Date (calcolate dal programma)</th><th style="width:16%">Per</th><th>Nota</th></tr></thead><tbody>']
    for e in ev:
        k = (e["id"], e["anno"])
        if k in vist:
            continue
        vist.add(k)
        per = "tutti i dispositivi" if e["per"] == "tutti" else ", ".join(d["acq"]["dispositivi"][x]["nome"].lower() for x in e["per"])
        r.append("<tr><td class=\"ico\">%s</td><td><b>%s</b></td><td>%s</td><td>%s%s</td><td>%s</td><td>%s</td></tr>" % (
            e["icona"], E(e["nome"]), "★" * e["forza"], data_it(e["il"]), (" → " + data_it(e["al"])) if e["il"][:3] != e["al"][:3] else "", E(per), E(e["nota"])))
    r.append("</tbody></table>")
    return "\n".join(r)


def tab_livelli(d):
    def gb(x):
        return "%d TB" % (x // 1000) if x >= 1000 else "%d GB" % x
    r = ['<table class="compatta"><thead><tr><th style="width:17%">Livello</th><th style="width:27%">Processore</th><th style="width:17%">Memoria e disco</th><th>Grafica</th><th>Schermo</th></tr></thead><tbody>']
    for k in sorted(d["acq"]["livelliPC"], key=int):
        L = d["acq"]["livelliPC"][k]
        r.append("<tr><td><b>%s. %s</b></td><td>%s</td><td>RAM <b>%d GB</b> (ideale %d)<br>SSD <b>%s</b> (ideale %s)</td><td>%s</td><td>%s</td></tr>" % (
            k, E(L["nome"]), E(L["cpu"]), L["ram"], L["ramIdeale"], gb(L["disco"]), gb(L["discoIdeale"]), E(L["video"]), E(L["schermo"])))
    r.append("</tbody></table>")
    return "\n".join(r)


def tab_usi(d):
    fam = {"pc": "Computer", "tablet": "Tablet", "telefono": "Telefono", "tv": "TV", "monitor": "Monitor", "stampante": "Stampante", "ereader": "E-reader"}
    r = ['<table class="compatta"><thead><tr><th></th><th>Uso</th><th>Livello</th><th>Per</th></tr></thead><tbody>']
    for k, u in d["acq"]["usi"].items():
        r.append("<tr><td class=\"ico\">%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (u["icona"], E(u["nome"]), "●" * u["livello"], ", ".join(fam[x] for x in u["per"])))
    r.append("</tbody></table>")
    return "\n".join(r)


def tab_dispositivi(d):
    r = ['<table class="compatta"><thead><tr><th></th><th>Dispositivo</th><th>Economico</th><th>Medio</th><th>Alto</th><th>Il meglio</th></tr></thead><tbody>']
    for k, x in d["acq"]["dispositivi"].items():
        f = x["fasce"]
        r.append("<tr><td class=\"ico\">%s</td><td><b>%s</b><br><small>%s</small></td><td>%d–%d €</td><td>%d–%d €</td><td>%d–%d €</td><td>oltre %d €</td></tr>" % (
            x["icona"], E(x["nome"]), E(x["desc"]), f["economico"][0], f["economico"][1], f["medio"][0], f["medio"][1], f["alto"][0], f["alto"][1], f["top"][0]))
    r.append("</tbody></table>")
    return "\n".join(r)


def trappole_consigli(d):
    nomi = {"pc": "💻 Computer", "tablet": "📱 Tablet", "telefono": "📞 Smartphone", "tv": "📺 TV", "monitor": "🖵 Monitor", "stampante": "🖨️ Stampanti", "ereader": "📖 E-reader"}
    out = ['<div class="colonne">']
    for k, n in nomi.items():
        tr = d["acq"]["trappoleComuni"].get(k, [])
        co = d["acq"]["consigli"].get(k, [])
        out.append("<div><h3>%s</h3><p class=\"small\"><b>Da evitare</b></p><ul class=\"small\">%s</ul><p class=\"small\"><b>Consigli</b></p><ul class=\"small\">%s</ul></div>" % (
            n, "".join("<li>%s</li>" % E(x) for x in tr), "".join("<li>%s</li>" % E(x) for x in co)))
    out.append("</div>")
    return "\n".join(out)


def lista(xs):
    return "<ul>" + "".join("<li>%s</li>" % E(x) for x in xs) + "</ul>"


def tab_negozi(d):
    return '<table class="compatta"><thead><tr><th>Sito</th><th>A cosa serve</th></tr></thead><tbody>' + "".join(
        "<tr><td><b>%s</b>%s</td><td>%s</td></tr>" % (E(n["nome"]), " ♻️" if n.get("ricondizionato") else "", E(n["desc"])) for n in d["acq"]["negozi"]) + "</tbody></table>"


def tab_programmi():
    p = json.load(open(os.path.join(RADICE, "src", "web", "dati", "programmi.json"), encoding="utf-8"))
    out = []
    for cat, nome in p["categorie"].items():
        xs = [x for x in p["programmi"] if x["categoria"] == cat]
        if not xs:
            continue
        out.append("<h3>%s</h3><table class=\"compatta\"><thead><tr><th>Programma</th><th>A cosa serve</th><th>RAM</th><th>🪟 winget</th><th>🐧 Linux</th><th>🍎 Homebrew</th></tr></thead><tbody>" % E(nome))
        for x in xs:
            pk = x["pacchetti"]
            out.append("<tr><td><b>%s</b>%s</td><td>%s</td><td>%s GB</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
                E(x["nome"]), ' <span class="et v">libero</span>' if x["libero"] else "", E(x["descrizione"]), x["ram_min_gb"],
                "<code>%s</code>" % E(pk["windows"].split(":", 1)[1]) if pk.get("windows") else "—",
                "<code>%s</code>" % E(pk["linux"].split(":", 1)[1]) if pk.get("linux") else "—",
                "<code>%s</code>" % E(pk["mac"].split(":", 1)[1]) if pk.get("mac") else "—"))
        out.append("</tbody></table>")
    return "\n".join(out), len(p["programmi"])


def sapere(d):
    out = ['<div class="colonne">']
    for s in d["sapere"]:
        out.append("<div><h3>%s %s</h3><p class=\"small\"><i>%s</i></p><ul class=\"small\">%s</ul></div>" % (
            s["icona"], E(s["titolo"]), E(s["sintesi"]), "".join("<li>%s</li>" % E(x) for x in s["punti"])))
    out.append("</div>")
    return "\n".join(out)


def problemi_neura(d):
    out = []
    for p in d["problemi"]:
        az = [cd_azioni.PER_ID[a]["titolo"] for a in p.get("azioni", []) if a in cd_azioni.PER_ID]
        out.append("<tr><td class=\"ico\">%s</td><td><b>%s</b><br><small>Frasi: %s</small></td><td><ol class=\"small\" style=\"margin:0\">%s</ol></td><td class=\"small\">%s</td></tr>" % (
            p["icona"], E(p["titolo"]), E(", ".join("«%s»" % k for k in p["parole"][:3])), "".join("<li>%s</li>" % E(x) for x in p["passi"]),
            E(" · ".join(az)) or "—"))
    return '<table class="compatta"><thead><tr><th></th><th>Problema</th><th>Cosa fare</th><th>Pulsanti</th></tr></thead><tbody>' + "".join(out) + "</tbody></table>"


def glossario(d):
    return '<dl class="glossario colonne">' + "".join("<div><dt>%s</dt><dd>%s</dd></div>" % (E(a), E(b)) for a, b in d["glossario"]) + "</dl>"


def storia(d):
    out = ['<table class="compatta"><thead><tr><th>Anno</th><th>Tappa</th></tr></thead><tbody>']
    for t in d["storia"]["tappe"]:
        anno = t.get("quando") or (str(-t["anno"]) + " a.C." if t["anno"] < 0 else str(t["anno"]))
        out.append("<tr><td class=\"nw\"><b>%s</b>%s</td><td>%s <b>%s</b> — %s</td></tr>" % (E(anno), " 🇮🇹" if t.get("italia") else "", t["icona"], E(t["titolo"]), E(t["testo"])))
    out.append("</tbody></table>")
    return "\n".join(out)


def quiz_storia(d):
    return "<ol class=\"small\">" + "".join("<li>%s <i>(risposta: %s)</i></li>" % (E(q["d"]), E(q["o"][q["c"]])) for q in d["storia"]["quiz"]) + "</ol>"


# --------------------------------------------------------------------------- novità 1.1
def soglie_hw(d):
    s = d["soglie"]
    righe = [("🧠 Processore", "%d °C" % s["cpu"][0], "%d °C" % s["cpu"][1]), ("🎮 Scheda video", "%d °C" % s["gpu"][0], "%d °C" % s["gpu"][1]),
             ("💽 SSD NVMe", "%d °C" % s["nvme"][0], "%d °C" % s["nvme"][1]), ("💽 Disco meccanico / SATA", "%d °C" % s["hdd"][0], "%d °C" % s["hdd"][1]),
             ("🧩 Scheda madre / chipset", "%d °C" % s["scheda"][0], "%d °C" % s["scheda"][1]), ("🧠 Memoria RAM in uso", "%d%%" % s["ram"][0], "%d%%" % s["ram"][1]),
             ("📂 Spazio libero sul disco", "sotto il %d%%" % s["spazio"][0], "sotto l'%d%%" % s["spazio"][1]),
             ("🔋 Salute della batteria", "sotto il %d%%" % s["batteria"][0], "sotto il %d%%" % s["batteria"][1]), ("🔄 Cicli di carica della batteria", "da %d" % s["cicli"][0], "—")]
    return '<table class="compatta"><thead><tr><th>Componente</th><th><span class="et b">da tenere d\'occhio</span></th><th><span class="et g">guasto possibile</span></th></tr></thead><tbody>' + \
        "".join("<tr><td>%s</td><td>%s</td><td>%s</td></tr>" % r for r in righe) + "</tbody></table>"


def tab_aperture():
    r = ['<table class="compatta"><thead><tr><th></th><th>Finestra</th><th>🪟 Windows</th><th>🐧 Linux (il primo presente)</th><th>🍎 macOS</th></tr></thead><tbody>']

    def cmd(lista):
        if not lista:
            return "—"
        out = []
        for c in lista:
            out.append(c.split(":", 1)[1] if isinstance(c, str) and c.startswith("file:") else c[4:] if isinstance(c, str) else " ".join(c).replace(os.path.expanduser("~"), "~"))
        return "<br>".join("<code>%s</code>" % E(x) for x in out[:4])
    for v in cd_aperture.CATALOGO:
        r.append('<tr><td class="ico">%s</td><td><b>%s</b><br><span class="small">%s</span></td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
            v[1], E(v[2]), E(v[3]), cmd(v[5].get("windows")), cmd(v[5].get("linux")), cmd(v[5].get("mac"))))
    r.append("</tbody></table>")
    return "\n".join(r)


def circ(d):
    c = d["circ"]
    return {
        "CIRC_NUMERI": '<div class="affianca">' + "".join('<div class="box consiglio"><span class="t">%s</span>%s</div>' % (E(n[0]), E(n[1])) for n in c["numeri"]) + "</div>",
        "CIRC_ERRE": '<table class="compatta"><tbody>' + "".join('<tr><td class="ico">%s</td><td><b>%s</b></td><td>%s</td></tr>' % (r[0], E(r[1]), E(r[2])) for r in c["erre"]) + "</tbody></table>",
        "CIRC_REGOLE": "".join("<h3>%s</h3><p>%s</p>" % (E(r["t"]), E(r["d"])) for r in c["regole"]),
        "CIRC_CONSIGLI": "".join("<h3>%s</h3><ul>%s</ul>" % (E(k["t"]), "".join("<li>%s</li>" % E(x) for x in k["p"])) for k in c["consigli"]),
        "CIRC_FAQ": "".join("<p><b>%s</b><br>%s</p>" % (E(f[0]), E(f[1])) for f in c["faq"]),
        "CIRC_QUIZ": "<ol>" + "".join("<li>%s <span class=\"small\">(%s)</span><br><i>Risposta: %s.</i> %s</li>" % (E(q[0]), " / ".join(E(x) for x in q[1]), E(q[1][q[2]]), E(q[3])) for q in c["quiz"]) + "</ol>",
        "CIRC_PATTO": "<ol>" + "".join("<li>%s</li>" % E(p) for p in c["patto"]) + "</ol>",
        "CIRC_AGGIORNATO": E(c["aggiornato"]),
    }


def novita():
    v = json.load(open(os.path.join(RADICE, "docs", "novita.json"), encoding="utf-8"))["versioni"]
    return "".join('<h3>Versione %s <span class="small">(%s)</span></h3><ul>%s</ul>' % (E(x["versione"]), E(x["data"]), "".join("<li>%s</li>" % E(n) for n in x["novita"])) for x in v)


def main():
    d = dati_web()
    oggi = datetime.date.today()
    prog, nprog = tab_programmi()
    sost = {
        "VERSIONE": VERSIONE, "DATA": "%s %d" % (MESI[oggi.month - 1].capitalize(), oggi.year), "AGGIORNATO_PREZZI": E(d["acq"]["aggiornato"]),
        "N_AZIONI": str(len(cd_azioni.AZIONI)), "N_PROGRAMMI": str(nprog), "N_SAPERE": str(len(d["sapere"])), "N_PROBLEMI": str(len(d["problemi"])),
        "N_GLOSSARIO": str(len(d["glossario"])), "N_TAPPE": str(len(d["storia"]["tappe"])), "N_EVENTI": str(len(d["acq"]["eventi"]) // 2),
        "TAB_AZIONI": tab_azioni(),
        "DETTAGLIO_AGGIORNAMENTI": dettaglio_azioni(("aggiornamenti", "driver")),
        "DETTAGLIO_OTTIMIZZA": dettaglio_azioni(("ottimizza",)),
        "DETTAGLIO_RIPARA": dettaglio_azioni(("ripara",)),
        "DETTAGLIO_ESPERTI": dettaglio_azioni(("esperti", "programmi", "ia")),
        "TAB_EVENTI": tab_eventi(d), "TAB_LIVELLI": tab_livelli(d), "TAB_USI": tab_usi(d), "TAB_DISPOSITIVI": tab_dispositivi(d),
        "TRAPPOLE": trappole_consigli(d), "SICUREZZA_ACQUISTO": lista(d["acq"]["sicurezzaAcquisto"]), "PER_GRUPPI": lista(d["acq"]["perGruppi"]),
        "TAB_NEGOZI": tab_negozi(d), "TAB_PROGRAMMI": prog, "SAPERE": sapere(d), "PROBLEMI": problemi_neura(d), "GLOSSARIO": glossario(d),
        "STORIA": storia(d), "QUIZ_STORIA": quiz_storia(d),
        "CURIOSITA": lista(d["storia"]["curiosita"]),
        "DETTAGLIO_HARDWARE": dettaglio_azioni(("hardware",)), "DETTAGLIO_RECUPERO": dettaglio_azioni(("recupero",)),
        "DETTAGLIO_ANTIVIRUS": dettaglio_azioni(("antivirus",)), "DETTAGLIO_KIT": dettaglio_azioni(("kit",)), "SOGLIE_HW": soglie_hw(d), "APERTURE": tab_aperture(), "N_APERTURE": str(len(cd_aperture.CATALOGO)),
        "NOVITA": novita(),
        "SOSTIENI_QR_PAYPAL": "", "SOSTIENI_QR_IBAN": "",
    }
    sost.update(circ(d))
    sos = open(os.path.join(RADICE, "src", "web", "js", "data-sostieni.js"), encoding="utf-8").read()
    sj = json.loads(sos[sos.index("{"):sos.rindex("}") + 1])
    sost["SOSTIENI_QR_PAYPAL"] = sj["qrPaypal"]
    sost["SOSTIENI_QR_IBAN"] = sj["qrIban"]
    sost["SOSTIENI_IBAN"] = sj["iban"]
    sost["SOSTIENI_PAYPAL"] = sj["paypal"]
    cart = os.path.join(SORG, "vademecum")
    t = "".join(open(os.path.join(cart, f), encoding="utf-8").read() for f in sorted(os.listdir(cart)) if f.endswith(".html"))
    mancanti = set(re.findall(r"\{\{([A-Z_]+)\}\}", t)) - set(sost)
    if mancanti:
        raise SystemExit("segnaposto senza valore: %s" % ", ".join(sorted(mancanti)))
    t = re.sub(r"\{\{([A-Z_]+)\}\}", lambda m: sost[m.group(1)], t)
    pronto = os.path.join(SORG, "vademecum-pronto.html")
    open(pronto, "w", encoding="utf-8").write(t)
    print("scritto", pronto)
    if "--solo-html" in sys.argv:
        return
    pdf = os.path.join(RADICE, "docs", "Vademecum_Consulente_Digitale.pdf")
    subprocess.run([sys.executable, os.path.join(RADICE, "tools", "pdf-da-html.py"), pronto, pdf, "Vademecum v" + VERSIONE], check=True)
    subprocess.run([sys.executable, os.path.join(RADICE, "tools", "comprimi-pdf.py"), pdf], check=True)


if __name__ == "__main__":
    main()
