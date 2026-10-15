#!/bin/bash
# Installa Ollama (motore di IA locale) con il metodo ufficiale di ollama.com.
passo 1 2 "Preparazione"
c_e curl || installa_pacchetto curl
c_e zstd || installa_pacchetto zstd >/dev/null 2>&1
passo 2 2 "Installo Ollama da ollama.com"
curl -fsSL https://ollama.com/install.sh | sh
if c_e ollama; then ok "Ollama installato. Ora scaricate il modello consigliato."; else attenzione "Installazione non riuscita."; exit 1; fi
systemctl enable --now ollama >/dev/null 2>&1
