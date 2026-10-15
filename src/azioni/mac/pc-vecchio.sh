#!/bin/bash
# Mac datato: meno animazioni e trasparenze (reversibile dalle Impostazioni → Accessibilità → Schermo).
passo 1 2 "Meno effetti grafici"
defaults write com.apple.universalaccess reduceMotion -bool true 2>/dev/null && ok "Movimento ridotto." || nota "Attivate a mano: Accessibilità → Schermo → Riduci movimento."
defaults write com.apple.universalaccess reduceTransparency -bool true 2>/dev/null && ok "Trasparenze ridotte." || nota "Attivate a mano: Accessibilità → Schermo → Riduci trasparenza."
defaults write com.apple.dock launchanim -bool false
defaults write com.apple.dock expose-animation-duration -float 0.1
defaults write com.apple.dock autohide-time-modifier -float 0.2
defaults write NSGlobalDomain NSAutomaticWindowAnimationsEnabled -bool false
killall Dock 2>/dev/null
ok "Animazioni del Dock e delle finestre ridotte."
passo 2 2 "Consigli"
nota "Spotlight: escludete le cartelle grandi in Impostazioni → Spotlight → Privacy."
nota "Mac Intel non più aggiornabile? Linux (es. Linux Mint, FeniceOS) gli dà una seconda vita."
