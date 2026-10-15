#!/bin/bash
# Sul Mac i driver arrivano con gli aggiornamenti di Apple: qui si elencano le estensioni di terze parti.
passo 1 2 "Estensioni di sistema di terze parti"
c_e systemextensionsctl && systemextensionsctl list 2>/dev/null | grep -v com.apple | grep -E '\*|enabled' | while IFS= read -r r; do voce estensione "$(echo "$r" | cut -c1-120)" "" "" "" "Se non usate più il programma, disinstallatelo"; done
c_e kmutil && kmutil showloaded --list-only 2>/dev/null | grep -v com.apple | awk 'NR>1{print $NF}' | while read -r k; do voce estensione "$k" "kext" "" "" "Estensione del kernel di terze parti"; done
passo 2 2 "Stampanti e periferiche"
lpstat -p 2>/dev/null | head -n 10
system_profiler SPUSBDataType 2>/dev/null | grep -E '^\s{8}[A-Za-z].*:$' | sed 's/://' | head -n 15
nota "Driver di stampanti e scanner: usate quelli proposti da Apple (AirPrint) o dal sito del produttore."
