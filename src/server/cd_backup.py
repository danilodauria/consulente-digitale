#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Consulente Digitale - BACKUP (.cdbackup), RIPRISTINO e RESET.

Il file .cdbackup è un archivio ZIP che si apre con il Consulente Digitale su Windows, Linux e macOS:
  consulente-digitale-backup.json   impostazioni, profilo, conversazione, schede, diagnosi, notizie salvate...
  LICENZA.txt, LEGGIMI.txt          licenze (programma MIT, contenuti CC BY-NC-SA 4.0) e istruzioni
  nonni-teach/...                   (facoltativo) interviste e registrazioni di Nonni Teach
Si accetta anche un .cdbackup in solo JSON (quello creato dal telefono, senza programma sul PC).

Sicurezza: si importano SOLO le chiavi dati conosciute e i file di Nonni Teach con nomi validi
(niente percorsi che escono dalla cartella), con un limite di dimensione; prima di importare o
azzerare si salva da soli una copia in «backup-automatici».

Ideato e sviluppato da Danilo D'Auria - Codice MIT, contenuti e formato CC BY-NC-SA 4.0
"""
import io
import json
import os
import re
import shutil
import sys
import time
import zipfile

FORMATO = "cdbackup"
VERSIONE_FORMATO = 1
NOME_JSON = "consulente-digitale-backup.json"
MAX_BACKUP = 400 * 1024 * 1024
RE_NONNI = re.compile(r"^nonni-teach/([a-z0-9][a-z0-9-]{2,70})/((?:r|d)\d{2}\.(?:webm|ogg|oga|mp4|m4a|wav|mp3)|podcast\.mp3|intro\.wav|episodio\.json|capitoli\.txt)$")
ALTRI_FILE = ("hardware-completo.json",)
LICENZA = """CONSULENTE DIGITALE - file di backup (.cdbackup)
Ideato e sviluppato da Danilo D'Auria - https://danilodauria.github.io/consulente-digitale/

Il programma Consulente Digitale è software libero con licenza MIT.
Il formato .cdbackup, i testi, le schede, la grafica e i contenuti del programma sono
© 2026 Danilo D'Auria, licenza Creative Commons Attribuzione - Non commerciale -
Condividi allo stesso modo 4.0 Internazionale (CC BY-NC-SA 4.0):
https://creativecommons.org/licenses/by-nc-sa/4.0/deed.it

I DATI PERSONALI contenuti in questo backup (nomi, conversazioni, schede, registrazioni)
appartengono a chi li ha creati: conservate il file con cura e non condividetelo con estranei.
Le registrazioni di Nonni Teach appartengono alle persone intervistate e si usano solo secondo
il consenso dato nella liberatoria.
"""
LEGGIMI = """COME RIPRISTINARE QUESTO BACKUP
1. Installate e aprite il Consulente Digitale (Windows, Linux o macOS: va bene qualsiasi computer).
2. Impostazioni > «Backup, ripristino e reset» > «Importa un backup» e scegliete questo file .cdbackup
   (oppure trascinate il file sulla finestra del programma).
