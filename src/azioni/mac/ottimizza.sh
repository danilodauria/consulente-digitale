#!/bin/bash
# Ottimizzazione consigliata per macOS (amministratore). Sicura e reversibile.
passo 1 6 "Istantanea di sicurezza"
tmutil localsnapshot / >/dev/null 2>&1 && ok "Istantanea locale creata."
passo 2 6 "Cache dei nomi (DNS)"
dscacheutil -flushcache; killall -HUP mDNSResponder 2>/dev/null; ok "Cache DNS svuotata."
passo 3 6 "Memoria"
purge 2>/dev/null && ok "Memoria inattiva liberata."
passo 4 6 "Disco"
diskutil verifyVolume / 2>&1 | tail -n 3
passo 5 6 "Aggiornamenti automatici di sicurezza"
defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool true
defaults write /Library/Preferences/com.apple.SoftwareUpdate CriticalUpdateInstall -bool true
defaults write /Library/Preferences/com.apple.SoftwareUpdate ConfigDataInstall -bool true
ok "Controllo automatico e aggiornamenti di sicurezza attivi."
passo 6 6 "Pulizia di Homebrew e consigli"
[ -n "$BREW" ] && come_utente "$BREW" cleanup -s >/dev/null 2>&1
nota "Elementi all'avvio: Impostazioni di Sistema → Generali → Elementi login: togliete ciò che non serve."
nota "Spazio: Impostazioni di Sistema → Generali → Spazio di archiviazione → Consigli."
ok "Ottimizzazione completata."
