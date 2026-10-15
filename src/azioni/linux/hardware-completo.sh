#!/bin/bash
# Lettura completa della scheda madre: banchi di memoria, slot di espansione e porte (dmidecode, solo lettura).
passo 1 2 "Lettura delle tabelle SMBIOS della scheda madre"
c_e dmidecode || installa_pacchetto dmidecode >/dev/null 2>&1
if ! c_e dmidecode; then attenzione "dmidecode non disponibile."; exit 1; fi
out="$CD_DATI/hardware-completo.json"
passo 2 2 "Banchi di memoria, slot e porte"
python3 - "$out" <<'PY'
import json, subprocess, sys
def blocchi(t):
    o = subprocess.run(["dmidecode", "-t", t], capture_output=True, text=True).stdout
    for b in o.split("\n\n"):
        d = {}
        for r in b.splitlines():
            if ":" in r and r.startswith("\t") and not r.startswith("\t\t"):
                k, v = r.strip().split(":", 1); d[k.strip()] = v.strip()
        if d: yield d
moduli, slot, porte, n = [], [], [], 0
for d in blocchi("16"):
    n += int(d.get("Number Of Devices", "0") or 0)
for d in blocchi("17"):
    vuoto = d.get("Size", "").startswith("No Module")
    gb = 0
    if not vuoto:
        p = d.get("Size", "0 MB").split()
        gb = int(p[0]) // (1024 if p[1:] == ["MB"] else 1) if p and p[0].isdigit() else 0
    moduli.append({"posizione": d.get("Locator", ""), "banco": d.get("Bank Locator", ""), "gb": gb, "tipo": d.get("Type", ""), "vuoto": vuoto,
                   "mhz": int((d.get("Configured Memory Speed") or d.get("Speed") or "0").split()[0] or 0) if (d.get("Configured Memory Speed") or d.get("Speed") or "0").split()[0].isdigit() else 0,
                   "produttore": d.get("Manufacturer", ""), "codice": d.get("Part Number", ""), "formato": d.get("Form Factor", "")})
    print("@@VOCE|memoria|%s|%s|%s|%s|%s" % (d.get("Locator", ""), "vuoto" if vuoto else d.get("Size", ""), d.get("Type", ""), d.get("Speed", ""), d.get("Part Number", "")))
for d in blocchi("9"):
    slot.append({"nome": d.get("Designation", ""), "tipo": d.get("Type", ""), "uso": 4 if d.get("Current Usage") == "In Use" else 3})
    print("@@VOCE|slot|%s|%s|%s||" % (d.get("Designation", ""), d.get("Type", ""), d.get("Current Usage", "")))
for d in blocchi("8"):
    porte.append({"interna": d.get("Internal Reference Designator", ""), "esterna": d.get("External Reference Designator", ""), "descrizione": d.get("Port Type", "")})
    print("@@VOCE|porta|%s|%s|%s||" % (d.get("External Reference Designator") or d.get("Internal Reference Designator", ""), d.get("Port Type", ""), d.get("External Connector Type") or d.get("Internal Connector Type", "")))
json.dump({"moduli": moduli, "slot": slot, "porte": porte, "slot_memoria": n}, open(sys.argv[1], "w"), ensure_ascii=False, indent=1)
PY
chmod 644 "$out" 2>/dev/null
[ -n "$CD_UTENTE" ] && chown "$CD_UTENTE" "$out" 2>/dev/null
ok "Dati salvati: la pagina Hardware ora mostra banchi, slot e porte."
