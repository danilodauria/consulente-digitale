#!/usr/bin/env python3
"""Consulente Digitale - prova completa di Salvadati con un'unità vera (immagine FAT32 con file cancellati).
Serve PhotoRec (pacchetto testdisk), mtools e dosfstools. Controlla: analisi, piano, ricerca VERA con PhotoRec,
scarto dei file danneggiati, doppioni, nomi dalle foto (EXIF), conteggio e spazio, copia su un'altra unità.
Ideato e sviluppato da Danilo D'Auria - Codice MIT"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(QUI)
import socket
_s = socket.socket()
_s.bind(("127.0.0.1", 0))
PORTA = _s.getsockname()[1]          # una porta libera ogni volta
_s.close()
ERRORI = []


def controlla(cond, msg):
    print(("  ✔ " if cond else "  ✖ ") + msg)
    if not cond:
        ERRORI.append(msg)


def api(percorso, corpo=None):
    req = urllib.request.Request("http://127.0.0.1:%d%s" % (PORTA, percorso), method="POST" if corpo is not None else "GET",
                                 data=json.dumps(corpo).encode() if corpo is not None else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def prepara_immagine(cartella):
    from PIL import Image
    src = os.path.join(cartella, "src")
    os.makedirs(src)
    for i in range(3):
        im = Image.effect_noise((640, 480), 40 + i * 10).convert("RGB")
        exif = im.getexif()
        exif[0x0132] = "2023:07:1%d 18:30:0%d" % (i, i)          # data dello scatto
        im.save(os.path.join(src, "foto%d.jpg" % i), quality=85, exif=exif)
    Image.new("RGB", (120, 80), (10, 200, 10)).save(os.path.join(src, "disegno.png"))
    import zipfile
    with zipfile.ZipFile(os.path.join(src, "relazione.docx"), "w") as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("word/document.xml", "<w:document>" + "testo " * 3000 + "</w:document>")
        z.writestr("docProps/core.xml", "<cp:coreProperties><dc:title>Relazione del centro anziani</dc:title></cp:coreProperties>")
    # una foto rovinata (tagliata a metà): va scartata
    d = open(os.path.join(src, "foto0.jpg"), "rb").read()
    open(os.path.join(src, "rovinata.jpg"), "wb").write(d[:len(d) // 2])
    # un doppione
    shutil.copy(os.path.join(src, "foto2.jpg"), os.path.join(src, "copia-foto2.jpg"))
    img = os.path.join(cartella, "chiavetta.img")
    with open(img, "wb") as f:
        f.truncate(64 * 1024 * 1024)
    subprocess.check_call(["mkfs.vfat", "-F", "32", "-n", "FOTO", img], stdout=subprocess.DEVNULL)
    for n in sorted(os.listdir(src)):
        subprocess.check_call(["mcopy", "-i", img, os.path.join(src, n), "::/"])
    for n in ("foto1.jpg", "relazione.docx", "rovinata.jpg", "copia-foto2.jpg", "foto2.jpg"):
        subprocess.check_call(["mdel", "-i", img, "::/" + n])
    return img


def main():
    if not shutil.which("photorec") or not shutil.which("mcopy"):
        print("Servono photorec (testdisk) e mtools: prova saltata")
        return 0
    lavoro = tempfile.mkdtemp(prefix="cd-recupero-")
    img = prepara_immagine(lavoro)
    dest = os.path.join(lavoro, "disco-esterno")
    os.makedirs(dest)
    dest2 = os.path.join(lavoro, "secondo-disco")
    os.makedirs(dest2)
    dati = os.path.join(lavoro, "dati")
    env = dict(os.environ, CD_DATA_DIR=dati, CD_RECUPERO_PROVA="1", CD_RECUPERO_IMMAGINE=img, CD_RECUPERO_DEST=dest)
    srv = subprocess.Popen([sys.executable, os.path.join(RADICE, "src", "server", "cd_server.py"), "--port", str(PORTA), "--inattivo", "0"],
                           env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:
                st = api("/api/status")
                break
            except OSError:
                time.sleep(0.2)
        tok = st["token"]
        print("Analisi")
        a = api("/api/recupero/analisi")
        controlla(any(p["stato"] == "raw" for d in a["dischi"] for p in d["partizioni"]), "trovata l'unità RAW")
        controlla(any(p["stato"] == "illeggibile" for d in a["dischi"] for p in d["partizioni"]), "trovata l'unità illeggibile (ext4)")
        controlla(a["motore"]["pronto"], "motore PhotoRec trovato")
        dd = api("/api/recupero/destinazioni")["destinazioni"]
        controlla(any(x["id"] == "dest-prova" for x in dd), "destinazioni con lo spazio libero")
        print("Piano")
        try:
            api("/api/recupero/piano", {"token": tok, "sorgente": "prova-c", "modo": "superficiale", "categorie": ["foto"], "destinazione": "dest-prova"})
            controlla(False, "rifiutata la destinazione sullo stesso disco")
        except urllib.error.HTTPError as e:
            controlla(e.code == 400 and "STESSO" in e.read().decode(), "rifiutata la destinazione sullo stesso disco")
        p = api("/api/recupero/piano", {"token": tok, "sorgente": img, "modo": "superficiale", "categorie": ["foto", "documenti"], "destinazione": "dest-prova"})["piano"]
        controlla(p["spazio"] == "freespace" and p["scelta"] == "1", "superficiale = solo lo spazio libero (dove stanno i cancellati)")
        print("Ricerca con PhotoRec")
        lav = api("/api/azioni/avvia", {"token": tok, "id": "recupero_avvia", "parametro": p["id"]})["lavoro"]
        for _ in range(300):
            j = api("/api/lavori/%s" % lav)
            if j["stato"] != "in_corso":
                break
            time.sleep(1)
        controlla(j["stato"] == "fatto", "ricerca terminata (%s)" % j["stato"])
        if j["stato"] != "fatto":
            print("\n".join(r if isinstance(r, str) else r.get("t", "") for r in j.get("righe", [])[-15:]))
        print("Controllo dei file")
        api("/api/recupero/elabora", {"token": tok, "piano": p["id"]})
        for _ in range(120):
            s = api("/api/recupero/stato?piano=" + p["id"])["stato"]
            if s.get("fase") in ("fatto", "errore"):
                break
            time.sleep(0.5)
        print("   ", {k: s.get(k) for k in ("file", "byte", "scartati", "doppioni", "esaminati")})
        controlla(s.get("fase") == "fatto", "elaborazione finita")
        controlla(s.get("file") == 3, "3 file buoni: 2 foto cancellate + il documento (%s)" % s.get("file"))
        controlla(s.get("scartati", 0) >= 1, "la foto rovinata è stata scartata")
        controlla(s.get("doppioni", 0) >= 1, "il doppione è stato tolto")
        cart = s.get("cartella", "")
        foto = sorted(os.listdir(os.path.join(cart, "Foto"))) if os.path.isdir(os.path.join(cart, "Foto")) else []
        controlla(any(f.startswith("Foto 2023-07-11") for f in foto), "foto rinominata con la data dello scatto (%s)" % foto)
        doc = os.listdir(os.path.join(cart, "Documenti")) if os.path.isdir(os.path.join(cart, "Documenti")) else []
        controlla(any("Relazione del centro anziani" in f and f.endswith(".docx") for f in doc), "documento con il suo titolo (%s)" % doc)
        controlla(os.path.isfile(os.path.join(cart, "Rapporto Salvadati.html")), "rapporto stampabile")
        controlla(not any(n.startswith("Salvadati-lavoro") for n in os.listdir(dest)), "cartella di lavoro tolta")
        print("Copia su un'altra unità")
        os.environ["CD_RECUPERO_DEST"] = dest2
        c = api("/api/recupero/copia", {"token": tok, "piano": p["id"], "destinazione": "dest-prova"})
        for _ in range(60):
            c = api("/api/recupero/stato?piano=" + p["id"])["copia"]
            if c.get("fase") != "in_corso":
                break
            time.sleep(0.3)
        controlla(c.get("fase") == "fatto" and c.get("fatti", 0) >= 3, "copia di sicurezza fatta (%s file)" % c.get("fatti"))
    finally:
        srv.terminate()
        shutil.rmtree(lavoro, ignore_errors=True)
    print("\n%d problemi" % len(ERRORI))
    return 1 if ERRORI else 0


if __name__ == "__main__":
    sys.exit(main())
