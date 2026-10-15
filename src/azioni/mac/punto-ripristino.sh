#!/bin/bash
# Istantanea locale di Time Machine (si cancella da sola dopo 24 ore) + consiglio di backup.
passo 1 1 "Istantanea locale"
if tmutil localsnapshot / 2>&1; then ok "Istantanea creata: si recupera da Time Machine o dal ripristino di macOS."; info metodo tmutil
else attenzione "Istantanea non creata (serve un disco APFS)."; fi
tmutil destinationinfo 2>/dev/null | grep -q Name && ok "Time Machine è configurato." || nota "Configurate Time Machine con un disco esterno: è il backup più semplice che esista."
