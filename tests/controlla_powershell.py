#!/usr/bin/env python3
"""Controllo della sintassi degli script PowerShell con tree-sitter (non serve Windows).
Uso: python3 tests/controlla_powershell.py [file.ps1 ...]   (senza argomenti: tutti gli script di src/azioni/windows
e quelli di packaging/windows). Esce con 1 se trova errori di sintassi."""
import glob
import os
import sys

from tree_sitter_language_pack import get_parser

QUI = os.path.dirname(os.path.abspath(__file__))
RADICE = os.path.dirname(QUI)


def errori(path):
    with open(path, "rb") as f:
        dati = f.read()
    if dati.startswith(b"\xef\xbb\xbf"):
        dati = dati[3:]
    albero = get_parser("powershell").parse(dati)
    trovati = []

    def visita(n):
        if n.type == "ERROR" or n.is_missing:
            riga = n.start_point[0] + 1
            testo = dati.splitlines()[riga - 1].decode("utf-8", "replace").strip() if riga - 1 < len(dati.splitlines()) else ""
            trovati.append("%s:%d: %s %s" % (os.path.relpath(path, RADICE), riga, "MANCA" if n.is_missing else "ERRORE", testo[:120]))
            return
        for c in n.children:
            visita(c)
    visita(albero.root_node)
    return trovati


def main(argv):
    files = argv or sorted(glob.glob(os.path.join(RADICE, "src", "azioni", "windows", "*.ps1")) +
                           glob.glob(os.path.join(RADICE, "packaging", "windows", "*.ps1")))
    tutti = []
    for f in files:
        tutti += errori(f)
    for e in tutti:
        print(e)
    print("PowerShell: %d file, %d errori" % (len(files), len(tutti)))
    return 1 if tutti else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
