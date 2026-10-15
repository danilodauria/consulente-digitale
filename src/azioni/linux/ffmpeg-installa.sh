#!/bin/bash
# Installa FFmpeg dal repository della distribuzione: serve a Nonni Teach per montare il podcast in MP3.
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
passo 1 2 "Controllo se FFmpeg c'è già"
if c_e ffmpeg; then ok "FFmpeg è già installato: $(ffmpeg -version 2>/dev/null | head -n1)"; info ffmpeg si
else
    passo 2 2 "Installo FFmpeg dal repository della distribuzione"
    [ "$GESTORE" = "apt" ] && apt-get update -qq
    if installa_pacchetto ffmpeg && c_e ffmpeg; then ok "FFmpeg installato."; info ffmpeg si
    else attenzione "Installazione non riuscita: provate dal Centro software cercando «ffmpeg»."; fi
fi
