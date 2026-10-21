#!/bin/bash
# Installa FFmpeg con Homebrew: serve a Nonni Teach per montare il podcast in MP3.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 1 "Installo FFmpeg con Homebrew"
if c_e ffmpeg || [ -x /opt/homebrew/bin/ffmpeg ] || [ -x /usr/local/bin/ffmpeg ]; then ok "FFmpeg è già installato."
elif [ -z "$BREW" ]; then attenzione "Serve Homebrew: premete «Installa Homebrew» nella pagina Ottimizza → Strumenti degli esperti."
else come_utente "$BREW" install ffmpeg && ok "FFmpeg installato."; fi
