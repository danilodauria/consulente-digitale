# -*- coding: utf-8 -*-
"""
Consulente Digitale - «Kit di emergenza»: chiavetta avviabile per i PC che non partono

Contenuto della chiavetta:
  - SystemRescue (system-rescue.org, licenza GPL): sistema Linux di soccorso con desktop grafico, TestDisk/PhotoRec,
    ddrescue, ntfs-3g, GRUB, efibootmgr, smartmontools, Firefox. Scaricato dal sito ufficiale e verificato con SHA-256.
  - «Neura Soccorso» (cartella neura/): questo stesso programma, che parte da solo con il desktop (configurazione
    sysrescue.d/500-neura.yaml, «gui_autostart»), fa la diagnosi del PC guasto e propone le riparazioni (cd_soccorso.py).

La chiavetta viene CANCELLATA: qui si accettano solo unità rimovibili (USB/SD), non di sistema, da 4 GB a 2 TB, scelte
tra quelle dell'analisi. Lo script che scrive ricontrolla numero, bus e dimensione prima di cancellare.

Solo libreria standard, Python 3.7+. Ideato e sviluppato da Danilo D'Auria - Codice MIT
"""
import json
import os
import re
import time
import uuid

import cd_recupero
import cd_sistema

FAM = cd_sistema.famiglia()
PROVA = os.environ.get("CD_KIT_PROVA") == "1"

# SystemRescue: versione verificata (somma SHA-256 pubblicata su system-rescue.org/Download)
SR_VERSIONE = "13.02"
SR_URL = "https://fastly-cdn.system-rescue.org/releases/13.02/systemrescue-13.02-amd64.iso"
SR_SHA256 = "ad4d670b72859d887c7960142a9a9d36a3e50446694a035e254442f65d6e7572"
SR_DIMENSIONE = 1318 * 1024 * 1024
SR_ETICHETTA = "RESCUE1302"          # il sistema di avvio cerca la chiavetta con questo nome: non cambiarlo
MIN_BYTE = 4 * 1000 ** 3
MAX_BYTE = 2 * 1000 ** 4
RE_ID = re.compile(r"^[a-f0-9]{12}$")

YAML_NEURA = """---
# Neura Soccorso - Consulente Digitale (ideato e sviluppato da Danilo D'Auria - Codice MIT)
# SystemRescue legge i file .yaml di questa cartella all'avvio (system-rescue.org/manual/Configuring_SystemRescue)
global:
    dostartx: true
    setkmap: "it"
gui_autostart:
    500:
        exec: "bash /run/archiso/bootmnt/neura/avvia-neura.sh"
        terminal: false
"""

AVVIA_NEURA = r"""#!/bin/bash
# Neura Soccorso: avvia Consulente Digitale dalla chiavetta di emergenza (SystemRescue) e apre la pagina «Soccorso».
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
K=/run/archiso/bootmnt
mount -o remount,rw "$K" 2>/dev/null          # per salvare rapporti e file recuperati anche sulla chiavetta
export CD_SOCCORSO=1 CD_SHARE_DIR="$K/neura" CD_DATA_DIR=/root/neura-dati CD_PORT=8810
mkdir -p "$CD_DATA_DIR"
python3 "$K/neura/server/cd_server.py" --port 8810 --inattivo 0 >"$CD_DATA_DIR/avvio.log" 2>&1 &
for _ in $(seq 1 60); do
    curl -s -o /dev/null http://127.0.0.1:8810/api/status && break
    sleep 0.5
done
B=firefox-esr; command -v "$B" >/dev/null || B=firefox
exec "$B" --new-window "http://127.0.0.1:8810/#/soccorso"
"""

LEGGIMI_KIT = """KIT DI EMERGENZA - Consulente Digitale con Neura Soccorso
=========================================================

Come si usa
 1. Spegnete il PC che non parte e inserite questa chiavetta.
 2. Accendetelo e premete subito il tasto del «menu di avvio» (di solito F12, F11, F10, F9, F8 o Esc;
    sui Lenovo anche il tastino Novo). Scegliete la voce con «USB» o il nome della chiavetta (UEFI).
 3. Nel menu di SystemRescue premete Invio sulla prima voce. In un minuto o due si apre il desktop e
    Neura Soccorso parte da sola: fa la diagnosi e propone le riparazioni con un clic.
 Se la chiavetta non compare: nel BIOS/UEFI disattivate «Secure Boot» (alcuni PC non avviano sistemi
 Linux non firmati), poi riattivatelo alla fine.

Cosa c'è
 - SystemRescue %(v)s (system-rescue.org, licenza GPL): sistema di soccorso con TestDisk/PhotoRec, GParted,
   ddrescue, Firefox e altri strumenti liberi. Ogni programma mantiene la sua licenza.
 - neura/ : Consulente Digitale (codice MIT, contenuti CC BY-NC-SA 4.0) di Danilo D'Auria.
 - sysrescue.d/500-neura.yaml : avvio automatico di Neura e tastiera italiana.

Consulente Digitale - ideato e sviluppato da Danilo D'Auria. Idea, loghi, immagini, grafica e icone:
Danilo D'Auria (CC BY-NC-SA 4.0). Codice: licenza MIT.
"""


