#!/bin/bash
# Stato S.M.A.R.T. dei dischi interni.
passo 1 1 "Lettura"
for d in $(diskutil list internal physical 2>/dev/null | awk '/^\/dev\//{print $1}'); do
    stato="$(diskutil info "$d" | awk -F': *' '/SMART Status/{print $2}')"
    nome="$(diskutil info "$d" | awk -F': *' '/Device \/ Media Name/{print $2}')"
    voce disco "${nome:-$d}" "${stato:-sconosciuto}" "" "$d" "$([ "$stato" = "Verified" ] && echo 'Tutto bene' || echo 'Fate una copia dei dati')"
done
c_e smartctl && smartctl -a disk0 2>/dev/null | grep -Ei 'Percentage Used|Power On Hours|Available Spare'
df -h /
