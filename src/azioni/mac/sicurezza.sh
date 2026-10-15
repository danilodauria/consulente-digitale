#!/bin/bash
# Controllo sicurezza (solo lettura).
passo 1 1 "Controlli"
fv=$(fdesetup status 2>/dev/null)
case "$fv" in *On*) voce controllo "FileVault (disco cifrato)" "attivo" "ok" "" "" ;; *) voce controllo "FileVault (disco cifrato)" "spento" "consiglio" "" "Impostazioni → Privacy e sicurezza → FileVault" ;; esac
fw=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)
case "$fw" in *enabled*|*attiv*) voce controllo "Firewall" "attivo" "ok" "" "" ;; *) voce controllo "Firewall" "spento" "attenzione" "" "Impostazioni → Rete → Firewall" ;; esac
gk=$(spctl --status 2>/dev/null)
case "$gk" in *enabled*) voce controllo "Gatekeeper" "attivo" "ok" "" "" ;; *) voce controllo "Gatekeeper" "spento" "attenzione" "" "sudo spctl --master-enable" ;; esac
sip=$(csrutil status 2>/dev/null)
case "$sip" in *enabled*) voce controllo "Protezione dell'integrità (SIP)" "attiva" "ok" "" "" ;; *) voce controllo "Protezione dell'integrità (SIP)" "spenta" "attenzione" "" "" ;; esac
auto=$(defaults read /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled 2>/dev/null)
[ "$auto" = "1" ] && voce controllo "Controllo aggiornamenti automatico" "attivo" "ok" "" "" || voce controllo "Controllo aggiornamenti automatico" "spento" "attenzione" "" "Usate «Ottimizzazione completa»"
voce controllo "Versione di macOS" "$(sw_vers -productVersion)" "info" "" "Le ultime 3 versioni ricevono aggiornamenti di sicurezza"
