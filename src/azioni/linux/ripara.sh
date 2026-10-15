#!/bin/bash
# Ripara il sistema dei pacchetti e controlla i file di sistema.
passo 1 3 "Sistema dei pacchetti"
case "$GESTORE" in
    apt)
        dpkg --configure -a
        apt-get -f install -y
        apt-get update --fix-missing
        if c_e debsums; then nota "File di sistema modificati o danneggiati:"; debsums -s 2>&1 | head -n 20; fi
        ;;
    dnf) dnf -y distro-sync; rpm -Va --nomtime --nosize --nouser --nogroup --nomode 2>/dev/null | grep -v '^.......T' | head -n 20 ;;
    zypper) zypper -n verify ;;
    pacman) pacman -Dk; pacman -Qkk 2>/dev/null | grep -v ' 0 altered' | head -n 20 ;;
esac
passo 2 3 "Programmi Flatpak"
c_e flatpak && flatpak repair --system 2>/dev/null | tail -n 3
passo 3 3 "Errori gravi dall'ultimo avvio"
c_e journalctl && journalctl -p 3 -b --no-pager 2>/dev/null | tail -n 15
info riavvio consigliato
ok "Controllo terminato."
