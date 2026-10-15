#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Consulente Digitale - «Scarica gli aggiornamenti» del programma stesso.

Come il Professore Digitale: il programma NON si collega a Internet da solo. Quando l'utente preme
«Controlla», legge il manifesto pubblicato sul sito del progetto (aggiornamenti.json su GitHub Pages),
confronta la versione, scarica il pacchetto giusto per il sistema SOLO da indirizzi autorizzati,
verifica l'impronta SHA-256 e poi lo installa:
  Windows  → avvia l'installatore (per l'utente, senza amministratore) e chiude il programma
  Linux    → installa il pacchetto .deb con la password (pkexec + apt)
  macOS    → mostra il file scaricato nel Finder (si trascina in Applicazioni)
  portatile/sorgenti → mostra lo zip scaricato
I dati dell'utente (impostazioni, schede, interviste) stanno in un'altra cartella e non vengono toccati.

Ideato e sviluppato da Danilo D'Auria - Codice MIT
"""
import hashlib
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import threading
import time
import urllib.request
from urllib.parse import urlsplit

MANIFESTO = os.environ.get("CD_MANIFESTO") or "https://danilodauria.github.io/consulente-digitale/aggiornamenti.json"
HOST_AMMESSI = ("danilodauria.github.io", "github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com")
WINDOWS = sys.platform.startswith("win")
MAC = sys.platform == "darwin"
STATO = {"fase": "pronto", "percento": 0, "messaggio": "", "file": "", "versione": "", "errore": "", "registro": []}
LOCK = threading.Lock()


def _ammesso(url):
    p = urlsplit(url or "")
    if os.environ.get("CD_MANIFESTO") and url.startswith("http://127.0.0.1:"):     # solo per le prove automatiche
        return True
    return p.scheme == "https" and p.hostname in HOST_AMMESSI


def confronta(a, b):
    """-1, 0, 1 tra due versioni X.Y.Z."""
    def n(v):
        return [int(x) for x in re.findall(r"\d+", str(v))[:3]] + [0, 0, 0]
    x, y = n(a)[:3], n(b)[:3]
    return (x > y) - (x < y)


def tipo_installazione(share_dir):
    s = os.path.abspath(share_dir).replace("\\", "/").lower()
    if WINDOWS and "/programs/consulentedigitale/" in s + "/":
        return "windows"
    if MAC and ".app/contents/" in s:
        return "mac"
    if s.startswith("/usr/share/consulente-digitale"):
        return "linux"
    if os.path.isdir(os.path.join(share_dir, "..", ".git")) or os.path.isdir(os.path.join(share_dir, "..", "..", ".git")):
        return "sorgenti"
    return "portatile"


def _apri_url(url, limite=None, timeout=30):
    if not _ammesso(url):
        raise ValueError("indirizzo non autorizzato: %s" % url)
    req = urllib.request.Request(url, headers={"User-Agent": "ConsulenteDigitale (aggiornamenti)", "Cache-Control": "no-cache"})
    ctx = ssl.create_default_context()
    return urllib.request.urlopen(req, timeout=timeout, context=ctx) if url.startswith("https") else urllib.request.urlopen(req, timeout=timeout)


def controlla(versione, share_dir):
    with _apri_url(MANIFESTO + ("&" if "?" in MANIFESTO else "?") + "t=%d" % time.time()) as r:
        m = json.loads(r.read(2 * 1024 * 1024).decode("utf-8"))
    tipo = tipo_installazione(share_dir)
    pacchetto = (m.get("scarica") or {}).get(tipo) or (m.get("scarica") or {}).get("portatile")
    nuova = confronta(m.get("versione"), versione) > 0
    return {"attuale": versione, "disponibile": m.get("versione"), "data": m.get("data"), "nuova": nuova, "novita": m.get("novita") or [],
            "tipo": tipo, "pacchetto": pacchetto, "sito": m.get("sito"), "vademecum": (m.get("scarica") or {}).get("vademecum")}


def _stato(**k):
    with LOCK:
        STATO.update(k)
        if k.get("messaggio"):
            STATO["registro"].append(time.strftime("%H:%M:%S ") + k["messaggio"])
            STATO["registro"] = STATO["registro"][-60:]


def stato():
    with LOCK:
        return dict(STATO, registro=list(STATO["registro"]))


def scarica(versione, share_dir, cartella_dati):
    """Avvia lo scaricamento in sottofondo; lo stato si legge con stato()."""
    if STATO["fase"] in ("scarico", "installo"):
        raise ValueError("operazione già in corso")
    info = controlla(versione, share_dir)
    p = info.get("pacchetto")
    if not info["nuova"] or not p:
        raise ValueError("non ci sono aggiornamenti da scaricare")
    if not _ammesso(p.get("url")) or not re.match(r"^[0-9a-f]{64}$", str(p.get("sha256", ""))):
        raise ValueError("manifesto non valido")
    dest_dir = os.path.join(cartella_dati, "aggiornamenti")
    os.makedirs(dest_dir, exist_ok=True)
    nome = re.sub(r"[^A-Za-z0-9._-]", "_", os.path.basename(urlsplit(p["url"]).path))
    dest = os.path.join(dest_dir, nome)
    _stato(fase="scarico", percento=0, errore="", file="", versione=info["disponibile"], messaggio="Scarico %s" % nome, registro=[])

    def lavoro():
        try:
            h = hashlib.sha256()
            with _apri_url(p["url"], timeout=60) as r, open(dest + ".parziale", "wb") as f:
                tot = int(r.headers.get("Content-Length") or p.get("byte") or 0)
                fatto = 0
                while True:
                    blocco = r.read(256 * 1024)
                    if not blocco:
                        break
                    f.write(blocco)
                    h.update(blocco)
                    fatto += len(blocco)
                    if tot:
                        _stato(percento=min(99, int(100 * fatto / tot)))
            if h.hexdigest() != p["sha256"]:
                os.remove(dest + ".parziale")
                raise RuntimeError("l'impronta SHA-256 non corrisponde: file scartato per sicurezza")
            os.replace(dest + ".parziale", dest)
            _stato(fase="scaricato", percento=100, file=dest, messaggio="Scaricato e verificato (SHA-256 %s…)" % p["sha256"][:16])
        except Exception as e:      # noqa: BLE001
            _stato(fase="errore", errore=str(e), messaggio="Errore: %s" % e)
    threading.Thread(target=lavoro, daemon=True).start()
    return stato()


def installa(share_dir, spegni):
    """Installa il file scaricato. «spegni» chiude il server (serve su Windows per sostituire i file)."""
    s = stato()
    f = s.get("file")
    if s["fase"] != "scaricato" or not f or not os.path.isfile(f):
        raise ValueError("prima scaricate l'aggiornamento")
    tipo = tipo_installazione(share_dir)
    if tipo == "windows" and f.lower().endswith(".exe"):
        subprocess.Popen([f], close_fds=True, creationflags=0x00000008 | 0x00000200)
        _stato(fase="installo", messaggio="Installatore avviato: il programma si chiude e si riapre alla fine")
        threading.Timer(2.5, spegni).start()
        return stato()
    if tipo == "linux" and f.endswith(".deb"):
        _stato(fase="installo", messaggio="Installo il pacchetto (vi verrà chiesta la password)")

        def lavoro():
            try:
                r = subprocess.run(["pkexec", "apt-get", "install", "-y", "--allow-downgrades", f], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=1800)
                for riga in r.stdout.decode("utf-8", "replace").splitlines()[-12:]:
                    _stato(messaggio=riga)
                if r.returncode == 0:
                    _stato(fase="installato", messaggio="Aggiornamento installato: chiudete e riaprite il Consulente Digitale")
                else:
                    _stato(fase="errore", errore="installazione non riuscita (codice %d)" % r.returncode, messaggio="Installazione non riuscita")
            except Exception as e:      # noqa: BLE001
                _stato(fase="errore", errore=str(e), messaggio="Errore: %s" % e)
        threading.Thread(target=lavoro, daemon=True).start()
        return stato()
    # macOS, portatile, sorgenti: si mostra il file
    try:
        if MAC:
            subprocess.Popen(["open", "-R", f])
        elif WINDOWS:
            subprocess.Popen(["explorer.exe", "/select,", f])
        elif shutil.which("xdg-open"):
            subprocess.Popen(["xdg-open", os.path.dirname(f)])
    except OSError:
        pass
    _stato(fase="installato", messaggio="File pronto: %s. %s" % (f, "Apritelo e trascinate l'app in Applicazioni." if MAC else "Estraetelo al posto della versione precedente."))
    return stato()