def unita():
    """Chiavette e dischi esterni adatti (rimovibili, non di sistema, 4 GB - 2 TB)."""
    if PROVA:
        img = os.environ.get("CD_KIT_IMMAGINE", "")
        return [{"id": img, "nome": "Chiavetta di prova", "dimensione": 8 * 1000 ** 3, "bus": "USB", "adatta": True, "motivo": "",
                 "partizioni": [], "numero": 9}]
    a = cd_recupero.analizza()
    out = []
    for d in a.get("dischi", []):
        motivo = ""
        if d.get("sistema"):
            motivo = "È il disco del sistema"
        elif not d.get("rimovibile"):
            motivo = "Non è un'unità rimovibile (USB/SD)"
        elif d.get("dimensione", 0) < MIN_BYTE:
            motivo = "Troppo piccola: servono almeno 4 GB"
        elif d.get("dimensione", 0) > MAX_BYTE:
            motivo = "Troppo grande: usate una chiavetta, non un disco esterno"
        m = re.search(r"PhysicalDrive(\d+)$", d.get("id", ""))
        out.append({"id": d.get("id"), "nome": d.get("nome"), "dimensione": d.get("dimensione", 0), "bus": d.get("bus", ""),
                    "adatta": not motivo, "motivo": motivo, "numero": int(m.group(1)) if m else -1,
                    "partizioni": [{"nome": p.get("nome"), "etichetta": p.get("etichetta"), "usato": p.get("usato", 0)} for p in d.get("partizioni", [])]})
    return out


def _cartella(dati):
    c = os.path.join(dati, "kit")
    os.makedirs(c, exist_ok=True)
    return c


def prepara(dati, share_dir, disco_id):
    u = next((x for x in unita() if x["id"] == disco_id), None)
    if not u:
        raise ValueError("chiavetta non trovata: ricollegatela e ripetete")
    if not u["adatta"]:
        raise ValueError("unità non adatta: " + u["motivo"])
    pid = uuid.uuid4().hex[:12]
    cache = os.environ.get("CD_KIT_ISO") or os.path.join(_cartella(dati), "systemrescue-%s-amd64.iso" % SR_VERSIONE)
    piano = {"id": pid, "creato": time.time(), "disco": u["id"], "numero": u["numero"], "dimensione": u["dimensione"], "nome": u["nome"],
             "iso_url": SR_URL, "iso_sha256": SR_SHA256 if not PROVA else os.environ.get("CD_KIT_SHA", ""), "iso": cache,
             "etichetta": SR_ETICHETTA, "neura": os.path.normpath(share_dir), "prova": "1" if PROVA else ""}
    c = _cartella(dati)
    with open(os.path.join(c, "piano-%s.json" % pid), "w", encoding="utf-8") as f:
        json.dump(piano, f, ensure_ascii=False, indent=1)
    with open(os.path.join(c, "piano-%s.sh" % pid), "w", encoding="utf-8", newline="\n") as f:
        for k in ("disco", "numero", "dimensione", "iso_url", "iso_sha256", "iso", "etichetta", "neura", "prova"):
            f.write("P_%s='%s'\n" % (k.upper(), str(piano[k]).replace("'", "")))
    # i file del kit che vanno sulla chiavetta (scritti dagli script così come sono)
    for nome, testo in (("500-neura.yaml", YAML_NEURA), ("avvia-neura.sh", AVVIA_NEURA),
                        ("LEGGIMI-KIT.txt", LEGGIMI_KIT % {"v": SR_VERSIONE})):
        with open(os.path.join(c, nome), "w", encoding="utf-8", newline="\n") as f:
            f.write(testo)
    return piano


def info():
    return {"versione": SR_VERSIONE, "url": SR_URL, "sha256": SR_SHA256, "dimensione": SR_DIMENSIONE, "sistema": FAM,
            "supportato": FAM in ("windows", "linux"), "prova": PROVA}
