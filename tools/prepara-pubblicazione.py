#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Consulente Digitale - prepara la cartella «sito/» da pubblicare su GitHub Pages.

Uso (dopo ./build.sh):   python3 tools/prepara-pubblicazione.py
Crea:
  sito/index.html            pagina del progetto con i download, le novità, autore e licenze
  sito/aggiornamenti.json    manifesto letto da «Scarica gli aggiornamenti» (versione, novità, file, SHA-256)
  sito/scarica/...           installatori e vademecum della versione corrente (dalla cartella dist/)
  sito/img/...               logo e alcune schermate
  sito/SHA256SUMS, sito/.nojekyll
Poi: GitHub Desktop → Commit → Push; il workflow .github/workflows/pubblica-sito.yml pubblica il sito.

Ideato e sviluppato da Danilo D'Auria - Codice MIT, testi CC BY-NC-SA 4.0
"""
import hashlib
import html
import json
import os
import shutil
import sys

RADICE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


def conf():
    c = {}
    with open(os.path.join(RADICE, "rilascio.conf"), encoding="utf-8") as f:
        for r in f:
            r = r.strip()
            if r and not r.startswith("#") and "=" in r:
                k, v = r.split("=", 1)
                c[k.strip()] = v.strip()
    return c


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main():
    c = conf()
    base = c["BASE_URL"].rstrip("/")
    v = open(os.path.join(RADICE, "VERSION")).read().strip()
    nov = json.load(open(os.path.join(RADICE, "docs", "novita.json"), encoding="utf-8"))["versioni"]
    corrente = next((x for x in nov if x["versione"] == v), None)
    if not corrente:
        sys.exit("Manca la versione %s in docs/novita.json: aggiungete le novità prima di pubblicare." % v)
    dist = os.path.join(RADICE, "dist")
    attesi = {"windows": "ConsulenteDigitale-Setup-%s.exe" % v, "linux": "consulente-digitale_%s_all.deb" % v, "mac": "ConsulenteDigitale-%s-macOS.zip" % v,
              "portatile": "ConsulenteDigitale-%s-portatile.zip" % v, "vademecum": "Vademecum_Consulente_Digitale_%s.pdf" % v}
    mancano = [n for n in attesi.values() if not os.path.isfile(os.path.join(dist, n))]
    if mancano:
        sys.exit("Mancano in dist/: %s\nPrima eseguite ./build.sh" % ", ".join(mancano))
    sito = os.path.join(RADICE, "sito")
    if os.path.isdir(sito):
        shutil.rmtree(sito)
    os.makedirs(os.path.join(sito, "scarica"))
    os.makedirs(os.path.join(sito, "img"))
    scarica, somme = {}, []
    for k, nome in attesi.items():
        src = os.path.join(dist, nome)
        shutil.copy2(src, os.path.join(sito, "scarica", nome))
        h = sha(src)
        somme.append("%s  %s" % (h, nome))
        scarica[k] = {"nome": nome, "url": "%s/scarica/%s" % (base, nome), "sha256": h, "byte": os.path.getsize(src)}
    manifesto = {"app": "Consulente Digitale", "autore": "Danilo D'Auria", "versione": v, "data": corrente["data"], "novita": corrente["novita"],
                 "sito": base + "/", "progetto": c.get("PAGINA_PROGETTO", ""), "scarica": scarica, "licenze": {"codice": "MIT", "contenuti": "CC BY-NC-SA 4.0"}}
    with open(os.path.join(sito, "aggiornamenti.json"), "w", encoding="utf-8") as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=1)
    with open(os.path.join(sito, "SHA256SUMS"), "w") as f:
        f.write("\n".join(somme) + "\n")
    open(os.path.join(sito, ".nojekyll"), "w").close()
    # immagini
    shutil.copy2(os.path.join(RADICE, "src", "web", "img", "logo.svg"), os.path.join(sito, "img", "logo.svg"))
    img = os.path.join(RADICE, "docs", "sorgenti", "img")
    foto = []
    for nome, didascalia in (("inizio.jpg", "La pagina iniziale"), ("neura.jpg", "Neura, il cervello che ascolta e risponde"), ("hardware-schema.jpg", "Lo schema della scheda madre con i punti a rischio"),
                             ("hardware.jpg", "Sensori in diretta"), ("interventi.jpg", "Diagnosi e lavori da eseguire"), ("nonni-intervista.jpg", "Nonni Teach: l'intervista"),
                             ("analisi.jpg", "L'analisi del computer"), ("circolare.jpg", "Economia circolare")):
        if os.path.isfile(os.path.join(img, nome)):
            shutil.copy2(os.path.join(img, nome), os.path.join(sito, "img", nome))
            foto.append((nome, didascalia))
    # pagina
    h = html.escape
    MB = lambda k: "%.1f MB" % (scarica[k]["byte"] / 1048576.0)     # noqa: E731
    bottoni = [("windows", "🪟", "Windows 10 e 11", "Installatore per l'utente: niente permessi di amministratore"),
               ("linux", "🐧", "Linux (Ubuntu, Mint, Zorin, Debian…)", "Pacchetto .deb: doppio clic o «sudo apt install ./file.deb»"),
               ("mac", "🍎", "macOS", "App da trascinare in Applicazioni (primo avvio: tasto destro → Apri)"),
               ("portatile", "💾", "Portatile, tutti i sistemi", "Da chiavetta USB, senza installare"),
               ("vademecum", "📘", "Vademecum (PDF)", "Il manuale completo, passo per passo")]
    pagina = """<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consulente Digitale</title><meta name="description" content="Il cervello che sceglie, aggiorna e ottimizza i vostri dispositivi. Di Danilo D'Auria. Software libero.">
