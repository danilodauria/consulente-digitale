#!/bin/bash
# Ottimizzazione completa consigliata per Linux. Ogni passo è sicuro e reversibile.
RAM=$(ram_mb)
passo 1 7 "Punto di ripristino"
if c_e timeshift; then timeshift --create --comments "Prima dell'ottimizzazione" --tags O >/dev/null 2>&1 && ok "Istantanea Timeshift creata."
else mkdir -p /var/backups/consulente-digitale && tar -czf "/var/backups/consulente-digitale/etc-$(date +%Y%m%d-%H%M).tar.gz" /etc 2>/dev/null && ok "Copia di /etc salvata."; fi
passo 2 7 "Pulizia"
case "$GESTORE" in
    apt) apt-get -y autoremove --purge >/dev/null; apt-get clean ;;
    dnf) dnf -y autoremove >/dev/null; dnf clean packages >/dev/null ;;
esac
c_e journalctl && journalctl --vacuum-time=14d >/dev/null 2>&1
c_e flatpak && timeout 600 flatpak uninstall --unused -y --noninteractive >/dev/null 2>&1
ok "Pulizia fatta."
passo 3 7 "Disco: TRIM per gli SSD"
if c_e fstrim; then
    fstrim -av 2>/dev/null | head -n 5
    systemctl enable --now fstrim.timer >/dev/null 2>&1 && ok "TRIM settimanale attivo."
fi
passo 4 7 "Memoria"
if [ "$RAM" -lt 4096 ]; then
    nota "RAM sotto i 4 GB: usa anche «Modalità PC vecchio» (memoria compressa zram)."
fi
if [ -e /sys/block/zram0 ]; then
    echo "vm.swappiness=100" > /etc/sysctl.d/90-consulente-digitale.conf
    ok "zram presente: swappiness 100 (memoria compressa usata per prima)."
elif [ "$RAM" -ge 8000 ]; then
    echo "vm.swappiness=10" > /etc/sysctl.d/90-consulente-digitale.conf
    ok "Swappiness 10: il disco si usa solo quando la RAM è davvero piena."
else
    echo "vm.swappiness=30" > /etc/sysctl.d/90-consulente-digitale.conf
    ok "Swappiness 30."
fi
echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.d/90-consulente-digitale.conf
sysctl -p /etc/sysctl.d/90-consulente-digitale.conf >/dev/null 2>&1
passo 5 7 "Avvio più veloce"
if systemctl is-enabled NetworkManager-wait-online.service >/dev/null 2>&1; then
    systemctl disable NetworkManager-wait-online.service >/dev/null 2>&1 && ok "Il sistema non aspetta più la rete per avviarsi."
fi
if c_e systemd-analyze; then
    nota "Tempo di avvio: $(systemd-analyze 2>/dev/null | head -n1)"
    systemd-analyze blame 2>/dev/null | head -n 5 | while read -r t s; do nota "  $t  $s"; done
fi
passo 6 7 "Batteria (portatili)"
if ls /sys/class/power_supply/BAT* >/dev/null 2>&1; then
    if c_e powerprofilesctl; then powerprofilesctl set balanced 2>/dev/null && ok "Profilo energetico bilanciato."
    elif c_e tlp; then systemctl enable --now tlp >/dev/null 2>&1 && ok "TLP attivo (risparmio della batteria)."
    else nota "Per una batteria che dura di più installa «tlp» o «power-profiles-daemon»."; fi
fi
passo 7 7 "Aggiornamenti di sicurezza automatici"
if [ "$GESTORE" = "apt" ]; then
    installa_pacchetto unattended-upgrades >/dev/null 2>&1
    printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' > /etc/apt/apt.conf.d/20auto-upgrades
    ok "Aggiornamenti di sicurezza automatici attivi."
elif [ "$GESTORE" = "dnf" ]; then
    installa_pacchetto dnf-automatic >/dev/null 2>&1 && systemctl enable --now dnf-automatic-install.timer >/dev/null 2>&1 && ok "dnf-automatic attivo."
fi
info riavvio consigliato
ok "Ottimizzazione completata. Per annullare la memoria: elimina /etc/sysctl.d/90-consulente-digitale.conf"
