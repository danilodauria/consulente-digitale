#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Consulente Digitale - NOTIZIE dal mondo dell'informatica, dell'elettronica e della sicurezza.

Legge i feed RSS/Atom pubblici di testate italiane (elenco chiuso FONTI, verificate a ottobre 2026), tiene
solo titolo, data, breve sommario fornito dal feed e link all'articolo originale (niente copie degli articoli:
il diritto d'autore resta delle testate), assegna i temi con parole chiave e mette tutto in cache per 30 minuti.
Il programma si collega solo se l'utente ha lasciato attive le notizie e l'uso di Internet.

Uso anche da riga di comando (lo usa il sito su GitHub Pages per i telefoni):
    python3 cd_notizie.py --json percorso/notizie.json

Ideato e sviluppato da Danilo D'Auria - Codice MIT, testi CC BY-NC-SA 4.0
"""
import hashlib
import html
import json
import os
import re
import ssl
import sys
import threading
import time
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

FONTI = [
    {"id": "ansa", "nome": "ANSA Tecnologia", "url": "https://www.ansa.it/canale_tecnologia/notizie/tecnologia_rss.xml", "sito": "https://www.ansa.it", "tema": "generale"},
    {"id": "hdblog", "nome": "HDblog", "url": "https://www.hdblog.it/feed/", "sito": "https://www.hdblog.it", "tema": "dispositivi"},
    {"id": "puntoinformatico", "nome": "Punto Informatico", "url": "https://www.punto-informatico.it/feed/", "sito": "https://www.punto-informatico.it", "tema": "informatica"},
    {"id": "tomshw", "nome": "Tom's Hardware", "url": "https://www.tomshw.it/feed/", "sito": "https://www.tomshw.it", "tema": "hardware"},
    {"id": "hwupgrade", "nome": "Hardware Upgrade", "url": "http://feeds.hwupgrade.it/rss_news.xml", "sito": "https://www.hwupgrade.it", "tema": "hardware"},
    {"id": "ilsoftware", "nome": "IlSoftware.it", "url": "https://www.ilsoftware.it/feed/", "sito": "https://www.ilsoftware.it", "tema": "software"},
    {"id": "htmlit", "nome": "HTML.it", "url": "https://www.html.it/feed/", "sito": "https://www.html.it", "tema": "software"},
    {"id": "elettronicanews", "nome": "Elettronica News", "url": "https://www.elettronicanews.it/feed/", "sito": "https://www.elettronicanews.it", "tema": "elettronica"},
    {"id": "redhotcyber", "nome": "Red Hot Cyber", "url": "https://www.redhotcyber.com/feed/gn", "sito": "https://www.redhotcyber.com", "tema": "sicurezza"},
]

# temi: parole chiave (minuscole, senza accenti) -> tema. Una notizia può avere più temi.
TEMI = {
    "sicurezza": r"truff|phishing|virus|malware|ransomware|hacker|attacc|password|vulnerabilit|falla|zero.?day|furto di dati|data breach|sicurezza|spam|frode|cyber|patch|polizia postale|spid|otp",
    "ia": r"intelligenza artificiale|\bia\b|\bai\b|chatgpt|openai|gemini|claude|anthropic|copilot|llm|modello linguistic|deepfake|robot",
    "telefoni": r"smartphone|iphone|android|samsung|galaxy|xiaomi|pixel|telefon|cellular|tablet|ipad|smartwatch|whatsapp|\bapp\b",
    "computer": r"\bpc\b|computer|windows|linux|macos|\bmac\b|notebook|portatil|processor|\bcpu\b|\bgpu\b|intel|amd|nvidia|ryzen|ssd|\bram\b|scheda video|monitor|stampant|software|aggiornament|browser|chrome|firefox",
    "elettronica": r"elettronic|chip|semicondutt|pcb|sensor|microcontroll|arduino|raspberry|circuit|componenti|transistor|batteri|led\b",
    "sostenibilita": r"ricicl|raee|riparabil|riparazion|riuso|ricondizion|ambient|sostenibil|energia|consumi|economia circolare|e-waste|rifiuti",
    "internet": r"internet|fibra|5g|wi-?fi|connession|social|facebook|instagram|tiktok|youtube|streaming|telegram|privacy|gdpr|cookie|\bue\b|commissione europea|agcom|garante",
    "giochi": r"videogioc|gaming|console|playstation|xbox|nintendo|steam|\bgta\b",
    "offerte": r"offert|sconto|scontat|in promozione|prezzo minimo|coupon|black friday|prime day|amazon a \d|€ invece|codice sconto|\d+[,.]?\d*\s?€",
}
RE_TEMI = {k: re.compile(v, re.I) for k, v in TEMI.items()}
CACHE = {"quando": 0, "dati": None}
LOCK = threading.Lock()
DURATA_CACHE = 30 * 60
UA = "ConsulenteDigitale/1.2 (+https://danilodauria.github.io/consulente-digitale/; lettore di notizie)"


def _norm(s):
    s = s.lower()
    for a, b in (("à", "a"), ("è", "e"), ("é", "e"), ("ì", "i"), ("ò", "o"), ("ù", "u")):
        s = s.replace(a, b)
    return s


def _testo(x, n=420):
    """Toglie l'HTML, decodifica le entità, accorcia a n caratteri senza spezzare le parole."""
    t = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", x or "", flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(html.unescape(t))
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"(L'articolo|The post|Leggi (?:tutto|l'articolo)|Continua a leggere).*$", "", t).strip()
    if len(t) > n:
        t = t[:n].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return t