<link rel="icon" href="img/logo.svg"><meta property="og:title" content="Consulente Digitale"><meta property="og:image" content="%(base)s/img/logo.svg">
<style>
:root{--f:#050816;--p:#0f1934;--t:#e6f1ff;--t2:#9fb3cf;--n:#38bdf8;--n2:#a78bfa;--ok:#34d399;--b:rgba(125,211,252,.22)}
@media (prefers-color-scheme: light){:root{--f:#eef3fb;--p:#fff;--t:#0f1d36;--t2:#4a5b78;--n:#0369a1;--n2:#6d28d9;--ok:#047857;--b:rgba(30,64,175,.16)}}
*{box-sizing:border-box}body{margin:0;background:var(--f);color:var(--t);font:18px/1.6 "Segoe UI",system-ui,-apple-system,sans-serif}
header{text-align:center;padding:3rem 16px 2rem;background:radial-gradient(circle at 50%% 0,rgba(56,189,248,.28),transparent 60%%)}
header img{width:140px;height:140px;filter:drop-shadow(0 0 30px rgba(56,189,248,.5))}h1{font-size:2.4rem;margin:.4rem 0 0}
.sotto{color:var(--t2);max-width:44rem;margin:.4rem auto}main{max-width:64rem;margin:0 auto;padding:0 16px 3rem}
.dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.8rem;margin:1.5rem 0}
.dl a{display:block;background:var(--p);border:1px solid var(--b);border-radius:18px;padding:1rem;color:var(--t);text-decoration:none}
.dl a:hover{border-color:var(--n)}.dl b{display:block;font-size:1.1rem}.dl span{font-size:2rem}.dl small{color:var(--t2);display:block}
.dl code{font-size:.62rem;color:var(--t2);word-break:break-all}h2{color:var(--n);margin-top:2.2rem}
.carte{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:.8rem}.carte div{background:var(--p);border:1px solid var(--b);border-radius:16px;padding:.9rem}
.foto{display:grid;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr));gap:.8rem}.foto figure{margin:0}.foto img{width:100%%;border-radius:12px;border:1px solid var(--b)}
.foto figcaption{font-size:.85rem;color:var(--t2)}footer{color:var(--t2);font-size:.85rem;text-align:center;padding:2rem 16px;border-top:1px solid var(--b)}a{color:var(--n)}
.versione{display:inline-block;border:1px solid var(--ok);color:var(--ok);border-radius:99px;padding:0 .7rem;font-size:.9rem}
</style></head><body>
<header><img src="img/logo.svg" alt="Neura, il logo del Consulente Digitale"><h1>Consulente Digitale</h1>
<p class="sotto">Il cervello che sceglie, aggiorna e ottimizza i vostri dispositivi. Per persone, famiglie, scuole, centri anziani e aziende. Gratis, libero, in italiano semplice.</p>
<p><span class="versione">Versione %(v)s · %(data)s</span></p></header>
<main>
<div class="dl">%(bottoni)s</div>
<h2>✨ Novità della versione %(v)s</h2><ul>%(novita)s</ul>
<h2>🧠 Cosa fa</h2><div class="carte">
<div><b>🧠 Neura</b><br>Ascolta, parla e si illumina; con l'intelligenza artificiale locale tutto resta sul vostro computer.</div>
<div><b>🔬 Analisi e 🧬 hardware</b><br>Voti, sistema operativo consigliato, sensori in diretta e schema della scheda madre con i guasti imminenti.</div>
<div><b>🛠️ Diagnosi e interventi</b><br>Lavori da eseguire e lavori fatti, con le schede professionali da stampare.</div>
<div><b>⬇️ Aggiornamenti e driver</b><br>Solo da fonti ufficiali: Windows Update, winget, la vostra distribuzione, Apple, fwupd.</div>
<div><b>🛒 Cosa comprare e quando</b><br>Guida all'acquisto e calendario delle offerte con l'ora esatta dell'INRiM.</div>
<div><b>🎙️ Nonni Teach</b><br>I nonni raccontano, Neura intervista e crea il podcast. <a href="%(podcast)s">Ascolta i podcast</a>.</div>
<div><b>♻️ Economia circolare</b><br>Riparare, riusare, donare, riciclare bene: regole, consigli e quiz.</div>
<div><b>💡 Cose da sapere e 📜 storia</b><br>Sicurezza, truffe, glossario e la storia dei computer con gli italiani che l'hanno fatta.</div></div>
%(foto)s
<h2>🔒 Sicurezza e privacy</h2><p>Il programma funziona sul vostro computer, senza account e senza pubblicità. Ogni modifica al sistema parte solo con un vostro clic; Neura chiede il permesso anche per aprire una finestra.
Gli aggiornamenti si scaricano solo quando lo chiedete e sono verificati con l'impronta SHA-256 (<a href="SHA256SUMS">SHA256SUMS</a>, <a href="aggiornamenti.json">aggiornamenti.json</a>).</p>
<h2>📜 Autore e licenze</h2><p>Ideato e sviluppato da <b>Danilo D'Auria</b> — autore anche del <a href="https://danilodauria.github.io/professore-digitale/">Professore Digitale</a>, di <a href="https://danilodauria.github.io/feniceos/">FeniceOS</a> e del libro «Tecnologia Gentile: Informatica Sostenibile».<br>
Codice sotto licenza <b>MIT</b>; testi, grafica, vademecum e banche dati sotto licenza <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it"><b>CC BY-NC-SA 4.0</b></a> (attribuzione, non commerciale, condividi allo stesso modo). <a href="%(progetto)s">Codice sorgente su GitHub</a>.</p>
</main>
<footer>© 2026 Danilo D'Auria · Consulente Digitale %(v)s · Codice MIT · Contenuti CC BY-NC-SA 4.0 · <a href="mailto:danilodauria.site@gmail.com">contatti</a></footer>
</body></html>
""" % {"base": h(base), "v": h(v), "data": h(corrente["data"]), "podcast": h(c.get("PODCAST_NONNI", "")), "progetto": h(c.get("PAGINA_PROGETTO", "")),
       "novita": "".join("<li>%s</li>" % h(n) for n in corrente["novita"]),
       "bottoni": "".join('<a href="scarica/%s" download><span>%s</span><b>%s</b><small>%s · %s</small><code>SHA-256 %s</code></a>' % (
           h(scarica[k]["nome"]), ic, h(t), h(d), MB(k), scarica[k]["sha256"]) for k, ic, t, d in bottoni),
       "foto": ('<h2>📸 Come si presenta</h2><div class="foto">' + "".join('<figure><img src="img/%s" alt="%s" loading="lazy"><figcaption>%s</figcaption></figure>' % (h(n), h(d), h(d)) for n, d in foto) + "</div>") if foto else ""}
    with open(os.path.join(sito, "index.html"), "w", encoding="utf-8") as f:
        f.write(pagina)
    tot = sum(os.path.getsize(os.path.join(r, x)) for r, _, fs in os.walk(sito) for x in fs)
    print("Sito pronto in %s (%.1f MB) per la versione %s.\nManifesto: %s/aggiornamenti.json" % (sito, tot / 1048576.0, v, base))
    print("Ora: GitHub Desktop → Commit to main → Push origin. Il sito si pubblica da solo in 1-2 minuti.")


if __name__ == "__main__":
    main()
