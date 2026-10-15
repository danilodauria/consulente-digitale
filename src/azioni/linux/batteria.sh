#!/bin/bash
# Rapporto della batteria.
passo 1 1 "Lettura della batteria"
trovata=0
for b in /sys/class/power_supply/BAT*; do
    [ -d "$b" ] || continue
    trovata=1
    pieno=$(cat "$b/energy_full" 2>/dev/null || cat "$b/charge_full" 2>/dev/null)
    progetto=$(cat "$b/energy_full_design" 2>/dev/null || cat "$b/charge_full_design" 2>/dev/null)
    cicli=$(cat "$b/cycle_count" 2>/dev/null)
    salute=0; [ -n "$progetto" ] && [ "$progetto" -gt 0 ] && salute=$((100 * pieno / progetto))
    voce batteria "$(cat "$b/model_name" 2>/dev/null) $(cat "$b/manufacturer" 2>/dev/null)" "$salute%" "$(cat "$b/capacity")%" "$(basename "$b")" "Cicli: ${cicli:-?}"
    info salute "$salute"
    info cicli "${cicli:-0}"
done
[ "$trovata" = 0 ] && nota "Nessuna batteria: è un computer fisso." && info salute nessuna
c_e upower && upower -i "$(upower -e | grep -m1 BAT)" 2>/dev/null | grep -E 'state|percentage|capacity|time to'