def _decodifica(dati):
    """I feed dichiarano UTF-8 ma qualcuno manda Windows-1252: si prova prima UTF-8 rigoroso."""
    for cod in ("utf-8", "cp1252", "latin-1"):
        try:
            return dati.decode(cod)
        except UnicodeDecodeError:
            continue
    return dati.decode("utf-8", "replace")


def _data(s):
    s = (s or "").strip()
    if not s:
        return 0
    try:
        return parsedate_to_datetime(s).timestamp()
    except (TypeError, ValueError, IndexError):
        pass
    m = re.match(r"(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d+)?(Z|[+-]\d\d:?\d\d)?", s)
    if m:
        import calendar
        t = calendar.timegm(tuple(int(m.group(i)) for i in range(1, 7)) + (0, 0, 0))
        tz = m.group(7) or "Z"
        if tz != "Z":
            seg = 1 if tz[0] == "+" else -1
            hh, mm = int(tz[1:3]), int(tz[-2:])
            t -= seg * (hh * 3600 + mm * 60)
        return t
    return 0


def _link_ok(u):
    return isinstance(u, str) and re.match(r"^https?://[^\s<>\"']+$", u.strip() or "") is not None


def analizza(testo_xml, fonte):
    """Restituisce le notizie di un feed RSS 2.0 o Atom."""
    t = re.sub(r"^\s*<\?xml[^>]*\?>", "", testo_xml.lstrip("﻿"))
    t = re.sub(r"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)", "&amp;", t)   # & sciolti, frequenti nei feed
    radice = ET.fromstring(t)
    out = []

    def tag(e):
        return e.tag.rsplit("}", 1)[-1].lower()

    def figli(e, nome):
        return [c for c in e if tag(c) == nome]

    def primo(e, *nomi):
        for c in e:
            if tag(c) in nomi and (c.text or len(c)):
                return c
        return None
    elementi = [e for e in radice.iter() if tag(e) in ("item", "entry")]
    for it in elementi[:40]:
        tit = primo(it, "title")
        titolo = _testo(tit.text if tit is not None else "", 220)
        link = ""
        for l in figli(it, "link"):
            href = l.get("href") or (l.text or "").strip()
            if href and (l.get("rel") in (None, "alternate")):
                link = href.strip()
                break
        if not link:
            g = primo(it, "guid", "id")
            if g is not None and _link_ok(g.text or ""):
                link = g.text.strip()
        desc = primo(it, "description", "summary", "content", "encoded")
        data = primo(it, "pubdate", "published", "updated", "date")
        img = ""
        for c in it.iter():
            n = tag(c)
            if n in ("enclosure", "content", "thumbnail") and (c.get("type", "image").startswith("image") or n == "thumbnail"):
                u = c.get("url") or ""
                if u.startswith("https://"):
                    img = u
                    break
            if n == "thumb" and (c.text or "").startswith("https://"):
                img = c.text.strip()
                break
        if not titolo or not _link_ok(link):
            continue
        sommario = _testo("".join(desc.itertext()) if desc is not None and len(desc) else (desc.text if desc is not None else ""))
        out.append({"titolo": titolo, "link": link, "sommario": sommario, "quando": _data(data.text if data is not None else ""),
                    "fonte": fonte["nome"], "fonte_id": fonte["id"], "immagine": img})
    return out


def temi_di(n):
    t = _norm(n["titolo"] + " " + n["sommario"])
    temi = [k for k, r in RE_TEMI.items() if r.search(t)]
    return temi or ["generale"]


def _scarica(url, timeout=10):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5"})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return r.read(3 * 1024 * 1024)


