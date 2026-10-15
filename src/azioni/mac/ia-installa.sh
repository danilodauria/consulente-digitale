#!/bin/bash
# Installa Ollama per Mac dal sito ufficiale e controlla la firma digitale di Apple.
passo 1 3 "Scarico Ollama da ollama.com"
tmp="$(mktemp -d)"
if curl -fL -o "$tmp/Ollama.dmg" https://ollama.com/download/Ollama.dmg; then
    passo 2 3 "Installo in Applicazioni"
    hdiutil attach -nobrowse -quiet -mountpoint "$tmp/vol" "$tmp/Ollama.dmg" && cp -R "$tmp/vol/Ollama.app" /Applications/ && hdiutil detach -quiet "$tmp/vol"
elif curl -fL -o "$tmp/Ollama.zip" https://ollama.com/download/Ollama-darwin.zip; then
    passo 2 3 "Installo in Applicazioni"
    ditto -x -k "$tmp/Ollama.zip" /Applications/
else
    attenzione "Download non riuscito: controllate la connessione."; exit 1
fi
passo 3 3 "Controllo della firma digitale"
if codesign --verify --deep --strict /Applications/Ollama.app 2>/dev/null && spctl -a /Applications/Ollama.app 2>/dev/null; then
    ok "Firma verificata da Apple."; open -a Ollama; sleep 5; ok "Ollama avviato: ora scaricate il modello consigliato."
else
    attenzione "Firma non valida: ho tolto l'app per sicurezza."; rm -rf /Applications/Ollama.app; exit 1
fi
rm -rf "$tmp"
