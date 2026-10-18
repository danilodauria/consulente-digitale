#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Consulente Digitale - traduzione dei contenuti con l'IA LOCALE (Ollama), per le lingue diverse dall'italiano.

L'interfaccia si traduce con i dizionari scritti a mano (web/i18n/*.json). Quello che i dizionari non
conoscono (schede lunghe, risposte pronte di Neura) si può tradurre con il modello di IA installato sul
computer: nessun testo esce dal PC. Le traduzioni restano in <dati>/traduzioni/<lingua>.json.

Ideato e sviluppato da Danilo D'Auria - Codice MIT, traduzioni CC BY-NC-SA 4.0
"""
import json
import os
import re
import threading
import urllib.request

LINGUE = {"en": "English", "fr": "French (Français)", "es": "Spanish (Español)", "de": "German (Deutsch)", "ro": "Romanian (Română)"}
LOCK = threading.Lock()
MAX_CACHE = 20000


def _file(cartella, lingua):
    d = os.path.join(cartella, "traduzioni")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, lingua + ".json")


def cache(cartella, lingua):
    if lingua not in LINGUE:
        raise ValueError("lingua non supportata")
    try:
        with open(_file(cartella, lingua), encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def _salva(cartella, lingua, c):
    if len(c) > MAX_CACHE:
        c = dict(list(c.items())[-MAX_CACHE:])
    p = _file(cartella, lingua)
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(c, f, ensure_ascii=False)
    os.replace(p + ".tmp", p)


def traduci(cartella, lingua, testi, ollama, modello):
    """Traduce un elenco di testi italiani; restituisce l'elenco tradotto (stesso ordine, None se non riuscito)."""
    if lingua not in LINGUE:
        raise ValueError("lingua non supportata")
    testi = [str(t)[:4000] for t in (testi or [])[:40] if isinstance(t, str)]
    if not testi:
        return []
    with LOCK:
        c = cache(cartella, lingua)
    da_fare = [t for t in testi if t not in c]
    if da_fare:
        if not modello:
            raise RuntimeError("nessun modello di IA locale")
        istruzioni = ("You translate the user interface and texts of an Italian computer-help program called «Consulente Digitale» "
                      "(by Danilo D'Auria) from Italian into %s. Keep the same meaning, tone (polite, simple, for elderly people), "
                      "emoji, symbols, numbers, «#» signs, Markdown (**bold**, lists) and leading/trailing punctuation. Do not translate "
                      "brand or program names (Windows, Linux, Neura, Nonni Teach, FeniceOS...). Answer ONLY with JSON: "
                      "{\"t\": [translations in the same order]}.") % LINGUE[lingua]
        corpo = {"model": modello, "stream": False, "format": "json", "keep_alive": "20m", "options": {"temperature": 0.1, "num_ctx": 8192},
                 "messages": [{"role": "system", "content": istruzioni}, {"role": "user", "content": json.dumps({"testi": da_fare}, ensure_ascii=False)}]}
        req = urllib.request.Request(ollama + "/api/chat", data=json.dumps(corpo).encode("utf-8"), headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                risposta = json.loads(r.read().decode("utf-8"))
        except ValueError:          # risposta non in JSON: niente traduzione, il testo resta in italiano
            risposta = {}
        testo = (((risposta.get("message") or {}) if isinstance(risposta, dict) else {}).get("content") or "").strip()
        testo = re.sub(r"<think>[\s\S]*?</think>", "", testo).strip()
        try:
            out = json.loads(testo)
            lista = out.get("t") if isinstance(out, dict) else out
        except ValueError:
            lista = None
        if isinstance(lista, list) and len(lista) == len(da_fare):
            with LOCK:
                c = cache(cartella, lingua)
                for it, tr in zip(da_fare, lista):
                    if isinstance(tr, str) and tr.strip():
                        c[it] = tr.strip()
                _salva(cartella, lingua, c)
    return [c.get(t) for t in testi]
