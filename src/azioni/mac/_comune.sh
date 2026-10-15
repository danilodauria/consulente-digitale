#!/bin/bash
# Consulente Digitale - funzioni comuni degli script per macOS
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
CD_UTENTE="${CD_UTENTE:-${SUDO_USER:-$USER}}"
CD_CASA="$(dscl . -read "/Users/$CD_UTENTE" NFSHomeDirectory 2>/dev/null | awk '{print $2}')"
[ -z "$CD_CASA" ] && CD_CASA="$HOME"
mkdir -p "$CD_DATI" 2>/dev/null

passo() { echo "@@PASSO|$1|$2|$3"; }
voce()  { echo "@@VOCE|$1|$2|$3|$4|$5|$6"; }
info()  { echo "@@INFO|$1|$2"; }
c_e()   { command -v "$1" >/dev/null 2>&1; }
ok()    { echo "  ✔ $*"; }
nota()  { echo "  • $*"; }
attenzione() { echo "  ⚠ $*"; }
sono_root() { [ "$(id -u)" = "0" ]; }
# Homebrew non va mai usato come amministratore: si esegue come l'utente
come_utente() {
    if sono_root && [ -n "$CD_UTENTE" ] && [ "$CD_UTENTE" != "root" ]; then sudo -u "$CD_UTENTE" -H "$@"; else "$@"; fi
}
BREW="$(command -v brew || { [ -x /opt/homebrew/bin/brew ] && echo /opt/homebrew/bin/brew; } || { [ -x /usr/local/bin/brew ] && echo /usr/local/bin/brew; })"
OLLAMA="$(command -v ollama || { [ -x /Applications/Ollama.app/Contents/Resources/ollama ] && echo /Applications/Ollama.app/Contents/Resources/ollama; } || echo /usr/local/bin/ollama)"
libero_mb() { df -m / | awk 'NR==2 {print $4}'; }
