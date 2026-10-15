#!/bin/bash
# Installa gli aggiornamenti di Apple (amministratore) e dei programmi Homebrew (come utente).
FONTI=" ${CD_PARAM:-sistema programmi driver firmware} "
vuole() { case "$FONTI" in *" $1 "*) return 0 ;; esac; return 1; }
errori=0
if vuole sistema || vuole driver || vuole firmware; then
    passo 1 3 "Aggiornamenti di Apple"
    if [ "$(uname -m)" = "arm64" ] && sono_root; then
        nota "Sui Mac con chip Apple gli aggiornamenti di macOS chiedono la conferma in Impostazioni di Sistema → Generali → Aggiornamento Software."
        softwareupdate -i -a --agree-to-license 2>&1 || softwareupdate -i -r 2>&1 || errori=$((errori+1))
    else
        softwareupdate -i -a --agree-to-license 2>&1 || softwareupdate -i -a 2>&1 || errori=$((errori+1))
    fi
    softwareupdate -l 2>&1 | grep -qi restart && { info riavvio si; attenzione "Serve un riavvio: salvate il lavoro e riavviate dal menu ."; }
fi
if vuole programmi && [ -n "$BREW" ]; then
    passo 2 3 "Programmi Homebrew"
    come_utente "$BREW" update
    come_utente "$BREW" upgrade || errori=$((errori+1))
    come_utente "$BREW" upgrade --cask --greedy-auto-updates 2>/dev/null
fi
if vuole negozio && c_e mas; then
    passo 3 3 "App Store"
    come_utente mas upgrade || errori=$((errori+1))
fi
[ "$errori" -gt 0 ] && { attenzione "Alcuni passaggi non sono riusciti: leggete le righe sopra."; exit 1; }
ok "Aggiornamenti completati."
