#!/bin/bash
# Driver, periferiche e firmware: cosa manca o si può migliorare. Non modifica nulla.
passo 1 3 "Periferiche senza driver"
n=0
if c_e lspci; then
    lspci -k 2>/dev/null | awk '
      /^[0-9a-f]/ { if (dev != "" && !drv) print dev; dev=$0; drv=0; next }
      /Kernel driver in use/ { drv=1 }
      END { if (dev != "" && !drv) print dev }' | while IFS= read -r d; do
        case "$d" in *"Host bridge"*|*"ISA bridge"*|*"SMBus"*|*"Signal processing"*|*"PCI bridge"*) continue ;; esac
        voce periferica "${d#* }" "senza driver" "" "" "Potrebbe servire un driver o un firmware aggiuntivo"
    done
fi
gpu="$(lspci 2>/dev/null | grep -Ei 'vga|3d controller' )"
if echo "$gpu" | grep -qi nvidia; then
    drv="$(lspci -k 2>/dev/null | grep -A3 -i nvidia | grep 'in use' | head -n1 | awk -F': ' '{print $2}')"
    if [ "$drv" = "nouveau" ] || [ -z "$drv" ]; then
        voce driver "Scheda video NVIDIA" "${drv:-nessuno}" "driver NVIDIA ufficiale" "nvidia" "Più prestazioni e meno consumi: installa il driver consigliato"
        n=$((n+1))
    else
        ok "NVIDIA con driver: $drv"
    fi
fi
passo 2 3 "Driver aggiuntivi consigliati dalla distribuzione"
if c_e ubuntu-drivers; then
    while IFS= read -r p; do
        [ -n "$p" ] && voce driver "$p" "" "consigliato" "$p" "ubuntu-drivers" && n=$((n+1))
    done < <(ubuntu-drivers list 2>/dev/null | cut -d, -f1)
elif c_e nvidia-detect; then
    nvidia-detect 2>/dev/null | tail -n 3
fi
if c_e journalctl; then
    journalctl -k -b --no-pager 2>/dev/null | grep -i "firmware" | grep -iE "failed|missing|error" | head -n 8 | while IFS= read -r r; do
        voce firmware "Firmware mancante" "" "" "" "$(echo "$r" | cut -c1-160)"
    done
fi
passo 3 3 "Dispositivi gestiti da fwupd"
if c_e fwupdmgr; then
    fwupdmgr get-devices --json 2>/dev/null | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit(0)
for dev in d.get("Devices",[]):
    if dev.get("Version"): print("@@VOCE|firmware|%s|%s|||%s" % (dev.get("Name",""), dev.get("Version",""), dev.get("Vendor","")))'
else
    nota "Per controllare il firmware installa «fwupd»."
fi
info consigli "$n"
