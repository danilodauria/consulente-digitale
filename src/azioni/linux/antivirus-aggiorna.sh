#!/bin/bash
# Antivirus - installa (se manca) e aggiorna ClamAV, l'antivirus libero di Cisco Talos (licenza GPL), dal repository della distribuzione.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 2 "Antivirus ClamAV"
if ! c_e clamscan || ! c_e freshclam; then
    nota "Installo ClamAV dal repository della distribuzione"
    [ "$GESTORE" = "apt" ] && apt-get update -qq
    case "$GESTORE" in
        apt) installa_pacchetto clamav clamav-freshclam ;;
        dnf) installa_pacchetto clamav clamav-update ;;
        *) installa_pacchetto clamav ;;
    esac
    c_e clamscan || { attenzione "Installazione non riuscita: cercate «clamav» nel Centro software"; exit 1; }
fi
ok "$(clamscan --version 2>/dev/null | cut -d/ -f1)"
passo 2 2 "Scarico le firme dei virus più recenti"
servizio=""
for s in clamav-freshclam clamav-freshclam.service; do systemctl is-active --quiet "$s" 2>/dev/null && servizio="$s" && break; done
[ -n "$servizio" ] && systemctl stop "$servizio"          # il servizio tiene occupato l'archivio delle firme
# Fedora/openSUSE: alcune versioni lasciano la riga «Example» che blocca freshclam
[ -f /etc/freshclam.conf ] && sed -i 's/^Example/#Example/' /etc/freshclam.conf
if freshclam --stdout 2>&1 | grep -vE '^\s*$' | tail -n 6 | sed 's/^/  /'; then :; fi
[ -n "$servizio" ] && systemctl start "$servizio"
v="$(clamscan --version 2>/dev/null)"
info firme "$v"
case "$v" in */*/*) ok "Firme aggiornate: $v" ;; *) attenzione "Firme non aggiornate: controllate la connessione a Internet" ;; esac
