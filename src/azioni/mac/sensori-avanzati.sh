#!/bin/bash
# Sensori avanzati del Mac con lo strumento di Apple powermetrics (amministratore, solo lettura, 5 secondi).
passo 1 1 "Lettura di temperature, frequenze e consumi (5 secondi)"
out="$(powermetrics --samplers smc,cpu_power,gpu_power,thermal -n 1 -i 5000 2>/dev/null)"
echo "$out" | grep -Ei "die temperature|fan|CPU Power|GPU Power|ANE Power|Combined Power|pressure level|frequency" | head -n 30 | while IFS= read -r r; do
    nome="$(echo "$r" | cut -d: -f1 | xargs)"; val="$(echo "$r" | cut -d: -f2- | xargs)"
    voce sensore "$nome" "$val" "" "" ""
done
[ -z "$out" ] && attenzione "powermetrics non ha risposto."
ok "Lettura completata."
