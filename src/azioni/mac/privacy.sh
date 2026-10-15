#!/bin/bash
# Piu' privacy: pubblicita' personalizzata e condivisione dei dati non necessaria.
passo 1 1 "Impostazioni"
defaults write com.apple.AdLib allowApplePersonalizedAdvertising -bool false && ok "Pubblicità personalizzata di Apple spenta."
defaults write com.apple.AdLib allowIdentifierForAdvertising -bool false
defaults write com.apple.assistant.support "Search Queries Data Sharing Status" -int 2 2>/dev/null && ok "Condivisione delle ricerche spenta."
nota "Analisi e miglioramenti: Impostazioni di Sistema → Privacy e sicurezza → Analisi e miglioramenti → spegnete «Condividi analisi del Mac»."
nota "Safari: Impostazioni → Privacy → «Impedisci il tracciamento tra siti» e «Nascondi indirizzo IP»."
