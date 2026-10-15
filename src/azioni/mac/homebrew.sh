#!/bin/bash
# Installa Homebrew con il comando ufficiale di https://brew.sh (si apre nel Terminale e chiede la password).
echo "=== Consulente Digitale → Installazione di Homebrew ==="
echo "Vi verrà chiesta la password del Mac (non si vede mentre la scrivete) e di premere Invio."
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
if [ -x /opt/homebrew/bin/brew ]; then
    grep -q 'brew shellenv' "$HOME/.zprofile" 2>/dev/null || echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
fi
echo; echo "Fatto. Potete chiudere questa finestra e tornare al Consulente Digitale."
