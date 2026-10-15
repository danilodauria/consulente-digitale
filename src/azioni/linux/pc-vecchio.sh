#!/bin/bash
# Modalita' PC vecchio: memoria compressa (zram), meno effetti grafici, indicizzazione spenta.
passo 1 4 "Memoria compressa (zram)"
if [ -e /sys/block/zram0 ] && swapon --show 2>/dev/null | grep -q zram; then
    ok "zram già attivo."
else
    case "$GESTORE" in
        apt) installa_pacchetto zram-tools && printf 'ALGO=zstd\nPERCENT=50\nPRIORITY=100\n' > /etc/default/zramswap && systemctl restart zramswap && ok "zram attivo (50%% della RAM, zstd)." ;;
        dnf) installa_pacchetto zram-generator-defaults && ok "zram attivo al prossimo avvio." ;;
        pacman) installa_pacchetto zram-generator && printf '[zram0]\nzram-size = ram / 2\ncompression-algorithm = zstd\n' > /etc/systemd/zram-generator.conf && ok "zram attivo al prossimo avvio." ;;
        *) nota "Installa zram a mano per la tua distribuzione." ;;
    esac
fi
echo "vm.swappiness=100" > /etc/sysctl.d/90-consulente-digitale.conf
echo "vm.page-cluster=0" >> /etc/sysctl.d/90-consulente-digitale.conf
sysctl -p /etc/sysctl.d/90-consulente-digitale.conf >/dev/null 2>&1
passo 2 4 "Meno effetti grafici"
case "${CD_DESKTOP:-$XDG_CURRENT_DESKTOP}" in
    *GNOME*|*Unity*|*ubuntu*|*Zorin*) come_utente gsettings set org.gnome.desktop.interface enable-animations false && ok "Animazioni di GNOME spente." ;;
    *Cinnamon*) come_utente gsettings set org.cinnamon desktop-effects false 2>/dev/null; come_utente gsettings set org.cinnamon enable-animations false 2>/dev/null; ok "Effetti di Cinnamon spenti." ;;
    *XFCE*) come_utente xfconf-query -c xfwm4 -p /general/use_compositing -s false 2>/dev/null && ok "Compositore di XFCE spento." ;;
    *KDE*) come_utente kwriteconfig5 --file kdeglobals --group KDE --key AnimationDurationFactor 0 2>/dev/null || come_utente kwriteconfig6 --file kdeglobals --group KDE --key AnimationDurationFactor 0 2>/dev/null; ok "Animazioni di KDE spente." ;;
    *MATE*) come_utente gsettings set org.mate.Marco.general compositing-manager false 2>/dev/null && ok "Compositore di MATE spento." ;;
    *) come_utente gsettings set org.gnome.desktop.interface enable-animations false 2>/dev/null; nota "Desktop non riconosciuto: provate le impostazioni «Effetti»." ;;
esac
passo 3 4 "Indicizzazione dei file"
if c_e balooctl6; then come_utente balooctl6 disable >/dev/null 2>&1 && ok "Indicizzazione di KDE (Baloo) spenta."
elif c_e balooctl; then come_utente balooctl disable >/dev/null 2>&1 && ok "Indicizzazione di KDE (Baloo) spenta."; fi
if c_e tracker3; then come_utente systemctl --user mask tracker-miner-fs-3.service >/dev/null 2>&1 && ok "Indicizzazione di GNOME (Tracker) spenta."; fi
passo 4 4 "Consigli per i PC vecchi"
nota "Browser leggero: Firefox con poche schede, oppure Falkon/Midori."
nota "Desktop leggero: XFCE, LXQt o MATE. Distribuzione leggera: FeniceOS, Linux Lite, Lubuntu, MX Linux."
nota "Il miglior acceleratore: un SSD da 240 GB al posto del disco meccanico (costa poco)."
info riavvio consigliato
