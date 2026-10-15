#!/bin/bash
# Controllo sicurezza (solo lettura).
passo 1 1 "Controlli"
if c_e ufw && systemctl is-active ufw >/dev/null 2>&1; then voce controllo "Firewall" "attivo" "ok" "" "ufw"
elif systemctl is-active firewalld >/dev/null 2>&1; then voce controllo "Firewall" "attivo" "ok" "" "firewalld"
else voce controllo "Firewall" "spento" "attenzione" "" "Su un portatile che usa reti pubbliche: attivate ufw (sudo ufw enable)"; fi
if lsblk -o TYPE 2>/dev/null | grep -q crypt; then voce controllo "Disco cifrato" "sì" "ok" "" "LUKS"
else voce controllo "Disco cifrato" "no" "consiglio" "" "Sui portatili la cifratura protegge i dati se il PC viene rubato"; fi
if [ "$GESTORE" = "apt" ]; then
    if grep -qs 'Unattended-Upgrade "1"' /etc/apt/apt.conf.d/*; then voce controllo "Aggiornamenti di sicurezza automatici" "attivi" "ok" "" ""
    else voce controllo "Aggiornamenti di sicurezza automatici" "spenti" "attenzione" "" "Usate «Ottimizzazione completa» per attivarli"; fi
    ultimo=$(stat -c %Y /var/lib/apt/periodic/update-success-stamp /var/lib/apt/lists 2>/dev/null | sort -n | tail -n1)
    [ -n "$ultimo" ] && giorni=$(( ( $(date +%s) - ultimo ) / 86400 )) && voce controllo "Ultimo aggiornamento dell'elenco" "$giorni giorni fa" "$([ "$giorni" -gt 14 ] && echo attenzione || echo ok)" "" ""
fi
if c_e mokutil; then sb=$(mokutil --sb-state 2>/dev/null | head -n1); voce controllo "Secure Boot" "${sb:-sconosciuto}" "info" "" ""; fi
if c_e clamscan; then voce controllo "Antivirus ClamAV" "presente" "ok" "" ""; else voce controllo "Antivirus" "non necessario di solito" "info" "" "Su Linux bastano aggiornamenti e programmi dai repository ufficiali"; fi
if passwd -S "$CD_UTENTE" 2>/dev/null | grep -q ' NP '; then voce controllo "Password dell'utente" "assente" "attenzione" "" "Impostate una password"; fi
voce controllo "Utenti amministratori" "$(getent group sudo wheel 2>/dev/null | cut -d: -f4 | tr '\n' ' ')" "info" "" ""
