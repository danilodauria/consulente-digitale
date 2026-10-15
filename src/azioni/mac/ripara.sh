#!/bin/bash
# Verifica del disco, permessi della cartella Inizio, cache dei font.
passo 1 3 "Verifica del disco"
diskutil verifyVolume / 2>&1 | tail -n 4
passo 2 3 "Permessi della cartella Inizio"
diskutil resetUserPermissions / "$(id -u "$CD_UTENTE")" 2>&1 | tail -n 2 && ok "Permessi ripristinati."
passo 3 3 "Cache dei caratteri"
come_utente atsutil databases -removeUser >/dev/null 2>&1; atsutil databases -remove >/dev/null 2>&1; ok "Cache dei font pulite."
info riavvio consigliato
