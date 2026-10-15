#!/bin/bash
# Installa i driver consigliati dalla distribuzione e aggiorna il firmware (fonti ufficiali).
passo 1 3 "Driver consigliati"
if c_e ubuntu-drivers; then
    ubuntu-drivers install && ok "Driver consigliati installati."
elif [ "$GESTORE" = "apt" ] && grep -qi '^ID=debian' /etc/os-release; then
    apt-get update
    installa_pacchetto firmware-linux firmware-misc-nonfree 2>/dev/null && ok "Firmware aggiuntivo di Debian installato." || nota "Firmware non libero non disponibile nei repository attivi."
    if lspci 2>/dev/null | grep -Ei 'vga|3d' | grep -qi nvidia; then
        installa_pacchetto nvidia-detect >/dev/null 2>&1 && nvidia-detect
        nota "Per NVIDIA su Debian: segui il pacchetto indicato sopra (es. nvidia-driver)."
    fi
elif [ "$GESTORE" = "dnf" ]; then
    nota "Su Fedora i driver NVIDIA arrivano da RPM Fusion (Software → Repository di terze parti)."
else
    nota "Nessuno strumento automatico per i driver su questa distribuzione."
fi
passo 2 3 "Firmware (fwupd / LVFS)"
if ! c_e fwupdmgr; then installa_pacchetto fwupd >/dev/null 2>&1; fi
if c_e fwupdmgr; then
    fwupdmgr refresh --force >/dev/null 2>&1
    fwupdmgr update --assume-yes --no-reboot-check 2>/dev/null || fwupdmgr update -y 2>/dev/null || nota "Nessun aggiornamento del firmware."
fi
passo 3 3 "Microcodice del processore"
if grep -qi intel /proc/cpuinfo; then pkg=intel-microcode; else pkg=amd64-microcode; fi
[ "$GESTORE" = "apt" ] && installa_pacchetto "$pkg" >/dev/null 2>&1 && ok "Microcodice aggiornato ($pkg)."
if riavvio_necessario; then info riavvio si; fi
info riavvio si
