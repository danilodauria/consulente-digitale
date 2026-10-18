#!/usr/bin/env python3
"""Consulente Digitale — costruisce i dizionari dell'interfaccia src/web/i18n/<lingua>.json
dai lotti tradotti a mano tools/i18n/t*.tsv (riga: indice<TAB>en<TAB>fr<TAB>es<TAB>de<TAB>ro; «=» = uguale all'italiano).
Le chiavi sono le stringhe italiane normalizzate di lista2.json (numeri → #, giorni → @g, mesi → @m).

© Danilo D'Auria — codice MIT; i dizionari prodotti sono contenuti CC BY-NC-SA 4.0.
Uso: python3 tools/i18n/costruisci.py
"""
import glob
import json
import os
import re
import sys

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(os.path.dirname(QUI))
LINGUE = ["en", "fr", "es", "de", "ro"]
NOMI = {"en": "English", "fr": "Français", "es": "Español", "de": "Deutsch", "ro": "Română"}


GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"]
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
RE_NUM = re.compile(r"\d+(?:[.,]\d+)?")
RE_GM = re.compile(r"\b(" + "|".join(GIORNI + MESI) + r")(?![A-Za-zÀ-ÿ])", re.I)


def chiave(t):
    """Come chiave() in src/web/js/i18n.js: numeri → #, giorni → @g, mesi → @m."""
    t = RE_NUM.sub("#", " ".join(t.split()))
    return RE_GM.sub(lambda m: "@g" if m.group(1).lower() in GIORNI else "@m", t)


def segnaposti(s):
    return (s.count("#"), s.count("@g"), s.count("@m"))


def main():
    lista = json.load(open(os.path.join(QUI, "lista2.json"), encoding="utf-8"))
    diz = {l: {} for l in LINGUE}
    visti = set()
    problemi = 0
    for f in sorted(glob.glob(os.path.join(QUI, "t*.tsv"))):
        for n, riga in enumerate(open(f, encoding="utf-8"), 1):
            riga = riga.rstrip("\n")
            if not riga.strip():
                continue
            parti = riga.split("\t")
            if len(parti) != 6:
                print("%s:%d colonne %d (servono 6)" % (os.path.basename(f), n, len(parti)))
                problemi += 1
                continue
            i = int(parti[0])
            it = lista[i]
            visti.add(i)
            for l, tr in zip(LINGUE, parti[1:]):
                tr = tr.strip()
                if tr == "=":
                    tr = it   # uguale all'italiano: si tiene, così non viene chiesto all'IA
                if segnaposti(tr) != segnaposti(it):
                    print("%s:%d [%s] segnaposti diversi: %r → %r" % (os.path.basename(f), n, l, it, tr))
                    problemi += 1
                diz[l][it] = tr
    # stringhe in più (avvisi, quiz, curiosità, testi dinamici): italiano<TAB>en<TAB>fr<TAB>es<TAB>de<TAB>ro
    extra = os.path.join(QUI, "extra.tsv")
    if os.path.exists(extra):
        for n, riga in enumerate(open(extra, encoding="utf-8"), 1):
            parti = riga.rstrip("\n").split("\t")
            if len(parti) != 6:
                if riga.strip():
                    print("extra.tsv:%d colonne %d (servono 6)" % (n, len(parti)))
                    problemi += 1
                continue
            it = chiave(parti[0])
            for l, tr in zip(LINGUE, parti[1:]):
                tr = it if tr.strip() == "=" else chiave(tr.strip())
                if segnaposti(tr) != segnaposti(it):
                    print("extra.tsv:%d [%s] segnaposti diversi: %r → %r" % (n, l, it, tr))
                    problemi += 1
                diz[l][it] = tr
    mancano = [i for i in range(len(lista)) if i not in visti]
    if mancano:
        print("Stringhe senza traduzione:", mancano[:20], "…" if len(mancano) > 20 else "")
    cartella = os.path.join(RADICE, "src", "web", "i18n")
    os.makedirs(cartella, exist_ok=True)
    for l in LINGUE:
        uscita = {
            "meta": {
                "lingua": l, "nome": NOMI[l],
                "progetto": "Consulente Digitale",
                "autore": "Danilo D'Auria",
                "licenza": "CC BY-NC-SA 4.0 — https://creativecommons.org/licenses/by-nc-sa/4.0/",
                "nota": "Traduzione dell'interfaccia dall'italiano. Chiavi: testo italiano normalizzato (# numeri, @g giorni, @m mesi).",
            },
            "t": dict(sorted(diz[l].items())),
        }
        with open(os.path.join(cartella, l + ".json"), "w", encoding="utf-8") as fh:
            json.dump(uscita, fh, ensure_ascii=False, indent=0)
            fh.write("\n")
        print("%s: %d voci" % (l, len(diz[l])))
    return 1 if problemi else 0


if __name__ == "__main__":
    sys.exit(main())
