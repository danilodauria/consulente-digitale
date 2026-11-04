#!/bin/bash
# Cerca gli aggiornamenti disponibili (sistema, programmi, firmware). Non modifica nulla.
passo 1 4 "Aggiorno l'elenco dei pacchetti disponibili"
if c_e pkcon; then
    timeout 180 pkcon -p refresh >/dev/null 2>&1 && ok "Elenco aggiornato (PackageKit)" || nota "Elenco dalla cache (per quello più fresco usa «Installa»)"
fi

passo 2 4 "Sistema ($GESTORE)"
n=0
case "$GESTORE" in
    apt)
        # Si mostra solo quello che «Installa» farà davvero: Ubuntu e derivate (Zorin, Mint…) distribuiscono alcuni
        # aggiornamenti un po' alla volta («graduali», phased) e altri restano «trattenuti»: apt list li elenca
        # ma apt non li installa, e prima ricomparivano a ogni controllo.
        sim="$(LC_ALL=C apt-get -s -o Debug::NoLocking=1 --with-new-pkgs upgrade 2>/dev/null)"
        installabili=" $(echo "$sim" | awk '/^Inst /{printf "%s ", $2}') "
        rimandati=" $(echo "$sim" | awk '/deferred due to phasing:/{f=1;next} /^[^ ]/{f=0} f{printf "%s ", $0}') "
        a=0
        while IFS= read -r riga; do
            nome="${riga%%/*}"; nuova="$(echo "$riga" | awk '{print $2}')"
            vecchia="$(echo "$riga" | sed -n 's/.*\[[^:]*: \(.*\)\]/\1/p')"
            [ -n "$nome" ] || continue
            case "$installabili" in
                *" $nome "*) voce sistema "$nome" "$vecchia" "$nuova" "$nome" "" && n=$((n+1)) ;;
                *) case "$rimandati" in
                       *" $nome "*) voce attesa "$nome" "$vecchia" "$nuova" "$nome" "Aggiornamento graduale della distribuzione: arriverà da solo nei prossimi giorni" ;;
                       *) voce attesa "$nome" "$vecchia" "$nuova" "$nome" "Trattenuto: serve l'aggiornamento completo di «Aggiornamenti software» della distribuzione" ;;
                   esac
                   a=$((a+1)) ;;
            esac
        done < <(LC_ALL=C apt list --upgradable 2>/dev/null | grep -v '^Listing')
        [ "$a" -gt 0 ] && nota "$a aggiornamenti in attesa (graduali o trattenuti): non serve fare nulla, non vengono contati"
        ;;
    dnf)
        while read -r nome ver repo; do
            [ -n "$repo" ] && voce sistema "${nome%.*}" "" "$ver" "$nome" "$repo" && n=$((n+1))
        done < <(dnf -q check-update 2>/dev/null | grep -E '^[A-Za-z0-9]' | grep -v '^Obsoleting')
        ;;
    zypper)
        while IFS='|' read -r _ _ nome att nuova _; do
            nome="$(echo "$nome" | xargs)"; [ -n "$nome" ] && voce sistema "$nome" "$(echo "$att" | xargs)" "$(echo "$nuova" | xargs)" "$nome" "" && n=$((n+1))
        done < <(zypper -q lu 2>/dev/null | grep '^v ')
        ;;
    pacman)
        if c_e checkupdates; then
            while read -r nome att _ nuova; do
                [ -n "$nome" ] && voce sistema "$nome" "$att" "$nuova" "$nome" "" && n=$((n+1))
            done < <(checkupdates 2>/dev/null)
        else
            nota "Per l'elenco installa pacman-contrib (comando checkupdates)."
        fi
        ;;
esac
ok "Aggiornamenti del sistema: $n"

passo 3 4 "Programmi (Flatpak e Snap)"
m=0
if c_e flatpak; then
    while IFS=$'\t' read -r app ver; do
        [ -n "$app" ] && voce programmi "$app" "" "$ver" "$app" "Flatpak" && m=$((m+1))
    done < <(timeout 120 flatpak remote-ls --updates --columns=application,version 2>/dev/null)
fi
if snap_ok; then
    while read -r nome ver _; do
        [ -n "$nome" ] && [ "$nome" != "Name" ] && voce programmi "$nome" "" "$ver" "$nome" "Snap" && m=$((m+1))
    done < <(timeout 60 snap refresh --list 2>/dev/null)
fi
ok "Aggiornamenti dei programmi: $m"

passo 4 4 "Firmware (fwupd / LVFS)"
f=0
if c_e fwupdmgr; then
    while IFS='|' read -r dev att nuova riavvio; do
        [ -n "$dev" ] || continue
        if [ "$riavvio" = "1" ]; then voce attesa "$dev" "$att" "$nuova" "$dev" "Firmware già pronto: si installa al prossimo riavvio"
        else voce firmware "$dev" "$att" "$nuova" "$dev" "LVFS" && f=$((f+1)); fi
    done < <(timeout 120 fwupdmgr get-updates --json 2>/dev/null | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: sys.exit(0)
for dev in d.get("Devices",[]):
    rel=(dev.get("Releases") or [{}])[0]
    fl=dev.get("Flags") or []
    print("%s|%s|%s|%s" % (dev.get("Name",""), dev.get("Version",""), rel.get("Version",""), "1" if ("needs-reboot" in fl or dev.get("UpdateState") in ("needs-reboot", 4)) else "0"))')
    ok "Aggiornamenti del firmware: $f"
else
    nota "fwupd non installato: il firmware (BIOS, dischi, docking) non si può controllare da qui."
fi
info totale $((n+m+f))
if riavvio_necessario; then info riavvio si; attenzione "Il computer aspetta già un riavvio per completare aggiornamenti precedenti."; fi
