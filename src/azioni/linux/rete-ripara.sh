#!/bin/bash
# Ripara la connessione: svuota la cache DNS e riavvia la rete. Le reti salvate restano.
passo 1 3 "Cache dei nomi (DNS)"
if c_e resolvectl; then resolvectl flush-caches && ok "Cache DNS svuotata."; elif c_e systemd-resolve; then systemd-resolve --flush-caches && ok "Cache DNS svuotata."; fi
passo 2 3 "Riavvio della rete"
if c_e nmcli; then
    nmcli networking off; sleep 2; nmcli networking on; sleep 6
    ok "Rete riavviata."
    nmcli -t -f DEVICE,STATE device 2>/dev/null | head -n 5
else
    systemctl restart systemd-networkd 2>/dev/null || nota "NetworkManager non presente."
fi
passo 3 3 "Prova"
if ping -c 2 -W 3 1.1.1.1 >/dev/null 2>&1; then ok "Internet raggiungibile."; else attenzione "Internet non raggiungibile: controlla il router (spegni 30 secondi e riaccendi)."; fi
if getent hosts www.inrim.it >/dev/null 2>&1; then ok "I nomi dei siti si risolvono."; else attenzione "I nomi dei siti non si risolvono: problema DNS."; fi
