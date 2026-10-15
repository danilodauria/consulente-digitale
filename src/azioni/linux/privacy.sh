#!/bin/bash
# Piu' privacy: spegne l'invio di statistiche e segnalazioni non necessarie. Reversibile dalle impostazioni.
passo 1 2 "Impostazioni del desktop"
if c_e gsettings; then
    gsettings set org.gnome.desktop.privacy report-technical-problems false 2>/dev/null && ok "Segnalazioni automatiche dei problemi spente."
    gsettings set org.gnome.desktop.privacy send-software-usage-stats false 2>/dev/null && ok "Statistiche d'uso spente."
    gsettings set org.gnome.desktop.privacy remove-old-temp-files true 2>/dev/null && ok "File temporanei vecchi eliminati in automatico."
    gsettings set org.gnome.desktop.privacy remove-old-trash-files true 2>/dev/null && gsettings set org.gnome.desktop.privacy old-files-age 30 2>/dev/null && ok "Cestino svuotato dopo 30 giorni."
fi
c_e ubuntu-report && ubuntu-report -f send no >/dev/null 2>&1 && ok "Ubuntu Report: nessun invio."
passo 2 2 "Controlli"
if [ -f /etc/default/apport ] && grep -q 'enabled=1' /etc/default/apport; then nota "Apport (segnalazione crash) è attivo: si spegne da Impostazioni → Privacy."; fi
if c_e popularity-contest || [ -f /etc/popularity-contest.conf ]; then grep -q 'PARTICIPATE="yes"' /etc/popularity-contest.conf 2>/dev/null && nota "popularity-contest invia l'elenco dei pacchetti: sudo dpkg-reconfigure popularity-contest"; fi
nota "Nel browser: attivate «Do Not Track»/«Global Privacy Control» e un blocco della pubblicità (uBlock Origin)."
ok "Fatto."
