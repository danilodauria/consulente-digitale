#!/bin/bash
# Sincronizza l'orologio con l'ora ufficiale (NTP).
passo 1 2 "Attivo la sincronizzazione automatica"
if c_e timedatectl; then
    timedatectl set-ntp true && ok "Sincronizzazione automatica attiva."
fi
passo 2 2 "Sincronizzo adesso"
if c_e chronyc; then chronyc -a makestep && ok "Orologio corretto (chrony)."
elif systemctl is-active systemd-timesyncd >/dev/null 2>&1; then systemctl restart systemd-timesyncd; sleep 3; ok "Orologio corretto (systemd-timesyncd)."
elif c_e ntpdate; then ntpdate -u time.inrim.it && ok "Orologio corretto (INRiM)."
else installa_pacchetto systemd-timesyncd >/dev/null 2>&1; timedatectl set-ntp true; fi
timedatectl 2>/dev/null | grep -Ei 'local time|synchronized|NTP'
