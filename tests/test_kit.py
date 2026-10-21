#!/usr/bin/env python3
"""Consulente Digitale - prova del «Kit di emergenza» con lo script Linux vero (kit-crea.sh), su un'immagine al posto della
chiavetta e un piccolo ISO finto al posto di SystemRescue. Controlla: piano, verifica SHA-256, FAT32 con il nome giusto,
file di avvio copiati, Neura e la configurazione di SystemRescue sulla chiavetta, e che Neura parta davvero dalla
copia sulla chiavetta (come fa avvia-neura.sh). Servono xorriso, mtools e dosfstools.
Ideato e sviluppato da Danilo D'Auria - Codice MIT"""
import hashlib
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(QUI)
ERRORI = []


def porta_libera():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def controlla(cond, msg):
    print(("  ✔ " if cond else "  ✖ ") + msg)
    if not cond:
        ERRORI.append(msg)


def api(porta, percorso, corpo=None):
    req = urllib.request.Request("http://127.0.0.1:%d%s" % (porta, percorso), method="POST" if corpo is not None else "GET",
                                 data=json.dumps(corpo).encode() if corpo is not None else None, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def server(env, porta):
    p = subprocess.Popen([sys.executable, os.path.join(env.get("CD_SHARE_DIR") or os.path.join(RADICE, "src"), "server", "cd_server.py"),
                          "--port", str(porta), "--inattivo", "0"], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):
        try:
            return p, api(porta, "/api/status")
        except OSError:
            time.sleep(0.2)
    return p, None


def main():
    if not all(shutil.which(x) for x in ("xorriso", "mcopy", "mkfs.vfat")):
        print("Servono xorriso, mtools e dosfstools: prova saltata")
        return 0
    lav = tempfile.mkdtemp(prefix="cd-kit-")
    # ISO finto con la stessa forma di SystemRescue
    albero = os.path.join(lav, "albero")
    for d in ("EFI/boot", "sysresccd/boot/x86_64", "sysresccd/x86_64"):
        os.makedirs(os.path.join(albero, d))
    open(os.path.join(albero, "EFI/boot/bootx64.efi"), "wb").write(b"MZ finto")
    open(os.path.join(albero, "sysresccd/x86_64/airootfs.sfs"), "wb").write(os.urandom(200000))
    iso = os.path.join(lav, "systemrescue-prova.iso")
    subprocess.check_call(["xorriso", "-as", "mkisofs", "-quiet", "-V", "RESCUE1302", "-o", iso, albero], stderr=subprocess.DEVNULL)
    sha = hashlib.sha256(open(iso, "rb").read()).hexdigest()
    img = os.path.join(lav, "chiavetta.img")
    with open(img, "wb") as f:
        f.truncate(64 * 1024 * 1024)
    dati = os.path.join(lav, "dati")
    porta = porta_libera()
    env = dict(os.environ, CD_DATA_DIR=dati, CD_KIT_PROVA="1", CD_KIT_IMMAGINE=img, CD_KIT_ISO=iso, CD_KIT_SHA=sha)
    srv, st = server(env, porta)
    try:
        print("Kit di emergenza")
        u = api(porta, "/api/kit/unita")
        controlla(u["unita"] and u["unita"][0]["adatta"], "chiavetta di prova adatta")
        p = api(porta, "/api/kit/piano", {"token": st["token"], "disco": img})["piano"]
        lj = api(porta, "/api/azioni/avvia", {"token": st["token"], "id": "kit_crea", "parametro": p["id"]})["lavoro"]
        for _ in range(240):
            j = api(porta, "/api/lavori/" + lj)
            if j["stato"] != "in_corso":
                break
            time.sleep(0.5)
        controlla(j["stato"] == "fatto" and j["info"].get("kit") == "pronto", "script kit-crea.sh terminato (%s)" % j["stato"])
        if j["stato"] != "fatto":
            print("\n".join(r if isinstance(r, str) else str(r) for r in j["righe"][-20:]))
        etichetta = subprocess.run(["mlabel", "-s", "-i", img, "::"], stdout=subprocess.PIPE).stdout.decode()
        controlla("RESCUE1302" in etichetta, "FAT32 con il nome che SystemRescue cerca all'avvio")
        elenco = subprocess.run(["mdir", "-/", "-b", "-i", img, "::/"], stdout=subprocess.PIPE).stdout.decode()
        for f in ("EFI/boot/bootx64.efi", "sysresccd/x86_64/airootfs.sfs", "sysrescue.d/500-neura.yaml", "neura/avvia-neura.sh",
                  "neura/server/cd_server.py", "neura/server/cd_soccorso.py", "neura/web/index.html", "neura/azioni/linux/_comune.sh", "LEGGIMI-KIT.txt"):
            controlla(("::/" + f).lower() in elenco.lower(), "sulla chiavetta: " + f)
        controlla("__pycache__" not in elenco, "niente file temporanei di Python")
        # Neura parte dalla copia sulla chiavetta (come in avvia-neura.sh)
        copia = os.path.join(lav, "bootmnt")
        os.makedirs(copia)
        subprocess.check_call(["mcopy", "-s", "-i", img, "::/neura", "::/sysrescue.d", copia + "/"])
        yaml = open(os.path.join(copia, "sysrescue.d", "500-neura.yaml"), encoding="utf-8").read()
        controlla("dostartx: true" in yaml and "/run/archiso/bootmnt/neura/avvia-neura.sh" in yaml and "gui_autostart:" in yaml, "configurazione di SystemRescue")
        porta2 = porta_libera()
        env2 = dict(os.environ, CD_SOCCORSO="1", CD_SHARE_DIR=os.path.join(copia, "neura"), CD_DATA_DIR=os.path.join(lav, "neura-dati"))
        srv2, st2 = server(env2, porta2)
        try:
            controlla(st2 and st2.get("chiavetta") is True and st2.get("versione"), "Neura parte dalla chiavetta in modalità soccorso")
            html = urllib.request.urlopen("http://127.0.0.1:%d/" % porta2, timeout=10).read().decode()
            controlla("kit.js" in html, "interfaccia servita dalla chiavetta")
            controlla(len(api(porta2, "/api/azioni")["azioni"]) >= 10, "azioni di Linux disponibili dalla chiavetta")
        finally:
            srv2.terminate()
    finally:
        srv.terminate()
        shutil.rmtree(lav, ignore_errors=True)
    print("\n%d problemi" % len(ERRORI))
    return 1 if ERRORI else 0


if __name__ == "__main__":
    sys.exit(main())
