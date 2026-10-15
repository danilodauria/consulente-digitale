#!/bin/bash
# Scarica un modello di IA per Ollama (CD_PARAM = nome del modello).
passo 1 2 "Avvio del motore"
curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1 || { open -a Ollama 2>/dev/null || (nohup "$OLLAMA" serve >/dev/null 2>&1 &); sleep 6; }
passo 2 2 "Scarico $CD_PARAM (può richiedere diversi minuti)"
"$OLLAMA" pull "$CD_PARAM" 2>&1 | tr '\r' '\n' | sed -e 's/\x1b\[[0-9;?]*[A-Za-z]//g' | awk 'NF && $0 != p { p = $0; print; fflush() }'
"$OLLAMA" list 2>/dev/null | grep -q "^${CD_PARAM%%:*}" && ok "Modello pronto." || exit 1
