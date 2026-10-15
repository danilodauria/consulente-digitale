#!/bin/bash
# Pulizia sicura: cache dei pacchetti, pacchetti orfani, registri vecchi, miniature. Non tocca documenti e foto.
prima=$(libero_mb)
passo 1 4 "Pacchetti non più necessari"
case "$GESTORE" in
    apt) apt-get -y autoremove --purge; apt-get -y autoclean; apt-get clean ;;
    dnf) dnf -y autoremove; dnf clean packages ;;
    zypper) zypper -n clean ;;
    pacman) c_e paccache && paccache -rk2; pacman -Qtdq 2>/dev/null | pacman -Rns --noconfirm - 2>/dev/null ;;
esac
passo 2 4 "Programmi Flatpak e Snap inutilizzati"
c_e flatpak && timeout 600 flatpak uninstall --unused -y --noninteractive
if snap_ok; then
    timeout 60 snap list --all 2>/dev/null | awk '/disabled/{print $1, $3}' | while read -r n r; do timeout 600 snap remove "$n" --revision="$r"; done
fi
passo 3 4 "Registri di sistema più vecchi di 2 settimane"
c_e journalctl && journalctl --vacuum-time=14d
passo 4 4 "Miniature e file temporanei vecchi"
rm -rf "$CD_CASA/.cache/thumbnails/"* 2>/dev/null
find /var/tmp -mindepth 1 -mtime +10 -delete 2>/dev/null
find "$CD_CASA/.cache" -mindepth 1 -type f -atime +60 -delete 2>/dev/null
dopo=$(libero_mb)
info liberati_mb $((dopo - prima))
ok "Spazio liberato: $((dopo - prima)) MB"