def raccogli(fonti=None):
    fonti = fonti or FONTI
    tutte, esiti, threads = [], {}, []

    def una(f):
        try:
            lista = analizza(_decodifica(_scarica(f["url"])), f)
            esiti[f["id"]] = {"ok": True, "n": len(lista)}
            tutte.extend(lista)
        except Exception as e:      # noqa: BLE001 - una fonte che non risponde non ferma le altre
            esiti[f["id"]] = {"ok": False, "errore": str(e)[:160]}
    for f in fonti:
        th = threading.Thread(target=una, args=(f,), daemon=True)
        th.start()
        threads.append(th)
    for th in threads:
        th.join(15)
    visti, uniche = set(), []
    for n in sorted(tutte, key=lambda x: x["quando"], reverse=True):
        chiave = re.sub(r"\W+", "", _norm(n["titolo"]))[:80]
        if chiave in visti:
            continue
        visti.add(chiave)
        n["temi"] = temi_di(n)
        n["id"] = "%s-%s" % (n["fonte_id"], hashlib.sha1(n["link"].encode("utf-8")).hexdigest()[:10])
        uniche.append(n)
    return {"notizie": uniche[:240], "fonti": [{"id": f["id"], "nome": f["nome"], "sito": f["sito"], "tema": f["tema"], "esito": esiti.get(f["id"], {})} for f in FONTI],
            "temi": list(TEMI.keys()), "quando": time.time(),
            "nota": "Titoli e brevi sommari dai feed pubblici delle testate, con il link all'articolo originale. I diritti degli articoli sono delle rispettive testate."}


def _prova():
    """Notizie DI PROVA (inventate, fonte «Esempio») per collaudo e foto del vademecum."""
    ora = time.time()
    esempi = [("Nuova truffa con finti SMS del corriere: come riconoscerla", "Messaggi che chiedono di pagare piccole somme per una consegna: non cliccate sul link e cancellate l'SMS."),
              ("Windows: in arrivo gli aggiornamenti di sicurezza del mese", "Il consiglio è installarli appena possibile: correggono diverse falle già sfruttate."),
              ("Scuole: un laboratorio di elettronica con Raspberry Pi e sensori", "Gli studenti costruiscono una stazione meteo e pubblicano i dati in rete."),
              ("Smartphone ricondizionati: cosa controllare prima di comprarli", "Batteria, garanzia, aggiornamenti: una guida per scegliere bene e spendere meno."),
              ("Intelligenza artificiale sul computer di casa: i modelli più leggeri", "Funzionano anche senza Internet e rispettano la privacy di chi li usa."),
              ("RAEE: crescono i punti di raccolta nei negozi di elettronica", "I piccoli apparecchi si possono lasciare gratis anche senza comprare nulla."),
              ("Linux compie un altro anno: le distribuzioni per i PC datati", "Sistemi leggeri che ridanno vita a computer di dieci anni fa.")]
    out = []
    for i, (t, s) in enumerate(esempi):
        n = {"titolo": t, "sommario": s, "link": "https://example.org/notizia-%d" % (i + 1), "quando": ora - i * 5400,
             "fonte": "Esempio (notizia di prova)", "fonte_id": "prova", "immagine": "", "id": "prova-%d" % i}
        n["temi"] = temi_di(n)
        out.append(n)
    return {"notizie": out, "fonti": [{"id": "prova", "nome": "Esempio (prova)", "sito": "https://example.org", "tema": "generale", "esito": {"ok": True, "n": len(out)}}],
            "temi": list(TEMI.keys()), "quando": ora, "prova": True, "nota": "Notizie di prova inventate."}


def notizie(nuovo=False, cartella=None):
    if os.environ.get("CD_NOTIZIE_PROVA") == "1":
        return _prova()
    with LOCK:
        if not nuovo and CACHE["dati"] and time.time() - CACHE["quando"] < DURATA_CACHE:
            return CACHE["dati"]
    dati = raccogli()
    if not dati["notizie"] and cartella:          # nessuna rete: ultima copia salvata
        try:
            with open(os.path.join(cartella, "notizie-cache.json"), encoding="utf-8") as f:
                vecchi = json.load(f)
            vecchi["dalla_cache"] = True
            return vecchi
        except (OSError, ValueError):
            return dati
    with LOCK:
        CACHE.update(quando=time.time(), dati=dati)
    if cartella and dati["notizie"]:
        try:
            tmp = os.path.join(cartella, "notizie-cache.json.tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(dati, f, ensure_ascii=False)
            os.replace(tmp, os.path.join(cartella, "notizie-cache.json"))
        except OSError:
            pass
    return dati


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--json":
        d = raccogli()
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False)
        print("%d notizie da %d fonti" % (len(d["notizie"]), sum(1 for x in d["fonti"] if x["esito"].get("ok"))))
    else:
        print(__doc__)
