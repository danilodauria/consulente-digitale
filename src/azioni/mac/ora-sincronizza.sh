#!/bin/bash
# Sincronizza l'orologio del Mac con l'ora ufficiale.
passo 1 1 "Sincronizzo l'orologio"
systemsetup -setusingnetworktime on >/dev/null 2>&1
sntp -sS time.apple.com 2>&1 | tail -n 2 && ok "Orologio sincronizzato con time.apple.com."
date
