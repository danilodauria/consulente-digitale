#!/bin/bash
# Salute dei dischi (S.M.A.R.T.) e spazio libero.
passo 1 2 "Strumento S.M.A.R.T."
c_e smartctl || installa_pacchetto smartmontools >/dev/null 2>&1
passo 2 2 "Lettura dei dischi"
for d in $(lsblk -dno NAME | grep -Ev '^(loop|zram|sr|ram)'); do
    modello="$(cat /sys/block/$d/device/model 2>/dev/null | xargs)"
    if c_e smartctl; then
        out="$(smartctl -H -A "/dev/$d" 2>/dev/null)"
        stato="$(echo "$out" | grep -Ei 'overall-health|SMART Health Status' | awk -F': ' '{print $2}' | xargs)"
        usura="$(echo "$out" | grep -Ei 'Percentage Used|Wear_Leveling|Media_Wearout' | head -n1 | awk '{print $NF}')"
        ore="$(echo "$out" | grep -Ei 'Power_On_Hours|Power On Hours' | head -n1 | awk '{print $NF}' | tr -d ',')"
        settori="$(echo "$out" | grep -Ei 'Reallocated_Sector' | awk '{print $NF}')"
        nota_d=""
        [ -n "$settori" ] && [ "$settori" != "0" ] && nota_d="Settori riallocati: $settori - fate subito una copia dei dati"
        voce disco "${modello:-$d}" "${stato:-sconosciuto}" "${usura:-}" "/dev/$d" "Ore di accensione: ${ore:-?}. $nota_d"
    else
        voce disco "${modello:-$d}" "non verificabile" "" "/dev/$d" "Installa smartmontools"
    fi
done
df -h -x tmpfs -x devtmpfs -x squashfs -x overlay 2>/dev/null
