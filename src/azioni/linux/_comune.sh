#!/bin/bash
# Consulente Digitale - funzioni comuni degli script per Linux
# Ideato e sviluppato da Danilo D'Auria - Codice MIT
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"
export DEBIAN_FRONTEND=noninteractive
CD_UTENTE="${CD_UTENTE:-${SUDO_USER:-$USER}}"
CD_UID="${CD_UID:-$(id -u "$CD_UTENTE" 2>/dev/null)}"
CD_CASA="$(getent passwd "$CD_UTENTE" 2>/dev/null | cut -d: -f6)"
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
# Snap si usa solo se il suo servizio risponde (senza snapd i comandi restano bloccati)
snap_ok() { c_e snap && systemctl is-active --quiet snapd 2>/dev/null && timeout 10 snap version >/dev/null 2>&1; }

# Esegue un comando come l'utente del desktop (anche quando lo script gira come amministratore)
come_utente() {
    if sono_root && [ -n "$CD_UTENTE" ] && [ "$CD_UTENTE" != "root" ]; then
        local bus="unix:path=/run/user/$CD_UID/bus"
        if c_e runuser; then
            runuser -u "$CD_UTENTE" -- env HOME="$CD_CASA" DBUS_SESSION_BUS_ADDRESS="$bus" XDG_RUNTIME_DIR="/run/user/$CD_UID" "$@"
        else
            sudo -u "$CD_UTENTE" env HOME="$CD_CASA" DBUS_SESSION_BUS_ADDRESS="$bus" XDG_RUNTIME_DIR="/run/user/$CD_UID" "$@"
        fi
    else
        "$@"
    fi
}

gestore() {
    if c_e apt-get; then echo apt
    elif c_e dnf; then echo dnf
    elif c_e zypper; then echo zypper
    elif c_e pacman; then echo pacman
    else echo altro; fi
}
GESTORE="$(gestore)"

# Installa un pacchetto della distribuzione (serve l'amministratore)
installa_pacchetto() {
    case "$GESTORE" in
        apt) apt-get install -y "$@" ;;
        dnf) dnf install -y "$@" ;;
        zypper) zypper -n install "$@" ;;
        pacman) pacman -S --noconfirm --needed "$@" ;;
        *) attenzione "Gestore dei pacchetti non riconosciuto: installa a mano $*"; return 1 ;;
    esac
}

libero_mb() { df -Pm / | awk 'NR==2 {print $4}'; }
ram_mb() { awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo; }
# 1 se il disco di sistema è meccanico (HDD)
disco_meccanico() {
    local dev
    dev="$(lsblk -no PKNAME "$(findmnt -no SOURCE / 2>/dev/null)" 2>/dev/null | head -n1)"
    [ -z "$dev" ] && dev="$(lsblk -dno NAME | grep -Ev '^(loop|zram|sr)' | head -n1)"
    [ "$(cat "/sys/block/$dev/queue/rotational" 2>/dev/null)" = "1" ]
}
riavvio_necessario() {
    if [ -f /var/run/reboot-required ]; then return 0; fi
    if c_e needs-restarting && needs-restarting -r >/dev/null 2>&1; then return 1; fi
    if c_e needs-restarting; then return 0; fi
    return 1
}
