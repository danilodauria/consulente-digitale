#!/bin/bash
# Ripara la connessione: DNS e Wi-Fi.
passo 1 3 "Cache DNS"
dscacheutil -flushcache; killall -HUP mDNSResponder 2>/dev/null; ok "Cache DNS svuotata."
passo 2 3 "Wi-Fi spento e riacceso"
wifi="$(networksetup -listallhardwareports | awk '/Wi-Fi|AirPort/{getline; print $2; exit}')"
if [ -n "$wifi" ]; then networksetup -setairportpower "$wifi" off; sleep 2; networksetup -setairportpower "$wifi" on; sleep 8; ok "Wi-Fi riavviato ($wifi)."; ipconfig set "$wifi" DHCP 2>/dev/null; fi
passo 3 3 "Prova"
ping -c 2 -t 3 1.1.1.1 >/dev/null 2>&1 && ok "Internet raggiungibile." || attenzione "Internet non raggiungibile: riavviate il router."
