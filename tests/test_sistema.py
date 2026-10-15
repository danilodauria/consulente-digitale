#!/usr/bin/env python3
"""Prova la stima della generazione dei processori (base della compatibilità con Windows 11).
Uso: python3 tests/test_sistema.py  — Ideato e sviluppato da Danilo D'Auria - Codice MIT"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "server"))
import cd_sistema  # noqa: E402

CASI = [("Intel(R) Core(TM) i5-1035G1 CPU @ 1.00GHz", "intel", 10), ("11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz", "intel", 11),
        ("12th Gen Intel(R) Core(TM) i5-1235U", "intel", 12), ("13th Gen Intel(R) Core(TM) i7-1355U", "intel", 13),
        ("14th Gen Intel(R) Core(TM) i7-14700HX", "intel", 14), ("Intel(R) Core(TM) i7-10510U CPU", "intel", 10),
        ("Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz", "intel", 8), ("Intel(R) Core(TM) i5-7200U", "intel", 7),
        ("Intel(R) Core(TM) i3-2100 CPU", "intel", 2), ("Intel(R) Pentium(R) Gold 7505 @ 2.00GHz", "intel", 11),
        ("Intel(R) Core(TM) Ultra 7 155H", "intel", 15), ("AMD Ryzen 5 7530U with Radeon Graphics", "amd", 7),
        ("AMD Ryzen 7 5825U", "amd", 5), ("Apple M2 Pro", "apple", 2)]
errori = 0
for nome, marca, gen in CASI:
    s = cd_sistema.generazione_cpu(nome)
    giusto = s["marca"] == marca and s["generazione"] == gen
    errori += not giusto
    print(("  ✔ " if giusto else "  ✖ ") + "%s → %s %s" % (nome, s["marca"], s["generazione"]))
print("\n%d errori" % errori)
sys.exit(1 if errori else 0)
