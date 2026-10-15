#!/bin/bash
# Chris Titus LinUtil (https://christitus.com/linux): strumento nel terminale per installare e configurare Linux.
echo "=== Consulente Digitale → Chris Titus LinUtil ==="
echo "Scarico ed eseguo lo strumento ufficiale da christitus.com (serve Internet)."
echo "Si usa con le frecce e Invio. Per uscire premete «q»."
echo
if command -v curl >/dev/null 2>&1; then
    curl -fsSL https://christitus.com/linux | sh
else
    echo "Manca «curl»: installatelo (sudo apt install curl) e riprovate."
fi
echo
read -r -p "Premete Invio per chiudere questa finestra..." _
