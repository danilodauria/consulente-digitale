#!/bin/bash
# Rapporto della batteria.
passo 1 1 "Lettura"
dati="$(ioreg -rn AppleSmartBattery 2>/dev/null)"
if [ -z "$dati" ]; then nota "Nessuna batteria: è un Mac fisso."; info salute nessuna; exit 0; fi
cicli=$(echo "$dati" | awk -F'= ' '/"CycleCount" =/{print $2; exit}')
progetto=$(echo "$dati" | awk -F'= ' '/"DesignCapacity" =/{print $2; exit}')
massima=$(echo "$dati" | awk -F'= ' '/"AppleRawMaxCapacity" =/{print $2; exit}')
[ -z "$massima" ] && massima=$(echo "$dati" | awk -F'= ' '/"NominalChargeCapacity" =/{print $2; exit}')
salute=0; [ -n "$progetto" ] && [ "$progetto" -gt 0 ] && salute=$((100 * massima / progetto))
stato=$(system_profiler SPPowerDataType 2>/dev/null | awk -F': ' '/Condition/{print $2; exit}')
voce batteria "Batteria del Mac" "$salute%" "" "" "Cicli: ${cicli:-?} · Condizione: ${stato:-?}"
info salute "$salute"; info cicli "${cicli:-0}"