3. Scegliete «Unisci» (aggiunge ai dati presenti) o «Sostituisci» (rimette tutto come nel backup).
Prima di importare, il programma salva da solo una copia dei dati attuali.
"""


def _leggi(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def _scrivi(path, valore):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(valore, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def crea(cartella, chiavi, versione, con_audio=False):
    """Restituisce (byte dello zip, nome del file)."""
    dati = {}
    for k in chiavi:
        v = _leggi(os.path.join(cartella, k + ".json"))
        if v is not None:
            dati[k] = v
    meta = {"formato": FORMATO, "versione_formato": VERSIONE_FORMATO, "app": "Consulente Digitale", "versione_app": versione,
            "creato": time.strftime("%Y-%m-%dT%H:%M:%S"), "sistema": sys.platform, "autore_programma": "Danilo D'Auria",
            "licenza": "Programma MIT; formato e contenuti CC BY-NC-SA 4.0 - Danilo D'Auria", "con_audio": bool(con_audio), "dati": dati}
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(NOME_JSON, json.dumps(meta, ensure_ascii=False, indent=1))
        z.writestr("LICENZA.txt", LICENZA)
        z.writestr("LEGGIMI.txt", LEGGIMI)
        for nome in ALTRI_FILE:
            p = os.path.join(cartella, nome)
            if os.path.isfile(p):
                z.write(p, nome)
        nt = os.path.join(cartella, "nonni-teach")
        if os.path.isdir(nt):
            for ep in sorted(os.listdir(nt)):
                for fn in sorted(os.listdir(os.path.join(nt, ep))) if os.path.isdir(os.path.join(nt, ep)) else []:
                    rel = "nonni-teach/%s/%s" % (ep, fn)
                    if RE_NONNI.match(rel) and (con_audio or fn in ("episodio.json", "capitoli.txt")):
                        z.write(os.path.join(nt, ep, fn), rel, compress_type=zipfile.ZIP_STORED if fn.endswith((".mp3", ".webm", ".ogg", ".m4a")) else zipfile.ZIP_DEFLATED)
    return buf.getvalue(), "ConsulenteDigitale-backup-%s.cdbackup" % time.strftime("%Y%m%d-%H%M")


def copia_automatica(cartella, chiavi, versione, motivo):
    d = os.path.join(cartella, "backup-automatici")
    os.makedirs(d, exist_ok=True)
    corpo, _ = crea(cartella, chiavi, versione, con_audio=False)
    p = os.path.join(d, "%s-%s.cdbackup" % (motivo, time.strftime("%Y%m%d-%H%M%S")))
    with open(p, "wb") as f:
        f.write(corpo)
    vecchi = sorted(x for x in os.listdir(d) if x.endswith(".cdbackup"))
    for x in vecchi[:-10]:                       # se ne tengono 10
        try:
            os.remove(os.path.join(d, x))
        except OSError:
            pass
    return p


def _unisci(vecchio, nuovo):
    """Unione prudente: dizionari fusi, elenchi uniti senza doppioni (per id/codice/testo)."""
    if isinstance(vecchio, dict) and isinstance(nuovo, dict):
        out = dict(vecchio)
        for k, v in nuovo.items():
            out[k] = _unisci(vecchio.get(k), v) if k in vecchio else v
        return out
    if isinstance(vecchio, list) and isinstance(nuovo, list):
        def chiave(x):
            if isinstance(x, dict):
                return x.get("id") or x.get("codice") or json.dumps(x, sort_keys=True, ensure_ascii=False)[:300]
            return json.dumps(x, ensure_ascii=False)
        visti = set(chiave(x) for x in vecchio)
        return vecchio + [x for x in nuovo if chiave(x) not in visti]
    return nuovo


def importa(cartella, corpo, chiavi, versione, modo="unisci"):
    if not corpo or len(corpo) > MAX_BACKUP:
        raise ValueError("file vuoto o troppo grande")
    if modo not in ("unisci", "sostituisci"):
        raise ValueError("modo non valido")
    file_nonni = {}
    if corpo[:2] == b"PK":
        try:
            z = zipfile.ZipFile(io.BytesIO(corpo))
        except zipfile.BadZipFile:
            raise ValueError("il file non è un backup valido")
        if NOME_JSON not in z.namelist():
            raise ValueError("questo zip non è un backup del Consulente Digitale")
        meta = json.loads(z.read(NOME_JSON).decode("utf-8"))
        for info in z.infolist():
            if RE_NONNI.match(info.filename) and info.file_size < 120 * 1024 * 1024:
                file_nonni[info.filename] = info
            elif info.filename in ALTRI_FILE and info.file_size < 2 * 1024 * 1024:
                file_nonni[info.filename] = info
    else:
        try:
            meta = json.loads(corpo.decode("utf-8-sig"))
        except (UnicodeDecodeError, ValueError):
            raise ValueError("il file non è un backup valido")
        z = None
    if not isinstance(meta, dict) or meta.get("formato") != FORMATO or not isinstance(meta.get("dati"), dict):
        raise ValueError("il file non è un backup del Consulente Digitale")
    automatico = copia_automatica(cartella, chiavi, versione, "prima-di-importare")
    fatti = []
    for k, v in meta["dati"].items():
        if k not in chiavi:
            continue
        p = os.path.join(cartella, k + ".json")
        attuale = _leggi(p)
        _scrivi(p, _unisci(attuale, v) if (modo == "unisci" and attuale is not None) else v)
        fatti.append(k)
    audio = 0
    if z is not None:
        for nome, info in file_nonni.items():
            dest = os.path.normpath(os.path.join(cartella, *nome.split("/")))
            if not dest.startswith(os.path.normpath(cartella) + os.sep):
                continue
            if modo == "unisci" and os.path.exists(dest) and nome.endswith("episodio.json"):
                continue
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with z.open(info) as src, open(dest + ".tmp", "wb") as out:
                shutil.copyfileobj(src, out)
            os.replace(dest + ".tmp", dest)
            audio += 1
    return {"ok": True, "chiavi": fatti, "file": audio, "copia_di_sicurezza": automatico, "creato": meta.get("creato"), "versione_app": meta.get("versione_app")}


# cosa si può azzerare (il frontend azzera anche i campi e la memoria del browser)
VOCI_RESET = ("nomi", "conversazione", "ultimo", "interventi", "notizie", "acquisti", "diario", "hardware", "nonni", "impostazioni", "profilo", "tutto")


def reset(cartella, cosa, chiavi, versione, con_interviste=False):
    cosa = [c for c in (cosa or []) if c in VOCI_RESET]
    if not cosa:
        raise ValueError("niente da azzerare")
    copia = copia_automatica(cartella, chiavi, versione, "prima-del-reset")
    tutto = "tutto" in cosa

    def via(k):
        try:
            os.remove(os.path.join(cartella, k + ".json"))
        except OSError:
            pass
    if tutto:
        for k in chiavi:
            via(k)
        for extra in ("notizie-cache.json",) + ALTRI_FILE:
            try:
                os.remove(os.path.join(cartella, extra))
            except OSError:
                pass
    else:
        if "nomi" in cosa:
            for k, campi in (("profilo", ("nome",)), ("impostazioni", ("nomeUtente",)), ("circolare", ("nome",)), ("nonni", ("autore",))):
                v = _leggi(os.path.join(cartella, k + ".json"))
                if isinstance(v, dict):
                    for c in campi:
                        v[c] = ""
                    _scrivi(os.path.join(cartella, k + ".json"), v)
            v = _leggi(os.path.join(cartella, "interventi.json"))
            if isinstance(v, dict):
                for s in v.get("schede") or []:
                    s["cliente"] = ""
                    s["tecnico"] = ""
                _scrivi(os.path.join(cartella, "interventi.json"), v)
        if "conversazione" in cosa:
            _scrivi(os.path.join(cartella, "cronologia.json"), [])
        if "ultimo" in cosa:
            v = _leggi(os.path.join(cartella, "cronologia.json"))
            if isinstance(v, list) and v:
                while v and v[-1].get("chi") != "utente":     # risposta di Neura + ultima domanda
                    v.pop()
                if v:
                    v.pop()
                _scrivi(os.path.join(cartella, "cronologia.json"), v)
        for k in ("interventi", "notizie", "acquisti", "diario", "hardware", "nonni", "impostazioni", "profilo"):
            if k in cosa:
                via(k)
    interviste = 0
    if con_interviste and (tutto or "nonni" in cosa):
        nt = os.path.join(cartella, "nonni-teach")
        if os.path.isdir(nt):
            interviste = len(os.listdir(nt))
            shutil.rmtree(nt, ignore_errors=True)
        shutil.rmtree(os.path.join(cartella, "nonni-teach-sito"), ignore_errors=True)
    return {"ok": True, "azzerato": cosa, "interviste_tolte": interviste, "copia_di_sicurezza": copia}
