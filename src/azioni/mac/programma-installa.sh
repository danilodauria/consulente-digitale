#!/bin/bash
# Installa un programma con Homebrew. CD_PARAM: "cask:nome" oppure "brew:nome".
tipo="${CD_PARAM%%:*}"; nome="${CD_PARAM#*:}"
if [ -z "$BREW" ]; then attenzione "Serve Homebrew: premete «Installa Homebrew» nella pagina Ottimizza → Strumenti degli esperti."; exit 1; fi
passo 1 1 "Installo $nome"
if [ "$tipo" = "cask" ]; then come_utente "$BREW" install --cask "$nome"; else come_utente "$BREW" install "$nome"; fi && ok "Installato: lo trovate in Applicazioni o nel Launchpad."
