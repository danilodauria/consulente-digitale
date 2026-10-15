#!/bin/bash
# Scarica un modello di IA per Ollama (CD_PARAM = nome del modello, es. qwen3.5:4b).
passo 1 2 "Avvio del motore"
if ! curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    nohup ollama serve >/dev/null 2>&1 &
    sleep 4
fi
passo 2 2 "Scarico $CD_PARAM (può richiedere diversi minuti)"
ollama pull "$CD_PARAM" 2>&1 | tr '\r' '\n' | sed -e 's/\x1b\[[0-9;?]*[A-Za-z]//g' | awk 'NF && $0 != p { p = $0; print; fflush() }'
if ollama list 2>/dev/null | grep -q "^${CD_PARAM%%:*}"; then ok "Modello pronto: il cervello digitale ora pensa da solo, anche senza Internet."; else exit 1; fi
