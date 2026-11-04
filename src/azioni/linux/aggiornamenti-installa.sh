#!/bin/bash
# Scarica e installa gli aggiornamenti dalle fonti ufficiali della distribuzione. Serve l'amministratore.
FONTI=" ${CD_PARAM:-sistema programmi firmware driver} "
# niente domande nascoste: senza terminale debconf e needrestart aspetterebbero una risposta che non arriva
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a NEEDRESTART_SUSPEND=1 APT_LISTCHANGES_FRONTEND=none
vuole() { case "$FONTI" in *" $1 "*) return 0 ;; esac; return 1; }
errori=0
if vuole sistema; then
    passo 1 4 "Aggiorno il sistema ($GESTORE)"
    case "$GESTORE" in
        apt)
            # se il sistema sta già aggiornando da solo (unattended-upgrades) si aspetta fino a 5 minuti invece di fallire
            dpkg --configure -a 2>/dev/null
            apt-get -o DPkg::Lock::Timeout=300 update || nota "Alcune fonti non rispondono: uso l'elenco che c'è"
            apt-get -y -o DPkg::Lock::Timeout=300 -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold --with-new-pkgs upgrade || errori=$((errori+1))
            resto=$(LC_ALL=C apt-get -s -o Debug::NoLocking=1 --with-new-pkgs upgrade 2>/dev/null | grep -cE '^Inst ')
            attesa=$(LC_ALL=C apt list --upgradable 2>/dev/null | grep -vc '^Listing')
            [ "$attesa" -gt "$resto" ] && nota "$((attesa - resto)) aggiornamenti restano in attesa (graduali o trattenuti dalla distribuzione): è normale, arrivano da soli."
            ;;
        dnf) dnf -y upgrade --refresh || errori=$((errori+1)) ;;
        zypper)
            if grep -qi tumbleweed /etc/os-release; then zypper -n dup || errori=$((errori+1)); else zypper -n up || errori=$((errori+1)); fi ;;
        pacman) pacman -Syu --noconfirm || errori=$((errori+1)) ;;
        *) attenzione "Gestore dei pacchetti non riconosciuto." ;;
    esac
fi
if vuole programmi; then
    passo 2 4 "Aggiorno i programmi (Flatpak, Snap)"
    if c_e flatpak; then
        flatpak update -y --noninteractive --system || errori=$((errori+1))
        come_utente flatpak update -y --noninteractive --user 2>/dev/null
    fi
    if snap_ok; then
        timeout 600 snap refresh || errori=$((errori+1))
        aperti="$(timeout 60 snap refresh --list 2>/dev/null | awk 'NR>1{printf "%s ", $1}')"
        [ -n "$aperti" ] && nota "Snap da aggiornare quando li chiudete (sono aperti): $aperti"
    fi
fi
if vuole driver && c_e ubuntu-drivers; then
    passo 3 4 "Driver consigliati (ubuntu-drivers)"
    ubuntu-drivers install || nota "Nessun driver aggiuntivo da installare."
fi
if vuole firmware && c_e fwupdmgr; then
    passo 4 4 "Firmware (fwupd / LVFS)"
    fwupdmgr refresh --force >/dev/null 2>&1
    fwupdmgr update --assume-yes --no-reboot-check 2>/dev/null || fwupdmgr update -y 2>/dev/null || nota "Nessun firmware da aggiornare (o serve confermare all'avvio)."
fi
if riavvio_necessario; then info riavvio si; attenzione "Per completare serve un riavvio del computer."; fi
if [ "$errori" -gt 0 ]; then attenzione "Alcuni passaggi non sono riusciti ($errori): leggi le righe sopra."; exit 1; fi
ok "Aggiornamenti completati."
