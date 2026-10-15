#!/bin/bash
# Consulente Digitale - avvio su macOS (dentro l'app). Ideato e sviluppato da Danilo D'Auria - Codice MIT
QUI="$(cd "$(dirname "$0")/../Resources" && pwd)"
export CD_SHARE_DIR="$QUI/app"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
for p in /opt/homebrew/bin/python3 /usr/local/bin/python3 /Library/Frameworks/Python.framework/Versions/Current/bin/python3 /usr/bin/python3; do
  if [ -x "$p" ] && "$p" -c 'import sys; sys.exit(0 if sys.version_info >= (3,7) else 1)' 2>/dev/null; then
    exec "$p" "$CD_SHARE_DIR/server/cd_server.py" --apri
  fi
done
osascript -e 'display dialog "Il Consulente Digitale ha bisogno di Python 3 (gratuito).\n\nmacOS ora vi proporrà di installare gli «Strumenti da riga di comando»: premete Installa, poi riaprite il programma." buttons {"OK"} with title "Consulente Digitale"'
xcode-select --install 2>/dev/null
